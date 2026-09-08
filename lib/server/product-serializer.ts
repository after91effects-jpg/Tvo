import fs from 'node:fs';
import path from 'node:path';
import { jsonParseSafe } from './api';
import { normalizeImageUrl, mediumImageUrl } from '../imageUrl';
import { stripHtmlAndMetadata, cleanDescription } from '../sanitizeDescription';

export function serializeProduct(row: any) {
  if (!row) return null;

  const rawShort = row.short_description || '';
  const rawDesc = row.description || '';
  const cleanShort = stripHtmlAndMetadata(rawShort || rawDesc);
  const cleanDesc = cleanDescription(rawDesc || rawShort);

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
    flavours: jsonParseSafe(row.flavours, []),
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
  };
}

export const PRODUCT_BASE_SELECT = `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
  (SELECT AVG(rating) FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved') AS avg_rating,
  (SELECT COUNT(*) FROM product_reviews pr WHERE pr.product_id=p.id AND pr.status='approved') AS review_count
  FROM products p LEFT JOIN categories c ON p.category_id = c.id`;