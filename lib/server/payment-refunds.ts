import crypto from 'node:crypto';
import {db} from './db';
import {createRazorpayRefund} from './razorpay';
import {applyGatewayRefund} from './payment-state';
export async function requestPaymentRefund(paymentId:number,amount:number,reason:string,requestId:string,user:any){
  if(!/^[A-Za-z0-9_-]{10,100}$/.test(requestId))throw new Error('A unique refund request ID is required; retry the same request rather than starting another refund');
  const paise=Math.round(amount*100);
  if(!Number.isSafeInteger(paymentId)||paymentId<=0||!Number.isSafeInteger(paise)||paise<100||Math.abs(amount*100-paise)>0.00001)throw new Error('Enter a valid payment and refund amount of at least ₹1, with at most two decimal places');
  const operation=db.transaction(()=>{
    const payment=db.prepare('SELECT * FROM payments WHERE id=?').get(paymentId) as any;
    if(!payment||payment.status!=='Paid'||Number(payment.captured)!==1||!payment.razorpay_payment_id)throw new Error('A captured Razorpay payment is required for a gateway refund');
    const identity=requestId||`${paymentId}:${Number(payment.refunded_amount||0)}:${paise}`;
    const key='tvo_rf_'+crypto.createHash('sha256').update(`${paymentId}:${identity}`).digest('hex').slice(0,32);
    const stored=db.prepare('SELECT value FROM settings WHERE key=?').get('refund_request_'+key) as any;
    if(stored){const operation=JSON.parse(stored.value);const existing=db.prepare('SELECT * FROM order_refunds WHERE id=?').get(operation.id) as any;if(existing?.status==='failed')throw new Error('This refund request failed. Refresh payments and create a new request after correcting the gateway issue');if(!existing||Number(existing.amount)!==amount)throw new Error('A retry must use the original refund amount');return {payment,key,id:existing.id,amount:Number(existing.amount),reason:existing.reason,completed:existing.status==='completed',gatewayId:existing.gateway_refund_id};}
    const reserved=Number((db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM order_refunds WHERE order_id=? AND status IN ('processing','pending')").get(payment.order_id) as any).total);
    const available=Number(payment.amount)-Number(payment.refunded_amount||0)-reserved;
    if(amount>available+0.000001)throw new Error(`Refund exceeds available balance (₹${Math.max(0,available).toFixed(2)}); check pending refunds before retrying`);
    const info=db.prepare("INSERT INTO order_refunds (order_id,amount,reason,method,status,gateway_refund_id) VALUES (?,?,?,?,'processing',?)").run(payment.order_id,amount,reason,payment.method,key);
    db.prepare('INSERT INTO settings (key,value) VALUES (?,?)').run('refund_request_'+key,JSON.stringify({id:Number(info.lastInsertRowid)}));
    return {payment,key,id:Number(info.lastInsertRowid),amount,reason,completed:false,gatewayId:key};
  })();
  if(operation.completed)return {ok:true,refund:{id:operation.gatewayId,amount,status:'completed'},requestId:operation.key,noOp:true};
  const response=await createRazorpayRefund({paymentId:operation.payment.razorpay_payment_id,amountPaise:paise,idempotencyKey:operation.key,notes:{reason:operation.reason}});
  if(response.error){
    db.prepare('UPDATE order_refunds SET status=? WHERE id=? AND status!=?').run(response.uncertain?'pending':'failed',operation.id,'completed');
    return {error:response.error,pending:!!response.uncertain,requestId:operation.key};
  }
  if(!response.id || Number(response.amount)!==paise){db.prepare("UPDATE order_refunds SET status='pending' WHERE id=? AND status!='completed'").run(operation.id);return {error:'Gateway refund response needs reconciliation; do not create another refund',pending:true,requestId:operation.key};}
  const result=db.transaction(()=>{
    const existing=db.prepare('SELECT id FROM order_refunds WHERE gateway_refund_id=?').get(response.id) as any;
    if(existing&&existing.id!==operation.id){db.prepare("UPDATE order_refunds SET status='superseded' WHERE id=? AND status!='completed'").run(operation.id);db.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify({id:existing.id}),'refund_request_'+operation.key);}
    return applyGatewayRefund({id:response.id,payment_id:operation.payment.razorpay_payment_id,amount:paise,receipt:operation.key,status:response.status});
  })();
  return {ok:true,refund:{id:response.id,amount,status:result.status},requestId:operation.key};
}
