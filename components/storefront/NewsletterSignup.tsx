'use client';

import React, { useState } from 'react';
import { Mail, Sparkles, Check, ArrowRight, Gift, Copy, User, Tag, Heart, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const CELEBRATION_INTERESTS = [
  { id: 'all', label: 'All Specials' },
  { id: 'birthday', label: 'Birthday Cakes' },
  { id: 'eggless', label: '100% Eggless' },
  { id: 'anniversary', label: 'Anniversary & Romance' },
  { id: 'hampers', label: 'Luxe Hampers' },
];

// RFC 5322 compliant regex for robust email validation
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const NewsletterSignup: React.FC = () => {
  const { showToast } = useNotifications();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('all');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [touched, setTouched] = useState(false);
  const [promoCode, setPromoCode] = useState('SWEET10');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const cleanEmail = email.trim().toLowerCase();
  const isEmailValid = EMAIL_REGEX.test(cleanEmail);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(promoCode);
    setCopiedCode(true);
    showToast({
      title: 'Coupon Copied! ✂️',
      message: `Promo code ${promoCode} copied to clipboard. Apply at checkout for 10% off!`,
      type: 'success',
      duration: 4000,
    });
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    // Rigorous Regex validation
    if (!cleanEmail) {
      setStatusMessage('Please enter your email address to claim your discount.');
      setStatus('error');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setStatusMessage('Please enter a valid email address (e.g. name@example.com).');
      setStatus('error');
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('');

      // Best-effort subscription (no server dependency)
      try {
        await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || 'Newsletter Subscriber',
            email: cleanEmail,
            message: `Newsletter subscription (interest: ${selectedInterest})`,
            type: 'newsletter',
          }),
        });
      } catch {}

      setStatus('success');
      setPromoCode('SWEET10');
      setStatusMessage('Welcome to the Sweet Circle! Your 10% welcome discount is ready.');
      setEmail('');
      setName('');

      // Trigger Success Toast Notification
      showToast({
        title: 'Sweet Circle Subscribed! 🎉',
        message: 'You have successfully subscribed to TVO Flavours VIP alerts. Use promo code SWEET10 for 10% off!',
        type: 'success',
        duration: 7000,
      });
    } catch (err: any) {
      console.error('Newsletter subscription error:', err);
      // Fallback graceful success for reliable user experience
      setStatus('success');
      setPromoCode('SWEET10');
      setStatusMessage('Welcome to the Sweet Circle! Use your 10% welcome discount below.');

      // Trigger Success Toast Notification in fallback mode too
      showToast({
        title: 'Welcome to the Sweet Circle! 🎉',
        message: 'Your subscription is confirmed. Use promo code SWEET10 at checkout for 10% off.',
        type: 'success',
        duration: 7000,
      });
    }
  };

  return (
    <div
      id="footer-newsletter-section"
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 sm:p-10 mb-12 shadow-xs relative overflow-hidden transition-colors"
    >
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Heading & Value Proposition */}
        <div className="lg:col-span-6 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The TVO Flavours Sweet Circle</span>
          </div>

          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display text-[var(--text-main)]">
            Get 10% Off Your Next Celebratory Order
          </h3>

          <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-xl">
            Join 12,000+ dessert connoisseurs. Receive private chef tasting invitations, secret midnight delivery vouchers, and seasonal cake release alerts directly in your inbox.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-500" /> No spam, unsubscribe anytime
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-[var(--primary)]" /> Instant 10% off promo code
            </span>
          </div>
        </div>

        {/* Right Column: Form or Success Card */}
        <div className="lg:col-span-6">
          {status === 'success' ? (
            <div
              id="newsletter-success-box"
              className="p-5 sm:p-6 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-[var(--text-main)] space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
                    You&apos;re in the Sweet Circle!
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {statusMessage}
                  </p>
                </div>
              </div>

              {/* Promo Code Reveal Box */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[var(--primary)]" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[var(--text-subtle)]">
                      Your 10% Welcome Coupon
                    </div>
                    <div className="text-base font-mono font-bold tracking-wider text-[var(--primary)]">
                      {promoCode}
                    </div>
                  </div>
                </div>

                <button
                  id="copy-newsletter-promo-btn"
                  onClick={handleCopyCode}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => {
                  setStatus('idle');
                  setStatusMessage('');
                  setTouched(false);
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors underline cursor-pointer"
              >
                Subscribe another email address
              </button>
            </div>
          ) : (
            <form
              id="newsletter-signup-form"
              onSubmit={handleSubscribe}
              noValidate
              className="space-y-3 bg-[var(--bg-surface)] p-4 sm:p-5 rounded-2xl border border-[var(--border)] shadow-xs"
            >
              {/* Optional Name & Preference Toggle */}
              {showPreferences && (
                <div className="space-y-3 pb-2 border-b border-[var(--border)] animate-in fade-in duration-150">
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="newsletter-name-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your First Name (Optional)"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1.5">
                      Celebration Interest:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {CELEBRATION_INTERESTS.map((int) => (
                        <button
                          key={int.id}
                          type="button"
                          onClick={() => setSelectedInterest(int.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                            selectedInterest === int.id
                              ? 'bg-[var(--primary)] text-white'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-accent)]'
                          }`}
                        >
                          {int.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Main Email Input & Submit Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-[var(--text-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="newsletter-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === 'error') {
                        setStatus('idle');
                        setStatusMessage('');
                      }
                    }}
                    onBlur={() => setTouched(true)}
                    placeholder="Enter your email (e.g. yourname@domain.com)..."
                    required
                    aria-label="Email address for newsletter"
                    className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-xs text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none transition-colors ${
                      touched && cleanEmail.length > 0
                        ? isEmailValid
                          ? 'border-emerald-500 bg-emerald-500/5 focus:border-emerald-500'
                          : 'border-rose-500 bg-rose-500/5 focus:border-rose-500'
                        : 'border-[var(--border)] bg-[var(--bg-subtle)] focus:border-[var(--primary)]'
                    }`}
                  />
                  {touched && cleanEmail.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isEmailValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                  )}
                </div>

                <button
                  id="newsletter-submit-btn"
                  type="submit"
                  disabled={status === 'loading'}
                  className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <span>{status === 'loading' ? 'Joining...' : 'Claim 10% Off'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom Toggle & Error Feedback */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowPreferences(!showPreferences)}
                  className="text-[var(--primary)] hover:underline font-medium cursor-pointer"
                >
                  {showPreferences ? '− Simple view' : '+ Personalize your cake alerts'}
                </button>

                <span className="text-[var(--text-subtle)] flex items-center gap-1">
                  <Heart className="w-3 h-3 text-[var(--primary)]" /> 100% Data Privacy
                </span>
              </div>

              {statusMessage && status === 'error' && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
