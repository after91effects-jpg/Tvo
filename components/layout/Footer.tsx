'use client';

import React, { useState } from 'react';
import {
  Heart,
  Shield,
  Award,
  ChevronDown,
  Phone,
  MessageCircle,
  Truck,
  Sparkles,
  MapPin,
  Clock,
} from 'lucide-react';
import { DEFAULT_STORE_SETTINGS } from '../../lib/seedData';
import { NewsletterSignup } from '../storefront/NewsletterSignup';

interface FooterProps {
  onNavigate: (view: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const toggleAccordion = (section: string) => {
    setOpenAccordion((prev) => (prev === section ? null : section));
  };

  return (
    <footer className="bg-[var(--bg-surface)] border-t border-[var(--border)] pt-10 sm:pt-16 pb-28 sm:pb-10 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Newsletter Marketing Signup Component */}
        <NewsletterSignup />

        {/* Mobile Kitchen Helpline & Live Order Support Card (Mobile App Exclusive) */}
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

        {/* Desktop Footer Grid / Mobile Accordions */}
        <div className="hidden lg:grid grid-cols-5 gap-8 mb-12">
          {/* Brand Col */}
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
                The All-in-one Baking Shop
              </span>
            </button>

            <p className="text-xs text-[var(--text-muted)] mt-4 leading-relaxed max-w-sm">
              Handcrafting moments of unadulterated sweetness. Every cake is baked fresh to order in our temperature-controlled artisan kitchens using pure single-origin cacao, real dairy cream, and seasonal fruits.
            </p>

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

          {/* Know Us */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 font-display">
              Know TVO Flavours
            </h4>
            <ul className="space-y-2 text-xs text-[var(--text-muted)]">
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Our Artisan Story
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'eggless')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  100% Eggless Philosophy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Pure Cocoa Ingredients
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Chef Administrator Login
                </button>
              </li>
            </ul>
          </div>

          {/* Need Help */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 font-display">
              Need Help?
            </h4>
            <ul className="space-y-2 text-xs text-[var(--text-muted)]">
              <li>
                <button onClick={() => onNavigate('wishlist')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  My Saved Wishlist
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('orders')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Past Orders & History
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('track')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Track Live Order
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Delivery Slot FAQs
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Kitchen Helpline
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Cancellation Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 font-display">
              Popular Treats
            </h4>
            <ul className="space-y-2 text-xs text-[var(--text-muted)]">
              <li>
                <button onClick={() => onNavigate('category', 'chocolate')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Belgian Dark Truffle
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'anniversary')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Crimson Red Velvet
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'fruit-cakes')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Fresh Exotic Fruits
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'hampers')} className="hover:text-[var(--primary)] transition-colors cursor-pointer">
                  Luxe Gift Hampers
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Mobile Accordion Navigation Sections */}
        <div className="block lg:hidden space-y-2 mb-8">
          {/* Section 1: Know TVO Flavours */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleAccordion('know')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-[var(--text-main)] cursor-pointer"
            >
              <span>Know TVO Flavours</span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-subtle)] transition-transform duration-200 ${
                  openAccordion === 'know' ? 'rotate-180 text-[var(--primary)]' : ''
                }`}
              />
            </button>
            {openAccordion === 'know' && (
              <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-[var(--border)]/50 text-xs text-[var(--text-muted)] animate-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Our Artisan Story & Heritage
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'eggless')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  100% Eggless Vegetarian Philosophy
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Pure Belgian Cocoa Ingredients
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

          {/* Section 2: Need Help */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleAccordion('help')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-[var(--text-main)] cursor-pointer"
            >
              <span>Customer Help & Orders</span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-subtle)] transition-transform duration-200 ${
                  openAccordion === 'help' ? 'rotate-180 text-[var(--primary)]' : ''
                }`}
              />
            </button>
            {openAccordion === 'help' && (
              <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-[var(--border)]/50 text-xs text-[var(--text-muted)] animate-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => onNavigate('orders')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Past Orders & Invoices
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('track')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Track Live Cake Delivery
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('wishlist')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  My Saved Wishlist
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('faq')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Delivery Slots & Timings
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Kitchen Helpline & Support
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Popular Treats */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleAccordion('treats')}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-[var(--text-main)] cursor-pointer"
            >
              <span>Popular Celebration Treats</span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-subtle)] transition-transform duration-200 ${
                  openAccordion === 'treats' ? 'rotate-180 text-[var(--primary)]' : ''
                }`}
              />
            </button>
            {openAccordion === 'treats' && (
              <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-[var(--border)]/50 text-xs text-[var(--text-muted)] animate-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'chocolate')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Belgian Dark Truffle Cakes
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'anniversary')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Crimson Red Velvet Celebration Cakes
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'fruit-cakes')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Fresh Exotic Fruits & Cheesecakes
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('category', 'hampers')}
                  className="block w-full text-left py-1 hover:text-[var(--primary)] transition-colors"
                >
                  Luxe Gift Hampers & Desserts
                </button>
              </div>
            )}
          </div>
        </div>

        {/* City Link Cloud */}
        <div className="pt-6 pb-6 border-t border-[var(--border)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-2.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>2-Hour Express Delivery Available In:</span>
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
    </footer>
  );
};

