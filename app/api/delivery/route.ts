import { ok, err, db } from '../../../lib/server/api';

export const runtime = 'nodejs';

// Compute available delivery dates given buffer time, capacity and blackout dates
export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || '';

  try {
    if (action === 'zones') {
      return ok({ zones: db.prepare('SELECT * FROM delivery_zones WHERE active=1').all() });
    }
    if (action === 'pincode') {
      const code = (url.searchParams.get('code') || '').trim();
      if (!code) return err('Pincode required');
      const row = db.prepare('SELECT p.available as p_available, z.name, z.city, z.fee, z.free_delivery_threshold, z.est_delivery_time, z.active as z_active FROM pincodes p LEFT JOIN delivery_zones z ON p.zone_id=z.id WHERE p.pincode=?').get(code) as any;
      if (!row || !row.p_available || !row.z_active) {
        return ok({ available: false, message: 'Delivery not available for this pincode. Currently we serve Gurugram and select Delhi NCR areas.' });
      }
      return ok({
        available: true,
        zone: row.name,
        city: row.city,
        fee: row.fee,
        free_delivery_threshold: row.free_delivery_threshold,
        est_delivery_time: row.est_delivery_time,
        message: `Delivery available in ${row.city || 'your area'} (${row.name || 'Local Zone'}). Estimated delivery: ${row.est_delivery_time || 'Standard'}.`,
      });
    }
    if (action === 'slots') {
      return ok({ slots: db.prepare('SELECT * FROM delivery_slots WHERE available=1 ORDER BY start_time').all() });
    }
    if (action === 'availability') {
      // date + slot-capacity + blackout + buffer + production capacity aware
      const date = url.searchParams.get('date') || '';
      const slotId = url.searchParams.get('slot_id');
      if (!date) return err('Date required');
      const blackout = db.prepare('SELECT * FROM blackout_dates WHERE date=?').get(date) as any;
      if (blackout) return ok({ available: false, reason: blackout.reason || 'Closed on this date', fullyBooked: false, closed: true });
      
      const capacityRow = db.prepare('SELECT * FROM production_capacity WHERE date=?').get(date) as any ||
        db.prepare('SELECT * FROM production_capacity WHERE date=?').get('default') as any;
      const dailyCap = capacityRow?.daily_order_capacity ?? 100;
      
      const totalBooksRow = db.prepare('SELECT SUM(books) as total FROM slot_capacity WHERE date=?').get(date) as any;
      const totalBooks = totalBooksRow?.total || 0;
      const isDailyFull = totalBooks >= dailyCap;

      if (slotId) {
        const slot = db.prepare('SELECT * FROM delivery_slots WHERE id=?').get(slotId) as any;
        const dayCap = db.prepare('SELECT * FROM slot_capacity WHERE slot_id=? AND date=?').get(slotId, date) as any;
        const cap = dayCap ? dayCap.capacity : (slot?.capacity ?? 10);
        const books = dayCap ? dayCap.books : (slot?.books ?? 0);
        const available = !(dayCap && dayCap.closed) && books < cap && !isDailyFull;
        return ok({ available, slotId: Number(slotId), books, capacity: cap, fullyBooked: books >= cap || isDailyFull, date });
      }
      // Return full slots-for-date availability
      const slots = db.prepare('SELECT * FROM delivery_slots WHERE available=1').all() as any[];
      const result = slots.map((s) => {
        const dayCap = db.prepare('SELECT * FROM slot_capacity WHERE slot_id=? AND date=?').get(s.id, date) as any;
        const cap = dayCap ? dayCap.capacity : s.capacity;
        const books = dayCap ? dayCap.books : s.books;
        const closed = dayCap ? dayCap.closed : false;
        const fullyBooked = books >= cap || isDailyFull;
        return { id: s.id, name: s.name, start_time: s.start_time, end_time: s.end_time, fee: s.fee, available: !closed && !fullyBooked, books, capacity: cap, fullyBooked };
      });
      return ok({ date, available: !isDailyFull, slots: result, dailyCapacity: dailyCap, fullyBooked: isDailyFull, blackout: false });
    }
    return ok({ slots: db.prepare('SELECT * FROM delivery_slots').all() });
  } catch (e: any) {
    return err(e.message, 500);
  }
}
