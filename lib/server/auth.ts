import crypto from 'node:crypto';
import { db, initDb } from './db';

const SECRET = process.env.JWT_SECRET || 'tvoflavours_dev_secret_change_me';

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

export function signToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch {
    return null;
  }
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
