import { describe, it, expect } from 'vitest';
import { db } from '../db';
import { listVariants, getVariant, getVariantBySku, createVariant, updateVariant, deleteVariant, adjustVariantStock, getVariantAdjustments, listActiveVariants, getVariantStockStatus } from '../product-variants';

describe('product-variants.ts', () => {
  let testProductId: number;

  beforeEach(() => {
    const info = db.prepare('INSERT INTO products (sku, name, slug, stock, low_stock_threshold, status) VALUES (?,?,?,?,?,?)')
      .run('VART-TEST', 'Test Variant Product', 'test-variant-product', 10, 5, 'publish');
    testProductId = Number(info.lastInsertRowid);
  });

  afterEach(() => {
    db.prepare('DELETE FROM variant_stock_adjustments WHERE product_id=?').run(testProductId);
    db.prepare('DELETE FROM product_variants WHERE product_id=?').run(testProductId);
    db.prepare('DELETE FROM products WHERE id=?').run(testProductId);
  });

  describe('createVariant', () => {
  it('should create a variant', () => {
    console.log('testProductId:', testProductId, 'type:', typeof testProductId);
    let variant: any;
      let err: any;
    try {
        variant = createVariant(testProductId, { sku: 'VART-001', label: '0.5 Kg', price: 529, stock: 10 }, null);
        console.log('variant:', JSON.stringify(variant));
      } catch (e) { err = e; console.error('createVariant error:', e); }
      if (err) { console.error('createVariant error:', err); throw err; }
      expect(variant.id).toBeGreaterThan(0);
      expect(variant.productId).toBe(testProductId);
      expect(variant.sku).toBe('VART-001');
      expect(variant.stock).toBe(10);
      expect(variant.stockStatus).toBe('in_stock');
    });

    it('should reject duplicate SKU', () => {
      createVariant(testProductId, { sku: 'VART-001', label: '0.5 Kg', price: 529 }, null);
      expect(() => createVariant(testProductId, { sku: 'VART-001', label: '1 Kg', price: 949 }, null)).toThrow('SKU "VART-001" already exists');
    });

    it('should reject empty SKU', () => {
      expect(() => createVariant(testProductId, { sku: '', label: '0.5 Kg', price: 529 }, null)).toThrow('Variant SKU is required');
    });

    it('should set stock status correctly', () => {
      const low = createVariant(testProductId, { sku: 'VART-LOW', label: 'Low', price: 529, stock: 3, lowStockThreshold: 5 }, null);
      expect(low.stockStatus).toBe('low_stock');
      const out = createVariant(testProductId, { sku: 'VART-OUT', label: 'Out', price: 529, stock: 0 }, null);
      expect(out.stockStatus).toBe('out_of_stock');
    });
  });

  describe('listVariants', () => {
    it('should return variants for a product', () => {
      createVariant(testProductId, { sku: 'VART-001', label: 'A', price: 100 }, null);
      createVariant(testProductId, { sku: 'VART-002', label: 'B', price: 200 }, null);
      const variants = listVariants(testProductId);
      expect(variants).toHaveLength(2);
    });

    it('should return empty for product with no variants', () => {
      const variants = listVariants(99999);
      expect(variants).toHaveLength(0);
    });
  });

  describe('listActiveVariants', () => {
    it('should return only active variants', () => {
      createVariant(testProductId, { sku: 'VART-001', label: 'A', price: 100 }, null);
      const v2 = createVariant(testProductId, { sku: 'VART-002', label: 'B', price: 200 }, null);
      updateVariant(v2.id, { status: 'inactive' }, null);
      const active = listActiveVariants(testProductId);
      expect(active).toHaveLength(1);
      expect(active[0].status).toBe('active');
    });
  });

  describe('updateVariant', () => {
    it('should update variant fields', () => {
      const variant = createVariant(testProductId, { sku: 'VART-001', label: 'A', price: 100, stock: 5 }, null);
      const updated = updateVariant(variant.id, { price: 150, stock: 3 }, null);
      expect(updated!.price).toBe(150);
      expect(updated!.stock).toBe(3);
      expect(updated!.stockStatus).toBe('low_stock');
    });

    it('should return null for non-existent variant', () => {
      expect(updateVariant(99999, { price: 150 }, null)).toBeNull();
    });
  });

  describe('deleteVariant', () => {
    it('should delete variant', () => {
      const variant = createVariant(testProductId, { sku: 'VART-001', label: 'A', price: 100 }, null);
      expect(deleteVariant(variant.id)).toBe(true);
      expect(getVariant(variant.id)).toBeNull();
    });

    it('should return false for non-existent variant', () => {
      expect(deleteVariant(99999)).toBe(false);
    });
  });

  describe('getVariantBySku', () => {
    it('should find variant by SKU', () => {
      createVariant(testProductId, { sku: 'VART-SKU', label: 'A', price: 100 }, null);
      const variant = getVariantBySku('VART-SKU');
      expect(variant).not.toBeNull();
      expect(variant!.sku).toBe('VART-SKU');
    });

    it('should return null for unknown SKU', () => {
      expect(getVariantBySku('UNKNOWN')).toBeNull();
    });
  });

  describe('adjustVariantStock', () => {
    it('should adjust stock positively', () => {
      const variant = createVariant(testProductId, { sku: 'VART-ADJ', label: 'A', price: 100, stock: 5 }, null);
      const result = adjustVariantStock(variant.id, 10, 'stock received', null);
      expect(result.adjustment.adjustmentQuantity).toBe(10);
      expect(result.adjustment.resultingQuantity).toBe(15);
      expect(result.variant.stock).toBe(15);
    });

    it('should adjust stock negatively', () => {
      const variant = createVariant(testProductId, { sku: 'VART-ADJ', label: 'A', price: 100, stock: 5 }, null);
      const result = adjustVariantStock(variant.id, -3, 'order fulfilled', null);
      expect(result.adjustment.adjustmentQuantity).toBe(-3);
      expect(result.adjustment.resultingQuantity).toBe(2);
      expect(result.variant.stock).toBe(2);
    });

    it('should clamp stock at 0', () => {
      const variant = createVariant(testProductId, { sku: 'VART-ADJ', label: 'A', price: 100, stock: 2 }, null);
      const result = adjustVariantStock(variant.id, -10, 'over-adjusted', null);
      expect(result.adjustment.resultingQuantity).toBe(0);
      expect(result.variant.stock).toBe(0);
      expect(result.variant.stockStatus).toBe('out_of_stock');
    });

    it('should record adjustment reason', () => {
      const variant = createVariant(testProductId, { sku: 'VART-ADJ', label: 'A', price: 100, stock: 5 }, null);
      const result = adjustVariantStock(variant.id, 5, 'stock received', null);
      expect(result.adjustment.reason).toBe('stock received');
    });

    it('should throw for non-existent variant', () => {
      expect(() => adjustVariantStock(99999, 5, 'test', null)).toThrow('Variant not found');
    });
  });

  describe('getVariantAdjustments', () => {
    it('should return adjustment history', () => {
      const variant = createVariant(testProductId, { sku: 'VART-ADJ', label: 'A', price: 100, stock: 5 }, null);
      adjustVariantStock(variant.id, 5, 'received', null);
      adjustVariantStock(variant.id, -2, 'sold', null);
      const adjustments = getVariantAdjustments(variant.id);
      expect(adjustments).toHaveLength(2);
      expect(adjustments[0].reason).toBe('sold');
      expect(adjustments[1].reason).toBe('received');
    });
  });

  describe('getVariantStockStatus', () => {
    it('should return in_stock for adequate stock', () => {
      createVariant(testProductId, { sku: 'VART-ST', label: 'A', price: 100, stock: 10 }, null);
      expect(getVariantStockStatus(testProductId)).toBe('in_stock');
    });

    it('should return low_stock for low stock', () => {
      createVariant(testProductId, { sku: 'VART-ST', label: 'A', price: 100, stock: 2, lowStockThreshold: 5 }, null);
      expect(getVariantStockStatus(testProductId)).toBe('low_stock');
    });

    it('should return out_of_stock for zero stock', () => {
      createVariant(testProductId, { sku: 'VART-ST', label: 'A', price: 100, stock: 0 }, null);
      expect(getVariantStockStatus(testProductId)).toBe('out_of_stock');
    });
  });
});
