import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
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
});
