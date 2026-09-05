// ============================================================================
// TVO FLAVOURS — CSV CATALOG IMPORTER (idempotent, transactional)
// Reads the authoritative Product CSV + Category CSV and syncs the SQLite DB.
//   - Upserts by unique SKU (stable identifier), never creates duplicates.
//   - Builds cake weight options from variation rows.
//   - Maps original + resized image variants.
//   - Preserves existing products and existing IDs where possible.
//   - Writes an import-history + audit entries.
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { db } from './db';

const ROOT = '/Users/amit/Downloads/202;0Tvo';

const WC_CSV = path.join(ROOT, 'wc-product-export-2-9-2026-1788331015035.csv');
const CATEGORY_CSV = path.join(ROOT, 'uploads', 'wc-imports', 'product-categories-gjra7dgqut.csv');

function loadCsv(p) {
  if (!fs.existsSync(p)) return [];
  return Papa.parse(fs.readFileSync(p, 'utf8'), { header: true, skipEmptyLines: 'greedy' }).data;
}
function slugify(s) {
  return (s || '').toString().toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s]+/g, '-').replace(/-+/g, '-');
}

// ---- image helpers ---------------------------------------------------------
function normKey(s) {
  return (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function fileNameToKey(file) {
  const n = path.basename(file).replace(/\.[a-z0-9]+$/i, '');
  return normKey(n.replace(/[-_]([0-9]{2,4})x([0-9]{2,3})$/i, '').replace(/[-_](scaled|rotated)$/i, ''));
}
function walkDir(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.DS_Store') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(full, out);
    else if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(e.name)) out.push(full);
  }
  return out;
}
const CAT_FOLDERS = ['Anniversary', 'Birthday cake', 'Brownie', 'Butterscotch Cake', 'Chocolate cake', 'Kids  Cake', 'Mango cake', 'iloveimg-compressed'];

// Build index of local uploads images (all sizes)
const uploadsAll = walkDir(path.join(ROOT, 'uploads'));
const uploadsByKey = {};
for (const f of uploadsAll) {
  const k = fileNameToKey(f);
  if (!uploadsByKey[k]) uploadsByKey[k] = [];
  uploadsByKey[k].push(f);
}

// Standalone category-folder images
const localCat = [];
for (const f of CAT_FOLDERS) localCat.push(...walkDir(path.join(ROOT, f)));
const localCatByKey = {};
for (const f of localCat) {
  const k = fileNameToKey(f);
  if (!localCatByKey[k]) localCatByKey[k] = [];
  localCatByKey[k].push(f);
}

function classifyImageSize(file) {
  const m = path.basename(file).match(/[-_]([0-9]{2,4})x([0-9]{2,3})$/i);
  if (m) {
    const w = parseInt(m[1]);
    if (w <= 150) return 'thumbnail';
    if (w <= 350) return 'medium';
    if (w <= 900) return 'large';
    return 'full';
  }
  if (/[-_](scaled|rotated)$/i.test(path.basename(file))) return 'full';
  return 'full'; // base file = original
}

// Returns array of {url, type} for a product image key, preferring originals
function collectImageVariants(fileKeyBase) {
  const variants = [];
  const add = (type, files) => { for (const f of files) variants.push({ type, url: toWebPath(f) }); };
  // exact-key base images
  if (uploadsByKey[fileKeyBase]) add('full', uploadsByKey[fileKeyBase]);
  if (localCatByKey[fileKeyBase]) add('full', localCatByKey[fileKeyBase]);
  // build a clean lookup for variant sizes
  return variants;
}

function toWebPath(file) {
  const rel = path.relative(path.join(ROOT, 'tvo-flavours', 'public'), file);
  return '/' + rel.split(path.sep).join('/');
}

// Map a CSV product to a primary local image
function findPrimaryImage(productName, csvImages) {
  // 1) local copy of the CSV-referenced URL
  if (csvImages.length) {
    const file = csvImages[0].split('/').pop() || '';
    const k = fileNameToKey(file);
    if (uploadsByKey[k] && uploadsByKey[k].length) return toWebPath(uploadsByKey[k][0]);
    // fuzzy
    const fuzzy = Object.keys(uploadsByKey).find((kk) => normKey(kk).includes(normKey(file.replace(/\.[a-z0-9]+$/i, ''))) || normKey(file.replace(/\.[a-z0-9]+$/i, '')).includes(normKey(kk)));
    if (fuzzy) return toWebPath(uploadsByKey[fuzzy][0]);
  }
  // 2) standalone category folder by normalized name
  const pkey = normKey(productName);
  if (localCatByKey[pkey]) return toWebPath(localCatByKey[pkey][0]);
  const frag = pkey.replace(/(cake|pastry|brownie|slice|dessert|hamper|box|tray|ladoo|cookies|rakhi|candle|idols|sandesh|sweet)$/i, '');
  const cand = Object.keys(localCatByKey).find((k) => (normKey(k).includes(frag) && frag.length > 3) || (frag.includes(normKey(k)) && normKey(k).length > 3));
  if (cand) return toWebPath(localCatByKey[cand][0]);
  // 3) keep remote original URL
  if (csvImages.length) return csvImages[0];
  return null;
}

function buildImages(productName, csvImages, primary) {
  const out = [];
  if (primary) {
    // primary public path -> find local variants
    const baseName = path.basename(primary.replace(/^\/images\/products\/uploads\//, ''));
    const isLocal = primary.startsWith('/images/');
    if (isLocal && uploadsByKey[fileNameToKey(baseName)]) {
      const files = uploadsByKey[fileNameToKey(baseName)];
      const grouped = { full: [], large: [], medium: [], thumbnail: [] };
      for (const f of files) grouped[classifyImageSize(f)].push(toWebPath(f));
      if (grouped.full.length) (grouped.full[0] === primary ? grouped.full : [primary, ...grouped.full]).forEach((u, i) => out.push({ url: u, type: i === 0 ? 'primary' : 'full' }));
      if (grouped.large.length) grouped.large.forEach((u) => out.push({ url: u, type: 'large' }));
      if (grouped.medium.length) grouped.medium.forEach((u) => out.push({ url: u, type: 'medium' }));
      if (grouped.thumbnail.length) grouped.thumbnail.forEach((u) => out.push({ url: u, type: 'thumbnail' }));
    } else {
      out.push({ url: primary, type: 'primary' });
    }
  }
  // additional CSV images as gallery
  const seen = new Set(out.map((o) => o.url));
  for (const u of csvImages.slice(1)) {
    if (!seen.has(u)) { out.push({ url: u, type: 'gallery' }); seen.add(u); }
  }
  if (out.length === 0 && csvImages.length) {
    csvImages.forEach((u, i) => out.push({ url: u, type: i === 0 ? 'primary' : 'gallery' }));
  }
  return out;
}

// ---- main import -----------------------------------------------------------
export function importCatalog() {
  const summary = {
    categories: { total: 0, created: 0, updated: 0, skipped: 0 },
    products: { total: 0, created: 0, updated: 0, skipped: 0, duplicatesSkipped: 0 },
    variations: 0,
    rejected: [],
    startedAt: new Date().toISOString(),
  };

  const categoryRows = loadCsv(CATEGORY_CSV);
  const productRows = loadCsv(WC_CSV);

  const tx = db.transaction(() => {
    // ---- categories ----
    const catBySlug = {};
    for (const c of db.prepare('SELECT id, slug FROM categories').all()) catBySlug[c.slug] = c.id;
    for (const row of categoryRows) {
      const name = (row.name || '').trim();
      const slug = (row.slug || slugify(name)).trim();
      if (!name || !slug) { summary.categories.skipped++; continue; }
      const parentSlug = row.parent ? slugify(row.parent) : null;
      const parentId = parentSlug ? catBySlug[parentSlug] : null;
      const existing = db.prepare('SELECT id FROM categories WHERE slug=?').get(slug);
      const obj = {
        name, slug, parent_id: parentId ?? null,
        description: (row.description || '').slice(0, 500) || null,
        image: null,
      };
      if (existing) {
        db.prepare('UPDATE categories SET name=?, parent_id=?, description=? WHERE id=?').run(name, parentId ?? null, obj.description, existing.id);
        summary.categories.updated++;
      } else {
        const r = db.prepare('INSERT INTO categories (name, slug, parent_id, description) VALUES (?,?,?,?)').run(name, slug, parentId ?? null, obj.description);
        catBySlug[slug] = Number(r.lastInsertRowid);
        summary.categories.created++;
      }
      summary.categories.total++;
    }

    // ---- products ----
    // AUTHORITATIVE SOURCE ONLY: process the validated WooCommerce Product CSV.
    // The confetto CSV is reference/legacy only and is NEVER auto-imported here.
    const parents = productRows.filter((p) => p.Type === 'simple' || p.Type === 'variable');
    const variations = productRows.filter((p) => p.Type === 'variation');

    const allParents = parents;

    const seenSku = new Set();
    const seenSlugs = new Set();
    for (const p of allParents) {
      const sku = (p.SKU || '').trim();
      const name = (p.Name || '').trim();
      if (!name) { summary.products.skipped++; continue; }
      if (!sku) { summary.products.skipped++; continue; }
      if (seenSku.has(sku.toLowerCase())) { summary.products.duplicatesSkipped++; continue; }
      seenSku.add(sku.toLowerCase());
      summary.products.total++;

      const isVariable = p.Type === 'variable';
      const existing = db.prepare('SELECT id, slug FROM products WHERE sku=?').get(sku);
      // Preserve the canonical slug for existing SKUs (never reroll on re-import).
      // Only assign a fresh unique slug to genuinely new products.
      let slug: string;
      const slugUsed = (s: string) => seenSlugs.has(s) || !!db.prepare('SELECT id FROM products WHERE slug=?').get(s);
      if (existing && existing.slug) {
        slug = existing.slug;
      } else {
        slug = slugify(name);
        let disambig = 2;
        while (slugUsed(slug)) {
          slug = `${slugify(name)}-${disambig}`;
          disambig++;
        }
      }
      seenSlugs.add(slug);

      // category resolution (use first meaningful category slug)
      const catNames = (p.Categories || '').split(',').map((s) => s.trim()).filter(Boolean);
      let categoryId = null;
      for (const cn of catNames) {
        const leafSlug = slugify(cn.split('>').pop().trim());
        const row = db.prepare('SELECT id FROM categories WHERE slug=?').get(leafSlug);
        if (row) { categoryId = row.id; break; }
      }

      // variation (weight/piece) options
      let variationsJson = null;
      const childVars = variations.filter((v) => String(v.Parent).trim().toLowerCase() === sku.toLowerCase());
      if (childVars.length > 0 && isVariable) {
        const attrName = (p['Attribute 1 name'] || '').trim() || 'Select Weight';
        const options = childVars.map((v) => {
          const label = (v['Attribute 1 value(s)'] || '').trim();
          const reg = parseFloat(v['Regular price']) || 0;
          const sale = parseFloat(v['Sale price']) || reg;
          let weightKg = null;
          const kgM = label.match(/([\d.]+)\s*[Kk][Gg]/);
          if (kgM) weightKg = parseFloat(kgM[1]);
          return { label, value: label, weightKg, price: sale || reg, mrp: reg || sale };
        }).filter((o) => o.price > 0);
        variationsJson = JSON.stringify({ attribute: attrName, options });
        summary.variations += childVars.length;
      }

      // pricing
      const reg = parseFloat(p['Regular price']);
      const sale = parseFloat(p['Sale price']);
      let regularPrice = reg && !isNaN(reg) ? reg : null;
      let salePrice = sale && !isNaN(sale) ? sale : null;
      if (isVariable && variationsJson) {
        const opts = JSON.parse(variationsJson).options;
        if (opts.length) { regularPrice = opts[0].mrp; salePrice = opts[0].price; }
      }
      if ((!regularPrice || regularPrice <= 0) && salePrice && salePrice > 0) regularPrice = salePrice;
      if ((!salePrice || salePrice <= 0) && regularPrice && regularPrice > 0) salePrice = regularPrice;

      // stock
      const stockRaw = parseInt(p.Stock);
      const stock = isNaN(stockRaw) ? 20 : stockRaw;
      const inStock = p['In stock?'] === '1' || String(p['In stock?']).toLowerCase() === 'true' || p['In stock?'] === '';
      const stockStatus = stock <= 0 || !inStock ? 'out_of_stock' : 'in_stock';

      // eggless/flavours/badges/tags
      const eggless = /yes|true|1/i.test((p.Eggless || '').toString());
      const flavours = (p.Flavours || '').split(',').map((s) => s.trim()).filter(Boolean);
      const badges = (p.Badges || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (badges.length === 0 && /bestseller/i.test((p.Tags || '') + (p['Is featured?'] || ''))) badges.push('Bestseller');
      const tags = (p.Tags || '').split(',').map((s) => s.trim()).filter(Boolean);

      // images
      const csvImages = (p.Images || '').split(',').map((s) => s.trim()).filter(Boolean);
      const primary = findPrimaryImage(name, csvImages);
      const images = buildImages(name, csvImages, primary);

      const publishedVal = String(p.Published) === '0' ? 0 : 1;
      const featuredVal = String(p['Is featured?']) === '1' ? 1 : 0;
      const weightKg = parseFloat(p['Weight (kg)']) || null;

      const obj = {
        sku,
        name,
        slug,
        short_description: (p['Short description'] || '').slice(0, 600) || null,
        description: p.Description || null,
        regular_price: regularPrice ?? null,
        sale_price: salePrice ?? null,
        stock,
        stock_status: stockStatus,
        category_id: categoryId,
        weight_kg: weightKg,
        published: publishedVal,
        featured: featuredVal,
        bestseller: badges.some((b) => /bestseller/i.test(b)) ? 1 : 0,
        eggless: eggless ? 1 : 0,
        flavours: JSON.stringify(flavours),
        badges: JSON.stringify(badges),
        tags: JSON.stringify(tags),
        variations_json: variationsJson || JSON.stringify([]),
        images_json: JSON.stringify(images),
        seo_title: p['SEO Title'] || `${name} | TVO Flavours`,
        seo_description: p['SEO Description'] || (p['Short description'] || '').slice(0, 160) || null,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        db.prepare(`UPDATE products SET
          name=?, slug=?, short_description=?, description=?, regular_price=?, sale_price=?,
          stock=?, stock_status=?, category_id=?, weight_kg=?, published=?, featured=?, bestseller=?,
          eggless=?, flavours=?, badges=?, tags=?, variations_json=?, images_json=?, seo_title=?, seo_description=?, updated_at=?
          WHERE id=?`)
          .run(obj.name, obj.slug, obj.short_description, obj.description, obj.regular_price, obj.sale_price,
            obj.stock, obj.stock_status, obj.category_id, obj.weight_kg, obj.published, obj.featured, obj.bestseller,
            obj.eggless, obj.flavours, obj.badges, obj.tags, obj.variations_json, obj.images_json, obj.seo_title, obj.seo_description, obj.updated_at,
            existing.id);
        summary.products.updated++;
      } else {
        db.prepare(`INSERT INTO products
          (sku, name, slug, short_description, description, regular_price, sale_price, stock, stock_status,
           category_id, weight_kg, published, featured, bestseller, eggless, flavours, badges, tags,
           variations_json, images_json, seo_title, seo_description, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .run(obj.sku, obj.name, obj.slug, obj.short_description, obj.description, obj.regular_price, obj.sale_price,
            obj.stock, obj.stock_status, obj.category_id, obj.weight_kg, obj.published, obj.featured, obj.bestseller,
            obj.eggless, obj.flavours, obj.badges, obj.tags, obj.variations_json, obj.images_json, obj.seo_title, obj.seo_description,
            new Date().toISOString(), obj.updated_at);
        summary.products.created++;
      }
    }
  });

  tx();

  // import history
  try {
    db.prepare(`INSERT INTO settings (key, value) VALUES ('last_import', ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(JSON.stringify({ ...summary, finishedAt: new Date().toISOString() }));
  } catch { /* no-op */ }

  return summary;
}
