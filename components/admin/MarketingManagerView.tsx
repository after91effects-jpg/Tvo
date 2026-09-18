'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Percent,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Search,
  Megaphone,
  Mail,
  Send,
  Sparkles,
  Award,
  Clock,
  ChevronRight,
  RefreshCw,
  Sliders,
  DollarSign,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { exportCustomersToCSV } from '../../lib/csvHelpers';

interface Coupon {
  id?: number;
  code: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  min_order: number;
  max_discount?: number | null;
  max_uses?: number | null;
  uses?: number;
  active: number | boolean;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_first_order_only?: boolean;
}

interface Banner {
  id?: number;
  title: string;
  subtitle?: string;
  image?: string;
  cta_text?: string;
  cta_link?: string;
  active: number | boolean;
  sort_order?: number;
}

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  group_name?: string;
  notes?: string;
  total_spend?: number;
  order_count?: number;
  created_at?: string;
  lastOrder?: {
    order_number: string;
    created_at: string;
    total: number;
  } | null;
}

export const MarketingManagerView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'coupons' | 'banners' | 'crm' | 'communication'>('coupons');

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState<Coupon>({
    code: '',
    discount_type: 'percent',
    discount_value: 10,
    min_order: 0,
    max_discount: null,
    max_uses: null,
    active: 1,
    description: '',
    is_first_order_only: false,
    ends_at: '',
  });

  // Banners state
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerForm, setBannerForm] = useState<Banner>({
    title: '',
    subtitle: '',
    image: '',
    cta_text: 'Shop Now',
    cta_link: '/category/cakes',
    active: 1,
  });

  // CRM state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | 'VIP' | 'REPEAT' | 'NEW' | 'INACTIVE'>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [customerGroup, setCustomerGroup] = useState('');

  // Communication state
  const [commTarget, setCommTarget] = useState<'ALL' | 'VIP' | 'REPEAT' | 'NEW'>('ALL');
  const [commChannel, setCommChannel] = useState<'EMAIL' | 'IN_APP' | 'SMS'>('EMAIL');
  const [commSubject, setCommSubject] = useState('');
  const [commMessage, setCommMessage] = useState('');
  const [commSentNotice, setCommSentNotice] = useState<string | null>(null);

  // Status & Notification feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Fetch Coupons
  const fetchCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const res = await fetch('/api/admin?type=coupons_full');
      const data = await res.json();
      if (res.ok && data.coupons) {
        setCoupons(data.coupons);
      }
    } catch (e) {
      console.error('Failed to load coupons', e);
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  // Fetch Banners
  const fetchBanners = useCallback(async () => {
    setLoadingBanners(true);
    try {
      const res = await fetch('/api/admin?type=banners');
      const data = await res.json();
      if (res.ok && data.banners) {
        setBanners(data.banners);
      }
    } catch (e) {
      console.error('Failed to load banners', e);
    } finally {
      setLoadingBanners(false);
    }
  }, []);

  // Fetch Customers for CRM
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?type=customers_page&limit=200');
      const data = await res.json();
      if (res.ok && data.customers) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error('Failed to load customers', e);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
    fetchBanners();
    fetchCustomers();
  }, [fetchCoupons, fetchBanners, fetchCustomers]);

  // Handle Coupon Submit
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code.trim()) {
      showFeedback('error', 'Coupon code is required');
      return;
    }

    try {
      const payload = {
        type: 'coupons',
        action: 'save_full',
        ...couponForm,
        code: couponForm.code.toUpperCase().trim(),
        id: editingCoupon?.id,
      };

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save coupon');
      }

      showFeedback('success', editingCoupon ? 'Coupon updated successfully' : 'Coupon created successfully');
      setCouponModalOpen(false);
      setEditingCoupon(null);
      fetchCoupons();
    } catch (err: any) {
      showFeedback('error', err.message || 'Error saving coupon');
    }
  };

  // Handle Delete Coupon
  const handleDeleteCoupon = async (id: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'coupons', action: 'delete', id }),
      });
      if (res.ok) {
        showFeedback('success', 'Coupon deleted');
        fetchCoupons();
      } else {
        const d = await res.json();
        showFeedback('error', d.error || 'Failed to delete coupon');
      }
    } catch (e: any) {
      showFeedback('error', e.message || 'Error deleting coupon');
    }
  };

  // Handle Banner Save
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim()) {
      showFeedback('error', 'Banner title is required');
      return;
    }

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'banners',
          action: 'save',
          ...bannerForm,
        }),
      });
      if (res.ok) {
        showFeedback('success', 'Banner saved');
        setBannerModalOpen(false);
        fetchBanners();
      } else {
        const d = await res.json();
        showFeedback('error', d.error || 'Failed to save banner');
      }
    } catch (e: any) {
      showFeedback('error', e.message || 'Error saving banner');
    }
  };

  // Handle Customer Update
  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'customer',
          action: 'update',
          id: selectedCustomer.id,
          fields: {
            notes: customerNotes,
            group_name: customerGroup,
          },
        }),
      });
      if (res.ok) {
        showFeedback('success', 'Customer profile updated');
        setSelectedCustomer({
          ...selectedCustomer,
          notes: customerNotes,
          group_name: customerGroup,
        });
        fetchCustomers();
      } else {
        const d = await res.json();
        showFeedback('error', d.error || 'Failed to update customer');
      }
    } catch (e: any) {
      showFeedback('error', e.message || 'Error updating customer');
    }
  };

  // Handle Broadcast Campaign Dispatch
  const handleDispatchCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commSubject.trim() || !commMessage.trim()) {
      showFeedback('error', 'Subject and message are required');
      return;
    }

    try {
      // Log broadcast audit event
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tickets',
          action: 'save_broadcast',
          target: commTarget,
          channel: commChannel,
          subject: commSubject,
          message: commMessage,
        }),
      }).catch(() => {});

      setCommSentNotice(`Campaign "${commSubject}" staged and logged successfully for ${commTarget} audience via ${commChannel}!`);
      setCommSubject('');
      setCommMessage('');
      setTimeout(() => setCommSentNotice(null), 6000);
      showFeedback('success', 'Campaign logged and scheduled');
    } catch {
      showFeedback('error', 'Failed to dispatch communication');
    }
  };

  // Helper for customer segmentation tags
  const getCustomerSegment = (c: Customer): 'VIP' | 'REPEAT' | 'NEW' | 'INACTIVE' => {
    const totalSpend = c.total_spend || 0;
    const orderCount = c.order_count || 0;
    if (c.group_name?.toUpperCase() === 'VIP' || totalSpend >= 5000 || orderCount >= 5) return 'VIP';
    if (orderCount >= 2) return 'REPEAT';
    if (orderCount === 1) return 'NEW';
    return 'INACTIVE';
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
      (c.phone && c.phone.includes(customerSearch));
    if (!matchesSearch) return false;

    if (segmentFilter === 'ALL') return true;
    return getCustomerSegment(c) === segmentFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[var(--primary)]" />
            Marketing & CRM Command Hub
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage coupons, first-order promotions, homepage banners, customer segmentation, and direct communication.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border)] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'coupons'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            Coupons ({coupons.length})
          </button>
          <button
            onClick={() => setActiveTab('banners')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'banners'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            Banners ({banners.length})
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'crm'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            Customer CRM ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('communication')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'communication'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            Campaigns
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-[var(--success-light)] border-[var(--success)] text-[var(--success)]'
              : 'bg-[var(--danger-light)] border-[var(--danger)] text-[var(--danger)]'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-current underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* ==================== TAB 1: COUPONS & PROMOS ==================== */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <span>{coupons.length} Active & Scheduled Coupons</span>
              <button
                onClick={fetchCoupons}
                className="p-1 hover:bg-[var(--bg-subtle)] rounded-md transition-colors"
                title="Refresh coupons"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCoupons ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={() => {
                setEditingCoupon(null);
                setCouponForm({
                  code: '',
                  discount_type: 'percent',
                  discount_value: 10,
                  min_order: 0,
                  max_discount: null,
                  max_uses: null,
                  active: 1,
                  description: '',
                  is_first_order_only: false,
                  ends_at: '',
                });
                setCouponModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          </div>

          {/* Coupons Table */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--text-main)]">
                <thead className="bg-[var(--bg-subtle)] text-[11px] font-bold uppercase text-[var(--text-muted)] border-b border-[var(--border)]">
                  <tr>
                    <th className="py-3 px-4">Coupon Code</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Min Order</th>
                    <th className="py-3 px-4">Rule / First Order</th>
                    <th className="py-3 px-4">Usage</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                        No coupon codes found. Click "Create Coupon" to add one.
                      </td>
                    </tr>
                  ) : (
                    coupons.map((c) => {
                      const isFirstOrder =
                        c.is_first_order_only ||
                        (c.description && /first/i.test(c.description)) ||
                        c.code.startsWith('FIRST') ||
                        c.code.startsWith('WELCOME');

                      return (
                        <tr key={c.id || c.code} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                          <td className="py-3 px-4 font-bold tracking-wide">
                            <span className="px-2 py-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-md font-mono text-[var(--primary)]">
                              {c.code}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            {c.discount_type === 'percent'
                              ? `${c.discount_value}% OFF`
                              : `₹${c.discount_value} FLAT`}
                            {c.max_discount ? (
                              <span className="text-[10px] text-[var(--text-muted)] block">
                                Max ₹{c.max_discount}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3 px-4">
                            {c.min_order ? `₹${c.min_order}` : 'No Minimum'}
                          </td>
                          <td className="py-3 px-4">
                            {isFirstOrder ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                <Sparkles className="w-3 h-3" /> First Order Only
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)] text-[11px]">Standard</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[11px]">
                            {c.uses || 0} {c.max_uses ? `/ ${c.max_uses}` : 'uses'}
                          </td>
                          <td className="py-3 px-4">
                            {c.active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                                <CheckCircle className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600">
                                <XCircle className="w-3 h-3" /> Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingCoupon(c);
                                  setCouponForm({
                                    ...c,
                                    active: Boolean(c.active),
                                    is_first_order_only: isFirstOrder,
                                  });
                                  setCouponModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--primary)] rounded-lg transition-colors"
                                title="Edit Coupon"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {c.id && (
                                <button
                                  onClick={() => handleDeleteCoupon(c.id!)}
                                  className="p-1.5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-600 rounded-lg transition-colors"
                                  title="Delete Coupon"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: BANNERS & SLIDES ==================== */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {banners.length} Active Homepage Banners & Slides
            </span>
            <button
              onClick={() => {
                setBannerForm({
                  title: '',
                  subtitle: '',
                  image: '',
                  cta_text: 'Shop Now',
                  cta_link: '/category/cakes',
                  active: 1,
                });
                setBannerModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Add Banner</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl">
                No active promotional banners configured.
              </div>
            ) : (
              banners.map((b, i) => (
                <div
                  key={b.id || i}
                  className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Slide #{b.sort_order || i + 1}
                      </span>
                      {b.active ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Live
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-full">
                          Disabled
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">{b.title}</h3>
                    {b.subtitle && <p className="text-xs text-[var(--text-muted)]">{b.subtitle}</p>}
                  </div>

                  {b.image && (
                    <div className="w-full h-24 rounded-xl overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border)]">
                      <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[var(--text-muted)]">CTA: {b.cta_text || 'None'}</span>
                    <span className="font-mono text-[10px] text-[var(--primary)]">{b.cta_link}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: CUSTOMER CRM & SEGMENTATION ==================== */}
      {activeTab === 'crm' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search & Segments */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search customer name, email, phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              {(['ALL', 'VIP', 'REPEAT', 'NEW', 'INACTIVE'] as const).map((seg) => (
                <button
                  key={seg}
                  onClick={() => setSegmentFilter(seg)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    segmentFilter === seg
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  {seg}
                </button>
              ))}
            </div>

            {/* Export CRM button */}
            <button
              onClick={() => exportCustomersToCSV(customers)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-main)] transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Export Customers CSV</span>
            </button>
          </div>

          {/* Customers List & Selected Drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[var(--text-main)]">
                  <thead className="bg-[var(--bg-subtle)] text-[11px] font-bold uppercase text-[var(--text-muted)] border-b border-[var(--border)]">
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Segment</th>
                      <th className="py-3 px-4">Orders</th>
                      <th className="py-3 px-4">Total Spend</th>
                      <th className="py-3 px-4 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-[var(--text-muted)]">
                          No matching customers found.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => {
                        const seg = getCustomerSegment(c);
                        const isSelected = selectedCustomer?.id === c.id;

                        return (
                          <tr
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCustomerNotes(c.notes || '');
                              setCustomerGroup(c.group_name || '');
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-[var(--primary-light)]/20' : 'hover:bg-[var(--bg-subtle)]/50'
                            }`}
                          >
                            <td className="py-3 px-4 font-bold">{c.name}</td>
                            <td className="py-3 px-4 text-[11px] text-[var(--text-muted)]">
                              <div>{c.phone || 'No phone'}</div>
                              <div>{c.email || 'No email'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  seg === 'VIP'
                                    ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                                    : seg === 'REPEAT'
                                    ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                    : seg === 'NEW'
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                                }`}
                              >
                                {seg}
                              </span>
                            </td>
                            <td className="py-3 px-4">{c.order_count || 0}</td>
                            <td className="py-3 px-4 font-semibold text-[var(--primary)]">
                              ₹{(c.total_spend || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] inline-block" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Detail & Notes Panel */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col justify-between space-y-4">
              {selectedCustomer ? (
                <div className="space-y-4">
                  <div className="border-b border-[var(--border)] pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Customer Profile
                    </span>
                    <h2 className="text-base font-bold text-[var(--text-main)] mt-0.5">
                      {selectedCustomer.name}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      {selectedCustomer.email} • {selectedCustomer.phone}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">Total Spend</span>
                      <span className="font-bold text-[var(--primary)]">
                        ₹{(selectedCustomer.total_spend || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-2 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">Lifetime Orders</span>
                      <span className="font-bold">{selectedCustomer.order_count || 0}</span>
                    </div>
                  </div>

                  {/* Customer Group Tag */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-main)]">Customer Group / Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. VIP, Corporate, Wholesale"
                      value={customerGroup}
                      onChange={(e) => setCustomerGroup(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-main)]"
                    />
                  </div>

                  {/* Internal CRM Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-main)]">Internal Staff Notes</label>
                    <textarea
                      rows={4}
                      placeholder="Add customer preferences, allergy alerts, past interactions..."
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className="w-full p-2.5 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-main)]"
                    />
                  </div>

                  <button
                    onClick={handleUpdateCustomer}
                    className="w-full py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-95 transition-opacity"
                  >
                    Save Notes & Group
                  </button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)] space-y-2">
                  <Users className="w-8 h-8 text-[var(--text-muted)]/50" />
                  <p className="text-xs font-medium">Select a customer from the table to view details and edit CRM notes.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: COMMUNICATION & CAMPAIGNS ==================== */}
      {activeTab === 'communication' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campaign Form */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <Send className="w-4 h-4 text-[var(--primary)]" />
                Dispatch Marketing Campaign
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Target segmented customer lists with tailored offers, seasonal menus, and order notifications.
              </p>
            </div>

            {commSentNotice && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs">
                {commSentNotice}
              </div>
            )}

            <form onSubmit={handleDispatchCommunication} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-main)] block mb-1">Target Audience</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ALL', label: 'All Registered Customers' },
                    { id: 'VIP', label: 'VIP Club (Top Spenders)' },
                    { id: 'REPEAT', label: 'Repeat Buyers (2+ Orders)' },
                    { id: 'NEW', label: 'First-Time Buyers' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCommTarget(t.id as any)}
                      className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                        commTarget === t.id
                          ? 'border-[var(--primary)] bg-[var(--primary-light)]/20 text-[var(--primary)]'
                          : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-main)] block mb-1">Delivery Channel</label>
                <div className="flex gap-2">
                  {[
                    { id: 'EMAIL', label: 'Email Newsletter' },
                    { id: 'IN_APP', label: 'In-Store Announcement' },
                    { id: 'SMS', label: 'SMS Notification' },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setCommChannel(ch.id as any)}
                      className={`flex-1 py-2 rounded-xl border font-semibold text-center transition-all ${
                        commChannel === ch.id
                          ? 'border-[var(--primary)] bg-[var(--primary-light)]/20 text-[var(--primary)]'
                          : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-main)] block mb-1">Subject / Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Special Weekend Celebration: 15% Off Handcrafted Truffles!"
                  value={commSubject}
                  onChange={(e) => setCommSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-main)] block mb-1">Campaign Body Content</label>
                <textarea
                  rows={5}
                  placeholder="Craft your personalized message to customers..."
                  value={commMessage}
                  onChange={(e) => setCommMessage(e.target.value)}
                  className="w-full p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-main)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[var(--primary)] text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Launch Campaign & Log Audit</span>
              </button>
            </form>
          </div>

          {/* Live Mobile/Email Preview */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
              Live Message Preview ({commChannel})
            </h2>

            <div className="p-4 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-[11px] text-[var(--text-muted)]">
                <span>To: <strong className="text-[var(--text-main)]">{commTarget} Customers</strong></span>
                <span className="uppercase">{commChannel}</span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[var(--text-main)]">
                  {commSubject || 'Subject preview will appear here'}
                </h3>
              </div>

              <div className="text-xs text-[var(--text-main)] whitespace-pre-line leading-relaxed min-h-[100px]">
                {commMessage || 'Type your message on the left to see the instant live preview formatted for customer delivery.'}
              </div>

              <div className="pt-3 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
                <span>TVO Flavours Gourmet Kitchens</span>
                <span>Bengaluru, India</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATE / EDIT COUPON MODAL ==================== */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--primary)]" />
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h2>
              <button
                onClick={() => setCouponModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-main)] block mb-1">Coupon Code *</label>
                <input
                  type="text"
                  placeholder="e.g. WELCOME10, FIRST15"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl font-mono uppercase font-bold text-[var(--text-main)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-main)] block mb-1">Discount Type</label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, discount_type: e.target.value as 'percent' | 'flat' })
                    }
                    className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)]"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-main)] block mb-1">Discount Value *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={couponForm.discount_value}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-main)] block mb-1">Minimum Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={couponForm.min_order}
                    onChange={(e) => setCouponForm({ ...couponForm, min_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-main)] block mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="No limit"
                    value={couponForm.max_discount ?? ''}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        max_discount: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)]"
                  />
                </div>
              </div>

              {/* First Order Only Checkbox */}
              <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[var(--text-main)] block">First Order Restriction</span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Only valid for customers with 0 prior completed orders
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={couponForm.is_first_order_only}
                  onChange={(e) => setCouponForm({ ...couponForm, is_first_order_only: e.target.checked })}
                  className="w-4 h-4 rounded text-[var(--primary)] accent-[var(--primary)] cursor-pointer"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-2">
                <span className="font-semibold text-[var(--text-main)]">Active Status</span>
                <input
                  type="checkbox"
                  checked={Boolean(couponForm.active)}
                  onChange={(e) => setCouponForm({ ...couponForm, active: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 rounded text-[var(--primary)] accent-[var(--primary)] cursor-pointer"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-main)] block mb-1">Description / Campaign Note</label>
                <input
                  type="text"
                  placeholder="e.g. Welcome offer for new artisan cake lovers"
                  value={couponForm.description ?? ''}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--primary)] text-white font-bold rounded-xl shadow-xs hover:opacity-95"
                >
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ADD BANNER MODAL ==================== */}
      {bannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-sm font-bold text-[var(--text-main)]">Add Promotional Banner</h2>
              <button
                onClick={() => setBannerModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-main)] block mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Handcrafted Celebration Cakes"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)]"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-main)] block mb-1">Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Freshly baked in Bengaluru with 100% Belgian chocolate"
                  value={bannerForm.subtitle ?? ''}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-main)] block mb-1">Image URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={bannerForm.image ?? ''}
                  onChange={(e) => setBannerForm({ ...bannerForm, image: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-main)] block mb-1">CTA Text</label>
                  <input
                    type="text"
                    value={bannerForm.cta_text ?? 'Shop Now'}
                    onChange={(e) => setBannerForm({ ...bannerForm, cta_text: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-main)] block mb-1">CTA Link</label>
                  <input
                    type="text"
                    value={bannerForm.cta_link ?? '/category/cakes'}
                    onChange={(e) => setBannerForm({ ...bannerForm, cta_link: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--primary)] text-white font-bold rounded-xl shadow-xs hover:opacity-95"
                >
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
