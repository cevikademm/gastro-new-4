/**
 * Polygon-level utilities. All inputs/outputs are mm.
 *
 * Functions
 *  - offsetPolygon(points, distance)   miter-offset a closed polygon
 *  - snapToGrid(point, gridMm)         re-exported convenience
 *  - mergeVertices(vertices, tol)      collapse near-duplicates → returns
 *                                       merged list + index remap
 *  - polygonToEdges(points)            for splitter / picking
 *  - clonePolygon(points)              deep-copy (immutable updates)
 */

import type { Vec2, Vertex, VertexId } from './types';
import { EPSILON, normalize2, perp2, snap as snapValue, sub2 } from './math';

// ── snapToGrid (re-export of the math version, with Vec2 overload) ──────────
export { snap as snapValueToGrid } from './math';

export function snapToGrid(point: Vec2, gridMm: number): Vec2 {
  if (gridMm <= 0) return point;
  return { x: snapValue(point.x, gridMm), y: snapValue(point.y, gridMm) };
}

// ── offsetPolygon ──────────────────────────────────────────────────────────
/**
 * Miter-offset a closed polygon by `distance` mm.
 * Positive distance offsets to the LEFT of each edge (CCW outward for
 * counter-clockwise loops). Negative offsets inward.
 *
 * Implementation: shift each edge along its left-hand normal, then intersect
 * adjacent shifted edges to weld mitered corners. Falls back to the un-mitred
 * point when adjacent edges are parallel.
 */
export function offsetPolygon(points: ReadonlyArray<Vec2>, distance: number): Vec2[] {
  const n = points.length;
  if (n < 3) return points.map((p) => ({ ...p }));

  const offsetEdges: { p: Vec2; dir: Vec2 }[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const dir = normalize2(sub2(b, a));
    const normal = perp2(dir);
    offsetEdges.push({
      p: { x: a.x + normal.x * distance, y: a.y + normal.y * distance },
      dir,
    });
  }

  const out: Vec2[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const prev = offsetEdges[(i - 1 + n) % n];
    const curr = offsetEdges[i];
    const inter = lineIntersect(prev.p, prev.dir, curr.p, curr.dir);
    out[i] = inter ?? curr.p;
  }
  return out;
}

/** Intersection of two infinite lines (point + direction). Null when parallel. */
export function lineIntersect(p1: Vec2, d1: Vec2, p2: Vec2, d2: Vec2): Vec2 | null {
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < EPSILON) return null;
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / denom;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
}

// ── Segment intersection / simple-polygon test ─────────────────────────────

function orient(a: Vec2, b: Vec2, c: Vec2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a: Vec2, b: Vec2, p: Vec2): boolean {
  return (
    Math.min(a.x, b.x) - EPSILON <= p.x && p.x <= Math.max(a.x, b.x) + EPSILON &&
    Math.min(a.y, b.y) - EPSILON <= p.y && p.y <= Math.max(a.y, b.y) + EPSILON
  );
}

/** True if closed segments AB and CD intersect (touching counts). */
export function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) {
    return true;
  }
  if (Math.abs(o1) < EPSILON && onSegment(a, b, c)) return true;
  if (Math.abs(o2) < EPSILON && onSegment(a, b, d)) return true;
  if (Math.abs(o3) < EPSILON && onSegment(c, d, a)) return true;
  if (Math.abs(o4) < EPSILON && onSegment(c, d, b)) return true;
  return false;
}

/**
 * True when the closed polygon has no self-intersections (adjacent edges may
 * share their common vertex; nothing else may touch). O(n²) — rooms are small.
 */
export function isSimplePolygon(points: ReadonlyArray<Vec2>): boolean {
  const n = points.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // Skip adjacent edges (they share a vertex by construction).
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      const c = points[j];
      const d = points[(j + 1) % n];
      if (segmentsIntersect(a, b, c, d)) return false;
    }
  }
  return true;
}

// ── mergeVertices ──────────────────────────────────────────────────────────
/**
 * Collapse vertices that are within `toleranceMm` of one another into a
 * single vertex. Returns the deduped list AND a remap from original id → kept
 * id, so callers can rewrite walls and other references in one pass.
 *
 * Algorithm: O(n²) with a spatial bucket. Fine for kitchens (typically
 * <100 vertices). Replace with a quadtree if a project ever crosses ~10k.
 */
export function mergeVertices(
  vertices: ReadonlyArray<Vertex>,
  toleranceMm: number,
): {
  merged: Vertex[];
  /** map[oldId] = canonicalId (every input id maps to itself or to an earlier kept vertex) */
  remap: Record<VertexId, VertexId>;
} {
  const merged: Vertex[] = [];
  const remap: Record<VertexId, VertexId> = {};
  const tol2 = toleranceMm * toleranceMm;

  for (const v of vertices) {
    let kept: Vertex | null = null;
    for (const k of merged) {
      const dx = k.x - v.x;
      const dy = k.y - v.y;
      if (dx * dx + dy * dy <= tol2) {
        kept = k;
        break;
      }
    }
    if (kept) {
      remap[v.id] = kept.id;
    } else {
      merged.push(v);
      remap[v.id] = v.id;
    }
  }

  return { merged, remap };
}

// ── Polygon helpers used by both editors ───────────────────────────────────

export function polygonToEdges(points: ReadonlyArray<Vec2>): { a: Vec2; b: Vec2 }[] {
  const out: { a: Vec2; b: Vec2 }[] = [];
  for (let i = 0, n = points.length; i < n; i++) {
    out.push({ a: points[i], b: points[(i + 1) % n] });
  }
  return out;
}

export function clonePolygon(points: ReadonlyArray<Vec2>): Vec2[] {
  return points.map((p) => ({ x: p.x, y: p.y }));
}
