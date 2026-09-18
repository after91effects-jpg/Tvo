import { ok, err, requireAdmin, logAudit } from '../../../../../../lib/server/api';
import { hasPermission } from '../../../../../../lib/server/permissions';
import {
  getSafeConfigStatus,
  saveGatewayConfig,
  setGatewayActiveStatus,
  rotateWebhookSecret,
} from '../../../../../../lib/server/razorpay';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = requireAdmin(req);
  if (!user) {
    return err('Unauthorized: Authentication required', 401);
  }
  if (!hasPermission(user.role, 'view_payments') && user.role !== 'super_admin' && user.role !== 'admin') {
    return err('Forbidden: view_payments permission required', 403);
  }

  const safeConfig = getSafeConfigStatus();
  return ok({
    provider: 'razorpay',
    config: safeConfig,
  });
}

export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) {
    return err('Unauthorized: Authentication required', 401);
  }
  if (!hasPermission(user.role, 'manage_payment_settings') && user.role !== 'super_admin' && user.role !== 'admin') {
    return err('Forbidden: manage_payment_settings permission required', 403);
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action || 'save_activate';

  try {
    // -------------------------------------------------------------------------
    // 1. SAVE & ACTIVATE CREDENTIALS
    // -------------------------------------------------------------------------
    if (action === 'save_activate' || action === 'save') {
      const environment = body.environment === 'live' ? 'live' : 'test';
      const keyId = String(body.keyId || '').trim();
      const keySecret = String(body.keySecret || '').trim();
      const webhookSecret = body.webhookSecret ? String(body.webhookSecret).trim() : undefined;
      const confirmedLive = Boolean(body.confirmedLive);

      if (environment === 'live' && !confirmedLive) {
        return err('Explicit confirmation is required before activating Live Mode payments.', 400);
      }

      if (!keyId || !keySecret) {
        return err('Razorpay Key ID and Key Secret are required.', 400);
      }

      const saveResult = await saveGatewayConfig({
        environment,
        keyId,
        keySecret,
        webhookSecret,
        adminUser: user.name || user.email || 'Admin',
      });

      if (!saveResult.ok) {
        logAudit(user, 'GATEWAY_CONFIG_SAVE_FAIL', 'PaymentGateway', environment, saveResult.error);
        return err(saveResult.error || 'Failed to validate and save gateway configuration', 400);
      }

      logAudit(
        user,
        'GATEWAY_CONFIG_SAVED',
        'PaymentGateway',
        environment,
        `Active credentials updated for environment: ${environment.toUpperCase()}`
      );

      return ok({
        ok: true,
        success: true,
        message: `Razorpay ${environment.toUpperCase()} mode configuration saved and activated.`,
        config: saveResult.config,
        testResult: saveResult.testResult,
      });
    }

    // -------------------------------------------------------------------------
    // 2. DISABLE PAYMENT GATEWAY
    // -------------------------------------------------------------------------
    if (action === 'disable') {
      const res = setGatewayActiveStatus(false, user.name || user.email || 'Admin');
      logAudit(user, 'GATEWAY_DISABLED', 'PaymentGateway', 'Razorpay', 'Admin paused online payments');
      return ok({
        ok: true,
        success: true,
        message: 'Razorpay payment gateway has been disabled. Online payments are now paused.',
        config: res.config,
      });
    }

    // -------------------------------------------------------------------------
    // 3. ENABLE PAYMENT GATEWAY
    // -------------------------------------------------------------------------
    if (action === 'enable') {
      const res = setGatewayActiveStatus(true, user.name || user.email || 'Admin');
      logAudit(user, 'GATEWAY_ENABLED', 'PaymentGateway', 'Razorpay', 'Admin resumed online payments');
      return ok({
        ok: true,
        success: true,
        message: 'Razorpay payment gateway has been enabled.',
        config: res.config,
      });
    }

    // -------------------------------------------------------------------------
    // 4. ROTATE WEBHOOK SECRET ONLY
    // -------------------------------------------------------------------------
    if (action === 'rotate_webhook') {
      const newSecret = String(body.webhookSecret || '').trim();
      if (!newSecret || newSecret.length < 6) {
        return err('New webhook secret must be at least 6 characters.', 400);
      }

      const rot = rotateWebhookSecret(newSecret, user.name || user.email || 'Admin');
      if (!rot.ok) {
        return err(rot.error || 'Failed to rotate webhook secret', 400);
      }

      logAudit(user, 'GATEWAY_WEBHOOK_ROTATED', 'PaymentGateway', 'Webhook', 'Webhook secret updated');
      return ok({
        ok: true,
        success: true,
        message: 'Webhook secret updated successfully.',
        config: getSafeConfigStatus(),
      });
    }

    return err('Unknown configuration action', 400);
  } catch (e: any) {
    console.error('Payment Config Action Exception:', e);
    return err(e?.message || 'Server error processing payment configuration action', 500);
  }
}
