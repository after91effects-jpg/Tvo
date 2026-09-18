import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { db } from '../server/db';
import { bulkAction } from '../server/admin-catalog';
import { hasPermission } from '../server/permissions';
import type { User } from '../types';

const mockAdminUser: User = {
  id: 'usr_admin_1',
  name: 'Admin Tester',
  email: 'admin@tvoflavours.com',
  role: 'admin',
};

const mockCatalogManager: User = {
  id: 'usr_catalog_1',
  name: 'Catalog Manager',
  email: 'catalog@tvoflavours.com',
  role: 'catalog_manager',
};

const mockUnauthorizedUser: User = {
  id: 'usr_seo_1',
  name: 'SEO Specialist',
  email: 'seo@tvoflavours.com',
  role: 'seo_manager',
};

describe('Product Bulk Editor (Phase 2)', () => {
  const testProductIds = [1, 2, 3];
  let originalSnapshots: any[] = [];

  // Snapshot original rows before any tests run
  const snapshotOriginals = () => {
    return db.prepare('SELECT * FROM products WHERE id IN (1, 2, 3)').all() as any[];
  };

  const restoreOriginals = (snapshots: any[]) => {
    for (const orig of snapshots) {
      db.prepare(`
        UPDATE products SET
          regular_price = ?,
          sale_price = ?,
          stock = ?,
          stock_status = ?,
          published = ?,
          featured = ?,
          selling_unit = ?,
          dietary_json = ?,
          eggless = ?,
          deleted_at = ?,
          status = ?
        WHERE id = ?
      `).run(
        orig.regular_price,
        orig.sale_price,
        orig.stock,
        orig.stock_status,
        orig.published,
        orig.featured,
        orig.selling_unit,
        orig.dietary_json,
        orig.eggless,
        orig.deleted_at,
        orig.status,
        orig.id
      );
    }
  };

  beforeEach(() => {
    if (originalSnapshots.length === 0) {
      originalSnapshots = snapshotOriginals();
    }

    // Set known clean baseline on products 1, 2, 3 without inserting new rows
    db.prepare(`UPDATE products SET regular_price=500, sale_price=450, stock=20, stock_status='in_stock', published=1, featured=0, selling_unit='weight', dietary_json='[]', eggless=1, deleted_at=NULL, status='publish' WHERE id=1`).run();
    db.prepare(`UPDATE products SET regular_price=800, sale_price=NULL, stock=15, stock_status='in_stock', published=0, featured=1, selling_unit='piece', dietary_json='[]', eggless=0, deleted_at=NULL, status='draft' WHERE id=2`).run();
    db.prepare(`UPDATE products SET regular_price=1000, sale_price=900, stock=5, stock_status='low_stock', published=1, featured=0, selling_unit='pack', dietary_json='[]', eggless=1, deleted_at=NULL, status='publish' WHERE id=3`).run();
  });

  afterEach(() => {
    restoreOriginals(originalSnapshots);
  });

  afterAll(() => {
    restoreOriginals(originalSnapshots);
  });

  describe('1. Permission Verification', () => {
    it('allows admin and catalog_manager to bulk edit products', () => {
      expect(hasPermission(mockAdminUser.role, 'bulk_edit_products')).toBe(true);
      expect(hasPermission(mockCatalogManager.role, 'bulk_edit_products')).toBe(true);
    });

    it('denies seo_manager and unauthorized roles from bulk edit products', () => {
      expect(hasPermission(mockUnauthorizedUser.role, 'bulk_edit_products')).toBe(false);
    });
  });

  describe('2. Bulk Price Updates', () => {
    it('sets absolute regular price for all selected products', () => {
      const res = bulkAction(
        {
          ids: testProductIds,
          action: 'price',
          targetField: 'regular_price',
          mode: 'set',
          value: 750,
        },
        mockAdminUser
      );

      expect(res.ok).toBe(true);
      expect(res.count).toBe(3);

      for (const id of testProductIds) {
        const row = db.prepare('SELECT regular_price FROM products WHERE id=?').get(id) as any;
        expect(row.regular_price).toBe(750);
      }
    });

    it('adjusts regular price by a fixed delta (+₹50)', () => {
      bulkAction(
        {
          ids: testProductIds,
          action: 'price',
          targetField: 'regular_price',
          mode: 'adjust_fixed',
          value: 50,
        },
        mockAdminUser
      );

      const r1 = db.prepare('SELECT regular_price FROM products WHERE id=?').get(testProductIds[0]) as any;
      const r2 = db.prepare('SELECT regular_price FROM products WHERE id=?').get(testProductIds[1]) as any;
      const r3 = db.prepare('SELECT regular_price FROM products WHERE id=?').get(testProductIds[2]) as any;

      expect(r1.regular_price).toBe(550); // 500 + 50
      expect(r2.regular_price).toBe(850); // 800 + 50
      expect(r3.regular_price).toBe(1050); // 1000 + 50
    });

    it('adjusts regular price by percentage (+10%)', () => {
      bulkAction(
        {
          ids: [testProductIds[0], testProductIds[1]],
          action: 'price',
          targetField: 'regular_price',
          mode: 'adjust_percent',
          value: 10,
        },
        mockAdminUser
      );

      const r1 = db.prepare('SELECT regular_price FROM products WHERE id=?').get(testProductIds[0]) as any;
      const r2 = db.prepare('SELECT regular_price FROM products WHERE id=?').get(testProductIds[1]) as any;

      expect(r1.regular_price).toBe(550); // 500 * 1.10
      expect(r2.regular_price).toBe(880); // 800 * 1.10
    });

    it('prevents negative price adjustments and clamps at zero', () => {
      bulkAction(
        {
          ids: [testProductIds[0]],
          action: 'price',
          targetField: 'regular_price',
          mode: 'adjust_fixed',
          value: -9999,
        },
        mockAdminUser
      );

      const r = db.prepare('SELECT regular_price FROM products WHERE id=?').get(testProductIds[0]) as any;
      expect(r.regular_price).toBe(0);
    });

    it('clears sale price when mode is clear', () => {
      bulkAction(
        {
          ids: testProductIds,
          action: 'price',
          targetField: 'sale_price',
          mode: 'clear',
        },
        mockAdminUser
      );

      for (const id of testProductIds) {
        const row = db.prepare('SELECT sale_price FROM products WHERE id=?').get(id) as any;
        expect(row.sale_price).toBeNull();
      }
    });

    it('rejects sale price higher than regular price', () => {
      expect(() => {
        bulkAction(
          {
            ids: [testProductIds[0]], // regular price is 500
            action: 'price',
            targetField: 'sale_price',
            mode: 'set',
            value: 600,
          },
          mockAdminUser
        );
      }).toThrow(/cannot exceed regular price/i);
    });
  });

  describe('3. Bulk Selling Unit Updates', () => {
    it('updates selling unit to a predefined unit', () => {
      const res = bulkAction(
        {
          ids: testProductIds,
          action: 'selling_unit',
          selling_unit: 'box',
        },
        mockAdminUser
      );

      expect(res.ok).toBe(true);
      for (const id of testProductIds) {
        const row = db.prepare('SELECT selling_unit FROM products WHERE id=?').get(id) as any;
        expect(row.selling_unit).toContain('box');
      }
    });

    it('updates selling unit to a valid custom unit', () => {
      const res = bulkAction(
        {
          ids: [testProductIds[0]],
          action: 'selling_unit',
          selling_unit: 'platter of 4',
        },
        mockAdminUser
      );

      expect(res.ok).toBe(true);
      const row = db.prepare('SELECT selling_unit FROM products WHERE id=?').get(testProductIds[0]) as any;
      expect(row.selling_unit).toContain('platter of 4');
    });

    it('rejects invalid empty selling units', () => {
      expect(() => {
        bulkAction(
          {
            ids: testProductIds,
            action: 'selling_unit',
            selling_unit: '',
          },
          mockAdminUser
        );
      }).toThrow(/selling unit/i);
    });
  });

  describe('4. Bulk Dietary Attribute Updates', () => {
    it('enables vegan dietary tag on multiple products', () => {
      const res = bulkAction(
        {
          ids: testProductIds,
          action: 'dietary',
          attributeKey: 'vegan',
          enabled: true,
        },
        mockAdminUser
      );

      expect(res.ok).toBe(true);
      for (const id of testProductIds) {
        const row = db.prepare('SELECT dietary_json FROM products WHERE id=?').get(id) as any;
        const parsed = JSON.parse(row.dietary_json || '[]');
        const veganAttr = parsed.find((d: any) => d.key === 'vegan');
        expect(veganAttr).toBeDefined();
        expect(veganAttr.enabled).toBe(true);
      }
    });

    it('synchronizes eggless tag with products.eggless legacy column', () => {
      // Set eggless = false on all test products
      bulkAction(
        {
          ids: testProductIds,
          action: 'dietary',
          attributeKey: 'eggless',
          enabled: false,
        },
        mockAdminUser
      );

      for (const id of testProductIds) {
        const row = db.prepare('SELECT eggless FROM products WHERE id=?').get(id) as any;
        expect(row.eggless).toBe(0);
      }

      // Re-enable eggless
      bulkAction(
        {
          ids: [testProductIds[0]],
          action: 'dietary',
          attributeKey: 'eggless',
          enabled: true,
        },
        mockAdminUser
      );

      const r = db.prepare('SELECT eggless FROM products WHERE id=?').get(testProductIds[0]) as any;
      expect(r.eggless).toBe(1);
    });
  });

  describe('5. Bulk Status Transitions', () => {
    it('publishes and unpublishes products in bulk', () => {
      // Bulk publish
      bulkAction({ ids: testProductIds, action: 'publish' }, mockAdminUser);
      for (const id of testProductIds) {
        const row = db.prepare('SELECT published, status FROM products WHERE id=?').get(id) as any;
        expect(row.published).toBe(1);
        expect(row.status).toBe('publish');
      }

      // Bulk draft
      bulkAction({ ids: testProductIds, action: 'draft' }, mockAdminUser);
      for (const id of testProductIds) {
        const row = db.prepare('SELECT published, status FROM products WHERE id=?').get(id) as any;
        expect(row.published).toBe(0);
        expect(row.status).toBe('draft');
      }
    });

    it('marks products as featured and unfeatured in bulk', () => {
      bulkAction({ ids: testProductIds, action: 'featured' }, mockAdminUser);
      for (const id of testProductIds) {
        const row = db.prepare('SELECT featured FROM products WHERE id=?').get(id) as any;
        expect(row.featured).toBe(1);
      }

      bulkAction({ ids: testProductIds, action: 'unfeatured' }, mockAdminUser);
      for (const id of testProductIds) {
        const row = db.prepare('SELECT featured FROM products WHERE id=?').get(id) as any;
        expect(row.featured).toBe(0);
      }
    });

    it('moves products to trash in bulk', () => {
      bulkAction({ ids: [testProductIds[0]], action: 'trash' }, mockAdminUser);
      const row = db.prepare('SELECT deleted_at, published FROM products WHERE id=?').get(testProductIds[0]) as any;
      expect(row.deleted_at).not.toBeNull();
      expect(row.published).toBe(0);
    });
  });

  describe('6. Transaction Atomicity & Unrelated Field Preservation', () => {
    it('rolls back entire batch if an error occurs mid-transaction', () => {
      // Product 1 regular price is 500. Attempting to set sale price to 600 will throw error.
      expect(() => {
        bulkAction(
          {
            ids: testProductIds,
            action: 'price',
            targetField: 'sale_price',
            mode: 'set',
            value: 600, // Throws on product 1 because 600 > 500
          },
          mockAdminUser
        );
      }).toThrow();

      // Verify that product 1 sale_price remained 450
      const p1 = db.prepare('SELECT sale_price FROM products WHERE id=?').get(testProductIds[0]) as any;
      expect(p1.sale_price).toBe(450);
    });

    it('preserves images, descriptions, and SKUs across bulk updates', () => {
      const orig1 = db.prepare('SELECT sku, description, images_json FROM products WHERE id=1').get() as any;

      bulkAction(
        {
          ids: [1],
          action: 'stock',
          stock: 99,
        },
        mockAdminUser
      );

      const updated1 = db.prepare('SELECT sku, description, images_json, stock FROM products WHERE id=1').get() as any;
      expect(updated1.stock).toBe(99);
      expect(updated1.sku).toBe(orig1.sku);
      expect(updated1.description).toBe(orig1.description);
      expect(updated1.images_json).toBe(orig1.images_json);
    });
  });
});
