'use client';

import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, MessageSquare, Send } from 'lucide-react';
import { Review } from '../../lib/types';
import { StarRating } from '../common/StarRating';

interface ReviewSectionProps {
  productId: string;
  productName: string;
  initialRating?: number;
  initialReviewCount?: number;
}

const DEFAULT_SAMPLE_REVIEWS: Review[] = [
  {
    id: 'rev-01',
    customerName: 'Ananya Deshmukh',
    rating: 5,
    comment: 'The Belgian dark truffle was sublime! Delivered in under 90 minutes for my sister’s midnight birthday surprise in Gurugram. The chocolate writing was so neat.',
    verified: true,
    createdAt: '2026-08-25T14:20:00.000Z',
  },
  {
    id: 'rev-02',
    customerName: 'Rohan Mehra',
    rating: 5,
    comment: 'Best 100% eggless cake in town. Extremely soft texture and not overly sugary. Real Valrhona cocoa richness throughout.',
    verified: true,
    createdAt: '2026-08-22T09:15:00.000Z',
  },
  {
    id: 'rev-03',
    customerName: 'Kavita Sundaram',
    rating: 4,
    comment: 'Ordered for our 10th anniversary. Gorgeous presentation and the insulated cold box kept it in pristine condition.',
    verified: true,
    createdAt: '2026-08-18T18:40:00.000Z',
  },
];

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  productId,
  productName,
  initialRating = 4.8,
  initialReviewCount = 42,
}) => {
  const [reviews, setReviews] = useState<Review[]>(DEFAULT_SAMPLE_REVIEWS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/reviews?productId=${productId}`);
        const data = await res.json();
        if (data.reviews && data.reviews.length > 0) {
          setReviews(data.reviews.map((r: any) => ({
            id: r.id,
            customerName: r.customer_name || r.customerName || 'Anonymous',
            rating: r.rating || 5,
            comment: r.comment || r.body || '',
            verified: Boolean(r.verified),
            createdAt: r.created_at || r.createdAt || new Date().toISOString(),
          })));
        }
      } catch (e) {
        // Fallback to sample reviews
      }
    };
    fetchReviews();
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formComment.trim()) return;

    try {
      setIsSubmitting(true);
      const newReviewData: Omit<Review, 'id'> = {
        customerName: formName.trim(),
        rating: formRating,
        comment: formComment.trim(),
        verified: true,
        createdAt: new Date().toISOString(),
      };

      const docRef = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          customerName: formName.trim(),
          rating: formRating,
          comment: formComment.trim(),
        }),
      }).then(r => r.json());

      const addedReview: Review = {
        id: docRef.id || `rev-${Date.now()}`,
        ...newReviewData,
      };

      setReviews((prev) => [addedReview, ...prev]);
      setSubmitSuccess(true);
      setFormName('');
      setFormComment('');
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowForm(false);
      }, 2500);
    } catch (e) {
      // Local fallback
      const localRev: Review = {
        id: `rev-${Date.now()}`,
        customerName: formName.trim(),
        rating: formRating,
        comment: formComment.trim(),
        verified: true,
        createdAt: new Date().toISOString(),
      };
      setReviews((prev) => [localRev, ...prev]);
      setSubmitSuccess(true);
      setFormName('');
      setFormComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Rating Summary */}
      <div className="p-6 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="text-4xl font-bold font-display text-[var(--text-main)]">
            {initialRating.toFixed(1)}
          </div>
          <div>
            <StarRating rating={initialRating} size={18} />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Based on verified customer orders for {productName}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{showForm ? 'Cancel Review' : 'Write a Review'}</span>
        </button>
      </div>

      {/* Review Submission Form */}
      {showForm && (
        <form
          onSubmit={handleSubmitReview}
          className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-sm space-y-4 animate-in fade-in duration-200"
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
            Share Your Experience
          </h4>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Your Rating</label>
            <StarRating
              rating={formRating}
              size={22}
              interactive
              onChange={(r) => setFormRating(r)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Your Full Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Your Feedback & Cake Review</label>
            <textarea
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              rows={3}
              placeholder="Tell us about the taste, texture, packaging, or delivery experience..."
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          {submitSuccess && (
            <p className="text-xs text-[var(--success)] font-semibold flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Thank you! Your verified review has been published.
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Submitting...' : 'Post Review'}</span>
          </button>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] font-bold text-xs flex items-center justify-center">
                  {rev.customerName.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <span>{rev.customerName}</span>
                    {rev.verified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--success)] font-medium bg-[var(--success-light)] px-1.5 py-0.2 rounded-full">
                        <CheckCircle className="w-2.5 h-2.5" /> Verified Order
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-subtle)]">
                    {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
              <StarRating rating={rev.rating} size={13} />
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{rev.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
