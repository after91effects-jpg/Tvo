import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

function getConfig() {
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(DEFAULT_WINDOW_MS), 10),
    maxAttempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || String(DEFAULT_MAX_ATTEMPTS), 10),
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  };
}

const attempts = new Map<string, RateLimitEntry>();

export function rateLimit(identifier: string) {
  const { windowMs, maxAttempts } = getConfig();
  const now = Date.now();
  const entry = attempts.get(identifier);
  if (!entry || now > entry.resetAt) {
    attempts.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
  }
  entry.count++;
  const remaining = Math.max(0, maxAttempts - entry.count);
  return { allowed: entry.count <= maxAttempts, remaining, resetAt: entry.resetAt };
}

export function rateLimitMiddleware(req: Request): { allowed: boolean; response?: NextResponse; identifier?: string } {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const result = rateLimit(ip);
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    res.headers.set('Retry-After', String(retryAfter));
    return { allowed: false, response: res, identifier: ip };
  }
  return { allowed: true, identifier: ip };
}
