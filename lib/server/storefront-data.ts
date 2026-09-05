import { db } from './db';
import { seedIfEmpty } from './seed';
seedIfEmpty();
import { serializeProduct } from './product-serializer';
import { buildTree } from './category-tree';
import { normalizeImageUrl } from '../imageUrl';

export function getProducts(filter?: { category?: string; limit?: number; order?: string }) {
  let sql = 'SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.deleted_at IS NULL AND p.published=1';
  const params: any[] = [];
  if (filter?.category) {
    sql += ' AND (c.slug=? OR c.parent_id IN (SELECT id FROM categories WHERE slug=?))';
    params.push(filter.category, filter.category);
  }
  const order = filter?.order || 'name';
  let orderBy = 'p.name ASC';
  if (order === 'price-asc') orderBy = 'COALESCE(p.sale_price,p.regular_price) ASC';
  if (order === 'price-desc') orderBy = 'COALESCE(p.sale_price,p.regular_price) DESC';
  if (order === 'bestseller') orderBy = 'p.bestseller DESC, p.name ASC';
  if (order === 'newest') orderBy = 'p.created_at DESC';
  sql += ` ORDER BY ${orderBy}`;
  if (filter?.limit) { sql += ' LIMIT ?'; params.push(filter.limit); }
  const rows = db.prepare(sql).all(...params);
  return rows.map(serializeProduct);
}

export function getProductBySlug(slug: string, includeUnpublished = false) {
  let sql = 'SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.slug=?';
  if (!includeUnpublished) sql += ' AND p.published=1 AND p.deleted_at IS NULL';
  const row = db.prepare(sql).get(slug);
  return row ? serializeProduct(row) : null;
}

export function getCategories() {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all() as any[];
  for (const c of rows) {
    if (!c.image) {
      const prod = db.prepare('SELECT images_json FROM products WHERE category_id=? AND published=1 AND deleted_at IS NULL LIMIT 1').get(c.id) as any;
      if (prod && prod.images_json) {
        try {
          const imgs = JSON.parse(prod.images_json);
          if (imgs && imgs.length > 0) {
            c.image = normalizeImageUrl(typeof imgs[0] === 'string' ? imgs[0] : (imgs[0]?.url || ''));
          }
        } catch {}
      }
    }
  }
  return buildTree(rows, null);
}

export function getCategoryBySlug(slug: string) {
  return db.prepare('SELECT * FROM categories WHERE slug=?').get(slug);
}

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all() as any[];
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
}

export function getHomepage() {
  const sections = db.prepare('SELECT * FROM homepage_sections WHERE enabled=1 ORDER BY sort_order').all() as any[];
  const banners = db.prepare('SELECT * FROM banners WHERE active=1 ORDER BY sort_order').all() as any[];
  return { sections, banners };
}

export function getNav() {
  return db.prepare('SELECT * FROM navigations WHERE active=1 AND menu_name=\'main\' ORDER BY sort_order').all() as any[];
}

export function getPages() {
  return db.prepare('SELECT id, title, slug, published FROM pages').all() as any[];
}

export function getBlogPosts() {
  return db.prepare("SELECT id, title, slug, category, excerpt, featured_image, author, published, created_at FROM blog_posts WHERE published=1 ORDER BY created_at DESC").all() as any[];
}

export function getTestimonials() {
  return db.prepare("SELECT * FROM testimonials WHERE status='approved' ORDER BY id DESC").all() as any[];
}

export function getImageObj(row: any): string[] {
  try { return JSON.parse(row.images_json || '[]').map((i: any) => normalizeImageUrl(typeof i === 'string' ? i : (i?.url || ''))).filter(Boolean); }
  catch { return []; }
}
