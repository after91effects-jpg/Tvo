'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Clock,
  MapPin,
  Phone,
  Mail,
  Printer,
  ChevronRight,
  CheckCircle,
  Truck,
  Flame,
  FileText,
  AlertCircle,
  Calendar,
  CalendarDays,
  RotateCcw,
  X,
  TrendingUp,
  Sparkles,
  ArrowRight,
  CheckSquare,
  Square,
  MinusSquare,
  Layers,
  Send,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  PackageCheck,
  CheckCheck,
  ChefHat,
} from 'lucide-react';
import { Order, OrderStatus } from '../../lib/types';
import { logAuditEvent } from '../../lib/audit';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';

type DatePreset = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'custom';

interface CustomerOrdersViewProps {
  orders: Order[];
  onRefresh: () => void;
}

export const CustomerOrdersView: React.FC<CustomerOrdersViewProps> = ({ orders, onRefresh }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Bulk status update state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<OrderStatus>('Baking in Kitchen');
  const [bulkStatusNote, setBulkStatusNote] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Date range filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(false);

  // Status advance form state
  const [newStatus, setNewStatus] = useState<OrderStatus>('Baking in Kitchen');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleApplyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      setShowCustomDateInputs(false);
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setShowCustomDateInputs(false);
    } else if (preset === 'yesterday') {
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yestStr = yest.toISOString().split('T')[0];
      setStartDate(yestStr);
      setEndDate(yestStr);
      setShowCustomDateInputs(false);
    } else if (preset === '7days') {
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(d7.toISOString().split('T')[0]);
      setEndDate(todayStr);
      setShowCustomDateInputs(false);
    } else if (preset === '30days') {
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(d30.toISOString().split('T')[0]);
      setEndDate(todayStr);
      setShowCustomDateInputs(false);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
      setShowCustomDateInputs(false);
    } else if (preset === 'custom') {
      setShowCustomDateInputs(true);
    }
  };

  const handleClearDateFilter = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setShowCustomDateInputs(false);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    handleClearDateFilter();
  };

  const handleOpenOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(
      order.status === 'Order Placed'
        ? 'Baking in Kitchen'
        : order.status === 'Baking in Kitchen'
        ? 'Out for Delivery'
        : 'Delivered'
    );
    setStatusNote('');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setIsUpdatingStatus(true);
      const noteToSave =
        statusNote.trim() ||
        `Status updated to ${newStatus} by ${user?.name || 'Chef Administrator'}`;

      const newHistory = [
        ...(selectedOrder.statusHistory || []),
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          note: noteToSave,
          updatedBy: user?.name || 'Chef Administrator',
        },
      ];

      const res = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'status',
            orderNumber: selectedOrder.orderNumber,
            status: newStatus,
            note: noteToSave,
          }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error || `Failed to update status (${res.status}).`);
        }

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: user?.name,
        actorEmail: user?.email,
        action: 'ORDER_STATUS_ADVANCE',
        targetType: 'Order',
        targetId: selectedOrder.orderNumber,
        details: `Updated order ${selectedOrder.orderNumber} status to "${newStatus}" (${noteToSave})`,
      });

      setSelectedOrder({
        ...selectedOrder,
        status: newStatus,
        statusHistory: newHistory,
      });

      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to update order status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePrintKitchenTicket = () => {
    window.print();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // 1. Status Filter
      const matchesStatus = selectedStatus === 'all' || ord.status === selectedStatus;

      // 2. Search Query
      const matchesSearch =
        searchQuery === '' ||
        ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customer?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customer?.phone?.includes(searchQuery);

      // 3. Date Range Filter
      let matchesDate = true;
      if (startDate || endDate) {
        if (!ord.createdAt) {
          matchesDate = false;
        } else {
          const orderTimestamp = new Date(ord.createdAt).getTime();
          if (isNaN(orderTimestamp)) {
            matchesDate = true;
          } else {
            if (startDate) {
              const startTimestamp = new Date(`${startDate}T00:00:00`).getTime();
              if (!isNaN(startTimestamp) && orderTimestamp < startTimestamp) {
                matchesDate = false;
              }
            }
            if (endDate) {
              const endTimestamp = new Date(`${endDate}T23:59:59.999`).getTime();
              if (!isNaN(endTimestamp) && orderTimestamp > endTimestamp) {
                matchesDate = false;
              }
            }
          }
        }
      }

      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [orders, selectedStatus, searchQuery, startDate, endDate]);

  // Summary statistics for active filtered view
  const filteredRevenue = useMemo(
    () => filteredOrders.reduce((sum, ord) => sum + (ord.total || 0), 0),
    [filteredOrders]
  );
  const avgOrderValue = useMemo(
    () => (filteredOrders.length > 0 ? Math.round(filteredRevenue / filteredOrders.length) : 0),
    [filteredOrders, filteredRevenue]
  );

  const isDateFilterActive = !!(startDate || endDate);
  const hasActiveFilters = searchQuery !== '' || selectedStatus !== 'all' || isDateFilterActive;

  // Format readable active date range description
  const activeDateRangeLabel = useMemo(() => {
    if (!startDate && !endDate) return null;
    if (startDate && endDate && startDate === endDate) {
      return new Date(`${startDate}T12:00:00`).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (startDate && endDate) {
      const s = new Date(`${startDate}T12:00:00`).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      });
      const e = new Date(`${endDate}T12:00:00`).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${s} – ${e}`;
    }
    if (startDate) {
      return `From ${new Date(`${startDate}T12:00:00`).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
    if (endDate) {
      return `Until ${new Date(`${endDate}T12:00:00`).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
    return null;
  }, [startDate, endDate]);

  // Bulk Selection Computations
  const filteredOrderIds = useMemo(() => filteredOrders.map((o) => o.id), [filteredOrders]);

  const selectedFilteredOrders = useMemo(
    () => filteredOrders.filter((ord) => selectedOrderIds.includes(ord.id)),
    [filteredOrders, selectedOrderIds]
  );

  const selectedAllOrdersList = useMemo(
    () => orders.filter((ord) => selectedOrderIds.includes(ord.id)),
    [orders, selectedOrderIds]
  );

  const isAllFilteredSelected =
    filteredOrders.length > 0 && selectedFilteredOrders.length === filteredOrders.length;
  const isSomeFilteredSelected =
    selectedFilteredOrders.length > 0 && selectedFilteredOrders.length < filteredOrders.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeFilteredSelected;
    }
  }, [isSomeFilteredSelected]);

  const handleToggleSelectOrder = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredSet = new Set(filteredOrderIds);
      setSelectedOrderIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      setSelectedOrderIds((prev) => {
        const set = new Set([...prev, ...filteredOrderIds]);
        return Array.from(set);
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedOrderIds([]);
  };

  const handleOpenBulkModal = (status?: OrderStatus) => {
    if (status) {
      setBulkTargetStatus(status);
    }
    setBulkStatusNote('');
    setIsBulkModalOpen(true);
  };

  const handleExecuteBulkStatusUpdate = async () => {
    if (selectedOrderIds.length === 0) return;

    try {
      setIsBulkUpdating(true);
      const ordersToUpdate = orders.filter((o) => selectedOrderIds.includes(o.id));
      const noteToSave =
        bulkStatusNote.trim() ||
        `Bulk updated to "${bulkTargetStatus}" by ${user?.name || 'Chef Administrator'}`;

      const batchSize = 100;

      for (let i = 0; i < ordersToUpdate.length; i += batchSize) {
        const chunk = ordersToUpdate.slice(i, i + batchSize);
        try {
          await Promise.all(chunk.map((ord) =>
            fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update-status',
                orderNumber: ord.orderNumber,
                status: bulkTargetStatus,
                note: noteToSave,
              }),
            }).catch(() => {})
          ));
        } catch (e) {}
      }

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: user?.name,
        actorEmail: user?.email,
        action: 'ORDER_BULK_STATUS_UPDATE',
        targetType: 'CustomerOrders',
        targetId: `bulk-${Date.now()}`,
        details: `Bulk updated ${ordersToUpdate.length} orders to status "${bulkTargetStatus}" (${noteToSave}). Included orders: ${ordersToUpdate
          .map((o) => o.orderNumber)
          .slice(0, 8)
          .join(', ')}${ordersToUpdate.length > 8 ? '...' : ''}`,
      });

      const updatedCount = ordersToUpdate.length;
      setSelectedOrderIds([]);
      setIsBulkModalOpen(false);
      setBulkSuccessMessage(
        `Successfully updated status of ${updatedCount} celebration orders to "${bulkTargetStatus}"!`
      );
      setTimeout(() => setBulkSuccessMessage(null), 6000);

      onRefresh();
    } catch (err: any) {
      alert(`Failed to bulk update orders: ${err?.message || 'Firestore update error'}`);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Analytics Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)]">
              Celebration Orders & Delivery Fleet
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20">
              {orders.length} Total
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time bakery tracking, custom pipings, recipient addresses, and dispatch timelines.
          </p>
        </div>

        {/* Live Filter Summary KPI Cards */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center gap-2.5 text-xs">
            <div className="p-1.5 rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--text-subtle)]">Filtered Orders</div>
              <div className="font-bold text-[var(--text-main)] font-mono">
                {filteredOrders.length}{' '}
                <span className="text-[10px] font-normal text-[var(--text-muted)]">
                  ({Math.round((filteredOrders.length / (orders.length || 1)) * 100)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center gap-2.5 text-xs">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--text-subtle)]">Filtered Volume</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                ₹{filteredRevenue.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              id="clear-all-filters-btn"
              onClick={handleClearAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors cursor-pointer border border-rose-500/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Range Filter & Search Controls Container */}
      <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] shadow-xs space-y-4">
        {/* Search and Status Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="orders-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, customer, city, or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              id="orders-status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none font-medium text-xs cursor-pointer"
            >
              <option value="all">All Order Statuses</option>
              <option value="Order Placed">Order Placed</option>
              <option value="Baking in Kitchen">Baking in Kitchen</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Date Range Preset Selector Bar */}
        <div className="pt-2 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-main)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Creation Date:</span>
            </div>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'thisMonth', label: 'This Month' },
                { id: 'custom', label: 'Custom Range' },
              ].map((p) => (
                <button
                  key={p.id}
                  id={`date-preset-${p.id}`}
                  onClick={() => handleApplyPreset(p.id as DatePreset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    datePreset === p.id
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Custom Pickers Button if not already active */}
          {!showCustomDateInputs && datePreset !== 'custom' && (
            <button
              onClick={() => {
                setDatePreset('custom');
                setShowCustomDateInputs(true);
              }}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--primary)] hover:underline cursor-pointer font-medium"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Select Exact Dates</span>
            </button>
          )}
        </div>

        {/* Custom Start & End Date Pickers */}
        {(showCustomDateInputs || datePreset === 'custom' || startDate || endDate) && (
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border)] flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <label htmlFor="order-start-date" className="text-[11px] font-medium text-[var(--text-muted)]">
                From:
              </label>
              <input
                id="order-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="order-end-date" className="text-[11px] font-medium text-[var(--text-muted)]">
                To:
              </label>
              <input
                id="order-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            {isDateFilterActive && (
              <button
                id="clear-date-filter-btn"
                onClick={handleClearDateFilter}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Date Filter</span>
              </button>
            )}

            {activeDateRangeLabel && (
              <div className="ml-auto text-[11px] font-medium text-[var(--primary)] flex items-center gap-1.5 bg-[var(--bg-surface)] px-3 py-1 rounded-lg border border-[var(--border)]">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Showing: <strong>{activeDateRangeLabel}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Success Feedback Banner */}
      {bulkSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">Status Batch Updated!</span>
              <p className="text-[11px] opacity-90 mt-0.5">{bulkSuccessMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setBulkSuccessMessage(null)}
            className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating / Sticky Bulk Action Toolbar */}
      {selectedOrderIds.length > 0 && (
        <div className="sticky top-4 z-20 p-4 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--primary)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] font-bold text-xs">
              <PackageCheck className="w-4 h-4" />
              <span>{selectedOrderIds.length} Order{selectedOrderIds.length > 1 ? 's' : ''} Selected</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              {!isAllFilteredSelected && filteredOrders.length > selectedFilteredOrders.length && (
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  className="text-[var(--primary)] hover:underline font-semibold cursor-pointer"
                >
                  Select all {filteredOrders.length} matching orders
                </button>
              )}
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer ml-1"
              >
                Clear Selection
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Status Action Buttons */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <span className="text-[11px] text-[var(--text-subtle)] font-medium">Quick Set:</span>
              <button
                type="button"
                onClick={() => handleOpenBulkModal('Baking in Kitchen')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 transition-colors cursor-pointer border border-amber-500/20"
              >
                Baking
              </button>
              <button
                type="button"
                onClick={() => handleOpenBulkModal('Out for Delivery')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 transition-colors cursor-pointer border border-purple-500/20"
              >
                Dispatch
              </button>
              <button
                type="button"
                onClick={() => handleOpenBulkModal('Delivered')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors cursor-pointer border border-emerald-500/20"
              >
                Delivered
              </button>
            </div>

            {/* Target Status Select dropdown */}
            <div className="flex items-center gap-2">
              <select
                id="bulk-status-quick-select"
                value={bulkTargetStatus}
                onChange={(e) => setBulkTargetStatus(e.target.value as OrderStatus)}
                className="px-3 py-1.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="Order Placed">Order Placed</option>
                <option value="Baking in Kitchen">Baking in Kitchen</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <button
                id="bulk-update-open-modal-btn"
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="px-4 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Bulk Update ({selectedOrderIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-subtle)]/70 text-[var(--text-subtle)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
              <tr>
                <th className="w-12 py-3.5 px-4 text-center">
                  <input
                    ref={selectAllCheckboxRef}
                    id="select-all-orders-checkbox"
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={handleToggleSelectAllFiltered}
                    className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--ring)] cursor-pointer accent-[var(--primary)]"
                    title={isAllFilteredSelected ? 'Deselect all filtered orders' : 'Select all filtered orders'}
                  />
                </th>
                <th className="py-3.5 px-4 font-semibold">Order ID</th>
                <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                <th className="py-3.5 px-4 font-semibold">Customer & City</th>
                <th className="py-3.5 px-4 font-semibold">Items</th>
                <th className="py-3.5 px-4 font-semibold">Delivery Slot</th>
                <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[var(--text-muted)]">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-main)] text-sm">No orders found</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {isDateFilterActive
                            ? `No orders placed within ${activeDateRangeLabel || 'the selected date range'}.`
                            : 'No celebration orders match your search or status criteria.'}
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <button
                          onClick={handleClearAllFilters}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[var(--primary-light)]/80 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isSelected = selectedOrderIds.includes(ord.id);
                  return (
                    <tr
                      key={ord.id}
                      onClick={() => handleOpenOrderDetail(ord)}
                      className={`hover:bg-[var(--bg-subtle)]/40 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[var(--primary-light)]/20 font-medium' : ''
                      }`}
                    >
                      <td
                        className="w-12 py-3.5 px-4 text-center"
                        onClick={(e) => handleToggleSelectOrder(ord.id, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectOrder(ord.id, e as any)}
                          className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--ring)] cursor-pointer accent-[var(--primary)]"
                          aria-label={`Select order ${ord.orderNumber}`}
                        />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[var(--primary)] font-mono">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-[var(--text-muted)]">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold">{ord.customer?.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{ord.customer?.city}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium truncate max-w-[180px]">
                          {ord.items?.map((i) => i.name).join(', ')}
                        </div>
                        <div className="text-[11px] text-[var(--text-subtle)]">
                          {ord.items?.length || 1} cake recipe(s)
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
                              : ord.status === 'Out for Delivery'
                              ? 'bg-purple-500/10 text-purple-600'
                              : ord.status === 'Delivered'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-red-500/10 text-red-600'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{ord.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button className="p-1.5 rounded-lg text-[var(--primary)] hover:bg-[var(--primary-light)]">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order Details: ${selectedOrder?.orderNumber}`}
        subtitle={`Placed on ${
          selectedOrder ? new Date(selectedOrder.createdAt).toLocaleString('en-IN') : ''
        }`}
        maxWidth="2xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Customer & Address Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-1">
                  Recipient Information
                </div>
                <div className="font-bold text-xs text-[var(--text-main)]">
                  {selectedOrder.customer?.name}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-[var(--primary)]" />
                  <span>{selectedOrder.customer?.phone}</span>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-[var(--primary)]" />
                  <span>{selectedOrder.customer?.email}</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-1">
                  Delivery Destination
                </div>
                <div className="text-xs text-[var(--text-main)] flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[var(--primary)] shrink-0 mt-0.5" />
                  <span>
                    {selectedOrder.customer?.address}, {selectedOrder.customer?.city} -{' '}
                    {selectedOrder.customer?.pincode}
                  </span>
                </div>
                <div className="text-xs text-[var(--primary)] font-semibold mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Slot: {selectedOrder.deliverySlot} ({selectedOrder.deliveryDate})</span>
                </div>
              </div>
            </div>

            {/* Special Instructions & Dietary Preferences Alert Box */}
            {(selectedOrder.specialInstructions ||
              selectedOrder.customer?.specialInstructions ||
              selectedOrder.customer?.instructions ||
              selectedOrder.customer?.giftMessage) && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <ChefHat className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Special Instructions & Dietary Notes</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    Chef Attention Required
                  </span>
                </div>

                {(selectedOrder.specialInstructions || selectedOrder.customer?.specialInstructions) && (
                  <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-amber-500/20 text-[var(--text-main)] font-medium leading-relaxed">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">
                      Toppings & Dietary Requests:
                    </span>
                    &ldquo;{selectedOrder.specialInstructions || selectedOrder.customer?.specialInstructions}&rdquo;
                  </div>
                )}

                {selectedOrder.customer?.instructions &&
                  selectedOrder.customer?.instructions !== (selectedOrder.specialInstructions || selectedOrder.customer?.specialInstructions) && (
                  <div className="text-[11px] text-[var(--text-muted)]">
                    <strong className="text-[var(--text-main)]">Delivery / Gate Note:</strong>{' '}
                    {selectedOrder.customer.instructions}
                  </div>
                )}

                {selectedOrder.customer?.giftMessage && (
                  <div className="text-[11px] text-[var(--primary)] font-medium italic">
                    <strong>Gift Inscription:</strong> &ldquo;{selectedOrder.customer.giftMessage}&rdquo;
                  </div>
                )}
              </div>
            )}

            {/* Ordered Items List */}
            <div>
              <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">
                Ordered Cake Recipes & Custom Pipings
              </h4>
              <div className="space-y-2.5">
                {selectedOrder.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-xs text-[var(--text-main)]">{item.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Weight: {item.weight} • Flavour: {item.flavour} • Qty: {item.qty}
                      </div>

                      {item.messageOnCake && (
                        <div className="mt-1.5 p-2 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold">
                          Piped Inscription: &ldquo;{item.messageOnCake}&rdquo;
                        </div>
                      )}

                      {item.addons && item.addons.length > 0 && (
                        <div className="text-[11px] text-[var(--text-subtle)] mt-1">
                          Add-ons: {item.addons.join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="text-right font-bold text-xs text-[var(--text-main)]">
                      ₹{item.totalPrice || item.unitPrice * item.qty}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Timeline History */}
            <div>
              <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">
                Live Kitchen Status Timeline
              </h4>
              <div className="space-y-2 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                {selectedOrder.statusHistory?.map((hist, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                    <div>
                      <div className="font-bold text-[var(--text-main)]">
                        {hist.status}{' '}
                        <span className="text-[10px] font-normal text-[var(--text-subtle)]">
                          ({new Date(hist.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">{hist.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Update Status Form */}
            <form onSubmit={handleUpdateStatus} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                Advance Order Pipeline
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                    New Pipeline Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none"
                  >
                    <option value="Order Placed">Order Placed</option>
                    <option value="Baking in Kitchen">Baking in Kitchen</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                    Chef / Dispatch Note
                  </label>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="e.g. Dispatched with Rider Ramesh via cold-chain van"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePrintKitchenTicket}
                  className="px-3 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Kitchen Slip</span>
                </button>

                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Save Pipeline Advance'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
      {/* Bulk Status Update Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => !isBulkUpdating && setIsBulkModalOpen(false)}
        title={`Bulk Status Update (${selectedOrderIds.length} Orders)`}
        subtitle="Apply a batch pipeline advance and log chef dispatch notes simultaneously."
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Target Status Selector */}
          <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
            <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
              Select New Target Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { status: 'Order Placed' as OrderStatus, color: 'border-blue-500 text-blue-600 bg-blue-500/10' },
                { status: 'Baking in Kitchen' as OrderStatus, color: 'border-amber-500 text-amber-600 bg-amber-500/10' },
                { status: 'Out for Delivery' as OrderStatus, color: 'border-purple-500 text-purple-600 bg-purple-500/10' },
                { status: 'Delivered' as OrderStatus, color: 'border-emerald-500 text-emerald-600 bg-emerald-500/10' },
                { status: 'Cancelled' as OrderStatus, color: 'border-rose-500 text-rose-600 bg-rose-500/10' },
              ].map((item) => (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => setBulkTargetStatus(item.status)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    bulkTargetStatus === item.status
                      ? `${item.color} shadow-sm ring-2 ring-[var(--ring)]`
                      : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--primary)]/50'
                  }`}
                >
                  <span>{item.status}</span>
                  {bulkTargetStatus === item.status && (
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Dispatch & Audit Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
              Batch Note / Reason (Logged in Status Timeline)
            </label>
            <input
              id="bulk-status-note-input"
              type="text"
              value={bulkStatusNote}
              onChange={(e) => setBulkStatusNote(e.target.value)}
              placeholder={`e.g. Batch updated to ${bulkTargetStatus} by ${user?.name || 'Chef Administrator'}`}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <p className="text-[11px] text-[var(--text-subtle)]">
              This note will be recorded in the live status timeline of each selected order for auditability.
            </p>
          </div>

          {/* List of Orders Being Modified */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                Orders Included in Batch ({selectedAllOrdersList.length})
              </h4>
              <span className="text-[11px] text-[var(--text-muted)]">
                Total Value: ₹{selectedAllOrdersList.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--bg-card)]">
              {selectedAllOrdersList.map((ord) => (
                <div key={ord.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-[var(--primary)]">{ord.orderNumber}</span>
                      <span className="text-[var(--text-main)] font-semibold truncate">
                        {ord.customer?.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                      {ord.customer?.city} • {ord.deliverySlot} • ₹{ord.total}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] font-medium">
                      {ord.status}
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--text-subtle)]" />
                    <span className="px-2 py-0.5 rounded-full font-bold bg-[var(--primary-light)] text-[var(--primary)]">
                      {bulkTargetStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => setIsBulkModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="confirm-bulk-status-update-btn"
              type="button"
              disabled={isBulkUpdating || selectedOrderIds.length === 0}
              onClick={handleExecuteBulkStatusUpdate}
              className="px-5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isBulkUpdating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating {selectedOrderIds.length} Orders...</span>
                </>
              ) : (
                <>
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Update All {selectedOrderIds.length} Orders to &ldquo;{bulkTargetStatus}&rdquo;</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
