import { db } from './db';
import { importCatalog } from './importer';

// ---------------------------------------------------------------------------
// Business constants (from the brief - do not invent)
// ---------------------------------------------------------------------------
export const BUSINESS = {
  name: 'TVO FLAVOURS',
  tagline: 'The All-in-one Baking Shop.',
  website: 'www.tvoflavours.com',
  address: 'Vipul World, Sector 48, Gurugram, Haryana, 122001, India',
  phone: '+91 7678259522',
  email: 'hello@tvoflavours.com',
  fssai: '20824005005006',
  language: 'English',
};

const ADMIN_EMAIL = 'admin@tvoflavours.com';
const ADMIN_PASSWORD = 'admin123';

// Reusable actions
function insert(table: string, obj: Record<string, unknown>) {
  const keys = Object.keys(obj);
  const cols = keys.join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`);
  return stmt.run(...keys.map((k) => obj[k]));
}

function hashPassword(pw: string): string {
  const crypto = require('node:crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pw, salt, 310000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function slugify(s: string): string {
  return (s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s]+/g, '-').replace(/-+/g, '-');
}

let seeded = false;

export function seedIfEmpty() {
  if (seeded) return true;
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key=?').get('seeded_v1');
    if (row) return true;
  } catch {
    /* not yet seeded */
  }

  const tx = db.transaction(() => {
    seedSettings();
    seedRoles();
    seedAdmin();
    seedDelivery();
    seedCoupons();
    seedAddons();
    seedHomepage();
    seedNavigation();
    seedPages();
    seedFaq();
    seedEmailTemplates();
    seedBanners();
    insert('settings', { key: 'seeded_v1', value: String(Date.now()) });
  });
  tx();
  // Import real catalog from the source CSVs (categories + products)
  importCatalog();
  seeded = true;
  return true;
}

function seedSettings() {
  const settings: Record<string, unknown> = {
    business_name: BUSINESS.name,
    business_tagline: BUSINESS.tagline,
    business_website: BUSINESS.website,
    business_address: BUSINESS.address,
    business_phone: BUSINESS.phone,
    business_email: BUSINESS.email,
    fssai_no: BUSINESS.fssai,
    language: BUSINESS.language,
    currency: 'INR',
    currency_symbol: '₹',
    timezone: 'Asia/Kolkata',
    tax_rate: '0',
    tax_inclusive: '1',
    store_email: 'orders@tvoflavours.com',
    free_delivery_threshold: '499',
    standard_delivery_fee: '49',
    cod_enabled: '1',
    payment_methods: JSON.stringify(['UPI', 'Credit Card', 'Debit Card', 'Net Banking']),
    payment_provider: 'Razorpay',
    minimum_advance_hours: '4',
    maximum_booking_days: '30',
    same_day_cutoff: '12:00',
    dark_mode_default: 'dark',
    social: JSON.stringify({}),
  };
  for (const [k, v] of Object.entries(settings)) insert('settings', { key: k, value: String(v) });

  // Buffer settings
  const buffers: [string, string, number][] = [
    ['preparation_time', 'Product Preparation Time', 240],
    ['baking_time', 'Baking Time', 120],
    ['decoration_time', 'Decoration Time', 90],
    ['packaging_time', 'Packaging Time', 30],
    ['dispatch_buffer', 'Dispatch Buffer', 30],
    ['delivery_buffer', 'Delivery Buffer', 60],
    ['minimum_order_notice', 'Minimum Order Notice', 240],
  ];
  for (const [key, label, value] of buffers) {
    insert('buffer_settings', { key, label, value });
  }

  // Production capacity (defaults; admin can override per-date)
  insert('production_capacity', { date: 'default', daily_order_capacity: 100, daily_cake_capacity: 20, daily_custom_capacity: 10 });
}

function seedRoles() {
  const roles: Record<string, string[]> = {
    'Super Admin': ['*'],
    'Admin': ['*'],
    'Store Manager': ['products', 'orders', 'categories', 'customers', 'delivery', 'inventory', 'coupons', 'cms', 'reports'],
    'Order Manager': ['orders', 'custom_orders', 'refunds', 'reports'],
    'Production Manager': ['orders', 'production', 'inventory'],
    'Delivery Manager': ['delivery', 'orders'],
    'Inventory Manager': ['inventory', 'products'],
    'Marketing Manager': ['coupons', 'marketing', 'customers'],
    'Content Manager': ['cms', 'blog', 'pages', 'media', 'seo'],
    'Support Staff': ['orders', 'customers', 'support'],
  };
  for (const [name, perms] of Object.entries(roles)) {
    insert('roles', { name, permissions: JSON.stringify(perms) });
  }
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(ADMIN_EMAIL);
  if (!existing) {
    insert('users', {
      name: 'TVO Flavours Admin',
      email: ADMIN_EMAIL,
      password_hash: hashPassword(ADMIN_PASSWORD),
      phone: '+91 7678259522',
      role: 'super_admin',
      status: 'active',
    });
  }
  console.log('Admin seeded. Login with', ADMIN_EMAIL, '/', ADMIN_PASSWORD);
}

function seedDelivery() {
  // Zones
  const gurgaon = insert('delivery_zones', {
    name: 'Gurugram', city: 'Gurugram', fee: 49, free_delivery_threshold: 499, est_delivery_time: '60 min', active: 1,
  });
  const gurgaonId = Number(gurgaon.lastInsertRowid);
  const delhi = insert('delivery_zones', {
    name: 'Delhi NCR', city: 'Delhi', fee: 79, free_delivery_threshold: 699, est_delivery_time: '120 min', active: 1,
  });
  const delhiId = Number(delhi.lastInsertRowid);
  const faridabad = insert('delivery_zones', {
    name: 'Faridabad', city: 'Faridabad', fee: 89, free_delivery_threshold: 799, est_delivery_time: '150 min', active: 1,
  });

  // Pincodes (Gururgam 122xxx served; others as configured)
  const gurgaonPincodes = ['122001','122002','122003','122004','122005','122006','122007','122008','122009','122010','122011','122012','122013','122014','122015','122016','122017','122018','122101','122102','122103','122413','122414','122415','122416','122417','122418','122503','122504','122505','122506'];
  for (const p of gurgaonPincodes) insert('pincodes', { zone_id: gurgaonId, pincode: p, available: 1 });
  const delhiPincodes = ['110001','110002','110003','110011','110015','110016','110019','110020','110021','110022','110023','110024','110025','110027','110028','110029','110030','110034','110043','110044','110045','110048','110049','110052','110058','110059','110060','110061','110062','110063','110064','110066','110070','110071','110074','110075','110076','110077','110078','110080','110081','110083','110084','110085','110086','110088','110089','110091','110092','110093','110094','110095','110096'];
  for (const p of delhiPincodes) insert('pincodes', { zone_id: delhiId, pincode: p, available: 1 });

  // Slots
  const slots: [string, string, string, number, number][] = [
    ['09:00 AM - 11:00 AM', '09:00', '11:00', 10, 0],
    ['11:00 AM - 01:00 PM', '11:00', '13:00', 10, 0],
    ['01:00 PM - 03:00 PM', '13:00', '15:00', 10, 0],
    ['03:00 PM - 05:00 PM', '15:00', '17:00', 10, 0],
    ['05:00 PM - 07:00 PM', '17:00', '19:00', 10, 0],
    ['07:00 PM - 09:00 PM', '19:00', '21:00', 10, 29],
  ];
  for (const [name, st, et, cap, fee] of slots) {
    insert('delivery_slots', { name, start_time: st, end_time: et, capacity: cap, books: 0, fee, available: 1, days: JSON.stringify([0,1,2,3,4,5,6]) });
  }
}

function seedCoupons() {
  const coupons: [string, string, number, number, number | null, string | null, string | null][] = [
    ['TVO10', 'percent', 10, 499, 200, null, null],
    ['FIRSTCAKE', 'flat', 150, 699, null, null, null],
    ['SWEET20', 'percent', 20, 1499, 400, null, null],
    ['SWEET10', 'percent', 10, 0, 200, null, null],
    ['CONFETTO', 'flat', 150, 0, null, null, null],
    ['FREE50', 'flat', 50, 0, null, null, null],
  ];
  for (const [code, type, value, min, max, starts, ends] of coupons) {
    insert('coupons', {
      code, discount_type: type, discount_value: value, min_order: min, max_discount: max ?? null,
      max_uses: 1000, uses: 0, starts_at: starts ?? null, ends_at: ends ?? '2027-12-31', active: 1,
      description: `${code} coupon`, product_ids: '[]', category_ids: '[]', customer_ids: '[]',
    });
  }
}

function seedAddons() {
  const addons: [string, number, string][] = [
    ['Candles', 20, 'Decor'],
    ['Cake Topper', 49, 'Decor'],
    ['Greeting Card', 29, 'Gift'],
    ['Balloons', 99, 'Decor'],
    ['Flowers', 199, 'Gift'],
    ['Chocolates', 149, 'Gift'],
    ['Gift Wrap', 59, 'Packaging'],
    ['Premium Packaging', 99, 'Packaging'],
    ['Personalized Message', 0, 'Custom'],
    ['Photo Print', 49, 'Custom'],
    ['Extra Decoration', 99, 'Decor'],
  ];
  for (const [name, price, cat] of addons) {
    insert('addons', { name, price, category: cat, stock: 100, active: 1, description: `${name} add-on`, image: '' });
  }
}

function seedHomepage() {
  const sections: [string, string, string, string, string][] = [
    ['hero', 'Hero', 'Fresh Baked Today', 'Handcrafted Celebrations & Express Delivery', 'Show all cakes', '/shop'],
    ['trending-categories', 'Trending Categories', 'Explore Our Ranges', null, null, null],
    ['most-selling', 'Most Selling Products', 'Bestsellers', null, null, null],
    ['handpicked', 'Handpicked Products', "Chef's Picks", null, null, null],
    ['new-arrivals', 'New Arrivals', 'Just Baked', null, null, null],
    ['custom-orders', 'Custom Orders', 'Design Your Dream Cake', 'Start a Custom Order', '/custom-order'],
    ['service-benefits', 'Service Benefits', 'Why TVO Flavours?', null, null, null],
    ['testimonials', 'Testimonials', 'What Our Customers Say', null, null, null],
    ['blog', 'Blog', 'From the Oven', null, null, null],
    ['newsletter', 'Newsletter', 'Stay Updated', null, null, null],
  ];
  for (const [key, title, heading, description, cta, link] of sections) {
    insert('homepage_sections', {
      key, title, heading: heading || null, description: description || null,
      cta_text: cta || null, cta_link: link || null, image: '', enabled: 1,
      sort_order: 0,
    });
  }
}

function seedNavigation() {
  const items: [string, string, string, number][] = [
    ['Home', '/', 0],
    ['Shop', '/shop', 1],
    ['Cakes', '/cakes', 2],
    ['Birthday Cakes', '/category/birthday-cakes', 3],
    ['Anniversary Cakes', '/category/anniversary-cakes', 4],
    ['Custom Cakes', '/custom-order', 5],
    ['Desserts', '/desserts', 6],
    ['Baking Store', '/baking', 7],
    ['Blog', '/blog', 8],
    ['Contact', '/contact', 9],
  ];
  for (const [label, url, so] of items) insert('navigations', { label, type: 'link', url, sort_order: so, menu_name: 'main', active: 1 });
}

function seedPages() {
  const pages: [string, string, string, string][] = [
    ['About', 'about', 'We are TVO Flavours, your all-in-one baking shop in Gurugram...', 'About | TVO Flavours'],
    ['Contact', 'contact', 'Reach us at hello@tvoflavours.com or +91 7678259522...', 'Contact | TVO Flavours'],
    ['FAQ', 'faq', 'Frequently asked questions', 'FAQ | TVO Flavours'],
    ['Privacy Policy', 'privacy-policy', 'Your privacy matters to us.', 'Privacy Policy | TVO Flavours'],
    ['Terms & Conditions', 'terms-conditions', 'Terms of using tvoflavours.com', 'Terms | TVO Flavours'],
    ['Refund & Returns Policy', 'refund-returns-policy', 'Our refund and return policy.', 'Refund & Returns | TVO Flavours'],
    ['Shipping Policy', 'shipping-policy', 'Our delivery and shipping policy.', 'Shipping Policy | TVO Flavours'],
    ['Cancellation Policy', 'cancellation-policy', 'Our cancellation policy.', 'Cancellation Policy | TVO Flavours'],
    ['Cookie Policy', 'cookie-policy', 'How we use cookies.', 'Cookie Policy | TVO Flavours'],
  ];
  for (const [title, slug, content, seoTitle] of pages) {
    insert('pages', { title, slug, content, seo_title: seoTitle, seo_description: content, published: 1 });
  }
}

function seedFaq() {
  const faqs: [string, string][] = [
    ['How do I place a custom cake order?', 'Use the Custom Order form on our website, select your cake type, weight, flavour and design, then submit. Our team will confirm availability and quote.'],
    ['Do you offer eggless cakes?', 'Yes, we offer 100% eggless options across most of our cakes.'],
    ['What is your delivery area?', 'We currently deliver across Gurugram and select Delhi NCR areas. Use the pincode checker to confirm availability.'],
    ['Can I get a cake delivered today?', 'Yes, same-day delivery is available for orders placed before the daily cutoff, subject to availability and buffer time.'],
    ['How are payments handled?', 'We accept UPI, Credit Cards, Debit Cards and Net Banking. Payments are securely processed by Razorpay.'],
    ['Can I cancel or modify my order?', 'Before production begins, modifications and cancellations are allowed. Contact us at hello@tvoflavours.com.'],
  ];
  for (const [q, a] of faqs) insert('faqs', { question: q, answer: a, published: 1 });
}

function seedEmailTemplates() {
  const templates: [string, string, string, string][] = [
    ['welcome', 'Welcome Email', 'Welcome to TVO Flavours!', 'Hi {{name}}, welcome to TVO Flavours, your all-in-one baking shop.'],
    ['account_created', 'Account Created', 'Your TVO Flavours account', 'Hi {{name}}, your account has been created.'],
    ['order_confirmation', 'Order Confirmation', 'Order {{order_number}} confirmed', 'Thank you {{name}}, your order {{order_number}} is confirmed.'],
    ['payment_confirmation', 'Payment Confirmation', 'Payment received for {{order_number}}', 'We received your payment for order {{order_number}}.'],
    ['order_accepted', 'Order Accepted', 'Your order {{order_number}} is accepted', 'Your order {{order_number}} is now in the kitchen.'],
    ['production_started', 'Production Started', 'Your cake is being prepared', 'Your cake for order {{order_number}} is being baked.'],
    ['ready', 'Order Ready', 'Your order {{order_number}} is ready', 'Your order {{order_number}} is ready for delivery.'],
    ['shipped', 'Shipped', 'Your order {{order_number}} is on the way', 'Your order {{order_number}} has been dispatched.'],
    ['out_for_delivery', 'Out for Delivery', 'Your order is out for delivery', 'Your order {{order_number}} is out for delivery.'],
    ['delivered', 'Delivered', 'Order delivered', 'Your order {{order_number}} has been delivered.'],
    ['cancelled', 'Cancelled', 'Order cancelled', 'Your order {{order_number}} has been cancelled.'],
    ['refund', 'Refund', 'Refund processed', 'Your refund for order {{order_number}} was processed.'],
    ['password_reset', 'Password Reset', 'Reset your password', 'Click the link to reset your password.'],
    ['review_request', 'Review Request', 'How was your order?', 'We would love your feedback on order {{order_number}}.'],
    ['custom_quote', 'Custom Quote', 'Your custom order quote', 'Here is your custom cake quote for request {{request_id}}.'],
  ];
  for (const [key, name, subject, body] of templates) {
    insert('email_templates', { key, name, subject, body, active: 1 });
  }
}

function seedBanners() {
  const banners: [string, string, string, string, string][] = [
    ['Fresh Baked Today', 'Handcrafted celebration cakes delivered fresh.', '/shop', 'Shop Cakes', 'https://tvoflavours.com/wp-content/uploads/2026/05/Banner-min.jpg'],
    ['Diwali Hampers', 'Thoughtful gifting boxes for the season.', '/category/hampers-gifts', 'Explore Hampers', 'https://tvoflavours.com/wp-content/uploads/2026/07/Diwali-Candle-Hamper-of-Light-Blessings.png'],
    ['Custom Cakes', 'Design your dream cake.', '/custom-order', 'Start Custom Order', ''],
  ];
  for (const [title, subtitle, link, cta, img] of banners) {
    insert('banners', { title, subtitle, cta_text: cta, cta_link: link, image: img, active: 1 });
  }
}
