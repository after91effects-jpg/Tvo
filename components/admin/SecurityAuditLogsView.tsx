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

  const fetchLogs = (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    fetch('/api/admin?type=audit_full')
      .then((res) => res.json())
      .then((data) => {
        const loaded: AuditLogEntry[] = (data.audit || []).map((d: any) => ({
          id: String(d.id),
          actorUid: d.actor_uid || d.actorUid,
          actorName: d.actor_name || d.actorName,
          actorEmail: d.actor_email || d.actorEmail,
          role: d.role,
          action: d.action,
          targetType: d.target_type || d.targetType,
          targetId: d.target_id || d.targetId,
          details: d.details,
          timestamp: d.timestamp,
        }));
        loaded.sort(
          (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
        );
        setLogs(loaded);
        setIsLoading(false);
      })
      .catch((e) => {
        console.warn('Could not fetch audit logs:', e);
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
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    const matchesSearch =
      searchQuery === '' ||
      log.actorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetId?.toLowerCase().includes(searchQuery.toLowerCase());

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
            title: 'Firestore Security Rules',
            status: 'Enforced',
            desc: 'Role-based rules for admin vs customer access',
            icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
          },
          {
            title: 'EXIF Metadata Stripping',
            status: 'Active',
            desc: 'Privacy safeguard removes GPS and camera data',
            icon: <Lock className="w-5 h-5 text-emerald-500" />,
          },
          {
            title: 'CSRF & Origin Protection',
            status: 'Active',
            desc: 'Cross-site request forgery defense active',
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
            </div>
          </div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border)] shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
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
          <option value="ORDER_STATUS_ADVANCE">ORDER_STATUS_ADVANCE</option>
          <option value="PRODUCT_CREATE">PRODUCT_CREATE</option>
          <option value="PRODUCT_UPDATE">PRODUCT_UPDATE</option>
          <option value="PRODUCT_DELETE">PRODUCT_DELETE</option>
          <option value="CSV_IMPORT_WOOCOMMERCE">CSV_IMPORT_WOOCOMMERCE</option>
          <option value="CSV_EXPORT_WOOCOMMERCE">CSV_EXPORT_WOOCOMMERCE</option>
          <option value="MEDIA_UPLOAD_OPTIMIZE">MEDIA_UPLOAD_OPTIMIZE</option>
          <option value="DATABASE_SEED">DATABASE_SEED</option>
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
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[var(--text-muted)] font-sans">
                    No security audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                    <td className="py-3 px-4 text-[var(--text-muted)] shrink-0">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
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
