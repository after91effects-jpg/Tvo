'use client';

import { UserProfile, UserRole } from './types';
import { useLocalStorageJSON } from './useLocalStorage';

const AUTH_STORAGE_KEY = 'tvoflavours_auth_user';
const AUTH_TOKEN_KEY = 'tvoflavours_auth_token';

interface LocalAuthUser {
  uid: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string;
  phone?: string;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + Date.now().toString(36);
}

function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}

function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getStoredUsers(): LocalAuthUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('tvoflavours_users');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveUsers(users: LocalAuthUser[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('tvoflavours_users', JSON.stringify(users));
  } catch (e) {
    console.warn('Could not save users:', e);
  }
}

export function findUserByEmail(email: string): LocalAuthUser | null {
  const users = getStoredUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function findUserByUid(uid: string): LocalAuthUser | null {
  const users = getStoredUsers();
  return users.find(u => u.uid === uid) || null;
}

export function createLocalUser(
  name: string,
  email: string,
  password: string,
  role: UserRole = 'customer'
): { success: boolean; error?: string; user?: LocalAuthUser } {
  const existing = findUserByEmail(email);
  if (existing) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const uid = 'user_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const now = new Date().toISOString();
  const user: LocalAuthUser = {
    uid,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    name,
    role,
    createdAt: now,
    lastLoginAt: now,
  };

  const users = getStoredUsers();
  users.push(user);
  saveUsers(users);

  return { success: true, user };
}

export function verifyLocalUser(email: string, password: string): { success: boolean; error?: string; user?: LocalAuthUser } {
  const user = findUserByEmail(email);
  if (!user) {
    return { success: false, error: 'Invalid email or password.' };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return { success: false, error: 'Invalid email or password.' };
  }

  user.lastLoginAt = new Date().toISOString();
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.uid === user.uid);
  if (idx >= 0) users[idx] = user;
  saveUsers(users);

  return { success: true, user };
}

export function updateLocalUserProfile(uid: string, name: string, phone?: string): { success: boolean; error?: string } {
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.uid === uid);
  if (idx < 0) return { success: false, error: 'User not found.' };

  users[idx].name = name;
  if (phone) users[idx].phone = phone;
  saveUsers(users);
  return { success: true };
}

export function getCurrentLocalUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token || !userData) return null;
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

export function setLocalAuthSession(user: UserProfile, token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (e) {
    console.warn('Could not set auth session:', e);
  }
}

export function clearLocalAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (e) {
    console.warn('Could not clear auth session:', e);
  }
}

export function isLocalAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(AUTH_TOKEN_KEY) && !!localStorage.getItem(AUTH_STORAGE_KEY);
}

export function getLocalAuthSession(): { user: UserProfile | null; token: string | null } {
  if (typeof window === 'undefined') return { user: null, token: null };
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token || !userData) return { user: null, token: null };
    return { user: JSON.parse(userData), token };
  } catch {
    return { user: null, token: null };
  }
}

export function getLocalAdminUser(uid: string): { name: string; role: UserRole } | null {
  if (typeof window === 'undefined') return null;
  try {
    const users = getStoredUsers();
    const user = users.find(u => u.uid === uid);
    if (!user) return null;
    if (user.role === 'admin' || user.role === 'staff') {
      return { name: user.name, role: user.role };
    }
    return null;
  } catch {
    return null;
  }
}

export function initializeDefaultUsers(): void {
  if (typeof window === 'undefined') return;
  const users = getStoredUsers();
  if (users.length > 0) return;

  const now = new Date().toISOString();
  const defaultUsers: LocalAuthUser[] = [
    {
      uid: 'user_admin',
      email: 'admin@tvoflavours.com',
      passwordHash: hashPassword('admin123'),
      name: 'Admin User',
      role: 'admin',
      createdAt: now,
      lastLoginAt: now,
    },
    {
      uid: 'user_staff',
      email: 'staff@tvoflavours.com',
      passwordHash: hashPassword('staff123'),
      name: 'Staff User',
      role: 'staff',
      createdAt: now,
      lastLoginAt: now,
    },
  ];

  saveUsers(defaultUsers);
}

export function getLocalAuthInit(): () => void {
  initializeDefaultUsers();
  return () => {};
}

export function useLocalAuth() {
  const [user, setUser] = useLocalStorageJSON<UserProfile | null>(AUTH_STORAGE_KEY, null);

  const login = async (email: string, password: string) => {
    const result = verifyLocalUser(email, password);
    if (result.success && result.user) {
      const profile: UserProfile = {
        uid: result.user.uid,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        phone: result.user.phone,
        lastLogin: result.user.lastLoginAt,
        createdAt: result.user.createdAt,
      };
      const token = generateToken();
      setLocalAuthSession(profile, token);
      setUser(profile);
      return { success: true };
    }
    return { success: false, error: result.error || 'Login failed.' };
  };

  const register = async (name: string, email: string, password: string) => {
    const result = createLocalUser(name, email, password, 'customer');
    if (result.success && result.user) {
      const profile: UserProfile = {
        uid: result.user.uid,
        name: result.user.name,
        email: result.user.email,
        role: 'customer',
        lastLogin: result.user.lastLoginAt,
        createdAt: result.user.createdAt,
      };
      const token = generateToken();
      setLocalAuthSession(profile, token);
      setUser(profile);
      return { success: true };
    }
    return { success: false, error: result.error || 'Registration failed.' };
  };

  const logout = async () => {
    clearLocalAuthSession();
    setUser(null);
  };

  const updateProfile = async (name: string, phone?: string) => {
    if (!user) return { success: false, error: 'Not authenticated.' };
    const result = updateLocalUserProfile(user.uid, name, phone);
    if (result.success) {
      const updated: UserProfile = { ...user, name, phone };
      setLocalAuthSession(updated, localStorage.getItem(AUTH_TOKEN_KEY) || '');
      setUser(updated);
    }
    return result;
  };

  return {
    user,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
  };
}

export type { LocalAuthUser };