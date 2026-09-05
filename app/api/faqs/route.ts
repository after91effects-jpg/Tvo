import { ok, err, db } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const faqs = db.prepare('SELECT id, question, answer, category FROM faqs WHERE published=1 ORDER BY sort_order').all();
    return ok({ faqs });
  } catch (e: any) { return err(e.message, 500); }
}
