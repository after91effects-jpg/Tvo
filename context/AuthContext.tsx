'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { UserProfile, UserRole } from '../lib/types';
import { logAuditEvent } from '../lib/audit';
import { useLocalStorageJSON } from '../lib/useLocalStorage';
import {
  createLocalUser,
  updateLocalUserProfile,
  initializeDefaultUsers,
  getLocalAuthSession,
  clearLocalAuthSession,
  setLocalAuthSession,
  isLocalAuthenticated,
  type LocalAuthUser,
} from '../lib/localAuth';
import { getLocalCustomerProfile, setLocalCustomerProfile } from '../lib/localCustomerProfiles';
import { auth, firebaseCreateUser, firebaseSignIn, firebaseSignOut, firebaseUpdateProfile, firebaseGetIdToken } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ADMIN_ROLES, getPermissionsForRole, type Role } from '../lib/server/permissions';

export interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthReady: boolean;
  permissions: string[];
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  loginAdmin: (email: string, pass: string) => Promise<{ success: boolean; error?: string; code?: string }>;
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
  isSuperAdmin: false,
  isStaff: false,
  isAuthenticated: false,
  isLoading: false,
  isAuthReady: false,
  permissions: [],
  loginWithEmail: async () => ({ success: false }),
  loginAdmin: async () => ({ success: false }),
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
        // Sign out from Firebase Auth
        try {
          await firebaseSignOut();
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
      // Validate admin staff sessions against the server-side httpOnly cookie.
      // The client localStorage session is only a convenience mirror; the
      // server cookie is the source of truth for admin authorization. On a
      // stale/expired/invalid cookie the admin session is cleared so the UI
      // cannot show an admin panel that would fail server authorization.
      const syncServerSession = async () => {
        try {
          const res = await fetch('/api/auth');
          const data = await res.json().catch(() => null);
          const serverUser = data?.user || null;
          const local = getLocalAuthSession();
          const localIsStaff =
            !!local?.user &&
            ADMIN_ROLES.includes(local.user.role as Role);
          const isStaffRole = (r: string) => ADMIN_ROLES.includes(r as Role);

          if (serverUser) {
            if (isStaffRole(serverUser.role) && local?.user) {
              const synced: UserProfile = {
                ...local.user,
                name: serverUser.name,
                email: serverUser.email,
                role: serverUser.role as UserRole,
                lastLogin: new Date().toISOString(),
              };
              setUser(synced);
              setLocalAuthSession(synced, local.token || '');
            }
          } else if (localIsStaff) {
            clearLocalAuthSession();
            setUser(null);
          }
        } catch (e) {
          // Network failure: keep the local session as-is.
        }
      };

      syncServerSession();
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
      
      // Use Firebase Auth for login
      let firebaseUser: any;
      try {
        const result = await firebaseSignIn(email, pass);
        firebaseUser = result.user;
      } catch (err: any) {
        const code = err?.code || '';
        if (code === 'auth/invalid-email') {
          return { success: false, error: 'Please enter a valid email address.', code };
        }
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          return { success: false, error: 'Invalid email or password. Please try again.', code };
        }
        if (code === 'auth/too-many-requests') {
          return { success: false, error: 'Too many attempts. Please wait a moment and try again.', code };
        }
        if (code === 'auth/network-request-failed') {
          return { success: false, error: 'A network error occurred. Please check your connection and try again.', code };
        }
        return { success: false, error: err?.message || 'Invalid email or password', code };
      }

      const uid = firebaseUser.uid;
      const fbEmail = firebaseUser.email || email;
      const displayName = firebaseUser.displayName || email.split('@')[0];

      // Get customer profile from localStorage if exists
      let phone: string | undefined;
      let createdAt: string | undefined;
      const customerProfile = getLocalCustomerProfile(uid);
      if (customerProfile) {
        phone = customerProfile.phone;
        createdAt = customerProfile.createdAt;
      }

      const profile: UserProfile = {
        uid,
        name: displayName,
        email: fbEmail,
        role: 'customer',
        lastLogin: new Date().toISOString(),
        phone,
        createdAt,
      };

      setLocalAuthSession(profile, uid);
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
        details: `User signed in with role: ${profile.role}`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Invalid email or password', code: 'auth/invalid-credential' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, pass: string) => {
    try {
      setIsLoading(true);
      
      // Use Firebase Auth for login
      let firebaseUser: any;
      try {
        const result = await firebaseSignIn(email, pass);
        firebaseUser = result.user;
      } catch (err: any) {
        const code = err?.code || '';
        if (code === 'auth/invalid-email') {
          return { success: false, error: 'Please enter a valid email address.', code };
        }
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          return { success: false, error: 'Invalid email or password. Please try again.', code };
        }
        if (code === 'auth/too-many-requests') {
          return { success: false, error: 'Too many attempts. Please wait a moment and try again.', code };
        }
        if (code === 'auth/network-request-failed') {
          return { success: false, error: 'A network error occurred. Please check your connection and try again.', code };
        }
        return { success: false, error: err?.message || 'Invalid email or password', code };
      }

      // Get Firebase ID token
      const idToken = await firebaseGetIdToken();
      if (!idToken) {
        return { success: false, error: 'Failed to get authentication token', code: 'auth/token-error' };
      }

      // Call server adminLogin endpoint
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adminLogin', idToken }),
      });
      const data = await response.json();
      
      if (!response.ok || !data.admin) {
        const errorMsg = data.error || 'Admin access denied. This account is not authorized for admin access.';
        return { success: false, error: errorMsg, code: 'auth/admin-denied' };
      }

      const uid = firebaseUser.uid;
      const fbEmail = firebaseUser.email || email;
      
      const profile: UserProfile = {
        uid,
        name: data.user.name,
        email: fbEmail,
        role: data.user.role as UserRole,
        lastLogin: new Date().toISOString(),
      };

      setLocalAuthSession(profile, uid);
      setUser(profile);

      await logAuditEvent({
        actorUid: profile.uid,
        actorName: profile.name,
        actorEmail: profile.email,
        role: profile.role,
        action: 'ADMIN_LOGIN',
        targetType: 'Auth',
        details: `Admin signed in with role: ${profile.role}`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Admin login failed', code: 'auth/admin-error' };
    } finally {
      setIsLoading(false);
    }
  };

  const registerCustomer = async (name: string, email: string, pass: string) => {
    try {
      setIsLoading(true);
      
      // Use Firebase Auth for registration
      let firebaseUser: any;
      try {
        const result = await firebaseCreateUser(email, pass);
        firebaseUser = result.user;
        
        // Update the Firebase user's display name
        await firebaseUpdateProfile(firebaseUser, { displayName: name });
      } catch (err: any) {
        const code = err?.code || '';
        if (code === 'auth/email-already-in-use') {
          return { success: false, error: 'An account with this email already exists. Please sign in instead.', code };
        }
        if (code === 'auth/weak-password') {
          return { success: false, error: 'Password must be at least 6 characters.', code };
        }
        if (code === 'auth/invalid-email') {
          return { success: false, error: 'Please enter a valid email address.', code };
        }
        if (code === 'auth/network-request-failed') {
          return { success: false, error: 'A network error occurred. Please check your connection and try again.', code };
        }
        return { success: false, error: err?.message || 'Registration failed', code };
      }

      const uid = firebaseUser.uid;
      const fbEmail = firebaseUser.email || email;

      const profile: UserProfile = {
        uid,
        name,
        email: fbEmail,
        role: 'customer',
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      // Create local customer profile for additional data (phone, etc.)
      setLocalCustomerProfile(uid, {
        name: profile.name,
        email: profile.email,
        phone: '',
        createdAt: profile.createdAt,
      });

      setLocalAuthSession(profile, uid);
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
  const isAdmin = ADMIN_ROLES.includes(role as Role);
  const isSuperAdmin = role === 'super_admin';
  const isStaff = ADMIN_ROLES.includes(role as Role);
  const isAuthenticated = !!user;
  const permissions = isAdmin ? (() => {
    const p = getPermissionsForRole(role as Role);
    return p.length === 1 && p[0] === '*' ? ['*'] : p as string[];
  })() : [];

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isSuperAdmin,
        isStaff,
        isAuthenticated,
        isLoading,
        isAuthReady,
        permissions,
        loginWithEmail,
        loginAdmin,
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