import { MASTER_5_MAIN_CATEGORIES } from './masterCatalogHierarchy';
import { RESTRUCTURED_MASTER_PRODUCTS } from './productOrganizer';
import { Product } from './types';

export interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export function generateSitemapUrls(baseUrl: string = 'https://tvoflavours.com'): SitemapUrl[] {
  const urls: SitemapUrl[] = [
    {
      loc: `${baseUrl}/`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 1.0,
    },
  ];

  // 5 Main Categories
  MASTER_5_MAIN_CATEGORIES.forEach((main) => {
    urls.push({
      loc: `${baseUrl}${main.canonicalUrl}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 0.9,
    });

    // Subcategories
    main.subcategories.forEach((sub) => {
      urls.push({
        loc: `${baseUrl}${sub.canonicalUrl}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.8,
      });

      // Child categories
      sub.childCategories?.forEach((child) => {
        urls.push({
          loc: `${baseUrl}${child.canonicalUrl}`,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: 0.8,
        });
      });
    });
  });

  // Products
  RESTRUCTURED_MASTER_PRODUCTS.forEach((prod) => {
    urls.push({
      loc: `${baseUrl}/product/${prod.slug}`,
      lastmod: (prod.updatedAt || new Date().toISOString()).split('T')[0],
      changefreq: 'weekly',
      priority: 0.7,
    });
  });

  return urls;
}

export function generateBreadcrumbJsonLd(
  breadcrumbs: { name: string; url: string }[],
  baseUrl: string = 'https://tvoflavours.com'
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: crumb.name,
      item: crumb.url.startsWith('http') ? crumb.url : `${baseUrl}${crumb.url}`,
    })),
  };
}

export function generateProductJsonLd(product: Product, baseUrl: string = 'https://tvoflavours.com') {
  const primaryWeight = product.weightOptions?.find((w) => w.isDefault) || product.weightOptions?.[0];
  const primaryImg = product.images?.[0]?.url || '';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: primaryImg,
    description: product.shortDescription || product.name,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: primaryWeight?.price || 0,
      availability: product.stockStatus === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/product/${product.slug}`,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating || 4.9,
      reviewCount: product.reviewCount || 30,
    },
  };
}
