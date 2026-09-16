import fs from 'node:fs';
import path from 'node:path';
import { jsonParseSafe } from './api';
import { normalizeImageUrl, mediumImageUrl } from '../imageUrl';
import { stripHtmlAndMetadata, cleanDescription } from '../sanitizeDescription';
import { getAddons } from './addons-data';

function parseFlavourOptions(raw: any): any[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}



export const DEFAULT_CAKE_FLAVOUR_OPTIONS = [
  { id: 'flav-belgian-choc', name: 'Belgian Chocolate', additionalPrice: 0, isDefault: true, displayOrder: 1, isActive: true, showOnStorefront: true, enabled: true },
  { id: 'flav-red-velvet', name: 'Red Velvet', additionalPrice: 50, isDefault: false, displayOrder: 2, isActive: true, showOnStorefront: true, enabled: true },
  { id: 'flav-vanilla', name: 'Vanilla', additionalPrice: 0, isDefault: false, displayOrder: 3, isActive: true, showOnStorefront: true, enabled: true },
  { id: 'flav-butterscotch', name: 'Butterscotch', additionalPrice: 0, isDefault: false, displayOrder: 4, isActive: true, showOnStorefront: true, enabled: true },
  { id: 'flav-black-forest', name: 'Black Forest', additionalPrice: 0, isDefault: false, displayOrder: 5, isActive: true, showOnStorefront: true, enabled: true },
  { id: 'flav-fresh-strawberry', name: 'Fresh Strawberry', additionalPrice: 80, isDefault: false, displayOrder: 6, isActive: true, showOnStorefront: true, enabled: true },
];

function isCakeProduct(row: any): boolean {
  const name = String(row.name || '').toLowerCase();
  const cat = String(row.category_slug || row.category || '').toLowerCase();
  const desc = String(row.description || '').toLowerCase();

  // Exclude non-cake categories and products
  if (/candle|topper|balloon|decor|mould|tool|hamper|cookie|mithai|ladoo|barfi|cupcake|pastry\s*slice/i.test(name)) {
    return false;
  }
  if (/party-supplies|baking-store|hampers-gifts/i.test(cat)) {
    return false;
  }

  // Positive cake signals
  if (name.includes('cake')) return true;
  if (cat.includes('cake')) return true;
  if (row.selling_unit === 'weight' && (desc.includes('cake') || desc.includes('sponge') || desc.includes('frosting'))) return true;
  return false;
}

export function serializeProduct(row: any) {
  if (!row) return null;

  const rawShort = row.short_description || '';
  const rawDesc = row.description || '';
  const cleanShort = stripHtmlAndMetadata(rawShort || rawDesc);
  const cleanDesc = cleanDescription(rawDesc || rawShort);

  let flavourOptions = parseFlavourOptions(row.flavour_options_json);
  if (flavourOptions.length === 0 && row.flavours) {
    const legacyFlavours = jsonParseSafe(row.flavours, []);
    if (Array.isArray(legacyFlavours) && legacyFlavours.length > 0) {
      flavourOptions = legacyFlavours.map((fl: any, idx: number) => ({
        id: `flav_${idx + 1}`,
        name: typeof fl === 'string' ? fl : fl.name,
        additionalPrice: typeof fl === 'object' && fl.additionalPrice ? Number(fl.additionalPrice) : 0,
        isDefault: idx === 0,
        displayOrder: idx + 1,
        isActive: true,
        showOnStorefront: true,
        enabled: true,
      }));
    }
  }

  if (flavourOptions.length === 0 && isCakeProduct(row)) {
    flavourOptions = DEFAULT_CAKE_FLAVOUR_OPTIONS.map((f) => ({ ...f }));
  }

  return {
    id: String(row.id),
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    shortDescription: cleanShort,
    description: cleanDesc,
    category: row.category_slug || '',
    categoryId: row.category_id,
    categoryName: row.category_name,
    regularPrice: row.regular_price,
    salePrice: row.sale_price,
    price: row.sale_price ?? row.regular_price,
    stock: row.stock,
    stockStatus: row.stock_status,
    weightOptions: jsonParseSafe(row.variations_json, []),
    images: jsonParseSafe(row.images_json, []).map((u: any) => {
      const url = normalizeImageUrl(typeof u === 'string' ? u : (u?.url || ''));
      const candidateMedium = mediumImageUrl(url);
      // Only serve mediumUrl if file physically exists on disk, otherwise serve original url directly
      const mediumExists = candidateMedium && candidateMedium !== url &&
        fs.existsSync(path.join(process.cwd(), 'public', candidateMedium));
      const finalMedium = mediumExists ? candidateMedium : url;
      return { url, mediumUrl: finalMedium, thumbUrl: finalMedium, isPrimary: true };
    }).filter((i: any) => i.url),
    flavours: (Array.isArray(jsonParseSafe(row.flavours, [])) && jsonParseSafe(row.flavours, []).length > 0)
      ? jsonParseSafe(row.flavours, []).map((fl: any) => typeof fl === 'string' ? fl : fl.name)
      : flavourOptions.map((fo: any) => fo.name),
    flavourOptions,
    badges: jsonParseSafe(row.badges, []),
    tags: jsonParseSafe(row.tags, []),
    eggless: !!row.eggless,
    sellingUnit: row.selling_unit || 'weight',
    featured: !!row.featured,
    bestseller: !!row.bestseller,
    newArrival: !!row.new_arrival,
    deal: !!row.deal,
    published: !!row.published,
    customOrder: !!row.custom_order,
    catalogSource: row.catalog_source || 'csv',
    weightKg: row.weight_kg,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rating: row.avg_rating ?? 0,
    reviewCount: row.review_count ?? 0,
    prepTimeMinutes: row.prep_time_minutes ?? null,
    sameDayEligible: !!row.same_day_eligible,
    minAdvanceNotice: row.min_advance_notice ?? null,
    // Customization fields
    customizationFee: Number(row.customization_fee) || 0,
    allowCustomMessage: row.allow_custom_message !== 0,
    allowCustomDesign: row.allow_custom_design === 1,
    // Feature toggles
    showGallery: row.show_gallery !== 0,
    showVideo: row.show_video === 1,
    showFlavour: row.show_flavour !== 0,
    showCustomize: row.show_customize !== 0,
    showCustomization: row.show_customize !== 0,
    showDesignUpload: row.show_design_upload !== 0,
    showCustomerDesignUpload: row.show_design_upload !== 0,
    showAddons: row.show_addons !== 0,
    addons: getAddons(),
  };
}

export const PRODUCT_BASE_SELECT = `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
  (SELECT AVG(rating) FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved') AS avg_rating,
  (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved') AS review_count
  FROM products p LEFT JOIN categories c ON p.category_id = c.id`;

export const deserializeProduct = serializeProduct;