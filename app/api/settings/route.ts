import { ok, err, db } from '../../../lib/server/api';

export const runtime = 'nodejs';

// Public storefront configuration only. Credentials and internal settings must
// never be returned by this unauthenticated endpoint.
export async function GET() {
  try {
    const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('store_settings', 'hamper_settings')").all() as { key: string; value: string }[];
    return ok({ settings: Object.fromEntries(rows.map(row => [row.key, row.value])) });
  } catch {
    return err('Could not load store settings', 500);
  }
}
