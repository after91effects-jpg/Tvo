import { db } from './db';
import { logAudit, slugify } from './api';

// ============================================================================
// Categories
// ============================================================================
function listCategories() {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all() as any[];
  const counts = db.prepare('SELECT category_id, COUNT(*) AS c FROM products WHERE deleted_at IS NULL GROUP BY category_id').all() as any[];
  const map = Object.fromEntries(counts.map((r) => [String(r.category_id), r.c]));
  return rows.map((c) => ({ ...c, product_count: map[String(c.id)] || 0 }));
}

function ensureCatSlug(slug: string, exceptId?: number) {
  let candidate = slug || 'category';
  let n = 2;
  while (db.prepare('SELECT id FROM categories WHERE slug=? AND (? IS NULL OR id!=?)').get(candidate, exceptId ?? null, exceptId ?? null)) candidate = `${slug}-${n++}`;
  return candidate;
}

export function saveCategory(body: any, user: any) {
  const name = String(body.name || '').trim();
  if (!name) throw new Error('Category name is required');
  if (body.id && body.parent_id && Number(body.id) === Number(body.parent_id)) {
    throw new Error('Category cannot be its own parent');
  }
  if (body.id) {
    const existing = db.prepare('SELECT id FROM categories WHERE id=?').get(body.id);
    if (!existing) throw new Error('Category not found');
    db.prepare(`UPDATE categories SET name=?, slug=?, parent_id=?, description=?, image=?, featured=?, sort_order=?, seo_title=?, seo_description=? WHERE id=?`)
      .run(name, ensureCatSlug(body.slug ? String(body.slug) : name, body.id), body.parent_id || null, body.description || null, body.image || null, body.featured ? 1 : 0, parseInt(String(body.sort_order)) || 0, body.seo_title || null, body.seo_description || null, body.id);
    logAudit(user, 'CATEGORY_UPDATE', 'Category', String(body.id));
  } else {
    const info = db.prepare(`INSERT INTO categories (name, slug, parent_id, description, image, featured, sort_order, seo_title, seo_description) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(name, ensureCatSlug(body.slug ? String(body.slug) : name), body.parent_id || null, body.description || null, body.image || null, body.featured ? 1 : 0, parseInt(String(body.sort_order)) || 0, body.seo_title || null, body.seo_description || null);
    logAudit(user, 'CATEGORY_CREATE', 'Category', String(info.lastInsertRowid));
  }
  return { ok: true };
}

export function deleteCategory(id: number, user: any) {
  const existing = db.prepare('SELECT COUNT(*) AS c FROM products WHERE category_id=?').get(id) as any;
  if (existing.c > 0) throw new Error(`Cannot delete category: ${existing.c} products are using it. Reassign them first.`);
  db.prepare('DELETE FROM categories WHERE id=?').run(id);
  logAudit(user, 'CATEGORY_DELETE', 'Category', String(id));
  return { ok: true };
}

// ============================================================================
// Tags
// ============================================================================
function listTags() {
  return db.prepare(`SELECT t.*,
      (SELECT COUNT(*) FROM product_tags pt WHERE pt.tag_id=t.id) AS product_count
      FROM tags t ORDER BY name`).all();
}
export function saveTag(body: any, user: any) {
  const name = String(body.name || '').trim();
  if (!name) throw new Error('Tag name is required');
  if (body.id) {
    db.prepare(`UPDATE tags SET name=?, slug=? WHERE id=?`).run(name, slugify(body.slug ? String(body.slug) : name), body.id);
    logAudit(user, 'TAG_UPDATE', 'Tag', String(body.id));
  } else {
    db.prepare(`INSERT INTO tags (name, slug) VALUES (?,?)`).run(name, slugify(name));
    logAudit(user, 'TAG_CREATE', 'Tag', name);
  }
  return { ok: true };
}
export function deleteTag(id: number, user: any) {
  db.prepare('DELETE FROM product_tags WHERE tag_id=?').run(id);
  db.prepare('DELETE FROM tags WHERE id=?').run(id);
  logAudit(user, 'TAG_DELETE', 'Tag', String(id));
  return { ok: true };
}

// ============================================================================
// Brands
// ============================================================================
function listBrands() {
  return db.prepare(`SELECT b.*,
      (SELECT COUNT(*) FROM products p WHERE p.brand_id=b.id) AS product_count
      FROM brands b ORDER BY name`).all();
}
export function saveBrand(body: any, user: any) {
  const name = String(body.name || '').trim();
  if (!name) throw new Error('Brand name is required');
  if (body.id) {
    db.prepare(`UPDATE brands SET name=?, slug=?, image=? WHERE id=?`).run(name, slugify(body.slug ? String(body.slug) : name), body.image || null, body.id);
    logAudit(user, 'BRAND_UPDATE', 'Brand', String(body.id));
  } else {
    db.prepare(`INSERT INTO brands (name, slug, image) VALUES (?,?,?)`).run(name, slugify(name), body.image || null);
    logAudit(user, 'BRAND_CREATE', 'Brand', name);
  }
  return { ok: true };
}
export function deleteBrand(id: number, user: any) {
  const existing = db.prepare('SELECT COUNT(*) AS c FROM products WHERE brand_id=?').get(id) as any;
  if (existing.c > 0) throw new Error(`Cannot delete brand: ${existing.c} products are using it. Reassign them first.`);
  db.prepare('DELETE FROM brands WHERE id=?').run(id);
  logAudit(user, 'BRAND_DELETE', 'Brand', String(id));
  return { ok: true };
}

// ============================================================================
// Attributes + terms
// ============================================================================
function listAttributes() {
  const attrs = db.prepare('SELECT * FROM attributes ORDER BY name').all() as any[];
  return attrs.map((a) => {
    const terms = db.prepare('SELECT * FROM attribute_terms WHERE attribute_id=? ORDER BY id').all(a.id) as any[];
    return { ...a, terms, product_count: terms.length };
  });
}
export function saveAttribute(body: any, user: any) {
  const name = String(body.name || '').trim();
  if (!name) throw new Error('Attribute name is required');
  if (body.id) {
    db.prepare(`UPDATE attributes SET name=?, slug=?, is_variation=? WHERE id=?`).run(name, slugify(body.slug ? String(body.slug) : name), body.is_variation ? 1 : 0, body.id);
  } else {
    db.prepare(`INSERT INTO attributes (name, slug, is_variation) VALUES (?,?,?)`).run(name, slugify(name), body.is_variation ? 1 : 0);
  }
  logAudit(user, body.id ? 'ATTRIBUTE_UPDATE' : 'ATTRIBUTE_CREATE', 'Attribute', name);
  return { ok: true };
}
export function deleteAttribute(id: number, user: any) {
  db.prepare('DELETE FROM attribute_terms WHERE attribute_id=?').run(id);
  db.prepare('DELETE FROM attributes WHERE id=?').run(id);
  logAudit(user, 'ATTRIBUTE_DELETE', 'Attribute', String(id));
  return { ok: true };
}
export function saveAttributeTerm(body: any, user: any) {
  const name = String(body.name || '').trim();
  if (!name) throw new Error('Term name is required');
  const aid = Number(body.attribute_id);
  if (body.id) {
    db.prepare(`UPDATE attribute_terms SET name=?, slug=? WHERE id=?`).run(name, slugify(name), body.id);
  } else {
    db.prepare(`INSERT INTO attribute_terms (attribute_id, name, slug) VALUES (?,?,?)`).run(aid, name, slugify(name));
  }
  logAudit(user, body.id ? 'ATTRIBUTE_TERM_UPDATE' : 'ATTRIBUTE_TERM_CREATE', 'AttributeTerm', name);
  return { ok: true };
}
export function deleteAttributeTerm(id: number, user: any) {
  db.prepare('DELETE FROM attribute_terms WHERE id=?').run(id);
  logAudit(user, 'ATTRIBUTE_TERM_DELETE', 'AttributeTerm', String(id));
  return { ok: true };
}

// ============================================================================
// Addons
// ============================================================================
function listAddons() {
  return db.prepare(`SELECT a.*,
      (SELECT COUNT(*) FROM product_addons pa WHERE pa.addon_id=a.id) AS product_count
      FROM addons a ORDER BY name`).all();
}
export function saveAddon(body: any, user: any) {
  const name = String(body.name || '').trim();
  if (!name) throw new Error('Add-on name is required');
  if (body.id) {
    db.prepare(`UPDATE addons SET name=?, description=?, price=?, stock=?, image=?, category=?, active=? WHERE id=?`)
      .run(name, body.description || null, body.price ?? 0, body.stock ?? null, body.image || null, body.category || null, body.active ? 1 : 0, body.id);
  } else {
    db.prepare(`INSERT INTO addons (name, description, price, stock, image, category, active) VALUES (?,?,?,?,?,?,?)`)
      .run(name, body.description || null, body.price ?? 0, body.stock ?? null, body.image || null, body.category || null, body.active ? 1 : 0);
  }
  logAudit(user, body.id ? 'ADDON_UPDATE' : 'ADDON_CREATE', 'Addon', name);
  return { ok: true };
}
export function deleteAddon(id: number, user: any) {
  db.prepare('DELETE FROM product_addons WHERE addon_id=?').run(id);
  db.prepare('DELETE FROM addons WHERE id=?').run(id);
  logAudit(user, 'ADDON_DELETE', 'Addon', String(id));
  return { ok: true };
}

// ============================================================================
// Delivery config (product-level columns already migrated)
// ============================================================================
export function getDeliveryConfig(productId: number) {
  const row = db.prepare(`SELECT id, name, same_day_eligible, prep_time_minutes, min_advance_notice, delivery_fee FROM products WHERE id=?`).get(productId);
  if (!row) throw new Error('Product not found');
  return row;
}

export function getAllTaxonomy() {
  return {
    categories: listCategories(),
    tags: listTags(),
    brands: listBrands(),
    attributes: listAttributes(),
    addons: listAddons(),
  };
}

// keep function name stable for external importers
export { listCategories as getCategoriesList, listTags as getTagsList, listBrands as getBrandsList, listAttributes as getAttributesList, listAddons as getAddonsList };