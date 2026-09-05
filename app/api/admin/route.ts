import { ok, err, db, getCurrentUser, isAdminRole, logAudit, jsonParseSafe, slugify } from '../../../lib/server/api';
import { getCatalogSourceConfig } from '../../../lib/server/catalog-sources';
import * as ops from '../../../lib/server/admin-ops';

export const runtime = 'nodejs';

function admin(req: Request) {
  const u = getCurrentUser(req);
  return u && isAdminRole(u.role) ? u : null;
}

function isSuper(user: any) { return !!user && user.role === 'super_admin'; }

export async function GET(req: Request) {
  const user = admin(req);
  if (!user) return err('Admin access required', 403);
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'orders';
  const status = url.searchParams.get('status') || '';
  const search = (url.searchParams.get('search') || '').trim();
  try {
    if (type === 'orders') {
      const q = search ? `%${search}%` : null;
      let rows;
      if (status) rows = db.prepare('SELECT * FROM orders WHERE status=? ORDER BY created_at DESC LIMIT 300').all(status);
      else if (q) rows = db.prepare(`SELECT * FROM orders WHERE order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ? ORDER BY created_at DESC LIMIT 300`).all(q, q, q, q);
      else rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 300').all();
      for (const o of rows) { o.items = jsonParseSafe(o.items, []); o.timeline = jsonParseSafe(o.timeline, []); }
      return ok({ orders: rows });
    }
    if (type === 'categories') return ok({ categories: db.prepare('SELECT * FROM categories ORDER BY name').all() });
    if (type === 'coupons') return ok({ coupons: db.prepare('SELECT * FROM coupons ORDER BY id DESC').all() });
    if (type === 'customers') return ok({ customers: db.prepare('SELECT * FROM customers ORDER BY id DESC LIMIT 300').all() });
    if (type === 'custom') return ok({ requests: db.prepare('SELECT * FROM custom_requests ORDER BY created_at DESC LIMIT 300').all() });
    if (type === 'delivery_slots') return ok({ slots: db.prepare('SELECT * FROM delivery_slots ORDER BY start_time').all() });
    if (type === 'addons') return ok({ addons: db.prepare('SELECT * FROM addons').all() });
    if (type === 'settings') return ok({ settings: Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, r.value])) });
    if (type === 'audit') return ok({ audit: db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200').all() });
    if (type === 'reviews') return ok({ reviews: db.prepare('SELECT * FROM product_reviews ORDER BY id DESC LIMIT 300').all() });
    if (type === 'catalog_sources') return ok({ ...getCatalogSourceConfig() });
    if (type === 'static_blocks') return ok({ blocks: db.prepare('SELECT * FROM static_blocks').all() });
    if (type === 'testimonials') return ok({ testimonials: db.prepare('SELECT * FROM testimonials').all() });
    if (type === 'faqs') return ok({ faqs: db.prepare('SELECT * FROM faqs').all() });
    if (type === 'pages') return ok({ pages: db.prepare('SELECT * FROM pages').all() });
    if (type === 'blog') return ok({ posts: db.prepare('SELECT * FROM blog_posts ORDER BY created_at DESC').all() });
    if (type === 'banners') return ok({ banners: db.prepare('SELECT * FROM banners').all() });
    if (type === 'homepage') return ok({ sections: db.prepare('SELECT * FROM homepage_sections ORDER BY sort_order').all() });
    if (type === 'media') return ok({ media: db.prepare('SELECT * FROM media ORDER BY id DESC LIMIT 200').all() });
    // ---- Phase 2 domains ----
    if (type === 'order') {
      const order = ops.getOrder(user, Number(url.searchParams.get('id')));
      if (!order) return err('Order not found', 404);
      return ok({ order });
    }
    if (type === 'orders_page') {
      const statusParam = url.searchParams.get('status') || '';
      const search = url.searchParams.get('search') || '';
      const payment = url.searchParams.get('payment') || '';
      const page = url.searchParams.get('page') || '1';
      const r = ops.listOrders(user, { status: statusParam || undefined, search: search || undefined, payment: payment || undefined, page: Number(page) });
      return ok(r);
    }
    if (type === 'order_statuses') return ok({ statuses: ops.ORDER_STATUSES, paymentStatuses: ops.PAYMENT_STATUSES });
    if (type === 'customer') {
      const c = ops.getCustomer(user, Number(url.searchParams.get('id')));
      if (!c) return err('Customer not found', 404);
      return ok({ customer: c });
    }
    if (type === 'customers_page') {
      const r = ops.listCustomers(user, { search: url.searchParams.get('search') || undefined, page: Number(url.searchParams.get('page') || '1') });
      return ok(r);
    }
    if (type === 'delivery') return ok(ops.listDelivery(user));
    if (type === 'slots') return ok({ slots: ops.getSlots(user) });
    if (type === 'payment_config') { if (!isSuper(user)) return err('Super admin access required', 403); return ok({ config: ops.getPaymentConfig(user) }); }
    if (type === 'refunds') return ok({ refunds: ops.listRefunds(user, url.searchParams.get('status') || undefined) });
    if (type === 'payments_ledger') return ok({ payments: ops.listPaymentsLedger(user) });
    if (type === 'coupons_full') return ok({ coupons: ops.listCoupons(user) });
    if (type === 'gift_cards') return ok({ giftCards: ops.listGiftCards(user) });
    if (type === 'reviews_full') {
      const r = ops.listReviews(user, { status: url.searchParams.get('status') || undefined, productId: url.searchParams.get('product_id') ? Number(url.searchParams.get('product_id')) : undefined });
      return ok({ reviews: r });
    }
    if (type === 'custom_full') return ok({ requests: ops.listCustomRequests(user, url.searchParams.get('status') || undefined) });
    if (type === 'homepage_config') return ok(ops.listHomepageConfig(user));
    if (type === 'pages_full') return ok({ pages: ops.listPages(user) });
    if (type === 'testimonials_full') return ok({ testimonials: ops.listTestimonials(user) });
    if (type === 'email_templates') return ok({ templates: ops.listEmailTemplates(user) });
    if (type === 'blog_full') return ok({ posts: ops.listBlogPosts(user) });
    if (type === 'inventory_full') return ok(ops.listInventory(user));
    if (type === 'admin_users') { if (!isSuper(user)) return err('Super admin access required', 403); return ok({ users: ops.listAdminUsers(user), roles: ops.listRoles(user) }); }
    if (type === 'settings_full') { if (!isSuper(user)) return err('Super admin access required', 403); return ok({ settings: ops.getAllSettings(user) }); }
    if (type === 'audit_full') return ok({ audit: ops.listAudit(user, Number(url.searchParams.get('limit') || '300')) });
    if (type === 'tickets') return ok({ tickets: ops.listTickets(user, url.searchParams.get('status') || undefined) });
    if (type === 'notifications') return ok({ notifications: ops.getNotifications(user) });
    if (type === 'customers_simple') return ok({ customers: db.prepare('SELECT id, name, email, phone FROM customers ORDER BY name LIMIT 500').all() });
    if (type === 'products_simple') return ok({ products: db.prepare('SELECT id, name, sku, sale_price, regular_price FROM products WHERE deleted_at IS NULL AND published=1 ORDER BY name LIMIT 1500').all() });
    return ok({});
  } catch (e: any) { return err(e.message, 500); }
}

export async function POST(req: Request) {
  const user = admin(req);
  if (!user) return err('Admin access required', 403);
  const body = await req.json().catch(() => ({}));
  const type = body.type;
  const action = body.action;
  try {
    // ---- ORDERS ----
    if (type === 'orders' && action === 'status') {
      db.prepare('UPDATE orders SET status=?, updated_at=datetime(\'now\') WHERE id=?').run(body.status, body.id);
      db.prepare('INSERT INTO order_status_history (order_id, status, note, user_id) VALUES (?,?,?,?)').run(body.id, body.status, body.note || null, user.id);
      logAudit(user, 'ORDER_STATUS_UPDATE', 'Order', String(body.id), body.status);
      return ok({ ok: true });
    }
    if (type === 'orders' && action === 'note') {
      db.prepare('UPDATE orders SET tracking_note=?, updated_at=datetime(\'now\') WHERE id=?').run(body.note, body.id);
      return ok({ ok: true });
    }
    if (type === 'orders' && action === 'internal_note') {
      db.prepare('UPDATE orders SET internal_notes=?, updated_at=datetime(\'now\') WHERE id=?').run(body.note, body.id);
      return ok({ ok: true });
    }
    if (type === 'orders' && action === 'priority') {
      db.prepare('UPDATE orders SET priority=?, updated_at=datetime(\'now\') WHERE id=?').run(body.priority, body.id);
      return ok({ ok: true });
    }
    if (type === 'orders' && action === 'payment') {
      db.prepare('UPDATE orders SET payment_status=?, updated_at=datetime(\'now\') WHERE id=?').run(body.payment_status, body.id);
      return ok({ ok: true });
    }
    if (type === 'orders' && action === 'delete') {
      db.prepare('DELETE FROM orders WHERE id=?').run(body.id);
      return ok({ ok: true });
    }

    // ---- CATEGORIES ----
    if (type === 'categories' && (action === 'create' || action === 'update')) {
      const slug = slugify(body.name);
      if (action === 'create') {
        db.prepare('INSERT INTO categories (name, slug, parent_id, description, image, sort_order) VALUES (?,?,?,?,?,?)')
          .run(body.name, slug, body.parent_id || null, body.description || null, body.image || null, body.sort_order || 0);
      } else {
        db.prepare('UPDATE categories SET name=?, slug=?, parent_id=?, description=?, image=?, sort_order=? WHERE id=?')
          .run(body.name, slug, body.parent_id || null, body.description || null, body.image || null, body.sort_order || 0, body.id);
      }
      logAudit(user, 'CATEGORY_' + (action === 'create' ? 'CREATE' : 'UPDATE'), 'Category', slug);
      return ok({ ok: true });
    }
    if (type === 'categories' && action === 'delete') {
      db.prepare('DELETE FROM categories WHERE id=?').run(body.id);
      return ok({ ok: true });
    }

    // ---- COUPONS ----
    if (type === 'coupons' && (action === 'create' || action === 'update')) {
      const code = (body.code || '').toUpperCase().trim();
      const obj = { code, discount_type: body.discount_type, discount_value: body.discount_value, min_order: body.min_order || 0, max_discount: body.max_discount || null, max_uses: body.max_uses || null, active: body.active ? 1 : 0, description: body.description || null, product_ids: JSON.stringify(body.product_ids || []), category_ids: JSON.stringify(body.category_ids || []) };
      if (action === 'create') db.prepare('INSERT INTO coupons (code, discount_type, discount_value, min_order, max_discount, max_uses, active, description, product_ids, category_ids) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(obj.code, obj.discount_type, obj.discount_value, obj.min_order, obj.max_discount, obj.max_uses, obj.active, obj.description, obj.product_ids, obj.category_ids);
      else db.prepare('UPDATE coupons SET code=?, discount_type=?, discount_value=?, min_order=?, max_discount=?, max_uses=?, active=?, description=?, product_ids=?, category_ids=? WHERE id=?')
        .run(obj.code, obj.discount_type, obj.discount_value, obj.min_order, obj.max_discount, obj.max_uses, obj.active, obj.description, obj.product_ids, obj.category_ids, body.id);
      logAudit(user, 'COUPON_' + (action === 'create' ? 'CREATE' : 'UPDATE'), 'Coupon', code);
      return ok({ ok: true });
    }
    if (type === 'coupons' && action === 'delete') { db.prepare('DELETE FROM coupons WHERE id=?').run(body.id); return ok({ ok: true }); }

    // ---- SETTINGS ----
    if (type === 'settings') {
      if (!isSuper(user)) return err('Super admin access required', 403);
      for (const [k, v] of Object.entries(body.settings || {})) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, String(v));
      }
      logAudit(user, 'SETTINGS_UPDATE', 'Settings');
      return ok({ ok: true });
    }

    // ---- DELIVERY SLOTS ----
    if (type === 'delivery_slots' && (action === 'create' || action === 'update')) {
      if (action === 'create') db.prepare('INSERT INTO delivery_slots (name, start_time, end_time, capacity, fee, available, days) VALUES (?,?,?,?,?,?,?)').run(body.name, body.start_time, body.end_time, body.capacity, body.fee, body.available ? 1 : 0, JSON.stringify(body.days || [0,1,2,3,4,5,6]));
      else db.prepare('UPDATE delivery_slots SET name=?, start_time=?, end_time=?, capacity=?, fee=?, available=?, days=? WHERE id=?').run(body.name, body.start_time, body.end_time, body.capacity, body.fee, body.available ? 1 : 0, JSON.stringify(body.days || [0,1,2,3,4,5,6]), body.id);
      return ok({ ok: true });
    }

    // ---- ADMINS ----
    // ---- USERS (Legacy removed to prevent privilege escalation) ----
    if (type === 'users' && action === 'create') {
      return err('Use admin_users endpoint for user management', 403);
    }

    // ---- CUSTOM REQUESTS ----
    if (type === 'custom' && action === 'update') {
      db.prepare('UPDATE custom_requests SET status=?, quote_price=?, quote_notes=?, updated_at=datetime(\'now\') WHERE id=?')
        .run(body.status, body.quote_price ?? null, body.quote_notes ?? null, body.id);
      logAudit(user, 'CUSTOM_QUOTE', 'CustomRequest', String(body.id));
      return ok({ ok: true });
    }

    // ---- REVIEWS moderation ----
    if (type === 'reviews' && action === 'moderate') {
      db.prepare('UPDATE product_reviews SET status=? WHERE id=?').run(body.status, body.id);
      return ok({ ok: true });
    }
    if (type === 'reviews' && action === 'delete') {
      db.prepare('DELETE FROM product_reviews WHERE id=?').run(body.id);
      return ok({ ok: true });
    }

    // ---- CMS: banners / homepage / pages / blog / faqs / static blocks / testimonials / media ----
    if (type === 'banners' && (action === 'create' || action === 'update')) {
      const obj = [body.title, body.subtitle, body.image, body.cta_text, body.cta_link, body.active ? 1 : 0, body.sort_order || 0];
      if (action === 'create') db.prepare('INSERT INTO banners (title, subtitle, image, cta_text, cta_link, active, sort_order) VALUES (?,?,?,?,?,?,?)').run(...obj);
      else db.prepare('UPDATE banners SET title=?, subtitle=?, image=?, cta_text=?, cta_link=?, active=?, sort_order=? WHERE id=?').run(...obj, body.id);
      return ok({ ok: true });
    }
    if (type === 'banners' && action === 'delete') { db.prepare('DELETE FROM banners WHERE id=?').run(body.id); return ok({ ok: true }); }

    if (type === 'homepage' && action === 'update') {
      db.prepare('UPDATE homepage_sections SET title=?, heading=?, description=?, cta_text=?, cta_link=?, image=?, enabled=?, sort_order=? WHERE key=?')
        .run(body.title, body.heading, body.description, body.cta_text, body.cta_link, body.image, body.enabled ? 1 : 0, body.sort_order || 0, body.key);
      return ok({ ok: true });
    }

    if (type === 'faqs' && (action === 'create' || action === 'update')) {
      if (action === 'create') db.prepare('INSERT INTO faqs (question, answer, published) VALUES (?,?,?)').run(body.question, body.answer, body.published ? 1 : 0);
      else db.prepare('UPDATE faqs SET question=?, answer=?, published=? WHERE id=?').run(body.question, body.answer, body.published ? 1 : 0, body.id);
      return ok({ ok: true });
    }
    if (type === 'faqs' && action === 'delete') { db.prepare('DELETE FROM faqs WHERE id=?').run(body.id); return ok({ ok: true }); }

    if (type === 'static_blocks' && action === 'upsert') {
      db.prepare('INSERT INTO static_blocks (key, title, content, active) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET title=excluded.title, content=excluded.content, active=excluded.active')
        .run(body.key, body.title || body.key, body.content || '', body.active ? 1 : 0);
      return ok({ ok: true });
    }

    if (type === 'testimonials' && action === 'moderate') {
      db.prepare('UPDATE testimonials SET status=? WHERE id=?').run(body.status, body.id);
      return ok({ ok: true });
    }
    if (type === 'testimonials' && (action === 'create' || action === 'update')) {
      if (action === 'create') db.prepare('INSERT INTO testimonials (customer_name, content, rating, status) VALUES (?,?,?,?)').run(body.customer_name, body.content, body.rating || 5, body.status || 'approved');
      else db.prepare('UPDATE testimonials SET customer_name=?, content=?, rating=?, status=? WHERE id=?').run(body.customer_name, body.content, body.rating || 5, body.status || 'approved', body.id);
      return ok({ ok: true });
    }

    if (type === 'blog' && (action === 'create' || action === 'update')) {
      const slug = slugify(body.title);
      if (action === 'create') db.prepare('INSERT INTO blog_posts (title, slug, category, tags, excerpt, content, featured_image, author, seo_title, seo_description, published) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .run(body.title, slug, body.category || null, JSON.stringify(body.tags || []), body.excerpt || null, body.content || '', body.featured_image || null, body.author || user.name, body.seo_title || null, body.seo_description || null, body.published ? 1 : 0);
      else db.prepare('UPDATE blog_posts SET title=?, slug=?, category=?, tags=?, excerpt=?, content=?, featured_image=?, author=?, seo_title=?, seo_description=?, published=? WHERE id=?')
        .run(body.title, slug, body.category || null, JSON.stringify(body.tags || []), body.excerpt || null, body.content || '', body.featured_image || null, body.author || user.name, body.seo_title || null, body.seo_description || null, body.published ? 1 : 0, body.id);
      return ok({ ok: true });
    }
    if (type === 'blog' && action === 'delete') { db.prepare('DELETE FROM blog_posts WHERE id=?').run(body.id); return ok({ ok: true }); }
    if (type === 'blog' && action === 'toggle') { db.prepare('UPDATE blog_posts SET published = 1 - published WHERE id=?').run(body.id); return ok({ ok: true }); }

    if (type === 'pages' && (action === 'create' || action === 'update')) {
      const slug = slugify(body.title);
      if (action === 'create') db.prepare('INSERT INTO pages (title, slug, content, published, seo_title, seo_description) VALUES (?,?,?,?,?,?)').run(body.title, slug, body.content || '', body.published ? 1 : 0, body.seo_title || null, body.seo_description || null);
      else db.prepare('UPDATE pages SET title=?, slug=?, content=?, published=?, seo_title=?, seo_description=?, updated_at=datetime(\'now\') WHERE id=?').run(body.title, slug, body.content || '', body.published ? 1 : 0, body.seo_title || null, body.seo_description || null, body.id);
      return ok({ ok: true });
    }
    if (type === 'pages' && action === 'delete') { db.prepare('DELETE FROM pages WHERE id=?').run(body.id); return ok({ ok: true }); }

    if (type === 'media' && action === 'add') {
      db.prepare('INSERT INTO media (file_name, url, alt_text, folder) VALUES (?,?,?,?)').run(body.file_name, body.url, body.alt_text || null, body.folder || 'General');
      return ok({ ok: true });
    }
    if (type === 'media' && action === 'delete') { db.prepare('DELETE FROM media WHERE id=?').run(body.id); return ok({ ok: true }); }

    // ===================== PHASE 2 =====================
    // ---- Orders full ----
    if (type === 'orders' && action === 'update_status') return ok(ops.updateOrderStatus(user, body.id, body.status, body.note));
    if (type === 'orders' && action === 'update_payment') return ok(ops.updateOrderPayment(user, body.id, body.payment_status, body.method, body.transaction_id, body.amount));
    if (type === 'orders' && action === 'add_note') return ok(ops.addOrderNote(user, body.id, body.body, body.is_internal));
    if (type === 'orders' && action === 'update_details') return ok(ops.updateOrderDetails(user, body.id, body.fields || body));
    if (type === 'orders' && action === 'refund') return ok(ops.createRefund(user, body.id, Number(body.amount), body.reason));
    if (type === 'orders' && action === 'cancel') return ok(ops.cancelOrder(user, body.id, body.reason));
    if (type === 'refunds' && action === 'update_status') return ok(ops.updateRefundStatus(user, body.id, body.status));

    // ---- Customers ----
    if (type === 'customers' && action === 'create') return ok(ops.createCustomer(user, body));
    if (type === 'customers' && action === 'update') return ok(ops.updateCustomer(user, body.id, body));

    // ---- Delivery ----
    if (type === 'delivery_slots' && action === 'save') return ok(ops.saveSlot(user, body));
    if (type === 'delivery_slots' && action === 'delete') return ok(ops.deleteSlot(user, body.id));
    if (type === 'delivery_zones' && action === 'save') return ok(ops.saveZone(user, body));
    if (type === 'delivery_zones' && action === 'delete') return ok(ops.deleteZone(user, body.id));
    if (type === 'pincodes' && action === 'save') return ok(ops.savePincode(user, body));
    if (type === 'pincodes' && action === 'delete') return ok(ops.deletePincode(user, body.id));
    if (type === 'blackout' && action === 'save') return ok(ops.saveBlackout(user, body));
    if (type === 'blackout' && action === 'delete') return ok(ops.deleteBlackout(user, body.id));
    if (type === 'buffer' && action === 'save') return ok(ops.saveBuffer(user, body));
    if (type === 'production' && action === 'save') return ok(ops.saveProductionCapacity(user, body));
    if (type === 'slot_capacity' && action === 'save') return ok(ops.setSlotCapacity(user, body));

    // ---- Payments / Settings (super_admin only - sensitive) ----
    if (type === 'payment_config' && action === 'save') { if (!isSuper(user)) return err('Super admin access required', 403); return ok(ops.savePaymentConfig(user, body.settings || body)); }
    if (type === 'settings' && action === 'save_full') { if (!isSuper(user)) return err('Super admin access required', 403); return ok(ops.saveSettings(user, body.settings || {})); }

    // ---- Coupons / Gift cards ----
    if (type === 'coupons' && action === 'save_full') return ok(ops.saveCoupon(user, body));
    if (type === 'coupons' && action === 'delete_full') return ok(ops.deleteCoupon(user, body.id));
    if (type === 'gift_cards' && action === 'save') return ok(ops.saveGiftCard(user, body));
    if (type === 'gift_cards' && action === 'delete') return ok(ops.deleteGiftCard(user, body.id));

    // ---- Reviews ----
    if (type === 'reviews' && action === 'save') return ok(ops.saveReview(user, body));
    if (type === 'reviews' && action === 'delete_full') return ok(ops.deleteReview(user, body.id));

    // ---- Custom requests ----
    if (type === 'custom' && action === 'quote') return ok(ops.quoteCustomRequest(user, body.id, body.quote_price, body.quote_notes, body.status));
    if (type === 'custom' && action === 'status_only') return ok(ops.setCustomRequestStatus(user, body.id, body.status));

    // ---- Marketing ----
    if (type === 'homepage_sections' && action === 'save') return ok(ops.saveHomepageSection(user, body));
    if (type === 'banners' && action === 'save') return ok(ops.saveBanner(user, body));
    if (type === 'slides' && action === 'save') return ok(ops.saveSlide(user, body));
    if (type === 'slides' && action === 'delete') return ok(ops.deleteSlide(user, body.id));
    if (type === 'navigations' && action === 'save') return ok(ops.saveNav(user, body));
    if (type === 'navigations' && action === 'delete') return ok(ops.deleteNav(user, body.id));
    if (type === 'static_blocks' && action === 'save') return ok(ops.saveStaticBlock(user, body));

    // ---- CMS ----
    if (type === 'pages' && action === 'save_full') return ok(ops.savePage(user, body));
    if (type === 'testimonials' && action === 'save_full') return ok(ops.saveTestimonial(user, body));
    if (type === 'testimonials' && action === 'delete_full') return ok(ops.deleteTestimonial(user, body.id));
    if (type === 'faqs' && action === 'save_full') return ok(ops.saveFaq(user, body));
    if (type === 'faqs' && action === 'delete_full') return ok(ops.deleteFaq(user, body.id));
    if (type === 'email_templates' && action === 'save') return ok(ops.saveEmailTemplate(user, body));
    if (type === 'blog' && action === 'save_full') return ok(ops.saveBlogPost(user, body));
    if (type === 'blog' && action === 'delete_full') return ok(ops.deleteBlogPost(user, body.id));

    // ---- Inventory ----
    if (type === 'inventory' && action === 'adjust') return ok(ops.updateProductStock(user, body.id, body.qty, body.note));
    if (type === 'inventory' && action === 'set') return ok(ops.setProductStock(user, body.id, body.qty, body.note));
    if (type === 'ingredients' && action === 'save') return ok(ops.saveIngredient(user, body));
    if (type === 'ingredients' && action === 'delete') return ok(ops.deleteIngredient(user, body.id));

    // ---- Admin users & roles (super_admin only) ----
    if (type === 'admin_users' && action === 'create') { if (!isSuper(user)) return err('Super admin access required', 403); return ok(ops.createAdminUser(user, body)); }
    if (type === 'admin_users' && action === 'update') { if (!isSuper(user)) return err('Super admin access required', 403); return ok(ops.updateAdminUser(user, body.id, body)); }
    if (type === 'admin_users' && action === 'delete') { if (!isSuper(user)) return err('Super admin access required', 403); return ok(ops.deleteAdminUser(user, body.id)); }
    if (type === 'roles' && action === 'save') { if (!isSuper(user)) return err('Super admin access required', 403); return ok(ops.saveRole(user, body)); }
    if (type === 'roles' && action === 'delete') { if (!isSuper(user)) return err('Super admin access required', 403); return ok(ops.deleteRole(user, body.id)); }

    // ---- Support / notifications ----
    if (type === 'tickets' && action === 'update_status') return ok(ops.updateTicketStatus(user, body.id, body.status));

    return err('Unknown admin action');
  } catch (e: any) { return err(e.message, 500); }
}
