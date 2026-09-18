import { db } from './db';
import { HamperSettings, HamperOrderDetails, HamperComponentItem, Product } from '../types';
import { DEFAULT_HAMPER_SETTINGS } from '../seedData';
import { jsonParseSafe } from './api';
import { OrderInputError } from './order-engine';

/**
 * Retrieves the live hamper settings from the database,
 * falling back safely to DEFAULT_HAMPER_SETTINGS if not yet configured.
 */
export function getHamperSettings(): HamperSettings {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key='hamper_settings'").get() as any;
    if (!row || !row.value) return DEFAULT_HAMPER_SETTINGS;
    const parsed = jsonParseSafe(row.value, null);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_HAMPER_SETTINGS;

    // Merge with defaults to ensure complete schema integrity
    return {
      ...DEFAULT_HAMPER_SETTINGS,
      ...parsed,
      banner: { ...DEFAULT_HAMPER_SETTINGS.banner, ...(parsed.banner || {}) },
      boxes: (Array.isArray(parsed.boxes) && parsed.boxes.length ? parsed.boxes : DEFAULT_HAMPER_SETTINGS.boxes),
      categories: (Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : DEFAULT_HAMPER_SETTINGS.categories),
      wrappings: (Array.isArray(parsed.wrappings) && parsed.wrappings.length ? parsed.wrappings : DEFAULT_HAMPER_SETTINGS.wrappings),
      themes: (Array.isArray(parsed.themes) && parsed.themes.length ? parsed.themes : DEFAULT_HAMPER_SETTINGS.themes),
    };
  } catch {
    return DEFAULT_HAMPER_SETTINGS;
  }
}

/**
 * Validates and saves hamper settings to the database.
 */
export function saveHamperSettings(settings: HamperSettings): HamperSettings {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Invalid hamper settings format');
  }
  if (!Array.isArray(settings.boxes) || settings.boxes.length === 0) {
    throw new Error('At least one hamper box option must exist');
  }
  const enabledBoxes = settings.boxes.filter((b) => b && b.enabled);
  if (enabledBoxes.length === 0) {
    throw new Error('At least one hamper box option must be enabled');
  }

  const json = JSON.stringify(settings);
  db.prepare("INSERT INTO settings (key, value) VALUES ('hamper_settings', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(json);
  return settings;
}

export interface ValidatedCustomHamper {
  unitPrice: number;
  boxPrice: number;
  wrappingPrice: number;
  box: { id: string; name: string; price: number; maxItems: number };
  wrapping?: { id: string; name: string; price: number };
  theme?: { id: string; name: string };
  recipientName?: string;
  giftMessage?: string;
  photoUploads?: string[];
  components: HamperComponentItem[];
  componentDeductions: Array<{ productId: number; deductQty: number; name: string }>;
  snapshotSku: string;
  snapshotName: string;
}

/**
 * Authoritatively validates a custom hamper line item against database product records
 * and configured hamper settings.
 * Calculates true composite price: boxPrice + wrappingPrice + sum(component.sale_price * qty)
 */
export function validateCustomHamperOrder(item: any, settings?: HamperSettings): ValidatedCustomHamper {
  const currentSettings = settings || getHamperSettings();
  const details = item.hamperDetails || {};

  // 1. Identify and validate box
  const boxId = String(details.boxId || item.boxId || 'classic').toLowerCase();
  const box = currentSettings.boxes.find((b) => b.id.toLowerCase() === boxId);
  if (!box || !box.enabled) {
    throw new OrderInputError(`Selected hamper box (${boxId}) is unavailable`);
  }
  const boxPrice = Number.isFinite(box.price) && box.price >= 0 ? Number(box.price) : 0;
  const maxCapacity = Number(box.maxItems) || 5;

  // 2. Extract and validate components
  const rawComponents = Array.isArray(details.components) && details.components.length > 0
    ? details.components
    : Array.isArray(details.items) && details.items.length > 0
      ? details.items
      : Array.isArray(item.components)
        ? item.components
        : [];

  if (rawComponents.length === 0) {
    throw new OrderInputError(`A custom hamper must contain at least ${currentSettings.minItemsRequired || 1} item(s)`);
  }

  let totalItemsCount = 0;
  const validatedComponents: HamperComponentItem[] = [];
  const componentDeductions: Array<{ productId: number; deductQty: number; name: string }> = [];
  let componentsPriceTotal = 0;

  for (const comp of rawComponents) {
    const rawId = comp.productId ?? comp.id;
    const prodId = Number(rawId);
    if (!Number.isFinite(prodId) || prodId <= 0) {
      throw new OrderInputError(`Invalid component product in hamper: ${comp.name || rawId}`);
    }

    const prod = db.prepare(
      'SELECT id, name, sku, stock, stock_status, sale_price, regular_price, manage_stock, enable_stock, published, deleted_at FROM products WHERE id=?'
    ).get(prodId) as any;

    if (!prod || prod.deleted_at !== null || prod.published === 0) {
      throw new OrderInputError(`Component "${comp.name || ('Product #' + prodId)}" is no longer available in the bakery`);
    }

    const qty = Number(comp.quantity || comp.qty || 1);
    if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) {
      throw new OrderInputError(`Invalid quantity for component "${prod.name}"`);
    }

    totalItemsCount += qty;

    // Check component stock if stock management is enabled
    const manageStock = prod.manage_stock !== 0 && prod.enable_stock !== 0;
    const orderQty = Number(item.qty || item.quantity || 1);
    const neededStock = qty * orderQty;

    if (manageStock) {
      if (prod.stock_status === 'out_of_stock' || (prod.stock ?? 0) < neededStock) {
        throw new OrderInputError(`Insufficient stock for "${prod.name}" in hamper. Only ${prod.stock ?? 0} available.`);
      }
      componentDeductions.push({
        productId: prod.id,
        deductQty: neededStock,
        name: prod.name,
      });
    }

    const compUnitPrice = Number(prod.sale_price ?? prod.regular_price) || 0;
    componentsPriceTotal += compUnitPrice * qty;

    validatedComponents.push({
      productId: prod.id,
      name: prod.name,
      sku: prod.sku || '',
      qty,
      unitPrice: compUnitPrice,
      weight: comp.weight || 'standard',
      image: comp.image || undefined,
    });
  }

  // Capacity verification
  if (totalItemsCount > maxCapacity) {
    throw new OrderInputError(
      `The selected ${box.name} can hold at most ${maxCapacity} items (selected: ${totalItemsCount})`
    );
  }
  if (totalItemsCount < (currentSettings.minItemsRequired || 1)) {
    throw new OrderInputError(
      `Please select at least ${currentSettings.minItemsRequired || 1} item(s) for your hamper`
    );
  }

  // 3. Wrapping validation
  let wrappingPrice = 0;
  let validatedWrapping: { id: string; name: string; price: number } | undefined;
  const wrapId = details.wrappingId || item.wrappingId;
  if (wrapId && wrapId !== 'none') {
    const wrapOption = currentSettings.wrappings.find((w) => w.id.toLowerCase() === String(wrapId).toLowerCase());
    if (wrapOption && wrapOption.enabled) {
      wrappingPrice = Number.isFinite(wrapOption.price) && wrapOption.price > 0 ? Number(wrapOption.price) : 0;
      validatedWrapping = { id: wrapOption.id, name: wrapOption.name, price: wrappingPrice };
    }
  }

  // 4. Theme validation
  let validatedTheme: { id: string; name: string } | undefined;
  const themeId = details.themeId || item.themeId;
  if (themeId) {
    const themeOption = currentSettings.themes.find((t) => t.id.toLowerCase() === String(themeId).toLowerCase());
    if (themeOption && themeOption.enabled) {
      validatedTheme = { id: themeOption.id, name: themeOption.name };
    }
  }

  // 5. Total authoritative unit price
  const authoritativeUnitPrice = Math.round(boxPrice + wrappingPrice + componentsPriceTotal);

  // 6. Recipient and message sanitization
  const rawRecipient = details.recipientName || item.recipientName || '';
  const recipientName = typeof rawRecipient === 'string' ? rawRecipient.trim().slice(0, 100) : undefined;

  const rawMessage = details.giftMessage || item.giftMessage || item.messageOnCake || '';
  const maxChars = currentSettings.maxGiftMessageChars || 150;
  const giftMessage = typeof rawMessage === 'string' ? rawMessage.trim().slice(0, maxChars) : undefined;

  const photoUploads = Array.isArray(details.photoUploads)
    ? details.photoUploads.slice(0, currentSettings.photoUploadMaxCount || 3)
    : undefined;

  const snapshotSku = `HAMPER-CUSTOM-${box.id.toUpperCase()}`;
  const snapshotName = `Custom ${box.name}`;

  return {
    unitPrice: authoritativeUnitPrice,
    boxPrice,
    wrappingPrice,
    box: { id: box.id, name: box.name, price: boxPrice, maxItems: maxCapacity },
    wrapping: validatedWrapping,
    theme: validatedTheme,
    recipientName,
    giftMessage,
    photoUploads,
    components: validatedComponents,
    componentDeductions,
    snapshotSku,
    snapshotName,
  };
}
