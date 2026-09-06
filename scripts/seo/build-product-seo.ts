/**
 * build-product-seo.ts — `product_seo` tablosunu (migration 045) doldurur/günceller.
 *
 * Kaynaklar:
 *   • src/data/products.json  → sınıflandırma (categoryTaxonomy.core: cat/sub, aksesuar)
 *   • Supabase diamond_products / combisteel_products / handi_products → zengin alanlar
 *     (görseller, açıklama, teknik veri, EAN, stok, fiyat)
 * Çıktı: Almanca URL slug'ı, kategori/alt-kategori slug'ı, marka slug'ı, specs jsonb …
 *
 * İdempotan: PK (source, source_id) üzerinden upsert. Slug çakışmasında -2/-3 eklenir.
 * Kullanım: npx tsx scripts/seo/build-product-seo.ts [--dry] [--limit N]
 * Gerekli env (.env): SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv } from './env';
import { resolvedOf, isAccessory, type EquipmentItem } from '../../src/lib/categoryTaxonomy.core';
import { categoryByTaxonomy, subcategoryByTaxonomy } from '../../src/content/seo/categoryTree.de';
import { brandSlugFor, cleanBrandName } from '../../src/content/seo/brands.de';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
loadDotEnv(ROOT);

const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!URL || !KEY) { console.error('✗ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik (.env)'); process.exit(1); }

const DRY = process.argv.includes('--dry');
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); return i > -1 ? Number(process.argv[i + 1]) : 0; })();

type Source = 'diamond' | 'combisteel' | 'handi';
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function fetchAll(table: string): Promise<any[]> {
  const out: any[] = [];
  const PAGE = 1000;
  for (let off = 0; ; off += PAGE) {
    const res = await fetch(`${URL}/rest/v1/${table}?select=*&order=id.asc&offset=${off}&limit=${PAGE}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`${table} ${res.status}: ${await res.text()}`);
    const rows = (await res.json()) as any[];
    out.push(...rows);
    process.stdout.write(`\r  ${table}: ${out.length}`);
    if (rows.length < PAGE) break;
  }
  process.stdout.write('\n');
  return out;
}

/* ─── yardımcılar ─── */
const n = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : null;
};
const firstNum = (v: any): number | null => { const m = String(v ?? '').match(/[\d.,]+/); return m ? n(m[0]) : null; };
const stripHtml = (s: any): string => String(s ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|h\d)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const isValidEan = (v: unknown): boolean => /^\d{8,14}$/.test(String(v ?? '').trim());
const inStock = (raw: any): boolean => {
  if (raw === null || raw === undefined || String(raw).trim() === '') return true;
  const num = n(raw);
  if (num !== null) return num > 0;
  return String(raw).trim() !== '0';
};
function parseGallery(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  try { const j = JSON.parse(v); if (Array.isArray(j)) return j.filter(Boolean).map(String); } catch { /* düz metin */ }
  return String(v).split(/[|,;\n]/).map((s) => s.trim()).filter((s) => /^https?:/.test(s));
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
function buildSlug(brandSlug: string, name: string, sku: string): string {
  const b = brandSlug === 'hendi' ? 'hendi' : brandSlug;
  const nm = slugify(name).split('-').filter(Boolean);
  let core = '';
  for (const w of nm) { if ((core + '-' + w).length > 60) break; core = core ? `${core}-${w}` : w; }
  const skuPart = slugify(sku);
  const parts = [b, core, skuPart].filter(Boolean);
  // sku adın içinde zaten varsa tekrar etme
  if (core.includes(skuPart)) parts.splice(2, 1);
  return parts.join('-').slice(0, 90).replace(/-+$/, '');
}

function sourceAndId(item: EquipmentItem): { source: Source; id: string } {
  const raw = item.id || '';
  if (/^combisteel-/i.test(raw)) return { source: 'combisteel', id: raw.replace(/^combisteel-/i, '') };
  if (/^(handi|hendi)-/i.test(raw)) return { source: 'handi', id: raw.replace(/^(handi|hendi)-/i, '') };
  const b = (item.brand || '').toLowerCase();
  if (b.includes('combisteel') || b.includes('combsiteel') || b.includes('c0mbisteel')) return { source: 'combisteel', id: raw };
  if (b.includes('hendi') || b.includes('handi')) return { source: 'handi', id: raw };
  return { source: 'diamond', id: raw };
}

interface Row {
  source: Source; source_id: string; sku: string; slug: string; brand: string; brand_slug: string;
  name_de: string; description_de: string | null; category_slug: string | null; subcategory_slug: string | null;
  taxonomy_cat: string | null; taxonomy_sub: string | null; price_net: number | null; image: string | null; images: string[];
  in_stock: boolean; kw: number | null; width_mm: number | null; depth_mm: number | null; height_mm: number | null;
  weight_kg: number | null; ean: string | null; specs: Array<{ label: string; value: string }>; is_accessory: boolean;
  indexable: boolean; updated_at: string;
}

function rowFor(item: EquipmentItem, src: Source, id: string, r: any | undefined): Row | null {
  const { cat, sub } = resolvedOf(item);
  const acc = isAccessory(item);
  const catNode = categoryByTaxonomy(cat);
  const subNode = subcategoryByTaxonomy(cat, sub);
  const specs: Array<{ label: string; value: string }> = [];
  let name = (item.name || '').trim();
  let desc = '';
  let images: string[] = [];
  let price: number | null = item.price > 0 ? item.price : null;
  let sku = id;
  let ean: string | null = null;
  let kw: number | null = Number(item.kw) > 0 ? Number(item.kw) : null;
  let w: number | null = item.l > 0 ? item.l : null;   // Diamond konvansiyonu: l = Breite
  let d: number | null = item.w > 0 ? item.w : null;   // w = Tiefe
  let h: number | null = firstNum(item.h);
  let weight: number | null = null;
  let stock = true;
  let updated = new Date().toISOString();
  let rawBrand = item.brand || '';

  if (r) {
    updated = r.updated_at || updated;
    if (src === 'diamond') {
      // Supabase diamond_products İngilizce senkronlanmış (Diamond API varsayılanı);
      // products.json Almanca ad/açıklama taşır → Almanca kaynak ÖNCELİKLİ.
      name = (item.name || '').trim() || r.name || name;
      desc = stripHtml(item.desc || '') || stripHtml(r.description_tech_spec || '');
      images = Array.from(new Set([r.image_big, r.image_full, r.image_thumb, ...parseGallery(r.image_gallery)].filter(Boolean)));
      price = n(r.price_catalog) ?? n(r.price_display) ?? price;
      kw = n(r.electric_power_kw) ?? kw;
      w = n(r.length_mm) ?? w; d = n(r.width_mm) ?? d; h = n(r.height_mm) ?? h; weight = n(r.weight);
      stock = inStock(r.stock);
      if (r.electric_power_kw) specs.push({ label: 'Leistung', value: `${r.electric_power_kw} kW` });
      if (r.electric_connection) specs.push({ label: 'Anschluss', value: String(r.electric_connection) });
      if (r.electric_connection_2) specs.push({ label: 'Anschluss 2', value: String(r.electric_connection_2) });
      if (r.kcal_power) specs.push({ label: 'Wärmeleistung', value: `${r.kcal_power} kcal/h` });
      if (r.horse_power) specs.push({ label: 'Motorleistung', value: `${r.horse_power} HP` });
      if (r.volume_m3) specs.push({ label: 'Volumen', value: `${r.volume_m3} m³` });
      if (r.product_range_id) specs.push({ label: 'Serie', value: String(r.product_range_id) });
      if (r.product_family_name) specs.push({ label: 'Produktfamilie', value: String(r.product_family_name) });
      if (r.supplier_delivery_delay) specs.push({ label: 'Lieferzeit ca.', value: `${r.supplier_delivery_delay} Tage` });
    } else if (src === 'combisteel') {
      name = r.title || r.description || name;
      desc = stripHtml(r.long_description || r.description || '');
      images = Array.from(new Set([r.image_url, ...(Array.isArray(r.extra_images) ? r.extra_images : parseGallery(r.extra_images))].filter(Boolean)));
      price = n(r.price) ?? price;
      sku = r.sku || id;
      rawBrand = r.brand || rawBrand || 'CombiSteel';
      kw = n(r.power_kw) ?? kw;
      w = n(r.width_mm) ?? n(r.length_mm) ?? w; d = n(r.depth_mm) ?? d; h = n(r.height_mm) ?? h;
      weight = n(r.gross_weight) ?? n(r.net_weight);
      stock = inStock(r.stock);
      ean = isValidEan(r.ean) ? String(r.ean).trim() : null;
      const ts = Array.isArray(r.tech_specs) ? r.tech_specs : [];
      for (const s of ts.slice(0, 40)) if (s?.name && s?.value) specs.push({ label: String(s.name), value: `${s.value}${s.unit ? ' ' + s.unit : ''}` });
      if (r.product_type) specs.push({ label: 'Typ', value: String(r.product_type) });
    } else {
      name = r.name || name;
      desc = stripHtml(r.description || r.short_desc || '');
      images = [r.image_url].filter(Boolean);
      price = n(r.price) ?? price;
      rawBrand = r.brand || rawBrand || 'HENDI';
      w = n(r.width_mm) ?? w; d = n(r.length_mm) ?? d; h = n(r.height_mm) ?? h;
      weight = n(r.net_weight) ?? n(r.gross_weight);
      stock = inStock(r.stock);
      ean = isValidEan(r.ean) ? String(r.ean).trim() : null;
      if (r.sub_category) specs.push({ label: 'Untergruppe', value: String(r.sub_category) });
      if (r.material) specs.push({ label: 'Material', value: String(r.material) });
      if (r.colour) specs.push({ label: 'Farbe', value: String(r.colour) });
    }
  } else {
    images = [item.img].filter(Boolean);
    desc = stripHtml(item.desc || '');
  }
  if (!name || name.length < 3) return null;
  const brand_slug = brandSlugFor(rawBrand, src);
  const brand = cleanBrandName(rawBrand, src);
  const image = images[0] || null;
  const indexable = !!image && !acc && name.length >= 4;
  return {
    source: src, source_id: id, sku, slug: buildSlug(brand_slug, name, sku), brand, brand_slug,
    name_de: name.slice(0, 200), description_de: desc ? desc.slice(0, 4000) : null,
    category_slug: catNode?.slug ?? null, subcategory_slug: subNode?.slug ?? null,
    taxonomy_cat: cat, taxonomy_sub: sub,
    price_net: price, image, images: images.slice(0, 8), in_stock: stock, kw,
    width_mm: w, depth_mm: d, height_mm: h, weight_kg: weight, ean, specs, is_accessory: acc, indexable,
    updated_at: updated,
  };
}

async function upsert(rows: Row[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const res = await fetch(`${URL}/rest/v1/product_seo?on_conflict=source,source_id`, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`upsert ${res.status}: ${await res.text()}`);
    process.stdout.write(`\r  upsert: ${Math.min(i + 500, rows.length)}/${rows.length}`);
  }
  process.stdout.write('\n');
}

async function main() {
  const items = JSON.parse(readFileSync(resolve(ROOT, 'src/data/products.json'), 'utf8')) as EquipmentItem[];
  console.log(`products.json: ${items.length} ürün`);
  console.log('Supabase satırları çekiliyor…');
  const [dia, cs, he] = await Promise.all([fetchAll('diamond_products'), fetchAll('combisteel_products'), fetchAll('handi_products')]);
  const maps: Record<Source, Map<string, any>> = {
    diamond: new Map(dia.map((r) => [String(r.id), r])),
    combisteel: new Map(cs.map((r) => [String(r.id), r])),
    handi: new Map(he.map((r) => [String(r.id), r])),
  };
  // CombiSteel bazen sku ile de referanslanır
  for (const r of cs) if (r.sku) maps.combisteel.set(String(r.sku), r);

  const rows: Row[] = [];
  const seenSlug = new Map<string, number>();
  const seenPk = new Set<string>();
  let missing = 0;
  for (const it of LIMIT ? items.slice(0, LIMIT) : items) {
    const { source, id } = sourceAndId(it);
    const pk = `${source}:${id}`;
    if (seenPk.has(pk)) continue;
    seenPk.add(pk);
    const r = maps[source].get(id);
    if (!r) missing++;
    const row = rowFor(it, source, id, r);
    if (!row) continue;
    const c = seenSlug.get(row.slug) || 0;
    if (c > 0) row.slug = `${row.slug}-${c + 1}`.slice(0, 96);
    seenSlug.set(row.slug.replace(/-\d+$/, ''), c + 1);
    rows.push(row);
  }
  const stats = {
    toplam: rows.length,
    indexable: rows.filter((r) => r.indexable).length,
    kategorili: rows.filter((r) => r.category_slug).length,
    altKategorili: rows.filter((r) => r.subcategory_slug).length,
    aksesuar: rows.filter((r) => r.is_accessory).length,
    supabaseEksik: missing,
    marka: Object.fromEntries(['diamond', 'combisteel', 'hendi'].map((b) => [b, rows.filter((r) => r.brand_slug === b).length])),
  };
  console.log(JSON.stringify(stats, null, 2));
  if (DRY) { console.log('örnek:', JSON.stringify(rows.slice(0, 3), null, 2)); return; }
  await upsert(rows);
  console.log('✅ product_seo güncellendi');
}

main().catch((e) => { console.error(e); process.exit(1); });
