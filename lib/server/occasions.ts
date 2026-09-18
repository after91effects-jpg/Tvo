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

export function initializeFestivalDefaults() {
  try {
    // 1. Activate primary occasions if none are active
    const activeRow = db.prepare('SELECT COUNT(*) AS c FROM occasions WHERE active = 1 AND deleted_at IS NULL').get() as { c: number };
    if (activeRow.c === 0) {
      const now = new Date().toISOString();
      const updates = [
        {
          slug: 'diwali',
          active: 1,
          status: 'active',
          homepage_visibility: 1,
          banner_image: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=1200&auto=format&fit=crop',
          homepage_section_title: 'Celebrate Diwali with TVO Flavours',
          homepage_section_subtitle: 'Indulge in artisanal festive hampers, handcrafted dry fruit potlis, and royal celebratory cakes.',
          cta_label: 'Explore Diwali Hampers',
          cta_destination: '/occasion/diwali',
          priority: 95,
        },
        {
          slug: 'raksha-bandhan',
          active: 1,
          status: 'scheduled',
          homepage_visibility: 1,
          banner_image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1200&auto=format&fit=crop',
          homepage_section_title: 'Raksha Bandhan Celebrations',
          homepage_section_subtitle: 'Celebrate the sacred bond of siblinghood with exquisite rakhis, sweets, and gift hampers.',
          cta_label: 'Shop Rakhi Collection',
          cta_destination: '/occasion/raksha-bandhan',
          priority: 93,
        },
        {
          slug: 'valentines-day',
          active: 1,
          status: 'scheduled',
          homepage_visibility: 1,
          banner_image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1200&auto=format&fit=crop',
          homepage_section_title: 'Valentine Specials',
          homepage_section_subtitle: 'Decadent heart-shaped cakes and romantic treats made with pure Belgian chocolate.',
          cta_label: 'View Valentine Cakes',
          cta_destination: '/occasion/valentines-day',
          priority: 92,
        },
        {
          slug: 'birthday',
          active: 1,
          status: 'active',
          homepage_visibility: 1,
          banner_image: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?q=80&w=1200&auto=format&fit=crop',
          homepage_section_title: 'Handcrafted Birthday Cakes',
          homepage_section_subtitle: 'Make birthdays extraordinary with artisanal celebration cakes freshly baked with love.',
          cta_label: 'Shop Birthday Cakes',
          cta_destination: '/occasion/birthday',
          priority: 90,
        },
        {
          slug: 'anniversary',
          active: 1,
          status: 'active',
          homepage_visibility: 1,
          banner_image: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?q=80&w=1200&auto=format&fit=crop',
          homepage_section_title: 'Anniversary Milestones',
          homepage_section_subtitle: 'Celebrate your love with bespoke anniversary cakes crafted to perfection.',
          cta_label: 'Shop Anniversary Cakes',
          cta_destination: '/occasion/anniversary',
          priority: 88,
        },
      ];

      for (const u of updates) {
        db.prepare(`
          UPDATE occasions 
          SET active = ?, status = ?, homepage_visibility = ?, banner_image = ?,
              homepage_section_title = ?, homepage_section_subtitle = ?,
              cta_label = ?, cta_destination = ?, priority = ?, updated_at = ?
          WHERE slug = ? AND deleted_at IS NULL
        `).run(
          u.active, u.status, u.homepage_visibility, u.banner_image,
          u.homepage_section_title, u.homepage_section_subtitle,
          u.cta_label, u.cta_destination, u.priority, now, u.slug
        );
      }
    }

    // 2. Populate occasion_years if empty
    const yearRow = db.prepare('SELECT COUNT(*) AS c FROM occasion_years').get() as { c: number };
    if (yearRow.c === 0) {
      const occs = db.prepare('SELECT id, slug FROM occasions WHERE deleted_at IS NULL').all() as { id: number; slug: string }[];
      const occMap = new Map(occs.map((o) => [o.slug, o.id]));

      const yearData = [
        { slug: 'diwali', year: 2026, start_date: '2026-11-08', end_date: '2026-11-12', campaign_start_date: '2026-09-01', notes: 'Diwali 2026 Campaign' },
        { slug: 'diwali', year: 2027, start_date: '2027-10-29', end_date: '2027-11-02', campaign_start_date: '2027-09-15', notes: 'Diwali 2027 Campaign' },
        { slug: 'raksha-bandhan', year: 2026, start_date: '2026-08-28', end_date: '2026-08-28', campaign_start_date: '2026-08-01', notes: 'Rakhi 2026' },
        { slug: 'raksha-bandhan', year: 2027, start_date: '2027-08-17', end_date: '2027-08-17', campaign_start_date: '2027-07-25', notes: 'Rakhi 2027' },
        { slug: 'holi', year: 2026, start_date: '2026-03-04', end_date: '2026-03-04', campaign_start_date: '2026-02-15', notes: 'Holi 2026' },
        { slug: 'holi', year: 2027, start_date: '2027-03-22', end_date: '2027-03-22', campaign_start_date: '2027-03-01', notes: 'Holi 2027' },
        { slug: 'ganesh-chaturthi', year: 2026, start_date: '2026-09-14', end_date: '2026-09-24', campaign_start_date: '2026-09-01', notes: 'Ganesh Utsav 2026' },
      ];

      const stmt = db.prepare('INSERT OR IGNORE INTO occasion_years (occasion_id, year, start_date, end_date, campaign_start_date, notes) VALUES (?,?,?,?,?,?)');
      for (const y of yearData) {
        const occId = occMap.get(y.slug);
        if (occId) {
          stmt.run(occId, y.year, y.start_date, y.end_date, y.campaign_start_date, y.notes);
        }
      }
    }

    // 3. Populate product_occasions if empty
    const mapRow = db.prepare('SELECT COUNT(*) AS c FROM product_occasions').get() as { c: number };
    if (mapRow.c === 0) {
      const occs = db.prepare('SELECT id, slug FROM occasions WHERE deleted_at IS NULL').all() as { id: number; slug: string }[];
      const occMap = new Map(occs.map((o) => [o.slug, o.id]));

      const insertMap = db.prepare('INSERT OR IGNORE INTO product_occasions (product_id, occasion_id, priority, active) VALUES (?,?,?,1)');

      // Diwali products (Hampers & Festive Treats)
      const diwaliId = occMap.get('diwali');
      if (diwaliId) {
        const diwaliProducts = db.prepare(`
          SELECT id, name FROM products 
          WHERE published = 1 AND deleted_at IS NULL 
            AND (name LIKE '%diwali%' OR name LIKE '%hamper%' OR name LIKE '%gift%' OR tags LIKE '%diwali%')
          ORDER BY CASE WHEN name LIKE '%hamper%' THEN 1 WHEN name LIKE '%gift%' THEN 2 ELSE 3 END, id ASC
        `).all() as { id: number; name: string }[];

        let p = 100;
        for (const prd of diwaliProducts) {
          insertMap.run(prd.id, diwaliId, Math.max(p, 10));
          p -= 2;
        }
      }

      // Raksha Bandhan products (Rakhis & Sweets)
      const rakhiId = occMap.get('raksha-bandhan');
      if (rakhiId) {
        const rakhiProducts = db.prepare(`
          SELECT id, name FROM products 
          WHERE published = 1 AND deleted_at IS NULL 
            AND (name LIKE '%rakhi%' OR name LIKE '%raksha%' OR tags LIKE '%rakhi%')
          ORDER BY CASE WHEN name LIKE '%hamper%' THEN 1 ELSE 2 END, id ASC
        `).all() as { id: number; name: string }[];

        let p = 100;
        for (const prd of rakhiProducts) {
          insertMap.run(prd.id, rakhiId, Math.max(p, 10));
          p -= 2;
        }
      }

      // Valentine's Day products (Cakes & Treats)
      const valId = occMap.get('valentines-day');
      if (valId) {
        const valProducts = db.prepare(`
          SELECT id, name FROM products 
          WHERE published = 1 AND deleted_at IS NULL 
            AND (name LIKE '%valentine%' OR name LIKE '%love%' OR name LIKE '%heart%' OR name LIKE '%red velvet%')
          ORDER BY id ASC
        `).all() as { id: number; name: string }[];

        let p = 100;
        for (const prd of valProducts) {
          insertMap.run(prd.id, valId, Math.max(p, 10));
          p -= 5;
        }
      }

      // Birthday cakes
      const bdayId = occMap.get('birthday');
      if (bdayId) {
        const bdayProducts = db.prepare(`
          SELECT id, name FROM products 
          WHERE published = 1 AND deleted_at IS NULL 
            AND (name LIKE '%cake%' OR tags LIKE '%birthday%')
          LIMIT 12
        `).all() as { id: number; name: string }[];

        let p = 100;
        for (const prd of bdayProducts) {
          insertMap.run(prd.id, bdayId, Math.max(p, 10));
          p -= 5;
        }
      }

      // Anniversary cakes
      const annId = occMap.get('anniversary');
      if (annId) {
        const annProducts = db.prepare(`
          SELECT id, name FROM products 
          WHERE published = 1 AND deleted_at IS NULL 
            AND (name LIKE '%chocolate%' OR name LIKE '%truffle%' OR name LIKE '%fruit%')
          LIMIT 12
        `).all() as { id: number; name: string }[];

        let p = 100;
        for (const prd of annProducts) {
          insertMap.run(prd.id, annId, Math.max(p, 10));
          p -= 5;
        }
      }
    }
  } catch (e) {
    /* no-op on non-critical */
  }
}

seedOccasionsIfEmpty();
initializeFestivalDefaults();

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
