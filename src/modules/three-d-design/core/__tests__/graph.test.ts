import { describe, expect, it } from 'vitest';
import type { ProjectDocument } from '../types';
import { addWallBetween, createPolygonRoom, createRoomFromWalls, getOrCreateVertex, removeRoom, splitWall } from '../builders';
import { cycleIsExistingRoom, findCycleThroughWall, roomsSplitByChain } from '../graph';
import { assertProjectInvariants } from '../invariants';
import { walkRoomLoop } from '../loops';

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

describe('findCycleThroughWall', () => {
  it('finds the loop when a free-hand chain returns to its start', () => {
    const d = emptyDoc();
    const v0 = getOrCreateVertex(d, { x: 0, y: 0 });
    const v1 = getOrCreateVertex(d, { x: 4000, y: 0 });
    const v2 = getOrCreateVertex(d, { x: 4000, y: 3000 });
    const v3 = getOrCreateVertex(d, { x: 0, y: 3000 });
    addWallBetween(d, v0, v1);
    addWallBetween(d, v1, v2);
    addWallBetween(d, v2, v3);
    expect(findCycleThroughWall(d, addWallBetween(d, v3, v0))).toHaveLength(4);
  });

  it('returns null for an open chain', () => {
    const d = emptyDoc();
    const v0 = getOrCreateVertex(d, { x: 0, y: 0 });
    const v1 = getOrCreateVertex(d, { x: 4000, y: 0 });
    const v2 = getOrCreateVertex(d, { x: 4000, y: 3000 });
    addWallBetween(d, v0, v1);
    expect(findCycleThroughWall(d, addWallBetween(d, v1, v2))).toBeNull();
  });

  it('picks the tight face, not the long way around', () => {
    const d = emptyDoc();
    // Big rectangle + a partition across the middle: the partition closes two
    // faces; the shortest cycle through it has 4 walls, not 6.
    const rid = createPolygonRoom(d, [
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
      { x: 6000, y: 3000 },
      { x: 0, y: 3000 },
    ]);
    removeRoom(d, rid, { keepWalls: true });
    const loop = Object.values(d.walls);
    const top = loop.find((w) => d.vertices[w.a].y === 0 && d.vertices[w.b].y === 0)!;
    const bottom = loop.find((w) => d.vertices[w.a].y === 3000 && d.vertices[w.b].y === 3000)!;
    const { newVertexId: mTop } = splitWall(d, top.id, 0.5);
    const { newVertexId: mBot } = splitWall(d, bottom.id, 0.5);
    const partition = addWallBetween(d, mTop, mBot);
    const cycle = findCycleThroughWall(d, partition);
    expect(cycle).not.toBeNull();
    expect(cycle!.length).toBe(4);
    const rid2 = createRoomFromWalls(d, cycle!);
    expect(walkRoomLoop(d, d.rooms[rid2])).not.toBeNull();
    assertProjectInvariants(d);
  });

  it('cycleIsExistingRoom recognises the same wall set in any order', () => {
    const d = emptyDoc();
    const rid = createPolygonRoom(d, [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ]);
    const ids = [...d.rooms[rid].wallLoop].reverse();
    expect(cycleIsExistingRoom(d, ids)).toBe(rid);
    expect(cycleIsExistingRoom(d, ids.slice(1))).toBeNull();
  });
});

describe('roomsSplitByChain', () => {
  it('splits a room whose loop hosts both chain endpoints', () => {
    const d = emptyDoc();
    const rid = createPolygonRoom(d, [
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
      { x: 6000, y: 3000 },
      { x: 0, y: 3000 },
    ]);
    const room = d.rooms[rid];
    const top = room.wallLoop.find((id) => d.vertices[d.walls[id].a].y === 0 && d.vertices[d.walls[id].b].y === 0)!;
    const bottom = room.wallLoop.find((id) => d.vertices[d.walls[id].a].y === 3000 && d.vertices[d.walls[id].b].y === 3000)!;
    const { newVertexId: mTop } = splitWall(d, top, 0.5);
    const { newVertexId: mBot } = splitWall(d, bottom, 0.5);
    const partition = addWallBetween(d, mTop, mBot);
    const split = roomsSplitByChain(d, [partition]);
    expect(split).not.toBeNull();
    expect(split!.roomId).toBe(rid);
    expect(split!.arcA.length + split!.arcB.length).toBe(6);
    // Apply: dissolve the old room, build two sharing the partition.
    removeRoom(d, rid, { keepWalls: true });
    const r1 = createRoomFromWalls(d, [...split!.arcA, partition]);
    const r2 = createRoomFromWalls(d, [...split!.arcB, partition]);
    expect(r1).not.toBe(r2);
    assertProjectInvariants(d);
  });

  it('returns null when the chain touches two different rooms or is dangling', () => {
    const d = emptyDoc();
    const rid = createPolygonRoom(d, [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ]);
    const room = d.rooms[rid];
    const top = room.wallLoop[0];
    const { newVertexId: m } = splitWall(d, top, 0.5);
    const free = getOrCreateVertex(d, { x: 2000, y: 1500 });
    const stub = addWallBetween(d, m, free);
    expect(roomsSplitByChain(d, [stub])).toBeNull();
  });
});
