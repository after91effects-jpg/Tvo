import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import type Database from 'better-sqlite3';
import { createMysqlDatabase } from '../mysql';

const { mysqlSql } = createRequire(import.meta.url)('../mysql-dialect.cjs');

describe('MySQL SQL compatibility', () => {
  it('converts bound upserts and reserved column names', () => {
    expect(mysqlSql('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'))
      .toBe('INSERT INTO settings (`key`,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(`value`)');
  });
  it('preserves literals, quoted identifiers and comments', () => {
    const sql = `SELECT 'key excluded.value INSERT OR IGNORE', "key", \`key\` -- key\nFROM settings WHERE key=?`;
    expect(mysqlSql(sql)).toBe(`SELECT 'key excluded.value INSERT OR IGNORE', "key", \`key\` -- key\nFROM settings WHERE \`key\`=?`);
  });
  it('uses UTC and supports the application date windows', () => {
    expect(mysqlSql("SELECT datetime('now'), datetime('now','-1 day'), date('now','-30 days'), date(created_at)"))
      .toBe('SELECT UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -1 DAY), DATE_ADD(UTC_DATE(), INTERVAL -30 DAY), date(created_at)');
  });
  it('converts ignore and replacement statements', () => {
    expect(mysqlSql('INSERT OR IGNORE INTO wishlists VALUES (?,?)')).toBe('INSERT IGNORE INTO wishlists VALUES (?,?)');
    expect(mysqlSql('INSERT OR REPLACE INTO product_occasions VALUES (?,?)')).toBe('REPLACE INTO product_occasions VALUES (?,?)');
  });
});

// Run only against a separately imported test copy, never an application DB.
describe.skipIf(!process.env.MYSQL_TEST_SOCKET)('MySQL imported-data integration', () => {
  let db: Database.Database;
  beforeAll(() => {
    if (process.env.MYSQL_DATABASE !== 'u213969330_tvo_app' || !process.env.MYSQL_TEST_SOCKET?.startsWith('/private/tmp/tvo-mysql-migration/')) {
      throw new Error('Integration tests require the private, socket-only migration test instance');
    }
    process.env.MYSQL_SOCKET = process.env.MYSQL_TEST_SOCKET;
    db = createMysqlDatabase();
  });
  afterAll(() => db?.close());
  it('reads the verified source data and metadata', () => {
    expect(db.prepare('SELECT COUNT(*) AS n FROM products').get()).toEqual({ n: 149 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM categories').get()).toEqual({ n: 65 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM orders').get()).toEqual({ n: 2 });
    expect((db.prepare('SELECT version FROM tvo_storage_metadata WHERE id=1').get() as any).version).toBe(1);
    expect(db.prepare('SELECT * FROM products WHERE id=?').get(-1)).toBeUndefined();
  });
  it('retains NULLs, Unicode, reserved-key upserts and generated IDs inside a rollback', () => {
    expect(() => db.transaction(() => {
      db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('migration_test', 'केक 🎂');
      expect(db.prepare('SELECT value FROM settings WHERE key=?').get('migration_test')).toEqual({ value: 'केक 🎂' });
      db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('migration_test', 'updated');
      expect(db.prepare('SELECT value FROM settings WHERE key=?').get('migration_test')).toEqual({ value: 'updated' });
      const info = db.prepare('INSERT INTO categories (name,slug,parent_id) VALUES (?,?,?)').run('test', 'migration-test-only', null);
      expect(Number(info.lastInsertRowid)).toBeGreaterThan(0);
      expect((db.prepare('SELECT parent_id FROM categories WHERE id=?').get(info.lastInsertRowid) as any).parent_id).toBeNull();
      throw new Error('intentional rollback');
    })()).toThrow('intentional rollback');
    expect(db.prepare('SELECT value FROM settings WHERE key=?').get('migration_test')).toBeUndefined();
    expect(db.prepare('SELECT id FROM categories WHERE slug=?').get('migration-test-only')).toBeUndefined();
  });
  it('isolates nested rollback with savepoints and rolls back on foreign-key failure', () => {
    expect(() => db.transaction(() => {
      db.prepare('INSERT INTO settings (key,value) VALUES (?,?)').run('migration_outer', '1');
      expect(() => db.transaction(() => {
        db.prepare('INSERT INTO settings (key,value) VALUES (?,?)').run('migration_inner', '2');
        throw new Error('inner');
      })()).toThrow('inner');
      expect(db.prepare('SELECT value FROM settings WHERE key=?').get('migration_outer')).toEqual({ value: '1' });
      expect(db.prepare('SELECT value FROM settings WHERE key=?').get('migration_inner')).toBeUndefined();
      db.prepare('INSERT INTO categories (name,slug,parent_id) VALUES (?,?,?)').run('test', 'invalid-parent', -99999);
    })()).toThrow();
    expect(db.prepare('SELECT value FROM settings WHERE key=?').get('migration_outer')).toBeUndefined();
  });
  it('supports runtime schema lookups and date queries', () => {
    expect((db.prepare('PRAGMA table_info(products)').all() as any[]).some(c=>c.name==='catalog_source')).toBe(true);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='order_notes'").get()).toEqual({ name: 'order_notes' });
    expect(Number((db.prepare("SELECT seq FROM sqlite_sequence WHERE name='orders'").get() as any).seq)).toBeGreaterThanOrEqual(2);
    expect(db.prepare("SELECT COUNT(*) AS n FROM orders WHERE date(created_at) >= date('now','-90 days')").get()).toHaveProperty('n');
    const search = db.prepare('SELECT COUNT(*) AS n FROM products WHERE name LIKE ?');
    expect(search.get('%cake%')).toEqual(search.get('%CAKE%'));
    expect(Number((search.get('%cake%') as any).n)).toBeGreaterThan(0);
  });
  it('runs the real catalog, order and scheduling repositories on MySQL', async () => {
    process.env.DATABASE_DRIVER = 'mysql';
    const storage = await import('../db');
    const ops = await import('../admin-ops');
    const catalog = await import('../admin-catalog');
    const taxonomy = await import('../admin-taxonomy');
    const admin = { id: 1, name: 'migration test', role: 'super_admin' };
    try {
      expect(() => storage.db.transaction(() => {
        expect(catalog.listProducts({ per: 5, sort: 'name' }).products).toHaveLength(5);
        expect(taxonomy.getAllTaxonomy().categories).toHaveLength(65);
        expect(ops.listOrders(admin, {}).total).toBe(2);
        expect(ops.listOccasions(admin).length).toBeGreaterThan(0);
        expect(ops.listDelivery(admin)).toBeDefined();
        expect(ops.getAllSettings(admin)).toBeDefined();
        ops.setSlotCapacity(admin, { slot_id: 1, date: '2099-01-01', capacity: 25, closed: 0 });
        ops.setSlotCapacity(admin, { slot_id: 1, date: '2099-01-01', capacity: 30, closed: 0 });
        expect((storage.db.prepare('SELECT capacity FROM slot_capacity WHERE slot_id=? AND date=?').get(1, '2099-01-01') as any).capacity).toBe(30);
        throw new Error('repository rollback');
      })()).toThrow('repository rollback');
      const { signToken } = await import('../auth');
      const { GET } = await import('../../../app/api/admin/route');
      process.env.JWT_SECRET = 'private-mysql-integration-test-only';
      const token = signToken({ sub: 1, role: 'super_admin' });
      const sections = ['orders', 'categories', 'coupons', 'customers', 'custom', 'delivery_slots', 'addons',
        'settings', 'audit', 'reviews', 'static_blocks', 'testimonials', 'faqs', 'pages', 'blog', 'banners',
        'homepage', 'media', 'hamper_settings', 'orders_page', 'customers_page', 'delivery', 'drivers',
        'deliveries', 'slots', 'payment_config', 'refunds', 'payments_ledger', 'coupons_full', 'gift_cards',
        'reviews_full', 'custom_full', 'homepage_config', 'pages_full', 'testimonials_full', 'email_templates',
        'blog_full', 'inventory_full', 'admin_users', 'settings_full', 'audit_full', 'backups', 'tickets',
        'notifications', 'customers_simple', 'products_simple', 'occasions', 'occasions_all', 'analytics'];
      for (const section of sections) {
        const response = await GET(new Request(`http://localhost/api/admin?type=${section}`, { headers: { cookie: `tvo_auth=${token}` } }));
        expect(response.status, `MySQL admin section ${section}`).toBe(200);
      }
    } finally {
      storage.db.close();
      delete process.env.DATABASE_DRIVER;
    }
  });
});
