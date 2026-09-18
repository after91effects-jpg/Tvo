import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/db';
import { verifyWebhookSignature, getRazorpayWebhookSecret } from '../../../../../lib/server/razorpay';
import { logAudit } from '../../../../../lib/server/api';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let rawBody = '';
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'Could not read request body' }, { status: 400 });
  }

  const signature = req.headers.get('x-razorpay-signature') || '';
  const webhookSecret = getRazorpayWebhookSecret();

  // If webhook secret is configured, strictly enforce signature verification
  if (webhookSecret) {
    const check = verifyWebhookSignature({ rawBody, signature });
    if (!check.valid) {
      console.warn('Webhook signature check failed:', check.error);
      try {
        db.prepare(`
          INSERT INTO webhook_events (event_id, event_type, payload, signature, status, error_message, received_at)
          VALUES (?, 'unverified', ?, ?, 'rejected', ?, datetime('now'))
        `).run(`unverified_${Date.now()}`, rawBody.slice(0, 1000), signature, check.error || 'Invalid signature');
      } catch {}
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }
  }

  let event: any = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const eventId = event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const eventType = String(event.event || 'unknown');

  // ---------------------------------------------------------------------------
  // IDEMPOTENCY GUARD: Prevent duplicate processing of the same event
  // ---------------------------------------------------------------------------
  try {
    const existing = db.prepare('SELECT id FROM webhook_events WHERE event_id=?').get(eventId);
    if (existing) {
      return NextResponse.json({ received: true, idempotent: true });
    }
  } catch {}

  try {
    const payload = event.payload || {};
    const paymentEntity = payload.payment?.entity;
    const orderEntity = payload.order?.entity;
    const refundEntity = payload.refund?.entity;

    // 1. PAYMENT CAPTURED OR ORDER PAID
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const razorpayPaymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const method = paymentEntity?.method || 'UPI';

      if (razorpayOrderId) {
        const order = db.prepare('SELECT id, order_number, status, payment_status FROM orders WHERE razorpay_order_id=?').get(razorpayOrderId) as any;
        if (order) {
          const nextStatus = order.status === 'Order Placed' ? 'Payment Confirmed' : order.status;
          db.prepare(`
            UPDATE orders 
            SET payment_status='Paid', 
                status=?, 
                razorpay_payment_id=COALESCE(?, razorpay_payment_id),
                transaction_id=COALESCE(?, transaction_id),
                updated_at=datetime('now')
            WHERE id=?
          `).run(nextStatus, razorpayPaymentId, razorpayPaymentId, order.id);

          // Update payment record in ledger
          db.prepare(`
            UPDATE payments 
            SET status='Paid', 
                captured=1, 
                webhook_status='verified', 
                method=?, 
                razorpay_payment_id=COALESCE(?, razorpay_payment_id),
                updated_at=datetime('now')
            WHERE order_id=? AND (razorpay_order_id=? OR status='Pending')
          `).run(method, razorpayPaymentId, order.id, razorpayOrderId);

          db.prepare(`
            INSERT INTO order_status_history (order_id, status, note, user_id)
            VALUES (?, ?, 'Payment captured webhook confirmed by Razorpay', NULL)
          `).run(order.id, nextStatus);

          logAudit(null, 'WEBHOOK_PAYMENT_CAPTURED', 'Order', order.order_number, `Payment ID: ${razorpayPaymentId}`);
        }
      }
    }

    // 2. PAYMENT AUTHORIZED
    else if (eventType === 'payment.authorized') {
      const razorpayOrderId = paymentEntity?.order_id;
      if (razorpayOrderId) {
        db.prepare(`
          UPDATE payments 
          SET status='Authorized', webhook_status='authorized', updated_at=datetime('now')
          WHERE razorpay_order_id=?
        `).run(razorpayOrderId);
      }
    }

    // 3. PAYMENT FAILED
    else if (eventType === 'payment.failed') {
      const razorpayOrderId = paymentEntity?.order_id;
      const errCode = paymentEntity?.error_code || 'GATEWAY_ERROR';
      const errDesc = paymentEntity?.error_description || 'Payment failed on gateway';

      if (razorpayOrderId) {
        const order = db.prepare('SELECT id, order_number, payment_status FROM orders WHERE razorpay_order_id=?').get(razorpayOrderId) as any;
        if (order && order.payment_status !== 'Paid') {
          db.prepare(`
            UPDATE orders 
            SET payment_status='Failed', updated_at=datetime('now') 
            WHERE id=?
          `).run(order.id);

          db.prepare(`
            UPDATE payments 
            SET status='Failed', failure_code=?, failure_reason=?, webhook_status='failed', updated_at=datetime('now')
            WHERE order_id=?
          `).run(errCode, errDesc, order.id);

          logAudit(null, 'WEBHOOK_PAYMENT_FAILED', 'Order', order.order_number, `${errCode}: ${errDesc}`);
        }
      }
    }

    // 4. REFUND PROCESSED
    else if (eventType === 'refund.processed' || eventType === 'refund.created') {
      const refundId = refundEntity?.id;
      const paymentId = refundEntity?.payment_id;
      const refundAmount = Number(refundEntity?.amount || 0) / 100;

      if (paymentId) {
        const payment = db.prepare('SELECT id, order_id, amount, refunded_amount FROM payments WHERE razorpay_payment_id=? OR transaction_id=?').get(paymentId, paymentId) as any;
        if (payment) {
          const newRefundedTotal = Number(payment.refunded_amount || 0) + refundAmount;
          const isFullRefund = newRefundedTotal >= Number(payment.amount);
          const refundStatus = isFullRefund ? 'full' : 'partial';
          const orderPaymentStatus = isFullRefund ? 'Refunded' : 'Partially Refunded';

          db.prepare(`
            UPDATE payments 
            SET refund_status=?, refunded_amount=?, updated_at=datetime('now') 
            WHERE id=?
          `).run(refundStatus, newRefundedTotal, payment.id);

          db.prepare(`
            UPDATE orders 
            SET payment_status=?, updated_at=datetime('now') 
            WHERE id=?
          `).run(orderPaymentStatus, payment.order_id);

          // Record in order_refunds if not present
          const existingRfd = db.prepare('SELECT id FROM order_refunds WHERE gateway_refund_id=?').get(refundId);
          if (!existingRfd) {
            db.prepare(`
              INSERT INTO order_refunds (order_id, amount, reason, status, gateway_refund_id, created_at)
              VALUES (?, ?, 'Refund processed via Razorpay Webhook', 'completed', ?, datetime('now'))
            `).run(payment.order_id, refundAmount, refundId);
          }

          logAudit(null, 'WEBHOOK_REFUND_PROCESSED', 'Payment', paymentId, `Refunded ₹${refundAmount}`);
        }
      }
    }

    // Log the processed event in webhook_events
    db.prepare(`
      INSERT INTO webhook_events (event_id, event_type, payload, signature, status, received_at, processed_at)
      VALUES (?, ?, ?, ?, 'processed', datetime('now'), datetime('now'))
    `).run(eventId, eventType, rawBody, signature);

    return NextResponse.json({ received: true });
  } catch (procErr: any) {
    console.error('Webhook processing exception:', procErr);
    try {
      db.prepare(`
        INSERT INTO webhook_events (event_id, event_type, payload, signature, status, error_message, received_at)
        VALUES (?, ?, ?, ?, 'error', ?, datetime('now'))
      `).run(eventId, eventType, rawBody, signature, procErr?.message || 'Processing error');
    } catch {}

    // Return 200 to prevent webhook flood retries if the error is an unrecoverable internal logic issue
    return NextResponse.json({ received: true, error: procErr?.message });
  }
}
