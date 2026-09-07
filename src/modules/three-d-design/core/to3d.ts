/**
 * 2D → 3D adapter.
 *
 * Produces a plain serializable description (NOT Three.js objects — that's
 * the renderer's job). This means:
 *   - The function is unit-testable without a WebGL context.
 *   - Phase 5's renderer can diff the description across frames and only
 *     touch what changed.
 *   - Future targets (svg export, glTF, react-three-fiber) consume the same
 *     intermediate shape.
 *
 * Wall extrusion model
 *   For wall a→b with thickness t and height h:
 *     - segment direction d = normalize(b - a)
 *     - left normal n      = perp(d)
 *     - footprint corners  = [a + n·t/2, a − n·t/2, b − n·t/2, b + n·t/2]
 *     - extruded along +z by h, sitting on the room's floorHeight
 *   This is exactly what Three.js Shape + ExtrudeGeometry expects.
 *
 * Floor model
 *   For each room: an XY polygon at z = room.floorHeight, vertices walked
 *   via roomPolygon() (already in CCW order if the user drew the room CCW).
 *
 * Opening cuts (Phase 5 will consume these)
 *   For each opening on a wall, we emit a hole rectangle in the wall's local
 *   uv space. The wall mesh builder uses Shape.holes to subtract them.
 */

import type {
  DoorType,
  Opening,
  OpeningHinge,
  OpeningKind,
  OpeningSwing,
  ProjectDocument,
  Room,
  Vec2,
  Wall,
} from './types';
import { distance2, normalize2, perp2, sub2 } from './math';
import { roomPolygon, wallSegment } from './geometry';
import { FLIP_Y, flipPointY, flipEquipPlacement } from './renderSpace';
import { effectiveDoorType, effectiveHinge, effectiveSwing } from './openings';
import { wallBandPolygons } from './wallBands';

// ── Output shapes ───────────────────────────────────────────────────────────

export interface WallFootprint {
  wallId: string;
  /** 4 mm corners on the floor plane (CCW). */
  corners: [Vec2, Vec2, Vec2, Vec2];
  /** Wall start vertex, mm world coords (== a). */
  aMm: Vec2;
  /** Wall end vertex, mm world coords (== b). */
  bMm: Vec2;
  /** Distance |a → b| in mm. */
  lengthMm: number;
  /** Extrusion height in mm. */
  heightMm: number;
  /** z-base in mm (room floorHeight, default 0). */
  baseZMm: number;
  /** Thickness in mm. */
  thicknessMm: number;
  /** Optional material preset id (Faz 2). */
  material?: string;
  /**
   * End cuts from the shared wall bands (render space, mm): the mitred /
   * square / T-notched polylines at `a` (right→left) and `b` (left→right).
   * The 3D body is the band polygon extruded, so corners join exactly like
   * the 2D plan. See core/wallBands.ts.
   */
  cutA: Vec2[];
  cutB: Vec2[];
  /** Local-space holes (uvs along the wall, NOT world). */
  holes: WallHole[];
}

export interface WallHole {
  openingId: string;
  kind: OpeningKind;
  /** distance along wall from a→b in mm */
  uMin: number;
  uMax: number;
  /** vertical extent in mm */
  vMin: number;
  vMax: number;
  /** Hinge jamb: 'start' = at uMin (wall.a side), 'end' = at uMax. */
  hinge: OpeningHinge;
  /**
   * Swing side in RENDER space (already converted from the domain value
   * through the 2D↔3D mirror — see renderSpace.FLIP_Y). 'left' = toward the
   * wall's render-space left normal (+z in the wall's local extrude frame).
   */
  swing: OpeningSwing;
  doorType: DoorType;
}

export interface FloorPolygon {
  roomId: string;
  /** Room polygon vertices in mm, on the floor plane. */
  points: Vec2[];
  zMm: number;
  /** Optional material preset id (Faz 2). */
  material?: string;
}

/** Ceiling slab of a room — same polygon as the floor, at the ceiling height. */
export interface CeilingPolygon {
  roomId: string;
  points: Vec2[];
  zMm: number;
}

export interface EquipmentInstance {
  equipmentId: string;
  catalogId: string;
  /** Anchor (mm). x/y is footprint min corner, z is on the floor. */
  position: { x: number; y: number; z: number };
  rotationRad: number;
  footprint: { width: number; depth: number };
  heightMm: number;
}

export interface SceneDescription {
  walls: WallFootprint[];
  floors: FloorPolygon[];
  ceilings: CeilingPolygon[];
  equipment: EquipmentInstance[];
  /** mm bounds of everything — used by the camera to frame the model. */
  bounds: { min: Vec2; max: Vec2 } | null;
}

// ── Conversion ──────────────────────────────────────────────────────────────

/**
 * Compute the four floor-plane corners of a wall given its segment + thickness.
 * Returned in CCW order so it's a valid Three.js Shape.
 */
export function wallFloorFootprint(
  wall: Wall,
  a: Vec2,
  b: Vec2,
): [Vec2, Vec2, Vec2, Vec2] {
  const dir = normalize2(sub2(b, a));
  const normal = perp2(dir);
  const half = wall.thickness / 2;
  const offN = { x: normal.x * half, y: normal.y * half };
  return [
    { x: a.x + offN.x, y: a.y + offN.y },
    { x: b.x + offN.x, y: b.y + offN.y },
    { x: b.x - offN.x, y: b.y - offN.y },
    { x: a.x - offN.x, y: a.y - offN.y },
  ];
}

function wallHoles(
  wall: Wall,
  openings: Opening[],
  segmentLengthMm: number,
): WallFootprint['holes'] {
  const out: WallFootprint['holes'] = [];
  for (const op of openings) {
    if (op.wallId !== wall.id) continue;
    // Inset openings by 1mm on EVERY side so the hole edge doesn't kiss the
    // wall edge — ExtrudeGeometry with a hole touching the outer contour
    // produces broken triangulation. Doors get a 1 mm sill lip for that reason.
    const uMin = Math.max(1, op.offset);
    const uMax = Math.min(segmentLengthMm - 1, op.offset + op.width);
    if (uMax <= uMin) continue;
    const vMin = Math.max(1, op.sillHeight);
    const vMax = Math.min(wall.height - 1, op.sillHeight + op.height);
    if (vMax <= vMin) continue;
    // Domain swing is geometric (left of a→b). The render space mirrors Y, which
    // flips handedness, so the swing side flips here — the ONLY place this
    // conversion happens.
    const swing = effectiveSwing(op);
    const renderSwing: OpeningSwing = FLIP_Y ? (swing === 'left' ? 'right' : 'left') : swing;
    out.push({
      openingId: op.id,
      kind: op.kind,
      uMin,
      uMax,
      vMin,
      vMax,
      hinge: effectiveHinge(op),
      swing: renderSwing,
      doorType: effectiveDoorType(op),
    });
  }
  return out;
}

// ── Change-detection signatures (incremental 3D rebuild) ───────────────────

const r1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Stable string describing everything that affects a wall's MESH. Two
 * footprints with equal signatures produce identical geometry, so the 3D
 * editor only rebuilds a wall whose signature changed.
 */
export function wallSignature(fp: WallFootprint): string {
  let holes = '';
  for (const h of fp.holes) {
    holes += `|${h.kind}:${r1(h.uMin)},${r1(h.uMax)},${r1(h.vMin)},${r1(h.vMax)},${h.hinge},${h.swing},${h.doorType}`;
  }
  let cuts = '';
  for (const p of fp.cutA) cuts += `${r1(p.x)},${r1(p.y)};`;
  cuts += '/';
  for (const p of fp.cutB) cuts += `${r1(p.x)},${r1(p.y)};`;
  return (
    `${r1(fp.aMm.x)},${r1(fp.aMm.y)};${r1(fp.bMm.x)},${r1(fp.bMm.y)};` +
    `${r1(fp.thicknessMm)};${r1(fp.heightMm)};${r1(fp.baseZMm)};${fp.material ?? ''};${cuts}${holes}`
  );
}

export function floorSignature(f: FloorPolygon): string {
  let pts = '';
  for (const p of f.points) pts += `${r1(p.x)},${r1(p.y)};`;
  return `${pts}z=${r1(f.zMm)};${f.material ?? ''}`;
}

/** Square end cut (fallback when no band exists): right→left at `a`, left→right at `b`. */
function squareCut(a: Vec2, b: Vec2, thickness: number, end: 'a' | 'b'): Vec2[] {
  const dir = normalize2(sub2(b, a));
  const n = perp2(dir);
  const h = thickness / 2;
  const p = end === 'a' ? a : b;
  const left = { x: p.x + n.x * h, y: p.y + n.y * h };
  const right = { x: p.x - n.x * h, y: p.y - n.y * h };
  return end === 'a' ? [right, left] : [left, right];
}

/** Default floor height for a wall — first room that contains it, or 0. */
function wallFloorZ(project: ProjectDocument, wall: Wall): number {
  for (const room of Object.values(project.rooms)) {
    if (room.wallLoop.includes(wall.id)) return room.floorHeight;
  }
  return 0;
}

export function projectToScene(project: ProjectDocument): SceneDescription {
  const openings = Object.values(project.openings);
  const { bands } = wallBandPolygons(project);
  const flip = (p: Vec2): Vec2 => ({ x: p.x, y: flipPointY(p.y) });

  // Walls
  const walls: WallFootprint[] = [];
  for (const wall of Object.values(project.walls)) {
    const va = project.vertices[wall.a];
    const vb = project.vertices[wall.b];
    if (!va || !vb) continue;
    // 2D↔3D aynalama düzeltmesi: domain Y'yi render'a yansıt (bkz. renderSpace.ts).
    // a/b yansıtılınca köşe/normal/açı ve kapı-pencere yönü otomatik tutarlı yansır.
    const a: Vec2 = { x: va.x, y: flipPointY(va.y) };
    const b: Vec2 = { x: vb.x, y: flipPointY(vb.y) };
    const len = distance2(a, b);
    const band = bands.get(wall.id);
    // Y-flip mirrors handedness: the band's LEFT side becomes render RIGHT.
    // cutA is listed right→left in domain space → in render space that order
    // is left→right, so reverse to keep the documented right→left order.
    // Same for cutB (documented left→right).
    const cutA = band ? band.cutA.map(flip).reverse() : squareCut(a, b, wall.thickness, 'a');
    const cutB = band ? band.cutB.map(flip).reverse() : squareCut(a, b, wall.thickness, 'b');
    walls.push({
      wallId: wall.id,
      corners: wallFloorFootprint(wall, a, b),
      aMm: a,
      bMm: b,
      lengthMm: len,
      heightMm: wall.height,
      baseZMm: wallFloorZ(project, wall),
      thicknessMm: wall.thickness,
      material: wall.material,
      cutA,
      cutB,
      holes: wallHoles(wall, openings, len),
    });
  }

  // Floors + ceilings
  const floors: FloorPolygon[] = [];
  const ceilings: CeilingPolygon[] = [];
  for (const room of Object.values(project.rooms) as Room[]) {
    const pts = roomPolygon(project, room).map((p) => ({ x: p.x, y: flipPointY(p.y) }));
    if (pts.length >= 3) {
      floors.push({ roomId: room.id, points: pts, zMm: room.floorHeight, material: room.floorMaterial });
      // Ceiling sits at the tallest wall of the loop (the room's ceilingHeight
      // is a hint; walls are the truth the user edits).
      let top = room.ceilingHeight > 0 ? room.ceilingHeight : 0;
      for (const wid of room.wallLoop) {
        const w = project.walls[wid];
        if (w) top = Math.max(top, w.height);
      }
      if (top > 0) ceilings.push({ roomId: room.id, points: pts, zMm: room.floorHeight + top });
    }
  }

  // Equipment — konum+yaw'ı render uzayına yansıt (bounds/framing için; mesh'ler
  // ekipman-sync efektinde ayrıca yansıtılır).
  const equipment: EquipmentInstance[] = Object.values(project.equipment).map((e) => {
    const r = flipEquipPlacement(e.position.x, e.position.y, e.rotation, e.footprint.width, e.footprint.depth);
    return {
      equipmentId: e.id,
      catalogId: e.catalogId,
      position: { x: r.x, y: r.y, z: e.position.z },
      rotationRad: r.yaw,
      footprint: e.footprint,
      heightMm: e.heightMm,
    };
  });

  // Bounds (mm)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let touched = false;
  for (const w of walls) {
    for (const c of w.corners) {
      touched = true;
      minX = Math.min(minX, c.x); minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x); maxY = Math.max(maxY, c.y);
    }
  }
  for (const e of equipment) {
    touched = true;
    minX = Math.min(minX, e.position.x);
    minY = Math.min(minY, e.position.y);
    maxX = Math.max(maxX, e.position.x + e.footprint.width);
    maxY = Math.max(maxY, e.position.y + e.footprint.depth);
  }

  return {
    walls,
    floors,
    ceilings,
    equipment,
    bounds: touched ? { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } } : null,
  };
}

export function ceilingSignature(c: CeilingPolygon): string {
  let pts = '';
  for (const p of c.points) pts += `${r1(p.x)},${r1(p.y)};`;
  return `${pts}z=${r1(c.zMm)}`;
}

// ── Three.js scale convention ───────────────────────────────────────────────

/**
 * Internal model is mm. Three.js convention here is METERS so equipment GLBs
 * (typically authored at real-world scale) drop in correctly. Use this in the
 * 3D renderer to convert mm → m.
 */
export const MM_TO_THREE = 1 / 1000;
/** Inverse, for going from Three units back to mm (e.g., placement clicks). */
export const THREE_TO_MM = 1000;
// Re-export touched helpers so consumers don't need to know which file.
export { wallSegment };
