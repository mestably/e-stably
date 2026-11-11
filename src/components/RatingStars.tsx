import React from 'react';
import { Star } from 'lucide-react';
import { Review } from '../types';

/**
 * Calculates genuine average rating strictly from real user reviews.
 * If there are no reviews, rating is strictly 0 and reviews count is 0.
 */
export function getItemRating(item: { rating?: number; reviews?: Review[] } | null | undefined): { rating: number; reviewsCount: number } {
  if (!item) return { rating: 0, reviewsCount: 0 };
  const reviews = Array.isArray(item.reviews) ? item.reviews : [];
  const reviewsCount = reviews.length;
  
  if (reviewsCount === 0) {
    return { rating: 0, reviewsCount: 0 };
  }

  const validReviews = reviews.filter((r) => typeof r?.rating === 'number' && !isNaN(r.rating));
  if (validReviews.length === 0) {
    return { rating: 0, reviewsCount: 0 };
  }

  const total = validReviews.reduce((sum, r) => sum + r.rating, 0);
  const avg = Math.round((total / validReviews.length) * 10) / 10;
  return { rating: avg, reviewsCount: validReviews.length };
}

interface RatingStarsProps {
  rating?: number;
  reviewsCount?: number;
  variant?: 'badge' | 'full' | 'compact' | 'display';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showText?: boolean;
  className?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating = 0,
  reviewsCount = 0,
  variant = 'compact',
  size = 'sm',
  showCount = true,
  showText = true,
  className = ''
}) => {
  const hasReviews = reviewsCount > 0 && rating > 0;
  const roundedRating = Math.round(rating);

  const starSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const currentStarSize = starSizes[size] || starSizes.sm;

  // Variant: Badge for card corners (e.g. on Horse card, Shelter card, Stable card)
  if (variant === 'badge') {
    return (
      <div
        className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full backdrop-blur-xs text-[8px] sm:text-[9.5px] font-bold shadow-xs border ${
          hasReviews
            ? 'bg-black/60 text-amber-400 border-amber-400/30'
            : 'bg-black/50 text-slate-300 border-white/10'
        } ${className}`}
        title={hasReviews ? `التقييم الفعلي: ${rating.toFixed(1)} من 5 نجوم (${reviewsCount} تقييم)` : 'لا توجد تقييمات بعد (نجوم فارغة)'}
      >
        <Star
          className={`${currentStarSize} ${
            hasReviews ? 'fill-amber-400 text-amber-400' : 'text-slate-300 stroke-[1.5] fill-none'
          }`}
        />
        <span>{hasReviews ? rating.toFixed(1) : '0'}</span>
        {showCount && (
          <span className={`${hasReviews ? 'text-amber-200/80' : 'text-slate-400'} text-[7.5px] sm:text-[8.5px]`}>
            ({reviewsCount})
          </span>
        )}
      </div>
    );
  }

  // Variant: Compact inline (e.g. stable card list row)
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold ${
          hasReviews ? 'text-amber-500' : 'text-slate-400'
        } ${className}`}
        title={hasReviews ? `${rating.toFixed(1)} / 5 (${reviewsCount} تقييم)` : 'لا توجد تقييمات بعد'}
      >
        <Star
          className={`${currentStarSize} ${
            hasReviews ? 'fill-amber-400 text-amber-400' : 'text-slate-300 stroke-[1.5] fill-none'
          }`}
        />
        <span>{hasReviews ? rating.toFixed(1) : '0.0'}</span>
        {showCount && (
          <span className="text-slate-400 font-normal text-[9px] sm:text-[10px]">
            ({reviewsCount})
          </span>
        )}
      </div>
    );
  }

  // Variant: Full 5 stars display (e.g. inside DetailModal info section)
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5" dir="ltr">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const isFilled = hasReviews && starIndex <= roundedRating;
          return (
            <Star
              key={starIndex}
              className={`${currentStarSize} transition-colors ${
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300 stroke-[1.5] fill-none'
              }`}
            />
          );
        })}
      </div>

      {showText && (
        <div className="flex items-center gap-1 text-xs">
          {hasReviews ? (
            <>
              <span className="font-extrabold text-slate-800">{rating.toFixed(1)}</span>
              <span className="text-slate-500 font-medium">/ 5</span>
              {showCount && (
                <span className="text-slate-400 text-[11px]">
                  ({reviewsCount} {reviewsCount === 1 ? 'تقييم' : 'تقييمات'})
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 font-medium text-[11px]">
              لا توجد تقييمات بعد (0 / 5)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default RatingStars;
