import { ok, err, getCurrentUser, isAdminRole, slugify } from '../../../../lib/server/api';
import {
  listProducts, getProduct, upsertProduct, quickEdit, duplicateProduct,
  setStatus, deletePermanently, bulkAction,
} from '../../../../lib/server/admin-catalog';

export const runtime = 'nodejs';

function requireAdminLocal(req: Request) {
  const user = getCurrentUser(req);
  if (!user || !isAdminRole(user.role)) return null;
  return user;
}

export async function GET(req: Request) {
  const user = requireAdminLocal(req);
  if (!user) return err('Admin access required', 403);
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const id = params.id ? Number(params.id) : null;

  // Legacy single-product fetch support
  if (id) {
    if (params.fetch === 'one') return ok({ product: getProduct(id) });
  }

  try {
    const data = listProducts(params);
    return ok(data);
  } catch (e: any) {
    return err(e.message, 500);
  }
}

// Legacy action aliases used by the older single-page admin
function asLegacyAction(body: any): boolean {
  if (body.action === 'toggle_publish') { setStatus({ id: body.id, status: body.published ? 'publish' : 'draft' }, null); return true; }
  if (body.action === 'delete') { setStatus({ id: body.id, status: 'trash' }, null); return true; }
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
    const r = upsertProduct(structured, null);
    return true;
  }
  return false;
}

export async function POST(req: Request) {
  const user = requireAdminLocal(req);
  if (!user) return err('Admin access required', 403);
  const body = await req.json().catch(() => ({}));

  try {
    if (asLegacyAction(body)) return ok({ ok: true });

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
        const r = bulkAction({ ...body, subaction: body.bulkAction || body.action2 }, user);
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