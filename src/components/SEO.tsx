import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, buildHreflangs } from '../lib/seo';
import { splitLocale, INDEXABLE_LOCALES, OG_LOCALE } from '../lib/locales';

type Props = {
  title?: string;
  description?: string;
  image?: string;
  /** Verilmezse mevcut yol (query'siz) canonical olur. */
  canonical?: string;
  noindex?: boolean;
  type?: 'website' | 'article' | 'product';
  jsonLd?: object | object[];
  /**
   * `true` → canonical URL'e query string de eklenir (örn. ?page=2 self-canonical).
   * Varsayılan `false`: filtre/sıralama parametreleri canonical'a girmez.
   */
  keepQuery?: boolean;
  /** hreflang kümesi basılsın mı (yalnızca çevrilmiş sayfa türlerinde). Varsayılan true. */
  hreflang?: boolean;
  /** Başlığa " | 2MC Gastro" eklenmesin (zaten içeriyorsa). */
  rawTitle?: boolean;
  /** Dil öneki indekslenmeyen bir dil olsa da indeksle (içerik gerçekten o dilde: /tr/blog). */
  forceIndex?: boolean;
};

const MANAGED = 'data-seo-managed';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute(MANAGED, '1');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string, extra?: Record<string, string>) {
  const selector = extra?.hreflang
    ? `link[rel="${rel}"][hreflang="${extra.hreflang}"]`
    : `link[rel="${rel}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute(MANAGED, '1');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  if (extra) Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
}

function clearManagedJsonLd() {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][${MANAGED}]`)
    .forEach((n) => n.remove());
}

function addJsonLd(data: object) {
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.setAttribute(MANAGED, '1');
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

/**
 * Sunucu (api/render.ts / prerender) ile aynı `data-seo-managed` işaretini kullanır:
 * sunucunun bastığı canonical/alternate/ld+json etiketleri React mount olunca
 * buradan silinip yeniden yazılır — çift şema oluşmaz.
 */
export default function SEO({
  title,
  description,
  image,
  canonical,
  noindex,
  type = 'website',
  jsonLd,
  keepQuery = false,
  hreflang = true,
  rawTitle = false,
  forceIndex = false,
}: Props) {
  const location = useLocation();

  useEffect(() => {
    const fullTitle = rawTitle && title ? title : title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const img = image || DEFAULT_OG_IMAGE;
    const path = canonical || (keepQuery ? location.pathname + location.search : location.pathname);
    const canonicalUrl = path.startsWith('http') ? path : `${SITE_URL}${path}`;
    const { locale } = splitLocale(location.pathname);
    const indexableLocale = INDEXABLE_LOCALES.includes(locale) || forceIndex;
    const robots = noindex || !indexableLocale
      ? 'noindex, follow'
      : 'index, follow, max-image-preview:large, max-snippet:-1';

    document.title = fullTitle;

    if (description) upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robots);

    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', img);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', OG_LOCALE[locale]);
    if (description) upsertMeta('property', 'og:description', description);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:image', img);
    if (description) upsertMeta('name', 'twitter:description', description);

    upsertLink('canonical', canonicalUrl);

    // hreflang — path tabanlı (/tr/…); sadece indekslenebilir sayfalarda
    document.head
      .querySelectorAll(`link[rel="alternate"][hreflang][${MANAGED}]`)
      .forEach((n) => n.remove());
    if (hreflang && !noindex) {
      buildHreflangs(location.pathname).forEach(({ hreflang: hl, href }) => {
        const link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', hl);
        link.setAttribute('href', href);
        link.setAttribute(MANAGED, '1');
        document.head.appendChild(link);
      });
    }

    // JSON-LD
    clearManagedJsonLd();
    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      arr.forEach(addJsonLd);
    }
  }, [title, description, image, canonical, noindex, type, jsonLd, keepQuery, hreflang, rawTitle, forceIndex, location.pathname, location.search]);

  return null;
}
