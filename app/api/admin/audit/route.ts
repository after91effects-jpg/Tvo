import { ok, err, requireAdmin, db } from '../../../../lib/server/api';

export const runtime = 'nodejs';

// Browser observations are labeled separately from authoritative server-side
// mutation events. Actor identity always comes from the authenticated session.
export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);
  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== 'string' || !/^[A-Z][A-Z0-9_]{1,79}$/.test(body.action)) return err('Invalid audit event', 400);
  try {
    db.prepare(`INSERT INTO audit_logs (user_id, user_name, role, action, target_type, target_id, details, ip) VALUES (?,?,?,?,?,?,?,?)`).run(
      user.id, user.name, user.role, `CLIENT_${body.action}`,
      String(body.targetType || 'Admin').slice(0, 100),
      String(body.targetId || '').slice(0, 200),
      String(body.details || '').slice(0, 2000), null,
    );
    return ok({ ok: true });
  } catch {
    return err('Could not record audit event', 500);
  }
}
