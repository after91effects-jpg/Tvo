import crypto from 'node:crypto';
import { db } from './db';
import { logError } from './logger';

export interface SafePaymentConfig {
  configured: boolean;
  mode: 'TEST' | 'LIVE' | 'SANDBOX';
  keyIdPresent: boolean;
  keyIdMasked: string;
  keySecretPresent: boolean;
  webhookSecretPresent: boolean;
  webhookUrl: string;
}

export function getRazorpayKeyId(): string {
  return (process.env.RAZORPAY_KEY_ID || '').trim();
}

export function getRazorpayKeySecret(): string {
  return (process.env.RAZORPAY_KEY_SECRET || '').trim();
}

export function getRazorpayWebhookSecret(): string {
  return (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
}

export function isRazorpayConfigured(): boolean {
  const keyId = getRazorpayKeyId();
  const secret = getRazorpayKeySecret();
  return Boolean(keyId && secret);
}

export function getRazorpayMode(): 'TEST' | 'LIVE' | 'SANDBOX' {
  const keyId = getRazorpayKeyId();
  if (!keyId) return 'SANDBOX';
  if (keyId.startsWith('rzp_live_')) return 'LIVE';
  return 'TEST';
}

/**
 * Returns safe environment configuration status.
 * NEVER leaks actual secret values.
 */
export function getSafeConfigStatus(): SafePaymentConfig {
  const keyId = getRazorpayKeyId();
  const secret = getRazorpayKeySecret();
  const webhookSecret = getRazorpayWebhookSecret();

  let keyIdMasked = 'Not Configured';
  if (keyId) {
    if (keyId.length > 8) {
      keyIdMasked = `${keyId.slice(0, 8)}••••${keyId.slice(-4)}`;
    } else {
      keyIdMasked = '••••••••';
    }
  }

  return {
    configured: isRazorpayConfigured(),
    mode: getRazorpayMode(),
    keyIdPresent: Boolean(keyId),
    keyIdMasked,
    keySecretPresent: Boolean(secret),
    webhookSecretPresent: Boolean(webhookSecret),
    webhookUrl: '/api/payments/razorpay/webhook',
  };
}

/**
 * Creates a Razorpay Order server-side with authoritative amount (in paise).
 */
export async function createRazorpayOrder(params: {
  orderNumber: string;
  amountPaise: number;
  currency?: string;
  notes?: Record<string, string>;
}): Promise<{
  id: string;
  amount: number;
  currency: string;
  sandbox?: boolean;
  error?: string;
}> {
  const keyId = getRazorpayKeyId();
  const secret = getRazorpayKeySecret();
  const currency = params.currency || 'INR';

  if (!keyId || !secret) {
    // Sandbox / Test Mode fallback when environment variables are not yet injected
    const mockId = `order_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      id: mockId,
      amount: params.amountPaise,
      currency,
      sandbox: true,
    };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${secret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: params.amountPaise,
        currency,
        receipt: params.orderNumber,
        notes: params.notes || {},
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      const errMsg = data.error?.description || data.message || `Razorpay order creation failed (HTTP ${res.status})`;
      logError('razorpay_order_create_failed', errMsg);
      return { id: '', amount: params.amountPaise, currency, error: errMsg };
    }

    return {
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      sandbox: false,
    };
  } catch (e: any) {
    logError('razorpay_order_create_exception', e?.message || e);
    return { id: '', amount: params.amountPaise, currency, error: e?.message || 'Network error reaching Razorpay' };
  }
}

/**
 * Server-side timing-safe HMAC-SHA256 signature verification.
 */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): { valid: boolean; error?: string } {
  const secret = getRazorpayKeySecret();
  if (!secret) {
    // If running in local sandbox test mode without keys, validate format
    if (params.razorpayOrderId && params.razorpayPaymentId) {
      return { valid: true };
    }
    return { valid: false, error: 'Razorpay secret key not configured' };
  }

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const signatureBuf = Buffer.from(params.signature, 'utf8');

    if (expectedBuf.length !== signatureBuf.length) {
      return { valid: false, error: 'Signature length mismatch' };
    }

    const matches = crypto.timingSafeEqual(expectedBuf, signatureBuf);
    return { valid: matches, error: matches ? undefined : 'Signature verification failed' };
  } catch (e: any) {
    return { valid: false, error: e?.message || 'Error verifying signature' };
  }
}

/**
 * Server-side timing-safe HMAC-SHA256 webhook signature verification.
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
}): { valid: boolean; error?: string } {
  const secret = getRazorpayWebhookSecret();
  if (!secret) {
    return { valid: false, error: 'RAZORPAY_WEBHOOK_SECRET is not configured' };
  }

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(params.rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const signatureBuf = Buffer.from(params.signature, 'utf8');

    if (expectedBuf.length !== signatureBuf.length) {
      return { valid: false, error: 'Webhook signature length mismatch' };
    }

    const matches = crypto.timingSafeEqual(expectedBuf, signatureBuf);
    return { valid: matches, error: matches ? undefined : 'Webhook signature verification failed' };
  } catch (e: any) {
    return { valid: false, error: e?.message || 'Error verifying webhook signature' };
  }
}

/**
 * Initiates a full or partial refund on a captured Razorpay payment.
 */
export async function createRazorpayRefund(params: {
  paymentId: string;
  amountPaise: number;
  notes?: Record<string, string>;
}): Promise<{
  id: string;
  amount: number;
  status: string;
  sandbox?: boolean;
  error?: string;
}> {
  const keyId = getRazorpayKeyId();
  const secret = getRazorpayKeySecret();

  if (!keyId || !secret) {
    // Sandbox / Test Mode simulation
    return {
      id: `rfd_test_${Date.now()}`,
      amount: params.amountPaise,
      status: 'processed',
      sandbox: true,
    };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${secret}`).toString('base64');
    const res = await fetch(`https://api.razorpay.com/v1/payments/${params.paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: params.amountPaise,
        notes: params.notes || {},
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      const errMsg = data.error?.description || data.message || `Refund failed (HTTP ${res.status})`;
      logError('razorpay_refund_failed', errMsg);
      return { id: '', amount: params.amountPaise, status: 'failed', error: errMsg };
    }

    return {
      id: data.id,
      amount: data.amount,
      status: data.status || 'processed',
      sandbox: false,
    };
  } catch (e: any) {
    logError('razorpay_refund_exception', e?.message || e);
    return { id: '', amount: params.amountPaise, status: 'failed', error: e?.message || 'Network error reaching Razorpay' };
  }
}

/**
 * Tests live or test API connectivity to Razorpay.
 */
export async function testRazorpayConnection(): Promise<{
  ok: boolean;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  latencyMs: number;
  message: string;
  mode: 'TEST' | 'LIVE' | 'SANDBOX';
}> {
  const keyId = getRazorpayKeyId();
  const secret = getRazorpayKeySecret();
  const mode = getRazorpayMode();

  if (!keyId || !secret) {
    return {
      ok: false,
      status: 'NOT_CONFIGURED',
      latencyMs: 0,
      message: 'Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) not set in environment.',
      mode,
    };
  }

  const start = Date.now();
  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${secret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      method: 'GET',
      headers: { Authorization: authHeader },
    });
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return {
        ok: true,
        status: 'CONNECTED',
        latencyMs,
        message: `Connected successfully (${latencyMs}ms). Mode: ${mode}`,
        mode,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      status: 'ERROR',
      latencyMs,
      message: data.error?.description || `Razorpay returned HTTP ${res.status}`,
      mode,
    };
  } catch (e: any) {
    return {
      ok: false,
      status: 'ERROR',
      latencyMs: Date.now() - start,
      message: e?.message || 'Failed to reach Razorpay API',
      mode,
    };
  }
}

/**
 * Multi-way Reconciliation Algorithm.
 * Compares TVO Orders, TVO Payment records, Refunds, and Gateway records.
 */
export function runPaymentReconciliation(): Array<{
  orderNumber: string;
  orderId: number;
  customerName: string;
  orderTotal: number;
  orderStatus: string;
  orderPaymentStatus: string;
  paymentRecordId: number | null;
  paymentAmount: number | null;
  paymentStatus: string | null;
  paymentMethod: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  refundedAmount: number;
  reconciliationStatus: 'MATCHED' | 'MISMATCH' | 'PENDING_REVIEW' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  mismatchReason?: string;
  lastUpdated: string;
}> {
  const orders = db.prepare(`
    SELECT o.id, o.order_number, o.customer_name, o.total, o.status as order_status,
           o.payment_status as order_payment_status, o.payment_method,
           o.razorpay_order_id, o.razorpay_payment_id, o.updated_at, o.created_at
    FROM orders o
    ORDER BY o.id DESC
    LIMIT 200
  `).all() as any[];

  const results: any[] = [];

  for (const o of orders) {
    const payment = db.prepare('SELECT * FROM payments WHERE order_id=? ORDER BY id DESC LIMIT 1').get(o.id) as any;
    const refunds = db.prepare('SELECT SUM(amount) as total_refunded FROM order_refunds WHERE order_id=?').get(o.id) as any;
    const totalRefunded = Number(refunds?.total_refunded || 0);

    let recStatus: 'MATCHED' | 'MISMATCH' | 'PENDING_REVIEW' | 'REFUNDED' | 'PARTIALLY_REFUNDED' = 'MATCHED';
    let mismatchReason: string | undefined = undefined;

    if (!payment) {
      if (o.order_payment_status === 'Paid') {
        recStatus = 'MISMATCH';
        mismatchReason = 'Order marked Paid but no payment record exists in ledger';
      } else {
        recStatus = 'PENDING_REVIEW';
        mismatchReason = 'No payment transaction initiated yet';
      }
    } else {
      const orderTotal = Number(o.total);
      const paidAmount = Number(payment.amount);

      if (payment.status === 'Paid' && o.order_payment_status !== 'Paid' && o.order_payment_status !== 'Refunded' && o.order_payment_status !== 'Partially Refunded') {
        recStatus = 'MISMATCH';
        mismatchReason = `Payment captured (₹${paidAmount}) but order payment_status is "${o.order_payment_status}"`;
      } else if (Math.abs(orderTotal - paidAmount) > 0.01 && payment.status === 'Paid') {
        recStatus = 'MISMATCH';
        mismatchReason = `Amount mismatch: Order ₹${orderTotal} vs Payment ₹${paidAmount}`;
      } else if (totalRefunded >= orderTotal && totalRefunded > 0) {
        recStatus = 'REFUNDED';
      } else if (totalRefunded > 0) {
        recStatus = 'PARTIALLY_REFUNDED';
      } else if (payment.status === 'Failed' || o.order_payment_status === 'Failed') {
        recStatus = 'PENDING_REVIEW';
        mismatchReason = payment.failure_reason || 'Payment failed';
      } else if (payment.status === 'Pending') {
        recStatus = 'PENDING_REVIEW';
        mismatchReason = 'Payment pending customer action or gateway confirmation';
      } else {
        recStatus = 'MATCHED';
      }
    }

    results.push({
      orderNumber: o.order_number,
      orderId: o.id,
      customerName: o.customer_name || 'Guest',
      orderTotal: Number(o.total),
      orderStatus: o.order_status,
      orderPaymentStatus: o.order_payment_status,
      paymentRecordId: payment?.id || null,
      paymentAmount: payment ? Number(payment.amount) : null,
      paymentStatus: payment?.status || null,
      paymentMethod: payment?.method || o.payment_method || 'UPI',
      razorpayOrderId: payment?.razorpay_order_id || o.razorpay_order_id || null,
      razorpayPaymentId: payment?.razorpay_payment_id || o.razorpay_payment_id || null,
      refundedAmount: totalRefunded,
      reconciliationStatus: recStatus,
      mismatchReason,
      lastUpdated: o.updated_at || o.created_at || new Date().toISOString(),
    });
  }

  return results;
}
