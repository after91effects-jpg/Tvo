import { hasPermission, type Permission, type Role } from './permissions';

const reads: Record<string, Permission> = {};
const writes: Record<string, Permission> = {};
function group(map: Record<string, Permission>, permission: Permission, types: string) {
  for (const type of types.split(' ')) map[type] = permission;
}
group(reads, 'view_orders', 'orders order orders_page order_statuses custom custom_full');
group(reads, 'view_categories', 'categories');
group(reads, 'view_products', 'products_simple addons catalog_sources');
group(reads, 'view_customers', 'customers customer customers_page customers_simple tickets');
group(reads, 'view_delivery', 'delivery delivery_slots drivers deliveries slots');
group(reads, 'view_payments', 'refunds payments_ledger');
group(reads, 'manage_coupons', 'coupons coupons_full gift_cards');
group(reads, 'view_reviews', 'reviews reviews_full');
group(reads, 'manage_storefront', 'static_blocks testimonials faqs pages blog banners homepage homepage_config pages_full testimonials_full blog_full');
group(reads, 'manage_campaigns', 'email_templates');
group(reads, 'view_inventory', 'inventory_full');
group(reads, 'view_media', 'media');
group(reads, 'view_audit_logs', 'audit audit_full');
group(reads, 'manage_hampers', 'hamper_settings');
group(reads, 'manage_festivals', 'occasions occasions_all occasion_detail occasion_preview occasions_default');
group(reads, 'view_reports', 'analytics');
group(reads, 'view_system_health', 'backups');
group(reads, 'view_dashboard', 'notifications');
group(reads, 'manage_system_settings', 'settings settings_full payment_config admin_users');
group(writes, 'edit_orders', 'orders custom');
group(writes, 'edit_customers', 'customers tickets');
group(writes, 'edit_categories', 'categories');
group(writes, 'manage_coupons', 'coupons gift_cards');
group(writes, 'manage_delivery', 'delivery_slots delivery_zones pincodes blackout buffer production slot_capacity drivers');
group(writes, 'moderate_reviews', 'reviews');
group(writes, 'manage_storefront', 'banners homepage homepage_sections slides navigations static_blocks testimonials faqs pages blog');
group(writes, 'manage_campaigns', 'email_templates');
group(writes, 'edit_media', 'media');
group(writes, 'manage_hampers', 'hamper_settings');
group(writes, 'adjust_inventory', 'inventory');
group(writes, 'edit_inventory', 'ingredients');
group(writes, 'manage_festivals', 'occasions occasions_default occasion_years product_occasions');
group(writes, 'manage_refunds', 'refunds');
group(writes, 'manage_system_settings', 'settings image_optimization payment_config admin_users roles backup');

export function adminRequestPermission(method: 'GET' | 'POST', type: string, action = ''): Permission | undefined {
  if (method === 'GET') return reads[type];
  if (type === 'orders') {
    if (['status', 'update_status'].includes(action)) return 'update_order_status';
    if (['payment', 'update_payment'].includes(action)) return 'manage_payment_settings';
    if (action === 'refund') return 'refund_payments';
    if (action === 'cancel') return 'cancel_orders';
    if (action === 'delete') return 'manage_system_settings';
    if (['assign_driver', 'delivery_status'].includes(action)) return 'manage_delivery';
  }
  if (type === 'categories' && action === 'create') return 'create_categories';
  if (type === 'categories' && action === 'delete') return 'archive_categories';
  if (type === 'media' && action === 'add') return 'upload_media';
  if (type === 'media' && action === 'delete') return 'delete_media';
  if (type === 'tickets' && action === 'save_broadcast') return 'manage_campaigns';
  if (type === 'backup') return action === 'create' ? 'create_backup' : 'view_system_health';
  return writes[type];
}

export function canAccessAdminRequest(role: Role, method: 'GET' | 'POST', type: string, action = ''): boolean {
  const permission = adminRequestPermission(method, type, action);
  return !!permission && hasPermission(role, permission);
}
