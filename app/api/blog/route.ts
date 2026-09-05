import { ok, err, db } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  try {
    if (slug) {
      const post = db.prepare('SELECT * FROM blog_posts WHERE slug=? AND published=1').get(slug);
      return post ? ok(post) : err('Post not found', 404);
    }
    const posts = db.prepare("SELECT id, title, slug, category, excerpt, featured_image, author, published, created_at FROM blog_posts WHERE published=1 ORDER BY created_at DESC").all();
    return ok({ posts });
  } catch (e: any) { return err(e.message, 500); }
}
