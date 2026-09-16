import {
  isAdmin,
  isSuperAdmin,
  isStaff,
  hasPerm,
  hasAnyPerms,
} from '../authorization';

describe('authorization.ts', () => {
  describe('isAdmin', () => {
    it('should return true for admin roles', () => {
      expect(isAdmin({ uid: '1', name: 'Test', email: 'test@test.com', role: 'admin' })).toBe(true);
      expect(isAdmin({ uid: '1', name: 'Test', email: 'test@test.com', role: 'super_admin' })).toBe(true);
      expect(isAdmin({ uid: '1', name: 'Test', email: 'test@test.com', role: 'festival_manager' })).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(isAdmin({ uid: '1', name: 'Test', email: 'test@test.com', role: 'customer' })).toBe(false);
      expect(isAdmin({ uid: '1', name: 'Test', email: 'test@test.com', role: 'read_only' })).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true only for super_admin', () => {
      expect(isSuperAdmin({ uid: '1', name: 'Test', email: 'test@test.com', role: 'super_admin' })).toBe(true);
      expect(isSuperAdmin({ uid: '1', name: 'Test', email: 'test@test.com', role: 'admin' })).toBe(false);
      expect(isSuperAdmin(null)).toBe(false);
    });
  });

  describe('isStaff', () => {
    it('should return true for staff', () => {
      expect(isStaff({ uid: '1', name: 'Test', email: 'test@test.com', role: 'staff' })).toBe(true);
    });

    it('should return true for admin roles', () => {
      expect(isStaff({ uid: '1', name: 'Test', email: 'test@test.com', role: 'admin' })).toBe(true);
      expect(isStaff({ uid: '1', name: 'Test', email: 'test@test.com', role: 'festival_manager' })).toBe(true);
    });

    it('should return false for customer and read_only', () => {
      expect(isStaff({ uid: '1', name: 'Test', email: 'test@test.com', role: 'customer' })).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isStaff(null)).toBe(false);
    });
  });

  describe('hasPerm', () => {
    it('should return true for admin roles on most permissions', () => {
      expect(hasPerm({ uid: '1', name: 'Test', email: 'test@test.com', role: 'admin' }, 'view_dashboard')).toBe(true);
      expect(hasPerm({ uid: '1', name: 'Test', email: 'test@test.com', role: 'admin' }, 'manage_festivals')).toBe(true);
    });

    it('should return true for super_admin on any permission', () => {
      expect(hasPerm({ uid: '1', name: 'Test', email: 'test@test.com', role: 'super_admin' }, 'manage_roles')).toBe(true);
    });

    it('should return correct permission check for non-admin roles', () => {
      expect(hasPerm({ uid: '1', name: 'Test', email: 'test@test.com', role: 'customer' }, 'view_dashboard')).toBe(false);
      expect(hasPerm({ uid: '1', name: 'Test', email: 'test@test.com', role: 'customer' }, 'manage_festivals')).toBe(false);
    });

    it('should return false for invalid role', () => {
      expect(hasPerm({ uid: '1', name: 'Test', email: 'test@test.com', role: 'invalid' as any }, 'view_dashboard')).toBe(false);
    });

    it('should return false for null user', () => {
      expect(hasPerm(null, 'view_dashboard')).toBe(false);
    });
  });

  describe('hasAnyPerms', () => {
    it('should return true if user has any permission', () => {
      expect(hasAnyPerms({ uid: '1', name: 'Test', email: 'test@test.com', role: 'festival_manager' }, ['manage_festivals', 'manage_campaigns'])).toBe(true);
    });

    it('should return false if user has none', () => {
      expect(hasAnyPerms({ uid: '1', name: 'Test', email: 'test@test.com', role: 'customer' }, ['manage_festivals', 'manage_campaigns'])).toBe(false);
    });

    it('should return false for null user', () => {
      expect(hasAnyPerms(null, ['manage_festivals'])).toBe(false);
    });
  });
});
