'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Shield,
  Table,
  Zap,
} from 'lucide-react';
import { Product, DuplicateStrategy, ImportSummary } from '../../lib/types';
import {
  exportProductsToWooCommerceCSV,
  parseWooCommerceCSV,
  importProductsFromWooCommerce,
} from '../../lib/csvHelpers';
import { logAuditEvent } from '../../lib/audit';
import { useAuth } from '../../context/AuthContext';
import { INITIAL_CATEGORIES } from '../../lib/seedData';

interface WooCommerceHubViewProps {
  products: Product[];
  onRefreshProducts: () => void;
}

export const WooCommerceHubView: React.FC<WooCommerceHubViewProps> = ({
  products,
  onRefreshProducts,
}) => {
  const { user } = useAuth();

  // Export filters
  const [exportCategory, setExportCategory] = useState<string>('all');
  const [exportOnlyPublished, setExportOnlyPublished] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);

  // Import wizard state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('overwrite');
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string>('');

  // Handle Export
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      let productsToExport = [...products];

      if (exportCategory !== 'all') {
        productsToExport = productsToExport.filter((p) => p.category === exportCategory);
      }
      if (exportOnlyPublished) {
        productsToExport = productsToExport.filter((p) => p.published);
      }

      exportProductsToWooCommerceCSV(productsToExport);

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: user?.name,
        actorEmail: user?.email,
        action: 'CSV_EXPORT_WOOCOMMERCE',
        targetType: 'Catalog',
        details: `Exported ${productsToExport.length} products to WooCommerce-compatible CSV`,
      });
    } catch (e: any) {
      alert('Export failed: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle CSV File Selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportFile(file);
      setImportError('');
      setImportSummary(null);

      const parsed = await parseWooCommerceCSV(file);
      setParsedRows(parsed);
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse CSV file. Ensure standard format.');
      setParsedRows([]);
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!parsedRows.length) return;

    try {
      setIsImporting(true);
      setImportError('');

      const summary = await importProductsFromWooCommerce(
        parsedRows,
        duplicateStrategy,
        user?.name || 'Chef Administrator'
      );

      setImportSummary(summary);

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: user?.name,
        actorEmail: user?.email,
        action: 'CSV_IMPORT_WOOCOMMERCE',
        targetType: 'Catalog',
        details: `Imported WooCommerce CSV: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped, ${summary.failed} errors.`,
      });

      onRefreshProducts();
    } catch (err: any) {
      setImportError(err.message || 'Import execution failed.');
    } finally {
      setIsImporting(false);
    }
  };

  // Download Sample Template
  const handleDownloadSampleTemplate = () => {
    const sampleProduct: Product = {
      id: 'sample-01',
      sku: 'CONF-SAMPLE-01',
      name: 'Sample Belgian Dark Truffle Cake',
      slug: 'sample-belgian-dark-truffle-cake',
      shortDescription: 'Rich 54% dark chocolate ganache cake.',
      description: 'Handcrafted artisan Belgian chocolate cake with fresh cream.',
      category: 'chocolate',
      tags: ['Bestseller', 'Birthday', 'Truffle'],
      flavours: ['Dark Truffle', 'Hazelnut'],
      eggless: true,
      weightOptions: [
        { label: '0.5 kg', weightKg: 0.5, price: 699, mrp: 849 },
        { label: '1.0 kg', weightKg: 1.0, price: 1299, mrp: 1549 },
      ],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
          thumbUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=80',
          mediumUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
          alt: 'Sample Belgian Dark Truffle Cake',
        },
      ],
      rating: 4.9,
      reviewCount: 15,
      stock: 50,
      stockStatus: 'in_stock',
      badges: ['Bestseller', 'Eggless'],
      published: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    exportProductsToWooCommerceCSV([sampleProduct]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)]">
            WooCommerce Migration & CSV Engine
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Standard 25+ column WooCommerce CSV format import/export with duplicate strategies and live preview.
          </p>
        </div>

        <button
          onClick={handleDownloadSampleTemplate}
          className="px-3.5 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>Download Sample CSV</span>
        </button>
      </div>

      {/* Grid: Export & Import Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Export Panel */}
        <div className="lg:col-span-5 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">
                Export Catalog to CSV
              </h3>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Export all TVO Flavours cake recipes formatted to the official WooCommerce CSV product specification. Ready to import into WordPress / WooCommerce stores.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Filter by Category
                </label>
                <select
                  value={exportCategory}
                  onChange={(e) => setExportCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none"
                >
                  <option value="all">All Categories ({products.length} products)</option>
                  {INITIAL_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOnlyPublished}
                  onChange={(e) => setExportOnlyPublished(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--primary)]"
                />
                <span>Export only published active recipes</span>
              </label>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleExportCSV}
              disabled={isExporting || products.length === 0}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExporting ? 'Generating CSV...' : 'Download WooCommerce CSV'}</span>
            </button>
          </div>
        </div>

        {/* Import Panel */}
        <div className="lg:col-span-7 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">
              Import WooCommerce CSV
            </h3>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Upload any standard WooCommerce export CSV. TVO Flavours parses SKU, title, descriptions, category, pricing, weight variants, images, and inventory stock automatically.
          </p>

          {/* File Upload Zone */}
          <label className="border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--primary)] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[var(--bg-subtle)]/50">
            <FileSpreadsheet className="w-8 h-8 text-[var(--primary)] mb-2" />
            <span className="text-xs font-bold text-[var(--text-main)]">
              {importFile ? importFile.name : 'Select or drop WooCommerce .csv file'}
            </span>
            <span className="text-[10px] text-[var(--text-subtle)] mt-0.5">
              {parsedRows.length > 0
                ? `${parsedRows.length} cake products parsed & ready for validation`
                : 'Click to browse files'}
            </span>
            <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
          </label>

          {/* Duplicate Strategy Selector */}
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
            <div className="text-xs font-bold text-[var(--text-main)]">
              Duplicate SKU Handling Strategy:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-main)] p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] cursor-pointer">
                <input
                  type="radio"
                  name="dup_strategy"
                  value="overwrite"
                  checked={duplicateStrategy === 'overwrite'}
                  onChange={() => setDuplicateStrategy('overwrite')}
                  className="accent-[var(--primary)]"
                />
                <span>Overwrite (Update)</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-[var(--text-main)] p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] cursor-pointer">
                <input
                  type="radio"
                  name="dup_strategy"
                  value="skip"
                  checked={duplicateStrategy === 'skip'}
                  onChange={() => setDuplicateStrategy('skip')}
                  className="accent-[var(--primary)]"
                />
                <span>Skip Existing</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-[var(--text-main)] p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] cursor-pointer">
                <input
                  type="radio"
                  name="dup_strategy"
                  value="create_new"
                  checked={duplicateStrategy === 'create_new'}
                  onChange={() => setDuplicateStrategy('create_new')}
                  className="accent-[var(--primary)]"
                />
                <span>Create New SKU</span>
              </label>
            </div>
          </div>

          {importError && (
            <div className="p-3 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importSummary && (
            <div className="p-4 rounded-xl bg-[var(--success-light)] border border-[var(--success)]/20 text-xs space-y-1 animate-in fade-in">
              <div className="font-bold text-[var(--success)] flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>WooCommerce Import Completed!</span>
              </div>
              <div className="text-[11px] text-[var(--text-main)]">
                Processed {importSummary.totalProcessed} records: <strong>{importSummary.created} created</strong>, <strong>{importSummary.updated} updated</strong>, {importSummary.skipped} skipped, {importSummary.failed} failed.
              </div>
            </div>
          )}

          {parsedRows.length > 0 && (
            <button
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>
                {isImporting
                  ? 'Importing recipes to Firestore...'
                  : `Execute Import (${parsedRows.length} products)`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* CSV Preview Table if rows loaded */}
      {parsedRows.length > 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs space-y-2">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
              <Table className="w-4 h-4 text-[var(--primary)]" />
              <span>Pre-Import Validation Preview ({parsedRows.length} Rows)</span>
            </h4>
          </div>

          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-subtle)] text-[var(--text-subtle)] uppercase text-[10px] tracking-wider border-b border-[var(--border)] sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">SKU</th>
                  <th className="py-2.5 px-4 font-semibold">Name</th>
                  <th className="py-2.5 px-4 font-semibold">Categories</th>
                  <th className="py-2.5 px-4 font-semibold">Regular Price</th>
                  <th className="py-2.5 px-4 font-semibold">In Stock?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)]">
                {parsedRows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-subtle)]/30">
                    <td className="py-2 px-4 font-mono text-[11px] font-semibold text-[var(--primary)]">
                      {row.SKU || row.sku || `REC-${i + 1}`}
                    </td>
                    <td className="py-2 px-4 font-medium">{row.Name || row.name || 'Untitled'}</td>
                    <td className="py-2 px-4 text-[11px] text-[var(--text-muted)]">
                      {row.Categories || row.categories || 'chocolate'}
                    </td>
                    <td className="py-2 px-4 font-bold">
                      ₹{row['Regular price'] || row.regular_price || row.Price || 699}
                    </td>
                    <td className="py-2 px-4">
                      {row['In stock?'] === '1' || row['In stock?'] === 'true' || !row['In stock?'] ? (
                        <span className="text-[var(--success)] font-medium">Yes</span>
                      ) : (
                        <span className="text-[var(--danger)]">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
