import crypto from 'crypto';
import { db, initDb } from './db';

// The JWT signing secret MUST be supplied via the environment at runtime.
// There is deliberately NO hardcoded or default fallback: if JWT_SECRET is
// missing the server fails safely (no tokens are signed, token verification
// returns null) rather than publishing tokens with a known value.
function getJwtSecret(): string {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret) {
    console.error(
      '[auth] Server configuration error: JWT_SECRET is not set. ' +
      'Refusing to sign/verify tokens. Set JWT_SECRET in the server environment before starting.'
    );
    throw new Error('Server configuration error: JWT_SECRET is not set.');
  }
  return secret;
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pw, salt, 310000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.pbkdf2Sync(pw, salt, 310000, 64, 'sha512').toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signToken(payload: Record<string, unknown>, expiresInSeconds = 7 * 24 * 3600): string {
  const SECRET = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const SECRET = getJwtSecret();
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && typeof payload.exp === 'number' && now > payload.exp) {
      return null;
    }

    // Check if token has been revoked
    const tokenHash = hashToken(token);
    const revoked = db.prepare('SELECT id FROM revoked_tokens WHERE token_hash=?').get(tokenHash) as any;
    if (revoked) return null;

    return payload;
  } catch {
    return null;
  }
}

export function revokeToken(token: string): void {
  try {
    const tokenHash = hashToken(token);
    const now = Math.floor(Date.now() / 1000);
    let exp = now + 7 * 24 * 3600;
    try {
      const parts = token.split('.');
      if (parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        if (payload.exp) exp = Number(payload.exp);
      }
    } catch {}
    db.prepare('INSERT OR IGNORE INTO revoked_tokens (token_hash, expires_at) VALUES (?,?)').run(tokenHash, exp);
    // Lazily purge expired tokens
    db.prepare('DELETE FROM revoked_tokens WHERE expires_at < ?').run(now);
  } catch {}
}

export function isAdminRole(role: string | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function can(role: string | undefined, permission: string): boolean {
  if (isAdminRole(role)) return true;
  const row = db.prepare('SELECT permissions FROM roles WHERE name=?').get(role) as any;
  if (!row) return true; // customers can't hit admin routes anyway
  const perms: string[] = JSON.parse(row.permissions || '[]');
  return perms.includes(permission) || perms.includes('*');
}

export function currentCookie(req: Request): string | null {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith('tvo_auth='));
  if (!match) return null;
  return match.split('=').slice(1).join('=');
}

export function getCurrentUser(req: Request): any | null {
  const token = currentCookie(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.sub) return null;
  return db.prepare('SELECT * FROM users WHERE id=?').get(payload.sub) || null;
}
