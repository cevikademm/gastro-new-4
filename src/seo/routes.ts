/**
 * routes.ts — SEO rota eşleyici (saf TS). Hem sunucu (api/render.ts, prerender)
 * hem sitemap üretici hem de App.tsx'teki yönlendirme bileşenleri buradan okur.
 *
 * Kök = Almanca. Diğer diller `/xx/...` öneki ile aynı slug'ları kullanır.
 */
import { splitLocale, type Locale } from '../lib/locales';
import { CATEGORY_TREE, findCategory, findSubcategory } from '../content/seo/categoryTree.de';
import { BRANDS_DE } from '../content/seo/brands.de';
import { BRANCHEN_DE } from '../content/seo/branchen.de';
import { STAEDTE_DE } from '../content/seo/staedte.de';
import type { SeoRoute, SeoRouteKind } from './types';

/** Yasal + kurumsal statik sayfalar (InfoPage). Almanca canonical slug → InfoPage slug. */
export const STATIC_PAGES: Record<string, { info: string; title: string; description: string }> = {
  'ueber-uns':        { info: 'about',        title: 'Über uns – 2MC Gastro Köln', description: 'Gewerbliche Küchentechnik aus Köln: Diamond, CombiSteel und HENDI in einem Katalog, kostenlose 2D/3D-Küchenplanung, projektbezogene Angebote und Lieferung in ganz Deutschland.' },
  'karriere':         { info: 'careers',      title: 'Karriere bei 2MC Gastro', description: 'Initiativbewerbungen in Vertrieb, Projektplanung, Logistik und Software sind jederzeit willkommen.' },
  'versand':          { info: 'shipping',     title: 'Versand & Lieferung – Paket, Spedition, Lieferzeiten', description: 'Paketversand mit DHL/UPS/DPD, Großgeräte per Spedition frei Bordsteinkante, auf Wunsch Vertragen und Montage. Lieferzeiten und Versandkosten im Überblick.' },
  'newsletter':       { info: 'newsletter',   title: 'Newsletter – Neue Produkte & Aktionen', description: 'Neue Produkte, Aktionen und Branchentrends einmal im Monat per E-Mail. Jederzeit abbestellbar.' },
  'impressum':        { info: 'imprint',      title: 'Impressum – 2MC Gastro', description: 'Anbieterkennzeichnung gemäß § 5 TMG: 2MC Gastro, Bergisch Gladbacher Str. 172, 51063 Köln.' },
  'datenschutz':      { info: 'privacy',      title: 'Datenschutzerklärung', description: 'Informationen zur Verarbeitung personenbezogener Daten auf www.2mcgastro.de gemäß DSGVO.' },
  'agb':              { info: 'terms',        title: 'Allgemeine Geschäftsbedingungen (AGB)', description: 'AGB von 2MC Gastro für Lieferungen und Leistungen an gewerbliche Kunden.' },
  'widerruf':         { info: 'cancellation', title: 'Widerrufsbelehrung', description: 'Widerrufsrecht und Widerrufsformular für Verbraucher.' },
  'cookie-richtlinie':{ info: 'cookies',      title: 'Cookie-Richtlinie', description: 'Welche Cookies www.2mcgastro.de einsetzt und wie Sie Ihre Einwilligung verwalten.' },
};

/** Uygulama rotaları — kabuk 200 + noindex (Google için içerik yok). */
const APP_PREFIXES = [
  'dashboard', 'design', '3d-design', 'bom', 'katalog', 'checkout', 'kitchen-planner', 'cart',
  'favorites', 'orders', 'teklifler', 'projects', 'settings', 'profile', 'payment', 'account',
  'developers', 'admin', 'login', 'register', 'pending-approval', 'forgot-password', 'old-welcome',
  'welcome', 'degisiklikler', 'changelog', 'support', 'docs', 'resources', 'tools', 'brand',
  'diamond', 'combisteel', 'magaza', 'urunler', 'kategori', 'sektor', 'marka', 'compare', 'help',
  'catalog', 'about', 'careers', 'shipping', 'imprint', 'privacy', 'terms', 'cancellation', 'cookies',
  'suche',
];

function parseQuery(qs: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!qs) return out;
  for (const part of qs.replace(/^\?/, '').split('&')) {
    if (!part) continue;
    const [k, v = ''] = part.split('=');
    try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch { out[k] = v; }
  }
  return out;
}

function route(kind: SeoRouteKind, locale: Locale, path: string, params: Record<string, string> = {}, query: Record<string, string> = {}): SeoRoute {
  return { kind, locale, path, params, query };
}

/** `/tr/kuehlung/kuehlschraenke?page=2` → SeoRoute */
export function matchSeoRoute(url: string): SeoRoute {
  const [rawPath, qs = ''] = url.split('?');
  const decoded = (() => { try { return decodeURIComponent(rawPath); } catch { return rawPath; } })();
  const { locale, path: p0 } = splitLocale(decoded);
  const path = p0.length > 1 ? p0.replace(/\/+$/, '') : p0;
  const query = parseQuery(qs);
  const seg = path.split('/').filter(Boolean);

  if (seg.length === 0) return route('home', locale, '/', {}, query);

  const [a, b, c] = seg;

  if (a === 'produkte' && seg.length === 1) return route('shop', locale, path, {}, query);
  if (a === 'produkt' && b && seg.length === 2) return route('product', locale, path, { slug: b }, query);
  if (a === 'product' && b) return route('legacyProduct', locale, path, { id: seg.slice(1).join('/') }, query);

  if (a === 'marke') {
    if (seg.length === 1) return route('brandIndex', locale, path, {}, query);
    const brand = BRANDS_DE.find((x) => x.slug === b);
    if (!brand) return route('notFound', locale, path, {}, query);
    if (seg.length === 2) return route('brand', locale, path, { brand: b }, query);
    if (seg.length === 3 && findCategory(c)) return route('brandCategory', locale, path, { brand: b, category: c }, query);
    return route('notFound', locale, path, {}, query);
  }

  if (a === 'branche') {
    if (seg.length === 1) return route('brancheIndex', locale, path, {}, query);
    if (seg.length === 2 && BRANCHEN_DE.some((x) => x.slug === b)) return route('branche', locale, path, { slug: b }, query);
    return route('notFound', locale, path, {}, query);
  }

  if (a === 'gastronomiebedarf') {
    if (seg.length === 1) return route('cityIndex', locale, path, {}, query);
    if (seg.length === 2 && STAEDTE_DE.some((x) => x.slug === b)) return route('city', locale, path, { slug: b }, query);
    return route('notFound', locale, path, {}, query);
  }

  if (a === 'ratgeber') {
    if (seg.length === 1) return route('ratgeberIndex', locale, path, {}, query);
    if (seg.length === 2) return route('ratgeber', locale, path, { slug: b }, query);
    return route('notFound', locale, path, {}, query);
  }

  if (a === 'blog') {
    if (seg.length === 1) return route('blogIndex', locale, path, {}, query);
    if (seg.length === 2) return route('blogPost', locale, path, { slug: b }, query);
    return route('notFound', locale, path, {}, query);
  }

  if (a === 'vergleich') {
    if (seg.length === 1) return route('vergleichIndex', locale, path, {}, query);
    if (seg.length === 2) return route('vergleich', locale, path, { slug: b }, query);
    return route('notFound', locale, path, {}, query);
  }

  if (seg.length === 1 && STATIC_PAGES[a]) return route('static', locale, path, { slug: a }, query);

  // Kategori ağacı: /kuehlung, /kuehlung/kuehlschraenke
  const cat = findCategory(a);
  if (cat) {
    if (seg.length === 1) return route('category', locale, path, { category: a }, query);
    if (seg.length === 2 && findSubcategory(a, b)) return route('subcategory', locale, path, { category: a, subcategory: b }, query);
    return route('notFound', locale, path, {}, query);
  }

  if (APP_PREFIXES.includes(a)) return route('app', locale, path, {}, query);

  return route('notFound', locale, path, {}, query);
}

/** Statik prerender + sitemap için sonlu Almanca rota listesi (ürünler hariç). */
export function enumerateStaticPaths(): Array<{ path: string; priority: number; changefreq: string; kind: SeoRouteKind }> {
  const out: Array<{ path: string; priority: number; changefreq: string; kind: SeoRouteKind }> = [];
  out.push({ path: '/', priority: 1.0, changefreq: 'daily', kind: 'home' });
  out.push({ path: '/produkte', priority: 0.9, changefreq: 'daily', kind: 'shop' });
  for (const c of CATEGORY_TREE) {
    if (!c.published) continue;
    out.push({ path: `/${c.slug}`, priority: 0.9, changefreq: 'weekly', kind: 'category' });
    for (const s of c.children) {
      if (s.published === false) continue;
      out.push({ path: `/${c.slug}/${s.slug}`, priority: 0.8, changefreq: 'weekly', kind: 'subcategory' });
    }
  }
  out.push({ path: '/marke', priority: 0.7, changefreq: 'monthly', kind: 'brandIndex' });
  for (const b of BRANDS_DE) {
    out.push({ path: `/marke/${b.slug}`, priority: 0.8, changefreq: 'weekly', kind: 'brand' });
    for (const c of CATEGORY_TREE) {
      if (!c.published) continue;
      out.push({ path: `/marke/${b.slug}/${c.slug}`, priority: 0.6, changefreq: 'weekly', kind: 'brandCategory' });
    }
  }
  out.push({ path: '/branche', priority: 0.8, changefreq: 'monthly', kind: 'brancheIndex' });
  for (const b of BRANCHEN_DE) out.push({ path: `/branche/${b.slug}`, priority: 0.8, changefreq: 'monthly', kind: 'branche' });
  out.push({ path: '/gastronomiebedarf', priority: 0.7, changefreq: 'monthly', kind: 'cityIndex' });
  for (const s of STAEDTE_DE) if (s.published) out.push({ path: `/gastronomiebedarf/${s.slug}`, priority: 0.7, changefreq: 'monthly', kind: 'city' });
  out.push({ path: '/vergleich', priority: 0.6, changefreq: 'monthly', kind: 'vergleichIndex' });
  for (const slug of ['ggm-gastro', 'nisbets', 'biggastro']) out.push({ path: `/vergleich/${slug}`, priority: 0.7, changefreq: 'monthly', kind: 'vergleich' });
  out.push({ path: '/ratgeber', priority: 0.8, changefreq: 'weekly', kind: 'ratgeberIndex' });
  for (const slug of Object.keys(STATIC_PAGES)) {
    const pr = ['impressum', 'datenschutz', 'agb', 'widerruf', 'cookie-richtlinie'].includes(slug) ? 0.2 : 0.5;
    out.push({ path: `/${slug}`, priority: pr, changefreq: 'yearly', kind: 'static' });
  }
  return out;
}
