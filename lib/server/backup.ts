import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { db } from './db';
import { hasPermission } from './permissions';
import { logAudit } from './api';
import type { UserProfile } from '../types';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

export interface BackupMetadata {
  filename: string;
  filepath: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  integrityOk: boolean;
}

function ensureBackupDir(): string {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  return BACKUP_DIR;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Perform a live online snapshot of SQLite database to data/backups/
 */
export async function createDatabaseBackup(user: UserProfile | any): Promise<{ ok: boolean; backup?: BackupMetadata; error?: string }> {
  if (!user || (!hasPermission(user.role, 'create_backup') && user.role !== 'super_admin' && user.role !== 'admin')) {
    return { ok: false, error: 'Unauthorized: create_backup permission required' };
  }

  try {
    ensureBackupDir();
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHmmss
    const filename = `tvoflavours_backup_${timestamp}.db`;
    const destPath = path.join(BACKUP_DIR, filename);

    // SQLite online backup via better-sqlite3
    await db.backup(destPath);

    // Verify integrity of the created snapshot
    let integrityOk = false;
    try {
      const verifyDb = new Database(destPath, { readonly: true });
      const check = verifyDb.prepare('PRAGMA quick_check').get() as any;
      const rawRes = String(check?.quick_check || check?.integrity_check || '');
      integrityOk = Boolean(rawRes === 'ok' || (!/error|corrupt/i.test(rawRes) && rawRes.length > 0));
      verifyDb.close();
    } catch {
      integrityOk = false;
    }

    const stat = fs.statSync(destPath);
    const backup: BackupMetadata = {
      filename,
      filepath: destPath,
      sizeBytes: stat.size,
      sizeFormatted: formatBytes(stat.size),
      createdAt: now.toISOString(),
      integrityOk,
    };

    try {
      logAudit(user, 'BACKUP_CREATE', 'System', filename, `Created backup ${filename} (${backup.sizeFormatted})`);
    } catch {
      // ignore audit logging failure if audit table missing
    }

    return { ok: true, backup };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to create database backup' };
  }
}

/**
 * List all available database backups in data/backups/
 */
export function listDatabaseBackups(user: UserProfile | any): BackupMetadata[] {
  if (!user || (!hasPermission(user.role, 'view_system_health') && user.role !== 'super_admin' && user.role !== 'admin')) {
    return [];
  }

  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db') && f.startsWith('tvoflavours_backup_'));
  
  const results: BackupMetadata[] = [];
  for (const filename of files) {
    const fullPath = path.join(BACKUP_DIR, filename);
    try {
      const stat = fs.statSync(fullPath);
      results.push({
        filename,
        filepath: fullPath,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        integrityOk: true, // evaluated on demand in verifyDatabaseBackup
      });
    } catch {
      // skip unreadable file
    }
  }

  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Verify integrity of a specific backup file
 */
export function verifyDatabaseBackup(user: UserProfile | any, filename: string): { ok: boolean; valid: boolean; details?: string; error?: string } {
  if (!user || (!hasPermission(user.role, 'view_system_health') && user.role !== 'super_admin' && user.role !== 'admin')) {
    return { ok: false, valid: false, error: 'Unauthorized' };
  }

  const safeFilename = path.basename(filename);
  const targetPath = path.join(BACKUP_DIR, safeFilename);

  if (!fs.existsSync(targetPath)) {
    return { ok: false, valid: false, error: 'Backup file not found' };
  }

  try {
    const backupDb = new Database(targetPath, { readonly: true });
    const check = backupDb.prepare('PRAGMA quick_check').get() as any;
    const tables = backupDb.prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table'").get() as any;
    backupDb.close();

    const rawRes = String(check?.quick_check || check?.integrity_check || '');
    const isValid = Boolean(rawRes === 'ok' || (!/error|corrupt/i.test(rawRes) && rawRes.length > 0));
    return {
      ok: true,
      valid: Boolean(isValid),
      details: `Integrity check: ${isValid ? 'ok' : rawRes}, Tables count: ${tables?.c || 0}`,
    };
  } catch (err: any) {
    return { ok: false, valid: false, error: err?.message || 'Integrity verification failed' };
  }
}
