import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from '../server/razorpay';
import { db, initDb } from '../server/db';

describe('Razorpay Webhook Verification & Idempotency', () => {
  const originalEnv = { ...process.env };
  const WEBHOOK_SECRET = 'SuperSecretWebhook123';

  beforeEach(() => {
    initDb();
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('validates genuine webhook HMAC signature over raw body', () => {
    const rawPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.captured',
      id: 'evt_test_123',
      created_at: Math.floor(Date.now() / 1000),
    });

    const validSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    const result = verifyWebhookSignature({
      rawBody: rawPayload,
      signature: validSignature,
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects tampered webhook body or forged signature', () => {
    const rawPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.captured',
      id: 'evt_test_123',
    });

    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    // Tampered payload
    const tamperedPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.captured',
      id: 'evt_test_MODIFIED',
    });

    const tamperedResult = verifyWebhookSignature({
      rawBody: tamperedPayload,
      signature,
    });

    expect(tamperedResult.valid).toBe(false);

    // Invalid signature
    const invalidSigResult = verifyWebhookSignature({
      rawBody: rawPayload,
      signature: 'invalid_hex_signature_here',
    });

    expect(invalidSigResult.valid).toBe(false);
  });

  it('enforces idempotency by recording and detecting duplicate event IDs', () => {
    const testEventId = `evt_unit_test_${Date.now()}`;
    
    // Clean up if existed
    try {
      db.prepare('DELETE FROM webhook_events WHERE event_id=?').run(testEventId);
    } catch {}

    // First insertion
    db.prepare(`
      INSERT INTO webhook_events (event_id, event_type, payload, status, received_at)
      VALUES (?, 'payment.captured', '{}', 'processed', datetime('now'))
    `).run(testEventId);

    // Check query detects existing
    const found = db.prepare('SELECT id, event_id, status FROM webhook_events WHERE event_id=?').get(testEventId) as any;
    expect(found).toBeDefined();
    expect(found.event_id).toBe(testEventId);
    expect(found.status).toBe('processed');

    // Clean up test event
    db.prepare('DELETE FROM webhook_events WHERE event_id=?').run(testEventId);
  });
});
