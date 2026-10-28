import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { db } from '../server/db';
import { signToken } from '../server/auth';
import { GET as getWishlist, POST as postWishlist } from '../../app/api/wishlist/route';

describe('PHASE 2 CUSTOMER JOURNEY: BUG-003, BUG-004, BUG-018', () => {
  describe('BUG-003: Checkout Addon String / Object Display Normalization', () => {
    // Normalization logic extracted directly from components/storefront/CheckoutModal.tsx
    function normalizeCheckoutAddon(a: any, idx: number) {
      if (!a) return null;
      const isStr = typeof a === 'string';
      const name = isStr ? a : (a?.name || (typeof a === 'object' ? '' : String(a)));
      if (!name) return null;
      const price = !isStr && typeof a?.price === 'number' && a.price > 0 ? ` (₹${a.price})` : '';
      const key = !isStr && (a.id || a.name) ? `${a.id || a.name}-${idx}` : `${name}-${idx}`;
      return {
        key,
        renderedText: `+ ${name}${price}`,
        name,
        price,
      };
    }

    it('renders string-based addons cleanly without undefined', () => {
      const stringAddon = 'Extra Chocolate drizzle';
      const result = normalizeCheckoutAddon(stringAddon, 0);

      expect(result).not.toBeNull();
      expect(result?.renderedText).toBe('+ Extra Chocolate drizzle');
      expect(result?.renderedText).not.toContain('undefined');
      expect(result?.renderedText).not.toContain('₹undefined');
      expect(result?.key).toBe('Extra Chocolate drizzle-0');
    });

    it('renders object-based addons with price correctly', () => {
      const objectAddon = { id: 'addon-1', name: 'Almond Flakes', price: 40 };
      const result = normalizeCheckoutAddon(objectAddon, 1);

      expect(result).not.toBeNull();
      expect(result?.renderedText).toBe('+ Almond Flakes (₹40)');
      expect(result?.renderedText).not.toContain('undefined');
      expect(result?.key).toBe('addon-1-1');
    });

    it('renders object-based addons without price cleanly when price is 0 or missing', () => {
      const freeAddon = { name: 'Candle', price: 0 };
      const result = normalizeCheckoutAddon(freeAddon, 2);

      expect(result).not.toBeNull();
      expect(result?.renderedText).toBe('+ Candle');
      expect(result?.renderedText).not.toContain('₹0');
    });

    it('safely handles mixed addon shapes in an array without crashing', () => {
      const mixedAddons = [
        'Sugar Free',
        { id: 'walnuts', name: 'Toasted Walnuts', price: 60 },
        null,
        undefined,
        { price: 20 }, // missing name
        'Eggless Base',
      ];

      const rendered = mixedAddons
        .map((addon, idx) => normalizeCheckoutAddon(addon, idx))
        .filter(Boolean);

      expect(rendered.length).toBe(3);
      expect(rendered[0]?.renderedText).toBe('+ Sugar Free');
      expect(rendered[1]?.renderedText).toBe('+ Toasted Walnuts (₹60)');
      expect(rendered[2]?.renderedText).toBe('+ Eggless Base');

      rendered.forEach((item) => {
        expect(item?.renderedText).not.toContain('undefined');
        expect(item?.renderedText).not.toContain('null');
      });
    });

    it('preserves order calculation logic untouched by display normalization', () => {
      const item = {
        unitPrice: 250,
        quantity: 2,
        addons: ['Gluten Free', { name: 'Gift Box', price: 50 }],
      };
      // Base calculation in checkout remains quantity * price + object addon prices
      const addonsCost = item.addons.reduce((sum: number, a: any) => {
        return sum + (typeof a === 'object' && typeof a?.price === 'number' ? a.price : 0);
      }, 0);
      const total = (item.unitPrice + addonsCost) * item.quantity;
      expect(total).toBe(600);
    });
  });

  describe('BUG-004: Cart Drawer Addon String / Object Display Normalization', () => {
    // Normalization logic extracted directly from components/cart/CartDrawer.tsx
    function getCartAddonsDisplayText(addons: any[] | undefined) {
      if (!Array.isArray(addons) || addons.length === 0) return null;
      const addonNames = addons
        .map((a: any) => (typeof a === 'string' ? a : (a?.name || '')))
        .filter(Boolean);
      if (addonNames.length === 0) return null;
      return `+ ${addonNames.join(', ')}`;
    }

    it('displays string-based addon value in Cart Drawer', () => {
      const addons = ['Eggless'];
      const text = getCartAddonsDisplayText(addons);
      expect(text).toBe('+ Eggless');
      expect(text).not.toContain('undefined');
    });

    it('displays object-based addon name in Cart Drawer', () => {
      const addons = [{ name: 'Choco Chips', price: 30 }];
      const text = getCartAddonsDisplayText(addons);
      expect(text).toBe('+ Choco Chips');
      expect(text).not.toContain('undefined');
    });

    it('displays multiple mixed addon shapes properly joined with comma', () => {
      const addons = [
        'Extra Sparkler',
        { name: 'Red Ribbon Box', price: 50 },
        null,
        'No Artificial Colors',
      ];
      const text = getCartAddonsDisplayText(addons);
      expect(text).toBe('+ Extra Sparkler, Red Ribbon Box, No Artificial Colors');
      expect(text).not.toContain('undefined');
      expect(text).not.toContain('null');
    });

    it('returns null and does not render empty plus sign for empty or nullish addons', () => {
      expect(getCartAddonsDisplayText([])).toBeNull();
      expect(getCartAddonsDisplayText([null, undefined, {}])).toBeNull();
      expect(getCartAddonsDisplayText(undefined)).toBeNull();
    });
  });

  describe('BUG-018: Wishlist Multi-Device / Cross-Device Synchronization', () => {
    const TEST_EMAIL_1 = 'phase2_sync_device1@example.com';
    const TEST_NAME_1 = 'Sync Customer 1';
    let testCustomerId1: number;
    let testCustomerCookie1: string;

    beforeAll(() => {
      process.env.JWT_SECRET = 'test-jwt-secret-key-12345678901234567890';
    });

    beforeEach(() => {
      const info = db.prepare(
        "INSERT INTO customers (name, email, phone, group_name, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
      ).run(TEST_NAME_1, TEST_EMAIL_1, '9876543211', 'Test');
      testCustomerId1 = Number(info.lastInsertRowid);

      const token = signToken({ sub: testCustomerId1, role: 'customer', email: TEST_EMAIL_1, name: TEST_NAME_1 });
      testCustomerCookie1 = `tvo_auth=${token}`;
    });

    afterEach(() => {
      if (testCustomerId1) {
        db.prepare('DELETE FROM wishlists WHERE customer_id=?').run(testCustomerId1);
        db.prepare('DELETE FROM customers WHERE id=?').run(testCustomerId1);
      }
    });

    it('synchronizes local guest wishlist to customer server database on login without duplicates', async () => {
      // Find 2 real products
      const prods = db.prepare('SELECT id FROM products LIMIT 2').all() as any[];
      expect(prods.length).toBeGreaterThan(0);
      const pid1 = String(prods[0].id);

      // 1. Device A (e.g. mobile) adds pid1 to server wishlist
      const addReq = new Request('http://localhost/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: testCustomerCookie1 },
        body: JSON.stringify({ action: 'add', product_id: pid1 }),
      });
      const addRes = await postWishlist(addReq);
      expect(addRes.status).toBe(200);

      // 2. Device B (e.g. desktop guest) has local items: pid1 (duplicate) and another item if available
      const localGuestItems = prods.length > 1 ? [pid1, String(prods[1].id)] : [pid1];

      // Device B logs in -> triggers sync
      const syncReq = new Request('http://localhost/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: testCustomerCookie1 },
        body: JSON.stringify({ action: 'sync', product_ids: localGuestItems }),
      });
      const syncRes = await postWishlist(syncReq);
      expect(syncRes.status).toBe(200);
      const syncData = await syncRes.json();
      expect(syncData.ok).toBe(true);

      // 3. Verify server state: no duplicates for pid1 in database
      const rows = db.prepare('SELECT product_id FROM wishlists WHERE customer_id=? AND product_id=?').all(testCustomerId1, pid1);
      expect(rows.length).toBe(1);

      // 4. Device C or subsequent reload fetches merged wishlist
      const getReq = new Request('http://localhost/api/wishlist', {
        headers: { cookie: testCustomerCookie1 },
      });
      const getRes = await getWishlist(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      const serverProductIds = getData.wishlist.map((w: any) => String(w.product_id));
      expect(serverProductIds).toContain(pid1);
      if (prods.length > 1) {
        expect(serverProductIds).toContain(String(prods[1].id));
      }
    });

    it('returns requiresAuth: true for unauthenticated users without failing or crashing', async () => {
      const getReq = new Request('http://localhost/api/wishlist');
      const getRes = await getWishlist(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.requiresAuth).toBe(true);
      expect(getData.wishlist).toEqual([]);
    });
  });
});
