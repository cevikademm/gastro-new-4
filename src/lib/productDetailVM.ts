// productDetailVM.ts — tek standart ürün detay "view model"'i.
// Hem Supabase satırı (zengin) hem de katalog `EquipmentItem`'ı (fallback) AYNI
// `VM` şeklini üretir; böylece ProductDetailDrawer her ürün için aynı standart
// kartı çizer. Mümkün olan TÜM tablo kolonlarını (galeri, teslim süresi, rozetler,
// teknik özellikler) defansif olarak yansıtır — yalnızca dolu alanlar görünür.

import type { EquipmentItem } from '../stores/equipmentStore';
import { has3DModel } from '../components/Model3DViewer';
import { parseGallery } from './diamondAdapter';

export type ProductSource = 'diamond' | 'combisteel' | 'handi';

export interface SpecRow {
  label: string;
  value: string;
}

/** Ölçü satırı — `key` bir i18n anahtarı sonekidir (product.<key>). */
export interface DimRow {
  key: 'length' | 'width' | 'depth' | 'height' | 'weight';
  value: string;
}

export type Badge = 'new' | 'deal';

export interface VM {
  source: ProductSource;
  /** Supabase / 3D modeli aramada kullanılan ham id. */
  id: string;
  /** Kullanıcıya gösterilen ürün kodu (SKU). */
  displayId: string;
  brand: string;
  name: string;
  desc: string;
  /** `desc`'in satırlara bölünmüş hâli — madde madde "özellikler" listesi. */
  features: string[];
  /** Üreticinin ek bilgi/uyarı metni (Diamond popup_info vb.). */
  popupInfo: string | null;
  images: string[];
  price: number | null;
  /** Yalnızca GERÇEK indirim (promo < katalog) olduğunda dolu; aksi halde null. */
  promo: number | null;
  inStock: boolean;
  stockQty: number | null;
  /** Tahmini teslim süresi (gün) — varsa. */
  deliveryDays: number | null;
  dims: DimRow[];
  kw: number | null;
  category: string | null;
  badges: Badge[];
  specs: SpecRow[];
  cart: EquipmentItem;
  can3D: boolean;
}

export const TABLE: Record<ProductSource, string> = {
  diamond: 'diamond_products',
  combisteel: 'combisteel_products',
  handi: 'handi_products',
};

/** Sayıya çevir (virgül ondalık destekli); geçersizse null. */
export function n(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const x = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : null;
}

export const fmtPrice = (p: number | null): string =>
  p && p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

/**
 * Stok durumu — B2B katalog mantığı: stok BİLİNMİYORSA (null/boş) ürün sipariş
 * edilebilir sayılır (mağaza gridi de her ürünü "STOKTA" gösterir). Yalnızca
 * stok AÇIKÇA 0 ise "stok yok" denir.
 */
export function computeStock(raw: any): { inStock: boolean; stockQty: number | null } {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { inStock: true, stockQty: null };
  }
  const num = n(raw);
  if (num !== null) return { inStock: num > 0, stockQty: num > 0 ? num : null };
  // sayısal değil ama dolu (örn. "available") → "0" değilse mevcut say
  return { inStock: String(raw).trim() !== '0', stockQty: null };
}

/** Gerçek indirim mi? promo yalnızca katalogdan düşükse anlamlıdır. */
function realPromo(price: number | null, promo: number | null): number | null {
  return promo != null && promo > 0 && price != null && promo < price ? promo : null;
}

const dimRow = (key: DimRow['key'], mm: number | null): DimRow | null =>
  mm != null ? { key, value: `${Math.round(mm)} mm` } : null;
const weightRow = (kg: number | null): DimRow | null =>
  kg != null ? { key: 'weight', value: `${kg} kg` } : null;

/** Serbest metin açıklamayı madde listesine böler (Diamond `desc`'i satır-bazlı). */
function splitFeatures(desc: string): string[] {
  return (desc || '')
    .split(/\r?\n/)
    .map((s) => s.replace(/^[•\-*•·]\s*/, '').trim())
    .filter(Boolean);
}

/** "1530/2010" gibi string yükseklikten ilk sayıyı çıkarır. */
function parseFirstNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const m = String(v).match(/[\d.,]+/);
  return m ? n(m[0]) : null;
}

/**
 * Katalog ürününü (`EquipmentItem`) kaynak + ham id'ye çözer.
 * Id öneki ÖNCELİKLİ (combisteel-/handi-); yoksa marka ipucu (yazım hataları dahil);
 * aksi halde varsayılan `diamond` — markası "diamond" içermeyen ~1.100 alt-marka
 * satırını (Diverso, BarUp, Arktic, Stöckel, Giorik…) doğru kaynağa yönlendirir.
 */
export function resolveSourceAndId(item: EquipmentItem): {
  source: ProductSource;
  bareId: string;
  displayId: string;
} {
  const rawId = item.id || '';
  if (/^combisteel-/i.test(rawId)) {
    const bareId = rawId.replace(/^combisteel-/i, '');
    return { source: 'combisteel', bareId, displayId: bareId };
  }
  if (/^(handi|hendi)-/i.test(rawId)) {
    const bareId = rawId.replace(/^(handi|hendi)-/i, '');
    return { source: 'handi', bareId, displayId: bareId };
  }
  const b = (item.brand || '').toLowerCase();
  if (b.includes('combisteel') || b.includes('combsiteel') || b.includes('c0mbisteel')) {
    return { source: 'combisteel', bareId: rawId, displayId: rawId };
  }
  if (b.includes('hendi') || b.includes('handi')) {
    return { source: 'handi', bareId: rawId, displayId: rawId };
  }
  return { source: 'diamond', bareId: rawId, displayId: rawId };
}

/** Supabase satırını standart VM'e çevirir. */
export function normalizeRow(source: ProductSource, r: any): VM {
  if (source === 'diamond') {
    // Diamond boyut konvansiyonu (kendi desc'i): length_mm = Genişlik, width_mm = Derinlik.
    const images = Array.from(new Set(
      [r.image_big, r.image_full, r.image_thumb, ...parseGallery(r.image_gallery)].filter(Boolean),
    ));
    const kw = n(r.electric_power_kw);
    const price = n(r.price_catalog) ?? n(r.price_display);
    const specs: SpecRow[] = [];
    if (r.electric_power_kw) specs.push({ label: 'Güç', value: `${r.electric_power_kw} kW` });
    if (r.electric_connection) specs.push({ label: 'Bağlantı', value: String(r.electric_connection) });
    if (r.electric_connection_2) specs.push({ label: 'Bağlantı 2', value: String(r.electric_connection_2) });
    if (r.kcal_power) specs.push({ label: 'Isıl güç', value: `${r.kcal_power} kcal/h` });
    if (r.horse_power) specs.push({ label: 'Motor gücü', value: `${r.horse_power} HP` });
    if (r.vapor) specs.push({ label: 'Buhar', value: String(r.vapor) });
    if (r.volume_m3) specs.push({ label: 'Hacim', value: `${r.volume_m3} m³` });
    if (r.product_range_id) specs.push({ label: 'Seri', value: String(r.product_range_id) });
    if (r.product_family_name) specs.push({ label: 'Ürün ailesi', value: String(r.product_family_name) });
    if (r.page_catalog_number) specs.push({ label: 'Katalog sayfası', value: String(r.page_catalog_number) });
    const desc = r.description_tech_spec || '';
    const stk = computeStock(r.stock);
    const badges: Badge[] = [];
    if (r.is_new) badges.push('new');
    if (r.is_good_deal) badges.push('deal');
    return {
      source, id: r.id, displayId: String(r.id), brand: 'Diamond', name: r.name || r.id, desc,
      features: splitFeatures(desc), popupInfo: r.popup_info || null, images,
      price, promo: realPromo(price, n(r.price_promo)),
      inStock: stk.inStock, stockQty: stk.stockQty,
      deliveryDays: n(r.supplier_delivery_delay) ?? n(r.days_to_restock_avg),
      dims: [
        dimRow('width', n(r.length_mm)),
        dimRow('depth', n(r.width_mm)),
        dimRow('height', n(r.height_mm)),
        weightRow(n(r.weight)),
      ].filter(Boolean) as DimRow[],
      kw, category: r.product_family_name || null, badges, specs,
      can3D: has3DModel(r.id),
      cart: {
        id: r.id, name: r.name, desc, cat: r.product_family_name || 'other',
        sub: r.product_subfamily_id || '', fam: r.product_family_name || '', brand: 'Diamond', line: '',
        l: n(r.length_mm) || 0, w: n(r.width_mm) || 0, h: String(r.height_mm || 0), kw: kw || 0,
        price: price || 0, img: images[0] || '', url: images[0] || '',
      },
    };
  }

  if (source === 'combisteel') {
    const images = Array.from(new Set(
      [r.image_url, ...(Array.isArray(r.extra_images) ? r.extra_images : [])].filter(Boolean),
    ));
    const specs: SpecRow[] = (Array.isArray(r.tech_specs) ? r.tech_specs : [])
      .filter((s: any) => s?.name && s?.value)
      .slice(0, 40)
      .map((s: any) => ({ label: String(s.name), value: `${s.value}${s.unit ? ' ' + s.unit : ''}` }));
    if (r.product_type) specs.push({ label: 'Tip', value: String(r.product_type) });
    if (r.ean) specs.push({ label: 'EAN', value: String(r.ean) });
    const desc = r.long_description || r.description || '';
    const cartId = r.sku || r.id;
    const price = n(r.price);
    const stk = computeStock(r.stock);
    return {
      source, id: r.id, displayId: String(cartId), brand: r.brand || 'CombiSteel',
      name: r.title || r.description || r.id, desc, features: splitFeatures(desc),
      popupInfo: null, images, price, promo: null,
      inStock: stk.inStock, stockQty: stk.stockQty, deliveryDays: null,
      dims: [
        dimRow('width', n(r.width_mm) ?? n(r.length_mm)),
        dimRow('depth', n(r.depth_mm)),
        dimRow('height', n(r.height_mm)),
        weightRow(n(r.gross_weight) ?? n(r.net_weight)),
      ].filter(Boolean) as DimRow[],
      kw: n(r.power_kw), category: r.category_name || null, badges: [], specs,
      can3D: false,
      cart: {
        id: cartId, name: r.title || r.description, desc: r.description || '', cat: r.category_name || 'other',
        sub: '', fam: r.category_name || '', brand: r.brand || 'CombiSteel', line: r.product_type || '',
        l: n(r.length_mm) || n(r.width_mm) || 0, w: n(r.depth_mm) || n(r.width_mm) || 0,
        h: String(r.height_mm || 0), kw: 0, price: price || 0, img: r.image_url || '', url: r.image_url || '',
      },
    };
  }

  // handi
  const images = Array.from(new Set([r.image_url].filter(Boolean)));
  const specs: SpecRow[] = [];
  if (r.sub_category) specs.push({ label: 'Alt kategori', value: String(r.sub_category) });
  if (r.colour) specs.push({ label: 'Renk', value: String(r.colour) });
  if (r.material) specs.push({ label: 'Malzeme', value: String(r.material) });
  if (r.status) specs.push({ label: 'Durum', value: String(r.status) });
  if (r.product_group_id) specs.push({ label: 'Ürün grubu', value: String(r.product_group_id) });
  if (r.ean) specs.push({ label: 'EAN', value: String(r.ean) });
  const desc = r.description || r.short_desc || '';
  const price = n(r.price);
  const stk = computeStock(r.stock);
  return {
    source, id: r.id, displayId: String(r.id), brand: r.brand || 'HENDI', name: r.name || r.id,
    desc, features: splitFeatures(desc), popupInfo: null, images, price, promo: null,
    inStock: stk.inStock, stockQty: stk.stockQty, deliveryDays: null,
    dims: [
      dimRow('width', n(r.width_mm)),
      dimRow('depth', n(r.length_mm)),
      dimRow('height', n(r.height_mm)),
      weightRow(n(r.net_weight) ?? n(r.gross_weight)),
    ].filter(Boolean) as DimRow[],
    kw: null, category: r.category_name || null, badges: [], specs,
    can3D: false,
    cart: {
      id: r.id, name: r.name, desc, cat: r.category_name || 'other',
      sub: r.sub_category || '', fam: '', brand: r.brand || 'HENDI', line: 'HENDI',
      l: n(r.length_mm) || 0, w: n(r.width_mm) || 0, h: String(r.height_mm || 0), kw: 0,
      price: price || 0, img: r.image_url || '', url: r.image_url || '',
    },
  };
}

/**
 * Fallback — Supabase'te eşleşen satır yokken (id uyuşmazlığı / çevrimdışı / ince kayıt)
 * doğrudan katalog ürününden standart VM üretir. Kart hiçbir zaman boş kalmaz.
 * Boyut konvansiyonu Diamond ile aynı (l=Genişlik, w=Derinlik).
 */
export function vmFromEquipment(item: EquipmentItem): VM {
  const { source, displayId } = resolveSourceAndId(item);
  const price = item.price > 0 ? item.price : null;
  const kw = Number(item.kw) > 0 ? Number(item.kw) : null;
  const specs: SpecRow[] = [];
  if (kw) specs.push({ label: 'Güç', value: `${kw} kW` });
  if (item.line) specs.push({ label: 'Seri', value: item.line });
  if (item.sub) specs.push({ label: 'Grup', value: item.sub });
  if (item.fam && item.fam !== item.sub) specs.push({ label: 'Aile', value: item.fam });
  return {
    source, id: item.id, displayId, brand: item.brand || source,
    name: item.name, desc: item.desc || '', features: splitFeatures(item.desc || ''),
    popupInfo: null, images: [item.img].filter(Boolean),
    price, promo: null,
    inStock: true, stockQty: null, deliveryDays: null,
    dims: [
      dimRow('width', item.l > 0 ? item.l : null),
      dimRow('depth', item.w > 0 ? item.w : null),
      dimRow('height', parseFirstNum(item.h)),
    ].filter(Boolean) as DimRow[],
    kw, category: item.cat || item.sub || null, badges: [], specs,
    can3D: source === 'diamond' && has3DModel(item.id),
    cart: item,
  };
}
