import { validateSlot } from '../../../lib/server/order-engine';
import { validateReportDates } from '../../../lib/server/reporting';
import { ok, err, db } from '../../../lib/server/api';

export const runtime = 'nodejs';

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
      if (!/^[1-9]\d{5}$/.test(code)) return err('Enter a valid 6-digit pincode',400);
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
      try { validateReportDates(date,''); } catch { return err('Enter a valid delivery date',400); }
      if(slotId==='pickup') { const result=validateSlot(date,'Store Pickup','pickup',{checkCutoff:true});return ok({available:result.ok,reason:result.error,date,slotId:'pickup'}); }
      const slots=db.prepare('SELECT * FROM delivery_slots WHERE available=1 ORDER BY start_time').all() as any[];
      const evaluate=(slot:any)=>{
        const day=db.prepare('SELECT * FROM slot_capacity WHERE slot_id=? AND date=?').get(slot.id,date) as any;
        const result=validateSlot(date,slot.name,slot.id,{checkCutoff:true});
        return {...slot,books:day?.books??0,capacity:day?.capacity??slot.capacity,available:result.ok,reason:result.error,closed:!!day?.closed,fullyBooked:!!result.error&&/capacity|fully booked/.test(result.error),cutoffPassed:!!result.error&&/cut-off/.test(result.error)};
      };
      if(slotId){const slot=db.prepare('SELECT * FROM delivery_slots WHERE id=?').get(slotId) as any;if(!slot)return ok({available:false,reason:'Delivery slot not found',date});return ok({...evaluate(slot),slotId:slot.id,date});}
      const result=slots.map(evaluate);
      return ok({date,slots:result,available:result.some(slot=>slot.available),fullyBooked:result.length>0&&result.every(slot=>slot.fullyBooked),blackout:result.some(slot=>/closed on this date/i.test(slot.reason||''))});
    }

    return ok({ slots: db.prepare('SELECT * FROM delivery_slots WHERE available=1 ORDER BY start_time').all() });
  } catch (e: any) {
    return err(e.message, 500);
  }
}
