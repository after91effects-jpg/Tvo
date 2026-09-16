import {
  CANONICAL_ROLES,
  ADMIN_ROLES,
  ROLES,
  isValidRole,
  isAdminRole,
  isSuperAdmin,
  isStaffRole,
  hasPermission,
  hasAnyPermission,
  getPermissionsForRole,
  can,
} from '../permissions';
import type { UserRole } from '../../types';

describe('permissions.ts', () => {
  describe('CANONICAL_ROLES', () => {
    it('should include all 14 canonical roles', () => {
      expect(CANONICAL_ROLES).toHaveLength(14);
      expect(CANONICAL_ROLES).toContain('super_admin');
      expect(CANONICAL_ROLES).toContain('admin');
      expect(CANONICAL_ROLES).toContain('festival_manager');
      expect(CANONICAL_ROLES).toContain('customer');
    });

    it('should match UserRole type values', () => {
      const userRoleValues: UserRole[] = [
        'super_admin', 'admin', 'catalog_manager', 'seo_manager', 'kitchen_manager',
        'delivery_manager', 'marketing_manager', 'festival_manager', 'customer_support',
        'media_manager', 'finance_manager', 'read_only', 'staff', 'customer',
      ];
      expect(userRoleValues).toHaveLength(14);
      for (const role of userRoleValues) {
        expect(CANONICAL_ROLES).toContain(role);
      }
    });
  });

  describe('ADMIN_ROLES', () => {
    it('should include festival_manager', () => {
      expect(ADMIN_ROLES).toContain('festival_manager');
    });

    it('should include all admin/manager roles but not read_only, staff, customer', () => {
      expect(ADMIN_ROLES).toContain('super_admin');
      expect(ADMIN_ROLES).toContain('admin');
      expect(ADMIN_ROLES).toContain('marketing_manager');
      expect(ADMIN_ROLES).not.toContain('read_only');
      expect(ADMIN_ROLES).not.toContain('staff');
      expect(ADMIN_ROLES).not.toContain('customer');
    });

    it('should be a subset of CANONICAL_ROLES', () => {
      for (const role of ADMIN_ROLES) {
        expect(CANONICAL_ROLES).toContain(role);
      }
    });
  });

  describe('ROLES', () => {
    it('should have definitions for all canonical roles', () => {
      for (const role of CANONICAL_ROLES) {
        expect(ROLES[role]).toBeDefined();
        expect(ROLES[role].name).toBeTruthy();
        expect(ROLES[role].permissions).toBeInstanceOf(Array);
      }
    });

    it('should have festival_manager with manage_festivals', () => {
      const fm = ROLES['festival_manager'];
      expect(fm).toBeDefined();
      expect(fm!.permissions).toContain('manage_festivals');
    });

    it('should NOT have marketing_manager with manage_festivals', () => {
      const mm = ROLES['marketing_manager'];
      expect(mm).toBeDefined();
      expect(mm!.permissions).not.toContain('manage_festivals');
    });

    it('super_admin should have wildcard permission', () => {
      expect(ROLES.super_admin.permissions).toContain('*');
    });
  });

  describe('isValidRole', () => {
    it('should return true for all canonical roles', () => {
      for (const role of CANONICAL_ROLES) {
        expect(isValidRole(role)).toBe(true);
      }
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('invalid')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
      expect(isValidRole('superadmin')).toBe(false);
      expect(isValidRole('admin ')).toBe(false);
    });
  });

  describe('isAdminRole', () => {
    it('should return true for all ADMIN_ROLES', () => {
      for (const role of ADMIN_ROLES) {
        expect(isAdminRole(role)).toBe(true);
      }
    });

    it('should return false for non-admin roles', () => {
      expect(isAdminRole('read_only')).toBe(false);
      expect(isAdminRole('staff')).toBe(false);
      expect(isAdminRole('customer')).toBe(false);
      expect(isAdminRole(undefined)).toBe(false);
    });

    it('should be consistent with ADMIN_ROLES', () => {
      for (const role of CANONICAL_ROLES) {
        expect(isAdminRole(role)).toBe(ADMIN_ROLES.includes(role));
      }
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true only for super_admin', () => {
      expect(isSuperAdmin('super_admin')).toBe(true);
      expect(isSuperAdmin('admin')).toBe(false);
      expect(isSuperAdmin('festival_manager')).toBe(false);
      expect(isSuperAdmin('customer')).toBe(false);
      expect(isSuperAdmin(undefined)).toBe(false);
    });
  });

  describe('isStaffRole', () => {
    it('should return true for staff', () => {
      expect(isStaffRole('staff')).toBe(true);
    });

    it('should return true for admin roles', () => {
      for (const role of ADMIN_ROLES) {
        expect(isStaffRole(role)).toBe(true);
      }
    });

    it('should return false for customer and read_only', () => {
      expect(isStaffRole('customer')).toBe(false);
      expect(isStaffRole('read_only')).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('super_admin should have all permissions via wildcard', () => {
      expect(hasPermission('super_admin', 'view_dashboard')).toBe(true);
      expect(hasPermission('super_admin', 'manage_festivals')).toBe(true);
      expect(hasPermission('super_admin', 'manage_roles')).toBe(true);
    });

    it('festival_manager should have manage_festivals', () => {
      expect(hasPermission('festival_manager', 'manage_festivals')).toBe(true);
    });

    it('festival_manager should NOT have manage_campaigns', () => {
      expect(hasPermission('festival_manager', 'manage_campaigns')).toBe(false);
    });

    it('marketing_manager should NOT have manage_festivals', () => {
      expect(hasPermission('marketing_manager', 'manage_festivals')).toBe(false);
    });

    it('marketing_manager should have manage_campaigns', () => {
      expect(hasPermission('marketing_manager', 'manage_campaigns')).toBe(true);
    });

    it('customer should have no permissions', () => {
      const perms = getPermissionsForRole('customer');
      expect(perms.length).toBe(0);
    });

    it('should return false for invalid role', () => {
      expect(hasPermission('not_a_real_role' as any, 'view_dashboard')).toBe(false);
      expect(hasPermission(undefined, 'view_dashboard')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if role has any of the permissions', () => {
      expect(hasAnyPermission('festival_manager', ['manage_festivals', 'manage_campaigns'])).toBe(true);
    });

    it('should return false if role has none of the permissions', () => {
      expect(hasAnyPermission('festival_manager', ['manage_campaigns', 'manage_coupons'])).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return permissions array for admin roles', () => {
      const adminPerms = getPermissionsForRole('admin');
      expect(adminPerms.length).toBeGreaterThan(10);
    });

    it('should return ["*"] for super_admin', () => {
      expect(getPermissionsForRole('super_admin')).toEqual(['*']);
    });

    it('should return [] for unknown role', () => {
      expect(getPermissionsForRole('invalid' as UserRole)).toEqual([]);
      expect(getPermissionsForRole(undefined)).toEqual([]);
    });
  });

  describe('can', () => {
    it('should return true for admin roles on most permissions', () => {
      expect(can('admin', 'view_dashboard')).toBe(true);
      expect(can('admin', 'view_products')).toBe(true);
      expect(can('admin', 'manage_festivals')).toBe(true);
    });

    it('should return false for admin roles on restricted permissions', () => {
      expect(can('admin', 'manage_roles')).toBe(false);
      expect(can('admin', 'run_migration')).toBe(false);
      expect(can('admin', 'restore_backup')).toBe(false);
      expect(can('admin', 'manage_system_settings')).toBe(false);
      expect(can('admin', 'create_backup')).toBe(false);
    });

    it('should return true for super_admin on restricted permissions', () => {
      expect(can('super_admin', 'manage_roles')).toBe(true);
      expect(can('super_admin', 'run_migration')).toBe(true);
    });

    it('should check specific permissions for non-admin roles', () => {
      expect(can('festival_manager', 'manage_festivals')).toBe(true);
      expect(can('festival_manager', 'manage_campaigns')).toBe(true);
      expect(can('marketing_manager', 'manage_campaigns')).toBe(true);
      expect(can('customer', 'view_dashboard')).toBe(false);
      expect(can('customer', 'manage_festivals')).toBe(false);
    });

    it('should return false for invalid role', () => {
      expect(can('invalid' as UserRole, 'view_dashboard')).toBe(false);
    });
  });
});
