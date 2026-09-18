import { describe, it, expect, afterAll } from 'vitest';
import { db } from '../server/db';
import {
  saveIngredient,
  listIngredients,
  getIngredientById,
  adjustIngredientStock,
  deleteIngredient,
  saveProductRecipe,
  getProductRecipe,
  deleteProductRecipe,
} from '../server/recipes';

describe('Ingredient Master & Product Recipe BOM Integration Tests', () => {
  const mockAdminUser = { id: 1, name: 'Admin', email: 'admin@tvoflavours.com', role: 'admin' };
  let testIng1Id: number;
  let testIng2Id: number;
  const sampleProductId = 1; // Existing product from baseline 149

  afterAll(() => {
    // Strict cleanup to ensure database baseline is fully restored
    try {
      if (testIng1Id) {
        db.prepare('DELETE FROM recipes WHERE ingredient_id = ?').run(testIng1Id);
        db.prepare('DELETE FROM ingredients WHERE id = ?').run(testIng1Id);
      }
      if (testIng2Id) {
        db.prepare('DELETE FROM recipes WHERE ingredient_id = ?').run(testIng2Id);
        db.prepare('DELETE FROM ingredients WHERE id = ?').run(testIng2Id);
      }
      db.prepare('DELETE FROM recipes WHERE product_id = ?').run(sampleProductId);
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('ingredients', 'recipes')").run();
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  it('A. Creates raw ingredients in Ingredient Master', () => {
    const res1 = saveIngredient(mockAdminUser, {
      name: 'Organic Wheat Flour (Maida)',
      category: 'Flour & Grains',
      unit: 'kg',
      stock: 50,
      low_stock_threshold: 10,
      cost_per_unit: 60,
    });
    expect(res1.ok).toBe(true);
    testIng1Id = res1.id;

    const res2 = saveIngredient(mockAdminUser, {
      name: 'Callebaut 54.5% Dark Callets',
      category: 'Chocolate & Cocoa',
      unit: 'kg',
      stock: 20,
      low_stock_threshold: 5,
      cost_per_unit: 1050,
    });
    expect(res2.ok).toBe(true);
    testIng2Id = res2.id;

    const ing1 = getIngredientById(testIng1Id);
    expect(ing1).toBeDefined();
    expect(ing1?.name).toBe('Organic Wheat Flour (Maida)');
    expect(ing1?.unit).toBe('kg');
    expect(ing1?.cost_per_unit).toBe(60);
  });

  it('B. Lists ingredients ordered by category and name', () => {
    const allIngredients = listIngredients();
    expect(allIngredients.length).toBeGreaterThanOrEqual(2);
    const found1 = allIngredients.find((i) => i.id === testIng1Id);
    const found2 = allIngredients.find((i) => i.id === testIng2Id);
    expect(found1).toBeDefined();
    expect(found2).toBeDefined();
  });

  it('C. Adjusts ingredient stock (+ and -)', () => {
    // Increase stock by +15 kg (50 -> 65)
    const adj1 = adjustIngredientStock(mockAdminUser, testIng1Id, 15, 'Supplier delivery received');
    expect(adj1.ok).toBe(true);
    expect(adj1.previousStock).toBe(50);
    expect(adj1.newStock).toBe(65);

    // Decrease stock by -5 kg (65 -> 60)
    const adj2 = adjustIngredientStock(mockAdminUser, testIng1Id, -5, 'Kitchen morning batch consumption');
    expect(adj2.ok).toBe(true);
    expect(adj2.newStock).toBe(60);

    // Does not go below 0
    const adj3 = adjustIngredientStock(mockAdminUser, testIng1Id, -200, 'Spillage');
    expect(adj3.newStock).toBe(0);
  });

  it('D. Saves product recipe with multiple ingredients (Bill of Materials)', () => {
    // Recipe for product 1:
    // 250 g Flour (cost = ₹60/kg * 0.25 = ₹15)
    // 150 g Chocolate (cost = ₹1050/kg * 0.15 = ₹157.50)
    // Total Recipe Cost = ₹172.50
    const saveRes = saveProductRecipe(
      mockAdminUser,
      sampleProductId,
      [
        { ingredient_id: testIng1Id, quantity: 250, unit: 'g' },
        { ingredient_id: testIng2Id, quantity: 150, unit: 'g' },
      ],
      false // Do not automatically override product selling price
    );

    expect(saveRes.ok).toBe(true);
    expect(saveRes.itemsCount).toBe(2);
    expect(saveRes.totalCost).toBe(172.5);
  });

  it('E. Retrieves product recipe with computed line costs and ingredient details', () => {
    const recipe = getProductRecipe(sampleProductId);
    expect(recipe.productId).toBe(sampleProductId);
    expect(recipe.items.length).toBe(2);

    const flourItem = recipe.items.find((i) => i.ingredient_id === testIng1Id);
    expect(flourItem).toBeDefined();
    expect(flourItem?.quantity).toBe(250);
    expect(flourItem?.unit).toBe('g');
    expect(flourItem?.line_cost).toBe(15);
    expect(flourItem?.ingredient_name).toBe('Organic Wheat Flour (Maida)');

    const chocoItem = recipe.items.find((i) => i.ingredient_id === testIng2Id);
    expect(chocoItem).toBeDefined();
    expect(chocoItem?.quantity).toBe(150);
    expect(chocoItem?.unit).toBe('g');
    expect(chocoItem?.line_cost).toBe(157.5);

    expect(recipe.totalCost).toBe(172.5);
    expect(typeof recipe.foodCostPercent === 'number' || recipe.foodCostPercent === null).toBe(true);
  });

  it('F. Deletes product recipe without deleting ingredients or products', () => {
    const delRes = deleteProductRecipe(mockAdminUser, sampleProductId);
    expect(delRes.ok).toBe(true);

    const afterRecipe = getProductRecipe(sampleProductId);
    expect(afterRecipe.items.length).toBe(0);
    expect(afterRecipe.totalCost).toBe(0);

    // Ingredients still exist
    expect(getIngredientById(testIng1Id)).toBeDefined();
  });

  it('G. Deletes an ingredient and cascades removal of any recipe references', () => {
    // Attach testIng2Id to product 1 again
    saveProductRecipe(mockAdminUser, sampleProductId, [
      { ingredient_id: testIng2Id, quantity: 100, unit: 'g' },
    ]);

    // Delete ingredient
    const delIng = deleteIngredient(mockAdminUser, testIng2Id);
    expect(delIng.ok).toBe(true);
    expect(getIngredientById(testIng2Id)).toBeUndefined();

    // Check recipe: should now have 0 items due to cascade
    const recipe = getProductRecipe(sampleProductId);
    expect(recipe.items.length).toBe(0);
  });
});
