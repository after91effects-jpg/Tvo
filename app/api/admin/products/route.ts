import { ok, err, requireAdmin, slugify } from '../../../../lib/server/api';
import {
  listProducts, getProduct, upsertProduct, quickEdit, duplicateProduct,
  setStatus, deletePermanently, bulkAction, getProductWithVariants, adjustProductStock, getLowStockProducts, getCategoryTree,
} from '../../../../lib/server/admin-catalog';
import { hasPermission } from '../../../../lib/server/permissions';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const id = params.id ? Number(params.id) : null;

  // Legacy single-product fetch support
  if (id) {
    if (params.fetch === 'one') return ok({ product: getProduct(id) });
  }

  try {
    if (params.type === 'low-stock') return ok({ products: getLowStockProducts(Number(params.limit) || 20) });
    if (params.type === 'categories') return ok({ categories: getCategoryTree() });
    if (params.type === 'detail') {
      const id = Number(params.id);
      if (!id) return err('Product id required', 400);
      return ok({ product: getProductWithVariants(id) });
    }
    if (params.type === 'stock-adjust') {
      const productId = Number(params.productId);
      const delta = Number(params.delta);
      const reason = params.reason || 'Manual adjustment';
      if (!productId || isNaN(delta)) return err('productId and delta required', 400);
      return ok({ adjustment: adjustProductStock(productId, delta, reason, user) });
    }
    const id = params.id ? Number(params.id) : null;
    if (id) {
      if (params.fetch === 'one') return ok({ product: getProduct(id) });
    }
    const data = listProducts(params);
    return ok(data);
  } catch (e: any) {
    return err(e.message, 500);
  }
}

// Legacy action aliases used by the older single-page admin
function asLegacyAction(body: any, user: any): boolean {
  if (body.action === 'toggle_publish') { setStatus({ id: body.id, status: body.published ? 'publish' : 'draft' }, user); return true; }
  if (body.action === 'delete') { setStatus({ id: body.id, status: 'trash' }, user); return true; }
  if (body.action === 'create' || body.action === 'update') {
    // map legacy name-based body into the structured editor shape
    const structured = {
      ...body,
      name: body.name,
      sku: body.sku,
      slug: body.slug,
      images_json: body.images_json ?? '[]',
      published: body.published !== undefined ? body.published : 1,
      stock: body.stock ?? 0,
    };
    // preserve existing SKU when omitted
    if (!structured.sku && body.id) {
      const ex = getProduct(Number(body.id));
      if (ex) structured.sku = ex.sku;
    }
    const r = upsertProduct(structured, user);
    return true;
  }
  return false;
}

export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);
  const body = await req.json().catch(() => ({}));

  try {
    if (asLegacyAction(body, user)) return ok({ ok: true });

    const action = body.action || (body.id ? 'update' : 'create');
    switch (action) {
      case 'create':
      case 'update': {
        const r = upsertProduct(body, user);
        return ok(r);
      }
      case 'quick_edit': {
        const r = quickEdit(body, user);
        return ok(r);
      }
      case 'duplicate': {
        const r = duplicateProduct(Number(body.id), user);
        return ok(r);
      }
      case 'status': {
        const r = setStatus(body, user);
        return ok(r);
      }
      case 'bulk': {
        if (!hasPermission(user.role, 'bulk_edit_products')) {
          return err('Forbidden: bulk_edit_products permission required', 403);
        }
        const subaction = body.subaction || body.bulkAction || body.action2;
        if (!subaction || subaction === 'bulk') {
          return err('A valid bulk subaction is required', 400);
        }
        const r = bulkAction({ ...body, subaction }, user);
        return ok(r);
      }
      case 'adjust_stock': {
        const { productId, delta, reason } = body;
        if (!productId || delta === undefined) return err('productId and delta required', 400);
        const r = adjustProductStock(productId, Number(delta), reason || 'Manual adjustment', user);
        return ok(r);
      }
      case 'delete_permanently': {
        const r = deletePermanently(Number(body.id), user);
        return ok(r);
      }
      default:
        return err('Unknown action');
    }
  } catch (e: any) {
    return err(e.message, 400);
  }
}