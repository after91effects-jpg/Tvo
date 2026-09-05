'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  History,
  X,
  Trash2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Cake,
  ArrowUpRight,
} from 'lucide-react';
import { Product } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import {
  SearchHistoryItem,
  fetchUserSearchHistory,
  saveSearchQuery,
  deleteSearchQueryItem,
  clearUserSearchHistory,
  POPULAR_STORE_SEARCHES,
} from '../../lib/searchHistory';

interface StorefrontSearchBarProps {
  products: Product[];
  onNavigate: (view: string, param?: string) => void;
  onSelectProduct?: (productId: string) => void;
  onSearchSubmit?: (query: string) => void;
  placeholder?: string;
  isMobile?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const StorefrontSearchBar: React.FC<StorefrontSearchBarProps> = ({
  products,
  onNavigate,
  onSelectProduct,
  onSearchSubmit,
  placeholder = 'Search cakes by flavour, occasion, or name...',
  isMobile = false,
  className = '',
  autoFocus = false,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from Firestore
  const userIdentifier = user?.uid || user?.email || '';
  const loadHistory = React.useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const history = await fetchUserSearchHistory(userIdentifier || undefined);
      setRecentSearches(history);
    } catch (e) {
      console.warn('Could not load search history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userIdentifier]);

  // Initial load & when user changes
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (active) {
        await loadHistory();
      }
    });
    return () => {
      active = false;
    };
  }, [loadHistory]);

  // Outside click handler to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter products matching live query
  const queryTrimmed = searchQuery.trim().toLowerCase();
  const matchingProducts = queryTrimmed
    ? products
        .filter((p) => {
          return (
            p.name.toLowerCase().includes(queryTrimmed) ||
            p.category.toLowerCase().includes(queryTrimmed) ||
            p.shortDescription?.toLowerCase().includes(queryTrimmed) ||
            p.tags?.some((t) => t.toLowerCase().includes(queryTrimmed)) ||
            p.flavours?.some((f) => f.toLowerCase().includes(queryTrimmed))
          );
        })
        .slice(0, 5)
    : [];

  // Filter matching past searches if query is typed
  const matchingPastSearches = queryTrimmed
    ? recentSearches.filter(
        (item) =>
          item.query.toLowerCase().includes(queryTrimmed) &&
          item.query.toLowerCase() !== queryTrimmed
      )
    : [];

  const handleSelectQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    setSearchQuery(trimmed);
    setIsFocused(false);

    // Save to Firestore
    const userIdentifier = user?.uid || user?.email;
    const matchCount = products.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        p.category.toLowerCase().includes(trimmed.toLowerCase()) ||
        p.tags?.some((t) => t.toLowerCase().includes(trimmed.toLowerCase()))
    ).length;

    await saveSearchQuery(trimmed, userIdentifier, matchCount);
    // Refresh history
    loadHistory();

    if (onSearchSubmit) {
      onSearchSubmit(trimmed);
    } else {
      onNavigate('category', 'all');
      setTimeout(() => {
        const el = document.getElementById('artisan-products-grid');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      handleSelectQuery(searchQuery);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, item: SearchHistoryItem) => {
    e.stopPropagation();
    e.preventDefault();
    setRecentSearches((prev) => prev.filter((x) => x.id !== item.id));
    await deleteSearchQueryItem(item.id, item.query);
  };

  const handleClearAllHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRecentSearches([]);
    const userIdentifier = user?.uid || user?.email;
    await clearUserSearchHistory(userIdentifier);
  };

  const handleProductClick = async (product: Product) => {
    setIsFocused(false);
    // Also save product name as search history in Firestore
    const userIdentifier = user?.uid || user?.email;
    await saveSearchQuery(product.name, userIdentifier, 1);
    loadHistory();

    if (onSelectProduct) {
      onSelectProduct(product.id);
    } else {
      onNavigate('product', product.id);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[var(--text-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          id={isMobile ? 'mobile-storefront-search-input' : 'global-header-search-input'}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            loadHistory();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full pl-9 pr-9 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)]/70 text-xs text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:bg-[var(--bg-surface)] transition-all ${
            isMobile ? 'py-2.5 text-sm rounded-xl' : ''
          }`}
          autoComplete="off"
        />

        {searchQuery ? (
          <button
            type="button"
            id={isMobile ? 'mobile-clear-search-btn' : 'header-clear-search-btn'}
            onClick={() => {
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text-main)] p-1 rounded-full hover:bg-[var(--bg-subtle)] transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Focus Dropdown: Recent Searches / Suggestions / Live Results */}
      {isFocused && (
        <div
          id="storefront-search-history-dropdown"
          className={`absolute left-0 right-0 mt-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isMobile ? 'max-h-[70vh] overflow-y-auto' : 'max-h-[500px] overflow-y-auto'
          }`}
        >
          {/* STATE 1: Empty Search Input -> Display Recent Searches from Firestore & Popular Suggestions */}
          {!queryTrimmed ? (
            <div className="p-3 space-y-4">
              {/* Recent Searches Section */}
              {recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      <History className="w-3.5 h-3.5 text-[var(--primary)]" />
                      <span>Recent Searches</span>
                    </div>
                    <button
                      type="button"
                      id="clear-all-search-history-btn"
                      onClick={handleClearAllHistory}
                      className="text-[10px] font-semibold text-[var(--text-subtle)] hover:text-[var(--danger)] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Clear search history from Firestore"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear All</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    {recentSearches.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectQuery(item.query)}
                        className="group flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-[var(--bg-subtle)] text-[var(--text-main)] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <History className="w-3.5 h-3.5 text-[var(--text-subtle)] group-hover:text-[var(--primary)] shrink-0 transition-colors" />
                          <span className="font-medium truncate group-hover:text-[var(--primary)] transition-colors">
                            {item.query}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[10px] text-[var(--text-subtle)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            Search
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteHistoryItem(e, item)}
                            className="p-1 rounded-md text-[var(--text-subtle)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] transition-colors"
                            title="Remove from history"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)]/50 rounded-xl">
                  <p className="font-medium text-[var(--text-main)]">No recent searches yet</p>
                  <p className="text-[11px] text-[var(--text-subtle)] mt-0.5">
                    Your search history will appear here for fast re-ordering.
                  </p>
                </div>
              )}

              {/* Popular / Trending Confectionery Suggestions */}
              <div className="pt-2 border-t border-[var(--border)]/60">
                <div className="flex items-center gap-1.5 px-2 py-1 mb-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                  <span>Popular in Bakery</span>
                </div>

                <div className="flex flex-wrap gap-1.5 px-1">
                  {POPULAR_STORE_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleSelectQuery(term)}
                      className="px-2.5 py-1 text-xs rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] border border-[var(--border)] text-[var(--text-main)] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <TrendingUp className="w-3 h-3 text-[var(--text-subtle)]" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* STATE 2: Active Query Typed -> Show Matching Past History + Matching Products */
            <div className="p-2 space-y-2">
              {/* Direct Submit Action */}
              <button
                type="button"
                onClick={() => handleSelectQuery(searchQuery)}
                className="w-full text-left px-3 py-2 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] font-semibold text-xs hover:bg-[var(--primary)] hover:text-white transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5" />
                  <span>
                    Search for &ldquo;<strong>{searchQuery}</strong>&rdquo;
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>

              {/* Matching Past Searches from History */}
              {matchingPastSearches.length > 0 && (
                <div className="pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] px-2 py-1 flex items-center gap-1">
                    <History className="w-3 h-3 text-[var(--primary)]" />
                    <span>From your past searches</span>
                  </div>
                  <div className="space-y-0.5">
                    {matchingPastSearches.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectQuery(item.query)}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs hover:bg-[var(--bg-subtle)] text-[var(--text-main)] cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-[var(--text-subtle)] group-hover:text-[var(--primary)]" />
                          <span className="font-medium group-hover:text-[var(--primary)]">
                            {item.query}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistoryItem(e, item)}
                          className="p-1 rounded text-[var(--text-subtle)] hover:text-[var(--danger)]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Products */}
              <div className="pt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] px-2 py-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Cake className="w-3 h-3 text-[var(--primary)]" />
                    <span>Artisan Cakes & Treats</span>
                  </span>
                  <span>{matchingProducts.length} results</span>
                </div>

                {matchingProducts.length > 0 ? (
                  <div className="divide-y divide-[var(--border)]/40 mt-1">
                    {matchingProducts.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleProductClick(prod)}
                        className="w-full text-left p-2 hover:bg-[var(--bg-subtle)] rounded-xl transition-colors flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--bg-subtle)] shrink-0 border border-[var(--border)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={prod.images?.[0]?.thumbUrl || prod.images?.[0]?.url}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-[var(--text-main)] truncate group-hover:text-[var(--primary)]">
                            {prod.name}
                          </h5>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                            <span>₹{prod.weightOptions?.[0]?.price || 999}</span>
                            {prod.eggless && (
                              <span className="text-[var(--success)] font-medium">• Eggless</span>
                            )}
                            <span className="text-[var(--text-subtle)]">• {prod.category}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--text-subtle)] group-hover:text-[var(--primary)] shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                    No artisan recipes match &ldquo;{searchQuery}&rdquo;.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
