/**
 * User-uploaded GLB support.
 *
 * Takes a `.glb`/`.gltf` File the user picked, turns it into a blob URL, measures
 * its real-world bounding box (so footprint + auto-scale behave), and registers
 * it as a {@link CatalogEntry}. After that it flows through the EXACT SAME path
 * as the built-in catalog GLBs (arm → click floor → placeEquipment/loadEquipment),
 * so orientation/scale/shadow normalization is identical.
 *
 * Session-scoped: the blob URL is valid until reload. Persisting uploads to cloud
 * storage (so customers can reload/share) is a separate follow-up.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MM_TO_THREE } from '../../../core/to3d';
import { newId } from '../../../core/id';
import { registerCustomGlb, type CatalogEntry } from './equipmentCatalog';

const loader = new GLTFLoader();

/** Accept attribute for the upload `<input type="file">`. */
export const GLB_ACCEPT_ATTR = '.glb,.gltf,model/gltf-binary,model/gltf+json';

/** Measure a GLB at `url` and return its bounding box in millimetres. */
function measureGlb(url: string): Promise<{ width: number; depth: number; height: number }> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => {
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        // Scene units are metres; convert to mm. Guard against degenerate boxes.
        resolve({
          width: Math.max(10, Math.round(size.x / MM_TO_THREE)),
          depth: Math.max(10, Math.round(size.z / MM_TO_THREE)),
          height: Math.max(10, Math.round(size.y / MM_TO_THREE)),
        });
      },
      undefined,
      () => resolve({ width: 600, depth: 600, height: 600 }),
    );
  });
}

/**
 * Load a user-picked GLB file, register it as a catalog entry, and return it.
 *
 * @param file The `.glb`/`.gltf` File from a file input or drop.
 * @returns The registered {@link CatalogEntry} (its `id` is what placement uses).
 */
export async function importGlbFile(file: File): Promise<CatalogEntry> {
  const url = URL.createObjectURL(file);
  const dimensionsMm = await measureGlb(url);
  const name = file.name.replace(/\.(glb|gltf)$/i, '');
  const entry: CatalogEntry = {
    id: newId('uglb'),
    name,
    category: 'other',
    dimensionsMm,
    glbUrl: url,
    anchor: 'bottom-center',
    defaultRotationDeg: 0,
  };
  registerCustomGlb(entry);
  return entry;
}
