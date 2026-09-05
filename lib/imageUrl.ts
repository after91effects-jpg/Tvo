// Normalize image URLs coming from the DB (which may contain "../../" relative
// prefixes or the old tvoflavours.com/wp-content origin) into clean root-absolute
// static paths like "/uploads/2026/05/x.png" that Next serves from public/.
// WordPress "resized" variants (e.g. "Pineapple-Cake-100x100.png") are remapped
// to the full-size file so storefront images are never served from blurry thumbs.
export function normalizeImageUrl(url: string): string {
  if (!url) return url;
  let u = String(url).trim();
  if (!u) return u;
  // Preserve data URIs and foreign external URLs untouched.
  if (!/^https?:\/\/(www\.)?tvoflavours\.com/i.test(u) && /^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
  // Rewrite the legacy WP origin to the self-hosted static dir.
  u = u.replace(/^https?:\/\/(www\.)?tvoflavours\.com\/wp-content/i, '');
  u = u.replace(/^https?:\/\/(www\.)?tvoflavours\.com/i, '/');
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