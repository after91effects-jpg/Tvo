import { normalizeSellingUnit } from './sellingUnit';

export type PurchaseKind = 'weight' | 'piece' | 'pack' | 'set' | 'hamper' | 'quantity';
export type PurchaseProduct = {
  name?: string; slug?: string; category?: string; category_slug?: string;
  shortDescription?: string; short_description?: string; description?: string;
  sellingUnit?: unknown; selling_unit?: unknown; isCustomHamper?: boolean;
};
/** Shared catalog policy. Specific item evidence takes precedence over imported kg/category defaults. */
export function getProductPurchaseProfile(product: PurchaseProduct = {}) {
  const name = `${product.name || ''} ${product.slug || ''}`.toLowerCase().replace(/-/g, ' ');
  const intro = `${product.shortDescription || product.short_description || ''} ${(product.description || '').slice(0, 700)}`.toLowerCase();
  const stored = normalizeSellingUnit(product.sellingUnit ?? product.selling_unit);
  let kind: PurchaseKind; let unit = stored.value; let label = '';
  const hamperName = /\bhamper\b/.test(name);
  const cake = /\bcake\b/.test(name) && !/\bdry cake\b/.test(name);
  if (product.isCustomHamper || hamperName || /rakhi.*with.*(?:treats|laddoo|sweets)/.test(name)) { kind = 'hamper'; unit = 'box'; label = '1 hamper'; }
  else if (/\bcandle|\bidols?\b|\brakhi|\brakhis\b/.test(name) && !/\bbox\b|\bwith\b.*\b(treats|sweets|laddoo)\b/.test(name)) {
    const count = name.match(/(?:set\s*(?:of)?\s*\(?)(\d+)/i);
    if (/\bidols?\b|bhai.*bhabhi/.test(name)) { kind = 'set'; unit = 'pair'; label = '1 pair'; }
    else if (count) { kind = 'set'; unit = 'set'; label = `Set of ${count[1]}`; }
    else { kind = 'piece'; unit = 'piece'; label = '1 piece'; }
  }
  else if (['piece','slice','serving'].includes(stored.value) || /\bpastry\b|\bslice\b|\bmousse\b/.test(name)) { kind = 'piece'; unit = stored.value === 'slice' ? 'slice' : 'piece'; }
  else if (cake) { kind = 'weight'; unit = 'kg'; }
  else if (/\b\d+(?:\.\d+)?\s*(?:g|gm|grams?|kg)\b/.test(name) || /\bclassic besan ladoo\b/.test(name)) {
    kind = 'pack'; unit = 'pack';
    const size = name.match(/\b(\d+(?:\.\d+)?)\s*(g|gm|grams?|kg)\b/);
    label = size ? `${size[1]} ${size[2] === 'kg' ? 'kg' : 'g'} pack` : '1 pack';
  }
  else if (/\bbox\b|\bcollection\b|\bgift (set|tray)\b|\bchocolate feast\b/.test(name) || /products inside (?:the |this )?hamper|rakhi hamper|gift hamper/.test(intro)) { kind = 'hamper'; unit = 'box'; label = '1 hamper'; }
  else if (['kg','g','mg'].includes(unit)) { kind = 'weight'; }
  else { kind = ['pack','box','jar','bottle'].includes(unit) ? 'pack' : ['set','pair','dozen','bundle'].includes(unit) ? 'set' : 'quantity'; }
  return {
    kind, sellingUnit: { type: stored.type === 'custom' && unit === stored.value ? 'custom' as const : 'predefined' as const, value: unit },
    optionLabel: label || `1 ${unit}`,
    selectorLabel: kind === 'weight' ? 'Select Weight' : kind === 'piece' ? 'Select Pieces' : kind === 'pack' ? 'Select Pack' : kind === 'set' ? (unit === 'pair' ? 'Select Pair' : 'Select Set') : kind === 'hamper' ? 'Hamper' : 'Select Quantity',
    isHamper: kind === 'hamper',
    isCake: cake && kind === 'weight',
    allowCakeCustomization: cake && kind === 'weight' || kind === 'piece' && /pastry|cake|slice|mousse/.test(name),
  };
}

/** Inventory counts pieces only for piece-priced items; a set/pack is one saleable unit. */
export function stockUnitsPerOption(product: PurchaseProduct, label = '') {
  if (getProductPurchaseProfile(product).kind !== 'piece') return 1;
  const match = label.match(/(\d+)\s*(?:pieces?|pcs?|pc\b)/i);
  return match ? Math.max(1, Number(match[1])) : 1;
}
