import {db} from './db';
export function syncDriverAvailability(id:number|null|undefined){
  if(!id)return;
  const driver=db.prepare('SELECT active,status FROM drivers WHERE id=?').get(id) as any;
  if(!driver?.active||driver.status==='off_duty')return;
  const remaining=Number((db.prepare("SELECT COUNT(*) AS c FROM orders WHERE driver_id=? AND status NOT IN ('Delivered','Cancelled') AND delivery_status IN ('assigned','out_for_delivery')").get(id) as any)?.c||0);
  db.prepare("UPDATE drivers SET status=?,updated_at=datetime('now') WHERE id=?").run(remaining?'on_delivery':'available',id);
}
