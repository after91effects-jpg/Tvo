'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { Product } from '../../../lib/types';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { CartDrawer } from '../../../components/cart/CartDrawer';
import { MobileBottomNav } from '../../../components/layout/MobileBottomNav';
import { ProductDetailModal } from '../../../components/storefront/ProductDetailModal';
import { CheckoutModal } from '../../../components/storefront/CheckoutModal';
import { useLocalStorageJSON } from '../../../lib/useLocalStorage';

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug || '';

  const [product, setProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useLocalStorageJSON<string[]>(
    'confetto_recently_viewed_ids',
    []
  );

  const addToRecentlyViewed = useCallback(
    (productId: string) => {
      if (!productId) return;
      setRecentlyViewedIds((prev: string[]) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const filtered = safePrev.filter((id) => id !== productId);
        return [productId, ...filtered].slice(0, 5);
      });
    },
    [setRecentlyViewedIds]
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/products?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (!mounted) return;
        // /api/products?slug= returns a bare serialized product object;
        // guard against both {products:[...]} and bare-object shapes.
        const list: any[] = Array.isArray(data?.products) ? data.products : data && data.id ? [data] : [];
        if (list.length > 0) {
          const p = list[0];
          const categorySlug = p.category || p.category_slug || '';
          const tags = Array.isArray(p.tags) ? p.tags : [];
          const flavours = Array.isArray(p.flavours) ? p.flavours : [];
          const categories = Array.isArray(p.categories) ? p.categories : (categorySlug ? [categorySlug] : []);
          const subcategories = Array.isArray(p.subcategories) ? p.subcategories : (p.subcategory_slug ? [p.subcategory_slug] : []);
          let images: any[] = [];
          try {
            if (p.images) images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
            else if (p.images_json) images = typeof p.images_json === 'string' ? JSON.parse(p.images_json) : p.images_json;
          } catch { images = []; }
          if (!images.length && p.image_url) images = [{ url: p.image_url }];
          let weightOptionsArr: any[] = [];
          try {
            if (Array.isArray(p.weightOptions)) weightOptionsArr = p.weightOptions;
            else if (p.weightOptions && Array.isArray(p.weightOptions.options)) weightOptionsArr = p.weightOptions.options;
            else if (p.weight_options_json) {
              const parsed = typeof p.weight_options_json === 'string' ? JSON.parse(p.weight_options_json) : p.weight_options_json;
              weightOptionsArr = Array.isArray(parsed) ? parsed : (parsed?.options && Array.isArray(parsed.options) ? parsed.options : []);
            }
          } catch { weightOptionsArr = []; }
          const basePrice = Number(p.price ?? p.salePrice ?? p.regularPrice ?? 0);
          const baseMrp = Number(p.regularPrice ?? p.regular_price ?? (basePrice || 0));
          const badges = Array.isArray(p.badges) ? p.badges : [];
          const normalized: Product = {
            id: p.id || p.slug,
            slug: p.slug,
            name: p.name,
            sku: p.sku || '',
            shortDescription: p.shortDescription || p.short_description || p.description || '',
            description: p.description || '',
            category: categorySlug || 'cakes',
            subCategory: p.subcategory || p.subcategory_slug || (subcategories[0] ?? ''),
            categories,
            subcategories,
            tags,
            flavours,
            eggless: !!p.eggless,
            sellingUnit: p.sellingUnit || 'weight',
            weightOptions: weightOptionsArr.length ? weightOptionsArr.map((w: any) => ({
              label: w.label || w.value || `${w.weightKg || 0.5} kg`,
              weightKg: Number(w.weightKg ?? w.weight_kg ?? (parseFloat(w.label) || 0.5)),
              price: Number(w.price ?? basePrice),
              mrp: Number(w.mrp ?? baseMrp),
            })) : [{ label: '0.5 kg', weightKg: 0.5, price: basePrice, mrp: Math.max(basePrice, baseMrp) }],
            images: images.map((im: any) => (typeof im === 'string' ? { url: im } : { url: im.url, thumbUrl: im.thumbUrl, alt: im.alt })).filter((i: any) => i.url),
            rating: p.rating || 4.9,
            reviewCount: p.reviewCount || 0,
            stock: p.stock ?? 10,
            stockStatus: p.stockStatus || (p.stock > 0 ? 'in_stock' : 'out_of_stock'),
            badges,
            published: p.published !== undefined ? !!p.published : true,
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString(),
          };
          setProduct(normalized);
          addToRecentlyViewed(normalized.id);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    if (slug) load();
    return () => { mounted = false; };
  }, [slug, addToRecentlyViewed]);

  // Load full product list once for Header (search & mega menu)
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      try {
        const res = await fetch('/api/products?limit=1000');
        const data = await res.json();
        if (mounted && data.products) setProducts(data.products);
      } catch {
        // ignore
      }
    };
    loadAll();
    return () => { mounted = false; };
  }, []);

  const handleNavigate = (view: string, param?: string) => {
    if (view === 'home' || view === 'category' || view === 'search') {
      router.push('/');
    } else if (view === 'track') {
      router.push('/');
    } else if (view === 'admin') {
      router.push('/');
    } else if (view === 'wishlist') {
      router.push('/');
    } else {
      router.push('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)]">
        <Header products={products} onNavigate={handleNavigate} />
        <div className="flex items-center justify-center py-40">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[var(--text-muted)] font-semibold">Loading product...</span>
          </div>
        </div>
        <Footer onNavigate={handleNavigate} />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)]">
        <Header products={products} onNavigate={handleNavigate} />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <Package className="w-14 h-14 text-[var(--text-subtle)] mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-display text-[var(--text-main)] mb-2">Product Not Found</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Sorry, we couldn&apos;t find this product. It may have been removed or the link is incorrect.
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </button>
        </div>
        <Footer onNavigate={handleNavigate} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <Header products={products} onNavigate={handleNavigate} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <button
          onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-main)] text-xs font-bold hover:bg-[var(--bg-accent)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <ProductDetailModal
          product={product}
          isOpen={true}
          onClose={() => router.back()}
          onOpenCheckout={() => setIsCheckoutOpen(true)}
          variant="embedded"
          onBack={() => router.back()}
        />
      </main>

      <Footer onNavigate={handleNavigate} />

      <MobileBottomNav
        activeView="home"
        onNavigate={handleNavigate}
        onOpenAuthModal={() => router.push('/')}
      />

      <CartDrawer onCheckout={() => setIsCheckoutOpen(true)} />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={(_orderNum: string) => {
          setIsCheckoutOpen(false);
          router.push('/');
        }}
      />
    </div>
  );
}
