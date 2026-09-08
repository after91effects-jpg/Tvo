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
  if (!product_id || !rating || rating < 1 || rating > 5) return err('Valid product and rating (1-5) required', 400);

  // Validate that product exists
  const prod = db.prepare('SELECT id, name FROM products WHERE id=?').get(product_id) as any;
  if (!prod) return err('Product not found', 404);

  const user = getCurrentUser(req);
  let verified = 0;
  let customerId = null;

  if (user) {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id) as any;
    if (cust) {
      customerId = cust.id;
      // Prevent duplicate review by same customer on same product
      const existing = db.prepare('SELECT id FROM product_reviews WHERE product_id=? AND customer_id=?').get(product_id, cust.id);
      if (existing) {
        return err('You have already submitted a review for this product', 400);
      }

      // Check if delivered orders contained this specific product
      const deliveredOrders = db.prepare(
        "SELECT items FROM orders WHERE (customer_id=? OR customer_email=?) AND status='Delivered'"
      ).all(cust.id, user.email) as any[];

      const hasPurchased = deliveredOrders.some((order) => {
        try {
          const items = JSON.parse(order.items || '[]');
          return items.some((it: any) => String(it.productId) === String(product_id));
        } catch {
          return false;
        }
      });
      verified = hasPurchased ? 1 : 0;
    }
  }

  try {
    db.prepare('INSERT INTO product_reviews (product_id, customer_id, customer_name, rating, comment, verified, status) VALUES (?,?,?,?,?,?,?)')
      .run(product_id, customerId, body.customer_name || user?.name || 'Customer', rating, comment || '', verified, 'pending');
    return ok({ ok: true, message: 'Thank you for your review! It will appear after moderation.' });
  } catch (e: any) { return err(e.message, 500); }
}
