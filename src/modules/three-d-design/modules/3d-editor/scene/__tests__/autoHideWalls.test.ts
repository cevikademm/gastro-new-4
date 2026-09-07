import { describe, expect, it } from 'vitest';
import type { ProjectDocument } from '../../../../core/types';
import { createPolygonRoom } from '../../../../core/builders';
import { computeAutoHiddenWalls } from '../autoHideWalls';

function docWithRoom(): { d: ProjectDocument; loop: string[] } {
  const d: ProjectDocument = {
    id: 'p', name: 't', units: 'mm', vertices: {}, walls: {}, rooms: {}, openings: {}, equipment: {}, order: [],
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const rid = createPolygonRoom(d, [
    { x: 0, y: 0 },
    { x: 4000, y: 0 },
    { x: 4000, y: 3000 },
    { x: 0, y: 3000 },
  ]);
  return { d, loop: d.rooms[rid].wallLoop };
}

describe('computeAutoHiddenWalls', () => {
  it('hides only the walls facing the camera when it is outside', () => {
    const { d, loop } = docWithRoom();
    // Camera south-west of the room, above the floor: the y=0 wall and the x=0 wall face it.
    const hidden = computeAutoHiddenWalls(d, { x: -3000, y: -3000, z: 4000 });
    expect(hidden.size).toBe(2);
    expect(hidden.has(loop[0])).toBe(true); // (0,0)→(4000,0)
    expect(hidden.has(loop[3])).toBe(true); // (0,3000)→(0,0)
  });

  it('hides nothing when the camera is inside the room or at floor level', () => {
    const { d } = docWithRoom();
    expect(computeAutoHiddenWalls(d, { x: 2000, y: 1500, z: 1600 }).size).toBe(0);
    expect(computeAutoHiddenWalls(d, { x: -3000, y: -3000, z: 100 }).size).toBe(0);
  });

  it('hides one wall when the camera faces it squarely', () => {
    const { d, loop } = docWithRoom();
    const hidden = computeAutoHiddenWalls(d, { x: 2000, y: -5000, z: 2500 });
    expect([...hidden]).toEqual([loop[0]]);
  });
});
