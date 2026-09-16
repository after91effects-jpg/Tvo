import { db } from './db';

let cachedAddons: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60000;

export function getAddons() {
  const now = Date.now();
  if (cachedAddons && (now - lastCacheTime) < CACHE_TTL_MS) {
    return cachedAddons;
  }
  try {
    const rows = db.prepare('SELECT id, name, description, price, image, category FROM addons WHERE active=1 ORDER BY id ASC').all() as any[];
    cachedAddons = rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      description: r.description || '',
      price: Number(r.price) || 0,
      image: r.image || '',
      category: (r.category || 'decor').toLowerCase(),
    }));
    lastCacheTime = now;
    return cachedAddons;
  } catch {
    return cachedAddons || [];
  }
}
