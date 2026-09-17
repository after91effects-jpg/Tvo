export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface InventoryConfig {
  trackInventory?: boolean;
  manageStock?: boolean | number;
  stock?: number;
  lowStockThreshold?: number;
  stockStatus?: string;
}

/**
 * Computes logical stock status based on quantity, threshold and tracking configuration.
 *
 * Rules:
 * - If trackInventory is disabled: always 'in_stock' (Available / Not Tracked)
 * - If quantity <= 0: 'out_of_stock'
 * - If 0 < quantity <= lowStockThreshold: 'low_stock'
 * - If quantity > lowStockThreshold: 'in_stock'
 */
export function computeStockStatus(
  quantity: number,
  lowStockThreshold: number = 5,
  trackInventory: boolean = true
): StockStatus {
  if (!trackInventory) {
    return 'in_stock';
  }

  const qty = Number.isFinite(quantity) ? quantity : 0;
  const threshold = Number.isFinite(lowStockThreshold) ? lowStockThreshold : 5;

  if (qty <= 0) {
    return 'out_of_stock';
  }
  if (qty <= threshold) {
    return 'low_stock';
  }
  return 'in_stock';
}

/**
 * Checks if a product is out of stock.
 * Untracked products are never considered out of stock.
 */
export function isProductOutOfStock(product?: InventoryConfig | null): boolean {
  if (!product) return false;

  const tracking = product.trackInventory ?? (product.manageStock !== undefined ? Boolean(product.manageStock) : true);
  if (!tracking) return false;

  if (product.stockStatus === 'out_of_stock') return true;
  if (typeof product.stock === 'number' && product.stock <= 0) return true;

  return false;
}

/**
 * Checks if a product has low stock.
 * Untracked products and out-of-stock products are not low stock.
 */
export function isProductLowStock(product?: InventoryConfig | null): boolean {
  if (!product) return false;

  const tracking = product.trackInventory ?? (product.manageStock !== undefined ? Boolean(product.manageStock) : true);
  if (!tracking) return false;

  if (isProductOutOfStock(product)) return false;

  if (product.stockStatus === 'low_stock') return true;

  const threshold = typeof product.lowStockThreshold === 'number' && Number.isFinite(product.lowStockThreshold)
    ? product.lowStockThreshold
    : 5;

  if (typeof product.stock === 'number' && product.stock > 0 && product.stock <= threshold) {
    return true;
  }

  return false;
}

export interface InventoryValidationResult {
  valid: boolean;
  error?: string;
  quantity: number;
  threshold: number;
}

/**
 * Validates inventory input from Admin Product Form.
 * Rejects negative, NaN, or non-finite values.
 */
export function validateInventoryInput(
  rawQuantity: unknown,
  rawThreshold: unknown,
  trackInventory: boolean = true
): InventoryValidationResult {
  if (!trackInventory) {
    return {
      valid: true,
      quantity: 0,
      threshold: 5,
    };
  }

  if (rawQuantity === undefined || rawQuantity === null || rawQuantity === '') {
    return { valid: false, error: 'Stock quantity is required when inventory tracking is enabled.', quantity: 0, threshold: 5 };
  }

  const qtyNum = typeof rawQuantity === 'number' ? rawQuantity : Number(String(rawQuantity).trim());
  if (!Number.isFinite(qtyNum)) {
    return { valid: false, error: 'Stock quantity must be a valid number.', quantity: 0, threshold: 5 };
  }

  if (qtyNum < 0) {
    return { valid: false, error: 'Stock quantity cannot be negative.', quantity: 0, threshold: 5 };
  }

  const threshNum = rawThreshold === undefined || rawThreshold === null || rawThreshold === ''
    ? 5
    : (typeof rawThreshold === 'number' ? rawThreshold : Number(String(rawThreshold).trim()));

  if (!Number.isFinite(threshNum)) {
    return { valid: false, error: 'Low stock threshold must be a valid number.', quantity: Math.round(qtyNum), threshold: 5 };
  }

  if (threshNum < 0) {
    return { valid: false, error: 'Low stock threshold cannot be negative.', quantity: Math.round(qtyNum), threshold: 5 };
  }

  return {
    valid: true,
    quantity: Math.floor(qtyNum),
    threshold: Math.floor(threshNum),
  };
}
