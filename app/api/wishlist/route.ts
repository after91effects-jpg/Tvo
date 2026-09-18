import { ok, err, db, getCurrentUser } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = getCurrentUser(req);
  if (!user) return ok({ wishlist: [], requiresAuth: true });
  const cust = db.prepare('SELECT id FROM customers WHERE id=? OR user_id=? OR email=?').get(user.id, user.id, user.email) as any;
  if (!cust) return ok({ wishlist: [] });
  const rows = db.prepare('SELECT w.*, p.name, p.sale_price, p.regular_price, p.images_json, p.slug FROM wishlists w LEFT JOIN products p ON w.product_id=p.id WHERE w.customer_id=?').all(cust.id);
  return ok({ wishlist: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = getCurrentUser(req);
  if (!user) return err('Login required', 401);
  const cust = db.prepare('SELECT id FROM customers WHERE id=? OR user_id=? OR email=?').get(user.id, user.id, user.email) as any;
  if (!cust) return err('Account not found', 404);

  if (body.action === 'sync') {
    const productIds = Array.isArray(body.product_ids) ? body.product_ids : [];
    const insertStmt = db.prepare("INSERT OR IGNORE INTO wishlists (customer_id, product_id, created_at) VALUES (?,?,datetime('now'))");
    for (const pid of productIds) {
      if (pid) {
        insertStmt.run(cust.id, String(pid));
      }
    }
    const currentRows = db.prepare('SELECT product_id FROM wishlists WHERE customer_id=?').all(cust.id) as any[];
    return ok({ ok: true, wishlist: currentRows.map((r: any) => String(r.product_id)) });
  }

  const productId = body.product_id;
  if (!productId) return err('product_id required', 400);

  if (body.action === 'add') {
    const prod = db.prepare('SELECT id FROM products WHERE id=?').get(productId);
    if (!prod) return err('Product not found', 404);
    db.prepare("INSERT OR IGNORE INTO wishlists (customer_id, product_id, created_at) VALUES (?,?,datetime('now'))").run(cust.id, String(productId));
    return ok({ ok: true, wishlisted: true });
  }
  if (body.action === 'remove') {
    db.prepare('DELETE FROM wishlists WHERE customer_id=? AND product_id=?').run(cust.id, String(productId));
    return ok({ ok: true, wishlisted: false });
  }
  return err('Unknown action', 400);
}
