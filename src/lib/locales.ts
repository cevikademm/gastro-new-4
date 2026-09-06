/**
 * locales.ts — dil listesi TEK kaynak (i18n, SEO, sitemap, renderer hepsi buradan okur).
 *
 * URL şeması (Almanca-önce):
 *   de  → kök  (/kuehlung)
 *   xx  → /xx/…  (/tr/kuehlung, /en/kuehlung) — aynı Almanca slug'lar
 *
 * INDEXABLE_LOCALES: hreflang kümesine giren ve sitemap'te listelenen diller.
 * Diğer diller `noindex,follow` alır (çeviri içeriği yokken Google'a kopya
 * sayfa göstermemek için). Tam çeviri geldikçe buraya eklenir.
 */
export const LOCALES = [
  'de', 'tr', 'en', 'fr', 'nl', 'it', 'es', 'pt', 'pl', 'cs', 'ro', 'el', 'sv', 'da', 'hu',
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'de';

/**
 * Şimdilik yalnızca Almanca indekslenir. /tr/blog gibi gerçekten Türkçe içerikli
 * sayfalar `forceIndex` ile istisna alır (SEO.tsx / makeModel); /tr/kuehlung gibi
 * Almanca içerikli dil varyantları noindex kalır (kopya içerik).
 */
export const INDEXABLE_LOCALES: readonly Locale[] = ['de'];

/** Open Graph `og:locale` karşılıkları. */
export const OG_LOCALE: Record<Locale, string> = {
  de: 'de_DE', tr: 'tr_TR', en: 'en_GB', fr: 'fr_FR', nl: 'nl_NL', it: 'it_IT', es: 'es_ES',
  pt: 'pt_PT', pl: 'pl_PL', cs: 'cs_CZ', ro: 'ro_RO', el: 'el_GR', sv: 'sv_SE', da: 'da_DK', hu: 'hu_HU',
};

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

/** `/tr/kuehlung` → { locale:'tr', path:'/kuehlung' } · `/kuehlung` → { locale:'de', path:'/kuehlung' } */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const m = clean.match(/^\/([a-z]{2})(?=\/|$)(.*)$/);
  if (m && isLocale(m[1]) && m[1] !== DEFAULT_LOCALE) {
    const rest = m[2] || '/';
    return { locale: m[1], path: rest === '' ? '/' : rest };
  }
  return { locale: DEFAULT_LOCALE, path: clean === '' ? '/' : clean };
}

/** Bir (locale, path) çiftinden URL yolu üretir. `de` köke gider. */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}
