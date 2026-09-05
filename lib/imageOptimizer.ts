export interface OptimizationResult {
  fileName: string;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  savedPercent: number;
  originalDataUrl: string;
  webpDataUrl: string;
  thumbnailDataUrl: string;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface OptimizerOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 - 1.0
  thumbSize?: number;
}

/**
 * Optimizes an uploaded image using HTML5 Canvas:
 * - Strips EXIF metadata
 * - Resizes to bounding box
 * - Converts to optimized WebP format
 * - Generates high-efficiency thumbnail
 */
export async function optimizeImageFile(
  file: File,
  options: OptimizerOptions = {}
): Promise<OptimizationResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    thumbSize = 300,
  } = options;

  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not a valid image format.'));
    }

    // Limit maximum raw file size to 15MB
    if (file.size > 15 * 1024 * 1024) {
      return reject(new Error('Image file exceeds maximum allowable size (15MB).'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const originalDataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image.'));
      img.onload = () => {
        const originalWidth = img.width;
        const originalHeight = img.height;

        // Calculate scaled dimensions for WebP main variant
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        }

        // Draw main WebP
        const mainCanvas = document.createElement('canvas');
        mainCanvas.width = targetWidth;
        mainCanvas.height = targetHeight;
        const ctx = mainCanvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to get canvas context.'));
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const webpDataUrl = mainCanvas.toDataURL('image/webp', quality);

        // Generate Thumbnail (preserving aspect ratio)
        let thumbWidth = originalWidth;
        let thumbHeight = originalHeight;
        const thumbRatio = Math.min(thumbSize / thumbWidth, thumbSize / thumbHeight);
        thumbWidth = Math.round(thumbWidth * thumbRatio);
        thumbHeight = Math.round(thumbHeight * thumbRatio);

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
        }
        const thumbnailDataUrl = thumbCanvas.toDataURL('image/webp', 0.75);

        // Estimate optimized size in bytes
        const base64Length = webpDataUrl.length - (webpDataUrl.indexOf(',') + 1);
        const optimizedSizeBytes = Math.round((base64Length * 3) / 4);
        const savedPercent = Math.max(
          0,
          Math.round(((file.size - optimizedSizeBytes) / file.size) * 100)
        );

        resolve({
          fileName: file.name.replace(/\.[^/.]+$/, '') + '.webp',
          originalSizeBytes: file.size,
          optimizedSizeBytes,
          savedPercent,
          originalDataUrl,
          webpDataUrl,
          thumbnailDataUrl,
          dimensions: {
            width: targetWidth,
            height: targetHeight,
          },
        });
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
