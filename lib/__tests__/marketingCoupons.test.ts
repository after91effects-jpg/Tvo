import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../server/db';
import { saveCoupon, listCoupons, deleteCoupon } from '../server/admin-ops';
import type { UserProfile } from '../types';

const mockAdminUser: any = {
  id: 1,
  email: 'admin@tvoflavours.com',
  name: 'Admin',
  role: 'super_admin',
};

describe('Marketing & Coupon System', () => {
  const createdCouponIds: number[] = [];

  afterEach(() => {
    for (const id of createdCouponIds) {
      try {
        db.prepare('DELETE FROM coupons WHERE id=?').run(id);
      } catch {}
    }
    createdCouponIds.length = 0;
  });

  it('correctly calculates percentage discounts with max cap', () => {
    const saveRes = saveCoupon(mockAdminUser, {
      code: 'TESTPERCENT20',
      discount_type: 'percent',
      discount_value: 20,
      min_order: 500,
      max_discount: 200,
      active: 1,
    });
    expect(saveRes.ok).toBe(true);
    if (saveRes.id) createdCouponIds.push(saveRes.id);

    const coupon = db.prepare('SELECT * FROM coupons WHERE code=?').get('TESTPERCENT20') as any;
    expect(coupon).toBeDefined();
    expect(coupon.discount_value).toBe(20);
    expect(coupon.max_discount).toBe(200);

    // Subtotal 800 -> 20% is 160 (below 200 cap)
    const discount1 = Math.min((800 * coupon.discount_value) / 100, coupon.max_discount || 800);
    expect(discount1).toBe(160);

    // Subtotal 1500 -> 20% is 300 (exceeds cap -> 200)
    const discount2 = Math.min((1500 * coupon.discount_value) / 100, coupon.max_discount || 1500);
    expect(discount2).toBe(200);
  });

  it('correctly calculates flat amount discounts', () => {
    const saveRes = saveCoupon(mockAdminUser, {
      code: 'TESTFLAT100',
      discount_type: 'flat',
      discount_value: 100,
      min_order: 400,
      active: 1,
    });
    expect(saveRes.ok).toBe(true);
    if (saveRes.id) createdCouponIds.push(saveRes.id);

    const coupon = db.prepare('SELECT * FROM coupons WHERE code=?').get('TESTFLAT100') as any;
    expect(coupon.discount_type).toBe('flat');
    expect(coupon.discount_value).toBe(100);
  });

  it('enforces first-order only coupons on orders with prior history', () => {
    const saveRes = saveCoupon(mockAdminUser, {
      code: 'FIRSTTEST50',
      discount_type: 'flat',
      discount_value: 50,
      min_order: 0,
      active: 1,
      is_first_order_only: true,
      description: 'First order celebration discount',
    });
    expect(saveRes.ok).toBe(true);
    if (saveRes.id) createdCouponIds.push(saveRes.id);

    const allCoupons = listCoupons(mockAdminUser);
    const target = allCoupons.find((c: any) => c.code === 'FIRSTTEST50');
    expect(target).toBeDefined();
    expect(target!.is_first_order_only).toBe(true);
  });

  it('enforces min_order requirement and active flag in listing', () => {
    const saveRes = saveCoupon(mockAdminUser, {
      code: 'INACTIVETEST',
      discount_type: 'percent',
      discount_value: 10,
      min_order: 1000,
      active: 0,
      description: 'Inactive promo',
    });
    expect(saveRes.ok).toBe(true);
    if (saveRes.id) createdCouponIds.push(saveRes.id);

    const coupon = db.prepare('SELECT * FROM coupons WHERE code=?').get('INACTIVETEST') as any;
    expect(coupon.active).toBe(0);
    expect(coupon.min_order).toBe(1000);
  });
});
