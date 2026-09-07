/**
 * designModelRegistry — kalıcı model kütüphanesini katalog kaydına bağlar.
 *
 * Supabase'deki her `design_models` satırı, yerleşik GLB'lerle AYNI
 * {@link CatalogEntry} biçimine çevrilip `registerCustomGlb` ile kaydedilir.
 * Böylece kütüphane modelleri yerleştirme/ölçekleme/çarpışma/gölge yolunda
 * yerleşik katalogdan ayırt edilemez.
 *
 * Kimlik: `catalogId = dm_<uuid>`. Bu değer belgeye (Equipment.catalogId /
 * modelRef) yazıldığından SABİTTİR — model silinse bile belge bozulmaz,
 * yalnızca gri kutuya düşer.
 */

import type { DesignModel } from '@/lib/designModelStore';
import type { EquipmentCategory } from '../../../core/types';
import { registerCustomGlb, unregisterCustomGlb, type CatalogEntry } from './equipmentCatalog';

/** `dm_` öneki — kütüphane modellerini yerleşik kataloglardan ayırır. */
export const LIBRARY_ID_PREFIX = 'dm_';

const VALID_CATEGORIES: ReadonlySet<string> = new Set<EquipmentCategory>([
  'cooking',
  'refrigeration',
  'preparation',
  'washing',
  'storage',
  'ventilation',
  'furniture',
  'other',
]);

/** Bir katalog kimliği kütüphane modeline mi ait? */
export function isLibraryCatalogId(catalogId: string): boolean {
  return catalogId.startsWith(LIBRARY_ID_PREFIX);
}

/** `dm_<uuid>` → `<uuid>` (kütüphane kimliği değilse null). */
export function modelIdFromCatalogId(catalogId: string): string | null {
  return isLibraryCatalogId(catalogId) ? catalogId.slice(LIBRARY_ID_PREFIX.length) : null;
}

/** `<uuid>` → `dm_<uuid>`. */
export function catalogIdForModel(modelId: string): string {
  return `${LIBRARY_ID_PREFIX}${modelId}`;
}

/** Supabase satırını katalog girişine çevir. */
export function toCatalogEntry(model: DesignModel): CatalogEntry {
  const category = (VALID_CATEGORIES.has(model.category) ? model.category : 'other') as EquipmentCategory;
  return {
    id: catalogIdForModel(model.id),
    name: model.name,
    category,
    dimensionsMm: {
      width: Math.max(10, Math.round(model.width_mm)),
      depth: Math.max(10, Math.round(model.depth_mm)),
      height: Math.max(10, Math.round(model.height_mm)),
    },
    glbUrl: model.glb_url,
    anchor: 'bottom-center',
    thumbnailUrl: model.thumbnail_url ?? undefined,
    defaultRotationDeg: 0,
    // Y-up authored (Meshy/Blender) modeller sahnede yan yatar → dik eğim.
    needsUprightTilt: model.up_axis === 'y',
  };
}

/**
 * Kütüphanenin tamamını kataloğa kaydet ve ARTIK var olmayan kayıtları düşür.
 *
 * @param models Supabase'den gelen güncel liste.
 * @returns Kayıtlı kütüphane katalog kimlikleri.
 */
export function syncLibraryToCatalog(models: readonly DesignModel[]): string[] {
  const ids: string[] = [];
  for (const model of models) {
    if (!model.glb_url) continue; // bozuk satır — kaydetme
    const entry = toCatalogEntry(model);
    registerCustomGlb(entry);
    ids.push(entry.id);
  }
  return ids;
}

/** Silinen bir modeli kataloğdan düşür (blob değil, uzak URL → revoke yok). */
export function unregisterLibraryModel(modelId: string): void {
  unregisterCustomGlb(catalogIdForModel(modelId));
}
