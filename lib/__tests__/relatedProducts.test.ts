import { describe, it, expect } from 'vitest';
import { deserializeProduct } from '../server/product-serializer';
import { validateRelatedProducts } from '../server/admin-catalog';

describe('PHASE 12B-7: Related Products', () => {
  it('parses related products from valid JSON', () => {
    const row = {
      id: 10214,
      sku: 'CK-REL-001',
      name: 'Related Cake',
      slug: 'related-cake',
      short_description: 'desc',
      description: 'desc',
      regular_price: 599,
      sale_price: 499,
      stock: 10,
      low_stock_threshold: 5,
      stock_status: 'in_stock',
      category_id: 1,
      variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 499, mrp: 599 }] }),
      related_products: JSON.stringify([
        { id: 1, name: 'Cake A', slug: 'cake-a', price: 299, regular_price: 399 },
        { id: 2, name: 'Cake B', slug: 'cake-b', price: 399 },
      ]),
    };
    const product = deserializeProduct(row)!;
    expect(product.related).toHaveLength(2);
    expect(product.related?.[0]).toMatchObject({ id: '1', name: 'Cake A', slug: 'cake-a', price: 299 });
    expect(product.related?.[1]).toMatchObject({ id: '2', name: 'Cake B', slug: 'cake-b', price: 399 });
    expect(product.related?.[0].regularPrice).toBe(399);
  });

  it('handles related_products as empty or missing', () => {
    const row = {
      id: 10215,
      sku: 'CK-REL-002',
      name: 'No Related',
      slug: 'no-related',
      short_description: 'desc',
      description: 'desc',
      regular_price: 599,
      sale_price: 499,
      stock: 10,
      low_stock_threshold: 5,
      stock_status: 'in_stock',
      category_id: 1,
      variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 499, mrp: 599 }] }),
    };
    const product = deserializeProduct(row)!;
    expect(product.related).toEqual([]);
  });

  it('handles malformed related_products safely', () => {
    const row = {
      id: 10216,
      sku: 'CK-REL-003',
      name: 'Bad Related',
      slug: 'bad-related',
      short_description: 'desc',
      description: 'desc',
      regular_price: 599,
      sale_price: 499,
      stock: 10,
      low_stock_threshold: 5,
      stock_status: 'in_stock',
      category_id: 1,
      variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 499, mrp: 599 }] }),
      related_products: '{invalid json!!!',
    };
    const product = deserializeProduct(row)!;
    expect(product.related).toEqual([]);
  });

  it('handles non-array related_products', () => {
    const row = {
      id: 10217,
      sku: 'CK-REL-004',
      name: 'Scalar Related',
      slug: 'scalar-related',
      short_description: 'desc',
      description: 'desc',
      regular_price: 599,
      sale_price: 499,
      stock: 10,
      low_stock_threshold: 5,
      stock_status: 'in_stock',
      category_id: 1,
      variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 499, mrp: 599 }] }),
      related_products: 'not-an-array',
    };
    const product = deserializeProduct(row)!;
    expect(product.related).toEqual([]);
  });

  it('filters out null entries without valid ids', () => {
    const row = {
      id: 10218,
      sku: 'CK-REL-005',
      name: 'Mixed Related',
      slug: 'mixed-related',
      short_description: 'desc',
      description: 'desc',
      regular_price: 599,
      sale_price: 499,
      stock: 10,
      low_stock_threshold: 5,
      stock_status: 'in_stock',
      category_id: 1,
      variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 499, mrp: 599 }] }),
      related_products: JSON.stringify([
        { id: 1, name: 'Valid', slug: 'valid', price: 100 },
        null,
        { name: 'No ID', price: 200 },
        'string-item',
      ]),
    };
    const product = deserializeProduct(row)!;
    expect(product.related).toHaveLength(2);
    expect(product.related?.[0].id).toBe('1');
  });

  it('handles primitive id entries in related_products', () => {
    const row = {
      id: 10219,
      sku: 'CK-REL-006',
      name: 'Primitive Related',
      slug: 'primitive-related',
      short_description: 'desc',
      description: 'desc',
      regular_price: 599,
      sale_price: 499,
      stock: 10,
      low_stock_threshold: 5,
      stock_status: 'in_stock',
      category_id: 1,
      variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 499, mrp: 599 }] }),
      related_products: JSON.stringify([1, 2, 3]),
    };
    const product = deserializeProduct(row)!;
    expect(product.related).toHaveLength(3);
    expect(product.related?.[0]).toMatchObject({ id: '1', name: '', slug: '', price: 0 });
  });

  it('handles object entries with stale/empty data', () => {
    const row = {
      id: 10220,
      sku: 'CK-REL-007',
      name: 'Stale Data',
      slug: 'stale-data',
      short_description: 'desc',
      description: 'desc',
      regular_price: 599,
      sale_price: 499,
      stock: 10,
      low_stock_threshold: 5,
      stock_status: 'in_stock',
      category_id: 1,
      variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 499, mrp: 599 }] }),
      related_products: JSON.stringify([
        { id: 99999, name: '', slug: '', price: 0, regular_price: undefined, image: '' },
      ]),
    };
    const product = deserializeProduct(row)!;
    expect(product.related).toHaveLength(1);
    expect(product.related?.[0].id).toBe('99999');
  });

  it('handles related_products with mixed valid and invalid entries', () => {
    const row = {
      id: 10221,
      sku: 'CK-REL-008',
      name: 'Mixed',
      slug: 'mixed',
      short_description: 'desc',
      description: 'desc',
      regular_price: 599,
      sale_price: 499,
      stock: 10,
      low_stock_threshold: 5,
      stock_status: 'in_stock',
      category_id: 1,
      variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 499, mrp: 599 }] }),
      related_products: JSON.stringify([
        { id: 1, name: 'Valid', slug: 'valid', price: 100 },
        { id: '', name: 'No ID', slug: '', price: 0 },
        null,
        undefined,
      ]),
    };
    const product = deserializeProduct(row)!;
    expect(product.related).toHaveLength(1);
    expect(product.related?.[0].id).toBe('1');
  });

  it('handles related_products with object entries using id_ instead of id', () => {
    const row = {
      id: 10222,
      sku: 'CK-REL-009',
      name: 'Alt ID',
      slug: 'alt-id',
      short_description: 'desc',
      description: 'desc',
      regular_price: 599,
      sale_price: 499,
      stock: 10,
      low_stock_threshold: 5,
      stock_status: 'in_stock',
      category_id: 1,
      variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 499, mrp: 599 }] }),
      related_products: JSON.stringify([
        { id: 1, product_id: 2, name: 'Product', slug: 'product', price: 100 },
      ]),
    };
    const product = deserializeProduct(row)!;
    expect(product.related).toHaveLength(1);
    expect(product.related?.[0].id).toBe('1');
  });
});

describe('PHASE 12B-8: Admin Related Products Validation', () => {
  it('rejects self-reference', () => {
    const result = validateRelatedProducts(JSON.stringify([{ id: 1, name: 'Self', slug: 'self', price: 0 }]), 1);
    expect(result).toHaveLength(0);
  });

  it('rejects self-reference for non-existent product ID', () => {
    const result = validateRelatedProducts(JSON.stringify([{ id: 99999, name: 'Self', slug: 'self', price: 0 }]), 99999);
    expect(result).toHaveLength(0);
  });

  it('accepts valid existing IDs', () => {
    // Product ID 2 exists in DB; when validating from product 1, it should be accepted.
    const result = validateRelatedProducts(JSON.stringify([{ id: 2, name: 'Choco-Vanilla Cake', slug: 'choco-vanilla-cake', price: 0 }]), 1);
    expect(result).toContain(2);
  });

  it('rejects non-existent IDs', () => {
    const result = validateRelatedProducts(JSON.stringify([{ id: 99999, name: 'Ghost', slug: 'ghost', price: 0 }]), 1);
    expect(result).toHaveLength(0);
  });

  it('rejects mixed valid and invalid IDs', () => {
    // ID 2 exists, ID 99999 doesn't
    const result = validateRelatedProducts(JSON.stringify([
      { id: 2, name: 'Valid', slug: 'valid', price: 0 },
      { id: 99999, name: 'Invalid', slug: 'invalid', price: 0 },
    ]), 1);
    expect(result).toContain(2);
    expect(result).not.toContain(99999);
  });

  it('removes duplicates', () => {
    const result = validateRelatedProducts(JSON.stringify([
      { id: 2, name: 'A', slug: 'a', price: 0 },
      { id: 2, name: 'A2', slug: 'a2', price: 0 },
    ]), 1);
    expect(result).toHaveLength(1);
    expect(result).toContain(2);
  });

  it('handles non-array input gracefully', () => {
    expect(validateRelatedProducts('not-an-array', 1)).toHaveLength(0);
    expect(validateRelatedProducts(123, 1)).toHaveLength(0);
    expect(validateRelatedProducts(undefined, 1)).toHaveLength(0);
    expect(validateRelatedProducts(null, 1)).toHaveLength(0);
  });

  it('handles string JSON input', () => {
    const result = validateRelatedProducts(JSON.stringify([1, 2, 3]), 1);
    expect(Array.isArray(result)).toBe(true);
  });

  it('handles empty input', () => {
    expect(validateRelatedProducts([], 1)).toHaveLength(0);
    expect(validateRelatedProducts('', 1)).toHaveLength(0);
    expect(validateRelatedProducts('[]', 1)).toHaveLength(0);
  });

  it('handles primitive id entries', () => {
    const result = validateRelatedProducts(JSON.stringify([2, 3]), 1);
    expect(result).toContain(2);
    expect(result).toContain(3);
  });
});
