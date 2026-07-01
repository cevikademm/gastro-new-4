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
  Opening,
  OpeningKind,
  ProjectDocument,
  Room,
  Vec2,
  Wall,
} from './types';
import { distance2, normalize2, perp2, sub2 } from './math';
import { roomPolygon, wallSegment } from './geometry';
import { flipPointY, flipEquipPlacement } from './renderSpace';

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
  /** Local-space holes (uvs along the wall, NOT world). */
  holes: Array<{
    openingId: string;
    kind: OpeningKind;
    /** distance along wall from a→b in mm */
    uMin: number;
    uMax: number;
    /** vertical extent in mm */
    vMin: number;
    vMax: number;
  }>;
}

export interface FloorPolygon {
  roomId: string;
  /** Room polygon vertices in mm, on the floor plane. */
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
    // Inset openings by 1mm so the hole edge doesn't kiss the wall edge —
    // ExtrudeGeometry with a hole touching the outer edge produces broken
    // triangulation in some Three.js versions.
    const uMin = Math.max(1, op.offset);
    const uMax = Math.min(segmentLengthMm - 1, op.offset + op.width);
    if (uMax <= uMin) continue;
    const vMin = Math.max(0, op.sillHeight);
    const vMax = Math.min(wall.height - 1, op.sillHeight + op.height);
    if (vMax <= vMin) continue;
    out.push({ openingId: op.id, kind: op.kind, uMin, uMax, vMin, vMax });
  }
  return out;
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
    walls.push({
      wallId: wall.id,
      corners: wallFloorFootprint(wall, a, b),
      aMm: a,
      bMm: b,
      lengthMm: len,
      heightMm: wall.height,
      baseZMm: wallFloorZ(project, wall),
      thicknessMm: wall.thickness,
      holes: wallHoles(wall, openings, len),
    });
  }

  // Floors
  const floors: FloorPolygon[] = [];
  for (const room of Object.values(project.rooms) as Room[]) {
    const pts = roomPolygon(project, room).map((p) => ({ x: p.x, y: flipPointY(p.y) }));
    if (pts.length >= 3) {
      floors.push({ roomId: room.id, points: pts, zMm: room.floorHeight });
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
    equipment,
    bounds: touched ? { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } } : null,
  };
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
