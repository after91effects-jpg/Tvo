import { ok, err, db, getCurrentUser } from '../../../lib/server/api';
import { rateLimitMiddleware } from '../../../lib/server/rateLimit';

export const runtime = 'nodejs';

// Validate + return a coupon code's discount info
export async function GET(req: Request) {
  try {
    const rl = rateLimitMiddleware(req, 'public_forms');
    if (!rl.allowed) return rl.response || err('Rate limit exceeded', 429);

    const url = new URL(req.url);
    const codeParam = url.searchParams.get('code');
    const code = (codeParam || '').toUpperCase().trim();
    const rawSubtotal = parseFloat(url.searchParams.get('subtotal') || '0');
    const subtotal = Number.isFinite(rawSubtotal) && rawSubtotal >= 0 ? rawSubtotal : 0;
    const phone = (url.searchParams.get('phone') || '').trim();
    const email = (url.searchParams.get('email') || '').trim();
    const customerId = (url.searchParams.get('customer_id') || url.searchParams.get('customerId') || '').trim();

    // If no code parameter was supplied, return the list of active public coupons for storefront discovery
    if (codeParam === null || (codeParam !== null && code === '')) {
      if (codeParam !== null && code === '') {
        return ok({ valid: false, message: 'Please enter a coupon code' });
      }
      try {
        const publicCoupons = db.prepare(`
          SELECT code, discount_type, discount_value, min_order, max_discount, description, starts_at, ends_at, active
          FROM coupons
          WHERE active = 1 AND (ends_at IS NULL OR ends_at > datetime('now'))
          ORDER BY id DESC
        `).all();
        return ok({ coupons: publicCoupons });
      } catch {
        return ok({ coupons: [] });
      }
    }

    const c = db.prepare('SELECT * FROM coupons WHERE UPPER(code)=?').get(code) as any;
    if (!c) return ok({ valid: false, message: 'Invalid coupon code' });
    if (!c.active) return ok({ valid: false, message: 'This coupon is inactive' });
    if (c.max_uses && c.uses >= c.max_uses) return ok({ valid: false, message: 'This coupon has reached its usage limit' });
    if (c.starts_at) {
      const starts = new Date(c.starts_at);
      if (!isNaN(starts.getTime()) && starts > new Date()) {
        return ok({ valid: false, message: 'This coupon is not yet active' });
      }
    }
    if (c.ends_at) {
      const ends = new Date(c.ends_at);
      if (!isNaN(ends.getTime()) && ends < new Date()) {
        return ok({ valid: false, message: 'This coupon has expired' });
      }
    }
    if (c.min_order && subtotal < c.min_order) {
      return ok({ valid: false, message: `Minimum order of ₹${c.min_order} required` });
    }

    const isFirstOrderCoupon = Boolean(
      (c.description && /first(\s+|-)?order/i.test(c.description)) ||
      (c.description && /first celebration order/i.test(c.description)) ||
      c.code.toUpperCase().startsWith('FIRST') ||
      c.code.toUpperCase().startsWith('WELCOME')
    );

    if (isFirstOrderCoupon && (customerId || phone || email)) {
      try {
        const priorOrders = db.prepare(`
          SELECT COUNT(*) as cnt FROM orders 
          WHERE status != 'Cancelled' AND (
            (? != '' AND customer_id IS NOT NULL AND customer_id = ?) OR
            (? != '' AND customer_phone IS NOT NULL AND customer_phone = ?) OR
            (? != '' AND customer_email IS NOT NULL AND customer_email = ?)
          )
        `).get(customerId, customerId, phone, phone, email, email) as any;
        if (priorOrders && priorOrders.cnt > 0) {
          return ok({ valid: false, message: `Coupon "${c.code}" is valid for first-time orders only` });
        }
      } catch (orderCheckErr) {
        console.warn('Could not check prior orders for first-order coupon:', orderCheckErr);
      }
    }

    let discount = 0;
    if (c.discount_type === 'percent') {
      discount = (subtotal * Number(c.discount_value || 0)) / 100;
      if (c.max_discount && discount > c.max_discount) discount = c.max_discount;
    } else {
      discount = Number(c.discount_value || 0);
    }
    discount = Math.min(discount, subtotal);
    discount = Math.round(discount * 100) / 100;

    return ok({
      valid: true,
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      discount,
      max_discount: c.max_discount,
      min_order: c.min_order,
      message: 'Coupon applied!',
    });
  } catch (e: any) {
    console.error('Coupon validation error:', e);
    return err(e?.message || 'Failed to validate coupon', 500);
  }
}
