import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

export type MediaKind = 'image' | 'video';
export function persistentMediaRoot(cwd = process.cwd()) {
  if (process.env.MEDIA_STORAGE_DIR) return path.resolve(process.env.MEDIA_STORAGE_DIR);
  const marker = cwd.lastIndexOf(`${path.sep}hbuilds${path.sep}`);
  // Hostinger's deployment directories are replaceable. Domain storage is not.
  return marker >= 0 ? path.join(cwd.slice(0, marker), 'storage', 'product-media') : path.join(cwd, 'data', 'product-media');
}
export function mediaDirectory(kind: MediaKind) {
  return path.join(persistentMediaRoot(), kind === 'video' ? 'product-videos' : 'product-images');
}
export function mediaFileCandidates(kind: MediaKind, filename: string) {
  if (!/^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|mp4|webm)$/i.test(filename)) return [];
  return [path.join(mediaDirectory(kind), filename), path.join(process.cwd(), 'public', 'uploads', kind === 'video' ? 'product-videos' : 'product-images', filename)];
}
export function serveProductMedia(req: Request, filename: string, kind: MediaKind) {
  const file = mediaFileCandidates(kind, filename).find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) return new Response('Not found', { status: 404 });
  const size = fs.statSync(file).size;
  const mime: Record<string,string> = { '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm' };
  const headers = new Headers({ 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff', 'Cache-Control':'public, max-age=31536000, immutable', 'Accept-Ranges':'bytes' });
  let start = 0; let end = size - 1; let status = 200;
  const range = req.headers.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null, { status:416, headers:{'Content-Range':`bytes */${size}`} });
    if (!match[1]) start = Math.max(0, size - Number(match[2]));
    else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return new Response(null, { status:416, headers:{'Content-Range':`bytes */${size}`} });
    status = 206;
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  }
  headers.set('Content-Length', String(Math.max(0, end - start + 1)));
  if (req.method === 'HEAD' || size === 0) return new Response(null, { status, headers });
  return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream, { status, headers });
}
