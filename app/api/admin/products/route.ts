import { ok, err, requireAdmin, slugify } from '../../../../lib/server/api';
import {
  listProducts, getProduct, upsertProduct, quickEdit, duplicateProduct,
  setStatus, deletePermanently, bulkAction, getProductWithVariants, adjustProductStock, getLowStockProducts, getCategoryTree,
} from '../../../../lib/server/admin-catalog';
import { hasPermission } from '../../../../lib/server/permissions';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = requireAdmin(req);
  if (!user || !hasPermission(user.role, 'view_products')) return err('Permission denied', 403);
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
    if (params.type === 'stock-adjust') return err('Use POST to adjust inventory', 405);
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
function asLegacyAction(body: any, user: any): any {
  if (body.action === 'toggle_publish') { return setStatus({ id: body.id, status: body.published ? 'publish' : 'draft' }, user); }
  if (body.action === 'delete') { return setStatus({ id: body.id, status: 'trash' }, user); }
  if (body.action === 'create' || body.action === 'update') {
    // map legacy name-based body into the structured editor shape
    const structured = {
      ...body,
      name: body.name,
      sku: body.sku,
      slug: body.slug,
      ...(body.action === 'create' ? { published: body.published ?? 1, stock: body.stock ?? 0 } : {}),
    };
    // preserve existing SKU when omitted
    if (!structured.sku && body.id) {
      const ex = getProduct(Number(body.id));
      if (ex) structured.sku = ex.sku;
    }
    const r = upsertProduct(structured, user);
    return r;
  }
  return null;
}

export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);
  const body = await req.json().catch(() => ({}));

  const requestedAction = body.action || (body.id ? 'update' : 'create');
  const permission = ['create', 'duplicate'].includes(requestedAction) ? 'create_products'
    : ['status', 'toggle_publish'].includes(requestedAction) ? 'publish_products'
    : requestedAction === 'bulk' ? 'bulk_edit_products'
    : requestedAction === 'adjust_stock' ? 'adjust_inventory'
    : ['delete', 'delete_permanently'].includes(requestedAction) ? 'archive_products' : 'edit_products';
  if (!hasPermission(user.role, permission)) return err('Permission denied', 403);
  try {
    const legacyResult = asLegacyAction(body, user);
    if (legacyResult) return ok(legacyResult);

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