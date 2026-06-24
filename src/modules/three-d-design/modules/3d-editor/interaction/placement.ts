/**
 * Placement helpers — project-aware glue around the pure collision/geometry
 * math. Centralizes two concerns shared by the dragger, the click-to-place
 * handler, and the properties panel:
 *
 *   1) Containment  — keep a floor item's whole footprint inside the room
 *      walls (clampOBBInsidePolygon against the inset room polygon).
 *   2) Wall mounting — project an item onto the nearest wall, orient it so its
 *      depth (back) face is flush with the inner wall surface and it faces the
 *      room, and slide it along the wall keeping the footprint on the wall.
 *
 * Everything is mm / top-down XY, matching collision.ts.
 */

import type { ProjectDocument, Vec2 } from '../../../core/types';
import {
  nearestRoomWall,
  roomContainmentPolygon,
  roomForPoint,
} from '../../../core/geometry';
import {
  clampOBBInsidePolygon,
  obbFor,
  resolveAgainstObstacles,
  wallToOBB,
  type OBB,
} from './collision';

/** OBBs for every wall in the project (centerline × thickness rectangles). */
export function projectWallOBBs(project: ProjectDocument): OBB[] {
  const out: OBB[] = [];
  for (const w of Object.values(project.walls)) {
    const a = project.vertices[w.a];
    const b = project.vertices[w.b];
    if (!a || !b) continue;
    out.push(wallToOBB(a.x, a.y, b.x, b.y, w.thickness));
  }
  return out;
}

/** Default mounting height for wall items (mm from floor). */
export const DEFAULT_WALL_MOUNT_Z = 1450;

/** Footprint min-corner → OBB center. Mirrors obbFor's anchor convention. */
export function obbCenterFromMinCorner(
  x: number,
  y: number,
  rotation: number,
  w: number,
  d: number,
): Vec2 {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: x + (w / 2) * cos - (d / 2) * sin,
    y: y + (w / 2) * sin + (d / 2) * cos,
  };
}

/** OBB center → footprint min-corner (the stored `position`). Inverse of obbFor. */
function centerToMinCorner(center: Vec2, rotation: number, w: number, d: number): Vec2 {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  // center = pos + R·(w/2, d/2)  ⇒  pos = center − R·(w/2, d/2)
  return {
    x: center.x - ((w / 2) * cos - (d / 2) * sin),
    y: center.y - ((w / 2) * sin + (d / 2) * cos),
  };
}

/**
 * Constrain a FLOOR item's footprint (min-corner `pos`) so it:
 *   1) stays INSIDE the room it belongs to (room outline inset by ½ wall), and
 *   2) does NOT penetrate ANY wall — including interior/partition walls drawn
 *      later, which are not part of the room's boundary loop. Full-body (OBB)
 *      SAT, so the item's head, middle AND tail are all kept out of walls.
 *
 * The two constraints can fight (escaping a wall may poke past the room edge),
 * so we alternate a few rounds until stable. Never throws; a no-op when there
 * are neither rooms nor walls.
 */
export function containFloorItem(
  project: ProjectDocument,
  pos: Vec2,
  rotation: number,
  width: number,
  depth: number,
): Vec2 {
  // Use the OBB center to decide which room the item belongs to (more stable
  // than the min-corner which lives outside the box after rotation).
  const obb = obbFor(pos, rotation, width, depth);
  const center: Vec2 = { x: obb.cx, y: obb.cy };
  const room = roomForPoint(project, center);
  const inner = room ? roomContainmentPolygon(project, room) : null;
  const hasInner = !!inner && inner.length >= 3;
  const wallObbs = projectWallOBBs(project);

  let p: Vec2 = { x: pos.x, y: pos.y };
  // 3 rounds is plenty for a kitchen — each round pushes out of walls then
  // pulls back inside the room; positions converge quickly.
  for (let i = 0; i < 3; i++) {
    if (wallObbs.length > 0) {
      p = resolveAgainstObstacles(p, rotation, width, depth, wallObbs);
    }
    if (hasInner) {
      p = clampOBBInsidePolygon(p, rotation, width, depth, inner as Vec2[]);
    }
  }
  return p;
}

export interface WallMountResult {
  /** Footprint min-corner (stored `position.x/y`). */
  pos: Vec2;
  /** Yaw so the back (depth) face is flush with the wall, facing the room. */
  rotation: number;
}

/**
 * Snap a WALL item to the nearest wall of the room nearest `point`:
 *   - rotation: footprint's +depth axis points OUT toward the wall (back face
 *     touches the wall), so the front of the item looks into the room.
 *   - slide: the item's center is projected onto the wall line and clamped so
 *     the whole width stays within the wall span.
 *   - flush: the back face sits on the wall's INNER surface (center line minus
 *     half thickness toward the room).
 *
 * Returns null when there's no usable wall (e.g. empty project).
 */
export function mountToWall(
  project: ProjectDocument,
  point: Vec2,
  width: number,
  depth: number,
): WallMountResult | null {
  const room = roomForPoint(project, point);
  let wall = room ? nearestRoomWall(project, room, point) : null;
  // Fallback: nearest of ALL walls when no closed room (free-standing walls).
  if (!wall) {
    let best: ReturnType<typeof nearestRoomWall> = null;
    for (const r of Object.values(project.rooms)) {
      const w = nearestRoomWall(project, r, point);
      if (w && (!best || w.distance < best.distance)) best = w;
    }
    wall = best;
  }
  if (!wall) return null;

  const { a, b, dir, normal, thickness } = wall;

  // Yaw: we want the local +depth (back) axis to point along -normal (into the
  // wall). obbFor builds the box from local axes:
  //   widthAxis  = (cos, sin)
  //   depthAxis  = (-sin, cos)
  // Back face is at +depthAxis. For the back to touch the wall, depthAxis must
  // equal -normal (pointing from room → wall). Solve:
  //   -sin = -normal.x ,  cos = -normal.y
  const rotation = Math.atan2(normal.x, -normal.y);

  // Project the query point onto the wall line and clamp by half the width so
  // the whole footprint stays on the wall.
  const wallLen = Math.hypot(b.x - a.x, b.y - a.y);
  const tRaw = ((point.x - a.x) * dir.x + (point.y - a.y) * dir.y);
  const half = width / 2;
  const t = Math.max(half, Math.min(wallLen - half, tRaw));
  const along: Vec2 = { x: a.x + dir.x * t, y: a.y + dir.y * t };

  // Inner wall surface = center line shifted inward (toward room) by t/2.
  const inner: Vec2 = {
    x: along.x + normal.x * (thickness / 2),
    y: along.y + normal.y * (thickness / 2),
  };
  // OBB center sits half a depth in from the inner surface (toward the room).
  const center: Vec2 = {
    x: inner.x + normal.x * (depth / 2),
    y: inner.y + normal.y * (depth / 2),
  };

  return {
    pos: centerToMinCorner(center, rotation, width, depth),
    rotation,
  };
}

/** Smart default mount for a freshly-dropped item. */
export function defaultMountFor(category: string): 'floor' | 'wall' {
  return category === 'ventilation' ? 'wall' : 'floor';
}

/** Default z (mm) for a mount type. */
export function defaultZForMount(mount: 'floor' | 'wall'): number {
  return mount === 'wall' ? DEFAULT_WALL_MOUNT_Z : 0;
}
