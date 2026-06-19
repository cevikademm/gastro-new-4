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
import { distance2, mm2ToM2, mmToM, polygonArea, polygonPerimeter } from './math';

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
