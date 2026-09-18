import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import {
  getSafeConfigStatus,
  verifyPaymentSignature,
  createRazorpayOrder,
  createRazorpayRefund,
} from '../server/razorpay';
import { db } from '../server/db';

describe('Razorpay Payment System & Signature Engine', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_SampleKey1234';
    process.env.RAZORPAY_KEY_SECRET = 'TestSecretKey987654321';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'WebhookSecret555';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('never leaks key_secret or webhook_secret in safe configuration status', () => {
    const config = getSafeConfigStatus();
    expect(config.configured).toBe(true);
    expect(config.mode).toBe('TEST');
    expect(config.keyIdPresent).toBe(true);
    expect(config.keyIdMasked).toContain('••••');
    expect(config.keySecretPresent).toBe(true);
    expect(config.webhookSecretPresent).toBe(true);

    // Explicitly verify secrets are NOT in the returned object
    const serialized = JSON.stringify(config);
    expect(serialized).not.toContain('TestSecretKey987654321');
    expect(serialized).not.toContain('WebhookSecret555');
  });

  it('verifies valid HMAC-SHA256 signature successfully', () => {
    const orderId = 'order_test_12345';
    const paymentId = 'pay_test_67890';
    const secret = process.env.RAZORPAY_KEY_SECRET!;

    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const result = verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      signature: validSignature,
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects tampered signature or mismatched IDs', () => {
    const orderId = 'order_test_12345';
    const paymentId = 'pay_test_67890';
    const secret = process.env.RAZORPAY_KEY_SECRET!;

    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Tampered order ID
    const tamperedOrderIdResult = verifyPaymentSignature({
      razorpayOrderId: 'order_test_HACKED',
      razorpayPaymentId: paymentId,
      signature: validSignature,
    });
    expect(tamperedOrderIdResult.valid).toBe(false);

    // Tampered payment ID
    const tamperedPaymentIdResult = verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: 'pay_test_DIFFERENT',
      signature: validSignature,
    });
    expect(tamperedPaymentIdResult.valid).toBe(false);

    // Forged signature
    const forgedSigResult = verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      signature: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    });
    expect(forgedSigResult.valid).toBe(false);
  });

  it('handles sandbox order creation fallback safely when credentials are unconfigured', async () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    const rzOrder = await createRazorpayOrder({
      orderNumber: 'TVO-TEST-999',
      amountPaise: 45000, // ₹450
      currency: 'INR',
    });

    expect(rzOrder.id).toBeDefined();
    expect(rzOrder.id).toMatch(/^order_test_/);
    expect(rzOrder.amount).toBe(45000);
    expect(rzOrder.currency).toBe('INR');
    expect(rzOrder.sandbox).toBe(true);
  });

  it('simulates refund in test mode and validates amount', async () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    const refund = await createRazorpayRefund({
      paymentId: 'pay_test_9999',
      amountPaise: 20000, // ₹200
      notes: { reason: 'Customer cancellation' },
    });

    expect(refund.id).toBeDefined();
    expect(refund.id).toMatch(/^rfd_test_/);
    expect(refund.amount).toBe(20000);
    expect(refund.status).toBe('processed');
    expect(refund.sandbox).toBe(true);
  });
});
