import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ get: vi.fn(), verify: vi.fn(), run: vi.fn() }));
vi.mock('../api', () => ({
  db: { prepare: () => ({ get: mock.get, run: mock.run }) },
  ok: (data: unknown) => Response.json(data),
  err: (error: string, status = 400) => Response.json({ error }, { status }),
  logAudit: vi.fn(),
}));
vi.mock('../auth', () => ({
  verifyPassword: mock.verify, signToken: () => 'test-session', hashPassword: vi.fn(), getCurrentUser: vi.fn(),
  isAdminRole: (role: string) => ['super_admin', 'admin', 'catalog_manager'].includes(role),
}));
vi.mock('../firebaseAdmin', () => ({ verifyFirebaseIdToken: vi.fn() }));
vi.mock('../rateLimit', () => ({ rateLimitMiddleware: () => ({ allowed: true }) }));
vi.mock('../logger', () => ({ logInfo: vi.fn(), logWarn: vi.fn(), logError: vi.fn() }));
import { POST } from '../../../app/api/auth/route';
beforeEach(() => vi.clearAllMocks());
describe('Admin authentication source', () => {
  it('rejects a stale local password for a privileged identity', async () => {
    mock.get.mockReturnValue({ id: 1, email: 'owner@example.test', role: 'super_admin', status: 'active' });
    mock.verify.mockReturnValue(true);
    const result = await POST(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: 'owner@example.test', password: 'old-local-password' }) }));
    expect(result?.status).toBe(401);
    expect(mock.verify).not.toHaveBeenCalled();
    expect(mock.run).not.toHaveBeenCalled();
  });
  it('preserves existing non-admin local login behavior', async () => {
    mock.get.mockReturnValue({ id: 2, email: 'customer@example.test', role: 'customer', status: 'active', password_hash: 'fixture' });
    mock.verify.mockReturnValue(true);
    const result = await POST(new Request('http://localhost/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: 'customer@example.test', password: 'customer-password' }) }));
    expect(result?.status).toBe(200);
    expect(mock.verify).toHaveBeenCalledWith('customer-password', 'fixture');
  });
});
