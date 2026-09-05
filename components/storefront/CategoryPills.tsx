'use client';

import React from 'react';
import { Cake, Heart, Sparkles, Gift, Flame, Leaf, Coffee, Smile, Sun, Package, PartyPopper, Users, Sparkle } from 'lucide-react';
import { Category } from '../../lib/types';
import { useWishlist } from '../../context/WishlistContext';
import { MASTER_5_MAIN_CATEGORIES } from '../../lib/masterCatalogHierarchy';

interface CategoryPillsProps {
  categories?: Category[];
  selectedCategory?: string;
  selectedSubcategory?: string;
  onSelectCategory: (slug: string) => void;
  onSelectSubcategory?: (subSlug: string) => void;
}

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  cakes: <Cake className="w-4 h-4 text-[#FF2B6D]" />,
  'desserts-pastries': <Sparkles className="w-4 h-4 text-amber-500" />,
  'hampers-gifts': <Gift className="w-4 h-4 text-emerald-500" />,
  'party-supplies': <PartyPopper className="w-4 h-4 text-purple-500" />,
  'baking-store': <Package className="w-4 h-4 text-indigo-500" />,
  
  // Subcategory shortcuts
  birthday: <Cake className="w-4 h-4 text-rose-500" />,
  'birthday-cakes': <Cake className="w-4 h-4 text-rose-500" />,
  anniversary: <Heart className="w-4 h-4 text-red-500" />,
  'anniversary-cakes': <Heart className="w-4 h-4 text-red-500" />,
  chocolate: <Coffee className="w-4 h-4 text-amber-700" />,
  'chocolate-cakes': <Coffee className="w-4 h-4 text-amber-700" />,
  'mango-cakes': <Sun className="w-4 h-4 text-yellow-500" />,
  'fruit-cakes': <Sparkles className="w-4 h-4 text-amber-500" />,
  eggless: <Leaf className="w-4 h-4 text-emerald-500" />,
  'eggless-cakes': <Leaf className="w-4 h-4 text-emerald-500" />,
  pastries: <Smile className="w-4 h-4 text-pink-500" />,
  'gift-hampers': <Gift className="w-4 h-4 text-purple-500" />,
  candles: <Sparkle className="w-4 h-4 text-amber-600" />,
  'baking-tools': <Package className="w-4 h-4 text-blue-500" />,
};

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategory,
  selectedSubcategory,
  onSelectCategory,
  onSelectSubcategory,
}) => {
  const { wishlistCount } = useWishlist();

  // Find active main category in master 5
  const activeMain = MASTER_5_MAIN_CATEGORIES.find(
    (c) => c.slug === selectedCategory || (selectedCategory && selectedCategory.startsWith(c.slug))
  );

  const subcategories = activeMain?.subcategories || [];

  return (
    <div className="w-full space-y-3">
      {/* 5 Main Categories Horizontal Bar */}
      <div className="w-full overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-max">
          <button
            id="category-pill-all"
            type="button"
            onClick={() => {
              onSelectCategory('all');
              if (onSelectSubcategory) onSelectSubcategory('all');
            }}
            className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              selectedCategory === 'all' || !selectedCategory
                ? 'bg-[#FF2B6D] text-white border-[#FF2B6D] shadow-sm'
                : 'bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>All Categories</span>
          </button>

          {MASTER_5_MAIN_CATEGORIES.map((mainCat) => {
            const isSelected = selectedCategory === mainCat.slug;
            return (
              <button
                key={mainCat.id}
                id={`category-pill-${mainCat.slug}`}
                type="button"
                onClick={() => {
                  onSelectCategory(mainCat.slug);
                  if (onSelectSubcategory) onSelectSubcategory('all');
                }}
                className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF2B6D] text-white border-[#FF2B6D] shadow-sm'
                    : 'bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                {CATEGORY_ICON_MAP[mainCat.slug] || <Cake className="w-4 h-4 text-[#FF2B6D]" />}
                <span>{mainCat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory Secondary Ribbon if main category is selected */}
      {subcategories.length > 0 && (
        <div className="w-full overflow-x-auto pb-1 pt-1 scrollbar-none animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 min-w-max pl-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-subtle)] mr-1">
              Explore:
            </span>
            <button
              type="button"
              onClick={() => onSelectSubcategory && onSelectSubcategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedSubcategory === 'all' || !selectedSubcategory
                  ? 'bg-[var(--bg-accent)] text-[var(--primary)] border-[var(--primary)] font-bold'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]'
              }`}
            >
              All {activeMain?.name}
            </button>

            {subcategories.map((sub) => {
              const isSubSelected = selectedSubcategory === sub.slug;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectSubcategory && onSelectSubcategory(sub.slug)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isSubSelected
                      ? 'bg-[#FF2B6D]/10 text-[#FF2B6D] border-[#FF2B6D] font-bold'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
