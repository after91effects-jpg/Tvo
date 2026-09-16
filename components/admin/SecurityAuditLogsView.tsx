'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  CheckCircle,
  Lock,
  Key,
} from 'lucide-react';
import { AuditLogEntry } from '../../lib/types';

export const SecurityAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError('');
    fetch('/api/admin?type=audit_full')
      .then((res) => {
        if (!res.ok) throw new Error(`Could not fetch audit logs (${res.status})`);
        return res.json();
      })
      .then((data) => {
        const loaded: AuditLogEntry[] = (data.audit || []).map((d: any) => ({
          id: String(d.id),
          actorUid: String(d.user_id ?? d.actor_uid ?? ''),
          actorName: d.user_name || d.actor_name || '',
          actorEmail: d.actor_email || '',
          role: d.role,
          action: d.action,
          targetType: d.target_type || d.targetType || '',
          targetId: d.target_id || d.targetId || '',
          details: d.details || '',
          timestamp: d.created_at || d.timestamp || d.createdAt || '',
        }));
        loaded.sort(
          (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
        );
        setLogs(loaded);
        setIsLoading(false);
      })
      .catch((e) => {
        console.warn('Could not fetch audit logs:', e);
        setError(e?.message || 'Could not fetch audit logs.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchLogs(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    const action = (log.action || '').toUpperCase();
    const matchesAction = selectedAction === 'all' || action === selectedAction.toUpperCase();
    const matchesSearch =
      searchQuery === '' ||
      (log.actorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.actorEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.targetId || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesAction && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)]">
            Security & Audit Trail
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Immutable system logs, role-based access enforcement, and administrative activity tracking.
          </p>
        </div>
      </div>

      {/* Security Health Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Server-Side Auth',
            status: 'Enforced',
            desc: 'Role-based access enforced on admin API routes',
            icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
          },
          {
            title: 'EXIF Metadata Stripping',
            status: 'Active',
            desc: 'Privacy safeguard removes GPS and camera data',
            icon: <Lock className="w-5 h-5 text-emerald-500" />,
          },
          {
            title: 'Origin Verification',
            status: 'Active',
            desc: 'Server-side session & origin protection enforced',
            icon: <Key className="w-5 h-5 text-emerald-500" />,
          },
          {
            title: 'Audit Logging Engine',
            status: 'Live Recording',
            desc: `${logs.length} logged administrative events`,
            icon: <Activity className="w-5 h-5 text-emerald-500" />,
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex items-start gap-3"
          >
            <div className="p-2 rounded-xl bg-[var(--bg-subtle)] shrink-0">{item.icon}</div>
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">{item.title}</div>
              <div className="text-[11px] text-[var(--success)] font-semibold mt-0.5">
                {item.status}
              </div>
<div className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.desc}</div>
            {item.title === 'Audit Logging Engine' && <div className="text-[9px] text-[var(--text-subtle)] mt-1">{logs.length} loaded in view</div>}
          </div>
        </div>
      ))}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border)] shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 w-full sm:min-w-[220px] min-w-0">
          <Search className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs by actor, action, or target ID..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none font-medium"
        >
          <option value="all">All Actions</option>
          <option value="ADMIN_LOGIN_SUCCESS">ADMIN_LOGIN_SUCCESS</option>
          <option value="ORDER_CREATE">ORDER_CREATE</option>
          <option value="ORDER_STATUS_ADVANCE">ORDER_STATUS_ADVANCE</option>
          <option value="ORDER_STATUS_UPDATE">ORDER_STATUS_UPDATE</option>
          <option value="ORDER_BULK_STATUS_UPDATE">ORDER_BULK_STATUS_UPDATE</option>
          <option value="PRODUCT_CREATE">PRODUCT_CREATE</option>
          <option value="PRODUCT_UPDATE">PRODUCT_UPDATE</option>
          <option value="PRODUCT_DELETE">PRODUCT_DELETE</option>
          <option value="PRODUCT_DUPLICATE">PRODUCT_DUPLICATE</option>
          <option value="PRODUCT_BULK_IMPORT">PRODUCT_BULK_IMPORT</option>
          <option value="CSV_IMPORT_WOOCOMMERCE">CSV_IMPORT_WOOCOMMERCE</option>
          <option value="CSV_EXPORT_WOOCOMMERCE">CSV_EXPORT_WOOCOMMERCE</option>
          <option value="MEDIA_UPLOAD_OPTIMIZE">MEDIA_UPLOAD_OPTIMIZE</option>
          <option value="MEDIA_DELETE">MEDIA_DELETE</option>
          <option value="SETTINGS_UPDATE">SETTINGS_UPDATE</option>
          <option value="HAMPERS_SAVE">HAMPERS_SAVE</option>
          <option value="ADMIN_USERS">ADMIN_USERS</option>
        </select>
      </div>

      {/* Audit Log Stream Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-subtle)]/70 text-[var(--text-subtle)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                <th className="py-3.5 px-4 font-semibold">Actor / Chef</th>
                <th className="py-3.5 px-4 font-semibold">Action</th>
                <th className="py-3.5 px-4 font-semibold">Target</th>
                <th className="py-3.5 px-4 font-semibold">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)] font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[var(--text-muted)] font-sans">
                    Loading audit logs...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[var(--danger)] font-sans">
                    {error}
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[var(--text-muted)] font-sans">
                    No security audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                    <td className="py-3 px-4 text-[var(--text-muted)] shrink-0 whitespace-nowrap">
                      {(() => {
                        const raw = (log.timestamp || '').replace(' ', 'T');
                        const parsed = new Date(raw);
                        if (isNaN(parsed.getTime())) return log.timestamp || '—';
                        return parsed.toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        });
                      })()}
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-[var(--text-main)]">
                      {log.actorName || log.actorEmail || 'System / Anonymous'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[var(--primary-light)] text-[var(--primary)] font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">
                      {log.targetType} {log.targetId ? `(${log.targetId})` : ''}
                    </td>
                    <td className="py-3 px-4 font-sans text-xs text-[var(--text-main)]">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
