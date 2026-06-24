/**
 * Equipment collision + edge-snap math (domain mm, top-down XY plane).
 *
 * Anchor convention
 *   Equipment.position is the GROUP ORIGIN — the footprint min-corner
 *   BEFORE rotation. The group is rotated by `eq.rotation` (radians, around
 *   Z) at that origin, so after rotation the box-center sits at
 *     center = position + R(θ) · (w/2, d/2)
 *   We construct an OBB from this and run SAT against other equipment.
 *
 * Why OBB and not AABB
 *   The user can rotate items freely (slider). 90° rotations alone would
 *   already break AABB because the anchor stays at the (pre-rotation)
 *   min-corner — naive AABB would think the item is somewhere else after
 *   rotation. SAT on OBBs is exact for any angle.
 *
 * Tolerances
 *   - 0.5 mm overlap epsilon: SAT projections within 0.5 mm count as touching,
 *     not overlapping. Keeps "edge-flush" placements from being flagged.
 *   - 50 mm edge-snap tolerance: when two parallel edges are within 50 mm of
 *     each other AND the items overlap on the perpendicular axis, snap so
 *     they're flush (0 mm gap). Mutfak kabin sıralaması için kritik.
 */

import type { Equipment } from '../../../core/types';

export interface OBB {
  cx: number;
  cy: number;
  hw: number;
  hd: number;
  cos: number;
  sin: number;
}

export interface Vec2 { x: number; y: number; }

const TOUCH_EPSILON_MM = 0.5;

export function equipmentToOBB(eq: Equipment): OBB {
  return obbFor(eq.position, eq.rotation, eq.footprint.width, eq.footprint.depth);
}

/** OBB for a hypothetical placement (no Equipment instance needed). */
export function obbFor(pos: { x: number; y: number }, rotation: number, w: number, d: number): OBB {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    cx: pos.x + (w / 2) * cos - (d / 2) * sin,
    cy: pos.y + (w / 2) * sin + (d / 2) * cos,
    hw: w / 2,
    hd: d / 2,
    cos,
    sin,
  };
}

export function obbCorners(o: OBB): Vec2[] {
  const xR = o.cos * o.hw;
  const yR = o.sin * o.hw;
  const xT = -o.sin * o.hd;
  const yT = o.cos * o.hd;
  return [
    { x: o.cx - xR - xT, y: o.cy - yR - yT },
    { x: o.cx + xR - xT, y: o.cy + yR - yT },
    { x: o.cx + xR + xT, y: o.cy + yR + yT },
    { x: o.cx - xR + xT, y: o.cy - yR + yT },
  ];
}

export function obbAABB(o: OBB): { minX: number; minY: number; maxX: number; maxY: number } {
  const c = obbCorners(o);
  let minX = c[0].x, minY = c[0].y, maxX = c[0].x, maxY = c[0].y;
  for (let i = 1; i < 4; i++) {
    if (c[i].x < minX) minX = c[i].x;
    if (c[i].y < minY) minY = c[i].y;
    if (c[i].x > maxX) maxX = c[i].x;
    if (c[i].y > maxY) maxY = c[i].y;
  }
  return { minX, minY, maxX, maxY };
}

function projectOBB(o: OBB, ax: Vec2): { min: number; max: number; center: number } {
  const c = o.cx * ax.x + o.cy * ax.y;
  const r =
    Math.abs(o.cos * ax.x + o.sin * ax.y) * o.hw +
    Math.abs(-o.sin * ax.x + o.cos * ax.y) * o.hd;
  return { min: c - r, max: c + r, center: c };
}

/**
 * SAT overlap test. Returns penetration depth (mm) and the axis along which
 * `a` should be pushed to escape `b` (unit vector, points away from b's center).
 */
export function obbOverlap(a: OBB, b: OBB): { overlap: boolean; pen: number; axis: Vec2 } {
  const axes: Vec2[] = [
    { x: a.cos, y: a.sin },
    { x: -a.sin, y: a.cos },
    { x: b.cos, y: b.sin },
    { x: -b.sin, y: b.cos },
  ];
  let minPen = Infinity;
  let minAxis: Vec2 = { x: 1, y: 0 };
  for (const ax of axes) {
    const aP = projectOBB(a, ax);
    const bP = projectOBB(b, ax);
    const overlap = Math.min(aP.max, bP.max) - Math.max(aP.min, bP.min);
    if (overlap < -TOUCH_EPSILON_MM) return { overlap: false, pen: 0, axis: ax };
    if (overlap < minPen) {
      minPen = overlap;
      // Axis points from b's center → a's center so pushing a along it escapes b.
      const dir = aP.center >= bP.center ? 1 : -1;
      minAxis = { x: ax.x * dir, y: ax.y * dir };
    }
  }
  return { overlap: minPen > TOUCH_EPSILON_MM, pen: Math.max(0, minPen), axis: minAxis };
}

/**
 * Push `desiredPos` until the resulting OBB no longer overlaps any other.
 * Iterates because pushing out of one obstacle can poke into another.
 *
 *   - `excludeId`: target's own id (skip self-collision)
 *   - returns the closest non-overlapping position; if no resolution found
 *     within `iterations`, returns the last attempted position.
 */
export function resolveCollision(
  desiredPos: Vec2,
  rotation: number,
  width: number,
  depth: number,
  others: Equipment[],
  excludeId: string | null,
  iterations: number = 6,
): Vec2 {
  const pos = { x: desiredPos.x, y: desiredPos.y };
  for (let i = 0; i < iterations; i++) {
    const tOBB = obbFor(pos, rotation, width, depth);
    let pushed = false;
    for (const other of others) {
      if (excludeId && other.id === excludeId) continue;
      const oOBB = equipmentToOBB(other);
      const r = obbOverlap(tOBB, oOBB);
      if (r.overlap) {
        pos.x += r.axis.x * (r.pen + TOUCH_EPSILON_MM);
        pos.y += r.axis.y * (r.pen + TOUCH_EPSILON_MM);
        pushed = true;
        break;
      }
    }
    if (!pushed) return pos;
  }
  return pos;
}

/**
 * Snap target's AABB edges to nearby parallel edges of OTHER equipment.
 * Triggers only when:
 *   - distance to a parallel edge ≤ tolMm
 *   - target overlaps the other on the perpendicular axis (otherwise it
 *     would teleport sideways into a non-neighbor)
 *
 * Uses AABB of the rotated OBB so it works for any rotation while still
 * snapping cleanly when items are at 0/90/180/270° (the common case).
 */
export function snapToEdges(
  desiredPos: Vec2,
  rotation: number,
  width: number,
  depth: number,
  others: Equipment[],
  excludeId: string | null,
  tolMm: number = 50,
): Vec2 {
  const tOBB = obbFor(desiredPos, rotation, width, depth);
  const tAABB = obbAABB(tOBB);

  let bestDX = 0;
  let bestDXdist = tolMm + 1;
  let bestDY = 0;
  let bestDYdist = tolMm + 1;

  for (const other of others) {
    if (excludeId && other.id === excludeId) continue;
    const oAABB = obbAABB(equipmentToOBB(other));

    const yOverlap = tAABB.maxY > oAABB.minY && tAABB.minY < oAABB.maxY;
    if (yOverlap) {
      // target.maxX → other.minX (right→left contact)
      const d1 = oAABB.minX - tAABB.maxX;
      if (Math.abs(d1) < bestDXdist) { bestDXdist = Math.abs(d1); bestDX = d1; }
      // target.minX → other.maxX (left→right contact)
      const d2 = oAABB.maxX - tAABB.minX;
      if (Math.abs(d2) < bestDXdist) { bestDXdist = Math.abs(d2); bestDX = d2; }
      // Edge-aligned (left-edge to left-edge, right-to-right) — useful for stacks
      const d3 = oAABB.minX - tAABB.minX;
      if (Math.abs(d3) < bestDXdist) { bestDXdist = Math.abs(d3); bestDX = d3; }
      const d4 = oAABB.maxX - tAABB.maxX;
      if (Math.abs(d4) < bestDXdist) { bestDXdist = Math.abs(d4); bestDX = d4; }
    }

    const xOverlap = tAABB.maxX > oAABB.minX && tAABB.minX < oAABB.maxX;
    if (xOverlap) {
      const d1 = oAABB.minY - tAABB.maxY;
      if (Math.abs(d1) < bestDYdist) { bestDYdist = Math.abs(d1); bestDY = d1; }
      const d2 = oAABB.maxY - tAABB.minY;
      if (Math.abs(d2) < bestDYdist) { bestDYdist = Math.abs(d2); bestDY = d2; }
      const d3 = oAABB.minY - tAABB.minY;
      if (Math.abs(d3) < bestDYdist) { bestDYdist = Math.abs(d3); bestDY = d3; }
      const d4 = oAABB.maxY - tAABB.maxY;
      if (Math.abs(d4) < bestDYdist) { bestDYdist = Math.abs(d4); bestDY = d4; }
    }
  }

  return {
    x: desiredPos.x + (bestDXdist <= tolMm ? bestDX : 0),
    y: desiredPos.y + (bestDYdist <= tolMm ? bestDY : 0),
  };
}

// ── Containment (keep an OBB inside a polygon) ───────────────────────────────

/** True if point p is inside polygon poly (ray casting). mm. */
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

/** Closest point on segment AB to point P. */
export function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-9) return { x: a.x, y: a.y };
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + abx * t, y: a.y + aby * t };
}

/**
 * Push `pos` so all four corners of the resulting OBB lie inside `polygon`.
 * Iterates because correcting one corner can poke another out. For each
 * violating corner we move `pos` by the vector from the corner to its closest
 * point on the polygon boundary (the cheapest escape into the room).
 *
 * `polygon` must be the INNER (inset) room polygon so items rest on the wall's
 * inner face. No-op when the polygon is degenerate (<3 pts).
 */
export function clampOBBInsidePolygon(
  pos: Vec2,
  rotation: number,
  width: number,
  depth: number,
  polygon: ReadonlyArray<Vec2>,
  iterations: number = 8,
): Vec2 {
  if (polygon.length < 3) return { x: pos.x, y: pos.y };
  const out = { x: pos.x, y: pos.y };
  for (let it = 0; it < iterations; it++) {
    const obb = obbFor(out, rotation, width, depth);
    const corners = obbCorners(obb);
    // Find the most-outside corner and the push needed to bring it in.
    let worstPush: Vec2 | null = null;
    let worstDist = 0;
    for (const c of corners) {
      if (pointInPolygon(c, polygon)) continue;
      // Nearest boundary point across all edges.
      let nx = c.x;
      let ny = c.y;
      let nd = Infinity;
      for (let i = 0; i < polygon.length; i++) {
        const cp = closestPointOnSegment(c, polygon[i], polygon[(i + 1) % polygon.length]);
        const dx = cp.x - c.x;
        const dy = cp.y - c.y;
        const d = dx * dx + dy * dy;
        if (d < nd) {
          nd = d;
          nx = cp.x;
          ny = cp.y;
        }
      }
      const dist = Math.hypot(nx - c.x, ny - c.y);
      if (dist > worstDist) {
        worstDist = dist;
        worstPush = { x: nx - c.x, y: ny - c.y };
      }
    }
    if (!worstPush || worstDist <= TOUCH_EPSILON_MM) break;
    out.x += worstPush.x;
    out.y += worstPush.y;
  }
  return out;
}

// ── Wall obstacles (keep equipment from crossing ANY wall) ───────────────────

/**
 * OBB for a wall segment: width axis runs ALONG the centerline (a→b), depth
 * axis is the wall thickness. Lets us run the same SAT push-out used for
 * item-item collision against walls — so a product's head/middle/tail can
 * never penetrate a wall, including interior/partition walls drawn later.
 */
export function wallToOBB(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  thickness: number,
): OBB {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return {
    cx: (ax + bx) / 2,
    cy: (ay + by) / 2,
    hw: len / 2,
    hd: Math.max(1, thickness) / 2,
    cos: dx / len,
    sin: dy / len,
  };
}

/**
 * Push `pos` until the resulting OBB no longer overlaps any obstacle OBB
 * (typically walls). Same iterative escape as {@link resolveCollision} but
 * against pre-built OBBs instead of Equipment instances. A flush (0-gap)
 * contact is NOT an overlap (TOUCH_EPSILON), so a counter can sit against a
 * wall without being shoved away.
 */
export function resolveAgainstObstacles(
  pos: Vec2,
  rotation: number,
  width: number,
  depth: number,
  obstacles: ReadonlyArray<OBB>,
  iterations: number = 8,
): Vec2 {
  const p = { x: pos.x, y: pos.y };
  for (let i = 0; i < iterations; i++) {
    const t = obbFor(p, rotation, width, depth);
    let pushed = false;
    for (const o of obstacles) {
      const r = obbOverlap(t, o);
      if (r.overlap) {
        p.x += r.axis.x * (r.pen + TOUCH_EPSILON_MM);
        p.y += r.axis.y * (r.pen + TOUCH_EPSILON_MM);
        pushed = true;
        break;
      }
    }
    if (!pushed) return p;
  }
  return p;
}

/**
 * Subset of `others` whose VERTICAL extent [z, z+height] overlaps the target's.
 *
 * Collision is resolved on the 2D footprint (top-down OBB). Without this filter
 * a wall cabinet at z≈1450 would be shoved away from a base counter at z=0
 * sitting directly beneath it — even though in 3D they never touch. By
 * pre-filtering to items that actually share a height band we get correct 3D
 * non-penetration: items at the SAME level can't interpenetrate, while
 * legitimately stacked items (microwave on a counter, hood above a range) stay
 * free to overlap in plan view.
 *
 * Conservative: if either height is missing / non-positive we KEEP the item
 * (treat it as colliding), so a bad height can never silently switch collision
 * off for an item.
 */
export function othersAtHeight(
  z: number,
  height: number,
  others: Equipment[],
): Equipment[] {
  if (!(height > 0)) return others;
  return others.filter((o) => {
    const oh = o.heightMm;
    const oz = o.position.z;
    if (!(oh > 0)) return true;
    const overlap = Math.min(z + height, oz + oh) - Math.max(z, oz);
    return overlap > TOUCH_EPSILON_MM;
  });
}

/** True if any other equipment overlaps the proposed placement. */
export function isOverlapping(
  pos: Vec2,
  rotation: number,
  width: number,
  depth: number,
  others: Equipment[],
  excludeId: string | null,
): boolean {
  const t = obbFor(pos, rotation, width, depth);
  for (const o of others) {
    if (excludeId && o.id === excludeId) continue;
    if (obbOverlap(t, equipmentToOBB(o)).overlap) return true;
  }
  return false;
}
