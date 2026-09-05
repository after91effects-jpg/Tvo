import { db } from './db';

export function getAddons() {
  const rows = db.prepare('SELECT id, name, description, price, image FROM addons WHERE active=1 ORDER BY name').all() as any[];
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description || '', price: r.price, image: r.image || '' }));
}
