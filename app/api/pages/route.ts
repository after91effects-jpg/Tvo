import { ok, err, db } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  try {
    if (slug) {
      const page = db.prepare('SELECT * FROM pages WHERE slug=? AND published=1').get(slug);
      return page ? ok(page) : err('Page not found', 404);
    }
    const pages = db.prepare('SELECT id, title, slug, published FROM pages ORDER BY title').all();
    return ok({ pages });
  } catch (e: any) {
    return err(e.message, 500);
  }
}
