'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Shield,
  Clock,
  Wifi,
  WifiOff,
  Loader2,
  Globe,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HealthData {
  ok: boolean;
  db: { reachable: boolean; check?: string };
  firebase: { adminAuth: boolean };
  environment: string;
  timestamp: string;
  responseTime?: { health?: number };
  correlationId?: string;
}

interface ReadyData {
  ok: boolean;
  status: string;
  checks: {
    database: { ready: boolean; check: string };
    firebaseAdmin: { ready: boolean };
  };
  environment: string;
  timestamp: string;
  responseTime?: { readiness?: number };
  correlationId?: string;
}

const ENV_COLORS: Record<string, string> = {
  production: 'var(--success)',
  staging: 'var(--primary)',
  development: 'var(--warning)',
  test: 'var(--warning)',
};

export const SystemHealthView: React.FC = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [readyData, setReadyData] = useState<ReadyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setHealthData(null);
      setReadyData(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const [healthRes, readyRes] = await Promise.all([
        fetch('/api/health', { signal: controller.signal }),
        fetch('/api/health/ready', { signal: controller.signal }),
      ]);
      clearTimeout(timeoutId);
      const healthJson = await healthRes.json().catch(() => null);
      const readyJson = await readyRes.json().catch(() => null);

      let fetchError: string | null = null;
      if (healthRes.ok && healthJson?.ok !== undefined) {
        setHealthData(healthJson as HealthData);
      } else {
        fetchError = (healthJson as any)?.error || `Health endpoint returned ${healthRes.status}`;
        setHealthData(null);
      }
      if (readyRes.ok && readyJson?.ok !== undefined) {
        setReadyData(readyJson as ReadyData);
      } else {
        fetchError = fetchError || (readyJson as any)?.error || `Readiness endpoint returned ${readyRes.status}`;
        setReadyData(null);
      }
      if (fetchError) setError(fetchError);

      setLastCheck(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error && e.name === 'AbortError'
        ? 'Health check timed out — please try again'
        : e instanceof Error ? e.message : 'Health check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <XCircle className="w-12 h-12 text-[var(--danger)] mb-4" />
        <h2 className="text-lg font-bold text-[var(--text-main)] mb-2">Access Restricted</h2>
        <p className="text-sm text-[var(--text-muted)]">Admin access required to view System Health.</p>
      </div>
    );
  }

  const isReady = readyData?.ok ?? false;
  const isHealthy = healthData?.ok ?? false;
  const dbOk = healthData?.db?.reachable ?? false;
  const fbOk = healthData?.firebase?.adminAuth ?? false;
  const env = healthData?.environment || 'unknown';
  const responseTime = healthData?.responseTime?.health ?? readyData?.responseTime?.readiness;
  const correlationId = healthData?.correlationId || readyData?.correlationId;

  const overallStatus = isHealthy && isReady ? 'healthy' : (!isHealthy || !isReady) && dbOk && fbOk ? 'degraded' : 'unhealthy';
  const statusColor = overallStatus === 'healthy' ? 'var(--success)' : overallStatus === 'degraded' ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-[var(--text-main)]">System Health</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Application status, database health, and service availability</p>
        </div>
        <button
          type="button"
          id="health-refresh-btn"
          onClick={checkHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-xl hover:opacity-90 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-[var(--danger-light)] border border-[var(--danger)] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[var(--danger)]">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-semibold">Health check failed</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">{error}</p>
        </div>
      )}

      {loading && !healthData && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin mb-4" />
          <p className="text-sm text-[var(--text-muted)]">Checking system health...</p>
        </div>
      )}

      {healthData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`bg-[var(--bg-surface)] border rounded-2xl p-4`} style={{ borderColor: statusColor }}>
              <div className="flex items-center gap-2 mb-2">
                {overallStatus === 'healthy' ? <CheckCircle className="w-4 h-4" style={{ color: statusColor }} /> : <XCircle className="w-4 h-4" style={{ color: statusColor }} />}
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Overall Status</span>
              </div>
              <div className="text-2xl font-bold text-[var(--text-main)] capitalize">{overallStatus}</div>
            </div>
            <div className={`bg-[var(--bg-surface)] border rounded-2xl p-4`} style={{ borderColor: dbOk ? 'var(--success)' : 'var(--danger)' }}>
              <div className="flex items-center gap-2 mb-2">
                {dbOk ? <CheckCircle className="w-4 h-4 text-[var(--success)]" /> : <XCircle className="w-4 h-4 text-[var(--danger)]" />}
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Database</span>
              </div>
              <div className="text-2xl font-bold text-[var(--text-main)]">{dbOk ? 'Connected' : 'Disconnected'}</div>
            </div>
            <div className={`bg-[var(--bg-surface)] border rounded-2xl p-4`} style={{ borderColor: fbOk ? 'var(--success)' : 'var(--warning)' }}>
              <div className="flex items-center gap-2 mb-2">
                {fbOk ? <CheckCircle className="w-4 h-4 text-[var(--success)]" /> : <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />}
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Firebase Auth</span>
              </div>
              <div className="text-2xl font-bold text-[var(--text-main)]">{fbOk ? 'Ready' : 'Unavailable'}</div>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-[var(--primary)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Environment</span>
              </div>
              <div className="text-2xl font-bold text-[var(--text-main)] capitalize">{env}</div>
            </div>
          </div>

          {responseTime !== undefined && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-main)]">Response Time</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text-main)]">{responseTime}ms</span>
              </div>
            </div>
          )}

          {correlationId && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-main)]">Correlation ID</span>
                </div>
                <span className="text-xs font-mono text-[var(--text-muted)] truncate max-w-[200px]">{correlationId}</span>
              </div>
            </div>
          )}

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--text-main)]">Detailed Checks</h2>
              {lastCheck && (
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  <Clock className="w-3 h-3" />
                  <span>Last check: {new Date(lastCheck).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-xl">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-main)]">Database Reachability</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dbOk ? 'bg-[var(--success-light)] text-[var(--success)]' : 'bg-[var(--danger-light)] text-[var(--danger)]'}`}>
                  {dbOk ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-xl">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-main)]">Firebase Admin SDK</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${fbOk ? 'bg-[var(--success-light)] text-[var(--success)]' : 'bg-[var(--warning-light)] text-[var(--warning)]'}`}>
                  {fbOk ? 'PASS' : 'WARN'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-xl">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-main)]">API Response</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isHealthy ? 'bg-[var(--success-light)] text-[var(--success)]' : 'bg-[var(--danger-light)] text-[var(--danger)]'}`}>
                  {isHealthy ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-xl">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-main)]">Auth System</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isAdmin ? 'bg-[var(--success-light)] text-[var(--success)]' : 'bg-[var(--danger-light)] text-[var(--danger)]'}`}>
                  {isAdmin ? 'RUNNING' : 'STOPPED'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-xl">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-main)]">Readiness</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isReady ? 'bg-[var(--success-light)] text-[var(--success)]' : 'bg-[var(--danger-light)] text-[var(--danger)]'}`}>
                  {isReady ? 'READY' : 'NOT READY'}
                </span>
              </div>
            </div>
          </div>

          {readyData && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
              <h2 className="text-sm font-bold text-[var(--text-main)] mb-3">Readiness Details</h2>
              <div className="space-y-2 text-xs text-[var(--text-muted)]">
                <div className="flex justify-between">
                  <span>Database Check</span>
                  <span className="text-[var(--text-main)]">{readyData.checks?.database?.check ?? 'unavailable'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Firebase Admin</span>
                  <span className="text-[var(--text-main)]">{readyData.checks?.firebaseAdmin?.ready ? 'Configured' : 'Not Configured'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overall Status</span>
                  <span className={isReady ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{readyData.status ?? 'unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Environment</span>
                  <span className="text-[var(--text-main)] capitalize">{readyData.environment ?? 'unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp</span>
                  <span className="text-[var(--text-main)]">{readyData.timestamp ? new Date(readyData.timestamp).toISOString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">Health checks auto-refresh every 30 seconds</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <Activity className="w-3 h-3" />
                <span>Last error: {error ? 'Yes' : 'None'}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};