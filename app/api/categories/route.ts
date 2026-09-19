import { ok, err } from '../../../lib/server/api';
import { buildTree } from '../../../lib/server/category-tree';
import { MASTER_5_MAIN_CATEGORIES } from '../../../lib/masterCatalogHierarchy';
import { normalizeImageUrl, DEFAULT_FALLBACK_IMAGE } from '../../../lib/imageUrl';

export const runtime = 'nodejs';
let db: any;
function getDb() {
  if (!db) db = require('../../../lib/server/db').db;
  return db;
}

function getHierarchyCategoryImage(slug: string): string | null {
  for (const main of MASTER_5_MAIN_CATEGORIES) {
    if (main.slug === slug) return main.image;
    for (const sub of main.subcategories) {
      if (sub.slug === slug) return sub.image;
      if (sub.childCategories) {
        for (const child of sub.childCategories) {
          if (child.slug === slug) return child.image;
        }
      }
    }
  }
  return null;
}

export async function GET() {
  const data = getDb();
  try {
    const rows = data.prepare('SELECT * FROM categories ORDER BY sort_order, name').all() as any[];
    for (const c of rows) {
      if (!c.image) {
        const hierarchyImg = getHierarchyCategoryImage(c.slug);
        if (hierarchyImg) {
          c.image = normalizeImageUrl(hierarchyImg);
        } else {
          const prod = data
            .prepare('SELECT images_json FROM products WHERE category_id=? AND published=1 AND deleted_at IS NULL LIMIT 1')
            .get(c.id) as any;
          if (prod && prod.images_json) {
            try {
              const imgs = JSON.parse(prod.images_json);
              if (imgs && imgs.length > 0) {
                c.image = normalizeImageUrl(typeof imgs[0] === 'string' ? imgs[0] : (imgs[0]?.url || ''));
              }
            } catch {}
          }
          if (!c.image) {
            c.image = DEFAULT_FALLBACK_IMAGE;
          }
        }
      } else {
        c.image = normalizeImageUrl(c.image);
      }
    }
    return ok({ categories: buildTree(rows, null), flat: rows });
  } catch (e: any) {
    return err(e.message, 500);
  }
}
