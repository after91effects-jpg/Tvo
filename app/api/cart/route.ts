import { ok, err, db, getCurrentUser } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const session = url.searchParams.get('session') || '';
  const user = getCurrentUser(req);
  let customerId = null;
  if (user) customerId = (db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id) as any)?.id ?? null;
  const row = db.prepare('SELECT * FROM carts WHERE customer_id=? OR (customer_id IS NULL AND session_id=?) ORDER BY id DESC LIMIT 1')
    .get(customerId, session) as any;
  return ok(row ? { cart: { ...row, items: JSON.parse(row.items || '[]') } } : { cart: null });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action || 'set';
  const session = body.session_id || '';
  const user = getCurrentUser(req);
  let customerId = null;
  if (user) customerId = (db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id) as any)?.id ?? null;

  let row = db.prepare('SELECT * FROM carts WHERE customer_id=? OR (customer_id IS NULL AND session_id=?) ORDER BY id DESC LIMIT 1')
    .get(customerId, session) as any;

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
  if (action === "validate") {
    const items = Array.isArray(body.items) ? body.items : [];
    const issues = [];
    for (const it of items) {
      if (!it || !it.productId) continue;
      const prod = db.prepare("SELECT id, name, stock, stock_status, manage_stock, enable_stock, selling_unit FROM products WHERE id=?").get(it.productId) as any;
      if (!prod) {
        issues.push({ productId: it.productId, name: it.name || "Product", requestedQty: it.quantity || 1, availableStock: 0, message: `${it.name || "Product"} is no longer available.` });
        continue;
      }
      const manageStock = prod.manage_stock !== 0 && prod.enable_stock !== 0;
      if (!manageStock) continue;
      const requestedQty = Number(it.quantity) || 1;
      if (prod.stock_status === "out_of_stock" || prod.stock <= 0) {
        issues.push({ productId: prod.id, name: prod.name, requestedQty, availableStock: 0, message: `${prod.name} is currently out of stock.` });
      } else if (requestedQty > prod.stock) {
        issues.push({ productId: prod.id, name: prod.name, requestedQty, availableStock: prod.stock, message: `Only ${prod.stock} left in stock for ${prod.name}.` });
      }
    }
    return ok({ valid: issues.length === 0, issues });
  }

  return err("Unknown action");
}
