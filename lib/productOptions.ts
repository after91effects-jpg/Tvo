import type { WeightOption } from './types';
import { getSellingUnitLabel, isPieceOrDiscreteUnit } from './sellingUnit';

/** Use the same purchase options on listings, related cards and product pages. */
export function getProductOptions(product: {
  weightOptions?: unknown;
  sellingUnit?: unknown;
  price?: number;
  regularPrice?: number;
  weightKg?: number;
}): WeightOption[] {
  type LegacyOption = WeightOption & { value?: string; weight_kg?: number };
  const raw = product.weightOptions as LegacyOption[] | { options?: LegacyOption[] } | undefined;
  const options = Array.isArray(raw) ? raw : Array.isArray(raw?.options) ? raw.options : [];
  const discrete = isPieceOrDiscreteUnit(product.sellingUnit);
  const unit = getSellingUnitLabel(product.sellingUnit);
  const weight = discrete ? 0 : Number(product.weightKg) || 1;
  const label = discrete ? `1 ${unit}` : `${weight} ${unit}`;
  const basePrice = Number(product.price ?? product.regularPrice ?? 0);
  return (options.length ? options : [{ label, weightKg: weight, price: basePrice, mrp: product.regularPrice }]).map(option => ({
    ...option,
    label: option.label || ('value' in option ? option.value : '') || label,
    weightKg: Number(option.weightKg ?? ('weight_kg' in option ? option.weight_kg : undefined) ?? (discrete ? 0 : parseFloat(option.label) || weight)),
    price: Number(option.price ?? basePrice),
    mrp: Number(option.mrp ?? product.regularPrice ?? basePrice),
  }));
}
