/**
 * src/seo — sunucu tarafı HTML kabuk üreticisi için ortak tipler.
 * React'siz, `import.meta.env`'siz: api/render.ts (Vercel) + scripts/seo/prerender.ts (build)
 * + React sayfaları (title/description/JSON-LD paritesi) aynı modelleri kullanır.
 */
import type { Locale } from '../lib/locales';

export type JsonLd = Record<string, unknown>;

export interface PageModel {
  /** 200 = sayfa; 404 = bulunamadı; 301/308 = yönlendirme; 410 = kaldırıldı. */
  status: 200 | 301 | 308 | 404 | 410;
  redirectTo?: string;
  lang: Locale;
  /** Tam başlık (site adı dahil). */
  title: string;
  description: string;
  /** Mutlak canonical URL. */
  canonical: string;
  alternates: Array<{ hreflang: string; href: string }>;
  robots: string;
  ogType: 'website' | 'article' | 'product';
  ogImage: string;
  jsonLd: JsonLd[];
  /** `<div id="root">` içine basılan semantik HTML (React mount'ta değiştirilir). */
  bodyHtml: string;
  /** Edge cache süresi (s-maxage). */
  cacheSeconds: number;
}

export type SeoRouteKind =
  | 'home'
  | 'shop'
  | 'category'
  | 'subcategory'
  | 'product'
  | 'legacyProduct'
  | 'brandIndex'
  | 'brand'
  | 'brandCategory'
  | 'brancheIndex'
  | 'branche'
  | 'cityIndex'
  | 'city'
  | 'ratgeberIndex'
  | 'ratgeber'
  | 'blogIndex'
  | 'blogPost'
  | 'vergleichIndex'
  | 'vergleich'
  | 'static'
  | 'app'
  | 'notFound';

export interface SeoRoute {
  kind: SeoRouteKind;
  locale: Locale;
  /** Locale öneki soyulmuş yol. */
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
}

/** product_seo tablosundaki satır (migration 045). */
export interface ProductSeoRow {
  slug: string;
  source: 'diamond' | 'combisteel' | 'handi';
  source_id: string;
  sku: string;
  brand: string;
  brand_slug: string;
  name_de: string;
  description_de: string | null;
  category_slug: string | null;
  subcategory_slug: string | null;
  price_net: number | null;
  image: string | null;
  images: string[] | null;
  in_stock: boolean;
  kw: number | null;
  width_mm: number | null;
  depth_mm: number | null;
  height_mm: number | null;
  weight_kg: number | null;
  ean: string | null;
  specs: Array<{ label: string; value: string }> | null;
  is_accessory: boolean;
  indexable: boolean;
  updated_at: string;
  /** Diamond listesinden çıktı (gecelik senkron) → sayfa kategoriye 301. */
  discontinued_at?: string | null;
}
