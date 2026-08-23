// Canlı prod domain. `2mcgastro.de` → 308 ile buraya gelir; `2mcgastro.com` BİZE AİT
// DEĞİLDİR (301 ile 2mcgastro.eu'ya gider) — SEO alanlarında asla kullanılmaz.
export const SITE_URL = 'https://www.2mcgastro.de';
export const SITE_NAME = '2MC Gastro';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo-2mc-gastro.jpeg`;

export const SUPPORTED_LOCALES = [
  'tr', 'en', 'de', 'fr', 'nl', 'it', 'es', 'pt', 'pl', 'cs', 'da', 'el', 'hu',
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildHreflangs(path: string): Array<{ hreflang: string; href: string }> {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const localized = SUPPORTED_LOCALES.map((l) => ({
    hreflang: l as string,
    href: `${SITE_URL}${clean}${clean.includes('?') ? '&' : '?'}lang=${l}`,
  }));
  return [...localized, { hreflang: 'x-default', href: `${SITE_URL}${clean}` }];
}

// ── JSON-LD Schema Builders ─────────────────────────────────

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_OG_IMAGE,
    telephone: '+49-176-70295844',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Bergisch Gladbacher Str. 172',
      addressLocality: 'Köln',
      postalCode: '51063',
      addressCountry: 'DE',
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function productSchema(p: {
  name: string;
  description?: string;
  image?: string | string[];
  sku?: string;
  brand?: string;
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  url?: string;
  rating?: { value: number; count: number };
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: p.image,
    sku: p.sku,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    offers: p.price != null
      ? {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: p.currency || 'EUR',
          availability: `https://schema.org/${p.availability || 'InStock'}`,
          url: p.url ? absoluteUrl(p.url) : undefined,
        }
      : undefined,
    aggregateRating: p.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: p.rating.value,
          reviewCount: p.rating.count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
  };
}

export function articleSchema(a: {
  title: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    image: a.image ? absoluteUrl(a.image) : DEFAULT_OG_IMAGE,
    datePublished: a.datePublished,
    dateModified: a.dateModified || a.datePublished,
    author: { '@type': 'Organization', name: a.author || SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE },
    },
    mainEntityOfPage: absoluteUrl(a.url),
  };
}

export function faqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  };
}

export function howToSchema(h: {
  name: string;
  description?: string;
  steps: Array<{ name: string; text: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: h.name,
    description: h.description,
    step: h.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function reviewsSchema(reviews: Array<{
  author: string;
  rating: number;
  body: string;
  datePublished?: string;
}>, aggregate?: { value: number; count: number }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    aggregateRating: aggregate
      ? {
          '@type': 'AggregateRating',
          ratingValue: aggregate.value,
          reviewCount: aggregate.count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    review: reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: r.body,
      datePublished: r.datePublished,
    })),
  };
}
