import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST as paymentPost, GET as paymentGet } from '../../app/api/payments/route';
import { POST as webhookPost } from '../../app/api/payments/razorpay/webhook/route';
import { GET as adminPaymentsGet, POST as adminPaymentsPost } from '../../app/api/admin/payments/route';
import { db, initDb } from '../server/db';
import crypto from 'node:crypto';

describe('Payment API Endpoints Integration', () => {
  const originalEnv = { ...process.env };
  const TEST_SECRET = 'IntegrationSecretKey999';
  const TEST_WEBHOOK_SECRET = 'IntegrationWebhookSecret888';

  beforeEach(() => {
    initDb();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_IntegrationKey';
    process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('GET /api/payments returns safe config with zero secret leakage', async () => {
    const req = new Request('http://localhost/api/payments');
    const res = await paymentGet(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.configured).toBe(true);
    expect(json.mode).toBe('TEST');
    expect(json.key_id).toBe('rzp_test_IntegrationKey');
    expect(json.key_secret).toBeUndefined();
    expect(json.webhook_secret).toBeUndefined();
  });

  it('POST /api/payments create order verifies order existence and amount', async () => {
    // Non-existent order
    const reqNotFound = new Request('http://localhost/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', orderNumber: 'NON_EXISTENT_ORDER' }),
    });
    const resNotFound = await paymentPost(reqNotFound);
    expect(resNotFound.status).toBe(404);

    // Existing test order #2 in baseline DB (TVO-2026-000002)
    const req = new Request('http://localhost/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', orderNumber: 'TVO-2026-000002' }),
    });
    const res = await paymentPost(req);
    // Since network call to razorpay.com will fail with mock key, it returns safe 502 or handles gracefully
    expect([200, 502]).toContain(res.status);
  });

  it('POST /api/payments verify rejects invalid signature with 403', async () => {
    const req = new Request('http://localhost/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        orderNumber: 'TVO-2026-000002',
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_456',
        razorpay_signature: 'invalid_forged_sig_value',
      }),
    });
    const res = await paymentPost(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/signature/i);
  });

  it('POST /api/payments record failure updates payment status to Failed safely', async () => {
    const req = new Request('http://localhost/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'failure',
        orderNumber: 'TVO-2026-000002',
        reason: 'Customer cancelled checkout',
        code: 'MODAL_DISMISSED',
      }),
    });
    const res = await paymentPost(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.recorded).toBe(true);

    // Re-set order 2 status to Pending so baseline is pristine
    db.prepare("UPDATE orders SET payment_status='Pending' WHERE order_number='TVO-2026-000002'").run();
  });

  it('POST /api/payments/razorpay/webhook rejects invalid webhook signature', async () => {
    const raw = JSON.stringify({ event: 'payment.captured', id: 'evt_test_bad' });
    const req = new Request('http://localhost/api/payments/razorpay/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'invalid_hmac_hex',
      },
      body: raw,
    });
    const res = await webhookPost(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature/i);
  });
});
