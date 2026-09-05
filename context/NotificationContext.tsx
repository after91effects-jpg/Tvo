'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Order, OrderStatus } from '../lib/types';
import { notificationAudio } from '../lib/audio';
import { useLocalStorageJSON } from '../lib/useLocalStorage';

export interface OrderNotificationItem {
  id: string;
  orderId: string;
  orderNumber: string;
  previousStatus: OrderStatus | 'Pending' | 'None';
  newStatus: OrderStatus;
  customerName: string;
  itemsSummary: string;
  total: number;
  deliverySlot?: string;
  timestamp: string;
  read: boolean;
  message: string;
  title: string;
}

export interface ToastItem extends Partial<OrderNotificationItem> {
  id: string;
  timestamp: string;
  message: string;
  title: string;
  type?: 'order' | 'success' | 'info' | 'error';
  duration?: number;
}

interface NotificationContextType {
  toasts: ToastItem[];
  notifications: OrderNotificationItem[];
  unreadCount: number;
  audioEnabled: boolean;
  pushPermission: NotificationPermission | 'unsupported';
  showToast: (toast: { title: string; message: string; type?: 'order' | 'success' | 'info' | 'error'; duration?: number }) => void;
  dismissToast: (toastId: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  setAudioEnabled: (enabled: boolean) => void;
  requestPushPermission: () => Promise<boolean>;
  triggerTestNotification: (status?: OrderStatus) => void;
  activeTrackingOrderNumber: string | null;
  setActiveTrackingOrderNumber: (orderNum: string | null) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const STORAGE_KEY_NOTIFS = 'confetto_order_notifications';
const STORAGE_KEY_AUDIO = 'confetto_audio_notifications_enabled';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useLocalStorageJSON<OrderNotificationItem[]>(STORAGE_KEY_NOTIFS, []);
  const [audioEnabled, setAudioEnabledState] = useLocalStorageJSON<boolean>(STORAGE_KEY_AUDIO, true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [activeTrackingOrderNumber, setActiveTrackingOrderNumber] = useState<string | null>(null);

  // Keep a map of previous order statuses to detect changes accurately
  const prevOrderStatusesRef = useRef<Map<string, OrderStatus>>(new Map());
  const isInitialSnapshotRef = useRef<boolean>(true);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    setAudioEnabledState(enabled);
  }, [setAudioEnabledState]);

  const requestPushPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushPermission('unsupported');
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      setPushPermission(result);
      return result === 'granted';
    } catch {
      return false;
    }
  };

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  // Helper to trigger rich notification & audio
  const dispatchOrderNotification = useCallback(
    (
      order: Partial<Order> & { orderNumber: string; status: OrderStatus },
      previousStatus: OrderStatus | 'Pending' | 'None'
    ) => {
      const newStatus = order.status;
      let title = `Order ${order.orderNumber} Status Updated`;
      let message = `Your celebration order is now marked as ${newStatus}.`;
      let audioType: 'baking' | 'shipped' | 'delivered' | 'cancelled' | 'default' = 'default';

      if (newStatus === 'Baking in Kitchen') {
        title = `🧁 Chef is Baking Your Cake! (${order.orderNumber})`;
        message = `Our master pastry chef is currently decorating and frosting your fresh artisanal dessert.`;
        audioType = 'baking';
      } else if (newStatus === 'Out for Delivery') {
        title = `🚚 Cake Out for Delivery! (${order.orderNumber})`;
        message = `Your temperature-controlled express delivery is on its way. Expect prompt doorstep arrival!`;
        audioType = 'shipped';
      } else if (newStatus === 'Delivered') {
        title = `🎉 Order Delivered! (${order.orderNumber})`;
        message = `Your celebration cake has been safely hand-delivered. We hope your moments are filled with sweetness!`;
        audioType = 'delivered';
      } else if (newStatus === 'Cancelled') {
        title = `⚠️ Order Cancelled (${order.orderNumber})`;
        message = `Order ${order.orderNumber} was cancelled and any refundable charges have been initiated.`;
        audioType = 'cancelled';
      }

      const itemsSummary = order.items && order.items.length > 0
        ? order.items.map((i) => `${i.qty}x ${i.name}`).join(', ')
        : 'Artisan Celebration Dessert';

      const notifItem: OrderNotificationItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        orderId: order.id || order.orderNumber,
        orderNumber: order.orderNumber,
        previousStatus,
        newStatus,
        customerName: order.customer?.name || 'Customer',
        itemsSummary,
        total: order.total || 0,
        deliverySlot: order.deliverySlot,
        timestamp: new Date().toISOString(),
        read: false,
        title,
        message,
      };

      // 1. Play audio chime if enabled
      if (audioEnabled) {
        notificationAudio.playChime(audioType);
      }

      // 2. Trigger native push notification if permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const nativeNotif = new Notification(title, {
            body: message,
            icon: '/favicon.ico',
            tag: `confetto-order-${order.orderNumber}`,
          });
          nativeNotif.onclick = () => {
            window.focus();
            setActiveTrackingOrderNumber(order.orderNumber);
          };
        } catch {
          // Native push fallback
        }
      }

      // 3. Add to In-App Toast Queue
      setToasts((prev) => [
        {
          ...notifItem,
          type: 'order',
          duration: 8000,
        },
        ...prev.slice(0, 3), // show up to 4 toasts simultaneously
      ]);

      // 4. Save to persistent notification history
      setNotifications((prev) => {
        const safe = Array.isArray(prev) ? prev : [];
        return [notifItem, ...safe.filter((n) => n.id !== notifItem.id)].slice(0, 30);
      });
    },
    [audioEnabled, setNotifications, setActiveTrackingOrderNumber]
  );

  const showToast = useCallback(
    ({
      title,
      message,
      type = 'success',
      duration = 6000,
    }: {
      title: string;
      message: string;
      type?: 'order' | 'success' | 'info' | 'error';
      duration?: number;
    }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = {
        id,
        timestamp: new Date().toISOString(),
        title,
        message,
        type,
        duration,
      };

      if (audioEnabled) {
        notificationAudio.playChime('default');
      }

      setToasts((prev) => [newToast, ...prev.slice(0, 3)]);
    },
    [audioEnabled]
  );

  // Poll orders status changes via SQLite API
  useEffect(() => {
    let isMounted = true;

    const pollOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        const orders: Order[] = data.orders || [];
        if (!isMounted) return;

        // On first poll, populate initial map without alerts
        if (isInitialSnapshotRef.current) {
          orders.forEach((data) => {
            if (data && data.orderNumber && data.status) {
              prevOrderStatusesRef.current.set(data.orderNumber, data.status);
            }
          });
          isInitialSnapshotRef.current = false;
          return;
        }

        // Detect new orders & status changes
        orders.forEach((data) => {
          if (!data || !data.orderNumber || !data.status) return;
          const orderNum = data.orderNumber;
          const currentStatus = data.status;
          const previousStatus = prevOrderStatusesRef.current.get(orderNum);

          if (!previousStatus && currentStatus === 'Order Placed') {
            prevOrderStatusesRef.current.set(orderNum, currentStatus);
            dispatchOrderNotification({ ...data, id: data.id || orderNum }, 'None');
          } else if (previousStatus && previousStatus !== currentStatus) {
            prevOrderStatusesRef.current.set(orderNum, currentStatus);
            dispatchOrderNotification({ ...data, id: data.id || orderNum }, previousStatus);
          } else {
            prevOrderStatusesRef.current.set(orderNum, currentStatus);
          }
        });

        // Remove deleted orders from map
        const currentNums = new Set(orders.map((o) => o.orderNumber));
        prevOrderStatusesRef.current.forEach((_, num) => {
          if (!currentNums.has(num)) prevOrderStatusesRef.current.delete(num);
        });
      } catch (err) {
        console.warn('Could not poll orders notification:', err);
      }
    };

    // Initial poll immediately, then every 10 seconds
    pollOrders();
    const interval = setInterval(pollOrders, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dispatchOrderNotification]);

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) => {
      const safe = Array.isArray(prev) ? prev : [];
      return safe.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const safe = Array.isArray(prev) ? prev : [];
      return safe.map((n) => ({ ...n, read: true }));
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Demo simulator trigger for user evaluation & testing
  const triggerTestNotification = (targetStatus?: OrderStatus) => {
    const statuses: OrderStatus[] = [
      'Baking in Kitchen',
      'Out for Delivery',
      'Delivered',
    ];
    const chosenStatus = targetStatus || statuses[Math.floor(Math.random() * statuses.length)];
    const mockOrderNum = `CNF-${Math.floor(100000 + Math.random() * 900000)}`;

    dispatchOrderNotification(
      {
        orderNumber: mockOrderNum,
        status: chosenStatus,
        customerName: 'Ananya Sharma',
        items: [
          {
            productId: 'demo-1',
            name: 'Belgian Chocolate Truffle Gateau',
            sku: 'CONF-BCTG-01',
            qty: 1,
            weight: '1.0 kg',
            flavour: 'Dutch Dark Truffle',
            unitPrice: 1299,
            totalPrice: 1299,
          },
        ],
        total: 1364,
        deliverySlot: 'Evening Express (4 PM - 8 PM)',
      } as any,
      chosenStatus === 'Out for Delivery' ? 'Baking in Kitchen' : 'Order Placed'
    );
  };

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        notifications: notifications || [],
        unreadCount,
        audioEnabled: !!audioEnabled,
        pushPermission,
        showToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        setAudioEnabled,
        requestPushPermission,
        triggerTestNotification,
        activeTrackingOrderNumber,
        setActiveTrackingOrderNumber,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
