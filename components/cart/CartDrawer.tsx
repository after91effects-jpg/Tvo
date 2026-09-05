'use client';

import React, { useState } from 'react';
import { X, ShoppingBag, Plus, Minus, Trash2, Tag, ArrowRight, Sparkles, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { DEFAULT_STORE_SETTINGS } from '../../lib/seedData';

interface CartDrawerProps {
  onNavigateToCheckout?: () => void;
  onCheckout?: () => void;
  onNavigateToShop?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onNavigateToCheckout,
  onCheckout,
  onNavigateToShop,
}) => {
  const {
    items,
    itemCount,
    subtotal,
    discount,
    deliveryFee,
    slotSurcharge,
    tax,
    total,
    appliedPromo,
    updateQuantity,
    removeFromCart,
    applyPromoCode,
    removePromoCode,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const freeDeliveryThreshold = DEFAULT_STORE_SETTINGS.thresholds.freeDeliveryAbove;
  const progressToFreeDelivery = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    setIsApplyingPromo(true);
    setPromoMessage(null);
    const res = await applyPromoCode(promoInput);
    setIsApplyingPromo(false);

    if (res.success) {
      setPromoMessage({ text: res.message, isError: false });
      setPromoInput('');
    } else {
      setPromoMessage({ text: res.message, isError: true });
    }
  };

  if (!isCartOpen) return null;

  return (
    <div
      id="cart-drawer-overlay"
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsCartOpen(false);
      }}
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[var(--bg-surface)] border-l border-[var(--border)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-subtle)]/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-[var(--text-main)] font-display">
                Your Celebration Cart ({itemCount})
              </h2>
            </div>
            <button
              id="close-cart-drawer-btn"
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-accent)] transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free delivery indicator */}
          {items.length > 0 && (
            <div className="bg-[var(--primary-light)]/40 px-4 py-2.5 border-b border-[var(--border)] text-xs text-[var(--text-main)]">
              {amountNeededForFreeDelivery > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span>
                      Add <strong className="text-[var(--primary)]">₹{amountNeededForFreeDelivery}</strong> more for Free Delivery!
                    </span>
                    <span>{progressToFreeDelivery}%</span>
                  </div>
                  <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[var(--primary)] h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressToFreeDelivery}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[var(--success)] font-medium">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Congratulations! You have qualified for FREE Express Delivery!</span>
                </div>
              )}
            </div>
          )}

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                <div className="w-20 h-20 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center mb-4 text-[var(--text-subtle)]">
                  <ShoppingBag className="w-10 h-10 stroke-1" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-main)] font-display">
                  Your cart is empty
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
                  Discover our freshly baked artisan cakes and gourmet treats to brighten your celebrations.
                </p>
                <button
                  id="empty-cart-explore-btn"
                  onClick={() => {
                    setIsCartOpen(false);
                    onNavigateToShop?.();
                  }}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
                >
                  Explore Bestselling Cakes
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xs flex gap-3 relative group"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--bg-subtle)] shrink-0 border border-[var(--border)]">
                    <img
                      src={item.product.images?.[0]?.thumbUrl || item.product.images?.[0]?.url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=200&q=80'}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-[var(--text-main)] line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-[var(--text-subtle)] hover:text-[var(--danger)] p-0.5 rounded transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-1 text-[11px] text-[var(--text-muted)]">
                        <span className="bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded font-medium">
                          {item.selectedWeight.label}
                        </span>
                        {item.selectedFlavour && (
                          <span className="bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded">
                            {item.selectedFlavour}
                          </span>
                        )}
                        {item.product.eggless && (
                          <span className="text-[var(--success)] font-medium flex items-center gap-0.5">
                            • Eggless
                          </span>
                        )}
                      </div>

                      {item.messageOnCake && (
                        <p className="text-[11px] text-[var(--primary)] italic mt-1 line-clamp-1">
                          &ldquo;{item.messageOnCake}&rdquo;
                        </p>
                      )}

                      {item.addons?.length > 0 && (
                        <div className="text-[10px] text-[var(--text-subtle)] mt-0.5">
                          + {item.addons.map((a) => a.name).join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Pricing & Stepper */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]/60">
                      <div className="text-xs font-bold text-[var(--text-main)]">
                        ₹{item.totalPrice}
                      </div>

                      <div className="flex items-center border border-[var(--border)] rounded-lg bg-[var(--bg-subtle)]/50">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-l-md transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-[var(--text-main)]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-r-md transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with promo and checkout */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--bg-subtle)]/40 space-y-3">
              {/* Promo code form */}
              {appliedPromo ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--success-light)] border border-[var(--success)]/30 text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--success)] font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Coupon <strong>{appliedPromo.code}</strong> applied (-₹{discount})</span>
                  </div>
                  <button
                    onClick={removePromoCode}
                    className="text-[11px] text-[var(--danger)] hover:underline font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="space-y-1.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="Coupon Code (e.g. CONFETTO10)"
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isApplyingPromo || !promoInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-main)] disabled:opacity-50 transition-colors"
                    >
                      {isApplyingPromo ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  {promoMessage && (
                    <p className={`text-[11px] ${promoMessage.isError ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                      {promoMessage.text}
                    </p>
                  )}
                </form>
              )}

              {/* Cost breakdown */}
              <div className="space-y-1 text-xs text-[var(--text-muted)] pt-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-[var(--text-main)]">₹{subtotal}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[var(--success)]">
                    <span>Discount</span>
                    <span className="font-medium">-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? <strong className="text-[var(--success)] font-medium">FREE</strong> : `₹${deliveryFee}`}</span>
                </div>
                {slotSurcharge > 0 && (
                  <div className="flex justify-between">
                    <span>Slot Surcharge</span>
                    <span>₹{slotSurcharge}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxes (5% GST)</span>
                  <span>₹{tax}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[var(--text-main)] pt-2 border-t border-[var(--border)]">
                  <span>To Pay</span>
                  <span className="text-[var(--primary)] text-base font-display">₹{total}</span>
                </div>
              </div>

              {/* Checkout Action */}
              <button
                id="cart-proceed-checkout-btn"
                onClick={() => {
                  setIsCartOpen(false);
                  if (onCheckout) {
                    onCheckout();
                  } else if (onNavigateToCheckout) {
                    onNavigateToCheckout();
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
              >
                <span>Proceed to Safe Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
