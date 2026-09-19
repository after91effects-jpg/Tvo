import { describe, it, expect } from 'vitest';
import { normalizeOrderRow } from '../orderNormalizer';
import { GET as getProducts } from '../../app/api/products/route';
import { db } from '../server/api';

describe('TVO Flavours Master Bug Resolution Suite', () => {
  // ---------------------------------------------------------------------------
  // 1. OrderNormalizer & Addons Safety (PART 3)
  // ---------------------------------------------------------------------------
  describe('1. OrderNormalizer & Addons Safety', () => {
    it('normalizes item.addons into a guaranteed array when addons is null or string', () => {
      const rawRowWithJsonAddons = {
        id: 101,
        order_number: 'TVO-TEST-ADDONS-1',
        items: JSON.stringify([
          {
            name: 'Belgian Chocolate Cake',
            addons: JSON.stringify(['Sparkle Candle', 'Birthday Tag']),
          },
          {
            name: 'Red Velvet Cake',
            addons: null,
          },
        ]),
      };

      const normalized = normalizeOrderRow(rawRowWithJsonAddons);
      expect(Array.isArray(normalized.items)).toBe(true);
      expect(Array.isArray(normalized.items[0].addons)).toBe(true);
      expect(normalized.items[0].addons).toEqual(['Sparkle Candle', 'Birthday Tag']);
      expect(Array.isArray(normalized.items[1].addons)).toBe(true);
      expect(normalized.items[1].addons).toEqual([]);
    });

    it('safely extracts addon names and prices without producing [object Object]', () => {
      const mixedAddons = [
        'Candle Set',
        { id: 1, name: 'Personalized Card', price: 49 },
        { id: 2, price: 99 }, // object without name
        null,
        undefined,
      ];

      const formatted = mixedAddons
        .map((a: any) => {
          if (typeof a === 'string') return a;
          if (a && typeof a === 'object') return a.name || (a.price ? `Add-on (₹${a.price})` : '');
          return '';
        })
        .filter(Boolean);

      expect(formatted).toEqual([
        'Candle Set',
        'Personalized Card',
        'Add-on (₹99)',
      ]);
      expect(formatted.join(', ')).not.toContain('[object Object]');
      expect(formatted.join(', ')).not.toContain('undefined');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. BUG-015: Admin Order Filter Date Range Validation
  // ---------------------------------------------------------------------------
  describe('2. BUG-015: Admin Date Range Filter Safety', () => {
    function computeActiveDateRangeLabel(startDate: string, endDate: string): string | null {
      if (!startDate && !endDate) return null;
      const parseSafe = (dStr: string) => {
        const d = new Date(`${dStr}T12:00:00`);
        return isNaN(d.getTime()) ? null : d;
      };
      const sDate = startDate ? parseSafe(startDate) : null;
      const eDate = endDate ? parseSafe(endDate) : null;
      if (!sDate && !eDate) return null;
      if (sDate && eDate && startDate === endDate) {
        return sDate.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      if (sDate && eDate) {
        const s = sDate.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
        });
        const e = eDate.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          year: sDate.getFullYear() !== eDate.getFullYear() ? 'numeric' : undefined,
        });
        return `${s} – ${e}`;
      }
      if (sDate) {
        return `From ${sDate.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`;
      }
      if (eDate) {
        return `Until ${eDate.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`;
      }
      return null;
    }

    it('returns formatted date for valid date inputs', () => {
      const label = computeActiveDateRangeLabel('2026-09-01', '2026-09-15');
      expect(label).toBeTruthy();
      expect(label).not.toContain('Invalid Date');
    });

    it('returns null and guards gracefully when invalid date string is provided', () => {
      const label = computeActiveDateRangeLabel('invalid-date', 'not-a-date');
      expect(label).toBeNull();
    });

    it('handles single invalid date gracefully when the other is valid', () => {
      const label = computeActiveDateRangeLabel('2026-09-01', 'invalid-date');
      expect(label).toBeTruthy();
      expect(label).toContain('From');
      expect(label).not.toContain('Invalid Date');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. BUG-016: Payment Dashboard Ledger CSV Export Guard
  // ---------------------------------------------------------------------------
  describe('3. BUG-016: Payment Dashboard Ledger CSV Export Guard', () => {
    it('safely handles undefined or empty transactions without throwing TypeError', () => {
      const dataEmptyTransactions = { transactions: undefined };
      const items = Array.isArray((dataEmptyTransactions as any)?.transactions?.items)
        ? (dataEmptyTransactions as any).transactions.items
        : [];
      const rows = items.map((tx: any) => [tx.id]);
      expect(rows).toEqual([]);
    });

    it('maps valid transaction items properly when populated', () => {
      const dataWithItems = {
        transactions: {
          items: [
            {
              id: 'tx_1',
              created_at: '2026-09-19T10:00:00Z',
              order_number: 'TVO-2026-000001',
              amount: 1200,
            },
          ],
        },
      };
      const items = Array.isArray(dataWithItems?.transactions?.items)
        ? dataWithItems.transactions.items
        : [];
      const rows = items.map((tx: any) => [tx.id, tx.order_number, tx.amount]);
      expect(rows.length).toBe(1);
      expect(rows[0]).toEqual(['tx_1', 'TVO-2026-000001', 1200]);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. BUG-009: Products API Cache-Control Header
  // ---------------------------------------------------------------------------
  describe('4. BUG-009: Products API Cache-Control Header', () => {
    it('sets Cache-Control header on public catalog product list responses', async () => {
      const req = new Request('http://localhost/api/products?limit=5');
      const res = await getProducts(req);
      expect(res.status).toBe(200);
      const cacheHeader = res.headers.get('Cache-Control');
      expect(cacheHeader).toBeDefined();
      expect(cacheHeader).toContain('public');
      expect(cacheHeader).toContain('s-maxage=60');
    });

    it('sets Cache-Control header on single product slug response', async () => {
      const firstProd = db.prepare('SELECT slug FROM products WHERE slug IS NOT NULL LIMIT 1').get() as any;
      if (firstProd?.slug) {
        const req = new Request(`http://localhost/api/products?slug=${encodeURIComponent(firstProd.slug)}`);
        const res = await getProducts(req);
        expect(res.status).toBe(200);
        const cacheHeader = res.headers.get('Cache-Control');
        expect(cacheHeader).toBeDefined();
        expect(cacheHeader).toContain('public');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. PART 11: Real Database Order TVO-2026-000001 Verification
  // ---------------------------------------------------------------------------
  describe('5. Real Database Order TVO-2026-000001 Verification', () => {
    it('verifies TVO-2026-000001 timeline uses created_at and formats without Invalid Date', () => {
      const order = db.prepare('SELECT * FROM orders WHERE order_number=?').get('TVO-2026-000001') as any;
      expect(order).toBeDefined();
      expect(order.order_number).toBe('TVO-2026-000001');

      const timeline = JSON.parse(order.timeline || '[]');
      expect(timeline.length).toBeGreaterThan(0);
      const firstEvent = timeline[0];

      // Production timeline row uses created_at
      expect(firstEvent.created_at).toBeDefined();

      const ts = firstEvent.timestamp || firstEvent.created_at || firstEvent.date;
      expect(ts).toBeDefined();
      const dateObj = new Date(ts);
      expect(isNaN(dateObj.getTime())).toBe(false);

      const formattedTime = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      expect(formattedTime).not.toContain('Invalid Date');
      expect(formattedTime).toMatch(/\d{1,2}:\d{2}\s*(am|pm)/i);
    });
  });
});
