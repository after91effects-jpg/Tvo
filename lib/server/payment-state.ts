import { db } from './db';
import { logAudit } from './api';
export class PaymentValidationError extends Error {}
const finalPaymentStates=['Paid','Refunded','Partially Refunded'];
export function applyCapturedPayment(orderId:number,payment:any,source='gateway',user:any=null) {
  return db.transaction(()=>{
    const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderId) as any;
    if(!order)throw new PaymentValidationError('Order not found');
    const attempt=db.prepare('SELECT * FROM payments WHERE order_id=? AND razorpay_order_id=? ORDER BY id DESC LIMIT 1').get(order.id,payment.order_id) as any;
    if(!payment.id || !payment.order_id || (order.razorpay_order_id!==payment.order_id&&!attempt))throw new PaymentValidationError('Gateway order does not match this order');
    if(payment.currency!=='INR'||Number(payment.amount)!==Math.round(Number(order.total)*100))throw new PaymentValidationError('Payment amount or currency does not match the order');
    if(payment.status!=='captured'||payment.captured===false)throw new PaymentValidationError('Payment is not captured yet. Please wait for gateway confirmation.');
    if(order.razorpay_payment_id && order.razorpay_payment_id!==payment.id && finalPaymentStates.includes(order.payment_status))throw new PaymentValidationError('Another payment is already recorded for this order; manual reconciliation required');
    const duplicate=finalPaymentStates.includes(order.payment_status)&&order.razorpay_payment_id===payment.id;
    const status=order.status==='Order Placed'?'Payment Confirmed':order.status;
    const financialStatus=['Refunded','Partially Refunded'].includes(order.payment_status)?order.payment_status:'Paid';
    db.prepare("UPDATE orders SET payment_status=?,status=?,razorpay_order_id=?,razorpay_payment_id=?,transaction_id=?,updated_at=datetime('now') WHERE id=?").run(financialStatus,status,payment.order_id,payment.id,payment.id,order.id);
    if(attempt)db.prepare("UPDATE payments SET status='Paid',captured=1,razorpay_payment_id=?,transaction_id=?,verification_status='verified',webhook_status=?,updated_at=datetime('now') WHERE id=?").run(payment.id,payment.id,source==='webhook'?'verified':attempt.webhook_status||'pending',attempt.id);
    else db.prepare("INSERT INTO payments (order_id,amount,currency,method,status,razorpay_order_id,razorpay_payment_id,transaction_id,gateway,captured,verification_status,webhook_status) VALUES (?,?,'INR',?,'Paid',?,?,?,'Razorpay',1,'verified',?)").run(order.id,Number(order.total),payment.method||order.payment_method||'UPI',payment.order_id,payment.id,payment.id,source==='webhook'?'verified':'pending');
    if(!duplicate){db.prepare('INSERT INTO order_status_history (order_id,status,note,user_id) VALUES (?,?,?,?)').run(order.id,status,order.status==='Cancelled'?'Payment captured after cancellation; review refund before fulfilment':`Payment captured and verified via ${source}`,user?.id??null);logAudit(user,'PAYMENT_SUCCESS','Order',order.order_number,payment.id);}
    return {ok:true,order_number:order.order_number,payment_status:financialStatus,status,transaction_id:payment.id,noOp:duplicate};
  })();
}
export function applyGatewayRefund(refund:any) {
  return db.transaction(()=>{
    if(!refund.id||!refund.payment_id||!Number.isSafeInteger(Number(refund.amount))||Number(refund.amount)<=0)throw new PaymentValidationError('Invalid gateway refund');
    const payment=db.prepare('SELECT * FROM payments WHERE razorpay_payment_id=? OR transaction_id=? ORDER BY id DESC LIMIT 1').get(refund.payment_id,refund.payment_id) as any;
    if(!payment)throw new Error('Payment for refund is not yet recorded');
    const existing=db.prepare("SELECT * FROM order_refunds WHERE (gateway_refund_id=? OR gateway_refund_id=?) AND status!='superseded' ORDER BY id DESC LIMIT 1").get(refund.id,refund.receipt||refund.id) as any;
    const amount=Number(refund.amount)/100;
    if(existing&&Math.abs(Number(existing.amount)-amount)>0.001)throw new PaymentValidationError('Refund amount changed for the same operation');
    if(existing?.status==='completed'||existing?.status==='failed'&&refund.status!=='processed')return {status:existing.status,noOp:true};
    const status=refund.status==='processed'?'completed':refund.status==='failed'?'failed':'pending';
    if(existing)db.prepare('UPDATE order_refunds SET gateway_refund_id=?,status=? WHERE id=?').run(refund.id,status,existing.id);
    else db.prepare('INSERT INTO order_refunds (order_id,amount,reason,method,status,gateway_refund_id) VALUES (?,?,?,?,?,?)').run(payment.order_id,amount,'Gateway refund',payment.method||'UPI',status,refund.id);
    if(status==='completed'){
      const total=Number((db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM order_refunds WHERE order_id=? AND status='completed'").get(payment.order_id) as any).total);
      if(total>Number(payment.amount)+0.001)throw new PaymentValidationError('Refund total exceeds the captured payment');
      db.prepare("UPDATE payments SET refund_status=?,refunded_amount=?,updated_at=datetime('now') WHERE id=?").run(total>=Number(payment.amount)?'full':'partial',total,payment.id);
      db.prepare("UPDATE orders SET payment_status=?,updated_at=datetime('now') WHERE id=?").run(total>=Number(payment.amount)?'Refunded':'Partially Refunded',payment.order_id);
      // Keep the legacy refund view in sync, without counting it as a second refund.
      const legacy=db.prepare('SELECT id FROM refunds WHERE razorpay_refund_id=?').get(refund.id);
      if(!legacy)db.prepare("INSERT INTO refunds (order_id,amount,reason,status,razorpay_refund_id) VALUES (?,?,'Gateway refund','completed',?)").run(payment.order_id,amount,refund.id);
    }
    return {status,noOp:false};
  })();
}
export function applyPaymentFailure(orderId:number,razorpayOrderId:string,reason:string,code:string) {
  return db.transaction(()=>{
    const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderId) as any;
    if(!order||finalPaymentStates.includes(order.payment_status))return;
    if(order.razorpay_order_id!==razorpayOrderId)return;
    db.prepare("UPDATE payments SET status='Failed',failure_reason=?,failure_code=?,updated_at=datetime('now') WHERE order_id=? AND razorpay_order_id=? AND status IN ('Pending','Authorized')").run(reason,code,order.id,razorpayOrderId);
    db.prepare("UPDATE orders SET payment_status='Failed',updated_at=datetime('now') WHERE id=?").run(order.id);
  })();
}
