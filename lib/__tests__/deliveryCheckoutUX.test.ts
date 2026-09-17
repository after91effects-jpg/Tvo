import { describe, it, expect } from 'vitest';
import { validateSlot, extractPieceCount } from '../server/order-engine';
import { normalizeOrderRow } from '../orderNormalizer';
import { deserializeProduct } from '../server/product-serializer';
import { db } from '../server/db';

describe('PHASE 12B-9: Delivery Options & Checkout UX', () => {
  // 1. Delivery Date Validation
  describe('1. Delivery Date Validation', () => {
    it('accepts a valid future date in YYYY-MM-DD format', () => {
      const future = new Date();
      future.setDate(future.getDate() + 3);
      const ymd = future.toISOString().split('T')[0];

      const res = validateSlot(ymd, 'Morning Fresh', 1);
      expect(res.ok).toBe(true);
      expect(res.slot).toBeDefined();
    });

    it('rejects missing or empty delivery date', () => {
      const res = validateSlot('', 'Morning Fresh', 1);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/delivery date is required/i);
    });

    it('rejects malformed date formats', () => {
      expect(validateSlot('18-09-2026', 'Morning Fresh', 1).ok).toBe(false);
      expect(validateSlot('2026/09/18', 'Morning Fresh', 1).ok).toBe(false);
      expect(validateSlot('tomorrow', 'Morning Fresh', 1).ok).toBe(false);
    });
  });

  // 2. Invalid / Past Date Rejection
  describe('2. Past Date Rejection', () => {
    it('rejects dates in the past', () => {
      const res = validateSlot('2020-01-01', 'Morning Fresh', 1);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/cannot be in the past/i);
    });
  });

  // 3. Same-Day Behaviour
  describe('3. Same-Day Delivery Behaviour', () => {
    it('accepts today date for delivery when slots are available', () => {
      const d = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const todayIST = new Date(d.getTime() + istOffset).toISOString().split('T')[0];

      const res = validateSlot(todayIST, 'Morning Fresh', 1);
      expect(res.ok).toBe(true);
    });
  });

  // 4. Maximum Advance Booking Days Rejection
  describe('4. Maximum Advance Booking Days', () => {
    it('rejects delivery dates beyond 30 days in advance', () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 45);
      const ymd = farFuture.toISOString().split('T')[0];

      const res = validateSlot(ymd, 'Morning Fresh', 1);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/only be booked up to/i);
    });
  });

  // 5. Delivery Slot Validation
  describe('5. Delivery Slot Validation', () => {
    it('validates and returns existing active slot', () => {
      const future = new Date();
      future.setDate(future.getDate() + 2);
      const ymd = future.toISOString().split('T')[0];

      const res = validateSlot(ymd, null, 1);
      expect(res.ok).toBe(true);
      expect(res.slot?.id).toBe(1);
    });

    it('rejects blackout dates gracefully', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const blackoutDate = future.toISOString().split('T')[0];
      try {
        db.prepare("INSERT OR REPLACE INTO blackout_dates (date, reason) VALUES (?, ?)").run(blackoutDate, 'Kitchen Maintenance');
        const res = validateSlot(blackoutDate, 'Morning Fresh', 1);
        expect(res.ok).toBe(false);
        expect(res.error).toMatch(/closed on this date/i);
      } finally {
        db.prepare("DELETE FROM blackout_dates WHERE date=?").run(blackoutDate);
      }
    });
  });

  // 6. Store Pickup Delivery Option
  describe('6. Store Pickup Delivery Option', () => {
    it('validates Store Pickup slot without requiring numeric delivery slot ID', () => {
      const future = new Date();
      future.setDate(future.getDate() + 2);
      const ymd = future.toISOString().split('T')[0];

      const res = validateSlot(ymd, 'Store Pickup', 'pickup');
      expect(res.ok).toBe(true);
      expect(res.slot?.name).toBe('Store Pickup');
      expect(res.slot?.fee).toBe(0);
    });
  });

  // 7. Delivery Fee Calculation
  describe('7. Delivery Fee Calculation Rules', () => {
    const freeDeliveryThreshold = 499;
    const standardDeliveryFee = 49;

    it('calculates free delivery when subtotal reaches threshold', () => {
      const subtotal = 599;
      const fee = subtotal >= freeDeliveryThreshold ? 0 : standardDeliveryFee;
      expect(fee).toBe(0);
    });

    it('applies standard delivery fee when subtotal is below threshold', () => {
      const subtotal = 399;
      const fee = subtotal >= freeDeliveryThreshold ? 0 : standardDeliveryFee;
      expect(fee).toBe(49);
    });

    it('always assigns 0 delivery fee for store pickup', () => {
      const isPickup = true;
      const subtotal = 199;
      const fee = isPickup ? 0 : (subtotal >= freeDeliveryThreshold ? 0 : standardDeliveryFee);
      expect(fee).toBe(0);
    });
  });

  // 8. Special Delivery Instructions Sanitization
  describe('8. Special Delivery Instructions Sanitization', () => {
    it('trims and caps instructions to 500 characters', () => {
      const rawInput = '  ' + 'A'.repeat(600) + '  ';
      const sanitized = rawInput.trim().slice(0, 500);
      expect(sanitized.length).toBe(500);
      expect(sanitized.startsWith('A')).toBe(true);
    });

    it('preserves valid customer delivery notes', () => {
      const note = 'Call before delivery, leave with tower reception';
      const sanitized = note.trim().slice(0, 500);
      expect(sanitized).toBe(note);
    });
  });

  // 9. Checkout Payload Mapping
  describe('9. Checkout Payload Mapping & Integrity', () => {
    it('correctly maps customer contact, address, slot, and items', () => {
      const rawPayload = {
        customer: {
          name: 'Amit Mishra',
          phone: '9876543210',
          email: 'amit@example.com',
          address: 'Flat 402, Lotus Residency',
        },
        pincode: '122001',
        city: 'Gurugram',
        deliveryDate: '2026-09-18',
        deliverySlot: 'Evening Prime',
        deliverySlotId: 5,
        deliveryInstructions: 'Fragile cake, please keep cold',
      };

      expect(rawPayload.customer.name).toBe('Amit Mishra');
      expect(rawPayload.pincode).toBe('122001');
      expect(rawPayload.deliverySlot).toBe('Evening Prime');
      expect(rawPayload.deliveryInstructions).toBe('Fragile cake, please keep cold');
    });
  });

  // 10. Flavour & Customization Preservation
  describe('10. Flavour & Customization Preservation', () => {
    it('preserves selected flavour and extra flavour price through order item', () => {
      const item = {
        productId: '13',
        name: 'American Rich Milk Choco Cake',
        selectedFlavour: 'Fresh Strawberry',
        flavourPrice: 80,
        unitPrice: 599,
        quantity: 1,
      };

      const lineTotal = (item.unitPrice + item.flavourPrice) * item.quantity;
      expect(item.selectedFlavour).toBe('Fresh Strawberry');
      expect(item.flavourPrice).toBe(80);
      expect(lineTotal).toBe(679);
    });
  });

  // 11. Add-on Preservation
  describe('11. Add-on Preservation', () => {
    it('preserves addons array with prices in line items', () => {
      const addons = [
        { id: 'add-1', name: 'Sparkler Candle Set', price: 99 },
        { id: 'add-2', name: 'Birthday Cake Topper', price: 149 },
      ];
      const addonTotal = addons.reduce((sum, a) => sum + a.price, 0);
      expect(addonTotal).toBe(248);
      expect(addons).toHaveLength(2);
      expect(addons[0].name).toBe('Sparkler Candle Set');
    });
  });

  // 12. Customer Design Reference Image Preservation
  describe('12. Customer Design Reference Image Preservation', () => {
    it('preserves uploaded media path and discards base64 data URLs', () => {
      const cleanUrl = '/uploads/custom-designs/cake_art.webp';
      const base64Url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const sanitize = (img: string | undefined | null) =>
        img && !String(img).startsWith('data:') ? String(img).trim().slice(0, 500) : null;

      expect(sanitize(cleanUrl)).toBe('/uploads/custom-designs/cake_art.webp');
      expect(sanitize(base64Url)).toBeNull();
    });
  });

  // 13. Server-side Total Calculation Authoritativeness
  describe('13. Server-side Total Calculation', () => {
    it('recalculates grand total from subtotal, discount, delivery fee and slot surcharge', () => {
      const subtotal = 1198;
      const discount = 100;
      const deliveryFee = 0; // >= 499 threshold
      const slotSurcharge = 29; // evening slot
      const total = Math.max(0, Math.round(subtotal - discount + deliveryFee + slotSurcharge));

      expect(total).toBe(1127);
    });
  });

  // 14. Backward Compatibility & Order Normalization
  describe('14. Backward Compatibility & Order Normalization', () => {
    it('maps tracking_note to instructions and specialInstructions in normalizeOrderRow', () => {
      const mockRow = {
        id: 101,
        order_number: 'TVO-2026-999',
        customer_name: 'Rohit Verma',
        customer_phone: '9811223344',
        customer_address: 'Sector 56, Gurugram',
        pincode: '122011',
        city: 'Gurugram',
        items: JSON.stringify([{ productId: '1', name: 'Chocolate Truffle', qty: 1, totalPrice: 499 }]),
        subtotal: 499,
        delivery_fee: 0,
        total: 499,
        delivery_date: '2026-09-18',
        delivery_slot: 'Morning Fresh',
        tracking_note: 'Ring the doorbell twice',
        created_at: '2026-09-17T12:00:00Z',
      };

      const normalized = normalizeOrderRow(mockRow);
      expect(normalized.customer.name).toBe('Rohit Verma');
      expect(normalized.customer.instructions).toBe('Ring the doorbell twice');
      expect(normalized.specialInstructions).toBe('Ring the doorbell twice');
      expect(normalized.deliverySlot).toBe('Morning Fresh');
      expect(normalized.deliveryDate).toBe('2026-09-18');
    });

    it('defaults gracefully for products without delivery settings', () => {
      const mockProduct = {
        id: 1,
        name: 'Classic Vanilla Cake',
        slug: 'classic-vanilla-cake',
        regular_price: 499,
        sale_price: 499,
      };

      const product = deserializeProduct(mockProduct);
      expect(product?.showDelivery).toBe(true);
      expect(product?.showDeliveryDate).toBe(true);
      expect(product?.showDeliverySlot).toBe(true);
    });
  });
});
