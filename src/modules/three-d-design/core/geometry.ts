/**
 * Domain-aware geometry helpers — operate on the NORMALIZED project model.
 * Pure functions: input project (or fragments), output computed values.
 *
 * Naming convention
 *  - `wallSegment(...)`     vertex IDs → concrete Vec2 endpoints
 *  - `roomPolygon(...)`     ordered loop of points (CCW for valid rooms)
 *  - `calculateWallLength`  scalar mm length
 */

import type {
  ProjectDocument,
  Room,
  Vec2,
  Vertex,
  Wall,
  WallId,
} from './types';
import {
  closestPointOnSegment,
  distance2,
  mm2ToM2,
  mmToM,
  polygonArea,
  polygonPerimeter,
  polygonSignedArea,
} from './math';
import { offsetPolygon } from './polygon';

// ── Vertex / wall dereference ───────────────────────────────────────────────

export function getVertex(project: ProjectDocument, id: string): Vertex | undefined {
  return project.vertices[id];
}

/** Throws in dev if invariant I-1 broken; returns the resolved Vertex pair. */
export function wallSegment(
  project: ProjectDocument,
  wall: Wall,
): { a: Vertex; b: Vertex } {
  const a = project.vertices[wall.a];
  const b = project.vertices[wall.b];
  if (!a || !b) {
    throw new Error(
      `wallSegment: wall ${wall.id} references missing vertex ` +
        `${a ? wall.b : wall.a}`,
    );
  }
  return { a, b };
}

export function wallStart(project: ProjectDocument, wall: Wall): Vec2 {
  const v = project.vertices[wall.a];
  return v ? { x: v.x, y: v.y } : { x: 0, y: 0 };
}

export function wallEnd(project: ProjectDocument, wall: Wall): Vec2 {
  const v = project.vertices[wall.b];
  return v ? { x: v.x, y: v.y } : { x: 0, y: 0 };
}

/** Length of a single wall in mm. */
export function calculateWallLength(project: ProjectDocument, wallId: WallId): number {
  const wall = project.walls[wallId];
  if (!wall) return 0;
  const { a, b } = wallSegment(project, wall);
  return distance2(a, b);
}

// ── Room polygon ────────────────────────────────────────────────────────────

/**
 * Resolve a room's polygon by walking its `wallLoop`. Each wall contributes
 * its START vertex; the loop closes implicitly because invariant I-2
 * guarantees walls[wn].b === walls[w1].a.
 */
export function roomPolygon(project: ProjectDocument, room: Room): Vec2[] {
  const out: Vec2[] = [];
  for (const wid of room.wallLoop) {
    const w = project.walls[wid];
    if (!w) continue;
    const v = project.vertices[w.a];
    if (v) out.push({ x: v.x, y: v.y });
  }
  return out;
}

/** Vertex IDs (in loop order) of a room — useful for hit-testing handles. */
export function roomVertexIds(project: ProjectDocument, room: Room): string[] {
  const out: string[] = [];
  for (const wid of room.wallLoop) {
    const w = project.walls[wid];
    if (w) out.push(w.a);
  }
  return out;
}

// ── Area, perimeter, bounds ────────────────────────────────────────────────

export function roomAreaM2(project: ProjectDocument, room: Room): number {
  return mm2ToM2(polygonArea(roomPolygon(project, room)));
}

export function roomPerimeterM(project: ProjectDocument, room: Room): number {
  return mmToM(polygonPerimeter(roomPolygon(project, room)));
}

export function projectBounds(
  project: ProjectDocument,
): { min: Vec2; max: Vec2 } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let touched = false;

  for (const v of Object.values(project.vertices)) {
    touched = true;
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
  }
  for (const eq of Object.values(project.equipment)) {
    touched = true;
    minX = Math.min(minX, eq.position.x);
    minY = Math.min(minY, eq.position.y);
    maxX = Math.max(maxX, eq.position.x + eq.footprint.width);
    maxY = Math.max(maxY, eq.position.y + eq.footprint.depth);
  }

  return touched ? { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } } : null;
}

// ── Containment (keep equipment inside walls) ────────────────────────────────

/** Average wall thickness of a room's loop (mm). Falls back to 100 mm. */
export function roomWallThickness(project: ProjectDocument, room: Room): number {
  let sum = 0;
  let n = 0;
  for (const wid of room.wallLoop) {
    const w = project.walls[wid];
    if (!w) continue;
    sum += w.thickness;
    n += 1;
  }
  return n > 0 ? sum / n : 100;
}

/**
 * Inner containment polygon for a room: the room outline (wall CENTER line)
 * inset by half the wall thickness so equipment rests against the wall's INNER
 * face instead of its center line. Returns CCW points (matching roomPolygon's
 * orientation). Returns null when the room has fewer than 3 corners.
 *
 * `offsetPolygon` shifts each edge along its LEFT-hand normal. For a CCW loop
 * the left normal points OUTWARD, so a negative distance insets. We detect the
 * loop orientation from the signed area so the inset is correct either way.
 */
export function roomContainmentPolygon(
  project: ProjectDocument,
  room: Room,
  insetMm?: number,
): Vec2[] | null {
  const poly = roomPolygon(project, room);
  if (poly.length < 3) return null;
  const inset = insetMm ?? roomWallThickness(project, room) / 2;
  if (inset <= 0) return poly;
  // signedArea > 0 is CCW under polygonSignedArea's convention; for a CCW loop
  // the offset's left-normal points outward → negative distance insets.
  const ccw = polygonSignedArea(poly) > 0;
  const distance = ccw ? -inset : inset;
  const out = offsetPolygon(poly, distance);
  // Guard against the polygon collapsing/inverting for tiny rooms.
  if (polygonArea(out) < polygonArea(poly) * 0.05) return poly;
  return out;
}

/** True if point p is inside polygon poly (ray casting, mm). */
export function pointInPolygon(p: Vec2, poly: ReadonlyArray<Vec2>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersects =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * The room whose polygon contains `point`, else the room whose polygon is
 * NEAREST to it (closest edge). Returns null when there are no closed rooms.
 */
export function roomForPoint(
  project: ProjectDocument,
  point: Vec2,
): Room | null {
  const rooms = (Object.values(project.rooms) as Room[]).filter(
    (r) => roomPolygon(project, r).length >= 3,
  );
  if (rooms.length === 0) return null;
  for (const room of rooms) {
    if (pointInPolygon(point, roomPolygon(project, room))) return room;
  }
  // Not inside any room — pick the closest one by edge distance.
  let best: Room | null = null;
  let bestDist = Infinity;
  for (const room of rooms) {
    const poly = roomPolygon(project, room);
    for (let i = 0; i < poly.length; i++) {
      const c = closestPointOnSegment(point, poly[i], poly[(i + 1) % poly.length]);
      const d = distance2(point, c);
      if (d < bestDist) {
        bestDist = d;
        best = room;
      }
    }
  }
  return best;
}

export interface NearestWall {
  wallId: WallId;
  a: Vec2;
  b: Vec2;
  /** Unit direction a→b. */
  dir: Vec2;
  /** Unit inward normal (points into the room). */
  normal: Vec2;
  /** Closest point on the wall center line to the query point. */
  closest: Vec2;
  /** Distance from query point to the wall center line (mm). */
  distance: number;
  thickness: number;
}

/**
 * Nearest wall of a room to `point`, with an INWARD normal (pointing into the
 * room interior). Used by wall-mounting to orient & slide an item along a wall.
 */
export function nearestRoomWall(
  project: ProjectDocument,
  room: Room,
  point: Vec2,
): NearestWall | null {
  const center = polygonCentroid(roomPolygon(project, room));
  let best: NearestWall | null = null;
  for (const wid of room.wallLoop) {
    const w = project.walls[wid];
    if (!w) continue;
    const a = project.vertices[w.a];
    const b = project.vertices[w.b];
    if (!a || !b) continue;
    const av: Vec2 = { x: a.x, y: a.y };
    const bv: Vec2 = { x: b.x, y: b.y };
    const len = distance2(av, bv);
    if (len < 1) continue;
    const dir: Vec2 = { x: (bv.x - av.x) / len, y: (bv.y - av.y) / len };
    // Two normal candidates; pick the one pointing toward the room centroid.
    let normal: Vec2 = { x: -dir.y, y: dir.x };
    const mid: Vec2 = { x: (av.x + bv.x) / 2, y: (av.y + bv.y) / 2 };
    if ((center.x - mid.x) * normal.x + (center.y - mid.y) * normal.y < 0) {
      normal = { x: -normal.x, y: -normal.y };
    }
    const closest = closestPointOnSegment(point, av, bv);
    const d = distance2(point, closest);
    if (!best || d < best.distance) {
      best = {
        wallId: w.id,
        a: av,
        b: bv,
        dir,
        normal,
        closest,
        distance: d,
        thickness: w.thickness,
      };
    }
  }
  return best;
}

/** Centroid (average of vertices) of a polygon. */
export function polygonCentroid(poly: ReadonlyArray<Vec2>): Vec2 {
  if (poly.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of poly) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / poly.length, y: sy / poly.length };
}
