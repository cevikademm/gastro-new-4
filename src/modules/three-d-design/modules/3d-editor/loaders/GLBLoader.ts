/**
 * GLBLoader — wraps Three's GLTFLoader with the project's normalization
 * rules. The loader returns a fresh Group ready to drop into the scene at
 * its world position; auto-scale and snap-to-floor are applied on load so
 * downstream code never has to do "did this model load right" reasoning.
 *
 * Behaviour
 *   1) Load the .glb URL (cached by the browser).
 *   2) Compute the loaded model's bounding box.
 *   3) Auto-scale uniformly so its max dimension matches the catalog
 *      `dimensionsMm` max — keeps proportions even if the GLB was authored
 *      at the wrong scale.
 *   4) Re-anchor to footprint MIN-CORNER + floor-z so the scene placement
 *      math (Equipment.position is the min-corner) just works.
 *   5) Tag every mesh with userData.equipmentId for raycast resolution.
 *
 * Failure mode
 *   If the .glb 404s or fails to parse, returns a placeholder Box mesh of
 *   the catalog's nominal dimensions. UI development never blocks on
 *   missing assets.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MM_TO_THREE } from '../../../core/to3d';
import { type CatalogAnchor, type CatalogEntry } from './equipmentCatalog';

// One loader instance for the app — GLTFLoader internally caches parsing.
const loader = new GLTFLoader();

// Per-URL promise cache so concurrent placements share a single fetch.
const cache = new Map<string, Promise<THREE.Group>>();

interface LoadResult {
  /** A fresh CLONE — caller can mutate freely without poisoning the cache. */
  group: THREE.Group;
  /** Real-world bbox in scene units (m). */
  size: THREE.Vector3;
}

/**
 * Internal: load + normalize the master template for an entry. Cached.
 */
function loadTemplate(entry: CatalogEntry): Promise<THREE.Group> {
  let p = cache.get(entry.glbUrl);
  if (p) return p;
  p = new Promise<THREE.Group>((resolve) => {
    loader.load(
      entry.glbUrl,
      (gltf) => {
        const root = gltf.scene as THREE.Group;
        normalizeTemplate(root, entry);
        resolve(root);
      },
      undefined,
      (err) => {
        // eslint-disable-next-line no-console
        console.warn(`[GLBLoader] failed to load ${entry.glbUrl}, using placeholder.`, err);
        resolve(buildPlaceholder(entry));
      },
    );
  });
  cache.set(entry.glbUrl, p);
  return p;
}

/** Normalize a freshly-loaded template in place: scale + anchor + shadow. */
function normalizeTemplate(root: THREE.Group, entry: CatalogEntry): void {
  // 1) Scale uniformly to match catalog dimensions.
  const targetMaxM =
    Math.max(entry.dimensionsMm.width, entry.dimensionsMm.depth, entry.dimensionsMm.height) *
    MM_TO_THREE;
  const box0 = new THREE.Box3().setFromObject(root);
  const size0 = new THREE.Vector3();
  box0.getSize(size0);
  const currentMax = Math.max(size0.x, size0.y, size0.z) || 1;
  const scaleFactor = targetMaxM / currentMax;
  if (Math.abs(scaleFactor - 1) > 0.001) {
    root.scale.multiplyScalar(scaleFactor);
  }

  // 2) Re-anchor to footprint MIN-CORNER. Critical: we shift root.children
  //    rather than root.position. If we set root.position the caller (Editor3D)
  //    would overwrite it with eq.position and the floor anchor would be lost
  //    — that's exactly what made GLBs sink half-into the floor. Anchor field
  //    is now ignored; we always normalize to bbox at (0..w, 0..d, 0..h) in
  //    root's local space.
  bakeAnchorIntoChildren(root);
  void (entry.anchor as CatalogAnchor); // anchor kept for backward compat

  // 3) Enable shadows on every mesh.
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if ((mesh as any).isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

/**
 * Translate the model so its bounding box sits at (0, 0, 0..h) in ROOT's
 * LOCAL space — by moving the children, not by setting root.position. This
 * is the canonical anchor scene code expects after load; placement math
 * sets root.position freely (to the domain-space x, y, floorZ) without
 * losing the floor anchor.
 *
 * Why local space and not world: setFromObject computes bbox in world space
 * (which equals parent space here, since root has no parent). To translate
 * into root's local space we divide by root.scale — root.rotation is still
 * identity at this point, root.position is whatever the GLB was authored
 * with. We compensate for both.
 */
function bakeAnchorIntoChildren(root: THREE.Group): void {
  const box = new THREE.Box3().setFromObject(root);
  const sx = root.scale.x || 1;
  const sy = root.scale.y || 1;
  const sz = root.scale.z || 1;
  // Local-space min = (worldMin - root.position) / root.scale
  const localMinX = (box.min.x - root.position.x) / sx;
  const localMinY = (box.min.y - root.position.y) / sy;
  const localMinZ = (box.min.z - root.position.z) / sz;
  for (const child of root.children) {
    child.position.x -= localMinX;
    child.position.y -= localMinY;
    child.position.z -= localMinZ;
  }
  // Reset root's own transform offset so the caller controls position 100%.
  root.position.set(0, 0, 0);
}

/** Build a labelled placeholder box matching catalog dimensions. */
function buildPlaceholder(entry: CatalogEntry): THREE.Group {
  const w = entry.dimensionsMm.width * MM_TO_THREE;
  const d = entry.dimensionsMm.depth * MM_TO_THREE;
  const h = entry.dimensionsMm.height * MM_TO_THREE;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(w, d, h),
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.7,
      metalness: 0.1,
    }),
  );
  box.castShadow = true;
  box.receiveShadow = true;
  // Anchor at min corner: shift so bbox sits in (0..w, 0..d, 0..h).
  box.position.set(w / 2, d / 2, h / 2);
  const group = new THREE.Group();
  group.add(box);
  return group;
}

/**
 * Public: load a catalog entry, return a fresh Group whose bounding box is
 * (0..w, 0..d, 0..h) in meters with min-corner at the origin and floor at
 * z=0. Caller positions, rotates, tags it.
 */
export async function loadEquipment(entry: CatalogEntry): Promise<LoadResult> {
  const template = await loadTemplate(entry);
  const group = template.clone(true);
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);
  return { group, size };
}

/**
 * Warm the per-URL template cache (fetch + normalize) WITHOUT cloning.
 *
 * Called from the catalog when an item is armed or its card is hovered, so the
 * (often multi-MB) GLB is already downloading — or fully cached — by the time
 * the user actually places it. Fire-and-forget: safely no-ops when the URL is
 * already cached and never blocks the caller. Placement (`loadEquipment`)
 * reuses the exact same cached promise, so a warmed model swaps in instantly.
 */
export function preloadEquipment(entry: CatalogEntry): void {
  void loadTemplate(entry);
}

/** 90° rotation step convenience — takes deg, returns deg snapped to 90. */
export function snapRotationDeg(deg: number): number {
  return Math.round(deg / 90) * 90;
}
