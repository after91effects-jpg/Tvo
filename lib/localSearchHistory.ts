'use client';

import { SearchHistoryItem } from './types';

export type { SearchHistoryItem };

const ANON_STORAGE_KEY = 'tvoflavours_search_anon_uid';
const LOCAL_HISTORY_CACHE = 'tvoflavours_recent_searches_cache';

export const POPULAR_STORE_SEARCHES = [
  'Belgian Chocolate Truffle',
  '100% Eggless Red Velvet',
  'Fresh Exotic Fruit Gateau',
  'Lotus Biscoff Cheesecake',
  'Romantic Anniversary Hamper',
  'Dutch Truffle Chocolate',
  'Birthday Theme Cakes',
  'Tiramisu Mascarpone',
];

export function getSearchUserId(userUidOrEmail?: string | null): string {
  if (userUidOrEmail && userUidOrEmail.trim()) {
    return userUidOrEmail.trim().toLowerCase();
  }
  if (typeof window !== 'undefined') {
    try {
      let anonId = localStorage.getItem(ANON_STORAGE_KEY);
      if (!anonId) {
        anonId = 'guest_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        localStorage.setItem(ANON_STORAGE_KEY, anonId);
      }
      return anonId;
    } catch (e) {
      console.warn('Could not access localStorage for search user ID:', e);
    }
  }
  return 'guest_default';
}

function makeSearchDocId(userId: string, queryStr: string): string {
  const cleanUser = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanQuery = queryStr.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `sh_${cleanUser}_${cleanQuery}`.substring(0, 120);
}

function getHistory(userId: string): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(`tvoflavours_search_history_${userId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveHistory(userId: string, items: SearchHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`tvoflavours_search_history_${userId}`, JSON.stringify(items.slice(0, 50)));
  } catch (e) {
    console.warn('Could not save search history:', e);
  }
}

export async function fetchUserSearchHistory(userUidOrEmail?: string | null): Promise<SearchHistoryItem[]> {
  const userId = getSearchUserId(userUidOrEmail);

  try {
    const items = getHistory(userId);
    if (items.length > 0) {
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_HISTORY_CACHE, JSON.stringify(items.slice(0, 10)));
        } catch (e) {
        }
      }
      return items.slice(0, 10);
    }
  } catch (err) {
    console.warn('Local search history fetch note:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_HISTORY_CACHE);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
    }
  }

  return [];
}

export async function saveSearchQuery(
  queryText: string,
  userUidOrEmail?: string | null,
  resultCount?: number
): Promise<SearchHistoryItem | null> {
  const trimmed = queryText.trim();
  if (trimmed.length < 2) return null;

  const userId = getSearchUserId(userUidOrEmail);
  const docId = makeSearchDocId(userId, trimmed);
  const now = new Date().toISOString();

  const item: SearchHistoryItem = {
    id: docId,
    userId,
    query: trimmed,
    timestamp: now,
    resultCount: resultCount ?? 0,
  };

  try {
    const existing = getHistory(userId);
    const filtered = existing.filter(x => x.query.toLowerCase() !== trimmed.toLowerCase());
    const updated = [item, ...filtered].slice(0, 50);
    saveHistory(userId, updated);
  } catch (err) {
    console.warn('Local search save note:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem(LOCAL_HISTORY_CACHE);
      let list: SearchHistoryItem[] = cachedStr ? JSON.parse(cachedStr) : [];
      list = [item, ...list.filter((x) => x.query.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
      localStorage.setItem(LOCAL_HISTORY_CACHE, JSON.stringify(list));
    } catch (e) {
    }
  }

  return item;
}

export async function deleteSearchQueryItem(
  itemId: string,
  queryText: string
): Promise<void> {
  try {
    const userId = getSearchUserId(queryText);
    const history = getHistory(userId);
    const filtered = history.filter(x => x.id !== itemId && x.query.toLowerCase() !== queryText.toLowerCase());
    saveHistory(userId, filtered);
  } catch (err) {
    console.warn('Local delete search item note:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem(LOCAL_HISTORY_CACHE);
      if (cachedStr) {
        const list: SearchHistoryItem[] = JSON.parse(cachedStr);
        const filtered = list.filter(
          (x) => x.id !== itemId && x.query.toLowerCase() !== queryText.toLowerCase()
        );
        localStorage.setItem(LOCAL_HISTORY_CACHE, JSON.stringify(filtered));
      }
    } catch (e) {
    }
  }
}

export async function clearUserSearchHistory(userUidOrEmail?: string | null): Promise<void> {
  const userId = getSearchUserId(userUidOrEmail);

  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`tvoflavours_search_history_${userId}`);
    }
  } catch (err) {
    console.warn('Local clear search history note:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_HISTORY_CACHE);
    } catch (e) {
    }
  }
}