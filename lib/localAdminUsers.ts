'use client';

import { UserRole } from './types';

const ADMIN_USERS_KEY = 'tvoflavours_admin_users';

export interface LocalAdminUser {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  createdAt: string;
  lastLoginAt: string;
}

function getAdminUsers(): LocalAdminUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(ADMIN_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveAdminUsers(users: LocalAdminUser[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Could not save admin users:', e);
  }
}

export function getLocalAdminUser(uid: string): LocalAdminUser | null {
  const users = getAdminUsers();
  return users.find(u => u.uid === uid) || null;
}

export function getAllLocalAdminUsers(): LocalAdminUser[] {
  return getAdminUsers();
}

export function createLocalAdminUser(
  uid: string,
  name: string,
  email: string,
  role: 'admin' | 'staff' = 'staff'
): { success: boolean; error?: string; user?: LocalAdminUser } {
  const users = getAdminUsers();
  if (users.find(u => u.uid === uid)) {
    return { success: false, error: 'Admin user with this UID already exists.' };
  }

  const now = new Date().toISOString();
  const user: LocalAdminUser = {
    uid,
    name,
    email: email.toLowerCase(),
    role,
    createdAt: now,
    lastLoginAt: now,
  };

  users.push(user);
  saveAdminUsers(users);
  return { success: true, user };
}

export function updateLocalAdminUser(
  uid: string,
  data: Partial<Pick<LocalAdminUser, 'name' | 'role'>>
): { success: boolean; error?: string } {
  const users = getAdminUsers();
  const idx = users.findIndex(u => u.uid === uid);
  if (idx < 0) return { success: false, error: 'Admin user not found.' };

  users[idx] = { ...users[idx], ...data };
  saveAdminUsers(users);
  return { success: true };
}

export function deleteLocalAdminUser(uid: string): { success: boolean; error?: string } {
  const users = getAdminUsers();
  const idx = users.findIndex(u => u.uid === uid);
  if (idx < 0) return { success: false, error: 'Admin user not found.' };

  users.splice(idx, 1);
  saveAdminUsers(users);
  return { success: true };
}

export function initializeDefaultAdminUsers(): void {
  if (typeof window === 'undefined') return;
  const users = getAdminUsers();
  if (users.length > 0) return;

  const now = new Date().toISOString();
  const defaultUsers: LocalAdminUser[] = [
    {
      uid: 'user_admin',
      name: 'Admin User',
      email: 'admin@tvoflavours.com',
      role: 'admin',
      createdAt: now,
      lastLoginAt: now,
    },
    {
      uid: 'user_staff',
      name: 'Staff User',
      email: 'staff@tvoflavours.com',
      role: 'staff',
      createdAt: now,
      lastLoginAt: now,
    },
  ];

  saveAdminUsers(defaultUsers);
}