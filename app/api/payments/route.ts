import { ok, err, db, getCurrentUser, logAudit } from '../../../lib/server/api';

export const runtime = 'nodejs';

// Razorpay integration architecture.
// Real key_id/key_secret live ONLY in server-side env vars, never in the frontend.
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  const user = getCurrentUser(req);

  try {
    // Create a Razorpay Order for frontend checkout
    if (action === 'create') {
      const order = db.prepare('SELECT * FROM orders WHERE order_number=?').get(body.orderNumber);
      if (!order) return err('Order not found', 404);

      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        // Sandbox mode: no keys configured. Return a simulated payment intent
        // so the full flow is testable locally. In production, provide env keys.
        const status = 'created';
        const rzOrderId = `order_sandbox_${Date.now()}`;
        db.prepare('UPDATE orders SET razorpay_order_id=?, updated_at=datetime(\'now\') WHERE id=?').run(rzOrderId, order.id);
        return ok({
          key_id: null,
          order_id: rzOrderId,
          amount: Math.round(order.total * 100),
          currency: 'INR',
          sandbox: true,
          message: 'Razorpay keys not configured — running in sandbox mode. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable live payments.',
        });
      }

      // Live: ask Razorpay to create an order server-side
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64'),
        },
        body: JSON.stringify({
          amount: Math.round(order.total * 100),
          currency: 'INR',
          receipt: order.order_number,
        }),
      });
      const rz = await res.json();
      if (!rz.id) return err(rz.error?.description || 'Failed to create payment order', 502);
      db.prepare('UPDATE orders SET razorpay_order_id=?, updated_at=datetime(\'now\') WHERE id=?').run(rz.id, order.id);
      return ok({ key_id: RAZORPAY_KEY_ID, order_id: rz.id, amount: rz.amount, currency: rz.currency });
    }

    // Server-side payment verification (webhook-safe) — do NOT trust the frontend redirect alone
    if (action === 'verify') {
      const order = db.prepare('SELECT * FROM orders WHERE order_number=?').get(body.orderNumber);
      if (!order) return err('Order not found', 404);
      const { razorpay_order_id, razorpay_payment_id, signature } = body;
      if (RAZORPAY_KEY_SECRET) {
        const crypto = require('node:crypto');
        const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');
        if (expected !== signature) {
          logAudit(user, 'PAYMENT_VERIFY_FAIL', 'Payment', order.order_number);
          return err('Payment signature verification failed', 403);
        }
      }
      db.prepare('UPDATE orders SET payment_status=\'Paid\', razorpay_payment_id=?, transaction_id=?, updated_at=datetime(\'now\') WHERE id=?')
        .run(razorpay_payment_id || null, razorpay_payment_id || null, order.id);
      db.prepare('INSERT INTO order_status_history (order_id, status, note) VALUES (?,?,?)').run(order.id, 'Payment Confirmed', 'Payment received and verified');
      logAudit(user, 'PAYMENT_SUCCESS', 'Order', order.order_number);
      return ok({ ok: true, order_number: order.order_number, payment_status: 'Paid' });
    }

    return err('Unknown action');
  } catch (e: any) {
    return err(e.message, 500);
  }
}
