import { db } from './db';
import { logAudit, slugify, jsonParseSafe } from './api';

// ============================================================================
// Shared helpers
// ============================================================================
export function serializeAdminProduct(row: any) {
  if (!row) return null;
  return {
    ...row,
    id: String(row.id),
    images: jsonParseSafe(row.images_json, []),
    variations: jsonParseSafe(row.variations_json, []),
    flavours: jsonParseSafe(row.flavours, []),
    badges: jsonParseSafe(row.badges, []),
    tags: jsonParseSafe(row.tags, []),
    attributes: jsonParseSafe(row.attributes_json, []),
    related: jsonParseSafe(row.related_products, []),
    upsells: jsonParseSafe(row.upsells, []),
    crossSells: jsonParseSafe(row.cross_sells, []),
    customization: jsonParseSafe(row.customization_json, []),
    categoryName: row.category_name || '',
    categorySlug: row.category_slug || '',
    brandName: row.brand_name || '',
    reviewCount: row.review_count || 0,
    rating: row.avg_rating || 0,
  };
}

const LIST_BASE = `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
  b.name AS brand_name,
  (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved') AS review_count,
  (SELECT AVG(rating) FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved') AS avg_rating
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN brands b ON p.brand_id = b.id`;

function buildWhere(f: any, includeDeleted: boolean) {
  const w: string[] = [];
  const p: any[] = [];
  if (!includeDeleted) w.push('p.deleted_at IS NULL');
  if (f.search) {
    w.push(`(p.name LIKE ? OR p.sku LIKE ? OR p.slug LIKE ? OR p.short_description LIKE ? OR p.tags LIKE ?)`);
    const like = `%${f.search}%`;
    p.push(like, like, like, like, like);
  }
  if (f.category) {
    w.push('(p.category_id = ? OR p.category_id IN (SELECT id FROM categories WHERE parent_id = ?))');
    const cid = parseInt(f.category);
    p.push(cid, cid);
  }
  if (f.brand) { w.push('p.brand_id = ?'); p.push(parseInt(f.brand)); }
  if (f.product_type) { w.push('p.product_type = ?'); p.push(f.product_type); }
  if (f.inventory) {
    if (f.inventory === 'out') w.push("p.stock_status='out_of_stock'");
    if (f.inventory === 'low') w.push("p.stock_status='low_stock'");
    if (f.inventory === 'in') w.push("p.stock_status='in_stock'");
  }
  if (f.status === 'publish') w.push('p.published = 1');
  if (f.status === 'draft') w.push('p.published = 0');
  if (f.status === 'trash') w.push('p.deleted_at IS NOT NULL');
  if (f.featured === '1') w.push('p.featured = 1');
  if (f.on_sale === '1') w.push('p.sale_price IS NOT NULL AND p.sale_price > 0 AND p.sale_price < p.regular_price');
  if (f.price_min) { w.push('COALESCE(p.sale_price,p.regular_price) >= ?'); p.push(parseFloat(f.price_min)); }
  if (f.price_max) { w.push('COALESCE(p.sale_price,p.regular_price) <= ?'); p.push(parseFloat(f.price_max)); }
  if (f.rating) {
    w.push(`(SELECT AVG(rating) FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved') >= ?`);
    p.push(parseFloat(f.rating));
  }
  if (f.date_from) { w.push('p.created_at >= ?'); p.push(f.date_from); }
  if (f.date_to) { w.push('p.created_at <= ?'); p.push(f.date_to + ' 23:59:59'); }
  return { w, p };
}

export function listProducts(opts: any) {
  const page = Math.max(1, parseInt(String(opts.page)) || 1);
  const per = Math.min(parseInt(String(opts.per)) || 20, 200);
  const inTrash = opts.status === 'trash';
  const includeDeleted = opts.includes === 'trash' || inTrash;
  const f = { ...opts, includes: opts.includes || '' };
  const { w, p } = buildWhere(f, includeDeleted);
  // base filters (already include/exclude deleted as appropriate)
  const where = w.length ? 'WHERE ' + w.join(' AND ') : '';
  const orderBy = {
    newest: 'p.updated_at DESC',
    name: 'p.name ASC',
    price: 'COALESCE(p.sale_price,p.regular_price) ASC',
    'price-desc': 'COALESCE(p.sale_price,p.regular_price) DESC',
  }[opts.sort || 'newest'] || 'p.updated_at DESC';
  const rows = db.prepare(`${LIST_BASE} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...p, per, (page - 1) * per);
  const countFrom = `products p LEFT JOIN categories c ON p.category_id=c.id LEFT JOIN brands b ON p.brand_id=b.id`;
  const totalRow = db.prepare(`SELECT COUNT(*) AS c FROM ${countFrom} ${where}`).get(...p) as any;
  return { products: rows.map(serializeAdminProduct), total: totalRow?.c || 0, page, per };
}

export function getProduct(id: number) {
  const row = db.prepare(`${LIST_BASE} WHERE p.id=?`).get(id);
  return serializeAdminProduct(row);
}

function ensureUniqueSlug(slug: string, exceptId?: number): string {
  let candidate = slug;
  let n = 2;
  while (db.prepare('SELECT id FROM products WHERE slug=? AND (? IS NULL OR id!=?)').get(candidate, exceptId ?? null, exceptId ?? null)) {
    candidate = `${slug}-${n++}`;
  }
  return candidate;
}

// Validated numeric parsing with clear errors
function toPrice(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (isNaN(n) || n < 0) throw new Error('Invalid price: must be a non-negative number');
  return n;
}
function toStock(v: any): number {
  const n = Number(v);
  if (isNaN(n) || !isFinite(n)) throw new Error('Invalid stock: must be a number');
  return Math.floor(n);
}

function auditProduct(user: any, productId: number, action: string, field: string | null, oldValue: any, newValue: any) {
  try {
    db.prepare(`INSERT INTO product_audit (product_id, action, field, old_value, new_value, user_id, user_name) VALUES (?,?,?,?,?,?,?)`)
      .run(productId, action, field, oldValue == null ? null : String(oldValue), newValue == null ? null : String(newValue), user?.id ?? null, user?.name ?? 'admin');
  } catch { /* no-op */ }
}

// Apply core product fields (shared by create/update). Returns an object of
// validated values for a targeted UPDATE/INSERT. This intentionally never
// touches importer-managed uniqueness of catalog source.
function buildProductPayload(body: any, existing: any, user: any) {
  const payload: any = {};
  const name = (body.name != null ? String(body.name) : existing?.name) || '';
  if (!name.trim()) throw new Error('Product name is required');
  payload.name = name;

  // SKU validation + uniqueness (admin may leave as-is on update)
  if (body.sku !== undefined && body.sku !== null) {
    const sku = String(body.sku).trim();
    if (!sku) throw new Error('SKU is required');
    const dup = db.prepare('SELECT id FROM products WHERE sku=? AND id!=?').get(sku, existing?.id ?? -1);
    if (dup) throw new Error(`SKU "${sku}" is already used by another product`);
    payload.sku = sku;
  } else if (existing?.sku == null) {
    throw new Error('SKU is required for new products');
  }

  // slug: preserve canonical unless explicitly changed
  if (body.slug !== undefined && body.slug !== null && String(body.slug).trim() !== '') {
    payload.slug = ensureUniqueSlug(slugify(String(body.slug)), existing?.id);
  } else if (!existing) {
    payload.slug = ensureUniqueSlug(slugify(name), existing?.id);
  }

  const fields = [
    'short_description', 'description', 'regular_price', 'sale_price', 'cost_price',
    'category_id', 'brand_id', 'weight_kg', 'dimensions', 'low_stock_threshold',
    'seo_title', 'seo_description', 'focus_keyword', 'canonical_url',
    'open_graph_title', 'open_graph_description', 'social_image',
    'visibility', 'product_type', 'tax_status', 'tax_class',
    'prep_time_minutes', 'min_advance_notice', 'sale_start', 'sale_end',
    'backorders', 'status',
  ];
  for (const f of fields) {
    if (body[f] !== undefined) payload[f] = body[f] === '' ? null : body[f];
  }

  // numeric price fields with validation
  if (body.regular_price !== undefined) payload.regular_price = toPrice(body.regular_price);
  if (body.sale_price !== undefined) payload.sale_price = toPrice(body.sale_price);
  if (body.cost_price !== undefined) payload.cost_price = toPrice(body.cost_price);
  if (body.weight_kg !== undefined) payload.weight_kg = toPrice(body.weight_kg);
  if (body.low_stock_threshold !== undefined) payload.low_stock_threshold = toStock(body.low_stock_threshold);
  if (body.prep_time_minutes !== undefined) payload.prep_time_minutes = body.prep_time_minutes === '' ? null : toStock(body.prep_time_minutes);
  if (body.min_advance_notice !== undefined) payload.min_advance_notice = body.min_advance_notice === '' ? null : toStock(body.min_advance_notice);

  // booleans
  for (const b of ['published', 'featured', 'bestseller', 'new_arrival', 'deal', 'eggless', 'custom_order', 'enable_stock', 'manage_stock', 'same_day_eligible']) {
    if (body[b] !== undefined) payload[b] = body[b] ? 1 : 0;
  }

  // JSON fields
  for (const jf of ['flavours', 'badges', 'tags', 'images_json', 'variations_json', 'attributes_json', 'related_products', 'upsells', 'cross_sells', 'customization_json']) {
    if (body[jf] !== undefined) {
      if (typeof body[jf] === 'string') payload[jf] = body[jf];
      else payload[jf] = JSON.stringify(body[jf]);
    }
  }

  // stock handling + stock history
  if (body.stock !== undefined) {
    const newStock = toStock(body.stock);
    const oldStock = existing?.stock ?? 0;
    payload.stock = newStock;
    const derivedStatus = newStock <= 0 ? 'out_of_stock' : (existing?.low_stock_threshold && newStock <= existing.low_stock_threshold ? 'low_stock' : 'in_stock');
    payload.stock_status = body.stock_status || derivedStatus;
    if (existing && newStock !== oldStock && user) {
      db.prepare(`INSERT INTO stock_history (product_id, change_amount, type, note, user_id, user_name) VALUES (?,?,?,?,?,?)`)
        .run(existing.id, newStock - oldStock, 'admin', body.stock_note || 'Stock updated in admin', user.id, user.name);
      auditProduct(user, existing.id, 'stock_changed', 'stock', oldStock, newStock);
    }
  } else if (body.stock_status !== undefined) {
    payload.stock_status = body.stock_status;
  }

  payload.updated_at = new Date().toISOString();
  return payload;
}

export function upsertProduct(body: any, user: any) {
  const existing = body.id ? db.prepare('SELECT * FROM products WHERE id=?').get(body.id) as any : null;
  if (body.id && !existing) throw new Error('Product not found');

  const payload = buildProductPayload(body, existing, user);
  let id = existing?.id;

  const tx = db.transaction(() => {
    if (existing) {
      const sets = Object.keys(payload).map((k) => `${k}=?`).join(', ');
      db.prepare(`UPDATE products SET ${sets} WHERE id=?`).run(...Object.values(payload), existing.id);
      // audit notable field changes
      for (const f of ['name', 'sku', 'regular_price', 'sale_price', 'stock', 'category_id', 'published', 'brand_id', 'images_json', 'status']) {
        if (f in payload && String(payload[f] ?? '') !== String(existing[f] ?? '')) {
          auditProduct(user, existing.id, 'changed', f, existing[f], payload[f]);
        }
      }
      if ('regular_price' in payload) auditProduct(user, existing.id, 'price_changed', 'regular_price', existing.regular_price, payload.regular_price);
    } else {
      const merged = { ...payload };
      // defaults for a brand-new product
      merged.name = payload.name;
      merged.sku = payload.sku ?? `TMP-${Date.now()}`;
      merged.slug = payload.slug ?? ensureUniqueSlug(slugify(payload.name));
      merged.published = payload.published ?? 0;
      merged.product_type = payload.product_type ?? 'simple';
      merged.status = payload.status ?? 'draft';
      merged.stock = payload.stock ?? 0;
      merged.stock_status = payload.stock_status ?? (merged.stock > 0 ? 'in_stock' : 'out_of_stock');
      merged.enable_stock = payload.enable_stock ?? 1;
      merged.catalog_source = 'admin';
      merged.created_at = new Date().toISOString();
      merged.updated_at = new Date().toISOString();
      const info = db.prepare(`INSERT INTO products (${Object.keys(merged).join(',')}) VALUES (${Object.keys(merged).map(() => '?').join(',')})`).run(...Object.values(merged));
      id = Number(info.lastInsertRowid);
      auditProduct(user, id, 'created', null, null, payload.name);
    }
    // pivot: product_tags from tag ids
    if (Array.isArray(body.tag_ids)) {
      db.prepare('DELETE FROM product_tags WHERE product_id=?').run(id);
      for (const tid of body.tag_ids) {
        const tag = db.prepare('SELECT id FROM tags WHERE id=?').get(Number(tid));
        if (tag) db.prepare('INSERT OR IGNORE INTO product_tags (product_id, tag_id) VALUES (?,?)').run(id, Number(tid));
      }
    }
    // pivot: product_addons
    if (Array.isArray(body.add_ons) && body.add_ons.length >= 0) {
      const addons = Array.isArray(body.add_ons) ? body.add_ons : [];
      db.prepare('DELETE FROM product_addons WHERE product_id=?').run(id);
      for (const ad of addons) {
        const aid = Number(ad.id || ad);
        const row = db.prepare('SELECT id FROM addons WHERE id=?').get(aid);
        if (row) db.prepare('INSERT OR IGNORE INTO product_addons (product_id, addon_id, max_qty) VALUES (?,?,?)').run(id, aid, Number(ad.max_qty || 5));
      }
    }
  });
  tx();

  logAudit(user, existing ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE', 'Product', id);
  return { ok: true, id, isNew: !existing };
}

export function quickEdit(body: any, user: any) {
  const id = Number(body.id);
  const existing = db.prepare('SELECT * FROM products WHERE id=?').get(id) as any;
  if (!existing) throw new Error('Product not found');
  // Only allow safe fields through quick edit.
  const safe = ['name', 'sku', 'regular_price', 'sale_price', 'stock', 'category_id', 'brand_id', 'status', 'published', 'featured', 'stock_status', 'product_type'];
  const payload: any = {};
  const allow = safe.filter((k) => body[k] !== undefined);
  // Validate sku uniqueness if changing
  if (body.sku !== undefined && String(body.sku).trim()) {
    const s = String(body.sku).trim();
    if (db.prepare('SELECT id FROM products WHERE sku=? AND id!=?').get(s, id)) throw new Error(`SKU "${s}" already in use`);
    payload.sku = s;
  }
  for (const k of allow) {
    if (k === 'sku') continue;
    if (k === 'regular_price') payload[k] = toPrice(body[k]);
    else if (k === 'sale_price') payload[k] = toPrice(body[k]);
    else if (k === 'stock') { const st = toStock(body[k]); payload.stock = st; payload.stock_status = st <= 0 ? 'out_of_stock' : 'in_stock'; db.prepare(`INSERT INTO stock_history (product_id, change_amount, type, note, user_id, user_name) VALUES (?,?,?,?,?,?)`).run(id, st - (existing.stock||0), 'quick_edit', 'Quick edit stock', user?.id, user?.name); }
    else if (k === 'published' || k === 'featured') payload[k] = body[k] ? 1 : 0;
    else payload[k] = body[k];
  }
  payload.updated_at = new Date().toISOString();
  if (Object.keys(payload).length > 1) {
    const sets = Object.keys(payload).map((k) => `${k}=?`).join(', ');
    db.prepare(`UPDATE products SET ${sets} WHERE id=?`).run(...Object.values(payload), id);
    for (const k of Object.keys(payload)) {
      if (k === 'updated_at') continue;
      if (String(payload[k]) !== String(existing[k])) auditProduct(user, id, 'quick_edit', k, existing[k], payload[k]);
    }
    logAudit(user, 'PRODUCT_QUICK_EDIT', 'Product', String(id));
  }
  return { ok: true, id };
}

export function duplicateProduct(id: number, user: any) {
  const src = db.prepare('SELECT * FROM products WHERE id=?').get(id) as any;
  if (!src) throw new Error('Product not found');
  const now = new Date().toISOString();
  const suffix = ' (copy)';
  const baseName = src.name.includes(' (copy)') ? src.name : `${src.name}${suffix}`;
  const slug = ensureUniqueSlug(slugify(baseName));
  const sku = null; // never copy original SKU; admin must assign before publish
  const info = db.prepare(`INSERT INTO products
    (sku, name, slug, short_description, description, regular_price, sale_price, cost_price, stock, low_stock_threshold,
     stock_status, category_id, brand_id, weight_kg, dimensions, featured, bestseller, new_arrival, deal, eggless,
     flavours, badges, tags, attributes_json, variations_json, images_json, related_products, upsells, cross_sells,
     seo_title, seo_description, focus_keyword, canonical_url, published, custom_order, product_type, visibility,
     tax_status, tax_class, sale_start, sale_end, enable_stock, backorders, customization_json, status, duplicate_of,
     created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(sku, baseName, slug, src.short_description, src.description, src.regular_price, src.sale_price, src.cost_price,
      src.stock, src.low_stock_threshold, src.stock_status, src.category_id, src.brand_id, src.weight_kg, src.dimensions,
      src.featured, src.bestseller, src.new_arrival, src.deal, src.eggless, src.flavours, src.badges, src.tags,
      src.attributes_json, src.variations_json, src.images_json, src.related_products, src.upsells, src.cross_sells,
      src.seo_title, src.seo_description, src.focus_keyword, src.canonical_url, 0, src.custom_order, src.product_type || 'simple',
      src.visibility || 'public', src.tax_status || 'taxable', src.tax_class, src.sale_start, src.sale_end, src.enable_stock,
      src.backorders || 'no', src.customization_json, 'draft', id, now, now);
  const newId = Number(info.lastInsertRowid);
  // copy pivots
  db.prepare('INSERT OR IGNORE INTO product_tags (product_id, tag_id) SELECT ?, tag_id FROM product_tags WHERE product_id=?').run(newId, id);
  db.prepare('INSERT OR IGNORE INTO product_addons (product_id, addon_id, max_qty) SELECT ?, addon_id, max_qty FROM product_addons WHERE product_id=?').run(newId, id);
  auditProduct(user, newId, 'duplicated', null, String(id), String(newId));
  logAudit(user, 'PRODUCT_DUPLICATE', 'Product', String(newId), `from #${id}`);
  return { ok: true, id: newId };
}

export function setStatus(body: any, user: any) {
  const id = Number(body.id);
  const existing = db.prepare('SELECT id, published FROM products WHERE id=?').get(id) as any;
  if (!existing) throw new Error('Product not found');
  if (body.status === 'trash') {
    db.prepare(`UPDATE products SET deleted_at=datetime('now'), updated_at=? WHERE id=?`).run(new Date().toISOString(), id);
    auditProduct(user, id, 'trashed', 'deleted_at', null, new Date().toISOString());
    logAudit(user, 'PRODUCT_TRASH', 'Product', String(id));
    return { ok: true };
  }
  if (body.status === 'restore') {
    db.prepare(`UPDATE products SET deleted_at=NULL, updated_at=? WHERE id=?`).run(new Date().toISOString(), id);
    auditProduct(user, id, 'restored', 'deleted_at', null, null);
    logAudit(user, 'PRODUCT_RESTORE', 'Product', String(id));
    return { ok: true };
  }
  const published = body.status === 'publish' ? 1 : 0;
  db.prepare(`UPDATE products SET published=?, status=?, updated_at=? WHERE id=?`).run(published, body.status || existing.published ? 'publish' : 'draft', new Date().toISOString(), id);
  auditProduct(user, id, 'status_changed', 'published', existing.published, published);
  logAudit(user, 'PRODUCT_STATUS', 'Product', String(id), body.status);
  return { ok: true };
}

export function deletePermanently(id: number, user: any) {
  auditProduct(user, id, 'deleted_permanently', null, null, null);
  db.prepare(`DELETE FROM products WHERE id=?`).run(id);
  logAudit(user, 'PRODUCT_DELETE_PERMANENT', 'Product', String(id));
  return { ok: true };
}

// ---- Bulk actions ----------------------------------------------------------
export function bulkAction(body: any, user: any) {
  const ids = (Array.isArray(body.ids) ? body.ids : []).map(Number).filter(Boolean);
  if (!ids.length) throw new Error('No products selected');
  const action = body.subaction || body.bulkAction || body.action2 || body.action;
  const tx = db.transaction(() => {
    for (const id of ids) {
      const existing = db.prepare('SELECT * FROM products WHERE id=?').get(id) as any;
      if (!existing) continue;
      if (action === 'publish') { db.prepare(`UPDATE products SET published=1, status='publish', updated_at=? WHERE id=?`).run(new Date().toISOString(), id); }
      else if (action === 'unpublish') { db.prepare(`UPDATE products SET published=0, status='draft', updated_at=? WHERE id=?`).run(new Date().toISOString(), id); }
      else if (action === 'draft') { db.prepare(`UPDATE products SET published=0, status='draft', updated_at=? WHERE id=?`).run(new Date().toISOString(), id); }
      else if (action === 'trash') { db.prepare(`UPDATE products SET deleted_at=datetime('now'), published=0, updated_at=? WHERE id=?`).run(new Date().toISOString(), id); }
      else if (action === 'featured') { db.prepare(`UPDATE products SET featured=1, updated_at=? WHERE id=?`).run(new Date().toISOString(), id); }
      else if (action === 'unfeatured') { db.prepare(`UPDATE products SET featured=0, updated_at=? WHERE id=?`).run(new Date().toISOString(), id); }
      else if (action === 'category' && body.category_id) { db.prepare(`UPDATE products SET category_id=?, updated_at=? WHERE id=?`).run(Number(body.category_id), new Date().toISOString(), id); }
      else if (action === 'brand' && body.brand_id) { db.prepare(`UPDATE products SET brand_id=?, updated_at=? WHERE id=?`).run(Number(body.brand_id), new Date().toISOString(), id); }
      else if (action === 'stock' && body.stock !== undefined) {
        const st = toStock(body.stock);
        db.prepare(`UPDATE products SET stock=?, stock_status=?, updated_at=? WHERE id=?`).run(st, st <= 0 ? 'out_of_stock' : 'in_stock', new Date().toISOString(), id);
        db.prepare(`INSERT INTO stock_history (product_id, change_amount, type, note, user_id, user_name) VALUES (?,?,?,?,?,?)`).run(id, st - (existing.stock||0), 'bulk', 'Bulk stock update', user?.id, user?.name);
      }
      else throw new Error(`Unknown bulk action: ${action}`);
    }
  });
  tx();
  logAudit(user, `BULK_${String(action).toUpperCase()}`, 'Product', ids.join(','));
  return { ok: true, count: ids.length };
}

// ---- Product tags/brands/attributes helpers for admin list -----------------
export function getAllTags() {
  return db.prepare(`SELECT t.*, (SELECT COUNT(*) FROM product_tags pt WHERE pt.tag_id=t.id) AS product_count FROM tags t ORDER BY name`).all();
}
export function getAllBrands() {
  return db.prepare(`SELECT b.*, (SELECT COUNT(*) FROM products p WHERE p.brand_id=b.id) AS product_count FROM brands b ORDER BY name`).all();
}
export function getAllAttributes() {
  const attrs = db.prepare(`SELECT * FROM attributes ORDER BY name`).all();
  return attrs.map((a: any) => ({ ...a, terms: db.prepare('SELECT * FROM attribute_terms WHERE attribute_id=? ORDER BY id').all(a.id) }));
}
export function getAllAddons() {
  return db.prepare(`SELECT a.*, (SELECT COUNT(*) FROM product_addons pa WHERE pa.addon_id=a.id) AS product_count FROM addons a ORDER BY name`).all();
}