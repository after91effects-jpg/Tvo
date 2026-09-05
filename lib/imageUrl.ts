// Normalize image URLs coming from the DB (which may contain "../../" relative
// prefixes or the old tvoflavours.com/wp-content origin) into clean root-absolute
// static paths like "/uploads/2026/05/x.png" that Next serves from public/.
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
  return '/' + out.join('/');
}