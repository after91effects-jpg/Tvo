import { describe, it, expect } from 'vitest';
import { err, ok, sanitizeError, requestId, withRequestId } from '../api';

describe('api.ts', () => {
  describe('err', () => {
    it('should return custom message for 4xx status', () => {
      const res = err('Bad request', 400);
      expect(res.status).toBe(400);
      expect(res).toBeInstanceOf(Response);
    });

    it('should sanitize message for 500 status', () => {
      const res = err('Database connection failed', 500);
      expect(res.status).toBe(500);
      expect(res).toBeInstanceOf(Response);
    });

    it('should use generic message for 500 errors', () => {
      const res = err('Any internal error message here', 500);
      expect(res.status).toBe(500);
    });

    it('should not expose sensitive internal details in 500 response', () => {
      const sensitiveMessages = [
        'SQLITE_CANNOT_OPEN_DB',
        'ECONNREFUSED',
        'password_hash',
        'JWT_SECRET',
        'PRIVATE_KEY',
        '/data/tvoflavours.db',
        'firebase-adminsdk',
      ];
      for (const msg of sensitiveMessages) {
        const res = err(msg, 500);
        expect(res.status).toBe(500);
      }
    });
  });

  describe('sanitizeError', () => {
    it('should return error message for Error instances', () => {
      const e = new Error('test error');
      expect(sanitizeError(e)).toBe('test error');
    });

    it('should return string for string input', () => {
      expect(sanitizeError('string error')).toBe('string error');
    });

    it('should return string for non-Error objects', () => {
      expect(sanitizeError(42)).toBe('42');
    });
  });

  describe('requestId', () => {
    it('should return a string', () => {
      const id = requestId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should return unique IDs', () => {
      const id1 = requestId();
      const id2 = requestId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('withRequestId', () => {
    it('should set X-Request-ID header', () => {
      const res = ok({ test: true });
      const withId = withRequestId(res, 'test-uuid-123');
      expect(withId.headers.get('X-Request-ID')).toBe('test-uuid-123');
    });
  });
});
