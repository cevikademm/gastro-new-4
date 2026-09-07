// Ülkeye göre otomatik dil yönlendirmesi (sunucu tarafı).
//
// Kök URL'ler Almanca ve YALNIZCA Almanca indeksleniyor (lib/locales.ts →
// INDEXABLE_LOCALES). Bu yüzden yönlendirme üç kuralla sınırlı tutulur:
//   1) Arama motoru botlarına ASLA uygulanmaz — Googlebot ABD'den gelir ve
//      /en/'e yönlendirilirse Almanca sayfa indeksten düşer.
//   2) Yalnızca İLK ziyarette (2mc_lang çerezi yokken). Kullanıcının kendi
//      dil seçimi her zaman üstün gelir; seçim çereze yazılır (src/i18n/index.ts).
//   3) Yalnızca ÇEVİRİSİ TAM olan dillere. Yarım çevrilmiş bir dile yönlendirmek
//      Almanca kalmaktan kötüdür.
//
// Yanıt kullanıcıya özel olduğu için 302 + `Cache-Control: private, no-store`
// ile döner — CDN bunu paylaşırsa herkes aynı dile yönlendirilirdi.
import { DEFAULT_LOCALE, isLocale, splitLocale, type Locale } from '../../lib/locales';

/** Çevirisi bitmiş diller. Yeni bir dil tamamlandıkça buraya eklenir. */
export const AUTO_REDIRECT_LOCALES: readonly Locale[] = ['tr', 'en', 'nl', 'fr', 'es'];

/** Ülke kodu → dil. Yalnızca AUTO_REDIRECT_LOCALES'teki diller listelenir. */
const COUNTRY_LOCALE: Record<string, Locale> = {
  TR: 'tr',
  NL: 'nl',
  FR: 'fr', LU: 'fr', MC: 'fr',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es',
  GT: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', NI: 'es', CR: 'es', PA: 'es',
  UY: 'es', SV: 'es', CU: 'es', PR: 'es',
  GB: 'en', IE: 'en', US: 'en', CA: 'en', AU: 'en', NZ: 'en', ZA: 'en', IN: 'en',
  SG: 'en', MT: 'en', PH: 'en', NG: 'en', KE: 'en',
  // DE/AT/CH listelenmez: zaten varsayılan Almanca.
};

const BOT_UA = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|sogou|exabot|facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|ia_archiver|ahrefs|semrush|mj12|dotbot|petalbot|gptbot|claudebot|claude-web|anthropic|perplexity|ccbot|google-extended|chatgpt-user|oai-searchbot|bytespider|amazonbot|lighthouse|headlesschrome|pagespeed/i;

/** Statik dosya / API — dil yönlendirmesi uygulanmaz. */
const NON_PAGE = /^\/(api|assets|brand-logos|3d|models)\/|\.[a-z0-9]{2,5}$/i;

export interface GeoReq {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}

function header(req: GeoReq, name: string): string {
  const v = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return (Array.isArray(v) ? v[0] : v) || '';
}

/** Çerezden kayıtlı dil tercihi. Varsa yönlendirme yapılmaz. */
function storedLocale(cookieHeader: string): string | null {
  const m = cookieHeader.match(/(?:^|;\s*)2mc_lang=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Belçika/İsviçre gibi çok dilli ülkelerde ülke kodu tek başına yetmez —
 * tarayıcının Accept-Language'ı ayırt edici olur.
 */
function fromAcceptLanguage(accept: string): Locale | null {
  for (const part of accept.split(',')) {
    const tag = part.split(';')[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(tag) && (AUTO_REDIRECT_LOCALES as readonly string[]).includes(tag)) return tag as Locale;
    if (tag === 'de') return DEFAULT_LOCALE; // Almanca isteyen kök URL'de kalsın
  }
  return null;
}

function pickLocale(country: string, accept: string): Locale | null {
  if (country === 'BE' || country === 'CH') return fromAcceptLanguage(accept);
  const byCountry = COUNTRY_LOCALE[country];
  if (byCountry) return byCountry;
  // Eşlenmemiş ülke: tarayıcı dili tam çevrilmiş bir dile denk geliyorsa ona git,
  // aksi halde Almanca kal (mevcut davranış).
  return fromAcceptLanguage(accept);
}

/**
 * Yönlendirme gerekiyorsa hedef yolu ve dili döndürür, gerekmiyorsa null.
 * @param url İstek yolu (query dahil olabilir)
 */
export function geoRedirect(req: GeoReq, url: string): { to: string; locale: Locale } | null {
  if (req.method && req.method !== 'GET') return null;

  const [pathname, query] = url.split('?');
  if (NON_PAGE.test(pathname)) return null;

  // Zaten bir dil önekindeyse dokunma.
  const { locale: current } = splitLocale(pathname);
  if (current !== DEFAULT_LOCALE) return null;

  // Kullanıcının kendi seçimi her zaman üstün.
  if (storedLocale(header(req, 'cookie'))) return null;

  // Botlar asla yönlendirilmez (Almanca indekslemeyi korur).
  if (BOT_UA.test(header(req, 'user-agent'))) return null;

  const country = header(req, 'x-vercel-ip-country').toUpperCase();
  const accept = header(req, 'accept-language');
  if (!country && !accept) return null;

  const target = pickLocale(country, accept);
  if (!target || target === DEFAULT_LOCALE) return null;
  if (!(AUTO_REDIRECT_LOCALES as readonly string[]).includes(target)) return null;

  const rest = pathname === '/' ? '' : pathname;
  return { to: `/${target}${rest}${query ? `?${query}` : ''}`, locale: target };
}
