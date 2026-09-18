/**
 * Culinary Recipe Unit Conversion and Cost Calculation Engine
 * TVO Flavours - Step 4: Recipe & Ingredient Management
 */


export const RECIPE_WEIGHT_UNITS = ['mg', 'g', 'kg'] as const;
export const RECIPE_VOLUME_UNITS = ['ml', 'l'] as const;
export const RECIPE_DISCRETE_UNITS = [
  'piece',
  'pack',
  'box',
  'dozen',
  'pair',
  'set',
  'bundle',
  'slice',
  'serving',
  'cup',
  'plate',
  'tray',
  'bottle',
  'jar',
] as const;

export const ALL_RECIPE_UNITS = [
  ...RECIPE_WEIGHT_UNITS,
  ...RECIPE_VOLUME_UNITS,
  ...RECIPE_DISCRETE_UNITS,
] as const;

// Conversion factors to base unit (weight base = g, volume base = ml, discrete base = piece)
const WEIGHT_TO_GRAMS: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
};

const DISCRETE_TO_PIECE: Record<string, number> = {
  piece: 1,
  slice: 1,
  serving: 1,
  dozen: 12,
  pair: 2,
};

/**
 * Normalizes unit string (lowercased, trimmed).
 */
export function normalizeRecipeUnit(unit: string | undefined | null): string {
  if (!unit) return 'g';
  const u = unit.trim().toLowerCase();
  if (u === 'gram' || u === 'grams' || u === 'gm' || u === 'gms') return 'g';
  if (u === 'kilogram' || u === 'kilograms' || u === 'kgs') return 'kg';
  if (u === 'milligram' || u === 'milligrams') return 'mg';
  if (u === 'liter' || u === 'litre' || u === 'liters' || u === 'litres' || u === 'ltr') return 'l';
  if (u === 'milliliter' || u === 'millilitre' || u === 'milliliters' || u === 'millilitres') return 'ml';
  if (u === 'pieces' || u === 'pc' || u === 'pcs') return 'piece';
  if (u === 'dozens' || u === 'doz') return 'dozen';
  return u;
}

/**
 * Converts a quantity from one unit to another if dimensional types are compatible.
 * Returns null if units are dimensionally incompatible (e.g. weight to volume without density).
 */
export function convertRecipeUnit(
  quantity: number,
  fromUnit: string | undefined | null,
  toUnit: string | undefined | null
): number | null {
  if (quantity === 0) return 0;
  if (isNaN(quantity)) return null;

  const from = normalizeRecipeUnit(fromUnit);
  const to = normalizeRecipeUnit(toUnit);

  if (from === to) return quantity;

  // Weight conversion
  if (from in WEIGHT_TO_GRAMS && to in WEIGHT_TO_GRAMS) {
    const inGrams = quantity * WEIGHT_TO_GRAMS[from];
    return inGrams / WEIGHT_TO_GRAMS[to];
  }

  // Volume conversion
  if (from in VOLUME_TO_ML && to in VOLUME_TO_ML) {
    const inMl = quantity * VOLUME_TO_ML[from];
    return inMl / VOLUME_TO_ML[to];
  }

  // Discrete conversion
  if (from in DISCRETE_TO_PIECE && to in DISCRETE_TO_PIECE) {
    const inPieces = quantity * DISCRETE_TO_PIECE[from];
    return inPieces / DISCRETE_TO_PIECE[to];
  }

  // Incompatible dimensions
  return null;
}

export interface LineCostCalculationInput {
  recipeQuantity: number;
  recipeUnit: string;
  ingredientUnit: string;
  costPerUnit: number | null | undefined;
}

export interface LineCostResult {
  lineCost: number;
  convertedQuantity: number;
  conversionSuccess: boolean;
  costUnitUsed: string;
}

/**
 * Computes cost for a single recipe ingredient item.
 * If units cannot be converted directly, assumes 1:1 or fallback to recipeQuantity with a warning flag.
 */
export function calculateLineCost(input: LineCostCalculationInput): LineCostResult {
  const { recipeQuantity, recipeUnit, ingredientUnit, costPerUnit } = input;
  const cost = Number(costPerUnit) || 0;

  if (!recipeQuantity || recipeQuantity <= 0 || cost <= 0) {
    return {
      lineCost: 0,
      convertedQuantity: recipeQuantity || 0,
      conversionSuccess: true,
      costUnitUsed: ingredientUnit,
    };
  }

  const converted = convertRecipeUnit(recipeQuantity, recipeUnit, ingredientUnit);
  if (converted !== null) {
    const rawCost = converted * cost;
    return {
      lineCost: Math.round(rawCost * 100) / 100,
      convertedQuantity: Math.round(converted * 10000) / 10000,
      conversionSuccess: true,
      costUnitUsed: ingredientUnit,
    };
  }

  // Fallback if dimensional mismatch (e.g. 1 piece costing X)
  const rawCost = recipeQuantity * cost;
  return {
    lineCost: Math.round(rawCost * 100) / 100,
    convertedQuantity: recipeQuantity,
    conversionSuccess: false,
    costUnitUsed: ingredientUnit,
  };
}

export interface RecipeCostSummary {
  totalCost: number;
  foodCostPercent: number | null;
  itemsCount: number;
}

/**
 * Calculates total recipe cost and food cost % relative to base selling price.
 */
export function calculateRecipeTotalCost(
  lineCosts: number[],
  basePrice?: number | null
): RecipeCostSummary {
  const totalCost = lineCosts.reduce((acc, c) => acc + (Number(c) || 0), 0);
  const roundedTotal = Math.round(totalCost * 100) / 100;

  let foodCostPercent: number | null = null;
  const price = Number(basePrice);
  if (price && price > 0) {
    foodCostPercent = Math.round((roundedTotal / price) * 1000) / 10; // e.g. 28.5%
  }

  return {
    totalCost: roundedTotal,
    foodCostPercent,
    itemsCount: lineCosts.length,
  };
}
