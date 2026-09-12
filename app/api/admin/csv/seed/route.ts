import { ok, err, getCurrentUser, isAdminRole } from '../../../../../lib/server/api';
import { upsertProduct } from '../../../../../lib/server/admin-catalog';
import { db } from '../../../../../lib/server/db';

export const runtime = 'nodejs';

function requireAdmin(req: Request) {
  const user = getCurrentUser(req);
  if (!user || !isAdminRole(user.role)) return null;
  return user;
}

export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;

    // Check if products already exist
    const existingProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL').get() as { count: number };
    if (!force && existingProducts && existingProducts.count > 0) {
      return ok({ success: true, message: 'Database already populated with products.' });
    }

    // Import the initial data
    const { INITIAL_CATEGORIES } = await import('../../../../../lib/seedData');
    const { INITIAL_PRODUCTS } = await import('../../../../../lib/seedData');
    const { DEFAULT_PROMO_CODES } = await import('../../../../../lib/seedData');
    const { DEFAULT_STORE_SETTINGS } = await import('../../../../../lib/seedData');

    // Seed Categories
    for (const cat of INITIAL_CATEGORIES) {
      const exists = db.prepare('SELECT id FROM categories WHERE id = ?').get(cat.id);
      if (!exists) {
        db.prepare(`
          INSERT INTO categories (id, name, slug, parent_id, description, image, display_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(cat.id, cat.name, cat.slug, cat.parentSlug || null, cat.description || null, cat.image || null, cat.displayOrder || 0);
      }
    }

    // Seed Products
    for (const prod of INITIAL_PRODUCTS) {
      const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(prod.id);
      if (!exists) {
        db.prepare(`
          INSERT INTO products (id, sku, name, slug, short_description, description, category_id, tags, flavours, eggless, weight_options_json, images_json, rating, review_count, stock, stock_status, badges, published, seo_title, seo_description, selling_unit, created_at, updated_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        `).run(
          prod.id,
          prod.sku || `SKU-${prod.id}`,
          prod.name,
          prod.slug,
          prod.shortDescription || '',
          prod.description || '',
          prod.category || 'birthday',
          JSON.stringify(prod.tags || []),
          JSON.stringify(prod.flavours || []),
          prod.eggless ? 1 : 0,
          JSON.stringify(prod.weightOptions || []),
          JSON.stringify(prod.images || []),
          prod.rating || 4.8,
          prod.reviewCount || 1,
          prod.stock || 20,
          prod.stockStatus || 'in_stock',
          JSON.stringify(prod.badges || []),
          prod.published ? 1 : 0,
          prod.seoTitle || '',
          prod.seoDescription || '',
          prod.sellingUnit || 'weight',
          user?.name || 'Chef Administrator'
        );
      }
    }

    // Seed Promo Codes
    for (const promo of DEFAULT_PROMO_CODES) {
      const exists = db.prepare('SELECT code FROM promo_codes WHERE code = ?').get(promo.code);
      if (!exists) {
        db.prepare(`
          INSERT INTO promo_codes (code, discount_type, discount_value, min_order_value, max_discount, active, expires_at, description, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          promo.code,
          promo.discountType,
          promo.discountValue,
          promo.minOrderValue || 0,
          promo.maxDiscount || 0,
          promo.active ? 1 : 0,
          promo.expiresAt || '2027-12-31',
          promo.description || ''
        );
      }
    }

    // Seed Store Settings
    const settingsExists = db.prepare('SELECT key FROM settings WHERE key = ?').get('general');
    if (!settingsExists) {
      db.prepare(`
        INSERT INTO settings (key, value_json, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `).run('general', JSON.stringify(DEFAULT_STORE_SETTINGS));
    }

    return ok({ success: true, message: 'TVO Flavours database successfully seeded with all CSV products and categories!' });
  } catch (e: any) {
    console.error('Seeding error:', e);
    return err(e.message || 'Failed to seed database', 500);
  }
}