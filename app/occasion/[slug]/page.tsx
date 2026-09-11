'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { Product } from '../../../lib/types';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { CartDrawer } from '../../../components/cart/CartDrawer';
import { MobileBottomNav } from '../../../components/layout/MobileBottomNav';
import { CheckoutModal } from '../../../components/storefront/CheckoutModal';
import { ProductCard } from '../../../components/storefront/ProductCard';
import { normalizeImageUrl, DEFAULT_BANNER_FALLBACK } from '../../../lib/imageUrl';
import { getSiteUrl } from '../../../lib/siteUrl';
import { stripHtmlAndMetadata } from '../../../lib/sanitizeDescription';
import { occasionAnalytics } from '../../../lib/analytics';

interface OccasionData {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  recurrenceType: string;
  startDate: string | null;
  endDate: string | null;
  priority: number;
  homepageSectionTitle: string | null;
  homepageSectionSubtitle: string | null;
  bannerImage: string | null;
  homepageVisibility: boolean;
}

function normalizeOccasionProducts(products: any[]): Product[] {
  return products.map((p) => ({
    ...p,
    id: String(p.id || p.slug),
    weightOptions: (Array.isArray(p.weightOptions) ? p.weightOptions : []).map((w: any) => ({
      label: w.label || `${w.weightKg ?? w.weight_kg ?? 0} kg`,
      weightKg: Number(w.weightKg ?? w.weight_kg ?? 0),
      price: Number(w.price ?? 0),
      mrp: Number(w.mrp ?? 0),
    })),
  }));
}

export default function OccasionPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug || '';

  const [occasion, setOccasion] = useState<OccasionData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/occasions?slug=${encodeURIComponent(slug)}&limit=100`);
        const data = await res.json();
        if (!mounted) return;
        if (data.occasion) {
          setOccasion(data.occasion);
          setProducts(normalizeOccasionProducts(data.products || []));
          occasionAnalytics.trackOccasionPageView(data.occasion.slug, data.occasion.name);
        } else {
          setNotFound(true);
          setOccasion(null);
          setProducts([]);
        }
      } catch {
        if (mounted) {
          setNotFound(true);
          setOccasion(null);
          setProducts([]);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    if (slug) load();
    return () => { mounted = false };
  }, [slug]);

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      try {
        const res = await fetch('/api/products?limit=1000');
        const data = await res.json();
        if (mounted && data.products) setAllProducts(data.products);
      } catch { /* ignore */ }
    };
    loadAll();
    return () => { mounted = false };
  }, []);

  const handleNavigate = useCallback((view: string, param?: string) => {
    if (view === 'category') {
      router.push(param ? `/?category=${encodeURIComponent(param)}` : '/');
    } else if (view === 'search') {
      router.push(param ? `/?q=${encodeURIComponent(param)}` : '/');
    } else if (view === 'track') {
      router.push(param ? `/?view=track&order=${encodeURIComponent(param)}` : '/?view=track');
    } else if (view === 'addresses') {
      router.push('/?view=addresses');
    } else if (view === 'about' || view === 'contact' || view === 'faq') {
      router.push(`/?view=${view}`);
    } else {
      router.push('/');
    }
  }, [router]);

  const handleOpenProduct = useCallback((productId: string) => {
    router.push(`/product/${productId}`);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-[var(--bg-app)]">
        <Header products={allProducts} onNavigate={handleNavigate} />
        <div className="flex items-center justify-center py-40">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[var(--text-muted)] font-semibold">Loading occasion...</span>
          </div>
        </div>
        <Footer onNavigate={handleNavigate} />
      </div>
    );
  }

  if (notFound || !occasion) {
    return (
      <div className="min-h-dvh bg-[var(--bg-app)]">
        <Header products={allProducts} onNavigate={handleNavigate} />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <Package className="w-14 h-14 text-[var(--text-subtle)] mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-display text-[var(--text-main)] mb-2">Occasion Not Found</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            We couldn&apos;t find this occasion. The page may have been removed or the link may be incorrect.
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
        <Footer onNavigate={handleNavigate} />
      </div>
    );
  }

  const title = occasion.homepageSectionTitle || occasion.name;
  const subtitle = occasion.homepageSectionSubtitle || occasion.description || '';
  const bannerUrl = occasion.bannerImage ? normalizeImageUrl(occasion.bannerImage) : null;

  // Build CTA: link to related category or all products
  const occasionCtaLabel = 'Shop Celebration Cakes';
  const occasionCtaHref = `/`;
  return (
    <div className="min-h-dvh bg-[var(--bg-app)]">
      <Head>
        {occasion && typeof document !== 'undefined' && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Event',
                name: occasion.name,
                description: stripHtmlAndMetadata(occasion.description || '').slice(0, 200).trim(),
                startDate: occasion.startDate,
                endDate: occasion.endDate,
                url: `${getSiteUrl()}/occasion/${occasion.slug}`,
                image: bannerUrl || `${getSiteUrl()}/images/brand/logo.png`,
                organizer: {
                  '@type': 'Bakery',
                  name: 'TVO Flavours',
                  url: getSiteUrl(),
                },
              }),
            }}
          />
        )}
      </Head>
      <Header products={allProducts} onNavigate={handleNavigate} />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <button
          onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-main)] text-xs font-bold hover:bg-[var(--bg-accent)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <section className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-[var(--border)] mb-6 sm:mb-8 min-h-[200px] sm:min-h-[260px] md:min-h-[320px] flex items-end">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover object-center"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = 'true';
                  target.src = DEFAULT_BANNER_FALLBACK;
                }
              }}
              loading="lazy"
            />
          ) : null}
          <div
            className={`absolute inset-0 ${
              bannerUrl ? 'bg-gradient-to-t from-black/70 via-black/30 to-transparent' : 'bg-[var(--primary-light)]/10'
            }`}
          />
          <div className="relative z-10 p-6 sm:p-8 md:p-10 pb-8 sm:pb-10 md:pb-12">
            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold font-display leading-tight mb-2 ${
              bannerUrl ? 'text-white' : 'text-[var(--text-main)]'
            }`}>
              {title}
            </h1>
            {subtitle && (
              <p className={`text-sm sm:text-base max-w-2xl line-clamp-3 ${
                bannerUrl ? 'text-white/80' : 'text-[var(--text-muted)]'
              }`}>
                {subtitle}
              </p>
            )}
          </div>
        </section>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-4 md:gap-6">
          {products.map((product, index) => (
             <ProductCard
               key={product.id}
               product={product}
               onViewProduct={(id: string) => {
                 occasionAnalytics.trackOccasionProductClick(occasion.slug, id, index);
                 handleOpenProduct(id);
               }}
               occasionName={occasion.name}
             />
          ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-[var(--text-subtle)] mx-auto mb-4" />
            <p className="text-sm text-[var(--text-muted)]">
              No products are currently mapped to this occasion.
            </p>
          </div>
        )}
      </main>

      <Footer onNavigate={handleNavigate} />

      <MobileBottomNav activeView="home" onNavigate={handleNavigate} />

      <CartDrawer 
        onCheckout={() => setIsCheckoutOpen(true)} 
        occasionSlug={occasion?.slug || undefined}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={(_orderNum: string) => {
          setIsCheckoutOpen(false);
          router.push('/');
        }}
        occasionSlug={occasion?.slug || undefined}
      />
    </div>
  );
}
