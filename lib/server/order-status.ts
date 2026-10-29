import { getProductPurchaseProfile } from '../productPurchase';
import { db, logAudit, jsonParseSafe } from './api';
import { hasPermission } from './permissions';
import { isPieceOrDiscreteUnit } from '../sellingUnit';
import { extractPieceCount } from './order-engine';

export const ORDER_PROGRESS = ['Order Placed','Payment Confirmed','Accepted','In Preparation','Baking in Kitchen','Baking','Decorating','Quality Check','Packed','Ready for Dispatch','Dispatched','Out for Delivery','Delivered','Cancelled'];
export function changeOrderStatus(user: any, id: number, status: string, note?: string) {
  if (!ORDER_PROGRESS.includes(status)) return {ok:false,error:'Invalid status',httpStatus:400};
  if (status === 'Cancelled' && !hasPermission(user.role,'cancel_orders')) return {ok:false,error:'Cancel orders permission required',httpStatus:403};
  return db.transaction(() => {
    const order=db.prepare('SELECT * FROM orders WHERE id=?').get(id) as any;
    if (!order) return {ok:false,error:'Order not found',httpStatus:404};
    if (order.status === status) return {ok:true,status,noOp:true};
    if (['Delivered','Cancelled'].includes(order.status)) return {ok:false,error:`This order is already ${order.status} and is final`,httpStatus:400};
    const index=(value:string)=>ORDER_PROGRESS.indexOf(value === 'Baking in Kitchen' ? 'Baking' : value);
    if (status !== 'Cancelled' && index(order.status) >= 0 && index(status) < index(order.status)) return {ok:false,error:'Cannot move an order to a prior stage',httpStatus:400};
    db.prepare("UPDATE orders SET status=?,updated_at=datetime('now') WHERE id=?").run(status,id);
    db.prepare('INSERT INTO order_status_history (order_id,status,note,user_id) VALUES (?,?,?,?)').run(id,status,note||null,user.id??null);
    db.prepare('INSERT INTO order_notes (order_id,author_id,author_name,body,is_internal) VALUES (?,?,?,?,?)').run(id,user.id??null,user.name||'admin',`Status → ${status}${note ? ': '+note : ''}`,1);
    db.prepare('INSERT INTO notifications (type,title,message) VALUES (?,?,?)').run('order',`Order ${order.order_number} status`,`Order status changed to ${status}`);
    if (status === 'Cancelled') {
      const restock=(productId:any,quantity:number,unit:any,weight:any) => {
        const product=db.prepare('SELECT name,selling_unit,manage_stock,enable_stock FROM products WHERE id=?').get(productId) as any;
        if (!product || product.manage_stock===0 || product.enable_stock===0 || !Number.isFinite(quantity) || quantity<=0) return;
        const qty=quantity*(getProductPurchaseProfile({ ...product, sellingUnit: unit || product.selling_unit }).kind === 'piece'?extractPieceCount(weight):1);
        db.prepare("UPDATE products SET stock=stock+?,stock_status=CASE WHEN stock+?<=0 THEN 'out_of_stock' WHEN stock+?<=low_stock_threshold THEN 'low_stock' ELSE 'in_stock' END WHERE id=?").run(qty,qty,qty,productId);
        db.prepare('INSERT INTO inventory_transactions (product_id,type,quantity,note) VALUES (?,?,?,?)').run(productId,'restock',qty,`Cancelled order ${order.order_number}`);
      };
      for (const item of jsonParseSafe(order.items,[])) {
        if (item.isCustomHamper && Array.isArray(item.components)) {
          for(const component of item.components) restock(component.productId,Number(item.qty||1)*Number(component.qty||1),undefined,undefined);
        } else restock(item.productId,Number(item.qty||1),item.sellingUnit,item.weight);
      }
      if(order.delivery_date && order.delivery_slot_id) db.prepare('UPDATE slot_capacity SET books=CASE WHEN books>0 THEN books-1 ELSE 0 END WHERE slot_id=? AND date=?').run(order.delivery_slot_id,order.delivery_date);
    }
    // Cancelling is not proof that a payment gateway refund has happened.
    logAudit(user,'ORDER_STATUS_UPDATE','Order',String(id),`→ ${status}`);
    return {ok:true,status};
  })();
}
