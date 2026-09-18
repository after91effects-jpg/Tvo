'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wheat,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingDown,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Layers,
  Scale,
  X,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ALL_RECIPE_UNITS } from '../../lib/recipeUnits';
import type { Ingredient } from '../../lib/types';

const COMMON_CATEGORIES = [
  'Flour & Grains',
  'Chocolate & Cocoa',
  'Dairy & Eggs',
  'Sweeteners',
  'Fats & Oils',
  'Flavours & Extracts',
  'Fruits & Nuts',
  'Leavening & Agents',
  'Packaging',
  'Other',
];

export const IngredientMasterView: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingIngredient, setAdjustingIngredient] = useState<Ingredient | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'deduct'>('add');
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('Supplier delivery');

  // Form Fields for Add/Edit
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Flour & Grains');
  const [formUnit, setFormUnit] = useState('g');
  const [formStock, setFormStock] = useState('0');
  const [formLowStock, setFormLowStock] = useState('5');
  const [formCostPerUnit, setFormCostPerUnit] = useState('');

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/ingredients');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load ingredients');
      setIngredients(data.ingredients || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching ingredient master');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const openAddModal = () => {
    setEditingIngredient(null);
    setFormName('');
    setFormCategory('Flour & Grains');
    setFormUnit('kg');
    setFormStock('0');
    setFormLowStock('5');
    setFormCostPerUnit('');
    setIsEditModalOpen(true);
  };

  const openEditModal = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setFormName(ing.name);
    setFormCategory(ing.category || 'Other');
    setFormUnit(ing.unit || 'kg');
    setFormStock(String(ing.stock ?? 0));
    setFormLowStock(String(ing.low_stock_threshold ?? 5));
    setFormCostPerUnit(ing.cost_per_unit !== null && ing.cost_per_unit !== undefined ? String(ing.cost_per_unit) : '');
    setIsEditModalOpen(true);
  };

  const openAdjustModal = (ing: Ingredient) => {
    setAdjustingIngredient(ing);
    setAdjustMode('add');
    setAdjustAmount('');
    setAdjustReason('Supplier delivery');
    setIsAdjustModalOpen(true);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const payload = {
        id: editingIngredient ? editingIngredient.id : undefined,
        name: formName.trim(),
        category: formCategory.trim(),
        unit: formUnit.trim(),
        stock: Number(formStock) || 0,
        low_stock_threshold: Number(formLowStock) || 0,
        cost_per_unit: formCostPerUnit !== '' ? Number(formCostPerUnit) : null,
      };

      const res = await fetch('/api/admin/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save ingredient');

      setSuccessMessage(editingIngredient ? 'Ingredient updated successfully' : 'New ingredient added to Master');
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsEditModalOpen(false);
      fetchIngredients();
    } catch (err: any) {
      setError(err.message || 'Error saving ingredient');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingIngredient) return;
    const amount = Number(adjustAmount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      setError('Please enter a valid positive adjustment amount');
      return;
    }

    const delta = adjustMode === 'add' ? amount : -amount;

    try {
      setError(null);
      const res = await fetch('/api/admin/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_stock',
          id: adjustingIngredient.id,
          delta,
          note: adjustReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');

      setSuccessMessage(`Stock updated for ${adjustingIngredient.name}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsAdjustModalOpen(false);
      fetchIngredients();
    } catch (err: any) {
      setError(err.message || 'Error adjusting stock');
    }
  };

  const handleDelete = async (ing: Ingredient) => {
    if (!window.confirm(`Are you sure you want to delete "${ing.name}"? Any recipes using this ingredient will also have this item removed.`)) {
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/admin/ingredients?id=${ing.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete ingredient');

      setSuccessMessage(`Ingredient "${ing.name}" deleted`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchIngredients();
    } catch (err: any) {
      setError(err.message || 'Error deleting ingredient');
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValuation = 0;

    for (const ing of ingredients) {
      const stock = Number(ing.stock) || 0;
      const threshold = Number(ing.low_stock_threshold) || 0;
      const cost = Number(ing.cost_per_unit) || 0;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= threshold) {
        lowStockCount++;
      } else {
        inStockCount++;
      }

      totalValuation += stock * cost;
    }

    return {
      total: ingredients.length,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      totalValuation: Math.round(totalValuation * 100) / 100,
    };
  }, [ingredients]);

  // Filtered ingredients list
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ing.name.toLowerCase().includes(q);
        const matchCat = (ing.category || '').toLowerCase().includes(q);
        if (!matchName && !matchCat) return false;
      }

      // Category
      if (selectedCategory !== 'all' && (ing.category || 'Other') !== selectedCategory) {
        return false;
      }

      // Stock status
      const stock = Number(ing.stock) || 0;
      const threshold = Number(ing.low_stock_threshold) || 0;
      if (selectedStockFilter === 'out_of_stock' && stock > 0) return false;
      if (selectedStockFilter === 'low_stock' && (stock <= 0 || stock > threshold)) return false;
      if (selectedStockFilter === 'in_stock' && (stock <= 0 || stock <= threshold)) return false;

      return true;
    });
  }, [ingredients, searchQuery, selectedCategory, selectedStockFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-main)]">
                Ingredient Master & Raw Materials
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Centralized pantry inventory, raw material procurement costs, and recipe bill of materials.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchIngredients}
            disabled={loading}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ingredient</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>Total Raw Materials</span>
            <Package className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-xl font-bold text-[var(--text-main)]">{metrics.total}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Master catalog items</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>In Healthy Stock</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.inStockCount}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Sufficient for baking</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>Low Stock Reorder</span>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {metrics.lowStockCount}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">At or below threshold</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>Out of Stock</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
            {metrics.outOfStockCount}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Requires procurement</div>
        </div>

        <div className="col-span-2 sm:col-span-2 lg:col-span-1 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>Pantry Valuation</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-[var(--text-main)]">
            ₹{metrics.totalValuation.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Stock × Unit Cost</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ingredient or category..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none"
          >
            <option value="all">All Categories</option>
            {COMMON_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedStockFilter}
            onChange={(e) => setSelectedStockFilter(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none"
          >
            <option value="all">All Stock Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (≤ Alert)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--primary)]" />
            Loading Ingredient Master...
          </div>
        ) : filteredIngredients.length === 0 ? (
          <div className="p-12 text-center">
            <Wheat className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-[var(--text-main)]">No ingredients found</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
              {ingredients.length === 0
                ? 'Get started by adding your kitchen pantry raw materials (flour, sugar, cocoa, butter, vanilla).'
                : 'No ingredients matched your current search and filter settings.'}
            </p>
            {ingredients.length === 0 && (
              <button
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Ingredient</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)] text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-3 px-4">Ingredient & Category</th>
                  <th className="py-3 px-4">Master Unit</th>
                  <th className="py-3 px-4">Unit Cost (₹)</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4">Total Value (₹)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredIngredients.map((ing) => {
                  const stock = Number(ing.stock) || 0;
                  const lowStock = Number(ing.low_stock_threshold) || 0;
                  const cost = Number(ing.cost_per_unit) || 0;
                  const lineValuation = stock * cost;

                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      In Stock
                    </span>
                  );

                  if (stock <= 0) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        Out of Stock
                      </span>
                    );
                  } else if (stock <= lowStock) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Low Stock (≤ {lowStock} {ing.unit})
                      </span>
                    );
                  }

                  return (
                    <tr key={ing.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--text-main)]">{ing.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {ing.category || 'General Baking'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[var(--text-main)]">
                        {ing.unit || 'g'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[var(--text-main)]">
                        {cost > 0 ? (
                          <span>₹{cost.toLocaleString('en-IN')} / {ing.unit}</span>
                        ) : (
                          <span className="text-[var(--text-muted)] italic">Not set</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[var(--text-main)]">
                          {stock.toLocaleString()} {ing.unit}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          Alert threshold: {lowStock} {ing.unit}
                        </div>
                      </td>
                      <td className="py-3 px-4">{statusBadge}</td>
                      <td className="py-3 px-4 font-semibold text-[var(--text-main)]">
                        ₹{lineValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openAdjustModal(ing)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--primary)] hover:text-white hover:border-transparent transition-all cursor-pointer"
                            title="Quick Stock Adjustment"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>Stock</span>
                          </button>
                          <button
                            onClick={() => openEditModal(ing)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                            title="Edit details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(ing)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] transition-all cursor-pointer"
                            title="Delete ingredient"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingIngredient ? `Edit Ingredient: ${editingIngredient.name}` : 'Add Raw Material Ingredient'}
        subtitle="Manage ingredient specifications, unit of measure, stock, and procurement cost."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveIngredient} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Ingredient Name *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Callebaut 54.5% Dark Callets"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none font-medium"
              >
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Master Tracking Unit *
              </label>
              <select
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none font-medium"
              >
                <optgroup label="Mass / Weight">
                  <option value="kg">kg (Kilogram)</option>
                  <option value="g">g (Gram)</option>
                  <option value="mg">mg (Milligram)</option>
                </optgroup>
                <optgroup label="Volume">
                  <option value="l">l (Litre)</option>
                  <option value="ml">ml (Millilitre)</option>
                </optgroup>
                <optgroup label="Discrete / Packaging">
                  <option value="piece">piece</option>
                  <option value="pack">pack</option>
                  <option value="box">box</option>
                  <option value="dozen">dozen</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Initial Stock ({formUnit})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Low Stock Alert ({formUnit})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formLowStock}
                onChange={(e) => setFormLowStock(e.target.value)}
                placeholder="5"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Purchase Cost (₹/{formUnit})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formCostPerUnit}
                onChange={(e) => setFormCostPerUnit(e.target.value)}
                placeholder="e.g. 1050"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-xs cursor-pointer"
            >
              {editingIngredient ? 'Update Ingredient' : 'Add to Master'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Adjust Stock: ${adjustingIngredient?.name || ''}`}
        subtitle="Record inventory replenishment from suppliers or kitchen usage."
        maxWidth="md"
      >
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">Current Stock:</span>
            <span className="text-xs font-bold text-[var(--text-main)]">
              {adjustingIngredient?.stock ?? 0} {adjustingIngredient?.unit}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdjustMode('add')}
              className={`p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                adjustMode === 'add'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Receive / Add (+)</span>
            </button>

            <button
              type="button"
              onClick={() => setAdjustMode('deduct')}
              className={`p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                adjustMode === 'deduct'
                  ? 'bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-300'
                  : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              <MinusCircle className="w-4 h-4" />
              <span>Consume / Deduct (-)</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Quantity to {adjustMode === 'add' ? 'Add' : 'Deduct'} ({adjustingIngredient?.unit}) *
            </label>
            <input
              type="number"
              step="any"
              min="0.001"
              required
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="e.g. 10"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Adjustment Reason / Note
            </label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none font-medium mb-2"
            >
              <option value="Supplier delivery">Supplier delivery</option>
              <option value="Kitchen production batch">Kitchen production batch</option>
              <option value="Inventory audit / physical count correction">Inventory audit / physical count</option>
              <option value="Damage / Spillage / Expired">Damage / Spillage / Expired</option>
              <option value="Other">Other reason...</option>
            </select>
          </div>

          {adjustAmount && !isNaN(Number(adjustAmount)) && Number(adjustAmount) > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
              <span>Resulting Stock:</span>
              <span className="font-bold font-mono">
                {Math.max(
                  0,
                  (Number(adjustingIngredient?.stock) || 0) +
                    (adjustMode === 'add' ? Number(adjustAmount) : -Number(adjustAmount))
                )}{' '}
                {adjustingIngredient?.unit}
              </span>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-xs cursor-pointer"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
