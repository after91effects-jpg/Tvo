'use client';

import React, { useState } from 'react';
import {
  Heart,
  Shield,
  Award,
  ChevronDown,
  Phone,
  MessageCircle,
  Clock,
  MapPin,
  Mail,
  Lock,
} from 'lucide-react';
import { DEFAULT_STORE_SETTINGS } from '../../lib/seedData';
import { NewsletterSignup } from '../storefront/NewsletterSignup';
import { PolicyModal, PolicyType } from '../storefront/PolicyModal';

interface FooterProps {
  onNavigate: (view: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [activePolicy, setActivePolicy] = useState<PolicyType | null>(null);

  const toggleAccordion = (section: string) => {
    setOpenAccordion((prev) => (prev === section ? null : section));
  };

  return (
    <footer className="bg-[var(--bg-surface)] border-t border-[var(--border)] pt-10 sm:pt-16 pb-28 sm:pb-10 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Newsletter Marketing Signup Component */}
        <NewsletterSignup />

        {/* Mobile Kitchen Helpline & Live Order Support Card */}
        <div className="block lg:hidden mb-8 p-4 rounded-2xl bg-gradient-to-r from-[var(--bg-subtle)] to-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-[var(--text-main)]">TVO Flavours Kitchen Support</span>
            </div>
            <span className="text-[10px] font-semibold text-[var(--text-subtle)] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[var(--primary)]" />
              <span>9 AM - 11 PM Daily</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://wa.me/917678259522?text=Hi%20TVO%20Flavours,%20I%20have%20an%20order%20query"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/20"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Chat</span>
            </a>
            <a
              href="tel:+917678259522"
              className="py-2 px-3 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-[var(--primary)]/20"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Kitchen</span>
            </a>
          </div>
        </div>

        {/* Desktop Footer Grid */}
        <div className="hidden lg:grid grid-cols-5 gap-8 mb-12">
          {/* Brand Col (Col span 2) */}
          <div className="col-span-2">
            <button
              onClick={() => onNavigate('home')}
              className="text-left group cursor-pointer"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-display text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">
                  TVO Flavours
                </span>
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] inline-block" />
              </div>
              <span className="block text-[9px] uppercase tracking-widest font-semibold text-[var(--text-muted)]">
                The All-in-one Bakery Shop.
              </span>
            </button>

            <p className="text-xs text-[var(--text-muted)] mt-4 leading-relaxed max-w-sm">
              Handcrafting moments of unadulterated sweetness. Every cake is baked fresh to order in our temperature-controlled artisan kitchens using pure single-origin cacao, real dairy cream, and seasonal fruits.
            </p>

            <div className="mt-4 p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2.5 text-xs text-[var(--text-muted)] max-w-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                <span>Vipul World, Sector 48, Gurugram, Haryana 122001, India</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[var(--primary)] shrink-0" />
                <a href="tel:+917678259522" className="hover:text-[var(--primary)] transition-colors">
                  +91 76782 59522
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[var(--primary)] shrink-0" />
                <a href="mailto:hello@tvoflavours.com" className="hover:text-[var(--primary)] transition-colors">
                  hello@tvoflavours.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--success)] shrink-0" />
                <span>FSSAI: 20824005005006</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--success)]">
                <Shield className="w-3.5 h-3.5" /> 100% Hygiene Verified
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--primary)]">
                <Award className="w-3.5 h-3.5" /> Chef Handcrafted
              </span>
            </div>
          </div>

          {/* Column 2: Categories */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 font-display">
              Categories
            </h4>
            <ul className="space-y-2 text-xs text-[var(--text-muted)]">
              <li>
                <button onClick={() => onNavigate('category', 'all-cakes')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  All Cakes
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'desserts-pastries')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  Desserts & Pastries
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'theme-cakes')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  Theme Cakes
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'hampers-gifts')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  Hampers & Gifts
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'party-supplies')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  Party Supplies
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'by-relationship')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  By Relationship
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'birthday-cakes')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  Birthday
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'customized-cakes')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  Customized Cakes
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'baking-store')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  Baking Store
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Useful Links */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 font-display">
              Useful Links
            </h4>
            <ul className="space-y-2 text-xs text-[var(--text-muted)]">
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy('privacy-policy')}
                  className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left"
                >
                  Contact
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy('terms-conditions')}
                  className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy('refund-returns-policy')}
                  className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left"
                >
                  Refund & Returns Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy('shipping-policy')}
                  className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left"
                >
                  Shipping Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: My Account */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 font-display">
              My Account
            </h4>
            <ul className="space-y-2 text-xs text-[var(--text-muted)]">
              <li>
                <button onClick={() => onNavigate('profile')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  My Profile
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('orders')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  My Order History
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('track')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  Order Tracking
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('wishlist')} className="hover:text-[var(--primary)] transition-colors cursor-pointer text-left">
                  My Wishlist
                </button>
              </li>
              <li className="pt-2 border-t border-[var(--border)]/60">
                <button
                  onClick={() => onNavigate('admin')}
                  className="hover:text-[var(--primary)] text-[var(--text-subtle)] flex items-center gap-1 transition-colors cursor-pointer text-left font-medium"
                >
                  <Lock className="w-3 h-3" />
                  <span>Chef Administrator Login</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Mobile Accordion Navigation Sections */}
        <div className="block lg:hidden space-y-2 mb-8">
          {/* Section 1: Categories */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleAccordion('categories')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-[var(--text-main)] cursor-pointer"
            >
              <span>Categories</span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-subtle)] transition-transform duration-200 ${
                  openAccordion === 'categories' ? 'rotate-180 text-[var(--primary)]' : ''
                }`}
              />
            </button>
            {openAccordion === 'categories' && (
              <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-[var(--border)]/50 text-xs text-[var(--text-muted)] animate-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'all-cakes')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  All Cakes
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'desserts-pastries')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Desserts & Pastries
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'theme-cakes')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Theme Cakes
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'hampers-gifts')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Hampers & Gifts
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'party-supplies')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Party Supplies
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'by-relationship')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  By Relationship
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'birthday-cakes')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Birthday
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'customized-cakes')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Customized Cakes
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'baking-store')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Baking Store
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Useful Links */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleAccordion('useful')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-[var(--text-main)] cursor-pointer"
            >
              <span>Useful Links</span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-subtle)] transition-transform duration-200 ${
                  openAccordion === 'useful' ? 'rotate-180 text-[var(--primary)]' : ''
                }`}
              />
            </button>
            {openAccordion === 'useful' && (
              <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-[var(--border)]/50 text-xs text-[var(--text-muted)] animate-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => setActivePolicy('privacy-policy')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Contact
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicy('terms-conditions')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Terms & Conditions
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicy('refund-returns-policy')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Refund & Returns Policy
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicy('shipping-policy')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Shipping Policy
                </button>
              </div>
            )}
          </div>

          {/* Section 3: My Account */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleAccordion('account')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-[var(--text-main)] cursor-pointer"
            >
              <span>My Account</span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-subtle)] transition-transform duration-200 ${
                  openAccordion === 'account' ? 'rotate-180 text-[var(--primary)]' : ''
                }`}
              />
            </button>
            {openAccordion === 'account' && (
              <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-[var(--border)]/50 text-xs text-[var(--text-muted)] animate-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => onNavigate('profile')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('orders')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  My Order History
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('track')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Order Tracking
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('wishlist')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  My Wishlist
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="block w-full text-left py-1 text-[var(--primary)] font-bold transition-colors"
                >
                  Chef Administrator Login
                </button>
              </div>
            )}
          </div>
        </div>

        {/* City Link Cloud */}
        <div className="pt-6 pb-6 border-t border-[var(--border)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-2.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Fresh Delivery Available In:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {DEFAULT_STORE_SETTINGS.deliveryCities.map((city) => (
              <span
                key={city}
                className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2.5 py-1 rounded-lg hover:text-[var(--primary)] border border-[var(--border)]/40 cursor-default transition-colors"
              >
                {city}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[var(--text-subtle)] gap-3 text-center sm:text-left">
          <div>
            © {new Date().getFullYear()} TVO Flavours. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[var(--primary)] font-medium">
              Baked with <Heart className="w-3 h-3 fill-current text-[var(--primary)]" /> for Celebrations
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Policy Modal */}
      <PolicyModal policyType={activePolicy} onClose={() => setActivePolicy(null)} />
    </footer>
  );
};
