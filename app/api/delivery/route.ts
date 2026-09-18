import { ok, err, db } from '../../../lib/server/api';

export const runtime = 'nodejs';

function getISTDateTime(): { dateStr: string; currentMinutes: number } {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, '0');
  const dd = String(ist.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const currentMinutes = ist.getHours() * 60 + ist.getMinutes();
  return { dateStr, currentMinutes };
}

// Compute available delivery dates given buffer time, capacity and blackout dates
export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || '';

  try {
    if (action === 'zones') {
      return ok({ zones: db.prepare('SELECT * FROM delivery_zones WHERE active=1 ORDER BY name').all() });
    }
    if (action === 'pincode') {
      const code = (url.searchParams.get('code') || '').trim();
      if (!code) return err('Pincode required');
      const row = db.prepare('SELECT p.available as p_available, z.id as zone_id, z.name, z.city, z.fee, z.free_delivery_threshold, z.min_order_value, z.est_delivery_time, z.active as z_active FROM pincodes p LEFT JOIN delivery_zones z ON p.zone_id=z.id WHERE p.pincode=?').get(code) as any;
      if (!row || !row.p_available || !row.z_active) {
        return ok({ available: false, message: 'Delivery not available for this pincode. Currently we serve Gurugram and select Delhi NCR areas.' });
      }
      return ok({
        available: true,
        zone_id: row.zone_id,
        zone: row.name,
        city: row.city,
        fee: row.fee,
        free_delivery_threshold: row.free_delivery_threshold,
        min_order_value: row.min_order_value || 0,
        est_delivery_time: row.est_delivery_time,
        message: `Delivery available in ${row.city || 'your area'} (${row.name || 'Local Zone'}). Estimated delivery: ${row.est_delivery_time || 'Standard'}.`,
      });
    }
    if (action === 'slots') {
      return ok({ slots: db.prepare('SELECT * FROM delivery_slots WHERE available=1 ORDER BY start_time').all() });
    }
    if (action === 'availability') {
      // date + slot-capacity + blackout + buffer + same-day cutoff + production capacity aware
      const date = url.searchParams.get('date') || '';
      const slotId = url.searchParams.get('slot_id');
      if (!date) return err('Date required');
      const blackout = db.prepare('SELECT * FROM blackout_dates WHERE date=?').get(date) as any;
      if (blackout) return ok({ available: false, reason: blackout.reason || 'Closed on this date', fullyBooked: false, closed: true, blackout: true });
      
      const capacityRow = db.prepare('SELECT * FROM production_capacity WHERE date=?').get(date) as any ||
        db.prepare('SELECT * FROM production_capacity WHERE date=?').get('default') as any;
      const dailyCap = capacityRow?.daily_order_capacity ?? 100;
      
      const totalBooksRow = db.prepare('SELECT SUM(books) as total FROM slot_capacity WHERE date=?').get(date) as any;
      const totalBooks = totalBooksRow?.total || 0;
      const isDailyFull = totalBooks >= dailyCap;

      const { dateStr: todayIST, currentMinutes } = getISTDateTime();
      const isToday = date === todayIST;

      if (slotId) {
        const slot = db.prepare('SELECT * FROM delivery_slots WHERE id=?').get(slotId) as any;
        const dayCap = db.prepare('SELECT * FROM slot_capacity WHERE slot_id=? AND date=?').get(slotId, date) as any;
        const cap = dayCap ? dayCap.capacity : (slot?.capacity ?? 10);
        const books = dayCap ? dayCap.books : (slot?.books ?? 0);
        
        // Check same-day cutoff
        let cutoffPassed = false;
        if (isToday && slot?.start_time) {
          const [sh, sm] = slot.start_time.split(':').map(Number);
          const slotStartMinutes = (sh || 0) * 60 + (sm || 0);
          const cutoffMins = slot.cutoff_minutes ?? 120;
          if (currentMinutes > (slotStartMinutes - cutoffMins)) {
            cutoffPassed = true;
          }
        }

        const fullyBooked = books >= cap || isDailyFull;
        const closed = Boolean(dayCap && dayCap.closed);
        const available = !closed && !fullyBooked && !cutoffPassed;
        const reason = closed ? 'Slot closed' : (cutoffPassed ? 'Cut-off time passed for today' : (fullyBooked ? 'Slot fully booked' : undefined));

        return ok({ available, slotId: Number(slotId), books, capacity: cap, fullyBooked, cutoffPassed, closed, reason, date });
      }

      // Return full slots-for-date availability
      const slots = db.prepare('SELECT * FROM delivery_slots WHERE available=1 ORDER BY start_time').all() as any[];
      let anySlotAvailable = false;

      const result = slots.map((s) => {
        const dayCap = db.prepare('SELECT * FROM slot_capacity WHERE slot_id=? AND date=?').get(s.id, date) as any;
        const cap = dayCap ? dayCap.capacity : s.capacity;
        const books = dayCap ? dayCap.books : s.books;
        const closed = Boolean(dayCap && dayCap.closed);
        const fullyBooked = books >= cap || isDailyFull;

        let cutoffPassed = false;
        if (isToday && s.start_time) {
          const [sh, sm] = s.start_time.split(':').map(Number);
          const slotStartMinutes = (sh || 0) * 60 + (sm || 0);
          const cutoffMins = s.cutoff_minutes ?? 120;
          if (currentMinutes > (slotStartMinutes - cutoffMins)) {
            cutoffPassed = true;
          }
        }

        const isSlotAvailable = !closed && !fullyBooked && !cutoffPassed;
        if (isSlotAvailable) anySlotAvailable = true;

        return {
          id: s.id,
          name: s.name,
          start_time: s.start_time,
          end_time: s.end_time,
          fee: s.fee,
          cutoff_minutes: s.cutoff_minutes ?? 120,
          available: isSlotAvailable,
          books,
          capacity: cap,
          fullyBooked,
          cutoffPassed,
          closed,
        };
      });

      return ok({
        date,
        isToday,
        available: !isDailyFull && anySlotAvailable,
        slots: result,
        dailyCapacity: dailyCap,
        fullyBooked: isDailyFull,
        blackout: false,
      });
    }
    return ok({ slots: db.prepare('SELECT * FROM delivery_slots WHERE available=1 ORDER BY start_time').all() });
  } catch (e: any) {
    return err(e.message, 500);
  }
}
