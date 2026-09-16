import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, rateLimitMiddleware } from '../rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    rateLimit('rate-limit-test-cleanup-1');
    rateLimit('rate-limit-test-cleanup-2');
    rateLimit('rate-limit-test-cleanup-3');
  });

  it('allows requests within limit', () => {
    const result = rateLimit('rl-test-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks requests after threshold', () => {
    const ip = 'rl-test-blocked';
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(ip);
      if (i < 4) {
        expect(result.allowed).toBe(true);
      }
    }
    const final = rateLimit(ip);
    expect(final.allowed).toBe(false);
    expect(final.remaining).toBe(0);
  });

  it('tracks remaining attempts correctly', () => {
    const ip = 'rl-test-remaining';
    rateLimit(ip);
    const result = rateLimit(ip);
    expect(result.remaining).toBe(3);
  });

  it('uses unique identifiers separately', () => {
    const r1 = rateLimit('rl-ip-1');
    const r2 = rateLimit('rl-ip-2');
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });
});

describe('rateLimitMiddleware', () => {
  it('allows request without rate limit headers', () => {
    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const result = rateLimitMiddleware(req);
    expect(result.allowed).toBe(true);
  });

  it('returns 429 response when rate limited', () => {
    const ip = 'rl-mw-ip';
    for (let i = 0; i < 5; i++) rateLimit(ip);
    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    });
    const result = rateLimitMiddleware(req);
    expect(result.allowed).toBe(false);
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(429);
    expect(result.response!.headers.get('Retry-After')).toBeDefined();
  });
});
