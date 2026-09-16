import { describe, it, expect } from 'vitest';
import { parseVideos, deserializeProduct } from '../server/product-serializer';
import { sanitizeImagesPayload, sanitizeVideosPayload } from '../server/admin-catalog';
import {
  validateVideoFileMetadata,
  validateVideoMagicBytes,
  validateFileMetadata,
  validateMagicBytes,
  ALLOWED_VIDEO_EXTENSIONS,
  MAX_VIDEO_UPLOAD_SIZE_BYTES,
} from '../uploadValidation';
import { ProductImage, ProductVideo } from '../types';

describe('PHASE 12B-6: Video Validation', () => {
  it('accepts mp4 and webm extensions with allowed MIME types', () => {
    expect(ALLOWED_VIDEO_EXTENSIONS).toEqual(['.mp4', '.webm']);
    const mp4 = validateVideoFileMetadata('intro.mp4', 'video/mp4', 1024);
    const webm = validateVideoFileMetadata('intro.webm', 'video/webm', 1024);
    expect(mp4).toEqual({ valid: true });
    expect(webm).toEqual({ valid: true });
  });

  it('rejects wrong extensions, wrong MIME, and oversized files', () => {
    expect(validateVideoFileMetadata('clip.mov', 'video/mp4', 1024).valid).toBe(false);
    expect(validateVideoFileMetadata('clip.mp4', 'text/javascript', 1024).valid).toBe(false);
    expect(validateVideoFileMetadata('clip.mp4', 'video/mp4', 0).valid).toBe(false);
    expect(validateVideoFileMetadata('clip.mp4', 'video/mp4', MAX_VIDEO_UPLOAD_SIZE_BYTES + 1).valid).toBe(false);
  });

  it('rejects executable and script magic bytes before format check', () => {
    const exe = validateVideoMagicBytes([0x4D, 0x5A, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const elf = validateVideoMagicBytes([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const script = validateVideoMagicBytes([0x23, 0x21, 0x2F, 0x62, 0x69, 0x6E, 0x2F, 0x62, 0x61, 0x73, 0x68, 0x00]);
    expect(exe.valid).toBe(false);
    expect(exe.error).toContain('prohibited');
    expect(elf.valid).toBe(false);
    expect(script.valid).toBe(false);
  });

  it('detects real MP4 boxes and WebM EBML containers', () => {
    const mp4 = validateVideoMagicBytes([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D]);
    const webm = validateVideoMagicBytes([0x1A, 0x45, 0xDF, 0xA3, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(mp4).toEqual({ valid: true, detectedType: 'mp4' });
    expect(webm).toEqual({ valid: true, detectedType: 'webm' });
    const bogus = validateVideoMagicBytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x00]);
    expect(bogus.valid).toBe(false);
    expect(bogus.error).toContain('MP4 or WEBM');
  });
});

describe('PHASE 12B-6: Image Validation Unchanged', () => {
  it('still validates image metadata and magic bytes exactly as before', () => {
    expect(validateFileMetadata('a.jpg', 'image/jpeg', 100).valid).toBe(true);
    expect(validateFileMetadata('a.html', 'text/html', 100).valid).toBe(false);
    const jpeg = validateMagicBytes([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(jpeg.valid).toBe(true);
    expect(jpeg.detectedType).toBe('jpeg');
  });
});

describe('PHASE 12B-6: parseVideos', () => {
  it('returns [] for missing, null, non-JSON, and non-array values', () => {
    expect(parseVideos(undefined)).toEqual([]);
    expect(parseVideos(null)).toEqual([]);
    expect(parseVideos('null')).toEqual([]);
    expect(parseVideos('{bad json')).toEqual([]);
    expect(parseVideos({ url: 'https://ex/v.mp4' })).toEqual([]);
  });

  it('parses object entries preserving url, poster, caption, primary', () => {
    const raw = JSON.stringify([
      { url: 'https://cdn.tvof.example/videos/main.mp4', posterUrl: 'https://cdn.example/poster.jpg', caption: 'View the layers', isPrimary: true },
      { url: 'unlikely://bogus/../../evil' },
      { url: '' },
      null,
    ]);
    const videos: ProductVideo[] = parseVideos(raw);
    expect(videos.length).toBe(1);
    expect(videos[0]?.url).toBe('https://cdn.tvof.example/videos/main.mp4');
    expect(videos[0]?.posterUrl).toBe('https://cdn.example/poster.jpg');
    expect(videos[0]?.caption).toBe('View the layers');
    expect(videos[0]?.isPrimary).toBe(true);
  });

  it('supports legacy plain-string entries and strips unsafe ones', () => {
    const videos: ProductVideo[] = parseVideos(JSON.stringify(['https://cdn.example/v1.mp4', 'data:text/html,<script>']));
    expect(videos.length).toBe(1);
    expect(videos[0].url).toBe('https://cdn.example/v1.mp4');
  });
});

describe('PHASE 12B-6: Payload Sanitization', () => {
  it('sanitizes images: normalizes url, bounds alt/caption, forces single primary', () => {
    const cleaned: ProductImage[] = sanitizeImagesPayload([
      { url: '  javascript:alert(1)  ', alt: 'x', caption: 'y', isPrimary: false },
      { url: 'https://cdn.example/a.jpg', alt: 'a'.repeat(400), caption: 'c'.repeat(600), isPrimary: false },
      { url: 'https://cdn.example/b.jpg', isPrimary: true },
    ]);
    expect(cleaned.length).toBe(2);
    expect(cleaned[0]!.url).toBe('https://cdn.example/a.jpg');
    expect(cleaned[0]!.alt!.length).toBeLessThanOrEqual(300);
    expect(cleaned[0]!.caption!.length).toBeLessThanOrEqual(500);
    expect(cleaned[1]!.isPrimary).toBe(true);
    expect(cleaned.filter((i) => i.isPrimary).length).toBe(1);
  });

  it('falls back to first image as primary when none is flagged', () => {
    const cleaned = sanitizeImagesPayload([{ url: 'https://cdn.example/a.jpg' }, { url: 'https://cdn.example/b.jpg' }]);
    expect(cleaned[0].isPrimary).toBe(true);
    expect(cleaned[1].isPrimary).toBe(false);
  });

  it('handles legacy string arrays and drops path-traversal urls', () => {
    const cleaned = sanitizeImagesPayload(['https://cdn.example/a.jpg', '../../../../etc/passwd']);
    expect(cleaned.length).toBe(1);
  });

  it('sanitizes videos: url normalized, poster/caption bounded, unsafe dropped', () => {
    const cleaned = sanitizeVideosPayload([
      { url: 'https://cdn.example/v.mp4', posterUrl: 'https://cdn.example/p.jpg', caption: 'ok', isPrimary: true },
      { url: 'file:///etc/passwd' },
      { url: '' },
    ]);
    expect(cleaned.length).toBe(1);
    expect(cleaned[0].url).toBe('https://cdn.example/v.mp4');
    expect(cleaned[0].posterUrl).toBe('https://cdn.example/p.jpg');
    expect(cleaned[0].caption).toBe('ok');
  });
});

describe('PHASE 12B-6: Serializer Integration', () => {
  it('deserializeProduct emits videos and rich image metadata', () => {
    const row = {
      id: 10213,
      sku: 'CK-VIDEO-001',
      name: 'Layered Velvet Cake',
      slug: 'layered-velvet-cake',
      short_description: 'Show-stopping velvet layers',
      description: 'Velvet sponge with cream cheese frosting.',
      regular_price: 999,
      sale_price: 899,
      stock: 15,
      low_stock_threshold: 4,
      stock_status: 'in_stock',
      category_id: 1,
      variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 899, mrp: 999 }] }),
      images_json: JSON.stringify([
        { url: 'https://cdn.example/main.jpg', alt: 'Front view', caption: 'Signature finish', isPrimary: true },
        { url: 'https://cdn.example/side.jpg', alt: 'Side view', isPrimary: false },
      ]),
      videos_json: JSON.stringify([
        { url: 'https://cdn.example/reel.mp4', posterUrl: 'https://cdn.example/poster.jpg', caption: 'See the slice', isPrimary: true },
      ]),
    };
    const product = deserializeProduct(row as any);
    expect(product?.videos).toBeDefined();
    expect(product!.videos!.length).toBe(1);
    expect(product!.videos![0]!.url).toBe('https://cdn.example/reel.mp4');
    expect(product!.videos![0]!.caption).toBe('See the slice');

    // Exactly one primary image; the first unflagged image does NOT claim primary.
    const primary = product!.images.filter((i: any) => i.isPrimary);
    expect(primary.length).toBe(1);
    expect(product!.images[0]!.alt).toBe('Front view');
    expect(product!.images[0]!.caption).toBe('Signature finish');
  });

  it('keeps first image primary for legacy rows without any marker', () => {
    const row = {
      id: 10214,
      sku: 'CK-LEGACY-001',
      name: 'Legacy Cake',
      slug: 'legacy-cake',
      regular_price: 500,
      sale_price: 450,
      stock: 10,
      stock_status: 'in_stock',
      images_json: JSON.stringify(['https://cdn.example/one.jpg', 'https://cdn.example/two.jpg']),
    };
    const product = deserializeProduct(row as any);
    expect(product!.images.length).toBe(2);
    expect(product!.images[0]!.isPrimary).toBe(true);
    expect(product!.images[1]!.isPrimary).toBe(false);
    expect(product!.videos).toEqual([]);
  });

  it('duplicate INSERT includes videos_json column wiring', async () => {
    const src = await import('../server/admin-catalog');
    const callExpr = src.duplicateProduct.toString();
    expect(callExpr).toContain('videos_json');
    expect(callExpr).toContain('images_json');
  });
});