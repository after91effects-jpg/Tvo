import type { Metadata } from 'next';
import { db } from '../../../lib/server/db';
import { getSiteUrl } from '../../../lib/siteUrl';
import { stripHtmlAndMetadata } from '../../../lib/sanitizeDescription';
import { normalizeImageUrl } from '../../../lib/imageUrl';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const rawSlug = resolvedParams?.slug || '';
  const slug = decodeURIComponent(rawSlug).trim();
  const siteUrl = getSiteUrl();

  let occasion: any = null;
  if (slug) {
    try {
      const row = db.prepare('SELECT * FROM occasions WHERE slug=? AND deleted_at IS NULL AND active=1').get(slug) as any;
      if (row) {
        occasion = {
          id: Number(row.id),
          name: row.name,
          slug: row.slug,
          description: row.description ?? null,
          seoTitle: row.seo_title ?? null,
          seoDescription: row.seo_description ?? null,
          bannerImage: row.banner_image ?? null,
          startDate: row.start_date ?? null,
          endDate: row.end_date ?? null,
        };
      }
    } catch {
      /* no-op — fall through to generic metadata */
    }
  }

  if (!occasion) {
    return {
      title: 'Occasion | TVO Flavours',
      description: 'The all-in-one bakery shop in Gurugram, Haryana.',
      alternates: { canonical: `${siteUrl}/occasion/${slug}` },
      openGraph: {
        title: 'Occasion | TVO Flavours',
        description: 'The all-in-one bakery shop in Gurugram, Haryana.',
        url: `${siteUrl}/occasion/${slug}`,
        type: 'website',
        siteName: 'TVO Flavours',
        locale: 'en_IN',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Occasion | TVO Flavours',
        description: 'The all-in-one bakery shop in Gurugram, Haryana.',
      },
    };
  }

  const title = occasion.seoTitle || `${occasion.name} | TVO Flavours`;
  const rawDescription =
    occasion.seoDescription ||
    occasion.description ||
    `${occasion.name} celebration cakes and desserts from TVO Flavours. The all-in-one bakery shop in Gurugram, Haryana.`;
  const description = stripHtmlAndMetadata(rawDescription).slice(0, 160).trim();
  const canonicalUrl = `${siteUrl}/occasion/${occasion.slug}`;

  let ogImageUrl: string;
  if (occasion.bannerImage) {
    const normalized = normalizeImageUrl(occasion.bannerImage);
    ogImageUrl = normalized.startsWith('http')
      ? normalized
      : `${siteUrl}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  } else {
    ogImageUrl = `${siteUrl}/images/brand/logo.png`;
  }

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      siteName: 'TVO Flavours',
      locale: 'en_IN',
      images: [{ url: ogImageUrl, alt: occasion.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function OccasionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
