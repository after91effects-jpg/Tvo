import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ok, err } from '../../../lib/server/api';
import { validateMagicBytes, ALLOWED_IMAGE_EXTENSIONS, MAX_UPLOAD_SIZE_BYTES } from '../../../lib/uploadValidation';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let buffer: Buffer;
    let originalName = 'upload.webp';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return err('No image file provided in upload request.', 400);
      }
      originalName = file.name || 'upload.webp';
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const fileData = body.fileDataUrl || body.image || body.dataUrl || '';
      if (!fileData || typeof fileData !== 'string') {
        return err('No valid image data provided.', 400);
      }
      originalName = body.fileName || body.name || 'upload.webp';
      const base64Data = fileData.replace(/^data:image\/[a-z0-9.+]+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      return err('Unsupported content type. Send multipart/form-data or application/json.', 400);
    }

    // Size validation
    if (buffer.length === 0) {
      return err('The uploaded image file is empty.', 400);
    }
    if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
      return err('The image exceeds the 10MB file size limit.', 400);
    }

    // Extension validation
    const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '.webp';
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      return err(`Unsupported file extension (${ext}). Only JPG, PNG, and WEBP are permitted.`, 400);
    }

    // Magic bytes verification
    const headerBytes = new Uint8Array(buffer.subarray(0, 16));
    const magicResult = validateMagicBytes(headerBytes);
    if (!magicResult.valid) {
      return err(magicResult.error || 'Invalid or forbidden image file content.', 400);
    }

    // Generate safe filename and write to public/uploads/custom-designs
    const safeExt = magicResult.detectedType === 'jpeg' ? '.jpg' : magicResult.detectedType === 'png' ? '.png' : '.webp';
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const safeFileName = `design_${Date.now()}_${randomSuffix}${safeExt}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'custom-designs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/custom-designs/${safeFileName}`;
    return ok({
      ok: true,
      url: publicUrl,
      fileName: safeFileName,
      sizeBytes: buffer.length,
      detectedType: magicResult.detectedType,
    });
  } catch (error: any) {
    return err(error.message || 'Image upload processing failed.', 500);
  }
}
