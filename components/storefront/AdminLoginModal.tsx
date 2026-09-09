'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail } from 'lucide-react';
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
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
