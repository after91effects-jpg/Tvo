'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '../../lib/types';
import { ProductCard } from './ProductCard';

interface RelatedProductsProps {
  related?: Array<{ id: string; name: string; slug: string; price: number }>;
  onViewProduct: (productId: string) => void;
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({ related, onViewProduct }) => {
  if (!Array.isArray(related) || related.length === 0) return null;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = related.map((r) => r.id).filter(Boolean);
    if (ids.length === 0) { setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/products?ids=${ids.join(',')}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data) => {
        if (cancelled) return;
        const received = (data?.products || []).filter((p: Product) =>
          ids.includes(String(p.id))
        );
        setProducts(received);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [related]);

  if (loading) {
    return (
      <div className="mt-10 pt-8 border-t border-[var(--border)]">
        <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider mb-4">You May Also Like</h3>
        <div className="text-xs text-[var(--text-muted)] py-4">Loading related products...</div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-[var(--border)] w-full">
      <h3 className="text-sm sm:text-base font-bold text-[var(--text-main)] uppercase tracking-wider mb-4 flex items-center gap-2 font-display">
        You May Also Like
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onViewProduct={() => onViewProduct(product.slug || product.id)}
          />
        ))}
      </div>
    </div>
  );
};

