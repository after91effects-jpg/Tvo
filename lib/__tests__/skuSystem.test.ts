import { describe, it, expect } from 'vitest';
import {
  normalizeSku,
  validateSkuFormat,
  getProductAbbreviation,
  suggestSku,
  normalizeVariantWeightSuffix,
  suggestVariantSku,
  MIN_SKU_LENGTH,
  MAX_SKU_LENGTH,
} from '../sku';

describe('SKU System & Catalog Engine (Step 5)', () => {
  describe('A. SKU Normalization', () => {
    it('trims whitespace and converts to uppercase', () => {
      expect(normalizeSku('  tvo-choc-01  ')).toBe('TVO-CHOC-01');
      expect(normalizeSku('cake biscoff')).toBe('CAKE-BISCOFF');
    });

    it('cleans invalid characters into hyphens', () => {
      expect(normalizeSku('TVO / CHOC / 01')).toBe('TVO-CHOC-01');
      expect(normalizeSku('TVO...CAKE##01')).toBe('TVO-CAKE01');
      expect(normalizeSku('---TEST-SKU---')).toBe('TEST-SKU');
    });

    it('handles empty or null safely', () => {
      expect(normalizeSku(null)).toBe('');
      expect(normalizeSku(undefined)).toBe('');
      expect(normalizeSku('')).toBe('');
    });
  });

  describe('B. SKU Format Validation', () => {
    it('accepts valid alphanumeric, hyphenated, and underscore SKUs', () => {
      expect(validateSkuFormat('PC').valid).toBe(true);
      expect(validateSkuFormat('RH-TEATIME').valid).toBe(true);
      expect(validateSkuFormat('E2E-ADMIN-001').valid).toBe(true);
      expect(validateSkuFormat('TVO_CAKE_01').valid).toBe(true);
    });

    it('rejects empty or whitespace-only SKUs', () => {
      const res = validateSkuFormat('   ');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('SKU is required');
    });

    it('enforces minimum length of 2 characters', () => {
      const res = validateSkuFormat('A');
      expect(res.valid).toBe(false);
      expect(res.error).toContain(`at least ${MIN_SKU_LENGTH} characters`);
    });

    it('enforces maximum length of 32 characters', () => {
      const longSku = 'A'.repeat(MAX_SKU_LENGTH + 5);
      const res = validateSkuFormat(longSku);
      expect(res.valid).toBe(false);
      expect(res.error).toContain(`cannot exceed ${MAX_SKU_LENGTH} characters`);
    });

    it('rejects reserved system keywords', () => {
      expect(validateSkuFormat('NULL').valid).toBe(false);
      expect(validateSkuFormat('TEST').valid).toBe(false);
      expect(validateSkuFormat('ADMIN').valid).toBe(false);
      expect(validateSkuFormat('DRAFT').valid).toBe(false);
    });
  });

  describe('C. Product Abbreviation & Suggested Base SKU', () => {
    it('generates clean acronyms for multi-word cake names', () => {
      expect(getProductAbbreviation('Pineapple Cake')).toBe('PC');
      expect(getProductAbbreviation('Choco Chip Truffle Cake')).toBe('CCTC');
      expect(getProductAbbreviation('Belgian Chocolate Cake')).toBe('BCC');
    });

    it('generates standardized suggestion with category code', () => {
      expect(suggestSku('Pineapple Cake', 'fruit-cakes')).toBe('TVO-FRUIT-PC');
      expect(suggestSku('Truffle Cake', 'chocolate')).toBe('TVO-CHOC-TC');
      expect(suggestSku('Luxury Hamper', 'hampers')).toBe('TVO-HAMPER-LH');
      expect(suggestSku('Custom Photo Cake', null)).toBe('TVO-TVO-CPC');
    });
  });

  describe('D. Variant SKU Suffix & Generation', () => {
    it('normalizes weight labels to standard suffixes', () => {
      expect(normalizeVariantWeightSuffix('0.5 Kg')).toBe('500G');
      expect(normalizeVariantWeightSuffix('1 Kg')).toBe('1KG');
      expect(normalizeVariantWeightSuffix('1.5 Kg')).toBe('1-5KG');
      expect(normalizeVariantWeightSuffix('2 Kg')).toBe('2KG');
      expect(normalizeVariantWeightSuffix('250 g')).toBe('250G');
      expect(normalizeVariantWeightSuffix('Pack of 6')).toBe('6PK');
    });

    it('combines base SKU with variant suffix cleanly', () => {
      expect(suggestVariantSku('PC', '0.5 Kg')).toBe('PC-500G');
      expect(suggestVariantSku('PC', '1 Kg')).toBe('PC-1KG');
      expect(suggestVariantSku('TVO-CHOC-TC', '1.5 Kg')).toBe('TVO-CHOC-TC-1-5KG');
      expect(suggestVariantSku('RH-COOKIE', 'Pack of 12')).toBe('RH-COOKIE-12PK');
    });
  });

  describe('E. Database Uniqueness & Order Snapshot Preservation', () => {
    it('detects existing SKU collision case-insensitively', async () => {
      const { db } = await import('../server/db');
      // "pc" (lowercase) must match existing "PC" (Product 1 Pineapple Cake)
      const existing = db
        .prepare('SELECT id, name, sku FROM products WHERE lower(sku) = lower(?)')
        .get('pc') as any;

      expect(existing).toBeDefined();
      expect(existing.id).toBe(1);
      expect(existing.sku).toBe('PC');
      expect(existing.name).toBe('Pineapple Cake');
    });

    it('verifies non-existent SKU is available', async () => {
      const { db } = await import('../server/db');
      const nonExistent = db
        .prepare('SELECT id FROM products WHERE lower(sku) = lower(?)')
        .get('TVO-NON-EXISTENT-SKU-XYZ-999');

      expect(nonExistent).toBeUndefined();
    });

    it('confirms existing orders preserve SKU snapshots in line items', async () => {
      const { db } = await import('../server/db');
      const orderRows = db.prepare('SELECT id, order_number, items FROM orders ORDER BY id ASC').all() as any[];
      expect(orderRows.length).toBe(2);

      const order1Items = JSON.parse(orderRows[0].items);
      expect(order1Items[0].sku).toBe('AKRK');

      const order2Items = JSON.parse(orderRows[1].items);
      expect(order2Items[0].sku).toBe('PC');
    });
  });
});

