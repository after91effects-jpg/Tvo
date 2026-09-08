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

function getTodayIST(): string {
  const d = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

function getWeekdayIST(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date.getUTCDay();
}

function cleanPhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
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
// from variations_json, falling back to the product's sale/regular price only when there are no variations.
// Never trusts client prices. Returns unit < 0 when the product HAS variations but the
// requested label matches none of them.
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

function validateSlot(date: string | null | undefined, slotName: string | null | undefined, slotId: string | number | null | undefined): { ok: boolean; error?: string; slot?: any } {
  if (!date) return { ok: false, error: 'Delivery date is required' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Invalid delivery date format (YYYY-MM-DD required)' };
  const today = getTodayIST();
  if (date < today) return { ok: false, error: 'Delivery date cannot be in the past' };

  const blackout = db.prepare('SELECT * FROM blackout_dates WHERE date=?').get(date) as any;
  if (blackout) return { ok: false, error: `We are closed on this date (${blackout.reason || 'Holiday/Maintenance'})` };

  // Check production capacity
  const capacityRow = (db.prepare('SELECT * FROM production_capacity WHERE date=?').get(date) ||
    db.prepare('SELECT * FROM production_capacity WHERE date=?').get('default')) as any;
  const dailyCap = capacityRow?.daily_order_capacity ?? 100;
  const totalBooksRow = db.prepare('SELECT SUM(books) as total FROM slot_capacity WHERE date=?').get(date) as any;
  const totalBooks = totalBooksRow?.total || 0;
  if (totalBooks >= dailyCap) {
    return { ok: false, error: 'Our kitchen is at maximum capacity for this date. Please select another date.' };
  }

  const slot = ((slotId || slotName) && db.prepare('SELECT * FROM delivery_slots WHERE id=?').get(slotId || 0)) ||
    (slotName && db.prepare('SELECT * FROM delivery_slots WHERE name=?').get(slotName)) as any;

  if (slot) {
    if (slot.available === 0) {
      return { ok: false, error: `The ${slot.name} slot is currently inactive. Please select another time.` };
    }
    // Check weekday availability
    if (slot.days) {
      try {
        const allowedDays = JSON.parse(slot.days);
        if (Array.isArray(allowedDays) && allowedDays.length > 0) {
          const dayOfWeek = getWeekdayIST(date);
          if (!allowedDays.includes(dayOfWeek)) {
            return { ok: false, error: `The ${slot.name} slot is not available on this day of the week.` };
          }
        }
      } catch {}
    }
    const dayCap = db.prepare('SELECT * FROM slot_capacity WHERE slot_id=? AND date=?').get(slot.id, date) as any;
    const cap = dayCap ? dayCap.capacity : slot.capacity;
    const books = dayCap ? dayCap.books : slot.books;
    if ((dayCap && dayCap.closed) || books >= cap) {
      return { ok: false, error: `The ${slot.name} slot is fully booked for this date. Please select another time.` };
    }
  }
  return { ok: true, slot };
}

// Resolve + validate every line item against fresh DB reads.
function buildLineItems(items: any[]): Array<{ it: any; prod: any; unit: number; option: any; addedAddonTotal: number; validatedAddons: any[] }> {
  return items.map((it) => {
    if (!it || !it.productId) throw new OrderInputError('Product not found');
    const prod = db.prepare('SELECT id, name, sku, stock, stock_status, selling_unit, low_stock_threshold, sale_price, regular_price, variations_json, category_id FROM products WHERE id=?').get(it.productId) as any;
    if (!prod) throw new OrderInputError('Product not found');
    const qty = it.qty;
    // quantity must be a positive integer
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
      const dbAddon = db.prepare('SELECT id, name, price FROM addons WHERE id=? OR name=?').get(ad.id || 0, ad.name || '') as any;
      const p = dbAddon ? Number(dbAddon.price) : 0;
      addedAddonTotal += p;
      return { id: dbAddon ? dbAddon.id : ad.id, name: dbAddon ? dbAddon.name : ad.name, price: p };
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
    // 1. Customer detail validation
    const customerName = (body.customer?.name || body.customer_name || '').trim();
    if (!customerName || customerName.length < 2) {
      throw new OrderInputError('Please enter a valid customer name (minimum 2 characters)');
    }

    const rawPhone = body.customer?.phone || body.customer_phone || '';
    const phone = cleanPhone(rawPhone);
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      throw new OrderInputError('Please enter a valid 10-digit Indian mobile number');
    }

    const customerEmail = (body.customer?.email || body.customer_email || '').trim();
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      throw new OrderInputError('Please enter a valid email address');
    }

    const customerAddress = (body.customer?.address || body.customer_address || body.address || '').trim();
    if (!customerAddress || customerAddress.length < 5) {
      throw new OrderInputError('Please enter a complete delivery address (minimum 5 characters)');
    }

    const pincode = (body.pincode || body.customer?.pincode || '').trim();
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      throw new OrderInputError('Please enter a valid 6-digit delivery pincode');
    }

    const pinRow = db.prepare('SELECT p.available, z.active FROM pincodes p LEFT JOIN delivery_zones z ON p.zone_id=z.id WHERE p.pincode=?').get(pincode) as any;
    if (pinRow && (!pinRow.available || (pinRow.active !== null && pinRow.active === 0))) {
      throw new OrderInputError(`Delivery is not available for pincode ${pincode}. Currently we serve Gurugram and select Delhi NCR areas.`);
    }

    const city = (body.city || body.customer?.city || 'Gurugram').trim();

    // 2. Validation: delivery slot + blackout + capacity (re-checked inside transaction)
    const slotCheck = validateSlot(body.deliveryDate, body.deliverySlot, body.deliverySlotId);
    if (!slotCheck.ok) throw new OrderInputError(slotCheck.error || 'Delivery slot error');

    // 3. Validation: line items, quantity, product existence, stock, variation and addons
    const lines = buildLineItems(items);

    // 4. Compute subtotal (server-side authoritative, does NOT trust client prices)
    let subtotal = 0;
    for (const line of lines) {
      subtotal += (line.unit + line.addedAddonTotal) * line.it.qty;
    }
    subtotal = Math.round(subtotal);

    // 5. Authoritative delivery fee from store settings
    const freeThreshRow = db.prepare("SELECT value FROM settings WHERE key='free_delivery_threshold'").get() as any;
    const freeDeliveryThreshold = freeThreshRow ? Number(freeThreshRow.value) : 499;
    const stdFeeRow = db.prepare("SELECT value FROM settings WHERE key='standard_delivery_fee'").get() as any;
    const standardDeliveryFee = stdFeeRow ? Number(stdFeeRow.value) : 49;

    const deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : standardDeliveryFee;
    const slotSurcharge = slotCheck.slot?.fee ? Math.round(Number(slotCheck.slot.fee)) : (Math.round(Number(body.slot_surcharge)) || 0);

    // 6. Coupon code validation
    let discount = 0;
    let couponCode: string | null = null;
    const code = (body.coupon_code || '').toString().toUpperCase().trim();
    if (code) {
      const c = db.prepare('SELECT * FROM coupons WHERE code=?').get(code) as any;
      if (!c) {
        throw new OrderInputError(`Coupon "${code}" is invalid`);
      }
      if (!c.active) {
        throw new OrderInputError(`Coupon "${code}" is currently inactive`);
      }
      if (c.starts_at && new Date(c.starts_at) > new Date()) {
        throw new OrderInputError(`Coupon "${code}" is not active yet`);
      }
      if (c.ends_at && new Date(c.ends_at) < new Date()) {
        throw new OrderInputError(`Coupon "${code}" has expired`);
      }
      if (c.max_uses && (c.uses || 0) >= c.max_uses) {
        throw new OrderInputError(`Coupon "${code}" has reached its maximum usage limit`);
      }
      if (c.min_order && subtotal < Number(c.min_order)) {
        throw new OrderInputError(`Coupon "${code}" requires a minimum order value of ₹${c.min_order}`);
      }
      if (c.customer_ids) {
        try {
          const allowedCusts = JSON.parse(c.customer_ids);
          if (Array.isArray(allowedCusts) && allowedCusts.length > 0) {
            const matches = customerId && allowedCusts.map(String).includes(String(customerId));
            if (!matches) {
              throw new OrderInputError(`Coupon "${code}" is not valid for this account`);
            }
          }
        } catch (e: any) {
          if (e instanceof OrderInputError) throw e;
        }
      }
      if (customerId || phone || customerEmail) {
        const usedCount = db.prepare(`
          SELECT COUNT(*) as cnt FROM orders 
          WHERE coupon_code=? AND status != 'Cancelled' AND (
            (customer_id IS NOT NULL AND customer_id = ?) OR
            (customer_phone IS NOT NULL AND customer_phone = ?) OR
            (customer_email IS NOT NULL AND customer_email = ?)
          )
        `).get(code, customerId || -1, phone, customerEmail || '') as any;
        if (usedCount && usedCount.cnt >= (c.per_customer_limit || 1)) {
          throw new OrderInputError(`You have already used coupon "${code}" the maximum number of times`);
        }
      }
      if (c.product_ids) {
        try {
          const allowedProds = JSON.parse(c.product_ids);
          if (Array.isArray(allowedProds) && allowedProds.length > 0) {
            const hasProd = lines.some(l => allowedProds.map(String).includes(String(l.prod.id)));
            if (!hasProd) {
              throw new OrderInputError(`Coupon "${code}" is not applicable to any items in your cart`);
            }
          }
        } catch (e: any) {
          if (e instanceof OrderInputError) throw e;
        }
      }
      if (c.category_ids) {
        try {
          const allowedCats = JSON.parse(c.category_ids);
          if (Array.isArray(allowedCats) && allowedCats.length > 0) {
            const hasCat = lines.some(l => allowedCats.map(String).includes(String(l.prod.category_id)));
            if (!hasCat) {
              throw new OrderInputError(`Coupon "${code}" is not applicable to any categories in your cart`);
            }
          }
        } catch (e: any) {
          if (e instanceof OrderInputError) throw e;
        }
      }

      let d = c.discount_type === 'percent' ? (subtotal * Number(c.discount_value)) / 100 : Number(c.discount_value);
      if (c.discount_type === 'percent' && c.max_discount) d = Math.min(d, Number(c.max_discount));
      discount = Math.round(Math.max(0, Math.min(d, subtotal)));
      couponCode = c.code;
    }

    // 7. Final total calculation (GST-inclusive)
    const tax = 0;
    const total = Math.max(0, Math.round(subtotal - discount + deliveryFee + slotSurcharge + tax));
    const orderNumber = generateOrderNumber();

    // 8. Line items JSON
    const itemsJson = JSON.stringify(lines.map(({ it, prod, unit, addedAddonTotal, validatedAddons }) => ({
      productId: String(it.productId),
      name: prod?.name || it.name,
      sku: prod?.sku || it.sku,
      qty: it.qty,
      weight: it.weight || null,
      flavour: it.flavour || null,
      messageOnCake: it.messageOnCake || null,
      addons: validatedAddons,
      unitPrice: unit,
      addonTotal: addedAddonTotal,
      totalPrice: (unit + addedAddonTotal) * it.qty,
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
        customerName, phone, customerEmail,
        customerAddress, pincode, city,
        itemsJson, JSON.stringify(body.addons || []),
        subtotal, discount, couponCode, deliveryFee, slotSurcharge, tax, total,
        body.deliveryDate || null, body.deliverySlot || null, slotCheck.slot?.id ?? (body.deliverySlotId || null),
        'Order Placed', body.priority || 'Normal', body.paymentMethod || 'UPI', 'Pending',
        JSON.stringify([{ status: 'Order Placed', created_at: new Date().toISOString() }]),
        new Date().toISOString(), new Date().toISOString()
      );
    const orderId = Number(info.lastInsertRowid);

    // 9. Reserve stock atomically (oversell protection with SQL AND stock >= ?)
    for (const line of lines) {
      const qty = line.it.qty;
      const r = db.prepare(
        "UPDATE products SET stock = stock - ?, stock_status = CASE " +
        "WHEN stock - ? <= 0 THEN 'out_of_stock' " +
        "WHEN stock - ? <= low_stock_threshold THEN 'low_stock' ELSE 'in_stock' END WHERE id=? AND stock >= ?"
      ).run(qty, qty, qty, line.prod.id, qty);
      if (r.changes !== 1) {
        const live = db.prepare('SELECT stock FROM products WHERE id=?').get(line.prod.id) as any;
        throw new OrderInputError(`Only ${live ? live.stock : 0} left in stock for ${line.prod.name}`);
      }
      db.prepare('INSERT INTO inventory_transactions (product_id, type, quantity, note) VALUES (?,?,?,?)')
        .run(line.prod.id, 'reserved', -qty, `Order ${orderNumber}`);
    }

    // 10. Book slot capacity
    const slot = slotCheck.slot || db.prepare('SELECT * FROM delivery_slots WHERE (name=? OR id=?)').get(body.deliverySlot, body.deliverySlotId || 0) as any;
    if (slot && body.deliveryDate) {
      const dayCap = db.prepare('SELECT * FROM slot_capacity WHERE slot_id=? AND date=?').get(slot.id, body.deliveryDate) as any;
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
    return { orderNumber, total, subtotal, discount, deliveryFee, slotSurcharge, tax, status: 'Order Placed' };
  })();
}