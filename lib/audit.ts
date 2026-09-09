import { AuditLog } from './types';

export async function logAuditEvent(params: {
  actorUid?: string;
  actorName?: string;
  actorEmail?: string;
  role?: 'admin' | 'staff' | 'system' | 'customer';
  action: string;
  targetType: 'Product' | 'Order' | 'Media' | 'Settings' | 'Security' | 'Auth' | 'Catalog' | string;
  targetId?: string;
  details: string;
}): Promise<void> {
  try {
    const auditData = {
      actorUid: params.actorUid || 'system',
      actorName: params.actorName || 'System',
      actorEmail: params.actorEmail || '',
      role: params.role || 'system',
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId || '',
      details: params.details,
      timestamp: new Date().toISOString(),
    };

    await fetch('/api/admin/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditData),
    });
  } catch (error) {
    console.warn('Failed to record audit log:', error);
  }
}
