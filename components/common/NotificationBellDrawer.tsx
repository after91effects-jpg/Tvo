'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  ChefHat,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Sparkles,
  ExternalLink,
  Trash2,
  CheckCheck,
  Play,
  Settings,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useNotifications, OrderNotificationItem } from '../../context/NotificationContext';
import { OrderStatus } from '../../lib/types';

interface NotificationBellDrawerProps {
  onNavigateToTrack?: (orderNumber: string) => void;
}

export const NotificationBellDrawer: React.FC<NotificationBellDrawerProps> = ({
  onNavigateToTrack,
}) => {
  const {
    notifications,
    unreadCount,
    audioEnabled,
    pushPermission,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    setAudioEnabled,
    requestPushPermission,
    triggerTestNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    return true;
  });

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'Baking in Kitchen':
        return <ChefHat className="w-4 h-4 text-amber-500" />;
      case 'Out for Delivery':
        return <Truck className="w-4 h-4 text-blue-500" />;
      case 'Delivered':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Cancelled':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-[var(--primary)]" />;
    }
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'Baking in Kitchen':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'Out for Delivery':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'Delivered':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Cancelled':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      default:
        return 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/30';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 sm:p-2.5 rounded-full border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] transition-colors cursor-pointer"
        aria-label="Order notifications and alerts"
        title="Live Order Notifications"
      >
        <Bell className="w-4 h-4 text-[var(--text-main)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[var(--primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div
          id="notification-center-drawer"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-[var(--primary-light)] text-[var(--primary)]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)]">
                  Live Order Alerts
                </h4>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Real-time Firebase Kitchen & Delivery Updates
                </p>
              </div>
            </div>

            {/* Quick Audio Toggle */}
            <button
              id="toggle-audio-chime-btn"
              onClick={() => setAudioEnabled(!audioEnabled)}
              title={audioEnabled ? 'Mute Alert Chimes' : 'Enable Alert Chimes'}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                audioEnabled
                  ? 'bg-[var(--bg-surface)] text-[var(--primary)] border-[var(--border)]'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-subtle)] border-transparent'
              }`}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Settings & Browser Push Banner */}
          <div className="px-3.5 py-2.5 bg-[var(--bg-subtle)]/70 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-semibold text-[var(--text-main)]">Live Listener: Active</span>
            </div>

            {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
              <button
                id="request-push-permission-btn"
                onClick={requestPushPermission}
                className="px-2.5 py-1 rounded-lg bg-[var(--primary)] text-white text-[10px] font-bold hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
              >
                Enable Desktop Push
              </button>
            )}
            {pushPermission === 'granted' && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Push Enabled
              </span>
            )}
          </div>

          {/* Quick Simulator Bar (To Test Push Alerts) */}
          <div className="p-3 bg-[var(--bg-card)] border-b border-[var(--border)]">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-semibold text-[var(--text-main)] flex items-center gap-1">
                <Play className="w-3 h-3 text-[var(--primary)]" /> Simulate Real-time Status:
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => triggerTestNotification('Baking in Kitchen')}
                className="px-2 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] hover:border-amber-500 text-[10px] font-medium text-[var(--text-main)] transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <ChefHat className="w-3 h-3 text-amber-500" />
                <span>Baking</span>
              </button>
              <button
                onClick={() => triggerTestNotification('Out for Delivery')}
                className="px-2 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] hover:border-blue-500 text-[10px] font-medium text-[var(--text-main)] transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Truck className="w-3 h-3 text-blue-500" />
                <span>Shipped</span>
              </button>
              <button
                onClick={() => triggerTestNotification('Delivered')}
                className="px-2 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] hover:border-emerald-500 text-[10px] font-medium text-[var(--text-main)] transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Delivered</span>
              </button>
            </div>
          </div>

          {/* Filter & Actions Bar */}
          <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveFilter('unread')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeFilter === 'unread'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark Read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  title="Clear all alerts"
                  className="text-[10px] font-medium text-[var(--text-muted)] hover:text-rose-500 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)] max-h-72">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="w-8 h-8 text-[var(--text-subtle)] mx-auto" />
                <p className="text-xs font-semibold text-[var(--text-main)]">
                  {activeFilter === 'unread' ? 'No unread alerts' : 'No order notifications yet'}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-xs mx-auto">
                  When your order status changes in the kitchen or goes out for express delivery, live alerts will appear here in real-time.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`p-3.5 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer ${
                    !notif.read ? 'bg-[var(--primary-light)]/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shrink-0 mt-0.5">
                      {getStatusIcon(notif.newStatus)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${getStatusBadgeClass(
                            notif.newStatus
                          )}`}
                        >
                          {notif.newStatus}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-subtle)]">
                          {new Date(notif.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-[var(--text-main)] truncate">
                        Order #{notif.orderNumber}
                      </h5>
                      <p className="text-[11px] text-[var(--text-muted)] leading-tight line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="text-[var(--text-subtle)] truncate max-w-[150px]">
                          🎂 {notif.itemsSummary}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                            setIsOpen(false);
                            if (onNavigateToTrack) {
                              onNavigateToTrack(notif.orderNumber);
                            }
                          }}
                          className="font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                        >
                          <span>Track Live</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Status */}
          <div className="p-2.5 bg-[var(--bg-card)] border-t border-[var(--border)] text-center text-[10px] text-[var(--text-subtle)]">
            Powered by Firebase Firestore real-time snapshot sync
          </div>
        </div>
      )}
    </div>
  );
};
