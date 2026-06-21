import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Credentials come from the environment — NEVER hardcode the service_role key.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const clean = (s) => (s || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
const parseNum = (v) => {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
};

const raw = JSON.parse(readFileSync('./api oluşturma/products_raw.json', 'utf-8'));
console.log(`Toplam ürün: ${raw.length}`);

const now = new Date().toISOString();
const rows = raw.map((p) => {
  const attr = p.attributes || {};
  const price = attr.price || {};
  const images = (attr.media?.images || [])[0] || {};
  return {
    id: p.id,
    name: clean(attr.name),
    description_tech_spec: clean(attr.description_tech_spec || ''),
    popup_info: clean(attr.popup_info || ''),
    currency: price.currency || 'EUR',
    price_catalog: price.catalog ? parseFloat(price.catalog) : null,
    price_display: price.display ? parseFloat(price.display) : null,
    price_promo: price.promo ? parseFloat(price.promo) : null,
    page_catalog_number: attr.page_catalog_number || null,
    page_promo_number: attr.page_promo_number || null,
    stock: String(attr.stock ?? ''),
    restock_info: attr.restock_info || null,
    supplier_delivery_delay: attr.supplier_delivery_delay || null,
    days_to_restock_avg: attr.days_to_restock_avg || null,
    length_mm: parseNum(attr.length_mm),
    width_mm: parseNum(attr.width_mm),
    height_mm: parseNum(attr.height_mm),
    volume_m3: parseNum(attr.volume_m3),
    weight: parseNum(attr.weight),
    weight_unit: attr.weight_unit || null,
    electric_power_kw: attr.electric_power_kw || null,
    electric_connection: attr.electric_connection || null,
    electric_connection_2: attr.electric_connection_2 || null,
    vapor: attr.vapor || null,
    kcal_power: attr.kcal_power || null,
    horse_power: attr.horse_power || null,
    product_category_id: attr.product_category_id || null,
    product_range_id: attr.product_range_id || null,
    product_subrange_id: attr.product_subrange_id || null,
    product_family_id: attr.product_family_id || null,
    product_family_name: attr.product_family_name || null,
    product_subfamily_id: attr.product_subfamily_id || null,
    product_line_id: attr.product_line_id || null,
    image_big: images.Big || '',
    image_thumb: images.thumb || '',
    image_gallery: images['Thumb-gallery'] || '',
    image_full: images.full || '',
    is_new: !!attr.is_new,
    is_old: !!attr.is_old,
    is_good_deal: !!attr.is_good_deal,
    product_type: attr.product_type || null,
    has_accessories: !!attr.has_accessories,
    replacement_product_id: attr.replacement_product_id || null,
    synced_at: now,
  };
});

let upserted = 0;
for (let i = 0; i < rows.length; i += 500) {
  const batch = rows.slice(i, i + 500);
  const { error } = await supabase
    .from('diamond_products')
    .upsert(batch, { onConflict: 'id' });
  if (error) {
    console.error(`Batch ${i} hata:`, error.message);
    break;
  }
  upserted += batch.length;
  console.log(`${upserted} / ${rows.length} yüklendi...`);
}

// Sync log kaydet
await supabase.from('sync_logs').insert({
  product_id: '__SYNC_SUMMARY__',
  product_name: 'İlk Yükleme (JSON)',
  change_type: 'summary',
  details: {
    total_products: upserted,
    added: upserted,
    updated: 0,
    deleted: 0,
    source: 'products_raw.json',
  },
  synced_at: now,
});

// Her ürün için "added" log
for (let i = 0; i < rows.length; i += 500) {
  const batch = rows.slice(i, i + 500).map(r => ({
    product_id: r.id,
    product_name: r.name,
    change_type: 'added',
    details: { price_catalog: r.price_catalog, stock: r.stock },
    synced_at: now,
  }));
  await supabase.from('sync_logs').insert(batch);
}

console.log(`\nTamamlandı! ${upserted} ürün Supabase'e yüklendi.`);
