import { db } from './db';
import { getFirebaseAdminAuth } from './firebaseAdmin';
import { createAdminUser } from './admin-ops';
import { ADMIN_ROLES } from './permissions';

// Staff login uses Firebase, so a database row alone is not a usable account.
export async function createStaffAccount(actor: { id: number; role: string }, data: Record<string, unknown>) {
  const email = String(data.email || '').trim().toLowerCase();
  const name = String(data.name || '').trim();
  const password = String(data.password || '');
  const role = String(data.role || 'catalog_manager');
  const status = String(data.status || 'active');
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'A name and valid email are required.' };
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  if (!ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number]) || !['active', 'inactive'].includes(status)) return { ok: false, error: 'Invalid staff role or status.' };
  if (db.prepare('SELECT id FROM users WHERE lower(email)=?').get(email)) return { ok: false, error: 'A staff account with this email already exists.' };
  const auth = getFirebaseAdminAuth();
  if (!auth) return { ok: false, error: 'Staff sign-in is not configured. No account was created.' };
  let createdUid: string | null = null;
  try {
    let identity;
    try { identity = await auth.getUserByEmail(email); }
    catch (error) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
      identity = await auth.createUser({ email, password, displayName: name });
      createdUid = identity.uid;
    }
    // Never change the password of an existing Firebase account.
    const result = db.transaction(() => {
      const staff = createAdminUser(actor, { ...data, email, name, password, role, status });
      if (!staff.ok || !staff.id) throw new Error(staff.error || 'Could not save staff account.');
      db.prepare('UPDATE users SET firebase_uid=? WHERE id=?').run(identity.uid, staff.id);
      return staff;
    })();
    return { ...result, existingIdentity: !createdUid };
  } catch {
    if (createdUid) {
      try { await auth.deleteUser(createdUid); }
      catch { return { ok: false, error: 'Staff access was not saved. The sign-in identity needs an administrator to review it before retrying.' }; }
    }
    return { ok: false, error: 'Could not create staff access. Please retry after checking the sign-in service.' };
  }
}
