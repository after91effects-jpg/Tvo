import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET as configGet, POST as configPost } from '../../app/api/admin/payments/razorpay/config/route';
import { POST as testConnectionPost } from '../../app/api/admin/payments/razorpay/test-connection/route';
import { GET as storefrontPaymentsGet, POST as storefrontPaymentsPost } from '../../app/api/payments/route';
import { db, initDb } from '../server/db';
import { runMigrations } from '../server/migrations';
import { signToken } from '../server/auth';
import {
  encryptSecret,
  decryptSecret,
  maskKeyId,
  validateKeyFormat,
} from '../server/payment-crypto';
import {
  getActiveGatewayConfig,
  saveGatewayConfig,
  setGatewayActiveStatus,
  rotateWebhookSecret,
  verifyRazorpayWebhookSignature,
} from '../server/razorpay';
import crypto from 'node:crypto';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-tvo-flavours-32bytes';

describe('Admin Payment Settings & Razorpay Dynamic Configuration (Phase 4)', () => {
  const originalEnv = { ...process.env };
  const ADMIN_SUB = 1;
  let adminToken: string;
  let adminHeaders: Record<string, string>;

  beforeEach(() => {
    initDb();
    runMigrations();
    process.env.JWT_SECRET = 'test-jwt-secret-key-tvo-flavours-32bytes';
    process.env.PAYMENT_ENCRYPTION_KEY = 'test-master-encryption-key-for-phase-4-testing';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_EnvFallbackKeyId';
    process.env.RAZORPAY_KEY_SECRET = 'EnvFallbackSecretKey123';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'EnvFallbackWebhookSecret456';

    adminToken = signToken({ sub: ADMIN_SUB, name: 'TVO Flavours Admin', role: 'super_admin' });
    adminHeaders = {
      'Content-Type': 'application/json',
      Cookie: `tvo_auth=${adminToken}`,
    };

    // Clean up any test gateway configs
    db.prepare("DELETE FROM payment_gateway_configs WHERE provider='razorpay'").run();
  });

  afterEach(() => {
    // Restore clean state
    db.prepare("DELETE FROM payment_gateway_configs WHERE provider='razorpay'").run();
    process.env = { ...originalEnv };
  });

  // =========================================================================
  // 1. AES-256-GCM Cryptographic Security
  // =========================================================================
  describe('1. AES-256-GCM Encryption / Decryption Security', () => {
    it('encrypts plaintext into iv:authTag:ciphertext format with zero plaintext leakage', () => {
      const plaintext = 'rzp_sec_SuperSecretPaymentKey999!';
      const encrypted = encryptSecret(plaintext);
      expect(typeof encrypted).toBe('string');

      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
      const [ivHex, authTagHex, ciphertextHex] = parts;

      expect(ivHex.length).toBe(24); // 12-byte IV in hex
      expect(authTagHex.length).toBe(32); // 16-byte auth tag in hex
      expect(ciphertextHex.length).toBeGreaterThan(0);

      // Zero leakage of plaintext
      expect(encrypted).not.toContain(plaintext);
    });

    it('decrypts encrypted payload back to identical plaintext', () => {
      const original = 'my-super-secret-webhook-key-2026';
      const encrypted = encryptSecret(original);
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(original);
    });

    it('rejects tampered ciphertext or modified auth tag with error', () => {
      const original = 'confidential-secret-payload';
      const encrypted = encryptSecret(original);
      const parts = encrypted.split(':');
      const [ivHex, authTagHex, ciphertextHex] = parts;

      // Tamper ciphertext
      const tamperedCiphertext = `${ivHex}:${authTagHex}:bad${ciphertextHex.slice(3)}`;
      expect(() => decryptSecret(tamperedCiphertext)).toThrow();

      // Tamper auth tag
      const tamperedAuthTag = `${ivHex}:${'00'.repeat(16)}:${ciphertextHex}`;
      expect(() => decryptSecret(tamperedAuthTag)).toThrow();
    });
  });

  // =========================================================================
  // 2. Key Format Validation & Display Masking
  // =========================================================================
  describe('2. Key Format Validation and Masking', () => {
    it('validates test key prefix (rzp_test_) for test environment', () => {
      expect(validateKeyFormat('rzp_test_Abc1234567890123', 'test').valid).toBe(true);
      expect(validateKeyFormat('rzp_live_Abc1234567890123', 'test').valid).toBe(false);
      expect(validateKeyFormat('invalid_prefix_key', 'test').valid).toBe(false);
    });

    it('validates live key prefix (rzp_live_) for live environment', () => {
      expect(validateKeyFormat('rzp_live_ProductionKey12345678', 'live').valid).toBe(true);
      expect(validateKeyFormat('rzp_test_ProductionKey12345678', 'live').valid).toBe(false);
      expect(validateKeyFormat('live_without_rzp', 'live').valid).toBe(false);
    });

    it('masks key ID showing prefix and last 4 characters only', () => {
      expect(maskKeyId('rzp_test_1234567890abcdef')).toBe('rzp_test_••••cdef');
      expect(maskKeyId('rzp_live_9876543210fedcba')).toBe('rzp_live_••••dcba');
      expect(maskKeyId('')).toBe('Not Configured');
      expect(maskKeyId(undefined)).toBe('Not Configured');
    });
  });

  // =========================================================================
  // 3. Admin Route Authentication & Role Guards
  // =========================================================================
  describe('3. Admin Route Authentication and Access Control', () => {
    it('GET /api/admin/payments/razorpay/config rejects unauthenticated request with 401', async () => {
      const req = new Request('http://localhost/api/admin/payments/razorpay/config');
      const res = await configGet(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/unauthorized|authentication/i);
    });

    it('POST /api/admin/payments/razorpay/config rejects unauthenticated request with 401', async () => {
      const req = new Request('http://localhost/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_activate' }),
      });
      const res = await configPost(req);
      expect(res.status).toBe(401);
    });

    it('POST /api/admin/payments/razorpay/test-connection rejects unauthenticated request with 401', async () => {
      const req = new Request('http://localhost/api/admin/payments/razorpay/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await testConnectionPost(req);
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/payments/razorpay/config succeeds for authenticated admin', async () => {
      const req = new Request('http://localhost/api/admin/payments/razorpay/config', {
        headers: adminHeaders,
      });
      const res = await configGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty('config');
      expect(json.config.configured).toBe(true);
      // Secrets must never be present
      expect(json.config.keySecret).toBeUndefined();
      expect(json.config.webhookSecret).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. Admin Save & Activate Configuration
  // =========================================================================
  describe('4. Admin Save & Activate Razorpay Credentials', () => {
    it('saves encrypted credentials to database with zero secret leakage in response', async () => {
      const testKeyId = 'rzp_test_AdminConfiguredKey99';
      const testSecret = 'AdminConfiguredSecretValue88';
      const testWebhookSecret = 'AdminConfiguredWebhookSecret77';

      const req = new Request('http://localhost/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          action: 'save_activate',
          environment: 'test',
          keyId: testKeyId,
          keySecret: testSecret,
          webhookSecret: testWebhookSecret,
        }),
      });

      const res = await configPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.config.keyId).toBe(maskKeyId(testKeyId));
      expect(json.config.hasKeySecret).toBe(true);
      expect(json.config.hasWebhookSecret).toBe(true);
      expect(json.config.keySecret).toBeUndefined();
      expect(json.config.webhookSecret).toBeUndefined();

      // Verify SQLite row: secret is encrypted
      const row = db.prepare("SELECT * FROM payment_gateway_configs WHERE provider='razorpay'").get() as any;
      expect(row).toBeDefined();
      expect(row.key_id).toBe(testKeyId);
      expect(row.encrypted_key_secret).not.toBe(testSecret);
      expect(row.encrypted_key_secret.split(':').length).toBe(3);
      expect(row.encrypted_webhook_secret.split(':').length).toBe(3);

      // Decryption verifies stored content
      expect(decryptSecret(row.encrypted_key_secret)).toBe(testSecret);
      expect(decryptSecret(row.encrypted_webhook_secret)).toBe(testWebhookSecret);
    });

    it('rejects save request with missing key ID or key secret', async () => {
      const req = new Request('http://localhost/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          action: 'save_activate',
          environment: 'test',
          keyId: '',
          keySecret: '',
        }),
      });
      const res = await configPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/required/i);
    });
  });

  // =========================================================================
  // 5. Precedence & Active Configuration Resolver
  // =========================================================================
  describe('5. Active Configuration Resolver Precedence (DB > ENV)', () => {
    it('uses active DB configuration over environment variables', async () => {
      // Initially, active configuration is env fallback
      const initialConfig = getActiveGatewayConfig();
      expect(initialConfig?.keyId).toBe('rzp_test_EnvFallbackKeyId');
      expect(initialConfig?.source).toBe('env');

      // Save custom DB configuration
      await saveGatewayConfig({
        environment: 'test',
        keyId: 'rzp_test_DatabaseOverrideKey',
        keySecret: 'DbSecretOverridingEnv123',
        webhookSecret: 'DbWebhookOverridingEnv456',
        adminUser: 'TVO Flavours Admin',
      });

      // Now resolver MUST return DB configuration
      const activeConfig = getActiveGatewayConfig();
      expect(activeConfig).toBeDefined();
      expect(activeConfig?.keyId).toBe('rzp_test_DatabaseOverrideKey');
      expect(activeConfig?.keySecret).toBe('DbSecretOverridingEnv123');
      expect(activeConfig?.source).toBe('database');
    });

    it('falls back to environment variables when DB config is removed or disabled', async () => {
      await saveGatewayConfig({
        environment: 'test',
        keyId: 'rzp_test_DatabaseKeyToDisable',
        keySecret: 'DbSecret123',
        adminUser: 'TVO Flavours Admin',
      });

      expect(getActiveGatewayConfig()?.source).toBe('database');

      // Disable DB config
      setGatewayActiveStatus(false, 'TVO Flavours Admin');

      // When DB config is explicitly deactivated, getActiveGatewayConfig returns inactive
      const inactiveConfig = getActiveGatewayConfig();
      expect(inactiveConfig?.isActive).toBe(false);

      // Re-enable DB config
      setGatewayActiveStatus(true, 'TVO Flavours Admin');
      const reenabledConfig = getActiveGatewayConfig();
      expect(reenabledConfig?.isActive).toBe(true);
      expect(reenabledConfig?.keyId).toBe('rzp_test_DatabaseKeyToDisable');
    });
  });

  // =========================================================================
  // 6. Test API Connection Diagnostics
  // =========================================================================
  describe('6. Test API Connection Diagnostics', () => {
    it('POST /api/admin/payments/razorpay/test-connection returns diagnostic report', async () => {
      const req = new Request('http://localhost/api/admin/payments/razorpay/test-connection', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          keyId: 'rzp_test_DiagnosticKey123',
          keySecret: 'DiagnosticSecretKey456',
          environment: 'test',
        }),
      });

      const res = await testConnectionPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('mode');
      expect(json).toHaveProperty('latencyMs');
      expect(json.mode).toBe('TEST');
    });
  });

  // =========================================================================
  // 7. Live Mode Safeguard
  // =========================================================================
  describe('7. Live Mode Safeguard Enforcement', () => {
    it('rejects Live Mode configuration if confirmedLive is false or absent', async () => {
      const req = new Request('http://localhost/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          action: 'save_activate',
          environment: 'live',
          keyId: 'rzp_live_ProductionKey12345678',
          keySecret: 'LiveSecretKey987654321',
          confirmedLive: false,
        }),
      });

      const res = await configPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/confirmation is required before activating Live Mode/i);

      // Verify no live config was saved in DB
      const row = db.prepare("SELECT * FROM payment_gateway_configs WHERE provider='razorpay'").get();
      expect(row).toBeUndefined();
    });

    it('accepts Live Mode configuration when confirmedLive is true', async () => {
      const req = new Request('http://localhost/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          action: 'save_activate',
          environment: 'live',
          keyId: 'rzp_live_ProductionKey12345678',
          keySecret: 'LiveSecretKey987654321',
          confirmedLive: true,
        }),
      });

      const res = await configPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.config.environment).toBe('live');
    });
  });

  // =========================================================================
  // 8. Gateway Disable / Enable & Checkout Graceful Fallback
  // =========================================================================
  describe('8. Gateway Disable / Enable and Storefront Graceful Fallback', () => {
    it('disabling gateway updates DB and reflects in storefront status API', async () => {
      // First save an active DB config
      await saveGatewayConfig({
        environment: 'test',
        keyId: 'rzp_test_ToggleTestKey1',
        keySecret: 'ToggleSecretVal1',
        adminUser: 'TVO Flavours Admin',
      });

      // Disable gateway
      const disableReq = new Request('http://localhost/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: 'disable' }),
      });
      const disableRes = await configPost(disableReq);
      expect(disableRes.status).toBe(200);

      // Storefront GET /api/payments reports enabled: false
      const storeRes = await storefrontPaymentsGet(new Request('http://localhost/api/payments'));
      expect(storeRes.status).toBe(200);
      const storeJson = await storeRes.json();
      expect(storeJson.enabled).toBe(false);

      // Storefront POST /api/payments create order rejects online payment
      const createOrderReq = new Request('http://localhost/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', orderNumber: 'TVO-2026-000002' }),
      });
      const createOrderRes = await storefrontPaymentsPost(createOrderReq);
      expect(createOrderRes.status).toBe(400);
      const createOrderJson = await createOrderRes.json();
      expect(createOrderJson.error).toMatch(/temporarily disabled/i);

      // Re-enable gateway
      const enableReq = new Request('http://localhost/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: 'enable' }),
      });
      const enableRes = await configPost(enableReq);
      expect(enableRes.status).toBe(200);

      // Storefront reports enabled: true again
      const storeReenabled = await storefrontPaymentsGet(new Request('http://localhost/api/payments'));
      const storeReenabledJson = await storeReenabled.json();
      expect(storeReenabledJson.enabled).toBe(true);
    });
  });

  // =========================================================================
  // 9. Webhook Secret Rotation & Verification
  // =========================================================================
  describe('9. Webhook Secret Rotation and Signature Verification', () => {
    it('rotates webhook secret and verifies subsequent webhooks with new secret', async () => {
      const initialWebhookSecret = 'InitialSecretForWebhookTest_1';
      const rotatedWebhookSecret = 'RotatedSecretForWebhookTest_2';

      await saveGatewayConfig({
        environment: 'test',
        keyId: 'rzp_test_WebhookRotKey',
        keySecret: 'SecretKeyValRot',
        webhookSecret: initialWebhookSecret,
        adminUser: 'TVO Flavours Admin',
      });

      const payload = JSON.stringify({ event: 'payment.captured', id: 'evt_test_rot_1' });

      // Calculate HMAC with initial secret
      const initialSig = crypto
        .createHmac('sha256', initialWebhookSecret)
        .update(payload)
        .digest('hex');

      // Verification with initial secret works
      expect(verifyRazorpayWebhookSignature({ rawBody: payload, signature: initialSig }).valid).toBe(true);

      // Rotate secret via admin API
      const rotateReq = new Request('http://localhost/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          action: 'rotate_webhook',
          webhookSecret: rotatedWebhookSecret,
        }),
      });
      const rotateRes = await configPost(rotateReq);
      expect(rotateRes.status).toBe(200);

      // Old signature MUST now be rejected
      expect(verifyRazorpayWebhookSignature({ rawBody: payload, signature: initialSig }).valid).toBe(false);

      // New signature MUST succeed
      const newSig = crypto
        .createHmac('sha256', rotatedWebhookSecret)
        .update(payload)
        .digest('hex');
      expect(verifyRazorpayWebhookSignature({ rawBody: payload, signature: newSig }).valid).toBe(true);
    });
  });

  // =========================================================================
  // 10. Audit Logging
  // =========================================================================
  describe('10. Comprehensive Audit Logging for Payment Settings', () => {
    it('records audit log entries for config updates without secret leakage', async () => {
      const req = new Request('http://localhost/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          action: 'save_activate',
          environment: 'test',
          keyId: 'rzp_test_AuditLogKey123',
          keySecret: 'SuperSecretValToNeverAuditLog',
        }),
      });
      await configPost(req);

      const logs = db
        .prepare("SELECT * FROM audit_logs WHERE action='GATEWAY_CONFIG_SAVED' ORDER BY id DESC LIMIT 1")
        .all() as any[];

      expect(logs.length).toBe(1);
      expect(logs[0].details).not.toContain('SuperSecretValToNeverAuditLog');
      expect(logs[0].target_type).toBe('PaymentGateway');
    });
  });
});
