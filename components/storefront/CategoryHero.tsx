'use client';

import React from 'react';
import { ChevronRight, Sparkles, ShieldCheck, Truck, Home } from 'lucide-react';
import { MASTER_5_MAIN_CATEGORIES, MainCategoryHierarchy, HierarchySubCategory, HierarchyChildCategory } from '../../lib/masterCatalogHierarchy';

interface CategoryHeroProps {
  selectedCategorySlug: string;
  onSelectSubCategory?: (slug: string) => void;
  onResetCategory?: () => void;
}

export const CategoryHero: React.FC<CategoryHeroProps> = ({
  selectedCategorySlug,
  onSelectSubCategory,
  onResetCategory,
}) => {
  if (!selectedCategorySlug || selectedCategorySlug === 'all') {
    return null;
  }

  // Find match in Main, Sub, or Child categories
  let mainMatch: MainCategoryHierarchy | undefined;
  let subMatch: HierarchySubCategory | undefined;
  let childMatch: HierarchyChildCategory | undefined;

  for (const main of MASTER_5_MAIN_CATEGORIES) {
    if (main.slug === selectedCategorySlug || selectedCategorySlug.startsWith(main.slug)) {
      mainMatch = main;
    }
    for (const sub of main.subcategories) {
      if (sub.slug === selectedCategorySlug || selectedCategorySlug.includes(sub.slug)) {
        mainMatch = main;
        subMatch = sub;
      }
      if (sub.childCategories) {
        for (const child of sub.childCategories) {
          if (child.slug === selectedCategorySlug || selectedCategorySlug.includes(child.slug)) {
            mainMatch = main;
            subMatch = sub;
            childMatch = child;
          }
        }
      }
    }
  }

  // Fallback defaults if non-standard slug is passed
  const title = childMatch?.name || subMatch?.name || mainMatch?.name || selectedCategorySlug.replace(/-/g, ' ').toUpperCase();
  const h1 = childMatch?.h1 || subMatch?.h1 || mainMatch?.h1 || `${title} Collection`;
  const desc = childMatch?.shortDescription || subMatch?.shortDescription || mainMatch?.shortDescription || `Explore our freshly handcrafted ${title} made to order.`;
  const heroImage = childMatch?.image || subMatch?.image || mainMatch?.image || 'https://tvoflavours.com/wp-content/uploads/2026/05/Choco-Chip-Truffle-Cake.png';

  const breadcrumbs: { label: string; slug?: string }[] = [{ label: 'Home' }];
  if (mainMatch) {
    breadcrumbs.push({ label: mainMatch.name, slug: mainMatch.slug });
  }
  if (subMatch && subMatch.name !== mainMatch?.name) {
    breadcrumbs.push({ label: subMatch.name, slug: subMatch.slug });
  }
  if (childMatch && childMatch.name !== subMatch?.name) {
    breadcrumbs.push({ label: childMatch.name, slug: childMatch.slug });
  }

  const relatedChildren = subMatch?.childCategories || mainMatch?.subcategories || [];

  return (
    <div className="w-full bg-gradient-to-b from-[var(--bg-subtle)] to-[var(--bg-surface)] border-b border-[var(--border)] py-6 px-4 sm:px-6 lg:px-8 xl:px-12 mb-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-[var(--text-muted)] mb-3 flex-wrap">
          <button
            type="button"
            onClick={onResetCategory}
            className="flex items-center gap-1 hover:text-[#FF2B6D] transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Store</span>
          </button>

          {breadcrumbs.slice(1).map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3 h-3 text-[var(--text-subtle)]" />
              {crumb.slug && idx < breadcrumbs.length - 2 ? (
                <button
                  type="button"
                  onClick={() => onSelectSubCategory && onSelectSubCategory(crumb.slug!)}
                  className="hover:text-[#FF2B6D] transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="font-bold text-[var(--text-main)] truncate max-w-[200px]">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Hero Card Content */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF2B6D]/10 text-[#FF2B6D] text-[10px] font-extrabold uppercase tracking-wider">
                Category Collection
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                <Truck className="w-3 h-3" />
                <span>2-Hr Express Delivery</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-main)]">
              {h1}
            </h1>

            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
              {desc}
            </p>

            {/* Child Category Quick Switcher Pills */}
            {relatedChildren.length > 0 && (
              <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-[var(--text-subtle)] mr-1">
                  Quick Filter:
                </span>
                {relatedChildren.slice(0, 7).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSubCategory && onSelectSubCategory(item.slug)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                      selectedCategorySlug === item.slug
                        ? 'bg-[#FF2B6D] text-white border-[#FF2B6D] font-bold shadow-xs'
                        : 'bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border)] hover:border-[#FF2B6D] hover:text-[#FF2B6D]'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Thumbnail Preview */}
          <div className="hidden sm:block shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-white dark:border-neutral-800 shadow-lg relative bg-neutral-100 dark:bg-neutral-800">
              <img
                src={heroImage}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
