/**
 * Diamond EU → Supabase Sync (standalone CLI runner)
 * --------------------------------------------------
 * api/sync-diamond.ts (Vercel function) mantığının CLI sürümü. .env'den okur,
 * Diamond EU'ya login olur, TÜM aktif ürünleri çeker ve `diamond_products`
 * tablosuna upsert eder. (sync_logs / delete-diff YOK — sadece ürünleri doldurur.)
 *
 * Önkoşul: `diamond_products` tablosu önceden oluşturulmuş olmalı
 * (supabase/migrations/001_diamond_products.sql — SQL Editor'de çalıştır).
 *
 * Kullanım: node scripts/diamond-sync.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// --- .env yükle ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const env = {};
try {
  for (const line of readFileSync(join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
} catch { /* process.env'e düş */ }
const cfg = (k) => env[k] || process.env[k] || '';

const DIAMOND_API = 'https://api.diamond-eu.com';
const DIAMOND_EMAIL = cfg('DIAMOND_EMAIL');
const DIAMOND_PASSWORD = cfg('DIAMOND_PASSWORD');
const SUPABASE_URL = (cfg('SUPABASE_URL') || cfg('VITE_SUPABASE_URL')).replace(/\/$/, '');
const SUPABASE_KEY = cfg('SUPABASE_SERVICE_ROLE_KEY');

if (!DIAMOND_EMAIL || !DIAMOND_PASSWORD) {
  console.error('❌ .env içinde DIAMOND_EMAIL / DIAMOND_PASSWORD yok.');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ .env içinde SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok.');
  process.exit(1);
}

const clean = (s) => (s || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

// NUMERIC/INTEGER sütunlar için güvenli dönüşüm: yalnızca SAF sayı kabul et.
// Diamond API bazı alanlarda aralık döndürür ("2/3" gibi) → bunlar null olur,
// böylece "invalid input syntax for type numeric" hatası oluşmaz.
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
};
const int = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isInteger(v) ? v : Math.trunc(v);
  const s = String(v).trim();
  return /^-?\d+$/.test(s) ? parseInt(s, 10) : null;
};

async function main() {
  console.log('🚀 Diamond → Supabase sync başlıyor\n');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1) Login
  console.log('🔑 Diamond EU login...');
  const loginRes = await fetch(`${DIAMOND_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DIAMOND_EMAIL, password: DIAMOND_PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error(`❌ Login başarısız: ${loginRes.status} ${await loginRes.text()}`);
    process.exit(1);
  }
  const { access_token } = await loginRes.json();
  console.log('  ✅ Giriş yapıldı.');

  // 2) Tüm ürünleri çek (sayfalı)
  console.log('🔄 Ürünler çekiliyor...');
  const products = [];
  let url = `${DIAMOND_API}/products-export?filter[is_old][value]=0`;
  while (url) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${access_token}`, 'Accept-Language': 'tr' } });
    if (!r.ok) { console.error(`❌ Fetch başarısız: ${r.status}`); process.exit(1); }
    const data = await r.json();
    products.push(...(data.data || []));
    url = data.links?.next || null;
    process.stdout.write(`\r  📥 ${products.length} ürün`);
  }
  console.log(`\n  ✅ Toplam ${products.length} ürün çekildi.`);

  // 3) Satırlara dönüştür (api/sync-diamond.ts ile aynı eşleme)
  const now = new Date().toISOString();
  const rows = products.map((p) => {
    const attr = p.attributes || {};
    const price = attr.price || {};
    const images = (attr.media?.images || [])[0] || {};
    return {
      id: p.id,
      name: clean(attr.name),
      description_tech_spec: clean(attr.description_tech_spec),
      popup_info: clean(attr.popup_info),
      currency: price.currency || 'EUR',
      price_catalog: num(price.catalog),
      price_display: num(price.display),
      price_promo: num(price.promo),
      page_catalog_number: attr.page_catalog_number,
      page_promo_number: attr.page_promo_number,
      stock: String(attr.stock ?? ''),
      restock_info: attr.restock_info,
      supplier_delivery_delay: int(attr.supplier_delivery_delay),
      days_to_restock_avg: int(attr.days_to_restock_avg),
      length_mm: attr.length_mm,
      width_mm: attr.width_mm,
      height_mm: attr.height_mm,
      volume_m3: num(attr.volume_m3),
      weight: num(attr.weight),
      weight_unit: attr.weight_unit,
      electric_power_kw: num(attr.electric_power_kw),
      electric_connection: attr.electric_connection,
      electric_connection_2: attr.electric_connection_2,
      vapor: attr.vapor,
      kcal_power: num(attr.kcal_power),
      horse_power: num(attr.horse_power),
      product_category_id: attr.product_category_id,
      product_range_id: attr.product_range_id,
      product_subrange_id: attr.product_subrange_id,
      product_family_id: attr.product_family_id,
      product_family_name: attr.product_family_name,
      product_subfamily_id: attr.product_subfamily_id,
      product_line_id: attr.product_line_id,
      image_big: images.Big || '',
      image_thumb: images.thumb || '',
      image_gallery: images['Thumb-gallery'] || '',
      image_full: images.full || '',
      is_new: !!attr.is_new,
      is_old: !!attr.is_old,
      is_good_deal: !!attr.is_good_deal,
      product_type: int(attr.product_type),
      has_accessories: !!attr.has_accessories,
      replacement_product_id: attr.replacement_product_id,
      synced_at: now,
    };
  });

  // 4) Upsert (500'er batch)
  console.log(`\n💾 Supabase'e yazılıyor (${rows.length})...`);
  let upserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from('diamond_products').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`\n❌ Upsert hatası: ${error.message}`);
      if (/relation .* does not exist|schema cache/i.test(error.message)) {
        console.error('\n⚠️  `diamond_products` tablosu yok. Önce 001_diamond_products.sql\'i SQL Editor\'de çalıştır.');
      }
      process.exit(1);
    }
    upserted += batch.length;
    process.stdout.write(`\r  💾 ${upserted} / ${rows.length}`);
  }
  console.log(`\n🎉 Tamamlandı — ${upserted} ürün diamond_products'a yazıldı.`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
