// Canlı prod domain. `2mcgastro.de` → 308 ile buraya gelir; `2mcgastro.com` BİZE AİT
// DEĞİLDİR (301 ile 2mcgastro.eu'ya gider) — SEO alanlarında asla kullanılmaz.
//
// Bu modül React'siz ve `import.meta.env`'siz tutulur: hem tarayıcı (SEO.tsx) hem
// Node (api/render.ts, scripts/seo/*) aynı şema üreticilerini kullanır.
import { COMPANY_INFO } from './companyInfo';
import {
  LOCALES, DEFAULT_LOCALE, INDEXABLE_LOCALES, splitLocale, localePath, type Locale,
} from './locales';

export const SITE_URL = 'https://www.2mcgastro.de';
export const SITE_NAME = '2MC Gastro';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo-2mc-gastro.jpeg`;
export const ORG_ID = `${SITE_URL}/#organization`;
export const STORE_ID = `${SITE_URL}/#store`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Geriye uyumluluk — eski kod `SUPPORTED_LOCALES` okuyordu. */
export const SUPPORTED_LOCALES = LOCALES;
export type { Locale };

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * hreflang kümesi — PATH tabanlı (`/tr/kuehlung`), asla `?lang=` değil.
 * Yalnızca INDEXABLE_LOCALES listelenir; x-default = Almanca (kök).
 * `path` locale önekli de gelebilir; önce soyulur.
 */
export function buildHreflangs(
  path: string,
  opts: { locales?: readonly Locale[] } = {},
): Array<{ hreflang: string; href: string }> {
  const { path: base } = splitLocale(path.split('?')[0]);
  const locales = opts.locales ?? INDEXABLE_LOCALES;
  const out = locales.map((l) => ({ hreflang: l as string, href: absoluteUrl(localePath(l, base)) }));
  out.push({ hreflang: 'x-default', href: absoluteUrl(localePath(DEFAULT_LOCALE, base)) });
  return out;
}

// ── JSON-LD Schema Builders ─────────────────────────────────

const postalAddress = () => ({
  '@type': 'PostalAddress',
  streetAddress: COMPANY_INFO.street,
  addressLocality: COMPANY_INFO.city,
  addressRegion: COMPANY_INFO.region,
  postalCode: COMPANY_INFO.zip,
  addressCountry: COMPANY_INFO.country,
});

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    legalName: COMPANY_INFO.legalName,
    url: `${SITE_URL}/`,
    logo: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE, width: 512, height: 512 },
    foundingDate: COMPANY_INFO.foundingYear,
    telephone: COMPANY_INFO.phoneE164,
    email: COMPANY_INFO.email,
    vatID: COMPANY_INFO.vat,
    address: postalAddress(),
    ...(COMPANY_INFO.sameAs.length ? { sameAs: COMPANY_INFO.sameAs } : {}),
    contactPoint: [{
      '@type': 'ContactPoint',
      telephone: COMPANY_INFO.phoneE164,
      email: COMPANY_INFO.email,
      contactType: 'sales',
      areaServed: ['DE', 'AT', 'CH', 'NL', 'FR', 'BE', 'EU'],
      availableLanguage: ['German', 'Turkish', 'English', 'French', 'Dutch'],
    }],
  };
}

/** Köln mağaza/ofis — LocalBusiness; sahte aggregateRating YOK. */
export function storeSchema(opts: { areaServedCity?: string } = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': ['Store', 'LocalBusiness'],
    '@id': STORE_ID,
    name: SITE_NAME,
    image: DEFAULT_OG_IMAGE,
    url: `${SITE_URL}/`,
    telephone: COMPANY_INFO.phoneE164,
    email: COMPANY_INFO.email,
    priceRange: '€€€',
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Vorkasse, Rechnung, PayPal, Kreditkarte, Leasing',
    address: postalAddress(),
    geo: { '@type': 'GeoCoordinates', latitude: COMPANY_INFO.geo.lat, longitude: COMPANY_INFO.geo.lng },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(COMPANY_INFO.address)}`,
    openingHoursSpecification: COMPANY_INFO.openingHours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    parentOrganization: { '@id': ORG_ID },
    areaServed: opts.areaServedCity
      ? { '@type': 'City', name: opts.areaServedCity }
      : { '@type': 'Country', name: 'Deutschland' },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    inLanguage: 'de-DE',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/produkte?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
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

export function collectionPageSchema(c: { name: string; url: string; description?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: c.name,
    url: absoluteUrl(c.url),
    description: c.description,
    inLanguage: 'de-DE',
    isPartOf: { '@id': WEBSITE_ID },
  };
}

export function itemListSchema(items: Array<{ name: string; url: string; image?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.url),
      ...(it.image ? { image: it.image } : {}),
    })),
  };
}

export function brandSchema(b: { name: string; url: string; logo?: string; description?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Brand',
    name: b.name,
    url: absoluteUrl(b.url),
    ...(b.logo ? { logo: b.logo } : {}),
    ...(b.description ? { description: b.description } : {}),
  };
}

export function productSchema(p: {
  name: string;
  description?: string;
  image?: string | string[];
  sku?: string;
  mpn?: string;
  gtin13?: string;
  brand?: string;
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  url?: string;
  /** YALNIZ gerçek yorum varsa (product_reviews count > 0). Asla sabit değer verme. */
  rating?: { value: number; count: number };
  category?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: p.image,
    sku: p.sku,
    ...(p.mpn ? { mpn: p.mpn } : {}),
    ...(p.gtin13 ? { gtin13: p.gtin13 } : {}),
    ...(p.category ? { category: p.category } : {}),
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    offers: p.price != null && p.price > 0
      ? {
          '@type': 'Offer',
          price: Number(p.price.toFixed(2)),
          priceCurrency: p.currency || 'EUR',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: Number(p.price.toFixed(2)),
            priceCurrency: p.currency || 'EUR',
            valueAddedTaxIncluded: false,
          },
          availability: `https://schema.org/${p.availability || 'InStock'}`,
          itemCondition: 'https://schema.org/NewCondition',
          url: p.url ? absoluteUrl(p.url) : undefined,
          seller: { '@id': ORG_ID },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'DE' },
          },
        }
      : undefined,
    aggregateRating: p.rating && p.rating.count > 0
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
  /** Kişi adı verilirse Person, verilmezse Organization (2MC Gastro Redaktion). */
  author?: string;
  authorType?: 'Person' | 'Organization';
  url: string;
  inLanguage?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    image: a.image ? absoluteUrl(a.image) : DEFAULT_OG_IMAGE,
    datePublished: a.datePublished,
    dateModified: a.dateModified || a.datePublished,
    inLanguage: a.inLanguage || 'de-DE',
    author: { '@type': a.authorType || 'Organization', name: a.author || `${SITE_NAME} Redaktion` },
    publisher: {
      '@type': 'Organization',
      '@id': ORG_ID,
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
    '@id': ORG_ID,
    name: SITE_NAME,
    aggregateRating: aggregate && aggregate.count > 0
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
