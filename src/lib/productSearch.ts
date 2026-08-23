// Ürün araması — çok sözcüklü sorgu desteği
// ==========================================
// Eski davranış sorgunun TAMAMINI tek parça olarak `includes()` ile arıyordu:
// "gasherd" çalışıyordu ama "gasherd commercial" hiçbir alanda birebir geçmediği
// için tüm sonuçlar siliniyordu. Burada sorgu kelimelere bölünür ve üç aşama
// uygulanır:
//
//   1. Korpüste HİÇ karşılığı olmayan kelime düşürülür — yazım hatası ya da
//      pazarlama sıfatı ("commercial", "profi") tek başına aramayı öldürmesin.
//   2. KATI eşleşme: kalan kelimelerin TAMAMI üründe geçmeli (kelime başına
//      herhangi bir alan). Sonuç varsa gürültüsüz liste budur — varsayılan.
//   3. Katı eşleşme boşsa GEVŞEK eşleşme: en az bir kelimeyi içeren ürünler,
//      alaka puanına göre sıralanır (öndeki kelime daha ağır basar, çünkü
//      kullanıcı genelde önce ana ürün adını yazar).
//
// Metin normalizasyonu aksanları da düşürür: "kuhlschrank" → "Kühlschrank"
// eşleşir (Almanca müşteri umlaut'suz yazdığında sonuç kaybolmasın).

/** Aramaya giren minimum ürün şekli — EquipmentItem bunu yapısal olarak karşılar. */
export interface SearchableProduct {
  name?: string;
  id?: string;
  desc?: string;
  brand?: string;
  sub?: string;
  fam?: string;
}

export interface ProductSearchResult<T> {
  items: T[];
  /**
   * Gösterilen liste sorgunun tamamını karşılamıyor: kelimelerden biri düştü ya
   * da yalnızca kısmî eşleşme bulundu. UI bunu kullanıcıya bildirir.
   */
  partial: boolean;
  /** Aramada gerçekten kullanılan (normalize edilmiş) kelimeler. */
  terms: string[];
}

// toLowerCase + NFD ile çözülmeyen latin harfleri.
const LATIN_EXTRAS: Record<string, string> = {
  ß: 'ss', ı: 'i', ø: 'o', æ: 'ae', œ: 'oe', đ: 'd', ð: 'd', þ: 'th', ł: 'l',
};

/**
 * Küçük harfe indirger, aksanları atar, harf/rakam dışındaki her şeyi boşluğa
 * çevirir: "AS-70/60" → "as 70 60", "Kühlschrank" → "kuhlschrank".
 * Latin dışı alfabeler (ör. Yunanca) korunur — eşleşmezse sonuç boş kalır,
 * sessizce "tüm ürünler"e düşmez.
 */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ßıøæœđðþł]/g, (ch) => LATIN_EXTRAS[ch] ?? ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // NFD sonrası aksan işaretleri
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Sorguyu tekrarsız kelimelere böler. Boş/boşluk sorgu → boş dizi. */
export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeText(query);
  if (!normalized) return [];
  return Array.from(new Set(normalized.split(' ').filter(Boolean)));
}

// ─── Türkçe → katalog dili eşanlamlıları ─────────────────────────────────────
// Arayüz 15 dilde ama ÜRÜN VERİSİ Almanca/Felemenkçe/İngilizce karışık (Diamond
// DE, CombiSteel NL, HENDI EN). Türk kullanıcı "fritöz" yazdığında katalogda
// "Fritteuse" geçtiği için sıfır sonuç dönüyordu. Burada sorgu kelimesi katalog
// dilindeki karşılıklarına genişletilir.
//
// Anahtarlar normalizeText'ten GEÇMİŞ hâlde yazılır ("fritöz" → "fritoz"),
// değerler de öyle ("kühlschrank" → "kuhlschrank") — haystack'ler normalize.
// Değerler alt dize olarak aranır: "kuhl" hem Kühlschrank hem Kühltisch tutar.
const SEARCH_SYNONYMS: Record<string, string[]> = {
  // pişirme
  firin: ['ofen', 'oven', 'backofen'],
  ocak: ['herd', 'kocher', 'cooker', 'brenner', 'kookplaat'],
  kombi: ['kombi', 'combi'],
  konveksiyon: ['umluft', 'konvektion', 'convection', 'heteluchts'],
  buhar: ['dampf', 'steam', 'stoom'],
  izgara: ['grill', 'rooster', 'grillplatte'],
  fritoz: ['fritteuse', 'friteuse', 'fryer', 'frituur'],
  salamander: ['salamander'],
  mikrodalga: ['mikrowelle', 'microwave', 'magnetron'],
  pisirme: ['koch', 'gar', 'cooking', 'kook'],
  kazan: ['kessel', 'kettle', 'ketel'],
  krep: ['crepe', 'crepes'],
  tost: ['toaster', 'tosti'],
  waffle: ['waffel', 'waffle', 'wafel'],

  // soğutma
  buzdolabi: ['kuhlschrank', 'koelkast', 'refrigerator', 'kuhl'],
  sogutucu: ['kuhl', 'koel', 'cooling', 'cooler'],
  sogutma: ['kuhl', 'koel', 'cooling'],
  dondurucu: ['tiefkuhl', 'freezer', 'vries', 'gefrier'],
  soklama: ['schock', 'blast', 'snelkoeler'],
  sok: ['schock', 'blast'],
  dondurma: ['eismaschine', 'ice cream', 'ijs', 'speiseeis'],
  vitrin: ['vitrine', 'display', 'theke'],

  // yıkama / hijyen
  bulasik: ['spulmaschine', 'dishwasher', 'vaatwas', 'spul'],
  makinesi: ['maschine', 'machine'],
  makine: ['maschine', 'machine'],
  lavabo: ['becken', 'spule', 'sink', 'wasbak', 'spultisch'],
  evye: ['becken', 'spule', 'sink', 'wasbak'],
  camasir: ['wasch', 'laundry', 'was'],

  // hazırlık / mobilya
  tezgah: ['werktafel', 'werkbank', 'tisch', 'table', 'werkblad'],
  masa: ['tisch', 'table', 'tafel'],
  dolap: ['schrank', 'kast', 'cabinet'],
  raf: ['regal', 'shelf', 'schap'],
  arabasi: ['wagen', 'trolley', 'kar'],
  araba: ['wagen', 'trolley', 'kar'],
  cekmece: ['schublade', 'drawer', 'lade'],
  kapi: ['tur', 'door', 'deur'],
  tekerlek: ['rad', 'radern', 'wheel', 'wiel'],
  bicak: ['messer', 'knife', 'mes'],
  dilimleme: ['aufschnitt', 'slicer', 'snijmachine'],
  kiyma: ['fleischwolf', 'mincer', 'gehakt'],
  mikser: ['mixer', 'ruhr', 'planeten'],
  blender: ['mixer', 'blender'],
  hamur: ['teig', 'dough', 'deeg'],
  tepsi: ['blech', 'tablett', 'tray', 'bak'],
  kap: ['behalter', 'container', 'bak'],
  paslanmaz: ['edelstahl', 'stainless', 'rvs'],
  celik: ['edelstahl', 'stainless', 'rvs'],

  // havalandırma / içecek
  davlumbaz: ['haube', 'dunstabzug', 'hood', 'kap'],
  havalandirma: ['haube', 'dunstabzug', 'ventilation', 'afzuig'],
  kahve: ['kaffee', 'coffee', 'koffie'],
  cay: ['tee', 'tea', 'thee'],
  icecek: ['getranke', 'beverage', 'drank'],
  bardak: ['glas', 'glass'],
  tabak: ['teller', 'plate', 'bord'],
};

/** Sorgu kelimesinin katalogda aranacak tüm biçimleri (kendisi + eşanlamlıları). */
export function variantsOf(token: string): string[] {
  const extra = SEARCH_SYNONYMS[token];
  return extra ? [token, ...extra] : [token];
}

/**
 * Kelime (ya da eşanlamlılarından biri) ürün metninde geçiyor mu?
 * Biçimler ÜRÜN DÖNGÜSÜNÜN DIŞINDA bir kez hesaplanıp buraya verilir — 14k ürün
 * × kelime başına dizi ayırmak yazarken hissedilir gecikme yaratıyordu.
 */
function hayHasVariant(hay: string, variants: string[]): boolean {
  for (let i = 0; i < variants.length; i++) {
    if (hay.includes(variants[i])) return true;
  }
  return false;
}

// Ürün başına normalize metin yalnızca bir kez üretilir (14k+ ürün var).
const haystacks = new WeakMap<object, string>();

function haystackOf(item: SearchableProduct): string {
  const cached = haystacks.get(item);
  if (cached !== undefined) return cached;
  const text = normalizeText(
    [item.name, item.id, item.desc, item.brand, item.sub, item.fam].filter(Boolean).join(' '),
  );
  haystacks.set(item, text);
  return text;
}

/**
 * Ürün listesini serbest metin sorgusuyla süzer.
 * Boş sorguda liste olduğu gibi döner (filtreleme yapılmaz).
 */
export function searchProducts<T extends SearchableProduct>(
  items: T[],
  query: string,
): ProductSearchResult<T> {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return { items, partial: false, terms: [] };

  const hays = items.map((item) => haystackOf(item));

  // Kelime biçimleri (kendisi + eşanlamlıları) bir kez hesaplanır.
  const tokenVariants = tokens.map(variantsOf);

  // 1) Korpüste karşılığı olmayan kelimeleri düş (eşanlamlıları da sayılır).
  const usableIdx: number[] = [];
  for (let t = 0; t < tokens.length; t++) {
    if (hays.some((hay) => hayHasVariant(hay, tokenVariants[t]))) usableIdx.push(t);
  }
  const keptIdx = usableIdx.length > 0 ? usableIdx : tokens.map((_, i) => i);
  const terms = keptIdx.map((i) => tokens[i]);
  const termVariants = keptIdx.map((i) => tokenVariants[i]);
  const droppedSome = terms.length < tokens.length;

  // 2) KATI: kalan kelimelerin tamamı geçmeli.
  const strict: T[] = [];
  for (let i = 0; i < items.length; i++) {
    if (termVariants.every((variants) => hayHasVariant(hays[i], variants))) strict.push(items[i]);
  }
  if (strict.length > 0) return { items: strict, partial: droppedSome, terms };

  // 3) GEVŞEK: en az bir kelime — öndeki kelime daha ağır puanlanır.
  const scored: { item: T; score: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    let score = 0;
    for (let t = 0; t < termVariants.length; t++) {
      if (hayHasVariant(hays[i], termVariants[t])) score += termVariants.length - t;
    }
    if (score > 0) scored.push({ item: items[i], score });
  }
  scored.sort((a, b) => b.score - a.score);

  return {
    items: scored.map((entry) => entry.item),
    partial: scored.length > 0 || droppedSome,
    terms,
  };
}
