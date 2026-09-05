'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  showValue?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  count?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 15,
  showValue = false,
  interactive = false,
  onChange,
  count,
}) => {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex items-center">
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= Math.round(displayRating);

          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange && onChange(starValue)}
              onMouseEnter={() => interactive && setHoverRating(starValue)}
              onMouseLeave={() => interactive && setHoverRating(null)}
              className={`${
                interactive ? 'cursor-pointer hover:scale-110 p-0.5' : 'cursor-default'
              } transition-transform focus:outline-none`}
              aria-label={`${starValue} Stars`}
            >
              <Star
                size={size}
                className={`${
                  isFilled
                    ? 'fill-[#d49a3d] text-[#d49a3d]'
                    : 'fill-transparent text-gray-300 dark:text-neutral-600'
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-xs font-semibold text-[var(--text-main)] ml-1">
          {rating.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-xs text-[var(--text-subtle)] ml-0.5">
          ({count})
        </span>
      )}
    </div>
  );
};
