import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { createDatabaseBackup, listDatabaseBackups, verifyDatabaseBackup } from '../server/backup';
import type { UserProfile } from '../types';

const mockSuperAdmin: any = {
  id: 1,
  email: 'admin@tvoflavours.com',
  name: 'Super Admin',
  role: 'super_admin',
};

const mockUnauthorizedUser: any = {
  id: 99,
  email: 'customer@tvoflavours.com',
  name: 'Regular Customer',
  role: 'customer',
};

describe('Database Backup & Recovery Engine', () => {
  const createdBackups: string[] = [];

  afterEach(() => {
    for (const filepath of createdBackups) {
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch {}
    }
    createdBackups.length = 0;
  });

  it('denies backup creation for unauthorized non-admin roles', async () => {
    const res = await createDatabaseBackup(mockUnauthorizedUser);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/unauthorized/i);
  });

  it('creates hot SQLite online backup snapshot and verifies integrity', async () => {
    const res = await createDatabaseBackup(mockSuperAdmin);
    expect(res.ok).toBe(true);
    expect(res.backup).toBeDefined();

    if (res.backup) {
      createdBackups.push(res.backup.filepath);
      expect(res.backup.filename).toMatch(/^tvoflavours_backup_\d+\.db$/);
      expect(res.backup.sizeBytes).toBeGreaterThan(1000);
      expect(res.backup.integrityOk).toBe(true);

      // Verify backup listing includes the file
      const list = listDatabaseBackups(mockSuperAdmin);
      const found = list.find((b) => b.filename === res.backup!.filename);
      expect(found).toBeDefined();

      // Verify individual backup integrity check
      const verification = verifyDatabaseBackup(mockSuperAdmin, res.backup.filename);
      expect(verification.ok).toBe(true);
      expect(verification.valid).toBe(true);
      expect(verification.details).toContain('Integrity check: ok');
    }
  });

  it('returns error when verifying non-existent backup file', () => {
    const res = verifyDatabaseBackup(mockSuperAdmin, 'non_existent_snapshot_123.db');
    expect(res.ok).toBe(false);
    expect(res.valid).toBe(false);
  });

  it('rejects an unreferenced page instead of treating a non-empty check result as success', () => {
    const filename = `tvoflavours_backup_integrity_test_${Date.now()}.db`;
    const filepath = path.join(process.cwd(), 'data', 'backups', filename);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    const fixture = new Database(filepath);
    fixture.exec('CREATE TABLE example (id INTEGER PRIMARY KEY, name TEXT)');
    fixture.close();
    createdBackups.push(filepath);
    const original = fs.readFileSync(filepath);
    const pageSize = original.readUInt16BE(16) || 65536;
    const damaged = Buffer.concat([original, Buffer.alloc(pageSize)]);
    damaged.writeUInt32BE(original.readUInt32BE(28) + 1, 28);
    fs.writeFileSync(filepath, damaged);
    const result = verifyDatabaseBackup(mockSuperAdmin, filename);
    expect(result.ok).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.details).toContain('never used');
  });
});
