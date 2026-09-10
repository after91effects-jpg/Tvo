import { MetadataRoute } from 'next';
import { db } from '../lib/server/db';
import { getSiteUrl } from '../lib/siteUrl';

export const revalidate = 86400; // 24 hours

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/custom-cakes`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/track`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  try {
    const products = db.prepare("SELECT slug, updated_at FROM products WHERE published=1 AND status='publish'").all() as { slug: string; updated_at?: string }[];
    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/product/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    const categories = db.prepare("SELECT slug FROM categories").all() as { slug: string }[];
    const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${baseUrl}/category/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const activeOccasions = db.prepare(
      "SELECT slug, updated_at FROM occasions WHERE deleted_at IS NULL AND active=1 AND homepage_visibility=1"
    ).all() as { slug: string; updated_at?: string }[];
    const occasionRoutes: MetadataRoute.Sitemap = activeOccasions.map((o) => ({
      url: `${baseUrl}/occasion/${o.slug}`,
      lastModified: o.updated_at ? new Date(o.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...occasionRoutes];
  } catch {
    return staticRoutes;
  }
}
