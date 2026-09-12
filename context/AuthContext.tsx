'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { UserProfile, UserRole } from '../lib/types';
import { logAuditEvent } from '../lib/audit';
import { useLocalStorageJSON } from '../lib/useLocalStorage';
import {
  verifyLocalUser,
  createLocalUser,
  updateLocalUserProfile,
  getLocalAdminUser,
  initializeDefaultUsers,
  getLocalAuthSession,
  clearLocalAuthSession,
  setLocalAuthSession,
  isLocalAuthenticated,
  type LocalAuthUser,
} from '../lib/localAuth';
import { getLocalCustomerProfile, setLocalCustomerProfile } from '../lib/localCustomerProfiles';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthReady: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  registerCustomer: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  updateCustomerProfile: (name: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  inactivityWarning: boolean;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'customer',
  isAdmin: false,
  isStaff: false,
  isAuthenticated: false,
  isLoading: false,
  isAuthReady: false,
  loginWithEmail: async () => ({ success: false }),
  login: async () => ({ success: false }),
  registerCustomer: async () => ({ success: false }),
  updateCustomerProfile: async () => ({ success: false }),
  logout: async () => {},
  sendPasswordReset: async () => ({ success: false }),
  inactivityWarning: false,
  extendSession: () => {},
});

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 2 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [inactivityWarning, setInactivityWarning] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(0);

  const logout = useCallback(async () => {
    try {
      if (user) {
        await logAuditEvent({
          actorUid: user.uid,
          actorName: user.name,
          actorEmail: user.email,
          role: user.role,
          action: 'USER_LOGOUT',
          targetType: 'Auth',
          details: 'User logged out of TVO Flavours session',
        });
      }
    } catch (e) {
    } finally {
      if (typeof window !== 'undefined') {
        try {
          await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
        } catch (e) {
        }
      }
      clearLocalAuthSession();
      setUser(null);
      setInactivityWarning(false);
    }
  }, [user]);

  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setInactivityWarning(false);
  }, []);

  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    initializeDefaultUsers();

    const checkAuth = () => {
      const session = getLocalAuthSession();
      if (session && session.user) {
        setUser(session.user);
      }
      setIsAuthReady(true);
      setIsLoading(false);
    };

    checkAuth();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', checkAuth);
      return () => window.removeEventListener('storage', checkAuth);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role === 'customer') return;

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    const interval = setInterval(() => {
      if (lastActivityRef.current === 0) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        logout();
      } else if (elapsed >= INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS) {
        setInactivityWarning(true);
      } else {
        setInactivityWarning(false);
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      clearInterval(interval);
    };
  }, [user, logout]);

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setIsLoading(true);
      const result = verifyLocalUser(email, pass);
      if (!result.success || !result.user) {
        return { success: false, error: result.error || 'Invalid email or password', code: 'auth/invalid-credential' };
      }

      const localUser = result.user as any;
      const adminUser = getLocalAdminUser(localUser.uid);

      let role: UserRole = 'customer';
      let name = localUser.name;

      if (adminUser) {
        role = adminUser.role;
        name = adminUser.name;
      }

      const profile: UserProfile = {
        uid: localUser.uid,
        name,
        email: localUser.email,
        role,
        lastLogin: new Date().toISOString(),
        phone: localUser.phone,
        createdAt: localUser.createdAt,
      };

      setLocalAuthSession(profile, localUser.uid);
      setUser(profile);

      if (typeof window !== 'undefined') {
        try {
          await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', email, password: pass }),
          });
        } catch (e) {
        }
      }

      await logAuditEvent({
        actorUid: profile.uid,
        actorName: profile.name,
        actorEmail: profile.email,
        role: profile.role,
        action: 'USER_LOGIN',
        targetType: 'Auth',
        details: `User signed in with role: ${role}`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Invalid email or password', code: 'auth/invalid-credential' };
    } finally {
      setIsLoading(false);
    }
  };

  const registerCustomer = async (name: string, email: string, pass: string) => {
    try {
      setIsLoading(true);
      const result = createLocalUser(name, email, pass, 'customer');
      if (!result.success || !result.user) {
        return { success: false, error: result.error || 'Registration failed', code: 'auth/email-already-in-use' };
      }

      const localUser = result.user as any;
      const profile: UserProfile = {
        uid: localUser.uid,
        name: localUser.name,
        email: localUser.email,
        role: 'customer',
        lastLogin: new Date().toISOString(),
        createdAt: localUser.createdAt,
      };

      setLocalCustomerProfile(localUser.uid, {
        name: profile.name,
        email: profile.email,
        phone: '',
        createdAt: profile.createdAt,
      });

      setLocalAuthSession(profile, localUser.uid);
      setUser(profile);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed', code: 'auth/email-already-in-use' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateCustomerProfile = async (name: string, phone?: string) => {
    if (!user) {
      return { success: false, error: 'You must be signed in to update your profile.' };
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return { success: false, error: 'Name must be between 2 and 100 characters.' };
    }
    const trimmedPhone = (phone || '').trim();
    const phoneDigits = trimmedPhone.replace(/\D/g, '');
    if (trimmedPhone && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
      return { success: false, error: 'Please enter a valid phone number (7 to 15 digits).' };
    }
    if (trimmedName === user.name && trimmedPhone === (user.phone || '')) {
      return { success: true };
    }
    try {
      const result = updateLocalUserProfile(user.uid, trimmedName, trimmedPhone);
      if (!result.success) return result;

      const updated: UserProfile = {
        ...user,
        name: trimmedName,
        phone: trimmedPhone || undefined,
        createdAt: user.createdAt || new Date().toISOString(),
      };
      setUser(updated);
      setLocalAuthSession(updated, user.uid);

      if (typeof window !== 'undefined') {
        try {
          await logAuditEvent({
            actorUid: user.uid,
            actorName: trimmedName,
            actorEmail: user.email,
            role: user.role,
            action: 'USER_UPDATE_PROFILE',
            targetType: 'Auth',
            details: 'Customer updated their profile',
          });
        } catch (e) {
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update profile.' };
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        return { success: false, error: 'Please enter your email address.' };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return { success: false, error: 'Please enter a valid email address.' };
      }

      // Use Firebase Auth for password reset email
      const actionCodeSettings = {
        url: typeof window !== 'undefined' ? `${window.location.origin}/?view=reset` : '/?view=reset',
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, trimmedEmail, actionCodeSettings);

      return { success: true };
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-email') {
        return { success: false, error: 'Please enter a valid email address.' };
      }
      if (code === 'auth/user-not-found') {
        // Don't reveal whether user exists - generic success
        return { success: true };
      }
      if (code === 'auth/too-many-requests' || code === 'auth/network-request-failed') {
        return { success: false, error: 'Too many requests. Please try again later.' };
      }
      return { success: false, error: 'Failed to send reset email. Please try again.' };
    }
  };

  const role: UserRole = user?.role || 'customer';
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff' || role === 'admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isStaff,
        isAuthenticated,
        isLoading,
        isAuthReady,
        loginWithEmail,
        login: loginWithEmail,
        registerCustomer,
        updateCustomerProfile,
        logout,
        sendPasswordReset,
        inactivityWarning,
        extendSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);