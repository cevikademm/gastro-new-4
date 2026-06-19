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
