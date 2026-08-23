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

  // 1) Korpüste karşılığı olmayan kelimeleri düş.
  const usable = tokens.filter((token) => hays.some((hay) => hay.includes(token)));
  const terms = usable.length > 0 ? usable : tokens;
  const droppedSome = terms.length < tokens.length;

  // 2) KATI: kalan kelimelerin tamamı geçmeli.
  const strict: T[] = [];
  for (let i = 0; i < items.length; i++) {
    if (terms.every((token) => hays[i].includes(token))) strict.push(items[i]);
  }
  if (strict.length > 0) return { items: strict, partial: droppedSome, terms };

  // 3) GEVŞEK: en az bir kelime — öndeki kelime daha ağır puanlanır.
  const scored: { item: T; score: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    let score = 0;
    for (let t = 0; t < terms.length; t++) {
      if (hays[i].includes(terms[t])) score += terms.length - t;
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
