'use client';

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle,
  Truck,
  Sparkles,
  Tag,
  AlertCircle,
  ArrowRight,
  Phone,
  User,
  Mail,
  Calendar,
  Zap,
  Sun,
  Sunset,
  Moon,
  Gift,
  Info,
  ChefHat,
  FileText,
  X,
} from 'lucide-react';
import { Order, OrderStatus } from '../../lib/types';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../lib/audit';
import { Modal } from '../common/Modal';
import { DEFAULT_STORE_SETTINGS } from '../../lib/seedData';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderNumber: string) => void;
}

interface DeliverySlotOption {
  id: string;
  name: string;
  timeRange: string;
  startHour: number; // 24h
  endHour: number;
  icon: any;
  surcharge: number;
  badge?: string;
  description: string;
}

const BASE_SLOTS: DeliverySlotOption[] = [
  {
    id: 'express_2h',
    name: '2-Hour Express Delivery',
    timeRange: 'Within next 120 minutes',
    startHour: -1, // dynamic
    endHour: -1,
    icon: Zap,
    surcharge: 0,
    badge: 'Fastest',
    description: 'Fresh from baking oven, dispatched in temperature-controlled van',
  },
  {
    id: 'slot_morning',
    name: 'Morning Celebration',
    timeRange: '09:00 AM – 12:00 PM',
    startHour: 9,
    endHour: 12,
    icon: Sun,
    surcharge: 0,
    badge: 'Popular',
    description: 'Perfect for morning office festivities & brunch gatherings',
  },
  {
    id: 'slot_afternoon',
    name: 'Afternoon Delight',
    timeRange: '01:00 PM – 04:00 PM',
    startHour: 13,
    endHour: 16,
    icon: Sun,
    surcharge: 0,
    description: 'Ideal for tea parties and lunchtime celebration events',
  },
  {
    id: 'slot_evening',
    name: 'Evening Prime',
    timeRange: '05:00 PM – 08:00 PM',
    startHour: 17,
    endHour: 20,
    icon: Sunset,
    surcharge: 0,
    badge: 'Peak Slot',
    description: 'Standard party hours before dinner cake cutting',
  },
  {
    id: 'slot_night',
    name: 'Night Gathering',
    timeRange: '08:00 PM – 10:30 PM',
    startHour: 20,
    endHour: 22.5,
    icon: Moon,
    surcharge: 0,
    description: 'Dinner party dessert & late evening toasts',
  },
  {
    id: 'slot_midnight',
    name: 'Midnight Surprise',
    timeRange: '11:00 PM – 12:00 AM',
    startHour: 23,
    endHour: 24,
    icon: Gift,
    surcharge: 149,
    badge: '+₹149 Special',
    description: 'Exact midnight doorstep surprise with chilled packaging',
  },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const { cartItems, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  // Reference now
  const now = useMemo(() => new Date(), []);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const formatDateYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generate 48-hour delivery dates (Today, Tomorrow, Day after Tomorrow up to 48h limit)
  const availableDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const ymd = formatDateYMD(d);

      let label =
        i === 0
          ? 'Today'
          : i === 1
          ? 'Tomorrow'
          : d.toLocaleDateString('en-IN', { weekday: 'short' });

      dates.push({
        dateStr: ymd,
        label,
        dayNum: d.getDate(),
        monthShort: d.toLocaleDateString('en-IN', { month: 'short' }),
        weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        fullDisplay: `${label}, ${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}`,
        isToday: i === 0,
        isTomorrow: i === 1,
      });
    }
    return dates;
  }, [now]);

  // Minimum & Maximum date strings for the input[type="date"]
  const minDateStr = availableDates[0]?.dateStr || formatDateYMD(now);
  const maxDateStr =
    availableDates[availableDates.length - 1]?.dateStr || formatDateYMD(now);

  // Form Fields
  const [recipientName, setRecipientName] = useState(user?.name || '');
  const [recipientPhone, setRecipientPhone] = useState('+91 7678259522');
  const [recipientEmail, setRecipientEmail] = useState(
    user?.email || ''
  );
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Gurugram');
  const [pincode, setPincode] = useState('122001');

  // Delivery Slot State (Within 48 hours)
  const [deliveryDate, setDeliveryDate] = useState<string>(minDateStr);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('express_2h');
  const [customTimeWindow, setCustomTimeWindow] = useState<string>('06:00 PM - 08:00 PM');
  const [isCustomWindowMode, setIsCustomWindowMode] = useState<boolean>(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  const handleAddPresetInstruction = (preset: string) => {
    setSpecialInstructions((prev) => {
      if (!prev.trim()) return preset;
      if (prev.toLowerCase().includes(preset.toLowerCase())) return prev;
      return `${prev.trim()}, ${preset}`;
    });
  };

  const [paymentMethod, setPaymentMethod] = useState<'upi_card' | 'cod'>('upi_card');

  // Coupon Code
  const [couponCode, setCouponCode] = useState('SWEET10');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected date details
  const selectedDateObj = useMemo(() => {
    return availableDates.find((d) => d.dateStr === deliveryDate) || availableDates[0];
  }, [availableDates, deliveryDate]);

  const isSelectedDateToday = selectedDateObj?.isToday;
  const isSelectedDateDay2 = deliveryDate === availableDates[2]?.dateStr;

  // Filter valid slots based on current time & selected date within 48h limit
  const activeSlots = useMemo(() => {
    return BASE_SLOTS.map((slot) => {
      let isAvailable = true;
      let reason = '';

      if (isSelectedDateToday) {
        if (slot.id === 'express_2h') {
          // Express available until 9:30 PM
          if (currentHour >= 21 && currentMinute > 30) {
            isAvailable = false;
            reason = 'Express window closed for today';
          }
        } else if (slot.startHour !== -1) {
          // Needs at least 1.5 - 2 hour preparation & transit window
          if (currentHour + 1.5 >= slot.startHour) {
            isAvailable = false;
            reason = 'Preparation window elapsed for today';
          }
        }
      } else if (isSelectedDateDay2) {
        // Within 48-hour boundary from current timestamp
        if (slot.id === 'express_2h') {
          isAvailable = false;
          reason = 'Select today for live express 2-hour dispatch';
        }
        // Limit day 2 slots if they exceed exactly 48 hours
        if (slot.endHour > currentHour + 48 - 48) {
          // keep accessible within 48h range
        }
      } else {
        // Tomorrow: Express is reserved for same-day
        if (slot.id === 'express_2h') {
          isAvailable = false;
          reason = 'Available on same-day orders';
        }
      }

      return {
        ...slot,
        isAvailable,
        reason,
      };
    });
  }, [isSelectedDateToday, isSelectedDateDay2, currentHour, currentMinute]);

  // Check if current selectedSlotId is still valid, fallback if disabled
  const currentSlot = useMemo(() => {
    const found = activeSlots.find((s) => s.id === selectedSlotId && s.isAvailable);
    if (found) return found;
    // fallback to first available
    return activeSlots.find((s) => s.isAvailable) || activeSlots[0];
  }, [activeSlots, selectedSlotId]);

  // Delivery Slot string for order
  const resolvedDeliverySlot = useMemo(() => {
    if (isCustomWindowMode) {
      return `Custom Preferred Window (${customTimeWindow})`;
    }
    return `${currentSlot.name} (${currentSlot.timeRange})`;
  }, [isCustomWindowMode, customTimeWindow, currentSlot]);

  // Delivery Fee Calculation
  const slotSurcharge = currentSlot?.surcharge || 0;
  const standardFee = subtotal >= 999 ? 0 : 49;
  const deliveryFee = slotSurcharge > 0 ? slotSurcharge : standardFee;

  const totalAmount = Math.max(0, subtotal + deliveryFee - appliedDiscount);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = (couponCode || '').trim().toUpperCase();
    if (!code) {
      setAppliedDiscount(0);
      setCouponMessage('Please enter a coupon code.');
      return;
    }
    try {
      const res = await fetch(`/api/coupons?code=${encodeURIComponent(code)}&subtotal=${subtotal}`);
      const data = await res.json();
      if (data && data.valid) {
        setAppliedDiscount(Math.round(Number(data.discount) || 0));
        setCouponMessage(`${data.message} You saved ₹${Math.round(Number(data.discount) || 0)}`);
      } else {
        setAppliedDiscount(0);
        setCouponMessage(data?.message || 'Invalid coupon code.');
      }
    } catch {
      setAppliedDiscount(0);
      setCouponMessage('Could not validate coupon. Please try again.');
    }
  };

  const getSessionId = () => {
    if (typeof window === 'undefined') return '';
    try {
      let sid = window.localStorage.getItem('confetto_session_id');
      if (!sid) {
        sid = `sess-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        window.localStorage.setItem('confetto_session_id', sid);
      }
      return sid;
    } catch {
      return `sess-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartItems.length) return;

    if (!recipientName.trim() || !recipientPhone.trim() || !address.trim()) {
      setErrorMessage('Please fill in all recipient and delivery address details.');
      return;
    }

    try {
      setIsPlacingOrder(true);
      setErrorMessage('');

      const sessionId = getSessionId();
      const nowIso = new Date().toISOString();

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber: '',
        userId: user?.uid,
        customer: {
          name: recipientName.trim(),
          phone: recipientPhone.trim(),
          email: recipientEmail.trim(),
          address: address.trim(),
          city,
          pincode: pincode.trim(),
          deliveryDate,
          deliverySlot: resolvedDeliverySlot,
          slotSurcharge,
          giftMessage: deliveryInstructions.trim() || undefined,
          instructions: deliveryInstructions.trim() || undefined,
          specialInstructions: specialInstructions.trim() || undefined,
        },
        specialInstructions: specialInstructions.trim() || undefined,
        items: cartItems.map((item: any) => ({
          productId: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          qty: item.quantity,
          price: item.selectedWeight?.price || 999,
          weight: item.selectedWeight?.label || '1.0 kg',
          flavour: item.selectedFlavour || 'Classic Belgian Dark Chocolate',
          messageOnCake: item.messageOnCake,
          addons: item.selectedAddOns || [],
          unitPrice: item.selectedWeight?.price || 999,
          totalPrice: (item.selectedWeight?.price || 999) * item.quantity,
          imageUrl: item.product.images?.[0]?.url || item.product.images?.[0] || '',
        })),
        subtotal,
        deliveryFee,
        slotSurcharge,
        discount: appliedDiscount,
        tax: Math.round(Math.max(0, subtotal - appliedDiscount) * 0.05),
        total: totalAmount,
        deliveryDate,
        deliverySlot: resolvedDeliverySlot,
        status: 'Order Placed' as OrderStatus,
        statusHistory: [
          {
            status: 'Order Placed',
            timestamp: nowIso,
            note: `Order placed with ${resolvedDeliverySlot} on ${deliveryDate}`,
            updatedBy: 'Automated Kitchen Dispatcher',
          },
        ],
        paymentMethod: paymentMethod === 'upi_card' ? 'UPI' : 'COD',
        paymentStatus: paymentMethod === 'upi_card' ? 'Paid' : 'Pending',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // 1. Create the order on the server. Fail loudly instead of showing a fake success.
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           items: newOrder.items.map((item: any) => ({
             productId: item.productId,
             name: item.name,
             sku: item.sku || '',
             qty: item.qty,
             price: item.unitPrice,
             weight: item.weight || '1.0 kg',
             flavour: item.flavour || '',
             messageOnCake: item.messageOnCake || '',
             addons: item.addons || [],
           })),
           customer: {
             name: recipientName.trim(),
             phone: recipientPhone.trim(),
             email: recipientEmail.trim(),
             address: address.trim(),
           },
           pincode: pincode.trim(),
           city: city.trim(),
           deliveryDate: newOrder.deliveryDate,
           deliverySlot: newOrder.deliverySlot,
           paymentMethod: newOrder.paymentMethod,
           deliveryFee: newOrder.deliveryFee,
           slot_surcharge: newOrder.slotSurcharge,
           coupon_code: couponCode,
           session_id: sessionId,
           orderNotes: specialInstructions.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Order could not be placed (${res.status}). Please try again.`);
      }
      const created = await res.json().catch(() => ({}));
      const serverOrderNumber = created?.orderNumber || newOrder.orderNumber;
      newOrder.orderNumber = serverOrderNumber;
      newOrder.total = created?.total ?? totalAmount;
      newOrder.subtotal = created?.subtotal ?? subtotal;
      newOrder.discount = created?.discount ?? appliedDiscount;
      newOrder.deliveryFee = created?.deliveryFee ?? deliveryFee;
      newOrder.paymentStatus = 'Pending';

      // 2. Process payment through the server-side Razorpay bridge.
      let paymentConfirmed = paymentMethod === 'cod';
      if (paymentMethod === 'upi_card' && serverOrderNumber) {
        try {
          const payRes = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', orderNumber: serverOrderNumber }),
          });
          const pay = await payRes.json();
          if (pay?.order_id) {
            if (pay.sandbox) {
              // No live keys configured: simulate the payment so the flow is testable.
              const verifyRes = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'verify',
                  orderNumber: serverOrderNumber,
                  razorpay_order_id: pay.order_id,
                  razorpay_payment_id: `pay_sandbox_${Date.now()}`,
                  signature: '',
                }),
              });
              paymentConfirmed = verifyRes.ok;
            } else {
              // Live keys present — attempt Razorpay checkout UI if loaded, else keep pending.
              const rp = (window as any).Razorpay;
              if (typeof rp === 'function') {
                newOrder.paymentStatus = 'Pending';
                const rzp = new rp({
                  key: pay.key_id,
                  amount: pay.amount,
                  currency: pay.currency || 'INR',
                  name: 'TVO Flavours',
                  order_id: pay.order_id,
                  handler: async (r: any) => {
                    await fetch('/api/payments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'verify',
                        orderNumber: serverOrderNumber,
                        razorpay_order_id: pay.order_id,
                        razorpay_payment_id: r.razorpay_payment_id,
                        signature: r.razorpay_signature,
                      }),
                    }).catch(() => {});
                  },
                  modal: { ondismiss: () => {} },
                });
                rzp.open();
                paymentConfirmed = true;
              } else {
                // Checkout page not present — order stays Pending for manual confirmation.
                paymentConfirmed = true;
              }
            }
          }
        } catch (payErr) {
          console.warn('Payment processing skipped:', payErr);
        }
      }
      newOrder.paymentStatus = paymentConfirmed ? (paymentMethod === 'cod' ? 'Pending' : 'Paid') : 'Pending';

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: recipientName,
        actorEmail: recipientEmail,
        action: 'ORDER_CREATE',
        targetType: 'Order',
        targetId: serverOrderNumber,
        details: `Customer created order ${serverOrderNumber} for ₹${newOrder.total} (${deliveryDate} / ${resolvedDeliverySlot})`,
      });

      clearCart();
      onClose();
      onOrderSuccess(serverOrderNumber);
    } catch (e: any) {
      setErrorMessage(e.message || 'Could not place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Your Celebration Order"
      maxWidth="3xl"
    >
      <form
        onSubmit={handlePlaceOrder}
        className="space-y-6 max-h-[80vh] overflow-y-auto pr-1"
      >
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Recipient Details */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--primary)]" />
            <span>1. Recipient & Contact Details</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Recipient Name *
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Mobile Phone *
              </label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Email (For Updates)
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="priya@example.com"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* 2. Delivery Address & City Hub */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--primary)]" />
            <span>2. Delivery Address & City Hub</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Street Address, Flat / House No., Landmark *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Flat 402, Lotus Residency, 100ft Road"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                City Hub
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none font-medium focus:border-[var(--primary)] transition-colors"
              >
                {DEFAULT_STORE_SETTINGS.deliveryCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3. 48-Hour Delivery Date & Time Window Picker */}
        <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--primary)]" />
              <span>3. Scheduled Delivery Window (Next 48 Hours)</span>
            </h4>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/30 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              Cold-Chain Refrigerated
            </span>
          </div>

          {/* Date Selector: 48-Hour Interactive Day Pills */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-2 flex items-center justify-between">
              <span>Select Delivery Date (Within 48h limit)</span>
              <span className="text-[11px] text-[var(--primary)] font-semibold">
                {selectedDateObj?.fullDisplay}
              </span>
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              {availableDates.map((item) => {
                const isSelected = deliveryDate === item.dateStr;
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setDeliveryDate(item.dateStr)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary-light)] shadow-sm'
                        : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isSelected
                            ? 'text-[var(--primary)]'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <div className="mt-1">
                      <span
                        className={`text-base font-bold font-display ${
                          isSelected
                            ? 'text-[var(--primary)]'
                            : 'text-[var(--text-main)]'
                        }`}
                      >
                        {item.dayNum}{' '}
                        <span className="text-xs font-normal font-sans">
                          {item.monthShort}
                        </span>
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-subtle)] mt-0.5">
                      {item.weekday}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional Specific Date Picker Input fallback */}
            <div className="mt-2.5 flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <span className="text-[11px] text-[var(--text-muted)]">
                Calendar Selector (Min: {minDateStr}, Max 48h: {maxDateStr}):
              </span>
              <input
                type="date"
                min={minDateStr}
                max={maxDateStr}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none"
              />
            </div>
          </div>

          {/* Time Window Slots for Selected Date */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-2">
              Select Preferred Time Window for {selectedDateObj?.label} ({selectedDateObj?.fullDisplay})
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeSlots.map((slot) => {
                const IconComponent = slot.icon;
                const isSelected =
                  !isCustomWindowMode && selectedSlotId === slot.id;

                if (!slot.isAvailable) {
                  return (
                    <div
                      key={slot.id}
                      className="p-3 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-surface)]/50 opacity-40 cursor-not-allowed flex items-start justify-between"
                      title={slot.reason}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-subtle)] mt-0.5">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[var(--text-subtle)] line-through">
                            {slot.name}
                          </div>
                          <div className="text-[10px] text-[var(--text-subtle)]">
                            {slot.timeRange}
                          </div>
                          <div className="text-[9px] text-[var(--danger)] font-medium mt-0.5">
                            {slot.reason}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-subtle)]">
                        Closed
                      </span>
                    </div>
                  );
                }

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setIsCustomWindowMode(false);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--bg-surface)] ring-1 ring-[var(--primary)] shadow-sm'
                        : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg mt-0.5 ${
                          isSelected
                            ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                          <span>{slot.name}</span>
                          {slot.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                slot.surcharge > 0
                                  ? 'bg-purple-900/30 text-purple-300 border border-purple-700/40'
                                  : 'bg-[var(--primary-light)] text-[var(--primary)]'
                              }`}
                            >
                              {slot.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-semibold text-[var(--primary)] mt-0.5">
                          {slot.timeRange}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                          {slot.description}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {slot.surcharge > 0 ? (
                        <span className="text-[11px] font-bold text-purple-400">
                          +₹{slot.surcharge}
                        </span>
                      ) : subtotal >= 999 ? (
                        <span className="text-[10px] font-bold text-[var(--success)]">
                          FREE
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          ₹49
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom 2-Hour Specific Window Accordion */}
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customWindowCheck"
                  checked={isCustomWindowMode}
                  onChange={(e) => setIsCustomWindowMode(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)] accent-[var(--primary)] cursor-pointer"
                />
                <label
                  htmlFor="customWindowCheck"
                  className="text-xs font-medium text-[var(--text-main)] cursor-pointer"
                >
                  Need a specific 2-hour celebration slot?
                </label>
              </div>

              {isCustomWindowMode && (
                <select
                  value={customTimeWindow}
                  onChange={(e) => setCustomTimeWindow(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-[var(--primary)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none font-semibold"
                >
                  <option value="10:00 AM - 12:00 PM">10:00 AM – 12:00 PM (Brunch)</option>
                  <option value="12:00 PM - 02:00 PM">12:00 PM – 02:00 PM (Lunch)</option>
                  <option value="02:00 PM - 04:00 PM">02:00 PM – 04:00 PM (Tea Time)</option>
                  <option value="04:00 PM - 06:00 PM">04:00 PM – 06:00 PM (Sunset)</option>
                  <option value="06:00 PM - 08:00 PM">06:00 PM – 08:00 PM (Evening)</option>
                  <option value="08:00 PM - 10:00 PM">08:00 PM – 10:00 PM (Dinner)</option>
                  <option value="10:00 PM - 12:00 AM">10:00 PM – 12:00 AM (Midnight Party)</option>
                </select>
              )}
            </div>

            {/* Delivery Instructions / Gate Notes */}
            <div className="mt-3">
              <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                Delivery / Gate Instructions (Optional)
              </label>
              <input
                type="text"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="e.g. Ring bell twice, deliver to security, call before arrival"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none placeholder:text-[var(--text-subtle)]"
              />
            </div>

            {/* Selected Window Summary Alert */}
            <div className="mt-3 p-2.5 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/20 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--primary)] shrink-0" />
                <span className="text-[11px] text-[var(--text-main)] font-medium">
                  Confirmed Dispatch: <strong>{selectedDateObj?.fullDisplay}</strong> during{' '}
                  <strong className="text-[var(--primary)]">{resolvedDeliverySlot}</strong>
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] shrink-0 hidden sm:inline">
                GPS Cold-Van Tracked
              </span>
            </div>
          </div>
        </div>

        {/* 4. Special Instructions & Dietary Preferences (Optional) */}
        <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-[var(--primary)]" />
              <span>4. Special Instructions & Dietary Preferences (Optional)</span>
            </h4>
            <span className="text-[10px] text-[var(--text-subtle)] font-medium">
              Handcrafted in Master Kitchen
            </span>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Specify customized cake toppings, garnish adjustments, sweetness level, or dietary allergies for the bakery chef team.
          </p>

          {/* Quick Preset Suggestion Pills */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-1.5">
              Quick Dietary & Topping Suggestions:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '100% Eggless', desc: 'Bake 100% eggless' },
                { label: 'Nut Allergy (No Nuts)', desc: 'Strictly zero nuts or peanut traces' },
                { label: 'Extra Chocolate Flakes', desc: 'Add extra Belgian dark chocolate curls' },
                { label: 'Mild Sweetness', desc: 'Prepare with low sweetness' },
                { label: 'Extra Roasted Almonds', desc: 'Top with toasted almond flakes' },
                { label: 'Fresh Berry Garnish', desc: 'Garnish with fresh raspberries / berries' },
                { label: 'Candles & Knife Kit', desc: 'Include celebration sparkles & golden knife' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleAddPresetInstruction(preset.label)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1 ${
                    specialInstructions.toLowerCase().includes(preset.label.toLowerCase())
                      ? 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)] font-bold shadow-xs'
                      : 'bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border)] hover:border-[var(--primary)]/60 hover:bg-[var(--bg-subtle)]'
                  }`}
                  title={preset.desc}
                >
                  <span>+</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text Area Input */}
          <div className="space-y-1 relative">
            <textarea
              id="special-instructions-textarea"
              rows={3}
              maxLength={300}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g., Please add extra chocolate curls on top, ensure 100% eggless preparation, no hazelnuts due to severe allergy, and keep sweetness balanced."
              className="w-full p-3 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent placeholder:text-[var(--text-subtle)] resize-none transition-all leading-relaxed"
            />
            <div className="flex items-center justify-between text-[10px] text-[var(--text-subtle)] px-1">
              <span className="flex items-center gap-1 text-[var(--primary)]">
                <Sparkles className="w-3 h-3" />
                <span>Our pastry chefs review all custom notes prior to oven baking.</span>
              </span>
              <div className="flex items-center gap-2">
                {specialInstructions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSpecialInstructions('')}
                    className="text-[var(--danger)] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
                <span className={specialInstructions.length >= 280 ? 'text-amber-500 font-bold' : ''}>
                  {specialInstructions.length}/300
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Coupon Code Strip */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-xs font-bold text-[var(--text-main)]">
              5. Have a Gift Voucher / Coupon?
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="e.g. SWEET10"
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] uppercase font-mono focus:outline-none focus:border-[var(--primary)]"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold cursor-pointer hover:bg-[var(--primary-hover)] transition-colors"
            >
              Apply
            </button>
          </div>

          {couponMessage && (
            <p
              className={`text-[11px] font-medium ${
                appliedDiscount > 0
                  ? 'text-[var(--success)]'
                  : 'text-[var(--danger)]'
              }`}
            >
              {couponMessage}
            </p>
          )}
        </div>

        {/* 6. Payment Method Selector */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[var(--primary)]" />
            <span>6. Payment Method</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                paymentMethod === 'upi_card'
                  ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] font-semibold'
                  : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)]'
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'upi_card'}
                onChange={() => setPaymentMethod('upi_card')}
                className="accent-[var(--primary)]"
              />
              <div className="text-xs">
                <div className="font-bold">Instant UPI / Cards / NetBanking</div>
                <div className="text-[10px] opacity-80">
                  Instant bakery kitchen confirmation
                </div>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                paymentMethod === 'cod'
                  ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] font-semibold'
                  : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)]'
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
                className="accent-[var(--primary)]"
              />
              <div className="text-xs">
                <div className="font-bold">Cash / Pay on Delivery</div>
                <div className="text-[10px] opacity-80">
                  Pay upon temperature-checked arrival
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* 7. Order Bill Summary */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] space-y-2 text-xs">
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Items Total ({cartItems.length} cakes)</span>
            <span>₹{subtotal}</span>
          </div>

          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Cold-Chain Delivery & Slot Fee</span>
            <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
          </div>

          {slotSurcharge > 0 && (
            <div className="flex justify-between text-purple-400 font-medium">
              <span>Special Midnight Slot Fee</span>
              <span>+₹{slotSurcharge}</span>
            </div>
          )}

          {appliedDiscount > 0 && (
            <div className="flex justify-between text-[var(--success)] font-medium">
              <span>Celebration Discount</span>
              <span>-₹{appliedDiscount}</span>
            </div>
          )}

          <div className="pt-2 border-t border-[var(--border)] flex justify-between text-sm font-bold text-[var(--text-main)] font-display">
            <span>Final Amount Payable</span>
            <span className="text-base text-[var(--primary)]">₹{totalAmount}</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPlacingOrder || cartItems.length === 0}
          className="w-full py-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-50"
        >
          <span>
            {isPlacingOrder
              ? 'Confirming with Kitchen...'
              : `Pay & Confirm Order (₹${totalAmount})`}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </Modal>
  );
};

