import crypto from 'node:crypto';
import {NextResponse} from 'next/server';
import {db} from '../../../../../lib/server/db';
import {verifyWebhookSignature,getRazorpayWebhookSecret} from '../../../../../lib/server/razorpay';
import {applyCapturedPayment,applyGatewayRefund,applyPaymentFailure,PaymentValidationError} from '../../../../../lib/server/payment-state';
export const runtime='nodejs';
export async function POST(req:Request){
  const raw=await req.text().catch(()=>null);if(raw===null)return NextResponse.json({error:'Cannot read body'},{status:400});
  if(!getRazorpayWebhookSecret())return NextResponse.json({error:'Webhook secret is not configured'},{status:500});
  const signature=req.headers.get('x-razorpay-signature')||'';
  if(!signature)return NextResponse.json({error:'Missing x-razorpay-signature header'},{status:400});
  const verified=verifyWebhookSignature({rawBody:raw,signature});if(!verified.valid)return NextResponse.json({error:verified.error||'Invalid signature'},{status:400});
  let event:any;try{event=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid JSON payload'},{status:400});}
  const eventId=String(req.headers.get('x-razorpay-event-id')||event.id||crypto.createHash('sha256').update(raw).digest('hex')).slice(0,200);
  const type=String(event.event||'unknown');
  try{
    const result=db.transaction(()=>{
      const existing=db.prepare('SELECT id,status FROM webhook_events WHERE event_id=?').get(eventId) as any;
      if(existing&&['processed','rejected'].includes(existing.status))return {received:true,idempotent:true};
      if(existing)db.prepare("UPDATE webhook_events SET status='processing',error_message=NULL WHERE id=?").run(existing.id);
      else db.prepare("INSERT INTO webhook_events (event_id,event_type,payload,signature,status) VALUES (?,?,?,?,'processing')").run(eventId,type,raw,signature);
      const payment=event.payload?.payment?.entity;
      if(type==='payment.captured'||type==='order.paid'){
        if(!payment?.id||!payment?.order_id)throw new PaymentValidationError('Captured payment entity is missing');
        const order=db.prepare('SELECT id FROM orders WHERE razorpay_order_id=?').get(payment?.order_id||event.payload?.order?.entity?.id) as any;
        const attempt=order?null:db.prepare('SELECT order_id FROM payments WHERE razorpay_order_id=? ORDER BY id DESC LIMIT 1').get(payment?.order_id) as any;
        if(order||attempt)applyCapturedPayment(order?.id||attempt.order_id,{...payment,status:payment?.status||'captured'},'webhook');
      }else if(type==='payment.authorized'){
        if(payment?.order_id)db.prepare("UPDATE payments SET status='Authorized',webhook_status='authorized',updated_at=datetime('now') WHERE razorpay_order_id=? AND status IN ('Pending','Authorized')").run(payment.order_id);
      }else if(type==='payment.failed'){
        if(!payment?.order_id)throw new PaymentValidationError('Failed payment entity is missing');
        const order=db.prepare('SELECT id FROM orders WHERE razorpay_order_id=?').get(payment?.order_id) as any;
        if(order)applyPaymentFailure(order.id,payment.order_id,payment.error_description||'Gateway failure',payment.error_code||'GATEWAY_ERROR');
      }else if(['refund.created','refund.processed','refund.failed'].includes(type)){
        const refund=event.payload?.refund?.entity;
        applyGatewayRefund({...refund,status:type==='refund.processed'?'processed':type==='refund.failed'?'failed':refund?.status||'pending'});
      }
      db.prepare("UPDATE webhook_events SET status='processed',processed_at=datetime('now') WHERE event_id=?").run(eventId);
      return {received:true};
    })();
    return NextResponse.json(result);
  }catch(error){
    const message=error instanceof Error?error.message:'Webhook processing failed';
    if(error instanceof PaymentValidationError){
      db.prepare("INSERT INTO webhook_events (event_id,event_type,payload,signature,status,error_message) VALUES (?,?,?,?,'rejected',?) ON CONFLICT(event_id) DO UPDATE SET status='rejected',error_message=excluded.error_message").run(eventId,type,raw,signature,message);
      return NextResponse.json({received:true,rejected:true});
    }
    // Transaction rolled back. A retry can safely process this event again.
    return NextResponse.json({error:'Temporary webhook processing failure; retry required'},{status:503});
  }
}
