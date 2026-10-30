import {canAccessPaymentOrder} from '../../../lib/server/payment-access';
import { applyCapturedPayment, applyPaymentFailure, PaymentValidationError } from '../../../lib/server/payment-state';
import { ok, err, db, getCurrentUser, logAudit } from '../../../lib/server/api';
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyPaymentSignature,
  getSafeConfigStatus,
  getRazorpayKeyId,
  getRazorpayMode,
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
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'create_order');
    const user = getCurrentUser(req);

    // -------------------------------------------------------------------------
    // 1. INITIALIZE PAYMENT GATEWAY ORDER
    // -------------------------------------------------------------------------
    if (action === 'create' || action === 'create_order') {
      const safeConfig = getSafeConfigStatus();
      if (!safeConfig.isActive) {
        return err('Online payments are temporarily disabled by the bakery. Please choose Cash on Delivery or contact us.', 400);
      }

      if (!safeConfig.configured && process.env.NODE_ENV === 'production') {
        return err('Online payments are currently unavailable. Please select Cash on Delivery or contact bakery support.', 503);
      }

      const orderNumber = String(body.orderNumber || '').trim();
      if (!orderNumber) return err('orderNumber is required', 400);

      const order = db.prepare('SELECT * FROM orders WHERE order_number=?').get(orderNumber) as any;
      if (!order) return err('Order not found', 404);

      if(!canAccessPaymentOrder(order,user,body.sessionId))return err('Order access required',403);
      if(['Cancelled','Delivered'].includes(order.status)||['Refunded','Partially Refunded'].includes(order.payment_status))return err('This order cannot start another payment',409);
      if (order.payment_status === 'Paid') {
        return err('Order has already been paid', 400);
      }

      const totalAmount = Number(order.total);
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        return err('Invalid order total for payment', 400);
      }

      const amountPaise = Math.round(totalAmount * 100);
      const isProduction = process.env.NODE_ENV === 'production' || getRazorpayMode() === 'LIVE';

      const pending=db.prepare("SELECT * FROM payments WHERE order_id=? AND razorpay_order_id=? AND status IN ('Pending','Authorized') ORDER BY id DESC LIMIT 1").get(order.id,order.razorpay_order_id) as any;
      if(pending && Math.round(Number(pending.amount)*100)===amountPaise)return ok({key_id:getRazorpayKeyId()||null,order_id:pending.razorpay_order_id,amount:amountPaise,currency:'INR',sandbox:pending.gateway==='Sandbox',reused:true});
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

      if (rzOrder.error || !rzOrder.id || (isProduction && rzOrder.id.startsWith('order_test_'))) {
        return err(rzOrder.error || 'Failed to initialize payment gateway order', 502);
      }

      db.transaction(() => {
      // Update order record with generated Razorpay Order ID
      db.prepare(`
        UPDATE orders 
        SET razorpay_order_id=?, updated_at=datetime('now') 
        WHERE id=?
      `).run(rzOrder.id, order.id);

      // Record payment attempt in ledger
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
      })();

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

      const isProduction = process.env.NODE_ENV === 'production' || getRazorpayMode() === 'LIVE';

      // Never accept mock order IDs or mock payment IDs in production mode
      if (isProduction) {
        if (razorpayOrderId.startsWith('order_test_') || razorpayPaymentId.startsWith('pay_test_')) {
          logAudit(user, 'PAYMENT_MOCK_REJECTED', 'Payment', order.order_number, 'Attempted mock payment in production');
          return err('Mock or test payments cannot be accepted in production mode', 400);
        }
        if (order.razorpay_order_id && order.razorpay_order_id.startsWith('order_test_')) {
          return err('Invalid order payment record', 400);
        }
      }

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
      if (order.razorpay_order_id !== razorpayOrderId && !db.prepare('SELECT id FROM payments WHERE order_id=? AND razorpay_order_id=?').get(order.id,razorpayOrderId)) {
        logAudit(user, 'PAYMENT_ORDER_MISMATCH', 'Order', order.order_number, `Expected ${order.razorpay_order_id}, got ${razorpayOrderId}`);
        return err('Razorpay Order ID mismatch', 400);
      }

      try {
        const payment=await fetchRazorpayPayment(razorpayPaymentId);
        const verified=payment || {id:razorpayPaymentId,order_id:razorpayOrderId,amount:Math.round(Number(order.total)*100),currency:'INR',status:'captured',captured:true};
        return ok(applyCapturedPayment(order.id,verified,'checkout',user));
      } catch(error){return err(error instanceof Error?error.message:'Payment confirmation unavailable',error instanceof PaymentValidationError?409:502);}
    }

    // -------------------------------------------------------------------------
    // 3. RECORD PAYMENT FAILURE OR USER CANCELLATION
    // -------------------------------------------------------------------------
    if (action === 'failure' || action === 'record_failure') {
      const orderNumber = String(body.orderNumber || '').trim();
      const reason = String(body.reason || 'Payment cancelled or dismissed by customer').slice(0, 255);
      const code = String(body.code || 'USER_CANCELLED').slice(0, 50);

      if (orderNumber) {
        const order = db.prepare('SELECT * FROM orders WHERE order_number=?').get(orderNumber) as any;
        if (order) {
          if(!canAccessPaymentOrder(order,user,body.sessionId))return err('Order access required',403);
          const gatewayOrder=(db.prepare('SELECT razorpay_order_id FROM orders WHERE id=?').get(order.id) as any)?.razorpay_order_id;
          if(gatewayOrder)applyPaymentFailure(order.id,gatewayOrder,reason,code);
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
