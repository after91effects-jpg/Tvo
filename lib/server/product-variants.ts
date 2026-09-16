import { db } from './db';
import { slugify } from './api';
import type { UserProfile } from '../types';

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  label: string;
  mrp: number | null;
  price: number;
  stock: number;
  lowStockThreshold: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  weightKg: number | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface VariantStockAdjustment {
  id: number;
  variantId: number;
  productId: number;
  previousQuantity: number;
  adjustmentQuantity: number;
  resultingQuantity: number;
  reason: string;
  userId: number | null;
  userName: string | null;
  createdAt: string;
}

export function listVariants(productId: number): ProductVariant[] {
  return db.prepare(
    `SELECT * FROM product_variants WHERE product_id=? ORDER BY id ASC`
  ).all(productId).map((row: any) => ({
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    label: row.label,
    mrp: row.mrp,
    price: row.price,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    stockStatus: row.stock_status,
    weightKg: row.weight_kg,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getVariant(variantId: number): ProductVariant | null {
  const row = db.prepare(`SELECT * FROM product_variants WHERE id=?`).get(variantId) as any;
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    label: row.label,
    mrp: row.mrp,
    price: row.price,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    stockStatus: row.stock_status,
    weightKg: row.weight_kg,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getVariantBySku(sku: string): ProductVariant | null {
  const row = db.prepare(`SELECT * FROM product_variants WHERE sku=?`).get(sku) as any;
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    label: row.label,
    mrp: row.mrp,
    price: row.price,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    stockStatus: row.stock_status,
    weightKg: row.weight_kg,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createVariant(productId: number, data: {
  sku: string;
  label: string;
  mrp?: number | null;
  price: number;
  stock?: number;
  lowStockThreshold?: number;
  weightKg?: number | null;
}, user: UserProfile | null): ProductVariant {
  const sku = String(data.sku).trim();
  if (!sku) throw new Error('Variant SKU is required');
  const dup = getVariantBySku(sku);
  if (dup) throw new Error(`Variant SKU "${sku}" already exists`);
  const stock = data.stock ?? 0;
  const threshold = data.lowStockThreshold ?? 5;
  const stockStatus = stock <= 0 ? 'out_of_stock' : (stock <= threshold ? 'low_stock' : 'in_stock');
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO product_variants (product_id, sku, label, mrp, price, stock, low_stock_threshold, stock_status, weight_kg, status, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(productId, sku, data.label || '', data.mrp ?? null, data.price, stock, threshold, stockStatus, data.weightKg ?? null, 'active', now, now);
  return getVariant(Number(info.lastInsertRowid))!;
}

export function updateVariant(variantId: number, data: Partial<{
  label: string;
  mrp: number | null;
  price: number;
  stock: number;
  lowStockThreshold: number;
  weightKg: number | null;
  status: 'active' | 'inactive';
}>, user: UserProfile | null): ProductVariant | null {
  const existing = getVariant(variantId);
  if (!existing) return null;
  const updates: Record<string, any> = {};
  if (data.label !== undefined) updates.label = data.label;
  if (data.mrp !== undefined) updates.mrp = data.mrp;
  if (data.price !== undefined) updates.price = data.price;
  if (data.stock !== undefined) {
    updates.stock = data.stock;
    updates.stockStatus = data.stock <= 0 ? 'out_of_stock' : (data.stock <= (data.lowStockThreshold ?? existing.lowStockThreshold) ? 'low_stock' : 'in_stock');
  }
  if (data.lowStockThreshold !== undefined) updates.lowStockThreshold = data.lowStockThreshold;
  if (data.weightKg !== undefined) updates.weightKg = data.weightKg;
  if (data.status !== undefined) updates.status = data.status;
  const colNames: Record<string, string> = {
    label: 'label', mrp: 'mrp', price: 'price', stock: 'stock',
    lowStockThreshold: 'low_stock_threshold', weightKg: 'weight_kg',
    status: 'status', stockStatus: 'stock_status', updatedAt: 'updated_at',
  };
  if (Object.keys(updates).length === 0) return existing;
  updates.updatedAt = new Date().toISOString();
  const sets = Object.keys(updates).map((k) => `${colNames[k]}=?`).join(', ');
  db.prepare(`UPDATE product_variants SET ${sets} WHERE id=?`).run(...Object.values(updates), variantId);
  return getVariant(variantId);
}

export function deleteVariant(variantId: number): boolean {
  const existing = getVariant(variantId);
  if (!existing) return false;
  db.prepare(`DELETE FROM product_variants WHERE id=?`).run(variantId);
  return true;
}

export function adjustVariantStock(variantId: number, adjustment: number, reason: string, user: UserProfile | null): { variant: ProductVariant; adjustment: VariantStockAdjustment } {
  const variant = getVariant(variantId);
  if (!variant) throw new Error('Variant not found');
  const previousQuantity = variant.stock;
  const resultingQuantity = Math.max(0, previousQuantity + adjustment);
  const actualAdjustment = resultingQuantity - previousQuantity;
  const threshold = variant.lowStockThreshold;
  const stockStatus = resultingQuantity <= 0 ? 'out_of_stock' : (resultingQuantity <= threshold ? 'low_stock' : 'in_stock');
  const now = new Date().toISOString();
  const adjInfo = db.prepare(`
    INSERT INTO variant_stock_adjustments (variant_id, product_id, previous_quantity, adjustment_quantity, resulting_quantity, reason, user_id, user_name, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)
    `).run(variantId, variant.productId, previousQuantity, actualAdjustment, resultingQuantity, reason, (user as any)?.id ?? null, (user as any)?.name ?? null, now);
  db.prepare(`UPDATE product_variants SET stock=?, stock_status=?, updated_at=? WHERE id=?`).run(resultingQuantity, stockStatus, now, variantId);
  return {
    variant: getVariant(variantId)!,
    adjustment: (() => {
      const row = db.prepare(`SELECT * FROM variant_stock_adjustments WHERE id=?`).get(Number(adjInfo.lastInsertRowid)) as any;
      return {
        id: row.id,
        variantId: row.variant_id,
        productId: row.product_id,
        previousQuantity: row.previous_quantity,
        adjustmentQuantity: row.adjustment_quantity,
        resultingQuantity: row.resulting_quantity,
        reason: row.reason,
        userId: row.user_id,
        userName: row.user_name,
        createdAt: row.created_at,
      };
    })(),
  };
}

export function getVariantAdjustments(variantId: number): VariantStockAdjustment[] {
  return db.prepare(
    `SELECT * FROM variant_stock_adjustments WHERE variant_id=? ORDER BY id DESC`
  ).all(variantId).map((row: any) => ({
    id: row.id,
    variantId: row.variant_id,
    productId: row.product_id,
    previousQuantity: row.previous_quantity,
    adjustmentQuantity: row.adjustment_quantity,
    resultingQuantity: row.resulting_quantity,
    reason: row.reason,
    userId: row.user_id,
    userName: row.user_name,
    createdAt: row.created_at,
  }));
}

export function listActiveVariants(productId: number): ProductVariant[] {
  return db.prepare(
    `SELECT * FROM product_variants WHERE product_id=? AND status='active' ORDER BY id ASC`
  ).all(productId).map((row: any) => ({
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    label: row.label,
    mrp: row.mrp,
    price: row.price,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    stockStatus: row.stock_status,
    weightKg: row.weight_kg,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getVariantStockStatus(productId: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  const variants = listActiveVariants(productId);
  if (variants.length === 0) {
    const product = db.prepare('SELECT stock, low_stock_threshold FROM products WHERE id=?').get(productId) as { stock: number; low_stock_threshold: number } | undefined;
    if (!product) return 'out_of_stock';
    return product.stock <= 0 ? 'out_of_stock' : (product.stock <= product.low_stock_threshold ? 'low_stock' : 'in_stock');
  }
  const minStock = Math.min(...variants.map((v) => v.stock));
  return minStock <= 0 ? 'out_of_stock' : (minStock <= variants[0].lowStockThreshold ? 'low_stock' : 'in_stock');
}
