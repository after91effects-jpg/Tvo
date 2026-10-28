'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../lib/server/permissions';

type Category = { id: number; name: string; slug: string; parent_id: number | null; description: string; image: string; featured: number; sort_order: number; seo_title: string; seo_description: string; product_count?: number };
const empty = { name: '', slug: '', parent_id: null, description: '', image: '', featured: 0, sort_order: 0, seo_title: '', seo_description: '' };
export function LiveCategoriesView() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Omit<Category, 'id'> & { id?: number } | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/catalog?type=categories');
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.categories)) throw new Error(data.error || 'Could not load categories.');
      setCategories(data.categories);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load categories.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const mutate = async (body: object) => {
    const response = await fetch('/api/admin/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'categories', ...body }) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Could not save category.');
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!draft || saving) return;
    setSaving(true); setError(''); setNotice('');
    try { await mutate({ ...draft, action: 'save' }); setDraft(null); await load(); setNotice('Category saved.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save category.'); }
    finally { setSaving(false); }
  };
  const remove = async (category: Category) => {
    if (!window.confirm(`Delete category "${category.name}"? Categories with products or subcategories cannot be deleted.`)) return;
    setSaving(true); setError(''); setNotice('');
    try { await mutate({ action: 'delete', id: category.id }); await load(); setNotice('Category deleted.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not delete category.'); }
    finally { setSaving(false); }
  };
  const field = 'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-main)]';
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold text-[var(--text-main)]">Categories & SEO</h1><p className="text-sm text-[var(--text-muted)]">{categories.length} database categories · {categories.filter(c => !c.parent_id).length} top-level categories</p></div>
      <div className="flex gap-2"><button type="button" className="px-3 py-2 rounded-xl border border-[var(--border)]" onClick={() => void load()} disabled={loading || saving}>Refresh</button>{hasPermission(user?.role, 'create_categories') && <button type="button" className="px-3 py-2 rounded-xl bg-[var(--primary)] text-white" onClick={() => { setDraft({ ...empty }); setNotice(''); }}>Add Category</button>}</div>
    </div>
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    {notice && <p role="status" className="text-sm text-[var(--success)]">{notice}</p>}
    {draft && <form onSubmit={save} className="rounded-2xl border border-[var(--border)] p-4 space-y-4">
      <h2 className="font-semibold">{draft.id ? 'Edit Category' : 'New Category'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Name<input required className={field} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        <label className="text-sm">Slug<input className={field} value={draft.slug || ''} onChange={e => setDraft({ ...draft, slug: e.target.value })} placeholder="Generated from name if empty" /></label>
        <label className="text-sm">Parent category<select className={field} value={draft.parent_id || ''} onChange={e => setDraft({ ...draft, parent_id: e.target.value ? Number(e.target.value) : null })}><option value="">Top level</option>{categories.filter(c => c.id !== draft.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-sm">Sort order<input type="number" className={field} value={draft.sort_order} onChange={e => setDraft({ ...draft, sort_order: Number(e.target.value) })} /></label>
        <label className="text-sm sm:col-span-2">Description<textarea className={field} value={draft.description || ''} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
        <label className="text-sm sm:col-span-2">Image URL<input className={field} value={draft.image || ''} onChange={e => setDraft({ ...draft, image: e.target.value })} placeholder="/uploads/... or https://..." /></label>
        <label className="text-sm">SEO title<input className={field} value={draft.seo_title || ''} onChange={e => setDraft({ ...draft, seo_title: e.target.value })} /></label>
        <label className="text-sm">SEO description<textarea className={field} value={draft.seo_description || ''} onChange={e => setDraft({ ...draft, seo_description: e.target.value })} /></label>
      </div>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={!!draft.featured} onChange={e => setDraft({ ...draft, featured: e.target.checked ? 1 : 0 })} />Featured category</label>
      <div className="flex gap-2"><button disabled={saving} className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white">{saving ? 'Saving...' : 'Save Category'}</button><button type="button" disabled={saving} className="px-4 py-2 rounded-xl border border-[var(--border)]" onClick={() => setDraft(null)}>Cancel</button></div>
    </form>}
    <input aria-label="Search categories" className={field} placeholder="Search category name or slug..." value={search} onChange={e => setSearch(e.target.value)} />
    {loading ? <p role="status">Loading categories...</p> : <div className="overflow-x-auto border border-[var(--border)] rounded-2xl"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border)]"><th className="p-3">Category</th><th className="p-3">Parent</th><th className="p-3">Products</th><th className="p-3">SEO</th><th className="p-3">Actions</th></tr></thead><tbody>{categories.filter(c => `${c.name} ${c.slug}`.toLowerCase().includes(search.toLowerCase())).map(c => <tr key={c.id} className="border-b border-[var(--border)]"><td className="p-3"><div className="font-semibold">{c.name}</div><div className="text-xs text-[var(--text-muted)]">{c.slug}</div></td><td className="p-3">{categories.find(p => p.id === c.parent_id)?.name || 'Top level'}</td><td className="p-3">{c.product_count || 0}</td><td className="p-3">{c.seo_title ? 'Title configured' : 'Default title'}</td><td className="p-3 whitespace-nowrap">{hasPermission(user?.role, 'edit_categories') && <button type="button" className="px-2 py-1 text-[var(--primary)]" onClick={() => setDraft({ ...c })}>Edit {c.name}</button>}{hasPermission(user?.role, 'archive_categories') && <button type="button" disabled={saving} className="px-2 py-1 text-[var(--danger)]" onClick={() => void remove(c)}>Delete {c.name}</button>}</td></tr>)}</tbody></table>{categories.length === 0 && <p className="p-4">No categories found.</p>}</div>}
  </section>;
}
