import { describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ prepare: vi.fn(), all: vi.fn() }));
vi.mock('../db', () => ({ IS_MYSQL: false, db: { prepare: mock.prepare, exec: vi.fn() } }));
vi.mock('../api', () => ({ logAudit: vi.fn(), slugify: vi.fn(), jsonParseSafe: (s: string) => JSON.parse(s || '[]') }));
vi.mock('../auth', () => ({ hashPassword: vi.fn() }));
vi.mock('../order-engine', () => ({ extractPieceCount: vi.fn() }));
import { listAdminUsers } from '../admin-ops';
import { ADMIN_ROLES } from '../permissions';

describe('Admin user listing', () => {
  it('includes every supported specialist admin role', () => {
    mock.all.mockReturnValue([{ id: 5, role: 'catalog_manager' }]);
    mock.prepare.mockReturnValue({ all: mock.all });
    expect(listAdminUsers({ id: 1, role: 'super_admin' })).toEqual([{ id: 5, role: 'catalog_manager' }]);
    expect(mock.all.mock.calls[0]).toEqual(expect.arrayContaining(ADMIN_ROLES));
    expect(mock.all.mock.calls[0]).not.toContain('customer');
  });
  it('never selects password hashes in the user listing', () => {
    mock.all.mockReturnValue([]); mock.prepare.mockReturnValue({ all: mock.all });
    listAdminUsers({ id: 1, role: 'super_admin' });
    const sql = mock.prepare.mock.lastCall?.[0] as string;
    expect(sql).not.toContain('password_hash');
    expect(sql).not.toContain('SELECT *');
  });
});
