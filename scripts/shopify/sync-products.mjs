#!/usr/bin/env node
// scripts/shopify/sync-products.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Ürünleri Shopify'a yazar (Admin GraphQL API, `productSet` mutation'ı).
//
// VARSAYILAN --dry-run'dır: hiçbir yere bağlanmaz, yalnızca üretilecek payload'ı
// basar. Canlıya yazmak için AÇIKÇA --live vermek gerekir.
//
// İDEMPOTANLIK: her ürün `productSet` + sabit `handle` ile yazılır. İkinci
// çalıştırma mükerrer ürün YARATMAZ, mevcut olanı günceller. Handle
// `slugify(başlık)-<id>` olduğu için ürün adı değişse bile aynı kaydı hedefler.
//
// Kullanım:
//   node scripts/shopify/sync-products.mjs --dry-run --limit 5
//   node scripts/shopify/sync-products.mjs --brand hendi --dry-run --limit 3
//   node scripts/shopify/sync-products.mjs --brand diamond --live --limit 50
//
// Bayraklar:
//   --brand <diamond|combisteel|hendi>   varsayılan: diamond
//   --limit <N>                          kaç ürün (varsayılan: hepsi)
//   --dry-run                            varsayılan; yazmaz
//   --live                               GERÇEKTEN yazar (onay ister)
//   --status <DRAFT|ACTIVE>              varsayılan: DRAFT
//   --json <dosya>                       payload'ları dosyaya döker
import { writeFileSync } from 'node:fs';
import {
  loadEnv, fetchAll, grossPrice, stockNum, num, slugify, toHtml,
  diamondImage, loadGermanCopy, normalizeBrand, catLabel, cleanSub, validEan,
} from './lib.mjs';

// ── Argümanlar ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const BRAND = (flag('brand', 'diamond') || 'diamond').toLowerCase();
const LIMIT = flag('limit') ? parseInt(flag('limit'), 10) : Infinity;
const LIVE = has('live');
const STATUS = (flag('status', 'DRAFT') || 'DRAFT').toUpperCase();
const JSON_AT = flag('json');

const DE = loadGermanCopy();

// ── Kaynak tanımları ─────────────────────────────────────────────────────────
const SOURCES = {
  diamond: {
    table: 'diamond_products',
    vendor: 'Diamond',
    columns: 'id,name,description_tech_spec,popup_info,price_display,price_catalog,price_promo,stock,weight,weight_unit,length_mm,width_mm,height_mm,electric_power_kw,image_thumb,product_family_name,product_line_id,is_good_deal',
    map: (r) => {
      // Almanca metin products.json'dan; Supabase'deki isim Ingilizce.
      const de = DE.get(String(r.id));
      const net = num(r.price_display) || num(r.price_catalog);
      const catalog = num(r.price_catalog);
      const img = diamondImage(r.image_thumb);
      return {
        id: String(r.id),
        sku: String(r.id),
        title: (de?.name || r.name || '').trim(),
        bodyParts: [de?.desc, r.description_tech_spec, r.popup_info],
        net,
        compareNet: catalog > net ? catalog : null,
        // Diamond'da stok sutunu TUM kayitlarda bos -> envanter TAKIP EDILMEZ.
        // Takip acilirsa 6.908 urunun hepsi "tukendi" gorunur.
        tracked: false,
        stock: 0,
        weightKg: num(r.weight),
        images: img ? [img] : [],
        // `product_family_name` MUSTERIYE GOSTERILEMEZ: icerigi Fransizca uretim
        // tanimi ("Livrees en Kit / Demont. A / dos"). products.json'daki `sub`
        // Almanca ve vitrine uygun ("Vitrinen-Theken", "Pizzaoefen").
        productType: cleanSub(de?.sub) || catLabel(de?.cat) || 'Gastro-Ausstattung',
        ean: null,
        // Ham `product_line_id` sayisal id ("24157") — etiket olarak anlamsiz.
        tags: [catLabel(de?.cat), de?.line, r.is_good_deal ? 'Angebot' : null],
        specs: {
          laenge_mm: num(r.length_mm) || null,
          breite_mm: num(r.width_mm) || null,
          hoehe_mm: num(r.height_mm) || null,
          leistung_kw: num(r.electric_power_kw) || null,
        },
      };
    },
  },
  combisteel: {
    table: 'combisteel_products',
    vendor: 'CombiSteel',
    columns: 'id,sku,title,description,long_description,brand,ean,price,stock,gross_weight,net_weight,length_mm,width_mm,height_mm,image_url,extra_images,category_name',
    map: (r) => ({
      id: String(r.id),
      sku: r.sku || String(r.id),
      title: (r.title || '').trim(),
      bodyParts: [r.description, r.long_description],
      net: num(r.price),
      compareNet: null,
      tracked: true,
      stock: stockNum(r.stock),
      weightKg: num(r.gross_weight) || num(r.net_weight),
      images: [r.image_url, ...(Array.isArray(r.extra_images) ? r.extra_images : [])].filter(Boolean),
      productType: r.category_name || 'Gastro-Ausstattung',
      ean: validEan(r.ean),
      tags: [normalizeBrand(r.brand)],
      specs: {
        laenge_mm: num(r.length_mm) || null,
        breite_mm: num(r.width_mm) || null,
        hoehe_mm: num(r.height_mm) || null,
        leistung_kw: null,
      },
    }),
  },
  hendi: {
    table: 'handi_products',
    vendor: 'HENDI',
    columns: 'id,ean,brand,name,description,short_desc,price,stock,image_url,category_name,sub_category,net_weight,gross_weight,length_mm,width_mm,height_mm,colour,material',
    map: (r) => ({
      id: String(r.id),
      sku: String(r.id),
      title: (r.name || '').trim(),
      bodyParts: [r.description, r.short_desc],
      net: num(r.price),
      compareNet: null,
      tracked: true,
      stock: stockNum(r.stock),
      weightKg: num(r.gross_weight) || num(r.net_weight),
      images: [r.image_url].filter(Boolean),
      productType: r.category_name || r.sub_category || 'Gastro-Zubehör',
      // handi_products.ean TUM satirlarda ayni bozuk deger ("8,71137E+12") — atilir.
      ean: validEan(r.ean),
      tags: [normalizeBrand(r.brand), r.sub_category, r.colour, r.material],
      specs: {
        laenge_mm: num(r.length_mm) || null,
        breite_mm: num(r.width_mm) || null,
        hoehe_mm: num(r.height_mm) || null,
        leistung_kw: null,
      },
    }),
  },
};

// ── Shopify payload üretimi ──────────────────────────────────────────────────
function toProductSetInput(p, vendor) {
  const gross = grossPrice(p.net);
  const compareGross = p.compareNet ? grossPrice(p.compareNet) : null;

  const metafields = Object.entries(p.specs)
    .filter(([, v]) => v != null && v !== 0)
    .map(([key, value]) => ({
      namespace: 'custom',
      key,
      type: 'number_integer',
      value: String(Math.round(Number(value))),
    }));

  const tags = [vendor, ...(p.tags || [])]
    .filter((t) => t != null && String(t).trim() !== '')
    .map((t) => String(t).trim());

  const variant = {
    // productSet tek varyantli urunde de optionValues ister.
    optionValues: [{ optionName: 'Title', name: 'Default Title' }],
    price: gross.toFixed(2),
    sku: p.sku,
    inventoryItem: {
      tracked: p.tracked,
      measurement: {
        weight: { value: p.weightKg > 0 ? p.weightKg : 0, unit: 'KILOGRAMS' },
      },
    },
    // Stok verisi olmayan urunlerde satis engellenmesin.
    inventoryPolicy: p.tracked ? 'DENY' : 'CONTINUE',
  };
  if (compareGross && compareGross > gross) variant.compareAtPrice = compareGross.toFixed(2);
  if (p.ean) variant.barcode = String(p.ean);

  return {
    handle: `${slugify(p.title)}-${slugify(p.id)}`.replace(/^-+/, ''),
    title: p.title,
    descriptionHtml: toHtml(...p.bodyParts),
    vendor,
    productType: String(p.productType).slice(0, 255),
    status: STATUS,
    tags: [...new Set(tags)],
    productOptions: [{ name: 'Title', values: [{ name: 'Default Title' }] }],
    variants: [variant],
    files: p.images
      .filter((u) => /^https?:\/\//.test(u))
      .slice(0, 10)
      .map((u) => ({ originalSource: u, contentType: 'IMAGE' })),
    metafields,
  };
}

// ── Shopify API ──────────────────────────────────────────────────────────────
const PRODUCT_SET = `
mutation productSet($input: ProductSetInput!) {
  productSet(input: $input, synchronous: true) {
    product { id handle status }
    userErrors { field message }
  }
}`;

async function shopifyGraphQL(env, query, variables) {
  const domain = env.SHOPIFY_STORE_DOMAIN;
  const token = env.SHOPIFY_ADMIN_TOKEN;
  const version = env.SHOPIFY_API_VERSION || '2026-07';
  if (!domain || !token) {
    throw new Error(
      'SHOPIFY_STORE_DOMAIN ve SHOPIFY_ADMIN_TOKEN .env icinde tanimli degil.\n' +
      '  Once magazayi kurup custom app token uretmelisin:\n' +
      '  docs/shopify/01-magaza-kurulum-rehberi.md',
    );
  }
  const res = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 429) {
    // Cost-based rate limit; kisa bekleyip tekrar dene.
    await new Promise((r) => setTimeout(r, 2000));
    return shopifyGraphQL(env, query, variables);
  }
  if (!res.ok) throw new Error(`Shopify ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 300)}`);
  return json.data;
}

// ── Ana akış ─────────────────────────────────────────────────────────────────
async function main() {
  const src = SOURCES[BRAND];
  if (!src) {
    console.error(`Bilinmeyen marka: ${BRAND}. Secenekler: ${Object.keys(SOURCES).join(', ')}`);
    process.exit(1);
  }

  const env = loadEnv();
  const mode = LIVE ? 'CANLI YAZMA' : 'DRY-RUN (yazmaz)';
  console.log('');
  console.log('==================================================================');
  console.log(`  SHOPIFY SENKRON  ·  ${src.vendor}  ·  ${mode}`);
  console.log(`  durum: ${STATUS}   limit: ${LIMIT === Infinity ? 'hepsi' : LIMIT}`);
  console.log('==================================================================');

  const rows = await fetchAll(env, src.table, src.columns);
  const all = rows.map(src.map);

  // Shopify'in zorunlu gordugu alanlar eksikse ATLA — sessizce gecme, say.
  const skipped = [];
  const ready = all.filter((p) => {
    if (!p.title) { skipped.push([p.id, 'baslik yok']); return false; }
    if (!(p.net > 0)) { skipped.push([p.id, 'fiyat yok']); return false; }
    if (!p.images.some((u) => /^https?:\/\//.test(u))) { skipped.push([p.id, 'gorsel yok']); return false; }
    return true;
  });

  const batch = ready.slice(0, LIMIT === Infinity ? ready.length : LIMIT);
  const payloads = batch.map((p) => toProductSetInput(p, src.vendor));

  console.log(`\n  kaynak kayit      : ${all.length}`);
  console.log(`  yuklenebilir      : ${ready.length}`);
  console.log(`  atlanan           : ${skipped.length}`);
  if (skipped.length) {
    const reasons = skipped.reduce((a, [, r]) => ({ ...a, [r]: (a[r] || 0) + 1 }), {});
    console.log(`    ${Object.entries(reasons).map(([k, v]) => `${k}: ${v}`).join(' · ')}`);
  }
  console.log(`  bu calistirmada   : ${payloads.length}`);

  if (JSON_AT) {
    writeFileSync(JSON_AT, JSON.stringify(payloads, null, 2), 'utf8');
    console.log(`  payload yazildi   : ${JSON_AT}`);
  }

  if (!LIVE) {
    const show = payloads.slice(0, 3);
    console.log('\n  --- ORNEK PAYLOAD (ilk ' + show.length + ') ---\n');
    for (const s of show) {
      const v = s.variants[0];
      console.log(`  handle      : ${s.handle}`);
      console.log(`  title       : ${s.title}`);
      console.log(`  vendor/type : ${s.vendor} / ${s.productType}`);
      console.log(`  SKU         : ${v.sku}`);
      console.log(`  fiyat       : ${v.price} EUR  (brut, %19 KDV dahil)${v.compareAtPrice ? `  eski: ${v.compareAtPrice}` : ''}`);
      console.log(`  agirlik     : ${v.inventoryItem.measurement.weight.value} kg`);
      console.log(`  envanter    : tracked=${v.inventoryItem.tracked}  policy=${v.inventoryPolicy}`);
      console.log(`  barkod      : ${v.barcode || '(yok)'}`);
      console.log(`  gorsel      : ${s.files.length} adet  ${s.files[0]?.originalSource?.slice(0, 78) || ''}`);
      console.log(`  etiket      : ${s.tags.join(', ')}`);
      console.log(`  metafield   : ${s.metafields.map((m) => `${m.key}=${m.value}`).join(' ') || '(yok)'}`);
      console.log(`  aciklama    : ${s.descriptionHtml.slice(0, 100).replace(/\n/g, ' ')}...`);
      console.log('  ' + '-'.repeat(62));
    }
    console.log('\n  DRY-RUN bitti. Hicbir sey yazilmadi.');
    console.log('  Canliya yazmak icin: --live  (once magaza + token gerekir)\n');
    return;
  }

  // ── Canlı yazma ──
  // Kimlik bilgisini DONGUDEN ONCE bir kez dogrula. Aksi halde token yokken
  // 6.849 urunun her biri icin ayni hata tekrar tekrar uretilir.
  if (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_ADMIN_TOKEN) {
    console.error('\n  HATA: SHOPIFY_STORE_DOMAIN ve/veya SHOPIFY_ADMIN_TOKEN .env icinde yok.');
    console.error('  Once magazayi kurup custom app token uretmelisin:');
    console.error('  docs/shopify/01-magaza-kurulum-rehberi.md  (Adim 8-9)\n');
    process.exit(1);
  }

  console.log('\n  CANLI MODA GECILIYOR — Shopify magazasina YAZILACAK.');
  console.log(`  hedef: ${env.SHOPIFY_STORE_DOMAIN}  ·  ${payloads.length} urun  ·  ${STATUS}`);
  console.log('  5 saniye icinde Ctrl+C ile durdurabilirsin...\n');
  await new Promise((r) => setTimeout(r, 5000));

  let ok = 0;
  const failed = [];
  for (const [i, input] of payloads.entries()) {
    try {
      const data = await shopifyGraphQL(env, PRODUCT_SET, { input });
      const errs = data.productSet?.userErrors || [];
      if (errs.length) {
        failed.push([input.handle, errs.map((e) => `${e.field}: ${e.message}`).join('; ')]);
      } else {
        ok++;
      }
    } catch (e) {
      failed.push([input.handle, e.message]);
    }
    if ((i + 1) % 25 === 0 || i + 1 === payloads.length) {
      process.stdout.write(`\r  ilerleme: ${i + 1}/${payloads.length}  basarili: ${ok}  hatali: ${failed.length}   `);
    }
  }

  console.log('\n');
  console.log(`  yazilan  : ${ok}`);
  console.log(`  hatali   : ${failed.length}`);
  for (const [h, msg] of failed.slice(0, 15)) console.log(`    ! ${h}: ${msg}`);
  if (failed.length > 15) console.log(`    ... ve ${failed.length - 15} tane daha`);
  console.log('\n  IDEMPOTANLIK TESTI: ayni komutu tekrar calistir.');
  console.log('  Magazadaki urun sayisi DEGISMEMELI (guncelleme yapmali, yeni yaratmamali).\n');
}

main().catch((e) => {
  console.error('\nHATA:', e.message);
  process.exit(1);
});
