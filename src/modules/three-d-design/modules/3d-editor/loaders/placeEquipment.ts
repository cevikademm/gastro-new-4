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
import {
  containFloorItem,
  defaultMountFor,
  defaultZForMount,
  mountToWall,
} from '../interaction/placement';

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

  // ── Smart mount + containment ────────────────────────────────────────
  // ventilation → duvar (z≈1450), diğerleri → zemin (z=0). Footprint odanın
  // dışına taşmasın; duvar ürünleri en yakın duvara yapışsın.
  const project = useProjectStore.getState().project;
  const mount = defaultMountFor(entry.category);
  const w = entry.dimensionsMm.width;
  const d = entry.dimensionsMm.depth;
  let posX = positionMm.x ?? 0;
  let posY = positionMm.y ?? 0;
  let rotRad = (snapRotationDeg(rotationDeg) * Math.PI) / 180;
  const posZ = positionMm.z ?? defaultZForMount(mount);

  if (mount === 'wall') {
    const center = { x: posX + w / 2, y: posY + d / 2 };
    const mounted = mountToWall(project, center, w, d);
    if (mounted) {
      posX = mounted.pos.x;
      posY = mounted.pos.y;
      rotRad = mounted.rotation;
    }
  } else {
    const contained = containFloorItem(project, { x: posX, y: posY }, rotRad, w, d);
    posX = contained.x;
    posY = contained.y;
  }

  // ── Position in scene units ──────────────────────────────────────────
  // Anchor convention: domain x/y is footprint MIN corner, z is floor.
  group.position.set(posX * MM_TO_THREE, posY * MM_TO_THREE, posZ * MM_TO_THREE);
  group.rotation.z = rotRad;

  // ── Persist into store so undo/redo + 2D footprint work ──────────────
  const equipmentId = useProjectStore.getState().addEquipment({
    catalogId: entry.id,
    name: entry.name,
    category: entry.category,
    position: { x: posX, y: posY, z: posZ },
    rotation: rotRad,
    mount,
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
