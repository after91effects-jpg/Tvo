import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

export type RateLimitTier = 'auth' | 'orders' | 'reviews' | 'public_forms' | 'upload' | 'default';

const TIER_LIMITS: Record<RateLimitTier, { windowMs: number; maxAttempts: number }> = {
  auth: { windowMs: 60 * 1000, maxAttempts: 5 },
  orders: { windowMs: 60 * 1000, maxAttempts: 15 },
  reviews: { windowMs: 60 * 1000, maxAttempts: 10 },
  public_forms: { windowMs: 60 * 1000, maxAttempts: 15 },
  upload: { windowMs: 60 * 1000, maxAttempts: 25 },
  default: { windowMs: 60 * 1000, maxAttempts: 5 },
};

function getConfig(tier: RateLimitTier = 'default') {
  const tierConfig = TIER_LIMITS[tier] || TIER_LIMITS.default;
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(tierConfig.windowMs), 10),
    maxAttempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || String(tierConfig.maxAttempts), 10),
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  };
}

const attempts = new Map<string, RateLimitEntry>();

export function rateLimit(identifier: string, tier: RateLimitTier = 'default') {
  const { windowMs, maxAttempts } = getConfig(tier);
  const key = `${tier}:${identifier}`;
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
  }
  entry.count++;
  const remaining = Math.max(0, maxAttempts - entry.count);
  return { allowed: entry.count <= maxAttempts, remaining, resetAt: entry.resetAt };
}

export function rateLimitMiddleware(req: Request, tier: RateLimitTier = 'default'): { allowed: boolean; response?: NextResponse; identifier?: string } {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const result = rateLimit(ip, tier);
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    res.headers.set('Retry-After', String(retryAfter));
    return { allowed: false, response: res, identifier: ip };
  }
  return { allowed: true, identifier: ip };
}
