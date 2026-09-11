'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
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
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerCustomer: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  updateCustomerProfile: (name: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  inactivityWarning: boolean;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  role: 'customer',
  isAdmin: false,
  isStaff: false,
  isAuthenticated: false,
  isLoading: false,
  loginWithEmail: async () => ({ success: false }),
  login: async () => ({ success: false }),
  registerCustomer: async () => ({ success: false }),
  updateCustomerProfile: async () => ({ success: false }),
  logout: async () => {},
  inactivityWarning: false,
  extendSession: () => {},
});

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Warn 2 min before timeout

// Persistent customer profile store (Firestore `customerProfiles/{uid}`). Unlike
// the stale-able localStorage blob, this survives browser clears and works across
// devices, and it is the source of truth for the customer's display name & phone.
async function readCustomerProfile(fbUser: User): Promise<{ name?: string; phone?: string; createdAt?: string } | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.CUSTOMER_PROFILES, fbUser.uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    const createdAt =
      d.createdAt && typeof (d.createdAt as any).toDate === 'function'
        ? (d.createdAt as any).toDate().toISOString()
        : d.createdAt
        ? String(d.createdAt)
        : undefined;
    return { name: d.name || undefined, phone: d.phone || undefined, createdAt };
  } catch (e) {
    console.warn('Could not read customer profile:', e);
    return null;
  }
}

async function writeCustomerProfile(
  fbUser: User,
  data: { name: string; email: string; phone?: string; createdAt?: string }
) {
  try {
    await setDoc(
      doc(db, COLLECTIONS.CUSTOMER_PROFILES, fbUser.uid),
      {
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Could not persist customer profile:', e);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useLocalStorageJSON<UserProfile | null>('confetto_active_user', null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inactivityWarning, setInactivityWarning] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(0);

  // localStorage is never a privilege source: a stored admin/staff profile may
  // be stale, forged, or a legacy demo session, so a privileged role is only
  // trusted when an active Firebase user backs it. When no Firebase session is
  // present, clear any stored admin/staff profile on mount.
  useEffect(() => {
    if (firebaseUser) return;
    if (!user || user.role === 'customer') return;
    setUser(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('confetto_active_user');
      } catch (e) {
        // ignore
      }
    }
  }, [user, firebaseUser, setUser]);

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
          } else {
            // Customer: restore a persisted profile so a session survives the
            // localStorage blob being cleared without forcing a full re-login.
            const customerData = await readCustomerProfile(fbUser);
            if (customerData) {
              const profile: UserProfile = {
                uid: fbUser.uid,
                name: customerData.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Customer',
                email: fbUser.email || '',
                role: 'customer',
                phone: customerData.phone || undefined,
                createdAt: customerData.createdAt,
                lastLogin: new Date().toISOString(),
              };
              setUser(profile);
              if (typeof window !== 'undefined') {
                localStorage.setItem('confetto_active_user', JSON.stringify(profile));
              }
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
      }

      const profile: UserProfile = {
        uid: res.user.uid,
        name,
        email: res.user.email || email,
        role,
        lastLogin: new Date().toISOString(),
      };

      if (profile.role === 'customer') {
        const customerData = await readCustomerProfile(res.user);
        if (customerData) {
          profile.name = customerData.name || profile.name;
          profile.phone = customerData.phone;
          profile.createdAt = customerData.createdAt || new Date().toISOString();
        } else {
          await writeCustomerProfile(res.user, {
            name: profile.name,
            email: profile.email,
            phone: '',
            createdAt: new Date().toISOString(),
          });
        }
      }
      setUser(profile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('confetto_active_user', JSON.stringify(profile));
      }

      // Best-effort server session sync using the credentials the user supplied.
      // Only succeeds for accounts present in the SQLite users table; never uses
      // hardcoded/admin credentials. Failure is non-fatal.
      if (typeof window !== 'undefined') {
        try {
          await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', email, password: pass }),
          });
        } catch (e) {
          // ignore
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
        createdAt: new Date().toISOString(),
      };
      await writeCustomerProfile(res.user, {
        name: profile.name,
        email: profile.email,
        phone: '',
        createdAt: profile.createdAt,
      });
      setUser(profile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('confetto_active_user', JSON.stringify(profile));
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateCustomerProfile = async (name: string, phone?: string) => {
    if (!user || !firebaseUser) {
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
      await updateProfile(firebaseUser, { displayName: trimmedName });
      await writeCustomerProfile(firebaseUser, {
        name: trimmedName,
        email: user.email,
        phone: trimmedPhone,
        createdAt: user.createdAt || new Date().toISOString(),
      });
      const updated: UserProfile = {
        ...user,
        name: trimmedName,
        phone: trimmedPhone || undefined,
        createdAt: user.createdAt || new Date().toISOString(),
      };
      setUser(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('confetto_active_user', JSON.stringify(updated));
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile.' };
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
        loginWithEmail,
        login: loginWithEmail,
        registerCustomer,
        updateCustomerProfile,
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
