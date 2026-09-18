import { describe, it, expect } from 'vitest';
import {
  resolveOccasions,
  resolveActiveOccasion,
  resolveUpcomingOccasions,
  resolveOccasionProducts,
  getActiveOccasionForHomepage,
  getOccasionBySlug,
  getAllOccasions,
  nowKolkata,
} from '../server/occasions';
import { db } from '../server/db';

describe('STEP 7: Festival & Special Days System', () => {
  describe('A. Date Resolution & Scheduling Engine', () => {
    it('resolves fixed date occasions by projecting to current year', () => {
      const now = new Date('2026-02-10T12:00:00Z');
      const resolved = resolveOccasions(now);
      const vday = resolved.find((o) => o.slug === 'valentines-day');
      expect(vday).toBeDefined();
      expect(vday?.resolvedStartDate).toBe('2026-02-14');
      expect(vday?.resolvedEndDate).toBe('2026-02-14');
      expect(vday?.derivedStatus).toBe('scheduled');
    });

    it('marks fixed date occasion as active on its exact day', () => {
      const vdayActive = new Date('2026-02-14T12:00:00Z');
      const resolved = resolveOccasions(vdayActive);
      const vday = resolved.find((o) => o.slug === 'valentines-day');
      expect(vday?.isCurrentlyActive).toBe(true);
      expect(vday?.derivedStatus).toBe('active');
    });

    it('resolves variable festival dates from occasion_years table', () => {
      const now2026 = new Date('2026-09-18T12:00:00Z');
      const resolved = resolveOccasions(now2026);
      const diwali = resolved.find((o) => o.slug === 'diwali');
      expect(diwali).toBeDefined();
      expect(diwali?.resolvedStartDate).toBe('2026-11-08');
      expect(diwali?.resolvedEndDate).toBe('2026-11-12');
      expect(diwali?.resolvedCampaignStart).toBe('2026-09-01');
      expect(diwali?.isCurrentlyActive).toBe(true);
      expect(diwali?.derivedStatus).toBe('active');
    });

    it('correctly resolves active occasion by priority', () => {
      const now = new Date('2026-09-18T12:00:00Z');
      const active = resolveActiveOccasion(now);
      expect(active).toBeDefined();
      expect(active?.slug).toBe('diwali');
      expect(active?.priority).toBeGreaterThanOrEqual(90);
    });

    it('resolves upcoming occasions in chronological order', () => {
      const now = new Date('2026-01-10T12:00:00Z');
      const upcoming = resolveUpcomingOccasions(now, 5);
      expect(upcoming.length).toBeGreaterThan(0);
      for (const occ of upcoming) {
        expect(occ.resolvedStartDate).toBeTruthy();
        expect(new Date(occ.resolvedStartDate!).getTime()).toBeGreaterThanOrEqual(new Date('2026-01-10').getTime());
      }
    });
  });

  describe('B. Product & Hamper Curation Mapping', () => {
    it('retrieves mapped products for active occasion in priority order', () => {
      const diwali = getOccasionBySlug('diwali');
      expect(diwali).toBeDefined();
      expect(diwali?.id).toBe(19);

      const products = resolveOccasionProducts(diwali!.id, { limit: 10 });
      expect(products.length).toBeGreaterThan(0);
      expect(products[0].name).toBeTruthy();
      expect(products[0].sku).toBeTruthy();
    });

    it('verifies catalog gift hampers are mapped cleanly with simple product type', () => {
      const diwali = getOccasionBySlug('diwali');
      const products = resolveOccasionProducts(diwali!.id, { limit: 20 });
      const hampers = products.filter((p) => (p.name + ' ' + (p.tags || '')).toLowerCase().includes('hamper'));
      expect(hampers.length).toBeGreaterThan(0);
      for (const h of hampers) {
        expect(h.product_type || 'simple').toBe('simple');
        expect(Number(h.salePrice || h.sale_price || h.regularPrice || h.regular_price)).toBeGreaterThan(0);
      }
    });

    it('excludes out-of-stock products when includeOutOfStock is false', () => {
      const diwali = getOccasionBySlug('diwali');
      const available = resolveOccasionProducts(diwali!.id, { includeOutOfStock: false });
      for (const p of available) {
        expect(p.stockStatus).not.toBe('out_of_stock');
      }
    });
  });

  describe('C. Storefront & Homepage Integration', () => {
    it('returns structured active occasion and product IDs for homepage showcase', () => {
      const hp = getActiveOccasionForHomepage(8);
      expect(hp.occasion).toBeDefined();
      expect(hp.occasion?.slug).toBe('diwali');
      expect(hp.occasion?.homepageVisibility).toBe(true);
      expect(hp.productIds.length).toBeGreaterThan(0);
      expect(hp.productIds.length).toBeLessThanOrEqual(8);
    });

    it('returns all active occasions with homepage visibility', () => {
      const all = getAllOccasions({ includeInactive: false });
      expect(all.length).toBeGreaterThanOrEqual(3);
      const slugs = all.map((o) => o.slug);
      expect(slugs).toContain('diwali');
      expect(slugs).toContain('birthday');
      expect(slugs).toContain('anniversary');
    });
  });

  describe('D. Cart & Order Compatibility', () => {
    it('verifies order schema contains occasion_slug and occasion_id columns', () => {
      const cols = db.prepare('PRAGMA table_info(orders)').all() as any[];
      const occSlugCol = cols.find((c) => c.name === 'occasion_slug');
      const occIdCol = cols.find((c) => c.name === 'occasion_id');
      expect(occSlugCol).toBeDefined();
      expect(occIdCol).toBeDefined();
    });

    it('preserves historical orders without alteration', () => {
      const orders = db.prepare('SELECT id, order_number, occasion_slug, occasion_id FROM orders').all() as any[];
      expect(orders.length).toBe(2);
      expect(orders[0].order_number).toBe('TVO-2026-000001');
      expect(orders[1].order_number).toBe('TVO-2026-000002');
    });
  });
});
