import { db } from './db';

// Safe, idempotent additive migrations. Adds new columns/tables only if missing,
// never drops or alters existing data, and never touches importer-managed columns.

function columnExists(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

function tableExists(table: string): boolean {
  const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  return !!row;
}

function addColumn(table: string, column: string, ddl: string) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function addTable(ddl: string) {
  db.exec(ddl);
}

export function runMigrations() {
  // ---- products: product-management fields (all additive) ----
  addColumn('products', 'visibility', "visibility TEXT DEFAULT 'public'");
  addColumn('products', 'product_type', "product_type TEXT DEFAULT 'simple'");
  addColumn('products', 'tax_status', "tax_status TEXT DEFAULT 'taxable'");
  addColumn('products', 'tax_class', 'tax_class TEXT');
  addColumn('products', 'sale_start', 'sale_start TEXT');
  addColumn('products', 'sale_end', 'sale_end TEXT');
  addColumn('products', 'enable_stock', 'enable_stock INTEGER DEFAULT 1');
  addColumn('products', 'backorders', "backorders TEXT DEFAULT 'no'");
  addColumn('products', 'manage_stock', 'manage_stock INTEGER DEFAULT 1');
  addColumn('products', 'open_graph_title', 'open_graph_title TEXT');
  addColumn('products', 'open_graph_description', 'open_graph_description TEXT');
  addColumn('products', 'social_image', 'social_image TEXT');
  addColumn('products', 'prep_time_minutes', 'prep_time_minutes INTEGER');
  addColumn('products', 'same_day_eligible', 'same_day_eligible INTEGER DEFAULT 0');
  addColumn('products', 'min_advance_notice', 'min_advance_notice INTEGER');
  addColumn('products', 'customization_json', 'customization_json TEXT');
  addColumn('products', 'duplicate_of', 'duplicate_of INTEGER');
  addColumn('products', 'status', "status TEXT DEFAULT 'publish'");

  // ---- product management helper tables ----
  addTable(`CREATE TABLE IF NOT EXISTS product_tags (
      product_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (product_id, tag_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )`);
  addTable(`CREATE TABLE IF NOT EXISTS product_addons (
      product_id INTEGER NOT NULL,
      addon_id INTEGER NOT NULL,
      max_qty INTEGER DEFAULT 5,
      PRIMARY KEY (product_id, addon_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE
    )`);
  addTable(`CREATE TABLE IF NOT EXISTS product_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      related_id INTEGER,
      type TEXT NOT NULL DEFAULT 'related',
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (related_id) REFERENCES products(id) ON DELETE CASCADE
    )`);
  addTable(`CREATE TABLE IF NOT EXISTS stock_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      change_amount INTEGER,
      type TEXT NOT NULL DEFAULT 'manual',
      note TEXT,
      user_id INTEGER,
      user_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);
  addTable(`CREATE TABLE IF NOT EXISTS product_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      field TEXT,
      old_value TEXT,
      new_value TEXT,
      user_id INTEGER,
      user_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);
  addTable(`CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      file TEXT,
      kind TEXT NOT NULL DEFAULT 'import',
      summary TEXT,
      user_id INTEGER,
      user_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);

  // ---- Phase 2 gap tables: payments ledger, order notes ----
  addTable(`CREATE TABLE IF NOT EXISTS order_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      author_id INTEGER,
      author_name TEXT,
      body TEXT NOT NULL,
      is_internal INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`);
  addTable(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT,
      status TEXT DEFAULT 'Pending',
      transaction_id TEXT,
      gateway TEXT,
      meta TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`);
  addTable(`CREATE TABLE IF NOT EXISTS order_refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      reason TEXT,
      method TEXT,
      status TEXT DEFAULT 'pending',
      gateway_refund_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`);
}

// allow-testing helper
export function migrateForTest() {
  runMigrations();
}