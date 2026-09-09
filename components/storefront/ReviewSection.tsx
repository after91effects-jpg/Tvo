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

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  productId,
  productName,
  initialRating = 0,
  initialReviewCount = 0,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/reviews?product_id=${productId}`);
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
        // No reviews available; leave the section empty
      }
    };
    fetchReviews();
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formComment.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          customer_name: formName.trim(),
          rating: formRating,
          comment: formComment.trim(),
        }),
      });
      const data = await res.json();

      if (!data.ok || !res.ok) {
        setSubmitError(data?.message || 'Unable to submit your review. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSubmitSuccess(true);
      setFormName('');
      setFormComment('');
      setFormRating(5);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowForm(false);
      }, 2500);
    } catch (e) {
      setSubmitError('Unable to submit your review. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Rating Summary */}
      {reviews.length > 0 && (
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
      )}

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
              Thank you! Your review has been submitted and will appear after moderation.
            </p>
          )}

          {submitError && (
            <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
              <span>✕</span>
              {submitError}
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
        {reviews.length === 0 && !showForm && (
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs text-center">
            <Star className="w-6 h-6 mx-auto mb-2 text-[var(--text-subtle)]" />
            <p className="text-xs font-semibold text-[var(--text-main)]">No reviews yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Be the first to share your experience with {productName}.
            </p>
          </div>
        )}
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
