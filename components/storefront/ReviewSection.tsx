'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  CheckCircle2,
  MessageSquarePlus,
  Send,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { StarRating } from '../common/StarRating';
import { useAuth } from '../../context/AuthContext';

interface Review {
  id: string | number;
  customerName: string;
  rating: number;
  comment: string;
  photo?: string | null;
  verified: boolean;
  createdAt: string;
}

interface ReviewSectionProps {
  productId: string;
  productName: string;
  initialRating?: number;
  initialReviewCount?: number;
}

type SortOption = 'newest' | 'highest' | 'lowest';
type StarFilterOption = 'all' | '5' | '4' | '3' | '2' | '1';

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  productId,
  productName,
  initialRating = 0,
  initialReviewCount = 0,
}) => {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    average: number;
    distribution: Record<number, number>;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formRating, setFormRating] = useState<number>(5);
  const [formName, setFormName] = useState<string>('');
  const [formComment, setFormComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');

  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [starFilter, setStarFilter] = useState<StarFilterOption>('all');

  // Pre-fill reviewer name if customer is authenticated
  useEffect(() => {
    if (user?.name && !formName) {
      setFormName(user.name);
    }
  }, [user?.name, formName]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/reviews?product_id=${encodeURIComponent(productId)}`);
      const data = await res.json();
      if (data.reviews && Array.isArray(data.reviews)) {
        setReviews(
          data.reviews.map((r: any) => ({
            id: r.id,
            customerName: r.customer_name || r.customerName || 'Celebration Customer',
            rating: Number(r.rating) || 5,
            comment: r.comment || '',
            photo: r.photo || null,
            verified: Boolean(r.verified),
            createdAt: r.created_at || r.createdAt || new Date().toISOString(),
          }))
        );
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch {
      // Ignore network errors; empty state renders gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const cleanName = formName.trim();
    const cleanComment = formComment.trim();

    if (!cleanName || cleanName.length < 2) {
      setSubmitError('Please enter your name (at least 2 characters).');
      return;
    }
    if (cleanComment.length < 5) {
      setSubmitError('Please write at least 5 characters about your experience.');
      return;
    }
    if (cleanComment.length > 1000) {
      setSubmitError('Review comment cannot exceed 1,000 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          customer_name: cleanName,
          rating: formRating,
          comment: cleanComment,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setSubmitError(data?.error || data?.message || 'Unable to submit your review. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSubmitSuccess(true);
      setFormComment('');
      setFormRating(5);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowForm(false);
      }, 3500);
    } catch {
      setSubmitError('Connection error. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & Sort reviews
  const displayedReviews = useMemo(() => {
    let list = [...reviews];

    if (starFilter !== 'all') {
      const filterNum = Number(starFilter);
      list = list.filter((r) => r.rating === filterNum);
    }

    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'highest') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'lowest') {
      list.sort((a, b) => a.rating - b.rating);
    }

    return list;
  }, [reviews, starFilter, sortBy]);

  const effectiveAvg = stats?.average ?? (reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : initialRating);
  const effectiveCount = stats?.total ?? reviews.length;

  return (
    <div className="space-y-6">
      {/* Rating Summary Card (Shown when reviews exist) */}
      {effectiveCount > 0 ? (
        <div className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: Overall Score */}
            <div className="md:col-span-4 text-center md:text-left flex flex-col items-center md:items-start justify-center border-b md:border-b-0 md:border-r border-[var(--border)] pb-4 md:pb-0 md:pr-6">
              <div className="text-4xl sm:text-5xl font-extrabold font-display text-[var(--text-main)] tracking-tight">
                {effectiveAvg.toFixed(1)}
              </div>
              <div className="mt-2">
                <StarRating rating={effectiveAvg} size={20} />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 font-medium">
                Based on {effectiveCount} verified customer review{effectiveCount === 1 ? '' : 's'}
              </p>
            </div>

            {/* Middle: Rating Breakdown Histogram */}
            <div className="md:col-span-5 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats?.distribution?.[star] ?? reviews.filter((r) => r.rating === star).length;
                const percentage = effectiveCount > 0 ? Math.round((count / effectiveCount) * 100) : 0;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStarFilter(starFilter === String(star) ? 'all' : (String(star) as StarFilterOption))}
                    className={`w-full flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-left group cursor-pointer ${
                      starFilter === String(star) ? 'font-bold text-[var(--primary)]' : ''
                    }`}
                  >
                    <span className="w-6 text-right shrink-0 flex items-center justify-end gap-0.5">
                      <span>{star}</span>
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-[#FF2B6D] transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-right shrink-0 text-[11px] text-[var(--text-subtle)]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: Write Review CTA */}
            <div className="md:col-span-3 flex flex-col items-center md:items-end justify-center">
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>{showForm ? 'Cancel Review' : 'Write a Review'}</span>
              </button>
              <p className="text-[10px] text-[var(--text-subtle)] mt-2 text-center md:text-right">
                Delivered orders get a Verified Buyer badge
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State (with prominent Write Review button) */
        !showForm && (
          <div className="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] mx-auto flex items-center justify-center shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-main)]">
                No Customer Reviews Yet
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                Be the very first to share your celebration experience with {productName}.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>Write the First Review</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* Review Submission Form Modal / Box */}
      {showForm && (
        <form
          onSubmit={handleSubmitReview}
          className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-card)] border-2 border-[var(--primary)]/20 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                <span>Write a Review for {productName}</span>
              </h4>
              <p className="text-[11px] text-[var(--text-muted)]">
                Your authentic feedback helps other celebration planners choose the perfect cake.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Star Rating Select */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-main)] mb-1">
              Overall Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <StarRating
                rating={formRating}
                size={26}
                interactive
                onChange={(r) => setFormRating(r)}
              />
              <span className="text-xs font-semibold text-[var(--primary)]">
                {formRating === 5 && '5 Stars — Outstanding!'}
                {formRating === 4 && '4 Stars — Very Good'}
                {formRating === 3 && '3 Stars — Average'}
                {formRating === 2 && '2 Stars — Below Expectations'}
                {formRating === 1 && '1 Star — Disappointing'}
              </span>
            </div>
          </div>

          {/* Reviewer Name */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-main)] mb-1">
              Your Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              required
              maxLength={60}
              className="w-full max-w-md px-3.5 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
            />
          </div>

          {/* Review Comment Textarea with Character Counter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[var(--text-main)]">
                Your Review & Celebration Experience <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-[var(--text-subtle)]">
                {formComment.trim().length}/1000 characters
              </span>
            </div>
            <textarea
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Share how the cake tasted, freshness, moisture, decoration, sweetness balance, packaging, and delivery experience..."
              required
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all leading-relaxed"
            />
          </div>

          {/* Security & Moderation Note */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-subtle)] text-[11px] text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              All reviews are moderated for authentic content. If this item was delivered to your account, a Verified Order badge is added automatically.
            </span>
          </div>

          {/* Success Banner */}
          {submitSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Thank you! Your review has been submitted for moderation and will appear shortly.</span>
            </div>
          )}

          {/* Error Banner */}
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting Review...' : 'Submit Review'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter & Sort Bar (Visible when reviews exist) */}
      {reviews.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-1 border-b border-[var(--border)]">
          <div className="text-xs font-bold text-[var(--text-main)]">
            <span>Showing {displayedReviews.length} of {reviews.length} Reviews</span>
            {starFilter !== 'all' && (
              <span className="ml-2 text-xs font-normal text-[var(--primary)]">
                (Filtered by {starFilter} Stars)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by Star */}
            <div className="relative inline-block">
              <select
                aria-label="Filter by Star Rating"
                value={starFilter}
                onChange={(e) => setStarFilter(e.target.value as StarFilterOption)}
                className="h-8 pl-2.5 pr-7 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="all">All Stars</option>
                <option value="5">5 Stars only</option>
                <option value="4">4 Stars only</option>
                <option value="3">3 Stars only</option>
                <option value="2">2 Stars only</option>
                <option value="1">1 Star only</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[var(--text-subtle)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative inline-block">
              <select
                aria-label="Sort Reviews"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-8 pl-2.5 pr-7 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="newest">Newest First</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[var(--text-subtle)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        {displayedReviews.map((rev) => (
          <div
            key={rev.id}
            className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--primary-light)] text-[var(--primary)] font-bold text-xs flex items-center justify-center shrink-0 shadow-inner">
                  {rev.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <span>{rev.customerName}</span>
                    {rev.verified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified Order</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-subtle)] mt-0.5">
                    {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
              <StarRating rating={rev.rating} size={14} />
            </div>

            <p className="text-xs text-[var(--text-main)] leading-relaxed pl-12">
              {rev.comment}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
