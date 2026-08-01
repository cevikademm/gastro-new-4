/**
 * GLB Manifest — `public/models/` klasöründeki tüm fiziksel GLB dosyalarının
 * kataloğu. `npm run glb:manifest` ile otomatik üretilebilir; manuel düzenleme
 * de mümkün (örn. `productId` eşlemesi veya kategori atamak için).
 *
 * Her giriş:
 *   - url:       Tarayıcıdan erişilebilir yol (`/models/...glb`)
 *   - filename:  Salt dosya adı (eşitlik kontrolü için)
 *   - labelKey:  Panelde gösterilecek adın çeviri anahtarı
 *   - labelFallback: Çeviri yoksa gösterilecek TR etiket
 *   - productId: (opsiyonel) products.json içindeki ürün id'si — varsa,
 *                o ürün yerleştirildiğinde bu GLB kullanılır.
 *   - category:  Editor3D ekipman kategorisi
 *   - dimensionsMm: (opsiyonel) gerçek dünya boyutları; yoksa product'ın
 *                    boyutu kullanılır, o da yoksa 1×1×1 m.
 */

import type { EquipmentCategory } from '../../../core/types';

export interface GlbManifestEntry {
  url: string;
  filename: string;
  labelKey: string; // Translation key for the display name
  labelFallback: string; // Çeviri anahtarı eksikse gösterilecek TR etiket (defaultValue)
  productId?: string;
  category: EquipmentCategory; // Logical filter category (NOT a translation key)
  dimensionsMm?: { width: number; depth: number; height: number };
  /** Yetkili tarafından eklenen "sistem ekipmanı" mı (true) yoksa dekoratif/marka asset mi (false). */
  isEquipment?: boolean;
}

/**
 * Editor3D EquipmentCategory → ürün taksonomisi (categoryTaxonomy) üst kategori id'si.
 * Katalog panelindeki kategori chip'leri ürün taksonomisini kullanır; sistem GLB
 * öğelerinin de o chip'ler altında görünebilmesi için bu eşleme uygulanır.
 * '' = kategorisiz — yalnızca "Tümü" ve 3D chip altında görünür.
 * NOT: `category` alanının kendisi DEĞİŞMEZ; placeEquipment.defaultMountFor
 * (duvar montajı vb.) 3D enum'una bağımlıdır.
 */
export const GLB_CATEGORY_TO_TAXONOMY: Record<EquipmentCategory, string> = {
  cooking: 'cooking',
  refrigeration: 'cooling',
  preparation: 'dynamic_prep',
  washing: 'dishwash',
  storage: 'prep_hygiene',
  ventilation: 'ventilation',
  furniture: 'prep_hygiene',
  other: '',
};

export const GLB_MANIFEST: ReadonlyArray<GlbManifestEntry> = [
  {
    url: '/models/2mc-logo.glb',
    filename: '2mc-logo.glb',
    labelKey: 'glb.label.2mcLogo',
    labelFallback: '2MC Logo',
    category: 'other',
    dimensionsMm: { width: 600, depth: 100, height: 600 },
    isEquipment: false,
  },
  {
    url: '/models/Meshy_AI_Commercial_Planetary__0411175135_texture.glb',
    filename: 'Meshy_AI_Commercial_Planetary__0411175135_texture.glb',
    labelKey: 'glb.label.commercialPlanetaryMixer',
    labelFallback: 'Ticari Planet Mikser',
    category: 'preparation',
    dimensionsMm: { width: 800, depth: 700, height: 1400 },
    isEquipment: true,
  },
  {
    url: '/models/Meshy_AI_Rainbow_Bottles_in_a__0411175104_texture.glb',
    filename: 'Meshy_AI_Rainbow_Bottles_in_a__0411175104_texture.glb',
    labelKey: 'glb.label.bottleDisplay',
    labelFallback: 'Şişe Teşhir Rafı',
    category: 'storage',
    dimensionsMm: { width: 1200, depth: 400, height: 1800 },
    isEquipment: true,
  },
  {
    url: '/models/Meshy_AI_ddd_0411175109_texture.glb',
    filename: 'Meshy_AI_ddd_0411175109_texture.glb',
    labelKey: 'glb.label.genericAsset',
    labelFallback: 'Genel 3D Obje',
    category: 'other',
    dimensionsMm: { width: 600, depth: 600, height: 600 },
    isEquipment: true,
  },
  {
    url: '/models/PSB-202MI-2V.glb',
    filename: 'PSB-202MI-2V.glb',
    labelKey: 'glb.label.planetarySpiralMixer',
    labelFallback: 'Planet / Spiral Mikser',
    productId: 'PSB-202MI/2V', // This is a product ID, not a label
    category: 'preparation',
    isEquipment: true,
  },
];

// ── Lookup helpers ──────────────────────────────────────────────────────────

/** Filename → manifest entry. Hızlı erişim için. */
const byFilename = new Map<string, GlbManifestEntry>(
  GLB_MANIFEST.map((e) => [e.filename, e]),
);

/** productId → manifest entry. */
const byProductId = new Map<string, GlbManifestEntry>(
  GLB_MANIFEST.filter((e) => e.productId).map((e) => [e.productId!, e]),
);

/** Bir products.json id'si dosya adıyla doğrudan eşleşiyor mu kontrol et —
 *  fallback eşleştirme: id'deki '/' karakterleri '-' yapılıp dosya adıyla
 *  karşılaştırılır. */
const byNormalizedId = new Map<string, GlbManifestEntry>();
for (const e of GLB_MANIFEST) {
  const stem = e.filename.replace(/\.glb$/i, '');
  byNormalizedId.set(stem.toLowerCase(), e);
}

export function findGlbForProductId(productId: string): GlbManifestEntry | undefined {
  if (!productId) return undefined;
  const direct = byProductId.get(productId);
  if (direct) return direct;
  const normalized = productId.replace(/\//g, '-').toLowerCase();
  return byNormalizedId.get(normalized);
}

export function findGlbByFilename(filename: string): GlbManifestEntry | undefined {
  return byFilename.get(filename);
}

/** Tüm "ekipman" kategorisindeki GLB'ler — paneldeki "Sistem 3D Kütüphanesi" sekmesi için. */
export function listSystemGlbEquipment(): GlbManifestEntry[] {
  return GLB_MANIFEST.filter((e) => e.isEquipment !== false);
}
