'use client';

import React, { useState } from 'react';
import {
  Gift,
  Save,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Package,
  Tag,
  Palette,
  Camera,
  MessageSquare,
  User,
  LayoutGrid,
} from 'lucide-react';
import { HamperSettings, HamperBoxOption, HamperCategoryOption, HamperWrappingOption, HamperThemeOption } from '../../lib/types';

interface HamperSettingsViewProps {
  settings: HamperSettings;
  onSave: (settings: HamperSettings) => void;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  banner: <Sparkles className="w-4 h-4" />,
  boxes: <Package className="w-4 h-4" />,
  categories: <LayoutGrid className="w-4 h-4" />,
  wrappings: <Tag className="w-4 h-4" />,
  themes: <Palette className="w-4 h-4" />,
  features: <Gift className="w-4 h-4" />,
};

export const HamperSettingsView: React.FC<HamperSettingsViewProps> = ({ settings, onSave }) => {
  const [draft, setDraft] = useState<HamperSettings>(settings);
  const [expanded, setExpanded] = useState<string[]>(['banner', 'boxes']);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const toggleSection = (key: string) => {
    setExpanded((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const updateDraft = <K extends keyof HamperSettings>(key: K, value: HamperSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (draft.boxes.filter((b) => b.enabled).length === 0) errs.push('At least one hamper box must be enabled.');
    if (draft.categories.filter((c) => c.enabled).length === 0) errs.push('At least one category must be enabled.');
    const enabledBoxes = draft.boxes.filter((b) => b.enabled);
    if (enabledBoxes.length > 0 && Math.min(...enabledBoxes.map((b) => b.maxItems)) < draft.minItemsRequired) {
      errs.push(`minItemsRequired (${draft.minItemsRequired}) is higher than the smallest enabled box capacity (${Math.min(...enabledBoxes.map((b) => b.maxItems))}).`);
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateBox = (id: string, patch: Partial<HamperBoxOption>) => {
    updateDraft('boxes', draft.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const updateCategory = (id: string, patch: Partial<HamperCategoryOption>) => {
    updateDraft('categories', draft.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const updateWrapping = (id: string, patch: Partial<HamperWrappingOption>) => {
    updateDraft('wrappings', draft.wrappings.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  const updateTheme = (id: string, patch: Partial<HamperThemeOption>) => {
    updateDraft('themes', draft.themes.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
            {SECTION_ICONS[id] || <Gift className="w-4 h-4" />}
          </div>
          <span className="text-sm font-bold text-[var(--text-main)]">{title}</span>
        </div>
        {expanded.includes(id) ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>
      {expanded.includes(id) && <div className="p-4 pt-0 border-t border-[var(--border)]">{children}</div>}
    </div>
  );

  const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!on)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
        on
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40'
          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
      }`}
    >
      {on ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
      {on ? 'Enabled' : 'Disabled'}
    </button>
  );

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary)] mb-1">
            <Gift className="w-4 h-4" />
            <span>Build Your Own Hamper</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-[var(--text-main)]">Hamper Customization Settings</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Control every aspect of the customer-facing Hamper Builder (boxes, categories, wrapping, themes, photos).
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-md'
          }`}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-xs font-semibold space-y-1">
          {errors.map((e) => <div key={e}>• {e}</div>)}
        </div>
      )}

      {/* Global enable toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${draft.enabled ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'}`}>
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-main)]">{draft.enabled ? 'Hamper Builder is LIVE' : 'Hamper Builder is DISABLED'}</div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {draft.enabled ? 'Customers can see the Build Your Own Hamper banner & builder.' : 'The hamper banner and builder are hidden from customers.'}
            </div>
          </div>
        </div>
        <Toggle on={draft.enabled} onChange={(v) => updateDraft('enabled', v)} />
      </div>

      <div className="space-y-4">
        {/* Banner Settings */}
        <Section id="banner" title="Storefront Banner & CTA">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Banner Emoji</label>
              <input
                type="text"
                value={draft.banner.emoji}
                onChange={(e) => updateDraft('banner', { ...draft.banner, emoji: e.target.value })}
                className={`${inputCls} w-24`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Title</label>
              <input
                type="text"
                value={draft.banner.title}
                onChange={(e) => updateDraft('banner', { ...draft.banner, title: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Subtitle</label>
              <textarea
                value={draft.banner.subtitle}
                onChange={(e) => updateDraft('banner', { ...draft.banner, subtitle: e.target.value })}
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Banner Gradient (Tailwind classes)</label>
              <input
                type="text"
                value={draft.banner.gradient}
                onChange={(e) => updateDraft('banner', { ...draft.banner, gradient: e.target.value })}
                className={inputCls}
              />
              <div className={`mt-2 h-12 rounded-xl bg-gradient-to-r ${draft.banner.gradient} flex items-center justify-center text-white text-xs font-bold`}>
                Live Preview
              </div>
            </div>
          </div>
        </Section>

        {/* Boxes */}
        <Section id="boxes" title="Hamper Boxes (Sizes & Pricing)">
          <div className="space-y-3">
            {draft.boxes.map((box) => (
              <div key={box.id} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)]">
                    <span>{box.icon}</span>
                    {box.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!box.popular}
                        onChange={(e) => updateBox(box.id, { popular: e.target.checked })}
                        className="accent-[var(--primary)]"
                      />
                      Popular
                    </label>
                    <Toggle on={box.enabled} onChange={(v) => updateBox(box.id, { enabled: v })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)]">Name</label>
                    <input type="text" value={box.name} onChange={(e) => updateBox(box.id, { name: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)]">Description</label>
                    <input type="text" value={box.description} onChange={(e) => updateBox(box.id, { description: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)]">Icon (emoji)</label>
                    <input type="text" value={box.icon} onChange={(e) => updateBox(box.id, { icon: e.target.value })} className={`${inputCls} w-20`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)]">Price (₹)</label>
                    <input type="number" min={0} value={box.price} onChange={(e) => updateBox(box.id, { price: Number(e.target.value) })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)]">Max Items</label>
                    <input type="number" min={1} value={box.maxItems} onChange={(e) => updateBox(box.id, { maxItems: Number(e.target.value) })} className={inputCls} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Categories */}
        <Section id="categories" title="Item Categories (Products Pool)">
          <div className="space-y-3">
            {draft.categories.map((cat) => (
              <div key={cat.id} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)]">
                    <span>{cat.icon}</span>
                    {cat.name}
                  </div>
                  <Toggle on={cat.enabled} onChange={(v) => updateCategory(cat.id, { enabled: v })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)]">Category Name</label>
                    <input type="text" value={cat.name} onChange={(e) => updateCategory(cat.id, { name: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-muted)]">Icon</label>
                    <input type="text" value={cat.icon} onChange={(e) => updateCategory(cat.id, { icon: e.target.value })} className={`${inputCls} w-20`} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">Match Keywords (comma-separated, used to find products)</label>
                  <input
                    type="text"
                    value={cat.keywords.join(', ')}
                    onChange={(e) => updateCategory(cat.id, { keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) })}
                    className={inputCls}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Wrappings */}
        <Section id="wrappings" title="Gift Wrapping Options">
          <div className="space-y-3">
            {draft.wrappings.map((wrap) => (
              <div key={wrap.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]/50">
                <span className="text-lg">{wrap.icon}</span>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input type="text" value={wrap.name} onChange={(e) => updateWrapping(wrap.id, { name: e.target.value })} className={inputCls} />
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">₹</span>
                    <input type="number" min={0} value={wrap.price} onChange={(e) => updateWrapping(wrap.id, { price: Number(e.target.value) })} className={inputCls} />
                  </div>
                </div>
                <Toggle on={wrap.enabled} onChange={(v) => updateWrapping(wrap.id, { enabled: v })} />
              </div>
            ))}
          </div>
        </Section>

        {/* Themes */}
        <Section id="themes" title="Hamper Themes (Color Palettes)">
          <div className="space-y-3">
            {draft.themes.map((theme) => (
              <div key={theme.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]/50">
                <div className={`w-12 h-10 rounded-lg bg-gradient-to-br ${theme.gradient}`} />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input type="text" value={theme.name} onChange={(e) => updateTheme(theme.id, { name: e.target.value })} className={inputCls} />
                  <input type="text" value={theme.description} onChange={(e) => updateTheme(theme.id, { description: e.target.value })} className={inputCls} />
                </div>
                <Toggle on={theme.enabled} onChange={(v) => updateTheme(theme.id, { enabled: v })} />
              </div>
            ))}
          </div>
        </Section>

        {/* Feature Toggles */}
        <Section id="features" title="Feature Toggles & Limits">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]"><User className="w-4 h-4 text-rose-500" /> Recipient Name</div>
                <Toggle on={draft.allowRecipientName} onChange={(v) => updateDraft('allowRecipientName', v)} />
              </div>
              <div className="p-3 rounded-xl border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]"><MessageSquare className="w-4 h-4 text-[var(--primary)]" /> Gift Message</div>
                <Toggle on={draft.allowGiftMessage} onChange={(v) => updateDraft('allowGiftMessage', v)} />
              </div>
              <div className="p-3 rounded-xl border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]"><Camera className="w-4 h-4 text-sky-500" /> Photo Upload</div>
                <Toggle on={draft.allowPhotoUpload} onChange={(v) => updateDraft('allowPhotoUpload', v)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">Max Gift Message Characters</label>
                <input type="number" min={0} value={draft.maxGiftMessageChars} onChange={(e) => updateDraft('maxGiftMessageChars', Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">Max Photo Uploads Per Hamper</label>
                <input type="number" min={0} value={draft.photoUploadMaxCount} onChange={(e) => updateDraft('photoUploadMaxCount', Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">Min Items Required to Proceed</label>
                <input type="number" min={0} value={draft.minItemsRequired} onChange={(e) => updateDraft('minItemsRequired', Number(e.target.value))} className={inputCls} />
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};
