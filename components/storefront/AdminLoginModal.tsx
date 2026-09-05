'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Key, UserCheck, ArrowRight, Sparkles } from 'lucide-react';
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
  const { login, quickLoginAs } = useAuth();
  const [email, setEmail] = useState('admin@tvoflavours.com');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError('');
      await login(email, password);
      onClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (role: 'admin' | 'staff') => {
    quickLoginAs(role);
    onClose();
    onSuccess();
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
        {/* Quick Demo Role Switcher */}
        <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-subtle)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>1-Click Fast Access</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="p-3 rounded-xl border border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] text-left hover:bg-[var(--primary)] hover:text-white transition-all group cursor-pointer"
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>Chef Admin</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[10px] opacity-80 mt-0.5">Full Catalog & CSV Hub</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('staff')}
              className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] text-left hover:border-[var(--primary)] transition-all group cursor-pointer"
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>Kitchen Staff</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Orders & Status Only</div>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <span className="relative bg-[var(--bg-card)] px-3 text-[10px] uppercase font-bold text-[var(--text-subtle)]">
            Or Sign In with Credentials
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleCustomLogin} className="space-y-4">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        {/* Security Footer Note */}
        <div className="text-center text-[10px] text-[var(--text-subtle)] flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Role Gate Protected • Activity logged to Firestore Audit Stream</span>
        </div>
      </div>
    </Modal>
  );
};
