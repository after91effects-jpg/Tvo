import { ok, err } from '../../../lib/server/api';
import {
  resolveActiveOccasion,
  resolveUpcomingOccasions,
  resolveOccasionProducts,
  getActiveOccasionProducts,
  getActiveOccasionForHomepage,
  getOccasionBySlug,
  getAllOccasions,
  PLANNING_WINDOW_DAYS,
} from '../../../lib/server/occasions';
import { getSiteUrl } from '../../../lib/siteUrl';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') || 'full';
  const limit = parseInt(url.searchParams.get('limit') || '8', 10);
  const slug = url.searchParams.get('slug') || '';

  try {
    if (slug) {
      const occasion = getOccasionBySlug(slug);
      if (!occasion || !occasion.active || occasion.deletedAt) {
        return ok({ occasion: null });
      }
      const products = resolveOccasionProducts(occasion.id, { limit, includeOutOfStock: false });
      return ok({ occasion, products });
    }

    if (mode === 'active_only') {
      const active = resolveActiveOccasion();
      return ok({ activeOccasion: active, products: active ? resolveOccasionProducts(active.id, { limit }) : [] });
    }

    if (mode === 'homepage') {
      const { occasion, productIds } = getActiveOccasionForHomepage(limit);
      return ok({ activeOccasion: occasion, productIds });
    }

    if (mode === 'upcoming_only') {
      const upcoming = resolveUpcomingOccasions(undefined, limit);
      return ok({ upcomingOccasions: upcoming });
    }

    if (mode === 'preview') {
      const active = resolveActiveOccasion();
      const upcoming = resolveUpcomingOccasions(undefined, limit);
      const { products } = getActiveOccasionProducts({ limit });
      return ok({ activeOccasion: active, upcomingOccasions: upcoming, activeProducts: products, planningWindowDays: PLANNING_WINDOW_DAYS });
    }

    const { occasion, products } = getActiveOccasionProducts({ limit });
    const upcoming = resolveUpcomingOccasions(undefined, 3);
    const siteUrl = getSiteUrl();

    const allOccasions = getAllOccasions().map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      description: o.description,
      startDate: o.startDate,
      endDate: o.endDate,
      occasionType: o.occasionType,
      recurrenceType: o.recurrenceType,
      priority: o.priority,
      displayOrder: o.displayOrder,
      homepageVisibility: o.homepageVisibility,
      homepageSectionTitle: o.homepageSectionTitle,
      homepageSectionSubtitle: o.homepageSectionSubtitle,
       bannerImage: o.bannerImage,
      ctaLabel: o.ctaLabel,
      ctaDestination: o.ctaDestination,
      seoTitle: o.seoTitle,
      seoDescription: o.seoDescription,
      canonicalUrl: o.canonicalUrl ? o.canonicalUrl : `${siteUrl}/occasion/${o.slug}`,
      active: o.active,
    }));

    return ok({
      activeOccasion: occasion,
      activeProducts: products,
      upcomingOccasions: upcoming,
      occasions: allOccasions,
      planningWindowDays: PLANNING_WINDOW_DAYS,
    });
  } catch (e: any) {
    return err(e.message || 'Error fetching occasions', 500);
  }
}
