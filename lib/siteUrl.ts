/**
 * Centralized site URL configuration.
 *
 * All SEO-facing URLs (canonical, sitemap, robots, Open Graph, structured
 * data, metadataBase) must be derived from this single source of truth so
 * that the deployed domain is never hard-coded in multiple places.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL  — explicit public base URL (preferred)
 *   2. APP_URL               — legacy hosting URL (AI Studio / Cloud Run)
 *   3. FALLBACK_URL           — last-resort default for this deployment
 *
 * The value is normalized: trailing slash is stripped and the result is
 * returned without a path component.
 */

const FALLBACK_URL = 'https://blanchedalmond-leopard-910858.hostingersite.com';

function readEnv(): string | undefined {
  if (typeof process !== 'undefined') {
    return (
      (process.env.NEXT_PUBLIC_SITE_URL as string | undefined) ||
      (process.env.APP_URL as string | undefined)
    );
  }
  return undefined;
}

export function getSiteUrl(): string {
  const raw = readEnv();
  if (!raw || !raw.trim()) {
    return FALLBACK_URL;
  }
  try {
    const url = new URL(raw.trim());
    // Use the origin only — drop any path/query/hash so callers can append
    // their own routes safely.
    return url.origin;
  } catch {
    // Fall back to a bare string when it is not a parseable URL (e.g. a
    // relative origin). Strip a trailing slash for consistency.
    return raw.trim().replace(/\/$/, '');
  }
}

/** Convenience export for static import sites (sitemap / robots). */
export const SITE_URL = getSiteUrl();

/** Build an absolute URL by appending a path to the site root. */
export function siteUrl(path = ''): string {
  const base = getSiteUrl();
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}