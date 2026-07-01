/**
 * Build a 3D mesh for a catalog product (EquipmentItem from the global
 * equipment store) WITHOUT a dedicated GLB.
 *
 * Strategy
 *   Most catalog products don't ship with a 3D model — they have a 2D
 *   reference image and real-world L/W/H dimensions. We render them as a
 *   stainless-steel-grey box at the correct dimensions, with the product
 *   image attached as a "sticker" on the front face plus a label above.
 *   This gives the user something instantly recognizable in the scene
 *   while we (eventually) build out a true GLB library.
 *
 * Anchor
 *   Equipment.position is the FOOTPRINT MIN-CORNER (matches our domain
 *   convention). The mesh is positioned so its bbox sits in
 *   (x..x+w, y..y+d, z..z+h) in domain meters.
 *
 * Texture
 *   Loaded once per image URL; CDNs/cache do the rest. SRGB color space
 *   so PNG/JPG colors look right under our tone-mapped pipeline.
 */

import * as THREE from 'three';
import type { EquipmentItem } from '../../../../../stores/equipmentStore';
import { MM_TO_THREE } from '../../../core/to3d';

// ── Texture cache ──────────────────────────────────────────────────────────
const textureCache = new Map<string, Promise<THREE.Texture | null>>();

function loadTexture(url: string): Promise<THREE.Texture | null> {
  let p = textureCache.get(url);
  if (p) return p;
  p = new Promise<THREE.Texture | null>((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        resolve(tex);
      },
      undefined,
      () => resolve(null), // gracefully fall back on 404
    );
  });
  textureCache.set(url, p);
  return p;
}

// ── Materials (cached) ────────────────────────────────────────────────────
let steelSideMat: THREE.MeshStandardMaterial | null = null;
let steelTopMat: THREE.MeshStandardMaterial | null = null;
let steelBottomMat: THREE.MeshStandardMaterial | null = null;

function getSteelSide(): THREE.MeshStandardMaterial {
  if (!steelSideMat) {
    steelSideMat = new THREE.MeshStandardMaterial({
      color: 0xc0c5cc,
      roughness: 0.45,
      metalness: 0.6,
    });
  }
  return steelSideMat;
}
function getSteelTop(): THREE.MeshStandardMaterial {
  if (!steelTopMat) {
    steelTopMat = new THREE.MeshStandardMaterial({
      color: 0xd1d6dc,
      roughness: 0.4,
      metalness: 0.7,
    });
  }
  return steelTopMat;
}
function getSteelBottom(): THREE.MeshStandardMaterial {
  if (!steelBottomMat) {
    steelBottomMat = new THREE.MeshStandardMaterial({
      color: 0x8a8f95,
      roughness: 0.7,
      metalness: 0.3,
    });
  }
  return steelBottomMat;
}

// ── Height parsing ─────────────────────────────────────────────────────────
/**
 * EquipmentItem.h is a string like "850" or "850/900" (range). We pick the
 * first numeric value. Falls back to 900 mm if unparseable.
 */
export function parseHeightMm(h: string | number): number {
  if (typeof h === 'number') return h;
  const m = /(\d+)/.exec(h);
  if (m) return parseInt(m[1], 10);
  return 900;
}

// ── Category mapping ──────────────────────────────────────────────────────
/** Map equipmentStore category id → core EquipmentCategory enum. */
export function mapEquipmentCategory(
  cat: string,
): import('../../../core/types').EquipmentCategory {
  switch (cat) {
    case 'cooking':
    case 'pizza_pasta':
    case 'cook_chill':
    case 'bakery':
      return 'cooking';
    case 'cooling':
    case 'ice_cream':
      return 'refrigeration';
    case 'dishwash':
      return 'washing';
    case 'prep_hygiene':
    case 'self_service':
    case 'dynamic_prep':
      return 'preparation';
    case 'ventilation':
      return 'ventilation';
    case 'trolley_gn':
      return 'storage';
    default:
      return 'other';
  }
}

// ── Builder ────────────────────────────────────────────────────────────────

export interface ProductMeshOptions {
  equipmentId: string;
  positionMm: { x: number; y: number; z: number };
  rotationRad: number;
  tiltXRad?: number;
  tiltYRad?: number;
  /**
   * Kutu ölçüleri (mm) — Equipment instance'ından (footprint/heightMm). 2B üst
   * görünümdeki dikdörtgen ile 3B kutunun BİREBİR aynı ölçüde olması için
   * instance'tan geçilir. Verilmezse katalog item ölçülerine düşer.
   */
  widthMm?: number;
  depthMm?: number;
  heightMm?: number;
  /** Kullanıcı ayırt edici rengi (hex). Verilirse çelik gövde bu tona boyanır. */
  color?: string;
}

/**
 * Build a steel-box-with-image-sticker mesh for an EquipmentItem.
 *
 * Group structure (so tilt and yaw don't fight each other)
 *
 *   outerGroup
 *     position:   eq.position   (footprint min-corner, mm)
 *     rotation.z: yaw            (rotates around the min-corner, existing
 *                                 convention preserved by the collision math)
 *     userData.kind = 'equipment' — InteractionController hits this.
 *
 *     pivot
 *       position:   (w/2, d/2, 0)   — moves origin to footprint BOTTOM-CENTER
 *       rotation.x: tiltX            — pitch (forward / back). Pivot at floor
 *                                      means a tilt swings the item like a
 *                                      real object tipping; it doesn't
 *                                      teleport sideways or burrow through
 *                                      the floor.
 *       rotation.y: tiltY            — roll (left / right)
 *
 *       box       (centered in pivot at (0, 0, h/2))
 *       front sticker / top sticker (offsets relative to pivot)
 *
 * userData.pivot on outerGroup points at `pivot` so the equipment-sync
 * effect can update tiltX / tiltY in-place without rebuilding the mesh.
 */
export async function buildProductMesh(
  item: EquipmentItem,
  opts: ProductMeshOptions,
): Promise<THREE.Group> {
  // Ölçü kaynağı: Equipment instance (footprint/heightMm) → 2B dikdörtgen = 3B kutu.
  // Verilmezse katalog item ölçülerine düş (geriye dönük uyum).
  const widthMm = opts.widthMm ?? item.l;
  const depthMm = opts.depthMm ?? item.w;
  const heightMm = opts.heightMm ?? parseHeightMm(item.h);

  const w = widthMm * MM_TO_THREE;
  const d = depthMm * MM_TO_THREE;
  const h = heightMm * MM_TO_THREE;

  const group = new THREE.Group();
  group.userData = {
    equipmentId: opts.equipmentId,
    kind: 'equipment',
    catalogId: item.id,
  };

  // Pivot child — gives us a footprint-bottom-center pivot for tilt without
  // disturbing yaw, which still rotates around the outer (min-corner) origin.
  const pivot = new THREE.Group();
  pivot.position.set(w / 2, d / 2, 0);
  pivot.rotation.x = opts.tiltXRad ?? 0;
  pivot.rotation.y = opts.tiltYRad ?? 0;
  group.add(pivot);
  group.userData.pivot = pivot;

  // ── Body: stainless box (veya kullanıcı rengine boyanmış kutu) ──────
  // BoxGeometry face order: 0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z, 5=-Z.
  let materials: THREE.MeshStandardMaterial[];
  if (opts.color) {
    // Ayırt edici renk: paylaşılan çelik singleton'ları KİRLETMEDEN örnek-bazlı
    // tonlu materyal (aksi halde tüm kutular boyanırdı).
    const tinted = new THREE.MeshStandardMaterial({
      color: opts.color,
      roughness: 0.5,
      metalness: 0.35,
    });
    materials = [tinted, tinted, tinted, tinted, tinted, tinted];
  } else {
    const sideMat = getSteelSide();
    materials = [sideMat, sideMat, sideMat, sideMat, getSteelTop(), getSteelBottom()];
  }
  const boxGeom = new THREE.BoxGeometry(w, d, h);
  const box = new THREE.Mesh(boxGeom, materials);
  box.castShadow = true;
  box.receiveShadow = true;
  // Centered in pivot — bottom of box sits on pivot's xy plane.
  box.position.set(0, 0, h / 2);
  pivot.add(box);

  // ── Optional: image stickers on the front face + top ────────────────
  if (item.img) {
    void (async () => {
      const tex = await loadTexture(item.img);
      if (!tex) return;
      const stickerMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.7,
        metalness: 0.0,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.18,
      });

      // Front sticker — flush against the +Y face of the box.
      const frontW = w * 0.84;
      const frontH = h * 0.84;
      const frontGeom = new THREE.PlaneGeometry(frontW, frontH);
      const frontPlane = new THREE.Mesh(frontGeom, stickerMat);
      frontPlane.rotation.x = -Math.PI / 2;
      frontPlane.position.set(0, d / 2 + 0.002, h / 2);
      pivot.add(frontPlane);

      // Top sticker — overlay on the +Z face of the box.
      const topW = w * 0.86;
      const topD = d * 0.86;
      const topGeom = new THREE.PlaneGeometry(topW, topD);
      const topPlane = new THREE.Mesh(topGeom, stickerMat);
      topPlane.position.set(0, 0, h + 0.002);
      pivot.add(topPlane);
    })();
  }

  // ── Place + yaw the outer group in domain space ────────────────────
  group.position.set(
    opts.positionMm.x * MM_TO_THREE,
    opts.positionMm.y * MM_TO_THREE,
    opts.positionMm.z * MM_TO_THREE,
  );
  group.rotation.z = opts.rotationRad;

  return group;
}
