'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingBag,
  Clock,
  Truck,
  Cake,
  Gift,
  MapPin,
  Phone,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  User as UserIcon,
  LogIn,
  RefreshCw,
  X,
  Printer,
  Calendar,
  CreditCard,
  ShieldCheck,
  PackageCheck,
  HeartHandshake,
  ChefHat,
} from 'lucide-react';
import { Order, OrderStatus, Product, WeightOption, CartItemAddon } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { logAuditEvent } from '../../lib/audit';

interface CustomerOrderHistoryViewProps {
  products: Product[];
  onNavigate: (view: string, param?: string) => void;
  onSelectProduct?: (productId: string) => void;
  onOpenAuthModal?: () => void;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; icon: any; step: number }
> = {
  'Order Placed': {
    label: 'Order Confirmed',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    icon: Clock,
    step: 0,
  },
  'Baking in Kitchen': {
    label: 'Baking in Kitchen',
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
    icon: Cake,
    step: 1,
  },
  'Out for Delivery': {
    label: 'Out for Delivery',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    icon: Truck,
    step: 2,
  },
  'Delivered': {
    label: 'Delivered',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    icon: CheckCircle,
    step: 3,
  },
  'Cancelled': {
    label: 'Cancelled',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    icon: AlertCircle,
    step: -1,
  },
};

const STEP_LABELS = [
  { label: 'Confirmed', icon: CheckCircle },
  { label: 'Baking', icon: Cake },
  { label: 'Dispatched', icon: Truck },
  { label: 'Delivered', icon: Gift },
];

export const CustomerOrderHistoryView: React.FC<CustomerOrderHistoryViewProps> = ({
  products,
  onNavigate,
  onSelectProduct,
  onOpenAuthModal,
}) => {
  const { user, loginWithEmail, registerCustomer } = useAuth();
  const { addToCart, setIsCartOpen } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Filtering & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_amount'>('newest');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Modals
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState<string | null>(null);
  const [reorderNotification, setReorderNotification] = useState<string | null>(null);

  // Guest lookup & Login modal fallback
  const [guestEmailLookup, setGuestEmailLookup] = useState<string>('');
  const [loginEmail, setLoginEmail] = useState<string>('aarav.sharma@example.com');
  const [loginPassword, setLoginPassword] = useState<string>('TVO Flavours123!');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Fetch orders from Firestore
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      setErrorMessage('');
      const res = await fetch('/api/orders');
      const data = await res.json();
      const loaded: Order[] = (data.orders || []).map((o: any) => ({
        id: o.id || o.order_number,
        orderNumber: o.order_number || o.orderNumber,
        userId: o.user_id || o.userId,
        customer: o.customer || {
          name: o.customer_name,
          phone: o.customer_phone,
          email: o.customer_email,
          address: o.customer_address,
          pincode: o.pincode,
          city: o.city,
          deliveryDate: o.delivery_date,
          deliverySlot: o.delivery_slot,
        },
        items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
        subtotal: o.subtotal,
        deliveryFee: o.delivery_fee,
        slotSurcharge: o.slot_surcharge,
        discount: o.discount,
        total: o.total,
        status: o.status,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        createdAt: o.created_at || o.createdAt,
        updatedAt: o.updated_at || o.updatedAt,
      }));

      loaded.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setOrders(loaded);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      setErrorMessage('Could not load orders. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInitialOrders = async () => {
      try {
let ordersUrl = '/api/orders';
      if (!user) {
        // Guest — scope the query to this browser session.
        const session = typeof window !== 'undefined' ? window.localStorage.getItem('confetto_session_id') || '' : '';
        if (session) ordersUrl += `?session=${encodeURIComponent(session)}`;
      }
      const res = await fetch(ordersUrl);
        const data = await res.json();
        if (!isMounted) return;
        const loaded: Order[] = (data.orders || []).map((o: any) => ({
          id: o.id || o.order_number,
          orderNumber: o.order_number || o.orderNumber,
          userId: o.user_id || o.userId,
          customer: o.customer || {
            name: o.customer_name,
            phone: o.customer_phone,
            email: o.customer_email,
            address: o.customer_address,
            pincode: o.pincode,
            city: o.city,
            deliveryDate: o.delivery_date,
            deliverySlot: o.delivery_slot,
          },
          items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
          subtotal: o.subtotal,
          deliveryFee: o.delivery_fee,
          slotSurcharge: o.slot_surcharge,
          discount: o.discount,
          total: o.total,
          status: o.status,
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status,
          createdAt: o.created_at || o.createdAt,
          updatedAt: o.updated_at || o.updatedAt,
        }));

        loaded.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setOrders(loaded);
      } catch (err: any) {
        console.error('Failed to load orders:', err);
        if (isMounted) {
          setErrorMessage('Could not load orders. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  // Determine which orders belong to current customer
  const userOrders = useMemo(() => {
    if (!orders.length) return [];

    const effectiveEmail = (user?.email || guestEmailLookup || '').toLowerCase().trim();
    const effectiveUid = user?.uid;

    return orders.filter((order) => {
      // If user is logged in as admin/staff, show all orders for inspection or their matched ones
      if (user?.role === 'admin' || user?.role === 'staff') {
        if (!guestEmailLookup) return true; // Show all if admin didn't filter
      }

      const orderEmail = order.customer?.email?.toLowerCase().trim() || '';
      const orderUserId = order.userId;

      if (effectiveUid && orderUserId === effectiveUid) return true;
      if (effectiveEmail && orderEmail === effectiveEmail) return true;

      // Also match common demo aliases if user name is matched
      if (user?.name && order.customer?.name?.toLowerCase().includes(user.name.toLowerCase())) {
        return true;
      }

      return false;
    });
  }, [orders, user, guestEmailLookup]);

  // Apply search and filter
  const filteredOrders = useMemo(() => {
    return userOrders.filter((order) => {
      // Status filter
      if (statusFilter === 'active') {
        if (order.status === 'Delivered' || order.status === 'Cancelled') return false;
      } else if (statusFilter === 'delivered') {
        if (order.status !== 'Delivered') return false;
      } else if (statusFilter === 'cancelled') {
        if (order.status !== 'Cancelled') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesNumber = order.orderNumber.toLowerCase().includes(query);
        const matchesRecipient = order.customer?.name?.toLowerCase().includes(query);
        const matchesPhone = order.customer?.phone?.includes(query);
        const matchesItem = order.items?.some(
          (i) =>
            i.name.toLowerCase().includes(query) ||
            i.flavour?.toLowerCase().includes(query) ||
            i.messageOnCake?.toLowerCase().includes(query)
        );
        if (!matchesNumber && !matchesRecipient && !matchesPhone && !matchesItem) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortBy === 'highest_amount') {
        return (b.total || 0) - (a.total || 0);
      }
      return 0;
    });
  }, [userOrders, statusFilter, searchQuery, sortBy]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalCount = userOrders.length;
    const activeCount = userOrders.filter(
      (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
    ).length;
    const deliveredCount = userOrders.filter((o) => o.status === 'Delivered').length;
    const totalSpent = userOrders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    return { totalCount, activeCount, deliveredCount, totalSpent };
  }, [userOrders]);

  // Copy order number to clipboard
  const handleCopyOrderNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedOrderNumber(num);
    setTimeout(() => setCopiedOrderNumber(null), 2000);
  };

  // Reorder items
  const handleReorder = (order: Order) => {
    let reorderedCount = 0;
    order.items.forEach((item) => {
      // Find original product or create fallback
      const matchingProduct = products.find((p) => p.id === item.productId) || {
        id: item.productId,
        sku: item.sku,
        name: item.name,
        slug: item.name.toLowerCase().replace(/\s+/g, '-'),
        shortDescription: 'Fresh artisan cake recipe',
        description: 'Fresh artisan cake recipe',
        category: 'birthday',
        tags: ['Celebration'],
        flavours: [item.flavour || 'Classic Belgian Dark Chocolate'],
        eggless: true,
        weightOptions: [
          { label: item.weight || '1.0 kg', weightKg: 1.0, price: item.unitPrice, mrp: item.unitPrice + 200 },
        ],
        images: [{ url: item.imageUrl || '', alt: item.name }],
        rating: 5.0,
        reviewCount: 24,
        stock: 20,
        stockStatus: 'in_stock' as const,
        badges: ['Eggless'],
        published: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const selectedWeight: WeightOption = matchingProduct.weightOptions.find(
        (w) => w.label === item.weight
      ) || {
        label: item.weight || '1.0 kg',
        weightKg: 1.0,
        price: item.unitPrice,
        mrp: item.unitPrice + 200,
      };

      const addons: CartItemAddon[] = (item.addons || []).map((addonName, idx) => ({
        id: `addon-${idx}`,
        name: addonName,
        price: 0,
        category: 'decor',
      }));

      addToCart(
        matchingProduct,
        selectedWeight,
        item.flavour || 'Classic Belgian Dark Chocolate',
        item.messageOnCake,
        addons,
        item.qty || 1
      );
      reorderedCount++;
    });

    setReorderNotification(
      `Added ${reorderedCount} cake item${reorderedCount > 1 ? 's' : ''} from ${order.orderNumber} to your cart!`
    );
    setIsCartOpen(true);
    setTimeout(() => setReorderNotification(null), 4000);
  };

  // Cancel order handler
  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    try {
      setIsCancelling(true);
      const nowIso = new Date().toISOString();
      const updatedStatusHistory = [
        ...(cancellingOrder.statusHistory || []),
        {
          status: 'Cancelled' as OrderStatus,
          timestamp: nowIso,
          note: 'Customer requested cancellation via Storefront Order History',
          updatedBy: user?.name || cancellingOrder.customer?.name || 'Customer',
        },
      ];

      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-status',
            orderNumber: cancellingOrder.orderNumber,
            status: 'Cancelled',
            note: `Customer requested cancellation via Storefront Order History`,
          }),
        });
      } catch (e) {}

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: user?.name || cancellingOrder.customer?.name || 'Customer',
        actorEmail: user?.email || cancellingOrder.customer?.email,
        action: 'ORDER_STATUS_UPDATE',
        targetType: 'Order',
        targetId: cancellingOrder.orderNumber,
        details: `Customer cancelled order ${cancellingOrder.orderNumber}`,
      });

      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === cancellingOrder.id
            ? { ...o, status: 'Cancelled', statusHistory: updatedStatusHistory, updatedAt: nowIso }
            : o
        )
      );

      setCancellingOrder(null);
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      alert('Could not cancel order. Please contact our bakery kitchen support directly.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Quick switch demo user
  const handleQuickCustomerSwitch = async (email: string, name: string) => {
    setIsLoggingIn(true);
    await registerCustomer(name, email, 'TVO Flavours123!');
    setGuestEmailLookup('');
    setIsLoggingIn(false);
  };

  // Quick email sign-in form
  const handleCustomerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;
    setIsLoggingIn(true);
    const res = await loginWithEmail(loginEmail.trim(), loginPassword);
    if (!res.success) {
      await registerCustomer(loginEmail.split('@')[0], loginEmail.trim(), loginPassword);
    }
    setIsLoggingIn(false);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
      {/* Reorder Toast Banner */}
      {reorderNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 border border-emerald-400 animate-in slide-in-from-bottom-5 duration-300">
          <Sparkles className="w-5 h-5 animate-spin-slow shrink-0" />
          <div className="text-xs font-semibold">{reorderNotification}</div>
          <button
            onClick={() => setReorderNotification(null)}
            className="p-1 hover:bg-emerald-700 rounded-lg ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold mb-2">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>My Celebration Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
            Past Orders & Delivery History
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Real-time status tracking, instant reordering, and itemized tax invoices for your celebration cakes.
          </p>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-3">
          <button
            id="refresh-order-history-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Orders from Cloud Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[var(--primary)]' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            id="browse-more-cakes-btn"
            onClick={() => onNavigate('home')}
            className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Cake className="w-3.5 h-3.5" />
            <span>Order Fresh Cake</span>
          </button>
        </div>
      </div>

      {/* User Status Bar & Quick Switcher */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] font-bold flex items-center justify-center text-base shrink-0 shadow-inner">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                {user ? user.name : 'Guest Customer'}
              </h2>
              {user && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[10px] font-bold uppercase border border-[var(--border)]">
                  {user.role}
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {user?.email || 'Sign in to access your saved delivery addresses and cake favorites'}
            </div>
          </div>
        </div>

        {/* Demo Persona Switcher & Quick Lookup for Testing */}
        <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-[var(--border)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">Switch Customer:</span>
          <button
            id="switch-aarav-btn"
            onClick={() => handleQuickCustomerSwitch('aarav.sharma@example.com', 'Aarav Sharma')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              user?.email === 'aarav.sharma@example.com'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-accent)] border border-[var(--border)]'
            }`}
          >
            Aarav Sharma
          </button>
          <button
            id="switch-sneha-btn"
            onClick={() => handleQuickCustomerSwitch('sneha.patel@example.com', 'Sneha Patel')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              user?.email === 'sneha.patel@example.com'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-accent)] border border-[var(--border)]'
            }`}
          >
            Sneha Patel
          </button>
          <button
            id="switch-admin-btn"
            onClick={() => handleQuickCustomerSwitch('admin@confetto.store', 'Chef Alessandro')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              user?.email === 'admin@confetto.store'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-accent)] border border-[var(--border)]'
            }`}
          >
            Chef Admin (All Orders)
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
            {stats.totalCount}
          </div>
          <div className="text-[11px] text-[var(--text-subtle)]">Celebration purchases</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Active Deliveries</span>
            <Truck className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
            {stats.activeCount}
          </div>
          <div className="text-[11px] text-[var(--text-subtle)]">Kitchen / In transit</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Completed</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.deliveredCount}
          </div>
          <div className="text-[11px] text-[var(--text-subtle)]">Delivered successfully</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
            <span>Total Spent</span>
            <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
            ₹{stats.totalSpent.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[var(--text-subtle)]">Across all orders</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl overflow-x-auto">
          {[
            { id: 'all', label: 'All Orders', count: stats.totalCount },
            { id: 'active', label: 'Active', count: stats.activeCount },
            { id: 'delivered', label: 'Delivered', count: stats.deliveredCount },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--border)] text-[var(--text-muted)]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, cake..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text-main)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest_amount">Highest Amount</option>
          </select>
        </div>
      </div>

      {/* Main Order List or Empty States */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] animate-pulse"
            />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mx-auto">
            <Cake className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-[var(--text-main)]">
              {searchQuery || statusFilter !== 'all'
                ? 'No matching orders found'
                : 'No celebration orders yet'}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or switching filters.'
                : 'Every milestone deserves a freshly baked Belgian chocolate or exotic fruit artisan cake.'}
            </p>
          </div>

          {searchQuery || statusFilter !== 'all' ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-xs font-semibold text-[var(--text-main)] border border-[var(--border)] cursor-pointer"
            >
              Clear Filters
            </button>
          ) : (
            <button
              id="empty-order-browse-btn"
              onClick={() => onNavigate('home')}
              className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Cake className="w-4 h-4" />
              <span>Explore Bakery Catalog</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG['Order Placed'];
            const StatusIcon = statusInfo.icon;
            const isExpanded = expandedOrderId === order.id;
            const canCancel = order.status === 'Order Placed';
            const placedDate = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recently Placed';

            return (
              <div
                key={order.id}
                id={`order-card-${order.orderNumber}`}
                className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-xs hover:border-[var(--primary-light)] transition-all overflow-hidden"
              >
                {/* Order Card Header */}
                <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--bg-subtle)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[var(--text-main)] font-mono">
                        {order.orderNumber}
                      </span>
                      <button
                        onClick={() => handleCopyOrderNumber(order.orderNumber)}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                        title="Copy Order Number"
                      >
                        {copiedOrderNumber === order.orderNumber ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <span className="text-[var(--text-subtle)] hidden sm:inline">•</span>

                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{placedDate}</span>
                    </div>

                    <span className="text-[var(--text-subtle)] hidden sm:inline">•</span>

                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>
                        {order.paymentMethod || 'UPI'} (
                        <span
                          className={`font-semibold ${
                            order.paymentStatus === 'Paid'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {order.paymentStatus || 'Paid'}
                        </span>
                        )
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{statusInfo.label}</span>
                    </div>

                    <span className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                      ₹{order.total?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Progress Stepper for Active & Delivered Orders */}
                {order.status !== 'Cancelled' && (
                  <div className="px-4 sm:px-6 pt-5 pb-2">
                    <div className="relative flex items-center justify-between">
                      {/* Background connecting bar */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[var(--border)] -z-0" />
                      {/* Active bar */}
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[var(--primary)] -z-0 transition-all duration-500"
                        style={{
                          width: `${(Math.max(0, statusInfo.step) / 3) * 100}%`,
                        }}
                      />

                      {STEP_LABELS.map((step, idx) => {
                        const StepIcon = step.icon;
                        const isPastOrCurrent = statusInfo.step >= idx;
                        const isCurrent = statusInfo.step === idx;

                        return (
                          <div
                            key={step.label}
                            className="relative z-10 flex flex-col items-center gap-1.5 bg-[var(--bg-surface)] px-2"
                          >
                            <div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isCurrent
                                  ? 'bg-[var(--primary)] text-white ring-4 ring-[var(--primary-light)]'
                                  : isPastOrCurrent
                                  ? 'bg-[var(--primary)] text-white'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-subtle)] border border-[var(--border)]'
                              }`}
                            >
                              <StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                            <span
                              className={`text-[10px] sm:text-xs font-medium ${
                                isPastOrCurrent
                                  ? 'text-[var(--text-main)] font-semibold'
                                  : 'text-[var(--text-subtle)]'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Latest Status Note if available */}
                    {order.statusHistory && order.statusHistory.length > 0 && (
                      <div className="mt-3 text-[11px] text-[var(--text-muted)] bg-[var(--bg-subtle)]/70 p-2.5 rounded-xl border border-[var(--border)] flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--primary)] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[var(--text-main)] font-medium">
                            Latest Kitchen Update:
                          </strong>{' '}
                          {order.statusHistory[order.statusHistory.length - 1].note ||
                            'Order moving through chef stations.'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Items in the Order */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="space-y-3">
                    {order.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border)]/60"
                      >
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-[var(--border)] shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0">
                              <Cake className="w-7 h-7" />
                            </div>
                          )}

                          <div className="space-y-1">
                            <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                              {item.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                              <span className="px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] font-medium">
                                {item.weight || '1.0 kg'}
                              </span>
                              <span>•</span>
                              <span>{item.flavour || 'Belgian Dark Truffle'}</span>
                              <span>•</span>
                              <span>Qty: {item.qty || 1}</span>
                            </div>

                            {item.messageOnCake && (
                              <div className="text-[11px] text-[var(--primary)] font-medium italic">
                                Message on cake: &ldquo;{item.messageOnCake}&rdquo;
                              </div>
                            )}

                            {item.addons && item.addons.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.addons.map((a, aIdx) => (
                                  <span
                                    key={aIdx}
                                    className="px-1.5 py-0.5 rounded-md bg-[var(--primary-light)] text-[var(--primary)] text-[10px] font-semibold"
                                  >
                                    + {a}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right sm:self-center shrink-0">
                          <div className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                            ₹{(item.totalPrice || item.unitPrice * (item.qty || 1)).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            ₹{item.unitPrice} each
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery & Recipient Summary Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                      <div className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span>Delivery Address</span>
                      </div>
                      <div className="text-[var(--text-muted)]">
                        <strong>{order.customer?.name}</strong> • {order.customer?.phone}
                      </div>
                      <div className="text-[var(--text-muted)]">
                        {order.customer?.address}, {order.customer?.city} - {order.customer?.pincode}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                      <div className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span>Scheduled Slot</span>
                      </div>
                      <div className="text-[var(--text-muted)]">
                        <strong>Date:</strong> {order.deliveryDate || 'Standard Delivery'}
                      </div>
                      <div className="text-[var(--text-muted)]">
                        <strong>Slot:</strong> {order.deliverySlot || order.customer?.deliverySlot || 'Standard Slot'}
                      </div>
                      {order.customer?.giftMessage && (
                        <div className="text-[11px] text-[var(--primary)] italic pt-0.5">
                          Gift Note: &ldquo;{order.customer.giftMessage}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Special Instructions & Dietary Notes */}
                  {(order.specialInstructions || order.customer?.specialInstructions) && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-2.5">
                      <ChefHat className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-amber-700 dark:text-amber-300 text-[11px] uppercase tracking-wider block">
                          Special Instructions & Dietary Notes:
                        </span>
                        <p className="text-[var(--text-main)] italic">
                          &ldquo;{order.specialInstructions || order.customer?.specialInstructions}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Collapsible Full Financial Breakdown */}
                  {isExpanded && (
                    <div className="p-4 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border)] space-y-2 animate-in fade-in duration-150 text-xs">
                      <div className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px] mb-2">
                        Financial & Tax Breakdown
                      </div>
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>Items Subtotal</span>
                        <span>₹{order.subtotal?.toLocaleString('en-IN')}</span>
                      </div>
                      {order.slotSurcharge > 0 && (
                        <div className="flex justify-between text-[var(--text-muted)]">
                          <span>Special Delivery Slot Surcharge</span>
                          <span>₹{order.slotSurcharge}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>Express Cold-Chain Delivery</span>
                        <span>
                          {order.deliveryFee === 0 ? (
                            <span className="text-emerald-600 font-semibold">FREE</span>
                          ) : (
                            `₹${order.deliveryFee}`
                          )}
                        </span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span>Promo Discount ({order.promoCode || 'PROMO'})</span>
                          <span>-₹{order.discount}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>GST & Bakeries FSSAI Tax (5%)</span>
                        <span>₹{order.tax || Math.round((order.subtotal || 0) * 0.05)}</span>
                      </div>
                      <div className="pt-2 border-t border-[var(--border)] flex justify-between font-bold text-sm text-[var(--text-main)]">
                        <span>Grand Total Paid</span>
                        <span>₹{order.total?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Breakdown' : 'View Breakdown & Taxes'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Invoice Button */}
                      <button
                        onClick={() => setInvoiceOrder(order)}
                        className="px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span>Invoice</span>
                      </button>

                      {/* Track Live Order Button */}
                      {order.status !== 'Cancelled' && (
                        <button
                          onClick={() => onNavigate('track', order.orderNumber)}
                          className="px-3 py-1.5 rounded-xl border border-[var(--primary)]/40 bg-[var(--primary-light)] hover:bg-[var(--primary)] hover:text-white text-xs font-bold text-[var(--primary)] flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Track Live</span>
                        </button>
                      )}

                      {/* Reorder Button */}
                      <button
                        onClick={() => handleReorder(order)}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reorder</span>
                      </button>

                      {/* Cancel Order (Only if order placed) */}
                      {canCancel && (
                        <button
                          onClick={() => setCancellingOrder(order)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
              <div>
                <div className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)]">
                  TVO Flavours Confectionery
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Tax Invoice / Kitchen Dispatch Receipt
                </div>
                <div className="text-[11px] text-[var(--text-subtle)] mt-0.5">
                  GSTIN: 29AAAFC1234F1Z5 • FSSAI Lic No: 11223344000123
                </div>
              </div>

              <button
                onClick={() => setInvoiceOrder(null)}
                className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Meta Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="text-[var(--text-subtle)] font-medium">Billed & Delivered To:</div>
                <div className="font-bold text-[var(--text-main)]">{invoiceOrder.customer?.name}</div>
                <div className="text-[var(--text-muted)]">{invoiceOrder.customer?.phone}</div>
                <div className="text-[var(--text-muted)]">{invoiceOrder.customer?.email}</div>
                <div className="text-[var(--text-muted)]">
                  {invoiceOrder.customer?.address}, {invoiceOrder.customer?.city} - {invoiceOrder.customer?.pincode}
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div>
                  <span className="text-[var(--text-subtle)]">Invoice / Order #: </span>
                  <span className="font-bold font-mono text-[var(--text-main)]">
                    {invoiceOrder.orderNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-subtle)]">Order Date: </span>
                  <span className="text-[var(--text-main)]">
                    {invoiceOrder.createdAt
                      ? new Date(invoiceOrder.createdAt).toLocaleDateString('en-IN')
                      : 'Today'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-subtle)]">Payment Method: </span>
                  <span className="font-semibold text-emerald-600">
                    {invoiceOrder.paymentMethod} ({invoiceOrder.paymentStatus})
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-subtle)]">Delivery Slot: </span>
                  <span className="text-[var(--text-main)]">
                    {invoiceOrder.deliveryDate} ({invoiceOrder.deliverySlot})
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border border-[var(--border)] rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] font-semibold border-b border-[var(--border)]">
                  <tr>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-center">Weight</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)]">
                  {invoiceOrder.items?.map((item, i) => (
                    <tr key={i}>
                      <td className="p-3">
                        <div className="font-bold">{item.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          Flavour: {item.flavour}
                        </div>
                        {item.messageOnCake && (
                          <div className="text-[11px] text-[var(--primary)] italic">
                            &ldquo;{item.messageOnCake}&rdquo;
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">{item.weight}</td>
                      <td className="p-3 text-center">{item.qty}</td>
                      <td className="p-3 text-right">₹{item.unitPrice}</td>
                      <td className="p-3 text-right font-semibold">
                        ₹{(item.totalPrice || item.unitPrice * item.qty).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Totals */}
            <div className="space-y-1.5 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)] max-w-xs ml-auto">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{invoiceOrder.subtotal?.toLocaleString('en-IN')}</span>
              </div>
              {invoiceOrder.slotSurcharge > 0 && (
                <div className="flex justify-between">
                  <span>Slot Surcharge:</span>
                  <span>₹{invoiceOrder.slotSurcharge}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span>{invoiceOrder.deliveryFee === 0 ? 'FREE' : `₹${invoiceOrder.deliveryFee}`}</span>
              </div>
              {invoiceOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount:</span>
                  <span>-₹{invoiceOrder.discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST (5%):</span>
                <span>₹{invoiceOrder.tax || Math.round((invoiceOrder.subtotal || 0) * 0.05)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[var(--text-main)] pt-2 border-t border-[var(--border)]">
                <span>Total Amount Paid:</span>
                <span>₹{invoiceOrder.total?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <div className="text-[11px] text-[var(--text-subtle)]">
                Thank you for celebrating with TVO Flavours!
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-xs font-semibold text-[var(--text-main)] border border-[var(--border)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setInvoiceOrder(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[var(--text-main)]">
                Cancel Order {cancellingOrder.orderNumber}?
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Are you sure you want to cancel this celebration order? Since your order is in confirmed status and not yet into the baking oven, cancellation is free.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCancellingOrder(null)}
                disabled={isCancelling}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-main)] cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer flex items-center justify-center gap-2"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
