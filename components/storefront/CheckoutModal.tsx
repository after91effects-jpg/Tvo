'use client';
import { getSellingUnitLabel, isPieceOrDiscreteUnit } from '../../lib/sellingUnit';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  ShoppingBag,
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
  ChevronDown,
  ChevronUp,
  Store,
  Check,
  Edit3,
} from 'lucide-react';
import { Order, OrderStatus } from '../../lib/types';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { occasionAnalytics } from '../../lib/analytics';
import { Modal } from '../common/Modal';
import { DEFAULT_STORE_SETTINGS } from '../../lib/seedData';

// Loads Razorpay Checkout once and exposes it as window.Razorpay.
let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayCheckout(): Promise<void> {
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      if ((window as any).Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayScriptPromise = null;
        reject(new Error('Unable to load the payment gateway. Please try again.'));
      };
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderNumber: string) => void;
  occasionSlug?: string;
}

interface DeliverySlotItem {
  id: string | number;
  name: string;
  timeRange: string;
  fee: number;
  available: boolean;
  badge?: string;
}

type SectionId = 'contact' | 'address' | 'delivery' | 'customization' | 'coupon' | 'payment' | 'summary';

const DEFAULT_SLOTS: DeliverySlotItem[] = [
  { id: 1, name: 'Morning Fresh', timeRange: '09:00 AM – 11:00 AM', fee: 0, available: true, badge: 'Popular' },
  { id: 2, name: 'Late Morning', timeRange: '11:00 AM – 01:00 PM', fee: 0, available: true },
  { id: 3, name: 'Afternoon Delight', timeRange: '01:00 PM – 03:00 PM', fee: 0, available: true },
  { id: 4, name: 'Tea Time Celebration', timeRange: '03:00 PM – 05:00 PM', fee: 0, available: true },
  { id: 5, name: 'Evening Prime', timeRange: '05:00 PM – 07:00 PM', fee: 0, available: true, badge: 'Peak Slot' },
  { id: 6, name: 'Night Gathering', timeRange: '07:00 PM – 09:00 PM', fee: 29, available: true, badge: '+₹29 Evening' },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
  occasionSlug,
}) => {
  const { cartItems, subtotal, clearCart, appliedPromo, applyPromoCode, removePromoCode } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && occasionSlug) {
      occasionAnalytics.trackOccasionCheckoutStart(occasionSlug);
    }
  }, [isOpen, occasionSlug]);

  const now = useMemo(() => new Date(), []);
  const formatDateYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const minDateStr = useMemo(() => formatDateYMD(now), [now]);
  const maxDateStr = useMemo(() => {
    const max = new Date(now);
    max.setDate(max.getDate() + 30);
    return formatDateYMD(max);
  }, [now]);

  // Check if same-day delivery is allowed for the cart
  const isSameDayEligible = useMemo(() => {
    return !cartItems.some((item: any) => {
      const prod = item.product || item;
      return prod?.allowSameDayDelivery === false || prod?.sameDayDelivery === false;
    });
  }, [cartItems]);

  // Generate quick date options (Today if eligible, Tomorrow, +2, +3 days)
  const quickDates = useMemo(() => {
    const dates = [];
    const startOffset = isSameDayEligible ? 0 : 1;
    for (let i = startOffset; i < startOffset + 4; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const ymd = formatDateYMD(d);
      let label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' });
      dates.push({
        dateStr: ymd,
        label,
        dayNum: d.getDate(),
        monthShort: d.toLocaleDateString('en-IN', { month: 'short' }),
        weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        fullDisplay: `${label}, ${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}`,
      });
    }
    return dates;
  }, [now, isSameDayEligible]);

  // Section Accordion State
  const [activeSection, setActiveSection] = useState<SectionId | null>('contact');

  // Contact State
  const [recipientName, setRecipientName] = useState(user?.name || '');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone || '');
  const [recipientEmail, setRecipientEmail] = useState(user?.email || '');

  // Delivery Mode & Address State
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Gurugram');
  const [pincode, setPincode] = useState('122001');
  const [pincodeStatus, setPincodeStatus] = useState<{ checked: boolean; available: boolean; message?: string }>({
    checked: true,
    available: true,
  });
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Delivery Date & Slot State
  const [deliveryDate, setDeliveryDate] = useState<string>(minDateStr);
  const [slots, setSlots] = useState<DeliverySlotItem[]>(DEFAULT_SLOTS);
  const [selectedSlotId, setSelectedSlotId] = useState<string | number>(1);

  // Fetch dynamic slot availability when date changes
  useEffect(() => {
    if (!deliveryDate) return;
    let cancelled = false;
    fetch(`/api/delivery?action=availability&date=${deliveryDate}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.slots) return;
        const fetched = data.slots.map((s: any) => ({
          id: s.id,
          name: s.name || `${s.start_time} - ${s.end_time}`,
          timeRange: s.start_time && s.end_time ? `${s.start_time} – ${s.end_time}` : s.name,
          fee: Number(s.fee) || 0,
          available: s.available !== false,
          badge: s.cutoffPassed ? 'Cut-off Passed' : (s.fee > 0 ? `+₹${s.fee} Evening` : undefined),
        }));
        if (fetched.length > 0) {
          setSlots(fetched);
          if (!fetched.some((s: any) => s.id === selectedSlotId && s.available)) {
            const firstAvail = fetched.find((s: any) => s.available);
            if (firstAvail) setSelectedSlotId(firstAvail.id);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [deliveryDate]);

  // Validate pincode with debounce
  useEffect(() => {
    const code = pincode.trim();
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      let cancelled = false;
      fetch(`/api/delivery?action=pincode&code=${code}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          setPincodeStatus({
            checked: true,
            available: data.available !== false,
            message: data.message,
          });
          if (data.city) setCity(data.city);
        })
        .catch(() => {
          if (!cancelled) setPincodeStatus({ checked: true, available: true });
        });
      return () => {
        cancelled = true;
      };
    } else {
      setPincodeStatus({ checked: false, available: false });
    }
  }, [pincode]);

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'upi_card' | 'cod'>('upi_card');
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/payments')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.enabled === false) {
          setOnlinePaymentEnabled(false);
          setPaymentMethod('cod');
        }
      })
      .catch(() => {});
  }, []);

  // Coupon State
  const [inputCoupon, setInputCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Status & Error
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);

  // Computed Pricing
  const selectedSlot = useMemo(() => {
    if (deliveryMode === 'pickup') {
      return { id: 0, name: 'Store Pickup', timeRange: '10:00 AM – 09:00 PM', fee: 0, available: true };
    }
    return slots.find((s) => String(s.id) === String(selectedSlotId)) || slots[0] || DEFAULT_SLOTS[0];
  }, [slots, selectedSlotId, deliveryMode]);

  const slotSurcharge = deliveryMode === 'pickup' ? 0 : (selectedSlot?.fee || 0);
  const freeThreshold = DEFAULT_STORE_SETTINGS.thresholds.freeDeliveryAbove || 499;
  const standardDeliveryFee = DEFAULT_STORE_SETTINGS.thresholds.standardDeliveryFee || 49;
  const deliveryFee = deliveryMode === 'pickup' || subtotal >= freeThreshold || cartItems.length === 0 ? 0 : standardDeliveryFee;

  let appliedDiscount = 0;
  if (appliedPromo && subtotal >= appliedPromo.minOrderValue) {
    if (appliedPromo.discountType === 'percent') {
      const calc = (subtotal * appliedPromo.discountValue) / 100;
      appliedDiscount = appliedPromo.maxDiscount ? Math.min(calc, appliedPromo.maxDiscount) : calc;
    } else {
      appliedDiscount = appliedPromo.discountValue;
    }
  }
  appliedDiscount = Math.round(Math.min(appliedDiscount, subtotal));

  const totalAmount = Math.max(0, Math.round(subtotal - appliedDiscount + deliveryFee + slotSurcharge));

  // Customization Summary
  const customizationSummary = useMemo(() => {
    let hasMessage = false;
    let hasDesign = false;
    let addonsCount = 0;
    let flavoursList: string[] = [];

    for (const item of cartItems) {
      if (item.messageOnCake) hasMessage = true;
      if (item.customDesignImage) hasDesign = true;
      if (item.selectedFlavour && !flavoursList.includes(item.selectedFlavour)) {
        flavoursList.push(item.selectedFlavour);
      }
      if (Array.isArray(item.addons)) addonsCount += item.addons.length;
    }

    const tags: string[] = [];
    if (hasMessage) tags.push('Cake message added');
    if (hasDesign) tags.push('Design attached');
    if (addonsCount > 0) tags.push(`${addonsCount} Add-on${addonsCount > 1 ? 's' : ''}`);
    if (flavoursList.length > 0) tags.push(flavoursList.slice(0, 2).join(', '));
    return tags.length > 0 ? tags.join(' • ') : 'Standard bakery preparation';
  }, [cartItems]);

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    if (!inputCoupon.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    const res = await applyPromoCode(inputCoupon.trim());
    if (res.success) {
      setCouponSuccess(res.message);
      setInputCoupon('');
    } else {
      setCouponError(res.message);
    }
  };

  const handlePresetInstruction = (preset: string) => {
    setSpecialInstructions((prev) => {
      if (!prev.trim()) return preset;
      if (prev.toLowerCase().includes(preset.toLowerCase())) return prev;
      return `${prev.trim()}, ${preset}`.slice(0, 500);
    });
  };

  const getSessionId = () => {
    if (typeof window === 'undefined') return 'sess-default';
    let sid = localStorage.getItem('tvo_session_id');
    if (!sid) {
      sid = 'sess-' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('tvo_session_id', sid);
    }
    return sid;
  };

  const toggleSection = (s: SectionId) => {
    setActiveSection((prev) => (prev === s ? null : s));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    // Validation
    if (!recipientName.trim() || recipientName.trim().length < 2) {
      setActiveSection('contact');
      setErrorMessage('Please enter recipient name (at least 2 characters).');
      return;
    }
    const cleanP = recipientPhone.replace(/\D/g, '');
    const validP = cleanP.length === 10 || (cleanP.length === 12 && cleanP.startsWith('91'));
    if (!validP) {
      setActiveSection('contact');
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (deliveryMode === 'delivery') {
      if (!address.trim() || address.trim().length < 5) {
        setActiveSection('address');
        setErrorMessage('Please enter complete delivery street address.');
        return;
      }
      if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) {
        setActiveSection('address');
        setErrorMessage('Please enter a valid 6-digit delivery pincode.');
        return;
      }
      if (pincodeStatus.checked && !pincodeStatus.available) {
        setActiveSection('address');
        setErrorMessage(pincodeStatus.message || 'Delivery not serviceable for this pincode.');
        return;
      }
    }

    const isDeliveryDateRequired = cartItems.some((item: any) => {
      const prod = item.product || item;
      return prod?.showDeliveryDate !== false && prod?.showDelivery !== false;
    });

    if (isDeliveryDateRequired && !deliveryDate) {
      setActiveSection('delivery');
      setErrorMessage('Please select a delivery date.');
      return;
    }

    setIsPlacingOrder(true);
    setErrorMessage('');

    try {
      const sessionId = getSessionId();
      const nowIso = new Date().toISOString();
      const isPickup = deliveryMode === 'pickup';
      const resolvedSlotName = isPickup ? 'Store Pickup' : selectedSlot.name;
      const finalAddress = isPickup
        ? 'Store Pickup: TVO Flavours Bakery Kitchen, Vipul World, Sector 48, Gurugram, 122001'
        : address.trim();
      const finalCity = isPickup ? 'Gurugram' : city.trim();
      const finalPincode = isPickup ? '122001' : pincode.trim();

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber: '',
        userId: user?.uid,
        customer: {
          name: recipientName.trim(),
          phone: recipientPhone.trim(),
          email: recipientEmail.trim(),
          address: finalAddress,
          city: finalCity,
          pincode: finalPincode,
          deliveryDate,
          deliverySlot: resolvedSlotName,
          slotSurcharge,
          instructions: specialInstructions.trim() || undefined,
          specialInstructions: specialInstructions.trim() || undefined,
        },
        specialInstructions: specialInstructions.trim() || undefined,
        items: cartItems.map((item: any) => ({
          productId: item.product?.id || item.productId,
          name: item.product?.name || item.name,
          sku: item.product?.sku || item.sku || '',
          qty: item.quantity,
          price: item.selectedWeight?.price || item.unitPrice || 699,
          weight: item.selectedWeight?.label || (isPieceOrDiscreteUnit(item.product?.sellingUnit) ? '1 piece' : '0.5 kg'),
          flavour: item.selectedFlavour || 'Original',
          flavourPrice: item.flavourPrice || 0,
          messageOnCake: item.messageOnCake || null,
          customInstructions: item.customInstructions || null,
          customDesignImage: item.customDesignImage || null,
          customDesignDescription: item.customDesignDescription || null,
          addons: item.addons || item.selectedAddOns || [],
          unitPrice: item.selectedWeight?.price || item.unitPrice || 699,
          totalPrice: (item.selectedWeight?.price || item.unitPrice || 699) * item.quantity,
          imageUrl: item.product?.images?.[0]?.mediumUrl || item.product?.images?.[0]?.url || item.imageUrl || '',
          sellingUnit: getSellingUnitLabel(item.product?.sellingUnit) || 'kg',
          isCustomHamper: Boolean(item.isCustomHamper || item.product?.isCustomHamper),
          hamperDetails: item.hamperDetails || item.product?.hamperDetails || undefined,
        })),
        subtotal,
        deliveryFee,
        slotSurcharge,
        discount: appliedDiscount,
        tax: 0,
        total: totalAmount,
        deliveryDate,
        deliverySlot: resolvedSlotName,
        status: 'Order Placed' as OrderStatus,
        statusHistory: [
          {
            status: 'Order Placed',
            timestamp: nowIso,
            note: `Order placed with ${resolvedSlotName} on ${deliveryDate}`,
            updatedBy: 'Automated Kitchen Dispatcher',
          },
        ],
        paymentMethod: paymentMethod === 'upi_card' ? 'UPI' : 'COD',
        paymentStatus: paymentMethod === 'upi_card' ? 'Paid' : 'Pending',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      let serverOrderNumber: string = createdOrderNumber || '';
      if (!serverOrderNumber) {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: newOrder.items.map((item: any) => ({
              productId: item.productId,
              name: item.name,
              sku: item.sku || '',
              qty: item.qty,
              price: item.price,
              weight: item.weight,
              flavour: item.flavour || '',
              flavourPrice: item.flavourPrice || 0,
              messageOnCake: item.messageOnCake || '',
              customInstructions: item.customInstructions || '',
              customDesignImage: item.customDesignImage || '',
              customDesignDescription: item.customDesignDescription || '',
              addons: item.addons || [],
              sellingUnit: getSellingUnitLabel(item.sellingUnit) || 'kg',
              isCustomHamper: item.isCustomHamper,
              hamperDetails: item.hamperDetails,
            })),
            customer: {
              name: recipientName.trim(),
              phone: recipientPhone.trim(),
              email: recipientEmail.trim(),
              address: finalAddress,
            },
            pincode: finalPincode,
            city: finalCity,
            deliveryDate: newOrder.deliveryDate,
            deliverySlot: newOrder.deliverySlot,
            deliverySlotId: isPickup ? null : selectedSlot.id,
            deliveryType: deliveryMode,
            deliveryInstructions: specialInstructions.trim() || undefined,
            paymentMethod: newOrder.paymentMethod,
            deliveryFee: newOrder.deliveryFee,
            slot_surcharge: newOrder.slotSurcharge,
            coupon_code: appliedPromo?.code || undefined,
            session_id: sessionId,
            orderNotes: specialInstructions.trim() || undefined,
            occasion_slug: occasionSlug || undefined,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error || `Order could not be placed (${res.status}). Please try again.`);
        }
        const created = await res.json().catch(() => ({}));
        serverOrderNumber = created?.orderNumber || newOrder.orderNumber;
        setCreatedOrderNumber(serverOrderNumber);
      }

      newOrder.orderNumber = serverOrderNumber;

      // Payment Flow
      if (paymentMethod === 'upi_card' && serverOrderNumber) {
        let pay: any = null;
        try {
          const payRes = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', orderNumber: serverOrderNumber }),
          });
          pay = await payRes.json();
          if (!payRes.ok) {
            throw new Error(pay?.error || 'Payment gateway initialization failed');
          }
        } catch (payErr: any) {
          setErrorMessage(payErr?.message || 'Could not connect to payment gateway. Please try again.');
          setIsPlacingOrder(false);
          return;
        }

        if (pay?.order_id) {
          if (pay.sandbox && !pay.key_id) {
            // Local test mode without live keys: simulate server-side verification
            try {
              const verifyRes = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'verify',
                  orderNumber: serverOrderNumber,
                  razorpay_order_id: pay.order_id,
                  razorpay_payment_id: `pay_sandbox_${Date.now()}`,
                  razorpay_signature: 'sandbox_test_sig',
                }),
              });
              const verifyJson = await verifyRes.json();
              if (verifyJson.ok && verifyJson.payment_status === 'Paid') {
                clearCart();
                if (occasionSlug) {
                  occasionAnalytics.trackOccasionPurchase(occasionSlug, serverOrderNumber, totalAmount);
                }
                onOrderSuccess(serverOrderNumber);
                return;
              } else {
                setErrorMessage(verifyJson.error || 'Test payment verification failed');
                setIsPlacingOrder(false);
                return;
              }
            } catch (vErr: any) {
              setErrorMessage('Verification failed: ' + vErr.message);
              setIsPlacingOrder(false);
              return;
            }
          } else {
            // Official Razorpay Checkout Flow
            await loadRazorpayCheckout();
            const rzp = new (window as any).Razorpay({
              key: pay.key_id,
              amount: pay.amount,
              currency: pay.currency || 'INR',
              name: 'TVO FLAVOURS',
              description: `Bakery Celebration Order #${serverOrderNumber}`,
              order_id: pay.order_id,
              prefill: {
                name: recipientName,
                email: recipientEmail,
                contact: recipientPhone,
              },
              theme: { color: '#e11d48' },
              handler: async (response: any) => {
                setIsPlacingOrder(true);
                try {
                  const verifyRes = await fetch('/api/payments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'verify',
                      orderNumber: serverOrderNumber,
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                    }),
                  });
                  const verifyData = await verifyRes.json();
                  if (verifyRes.ok && verifyData.payment_status === 'Paid') {
                    clearCart();
                    if (occasionSlug) {
                      occasionAnalytics.trackOccasionPurchase(occasionSlug, serverOrderNumber, totalAmount);
                    }
                    onOrderSuccess(serverOrderNumber);
                  } else {
                    setErrorMessage(verifyData.error || 'Payment signature verification failed. Please contact support if your account was debited.');
                  }
                } catch (vErr: any) {
                  setErrorMessage(vErr.message || 'Error verifying payment with server. Please contact support.');
                } finally {
                  setIsPlacingOrder(false);
                }
              },
              modal: {
                ondismiss: async () => {
                  setIsPlacingOrder(false);
                  setErrorMessage('Payment was cancelled or closed. You can retry anytime.');
                  try {
                    await fetch('/api/payments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'failure',
                        orderNumber: serverOrderNumber,
                        reason: 'Customer closed Razorpay checkout modal',
                        code: 'MODAL_DISMISSED',
                      }),
                    });
                  } catch {}
                },
              },
            });

            rzp.on('payment.failed', async (resp: any) => {
              setIsPlacingOrder(false);
              const desc = resp.error?.description || 'Payment was declined by your bank or gateway.';
              setErrorMessage(desc);
              try {
                await fetch('/api/payments', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'failure',
                    orderNumber: serverOrderNumber,
                    reason: desc,
                    code: resp.error?.code || 'PAYMENT_FAILED',
                  }),
                });
              } catch {}
            });

            rzp.open();
            return;
          }
        } else {
          setErrorMessage('Could not initialize payment order. Please try again.');
          setIsPlacingOrder(false);
          return;
        }
      }

      if (paymentMethod === 'cod') {
        clearCart();
        if (occasionSlug) {
          occasionAnalytics.trackOccasionPurchase(occasionSlug, serverOrderNumber, totalAmount);
        }
        onOrderSuccess(serverOrderNumber);
      }
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
      title={cartItems.length === 0 ? "Your Cart" : "Complete Your Bakery Celebration Order"}
      maxWidth="3xl"
    >
      {cartItems.length === 0 ? (
        <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center mb-4 text-[var(--text-subtle)]">
            <ShoppingBag className="w-8 h-8 stroke-1 text-[var(--primary)]" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-main)] font-display">
            Your cart is empty
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-sm">
            Please add handcrafted celebration cakes or bakery treats to your cart before proceeding to checkout.
          </p>
          <button
            type="button"
            id="checkout-empty-explore-btn"
            onClick={onClose}
            className="mt-6 px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Explore Bestselling Cakes
          </button>
        </div>
      ) : (
        <form onSubmit={handlePlaceOrder} className="space-y-3 pb-24 sm:pb-4 text-xs">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Contact Section */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden transition-all shadow-sm">
          <div
            onClick={() => toggleSection('contact')}
            className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-subtle)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div>
                <div className="font-bold text-[var(--text-main)] text-xs sm:text-sm flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Contact Details</span>
                </div>
                {activeSection !== 'contact' && (
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[240px] sm:max-w-md mt-0.5">
                    {recipientName ? `${recipientName} • ${recipientPhone || 'No phone'}` : 'Enter recipient name and phone'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--primary)] hover:underline">
                {activeSection === 'contact' ? 'Close' : 'Edit'}
              </span>
              {activeSection === 'contact' ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
            </div>
          </div>

          {activeSection === 'contact' && (
            <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] space-y-3 bg-[var(--bg-subtle)]/20">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="order.updates@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('address')}
                  className="px-4 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Continue to Address →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Delivery Address Section */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden transition-all shadow-sm">
          <div
            onClick={() => toggleSection('address')}
            className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-subtle)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div>
                <div className="font-bold text-[var(--text-main)] text-xs sm:text-sm flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Delivery Address</span>
                </div>
                {activeSection !== 'address' && (
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[240px] sm:max-w-md mt-0.5">
                    {deliveryMode === 'pickup'
                      ? 'Store Pickup: TVO Flavours Kitchen (Vipul World, Sector 48)'
                      : address ? `${address.slice(0, 35)}... ${city} (${pincode})` : 'Enter delivery location'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--primary)] hover:underline">
                {activeSection === 'address' ? 'Close' : 'Edit'}
              </span>
              {activeSection === 'address' ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
            </div>
          </div>

          {activeSection === 'address' && (
            <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] space-y-3 bg-[var(--bg-subtle)]/20">
              {/* Delivery Mode Toggle */}
              <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] max-w-sm">
                <button
                  type="button"
                  onClick={() => setDeliveryMode('delivery')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    deliveryMode === 'delivery'
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Home Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('pickup')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    deliveryMode === 'pickup'
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Store Pickup</span>
                </button>
              </div>

              {deliveryMode === 'pickup' ? (
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                    <CheckCircle className="w-4 h-4" />
                    <span>Free Store Pickup • Fresh from Baking Oven</span>
                  </div>
                  <p className="text-xs text-[var(--text-main)] font-semibold">
                    TVO Flavours Bakery Kitchen
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Vipul World, Sector 48, Gurugram, Haryana 122001 (Pickup hours: 10:00 AM – 09:00 PM)
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                        Street Address / Flat / Floor / Landmark *
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Tower 3, Flat 402, Lotus Residency"
                        required={deliveryMode === 'delivery'}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                        Pincode (6 digits) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={6}
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                          placeholder="122001"
                          required={deliveryMode === 'delivery'}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                        />
                        {pincodeStatus.checked && pincode.length === 6 && (
                          <div className="absolute right-2.5 top-2.5">
                            {pincodeStatus.available ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {pincodeStatus.checked && pincode.length === 6 && (
                        <p className={`text-[10px] mt-1 ${pincodeStatus.available ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {pincodeStatus.available ? '✓ Serviceable area' : '✗ Unserviceable pincode'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                      City / Area
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Gurugram"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  {/* Special Delivery Instructions */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1 flex items-center justify-between">
                      <span>Special Delivery Instructions (Optional)</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{specialInstructions.length}/500</span>
                    </label>
                    <textarea
                      maxLength={500}
                      rows={2}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Call before arrival, leave with security guard, fragile birthday delivery..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      {[
                        'Call before delivery',
                        'Leave at reception',
                        'Birthday surprise - don’t ring bell',
                        'Handle with care (fragile cake)',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handlePresetInstruction(preset)}
                          className="px-2 py-0.5 rounded-lg border border-[var(--border)] text-[10px] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('delivery')}
                  className="px-4 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Continue to Delivery Window →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Delivery Date & Time Window */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden transition-all shadow-sm">
          <div
            onClick={() => toggleSection('delivery')}
            className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-subtle)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div>
                <div className="font-bold text-[var(--text-main)] text-xs sm:text-sm flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Delivery Date & Time</span>
                </div>
                {activeSection !== 'delivery' && (
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[240px] sm:max-w-md mt-0.5">
                    {deliveryDate} • {selectedSlot.name} ({selectedSlot.timeRange})
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--primary)] hover:underline">
                {activeSection === 'delivery' ? 'Close' : 'Edit'}
              </span>
              {activeSection === 'delivery' ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
            </div>
          </div>

          {activeSection === 'delivery' && (
            <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] space-y-3 bg-[var(--bg-subtle)]/20">
              {/* Date Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Choose Celebration Date</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {quickDates.map((qd) => (
                    <button
                      key={qd.dateStr}
                      type="button"
                      onClick={() => setDeliveryDate(qd.dateStr)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        deliveryDate === qd.dateStr
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm font-bold'
                          : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="text-[10px] opacity-80 uppercase tracking-wider">{qd.weekday}</div>
                      <div className="text-sm font-bold">{qd.dayNum} {qd.monthShort}</div>
                      <div className="text-[10px] opacity-90">{qd.label}</div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-muted)]">Or select future date (up to 30 days):</span>
                  <input
                    type="date"
                    min={minDateStr}
                    max={maxDateStr}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Slot Selector */}
              {deliveryMode !== 'pickup' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>Choose Delivery Slot</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {slots.map((s) => (
                      <label
                        key={s.id}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          !s.available
                            ? 'opacity-40 cursor-not-allowed border-[var(--border)] bg-[var(--bg-subtle)]'
                            : String(selectedSlotId) === String(s.id)
                            ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] font-bold shadow-sm'
                            : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="slot"
                            disabled={!s.available}
                            checked={String(selectedSlotId) === String(s.id)}
                            onChange={() => setSelectedSlotId(s.id)}
                            className="accent-[var(--primary)]"
                          />
                          <div>
                            <div className="text-xs font-bold">{s.name}</div>
                            <div className="text-[10px] opacity-80">{s.timeRange}</div>
                          </div>
                        </div>
                        {s.badge && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] font-bold">
                            {s.badge}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('customization')}
                  className="px-4 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Continue to Customization →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Product Customization Review */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden transition-all shadow-sm">
          <div
            onClick={() => toggleSection('customization')}
            className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-subtle)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0">
                4
              </div>
              <div>
                <div className="font-bold text-[var(--text-main)] text-xs sm:text-sm flex items-center gap-2">
                  <ChefHat className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Product Customization</span>
                </div>
                {activeSection !== 'customization' && (
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[240px] sm:max-w-md mt-0.5">
                    {customizationSummary}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--primary)] hover:underline">
                {activeSection === 'customization' ? 'Close' : 'View'}
              </span>
              {activeSection === 'customization' ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
            </div>
          </div>

          {activeSection === 'customization' && (
            <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] space-y-2 bg-[var(--bg-subtle)]/20 divide-y divide-[var(--border)]/60">
              {cartItems.map((item: any, idx: number) => (
                <div key={item.id || idx} className="pt-2 first:pt-0 flex items-start gap-3">
                  {item.customDesignImage ? (
                    <img
                      src={item.customDesignImage}
                      alt="Custom design"
                      className="w-12 h-12 rounded-xl object-cover border border-[var(--border)] shrink-0 bg-white"
                    />
                  ) : item.imageUrl || item.product?.images?.[0]?.url ? (
                    <img
                      src={item.imageUrl || item.product?.images?.[0]?.url}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover border border-[var(--border)] shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-lg shrink-0">
                      🎂
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-main)] text-xs truncate">
                        {item.product?.name || item.name}
                      </span>
                      <span className="font-bold text-[var(--text-main)] text-xs shrink-0 ml-2">
                        ₹{item.totalPrice}
                      </span>
                    </div>

                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span>{item.quantity} × {item.selectedWeight?.label || item.weight}</span>
                      {item.selectedFlavour && (
                        <span>• Flavour: <strong className="text-[var(--text-main)]">{item.selectedFlavour}</strong></span>
                      )}
                      {item.flavourPrice > 0 && <span>(+₹{item.flavourPrice})</span>}
                      {getSellingUnitLabel(item.product?.sellingUnit || item.sellingUnit) && (
                        <span className="text-[var(--text-subtle)] font-medium">
                          (₹{item.unitPrice || item.selectedWeight?.price} / {getSellingUnitLabel(item.product?.sellingUnit || item.sellingUnit)})
                        </span>
                      )}
                    </div>

                    {item.messageOnCake && (
                      <p className="text-[11px] text-[var(--primary)] font-medium italic mt-1 bg-[var(--primary-light)]/50 px-2 py-0.5 rounded-md inline-block">
                        Message: &ldquo;{item.messageOnCake}&rdquo;
                      </p>
                    )}

                    {item.customInstructions && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        Instructions: {item.customInstructions}
                      </p>
                    )}

                    {item.customDesignDescription && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        Design Note: {item.customDesignDescription}
                      </p>
                    )}

                    {Array.isArray(item.addons) && item.addons.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-1">
                        {item.addons.map((a: any) => (
                          <span key={a.id || a.name} className="px-1.5 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[9px] text-[var(--text-muted)] font-medium">
                            + {a.name} (₹{a.price})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('coupon')}
                  className="px-4 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Continue to Coupon →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. Coupon Section */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden transition-all shadow-sm">
          <div
            onClick={() => toggleSection('coupon')}
            className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-subtle)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0">
                5
              </div>
              <div>
                <div className="font-bold text-[var(--text-main)] text-xs sm:text-sm flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Promo Code & Coupon</span>
                </div>
                {activeSection !== 'coupon' && (
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[240px] sm:max-w-md mt-0.5">
                    {appliedPromo ? `Coupon ${appliedPromo.code} applied (-₹${appliedDiscount})` : 'No coupon applied'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--primary)] hover:underline">
                {activeSection === 'coupon' ? 'Close' : appliedPromo ? 'Change' : 'Apply'}
              </span>
              {activeSection === 'coupon' ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
            </div>
          </div>

          {activeSection === 'coupon' && (
            <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] space-y-3 bg-[var(--bg-subtle)]/20">
              {appliedPromo ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-700">Coupon {appliedPromo.code} Active!</div>
                      <div className="text-[10px] text-emerald-600">Savings: ₹{appliedDiscount} on this order</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removePromoCode}
                    className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputCoupon}
                      onChange={(e) => setInputCoupon(e.target.value.toUpperCase())}
                      placeholder="ENTER COUPON CODE"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] font-mono uppercase focus:outline-none focus:border-[var(--primary)]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-[11px] text-[var(--danger)]">{couponError}</p>}
                  {couponSuccess && <p className="text-[11px] text-emerald-600 font-medium">{couponSuccess}</p>}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('payment')}
                  className="px-4 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 6. Payment Method Section */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden transition-all shadow-sm">
          <div
            onClick={() => toggleSection('payment')}
            className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-subtle)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0">
                6
              </div>
              <div>
                <div className="font-bold text-[var(--text-main)] text-xs sm:text-sm flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Payment Method</span>
                </div>
                {activeSection !== 'payment' && (
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[240px] sm:max-w-md mt-0.5">
                    {paymentMethod === 'upi_card' ? 'Instant UPI / Cards / NetBanking' : 'Cash on Delivery'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--primary)] hover:underline">
                {activeSection === 'payment' ? 'Close' : 'Edit'}
              </span>
              {activeSection === 'payment' ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
            </div>
          </div>

          {activeSection === 'payment' && (
            <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] space-y-3 bg-[var(--bg-subtle)]/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                    !onlinePaymentEnabled
                      ? 'opacity-50 cursor-not-allowed border-[var(--border)] bg-[var(--bg-subtle)]'
                      : (paymentMethod === 'upi_card'
                          ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] font-semibold shadow-sm cursor-pointer'
                          : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] cursor-pointer')
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    disabled={!onlinePaymentEnabled}
                    checked={paymentMethod === 'upi_card'}
                    onChange={() => onlinePaymentEnabled && setPaymentMethod('upi_card')}
                    className="accent-[var(--primary)]"
                  />
                  <div className="text-xs">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Instant UPI / Cards / NetBanking</span>
                      {!onlinePaymentEnabled && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">Paused</span>
                      )}
                    </div>
                    <div className="text-[10px] opacity-80">
                      {!onlinePaymentEnabled
                        ? 'Online payments temporarily paused — Cash on Delivery available'
                        : 'Instant bakery confirmation & priority queue'}
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] font-semibold shadow-sm'
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
                    <div className="text-[10px] opacity-80">Pay upon temperature-checked arrival</div>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg-card)] p-2 rounded-xl border border-[var(--border)]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>256-bit bank-grade encryption • 100% Secure Checkout Guarantee</span>
              </div>
            </div>
          )}
        </div>

        {/* 7. Order Bill Summary Section */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden transition-all shadow-sm">
          <div
            onClick={() => toggleSection('summary')}
            className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-subtle)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0">
                7
              </div>
              <div>
                <div className="font-bold text-[var(--text-main)] text-xs sm:text-sm flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Order Summary & Final Bill</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  ₹{totalAmount} payable • {cartItems.length} cake{cartItems.length > 1 ? 's' : ''} • {deliveryFee === 0 ? 'Free Delivery' : 'Standard Delivery'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--primary)]">₹{totalAmount}</span>
              {activeSection === 'summary' ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
            </div>
          </div>

          {activeSection === 'summary' && (
            <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] space-y-2 bg-[var(--bg-subtle)]/20 text-xs">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Items Subtotal ({cartItems.length} items)</span>
                <span>₹{subtotal}</span>
              </div>

              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Delivery & Logistics</span>
                <span>{deliveryFee === 0 ? <strong className="text-emerald-600">FREE</strong> : `₹${deliveryFee}`}</span>
              </div>

              {slotSurcharge > 0 && (
                <div className="flex justify-between text-purple-600 font-medium">
                  <span>Special Evening/Slot Fee</span>
                  <span>+₹{slotSurcharge}</span>
                </div>
              )}

              {appliedDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Celebration Promo Savings</span>
                  <span>-₹{appliedDiscount}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[var(--border)] flex justify-between text-sm font-bold text-[var(--text-main)] font-display">
                <span>Final Payable Amount</span>
                <span className="text-base text-[var(--primary)]">₹{totalAmount}</span>
              </div>
            </div>
          )}
        </div>

        {/* Desktop / In-flow CTA */}
        <div className="pt-2">
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
        </div>

        {/* Mobile Sticky Bottom CTA Bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t border-[var(--border)] z-50 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Total Payable</div>
              <div className="text-base font-bold text-[var(--primary)] leading-tight">₹{totalAmount}</div>
            </div>
            <button
              type="submit"
              disabled={isPlacingOrder || cartItems.length === 0}
              className="flex-1 py-3 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isPlacingOrder ? 'Processing...' : 'Place Order'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
      )}
    </Modal>
  );
};
