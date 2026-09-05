'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  CheckCircle,
  CheckCircle2,
  Clock,
  Truck,
  Cake,
  Gift,
  MapPin,
  Phone,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Zap,
  Timer,
  Flame,
  Check,
  RefreshCw,
  ThermometerSnowflake,
  ChefHat,
  PackageCheck,
  Hourglass,
  CircleDot,
  ArrowRight,
  Printer,
  FileText,
  Receipt,
  Download,
  Copy,
  CheckCheck,
  Share2,
  CreditCard,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { Order, OrderStatus } from '../../lib/types';
import { Modal } from '../common/Modal';

interface OrderTrackingViewProps {
  initialOrderNumber?: string;
  onNavigateHome: () => void;
}

export type NormalizedStatusKey =
  | 'pending'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderStatusTheme {
  key: NormalizedStatusKey;
  primaryLabel: string;
  badgeLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string; // Tailwind background + text + border classes
  dotColor: string;
  activeRingColor: string;
  stepIconBg: string;
  stepTextColor: string;
  progressBarGradient: string;
  cardHighlight: string;
  accentText: string;
}

/**
 * Returns distinct, high-contrast visual styling, badges, and icons for each order status
 */
export function getOrderStatusTheme(status: OrderStatus | string): OrderStatusTheme {
  const normalized = (status || '').toLowerCase().trim();

  // 1. Delivered
  if (
    normalized.includes('deliver') ||
    normalized.includes('completed') ||
    normalized.includes('received')
  ) {
    return {
      key: 'delivered',
      primaryLabel: 'Delivered',
      badgeLabel: 'Delivered',
      description: 'Celebration cake handed over safely in refrigerated condition',
      icon: CheckCircle2,
      badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      dotColor: 'bg-emerald-500',
      activeRingColor: 'ring-emerald-500/30 shadow-emerald-500/20 ring-4',
      stepIconBg: 'bg-emerald-600 text-white',
      stepTextColor: 'text-emerald-700 dark:text-emerald-300',
      progressBarGradient: 'from-emerald-500 to-teal-500',
      cardHighlight: 'bg-emerald-500/5 border-emerald-500/20',
      accentText: 'text-emerald-600 dark:text-emerald-400',
    };
  }

  // 2. Out for Delivery
  if (
    normalized.includes('transit') ||
    normalized.includes('out for delivery') ||
    normalized.includes('dispatched') ||
    normalized.includes('en route') ||
    normalized.includes('delivery fleet')
  ) {
    return {
      key: 'out_for_delivery',
      primaryLabel: 'Out for Delivery',
      badgeLabel: 'Out for Delivery',
      description: 'Cold-chain insulated van en route to destination',
      icon: Truck,
      badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
      dotColor: 'bg-sky-500 animate-ping',
      activeRingColor: 'ring-sky-500/30 shadow-sky-500/20 ring-4',
      stepIconBg: 'bg-sky-600 text-white',
      stepTextColor: 'text-sky-700 dark:text-sky-300',
      progressBarGradient: 'from-sky-500 to-blue-600',
      cardHighlight: 'bg-sky-500/5 border-sky-500/20',
      accentText: 'text-sky-600 dark:text-sky-400',
    };
  }

  // 3. In Preparation / Baking in Kitchen
  if (
    normalized.includes('baking') ||
    normalized.includes('kitchen') ||
    normalized.includes('prep') ||
    normalized.includes('preparation') ||
    normalized.includes('handcraft') ||
    normalized.includes('icing')
  ) {
    return {
      key: 'preparing',
      primaryLabel: 'In Preparation',
      badgeLabel: 'In Preparation (Baking)',
      description: 'Handcrafting sponges, whipped ganache & custom piping',
      icon: Cake,
      badgeColor: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
      dotColor: 'bg-orange-500 animate-pulse',
      activeRingColor: 'ring-orange-500/30 shadow-orange-500/20 ring-4',
      stepIconBg: 'bg-orange-500 text-white',
      stepTextColor: 'text-orange-700 dark:text-orange-300',
      progressBarGradient: 'from-amber-500 to-orange-500',
      cardHighlight: 'bg-orange-500/5 border-orange-500/20',
      accentText: 'text-orange-600 dark:text-orange-400',
    };
  }

  // 4. Cancelled
  if (normalized.includes('cancel') || normalized.includes('void')) {
    return {
      key: 'cancelled',
      primaryLabel: 'Cancelled',
      badgeLabel: 'Order Cancelled',
      description: 'Order voided or cancelled by customer / kitchen concierge',
      icon: AlertCircle,
      badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
      dotColor: 'bg-rose-500',
      activeRingColor: 'ring-rose-500/30 shadow-rose-500/20 ring-4',
      stepIconBg: 'bg-rose-600 text-white',
      stepTextColor: 'text-rose-700 dark:text-rose-300',
      progressBarGradient: 'from-rose-500 to-red-600',
      cardHighlight: 'bg-rose-500/5 border-rose-500/20',
      accentText: 'text-rose-600 dark:text-rose-400',
    };
  }

  // 5. Default: Pending / Order Placed
  return {
    key: 'pending',
    primaryLabel: 'Pending',
    badgeLabel: 'Pending / Confirmed',
    description: 'Order confirmed & queued with chef for baker assignment',
    icon: Clock,
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    dotColor: 'bg-amber-500 animate-pulse',
    activeRingColor: 'ring-amber-500/30 shadow-amber-500/20 ring-4',
    stepIconBg: 'bg-amber-500 text-white',
    stepTextColor: 'text-amber-700 dark:text-amber-300',
    progressBarGradient: 'from-amber-400 to-amber-600',
    cardHighlight: 'bg-amber-500/5 border-amber-500/20',
    accentText: 'text-amber-600 dark:text-amber-400',
  };
}

/**
 * Reusable Color-Coded Status Badge Component
 */
export const OrderStatusBadge: React.FC<{
  status: OrderStatus | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  withDot?: boolean;
  withIcon?: boolean;
  labelOverride?: string;
  className?: string;
}> = ({
  status,
  size = 'md',
  withDot = true,
  withIcon = true,
  labelOverride,
  className = '',
}) => {
  const theme = getOrderStatusTheme(status);
  const Icon = theme.icon;

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1 text-xs font-semibold gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm font-bold gap-2',
  }[size];

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  }[size];

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-all ${theme.badgeColor} ${sizeClasses} ${className}`}
    >
      {withDot && <span className={`rounded-full shrink-0 ${theme.dotColor} ${dotSizes}`} />}
      {withIcon && <Icon className={`${iconSizes} shrink-0`} />}
      <span className="whitespace-nowrap">{labelOverride || theme.badgeLabel}</span>
    </span>
  );
};

interface DeliveryTargetInfo {
  createdTimestamp: number;
  targetTimestamp: number;
  durationMinutes: number;
  formattedTargetTime: string;
  formattedCreatedTime: string;
  slotLabel: string;
  isDelivered: boolean;
  isCancelled: boolean;
  deliveredTimeFormatted?: string;
}

/**
 * Calculates estimated delivery time based on order's creation timestamp and delivery slot
 */
function calculateOrderDeliveryTarget(order: Order): DeliveryTargetInfo {
  const isDelivered = order.status === 'Delivered';
  const isCancelled = order.status === 'Cancelled';

  // 1. Resolve order creation timestamp
  let createdTimestamp = Date.now() - 35 * 60 * 1000; // default fallback 35 mins ago
  if (order.createdAt) {
    const parsed = new Date(order.createdAt).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      createdTimestamp = parsed;
    }
  }

  // 2. Resolve delivery duration in minutes based on deliverySlot
  const slotStr = (order.deliverySlot || '').toLowerCase();
  let durationMinutes = 120; // Default fresh artisan preparation & dispatch: 120 minutes (2 Hours)

  if (slotStr.includes('90 min') || slotStr.includes('90-min') || slotStr.includes('90min')) {
    durationMinutes = 90;
  } else if (
    slotStr.includes('express') ||
    slotStr.includes('2-hour') ||
    slotStr.includes('2 hour') ||
    slotStr.includes('120')
  ) {
    durationMinutes = 120;
  } else if (slotStr.includes('morning') || slotStr.includes('09:00 am') || slotStr.includes('9 am')) {
    durationMinutes = 150;
  } else if (slotStr.includes('afternoon') || slotStr.includes('01:00 pm') || slotStr.includes('1 pm')) {
    durationMinutes = 150;
  } else if (slotStr.includes('evening') || slotStr.includes('05:00 pm') || slotStr.includes('5 pm')) {
    durationMinutes = 180;
  } else if (slotStr.includes('night') || slotStr.includes('08:00 pm') || slotStr.includes('8 pm')) {
    durationMinutes = 180;
  } else if (slotStr.includes('midnight') || slotStr.includes('11:00 pm') || slotStr.includes('11 pm')) {
    durationMinutes = 210;
  }

  // Target timestamp calculated dynamically from createdAt
  const targetTimestamp = createdTimestamp + durationMinutes * 60 * 1000;

  // Format times nicely for the customer
  const targetDateObj = new Date(targetTimestamp);
  const isToday = new Date().toDateString() === targetDateObj.toDateString();
  const timeStr = targetDateObj.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const formattedTargetTime = isToday
    ? `${timeStr} (Today)`
    : `${timeStr}, ${targetDateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;

  const createdDateObj = new Date(createdTimestamp);
  const formattedCreatedTime = createdDateObj.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Find delivered timestamp if status is Delivered
  let deliveredTimeFormatted: string | undefined;
  if (isDelivered) {
    const deliveredHist = order.statusHistory?.find((h) => h.status === 'Delivered');
    if (deliveredHist?.timestamp) {
      const dt = new Date(deliveredHist.timestamp);
      if (!isNaN(dt.getTime())) {
        deliveredTimeFormatted = dt.toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
    }
    if (!deliveredTimeFormatted && order.updatedAt) {
      const dt = new Date(order.updatedAt);
      if (!isNaN(dt.getTime())) {
        deliveredTimeFormatted = dt.toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
    }
  }

  return {
    createdTimestamp,
    targetTimestamp,
    durationMinutes,
    formattedTargetTime,
    formattedCreatedTime,
    slotLabel: order.deliverySlot || `${durationMinutes}-Minute Express Dispatch`,
    isDelivered,
    isCancelled,
    deliveredTimeFormatted,
  };
}

const STATUS_STEPS: {
  status: OrderStatus;
  key: NormalizedStatusKey;
  stepNumber: number;
  label: string;
  desc: string;
  icon: any;
  colorClass: string;
}[] = [
  {
    status: 'Order Placed',
    key: 'pending',
    stepNumber: 1,
    label: 'Pending / Confirmed',
    desc: 'Recipe ticket verified & queued with chef',
    icon: Clock,
    colorClass: 'amber',
  },
  {
    status: 'Baking in Kitchen',
    key: 'preparing',
    stepNumber: 2,
    label: 'In Preparation',
    desc: 'Handcrafting sponge, layering & custom piping',
    icon: Cake,
    colorClass: 'orange',
  },
  {
    status: 'Out for Delivery',
    key: 'out_for_delivery',
    stepNumber: 3,
    label: 'Out for Delivery',
    desc: 'Cold-chain dispatch van en route to you',
    icon: Truck,
    colorClass: 'sky',
  },
  {
    status: 'Delivered',
    key: 'delivered',
    stepNumber: 4,
    label: 'Delivered',
    desc: 'Celebration cake handed over fresh & chilled',
    icon: CheckCircle2,
    colorClass: 'emerald',
  },
];

interface ExpectedArrivalCountdownProps {
  order: Order;
}

export const ExpectedArrivalCountdown: React.FC<ExpectedArrivalCountdownProps> = ({ order }) => {
  const [now, setNow] = useState<number>(() => Date.now());

  // 1-second live countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const deliveryInfo = useMemo(() => calculateOrderDeliveryTarget(order), [order]);
  const statusTheme = useMemo(() => getOrderStatusTheme(order.status), [order.status]);

  const remainingMs = Math.max(0, deliveryInfo.targetTimestamp - now);
  const totalDurationMs = deliveryInfo.durationMinutes * 60 * 1000;
  const elapsedMs = Math.max(0, now - deliveryInfo.createdTimestamp);

  const progressPercent = deliveryInfo.isDelivered
    ? 100
    : Math.min(100, Math.max(5, Math.round((elapsedMs / totalDurationMs) * 100)));

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  return (
    <div
      id={`expected-arrival-countdown-${order.orderNumber}`}
      className="p-5 sm:p-7 rounded-2xl bg-gradient-to-br from-[var(--bg-surface)] via-[var(--bg-subtle)] to-[var(--bg-surface)] border border-[var(--border)] shadow-sm space-y-6"
    >
      {/* Header Bar with Color-Coded Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} size="md" />
          <span className="text-xs text-[var(--text-muted)] hidden md:inline">
            {statusTheme.description}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
          <Clock className="w-4 h-4 text-[var(--primary)]" />
          <span>
            {deliveryInfo.isDelivered ? (
              <>
                Delivered at:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {deliveryInfo.deliveredTimeFormatted || deliveryInfo.formattedTargetTime}
                </strong>
              </>
            ) : (
              <>
                Expected Arrival:{' '}
                <strong className="text-[var(--text-main)] font-semibold">
                  {deliveryInfo.formattedTargetTime}
                </strong>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Main Countdown Display */}
      {deliveryInfo.isDelivered ? (
        <div className="text-center py-4 sm:py-6 space-y-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-1">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-main)] font-display">
            Your Celebration Cake Has Been Delivered!
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Delivered fresh from our bakery oven with temperature-controlled cold packaging. Ready for your special celebration.
          </p>
        </div>
      ) : deliveryInfo.isCancelled ? (
        <div className="text-center py-4 space-y-1 bg-rose-500/10 rounded-2xl border border-rose-500/20">
          <div className="inline-flex p-2.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 mb-1">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">
            This order has been cancelled
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Please contact our concierge team if you have any questions or require a replacement order.
          </p>
        </div>
      ) : remainingMs > 0 ? (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-subtle)] flex items-center justify-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Dynamic Estimated Arrival Timer</span>
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-[var(--text-main)]">
              Estimated Delivery Countdown
            </h3>
          </div>

          {/* Digital Timer Flip Display */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 py-2">
            {/* Hours Block */}
            <div className="flex flex-col items-center">
              <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border)] shadow-xs flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--text-main)] tracking-tight">
                  {String(hours).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase mt-1.5">
                Hours
              </span>
            </div>

            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--primary)] -mt-5">
              :
            </span>

            {/* Minutes Block */}
            <div className="flex flex-col items-center">
              <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border)] shadow-xs flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--text-main)] tracking-tight">
                  {String(minutes).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase mt-1.5">
                Minutes
              </span>
            </div>

            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--primary)] -mt-5">
              :
            </span>

            {/* Seconds Block */}
            <div className="flex flex-col items-center">
              <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--primary)]/30 shadow-xs flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--primary)] tracking-tight animate-pulse">
                  {String(seconds).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-wider text-[var(--primary)] uppercase mt-1.5">
                Seconds
              </span>
            </div>
          </div>

          <p className="text-[11px] text-center text-[var(--text-muted)]">
            Calculated from order placement ({deliveryInfo.formattedCreatedTime}) based on{' '}
            <strong className="text-[var(--text-main)] font-semibold">{deliveryInfo.slotLabel}</strong>.
          </p>
        </div>
      ) : (
        <div className="text-center py-4 space-y-2 bg-sky-500/10 rounded-2xl border border-sky-500/20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
            <span>Arriving Any Moment</span>
          </div>
          <h3 className="text-base font-bold text-[var(--text-main)]">
            Your Delivery Van is in Your Immediate Vicinity
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Our temperature-controlled rider is completing final doorstep dispatch. Please keep your phone reachable.
          </p>
        </div>
      )}

      {/* Dynamic Delivery Progress Bar with Status Gradient */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-muted)] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Preparation & Transit Progress</span>
          </span>
          <span className="font-bold font-mono text-[var(--primary)]">{progressPercent}%</span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${statusTheme.progressBarGradient} transition-all duration-1000 rounded-full`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Milestone Steps Bar */}
        <div className="flex justify-between text-[10px] text-[var(--text-subtle)] pt-1">
          <span>Placed ({deliveryInfo.formattedCreatedTime})</span>
          <span>Baking & Piping</span>
          <span>Dispatched</span>
          <span className="font-semibold text-[var(--text-main)]">
            Target ({deliveryInfo.formattedTargetTime})
          </span>
        </div>
      </div>

      {/* Cold-Chain Micro Assurance Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
          <ThermometerSnowflake className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span>4°C Insulated Van Transit</span>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Anti-Tilt Cake Protection</span>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
          <span>Fresh Oven Baked Daily</span>
        </div>
      </div>
    </div>
  );
};

// Printable Order Slip Component (Formatted for standard A4 / Letter paper with crisp typography)
export const PrintableOrderSlip: React.FC<{ order: Order; onPrint?: () => void }> = ({ order, onPrint }) => {
  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent Order';

  const printedAt = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div id="printable-order-slip" className="bg-white text-gray-900 font-sans p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6 max-w-3xl mx-auto">
      {/* Brand Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-gray-900 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-serif tracking-tight text-gray-900">TVO FLAVOURS</span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-pink-100 text-pink-700 border border-pink-200">
              Artisan Patisserie
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Bespoke Celebration Cakes & Fresh Cold-Chain Delivery
          </p>
          <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-x-4">
            <span>FSSAI: 11223344556677</span>
            <span>GST: 29AABCT1234F1Z8</span>
            <span>Tel: +91 98765 43210</span>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-700">Official Order Summary</div>
          <div className="text-base font-bold font-mono text-gray-900 mt-0.5">{order.orderNumber}</div>
          <div className="text-[11px] text-gray-500">Printed: {printedAt}</div>
        </div>
      </div>

      {/* Primary Order Meta Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 block">Order Status</span>
          <span className="font-bold text-gray-900 inline-flex items-center gap-1 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-pink-600 inline-block" />
            {order.status}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 block">Order Placed</span>
          <span className="font-medium text-gray-800 mt-0.5 block">{formattedDate}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 block">Delivery Slot</span>
          <span className="font-medium text-gray-800 mt-0.5 block">
            {order.deliverySlot || 'Standard'} {order.deliveryDate ? `(${order.deliveryDate})` : ''}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-500 block">Payment Method</span>
          <span className="font-medium text-gray-800 mt-0.5 block">
            {order.paymentMethod || 'UPI / Card'} • <span className="text-emerald-700 font-bold">{order.paymentStatus || 'Paid'}</span>
          </span>
        </div>
      </div>

      {/* Customer & Shipping Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 rounded-xl border border-gray-200 space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Delivered To</div>
          <div className="font-bold text-sm text-gray-900">{order.customer?.name}</div>
          <div className="text-gray-600">{order.customer?.phone}</div>
          <div className="text-gray-600">{order.customer?.email}</div>
        </div>

        <div className="p-3.5 rounded-xl border border-gray-200 space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Delivery Destination</div>
          <div className="font-medium text-gray-900">{order.customer?.address}</div>
          {order.customer?.landmark && (
            <div className="text-gray-500">Landmark: {order.customer.landmark}</div>
          )}
          <div className="text-gray-700 font-semibold">
            {order.customer?.city} - {order.customer?.pincode}
          </div>
        </div>
      </div>

      {/* Special Cake Note / Dietary Instructions / Gift Message if present */}
      {(order.specialInstructions || order.customer?.specialInstructions || order.customer?.giftMessage || order.customer?.instructions) && (
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-1.5 text-amber-900">
          {(order.specialInstructions || order.customer?.specialInstructions) && (
            <div className="flex items-start gap-1.5">
              <strong className="text-amber-800 shrink-0">Chef Special Notes / Dietary:</strong>
              <span className="italic font-medium">&ldquo;{order.specialInstructions || order.customer?.specialInstructions}&rdquo;</span>
            </div>
          )}
          {order.customer?.giftMessage && (
            <div>
              <strong>Gift Card Note:</strong> &ldquo;{order.customer.giftMessage}&rdquo;
            </div>
          )}
          {order.customer?.instructions && order.customer?.instructions !== (order.specialInstructions || order.customer?.specialInstructions) && (
            <div>
              <strong>Delivery Notes:</strong> {order.customer.instructions}
            </div>
          )}
        </div>
      )}

      {/* Itemized Order Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
            <tr>
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-3">Specifications</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Rate</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items?.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="py-3 px-3 align-top">
                  <div className="font-bold text-gray-900">{item.name}</div>
                  {item.messageOnCake && (
                    <div className="text-[11px] text-pink-700 font-semibold mt-1">
                      Piped: &ldquo;{item.messageOnCake}&rdquo;
                    </div>
                  )}
                  {item.addons && item.addons.length > 0 && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Add-ons: {item.addons.join(', ')}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 align-top text-gray-600">
                  <div>{item.weight}</div>
                  <div className="text-[11px] text-gray-500">{item.flavour}</div>
                </td>
                <td className="py-3 px-3 align-top text-center font-bold text-gray-800">
                  {item.qty}
                </td>
                <td className="py-3 px-3 align-top text-right text-gray-700">
                  ₹{item.unitPrice}
                </td>
                <td className="py-3 px-3 align-top text-right font-bold text-gray-900">
                  ₹{item.totalPrice || item.unitPrice * item.qty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Breakdown */}
      <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
        <div className="text-[11px] text-gray-500 max-w-sm space-y-1.5">
          <div className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Bakery Quality Guarantee</div>
          <p>
            Handcrafted with 100% pure butter and imported Belgian chocolate. Dispatched via temperature-controlled cold-chain containers.
          </p>
          <p className="font-semibold text-gray-700">
            Storage: Keep refrigerated at 2°C–5°C until 20 minutes before celebration cutting.
          </p>
        </div>

        <div className="w-full sm:w-64 space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Items Subtotal</span>
            <span>₹{order.subtotal || order.total}</span>
          </div>

          {(order.deliveryFee ?? 0) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Cold-Chain Delivery</span>
              <span>₹{order.deliveryFee}</span>
            </div>
          )}

          {(order.slotSurcharge ?? 0) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Time Slot Surcharge</span>
              <span>₹{order.slotSurcharge}</span>
            </div>
          )}

          {(order.discount ?? 0) > 0 && (
            <div className="flex justify-between text-pink-700 font-medium">
              <span>Promo Discount {order.promoCode ? `(${order.promoCode})` : ''}</span>
              <span>-₹{order.discount}</span>
            </div>
          )}

          {(order.tax ?? 0) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>GST / Taxes</span>
              <span>₹{order.tax}</span>
            </div>
          )}

          <div className="border-t-2 border-gray-900 pt-2 flex justify-between font-bold text-sm text-gray-900">
            <span>Total Paid</span>
            <span className="text-base text-gray-900">₹{order.total}</span>
          </div>
        </div>
      </div>

      {/* Kitchen Tracking History */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2">
          <div className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
            Kitchen Dispatch Timeline
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {order.statusHistory.map((hist, i) => (
              <div key={i} className="flex items-start gap-1.5 text-gray-700">
                <span className="text-gray-400">•</span>
                <div>
                  <strong className="text-gray-900">{hist.status}</strong>{' '}
                  <span className="text-gray-500 text-[10px]">
                    ({new Date(hist.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                  {hist.note && <div className="text-gray-500 text-[10px]">{hist.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Printable Footer */}
      <div className="border-t border-gray-200 pt-4 flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-500 gap-2">
        <div>Thank you for celebrating with TVO Flavours! • celebrate@tvoflavours.com</div>
        <div className="font-mono">REF: {order.orderNumber} / {order.id?.slice(0, 8)}</div>
      </div>
    </div>
  );
};

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  initialOrderNumber = '',
  onNavigateHome,
}) => {
  const [searchOrderNumber, setSearchOrderNumber] = useState(initialOrderNumber);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeSearchRef = useRef(initialOrderNumber);

  useEffect(() => {
    activeSearchRef.current = searchOrderNumber;
  }, [searchOrderNumber]);

  // Fetch all orders and poll for live updates
  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      try {
        let session = '';
        if (typeof window !== 'undefined') {
          session = window.localStorage.getItem('confetto_session_id') || '';
        }
        const url = session ? `/api/orders?session=${encodeURIComponent(session)}` : '/api/orders';
        const res = await fetch(url);
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
        setAllOrders(loaded);

        const activeSearch = activeSearchRef.current.trim() || initialOrderNumber.trim();
        if (activeSearch) {
          const found = loaded.find(
            (o) => o.orderNumber.toLowerCase() === activeSearch.toLowerCase()
          );
          if (found) setCurrentOrder(found);
        } else if (loaded.length > 0) {
          setCurrentOrder((prev) => prev || loaded[0]);
          setSearchOrderNumber((prev) => prev || loaded[0].orderNumber);
        }
      } catch (e) {
        console.warn('Could not fetch orders for tracking:', e);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [initialOrderNumber]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchOrderNumber.trim();
    if (!q) return;

    setIsLoading(true);
    setSearched(true);
    const found = allOrders.find(
      (o) => o.orderNumber.toLowerCase() === q.toLowerCase()
    );
    if (found) {
      setCurrentOrder(found);
      setIsLoading(false);
      return;
    }

    // Not in the prefetched list — ask the server directly by order number.
    try {
      const res = await fetch(`/api/orders?order=${encodeURIComponent(q)}`);
      const data = await res.json();
      const o = data?.order || (data && !data.order ? data : null);
      const loaded = o
        ? [{
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
          }]
        : [];
      setCurrentOrder((loaded[0] as unknown as Order | null) || null);
    } catch (err) {
      setCurrentOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintOrder = () => {
    window.print();
  };

  const handleCopyOrderNumber = () => {
    if (!currentOrder) return;
    navigator.clipboard.writeText(currentOrder.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepIndex = (status: OrderStatus | string) => {
    const normalized = (status || '').toLowerCase();
    if (normalized.includes('deliver') || normalized.includes('completed')) return 3;
    if (normalized.includes('transit') || normalized.includes('out for delivery') || normalized.includes('dispatched')) return 2;
    if (normalized.includes('baking') || normalized.includes('kitchen') || normalized.includes('prep')) return 1;
    return 0; // Order Placed / Pending
  };

  const currentStepIdx = currentOrder ? getStepIndex(currentOrder.status) : 0;
  const currentStatusTheme = currentOrder ? getOrderStatusTheme(currentOrder.status) : null;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold mb-2">
          <Truck className="w-3.5 h-3.5" />
          <span>Real-time Cold-Chain Tracking</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
          Track Your Celebration Cake
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Follow your artisan cake through recipe queue, preparation baking, and temperature-controlled delivery.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="order-tracking-search-input"
            type="text"
            value={searchOrderNumber}
            onChange={(e) => setSearchOrderNumber(e.target.value)}
            placeholder="Enter Order # (e.g. CNF-10492)"
            required
            className="w-full pl-9 pr-3 py-2.5 text-xs font-mono rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <button
          id="order-tracking-search-submit"
          type="submit"
          disabled={isLoading}
          className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          Track
        </button>
      </form>

      {/* Order Tracking Card */}
      {currentOrder ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
          {/* Order Header Summary with Color-Coded Status Badge and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--border)] gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs text-[var(--text-muted)] font-medium">Tracking Order</span>
                <span className="text-sm sm:text-base font-bold font-mono text-[var(--text-main)]">
                  {currentOrder.orderNumber}
                </span>
                {/* Color-Coded Status Badge */}
                <OrderStatusBadge status={currentOrder.status} size="sm" withDot withIcon />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                Delivery Window: <strong className="text-[var(--text-main)]">{currentOrder.deliverySlot || 'Standard Delivery'}</strong> {currentOrder.deliveryDate ? `(${currentOrder.deliveryDate})` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center sm:justify-end gap-2.5">
              <button
                id="print-order-btn"
                onClick={handlePrintOrder}
                type="button"
                title="Print printer-friendly order summary"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Order</span>
              </button>

              <button
                id="preview-order-summary-btn"
                onClick={() => setShowPrintModal(true)}
                type="button"
                title="Preview printable receipt and summary"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--border)] border border-[var(--border)] text-xs font-medium text-[var(--text-main)] active:scale-95 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span className="hidden sm:inline">Summary Slip</span>
              </button>

              <div className="text-left sm:text-right pl-2 sm:pl-3 sm:border-l sm:border-[var(--border)]">
                <div className="text-[10px] text-[var(--text-muted)] font-medium">Destination Hub</div>
                <div className="text-xs font-bold text-[var(--text-main)] flex items-center sm:justify-end gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>{currentOrder.customer?.city || 'Local Delivery'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Expected Arrival Countdown Timer */}
          <ExpectedArrivalCountdown order={currentOrder} />

          {/* Stepper Visual Pipeline with Color-Coded Status Stages */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Live Milestone Pipeline</span>
              </h3>
              <span className="text-[11px] text-[var(--text-muted)]">
                Stage {currentStepIdx + 1} of 4 • <strong className={currentStatusTheme?.accentText}>{currentStatusTheme?.primaryLabel}</strong>
              </span>
            </div>

            <div className="relative pt-2">
              {/* Horizontal Connecting Line on Desktop */}
              <div className="hidden sm:block absolute top-7 left-12 right-12 h-1 bg-[var(--border)] z-0 rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 via-sky-500 to-emerald-500 transition-all duration-700 rounded-full"
                  style={{ width: `${(currentStepIdx / 3) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-2 relative z-10">
                {STATUS_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isCompleted = idx < currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  const isFuture = idx > currentStepIdx;

                  // Resolve step theme
                  const stepTheme = getOrderStatusTheme(step.status);

                  return (
                    <div
                      key={step.status}
                      className={`flex sm:flex-col items-center sm:text-center gap-3.5 sm:gap-2 p-3 sm:p-2 rounded-2xl transition-all ${
                        isCurrent
                          ? `${stepTheme.cardHighlight} border`
                          : 'bg-transparent border border-transparent'
                      }`}
                    >
                      {/* Step Circle Icon */}
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs transition-all shrink-0 ${
                          isCurrent
                            ? `${stepTheme.stepIconBg} ${stepTheme.activeRingColor}`
                            : isCompleted
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-subtle)] border border-[var(--border)]'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 sm:flex-none">
                        {/* Step Title with Color Highlight */}
                        <div className="flex items-center sm:justify-center gap-1.5">
                          <span
                            className={`text-xs font-bold ${
                              isCurrent
                                ? stepTheme.stepTextColor
                                : isCompleted
                                ? 'text-[var(--text-main)]'
                                : 'text-[var(--text-subtle)]'
                            }`}
                          >
                            {step.label}
                          </span>
                          {isCurrent && (
                            <span className={`w-2 h-2 rounded-full ${stepTheme.dotColor} shrink-0`} />
                          )}
                        </div>

                        {/* Step Description */}
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5 max-w-[160px] sm:mx-auto">
                          {step.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Color-Coded Status Pipeline Legend */}
          <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <CircleDot className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Status Key & Color Guide</span>
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Color-Coded Status Indicators</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* 1. Pending */}
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                  currentStepIdx === 0
                    ? 'bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/30'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] opacity-80'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[11px] text-amber-700 dark:text-amber-300 truncate">
                    Pending
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Queue Verified</div>
                </div>
              </div>

              {/* 2. In Preparation */}
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                  currentStepIdx === 1
                    ? 'bg-orange-500/15 border-orange-500/40 ring-1 ring-orange-500/30'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] opacity-80'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Cake className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[11px] text-orange-700 dark:text-orange-300 truncate">
                    In Preparation
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Baking & Piping</div>
                </div>
              </div>

              {/* 3. Out for Delivery */}
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                  currentStepIdx === 2
                    ? 'bg-sky-500/15 border-sky-500/40 ring-1 ring-sky-500/30'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] opacity-80'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[11px] text-sky-700 dark:text-sky-300 truncate">
                    Out for Delivery
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Cold-Chain Transit</div>
                </div>
              </div>

              {/* 4. Delivered */}
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                  currentStepIdx === 3
                    ? 'bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-500/30'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] opacity-80'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                    Delivered
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Handed Over</div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Notes & Timeline Feed with Color-Coded Status Badges */}
          <div className="p-5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--primary)]" />
              <span>Live Kitchen Dispatch Log</span>
            </h4>

            <div className="space-y-2.5">
              {currentOrder.statusHistory && currentOrder.statusHistory.length > 0 ? (
                currentOrder.statusHistory.map((hist, i) => {
                  const histTheme = getOrderStatusTheme(hist.status);
                  const HistIcon = histTheme.icon;

                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 text-xs p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]"
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${histTheme.badgeColor}`}
                      >
                        <HistIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <OrderStatusBadge
                            status={hist.status}
                            size="xs"
                            withDot={false}
                            withIcon={false}
                          />
                          <span className="text-[10px] text-[var(--text-subtle)] font-mono">
                            {new Date(hist.timestamp).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {hist.note && (
                          <p className="text-[11px] text-[var(--text-muted)] mt-1">{hist.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-[var(--text-muted)] py-2">
                  Order placed and logged in kitchen system.
                </div>
              )}
            </div>
          </div>

          {/* Order Details & Cake Inscription */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[var(--border)]">
            <div>
              <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">
                Recipient Details
              </h4>
              <div className="text-xs space-y-1 text-[var(--text-muted)]">
                <div className="font-bold text-[var(--text-main)]">{currentOrder.customer?.name}</div>
                <div>{currentOrder.customer?.address}</div>
                <div>
                  {currentOrder.customer?.city} - {currentOrder.customer?.pincode}
                </div>
                <div className="pt-1 flex items-center gap-1.5 text-[var(--primary)]">
                  <Phone className="w-3 h-3" />
                  <span>{currentOrder.customer?.phone}</span>
                </div>
                {currentOrder.customer?.email && (
                  <div className="flex items-center gap-1.5 text-[var(--text-subtle)] text-[11px]">
                    <Mail className="w-3 h-3 text-[var(--primary)]" />
                    <span>{currentOrder.customer?.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2">
                Order Items ({currentOrder.items?.length})
              </h4>
              <div className="space-y-2">
                {currentOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-[var(--text-main)]">{item.name}</div>
                      <div className="font-bold text-[var(--text-main)] shrink-0">
                        ₹{item.totalPrice || item.unitPrice * item.qty}
                      </div>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {item.weight} • {item.flavour} • Qty: {item.qty}
                    </div>
                    {item.messageOnCake && (
                      <div className="text-[11px] text-[var(--primary)] font-medium mt-1 p-1.5 rounded-lg bg-[var(--primary-light)]">
                        Piped: &ldquo;{item.messageOnCake}&rdquo;
                      </div>
                    )}
                    {item.addons && item.addons.length > 0 && (
                      <div className="text-[10px] text-[var(--text-subtle)] mt-1">
                        Add-ons: {item.addons.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Special Instructions & Dietary Note Badge */}
          {(currentOrder.specialInstructions || currentOrder.customer?.specialInstructions) && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-2.5">
              <ChefHat className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-amber-700 dark:text-amber-300 text-[11px] uppercase tracking-wider block">
                  Kitchen Customizations & Dietary Notes:
                </span>
                <p className="text-[var(--text-main)] italic">
                  &ldquo;{currentOrder.specialInstructions || currentOrder.customer?.specialInstructions}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Payment & Financial Summary */}
          <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-xs text-[var(--text-muted)] space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-main)]">Payment Method:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-main)] text-[11px] font-medium border border-[var(--border)]">
                  <CreditCard className="w-3 h-3 text-[var(--primary)]" />
                  {currentOrder.paymentMethod || 'UPI / Online'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[11px] font-bold border border-emerald-500/20">
                  {currentOrder.paymentStatus || 'Paid'}
                </span>
              </div>
              {currentOrder.transactionId && (
                <div className="text-[10px] font-mono text-[var(--text-subtle)]">
                  TXN: {currentOrder.transactionId}
                </div>
              )}
            </div>

            <div className="w-full sm:w-auto text-left sm:text-right">
              <div className="text-[11px] text-[var(--text-muted)]">Total Amount Paid</div>
              <div className="text-xl font-bold font-mono text-[var(--text-main)]">
                ₹{currentOrder.total}
              </div>
            </div>
          </div>

          {/* Bottom Action Bar with Print Order */}
          <div className="pt-5 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="print-order-bottom-btn"
                onClick={handlePrintOrder}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Order Receipt</span>
              </button>

              <button
                id="preview-order-slip-bottom-btn"
                onClick={() => setShowPrintModal(true)}
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--border)] border border-[var(--border)] text-xs font-medium text-[var(--text-main)] active:scale-95 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Preview Print Slip</span>
              </button>

              <button
                id="copy-order-number-btn"
                onClick={handleCopyOrderNumber}
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--border)] border border-[var(--border)] text-xs font-medium text-[var(--text-main)] active:scale-95 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-semibold">Copied #</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>Copy Order #</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[var(--primary)]" />
              <span>Printer-friendly receipt format</span>
            </div>
          </div>
        </div>
      ) : searched ? (
        <div className="p-12 text-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl space-y-3">
          <AlertCircle className="w-8 h-8 text-[var(--danger)] mx-auto" />
          <h3 className="text-sm font-bold text-[var(--text-main)]">Order Not Found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            We couldn&apos;t locate order &ldquo;{searchOrderNumber}&rdquo;. Please double-check your order number or contact our kitchen concierge.
          </p>
        </div>
      ) : null}

      {/* Print Preview Modal */}
      {currentOrder && (
        <Modal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="Print Order Slip & Summary"
          subtitle={`Official receipt layout for order #${currentOrder.orderNumber}`}
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="text-xs text-[var(--text-muted)]">
                Formatted for A4 paper and PDF invoice export.
              </div>
              <button
                id="modal-print-btn"
                onClick={() => {
                  setShowPrintModal(false);
                  setTimeout(() => window.print(), 200);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>

            {/* Render Printable Order Slip preview */}
            <div className="max-h-[65vh] overflow-y-auto pr-1">
              <PrintableOrderSlip order={currentOrder} />
            </div>
          </div>
        </Modal>
      )}

      {/* Hidden container dedicated to browser native printing */}
      {currentOrder && (
        <div className="hidden print:block">
          <PrintableOrderSlip order={currentOrder} />
        </div>
      )}

      {/* Embedded print media CSS to ensure clean printoutput without web app chrome */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 12mm 15mm;
            size: auto;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          /* Hide all screen interactive UI */
          header,
          nav,
          footer,
          form,
          #order-tracking-search-input,
          #order-tracking-search-submit,
          #print-order-btn,
          #print-order-bottom-btn,
          #preview-order-summary-btn,
          #preview-order-slip-bottom-btn,
          #copy-order-number-btn,
          .fixed,
          #modal-backdrop {
            display: none !important;
          }
          /* Make printable order slip visible */
          #printable-order-slip {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #111827 !important;
          }
        }
      `}</style>

      {/* Contact Concierge */}
      <div className="text-center pt-4 print:hidden">
        <button
          onClick={onNavigateHome}
          className="text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
        >
          ← Return to Artisan Storefront
        </button>
      </div>
    </div>
  );
};
