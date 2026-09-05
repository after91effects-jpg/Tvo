'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useLocalStorageJSON } from '../lib/useLocalStorage';

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
    },
    [setWishlist]
  );

  const removeFromWishlist = useCallback(
    (productId: string) => {
      setWishlist((prev) => {
        const safe = Array.isArray(prev) ? prev : [];
        return safe.filter((id) => id !== productId);
      });
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
      return isAdded;
    },
    [setWishlist]
  );

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, [setWishlist]);

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
