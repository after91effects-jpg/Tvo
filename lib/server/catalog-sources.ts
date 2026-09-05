// ============================================================================
// TVO FLAVOURS — CATALOG SOURCE CONFIGURATION
//
// Declares, in one place, which catalog sources feed the storefront and which
// are purely historical/reference. This is surfaced in the Admin Panel so the
// distinguish between authoritative and legacy data is explicit.
//
//   AUTHORITATIVE ACTIVE CATALOG : wc-product-export (WooCommerce Product CSV)
//   REFERENCE / LEGACY CATALOG    : confetto_products_export.csv
//
// The normal catalog importer (`importCatalog`) processes ONLY the
// authoritative WooCommerce Product CSV. The confetto CSV is never auto-imported
// or re-imported; it is kept on disk and referenced only for reporting/audit
// (it is the historical source of the 4 known legacy DB-only SKUs).
// ============================================================================
import path from 'node:path';

const ROOT = '/Users/amit/Downloads/202;0Tvo';

export const CATALOG_SOURCES = {
  authoritative: {
    key: 'woocommerce-product-csv',
    label: 'WooCommerce Product CSV',
    role: 'AUTHORITATIVE ACTIVE CATALOG',
    file: path.join(ROOT, 'wc-product-export-2-9-2026-1788331015035.csv'),
    autoImport: true,
  },
  reference: {
    key: 'confetto-product-csv',
    label: 'confetto_products_export.csv',
    role: 'REFERENCE / LEGACY CATALOG',
    file: path.join(ROOT, 'confetto_products_export.csv'),
    autoImport: false,
    note: 'Historical source for legacy DB-only SKUs. Never auto-imported.',
  },
  categories: {
    key: 'categories-csv',
    label: 'product-categories CSV',
    role: 'CATEGORY HIERARCHY',
    file: path.join(ROOT, 'uploads', 'wc-imports', 'product-categories-gjra7dgqut.csv'),
    autoImport: true,
  },
} as const;

// Machine-readable summary for the Admin Panel.
export function getCatalogSourceConfig() {
  return {
    catalogs: [
      {
        key: CATALOG_SOURCES.authoritative.key,
        label: CATALOG_SOURCES.authoritative.label,
        role: CATALOG_SOURCES.authoritative.role,
        autoImport: CATALOG_SOURCES.authoritative.autoImport,
        fileName: path.basename(CATALOG_SOURCES.authoritative.file),
      },
      {
        key: CATALOG_SOURCES.reference.key,
        label: CATALOG_SOURCES.reference.label,
        role: CATALOG_SOURCES.reference.role,
        autoImport: CATALOG_SOURCES.reference.autoImport,
        fileName: path.basename(CATALOG_SOURCES.reference.file),
        note: CATALOG_SOURCES.reference.note,
      },
    ],
    categorySource: {
      key: CATALOG_SOURCES.categories.key,
      label: CATALOG_SOURCES.categories.label,
      role: CATALOG_SOURCES.categories.role,
      autoImport: CATALOG_SOURCES.categories.autoImport,
      fileName: path.basename(CATALOG_SOURCES.categories.file),
    },
    activeCatalogBasis: 'woocommerce-product-csv',
  };
}

export { ROOT };