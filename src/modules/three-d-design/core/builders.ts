/**
 * Mutating builders that operate on a ProjectDocument DRAFT (the one passed
 * to `useProjectStore.update(d => …)`). They always preserve schema invariants.
 *
 * Public surface
 *   getOrCreateVertex(draft, point, mergeMm) → VertexId
 *   addWallBetween(draft, aId, bId, opts)    → WallId
 *   createPolygonRoom(draft, points, opts)   → RoomId
 *   splitWall(draft, wallId, t)              → { newVertexId, newWallId }
 *   moveVertex(draft, vertexId, point)       → void
 *   removeRoom(draft, roomId, { keepWalls? }) → void
 *
 * All point inputs are mm in world space.
 */

import type {
  ProjectDocument,
  Room,
  RoomId,
  Vec2,
  Vertex,
  VertexId,
  Wall,
  WallId,
  WallType,
} from './types';
import { distance2 } from './math';
import { newId } from './id';

// ── Defaults that 2D / 3D both rely on ──────────────────────────────────────
export const DEFAULT_WALL_THICKNESS_MM = 150; // 15 cm
export const DEFAULT_WALL_HEIGHT_MM = 3000;   // 3 m (per spec)
export const DEFAULT_VERTEX_MERGE_MM = 5;     // 5 mm — sub-grid merge

// ── Vertex ──────────────────────────────────────────────────────────────────

/**
 * Find a vertex within `mergeMm` of the point, or create a new one.
 * Returns the canonical vertex id. Use this whenever you'd otherwise create
 * a duplicate corner.
 */
export function getOrCreateVertex(
  draft: ProjectDocument,
  point: Vec2,
  mergeMm: number = DEFAULT_VERTEX_MERGE_MM,
): VertexId {
  for (const v of Object.values(draft.vertices)) {
    if (distance2(v, point) <= mergeMm) return v.id;
  }
  const id = newId('v') as VertexId;
  const vertex: Vertex = { id, type: 'vertex', x: point.x, y: point.y };
  draft.vertices[id] = vertex;
  draft.order.push(id);
  return id;
}

export function moveVertex(draft: ProjectDocument, id: VertexId, to: Vec2): void {
  const v = draft.vertices[id];
  if (!v) return;
  v.x = to.x;
  v.y = to.y;
}

/**
 * Drop a vertex IF nothing references it. Walls/rooms aren't touched.
 * Use after mutations that may have orphaned vertices.
 */
export function pruneOrphanVertex(draft: ProjectDocument, id: VertexId): void {
  for (const w of Object.values(draft.walls)) {
    if (w.a === id || w.b === id) return;
  }
  delete draft.vertices[id];
  const idx = draft.order.indexOf(id);
  if (idx !== -1) draft.order.splice(idx, 1);
}

// ── Wall ────────────────────────────────────────────────────────────────────

export interface AddWallOpts {
  wallType?: WallType;
  thickness?: number;
  height?: number;
}

export function addWallBetween(
  draft: ProjectDocument,
  a: VertexId,
  b: VertexId,
  opts: AddWallOpts = {},
): WallId {
  const id = newId('w') as WallId;
  const wall: Wall = {
    id,
    type: 'wall',
    wallType: opts.wallType ?? 'interior',
    a,
    b,
    thickness: opts.thickness ?? DEFAULT_WALL_THICKNESS_MM,
    height: opts.height ?? DEFAULT_WALL_HEIGHT_MM,
  };
  draft.walls[id] = wall;
  draft.order.push(id);
  return id;
}

/**
 * Insert a vertex on the wall at parameter t (0..1) from a→b, replacing the
 * wall with two consecutive walls. Returns the new vertex + the second wall.
 *
 * Updates any room.wallLoop that contained the original wall by splicing in
 * the new wall id immediately after the original.
 */
export function splitWall(
  draft: ProjectDocument,
  wallId: WallId,
  t: number,
): { newVertexId: VertexId; newWallId: WallId } {
  const original = draft.walls[wallId];
  if (!original) {
    throw new Error(`splitWall: wall ${wallId} not found`);
  }
  const a = draft.vertices[original.a];
  const b = draft.vertices[original.b];
  if (!a || !b) throw new Error(`splitWall: missing vertex on ${wallId}`);

  const clamped = Math.max(0, Math.min(1, t));
  const newPoint: Vec2 = {
    x: a.x + (b.x - a.x) * clamped,
    y: a.y + (b.y - a.y) * clamped,
  };
  const newVertexId = getOrCreateVertex(draft, newPoint);

  // Original wall now ends at the new vertex; second wall continues to b.
  const oldEnd = original.b;
  original.b = newVertexId;
  const newWallId = addWallBetween(draft, newVertexId, oldEnd, {
    wallType: original.wallType,
    thickness: original.thickness,
    height: original.height,
  });

  // Splice the new wall into every room loop that referenced the original.
  for (const room of Object.values(draft.rooms)) {
    const idx = room.wallLoop.indexOf(wallId);
    if (idx === -1) continue;
    room.wallLoop.splice(idx + 1, 0, newWallId);
  }

  return { newVertexId, newWallId };
}

/**
 * splitWall'un TERSİ: bir köşeyi (vertex) çözer — o köşeyi paylaşan İKİ duvarı
 * tek duvara birleştirir. Köşe ekle/sil + taşı ile oda yeniden şekillendirilir
 * (L-şekli, çentik = "alan çıkarma", çıkıntı = "alan ekleme").
 *
 * Oda loop'unun yönünü ve kapalılığını (I-2) korur. Köşe tam 2 duvarla
 * paylaşılmıyorsa veya işlem üçgen odayı bozacaksa hiçbir şey yapmaz → false.
 */
export function dissolveVertex(draft: ProjectDocument, vid: VertexId): boolean {
  const incident = Object.values(draft.walls).filter((w) => w.a === vid || w.b === vid);
  if (incident.length !== 2) return false;
  const [w1, w2] = incident;
  const otherOf = (w: Wall) => (w.a === vid ? w.b : w.a);
  const keepEnd = otherOf(w1);
  const mergeEnd = otherOf(w2);
  if (keepEnd === mergeEnd) return false; // dejenere — iki duvar aynı iki köşeyi paylaşıyor

  // Üçgen odayı bozma: 3 duvarlı bir odanın köşesi çözülemez (2 duvar kalırdı).
  for (const room of Object.values(draft.rooms)) {
    if (
      room.wallLoop.length <= 3 &&
      room.wallLoop.includes(w1.id) &&
      room.wallLoop.includes(w2.id)
    ) {
      return false;
    }
  }

  // w1'i, vid'in olduğu ucundan mergeEnd'e uzat (loop yönünü korur).
  if (w1.b === vid) w1.b = mergeEnd;
  else w1.a = mergeEnd;

  // w2 + üzerindeki açıklıkları (kapı/pencere) kaldır.
  for (const o of Object.values(draft.openings)) {
    if (o.wallId === w2.id) {
      delete draft.openings[o.id];
      const oi = draft.order.indexOf(o.id);
      if (oi !== -1) draft.order.splice(oi, 1);
    }
  }
  delete draft.walls[w2.id];
  const wi = draft.order.indexOf(w2.id);
  if (wi !== -1) draft.order.splice(wi, 1);

  // Oda loop'larından w2'yi çıkar (w1 kalır, artık mergeEnd'e kadar uzanır).
  for (const room of Object.values(draft.rooms)) {
    const idx = room.wallLoop.indexOf(w2.id);
    if (idx !== -1) room.wallLoop.splice(idx, 1);
  }

  pruneOrphanVertex(draft, vid);
  return true;
}

// ── Room ────────────────────────────────────────────────────────────────────

export interface CreatePolygonRoomOpts {
  name?: string;
  wallType?: WallType;
  thickness?: number;
  height?: number;
  /** Vertex merge tolerance (mm) for deduplication. */
  mergeMm?: number;
  floorHeight?: number;
  ceilingHeight?: number;
  tags?: string[];
}

/**
 * Build a closed polygonal room from an ordered list of mm points.
 *
 * Behaviour
 *  - Vertex deduplication: each input point reuses an existing vertex if one
 *    sits within `mergeMm`; otherwise a new vertex is created.
 *  - The closing edge (last → first) is always added — invariant I-2.
 *  - Returns the new room id; callers can re-read draft.rooms[id] for the
 *    full record.
 */
export function createPolygonRoom(
  draft: ProjectDocument,
  points: ReadonlyArray<Vec2>,
  opts: CreatePolygonRoomOpts = {},
): RoomId {
  if (points.length < 3) {
    throw new Error('createPolygonRoom: need ≥ 3 points');
  }
  const merge = opts.mergeMm ?? DEFAULT_VERTEX_MERGE_MM;
  const wallOpts: AddWallOpts = {
    wallType: opts.wallType ?? 'interior',
    thickness: opts.thickness ?? DEFAULT_WALL_THICKNESS_MM,
    height: opts.height ?? DEFAULT_WALL_HEIGHT_MM,
  };

  // 1) Resolve every point to a vertex id (dedupe against existing).
  const vertexIds: VertexId[] = points.map((p) => getOrCreateVertex(draft, p, merge));

  // 2) Build walls connecting consecutive vertices (loop closes back to [0]).
  const wallIds: WallId[] = [];
  const n = vertexIds.length;
  for (let i = 0; i < n; i++) {
    const a = vertexIds[i];
    const b = vertexIds[(i + 1) % n];
    if (a === b) continue; // collapsed pair — skip the degenerate wall
    wallIds.push(addWallBetween(draft, a, b, wallOpts));
  }
  if (wallIds.length < 3) {
    throw new Error('createPolygonRoom: < 3 unique walls after dedup');
  }

  // 3) Compose the room.
  const id = newId('r') as RoomId;
  const room: Room = {
    id,
    type: 'room',
    name: opts.name ?? `Room ${Object.keys(draft.rooms).length + 1}`,
    wallLoop: wallIds,
    closed: true,
    floorHeight: opts.floorHeight ?? 0,
    ceilingHeight: opts.ceilingHeight ?? wallOpts.height!,
    tags: opts.tags ?? [],
  };
  draft.rooms[id] = room;
  draft.order.push(id);
  return id;
}

export interface RemoveRoomOpts {
  /** If true, walls remain in the project (orphaned). Default false. */
  keepWalls?: boolean;
}

export function removeRoom(
  draft: ProjectDocument,
  roomId: RoomId,
  opts: RemoveRoomOpts = {},
): void {
  const room = draft.rooms[roomId];
  if (!room) return;

  if (!opts.keepWalls) {
    const wallSet = new Set<WallId>(room.wallLoop);
    // Bu odanın KENDİ duvarları üzerindeki açıklıkları (kapı/pencere) da kaldır —
    // aksi halde silinen duvara referanslı yetim açıklık kalırdı.
    for (const o of Object.values(draft.openings)) {
      if (wallSet.has(o.wallId as WallId)) {
        delete draft.openings[o.id];
        const oi = draft.order.indexOf(o.id);
        if (oi !== -1) draft.order.splice(oi, 1);
      }
    }
    const verticesUsed = new Set<VertexId>();
    for (const wid of room.wallLoop) {
      const w = draft.walls[wid];
      if (w) {
        verticesUsed.add(w.a);
        verticesUsed.add(w.b);
      }
      delete draft.walls[wid];
      const idx = draft.order.indexOf(wid);
      if (idx !== -1) draft.order.splice(idx, 1);
    }
    // Drop now-orphan vertices.
    for (const vid of verticesUsed) pruneOrphanVertex(draft, vid);
  }

  delete draft.rooms[roomId];
  const idx = draft.order.indexOf(roomId);
  if (idx !== -1) draft.order.splice(idx, 1);
}
