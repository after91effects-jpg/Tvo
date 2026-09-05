'use client';

import React, { useEffect } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-lg mb-6">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider mb-3">
        Unexpected Application Error
      </span>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
        Something went wrong
      </h1>

      <p className="text-sm text-[var(--text-muted)] max-w-md mb-8 leading-relaxed">
        Our artisan bakery app encountered an unexpected condition. You can try refreshing the view or returning to the home storefront.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-full bg-[#FF2B6D] text-white text-xs font-bold shadow-md hover:bg-[#FF1A5B] transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/';
          }}
          className="px-5 py-2.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border)] text-xs font-bold hover:bg-[var(--bg-subtle)] transition-all flex items-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Go to Home</span>
        </button>
      </div>
    </div>
  );
}
