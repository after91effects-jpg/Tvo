'use client';

import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { auth, sendPasswordResetEmail } from '../../lib/firebase';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Deliberately generic so the response never reveals whether an account exists.
const GENERIC_SUCCESS = 'If an account exists for this email, you\u2019ll receive instructions to reset your password.';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Reset the form each time the modal opens so a fresh request feels new.
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError('');
      setSent(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const value = email.trim();
    if (!value) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_REGEX.test(value)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      // The reset email is sent by the customer's identity provider (Firebase
      // Auth), which already handles secure, single-use, expiring reset links.
      // The link routes back to the storefront reset screen on this same domain.
      const settings = {
        url: typeof window !== 'undefined' ? `${window.location.origin}/?view=reset` : '/?view=reset',
        handleCodeInApp: true,
      };
      // The provider resolves for both existing and non-existing accounts, and
      // any non-transport error below is treated as success too — so the generic
      // confirmation is what every submitter sees. Only a transport/network
      // failure surfaces a retry-friendly message.
      await sendPasswordResetEmail(auth, value, settings);
      setSent(true);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/network-request-failed' || code === 'auth/too-many-requests') {
        setError('Something went wrong while sending the email. Please try again in a moment.');
      } else {
        setSent(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Forgot Password?"
      subtitle={'We\u2019ll email you a secure link to reset your password.'}
      maxWidth="md"
    >
      {sent ? (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Reset link sent
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{GENERIC_SUCCESS}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-98 transition-all cursor-pointer"
          >
            Return to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border)]">
            <KeyRound className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {'Enter the email address linked to your celebration account and we\u2019ll send you a secure'}
              password-reset link.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sending link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </button>
        </form>
      )}
    </Modal>
  );
};

export default ForgotPasswordModal;