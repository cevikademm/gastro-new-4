import { describe, expect, it } from 'vitest';
import type { Opening, ProjectDocument } from '../types';
import { addWallBetween, createPolygonRoom, getOrCreateVertex } from '../builders';
import {
  clampOpeningOnWall,
  defaultOpeningAt,
  nearestWallHit,
  openingSpan,
  wallEndMargins,
} from '../openings';
import { projectToScene } from '../to3d';
import { FLIP_Y } from '../renderSpace';

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

function mkOpening(wallId: string, patch: Partial<Opening> = {}): Opening {
  return {
    id: 'o1' as never,
    type: 'opening',
    kind: 'door',
    wallId: wallId as never,
    offset: 0,
    width: 900,
    height: 2100,
    sillHeight: 0,
    ...patch,
  };
}

describe('clampOpeningOnWall', () => {
  it('keeps the opening clear of corner joins (margin = 50 + neighbour half thickness)', () => {
    const d = emptyDoc();
    const rid = createPolygonRoom(d, [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ], { thickness: 200 });
    const wall = d.walls[d.rooms[rid].wallLoop[0]];
    expect(wallEndMargins(d, wall)).toEqual({ a: 150, b: 150 });
    const op = mkOpening(wall.id, { offset: -500 });
    clampOpeningOnWall(d, op);
    expect(op.offset).toBe(150);
    op.offset = 99999;
    clampOpeningOnWall(d, op);
    expect(op.offset).toBe(4000 - 150 - 900);
  });

  it('forces doors to the floor and keeps openings under the wall top', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 3000, y: 0 });
    const w = addWallBetween(d, a, b, { height: 2500 });
    const door = mkOpening(w, { sillHeight: 300, height: 2600 });
    clampOpeningOnWall(d, door);
    expect(door.sillHeight).toBe(0);
    expect(door.height).toBe(2499);
    const win = mkOpening(w, { kind: 'window', sillHeight: 2000, height: 1000 });
    clampOpeningOnWall(d, win);
    expect(win.sillHeight + win.height).toBeLessThanOrEqual(2499);
  });

  it('pushes a new opening away from an existing one on the same wall', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 5000, y: 0 });
    const w = addWallBetween(d, a, b);
    d.openings['o0'] = mkOpening(w, { id: 'o0' as never, offset: 1000, width: 1000 });
    const op = mkOpening(w, { id: 'o1' as never, offset: 1200, width: 800 });
    clampOpeningOnWall(d, op);
    // Must not overlap [1000, 2000] + 50 gap.
    expect(op.offset + op.width + 50 <= 1000 || op.offset >= 2050).toBe(true);
  });

  it('works on a free-standing (loose) wall through nearestWallHit + defaultOpeningAt', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 3000, y: 0 });
    const w = addWallBetween(d, a, b);
    const hit = nearestWallHit(d, { x: 1500, y: 40 }, 100);
    expect(hit?.wallId).toBe(w);
    expect(hit?.t).toBeCloseTo(0.5, 3);
    const op = defaultOpeningAt(d, 'window', w, hit!.t);
    expect(op.offset).toBeCloseTo(1500 - 600, 0);
    expect(op.sillHeight).toBe(1000);
  });
});

describe('openingSpan hinge / swing', () => {
  it('defaults to hinge at start and swing toward the left normal', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 3000, y: 0 });
    const w = addWallBetween(d, a, b);
    const span = openingSpan(d, mkOpening(w, { offset: 1000 }))!;
    expect(span.hingePt).toEqual({ x: 1000, y: 0 });
    expect(span.farPt).toEqual({ x: 1900, y: 0 });
    expect(span.swingDir).toEqual({ x: -0, y: 1 }); // perp2((1,0)) = (0,1)
  });

  it('honours hinge end + swing right', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 3000, y: 0 });
    const w = addWallBetween(d, a, b);
    const span = openingSpan(d, mkOpening(w, { offset: 1000, hinge: 'end', swing: 'right' }))!;
    expect(span.hingePt).toEqual({ x: 1900, y: 0 });
    expect(span.swingDir.y).toBe(-1);
  });
});

describe('to3d holes', () => {
  it('insets the sill by 1 mm and mirrors the swing into render space', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 3000, y: 0 });
    const w = addWallBetween(d, a, b);
    d.openings['o1'] = mkOpening(w, { offset: 1000 });
    const desc = projectToScene(d);
    const hole = desc.walls[0].holes[0];
    expect(hole.vMin).toBe(1);
    expect(hole.hinge).toBe('start');
    expect(hole.doorType).toBe('single');
    expect(hole.swing).toBe(FLIP_Y ? 'right' : 'left');
  });
});
