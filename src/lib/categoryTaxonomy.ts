import type { EquipmentItem } from '../stores/equipmentStore';
import i18n from '../i18n';

/**
 * Bir alt-grup / sanal grup id'sini kullanıcıya gösterilen (çevrilmiş) etikete
 * çevirir. i18n `categoryTaxonomy.<id>` anahtarı varsa onu, yoksa kod içindeki
 * ham (Türkçe) etiketi döndürür — böylece anahtar eksikse bile UI bozulmaz.
 */
function tLabel(id: string, fallback: string): string {
  return i18n.t(`categoryTaxonomy.${id}`, { defaultValue: fallback });
}

/**
 * Ürün taksonomisi — Combisteel tarzı iki seviyeli kategori menüsü için
 * tek doğruluk kaynağı.
 *
 * - Üst kategori (cat) → üreticinin katalog grupları (alt-grup).
 * - Alt-gruplar Diamond'ın katalog yapısını (Serie 600/700/900, Kombidämpfer,
 *   Vitrinen, Teigmaschinen...) "temiz" başlıklarda toplar.
 * - Markadan bağımsız çalışır: Diamond zengin `sub` alanını, CombiSteel/Hendi
 *   ise (cat="") Felemenkçe/İngilizce `sub` + `name` metnini anahtar kelimeyle
 *   sınıflar. Eşleşmeyen ürünler kategorisiz kalır (yalnızca "Tümü"de görünür).
 *
 * Almanca ä/ö/ü ve "ae/oe/ue" çevriyazısı, Fransızca aksanlar `normalize()`
 * ile tek biçime indirgenir; tüm regex'ler bu normalize edilmiş (aksansız,
 * ae/oe/ue) biçim üzerinde yazılmıştır.
 *
 * Etiketler i18n ile 15 dile çevrilir: `SubGroup.label` kod içinde Türkçe
 * kaynak (fallback) tutulur; kullanıcıya gösterilen ad `getSubGroupsFor` /
 * `subGroupLabel` içinde `categoryTaxonomy.<id>` anahtarıyla çözülür.
 */

/* ─── Tipler ─── */
export interface SubGroup {
  id: string;
  label: string;
  re: RegExp; // normalize edilmiş haystack (sub+name+line+fam) üzerinde test edilir
}

export interface SubGroupCount {
  id: string;
  label: string;
  count: number;
}

/** Kategorisiz-içi ("hiçbir alt-gruba düşmeyen") ürünler için sanal grup id'si. */
export const OTHER_SUBGROUP = '__other';

/* ─── Normalizasyon ─── */
// ä/ö/ü → ae/oe/ue, ß → ss, Fransızca aksanlar sadeleştirilir, küçük harf.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/[éèê]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/[ôó]/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[îï]/g, 'i')
    .replace(/[ûù]/g, 'u');
}

function haystack(i: EquipmentItem): string {
  return normalize(`${i.sub} ${i.name} ${i.line} ${i.fam}`);
}

/* ─── Aksesuar / küçük parça tespiti ─── */
// Küçük parçalar (Sieb, Rollen, Füße, Körbe, GN Schalen, Blenden, Schienen...)
// kategorilerde GÖRÜNMEZ; yalnızca ait oldukları cihazın sayfasında uyumlu
// aksesuar olarak listelenir (getCompatibleAccessories).
//
// İki katman:
//  1) Tamamı aksesuar olan `sub` grupları (ör. "Accessoires", "Körbe & Zubehör",
//     "GN Behälter", "Zubehör / Pizza"...).
//  2) Cihaz serilerine karışmış parçalar için güvenli isim anahtar kelimeleri.
// + KORUMA: güçlü (kw≥2) veya pahalı (≥€3000) hiçbir ürün gizlenmez — gerçek
//   cihazı yanlışlıkla saklamamak için (aksesuarlar düşük güç/ucuzdur).
const ACC_SUB_RE =
  /accessoir|koerbe ?& ?zubeh|^zubehoer|gn behaelter|gn bakken|^korven|glasbrug|onderstellen|oven onderstel/;
const ACC_NAME_RE =
  /korb fuer|^korb \d|\bkorb \d bereich|fritteusenkorb|friteusenkorb|set \d koerbe|\bmatrize|lenkrolle|laufrolle|kit \d ?raeder|kit anti|traeger fuer raeder|einfahrschien|stuetzschien|montage-?stuetz|oelablass|abfuhr fuer|deckel (nudelkocher|kochkessel)|verlaengerung fuer|frontblende|frontpaneel|seitenblende|seitenausfuehrung|spritzschutz|sockelleiste|fussleiste|frontale fuss|glasbruecke|hebevorrichtung fuer|heizkit fuer|spezialblende fuer|block \d schubladen|integrale seite|seitliche sockel|gestellrahmen|struktur \d koerbe|anti-?kipp struktur|bodenstruktur|\bsieb\b|filtersieb|gn[- ]?(bak|schale)|auff?angebecken|hintere oberflaeche/;

export function isAccessory(item: EquipmentItem): boolean {
  // Koruma: güçlü/pahalı ürün asla aksesuar sayılmaz (gerçek cihaz olabilir).
  if ((Number(item.kw) || 0) >= 2 || (Number(item.price) || 0) >= 3000) return false;
  return ACC_SUB_RE.test(normalize(item.sub || '')) || ACC_NAME_RE.test(normalize(item.name || ''));
}

/* ─── Üreticinin mantığına göre yeniden yerleştirme ─── */
// Hamur (Teig/Deeg) makineleri ham kategorisi ne olursa olsun Pizza altında.
// Yalnızca `sub` (üreticinin grubu) üzerinde test edilir — isimde geçen
// "Teig" kelimesi (örn. soğutmalı hamur tezgahı) ürünü yanlış taşımasın diye.
const DOUGH_RE =
  /teig|deeg|spiralteig|teigausroll|teigwalze|teigportionier|knet|kneter|knead|dough|sheeter|planetenr|spiral ?(mixer|teig)/;

/* ─── cat="" (CombiSteel/Hendi) → üst kategori anahtar kelime kuralları ─── */
// Sıra önemlidir: en spesifikten en genele. İlk eşleşen kazanır.
const EMPTY_CAT_RULES: { cat: string; re: RegExp }[] = [
  { cat: 'dishwash', re: /vaatwas|dishwash|glaswass|glasswash|spoelmachine|afwas|vatwas/ },
  { cat: 'ventilation', re: /afzuigkap|afzuig|wasemkap|\bhood\b|ventilat/ },
  { cat: 'pizza_pasta', re: /pizza|deeg|pasta ?machine|spiraalkneder/ },
  // Yalnızca dondurma EKİPMANI (Hendi "Kitchen Tools" kaşık/spatula gibi aletleri değil).
  { cat: 'ice_cream', re: /schepijs|softijs|ijsmachine|ijsvitrine|eismaschine|gelato ?(machine|maker)|ice ?cream ?(machine|maker|freezer|display|showcase)|sorbet ?(machine|maker)/ },
  {
    cat: 'cooling',
    re: /koel|vries|saladett|barkoeler|wijnkast|wijnklim|ijsblok|ijsbereider|minibar|insteek|glasdeur|chiller|fridge|refriger/,
  },
  {
    cat: 'cooking',
    re: /\boven|convect|frituur|friteuse|kook|bakplaat|barbecue|\bgrill|bain.?marie|inductie|kookplaat|fornuis|salamander|panini|gyros|kebab|magnetron|microwave|toaster|warmhoud|chafing|pannen|braad|wafel|crep/,
  },
  {
    cat: 'dynamic_prep',
    re: /snijmachine|gehaktmolen|vleesmolen|cutter|vacu|menger|mixer|blender|aardappelschil|slicer|keukenmachine|staafmixer/,
  },
  { cat: 'coffee_tea', re: /koffie|coffee|espresso|barista|bar ?& ?coffee|percolator|theewater/ },
  {
    cat: 'prep_hygiene',
    re: /werktafel|werkblad|spoeltafel|spoelbak|wasbak|rekwerk|wandschap|\brvs\b|edelstaal|wandkast|\bschap\b|\bplank|afvalbak|hygiene|storage|onderkast/,
  },
  { cat: 'trolley_gn', re: /gn[- ]?bak|gastronorm|trolley|serveerwagen|\bwagen\b|\bkar\b/ },
  { cat: 'self_service', re: /buffet|uitgifte|saladebar|self.?service/ },
];

/* ─── Alt-grup tanımları (kategori başına, sıralı) ─── */
const g = (id: string, label: string, re: RegExp): SubGroup => ({ id, label, re });

export const SUBGROUPS: Record<string, SubGroup[]> = {
  // ── Pişirme / Kochstelle ──
  cooking: [
    g('serie-900-plus', 'Seri 900+', /900\s*\+/),
    g('serie-900', 'Seri 900', /\b900\b/),
    g('serie-700-plus', 'Seri 700+ Maxima', /700\s*\+|maxima/),
    g('serie-700', 'Seri 700 Optima', /optima|\b700\b/),
    g('serie-600', 'Seri 600', /\b600\b|snack 600|pro 600/),
    g('modular-alpha', 'Modular Alpha 650', /alpha ?650|modular alpha/),
    g('kombidaempfer', 'Kombi Buharlı Fırınlar', /kombid|combi ?steam/),
    g('oefen', 'Fırınlar', /konvekt|convect|backofen|\bofen\b|oefen|furnace|durchlaufoef|durchlaufof|regenerat|\boven\b/),
    g('friteusen', 'Fritözler', /frit|fryer|frituur/),
    g('grillgeraete', 'Izgara Cihazları', /grill|bbq|barbecue|salamander|teppanyaki|panini|kebab|gyros|haehnchen|lavastein|vapor|chinaherd|crep|wafel|waffel|waffle|bakplaat/),
    g('mikrowellen', 'Mikrodalgalar', /mikrowell|microwave|magnetron/),
    g('kessel-pfannen', 'Pişirme Kazanları ve Tavaları', /kochkessel|kippbrat|bratpfanne|\bpfanne|pannen|nudelkocher|reiskocher|sous.?vide|vacuum cook|dampfgar|steam cook|\bherd|kookplaat|induction|inductie|kochplatt|kookunit|kooktafel/),
    g('warmegeraete', 'Sıcak Tutma ve Benmari', /bain.?marie|waermebr|warmhalt|speisenwarm|food warmer|toaster|hot.?dog|waermeschr|warme vitrin|warmhoud/),
  ],

  // ── Kühlung / Soğutma ──
  cooling: [
    g('salatkuehlung', 'Salata Soğutucuları', /salad|salat|saladett/),
    g('vitrinen', 'Vitrinler', /vitrin|vetrin|showcase|display|panorama|gondel/),
    g('kuehlhaeuser', 'Soğuk Odalar ve Hücreler', /zelle|kuehlhaus|cold.?room|freezing room|vriescel|koelcel|kuehlzell/),
    g('kuehltheken', 'Soğutmalı Tezgahlar', /theke|theken|counter/),
    g('kuehltische', 'Soğutmalı Tezgahlar ve Çalışma Bankoları', /kuehltisch|gefriertisch|khl- und gefrier|werkbank|koelwerkbank|refrigeration & freezing|unterbau|wandkuehl|wandkoel|insteek|gekoelde/),
    g('kuehlschraenke', 'Buzdolapları ve Derin Dondurucular', /schrank|schraenke|cabinet|koelkast|vrieskast|vrijstaande|gefrieschr|gefrierschr|kuehlschr|flaschenk|wein|wine|minibar|bottle cool|barkoeler|fridge|glasdeur|lagerschr|lagerbox|boxen/),
    g('eiswuerfel', 'Buz Makineleri', /eiswuerfel|ice ?machine|ijsblok|ice ?cube|schilferijs|crushed|crasheis/),
    g('schockfroster', 'Şoklama Dondurucuları', /schockfrost|blast|schnellab|rap.?cool|froster/),
    g('getraenke', 'İçecek Soğutucuları', /springbrunnen|wasserkuehler|getraenkedespender|dispenser|granita|sorbet|fontaine/),
    g('truhen', 'Sandık Tipi Dondurucular', /truhe|vrieskist|chest freezer|gefriertruh/),
  ],

  // ── Pizza & Pasta ──
  pizza_pasta: [
    g('pizzaoefen', 'Pizza Fırınları', /pizzaoef|pizzaof|pizza ?of|pizza ?oven|holzbackof|holzback|durchlaufoef|durchlaufof|\bofen\b|gasbrenner|kamin/),
    g('teigkneter', 'Hamur Yoğurma Makineleri', /spiralteig|knetmasch|kneter|knead|spiral ?(mixer|teig)|planeten|deegmeng|teigmisch/),
    g('teigausroller', 'Hamur Açma Makineleri', /teigwalze|teigausroll|sheeter|teigroll|deegroll|dough sheeter|teigpletter|pletter/),
    g('teigportionierer', 'Hamur Porsiyonlama Makineleri', /portionier|abrund|divider|moulder|teig.?former|pizza.?former/),
    g('nudelmaschinen', 'Makarna Makineleri', /nudel|pasta ?mach|pastamasch/),
    g('pizza-zubehoer', 'Pizza Aksesuarları', /zubeh|accessoir|pizzawerkbank|pizzavorbereit|mozzarella|warmeplatt|schep|schaufel|pizzaschneider|pizza/),
  ],

  // ── Ventilation ──
  ventilation: [
    g('wandhauben', 'Duvar Tipi Davlumbazlar', /wandhaube|wall hood|afzuigkap|schuinmodel|doosmodel|inductiemodel|kappen/),
    g('zentralhauben', 'Merkez Tipi Davlumbazlar', /zentralhaube|central hood|inselhaube/),
    g('absaugeinheiten', 'Emiş Üniteleri', /absaug|extraction|filtern|filter|abluft|zuluft|ventilator/),
    g('haube-zubehoer', 'Aksesuarlar ve Kumandalar', /regler|schaltkasten|beleucht|drehzahl|eletrisch|licht/),
  ],

  // ── Edelstahl / Hazırlık & Hijyen ──
  prep_hygiene: [
    g('arbeitstische', 'Çalışma Tezgahları', /arbeitstisch|edelstahltisch|werktafel|werkblad|\btisch|ablageti|cupboard table|tables with|tables without|chef tisch|chef table|eckedelstahl|eckarbeit|90 ?° ?angle|kooktafel|onderstel|consoles/),
    g('spuelbecken', 'Evyeler ve Bataryalar', /spuelbecken|spoeltafel|spoelbak|waschbecken|wasbak|\bsink|\bbecken|ausguss|handwasch|armatur|brause|pendelbr|faucet|spray|ablauf|rinne/),
    g('regale', 'Raflar', /regal|rekwerk|wandschap|wandregal|\bshelf|shelves|etagere|\brek\b|stelling|rooster|spijlen/),
    g('schraenke', 'Dolaplar', /schrank|schraenke|cupboard|cabinet|kast/),
    g('abfall-hygiene', 'Atık ve Hijyen', /abfall|afval|waste|\bbin\b|insekt|ozon|trockner|hygiene|storage|muell|papier|uitschep/),
  ],

  // ── Bulaşık Yıkama ──
  dishwash: [
    g('hauben-spuelmaschinen', 'Giyotin Tipi Bulaşık Makineleri', /\bhood|haube|durchschub/),
    g('korbtransport', 'Konveyörlü Bulaşık Makineleri', /korbtransport|traction|transport/),
    g('geschirrspueler', 'Tabak Yıkama Makineleri', /geschirr|dishwash|spuelmasch|spuhlmasch|vaatwas|topf|spuel.?masch/),
    g('glaeserspueler', 'Bardak Yıkama Makineleri', /glaeser|\bglas|glasswash/),
    g('dishwash-zubehoer', 'Sepetler ve Aksesuarlar', /\bkorb|korv|zubeh|wasserenth|osmose|polier|enthaert|input|auslauf|zulauf/),
  ],

  // ── Self Servis & Büfe ──
  self_service: [
    g('drop-in', 'Ankastre Üniteler', /drop.?in|armonia/),
    g('modulare-self', 'Modüler Self Servis', /modulare self|self.?service|self service/),
    g('buffets', 'Büfeler ve Adalar', /buffet|insel|salatbar|salad|uitgifte/),
    g('self-vitrinen', 'Vitrinler', /vitrin|vetrin|tapas|sushi/),
  ],

  // ── Dinamik Hazırlık ──
  dynamic_prep: [
    g('vakuummaschinen', 'Vakum Makineleri', /vakuum|vacu|beutel|verpack|folie/),
    g('fleischwoelfe', 'Kıyma Makineleri', /fleischwolf|meat mincer|\bwolf|wurstfuell|knochensaeg|fleischmix|fleisch-?muerb|fleisch|gehaktmolen|vleesmolen/),
    g('schneidemaschinen', 'Dilimleme Makineleri', /aufschnitt|slicer|gemueseschneid|schneider|cutter|hack|\bsaege|gemuesew|snijmachine/),
    g('mixer', 'Mikserler ve Çırpıcılar', /mixer|stabmix|ruehrmix|whisk|diving|blender|menger/),
    g('dynamic-kleingeraete', 'Küçük Cihazlar', /waage|schaeler|reibe|presse|zentrifug|muerber|reinigungsmasch|sterilisator|messer|muschel/),
  ],

  // ── Pastane & Fırıncılık ──
  bakery: [
    g('baeckereioefen', 'Pastane Fırınları', /baeckerei|\bofen|oefen|drehbar/),
    g('gaerschraenke', 'Mayalama Dolapları', /gaer|proof/),
    g('bakery-moebel', 'Paslanmaz Çelik Mobilyalar', /moebel|edelstahl/),
  ],

  // ── Pişir & Soğut ──
  cook_chill: [
    g('cc-kombidaempfer', 'Kombi Buharlı Fırınlar', /kombid|combi/),
    g('cc-schockfroster', 'Şoklama Dondurucuları', /schockfrost|blast/),
    g('cc-zubehoer', 'Aksesuarlar ve Arabalar', /accessoir|zubeh|hordenwagen|option/),
  ],

  // ── Kahve & Çay ──
  coffee_tea: [
    g('kaffeemaschinen', 'Kahve Makineleri', /kaffee|koffie|coffee|espresso|percolator|muehle/),
    g('crepes-waffeln', 'Krep ve Waffle', /crep|crepe|waffel|waffle|wafel/),
    g('saefte-mixer', 'Meyve Sıkacakları ve Mikserler', /zitrus|citrus|mixer|presse|zentrifug|crasheis/),
    g('coffee-vitrinen', 'Vitrinler', /vitrin|panorama|waermevet/),
  ],

  // ── Dondurma ──
  ice_cream: [
    g('ice-theken', 'Dondurma Tezgahları ve Vitrinleri', /theke|vitrin/),
    g('ice-maschinen', 'Dondurma Makineleri ve Türbinleri', /turbine|maschine|pasteur|sahne|schilferijs/),
    g('ice-zubehoer', 'Kaplar ve Aksesuarlar', /behaelter|lagerung|waffel|wafel/),
  ],

  // ── Çamaşırhane ──
  laundry: [
    g('waschmaschinen', 'Çamaşır Makineleri', /wasch|lave-linge|laundry|schleuder/),
    g('trockner', 'Kurutma Makineleri', /trockner|dryer|rotation/),
    g('mangel-buegeln', 'Silindir ve Ütü', /mangel|buegel|iron/),
  ],

  // ── Araçlar & GN Kaplar ──
  trolley_gn: [
    g('gn-behaelter', 'GN Kaplar', /gn |gastronorm|behaelter|container/),
    g('wagen', 'Arabalar', /wagen|trolley|chariot|halter/),
  ],

  // ── Konaklama & Temizlik ──
  hospitality: [
    g('room-service', 'Oda Servisi ve Arabaları', /room|zimmer|wagen|chariot|service/),
    g('fruehstueck', 'Kahvaltı Servisi', /fruehstueck|fruehst|breakfast/),
  ],
};

/* ─── Sınıflandırma (her ürün için bir kez hesaplanır, WeakMap'te cache'lenir) ─── */
const _resolvedCache = new WeakMap<EquipmentItem, { cat: string | null; sub: string | null }>();

export function resolveTopCategory(item: EquipmentItem): string | null {
  // 0) Aksesuar/küçük parça → hiçbir kategoride görünmez (yalnızca ürün sayfasında)
  if (isAccessory(item)) return null;
  // 1) Üretici mantığı override'ı: hamur makineleri → Pizza (yalnızca sub)
  if (DOUGH_RE.test(normalize(item.sub || ''))) return 'pizza_pasta';
  // 2) Ham kategori varsa (Diamond) ona güven
  if (item.cat && item.cat !== 'spare_parts') return item.cat;
  // 3) cat="" (CombiSteel/Hendi): anahtar kelime kuralları
  if (!item.cat) {
    const hay = haystack(item);
    for (const rule of EMPTY_CAT_RULES) {
      if (rule.re.test(hay)) return rule.cat;
    }
  }
  return null;
}

export function resolveSubGroup(catId: string, item: EquipmentItem): string | null {
  const groups = SUBGROUPS[catId];
  if (!groups) return null;
  const hay = haystack(item);
  for (const sg of groups) {
    if (sg.re.test(hay)) return sg.id;
  }
  return null;
}

/** Ürünün çözülmüş {cat, sub} değeri — WeakMap cache'li, tekrar tekrar ucuz. */
export function resolvedOf(item: EquipmentItem): { cat: string | null; sub: string | null } {
  let r = _resolvedCache.get(item);
  if (!r) {
    const cat = resolveTopCategory(item);
    r = { cat, sub: cat ? resolveSubGroup(cat, item) : null };
    _resolvedCache.set(item, r);
  }
  return r;
}

/** Bir ürün, verilen kategori filtresine uyuyor mu? */
export function matchesCategory(catId: string, item: EquipmentItem): boolean {
  return resolvedOf(item).cat === catId;
}

/** Bir ürün, verilen kategori + alt-grup filtresine uyuyor mu? */
export function matchesSubGroup(catId: string, subId: string, item: EquipmentItem): boolean {
  const { cat, sub } = resolvedOf(item);
  if (cat !== catId) return false;
  if (subId === OTHER_SUBGROUP) return sub === null;
  return sub === subId;
}

/* ─── İndeks: kategori → {count, alt-grup sayıları} (allItems referansına göre memoize) ─── */
type Index = Map<string, { count: number; subGroups: Map<string, number> }>;
let _idxItems: EquipmentItem[] | null = null;
let _idx: Index | null = null;

export function buildIndex(items: EquipmentItem[]): Index {
  if (_idxItems === items && _idx) return _idx;
  const map: Index = new Map();
  for (const it of items) {
    const { cat, sub } = resolvedOf(it);
    if (!cat) continue;
    let e = map.get(cat);
    if (!e) {
      e = { count: 0, subGroups: new Map() };
      map.set(cat, e);
    }
    e.count++;
    const sid = sub ?? OTHER_SUBGROUP;
    e.subGroups.set(sid, (e.subGroups.get(sid) || 0) + 1);
  }
  _idxItems = items;
  _idx = map;
  return map;
}

/** Bir kategorinin sıralı alt-grupları + ürün sayıları (boş olanlar atlanır, "Sonstige" sona). */
export function getSubGroupsFor(catId: string, items: EquipmentItem[]): SubGroupCount[] {
  const defined = SUBGROUPS[catId];
  // Küratörlü alt-grubu olmayan kategoriler düz kalır (tek "Sonstige" gösterme).
  if (!defined || defined.length === 0) return [];
  const idx = buildIndex(items).get(catId);
  if (!idx) return [];
  const out: SubGroupCount[] = defined
    .filter((sg) => (idx.subGroups.get(sg.id) || 0) > 0)
    .map((sg) => ({ id: sg.id, label: tLabel(sg.id, sg.label), count: idx.subGroups.get(sg.id) || 0 }));
  const assigned = out.reduce((s, r) => s + r.count, 0);
  const other = idx.count - assigned;
  if (other > 0) out.push({ id: OTHER_SUBGROUP, label: tLabel(OTHER_SUBGROUP, 'Diğer'), count: other });
  return out;
}

/** Bir kategorinin toplam (çözülmüş) ürün sayısı. */
export function getCategoryCount(catId: string, items: EquipmentItem[]): number {
  return buildIndex(items).get(catId)?.count || 0;
}

/** Alt-grup id → temiz etiket (deep-link başlığı için). */
export function subGroupLabel(catId: string, subId: string): string {
  if (subId === OTHER_SUBGROUP) return tLabel(OTHER_SUBGROUP, 'Diğer');
  const fallback = SUBGROUPS[catId]?.find((sg) => sg.id === subId)?.label || subId;
  return tLabel(subId, fallback);
}

/* ─── Uyumlu aksesuar eşleştirme (ürün detay sayfası) ─── */
// Cihaz tipini adından çıkar (Nudelkocher, Friteuse, Herd, Grillplatte...).
const APPLIANCE_TYPE_TOKENS = [
  'nuddelkocher', 'nudelkocher', 'pastakocher', 'fritteuse', 'friteuse', 'frituur',
  'kippbratpfanne', 'bratpfanne', 'kochkessel', 'bain-marie', 'bain marie',
  'lavasteingrill', 'grillplatte', 'grill', 'salamander', 'teppanyaki',
  'backofen', 'kochplatte', 'plattenherd', 'herd', 'ofen', 'kombidaempfer',
];

function typeTokensOf(name: string): string[] {
  const n = normalize(name);
  return APPLIANCE_TYPE_TOKENS.filter((t) => n.includes(t));
}

// Seri anahtarı: 600/650/700/900 numarasını çıkar (900 ↔ 900+ eşlensin),
// numara yoksa normalize edilmiş sub'ın tamamı.
function seriesKey(sub: string): string {
  const n = normalize(sub || '');
  const m = n.match(/\b(600|650|700|900)\b/);
  return m ? m[1] : n;
}

/**
 * Bir cihaz için uyumlu aksesuarlar (ürün detay sayfasında "Passendes Zubehör").
 * Aynı seri (sub) + cihaz tipi (isim) eşleşen aksesuarlar önce; yoksa seri geneli.
 * Aksesuarlar kataloğun kendisinde gizli olduğundan yalnızca burada görünürler.
 */
export function getCompatibleAccessories(
  appliance: EquipmentItem | undefined | null,
  items: EquipmentItem[],
  limit = 24,
): EquipmentItem[] {
  if (!appliance || !appliance.sub) return [];
  const key = seriesKey(appliance.sub);
  if (!key) return [];
  const sameSeries = items.filter(
    (it) => it.id !== appliance.id && isAccessory(it) && seriesKey(it.sub) === key,
  );
  const tokens = typeTokensOf(appliance.name);
  if (tokens.length) {
    const matched = sameSeries.filter((it) => {
      const n = normalize(it.name);
      return tokens.some((t) => n.includes(t));
    });
    if (matched.length) return matched.slice(0, limit);
  }
  return sameSeries.slice(0, limit);
}
