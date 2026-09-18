import { ok, err, db, getCurrentUser } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get('product_id');
  const forCustomer = url.searchParams.get('my_reviews') === '1' || url.searchParams.get('customer') === '1';

  try {
    if (forCustomer) {
      const user = getCurrentUser(req);
      if (!user) return err('Authentication required to view your reviews', 401);

      const cust = db.prepare('SELECT id FROM customers WHERE id=? OR user_id=? OR email=?').get(user.customerId || user.id, user.id, user.email) as any;
      if (!cust) return ok({ reviews: [] });

      const rawReviews = db.prepare(`
        SELECT pr.*, p.name AS product_name, p.slug AS product_slug, p.images_json AS product_images
        FROM product_reviews pr
        LEFT JOIN products p ON pr.product_id = p.id
        WHERE pr.customer_id = ?
        ORDER BY pr.created_at DESC
      `).all(cust.id);

      const formatted = rawReviews.map((r: any) => {
        let product_image = null;
        try {
          const imgs = JSON.parse(r.product_images || '[]');
          if (Array.isArray(imgs) && imgs.length > 0) {
            product_image = typeof imgs[0] === 'string' ? imgs[0] : (imgs[0].url || imgs[0].src || null);
          }
        } catch {}
        const { product_images, ...rest } = r;
        return { ...rest, product_image };
      });

      return ok({ reviews: formatted });
    }

    let rows: any[];
    if (productId) {
      rows = db.prepare("SELECT * FROM product_reviews WHERE product_id=? AND status='approved' ORDER BY created_at DESC").all(productId);
    } else {
      rows = db.prepare("SELECT * FROM product_reviews WHERE status='approved' ORDER BY created_at DESC").all();
    }

    // Compute distribution breakdown & summary stats if productId requested
    let stats = null;
    if (productId) {
      const allApproved = rows as any[];
      const total = allApproved.length;
      const sum = allApproved.reduce((acc, r) => acc + Number(r.rating || 0), 0);
      const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
      const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      for (const r of allApproved) {
        const star = Number(r.rating);
        if (star >= 1 && star <= 5) {
          distribution[star] = (distribution[star] || 0) + 1;
        }
      }
      stats = { total, average, distribution };
    }

    return ok({ reviews: rows, stats });
  } catch (e: any) {
    return err(e.message || 'Error fetching reviews', 500);
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { product_id, rating, comment } = body;

  const parsedRating = parseInt(String(rating), 10);
  if (!product_id || isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return err('Valid product and rating (1-5 stars) required', 400);
  }

  // Validate that product exists
  const prod = db.prepare('SELECT id, name FROM products WHERE id=?').get(product_id) as any;
  if (!prod) return err('Product not found', 404);

  // Validate comment
  const rawComment = typeof comment === 'string' ? comment.trim() : '';
  if (rawComment.length < 5) {
    return err('Review comment must be at least 5 characters', 400);
  }
  if (rawComment.length > 1000) {
    return err('Review comment must be at most 1,000 characters', 400);
  }

  // Sanitize comment to strip scripts and unsafe HTML tags
  const sanitizedComment = rawComment
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  const user = getCurrentUser(req);
  let verified = 0;
  let customerId = null;
  let customerName = typeof body.customer_name === 'string' ? body.customer_name.trim() : '';

  if (user) {
    const cust = db.prepare('SELECT id, name FROM customers WHERE id=? OR user_id=? OR email=?').get(user.customerId || user.id, user.id, user.email) as any;
    if (cust) {
      customerId = cust.id;
      customerName = cust.name || user.name || customerName || 'Valued Customer';

      // Prevent duplicate review by same customer on same product
      const existing = db.prepare('SELECT id FROM product_reviews WHERE product_id=? AND customer_id=?').get(product_id, cust.id);
      if (existing) {
        return err('You have already submitted a review for this celebration cake', 400);
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
    } else {
      customerName = user.name || customerName || 'Valued Customer';
    }
  } else {
    // Unauthenticated guest submission
    if (!customerName || customerName.length < 2) {
      return err('Please provide your name for the review', 400);
    }
    if (customerName.length > 60) {
      return err('Name must be at most 60 characters', 400);
    }
    // Prevent duplicate review by same guest name on same product within same day
    const existingGuest = db.prepare("SELECT id FROM product_reviews WHERE product_id=? AND customer_name=? AND customer_id IS NULL AND created_at >= datetime('now', '-1 day')").get(product_id, customerName);
    if (existingGuest) {
      return err('A review under this name was recently submitted for this product', 400);
    }
  }

  // Sanitize photo if provided
  let photoUrl = null;
  if (typeof body.photo === 'string' && body.photo.trim().length > 0) {
    const cleanPhoto = body.photo.trim();
    if (cleanPhoto.startsWith('http://') || cleanPhoto.startsWith('https://') || cleanPhoto.startsWith('/')) {
      photoUrl = cleanPhoto.slice(0, 500);
    }
  }

  try {
    db.prepare('INSERT INTO product_reviews (product_id, customer_id, customer_name, rating, comment, photo, verified, status) VALUES (?,?,?,?,?,?,?,?)')
      .run(product_id, customerId, customerName || 'Customer', parsedRating, sanitizedComment, photoUrl, verified, 'pending');
    return ok({ ok: true, message: 'Thank you for your review! It will appear after moderation.' });
  } catch (e: any) {
    return err(e.message || 'Failed to submit review', 500);
  }
}
