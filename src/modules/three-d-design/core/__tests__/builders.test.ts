import { describe, expect, it } from 'vitest';
import type { ProjectDocument, RoomId, VertexId, WallId } from '../types';
import {
  addWallBetween,
  createPolygonRoom,
  createRoomFromWalls,
  dissolveVertex,
  getOrCreateVertex,
  removeRoom,
  removeWallSafe,
  splitWall,
} from '../builders';
import { roomPolygon, roomVertexIds, walkRoomLoop } from '../geometry';
import { assertProjectInvariants, isProjectValid } from '../invariants';
import { normalizeDocument } from '../migrate';
import { polygonSignedArea } from '../math';

function emptyDoc(): ProjectDocument {
  return {
    id: 'p',
    name: 't',
    units: 'mm',
    vertices: {},
    walls: {},
    rooms: {},
    openings: {},
    equipment: {},
    order: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const SQUARE = [
  { x: 0, y: 0 },
  { x: 4000, y: 0 },
  { x: 4000, y: 3000 },
  { x: 0, y: 3000 },
];

describe('walkRoomLoop / roomPolygon (direction-agnostic loops)', () => {
  it('walks a loop whose walls are stored in mixed directions', () => {
    const d = emptyDoc();
    const v = SQUARE.map((p) => getOrCreateVertex(d, p));
    // w0: v0→v1, w1: v2→v1 (REVERSED), w2: v2→v3, w3: v0→v3 (REVERSED)
    const w0 = addWallBetween(d, v[0], v[1]);
    const w1 = addWallBetween(d, v[2], v[1]);
    const w2 = addWallBetween(d, v[2], v[3]);
    const w3 = addWallBetween(d, v[0], v[3]);
    const rid = createRoomFromWalls(d, [w0, w1, w2, w3]);
    const room = d.rooms[rid];
    const steps = walkRoomLoop(d, room);
    expect(steps).not.toBeNull();
    expect(steps!.map((s) => s.forward)).toContain(false);
    expect(roomVertexIds(d, room).length).toBe(4);
    expect(polygonSignedArea(roomPolygon(d, room))).toBeGreaterThan(0); // stored CCW
    assertProjectInvariants(d);
  });

  it('returns null for a broken chain', () => {
    const d = emptyDoc();
    const v = SQUARE.map((p) => getOrCreateVertex(d, p));
    const w0 = addWallBetween(d, v[0], v[1]);
    const w1 = addWallBetween(d, v[1], v[2]);
    const w2 = addWallBetween(d, v[3], v[0]); // gap between v2 and v3
    d.rooms['r'] = {
      id: 'r' as RoomId,
      type: 'room',
      name: 'x',
      wallLoop: [w0, w1, w2],
      closed: true,
      floorHeight: 0,
      ceilingHeight: 3000,
      tags: [],
    };
    expect(walkRoomLoop(d, d.rooms['r'])).toBeNull();
    expect(isProjectValid(d)).toBe(false);
  });
});

describe('splitWall', () => {
  it('splices the new wall on the correct side for a reversed traversal and moves openings', () => {
    const d = emptyDoc();
    const rid = createPolygonRoom(d, SQUARE);
    const room = d.rooms[rid];
    // Reverse the whole loop order + wall directions to simulate a v1 doc that
    // was later re-oriented: walk still succeeds.
    const bottom = room.wallLoop[0]; // v0→v1 (4000 mm)
    d.openings['o1'] = {
      id: 'o1' as never,
      type: 'opening',
      kind: 'door',
      wallId: bottom,
      offset: 3000,
      width: 900,
      height: 2100,
      sillHeight: 0,
    };
    d.order.push('o1');
    const { newWallId } = splitWall(d, bottom, 0.5);
    expect(walkRoomLoop(d, d.rooms[rid])).not.toBeNull();
    expect(d.rooms[rid].wallLoop.length).toBe(5);
    // Door centre (3450) is beyond the split (2000) → migrated + rebased to
    // 1000, then clamped to 975 so it stays clear of the corner join at the far
    // end (50 mm + the neighbour wall's 75 mm half-thickness).
    expect(d.openings['o1'].wallId).toBe(newWallId);
    const op = d.openings['o1'];
    expect(op.offset).toBe(975);
    expect(op.offset + op.width + 125).toBeLessThanOrEqual(2000);
    assertProjectInvariants(d);
  });

  it('keeps the loop valid when the split wall is traversed b→a', () => {
    const d = emptyDoc();
    const v = SQUARE.map((p) => getOrCreateVertex(d, p));
    const w0 = addWallBetween(d, v[0], v[1]);
    const w1 = addWallBetween(d, v[2], v[1]); // reversed
    const w2 = addWallBetween(d, v[2], v[3]);
    const w3 = addWallBetween(d, v[3], v[0]);
    const rid = createRoomFromWalls(d, [w0, w1, w2, w3]);
    splitWall(d, w1, 0.3);
    expect(walkRoomLoop(d, d.rooms[rid])).not.toBeNull();
    expect(d.rooms[rid].wallLoop.length).toBe(5);
    assertProjectInvariants(d);
  });
});

describe('createRoomFromWalls', () => {
  it('rejects a chain that does not close', () => {
    const d = emptyDoc();
    const v = SQUARE.map((p) => getOrCreateVertex(d, p));
    const w0 = addWallBetween(d, v[0], v[1]);
    const w1 = addWallBetween(d, v[1], v[2]);
    const w2 = addWallBetween(d, v[2], v[3]);
    expect(() => createRoomFromWalls(d, [w0, w1, w2])).toThrow();
  });

  it('rejects a vertex with degree 3 inside the subset', () => {
    const d = emptyDoc();
    const v = SQUARE.map((p) => getOrCreateVertex(d, p));
    const mid = getOrCreateVertex(d, { x: 2000, y: 1500 });
    const w0 = addWallBetween(d, v[0], v[1]);
    const w1 = addWallBetween(d, v[1], v[2]);
    const w2 = addWallBetween(d, v[2], v[3]);
    const w3 = addWallBetween(d, v[3], v[0]);
    const spur = addWallBetween(d, v[0], mid);
    expect(() => createRoomFromWalls(d, [w0, w1, w2, w3, spur])).toThrow();
    expect(createRoomFromWalls(d, [w0, w1, w2, w3])).toBeTruthy();
    assertProjectInvariants(d);
  });

  it('allows two rooms to share one partition wall', () => {
    const d = emptyDoc();
    const v = SQUARE.map((p) => getOrCreateVertex(d, p));
    const mA = getOrCreateVertex(d, { x: 2000, y: 0 });
    const mB = getOrCreateVertex(d, { x: 2000, y: 3000 });
    const left = [
      addWallBetween(d, v[0], mA),
      addWallBetween(d, mA, mB), // partition
      addWallBetween(d, mB, v[3]),
      addWallBetween(d, v[3], v[0]),
    ];
    const rightRoom = [
      addWallBetween(d, mA, v[1]),
      addWallBetween(d, v[1], v[2]),
      addWallBetween(d, v[2], mB),
      left[1], // shared
    ];
    const r1 = createRoomFromWalls(d, left);
    const r2 = createRoomFromWalls(d, rightRoom);
    expect(r1).not.toBe(r2);
    assertProjectInvariants(d);
    // Deleting room 1 keeps the shared partition for room 2.
    removeRoom(d, r1);
    expect(d.walls[left[1]]).toBeDefined();
    expect(walkRoomLoop(d, d.rooms[r2])).not.toBeNull();
    assertProjectInvariants(d);
  });
});

describe('removeWallSafe', () => {
  it('dissolves the room, keeps the other walls, prunes orphan vertices', () => {
    const d = emptyDoc();
    const rid = createPolygonRoom(d, SQUARE);
    const wall = d.rooms[rid].wallLoop[1];
    d.openings['o'] = {
      id: 'o' as never,
      type: 'opening',
      kind: 'window',
      wallId: wall,
      offset: 500,
      width: 1000,
      height: 1000,
      sillHeight: 900,
    };
    d.order.push('o');
    const { dissolvedRooms } = removeWallSafe(d, wall);
    expect(dissolvedRooms).toEqual([rid]);
    expect(d.rooms[rid]).toBeUndefined();
    expect(Object.keys(d.walls).length).toBe(3);
    expect(Object.keys(d.openings).length).toBe(0);
    expect(Object.keys(d.vertices).length).toBe(4); // all 4 still used by remaining walls
    assertProjectInvariants(d);
  });

  it('deleting a loose wall prunes its orphan vertices', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 1000, y: 0 });
    const w = addWallBetween(d, a, b);
    removeWallSafe(d, w);
    expect(Object.keys(d.vertices).length).toBe(0);
    expect(d.order.length).toBe(0);
  });
});

describe('dissolveVertex', () => {
  it('merges two walls at a corner and keeps the loop closed', () => {
    const d = emptyDoc();
    const rid = createPolygonRoom(d, [...SQUARE, { x: 0, y: 1500 }]); // 5-gon
    const vid = roomVertexIds(d, d.rooms[rid])[4] as VertexId;
    expect(dissolveVertex(d, vid)).toBe(true);
    expect(d.rooms[rid].wallLoop.length).toBe(4);
    assertProjectInvariants(d);
  });
});

describe('normalizeDocument', () => {
  it('upgrades a v1 document and drops broken references', () => {
    const d = emptyDoc();
    createPolygonRoom(d, SQUARE);
    const raw = JSON.parse(JSON.stringify(d)) as ProjectDocument;
    // Corrupt: an opening on a missing wall, a wall with a missing vertex, a
    // duplicate + stray id in order, and a room referencing a missing wall.
    raw.openings['ghost'] = {
      id: 'ghost' as never,
      type: 'opening',
      kind: 'door',
      wallId: 'nope' as WallId,
      offset: 0,
      width: 900,
      height: 2100,
      sillHeight: 0,
    };
    raw.walls['dangling'] = {
      id: 'dangling' as WallId,
      type: 'wall',
      wallType: 'interior',
      a: 'missing' as VertexId,
      b: 'missing2' as VertexId,
      thickness: 150,
      height: 3000,
    };
    raw.order.push(raw.order[0], 'stray');
    const roomId = Object.keys(raw.rooms)[0];
    raw.rooms['broken'] = { ...raw.rooms[roomId], id: 'broken' as RoomId, wallLoop: ['nope' as WallId] };
    const out = normalizeDocument(raw);
    expect(out.schemaVersion).toBe(2);
    expect(out.openings['ghost']).toBeUndefined();
    expect(out.walls['dangling']).toBeUndefined();
    expect(out.rooms['broken']).toBeUndefined();
    expect(out.rooms[roomId]).toBeDefined();
    expect(new Set(out.order).size).toBe(out.order.length);
    expect(isProjectValid(out)).toBe(true);
    // Idempotent
    expect(JSON.stringify(normalizeDocument(JSON.parse(JSON.stringify(out))))).toBe(JSON.stringify(out));
  });
});
