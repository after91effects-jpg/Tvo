import {describe,it,expect,beforeEach,afterEach} from 'vitest';
import {db} from '../server/db';
import * as ops from '../server/admin-ops';
import {changeOrderStatus} from '../server/order-status';
import {validateSlot} from '../server/order-engine';
import {GET} from '../../app/api/delivery/route';
const admin={id:1,name:'Admin',email:'fixture@example.com',role:'super_admin'};
let order:number,first:number,second:number;
const driver=(id:number)=>db.prepare('SELECT * FROM drivers WHERE id=?').get(id) as any;
const current=()=>db.prepare('SELECT * FROM orders WHERE id=?').get(order) as any;
describe('Delivery safety',()=>{
 beforeEach(()=>{
  db.exec('SAVEPOINT delivery_safety');
  order=Number(db.prepare("INSERT INTO orders (order_number,customer_name,status,items,delivery_slot,payment_status) VALUES ('TVO-DELIVERY-SAFETY','Fixture','Accepted','[]','Delivery','Paid')").run().lastInsertRowid);
  first=Number(db.prepare("INSERT INTO drivers (name,phone,status,active) VALUES ('First','9876543210','available',1)").run().lastInsertRowid);
  second=Number(db.prepare("INSERT INTO drivers (name,phone,status,active) VALUES ('Second','9876543211','available',1)").run().lastInsertRowid);
 });
 afterEach(()=>{db.exec('ROLLBACK TO delivery_safety');db.exec('RELEASE delivery_safety');});
 it('reassignment frees the old driver and reserves the new driver',()=>{
  expect(ops.assignDriverToOrder(admin,order,first).ok).toBe(true);
  expect(driver(first).status).toBe('on_delivery');
  expect(ops.assignDriverToOrder(admin,order,second).ok).toBe(true);
  expect(driver(first).status).toBe('available');expect(driver(second).status).toBe('on_delivery');
 });
 it('dispatch and delivery update public order state, timestamps and driver availability',()=>{
  ops.assignDriverToOrder(admin,order,first);
  expect(ops.updateDeliveryStatus(admin,order,'out_for_delivery').ok).toBe(true);
  expect(current().status).toBe('Out for Delivery');expect(current().dispatched_at).toBeTruthy();
  expect(ops.updateDeliveryStatus(admin,order,'delivered').ok).toBe(true);
  expect(current().status).toBe('Delivered');expect(current().delivered_at).toBeTruthy();expect(driver(first).status).toBe('available');
  expect(ops.assignDriverToOrder(admin,order,second).ok).toBe(false);
  expect(ops.updateDeliveryStatus(admin,order,'out_for_delivery').ok).toBe(false);
 });
 it('cancellation releases a driver without inventing a gateway refund',()=>{
  ops.assignDriverToOrder(admin,order,first);expect(changeOrderStatus(admin,order,'Cancelled').ok).toBe(true);
  expect(current().delivery_status).toBe('cancelled');expect(current().payment_status).toBe('Paid');expect(driver(first).status).toBe('available');
  expect(ops.assignDriverToOrder(admin,order,second).ok).toBe(false);
 });
 it('requires a driver and reason, and blocks off-duty dispatch',()=>{
  expect(ops.updateDeliveryStatus(admin,order,'out_for_delivery').ok).toBe(false);
  expect(ops.updateDeliveryStatus(admin,order,'failed').ok).toBe(false);
  expect(ops.updateDeliveryStatus(admin,order,'returned').ok).toBe(false);
  ops.assignDriverToOrder(admin,order,first);db.prepare("UPDATE drivers SET status='off_duty' WHERE id=?").run(first);
  expect(ops.updateDeliveryStatus(admin,order,'out_for_delivery').ok).toBe(false);
 });
 it('pickup needs no driver but cannot be dispatched to the road',()=>{
  db.prepare("UPDATE orders SET delivery_slot='Store Pickup' WHERE id=?").run(order);
  expect(ops.assignDriverToOrder(admin,order,first).ok).toBe(false);
  expect(ops.updateDeliveryStatus(admin,order,'out_for_delivery').ok).toBe(false);
  expect(ops.updateDeliveryStatus(admin,order,'delivered').ok).toBe(true);
 });
 it('public availability rejects unknown slots and invalid calendar dates',async()=>{
  const future=new Date(Date.now()+86400000*2).toISOString().slice(0,10);
  expect(validateSlot(future,'Missing slot',999999).ok).toBe(false);
  const response=await GET(new Request(`http://localhost/api/delivery?action=availability&date=${future}&slot_id=999999`));
  expect((await response.json()).available).toBe(false);
  expect((await GET(new Request('http://localhost/api/delivery?action=availability&date=2026-02-31'))).status).toBe(400);
 });
 it('does not apply historical global bookings to a different date, and respects zero daily capacity',()=>{
  const future=new Date(Date.now()+86400000*2).toISOString().slice(0,10);
  const slot=Number(db.prepare("INSERT INTO delivery_slots (name,start_time,end_time,capacity,books,fee,cutoff_minutes,available,days) VALUES ('Safety Slot','18:00','20:00',10,9999,0,0,1,'[0,1,2,3,4,5,6]')").run().lastInsertRowid);
  expect(validateSlot(future,'Safety Slot',slot).ok).toBe(true);
  ops.setSlotCapacity(admin,{slot_id:slot,date:future,capacity:0});
  expect(validateSlot(future,'Safety Slot',slot).ok).toBe(false);
 });
 it('rejects fractional capacity and negative fees',()=>{
  expect(ops.saveSlot(admin,{name:'Invalid',start_time:'12:00',end_time:'13:00',capacity:1.5}).ok).toBe(false);
  expect(ops.saveSlot(admin,{name:'Invalid',start_time:'12:00',end_time:'13:00',fee:-1}).ok).toBe(false);
 });
});
