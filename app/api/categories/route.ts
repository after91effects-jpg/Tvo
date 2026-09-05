import { ok, err } from '../../../lib/server/api';
import { buildTree } from '../../../lib/server/category-tree';

export const runtime = 'nodejs';
let db: any;
function getDb() {
  if (!db) db = require('../../../lib/server/db').db;
  return db;
}
export async function GET() {
  const data = getDb();
  try {
    const rows = data.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
    return ok({ categories: buildTree(rows, null), flat: rows });
  } catch (e: any) {
    return err(e.message, 500);
  }
}
