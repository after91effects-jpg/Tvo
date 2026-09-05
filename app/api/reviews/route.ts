import { ok, err, db, getCurrentUser } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get('product_id');
  try {
    let rows;
    if (productId) rows = db.prepare("SELECT * FROM product_reviews WHERE product_id=? AND status='approved' ORDER BY created_at DESC").all(productId);
    else rows = db.prepare("SELECT * FROM product_reviews WHERE status='approved' ORDER BY created_at DESC").all();
    return ok({ reviews: rows });
  } catch (e: any) { return err(e.message, 500); }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { product_id, rating, comment } = body;
  if (!product_id || !rating || rating < 1 || rating > 5) return err('Valid product and rating required');
  const user = getCurrentUser(req);
  // only verified purchase can set verified flag
  let verified = 0;
  let customerId = null;
  if (user) {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id);
    if (cust) {
      customerId = cust.id;
      const purchased = db.prepare('SELECT id FROM orders WHERE customer_id=? AND status=\'Delivered\'').get(cust.id) ||
        db.prepare('SELECT id FROM orders WHERE customer_email=? AND status=\'Delivered\'').get(user.email);
      verified = purchased ? 1 : 0;
    }
  }
  try {
    db.prepare('INSERT INTO product_reviews (product_id, customer_id, customer_name, rating, comment, verified, status) VALUES (?,?,?,?,?,?,?)')
      .run(product_id, customerId, body.customer_name || user?.name || 'Customer', rating, comment || '', verified, 'pending');
    return ok({ ok: true, message: 'Thank you for your review! It will appear after moderation.' });
  } catch (e: any) { return err(e.message, 500); }
}
