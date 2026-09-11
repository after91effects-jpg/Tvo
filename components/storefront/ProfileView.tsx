'use client';

import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProfileViewProps {
  onNavigate: (view: string, param?: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
  const { user, isAuthReady, updateCustomerProfile } = useAuth();

  const [displayName, setDisplayName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Sync the editable fields whenever the authenticated profile changes.
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user?.uid, user?.name, user?.phone]);

  useEffect(() => {
    setHasChanges(
      user
        ? displayName.trim() !== (user.name || '') || phone.trim() !== (user.phone || '')
        : false
    );
  }, [displayName, phone, user]);

  if (!isAuthReady) {
    // Loading state — auth session is still being restored (no sign-in flash).
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-5 shadow-inner">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold font-display text-[var(--text-main)]">
            Loading your profile...
          </h1>
        </div>
      </div>
    );
  }

  if (!user) {
    // Authentication required state — only the signed-in customer can view
    // their own profile. No customer ID is ever read from the URL.
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-5 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)]">
            Sign in to view your profile
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 max-w-md">
            Your name, contact details and account information are shown here after you sign in to
            your TVO Flavours celebration account.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="mt-6 px-6 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <UserIcon className="w-4 h-4" />
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    const res = await updateCustomerProfile(displayName, phone);
    setIsSaving(false);
    if (res.success) {
      setSaveMessage({ type: 'success', text: 'Profile updated successfully.' });
    } else {
      setSaveMessage({ type: 'error', text: res.error || 'Could not update profile. Please try again.' });
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold mb-2">
            <UserIcon className="w-3.5 h-3.5" />
            <span>My Celebration Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
            Customer Profile
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            View and manage your account details for faster checkouts and order tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-2 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to My Orders
        </button>
      </div>

      {/* User Status Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] font-bold flex items-center justify-center text-base shrink-0 shadow-inner">
            {user.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">{user.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[10px] font-bold uppercase border border-[var(--border)]">
                {user.role}
              </span>
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{user.email}</div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          This is your own private profile — only you can see and change it.
        </div>
      </div>

      {/* Profile Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Name & Phone — editable */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 mb-1">
              <UserIcon className="w-4 h-4 text-[var(--primary)]" />
              Your Details
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Shown on your orders, invoices and delivery confirmations.
            </p>
            <label htmlFor="profile-name-input" className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Full Name
            </label>
            <input
              id="profile-name-input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-all"
            />
            <label htmlFor="profile-phone-input" className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mt-4 mb-1.5">
              Phone Number
            </label>
            <input
              id="profile-phone-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-all"
            />
            <p className="text-[11px] text-[var(--text-subtle)] mt-1.5">
              Your number is pre-filled at checkout so our baker can reach you for delivery confirmations.
            </p>

            {saveMessage && (
              <div
                className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-xs font-semibold border ${
                  saveMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                {saveMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{saveMessage.text}</span>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Saving Changes...' : hasChanges ? 'Save Changes' : 'All Changes Saved'}
              </button>
            </div>
          </div>

          {/* Email — read-only */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-[var(--primary)]" />
              Email Address
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Your sign-in email is managed securely by your account provider and cannot be edited
              here.
            </p>
            <div className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-sm text-[var(--text-muted)] flex items-center justify-between gap-2">
              <span className="truncate">{user.email}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-subtle)] shrink-0">
                <Lock className="w-3 h-3" />
                Read-only
              </span>
            </div>
          </div>
        </div>

        {/* Side info card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[var(--bg-surface)] via-[var(--bg-subtle)] to-[var(--bg-surface)] border border-[var(--border)] shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-4 h-4 text-[var(--primary)]" />
            <h3 className="text-sm font-bold text-[var(--text-main)]">Contact Details</h3>
          </div>
          <dl className="space-y-4 text-xs">
            <div>
              <dt className="font-semibold text-[var(--text-muted)] uppercase tracking-wide text-[10px] mb-1">
                Phone Number
              </dt>
              <dd className="text-sm text-[var(--text-main)]">
                {user.phone ? (
                  user.phone
                ) : (
                  <span className="text-[var(--text-subtle)]">No phone number on file</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--text-muted)] uppercase tracking-wide text-[10px] mb-1">
                Member Since
              </dt>
              <dd className="text-sm text-[var(--text-main)]">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--text-muted)] uppercase tracking-wide text-[10px] mb-1">
                Last Sign In
              </dt>
              <dd className="text-sm text-[var(--text-main)]">
                {user.lastLogin
                  ? new Date(user.lastLogin).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
          </dl>
          <div className="mt-5 pt-4 border-t border-[var(--border)]">
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              Your profile details are stored securely in your account and synced across your
              devices, so checkouts stay quick and order updates reach you reliably.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};