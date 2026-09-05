'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Cake,
  Image as ImageIcon,
  ArrowUpRight,
  Clock,
  ChevronRight,
  Plus,
  FileSpreadsheet,
  RefreshCw,
  TrendingUp,
  Calendar,
  BarChart3,
  Award,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Product, Order, OrderStatus } from '../../lib/types';
import { logAuditEvent } from '../../lib/audit';
import { useAuth } from '../../context/AuthContext';
import { exportProductsToWooCommerceCSV } from '../../lib/csvHelpers';

interface DashboardViewProps {
  products: Product[];
  orders: Order[];
  onNavigateTab: (tab: any) => void;
  onOpenAddProductModal: () => void;
  onSeedDatabase: () => void;
  isSeeding: boolean;
}

interface DailyOrderStat {
  day: number;
  dayLabel: string;
  fullDate: string;
  orders: number;
  revenue: number;
  delivered: number;
  inProgress: number;
  isToday: boolean;
  isPeak: boolean;
}

const emptySubscribe = () => () => {};
const useMounted = () => React.useSyncExternalStore(emptySubscribe, () => true, () => false);

// Custom Chart Tooltip declared at module scope
const CustomChartTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data: DailyOrderStat = payload[0].payload;
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-3 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[170px]">
        <div className="font-bold text-[var(--text-main)] flex items-center justify-between border-b border-[var(--border)] pb-1.5">
          <span>{data.fullDate}</span>
          {data.isToday && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-[var(--primary-light)] text-[var(--primary)] font-bold">
              Today
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">Total Orders:</span>
          <span className="font-bold text-[var(--primary)] font-mono">{data.orders}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-muted)]">Day Revenue:</span>
          <span className="font-bold text-emerald-600 font-mono">₹{data.revenue.toLocaleString('en-IN')}</span>
        </div>
        {data.orders > 0 && (
          <div className="pt-1 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-subtle)]">
            <span>Delivered: {data.delivered}</span>
            <span>In Kitchen: {data.inProgress}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  orders,
  onNavigateTab,
  onOpenAddProductModal,
  onSeedDatabase,
  isSeeding,
}) => {
  const { user } = useAuth();
  const [chartMetric, setChartMetric] = useState<'orders' | 'revenue'>('orders');
  const isMounted = useMounted();

  // Metrics computation from real live state
  const totalSalesVolume = orders.reduce((sum, ord) => sum + (ord.total || 0), 0);
  const activeRecipesCount = products.filter((p) => p.published).length;
  const activeOrders = orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled');

  // Compute Daily Orders Data for the Current Month
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const todayDate = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const shortMonth = now.toLocaleDateString('en-US', { month: 'short' });

    // Build map for each day of current month
    const dailyStats: DailyOrderStat[] = [];
    let maxOrdersInDay = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      dailyStats.push({
        day,
        dayLabel: `${day}`,
        fullDate: `${shortMonth} ${day}, ${currentYear}`,
        orders: 0,
        revenue: 0,
        delivered: 0,
        inProgress: 0,
        isToday: day === todayDate,
        isPeak: false,
      });
    }

    // Populate with actual orders
    orders.forEach((order) => {
      let orderDate: Date | null = null;

      if (order.createdAt) {
        const parsed = new Date(order.createdAt);
        if (!isNaN(parsed.getTime())) orderDate = parsed;
      }

      // Fallback to deliveryDate if createdAt is absent or invalid
      if (!orderDate && order.deliveryDate) {
        const parsed = new Date(order.deliveryDate);
        if (!isNaN(parsed.getTime())) orderDate = parsed;
      }

      // If valid date and in current month & year
      if (
        orderDate &&
        orderDate.getFullYear() === currentYear &&
        orderDate.getMonth() === currentMonth
      ) {
        const dayIdx = orderDate.getDate() - 1;
        if (dayIdx >= 0 && dayIdx < daysInMonth) {
          const stat = dailyStats[dayIdx];
          stat.orders += 1;
          stat.revenue += order.total || 0;
          if (order.status === 'Delivered') {
            stat.delivered += 1;
          } else if (order.status !== 'Cancelled') {
            stat.inProgress += 1;
          }
        }
      }
    });

    // Determine max/peak
    dailyStats.forEach((d) => {
      if (d.orders > maxOrdersInDay) {
        maxOrdersInDay = d.orders;
      }
    });

    if (maxOrdersInDay > 0) {
      dailyStats.forEach((d) => {
        if (d.orders === maxOrdersInDay) {
          d.isPeak = true;
        }
      });
    }

    const totalMonthOrders = dailyStats.reduce((sum, d) => sum + d.orders, 0);
    const totalMonthRevenue = dailyStats.reduce((sum, d) => sum + d.revenue, 0);
    const peakDay = dailyStats.find((d) => d.isPeak && d.orders > 0);
    const avgDailyOrders =
      todayDate > 0 ? (totalMonthOrders / todayDate).toFixed(1) : '0';

    return {
      monthName,
      daysInMonth,
      dailyStats,
      totalMonthOrders,
      totalMonthRevenue,
      peakDay,
      avgDailyOrders,
      maxOrdersInDay,
    };
  }, [orders]);

  // Quick 1-click advance order status
  const handleAdvanceStatus = async (order: Order) => {
    let nextStatus: OrderStatus = 'Baking in Kitchen';
    let note = 'Chef commenced preparation';

    if (order.status === 'Order Placed') {
      nextStatus = 'Baking in Kitchen';
      note = 'Pastry chef prepared sponges and temper chocolate';
    } else if (order.status === 'Baking in Kitchen') {
      nextStatus = 'Out for Delivery';
      note = 'Packed in cold-chain box and assigned to delivery partner';
    } else if (order.status === 'Out for Delivery') {
      nextStatus = 'Delivered';
      note = 'Delivered successfully to recipient with signature';
    }

    try {
      try {
        const res = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'status',
            orderNumber: order.orderNumber,
            status: nextStatus,
            note,
          }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error || `Failed to advance status (${res.status}).`);
        }
      } catch (e) {
        console.warn('Failed to advance order status:', e);
      }

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: user?.name,
        actorEmail: user?.email,
        action: 'ORDER_STATUS_ADVANCE',
        targetType: 'Order',
        targetId: order.orderNumber,
        details: `Advanced order status from ${order.status} to ${nextStatus}`,
      });
    } catch (e) {
      console.warn('Failed to advance order status:', e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)]">
            Kitchen Operations Overview
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time live bakery orders, catalog inventory, and operational metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="admin-add-recipe-quick-btn"
            onClick={onOpenAddProductModal}
            className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Cake Recipe</span>
          </button>

          <button
            onClick={() => exportProductsToWooCommerceCSV(products)}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onSeedDatabase}
            disabled={isSeeding}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Seed sample artisan cakes and orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--primary)] ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'Seeding...' : 'Seed Catalog'}</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Stat 1: Total Sales */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Total Sales Volume
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
              ₹{totalSalesVolume.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[var(--success)] font-medium flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>Real-time settled revenue</span>
            </div>
          </div>
        </div>

        {/* Stat 2: Active Orders */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Celebration Orders
            </span>
            <div className="p-2 rounded-xl bg-[var(--primary-light)] text-[var(--primary)]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
              {orders.length}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">
              <strong className="text-[var(--primary)]">{activeOrders.length} active</strong> in kitchen / transit
            </div>
          </div>
        </div>

        {/* Stat 3: Active Cake Recipes */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Active Cake Recipes
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Cake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
              {activeRecipesCount}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">
              {products.length} total recipes in database
            </div>
          </div>
        </div>

        {/* Stat 4: Media Assets */}
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Verified Media Assets
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
              {products.reduce((acc, p) => acc + (p.images?.length || 0), 0)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">
              Optimized WebP & Thumbnails
            </div>
          </div>
        </div>
      </div>

      {/* Data Visualization Section: Daily Orders for Current Month */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
        {/* Section Header with Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold font-display text-[var(--text-main)]">
                Daily Orders Distribution ({currentMonthData.monthName})
              </h3>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Day-by-day cake ordering velocity, volume spikes, and revenue pacing for the current month.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Mode Toggle */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs">
              <button
                id="chart-metric-orders-btn"
                type="button"
                onClick={() => setChartMetric('orders')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  chartMetric === 'orders'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Orders Count
              </button>
              <button
                id="chart-metric-revenue-btn"
                type="button"
                onClick={() => setChartMetric('revenue')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  chartMetric === 'revenue'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Revenue (₹)
              </button>
            </div>

            {/* Current Month Tag */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs font-medium text-[var(--text-main)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>{currentMonthData.monthName}</span>
            </div>
          </div>
        </div>

        {/* Month Summary Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
            <div className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Month Total Orders</span>
            </div>
            <div className="text-xl font-bold font-mono text-[var(--text-main)] mt-1">
              {currentMonthData.totalMonthOrders}
            </div>
            <div className="text-[10px] text-[var(--text-subtle)] mt-0.5">
              Across {currentMonthData.daysInMonth} calendar days
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
            <div className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Month Revenue</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
              ₹{currentMonthData.totalMonthRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-[var(--text-subtle)] mt-0.5">
              Settled order transactions
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
            <div className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Avg. Daily Pace</span>
            </div>
            <div className="text-xl font-bold font-mono text-[var(--text-main)] mt-1">
              {currentMonthData.avgDailyOrders}{' '}
              <span className="text-xs font-normal text-[var(--text-muted)]">orders/day</span>
            </div>
            <div className="text-[10px] text-[var(--text-subtle)] mt-0.5">
              Month-to-date average
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
            <div className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Peak Day Velocity</span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-600 mt-1">
              {currentMonthData.peakDay ? `${currentMonthData.peakDay.orders} orders` : '0 orders'}
            </div>
            <div className="text-[10px] text-[var(--text-subtle)] mt-0.5 truncate">
              {currentMonthData.peakDay ? currentMonthData.peakDay.fullDate : 'No orders yet'}
            </div>
          </div>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="pt-2">
          {isMounted ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={currentMonthData.dailyStats}
                  margin={{ top: 12, right: 12, left: -16, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                    opacity={0.7}
                  />
                  <XAxis
                    dataKey="dayLabel"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    tick={{ fill: 'var(--text-subtle)', fontSize: 11 }}
                    interval={window?.innerWidth < 640 ? 2 : 0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--text-subtle)', fontSize: 11 }}
                    tickFormatter={(val) => (chartMetric === 'revenue' ? `₹${val}` : `${val}`)}
                  />
                  <Tooltip
                    content={<CustomChartTooltip />}
                    cursor={{ fill: 'var(--bg-subtle)', opacity: 0.6 }}
                  />
                  <Bar
                    dataKey={chartMetric === 'orders' ? 'orders' : 'revenue'}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  >
                    {currentMonthData.dailyStats.map((entry, index) => {
                      let fill = 'var(--primary)';
                      if (entry.isPeak && entry.orders > 0) {
                        fill = '#f59e0b'; // Amber highlight for peak days
                      } else if (entry.isToday) {
                        fill = '#6366f1'; // Indigo for today
                      } else if (entry.orders === 0) {
                        fill = 'var(--border)';
                      }
                      return <Cell key={`cell-${index}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] w-full flex items-center justify-center bg-[var(--bg-subtle)] rounded-xl text-xs text-[var(--text-muted)]">
              Loading Chart Data...
            </div>
          )}
        </div>

        {/* Chart Legend & Insights Footer */}
        <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--text-muted)]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[var(--primary)] inline-block" />
              <span>Standard Order Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] inline-block" />
              <span>Peak Demand Spike</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#6366f1] inline-block" />
              <span>Today (Current Day)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[var(--border)] inline-block" />
              <span>Zero Orders</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[var(--primary)] font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive daily breakdown with hover analytics</span>
          </div>
        </div>
      </div>

      {/* Active Live Kitchen Orders Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-subtle)]/40">
          <div>
            <h3 className="text-base font-bold font-display text-[var(--text-main)]">
              Active Live Kitchen Orders ({activeOrders.length})
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Live queue of celebration cakes currently being baked or out with cold-chain riders.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Orders Archive</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-subtle)]/70 text-[var(--text-subtle)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Order ID</th>
                <th className="py-3.5 px-4 font-semibold">Customer & City</th>
                <th className="py-3.5 px-4 font-semibold">Items & Weight</th>
                <th className="py-3.5 px-4 font-semibold">Delivery Slot</th>
                <th className="py-3.5 px-4 font-semibold">Total</th>
                <th className="py-3.5 px-4 font-semibold">Current Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Quick Advance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)]">
              {activeOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                    No active orders currently pending in the kitchen. All deliveries are up to date!
                  </td>
                </tr>
              ) : (
                activeOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[var(--primary)]">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold">{ord.customer?.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{ord.customer?.city}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium truncate max-w-[200px]">
                        {ord.items?.[0]?.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-subtle)]">
                        {ord.items?.[0]?.weight} • {ord.items?.[0]?.flavour}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[var(--bg-subtle)] px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-[var(--primary)]" />
                        <span>{ord.deliverySlot}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      ₹{ord.total}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          ord.status === 'Order Placed'
                            ? 'bg-blue-500/10 text-blue-600'
                            : ord.status === 'Baking in Kitchen'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-purple-500/10 text-purple-600'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        <span>{ord.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {ord.status !== 'Delivered' && (
                        <button
                          onClick={() => handleAdvanceStatus(ord)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--primary-light)] hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          {ord.status === 'Order Placed' && 'Start Baking'}
                          {ord.status === 'Baking in Kitchen' && 'Dispatch Rider'}
                          {ord.status === 'Out for Delivery' && 'Mark Delivered'}
                        </button>
                      )}
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
