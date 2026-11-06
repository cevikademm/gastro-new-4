/**
 * common.ts — PageModel kurucu + her sayfada tekrar eden site gezinme blokları.
 */
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl, buildHreflangs } from '../../lib/seo';
import { INDEXABLE_LOCALES, localePath, type Locale } from '../../lib/locales';
import { COMPANY_INFO } from '../../lib/companyInfo';
import { CATEGORY_TREE } from '../../content/seo/categoryTree.de';
import { BRANCHEN_DE } from '../../content/seo/branchen.de';
import { STAEDTE_DE } from '../../content/seo/staedte.de';
import { BRANDS_DE } from '../../content/seo/brands.de';
import type { JsonLd, PageModel, SeoRoute } from '../types';
import { a, esc } from '../render/html';

export const ROBOTS_INDEX = 'index, follow, max-image-preview:large, max-snippet:-1';
export const ROBOTS_NOINDEX = 'noindex, follow';

export interface ModelOpts {
  title: string;
  description: string;
  /** Locale öneksiz canonical yol. */
  path: string;
  /** Canonical'a eklenecek query (örn. `?page=2`). */
  canonicalQuery?: string;
  status?: PageModel['status'];
  redirectTo?: string;
  noindex?: boolean;
  /** Dil önekli olsa da indeksle (içerik gerçekten o dilde: /tr/blog). */
  forceIndex?: boolean;
  hreflang?: boolean;
  ogType?: PageModel['ogType'];
  ogImage?: string;
  jsonLd?: JsonLd[];
  body: string;
  cacheSeconds?: number;
  rawTitle?: boolean;
}

export function makeModel(route: SeoRoute, o: ModelOpts): PageModel {
  const indexableLocale = INDEXABLE_LOCALES.includes(route.locale);
  const noindex = !!o.noindex || (!indexableLocale && !o.forceIndex);
  const canonical = absoluteUrl(localePath(route.locale, o.path)) + (o.canonicalQuery || '');
  return {
    status: o.status ?? 200,
    redirectTo: o.redirectTo,
    lang: route.locale,
    title: o.rawTitle ? o.title : `${o.title} | ${SITE_NAME}`,
    description: o.description,
    canonical,
    alternates: !noindex && o.hreflang !== false ? buildHreflangs(o.path) : [],
    robots: noindex ? ROBOTS_NOINDEX : ROBOTS_INDEX,
    ogType: o.ogType ?? 'website',
    ogImage: o.ogImage ?? DEFAULT_OG_IMAGE,
    jsonLd: o.jsonLd ?? [],
    bodyHtml: o.body,
    cacheSeconds: o.cacheSeconds ?? 3600,
  };
}

/** Header gezinme — her gövdede: kategoriler + kurumsal. */
export function siteHeader(locale: Locale): string {
  const cats = CATEGORY_TREE.filter((c) => c.published).map((c) => `<li>${a(locale, `/${c.slug}`, c.name)}</li>`).join('');
  return `<header><p>${a(locale, '/', SITE_NAME)} – Gastronomiebedarf &amp; Großküchentechnik aus Köln</p>` +
    `<nav aria-label="Produktkategorien"><ul>${cats}</ul></nav>` +
    `<nav aria-label="Service"><ul>` +
    `<li>${a(locale, '/produkte', 'Alle Produkte')}</li>` +
    `<li>${a(locale, '/marke', 'Marken')}</li>` +
    `<li>${a(locale, '/branche', 'Branchenlösungen')}</li>` +
    `<li>${a(locale, '/ratgeber', 'Ratgeber')}</li>` +
    `<li>${a(locale, '/3d-design', '3D-Küchenplaner')}</li>` +
    `<li>${a(locale, '/ueber-uns', 'Über uns')}</li>` +
    `</ul></nav></header>`;
}

/** Footer — NAP + yasal + branchen + şehirler (dalga 1). */
export function siteFooter(locale: Locale): string {
  const branchen = BRANCHEN_DE.filter((b) => b.published).map((b) => `<li>${a(locale, `/branche/${b.slug}`, b.name)}</li>`).join('');
  const cities = STAEDTE_DE.filter((c) => c.published).map((c) => `<li>${a(locale, `/gastronomiebedarf/${c.slug}`, `Gastronomiebedarf ${c.name}`)}</li>`).join('');
  const brands = BRANDS_DE.map((b) => `<li>${a(locale, `/marke/${b.slug}`, b.name)}</li>`).join('');
  return `<footer>` +
    `<section><h2>Branchen</h2><ul>${branchen}</ul></section>` +
    `<section><h2>Lieferung &amp; Beratung in Ihrer Region</h2><ul>${cities}</ul></section>` +
    `<section><h2>Marken</h2><ul>${brands}</ul></section>` +
    `<address><strong>${esc(COMPANY_INFO.legalName)}</strong><br>Inhaber: ${esc(COMPANY_INFO.owner)}<br>${esc(COMPANY_INFO.street)}, ${esc(COMPANY_INFO.zipCity)}, Deutschland<br>` +
    `Tel.: <a href="tel:${esc(COMPANY_INFO.phoneE164)}">${esc(COMPANY_INFO.phoneDisplay)}</a> · E-Mail: <a href="mailto:${esc(COMPANY_INFO.email)}">${esc(COMPANY_INFO.email)}</a><br>` +
    `Mo–Sa 09:00–18:00 Uhr · Alle Preise netto zzgl. MwSt.</address>` +
    `<nav aria-label="Rechtliches"><ul>` +
    `<li>${a(locale, '/impressum', 'Impressum')}</li><li>${a(locale, '/datenschutz', 'Datenschutz')}</li>` +
    `<li>${a(locale, '/agb', 'AGB')}</li><li>${a(locale, '/widerruf', 'Widerruf')}</li><li>${a(locale, '/versand', 'Versand')}</li>` +
    `<li><a href="${SITE_URL}/sitemap.xml">Sitemap</a></li><li><a href="${SITE_URL}/llms.txt">llms.txt</a></li>` +
    `</ul></nav></footer>`;
}

export function page(locale: Locale, main: string): string {
  return `${siteHeader(locale)}<main>${main}</main>${siteFooter(locale)}`;
}
