#!/usr/bin/env node
// scripts/shopify/preflight.mjs
// ─────────────────────────────────────────────────────────────────────────────
// F0 — ENVANTER DENETİMİ. Shopify kimlik bilgisi GEREKTİRMEZ, hiçbir yere YAZMAZ.
//
// Supabase'deki üç ürün tablosunu Shopify'ın gerçek gereksinimlerine göre
// puanlar: satılabilirlik (isim/fiyat/görsel), kargo edilebilirlik (ağırlık),
// envanter (stok), keşfedilebilirlik (kategori/açıklama/barkod).
//
// Kullanım:
//   node scripts/shopify/preflight.mjs
//   node scripts/shopify/preflight.mjs --json docs/shopify/envanter.json
import { writeFileSync } from 'node:fs';
import {
  loadEnv, fetchAll, grossPrice, stockNum, num, guessLang, slugify,
  diamondImage, loadGermanCopy, validEan,
} from './lib.mjs';

const args = process.argv.slice(2);
const jsonAt = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

// Diamond basliklari Supabase'de INGILIZCE; Almancasi products.json'da.
const DE = loadGermanCopy();

// Her kaynak: hangi tablo, hangi sütunlar, Shopify alanlarına nasıl bakılır.
const SOURCES = [
  {
    key: 'diamond',
    label: 'Diamond',
    table: 'diamond_products',
    columns: 'id,name,description_tech_spec,popup_info,price_display,price_catalog,price_promo,stock,weight,weight_unit,length_mm,width_mm,height_mm,electric_power_kw,image_thumb,image_full,image_big,image_gallery,product_family_name,product_line_id',
    map: (r) => {
      // Almanca metin products.json'dan gelir; Supabase'deki isim Ingilizce.
      const de = DE.get(String(r.id));
      const title = de?.name || r.name;
      const body = [de?.desc, r.description_tech_spec, r.popup_info].filter(Boolean).join('\n\n');
      // image_full/image_big/image_gallery TUM kayitlarda bos; thumb'dan big turet.
      const img = diamondImage(r.image_thumb);
      return {
        id: String(r.id),
        sku: String(r.id),
        title,
        body,
        net: num(r.price_display) || num(r.price_catalog),
        stock: stockNum(r.stock), // Diamond'da stok sutunu TAMAMEN bos
        weight: num(r.weight),
        images: img ? [img] : [],
        category: r.product_family_name,
        ean: null, // Diamond tablosunda barkod alani YOK
        dims: num(r.length_mm) > 0 && num(r.width_mm) > 0,
        deCopy: Boolean(de?.name) && guessLang(title) !== 'en',
        langSample: [title, de?.desc || r.description_tech_spec].filter(Boolean).join(' '),
      };
    },
  },
  {
    key: 'combisteel',
    label: 'CombiSteel',
    table: 'combisteel_products',
    columns: 'id,sku,title,description,long_description,brand,ean,price,stock,gross_weight,net_weight,length_mm,width_mm,height_mm,image_url,extra_images,category_name',
    map: (r) => ({
      id: String(r.id),
      sku: r.sku || String(r.id),
      title: r.title,
      body: [r.description, r.long_description].filter(Boolean).join('\n\n'),
      net: num(r.price),
      stock: stockNum(r.stock),
      weight: num(r.gross_weight) || num(r.net_weight),
      images: [r.image_url, ...(Array.isArray(r.extra_images) ? r.extra_images : [])].filter(Boolean),
      category: r.category_name,
      ean: validEan(r.ean),
      dims: num(r.length_mm) > 0 && num(r.width_mm) > 0,
      deCopy: guessLang([r.title, r.description].filter(Boolean).join(' ')) === 'de',
      langSample: [r.title, r.description].filter(Boolean).join(' '),
    }),
  },
  {
    key: 'hendi',
    label: 'HENDI',
    table: 'handi_products',
    columns: 'id,ean,brand,name,description,short_desc,price,stock,status,image_url,category_name,sub_category,net_weight,gross_weight,length_mm,width_mm,height_mm',
    map: (r) => ({
      id: String(r.id),
      sku: String(r.id),
      title: r.name,
      body: [r.description, r.short_desc].filter(Boolean).join('\n\n'),
      net: num(r.price),
      stock: stockNum(r.stock),
      weight: num(r.gross_weight) || num(r.net_weight),
      images: [r.image_url].filter(Boolean),
      category: r.category_name || r.sub_category,
      ean: validEan(r.ean),
      dims: num(r.length_mm) > 0 && num(r.width_mm) > 0,
      deCopy: guessLang([r.name, r.sub_category, r.description].filter(Boolean).join(' ')) === 'de',
      langSample: [r.name, r.sub_category, r.description].filter(Boolean).join(' '),
    }),
  },
];

// Shopify açısından her ürünün geçmesi gereken kontroller.
const CHECKS = [
  ['Başlık', (p) => Boolean(p.title && p.title.trim()), 'zorunlu'],
  ['Fiyat > 0', (p) => p.net > 0, 'zorunlu'],
  ['Görsel (http)', (p) => p.images.some((u) => /^https?:\/\//.test(u)), 'zorunlu'],
  ['Açıklama', (p) => Boolean(p.body && p.body.trim().length > 20), 'SEO'],
  ['Kategori', (p) => Boolean(p.category && String(p.category).trim()), 'SEO'],
  ['Ağırlık > 0', (p) => p.weight > 0, 'kargo'],
  ['Ölçü (en x boy)', (p) => p.dims, 'kargo'],
  ['Stok > 0', (p) => p.stock > 0, 'envanter'],
  ['Gecerli barkod', (p) => Boolean(p.ean), 'kanal'],
  ['Almanca metin', (p) => p.deCopy === true, 'SEO'],
];

const pct = (n, total) => (total ? ((100 * n) / total).toFixed(1) : '0.0');
const bar = (p) => {
  const f = Math.max(0, Math.min(20, Math.round(Number(p) / 5)));
  return '#'.repeat(f) + '.'.repeat(20 - f);
};

async function main() {
  const env = loadEnv();
  console.log('');
  console.log('==================================================================');
  console.log('  2MC GASTRO -> SHOPIFY  ·  F0 ENVANTER DENETIMI');
  console.log('  (salt-okunur — hicbir yere yazmaz, Shopify erisimi gerekmez)');
  console.log('==================================================================');

  const report = { olusturuldu: new Date().toISOString(), kaynaklar: [], toplam: {} };

  for (const src of SOURCES) {
    process.stdout.write(`\n-> ${src.table} okunuyor... `);
    let rows;
    try {
      rows = await fetchAll(env, src.table, src.columns);
    } catch (e) {
      console.log(`HATA: ${e.message}`);
      continue;
    }
    const items = rows.map(src.map);
    console.log(`${items.length} kayit`);

    const results = CHECKS.map(([label, fn, kind]) => {
      const ok = items.filter(fn).length;
      return { label, kind, ok, eksik: items.length - ok, pct: pct(ok, items.length) };
    });

    // Shopify'a yuklenebilir = zorunlu kontrollerin HEPSI gecen
    const required = CHECKS.filter(([, , k]) => k === 'zorunlu').map(([, fn]) => fn);
    const sellable = items.filter((p) => required.every((fn) => fn(p)));
    // Kargo edilebilir = yuklenebilir + agirligi olan
    const shippable = sellable.filter((p) => p.weight > 0);

    // Mukerrer SKU
    const seen = new Set();
    const dupes = new Set();
    for (const p of items) {
      if (seen.has(p.sku)) dupes.add(p.sku);
      seen.add(p.sku);
    }

    // Handle cakismasi (slugify(title)-id)
    const handles = new Set();
    let handleDupes = 0;
    for (const p of items) {
      const h = `${slugify(p.title)}-${p.id}`.replace(/^-+/, '');
      if (handles.has(h)) handleDupes++;
      handles.add(h);
    }

    // Barkod tekilligi — ayni EAN tum kayitlarda tekrar ediyorsa veri bozuk.
    const eans = items.map((p) => p.ean).filter(Boolean);
    const eanUnique = new Set(eans).size;

    // Dil
    const langs = {};
    for (const p of items) {
      const l = guessLang(p.langSample);
      langs[l] = (langs[l] || 0) + 1;
    }

    // Fiyat
    const nets = sellable.map((p) => p.net).sort((a, b) => a - b);
    const median = nets.length ? nets[Math.floor(nets.length / 2)] : 0;

    console.log('');
    console.log(`  +- ${src.label} ${'-'.repeat(Math.max(0, 50 - src.label.length))}`);
    console.log(`  | toplam kayit      : ${items.length}`);
    console.log(`  | Shopify'a uygun   : ${sellable.length}  (${pct(sellable.length, items.length)}%)`);
    console.log(`  | kargo edilebilir  : ${shippable.length}  (${pct(shippable.length, items.length)}%)  <- agirligi olan`);
    console.log('  +- alan dolulugu -----------------------------------------');
    for (const r of results) {
      console.log(`  | ${r.label.padEnd(16)} ${bar(r.pct)} ${String(r.pct).padStart(5)}%  ${String(r.ok).padStart(5)}  [${r.kind}]`);
    }
    console.log('  +- fiyat (net -> brut %19 KDV dahil) ----------------------');
    console.log(`  | medyan net ${median.toFixed(2)} EUR  ->  brut ${(grossPrice(median) ?? 0).toFixed(2)} EUR`);
    if (nets.length) {
      console.log(`  | en dusuk ${nets[0].toFixed(2)}   en yuksek ${nets[nets.length - 1].toFixed(2)}`);
    }
    console.log('  +- dil dagilimi (baslik+aciklama sezgisi) -----------------');
    console.log(`  | ${Object.entries(langs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  ')}`);
    console.log('  +- butunluk -----------------------------------------------');
    console.log(`  | mukerrer SKU      : ${dupes.size}`);
    console.log(`  | gecerli barkod    : ${eans.length}  (benzersiz: ${eanUnique})`);
    console.log(`  | handle cakismasi  : ${handleDupes}`);
    console.log('  +----------------------------------------------------------');

    report.kaynaklar.push({
      kaynak: src.key,
      etiket: src.label,
      tablo: src.table,
      toplam: items.length,
      shopifyUygun: sellable.length,
      kargoEdilebilir: shippable.length,
      kontroller: results,
      medyanNet: median,
      medyanBrut: grossPrice(median),
      enDusukNet: nets[0] ?? 0,
      enYuksekNet: nets[nets.length - 1] ?? 0,
      diller: langs,
      mukerrerSku: dupes.size,
      gecerliBarkod: eans.length,
      benzersizBarkod: eanUnique,
      handleCakismasi: handleDupes,
    });
  }

  const t = report.kaynaklar.reduce(
    (a, s) => ({
      toplam: a.toplam + s.toplam,
      uygun: a.uygun + s.shopifyUygun,
      kargo: a.kargo + s.kargoEdilebilir,
    }),
    { toplam: 0, uygun: 0, kargo: 0 },
  );
  report.toplam = t;

  console.log('');
  console.log('==================================================================');
  console.log('  GENEL');
  console.log('==================================================================');
  console.log(`  toplam urun            : ${t.toplam}`);
  console.log(`  Shopify'a yuklenebilir : ${t.uygun}  (${pct(t.uygun, t.toplam)}%)`);
  console.log(`  kargo edilebilir       : ${t.kargo}  (${pct(t.kargo, t.toplam)}%)`);
  console.log('');
  console.log("  NOT: fiyatlar Shopify'a BRUT (%19 KDV dahil) yazilacak.");
  console.log('  Site B2B net gosteriyor (zzgl. MwSt.) — iki kanal farkli rakam gosterir.');
  console.log('');

  if (jsonAt) {
    writeFileSync(jsonAt, JSON.stringify(report, null, 2), 'utf8');
    console.log(`  JSON yazildi: ${jsonAt}`);
    console.log('');
  }
}

main().catch((e) => {
  console.error('\nHATA:', e.message);
  process.exit(1);
});
