'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Coins,
  Percent,
  Layers,
  HelpCircle,
  Save,
  Wheat,
} from 'lucide-react';
import { ALL_RECIPE_UNITS, calculateLineCost, calculateRecipeTotalCost } from '../../lib/recipeUnits';
import type { Ingredient, RecipeItem } from '../../lib/types';

interface ProductRecipeEditorProps {
  productId: number;
  productName: string;
  basePrice: number;
  sellingUnit?: string;
  onCostUpdated?: (newCost: number) => void;
}

interface EditableRecipeLine {
  ingredient_id: number;
  quantity: number;
  unit: string;
}

export const ProductRecipeEditor: React.FC<ProductRecipeEditorProps> = ({
  productId,
  productName,
  basePrice,
  sellingUnit = 'kg',
  onCostUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [lines, setLines] = useState<EditableRecipeLine[]>([]);
  const [syncCostPrice, setSyncCostPrice] = useState(true);

  // Load recipe & ingredients
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch ingredients master
      const ingRes = await fetch('/api/admin/ingredients');
      const ingData = await ingRes.json();
      const allIngs: Ingredient[] = ingData.ingredients || [];
      setAvailableIngredients(allIngs);

      // Fetch existing product recipe
      if (productId) {
        const recRes = await fetch(`/api/admin/recipes?productId=${productId}`);
        const recData = await recRes.json();
        if (recRes.ok && recData.items) {
          setLines(
            recData.items.map((item: RecipeItem) => ({
              ingredient_id: item.ingredient_id,
              quantity: Number(item.quantity) || 0,
              unit: item.unit || 'g',
            }))
          );
        } else {
          setLines([]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading recipe');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      loadData();
    }
  }, [productId]);

  // Ingredient lookup map
  const ingredientMap = useMemo(() => {
    const map = new Map<number, Ingredient>();
    for (const ing of availableIngredients) {
      map.set(ing.id, ing);
    }
    return map;
  }, [availableIngredients]);

  // Real-time calculated line items and cost
  const calculatedItems = useMemo(() => {
    const lineCosts: number[] = [];
    const items = lines.map((line, idx) => {
      const ing = ingredientMap.get(line.ingredient_id);
      const costCalc = calculateLineCost({
        recipeQuantity: line.quantity,
        recipeUnit: line.unit,
        ingredientUnit: ing?.unit || 'g',
        costPerUnit: ing?.cost_per_unit,
      });

      lineCosts.push(costCalc.lineCost);

      return {
        index: idx,
        ingredient_id: line.ingredient_id,
        quantity: line.quantity,
        unit: line.unit,
        ingredientName: ing?.name || 'Select Ingredient...',
        ingredientCategory: ing?.category || '',
        ingredientCost: ing?.cost_per_unit,
        ingredientUnit: ing?.unit || 'g',
        lineCost: costCalc.lineCost,
        conversionSuccess: costCalc.conversionSuccess,
      };
    });

    const summary = calculateRecipeTotalCost(lineCosts, basePrice);

    return {
      items,
      totalCost: summary.totalCost,
      foodCostPercent: summary.foodCostPercent,
    };
  }, [lines, ingredientMap, basePrice]);

  const addLine = () => {
    if (availableIngredients.length === 0) {
      setError('Please add ingredients to the Ingredient Master first before building a recipe.');
      return;
    }
    // Default to the first available ingredient
    const firstIng = availableIngredients[0];
    setLines([
      ...lines,
      {
        ingredient_id: firstIng.id,
        quantity: 100,
        unit: firstIng.unit || 'g',
      },
    ]);
  };

  const updateLine = (idx: number, patch: Partial<EditableRecipeLine>) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], ...patch };
    setLines(updated);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleSaveRecipe = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate lines
      const validItems = lines.filter((l) => l.ingredient_id && l.quantity > 0);

      const res = await fetch('/api/admin/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          items: validItems,
          updateCostPrice: syncCostPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save recipe');

      setSuccessMessage(
        `Recipe saved successfully! Total Recipe Cost: ₹${data.totalCost}${
          syncCostPrice ? ' (Product cost price updated)' : ''
        }`
      );
      setTimeout(() => setSuccessMessage(null), 5000);

      if (onCostUpdated && typeof data.totalCost === 'number') {
        onCostUpdated(data.totalCost);
      }
    } catch (err: any) {
      setError(err.message || 'Error saving recipe');
    } finally {
      setSaving(false);
    }
  };

  const handleClearRecipe = async () => {
    if (!window.confirm(`Are you sure you want to clear the recipe for "${productName}"?`)) return;

    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/admin/recipes?productId=${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear recipe');

      setLines([]);
      setSuccessMessage('Recipe cleared for this product');
      setTimeout(() => setSuccessMessage(null), 4000);

      if (onCostUpdated) {
        onCostUpdated(0);
      }
    } catch (err: any) {
      setError(err.message || 'Error clearing recipe');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-[var(--text-muted)]">
        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-[var(--primary)]" />
        Loading Recipe Bill of Materials...
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 border-t border-[var(--border)]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
              Recipe & Bill of Materials (BOM)
            </h4>
            <p className="text-[11px] text-[var(--text-muted)]">
              Specify raw ingredients for 1 standard {sellingUnit} base recipe to calculate real food cost.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--primary)] hover:text-white hover:border-transparent transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Ingredient</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Recipe Line Items */}
      {lines.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-[var(--border)] text-center bg-[var(--bg-subtle)]/30">
          <Wheat className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-1.5 opacity-50" />
          <p className="text-xs font-medium text-[var(--text-main)]">No Recipe Defined</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            This product currently has no recipe items attached. Products without recipes operate normally on the storefront.
          </p>
          <button
            type="button"
            onClick={addLine}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Ingredients to Recipe</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Ingredient</th>
                  <th className="py-2.5 px-3 w-28">Quantity</th>
                  <th className="py-2.5 px-3 w-28">Recipe Unit</th>
                  <th className="py-2.5 px-3">Unit Cost</th>
                  <th className="py-2.5 px-3">Line Cost (₹)</th>
                  <th className="py-2.5 px-2 text-right w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {calculatedItems.items.map((item) => (
                  <tr key={item.index} className="hover:bg-[var(--bg-subtle)]/40">
                    {/* Ingredient dropdown */}
                    <td className="py-2 px-3">
                      <select
                        value={item.ingredient_id}
                        onChange={(e) => updateLine(item.index, { ingredient_id: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none font-medium"
                      >
                        {availableIngredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.category || 'General'}) — ₹{ing.cost_per_unit ?? 0}/{ing.unit}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Quantity */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) => updateLine(item.index, { quantity: Number(e.target.value) })}
                        placeholder="Qty"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none font-mono"
                      />
                    </td>

                    {/* Recipe Unit */}
                    <td className="py-2 px-3">
                      <select
                        value={item.unit}
                        onChange={(e) => updateLine(item.index, { unit: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none font-medium"
                      >
                        <optgroup label="Weight">
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="mg">mg</option>
                        </optgroup>
                        <optgroup label="Volume">
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                        </optgroup>
                        <optgroup label="Discrete">
                          <option value="piece">piece</option>
                          <option value="dozen">dozen</option>
                          <option value="pack">pack</option>
                        </optgroup>
                      </select>
                    </td>

                    {/* Unit Cost */}
                    <td className="py-2 px-3 text-[11px] text-[var(--text-muted)]">
                      {item.ingredientCost !== null && item.ingredientCost !== undefined ? (
                        <span>₹{item.ingredientCost} / {item.ingredientUnit}</span>
                      ) : (
                        <span className="italic">No cost set</span>
                      )}
                    </td>

                    {/* Calculated Line Cost */}
                    <td className="py-2 px-3 font-semibold text-[var(--text-main)]">
                      ₹{item.lineCost.toFixed(2)}
                    </td>

                    {/* Delete line */}
                    <td className="py-2 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeLine(item.index)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                        title="Remove ingredient"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cost Summary & Analytics Card */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Total Recipe Cost (Food Cost)
                </span>
                <span className="text-base font-bold text-[var(--text-main)]">
                  ₹{calculatedItems.totalCost.toFixed(2)}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                  Sum of all {lines.length} ingredient items
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Product Selling Price
                </span>
                <span className="text-base font-bold text-[var(--text-main)]">
                  ₹{basePrice || 0}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                  Customer base price ({sellingUnit})
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Food Cost Percentage
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[var(--text-main)]">
                    {calculatedItems.foodCostPercent !== null
                      ? `${calculatedItems.foodCostPercent}%`
                      : 'N/A'}
                  </span>
                  {calculatedItems.foodCostPercent !== null && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        calculatedItems.foodCostPercent <= 30
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : calculatedItems.foodCostPercent <= 45
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}
                    >
                      {calculatedItems.foodCostPercent <= 30
                        ? 'Healthy Margin'
                        : calculatedItems.foodCostPercent <= 45
                        ? 'Standard'
                        : 'High Food Cost'}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                  Cost ÷ Selling Price
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncCostPrice}
                  onChange={(e) => setSyncCostPrice(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--primary)]"
                />
                <span>Sync total recipe cost with product cost price (`products.cost_price`)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearRecipe}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-light)] transition-all cursor-pointer"
                >
                  Clear Recipe
                </button>

                <button
                  type="button"
                  onClick={handleSaveRecipe}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Product Recipe'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
