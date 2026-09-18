/**
 * SKU (Stock Keeping Unit) System Engine
 * TVO Flavours - Step 5: SKU & Catalog Finalization
 */

export const MIN_SKU_LENGTH = 2;
export const MAX_SKU_LENGTH = 32;

// Allowed characters: Uppercase alphanumeric, hyphens, and underscores
export const SKU_REGEX = /^[A-Z0-9_-]+$/;

export const RESERVED_SKUS = new Set([
  'NULL',
  'UNDEFINED',
  'NEW',
  'TEMP',
  'ALL',
  'NONE',
  'ADMIN',
  'TEST',
  'DRAFT',
  'VOID',
  'SYSTEM',
]);

const CATEGORY_CODE_MAP: Record<string, string> = {
  birthday: 'BDAY',
  anniversary: 'ANNIV',
  chocolate: 'CHOC',
  'fruit-cakes': 'FRUIT',
  desserts: 'DESS',
  hampers: 'HAMPER',
  eggless: 'EGGLESS',
  'rakhi-hampers': 'RH',
  'rakhi-kids': 'RK',
  decor: 'DECOR',
  custom: 'CUST',
};

/**
 * Normalizes SKU string:
 * - Trims whitespace
 * - Converts to uppercase
 * - Replaces whitespace and slashes with hyphens
 * - Collapses consecutive hyphens
 */
export function normalizeSku(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s/\\.]+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
}

export interface SkuValidationResult {
  valid: boolean;
  error?: string;
  normalizedSku: string;
}

/**
 * Validates SKU format and constraints.
 */
export function validateSkuFormat(sku: string | undefined | null): SkuValidationResult {
  const normalized = normalizeSku(sku);

  if (!normalized) {
    return { valid: false, error: 'SKU is required', normalizedSku: '' };
  }

  if (normalized.length < MIN_SKU_LENGTH) {
    return {
      valid: false,
      error: `SKU must be at least ${MIN_SKU_LENGTH} characters long`,
      normalizedSku: normalized,
    };
  }

  if (normalized.length > MAX_SKU_LENGTH) {
    return {
      valid: false,
      error: `SKU cannot exceed ${MAX_SKU_LENGTH} characters`,
      normalizedSku: normalized,
    };
  }

  if (!SKU_REGEX.test(normalized)) {
    return {
      valid: false,
      error: 'SKU can only contain uppercase letters, numbers, hyphens, and underscores',
      normalizedSku: normalized,
    };
  }

  if (RESERVED_SKUS.has(normalized)) {
    return {
      valid: false,
      error: `"${normalized}" is a reserved system keyword and cannot be used as a SKU`,
      normalizedSku: normalized,
    };
  }

  return { valid: true, normalizedSku: normalized };
}

/**
 * Generates a clean base acronym or abbreviation from product name.
 * e.g. "Pineapple Cake" -> "PINE" or "PC"
 */
export function getProductAbbreviation(name: string): string {
  const words = name
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'PROD';

  // If single word, take first 4-5 chars
  if (words.length === 1) {
    return words[0].slice(0, 5).toUpperCase();
  }

  // If multi-word, check if we can form a clean 2-4 letter initialism
  // e.g. "Pineapple Cake" -> "PC" or "Choco Truffle Cake" -> "CTC"
  const initials = words.map((w) => w[0].toUpperCase()).join('');
  if (initials.length >= 2 && initials.length <= 5) {
    return initials;
  }

  // Fallback: First word + second word initial
  return `${words[0].slice(0, 4)}-${words[1][0]}`.toUpperCase();
}

/**
 * Suggests a standardized SKU for a product.
 * Format: TVO-[CAT_CODE]-[NAME_ABBR]
 * e.g. "Pineapple Cake" with category "fruit-cakes" -> "TVO-FRUIT-PC"
 */
export function suggestSku(name: string, categorySlug?: string | null): string {
  const catKey = (categorySlug || '').trim().toLowerCase();
  const catCode = CATEGORY_CODE_MAP[catKey] || (catKey ? catKey.slice(0, 4).toUpperCase() : 'TVO');
  const nameAbbr = getProductAbbreviation(name);

  const candidate = `TVO-${catCode}-${nameAbbr}`;
  return normalizeSku(candidate);
}

/**
 * Normalizes weight label for variant SKU suffix:
 * "0.5 Kg" -> "500G"
 * "1 Kg"   -> "1KG"
 * "1.5 Kg" -> "1-5KG"
 * "2 Kg"   -> "2KG"
 * "Pack of 6" -> "6PK"
 */
export function normalizeVariantWeightSuffix(label: string): string {
  const raw = label.trim().toLowerCase();

  // Decimal Kg (e.g. 0.5 kg -> 500G)
  if (raw.includes('0.5') && raw.includes('kg')) return '500G';
  if (raw.includes('0.25') && raw.includes('kg')) return '250G';
  if (raw.includes('0.75') && raw.includes('kg')) return '750G';

  // Whole or float Kg
  const matchKg = raw.match(/([\d.]+)\s*kg/);
  if (matchKg) {
    const num = matchKg[1].replace('.', '-');
    return `${num}KG`.toUpperCase();
  }

  // Grams
  const matchG = raw.match(/(\d+)\s*(?:g|gm|grams)/);
  if (matchG) {
    return `${matchG[1]}G`.toUpperCase();
  }

  // Pieces / Packs
  const matchPk = raw.match(/(?:pack|box|set)\s*of\s*(\d+)/i) || raw.match(/(\d+)\s*(?:pcs?|pieces?)/i);
  if (matchPk) {
    return `${matchPk[1]}PK`.toUpperCase();
  }

  // Fallback clean string
  return normalizeSku(raw).slice(0, 8);
}

/**
 * Suggests a variant-specific SKU based on the base product SKU and the variant weight/size label.
 * e.g. baseSku "PC", label "0.5 Kg" -> "PC-500G"
 * e.g. baseSku "TVO-FRUIT-PC", label "1 Kg" -> "TVO-FRUIT-PC-1KG"
 */
export function suggestVariantSku(baseSku: string, variantLabel: string): string {
  const cleanBase = normalizeSku(baseSku);
  const suffix = normalizeVariantWeightSuffix(variantLabel);
  if (!cleanBase) return suffix;
  if (!suffix) return cleanBase;
  return `${cleanBase}-${suffix}`;
}
