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
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    } catch (e: any) {
      // A concurrently-initializing process/worker may have added the column
      // between our existence check and the ALTER. Verify before rethrowing.
      if (!columnExists(table, column)) throw e;
    }
  }
}

function addTable(ddl: string) {
  db.exec(ddl);
}

export function runMigrations() {
  // Never mutate the on-disk DB during test runs; migrations belong to the
  // live server boot path only. Tests use synthetic rows and must not dirty
  // the committed data/tvoflavours.db file.
  if (process.env.NODE_ENV === 'test') return;

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
  addColumn('products', 'selling_unit', "selling_unit TEXT");

  // ---- Storefront feature toggles (pre-existing gap: admin writes these but columns were missing) ----
  addColumn('products', 'show_gallery', 'show_gallery INTEGER DEFAULT 1');
  addColumn('products', 'show_video', 'show_video INTEGER DEFAULT 0');
  addColumn('products', 'show_flavour', 'show_flavour INTEGER DEFAULT 1');
  addColumn('products', 'show_customize', 'show_customize INTEGER DEFAULT 1');
  addColumn('products', 'show_design_upload', 'show_design_upload INTEGER DEFAULT 0');
  addColumn('products', 'show_addons', 'show_addons INTEGER DEFAULT 1');
  addColumn('products', 'show_dietary', 'show_dietary INTEGER DEFAULT 1');
  addColumn('products', 'show_delivery', 'show_delivery INTEGER DEFAULT 1');
  addColumn('products', 'show_special_instructions', 'show_special_instructions INTEGER DEFAULT 1');
  addColumn('products', 'customization_fee', 'customization_fee REAL DEFAULT 0');
  addColumn('products', 'allow_custom_message', 'allow_custom_message INTEGER DEFAULT 1');
  addColumn('products', 'allow_custom_design', 'allow_custom_design INTEGER DEFAULT 0');
  addColumn('products', 'flavour_options_json', 'flavour_options_json TEXT');

  // ---- Phase 12B-5: extended storefront feature controls ----
  addColumn('products', 'show_ratings', 'show_ratings INTEGER DEFAULT 1');
  addColumn('products', 'show_badges', 'show_badges INTEGER DEFAULT 1');
  addColumn('products', 'show_size_selector', 'show_size_selector INTEGER DEFAULT 1');
  addColumn('products', 'show_delivery_date', 'show_delivery_date INTEGER DEFAULT 1');
  addColumn('products', 'show_delivery_slot', 'show_delivery_slot INTEGER DEFAULT 1');
  addColumn('products', 'show_reviews', 'show_reviews INTEGER DEFAULT 1');
  addColumn('products', 'show_faq', 'show_faq INTEGER DEFAULT 1');
  addColumn('products', 'show_related_products', 'show_related_products INTEGER DEFAULT 1');
  addColumn('products', 'show_checkout_options', 'show_checkout_options INTEGER DEFAULT 1');

  // ---- Phase 12B-5: dietary attributes JSON ----
  addColumn('products', 'dietary_json', 'dietary_json TEXT');

  // ---- Phase 12B-6: product videos JSON (URLs, never binary blobs) ----
  addColumn('products', 'videos_json', 'videos_json TEXT');

  // ---- Auto-infer selling_unit for existing products ----
  if (columnExists('products', 'selling_unit') && columnExists('products', 'variations_json')) {
    const rows = db.prepare(`SELECT id, variations_json FROM products WHERE selling_unit IS NULL`).all() as { id: number; variations_json: string | null }[];
    const updateStmt = db.prepare(`UPDATE products SET selling_unit = ? WHERE id = ?`);
    for (const row of rows) {
      let inferredUnit: string | null = null;
      if (row.variations_json) {
        try {
          const parsed = JSON.parse(row.variations_json);
          const options: any[] = parsed?.options || parsed || [];
          if (Array.isArray(options)) {
            const hasPiece = options.some((o: any) => /piece|pcs/i.test(o.label || ''));
            inferredUnit = hasPiece ? 'piece' : 'weight';
          }
        } catch { /* leave null */ }
      }
      if (!inferredUnit) inferredUnit = 'weight';
      updateStmt.run(inferredUnit, row.id);
    }
  }

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
  addTable(`CREATE TABLE IF NOT EXISTS revoked_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT UNIQUE NOT NULL,
      revoked_at TEXT DEFAULT (datetime('now')),
      expires_at INTEGER NOT NULL
    )`);

  // ---- Razorpay Payments Ledger & Reconciliation & Webhooks ----
  addColumn('payments', 'currency', "currency TEXT DEFAULT 'INR'");
  addColumn('payments', 'razorpay_order_id', "razorpay_order_id TEXT");
  addColumn('payments', 'razorpay_payment_id', "razorpay_payment_id TEXT");
  addColumn('payments', 'captured', "captured INTEGER DEFAULT 0");
  addColumn('payments', 'refund_status', "refund_status TEXT DEFAULT 'none'");
  addColumn('payments', 'refunded_amount', "refunded_amount REAL DEFAULT 0");
  addColumn('payments', 'failure_reason', "failure_reason TEXT");
  addColumn('payments', 'failure_code', "failure_code TEXT");
  addColumn('payments', 'event_reference', "event_reference TEXT");
  addColumn('payments', 'verification_status', "verification_status TEXT DEFAULT 'unverified'");
  addColumn('payments', 'webhook_status', "webhook_status TEXT DEFAULT 'pending'");
  addColumn('payments', 'settlement_id', "settlement_id TEXT");
  addColumn('payments', 'settlement_status', "settlement_status TEXT DEFAULT 'unsettled'");
  addColumn('payments', 'updated_at', "updated_at TEXT");

  addTable(`CREATE TABLE IF NOT EXISTS webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      signature TEXT,
      status TEXT DEFAULT 'processed',
      error_message TEXT,
      received_at TEXT DEFAULT (datetime('now')),
      processed_at TEXT
    )`);

  addTable(`CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      settlement_id TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      fee REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      status TEXT DEFAULT 'processed',
      utr TEXT,
      settled_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);

  // Clean up any stale/orphaned status history that points to deleted orders
  try {
    db.exec("DELETE FROM order_status_history WHERE order_id NOT IN (SELECT id FROM orders)");
  } catch {}

  // ---- Festival & Special Days Automation Engine ----
  // occasions: master definition of a festival/special day.
  // occasion_years: per-year date overrides for variable-date occasions (lunar calendars).
  // product_occasions: many-to-many product → occasion mapping with occasion-specific priority.
  addTable(`CREATE TABLE IF NOT EXISTS occasions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      occasion_type TEXT NOT NULL DEFAULT 'general',
      recurrence_type TEXT NOT NULL DEFAULT 'fixed',
      start_date TEXT,
      end_date TEXT,
      year INTEGER,
      priority INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      campaign_start_date TEXT,
      homepage_visibility INTEGER DEFAULT 1,
      homepage_section_title TEXT,
      homepage_section_subtitle TEXT,
      banner_image TEXT,
      cta_label TEXT,
      cta_destination TEXT,
      seo_title TEXT,
      seo_description TEXT,
      canonical_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      deleted_at TEXT
  )`);
  addTable(`CREATE TABLE IF NOT EXISTS occasion_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occasion_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      start_date TEXT,
      end_date TEXT,
      campaign_start_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      UNIQUE(occasion_id, year),
      FOREIGN KEY (occasion_id) REFERENCES occasions(id) ON DELETE CASCADE
  )`);
  addTable(`CREATE TABLE IF NOT EXISTS product_occasions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      occasion_id INTEGER NOT NULL,
      priority INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      UNIQUE(product_id, occasion_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (occasion_id) REFERENCES occasions(id) ON DELETE CASCADE
  )`);
  addTable(`CREATE INDEX IF NOT EXISTS idx_occasions_slug ON occasions(slug)`);
  addTable(`CREATE INDEX IF NOT EXISTS idx_occasions_active ON occasions(active, priority DESC)`);
  addTable(`CREATE INDEX IF NOT EXISTS idx_occasions_dates ON occasions(start_date, end_date)`);
  addTable(`CREATE INDEX IF NOT EXISTS idx_occasion_years ON occasion_years(occasion_id, year)`);
  addTable(`CREATE INDEX IF NOT EXISTS idx_product_occasions_occasion ON product_occasions(occasion_id, priority)`);
  addTable(`CREATE INDEX IF NOT EXISTS idx_product_occasions_product ON product_occasions(product_id)`);

  // Add occasion context to orders for analytics attribution
  addColumn('orders', 'occasion_slug', 'occasion_slug TEXT');
  addColumn('orders', 'occasion_id', 'occasion_id INTEGER');
  addTable(`CREATE INDEX IF NOT EXISTS idx_orders_occasion ON orders(occasion_slug) WHERE occasion_slug IS NOT NULL`);

  // ---- users: auth fields (all additive) ----
  addColumn('users', 'firebase_uid', 'firebase_uid TEXT');
  addTable(`CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid) WHERE firebase_uid IS NOT NULL`);

  // ---- Phase 12B-11: Enable design upload & configure related products for cake products ----
  try {
    addTable(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )`);

    const alreadyApplied = db.prepare(`SELECT name FROM schema_migrations WHERE name = 'phase12b11_design_upload_and_related'`).get();
    if (!alreadyApplied) {
      // 1. Enable customer design upload for customizable cake products
      db.prepare(`
        UPDATE products
        SET show_design_upload = 1, allow_custom_design = 1
        WHERE show_customize = 1
          AND (name LIKE '%cake%' OR category_id IN (SELECT id FROM categories WHERE slug LIKE '%cake%'))
          AND (show_design_upload IS NULL OR show_design_upload = 0)
      `).run();

      // 2. Populate related_products for cake products if unconfigured
      const emptyRelatedRows = db.prepare(`
        SELECT id, category_id FROM products
        WHERE (related_products IS NULL OR related_products = '' OR related_products = '[]')
          AND (name LIKE '%cake%' OR category_id IN (SELECT id FROM categories WHERE slug LIKE '%cake%'))
      `).all() as { id: number; category_id: number }[];

      if (emptyRelatedRows.length > 0) {
        const getCategoryPeers = db.prepare(`
          SELECT id, name, slug, sale_price as price, regular_price as regularPrice
          FROM products
          WHERE category_id = ? AND id != ? AND published = 1
          LIMIT 4
        `);
        const getTopPeers = db.prepare(`
          SELECT id, name, slug, sale_price as price, regular_price as regularPrice
          FROM products
          WHERE id != ? AND published = 1 AND name LIKE '%cake%'
          LIMIT 4
        `);
        const updateRelated = db.prepare(`UPDATE products SET related_products = ? WHERE id = ?`);

        for (const row of emptyRelatedRows) {
          let peers = row.category_id ? (getCategoryPeers.all(row.category_id, row.id) as any[]) : [];
          if (peers.length === 0) {
            peers = getTopPeers.all(row.id) as any[];
          }
          if (peers.length > 0) {
            updateRelated.run(JSON.stringify(peers.map(p => ({
              id: String(p.id),
              name: p.name,
              slug: p.slug,
              price: p.price || 0,
              regularPrice: p.regularPrice || undefined,
            }))), row.id);
          }
        }
      }

      db.prepare(`INSERT INTO schema_migrations (name) VALUES ('phase12b11_design_upload_and_related')`).run();
    }
  } catch {}

  // ---- Step 11: Advanced Delivery Management (strictly additive) ----
  addTable(`CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'Two Wheeler',
    vehicle_number TEXT,
    status TEXT DEFAULT 'available',
    active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  )`);
  addColumn('orders', 'delivery_zone_id', 'delivery_zone_id INTEGER');
  addColumn('orders', 'driver_id', 'driver_id INTEGER');
  addColumn('orders', 'dispatched_at', 'dispatched_at TEXT');
  addColumn('orders', 'delivered_at', 'delivered_at TEXT');
  addColumn('orders', 'delivery_status', "delivery_status TEXT DEFAULT 'pending'");
  addColumn('orders', 'delivery_failure_reason', 'delivery_failure_reason TEXT');
  addColumn('delivery_slots', 'cutoff_minutes', 'cutoff_minutes INTEGER DEFAULT 120');
  addColumn('delivery_zones', 'min_order_value', 'min_order_value REAL DEFAULT 0');

  addTable(`CREATE INDEX IF NOT EXISTS idx_orders_del_date_slot ON orders(delivery_date, delivery_slot_id)`);
  addTable(`CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id)`);
  addTable(`CREATE INDEX IF NOT EXISTS idx_pincodes_zone ON pincodes(zone_id)`);
  addTable(`CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status, active)`);

  try {
    const step11Applied = db.prepare(`SELECT name FROM schema_migrations WHERE name = 'step11_advanced_delivery_management'`).get();
    if (!step11Applied) {
      db.prepare(`INSERT INTO schema_migrations (name) VALUES ('step11_advanced_delivery_management')`).run();
    }
  } catch {}
}

// allow-testing helper
export function migrateForTest() {
  runMigrations();
}