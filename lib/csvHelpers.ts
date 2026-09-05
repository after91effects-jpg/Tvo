import Papa from 'papaparse';
import { Product, WeightOption, DuplicateStrategy, ImportSummary } from './types';
import { db, collection, getDocs, doc, setDoc, COLLECTIONS } from './firebase';

// The canonical fields for TVO Flavours that can be mapped from CSV
export const CONFETTO_PRODUCT_FIELDS = [
  { key: 'sku', label: 'SKU (Stock Keeping Unit)', required: true, aliases: ['sku', 'product_sku', 'code', 'item_code'] },
  { key: 'name', label: 'Product Name / Title', required: true, aliases: ['name', 'title', 'product_name', 'post_title'] },
  { key: 'regularPrice', label: 'Regular Price (MRP in ₹)', required: true, aliases: ['regular price', 'regular_price', 'mrp', 'price', 'standard_price'] },
  { key: 'salePrice', label: 'Sale / Selling Price (₹)', required: false, aliases: ['sale price', 'sale_price', 'selling_price', 'offer_price', 'price'] },
  { key: 'category', label: 'Category', required: true, aliases: ['categories', 'category', 'product_cat', 'type'] },
  { key: 'shortDescription', label: 'Short Description', required: false, aliases: ['short description', 'short_description', 'excerpt', 'post_excerpt', 'summary'] },
  { key: 'description', label: 'Full Description', required: false, aliases: ['description', 'post_content', 'details', 'full_description'] },
  { key: 'stock', label: 'Stock Quantity', required: false, aliases: ['stock', 'inventory', 'quantity', 'qty', 'stock_quantity'] },
  { key: 'stockStatus', label: 'Stock Status (in_stock/out_of_stock)', required: false, aliases: ['in stock?', 'stock_status', 'stock status', 'availability'] },
  { key: 'images', label: 'Images (URLs separated by comma)', required: false, aliases: ['images', 'image', 'featured image', 'image_url', 'photos'] },
  { key: 'eggless', label: 'Eggless / Dietary (Yes/No/True/False)', required: false, aliases: ['eggless', 'dietary', 'is_eggless', 'vegetarian', 'veg'] },
  { key: 'tags', label: 'Tags (comma separated)', required: false, aliases: ['tags', 'product_tags', 'keywords'] },
  { key: 'flavours', label: 'Flavours (comma separated)', required: false, aliases: ['flavours', 'flavors', 'flavor', 'flavour'] },
  { key: 'badges', label: 'Badges (e.g. Bestseller, New)', required: false, aliases: ['badges', 'badge', 'ribbon', 'highlight'] },
  { key: 'weight', label: 'Weight (e.g. 0.5 kg, 1 kg)', required: false, aliases: ['weight (kg)', 'weight', 'size'] },
  { key: 'published', label: 'Published / Active (1/0 or True/False)', required: false, aliases: ['published', 'status', 'is_published', 'active'] },
  { key: 'seoTitle', label: 'SEO Meta Title', required: false, aliases: ['seo title', 'meta_title', 'seo_title'] },
  { key: 'seoDescription', label: 'SEO Meta Description', required: false, aliases: ['seo description', 'meta_description', 'seo_description'] },
] as const;

// WooCommerce standard export columns
export const WOOCOMMERCE_HEADERS = [
  'ID',
  'Type',
  'SKU',
  'Name',
  'Published',
  'Is featured?',
  'Visibility in catalog',
  'Short description',
  'Description',
  'In stock?',
  'Stock',
  'Regular price',
  'Sale price',
  'Categories',
  'Tags',
  'Images',
  'Weight (kg)',
  'Dietary',
  'Eggless',
  'Flavours',
  'Badges',
  'SEO Title',
  'SEO Description'
];

/**
 * Downloads a complete WooCommerce-compatible CSV template
 */
export function downloadWooCommerceTemplate(): void {
  const exampleRows = [
    {
      'ID': '',
      'Type': 'simple',
      'SKU': 'CONF-SAMPLE-01',
      'Name': 'Belgian Truffle Celebration Cake',
      'Published': '1',
      'Is featured?': '1',
      'Visibility in catalog': 'visible',
      'Short description': 'Delicious 54% dark chocolate ganache cake.',
      'Description': 'Crafted with premium Valrhona cacao sponge and velvety truffle filling. Perfect for anniversaries and birthdays.',
      'In stock?': '1',
      'Stock': '25',
      'Regular price': '1499',
      'Sale price': '1299',
      'Categories': 'Chocolate Cakes, Birthday Cakes',
      'Tags': 'Bestseller, Truffle, Dark Chocolate, Eggless',
      'Images': 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62',
      'Weight (kg)': '1.0',
      'Dietary': 'Vegetarian',
      'Eggless': 'Yes',
      'Flavours': 'Dark Chocolate, Hazelnut',
      'Badges': 'Bestseller, Eggless',
      'SEO Title': 'Belgian Truffle Celebration Cake | TVO Flavours',
      'SEO Description': 'Order online fresh artisan Belgian chocolate cake with 2-hour express delivery.'
    }
  ];

  const csv = Papa.unparse(exampleRows, { quotes: true });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'tvo_flavours_woocommerce_product_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports products to a WooCommerce-standard CSV string and triggers browser download
 */
export function exportProductsToWooCommerceCSV(products: Product[], filename: string = 'tvo_flavours_products_export.csv'): void {
  const exportRows = products.map((prod, index) => {
    const baseWeight = prod.weightOptions?.[0] || { price: 999, mrp: 1199, weightKg: 0.5 };
    const salePrice = baseWeight.price;
    const regularPrice = baseWeight.mrp || Math.round(salePrice * 1.2);
    const imageUrls = prod.images?.map(img => img.url).join(', ') || '';

    return {
      'ID': prod.id || `conf-${index + 1}`,
      'Type': 'simple',
      'SKU': prod.sku || `CONF-SKU-${index + 1}`,
      'Name': prod.name,
      'Published': prod.published ? '1' : '0',
      'Is featured?': prod.badges?.includes('Bestseller') ? '1' : '0',
      'Visibility in catalog': 'visible',
      'Short description': prod.shortDescription || '',
      'Description': prod.description || '',
      'In stock?': prod.stockStatus === 'in_stock' ? '1' : '0',
      'Stock': prod.stock?.toString() || '15',
      'Regular price': regularPrice.toString(),
      'Sale price': salePrice.toString(),
      'Categories': prod.category || 'Cakes',
      'Tags': prod.tags?.join(', ') || '',
      'Images': imageUrls,
      'Weight (kg)': baseWeight.weightKg?.toString() || '0.5',
      'Dietary': prod.eggless ? 'Eggless' : 'Contains Egg',
      'Eggless': prod.eggless ? 'Yes' : 'No',
      'Flavours': prod.flavours?.join(', ') || '',
      'Badges': prod.badges?.join(', ') || '',
      'SEO Title': prod.seoTitle || `${prod.name} | TVO Flavours`,
      'SEO Description': prod.seoDescription || prod.shortDescription || '',
    };
  });

  const csv = Papa.unparse(exportRows, { quotes: true });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Auto-suggests column mapping based on standard WooCommerce & CSV header names
 */
export function autoSuggestColumnMapping(csvHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  CONFETTO_PRODUCT_FIELDS.forEach(field => {
    const matchedHeader = csvHeaders.find(header => {
      const clean = header.trim().toLowerCase();
      return field.aliases.some(alias => clean === alias.toLowerCase() || clean.includes(alias.toLowerCase()));
    });
    if (matchedHeader) {
      mapping[field.key] = matchedHeader;
    }
  });

  return mapping;
}

/**
 * Transforms a raw CSV row into a typed TVO Flavours Product
 */
export function transformCSVRowToProduct(
  row: Record<string, any>,
  mapping: Record<string, string>,
  existingProduct?: Product
): { product: Product; isNew: boolean } {
  const getValue = (fieldKey: string): string => {
    const header = mapping[fieldKey];
    if (!header || row[header] === undefined || row[header] === null) return '';
    return String(row[header]).trim();
  };

  const rawSku = getValue('sku') || (existingProduct ? existingProduct.sku : `CONF-IMP-${Date.now().toString().slice(-5)}`);
  const name = getValue('name') || (existingProduct ? existingProduct.name : 'Imported Artisan Cake');
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const regularPrice = parseFloat(getValue('regularPrice')) || 999;
  const salePrice = parseFloat(getValue('salePrice')) || regularPrice;

  const rawCategory = getValue('category') || 'birthday';
  const categorySlug = rawCategory.toLowerCase().replace(/\s+/g, '-');

  const shortDesc = getValue('shortDescription') || 'Freshly baked artisan confection by TVO Flavours.';
  const fullDesc = getValue('description') || shortDesc;

  const rawStock = parseInt(getValue('stock'), 10);
  const stock = isNaN(rawStock) ? 20 : rawStock;
  const stockStatus = getValue('stockStatus').toLowerCase().includes('out') || stock <= 0 ? 'out_of_stock' : 'in_stock';

  const rawEggless = getValue('eggless').toLowerCase();
  const eggless = rawEggless === 'yes' || rawEggless === 'true' || rawEggless === '1' || rawEggless.includes('veg');

  const tags = getValue('tags') ? getValue('tags').split(',').map(s => s.trim()).filter(Boolean) : ['Artisan Cake'];
  const flavours = getValue('flavours') ? getValue('flavours').split(',').map(s => s.trim()).filter(Boolean) : ['Classic Vanilla'];
  const badges = getValue('badges') ? getValue('badges').split(',').map(s => s.trim()).filter(Boolean) : (eggless ? ['Eggless'] : []);

  const rawImages = getValue('images');
  const imageUrls = rawImages ? rawImages.split(',').map(s => s.trim()).filter(Boolean) : [];
  
  const images = imageUrls.length > 0
    ? imageUrls.map((url, i) => ({
        url,
        thumbUrl: url,
        alt: `${name} View ${i + 1}`,
      }))
    : existingProduct?.images || [
        {
          url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80',
          thumbUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=70',
          alt: name,
        }
      ];

  const rawWeight = parseFloat(getValue('weight')) || 0.5;
  const weightOptions: WeightOption[] = [
    { label: `${rawWeight} kg (Serves 4-6)`, weightKg: rawWeight, price: salePrice, mrp: regularPrice },
    { label: `${(rawWeight * 2).toFixed(1)} kg (Serves 8-10)`, weightKg: rawWeight * 2, price: Math.round(salePrice * 1.85), mrp: Math.round(regularPrice * 1.85) },
  ];

  const published = getValue('published') === '0' || getValue('published').toLowerCase() === 'false' ? false : true;

  const product: Product = {
    id: existingProduct?.id || `prod-imp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sku: rawSku,
    name,
    slug,
    shortDescription: shortDesc,
    description: fullDesc,
    category: categorySlug,
    tags,
    flavours,
    eggless,
    weightOptions,
    images,
    rating: existingProduct?.rating || 4.8,
    reviewCount: existingProduct?.reviewCount || 1,
    stock,
    stockStatus,
    badges,
    published,
    seoTitle: getValue('seoTitle') || `${name} | TVO Flavours Artisan Bakery`,
    seoDescription: getValue('seoDescription') || shortDesc,
    createdAt: existingProduct?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { product, isNew: !existingProduct };
}

/**
 * Parses a WooCommerce CSV file asynchronously
 */
export async function parseWooCommerceCSV(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors && results.errors.length > 0 && (!results.data || results.data.length === 0)) {
          reject(new Error(results.errors[0].message || 'Error parsing CSV'));
        } else {
          // Filter out rows that are completely empty
          const cleanData = (results.data as Record<string, any>[]).filter((row) =>
            Object.values(row).some((val) => val !== null && val !== undefined && String(val).trim() !== '')
          );
          resolve(cleanData);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Imports products from parsed WooCommerce CSV rows into Firestore
 */
export async function importProductsFromWooCommerce(
  rows: Record<string, any>[],
  duplicateStrategy: DuplicateStrategy,
  userName: string = 'Chef Administrator'
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (!rows || rows.length === 0) {
    return summary;
  }

  // Get existing products to check for duplicates by SKU or Name
  const snap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
  const existingMap = new Map<string, Product>();
  snap.docs.forEach((d) => {
    const data = { id: d.id, ...(d.data() as Omit<Product, 'id'>) };
    if (data.sku) existingMap.set(data.sku.trim().toLowerCase(), data);
    if (data.name) existingMap.set(data.name.trim().toLowerCase(), data);
  });

  const headers = Object.keys(rows[0] || {});
  const mapping = autoSuggestColumnMapping(headers);

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNum = index + 1;

    try {
      // Find SKU or Name
      const skuVal = (row[mapping['sku']] || row['SKU'] || row['sku'] || '').toString().trim();
      const nameVal = (row[mapping['name']] || row['Name'] || row['name'] || '').toString().trim();

      if (!nameVal && !skuVal) {
        summary.skipped++;
        continue;
      }

      const existing = (skuVal && existingMap.get(skuVal.toLowerCase())) ||
        (nameVal && existingMap.get(nameVal.toLowerCase()));

      if (existing) {
        if (duplicateStrategy === 'skip') {
          summary.skipped++;
          continue;
        } else if (duplicateStrategy === 'create_new') {
          const transformed = transformCSVRowToProduct(row, mapping);
          transformed.product.createdBy = userName;
          await setDoc(doc(db, COLLECTIONS.PRODUCTS, transformed.product.id), transformed.product);
          summary.created++;
        } else {
          // 'update'
          const transformed = transformCSVRowToProduct(row, mapping, existing);
          transformed.product.id = existing.id;
          transformed.product.updatedAt = new Date().toISOString();
          await setDoc(doc(db, COLLECTIONS.PRODUCTS, existing.id), transformed.product);
          summary.updated++;
        }
      } else {
        const transformed = transformCSVRowToProduct(row, mapping);
        transformed.product.createdBy = userName;
        await setDoc(doc(db, COLLECTIONS.PRODUCTS, transformed.product.id), transformed.product);
        summary.created++;
      }
    } catch (err: any) {
      summary.failed++;
      summary.errors.push({
        row: rowNum,
        reason: err?.message || 'Error processing row',
        data: row,
      });
    }
  }

  return summary;
}

