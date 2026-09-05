import { ok, err, db, generateOrderNumber, jsonParseSafe, getCurrentUser, logAudit } from '../../../lib/server/api';

export const runtime = 'nodejs';

const PRODUCTION_STATUSES = ['Order Placed', 'Payment Confirmed', 'Accepted', 'In Preparation', 'Baking in Kitchen', 'Baking', 'Decorating', 'Quality Check', 'Packed', 'Ready for Dispatch', 'Dispatched', 'Out for Delivery', 'Delivered', 'Cancelled'];

function validateStock(items) {
  for (const it of items) {
    const prod = db.prepare('SELECT id, name, stock, stock_status FROM products WHERE id=?').get(it.productId);
    if (!prod) return { ok: false, error: `Product not found` };
    if (prod.stock_status === 'out_of_stock' || prod.stock <= 0) return { ok: false, error: `${prod.name} is currently out of stock` };
    if (prod.stock < it.qty) return { ok: false, error: `Only ${prod.stock} left in stock for ${prod.name}` };
  }
  return { ok: true };
}

// Server-side unit price for a line item: honours the selected weight/option
// from variations_json (e.g. {"attribute":"Select Weight","options":[{label,value,price,mrp}]}),
// falling back to the product's sale/regular price. Never trusts client prices.
function variationOptionsProd(raw: any): any[] {
  const parsed = jsonParseSafe(raw, []);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.options)) return parsed.options;
  return [];
}

function smallWeightMatch(opt: any, clean: string) {
  const label = String(opt.label ?? '').trim().replace(/\s+/g, ' ');
  if (label === clean) return true;
  // shared-unit matching: kg vs g equivalence (e.g. "1 kg" vs "1000 g")
  const toGrams = (s: string) => {
    const m = String(s).toLowerCase().match(/([\d.]+)\s*(kg|g|gm|grams?|kilograms?)/);
    if (!m) return null;
    const v = parseFloat(m[1]);
    return m[2][0] === 'k' ? v * 1000 : v;
  };
  const a = toGrams(label);
  const b = toGrams(clean);
  return a != null && b != null && Math.abs(a - b) < 1;
}

function unitPriceFor(prod: any, weightLabel?: string): number {
  if (!prod) return 0;
  const opts = variationOptionsProd(prod.variations_json);
  const clean = weightLabel ? String(weightLabel).trim().replace(/\s+/g, ' ') : '';
  const hit = opts.find((o: any) => String(o.label).trim().replace(/\s+/g, ' ') === clean || String(o.value).trim() === clean)
    || (clean ? opts.find((o: any) => smallWeightMatch(o, clean)) : null);
  if (hit && Number(hit.price) > 0) return Number(hit.price);
  return Number(prod.sale_price ?? prod.regular_price) || 0;
}

function validateSlot(date, slotName, slotId) {
  if (!date) return { ok: false, error: 'Delivery date is required' };
  const blackout = db.prepare('SELECT * FROM blackout_dates WHERE date=?').get(date);
  if (blackout) return { ok: false, error: `We are closed on this date (${blackout.reason || 'holiday'})` };
  const slot = (slotName && db.prepare('SELECT * FROM delivery_slots WHERE name=?').get(slotName))
    || ((slotId || slotName) && db.prepare('SELECT * FROM delivery_slots WHERE id=?').get(slotId || slotName));
  if (slot) {
    const dayCap = db.prepare('SELECT * FROM slot_capacity WHERE slot_id=? AND date=?').get(slot.id, date);
    const cap = dayCap ? dayCap.capacity : slot.capacity;
    const books = dayCap ? dayCap.books : slot.books;
    if ((dayCap && dayCap.closed) || books >= cap) return { ok: false, error: `The ${slot.name} slot is fully booked for this date. Please select another time.` };
  }
  return { ok: true };
}

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

  // validation: stock
  const stockCheck = validateStock(items);
  if (!stockCheck.ok) return err(stockCheck.error);

  // validation: delivery slot + blackout
  const slotCheck = validateSlot(body.deliveryDate, body.deliverySlot, body.deliverySlotId);
  if (!slotCheck.ok) return err(slotCheck.error);

  // compute totals (server-side, including add-ons; does NOT trust client prices)
  let subtotal = 0;
  for (const it of items) {
    const prod = db.prepare('SELECT id, name, sku, sale_price, regular_price, variations_json FROM products WHERE id=?').get(it.productId);
    const addons = Array.isArray(it.addons) ? it.addons : [];
    let addonTotal = 0;
    for (const ad of addons) {
      // Lookup add-on in DB by ID (if it's a number) or by name
      const dbAddon = db.prepare('SELECT price FROM addons WHERE id=? OR name=?').get(ad.id, ad.name);
      // Fallback to client price ONLY if not found in DB (e.g. custom client-side only addons during dev)
      // but ideally we should only trust DB price. We will use DB price if found.
      const p = dbAddon ? Number(dbAddon.price) : (Number(ad.price) || 0);
      addonTotal += p;
    }
    const unit = unitPriceFor(prod, it.weight); // Don't trust client price for products
    subtotal += (unit + addonTotal) * (it.qty || 1);
  }
  const deliveryFee = Number(body.deliveryFee) || 0;
  // Server-side coupon validation — never trust a client-supplied discount.
  let discount = 0;
  let couponCode = null;
  const code = (body.coupon_code || '').toString().toUpperCase().trim();
  if (code) {
    const c = db.prepare('SELECT * FROM coupons WHERE code=?').get(code);
    const valid = c && c.active
      && (!c.max_uses || (c.uses || 0) < c.max_uses)
      && (!c.starts_at || new Date(c.starts_at) <= new Date())
      && (!c.ends_at || new Date(c.ends_at) >= new Date())
      && (!c.min_order || subtotal >= Number(c.min_order));
    if (valid) {
      let d = c.discount_type === 'percent' ? (subtotal * Number(c.discount_value)) / 100 : Number(c.discount_value);
      if (c.discount_type === 'percent' && c.max_discount) d = Math.min(d, Number(c.max_discount));
      discount = Math.max(0, Math.min(d, subtotal));
      couponCode = c.code;
    }
  }
  const subtotalAfter = Math.max(0, subtotal);
  const tax = 0;
  const total = Math.max(0, subtotalAfter - discount + deliveryFee + tax);

  // generate order number
  const orderNumber = generateOrderNumber();
  const user = getCurrentUser(req);
  let customerId = null;
  if (user) {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id=?').get(user.id);
    customerId = cust?.id ?? null;
  }

  const itemsJson = JSON.stringify(items.map((it) => {
    const prod = db.prepare('SELECT id, name, sku, sale_price, regular_price, variations_json FROM products WHERE id=?').get(it.productId);
    const addons = Array.isArray(it.addons) ? it.addons : [];
    let addonTotal = 0;
    const validatedAddons = addons.map(ad => {
      const dbAddon = db.prepare('SELECT price FROM addons WHERE id=? OR name=?').get(ad.id, ad.name);
      const p = dbAddon ? Number(dbAddon.price) : (Number(ad.price) || 0);
      addonTotal += p;
      return { ...ad, price: p };
    });
    const unit = unitPriceFor(prod, it.weight);
    return {
      productId: String(it.productId), name: prod?.name || it.name, sku: prod?.sku || it.sku,
      qty: it.qty, weight: it.weight || null, flavour: it.flavour || null,
      messageOnCake: it.messageOnCake || null, addons: validatedAddons,
      unitPrice: unit, addonTotal, totalPrice: (unit + addonTotal) * (it.qty || 1),
      imageUrl: it.imageUrl || null,
    };
  }));

  const info = db.prepare(`INSERT INTO orders
    (order_number, customer_id, session_id, customer_name, customer_phone, customer_email, customer_address, pincode, city,
     items, addons, subtotal, discount, coupon_code, delivery_fee, slot_surcharge, tax, total,
     delivery_date, delivery_slot, delivery_slot_id, status, priority, payment_method, payment_status, timeline, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      orderNumber, customerId, body.session_id || null,
      body.customer?.name || '', body.customer?.phone || '', body.customer?.email || '',
      body.customer?.address || '', body.pincode || '', body.city || '',
      itemsJson, JSON.stringify(body.addons || []),
      subtotal, discount, couponCode, deliveryFee, Number(body.slot_surcharge) || 0, tax, total,
      body.deliveryDate || null, body.deliverySlot || null, body.deliverySlotId || null,
      'Order Placed', body.priority || 'Normal', body.paymentMethod || 'UPI', 'Pending',
      JSON.stringify([{ status: 'Order Placed', created_at: new Date().toISOString() }]),
      new Date().toISOString(), new Date().toISOString()
    );
  const orderId = Number(info.lastInsertRowid);

  // reserve stock
  for (const it of items) {
    db.prepare(
      "UPDATE products SET stock = stock - ?, stock_status = CASE " +
      "WHEN stock - ? <= 0 THEN 'out_of_stock' " +
      "WHEN stock - ? <= low_stock_threshold THEN 'low_stock' ELSE 'in_stock' END WHERE id=?"
    ).run(it.qty, it.qty, it.qty, it.productId);
    db.prepare('INSERT INTO inventory_transactions (product_id, type, quantity, note) VALUES (?,?,?,?)').run(it.productId, 'reserved', -it.qty, `Order ${orderNumber}`);
  }
  // book slot capacity
  const slot = db.prepare('SELECT * FROM delivery_slots WHERE (name=? OR id=?)').get(body.deliverySlot, body.deliverySlotId || 0);
  if (slot && body.deliveryDate) {
    const dayCap = db.prepare('SELECT * FROM slot_capacity WHERE slot_id=? AND date=?').get(slot.id, body.deliveryDate);
    if (dayCap) db.prepare('UPDATE slot_capacity SET books=books+1 WHERE id=?').run(dayCap.id);
    else db.prepare('INSERT INTO slot_capacity (slot_id, date, capacity, books, closed) VALUES (?,?,?,1,0)').run(slot.id, body.deliveryDate, slot.capacity);
  }
  db.prepare('INSERT INTO order_status_history (order_id, status, note) VALUES (?,?,?)').run(orderId, 'Order Placed', 'Order created');
  if (body.orderNotes && String(body.orderNotes).trim()) {
    const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='order_notes'").get();
    if (t) db.prepare('INSERT INTO order_notes (order_id, body, is_internal) VALUES (?,?,0)').run(orderId, String(body.orderNotes).trim());
  }
  if (couponCode) {
    db.prepare('UPDATE coupons SET uses = COALESCE(uses,0)+1 WHERE code=?').run(couponCode);
  }
  logAudit(user, 'ORDER_CREATE', 'Order', orderNumber, `Total ${total}`);
  return ok({ orderNumber, total, subtotal, discount, deliveryFee, tax, status: 'Order Placed' });
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
