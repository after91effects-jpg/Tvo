import {
  isAdminRole,
  isSuperAdmin,
  isStaffRole,
  can,
} from '../auth';
import { isValidRole } from '../permissions';

describe('auth.ts', () => {
  describe('isAdminRole', () => {
    it('should return true for admin roles including festival_manager', () => {
      expect(isAdminRole('super_admin')).toBe(true);
      expect(isAdminRole('admin')).toBe(true);
      expect(isAdminRole('festival_manager')).toBe(true);
      expect(isAdminRole('marketing_manager')).toBe(true);
      expect(isAdminRole('catalog_manager')).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(isAdminRole('read_only')).toBe(false);
      expect(isAdminRole('staff')).toBe(false);
      expect(isAdminRole('customer')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isAdminRole(undefined)).toBe(false);
      expect(isAdminRole('invalid')).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true only for super_admin', () => {
      expect(isSuperAdmin('super_admin')).toBe(true);
      expect(isSuperAdmin('admin')).toBe(false);
      expect(isSuperAdmin('festival_manager')).toBe(false);
    });
  });

  describe('isStaffRole', () => {
    it('should return true for staff', () => {
      expect(isStaffRole('staff')).toBe(true);
    });

    it('should return true for admin roles', () => {
      expect(isStaffRole('admin')).toBe(true);
      expect(isStaffRole('festival_manager')).toBe(true);
    });

    it('should return false for customer and read_only', () => {
      expect(isStaffRole('customer')).toBe(false);
      expect(isStaffRole('read_only')).toBe(false);
    });
  });

  describe('can', () => {
    it('should return true for admin roles on non-restricted permissions', () => {
      expect(can('admin', 'view_dashboard')).toBe(true);
      expect(can('festival_manager', 'manage_festivals')).toBe(true);
    });

    it('should return false for admin roles on restricted permissions', () => {
      expect(can('admin', 'manage_roles')).toBe(false);
      expect(can('festival_manager', 'run_migration')).toBe(false);
    });

    it('should return true for super_admin on restricted permissions', () => {
      expect(can('super_admin', 'manage_roles')).toBe(true);
    });

    it('should check specific permissions for non-admin roles', () => {
      expect(can('customer', 'view_dashboard')).toBe(false);
      expect(can('customer', 'manage_festivals')).toBe(false);
    });

    it('should return false for invalid role', () => {
      expect(can('invalid' as any, 'view_dashboard')).toBe(false);
    });
  });

  describe('isValidRole', () => {
    it('should return true for all canonical roles', () => {
      expect(isValidRole('festival_manager')).toBe(true);
      expect(isValidRole('super_admin')).toBe(true);
      expect(isValidRole('customer')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('invalid')).toBe(false);
      expect(isValidRole('')).toBe(false);
    });
  });
});
