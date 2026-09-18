'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Cake,
} from 'lucide-react';
import { StarRating } from '../common/StarRating';

interface AdminReview {
  id: number;
  product_id: number;
  customer_id?: number | null;
  customer_name: string;
  rating: number;
  comment: string;
  photo?: string | null;
  verified: number;
  status: 'pending' | 'approved' | 'rejected' | 'spam' | 'trash';
  created_at: string;
  product_name?: string;
  product_slug?: string;
  product_image?: string;
}

export const ReviewModerationView: React.FC = () => {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('type', 'reviews');
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      const res = await fetch(`/api/admin?${params.toString()}`);
      const data = await res.json();
      if (data.reviews && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      } else {
        setReviews([]);
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Failed to load reviews from server' });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleModerate = async (id: number, newStatus: 'approved' | 'rejected') => {
    try {
      setActionLoadingId(id);
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reviews',
          action: 'moderate',
          id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedbackMessage({
          type: 'success',
          text: `Review #${id} marked as ${newStatus}.`,
        });
        // Optimistically update status
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
        );
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Failed to update review status' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Error contacting moderation server' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Are you sure you want to permanently delete review #${id}?`)) return;

    try {
      setActionLoadingId(id);
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reviews',
          action: 'delete',
          id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedbackMessage({ type: 'success', text: `Review #${id} deleted.` });
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Failed to delete review' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Error deleting review' });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  // Counts across the loaded set
  const pendingCount = reviews.filter((r) => r.status === 'pending').length;
  const approvedCount = reviews.filter((r) => r.status === 'approved').length;
  const rejectedCount = reviews.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold mb-2">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Customer Feedback</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
            Reviews & Ratings Moderation
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Review customer feedback, approve verified buyer reviews, and maintain bakery quality standards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchReviews()}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Total Reviews
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--text-main)] mt-1">
            {reviews.length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Pending Moderation
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-amber-700 dark:text-amber-400 mt-1">
            {pendingCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Approved Public
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-700 dark:text-emerald-400 mt-1">
            {approvedCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            Rejected / Hidden
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-rose-700 dark:text-rose-400 mt-1">
            {rejectedCount}
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-600'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Toolbar: Status Filter Tabs & Search */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Pill Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {([
            { id: 'all' as ReviewStatusFilter, label: 'All Reviews' },
            { id: 'pending' as ReviewStatusFilter, label: 'Pending', badge: pendingCount },
            { id: 'approved' as ReviewStatusFilter, label: 'Approved', badge: approvedCount },
            { id: 'rejected' as ReviewStatusFilter, label: 'Rejected', badge: rejectedCount },
          ] as { id: ReviewStatusFilter; label: string; badge?: number }[]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-accent)]'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    statusFilter === tab.id ? 'bg-white text-[var(--primary)]' : 'bg-[var(--border)] text-[var(--text-main)]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviewer or product..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <Search className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Reviews Moderation List */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span>Loading customer reviews...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] text-center space-y-3">
          <MessageSquare className="w-12 h-12 text-[var(--text-subtle)] mx-auto" />
          <h3 className="text-sm font-bold text-[var(--text-main)]">
            No reviews found
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            {statusFilter === 'pending'
              ? 'No customer reviews are currently waiting for moderation.'
              : 'No customer reviews match your selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-3"
            >
              {/* Card Header: Product & Reviewer Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[var(--border)]/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-bold text-sm shrink-0">
                    <Cake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                      <span>{rev.product_name || `Product #${rev.product_id}`}</span>
                      {rev.product_slug && (
                        <a
                          href={`/product/${rev.product_slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--text-subtle)] hover:text-[var(--primary)] transition-colors"
                          title="View Product on Storefront"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                      <span>By <strong>{rev.customer_name}</strong></span>
                      <span>•</span>
                      <span>{new Date(rev.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {Boolean(rev.verified) && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.2 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified Buyer</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <StarRating rating={rev.rating} size={15} showValue />
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      rev.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : rev.status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}
                  >
                    {rev.status}
                  </span>
                </div>
              </div>

              {/* Review Comment */}
              <p className="text-xs text-[var(--text-main)] leading-relaxed bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border)]/50">
                &ldquo;{rev.comment}&rdquo;
              </p>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-[var(--text-subtle)]">
                  Review ID: #{rev.id} {rev.customer_id ? `• Customer ID: #${rev.customer_id}` : '• Guest submission'}
                </span>

                <div className="flex items-center gap-2">
                  {rev.status !== 'approved' && (
                    <button
                      type="button"
                      disabled={actionLoadingId === rev.id}
                      onClick={() => handleModerate(rev.id, 'approved')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}

                  {rev.status !== 'rejected' && (
                    <button
                      type="button"
                      disabled={actionLoadingId === rev.id}
                      onClick={() => handleModerate(rev.id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionLoadingId === rev.id}
                    onClick={() => handleDelete(rev.id)}
                    className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                    title="Delete Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
