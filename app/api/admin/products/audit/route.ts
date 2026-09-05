import { ok, err, getCurrentUser, isAdminRole } from '../../../../../lib/server/api';
import { db } from '../../../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = getCurrentUser(req);
  if (!user || !isAdminRole(user.role)) return err('Admin access required', 403);
  const url = new URL(req.url);
  const productId = url.searchParams.get('product_id');
  try {
    let rows;
    if (productId) {
      rows = db.prepare('SELECT * FROM product_audit WHERE product_id=? ORDER BY id DESC LIMIT 100').all(Number(productId));
    } else {
      rows = db.prepare('SELECT * FROM product_audit ORDER BY id DESC LIMIT 200').all();
    }
    return ok({ audit: rows });
  } catch (e: any) {
    return err(e.message, 500);
  }
}