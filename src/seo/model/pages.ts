/**
 * pages.ts — her SEO rota türü için PageModel üreticileri (saf TS, async veri).
 * React sayfaları title/description/JSON-LD paritesi için aynı yardımcıları kullanır.
 */
import {
  SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl,
  organizationSchema, storeSchema, websiteSchema, breadcrumbSchema, collectionPageSchema,
  itemListSchema, brandSchema, productSchema, faqSchema, articleSchema,
} from '../../lib/seo';
import { localePath, INDEXABLE_LOCALES } from '../../lib/locales';
import { COMPANY_INFO } from '../../lib/companyInfo';
import { CATEGORY_TREE, findCategory, findSubcategory, type SeoCategory, type SeoSubcategory } from '../../content/seo/categoryTree.de';
import { BRANDS_DE, findBrand } from '../../content/seo/brands.de';
import { BRANCHEN_DE, findBranche } from '../../content/seo/branchen.de';
import { STAEDTE_DE, findCity } from '../../content/seo/staedte.de';
import { BLOG_POSTS } from '../../content/blog/posts';
import { COMPETITORS } from '../../content/compare/competitors';
import ratgeberIndex from '../../content/ratgeber/index.generated.json';
import type { RatgeberEntry } from '../../content/ratgeber/types';
import { RATGEBER_CATEGORY_LABEL } from '../../content/ratgeber/types';
import { STATIC_PAGES } from '../routes';
import type { PageModel, SeoRoute, ProductSeoRow } from '../types';
import { getProductBySlug, getProductByLegacyId, listProducts, getCounts, sumCounts, getRelated, type ProductCard } from '../data/supabase';
import { esc, a, ul, breadcrumbNav, faqHtml, productGridHtml, paginationHtml, fmtNet } from '../render/html';
import { makeModel, page } from './common';

const RATGEBER: RatgeberEntry[] = (ratgeberIndex as unknown as RatgeberEntry[]).filter((r) => r.status === 'published');
const PER_PAGE = 24;
const HOME_CRUMB = { name: 'Startseite', url: '/' };

/** Sayfa numarası: ?page=n (1..) */
function pageOf(route: SeoRoute): number {
  const n = parseInt(route.query.page || '1', 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}
/** page dışındaki query'ler (sort/preis/marke/q) → noindex + temiz canonical */
function hasFilterQuery(route: SeoRoute): boolean {
  return Object.keys(route.query).some((k) => k !== 'page');
}

function pageSuffix(n: number): string {
  return n > 1 ? ` – Seite ${n}` : '';
}

/* ─── Home ─────────────────────────────────────────────────────────────── */
export async function homeModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const counts = await getCounts();
  const cats = CATEGORY_TREE.filter((c) => c.published).map((c) => {
    const n = sumCounts(counts, (r) => r.category_slug === c.slug);
    return `<li>${a(L, `/${c.slug}`, c.name)}${n ? ` <small>(${n} Produkte)</small>` : ''} – ${esc(c.description.split('.')[0])}.</li>`;
  }).join('');
  const branchen = BRANCHEN_DE.filter((b) => b.published).map((b) => `<li>${a(L, `/branche/${b.slug}`, b.name)}</li>`).join('');
  const brands = BRANDS_DE.map((b) => `<li>${a(L, `/marke/${b.slug}`, b.name)} – ${esc(b.country)}</li>`).join('');
  const faqs = [
    { q: 'Was ist 2MC Gastro?', a: '2MC Gastro ist ein Fachhändler für Gastronomiebedarf und Großküchentechnik mit Sitz in Köln. Wir führen über 14.000 Produkte von Diamond, CombiSteel und HENDI, planen Küchen kostenlos in 2D und 3D und liefern in ganz Deutschland.' },
    { q: 'Sind die Preise netto oder brutto?', a: 'Alle Preise sind Netto-Preise für Gewerbekunden zzgl. 19 % MwSt. Sie erhalten eine ordnungsgemäße Rechnung mit ausgewiesener Umsatzsteuer.' },
    { q: 'Wie schnell liefern Sie?', a: 'Lagerware versenden wir in der Regel innerhalb von 1–3 Werktagen; Großgeräte per Spedition frei Bordsteinkante, in NRW mit eigenem Fahrzeug inklusive Vertragen und Aufstellung.' },
    { q: 'Kann ich meine Küche vorab planen?', a: 'Ja. Mit dem kostenlosen 3D-Küchenplaner zeichnen Sie Wände, Türen und Fenster, platzieren Geräte in Originalmaßen und erhalten aus dem Projekt direkt ein Angebot.' },
    { q: 'Bieten Sie Leasing oder Finanzierung an?', a: 'Ja, auf Anfrage vermitteln wir Leasing und Mietkauf für Gewerbekunden – ab einem Nettowarenwert von 1.000 €.' },
  ];
  const body = page(L,
    `<h1>Gastronomiebedarf &amp; Großküchentechnik aus Köln – 2MC Gastro</h1>` +
    `<p>2MC Gastro ist Ihr Fachhändler für professionelle Küchentechnik: über 14.000 Produkte von <strong>Diamond</strong>, <strong>CombiSteel</strong> und <strong>HENDI</strong> – Kochgeräte, Kühltechnik, Spülmaschinen, Edelstahlmöbel, Lüftung und Kleingeräte. Netto-Preise für Gewerbekunden, kostenlose 2D/3D-Küchenplanung und Lieferung in ganz Deutschland; in Nordrhein-Westfalen mit eigenem Fahrzeug und Montage.</p>` +
    `<section><h2>Produktkategorien</h2><ul>${cats}</ul></section>` +
    `<section><h2>Küche planen in 2D &amp; 3D – kostenlos</h2><p>Zeichnen Sie Ihren Grundriss, platzieren Sie Geräte in Originalmaßen und erzeugen Sie aus dem Projekt ein Angebot. ${a(L, '/3d-design', 'Zum 3D-Küchenplaner')}.</p></section>` +
    `<section><h2>Lösungen nach Branche</h2><ul>${branchen}</ul></section>` +
    `<section><h2>Marken</h2><ul>${brands}</ul></section>` +
    `<section><h2>Warum 2MC Gastro?</h2>${ul([
      'Netto-Preise mit ordnungsgemäßer B2B-Rechnung, Leasing auf Anfrage',
      'Lagerware in 1–3 Werktagen, Großgeräte per Spedition frei Bordsteinkante',
      'Persönliche Beratung in Köln, Planung und Angebot aus einer Hand',
      'Täglich aktualisierte Preise und Lagerbestände direkt vom Hersteller',
      'Vergleich, Merkliste und Projektverwaltung für Planer und Betreiber',
    ])}</section>` +
    faqHtml(faqs) +
    `<section><h2>Kontakt</h2><p>${esc(COMPANY_INFO.legalName)}, ${esc(COMPANY_INFO.address)} · Tel. ${esc(COMPANY_INFO.phoneDisplay)} · ${esc(COMPANY_INFO.email)}</p></section>`,
  );
  return makeModel(route, {
    title: 'Gastronomiebedarf & Großküchentechnik kaufen – Köln',
    rawTitle: false,
    description: 'Gastronomiebedarf und Großküchentechnik von Diamond, CombiSteel und HENDI: Kochgeräte, Kühlung, Spülmaschinen, Edelstahlmöbel und Lüftung. Netto-Preise, kostenlose 3D-Küchenplanung, Lieferung in ganz Deutschland – 2MC Gastro Köln.',
    path: '/',
    jsonLd: [organizationSchema(), storeSchema(), websiteSchema(), faqSchema(faqs.map((f) => ({ question: f.q, answer: f.a })))],
    body,
    cacheSeconds: 1800,
  });
}

/* ─── Shop (/produkte) ─────────────────────────────────────────────────── */
export async function shopModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const filtered = Object.keys(route.query).length > 0;
  const counts = await getCounts();
  const cats = CATEGORY_TREE.filter((c) => c.published).map((c) => {
    const n = sumCounts(counts, (r) => r.category_slug === c.slug);
    const subs = c.children.filter((s) => s.published !== false).map((s) => a(L, `/${c.slug}/${s.slug}`, s.name)).join(', ');
    return `<li>${a(L, `/${c.slug}`, c.name)}${n ? ` (${n})` : ''}<br><small>${subs}</small></li>`;
  }).join('');
  const { rows } = await listProducts({ page: 1, perPage: 24 });
  const body = page(L,
    breadcrumbNav(L, [HOME_CRUMB, { name: 'Alle Produkte', url: '/produkte' }]) +
    `<h1>Alle Produkte – Gastronomiebedarf von A bis Z</h1>` +
    `<p>Über 14.000 Artikel für Gastronomie, Hotellerie und Gemeinschaftsverpflegung. Wählen Sie eine Kategorie oder suchen Sie nach Artikelnummer, Marke oder Gerätetyp.</p>` +
    `<section><h2>Kategorien</h2><ul>${cats}</ul></section>` +
    productGridHtml(L, rows, 'Empfohlene Produkte'),
  );
  return makeModel(route, {
    title: 'Alle Produkte – Gastronomiebedarf & Großküchentechnik',
    description: 'Über 14.000 Produkte für Gastronomie und Großküche: Kochgeräte, Kühlung, Spültechnik, Edelstahlmöbel, Lüftung, Kleingeräte. Diamond, CombiSteel, HENDI – Netto-Preise, schnelle Lieferung.',
    path: '/produkte',
    noindex: filtered,
    jsonLd: [breadcrumbSchema([HOME_CRUMB, { name: 'Alle Produkte', url: '/produkte' }]), collectionPageSchema({ name: 'Alle Produkte', url: '/produkte' })],
    body,
  });
}

/* ─── Kategorie / Unterkategorie ───────────────────────────────────────── */
function categoryText(c: SeoCategory): string {
  return c.sections.map((s) => `<section><h2>${esc(s.h2)}</h2>${s.html}</section>`).join('');
}

export async function categoryModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const cat = findCategory(route.params.category);
  if (!cat) return notFoundModel(route);
  const pg = pageOf(route);
  const filtered = hasFilterQuery(route);
  const [counts, list] = await Promise.all([
    getCounts(),
    listProducts({ category: cat.slug, page: pg, perPage: PER_PAGE }),
  ]);
  const total = list.total;
  const subs = cat.children.filter((s) => s.published !== false).map((s) => {
    const n = sumCounts(counts, (r) => r.category_slug === cat.slug && r.subcategory_slug === s.slug);
    return `<li>${a(L, `/${cat.slug}/${s.slug}`, s.name)}${n ? ` <small>(${n})</small>` : ''} – ${esc(s.description.split('.')[0])}.</li>`;
  }).join('');
  const brands = BRANDS_DE.map((b) => {
    const n = sumCounts(counts, (r) => r.category_slug === cat.slug && r.brand_slug === b.slug);
    return n >= 12 ? `<li>${a(L, `/marke/${b.slug}/${cat.slug}`, `${cat.name} von ${b.name}`)} (${n})</li>` : '';
  }).join('');
  const related = RATGEBER.filter((r) => r.relatedCategories.includes(cat.slug)).slice(0, 6)
    .map((r) => `<li>${a(L, `/ratgeber/${r.slug}`, r.title)}</li>`).join('');
  const siblings = CATEGORY_TREE.filter((c) => c.published && c.slug !== cat.slug).map((c) => `<li>${a(L, `/${c.slug}`, c.name)}</li>`).join('');
  const crumbs = [HOME_CRUMB, { name: cat.name, url: `/${cat.slug}` }];
  const body = page(L,
    breadcrumbNav(L, crumbs) +
    `<h1>${esc(cat.h1)}${esc(pageSuffix(pg))}</h1>` +
    `<p>${esc(cat.intro)}</p>` +
    (subs ? `<section><h2>Unterkategorien</h2><ul>${subs}</ul></section>` : '') +
    productGridHtml(L, list.rows, `${cat.name}: ${total ? `${total} Produkte` : 'Produkte'}`) +
    paginationHtml(L, `/${cat.slug}`, pg, total, PER_PAGE) +
    (pg === 1 ? categoryText(cat) : '') +
    (pg === 1 ? faqHtml(cat.faqs) : '') +
    (brands ? `<section><h2>${esc(cat.name)} nach Marke</h2><ul>${brands}</ul></section>` : '') +
    (related ? `<section><h2>Ratgeber zu ${esc(cat.name)}</h2><ul>${related}</ul></section>` : '') +
    `<section><h2>Weitere Kategorien</h2><ul>${siblings}</ul></section>`,
  );
  const jsonLd = [
    breadcrumbSchema(crumbs),
    collectionPageSchema({ name: cat.h1, url: `/${cat.slug}`, description: cat.description }),
    itemListSchema(list.rows.map((r) => ({ name: r.name_de, url: `/produkt/${r.slug}`, image: r.image || undefined }))),
    ...(pg === 1 && cat.faqs.length ? [faqSchema(cat.faqs.map((f) => ({ question: f.q, answer: f.a })))] : []),
  ];
  return makeModel(route, {
    title: `${cat.title}${pageSuffix(pg)}`,
    description: cat.description,
    path: `/${cat.slug}`,
    canonicalQuery: pg > 1 && !filtered ? `?page=${pg}` : '',
    noindex: filtered || !cat.published,
    jsonLd,
    body,
  });
}

export async function subcategoryModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const cat = findCategory(route.params.category);
  const sub = cat ? findSubcategory(cat.slug, route.params.subcategory) : undefined;
  if (!cat || !sub) return notFoundModel(route);
  const pg = pageOf(route);
  const filtered = hasFilterQuery(route);
  const [counts, list] = await Promise.all([
    getCounts(),
    listProducts({ category: cat.slug, subcategory: sub.slug, page: pg, perPage: PER_PAGE }),
  ]);
  const total = list.total;
  const thin = total < 4;
  const brands = BRANDS_DE.map((b) => {
    const n = sumCounts(counts, (r) => r.category_slug === cat.slug && r.subcategory_slug === sub.slug && r.brand_slug === b.slug);
    return n ? `<li>${esc(b.name)}: ${n} Produkte (${a(L, `/marke/${b.slug}/${cat.slug}`, `alle ${cat.name} von ${b.name}`)})</li>` : '';
  }).join('');
  const siblings = cat.children.filter((s) => s.slug !== sub.slug && s.published !== false).map((s) => `<li>${a(L, `/${cat.slug}/${s.slug}`, s.name)}</li>`).join('');
  const related = RATGEBER.filter((r) => r.relatedCategories.includes(cat.slug) || r.relatedCategories.includes(`${cat.slug}/${sub.slug}`)).slice(0, 6)
    .map((r) => `<li>${a(L, `/ratgeber/${r.slug}`, r.title)}</li>`).join('');
  const crumbs = [HOME_CRUMB, { name: cat.name, url: `/${cat.slug}` }, { name: sub.name, url: `/${cat.slug}/${sub.slug}` }];
  const faqs = sub.faqs ?? [];
  const body = page(L,
    breadcrumbNav(L, crumbs) +
    `<h1>${esc(sub.h1)}${esc(pageSuffix(pg))}</h1>` +
    `<p>${esc(sub.intro || sub.description)}</p>` +
    productGridHtml(L, list.rows, `${sub.name}: ${total ? `${total} Produkte` : 'Produkte'}`) +
    paginationHtml(L, `/${cat.slug}/${sub.slug}`, pg, total, PER_PAGE) +
    (pg === 1 ? faqHtml(faqs) : '') +
    (brands ? `<section><h2>Nach Marke</h2><ul>${brands}</ul></section>` : '') +
    (related ? `<section><h2>Ratgeber</h2><ul>${related}</ul></section>` : '') +
    `<section><h2>Weitere ${esc(cat.name)}</h2><ul>${siblings}</ul></section>` +
    `<p>Zurück zu ${a(L, `/${cat.slug}`, cat.h1)}.</p>`,
  );
  return makeModel(route, {
    title: `${sub.title || sub.h1}${pageSuffix(pg)}`,
    description: sub.description,
    path: `/${cat.slug}/${sub.slug}`,
    canonicalQuery: pg > 1 && !filtered ? `?page=${pg}` : '',
    noindex: filtered || thin || sub.published === false || !cat.published,
    jsonLd: [
      breadcrumbSchema(crumbs),
      collectionPageSchema({ name: sub.h1, url: `/${cat.slug}/${sub.slug}`, description: sub.description }),
      itemListSchema(list.rows.map((r) => ({ name: r.name_de, url: `/produkt/${r.slug}`, image: r.image || undefined }))),
      ...(pg === 1 && faqs.length ? [faqSchema(faqs.map((f) => ({ question: f.q, answer: f.a })))] : []),
    ],
    body,
  });
}

/* ─── Produkt ──────────────────────────────────────────────────────────── */
export function productTitle(p: ProductSeoRow): string {
  return `${p.name_de} | ${p.brand} ${p.sku} kaufen`;
}
export function productDescription(p: ProductSeoRow): string {
  const bits: string[] = [];
  if (p.kw) bits.push(`${p.kw} kW`);
  if (p.width_mm && p.depth_mm && p.height_mm) bits.push(`${Math.round(p.width_mm)}×${Math.round(p.depth_mm)}×${Math.round(p.height_mm)} mm`);
  const price = p.price_net && p.price_net > 0 ? `${p.price_net.toLocaleString('de-DE', { minimumFractionDigits: 2 })} € netto zzgl. MwSt.` : 'Preis auf Anfrage';
  const base = `${p.name_de} von ${p.brand} (Art.-Nr. ${p.sku})${bits.length ? ' – ' + bits.join(', ') : ''}. ${price}. Lieferung in ganz Deutschland, B2B-Rechnung, Beratung durch 2MC Gastro Köln.`;
  return base.length > 158 ? base.slice(0, 155).replace(/\s+\S*$/, '') + '…' : base;
}
export function productJsonLd(p: ProductSeoRow, crumbs: Array<{ name: string; url: string }>) {
  return [
    breadcrumbSchema(crumbs),
    productSchema({
      name: p.name_de,
      description: (p.description_de || productDescription(p)).slice(0, 5000),
      image: (p.images && p.images.length ? p.images : p.image ? [p.image] : []) as string[],
      sku: p.sku,
      mpn: p.sku,
      gtin13: p.ean && /^\d{13}$/.test(p.ean) ? p.ean : undefined,
      brand: p.brand,
      price: p.price_net && p.price_net > 0 ? p.price_net : undefined,
      currency: 'EUR',
      availability: p.in_stock ? 'InStock' : 'PreOrder',
      url: `/produkt/${p.slug}`,
      category: p.category_slug ? findCategory(p.category_slug)?.name : undefined,
    }),
  ];
}
export function productCrumbs(p: ProductSeoRow): Array<{ name: string; url: string }> {
  const crumbs = [HOME_CRUMB];
  const cat = p.category_slug ? findCategory(p.category_slug) : undefined;
  if (cat) {
    crumbs.push({ name: cat.name, url: `/${cat.slug}` });
    const sub = p.subcategory_slug ? findSubcategory(cat.slug, p.subcategory_slug) : undefined;
    if (sub) crumbs.push({ name: sub.name, url: `/${cat.slug}/${sub.slug}` });
  } else {
    crumbs.push({ name: 'Alle Produkte', url: '/produkte' });
  }
  crumbs.push({ name: p.name_de, url: `/produkt/${p.slug}` });
  return crumbs;
}

export async function productModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const p = await getProductBySlug(route.params.slug);
  if (!p) return notFoundModel(route);
  const related = await getRelated(p, 8);
  const crumbs = productCrumbs(p);
  const specs = (p.specs || []).slice(0, 40);
  const dims: string[] = [];
  if (p.width_mm) dims.push(`Breite ${Math.round(p.width_mm)} mm`);
  if (p.depth_mm) dims.push(`Tiefe ${Math.round(p.depth_mm)} mm`);
  if (p.height_mm) dims.push(`Höhe ${Math.round(p.height_mm)} mm`);
  if (p.weight_kg) dims.push(`Gewicht ${p.weight_kg} kg`);
  const imgs = (p.images && p.images.length ? p.images : p.image ? [p.image] : []).slice(0, 6)
    .map((src, i) => `<img src="${esc(src)}" alt="${esc(p.name_de)}${i ? ` – Bild ${i + 1}` : ''}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="600" height="600">`).join('');
  const desc = p.description_de ? p.description_de.split(/\n+/).filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('') : '';
  const cat = p.category_slug ? findCategory(p.category_slug) : undefined;
  const brand = findBrand(p.brand_slug);
  const body = page(L,
    breadcrumbNav(L, crumbs) +
    `<article>` +
    `<h1>${esc(p.name_de)}</h1>` +
    `<p><strong>${esc(p.brand)}</strong> · Art.-Nr. ${esc(p.sku)}${p.ean ? ` · EAN ${esc(p.ean)}` : ''}</p>` +
    `<div>${imgs}</div>` +
    `<p><strong>${esc(fmtNet(p.price_net))}</strong> · ${p.in_stock ? 'Lieferbar' : 'Auf Anfrage / Bestellware'} · Lieferung in ganz Deutschland</p>` +
    (desc ? `<section><h2>Produktbeschreibung</h2>${desc}</section>` : '') +
    (dims.length || p.kw ? `<section><h2>Maße &amp; Anschluss</h2>${ul([...(p.kw ? [`Leistung ${p.kw} kW`] : []), ...dims])}</section>` : '') +
    (specs.length ? `<section><h2>Technische Daten</h2><table><tbody>${specs.map((s) => `<tr><th scope="row">${esc(s.label)}</th><td>${esc(s.value)}</td></tr>`).join('')}</tbody></table></section>` : '') +
    `<section><h2>Service von 2MC Gastro</h2>${ul(['Netto-Preis für Gewerbekunden, B2B-Rechnung mit ausgewiesener MwSt.', 'Beratung zu Anschluss, Aufstellung und passendem Zubehör', 'Lieferung per Paket oder Spedition frei Bordsteinkante; in NRW mit Vertragen und Aufstellung', 'Leasing und Mietkauf auf Anfrage', 'Passt das Gerät in Ihre Küche? Prüfen Sie es im kostenlosen 3D-Küchenplaner'])}</section>` +
    `</article>` +
    productGridHtml(L, related, 'Ähnliche Produkte') +
    (cat ? `<p>Alle ${a(L, `/${cat.slug}`, cat.name)}${brand ? ` · Alle Produkte von ${a(L, `/marke/${brand.slug}`, brand.name)}` : ''}</p>` : ''),
  );
  return makeModel(route, {
    title: productTitle(p),
    description: productDescription(p),
    path: `/produkt/${p.slug}`,
    noindex: !p.indexable,
    ogType: 'product',
    ogImage: p.image || DEFAULT_OG_IMAGE,
    jsonLd: productJsonLd(p, crumbs),
    body,
    cacheSeconds: 3600,
  });
}

export async function legacyProductModel(route: SeoRoute): Promise<PageModel> {
  const hit = await getProductByLegacyId(route.params.id);
  if (hit) {
    return makeModel(route, { status: 301, redirectTo: localePath(route.locale, `/produkt/${hit.slug}`), title: 'Weiterleitung', description: '', path: `/produkt/${hit.slug}`, noindex: true, body: '' });
  }
  return notFoundModel(route);
}

/* ─── Marken ───────────────────────────────────────────────────────────── */
export async function brandIndexModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const counts = await getCounts();
  const items = BRANDS_DE.map((b) => {
    const n = sumCounts(counts, (r) => r.brand_slug === b.slug);
    return `<li>${a(L, `/marke/${b.slug}`, b.name)}${n ? ` (${n} Produkte)` : ''} – ${esc(b.country)}: ${esc(b.description.split('.')[0])}.</li>`;
  }).join('');
  const crumbs = [HOME_CRUMB, { name: 'Marken', url: '/marke' }];
  return makeModel(route, {
    title: 'Marken – Diamond, CombiSteel, HENDI',
    description: 'Unsere Hersteller: Diamond (Belgien), CombiSteel und HENDI (Niederlande) – über 14.000 Produkte für Gastronomie und Großküche zu Netto-Preisen bei 2MC Gastro.',
    path: '/marke',
    jsonLd: [breadcrumbSchema(crumbs)],
    body: page(L, breadcrumbNav(L, crumbs) + `<h1>Marken bei 2MC Gastro</h1><p>Drei europäische Hersteller, ein Katalog: Diamond für modulare Kochtechnik, CombiSteel für Kühlung und Edelstahl, HENDI für Kleingeräte und Bar.</p><ul>${items}</ul>`),
  });
}

export async function brandModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const b = findBrand(route.params.brand);
  if (!b) return notFoundModel(route);
  const pg = pageOf(route);
  const [counts, list] = await Promise.all([getCounts(), listProducts({ brandSlug: b.slug, page: pg, perPage: PER_PAGE })]);
  const cats = CATEGORY_TREE.filter((c) => c.published).map((c) => {
    const n = sumCounts(counts, (r) => r.brand_slug === b.slug && r.category_slug === c.slug);
    return n >= 12 ? `<li>${a(L, `/marke/${b.slug}/${c.slug}`, `${c.name} von ${b.name}`)} (${n})</li>` : n ? `<li>${a(L, `/${c.slug}`, c.name)} (${n})</li>` : '';
  }).join('');
  const crumbs = [HOME_CRUMB, { name: 'Marken', url: '/marke' }, { name: b.name, url: `/marke/${b.slug}` }];
  const body = page(L,
    breadcrumbNav(L, crumbs) +
    `<h1>${esc(b.h1)}${esc(pageSuffix(pg))}</h1><p>${esc(b.intro)}</p>` +
    (pg === 1 ? b.sections.map((s) => `<section><h2>${esc(s.h2)}</h2>${s.html}</section>`).join('') : '') +
    (pg === 1 ? `<section><h2>Linien &amp; Untermarken</h2>${ul(b.subBrands.map((s) => `<strong>${esc(s.name)}</strong> – ${esc(s.note)}`))}</section>` : '') +
    `<section><h2>${esc(b.name)} nach Kategorie</h2><ul>${cats}</ul></section>` +
    productGridHtml(L, list.rows, `${b.name} Produkte`) +
    paginationHtml(L, `/marke/${b.slug}`, pg, list.total, PER_PAGE) +
    (pg === 1 ? faqHtml(b.faqs) : ''),
  );
  return makeModel(route, {
    title: `${b.title}${pageSuffix(pg)}`,
    description: b.description,
    path: `/marke/${b.slug}`,
    canonicalQuery: pg > 1 ? `?page=${pg}` : '',
    noindex: hasFilterQuery(route),
    jsonLd: [breadcrumbSchema(crumbs), brandSchema({ name: b.name, url: `/marke/${b.slug}`, description: b.description }), itemListSchema(list.rows.map((r) => ({ name: r.name_de, url: `/produkt/${r.slug}`, image: r.image || undefined }))), ...(pg === 1 && b.faqs.length ? [faqSchema(b.faqs.map((f) => ({ question: f.q, answer: f.a })))] : [])],
    body,
  });
}

export async function brandCategoryModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const b = findBrand(route.params.brand);
  const c = findCategory(route.params.category);
  if (!b || !c) return notFoundModel(route);
  const pg = pageOf(route);
  const list = await listProducts({ brandSlug: b.slug, category: c.slug, page: pg, perPage: PER_PAGE });
  const thin = list.total < 12;
  const crumbs = [HOME_CRUMB, { name: 'Marken', url: '/marke' }, { name: b.name, url: `/marke/${b.slug}` }, { name: c.name, url: `/marke/${b.slug}/${c.slug}` }];
  const subs = c.children.filter((s) => s.published !== false).map((s) => `<li>${a(L, `/${c.slug}/${s.slug}`, s.name)}</li>`).join('');
  const body = page(L,
    breadcrumbNav(L, crumbs) +
    `<h1>${esc(c.name)} von ${esc(b.name)}${esc(pageSuffix(pg))}</h1>` +
    `<p>${esc(b.name)} (${esc(b.country)}) – ${esc(c.intro.split('.').slice(0, 2).join('.'))}. ${list.total ? `${list.total} Produkte` : 'Produkte'} von ${esc(b.name)} in der Kategorie ${esc(c.name)}, Netto-Preise, Lieferung in ganz Deutschland.</p>` +
    productGridHtml(L, list.rows) +
    paginationHtml(L, `/marke/${b.slug}/${c.slug}`, pg, list.total, PER_PAGE) +
    `<section><h2>Unterkategorien ${esc(c.name)}</h2><ul>${subs}</ul></section>` +
    `<p>${a(L, `/${c.slug}`, `Alle ${c.name} (alle Marken)`)} · ${a(L, `/marke/${b.slug}`, `Alle Produkte von ${b.name}`)}</p>`,
  );
  return makeModel(route, {
    title: `${c.name} von ${b.name} kaufen${pageSuffix(pg)}`,
    description: `${c.name} von ${b.name}: ${list.total ? `${list.total} Produkte` : 'Produkte'} zu Netto-Preisen bei 2MC Gastro – ${c.description.split('.')[0]}. Lieferung in ganz Deutschland.`,
    path: `/marke/${b.slug}/${c.slug}`,
    canonicalQuery: pg > 1 ? `?page=${pg}` : '',
    noindex: thin || hasFilterQuery(route),
    jsonLd: [breadcrumbSchema(crumbs), collectionPageSchema({ name: `${c.name} von ${b.name}`, url: `/marke/${b.slug}/${c.slug}` }), itemListSchema(list.rows.map((r) => ({ name: r.name_de, url: `/produkt/${r.slug}`, image: r.image || undefined })))],
    body,
  });
}

/* ─── Branchen ─────────────────────────────────────────────────────────── */
export async function brancheIndexModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const items = BRANCHEN_DE.filter((b) => b.published).map((b) => `<li>${a(L, `/branche/${b.slug}`, b.h1)} – ${esc(b.description.split('.')[0])}.</li>`).join('');
  const crumbs = [HOME_CRUMB, { name: 'Branchen', url: '/branche' }];
  return makeModel(route, {
    title: 'Branchenlösungen – Ausstattung nach Betriebstyp',
    description: 'Küchenausstattung nach Branche: Restaurant, Hotel, Pizzeria, Dönerladen, Imbiss, Bäckerei, Metzgerei, Kantine, Krankenhaus, Schule, Eisdiele, Bar, Foodtruck und Catering – mit Beispielkonfigurationen und Vorschriften.',
    path: '/branche',
    jsonLd: [breadcrumbSchema(crumbs)],
    body: page(L, breadcrumbNav(L, crumbs) + `<h1>Ausstattung nach Branche</h1><p>Jeder Betriebstyp hat eigene Anforderungen an Kochtechnik, Kühlung, Ausgabe und Hygiene. Wählen Sie Ihre Branche: Sie erhalten die Grundausstattung, drei Beispielkonfigurationen und die geltenden Vorschriften – und können alles direkt im 3D-Küchenplaner umsetzen.</p><ul>${items}</ul>`),
  });
}

export async function brancheModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const b = findBranche(route.params.slug);
  if (!b) return notFoundModel(route);
  const crumbs = [HOME_CRUMB, { name: 'Branchen', url: '/branche' }, { name: b.name, url: `/branche/${b.slug}` }];
  const others = BRANCHEN_DE.filter((x) => x.published && x.slug !== b.slug).map((x) => `<li>${a(L, `/branche/${x.slug}`, x.name)}</li>`).join('');
  const body = page(L,
    breadcrumbNav(L, crumbs) +
    `<article><h1>${esc(b.h1)}</h1><p>${esc(b.intro)}</p>` +
    `<section><h2>Planungsgrundlagen</h2>${ul(b.planning.map(esc))}</section>` +
    `<section><h2>Grundausstattung</h2>${ul(b.equipment.map((e) => `${a(L, e.path, e.label)}${e.note ? ` – ${esc(e.note)}` : ''}`))}</section>` +
    `<section><h2>Beispielkonfigurationen</h2>${b.configs.map((c) => `<h3>${esc(c.name)}</h3>${ul(c.items.map(esc))}`).join('')}</section>` +
    `<section><h2>Vorschriften &amp; Normen</h2>${ul(b.regulations.map((r) => `<a href="${esc(r.url)}" rel="noopener" target="_blank">${esc(r.label)}</a> – ${esc(r.note)}`))}</section>` +
    `<section><h2>Kostenlos planen</h2><p>Übernehmen Sie eine Beispielkonfiguration in den ${a(L, '/3d-design', '3D-Küchenplaner')}, passen Sie Maße und Geräte an und erhalten Sie ein Angebot – oder ${a(L, '/support', 'sprechen Sie mit uns')}.</p></section>` +
    faqHtml(b.faqs) +
    `</article><section><h2>Weitere Branchen</h2><ul>${others}</ul></section>`,
  );
  return makeModel(route, {
    title: b.title,
    description: b.description,
    path: `/branche/${b.slug}`,
    noindex: !b.published,
    jsonLd: [breadcrumbSchema(crumbs), ...(b.faqs.length ? [faqSchema(b.faqs.map((f) => ({ question: f.q, answer: f.a })))] : [])],
    body,
  });
}

/* ─── Städte ───────────────────────────────────────────────────────────── */
export async function cityIndexModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const items = STAEDTE_DE.filter((c) => c.published).map((c) => `<li>${a(L, `/gastronomiebedarf/${c.slug}`, `Gastronomiebedarf ${c.name}`)} – ${c.deliveryZone === 'eigen' ? 'eigene Auslieferung, Montage möglich' : 'Speditionsversand'}, ${esc(c.deliveryDays)}</li>`).join('');
  const crumbs = [HOME_CRUMB, { name: 'Lieferregionen', url: '/gastronomiebedarf' }];
  return makeModel(route, {
    title: 'Gastronomiebedarf in Ihrer Stadt – Lieferung & Beratung',
    description: 'Gastronomiebedarf mit Lieferung und Beratung in Köln, Bonn, Düsseldorf, Essen, Dortmund und ganz Deutschland. Eigene Auslieferung in NRW inklusive Montage, bundesweit per Spedition.',
    path: '/gastronomiebedarf',
    jsonLd: [breadcrumbSchema(crumbs), storeSchema()],
    body: page(L, breadcrumbNav(L, crumbs) + `<h1>Gastronomiebedarf in Ihrer Region</h1><p>2MC Gastro liefert von Köln aus in ganz Deutschland. In Nordrhein-Westfalen fahren wir mit eigenem Fahrzeug, vertragen und stellen auf; bundesweit versenden wir per Spedition frei Bordsteinkante. Wählen Sie Ihre Stadt für Lieferzeiten, Montage und Ansprechpartner.</p><ul>${items}</ul>`),
  });
}

export async function cityModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const c = findCity(route.params.slug);
  if (!c) return notFoundModel(route);
  const crumbs = [HOME_CRUMB, { name: 'Lieferregionen', url: '/gastronomiebedarf' }, { name: c.name, url: `/gastronomiebedarf/${c.slug}` }];
  const cats = CATEGORY_TREE.filter((x) => x.published).slice(0, 8).map((x) => `<li>${a(L, `/${x.slug}`, `${x.name} für ${c.name}`)}</li>`).join('');
  const branchen = BRANCHEN_DE.filter((b) => b.published).slice(0, 8).map((b) => `<li>${a(L, `/branche/${b.slug}`, `${b.name} in ${c.name} ausstatten`)}</li>`).join('');
  const nearby = c.nearby.map((n) => findCity(n)).filter((x): x is NonNullable<typeof x> => !!x && x.published).map((x) => `<li>${a(L, `/gastronomiebedarf/${x.slug}`, x.name)}</li>`).join('');
  const delivery = c.deliveryZone === 'eigen'
    ? `<p>${esc(c.name)} liegt ${c.distanceKm ? `rund ${c.distanceKm} km` : 'direkt'} von unserem Standort in Köln entfernt und gehört zu unserer <strong>eigenen Auslieferungszone</strong>: Lagerware liefern wir in ${esc(c.deliveryDays)} mit eigenem Fahrzeug, auf Wunsch mit Vertragen in die Küche, Aufstellung und Ausrichtung${c.montageAvailable ? ' sowie Montage durch unser Team' : ''}.</p>`
    : `<p>${esc(c.name)} liegt rund ${c.distanceKm} km von Köln entfernt. Wir liefern per <strong>Spedition frei Bordsteinkante</strong> in ${esc(c.deliveryDays)}; Vertragen und Montage organisieren wir auf Anfrage über Partnerbetriebe vor Ort. Beratung und 3D-Planung erfolgen per Video oder Telefon – Angebot und Planung sind ortsunabhängig.</p>`;
  const body = page(L,
    breadcrumbNav(L, crumbs) +
    `<article><h1>Gastronomiebedarf ${esc(c.name)} – Lieferung, Beratung, Küchenplanung</h1>` +
    `<p>Großküchentechnik und Gastronomiebedarf für ${esc(c.name)} (${esc(c.state)}): Kochgeräte, Kühlung, Spültechnik, Edelstahlmöbel und Lüftung von Diamond, CombiSteel und HENDI – zu Netto-Preisen, mit kostenloser 2D/3D-Küchenplanung.</p>` +
    `<section><h2>Lieferung nach ${esc(c.name)}</h2>${delivery}${c.showroomNote ? `<p>${esc(c.showroomNote)}</p>` : ''}</section>` +
    `<section><h2>Gastronomie in ${esc(c.name)}</h2><p>${esc(c.localMix)}</p></section>` +
    `<section><h2>Produkte für Betriebe in ${esc(c.name)}</h2><ul>${cats}</ul></section>` +
    `<section><h2>Branchen in ${esc(c.name)}</h2><ul>${branchen}</ul></section>` +
    (c.references.length ? `<section><h2>Referenzen</h2>${ul(c.references.map((r) => `${esc(r.name)} (${esc(r.type)})`))}</section>` : '') +
    faqHtml(c.faqs) +
    `</article>` +
    (nearby ? `<section><h2>In der Nähe</h2><ul>${nearby}</ul></section>` : ''),
  );
  return makeModel(route, {
    title: `Gastronomiebedarf ${c.name} – Großküchentechnik mit Lieferung`,
    description: `Gastronomiebedarf und Großküchentechnik für ${c.name}: ${c.deliveryZone === 'eigen' ? `eigene Auslieferung in ${c.deliveryDays}, Montage möglich` : `Lieferung per Spedition in ${c.deliveryDays}`}, Netto-Preise, kostenlose 3D-Küchenplanung. Diamond, CombiSteel, HENDI – 2MC Gastro Köln.`,
    path: `/gastronomiebedarf/${c.slug}`,
    noindex: !c.published,
    jsonLd: [breadcrumbSchema(crumbs), storeSchema({ areaServedCity: c.name }), ...(c.faqs.length ? [faqSchema(c.faqs.map((f) => ({ question: f.q, answer: f.a })))] : [])],
    body,
  });
}

/* ─── Ratgeber ─────────────────────────────────────────────────────────── */
export async function ratgeberIndexModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const crumbs = [HOME_CRUMB, { name: 'Ratgeber', url: '/ratgeber' }];
  const items = RATGEBER.map((r) => `<li>${a(L, `/ratgeber/${r.slug}`, r.title)} <small>${esc(RATGEBER_CATEGORY_LABEL[r.category])} · ${esc(r.datePublished)}</small><br>${esc(r.description)}</li>`).join('');
  const body = page(L,
    breadcrumbNav(L, crumbs) +
    `<h1>Ratgeber Gastronomiebedarf &amp; Küchenplanung</h1>` +
    `<p>Kaufberatung, Planungshilfen und Hygiene-Wissen für Gastronomie, Hotellerie und Gemeinschaftsverpflegung – geschrieben von der 2MC Gastro Redaktion auf Basis von Herstellerdaten, Normen und Praxis aus über 1.000 Küchenprojekten.</p>` +
    (items ? `<ul>${items}</ul>` : `<p>Die ersten Ratgeber erscheinen in Kürze. Bis dahin: ${a(L, '/branche', 'Branchenlösungen')} und ${a(L, '/produkte', 'Produktkategorien')}.</p>`),
  );
  return makeModel(route, {
    title: 'Ratgeber – Kaufberatung & Küchenplanung für die Gastronomie',
    description: 'Ratgeber für Gastronomiebedarf: Kombidämpfer, Gastro-Kühlschrank, Spülmaschine, Abzugshaube, Küchenplanung, HACCP und Förderung – praxisnah erklärt von 2MC Gastro.',
    path: '/ratgeber',
    jsonLd: [breadcrumbSchema(crumbs), collectionPageSchema({ name: 'Ratgeber', url: '/ratgeber' })],
    body,
  });
}

export async function ratgeberModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const r = RATGEBER.find((x) => x.slug === route.params.slug);
  if (!r) return notFoundModel(route);
  const crumbs = [HOME_CRUMB, { name: 'Ratgeber', url: '/ratgeber' }, { name: r.title, url: `/ratgeber/${r.slug}` }];
  const rel = r.relatedCategories.map((slug) => {
    const [c, s] = slug.split('/');
    const cat = findCategory(c);
    if (!cat) return '';
    const sub = s ? findSubcategory(c, s) : undefined;
    return `<li>${a(L, `/${slug}`, sub ? sub.name : cat.name)}</li>`;
  }).filter(Boolean).join('');
  const sources = r.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.title)}</a>${s.publisher ? ` – ${esc(s.publisher)}` : ''}</li>`).join('');
  const body = page(L,
    breadcrumbNav(L, crumbs) +
    `<article><h1>${esc(r.title)}</h1><p><em>${esc(RATGEBER_CATEGORY_LABEL[r.category])} · ${esc(r.datePublished)} · ${r.readingMinutes} Min. Lesezeit · ${esc(r.author)}</em></p>` +
    (r.image ? `<img src="${esc(r.image)}" alt="${esc(r.imageAlt)}" width="1200" height="630">` : '') +
    r.html +
    faqHtml(r.faq) +
    (sources ? `<section><h2>Quellen</h2><ul>${sources}</ul></section>` : '') +
    `</article>` +
    (rel ? `<section><h2>Passende Produkte</h2><ul>${rel}</ul></section>` : ''),
  );
  return makeModel(route, {
    title: r.title,
    description: r.description,
    path: `/ratgeber/${r.slug}`,
    ogType: 'article',
    ogImage: r.image ? absoluteUrl(r.image) : DEFAULT_OG_IMAGE,
    jsonLd: [breadcrumbSchema(crumbs), articleSchema({ title: r.title, description: r.description, image: r.image, datePublished: r.datePublished, dateModified: r.dateModified, author: r.author, url: `/ratgeber/${r.slug}` }), ...(r.faq.length ? [faqSchema(r.faq.map((f) => ({ question: f.q, answer: f.a })))] : [])],
    body,
  });
}

/* ─── Blog (Türkçe, /tr/blog) ──────────────────────────────────────────── */
export async function blogIndexModel(route: SeoRoute): Promise<PageModel> {
  if (route.locale === 'de') {
    return makeModel(route, { status: 301, redirectTo: '/ratgeber', title: 'Weiterleitung', description: '', path: '/ratgeber', noindex: true, body: '' });
  }
  const L = route.locale;
  const crumbs = [{ name: 'Ana Sayfa', url: '/' }, { name: 'Blog', url: '/blog' }];
  const items = BLOG_POSTS.map((p) => `<li>${a(L, `/blog/${p.slug}`, p.title)} <small>${esc(p.datePublished)}</small><br>${esc(p.description)}</li>`).join('');
  return makeModel(route, {
    title: 'Blog – Endüstriyel Mutfak Rehberleri',
    description: 'Endüstriyel mutfak kurulumu, ekipman seçimi, HACCP uyumu ve restoran işletmeciliği üzerine Türkçe rehberler – 2MC Gastro.',
    path: '/blog',
    hreflang: false,
    forceIndex: true,
    jsonLd: [breadcrumbSchema(crumbs)],
    body: page(L, breadcrumbNav(L, crumbs) + `<h1>Blog – Endüstriyel Mutfak Rehberleri</h1><ul>${items}</ul>`),
  });
}

export async function blogPostModel(route: SeoRoute): Promise<PageModel> {
  const post = BLOG_POSTS.find((p) => p.slug === route.params.slug);
  if (!post) return notFoundModel(route);
  if (route.locale === 'de') {
    return makeModel(route, { status: 301, redirectTo: localePath('tr', `/blog/${post.slug}`), title: 'Weiterleitung', description: '', path: `/blog/${post.slug}`, noindex: true, body: '' });
  }
  const L = route.locale;
  const crumbs = [{ name: 'Ana Sayfa', url: '/' }, { name: 'Blog', url: '/blog' }, { name: post.title, url: `/blog/${post.slug}` }];
  const html = post.body.split(/\n\n+/).map((blk) => {
    if (blk.startsWith('## ')) return `<h2>${esc(blk.slice(3))}</h2>`;
    if (blk.startsWith('- ')) return `<ul>${blk.split('\n').map((l) => `<li>${esc(l.replace(/^- /, ''))}</li>`).join('')}</ul>`;
    return `<p>${esc(blk)}</p>`;
  }).join('');
  return makeModel(route, {
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    hreflang: false,
    forceIndex: true,
    ogType: 'article',
    jsonLd: [breadcrumbSchema(crumbs), articleSchema({ title: post.title, description: post.description, image: post.image, datePublished: post.datePublished, author: post.author, url: localePath('tr', `/blog/${post.slug}`), inLanguage: 'tr-TR' }), ...(post.faq?.length ? [faqSchema(post.faq)] : [])],
    body: page(L, breadcrumbNav(L, crumbs) + `<article><h1>${esc(post.title)}</h1><p><em>${esc(post.datePublished)} · ${post.readingMinutes} dk</em></p>${html}${post.faq ? faqHtml(post.faq.map((f) => ({ q: f.question, a: f.answer })), 'Sık sorulan sorular') : ''}</article>`),
  });
}

/* ─── Vergleich ────────────────────────────────────────────────────────── */
export async function vergleichIndexModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const crumbs = [HOME_CRUMB, { name: 'Anbietervergleich', url: '/vergleich' }];
  const items = COMPETITORS.map((c) => `<li>${a(L, `/vergleich/${c.slug}`, `2MC Gastro vs. ${c.name}`)}</li>`).join('');
  return makeModel(route, {
    title: 'Anbietervergleich – 2MC Gastro vs. GGM Gastro, Nisbets, BigGastro',
    description: 'Sachlicher Vergleich der Gastronomiebedarf-Anbieter: Sortiment, Planungstools, Beratung, Lieferung und Preise – 2MC Gastro im Vergleich mit GGM Gastro, Nisbets und BigGastro.',
    path: '/vergleich',
    jsonLd: [breadcrumbSchema(crumbs)],
    body: page(L, breadcrumbNav(L, crumbs) + `<h1>Anbietervergleich Gastronomiebedarf</h1><p>Worin unterscheiden sich die großen Anbieter? Wir vergleichen nachprüfbare Kriterien: Sortiment, Marken, Planungswerkzeuge, Beratung, Lieferung und Preisgestaltung.</p><ul>${items}</ul>`),
  });
}

export async function vergleichModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const c = COMPETITORS.find((x) => x.slug === route.params.slug);
  if (!c) return notFoundModel(route);
  const crumbs = [HOME_CRUMB, { name: 'Anbietervergleich', url: '/vergleich' }, { name: `vs. ${c.name}`, url: `/vergleich/${c.slug}` }];
  const rows: Array<[string, string, string]> = [
    ['Sortiment', 'über 14.000 Produkte (Diamond, CombiSteel, HENDI)', `${c.productCount.toLocaleString('de-DE')}+ Produkte`],
    ['Online-3D-Küchenplaner', 'ja, kostenlos im Browser', c.hasDesignTool ? 'ja' : 'nein (Planung nur auf Anfrage)'],
    ['Angebot aus dem Projekt', 'ja, per Klick als PDF', '–'],
    ['Preise', 'netto zzgl. MwSt., B2B', c.pricing === 'low' ? 'günstig' : c.pricing === 'mid' ? 'mittel' : 'Premium'],
    ['Beratung', 'persönlich, Köln + bundesweit per Video', 'Helpcenter / Hotline'],
    ['Sprachen', '15 Sprachen', c.hasMultiLang ? 'mehrsprachig' : 'einsprachig'],
    ['Montage', 'NRW eigenes Team, bundesweit Partner', c.hasInstallation ? 'ja' : 'eingeschränkt'],
  ];
  const table = `<table><thead><tr><th>Kriterium</th><th>2MC Gastro</th><th>${esc(c.name)}</th></tr></thead><tbody>${rows.map((r) => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table>`;
  const faqs = [
    { q: `Ist 2MC Gastro eine Alternative zu ${c.name}?`, a: `Ja – insbesondere wenn Sie Küchenplanung, Angebot und Lieferung aus einer Hand suchen. 2MC Gastro bietet einen kostenlosen 3D-Küchenplaner, persönliche Beratung und über 14.000 Produkte von Diamond, CombiSteel und HENDI zu Netto-Preisen.` },
    { q: 'Sind die Angaben im Vergleich aktuell?', a: `Die Angaben zu ${c.name} stammen aus öffentlich zugänglichen Quellen (Website, Sitemaps, Bewertungsportale) und werden regelmäßig geprüft. Hinweise auf Änderungen nehmen wir gern entgegen.` },
  ];
  return makeModel(route, {
    title: `2MC Gastro vs. ${c.name} – Vergleich Gastronomiebedarf`,
    description: `2MC Gastro und ${c.name} im Vergleich: Sortiment, 3D-Küchenplaner, Beratung, Preise und Lieferung. Nachprüfbare Kriterien für Gastronomen, die einen Lieferanten für Großküchentechnik suchen.`,
    path: `/vergleich/${c.slug}`,
    jsonLd: [breadcrumbSchema(crumbs), faqSchema(faqs.map((f) => ({ question: f.q, answer: f.a })))],
    body: page(L, breadcrumbNav(L, crumbs) + `<article><h1>2MC Gastro vs. ${esc(c.name)}</h1><p>${esc(c.name)} (${esc(c.domain)}) ist ein etablierter Anbieter für Gastronomiebedarf. Der folgende Vergleich stellt nachprüfbare Kriterien gegenüber – ohne Wertung, damit Sie den passenden Lieferanten für Ihr Projekt wählen können.</p>${table}${faqHtml(faqs)}</article>`),
  });
}

/* ─── Statik (yasal / kurumsal) ────────────────────────────────────────── */
export async function staticModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const sp = STATIC_PAGES[route.params.slug];
  if (!sp) return notFoundModel(route);
  const crumbs = [HOME_CRUMB, { name: sp.title.split(' – ')[0], url: `/${route.params.slug}` }];
  const legal = ['impressum', 'datenschutz', 'agb', 'widerruf', 'cookie-richtlinie'].includes(route.params.slug);
  const body = page(L,
    breadcrumbNav(L, crumbs) +
    `<h1>${esc(sp.title.split(' – ')[0])}</h1><p>${esc(sp.description)}</p>` +
    (route.params.slug === 'impressum' ? `<section><h2>Anbieter</h2><p>${esc(COMPANY_INFO.legalName)}<br>${esc(COMPANY_INFO.street)}<br>${esc(COMPANY_INFO.zipCity)}, Deutschland<br>Telefon: ${esc(COMPANY_INFO.phoneDisplay)}<br>E-Mail: ${esc(COMPANY_INFO.email)}<br>USt-IdNr.: ${esc(COMPANY_INFO.vat)}${COMPANY_INFO.register.number ? `<br>Handelsregister: ${esc(COMPANY_INFO.register.number)}, ${esc(COMPANY_INFO.register.court)}` : ''}${COMPANY_INFO.register.managingDirector ? `<br>Geschäftsführer: ${esc(COMPANY_INFO.register.managingDirector)}` : ''}</p></section>` : ''),
  );
  return makeModel(route, {
    title: sp.title,
    rawTitle: sp.title.includes('2MC Gastro'),
    description: sp.description,
    path: `/${route.params.slug}`,
    noindex: false,
    hreflang: !legal,
    jsonLd: [breadcrumbSchema(crumbs), ...(route.params.slug === 'ueber-uns' ? [organizationSchema(), storeSchema()] : [])],
    body,
    cacheSeconds: legal ? 86400 : 3600,
  });
}

/* ─── App kabuğu (noindex) & 404 ───────────────────────────────────────── */
export async function appModel(route: SeoRoute): Promise<PageModel> {
  return makeModel(route, {
    title: SITE_NAME,
    rawTitle: true,
    description: 'Digitale Küchenplanung, Angebote und Projektverwaltung für Gewerbekunden – 2MC Gastro.',
    path: route.path,
    noindex: true,
    hreflang: false,
    body: '',
    cacheSeconds: 0,
  });
}

export async function notFoundModel(route: SeoRoute): Promise<PageModel> {
  const L = route.locale;
  const cats = CATEGORY_TREE.filter((c) => c.published).slice(0, 8).map((c) => `<li>${a(L, `/${c.slug}`, c.name)}</li>`).join('');
  return makeModel(route, {
    status: 404,
    title: 'Seite nicht gefunden (404)',
    description: 'Die angeforderte Seite existiert nicht. Zur Startseite, zu den Produktkategorien oder zur Suche.',
    path: route.path,
    noindex: true,
    hreflang: false,
    body: page(L, `<h1>Seite nicht gefunden</h1><p>Die Adresse ist veraltet oder falsch geschrieben. Vielleicht hilft eine dieser Seiten:</p><ul><li>${a(L, '/', 'Startseite')}</li><li>${a(L, '/produkte', 'Alle Produkte')}</li>${cats}</ul>`),
    cacheSeconds: 300,
  });
}

/** Rota türü → model. */
export async function buildModel(route: SeoRoute): Promise<PageModel> {
  // İndekslenmeyen dillerde ürün/kategori sayfaları için de içerik basılır (kullanıcı görür), robots noindex.
  void INDEXABLE_LOCALES;
  switch (route.kind) {
    case 'home': return homeModel(route);
    case 'shop': return shopModel(route);
    case 'category': return categoryModel(route);
    case 'subcategory': return subcategoryModel(route);
    case 'product': return productModel(route);
    case 'legacyProduct': return legacyProductModel(route);
    case 'brandIndex': return brandIndexModel(route);
    case 'brand': return brandModel(route);
    case 'brandCategory': return brandCategoryModel(route);
    case 'brancheIndex': return brancheIndexModel(route);
    case 'branche': return brancheModel(route);
    case 'cityIndex': return cityIndexModel(route);
    case 'city': return cityModel(route);
    case 'ratgeberIndex': return ratgeberIndexModel(route);
    case 'ratgeber': return ratgeberModel(route);
    case 'blogIndex': return blogIndexModel(route);
    case 'blogPost': return blogPostModel(route);
    case 'vergleichIndex': return vergleichIndexModel(route);
    case 'vergleich': return vergleichModel(route);
    case 'static': return staticModel(route);
    case 'app': return appModel(route);
    default: return notFoundModel(route);
  }
}

export type { ProductCard };
