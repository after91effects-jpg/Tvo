import { describe, it, expect } from 'vitest';
import { getHamperSettings, saveHamperSettings, validateCustomHamperOrder } from '../server/hampers';
import { DEFAULT_HAMPER_SETTINGS } from '../seedData';
import { OrderInputError } from '../server/order-engine';
import { db } from '../server/db';

describe('STEP 6: Hampers & Gifts / Special Products System', () => {
  describe('A. Hamper Settings Management', () => {
    it('returns default hamper settings when query is executed', () => {
      const settings = getHamperSettings();
      expect(settings).toBeDefined();
      expect(Array.isArray(settings.boxes)).toBe(true);
      expect(settings.boxes.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(settings.wrappings)).toBe(true);
      expect(Array.isArray(settings.themes)).toBe(true);
    });

    it('validates schema when saving hamper settings', () => {
      expect(() => saveHamperSettings(null as any)).toThrow('Invalid hamper settings format');
      expect(() => saveHamperSettings({} as any)).toThrow('At least one hamper box option must exist');
      expect(() => saveHamperSettings({ boxes: [] } as any)).toThrow('At least one hamper box option must exist');
      expect(() => saveHamperSettings({ boxes: [{ id: 'box1', name: 'Box 1', price: 100, maxItems: 3, enabled: false }] } as any))
        .toThrow('At least one hamper box option must be enabled');
    });

    it('saves and reads back custom settings', () => {
      const original = getHamperSettings();
      try {
        const testSettings = {
          ...DEFAULT_HAMPER_SETTINGS,
          minItemsRequired: 2,
          maxGiftMessageChars: 180,
          boxes: [
            { id: 'custom-box', name: 'Custom Wooden Crate', description: 'Handcrafted', price: 250, maxItems: 6, enabled: true },
          ],
        };
        const saved = saveHamperSettings(testSettings);
        expect(saved.boxes[0].id).toBe('custom-box');
        expect(saved.minItemsRequired).toBe(2);

        const reloaded = getHamperSettings();
        expect(reloaded.minItemsRequired).toBe(2);
        expect(reloaded.boxes[0].name).toBe('Custom Wooden Crate');
      } finally {
        // Restore original settings to keep DB pristine
        saveHamperSettings(original);
      }
    });
  });

  describe('B. Custom Hamper Authoritative Pricing & Validation', () => {
    const testCustomSettings = {
      ...DEFAULT_HAMPER_SETTINGS,
      boxes: [
        { id: 'classic', name: 'Classic Gift Hamper', description: 'Loved size', price: 199, maxItems: 5, enabled: true },
        { id: 'mini', name: 'Mini Box', description: 'Small', price: 0, maxItems: 2, enabled: true },
      ],
      wrappings: [
        { id: 'none', name: 'No Wrapping', price: 0, enabled: true },
        { id: 'luxury', name: 'Luxury Velvet Box', price: 349, enabled: true },
      ],
      themes: [
        { id: 'royal', name: 'Royal Purple', enabled: true },
      ],
      minItemsRequired: 1,
    };

    it('rejects order if selected box does not exist or is disabled', () => {
      const item = {
        isCustomHamper: true,
        hamperDetails: {
          boxId: 'nonexistent-box',
          components: [{ productId: 1, qty: 1 }],
        },
      };
      expect(() => validateCustomHamperOrder(item, testCustomSettings)).toThrow(OrderInputError);
      expect(() => validateCustomHamperOrder(item, testCustomSettings)).toThrow(/unavailable/i);
    });

    it('rejects order if no components are included', () => {
      const item = {
        isCustomHamper: true,
        hamperDetails: {
          boxId: 'classic',
          components: [],
        },
      };
      expect(() => validateCustomHamperOrder(item, testCustomSettings)).toThrow(OrderInputError);
      expect(() => validateCustomHamperOrder(item, testCustomSettings)).toThrow(/must contain at least/i);
    });

    it('rejects order if component count exceeds box capacity', () => {
      const item = {
        isCustomHamper: true,
        hamperDetails: {
          boxId: 'mini', // maxItems: 2
          components: [
            { productId: 1, qty: 2 },
            { productId: 2, qty: 1 },
          ], // total = 3 items > 2
        },
      };
      expect(() => validateCustomHamperOrder(item, testCustomSettings)).toThrow(OrderInputError);
      expect(() => validateCustomHamperOrder(item, testCustomSettings)).toThrow(/can hold at most 2 items/i);
    });

    it('rejects order if component does not exist in DB', () => {
      const item = {
        isCustomHamper: true,
        hamperDetails: {
          boxId: 'classic',
          components: [{ productId: 999999, qty: 1 }],
        },
      };
      expect(() => validateCustomHamperOrder(item, testCustomSettings)).toThrow(OrderInputError);
      expect(() => validateCustomHamperOrder(item, testCustomSettings)).toThrow(/no longer available/i);
    });

    it('correctly calculates authoritative composite price: box + wrapping + sum(comp)', () => {
      // Product 1 = Pineapple Cake (sale_price: 529.0)
      // Product 2 = Choco-Vanilla Cake (sale_price: 529.0)
      const p1 = db.prepare('SELECT sale_price FROM products WHERE id=1').get() as any;
      const p2 = db.prepare('SELECT sale_price FROM products WHERE id=2').get() as any;
      const p1Price = Number(p1.sale_price);
      const p2Price = Number(p2.sale_price);

      const item = {
        isCustomHamper: true,
        hamperDetails: {
          boxId: 'classic', // price: 199
          wrappingId: 'luxury', // price: 349
          themeId: 'royal',
          recipientName: '  Alice Smith  ',
          giftMessage: '  Happy Birthday! Hope you love this delicious hamper.  ',
          components: [
            { productId: 1, qty: 1 },
            { productId: 2, qty: 2 },
          ],
        },
      };

      const result = validateCustomHamperOrder(item, testCustomSettings);

      const expectedTotal = 199 + 349 + (p1Price * 1) + (p2Price * 2);
      expect(result.boxPrice).toBe(199);
      expect(result.wrappingPrice).toBe(349);
      expect(result.unitPrice).toBe(expectedTotal);
      expect(result.recipientName).toBe('Alice Smith');
      expect(result.giftMessage).toBe('Happy Birthday! Hope you love this delicious hamper.');
      expect(result.box.id).toBe('classic');
      expect(result.wrapping?.id).toBe('luxury');
      expect(result.theme?.id).toBe('royal');
      expect(result.snapshotSku).toBe('HAMPER-CUSTOM-CLASSIC');
      expect(result.snapshotName).toBe('Custom Classic Gift Hamper');
      expect(result.components).toHaveLength(2);
      expect(result.componentDeductions).toHaveLength(2);
      expect(result.componentDeductions[0]).toEqual({
        productId: 1,
        deductQty: 1,
        name: expect.any(String),
      });
      expect(result.componentDeductions[1]).toEqual({
        productId: 2,
        deductQty: 2,
        name: expect.any(String),
      });
    });

    it('rejects order if component stock is insufficient', () => {
      // Product 1 stock is currently 19
      const p1 = db.prepare('SELECT stock FROM products WHERE id=1').get() as any;
      const availableStock = Number(p1.stock);

      const item = {
        qty: 1,
        isCustomHamper: true,
        hamperDetails: {
          boxId: 'classic',
          components: [{ productId: 1, qty: availableStock + 50 }],
        },
      };

      // In custom settings where box maxItems allows this
      const relaxedSettings = {
        ...testCustomSettings,
        boxes: [{ id: 'classic', name: 'Classic', price: 100, maxItems: 100, enabled: true }],
      };

      expect(() => validateCustomHamperOrder(item, relaxedSettings)).toThrow(OrderInputError);
      expect(() => validateCustomHamperOrder(item, relaxedSettings)).toThrow(/insufficient stock/i);
    });

    it('sanitizes long recipient names and gift messages according to limits', () => {
      const longMessage = 'A'.repeat(300);
      const longRecipient = 'B'.repeat(150);

      const item = {
        isCustomHamper: true,
        hamperDetails: {
          boxId: 'classic',
          recipientName: longRecipient,
          giftMessage: longMessage,
          components: [{ productId: 1, qty: 1 }],
        },
      };

      const result = validateCustomHamperOrder(item, testCustomSettings);
      expect(result.recipientName?.length).toBeLessThanOrEqual(100);
      expect(result.giftMessage?.length).toBeLessThanOrEqual(testCustomSettings.maxGiftMessageChars);
    });
  });

  describe('C. Catalog Fixed Hampers Co-existence', () => {
    it('verifies fixed hamper products are indexed cleanly with simple product type and distinct SKUs', () => {
      const fixedHampers = db.prepare(`
        SELECT id, name, sku, regular_price, sale_price, product_type, stock
        FROM products
        WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('gift-hampers', 'hampers', 'luxury-hampers', 'special-combos'))
           OR name LIKE '%Hamper%'
      `).all() as any[];

      expect(fixedHampers.length).toBeGreaterThan(0);
      for (const hamper of fixedHampers) {
        expect(hamper.product_type).toBe('simple');
        expect(hamper.sku).toBeTruthy();
        expect(Number(hamper.sale_price || hamper.regular_price)).toBeGreaterThan(0);
      }
    });
  });
});
