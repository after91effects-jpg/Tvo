import { describe, it, expect } from 'vitest';
import {
  normalizeImageUrl,
  mediumImageUrl,
  resolveCategoryImageUrl,
  DEFAULT_FALLBACK_IMAGE,
  DEFAULT_CAKE_FALLBACK,
} from '../imageUrl';
import { MASTER_5_MAIN_CATEGORIES, ALL_FLAT_CATEGORIES } from '../masterCatalogHierarchy';

describe('Category Image Display & Normalization Suite', () => {
  describe('1. normalizeImageUrl', () => {
    it('normalizes legacy full WordPress URLs to clean root-absolute paths', () => {
      const legacyUrl = 'https://tvoflavours.com/wp-content/uploads/2026/05/Choco-Chip-Truffle-Cake.png';
      expect(normalizeImageUrl(legacyUrl)).toBe('/uploads/2026/05/Choco-Chip-Truffle-Cake.png');
    });

    it('normalizes root-relative legacy /wp-content/ paths', () => {
      const relativeWpUrl = '/wp-content/uploads/2026/05/Pineapple-Cake.png';
      expect(normalizeImageUrl(relativeWpUrl)).toBe('/uploads/2026/05/Pineapple-Cake.png');
    });

    it('preserves clean /uploads/... paths unchanged', () => {
      const cleanPath = '/uploads/2026/05/Belgian-Chocolate-Cake.png';
      expect(normalizeImageUrl(cleanPath)).toBe('/uploads/2026/05/Belgian-Chocolate-Cake.png');
    });

    it('normalizes production full origin URLs without wp-content', () => {
      const prodUrl = 'https://tvoflavours.com/uploads/2026/05/Kunafa-Dubai-Cake.png';
      expect(normalizeImageUrl(prodUrl)).toBe('/uploads/2026/05/Kunafa-Dubai-Cake.png');
    });

    it('preserves external image URLs untouched', () => {
      const extUrl = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587';
      expect(normalizeImageUrl(extUrl)).toBe(extUrl);
    });

    it('safely handles null, undefined, and empty string without throwing', () => {
      expect(normalizeImageUrl('')).toBe('');
      expect(normalizeImageUrl(null as any)).toBe('');
      expect(normalizeImageUrl(undefined as any)).toBe('');
      expect(normalizeImageUrl('   ')).toBe('');
    });

    it('collapses relative traversal segments cleanly', () => {
      const traversal = '../../uploads/2026/05/Cake.png';
      expect(normalizeImageUrl(traversal)).toBe('/uploads/2026/05/Cake.png');
    });

    it('removes WordPress resized dimensions (-100x100)', () => {
      const resized = '/uploads/2026/05/Choco-Chip-Truffle-Cake-100x100.png';
      expect(normalizeImageUrl(resized)).toBe('/uploads/2026/05/Choco-Chip-Truffle-Cake.png');
    });
  });

  describe('2. mediumImageUrl', () => {
    it('produces -w700.webp rendition for self-hosted root paths', () => {
      const fullPng = '/uploads/2026/05/Choco-Chip-Truffle-Cake.png';
      expect(mediumImageUrl(fullPng)).toBe('/uploads/2026/05/Choco-Chip-Truffle-Cake-w700.webp');
    });

    it('leaves external URLs untouched', () => {
      const ext = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587';
      expect(mediumImageUrl(ext)).toBe(ext);
    });
  });

  describe('3. resolveCategoryImageUrl', () => {
    it('resolves string URL to normalized medium image path', () => {
      const url = 'https://tvoflavours.com/wp-content/uploads/2026/05/Hearts-Of-Love-Chocolate-Cake.png';
      const resolved = resolveCategoryImageUrl(url, true);
      expect(resolved).toBe('/uploads/2026/05/Hearts-Of-Love-Chocolate-Cake-w700.webp');
    });

    it('resolves category object with image field', () => {
      const catObj = {
        name: 'Pastries',
        image: 'https://tvoflavours.com/wp-content/uploads/2026/05/Blueberry-Cheesecake-Pastry1.webp',
      };
      const resolved = resolveCategoryImageUrl(catObj, true);
      expect(resolved).toBe('/uploads/2026/05/Blueberry-Cheesecake-Pastry1-w700.webp');
    });

    it('resolves story object with imageUrl field', () => {
      const storyObj = {
        name: 'Mango Special',
        imageUrl: '/uploads/2026/08/Classic-Mango-cream-cake.png',
      };
      const resolved = resolveCategoryImageUrl(storyObj, true);
      expect(resolved).toBe('/uploads/2026/08/Classic-Mango-cream-cake-w700.webp');
    });

    it('falls back to DEFAULT_FALLBACK_IMAGE when input is null, empty or missing image', () => {
      expect(resolveCategoryImageUrl(null)).toBe(DEFAULT_FALLBACK_IMAGE);
      expect(resolveCategoryImageUrl('')).toBe(DEFAULT_FALLBACK_IMAGE);
      expect(resolveCategoryImageUrl({})).toBe(DEFAULT_FALLBACK_IMAGE);
      expect(resolveCategoryImageUrl({ name: 'Empty Cat' })).toBe(DEFAULT_FALLBACK_IMAGE);
    });

    it('ensures DEFAULT_CAKE_FALLBACK is self-hosted local asset', () => {
      expect(DEFAULT_CAKE_FALLBACK).toBe(DEFAULT_FALLBACK_IMAGE);
      expect(DEFAULT_CAKE_FALLBACK.startsWith('/uploads/')).toBe(true);
    });
  });

  describe('4. Master Catalog Hierarchy & Flat Categories', () => {
    it('verifies all MASTER_5_MAIN_CATEGORIES normalize to valid local /uploads/ paths', () => {
      MASTER_5_MAIN_CATEGORIES.forEach((main) => {
        const norm = normalizeImageUrl(main.image);
        expect(norm).toMatch(/^\/uploads\/2026\//);
        expect(norm).not.toContain('wp-content');
      });
    });

    it('verifies ALL_FLAT_CATEGORIES have normalized images without wp-content', () => {
      ALL_FLAT_CATEGORIES.forEach((cat) => {
        expect(cat.image).toBeDefined();
        expect(cat.image).not.toContain('wp-content');
        expect(cat.image).toMatch(/^\/uploads\//);
      });
    });
  });
});
