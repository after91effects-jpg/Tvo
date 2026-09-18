export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'bestseller' | 'newest';

export type PriceRangeOption = 'all' | 'under-500' | '500-1000' | '1000-2000' | 'above-2000';

export type DietaryOption = 'all' | 'eggless' | 'sugar-free' | 'gluten-free';

export const SORT_LABELS: Record<SortOption, string> = {
  featured: 'Featured',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  bestseller: 'Bestsellers',
  newest: 'Newest Arrivals',
};

export const PRICE_RANGE_LABELS: { id: PriceRangeOption; label: string }[] = [
  { id: 'all', label: 'All Prices' },
  { id: 'under-500', label: 'Under ₹500' },
  { id: '500-1000', label: '₹500 – ₹1,000' },
  { id: '1000-2000', label: '₹1,000 – ₹2,000' },
  { id: 'above-2000', label: 'Above ₹2,000' },
];

export const DIETARY_LABELS: { id: DietaryOption; label: string }[] = [
  { id: 'all', label: 'All Diets' },
  { id: 'eggless', label: '100% Eggless' },
  { id: 'sugar-free', label: 'Sugar-Free' },
  { id: 'gluten-free', label: 'Gluten-Free' },
];
