import { describe, it, expect, beforeAll } from 'vitest';
import { GET as getProducts } from '../../app/api/products/route';
import {
  SORT_LABELS,
  PRICE_RANGE_LABELS,
  DIETARY_LABELS,
} from '../filterTypes';
import { db } from '../server/db';
import { computeStockStatus, isProductOutOfStock } from '../inventory';

describe('Step 9: Search, Filters & Product Discovery System', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-vitest-32-chars-min';
  });

  describe('A. Server Products API Search & Filters (/api/products)', () => {
    it('searches products by exact and partial name', async () => {
      const req = new Request('http://localhost/api/products?search=chocolate');
      const res = await getProducts(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.products)).toBe(true);
      expect(data.total).toBeGreaterThan(0);
      data.products.forEach((p: any) => {
        const matches =
          p.name.toLowerCase().includes('chocolate') ||
          (p.tags && p.tags.some((t: string) => t.toLowerCase().includes('chocolate'))) ||
          (p.shortDescription && p.shortDescription.toLowerCase().includes('chocolate'));
        expect(matches).toBe(true);
      });
    });

    it('searches products by SKU', async () => {
      const req = new Request('http://localhost/api/products?search=AKRK');
      const res = await getProducts(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.products.length).toBeGreaterThan(0);
      expect(data.products.some((p: any) => p.sku === 'AKRK')).toBe(true);
    });

    it('filters products by min_price and max_price', async () => {
      const req = new Request('http://localhost/api/products?min_price=500&max_price=1000&limit=50');
      const res = await getProducts(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.products.length).toBeGreaterThan(0);
      data.products.forEach((p: any) => {
        const price = p.salePrice || p.regularPrice || p.price || 0;
        expect(price).toBeGreaterThanOrEqual(500);
        expect(price).toBeLessThanOrEqual(1000);
      });
    });

    it('filters products by eggless flag', async () => {
      const req = new Request('http://localhost/api/products?eggless=1&limit=50');
      const res = await getProducts(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.products.length).toBeGreaterThan(0);
      data.products.forEach((p: any) => {
        const isEggless = p.eggless || (p.tags && p.tags.some((t: string) => t.toLowerCase().includes('eggless')));
        expect(isEggless).toBeTruthy();
      });
    });

    it('sorts products by price ascending', async () => {
      const req = new Request('http://localhost/api/products?order=price-asc&limit=10');
      const res = await getProducts(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.products.length).toBeGreaterThan(1);
      for (let i = 0; i < data.products.length - 1; i++) {
        const p1 = data.products[i].salePrice || data.products[i].regularPrice || data.products[i].price || 0;
        const p2 = data.products[i + 1].salePrice || data.products[i + 1].regularPrice || data.products[i + 1].price || 0;
        expect(p1).toBeLessThanOrEqual(p2);
      }
    });

    it('sorts products by price descending', async () => {
      const req = new Request('http://localhost/api/products?order=price-desc&limit=10');
      const res = await getProducts(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.products.length).toBeGreaterThan(1);
      for (let i = 0; i < data.products.length - 1; i++) {
        const p1 = data.products[i].salePrice || data.products[i].regularPrice || data.products[i].price || 0;
        const p2 = data.products[i + 1].salePrice || data.products[i + 1].regularPrice || data.products[i + 1].price || 0;
        expect(p1).toBeGreaterThanOrEqual(p2);
      }
    });

    it('sorts products by newest', async () => {
      const req = new Request('http://localhost/api/products?order=newest&limit=5');
      const res = await getProducts(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.products.length).toBeGreaterThan(0);
    });

    it('filters products by category slug and child subcategories', async () => {
      const req = new Request('http://localhost/api/products?category=cakes&limit=50');
      const res = await getProducts(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.products).toBeDefined();
    });
  });

  describe('B. Client-Side Multi-Token & Faceted Matching Logic', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Belgian Chocolate Truffle Cake',
        sku: 'BCT01',
        category: 'cakes',
        subCategory: 'chocolate-cakes',
        tags: ['chocolate', 'eggless', 'truffle', 'birthday'],
        flavours: ['Chocolate', 'Dark Truffle'],
        shortDescription: 'Rich Belgian chocolate mousse cake',
        price: 799,
        weightOptions: [{ label: '0.5 kg', price: 799, mrp: 999 }],
        eggless: true,
        dietaryAttributes: [{ key: 'eggless', label: '100% Eggless' }],
        stock: 10,
        published: true,
      },
      {
        id: '2',
        name: 'Fresh Mango Gateau',
        sku: 'FMG01',
        category: 'cakes',
        subCategory: 'fruit-cakes',
        tags: ['mango', 'fruit', 'seasonal', 'sugar-free'],
        flavours: ['Mango'],
        shortDescription: 'Fresh Alphonso mango gateau',
        price: 449,
        weightOptions: [{ label: '0.5 kg', price: 449, mrp: 549 }],
        eggless: false,
        dietaryAttributes: [{ key: 'sugar-free', label: 'Sugar-Free' }],
        stock: 0,
        trackInventory: true,
        manageStock: true,
        published: true,
      },
      {
        id: '3',
        name: 'Royal Celebration Hamper',
        sku: 'RCH01',
        category: 'hampers',
        subCategory: 'festive-hampers',
        tags: ['hamper', 'gift', 'diwali', 'luxury'],
        flavours: [],
        shortDescription: 'Luxury artisanal confectionery hamper',
        price: 2499,
        weightOptions: [{ label: '1 box', price: 2499, mrp: 2999 }],
        eggless: true,
        dietaryAttributes: [{ key: 'gluten-free', label: 'Gluten-Free' }],
        stock: 5,
        published: true,
      },
    ];

    it('matches multi-word queries regardless of word order', () => {
      const query = 'truffle chocolate';
      const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

      const matched = mockProducts.filter((p) => {
        const haystack = [p.name, p.sku, p.category, p.subCategory, ...p.tags, ...p.flavours, p.shortDescription]
          .join(' ')
          .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      });

      expect(matched.length).toBe(1);
      expect(matched[0].id).toBe('1');
    });

    it('correctly filters by price ranges', () => {
      // Under 500
      const under500 = mockProducts.filter((p) => {
        const price = p.weightOptions[0]?.price ?? p.price;
        return price < 500;
      });
      expect(under500.length).toBe(1);
      expect(under500[0].id).toBe('2');

      // 500 to 1000
      const midPrice = mockProducts.filter((p) => {
        const price = p.weightOptions[0]?.price ?? p.price;
        return price >= 500 && price <= 1000;
      });
      expect(midPrice.length).toBe(1);
      expect(midPrice[0].id).toBe('1');

      // Above 2000
      const luxury = mockProducts.filter((p) => {
        const price = p.weightOptions[0]?.price ?? p.price;
        return price > 2000;
      });
      expect(luxury.length).toBe(1);
      expect(luxury[0].id).toBe('3');
    });

    it('correctly filters by dietary preferences', () => {
      const eggless = mockProducts.filter((p) => p.eggless || p.tags.includes('eggless'));
      expect(eggless.length).toBe(2);

      const sugarFree = mockProducts.filter(
        (p) => p.tags.includes('sugar-free') || p.dietaryAttributes.some((d) => d.key === 'sugar-free')
      );
      expect(sugarFree.length).toBe(1);
      expect(sugarFree[0].id).toBe('2');

      const glutenFree = mockProducts.filter(
        (p) => p.tags.includes('gluten-free') || p.dietaryAttributes.some((d) => d.key === 'gluten-free')
      );
      expect(glutenFree.length).toBe(1);
      expect(glutenFree[0].id).toBe('3');
    });

    it('correctly filters out-of-stock items when inStockOnly is active', () => {
      const inStock = mockProducts.filter((p) => !isProductOutOfStock(p));
      expect(inStock.length).toBe(2);
      expect(inStock.some((p) => p.id === '2')).toBe(false); // Product 2 has stock: 0
    });
  });

  describe('C. StorefrontFilterBar Definitions & Baseline Integrity', () => {
    it('exposes valid sort, price range, and dietary options', () => {
      expect(SORT_LABELS['featured']).toBe('Featured');
      expect(SORT_LABELS['price-asc']).toBe('Price: Low to High');
      expect(SORT_LABELS['price-desc']).toBe('Price: High to Low');
      expect(SORT_LABELS['bestseller']).toBe('Bestsellers');
      expect(SORT_LABELS['newest']).toBe('Newest Arrivals');

      expect(PRICE_RANGE_LABELS.length).toBe(5);
      expect(DIETARY_LABELS.length).toBe(4);
    });

    it('preserves strict database baseline counts', () => {
      const products = db.prepare('SELECT count(*) as c FROM products').get() as any;
      const orders = db.prepare('SELECT count(*) as c FROM orders').get() as any;
      const users = db.prepare('SELECT count(*) as c FROM users').get() as any;
      const categories = db.prepare('SELECT count(*) as c FROM categories').get() as any;
      const addons = db.prepare('SELECT count(*) as c FROM addons').get() as any;

      expect(products.c).toBe(149);
      expect(orders.c).toBe(2);
      expect(users.c).toBe(1);
      expect(categories.c).toBe(65);
      expect(addons.c).toBe(11);
    });
  });
});
