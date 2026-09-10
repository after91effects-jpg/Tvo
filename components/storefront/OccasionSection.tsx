'use client';

import React, { useEffect } from 'react';
import { Product } from '../../lib/types';
import { ProductCard } from './ProductCard';
import { normalizeImageUrl, DEFAULT_BANNER_FALLBACK } from '../../lib/imageUrl';
import { occasionAnalytics } from '../../lib/analytics';

interface OccasionSectionProps {
  occasion: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    recurrenceType: string;
    resolvedStartDate: string | null;
    resolvedEndDate: string | null;
    priority: number;
    homepageSectionTitle: string | null;
    homepageSectionSubtitle: string | null;
    bannerImage: string | null;
    ctaLabel: string | null;
    ctaDestination: string | null;
  };
  products: Product[];
  onViewProduct: (productId: string) => void;
  onViewAll?: () => void;
}

export const OccasionSection: React.FC<OccasionSectionProps> = ({
  occasion,
  products,
  onViewProduct,
  onViewAll,
}) => {
  useEffect(() => {
    products.forEach((product, index) => {
      occasionAnalytics.trackOccasionProductImpression(occasion.slug, product.id, index);
    });
  }, [products, occasion.slug]);

  const title = occasion.homepageSectionTitle || `Celebrate ${occasion.name}`;
  const subtitle = occasion.homepageSectionSubtitle || occasion.description || '';

  const bannerUrl = occasion.bannerImage
    ? normalizeImageUrl(occasion.bannerImage)
    : DEFAULT_BANNER_FALLBACK;

  return (
    <section className="w-full px-3 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-10">
      <div className="space-y-6">
        {/* Occasion Banner Image */}
        <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-[var(--border)] h-32 sm:h-40 md:h-48">
          <img
            src={bannerUrl}
            alt={title}
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = 'true';
                target.src = DEFAULT_BANNER_FALLBACK;
              }
            }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 md:left-8 text-white">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-display leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Products Grid using existing ProductCard */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewProduct={onViewProduct}
                occasionName={occasion.name}
              />
            ))}
          </div>
        )}

        {products.length >= 8 && onViewAll && (
          <div className="mt-8 text-center">
            <button
              onClick={onViewAll}
              className="px-6 py-3 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-bold shadow-xs hover:shadow-lg transition-all cursor-pointer"
            >
              {occasion.ctaLabel || 'View All Celebration Products'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
