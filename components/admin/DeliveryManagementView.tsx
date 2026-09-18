'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  Users,
  Calendar,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Phone,
  Navigation,
  Check,
  ChevronDown,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface Zone {
  id: number;
  name: string;
  city?: string | null;
  fee: number;
  free_delivery_threshold?: number | null;
  min_order_value?: number;
  est_delivery_time?: string | null;
  active: number;
}

interface Pincode {
  id: number;
  zone_id?: number | null;
  pincode: string;
  available: number;
  zone_name?: string;
}

interface Slot {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  capacity: number;
  books: number;
  fee: number;
  cutoff_minutes?: number;
  available: number;
  days?: string;
}

interface Driver {
  id: number;
  name: string;
  phone: string;
  vehicle_type?: string;
  vehicle_number?: string;
  status: 'available' | 'on_delivery' | 'off_duty';
  active: number;
  notes?: string;
  active_deliveries_count?: number;
}

interface DeliveryOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  city?: string;
  pincode?: string;
  delivery_date?: string;
  delivery_slot?: string;
  delivery_slot_id?: number;
  delivery_zone_id?: number;
  driver_id?: number;
  delivery_status?: string;
  dispatched_at?: string;
  delivered_at?: string;
  delivery_failure_reason?: string;
  order_status: string;
  total: number;
  items: Array<{ name: string; qty: number; weight?: string; flavour?: string }>;
  tracking_note?: string;
  zone_name?: string;
  driver_name?: string;
  driver_phone?: string;
}

interface BufferSetting {
  id: number;
  key: string;
  label?: string;
  value: number;
  unit?: string;
}

interface BlackoutDate {
  id: number;
  date: string;
  reason?: string;
  type?: string;
}

type SubTab = 'dispatch' | 'zones' | 'slots' | 'buffers' | 'drivers';

export const DeliveryManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SubTab>('dispatch');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delivery data state
  const [zones, setZones] = useState<Zone[]>([]);
  const [pincodes, setPincodes] = useState<Pincode[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [buffers, setBuffers] = useState<BufferSetting[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);

  // Filters
  const [dispatchDateFilter, setDispatchDateFilter] = useState<string>('all');
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState<string>('all');
  const [pincodeSearch, setPincodeSearch] = useState<string>('');

  // Modals
  const [isZoneModalOpen, setIsZoneModalOpen] = useState<boolean>(false);
  const [editingZone, setEditingZone] = useState<Partial<Zone> | null>(null);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState<boolean>(false);
  const [editingDriver, setEditingDriver] = useState<Partial<Driver> | null>(null);

  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<Partial<Slot> | null>(null);

  const [isBulkPincodeOpen, setIsBulkPincodeOpen] = useState<boolean>(false);
  const [bulkZoneId, setBulkZoneId] = useState<number | ''>('');
  const [bulkPincodesText, setBulkPincodesText] = useState<string>('');

  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState<boolean>(false);
  const [newBlackoutDate, setNewBlackoutDate] = useState<string>('');
  const [newBlackoutReason, setNewBlackoutReason] = useState<string>('');

  const [failureModalOrder, setFailureModalOrder] = useState<DeliveryOrder | null>(null);
  const [failureReason, setFailureReason] = useState<string>('');

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchDeliveryData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [delivRes, ordersRes] = await Promise.all([
        fetch('/api/admin?type=delivery'),
        fetch(`/api/admin?type=deliveries${dispatchDateFilter !== 'all' ? `&date=${dispatchDateFilter}` : ''}${dispatchStatusFilter !== 'all' ? `&status=${dispatchStatusFilter}` : ''}`),
      ]);

      const delivData = await delivRes.json();
      const ordersData = await ordersRes.json();

      if (delivData) {
        setZones(delivData.zones || []);
        setPincodes(delivData.pincodes || []);
        setSlots(delivData.slots || []);
        setDrivers(delivData.drivers || []);
        setBuffers(delivData.buffers || []);
        setBlackouts(delivData.blackout || []);
      }
      if (ordersData?.deliveries) {
        setDeliveries(ordersData.deliveries);
      }
    } catch (err: any) {
      showFeedback('error', 'Failed to load delivery configuration');
    } finally {
      setIsLoading(false);
    }
  }, [dispatchDateFilter, dispatchStatusFilter]);

  useEffect(() => {
    fetchDeliveryData();
  }, [fetchDeliveryData]);

  // Handle Driver Assignment
  const handleAssignDriver = async (orderId: number, driverId: number | null) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'orders',
          action: 'assign_driver',
          id: orderId,
          driver_id: driverId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback('success', driverId ? 'Driver assigned successfully' : 'Driver unassigned');
        fetchDeliveryData();
      } else {
        showFeedback('error', data.error || 'Failed to assign driver');
      }
    } catch {
      showFeedback('error', 'Error assigning driver');
    }
  };

  // Handle Delivery Status Change
  const handleStatusChange = async (orderId: number, deliveryStatus: string, reason?: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'orders',
          action: 'delivery_status',
          id: orderId,
          delivery_status: deliveryStatus,
          failure_reason: reason,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback('success', `Delivery marked as ${deliveryStatus}`);
        setFailureModalOrder(null);
        setFailureReason('');
        fetchDeliveryData();
      } else {
        showFeedback('error', data.error || 'Failed to update delivery status');
      }
    } catch {
      showFeedback('error', 'Error updating delivery status');
    }
  };

  // Save Zone
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone?.name) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delivery_zones',
          action: 'save',
          ...editingZone,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback('success', 'Zone saved successfully');
        setIsZoneModalOpen(false);
        setEditingZone(null);
        fetchDeliveryData();
      } else {
        showFeedback('error', data.error || 'Failed to save zone');
      }
    } catch {
      showFeedback('error', 'Network error');
    }
  };

  // Delete Zone
  const handleDeleteZone = async (id: number) => {
    if (!confirm('Are you sure you want to delete this zone? Serviceable pincodes will be unlinked.')) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delivery_zones', action: 'delete', id }),
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback('success', 'Zone deleted');
        fetchDeliveryData();
      } else {
        showFeedback('error', data.error || 'Failed to delete zone');
      }
    } catch {
      showFeedback('error', 'Error deleting zone');
    }
  };

  // Save Driver
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver?.name || !editingDriver?.phone) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'drivers',
          action: 'save',
          ...editingDriver,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback('success', 'Driver saved successfully');
        setIsDriverModalOpen(false);
        setEditingDriver(null);
        fetchDeliveryData();
      } else {
        showFeedback('error', data.error || 'Failed to save driver');
      }
    } catch {
      showFeedback('error', 'Network error');
    }
  };

  // Delete Driver
  const handleDeleteDriver = async (id: number) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'drivers', action: 'delete', id }),
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback('success', 'Driver deleted');
        fetchDeliveryData();
      } else {
        showFeedback('error', data.error || 'Failed to delete driver');
      }
    } catch {
      showFeedback('error', 'Error deleting driver');
    }
  };

  // Save Slot
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot?.name || !editingSlot?.start_time || !editingSlot?.end_time) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delivery_slots',
          action: 'save',
          ...editingSlot,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback('success', 'Slot template saved');
        setIsSlotModalOpen(false);
        setEditingSlot(null);
        fetchDeliveryData();
      } else {
        showFeedback('error', data.error || 'Failed to save slot');
      }
    } catch {
      showFeedback('error', 'Network error');
    }
  };

  // Bulk Add Pincodes
  const handleBulkAddPincodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkZoneId || !bulkPincodesText.trim()) return;
    const codes = bulkPincodesText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d{6}$/.test(s));

    if (codes.length === 0) {
      showFeedback('error', 'No valid 6-digit PIN codes found in text');
      return;
    }

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pincodes',
          action: 'bulk_create',
          zone_id: bulkZoneId,
          pincodes: codes,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback('success', `Added/updated ${data.count} pincodes`);
        setIsBulkPincodeOpen(false);
        setBulkPincodesText('');
        fetchDeliveryData();
      } else {
        showFeedback('error', data.error || 'Failed to add pincodes');
      }
    } catch {
      showFeedback('error', 'Network error');
    }
  };

  // Toggle Pincode
  const handleTogglePincode = async (pin: Pincode) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pincodes',
          action: 'save',
          zone_id: pin.zone_id,
          pincode: pin.pincode,
          available: pin.available ? 0 : 1,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchDeliveryData();
      }
    } catch {
      showFeedback('error', 'Error updating pincode');
    }
  };

  // Delete Pincode
  const handleDeletePincode = async (id: number) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pincodes', action: 'delete', id }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchDeliveryData();
      }
    } catch {
      showFeedback('error', 'Error deleting pincode');
    }
  };

  // Add Blackout
  const handleAddBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlackoutDate) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'blackout',
          action: 'save',
          date: newBlackoutDate,
          reason: newBlackoutReason || 'Kitchen Closed / Holiday',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback('success', 'Blackout date added');
        setIsBlackoutModalOpen(false);
        setNewBlackoutDate('');
        setNewBlackoutReason('');
        fetchDeliveryData();
      } else {
        showFeedback('error', data.error || 'Failed to add blackout');
      }
    } catch {
      showFeedback('error', 'Network error');
    }
  };

  // Delete Blackout
  const handleDeleteBlackout = async (id: number) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'blackout', action: 'delete', id }),
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback('success', 'Blackout date removed');
        fetchDeliveryData();
      }
    } catch {
      showFeedback('error', 'Error removing blackout');
    }
  };

  // Save Buffer Setting
  const handleSaveBuffer = async (b: BufferSetting, newVal: number) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'buffer',
          action: 'save',
          key: b.key,
          label: b.label,
          value: newVal,
          unit: b.unit,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showFeedback('success', `${b.label || b.key} updated`);
        fetchDeliveryData();
      }
    } catch {
      showFeedback('error', 'Error saving buffer setting');
    }
  };

  // Filtered Pincodes
  const filteredPincodes = pincodes.filter((p) => {
    if (!pincodeSearch.trim()) return true;
    const q = pincodeSearch.toLowerCase();
    return p.pincode.includes(q) || (p.zone_name && p.zone_name.toLowerCase().includes(q));
  });

  // Calculate Dispatch Metrics
  const totalDeliveries = deliveries.length;
  const outForDeliveryCount = deliveries.filter((d) => d.delivery_status === 'out_for_delivery').length;
  const deliveredCount = deliveries.filter((d) => d.delivery_status === 'delivered').length;
  const pendingCount = deliveries.filter((d) => !d.delivery_status || d.delivery_status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-[var(--gold)]" />
            <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)]">
              Advanced Delivery & Fleet Management
            </h1>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage delivery dispatch, serviceable zones, slots, cut-off rules, and driver roster.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDeliveryData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[var(--gold)]' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'dispatch'
              ? 'bg-[var(--gold)] text-black shadow-sm font-semibold'
              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <Navigation className="w-4 h-4" />
          Dispatch & Deliveries ({deliveries.length})
        </button>
        <button
          onClick={() => setActiveTab('zones')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'zones'
              ? 'bg-[var(--gold)] text-black shadow-sm font-semibold'
              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Zones & Pincodes ({zones.length} Zones, {pincodes.length} PINs)
        </button>
        <button
          onClick={() => setActiveTab('slots')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'slots'
              ? 'bg-[var(--gold)] text-black shadow-sm font-semibold'
              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <Clock className="w-4 h-4" />
          Slots & Capacity ({slots.length} Slots)
        </button>
        <button
          onClick={() => setActiveTab('buffers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'buffers'
              ? 'bg-[var(--gold)] text-black shadow-sm font-semibold'
              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Buffer & Cutoffs ({blackouts.length} Blackouts)
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'drivers'
              ? 'bg-[var(--gold)] text-black shadow-sm font-semibold'
              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <Users className="w-4 h-4" />
          Driver Roster ({drivers.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DISPATCH & ACTIVE DELIVERIES */}
      {/* ========================================================================= */}
      {activeTab === 'dispatch' && (
        <div className="space-y-6">
          {/* Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[var(--surface-primary)] border border-[var(--border)] p-4 rounded-xl">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total Scheduled</span>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{totalDeliveries}</p>
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border)] p-4 rounded-xl">
              <span className="text-xs text-amber-500 dark:text-amber-400 uppercase tracking-wider font-medium">Pending Assignment</span>
              <p className="text-2xl font-bold text-amber-500 dark:text-amber-400 mt-1">{pendingCount}</p>
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border)] p-4 rounded-xl">
              <span className="text-xs text-blue-500 dark:text-blue-400 uppercase tracking-wider font-medium">Out for Delivery</span>
              <p className="text-2xl font-bold text-blue-500 dark:text-blue-400 mt-1">{outForDeliveryCount}</p>
            </div>
            <div className="bg-[var(--surface-primary)] border border-[var(--border)] p-4 rounded-xl">
              <span className="text-xs text-emerald-500 dark:text-emerald-400 uppercase tracking-wider font-medium">Delivered</span>
              <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400 mt-1">{deliveredCount}</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-secondary)] p-3 rounded-xl border border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Status:</span>
              {(['all', 'pending', 'assigned', 'out_for_delivery', 'delivered', 'failed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setDispatchStatusFilter(st)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all cursor-pointer ${
                    dispatchStatusFilter === st
                      ? 'bg-[var(--gold)] text-black font-semibold shadow-xs'
                      : 'bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Date:</span>
              <input
                type="date"
                value={dispatchDateFilter === 'all' ? '' : dispatchDateFilter}
                onChange={(e) => setDispatchDateFilter(e.target.value || 'all')}
                className="px-2 py-1 text-xs bg-[var(--surface-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
              />
              {dispatchDateFilter !== 'all' && (
                <button
                  onClick={() => setDispatchDateFilter('all')}
                  className="text-xs text-[var(--gold)] hover:underline font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Deliveries List */}
          {deliveries.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-primary)]">
              <Truck className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-[var(--text-secondary)]">No scheduled deliveries match the selected filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliveries.map((order) => {
                const statusBadge =
                  order.delivery_status === 'delivered'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : order.delivery_status === 'out_for_delivery'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                    : order.delivery_status === 'failed'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : order.delivery_status === 'assigned'
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';

                return (
                  <div
                    key={order.id}
                    className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between hover:border-[var(--gold)] transition-colors shadow-sm"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-2 mb-3">
                        <div>
                          <span className="font-mono text-xs font-bold text-[var(--gold)]">
                            #{order.order_number}
                          </span>
                          <h3 className="font-semibold text-sm text-[var(--text-primary)] mt-0.5">
                            {order.customer_name}
                          </h3>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${statusBadge}`}>
                          {(order.delivery_status || 'Pending').replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
                          <span>
                            {order.delivery_date || 'Date not set'} ({order.delivery_slot || 'Standard'})
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[var(--gold)] shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {order.customer_address ? `${order.customer_address}, ` : ''}
                            {order.city} {order.pincode}
                          </span>
                        </div>
                        {order.customer_phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            <span>{order.customer_phone}</span>
                          </div>
                        )}
                        {order.zone_name && (
                          <div className="inline-block bg-[var(--surface-secondary)] px-2 py-0.5 rounded text-[11px] font-medium text-[var(--text-primary)]">
                            Zone: {order.zone_name}
                          </div>
                        )}
                        {order.items && order.items.length > 0 && (
                          <div className="bg-[var(--surface-secondary)] p-2 rounded-lg mt-2 space-y-1">
                            <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase">Items:</span>
                            {order.items.slice(0, 3).map((it, idx) => (
                              <div key={idx} className="flex justify-between text-[11px]">
                                <span className="truncate max-w-[180px]">{it.qty}x {it.name}</span>
                                <span className="text-[var(--text-muted)]">{it.weight || it.flavour || ''}</span>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <span className="text-[10px] text-[var(--gold)] font-medium">
                                +{order.items.length - 3} more items
                              </span>
                            )}
                          </div>
                        )}
                        {order.delivery_failure_reason && (
                          <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[11px]">
                            <strong>Failure Reason:</strong> {order.delivery_failure_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Driver Assignment & Status Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-medium text-[var(--text-muted)]">Driver:</label>
                        <select
                          value={order.driver_id || ''}
                          onChange={(e) => handleAssignDriver(order.id, e.target.value ? Number(e.target.value) : null)}
                          className="flex-1 text-xs bg-[var(--surface-secondary)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)]"
                        >
                          <option value="">Unassigned</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id} disabled={!d.active}>
                              {d.name} ({d.vehicle_type || 'Vehicle'}) {!d.active ? '[Inactive]' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {order.delivery_status !== 'out_for_delivery' && order.delivery_status !== 'delivered' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'out_for_delivery')}
                            className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium transition-colors"
                          >
                            Out for Delivery
                          </button>
                        )}
                        {order.delivery_status !== 'delivered' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'delivered')}
                            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium transition-colors"
                          >
                            Delivered
                          </button>
                        )}
                        {order.delivery_status !== 'delivered' && order.delivery_status !== 'failed' && (
                          <button
                            onClick={() => {
                              setFailureModalOrder(order);
                              setFailureReason('');
                            }}
                            className="py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded text-[11px] font-medium transition-colors"
                          >
                            Failed
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DELIVERY ZONES & PINCODES */}
      {/* ========================================================================= */}
      {activeTab === 'zones' && (
        <div className="space-y-8">
          {/* Zones Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Delivery Zones</h2>
                <p className="text-xs text-[var(--text-muted)]">Configure zone delivery fees, minimum orders, and delivery times.</p>
              </div>
              <button
                onClick={() => {
                  setEditingZone({ active: 1, fee: 49, min_order_value: 0 });
                  setIsZoneModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--gold)] text-black rounded-lg text-xs font-semibold hover:opacity-90"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Zone
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-base text-[var(--text-primary)]">{zone.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                          zone.active
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
                        }`}
                      >
                        {zone.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {zone.city && <p className="text-xs text-[var(--text-muted)]">{zone.city}</p>}

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex justify-between border-b border-[var(--border)] pb-1">
                        <span className="text-[var(--text-muted)]">Standard Fee:</span>
                        <span className="font-semibold text-[var(--text-primary)]">₹{zone.fee}</span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border)] pb-1">
                        <span className="text-[var(--text-muted)]">Free Delivery Over:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {zone.free_delivery_threshold ? `₹${zone.free_delivery_threshold}` : 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border)] pb-1">
                        <span className="text-[var(--text-muted)]">Min. Order Value:</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {zone.min_order_value ? `₹${zone.min_order_value}` : 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border)] pb-1">
                        <span className="text-[var(--text-muted)]">Estimated Window:</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {zone.est_delivery_time || 'Standard'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-[var(--text-muted)]">Mapped PINs:</span>
                        <span className="font-semibold text-[var(--gold)]">
                          {pincodes.filter((p) => p.zone_id === zone.id).length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[var(--border)] flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingZone(zone);
                        setIsZoneModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteZone(zone.id)}
                      className="px-2.5 py-1 text-xs border border-rose-500/30 text-rose-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Serviceable Pincodes Section */}
          <div className="border-t border-[var(--border)] pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Serviceable Pincodes</h2>
                <p className="text-xs text-[var(--text-muted)]">Manage all 6-digit Indian PIN codes mapped to delivery zones.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search pincode or zone..."
                    value={pincodeSearch}
                    onChange={(e) => setPincodeSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-[var(--surface-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] w-48"
                  />
                </div>
                <button
                  onClick={() => setIsBulkPincodeOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--gold)] text-black rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Bulk Add PINs
                </button>
              </div>
            </div>

            <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-primary)]">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-muted)] font-semibold uppercase">
                    <tr>
                      <th className="p-3">PIN Code</th>
                      <th className="p-3">Zone</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredPincodes.map((pin) => (
                      <tr key={pin.id} className="hover:bg-[var(--surface-secondary)]/50">
                        <td className="p-3 font-mono font-bold text-[var(--text-primary)]">{pin.pincode}</td>
                        <td className="p-3 text-[var(--text-secondary)]">{pin.zone_name || 'Unassigned'}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleTogglePincode(pin)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors cursor-pointer ${
                              pin.available
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                            }`}
                          >
                            {pin.available ? 'Serviceable' : 'Suspended'}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeletePincode(pin.id)}
                            className="p-1 text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Pincode"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SLOTS & CAPACITY CONTROL */}
      {/* ========================================================================= */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recurring Time Slots</h2>
              <p className="text-xs text-[var(--text-muted)]">Configure two-hour delivery slots, base capacities, evening fees, and same-day cut-off lead times.</p>
            </div>
            <button
              onClick={() => {
                setEditingSlot({ capacity: 20, fee: 0, cutoff_minutes: 120, available: 1 });
                setIsSlotModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--gold)] text-black rounded-lg text-xs font-semibold hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Time Slot
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">{slot.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                        slot.available
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
                      }`}
                    >
                      {slot.available ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-[var(--border)] pb-1">
                      <span className="text-[var(--text-muted)]">Time Range:</span>
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        {slot.start_time} - {slot.end_time}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)] pb-1">
                      <span className="text-[var(--text-muted)]">Default Capacity:</span>
                      <span className="font-semibold text-[var(--text-primary)]">{slot.capacity} orders</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)] pb-1">
                      <span className="text-[var(--text-muted)]">Evening Surcharge:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {slot.fee > 0 ? `+₹${slot.fee}` : 'Free'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)] pb-1">
                      <span className="text-[var(--text-muted)]">Cut-off Notice:</span>
                      <span className="font-semibold text-[var(--gold)]">
                        {slot.cutoff_minutes || 120} min prior
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border)] flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingSlot(slot);
                      setIsSlotModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                    Edit Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BUFFER & CUTOFF RULES */}
      {/* ========================================================================= */}
      {activeTab === 'buffers' && (
        <div className="space-y-8">
          {/* Buffer Settings */}
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Lead Time & Preparation Buffers</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">Kitchen baking buffers and minimum order advance notice rules.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {buffers.map((buf) => (
                <div key={buf.id} className="bg-[var(--surface-primary)] border border-[var(--border)] p-4 rounded-xl">
                  <span className="text-xs text-[var(--text-muted)] font-medium uppercase">{buf.label || buf.key}</span>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      defaultValue={buf.value}
                      onBlur={(e) => handleSaveBuffer(buf, Number(e.target.value))}
                      className="w-24 px-2 py-1 bg-[var(--surface-secondary)] border border-[var(--border)] rounded text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                    <span className="text-xs text-[var(--text-secondary)]">{buf.unit || 'minutes'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blackout Dates */}
          <div className="border-t border-[var(--border)] pt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Holiday & Blackout Dates</h2>
                <p className="text-xs text-[var(--text-muted)]">Block customer order placement on bakery closures or maintenance holidays.</p>
              </div>
              <button
                onClick={() => setIsBlackoutModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--gold)] text-black rounded-lg text-xs font-semibold hover:opacity-90"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Blackout Date
              </button>
            </div>

            {blackouts.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-primary)]">
                <Calendar className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[var(--text-secondary)]">No upcoming blackout dates configured. Kitchen is open every day.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {blackouts.map((b) => (
                  <div key={b.id} className="bg-[var(--surface-primary)] border border-[var(--border)] p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{b.date}</span>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{b.reason || 'Closed'}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteBlackout(b.id)}
                      className="p-1 text-rose-500 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DRIVER ROSTER */}
      {/* ========================================================================= */}
      {activeTab === 'drivers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Delivery Fleet & Drivers</h2>
              <p className="text-xs text-[var(--text-muted)]">Manage active couriers, assigned vehicles, and delivery dispatch duty rosters.</p>
            </div>
            <button
              onClick={() => {
                setEditingDriver({ status: 'available', active: 1, vehicle_type: 'Two Wheeler' });
                setIsDriverModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--gold)] text-black rounded-lg text-xs font-semibold hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Driver
            </button>
          </div>

          {drivers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-primary)]">
              <Users className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-[var(--text-secondary)]">No drivers registered in the fleet yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-[var(--text-primary)]">{driver.name}</h3>
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {driver.phone}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border capitalize ${
                          driver.status === 'available'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : driver.status === 'on_delivery'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
                        }`}
                      >
                        {driver.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex justify-between border-b border-[var(--border)] pb-1">
                        <span className="text-[var(--text-muted)]">Vehicle:</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {driver.vehicle_type || 'Two Wheeler'} {driver.vehicle_number ? `(${driver.vehicle_number})` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border)] pb-1">
                        <span className="text-[var(--text-muted)]">Active Orders:</span>
                        <span className="font-semibold text-[var(--gold)]">
                          {driver.active_deliveries_count || 0}
                        </span>
                      </div>
                      {driver.notes && (
                        <p className="text-[11px] text-[var(--text-muted)] italic mt-2">
                          "{driver.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingDriver(driver);
                        setIsDriverModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDriver(driver.id)}
                      className="px-2.5 py-1 text-xs border border-rose-500/30 text-rose-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Zone Modal */}
      {isZoneModalOpen && editingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              {editingZone.id ? 'Edit Delivery Zone' : 'Add Delivery Zone'}
            </h3>
            <form onSubmit={handleSaveZone} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Zone Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gurugram Prime"
                  value={editingZone.name || ''}
                  onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">City / Region</label>
                <input
                  type="text"
                  placeholder="e.g. Gurugram"
                  value={editingZone.city || ''}
                  onChange={(e) => setEditingZone({ ...editingZone, city: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Base Delivery Fee (₹)</label>
                  <input
                    type="number"
                    value={editingZone.fee ?? 49}
                    onChange={(e) => setEditingZone({ ...editingZone, fee: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Free Delivery Min (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 499"
                    value={editingZone.free_delivery_threshold || ''}
                    onChange={(e) => setEditingZone({ ...editingZone, free_delivery_threshold: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Min. Order Value (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={editingZone.min_order_value || 0}
                    onChange={(e) => setEditingZone({ ...editingZone, min_order_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Estimated Window</label>
                  <input
                    type="text"
                    placeholder="e.g. 60 min"
                    value={editingZone.est_delivery_time || ''}
                    onChange={(e) => setEditingZone({ ...editingZone, est_delivery_time: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="zoneActiveCheck"
                  checked={editingZone.active !== 0}
                  onChange={(e) => setEditingZone({ ...editingZone, active: e.target.checked ? 1 : 0 })}
                  className="rounded border-[var(--border)] text-[var(--gold)] cursor-pointer"
                />
                <label htmlFor="zoneActiveCheck" className="text-[var(--text-primary)] font-medium cursor-pointer">
                  Active (accepting customer orders)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--gold)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Save Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Modal */}
      {isDriverModalOpen && editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              {editingDriver.id ? 'Edit Driver' : 'Add New Driver'}
            </h3>
            <form onSubmit={handleSaveDriver} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Driver Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={editingDriver.name || ''}
                  onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={editingDriver.phone || ''}
                  onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Vehicle Type</label>
                  <select
                    value={editingDriver.vehicle_type || 'Two Wheeler'}
                    onChange={(e) => setEditingDriver({ ...editingDriver, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] [&>option]:bg-[var(--surface-secondary)] [&>option]:text-[var(--text-primary)]"
                  >
                    <option value="Two Wheeler">Two Wheeler (Bike/Scooter)</option>
                    <option value="Van">Delivery Van</option>
                    <option value="Car">Car</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="HR 26 XX 1234"
                    value={editingDriver.vehicle_number || ''}
                    onChange={(e) => setEditingDriver({ ...editingDriver, vehicle_number: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Duty Status</label>
                <select
                  value={editingDriver.status || 'available'}
                  onChange={(e) => setEditingDriver({ ...editingDriver, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] [&>option]:bg-[var(--surface-secondary)] [&>option]:text-[var(--text-primary)]"
                >
                  <option value="available">Available</option>
                  <option value="on_delivery">On Delivery</option>
                  <option value="off_duty">Off Duty</option>
                </select>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Notes about driver, route preferences..."
                  value={editingDriver.notes || ''}
                  onChange={(e) => setEditingDriver({ ...editingDriver, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="driverActiveCheck"
                  checked={editingDriver.active !== 0}
                  onChange={(e) => setEditingDriver({ ...editingDriver, active: e.target.checked ? 1 : 0 })}
                  className="rounded border-[var(--border)] text-[var(--gold)] cursor-pointer"
                />
                <label htmlFor="driverActiveCheck" className="text-[var(--text-primary)] font-medium cursor-pointer">
                  Active Driver
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--gold)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Save Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slot Modal */}
      {isSlotModalOpen && editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              {editingSlot.id ? 'Edit Time Slot' : 'Add Time Slot'}
            </h3>
            <form onSubmit={handleSaveSlot} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Slot Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Afternoon (01:00 PM - 03:00 PM)"
                  value={editingSlot.name || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Start Time (24h) *</label>
                  <input
                    type="text"
                    required
                    placeholder="13:00"
                    value={editingSlot.start_time || ''}
                    onChange={(e) => setEditingSlot({ ...editingSlot, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">End Time (24h) *</label>
                  <input
                    type="text"
                    required
                    placeholder="15:00"
                    value={editingSlot.end_time || ''}
                    onChange={(e) => setEditingSlot({ ...editingSlot, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Default Capacity</label>
                  <input
                    type="number"
                    value={editingSlot.capacity ?? 20}
                    onChange={(e) => setEditingSlot({ ...editingSlot, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Evening/Special Fee (₹)</label>
                  <input
                    type="number"
                    value={editingSlot.fee ?? 0}
                    onChange={(e) => setEditingSlot({ ...editingSlot, fee: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Same-Day Cut-off Notice (Minutes)</label>
                <input
                  type="number"
                  placeholder="120"
                  value={editingSlot.cutoff_minutes ?? 120}
                  onChange={(e) => setEditingSlot({ ...editingSlot, cutoff_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  How many minutes prior to slot start time the customer must place their order (default: 120 min = 2 hours).
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="slotActiveCheck"
                  checked={editingSlot.available !== 0}
                  onChange={(e) => setEditingSlot({ ...editingSlot, available: e.target.checked ? 1 : 0 })}
                  className="rounded border-[var(--border)] text-[var(--gold)] cursor-pointer"
                />
                <label htmlFor="slotActiveCheck" className="text-[var(--text-primary)] font-medium cursor-pointer">
                  Active Slot
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--gold)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Pincode Modal */}
      {isBulkPincodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Bulk Add Serviceable Pincodes</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Select a delivery zone and paste Indian PIN codes separated by commas or newlines.
            </p>
            <form onSubmit={handleBulkAddPincodes} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Target Zone *</label>
                <select
                  required
                  value={bulkZoneId}
                  onChange={(e) => setBulkZoneId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] [&>option]:bg-[var(--surface-secondary)] [&>option]:text-[var(--text-primary)]"
                >
                  <option value="">Select a zone...</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.city || 'Standard'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">PIN Codes (6 Digits) *</label>
                <textarea
                  required
                  rows={6}
                  placeholder="122001, 122002&#10;122003&#10;122018"
                  value={bulkPincodesText}
                  onChange={(e) => setBulkPincodesText(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBulkPincodeOpen(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--gold)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Import PINs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blackout Modal */}
      {isBlackoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Add Holiday Blackout Date</h3>
            <form onSubmit={handleAddBlackout} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Date *</label>
                <input
                  type="date"
                  required
                  value={newBlackoutDate}
                  onChange={(e) => setNewBlackoutDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Closure Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Kitchen Maintenance"
                  value={newBlackoutReason}
                  onChange={(e) => setNewBlackoutReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBlackoutModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--gold)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Add Blackout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Failure Reason Modal */}
      {failureModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-500 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold">Mark Delivery as Failed</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Order #{failureModalOrder.order_number} for {failureModalOrder.customer_name}
            </p>
            <div className="space-y-3 text-xs">
              <label className="block text-[var(--text-secondary)] font-medium">Reason for Delivery Failure:</label>
              <select
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] [&>option]:bg-[var(--surface-secondary)] [&>option]:text-[var(--text-primary)]"
              >
                <option value="">Select reason...</option>
                <option value="Customer unavailable / Phone unanswered">Customer unavailable / Phone unanswered</option>
                <option value="Incorrect address / Door locked">Incorrect address / Door locked</option>
                <option value="Customer refused delivery">Customer refused delivery</option>
                <option value="Vehicle breakdown / Traffic delay">Vehicle breakdown / Traffic delay</option>
                <option value="Other delivery complication">Other delivery complication</option>
              </select>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setFailureModalOrder(null)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(failureModalOrder.id, 'failed', failureReason || 'Delivery unfulfilled')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Confirm Failed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
