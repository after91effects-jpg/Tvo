import { normalizeSellingUnit, isWeightSellingUnit } from '../sellingUnit';
import fs from 'node:fs';
import path from 'node:path';
import { jsonParseSafe } from './api';
import { normalizeImageUrl, mediumImageUrl, isSafeMediaUrl } from '../imageUrl';
import { stripHtmlAndMetadata, cleanDescription } from '../sanitizeDescription';
import { getAddons } from './addons-data';
import { DietaryAttribute, DEFAULT_DIETARY_ATTRIBUTES, ProductVideo, RelatedProduct } from '../types';

function parseRelatedProducts(raw: any): RelatedProduct[] {
  if (!raw) return [];
  let parsed: any = null;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item: any) => {
      // Object entries carry embedded product metadata.
      if (item && typeof item === 'object') {
        const id = String(item.id ?? item.product_id ?? '');
        if (!id) return null;
        const rawImage =
          typeof item.image === 'string'
            ? item.image
            : typeof item.image_url === 'string'
              ? item.image_url
              : typeof item.thumbUrl === 'string'
                ? item.thumbUrl
                : '';
        return {
          id,
          name: typeof item.name === 'string' ? item.name : typeof item.product_name === 'string' ? item.product_name : '',
          slug: typeof item.slug === 'string' ? item.slug : typeof item.product_slug === 'string' ? item.product_slug : '',
          price: Number(item.price || item.sale_price || item.regular_price || 0),
          regularPrice: Number(item.regular_price || item.mrp || 0),
          image: rawImage && isSafeMediaUrl(rawImage) ? rawImage : '',
        };
      }
      // Primitive entries are valid as product-id references (e.g. [1,2,3] or legacy slug strings).
      if (typeof item === 'number' || typeof item === 'string') {
        const id = typeof item === 'number' ? String(item) : item.trim();
        if (!id || (typeof item === 'string' && (item.length === 0 || item.length > 60))) return null;
        return { id, name: '', slug: '', price: 0, regularPrice: undefined, image: undefined };
      }
      return null;
    })
    .filter((r) => r !== null && !!r.id) as RelatedProduct[];
}

function parseFlavourOptions(raw: any): any[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Safe, backward-compatible product video parsing.
// - Missing/malformed JSON never throws and never guesses videos.
// - Entries may be strings (legacy plain URLs) or objects.
// - URLs are normalized; poster/caption are passed through when present.
export function parseVideos(raw: any): ProductVideo[] {
  if (!raw) return [];
  let parsed: any = null;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: ProductVideo[] = [];
  for (const item of parsed) {
    if (!item) continue;
    const url = typeof item === 'string' ? item : (item?.url || '');
    if (!url) continue;
    if (!isSafeMediaUrl(url)) continue;
    const normalized = normalizeImageUrl(url);
    if (!normalized) continue;
    const posterRaw = typeof item === 'object' && item.posterUrl ? String(item.posterUrl) : '';
    const posterUrl = posterRaw && isSafeMediaUrl(posterRaw) ? normalizeImageUrl(posterRaw) : undefined;
    out.push({
      url: normalized,
      posterUrl,
      caption: typeof item === 'object' && typeof item.caption === 'string' && item.caption.trim() ? item.caption.trim() : undefined,
      isPrimary: typeof item === 'object' ? !!item.isPrimary : false,
      ...(typeof item === 'object' && item.id ? { id: String(item.id) } : {}),
    });
  }
  return out;
}

// Safe, backward-compatible dietary attribute parsing.
// - Missing/malformed JSON never throws and never guesses attributes.
// - Legacy products without dietary_json fall back to the `eggless` column.
// - Unknown keys are preserved with a trimmed label fallback (custom).
export function parseDietaryAttributes(raw: any, eggless: boolean): DietaryAttribute[] {
  if (raw) {
    let parsed: any = null;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      parsed = null;
    }
    if (Array.isArray(parsed)) {
      const seen = new Set<string>();
      const result: DietaryAttribute[] = [];
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const key = typeof item.key === 'string' && item.key.trim() ? item.key.trim() : `custom_${result.length + 1}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const known = DEFAULT_DIETARY_ATTRIBUTES.find((d) => d.key === key);
        const label =
          typeof item.label === 'string' && item.label.trim()
            ? item.label.trim()
            : known ? known.label : DEFAULT_DIETARY_ATTRIBUTES.find((d) => d.key === 'custom')?.label || 'Custom';
        result.push({
          key,
          label,
          enabled: !!item.enabled,
          showOnStorefront: !!item.showOnStorefront,
          isCustom: item.isCustom === true || (!!item.enabled && !known),
        });
      }
      return result;
    }
  }
  // Backward-compatible fallback: derive from the legacy eggless flag.
  return eggless
    ? [{ key: 'eggless', label: 'Eggless', enabled: true, showOnStorefront: true, isCustom: false }]
    : DEFAULT_DIETARY_ATTRIBUTES.map((d) => ({ ...d }));
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
  if (isWeightSellingUnit(row.selling_unit) && (desc.includes('cake') || desc.includes('sponge') || desc.includes('frosting'))) return true;
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
    images: (() => {
      const arr = jsonParseSafe(row.images_json, []).map((u: any) => {
        const url = normalizeImageUrl(typeof u === 'string' ? u : (u?.url || ''));
        const candidateMedium = mediumImageUrl(url);
        // Only serve mediumUrl if file physically exists on disk, otherwise serve original url directly
        const mediumExists = candidateMedium && candidateMedium !== url &&
          fs.existsSync(path.join(process.cwd(), 'public', candidateMedium));
        const finalMedium = mediumExists ? candidateMedium : url;
        const asObject = typeof u === 'object' && u ? u : {};
        return {
          url,
          mediumUrl: finalMedium,
          thumbUrl: finalMedium,
          alt: asObject.alt || asObject.altText || '',
          caption: asObject.caption || '',
          isPrimary: !!asObject.isPrimary || asObject.type === 'primary',
        };
      }).filter((i: any) => i.url);
      // Legacy rows have no primary marker: first image wins backwards-compatibly.
      if (arr.length && !arr.some((i: any) => i.isPrimary)) arr[0].isPrimary = true;
      return arr;
    })(),
    videos: parseVideos(row.videos_json),
    flavours: (Array.isArray(jsonParseSafe(row.flavours, [])) && jsonParseSafe(row.flavours, []).length > 0)
      ? jsonParseSafe(row.flavours, []).map((fl: any) => typeof fl === 'string' ? fl : fl.name)
      : flavourOptions.map((fo: any) => fo.name),
    flavourOptions,
    badges: jsonParseSafe(row.badges, []),
    tags: jsonParseSafe(row.tags, []),
    eggless: !!row.eggless,
    sellingUnit: normalizeSellingUnit(row.selling_unit),
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
    // Extended feature controls
    showDietary: row.show_dietary !== 0,
    showDelivery: row.show_delivery !== 0,
    showDeliveryDate: row.show_delivery_date !== 0,
    showDeliverySlot: row.show_delivery_slot !== 0,
    showSpecialInstructions: row.show_special_instructions !== 0,
    showRatings: row.show_ratings !== 0,
    showBadges: row.show_badges !== 0,
    showSizeSelector: row.show_size_selector !== 0,
    showReviews: row.show_reviews !== 0,
    showFaq: row.show_faq !== 0,
    showRelatedProducts: row.show_related_products !== 0,
    showCheckoutOptions: row.show_checkout_options !== 0,
    related: parseRelatedProducts(row.related_products),
    addons: getAddons(),
    dietaryAttributes: parseDietaryAttributes(row.dietary_json, !!row.eggless),
  };
}

export const PRODUCT_BASE_SELECT = `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
  (SELECT AVG(rating) FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved') AS avg_rating,
  (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved') AS review_count
  FROM products p LEFT JOIN categories c ON p.category_id = c.id`;

export const deserializeProduct = serializeProduct;