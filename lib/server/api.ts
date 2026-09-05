import { NextResponse } from 'next/server';
import { db, initDb } from './db';
import { runMigrations } from './migrations';
import { getCurrentUser, isAdminRole } from './auth';
export { getCurrentUser, isAdminRole } from './auth';

initDb();
runMigrations();

import { seedIfEmpty } from './seed';
seedIfEmpty();

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function authUser(req: Request) {
  return getCurrentUser(req);
}

export function requireAuth(req: Request) {
  const user = getCurrentUser(req);
  if (!user) return null;
  return user;
}

export function requireAdmin(req: Request) {
  const user = getCurrentUser(req);
  if (!user || !isAdminRole(user.role)) return null;
  return user;
}

export function logAudit(user: any, action: string, targetType?: string, targetId?: string, details?: string) {
  try {
    db.prepare(
      `INSERT INTO audit_logs (user_id, user_name, role, action, target_type, target_id, details, ip)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(
      user?.id ?? null,
      user?.name ?? 'system',
      user?.role ?? 'system',
      action,
      targetType ?? null,
      targetId !== undefined ? String(targetId) : null,
      details ?? null,
      null
    );
  } catch {
    /* no-op */
  }
}

export function slugify(s: string): string {
  return (s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s]+/g, '-').replace(/-+/g, '-');
}

export function jsonParseSafe(s: string | undefined, fallback: any = []) {
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

export function generateOrderNumber(): string {
  let next = 1;
  try {
    const row = db.prepare("SELECT seq FROM sqlite_sequence WHERE name='orders'").get() as any;
    if (row && row.seq) {
      next = Number(row.seq) + 1;
    } else {
      const maxRow = db.prepare("SELECT MAX(id) AS m FROM orders").get() as any;
      next = (Number(maxRow?.m) || 0) + 1;
    }
  } catch (e) {
    const maxRow = db.prepare("SELECT MAX(id) AS m FROM orders").get() as any;
    next = (Number(maxRow?.m) || 0) + 1;
  }
  const year = new Date().getFullYear();
  return `TVO-${year}-${String(next).padStart(6, '0')}`;
}

export * from './db';
