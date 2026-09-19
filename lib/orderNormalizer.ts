import type { Order } from './types';

function safeArray(v: unknown): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalizes a raw SQLite order row (snake_case columns from the DB) into the
 * camelCase `Order` shape used by the storefront and admin components.
 *
 * The `/api/orders` list endpoint returns raw rows, so every admin component
 * that consumes orders previously saw `undefined` for `orderNumber`,
 * `createdAt`, `customer.*`, etc. Mapping happens here, once, at the source.
 */
export function normalizeOrderRow(raw: any): Order {
  const rawItems = safeArray(raw?.items);
  const items = rawItems.map((item: any) => {
    if (!item || typeof item !== 'object') return item;
    let addons = item.addons;
    if (typeof addons === 'string') {
      try {
        const parsed = JSON.parse(addons);
        addons = Array.isArray(parsed) ? parsed : (addons ? [addons] : []);
      } catch {
        addons = addons ? [addons] : [];
      }
    } else if (!Array.isArray(addons)) {
      addons = addons ? [addons] : [];
    }
    return {
      ...item,
      addons,
    };
  });
  const timelineRaw = safeArray(raw?.timeline);
  const timeline = timelineRaw
    .map((t: any) =>
      t && (t.status || t.state)
        ? {
            status: t.status ?? t.state,
            timestamp: t.created_at ?? t.timestamp ?? raw?.created_at ?? undefined,
            note: t.note ?? undefined,
            updatedBy: t.updated_by ?? t.user_id != null ? String(t.user_id) : undefined,
          }
        : null
    )
    .filter(Boolean) as Order['statusHistory'];

  const createdAt = raw?.created_at ?? raw?.createdAt ?? null;
  const customerName = raw?.customer_name ?? raw?.customerName ?? raw?.name ?? 'Guest Customer';
  const city = raw?.city ?? '';
  const address = raw?.customer_address ?? raw?.customerAddress ?? '';

  return {
    id: raw?.id != null ? String(raw.id) : '',
    orderNumber: raw?.order_number ?? raw?.orderNumber ?? '',
    userId: raw?.user_id != null ? String(raw.user_id) : raw?.userId,
    customer: {
      name: customerName,
      phone: raw?.customer_phone ?? '',
      email: raw?.customer_email ?? '',
      address,
      pincode: raw?.pincode ?? '',
      city,
      instructions: raw?.tracking_note ?? raw?.instructions ?? undefined,
    },
    specialInstructions: raw?.special_instructions ?? raw?.tracking_note ?? raw?.specialInstructions,
    items,
    subtotal: toNum(raw?.subtotal),
    deliveryFee: toNum(raw?.delivery_fee),
    slotSurcharge: toNum(raw?.slot_surcharge),
    discount: toNum(raw?.discount),
    promoCode: raw?.coupon_code ?? raw?.promoCode,
    tax: toNum(raw?.tax),
    total: toNum(raw?.total),
    deliveryDate: raw?.delivery_date ?? raw?.deliveryDate ?? '',
    deliverySlot: raw?.delivery_slot ?? raw?.deliverySlot ?? '',
    status: raw?.status ?? 'Order Placed',
    paymentMethod: raw?.payment_method ?? raw?.paymentMethod ?? 'COD',
    paymentStatus: raw?.payment_status ?? raw?.paymentStatus ?? 'Pending',
    transactionId: raw?.transaction_id ?? raw?.transactionId,
    statusHistory: timeline,
    createdAt: createdAt ?? '',
    updatedAt: raw?.updated_at ?? raw?.updatedAt ?? createdAt ?? '',
  };
}

export function normalizeOrders(rawOrders: any[] | undefined): Order[] {
  return Array.isArray(rawOrders) ? rawOrders.map(normalizeOrderRow) : [];
}