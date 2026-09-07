/**
 * useSnap — CAD-style snapping for pointer positions (world mm).
 *
 * Priority (first hit wins, all within `radius` = 12 px):
 *   ortho constraint (Shift / F8, needs an anchor) → vertex → draft point →
 *   wall midpoint → perpendicular foot (from the anchor) → wall edge →
 *   extension of a wall line → grid.
 *
 * Returns the snapped point AND a `SnapHit` describing WHY, so the
 * SnapIndicatorLayer can show the right glyph and the draw tool can split a
 * wall when the user clicks on its edge.
 */

import { useCallback } from 'react';
import type { ProjectDocument, Vec2 } from '../../../core/types';
import { closestPointOnSegment, distance2, dot2, normalize2, sub2 } from '../../../core/math';
import { snapToGrid } from '../../../core/polygon';
import type { SnapHit } from '../state/editorState';

export interface SnapOptions {
  /** Previous point (draft / drag origin) — enables ortho, perpendicular, extension. */
  anchor?: Vec2 | null;
  /** Shift held → ortho even when the sticky toggle is off. */
  shift?: boolean;
  /** Vertex ids to ignore (the vertex being dragged and its walls). */
  excludeVertexIds?: ReadonlySet<string>;
  /** Skip edge/midpoint/perpendicular snaps (e.g. when dragging equipment). */
  noEdges?: boolean;
}

export interface SnapResult {
  point: Vec2;
  hit: SnapHit | null;
}

interface Args {
  project: ProjectDocument;
  scale: number;
  gridMm: number;
  snapOn: boolean;
  orthoOn: boolean;
  draftPoints: Vec2[];
  /** Screen px used as the snap radius (default 12). */
  radiusPx?: number;
}

const ORTHO_STEP = Math.PI / 4; // 45°

export function useSnap({ project, scale, gridMm, snapOn, orthoOn, draftPoints, radiusPx = 12 }: Args) {
  const resolve = useCallback(
    (raw: Vec2, opts: SnapOptions = {}): SnapResult => {
      const radius = radiusPx / scale;
      const anchor = opts.anchor ?? null;
      const ortho = (orthoOn || !!opts.shift) && !!anchor;
      const excluded = opts.excludeVertexIds;

      // Ortho: constrain to the nearest 45° ray from the anchor.
      let p = raw;
      let orthoHit: SnapHit | null = null;
      if (ortho && anchor) {
        const d = sub2(raw, anchor);
        const len = Math.hypot(d.x, d.y);
        if (len > 1e-6) {
          const ang = Math.round(Math.atan2(d.y, d.x) / ORTHO_STEP) * ORTHO_STEP;
          const dir = { x: Math.cos(ang), y: Math.sin(ang) };
          const along = snapOn && gridMm > 0 ? Math.round(len / gridMm) * gridMm : len;
          p = { x: anchor.x + dir.x * along, y: anchor.y + dir.y * along };
          orthoHit = { kind: 'ortho', point: p, from: anchor };
        }
      }

      // 1) Vertex (whole document).
      let bestV: { id: string; d: number; pt: Vec2 } | null = null;
      for (const v of Object.values(project.vertices)) {
        if (excluded?.has(v.id)) continue;
        const d = distance2(p, v);
        if (d <= radius && (!bestV || d < bestV.d)) bestV = { id: v.id, d, pt: { x: v.x, y: v.y } };
      }
      if (bestV) return { point: bestV.pt, hit: { kind: 'vertex', point: bestV.pt } };

      // 2) Draft points (so closing a room works).
      for (const dp of draftPoints) {
        if (distance2(p, dp) <= radius) return { point: dp, hit: { kind: 'draft', point: dp } };
      }

      if (!opts.noEdges) {
        // 3) Midpoint / perpendicular / edge on walls.
        let best: { hit: SnapHit; d: number; rank: number } | null = null;
        const consider = (hit: SnapHit, d: number, rank: number) => {
          if (d > radius) return;
          if (!best || rank < best.rank || (rank === best.rank && d < best.d)) best = { hit, d, rank };
        };
        for (const w of Object.values(project.walls)) {
          if (excluded && (excluded.has(w.a) || excluded.has(w.b))) continue;
          const va = project.vertices[w.a];
          const vb = project.vertices[w.b];
          if (!va || !vb) continue;
          const a: Vec2 = { x: va.x, y: va.y };
          const b: Vec2 = { x: vb.x, y: vb.y };
          const len = distance2(a, b);
          if (len < 1) continue;
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          consider({ kind: 'midpoint', point: mid, wallId: w.id, t: 0.5 }, distance2(p, mid), 0);
          if (anchor) {
            const dir = normalize2(sub2(b, a));
            const t = dot2(sub2(anchor, a), dir) / len;
            if (t > 0.02 && t < 0.98) {
              const foot = { x: a.x + dir.x * t * len, y: a.y + dir.y * t * len };
              consider({ kind: 'perpendicular', point: foot, wallId: w.id, t }, distance2(p, foot), 1);
            }
          }
          const c = closestPointOnSegment(p, a, b);
          const tc = dot2(sub2(c, a), sub2(b, a)) / (len * len);
          consider({ kind: 'edge', point: c, wallId: w.id, t: Math.max(0, Math.min(1, tc)) }, distance2(p, c), 2);
        }
        if (best) {
          const b = best as { hit: SnapHit; d: number; rank: number };
          return { point: b.hit.point, hit: b.hit };
        }

        // 4) Extension of a wall line beyond its ends (up to 5 m).
        for (const w of Object.values(project.walls)) {
          if (excluded && (excluded.has(w.a) || excluded.has(w.b))) continue;
          const va = project.vertices[w.a];
          const vb = project.vertices[w.b];
          if (!va || !vb) continue;
          const a: Vec2 = { x: va.x, y: va.y };
          const b: Vec2 = { x: vb.x, y: vb.y };
          const len = distance2(a, b);
          if (len < 1) continue;
          const dir = normalize2(sub2(b, a));
          const t = dot2(sub2(p, a), dir);
          if (t >= 0 && t <= len) continue; // on the segment → handled above
          if (t < -5000 || t > len + 5000) continue;
          const foot = { x: a.x + dir.x * t, y: a.y + dir.y * t };
          if (distance2(p, foot) <= radius) {
            return { point: foot, hit: { kind: 'extension', point: foot, wallId: w.id, from: t < 0 ? a : b } };
          }
        }
      }

      if (orthoHit) return { point: p, hit: orthoHit };

      // 5) Grid.
      if (snapOn && gridMm > 0) {
        const g = snapToGrid(p, gridMm);
        return { point: g, hit: { kind: 'grid', point: g } };
      }
      return { point: p, hit: null };
    },
    [project, scale, gridMm, snapOn, orthoOn, draftPoints, radiusPx],
  );

  return { resolve };
}

export type SnapResolver = ReturnType<typeof useSnap>['resolve'];
