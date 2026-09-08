import { NextResponse } from 'next/server';
import { ok, err, db } from '../../../lib/server/api';
import { verifyPassword, signToken, hashPassword, getCurrentUser } from '../../../lib/server/auth';
import { logAudit } from '../../../lib/server/api';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action || '';

  if (action === 'login') {
    const email = (body.email || '').toString().toLowerCase().trim();
    const password = body.password || '';
    if (!email || !password) return err('Email and password are required');
    if (!EMAIL_REGEX.test(email)) return err('Please enter a valid email address');
    
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email) as any;
    if (!user) return err('Invalid credentials', 401);
    if (!verifyPassword(password, user.password_hash)) return err('Invalid credentials', 401);
    if (user.status === 'inactive' || user.status === 'suspended') return err('Account is inactive', 403);
    
    db.prepare("UPDATE users SET last_login_at=datetime('now') WHERE id=?").run(user.id);
    const token = signToken({ sub: user.id, role: user.role, email: user.email, name: user.name });
    logAudit(user, 'LOGIN_SUCCESS', 'Auth', String(user.id));
    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      admin: user.role === 'super_admin' || user.role === 'admin',
    });
    res.cookies.set('tvo_auth', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600 });
    return res;
  }

  if (action === 'register') {
    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().toLowerCase().trim();
    const phone = (body.phone || '').toString().trim();
    const password = body.password || '';
    if (!name || name.length < 2) return err('Please provide a valid name (at least 2 characters)');
    if (!email || !EMAIL_REGEX.test(email)) return err('Please provide a valid email address');
    if (!password || password.length < 6) return err('Password must be at least 6 characters');

    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (existing) return err('An account with this email already exists', 409);
    const info = db.prepare('INSERT INTO users (name,email,password_hash,phone,role,status) VALUES (?,?,?,?,?,?)')
      .run(name, email, hashPassword(password), phone || null, 'customer', 'active');
    const userId = Number(info.lastInsertRowid);
    const custInfo = db.prepare('INSERT INTO customers (user_id,name,email,phone,group_name) VALUES (?,?,?,?,?)')
      .run(userId, name, email, phone || null, 'New Customer');
    const token = signToken({ sub: userId, role: 'customer', email, name });
    const res = NextResponse.json({
      user: { id: userId, name, email, role: 'customer', customerId: Number(custInfo.lastInsertRowid) },
      admin: false,
    });
    res.cookies.set('tvo_auth', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600 });
    return res;
  }

  if (action === 'logout') {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith('tvo_auth='));
    const token = match ? match.split('=').slice(1).join('=') : null;
    if (token) {
      const { revokeToken } = await import('../../../lib/server/auth');
      revokeToken(token);
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set('tvo_auth', '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
  }

  return err('Unknown action');
}

export async function GET(req: Request) {
  const user = getCurrentUser(req);
  return ok({ user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null });
}
