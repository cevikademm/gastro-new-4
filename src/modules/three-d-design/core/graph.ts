/**
 * Wall graph helpers — turn free-hand wall chains into rooms.
 *
 *  - findCycleThroughWall   after a wall is added, is there now a closed
 *                           loop through it? Returns the TIGHTEST one
 *                           (shortest path a→b avoiding the wall itself).
 *  - cycleIsExistingRoom    does a room already use exactly these walls?
 *  - roomsSplitByChain      a partition chain whose two ends land on the same
 *                           room loop splits that room in two.
 *
 * Pure functions over the normalized model; builders do the mutations.
 */

import type { ProjectDocument, Room, RoomId, Vec2, VertexId, WallId } from './types';
import { distance2, polygonArea, polygonCentroidOf } from './math';
import { isSimplePolygon } from './polygon';
import { pointInPolygon, roomPolygon } from './geometry';
import { walkWallLoop } from './loops';

interface Adj {
  wallId: WallId;
  to: VertexId;
  lengthMm: number;
}

function adjacency(project: ProjectDocument, skipWall?: WallId): Map<VertexId, Adj[]> {
  const adj = new Map<VertexId, Adj[]>();
  for (const w of Object.values(project.walls)) {
    if (w.id === skipWall) continue;
    const a = project.vertices[w.a];
    const b = project.vertices[w.b];
    if (!a || !b) continue;
    const len = distance2(a, b);
    if (len < 1) continue;
    (adj.get(w.a) ?? adj.set(w.a, []).get(w.a)!).push({ wallId: w.id, to: w.b, lengthMm: len });
    (adj.get(w.b) ?? adj.set(w.b, []).get(w.b)!).push({ wallId: w.id, to: w.a, lengthMm: len });
  }
  return adj;
}

/** Dijkstra from `from` to `to` over walls (weight = length). Returns wall ids. */
function shortestWallPath(
  adj: Map<VertexId, Adj[]>,
  from: VertexId,
  to: VertexId,
): WallId[] | null {
  const dist = new Map<VertexId, number>([[from, 0]]);
  const prev = new Map<VertexId, { via: WallId; from: VertexId }>();
  const done = new Set<VertexId>();
  // Small graphs — an O(V²) selection is fine.
  while (true) {
    let cur: VertexId | null = null;
    let best = Infinity;
    for (const [v, d] of dist) {
      if (!done.has(v) && d < best) {
        best = d;
        cur = v;
      }
    }
    if (cur === null) return null;
    if (cur === to) break;
    done.add(cur);
    for (const e of adj.get(cur) ?? []) {
      const nd = best + e.lengthMm;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, { via: e.wallId, from: cur });
      }
    }
  }
  const path: WallId[] = [];
  let v = to;
  while (v !== from) {
    const p = prev.get(v);
    if (!p) return null;
    path.push(p.via);
    v = p.from;
  }
  return path.reverse();
}

/** Polygon (vertex positions in loop order) for an ordered, closed wall list. */
export function loopPolygon(project: ProjectDocument, wallIds: ReadonlyArray<WallId>): Vec2[] | null {
  const steps = walkWallLoop(project, wallIds);
  if (!steps) return null;
  const pts: Vec2[] = [];
  for (const s of steps) {
    const v = project.vertices[s.start];
    if (!v) return null;
    pts.push({ x: v.x, y: v.y });
  }
  return pts;
}

/**
 * Tightest closed loop through `wallId`, or null. The loop is returned in
 * chain order starting with `wallId`. Rejected when the polygon is not simple,
 * is tiny (< 0.05 m²), or would swallow an existing room (its centroid lies
 * inside) — that last case is a deliberate "outer perimeter" and is left to
 * the explicit "create room from walls" action.
 */
export function findCycleThroughWall(project: ProjectDocument, wallId: WallId): WallId[] | null {
  const w = project.walls[wallId];
  if (!w) return null;
  const adj = adjacency(project, wallId);
  const path = shortestWallPath(adj, w.b, w.a);
  if (!path || path.length < 2) return null;
  const loop = [wallId, ...path];
  const poly = loopPolygon(project, loop);
  if (!poly || poly.length < 3) return null;
  if (!isSimplePolygon(poly)) return null;
  if (polygonArea(poly) < 50_000) return null;
  for (const room of Object.values(project.rooms)) {
    const rp = roomPolygon(project, room);
    if (rp.length < 3) continue;
    if (pointInPolygon(polygonCentroidOf(rp), poly) && !sameWallSet(room.wallLoop, loop)) {
      // The candidate contains another room — but if that room shares NO wall
      // with the candidate it is genuinely nested (allowed, e.g. an island
      // partition); only reject when the candidate is the outer hull of it.
      const shares = room.wallLoop.some((id) => loop.includes(id));
      if (shares) return null;
    }
  }
  return loop;
}

function sameWallSet(a: ReadonlyArray<WallId>, b: ReadonlyArray<WallId>): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((id) => s.has(id));
}

/** Id of a room whose loop is exactly this wall set, else null. */
export function cycleIsExistingRoom(project: ProjectDocument, wallIds: ReadonlyArray<WallId>): RoomId | null {
  for (const room of Object.values(project.rooms)) {
    if (sameWallSet(room.wallLoop, wallIds)) return room.id;
  }
  return null;
}

export interface RoomSplit {
  roomId: RoomId;
  /** Walls of the original loop on one side of the chain (chain excluded). */
  arcA: WallId[];
  arcB: WallId[];
}

/**
 * If every wall of `chain` is a loose wall and its two end vertices both lie
 * on the loop of one room, that room can be split along the chain. Returns
 * the two arcs of the loop between the chain's endpoints.
 */
export function roomsSplitByChain(project: ProjectDocument, chain: ReadonlyArray<WallId>): RoomSplit | null {
  if (chain.length === 0) return null;
  const steps = chainEndpoints(project, chain);
  if (!steps) return null;
  const { start, end } = steps;
  if (start === end) return null;
  for (const room of Object.values(project.rooms) as Room[]) {
    if (chain.some((id) => room.wallLoop.includes(id))) continue;
    const loop = walkWallLoop(project, room.wallLoop);
    if (!loop) continue;
    const idxStart = loop.findIndex((s) => s.start === start);
    const idxEnd = loop.findIndex((s) => s.start === end);
    if (idxStart === -1 || idxEnd === -1) continue;
    const n = loop.length;
    // Arc from start→end following the loop, and the complementary arc.
    const arcA: WallId[] = [];
    for (let i = idxStart; i !== idxEnd; i = (i + 1) % n) arcA.push(loop[i].wallId);
    const arcB: WallId[] = [];
    for (let i = idxEnd; i !== idxStart; i = (i + 1) % n) arcB.push(loop[i].wallId);
    if (arcA.length === 0 || arcB.length === 0) continue;
    return { roomId: room.id, arcA, arcB };
  }
  return null;
}

/** Ordered chain → its two free end vertices (walls must form a simple path). */
export function chainEndpoints(
  project: ProjectDocument,
  chain: ReadonlyArray<WallId>,
): { start: VertexId; end: VertexId } | null {
  const count = new Map<VertexId, number>();
  for (const id of chain) {
    const w = project.walls[id];
    if (!w) return null;
    count.set(w.a, (count.get(w.a) ?? 0) + 1);
    count.set(w.b, (count.get(w.b) ?? 0) + 1);
  }
  const ends = [...count.entries()].filter(([, c]) => c === 1).map(([v]) => v);
  if (ends.length !== 2) return null;
  return { start: ends[0], end: ends[1] };
}
