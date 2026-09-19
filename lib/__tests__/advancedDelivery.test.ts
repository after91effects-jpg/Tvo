import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../server/db';
import { validateSlot, createOrder } from '../server/order-engine';
import * as ops from '../server/admin-ops';

const mockAdminUser = {
  id: 1,
  name: 'Admin User',
  email: 'admin@tvoflavours.com',
  role: 'super_admin',
};

describe('TVO Flavours — Step 11: Advanced Delivery Management Test Suite', () => {
  // -------------------------------------------------------------------------
  // 1. Delivery Zones & Pincode Resolution
  // -------------------------------------------------------------------------
  describe('1. Delivery Zones & Pincode Resolution', () => {
    it('resolves Gurugram pincode 122001 to Gurugram zone with correct fee and threshold', () => {
      const row = db.prepare(`
        SELECT p.pincode, p.available, z.name as zone_name, z.fee, z.free_delivery_threshold, z.min_order_value
        FROM pincodes p
        JOIN delivery_zones z ON p.zone_id = z.id
        WHERE p.pincode = ? AND p.available = 1 AND z.active = 1
      `).get('122001') as any;

      expect(row).toBeDefined();
      expect(row.zone_name).toBe('Gurugram');
      expect(row.fee).toBe(49);
      expect(row.free_delivery_threshold).toBe(499);
      expect(row.min_order_value).toBeDefined();
    });

    it('resolves Delhi NCR pincode 110001 with correct delivery fee', () => {
      const row = db.prepare(`
        SELECT p.pincode, z.name as zone_name, z.fee
        FROM pincodes p
        JOIN delivery_zones z ON p.zone_id = z.id
        WHERE p.pincode = ?
      `).get('110001') as any;

      expect(row).toBeDefined();
      expect(row.zone_name).toBe('Delhi NCR');
      expect(row.fee).toBe(79);
    });

    it('resolves Deoria pincode 274001 to Deoria zone with fee 0', () => {
      const row = db.prepare(`
        SELECT p.pincode, p.available, z.name as zone_name, z.fee, z.free_delivery_threshold, z.min_order_value
        FROM pincodes p
        JOIN delivery_zones z ON p.zone_id = z.id
        WHERE p.pincode = ? AND p.available = 1 AND z.active = 1
      `).get('274001') as any;

      expect(row).toBeDefined();
      expect(row.zone_name).toBe('Deoria');
      expect(row.fee).toBe(0);
    });

    it('creates an order with Deoria pincode 274001 with delivery fee 0', () => {
      const prod = db.prepare('SELECT id, stock FROM products WHERE stock > 0 LIMIT 1').get() as any;
      const targetDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
      const testOrderNum = `TVO-DEORIA-TEST-${Date.now()}`;
      try {
        const res = createOrder({
          items: [{ productId: prod.id, qty: 1, weight: '0.5 Kg' }],
          body: {
            customer: { name: 'Deoria Customer', phone: '9876543210' },
            address: 'Civil Lines, Near Subhash Chowk',
            city: 'Deoria',
            pincode: '274001',
            deliveryDate: targetDate,
            deliverySlot: 'Morning Fresh',
            paymentMethod: 'COD',
          },
          customerId: null,
          generateOrderNumber: () => testOrderNum,
        });

        expect(res.orderNumber).toBe(testOrderNum);
        expect(res.deliveryFee).toBe(0);
        expect(res.total).toBe(res.subtotal);

        const orderInDb = db.prepare('SELECT delivery_fee, total, subtotal FROM orders WHERE order_number=?').get(testOrderNum) as any;
        expect(orderInDb.delivery_fee).toBe(0);
      } finally {
        db.prepare('DELETE FROM orders WHERE order_number=?').run(testOrderNum);
        db.prepare("UPDATE products SET stock = stock + 1, stock_status = 'in_stock' WHERE id=?").run(prod.id);
        db.prepare('DELETE FROM inventory_transactions WHERE note LIKE ?').run(`%${testOrderNum}%`);
      }
    });

    it('correctly handles unserviceable pincodes', () => {
      const row = db.prepare(`
        SELECT p.pincode FROM pincodes p WHERE p.pincode = ? AND p.available = 1
      `).get('999999');

      expect(row).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Slots & Evening Surcharges
  // -------------------------------------------------------------------------
  describe('2. Delivery Slots & Surcharges', () => {
    it('returns all 6 operational delivery slots', () => {
      const slots = db.prepare('SELECT * FROM delivery_slots WHERE available=1 ORDER BY start_time').all() as any[];
      expect(slots.length).toBeGreaterThanOrEqual(6);
      expect(slots[0].start_time).toBe('09:00');
    });

    it('verifies evening slot has additional surcharge fee', () => {
      const eveningSlot = db.prepare("SELECT * FROM delivery_slots WHERE start_time >= '18:00'").get() as any;
      expect(eveningSlot).toBeDefined();
      expect(eveningSlot.fee).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Cut-off & Lead Time Enforcement
  // -------------------------------------------------------------------------
  describe('3. Cut-off & Same-Day Lead Time Enforcement', () => {
    it('accepts future date without same-day elapsed cutoff restrictions', () => {
      const future = new Date();
      future.setDate(future.getDate() + 4);
      const futureYmd = future.toISOString().split('T')[0];

      const res = validateSlot(futureYmd, 'Morning Fresh', 1, { checkCutoff: true });
      expect(res.ok).toBe(true);
      expect(res.slot).toBeDefined();
    });

    it('rejects order on blackout holiday dates', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const testBlackout = future.toISOString().split('T')[0];
      try {
        db.prepare('INSERT OR REPLACE INTO blackout_dates (date, reason) VALUES (?, ?)').run(testBlackout, 'Bakery Renovation');
        const res = validateSlot(testBlackout, 'Morning Fresh', 1, { checkCutoff: true });
        expect(res.ok).toBe(false);
        expect(res.error).toMatch(/closed on this date/i);
      } finally {
        db.prepare('DELETE FROM blackout_dates WHERE date=?').run(testBlackout);
      }
    });

    it('rejects same-day slot when cutoff time has passed', () => {
      // Mock slot with start time in the past relative to now
      const d = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const todayIST = new Date(d.getTime() + istOffset).toISOString().split('T')[0];

      // Slot 1 starts at 09:00 with cutoff_minutes: 120 (cutoff was 07:00 IST).
      // Assuming test runs after 07:00 AM IST:
      const nowHours = new Date(d.getTime() + istOffset).getHours();
      if (nowHours >= 8) {
        const res = validateSlot(todayIST, null, 1, { checkCutoff: true });
        expect(res.ok).toBe(false);
        expect(res.error).toMatch(/cut-off time.*already passed/i);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. Slot Capacity Tracking & Exhaustion
  // -------------------------------------------------------------------------
  describe('4. Slot Capacity & Exhaustion Control', () => {
    it('blocks slot selection when capacity is full', () => {
      const future = new Date();
      future.setDate(future.getDate() + 6);
      const testDate = future.toISOString().split('T')[0];
      const slotId = 2;
      try {
        // Set capacity = 2, books = 2 (fully booked)
        ops.setSlotCapacity(mockAdminUser, { slot_id: slotId, date: testDate, capacity: 2, closed: 0 });
        db.prepare('UPDATE slot_capacity SET books = 2 WHERE slot_id=? AND date=?').run(slotId, testDate);

        const res = validateSlot(testDate, null, slotId);
        expect(res.ok).toBe(false);
        expect(res.error).toMatch(/fully booked/i);
      } finally {
        db.prepare('DELETE FROM slot_capacity WHERE slot_id=? AND date=?').run(slotId, testDate);
      }
    });

    it('blocks slot when marked closed by admin', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const testDate = future.toISOString().split('T')[0];
      const slotId = 2;
      try {
        ops.setSlotCapacity(mockAdminUser, { slot_id: slotId, date: testDate, capacity: 20, closed: 1 });
        const res = validateSlot(testDate, null, slotId);
        expect(res.ok).toBe(false);
        expect(res.error).toMatch(/fully booked/i);
      } finally {
        db.prepare('DELETE FROM slot_capacity WHERE slot_id=? AND date=?').run(slotId, testDate);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 5. Driver & Fleet Management
  // -------------------------------------------------------------------------
  describe('5. Driver & Fleet Operations', () => {
    let testDriverId: number;

    beforeEach(() => {
      const res = ops.saveDriver(mockAdminUser, {
        name: 'Vikas Sharma',
        phone: '+91 98111 22233',
        vehicle_type: 'Two Wheeler',
        vehicle_number: 'HR 26 DQ 5678',
        status: 'available',
        active: 1,
      });
      const driver = db.prepare("SELECT id FROM drivers WHERE phone='+91 98111 22233'").get() as any;
      testDriverId = driver.id;
    });

    afterEach(() => {
      if (testDriverId) {
        db.prepare('DELETE FROM drivers WHERE id=?').run(testDriverId);
      }
    });

    it('creates and lists drivers with availability status', () => {
      const drivers = ops.listDrivers(mockAdminUser);
      const found: any = drivers.find((d: any) => d.id === testDriverId);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Vikas Sharma');
      expect(found?.status).toBe('available');
    });

    it('assigns driver to order and transitions delivery status to assigned', () => {
      // Find or create test order
      const order = db.prepare('SELECT id FROM orders LIMIT 1').get() as any;
      if (order) {
        const assignRes = ops.assignDriverToOrder(mockAdminUser, order.id, testDriverId);
        expect(assignRes.ok).toBe(true);

        const updated = db.prepare('SELECT driver_id, delivery_status FROM orders WHERE id=?').get(order.id) as any;
        expect(updated.driver_id).toBe(testDriverId);
        expect(updated.delivery_status).toBe('assigned');

        // Unassign to leave clean
        ops.assignDriverToOrder(mockAdminUser, order.id, null);
      }
    });

    it('updates delivery status through dispatch lifecycle', () => {
      const order = db.prepare('SELECT id FROM orders LIMIT 1').get() as any;
      if (order) {
        // Out for delivery
        ops.updateDeliveryStatus(mockAdminUser, order.id, 'out_for_delivery');
        let row = db.prepare('SELECT delivery_status, dispatched_at, status FROM orders WHERE id=?').get(order.id) as any;
        expect(row.delivery_status).toBe('out_for_delivery');
        expect(row.dispatched_at).toBeDefined();

        // Failed delivery with reason
        ops.updateDeliveryStatus(mockAdminUser, order.id, 'failed', undefined, 'Customer phone switched off');
        row = db.prepare('SELECT delivery_status, delivery_failure_reason FROM orders WHERE id=?').get(order.id) as any;
        expect(row.delivery_status).toBe('failed');
        expect(row.delivery_failure_reason).toBe('Customer phone switched off');

        // Reset to pending for historical order integrity
        db.prepare("UPDATE orders SET delivery_status='pending', delivery_failure_reason=NULL, dispatched_at=NULL, delivered_at=NULL WHERE id=?").run(order.id);
      }
    });

    it('blocks driver deletion if driver has active deliveries', () => {
      const order = db.prepare('SELECT id FROM orders LIMIT 1').get() as any;
      if (order) {
        ops.assignDriverToOrder(mockAdminUser, order.id, testDriverId);
        const delRes = ops.deleteDriver(mockAdminUser, testDriverId);
        expect(delRes.ok).toBe(false);
        expect(delRes.error).toMatch(/active deliveries/i);

        // Cleanup
        ops.assignDriverToOrder(mockAdminUser, order.id, null);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 6. Bulk Operations
  // -------------------------------------------------------------------------
  describe('6. Bulk Pincode Operations', () => {
    it('imports multiple valid 6-digit PIN codes and ignores invalid formats', () => {
      const zone = db.prepare('SELECT id FROM delivery_zones LIMIT 1').get() as any;
      const zoneId = zone.id;

      const rawPincodes = ['122991', '122992', 'invalid', '123', '122993'];
      try {
        const res = ops.bulkSavePincodes(mockAdminUser, zoneId, rawPincodes);
        expect(res.ok).toBe(true);
        expect(res.count).toBe(3); // 3 valid codes

        const p1 = db.prepare('SELECT * FROM pincodes WHERE pincode=?').get('122991');
        expect(p1).toBeDefined();
      } finally {
        db.prepare("DELETE FROM pincodes WHERE pincode IN ('122991', '122992', '122993')").run();
      }
    });
  });

  // -------------------------------------------------------------------------
  // 7. Database Safety Verification
  // -------------------------------------------------------------------------
  describe('7. Database Safety Baseline', () => {
    it('verifies baseline counts remain pristine', () => {
      const counts = {
        products: (db.prepare('SELECT count(*) as c FROM products').get() as any).c,
        orders: (db.prepare('SELECT count(*) as c FROM orders').get() as any).c,
        users: (db.prepare('SELECT count(*) as c FROM users').get() as any).c,
        categories: (db.prepare('SELECT count(*) as c FROM categories').get() as any).c,
        addons: (db.prepare('SELECT count(*) as c FROM addons').get() as any).c,
        zones: (db.prepare('SELECT count(*) as c FROM delivery_zones').get() as any).c,
      };

      expect(counts.products).toBe(149);
      expect(counts.orders).toBe(2);
      expect(counts.users).toBe(1);
      expect(counts.categories).toBe(65);
      expect(counts.addons).toBe(11);
      expect(counts.zones).toBe(4);
    });
  });
});
