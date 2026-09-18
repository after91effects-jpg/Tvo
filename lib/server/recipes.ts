import { db } from './db';
import { logAudit } from './api';
import { calculateLineCost, calculateRecipeTotalCost } from '../recipeUnits';
import type { Ingredient, RecipeItem, ProductRecipeSummary } from '../types';

type User = any;

/**
 * Lists all ingredients from Ingredient Master.
 */
export function listIngredients(): Ingredient[] {
  return db
    .prepare('SELECT * FROM ingredients ORDER BY category ASC, name ASC')
    .all() as Ingredient[];
}

/**
 * Gets a single ingredient by ID.
 */
export function getIngredientById(id: number): Ingredient | undefined {
  return db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id) as Ingredient | undefined;
}

/**
 * Saves (creates or updates) an ingredient.
 */
export function saveIngredient(user: User, data: {
  id?: number;
  name: string;
  unit?: string;
  stock?: number;
  low_stock_threshold?: number;
  cost_per_unit?: number | null;
  category?: string | null;
}) {
  const name = (data.name || '').trim();
  if (!name) {
    throw new Error('Ingredient name is required');
  }

  const unit = (data.unit || 'g').trim();
  const stock = Number(data.stock) || 0;
  const lowStock = Number(data.low_stock_threshold) || 0;
  const cost = data.cost_per_unit !== undefined && data.cost_per_unit !== null && data.cost_per_unit !== ('' as any)
    ? Number(data.cost_per_unit)
    : null;
  const category = (data.category || '').trim() || null;

  if (data.id) {
    const existing = getIngredientById(data.id);
    if (!existing) throw new Error('Ingredient not found');

    db.prepare(`
      UPDATE ingredients 
      SET name = ?, unit = ?, stock = ?, low_stock_threshold = ?, cost_per_unit = ?, category = ?
      WHERE id = ?
    `).run(name, unit, stock, lowStock, cost, category, data.id);

    logAudit(user, 'INGREDIENT_UPDATE', 'Ingredient', String(data.id), `Updated ${name}`);
    return { ok: true, id: data.id };
  } else {
    const info = db.prepare(`
      INSERT INTO ingredients (name, unit, stock, low_stock_threshold, cost_per_unit, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, unit, stock, lowStock, cost, category);

    const newId = Number(info.lastInsertRowid);
    logAudit(user, 'INGREDIENT_CREATE', 'Ingredient', String(newId), `Created ${name}`);
    return { ok: true, id: newId };
  }
}

/**
 * Deletes an ingredient and cascades removal of recipe lines.
 */
export function deleteIngredient(user: User, id: number) {
  const existing = getIngredientById(id);
  if (!existing) return { ok: false, error: 'Ingredient not found' };

  db.transaction(() => {
    db.prepare('DELETE FROM recipes WHERE ingredient_id = ?').run(id);
    db.prepare('DELETE FROM ingredients WHERE id = ?').run(id);
  })();

  logAudit(user, 'INGREDIENT_DELETE', 'Ingredient', String(id), `Deleted ${existing.name}`);
  return { ok: true };
}

/**
 * Adjusts stock (+ or -) for an ingredient with audit logging.
 */
export function adjustIngredientStock(user: User, id: number, delta: number, note?: string) {
  const ing = getIngredientById(id);
  if (!ing) throw new Error('Ingredient not found');

  const currentStock = Number(ing.stock) || 0;
  const newStock = Math.max(0, currentStock + delta);

  db.prepare('UPDATE ingredients SET stock = ? WHERE id = ?').run(newStock, id);
  logAudit(
    user,
    'INGREDIENT_STOCK_ADJUST',
    'Ingredient',
    String(id),
    `Adjusted ${ing.name} stock: ${currentStock} -> ${newStock} (${delta >= 0 ? '+' : ''}${delta}). Note: ${note || 'Manual adjustment'}`
  );

  return { ok: true, id, previousStock: currentStock, newStock };
}

/**
 * Retrieves full Bill of Materials (BOM) for a product with computed line costs and total recipe cost.
 */
export function getProductRecipe(productId: number): ProductRecipeSummary {
  // 1. Fetch recipe rows joined with ingredient master
  const rawRows = db.prepare(`
    SELECT 
      r.id,
      r.product_id,
      r.ingredient_id,
      r.quantity,
      r.unit,
      i.name AS ingredient_name,
      i.unit AS ingredient_unit,
      i.stock AS ingredient_stock,
      i.cost_per_unit AS ingredient_cost_per_unit,
      i.category AS ingredient_category
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.product_id = ?
    ORDER BY r.id ASC
  `).all(productId) as any[];

  // 2. Fetch product details for base price
  const prod = db.prepare('SELECT id, regular_price, sale_price, cost_price FROM products WHERE id = ?').get(productId) as any;
  const basePrice = prod ? (Number(prod.sale_price) || Number(prod.regular_price) || 0) : 0;

  // 3. Compute line item costs
  const lineCosts: number[] = [];
  const items: RecipeItem[] = rawRows.map((row) => {
    const costCalc = calculateLineCost({
      recipeQuantity: Number(row.quantity),
      recipeUnit: row.unit || row.ingredient_unit || 'g',
      ingredientUnit: row.ingredient_unit || 'g',
      costPerUnit: row.ingredient_cost_per_unit,
    });

    lineCosts.push(costCalc.lineCost);

    return {
      id: row.id,
      product_id: row.product_id,
      ingredient_id: row.ingredient_id,
      quantity: Number(row.quantity),
      unit: row.unit || row.ingredient_unit || 'g',
      ingredient_name: row.ingredient_name,
      ingredient_unit: row.ingredient_unit,
      ingredient_stock: row.ingredient_stock,
      ingredient_cost_per_unit: row.ingredient_cost_per_unit,
      ingredient_category: row.ingredient_category,
      line_cost: costCalc.lineCost,
    };
  });

  // 4. Compute recipe total summary
  const summary = calculateRecipeTotalCost(lineCosts, basePrice);

  return {
    productId,
    items,
    totalCost: summary.totalCost,
    foodCostPercent: summary.foodCostPercent,
  };
}

/**
 * Saves a product recipe (replaces existing recipe lines atomically).
 * Optionally syncs the computed total recipe cost to products.cost_price.
 */
export function saveProductRecipe(
  user: User,
  productId: number,
  recipeItems: Array<{ ingredient_id: number; quantity: number; unit: string }>,
  updateCostPrice: boolean = false
) {
  const prod = db.prepare('SELECT id, name FROM products WHERE id = ?').get(productId) as any;
  if (!prod) throw new Error('Product not found');

  db.transaction(() => {
    // Clear existing recipe lines for this product
    db.prepare('DELETE FROM recipes WHERE product_id = ?').run(productId);

    // Insert new valid recipe lines
    const insertStmt = db.prepare(`
      INSERT INTO recipes (product_id, ingredient_id, quantity, unit)
      VALUES (?, ?, ?, ?)
    `);

    for (const item of recipeItems) {
      const ingId = Number(item.ingredient_id);
      const qty = Number(item.quantity);
      if (ingId && qty > 0) {
        insertStmt.run(productId, ingId, qty, (item.unit || 'g').trim());
      }
    }
  })();

  // Calculate new total cost
  const updatedRecipe = getProductRecipe(productId);

  if (updateCostPrice) {
    db.prepare('UPDATE products SET cost_price = ? WHERE id = ?').run(updatedRecipe.totalCost, productId);
  }

  logAudit(
    user,
    'PRODUCT_RECIPE_SAVE',
    'Product',
    String(productId),
    `Saved recipe for "${prod.name}" with ${updatedRecipe.items.length} ingredients. Total Cost: ₹${updatedRecipe.totalCost}`
  );

  return {
    ok: true,
    productId,
    totalCost: updatedRecipe.totalCost,
    foodCostPercent: updatedRecipe.foodCostPercent,
    itemsCount: updatedRecipe.items.length,
    costPriceUpdated: updateCostPrice,
  };
}

/**
 * Deletes all recipe items for a product.
 */
export function deleteProductRecipe(user: User, productId: number) {
  const prod = db.prepare('SELECT id, name FROM products WHERE id = ?').get(productId) as any;
  db.prepare('DELETE FROM recipes WHERE product_id = ?').run(productId);

  logAudit(user, 'PRODUCT_RECIPE_DELETE', 'Product', String(productId), `Removed recipe for "${prod?.name || productId}"`);
  return { ok: true, productId };
}
