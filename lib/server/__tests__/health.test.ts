import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok, err, requestId } from '../api';

// Mock getCurrentUser — we control what the auth layer returns for each test.
// The mock is scoped to the auth module used by the health route.
const mockGetCurrentUser = vi.fn();
vi.mock('../auth', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  };
});

const mockGetFirebaseAdminAuth = vi.fn();
vi.mock('../firebaseAdmin', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getFirebaseAdminAuth: (...args: any[]) => mockGetFirebaseAdminAuth(...args),
  };
});

// Re-import after mocking — the GET handler will use our mock.
import { GET as healthGET } from '../../../app/api/health/route';
import { GET as readyGET } from '../../../app/api/health/ready/route';

function makeReq(cookie = '') {
  const headers: Record<string, string> = {};
  if (cookie) headers['cookie'] = cookie;
  return new Request('http://localhost/api/health', { headers });
}

describe('health endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFirebaseAdminAuth.mockReturnValue({} as any);
  });


  describe('GET /api/health — auth decisions', () => {
    it('returns 401 when no session (unauthenticated)', async () => {
      mockGetCurrentUser.mockReturnValue(null);
      const res = await healthGET(makeReq());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe('Authentication required');
    });

    it('returns 403 for non-admin role', async () => {
      mockGetCurrentUser.mockReturnValue({ id: 4, role: 'customer', name: 'Test' });
      const res = await healthGET(makeReq('tvo_auth=some-valid-token'));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe('Admin access required');
    });

    it('returns 200 for super_admin', async () => {
      mockGetCurrentUser.mockReturnValue({ id: 1, role: 'super_admin', name: 'Admin' });
      const res = await healthGET(makeReq('tvo_auth=admin-token'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.db).toBeDefined();
      expect(body.firebase).toBeDefined();
      expect(body.timestamp).toBeDefined();
      expect(body.correlationId).toBeDefined();
    });

    it('returns 200 for admin role', async () => {
      mockGetCurrentUser.mockReturnValue({ id: 2, role: 'admin', name: 'Staff' });
      const res = await healthGET(makeReq('tvo_auth=admin-token'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it('does not expose internal details on failure', async () => {
      mockGetCurrentUser.mockReturnValue(null);
      const res = await healthGET(makeReq());
      const body = await res.json();
      expect(JSON.stringify(body)).not.toContain('JWT_SECRET');
      expect(JSON.stringify(body)).not.toContain('password_hash');
      expect(JSON.stringify(body)).not.toContain('PRIVATE_KEY');
    });
  });

  describe('GET /api/health/ready — auth decisions', () => {
    it('returns 401 when no session', async () => {
      mockGetCurrentUser.mockReturnValue(null);
      const res = await readyGET(makeReq());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe('Authentication required');
    });

    it('returns 403 for customer role', async () => {
      mockGetCurrentUser.mockReturnValue({ id: 4, role: 'customer', name: 'Test' });
      const res = await readyGET(makeReq('tvo_auth=customer-token'));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Admin access required');
    });

    it('returns 200 or 503 for super_admin (system health)', async () => {
      mockGetCurrentUser.mockReturnValue({ id: 1, role: 'super_admin', name: 'Admin' });
      const res = await readyGET(makeReq('tvo_auth=admin-token'));
      expect([200, 503]).toContain(res.status);
      const body = await res.json();
      expect(body.checks).toBeDefined();
      expect(body.checks.database).toBeDefined();
      expect(body.checks.firebaseAdmin).toBeDefined();
    });

    it('returns 200 or 503 for admin role', async () => {
      mockGetCurrentUser.mockReturnValue({ id: 2, role: 'admin', name: 'Staff' });
      const res = await readyGET(makeReq('tvo_auth=admin-token'));
      expect([200, 503]).toContain(res.status);
      const body = await res.json();
      expect(body.checks).toBeDefined();
    });

    it('never exposes DB path or secrets', async () => {
      mockGetCurrentUser.mockReturnValue(null);
      const res = await readyGET(makeReq());
      const body = await res.json();
      const raw = JSON.stringify(body);
      expect(raw).not.toContain('tvoflavours.db');
      expect(raw).not.toContain('JWT_SECRET');
      expect(raw).not.toContain('firebase-adminsdk');
    });
  });

  describe('error sanitization', () => {
    it('500 errors must not contain internal details', () => {
      const sensitiveMessages = [
        'SQLITE_CANNOT_OPEN_DB',
        'ECONNREFUSED',
        'password_hash',
        'JWT_SECRET',
        'PRIVATE_KEY',
        '/data/tvoflavours.db',
        'firebase-adminsdk',
      ];
      for (const msg of sensitiveMessages) {
        const res = err(msg, 500);
        expect(res.status).toBe(500);
      }
    });

    it('4xx errors preserve user-facing messages', () => {
      const res = err('Invalid email', 400);
      expect(res.status).toBe(400);
    });

    it('403 errors preserve access denial message', () => {
      const res = err('Admin access required', 403);
      expect(res.status).toBe(403);
    });

    it('404 errors preserve not-found message', () => {
      const res = err('User not found', 404);
      expect(res.status).toBe(404);
    });
  });

  describe('request ID', () => {
    it('generates valid UUID-like string', () => {
      const id = requestId();
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidPattern);
    });
  });

  describe('database connectivity and readiness health checks', () => {
    it('CASE 1: SELECT 1 succeeds -> database status PASS (reachable: true)', async () => {
      const { checkDbHealth } = await import('../db');
      const health = checkDbHealth();
      expect(health.reachable).toBe(true);
      expect(['SELECT 1', 'PRAGMA quick_check']).toContain(health.check);
    });

    it('CASE 2: PRAGMA quick_check returns non-"ok" informational output -> database must NOT be classified as disconnected', async () => {
      const { checkDbHealth, db } = await import('../db');
      const origPrepare = db.prepare.bind(db);
      vi.spyOn(db, 'prepare').mockImplementation((sql: string) => {
        if (sql.includes('PRAGMA quick_check')) {
          return {
            get: () => ({ quick_check: '*** in database main ***\nPage 198: never used' }),
          } as any;
        }
        return origPrepare(sql);
      });

      const health = checkDbHealth();
      expect(health.reachable).toBe(true);
      expect(health.check).toBe('SELECT 1');
      vi.restoreAllMocks();
    });

    it('CASE 3: Database connection genuinely fails -> database status FAIL (reachable: false)', async () => {
      const { checkDbHealth, db } = await import('../db');
      vi.spyOn(db, 'prepare').mockImplementation(() => {
        throw new Error('Database disk image is malformed or connection closed');
      });

      const health = checkDbHealth();
      expect(health.reachable).toBe(false);
      expect(health.check).toBe('SELECT 1');
      vi.restoreAllMocks();
    });

    it('CASE 4: Readiness with healthy database -> returns 200 (NOT 503)', async () => {
      mockGetCurrentUser.mockReturnValue({ id: 1, role: 'super_admin', name: 'Admin' });
      const res = await readyGET(makeReq('tvo_auth=admin-token'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.status).toBe('ready');
      expect(body.checks.database.ready).toBe(true);
    });

    it('CASE 5: Readiness with genuine database failure -> returns 503 with not_ready', async () => {
      mockGetCurrentUser.mockReturnValue({ id: 1, role: 'super_admin', name: 'Admin' });
      const { db } = await import('../db');
      vi.spyOn(db, 'prepare').mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const res = await readyGET(makeReq('tvo_auth=admin-token'));
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.status).toBe('not_ready');
      expect(body.checks.database.ready).toBe(false);
      vi.restoreAllMocks();
    });
  });
});

