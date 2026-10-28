'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { loginAdmin, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handlePasswordReset = async () => {
    setIsResetting(true);
    setError('');
    setResetSent(false);
    try {
      const result = await sendPasswordReset(email);
      if (!result.success) setError(result.error || 'Unable to send a reset email. Please try again.');
      else setResetSent(true);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError('');
      const result = await loginAdmin(email, password);
      if (!result.success) {
        setError(result.error || 'Login failed. Please check credentials.');
        return;
      }
      onClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chef Administrator Access"
      subtitle="Authorized bakery command center and live catalog operations"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Divider */}
        <div className="relative text-center">
          <span className="relative bg-[var(--bg-card)] px-3 text-[10px] uppercase font-bold text-[var(--text-subtle)]">
            Sign In with Credentials
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleCustomLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-xs font-medium">
              {error}
            </div>
          )}
          {resetSent && (
            <p role="status" className="p-3 rounded-xl bg-emerald-500/10 text-emerald-700 text-xs">
              If this email has an account, a password reset link has been sent. Check your inbox and spam folder.
            </p>
          )}

          <div>
            <label htmlFor="admin-login-email" className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="admin-login-email"
                name="email"
                autoComplete="username"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setResetSent(false); }}
                required
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-login-password" className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="admin-login-password"
                name="password"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isLoading || isResetting || resetSent}
            className="text-xs font-semibold text-[var(--primary)] hover:underline disabled:opacity-50"
          >
            {isResetting ? 'Sending reset link...' : 'Forgot password?'}
          </button>

          <button
            type="submit"
            disabled={isLoading || isResetting}
            className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        {/* Security Footer Note */}
        <div className="text-center text-[10px] text-[var(--text-subtle)] flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secure sign-in • Role-based admin access</span>
        </div>
      </div>
    </Modal>
  );
};
