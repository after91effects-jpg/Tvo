import { ok, err, db, generateOrderNumber, jsonParseSafe, getCurrentUser, logAudit } from '../../../lib/server/api';
import { createOrder, OrderInputError } from '../../../lib/server/order-engine';

export const runtime = 'nodejs';

const PRODUCTION_STATUSES = ['Order Placed', 'Payment Confirmed', 'Accepted', 'In Preparation', 'Baking in Kitchen', 'Baking', 'Decorating', 'Quality Check', 'Packed', 'Ready for Dispatch', 'Dispatched', 'Out for Delivery', 'Delivered', 'Cancelled'];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderNumber = url.searchParams.get('order') || url.searchParams.get('number') || '';
  if (orderNumber) {
    const order = db.prepare('SELECT * FROM orders WHERE order_number=?').get(orderNumber);
    if (!order) return err('Order not found', 404);
    const timeline = jsonParseSafe(order.timeline, []);
    if (timeline.length === 0) {
      // build timeline from status history
      const hist = db.prepare('SELECT status, created_at, note FROM order_status_history WHERE order_id=? ORDER BY id').all(order.id);
      order.timeline = JSON.stringify(hist.length ? hist : [{ status: order.status, created_at: order.created_at }]);
    } else {
      order.timeline = JSON.stringify(jsonParseSafe(order.timeline, []));
    }
    order.items = jsonParseSafe(order.items, []);
    return ok(order);
  }
  // list orders for a customer (by cookie)
  const user = getCurrentUser(req);
  const session = url.searchParams.get('session') || '';
  let where = '1=1';
  const params = [];
  if (user) {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id);
    if (cust) { where = 'customer_id=?'; params.push(cust.id); }
    else where = 'customer_email=?'; params.push(user.email);
  } else {
    where = 'session_id=?'; params.push(session);
  }
  const orders = db.prepare(`SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT 100`).all(...params);
  for (const o of orders) o.items = jsonParseSafe(o.items, []);
  return ok({ orders });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const items = body.items || [];
  if (!Array.isArray(items) || items.length === 0) return err('Cart is empty');

  const user = getCurrentUser(req);
  let customerId: number | null = null;
  if (user) {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id);
    customerId = cust?.id ?? null;
  }

  try {
    const created = createOrder({ items, body, customerId, generateOrderNumber });
    logAudit(user, 'ORDER_CREATE', 'Order', created.orderNumber, `Total ${created.total}`);
    return ok(created);
  } catch (e) {
    if (e instanceof OrderInputError) return err(e.message);
    console.error('Order creation failed:', e);
    return err('Failed to create order. Please try again.', 500);
  }
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  const user = getCurrentUser(req);
  if (action === 'status') {
    const order = db.prepare('SELECT * FROM orders WHERE order_number=?').get(body.orderNumber);
    if (!order) return err('Order not found', 404);
    const newStatus = body.status;
    if (!PRODUCTION_STATUSES.includes(newStatus)) return err('Invalid status', 400);
    db.prepare('UPDATE orders SET status=?, updated_at=datetime(\'now\') WHERE id=?').run(newStatus, order.id);
    db.prepare('INSERT INTO order_status_history (order_id, status, note, user_id) VALUES (?,?,?,?)').run(order.id, newStatus, body.note || null, user?.id ?? null);
    // restore stock + slot booking when an order is cancelled
    if (String(newStatus).toLowerCase() === 'cancelled') {
      const lineItems = jsonParseSafe(order.items, []);
      for (const it of lineItems) {
        if (!it || !it.productId) continue;
        const qty = Number(it.qty) || 1;
        db.prepare(
          "UPDATE products SET stock = stock + ?, stock_status = CASE " +
          "WHEN stock + ? <= 0 THEN 'out_of_stock' " +
          "WHEN stock + ? <= low_stock_threshold THEN 'low_stock' ELSE 'in_stock' END WHERE id=?"
        ).run(qty, qty, qty, it.productId);
        db.prepare('INSERT INTO inventory_transactions (product_id, type, quantity, note) VALUES (?,?,?,?)').run(it.productId, 'restock', qty, `Cancelled order ${order.order_number}`);
      }
      if (order.delivery_date && order.delivery_slot_id) {
        const dayCap = db.prepare('SELECT * FROM slot_capacity WHERE slot_id=? AND date=?').get(order.delivery_slot_id, order.delivery_date);
        if (dayCap && dayCap.books > 0) db.prepare('UPDATE slot_capacity SET books=books-1 WHERE id=?').run(dayCap.id);
      }
    }
    logAudit(user, 'ORDER_STATUS_UPDATE', 'Order', order.order_number, `→ ${newStatus}`);
    return ok({ ok: true, status: newStatus });
  }
  return err('Unknown action');
}
