'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  Download,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Lock,
  Power,
  SlidersHorizontal,
  ChevronRight,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  X,
  FileSpreadsheet,
  Check,
  HelpCircle,
} from 'lucide-react';

type SubTab = 'overview' | 'transactions' | 'refunds' | 'settlements' | 'reconciliation' | 'analytics' | 'webhooks' | 'settings';

export const PaymentDashboardView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Transactions Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [refundFilter, setRefundFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Selected Transaction for Detail Modal
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Refund Modal State
  const [refundTargetTx, setRefundTargetTx] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('Customer Request');
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);

  // Test API State
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<any | null>(null);

  // Gateway Configuration Form State
  const [configEnv, setConfigEnv] = useState<'test' | 'live'>('test');
  const [configKeyId, setConfigKeyId] = useState('');
  const [configKeySecret, setConfigKeySecret] = useState('');
  const [configWebhookSecret, setConfigWebhookSecret] = useState('');
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live Mode Safeguard State
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveConfirmCheckbox, setLiveConfirmCheckbox] = useState(false);

  // Disable Gateway Modal State
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [isTogglingGateway, setIsTogglingGateway] = useState(false);

  // Rotate Webhook Modal State
  const [showWebhookRotateModal, setShowWebhookRotateModal] = useState(false);
  const [rotateWebhookVal, setRotateWebhookVal] = useState('');
  const [isRotatingWebhook, setIsRotatingWebhook] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (methodFilter !== 'all') params.set('method', methodFilter);
      if (refundFilter !== 'all') params.set('refund_status', refundFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      params.set('page', String(page));
      params.set('limit', '50');

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e: any) {
      setError(e.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, methodFilter, refundFilter, startDate, endDate, page]);

  const handleTriggerRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTargetTx) return;

    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      setRefundError('Please enter a valid refund amount');
      return;
    }

    setIsRefunding(true);
    setRefundError(null);
    setRefundSuccess(null);

    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refund',
          paymentId: refundTargetTx.id,
          amount: amt,
          reason: refundReason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Refund initiation failed');
      }

      setRefundSuccess(`Refund of ₹${amt.toFixed(2)} processed successfully!`);
      setTimeout(() => {
        setRefundTargetTx(null);
        setRefundSuccess(null);
        fetchData();
      }, 1500);
    } catch (e: any) {
      setRefundError(e.message || 'Error processing refund');
    } finally {
      setIsRefunding(false);
    }
  };

  const handleTestApiConnection = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);
    try {
      const res = await fetch('/api/admin/payments/razorpay/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId: configKeyId ? configKeyId.trim() : undefined,
          keySecret: configKeySecret ? configKeySecret.trim() : undefined,
          environment: configEnv,
        }),
      });
      const json = await res.json();
      setApiTestResult(json);
    } catch (e: any) {
      setApiTestResult({ ok: false, message: e.message || 'API test request failed' });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleSaveGatewayConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!configKeyId.trim() || !configKeySecret.trim()) {
      setConfigFeedback({ type: 'error', text: 'Razorpay Key ID and Key Secret are required.' });
      return;
    }

    if (configEnv === 'live' && !liveConfirmCheckbox) {
      setShowLiveModal(true);
      return;
    }

    setIsSavingConfig(true);
    setConfigFeedback(null);

    try {
      const res = await fetch('/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_activate',
          environment: configEnv,
          keyId: configKeyId.trim(),
          keySecret: configKeySecret.trim(),
          webhookSecret: configWebhookSecret.trim() || undefined,
          confirmedLive: liveConfirmCheckbox,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save gateway configuration');
      }

      setConfigFeedback({ type: 'success', text: json.message || 'Configuration saved and activated successfully!' });
      setShowLiveModal(false);
      setLiveConfirmCheckbox(false);
      setConfigKeySecret(''); // Clear plain secret from memory
      setConfigWebhookSecret('');
      fetchData();
    } catch (err: any) {
      setConfigFeedback({ type: 'error', text: err.message || 'Error saving gateway configuration' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleToggleGateway = async (enable: boolean) => {
    setIsTogglingGateway(true);
    try {
      const res = await fetch('/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: enable ? 'enable' : 'disable' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to toggle gateway');
      setShowDisableModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle gateway status');
    } finally {
      setIsTogglingGateway(false);
    }
  };

  const handleRotateWebhookSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotateWebhookVal.trim() || rotateWebhookVal.trim().length < 6) {
      alert('Webhook secret must be at least 6 characters.');
      return;
    }

    setIsRotatingWebhook(true);
    try {
      const res = await fetch('/api/admin/payments/razorpay/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate_webhook', webhookSecret: rotateWebhookVal.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update webhook secret');
      setShowWebhookRotateModal(false);
      setRotateWebhookVal('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error rotating webhook secret');
    } finally {
      setIsRotatingWebhook(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = 'https://blanchedalmond-leopard-910858.hostingersite.com/api/payments/razorpay/webhook';
    navigator.clipboard.writeText(url).then(() => {
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2000);
    });
  };

  const exportTransactionsToCsv = () => {
    if (!data?.transactions?.items || data.transactions.items.length === 0) return;

    const headers = [
      'Date',
      'TVO Order ID',
      'Razorpay Order ID',
      'Razorpay Payment ID',
      'Customer',
      'Amount (INR)',
      'Method',
      'Payment Status',
      'Refund Status',
      'Refunded Amount (INR)',
      'Verification Status',
      'Gateway',
    ];

    const rows = data.transactions.items.map((tx: any) => [
      tx.created_at || '',
      tx.order_number || '',
      tx.razorpay_order_id || '',
      tx.razorpay_payment_id || '',
      `"${(tx.customer_name || '').replace(/"/g, '""')}"`,
      tx.amount || 0,
      tx.method || 'UPI',
      tx.status || '',
      tx.refund_status || 'none',
      tx.refunded_amount || 0,
      tx.verification_status || 'unverified',
      tx.gateway || 'Razorpay',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tvo_payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpi = data?.kpi || {
    totalAttempts: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    refundedPayments: 0,
    totalSuccessfulAmount: 0,
    totalRefundedAmount: 0,
    netOrderPaymentAmount: 0,
    todaySuccessfulPayments: 0,
    todayFailedPayments: 0,
  };

  const config = data?.config || {
    configured: false,
    mode: 'SANDBOX',
    keyIdPresent: false,
    keyIdMasked: 'Not Set',
    keySecretPresent: false,
    webhookSecretPresent: false,
    webhookUrl: '/api/payments/razorpay/webhook',
  };

  const webhookHealth = data?.webhookHealth || {
    status: 'NOT CONFIGURED',
    totalReceived: 0,
    successfulVerifications: 0,
    failedWebhooks: 0,
    lastReceivedEvent: 'None',
    lastEventTime: null,
    recentEvents: [],
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ------------------------------------------------------------------- */}
      {/* 1. TOP HEADER & OPERATIONAL HEALTH BAR                              */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-main)]">
                TVO Flavours Payments
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Authoritative Razorpay payment gateway orchestration, refunds & settlements ledger
              </p>
            </div>
          </div>
        </div>

        {/* Operational Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Connection Status */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] border border-[var(--border)]">
            <span className="text-[var(--text-muted)]">Gateway:</span>
            {config.configured ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                CONNECTED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                TEST / SANDBOX
              </span>
            )}
          </div>

          {/* Environment */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] border border-[var(--border)]">
            <span className="text-[var(--text-muted)]">Environment:</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
              config.mode === 'LIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
            }`}>
              {config.mode}
            </span>
          </div>

          {/* Webhook Health */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] border border-[var(--border)]">
            <span className="text-[var(--text-muted)]">Webhook:</span>
            <span className={`font-bold ${
              webhookHealth.status === 'HEALTHY' ? 'text-emerald-600' : (webhookHealth.status === 'WARNING' ? 'text-amber-600' : 'text-slate-500')
            }`}>
              {webhookHealth.status}
            </span>
          </div>

          {/* Processing Status */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] border border-[var(--border)]">
            <span className="text-[var(--text-muted)]">Processing:</span>
            {config.isActive !== false ? (
              <span className="text-emerald-600 font-bold">ACTIVE</span>
            ) : (
              <span className="text-rose-600 font-bold">DISABLED</span>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] transition-colors cursor-pointer"
            title="Refresh payment metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Prominent Live Mode Alert Banner */}
      {config.mode === 'LIVE' && config.isActive !== false && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400 font-bold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-extrabold uppercase tracking-wide">Live Payments Enabled:</span> Customers will be charged real money through their credit cards or UPI.
            </div>
          </div>
          <button
            onClick={() => setShowDisableModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors shadow-xs"
          >
            Pause Online Payments
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 2. SUBTABS NAVIGATION                                               */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] pb-1 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'transactions', label: 'Transactions', icon: Layers },
          { id: 'refunds', label: 'Refunds', icon: RotateCcw },
          { id: 'settlements', label: 'Settlements', icon: ArrowDownLeft },
          { id: 'reconciliation', label: 'Reconciliation', icon: ShieldCheck },
          { id: 'analytics', label: 'Payment Analytics', icon: TrendingUp },
          { id: 'webhooks', label: 'Webhooks', icon: ArrowUpRight },
          { id: 'settings', label: 'Payment Settings', icon: SlidersHorizontal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchData} className="underline font-bold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUBTAB CONTENT: OVERVIEW                                            */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* 10 KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Total Attempts */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
                <span>Total Attempts</span>
                <Layers className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-xl font-bold text-[var(--text-main)]">{kpi.totalAttempts}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">All initiated payment intents</div>
            </div>

            {/* 2. Successful Payments */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
                <span>Successful Payments</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-emerald-600">{kpi.successfulPayments}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">Verified & captured</div>
            </div>

            {/* 3. Failed Payments */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
                <span>Failed Payments</span>
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-xl font-bold text-rose-600">{kpi.failedPayments}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">Declined or error</div>
            </div>

            {/* 4. Pending Payments */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
                <span>Pending Payments</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-bold text-amber-600">{kpi.pendingPayments}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">Awaiting authorization</div>
            </div>

            {/* 5. Refunded Payments */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
                <span>Refunded Payments</span>
                <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-xl font-bold text-purple-600">{kpi.refundedPayments}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">Full & partial refunds</div>
            </div>

            {/* 6. Total Successful Amount */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
                <span>Successful Volume</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-emerald-600">₹{kpi.totalSuccessfulAmount.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">Gross paid amount</div>
            </div>

            {/* 7. Total Refunded Amount */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
                <span>Refunded Volume</span>
                <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-xl font-bold text-purple-600">₹{kpi.totalRefundedAmount.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">Disbursed refunds</div>
            </div>

            {/* 8. Net Order Payment Amount */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
                <span>Net Payment Volume</span>
                <CreditCard className="w-3.5 h-3.5 text-[var(--primary)]" />
              </div>
              <div className="text-xl font-bold text-[var(--primary)]">₹{kpi.netOrderPaymentAmount.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">Successful minus refunds</div>
            </div>

            {/* 9. Today's Successful Payments */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
                <span>Today's Successful</span>
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-bold text-emerald-600">{kpi.todaySuccessfulPayments}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">Captured today</div>
            </div>

            {/* 10. Today's Failed Payments */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center justify-between">
                <span>Today's Failed</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-xl font-bold text-rose-600">{kpi.todayFailedPayments}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">Failed today</div>
            </div>
          </div>

          {/* PAYMENT STATUS DISTRIBUTION BREAKDOWN */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">Payment Status Distribution</h2>
                <p className="text-xs text-[var(--text-muted)]">Authoritative gateway state lifecycle</p>
              </div>
              <div className="text-xs text-[var(--text-subtle)] font-medium">
                Last updated: {lastSyncTime || 'Just now'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
              {[
                { label: 'Created', count: data?.distribution?.Created || 0, color: 'text-slate-600', bg: 'bg-slate-500/10' },
                { label: 'Pending', count: data?.distribution?.Pending || 0, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                { label: 'Authorized', count: data?.distribution?.Authorized || 0, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                { label: 'Captured', count: data?.distribution?.Captured || 0, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                { label: 'Failed', count: data?.distribution?.Failed || 0, color: 'text-rose-600', bg: 'bg-rose-500/10' },
                { label: 'Refunded', count: data?.distribution?.Refunded || 0, color: 'text-purple-600', bg: 'bg-purple-500/10' },
                { label: 'Partially Refunded', count: data?.distribution?.PartiallyRefunded || 0, color: 'text-violet-600', bg: 'bg-violet-500/10' },
              ].map((item) => (
                <div key={item.label} className={`p-3 rounded-xl border border-[var(--border)] ${item.bg} text-center space-y-1`}>
                  <div className={`text-lg font-bold ${item.color}`}>{item.count}</div>
                  <div className="text-[11px] font-semibold text-[var(--text-muted)]">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* QUICK ACTIONS & RECENT ACTIVITY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Payment Verification & Security Policy</span>
              </h3>
              <ul className="text-xs text-[var(--text-muted)] space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Authoritative Pricing:</strong> All payable amounts are strictly calculated server-side. Zero client-side total injection.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>HMAC-SHA256 Signatures:</strong> Every payment callback verified with server secret before marking Paid.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Idempotent Webhooks:</strong> Event ID deduplication prevents double-crediting or duplicate processing.</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span>Gateway Diagnostics</span>
              </h3>
              <div className="text-xs text-[var(--text-muted)] space-y-2">
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span>API Connection:</span>
                  <span className="font-bold text-[var(--text-main)]">{config.configured ? 'Configured (Active)' : 'Sandbox Mode'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span>Public Key ID:</span>
                  <span className="font-mono text-[var(--text-main)]">{config.keyIdMasked}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span>Webhook Health:</span>
                  <span className="font-bold text-emerald-600">{webhookHealth.status} ({webhookHealth.totalReceived} events)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUBTAB CONTENT: TRANSACTIONS                                        */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS BAR */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by TVO Order ID, Razorpay IDs, Customer name or email..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* CSV Export */}
              <button
                onClick={exportTransactionsToCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border)] text-[var(--text-main)] border border-[var(--border)] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)] text-xs">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium">
                <Filter className="w-3.5 h-3.5" />
                <span>Filters:</span>
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] font-medium focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Paid">Paid (Captured)</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Authorized">Authorized</option>
              </select>

              {/* Method filter */}
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] font-medium focus:outline-none"
              >
                <option value="all">All Methods</option>
                <option value="UPI">UPI</option>
                <option value="card">Card</option>
                <option value="netbanking">Netbanking</option>
                <option value="wallet">Wallet</option>
              </select>

              {/* Refund status filter */}
              <select
                value={refundFilter}
                onChange={(e) => setRefundFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] font-medium focus:outline-none"
              >
                <option value="all">All Refund States</option>
                <option value="none">No Refund</option>
                <option value="partial">Partially Refunded</option>
                <option value="full">Fully Refunded</option>
              </select>

              {/* Date pickers */}
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] font-medium focus:outline-none"
                title="Start date"
              />
              <span className="text-[var(--text-muted)]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] font-medium focus:outline-none"
                title="End date"
              />

              {(statusFilter !== 'all' || methodFilter !== 'all' || refundFilter !== 'all' || startDate || endDate || search) && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setMethodFilter('all');
                    setRefundFilter('all');
                    setStartDate('');
                    setEndDate('');
                    setSearch('');
                  }}
                  className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer ml-auto"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* TRANSACTIONS TABLE */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-subtle)]/70 text-[var(--text-subtle)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                    <th className="py-3.5 px-4 font-semibold">TVO Order ID</th>
                    <th className="py-3.5 px-4 font-semibold">Razorpay Order ID</th>
                    <th className="py-3.5 px-4 font-semibold">Razorpay Payment ID</th>
                    <th className="py-3.5 px-4 font-semibold">Customer</th>
                    <th className="py-3.5 px-4 font-semibold">Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Method</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Refund Status</th>
                    <th className="py-3.5 px-4 font-semibold">Verification</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)]">
                  {!data?.transactions?.items || data.transactions.items.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No transactions found matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    data.transactions.items.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          {tx.created_at ? new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--primary)] whitespace-nowrap">
                          {tx.order_number || `#${tx.order_id}`}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          {tx.razorpay_order_id ? tx.razorpay_order_id.slice(0, 16) + '...' : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                          {tx.razorpay_payment_id || tx.transaction_id || '—'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-[var(--text-main)]">{tx.customer_name || 'Guest'}</div>
                          <div className="text-[10px] text-[var(--text-subtle)]">{tx.customer_email || ''}</div>
                        </td>
                        <td className="py-3 px-4 font-bold whitespace-nowrap">
                          ₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border)] font-semibold text-[10px] uppercase">
                            {tx.method || 'UPI'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.status === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : (tx.status === 'Failed' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600')
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {tx.refund_status === 'full' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600">
                              Fully Refunded
                            </span>
                          ) : tx.refund_status === 'partial' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600">
                              Partial (₹{tx.refunded_amount})
                            </span>
                          ) : (
                            <span className="text-[var(--text-subtle)] text-[11px]">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            tx.verification_status === 'verified' ? 'text-emerald-600' : 'text-slate-500'
                          }`}>
                            {tx.verification_status === 'verified' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Verified</span>
                              </>
                            ) : (
                              <span>Unverified</span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] transition-colors cursor-pointer"
                            title="View Payment Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {tx.status === 'Paid' && tx.refund_status !== 'full' && (
                            <button
                              onClick={() => {
                                setRefundTargetTx(tx);
                                setRefundAmount(String(Number(tx.amount || 0) - Number(tx.refunded_amount || 0)));
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 transition-colors cursor-pointer"
                              title="Issue Refund"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.transactions?.totalPages > 1 && (
              <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">
                  Page {data.transactions.page} of {data.transactions.totalPages} ({data.transactions.total} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded-lg border border-[var(--border)] disabled:opacity-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.transactions.totalPages, p + 1))}
                    disabled={page >= data.transactions.totalPages}
                    className="px-3 py-1 rounded-lg border border-[var(--border)] disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUBTAB CONTENT: REFUNDS                                             */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'refunds' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">Refunds Ledger</h2>
              <p className="text-xs text-[var(--text-muted)]">Authoritative full and partial refund audit records</p>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-subtle)]/70 text-[var(--text-subtle)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Refund ID</th>
                    <th className="py-3.5 px-4 font-semibold">Date</th>
                    <th className="py-3.5 px-4 font-semibold">TVO Order ID</th>
                    <th className="py-3.5 px-4 font-semibold">Customer</th>
                    <th className="py-3.5 px-4 font-semibold">Refund Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Reason</th>
                    <th className="py-3.5 px-4 font-semibold">Gateway Refund ID</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)]">
                  {!data?.refunds || data.refunds.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No refunds recorded yet.
                      </td>
                    </tr>
                  ) : (
                    data.refunds.map((rf: any) => (
                      <tr key={rf.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">#{rf.id}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">
                          {rf.created_at ? new Date(rf.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--primary)]">{rf.order_number || `#${rf.order_id}`}</td>
                        <td className="py-3 px-4 font-semibold">{rf.customer_name || 'Customer'}</td>
                        <td className="py-3 px-4 font-bold text-purple-600">₹{Number(rf.amount).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{rf.reason || 'Customer request'}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">{rf.gateway_refund_id || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUBTAB CONTENT: SETTLEMENTS                                         */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'settlements' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
            <strong>Authoritative Settlement Notice:</strong> Settlement data reflects disbursements from Razorpay to the TVO Flavours merchant bank account. Settlement figures are strictly sourced from verified Razorpay settlement data and are never fabricated from order totals.
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-subtle)]/70 text-[var(--text-subtle)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Settlement ID</th>
                    <th className="py-3.5 px-4 font-semibold">Settlement Date</th>
                    <th className="py-3.5 px-4 font-semibold">Gross Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Fees</th>
                    <th className="py-3.5 px-4 font-semibold">Tax</th>
                    <th className="py-3.5 px-4 font-semibold">Net Disbursed</th>
                    <th className="py-3.5 px-4 font-semibold">UTR Reference</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)]">
                  {!data?.settlements || data.settlements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        <div className="max-w-md mx-auto space-y-2">
                          <p className="font-semibold text-[var(--text-main)]">No Settlement Records Yet</p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Razorpay settlements typically clear within T+2 banking days after capture. Live settlements will automatically appear once disbursed by the gateway.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.settlements.map((st: any) => (
                      <tr key={st.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[var(--primary)]">{st.settlement_id}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">{st.settled_at || '—'}</td>
                        <td className="py-3 px-4 font-bold">₹{Number(st.amount).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-rose-600">₹{Number(st.fee || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-rose-600">₹{Number(st.tax || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-bold text-emerald-600">
                          ₹{(Number(st.amount) - Number(st.fee || 0) - Number(st.tax || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">{st.utr || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                            {st.status || 'Processed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUBTAB CONTENT: RECONCILIATION                                      */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">Multi-way Payment Reconciliation</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Automated comparison: TVO Order vs TVO Payment vs Gateway Record vs Refund
              </p>
            </div>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--primary)] text-white shadow-xs hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run Reconcile Scan</span>
            </button>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-subtle)]/70 text-[var(--text-subtle)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">TVO Order</th>
                    <th className="py-3.5 px-4 font-semibold">Order Total</th>
                    <th className="py-3.5 px-4 font-semibold">Order Status</th>
                    <th className="py-3.5 px-4 font-semibold">Payment Status</th>
                    <th className="py-3.5 px-4 font-semibold">Paid Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Refunded</th>
                    <th className="py-3.5 px-4 font-semibold">Reconciliation Result</th>
                    <th className="py-3.5 px-4 font-semibold">Explanation / Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)]">
                  {!data?.reconciliation || data.reconciliation.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                        No reconciliation records available.
                      </td>
                    </tr>
                  ) : (
                    data.reconciliation.map((rec: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-[var(--primary)]">{rec.orderNumber}</td>
                        <td className="py-3 px-4 font-bold">₹{rec.orderTotal.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">{rec.orderStatus}</td>
                        <td className="py-3 px-4">{rec.orderPaymentStatus}</td>
                        <td className="py-3 px-4 font-bold">
                          {rec.paymentAmount != null ? `₹${rec.paymentAmount.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-purple-600">
                          {rec.refundedAmount > 0 ? `₹${rec.refundedAmount.toLocaleString('en-IN')}` : '₹0'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            rec.reconciliationStatus === 'MATCHED'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : (rec.reconciliationStatus === 'MISMATCH'
                                  ? 'bg-rose-500/10 text-rose-600'
                                  : 'bg-amber-500/10 text-amber-600')
                          }`}>
                            {rec.reconciliationStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-muted)] text-[11px]">
                          {rec.mismatchReason || 'All order, payment and gateway values match perfectly'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUBTAB CONTENT: PAYMENT ANALYTICS                                   */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300">
            <strong>Gateway Analytics Scope:</strong> These metrics reflect authoritative gateway payment transaction telemetry (authorization rates, capture volumes, payment methods) and are strictly isolated from order fulfillment analytics.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-xs text-[var(--text-muted)] font-medium">Gateway Success Rate</div>
              <div className="text-2xl font-black text-emerald-600">{data?.analytics?.successRate || 0}%</div>
              <div className="text-[11px] text-[var(--text-subtle)]">{data?.analytics?.successCount || 0} of {data?.analytics?.totalAttempts || 0} attempts</div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-xs text-[var(--text-muted)] font-medium">Gateway Failure Rate</div>
              <div className="text-2xl font-black text-rose-600">{data?.analytics?.failureRate || 0}%</div>
              <div className="text-[11px] text-[var(--text-subtle)]">{data?.analytics?.failureCount || 0} failed attempts</div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-xs text-[var(--text-muted)] font-medium">Average Ticket Size</div>
              <div className="text-2xl font-black text-[var(--primary)]">₹{(data?.analytics?.averageTicketSize || 0).toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-[var(--text-subtle)]">Per successful transaction</div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-xs text-[var(--text-muted)] font-medium">Net Payment Volume</div>
              <div className="text-2xl font-black text-emerald-600">₹{(kpi.netOrderPaymentAmount || 0).toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-[var(--text-subtle)]">Gross minus refunded</div>
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-main)]">Payment Method Distribution (Authoritative Razorpay Telemetry)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {!data?.analytics?.methodBreakdown || data.analytics.methodBreakdown.length === 0 ? (
                <div className="col-span-4 text-center py-6 text-xs text-[var(--text-muted)]">
                  No payment method telemetry recorded yet.
                </div>
              ) : (
                data.analytics.methodBreakdown.map((m: any) => (
                  <div key={m.method} className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1 text-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{m.method || 'UPI'}</div>
                    <div className="text-xl font-bold text-[var(--text-main)]">{m.count} txns</div>
                    <div className="text-xs font-bold text-emerald-600">₹{Number(m.volume || 0).toLocaleString('en-IN')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUBTAB CONTENT: WEBHOOKS                                            */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-2">
              <div className="text-xs font-medium text-[var(--text-muted)]">Webhook Endpoint</div>
              <div className="font-mono text-xs font-bold text-[var(--primary)] bg-[var(--bg-subtle)] p-2 rounded-lg border border-[var(--border)] break-all">
                /api/payments/razorpay/webhook
              </div>
              <div className="text-[11px] text-[var(--text-subtle)]">Configured in Razorpay Dashboard</div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-xs font-medium text-[var(--text-muted)]">Events Processed</div>
              <div className="text-2xl font-black text-emerald-600">{webhookHealth.successfulVerifications}</div>
              <div className="text-[11px] text-[var(--text-subtle)]">Validated with HMAC-SHA256 signature</div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-1">
              <div className="text-xs font-medium text-[var(--text-muted)]">Failed / Rejected Webhooks</div>
              <div className="text-2xl font-black text-rose-600">{webhookHealth.failedWebhooks}</div>
              <div className="text-[11px] text-[var(--text-subtle)]">Signature failures or errors</div>
            </div>
          </div>

          {/* Recent Webhook Events Log */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs space-y-2">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-main)]">Recent Webhook Telemetry Logs</h3>
              <span className="text-xs text-[var(--text-muted)]">Idempotent Event Log</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-subtle)]/70 text-[var(--text-subtle)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Event ID</th>
                    <th className="py-3.5 px-4 font-semibold">Event Type</th>
                    <th className="py-3.5 px-4 font-semibold">Received At</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Diagnostics / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)]">
                  {!webhookHealth.recentEvents || webhookHealth.recentEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-xs text-[var(--text-muted)]">
                        No webhook events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    webhookHealth.recentEvents.map((evt: any) => (
                      <tr key={evt.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">{evt.event_id}</td>
                        <td className="py-3 px-4 font-bold text-[var(--text-main)]">{evt.event_type}</td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">
                          {evt.received_at ? new Date(evt.received_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            evt.status === 'processed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {evt.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-[var(--text-muted)]">{evt.error_message || 'OK'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SUBTAB CONTENT: SETTINGS                                            */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          {/* Card A: Gateway Operational Status & Controls */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--primary)]" />
                  <span>Gateway Operational Status</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Active payment gateway status, connectivity latency, and live processing controls.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {config.isActive !== false ? (
                  <button
                    onClick={() => setShowDisableModal(true)}
                    className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Disable Gateway</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleGateway(true)}
                    disabled={isTogglingGateway}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Enable Gateway</span>
                  </button>
                )}

                <button
                  onClick={handleTestApiConnection}
                  disabled={isTestingApi}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1">
                <span className="text-[11px] text-[var(--text-muted)] block">Processing Status</span>
                <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                  config.isActive !== false ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${config.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {config.isActive !== false ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1">
                <span className="text-[11px] text-[var(--text-muted)] block">Environment Mode</span>
                <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                  config.mode === 'LIVE' ? 'text-emerald-600' : 'text-blue-600'
                }`}>
                  {config.mode === 'LIVE' ? '🟢 LIVE MODE' : '🔵 TEST MODE'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1">
                <span className="text-[11px] text-[var(--text-muted)] block">Credential Source</span>
                <span className="font-bold text-xs text-[var(--text-main)] uppercase">
                  {config.source === 'database' ? 'Encrypted DB' : (config.source === 'env' ? 'ENV Fallback' : 'Unconfigured')}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1">
                <span className="text-[11px] text-[var(--text-muted)] block">Last Tested</span>
                <span className="font-semibold text-[11px] text-[var(--text-muted)] truncate block">
                  {config.lastConnectionTestAt ? new Date(config.lastConnectionTestAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Never tested'}
                </span>
              </div>
            </div>

            {/* Test Connection Diagnostic Output */}
            {apiTestResult && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                apiTestResult.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
              }`}>
                {apiTestResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{apiTestResult.message}</span>
                {apiTestResult.latencyMs > 0 && <span className="text-[11px] opacity-75">({apiTestResult.latencyMs}ms latency)</span>}
              </div>
            )}
          </div>

          {/* Card B: Razorpay Credentials Configuration Form */}
          <form onSubmit={handleSaveGatewayConfig} className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-5">
            <div className="border-b border-[var(--border)] pb-4">
              <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--primary)]" />
                <span>Razorpay Gateway Credentials</span>
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Credentials are automatically encrypted using authenticated AES-256-GCM before writing to the database. Plaintext secrets are never logged or returned to the browser.
              </p>
            </div>

            {/* Environment Switcher */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text-main)]">
                Operating Environment
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  configEnv === 'test' 
                    ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold' 
                    : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                }`}>
                  <input
                    type="radio"
                    name="gatewayEnv"
                    value="test"
                    checked={configEnv === 'test'}
                    onChange={() => {
                      setConfigEnv('test');
                      setLiveConfirmCheckbox(false);
                    }}
                    className="accent-blue-600"
                  />
                  <div>
                    <div className="text-xs font-bold">Test Mode (Sandbox)</div>
                    <div className="text-[10px] opacity-80 font-normal">Safe mock payments using Razorpay Test instruments (rzp_test_)</div>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  configEnv === 'live' 
                    ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold' 
                    : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                }`}>
                  <input
                    type="radio"
                    name="gatewayEnv"
                    value="live"
                    checked={configEnv === 'live'}
                    onChange={() => {
                      setConfigEnv('live');
                      setShowLiveModal(true);
                    }}
                    className="accent-rose-600"
                  />
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Live Mode (Production)</span>
                      <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.2 rounded-full font-extrabold uppercase">Real Money</span>
                    </div>
                    <div className="text-[10px] opacity-80 font-normal">Real customer bank cards and UPI (rzp_live_)</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Key ID Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-main)]">
                  Razorpay Key ID
                </label>
                {config.keyIdPresent && (
                  <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                    Current: {config.keyIdMasked}
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder={configEnv === 'live' ? 'rzp_live_xxxxxxxxxxxxxxxx' : 'rzp_test_xxxxxxxxxxxxxxxx'}
                value={configKeyId}
                onChange={(e) => setConfigKeyId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
              <p className="text-[10px] text-[var(--text-muted)]">
                {configEnv === 'live' ? 'Must begin with "rzp_live_"' : 'Must begin with "rzp_test_"'}
              </p>
            </div>

            {/* Key Secret Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-main)]">
                  Razorpay Key Secret
                </label>
                {config.keySecretPresent && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    ✓ Encrypted & Sealed
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showSecretInput ? 'text' : 'password'}
                  placeholder={config.keySecretPresent ? '•••••••••••••••••••••••••••••••• (Leave blank to keep current)' : 'Paste Key Secret from Razorpay Dashboard'}
                  value={configKeySecret}
                  onChange={(e) => setConfigKeySecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] pr-10 focus:outline-none focus:border-[var(--primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretInput(!showSecretInput)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSecretInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">
                AES-256-GCM encrypted in SQLite. Never sent to the client.
              </p>
            </div>

            {/* Webhook Secret Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-main)]">
                  Razorpay Webhook Secret (Optional in Test)
                </label>
                {config.webhookSecretPresent && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    ✓ Encrypted & Sealed
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder={config.webhookSecretPresent ? '•••••••••••••••• (Leave blank to keep current)' : 'Secret entered when creating webhook in Razorpay'}
                value={configWebhookSecret}
                onChange={(e) => setConfigWebhookSecret(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            {/* Feedback Alert */}
            {configFeedback && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                configFeedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
              }`}>
                {configFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{configFeedback.text}</span>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[var(--border)]">
              <div className="text-[11px] text-[var(--text-muted)]">
                Saving will test connectivity and atomically activate the credentials.
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Save & Activate Configuration</span>
                </button>
              </div>
            </div>
          </form>

          {/* Card C: Webhook Integration & Secret Rotation */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-[var(--primary)]" />
                  <span>Webhook Health & Integration</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Razorpay sends asynchronous status notifications (e.g. payment.captured, payment.failed) to this endpoint.
                </p>
              </div>
              <button
                onClick={() => setShowWebhookRotateModal(true)}
                className="px-3.5 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Rotate Webhook Secret
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  Endpoint URL to enter in Razorpay Dashboard → Webhooks
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value="https://blanchedalmond-leopard-910858.hostingersite.com/api/payments/razorpay/webhook"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] select-all"
                  />
                  <button
                    onClick={copyWebhookUrl}
                    className="px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedWebhookUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhookUrl ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Signature Verification</span>
                  <span className="font-bold text-emerald-600">HMAC-SHA256 Timing-Safe</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Idempotency Filter</span>
                  <span className="font-bold text-emerald-600">Active (Deduplication)</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Webhook Health Status</span>
                  <span className={`font-bold ${webhookHealth.status === 'HEALTHY' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {webhookHealth.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: PAYMENT DETAILS DRAWER                                       */}
      {/* ------------------------------------------------------------------- */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg overflow-hidden shadow-xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[var(--primary)]" />
                <h3 className="font-bold text-sm text-[var(--text-main)]">Payment Transaction Details</h3>
              </div>
              <button onClick={() => setSelectedTx(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[var(--bg-subtle)] p-3 rounded-xl">
                <div>
                  <span className="text-[var(--text-muted)]">TVO Order:</span>
                  <div className="font-bold text-[var(--primary)]">{selectedTx.order_number || `#${selectedTx.order_id}`}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Amount Paid:</span>
                  <div className="font-bold text-emerald-600">₹{Number(selectedTx.amount).toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Razorpay Payment ID:</span>
                  <span className="font-mono font-semibold">{selectedTx.razorpay_payment_id || selectedTx.transaction_id || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Razorpay Order ID:</span>
                  <span className="font-mono font-semibold">{selectedTx.razorpay_order_id || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Customer:</span>
                  <span className="font-semibold">{selectedTx.customer_name || 'Guest'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Email:</span>
                  <span className="font-semibold">{selectedTx.customer_email || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Method:</span>
                  <span className="font-bold uppercase">{selectedTx.method || 'UPI'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Gateway:</span>
                  <span className="font-semibold">{selectedTx.gateway || 'Razorpay'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Verification Status:</span>
                  <span className="font-bold text-emerald-600">{selectedTx.verification_status || 'unverified'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Refund Status:</span>
                  <span className="font-semibold">{selectedTx.refund_status || 'none'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: ISSUE REFUND                                                 */}
      {/* ------------------------------------------------------------------- */}
      {refundTargetTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleTriggerRefund} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm text-[var(--text-main)]">Issue Gateway Refund</h3>
              </div>
              <button type="button" onClick={() => setRefundTargetTx(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Order:</span>
                  <span className="font-bold">{refundTargetTx.order_number || `#${refundTargetTx.order_id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Captured Amount:</span>
                  <span className="font-bold">₹{Number(refundTargetTx.amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Already Refunded:</span>
                  <span className="font-bold text-purple-600">₹{Number(refundTargetTx.refunded_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Max Refundable:</span>
                  <span className="font-bold text-emerald-600">
                    ₹{(Number(refundTargetTx.amount) - Number(refundTargetTx.refunded_amount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  Refund Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={Number(refundTargetTx.amount) - Number(refundTargetTx.refunded_amount || 0)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] font-bold focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  Reason for Refund
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer cancellation, quality dispute, item out of stock"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              {refundError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 text-[11px] font-semibold">
                  {refundError}
                </div>
              )}

              {refundSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold">
                  {refundSuccess}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setRefundTargetTx(null)}
                disabled={isRefunding}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRefunding}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRefunding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Confirm Refund</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: LIVE MODE CONFIRMATION                                       */}
      {/* ------------------------------------------------------------------- */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--bg-surface)] border border-rose-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[var(--text-main)]">Confirm Switch to Live Payment Mode</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLiveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-rose-700 dark:text-rose-400">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  REAL MONEY TRANSACTIONS WILL OCCUR
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  <li>Actual bank cards, UPI IDs, and net banking accounts will be charged in real INR.</li>
                  <li>Ensure your Razorpay Key ID begins with <code className="bg-[var(--bg-subtle)] px-1 rounded font-mono font-bold">rzp_live_</code>.</li>
                  <li>Ensure your Razorpay Dashboard Webhooks are pointed to this live store URL.</li>
                </ul>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={liveConfirmCheckbox}
                  onChange={(e) => setLiveConfirmCheckbox(e.target.checked)}
                  className="mt-0.5 rounded text-[var(--primary)] focus:ring-0"
                />
                <span className="text-[11px] font-semibold text-[var(--text-main)] leading-tight">
                  I understand that Live Mode processes real customer money and charges active bank accounts.
                </span>
              </label>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowLiveModal(false)}
                disabled={isSavingConfig}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveGatewayConfig()}
                disabled={!liveConfirmCheckbox || isSavingConfig}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Activate Live Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: DISABLE GATEWAY CONFIRMATION                                 */}
      {/* ------------------------------------------------------------------- */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--bg-surface)] border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[var(--text-main)]">Disable Online Payment Gateway</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDisableModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 text-[11px] leading-relaxed">
                Disabling the gateway will immediately pause online payments on the storefront. Customers will only be able to place orders using <strong>Cash on Delivery (COD)</strong> until re-enabled.
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Existing payment transactions and history will remain completely intact.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowDisableModal(false)}
                disabled={isTogglingGateway}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleGateway(false)}
                disabled={isTogglingGateway}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isTogglingGateway ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                <span>Confirm Disable</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: ROTATE WEBHOOK SECRET                                        */}
      {/* ------------------------------------------------------------------- */}
      {showWebhookRotateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleRotateWebhookSecret} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 text-purple-600">
                <RotateCcw className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[var(--text-main)]">Rotate Webhook Secret</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWebhookRotateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Updating your webhook secret will immediately invalidate the existing secret. Make sure to copy the new secret and paste it into your Razorpay Dashboard Webhook settings.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  New Webhook Secret
                </label>
                <input
                  type="text"
                  value={rotateWebhookVal}
                  onChange={(e) => setRotateWebhookVal(e.target.value)}
                  placeholder="Enter new strong webhook secret"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowWebhookRotateModal(false)}
                disabled={isRotatingWebhook}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRotatingWebhook || !rotateWebhookVal.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRotatingWebhook ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Update Secret</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
