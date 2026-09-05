import { ok, err, db, getCurrentUser } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = getCurrentUser(req);
  if (!user) return ok({ wishlist: [], requiresAuth: true });
  const cust = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id);
  if (!cust) return ok({ wishlist: [] });
  const rows = db.prepare('SELECT w.*, p.name, p.sale_price, p.regular_price, p.images_json, p.slug FROM wishlists w LEFT JOIN products p ON w.product_id=p.id WHERE w.customer_id=?').all(cust.id);
  return ok({ wishlist: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = getCurrentUser(req);
  if (!user) return err('Login required', 401);
  const cust = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id);
  if (!cust) return err('Account not found', 404);
  const productId = body.product_id;
  if (!productId) return err('product_id required');
  if (body.action === 'add') {
    db.prepare('INSERT OR IGNORE INTO wishlists (customer_id, product_id) VALUES (?,?)').run(cust.id, productId);
    return ok({ ok: true, wishlisted: true });
  }
  if (body.action === 'remove') {
    db.prepare('DELETE FROM wishlists WHERE customer_id=? AND product_id=?').run(cust.id, productId);
    return ok({ ok: true, wishlisted: false });
  }
  return err('Unknown action');
}
