import { ok, err, db } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rows = db.prepare("SELECT * FROM testimonials WHERE status='approved' ORDER BY id DESC").all();
    return ok({ testimonials: rows });
  } catch (e: any) { return err(e.message, 500); }
}
