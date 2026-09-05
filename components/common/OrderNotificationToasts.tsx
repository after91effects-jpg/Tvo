'use client';

import React, { useEffect, useState } from 'react';
import {
  ChefHat,
  Truck,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useNotifications, ToastItem } from '../../context/NotificationContext';
import { OrderStatus } from '../../lib/types';

interface OrderNotificationToastsProps {
  onNavigateToTrack?: (orderNumber: string) => void;
}

const ToastCard: React.FC<{
  toast: ToastItem;
  onDismiss: (id: string) => void;
  onTrack: (orderNumber: string) => void;
}> = ({ toast, onDismiss, onTrack }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const totalDuration = toast.duration || 8000;
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (isHovered) return;

    const startTime = Date.now();
    const intervalTime = 50;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / totalDuration) * 100);
      setProgress(remainingPercent);

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        onDismissRef.current(toast.id);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isHovered, toast.id, totalDuration]);

  // Determine icon, colors, and badge for status/type
  const getConfig = () => {
    if (toast.type === 'success' || (!toast.orderNumber && toast.title)) {
      return {
        icon: <Sparkles className="w-5 h-5 text-emerald-500" />,
        bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
        badge: toast.title || 'Success',
        accentBorder: 'border-l-4 border-l-emerald-500',
        progressColor: 'bg-emerald-500',
      };
    }

    const status = toast.newStatus || 'Order Placed';
    switch (status) {
      case 'Baking in Kitchen':
        return {
          icon: <ChefHat className="w-5 h-5 text-amber-500" />,
          bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
          badge: 'Baking in Kitchen',
          accentBorder: 'border-l-4 border-l-amber-500',
          progressColor: 'bg-amber-500',
        };
      case 'Out for Delivery':
        return {
          icon: <Truck className="w-5 h-5 text-blue-500" />,
          bgColor: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
          badge: 'Out for Delivery / Shipped',
          accentBorder: 'border-l-4 border-l-blue-500',
          progressColor: 'bg-blue-500',
        };
      case 'Delivered':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
          badge: 'Successfully Delivered',
          accentBorder: 'border-l-4 border-l-emerald-500',
          progressColor: 'bg-emerald-500',
        };
      case 'Cancelled':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400',
          badge: 'Order Cancelled',
          accentBorder: 'border-l-4 border-l-rose-500',
          progressColor: 'bg-rose-500',
        };
      default:
        return {
          icon: <Sparkles className="w-5 h-5 text-[var(--primary)]" />,
          bgColor: 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/30',
          badge: toast.title || status,
          accentBorder: 'border-l-4 border-l-[var(--primary)]',
          progressColor: 'bg-[var(--primary)]',
        };
    }
  };

  const config = getConfig();

  return (
    <div
      id={`app-toast-${toast.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full max-w-sm sm:max-w-md bg-[var(--bg-surface)] border border-[var(--border)] ${config.accentBorder} rounded-2xl shadow-2xl p-4 transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden`}
    >
      {/* Top Header: Badge, Order ID/Title & Dismiss */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] shrink-0">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md ${config.bgColor}`}>
                {config.badge}
              </span>
              {toast.orderNumber && (
                <span className="text-xs font-mono font-bold text-[var(--text-main)]">
                  {toast.orderNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          id={`toast-dismiss-${toast.id}`}
          onClick={() => onDismiss(toast.id)}
          className="p-1 text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message Body */}
      <p className="text-xs text-[var(--text-main)] leading-relaxed font-medium mb-1.5">
        {toast.message}
      </p>

      {/* Item Details snippet */}
      {toast.itemsSummary && (
        <div className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2.5 py-1.5 rounded-lg mb-3 flex items-center justify-between">
          <span className="truncate pr-2 font-medium">🎂 {toast.itemsSummary}</span>
          {toast.total !== undefined && toast.total > 0 && (
            <span className="font-bold text-[var(--text-main)] shrink-0">
              ₹{toast.total}
            </span>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--border)] text-xs">
        <span className="text-[10px] text-[var(--text-subtle)] font-medium">
          Just now
        </span>

        {toast.orderNumber && (
          <button
            id={`toast-track-${toast.orderNumber}`}
            onClick={() => {
              if (toast.orderNumber) {
                onTrack(toast.orderNumber);
                onDismiss(toast.id);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <span>Track Live</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--bg-subtle)]">
        <div
          className={`h-full ${config.progressColor} transition-all ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const OrderNotificationToasts: React.FC<OrderNotificationToastsProps> = ({
  onNavigateToTrack,
}) => {
  const { toasts, dismissToast, audioEnabled, setAudioEnabled } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      id="order-notifications-viewport"
      aria-live="polite"
      className="fixed bottom-5 right-4 sm:right-6 z-50 flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-auto"
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
          onTrack={(orderNum) => {
            if (onNavigateToTrack) {
              onNavigateToTrack(orderNum);
            }
          }}
        />
      ))}
    </div>
  );
};
