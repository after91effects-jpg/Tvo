import { businessDateSql } from '../../../../lib/server/business-date';
import { db, ok, err, requireAdmin } from '../../../../lib/server/api';
import { hasPermission, type Permission } from '../../../../lib/server/permissions';
import { PRODUCT_BASE_SELECT, serializeProduct } from '../../../../lib/server/product-serializer';
import { validateReportDates } from '../../../../lib/server/reporting';

export const runtime = 'nodejs';
export async function GET(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || '';
  const permissions: Record<string, Permission> = { orders: 'view_orders', customers: 'view_customers', products: 'view_products' };
  if (!permissions[type]) return err('Unknown export type', 400);
  if (!hasPermission(user.role, permissions[type]) || !hasPermission(user.role, type === 'products' ? 'export_products' : 'export_reports')) return err('Export permission required', 403);
  try {
    if (type === 'products') return ok({ products: db.prepare(`${PRODUCT_BASE_SELECT} WHERE p.deleted_at IS NULL ORDER BY p.id`).all().map(serializeProduct) });
    if (type === 'customers') return ok({ customers: db.prepare('SELECT id,name,email,phone,group_name,total_spend,order_count,created_at,notes FROM customers ORDER BY id').all() });
    const start = url.searchParams.get('startDate') || '';
    const end = url.searchParams.get('endDate') || '';
    validateReportDates(start, end);
    const clauses: string[] = []; const params: string[] = [];
    if (start) { clauses.push(`${businessDateSql('created_at')}>=date(?)`); params.push(start); }
    if (end) { clauses.push(`${businessDateSql('created_at')}<=date(?)`); params.push(end); }
    return ok({ orders: db.prepare(`SELECT * FROM orders ${clauses.length ? 'WHERE '+clauses.join(' AND ') : ''} ORDER BY id`).all(...params) });
  } catch (e) { return err(e instanceof Error ? e.message : 'Export failed', 400); }
}
