/**
 * Wall bands — per-wall fill polygons with CORRECT JOINS for any thickness
 * mix. Shared by the 2D plan (Konva fill/hatch/outline), the 3D extrusion
 * (each wall body is the same polygon extruded), DXF export and the room
 * containment polygon, so every view agrees by construction.
 *
 * Model
 *   Every wall is the region between two lines parallel to its centre line
 *   (a→b) at ±thickness/2. What differs per wall is how each END is cut:
 *
 *   • free end (vertex touched by one wall)      → square cut
 *   • two walls meeting (L / any angle)          → mitre: both walls end on
 *     the line through the intersection of their offset lines (inner and
 *     outer corner). Works for equal AND different thicknesses.
 *   • collinear continuation (parallel)          → butt: square cuts; a step
 *     appears only when thicknesses differ (correct).
 *   • very acute mitre (> miterLimit·h)          → square cut (bevel-ish) so
 *     nothing spikes off into the distance.
 *   • 3+ walls at a vertex (T / star)            → the same pairwise rule
 *     between angular neighbours; a side whose neighbour is a mitre while the
 *     other side is a square cut gets the square point inserted before the
 *     mitre point, so a through-wall stays a clean rectangle and the branch
 *     ends exactly on its face (no hole, no overlap).
 *
 * Outline: long edges only + free-end caps + butt steps. Mitre seams are NOT
 * drawn (architectural convention: clean corners).
 *
 * All coordinates world mm. `dir` = unit a→b, `normal` = perp2(dir) (LEFT).
 */

import type { ProjectDocument, Room, Vec2, VertexId, Wall, WallId } from './types';
import { dot2, normalize2, perp2, polygonCentroidOf, sub2 } from './math';
import { lineIntersect } from './polygon';
import { walkRoomLoop } from './loops';

/** The minimum a consumer needs to slice a band along its length. */
export interface BandCore {
  a: Vec2;
  dir: Vec2;
  /** Left normal (perp2(dir)). */
  normal: Vec2;
  thicknessMm: number;
  /** End cut at `a`, listed from the RIGHT side to the LEFT side. */
  cutA: Vec2[];
  /** End cut at `b`, listed from the LEFT side to the RIGHT side. */
  cutB: Vec2[];
}

export interface WallBand extends BandCore {
  wallId: WallId;
  b: Vec2;
  lengthMm: number;
  /** Closed fill polygon (world mm): cutA (right→left) + cutB (left→right). */
  polygon: Vec2[];
  /** Left long edge, a-side → b-side. */
  leftEdge: [Vec2, Vec2];
  /** Right long edge, a-side → b-side. */
  rightEdge: [Vec2, Vec2];
  capA: 'free' | 'joined';
  capB: 'free' | 'joined';
}

export interface WallBandsResult {
  bands: Map<WallId, WallBand>;
  /** Exterior outline segments (long edges, free caps, butt steps). */
  outline: Array<[Vec2, Vec2]>;
}

export interface WallBandOptions {
  /** Preview positions (vertex drag) — no document mutation needed. */
  vertexOverride?: Record<string, Vec2>;
  /** Mitre spike limit as a multiple of the larger half-thickness. Default 3. */
  miterLimit?: number;
}

interface End {
  wallId: WallId;
  /** Unit direction pointing OUT of the wall at this vertex. */
  outDir: Vec2;
  /** perp2(outDir) — the side that faces the CCW neighbour. */
  leftOut: Vec2;
  half: number;
  lengthMm: number;
  atA: boolean;
  angle: number;
}

type CornerKind = 'mitre' | 'square';
interface Corner {
  kind: CornerKind;
  p: Vec2;
}

interface WallGeom {
  wall: Wall;
  a: Vec2;
  b: Vec2;
  dir: Vec2;
  normal: Vec2;
  len: number;
  half: number;
}

const add = (p: Vec2, d: Vec2, s: number): Vec2 => ({ x: p.x + d.x * s, y: p.y + d.y * s });
const neg = (d: Vec2): Vec2 => ({ x: -d.x, y: -d.y });
const same = (p: Vec2, q: Vec2): boolean => Math.abs(p.x - q.x) < 1e-3 && Math.abs(p.y - q.y) < 1e-3;

/**
 * Corner between end `i` and its CCW neighbour `j` at vertex `v`.
 * Returns the point for i's leftOut side and for j's rightOut side (equal
 * for a clean mitre, different for a butt/bevel).
 */
function corner(v: Vec2, i: End, j: End, miterLimit: number): { forI: Corner; forJ: Corner } {
  const pI = add(v, i.leftOut, i.half); // square cut on i's leftOut side
  const pJ = add(v, neg(j.leftOut), j.half); // square cut on j's rightOut side
  const m = lineIntersect(pI, i.outDir, pJ, j.outDir);
  if (!m) {
    return { forI: { kind: 'square', p: pI }, forJ: { kind: 'square', p: pJ } };
  }
  const dist = Math.hypot(m.x - v.x, m.y - v.y);
  const limit = miterLimit * Math.max(i.half, j.half);
  const dI = dot2(sub2(m, v), i.outDir);
  const dJ = dot2(sub2(m, v), j.outDir);
  // Spike, or the mitre reaches past the far end of a short wall → square.
  if (dist > limit || dI > i.lengthMm - 1 || dJ > j.lengthMm - 1) {
    return { forI: { kind: 'square', p: pI }, forJ: { kind: 'square', p: pJ } };
  }
  return { forI: { kind: 'mitre', p: m }, forJ: { kind: 'mitre', p: m } };
}

/**
 * Cut polyline at one end, from the RIGHT side to the LEFT side (in terms of
 * that end's outDir: right = −leftOut, left = +leftOut).
 */
function cutPolyline(v: Vec2, e: End, right: Corner, left: Corner): Vec2[] {
  if (right.kind === left.kind) return [right.p, left.p];
  const depth = (p: Vec2) => dot2(sub2(p, v), e.outDir); // >0 = into the wall
  if (right.kind === 'square') {
    // Left side is a mitre while the right is square (T through-wall).
    const leftSq = add(v, e.leftOut, e.half);
    return depth(left.p) > 1e-6 ? [right.p, leftSq, left.p] : [right.p, leftSq];
  }
  // Right side is a mitre while the left is square.
  const rightSq = add(v, neg(e.leftOut), e.half);
  return depth(right.p) > 1e-6 ? [right.p, rightSq, left.p] : [rightSq, left.p];
}

export function wallBandPolygons(
  project: ProjectDocument,
  opts: WallBandOptions = {},
): WallBandsResult {
  const miterLimit = opts.miterLimit ?? 3;
  const override = opts.vertexOverride;
  const vertexPos = (id: VertexId): Vec2 | null => {
    const o = override?.[id];
    if (o) return o;
    const v = project.vertices[id];
    return v ? { x: v.x, y: v.y } : null;
  };

  // 1) Resolve wall geometry.
  const geoms = new Map<WallId, WallGeom>();
  for (const wall of Object.values(project.walls)) {
    const a = vertexPos(wall.a);
    const b = vertexPos(wall.b);
    if (!a || !b) continue;
    const d = sub2(b, a);
    const len = Math.hypot(d.x, d.y);
    if (len < 1) continue;
    const dir = normalize2(d);
    geoms.set(wall.id, { wall, a, b, dir, normal: perp2(dir), len, half: Math.max(1, wall.thickness) / 2 });
  }

  // 2) Ends per vertex, sorted by outgoing angle.
  const endsByVertex = new Map<VertexId, End[]>();
  const pushEnd = (vid: VertexId, e: End) => {
    const list = endsByVertex.get(vid) ?? [];
    list.push(e);
    endsByVertex.set(vid, list);
  };
  for (const g of geoms.values()) {
    const outA = g.dir;
    const outB = neg(g.dir);
    pushEnd(g.wall.a, {
      wallId: g.wall.id, outDir: outA, leftOut: perp2(outA), half: g.half, lengthMm: g.len, atA: true,
      angle: Math.atan2(outA.y, outA.x),
    });
    pushEnd(g.wall.b, {
      wallId: g.wall.id, outDir: outB, leftOut: perp2(outB), half: g.half, lengthMm: g.len, atA: false,
      angle: Math.atan2(outB.y, outB.x),
    });
  }

  // 3) Corners for every end: key `${wallId}:${atA?'a':'b'}` → {left,right}.
  const corners = new Map<string, { left: Corner; right: Corner; free: boolean }>();
  const outline: Array<[Vec2, Vec2]> = [];
  const keyOf = (e: End) => `${e.wallId}:${e.atA ? 'a' : 'b'}`;

  for (const [vid, ends] of endsByVertex) {
    const v = vertexPos(vid);
    if (!v) continue;
    ends.sort((p, q) => p.angle - q.angle);
    const k = ends.length;
    if (k === 1) {
      const e = ends[0];
      const left = add(v, e.leftOut, e.half);
      const right = add(v, neg(e.leftOut), e.half);
      corners.set(keyOf(e), { left: { kind: 'square', p: left }, right: { kind: 'square', p: right }, free: true });
      outline.push([right, left]);
      continue;
    }
    const partial = new Map<string, { left?: Corner; right?: Corner }>();
    for (let idx = 0; idx < k; idx++) {
      const i = ends[idx];
      const j = ends[(idx + 1) % k];
      const c = corner(v, i, j, miterLimit);
      const pi = partial.get(keyOf(i)) ?? {};
      pi.left = c.forI;
      partial.set(keyOf(i), pi);
      const pj = partial.get(keyOf(j)) ?? {};
      pj.right = c.forJ;
      partial.set(keyOf(j), pj);
      // Butt step (collinear, different thickness) is an exterior segment.
      if (c.forI.kind === 'square' && c.forJ.kind === 'square' && !same(c.forI.p, c.forJ.p)) {
        outline.push([c.forI.p, c.forJ.p]);
      }
    }
    for (const e of ends) {
      const p = partial.get(keyOf(e));
      if (!p?.left || !p.right) continue;
      corners.set(keyOf(e), { left: p.left, right: p.right, free: false });
    }
  }

  // 4) Assemble bands.
  const bands = new Map<WallId, WallBand>();
  for (const g of geoms.values()) {
    const endA = endsByVertex.get(g.wall.a)?.find((e) => e.wallId === g.wall.id && e.atA);
    const endB = endsByVertex.get(g.wall.b)?.find((e) => e.wallId === g.wall.id && !e.atA);
    const cA = corners.get(`${g.wall.id}:a`);
    const cB = corners.get(`${g.wall.id}:b`);
    if (!endA || !endB || !cA || !cB) continue;

    // At a: outDir = dir, leftOut = normal → cut right→left = wall right → wall left.
    const cutA = cutPolyline(g.a, endA, cA.right, cA.left);
    // At b: outDir = −dir, leftOut = −normal (= wall RIGHT). cutPolyline gives
    // right(=wall left) → left(=wall right), i.e. wall left → wall right. ✓
    const cutB = cutPolyline(g.b, endB, cB.right, cB.left);

    const aRight = cutA[0];
    const aLeft = cutA[cutA.length - 1];
    const bLeft = cutB[0];
    const bRight = cutB[cutB.length - 1];

    const band: WallBand = {
      wallId: g.wall.id,
      a: g.a,
      b: g.b,
      dir: g.dir,
      normal: g.normal,
      lengthMm: g.len,
      thicknessMm: g.half * 2,
      polygon: [...cutA, ...cutB],
      cutA,
      cutB,
      leftEdge: [aLeft, bLeft],
      rightEdge: [aRight, bRight],
      capA: cA.free ? 'free' : 'joined',
      capB: cB.free ? 'free' : 'joined',
    };
    bands.set(g.wall.id, band);
    outline.push([aLeft, bLeft], [aRight, bRight]);
  }

  return { bands, outline };
}

/** Point on the left/right offset line at distance `u` along a→b. */
export function bandPointAt(band: BandCore, u: number, side: 'left' | 'right'): Vec2 {
  const s = side === 'left' ? band.thicknessMm / 2 : -band.thicknessMm / 2;
  return {
    x: band.a.x + band.dir.x * u + band.normal.x * s,
    y: band.a.y + band.dir.y * u + band.normal.y * s,
  };
}

/**
 * Polygon of the wall band restricted to `[uStart, uEnd]` along a→b. When
 * `atA` / `atB` is true the real end cut is used instead of a square cut at
 * that side (used by the 3D builder to split a wall around openings).
 */
export function wallPiecePolygon(
  band: BandCore,
  uStart: number,
  uEnd: number,
  atA: boolean,
  atB: boolean,
): Vec2[] {
  const start = atA ? band.cutA : [bandPointAt(band, uStart, 'right'), bandPointAt(band, uStart, 'left')];
  const end = atB ? band.cutB : [bandPointAt(band, uEnd, 'left'), bandPointAt(band, uEnd, 'right')];
  return [...start, ...end];
}

/**
 * Inner polygon of a room: the room-side long edge of every wall in loop
 * order. Consecutive walls share their inner mitre point, so the polygon is
 * exact — no offsetting. Null when the loop cannot be walked.
 */
export function roomInnerPolygon(
  project: ProjectDocument,
  room: Room,
  bands: Map<WallId, WallBand>,
): Vec2[] | null {
  const steps = walkRoomLoop(project, room);
  if (!steps) return null;
  const centre: Vec2[] = [];
  for (const s of steps) {
    const v = project.vertices[s.start];
    if (v) centre.push({ x: v.x, y: v.y });
  }
  if (centre.length < 3) return null;
  const c = polygonCentroidOf(centre);
  const out: Vec2[] = [];
  for (const s of steps) {
    const band = bands.get(s.wallId);
    if (!band) return null;
    const mid = { x: (band.a.x + band.b.x) / 2, y: (band.a.y + band.b.y) / 2 };
    const roomOnLeft = dot2(band.normal, sub2(c, mid)) > 0;
    const edge = roomOnLeft ? band.leftEdge : band.rightEdge; // a-side → b-side
    // Emit the edge point that sits at this step's START vertex.
    out.push(s.forward ? edge[0] : edge[1]);
  }
  return out;
}
