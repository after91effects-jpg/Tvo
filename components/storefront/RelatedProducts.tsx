'use client';

import React from 'react';
import { Product } from '../../lib/types';
import { ProductCard } from './ProductCard';

interface RelatedProductsProps {
  related?: Array<{ id: string; name: string; slug: string; price: number }>;
  allProducts: Product[];
  onViewProduct: (productId: string) => void;
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({ related, allProducts, onViewProduct }) => {
  if (!Array.isArray(related) || related.length === 0) return null;

  const relatedIds = new Set(related.map((r) => r.id).filter(Boolean));
  const matched = allProducts.filter((p) => relatedIds.has(p.id));

  if (matched.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t border-[var(--border)]">
      <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider mb-4 flex items-center gap-2">
        You May Also Like
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {matched.map((product) => (
          <ProductCard key={product.id} product={product} onViewProduct={onViewProduct} />
        ))}
      </div>
    </div>
  );
};
