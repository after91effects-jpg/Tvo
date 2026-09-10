import { db } from './db';
import { initDb } from './db';
import { runMigrations } from './migrations';
import { serializeProduct } from './product-serializer';
import { slugify } from './api';

initDb();
runMigrations();

const DEFAULT_OCCASIONS = [
  { name: "Valentine's Day", slug: 'valentines-day', recurrenceType: 'fixed', startDate: '0001-02-14', endDate: '0001-02-14', priority: 100 },
  { name: "Mother's Day", slug: 'mothers-day', recurrenceType: 'fixed', startDate: '0001-05-14', endDate: '0001-05-14', priority: 95 },
  { name: "Father's Day", slug: 'fathers-day', recurrenceType: 'fixed', startDate: '0001-06-16', endDate: '0001-06-16', priority: 94 },
  { name: "Women's Day", slug: 'womens-day', recurrenceType: 'fixed', startDate: '0001-03-08', endDate: '0001-03-08', priority: 80 },
  { name: "Men's Day", slug: 'mens-day', recurrenceType: 'fixed', startDate: '0001-11-19', endDate: '0001-11-19', priority: 70 },
  { name: 'Friendship Day', slug: 'friendship-day', recurrenceType: 'fixed', startDate: '0001-08-04', endDate: '0001-08-04', priority: 75 },
  { name: 'Siblings Day', slug: 'siblings-day', recurrenceType: 'fixed', startDate: '0001-05-05', endDate: '0001-05-05', priority: 60 },
  { name: "Children's Day", slug: 'childrens-day', recurrenceType: 'fixed', startDate: '0001-11-14', endDate: '0001-11-14', priority: 72 },
  { name: "Teacher's Day", slug: 'teachers-day', recurrenceType: 'fixed', startDate: '0001-09-05', endDate: '0001-09-05', priority: 65 },
  { name: 'Birthday', slug: 'birthday', recurrenceType: 'fixed', startDate: '0001-01-01', endDate: '0001-12-31', priority: 90 },
  { name: 'Anniversary', slug: 'anniversary', recurrenceType: 'fixed', startDate: '0001-01-01', endDate: '0001-12-31', priority: 88 },
  { name: 'Graduation', slug: 'graduation', recurrenceType: 'fixed', startDate: '0001-05-01', endDate: '0001-05-31', priority: 62 },
  { name: 'Baby Shower', slug: 'baby-shower', recurrenceType: 'fixed', startDate: '0001-01-01', endDate: '0001-12-31', priority: 64 },
  { name: 'New Year', slug: 'new-year', recurrenceType: 'fixed', startDate: '0001-01-01', endDate: '0001-01-03', priority: 85 },
  { name: 'Christmas', slug: 'christmas', recurrenceType: 'fixed', startDate: '0001-12-25', endDate: '0001-12-26', priority: 92 },
  { name: 'Halloween', slug: 'halloween', recurrenceType: 'fixed', startDate: '0001-10-31', endDate: '0001-10-31', priority: 78 },
  { name: 'Republic Day', slug: 'republic-day', recurrenceType: 'fixed', startDate: '0001-01-26', endDate: '0001-01-26', priority: 76 },
  { name: 'Independence Day', slug: 'independence-day', recurrenceType: 'fixed', startDate: '0001-08-15', endDate: '0001-08-15', priority: 74 },
  { name: 'Diwali', slug: 'diwali', recurrenceType: 'variable', startDate: null, endDate: null, priority: 91 },
  { name: 'Holi', slug: 'holi', recurrenceType: 'variable', startDate: null, endDate: null, priority: 84 },
  { name: 'Raksha Bandhan', slug: 'raksha-bandhan', recurrenceType: 'variable', startDate: null, endDate: null, priority: 83 },
  { name: 'Dussehra', slug: 'dussehra', recurrenceType: 'variable', startDate: null, endDate: null, priority: 81 },
  { name: 'Navratri', slug: 'navratri', recurrenceType: 'variable', startDate: null, endDate: null, priority: 79 },
  { name: 'Karwa Chauth', slug: 'karwa-chauth', recurrenceType: 'variable', startDate: null, endDate: null, priority: 68 },
  { name: 'Ganesh Chaturthi', slug: 'ganesh-chaturthi', recurrenceType: 'variable', startDate: null, endDate: null, priority: 67 },
  { name: 'Janmashtami', slug: 'janmashtami', recurrenceType: 'variable', startDate: null, endDate: null, priority: 66 },
  { name: 'Baisakhi', slug: 'baisakhi', recurrenceType: 'fixed', startDate: '0001-04-13', endDate: '0001-04-14', priority: 73 },
  { name: 'Makar Sankranti', slug: 'makar-sankranti', recurrenceType: 'fixed', startDate: '0001-01-14', endDate: '0001-01-15', priority: 71 },
  { name: 'Pongal', slug: 'pongal', recurrenceType: 'fixed', startDate: '0001-01-14', endDate: '0001-01-16', priority: 69 },
  { name: 'Onam', slug: 'onam', recurrenceType: 'variable', startDate: null, endDate: null, priority: 63 },
  { name: 'Bhai Dooj', slug: 'bhai-dooj', recurrenceType: 'variable', startDate: null, endDate: null, priority: 61 },
  { name: 'Grandparents Day', slug: 'grandparents-day', recurrenceType: 'fixed', startDate: '0001-09-12', endDate: '0001-09-12', priority: 58 },
  { name: "Daughter's Day", slug: 'daughters-day', recurrenceType: 'fixed', startDate: '0001-10-10', endDate: '0001-10-10', priority: 57 },
  { name: "Son's Day", slug: 'sons-day', recurrenceType: 'fixed', startDate: '0001-06-12', endDate: '0001-06-12', priority: 56 },
];

export function seedOccasionsIfEmpty() {
  try {
    const count = db.prepare('SELECT COUNT(*) AS c FROM occasions WHERE deleted_at IS NULL').get() as { c: number };
    if (count.c > 0) return;
    const now = new Date().toISOString();
    const tx = db.transaction(() => {
      for (const o of DEFAULT_OCCASIONS) {
        const exists = db.prepare('SELECT id FROM occasions WHERE slug=? AND deleted_at IS NULL').get(o.slug);
        if (!exists) {
          db.prepare(
            'INSERT INTO occasions (name, slug, description, status, occasion_type, recurrence_type, start_date, end_date, year, priority, display_order, active, homepage_visibility, campaign_start_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
          ).run(
            o.name, o.slug, null, 'scheduled', 'festival', o.recurrenceType, o.startDate, o.endDate, null, o.priority, 0, 0, 1, null, now, now
          );
        }
      }
    });
    tx();
  } catch {
    /* no-op */
  }
}
seedOccasionsIfEmpty();

export type OccasionStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'disabled' | 'archived';
export type RecurrenceType = 'fixed' | 'range' | 'variable' | 'one_time';
export type OccasionType = 'festival' | 'special_day' | 'general' | string;

export interface OccasionYear {
  year: number;
  startDate: string | null;
  endDate: string | null;
  campaignStartDate: string | null;
  notes: string | null;
}

export interface Occasion {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: OccasionStatus;
  occasionType: OccasionType;
  recurrenceType: RecurrenceType;
  startDate: string | null;
  endDate: string | null;
  year: number | null;
  priority: number;
  displayOrder: number;
  active: boolean;
  campaignStartDate: string | null;
  homepageVisibility: boolean;
  homepageSectionTitle: string | null;
  homepageSectionSubtitle: string | null;
  bannerImage: string | null;
  ctaLabel: string | null;
  ctaDestination: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface OccasionWithYears extends Occasion {
  years: OccasionYear[];
}

const INDIA_TZ = 'Asia/Kolkata';
const PLANNING_WINDOW_DAYS = 90;

function nowKolkata(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const obj: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') obj[p.type] = p.value;
  }
  return new Date(
    Number(obj.year),
    Number(obj.month) - 1,
    Number(obj.day),
    Number(obj.hour),
    Number(obj.minute),
    Number(obj.second)
  );
}

function currentYearKolkata(): number {
  return nowKolkata().getFullYear();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isActiveDate(now: Date, start: string | null, end: string | null): boolean {
  if (!start && !end) return false;
  const n = toDateStr(now);
  if (start && n < start) return false;
  if (end && n > end) return false;
  return true;
}

function isFutureDate(now: Date, start: string | null): boolean {
  if (!start) return false;
  return toDateStr(now) < start;
}

function isPastDate(now: Date, end: string | null): boolean {
  if (!end) return false;
  return toDateStr(now) > end;
}

export function getAllOccasions(opts?: { includeDeleted?: boolean; includeInactive?: boolean }): Occasion[] {
  const where: string[] = [];
  if (!opts?.includeDeleted) where.push('deleted_at IS NULL');
  if (!opts?.includeInactive) where.push('active = 1');
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`SELECT * FROM occasions ${w} ORDER BY priority DESC, display_order ASC, name ASC`).all() as any[];
  return rows.map(rowToOccasion);
}

export function getOccasionBySlug(slug: string): Occasion | null {
  const row = db.prepare('SELECT * FROM occasions WHERE slug=? AND deleted_at IS NULL').get(slug) as any;
  return row ? rowToOccasion(row) : null;
}

export function getOccasionById(id: number): Occasion | null {
  const row = db.prepare('SELECT * FROM occasions WHERE id=? AND deleted_at IS NULL').get(id) as any;
  return row ? rowToOccasion(row) : null;
}

export function getOccasionWithYears(id: number): OccasionWithYears | null {
  const row = db.prepare('SELECT * FROM occasions WHERE id=?').get(id) as any;
  if (!row) return null;
  const years = db.prepare('SELECT year, start_date, end_date, campaign_start_date, notes FROM occasion_years WHERE occasion_id=? ORDER BY year').all(id) as any[];
  return {
    ...rowToOccasion(row),
    years: years.map((y: any) => ({
      year: Number(y.year),
      startDate: y.start_date,
      endDate: y.end_date,
      campaignStartDate: y.campaign_start_date,
      notes: y.notes,
    })),
  };
}

function rowToOccasion(row: any): Occasion {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    status: (row.status as OccasionStatus) || 'draft',
    occasionType: row.occasion_type || 'general',
    recurrenceType: (row.recurrence_type as RecurrenceType) || 'fixed',
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    year: row.year ?? null,
    priority: Number(row.priority || 0),
    displayOrder: Number(row.display_order || 0),
    active: !!row.active,
    campaignStartDate: row.campaign_start_date ?? null,
    homepageVisibility: !!row.homepage_visibility,
    homepageSectionTitle: row.homepage_section_title ?? null,
    homepageSectionSubtitle: row.homepage_section_subtitle ?? null,
    bannerImage: row.banner_image ?? null,
    ctaLabel: row.cta_label ?? null,
    ctaDestination: row.cta_destination ?? null,
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    canonicalUrl: row.canonical_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    deletedAt: row.deleted_at ?? null,
  };
}

interface ResolvedOccasion extends Occasion {
  resolvedStartDate: string | null;
  resolvedEndDate: string | null;
  resolvedCampaignStart: string | null;
  derivedStatus: OccasionStatus;
  isCurrentlyActive: boolean;
}

function resolveOccasionDates(row: any, year: number): { startDate: string | null; endDate: string | null; campaignStartDate: string | null } {
  if (row.recurrence_type === 'variable') {
    const yr = db
      .prepare('SELECT start_date, end_date, campaign_start_date FROM occasion_years WHERE occasion_id=? AND year=?')
      .get(row.id, year) as any;
    if (yr) {
      return { startDate: yr.start_date, endDate: yr.end_date, campaignStartDate: yr.campaign_start_date || row.campaign_start_date };
    }
    return { startDate: row.start_date, endDate: row.end_date, campaignStartDate: row.campaign_start_date };
  }

  if (row.recurrence_type === 'one_time') {
    return { startDate: row.start_date, endDate: row.end_date, campaignStartDate: row.campaign_start_date };
  }

  if (row.recurrence_type === 'fixed') {
    const baseStart = row.start_date || null;
    const baseEnd = row.end_date || null;
    if (!baseStart) {
      return { startDate: null, endDate: null, campaignStartDate: row.campaign_start_date };
    }
    const monthDay = baseStart.slice(5);
    const start = `${year}-${monthDay}`;
    let end: string | null = null;
    if (baseEnd) {
      end = `${year}-${baseEnd.slice(5)}`;
    } else {
      end = start;
    }
    let campaignStart: string | null = null;
    if (row.campaign_start_date) {
      campaignStart = `${year}-${row.campaign_start_date.slice(5)}`;
    }
    return { startDate: start, endDate: end, campaignStartDate: campaignStart };
  }

  if (row.recurrence_type === 'range') {
    return { startDate: row.start_date, endDate: row.end_date, campaignStartDate: row.campaign_start_date };
  }

  return { startDate: row.start_date, endDate: row.end_date, campaignStartDate: row.campaign_start_date };
}

function computeDerivedStatus(row: any, dates: { startDate: string | null; endDate: string | null; campaignStartDate: string | null }, now: Date): OccasionStatus {
  if (row.deleted_at) return 'archived';
  if (!row.active || row.active === 0) return 'disabled';

  const n = toDateStr(now);
  const campStart = dates.campaignStartDate;
  const start = dates.startDate;
  const end = dates.endDate;

  const campaignActive = campStart && start
    ? (n >= campStart && n <= (end || start)!)
    : start && end
      ? (n >= start && n <= end)
      : false;

  if (campaignActive) return 'active';
  if (start && n < start) return 'scheduled';
  if (end && n > end) return 'ended';
  return 'scheduled';
}

export function resolveOccasions(now?: Date): ResolvedOccasion[] {
  const n = now || nowKolkata();
  const year = n.getFullYear();
  const rows = db.prepare(`SELECT * FROM occasions WHERE deleted_at IS NULL AND active=1 ORDER BY priority DESC, display_order ASC, name ASC`).all() as any[];
  return rows.map((row) => {
    const dates = resolveOccasionDates(row, year);
    const derived = computeDerivedStatus(row, dates, n);
    const isCurrentlyActive = derived === 'active';
    return {
      ...rowToOccasion(row),
      resolvedStartDate: dates.startDate,
      resolvedEndDate: dates.endDate,
      resolvedCampaignStart: dates.campaignStartDate,
      derivedStatus: derived,
      isCurrentlyActive,
    };
  });
}

export function resolveActiveOccasion(now?: Date): ResolvedOccasion | null {
  const all = resolveOccasions(now);
  // Highest priority active occasion
  const active = all.filter((o) => o.isCurrentlyActive).sort((a, b) => b.priority - a.priority || a.displayOrder - b.displayOrder)[0];
  return active || null;
}

export function resolveUpcomingOccasions(now?: Date, limit = 5): ResolvedOccasion[] {
  const n = now || nowKolkata();
  const all = resolveOccasions(n);
  const upcoming = all
    .filter((o) => !o.isCurrentlyActive)
    .filter((o) => o.resolvedStartDate && new Date(n.toISOString().split('T')[0]) <= new Date(o.resolvedStartDate!))
    .sort((a, b) => {
      const da = a.resolvedStartDate ? new Date(a.resolvedStartDate) : new Date(86400000000000);
      const db = b.resolvedStartDate ? new Date(b.resolvedStartDate) : new Date(86400000000000);
      return da.getTime() - db.getTime();
    })
    .slice(0, limit);
  return upcoming;
}

export function resolveUpcomingOccasion(now?: Date): ResolvedOccasion | null {
  return resolveUpcomingOccasions(now, 1)[0] || null;
}

export function resolveOccasionProducts(occasionId: number, opts?: { limit?: number; includeOutOfStock?: boolean }): any[] {
  let sql = `
    SELECT p.* FROM products p
    INNER JOIN product_occasions po ON po.product_id = p.id
    WHERE po.occasion_id = ? AND po.active = 1 AND p.deleted_at IS NULL AND p.published = 1
  `;
  const params: any[] = [occasionId];
  if (!opts?.includeOutOfStock) {
    sql += ` AND p.stock_status != 'out_of_stock' AND (p.stock > 0 OR p.enable_stock = 0)`;
  }
  sql += ` ORDER BY po.priority DESC, p.name ASC`;
  if (opts?.limit) {
    sql += ` LIMIT ?`;
    params.push(opts.limit);
  }
  const rows = db.prepare(sql).all(...params) as any[];

  const categoryRows = rows.map((r) => r.id);
  const catIds = new Set(categoryRows);
  if (catIds.size === 0) return [];
  const catRows = db.prepare(`
    SELECT p.id, c.name AS category_name, c.slug AS category_slug
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id IN (${categoryRows.map(() => '?').join(',')})
  `).all(...categoryRows) as any[];

  return rows.map((row) => {
    const cat = catRows.find((c) => c.id === row.id) || {};
    return serializeProduct({ ...row, category_name: cat.category_name, category_slug: cat.category_slug });
  });
}

export function getActiveOccasionProducts(opts?: { limit?: number; includeOutOfStock?: boolean }): { occasion: Occasion | null; products: any[] } {
  const occasion = resolveActiveOccasion();
  if (!occasion) return { occasion: null, products: [] };
  const products = resolveOccasionProducts(occasion.id, opts);
  return { occasion, products };
}

export interface ActiveOccasionForHomepage {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  occasionType: OccasionType;
  recurrenceType: RecurrenceType;
  resolvedStartDate: string | null;
  resolvedEndDate: string | null;
  resolvedCampaignStart: string | null;
  priority: number;
  homepageSectionTitle: string | null;
  homepageSectionSubtitle: string | null;
  bannerImage: string | null;
  ctaLabel: string | null;
  ctaDestination: string | null;
  homepageVisibility: boolean;
}

export function getActiveOccasionForHomepage(limit = 8): { occasion: ActiveOccasionForHomepage | null; productIds: number[] } {
  const resolved = resolveActiveOccasion();
  if (!resolved) return { occasion: null, productIds: [] };
  const ids = (db.prepare(
    `SELECT p.id FROM products p
     INNER JOIN product_occasions po ON po.product_id = p.id
     WHERE po.occasion_id = ? AND po.active = 1
       AND p.deleted_at IS NULL AND p.published = 1
       AND p.stock_status != 'out_of_stock' AND (p.stock > 0 OR p.enable_stock = 0)
     ORDER BY po.priority DESC, p.name ASC
     LIMIT ?`
  ).all(resolved.id, limit) as any[]).map((r) => Number(r.id));

  const occasion: ActiveOccasionForHomepage = {
    id: resolved.id,
    name: resolved.name,
    slug: resolved.slug,
    description: resolved.description,
    occasionType: resolved.occasionType,
    recurrenceType: resolved.recurrenceType,
    resolvedStartDate: resolved.resolvedStartDate,
    resolvedEndDate: resolved.resolvedEndDate,
    resolvedCampaignStart: resolved.resolvedCampaignStart,
    priority: resolved.priority,
    homepageSectionTitle: resolved.homepageSectionTitle,
    homepageSectionSubtitle: resolved.homepageSectionSubtitle,
    bannerImage: resolved.bannerImage,
    ctaLabel: resolved.ctaLabel,
    ctaDestination: resolved.ctaDestination,
    homepageVisibility: resolved.homepageVisibility,
  };
  return { occasion, productIds: ids };
}

export function getOccasionProductMappings(occasionId: number): { productId: number; productName: string; priority: number; active: boolean }[] {
  return db
    .prepare(`
      SELECT po.product_id, po.priority, po.active, p.name AS product_name
      FROM product_occasions po
      LEFT JOIN products p ON po.product_id = p.id
      WHERE po.occasion_id = ?
      ORDER BY po.priority DESC, p.name ASC
    `)
    .all(occasionId) as any[];
}

export function getAllOccasionProductMappings(productId: number): { occasionId: number; occasionName: string; priority: number; active: boolean }[] {
  return db
    .prepare(`
      SELECT po.occasion_id, o.name AS occasion_name, po.priority, po.active
      FROM product_occasions po
      LEFT JOIN occasions o ON po.occasion_id = o.id
      WHERE po.product_id = ?
      ORDER BY po.priority DESC
    `)
    .all(productId) as any[];
}

export { nowKolkata, currentYearKolkata, toDateStr, PLANNING_WINDOW_DAYS };
