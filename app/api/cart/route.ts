import { ok, err, db, getCurrentUser } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const session = url.searchParams.get('session') || '';
  const user = getCurrentUser(req);
  let customerId = null;
  if (user) customerId = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id)?.id ?? null;
  const row = db.prepare('SELECT * FROM carts WHERE customer_id=? OR (customer_id IS NULL AND session_id=?) ORDER BY id DESC LIMIT 1')
    .get(customerId, session);
  return ok(row ? { cart: { ...row, items: JSON.parse(row.items || '[]') } } : { cart: null });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action || 'set';
  const session = body.session_id || '';
  const user = getCurrentUser(req);
  let customerId = null;
  if (user) customerId = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id)?.id ?? null;

  let row = db.prepare('SELECT * FROM carts WHERE customer_id=? OR (customer_id IS NULL AND session_id=?) ORDER BY id DESC LIMIT 1')
    .get(customerId, session);

  if (action === 'save') {
    const itemsJson = JSON.stringify(body.items || []);
    if (row) {
      db.prepare('UPDATE carts SET items=?, coupon_code=?, delivery_date=?, delivery_slot_id=?, notes=?, updated_at=datetime(\'now\') WHERE id=?')
        .run(itemsJson, body.coupon_code || null, body.delivery_date || null, body.delivery_slot_id || null, body.notes || null, row.id);
    } else {
      db.prepare('INSERT INTO carts (customer_id, session_id, items, coupon_code, delivery_date, delivery_slot_id, notes) VALUES (?,?,?,?,?,?,?)')
        .run(customerId, session || null, itemsJson, body.coupon_code || null, body.delivery_date || null, body.delivery_slot_id || null, body.notes || null);
    }
    return ok({ ok: true });
  }
  return err('Unknown action');
}
