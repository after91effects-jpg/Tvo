import { describe, it, expect } from 'vitest';
import {
  PREDEFINED_SELLING_UNITS,
  normalizeSellingUnit,
  getSellingUnitLabel,
  isWeightSellingUnit,
  isPieceOrDiscreteUnit,
  validateSellingUnitInput,
  serializeSellingUnit,
} from '../sellingUnit';

describe('Selling Unit System', () => {
  describe('A. Predefined unit: kg', () => {
    it('normalizes string "kg" to predefined structured unit', () => {
      const res = normalizeSellingUnit('kg');
      expect(res).toEqual({ type: 'predefined', value: 'kg' });
      expect(getSellingUnitLabel(res)).toBe('kg');
      expect(isWeightSellingUnit(res)).toBe(true);
      expect(isPieceOrDiscreteUnit(res)).toBe(false);
    });

    it('validates "kg" successfully', () => {
      const v = validateSellingUnitInput('kg');
      expect(v.valid).toBe(true);
      expect(v.unit).toEqual({ type: 'predefined', value: 'kg' });
    });

    it('serializes "kg" to JSON string', () => {
      const s = serializeSellingUnit({ type: 'predefined', value: 'kg' });
      expect(s).toBe(JSON.stringify({ type: 'predefined', value: 'kg' }));
    });
  });

  describe('B. Another predefined unit: piece', () => {
    it('normalizes string "piece" to predefined structured unit', () => {
      const res = normalizeSellingUnit('piece');
      expect(res).toEqual({ type: 'predefined', value: 'piece' });
      expect(getSellingUnitLabel(res)).toBe('piece');
      expect(isWeightSellingUnit(res)).toBe(false);
      expect(isPieceOrDiscreteUnit(res)).toBe(true);
    });

    it('validates "piece" successfully', () => {
      const v = validateSellingUnitInput({ type: 'predefined', value: 'piece' });
      expect(v.valid).toBe(true);
      expect(v.unit).toEqual({ type: 'predefined', value: 'piece' });
    });

    it('verifies all 19 predefined units are recognized', () => {
      expect(PREDEFINED_SELLING_UNITS).toHaveLength(19);
      for (const unit of PREDEFINED_SELLING_UNITS) {
        const v = validateSellingUnitInput(unit);
        expect(v.valid).toBe(true);
        expect(v.unit?.value).toBe(unit);
      }
    });
  });

  describe('C. Custom unit: platter', () => {
    it('normalizes custom unit object', () => {
      const res = normalizeSellingUnit({ type: 'custom', value: 'platter' });
      expect(res).toEqual({ type: 'custom', value: 'platter' });
      expect(getSellingUnitLabel(res)).toBe('platter');
      expect(isWeightSellingUnit(res)).toBe(false);
      expect(isPieceOrDiscreteUnit(res)).toBe(true);
    });

    it('validates custom unit "platter"', () => {
      const v = validateSellingUnitInput({ type: 'custom', value: 'platter' });
      expect(v.valid).toBe(true);
      expect(v.unit).toEqual({ type: 'custom', value: 'platter' });
    });

    it('serializes custom unit to JSON string', () => {
      const s = serializeSellingUnit({ type: 'custom', value: 'platter' });
      expect(s).toBe(JSON.stringify({ type: 'custom', value: 'platter' }));
      const roundtrip = normalizeSellingUnit(s);
      expect(roundtrip).toEqual({ type: 'custom', value: 'platter' });
    });
  });

  describe('D. Missing / legacy unit', () => {
    it('handles legacy "weight" and maps to predefined "kg"', () => {
      const res = normalizeSellingUnit('weight');
      expect(res).toEqual({ type: 'predefined', value: 'kg' });
      expect(getSellingUnitLabel('weight')).toBe('kg');
      expect(isWeightSellingUnit('weight')).toBe(true);
    });

    it('handles null / undefined / empty and defaults safely to "kg"', () => {
      expect(normalizeSellingUnit(null)).toEqual({ type: 'predefined', value: 'kg' });
      expect(normalizeSellingUnit(undefined)).toEqual({ type: 'predefined', value: 'kg' });
      expect(normalizeSellingUnit('')).toEqual({ type: 'predefined', value: 'kg' });
      expect(getSellingUnitLabel(null)).toBe('kg');
      expect(getSellingUnitLabel(undefined)).toBe('kg');
    });

    it('handles serialized JSON with legacy weight value', () => {
      const jsonStr = JSON.stringify({ type: 'predefined', value: 'weight' });
      const res = normalizeSellingUnit(jsonStr);
      expect(res).toEqual({ type: 'predefined', value: 'kg' });
    });
  });

  describe('E. Invalid unit', () => {
    it('rejects invalid predefined unit', () => {
      const v = validateSellingUnitInput({ type: 'predefined', value: 'car' });
      expect(v.valid).toBe(false);
      expect(v.error).toContain('Invalid selling unit');
    });

    it('rejects null or empty input on validation', () => {
      expect(validateSellingUnitInput(null).valid).toBe(false);
      expect(validateSellingUnitInput('').valid).toBe(false);
    });

    it('rejects custom unit with script/HTML injection', () => {
      const v = validateSellingUnitInput({ type: 'custom', value: '<script>alert(1)</script>' });
      expect(v.valid).toBe(false);
      expect(v.error).toContain('invalid characters');
    });

    it('rejects excessively long custom units', () => {
      const longName = 'a'.repeat(35);
      const v = validateSellingUnitInput({ type: 'custom', value: longName });
      expect(v.valid).toBe(false);
      expect(v.error).toContain('30 characters or fewer');
    });
  });

  describe('F. Empty custom unit', () => {
    it('rejects empty string in custom unit value', () => {
      const v = validateSellingUnitInput({ type: 'custom', value: '' });
      expect(v.valid).toBe(false);
      expect(v.error).toBe('Custom selling unit cannot be empty');
    });

    it('rejects whitespace-only custom unit value', () => {
      const v = validateSellingUnitInput({ type: 'custom', value: '   ' });
      expect(v.valid).toBe(false);
      expect(v.error).toBe('Custom selling unit cannot be empty');
    });
  });
});
