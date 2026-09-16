export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: 'jpeg' | 'png' | 'webp';
}

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Validates a file's name/extension, browser MIME type, and size.
 */
export function validateFileMetadata(fileName: string, mimeType: string, sizeBytes: number): ValidationResult {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, error: 'A file must be selected.' };
  }

  if (sizeBytes <= 0) {
    return { valid: false, error: 'The selected file is empty.' };
  }

  if (sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    return { valid: false, error: 'Image size exceeds the 10MB limit. Please choose a smaller image.' };
  }

  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) {
    return { valid: false, error: 'File has no extension. Only JPG, PNG, and WEBP are supported.' };
  }

  const extension = fileName.slice(dotIndex).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file type (${extension}). Please upload a JPG, JPEG, PNG, or WEBP image.`,
    };
  }

  const normalizedMime = (mimeType || '').toLowerCase();
  if (normalizedMime && !ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    return {
      valid: false,
      error: 'Invalid image format. Only JPG, PNG, and WEBP images are supported.',
    };
  }

  return { valid: true };
}

/**
 * Validates magic bytes / binary signatures to ensure the file is an authentic
 * JPEG, PNG, or WEBP image and strictly rejects executables or scripts.
 */
export function validateMagicBytes(bytes: Uint8Array | number[]): ValidationResult {
  if (!bytes || bytes.length < 12) {
    return { valid: false, error: 'File is too small or corrupted to be a valid image.' };
  }

  // 1. Check for known executable signatures
  // Windows MZ / PE: 0x4D 0x5A
  if (bytes[0] === 0x4D && bytes[1] === 0x5A) {
    return { valid: false, error: 'Executable files are strictly prohibited.' };
  }

  // Linux ELF: 0x7F 0x45 0x4C 0x46
  if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) {
    return { valid: false, error: 'Executable files are strictly prohibited.' };
  }

  // macOS Mach-O binaries:
  // 0xFE 0xED 0xFA 0xCE / 0xCF, or reversed 0xCE/CF 0xFA 0xED 0xFE
  if (
    (bytes[0] === 0xFE && bytes[1] === 0xED && bytes[2] === 0xFA && (bytes[3] === 0xCE || bytes[3] === 0xCF)) ||
    ((bytes[0] === 0xCE || bytes[0] === 0xCF) && bytes[1] === 0xFA && bytes[2] === 0xED && bytes[3] === 0xFE)
  ) {
    return { valid: false, error: 'Executable binary files are strictly prohibited.' };
  }

  // Shell script shebang: #! (0x23 0x21)
  if (bytes[0] === 0x23 && bytes[1] === 0x21) {
    return { valid: false, error: 'Script files are strictly prohibited.' };
  }

  // HTML / PHP / Script text prefixes
  const asciiStart = String.fromCharCode(...Array.from(bytes.slice(0, 10))).toLowerCase();
  if (
    asciiStart.startsWith('<?php') ||
    asciiStart.startsWith('<script') ||
    asciiStart.startsWith('<html') ||
    asciiStart.startsWith('<!doctype')
  ) {
    return { valid: false, error: 'Script or markup files are strictly prohibited.' };
  }

  // 2. Validate valid image signatures
  // JPEG: 0xFF 0xD8 0xFF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { valid: true, detectedType: 'jpeg' };
  }

  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  ) {
    return { valid: true, detectedType: 'png' };
  }

  // WebP: RIFF (0x52 0x49 0x46 0x46) .... WEBP (0x57 0x45 0x42 0x50)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { valid: true, detectedType: 'webp' };
  }

  return {
    valid: false,
    error: 'File content does not match a valid JPG, PNG, or WEBP image format.',
  };
}

/**
 * Validates a browser File object using both metadata and magic bytes.
 */
export async function validateImageFile(file: File): Promise<ValidationResult> {
  const metaCheck = validateFileMetadata(file.name, file.type, file.size);
  if (!metaCheck.valid) return metaCheck;

  try {
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return validateMagicBytes(bytes);
  } catch (err: any) {
    return { valid: false, error: 'Could not read file header for verification.' };
  }
}
