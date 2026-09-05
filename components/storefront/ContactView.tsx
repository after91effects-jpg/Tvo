'use client';

import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle, MessageSquare } from 'lucide-react';

export const ContactView: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message) return;

    try {
      setIsSubmitting(true);
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });
      setIsSent(true);
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
      setTimeout(() => setIsSent(false), 4000);
    } catch (e) {
      setIsSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-10 sm:py-16 space-y-12 animate-in fade-in duration-200">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Kitchen Concierge</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
          We are Here for Your Celebrations
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)]">
          Have special custom cake requests, bulk corporate gifting, or midnight delivery questions?
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex items-start gap-4">
            <div className="p-3 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                Direct Kitchen Hotline
              </div>
              <div className="text-sm font-bold text-[var(--text-main)] mt-0.5">
                +91 7678259522
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Available 8:00 AM - 12:30 AM Daily
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex items-start gap-4">
            <div className="p-3 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                Email Support
              </div>
              <div className="text-sm font-bold text-[var(--text-main)] mt-0.5">
                hello@tvoflavours.com
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Replies within 30 minutes
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex items-start gap-4">
            <div className="p-3 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)]">
                TVO Flavours Kitchen
              </div>
              <div className="text-sm font-bold text-[var(--text-main)] mt-0.5">
                TVO Flavours
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Vipul World, Sector 48, Gurugram, Haryana, 122001
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-7 bg-[var(--bg-surface)] p-6 sm:p-8 rounded-3xl border border-[var(--border)] shadow-sm">
          <h3 className="text-base font-bold font-display text-[var(--text-main)] mb-1">
            Send an Artisan Inquiry
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-6">
            Leave us a note and our chef concierge will reach back immediately.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Kapoor"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Contact Mobile Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@example.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Your Celebration / Inquiry Message *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Describe your custom theme cake requirements, wedding dessert table, or delivery inquiries..."
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            {isSent && (
              <p className="text-xs text-[var(--success)] font-medium flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle className="w-4 h-4" />
                Thank you! Your message has been routed to our Kitchen Concierge.
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Sending...' : 'Send Inquiry'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
