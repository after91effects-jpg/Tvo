import type { Metadata } from 'next';
import { db } from '../../../lib/server/db';
import { serializeProduct, PRODUCT_BASE_SELECT } from '../../../lib/server/product-serializer';
import { getSiteUrl } from '../../../lib/siteUrl';

interface ProductLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const rawSlug = resolvedParams?.slug || '';
  const slug = decodeURIComponent(rawSlug).trim();
  const siteUrl = getSiteUrl();

  let product: any = null;
  if (slug) {
    try {
      const row = db.prepare(`${PRODUCT_BASE_SELECT} WHERE p.slug=? LIMIT 1`).get(slug);
      if (row) {
        product = serializeProduct(row);
      }
    } catch {
      // Fallback silently if query fails
    }
  }

  if (!product) {
    return {
      title: 'Product | TVO Flavours',
      description: 'The all-in-one bakery shop in Gurugram, Haryana.',
      alternates: {
        canonical: `${siteUrl}/product/${slug}`,
      },
      openGraph: {
        title: 'Product | TVO Flavours',
        description: 'The all-in-one bakery shop in Gurugram, Haryana.',
        url: `${siteUrl}/product/${slug}`,
        type: 'website',
        siteName: 'TVO Flavours',
      },
    };
  }

  const title = product.seoTitle || `${product.name} | TVO Flavours`;
  const description =
    product.seoDescription ||
    product.shortDescription ||
    `Shop ${product.name} from TVO Flavours. View price, available options, product details and delivery information.`;
  const canonicalUrl = `${siteUrl}/product/${product.slug || slug}`;

  const rawImageUrl = product.images?.[0]?.url || '/images/brand/logo.png';
  const ogImageUrl = rawImageUrl.startsWith('http')
    ? rawImageUrl
    : `${siteUrl}${rawImageUrl.startsWith('/') ? '' : '/'}${rawImageUrl}`;

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      siteName: 'TVO Flavours',
      locale: 'en_IN',
      images: [
        {
          url: ogImageUrl,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
