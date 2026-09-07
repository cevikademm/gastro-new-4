/**
 * Pure builders that turn the SceneDescription (from core/to3d.ts) into
 * Three.js Object3Ds.
 *
 * Wall geometry strategy
 *   We build each wall as a 2D `THREE.Shape` in the WALL FACE plane (the
 *   "u-v" plane where u runs along the wall and v is height), with one
 *   `THREE.Path` hole per opening. Then we ExtrudeGeometry along the
 *   thickness direction. This gives us REAL holes in the wall geometry
 *   without needing CSG — Three's tessellator handles it natively.
 *
 *   The extruded mesh is then rotated/translated so its u-axis aligns with
 *   the wall direction in the floor plane and its v-axis points up. The
 *   contentRoot in SceneManager handles the final domain-Z-up → scene-Y-up
 *   conversion.
 *
 * Door / window dressing
 *   - Door: a thin rectangular leaf attached to the hinge side, plus a
 *     dark frame around the opening for visual contrast.
 *   - Window: a tinted transparent pane in the middle of the opening, plus
 *     a frame.
 *
 * Materials are cached so disposal stays sane.
 */

import * as THREE from 'three';
import {
  MM_TO_THREE,
  type CeilingPolygon,
  type FloorPolygon,
  type SceneDescription,
  type WallFootprint,
} from '../../../core/to3d';
import type { Vec2 } from '../../../core/types';
import { normalize2, perp2, sub2 } from '../../../core/math';
import { wallPiecePolygon, type BandCore } from '../../../core/wallBands';
import { getCeilingMaterial, getFloorMaterialFor, getWallMaterialFor } from './materials';

// ── Materials (cached singletons) ───────────────────────────────────────────
// Every getter below returns a SHARED instance flagged `userData.shared = true`.
// Disposal helpers (Editor3D.disposeObject, SceneManager.disposeObject) skip
// shared materials — disposing one would break every other mesh using it.

let wallMaterial: THREE.MeshStandardMaterial | null = null;
let wallSelectedMaterial: THREE.MeshStandardMaterial | null = null;
let floorMaterial: THREE.MeshStandardMaterial | null = null;
let frameMaterial: THREE.MeshStandardMaterial | null = null;
let doorLeafMaterial: THREE.MeshStandardMaterial | null = null;
let glassMaterial: THREE.MeshPhysicalMaterial | null = null;
let edgeLineMaterial: THREE.LineBasicMaterial | null = null;

/** Flag a material as shared so dispose helpers leave it alone. */
export function markShared<M extends THREE.Material>(mat: M): M {
  mat.userData.shared = true;
  return mat;
}

/** True for materials that must never be disposed per-object. */
export function isSharedMaterial(mat: THREE.Material): boolean {
  return mat.userData?.shared === true;
}

/** Thin ink line for silhouette edges — one shared material for every mesh. */
export function getEdgeLineMaterial(): THREE.LineBasicMaterial {
  if (!edgeLineMaterial) {
    edgeLineMaterial = markShared(
      new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
  }
  return edgeLineMaterial;
}

/**
 * Add crisp silhouette lines (EdgesGeometry, ≥ `thresholdDeg` crease) to a
 * mesh so pale surfaces still read as volumes against a pale background —
 * the architectural "ink over wash" look. The line never takes part in
 * picking (raycast no-op) and is disposed with its parent's geometries.
 * Requires the surface material to carry `polygonOffset` (materials.ts) so
 * the line sits on top instead of flickering.
 */
export function addEdgeLines(
  mesh: THREE.Mesh,
  thresholdDeg = 25,
  material: THREE.LineBasicMaterial = getEdgeLineMaterial(),
): THREE.LineSegments {
  const edges = new THREE.EdgesGeometry(mesh.geometry, thresholdDeg);
  const line = new THREE.LineSegments(edges, material);
  line.name = 'edges';
  line.userData = { kind: 'edge' };
  line.raycast = () => {};
  line.renderOrder = 1;
  mesh.add(line);
  return line;
}

export function getWallMaterial(): THREE.MeshStandardMaterial {
  if (!wallMaterial) {
    wallMaterial = markShared(
      new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
    );
  }
  return wallMaterial;
}

export function getSelectedWallMaterial(): THREE.MeshStandardMaterial {
  if (!wallSelectedMaterial) {
    wallSelectedMaterial = markShared(
      new THREE.MeshStandardMaterial({
        color: 0xdbeafe,
        roughness: 0.7,
        metalness: 0.0,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.05,
        side: THREE.DoubleSide,
      }),
    );
  }
  return wallSelectedMaterial;
}

export function getFloorMaterial(): THREE.MeshStandardMaterial {
  if (!floorMaterial) {
    floorMaterial = markShared(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.95,
        metalness: 0.0,
      }),
    );
  }
  return floorMaterial;
}

function getFrameMaterial(): THREE.MeshStandardMaterial {
  if (!frameMaterial) {
    frameMaterial = markShared(
      new THREE.MeshStandardMaterial({
        color: 0x3b4553,
        roughness: 0.55,
        metalness: 0.15,
      }),
    );
  }
  return frameMaterial;
}

function getDoorLeafMaterial(): THREE.MeshStandardMaterial {
  if (!doorLeafMaterial) {
    doorLeafMaterial = markShared(
      new THREE.MeshStandardMaterial({
        color: 0xa8825a,
        roughness: 0.5,
        metalness: 0.05,
      }),
    );
  }
  return doorLeafMaterial;
}

function getGlassMaterial(): THREE.MeshPhysicalMaterial {
  if (!glassMaterial) {
    glassMaterial = markShared(
      new THREE.MeshPhysicalMaterial({
        color: 0xbfdbfe,
        roughness: 0.05,
        metalness: 0.0,
        transmission: 0.85,
        thickness: 0.02,
        transparent: true,
        opacity: 0.4,
        ior: 1.45,
        side: THREE.DoubleSide,
      }),
    );
  }
  return glassMaterial;
}

/** Door leaf opening angle (rad) — reads as "a door" without blocking the view. */
const LEAF_OPEN_RAD = Math.PI / 12;
const LEAF_THICKNESS_M = 0.04;

// ── Wall builder ────────────────────────────────────────────────────────────

/**
 * Build a single wall mesh with real holes for each opening. Returns a
 * Group containing the wall body + frame + door leaves + window panes,
 * already positioned in domain-mm space (mm → m via MM_TO_THREE).
 *
 * Local axis convention (before basis rotation):
 *   x = u  along wall (a → b)
 *   y = v  height (0 .. wall.height)
 *   z      thickness (0 .. wall.thickness)
 *
 * After the basis rotation we apply:
 *   local x → world wall direction (in floor plane)
 *   local y → world up (z in domain space; SceneManager rotates to scene Y)
 *   local z → world wall left-hand normal (in floor plane)
 *
 * Then we translate by -thickness/2 along the world normal so the wall's
 * geometric centerline matches the floor footprint generated by to3d.ts.
 */
export function buildWallMesh(footprint: WallFootprint): THREE.Group {
  const group = new THREE.Group();
  group.name = `wall:${footprint.wallId}`;
  group.userData = { wallId: footprint.wallId, kind: 'wall' };

  const lengthM = footprint.lengthMm * MM_TO_THREE;
  const heightM = footprint.heightMm * MM_TO_THREE;
  const thicknessM = footprint.thicknessMm * MM_TO_THREE;
  const baseZM = footprint.baseZMm * MM_TO_THREE;

  // ── Body: the wall BAND (mitred plan polygon) extruded vertically ──────
  // No CSG and no Shape.holes: the wall is split along its length around each
  // opening — full-height pieces between openings, a sill piece below and a
  // head piece above each opening. Every piece is a plan-space polygon
  // (render mm) extruded along +Z, so corners join exactly like the 2D plan.
  const dir = normalize2(sub2(footprint.bMm, footprint.aMm));
  const band: BandCore = {
    a: footprint.aMm,
    dir,
    normal: perp2(dir),
    thicknessMm: footprint.thicknessMm,
    cutA: footprint.cutA,
    cutB: footprint.cutB,
  };
  const uOf = (p: Vec2) => (p.x - footprint.aMm.x) * dir.x + (p.y - footprint.aMm.y) * dir.y;
  // Deepest point of each end cut along the wall — openings never start
  // inside the mitre (clamp guarantees), but guard against odd geometry.
  const depthA = Math.max(0, ...footprint.cutA.map(uOf));
  const depthB = Math.min(footprint.lengthMm, ...footprint.cutB.map(uOf));

  const bodyMaterial = getWallMaterialFor(footprint.material);
  const addPiece = (poly: Vec2[], z0Mm: number, z1Mm: number): void => {
    const hM = (z1Mm - z0Mm) * MM_TO_THREE;
    if (poly.length < 3 || hM <= 0) return;
    const shape = new THREE.Shape();
    shape.moveTo(poly[0].x * MM_TO_THREE, poly[0].y * MM_TO_THREE);
    for (let i = 1; i < poly.length; i++) shape.lineTo(poly[i].x * MM_TO_THREE, poly[i].y * MM_TO_THREE);
    shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, { depth: hM, bevelEnabled: false, curveSegments: 1 });
    geom.translate(0, 0, baseZM + z0Mm * MM_TO_THREE);
    // Planar UVs in metres so procedural textures tile at real-world scale.
    remapUvsToMetres(geom);
    const mesh = new THREE.Mesh(geom, bodyMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // `baseMaterial` lets the selection highlight restore the right preset.
    mesh.userData = { wallId: footprint.wallId, kind: 'wall', baseMaterial: bodyMaterial };
    // Silhouette ink so a white wall reads against the white background.
    addEdgeLines(mesh, 30);
    group.add(mesh);
  };

  const holes = [...footprint.holes].sort((p, q) => p.uMin - q.uMin);
  let u = 0;
  let first = true;
  for (const h of holes) {
    const hu0 = Math.max(h.uMin, first ? depthA + 1 : u);
    const hu1 = Math.min(h.uMax, depthB - 1);
    if (hu1 - hu0 < 10) continue; // degenerate — skip the hole, wall stays solid here
    if (hu0 - u > 0.5 || first) addPiece(wallPiecePolygon(band, u, hu0, first, false), 0, footprint.heightMm);
    if (h.vMin > 5) addPiece(wallPiecePolygon(band, hu0, hu1, false, false), 0, h.vMin);
    if (h.vMax < footprint.heightMm - 5) {
      addPiece(wallPiecePolygon(band, hu0, hu1, false, false), h.vMax, footprint.heightMm);
    }
    u = hu1;
    first = false;
  }
  addPiece(wallPiecePolygon(band, u, footprint.lengthMm, first, true), 0, footprint.heightMm);

  // ── Dressing (frames / leaves / panes) in the wall's local u-v frame ───
  // Local axis convention (see header): x = u along wall, y = v height,
  // z = thickness (0 = right face … thicknessM = left face).
  const dress = new THREE.Group();
  dress.name = 'dress';
  group.add(dress);

  // ── Frame + door leaf / window pane per hole ────────────────────────
  for (const h of footprint.holes) {
    const u0 = h.uMin * MM_TO_THREE;
    const u1 = h.uMax * MM_TO_THREE;
    const v0 = h.vMin * MM_TO_THREE;
    const v1 = h.vMax * MM_TO_THREE;
    const wM = u1 - u0;
    const hM = v1 - v0;
    const cu = (u0 + u1) / 2;
    const cv = (v0 + v1) / 2;

    // Every dressing mesh carries the opening id so the 3D editor can pick
    // (click-select) an opening directly.
    const openingData = { openingId: h.openingId, kind: 'opening', openingKind: h.kind };

    // Frame: 4 thin boxes around the opening, 30 mm wide, depth = wall thickness + 2 mm
    const frameW = 0.03; // 30 mm
    const frameDepth = thicknessM + 0.002;

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(wM + 2 * frameW, frameW, frameDepth),
      getFrameMaterial(),
    );
    top.position.set(cu, v1 + frameW / 2, thicknessM / 2);
    top.userData = { ...openingData };
    dress.add(top);

    const bottom = new THREE.Mesh(
      new THREE.BoxGeometry(wM + 2 * frameW, frameW, frameDepth),
      getFrameMaterial(),
    );
    bottom.position.set(cu, v0 - frameW / 2, thicknessM / 2);
    bottom.userData = { ...openingData };
    // Doors have no sill frame (it would be a trip bar on the floor).
    if (h.kind !== 'door') dress.add(bottom);

    const left = new THREE.Mesh(
      new THREE.BoxGeometry(frameW, hM, frameDepth),
      getFrameMaterial(),
    );
    left.position.set(u0 - frameW / 2, cv, thicknessM / 2);
    left.userData = { ...openingData };
    dress.add(left);

    const right = new THREE.Mesh(
      new THREE.BoxGeometry(frameW, hM, frameDepth),
      getFrameMaterial(),
    );
    right.position.set(u1 + frameW / 2, cv, thicknessM / 2);
    right.userData = { ...openingData };
    dress.add(right);

    if (h.kind === 'window') {
      // Glass pane in the middle of the wall thickness
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(wM, hM, 0.01),
        getGlassMaterial(),
      );
      pane.position.set(cu, cv, thicknessM / 2);
      pane.userData = { ...openingData };
      dress.add(pane);
    } else if (h.kind === 'door') {
      // Leaf(s). Local frame: x = along wall (u), y = up, z = toward the wall's
      // render-space LEFT normal (extrusion runs 0..thicknessM along +z).
      // `h.swing` is already in render space (to3d converts the domain value).
      const towardPlusZ = h.swing === 'left';
      const zLeaf = thicknessM / 2 - LEAF_THICKNESS_M / 2;
      /**
       * A leaf hinged at `pivotU` whose tip points toward +x (tipSign=+1) or
       * −x (tipSign=−1) before rotation. Rotating about +y by −θ moves a +x
       * tip toward +z; a −x tip needs +θ for the same side.
       */
      const addLeaf = (widthM: number, pivotU: number, tipSign: 1 | -1): void => {
        const leaf = new THREE.Mesh(
          new THREE.BoxGeometry(widthM, hM, LEAF_THICKNESS_M),
          getDoorLeafMaterial(),
        );
        leaf.geometry.translate((tipSign * widthM) / 2, 0, 0);
        leaf.position.set(pivotU, cv, zLeaf);
        leaf.rotation.y = towardPlusZ ? -tipSign * LEAF_OPEN_RAD : tipSign * LEAF_OPEN_RAD;
        leaf.userData = { ...openingData };
        leaf.castShadow = true;
        dress.add(leaf);
      };
      if (h.doorType === 'double') {
        addLeaf(wM / 2, u0, 1);
        addLeaf(wM / 2, u1, -1);
      } else if (h.doorType === 'sliding') {
        // Sliding leaf: parallel to the wall, parked half-open on the hinge
        // side, riding on the swing-side face of the wall.
        const leaf = new THREE.Mesh(
          new THREE.BoxGeometry(wM, hM, LEAF_THICKNESS_M),
          getDoorLeafMaterial(),
        );
        const parkU = h.hinge === 'start' ? u0 : u1;
        const zOut = towardPlusZ ? thicknessM + LEAF_THICKNESS_M / 2 + 0.002 : -LEAF_THICKNESS_M / 2 - 0.002;
        leaf.position.set(parkU, cv, zOut);
        leaf.userData = { ...openingData };
        leaf.castShadow = true;
        dress.add(leaf);
      } else if (h.hinge === 'end') {
        addLeaf(wM, u1, -1);
      } else {
        addLeaf(wM, u0, 1);
      }
    }
    // pass-through: no leaf, no glass — just the frame.
  }

  // ── Orient + place the DRESSING group (body pieces are already world) ──
  const ax = footprint.aMm.x * MM_TO_THREE;
  const ay = footprint.aMm.y * MM_TO_THREE;
  const dxm = (footprint.bMm.x - footprint.aMm.x) * MM_TO_THREE;
  const dym = (footprint.bMm.y - footprint.aMm.y) * MM_TO_THREE;
  const angle = Math.atan2(dym, dxm); // wall direction in floor plane

  // Build a basis whose:
  //   xAxis = (cos a, sin a, 0)             along wall in floor (domain XY)
  //   yAxis = (0, 0, 1)                     up in domain
  //   zAxis = (-sin a, cos a, 0)            left-hand normal in floor
  const xAxis = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
  const yAxis = new THREE.Vector3(0, 0, 1);
  const zAxis = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0);
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);

  // Place at wall.a, then offset by -thickness/2 along the normal so the
  // local "thickness" range (0..thicknessM) is centered on the centerline.
  const halfT = thicknessM / 2;
  const px = ax - zAxis.x * halfT;
  const py = ay - zAxis.y * halfT;
  const pz = footprint.baseZMm * MM_TO_THREE;
  basis.setPosition(new THREE.Vector3(px, py, pz));

  dress.matrixAutoUpdate = false;
  dress.matrix.copy(basis);
  group.updateMatrixWorld(true);
  void lengthM;

  return group;
}

/**
 * Rewrite a geometry's UVs as a planar projection in METRES: extruded wall
 * pieces get u along the dominant horizontal axis and v = height, so a tile
 * texture repeating once per metre reads as real tiles on every wall.
 */
function remapUvsToMetres(geom: THREE.BufferGeometry): void {
  const pos = geom.getAttribute('position');
  const normal = geom.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nz = normal ? Math.abs(normal.getZ(i)) : 0;
    if (nz > 0.7) {
      // top / bottom face → floor-plane projection
      uv[i * 2] = x;
      uv[i * 2 + 1] = y;
    } else {
      const nx = normal ? Math.abs(normal.getX(i)) : 0;
      // side faces → along-wall (whichever horizontal axis the face spans) × height
      uv[i * 2] = nx > 0.7 ? y : x;
      uv[i * 2 + 1] = z;
    }
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// ── Floor / ceiling builders ────────────────────────────────────────────────

function shapeFromPoints(points: Vec2[]): THREE.Shape {
  const shape = new THREE.Shape();
  const p0 = points[0];
  shape.moveTo(p0.x * MM_TO_THREE, p0.y * MM_TO_THREE);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    shape.lineTo(p.x * MM_TO_THREE, p.y * MM_TO_THREE);
  }
  shape.closePath();
  return shape;
}

export function buildFloorMesh(floor: FloorPolygon): THREE.Mesh | null {
  if (floor.points.length < 3) return null;
  const geometry = new THREE.ShapeGeometry(shapeFromPoints(floor.points));
  geometry.translate(0, 0, floor.zMm * MM_TO_THREE);
  // ShapeGeometry UVs are already the XY position in metres → 1 tile / m.
  const mesh = new THREE.Mesh(geometry, getFloorMaterialFor(floor.material));
  mesh.receiveShadow = true;
  mesh.name = `floor:${floor.roomId}`;
  mesh.userData = { roomId: floor.roomId, kind: 'floor' };
  return mesh;
}

export function buildCeilingMesh(ceiling: CeilingPolygon): THREE.Mesh | null {
  if (ceiling.points.length < 3) return null;
  const geometry = new THREE.ShapeGeometry(shapeFromPoints(ceiling.points));
  geometry.translate(0, 0, ceiling.zMm * MM_TO_THREE);
  const mesh = new THREE.Mesh(geometry, getCeilingMaterial());
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = `ceiling:${ceiling.roomId}`;
  mesh.userData = { roomId: ceiling.roomId, kind: 'ceiling', zMm: ceiling.zMm };
  return mesh;
}

// ── Equipment placeholder (replaced by GLBs in Phase 6) ─────────────────────

export function buildEquipmentPlaceholder(
  equipmentId: string,
  position: { x: number; y: number; z: number },
  footprint: { width: number; depth: number },
  heightMm: number,
  rotationRad: number,
): THREE.Mesh {
  const w = footprint.width * MM_TO_THREE;
  const d = footprint.depth * MM_TO_THREE;
  const h = heightMm * MM_TO_THREE;
  const geometry = new THREE.BoxGeometry(w, d, h);
  const material = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.6,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    position.x * MM_TO_THREE + w / 2,
    position.y * MM_TO_THREE + d / 2,
    position.z * MM_TO_THREE + h / 2,
  );
  mesh.rotation.z = rotationRad;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { equipmentId, kind: 'equipment' };
  return mesh;
}

// ── Whole-scene builder ────────────────────────────────────────────────────

export interface BuiltScene {
  group: THREE.Group;
  meshByWallId: Map<string, THREE.Object3D>;
  meshByFloorId: Map<string, THREE.Mesh>;
  meshByEquipmentId: Map<string, THREE.Mesh>;
  boundsM: THREE.Box3;
}

/**
 * Build ONLY walls + floor (the "static" scene). Equipment is built and
 * lifecycled separately by Editor3D so GLBs survive store rebuilds and
 * placeholders aren't constantly recreated.
 */
export function buildStaticScene(desc: SceneDescription): BuiltScene {
  const group = new THREE.Group();
  group.name = 'project-static';

  const meshByWallId = new Map<string, THREE.Object3D>();
  const meshByFloorId = new Map<string, THREE.Mesh>();
  const meshByEquipmentId = new Map<string, THREE.Mesh>();

  for (const f of desc.floors) {
    const m = buildFloorMesh(f);
    if (m) {
      group.add(m);
      meshByFloorId.set(f.roomId, m);
    }
  }
  for (const w of desc.walls) {
    const obj = buildWallMesh(w);
    group.add(obj);
    meshByWallId.set(w.wallId, obj);
  }

  // Bounds + return below…
  return finalizeBuiltScene(group, meshByWallId, meshByFloorId, meshByEquipmentId, desc);
}

/** Legacy alias — full scene (walls + floor + placeholder equipment). */
export function buildSceneFromDescription(desc: SceneDescription): BuiltScene {
  const built = buildStaticScene(desc);
  for (const e of desc.equipment) {
    const m = buildEquipmentPlaceholder(
      e.equipmentId,
      e.position,
      e.footprint,
      e.heightMm,
      e.rotationRad,
    );
    built.group.add(m);
    built.meshByEquipmentId.set(e.equipmentId, m);
  }
  return built;
}

/**
 * Camera-framing box in WORLD space (metres), straight from the description —
 * no geometry has to be built to frame the scene.
 *
 * WHY world and not plan space: every caller hands the result to the camera
 * (`fitCameraToBox` / `setViewPreset`), which works in Three's Y-up world.
 * The description is in plan space (render mm, Z-up) and `contentRoot` is
 * rotated -90° about X, so local (x, y, z) → world (x, z, -y). Passing the
 * plan box straight through used the room DEPTH as the vertical extent and
 * aimed the camera below the floor — that was the long-standing "fit / view
 * presets frame the room badly" bug.
 *
 * The vertical extent is the real content height (tallest wall top or item
 * top), so a 4 m ceiling or a tall shelf is actually framed instead of being
 * cropped by a hardcoded 3 m.
 */
export function boundsBoxFromDescription(desc: SceneDescription): THREE.Box3 {
  const box = new THREE.Box3();
  if (!desc.bounds) return box;

  // Plan extent (render mm → m). Guard degenerate spans so a single wall
  // still yields a box the camera can frame.
  const halfPad = 0.25;
  const x0 = desc.bounds.min.x * MM_TO_THREE;
  const x1 = desc.bounds.max.x * MM_TO_THREE;
  const y0 = desc.bounds.min.y * MM_TO_THREE;
  const y1 = desc.bounds.max.y * MM_TO_THREE;
  const padX = x1 - x0 < 0.5 ? halfPad : 0;
  const padY = y1 - y0 < 0.5 ? halfPad : 0;

  let topMm = 0;
  for (const w of desc.walls) topMm = Math.max(topMm, w.baseZMm + w.heightMm);
  for (const e of desc.equipment) topMm = Math.max(topMm, e.position.z + e.heightMm);
  const top = Math.max(topMm * MM_TO_THREE, 2.5);

  // local (x, y, z) → world (x, z, -y)
  box.set(
    new THREE.Vector3(x0 - padX, 0, -(y1 + padY)),
    new THREE.Vector3(x1 + padX, top, -(y0 - padY)),
  );
  return box;
}

function finalizeBuiltScene(
  group: THREE.Group,
  meshByWallId: Map<string, THREE.Object3D>,
  meshByFloorId: Map<string, THREE.Mesh>,
  meshByEquipmentId: Map<string, THREE.Mesh>,
  desc: SceneDescription,
): BuiltScene {
  return { group, meshByWallId, meshByFloorId, meshByEquipmentId, boundsM: boundsBoxFromDescription(desc) };
}

/**
 * Dispose the GEOMETRIES under `obj` and any material that is NOT a shared
 * singleton. Safe for per-wall / per-floor teardown.
 */
export function disposeOwnedResources(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const mat of mats) {
      if (!isSharedMaterial(mat)) mat.dispose();
    }
  });
}
