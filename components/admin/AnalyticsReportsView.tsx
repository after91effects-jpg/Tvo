'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  RefreshCw,
  Package,
  FileSpreadsheet,
  Users,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  exportSalesToCSV,
  exportOrdersToCSV,
  exportCustomersToCSV,
  exportProductsToWooCommerceCSV,
} from '../../lib/csvHelpers';

interface AnalyticsData {
  summary: {
    totalOrders: number;
    grossRevenue: number;
    totalDiscounts: number;
    totalDeliveryFees: number;
    netRevenue: number;
    avgOrderValue: number;
  };
  dailySales: {
    date: string;
    ordersCount: number;
    revenue: number;
    discounts: number;
    netRevenue: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
  }[];
  paymentMethods: {
    method: string;
    count: number;
    revenue: number;
  }[];
  topProducts: {
    id: number;
    name: string;
    category: string;
    orderCount: number;
    revenue: number;
  }[];
}

export const AnalyticsReportsView: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Compute dates based on preset
  useEffect(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (datePreset === '7d') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (datePreset === '30d') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (datePreset === '90d') {
      const past = new Date();
      past.setDate(today.getDate() - 90);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (datePreset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  }, [datePreset]);

  // Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      let query = '/api/analytics?scope=reports';
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;

      const res = await fetch(query);
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      } else if (res.ok && json.summary) {
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load analytics', e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Full dataset exports
  const handleExportOrders = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin?type=orders');
      const json = await res.json();
      if (res.ok && json.orders) {
        exportOrdersToCSV(json.orders, `tvo_flavours_orders_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCustomers = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin?type=customers_page&limit=500');
      const json = await res.json();
      if (res.ok && json.customers) {
        exportCustomersToCSV(json.customers, 'tvo_flavours_customers_crm.csv');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportProducts = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin/products');
      const json = await res.json();
      if (res.ok && json.products) {
        exportProductsToWooCommerceCSV(json.products, 'tvo_flavours_products_catalog.csv');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Date Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
            Executive Business Analytics & Reports
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time financial performance, order pipeline metrics, product sales trends, and cross-system CSV exports.
          </p>
        </div>

        {/* Date Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border)] text-xs font-semibold">
            {(['7d', '30d', '90d', 'all', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setDatePreset(p)}
                className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                  datePreset === p
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : p === 'all' ? 'All Time' : 'Custom'}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-main)]"
              />
              <span className="text-[var(--text-muted)]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-main)]"
              />
            </div>
          )}

          <button
            onClick={fetchAnalytics}
            className="p-2 bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[var(--bg-subtle)] rounded-xl text-[var(--text-main)] transition-colors"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Export Tool Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-[var(--primary)]" />
          <span className="text-xs font-bold text-[var(--text-main)]">Instant CSV Export Hub:</span>
          <span className="text-xs text-[var(--text-muted)]">Download accounting-ready files with zero truncation</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => data?.dailySales && exportSalesToCSV(data.dailySales)}
            disabled={!data?.dailySales || isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary)] text-white font-semibold shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Sales Report CSV</span>
          </button>

          <button
            onClick={handleExportOrders}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] font-semibold transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>All Orders CSV</span>
          </button>

          <button
            onClick={handleExportCustomers}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] font-semibold transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Customer CRM CSV</span>
          </button>

          <button
            onClick={handleExportProducts}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] font-semibold transition-colors"
          >
            <Package className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Catalog CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-[var(--text-main)]">
            ₹{(data?.summary.grossRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Paid & Confirmed Orders
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Volume</span>
            <ShoppingBag className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <div className="text-xl font-black text-[var(--text-main)]">
            {data?.summary.totalOrders || 0}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">
            Active Non-Cancelled
          </div>
        </div>

        {/* Total Discounts */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Discounts Applied</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600">
            ₹{(data?.summary.totalDiscounts || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">
            Coupons & promotional offers
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Order Value</span>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-[var(--text-main)]">
            ₹{(data?.summary.avgOrderValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">
            Per completed order
          </div>
        </div>
      </div>

      {/* Breakdown: Status Pipeline & Payment Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Order Status Distribution */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
              Order Fulfillment Pipeline
            </h3>
            <span className="text-[10px] text-[var(--text-muted)]">
              {data?.statusDistribution.length || 0} active stages
            </span>
          </div>

          <div className="space-y-2">
            {data?.statusDistribution.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No orders in this timeframe.</p>
            ) : (
              data?.statusDistribution.map((st) => (
                <div key={st.status} className="flex items-center justify-between text-xs py-1">
                  <span className="font-semibold text-[var(--text-main)]">{st.status}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[11px]">
                      {st.count} orders
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
              Payment Methods Breakdown
            </h3>
            <span className="text-[10px] text-[var(--text-muted)]">Verified Transactions</span>
          </div>

          <div className="space-y-2">
            {data?.paymentMethods.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No transactions recorded.</p>
            ) : (
              data?.paymentMethods.map((pm) => (
                <div key={pm.method} className="flex items-center justify-between text-xs py-1">
                  <span className="font-semibold text-[var(--text-main)] capitalize">
                    {pm.method || 'Direct'}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--text-muted)]">{pm.count} orders</span>
                    <span className="font-bold text-[var(--primary)]">
                      ₹{pm.revenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Selling Products Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
            Top Performing Artisan Products
          </h3>
          <span className="text-xs text-[var(--text-muted)]">By revenue and order velocity</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--text-main)]">
            <thead className="bg-[var(--bg-subtle)] text-[11px] font-bold uppercase text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Order Velocity</th>
                <th className="py-3 px-4 text-right">Generated Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data?.topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-[var(--text-muted)]">
                    No product sales in the selected period.
                  </td>
                </tr>
              ) : (
                data?.topProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                    <td className="py-3 px-4 font-bold">{p.name}</td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">{p.category || 'Specialty'}</td>
                    <td className="py-3 px-4 font-semibold">{p.orderCount} orders</td>
                    <td className="py-3 px-4 text-right font-bold text-[var(--primary)]">
                      ₹{p.revenue.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Sales Log Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
            Daily Financial Log ({data?.dailySales.length || 0} Recorded Days)
          </h3>
          <button
            onClick={() => data?.dailySales && exportSalesToCSV(data.dailySales)}
            className="text-xs text-[var(--primary)] font-semibold hover:underline"
          >
            Export Daily Breakdown
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--text-main)]">
            <thead className="bg-[var(--bg-subtle)] text-[11px] font-bold uppercase text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Orders Count</th>
                <th className="py-3 px-4">Gross Revenue</th>
                <th className="py-3 px-4">Discounts</th>
                <th className="py-3 px-4 text-right">Net Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data?.dailySales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[var(--text-muted)]">
                    No sales recorded for this period.
                  </td>
                </tr>
              ) : (
                data?.dailySales.map((s) => (
                  <tr key={s.date} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold">{s.date}</td>
                    <td className="py-3 px-4">{s.ordersCount}</td>
                    <td className="py-3 px-4">₹{s.revenue.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-amber-600">₹{s.discounts.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                      ₹{s.netRevenue.toLocaleString('en-IN')}
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
