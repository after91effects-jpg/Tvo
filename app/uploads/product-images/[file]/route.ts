import { serveProductMedia } from '../../../../lib/server/product-media-storage';
export const runtime = 'nodejs';
export async function GET(req: Request, context: { params: Promise<{ file: string }> }) {
  return serveProductMedia(req, (await context.params).file, 'image');
}
export const HEAD = GET;
