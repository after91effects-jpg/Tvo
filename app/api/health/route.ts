import { NextResponse } from 'next/server';
import { checkDbHealth } from '../../../lib/server/db';
import { getFirebaseAdminAuth } from '../../../lib/server/firebaseAdmin';
import { getCurrentUser, isAdminRole } from '../../../lib/server/auth';
import { logInfo, logWarn, logError, withCorrelationId } from '../../../lib/server/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const correlationId = withCorrelationId(req.headers.get('x-request-id'));
  const user = getCurrentUser(req);
  if (!user) {
    logWarn('health_unauthenticated', 'Unauthenticated health check attempt', correlationId, { ip: req.headers.get('x-forwarded-for') || 'unknown' });
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }
  if (!isAdminRole(user.role)) {
    logWarn('health_unauthorized', 'Unauthorized health check attempt', correlationId, { ip: req.headers.get('x-forwarded-for') || 'unknown' });
    return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
  }
  const start = Date.now();
  try {
    const dbHealth = checkDbHealth();
    const fbAuth = getFirebaseAdminAuth();
    const elapsed = Date.now() - start;
    logInfo('health_check', 'Health check completed', correlationId, { elapsed, dbOk: dbHealth.reachable, firebaseOk: !!fbAuth });
    return NextResponse.json({
      ok: true,
      db: { reachable: dbHealth.reachable, check: dbHealth.check },
      firebase: { adminAuth: !!fbAuth },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      responseTime: { health: elapsed },
      correlationId,
    }, { status: 200 });
  } catch (e) {
    const elapsed = Date.now() - start;
    logError('health_check_error', e instanceof Error ? e.message : String(e), correlationId);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
