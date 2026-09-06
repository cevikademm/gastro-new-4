/**
 * productSeoAdapter — product_seo satırı ↔ EquipmentItem (sepet / drawer / karşılaştırma).
 * Drawer `open(source, id, fallback)` ile açılır; fallback = bu dönüşüm.
 */
import type { EquipmentItem } from '../stores/equipmentStore';
import type { ProductSeoRow } from '../seo/types';
import { supabase } from './supabase';

export type ProductSeoCardRow = Pick<ProductSeoRow, 'slug' | 'source' | 'source_id' | 'sku' | 'brand' | 'brand_slug' | 'name_de' | 'category_slug' | 'subcategory_slug' | 'price_net' | 'image' | 'in_stock' | 'kw' | 'indexable'>;

export const CARD_COLS = 'slug,source,source_id,sku,brand,brand_slug,name_de,category_slug,subcategory_slug,price_net,image,in_stock,kw,indexable';
export const FULL_COLS = `${CARD_COLS},description_de,images,width_mm,depth_mm,height_mm,weight_kg,ean,specs,is_accessory,updated_at`;

/** Katalog id kuralı (build-products-json.mjs): diamond ham id, diğerleri `<source>-<id>`. */
export function equipmentIdFor(p: Pick<ProductSeoRow, 'source' | 'source_id'>): string {
  return p.source === 'diamond' ? p.source_id : `${p.source}-${p.source_id}`;
}

export function productSeoToEquipment(p: ProductSeoCardRow & Partial<ProductSeoRow>): EquipmentItem {
  return {
    id: equipmentIdFor(p),
    name: p.name_de,
    desc: p.description_de || '',
    cat: '',
    sub: p.subcategory_slug || p.category_slug || '',
    fam: '',
    img: p.image || '',
    url: p.image || '',
    brand: p.brand,
    l: p.width_mm || 0,
    w: p.depth_mm || 0,
    h: String(p.height_mm || 0),
    kw: p.kw || 0,
    price: p.price_net || 0,
    line: '',
  };
}

export interface ListQuery {
  category?: string;
  subcategory?: string;
  brandSlug?: string;
  page?: number;
  perPage?: number;
  sort?: 'default' | 'price-asc' | 'price-desc' | 'name-asc';
}

export async function fetchProductList(q: ListQuery): Promise<{ rows: ProductSeoCardRow[]; total: number }> {
  if (!supabase) return { rows: [], total: 0 };
  const per = q.perPage ?? 24;
  const page = Math.max(1, q.page ?? 1);
  let qb = supabase.from('product_seo').select(CARD_COLS, { count: 'exact' }).eq('indexable', true);
  if (q.category) qb = qb.eq('category_slug', q.category);
  if (q.subcategory) qb = qb.eq('subcategory_slug', q.subcategory);
  if (q.brandSlug) qb = qb.eq('brand_slug', q.brandSlug);
  switch (q.sort) {
    case 'price-asc': qb = qb.order('price_net', { ascending: true, nullsFirst: false }); break;
    case 'price-desc': qb = qb.order('price_net', { ascending: false, nullsFirst: false }); break;
    case 'name-asc': qb = qb.order('name_de', { ascending: true }); break;
    default: qb = qb.order('sort_rank', { ascending: true }).order('price_net', { ascending: false, nullsFirst: false }).order('name_de', { ascending: true });
  }
  const from = (page - 1) * per;
  const { data, count, error } = await qb.range(from, from + per - 1);
  if (error) return { rows: [], total: 0 };
  return { rows: (data || []) as unknown as ProductSeoCardRow[], total: count ?? 0 };
}

export async function fetchProductBySlug(slug: string): Promise<ProductSeoRow | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('product_seo').select(FULL_COLS).eq('slug', slug).limit(1).maybeSingle();
  return (data as unknown as ProductSeoRow) || null;
}

export interface CountRow { category_slug: string | null; subcategory_slug: string | null; brand_slug: string | null; n: number }
let _counts: Promise<CountRow[]> | null = null;
export function fetchCounts(): Promise<CountRow[]> {
  if (_counts) return _counts;
  _counts = (async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('product_seo_counts').select('category_slug,subcategory_slug,brand_slug,n').limit(2000);
    return (data || []) as CountRow[];
  })();
  return _counts;
}
export const sumCounts = (rows: CountRow[], f: (r: CountRow) => boolean) => rows.filter(f).reduce((s, r) => s + Number(r.n || 0), 0);
