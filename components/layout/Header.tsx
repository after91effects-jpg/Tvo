'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  ShoppingBag,
  User as UserIcon,
  ChevronDown,
  Menu,
  X,
  Truck,
  Sparkles,
  ShieldCheck,
  Flame,
  Cake,
  Gift,
  Heart,
  LogIn,
  LogOut,
  ExternalLink,
  ChevronRight,
  Zap,
  Package,
  PartyPopper,
  Cookie,
  Award,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { NotificationBellDrawer } from '../common/NotificationBellDrawer';
import { StorefrontSearchBar } from '../common/StorefrontSearchBar';
import { DEFAULT_STORE_SETTINGS } from '../../lib/seedData';
import { Product, Category } from '../../lib/types';
import { MASTER_5_MAIN_CATEGORIES, MainCategoryHierarchy } from '../../lib/masterCatalogHierarchy';

interface HeaderProps {
  products: Product[];
  categories?: Category[];
  currentView?: string;
  activeView?: string;
  onNavigate: (view: string, param?: string) => void;
  onSelectProduct?: (productId: string) => void;
  onSelectCategory?: (slug: string) => void;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  products,
  categories,
  currentView,
  activeView,
  onNavigate,
  onSelectProduct,
  onSelectCategory,
  onOpenAuthModal,
}) => {
  const { itemCount, setIsCartOpen, deliveryCity, setDeliveryCity } = useCart();
  const { user, isAdmin, isStaff, logout } = useAuth();
  const { wishlistCount } = useWishlist();

  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [activeMegaCategory, setActiveMegaCategory] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [mobileExpandedCat, setMobileExpandedCat] = useState<string | null>('cat-main-cakes');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const navBarRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setIsCityDropdownOpen(false);
      }
      if (navBarRef.current && !navBarRef.current.contains(e.target as Node)) {
        setActiveMegaCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryClick = (slug: string) => {
    setActiveMegaCategory(null);
    setIsMobileNavOpen(false);
    if (onSelectCategory) {
      onSelectCategory(slug);
    } else {
      onNavigate('category', slug);
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cake':
        return <Cake className="w-4 h-4 text-[#FF2B6D]" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'Gift':
        return <Gift className="w-4 h-4 text-emerald-500" />;
      case 'PartyPopper':
        return <PartyPopper className="w-4 h-4 text-purple-500" />;
      default:
        return <Package className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border)] transition-all shadow-xs">
      {/* Top micro banner - Express Delivery Ribbon */}
      <div className="bg-gradient-to-r from-[#FF2B6D] via-[#FF457D] to-[#FF2B6D] text-white text-[11px] py-1.5 px-3 sm:px-6 lg:px-8 xl:px-12 shadow-xs">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Location Quick Switcher */}
            <div className="flex sm:hidden items-center gap-1">
              <button
                type="button"
                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xs font-bold text-[10px] text-white transition-colors cursor-pointer"
              >
                <MapPin className="w-3 h-3 text-amber-300" />
                <span className="truncate max-w-[110px]">{deliveryCity}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-80" />
              </button>
            </div>

            <span className="inline-flex items-center gap-1 font-bold tracking-wide">
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              <span>Flat 15% OFF on First Order</span>
              <span className="hidden md:inline font-mono bg-white/20 px-1.5 py-0.2 rounded text-[10px] tracking-wider ml-1">
                CODE: FIRST15
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3 font-medium">
            <span className="hidden sm:inline-flex items-center gap-1">
              <Truck className="w-3 h-3" />
              <span>Same-Day Express 2-Hour Delivery</span>
            </span>
            <button
              onClick={() => onNavigate('track')}
              className="hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <span>Track Order</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className="hidden lg:flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Chef Portal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-12 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Mobile Menu & Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="p-2 -ml-1 text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-xl lg:hidden transition-colors cursor-pointer"
              aria-label="Toggle navigation drawer"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Brand Logo */}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 group cursor-pointer text-left"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#FF2B6D] to-[#FF6B9D] flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
                <Cake className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-[var(--text-main)] group-hover:text-[#FF2B6D] transition-colors leading-none">
                  Tvo flavours
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold tracking-wider uppercase">
                  Artisan Bakery
                </span>
              </div>
            </button>

            {/* Desktop Location Selector */}
            <div className="relative hidden sm:block ml-2" ref={cityRef}>
              <button
                type="button"
                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-xs text-[var(--text-main)] font-semibold border border-[var(--border)] transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#FF2B6D]" />
                <span className="truncate max-w-[120px]">{deliveryCity}</span>
                <ChevronDown className="w-3 h-3 text-[var(--text-subtle)]" />
              </button>

              {isCityDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] px-2.5 py-1">
                    Select Delivery City
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {DEFAULT_STORE_SETTINGS.deliveryCities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setDeliveryCity(city);
                          setIsCityDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                          deliveryCity === city
                            ? 'bg-[#FF2B6D]/10 text-[#FF2B6D] font-bold'
                            : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Search Bar */}
          <div className="flex-1 max-w-lg hidden sm:block mx-2">
            <StorefrontSearchBar
              products={products}
              onNavigate={onNavigate}
              onSelectProduct={onSelectProduct}
              onSearchSubmit={(q) => onNavigate('search', q)}
            />
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <NotificationBellDrawer onNavigateToTrack={(orderNum) => onNavigate('track', orderNum)} />

            {/* Wishlist */}
            <button
              id="header-wishlist-btn"
              type="button"
              onClick={() => onNavigate('wishlist')}
              className="relative p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] hover:text-rose-500 transition-all cursor-pointer"
              aria-label={`View favorites (${wishlistCount} saved)`}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  wishlistCount > 0 ? 'text-rose-500 fill-rose-500' : 'text-[var(--text-muted)]'
                }`}
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs animate-in zoom-in">
                  {wishlistCount}
                </span>
              )}
            </button>

            <ThemeToggle />

            {/* User Account */}
            <div className="relative" ref={userMenuRef}>
              <button
                id="header-user-menu-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] font-medium transition-colors cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-[#FF2B6D]" />
                <span className="hidden md:inline font-medium">
                  {user ? user.name.split(' ')[0] : 'Account'}
                </span>
                <ChevronDown className="w-3 h-3 text-[var(--text-subtle)] hidden md:inline" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                  {user ? (
                    <>
                      <div className="px-3 py-2 border-b border-[var(--border)]">
                        <div className="text-xs font-bold text-[var(--text-main)] truncate">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate">
                          {user.email}
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#FF2B6D]/10 text-[#FF2B6D] text-[10px] font-bold uppercase">
                          {user.role}
                        </span>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            onNavigate('wishlist');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                            <span>My Favorite Cakes</span>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            onNavigate('orders');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors flex items-center gap-2"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-[#FF2B6D]" />
                          <span>My Orders & Invoices</span>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              onNavigate('admin');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-[#FF2B6D] hover:bg-[#FF2B6D]/10 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Chef Admin Portal</span>
                          </button>
                        )}
                      </div>

                      <div className="pt-1 border-t border-[var(--border)]">
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-2 text-center space-y-2">
                      <div className="text-xs text-[var(--text-muted)]">
                        Sign in for express checkout & order tracking
                      </div>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onOpenAuthModal) onOpenAuthModal();
                          else onNavigate('admin');
                        }}
                        className="w-full py-2 bg-[#FF2B6D] hover:bg-[#FF1A5B] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In / Register</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart Button */}
            <button
              id="header-cart-btn"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-gradient-to-r from-[#FF2B6D] to-[#FF457D] text-white text-xs font-bold shadow-md hover:shadow-lg hover:brightness-105 transition-all cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 w-4 h-4 rounded-full bg-white text-[#FF2B6D] text-[9px] font-black flex items-center justify-center shadow-xs">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Cart</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Integrated Search Bar Strip */}
      <div className="block sm:hidden px-3 pb-2.5 pt-1 bg-[var(--bg-surface)] border-t border-[var(--border)]/40 shadow-xs">
        <StorefrontSearchBar
          products={products}
          onNavigate={(view, param) => {
            setIsMobileNavOpen(false);
            onNavigate(view, param);
          }}
          onSelectProduct={(pId) => {
            setIsMobileNavOpen(false);
            if (onSelectProduct) onSelectProduct(pId);
            else onNavigate('product', pId);
          }}
          onSearchSubmit={(q) => {
            setIsMobileNavOpen(false);
            onNavigate('search', q);
          }}
          isMobile={true}
          placeholder="Search truffle, red velvet, eggless..."
        />
      </div>

      {/* ========================================================================= */}
      {/* 5 MAIN CATEGORIES MEGA-MENU BAR (DESKTOP)                                 */}
      {/* ========================================================================= */}
      <nav ref={navBarRef} className="hidden lg:block border-t border-[var(--border)]/60 bg-[var(--bg-surface)] relative">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-12 text-xs font-bold text-[var(--text-main)]">
            <div className="flex items-center gap-1">
              {MASTER_5_MAIN_CATEGORIES.map((mainCat) => {
                const isOpen = activeMegaCategory === mainCat.id;
                return (
                  <div
                    key={mainCat.id}
                    className="relative"
                    onMouseEnter={() => setActiveMegaCategory(mainCat.id)}
                  >
                    <button
                      type="button"
                      onClick={() => handleCategoryClick(mainCat.slug)}
                      className={`flex items-center gap-1.5 px-3 py-3 rounded-lg hover:text-[#FF2B6D] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer uppercase tracking-wider text-[11px] ${
                        isOpen ? 'text-[#FF2B6D] bg-[var(--bg-subtle)]' : 'text-[var(--text-main)]'
                      }`}
                    >
                      {getCategoryIcon(mainCat.iconName)}
                      <span>{mainCat.name}</span>
                      <ChevronDown
                        className={`w-3 h-3 text-[var(--text-subtle)] transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#FF2B6D]' : ''
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Right Express Perks */}
            <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] font-semibold">
              <button
                type="button"
                onClick={() => handleCategoryClick('eggless-cakes')}
                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>100% Eggless Pure Veg</span>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryClick('midnight-delivery')}
                className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline"
              >
                <Sparkles className="w-3 h-3" />
                <span>Midnight Delivery</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Full-Width Mega-Menu Dropdown */}
        {activeMegaCategory && (
          <div
            onMouseLeave={() => setActiveMegaCategory(null)}
            className="absolute left-0 top-full w-full bg-[var(--bg-surface)] border-b border-[var(--border)] shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {(() => {
              const current = MASTER_5_MAIN_CATEGORIES.find((c) => c.id === activeMegaCategory);
              if (!current) return null;

              return (
                <div className="w-full px-6 lg:px-12 py-6">
                  {/* Category Header Strip */}
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FF2B6D]/10 flex items-center justify-center">
                        {getCategoryIcon(current.iconName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-[var(--text-main)] uppercase tracking-wide">
                            {current.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-[#FF2B6D]/10 text-[#FF2B6D] text-[10px] font-bold">
                            Explore All ({current.subcategories.length} Sections)
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {current.shortDescription}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCategoryClick(current.slug)}
                      className="text-xs font-bold text-[#FF2B6D] hover:underline flex items-center gap-1"
                    >
                      <span>View All {current.name}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Dynamic Columns based on Category */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {current.subcategories.map((sub) => (
                      <div key={sub.id} className="space-y-2.5">
                        <button
                          type="button"
                          onClick={() => handleCategoryClick(sub.slug)}
                          className="font-bold text-xs text-[var(--text-main)] hover:text-[#FF2B6D] flex items-center gap-1 tracking-tight text-left"
                        >
                          <span>{sub.name}</span>
                          <ChevronRight className="w-3 h-3 text-[var(--text-subtle)]" />
                        </button>

                        {sub.childCategories && sub.childCategories.length > 0 ? (
                          <ul className="space-y-1.5 text-[11px] text-[var(--text-muted)]">
                            {sub.childCategories.slice(0, 8).map((child) => (
                              <li key={child.id}>
                                <button
                                  type="button"
                                  onClick={() => handleCategoryClick(child.slug)}
                                  className="hover:text-[#FF2B6D] hover:translate-x-1 transition-transform block text-left"
                                >
                                  {child.name}
                                </button>
                              </li>
                            ))}
                            {sub.childCategories.length > 8 && (
                              <li>
                                <button
                                  type="button"
                                  onClick={() => handleCategoryClick(sub.slug)}
                                  className="text-[10px] font-bold text-[#FF2B6D] hover:underline pt-1 block"
                                >
                                  +{sub.childCategories.length - 8} more...
                                </button>
                              </li>
                            )}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-[var(--text-subtle)] line-clamp-2">
                            {sub.shortDescription}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </nav>

      {/* ========================================================================= */}
      {/* MOBILE FULL NAVIGATION DRAWER (ACCORDION PROGRESSIVE HIERARCHY)           */}
      {/* ========================================================================= */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
          />

          {/* Slide-in Panel */}
          <div className="fixed inset-y-0 left-0 max-w-xs sm:max-w-sm w-full bg-[var(--bg-surface)] shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 bg-gradient-to-r from-[#FF2B6D] via-[#FF457D] to-[#FF2B6D] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white shadow-xs text-sm">
                  <Cake className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">
                    {user ? user.name : 'Welcome to Tvo flavours!'}
                  </div>
                  <div className="text-[10px] text-white/80">
                    5 Master Categories Catalog
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Delivery City Selector */}
              <div className="p-3 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border)] space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#FF2B6D]" />
                    <span>Delivering To</span>
                  </span>
                  <span className="text-[9px] text-[#FF2B6D] font-extrabold uppercase">⚡ 2-Hr Express</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEFAULT_STORE_SETTINGS.deliveryCities.slice(0, 4).map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        setDeliveryCity(city);
                        setIsMobileNavOpen(false);
                      }}
                      className={`p-2 rounded-xl text-left text-xs font-bold transition-all ${
                        deliveryCity === city
                          ? 'bg-[#FF2B6D] text-white shadow-xs'
                          : 'bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border)]'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 Master Categories Accordion Hierarchy */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] px-1">
                  Browse by 5 Categories
                </div>

                {MASTER_5_MAIN_CATEGORIES.map((mainCat) => {
                  const isExpanded = mobileExpandedCat === mainCat.id;
                  return (
                    <div
                      key={mainCat.id}
                      className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--bg-surface)]"
                    >
                      <button
                        type="button"
                        onClick={() => setMobileExpandedCat(isExpanded ? null : mainCat.id)}
                        className="w-full p-3 text-left font-bold text-xs text-[var(--text-main)] flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(mainCat.iconName)}
                          <span>{mainCat.name}</span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-[var(--text-subtle)] transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-[#FF2B6D]' : ''
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="p-3 pt-0 border-t border-[var(--border)] bg-[var(--bg-subtle)]/50 space-y-3 animate-in fade-in duration-150">
                          <button
                            type="button"
                            onClick={() => handleCategoryClick(mainCat.slug)}
                            className="w-full text-left font-bold text-xs text-[#FF2B6D] py-1 hover:underline flex items-center justify-between"
                          >
                            <span>Explore Entire {mainCat.name} Category</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <div className="space-y-2.5">
                            {mainCat.subcategories.map((sub) => (
                              <div key={sub.id} className="pl-2 border-l-2 border-[#FF2B6D]/30 space-y-1">
                                <button
                                  type="button"
                                  onClick={() => handleCategoryClick(sub.slug)}
                                  className="text-xs font-semibold text-[var(--text-main)] hover:text-[#FF2B6D] text-left block"
                                >
                                  {sub.name}
                                </button>
                                {sub.childCategories && (
                                  <div className="grid grid-cols-2 gap-1 pt-1">
                                    {sub.childCategories.slice(0, 6).map((child) => (
                                      <button
                                        key={child.id}
                                        type="button"
                                        onClick={() => handleCategoryClick(child.slug)}
                                        className="text-[11px] text-[var(--text-muted)] hover:text-[#FF2B6D] text-left truncate py-0.5"
                                      >
                                        • {child.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Customer Actions */}
              <div className="pt-2 border-t border-[var(--border)] space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    onNavigate('orders');
                  }}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-[var(--text-main)] text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#FF2B6D]" />
                    <span>My Past Orders & Invoices</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-subtle)]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    onNavigate('track');
                  }}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-[var(--text-main)] text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-500" />
                    <span>Track Live Delivery</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-subtle)]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    onNavigate('admin');
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#FF2B6D]/10 hover:bg-[#FF2B6D]/20 text-[#FF2B6D] text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Chef Administrator Portal</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Bottom Bar */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <span className="text-xs text-[var(--text-muted)] font-medium">Dark Mode</span>
              </div>
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMobileNavOpen(false);
                  }}
                  className="text-xs text-rose-500 font-bold flex items-center gap-1.5 hover:underline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    if (onOpenAuthModal) onOpenAuthModal();
                    else onNavigate('admin');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FF2B6D] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
