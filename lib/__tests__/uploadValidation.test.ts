import { describe, it, expect } from 'vitest';
import {
  validateFileMetadata,
  validateMagicBytes,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
} from '../uploadValidation';

describe('uploadValidation', () => {
  describe('validateFileMetadata', () => {
    it('accepts valid JPEG, PNG, and WEBP metadata', () => {
      expect(validateFileMetadata('cake.jpg', 'image/jpeg', 1024 * 50).valid).toBe(true);
      expect(validateFileMetadata('cake.jpeg', 'image/jpeg', 1024 * 50).valid).toBe(true);
      expect(validateFileMetadata('design.png', 'image/png', 1024 * 100).valid).toBe(true);
      expect(validateFileMetadata('design.webp', 'image/webp', 1024 * 20).valid).toBe(true);
    });

    it('rejects empty files', () => {
      const res = validateFileMetadata('cake.jpg', 'image/jpeg', 0);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('empty');
    });

    it('rejects files larger than 10MB', () => {
      const res = validateFileMetadata('cake.jpg', 'image/jpeg', MAX_UPLOAD_SIZE_BYTES + 1);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('10MB');
    });

    it('rejects forbidden file extensions', () => {
      expect(validateFileMetadata('cake.exe', 'image/jpeg', 5000).valid).toBe(false);
      expect(validateFileMetadata('script.sh', 'image/png', 5000).valid).toBe(false);
      expect(validateFileMetadata('cake.pdf', 'application/pdf', 5000).valid).toBe(false);
      expect(validateFileMetadata('vector.svg', 'image/svg+xml', 5000).valid).toBe(false);
      expect(validateFileMetadata('noextension', 'image/jpeg', 5000).valid).toBe(false);
    });

    it('rejects forbidden MIME types', () => {
      expect(validateFileMetadata('cake.jpg', 'application/octet-stream', 5000).valid).toBe(false);
      expect(validateFileMetadata('cake.png', 'text/html', 5000).valid).toBe(false);
    });
  });

  describe('validateMagicBytes', () => {
    it('validates authentic JPEG magic bytes', () => {
      const jpegHeader = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];
      const res = validateMagicBytes(jpegHeader);
      expect(res.valid).toBe(true);
      expect(res.detectedType).toBe('jpeg');
    });

    it('validates authentic PNG magic bytes', () => {
      const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
      const res = validateMagicBytes(pngHeader);
      expect(res.valid).toBe(true);
      expect(res.detectedType).toBe('png');
    });

    it('validates authentic WebP magic bytes', () => {
      // 'RIFF' + 4 bytes + 'WEBP'
      const webpHeader = [
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, // WEBP
      ];
      const res = validateMagicBytes(webpHeader);
      expect(res.valid).toBe(true);
      expect(res.detectedType).toBe('webp');
    });

    it('strictly rejects Windows executable (MZ header)', () => {
      const exeHeader = [0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00];
      const res = validateMagicBytes(exeHeader);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Executable');
    });

    it('strictly rejects Linux ELF executable', () => {
      const elfHeader = [0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00];
      const res = validateMagicBytes(elfHeader);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Executable');
    });

    it('strictly rejects macOS Mach-O executable', () => {
      const machoHeader = [0xfe, 0xed, 0xfa, 0xce, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
      const res = validateMagicBytes(machoHeader);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Executable');
    });

    it('strictly rejects shell scripts (#!)', () => {
      const scriptHeader = [0x23, 0x21, 0x2f, 0x62, 0x69, 0x6e, 0x2f, 0x62, 0x61, 0x73, 0x68, 0x0a];
      const res = validateMagicBytes(scriptHeader);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Script');
    });

    it('strictly rejects PHP scripts and HTML tags', () => {
      const phpHeader = Array.from(Buffer.from('<?php echo "evil"; ?>'));
      expect(validateMagicBytes(phpHeader).valid).toBe(false);

      const htmlHeader = Array.from(Buffer.from('<!doctype html><html>'));
      expect(validateMagicBytes(htmlHeader).valid).toBe(false);
    });

    it('rejects headers that are too short or corrupted', () => {
      expect(validateMagicBytes([1, 2, 3]).valid).toBe(false);
    });
  });
});
