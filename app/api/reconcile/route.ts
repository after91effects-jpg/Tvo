import { NextResponse } from 'next/server';
import { getCurrentUser, isAdminRole } from '../../../lib/server/api';
import { analyzeCatalog } from '../../../lib/server/reconciler';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = getCurrentUser(req);
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
  }
  try {
    const report = analyzeCatalog();
    return NextResponse.json({ ok: true, report });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = getCurrentUser(req);
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (body.mode === 'apply') {
    try {
      const { applyCatalog } = await import('../../../lib/server/reconciler');
      const result = applyCatalog();
      return NextResponse.json({ ok: true, ...result });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: false, error: 'Use {"mode":"apply"} to run reconciliation' }, { status: 400 });
}