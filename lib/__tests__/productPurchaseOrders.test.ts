import { describe, expect, it } from 'vitest';
import { db } from '../server/db';
import { createOrder } from '../server/order-engine';
import { changeOrderStatus } from '../server/order-status';

describe('Purchase options through checkout and cancellation', () => {
  it.each([
    ['QA Pastry','piece','6 pieces',2,12,'piece', [{label:'6 pieces',price:549}]],
    ['QA Candle Set of 4','kg','Set of 4',2,2,'set', []],
    ['QA Gift Hamper','kg','1 hamper',1,1,'box', []],
  ])('%s charges and restores the correct saleable units', (name, storedUnit, label, quantity, deduction, effectiveUnit, options) => {
    const rollback = new Error('ROLLBACK PRIVATE CHECK');
    try {
      db.transaction(() => {
        const id = Number(db.prepare('INSERT INTO products (name,sku,slug,selling_unit,regular_price,sale_price,stock,stock_status,published,manage_stock,enable_stock,variations_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(name,'QA-UNIT-'+Date.now(), 'qa-unit-'+Date.now(),storedUnit,549,549,30,'in_stock',1,1,1,JSON.stringify(options)).lastInsertRowid);
        const result = createOrder({items:[{productId:id,qty:quantity,weight:label,sellingUnit:'kg',unitPrice:1}], body:{customer:{name:'Private QA',phone:'9999999999'},address:'Private test pickup',pincode:'122009',deliveryDate:new Date(Date.now()+2*86400000).toISOString().slice(0,10),deliverySlot:'Store Pickup',deliveryType:'pickup',paymentMethod:'COD'},customerId:null,generateOrderNumber:()=>`QA-UNITS-${id}-${Date.now()}`});
        expect(result.total).toBe(549*quantity);
        expect((db.prepare('SELECT stock FROM products WHERE id=?').get(id) as any).stock).toBe(30-deduction);
        const order=db.prepare('SELECT id,items FROM orders WHERE order_number=?').get(result.orderNumber) as any;
        expect(JSON.parse(order.items)[0].sellingUnit).toBe(effectiveUnit);
        expect(changeOrderStatus({id:1,role:'super_admin'},order.id,'Cancelled').ok).toBe(true);
        expect((db.prepare('SELECT stock FROM products WHERE id=?').get(id) as any).stock).toBe(30);
        throw rollback;
      })();
    } catch (error) { if(error !== rollback) throw error; }
  });
});
