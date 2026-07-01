// build-products-json.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Mağaza (/magaza → ShopPage) ve global ekipman kataloğu src/data/products.json
// statik dosyasını okur. Bu dosya eskiden YALNIZCA Diamond markalarını içeriyordu
// (~6.964 ürün), bu yüzden mağaza 14.000+ üründen sadece o kadarını gösteriyordu.
//
// Bu script:
//   1) Mevcut products.json'daki DIAMOND tabanını korur (zengin alanlar: cat, sub,
//      fam, l/w/h, kw, desc, line) — önceden eklenmiş diamond-dışı kayıtları ayıklar.
//   2) Supabase `all_products` view'ından diamond-DIŞI tüm ürünleri (CombiSteel +
//      Handi, ~7.351) sayfalı çeker.
//   3) Bunları EquipmentItem şekline (ince) eşler; id'leri `<source>-<id>` ile
//      benzersizleştirir (CombiSteel/Handi id çakışmasını önler).
//   4) Diamond (zengin) + diamond-dışı (ince) birleşimini products.json'a yazar.
//
// Tekrar çalıştırılabilir: her seferinde diamond-dışı kayıtları sıfırdan kurar.
//
// Kullanım:  node scripts/build-products-json.mjs
// Gerekli env (.env): SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PRODUCTS_PATH = resolve(ROOT, 'src/data/products.json');

// ── .env oku (basit parse) ──
function loadEnv() {
  try {
    const raw = readFileSync(resolve(ROOT, '.env'), 'utf8');
    const env = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}
const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY .env içinde bulunamadı.');
  process.exit(1);
}

// Önceden bu script tarafından eklenmiş ince kayıtları tanıyan id ön ekleri.
const SYNTH_PREFIXES = ['combisteel-', 'handi-', 'hendi-'];

// all_products kategori (ham) → mağaza cat anahtarı: bilinmiyorsa '' (yalnızca
// "Tüm Ürünler"de görünür). Diamond zaten zengin cat ile statik dosyada.
function thinItem(row) {
  const rawId = String(row.id ?? '').trim();
  const source = String(row.source ?? 'other').trim();
  return {
    id: `${source}-${rawId}`,
    name: String(row.name ?? '').trim() || rawId,
    desc: '',
    cat: '',                                  // kategorisiz → "Tüm Ürünler" altında
    sub: String(row.category ?? '').trim(),   // kart üstündeki küçük etiket
    fam: '',
    img: String(row.image ?? '').trim(),
    brand: String(row.brand ?? source).trim(),
    l: 0,
    w: 0,
    h: '0',
    kw: 0,
    price: Number(row.price) || 0,
    line: '',
  };
}

async function fetchAllNonDiamond() {
  const PAGE = 1000;
  let offset = 0;
  const out = [];
  for (;;) {
    const url = `${SUPABASE_URL}/rest/v1/all_products`
      + `?select=id,source,brand,name,image,price,category`
      + `&source=neq.diamond`
      + `&order=source.asc,id.asc`
      + `&limit=${PAGE}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!res.ok) throw new Error(`REST ${res.status}: ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    process.stdout.write(`\r  …diamond-dışı çekiliyor: ${out.length}`);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  process.stdout.write('\n');
  return out;
}

async function main() {
  // 1) Mevcut JSON'u oku, diamond tabanını ayıkla (sentetik ince kayıtları at).
  const current = JSON.parse(readFileSync(PRODUCTS_PATH, 'utf8'));
  const diamondBase = current.filter(
    (p) => !SYNTH_PREFIXES.some((pre) => String(p.id).startsWith(pre)),
  );
  console.log(`✓ Diamond taban (zengin): ${diamondBase.length} ürün`);

  // 2) Supabase'den diamond-dışı tümünü çek.
  const nonDiamondRows = await fetchAllNonDiamond();
  console.log(`✓ Supabase all_products (diamond-dışı): ${nonDiamondRows.length} ürün`);

  // 3) İnce şekле eşle + id benzersizliğini garanti et.
  const seen = new Set(diamondBase.map((p) => p.id));
  const thin = [];
  for (const row of nonDiamondRows) {
    const item = thinItem(row);
    if (seen.has(item.id)) continue; // beklenmedik çakışma → atla
    seen.add(item.id);
    thin.push(item);
  }

  // 4) Birleştir + yaz.
  const merged = [...diamondBase, ...thin];
  writeFileSync(PRODUCTS_PATH, JSON.stringify(merged), 'utf8');
  console.log(`\n✓ products.json yazıldı: ${merged.length} ürün`);
  console.log(`  (diamond ${diamondBase.length} + diamond-dışı ${thin.length})`);
}

main().catch((e) => {
  console.error('\n✗ Hata:', e.message);
  process.exit(1);
});
