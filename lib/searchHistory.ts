import {
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
  COLLECTIONS,
} from './firebase';
import { SearchHistoryItem } from './types';

export type { SearchHistoryItem };

const ANON_STORAGE_KEY = 'confetto_search_anon_uid';
const LOCAL_HISTORY_CACHE = 'confetto_recent_searches_cache';

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

/**
 * Gets a stable identifier for search history (logged-in user UID/email or persistent local visitor ID)
 */
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

/**
 * Normalizes document ID for deterministic upsert per user + query
 */
function makeSearchDocId(userId: string, queryStr: string): string {
  const cleanUser = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanQuery = queryStr.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `sh_${cleanUser}_${cleanQuery}`.substring(0, 120);
}

/**
 * Fetches recent search history from Firestore for a given user
 */
export async function fetchUserSearchHistory(userUidOrEmail?: string | null): Promise<SearchHistoryItem[]> {
  const userId = getSearchUserId(userUidOrEmail);

  try {
    const q = query(
      collection(db, COLLECTIONS.SEARCH_HISTORY),
      where('userId', '==', userId),
      limit(20)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: SearchHistoryItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId || userId,
          query: data.query || '',
          timestamp: data.timestamp || new Date().toISOString(),
          resultCount: data.resultCount,
        };
      });

      // Sort by newest timestamp first
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Save local cache for instantaneous UI response
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_HISTORY_CACHE, JSON.stringify(items.slice(0, 10)));
        } catch (e) {
          // ignore cache write error
        }
      }

      return items.slice(0, 10);
    }
  } catch (err) {
    console.warn('Firestore search history fetch note:', err);
  }

  // Fallback to local cache if offline or on initial load
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_HISTORY_CACHE);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }
  }

  return [];
}

/**
 * Saves or updates a search query in Firestore
 */
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
    await setDoc(doc(db, COLLECTIONS.SEARCH_HISTORY, docId), {
      userId,
      query: trimmed,
      timestamp: now,
      resultCount: resultCount ?? 0,
      updatedAt: now,
    });
  } catch (err) {
    console.warn('Firestore search save note (saved locally):', err);
  }

  // Update local cache
  if (typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem(LOCAL_HISTORY_CACHE);
      let list: SearchHistoryItem[] = cachedStr ? JSON.parse(cachedStr) : [];
      list = [item, ...list.filter((x) => x.query.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
      localStorage.setItem(LOCAL_HISTORY_CACHE, JSON.stringify(list));
    } catch (e) {
      // ignore
    }
  }

  return item;
}

/**
 * Deletes a specific search query item from Firestore & cache
 */
export async function deleteSearchQueryItem(
  itemId: string,
  queryText: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.SEARCH_HISTORY, itemId));
  } catch (err) {
    console.warn('Firestore delete search item note:', err);
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
      // ignore
    }
  }
}

/**
 * Clears all search history for the user from Firestore & cache
 */
export async function clearUserSearchHistory(userUidOrEmail?: string | null): Promise<void> {
  const userId = getSearchUserId(userUidOrEmail);

  try {
    const q = query(
      collection(db, COLLECTIONS.SEARCH_HISTORY),
      where('userId', '==', userId),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Firestore clear search history note:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_HISTORY_CACHE);
    } catch (e) {
      // ignore
    }
  }
}
