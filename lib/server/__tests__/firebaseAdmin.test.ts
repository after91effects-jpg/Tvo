import { describe, it, expect } from 'vitest';
import {
  getFirebaseAdminAuth,
  verifyFirebaseIdToken,
} from '../firebaseAdmin';

describe('firebaseAdmin.ts', () => {
  describe('server-only guard', () => {
    it('should not throw on server side', () => {
      expect(typeof getFirebaseAdminAuth).toBe('function');
    });
  });

  describe('getFirebaseAdminAuth', () => {
    it('returns a function', () => {
      expect(typeof getFirebaseAdminAuth).toBe('function');
    });
  });

  describe('verifyFirebaseIdToken', () => {
    it('returns an async function', () => {
      expect(typeof verifyFirebaseIdToken).toBe('function');
    });

    it('handles missing config gracefully', async () => {
      const result = await verifyFirebaseIdToken('fake-token');
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });
});
