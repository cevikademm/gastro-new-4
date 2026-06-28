/**
 * HENDI (handi.csv) → Supabase Sync
 * ---------------------------------
 * `ürün listesi/handi.csv` (noktalı virgül ayraçlı, 132 sütun, AB sayı formatı,
 * tırnak içinde çok satırlı açıklamalar) dosyasını okur, sadeleştirilmiş şemaya
 * eşler ve `handi_products` tablosuna upsert eder.
 *
 * Önkoşul: `handi_products` tablosu önceden oluşturulmuş olmalı (aşağıdaki SQL).
 * Kullanım: node scripts/handi-sync.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

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
} catch { /* */ }
const cfg = (k) => env[k] || process.env[k] || '';

const SUPABASE_URL = (cfg('SUPABASE_URL') || cfg('VITE_SUPABASE_URL')).replace(/\/$/, '');
const SUPABASE_KEY = cfg('SUPABASE_SERVICE_ROLE_KEY');
const CSV_PATH = join(__dirname, '..', 'ürün listesi', 'handi.csv');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ .env içinde SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok.');
  process.exit(1);
}

// AB sayı formatı: "1.234,56" → 1234.56 ; "9,95" → 9.95 ; "-"/"" → null
const num = (v) => {
  if (v == null) return null;
  let s = String(v).trim();
  if (s === '' || s === '-') return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const intg = (v) => {
  const n = num(v);
  return n == null ? null : Math.trunc(n);
};
const txt = (v) => {
  const s = (v == null ? '' : String(v)).trim();
  return s === '' || s === '-' ? null : s;
};

async function main() {
  console.log('🚀 HENDI (handi.csv) → Supabase sync başlıyor\n');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('📄 CSV okunuyor...');
  const raw = readFileSync(CSV_PATH, 'utf8');
  const parsed = Papa.parse(raw, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors?.length) {
    // Yalnızca ilk birkaç hatayı göster; çoğu zaman tek tük satır sorunudur.
    console.warn(`  ⚠️ ${parsed.errors.length} parse uyarısı (ilk: ${parsed.errors[0]?.message})`);
  }
  const records = parsed.data;
  console.log(`  ✅ ${records.length} satır ayrıştırıldı.`);

  // Sadeleştirilmiş şemaya eşle + id'ye göre dedup (batch içi çakışmayı önler).
  const byId = new Map();
  const now = new Date().toISOString();
  for (const r of records) {
    const id = txt(r['Itemnumber']);
    if (!id) continue;
    byId.set(id, {
      id,
      ean: txt(r['EAN']),
      brand: txt(r['Brand of the item']) || 'HENDI',
      name: txt(r['Item name - EN']) || txt(r['Webshop title suggestion - EN']) || id,
      description: txt(r['Description of item - EN']),
      short_desc: txt(r['Short summary of the description - EN']),
      price: num(r['Bruto price in EUR']),
      stock: intg(r['Stock']),
      status: txt(r['Status code (2:new 3:in assortment 5:will go out of assortment)']),
      image_url: txt(r['Item image 1 (main image)']),
      category_name: txt(r['Main categorie - EN']),
      sub_category: txt(r['Sub categorie - EN']),
      colour: txt(r['Colour of the item - EN']),
      material: txt(r['Main material of the item - EN']),
      length_mm: num(r['Lenght of the single item - without packaging in mm']),
      width_mm: num(r['Width of the single item - without packaging in mm']),
      height_mm: num(r['Height of the single item - without packaging in mm']),
      net_weight: num(r['Net weight of the item - without packaging in kg']),
      gross_weight: num(r['Gross weight of the item - with packaging in kg']),
      product_group_id: txt(r['Product ID - items with the same ID are in the same group of items']),
      synced_at: now,
    });
  }
  const rows = [...byId.values()];
  console.log(`  ✅ ${rows.length} benzersiz ürün hazırlandı.`);

  console.log(`\n💾 Supabase'e yazılıyor...`);
  let upserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from('handi_products').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`\n❌ Upsert hatası: ${error.message}`);
      if (/relation .* does not exist|schema cache/i.test(error.message)) {
        console.error('\n⚠️  `handi_products` tablosu yok. Önce tablo SQL\'ini Supabase SQL Editor\'de çalıştır.');
      }
      process.exit(1);
    }
    upserted += batch.length;
    process.stdout.write(`\r  💾 ${upserted} / ${rows.length}`);
  }
  console.log(`\n🎉 Tamamlandı — ${upserted} ürün handi_products'a yazıldı.`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
