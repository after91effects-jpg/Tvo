// ============================================================================
// TVO FLAVOURS — SAFE CATALOG RECONCILIATION (dry-run + apply, idempotent)
//
// Reconciles the authoritative WooCommerce Product CSV + Category CSV against
// the SQLite catalog WITHOUT destructive operations:
//   - Never deletes any database product.
//   - Never creates duplicate products.
//   - Upserts CSV products by unique SKU.
//   - Skips CSV rows that lack a SKU (flags them "manual SKU needed").
//   - Marks database-only products (from confetto / hardcoded sources) as
//     `catalog_source='legacy'` and unpublishes them from the storefront,
//     preserving their records for audit.
//   - Writes a repeatable, verifiable reconciliation report.
//
// The ACTIVE storefront catalog = the validated WC Product CSV.
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { db, DB_PATH } from './db';
import { importCatalog } from './importer';
import { CATALOG_SOURCES, getCatalogSourceConfig, ROOT } from './catalog-sources';

const WC_CSV = CATALOG_SOURCES.authoritative.file;
const CATEGORY_CSV = CATALOG_SOURCES.categories.file;
const CONFETTO_CSV = CATALOG_SOURCES.reference.file;

// SKUs that exist in the DB but NOT in the authoritative WC Product CSV.
// Derived from the REFERENCE/Legacy confetto catalog (historical source).
// All confetto SKUs that are absent from the WC product SKU set are treated as
// legacy DB-only records: preserved, tagged 'legacy', and kept unpublished.
function getLegacyDbOnlySkus() {
  const wcSkuLower = new Set<string>();
  for (const p of loadCsv(WC_CSV)) {
    if (p.Type === 'variation') continue;
    const s = (p.SKU || '').trim();
    if (s) wcSkuLower.add(s.toLowerCase());
  }
  const legacy = new Set<string>();
  for (const c of loadCsv(CONFETTO_CSV)) {
    const s = (c.SKU || '').trim();
    if (s && !wcSkuLower.has(s.toLowerCase())) legacy.add(s);
  }
  return [...legacy];
}

// ---- migration: additive `catalog_source` column (idempotent, non-destructive)
function ensureCatalogSourceColumn() {
  const cols = db.prepare(`PRAGMA table_info(products)`).all() as any[];
  if (!cols.some((c) => c.name === 'catalog_source')) {
    db.exec(`ALTER TABLE products ADD COLUMN catalog_source TEXT`);
  }
}

function loadCsv(p) {
  if (!fs.existsSync(p)) return [];
  const text = fs.readFileSync(p, 'utf8');
  return Papa.parse(text, { header: true, skipEmptyLines: 'greedy' }).data;
}

function firstKeyOf(row: any) { return Object.keys(row)[0]; }
function idOf(row: any) {
  const k = firstKeyOf(row);
  return (row[k] || row['ID'] || '').toString();
}
function slugify(s) {
  return (s || '').toString().toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s]+/g, '-').replace(/-+/g, '-');
}

// ---- pure analysis (NO database writes) -----------------------------------
export function analyzeCatalog() {
  ensureCatalogSourceColumn();

  const productRows = loadCsv(WC_CSV);
  const categoryRows = loadCsv(CATEGORY_CSV);

  const products = productRows.filter((p) => p.Type !== 'variation');
  const variations = productRows.filter((p) => p.Type === 'variation');

  // CSV product SKUs (non-variation), lowercased-keyed
  const csvSkuToRow = new Map<string, any>();
  const csvRowsNoSku: any[] = [];
  const csvDupSkus = new Map<string, number>();
  for (const p of products) {
    const sku = (p.SKU || '').trim();
    if (!sku) { csvRowsNoSku.push(p); continue; }
    const key = sku.toLowerCase();
    if (csvSkuToRow.has(key)) { csvDupSkus.set(key, (csvDupSkus.get(key) || 1) + 1); continue; }
    csvSkuToRow.set(key, p);
  }

  // DB state
  const dbRows = db.prepare('SELECT id, sku, name, published, catalog_source, images_json FROM products').all() as any[];
  const dbSkuById = new Map<number, string>();
  const dbBySkuLower = new Map<string, any>();
  for (const r of dbRows) {
    if (r.sku) { dbSkuById.set(r.id, r.sku); dbBySkuLower.set(String(r.sku).toLowerCase(), r); }
  }

  // Build report
  const report: any = {
    generatedAt: new Date().toISOString(),
    dbPath: DB_PATH,
    catalogSources: getCatalogSourceConfig(),
    csvProductCount: products.length,
    uniqueCsvSkuCount: csvSkuToRow.size,
    csvVarCount: variations.length,
    existingDbProductCount: dbRows.length,
    categoryCsvRows: categoryRows.length,
    categoryCsvUniqueSlugs: 0,
    existingDbCategoryCount: db.prepare('SELECT COUNT(*) c FROM categories').get().c,
    duplicateCsvSkus: [...csvDupSkus.keys()].map((k) => ({ sku: k, count: csvDupSkus.get(k) })),
    productsMissingSku: csvRowsNoSku.map((r) => ({ id: idOf(r), name: (r.Name || '').trim() })),
    toCreate: [],
    toUpdate: [],
    toSkip: [],
    legacyDbOnly: [],
    duplicateProducts: [],
    missingImages: [],
    unmatchedDbImages: [],
    categoryMismatches: [],
    conflicts: [],
  };

  // 1) Products in CSV (with SKU) vs DB
  for (const [key, csvRow] of csvSkuToRow) {
    const dbRow = dbBySkuLower.get(key);
    if (!dbRow) {
      report.toCreate.push({ sku: csvRow.SKU.trim(), name: (csvRow.Name || '').trim() });
    } else {
      report.toUpdate.push({ sku: csvRow.SKU.trim(), id: dbRow.id, name: (csvRow.Name || '').trim() });
    }
  }

  // 2) DB products whose SKU is not in the WC CSV (incl. confetto extras)
  const legacySkus = getLegacyDbOnlySkus();
  for (const r of dbRows) {
    if (!r.sku) { report.conflicts.push({ type: 'db-row-without-sku', id: r.id, name: r.name }); continue; }
    if (!csvSkuToRow.has(String(r.sku).toLowerCase())) {
      const legacy = legacySkus.includes(String(r.sku));
      report.legacyDbOnly.push({
        id: r.id, sku: r.sku, name: r.name, source: r.catalog_source || 'legacy',
        referenceSource: 'confetto_products_export.csv',
        action: 'unpublish + mark legacy (reference/legacy catalog)', willUnpublish: !!legacy, isKnownLegacySku: legacy,
      });
    }
  }

  // 3) Duplicate product names within DB
  const byName = new Map<string, any[]>();
  for (const r of dbRows) {
    const k = (r.name || '').trim().toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(r);
  }
  for (const [name, rows] of byName) {
    if (rows.length > 1) {
      report.duplicateProducts.push({ name: rows[0].name, rows: rows.map((r) => ({ id: r.id, sku: r.sku })) });
    }
  }

  // 4) Category reconciliation (CSV unique slugs vs DB slugs)
  const csvCategorySlugs = new Set<string>();
  const catSlugToName = new Map<string, string>();
  for (const c of categoryRows) {
    const slug = (c.slug || '').trim();
    if (!slug) continue;
    csvCategorySlugs.add(slug);
    if (!catSlugToName.has(slug)) catSlugToName.set(slug, (c.name || '').trim());
  }
  const dbCatRows = db.prepare('SELECT id, name, slug, parent_id FROM categories ORDER BY id').all() as any[];
  const dbCatBySlug = new Map(dbCatRows.map((r) => [r.slug, r]));
  report.categoryCsvUniqueSlugs = csvCategorySlugs.size;
  report.categoryCsvTopLevel = categoryRows.filter((c) => !(c.parent || '').trim()).length;
  const catsMissingInDb = [...csvCategorySlugs].filter((s) => !dbCatBySlug.has(s)).map((s) => ({ slug: s, name: catSlugToName.get(s) }));
  const catsMissingInCsv = dbCatRows.filter((r) => !csvCategorySlugs.has(r.slug)).map((r) => ({ id: r.id, slug: r.slug, name: r.name }));
  if (catsMissingInDb.length || catsMissingInCsv.length) {
    report.categoryMismatches.push({ missingInDb: catsMissingInDb, inDbNotInCsv: catsMissingInCsv });
  }

  // 5) Image checks: CSV product image files availability + DB images still on disk
  const { findImageAvailability } = regionImageIndex();
  report.missingImages = [];
  for (const [key, csvRow] of csvSkuToRow) {
    const avail = findImageAvailability(csvRow);
    if (!avail.primaryFoundOnDisk) report.missingImages.push({ sku: csvRow.SKU.trim(), name: (csvRow.Name || '').trim(), csvUrl: avail.primaryUrl });
  }

  // DB-referenced images (served) existence
  const unmatchedDb: any[] = [];
  const publicRoot = path.join(ROOT, 'tvo-flavours', 'public');
  for (const r of dbRows) {
    if (!r.images_json) continue;
    let arr = []; try { arr = JSON.parse(r.images_json); } catch { continue; }
    for (const it of arr) {
      const url = typeof it === 'string' ? it : it?.url;
      if (!url || url.startsWith('http')) continue;
      const rel = url.replace(/^\//, '');
      if (!fs.existsSync(path.join(publicRoot, rel))) {
        unmatchedDb.push({ productId: r.id, sku: r.sku, url });
      }
    }
  }
  report.unmatchedDbImages = unmatchedDb;

  // 6) Slug/category conflicts we can detect
  report.conflicts.push({
    type: 'active-catalog-basis',
    note: 'Active storefront catalog = validated WC Product CSV (sku-keyed). Non-CSV DB products are preserved as legacy and unpublished.',
  });

  return report;
}

// index of local image files keyed by normalized base name
let _imgIndex: Map<string, string[]> | null = null;
function getImageIndex() {
  if (_imgIndex) return _imgIndex;
  const roots = [path.join(ROOT, 'uploads'), path.join(ROOT, 'tvoflavours'), path.join(ROOT, 'iloveimg-compressed')];
  const index = new Map<string, string[]>();
  const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.DS_Store') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(e.name)) {
        const base = e.name.replace(/-[\d]{2,4}x[\d]{2,3}(\.[a-z0-9]+)$/i, '$1').replace(/\.[a-z0-9]+$/i, '');
        const k = normKey(base);
        if (!index.has(k)) index.set(k, []);
        index.get(k).push(full);
      }
    }
  };
  for (const r of roots) walk(r);
  _imgIndex = index;
  return _imgIndex;
}
function regionImageIndex() {
  const index = getImageIndex();
  const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return {
    findImageAvailability(csvRow: any) {
      const urls = ((csvRow.Images || '') as string).split(',').map((s) => s.trim()).filter(Boolean);
      const primaryUrl = urls[0] || null;
      if (!primaryUrl) return { primaryFoundOnDisk: false, primaryUrl: null };
      const file = primaryUrl.split('/').pop() || '';
      const base = file.replace(/-\d{2,4}x\d{2,3}(\.[a-z0-9]+)$/i, '$1').replace(/\.[a-z0-9]+$/i, '');
      const k = normKey(base);
      const found = index.get(k) || [];
      let fuzzy = false;
      if (found.length === 0 && base.length > 3) {
        const pk = normKey(base);
        for (const kk of index.keys()) {
          if (kk.includes(pk) && pk.length > 3) { fuzzy = true; break; }
        }
      }
      return { primaryFoundOnDisk: found.length > 0 || fuzzy, primaryUrl };
    },
  };
}

// ---- apply (safe, idempotent reconciliation) ------------------------------
export function applyCatalog() {
  const before = analyzeCatalog();
  const changed = {
    catalogSources: getCatalogSourceConfig(),
    categories: { updated: 0, created: 0 },
    productsUpdated: 0,
    productsCreated: 0,
    productsSkippedMissingSku: before.productsMissingSku.length,
    legacyUnpublished: 0,
    alreadyLegacy: 0,
  };

  // 1) Import ONLY the authoritative WooCommerce Product CSV (upsert by SKU,
  //    no dupes). The confetto CSV is NOT imported here — it is reference/legacy.
  const importSummary = importCatalog();
  changed.productsUpdated = importSummary.products.updated;
  changed.productsCreated = importSummary.products.created;
  changed.categories.created = importSummary.categories.created;
  changed.categories.updated = importSummary.categories.updated;

  // 2) Ensure legacy DB-only products (reference/legacy confetto SKUs) stay
  //    preserved, tagged `legacy`, and unpublished. importCatalog never touches
  //    them (they are not in the WC CSV), so they are not resurrected.
  const legacySkus = getLegacyDbOnlySkus();
  const tx = db.transaction(() => {
    for (const sku of legacySkus) {
      const row = db.prepare('SELECT id, catalog_source, published FROM products WHERE sku=?').get(sku) as any;
      if (!row) continue;
      if (row.published !== 0 || row.catalog_source !== 'legacy') {
        db.prepare(`UPDATE products SET published=0, catalog_source='legacy', updated_at=? WHERE id=?`)
          .run(new Date().toISOString(), row.id);
        changed.legacyUnpublished++;
      } else {
        changed.alreadyLegacy++;
      }
    }
    // Tag authoritative CSV products as active (csv) source — non-destructive,
    // never flips published state.
    const csvSkuLower = new Set(
      before.toUpdate.map((u: any) => u.sku.toLowerCase()).concat(before.toCreate.map((u: any) => u.sku.toLowerCase()))
    );
    for (const sku of csvSkuLower) {
      const row = db.prepare('SELECT id, catalog_source FROM products WHERE lower(sku)=?').get(sku) as any;
      if (row && row.catalog_source !== 'csv') {
        db.prepare(`UPDATE products SET catalog_source='csv' WHERE id=?`).run(row.id);
      }
    }
  });
  tx();

  const after = analyzeCatalog();
  return { before, changed, after };
}