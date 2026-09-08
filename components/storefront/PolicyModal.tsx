'use client';

import React, { useEffect, useRef } from 'react';
import { X, Shield, FileText, RefreshCw, Truck, MapPin, Phone, Mail } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../../lib/scrollLock';

export type PolicyType = 'privacy-policy' | 'terms-conditions' | 'refund-returns-policy' | 'shipping-policy';

interface PolicyModalProps {
  policyType: PolicyType | null;
  onClose: () => void;
}

const POLICY_DETAILS: Record<
  PolicyType,
  {
    title: string;
    icon: React.ElementType;
    badge: string;
    sections: { heading: string; content: string }[];
  }
> = {
  'privacy-policy': {
    title: 'Privacy Policy',
    icon: Shield,
    badge: 'Customer Data Protection',
    sections: [
      {
        heading: '1. Information We Collect',
        content:
          'When you place an order with TVO Flavours, we collect necessary customer details including your name, recipient delivery address, contact phone number, email address, and personalized cake message to fulfill your order and provide delivery tracking updates.',
      },
      {
        heading: '2. Use of Information',
        content:
          'Your information is used strictly to bake, handcraft, package, and dispatch your celebration cakes and bakery items. We also use contact details to send automated order status SMS/WhatsApp updates and kitchen concierge assistance.',
      },
      {
        heading: '3. Data Security & Storage',
        content:
          'We implement secure socket layer (SSL) encryption for all transactions and never store payment card credentials or net-banking passwords on our servers. Your delivery address and phone numbers are safeguarded in our encrypted database.',
      },
      {
        heading: '4. Third-Party Disclosures',
        content:
          'TVO Flavours does not sell, rent, or trade your personal information to third parties. Customer details are only shared with dedicated logistics drivers solely for the purpose of doorstep delivery.',
      },
      {
        heading: '5. Contact Us Regarding Privacy',
        content:
          'For any inquiries regarding your data, reach our Kitchen Concierge at hello@tvoflavours.com or call +91 76782 59522. TVO Flavours, Vipul World, Sector 48, Gurugram, Haryana 122001, India.',
      },
    ],
  },
  'terms-conditions': {
    title: 'Terms & Conditions',
    icon: FileText,
    badge: 'Artisan Bakery Agreement',
    sections: [
      {
        heading: '1. Handcrafted Fresh Bakery Orders',
        content:
          'Every cake at TVO Flavours is baked fresh to order in our temperature-controlled artisan kitchens using 100% pure vegetarian / eggless ingredients. Because our creations are artisan handcrafted by pastry chefs, minor artistic variations in piping or fruit garnishes may occur.',
      },
      {
        heading: '2. Delivery Slots & Precision',
        content:
          'We offer Standard Morning (9 AM - 1 PM), Afternoon (1 PM - 5 PM), Prime Evening (5 PM - 9 PM), and Midnight Surprise (11 PM - 12 AM) delivery slots across Gurugram and Delhi NCR. Please ensure recipient availability during the selected delivery slot.',
      },
      {
        heading: '3. Special Instructions & Dietary Care',
        content:
          'All our cakes are 100% vegetarian (eggless). Please notify us of severe nut or lactose allergies in the Special Instructions field during checkout.',
      },
      {
        heading: '4. Pricing & Taxes',
        content:
          'All prices are listed in Indian Rupees (₹) and include applicable taxes unless specified otherwise. Promotional coupon discounts must be entered prior to order placement.',
      },
      {
        heading: '5. Jurisdiction & License',
        content:
          'Governed under the laws of Haryana, India. FSSAI Central/State Food Safety License: 20824005005006.',
      },
    ],
  },
  'refund-returns-policy': {
    title: 'Refund & Returns Policy',
    icon: RefreshCw,
    badge: '100% Freshness Guarantee',
    sections: [
      {
        heading: '1. Transit Damage Guarantee',
        content:
          'If your cake or dessert suffers structural damage during courier transit, please report it immediately with a photograph via WhatsApp (+91 76782 59522) or email (hello@tvoflavours.com) within 2 hours of delivery. We will issue a 100% full refund or arrange an urgent kitchen remake.',
      },
      {
        heading: '2. Order Cancellation Window',
        content:
          'Because cakes are baked fresh to order, orders can be cancelled or delivery addresses amended up to 4 hours before the designated delivery slot begins (or before the baking stage starts in kitchen). Once baked or dispatched, cancellations cannot be accepted.',
      },
      {
        heading: '3. Refund Processing Timelines',
        content:
          'Approved refunds are credited to the original payment method within 3 to 5 business days, depending on your bank or UPI provider.',
      },
      {
        heading: '4. Perishable Goods Return Policy',
        content:
          'Due to health, food safety, and FSSAI hygiene regulations, perishable bakery items cannot be physically returned once received in good order by the recipient.',
      },
    ],
  },
  'shipping-policy': {
    title: 'Shipping Policy',
    icon: Truck,
    badge: 'Cold-Chain Delivery',
    sections: [
      {
        heading: '1. Serviceable Delivery Areas',
        content:
          'We currently provide doorstep delivery across Gurugram, Delhi NCR, Noida, Faridabad, Ghaziabad, and Greater Noida. Enter your 6-digit delivery PIN code on the top bar to verify real-time slot availability.',
      },
      {
        heading: '2. Temperature-Controlled Cold-Chain Fleet',
        content:
          'Every celebration cake is packaged in a heavy-gauge insulated keepsake box with food-grade gel cooling pads and transported in temperature-controlled delivery vehicles to ensure zero melting or movement.',
      },
      {
        heading: '3. Midnight Surprise Deliveries',
        content:
          'Our signature Midnight Surprise slot operates between 11:00 PM and 12:00 AM. Our delivery partners ring the bell before midnight for an unforgettable celebration surprise.',
      },
      {
        heading: '4. Delivery Inquiries & Assistance',
        content:
          'Track live order status anytime on our website tracking page, or call our Kitchen Dispatch team directly at +91 76782 59522.',
      },
    ],
  },
};

export const PolicyModal: React.FC<PolicyModalProps> = ({ policyType, onClose }) => {
  const didLockRef = useRef(false);

  useEffect(() => {
    if (policyType) {
      lockBodyScroll();
      didLockRef.current = true;
    } else if (didLockRef.current) {
      unlockBodyScroll();
      didLockRef.current = false;
    }
    return () => {
      if (didLockRef.current) {
        unlockBodyScroll();
        didLockRef.current = false;
      }
    };
  }, [policyType]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (policyType) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [policyType, onClose]);

  if (!policyType) return null;

  const policy = POLICY_DETAILS[policyType];
  if (!policy) return null;
  const IconComponent = policy.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--bg-surface)] rounded-3xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--border)] bg-gradient-to-r from-[var(--bg-subtle)] to-[var(--bg-surface)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] shrink-0">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--primary-light)] text-[var(--primary)] mb-0.5">
                {policy.badge}
              </div>
              <h2 id="policy-modal-title" className="text-lg sm:text-xl font-bold font-display text-[var(--text-main)]">
                {policy.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-[var(--text-main)] leading-relaxed">
          {policy.sections.map((sec, i) => (
            <div key={i} className="p-4 rounded-2xl bg-[var(--bg-subtle)]/60 border border-[var(--border)]/70 space-y-1.5">
              <h3 className="font-bold text-[var(--text-main)] text-sm">
                {sec.heading}
              </h3>
              <p className="text-[var(--text-muted)] leading-relaxed">
                {sec.content}
              </p>
            </div>
          ))}

          {/* Official TVO Details Footer Strip */}
          <div className="mt-6 pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
              <span>Vipul World, Sector 48, Gurugram 122001</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="tel:+917678259522" className="hover:text-[var(--primary)] flex items-center gap-1 font-semibold">
                <Phone className="w-3 h-3 text-[var(--primary)]" /> +91 76782 59522
              </a>
              <a href="mailto:hello@tvoflavours.com" className="hover:text-[var(--primary)] flex items-center gap-1 font-semibold">
                <Mail className="w-3 h-3 text-[var(--primary)]" /> hello@tvoflavours.com
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-subtle)] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
