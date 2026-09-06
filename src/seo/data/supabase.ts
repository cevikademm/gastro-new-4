/**
 * Supabase PostgREST erişimi — YALNIZ Node (api/render.ts, scripts/seo/*).
 * supabase-js yerine ham fetch: küçük bundle, `import.meta.env` yok.
 * Her hata boş sonuca düşer (site hiçbir zaman renderer yüzünden çökmez).
 */
import type { ProductSeoRow } from '../types';

function env(name: string): string | undefined {
  // Vercel: process.env; tsx: .env dotenv ile yüklenmez → scripts kendi yükler.
  return typeof process !== 'undefined' ? process.env[name] : undefined;
}

export function supabaseConfig(): { url: string; key: string } | null {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  if (!url || !key) {
    console.warn('[seo/supabase] env eksik: SUPABASE_URL/VITE_SUPABASE_URL + anahtar');
    return null;
  }
  return { url: url.replace(/\/$/, ''), key };
}

interface RestResult<T> { data: T[]; count: number | null }

export async function rest<T = unknown>(
  pathWithQuery: string,
  opts: { count?: boolean; timeoutMs?: number } = {},
): Promise<RestResult<T>> {
  const cfg = supabaseConfig();
  if (!cfg) return { data: [], count: null };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 6000);
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${pathWithQuery}`, {
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Accept: 'application/json',
        ...(opts.count ? { Prefer: 'count=exact' } : {}),
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[seo/supabase] ${res.status} ${res.statusText} for ${pathWithQuery.slice(0, 120)}`);
      return { data: [], count: null };
    }
    const data = (await res.json()) as T[];
    let count: number | null = null;
    const cr = res.headers.get('content-range');
    if (cr && cr.includes('/')) {
      const total = cr.split('/')[1];
      count = total === '*' ? null : Number(total);
    }
    return { data: Array.isArray(data) ? data : [], count };
  } catch (err) {
    console.warn(`[seo/supabase] fetch failed for ${pathWithQuery.slice(0, 120)}: ${(err as Error)?.message || err}`);
    return { data: [], count: null };
  } finally {
    clearTimeout(timer);
  }
}

const PRODUCT_COLS = 'slug,source,source_id,sku,brand,brand_slug,name_de,description_de,category_slug,subcategory_slug,price_net,image,images,in_stock,kw,width_mm,depth_mm,height_mm,weight_kg,ean,specs,is_accessory,indexable,updated_at';
const CARD_COLS = 'slug,source,source_id,sku,brand,brand_slug,name_de,category_slug,subcategory_slug,price_net,image,in_stock,kw,indexable';

export type ProductCard = Pick<ProductSeoRow, 'slug' | 'source' | 'source_id' | 'sku' | 'brand' | 'brand_slug' | 'name_de' | 'category_slug' | 'subcategory_slug' | 'price_net' | 'image' | 'in_stock' | 'kw' | 'indexable'>;

export async function getProductBySlug(slug: string): Promise<ProductSeoRow | null> {
  const { data } = await rest<ProductSeoRow>(`product_seo?select=${PRODUCT_COLS}&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  return data[0] ?? null;
}

/** Eski /product/{id} → source_id veya sku eşleşmesi. */
export async function getProductByLegacyId(id: string): Promise<Pick<ProductSeoRow, 'slug'> | null> {
  const enc = encodeURIComponent(id);
  const { data } = await rest<Pick<ProductSeoRow, 'slug'>>(`product_seo?select=slug&or=(source_id.eq.${enc},sku.eq.${enc})&limit=1`);
  return data[0] ?? null;
}

export interface ListOpts {
  category?: string;
  subcategory?: string;
  brandSlug?: string;
  page?: number;
  perPage?: number;
  indexableOnly?: boolean;
}

export async function listProducts(o: ListOpts): Promise<{ rows: ProductCard[]; total: number }> {
  const page = Math.max(1, o.page ?? 1);
  const per = Math.min(48, Math.max(1, o.perPage ?? 24));
  const from = (page - 1) * per;
  const q: string[] = [`select=${CARD_COLS}`];
  if (o.category) q.push(`category_slug=eq.${encodeURIComponent(o.category)}`);
  if (o.subcategory) q.push(`subcategory_slug=eq.${encodeURIComponent(o.subcategory)}`);
  if (o.brandSlug) q.push(`brand_slug=eq.${encodeURIComponent(o.brandSlug)}`);
  if (o.indexableOnly !== false) q.push('indexable=eq.true');
  // Önemli fiyat bandı önce (1.500–5.000 €), sonra fiyat azalan; sonra ad.
  q.push('order=sort_rank.asc,price_net.desc.nullslast,name_de.asc');
  q.push(`offset=${from}`, `limit=${per}`);
  const { data, count } = await rest<ProductCard>(`product_seo?${q.join('&')}`, { count: true });
  return { rows: data, total: count ?? data.length };
}

export interface CountRow { category_slug: string | null; subcategory_slug: string | null; brand_slug: string | null; n: number }

let _countsCache: { at: number; rows: CountRow[] } | null = null;
export async function getCounts(): Promise<CountRow[]> {
  if (_countsCache && Date.now() - _countsCache.at < 5 * 60_000) return _countsCache.rows;
  const { data } = await rest<CountRow>('product_seo_counts?select=category_slug,subcategory_slug,brand_slug,n&limit=2000');
  _countsCache = { at: Date.now(), rows: data };
  return data;
}

export function sumCounts(rows: CountRow[], f: (r: CountRow) => boolean): number {
  return rows.filter(f).reduce((s, r) => s + Number(r.n || 0), 0);
}

export async function getRelated(row: ProductSeoRow, limit = 8): Promise<ProductCard[]> {
  if (!row.category_slug) return [];
  const q: string[] = [`select=${CARD_COLS}`, `category_slug=eq.${encodeURIComponent(row.category_slug)}`, 'indexable=eq.true', `slug=neq.${encodeURIComponent(row.slug)}`];
  if (row.subcategory_slug) q.push(`subcategory_slug=eq.${encodeURIComponent(row.subcategory_slug)}`);
  q.push('order=sort_rank.asc,price_net.desc.nullslast', `limit=${limit}`);
  const { data } = await rest<ProductCard>(`product_seo?${q.join('&')}`);
  return data;
}

/** Sitemap için tüm indekslenebilir ürün slug'ları (marka bazında, sayfalı). */
export async function listProductSlugs(brandSlug: string): Promise<Array<{ slug: string; updated_at: string }>> {
  const out: Array<{ slug: string; updated_at: string }> = [];
  const PAGE = 1000;
  for (let off = 0; off < 60000; off += PAGE) {
    const { data } = await rest<{ slug: string; updated_at: string }>(
      `product_seo?select=slug,updated_at&brand_slug=eq.${encodeURIComponent(brandSlug)}&indexable=eq.true&order=slug.asc&offset=${off}&limit=${PAGE}`,
      { timeoutMs: 15000 },
    );
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}
