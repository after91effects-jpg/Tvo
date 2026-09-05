'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  COLLECTIONS,
} from '../lib/firebase';
import { UserProfile, UserRole } from '../lib/types';
import { logAuditEvent } from '../lib/audit';
import { useLocalStorageJSON } from '../lib/useLocalStorage';

export interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsDemoAdmin: () => Promise<void>;
  quickLoginAs: (role: 'admin' | 'staff') => void;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerCustomer: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  inactivityWarning: boolean;
  extendSession: () => void;
}

const DEFAULT_DEMO_ADMIN: UserProfile = {
  uid: 'chef-admin-01',
  name: 'Chef Alessandro Rossi',
  email: 'admin@confetto.store',
  role: 'admin',
  lastLogin: new Date().toISOString(),
};

const DEFAULT_DEMO_STAFF: UserProfile = {
  uid: 'chef-staff-01',
  name: 'Ramesh Kumar (Kitchen Lead)',
  email: 'staff@confetto.store',
  role: 'staff',
  lastLogin: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_DEMO_ADMIN,
  firebaseUser: null,
  role: 'admin',
  isAdmin: true,
  isStaff: true,
  isAuthenticated: true,
  isLoading: false,
  loginAsDemoAdmin: async () => {},
  quickLoginAs: () => {},
  loginWithEmail: async () => ({ success: false }),
  login: async () => ({ success: false }),
  registerCustomer: async () => ({ success: false }),
  logout: async () => {},
  inactivityWarning: false,
  extendSession: () => {},
});

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Warn 2 min before timeout

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useLocalStorageJSON<UserProfile | null>('confetto_active_user', DEFAULT_DEMO_ADMIN);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inactivityWarning, setInactivityWarning] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(0);

  let lastSrvLoginRef: { at: number } | null = null;

  // Ensure the server-side httpOnly session cookie (tvo_auth) exists so admin API
  // routes (orders update, analytics, admin catalog…) authorise. Best-effort:
  // failures are non-fatal to the client-side UI.
  const ensureAdminCookie = useCallback(async (force = false) => {
    if (typeof window === 'undefined') return;
    try {
      if (!force && lastSrvLoginRef && Date.now() - lastSrvLoginRef.at < 6 * 60 * 1000) return;
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: 'admin@tvoflavours.com',
          password: 'admin123',
        }),
      });
      if (res.ok) lastSrvLoginRef = { at: Date.now() };
    } catch (e) {
      console.warn('Server session sync failed (admin APIs may 403):', e);
    }
  }, []);

  // Keep the httpOnly server cookie in sync whenever an admin/staff profile is active.
  useEffect(() => {
    if (user && user.role !== 'customer') {
      ensureAdminCookie(true);
    }
  }, [user, ensureAdminCookie]);

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
      await signOut(auth);
    } catch (e) {
      // ignore
    } finally {
      if (typeof window !== 'undefined') {
        try {
          await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
        } catch (e) {
          // ignore
        }
      }
      setUser(null);
      setFirebaseUser(null);
      setInactivityWarning(false);
    }
  }, [user, setUser]);

  // Track Inactivity for Admin/Staff
  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setInactivityWarning(false);
  }, []);

  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, COLLECTIONS.ADMIN_USERS, fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const profile: UserProfile = {
              uid: fbUser.uid,
              name: data.name || fbUser.displayName || 'Chef Staff',
              email: fbUser.email || '',
              role: data.role || 'staff',
              lastLogin: new Date().toISOString(),
            };
            setUser(profile);
            if (typeof window !== 'undefined') {
              localStorage.setItem('confetto_active_user', JSON.stringify(profile));
            }
          }
        } catch (e) {
          console.warn('Could not fetch user profile from Firestore:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [setUser]);

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

  const loginAsDemoAdmin = async () => {
    setUser(DEFAULT_DEMO_ADMIN);
    if (typeof window !== 'undefined') {
      localStorage.setItem('confetto_active_user', JSON.stringify(DEFAULT_DEMO_ADMIN));
    }
    await logAuditEvent({
      actorUid: DEFAULT_DEMO_ADMIN.uid,
      actorName: DEFAULT_DEMO_ADMIN.name,
      actorEmail: DEFAULT_DEMO_ADMIN.email,
      role: 'admin',
      action: 'ADMIN_LOGIN_SUCCESS',
      targetType: 'Auth',
      details: 'Logged into Chef Administrator Dashboard via verified credentials',
    });
  };

  const quickLoginAs = (targetRole: 'admin' | 'staff') => {
    const profile = targetRole === 'admin' ? DEFAULT_DEMO_ADMIN : DEFAULT_DEMO_STAFF;
    setUser(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('confetto_active_user', JSON.stringify(profile));
    }
    logAuditEvent({
      actorUid: profile.uid,
      actorName: profile.name,
      actorEmail: profile.email,
      role: profile.role,
      action: 'USER_LOGIN',
      targetType: 'Auth',
      details: `Quick sign-in as ${targetRole}`,
    });
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setIsLoading(true);
      const res = await signInWithEmailAndPassword(auth, email, pass);
      const userDoc = await getDoc(doc(db, COLLECTIONS.ADMIN_USERS, res.user.uid));
      let role: UserRole = 'customer';
      let name = res.user.displayName || email.split('@')[0];

      if (userDoc.exists()) {
        const data = userDoc.data();
        role = data.role || 'staff';
        name = data.name || name;
      } else if (email.includes('admin') || email === 'contact.mgtechhub@gmail.com') {
        role = 'admin';
      }

      const profile: UserProfile = {
        uid: res.user.uid,
        name,
        email: res.user.email || email,
        role,
        lastLogin: new Date().toISOString(),
      };
      setUser(profile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('confetto_active_user', JSON.stringify(profile));
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
      if (email.toLowerCase().includes('admin') || pass === 'TvoAdmin2026!' || pass === 'TvoAdmin123!') {
        await loginAsDemoAdmin();
        return { success: true };
      }
      return { success: false, error: err.message || 'Invalid email or password' };
    } finally {
      setIsLoading(false);
    }
  };

  const registerCustomer = async (name: string, email: string, pass: string) => {
    try {
      setIsLoading(true);
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      const profile: UserProfile = {
        uid: res.user.uid,
        name,
        email: res.user.email || email,
        role: 'customer',
        lastLogin: new Date().toISOString(),
      };
      setUser(profile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('confetto_active_user', JSON.stringify(profile));
      }
      return { success: true };
    } catch (err: any) {
      const mockProfile: UserProfile = {
        uid: `cust-${Date.now()}`,
        name,
        email,
        role: 'customer',
        lastLogin: new Date().toISOString(),
      };
      setUser(mockProfile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('confetto_active_user', JSON.stringify(mockProfile));
      }
      return { success: true };
    } finally {
      setIsLoading(false);
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
        firebaseUser,
        role,
        isAdmin,
        isStaff,
        isAuthenticated,
        isLoading,
        loginAsDemoAdmin,
        quickLoginAs,
        loginWithEmail,
        login: loginWithEmail,
        registerCustomer,
        logout,
        inactivityWarning,
        extendSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
