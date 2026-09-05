import { ok, err, slugify } from '../../../lib/server/api';
import { serializeProduct, PRODUCT_BASE_SELECT } from '../../../lib/server/product-serializer';

export const runtime = 'nodejs';

let db: any;

function getDb() {
  if (!db) db = require('../../../lib/server/db').db;
  return db;
}

const BASE_SELECT = PRODUCT_BASE_SELECT;

export async function GET(req: Request) {
  const data = getDb();
  const url = new URL(req.url);
  const search = (url.searchParams.get('search') || '').trim();
  const category = url.searchParams.get('category') || '';
  const slug = url.searchParams.get('slug') || '';
  const id = url.searchParams.get('id') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const order = url.searchParams.get('order') || '';

  try {
    if (slug) {
      const row = data.prepare(`${BASE_SELECT} WHERE p.slug=? LIMIT 1`).get(slug);
      return ok(serializeProduct(row));
    }
    if (id) {
      const row = data.prepare(`${BASE_SELECT} WHERE p.id=? LIMIT 1`).get(id);
      return ok(serializeProduct(row));
    }
    const ids = url.searchParams.get('ids') || '';
    if (ids) {
      const list = ids.split(',').map((x) => x.trim()).filter(Boolean);
      if (list.length > 0) {
        const marks = list.map(() => '?').join(',');
        const rows = data.prepare(`${BASE_SELECT} WHERE p.deleted_at IS NULL AND p.published=1 AND p.id IN (${marks})`).all(...list);
        const byId = new Map(rows.map((r) => [String(r.id), r]));
        return ok({ products: list.map((i) => serializeProduct(byId.get(i))).filter(Boolean) });
      }
    }

    let where = 'p.deleted_at IS NULL AND p.published = 1';
    const params: any[] = [];
    if (search) {
      where += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.short_description LIKE ? OR p.tags LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (category) {
      where += ` AND (c.slug=? OR c.id IN (SELECT id FROM categories WHERE parent_id = (SELECT id FROM categories WHERE slug=?)))`;
      params.push(category, category);
    }

    let orderBy = 'p.name ASC';
    if (order === 'price-asc') orderBy = 'COALESCE(p.sale_price,p.regular_price) ASC';
    if (order === 'price-desc') orderBy = 'COALESCE(p.sale_price,p.regular_price) DESC';
    if (order === 'bestseller') orderBy = 'p.bestseller DESC, p.name ASC';
    if (order === 'newest') orderBy = 'p.created_at DESC';

    const rows = data
      .prepare(`${BASE_SELECT} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);
    const count = data.prepare(`SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE ${where}`).get(...params).c;
    return ok({ products: rows.map(serializeProduct), total: count });
  } catch (e: any) {
    return err(e.message || 'Error fetching products', 500);
  }
}
