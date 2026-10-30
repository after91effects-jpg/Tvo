import { changeOrderStatus } from '../../../lib/server/order-status';
import { hasPermission } from '../../../lib/server/permissions';
import { ok, err, db, generateOrderNumber, jsonParseSafe, getCurrentUser, logAudit } from '../../../lib/server/api';
import { createOrder, OrderInputError } from '../../../lib/server/order-engine';
import { logError } from '../../../lib/server/logger';
import { rateLimitMiddleware } from '../../../lib/server/rateLimit';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderNumber = url.searchParams.get('order') || url.searchParams.get('orderNumber') || url.searchParams.get('number') || '';
  const user = getCurrentUser(req);

  if (orderNumber) {
    const order = db.prepare('SELECT * FROM orders WHERE order_number=?').get(orderNumber) as any;
    if (!order) return err('Order not found', 404);

    const timeline = jsonParseSafe(order.timeline, []);
    if (timeline.length === 0) {
      const hist = db.prepare('SELECT status, created_at, note FROM order_status_history WHERE order_id=? ORDER BY id').all(order.id);
      order.timeline = JSON.stringify(hist.length ? hist : [{ status: order.status, created_at: order.created_at }]);
    } else {
      order.timeline = JSON.stringify(jsonParseSafe(order.timeline, []));
    }
    order.items = jsonParseSafe(order.items, []);

    // PII masking for public guest tracking
    const isPrivileged = user && hasPermission(user.role, 'view_orders');
    let isOwner = false;
    if (user) {
      if (order.customer_id && user.id) {
        const cust = db.prepare('SELECT id FROM customers WHERE (id=? OR user_id=?) AND id=?').get(user.id, user.id, order.customer_id);
        if (cust) isOwner = true;
      }
      if (order.customer_email && user.email && order.customer_email.toLowerCase() === user.email.toLowerCase()) {
        isOwner = true;
      }
    }

    if (!isPrivileged && !isOwner) {
      delete order.session_id;
      if (order.customer_phone) {
        const p = String(order.customer_phone);
        order.customer_phone = p.length > 4 ? p.slice(0, 2) + '******' + p.slice(-4) : '******';
      }
      if (order.customer_email) {
        const parts = String(order.customer_email).split('@');
        order.customer_email = parts[0].slice(0, 2) + '***@' + (parts[1] || '***');
      }
      if (order.customer_address) {
        order.customer_address = order.customer_address.slice(0, 10) + '... (Address on file)';
      }
    }

    return ok(order);
  }

  // list orders for a customer (by cookie or session)
  const session = url.searchParams.get('session') || '';
  let where = '1=1';
  const params: any[] = [];
  if (user && hasPermission(user.role, 'view_orders')) {
    // Authorized operations staff need the shared order queue, not their own purchases.
  } else if (user) {
    const cust = db.prepare('SELECT id FROM customers WHERE id=? OR user_id=? OR email=?').get(user.id, user.id, user.email) as any;
    if (cust) {
      where = '(customer_id=? OR customer_email=?)';
      params.push(cust.id, user.email);
    } else {
      where = 'customer_email=?';
      params.push(user.email);
    }
  } else {
    if (!session) return ok({ orders: [] });
    where = 'session_id=?';
    params.push(session);
  }
  const orders = db.prepare(`SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT 100`).all(...params) as any[];
  for (const o of orders) o.items = jsonParseSafe(o.items, []);
  return ok({ orders });
}

export async function POST(req: Request) {
  const rl = rateLimitMiddleware(req, 'orders');
  if (!rl.allowed) return rl.response;

  const body = await req.json().catch(() => ({}));
  const items = body.items || [];
  if (!Array.isArray(items) || items.length === 0) return err('Cart is empty');

  const user = getCurrentUser(req);
  let customerId: number | null = null;
  if (user && hasPermission(user.role, 'view_orders')) {
    // Authorized operations staff need the shared order queue, not their own purchases.
  } else if (user) {
    const cust = db.prepare('SELECT id FROM customers WHERE id=? OR user_id=? OR email=?').get(user.id, user.id, user.email) as any;
    customerId = cust?.id ?? null;
  }

  try {
    const created = createOrder({ items, body, customerId, generateOrderNumber });
    logAudit(user, 'ORDER_CREATE', 'Order', created.orderNumber, `Total ${created.total}`);
    return ok(created);
  } catch (e: any) {
    if (e instanceof OrderInputError) return err(e.message, 400);
    logError('order_creation_failed', e?.message || e);
    return err('Failed to create order. Please try again.', 500);
  }
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = getCurrentUser(req);
  if (!user || !hasPermission(user.role, 'update_order_status')) return err('Unauthorized to modify order', 403);
  if (body.action !== 'status') return err('Unknown action');
  const order = db.prepare('SELECT id FROM orders WHERE order_number=?').get(body.orderNumber) as { id:number } | undefined;
  if (!order) return err('Order not found',404);
  try {
    const result = changeOrderStatus(user,order.id,body.status,body.note);
    return result.ok ? ok(result) : err(result.error || 'Status update failed',result.httpStatus || 400);
  } catch (error) {
    logError('order_status_failed',error instanceof Error ? error.message : String(error));
    return err('Could not update order',500);
  }
}
