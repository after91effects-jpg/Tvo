import { ok, err, requireAdmin, logAudit } from '../../../../../../lib/server/api';
import { hasPermission } from '../../../../../../lib/server/permissions';
import { testRazorpayConnection } from '../../../../../../lib/server/razorpay';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) {
    return err('Unauthorized: Authentication required', 401);
  }
  if (!hasPermission(user.role, 'view_payments') && !hasPermission(user.role, 'manage_payment_settings') && user.role !== 'super_admin' && user.role !== 'admin') {
    return err('Forbidden: view_payments or manage_payment_settings required', 403);
  }

  const body = await req.json().catch(() => ({}));

  try {
    const creds = body.keyId && body.keySecret ? {
      keyId: String(body.keyId).trim(),
      keySecret: String(body.keySecret).trim(),
      environment: body.environment === 'live' ? ('live' as const) : ('test' as const),
    } : undefined;

    const result = await testRazorpayConnection(creds);

    logAudit(
      user,
      'GATEWAY_CONNECTION_TEST',
      'PaymentGateway',
      result.mode,
      `Status: ${result.status}, Latency: ${result.latencyMs}ms`
    );

    return ok(result);
  } catch (e: any) {
    return err(e?.message || 'Connection test failed', 500);
  }
}
