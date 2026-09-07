import { db } from './db';

export class OrderInputError extends Error {}

function jsonParseSafe(s: string | undefined, fallback: any = []) {
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

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

// Server-side unit price for a line item: honours the selected weight/option
// from variations_json (e.g. {"attribute":"Select Weight","options":[{label,value,price,mrp}]}),
// falling back to the product's sale/regular price only when there are no variations.
// Never trusts client prices. Returns unit < 0 when the product HAS variations but the
// requested label matches none of them (i.e. a fabricated/unavailable option).
function resolveVariation(prod: any, weightLabel?: string): { unit: number; option: any } {
  if (!prod) return { unit: Number(prod?.sale_price ?? prod?.regular_price) || 0, option: null };
  const opts = variationOptionsProd(prod.variations_json);
  const clean = weightLabel != null ? String(weightLabel).trim().replace(/\s+/g, ' ') : '';
  if (opts.length === 0) {
    return { unit: Number(prod.sale_price ?? prod.regular_price) || 0, option: null };
  }
  const hit = opts.find((o: any) => String(o.label).trim().replace(/\s+/g, ' ') === clean || (o.value != null && String(o.value).trim() === clean))
    || (clean ? opts.find((o: any) => smallWeightMatch(o, clean)) : null);
  if (hit) {
    const p = Number(hit.price);
    return { unit: p > 0 ? p : (Number(prod.sale_price ?? prod.regular_price) || 0), option: hit };
  }
  return { unit: -1, option: null };
}

function validateSlot(date: string | null | undefined, slotName: string | null | undefined, slotId: string | number | null | undefined) {
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

// Resolve + validate every line item against fresh DB reads.
// For piece products stock represents pieces and quantity represents pieces, so the
// requirement is stock >= quantity (never negative inventory). For weight products the
// existing stock/variation behaviour is preserved.
function buildLineItems(items: any[]): Array<{ it: any; prod: any; unit: number; option: any; addedAddonTotal: number; validatedAddons: any[] }> {
  return items.map((it) => {
    if (!it || !it.productId) throw new OrderInputError('Product not found');
    const prod = db.prepare('SELECT id, name, sku, stock, stock_status, selling_unit, low_stock_threshold, sale_price, regular_price, variations_json FROM products WHERE id=?').get(it.productId);
    if (!prod) throw new OrderInputError('Product not found');
    const qty = it.qty;
    // quantity must be a valid positive finite integer; reject 0, negatives,
    // NaN/Infinity, decimals, strings and other malformed values server-side.
    if (typeof qty !== 'number' || !Number.isFinite(qty) || !Number.isInteger(qty) || qty < 1) {
      throw new OrderInputError(`Invalid quantity for ${prod.name}. Quantity must be a positive whole number.`);
    }
    if (prod.stock_status === 'out_of_stock' || prod.stock <= 0) {
      throw new OrderInputError(`${prod.name} is currently out of stock`);
    }
    const { unit, option } = resolveVariation(prod, it.weight);
    if (unit < 0) {
      throw new OrderInputError(`Invalid or unavailable size/option selected for ${prod.name}`);
    }
    if (prod.stock < qty) {
      throw new OrderInputError(`Only ${prod.stock} left in stock for ${prod.name}`);
    }
    const addons = Array.isArray(it.addons) ? it.addons : [];
    let addedAddonTotal = 0;
    const validatedAddons = addons.map((ad: any) => {
      const dbAddon = db.prepare('SELECT price FROM addons WHERE id=? OR name=?').get(ad.id, ad.name);
      const p = dbAddon ? Number(dbAddon.price) : (Number(ad.price) || 0);
      addedAddonTotal += p;
      return { ...ad, price: p };
    });
    return { it, prod, unit, option, addedAddonTotal, validatedAddons };
  });
}

export interface CreateOrderArgs {
  items: any[];
  body: any;
  customerId: number | null;
  generateOrderNumber: () => string;
}

/**
 * Validates the order, reserves stock and creates the order atomically.
 * On any validation failure throws OrderInputError (nothing is written);
 * on any other failure the whole transaction rolls back so no partial order
 * is ever persisted.
 */
export function createOrder({ items, body, customerId, generateOrderNumber }: CreateOrderArgs) {
  return db.transaction(() => {
    // validation: delivery slot + blackout (re-checked inside the transaction)
    const slotCheck = validateSlot(body.deliveryDate, body.deliverySlot, body.deliverySlotId);
    if (!slotCheck.ok) throw new OrderInputError(slotCheck.error);

    // validation: quantity, product existence, stock and variation (fresh reads)
    const lines = buildLineItems(items);

    // compute totals (server-side, including add-ons; does NOT trust client prices)
    let subtotal = 0;
    for (const line of lines) {
      subtotal += (line.unit + line.addedAddonTotal) * line.it.qty;
    }
    const deliveryFee = Number(body.deliveryFee) || 0;
    let discount = 0;
    let couponCode: string | null = null;
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

    const orderNumber = generateOrderNumber();

    // preserve the selected variation/label and store the explicit selling unit on new order items
    const itemsJson = JSON.stringify(lines.map(({ it, prod, unit, addedAddonTotal, validatedAddons }) => ({
      productId: String(it.productId), name: prod?.name || it.name, sku: prod?.sku || it.sku,
      qty: it.qty, weight: it.weight || null, flavour: it.flavour || null,
      messageOnCake: it.messageOnCake || null, addons: validatedAddons,
      unitPrice: unit, addonTotal: addedAddonTotal, totalPrice: (unit + addedAddonTotal) * it.qty,
      imageUrl: it.imageUrl || null,
      sellingUnit: prod?.selling_unit || 'weight',
    })));

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

    // reserve stock atomically: never allow stock to become negative (oversell protection).
    // The SQL guard `AND stock >= ?` makes the decrement safe even across concurrent requests.
    for (const line of lines) {
      const qty = line.it.qty;
      const r = db.prepare(
        "UPDATE products SET stock = stock - ?, stock_status = CASE " +
        "WHEN stock - ? <= 0 THEN 'out_of_stock' " +
        "WHEN stock - ? <= low_stock_threshold THEN 'low_stock' ELSE 'in_stock' END WHERE id=? AND stock >= ?"
      ).run(qty, qty, qty, line.prod.id, qty);
      if (r.changes !== 1) {
        const live = db.prepare('SELECT stock FROM products WHERE id=?').get(line.prod.id);
        throw new OrderInputError(`Only ${live ? live.stock : 0} left in stock for ${line.prod.name}`);
      }
      db.prepare('INSERT INTO inventory_transactions (product_id, type, quantity, note) VALUES (?,?,?,?)').run(line.prod.id, 'reserved', -qty, `Order ${orderNumber}`);
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
    return { orderNumber, total, subtotal, discount, deliveryFee, tax, status: 'Order Placed' };
  })();
}