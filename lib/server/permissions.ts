import type { UserRole } from '../types';

export type Permission =
  | 'view_dashboard'
  | 'view_products'
  | 'create_products'
  | 'edit_products'
  | 'archive_products'
  | 'publish_products'
  | 'export_products'
  | 'bulk_edit_products'
  | 'view_categories'
  | 'create_categories'
  | 'edit_categories'
  | 'reorder_categories'
  | 'archive_categories'
  | 'view_seo'
  | 'edit_seo'
  | 'manage_redirects'
  | 'manage_sitemap'
  | 'manage_schema'
  | 'view_inventory'
  | 'edit_inventory'
  | 'adjust_inventory'
  | 'view_recipes'
  | 'create_recipes'
  | 'edit_recipes'
  | 'manage_production'
  | 'view_orders'
  | 'edit_orders'
  | 'update_order_status'
  | 'cancel_orders'
  | 'view_customers'
  | 'edit_customers'
  | 'view_payments'
  | 'manage_refunds'
  | 'view_delivery'
  | 'manage_delivery'
  | 'manage_delivery_zones'
  | 'manage_delivery_slots'
  | 'manage_drivers'
  | 'manage_festivals'
  | 'manage_campaigns'
  | 'manage_coupons'
  | 'manage_hampers'
  | 'view_media'
  | 'upload_media'
  | 'edit_media'
  | 'delete_media'
  | 'view_reviews'
  | 'moderate_reviews'
  | 'reply_reviews'
  | 'manage_storefront'
  | 'publish_storefront'
  | 'import_woocommerce'
  | 'export_woocommerce'
  | 'run_migration'
  | 'view_migration'
  | 'create_backup'
  | 'restore_backup'
  | 'view_reports'
  | 'export_reports'
  | 'view_admin_users'
  | 'manage_admin_users'
  | 'manage_roles'
  | 'manage_system_settings'
  | 'view_system_health'
  | 'view_audit_logs'
  | '*'
export type Role = UserRole;

export interface RoleDefinition {
  name: string
  permissions: Permission[]
  description: string
}

export const ROLES: Record<Role, RoleDefinition> = {
  super_admin: {
    name: 'Super Admin',
    description: 'Full system access including user management, system configuration, and all operations',
    permissions: ['*'],
  },
  admin: {
    name: 'Admin',
    description: 'Broad operational access across all admin modules; irreversible system actions restricted',
    permissions: [
      'view_dashboard',
      'view_products', 'create_products', 'edit_products', 'archive_products', 'publish_products', 'export_products', 'bulk_edit_products',
      'view_categories', 'create_categories', 'edit_categories', 'reorder_categories', 'archive_categories',
      'view_seo', 'edit_seo', 'manage_redirects', 'manage_sitemap', 'manage_schema',
      'view_inventory', 'edit_inventory', 'adjust_inventory',
      'view_recipes', 'create_recipes', 'edit_recipes', 'manage_production',
      'view_orders', 'edit_orders', 'update_order_status',
      'view_customers', 'edit_customers',
      'view_payments', 'manage_refunds',
      'view_delivery', 'manage_delivery', 'manage_delivery_zones', 'manage_delivery_slots', 'manage_drivers',
      'manage_festivals', 'manage_campaigns', 'manage_coupons', 'manage_hampers', 'manage_storefront', 'publish_storefront',
      'view_media', 'upload_media', 'edit_media', 'delete_media',
      'view_reviews', 'moderate_reviews', 'reply_reviews',
      'import_woocommerce', 'export_woocommerce',
      'view_reports', 'export_reports',
      'view_system_health',
      'view_migration',
      'view_audit_logs',
    ],
  },
  catalog_manager: {
    name: 'Catalog Manager',
    description: 'Manage products, categories, catalog media, and relevant inventory visibility',
    permissions: [
      'view_dashboard',
      'view_products', 'create_products', 'edit_products', 'archive_products', 'publish_products', 'export_products', 'bulk_edit_products',
      'view_categories', 'create_categories', 'edit_categories', 'reorder_categories', 'archive_categories',
      'view_media', 'upload_media', 'edit_media',
      'view_inventory',
      'view_reports',
    ],
  },
  seo_manager: {
    name: 'SEO Manager',
    description: 'Manage SEO, redirects, sitemap, structured data, and internal linking',
    permissions: [
      'view_dashboard',
      'view_seo', 'edit_seo', 'manage_redirects', 'manage_sitemap', 'manage_schema',
      'view_reports', 'export_reports',
    ],
  },
  kitchen_manager: {
    name: 'Kitchen Manager',
    description: 'Manage orders, production, recipes, and kitchen operations',
    permissions: [
      'view_dashboard',
      'view_orders', 'edit_orders', 'update_order_status',
      'view_recipes', 'create_recipes', 'edit_recipes', 'manage_production',
      'view_inventory', 'edit_inventory', 'adjust_inventory',
      'view_reports',
    ],
  },
  delivery_manager: {
    name: 'Delivery Manager',
    description: 'Manage delivery zones, slots, drivers, and dispatch',
    permissions: [
      'view_dashboard',
      'view_delivery', 'manage_delivery', 'manage_delivery_zones', 'manage_delivery_slots', 'manage_drivers',
      'view_reports',
    ],
  },
  marketing_manager: {
    name: 'Marketing Manager',
    description: 'Manage campaigns, coupons, hampers, and storefront promotional content',
    permissions: [
      'view_dashboard',
      'manage_campaigns', 'manage_coupons', 'manage_hampers',
      'manage_storefront', 'publish_storefront',
      'view_reports', 'export_reports',
    ],
  },
  festival_manager: {
    name: 'Festival Manager',
    description: 'Full management of festivals and special days (add, edit, activate, archive, view dashboard, calendar, preview, resolution, product mapping, history)',
    permissions: [
      'view_dashboard', 'manage_festivals',
    ],
  },
  customer_support: {
    name: 'Customer Support',
    description: 'Manage customers, view orders, moderate reviews, and handle customer communication',
    permissions: [
      'view_dashboard',
      'view_customers', 'edit_customers',
      'view_orders',
      'view_reviews', 'moderate_reviews', 'reply_reviews',
      'view_reports',
    ],
  },
  media_manager: {
    name: 'Media Manager',
    description: 'Manage media library, image optimization, and image metadata',
    permissions: [
      'view_dashboard',
      'view_media', 'upload_media', 'edit_media', 'delete_media',
      'manage_storefront',
      'view_reports',
    ],
  },
  finance_manager: {
    name: 'Finance Manager',
    description: 'Manage payments, refunds, and financial reports',
    permissions: [
      'view_dashboard',
      'view_payments', 'manage_refunds',
      'view_reports', 'export_reports',
    ],
  },
  read_only: {
    name: 'Read Only / Analyst',
    description: 'View-only access to dashboard and report data',
    permissions: [
      'view_dashboard',
      'view_reports', 'export_reports',
    ],
  },
  staff: {
    name: 'Staff',
    description: 'Limited staff access for order and customer management',
    permissions: [
      'view_dashboard',
      'view_orders', 'edit_orders', 'update_order_status',
      'view_customers', 'edit_customers',
      'view_reports',
    ],
  },
  customer: {
    name: 'Customer',
    description: 'Storefront customer account',
    permissions: [],
  },
}

export const CANONICAL_ROLES: Role[] = [
  'super_admin', 'admin', 'catalog_manager', 'seo_manager', 'kitchen_manager',
  'delivery_manager', 'marketing_manager', 'festival_manager', 'customer_support',
  'media_manager', 'finance_manager', 'read_only', 'staff', 'customer',
];

export const ADMIN_ROLES: Role[] = [
  'super_admin', 'admin', 'catalog_manager', 'seo_manager', 'kitchen_manager',
  'delivery_manager', 'marketing_manager', 'customer_support', 'media_manager', 'finance_manager',
  'festival_manager',
];

export function isValidRole(role: string | undefined): role is Role {
  if (!role) return false;
  return CANONICAL_ROLES.includes(role as Role);
}

export function hasPermission(role: Role | undefined, permission: Permission | '*'): boolean {
  if (!role) return false
  const roleDef = ROLES[role]
  if (!roleDef) return false
  if (roleDef.permissions.includes('*')) return true
  if (permission === '*') return roleDef.permissions.includes('*')
  return roleDef.permissions.includes(permission)
}

export function hasAnyPermission(role: Role | undefined, permissions: (Permission | '*')[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export function getPermissionsForRole(role: Role | undefined): Permission[] | ['*'] {
  if (!role) return []
  const roleDef = ROLES[role]
  if (!roleDef) return []
  return roleDef.permissions
}

export function isAdminRole(role: Role | undefined): boolean {
  if (!role) return false
  return ADMIN_ROLES.includes(role)
}

export function isSuperAdmin(role: Role | undefined): boolean {
  return role === 'super_admin'
}

export function isStaffRole(role: Role | undefined): boolean {
  return role === 'staff' || isAdminRole(role)
}

export function can(role: Role | undefined, permission: Permission): boolean {
  if (isAdminRole(role)) {
    if (permission === 'manage_roles' || permission === 'run_migration' || permission === 'restore_backup' || permission === 'manage_system_settings' || permission === 'create_backup') {
      return role === 'super_admin'
    }
    return true
  }
  return hasPermission(role, permission)
}