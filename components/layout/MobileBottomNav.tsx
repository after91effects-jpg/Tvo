'use client';

import React from 'react';
import {
  Home,
  Grid,
  Heart,
  ShoppingBag,
  User,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';

interface MobileBottomNavProps {
  activeView: string;
  onNavigate: (view: string, param?: string) => void;
  onOpenAuthModal?: () => void;
  onOpenMenuDrawer?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onNavigate,
  onOpenAuthModal,
  onOpenMenuDrawer,
}) => {
  const { itemCount, subtotal, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const { wishlistCount } = useWishlist();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Floating Quick Cart Pill (Swiggy / Blinkit style) - visible when cart has items */}
      {itemCount > 0 && (
        <div className="px-4 pb-2 w-full max-w-md mx-auto pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
          <button
            id="mobile-floating-cart-bar"
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF2B6D] via-[#FF3B77] to-[#E61D52] text-white shadow-xl shadow-[#FF2B6D]/30 flex items-center justify-between border border-white/20 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-xs">
                {itemCount}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold leading-tight flex items-center gap-1">
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-white/80 font-normal">• {itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                </div>
                <div className="text-[10px] text-white/90 flex items-center gap-1 font-medium">
                  <Zap className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                  <span>2-Hour Express Checkout</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold bg-white text-[#FF2B6D] px-3 py-1.5 rounded-xl shadow-xs">
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Main Glassmorphism Bottom Tab Bar */}
      <nav
        id="mobile-bottom-navigation-bar"
        aria-label="Mobile Navigation Bar"
        className="w-full bg-[var(--bg-surface)]/95 backdrop-blur-xl border-t border-[var(--border)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-auto"
      >
        <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto">
          {/* Tab 1: Home */}
          <button
            id="mobile-nav-home-btn"
            type="button"
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
              activeView === 'home'
                ? 'text-[var(--primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <div className="relative p-1">
              <Home className={`w-5 h-5 transition-transform ${activeView === 'home' ? 'scale-110' : ''}`} />
              {activeView === 'home' && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
          </button>

          {/* Tab 2: Menu / Categories */}
          <button
            id="mobile-nav-menu-btn"
            type="button"
            onClick={() => {
              if (onOpenMenuDrawer) {
                onOpenMenuDrawer();
              } else {
                const el = document.getElementById('artisan-products-grid');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else onNavigate('home');
              }
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
              activeView === 'category'
                ? 'text-[var(--primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <div className="relative p-1">
              <Grid className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
          </button>

          {/* Tab 3: Wishlist / Saved */}
          <button
            id="mobile-nav-wishlist-btn"
            type="button"
            onClick={() => onNavigate('wishlist')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
              activeView === 'wishlist'
                ? 'text-rose-500 font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <div className="relative p-1">
              <Heart
                className={`w-5 h-5 transition-transform ${
                  wishlistCount > 0
                    ? 'text-rose-500 fill-rose-500/20'
                    : ''
                } ${activeView === 'wishlist' ? 'scale-110' : ''}`}
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Wishlist</span>
          </button>

          {/* Tab 4: Orders & Tracking */}
          <button
            id="mobile-nav-orders-btn"
            type="button"
            onClick={() => onNavigate('orders')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
              activeView === 'orders' || activeView === 'track'
                ? 'text-[var(--primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <div className="relative p-1">
              <ShoppingBag className={`w-5 h-5 transition-transform ${activeView === 'orders' ? 'scale-110' : ''}`} />
              {(activeView === 'orders' || activeView === 'track') && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Orders</span>
          </button>

          {/* Tab 5: Account / Profile */}
          <button
            id="mobile-nav-account-btn"
            type="button"
            onClick={() => {
              if (user) {
                onNavigate('orders');
              } else if (onOpenAuthModal) {
                onOpenAuthModal();
              } else {
                onNavigate('admin');
              }
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative text-[var(--text-muted)] hover:text-[var(--text-main)]`}
          >
            <div className="relative p-1">
              <div className="w-5 h-5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)] overflow-hidden">
                {user ? (
                  <span className="text-[10px] font-bold uppercase text-[var(--primary)]">
                    {user.name.charAt(0)}
                  </span>
                ) : (
                  <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                )}
              </div>
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">
              {user ? user.name.split(' ')[0] : 'Profile'}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};
