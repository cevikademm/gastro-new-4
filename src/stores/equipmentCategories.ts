/**
 * Kategori listesi — ürün verisinden BAĞIMSIZ.
 *
 * Neden ayrı dosya: `equipmentStore.ts` `src/data/products.json`'u (5,2 MB ham /
 * 551 KB gzip) statik import eder. Navbar gibi kabuk bileşenleri yalnızca kategori
 * ADLARINA ihtiyaç duyduğu hâlde store'dan import ettikleri için tüm katalog her
 * sayfanın giriş paketine giriyordu (Lighthouse: SEO sayfalarında LCP ~11 s).
 * Buradan import eden bileşen katalog verisini indirmez.
 *
 * `count` burada 0'dır; gerçek sayıları `equipmentStore.ts` modül yüklenirken
 * (products.json'dan) bu DİZİNİN İÇİNE yazar — dizi kimliği ortak olduğundan
 * store'u yükleyen bir sayfada sayılar otomatik dolar. Sayıya gerçekten ihtiyacı
 * olan bileşen (ör. ProductsMegaMenu) store'u da import etmelidir.
 */
import i18n from '../i18n';

export interface EquipmentCategory {
  id: string;
  /** i18n anahtarı (categoryTaxonomy.*) — `name` bunu okur. */
  nameKey: string;
  /** Dile göre çözümlenen etiket (i18n.t ile, okuma anında). */
  readonly name: string;
  icon: string;
  color: string;
  count: number;
}

// Kategori nesnesi: `name` bir getter'dır — dil değişince yeniden render'da güncel
// etiket okunur. `fallback` (TR kaynak etiket), çeviri anahtarı eksik dillerde ham
// anahtar yerine gösterilir.
function makeCategory(
  id: string,
  nameKey: string,
  fallback: string,
  icon: string,
  color: string,
): EquipmentCategory {
  return {
    id,
    nameKey,
    icon,
    color,
    count: 0,
    get name() {
      return i18n.t(nameKey, { defaultValue: fallback });
    },
  };
}

export const CATEGORIES: EquipmentCategory[] = [
  makeCategory('cooking', 'categoryTaxonomy.cooking', 'Pişirme', 'flame', '#ef4444'),
  makeCategory('cooling', 'categoryTaxonomy.cooling', 'Soğutma', 'refrigerator', '#3b82f6'),
  makeCategory('dishwash', 'categoryTaxonomy.dishwash', 'Bulaşık Yıkama', 'droplets', '#06b6d4'),
  makeCategory('prep_hygiene', 'categoryTaxonomy.prep_hygiene', 'Hazırlık & Hijyen', 'table', '#6b7280'),
  makeCategory('self_service', 'categoryTaxonomy.self_service', 'Self Servis & Büfe', 'table', '#f59e0b'),
  makeCategory('pizza_pasta', 'categoryTaxonomy.pizza_pasta', 'Pizza & Pasta', 'flame', '#dc2626'),
  makeCategory('dynamic_prep', 'categoryTaxonomy.dynamic_prep', 'Dinamik Hazırlık', 'microwave', '#8b5cf6'),
  makeCategory('cook_chill', 'categoryTaxonomy.cook_chill', 'Pişir & Soğut', 'microwave', '#10b981'),
  makeCategory('ventilation', 'categoryTaxonomy.ventilation', 'Havalandırma', 'waves', '#64748b'),
  makeCategory('bakery', 'categoryTaxonomy.bakery', 'Pastane & Fırıncılık', 'microwave', '#d97706'),
  makeCategory('trolley_gn', 'categoryTaxonomy.trolley_gn', 'Araçlar & GN Kaplar', 'table', '#78716c'),
  makeCategory('coffee_tea', 'categoryTaxonomy.coffee_tea', 'Kahve & Çay', 'droplets', '#92400e'),
  makeCategory('laundry', 'categoryTaxonomy.laundry', 'Çamaşırhane', 'waves', '#7c3aed'),
  makeCategory('ice_cream', 'categoryTaxonomy.ice_cream', 'Dondurma', 'refrigerator', '#ec4899'),
  makeCategory('hospitality', 'categoryTaxonomy.hospitality', 'Konaklama & Temizlik', 'waves', '#0891b2'),
  makeCategory('cleaning_products', 'categoryTaxonomy.cleaning_products', 'Temizlik Ürünleri', 'droplets', '#059669'),
];
