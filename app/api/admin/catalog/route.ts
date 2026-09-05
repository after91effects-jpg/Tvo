import { ok, err, getCurrentUser, isAdminRole } from '../../../../lib/server/api';
import {
  getAllTaxonomy, saveCategory, deleteCategory, saveTag, deleteTag,
  saveBrand, deleteBrand, saveAttribute, deleteAttribute,
  saveAttributeTerm, deleteAttributeTerm, saveAddon, deleteAddon, getDeliveryConfig,
} from '../../../../lib/server/admin-taxonomy';

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
  const type = url.searchParams.get('type') || 'all';
  if (type === 'delivery') {
    const id = Number(url.searchParams.get('id'));
    try { return ok({ delivery: getDeliveryConfig(id) }); } catch (e: any) { return err(e.message, 404); }
  }
  try {
    const data = getAllTaxonomy();
    if (type !== 'all') return ok({ [type]: data[type] ?? {} });
    return ok(data);
  } catch (e: any) {
    return err(e.message, 500);
  }
}

export async function POST(req: Request) {
  const user = requireAdminLocal(req);
  if (!user) return err('Admin access required', 403);
  const body = await req.json().catch(() => ({}));
  const type = body.type;
  const action = body.action;
  try {
    switch (type) {
      case 'categories':
        if (action === 'delete') { const r = deleteCategory(Number(body.id), user); return ok(r); }
        { const r = saveCategory(body, user); return ok(r); }
      case 'tags':
        if (action === 'delete') { const r = deleteTag(Number(body.id), user); return ok(r); }
        { const r = saveTag(body, user); return ok(r); }
      case 'brands':
        if (action === 'delete') { const r = deleteBrand(Number(body.id), user); return ok(r); }
        { const r = saveBrand(body, user); return ok(r); }
      case 'attributes':
        if (action === 'delete') { const r = deleteAttribute(Number(body.id), user); return ok(r); }
        { const r = saveAttribute(body, user); return ok(r); }
      case 'attribute_terms':
        if (action === 'delete') { const r = deleteAttributeTerm(Number(body.id), user); return ok(r); }
        { const r = saveAttributeTerm(body, user); return ok(r); }
      case 'addons':
        if (action === 'delete') { const r = deleteAddon(Number(body.id), user); return ok(r); }
        { const r = saveAddon(body, user); return ok(r); }
      default:
        return err('Unknown type');
    }
  } catch (e: any) {
    return err(e.message, body.id || action === 'delete' ? 400 : 400);
  }
}