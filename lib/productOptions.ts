import { getProductPurchaseProfile, type PurchaseProduct } from './productPurchase';
import type { WeightOption } from './types';
import { getSellingUnitLabel, isPieceOrDiscreteUnit } from './sellingUnit';

/** Use the same purchase options on listings, related cards and product pages. */
export function getProductOptions(product: PurchaseProduct & {
  weightOptions?: unknown;
  sellingUnit?: unknown;
  price?: number;
  regularPrice?: number;
  weightKg?: number;
}): WeightOption[] {
  type LegacyOption = WeightOption & { value?: string; weight_kg?: number };
  const raw = product.weightOptions as LegacyOption[] | { options?: LegacyOption[] } | undefined;
  let options = Array.isArray(raw) ? raw : Array.isArray(raw?.options) ? raw.options : [];
  const profile = getProductPurchaseProfile(product);
  const discrete = isPieceOrDiscreteUnit(profile.sellingUnit);
  const unit = getSellingUnitLabel(profile.sellingUnit);
  if (discrete && !isPieceOrDiscreteUnit(product.sellingUnit)) options = options.filter(option => !/\b(?:kg|gm|grams?)\b|^\d+(?:\.\d+)?\s*g$/i.test(option.label || option.value || ''));
  const weight = discrete ? 0 : Number(product.weightKg) || (product.name ? 0 : 1);
  const label = discrete ? profile.optionLabel : weight ? `${weight} ${unit}` : 'Standard size';
  const basePrice = Number(product.price ?? product.regularPrice ?? 0);
  const seen = new Set<string>();
  return (options.length ? options : [{ label, weightKg: weight, price: basePrice, mrp: product.regularPrice }]).map(option => ({
    ...option,
    label: option.label || ('value' in option ? option.value : '') || label,
    weightKg: Number(option.weightKg ?? ('weight_kg' in option ? option.weight_kg : undefined) ?? (discrete ? 0 : parseWeightKg(option.label) || weight)),
    price: Number(option.price ?? basePrice),
    mrp: Number(option.mrp ?? product.regularPrice ?? basePrice),
  })).filter(option => { const key = `${option.label}:${option.price}`; if (seen.has(key)) return false; seen.add(key); return true; });
}

function parseWeightKg(label = '') {
  const match = label.match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|grams?)\b/i);
  return match ? Number(match[1]) / (match[2].toLowerCase() === 'kg' ? 1 : 1000) : 0;
}
