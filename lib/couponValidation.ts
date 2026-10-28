import type { PromoCode } from './types';

export async function validateCartCoupon(code: string, subtotal: number): Promise<PromoCode> {
  const query = new URLSearchParams({ code: code.trim().toUpperCase(), subtotal: String(subtotal) });
  const response = await fetch(`/api/coupons?${query}`);
  const result = await response.json();
  if (!response.ok || !result.valid) {
    throw new Error(result.message || result.error || 'Unable to validate coupon. Please try again.');
  }
  return {
    code: result.code,
    discountType: result.discount_type,
    discountValue: Number(result.discount_value),
    minOrderValue: Number(result.min_order || 0),
    maxDiscount: Number(result.max_discount || 0),
    active: true,
    expiresAt: '',
    description: '',
  };
}
