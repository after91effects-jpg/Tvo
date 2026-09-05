'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  History,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Sparkles,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { Product } from '../../lib/types';
import { ProductCard } from './ProductCard';

interface RecentlyViewedProps {
  products: Product[];
  recentIds: string[];
  onViewProduct: (productId: string) => void;
  onClearRecent: () => void;
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  products,
  recentIds,
  onViewProduct,
  onClearRecent,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Filter products by recent IDs and preserve the recency order
  const recentProducts = recentIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p && p.published !== false));

  // Check scroll position to enable/disable arrow buttons
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [recentProducts.length]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 320;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (recentProducts.length === 0) {
    return null;
  }

  return (
    <section
      id="recently-viewed-section"
      className="w-full border-t border-[var(--border)] bg-[var(--bg-main)]/60 py-10 transition-colors"
      aria-label="Recently Viewed Cakes"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6">
        {/* Header with Title and Scroll Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold">
              <History className="w-3.5 h-3.5" />
              <span>Browsing History</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)] flex items-center gap-2">
              <span>Recently Viewed Cakes</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border)]">
                {recentProducts.length} {recentProducts.length === 1 ? 'item' : 'items'}
              </span>
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Quickly re-visit recipes you recently explored for your celebration.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Clear button */}
            <button
              id="clear-recently-viewed-btn"
              type="button"
              onClick={onClearRecent}
              className="px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-rose-500/10 hover:border-rose-500/30 text-[var(--text-subtle)] hover:text-rose-500 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer mr-1"
              title="Clear recently viewed history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear History</span>
            </button>

            {/* Slider Navigation Arrows */}
            <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-2xl border border-[var(--border)] shadow-xs">
              <button
                id="recently-viewed-scroll-left-btn"
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll recently viewed left"
                className="p-2 rounded-xl text-[var(--text-main)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="recently-viewed-scroll-right-btn"
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Scroll recently viewed right"
                className="p-2 rounded-xl text-[var(--text-main)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Slider Track */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-stretch gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {recentProducts.map((product) => (
            <div
              key={`recent-${product.id}`}
              className="w-[260px] sm:w-[280px] md:w-[300px] shrink-0 snap-start flex flex-col"
            >
              <ProductCard
                product={product}
                onViewProduct={onViewProduct}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
