import { NextResponse } from 'next/server';
import { checkDbHealth } from '../../../../lib/server/db';
import { getFirebaseAdminAuth } from '../../../../lib/server/firebaseAdmin';
import { getCurrentUser, isAdminRole } from '../../../../lib/server/auth';
import { logInfo, logWarn, logError, withCorrelationId } from '../../../../lib/server/logger';
import { TIMEOUTS, withTimeout } from '../../../../lib/server/timeout';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const correlationId = withCorrelationId(req.headers.get('x-request-id'));
  const user = getCurrentUser(req);
  if (!user) {
    logWarn('health_ready_unauthenticated', 'Unauthenticated readiness check attempt', correlationId);
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }
  if (!isAdminRole(user.role)) {
    logWarn('health_ready_unauthorized', 'Unauthorized readiness check attempt', correlationId);
    return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
  }
  const start = Date.now();
  try {
    const dbHealth = await withTimeout(
      Promise.resolve(checkDbHealth()),
      TIMEOUTS.healthCheck,
      'db health check',
    );
    const fbAuth = getFirebaseAdminAuth();
    const ready = dbHealth.reachable && !!fbAuth;
    const elapsed = Date.now() - start;
    logInfo('health_ready_check', 'Readiness check completed', correlationId, { ready, elapsed, dbOk: dbHealth.reachable, firebaseOk: !!fbAuth });
    return NextResponse.json({
      ok: ready,
      status: ready ? 'ready' : 'not_ready',
      checks: {
        database: { ready: dbHealth.reachable, check: dbHealth.check },
        firebaseAdmin: { ready: !!fbAuth },
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      responseTime: { readiness: elapsed },
      correlationId,
    }, { status: ready ? 200 : 503 });
  } catch (e) {
    const elapsed = Date.now() - start;
    logError('health_ready_error', e instanceof Error ? e.message : String(e), correlationId);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
