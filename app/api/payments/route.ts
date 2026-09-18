import { ok, err, db, getCurrentUser, logAudit } from '../../../lib/server/api';
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  getSafeConfigStatus,
  getRazorpayKeyId,
} from '../../../lib/server/razorpay';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  // Safe client configuration endpoint (key_id only, zero secrets)
  const safeConfig = getSafeConfigStatus();
  return ok({
    configured: safeConfig.configured,
    enabled: safeConfig.isActive,
    mode: safeConfig.mode,
    key_id: safeConfig.isActive ? (getRazorpayKeyId() || null) : null,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action || 'create';
  const user = getCurrentUser(req);

  try {
    // -------------------------------------------------------------------------
    // 1. CREATE PAYMENT ORDER (Server Authoritative)
    // -------------------------------------------------------------------------
    if (action === 'create' || action === 'create_order') {
      const safeConfig = getSafeConfigStatus();
      if (!safeConfig.isActive) {
        return err('Online payments are temporarily disabled by the bakery. Please choose Cash on Delivery or contact us.', 400);
      }

      const orderNumber = String(body.orderNumber || '').trim();
      if (!orderNumber) return err('orderNumber is required', 400);

      const order = db.prepare('SELECT * FROM orders WHERE order_number=?').get(orderNumber) as any;
      if (!order) return err('Order not found', 404);

      if (order.payment_status === 'Paid') {
        return err('Order has already been paid', 400);
      }

      const totalAmount = Number(order.total);
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        return err('Invalid order total for payment', 400);
      }

      const amountPaise = Math.round(totalAmount * 100);

      // Check if an existing pending payment attempt can be reused or create new
      const rzOrder = await createRazorpayOrder({
        orderNumber: order.order_number,
        amountPaise,
        currency: 'INR',
        notes: {
          tvo_order_id: String(order.id),
          customer_name: order.customer_name || '',
          customer_phone: order.customer_phone || '',
        },
      });

      if (rzOrder.error || !rzOrder.id) {
        return err(rzOrder.error || 'Failed to initialize payment gateway order', 502);
      }

      // Update order record with generated Razorpay Order ID
      db.prepare(`
        UPDATE orders 
        SET razorpay_order_id=?, updated_at=datetime('now') 
        WHERE id=?
      `).run(rzOrder.id, order.id);

      // Record payment attempt in ledger
      try {
        db.prepare(`
          INSERT INTO payments (
            order_id, amount, currency, method, status, 
            razorpay_order_id, transaction_id, gateway, 
            verification_status, webhook_status, meta, created_at, updated_at
          )
          VALUES (?, ?, 'INR', ?, 'Pending', ?, ?, ?, 'unverified', 'pending', ?, datetime('now'), datetime('now'))
        `).run(
          order.id,
          totalAmount,
          order.payment_method || 'UPI',
          rzOrder.id,
          rzOrder.id,
          rzOrder.sandbox ? 'Sandbox' : 'Razorpay',
          JSON.stringify({
            razorpay_order_id: rzOrder.id,
            sandbox: Boolean(rzOrder.sandbox),
            created_at: new Date().toISOString(),
          })
        );
      } catch (insertErr) {
        console.warn('Could not record pending payment row:', insertErr);
      }

      return ok({
        key_id: getRazorpayKeyId() || null,
        order_id: rzOrder.id,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        sandbox: Boolean(rzOrder.sandbox),
      });
    }

    // -------------------------------------------------------------------------
    // 2. SERVER-SIDE PAYMENT VERIFICATION (Zero Client Trust)
    // -------------------------------------------------------------------------
    if (action === 'verify' || action === 'verify_payment') {
      const orderNumber = String(body.orderNumber || '').trim();
      const razorpayOrderId = String(body.razorpay_order_id || '').trim();
      const razorpayPaymentId = String(body.razorpay_payment_id || '').trim();
      const signature = String(body.razorpay_signature || '').trim();

      if (!orderNumber || !razorpayOrderId || !razorpayPaymentId) {
        return err('Missing payment verification parameters', 400);
      }

      const order = db.prepare('SELECT * FROM orders WHERE order_number=?').get(orderNumber) as any;
      if (!order) return err('Order not found', 404);

      // Verify HMAC-SHA256 signature
      const sigCheck = verifyPaymentSignature({
        razorpayOrderId,
        razorpayPaymentId,
        signature,
      });

      if (!sigCheck.valid) {
        logAudit(user, 'PAYMENT_VERIFY_FAIL', 'Payment', order.order_number, sigCheck.error);
        return err(sigCheck.error || 'Payment signature verification failed', 403);
      }

      // Ensure this payment attempt matches the order's recorded razorpay_order_id if present
      if (order.razorpay_order_id && order.razorpay_order_id !== razorpayOrderId) {
        logAudit(user, 'PAYMENT_ORDER_MISMATCH', 'Order', order.order_number, `Expected ${order.razorpay_order_id}, got ${razorpayOrderId}`);
        return err('Razorpay Order ID mismatch', 400);
      }

      // Advance order status safely
      const newOrderStatus = order.status === 'Order Placed' ? 'Payment Confirmed' : order.status;

      db.prepare(`
        UPDATE orders 
        SET payment_status='Paid', 
            status=?, 
            razorpay_order_id=?,
            razorpay_payment_id=?, 
            transaction_id=?, 
            updated_at=datetime('now') 
        WHERE id=?
      `).run(newOrderStatus, razorpayOrderId, razorpayPaymentId, razorpayPaymentId, order.id);

      // Insert order status history entry
      db.prepare(`
        INSERT INTO order_status_history (order_id, status, note, user_id) 
        VALUES (?, ?, 'Payment confirmed via verified Razorpay signature', ?)
      `).run(order.id, newOrderStatus, user?.id ?? null);

      // Update or insert payment row in payments table
      const existingPay = db.prepare('SELECT id FROM payments WHERE order_id=? AND razorpay_order_id=?').get(order.id, razorpayOrderId) as any;
      if (existingPay) {
        db.prepare(`
          UPDATE payments 
          SET status='Paid', 
              captured=1, 
              razorpay_payment_id=?, 
              transaction_id=?, 
              verification_status='verified', 
              updated_at=datetime('now')
          WHERE id=?
        `).run(razorpayPaymentId, razorpayPaymentId, existingPay.id);
      } else {
        db.prepare(`
          INSERT INTO payments (
            order_id, amount, currency, method, status, 
            razorpay_order_id, razorpay_payment_id, transaction_id, 
            gateway, captured, verification_status, meta, created_at, updated_at
          )
          VALUES (?, ?, 'INR', ?, 'Paid', ?, ?, ?, ?, 1, 'verified', ?, datetime('now'), datetime('now'))
        `).run(
          order.id,
          order.total,
          order.payment_method || 'UPI',
          razorpayOrderId,
          razorpayPaymentId,
          razorpayPaymentId,
          getRazorpayKeyId() ? 'Razorpay' : 'Sandbox',
          JSON.stringify({ razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId })
        );
      }

      logAudit(user, 'PAYMENT_SUCCESS', 'Order', order.order_number, `Payment verified: ${razorpayPaymentId}`);

      return ok({
        ok: true,
        order_number: order.order_number,
        payment_status: 'Paid',
        status: newOrderStatus,
        transaction_id: razorpayPaymentId,
      });
    }

    // -------------------------------------------------------------------------
    // 3. RECORD PAYMENT FAILURE OR USER CANCELLATION
    // -------------------------------------------------------------------------
    if (action === 'failure' || action === 'record_failure') {
      const orderNumber = String(body.orderNumber || '').trim();
      const reason = String(body.reason || 'Payment cancelled or dismissed by customer').slice(0, 255);
      const code = String(body.code || 'USER_CANCELLED').slice(0, 50);

      if (orderNumber) {
        const order = db.prepare('SELECT id, status, payment_status FROM orders WHERE order_number=?').get(orderNumber) as any;
        if (order && order.payment_status !== 'Paid') {
          db.prepare(`
            UPDATE orders 
            SET payment_status='Failed', updated_at=datetime('now') 
            WHERE id=?
          `).run(order.id);

          db.prepare(`
            UPDATE payments 
            SET status='Failed', failure_reason=?, failure_code=?, updated_at=datetime('now')
            WHERE order_id=? AND status='Pending'
          `).run(reason, code, order.id);

          logAudit(user, 'PAYMENT_FAILURE', 'Order', orderNumber, reason);
        }
      }

      return ok({ ok: true, recorded: true });
    }

    return err('Unknown payment action', 400);
  } catch (e: any) {
    console.error('Payment API Exception:', e);
    return err(e.message || 'Internal payment processing error', 500);
  }
}
