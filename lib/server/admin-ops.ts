import { logAudit, slugify, jsonParseSafe } from './api';
import { db } from './db';
import { hashPassword } from './auth';

// ============================================================================
// Phase 2 Admin Operations
//
// One cohesive server module with CRUD for every admin domain. Each function
// receives the authenticated admin `user`. All writes are transactional and
// audited. No destructive action removes real customer/business data unless
// called explicitly via the confirmed delete path.
// ============================================================================

type User = any;
type Row = Record<string, any>;

function all<Row = any>(sql: string, ...args: any[]): Row[] {
  return db.prepare(sql).all(...args) as any;
}
function one<Row = any>(sql: string, ...args: any[]): Row | undefined {
  return db.prepare(sql).get(...args) as any;
}
function run(sql: string, ...args: any[]): { changes: number; lastInsertRowid: number | bigint } {
  return db.prepare(sql).run(...args) as any;
}
function tx(fn: () => void) { db.transaction(fn)(); }
function audit(user: User, action: string, type?: string, id?: string, details?: string) {
  logAudit(user, action, type, id, details);
}
function count(sql: string, ...args: any[]): number {
  return (one(sql, ...args) as any)?.c ?? 0;
}
function getOne<Row = any>(table: string, id: number): Row | undefined {
  return one<Row>(`SELECT * FROM ${table} WHERE id=?`, id);
}

// ---------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------
export const ORDER_STATUSES = [
  'Order Placed', 'Payment Confirmed', 'Accepted', 'In Preparation', 'Baking',
  'Decorating', 'Quality Check', 'Packed', 'Ready for Dispatch', 'Dispatched',
  'Out for Delivery', 'Delivered', 'Cancelled',
];

export const PAYMENT_STATUSES = ['Pending', 'Paid', 'Refunded', 'Partially Refunded', 'Failed', 'Cancelled'];

export function listOrders(user: User, opts: { status?: string; search?: string; payment?: string; limit?: number; page?: number }) {
  const { status, search, payment } = opts;
  const limit = Math.min(Number(opts.limit) || 50, 500);
  const page = Math.max(Number(opts.page) || 1, 1);
  const offset = (page - 1) * limit;
  const where: string[] = [];
  const params: any[] = [];
  if (status) { where.push('o.status=?'); params.push(status); }
  if (payment) { where.push('o.payment_status=?'); params.push(payment); }
  if (search) { const q = `%${search}%`; where.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.customer_email LIKE ?)'); params.push(q, q, q, q); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = count(`SELECT COUNT(*) c FROM orders o ${w}`, ...params);
  const rows = all<Row>(`SELECT o.* FROM orders o ${w} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`, ...params, limit, offset);
  for (const o of rows) {
    o.items = jsonParseSafe(o.items, []);
    o.addons = jsonParseSafe(o.addons, []);
    o.timeline = jsonParseSafe(o.timeline, []);
  }
  audit(user, 'ORDERS_LIST', 'Orders');
  return { orders: rows, total, page, pages: Math.ceil(total / limit), limit };
}

export function getOrder(user: User, id: number) {
  const order = one<Row>('SELECT * FROM orders WHERE id=?', id);
  if (!order) return null;
  order.items = jsonParseSafe(order.items, []);
  order.addons = jsonParseSafe(order.addons, []);
  order.timeline = jsonParseSafe(order.timeline, []);
  order.statusHistory = all('SELECT * FROM order_status_history WHERE order_id=? ORDER BY id', id);
  order.notes = all('SELECT * FROM order_notes WHERE order_id=? ORDER BY id DESC', id);
  order.payments = all('SELECT * FROM payments WHERE order_id=? ORDER BY id DESC', id);
  order.refunds = all('SELECT * FROM order_refunds WHERE order_id=? ORDER BY id DESC', id);
  order.customer = order.customer_id ? one('SELECT * FROM customers WHERE id=?', order.customer_id) : null;
  order.customRequest = order.custom_request_id ? one('SELECT * FROM custom_requests WHERE id=?', order.custom_request_id) : null;
  audit(user, 'ORDER_VIEW', 'Order', String(id));
  return order;
}

export function updateOrderStatus(user: User, id: number, status: string, note?: string) {
  const order = one<Row>('SELECT * FROM orders WHERE id=?', id);
  if (!order) return { ok: false, error: 'Order not found' };
  if (!ORDER_STATUSES.includes(status)) return { ok: false, error: `Invalid status: ${status}` };
  const now = new Date().toISOString();
  tx(() => {
    run('UPDATE orders SET status=?, updated_at=? WHERE id=?', status, now, id);
    run('INSERT INTO order_status_history (order_id, status, note, user_id) VALUES (?,?,?,?)', id, status, note || null, user?.id ?? null);
    run('INSERT INTO order_notes (order_id, author_id, author_name, body, is_internal) VALUES (?,?,?,?,?)', id, user?.id ?? null, user?.name ?? 'admin', `Status → ${status}`, 1);
    run('INSERT INTO notifications (type, title, message) VALUES (?,?,?)', 'order', `Order ${order.order_number} status`, `Order status changed to ${status}`);
  });
  audit(user, 'ORDER_STATUS_UPDATE', 'Order', String(id), `→ ${status}`);
  return { ok: true, status };
}

export function updateOrderPayment(user: User, id: number, paymentStatus: string, method?: string, transactionId?: string, amount?: number) {
  const order = one<Row>('SELECT * FROM orders WHERE id=?', id);
  if (!order) return { ok: false, error: 'Order not found' };
  if (!PAYMENT_STATUSES.includes(paymentStatus)) return { ok: false, error: `Invalid payment status: ${paymentStatus}` };
  tx(() => {
    run("UPDATE orders SET payment_status=?, payment_method=COALESCE(?,payment_method), transaction_id=COALESCE(?,transaction_id), updated_at=datetime('now') WHERE id=?", paymentStatus, method || null, transactionId || null, id);
    run('INSERT INTO payments (order_id, amount, method, status, transaction_id, gateway) VALUES (?,?,?,?,?,?)', id, amount ?? order.total, method || order.payment_method || null, paymentStatus, transactionId || null, 'manual');
    run('INSERT INTO order_notes (order_id, author_id, author_name, body, is_internal) VALUES (?,?,?,?,?)', id, user?.id ?? null, user?.name ?? 'admin', `Payment status → ${paymentStatus}${transactionId ? ` (txn ${transactionId})` : ''}`, 0);
  });
  audit(user, 'ORDER_PAYMENT_UPDATE', 'Order', String(id), `→ ${paymentStatus}`);
  return { ok: true };
}

export function addOrderNote(user: User, id: number, body: string, isInternal = false) {
  if (!body?.trim()) return { ok: false, error: 'Note is required' };
  const order = one<Row>('SELECT order_number FROM orders WHERE id=?', id);
  if (!order) return { ok: false, error: 'Order not found' };
  const r = run('INSERT INTO order_notes (order_id, author_id, author_name, body, is_internal) VALUES (?,?,?,?,?)', id, user?.id ?? null, user?.name ?? 'admin', body.trim(), isInternal ? 1 : 0);
  audit(user, 'ORDER_NOTE_ADD', 'Order', String(id), isInternal ? 'internal note' : 'note');
  return { ok: true, id: Number(r.lastInsertRowid) };
}

export function updateOrderDetails(user: User, id: number, fields: Partial<Row>) {
  const allowed = ['priority', 'tracking_note', 'internal_notes', 'delivery_fee', 'delivery_slot', 'delivery_date'];
  const sets: string[] = [];
  const params: any[] = [];
  for (const k of allowed) {
    if (fields[k] !== undefined) { sets.push(`${k}=?`); params.push(fields[k]); }
  }
  if (!sets.length) return { ok: false, error: 'No fields to update' };
  params.push(id);
  run(`UPDATE orders SET ${sets.join(', ')}, updated_at=datetime('now') WHERE id=?`, ...params);
  audit(user, 'ORDER_UPDATE', 'Order', String(id), sets.join(', '));
  return { ok: true };
}

export function createRefund(user: User, orderId: number, amount: number, reason?: string) {
  const order = one<Row>('SELECT * FROM orders WHERE id=?', orderId);
  if (!order) return { ok: false, error: 'Order not found' };
  const refunded = one<{ v: number }>("SELECT COALESCE(SUM(amount),0) v FROM order_refunds WHERE order_id=? AND status IN ('pending','completed')", orderId)?.v ?? 0;
  const totalRefunded = Number(refunded) + Number(amount);
  if (totalRefunded > order.total) return { ok: false, error: 'Refund amount exceeds order total' };
  const status = totalRefunded >= order.total ? 'Refunded' : 'Partially Refunded';
  tx(() => {
    run("INSERT INTO order_refunds (order_id, amount, reason, status, method) VALUES (?,?,?,?,?)", orderId, amount, reason || null, 'pending', 'original');
    run("UPDATE orders SET payment_status=?, updated_at=datetime('now') WHERE id=?", status, orderId);
  });
  audit(user, 'ORDER_REFUND_CREATE', 'Order', String(orderId), `₹${amount}`);
  return { ok: true, payment_status: status };
}

export function updateRefundStatus(user: User, refundId: number, status: string) {
  run('UPDATE order_refunds SET status=? WHERE id=?', status, refundId);
  const ref = one<Row>('SELECT order_id FROM order_refunds WHERE id=?', refundId);
  if (ref) {
    const total = one<Row>('SELECT total FROM orders WHERE id=?', ref.order_id)?.total ?? 0;
    const refunded = one<{ v: number }>("SELECT COALESCE(SUM(amount),0) v FROM order_refunds WHERE order_id=? AND status='completed'", ref.order_id)?.v ?? 0;
    const payStatus = Number(refunded) >= total ? 'Refunded' : Number(refunded) > 0 ? 'Partially Refunded' : 'Paid';
    run('UPDATE orders SET payment_status=? WHERE id=?', payStatus, ref.order_id);
  }
  audit(user, 'ORDER_REFUND_STATUS', 'OrderRefund', String(refundId), `→ ${status}`);
  return { ok: true };
}

export function cancelOrder(user: User, id: number, reason?: string) {
  const order = one<Row>('SELECT * FROM orders WHERE id=?', id);
  if (!order) return { ok: false, error: 'Order not found' };
  tx(() => {
    run("UPDATE orders SET status=?, payment_status=CASE WHEN payment_status='Paid' THEN 'Refunded' ELSE payment_status END, updated_at=datetime('now') WHERE id=?", 'Cancelled', id);
    run('INSERT INTO order_status_history (order_id, status, note, user_id) VALUES (?,?,?,?)', id, 'Cancelled', reason || null, user?.id ?? null);
    run('INSERT INTO order_notes (order_id, author_id, author_name, body, is_internal) VALUES (?,?,?,?,?)', id, user?.id ?? null, user?.name ?? 'admin', `Order cancelled. ${reason || ''}`.trim(), 1);
    for (const it of jsonParseSafe(order.items, [])) {
      run('UPDATE products SET stock = stock + ? WHERE id = ?', Number(it.qty) || 0, it.productId);
    }
  });
  audit(user, 'ORDER_CANCEL', 'Order', String(id), reason || undefined);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// CUSTOMERS
// ---------------------------------------------------------------------------
export function listCustomers(user: User, opts: { search?: string; limit?: number; page?: number }) {
  const limit = Math.min(Number(opts.limit) || 50, 500);
  const page = Math.max(Number(opts.page) || 1, 1);
  const offset = (page - 1) * limit;
  const params: any[] = [];
  let w = '';
  if (opts.search) { const q = `%${opts.search}%`; w = 'WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?'; params.push(q, q, q); }
  const total = count(`SELECT COUNT(*) c FROM customers ${w}`, ...params);
  const rows = all<Row>(`SELECT * FROM customers ${w} ORDER BY id DESC LIMIT ? OFFSET ?`, ...params, limit, offset);
  const ids = rows.map((c) => c.id);
  const spendMap: Record<number, { spend: number; count: number }> = {};
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const agg = all<{ customer_id: number; c: number; s: number }>(`SELECT customer_id, COUNT(*) c, COALESCE(SUM(total),0) s FROM orders WHERE customer_id IN (${placeholders}) GROUP BY customer_id`, ...ids);
    for (const a of agg) spendMap[a.customer_id] = { spend: a.s, count: a.c };
  }
  for (const c of rows as any[]) {
    const a = spendMap[c.id] || { spend: c.total_spend || 0, count: c.order_count || 0 };
    c.total_spend = a.spend;
    c.order_count = a.count;
    c.lastOrder = one<Row>('SELECT order_number, created_at, total FROM orders WHERE customer_id=? ORDER BY created_at DESC LIMIT 1', c.id) || null;
  }
  return { customers: rows, total, page, pages: Math.ceil(total / limit) };
}

export function getCustomer(user: User, id: number) {
  const c = one<Row>('SELECT * FROM customers WHERE id=?', id);
  if (!c) return null;
  c.orders = all<Row>('SELECT * FROM orders WHERE customer_id=? ORDER BY created_at DESC LIMIT 50', id);
  c.addresses = all<Row>('SELECT * FROM addresses WHERE customer_id=? ORDER BY is_default DESC', id);
  c.reviews = all<Row>('SELECT * FROM product_reviews WHERE customer_id=? ORDER BY id DESC', id);
  c.loyalty = one<Row>('SELECT * FROM loyalty_points WHERE customer_id=?', id) || null;
  for (const o of c.orders) { o.items = jsonParseSafe(o.items, []); o.timeline = jsonParseSafe(o.timeline, []); }
  return c;
}

export function updateCustomer(user: User, id: number, fields: Partial<Row>) {
  const allowed = ['name', 'email', 'phone', 'group_name', 'notes'];
  const sets: string[] = [];
  const params: any[] = [];
  for (const k of allowed) {
    if (fields[k] !== undefined) { sets.push(`${k}=?`); params.push(fields[k]); }
  }
  if (!sets.length) return { ok: false, error: 'No fields to update' };
  sets.push("updated_at=datetime('now')");
  params.push(id);
  run(`UPDATE customers SET ${sets.join(', ')} WHERE id=?`, ...params);
  audit(user, 'CUSTOMER_UPDATE', 'Customer', String(id));
  return { ok: true };
}

export function createCustomer(user: User, data: any) {
  if (!data.name) return { ok: false, error: 'Name is required' };
  const r = run('INSERT INTO customers (name, email, phone, group_name, notes) VALUES (?,?,?,?,?)',
    data.name, data.email || null, data.phone || null, data.group_name || 'New Customer', data.notes || null);
  audit(user, 'CUSTOMER_CREATE', 'Customer', String(r.lastInsertRowid));
  return { ok: true, id: Number(r.lastInsertRowid) };
}

// ---------------------------------------------------------------------------
// DELIVERY
// ---------------------------------------------------------------------------
export function listDelivery(user: User) {
  return {
    slots: all('SELECT * FROM delivery_slots ORDER BY start_time'),
    zones: all('SELECT * FROM delivery_zones ORDER BY name'),
    zonesCount: count('SELECT COUNT(*) c FROM delivery_zones'),
    pincodes: all('SELECT * FROM pincodes ORDER BY pincode'),
    blackout: all('SELECT * FROM blackout_dates ORDER BY date'),
    buffers: all('SELECT * FROM buffer_settings ORDER BY id'),
    production: all('SELECT * FROM production_capacity ORDER BY date'),
    capacity: all('SELECT * FROM slot_capacity ORDER BY date DESC, id DESC LIMIT 500'),
  };
}

export function getSlots(user: User) {
  return all('SELECT * FROM delivery_slots ORDER BY start_time');
}

export function saveSlot(user: User, data: any) {
  const days = JSON.stringify(data.days && data.days.length ? data.days : [0, 1, 2, 3, 4, 5, 6]);
  if (data.id) {
    run('UPDATE delivery_slots SET name=?, start_time=?, end_time=?, capacity=?, fee=?, available=?, days=? WHERE id=?',
      data.name, data.start_time, data.end_time, data.capacity, data.fee || 0, data.available ? 1 : 0, days, data.id);
  } else {
    run('INSERT INTO delivery_slots (name, start_time, end_time, capacity, fee, available, days) VALUES (?,?,?,?,?,?,?)',
      data.name, data.start_time, data.end_time, data.capacity, data.fee || 0, data.available ? 1 : 0, days);
  }
  audit(user, 'DELIVERY_SLOT_SAVE', 'DeliverySlot', data.id ? String(data.id) : undefined);
  return { ok: true };
}

export function deleteSlot(user: User, id: number) {
  const inUse = count('SELECT COUNT(*) c FROM orders WHERE delivery_slot_id=?', id);
  if (inUse > 0) return { ok: false, error: `Slot is used by ${inUse} orders; adjust those orders first.` };
  run('DELETE FROM delivery_slots WHERE id=?', id);
  run('DELETE FROM slot_capacity WHERE slot_id=?', id);
  audit(user, 'DELIVERY_SLOT_DELETE', 'DeliverySlot', String(id));
  return { ok: true };
}

export function saveZone(user: User, data: any) {
  if (data.id) {
    run('UPDATE delivery_zones SET name=?, city=?, fee=?, free_delivery_threshold=?, est_delivery_time=?, active=? WHERE id=?',
      data.name, data.city || null, data.fee || 0, data.free_delivery_threshold ?? null, data.est_delivery_time || null, data.active ? 1 : 0, data.id);
  } else {
    run('INSERT INTO delivery_zones (name, city, fee, free_delivery_threshold, est_delivery_time, active) VALUES (?,?,?,?,?,?)',
      data.name, data.city || null, data.fee || 0, data.free_delivery_threshold ?? null, data.est_delivery_time || null, data.active ? 1 : 0);
  }
  audit(user, 'DELIVERY_ZONE_SAVE', 'DeliveryZone', data.id ? String(data.id) : undefined);
  return { ok: true };
}

export function deleteZone(user: User, id: number) {
  run('DELETE FROM delivery_zones WHERE id=?', id);
  run('UPDATE pincodes SET zone_id=NULL WHERE zone_id=?', id);
  audit(user, 'DELIVERY_ZONE_DELETE', 'DeliveryZone', String(id));
  return { ok: true };
}

export function savePincode(user: User, data: any) {
  run("INSERT INTO pincodes (zone_id, pincode, available) VALUES (?,?,?) ON CONFLICT(pincode) DO UPDATE SET zone_id=excluded.zone_id, available=excluded.available",
    data.zone_id || null, data.pincode, data.available ? 1 : 0);
  audit(user, 'PINCODE_SAVE', 'Pincode', data.pincode);
  return { ok: true };
}

export function deletePincode(user: User, id: number) {
  run('DELETE FROM pincodes WHERE id=?', id);
  audit(user, 'PINCODE_DELETE', 'Pincode', String(id));
  return { ok: true };
}

export function saveBlackout(user: User, data: any) {
  run("INSERT INTO blackout_dates (date, reason, type) VALUES (?,?,?) ON CONFLICT(date) DO UPDATE SET reason=excluded.reason, type=excluded.type",
    data.date, data.reason || null, data.type || 'blackout');
  audit(user, 'BLACKOUT_SAVE', 'Blackout', data.date);
  return { ok: true };
}

export function deleteBlackout(user: User, id: number) {
  run('DELETE FROM blackout_dates WHERE id=?', id);
  audit(user, 'BLACKOUT_DELETE', 'Blackout', String(id));
  return { ok: true };
}

export function saveBuffer(user: User, data: any) {
  run("INSERT INTO buffer_settings (key, label, value, unit) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET label=excluded.label, value=excluded.value, unit=excluded.unit",
    data.key, data.label || data.key, Number(data.value) || 0, data.unit || 'minutes');
  audit(user, 'BUFFER_SAVE', 'Buffer', data.key);
  return { ok: true };
}

export function saveProductionCapacity(user: User, data: any) {
  run("INSERT INTO production_capacity (date, daily_order_capacity, daily_cake_capacity, daily_custom_capacity) VALUES (?,?,?,?) ON CONFLICT(date) DO UPDATE SET daily_order_capacity=excluded.daily_order_capacity, daily_cake_capacity=excluded.daily_cake_capacity, daily_custom_capacity=excluded.daily_custom_capacity",
    data.date, data.daily_order_capacity ?? 100, data.daily_cake_capacity ?? 20, data.daily_custom_capacity ?? 10);
  audit(user, 'PRODUCTION_CAPACITY_SAVE', 'ProductionCapacity', data.date);
  return { ok: true };
}

export function setSlotCapacity(user: User, data: any) {
  run("INSERT INTO slot_capacity (slot_id, date, capacity, books, closed) VALUES (?,?,?,COALESCE((SELECT books FROM slot_capacity WHERE slot_id=? AND date=?),0),?) ON CONFLICT(slot_id,date) DO UPDATE SET capacity=excluded.capacity, closed=excluded.closed",
    data.slot_id, data.date, data.capacity, data.slot_id, data.date, data.closed ? 1 : 0);
  audit(user, 'SLOT_CAPACITY_SAVE', 'SlotCapacity', `${data.slot_id}:${data.date}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// PAYMENTS / SETTINGS (configurable credentials, stored in DB settings)
// ---------------------------------------------------------------------------
export function getPaymentConfig(user: User) {
  const rows = all<Row>("SELECT key, value FROM settings WHERE key LIKE 'payment_%'");
  const cfg: Record<string, string> = {};
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

export function savePaymentConfig(user: User, cfg: Record<string, string>) {
  tx(() => {
    for (const [k, v] of Object.entries(cfg)) {
      if (!k.startsWith('payment_')) continue;
      if (k.includes('secret') && v.startsWith('••••')) continue;
      run("INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", k, String(v));
    }
  });
  audit(user, 'PAYMENT_CONFIG_UPDATE', 'Payment');
  return { ok: true };
}

export function listRefunds(user: User, status?: string) {
  if (status) return all('SELECT * FROM order_refunds WHERE status=? ORDER BY id DESC', status);
  return all('SELECT * FROM order_refunds ORDER BY id DESC LIMIT 300');
}

export function listPaymentsLedger(user: User) {
  return all('SELECT * FROM payments ORDER BY id DESC LIMIT 400');
}

// ---------------------------------------------------------------------------
// COUPONS / GIFT CARDS
// ---------------------------------------------------------------------------
export function listCoupons(user: User) {
  const rows = all<Row>('SELECT * FROM coupons ORDER BY id DESC');
  for (const c of rows) {
    c.product_ids = jsonParseSafe(c.product_ids, []);
    c.category_ids = jsonParseSafe(c.category_ids, []);
    c.customer_ids = jsonParseSafe(c.customer_ids, []);
  }
  return rows;
}

export function saveCoupon(user: User, data: any) {
  const code = (data.code || '').toUpperCase().trim();
  if (!code) return { ok: false, error: 'Coupon code is required' };
  const obj = {
    code,
    discount_type: data.discount_type || 'percent',
    discount_value: Number(data.discount_value) || 0,
    min_order: Number(data.min_order) || 0,
    max_discount: data.max_discount != null && data.max_discount !== '' ? Number(data.max_discount) : null,
    max_uses: data.max_uses != null && data.max_uses !== '' ? Number(data.max_uses) : null,
    active: data.active ? 1 : 0,
    description: data.description || null,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    product_ids: JSON.stringify(data.product_ids || []),
    category_ids: JSON.stringify(data.category_ids || []),
    customer_ids: JSON.stringify(data.customer_ids || []),
  };
  if (data.id) {
    const dup = one('SELECT id FROM coupons WHERE code=? AND id!=?', code, data.id);
    if (dup) return { ok: false, error: 'A coupon with that code already exists' };
    run('UPDATE coupons SET code=?, discount_type=?, discount_value=?, min_order=?, max_discount=?, max_uses=?, active=?, description=?, starts_at=?, ends_at=?, product_ids=?, category_ids=?, customer_ids=? WHERE id=?',
      obj.code, obj.discount_type, obj.discount_value, obj.min_order, obj.max_discount, obj.max_uses, obj.active, obj.description, obj.starts_at, obj.ends_at, obj.product_ids, obj.category_ids, obj.customer_ids, data.id);
  } else {
    try {
      const r = run('INSERT INTO coupons (code, discount_type, discount_value, min_order, max_discount, max_uses, active, description, starts_at, ends_at, product_ids, category_ids, customer_ids) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        obj.code, obj.discount_type, obj.discount_value, obj.min_order, obj.max_discount, obj.max_uses, obj.active, obj.description, obj.starts_at, obj.ends_at, obj.product_ids, obj.category_ids, obj.customer_ids);
      data.id = Number(r.lastInsertRowid);
    } catch (e: any) {
      return { ok: false, error: /unique/i.test(e?.message || '') ? 'A coupon with that code already exists' : e?.message || 'Error' };
    }
  }
  audit(user, 'COUPON_SAVE', 'Coupon', code);
  return { ok: true, id: data.id };
}

export function deleteCoupon(user: User, id: number) {
  run('DELETE FROM coupons WHERE id=?', id);
  audit(user, 'COUPON_DELETE', 'Coupon', String(id));
  return { ok: true };
}

export function listGiftCards(user: User) {
  return all('SELECT * FROM gift_cards ORDER BY id DESC');
}

export function saveGiftCard(user: User, data: any) {
  const code = (data.code || '').toUpperCase().trim() || 'GIFT-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const amount = Number(data.amount) || 0;
  if (amount <= 0) return { ok: false, error: 'Amount must be greater than 0' };
  if (data.id) {
    run('UPDATE gift_cards SET amount=?, balance=?, recipient_name=?, recipient_email=?, message=?, delivery_date=?, expires_at=?, active=? WHERE id=?',
      amount, Number(data.balance) ?? amount, data.recipient_name || null, data.recipient_email || null, data.message || null, data.delivery_date || null, data.expires_at || null, data.active ? 1 : 0, data.id);
  } else {
    try {
      run('INSERT INTO gift_cards (code, amount, balance, recipient_name, recipient_email, message, delivery_date, expires_at, active) VALUES (?,?,?,?,?,?,?,?,?)',
        code, amount, amount, data.recipient_name || null, data.recipient_email || null, data.message || null, data.delivery_date || null, data.expires_at || null, data.active ? 1 : 0);
    } catch { return { ok: false, error: 'Gift card code already exists' }; }
  }
  audit(user, 'GIFT_CARD_SAVE', 'GiftCard', code);
  return { ok: true };
}

export function deleteGiftCard(user: User, id: number) {
  run('DELETE FROM gift_cards WHERE id=?', id);
  audit(user, 'GIFT_CARD_DELETE', 'GiftCard', String(id));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// REVIEWS
// ---------------------------------------------------------------------------
export function listReviews(user: User, opts: { status?: string; productId?: number }) {
  let sql = 'SELECT r.*, p.name AS product_name, p.slug AS product_slug FROM product_reviews r LEFT JOIN products p ON r.product_id=p.id';
  const w: string[] = [];
  const params: any[] = [];
  if (opts.status) { w.push('r.status=?'); params.push(opts.status); }
  if (opts.productId) { w.push('r.product_id=?'); params.push(opts.productId); }
  if (w.length) sql += ' WHERE ' + w.join(' AND ');
  sql += ' ORDER BY r.id DESC LIMIT 400';
  return all(sql, ...params);
}

export function moderateReview(user: User, id: number, status: string) {
  if (!['approved', 'pending', 'spam', 'trash'].includes(status)) return { ok: false, error: 'Invalid status' };
  run('UPDATE product_reviews SET status=? WHERE id=?', status, id);
  audit(user, 'REVIEW_MODERATE', 'Review', String(id), `→ ${status}`);
  return { ok: true };
}

export function deleteReview(user: User, id: number) {
  run('DELETE FROM product_reviews WHERE id=?', id);
  audit(user, 'REVIEW_DELETE', 'Review', String(id));
  return { ok: true };
}

export function saveReview(user: User, data: any) {
  if (data.id) {
    run('UPDATE product_reviews SET rating=?, comment=?, status=?, verified=? WHERE id=?',
      data.rating ?? 5, data.comment || null, data.status || 'approved', data.verified ? 1 : 0, data.id);
  } else {
    run('INSERT INTO product_reviews (product_id, customer_name, rating, comment, status, verified) VALUES (?,?,?,?,?,?)',
      data.product_id, data.customer_name, data.rating ?? 5, data.comment || null, data.status || 'pending', data.verified ? 1 : 0);
  }
  audit(user, 'REVIEW_SAVE', 'Review', data.id ? String(data.id) : undefined);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// CUSTOM REQUESTS (quotation + approval workflow)
// ---------------------------------------------------------------------------
export function listCustomRequests(user: User, status?: string) {
  if (status) return all('SELECT * FROM custom_requests WHERE status=? ORDER BY created_at DESC LIMIT 400', status);
  return all('SELECT * FROM custom_requests ORDER BY created_at DESC LIMIT 400');
}

export function quoteCustomRequest(user: User, id: number, quotePrice: number, quoteNotes?: string, status?: string) {
  const price = Number(quotePrice);
  if (isNaN(price) || price < 0) return { ok: false, error: 'Invalid quote price' };
  const newStatus = status || (price > 0 ? 'Approved' : 'Reviewing');
  run("UPDATE custom_requests SET quote_price=?, quote_notes=?, status=?, updated_at=datetime('now') WHERE id=?", price, quoteNotes || null, newStatus, id);
  audit(user, 'CUSTOM_QUOTE', 'CustomRequest', String(id), `₹${price}`);
  return { ok: true };
}

export function setCustomRequestStatus(user: User, id: number, status: string) {
  run("UPDATE custom_requests SET status=?, updated_at=datetime('now') WHERE id=?", status, id);
  audit(user, 'CUSTOM_STATUS', 'CustomRequest', String(id), `→ ${status}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// MARKETING  (banners / slides / navigation / homepage sections / static blocks)
// ---------------------------------------------------------------------------
export function listHomepageConfig(user: User) {
  return {
    sections: all('SELECT * FROM homepage_sections ORDER BY sort_order'),
    banners: all('SELECT * FROM banners ORDER BY sort_order'),
    slides: all('SELECT * FROM slides ORDER BY sort_order'),
    nav: all("SELECT * FROM navigations WHERE menu_name='main' ORDER BY sort_order"),
    blocks: all('SELECT * FROM static_blocks ORDER BY id'),
  };
}

export function saveHomepageSection(user: User, data: any) {
  if (!data.key) return { ok: false, error: 'Section key is required' };
  run("INSERT INTO homepage_sections (key, title, heading, description, cta_text, cta_link, image, enabled, sort_order) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET title=excluded.title, heading=excluded.heading, description=excluded.description, cta_text=excluded.cta_text, cta_link=excluded.cta_link, image=excluded.image, enabled=excluded.enabled, sort_order=excluded.sort_order",
    data.key, data.title || null, data.heading || null, data.description || null, data.cta_text || null, data.cta_link || null, data.image || null, data.enabled ? 1 : 0, data.sort_order || 0);
  audit(user, 'HOMEPAGE_SAVE', 'HomepageSection', data.key);
  return { ok: true };
}

export function saveBanner(user: User, data: any) {
  if (data.id) {
    run('UPDATE banners SET title=?, subtitle=?, image=?, cta_text=?, cta_link=?, starts_at=?, ends_at=?, sort_order=?, active=? WHERE id=?',
      data.title || null, data.subtitle || null, data.image || null, data.cta_text || null, data.cta_link || null, data.starts_at || null, data.ends_at || null, data.sort_order || 0, data.active ? 1 : 0, data.id);
  } else {
    run('INSERT INTO banners (title, subtitle, image, cta_text, cta_link, starts_at, ends_at, sort_order, active) VALUES (?,?,?,?,?,?,?,?,?)',
      data.title || null, data.subtitle || null, data.image || null, data.cta_text || null, data.cta_link || null, data.starts_at || null, data.ends_at || null, data.sort_order || 0, data.active ? 1 : 0);
  }
  audit(user, 'BANNER_SAVE', 'Banner', data.id ? String(data.id) : undefined);
  return { ok: true };
}

export function deleteBanner(user: User, id: number) {
  run('DELETE FROM banners WHERE id=?', id);
  audit(user, 'BANNER_DELETE', 'Banner', String(id));
  return { ok: true };
}

export function saveSlide(user: User, data: any) {
  if (data.id) {
    run('UPDATE slides SET title=?, description=?, image=?, cta_text=?, cta_link=?, sort_order=?, active=? WHERE id=?',
      data.title || null, data.description || null, data.image || null, data.cta_text || null, data.cta_link || null, data.sort_order || 0, data.active ? 1 : 0, data.id);
  } else {
    run('INSERT INTO slides (title, description, image, cta_text, cta_link, sort_order, active) VALUES (?,?,?,?,?,?,?)',
      data.title || null, data.description || null, data.image || null, data.cta_text || null, data.cta_link || null, data.sort_order || 0, data.active ? 1 : 0);
  }
  audit(user, 'SLIDE_SAVE', 'Slide', data.id ? String(data.id) : undefined);
  return { ok: true };
}

export function deleteSlide(user: User, id: number) {
  run('DELETE FROM slides WHERE id=?', id);
  audit(user, 'SLIDE_DELETE', 'Slide', String(id));
  return { ok: true };
}

export function saveNav(user: User, data: any) {
  if (data.id) {
    run('UPDATE navigations SET label=?, type=?, url=?, target=?, parent_id=?, sort_order=?, active=? WHERE id=?',
      data.label, data.type || 'link', data.url || null, data.target || null, data.parent_id || null, data.sort_order || 0, data.active ? 1 : 0, data.id);
  } else {
    run("INSERT INTO navigations (label, type, url, target, parent_id, sort_order, menu_name, active) VALUES (?,?,?,?,?,?,?,?)",
      data.label, data.type || 'link', data.url || null, data.target || null, data.parent_id || null, data.sort_order || 0, 'main', data.active ? 1 : 0);
  }
  audit(user, 'NAV_SAVE', 'Navigation', data.label);
  return { ok: true };
}

export function deleteNav(user: User, id: number) {
  run('DELETE FROM navigations WHERE id=?', id);
  audit(user, 'NAV_DELETE', 'Navigation', String(id));
  return { ok: true };
}

export function saveStaticBlock(user: User, data: any) {
  run("INSERT INTO static_blocks (key, title, content, image, active) VALUES (?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET title=excluded.title, content=excluded.content, image=excluded.image, active=excluded.active",
    data.key, data.title || data.key, data.content || '', data.image || null, data.active ? 1 : 0);
  audit(user, 'STATIC_BLOCK_SAVE', 'StaticBlock', data.key);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// CMS  (pages / testimonials / faqs / email templates / blog)
// ---------------------------------------------------------------------------
export function listPages(user: User) {
  return all('SELECT * FROM pages ORDER BY updated_at DESC');
}

export function savePage(user: User, data: any) {
  if (data.id) {
    const dup = one('SELECT id FROM pages WHERE slug=? AND id!=?', data.slug, data.id);
    if (dup) return { ok: false, error: 'A page with that slug already exists' };
    run("UPDATE pages SET title=?, slug=?, content=?, published=?, seo_title=?, seo_description=?, updated_at=datetime('now') WHERE id=?",
      data.title, data.slug, data.content || '', data.published ? 1 : 0, data.seo_title || null, data.seo_description || null, data.id);
  } else {
    try {
      run('INSERT INTO pages (title, slug, content, published, seo_title, seo_description) VALUES (?,?,?,?,?,?)',
        data.title, data.slug, data.content || '', data.published ? 1 : 0, data.seo_title || null, data.seo_description || null);
    } catch (e: any) { return { ok: false, error: /unique/i.test(e?.message || '') ? 'A page with that slug already exists' : e?.message || 'Error' }; }
  }
  audit(user, 'PAGE_SAVE', 'Page', data.slug);
  return { ok: true };
}

export function deletePage(user: User, id: number) {
  run('DELETE FROM pages WHERE id=?', id);
  audit(user, 'PAGE_DELETE', 'Page', String(id));
  return { ok: true };
}

export function listTestimonials(user: User) {
  return all('SELECT * FROM testimonials ORDER BY id DESC');
}

export function saveTestimonial(user: User, data: any) {
  if (data.id) {
    run('UPDATE testimonials SET customer_name=?, content=?, rating=?, status=?, photo=? WHERE id=?',
      data.customer_name, data.content || null, data.rating || 5, data.status || 'approved', data.photo || null, data.id);
  } else {
    run('INSERT INTO testimonials (customer_name, content, rating, status, photo) VALUES (?,?,?,?,?)',
      data.customer_name, data.content || null, data.rating || 5, data.status || 'approved', data.photo || null);
  }
  audit(user, 'TESTIMONIAL_SAVE', 'Testimonial', data.id ? String(data.id) : undefined);
  return { ok: true };
}

export function moderateTestimonial(user: User, id: number, status: string) {
  run('UPDATE testimonials SET status=? WHERE id=?', status, id);
  audit(user, 'TESTIMONIAL_MODERATE', 'Testimonial', String(id), `→ ${status}`);
  return { ok: true };
}

export function deleteTestimonial(user: User, id: number) {
  run('DELETE FROM testimonials WHERE id=?', id);
  audit(user, 'TESTIMONIAL_DELETE', 'Testimonial', String(id));
  return { ok: true };
}

export function listFaqs(user: User) {
  return all('SELECT * FROM faqs ORDER BY sort_order, id');
}

export function saveFaq(user: User, data: any) {
  if (data.id) {
    run('UPDATE faqs SET question=?, answer=?, category=?, sort_order=?, published=? WHERE id=?',
      data.question, data.answer, data.category || null, data.sort_order || 0, data.published ? 1 : 0, data.id);
  } else {
    run('INSERT INTO faqs (question, answer, category, sort_order, published) VALUES (?,?,?,?,?)',
      data.question, data.answer, data.category || null, data.sort_order || 0, data.published ? 1 : 0);
  }
  audit(user, 'FAQ_SAVE', 'Faq', data.question);
  return { ok: true };
}

export function deleteFaq(user: User, id: number) {
  run('DELETE FROM faqs WHERE id=?', id);
  audit(user, 'FAQ_DELETE', 'Faq', String(id));
  return { ok: true };
}

export function listEmailTemplates(user: User) {
  return all('SELECT * FROM email_templates ORDER BY id');
}

export function saveEmailTemplate(user: User, data: any) {
  if (!data.key) return { ok: false, error: 'Template key is required' };
  run("INSERT INTO email_templates (key, name, subject, body, active) VALUES (?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET name=excluded.name, subject=excluded.subject, body=excluded.body, active=excluded.active",
    data.key, data.name || data.key, data.subject || null, data.body || null, data.active ? 1 : 0);
  audit(user, 'EMAIL_TEMPLATE_SAVE', 'EmailTemplate', data.key);
  return { ok: true };
}

export function listBlogPosts(user: User) {
  return all('SELECT * FROM blog_posts ORDER BY created_at DESC');
}

export function saveBlogPost(user: User, data: any) {
  const slug = slugify(data.title);
  if (data.id) {
    run("UPDATE blog_posts SET title=?, slug=?, category=?, tags=?, excerpt=?, content=?, featured_image=?, author=?, seo_title=?, seo_description=?, published=?, updated_at=datetime('now') WHERE id=?",
      data.title, slug, data.category || null, JSON.stringify(data.tags || []), data.excerpt || null, data.content || '', data.featured_image || null, data.author || user?.name || null, data.seo_title || null, data.seo_description || null, data.published ? 1 : 0, data.id);
  } else {
    try {
      run('INSERT INTO blog_posts (title, slug, category, tags, excerpt, content, featured_image, author, seo_title, seo_description, published) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        data.title, slug, data.category || null, JSON.stringify(data.tags || []), data.excerpt || null, data.content || '', data.featured_image || null, data.author || user?.name || null, data.seo_title || null, data.seo_description || null, data.published ? 1 : 0);
    } catch (e: any) { return { ok: false, error: /unique/i.test(e?.message || '') ? 'A post with that title already exists' : e?.message || 'Error' }; }
  }
  audit(user, 'BLOG_SAVE', 'Blog', slug);
  return { ok: true };
}

export function deleteBlogPost(user: User, id: number) {
  run('DELETE FROM blog_posts WHERE id=?', id);
  audit(user, 'BLOG_DELETE', 'Blog', String(id));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// INVENTORY
// ---------------------------------------------------------------------------
export function listInventory(user: User) {
  return {
    products: all('SELECT id, name, sku, stock, stock_status, low_stock_threshold, enable_stock, regular_price, sale_price FROM products WHERE deleted_at IS NULL ORDER BY name LIMIT 1000'),
    ingredients: all('SELECT * FROM ingredients ORDER BY name'),
    transactions: all('SELECT it.*, p.name AS product_name FROM inventory_transactions it LEFT JOIN products p ON it.product_id=p.id ORDER BY it.id DESC LIMIT 400'),
    stockHistory: all('SELECT sh.*, p.name AS product_name FROM stock_history sh LEFT JOIN products p ON sh.product_id=p.id ORDER BY sh.id DESC LIMIT 400'),
  };
}

export function updateProductStock(user: User, id: number, qty: number, note?: string) {
  const p = one<Row>('SELECT stock, low_stock_threshold FROM products WHERE id=?', id);
  if (!p) return { ok: false, error: 'Product not found' };
  const amount = Number(qty);
  if (isNaN(amount)) return { ok: false, error: 'Invalid quantity' };
  const newStock = Math.max(0, (p.stock || 0) + amount);
  const shouldRestock = amount !== 0 && newStock !== p.stock;
  tx(() => {
    run("UPDATE products SET stock=?, stock_status=CASE WHEN ?<=0 THEN 'out_of_stock' WHEN ?<=low_stock_threshold THEN 'low_stock' ELSE 'in_stock' END, updated_at=datetime('now') WHERE id=?",
      newStock, newStock, newStock, id);
    if (shouldRestock) {
      run('INSERT INTO stock_history (product_id, change_amount, type, note, user_id, user_name) VALUES (?,?,?,?,?,?)', id, amount, 'manual', note || null, user?.id ?? null, user?.name ?? null);
      run('INSERT INTO inventory_transactions (product_id, type, quantity, note, user_id) VALUES (?,?,?,?,?)', id, amount > 0 ? 'restock' : 'adjustment', amount, note || null, user?.id ?? null);
    }
  });
  audit(user, 'STOCK_UPDATE', 'Product', String(id), `Δ ${amount} → ${newStock}`);
  return { ok: true };
}

export function setProductStock(user: User, id: number, qty: number, note?: string) {
  const p = one<Row>('SELECT stock FROM products WHERE id=?', id);
  if (!p) return { ok: false, error: 'Product not found' };
  const newStock = Math.max(0, Number(qty) || 0);
  const delta = newStock - (p.stock || 0);
  tx(() => {
    run("UPDATE products SET stock=?, stock_status=CASE WHEN ?<=0 THEN 'out_of_stock' WHEN ?<=low_stock_threshold THEN 'low_stock' ELSE 'in_stock' END, updated_at=datetime('now') WHERE id=?",
      newStock, newStock, newStock, id);
    run('INSERT INTO stock_history (product_id, change_amount, type, note, user_id, user_name) VALUES (?,?,?,?,?,?)', id, delta, 'set', note || null, user?.id ?? null, user?.name ?? null);
    run('INSERT INTO inventory_transactions (product_id, type, quantity, note, user_id) VALUES (?,?,?,?,?)', id, 'set', delta, note || null, user?.id ?? null);
  });
  audit(user, 'STOCK_SET', 'Product', String(id), `→ ${newStock}`);
  return { ok: true };
}

export function saveIngredient(user: User, data: any) {
  if (data.id) {
    run('UPDATE ingredients SET name=?, unit=?, stock=?, low_stock_threshold=?, cost_per_unit=?, category=? WHERE id=?',
      data.name, data.unit || null, Number(data.stock) || 0, Number(data.low_stock_threshold) || 0, data.cost_per_unit ?? null, data.category || null, data.id);
  } else {
    run('INSERT INTO ingredients (name, unit, stock, low_stock_threshold, cost_per_unit, category) VALUES (?,?,?,?,?,?)',
      data.name, data.unit || null, Number(data.stock) || 0, Number(data.low_stock_threshold) || 0, data.cost_per_unit ?? null, data.category || null);
  }
  audit(user, 'INGREDIENT_SAVE', 'Ingredient', data.name);
  return { ok: true };
}

export function deleteIngredient(user: User, id: number) {
  run('DELETE FROM recipes WHERE ingredient_id=?', id);
  run('DELETE FROM ingredients WHERE id=?', id);
  audit(user, 'INGREDIENT_DELETE', 'Ingredient', String(id));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// ADMIN USERS & ROLES
// ---------------------------------------------------------------------------
export function listAdminUsers(user: User) {
  return all("SELECT id, name, email, phone, role, status, created_at, last_login_at FROM users WHERE role IN ('super_admin','admin','staff','manager') ORDER BY id");
}

export function listRoles(user: User) {
  const roles = all<Row>('SELECT * FROM roles ORDER BY id');
  return roles.map((r) => ({ ...r, permissions: jsonParseSafe(r.permissions, []) }));
}

export function createAdminUser(user: User, data: any) {
  if (!data.name || !data.email) return { ok: false, error: 'Name and email are required' };
  const email = data.email.toLowerCase().trim();
  const exists = one('SELECT id FROM users WHERE email=?', email);
  if (exists) return { ok: false, error: 'A user with that email already exists' };
  const pw = data.password || 'Password@123';
  const role = data.role || 'staff';
  try {
    const r = run('INSERT INTO users (name, email, password_hash, phone, role, status) VALUES (?,?,?,?,?,?)',
      data.name, email, hashPassword(pw), data.phone || null, role, data.status || 'active');
    audit(user, 'ADMIN_USER_CREATE', 'User', String(r.lastInsertRowid), email);
    ensureRole(role);
    return { ok: true, id: Number(r.lastInsertRowid) };
  } catch (e: any) { return { ok: false, error: e?.message || 'Error' }; }
}

export function updateAdminUser(user: User, id: number, data: any) {
  const target = one<Row>('SELECT * FROM users WHERE id=?', id);
  if (!target) return { ok: false, error: 'User not found' };
  if (target.id === user.id && data.role && data.role !== 'super_admin') {
    return { ok: false, error: 'You cannot demote your own super_admin role' };
  }
  const sets: string[] = [];
  const params: any[] = [];
  if (data.name !== undefined) { sets.push('name=?'); params.push(data.name); }
  if (data.phone !== undefined) { sets.push('phone=?'); params.push(data.phone); }
  if (data.role !== undefined) { sets.push('role=?'); params.push(data.role); ensureRole(data.role, user); }
  if (data.status !== undefined) { sets.push('status=?'); params.push(data.status); }
  if (data.password) { sets.push('password_hash=?'); params.push(hashPassword(data.password)); }
  if (!sets.length) return { ok: false, error: 'No fields to update' };
  params.push(id);
  run(`UPDATE users SET ${sets.join(', ')} WHERE id=?`, ...params);
  audit(user, 'ADMIN_USER_UPDATE', 'User', String(id));
  return { ok: true };
}

export function deleteAdminUser(user: User, id: number) {
  const target = one<Row>('SELECT * FROM users WHERE id=?', id);
  if (!target) return { ok: false, error: 'User not found' };
  if (target.id === user.id) return { ok: false, error: 'You cannot delete your own account' };
  if (target.role === 'super_admin') {
    const others = count("SELECT COUNT(*) c FROM users WHERE role='super_admin' AND id!=?", id);
    if (others === 0) return { ok: false, error: 'Cannot delete the last super_admin' };
  }
  run('DELETE FROM users WHERE id=?', id);
  audit(user, 'ADMIN_USER_DELETE', 'User', String(id), target.email);
  return { ok: true };
}

export function saveRole(user: User, data: any) {
  const name = (data.name || '').trim();
  if (!name) return { ok: false, error: 'Role name is required' };
  const perms = JSON.stringify(data.permissions || []);
  if (data.id) {
    run('UPDATE roles SET name=?, permissions=? WHERE id=?', name, perms, data.id);
  } else {
    try {
      run('INSERT INTO roles (name, permissions) VALUES (?,?)', name, perms);
    } catch { return { ok: false, error: 'Role already exists' }; }
  }
  audit(user, 'ROLE_SAVE', 'Role', name);
  return { ok: true };
}

export function deleteRole(user: User, id: number) {
  const r = one<Row>('SELECT name FROM roles WHERE id=?', id);
  if (!r) return { ok: false, error: 'Role not found' };
  const inUse = count('SELECT COUNT(*) c FROM users WHERE role=?', r.name);
  if (inUse > 0) return { ok: false, error: `Role "${r.name}" is assigned to ${inUse} user(s); reassign them first.` };
  run('DELETE FROM roles WHERE id=?', id);
  audit(user, 'ROLE_DELETE', 'Role', r.name);
  return { ok: true };
}

export function ensureRole(role: string, user?: User) {
  if (role === 'super_admin' || role === 'admin') return;
  const exists = one('SELECT id FROM roles WHERE name=?', role);
  if (exists) return;
  run('INSERT INTO roles (name, permissions) VALUES (?,?)', role, JSON.stringify([]));
  if (user) audit(user, 'ROLE_AUTO_CREATE', 'Role', role);
}

// ---------------------------------------------------------------------------
// SETTINGS & AUDIT
// ---------------------------------------------------------------------------
const SENSITIVE_KEYS = ['payment_razorpay_secret'];

export function getAllSettings(user: User) {
  const rows = all<Row>('SELECT key, value FROM settings');
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (SENSITIVE_KEYS.includes(r.key)) out[r.key] = '••••••••';
    else out[r.key] = r.value;
  }
  return out;
}

export function saveSettings(user: User, settings: Record<string, string>) {
  tx(() => {
    for (const [k, v] of Object.entries(settings)) {
      if (SENSITIVE_KEYS.includes(k) && v.startsWith('••••')) continue;
      run("INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", k, String(v));
    }
  });
  audit(user, 'SETTINGS_UPDATE', 'Settings');
  return { ok: true };
}

export function listAudit(user: User, limit = 300) {
  return all('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?', Math.min(Number(limit) || 300, 2000));
}

// ---------------------------------------------------------------------------
// SUPPORT TICKETS
// ---------------------------------------------------------------------------
export function listTickets(user: User, status?: string) {
  if (status) return all('SELECT * FROM support_tickets WHERE status=? ORDER BY created_at DESC', status);
  return all('SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 300');
}

export function updateTicketStatus(user: User, id: number, status: string) {
  run("UPDATE support_tickets SET status=?, updated_at=datetime('now') WHERE id=?", status, id);
  audit(user, 'TICKET_STATUS', 'SupportTicket', String(id), `→ ${status}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------------------
export function getNotifications(user: User) {
  return all('SELECT * FROM notifications WHERE user_id IS NULL OR user_id=? ORDER BY id DESC LIMIT 50', user?.id ?? null);
}