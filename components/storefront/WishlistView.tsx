'use client';

import React, { useState } from 'react';
import {
  Heart,
  ShoppingBag,
  ArrowLeft,
  Trash2,
  Sparkles,
  CheckCircle2,
  Cake,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Product } from '../../lib/types';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { ProductCard } from './ProductCard';

interface WishlistViewProps {
  products: Product[];
  onViewProduct: (productId: string) => void;
  onNavigate: (view: string, param?: string) => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  products,
  onViewProduct,
  onNavigate,
}) => {
  const { wishlist, clearWishlist } = useWishlist();
  const { addToCart, setIsCartOpen } = useCart();
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [addedAllSuccess, setAddedAllSuccess] = useState(false);

  // Filter products matching current wishlist IDs
  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  // Calculate estimated subtotal of all wishlisted items (using their default/base weight price)
  const totalEstimatedValue = wishlistedProducts.reduce((sum, product) => {
    const defaultPrice = product.weightOptions?.[0]?.price ?? 699;
    return sum + defaultPrice;
  }, 0);

  const totalOriginalMRP = wishlistedProducts.reduce((sum, product) => {
    const defaultMRP = product.weightOptions?.[0]?.mrp ?? 849;
    return sum + defaultMRP;
  }, 0);

  const totalSavings = totalOriginalMRP - totalEstimatedValue;

  const handleAddAllToCart = () => {
    if (wishlistedProducts.length === 0) return;

    setIsAddingAll(true);

    try {
      wishlistedProducts.forEach((product) => {
        const defaultWeight = product.weightOptions?.[0] || {
          label: '0.5 kg',
          weightKg: 0.5,
          price: 699,
          mrp: 849,
        };
        const defaultFlavour = product.flavours?.[0] || 'Artisan Signature';

        addToCart(product, defaultWeight, defaultFlavour, '', [], 1);
      });

      setAddedAllSuccess(true);
      setTimeout(() => {
        setIsAddingAll(false);
        setIsCartOpen(true);
      }, 400);

      setTimeout(() => {
        setAddedAllSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error adding all wishlist items to cart:', err);
      setIsAddingAll(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-10 space-y-8 animate-in fade-in duration-200">
      {/* Navigation Breadcrumb & Back button */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <button
          id="wishlist-back-to-shop-btn"
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Artisan Cakes</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[var(--text-subtle)]">
          <span>Store</span>
          <span>/</span>
          <span className="text-[var(--primary)] font-semibold">My Favorites</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2B1425] via-[#20101C] to-[#170C15] border border-[#3E2135] p-6 sm:p-10 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3E1E34] border border-[#5A294C] text-[11px] font-bold text-[#FF85A7] uppercase tracking-wider shadow-xs">
              <Heart className="w-3.5 h-3.5 fill-[#FF85A7]" />
              <span>Saved Delicacies</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold font-display text-white tracking-tight">
              My Celebration Wishlist
            </h1>
            <p className="text-xs sm:text-sm text-[#D4C3CF] leading-relaxed">
              Your handpicked artisan cakes, bento boxes, and gourmet confections saved for upcoming birthdays, anniversaries, and midnight celebrations.
            </p>
          </div>

          {/* Quick Stats Card */}
          {wishlistedProducts.length > 0 && (
            <div className="bg-[#190D17]/80 backdrop-blur-md border border-[#482840] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 min-w-[260px] shadow-lg">
              <div className="flex items-center justify-between text-xs text-[#CDB8C6]">
                <span>Saved Cakes</span>
                <span className="font-bold text-white text-sm">{wishlistedProducts.length} Items</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#CDB8C6]">
                <span>Estimated Value</span>
                <div className="text-right">
                  <span className="font-extrabold text-[#FF457D] text-base">₹{totalEstimatedValue}</span>
                  {totalSavings > 0 && (
                    <div className="text-[10px] text-emerald-400 font-semibold">Save ₹{totalSavings}</div>
                  )}
                </div>
              </div>

              {/* Add All To Cart Action Button */}
              <button
                id="wishlist-add-all-btn"
                type="button"
                onClick={handleAddAllToCart}
                disabled={isAddingAll}
                className="w-full mt-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF2B6D] via-[#FF3B77] to-[#E61D52] hover:brightness-110 active:scale-98 text-white text-xs font-bold shadow-[0_4px_20px_rgba(255,43,109,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {addedAllSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Added {wishlistedProducts.length} to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-white" />
                    <span>Add All to Cart ({wishlistedProducts.length})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Wishlist Content */}
      {wishlistedProducts.length === 0 ? (
        // Empty State
        <div className="text-center py-16 sm:py-24 px-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl space-y-6 shadow-sm">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-full h-full rounded-full bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 flex items-center justify-center">
              <Heart className="w-10 h-10 text-rose-500 fill-rose-500/20 animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-amber-400 text-stone-900 shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)]">
              Your Wishlist is Empty
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              You haven&apos;t saved any artisan cakes yet. Browse our freshly baked gourmet menu and tap the heart icon to curate your dream celebration list.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="empty-wishlist-explore-btn"
              type="button"
              onClick={() => onNavigate('home')}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-[#FF2B6D] to-[#FF457D] text-white text-xs sm:text-sm font-bold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Cake className="w-4 h-4" />
              <span>Explore Chef Bestsellers</span>
            </button>
            <button
              id="empty-wishlist-bento-btn"
              type="button"
              onClick={() => onNavigate('category', 'chocolate')}
              className="w-full sm:w-auto px-5 py-3 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Bento Minis</span>
              <ArrowRight className="w-4 h-4 text-[var(--text-subtle)]" />
            </button>
          </div>

          {/* Quick Perks Strip */}
          <div className="pt-8 border-t border-[var(--border)] max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-subtle)]/50">
              <Zap className="w-4 h-4 text-[#FF2B6D] shrink-0" />
              <div className="text-[11px]">
                <strong className="block text-[var(--text-main)] font-semibold">2-Hour Express</strong>
                <span className="text-[var(--text-muted)]">Same-day delivery</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-subtle)]/50">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="text-[11px]">
                <strong className="block text-[var(--text-main)] font-semibold">100% Eggless</strong>
                <span className="text-[var(--text-muted)]">Vegetarian options</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-subtle)]/50">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-[11px]">
                <strong className="block text-[var(--text-main)] font-semibold">Callebaut Cocoa</strong>
                <span className="text-[var(--text-muted)]">Pure Belgian truffle</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Grid of Wishlisted Products
        <div className="space-y-6">
          {/* Action toolbar above grid */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
            <div className="text-xs text-[var(--text-muted)]">
              Showing <strong className="text-[var(--text-main)]">{wishlistedProducts.length}</strong> saved recipe{wishlistedProducts.length === 1 ? '' : 's'}
            </div>

            <div className="flex items-center gap-3">
              <button
                id="wishlist-toolbar-add-all-btn"
                type="button"
                onClick={handleAddAllToCart}
                disabled={isAddingAll}
                className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add All to Cart</span>
              </button>

              <button
                id="wishlist-clear-all-btn"
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all items from your wishlist?')) {
                    clearWishlist();
                  }
                }}
                className="px-3 py-2 rounded-xl border border-[var(--border)] hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-500 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Clear all favorites"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear List</span>
              </button>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
            {wishlistedProducts.map((product) => (
              <div key={product.id} className="relative group">
                <ProductCard
                  product={product}
                  onViewProduct={onViewProduct}
                />
              </div>
            ))}
          </div>

          {/* Footer Callout to continue exploring */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-subtle)] border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <h3 className="text-base font-bold text-[var(--text-main)]">
                Looking for more sweet temptations?
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Explore our seasonal chef creations, customized photo cakes, and artisan gift boxes.
              </p>
            </div>
            <button
              id="wishlist-continue-browsing-btn"
              type="button"
              onClick={() => onNavigate('home')}
              className="px-5 py-2.5 rounded-full border border-[var(--border-strong)] hover:border-[var(--primary)] text-xs font-bold text-[var(--text-main)] hover:text-[var(--primary)] transition-all cursor-pointer shrink-0"
            >
              Continue Browsing Menu →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
