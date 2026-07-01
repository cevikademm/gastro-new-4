// seed-angebot-projects.mjs — angebot/ klasöründeki 4 PEFRA/SC-Gastro teklifini
// ============================================================================
// gastro_projects tablosuna PROJE olarak yükler. Her teklif 3 kullanıcıya birden
// (cevikademm@gmail.com, mete@2mcgastro.de, fatih@2mcgastro.de) ayrı kopya olarak
// yazılır → uygulama projeleri user_id (auth uid) ile çektiği için hepsinde görünür.
//
// Kalemler Art.-Nr. (code) ile SİSTEM KATALOĞUNA eşlenir → her ürünün
// SİSTEMDEKİ ADI + ÖLÇÜSÜ + GÖRSELİ projeye yazılır:
//   • ad + kW + görsel  ← src/data/products.json (id = Art.-Nr.)
//   • temiz ölçü (mm)   ← all_products view (parse_mm ile ayrıştırılmış)
// Fiyat PEFRA teklifinden korunur: birim net = E.-Preis × (1 − Rabatt);
// tüm satırların toplamı her teklifin "Gesamt Netto" tutarına birebir eşittir.
// Menge>1 kalemler adet kadar kopyalanır (teklif adedi 1'e sabitlediği için).
//
// İdempotent: id = 'ang-<no>-<uid>' → tekrar çalıştırınca üzerine yazar.
// Çalıştırma:  node scripts/seed-angebot-projects.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// --- .env oku (bağımlılıksız) ---
const env = {};
for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('HATA: .env içinde SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAILS = ['cevikademm@gmail.com', 'mete@2mcgastro.de', 'fatih@2mcgastro.de'];

async function findUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const u = data.users.find((x) => (x.email || '').toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 1000) return null;
    page++;
  }
}

// --- ProductItem yardımcıları (kategori/güç ada göre tahmin) ---
function categorize(name) {
  const s = name.toLowerCase();
  if (/(kühlzelle|kühltisch|kühl)/.test(s)) return 'cold';
  if (/(spülmaschine|geschirrspül|handwaschbecken|geschirrbrause|reinigungsmittel|spülen|entkalken)/.test(s)) return 'cleaning';
  if (/(tisch|untergestell|unterbau|ständer|einlauf|auslauf)/.test(s)) return 'neutral';
  if (/(kombidämpfer|herd|friteuse|fritteuse|grillplatte|pizzaofen|kontaktgrill|bain-marie)/.test(s)) return 'cooking';
  return 'other';
}
function powerOf(name) {
  const s = name.toLowerCase();
  if (/herd .*brenner|brenner/.test(s)) return 'gas';
  if (/(elektro|elek\.|elektrische|kühl|spülmaschine|geschirrspül|grill|dämpfer|friteuse|fritteuse|bain-marie)/.test(s)) return 'electric';
  return 'none';
}

// --- 4 teklif verisi (angebot/*.pdf'ten çıkarıldı; e = E.-Preis, r = Rabatt %) ---
// items: { n: Bezeichnung, code: Art.-Nr, qty: Menge, e: E.-Preis, r: Rabatt% }
const QUOTES = [
  {
    no: '5069', name: '2MC Werbung – Gazeltzes (Angebot 5069)', client: '2MC Werbung', netto: '25.390,41',
    items: [
      { n: 'Elektro Kombidämpfer "TOUCH" mit Boiler & Konvektion 10xGN1/1 + Reinigung', code: 'SBET/10S', qty: 1, e: 14131, r: 45 },
      { n: 'Untergestell mit Rostführung für Öfen 6 & 10 GN 1/1', code: 'AC/SS11-X', qty: 1, e: 1236, r: 45 },
      { n: 'Spülen / Entkalken Tablette (50 Stück)', code: 'AC/CL-RI', qty: 1, e: 107, r: 45 },
      { n: 'Kit externe Handbrause für Ofen, seitliche Fixierung', code: 'AC/DLM', qty: 1, e: 263, r: 45 },
      { n: 'Reinigungsmittel Tablette (100 Stück)', code: 'AC/CL-BP', qty: 1, e: 136, r: 45 },
      { n: 'Herd bestehend aus: 6 Brenner & Unterbau offen', code: 'G7/6BA11-RN', qty: 1, e: 2924, r: 45 },
      { n: 'Elektro-Friteuse, 2 Becken für 2x 14 Liter mit Unterschrank', code: 'WR-EF28-E2', qty: 1, e: 1744, r: 40 },
      { n: 'Kühlzelle ISO 60 mit Gruppe, Innendim. 2030 x 2030 x h2030mm (8,37m²)', code: 'WR-C2226-6R', qty: 1, e: 6557, r: 40 },
      { n: 'Kühlzelle ISO 80 mit Gruppe, Innendim. 2030 x 2030 x h2030mm (8,37m²)', code: 'WR-Z2226-8V', qty: 1, e: 7812, r: 40 },
      { n: 'Durchschubspülmaschine, Korb 500x500 mm "Full Hygiene"', code: 'DXE8/6', qty: 1, e: 4681, r: 45 },
      { n: 'Abfallbehälter mit Deckel auf Rollen - 50 Liter', code: 'PCR/50B', qty: 1, e: 202, r: 45 },
      { n: 'Geschirrbrause Edelstahl und Schwenkhahn mit Einlochmischbatterie "Heavy-Duty" (Ausgang MONO)', code: 'CW4088/HD', qty: 1, e: 655, r: 45 },
      { n: 'Ein- & Auslauftisch (alle Modelle)', code: 'DL120', qty: 1, e: 756, r: 45 },
      { n: 'Einlauftisch "links" (alle Modelle)', code: 'DLVS-S16', qty: 1, e: 1367, r: 45 },
      { n: 'Speditionsversand', code: 'VERSAND', qty: 1, e: 1170.71, r: 0 },
    ],
  },
  {
    no: '5070', name: '2MC Werbung – Köln Deutz (Angebot 5070)', client: '2MC Werbung', netto: '32.171,06',
    items: [
      { n: 'Elektro Kombidämpfer "TOUCH" mit Boiler & Konvektion 10xGN1/1 + Reinigung', code: 'SBET/10S', qty: 1, e: 14131, r: 45 },
      { n: 'Kit externe Handbrause für Ofen, seitliche Fixierung', code: 'AC/DLM', qty: 1, e: 263, r: 45 },
      { n: 'Untergestell mit Rostführung für Öfen 6 & 10 GN 1/1', code: 'AC/SS11-X', qty: 1, e: 1236, r: 45 },
      { n: 'Reinigungsmittel Tablette (100 Stück)', code: 'AC/CL-BP', qty: 1, e: 136, r: 45 },
      { n: 'Spülen / Entkalken Tablette (50 Stück)', code: 'AC/CL-RI', qty: 1, e: 107, r: 45 },
      { n: 'Kühlzelle ISO 60 mit Gruppe, Innendim. 2030 x 2030 x h2030mm (8,37m²)', code: 'WR-C2226-6R', qty: 2, e: 6557, r: 40 },
      { n: 'Kühlzelle ISO 80 mit Gruppe, Innendim. 2030 x 2030 x h2030mm (8,37m²)', code: 'WR-Z2226-8V', qty: 1, e: 7812, r: 40 },
      { n: 'Spiralkneter 53 Liter, neigbarer Kopf, abnehmbarer Behälter, 2 Geschwindigkeiten, Timer, auf Rädern', code: 'FD53AL/T2V-L', qty: 1, e: 2873, r: 45 },
      { n: 'Elektro Kontaktgrill Panini DOPPELT, gerillte Platte', code: 'WR-GR82-62', qty: 1, e: 802, r: 40 },
      { n: 'Elektro-Friteuse, 2 Becken für 2x 14 Liter mit Unterschrank', code: 'WR-EF28-E2', qty: 1, e: 1744, r: 40 },
      { n: 'Salzbecken für Pommes frites -Top-', code: 'E65/SF4T-N', qty: 1, e: 931, r: 45 },
      { n: 'Offener Unterbau', code: 'N65/BA4-N', qty: 1, e: 403, r: 45 },
      { n: 'Handwaschbecken', code: 'WR-LV43-PT', qty: 1, e: 271, r: 40 },
      { n: 'Durchschubspülmaschine, Korb 500x500 mm "Full Hygiene"', code: 'DXE8/6', qty: 1, e: 4681, r: 45 },
      { n: 'Abfallbehälter mit Deckel auf Rollen - 50 Liter', code: 'PCR/50B', qty: 1, e: 202, r: 45 },
      { n: 'Geschirrbrause Edelstahl und Schwenkhahn mit Einlochmischbatterie "Heavy-Duty" (Ausgang MONO)', code: 'CW4088/HD', qty: 1, e: 655, r: 45 },
      { n: 'Ein- & Auslauftisch (alle Modelle)', code: 'DL25', qty: 1, e: 484, r: 45 },
      { n: 'Einlauftisch "rechts" (alle Modelle)', code: 'DLVS-D16', qty: 1, e: 1367, r: 45 },
      { n: 'Herd bestehend aus: 4 Brenner & Unterbau offen', code: 'G7/4BA7-RN', qty: 1, e: 2337, r: 45 },
      { n: 'Speditionsversand', code: 'VERSAND', qty: 1, e: 1531.96, r: 0 },
    ],
  },
  {
    no: '5071', name: 'Zayo (Angebot 5071)', client: 'Zayo', netto: '5.906,22',
    items: [
      { n: 'Elektro-Grillplatte, glatt, hartverchromt, Modul 1/2 -Top-', code: 'E7/PLCD4T-N', qty: 1, e: 2326, r: 45 },
      { n: 'Unterbau offen, auf verstellbaren Füßen aus Edelstahl', code: 'N7/BA4-RN', qty: 1, e: 537, r: 45 },
      { n: 'Elektro Pizzaofen, 2x 4 Pizzen', code: 'LFD-08', qty: 1, e: 3952, r: 45 },
      { n: 'Edelstahlständer für Ofen NRP/08 & LFD-08', code: 'SAT/08', qty: 1, e: 527, r: 45 },
      { n: 'Spiralkneter 42 Liter, 2 Geschwindigkeiten, Timer, auf Rädern', code: 'FD42/T2V-S', qty: 1, e: 2296, r: 45 },
      { n: 'Handwaschbecken', code: 'WR-LV43-PT', qty: 1, e: 271, r: 0 },
      { n: 'Speditionsversand', code: 'VERSAND', qty: 1, e: 334.32, r: 0 },
    ],
  },
  {
    no: '5072', name: 'Mister Potato (Angebot 5072)', client: 'Mister Potato', netto: '21.906,12',
    items: [
      { n: 'Elek. Friteuse 1 Becken "Y" 23 L, externe Brenner, auf Unterschrank', code: 'E22/F23A4-S', qty: 1, e: 5410, r: 45 },
      { n: 'Elek. Friteuse 2 Becken "Y" je 23 L, externe Brenner, auf Unterschrank', code: 'E22/F46A8-S', qty: 1, e: 9311, r: 45 },
      { n: 'Kühlzelle ISO 60 mit Gruppe, Innendim. 1430 x 1230 x h2030 mm (4,07 m²)', code: 'WR-C1714-6P', qty: 1, e: 5131, r: 40 },
      { n: 'Kühltisch: Set mit 2 Schubladen (1/2+1/2 h200mm) für DT../P9H x3 – Umluft-Kühltisch, 3 Türen GN 1/1, 405 Lit.', code: 'DT178/P9H', qty: 1, e: 5351, r: 45 },
      { n: 'Tischgemüseschneider aus Edelstahl', code: 'TVX-55', qty: 1, e: 1550, r: 45 },
      { n: 'Geschirrspülmaschine mit Korb 500 mm + Ablaufpumpe und Spülmitteldosierer', code: 'WR-LV50-MPD5', qty: 1, e: 2116, r: 40 },
      { n: 'Elektro Bain-Marie GN 1/1, 150 mm tief -Top-', code: 'E7/BM4T-N', qty: 1, e: 1206, r: 45 },
      { n: 'Elektrische Fritteuse, 2 Becken, 7 Liter -Top-', code: 'E7/F2V64T-N', qty: 1, e: 2904, r: 45 },
      { n: 'Elektro-Grillplatte, glatt, hartverchromt, Modul 1/2 -Top-', code: 'E7/PLCD4T-N', qty: 1, e: 2326, r: 45 },
      { n: 'Unterbau offen, auf verstellbaren Füßen aus Edelstahl', code: 'N7/BA4-RN', qty: 3, e: 537, r: 45 },
      { n: 'Speditionsversand', code: 'VERSAND', qty: 1, e: 1239.97, r: 0 },
    ],
  },
];

const round2 = (n) => Math.round(n * 100) / 100;
const unitPrice = (e, r) => round2(e * (1 - r / 100));

// --- Sistem kataloğu: ad + kW + görsel (products.json), temiz ölçü (all_products) ---
const PJ = new Map(
  JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'))
    .map((p) => [p.id, p]),
);

// all_products (mm) → ProductItem.dimensions (cm). Diamond: length_mm=Breite,
// width_mm=Tiefe, height_mm=Höhe ("W x D x H" düzeni). depth_mm Diamond'da boş.
function dimsCm(ap) {
  if (!ap) return { width: 0, height: 0, depth: 0 };
  const W = ap.length_mm ?? ap.width_mm ?? 0;
  const D = (ap.length_mm != null ? ap.width_mm : ap.depth_mm) ?? 0;
  const H = ap.height_mm ?? 0;
  return { width: Math.round(W / 10), height: Math.round(H / 10), depth: Math.round(D / 10) };
}

// AP: all_products satırları code → row (main'de doldurulur)
let AP = new Map();

// products.json'da birkaç Diamond kaydı İngilizce kalmış → Almanca teklifte
// tutarlı görünmesi için temiz Almanca (PEFRA) ada düşürülür.
const ENGLISHISH = /\b(consist of|burners|Ventilated|refrigerated|Room ISO|with group|Wall-mounted|removable feet|Open base|Table top|Hood|basket|basin|composed|doors)\b/i;
function pickName(pjName, fallback) {
  if (!pjName) return fallback;
  return ENGLISHISH.test(pjName) ? fallback : pjName;
}

function buildProducts(q) {
  const out = [];
  q.items.forEach((it, idx) => {
    const price = unitPrice(it.e, it.r);
    const pj = PJ.get(it.code);      // sistem (Almanca) adı + kW + görsel
    const ap = AP.get(it.code);      // temiz ölçü
    const name = pickName(pj?.name, it.n);   // SİSTEMDEKİ AD (İngilizce kalmışsa Almanca'ya düş)
    const image = pj?.img || ap?.image || '';
    const kw = Number(pj?.kw) || 0;
    const dims = dimsCm(ap);
    const cat = categorize(it.n);    // kategori: güvenilir Almanca metinden
    const pw = kw > 0 ? 'electric' : powerOf(it.n);
    for (let k = 0; k < it.qty; k++) {
      out.push({
        id: `p-${q.no}-${idx + 1}${it.qty > 1 ? '-' + (k + 1) : ''}`,
        name,
        code: it.code,
        category: cat,
        icon: 'package',
        imageData: image,            // sistem görseli (URL) → Ürünler/Teklif/PDF
        dimensions: dims,            // SİSTEMDEKİ ÖLÇÜ (cm)
        kw,
        powerType: pw,
        price,
        description: '',
        brand: it.code === 'VERSAND' ? '' : (ap?.brand || 'Diamond'),
        series: '',
        features: [],
      });
    }
  });
  return out;
}

// --- kullanıcıları çöz ---
const users = [];
for (const email of EMAILS) {
  const u = await findUserByEmail(email);
  if (!u) {
    console.warn(`⚠  Kullanıcı bulunamadı, atlanıyor: ${email} (auth.users içinde yok)`);
    continue;
  }
  users.push({ email, id: u.id });
}
if (users.length === 0) {
  console.error('HATA: hiçbir kullanıcı bulunamadı. Önce scripts/create-team-accounts.mjs çalıştırın.');
  process.exit(1);
}

// --- all_products'tan temiz ölçüleri çek (Art.-Nr. = code ile) ---
const allCodes = [...new Set(QUOTES.flatMap((q) => q.items.map((it) => it.code)).filter((c) => c !== 'VERSAND'))];
{
  const { data, error } = await supabase
    .from('all_products')
    .select('code,length_mm,width_mm,height_mm,depth_mm,image,brand')
    .in('code', allCodes);
  if (error) console.warn('⚠  all_products ölçü sorgusu hata:', error.message);
  AP = new Map((data || []).map((r) => [r.code, r]));
}
const matched = allCodes.filter((c) => PJ.has(c) || AP.has(c)).length;
console.log(`Katalog eşleşmesi: ${matched}/${allCodes.length} Art.-Nr. (ad+kW+görsel: products.json, ölçü: all_products)`);

// --- upsert: her teklif × her kullanıcı ---
const results = [];
for (const q of QUOTES) {
  const products = buildProducts(q);
  const withImg = products.filter((p) => p.imageData).length;
  const withDim = products.filter((p) => p.dimensions.width || p.dimensions.height).length;
  const sum = round2(products.reduce((s, p) => s + p.price, 0));
  for (const u of users) {
    const id = `ang-${q.no}-${u.id}`;
    const { error } = await supabase.from('gastro_projects').upsert({
      id,
      user_id: u.id,
      name: q.name,
      type: 'commercial',
      area: '',
      lead: '',
      status: 'quoted',
      progress: 100,
      client_name: q.client,
      start_date: '2026-06-26',
      deadline: '',
      notes: `Angebot-Nr. ${q.no} · 26.06.2026 · PEFRA/SC-Gastro · Netto €${q.netto}`,
      room_width_cm: 500,
      room_height_cm: 400,
      products,
    }, { onConflict: 'id' });
    results.push({ no: q.no, email: u.email, ok: !error, count: products.length, sum, withImg, withDim, msg: error?.message });
  }
}

console.log('\n========== SONUÇ ==========');
for (const q of QUOTES) {
  const rows = results.filter((r) => r.no === q.no);
  const ok = rows.filter((r) => r.ok).length;
  const cnt = rows[0]?.count ?? 0;
  const sum = rows[0]?.sum ?? 0;
  console.log(`Angebot ${q.no} | ${q.name}`);
  console.log(`   kalem: ${cnt} (görsel: ${rows[0]?.withImg ?? 0}, ölçü: ${rows[0]?.withDim ?? 0}) · Σ net: €${sum.toLocaleString('de-DE', { minimumFractionDigits: 2 })} (PDF: €${q.netto}) · yazılan kullanıcı: ${ok}/${rows.length}`);
  for (const r of rows) {
    console.log(`   ${r.ok ? '✓' : '✗'} ${r.email}${r.ok ? '' : ' → ' + r.msg}`);
  }
}
console.log(`\nToplam ${results.filter((r) => r.ok).length}/${results.length} satır yazıldı.`);
console.log('===========================\n');
