import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// SQLite data file location. Kept outside the repo's public output.
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'tvoflavours.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 20000');;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  group_name TEXT DEFAULT 'New Customer',
  total_spend REAL DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  label TEXT,
  line1 TEXT,
  line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  is_default INTEGER DEFAULT 0,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id INTEGER,
  description TEXT,
  image TEXT,
  featured INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS attributes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_variation INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attribute_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attribute_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT,
  description TEXT,
  regular_price REAL,
  sale_price REAL,
  cost_price REAL,
  stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  stock_status TEXT DEFAULT 'in_stock',
  category_id INTEGER,
  brand_id INTEGER,
  weight_kg REAL,
  dimensions TEXT,
  is_variation INTEGER DEFAULT 0,
  parent_id INTEGER,
  published INTEGER DEFAULT 1,
  featured INTEGER DEFAULT 0,
  bestseller INTEGER DEFAULT 0,
  new_arrival INTEGER DEFAULT 0,
  deal INTEGER DEFAULT 0,
  eggless INTEGER DEFAULT 0,
  flavours TEXT,
  badges TEXT,
  tags TEXT,
  attributes_json TEXT,
  variations_json TEXT,
  images_json TEXT,
  related_products TEXT,
  upsells TEXT,
  cross_sells TEXT,
  seo_title TEXT,
  seo_description TEXT,
  focus_keyword TEXT,
  canonical_url TEXT,
  custom_order INTEGER DEFAULT 0,
  selling_unit TEXT,
  catalog_source TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  customer_id INTEGER,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  photo TEXT,
  verified INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS addons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  price REAL NOT NULL DEFAULT 0,
  stock INTEGER DEFAULT 100,
  category TEXT,
  active INTEGER DEFAULT 1,
  date_restrictions TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT,
  fee REAL NOT NULL DEFAULT 0,
  free_delivery_threshold REAL,
  est_delivery_time TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pincodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id INTEGER,
  pincode TEXT UNIQUE NOT NULL,
  available INTEGER DEFAULT 1,
  FOREIGN KEY (zone_id) REFERENCES delivery_zones(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS delivery_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  capacity INTEGER DEFAULT 10,
  books INTEGER DEFAULT 0,
  fee REAL DEFAULT 0,
  available INTEGER DEFAULT 1,
  days TEXT DEFAULT '[]',
  special_dates TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS slot_capacity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  books INTEGER DEFAULT 0,
  closed INTEGER DEFAULT 0,
  UNIQUE(slot_id, date),
  FOREIGN KEY (slot_id) REFERENCES delivery_slots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS blackout_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  reason TEXT,
  type TEXT DEFAULT 'blackout',
  UNIQUE(date)
);

CREATE TABLE IF NOT EXISTS buffer_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  label TEXT,
  value INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'minutes'
);

CREATE TABLE IF NOT EXISTS production_capacity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE,
  daily_order_capacity INTEGER DEFAULT 100,
  daily_cake_capacity INTEGER DEFAULT 20,
  daily_custom_capacity INTEGER DEFAULT 10
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  note TEXT,
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT,
  stock REAL DEFAULT 0,
  low_stock_threshold REAL DEFAULT 0,
  cost_per_unit REAL,
  category TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  ingredient_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  session_id TEXT,
  items TEXT NOT NULL DEFAULT '[]',
  coupon_code TEXT,
  delivery_date TEXT,
  delivery_slot_id INTEGER,
  notes TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wishlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(customer_id, product_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value REAL NOT NULL,
  min_order REAL DEFAULT 0,
  max_discount REAL,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  active INTEGER DEFAULT 1,
  product_ids TEXT,
  category_ids TEXT,
  customer_ids TEXT,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  amount REAL NOT NULL,
  balance REAL NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  message TEXT,
  delivery_date TEXT,
  expires_at TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  updated_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER,
  session_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  pincode TEXT,
  city TEXT,
  items TEXT NOT NULL DEFAULT '[]',
  addons TEXT DEFAULT '[]',
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL DEFAULT 0,
  coupon_code TEXT,
  delivery_fee REAL DEFAULT 0,
  slot_surcharge REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  delivery_date TEXT,
  delivery_slot TEXT,
  delivery_slot_id INTEGER,
  status TEXT NOT NULL DEFAULT 'Order Placed',
  priority TEXT DEFAULT 'Normal',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'Pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  transaction_id TEXT,
  is_custom INTEGER DEFAULT 0,
  custom_request_id INTEGER,
  tracking_note TEXT,
  internal_notes TEXT,
  timeline TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  razorpay_refund_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  product_type TEXT,
  cake_type TEXT,
  weight TEXT,
  size TEXT,
  flavour TEXT,
  filling TEXT,
  frosting TEXT,
  theme TEXT,
  colour TEXT,
  decoration TEXT,
  name_on_cake TEXT,
  message TEXT,
  occasion TEXT,
  reference_image TEXT,
  special_instructions TEXT,
  quantity INTEGER DEFAULT 1,
  delivery_date TEXT,
  delivery_time TEXT,
  status TEXT DEFAULT 'Pending Approval',
  quote_price REAL,
  quote_notes TEXT,
  answer_json TEXT,
  order_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT,
  title TEXT,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  url TEXT,
  alt_text TEXT,
  caption TEXT,
  description TEXT,
  folder TEXT DEFAULT 'General',
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  tags TEXT,
  excerpt TEXT,
  content TEXT,
  featured_image TEXT,
  author TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published INTEGER DEFAULT 0,
  scheduled_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  published INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  content TEXT,
  rating INTEGER DEFAULT 5,
  photo TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  subtitle TEXT,
  image TEXT,
  cta_text TEXT,
  cta_link TEXT,
  starts_at TEXT,
  ends_at TEXT,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS slides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  image TEXT,
  cta_text TEXT,
  cta_link TEXT,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS static_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT,
  image TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS homepage_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  title TEXT,
  heading TEXT,
  description TEXT,
  cta_text TEXT,
  cta_link TEXT,
  image TEXT,
  enabled INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS navigations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'link',
  url TEXT,
  target TEXT,
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  menu_name TEXT DEFAULT 'main',
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_name TEXT,
  role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  customer_name TEXT,
  customer_email TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS testimonials_backup (id INTEGER);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
`;

export function initDb() {
  db.exec(SCHEMA);
}

export { DB_PATH, DATA_DIR };
