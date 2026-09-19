// Normalize image URLs coming from the DB (which may contain "../../" relative
// prefixes or the old tvoflavours.com/wp-content origin) into clean root-absolute
// static paths like "/uploads/2026/05/x.png" that Next serves from public/.
// WordPress "resized" variants (e.g. "Pineapple-Cake-100x100.png") are remapped
// to the full-size file so storefront images are never served from blurry thumbs.
export function normalizeImageUrl(url: string): string {
  if (!url) return '';
  let u = String(url).trim();
  if (!u) return '';
  // Preserve data URIs and foreign external URLs untouched.
  if (!/^https?:\/\/(www\.)?tvoflavours\.com/i.test(u) && /^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
  // Rewrite the legacy WP origin to the self-hosted static dir.
  u = u.replace(/^https?:\/\/(www\.)?tvoflavours\.com\/wp-content/i, '');
  u = u.replace(/^https?:\/\/(www\.)?tvoflavours\.com/i, '/');
  // Also strip standalone or relative /wp-content/ prefix
  u = u.replace(/^\/?wp-content\//i, '/');
  // Strip query parameters
  u = u.split('?')[0];
  // Collapse "." and ".." segments and root-anchor the path.
  const out: string[] = [];
  for (const seg of u.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') { out.pop(); continue; }
    out.push(seg);
  }
  const clean = '/' + out.join('/');
  // Prefer the full-size image over WordPress "-<w>x<h>" resize variants.
  return clean.replace(/(-\d+x\d+)(\.[a-z0-9]+)$/i, '$2');
}

// Returns a compact WebP rendition (e.g. "/uploads/2026/05/Pineapple-Cake-w700.webp")
// of a normalized image path, used for lightweight storefront cards so the
// catalog never downloads 1-3 MB full-size files for every product.
// Foreign/external URLs are returned unchanged.
export function mediumImageUrl(url: string): string {
  if (!url || !url.startsWith('/')) return url;
  return url.replace(/\.[a-z0-9]+$/i, '-w700.webp');
}

// Edge-only guard for URLs persisted into product media columns. Accepts only
// http(s) external URLs, protocol-relative URLs, and self-hosted root-absolute
// paths (e.g. /uploads/...). Rejects data URIs, javascript:/file:/other schemes,
// and any relative path so path-traversal-style values ("../../etc/passwd")
// can never be stored.
export function isSafeMediaUrl(raw: string): boolean {
  if (!raw) return false;
  const t = String(raw).trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true; // https://
  if (t.startsWith('//')) return /^\/\/[^/?#]+/.test(t); // protocol-relative
  if (t.startsWith('/')) return /^\/[^/?#]+/.test(t); // self-hosted root-absolute path
  return false;
}

export const DEFAULT_FALLBACK_IMAGE = '/uploads/2026/05/Belgian-Chocolate-Cake-w700.webp';
export const DEFAULT_BANNER_FALLBACK = '/images/products/uploads/Banner_3270x320.webp';
export const DEFAULT_CAKE_FALLBACK = '/uploads/2026/05/Belgian-Chocolate-Cake-w700.webp';

/**
 * Safely resolves the category image URL from any category object, story object, or URL string.
 * Automatically normalizes legacy paths, strips /wp-content/, selects medium webp if available,
 * and falls back to DEFAULT_FALLBACK_IMAGE when missing or invalid.
 */
export function resolveCategoryImageUrl(categoryOrUrl: any, preferMedium: boolean = true): string {
  if (!categoryOrUrl) return DEFAULT_FALLBACK_IMAGE;

  let rawUrl = '';
  if (typeof categoryOrUrl === 'string') {
    rawUrl = categoryOrUrl;
  } else if (typeof categoryOrUrl === 'object') {
    rawUrl = categoryOrUrl.image || categoryOrUrl.imageUrl || categoryOrUrl.thumbnail || '';
  }

  const normalized = normalizeImageUrl(rawUrl);
  if (!normalized) return DEFAULT_FALLBACK_IMAGE;

  if (preferMedium) {
    const medium = mediumImageUrl(normalized);
    if (medium) return medium;
  }

  return normalized;
}

/**
 * Safely resolves the primary image URL for any product or image object.
 */
export function resolveProductImage(productOrImages: any, preferMedium: boolean = true): string {
  if (!productOrImages) return DEFAULT_FALLBACK_IMAGE;

  let images = Array.isArray(productOrImages) ? productOrImages : productOrImages.images;
  if (!images && productOrImages.imageUrl) {
    return normalizeImageUrl(productOrImages.imageUrl);
  }
  if (!Array.isArray(images) || images.length === 0) {
    return DEFAULT_FALLBACK_IMAGE;
  }

  const primary = images[0];
  if (typeof primary === 'string') {
    return normalizeImageUrl(primary);
  }
  if (primary && typeof primary === 'object') {
    if (preferMedium && primary.mediumUrl) {
      return normalizeImageUrl(primary.mediumUrl);
    }
    if (primary.url) {
      return normalizeImageUrl(primary.url);
    }
    if (primary.thumbUrl) {
      return normalizeImageUrl(primary.thumbUrl);
    }
  }

  return DEFAULT_FALLBACK_IMAGE;
}

/**
 * Reusable image error handler with safe two-tier fallback:
 * Tier 1: Falls back from medium/thumb URL to original normalized URL if different
 * Tier 2: Falls back to verified local default cake asset
 * Protects against infinite loops via dataset.fallback tracking.
 */
export function handleImageFallback(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  originalUrl?: string,
  finalFallback: string = DEFAULT_FALLBACK_IMAGE
) {
  const target = e.currentTarget;
  if (target.dataset.fallback === '2') {
    return; // Already reached final fallback
  }

  const normalizedOriginal = originalUrl ? normalizeImageUrl(originalUrl) : '';
  if (!target.dataset.fallback && normalizedOriginal && target.src && !target.src.endsWith(normalizedOriginal)) {
    target.dataset.fallback = '1';
    target.src = normalizedOriginal;
  } else {
    target.dataset.fallback = '2';
    target.src = finalFallback;
  }
}