'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  RefreshCw,
  AlertCircle,
  Package,
  Globe,
  Clock,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Power,
  Layers,
  X,
  Save,
  Info,
  CalendarDays,
} from 'lucide-react';
import { Modal } from '../common/Modal';

type OccasionRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  occasion_type: string;
  recurrence_type: string;
  start_date: string | null;
  end_date: string | null;
  year: number | null;
  priority: number;
  display_order: number;
  active: number;
  campaign_start_date: string | null;
  homepage_visibility: number;
  homepage_section_title: string | null;
  homepage_section_subtitle: string | null;
  banner_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  years: Array<{
    id: number;
    year: number;
    start_date: string | null;
    end_date: string | null;
    campaign_start_date: string | null;
    notes: string | null;
  }>;
  productCount: number;
};

type PreviewRow = {
  activeOccasion: OccasionRow | null;
  upcomingOccasions: OccasionRow[];
};

type ProductMapping = {
  product_id: number;
  priority: number;
  active: number;
  product_name: string;
  stock: number;
  stock_status: string;
};

type SimpleProduct = {
  id: number;
  name: string;
  sku: string;
  sale_price: number;
  regular_price: number;
};

export const FestivalManagerView: React.FC = () => {
  const [occasions, setOccasions] = useState<OccasionRow[]>([]);
  const [activeOccasion, setActiveOccasion] = useState<OccasionRow | null>(null);
  const [upcoming, setUpcoming] = useState<OccasionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOccasion, setEditingOccasion] = useState<OccasionRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOccasionType, setFormOccasionType] = useState('festival');
  const [formRecurrenceType, setFormRecurrenceType] = useState('fixed');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formCampaignStartDate, setFormCampaignStartDate] = useState('');
  const [formStatus, setFormStatus] = useState('scheduled');
  const [formActive, setFormActive] = useState(true);
  const [formPriority, setFormPriority] = useState(0);
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formHomepageVisibility, setFormHomepageVisibility] = useState(true);
  const [formSectionTitle, setFormSectionTitle] = useState('');
  const [formSectionSubtitle, setFormSectionSubtitle] = useState('');
  const [formSeoTitle, setFormSeoTitle] = useState('');
  const [formSeoDescription, setFormSeoDescription] = useState('');
  const [formCanonicalUrl, setFormCanonicalUrl] = useState('');

  // Year management state (for variable-date occasions)
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [yearOccasion, setYearOccasion] = useState<OccasionRow | null>(null);
  const [yearEntries, setYearEntries] = useState<OccasionRow['years']>([]);
  const [isYearLoading, setIsYearLoading] = useState(false);
  const [isYearSaving, setIsYearSaving] = useState(false);
  const [yearError, setYearError] = useState<string | null>(null);
  const [yearSuccess, setYearSuccess] = useState<string | null>(null);
  const [editingYear, setEditingYear] = useState<OccasionRow['years'][0] | null>(null);
  const [yearFormYear, setYearFormYear] = useState(new Date().getFullYear());
  const [yearFormStartDate, setYearFormStartDate] = useState('');
  const [yearFormEndDate, setYearFormEndDate] = useState('');
  const [yearFormCampaignStart, setYearFormCampaignStart] = useState('');
  const [yearFormNotes, setYearFormNotes] = useState('');

  // Filter & seed state
  const [activeFilter, setActiveFilter] = useState<'active' | 'all' | 'archived'>('active');
  const [isSeeding, setIsSeeding] = useState(false);

  // Product mapping state
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [mappingOccasion, setMappingOccasion] = useState<OccasionRow | null>(null);
  const [mappedProducts, setMappedProducts] = useState<ProductMapping[]>([]);
  const [allProducts, setAllProducts] = useState<SimpleProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProductSearchLoading, setIsProductSearchLoading] = useState(false);
  const [isMapSaving, setIsMapSaving] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapSuccess, setMapSuccess] = useState<string | null>(null);
  const [editingPriorityId, setEditingPriorityId] = useState<number | null>(null);
  const [tempPriority, setTempPriority] = useState('');

  const fetchOccasions = () => {
    setIsLoading(true);
    setError(null);

    const endpoint = activeFilter === 'active'
      ? '/api/admin?type=occasions'
      : '/api/admin?type=occasions_all';

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error || 'Failed to load occasions');
        } else {
          let list: OccasionRow[] = data.occasions || [];
          if (activeFilter === 'archived') {
            list = list.filter((o) => o.deleted_at);
          }
          setOccasions(list);
        }
      })
      .catch((e) => {
        setError(e?.message || 'Could not load occasions');
      })
      .finally(() => setIsLoading(false));
  };

  const fetchPreview = () => {
    fetch('/api/admin?type=occasion_preview')
      .then((res) => res.json())
      .then((data) => {
        setActiveOccasion(data.activeOccasion || null);
        setUpcoming(data.upcomingOccasions || []);
      })
      .catch(() => {
      });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([
      fetch('/api/admin?type=occasions')
        .then((res) => res.json())
        .then((data) => {
          setOccasions(data.occasions || []);
          setError(null);
        })
        .catch((e) => setError(e?.message || 'Refresh failed')),
      fetch('/api/admin?type=occasion_preview')
        .then((res) => res.json())
        .then((data) => {
          setActiveOccasion(data.activeOccasion || null);
          setUpcoming(data.upcomingOccasions || []);
        })
        .catch(() => {}),
    ]).finally(() => setIsRefreshing(false));
  };

  useEffect(() => {
    fetchOccasions();
    fetchPreview();
  }, []);

  const getRecurrenceLabel = (rt: string) => {
    switch (rt) {
      case 'fixed':
        return 'Fixed Annual';
      case 'variable':
        return 'Variable (per-year)';
      case 'range':
        return 'Date Range';
      case 'one_time':
        return 'One-time';
      default:
        return rt || 'Unknown';
    }
  };

  const getTypeLabel = (ot: string) => {
    switch (ot) {
      case 'festival':
        return 'Festival';
      case 'special_day':
        return 'Special Day';
      default:
        return 'General';
    }
  };

  const getStatusChip = (row: OccasionRow) => {
    if (row.deleted_at) return 'Archived';
    if (!row.active || row.active === 0) return 'Disabled';
    const status = row.status || 'scheduled';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (d: string | null) => {
    if (!d) return <span className="text-[var(--text-muted)]">—</span>;
    return <span className="font-mono text-xs">{d}</span>;
  };

  const resetForm = () => {
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormOccasionType('festival');
    setFormRecurrenceType('fixed');
    setFormStartDate('');
    setFormEndDate('');
    setFormCampaignStartDate('');
    setFormStatus('scheduled');
    setFormActive(true);
    setFormPriority(0);
    setFormDisplayOrder(0);
    setFormHomepageVisibility(true);
    setFormSectionTitle('');
    setFormSectionSubtitle('');
    setFormSeoTitle('');
    setFormSeoDescription('');
    setFormCanonicalUrl('');
    setFormError(null);
    setFormSuccess(null);
  };

  const openCreateForm = () => {
    resetForm();
    setEditingOccasion(null);
    setIsFormOpen(true);
  };

  const openEditForm = (occasion: OccasionRow) => {
    setFormError(null);
    setFormSuccess(null);
    setEditingOccasion(occasion);
    setFormName(occasion.name || '');
    setFormSlug(occasion.slug || '');
    setFormDescription(occasion.description || '');
    setFormOccasionType(occasion.occasion_type || 'festival');
    setFormRecurrenceType(occasion.recurrence_type || 'fixed');

    const currentYear = new Date().getFullYear();
    if (occasion.recurrence_type === 'fixed' && occasion.start_date) {
      setFormStartDate(occasion.start_date.replace(/^0001-/, `${currentYear}-`));
    } else {
      setFormStartDate(occasion.start_date || '');
    }
    if (occasion.recurrence_type === 'fixed' && occasion.end_date) {
      setFormEndDate(occasion.end_date.replace(/^0001-/, `${currentYear}-`));
    } else {
      setFormEndDate(occasion.end_date || '');
    }
    setFormCampaignStartDate(occasion.campaign_start_date || '');
    setFormStatus(occasion.status || 'scheduled');
    setFormActive(!!occasion.active);
    setFormPriority(Number(occasion.priority) || 0);
    setFormDisplayOrder(Number(occasion.display_order) || 0);
    setFormHomepageVisibility(!!occasion.homepage_visibility);
    setFormSectionTitle(occasion.homepage_section_title || '');
    setFormSectionSubtitle(occasion.homepage_section_subtitle || '');
    setFormSeoTitle(occasion.seo_title || '');
    setFormSeoDescription(occasion.seo_description || '');
    setFormCanonicalUrl(occasion.canonical_url || '');
    setIsFormOpen(true);
  };

  const autoSlugify = (value: string): string => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const validateForm = (): string | null => {
    if (!formName.trim()) return 'Occasion name is required';
    if (!formSlug.trim()) {
      setFormSlug(autoSlugify(formName));
    }
    const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!slugRegex.test(formSlug.trim())) {
      return 'Slug must contain only lowercase letters, numbers, and hyphens (e.g., valentines-day)';
    }
    if (!formOccasionType) return 'Occasion type is required';
    if (!formRecurrenceType) return 'Recurrence type is required';

    const validStatuses = ['draft', 'scheduled', 'active', 'ended', 'disabled'];
    if (!validStatuses.includes(formStatus)) return 'Invalid status selected';

    const priority = Number(formPriority);
    if (isNaN(priority) || priority < 0 || priority > 9999) {
      return 'Priority must be a number between 0 and 9999';
    }

    const displayOrder = Number(formDisplayOrder);
    if (isNaN(displayOrder) || displayOrder < 0 || displayOrder > 9999) {
      return 'Display order must be a number between 0 and 9999';
    }

    const rt = formRecurrenceType;
    if (rt === 'fixed' && !formStartDate) {
      return 'Fixed annual date requires a start date';
    }
    if (rt === 'one_time') {
      if (!formStartDate || !formEndDate) {
        return 'One-time occasions require both start and end dates';
      }
      if (formStartDate > formEndDate) {
        return 'End date cannot be before start date';
      }
    }
    if (rt === 'range') {
      if (!formStartDate || !formEndDate) {
        return 'Date-range occasions require both start and end dates';
      }
      if (formStartDate > formEndDate) {
        return 'End date cannot be before start date';
      }
    }
    if (formStartDate && formEndDate && formStartDate > formEndDate) {
      return 'End date cannot be earlier than start date';
    }
    if (formStartDate && formCampaignStartDate && formCampaignStartDate > formStartDate) {
      return 'Campaign start date cannot be after the occasion start date';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    setFormSuccess(null);
    setIsSaving(true);

    const currentYear = new Date().getFullYear();
    let startDateToSend = formStartDate;
    let endDateToSend = formEndDate;

    if (formRecurrenceType === 'fixed') {
      if (startDateToSend) startDateToSend = startDateToSend.replace(/^\d{4}-/, '0001-');
      if (endDateToSend) endDateToSend = endDateToSend.replace(/^\d{4}-/, '0001-');
    }

    const payload: any = {
      type: 'occasions',
      action: editingOccasion ? 'update' : 'create',
      name: formName.trim(),
      slug: formSlug.trim(),
      description: formDescription || null,
      occasion_type: formOccasionType,
      recurrence_type: formRecurrenceType,
      start_date: startDateToSend || null,
      end_date: endDateToSend || null,
      year: null,
      status: formStatus,
      active: formActive ? 1 : 0,
      priority: Number(formPriority) || 0,
      display_order: Number(formDisplayOrder) || 0,
      campaign_start_date: formCampaignStartDate || null,
      homepage_visibility: formHomepageVisibility ? 1 : 0,
      homepage_section_title: formSectionTitle || null,
      homepage_section_subtitle: formSectionSubtitle || null,
      seo_title: formSeoTitle || null,
      seo_description: formSeoDescription || null,
      canonical_url: formCanonicalUrl || null,
    };
    if (editingOccasion) payload.id = editingOccasion.id;

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setFormSuccess(editingOccasion ? 'Occasion updated successfully' : 'Occasion created successfully');
        setIsFormOpen(false);
        resetForm();
        setEditingOccasion(null);
        setTimeout(() => setFormSuccess(null), 5000);
        fetchOccasions();
      } else {
        setFormError(data.error || data.message || 'Failed to save occasion');
      }
    } catch (e: any) {
      setFormError(e?.message || 'Network error — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (occasion: OccasionRow) => {
    if (!confirm(`Archive "${occasion.name}"? This will remove product mappings.`)) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'occasions', action: 'archive', id: occasion.id }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        fetchOccasions();
      } else {
        setError(data.error || 'Failed to archive occasion');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    }
  };

  const handleRestore = async (occasion: OccasionRow) => {
    if (!confirm(`Restore "${occasion.name}"?\n\nThis will unarchive the occasion and make it available for scheduling again. All existing year configurations and product mappings are preserved.`)) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'occasions', action: 'restore', id: occasion.id }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setFormSuccess(`"${occasion.name}" restored`);
        setTimeout(() => setFormSuccess(null), 4000);
        fetchOccasions();
        fetchPreview();
      } else {
        setError(data.error || 'Failed to restore occasion');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('Load Default Occasions?\n\nThis will initialize default festival and special-day occasions (e.g. Valentine\'s Day, Holi, Diwali, Christmas, etc.). No existing occasions will be overwritten — only missing defaults will be created.')) return;
    setIsSeeding(true);
    setError(null);
    setFormSuccess(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'occasions_default' }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setFormSuccess('Default occasions loaded successfully');
        setTimeout(() => setFormSuccess(null), 5000);
        fetchOccasions();
        fetchPreview();
      } else {
        setError(data.error || 'Failed to seed default occasions');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSetActive = async (occasion: OccasionRow, active: boolean) => {
    try {
      setError(null);
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'occasions',
          action: 'set_active',
          id: occasion.id,
          active: active,
        }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setFormSuccess(active ? 'Occasion enabled' : 'Occasion disabled');
        setTimeout(() => setFormSuccess(null), 4000);
        fetchOccasions();
        fetchPreview();
      } else {
        setError(data.error || 'Failed to update occasion status');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    }
  };

  const openYearManagement = async (occasion: OccasionRow) => {
    setYearOccasion(occasion);
    setYearEntries([]);
    setYearError(null);
    setYearSuccess(null);
    setEditingYear(null);
    resetYearForm();
    setIsYearModalOpen(true);

    try {
      setIsYearLoading(true);
      const res = await fetch(`/api/admin?type=occasion_detail&id=${occasion.id}`);
      const data = await res.json();
      if (data.occasion) {
        setYearEntries(data.occasion.years || []);
        setYearOccasion(data.occasion);
      } else if (data.error) {
        setYearError(data.error || 'Failed to load year configurations');
      }
    } catch (e: any) {
      setYearError(e?.message || 'Network error');
    } finally {
      setIsYearLoading(false);
    }
  };

  const resetYearForm = () => {
    setYearFormYear(new Date().getFullYear());
    setYearFormStartDate('');
    setYearFormEndDate('');
    setYearFormCampaignStart('');
    setYearFormNotes('');
    setEditingYear(null);
    setYearError(null);
  };

  const editYearEntry = (entry: OccasionRow['years'][0]) => {
    setEditingYear(entry);
    setYearFormYear(entry.year);
    setYearFormStartDate(entry.start_date || '');
    setYearFormEndDate(entry.end_date || '');
    setYearFormCampaignStart(entry.campaign_start_date || '');
    setYearFormNotes(entry.notes || '');
    setYearError(null);
  };

  const saveYearEntry = async () => {
    const year = Number(yearFormYear);
    if (isNaN(year) || year < 2000 || year > 2100) {
      setYearError('Invalid year. Must be between 2000 and 2100.');
      return;
    }
    if (yearFormStartDate && yearFormEndDate && yearFormStartDate > yearFormEndDate) {
      setYearError('End date cannot be before start date.');
      return;
    }

    setIsYearSaving(true);
    setYearError(null);
    setYearSuccess(null);

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'occasion_years',
          action: 'save',
          occasion_id: yearOccasion?.id,
          year: year,
          start_date: yearFormStartDate || null,
          end_date: yearFormEndDate || null,
          campaign_start_date: yearFormCampaignStart || null,
          notes: yearFormNotes || null,
        }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setYearSuccess(`Year ${year} saved`);
        setTimeout(() => setYearSuccess(null), 4000);
        resetYearForm();
        if (yearOccasion) openYearManagement(yearOccasion);
      } else {
        setYearError(data.error || 'Failed to save year configuration');
      }
    } catch (e: any) {
      setYearError(e?.message || 'Network error');
    } finally {
      setIsYearSaving(false);
    }
  };

  const deleteYearEntry = async (yearEntry: OccasionRow['years'][0]) => {
    if (!confirm(`Delete the year ${yearEntry.year} configuration for "${yearOccasion?.name}"?`)) return;
    try {
      setYearError(null);
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'occasion_years',
          action: 'delete',
          id: yearEntry.id,
        }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setYearSuccess(`Year ${yearEntry.year} deleted`);
        setTimeout(() => setYearSuccess(null), 4000);
        if (yearOccasion) openYearManagement(yearOccasion);
      } else {
        setYearError(data.error || 'Failed to delete year configuration');
      }
    } catch (e: any) {
      setYearError(e?.message || 'Network error');
    }
  };

  const openProductMapping = async (occasion: OccasionRow) => {
    setMappingOccasion(occasion);
    setMappedProducts([]);
    setAllProducts([]);
    setSearchQuery('');
    setMapError(null);
    setMapSuccess(null);
    setEditingPriorityId(null);
    setTempPriority('');
    setIsMappingModalOpen(true);

    // Fetch existing mappings via occasion_detail
    try {
      const res = await fetch(`/api/admin?type=occasion_detail&id=${occasion.id}`);
      const data = await res.json();
      if (data.occasion) {
        setMappedProducts(data.occasion.productMappings || []);
      }
    } catch (e) {
      setMapError('Failed to load product mappings');
    }

    // Fetch all products for search
    setIsProductSearchLoading(true);
    try {
      const res = await fetch('/api/admin?type=products_simple');
      const data = await res.json();
      if (data.products) {
        setAllProducts(data.products);
      } else if (data.error) {
        setMapError(data.error || 'Failed to load products');
      }
    } catch (e: any) {
      setMapError(e?.message || 'Failed to load products');
    } finally {
      setIsProductSearchLoading(false);
    }
  };

  const filteredProducts = searchQuery.trim()
    ? allProducts.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allProducts;

  const isProductMapped = (productId: number) =>
    mappedProducts.some((m) => m.product_id === productId);

  const handleMapProduct = async (product: SimpleProduct) => {
    if (isProductMapped(product.id)) {
      setMapError(`"${product.name}" is already mapped to this occasion`);
      setTimeout(() => setMapError(null), 4000);
      return;
    }
    setIsMapSaving(true);
    setMapError(null);
    setMapSuccess(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product_occasions',
          action: 'map',
          product_id: product.id,
          occasion_id: mappingOccasion?.id,
          priority: mappedProducts.length,
        }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        const detailRes = await fetch(`/api/admin?type=occasion_detail&id=${mappingOccasion?.id}`);
        const detailData = await detailRes.json();
        setMappedProducts(detailData.occasion?.productMappings || []);
        setMapSuccess(`"${product.name}" mapped to this occasion`);
        setTimeout(() => setMapSuccess(null), 4000);
      } else {
        setMapError(data.error || 'Failed to map product');
      }
    } catch (e: any) {
      setMapError(e?.message || 'Network error');
    } finally {
      setIsMapSaving(false);
    }
  };

  const handleUnmapProduct = async (productId: number, productName: string) => {
    if (!confirm(`Remove "${productName}" from this occasion mapping?`)) return;
    setIsMapSaving(true);
    setMapError(null);
    setMapSuccess(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product_occasions',
          action: 'unmap',
          product_id: productId,
          occasion_id: mappingOccasion?.id,
        }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setMappedProducts((prev) => prev.filter((m) => m.product_id !== productId));
        setMapSuccess(`"${productName}" unmapped`);
        setTimeout(() => setMapSuccess(null), 4000);
      } else {
        setMapError(data.error || 'Failed to unmap product');
      }
    } catch (e: any) {
      setMapError(e?.message || 'Network error');
    } finally {
      setIsMapSaving(false);
    }
  };

  const handleUpdatePriority = async (mapping: ProductMapping) => {
    setIsMapSaving(true);
    setMapError(null);
    setMapSuccess(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product_occasions',
          action: 'priority',
          product_id: mapping.product_id,
          occasion_id: mappingOccasion?.id,
          priority: Number(tempPriority) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setMappedProducts((prev) =>
          prev.map((m) =>
            m.product_id === mapping.product_id ? { ...m, priority: Number(tempPriority) || 0 } : m
          )
        );
        setMapSuccess(`Priority updated for "${mapping.product_name}"`);
        setTimeout(() => setMapSuccess(null), 4000);
        setEditingPriorityId(null);
        setTempPriority('');
      } else {
        setMapError(data.error || 'Failed to update priority');
      }
    } catch (e: any) {
      setMapError(e?.message || 'Network error');
    } finally {
      setIsMapSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)]/30 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)]">
              Festival & Special Days
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-2xl">
              Automate festival and special-day campaigns across the storefront. Map products to occasions,
              set annual or per-year dates, and control homepage visibility.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {formSuccess && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <Save className="w-3.5 h-3.5" />
              <span>{formSuccess}</span>
            </div>
          )}
          <button
            onClick={openCreateForm}
            className="px-4 py-2 rounded-xl bg-[#FF2B6D] hover:bg-[#FF1A5B] text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Occasion</span>
          </button>

           <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-xs font-bold text-[var(--text-main)] border border-[var(--border)] flex items-center gap-2 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="Initialize default festival & special-day occasions (idempotent)"
          >
            {isSeeding ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isSeeding ? 'Seeding...' : 'Seed Defaults'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border)] shadow-xs overflow-x-auto">
        <button
          onClick={() => { setActiveFilter('active'); fetchOccasions(); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeFilter === 'active'
              ? 'bg-[var(--primary)] text-white shadow-xs'
              : 'text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => { setActiveFilter('all'); fetchOccasions(); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-[var(--primary)] text-white shadow-xs'
              : 'text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          All
        </button>
        <button
          onClick={() => { setActiveFilter('archived'); fetchOccasions(); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeFilter === 'archived'
              ? 'bg-[var(--primary)] text-white shadow-xs'
              : 'text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          Archived
        </button>
      </div>

      {/* Active / Upcoming Summary Cards */}
      {(activeOccasion || upcoming.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeOccasion && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Currently Active</span>
              </div>
              <div className="text-lg font-black text-[var(--text-main)]">{activeOccasion.name}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                Priority: {activeOccasion.priority} · Products: {activeOccasion.productCount}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="sm:col-span-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-[10-xs] font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upcoming (within planning window)</span>
              </div>
              <div className="space-y-1.5">
                {upcoming.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-subtle)]/50">
                    <div>
                      <span className="font-semibold text-xs text-[var(--text-main)]">{o.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)]"> · {formatDate(o.start_date)} to {formatDate(o.end_date)}</span>
                    </div>
                    <span className="text-[10px] text-[var(--primary)] font-bold">{o.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-rose-800 dark:text-rose-200">Could not load occasions</p>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
          <div className="animate-pulse">
            <div className="h-12 border-b border-[var(--border)] bg-[var(--bg-subtle)]"></div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 border-b border-[var(--border)] px-4 flex items-center gap-4">
                <div className="w-5 h-5 bg-[var(--bg-subtle)] rounded"></div>
                <div className="h-3 bg-[var(--bg-subtle)] rounded flex-1"></div>
                <div className="w-16 h-3 bg-[var(--bg-subtle)] rounded"></div>
                <div className="w-12 h-3 bg-[var(--bg-subtle)] rounded"></div>
                <div className="w-20 h-3 bg-[var(--bg-subtle)] rounded"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && occasions.length === 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-12 text-center shadow-xs">
          <Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">No occasions configured</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            No festivals or special days have been set up yet. Seed default occasions from the resolution
            preview or create one manually. Product mapping and year configuration will appear here once
            occasions exist.
          </p>
        </div>
      )}

      {/* Occasions Table */}
      {!isLoading && !error && occasions.length > 0 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[var(--bg-subtle)] z-10">
                <tr className="border-b border-[var(--border)] text-[var(--text-subtle)] font-bold uppercase text-[10px]">
                  <th className="p-3 w-8">#</th>
                  <th className="p-3 min-w-[160px]">Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Recurrence</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3">Priority</th>
                   <th className="p-3 text-right">Products</th>
                   <th className="p-3 text-center w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {occasions.map((o, idx) => (
                  <tr key={o.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                    <td className="p-3 text-[var(--text-subtle)] font-mono text-[10px]">
                      {idx + 1}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-[var(--text-main)]">{o.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">{o.slug}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary-light)]/20 text-[var(--primary)]"
                      >
                        {getTypeLabel(o.occasion_type)}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--text-muted)]">
                      {getRecurrenceLabel(o.recurrence_type)}
                      {o.recurrence_type === 'variable' && o.years && o.years.length > 0 && (
                        <span className="ml-1 text-[10px] text-[var(--text-subtle)]">({o.years.length} yrs)</span>
                      )}
                    </td>
                    <td className="p-3">
                      {getStatusChip(o) === 'Active' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 w-max">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : getStatusChip(o) === 'Scheduled' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                          {getStatusChip(o)}
                        </span>
                      ) : getStatusChip(o) === 'Disabled' ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-400/10 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                          {getStatusChip(o)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-400/20 text-slate-600 dark:text-slate-500 text-[10px] font-bold">
                          {getStatusChip(o)}
                        </span>
                      )}
                    </td>
                    <td className="p-3">{formatDate(o.start_date)}</td>
                    <td className="p-3">{formatDate(o.end_date)}</td>
                    <td className="p-3">
                      <span className="font-mono text-[var(--text-main)]">{o.priority}</span>
                    </td>
                     <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Package className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
                        <span className="font-bold text-[var(--text-main)]">{o.productCount}</span>
                      </div>
                    </td>
                     <td className="p-3">
                      <div className="flex items-center justify-center gap-0.5">
                        {!o.deleted_at && o.active === 1 && (
                          <button
                            type="button"
                            onClick={() => handleSetActive(o, false)}
                            className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Disable occasion (won't show on storefront)"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!o.deleted_at && o.active === 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetActive(o, true)}
                            className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            title="Enable occasion"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!o.deleted_at && o.recurrence_type === 'variable' && (
                          <button
                            type="button"
                            onClick={() => openYearManagement(o)}
                            className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)]/20 transition-colors cursor-pointer"
                            title="Manage per-year dates"
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!o.deleted_at && (
                          <button
                            type="button"
                            onClick={() => openProductMapping(o)}
                            className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-purple-600 hover:bg-purple-500/10 transition-colors cursor-pointer"
                            title="Map products to this occasion"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditForm(o)}
                          className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)]/20 transition-colors cursor-pointer"
                          title="Edit occasion"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!o.deleted_at ? (
                          <button
                            type="button"
                            onClick={() => handleArchive(o)}
                            className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Archive occasion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestore(o)}
                            className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            title="Restore occasion (unarchive)"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-subtle)]/30 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>
              {occasions.length} {occasions.length === 1 ? 'occasion' : 'occasions'} displayed
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Timezone: Asia/Kolkata
            </span>
          </div>
        </div>
      )}

      {/* Occasion Form Modal (Create / Edit) */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          resetForm();
          setEditingOccasion(null);
        }}
        title={editingOccasion ? 'Edit Occasion' : 'Add New Occasion'}
        subtitle={editingOccasion ? `Editing: ${editingOccasion.name}` : 'Create a new festival or special-day occasion'}
        maxWidth="2xl"
        showCloseButton={!isSaving}
      >
        <div className="space-y-5 text-sm">
          {/* Validation Error */}
          {formError && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span className="text-xs text-rose-800 dark:text-rose-200">{formError}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                <Info className="w-3 h-3" />
                Name *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!formSlug) setFormSlug(autoSlugify(e.target.value));
                }}
                disabled={isSaving}
                placeholder="e.g. Diwali, Valentine's Day"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                Slug *
              </label>
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value.toLowerCase().trim())}
                disabled={isSaving}
                placeholder="valentines-day"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50 font-mono"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Lowercase letters, numbers, hyphens only.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                Occasion Type
              </label>
              <select
                value={formOccasionType}
                onChange={(e) => setFormOccasionType(e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
              >
                <option value="festival">Festival</option>
                <option value="special_day">Special Day</option>
                <option value="general">General</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                <CalendarDays className="w-3 h-3" />
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                disabled={isSaving}
                placeholder="Brief description shown on the storefront..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50 resize-y"
              />
            </div>
          </div>

          {/* Date Configuration */}
          <div className="border-t border-[var(--border)] pt-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-[var(--text-subtle)] tracking-wider">
              Date Configuration
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Recurrence Type *
                </label>
                <select
                  value={formRecurrenceType}
                  onChange={(e) => setFormRecurrenceType(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                >
                  <option value="fixed">Fixed Annual (same month-day every year)</option>
                  <option value="variable">Variable (per-year admin-configured)</option>
                  <option value="range">Date Range</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {/* Fixed Annual / Range / One-time: date inputs */}
              {formRecurrenceType !== 'variable' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                      {formRecurrenceType === 'fixed' ? 'Annual Start Date (month-day) *' : 'Start Date *'}
                    </label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      disabled={isSaving}
                      className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                    />
                    {formRecurrenceType === 'fixed' && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        The year portion is ignored — this occasion repeats every year.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                      {formRecurrenceType === 'fixed' ? 'Annual End Date (month-day)' : 'End Date'}
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      disabled={isSaving}
                      className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                    />
                    {formRecurrenceType === 'fixed' && (
                      <p className="text-[10px] text-[var(--text-subtle)] mt-1">
                        Optional. If blank, uses the start date.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Variable recurrence notice */}
              {formRecurrenceType === 'variable' && (
                <div className="md:col-span-2 bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    This occasion has variable dates (e.g. lunar-calendar festivals like Diwali, Holi).
                    Start/end dates are <strong>not set here</strong> — they are configured per-year in the
                    Year Manager after the occasion is saved. The engine resolves dates from{' '}
                    <code className="bg-amber-100 dark:bg-amber-950/30 px-1 rounded">occasion_years</code>.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Campaign Start Date
                </label>
                <input
                  type="date"
                  value={formCampaignStartDate}
                  onChange={(e) => setFormCampaignStartDate(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  When the campaign goes live (may be before the occasion itself).
                </p>
              </div>
            </div>
          </div>

          {/* Ordering & Visibility */}
          <div className="border-t border-[var(--border)] pt-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-[var(--text-subtle)] tracking-wider">
              Ordering & Visibility
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Priority
                </label>
                <input
                  type="number"
                  min="0"
                  max="9999"
                  value={formPriority}
                  onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Higher = more prominent on homepage.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  max="9999"
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 0)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    disabled={isSaving}
                    className="w-4 h-4 rounded text-[#FF2B6D] focus:ring-[#FF2B6D] focus:ring-2"
                  />
                  <span className="text-xs font-bold text-[var(--text-main)]">Enabled</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="homepage_visibility"
                checked={formHomepageVisibility}
                onChange={(e) => setFormHomepageVisibility(e.target.checked)}
                disabled={isSaving}
                className="w-4 h-4 rounded text-[#FF2B6D] focus:ring-[#FF2B6D] focus:ring-2"
              />
              <label htmlFor="homepage_visibility" className="text-xs font-bold text-[var(--text-main)] cursor-pointer">
                Show on homepage
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Homepage Section Title
                </label>
                <input
                  type="text"
                  value={formSectionTitle}
                  onChange={(e) => setFormSectionTitle(e.target.value)}
                  disabled={isSaving}
                  placeholder="e.g. Diwali Delights"
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Homepage Section Subtitle
                </label>
                <input
                  type="text"
                  value={formSectionSubtitle}
                  onChange={(e) => setFormSectionSubtitle(e.target.value)}
                  disabled={isSaving}
                  placeholder="e.g. Handcrafted sweets for the festival of lights"
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="border-t border-[var(--border)] pt-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-[var(--text-subtle)] tracking-wider">
              Search Engine Optimization
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={formSeoTitle}
                  onChange={(e) => setFormSeoTitle(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Canonical URL
                </label>
                <input
                  type="text"
                  value={formCanonicalUrl}
                  onChange={(e) => setFormCanonicalUrl(e.target.value)}
                  disabled={isSaving}
                  placeholder="Leave blank to auto-generate"
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50 font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  SEO Description
                </label>
                <textarea
                  value={formSeoDescription}
                  onChange={(e) => setFormSeoDescription(e.target.value)}
                  disabled={isSaving}
                  rows={2}
                  placeholder="Meta description for search engines..."
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50 resize-y"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
                setEditingOccasion(null);
              }}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-xs font-bold text-[var(--text-main)] border border-[var(--border)] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[#FF2B6D] hover:bg-[#FF1A5B] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{editingOccasion ? 'Saving...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingOccasion ? 'Save Changes' : 'Create Occasion'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Product Mapping Modal */}
      <Modal
        isOpen={isMappingModalOpen}
        onClose={() => {
          setIsMappingModalOpen(false);
          setMappingOccasion(null);
          setMappedProducts([]);
          setAllProducts([]);
          setSearchQuery('');
          setMapError(null);
          setMapSuccess(null);
          setEditingPriorityId(null);
          setTempPriority('');
        }}
        title={`Map Products — ${mappingOccasion?.name || ''}`}
        subtitle="Search products and map them to this occasion. Each product keeps its own occasion-specific priority."
        maxWidth="3xl"
        showCloseButton={!isMapSaving}
      >
        <div className="space-y-5 text-sm">
          {/* Error / Success */}
          {mapError && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span className="text-xs text-rose-800 dark:text-rose-200">{mapError}</span>
            </div>
          )}
          {mapSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-start gap-2">
              <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-emerald-800 dark:text-emerald-200">{mapSuccess}</span>
            </div>
          )}

          {/* Product Search */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
              Search Products
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or SKU..."
              className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D]"
            />
            {isProductSearchLoading && (
              <p className="text-[10px] text-[var(--text-muted)]">Loading products...</p>
            )}
          </div>

          {/* Search Results (products not yet mapped) */}
          {!isProductSearchLoading && filteredProducts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-[var(--text-subtle)] tracking-wider">
                Search Results — {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
              </h4>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)] max-h-60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-subtle)] sticky top-0">
                    <tr className="text-[var(--text-subtle)] font-bold uppercase text-[10px]">
                      <th className="p-2 min-w-[180px]">Product</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Price</th>
                      <th className="p-2 w-[60px] text-center">Map</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredProducts
                      .filter((p) => !isProductMapped(p.id))
                      .slice(0, 50)
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-[var(--bg-subtle)]/50">
                          <td className="p-2">
                            <div className="font-semibold text-[var(--text-main)]">{p.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono">{p.sku}</div>
                          </td>
                          <td className="p-2 text-[var(--text-muted)]">{p.sku}</td>
                          <td className="p-2 font-mono">
                            {p.sale_price && p.sale_price > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400">₹{p.sale_price}</span>
                            ) : (
                              <span>₹{p.regular_price || p.sale_price}</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleMapProduct(p)}
                              disabled={isMapSaving}
                              className="px-2 py-1 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                              title="Map this product to the occasion"
                            >
                              Map
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {filteredProducts.filter((p) => !isProductMapped(p.id)).length === 0 && !isProductSearchLoading && (
                <p className="text-[11px] text-[var(--text-muted)]">
                  All matching products are already mapped to this occasion.
                </p>
              )}
            </div>
          )}

          {!isProductSearchLoading && filteredProducts.length === 0 && searchQuery.trim().length > 0 && (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No products found matching "{searchQuery}".</p>
              <p className="text-[10px] mt-1">Try a broader search term.</p>
            </div>
          )}

          {/* Mapped Products Table */}
          <div className="border-t border-[var(--border)] pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase text-[var(--text-subtle)] tracking-wider">
              Mapped Products — {mappedProducts.length} {mappedProducts.length === 1 ? 'product' : 'products'}
            </h4>

            {mappedProducts.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-subtle)]">
                    <tr className="text-[var(--text-subtle)] font-bold uppercase text-[10px]">
                      <th className="p-2 min-w-[160px]">Product</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Stock</th>
                      <th className="p-2 w-[80px]">Priority</th>
                      <th className="p-2 text-center w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {mappedProducts.map((m) => {
                      const isOutOfStock = m.stock_status === 'out_of_stock' || (m.stock !== undefined && m.stock <= 0);
                      const isLowStock = m.stock_status === 'low_stock' && !isOutOfStock;
                      return (
                        <tr key={m.product_id} className={`hover:bg-[var(--bg-subtle)]/50 ${isOutOfStock ? 'bg-rose-500/5' : ''}`}>
                          <td className="p-2">
                            <div className="font-semibold text-[var(--text-main)]">{m.product_name}</div>
                          </td>
                          <td className="p-2 text-[var(--text-muted)] font-mono">{m.product_id}</td>
                          <td className="p-2">
                            {isOutOfStock ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1 w-max">
                                <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                                Out of stock
                              </span>
                            ) : isLowStock ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1 w-max">
                                <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                                Low stock
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 w-max">
                                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                In stock ({m.stock})
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            {editingPriorityId === m.product_id ? (
                              <input
                                type="number"
                                min="0"
                                max="9999"
                                value={tempPriority}
                                onChange={(e) => setTempPriority(e.target.value)}
                                onBlur={() => {
                                  if (tempPriority.trim()) handleUpdatePriority(m);
                                  else { setEditingPriorityId(null); setTempPriority(''); }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (tempPriority.trim()) handleUpdatePriority(m);
                                    else { setEditingPriorityId(null); setTempPriority(''); }
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingPriorityId(null);
                                    setTempPriority('');
                                  }
                                }}
                                disabled={isMapSaving}
                                className="w-16 px-2 py-1 text-xs bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                                autoFocus
                              />
                            ) : (
                              <div
                                className="font-mono text-[var(--text-main)] cursor-pointer hover:text-[var(--primary)]"
                                onClick={() => { setEditingPriorityId(m.product_id); setTempPriority(String(m.priority || 0)); }}
                                title="Click to edit priority"
                              >
                                {m.priority || 0}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUnmapProduct(m.product_id, m.product_name)}
                                disabled={isMapSaving}
                                className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                                title="Remove from this occasion"
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
            ) : (
              <div className="text-center py-8 text-[var(--text-muted)] border border-[var(--border)] border-dashed rounded-xl">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs mb-1">No products mapped to this occasion yet.</p>
                <p className="text-[10px]">Search above and click "Map" to add products.</p>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setIsMappingModalOpen(false);
                setMappingOccasion(null);
                setMappedProducts([]);
                setAllProducts([]);
                setSearchQuery('');
                setMapError(null);
                setMapSuccess(null);
                setEditingPriorityId(null);
                setTempPriority('');
              }}
              disabled={isMapSaving}
              className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-xs font-bold text-[var(--text-main)] border border-[var(--border)] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Year Management Modal (for variable-date occasions) */}
      <Modal
        isOpen={isYearModalOpen}
        onClose={() => {
          setIsYearModalOpen(false);
          setYearOccasion(null);
          resetYearForm();
        }}
        title={`Manage Years — ${yearOccasion?.name || ''}`}
        subtitle="Configure date ranges for each year. Dates are admin-configured — never auto-guessed."
        maxWidth="2xl"
        showCloseButton={!isYearSaving}
      >
        <div className="space-y-5 text-sm">
          {yearError && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span className="text-xs text-rose-800 dark:text-rose-200">{yearError}</span>
            </div>
          )}

          {yearSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-start gap-2">
              <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-emerald-800 dark:text-emerald-200">{yearSuccess}</span>
            </div>
          )}

          {/* Existing Year Entries */}
          {isYearLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-[var(--bg-subtle)] rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : yearEntries.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--bg-subtle)]">
                  <tr className="text-[var(--text-subtle)] font-bold uppercase text-[10px]">
                    <th className="p-3">Year</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3">Campaign Start</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3 text-center w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {yearEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[var(--bg-subtle)]/50">
                      <td className="p-3 font-mono text-[var(--text-main)]">{entry.year}</td>
                      <td className="p-3">{entry.start_date || <span className="text-[var(--text-muted)]">—</span>}</td>
                      <td className="p-3">{entry.end_date || <span className="text-[var(--text-muted)]">—</span>}</td>
                      <td className="p-3">{entry.campaign_start_date || <span className="text-[var(--text-muted)]">—</span>}</td>
                      <td className="p-3 text-[var(--text-muted)]">{entry.notes || <span className="text-[var(--text-muted)]">—</span>}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => editYearEntry(entry)}
                            className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)]/20 transition-colors cursor-pointer"
                            title="Edit year configuration"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteYearEntry(entry)}
                              className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete year configuration"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No year configurations yet.</p>
              <p className="text-[10px] mt-1">Add a year below to set dates for this variable-date occasion.</p>
            </div>
          )}

          {/* Year Entry Form */}
          <div className="border-t border-[var(--border)] pt-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-[var(--text-subtle)] tracking-wider">
              {editingYear ? 'Edit Year' : 'Add Year'} Configuration
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Year *
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={yearFormYear}
                  onChange={(e) => setYearFormYear(parseInt(e.target.value) || 0)}
                  disabled={isYearSaving || !!editingYear}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                />
                {editingYear && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Year cannot be changed after creation.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={yearFormStartDate}
                  onChange={(e) => setYearFormStartDate(e.target.value)}
                  disabled={isYearSaving}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={yearFormEndDate}
                  onChange={(e) => setYearFormEndDate(e.target.value)}
                  disabled={isYearSaving}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Campaign Start Date
                </label>
                <input
                  type="date"
                  value={yearFormCampaignStart}
                  onChange={(e) => setYearFormCampaignStart(e.target.value)}
                  disabled={isYearSaving}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1.5">
                  Notes
                </label>
                <textarea
                  value={yearFormNotes}
                  onChange={(e) => setYearFormNotes(e.target.value)}
                  disabled={isYearSaving}
                  rows={2}
                  placeholder="e.g. Based on lunar calendar calculations..."
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-main)] focus:outline-none focus:border-[#FF2B6D] disabled:opacity-50 resize-y"
                />
              </div>
            </div>

            {/* Year Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {editingYear && (
                <button
                  type="button"
                  onClick={resetYearForm}
                  disabled={isYearSaving}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-xs font-bold text-[var(--text-main)] border border-[var(--border)] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
              <button
                type="button"
                onClick={saveYearEntry}
                disabled={isYearSaving}
                className="px-3 py-1.5 rounded-xl bg-[#FF2B6D] hover:bg-[#FF1A5B] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isYearSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingYear ? 'Update Year' : 'Add Year'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
