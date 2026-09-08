import { ok, err, db, getCurrentUser, isAdminRole } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = getCurrentUser(req);
  if (!user || !isAdminRole(user.role)) {
    return err('Admin access required', 403);
  }

  const url = new URL(req.url);
  const folder = url.searchParams.get('folder') || '';
  try {
    let rows;
    if (folder) rows = db.prepare('SELECT * FROM media WHERE folder=? ORDER BY created_at DESC').all(folder);
    else rows = db.prepare('SELECT * FROM media ORDER BY created_at DESC LIMIT 200').all();
    return ok({ media: rows });
  } catch (e: any) {
    return err(e.message, 500);
  }
}
