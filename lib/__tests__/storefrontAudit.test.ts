import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateCartCoupon } from '../couponValidation';
import { getOrderStatusKey } from '../orderStatus';

afterEach(() => vi.unstubAllGlobals());

describe('Cart coupon validation', () => {
  it('validates the code against the server with the current subtotal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ valid: true, code: 'SALE20', discount_type: 'percent', discount_value: 20, min_order: 1000, max_discount: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const coupon = await validateCartCoupon(' sale20 ', 1500);
    expect(fetchMock).toHaveBeenCalledWith('/api/coupons?code=SALE20&subtotal=1500');
    expect(coupon).toMatchObject({ discountType: 'percent', discountValue: 20, minOrderValue: 1000, maxDiscount: 200 });
  });
  it.each(['This coupon has expired', 'Minimum order of ₹1000 required', 'This coupon is inactive', 'This coupon has reached its usage limit'])('rejects server validation failure: %s', async (message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ valid: false, message })));
    await expect(validateCartCoupon('FIRST15', 500)).rejects.toThrow(message);
  });
  it('does not apply a coupon when the server fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Please try later' }, { status: 503 })));
    await expect(validateCartCoupon('FIRST15', 999)).rejects.toThrow('Please try later');
  });
});

describe('Order tracking status', () => {
  it.each(['Out for Delivery', 'In Transit', 'Dispatched', 'Delivery Fleet'])('keeps %s in transit instead of showing Delivered', (status) => {
    expect(getOrderStatusKey(status)).toBe('out_for_delivery');
  });
  it.each(['Delivered', 'Completed', 'Received'])('recognizes %s as completed', (status) => {
    expect(getOrderStatusKey(status)).toBe('delivered');
  });
  it('preserves cancelled and preparing statuses', () => {
    expect(getOrderStatusKey('Cancelled')).toBe('cancelled');
    expect(getOrderStatusKey('Baking')).toBe('preparing');
  });
});

import { getProductOptions } from '../productOptions';
describe('Consistent product purchase options', () => {
  it('uses stored nested variations for related-product cards', () => {
    const options = [{ label: '0.5 kg', weightKg: 0.5, price: 529, mrp: 599 }, { label: '1 kg', weightKg: 1, price: 949, mrp: 999 }];
    expect(getProductOptions({ weightOptions: { options }, sellingUnit: 'weight', price: 529 })).toEqual(options);
  });
  it('uses identical fallback size and price wherever a product is shown', () => {
    expect(getProductOptions({ price: 999, sellingUnit: 'weight' })[0]).toMatchObject({ label: '1 kg', weightKg: 1, price: 999 });
  });
  it('keeps configured discrete units and zero prices', () => {
    expect(getProductOptions({ price: 0, sellingUnit: { type: 'predefined', value: 'box' } })[0]).toMatchObject({ label: '1 box', weightKg: 0, price: 0 });
  });
});
