'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, UserIcon, Eye, EyeOff, KeyRound, Loader2, LogIn, UserPlus, ArrowLeft, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';

interface LoginRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForgotPassword?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 6;

type Mode = 'login' | 'register';

// Safe, generic messages. Never echo provider internals or user records.
function toSafeLoginError(message: string): string {
  const m = message || '';
  if (m.includes('invalid-email')) return 'Please enter a valid email address.';
  if (m.includes('too-many-requests')) return 'Too many attempts. Please wait a moment and try again.';
  if (m.includes('network-request-failed')) return 'A network error occurred. Please check your connection and try again.';
  return 'Invalid email or password. Please try again.';
}

function toSafeRegisterError(message: string): string {
  const m = message || '';
  if (m.includes('email-already-in-use')) return 'An account with this email already exists. Please sign in instead.';
  if (m.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (m.includes('invalid-email')) return 'Please enter a valid email address.';
  if (m.includes('network-request-failed')) return 'A network error occurred. Please check your connection and try again.';
  return 'Registration failed. Please try again.';
}

export const LoginRegisterModal: React.FC<LoginRegisterModalProps> = ({ isOpen, onClose, onForgotPassword }) => {
  const { user, loginWithEmail, registerCustomer } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset the form each time the modal opens so a fresh interaction feels new.
  useEffect(() => {
    if (isOpen) {
      setMode('login');
      setName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Successful authentication (AuthContext sets user) closes the modal.
  useEffect(() => {
    if (user && isOpen) onClose();
  }, [user, isOpen, onClose]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setName('');
    setPassword('');
    setError('');
  };

  const handleForgotPassword = () => {
    if (!onForgotPassword) return;
    onClose();
    onForgotPassword();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'register') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('Please enter your full name.');
        return;
      }
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        setError('Name must be between 2 and 100 characters.');
        return;
      }
    }

    setIsLoading(true);
    const res =
      mode === 'login'
        ? await loginWithEmail(trimmedEmail, password)
        : await registerCustomer(name.trim(), trimmedEmail, password);
    if (!res.success) {
      setError(mode === 'login' ? toSafeLoginError(res.error || '') : toSafeRegisterError(res.error || ''));
    }
    // On success the user effect above closes the modal.
    setIsLoading(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
      subtitle={
        mode === 'login'
          ? 'Sign in to manage orders, addresses and cake favorites.'
          : 'Join TVO Flavours for express checkout and order tracking.'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Register
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'register' && (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="Your full name"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
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

        <div>
          <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'login' ? 'Your password' : 'At least 6 characters'}
              className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
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
              {mode === 'login' ? 'Signing in...' : 'Creating account...'}
            </>
          ) : mode === 'login' ? (
            'Sign In'
          ) : (
            'Create Account'
          )}
        </button>

        <div className="flex items-center justify-between pt-1">
          {onForgotPassword && mode === 'login' ? (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[11px] font-semibold text-[var(--primary)] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3 h-3" />
              Forgot Password?
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to browsing
          </button>
        </div>

        <div className="pt-1 text-center">
          {mode === 'login' ? (
            <p className="text-xs text-[var(--text-muted)]">
              New to TVO Flavours?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="font-bold text-[var(--primary)] hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </p>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-bold text-[var(--primary)] hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default LoginRegisterModal;