// scripts/shopify/lib.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Shopify entegrasyonu için ortak yardımcılar: .env okuma, Supabase REST
// sayfalama ve fiyat/metin normalleştirme.
//
// Kaynak Supabase'dir, src/data/products.json DEĞİL. products.json verinin fakir
// kopyasıdır — ağırlık, stok, promosyon fiyatı ve büyük görseller orada yoktur.
// Ağırlık olmadan Shopify'da kargo tarifesi kurulamaz.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** .env'i basit parse eder. Değerleri ASLA log'a basma. */
export function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  } catch { /* .env yoksa yalnız process.env */ }
  return env;
}

export function supabaseCreds(env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY .env içinde bulunamadı.');
  }
  return { url, key };
}

/** Supabase REST'ten tabloyu 1000'lik sayfalarla tamamen çeker. */
export async function fetchAll(env, table, columns, { pageSize = 1000 } = {}) {
  const { url, key } = supabaseCreds(env);
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const res = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(columns)}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${to}`,
        'Range-Unit': 'items',
      },
    });
    if (!res.ok) throw new Error(`${table} okunamadı: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

// ── Fiyat ────────────────────────────────────────────────────────────────────
export const VAT_RATE = 0.19; // Almanya standart KDV

/**
 * Net fiyatı KDV dahil brüte çevirir. TEK yuvarlama noktası — iki kez
 * yuvarlamak kuruş kaydırır.
 */
export function grossPrice(net) {
  const n = Number(net);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * (1 + VAT_RATE) * 100) / 100;
}

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Supabase'de stok bazen string ("12", "", "Auf Anfrage") gelir. */
export function stockNum(v) {
  if (v == null) return 0;
  const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

// ── Metin ────────────────────────────────────────────────────────────────────
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Düz metni Shopify descriptionHtml'e çevirir (kaçışlı, satır sonları <br>). */
export function toHtml(...parts) {
  const body = parts
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)
    .join('\n\n');
  if (!body) return '';
  return body
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/**
 * Kaba dil sezgisi — Almanca / Hollandaca / İngilizce ayırır.
 *
 * Alman vitrini için kritik: HENDI başlıkları büyük ölçüde İNGİLİZCE
 * ("Fondue-burner - 2 pcs"), CombiSteel alt kategorileri HOLLANDACA
 * ("Werktafels met bodemschap"). Yalnızca "Hollandaca değil" diye bakmak
 * İngilizceyi Almanca sayar — bu yüzden üç dil ayrı ayrı puanlanır ve en çok
 * işaret alan kazanır.
 */
const LANG_MARKERS = {
  de: /\bmit\b|\bfür\b|\bohne\b|\bund\b|kühl|spül|tisch|schrank|becken|gerät|edelstahl|höhe|breite|maschine|wagen/g,
  nl: /\bmet\b|\bvoor\b|\bzonder\b|werktafel|koeling|vaatwas|schap|deuren|\blade\b|afvoer|koelkast/g,
  en: /\bwith\b|\bfor\b|\bwithout\b|\band\b|stainless|worktop|shelf|cover|burner|\btable\b|holder|cabinet|trolley/g,
};

export function guessLang(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  if (!t.trim()) return 'bos';
  const hits = Object.entries(LANG_MARKERS)
    .map(([lang, re]) => [lang, (t.match(re) || []).length])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!hits.length) return 'belirsiz';
  if (hits.length > 1 && hits[0][1] === hits[1][1]) return 'karisik';
  return hits[0][0];
}

/**
 * Marka adı kirliliğini temizler. Kaynak veride yazım hataları var:
 * "C0MBISTEEL" (harf yerine sıfır), "COMBSITEEL" (harf sırası kaymış).
 * Regex yamamak yerine bilinen varyantları açıkça listeliyoruz.
 */
const BRAND_VARIANTS = new Map([
  ['COMBISTEEL', 'CombiSteel'],
  ['CMBISTEEL', 'CombiSteel'],   // C0MBISTEEL → sıfır atılınca
  ['COMBSITEEL', 'CombiSteel'],  // harf sırası kaymış
  ['CMBSITEEL', 'CombiSteel'],
  ['CSPROFESSIONAL', 'CombiSteel'],
  ['CSBUDGETLINE', 'CombiSteel'],
]);

export function normalizeBrand(raw) {
  const b = String(raw || '').trim();
  if (!b) return 'Bilinmiyor';
  const key = b.toUpperCase().replace(/[^A-Z]/g, '');
  const known = BRAND_VARIANTS.get(key);
  if (known) return known;
  if (/DIVERSO/.test(key)) return 'Diverso';
  if (/DIAMOND/.test(key)) return 'Diamond';
  if (/HENDI/.test(key)) return 'HENDI';
  return b;
}

// ── Diamond'a özgü ────────────────────────────────────────────────────────────
/**
 * Diamond görsel URL'i.
 *
 * Supabase'de `image_full` / `image_big` / `image_gallery` sütunları 6.908
 * kaydın TAMAMINDA boş; yalnızca `image_thumb` dolu (6.904). Ama CDN'de büyük
 * varyant duruyor: `-thumb.jpg` → `-big.jpg` (doğrulandı: 200, ~70 KB / thumb
 * ~20 KB). `-full.jpg` 403 veriyor, kullanma.
 *
 * Vitrinde thumb kullanmak ürünü ucuz gösterir; bu yüzden büyüğü türetiyoruz.
 */
export function diamondImage(thumbUrl) {
  const u = String(thumbUrl || '').trim();
  if (!/^https?:\/\//.test(u)) return null;
  return u.includes('-thumb.') ? u.replace('-thumb.', '-big.') : u;
}

/**
 * Diamond için Almanca metin kaynağı.
 *
 * Supabase'deki Diamond başlıkları İNGİLİZCE (sync `DIAMOND_LANGUAGE=tr` ile
 * çalışmış, Diamond API İngilizce'ye düşmüş). `src/data/products.json` ise
 * ALMANCA başlık/açıklama taşıyor (aynı id'de %91,6 farklı).
 *
 * Alman mağazası Almanca başlık ister; lojistik alanlar (ağırlık, ölçü, güç)
 * ise yalnızca Supabase'de var. Bu yüzden iki kaynağı id üzerinden birleştiriyoruz.
 * Kalıcı çözüm: diamond-sync.mjs'i DIAMOND_LANGUAGE=de ile yeniden çalıştırmak.
 */
export function loadGermanCopy() {
  try {
    const rows = JSON.parse(readFileSync(resolve(ROOT, 'src/data/products.json'), 'utf8'));
    const map = new Map();
    for (const p of rows) {
      map.set(String(p.id), {
        name: p.name, desc: p.desc, cat: p.cat, sub: p.sub, line: p.line, fam: p.fam,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Üst kategori kodu → Almanca vitrin etiketi.
 *
 * Supabase'in `product_family_name` sütunu müşteriye gösterilemez: içeriği
 * Fransızca üretim tanımı ("Livrées en Kit / Démont. A / dos", "Soudés").
 * Bunun yerine products.json'daki `cat` (17 kod, %100 dolu) + `sub`
 * (müşteriye dönük Almanca alt kategori) kullanılır.
 */
export const CATEGORY_DE = {
  cooling: 'Kühltechnik',
  cooking: 'Kochtechnik',
  prep_hygiene: 'Vorbereitung & Hygiene',
  self_service: 'Self-Service',
  pizza_pasta: 'Pizza & Pasta',
  dynamic_prep: 'Vorbereitungsgeräte',
  dishwash: 'Spültechnik',
  cook_chill: 'Cook & Chill',
  ventilation: 'Lüftungstechnik',
  bakery: 'Backtechnik',
  trolley_gn: 'Wagen & GN-Behälter',
  coffee_tea: 'Kaffee & Tee',
  laundry: 'Wäschereitechnik',
  ice_cream: 'Eistechnik',
  hospitality: 'Hotelbedarf',
  cleaning_products: 'Reinigungsmittel',
  spare_parts: 'Ersatzteile',
};

export function catLabel(code) {
  return CATEGORY_DE[String(code || '').trim()] || null;
}

/**
 * `sub` alanındaki kodlama bozukluklarını onarır. Diamond kataloğunda
 * umlaut'lar kimi kayıtta düşmüş ("Khl- und Gefriertische") ya da çevriyazıya
 * dönmüş ("Kuehl/Gefrieschraenke").
 */
const SUB_FIX = [
  [/^Khl- und Gefriertische$/i, 'Kühl- und Gefriertische'],
  [/^Kuehl\/Gefrieschraenke$/i, 'Kühl-/Gefrierschränke'],
  [/^Kuehl\/Gefrierkuehlzellen$/i, 'Kühl-/Gefrierzellen'],
  [/^Weinschraenke$/i, 'Weinschränke'],
  [/^Pizzaoefen$/i, 'Pizzaöfen'],
  [/^Flaschenkuehlschranke$/i, 'Flaschenkühlschränke'],
  [/^Nudelmaschine$/i, 'Nudelmaschinen'],
];

export function cleanSub(sub) {
  const s = String(sub || '').trim();
  if (!s) return null;
  for (const [re, fix] of SUB_FIX) if (re.test(s)) return fix;
  return s;
}

/**
 * Barkod (EAN/GTIN) geçerlilik denetimi.
 *
 * Doluluk ≠ geçerlilik. `handi_products.ean` sütununda TÜM satırlar aynı bozuk
 * değeri taşıyor: "8,71137E+12" — Excel/CSV dışa aktarımında sütun bilimsel
 * gösterime düşmüş ve her kayıt aynı yuvarlanmış metne çökmüş. Böyle bir değeri
 * Shopify'a barkod diye yazmak, Google kanalında tüm ürünleri mükerrer barkod
 * gerekçesiyle reddettirir.
 *
 * Geçerli GTIN: 8, 12, 13 veya 14 hane, yalnız rakam.
 */
export function validEan(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/[eE]\+?\d/.test(s)) return null;      // bilimsel gösterim → bozuk
  const digits = s.replace(/\D/g, '');
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return null;
  if (/^0+$/.test(digits)) return null;
  return digits;
}
