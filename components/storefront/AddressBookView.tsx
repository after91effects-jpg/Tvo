'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Lock,
  Home,
  Briefcase,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import {
  ADDRESS_LABELS,
  addressLabelText,
  fetchCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  validateCustomerAddress,
  CustomerAddress,
  CustomerAddressInput,
  AddressLabel,
} from '../../lib/customerAddresses';
import { logAuditEvent } from '../../lib/audit';

interface AddressBookViewProps {
  onNavigate: (view: string, param?: string) => void;
}

const EMPTY_FORM: CustomerAddressInput = {
  label: 'home',
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: 'Gurugram',
  state: '',
  pincode: '',
  isDefault: false,
};

const LABEL_ICON: Record<AddressLabel, React.ComponentType<{ className?: string }>> = {
  home: Home,
  work: Briefcase,
  other: Package,
};

export const AddressBookView: React.FC<AddressBookViewProps> = ({ onNavigate }) => {
  const { user, isAuthReady } = useAuth();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerAddressInput>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CustomerAddressInput, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [defaultBusyId, setDefaultBusyId] = useState<string | null>(null);

  const uid = user?.uid || null;

  const loadAddresses = useCallback(async () => {
    if (!uid) return;
    setLoadError('');
    try {
      const rows = await fetchCustomerAddresses(uid);
      setAddresses(rows);
    } catch (e: any) {
      setLoadError('Could not load your saved addresses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (isAuthReady) {
      if (!uid) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      loadAddresses();
    }
  }, [isAuthReady, uid, loadAddresses]);

  if (!isAuthReady) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-5 shadow-inner">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold font-display text-[var(--text-main)]">
            Loading your addresses...
          </h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-5 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)]">
            Sign in to manage your addresses
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 max-w-md">
            Your saved delivery addresses are shown here after you sign in to your TVO Flavours
            celebration account.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="mt-6 px-6 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormErrors({});
    setSaveMessage(null);
    setFormOpen(true);
  };

  const openEdit = (addr: CustomerAddress) => {
    setForm({
      label: addr.label || 'home',
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: addr.isDefault,
    });
    setEditingId(addr.id);
    setFormErrors({});
    setSaveMessage(null);
    setFormOpen(true);
  };

  const validateField = (): boolean => {
    const errors: Partial<Record<keyof CustomerAddressInput, string>> = {};
    const clean: CustomerAddressInput = {
      ...form,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      line1: form.line1.trim(),
      line2: form.line2?.trim() || '',
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
    };
    const result = validateCustomerAddress(clean);
    if (!result.ok) {
      if (!clean.fullName || clean.fullName.length < 2 || clean.fullName.length > 100) errors.fullName = 'Enter your full name (2 to 100 characters).';
      if (!/^[6-9]\d{9}$/.test(clean.phone.replace(/\D/g, '').replace(/^(91|0)/, ''))) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
      if (!clean.line1 || clean.line1.length < 5) errors.line1 = 'Enter a complete address (at least 5 characters).';
      if (!clean.city) errors.city = 'Enter a city.';
      if (!clean.state) errors.state = 'Enter a state.';
      if (!/^\d{6}$/.test(clean.pincode)) errors.pincode = 'Enter a valid 6-digit PIN code.';
    }
    setFormErrors(errors);
    return result.ok;
  };

  const handleSave = async () => {
    if (!uid) return;
    if (!validateField()) return;
    setIsSaving(true);
    setSaveMessage(null);
    const clean: CustomerAddressInput = {
      label: form.label,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      line1: form.line1.trim(),
      line2: form.line2?.trim() || '',
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      isDefault: form.isDefault,
    };
    const res = editingId
      ? await updateCustomerAddress(uid, editingId, clean)
      : await createCustomerAddress(uid, clean);
    if (res.ok) {
      await loadAddresses();
      setFormOpen(false);
      setSaveMessage({ type: 'success', text: editingId ? 'Address updated successfully.' : 'Address added successfully.' });
      try {
        await logAuditEvent({
          actorUid: user.uid,
          actorName: user.name,
          actorEmail: user.email,
          role: user.role,
          action: editingId ? 'USER_ADDRESS_UPDATE' : 'USER_ADDRESS_CREATE',
          targetType: 'Account',
          details: `${clean.label} ${clean.fullName}`,
        });
      } catch {
        // ignore
      }
    } else {
      setSaveMessage({ type: 'error', text: res.error || 'Could not save address. Please try again.' });
    }
    setIsSaving(false);
  };

  const handleSetDefault = async (addr: CustomerAddress) => {
    if (!uid || addr.isDefault) return;
    setDefaultBusyId(addr.id);
    const res = await setDefaultCustomerAddress(uid, addr.id);
    if (res.ok) {
      await loadAddresses();
      setSaveMessage({ type: 'success', text: `${addressLabelText(addr.label)} address set as default.` });
      try {
        await logAuditEvent({
          actorUid: user.uid,
          actorName: user.name,
          actorEmail: user.email,
          role: user.role,
          action: 'USER_ADDRESS_SET_DEFAULT',
          targetType: 'Account',
          details: `${addressLabelText(addr.label)} ${addr.fullName}`,
        });
      } catch {
        // ignore
      }
    } else {
      setSaveMessage({ type: 'error', text: res.error || 'Could not set default address.' });
    }
    setDefaultBusyId(null);
  };

  const handleDelete = async (addr: CustomerAddress) => {
    if (!uid) return;
    setIsDeleting(true);
    setSaveMessage(null);
    const res = await deleteCustomerAddress(uid, addr.id);
    if (res.ok) {
      await loadAddresses();
      setConfirmDeleteId(null);
      setSaveMessage({ type: 'success', text: `${addressLabelText(addr.label)} address deleted.` });
      try {
        await logAuditEvent({
          actorUid: user.uid,
          actorName: user.name,
          actorEmail: user.email,
          role: user.role,
          action: 'USER_ADDRESS_DELETE',
          targetType: 'Account',
          details: `${addressLabelText(addr.label)} ${addr.fullName}`,
        });
      } catch {
        // ignore
      }
    } else {
      setSaveMessage({ type: 'error', text: res.error || 'Could not delete address. Please try again.' });
    }
    setIsDeleting(false);
  };

  const setField = <K extends keyof CustomerAddressInput>(key: K, value: CustomerAddressInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold mb-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>My Celebration Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
            Saved Addresses
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Manage your delivery addresses so every cake order reaches the right doorstep.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-2 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to My Orders
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Address
          </button>
        </div>
      </div>

      {/* User Status Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] font-bold flex items-center justify-center text-base shrink-0 shadow-inner">
            {user.name ? user.name.slice(0, 2).toUpperCase() : <MapPin className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">{user.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[10px] font-bold uppercase border border-[var(--border)]">
                {user.role}
              </span>
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {user.email}
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          Only you can see and manage these saved addresses.
        </div>
      </div>

      {saveMessage && (
        <div
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-xs font-semibold border ${
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

      {/* Address List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-20 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-4 shadow-inner">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Loading your saved addresses...</p>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-20 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mb-4" />
          <h2 className="text-base font-bold text-[var(--text-main)]">Could not load addresses</h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 max-w-md">{loadError}</p>
          <button
            type="button"
            onClick={loadAddresses}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-20 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-5 shadow-inner">
            <MapPin className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-display text-[var(--text-main)]">
            No saved addresses yet
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 max-w-md">
            Add a delivery address now so ordering your next celebration cake is faster and easier.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-6 px-6 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {addresses.map((addr) => {
            const LabelIcon = LABEL_ICON[addr.label] || Package;
            return (
              <div
                key={addr.id}
                className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs flex flex-col gap-3 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[10px] font-bold uppercase border border-[var(--border)]">
                      <LabelIcon className="w-3 h-3" />
                      {addressLabelText(addr.label)}
                    </span>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-[10px] font-bold uppercase">
                        <Star className="w-3 h-3 fill-current" />
                        Default
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm font-bold text-[var(--text-main)]">{addr.fullName}</div>
                <div className="text-xs leading-relaxed text-[var(--text-muted)] space-y-0.5">
                  <div>{addr.line1}</div>
                  {addr.line2 ? <div>{addr.line2}</div> : null}
                  <div>
                    {addr.city}, {addr.state} - {addr.pincode}
                  </div>
                  <div className="pt-1 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[var(--primary)]" />
                    {addr.phone}
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr)}
                      disabled={defaultBusyId === addr.id}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-[11px] font-semibold text-[var(--text-main)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {defaultBusyId === addr.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Star className="w-3 h-3" />
                      )}
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(addr)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-[11px] font-semibold text-[var(--text-main)] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  {confirmDeleteId === addr.id ? (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[11px] text-[var(--text-muted)]">Delete?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(addr)}
                        disabled={isDeleting}
                        className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isDeleting}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--text-main)] transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(addr.id)}
                      className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-semibold flex items-center gap-1.5 ml-auto transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit Address' : 'Add New Address'}
        subtitle={
          editingId
            ? 'Update this delivery address for your celebration account.'
            : 'Save a new delivery address to your celebration account.'
        }
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Address Type
            </label>
            <div className="flex items-center gap-2">
              {ADDRESS_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setField('label', label)}
                  className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    form.label === label
                      ? 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/40'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-accent)]'
                  }`}
                >
                  {addressLabelText(label)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="address-fullname-input" className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Full Name
            </label>
            <input
              id="address-fullname-input"
              type="text"
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              maxLength={100}
              placeholder="Recipient full name"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-all"
            />
            {formErrors.fullName && <p className="text-[11px] text-rose-500 mt-1">{formErrors.fullName}</p>}
          </div>

          <div>
            <label htmlFor="address-phone-input" className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Phone Number
            </label>
            <input
              id="address-phone-input"
              type="tel"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              maxLength={15}
              placeholder="10-digit Indian mobile number"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-all"
            />
            {formErrors.phone && <p className="text-[11px] text-rose-500 mt-1">{formErrors.phone}</p>}
          </div>

          <div>
            <label htmlFor="address-line1-input" className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Address (House No., Street, Area)
            </label>
            <textarea
              id="address-line1-input"
              value={form.line1}
              onChange={(e) => setField('line1', e.target.value)}
              rows={2}
              placeholder="e.g. 12B, Rosewood Residency, Sector 56"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-all resize-none"
            />
            {formErrors.line1 && <p className="text-[11px] text-rose-500 mt-1">{formErrors.line1}</p>}
          </div>

          <div>
            <label htmlFor="address-line2-input" className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
              Landmark / Building (optional)
            </label>
            <input
              id="address-line2-input"
              type="text"
              value={form.line2 || ''}
              onChange={(e) => setField('line2', e.target.value)}
              maxLength={120}
              placeholder="e.g. Opposite City Mall"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="address-city-input" className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                City
              </label>
              <input
                id="address-city-input"
                type="text"
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                maxLength={60}
                placeholder="Gurugram"
                className="w-full px-3 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-all"
              />
              {formErrors.city && <p className="text-[11px] text-rose-500 mt-1">{formErrors.city}</p>}
            </div>
            <div>
              <label htmlFor="address-state-input" className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                State
              </label>
              <input
                id="address-state-input"
                type="text"
                value={form.state}
                onChange={(e) => setField('state', e.target.value)}
                maxLength={60}
                placeholder="Haryana"
                className="w-full px-3 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-all"
              />
              {formErrors.state && <p className="text-[11px] text-rose-500 mt-1">{formErrors.state}</p>}
            </div>
            <div>
              <label htmlFor="address-pincode-input" className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                PIN Code
              </label>
              <input
                id="address-pincode-input"
                type="text"
                value={form.pincode}
                onChange={(e) => setField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                placeholder="122001"
                className="w-full px-3 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] transition-all"
              />
              {formErrors.pincode && <p className="text-[11px] text-rose-500 mt-1">{formErrors.pincode}</p>}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setField('isDefault', e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--primary)]"
            />
            <span className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-[var(--primary)]" />
              Set as my default delivery address
            </span>
          </label>

          {saveMessage && saveMessage.type === 'error' && (
            <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs font-semibold border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveMessage.text}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-main)] transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Address'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};