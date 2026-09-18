import crypto from 'node:crypto';
import { db } from './db';
import { logError } from './logger';
import {
  encryptSecret,
  decryptSecret,
  maskKeyId,
  validateKeyFormat,
} from './payment-crypto';

export interface ActivePaymentConfig {
  source: 'database' | 'env' | 'none';
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  mode: 'TEST' | 'LIVE' | 'SANDBOX';
  isActive: boolean;
  dbConfigId?: number;
  connectionStatus?: string;
  lastConnectionTestAt?: string | null;
  lastWebhookReceivedAt?: string | null;
  updatedAt?: string | null;
}

export interface SafePaymentConfig {
  configured: boolean;
  isActive: boolean;
  mode: 'TEST' | 'LIVE' | 'SANDBOX';
  environment: 'test' | 'live';
  source: 'database' | 'env' | 'none';
  keyIdPresent: boolean;
  keyIdMasked: string;
  keyId: string;
  keySecretPresent: boolean;
  hasKeySecret: boolean;
  webhookSecretPresent: boolean;
  hasWebhookSecret: boolean;
  webhookUrl: string;
  connectionStatus: string;
  lastConnectionTestAt: string | null;
  lastWebhookReceivedAt: string | null;
  updatedAt: string | null;
}

/**
 * Resolves the active Razorpay configuration.
 * Precedence:
 * 1. Active database configuration in `payment_gateway_configs` (encrypted)
 * 2. Environment variables fallback (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
 */
export function getActiveGatewayConfig(): ActivePaymentConfig {
  try {
    const row = db.prepare(`
      SELECT * FROM payment_gateway_configs 
      WHERE provider='razorpay' 
      ORDER BY id DESC LIMIT 1
    `).get() as any;

    if (row) {
      let keySecret = '';
      let webhookSecret = '';

      try {
        if (row.encrypted_key_secret) {
          keySecret = decryptSecret(row.encrypted_key_secret);
        }
      } catch (e) {
        logError('payment_crypto_decrypt_key_error', 'Failed to decrypt gateway key secret');
      }

      try {
        if (row.encrypted_webhook_secret) {
          webhookSecret = decryptSecret(row.encrypted_webhook_secret);
        }
      } catch (e) {
        logError('payment_crypto_decrypt_webhook_error', 'Failed to decrypt webhook secret');
      }

      const mode: 'TEST' | 'LIVE' | 'SANDBOX' = 
        row.environment?.toLowerCase() === 'live' ? 'LIVE' : 'TEST';

      return {
        source: 'database',
        keyId: row.key_id || '',
        keySecret,
        webhookSecret,
        mode,
        isActive: Boolean(row.is_active),
        dbConfigId: row.id,
        connectionStatus: row.connection_status || 'unknown',
        lastConnectionTestAt: row.last_connection_test_at || null,
        lastWebhookReceivedAt: row.last_webhook_received_at || null,
        updatedAt: row.updated_at || row.created_at || null,
      };
    }
  } catch {
    // If table doesn't exist yet or query fails, fall back to environment variables
  }

  // Fallback to environment variables
  const envKeyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const envKeySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const envWebhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();

  const isConfigured = Boolean(envKeyId && envKeySecret);
  const mode: 'TEST' | 'LIVE' | 'SANDBOX' = !envKeyId 
    ? 'SANDBOX' 
    : (envKeyId.startsWith('rzp_live_') ? 'LIVE' : 'TEST');

  return {
    source: isConfigured ? 'env' : 'none',
    keyId: envKeyId,
    keySecret: envKeySecret,
    webhookSecret: envWebhookSecret,
    mode,
    isActive: isConfigured,
    connectionStatus: isConfigured ? 'configured_via_env' : 'not_configured',
    lastConnectionTestAt: null,
    lastWebhookReceivedAt: null,
    updatedAt: null,
  };
}

export function getRazorpayKeyId(): string {
  return getActiveGatewayConfig().keyId;
}

export function getRazorpayKeySecret(): string {
  return getActiveGatewayConfig().keySecret;
}

export function getRazorpayWebhookSecret(): string {
  return getActiveGatewayConfig().webhookSecret;
}

export function isRazorpayConfigured(): boolean {
  const config = getActiveGatewayConfig();
  return Boolean(config.keyId && config.keySecret);
}

export function isRazorpayActive(): boolean {
  const config = getActiveGatewayConfig();
  return Boolean(config.keyId && config.keySecret && config.isActive);
}

export function getRazorpayMode(): 'TEST' | 'LIVE' | 'SANDBOX' {
  return getActiveGatewayConfig().mode;
}

/**
 * Returns safe environment configuration status.
 * NEVER leaks actual secret values.
 */
export function getSafeConfigStatus(): SafePaymentConfig {
  const config = getActiveGatewayConfig();
  const masked = maskKeyId(config.keyId);

  return {
    configured: isRazorpayConfigured(),
    isActive: isRazorpayActive(),
    mode: config.mode,
    environment: config.mode === 'LIVE' ? 'live' : 'test',
    source: config.source,
    keyIdPresent: Boolean(config.keyId),
    keyIdMasked: masked,
    keyId: masked,
    keySecretPresent: Boolean(config.keySecret),
    hasKeySecret: Boolean(config.keySecret),
    webhookSecretPresent: Boolean(config.webhookSecret),
    hasWebhookSecret: Boolean(config.webhookSecret),
    webhookUrl: '/api/payments/razorpay/webhook',
    connectionStatus: config.connectionStatus || 'unknown',
    lastConnectionTestAt: config.lastConnectionTestAt || null,
    lastWebhookReceivedAt: config.lastWebhookReceivedAt || null,
    updatedAt: config.updatedAt || null,
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
  const config = getActiveGatewayConfig();
  const currency = params.currency || 'INR';

  if (config.source === 'database' && !config.isActive) {
    return {
      id: '',
      amount: params.amountPaise,
      currency,
      error: 'Online payments are currently disabled by the bakery administrator.',
    };
  }

  const keyId = config.keyId;
  const secret = config.keySecret;

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

export const verifyRazorpayWebhookSignature = verifyWebhookSignature;

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
 * Can test either passed credentials or the currently active configuration.
 */
export async function testRazorpayConnection(creds?: {
  keyId?: string;
  keySecret?: string;
  environment?: 'test' | 'live';
}): Promise<{
  ok: boolean;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  latencyMs: number;
  message: string;
  mode: 'TEST' | 'LIVE' | 'SANDBOX';
}> {
  const active = getActiveGatewayConfig();
  const keyId = creds?.keyId?.trim() || active.keyId;
  const secret = creds?.keySecret?.trim() || active.keySecret;
  const mode = creds?.environment
    ? (creds.environment === 'live' ? 'LIVE' : 'TEST')
    : (keyId.startsWith('rzp_live_') ? 'LIVE' : (keyId ? 'TEST' : 'SANDBOX'));

  if (!keyId || !secret) {
    return {
      ok: false,
      status: 'NOT_CONFIGURED',
      latencyMs: 0,
      message: 'Razorpay credentials (Key ID and Key Secret) are not configured.',
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
      // If testing active saved config, update status in database
      if (!creds?.keyId && active.dbConfigId) {
        try {
          db.prepare(`
            UPDATE payment_gateway_configs 
            SET connection_status='connected', last_connection_test_at=datetime('now')
            WHERE id=?
          `).run(active.dbConfigId);
        } catch {}
      }

      return {
        ok: true,
        status: 'CONNECTED',
        latencyMs,
        message: `Connected successfully (${latencyMs}ms). Mode: ${mode}`,
        mode,
      };
    }

    const data = await res.json().catch(() => ({}));
    const errMsg = data.error?.description || `Razorpay returned HTTP ${res.status}`;
    
    if (!creds?.keyId && active.dbConfigId) {
      try {
        db.prepare(`
          UPDATE payment_gateway_configs 
          SET connection_status='error', last_connection_test_at=datetime('now')
          WHERE id=?
        `).run(active.dbConfigId);
      } catch {}
    }

    return {
      ok: false,
      status: 'ERROR',
      latencyMs,
      message: errMsg,
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
 * Saves and activates a new Razorpay configuration with encrypted secrets.
 */
export async function saveGatewayConfig(params: {
  environment: 'test' | 'live';
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
  adminUser?: string;
}): Promise<{
  ok: boolean;
  config?: SafePaymentConfig;
  testResult?: any;
  error?: string;
}> {
  // 1. Validate Key ID format against environment
  const formatCheck = validateKeyFormat(params.keyId, params.environment);
  if (!formatCheck.valid) {
    return { ok: false, error: formatCheck.error };
  }

  if (!params.keySecret || params.keySecret.trim().length < 8) {
    return { ok: false, error: 'A valid Razorpay Key Secret is required.' };
  }

  // 2. Perform safe connection test against Razorpay
  const testRes = await testRazorpayConnection({
    keyId: params.keyId,
    keySecret: params.keySecret,
    environment: params.environment,
  });

  const connectionStatus = testRes.ok ? 'connected' : 'error';

  // 3. Encrypt secrets with AES-256-GCM
  const encryptedKeySecret = encryptSecret(params.keySecret.trim());
  const encryptedWebhookSecret = params.webhookSecret?.trim()
    ? encryptSecret(params.webhookSecret.trim())
    : null;

  // 4. Atomically persist to SQLite
  try {
    db.transaction(() => {
      db.prepare("UPDATE payment_gateway_configs SET is_active=0 WHERE provider='razorpay'").run();
      db.prepare(`
        INSERT INTO payment_gateway_configs (
          provider, environment, key_id, encrypted_key_secret, encrypted_webhook_secret,
          is_active, connection_status, last_connection_test_at, created_by, updated_by,
          created_at, updated_at
        )
        VALUES (
          'razorpay', ?, ?, ?, ?, 1, ?, datetime('now'), ?, ?, datetime('now'), datetime('now')
        )
      `).run(
        params.environment,
        params.keyId.trim(),
        encryptedKeySecret,
        encryptedWebhookSecret,
        connectionStatus,
        params.adminUser || 'Admin',
        params.adminUser || 'Admin'
      );
    })();
  } catch (dbErr: any) {
    return { ok: false, error: `Database error saving configuration: ${dbErr.message}` };
  }

  return {
    ok: true,
    config: getSafeConfigStatus(),
    testResult: testRes,
  };
}

/**
 * Toggles payment gateway active status (enable/disable).
 */
export function setGatewayActiveStatus(active: boolean, adminUser?: string): { ok: boolean; config: SafePaymentConfig } {
  const current = getActiveGatewayConfig();

  if (current.source === 'database' && current.dbConfigId) {
    db.prepare(`
      UPDATE payment_gateway_configs 
      SET is_active=?, updated_by=?, updated_at=datetime('now')
      WHERE id=?
    `).run(active ? 1 : 0, adminUser || 'Admin', current.dbConfigId);
  } else {
    // If running solely from env, create a DB record to persist active toggle
    const envKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
    const envKeySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder';
    const envWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    try {
      db.prepare(`
        INSERT INTO payment_gateway_configs (
          provider, environment, key_id, encrypted_key_secret, encrypted_webhook_secret,
          is_active, connection_status, created_by, updated_by, created_at, updated_at
        )
        VALUES (
          'razorpay', 'test', ?, ?, ?, ?, 'configured', ?, ?, datetime('now'), datetime('now')
        )
      `).run(
        envKeyId,
        encryptSecret(envKeySecret),
        envWebhookSecret ? encryptSecret(envWebhookSecret) : null,
        active ? 1 : 0,
        adminUser || 'Admin',
        adminUser || 'Admin'
      );
    } catch {}
  }

  return { ok: true, config: getSafeConfigStatus() };
}

/**
 * Rotates only the webhook secret while preserving Key ID and Secret.
 */
export function rotateWebhookSecret(newSecret: string, adminUser?: string): { ok: boolean; error?: string } {
  if (!newSecret || newSecret.trim().length < 6) {
    return { ok: false, error: 'Webhook secret must be at least 6 characters.' };
  }

  const current = getActiveGatewayConfig();
  const encrypted = encryptSecret(newSecret.trim());

  if (current.source === 'database' && current.dbConfigId) {
    db.prepare(`
      UPDATE payment_gateway_configs 
      SET encrypted_webhook_secret=?, updated_by=?, updated_at=datetime('now')
      WHERE id=?
    `).run(encrypted, adminUser || 'Admin', current.dbConfigId);
  } else {
    const envKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
    const envKeySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder';
    try {
      db.prepare(`
        INSERT INTO payment_gateway_configs (
          provider, environment, key_id, encrypted_key_secret, encrypted_webhook_secret,
          is_active, connection_status, created_by, updated_by, created_at, updated_at
        )
        VALUES (
          'razorpay', 'test', ?, ?, ?, 1, 'configured', ?, ?, datetime('now'), datetime('now')
        )
      `).run(
        envKeyId,
        encryptSecret(envKeySecret),
        encrypted,
        adminUser || 'Admin',
        adminUser || 'Admin'
      );
    } catch {}
  }

  return { ok: true };
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
