import { ok, err, requireAdmin } from '../../../../../lib/server/api';
import { db } from '../../../../../lib/server/db';
import { normalizeSku, validateSkuFormat, suggestSku } from '../../../../../lib/sku';

export const runtime = 'nodejs';

/**
 * GET /api/admin/products/sku?sku=...&excludeId=...
 * Checks whether a given SKU is available and well-formed.
 */
export async function GET(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const url = new URL(req.url);
    const rawSku = url.searchParams.get('sku') || '';
    const excludeId = Number(url.searchParams.get('excludeId') || url.searchParams.get('id') || -1);

    const validation = validateSkuFormat(rawSku);
    if (!validation.valid) {
      return ok({
        available: false,
        valid: false,
        error: validation.error,
        sku: validation.normalizedSku,
      });
    }

    const normalized = validation.normalizedSku;
    const existing = db
      .prepare('SELECT id, name FROM products WHERE lower(sku) = lower(?) AND id != ?')
      .get(normalized, excludeId) as { id: number; name: string } | undefined;

    if (existing) {
      return ok({
        available: false,
        valid: true,
        sku: normalized,
        error: `SKU "${normalized}" is already in use by "${existing.name}" (ID: ${existing.id})`,
        collision: { id: existing.id, name: existing.name },
      });
    }

    return ok({
      available: true,
      valid: true,
      sku: normalized,
    });
  } catch (e: any) {
    return err(e?.message || 'Error verifying SKU availability', 500);
  }
}

/**
 * POST /api/admin/products/sku
 * Suggests an available, unique, standardized SKU for a given product name & category.
 */
export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const categorySlug = body.categorySlug ? String(body.categorySlug).trim() : null;
    const excludeId = Number(body.excludeId || body.id || -1);

    if (!name) {
      return err('Product name is required to generate a SKU', 400);
    }

    let candidate = suggestSku(name, categorySlug);
    let counter = 1;

    // Ensure candidate is strictly unique against existing products
    while (true) {
      const existing = db
        .prepare('SELECT id FROM products WHERE lower(sku) = lower(?) AND id != ?')
        .get(candidate, excludeId);

      if (!existing) {
        break;
      }

      counter++;
      const suffix = counter < 10 ? `0${counter}` : String(counter);
      candidate = `${suggestSku(name, categorySlug)}-${suffix}`;
    }

    return ok({
      suggestedSku: candidate,
      available: true,
    });
  } catch (e: any) {
    return err(e?.message || 'Error generating suggested SKU', 400);
  }
}
