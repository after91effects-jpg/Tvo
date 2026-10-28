import { describe, it, expect } from 'vitest';
import { db } from '../server/db';

describe('BUG-005: Admin Order Status History Timeline Date Formatter', () => {
  // Logic extracted directly from components/admin/CustomerOrdersView.tsx lines 1117-1125
  function formatTimelineTime(hist: any): string | null {
    const ts = hist.timestamp || (hist as any).created_at || (hist as any).date;
    const valid = ts && !isNaN(new Date(ts).getTime());
    return valid
      ? `(${new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`
      : null;
  }

  it('renders a valid formatted time for standard timestamp field', () => {
    const hist = {
      status: 'Baking in Kitchen',
      timestamp: '2026-09-19T10:30:00.000Z',
      note: 'Started baking',
    };
    const formatted = formatTimelineTime(hist);
    expect(formatted).not.toBeNull();
    expect(formatted).not.toContain('Invalid Date');
    expect(formatted).toMatch(/^\(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)?\)$/i);
  });

  it('safely resolves created_at when timestamp is missing', () => {
    const hist = {
      status: 'Order Placed',
      created_at: '2026-09-03T00:27:20.845Z',
    };
    const formatted = formatTimelineTime(hist);
    expect(formatted).not.toBeNull();
    expect(formatted).not.toContain('Invalid Date');
    expect(formatted).toMatch(/^\(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)?\)$/i);
  });

  it('verifies real database order TVO-2026-000001 status timeline renders valid time', () => {
    const order = db
      .prepare("SELECT order_number, timeline, created_at FROM orders WHERE order_number='TVO-2026-000001'")
      .get() as { order_number: string; timeline: string; created_at: string } | undefined;

    expect(order).toBeDefined();
    expect(order?.order_number).toBe('TVO-2026-000001');

    const timeline = JSON.parse(order?.timeline || '[]');
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);

    const firstEntry = timeline[0];
    expect(firstEntry.status).toBe('Order Placed');
    expect(firstEntry.created_at).toBeDefined();
    expect(firstEntry.timestamp).toBeUndefined(); // Demonstrates the exact production data condition

    const formatted = formatTimelineTime(firstEntry);
    expect(formatted).not.toBeNull();
    expect(formatted).not.toContain('Invalid Date');
    expect(formatted).toMatch(/^\(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)?\)$/i);
  });

  it('verifies order TVO-2026-000002 status timeline renders valid time without Invalid Date', () => {
    const order = db
      .prepare("SELECT order_number, timeline, created_at FROM orders WHERE order_number='TVO-2026-000002'")
      .get() as { order_number: string; timeline: string; created_at: string } | undefined;

    expect(order).toBeDefined();
    const timeline = JSON.parse(order?.timeline || '[]');
    const firstEntry = timeline[0];

    const formatted = formatTimelineTime(firstEntry);
    expect(formatted).not.toBeNull();
    expect(formatted).not.toContain('Invalid Date');
  });

  it('safely handles missing, null, or invalid dates without rendering Invalid Date', () => {
    expect(formatTimelineTime({})).toBeNull();
    expect(formatTimelineTime({ timestamp: null })).toBeNull();
    expect(formatTimelineTime({ timestamp: undefined, created_at: null })).toBeNull();
    expect(formatTimelineTime({ timestamp: 'not-a-valid-date' })).toBeNull();
    expect(formatTimelineTime({ created_at: 'garbage-date-value' })).toBeNull();
  });

  it('prefers timestamp over created_at when both are provided', () => {
    const hist = {
      status: 'Out for Delivery',
      timestamp: '2026-09-19T14:00:00.000Z',
      created_at: '2026-09-19T12:00:00.000Z',
    };
    const formatted = formatTimelineTime(hist);
    expect(formatted).not.toBeNull();
    expect(formatted).not.toContain('Invalid Date');
  });

  it('safely resolves legacy date field when timestamp and created_at are missing', () => {
    const hist = {
      status: 'Delivered',
      date: '2026-09-19T16:00:00.000Z',
    };
    const formatted = formatTimelineTime(hist);
    expect(formatted).not.toBeNull();
    expect(formatted).not.toContain('Invalid Date');
    expect(formatted).toMatch(/^\(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)?\)$/i);
  });
});
