'use client';

import React, { useState } from 'react';
import {
  ArrowUpDown,
  Filter,
  Check,
  X,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  Leaf,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

import {
  SortOption,
  PriceRangeOption,
  DietaryOption,
  SORT_LABELS,
  PRICE_RANGE_LABELS,
  DIETARY_LABELS,
} from '../../lib/filterTypes';

export type { SortOption, PriceRangeOption, DietaryOption };
export { SORT_LABELS, PRICE_RANGE_LABELS, DIETARY_LABELS };

export interface StorefrontFilterBarProps {
  selectedSort: SortOption;
  onSelectSort: (sort: SortOption) => void;
  selectedPriceRange: PriceRangeOption;
  onSelectPriceRange: (range: PriceRangeOption) => void;
  selectedDietary: DietaryOption;
  onSelectDietary: (dietary: DietaryOption) => void;
  inStockOnly: boolean;
  onToggleInStockOnly: (inStock: boolean) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  totalResults: number;
}

export const StorefrontFilterBar: React.FC<StorefrontFilterBarProps> = ({
  selectedSort,
  onSelectSort,
  selectedPriceRange,
  onSelectPriceRange,
  selectedDietary,
  onSelectDietary,
  inStockOnly,
  onToggleInStockOnly,
  activeFilterCount,
  onClearFilters,
  totalResults,
}) => {
  return (
    <div className="w-full space-y-2.5 pb-2">
      {/* Desktop & Tablet Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        {/* Left Side: Filter Chips & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Price Range Dropdown / Quick Select */}
          <div className="relative inline-block">
            <select
              id="filter-price-range-select"
              aria-label="Filter by Price"
              value={selectedPriceRange}
              onChange={(e) => onSelectPriceRange(e.target.value as PriceRangeOption)}
              className={`h-9 pl-3 pr-8 text-xs font-semibold rounded-full border transition-colors appearance-none bg-[var(--bg-surface)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
                selectedPriceRange !== 'all'
                  ? 'border-[#FF2B6D] text-[#FF2B6D] bg-[#FF2B6D]/5'
                  : 'border-[var(--border)] text-[var(--text-main)] hover:border-[var(--primary)]'
              }`}
            >
              {PRICE_RANGE_LABELS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Dietary Select */}
          <div className="relative inline-block">
            <select
              id="filter-dietary-select"
              aria-label="Filter by Dietary Preference"
              value={selectedDietary}
              onChange={(e) => onSelectDietary(e.target.value as DietaryOption)}
              className={`h-9 pl-3 pr-8 text-xs font-semibold rounded-full border transition-colors appearance-none bg-[var(--bg-surface)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
                selectedDietary !== 'all'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-[var(--border)] text-[var(--text-main)] hover:border-emerald-500'
              }`}
            >
              {DIETARY_LABELS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* In Stock Only Pill Button */}
          <button
            id="filter-in-stock-toggle"
            type="button"
            onClick={() => onToggleInStockOnly(!inStockOnly)}
            className={`h-9 px-3.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
              inStockOnly
                ? 'bg-blue-500 text-white border-blue-500 shadow-xs'
                : 'bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${inStockOnly ? 'text-white' : 'text-[var(--text-subtle)]'}`} />
            <span>In Stock Only</span>
          </button>

          {/* Active Filter Clear Button */}
          {activeFilterCount > 0 && (
            <button
              id="filter-clear-all-btn"
              type="button"
              onClick={onClearFilters}
              className="h-9 px-3 text-xs font-semibold text-[var(--text-subtle)] hover:text-rose-500 flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset ({activeFilterCount})</span>
            </button>
          )}
        </div>

        {/* Right Side: Sorting Dropdown & Count */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span className="hidden sm:inline font-medium">Sort by:</span>
          </div>

          <div className="relative inline-block">
            <select
              id="storefront-sort-select"
              aria-label="Sort products"
              value={selectedSort}
              onChange={(e) => onSelectSort(e.target.value as SortOption)}
              className="h-9 pl-3 pr-8 text-xs font-bold rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] transition-colors appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--ring)] hover:border-[var(--primary)]"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="bestseller">Bestsellers</option>
              <option value="newest">Newest Arrivals</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active Filter Badges Ribbon (if any active) */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="font-semibold text-[var(--text-subtle)] mr-1">Active:</span>

          {selectedPriceRange !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FF2B6D]/10 text-[#FF2B6D] font-medium border border-[#FF2B6D]/20">
              Price: {PRICE_RANGE_LABELS.find((p) => p.id === selectedPriceRange)?.label}
              <button
                type="button"
                onClick={() => onSelectPriceRange('all')}
                className="hover:text-black dark:hover:text-white p-0.5"
                title="Remove price filter"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {selectedDietary !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
              Diet: {DIETARY_LABELS.find((d) => d.id === selectedDietary)?.label}
              <button
                type="button"
                onClick={() => onSelectDietary('all')}
                className="hover:text-black dark:hover:text-white p-0.5"
                title="Remove dietary filter"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {inStockOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">
              In Stock Only
              <button
                type="button"
                onClick={() => onToggleInStockOnly(false)}
                className="hover:text-black dark:hover:text-white p-0.5"
                title="Remove in-stock filter"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
