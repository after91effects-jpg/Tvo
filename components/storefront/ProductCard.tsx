'use client';

import React, { useState } from 'react';
import { ShoppingBag, Star, Check, Sparkles, Flame, Eye, Heart, Zap } from 'lucide-react';
import { Product, WeightOption } from '../../lib/types';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { StarRating } from '../common/StarRating';

interface ProductCardProps {
  product: Product;
  onViewProduct: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onViewProduct }) => {
  const { addToCart, setIsCartOpen } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  const [justToggled, setJustToggled] = useState(false);

  const [selectedWeight, setSelectedWeight] = useState<WeightOption>(
    product.weightOptions?.[0] || { label: '0.5 kg', weightKg: 0.5, price: 699, mrp: 849 }
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    const flavour = product.flavours?.[0] || 'Original';
    addToCart(product, selectedWeight, flavour, '', [], 1);
    setTimeout(() => setIsAdding(false), 500);
  };

  const handleQuickBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBuying(true);
    const flavour = product.flavours?.[0] || 'Original';
    addToCart(product, selectedWeight, flavour, '', [], 1);
    setIsCartOpen(true);
    setTimeout(() => setIsBuying(false), 500);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setJustToggled(true);
    toggleWishlist(product.id, product.name);
    setTimeout(() => setJustToggled(false), 400);
  };

  const discountPercent = selectedWeight.mrp
    ? Math.round(((selectedWeight.mrp - selectedWeight.price) / selectedWeight.mrp) * 100)
    : 0;

  const mainImage =
    product.images?.[0]?.mediumUrl ||
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80';

  return (
    <div
      onClick={() => onViewProduct(product.id)}
      className="group bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer relative"
    >
      {/* Top Image & Badges - 1:1 Aspect Ratio (Square) on All Devices */}
      <div className="relative aspect-square w-full bg-[var(--bg-subtle)] overflow-hidden">
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Wishlist Heart Toggle Button */}
        <button
          id={`product-wishlist-toggle-${product.id}`}
          type="button"
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className={`absolute top-2.5 right-2.5 z-20 p-2 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer shadow-md ${
            isWishlisted
              ? 'bg-white/95 dark:bg-stone-900/95 text-rose-500 border border-rose-200 dark:border-rose-900/50 scale-105'
              : 'bg-white/80 dark:bg-stone-900/80 text-stone-600 dark:text-stone-300 hover:text-rose-500 hover:bg-white dark:hover:bg-stone-900 hover:scale-110'
          } ${justToggled ? 'scale-125' : ''}`}
        >
          <Heart
            className={`w-4 h-4 transition-transform duration-200 ${
              isWishlisted
                ? 'fill-rose-500 text-rose-500 stroke-rose-500'
                : 'stroke-current'
            }`}
          />
        </button>

        {/* Dietary / Bestseller Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {product.badges?.map((badge) => (
            <span
              key={badge}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide shadow-xs ${
                badge.toLowerCase().includes('bestseller')
                  ? 'bg-[var(--primary)] text-white'
                  : badge.toLowerCase().includes('chef')
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-white'
              }`}
            >
              {badge}
            </span>
          ))}
          {product.eggless && (
            <span className="px-2 py-0.5 rounded-md bg-[var(--success-light)] text-[var(--success)] border border-[var(--success)]/20 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
              <span>100% Eggless</span>
            </span>
          )}
        </div>

        {/* Quick View & Quick Buy Buttons Overlay on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 p-3">
          <button
            id={`product-image-quick-view-${product.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewProduct(product.id);
            }}
            aria-label={`Quick view details for ${product.name}`}
            className="px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-[#20131E]/95 text-stone-900 dark:text-white hover:bg-[var(--primary)] hover:text-white dark:hover:bg-[var(--primary)] dark:hover:text-white text-xs font-bold backdrop-blur-md shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 border border-white/30 dark:border-[#4E2945] cursor-pointer active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>
          <button
            id={`product-image-quick-buy-${product.id}`}
            type="button"
            onClick={handleQuickBuy}
            aria-label={`Quick buy ${product.name}`}
            className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF2B6D] to-[#E61D52] hover:brightness-110 text-white text-xs font-bold backdrop-blur-md shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 border border-white/20 cursor-pointer active:scale-95"
          >
            {isBuying ? (
              <Check className="w-3.5 h-3.5 animate-in zoom-in" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Quick Buy</span>
          </button>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Rating */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <StarRating rating={product.rating || 4.8} showValue count={product.reviewCount || 42} />
            <span className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider font-semibold">
              {product.category}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm sm:text-base font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors line-clamp-1 font-display">
            {product.name}
          </h3>

          {/* Short Description */}
          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>

          {/* Weight Option Selector Pills */}
          {(product.weightOptions || []).length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
              {(product.weightOptions || []).slice(0, 3).map((w) => (
                <button
                  key={w.label}
                  type="button"
                  onClick={() => setSelectedWeight(w)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                    selectedWeight.label === w.label
                      ? 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {product.sellingUnit === 'piece' ? w.label : `${w.weightKg} kg`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price & Actions footer */}
        <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold text-[var(--text-main)] font-display">
                ₹{selectedWeight.price}
              </span>
              {selectedWeight.mrp && selectedWeight.mrp > selectedWeight.price && (
                <span className="text-xs text-[var(--text-subtle)] line-through">
                  ₹{selectedWeight.mrp}
                </span>
              )}
            </div>
            {discountPercent > 0 && (
              <span className="text-[10px] text-[var(--success)] font-semibold">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Direct Quick View Button in Footer */}
            <button
              id={`quick-view-btn-${product.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewProduct(product.id);
              }}
              aria-label={`Quick view ${product.name}`}
              title="Quick View & Customize"
              className="p-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--primary-light)] text-[var(--text-muted)] hover:text-[var(--primary)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Quick Add Button */}
            <button
              id={`quick-add-${product.id}`}
              type="button"
              onClick={handleQuickAdd}
              aria-label={`Add ${product.name} to cart`}
              title="Add to Cart"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--primary-light)] text-[var(--text-main)] hover:text-[var(--primary)] border border-[var(--border)] hover:border-[var(--primary)]/30 text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {isAdding ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in" />
                  <span className="hidden sm:inline text-emerald-600">Added</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </>
              )}
            </button>

            {/* Quick Buy Button */}
            <button
              id={`quick-buy-${product.id}`}
              type="button"
              onClick={handleQuickBuy}
              aria-label={`Quick buy ${product.name}`}
              title="Quick Buy & Instant Checkout"
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#FF2B6D] via-[#FF3B77] to-[#E61D52] hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              {isBuying ? (
                <>
                  <Check className="w-3.5 h-3.5 animate-in zoom-in" />
                  <span>Buying...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Quick Buy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
