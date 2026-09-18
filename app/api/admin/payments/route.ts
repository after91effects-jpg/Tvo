import { ok, err, db, requireAdmin, logAudit } from '../../../../lib/server/api';
import { hasPermission } from '../../../../lib/server/permissions';
import {
  getSafeConfigStatus,
  testRazorpayConnection,
  createRazorpayRefund,
  runPaymentReconciliation,
} from '../../../../lib/server/razorpay';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = requireAdmin(req);
  if (!user || (!hasPermission(user.role, 'view_payments') && user.role !== 'super_admin' && user.role !== 'admin')) {
    return err('Unauthorized: view_payments permission required', 403);
  }

  const url = new URL(req.url);
  const search = (url.searchParams.get('search') || '').trim();
  const statusFilter = (url.searchParams.get('status') || '').trim();
  const methodFilter = (url.searchParams.get('method') || '').trim();
  const refundFilter = (url.searchParams.get('refund_status') || '').trim();
  const startDate = (url.searchParams.get('start_date') || '').trim();
  const endDate = (url.searchParams.get('end_date') || '').trim();
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  // ---------------------------------------------------------------------------
  // 1. CALCULATE 10 KPI METRICS
  // ---------------------------------------------------------------------------
  const totalAttemptsRow = db.prepare('SELECT COUNT(*) as c FROM payments').get() as any;
  const totalAttempts = totalAttemptsRow?.c || 0;

  const successfulRow = db.prepare("SELECT COUNT(*) as c, SUM(amount) as s FROM payments WHERE status='Paid'").get() as any;
  const successfulCount = successfulRow?.c || 0;
  const successfulAmount = Number(successfulRow?.s || 0);

  const failedRow = db.prepare("SELECT COUNT(*) as c FROM payments WHERE status='Failed'").get() as any;
  const failedCount = failedRow?.c || 0;

  const pendingRow = db.prepare("SELECT COUNT(*) as c FROM payments WHERE status='Pending'").get() as any;
  const pendingCount = pendingRow?.c || 0;

  const refundedRow = db.prepare("SELECT COUNT(*) as c, SUM(refunded_amount) as s FROM payments WHERE refund_status IN ('full', 'partial') OR refunded_amount > 0").get() as any;
  const refundedCount = refundedRow?.c || 0;
  const refundedAmount = Number(refundedRow?.s || 0);

  const netPaymentAmount = Math.max(0, successfulAmount - refundedAmount);

  const todaySuccessfulRow = db.prepare("SELECT COUNT(*) as c FROM payments WHERE status='Paid' AND date(created_at) = date('now')").get() as any;
  const todaySuccessfulCount = todaySuccessfulRow?.c || 0;

  const todayFailedRow = db.prepare("SELECT COUNT(*) as c FROM payments WHERE status='Failed' AND date(created_at) = date('now')").get() as any;
  const todayFailedCount = todayFailedRow?.c || 0;

  const kpiMetrics = {
    totalAttempts,
    successfulPayments: successfulCount,
    failedPayments: failedCount,
    pendingPayments: pendingCount,
    refundedPayments: refundedCount,
    totalSuccessfulAmount: successfulAmount,
    totalRefundedAmount: refundedAmount,
    netOrderPaymentAmount: netPaymentAmount,
    todaySuccessfulPayments: todaySuccessfulCount,
    todayFailedPayments: todayFailedCount,
  };

  // ---------------------------------------------------------------------------
  // 2. PAYMENT STATUS DISTRIBUTION
  // ---------------------------------------------------------------------------
  const distributionRows = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM payments 
    GROUP BY status
  `).all() as any[];

  const distribution = {
    Created: 0,
    Authorized: 0,
    Captured: 0,
    Failed: 0,
    Refunded: 0,
    PartiallyRefunded: 0,
    Pending: 0,
  };

  for (const r of distributionRows) {
    if (r.status === 'Paid') distribution.Captured = r.count;
    else if (r.status === 'Pending') distribution.Pending = r.count;
    else if (r.status === 'Failed') distribution.Failed = r.count;
    else if (r.status === 'Authorized') distribution.Authorized = r.count;
  }

  const fullRefundCount = db.prepare("SELECT COUNT(*) as c FROM payments WHERE refund_status='full'").get() as any;
  distribution.Refunded = fullRefundCount?.c || 0;

  const partialRefundCount = db.prepare("SELECT COUNT(*) as c FROM payments WHERE refund_status='partial'").get() as any;
  distribution.PartiallyRefunded = partialRefundCount?.c || 0;

  // ---------------------------------------------------------------------------
  // 3. TRANSACTIONS LIST WITH ADVANCED FILTERS
  // ---------------------------------------------------------------------------
  let whereClauses: string[] = ['1=1'];
  let params: any[] = [];

  if (search) {
    whereClauses.push(`(
      p.razorpay_order_id LIKE ? OR 
      p.razorpay_payment_id LIKE ? OR 
      p.transaction_id LIKE ? OR 
      o.order_number LIKE ? OR 
      o.customer_name LIKE ? OR 
      o.customer_email LIKE ?
    )`);
    const sTerm = `%${search}%`;
    params.push(sTerm, sTerm, sTerm, sTerm, sTerm, sTerm);
  }

  if (statusFilter && statusFilter !== 'all') {
    whereClauses.push('p.status = ?');
    params.push(statusFilter);
  }

  if (methodFilter && methodFilter !== 'all') {
    whereClauses.push('p.method = ?');
    params.push(methodFilter);
  }

  if (refundFilter && refundFilter !== 'all') {
    whereClauses.push('p.refund_status = ?');
    params.push(refundFilter);
  }

  if (startDate) {
    whereClauses.push("date(p.created_at) >= date(?)");
    params.push(startDate);
  }

  if (endDate) {
    whereClauses.push("date(p.created_at) <= date(?)");
    params.push(endDate);
  }

  const whereSql = whereClauses.join(' AND ');

  const totalFilteredCountRow = db.prepare(`
    SELECT COUNT(*) as c 
    FROM payments p 
    LEFT JOIN orders o ON p.order_id = o.id 
    WHERE ${whereSql}
  `).get(...params) as any;
  const totalFiltered = totalFilteredCountRow?.c || 0;

  const transactions = db.prepare(`
    SELECT p.id, p.order_id, p.amount, p.currency, p.method, p.status, 
           p.razorpay_order_id, p.razorpay_payment_id, p.transaction_id, 
           p.gateway, p.captured, p.refund_status, p.refunded_amount, 
           p.verification_status, p.webhook_status, p.created_at, p.updated_at,
           o.order_number, o.customer_name, o.customer_email, o.customer_phone,
           o.status as order_status, o.total as order_total, o.discount, o.delivery_fee
    FROM payments p
    LEFT JOIN orders o ON p.order_id = o.id
    WHERE ${whereSql}
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  // ---------------------------------------------------------------------------
  // 4. REFUNDS LIST
  // ---------------------------------------------------------------------------
  const refunds = db.prepare(`
    SELECT r.id, r.order_id, r.amount, r.reason, r.status, r.gateway_refund_id, r.created_at,
           o.order_number, o.customer_name, o.customer_email,
           p.razorpay_payment_id, p.amount as original_payment_amount
    FROM order_refunds r
    LEFT JOIN orders o ON r.order_id = o.id
    LEFT JOIN payments p ON p.order_id = o.id AND p.status='Paid'
    ORDER BY r.id DESC
    LIMIT 100
  `).all() as any[];

  // ---------------------------------------------------------------------------
  // 5. SETTLEMENTS LIST
  // ---------------------------------------------------------------------------
  const settlements = db.prepare(`
    SELECT * FROM settlements ORDER BY id DESC LIMIT 50
  `).all() as any[];

  // ---------------------------------------------------------------------------
  // 6. RECONCILIATION
  // ---------------------------------------------------------------------------
  const reconciliation = runPaymentReconciliation();

  // ---------------------------------------------------------------------------
  // 7. WEBHOOK HEALTH & RECENT LOGS
  // ---------------------------------------------------------------------------
  const webhookStats = db.prepare(`
    SELECT 
      COUNT(*) as total_received,
      SUM(CASE WHEN status='processed' THEN 1 ELSE 0 END) as successful_verifications,
      SUM(CASE WHEN status='error' OR status='rejected' THEN 1 ELSE 0 END) as failed_webhooks
    FROM webhook_events
  `).get() as any;

  const lastWebhook = db.prepare(`
    SELECT * FROM webhook_events ORDER BY id DESC LIMIT 1
  `).get() as any;

  const recentWebhooks = db.prepare(`
    SELECT id, event_id, event_type, status, error_message, received_at, processed_at
    FROM webhook_events 
    ORDER BY id DESC 
    LIMIT 25
  `).all() as any[];

  const webhookHealth = {
    endpoint: '/api/payments/razorpay/webhook',
    status: (webhookStats?.failed_webhooks || 0) > 5 ? 'WARNING' : ((webhookStats?.total_received || 0) > 0 ? 'HEALTHY' : 'NOT CONFIGURED'),
    totalReceived: webhookStats?.total_received || 0,
    successfulVerifications: webhookStats?.successful_verifications || 0,
    failedWebhooks: webhookStats?.failed_webhooks || 0,
    lastReceivedEvent: lastWebhook?.event_type || 'None',
    lastEventTime: lastWebhook?.received_at || null,
    lastError: lastWebhook?.error_message || null,
    recentEvents: recentWebhooks,
  };

  // ---------------------------------------------------------------------------
  // 8. PAYMENT ANALYTICS & METHOD BREAKDOWN
  // ---------------------------------------------------------------------------
  const methodStats = db.prepare(`
    SELECT method, COUNT(*) as count, SUM(amount) as volume 
    FROM payments 
    WHERE status='Paid' 
    GROUP BY method
  `).all() as any[];

  const safeConfig = getSafeConfigStatus();

  return ok({
    kpi: kpiMetrics,
    distribution,
    transactions: {
      items: transactions,
      total: totalFiltered,
      page,
      limit,
      totalPages: Math.ceil(totalFiltered / limit),
    },
    refunds,
    settlements,
    reconciliation,
    webhookHealth,
    analytics: {
      totalAttempts,
      successCount: successfulCount,
      failureCount: failedCount,
      successRate: totalAttempts > 0 ? Math.round((successfulCount / totalAttempts) * 100) : 0,
      failureRate: totalAttempts > 0 ? Math.round((failedCount / totalAttempts) * 100) : 0,
      successfulVolume: successfulAmount,
      refundVolume: refundedAmount,
      averageTicketSize: successfulCount > 0 ? Math.round(successfulAmount / successfulCount) : 0,
      methodBreakdown: methodStats,
    },
    config: safeConfig,
  });
}

export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin authorization required', 403);

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  try {
    // -------------------------------------------------------------------------
    // ACTION: REFUND
    // -------------------------------------------------------------------------
    if (action === 'refund') {
      if (!hasPermission(user.role, 'refund_payments') && user.role !== 'super_admin' && user.role !== 'admin') {
        return err('Unauthorized: refund_payments permission required', 403);
      }

      const paymentId = Number(body.paymentId);
      const refundAmount = Number(body.amount);
      const reason = String(body.reason || 'Admin initiated refund').trim();

      if (!paymentId || !refundAmount || refundAmount <= 0) {
        return err('Valid paymentId and refund amount are required', 400);
      }

      const payment = db.prepare('SELECT * FROM payments WHERE id=?').get(paymentId) as any;
      if (!payment) return err('Payment record not found', 404);

      if (payment.status !== 'Paid') {
        return err('Cannot refund a payment that is not marked Paid', 400);
      }

      const originalAmount = Number(payment.amount);
      const alreadyRefunded = Number(payment.refunded_amount || 0);
      const remainingRefundable = Math.max(0, originalAmount - alreadyRefunded);

      if (refundAmount > remainingRefundable) {
        return err(`Refund amount (₹${refundAmount}) exceeds remaining refundable balance (₹${remainingRefundable})`, 400);
      }

      const amountPaise = Math.round(refundAmount * 100);
      const razorpayPaymentId = payment.razorpay_payment_id || payment.transaction_id;

      // Initiate refund via Razorpay API or Sandbox
      const rzRefund = await createRazorpayRefund({
        paymentId: razorpayPaymentId,
        amountPaise,
        notes: {
          reason,
          admin_user: user.name || user.email || 'Admin',
        },
      });

      if (rzRefund.error) {
        logAudit(user, 'PAYMENT_REFUND_FAIL', 'Payment', String(payment.id), rzRefund.error);
        return err(rzRefund.error, 502);
      }

      const newRefundedTotal = alreadyRefunded + refundAmount;
      const isFull = newRefundedTotal >= originalAmount;
      const newRefundStatus = isFull ? 'full' : 'partial';
      const newOrderPaymentStatus = isFull ? 'Refunded' : 'Partially Refunded';

      // Update payment record
      db.prepare(`
        UPDATE payments 
        SET refund_status=?, refunded_amount=?, updated_at=datetime('now') 
        WHERE id=?
      `).run(newRefundStatus, newRefundedTotal, payment.id);

      // Update order record
      db.prepare(`
        UPDATE orders 
        SET payment_status=?, updated_at=datetime('now') 
        WHERE id=?
      `).run(newOrderPaymentStatus, payment.order_id);

      // Insert record into order_refunds table
      db.prepare(`
        INSERT INTO order_refunds (order_id, amount, reason, method, status, gateway_refund_id, created_at)
        VALUES (?, ?, ?, ?, 'completed', ?, datetime('now'))
      `).run(payment.order_id, refundAmount, reason, payment.method || 'UPI', rzRefund.id);

      // Insert into refunds table as well for backwards compatibility
      try {
        db.prepare(`
          INSERT INTO refunds (order_id, amount, reason, status, razorpay_refund_id, created_at)
          VALUES (?, ?, ?, 'completed', ?, datetime('now'))
        `).run(payment.order_id, refundAmount, reason, rzRefund.id);
      } catch {}

      logAudit(user, 'PAYMENT_REFUND', 'Order', String(payment.order_id), `Refunded ₹${refundAmount} (${reason})`);

      return ok({
        ok: true,
        refund: {
          id: rzRefund.id,
          amount: refundAmount,
          status: 'completed',
          newRefundStatus,
        },
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: TEST API CONNECTION
    // -------------------------------------------------------------------------
    if (action === 'test_api') {
      const result = await testRazorpayConnection();
      logAudit(user, 'PAYMENT_API_TEST', 'System', 'Razorpay', `Result: ${result.status}`);
      return ok(result);
    }

    // -------------------------------------------------------------------------
    // ACTION: RECONCILE CHECK
    // -------------------------------------------------------------------------
    if (action === 'reconcile_check') {
      const report = runPaymentReconciliation();
      logAudit(user, 'PAYMENT_RECONCILIATION_RUN', 'System', 'Reconciliation', `Scanned ${report.length} records`);
      return ok({ ok: true, report });
    }

    return err('Unknown admin payment action', 400);
  } catch (e: any) {
    console.error('Admin Payment Action Exception:', e);
    return err(e?.message || 'Server error processing payment action', 500);
  }
}
