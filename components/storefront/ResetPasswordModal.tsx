'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Modal } from '../common/Modal';
import { auth, verifyPasswordResetCode, confirmPasswordReset } from '../../lib/firebase';

interface ResetPasswordModalProps {
  isOpen: boolean;
  oobCode: string;
  onClose: () => void;
}

const MIN_PASSWORD_LENGTH = 6;

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, oobCode, onClose }) => {
  // status: 'verifying' | 'invalid' | 'ready' | 'success'
  const [status, setStatus] = useState<'verifying' | 'invalid' | 'ready' | 'success'>('verifying');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStatus('verifying');
    setError('');
    setPassword('');
    setConfirm('');
    setShowPassword(false);
    setShowConfirm(false);
    setIsSubmitting(false);

    if (!oobCode) {
      setStatus('invalid');
      return;
    }

    let active = true;
    verifyPasswordResetCode(auth, oobCode)
      .then(() => {
        if (active) setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('invalid');
      });
    return () => {
      active = false;
    };
  }, [isOpen, oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please choose a new password.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (!confirm) {
      setError('Please confirm your new password.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match. Please re-enter them.');
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        setError('This reset link is invalid or has expired. Please request a new one.');
      } else if (code === 'auth/weak-password') {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      } else if (code === 'auth/network-request-failed') {
        setError('Network trouble reached the bakery. Please try again in a moment.');
      } else {
        setError('We couldn\u2019t update your password. Please request a new reset link and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShowPassword = () => setShowPassword((prev) => !prev);

  const toggleShowConfirm = () => setShowConfirm((prev) => !prev);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set a New Password"
      subtitle="Choose a fresh password for your celebration account."
      maxWidth="md"
    >
      {status === 'verifying' && (
        <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
          <div className="text-sm font-semibold text-[var(--text-main)]">Verifying your reset link...</div>
        </div>
      )}

      {status === 'invalid' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-[var(--danger-light)] border border-[var(--danger)]/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--danger)]">This reset link isn&rsquo;t valid anymore</div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Reset links are single-use and expire after a short time. Please request a fresh reset link to continue.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-98 transition-all cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      )}

      {status === 'ready' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border)]">
            <KeyRound className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Your reset link was verified. Give your account a brand-new password to get back to celebrating.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">Confirm New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <button
                type="button"
                onClick={toggleShowConfirm}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                aria-label={showConfirm ? 'Hide confirmation' : 'Show confirmation'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating password...
              </>
            ) : (
              'Update Password'
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

      {status === 'success' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Password updated
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                You&rsquo;re ready to sign in again with your new password. For your security, this reset link can no longer be used.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.search = '';
                if (typeof window.history.replaceState === 'function') {
                  window.history.replaceState({}, document.title, url.pathname + url.search);
                }
              }
            }}
            className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-98 transition-all cursor-pointer"
          >
            Return to Login
          </button>
        </div>
      )}
    </Modal>
  );
};

export default ResetPasswordModal;