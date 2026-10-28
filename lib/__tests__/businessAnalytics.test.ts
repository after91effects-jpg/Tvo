import { describe, it, expect } from 'vitest';
import { db } from '../server/db';
import { exportSalesToCSV, exportOrdersToCSV, exportCustomersToCSV } from '../csvHelpers';

describe('Business Analytics & Financial Reporting', () => {
  it('calculates order metrics and status distribution from orders table', () => {
    const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c;
    const grossRevenue = (db.prepare("SELECT COALESCE(SUM(total), 0) as s FROM orders WHERE status != 'Cancelled'").get() as any).s;

    expect(totalOrders).toBeGreaterThanOrEqual(0);
    expect(grossRevenue).toBeGreaterThanOrEqual(0);

    const statuses = db.prepare('SELECT status, COUNT(*) as cnt FROM orders GROUP BY status').all() as any[];
    expect(Array.isArray(statuses)).toBe(true);
  });

  it('formats sales records to accounting-standard CSV correctly', () => {
    const sampleSales = [
      {
        date: '2026-09-18',
        ordersCount: 4,
        revenue: 4500,
        discounts: 250,
        netRevenue: 4250,
        aov: 1063,
      },
      {
        date: '2026-09-17',
        ordersCount: 2,
        revenue: 1999,
        discounts: 100,
        netRevenue: 1899,
        aov: 950,
      },
    ];

    const csv = exportSalesToCSV(sampleSales);
    expect(csv).toContain('"Date"');
    expect(csv).toContain('"Orders Count"');
    expect(csv).toContain('"Gross Revenue (₹)"');
    expect(csv).toContain('"Net Revenue (₹)"');
    expect(csv).toContain('"2026-09-18"');
    expect(csv).toContain('4500');
  });

  it('formats orders to full operational CSV correctly', () => {
    const sampleOrders = [
      {
        order_number: 'ORD-2026-001',
        created_at: '2026-09-18 10:00:00',
        customer_name: 'Ananya Sharma',
        customer_email: 'ananya@example.com',
        customer_phone: '9876543210',
        status: 'Order Placed',
        payment_status: 'Paid',
        total: 1299,
        address_line1: '100 Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
      },
    ];

    const csv = exportOrdersToCSV(sampleOrders);
    expect(csv).toContain('"Order Number"');
    expect(csv).toContain('"Customer Name"');
    expect(csv).toContain('ORD-2026-001');
    expect(csv).toContain('Ananya Sharma');
    expect(csv).toContain('Bengaluru');
  });

  it('formats customer CRM data to CSV correctly', () => {
    const sampleCustomers = [
      {
        id: 101,
        name: 'Rahul Varma',
        email: 'rahul@example.com',
        phone: '9845012345',
        group_name: 'VIP',
        total_spend: 8500,
        order_count: 6,
        created_at: '2026-08-01',
        notes: 'Loves dark chocolate truffles',
      },
    ];

    const csv = exportCustomersToCSV(sampleCustomers);
    expect(csv).toContain('"ID"');
    expect(csv).toContain('"Group"');
    expect(csv).toContain('"Total Spend (₹)"');
    expect(csv).toContain('Rahul Varma');
    expect(csv).toContain('VIP');
    expect(csv).toContain('8500');
  });
});
