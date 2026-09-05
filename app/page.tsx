'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Search,
  Filter,
  Cake,
  RefreshCw,
  Plus,
  ArrowRight,
  Heart,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Product, Order, Category, HamperSettings } from '../lib/types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_SAMPLE_ORDERS,
  DEFAULT_HAMPER_SETTINGS,
} from '../lib/seedData';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLocalStorageJSON } from '../lib/useLocalStorage';

// Layout & Storefront Components
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { CartDrawer } from '../components/cart/CartDrawer';
import { HeroCarousel } from '../components/storefront/HeroCarousel';
import { CategoryStories } from '../components/storefront/CategoryStories';
import { CategoryPills } from '../components/storefront/CategoryPills';
import { CategoryHero } from '../components/storefront/CategoryHero';
import { ProductCard } from '../components/storefront/ProductCard';
import { TrustStrip } from '../components/storefront/TrustStrip';
import { FaqAccordion } from '../components/storefront/FaqAccordion';
import { CustomHamperBuilder } from '../components/storefront/CustomHamperBuilder';
import { CheckoutModal } from '../components/storefront/CheckoutModal';
import { OrderTrackingView } from '../components/storefront/OrderTrackingView';
import { AboutView } from '../components/storefront/AboutView';
import { ContactView } from '../components/storefront/ContactView';
import { WishlistView } from '../components/storefront/WishlistView';
import { RecentlyViewed } from '../components/storefront/RecentlyViewed';
import { AdminLoginModal } from '../components/storefront/AdminLoginModal';
import { CustomerOrderHistoryView } from '../components/storefront/CustomerOrderHistoryView';
import { OrderNotificationToasts } from '../components/common/OrderNotificationToasts';
import { useNotifications } from '../context/NotificationContext';

// Admin Components
import { AdminHeader } from '../components/admin/AdminHeader';
import { AdminSidebar, AdminTab } from '../components/admin/AdminSidebar';
import { DashboardView } from '../components/admin/DashboardView';
import { ProductsCatalogView } from '../components/admin/ProductsCatalogView';
import { CategoryManagerView } from '../components/admin/CategoryManagerView';
import { MediaUploadsView } from '../components/admin/MediaUploadsView';
import { CustomerOrdersView } from '../components/admin/CustomerOrdersView';
import { WooCommerceHubView } from '../components/admin/WooCommerceHubView';
import { SecurityAuditLogsView } from '../components/admin/SecurityAuditLogsView';
import { HamperSettingsView } from '../components/admin/HamperSettingsView';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { isCartOpen, setIsCartOpen } = useCart();
  const { isInWishlist } = useWishlist();
  const { activeTrackingOrderNumber, setActiveTrackingOrderNumber } = useNotifications();

  // Root View State
  const [activeView, setActiveView] = useState<'storefront' | 'admin'>('storefront');
  const [storeSubView, setStoreSubView] = useState<
    'home' | 'category' | 'track' | 'orders' | 'history' | 'about' | 'contact' | 'faq' | 'wishlist'
  >('home');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHamperBuilderOpen, setIsHamperBuilderOpen] = useState(false);
  const [hamperSettings, setHamperSettings] = useLocalStorageJSON<HamperSettings>(
    'tvo_hamper_settings',
    DEFAULT_HAMPER_SETTINGS
  );
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string>('');

  // Admin Tab State
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  // Live Firestore Data State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_SAMPLE_ORDERS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useLocalStorageJSON<string[]>(
    'confetto_recently_viewed_ids',
    []
  );

  // Track product view in state and LocalStorage (max 5 items, latest first)
  const addToRecentlyViewed = React.useCallback(
    (productId: string) => {
      if (!productId) return;
      setRecentlyViewedIds((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const filtered = safePrev.filter((id) => id !== productId);
        return [productId, ...filtered].slice(0, 5);
      });
    },
    [setRecentlyViewedIds]
  );

  const handleClearRecentlyViewed = React.useCallback(() => {
    setRecentlyViewedIds([]);
  }, [setRecentlyViewedIds]);

  // Fetch Data from SQLite API
  const fetchData = React.useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);

      // Fetch Categories (flat array from API)
      try {
        const catRes = await fetch('/api/categories');
        const catData = await catRes.json();
        const flatCats = catData.flat || catData.categories;
        if (flatCats && Array.isArray(flatCats) && flatCats.length > 0) {
          setCategories(flatCats.map((c: any) => ({
            id: c.id || c.slug,
            name: c.name,
            slug: c.slug,
            parentSlug: c.parentSlug || c.parent_slug || null,
            description: c.description || '',
            image: c.image || undefined,
            displayOrder: c.displayOrder || c.display_order || 0,
            subcategories: c.subcategories || [],
          })) as Category[]);
        } else {
          setCategories(INITIAL_CATEGORIES);
        }
      } catch {
        setCategories(INITIAL_CATEGORIES);
      }

      // Fetch Products (with categories arrays for filtering)
      try {
        const prodRes = await fetch('/api/products?limit=1000');
        const prodData = await prodRes.json();
        if (prodData.products && prodData.products.length > 0) {
          setProducts(prodData.products.map((p: any) => {
            const categorySlug = p.category || p.category_slug || '';
            const subCatSlug = p.subcategory || p.subcategory_slug || '';
            const tags = Array.isArray(p.tags) ? p.tags : (p.tags_json ? (typeof p.tags_json === 'string' ? JSON.parse(p.tags_json) : p.tags_json) : []);
            const flavours = Array.isArray(p.flavours) ? p.flavours : (p.flavours_json ? (typeof p.flavours_json === 'string' ? JSON.parse(p.flavours_json) : p.flavours_json) : []);
            const categories = Array.isArray(p.categories) ? p.categories : (p.categories_json ? (typeof p.categories_json === 'string' ? JSON.parse(p.categories_json) : p.categories_json) : (categorySlug ? [categorySlug] : []));
            const subcategories = Array.isArray(p.subcategories) ? p.subcategories : (p.subcategories_json ? (typeof p.subcategories_json === 'string' ? JSON.parse(p.subcategories_json) : p.subcategories_json) : (subCatSlug ? [subCatSlug] : []));
            let images: any[] = [];
            try {
              if (p.images) {
                images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
              } else if (p.images_json) {
                images = typeof p.images_json === 'string' ? JSON.parse(p.images_json) : p.images_json;
              }
            } catch { images = []; }
            if (!images.length && p.image_url) images = [{ url: p.image_url }];

            let weightOptions: any[] = [];
            try {
              if (Array.isArray(p.weightOptions)) weightOptions = p.weightOptions;
              else if (p.weightOptions && Array.isArray(p.weightOptions.options)) weightOptions = p.weightOptions.options;
              else if (p.weight_options_json) {
                const parsed = typeof p.weight_options_json === 'string' ? JSON.parse(p.weight_options_json) : p.weight_options_json;
                weightOptions = Array.isArray(parsed) ? parsed : (parsed?.options && Array.isArray(parsed.options) ? parsed.options : []);
              }
            } catch { weightOptions = []; }
            const basePrice = Number(p.price ?? p.salePrice ?? p.regularPrice ?? 0);
            const normalizedOptions = weightOptions.length ? weightOptions.map((w: any) => ({
              label: w.label || w.value || `${w.weightKg || 0.5} kg`,
              weightKg: Number(w.weightKg ?? w.weight_kg ?? (parseFloat(w.label) || 0.5)),
              price: Number(w.price ?? basePrice),
              mrp: Number(w.mrp ?? p.regularPrice ?? basePrice),
            })) : [{ label: '1 kg', weightKg: 1, price: basePrice, mrp: Number(p.regularPrice ?? basePrice) }];

            return {
              id: p.id || p.slug,
              slug: p.slug,
              name: p.name,
              sku: p.sku || '',
              price: p.salePrice ?? p.price ?? 0,
              regularPrice: p.regularPrice ?? p.price ?? 0,
              salePrice: p.salePrice ?? 0,
              shortDescription: p.shortDescription || p.short_description || '',
              description: p.description || '',
              category: categorySlug,
              subCategory: subCatSlug || categories[0] || '',
              categories,
              subcategories,
              tags,
              flavours,
              images: images.map((im: any) => (typeof im === 'string' ? { url: im } : { url: im.url, mediumUrl: im.mediumUrl || im.url, thumbUrl: im.thumbUrl || im.mediumUrl || im.url, alt: im.alt })).filter((i: any) => i.url),
              weight: p.weight || '1.0 kg',
              weightOptions: normalizedOptions,
              flavourOptions: p.flavourOptions || undefined,
              rating: p.rating || 4.9,
              reviewCount: p.reviewCount || 0,
              published: p.published !== 0 && p.published !== false,
              eggless: Boolean(p.eggless),
              bestseller: Boolean(p.bestseller),
              newArrival: Boolean(p.newArrival),
              deal: Boolean(p.deal),
              featured: Boolean(p.featured),
              addons: p.addons || undefined,
              stock: p.stock ?? 999,
            } as Product;
          }));
        } else {
          setProducts(INITIAL_PRODUCTS);
        }
      } catch {
        setProducts(INITIAL_PRODUCTS);
      }

      // Fetch Orders
      try {
        const ordRes = await fetch('/api/orders');
        const ordData = await ordRes.json();
        if (ordData.orders && ordData.orders.length > 0) {
          setOrders(ordData.orders);
        } else {
          setOrders(INITIAL_SAMPLE_ORDERS);
        }
      } catch {
        setOrders(INITIAL_SAMPLE_ORDERS);
      }
    } catch (err) {
      console.warn('Fetch fallback:', err);
      setProducts(INITIAL_PRODUCTS);
      setCategories(INITIAL_CATEGORIES);
      setOrders(INITIAL_SAMPLE_ORDERS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      await fetchData(false);
    } catch (e) {
      console.error('Seed error:', e);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchData(false);
      }
    });
    return () => {
      active = false;
    };
  }, [fetchData]);

  // Navigation Handler
  const handleNavigate = (view: string, param?: string) => {
    if (view === 'admin') {
      if (isAuthenticated) {
        setActiveView('admin');
      } else {
        setIsAdminLoginOpen(true);
      }
      return;
    }

    if (view === 'category') {
      setSelectedCategorySlug(param || 'all');
      setSelectedSubcategorySlug('all');
      setSearchQuery('');
      setStoreSubView('home');
      setActiveView('storefront');
      // Smooth scroll to products section
      setTimeout(() => {
        document.getElementById('artisan-products-grid')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    if (view === 'search') {
      setSearchQuery(param || '');
      setSelectedCategorySlug('all');
      setStoreSubView('home');
      setActiveView('storefront');
      // Smooth scroll to products section
      setTimeout(() => {
        document.getElementById('artisan-products-grid')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    if (view === 'product' && param) {
      const prod = products.find((p) => p.id === param || p.slug === param);
      if (prod) {
        addToRecentlyViewed(prod.id);
        router.push(`/product/${prod.slug || prod.id}`);
      }
      return;
    }

    if (view === 'track') {
      if (param) setTrackingOrderNumber(param);
      setStoreSubView('track');
      setActiveView('storefront');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'wishlist') {
      setStoreSubView('wishlist');
      setActiveView('storefront');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'orders' || view === 'history' || view === 'order-history') {
      setStoreSubView('orders');
      setActiveView('storefront');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'about' || view === 'contact' || view === 'faq') {
      setStoreSubView(view as any);
      setActiveView('storefront');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Default: Home
    setStoreSubView('home');
    setActiveView('storefront');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!activeTrackingOrderNumber) return;
    const target = activeTrackingOrderNumber;
    const timer = setTimeout(() => {
      setTrackingOrderNumber(target);
      setStoreSubView('track');
      setActiveView('storefront');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveTrackingOrderNumber(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTrackingOrderNumber, setActiveTrackingOrderNumber]);

  const handleOpenProduct = (productId: string) => {
    addToRecentlyViewed(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      router.push(`/product/${prod.slug || prod.id}`);
    }
  };

  const handleOrderSuccess = (orderNumber: string) => {
    setTrackingOrderNumber(orderNumber);
    setStoreSubView('track');
    fetchData(); // reload orders
  };

  // Filtered Products for Storefront
  const filteredStoreProducts = products.filter((p) => {
    if (!p.published) return false;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === '' ||
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.shortDescription?.toLowerCase().includes(query) ||
      p.tags?.some((t) => t.toLowerCase().includes(query)) ||
      p.flavours?.some((f) => f.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    // Wishlist filter
    if (selectedCategorySlug === 'wishlist') {
      return isInWishlist(p.id);
    }

    // All categories
    if (selectedCategorySlug === 'all' || !selectedCategorySlug) {
      // If subcategory is selected
      if (selectedSubcategorySlug && selectedSubcategorySlug !== 'all') {
        return (
          p.subCategory === selectedSubcategorySlug ||
          (p.subcategories && p.subcategories.includes(selectedSubcategorySlug)) ||
          (p.categories && p.categories.includes(selectedSubcategorySlug)) ||
          p.tags?.some((t) => t.toLowerCase().includes(selectedSubcategorySlug.toLowerCase()))
        );
      }
      return true;
    }

    // Special eggless filter
    if (selectedCategorySlug === 'eggless' || selectedCategorySlug === 'eggless-cakes') {
      return p.eggless || p.tags?.some((t) => t.toLowerCase().includes('eggless'));
    }

    // Main Category broad matching
    let matchesMainCategory = false;
    if (p.category === selectedCategorySlug || (p.categories && p.categories.includes(selectedCategorySlug))) {
      matchesMainCategory = true;
    } else if (selectedCategorySlug === 'cakes') {
      matchesMainCategory =
        p.category === 'cakes' ||
        p.category === 'birthday' ||
        p.category === 'anniversary' ||
        p.category === 'chocolate' ||
        p.category === 'mango-cakes' ||
        p.category === 'fruit-cakes' ||
        p.category === 'trending-cakes' ||
        p.category === 'theme-cakes' ||
        p.category === 'by-relation' ||
        (p.categories && p.categories.some((c) => c.includes('cake') || c.includes('birthday') || c.includes('anniversary'))) ||
        p.name.toLowerCase().includes('cake');
    } else if (selectedCategorySlug === 'desserts-pastries') {
      matchesMainCategory =
        p.category === 'desserts' ||
        p.category === 'desserts-pastries' ||
        (p.categories && p.categories.some((c) => c.includes('dessert') || c.includes('pastr') || c.includes('cupcake') || c.includes('brownie') || c.includes('cookie') || c.includes('cheesecake') || c.includes('jar-cake') || c.includes('macaron') || c.includes('waffle') || c.includes('pancake'))) ||
        p.name.toLowerCase().includes('pastry') ||
        p.name.toLowerCase().includes('cupcake') ||
        p.name.toLowerCase().includes('cheesecake') ||
        p.name.toLowerCase().includes('dessert') ||
        p.name.toLowerCase().includes('brownie');
    } else if (selectedCategorySlug === 'hampers-gifts') {
      matchesMainCategory =
        p.category === 'hampers' ||
        p.category === 'hampers-gifts' ||
        p.category === 'rakhi-hampers' ||
        (p.categories && p.categories.some((c) => c.includes('hamper') || c.includes('gift') || c.includes('combo') || c.includes('flower') || c.includes('plant') || c.includes('rakhi'))) ||
        p.name.toLowerCase().includes('hamper') ||
        p.name.toLowerCase().includes('gift') ||
        p.name.toLowerCase().includes('box');
    } else if (selectedCategorySlug === 'party-supplies') {
      matchesMainCategory =
        p.category === 'festive-candles' ||
        p.category === 'party-supplies' ||
        (p.categories && p.categories.some((c) => c.includes('candle') || c.includes('party') || c.includes('topper') || c.includes('prop') || c.includes('banner') || c.includes('balloon') || c.includes('popper') || c.includes('sparkler'))) ||
        p.name.toLowerCase().includes('candle') ||
        p.name.toLowerCase().includes('topper') ||
        p.name.toLowerCase().includes('sparkler');
    } else if (selectedCategorySlug === 'baking-store') {
      matchesMainCategory =
        p.category === 'baking-store' ||
        (p.categories && p.categories.some((c) => c.includes('baking') || c.includes('premix') || c.includes('ingredient') || c.includes('tool') || c.includes('nozzle') || c.includes('cutter') || c.includes('mould') || c.includes('decor') || c.includes('sprinkle') || c.includes('glaze'))) ||
        p.name.toLowerCase().includes('baking') ||
        p.name.toLowerCase().includes('tool') ||
        p.name.toLowerCase().includes('premix');
    } else {
      // Subcategory direct match
      matchesMainCategory =
        p.subCategory === selectedCategorySlug ||
        (p.subcategories && p.subcategories.includes(selectedCategorySlug)) ||
        (p.categories && p.categories.includes(selectedCategorySlug)) ||
        p.tags?.some((t) => t.toLowerCase().includes(selectedCategorySlug.toLowerCase()));
    }

    if (!matchesMainCategory) return false;

    // Subcategory check if selected
    if (selectedSubcategorySlug && selectedSubcategorySlug !== 'all') {
      const matchesSub =
        p.subCategory === selectedSubcategorySlug ||
        (p.subcategories && p.subcategories.includes(selectedSubcategorySlug)) ||
        (p.categories && p.categories.includes(selectedSubcategorySlug)) ||
        p.tags?.some((t) => t.toLowerCase().includes(selectedSubcategorySlug.toLowerCase()));
      if (!matchesSub) return false;
    }

    return true;
  });

  const pendingOrdersCount = orders.filter(
    (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors">
      {/* View Switcher: Storefront vs Admin */}
      {activeView === 'admin' ? (
        // ==================== CHEF ADMINISTRATOR DASHBOARD ====================
        <div className="min-h-screen flex flex-col bg-[var(--bg-main)]">
          <AdminHeader onNavigateToStore={() => setActiveView('storefront')} />

          <div className="flex-1 flex overflow-hidden">
            <AdminSidebar
              activeTab={adminTab}
              onSelectTab={(t) => setAdminTab(t)}
              pendingOrdersCount={pendingOrdersCount}
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
              {adminTab === 'dashboard' && (
                <DashboardView
                  products={products}
                  orders={orders}
                  onNavigateTab={(t) => setAdminTab(t)}
                  onOpenAddProductModal={() => {
                    setAdminTab('products');
                    setIsAddProductModalOpen(true);
                  }}
                  onSeedDatabase={handleSeed}
                  isSeeding={isSeeding}
                />
              )}

              {adminTab === 'products' && (
                <ProductsCatalogView
                  products={products}
                  onRefresh={fetchData}
                  isAddModalOpen={isAddProductModalOpen}
                  setIsAddModalOpen={setIsAddProductModalOpen}
                />
              )}

              {adminTab === 'categories' && <CategoryManagerView />}

              {adminTab === 'media' && <MediaUploadsView />}

              {adminTab === 'orders' && (
                <CustomerOrdersView orders={orders} onRefresh={fetchData} />
              )}

              {adminTab === 'woocommerce' && (
                <WooCommerceHubView products={products} onRefreshProducts={fetchData} />
              )}

              {adminTab === 'security' && <SecurityAuditLogsView />}

              {adminTab === 'hamper' && (
                <HamperSettingsView
                  settings={hamperSettings}
                  onSave={(s) => setHamperSettings(s)}
                />
              )}
            </main>
          </div>
        </div>
      ) : (
        // ==================== CUSTOMER ARTISAN STOREFRONT ====================
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <Header
            products={products}
            categories={categories}
            onSelectProduct={handleOpenProduct}
            onSelectCategory={(slug) => handleNavigate('category', slug)}
            onNavigate={handleNavigate}
            activeView={storeSubView}
          />

          {/* Sub-view Content */}
          <main className="flex-1">
            {storeSubView === 'track' ? (
              <OrderTrackingView
                initialOrderNumber={trackingOrderNumber}
                onNavigateHome={() => handleNavigate('home')}
              />
            ) : storeSubView === 'orders' || storeSubView === 'history' ? (
              <CustomerOrderHistoryView
                products={products}
                onNavigate={handleNavigate}
                onSelectProduct={handleOpenProduct}
                onOpenAuthModal={() => setIsAdminLoginOpen(true)}
              />
            ) : storeSubView === 'about' ? (
              <AboutView />
            ) : storeSubView === 'contact' ? (
              <ContactView />
            ) : storeSubView === 'faq' ? (
              <div className="py-8">
                <FaqAccordion />
              </div>
            ) : storeSubView === 'wishlist' ? (
              <WishlistView
                products={products}
                onViewProduct={handleOpenProduct}
                onNavigate={handleNavigate}
              />
            ) : (
              // Main Home View
              <div className="space-y-10 pb-16">
                {/* Hero Carousel Section */}
                <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-4 sm:pt-6">
                  <HeroCarousel onNavigate={handleNavigate} />
                </section>

                {/* Build Your Own Hamper CTA */}
                {hamperSettings.enabled && (
                <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
                  <div
                    onClick={() => setIsHamperBuilderOpen(true)}
                    className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${hamperSettings.banner.gradient} p-6 sm:p-8 cursor-pointer group hover:shadow-2xl transition-all duration-300`}
                  >
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tMSA4bC04LTggMS40LTEuNEwyMyAzNS42bDctNyAxLjQgMS40TDI0IDM4aDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
                    <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl sm:text-5xl shadow-lg group-hover:scale-110 transition-transform">
                        {hamperSettings.banner.emoji}
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <h3 className="text-xl sm:text-2xl font-bold text-white font-display">
                          {hamperSettings.banner.title}
                        </h3>
                        <p className="text-sm text-white/80 mt-1">
                          {hamperSettings.banner.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-white text-[var(--primary)] font-bold text-sm shadow-lg group-hover:bg-white/90 transition-colors">
                        <span>Start Building</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </section>
                )}

                {/* Category Stories Circular Bubbles */}
                <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
                  <CategoryStories
                    selectedCategory={selectedCategorySlug}
                    onSelectCategory={(slug) => {
                      setSelectedCategorySlug(slug);
                      const el = document.getElementById('artisan-products-grid');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                </section>

                {/* Category Hero Banner if specific category is selected */}
                {selectedCategorySlug && selectedCategorySlug !== 'all' && (
                  <CategoryHero
                    selectedCategorySlug={selectedCategorySlug}
                    onSelectSubCategory={(slug) => {
                      setSelectedCategorySlug(slug);
                      setSelectedSubcategorySlug('all');
                    }}
                    onResetCategory={() => {
                      setSelectedCategorySlug('all');
                      setSelectedSubcategorySlug('all');
                    }}
                  />
                )}

                {/* Trust & Hygiene Strip */}
                <TrustStrip />

                {/* Products Catalog Section */}
                <section
                  id="artisan-products-grid"
                  className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold mb-2">
                        <Cake className="w-3.5 h-3.5" />
                        <span>Fresh Baked Today</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
                        Artisan Celebration Cakes
                      </h2>
                      <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                        Handcrafted with pure Belgian chocolate, real dairy cream, and 100% eggless vegetarian options.
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2">
                      {searchQuery && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold">
                          <Search className="w-3 h-3" />
                          <span>Results for &ldquo;{searchQuery}&rdquo;</span>
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                            title="Clear search"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="text-xs text-[var(--text-muted)]">
                        Showing <strong className="text-[var(--text-main)]">{filteredStoreProducts.length}</strong> recipes
                      </div>
                    </div>
                  </div>

                  {/* Category Pills & Quick Filter Bar */}
                  <CategoryPills
                    categories={categories}
                    selectedCategory={selectedCategorySlug}
                    selectedSubcategory={selectedSubcategorySlug}
                    onSelectCategory={(slug) => {
                      setSelectedCategorySlug(slug);
                      setSelectedSubcategorySlug('all');
                    }}
                    onSelectSubcategory={(subSlug) => setSelectedSubcategorySlug(subSlug)}
                  />

                  {/* Product Cards Grid */}
                  {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6 py-12">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div
                          key={i}
                          className="h-80 rounded-2xl bg-[var(--bg-subtle)] animate-pulse border border-[var(--border)]"
                        />
                      ))}
                    </div>
                  ) : filteredStoreProducts.length === 0 ? (
                    <div className="p-16 text-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl space-y-3">
                      {selectedCategorySlug === 'wishlist' ? (
                        <Heart className="w-10 h-10 text-rose-500 fill-rose-500/20 mx-auto animate-pulse" />
                      ) : (
                        <Cake className="w-10 h-10 text-[var(--text-subtle)] mx-auto" />
                      )}
                      <h3 className="text-base font-bold text-[var(--text-main)]">
                        {selectedCategorySlug === 'wishlist'
                          ? 'Your wishlist is empty'
                          : 'No recipes found'}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                        {selectedCategorySlug === 'wishlist'
                          ? 'Click the heart icon on any artisan cake card to save your favorites for later celebration orders.'
                          : 'No celebration cakes match this filter. Try selecting "All Artisan Recipes" or searching for chocolate.'}
                      </p>
                      <button
                        onClick={() => setSelectedCategorySlug('all')}
                        className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold cursor-pointer"
                      >
                        Explore All Cakes
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
                      {filteredStoreProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onViewProduct={handleOpenProduct}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* FAQ Accordion Section */}
                <FaqAccordion />
              </div>
            )}
          </main>

          {/* Recently Viewed Products Slider */}
          <RecentlyViewed
            products={products}
            recentIds={recentlyViewedIds}
            onViewProduct={handleOpenProduct}
            onClearRecent={handleClearRecentlyViewed}
          />

          {/* Footer */}
          <Footer onNavigate={handleNavigate} />

          {/* Native Mobile App Style Bottom Navigation & Floating Quick Cart */}
          <MobileBottomNav
            activeView={storeSubView}
            onNavigate={handleNavigate}
            onOpenAuthModal={() => setIsAdminLoginOpen(true)}
          />

          {/* Cart Drawer */}
          <CartDrawer onCheckout={() => setIsCheckoutOpen(true)} />

          {/* Custom Hamper Builder */}
          <CustomHamperBuilder
            products={products}
            isOpen={isHamperBuilderOpen}
            onClose={() => setIsHamperBuilderOpen(false)}
            onOpenCheckout={() => setIsCheckoutOpen(true)}
            settings={hamperSettings}
          />

          {/* Checkout Modal */}
          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            onOrderSuccess={handleOrderSuccess}
          />

          {/* Admin Login Modal */}
          <AdminLoginModal
            isOpen={isAdminLoginOpen}
            onClose={() => setIsAdminLoginOpen(false)}
            onSuccess={() => setActiveView('admin')}
          />
        </div>
      )}

      {/* Real-time Order Status Push & Toast Notifications */}
      <OrderNotificationToasts
        onNavigateToTrack={(orderNum) => handleNavigate('track', orderNum)}
      />
    </div>
  );
}
