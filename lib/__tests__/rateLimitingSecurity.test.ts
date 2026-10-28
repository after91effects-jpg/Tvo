import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, rateLimitMiddleware } from '../server/rateLimit';

describe('Tiered Rate Limiting & Security Hardening', () => {
  const testIp = '192.168.1.99';

  it('allows requests within default limit and decrements remaining', () => {
    const id = `test-client-${Date.now()}`;
    const first = rateLimit(id, 'default');
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(4); // 5 max - 1
  });

  it('respects tier-specific thresholds', () => {
    const ordersId = `orders-client-${Date.now()}`;
    const res = rateLimit(ordersId, 'orders');
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(14); // 15 max - 1

    const uploadId = `upload-client-${Date.now()}`;
    const uploadRes = rateLimit(uploadId, 'upload');
    expect(uploadRes.allowed).toBe(true);
    expect(uploadRes.remaining).toBe(24); // 25 max - 1
  });

  it('blocks requests once threshold is exceeded and returns 429 response via middleware', () => {
    const floodIp = `flood-${Date.now()}`;
    // Auth tier max is 5
    for (let i = 0; i < 5; i++) {
      const check = rateLimit(floodIp, 'auth');
      expect(check.allowed).toBe(true);
    }
    // 6th attempt should be blocked
    const blocked = rateLimit(floodIp, 'auth');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);

    // Middleware check
    const mockReq = new Request('https://tvoflavours.test/api/auth', {
      headers: { 'x-forwarded-for': floodIp },
    });
    const mwResult = rateLimitMiddleware(mockReq, 'auth');
    expect(mwResult.allowed).toBe(false);
    expect(mwResult.response).toBeDefined();
    expect(mwResult.response?.status).toBe(429);
  });
});
