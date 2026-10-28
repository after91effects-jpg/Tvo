import { describe, expect, it } from 'vitest';
import { canAccessAdminRequest } from '../admin-access';
import { hasPerm } from '../authorization';

describe('Admin section permissions', () => {
  it('keeps specialist roles in their own domains', () => {
    expect(canAccessAdminRequest('festival_manager', 'POST', 'occasions', 'save')).toBe(true);
    expect(canAccessAdminRequest('festival_manager', 'POST', 'orders', 'update_status')).toBe(false);
    expect(canAccessAdminRequest('marketing_manager', 'POST', 'occasions', 'save')).toBe(false);
    expect(canAccessAdminRequest('customer_support', 'GET', 'reviews')).toBe(true);
    expect(canAccessAdminRequest('catalog_manager', 'POST', 'reviews', 'moderate')).toBe(false);
    expect(hasPerm({ uid: 'test', name: 'test', email: 'test@example.com', role: 'media_manager' }, 'refund_payments')).toBe(false);
  });
  it('allows operation-specific access without granting unrelated settings access', () => {
    expect(canAccessAdminRequest('kitchen_manager', 'POST', 'orders', 'status')).toBe(true);
    expect(canAccessAdminRequest('kitchen_manager', 'POST', 'orders', 'payment')).toBe(false);
    expect(canAccessAdminRequest('media_manager', 'POST', 'media', 'add')).toBe(true);
    expect(canAccessAdminRequest('media_manager', 'POST', 'settings')).toBe(false);
    expect(canAccessAdminRequest('admin', 'GET', 'settings')).toBe(false);
    expect(canAccessAdminRequest('super_admin', 'POST', 'image_optimization', 'save')).toBe(true);
  });
  it('fails closed for unknown sections', () => {
    expect(canAccessAdminRequest('super_admin', 'POST', 'not_a_section')).toBe(false);
  });
});
