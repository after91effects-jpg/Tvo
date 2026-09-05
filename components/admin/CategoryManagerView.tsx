'use client';

import React, { useState } from 'react';
import {
  FolderTree,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Download,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Globe,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { MASTER_5_MAIN_CATEGORIES, SEO_301_REDIRECT_MAPPINGS } from '../../lib/masterCatalogHierarchy';
import {
  generateCategoryMappingReport,
  generateProductOrganizationReport,
  generateCategoryImageReport,
  RESTRUCTURED_MASTER_PRODUCTS,
} from '../../lib/productOrganizer';
import { generateSitemapUrls } from '../../lib/sitemapGenerator';

export const CategoryManagerView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'hierarchy' | 'redirects' | 'products' | 'images' | 'sitemap'>('hierarchy');
  const [expandedMainCat, setExpandedMainCat] = useState<string | null>('cat-main-cakes');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const categoryMappingReport = generateCategoryMappingReport();
  const productOrgReport = generateProductOrganizationReport(RESTRUCTURED_MASTER_PRODUCTS);
  const categoryImageReport = generateCategoryImageReport();
  const sitemapUrls = generateSitemapUrls();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const exportReportToCsv = (filename: string, rows: object[]) => {
    if (!rows || !rows.length) return;
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows
        .map((row) => {
          return keys
            .map((k) => {
              let cell = (row as Record<string, unknown>)[k];
              if (cell === null || cell === undefined) cell = '';
              if (Array.isArray(cell)) cell = cell.join('; ');
              return `"${String(cell).replace(/"/g, '""')}"`;
            })
            .join(separator);
        })
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white p-6 rounded-3xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                Master Restructure Engine
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Zero Data Loss Active</span>
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              E-Commerce Category, Product & SEO Architecture
            </h2>
            <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
              5 Master Header Categories, dynamic mega-menu hierarchy, preserved product records (35+ SKUs), 301 redirect engine, and automated canonical SEO schemas.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportReportToCsv('TvoFlavours_Category_Mapping_Report', categoryMappingReport)}
              className="px-3.5 py-2 rounded-xl bg-white text-emerald-800 text-xs font-bold hover:bg-emerald-50 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Category Map</span>
            </button>
            <button
              onClick={() => exportReportToCsv('TvoFlavours_Product_Organization_Report', productOrgReport)}
              className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Product Map</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <div className="text-[10px] uppercase font-bold text-emerald-200">Main Categories</div>
            <div className="text-xl font-black">5 Main</div>
            <div className="text-[10px] text-white/80">Cakes, Desserts, Hampers, Party, Baking</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <div className="text-[10px] uppercase font-bold text-emerald-200">Total Subcategories</div>
            <div className="text-xl font-black">34 Sub / 60+ Child</div>
            <div className="text-[10px] text-white/80">Occasions, Festivals, Flavours, Types</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <div className="text-[10px] uppercase font-bold text-emerald-200">Preserved Products</div>
            <div className="text-xl font-black">{productOrgReport.length} SKUs</div>
            <div className="text-[10px] text-emerald-200 font-bold">100% Retained & Mapped</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl">
            <div className="text-[10px] uppercase font-bold text-emerald-200">301 Redirect Rules</div>
            <div className="text-xl font-black">{SEO_301_REDIRECT_MAPPINGS.length} Rules</div>
            <div className="text-[10px] text-white/80">Prevents 404s & Preserves Link Equity</div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        {[
          { id: 'hierarchy', label: '1. Master Category Tree', icon: <FolderTree className="w-4 h-4" /> },
          { id: 'redirects', label: '2. 301 Redirect Rules', icon: <ArrowRight className="w-4 h-4" /> },
          { id: 'products', label: '3. Product Organization Map', icon: <FileSpreadsheet className="w-4 h-4" /> },
          { id: 'images', label: '4. Category Images & Alt', icon: <ImageIcon className="w-4 h-4" /> },
          { id: 'sitemap', label: '5. XML Sitemap & SEO JSON-LD', icon: <Globe className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-[#FF2B6D] text-white shadow-md'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border)]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MASTER CATEGORY TREE HIERARCHY                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'hierarchy' && (
        <div className="space-y-4">
          <div className="text-xs text-[var(--text-muted)]">
            Explore the 5 Top-Level Header Categories and their multi-tier subcategories with complete SEO meta tags.
          </div>

          <div className="space-y-4">
            {MASTER_5_MAIN_CATEGORIES.map((mainCat, index) => {
              const isExpanded = expandedMainCat === mainCat.id;
              return (
                <div
                  key={mainCat.id}
                  className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs"
                >
                  <div
                    onClick={() => setExpandedMainCat(isExpanded ? null : mainCat.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#FF2B6D]/10 text-[#FF2B6D] font-black text-xs flex items-center justify-center">
                        0{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-[var(--text-main)]">
                            {mainCat.name}
                          </h3>
                          <span className="font-mono text-[11px] text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.5 rounded-full">
                            {mainCat.canonicalUrl}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                          {mainCat.seoTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[var(--text-muted)] hidden sm:inline">
                        {mainCat.subcategories.length} Subcategories
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[var(--text-subtle)] transition-transform ${
                          isExpanded ? 'rotate-180 text-[#FF2B6D]' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-subtle)]/30 space-y-4">
                      {/* SEO Tags Meta Details */}
                      <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] text-xs space-y-1.5">
                        <div className="font-bold text-[var(--text-main)] text-[11px] uppercase tracking-wider text-[var(--primary)]">
                          Canonical SEO Metadata
                        </div>
                        <div>
                          <span className="font-semibold text-[var(--text-subtle)]">H1 Heading: </span>
                          <span className="text-[var(--text-main)] font-medium">{mainCat.h1}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-[var(--text-subtle)]">Meta Description: </span>
                          <span className="text-[var(--text-muted)]">{mainCat.seoDescription}</span>
                        </div>
                      </div>

                      {/* Subcategories Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mainCat.subcategories.map((sub) => (
                          <div
                            key={sub.id}
                            className="p-3.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl space-y-2 hover:border-[var(--primary)] transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-xs text-[var(--text-main)]">
                                {sub.name}
                              </div>
                              <span className="text-[10px] font-mono text-[var(--text-subtle)]">
                                {sub.canonicalUrl}
                              </span>
                            </div>

                            <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
                              {sub.shortDescription}
                            </p>

                            {sub.childCategories && sub.childCategories.length > 0 && (
                              <div className="pt-2 border-t border-[var(--border)]/60">
                                <div className="text-[10px] font-bold uppercase text-[var(--text-subtle)] mb-1">
                                  Child Categories ({sub.childCategories.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {sub.childCategories.map((child) => (
                                    <span
                                      key={child.id}
                                      className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-main)] font-medium"
                                      title={child.canonicalUrl}
                                    >
                                      {child.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 301 REDIRECT RULES TABLE                                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'redirects' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-[var(--text-main)]">
                Permanent 301 Redirect Rules (Old / Duplicate → Canonical)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Every old category, numeric ID, and duplicate slug is mapped to its new canonical destination.
              </p>
            </div>
            <button
              onClick={() => exportReportToCsv('TvoFlavours_301_Redirects', SEO_301_REDIRECT_MAPPINGS)}
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-xs font-bold text-[var(--text-main)] border border-[var(--border)] flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Redirects CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-subtle)] font-bold uppercase text-[10px]">
                  <th className="p-3">Old / Legacy URL</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Canonical Destination</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reason / Logic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {SEO_301_REDIRECT_MAPPINGS.map((rule, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                      {rule.oldUrl}
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                        301 Permanent
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {rule.newUrl}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 w-max">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    </td>
                    <td className="p-3 text-[var(--text-muted)] text-[11px]">
                      {rule.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRODUCT ORGANIZATION MAP                                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'products' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-[var(--text-main)]">
                Product Organization & Integrity Report (Total: {productOrgReport.length} Items)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Zero product data lost. All SKUs, prices, images, and inventory are mapped to the new hierarchy.
              </p>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU, Product name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D]"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[var(--bg-subtle)] z-10">
                <tr className="border-b border-[var(--border)] text-[var(--text-subtle)] font-bold uppercase text-[10px]">
                  <th className="p-3">SKU</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Main Category</th>
                  <th className="p-3">Primary Subcategory</th>
                  <th className="p-3">Canonical Path</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Integrity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {productOrgReport
                  .filter(
                    (p) =>
                      !searchQuery ||
                      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((item) => (
                    <tr key={item.productId} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-[11px] text-[var(--primary)]">
                        {item.sku}
                      </td>
                      <td className="p-3 font-semibold text-[var(--text-main)]">
                        {item.productName}
                      </td>
                      <td className="p-3 font-medium text-[var(--text-main)]">
                        {item.newMainCategory}
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {item.newSubCategory}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                        {item.canonicalUrl}
                      </td>
                      <td className="p-3 font-bold text-[var(--text-main)]">
                        ₹{item.price}
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {item.stock} in stock
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          ✓ {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CATEGORY IMAGES & ALT AUDIT                                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'images' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-[var(--text-main)]">
                Category Images & Alt Text Audit Report (Total: {categoryImageReport.length} Images)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                High-quality, responsive category banners with SEO-rich alt tags.
              </p>
            </div>
            <button
              onClick={() => exportReportToCsv('TvoFlavours_Category_Images_Report', categoryImageReport)}
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-xs font-bold text-[var(--text-main)] border border-[var(--border)] flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Images CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryImageReport.slice(0, 18).map((img, idx) => (
              <div
                key={idx}
                className="p-3 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border)] flex gap-3 items-center"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 border border-[var(--border)]">
                  <img src={img.imageUrl} alt={img.imageAlt} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-bold text-xs text-[var(--text-main)] truncate">
                    {img.categoryName}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate" title={img.imageAlt}>
                    Alt: {img.imageAlt}
                  </div>
                  <span className="inline-block px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                    ✓ {img.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: XML SITEMAP & JSON-LD SCHEMAS                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'sitemap' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-[var(--text-main)]">
                Automated XML Sitemap & Structured Data Index ({sitemapUrls.length} Canonical URLs)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Ready for Google Search Console and Bing Webmaster submission.
              </p>
            </div>
            <button
              onClick={() => {
                const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls
                  .map(
                    (u) =>
                      `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
                  )
                  .join('\n')}\n</urlset>`;
                handleCopy(xml, 'xml');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF2B6D] text-white text-xs font-bold hover:bg-[#FF1A5B] flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedText === 'xml' ? 'Copied XML!' : 'Copy XML Sitemap'}</span>
            </button>
          </div>

          <div className="bg-neutral-900 text-neutral-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-72 space-y-1">
            <div className="text-emerald-400 font-bold">&lt;!-- SITEMAP INDEX PREVIEW --&gt;</div>
            {sitemapUrls.slice(0, 15).map((u, i) => (
              <div key={i} className="text-neutral-300">
                &lt;url&gt;&lt;loc&gt;{u.loc}&lt;/loc&gt;&lt;priority&gt;{u.priority}&lt;/priority&gt;&lt;/url&gt;
              </div>
            ))}
            <div className="text-neutral-500 italic">... and {sitemapUrls.length - 15} more canonical URLs</div>
          </div>
        </div>
      )}
    </div>
  );
};
