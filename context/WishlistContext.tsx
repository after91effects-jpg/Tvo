'use client';

import React, { createContext, useContext, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLocalStorageJSON } from '../lib/useLocalStorage';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlist: string[];
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string, productName?: string) => boolean;
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

const STORAGE_KEY_WISHLIST = 'confetto_wishlist';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useLocalStorageJSON<string[]>(STORAGE_KEY_WISHLIST, []);
  const auth = useAuth();
  const user = auth?.user;
  const lastSyncedUserRef = useRef<string | null>(null);

  const isInWishlist = useCallback(
    (productId: string) => {
      return (wishlist || []).includes(productId);
    },
    [wishlist]
  );

  const addToWishlist = useCallback(
    (productId: string) => {
      setWishlist((prev) => {
        const safe = Array.isArray(prev) ? prev : [];
        if (!safe.includes(productId)) {
          return [...safe, productId];
        }
        return safe;
      });
      if (typeof window !== 'undefined') {
        fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', product_id: productId }),
        }).catch(() => {});
      }
    },
    [setWishlist]
  );

  const removeFromWishlist = useCallback(
    (productId: string) => {
      setWishlist((prev) => {
        const safe = Array.isArray(prev) ? prev : [];
        return safe.filter((id) => id !== productId);
      });
      if (typeof window !== 'undefined') {
        fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'remove', product_id: productId }),
        }).catch(() => {});
      }
    },
    [setWishlist]
  );

  const toggleWishlist = useCallback(
    (productId: string): boolean => {
      let isAdded = false;
      setWishlist((prev) => {
        const safe = Array.isArray(prev) ? prev : [];
        if (safe.includes(productId)) {
          isAdded = false;
          return safe.filter((id) => id !== productId);
        } else {
          isAdded = true;
          return [...safe, productId];
        }
      });
      if (typeof window !== 'undefined') {
        fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: isAdded ? 'add' : 'remove', product_id: productId }),
        }).catch(() => {});
      }
      return isAdded;
    },
    [setWishlist]
  );

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, [setWishlist]);

  // Reset sync tracker on logout
  useEffect(() => {
    if (!user) {
      lastSyncedUserRef.current = null;
    }
  }, [user]);

  // Synchronize with server wishlist if authenticated (bidirectional merge)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUserId = user?.uid ? String(user.uid) : user?.email ? String(user.email) : null;
    if (currentUserId && lastSyncedUserRef.current === currentUserId) {
      return; // Already synced for this session
    }

    fetch('/api/wishlist')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || data.requiresAuth) return;
        if (currentUserId) {
          lastSyncedUserRef.current = currentUserId;
        }

        const serverItems: string[] = Array.isArray(data.wishlist)
          ? data.wishlist.map((w: any) => String(w.product_id || w.productId || w.id || w))
          : [];

        let localItems = Array.isArray(wishlist) ? wishlist.map(String) : [];
        if (localItems.length === 0 && typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(STORAGE_KEY_WISHLIST);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) localItems = parsed.map(String);
            }
          } catch {
            // ignore
          }
        }
        const missingOnServer = localItems.filter((id) => !serverItems.includes(id));

        if (missingOnServer.length > 0) {
          fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync', product_ids: localItems }),
          })
            .then((syncRes) => (syncRes.ok ? syncRes.json() : null))
            .then((syncData) => {
              const merged = syncData?.wishlist && Array.isArray(syncData.wishlist)
                ? syncData.wishlist.map(String)
                : Array.from(new Set([...localItems, ...serverItems]));
              setWishlist(merged);
            })
            .catch(() => {
              setWishlist(Array.from(new Set([...localItems, ...serverItems])));
            });
        } else if (serverItems.length > 0) {
          setWishlist(Array.from(new Set([...localItems, ...serverItems])));
        }
      })
      .catch(() => {});
  }, [user?.uid, user?.email, setWishlist]);

  const value = useMemo(
    () => ({
      wishlist: wishlist || [],
      isInWishlist,
      toggleWishlist,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      wishlistCount: (wishlist || []).length,
    }),
    [wishlist, isInWishlist, toggleWishlist, addToWishlist, removeFromWishlist, clearWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
