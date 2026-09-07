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
  EntityId,
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
import { distance2, polygonArea, polygonSignedArea } from './math';
import { newId } from './id';
import { isSimplePolygon } from './polygon';
import { walkRoomLoop } from './loops';
import { clampOpeningsOnWalls } from './openings';

// ── Shared draft helpers ────────────────────────────────────────────────────

/** Remove `id` from `draft.order` (no-op if absent). */
export function removeFromOrder(draft: ProjectDocument, id: EntityId): void {
  const idx = draft.order.indexOf(id);
  if (idx !== -1) draft.order.splice(idx, 1);
}

/** Delete every opening hosted on `wallId` (cascade helper). */
export function removeOpeningsOnWall(draft: ProjectDocument, wallId: WallId): void {
  for (const o of Object.values(draft.openings)) {
    if (o.wallId === wallId) {
      delete draft.openings[o.id];
      removeFromOrder(draft, o.id);
    }
  }
}

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
  removeFromOrder(draft, id);
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
 *  - Room loops that contained the original get the new wall spliced in on
 *    the correct side of the original for the direction that room traverses
 *    it (loops are direction-agnostic — see geometry.walkRoomLoop).
 *  - Openings whose centre lies beyond the split point migrate to the new
 *    wall with a rebased offset; everything is re-clamped afterwards.
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

  // Record each room's traversal direction BEFORE mutating (walk needs a
  // valid loop).
  const forwardByRoom = new Map<RoomId, boolean>();
  for (const room of Object.values(draft.rooms)) {
    if (!room.wallLoop.includes(wallId)) continue;
    const step = walkRoomLoop(draft, room)?.find((s) => s.wallId === wallId);
    forwardByRoom.set(room.id, step ? step.forward : true);
  }

  const clamped = Math.max(0, Math.min(1, t));
  const totalLen = distance2(a, b);
  const splitLen = totalLen * clamped;
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

  // Openings beyond the split point move to the new wall.
  for (const op of Object.values(draft.openings)) {
    if (op.wallId !== wallId) continue;
    if (op.offset + op.width / 2 >= splitLen) {
      op.wallId = newWallId;
      op.offset = op.offset - splitLen;
    }
  }
  clampOpeningsOnWalls(draft, [wallId, newWallId]);

  // Splice the new wall into every room loop that referenced the original,
  // after it when traversed a→b, before it when traversed b→a.
  for (const room of Object.values(draft.rooms)) {
    const idx = room.wallLoop.indexOf(wallId);
    if (idx === -1) continue;
    const forward = forwardByRoom.get(room.id) ?? true;
    room.wallLoop.splice(forward ? idx + 1 : idx, 0, newWallId);
  }

  return { newVertexId, newWallId };
}

/**
 * Delete a wall SAFELY: openings on it go, every room whose loop used it is
 * dissolved (its other walls stay as loose walls — nothing else is lost), then
 * the wall and any now-orphan vertices are removed. Never leaves a room with
 * a broken loop (the old removeWall spliced the loop and violated I-2).
 */
export function removeWallSafe(
  draft: ProjectDocument,
  wallId: WallId,
): { dissolvedRooms: RoomId[] } {
  const w = draft.walls[wallId];
  if (!w) return { dissolvedRooms: [] };
  removeOpeningsOnWall(draft, wallId);
  const dissolvedRooms: RoomId[] = [];
  for (const room of Object.values(draft.rooms)) {
    if (room.wallLoop.includes(wallId)) {
      removeRoom(draft, room.id, { keepWalls: true });
      dissolvedRooms.push(room.id);
    }
  }
  delete draft.walls[wallId];
  removeFromOrder(draft, wallId);
  pruneOrphanVertex(draft, w.a);
  pruneOrphanVertex(draft, w.b);
  return { dissolvedRooms };
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
  removeOpeningsOnWall(draft, w2.id);
  delete draft.walls[w2.id];
  removeFromOrder(draft, w2.id);
  // w1 uzadı → üzerindeki açıklıklar hâlâ geçerli aralıkta mı?
  clampOpeningsOnWalls(draft, [w1.id]);

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

export interface CreateRoomFromWallsOpts {
  name?: string;
  floorHeight?: number;
  tags?: string[];
}

/**
 * Build a Room from EXISTING walls that already form one closed loop (e.g. a
 * free-hand wall chain that returned to its start, or a cycle found by
 * core/graph.ts). Walls are referenced as-is — never flipped — so a wall can
 * belong to two rooms (a shared partition).
 *
 * Throws on invalid input: fewer than 3 walls, a vertex of the subset not
 * touched by exactly two of its walls, more than one loop, a self-intersecting
 * polygon, or a degenerate area (< 0.05 m²). Callers pre-validate for UI.
 */
export function createRoomFromWalls(
  draft: ProjectDocument,
  wallIds: ReadonlyArray<WallId>,
  opts: CreateRoomFromWallsOpts = {},
): RoomId {
  const unique = Array.from(new Set(wallIds));
  if (unique.length < 3) throw new Error('createRoomFromWalls: need ≥ 3 walls');
  const walls: Wall[] = unique.map((id) => {
    const w = draft.walls[id];
    if (!w) throw new Error(`createRoomFromWalls: wall ${id} not found`);
    return w;
  });

  // Every vertex touched by the subset must have degree exactly 2 within it.
  const incident = new Map<VertexId, WallId[]>();
  for (const w of walls) {
    for (const v of [w.a, w.b]) {
      const list = incident.get(v) ?? [];
      list.push(w.id);
      incident.set(v, list);
    }
  }
  for (const [v, list] of incident) {
    if (list.length !== 2) {
      throw new Error(`createRoomFromWalls: vertex ${v} touched by ${list.length} walls (need 2)`);
    }
  }

  // Walk the chain from walls[0] (a→b) and collect vertices in loop order.
  const first = walls[0];
  const ordered: WallId[] = [first.id];
  const used = new Set<WallId>([first.id]);
  const vertexIds: VertexId[] = [first.a];
  const startV = first.a;
  let cur = first.b;
  while (cur !== startV) {
    vertexIds.push(cur);
    const nextId = (incident.get(cur) ?? []).find((id) => !used.has(id));
    if (!nextId) throw new Error('createRoomFromWalls: chain does not close');
    const w = draft.walls[nextId]!;
    ordered.push(nextId);
    used.add(nextId);
    cur = w.a === cur ? w.b : w.a;
    if (ordered.length > walls.length) throw new Error('createRoomFromWalls: runaway walk');
  }
  if (ordered.length !== walls.length) {
    throw new Error('createRoomFromWalls: walls form more than one loop');
  }

  const points: Vec2[] = vertexIds.map((id) => {
    const v = draft.vertices[id];
    if (!v) throw new Error(`createRoomFromWalls: missing vertex ${id}`);
    return { x: v.x, y: v.y };
  });
  if (!isSimplePolygon(points)) throw new Error('createRoomFromWalls: polygon self-intersects');
  if (polygonArea(points) < 50_000) throw new Error('createRoomFromWalls: area too small');

  // Store CCW so downstream orientation assumptions hold.
  const loop = polygonSignedArea(points) < 0 ? [...ordered].reverse() : ordered;
  const ceiling = Math.max(...walls.map((w) => w.height));

  const id = newId('r') as RoomId;
  const room: Room = {
    id,
    type: 'room',
    name: opts.name ?? `Room ${Object.keys(draft.rooms).length + 1}`,
    wallLoop: loop,
    closed: true,
    floorHeight: opts.floorHeight ?? 0,
    ceilingHeight: Number.isFinite(ceiling) ? ceiling : DEFAULT_WALL_HEIGHT_MM,
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
    // Paylaşılan duvar (başka bir odanın döngüsünde de olan) SİLİNMEZ — yalnız
    // bu odaya ait duvarlar ve üzerlerindeki açıklıklar gider.
    const sharedWith = new Set<WallId>();
    for (const other of Object.values(draft.rooms)) {
      if (other.id === roomId) continue;
      for (const wid of other.wallLoop) sharedWith.add(wid);
    }
    const verticesUsed = new Set<VertexId>();
    for (const wid of room.wallLoop) {
      if (sharedWith.has(wid)) continue;
      const w = draft.walls[wid];
      if (w) {
        verticesUsed.add(w.a);
        verticesUsed.add(w.b);
      }
      removeOpeningsOnWall(draft, wid);
      delete draft.walls[wid];
      removeFromOrder(draft, wid);
    }
    // Drop now-orphan vertices.
    for (const vid of verticesUsed) pruneOrphanVertex(draft, vid);
  }

  delete draft.rooms[roomId];
  removeFromOrder(draft, roomId);
}
