/**
 * Reusable Selling Unit System for TVO Flavours
 * Supports predefined culinary units and validated custom units.
 */

export const PREDEFINED_SELLING_UNITS = [
  'mg',
  'g',
  'kg',
  'ml',
  'l',
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

export type PredefinedSellingUnit = (typeof PREDEFINED_SELLING_UNITS)[number];

export interface StructuredSellingUnit {
  type: 'predefined' | 'custom';
  value: string;
}

/**
 * Normalizes any selling unit input (legacy string, JSON string, or structured object)
 * into a consistent StructuredSellingUnit.
 */
export function normalizeSellingUnit(raw: any): StructuredSellingUnit {
  if (!raw) {
    return { type: 'predefined', value: 'kg' };
  }

  // If already a structured object
  if (typeof raw === 'object' && raw !== null && typeof raw.value === 'string') {
    const val = raw.value.trim().toLowerCase();
    if (raw.type === 'custom' || (!PREDEFINED_SELLING_UNITS.includes(val as PredefinedSellingUnit) && val !== 'weight')) {
      return { type: 'custom', value: raw.value.trim() };
    }
    if (val === 'weight') {
      return { type: 'predefined', value: 'kg' };
    }
    return { type: 'predefined', value: val };
  }

  // If string, check if it is JSON
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed.value === 'string') {
          return normalizeSellingUnit(parsed);
        }
      } catch {
        // Fallback to plain string handling below
      }
    }

    const lower = trimmed.toLowerCase();
    // Legacy mappings
    if (lower === 'weight') {
      return { type: 'predefined', value: 'kg' };
    }
    if (PREDEFINED_SELLING_UNITS.includes(lower as PredefinedSellingUnit)) {
      return { type: 'predefined', value: lower };
    }
    if (trimmed.length > 0) {
      return { type: 'custom', value: trimmed };
    }
  }

  return { type: 'predefined', value: 'kg' };
}

/**
 * Returns the human-readable unit label (e.g. "kg", "piece", "platter").
 */
export function getSellingUnitLabel(raw: any): string {
  if (!raw) return 'kg';
  if (typeof raw === 'string') {
    const normalized = normalizeSellingUnit(raw);
    return normalized.value;
  }
  if (typeof raw === 'object' && raw.value) {
    return String(raw.value);
  }
  return 'kg';
}

/**
 * Checks if a selling unit is measured primarily by weight (kg, g, mg).
 */
export function isWeightSellingUnit(raw: any): boolean {
  const val = getSellingUnitLabel(raw).toLowerCase();
  return val === 'kg' || val === 'g' || val === 'mg' || val === 'weight';
}

/**
 * Checks if a selling unit is discrete/piece-like (e.g. piece, pack, box, slice, platter).
 */
export function isPieceOrDiscreteUnit(raw: any): boolean {
  return !isWeightSellingUnit(raw);
}

/**
 * Server/client validation for Selling Unit inputs.
 */
export function validateSellingUnitInput(input: any): {
  valid: boolean;
  error?: string;
  unit?: StructuredSellingUnit;
} {
  if (!input) {
    return { valid: false, error: 'Selling unit is required' };
  }

  let type: 'predefined' | 'custom' = 'predefined';
  let value = '';

  if (typeof input === 'object' && input !== null) {
    type = input.type === 'custom' ? 'custom' : 'predefined';
    value = typeof input.value === 'string' ? input.value.trim() : '';
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return validateSellingUnitInput(parsed);
      } catch {
        return { valid: false, error: 'Malformed selling unit JSON' };
      }
    }
    const lower = trimmed.toLowerCase();
    if (lower === 'weight') {
      return { valid: true, unit: { type: 'predefined', value: 'kg' } };
    }
    if (PREDEFINED_SELLING_UNITS.includes(lower as PredefinedSellingUnit)) {
      return { valid: true, unit: { type: 'predefined', value: lower } };
    }
    type = 'custom';
    value = trimmed;
  }

  if (type === 'custom') {
    if (!value) {
      return { valid: false, error: 'Custom selling unit cannot be empty' };
    }
    if (value.length > 30) {
      return { valid: false, error: 'Custom selling unit must be 30 characters or fewer' };
    }
    if (/[<>{}]/.test(value)) {
      return { valid: false, error: 'Custom selling unit contains invalid characters' };
    }
    return { valid: true, unit: { type: 'custom', value } };
  }

  // Predefined
  const lowerVal = value.toLowerCase() as PredefinedSellingUnit;
  if (!PREDEFINED_SELLING_UNITS.includes(lowerVal)) {
    return { valid: false, error: `Invalid selling unit "${value}". Allowed: ${PREDEFINED_SELLING_UNITS.join(', ')}` };
  }

  return { valid: true, unit: { type: 'predefined', value: lowerVal } };
}

/**
 * Serializes a selling unit into JSON string for SQLite storage.
 */
export function serializeSellingUnit(input: any): string {
  const result = validateSellingUnitInput(input);
  if (result.valid && result.unit) {
    return JSON.stringify(result.unit);
  }
  return JSON.stringify({ type: 'predefined', value: 'kg' });
}
