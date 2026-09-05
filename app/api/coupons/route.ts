import { ok, err, db, getCurrentUser } from '../../../lib/server/api';

export const runtime = 'nodejs';

// Validate + return a coupon code's discount info
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get('code') || '').toUpperCase().trim();
  const subtotal = parseFloat(url.searchParams.get('subtotal') || '0');
  if (!code) return err('Code required');
  const c = db.prepare('SELECT * FROM coupons WHERE code=?').get(code);
  if (!c) return ok({ valid: false, message: 'Invalid coupon code' });
  if (!c.active) return ok({ valid: false, message: 'This coupon is inactive' });
  if (c.max_uses && c.uses >= c.max_uses) return ok({ valid: false, message: 'This coupon has reached its usage limit' });
  if (c.starts_at && new Date(c.starts_at) > new Date()) return ok({ valid: false, message: 'This coupon is not yet active' });
  if (c.ends_at && new Date(c.ends_at) < new Date()) return ok({ valid: false, message: 'This coupon has expired' });
  if (c.min_order && subtotal < c.min_order) return ok({ valid: false, message: `Minimum order of ₹${c.min_order} required` });

  let discount = 0;
  if (c.discount_type === 'percent') {
    discount = (subtotal * c.discount_value) / 100;
    if (c.max_discount && discount > c.max_discount) discount = c.max_discount;
  } else {
    discount = c.discount_value;
  }
  discount = Math.min(discount, subtotal);
  return ok({ valid: true, code: c.code, discount_type: c.discount_type, discount_value: c.discount_value, discount, max_discount: c.max_discount, min_order: c.min_order, message: `Coupon applied!` });
}
