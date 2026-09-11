import {
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  COLLECTIONS,
} from './firebase';
import { CustomerAddress, CustomerAddressInput, AddressLabel } from './types';

export type { CustomerAddress, CustomerAddressInput, AddressLabel };

export const ADDRESS_LABELS: AddressLabel[] = ['home', 'work', 'other'];

const ADDRESS_LABEL_LABELS: Record<AddressLabel, string> = {
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

function toTimestamp(ts: any): string | undefined {
  if (!ts) return undefined;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return undefined;
}

async function unsetAllDefaults(uid: string) {
  const snap = await getDocs(collection(db, COLLECTIONS.CUSTOMER_ADDRESSES, uid, 'addresses'));
  if (snap.empty) return;
  const b = writeBatch(db);
  snap.docs.forEach((d) => {
    if (d.data().isDefault) b.update(d.ref, { isDefault: false, updatedAt: serverTimestamp() });
  });
  await b.commit();
}

export async function fetchCustomerAddresses(uid: string): Promise<CustomerAddress[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.CUSTOMER_ADDRESSES, uid, 'addresses'));
  const rows = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      label: (data.label as AddressLabel) || 'home',
      fullName: data.fullName || '',
      phone: data.phone || '',
      line1: data.line1 || '',
      line2: data.line2 || undefined,
      city: data.city || '',
      state: data.state || '',
      pincode: data.pincode || '',
      isDefault: !!data.isDefault,
      createdAt: toTimestamp(data.createdAt),
      updatedAt: toTimestamp(data.updatedAt),
    } as CustomerAddress;
  });
  rows.sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1));
  return rows;
}

export async function createCustomerAddress(uid: string, input: CustomerAddressInput): Promise<{ ok: boolean; error?: string }> {
  const validated = validateCustomerAddress(input);
  if (!validated.ok) return validated;
  const cleaned = cleanAddressForStorage(input);
  try {
    if (cleaned.isDefault) {
      // Only one default address is allowed per customer: clear existing defaults first.
      await unsetAllDefaults(uid);
    }
    await addDoc(collection(db, COLLECTIONS.CUSTOMER_ADDRESSES, uid, 'addresses'), {
      ...cleaned,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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
  const ref = doc(db, COLLECTIONS.CUSTOMER_ADDRESSES, uid, 'addresses', addressId);
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) return { ok: false, error: 'Address not found.' };

    if (cleaned.isDefault) {
      await unsetAllDefaults(uid);
    }
    await updateDoc(ref, { ...cleaned, updatedAt: serverTimestamp() });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not update address. Please try again.' };
  }
}

export async function deleteCustomerAddress(uid: string, addressId: string): Promise<{ ok: boolean; error?: string }> {
  const ref = doc(db, COLLECTIONS.CUSTOMER_ADDRESSES, uid, 'addresses', addressId);
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) return { ok: false, error: 'Address not found.' };
    await deleteDoc(ref);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not delete address. Please try again.' };
  }
}

export async function setDefaultCustomerAddress(uid: string, addressId: string): Promise<{ ok: boolean; error?: string }> {
  const ref = doc(db, COLLECTIONS.CUSTOMER_ADDRESSES, uid, 'addresses', addressId);
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) return { ok: false, error: 'Address not found.' };
    await unsetAllDefaults(uid);
    await updateDoc(ref, { isDefault: true, updatedAt: serverTimestamp() });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not set default address. Please try again.' };
  }
}