import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ok, err, requireAdmin } from '../../../../lib/server/api';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_VIDEO_UPLOAD_SIZE_BYTES,
  validateMagicBytes,
  validateVideoMagicBytes,
} from '../../../../lib/uploadValidation';

export const runtime = 'nodejs';

const PRODUCT_IMAGE_DIR = path.join(process.cwd(), 'public', 'uploads', 'product-images');
const PRODUCT_VIDEO_DIR = path.join(process.cwd(), 'public', 'uploads', 'product-videos');

// Only these subdirectories are ever managed (or deleted) through this endpoint.
const MANAGED_DIRS: Record<string, string> = {
  'product-images': PRODUCT_IMAGE_DIR,
  'product-videos': PRODUCT_VIDEO_DIR,
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeManagedPath(url: string, wantedKind?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const decoded = decodeURIComponent(url.trim()).replace(/\\/g, '/');
  // Only touch paths that live under the app-managed product media dirs.
  let match: RegExpMatchArray | null;
  let dir: string;
  if (wantedKind === 'video') {
    match = decoded.match(/^\/uploads\/product-videos\/([^/?#]+)$/);
    dir = PRODUCT_VIDEO_DIR;
  } else {
    match = decoded.match(/^\/uploads\/product-images\/([^/?#]+)$/);
    dir = PRODUCT_IMAGE_DIR;
  }
  if (!match) return null;
  const base = path.basename(match[1]);
  if (!base || base.includes('..') || base.includes('/')) return null;
  return path.join(dir, base);
}

export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get('kind') === 'video' ? 'video' : 'image';
    const folder = url.searchParams.get('folder');
    const contentType = req.headers.get('content-type') || '';

    let buffer: Buffer;
    let originalName = kind === 'video' ? 'upload.mp4' : 'upload.webp';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return err('No media file provided in upload request.', 400);
      originalName = file.name || originalName;
      buffer = Buffer.from(await file.arrayBuffer());
    } else if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const fileData = body.fileDataUrl || body.dataUrl || '';
      if (!fileData || typeof fileData !== 'string') return err('No valid media data provided.', 400);
      originalName = body.fileName || originalName;
      const mimePrefix = kind === 'video' ? 'video' : 'image';
      const base64Data = fileData.replace(new RegExp(`^data:${mimePrefix}\\/[a-z0-9.+]+;base64,`), '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      return err('Unsupported content type. Send multipart/form-data or application/json.', 400);
    }

    if (buffer.length === 0) return err('The uploaded file is empty.', 400);

    // ---- Server-side validation (independent of client checks) ----
    const sizeLimit = kind === 'video' ? MAX_VIDEO_UPLOAD_SIZE_BYTES : MAX_UPLOAD_SIZE_BYTES;
    if (buffer.length > sizeLimit) {
      return err(kind === 'video'
        ? 'Video exceeds the 50MB file size limit.'
        : 'Image exceeds the 10MB file size limit.', 400);
    }

    const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';

    if (kind === 'video') {
      if (!['.mp4', '.webm'].includes(ext)) {
        return err(`Unsupported video extension (${ext || 'none'}). Only MP4 and WEBM are permitted.`, 400);
      }
      const magic = validateVideoMagicBytes(new Uint8Array(buffer.subarray(0, 16)));
      if (!magic.valid) return err(magic.error || 'Invalid or forbidden video file content.', 400);
    } else {
      if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
        return err(`Unsupported image extension (${ext || 'none'}). Only JPG, PNG, and WEBP are permitted.`, 400);
      }
      const magic = validateMagicBytes(new Uint8Array(buffer.subarray(0, 16)));
      if (!magic.valid) return err(magic.error || 'Invalid or forbidden image file content.', 400);
    }

    // ---- Safe storage: server-generated random filename, never client paths ----
    const safeExt = kind === 'video'
      ? (originalName.toLowerCase().endsWith('.webm') ? '.webm' : '.mp4')
      : (magicDetectedExt(kind, buffer));
    const randomSuffix = crypto.randomBytes(8).toString('hex');

    let targetDir = kind === 'video' ? PRODUCT_VIDEO_DIR : PRODUCT_IMAGE_DIR;
    const safeFolder = folder && MANAGED_DIRS[folder] ? folder : undefined;
    if (safeFolder) targetDir = MANAGED_DIRS[safeFolder];

    ensureDir(targetDir);
    const safeFileName = `${kind === 'video' ? 'vid' : 'img'}_${Date.now()}_${randomSuffix}${safeExt}`;
    const filePath = path.join(targetDir, safeFileName);

    // Refuse to run or dereference anything we did not generate.
    fs.writeFileSync(filePath, buffer);

    const container = safeFolder || (kind === 'video' ? 'product-videos' : 'product-images');
    const publicUrl = `/uploads/${container}/${safeFileName}`;

    return ok({
      ok: true,
      url: publicUrl,
      fileName: safeFileName,
      kind,
      sizeBytes: buffer.length,
    });
  } catch (error: any) {
    return err(error.message || 'Media upload processing failed.', 500);
  }
}

export async function DELETE(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const body = await req.json().catch(() => ({}));
    const target = safeManagedPath(body.url || body.fileName, body.kind);
    if (!target) {
      return ok({ ok: true, deleted: false, reason: 'not-managed' });
    }
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    return ok({ ok: true, deleted: true });
  } catch (error: any) {
    return err(error.message || 'Media delete failed.', 500);
  }
}

function magicDetectedExt(kind: string, buffer: Buffer): string {
  if (kind === 'image') {
    const bytes = new Uint8Array(buffer.subarray(0, 16));
    const magic = validateMagicBytes(bytes);
    if (magic.valid) {
      if (magic.detectedType === 'jpeg') return '.jpg';
      if (magic.detectedType === 'png') return '.png';
      if (magic.detectedType === 'webp') return '.webp';
    }
  }
  // File was already validated then; this is a safe fallback.
  return '.webp';
}