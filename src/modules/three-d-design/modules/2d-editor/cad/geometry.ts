/**
 * 2D-editor-specific CAD helpers. Pure functions in WORLD MM.
 *
 * Anything reusable beyond this editor (offsetPolygon, snapToGrid,
 * polygonToEdges, mergeVertices) lives in core/polygon.ts — import from there.
 */

import type { Vec2 } from '../../../core/types';
import {
  add2,
  closestPointOnSegment,
  distance2,
  EPSILON,
  scale2,
  sub2,
} from '../../../core/math';

// ── Re-exports from core (kept here so existing imports don't churn) ───────
export { polygonToEdges, snapToGrid } from '../../../core/polygon';

// ── Editor-only helpers ─────────────────────────────────────────────────────

/** Nearest existing vertex within radius (vertex-merge / snap). */
export function nearestVertex(
  point: Vec2,
  vertices: ReadonlyArray<Vec2>,
  radiusMm: number,
): Vec2 | null {
  let best: Vec2 | null = null;
  let bestDist = radiusMm;
  for (const v of vertices) {
    const d = distance2(point, v);
    if (d <= bestDist) {
      bestDist = d;
      best = v;
    }
  }
  return best;
}

/** Nearest point on any segment within radius. Returns segment + parameter. */
export function nearestPointOnEdges(
  point: Vec2,
  edges: ReadonlyArray<{ a: Vec2; b: Vec2 }>,
  radiusMm: number,
): { point: Vec2; edgeIndex: number; t: number } | null {
  let best: { point: Vec2; edgeIndex: number; t: number } | null = null;
  let bestDist = radiusMm;
  for (let i = 0; i < edges.length; i++) {
    const { a, b } = edges[i];
    const closest = closestPointOnSegment(point, a, b);
    const d = distance2(point, closest);
    if (d <= bestDist) {
      const ab = sub2(b, a);
      const lenSq = ab.x * ab.x + ab.y * ab.y;
      const t =
        lenSq < EPSILON
          ? 0
          : ((closest.x - a.x) * ab.x + (closest.y - a.y) * ab.y) / lenSq;
      bestDist = d;
      best = { point: closest, edgeIndex: i, t };
    }
  }
  return best;
}

/** Should a click on `point` close the polygon? */
export function shouldClosePolygon(
  point: Vec2,
  points: ReadonlyArray<Vec2>,
  mergeRadiusMm: number,
): boolean {
  if (points.length < 3) return false;
  return distance2(point, points[0]) <= mergeRadiusMm;
}

/**
 * Resize an edge to a target length (mm) by moving its END vertex along the
 * existing edge direction. Used by the wall-length input — the editor then
 * commits the move via `moveVertex(endVertexId, newPoint)`.
 */
export function resizeEdgeLength(
  points: ReadonlyArray<Vec2>,
  edgeIndex: number,
  newLengthMm: number,
): Vec2[] {
  const n = points.length;
  if (n < 2) return [...points];
  const a = points[edgeIndex];
  const bIdx = (edgeIndex + 1) % n;
  const b = points[bIdx];
  const dir = sub2(b, a);
  const len = Math.hypot(dir.x, dir.y);
  if (len < EPSILON || newLengthMm <= 0) return [...points];
  const ratio = newLengthMm / len;
  const newB: Vec2 = { x: a.x + dir.x * ratio, y: a.y + dir.y * ratio };
  const out = [...points];
  out[bIdx] = newB;
  return out;
}

// ── Unit conversions ───────────────────────────────────────────────────────
export const cmToMm = (cm: number) => cm * 10;
export const mToMm = (m: number) => m * 1000;
export const mmToCm = (mm: number) => mm / 10;

// Suppress unused-import warnings from the helpers we re-export through above.
void add2; void scale2;
