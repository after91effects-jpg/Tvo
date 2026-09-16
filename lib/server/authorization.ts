import { hasPermission, can, ADMIN_ROLES, isValidRole, type Permission, type Role } from './permissions';
import type { UserProfile } from '../types';

export function isAdmin(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return isValidRole(user.role as Role) && ADMIN_ROLES.includes(user.role as Role);
}

export function isSuperAdmin(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'super_admin';
}

export function isStaff(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'staff' || isAdmin(user);
}

export function hasPerm(user: UserProfile | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return can(user.role as Role, permission);
}

export function hasAnyPerms(user: UserProfile | null | undefined, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some((p) => can(user.role as Role, p));
}
