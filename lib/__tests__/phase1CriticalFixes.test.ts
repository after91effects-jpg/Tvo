import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { db, initDb } from '../server/db';
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../server/razorpay';
import { POST as webhookPost } from '../../app/api/payments/razorpay/webhook/route';
import { POST as paymentsPost } from '../../app/api/payments/route';
import { GET as couponsGet } from '../../app/api/coupons/route';

describe('Phase 1 Critical Fixes (BUG-014, BUG-001, BUG-002)', () => {
  const originalEnv = { ...process.env };
  const WEBHOOK_SECRET = 'Phase1WebhookTestSecret_2026';

  beforeEach(() => {
    initDb();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // =========================================================================
  // BUG-014: Production Online Payment Initialization
  // =========================================================================
  describe('BUG-014: Production online-payment initialization safeguards', () => {
    it('NEVER generates mock order IDs when NODE_ENV=production and credentials missing', async () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;

      const res = await createRazorpayOrder({
        orderNumber: 'TVO-PROD-001',
        amountPaise: 50000,
        currency: 'INR',
      });

      expect(res.id).toBe('');
      expect(res.error).toBeDefined();
      expect(res.error).toMatch(/unconfigured/i);
      expect(res.id).not.toMatch(/^order_test_/);
    });

    it('NEVER accepts mock/test order IDs in payment verification during production', async () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.RAZORPAY_KEY_ID = 'rzp_live_realprodkey123';
      process.env.RAZORPAY_KEY_SECRET = 'reallivesecret456';

      const sigCheck = verifyPaymentSignature({
        razorpayOrderId: 'order_test_1234567890',
        razorpayPaymentId: 'pay_test_987654321',
        signature: 'some_sig',
      });

      expect(sigCheck.valid).toBe(false);
      expect(sigCheck.error).toMatch(/test or mock/i);
    });

    it('POST /api/payments rejects mock order IDs when NODE_ENV=production', async () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.RAZORPAY_KEY_ID = 'rzp_live_realprodkey123';
      process.env.RAZORPAY_KEY_SECRET = 'reallivesecret456';

      const req = new Request('http://localhost/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          orderNumber: 'TVO-2026-000001',
          razorpay_order_id: 'order_test_fake999',
          razorpay_payment_id: 'pay_test_fake999',
          razorpay_signature: 'abc123',
        }),
      });

      const res = await paymentsPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/mock or test/i);
    });

    it('preserves test-mode mock generation when in test/dev environment', async () => {
      (process.env as any).NODE_ENV = 'test';
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;

      const res = await createRazorpayOrder({
        orderNumber: 'TVO-TEST-DEV',
        amountPaise: 25000,
        currency: 'INR',
      });

      expect(res.id).toMatch(/^order_test_/);
      expect(res.sandbox).toBe(true);
    });
  });

  // =========================================================================
  // BUG-001: Webhook Signature Verification Enforcement
  // =========================================================================
  describe('BUG-001: Server-side Razorpay webhook signature verification', () => {
    it('rejects webhooks with 500 when RAZORPAY_WEBHOOK_SECRET is unconfigured', async () => {
      delete process.env.RAZORPAY_WEBHOOK_SECRET;

      // Ensure DB config does not supply secret either
      try {
        db.prepare("UPDATE payment_gateway_configs SET encrypted_webhook_secret='' WHERE provider='razorpay'").run();
      } catch {}

      const raw = JSON.stringify({ event: 'payment.captured', id: 'evt_no_secret_test' });
      const req = new Request('http://localhost/api/payments/razorpay/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': 'any_sig',
        },
        body: raw,
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toMatch(/webhook secret is not configured/i);
    });

    it('rejects webhooks with 400 when x-razorpay-signature header is missing', async () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

      const raw = JSON.stringify({ event: 'payment.captured', id: 'evt_no_sig_test' });
      const req = new Request('http://localhost/api/payments/razorpay/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: raw,
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/missing x-razorpay-signature/i);
    });

    it('rejects webhooks with 400 when signature is invalid/forged', async () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

      const raw = JSON.stringify({ event: 'payment.captured', id: 'evt_invalid_sig_test' });
      const req = new Request('http://localhost/api/payments/razorpay/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': 'badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad',
        },
        body: raw,
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/signature/i);
    });

    it('accepts valid webhook with genuine HMAC signature and ensures idempotency', async () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

      const eventId = `evt_valid_test_${Date.now()}`;
      const raw = JSON.stringify({
        id: eventId,
        event: 'payment.authorized',
        payload: { payment: { entity: { id: 'pay_valid_123', order_id: 'order_valid_123' } } },
      });

      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(raw)
        .digest('hex');

      const req1 = new Request('http://localhost/api/payments/razorpay/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signature,
        },
        body: raw,
      });

      const res1 = await webhookPost(req1);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.received).toBe(true);

      // Verify idempotency on second identical call
      const req2 = new Request('http://localhost/api/payments/razorpay/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signature,
        },
        body: raw,
      });

      const res2 = await webhookPost(req2);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.idempotent).toBe(true);

      // Clean up test event
      try {
        db.prepare('DELETE FROM webhook_events WHERE event_id=?').run(eventId);
      } catch {}
    });
  });

  // =========================================================================
  // BUG-002: Coupon Error Boundary & Safe Validation
  // =========================================================================
  describe('BUG-002: Coupon error boundary and safe validation', () => {
    it('returns controlled error response for invalid or non-existent coupon without 500 crash', async () => {
      const req = new Request('http://localhost/api/coupons?code=NONEXISTENT_COUPON_123&subtotal=500');
      const res = await couponsGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data.message).toMatch(/invalid coupon/i);
    });

    it('safely handles malformed subtotal (NaN or negative) without crashing', async () => {
      const req = new Request('http://localhost/api/coupons?code=TVO10&subtotal=NaN');
      const res = await couponsGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toBeDefined();
    });

    it('safely returns error message when coupon code parameter is empty', async () => {
      const req = new Request('http://localhost/api/coupons?code=');
      const res = await couponsGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data.message).toMatch(/please enter a coupon code/i);
    });

    it('returns list of active public coupons when called without code parameter', async () => {
      const req = new Request('http://localhost/api/coupons');
      const res = await couponsGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.coupons)).toBe(true);
    });

    it('successfully validates and calculates discount for an active coupon', async () => {
      // Create temporary test coupon
      const testCode = `TESTVAL${Date.now()}`.slice(0, 15);
      db.prepare(`
        INSERT INTO coupons (code, discount_type, discount_value, min_order, active, starts_at)
        VALUES (?, 'percent', 10, 200, 1, datetime('now', '-1 day'))
      `).run(testCode);

      try {
        const req = new Request(`http://localhost/api/coupons?code=${testCode}&subtotal=1000`);
        const res = await couponsGet(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.valid).toBe(true);
        expect(data.code).toBe(testCode);
        expect(data.discount).toBe(100);
        expect(data.message).toMatch(/coupon applied/i);
      } finally {
        db.prepare('DELETE FROM coupons WHERE code=?').run(testCode);
      }
    });

    it('enforces min_order requirement safely', async () => {
      const testCode = `TESTMIN${Date.now()}`.slice(0, 15);
      db.prepare(`
        INSERT INTO coupons (code, discount_type, discount_value, min_order, active)
        VALUES (?, 'percent', 10, 500, 1)
      `).run(testCode);

      try {
        const req = new Request(`http://localhost/api/coupons?code=${testCode}&subtotal=300`);
        const res = await couponsGet(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.valid).toBe(false);
        expect(data.message).toMatch(/minimum order/i);
      } finally {
        db.prepare('DELETE FROM coupons WHERE code=?').run(testCode);
      }
    });

    it('detects expired coupons safely', async () => {
      const testCode = `TESTEXP${Date.now()}`.slice(0, 15);
      db.prepare(`
        INSERT INTO coupons (code, discount_type, discount_value, active, ends_at)
        VALUES (?, 'flat', 50, 1, datetime('now', '-1 day'))
      `).run(testCode);

      try {
        const req = new Request(`http://localhost/api/coupons?code=${testCode}&subtotal=500`);
        const res = await couponsGet(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.valid).toBe(false);
        expect(data.message).toMatch(/expired/i);
      } finally {
        db.prepare('DELETE FROM coupons WHERE code=?').run(testCode);
      }
    });
  });
});
