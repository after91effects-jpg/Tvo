import { describe, it, expect } from 'vitest';
import {
  normalizeRecipeUnit,
  convertRecipeUnit,
  calculateLineCost,
  calculateRecipeTotalCost,
} from '../recipeUnits';

describe('Recipe Units & Cost Calculation Engine', () => {
  describe('A. Unit Normalization', () => {
    it('normalizes common aliases to standard units', () => {
      expect(normalizeRecipeUnit('grams')).toBe('g');
      expect(normalizeRecipeUnit('GM')).toBe('g');
      expect(normalizeRecipeUnit('kilogram')).toBe('kg');
      expect(normalizeRecipeUnit('kgs')).toBe('kg');
      expect(normalizeRecipeUnit('milliliters')).toBe('ml');
      expect(normalizeRecipeUnit('ltr')).toBe('l');
      expect(normalizeRecipeUnit('pcs')).toBe('piece');
      expect(normalizeRecipeUnit('doz')).toBe('dozen');
    });

    it('handles undefined or null safely', () => {
      expect(normalizeRecipeUnit(undefined)).toBe('g');
      expect(normalizeRecipeUnit(null)).toBe('g');
      expect(normalizeRecipeUnit('')).toBe('g');
    });
  });

  describe('B. Unit Conversions', () => {
    it('converts weight units accurately', () => {
      // 250 g to kg => 0.25 kg
      expect(convertRecipeUnit(250, 'g', 'kg')).toBe(0.25);
      // 0.5 kg to g => 500 g
      expect(convertRecipeUnit(0.5, 'kg', 'g')).toBe(500);
      // 1000 mg to g => 1 g
      expect(convertRecipeUnit(1000, 'mg', 'g')).toBe(1);
    });

    it('converts volume units accurately', () => {
      // 250 ml to l => 0.25 l
      expect(convertRecipeUnit(250, 'ml', 'l')).toBe(0.25);
      // 1.5 l to ml => 1500 ml
      expect(convertRecipeUnit(1.5, 'l', 'ml')).toBe(1500);
    });

    it('converts discrete units accurately', () => {
      // 1 dozen to pieces => 12
      expect(convertRecipeUnit(1, 'dozen', 'piece')).toBe(12);
      // 6 pieces to dozen => 0.5
      expect(convertRecipeUnit(6, 'piece', 'dozen')).toBe(0.5);
    });

    it('returns null for incompatible dimensions', () => {
      // weight to volume without density
      expect(convertRecipeUnit(250, 'g', 'ml')).toBeNull();
      expect(convertRecipeUnit(1, 'piece', 'kg')).toBeNull();
    });

    it('handles zero quantity', () => {
      expect(convertRecipeUnit(0, 'g', 'kg')).toBe(0);
    });
  });

  describe('C. Line Item Cost Calculation', () => {
    it('calculates cost when recipe unit matches ingredient unit', () => {
      // 2 pieces at ₹15 per piece => ₹30
      const result = calculateLineCost({
        recipeQuantity: 2,
        recipeUnit: 'piece',
        ingredientUnit: 'piece',
        costPerUnit: 15,
      });
      expect(result.lineCost).toBe(30);
      expect(result.conversionSuccess).toBe(true);
    });

    it('calculates cost with unit conversion (e.g. 250g of flour with cost ₹60/kg)', () => {
      // 250 g / 1000 = 0.25 kg * ₹60 = ₹15.00
      const result = calculateLineCost({
        recipeQuantity: 250,
        recipeUnit: 'g',
        ingredientUnit: 'kg',
        costPerUnit: 60,
      });
      expect(result.lineCost).toBe(15);
      expect(result.convertedQuantity).toBe(0.25);
      expect(result.conversionSuccess).toBe(true);
    });

    it('handles dark chocolate (150g at ₹1,050/kg)', () => {
      // 150 g / 1000 = 0.15 kg * 1050 = ₹157.50
      const result = calculateLineCost({
        recipeQuantity: 150,
        recipeUnit: 'g',
        ingredientUnit: 'kg',
        costPerUnit: 1050,
      });
      expect(result.lineCost).toBe(157.5);
      expect(result.convertedQuantity).toBe(0.15);
    });

    it('handles zero or missing cost gracefully', () => {
      const result = calculateLineCost({
        recipeQuantity: 100,
        recipeUnit: 'g',
        ingredientUnit: 'kg',
        costPerUnit: null,
      });
      expect(result.lineCost).toBe(0);
    });
  });

  describe('D. Total Recipe Cost and Food Cost %', () => {
    it('calculates total recipe cost and food cost % correctly', () => {
      // Flour ₹15 + Cocoa ₹35 + Butter ₹48 + Cream ₹36 = ₹134
      // Base selling price ₹699 => 134 / 699 * 100 = 19.2%
      const summary = calculateRecipeTotalCost([15, 35, 48, 36], 699);
      expect(summary.totalCost).toBe(134);
      expect(summary.foodCostPercent).toBe(19.2);
      expect(summary.itemsCount).toBe(4);
    });

    it('handles empty or zero price products', () => {
      const summary = calculateRecipeTotalCost([], 0);
      expect(summary.totalCost).toBe(0);
      expect(summary.foodCostPercent).toBeNull();
      expect(summary.itemsCount).toBe(0);
    });
  });
});
