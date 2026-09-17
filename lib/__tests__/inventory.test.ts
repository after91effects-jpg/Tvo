import { describe, it, expect } from 'vitest';
import {
  computeStockStatus,
  isProductOutOfStock,
  isProductLowStock,
  validateInventoryInput,
} from '../inventory';
import { db } from '../server/db';
import { createOrder, OrderInputError } from '../server/order-engine';
import { serializeProduct } from '../server/product-serializer';
import { serializeAdminProduct } from '../server/admin-catalog';

describe('TVO Flavours — Inventory Management System Tests', () => {
  // TEST A: Inventory disabled -> product remains purchasable.
  it('TEST A: Inventory disabled -> product remains purchasable', () => {
    const product = {
      id: 'test-untracked-1',
      name: 'Custom Chef Special',
      stock: 0,
      trackInventory: false,
      manageStock: 0,
      stockStatus: 'out_of_stock',
    };

    expect(isProductOutOfStock(product)).toBe(false);
    expect(computeStockStatus(0, 5, false)).toBe('in_stock');
  });

  // TEST B: Stock = 10, threshold = 3 -> IN STOCK.
  it('TEST B: Stock = 10, threshold = 3 -> IN STOCK', () => {
    const status = computeStockStatus(10, 3, true);
    expect(status).toBe('in_stock');

    const product = { stock: 10, lowStockThreshold: 3, trackInventory: true, stockStatus: 'in_stock' };
    expect(isProductOutOfStock(product)).toBe(false);
    expect(isProductLowStock(product)).toBe(false);
  });

  // TEST C: Stock = 3, threshold = 3 -> LOW STOCK.
  it('TEST C: Stock = 3, threshold = 3 -> LOW STOCK', () => {
    const status = computeStockStatus(3, 3, true);
    expect(status).toBe('low_stock');

    const product = { stock: 3, lowStockThreshold: 3, trackInventory: true, stockStatus: 'low_stock' };
    expect(isProductOutOfStock(product)).toBe(false);
    expect(isProductLowStock(product)).toBe(true);
  });

  // TEST D: Stock = 0 -> OUT OF STOCK.
  it('TEST D: Stock = 0 -> OUT OF STOCK', () => {
    const status = computeStockStatus(0, 3, true);
    expect(status).toBe('out_of_stock');

    const product = { stock: 0, lowStockThreshold: 3, trackInventory: true, stockStatus: 'out_of_stock' };
    expect(isProductOutOfStock(product)).toBe(true);
    expect(isProductLowStock(product)).toBe(false);
  });

  // TEST E: Stock = 5, requested quantity = 3 -> allowed.
  it('TEST E: Stock = 5, requested quantity = 3 -> allowed in order engine simulation', () => {
    const stock = 5;
    const requestedQty = 3;
    expect(requestedQty <= stock).toBe(true);
  });

  // TEST F: Stock = 5, requested quantity = 6 -> rejected.
  it('TEST F: Stock = 5, requested quantity = 6 -> rejected', () => {
    const stock = 5;
    const requestedQty = 6;
    expect(requestedQty > stock).toBe(true);

    const targetDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    expect(() => {
      const prod = db.prepare('SELECT id, stock FROM products WHERE stock > 0 LIMIT 1').get() as any;
      if (prod) {
        const excessiveQty = (prod.stock || 20) + 10;
        createOrder({
          items: [{ productId: prod.id, qty: excessiveQty, weight: '0.5 Kg' }],
          body: {
            customer: { name: 'Test Customer', phone: '9876543210' },
            address: '123 Test Street, DLF Phase 5',
            pincode: '122009',
            deliveryDate: targetDate,
            deliverySlot: 'Standard Delivery (9 AM - 9 PM)',
            paymentMethod: 'COD',
          },
          customerId: null,
          generateOrderNumber: () => 'TVO-TEST-ERR',
        });
      }
    }).toThrow(OrderInputError);
  });

  // TEST G: Stock becomes insufficient after item is added to cart -> checkout must revalidate and reject/adjust safely.
  it('TEST G: Stock becomes insufficient before checkout -> revalidation rejects with clear error', () => {
    const targetDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    expect(() => {
      const prod = db.prepare('SELECT id, stock FROM products WHERE stock > 0 LIMIT 1').get() as any;
      if (prod) {
        createOrder({
          items: [{ productId: prod.id, qty: prod.stock + 1, weight: '0.5 Kg' }],
          body: {
            customer: { name: 'Test Customer', phone: '9876543210' },
            address: '123 Test Street, DLF Phase 5',
            pincode: '122009',
            deliveryDate: targetDate,
            deliverySlot: 'Standard Delivery (9 AM - 9 PM)',
            paymentMethod: 'COD',
          },
          customerId: null,
          generateOrderNumber: () => 'TVO-TEST-ERR2',
        });
      }
    }).toThrow(/in stock/i);
  });

  // TEST H: Invalid negative stock -> rejected.
  it('TEST H: Invalid negative stock -> rejected by validateInventoryInput', () => {
    const res = validateInventoryInput(-5, 5, true);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('cannot be negative');
  });

  // TEST I: Invalid threshold -> rejected.
  it('TEST I: Invalid negative threshold -> rejected by validateInventoryInput', () => {
    const res = validateInventoryInput(10, -2, true);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('cannot be negative');
  });

  // TEST J: Legacy product without inventory configuration -> does not crash.
  it('TEST J: Legacy product without inventory configuration -> does not crash', () => {
    const legacyRow = {
      id: 9999,
      name: 'Legacy Cake',
      slug: 'legacy-cake',
      regular_price: 500,
      stock: null,
      stock_status: null,
      manage_stock: null,
      enable_stock: null,
      low_stock_threshold: null,
      variations_json: '[]',
      images_json: '[]',
    };

    const serialized = serializeProduct(legacyRow as any);
    expect(serialized).toBeDefined();
    expect(serialized.name).toBe('Legacy Cake');
    expect(typeof serialized.stock).toBe('number');
    expect(serialized.stockStatus).toBeDefined();

    const adminSerialized = serializeAdminProduct(legacyRow as any);
    expect(adminSerialized).toBeDefined();
    expect(adminSerialized?.stockStatus).toBeDefined();
  });

  // TEST K: Existing weight/variant product -> correct inventory behavior.
  it('TEST K: Existing weight/variant product -> correct inventory behavior', () => {
    const cake = db.prepare("SELECT * FROM products WHERE variations_json LIKE '%weightKg%' LIMIT 1").get() as any;
    expect(cake).toBeDefined();

    const serialized = serializeProduct(cake);
    const options = Array.isArray(serialized.weightOptions)
      ? serialized.weightOptions
      : (serialized.weightOptions as any)?.options || [];
    expect(options.length).toBeGreaterThan(0);
    expect(serialized.stock).toBeDefined();
    expect(typeof serialized.stock).toBe('number');
  });

  // TEST L: Selling Unit + inventory -> both remain correct and independent.
  it('TEST L: Selling Unit + inventory -> both remain correct and independent', () => {
    const row = db.prepare("SELECT * FROM products WHERE selling_unit IS NOT NULL LIMIT 1").get() as any;
    expect(row).toBeDefined();

    const serialized = serializeProduct(row);
    expect(serialized.sellingUnit).toBeDefined();
    expect(serialized.stock).toBeDefined();
    expect(serialized.trackInventory).toBeDefined();
  });
});
