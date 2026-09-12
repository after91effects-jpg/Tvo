'use client';

import { CustomerAddress, CustomerAddressInput, AddressLabel } from './types';
import { useLocalStorageJSON } from './useLocalStorage';

const PROFILES_KEY = 'tvoflavours_customer_profiles';

export interface LocalCustomerProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

function getProfiles(): Record<string, LocalCustomerProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(PROFILES_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveProfiles(profiles: Record<string, LocalCustomerProfile>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.warn('Could not save customer profiles:', e);
  }
}

export function getLocalCustomerProfile(uid: string): LocalCustomerProfile | null {
  const profiles = getProfiles();
  return profiles[uid] || null;
}

export function setLocalCustomerProfile(
  uid: string,
  data: { name: string; email: string; phone?: string; createdAt?: string }
): void {
  const profiles = getProfiles();
  const existing = profiles[uid];
  profiles[uid] = {
    uid,
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    createdAt: existing?.createdAt || data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveProfiles(profiles);
}

export function updateLocalCustomerProfile(
  uid: string,
  name: string,
  phone?: string
): { success: boolean; error?: string } {
  const profiles = getProfiles();
  if (!profiles[uid]) {
    return { success: false, error: 'Profile not found.' };
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return { success: false, error: 'Name must be between 2 and 100 characters.' };
  }

  const trimmedPhone = (phone || '').trim();
  const phoneDigits = trimmedPhone.replace(/\D/g, '');
  if (trimmedPhone && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
    return { success: false, error: 'Please enter a valid phone number (7 to 15 digits).' };
  }

  if (trimmedName === profiles[uid].name && trimmedPhone === (profiles[uid].phone || '')) {
    return { success: true };
  }

  profiles[uid] = {
    ...profiles[uid],
    name: trimmedName,
    phone: trimmedPhone || '',
    updatedAt: new Date().toISOString(),
  };
  saveProfiles(profiles);
  return { success: true };
}

export function useLocalCustomerProfile(uid: string | null | undefined) {
  const [profile, setProfile] = useLocalStorageJSON<LocalCustomerProfile | null>(
    uid ? `tvoflavours_profile_${uid}` : 'tvoflavours_profile_null',
    null
  );

  const loadProfile = () => {
    if (!uid) {
      setProfile(null);
      return;
    }
    const p = getLocalCustomerProfile(uid);
    setProfile(p);
  };

  return {
    profile,
    loadProfile,
    update: async (name: string, phone?: string) => {
      if (!uid) return { success: false, error: 'Not authenticated.' };
      const result = updateLocalCustomerProfile(uid, name, phone);
      if (result.success) {
        loadProfile();
      }
      return result;
    },
  };
}