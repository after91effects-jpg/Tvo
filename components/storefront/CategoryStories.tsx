'use client';

import React from 'react';
import Image from 'next/image';
import { Sparkles, Heart, Flame, Gift, Cake, Coffee, Leaf, Smile, Sun, Package } from 'lucide-react';

interface CategoryStory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  badge?: string;
  isEggless?: boolean;
}

const CATEGORY_STORIES: CategoryStory[] = [
  {
    id: 'story-birthday',
    name: 'Birthday',
    slug: 'birthday',
    imageUrl: 'https://tvoflavours.com/wp-content/uploads/2026/05/Choco-Chip-Truffle-Cake.png',
    badge: 'POPULAR',
  },
  {
    id: 'story-mango',
    name: 'Mango Special',
    slug: 'mango-cakes',
    imageUrl: 'https://tvoflavours.com/wp-content/uploads/2026/08/Classic-Mango-cream-cake.png',
    badge: 'SEASONAL',
  },
  {
    id: 'story-chocolate',
    name: 'Chocolate',
    slug: 'chocolate',
    imageUrl: 'https://tvoflavours.com/wp-content/uploads/2026/05/Belgian-Chocolate-Cake.png',
    badge: '70% COCOA',
  },
  {
    id: 'story-kunafa',
    name: 'Dubai Kunafa',
    slug: 'trending-cakes',
    imageUrl: 'https://tvoflavours.com/wp-content/uploads/2026/05/Kunafa-Dubai-Cake.png',
    badge: 'VIRAL',
  },
  {
    id: 'story-fruit',
    name: 'Fresh Pineapple',
    slug: 'fruit-cakes',
    imageUrl: 'https://tvoflavours.com/wp-content/uploads/2026/05/Pineapple-Cake.png',
  },
  {
    id: 'story-anniversary',
    name: 'Anniversary',
    slug: 'anniversary',
    imageUrl: 'https://tvoflavours.com/wp-content/uploads/2026/05/Hearts-Of-Love-Chocolate-Cake.png',
  },
  {
    id: 'story-desserts',
    name: 'Pastries & Slices',
    slug: 'desserts',
    imageUrl: 'https://tvoflavours.com/wp-content/uploads/2026/05/Blueberry-Cheesecake-Pastry1.webp',
  },
  {
    id: 'story-hampers',
    name: 'Diwali Hampers',
    slug: 'hampers',
    imageUrl: 'https://tvoflavours.com/wp-content/uploads/2026/05/Golden-Bliss-Diwali-Hamper.png',
    badge: 'FESTIVE',
  },
  {
    id: 'story-rakhi',
    name: 'Rakhi Gifts',
    slug: 'rakhi-hampers',
    imageUrl: 'https://tvoflavours.com/wp-content/uploads/2026/07/Colourful-Peacock-Rakhis-With-Delightful-Treats.png',
    badge: 'SETS',
  },
  {
    id: 'story-eggless',
    name: '100% Eggless',
    slug: 'eggless',
    imageUrl: 'https://tvoflavours.com/wp-content/uploads/2026/05/Eggless-Tiramisu-Cake.png',
    isEggless: true,
  },
];

interface CategoryStoriesProps {
  selectedCategory?: string;
  onSelectCategory: (slug: string) => void;
}

export const CategoryStories: React.FC<CategoryStoriesProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="w-full overflow-x-auto py-2 scrollbar-none">
      <div className="flex items-center justify-between sm:justify-center gap-4 sm:gap-6 min-w-max px-2">
        {CATEGORY_STORIES.map((story) => {
          const isSelected = selectedCategory === story.slug;

          return (
            <button
              key={story.id}
              id={`story-btn-${story.slug}`}
              type="button"
              onClick={() => onSelectCategory(story.slug)}
              className="flex flex-col items-center gap-2 group cursor-pointer text-center focus:outline-none"
            >
              {/* Circular Avatar Container with Gradient Border */}
              <div className="relative">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2.5px] transition-all duration-300 ${
                    isSelected
                      ? 'bg-gradient-to-tr from-[#FF2B6D] via-[#FF5480] to-[#FFA07A] scale-105 shadow-[0_0_15px_rgba(255,43,109,0.5)]'
                      : 'bg-gradient-to-tr from-[#FF2B6D]/40 to-[#FF5480]/20 group-hover:from-[#FF2B6D] group-hover:to-[#FF5480] group-hover:scale-105'
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-zinc-900 border-2 border-white dark:border-zinc-900 relative shadow-inner">
                    <img
                      src={story.imageUrl}
                      alt={story.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Badge Tag */}
                {story.badge && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF2B6D] to-[#FF5480] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow-sm whitespace-nowrap">
                    {story.badge}
                  </span>
                )}

                {/* Eggless indicator dot */}
                {story.isEggless && (
                  <span
                    className="absolute top-0 right-0 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border border-emerald-500 flex items-center justify-center shadow-sm"
                    title="100% Vegetarian / Eggless"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </span>
                )}
              </div>

              {/* Title label */}
              <span
                className={`text-xs font-semibold max-w-[80px] sm:max-w-[90px] truncate transition-colors ${
                  isSelected
                    ? 'text-[var(--primary)] font-bold'
                    : 'text-[var(--text-main)] group-hover:text-[var(--primary)]'
                }`}
              >
                {story.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
