import { describe, it, expect } from 'vitest';
import { deserializeProduct } from '../server/product-serializer';

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
});
