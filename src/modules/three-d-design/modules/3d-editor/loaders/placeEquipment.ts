/**
 * High-level placement: drop a catalog entry into the 3D scene at a given
 * floor position. Handles auto-scale (via GLBLoader), snap-to-floor (z=0
 * in the room), 90° rotation steps, and bbox alignment.
 *
 * The placement also writes an `Equipment` record into the project store so
 * the model survives reload, undo/redo, and the 2D editor can show its
 * footprint as a rectangle.
 */

import * as THREE from 'three';
import { MM_TO_THREE } from '../../../core/to3d';
import {
  useProjectStore,
} from '../../../store';
import type { Vec3 } from '../../../core/types';
import {
  EQUIPMENT_CATALOG,
  type CatalogEntry,
  getCatalogEntry,
} from './equipmentCatalog';
import { loadEquipment, snapRotationDeg } from './GLBLoader';

export interface PlacementResult {
  /** New Equipment id in the store. */
  equipmentId: string;
  /** The Three.js group added to the scene. */
  object: THREE.Group;
}

/**
 * Place a catalog entry at the given DOMAIN position (mm). Returns when the
 * GLB has loaded and the model is added to `parent`.
 *
 * @param parent       Three.Group to add the model to (typically SceneManager.contentRoot).
 * @param catalogId    Catalog entry id.
 * @param positionMm   Anchor (footprint min-corner) in mm. Floor z auto-snaps to 0 if missing.
 * @param rotationDeg  Rotation around z, snapped to 90°.
 */
export async function placeEquipment(
  parent: THREE.Group,
  catalogId: string,
  positionMm: Partial<Vec3>,
  rotationDeg = 0,
): Promise<PlacementResult | null> {
  const entry = getCatalogEntry(catalogId);
  if (!entry) {
    // eslint-disable-next-line no-console
    console.warn(`[placeEquipment] unknown catalogId: ${catalogId}`);
    return null;
  }

  const { group } = await loadEquipment(entry);

  // ── Position in scene units ──────────────────────────────────────────
  // Anchor convention: domain x/y is footprint MIN corner, z is floor.
  group.position.set(
    (positionMm.x ?? 0) * MM_TO_THREE,
    (positionMm.y ?? 0) * MM_TO_THREE,
    (positionMm.z ?? 0) * MM_TO_THREE,
  );

  // Snap rotation to 90° increments.
  const rotDeg = snapRotationDeg(rotationDeg);
  group.rotation.z = (rotDeg * Math.PI) / 180;

  // ── Persist into store so undo/redo + 2D footprint work ──────────────
  const equipmentId = useProjectStore.getState().addEquipment({
    catalogId: entry.id,
    name: entry.name,
    category: entry.category,
    position: {
      x: positionMm.x ?? 0,
      y: positionMm.y ?? 0,
      z: positionMm.z ?? 0,
    },
    rotation: (rotDeg * Math.PI) / 180,
    footprint: {
      width: entry.dimensionsMm.width,
      depth: entry.dimensionsMm.depth,
    },
    heightMm: entry.dimensionsMm.height,
  });

  group.userData = { equipmentId, kind: 'equipment', catalogId: entry.id };
  parent.add(group);
  return { equipmentId, object: group };
}

/** Snap a position (mm) to the floor of any room it sits inside. */
export function snapToFloorZ(positionMm: Vec3, defaultZ = 0): number {
  const project = useProjectStore.getState().project;
  for (const room of Object.values(project.rooms)) {
    // crude inside-test using room bounds — full polygon point-in is in
    // core/polygon-ops; for placement this is sufficient.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const wid of room.wallLoop) {
      const w = project.walls[wid];
      if (!w) continue;
      const a = project.vertices[w.a];
      if (!a) continue;
      minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x);
      minY = Math.min(minY, a.y); maxY = Math.max(maxY, a.y);
    }
    if (positionMm.x >= minX && positionMm.x <= maxX && positionMm.y >= minY && positionMm.y <= maxY) {
      return room.floorHeight;
    }
  }
  return defaultZ;
}

// Re-export catalog so the 3D editor can build a palette without two imports.
export { EQUIPMENT_CATALOG, type CatalogEntry };
