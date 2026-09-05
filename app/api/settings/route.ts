import { ok, err } from '../../../lib/server/api';

export const runtime = 'nodejs';
let db: any;
function getDb() {
  if (!db) db = require('../../../lib/server/db').db;
  return db;
}
export async function GET() {
  const data = getDb();
  try {
    const rows = data.prepare('SELECT key, value FROM settings').all();
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    return ok({ settings });
  } catch (e: any) {
    return err(e.message, 500);
  }
}
