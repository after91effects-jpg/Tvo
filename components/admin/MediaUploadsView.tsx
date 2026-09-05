'use client';

import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  CheckCircle,
  FileCheck,
  Sliders,
  Maximize2,
  Trash2,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { MediaAsset, StoreSettings } from '../../lib/types';
import { optimizeImageFile, OptimizationResult } from '../../lib/imageOptimizer';
import { logAuditEvent } from '../../lib/audit';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_STORE_SETTINGS } from '../../lib/seedData';

export const MediaUploadsView: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [recentOptimization, setRecentOptimization] = useState<OptimizationResult | null>(null);

  // Settings State
  const [quality, setQuality] = useState<number>(82);
  const [maxWidth, setMaxWidth] = useState<number>(1200);
  const [maxHeight, setMaxHeight] = useState<number>(1200);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  const fetchAssets = () => {
    fetch('/api/media')
      .then((res) => res.json())
      .then((data) => {
        if (data.media && data.media.length > 0) {
          const loaded: MediaAsset[] = data.media.map((m: any) => ({
            id: String(m.id),
            name: m.filename || m.name,
            url: m.path || m.url,
            folder: m.folder,
            size: m.size,
            mimeType: m.mime_type,
            createdAt: m.created_at,
          }));
          setAssets(loaded);
        }
      })
      .catch((e) => {
        console.warn('Could not fetch media assets:', e);
      });
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress('Analyzing image & stripping EXIF metadata...');

      const result = await optimizeImageFile(file, {
        maxWidth,
        maxHeight,
        quality: quality / 100,
      });

      setRecentOptimization(result);
      setUploadProgress('Generating WebP & Thumbnail variants...');

      const assetId = `media-${Date.now()}`;
      const newAsset: MediaAsset = {
        id: assetId,
        fileName: result.fileName,
        originalUrl: result.webpDataUrl,
        optimizedVariants: {
          thumb: result.thumbnailDataUrl,
          medium: result.webpDataUrl,
          large: result.webpDataUrl,
          webp: result.webpDataUrl,
        },
        originalSizeBytes: result.originalSizeBytes,
        optimizedSizeBytes: result.optimizedSizeBytes,
        dimensions: result.dimensions,
        uploadedBy: user?.name || 'Chef Administrator',
        uploadedAt: new Date().toISOString(),
        usedInProductIds: [],
      };

      try {
        await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, url: newAsset.url, folder: 'uploads' }),
        });
      } catch (e) {}

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: user?.name,
        actorEmail: user?.email,
        action: 'MEDIA_UPLOAD_OPTIMIZE',
        targetType: 'Media',
        targetId: assetId,
        details: `Uploaded & compressed "${file.name}" to WebP (Saved ${result.savedPercent}% payload size)`,
      });

      setAssets((prev) => [newAsset, ...prev]);
      setUploadProgress('');
    } catch (err: any) {
      alert(err.message || 'Image optimization failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      const updatedSettings = {
        ...DEFAULT_STORE_SETTINGS,
        imageOptimization: {
          quality,
          maxWidthPx: maxWidth,
          maxHeightPx: maxHeight,
          generateWebp: true,
        },
      };
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings),
        });
      } catch (e) {}

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: user?.name,
        actorEmail: user?.email,
        action: 'SETTINGS_UPDATE',
        targetType: 'Settings',
        details: `Updated image optimization parameters (Quality: ${quality}%, Max: ${maxWidth}x${maxHeight})`,
      });

      setSettingsMessage('Optimization settings saved successfully!');
      setTimeout(() => setSettingsMessage(''), 3000);
    } catch (e: any) {
      setSettingsMessage('Failed to save settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)]">
            Media & Image Optimization Pipeline
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Automatic EXIF stripping, WebP compression, multi-size thumbnail generation, and payload reduction.
          </p>
        </div>
      </div>

      {/* Grid: Upload Dropzone & Optimization Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Dropzone */}
        <div className="lg:col-span-7 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <UploadCloud className="w-5 h-5 text-[var(--primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">
                Upload & Optimize Cake Media
              </h3>
            </div>

            <label className="border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--primary)] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[var(--bg-subtle)]/50 group">
              <div className="w-14 h-14 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-[var(--text-main)]">
                Click or Drag high-res photos here
              </span>
              <span className="text-[11px] text-[var(--text-muted)] mt-1">
                PNG, JPG, JPEG, WEBP up to 15MB • Strips EXIF metadata automatically
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>

            {isUploading && (
              <div className="mt-4 p-3.5 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] text-xs font-medium flex items-center gap-2 animate-pulse">
                <Zap className="w-4 h-4" />
                <span>{uploadProgress || 'Optimizing & resizing image...'}</span>
              </div>
            )}

            {recentOptimization && !isUploading && (
              <div className="mt-4 p-4 rounded-xl bg-[var(--success-light)] border border-[var(--success)]/20 text-xs space-y-1 animate-in fade-in">
                <div className="font-bold text-[var(--success)] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Optimization Complete! Saved {recentOptimization.savedPercent}% bandwidth</span>
                </div>
                <div className="text-[11px] text-[var(--text-main)]">
                  Original: {(recentOptimization.originalSizeBytes / 1024).toFixed(1)} KB ➔ Optimized WebP: {(recentOptimization.optimizedSizeBytes / 1024).toFixed(1)} KB ({recentOptimization.dimensions.width}x{recentOptimization.dimensions.height}px)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Optimization Settings Panel */}
        <div className="lg:col-span-5 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">
              Optimization Parameters
            </h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-[var(--text-main)] mb-1">
                <span>WebP Quality Compression</span>
                <span className="text-[var(--primary)]">{quality}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-[var(--primary)] cursor-pointer"
              />
              <span className="text-[10px] text-[var(--text-subtle)]">
                Recommended 80-85% for crystal-clear cake gloss with minimum bytes.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Max Width (px)
                </label>
                <input
                  type="number"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Max Height (px)
                </label>
                <input
                  type="number"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[11px] text-[var(--text-muted)] space-y-1">
              <div className="font-semibold text-[var(--text-main)]">Standard Pipeline Features:</div>
              <div>• Generates 300x300 thumbnails automatically</div>
              <div>• Strips camera GPS and EXIF headers</div>
              <div>• Produces modern high-compression WebP</div>
            </div>

            {settingsMessage && (
              <p className="text-xs text-[var(--success)] font-medium">{settingsMessage}</p>
            )}

            <button
              type="submit"
              disabled={isSavingSettings}
              className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {isSavingSettings ? 'Saving...' : 'Save Parameters'}
            </button>
          </form>
        </div>
      </div>

      {/* Media Assets Library Grid */}
      <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">
            Optimized Media Library ({assets.length})
          </h3>
        </div>

        {assets.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
            No media assets uploaded yet. Use the upload box above to compress and store cake images.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group relative bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="aspect-square w-full bg-[var(--bg-subtle)] overflow-hidden">
                  <img
                    src={asset.optimizedVariants?.thumb || asset.originalUrl}
                    alt={asset.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-2.5 text-[10px]">
                  <div className="font-bold text-[var(--text-main)] truncate">{asset.fileName}</div>
                  <div className="text-[var(--text-subtle)] mt-0.5">
                    {(asset.optimizedSizeBytes / 1024).toFixed(1)} KB • {asset.dimensions?.width}x{asset.dimensions?.height}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
