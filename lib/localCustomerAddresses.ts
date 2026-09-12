'use client';

import { CustomerAddress, CustomerAddressInput, AddressLabel } from './types';

export type { CustomerAddress, CustomerAddressInput, AddressLabel };

const ADDRESSES_KEY = 'tvoflavours_customer_addresses';

export const ADDRESS_LABELS: AddressLabel[] = ['home', 'work', 'other'];

export const ADDRESS_LABEL_LABELS: Record<AddressLabel, string> = {
  home: 'Home',
  work: 'Work',
  other: 'Other',
};

function normalizePhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function addressLabelText(label: AddressLabel): string {
  return ADDRESS_LABEL_LABELS[label] || 'Other';
}

export function validateCustomerAddress(input: CustomerAddressInput): { ok: boolean; error?: string } {
  const fullName = (input.fullName || '').trim();
  if (fullName.length < 2 || fullName.length > 100) {
    return { ok: false, error: 'Please enter a valid full name (2 to 100 characters).' };
  }

  const phone = normalizePhone(input.phone || '');
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return { ok: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
  }

  const line1 = (input.line1 || '').trim();
  if (line1.length < 5) {
    return { ok: false, error: 'Please enter a complete address (at least 5 characters).' };
  }

  const city = (input.city || '').trim();
  if (!city) {
    return { ok: false, error: 'Please enter a city.' };
  }

  const state = (input.state || '').trim();
  if (!state) {
    return { ok: false, error: 'Please enter a state.' };
  }

  const pincode = (input.pincode || '').trim();
  if (!/^\d{6}$/.test(pincode)) {
    return { ok: false, error: 'Please enter a valid 6-digit PIN code.' };
  }

  return { ok: true };
}

export function cleanAddressForStorage(input: CustomerAddressInput): CustomerAddressInput {
  return {
    label: input.label || 'home',
    fullName: (input.fullName || '').trim(),
    phone: normalizePhone(input.phone || ''),
    line1: (input.line1 || '').trim(),
    line2: (input.line2 || '').trim() || undefined,
    city: (input.city || '').trim(),
    state: (input.state || '').trim(),
    pincode: (input.pincode || '').trim(),
    isDefault: !!input.isDefault,
  };
}

function getAddresses(uid: string): CustomerAddress[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(`${ADDRESSES_KEY}_${uid}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveAddresses(uid: string, addresses: CustomerAddress[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${ADDRESSES_KEY}_${uid}`, JSON.stringify(addresses));
  } catch (e) {
    console.warn('Could not save addresses:', e);
  }
}

function generateId(): string {
  return 'addr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function unsetAllDefaults(uid: string, addresses: CustomerAddress[]): CustomerAddress[] {
  return addresses.map(addr => addr.isDefault ? { ...addr, isDefault: false } : addr);
}

export async function fetchCustomerAddresses(uid: string): Promise<CustomerAddress[]> {
  return getAddresses(uid).sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1));
}

export async function createCustomerAddress(
  uid: string,
  input: CustomerAddressInput
): Promise<{ ok: boolean; error?: string }> {
  const validated = validateCustomerAddress(input);
  if (!validated.ok) return validated;

  const cleaned = cleanAddressForStorage(input);
  try {
    let addresses = getAddresses(uid);
    if (cleaned.isDefault) {
      addresses = unsetAllDefaults(uid, addresses);
    }
    const newAddress: CustomerAddress = {
      id: generateId(),
      label: cleaned.label,
      fullName: cleaned.fullName,
      phone: cleaned.phone,
      line1: cleaned.line1,
      line2: cleaned.line2,
      city: cleaned.city,
      state: cleaned.state,
      pincode: cleaned.pincode,
      isDefault: cleaned.isDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addresses.push(newAddress);
    saveAddresses(uid, addresses);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not save address. Please try again.' };
  }
}

export async function updateCustomerAddress(
  uid: string,
  addressId: string,
  input: CustomerAddressInput
): Promise<{ ok: boolean; error?: string }> {
  const validated = validateCustomerAddress(input);
  if (!validated.ok) return validated;

  const cleaned = cleanAddressForStorage(input);
  const addresses = getAddresses(uid);
  const idx = addresses.findIndex(a => a.id === addressId);
  if (idx < 0) return { ok: false, error: 'Address not found.' };

  if (cleaned.isDefault) {
    addresses.forEach(a => { if (a.id !== addressId) a.isDefault = false; });
  }

  addresses[idx] = {
    ...addresses[idx],
    ...cleaned,
    updatedAt: new Date().toISOString(),
  };
  saveAddresses(uid, addresses);
  return { ok: true };
}

export async function deleteCustomerAddress(uid: string, addressId: string): Promise<{ ok: boolean; error?: string }> {
  const addresses = getAddresses(uid);
  const idx = addresses.findIndex(a => a.id === addressId);
  if (idx < 0) return { ok: false, error: 'Address not found.' };

  addresses.splice(idx, 1);
  saveAddresses(uid, addresses);
  return { ok: true };
}

export async function setDefaultCustomerAddress(uid: string, addressId: string): Promise<{ ok: boolean; error?: string }> {
  const addresses = getAddresses(uid);
  const idx = addresses.findIndex(a => a.id === addressId);
  if (idx < 0) return { ok: false, error: 'Address not found.' };

  addresses.forEach(a => { a.isDefault = false; });
  addresses[idx].isDefault = true;
  addresses[idx].updatedAt = new Date().toISOString();
  saveAddresses(uid, addresses);
  return { ok: true };
}