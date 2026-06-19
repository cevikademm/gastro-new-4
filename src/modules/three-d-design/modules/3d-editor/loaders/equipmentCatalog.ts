/**
 * Equipment catalog — the set of GLBs the user can drop into a kitchen.
 *
 * Each entry carries
 *   - id              stable identifier persisted in the project document
 *                     (Equipment.catalogId)
 *   - category        coarse grouping for the palette UI
 *   - dimensionsMm    real-world bounding box. Used by auto-scale on load,
 *                     by 2D footprint placement, and by collision/snap.
 *   - glbUrl          URL of the .glb. Resolved relative to the public dir.
 *   - anchor          how the model's local origin relates to its bounding
 *                     box. Most kitchen GLBs are authored with origin at
 *                     bottom-center; we normalize all of them to footprint
 *                     min-corner on load.
 *
 * Adding a new model
 *   1) drop the GLB under public/3d/equipment/.
 *   2) add an entry below.
 *   3) the registry hot-reloads in dev because it's a plain TS module.
 */

import type { EquipmentCategory } from '../../../core/types';
import { findGlbForProductId, GLB_MANIFEST } from './glbManifest';

export type CatalogAnchor = 'min-corner' | 'bottom-center' | 'center';

export interface CatalogEntry {
  id: string;
  name: string;
  category: EquipmentCategory;
  /** Real-world axis-aligned bounding box, mm. */
  dimensionsMm: { width: number; depth: number; height: number };
  /** GLB URL — resolved relative to the page origin. */
  glbUrl: string;
  /** Authoring origin of the GLB. Loader normalizes to `min-corner`. */
  anchor: CatalogAnchor;
  /** Optional thumbnail for the palette UI. */
  thumbnailUrl?: string;
  /** Default rotation (deg, around Z) when first dropped. */
  defaultRotationDeg?: number;
}

// ── Default catalog ────────────────────────────────────────────────────────
// `public/models/` altında fiili olarak bulunan GLB dosyaları üzerinden üretilir.
// Yeni GLB eklemek: dosyayı `public/models/`'a koy, `glbManifest.ts`'e bir
// satır ekle. Bu modül otomatik olarak `EQUIPMENT_CATALOG`'u günceller.

export const EQUIPMENT_CATALOG: ReadonlyArray<CatalogEntry> = GLB_MANIFEST
  .filter((m) => m.isEquipment !== false)
  .map((m): CatalogEntry => ({
    id: m.productId ?? `glb-${m.filename.replace(/\.glb$/i, '')}`,
    name: m.label,
    category: m.category,
    dimensionsMm: m.dimensionsMm ?? { width: 800, depth: 700, height: 900 },
    glbUrl: m.url,
    anchor: 'bottom-center',
    defaultRotationDeg: 0,
  }));

const byId = new Map<string, CatalogEntry>(
  EQUIPMENT_CATALOG.map((e) => [e.id, e]),
);

/**
 * Looks up a CatalogEntry by id. Falls back to the GLB manifest's
 * product-id mapping (so any product whose filename matches a `public/models/`
 * file resolves to a real GLB).
 */
export function getCatalogEntry(id: string): CatalogEntry | undefined {
  const direct = byId.get(id);
  if (direct) return direct;
  const fromManifest = findGlbForProductId(id);
  if (!fromManifest) return undefined;
  return {
    id,
    name: fromManifest.label,
    category: fromManifest.category,
    dimensionsMm: fromManifest.dimensionsMm ?? { width: 800, depth: 700, height: 900 },
    glbUrl: fromManifest.url,
    anchor: 'bottom-center',
    defaultRotationDeg: 0,
  };
}

export function listCatalog(category?: EquipmentCategory): CatalogEntry[] {
  return category
    ? EQUIPMENT_CATALOG.filter((e) => e.category === category)
    : [...EQUIPMENT_CATALOG];
}
