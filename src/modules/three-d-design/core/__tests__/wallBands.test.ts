import { describe, expect, it } from 'vitest';
import type { ProjectDocument } from '../types';
import { addWallBetween, createPolygonRoom, getOrCreateVertex } from '../builders';
import { roomInnerPolygon, wallBandPolygons, wallPiecePolygon } from '../wallBands';
import { roomContainmentPolygon } from '../geometry';
import { polygonArea } from '../math';

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

const near = (p: { x: number; y: number }, x: number, y: number) => {
  expect(p.x).toBeCloseTo(x, 3);
  expect(p.y).toBeCloseTo(y, 3);
};

describe('wallBandPolygons', () => {
  it('free-standing wall: square cuts on both ends, 4-point polygon', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 2000, y: 0 });
    const w = addWallBetween(d, a, b, { thickness: 200 });
    const { bands, outline } = wallBandPolygons(d);
    const band = bands.get(w)!;
    expect(band.capA).toBe('free');
    expect(band.polygon.length).toBe(4);
    near(band.leftEdge[0], 0, 100);
    near(band.leftEdge[1], 2000, 100);
    near(band.rightEdge[0], 0, -100);
    // 2 caps + 2 long edges
    expect(outline.length).toBe(4);
  });

  it('L corner with equal thickness: both walls share the inner and outer mitre points', () => {
    const d = emptyDoc();
    const v = getOrCreateVertex(d, { x: 0, y: 0 });
    const e = getOrCreateVertex(d, { x: 2000, y: 0 });
    const n = getOrCreateVertex(d, { x: 0, y: 2000 });
    const wi = addWallBetween(d, v, e, { thickness: 200 }); // +x
    const wj = addWallBetween(d, v, n, { thickness: 200 }); // +y
    const { bands } = wallBandPolygons(d);
    const bi = bands.get(wi)!;
    const bj = bands.get(wj)!;
    // wall i: left normal = (0,1). Inner corner (100,100), outer (-100,-100).
    near(bi.leftEdge[0], 100, 100);
    near(bi.rightEdge[0], -100, -100);
    // wall j: dir (0,1), left normal (-1,0). Its left edge is x=-100 → outer at (-100,-100); right edge x=100 → inner (100,100).
    near(bj.leftEdge[0], -100, -100);
    near(bj.rightEdge[0], 100, 100);
    expect(bi.polygon.length).toBe(4);
  });

  it('L corner with different thickness: mitre points come from each wall’s own half thickness', () => {
    const d = emptyDoc();
    const v = getOrCreateVertex(d, { x: 0, y: 0 });
    const e = getOrCreateVertex(d, { x: 2000, y: 0 });
    const n = getOrCreateVertex(d, { x: 0, y: 2000 });
    const wi = addWallBetween(d, v, e, { thickness: 300 }); // half 150, +x
    const wj = addWallBetween(d, v, n, { thickness: 100 }); // half 50,  +y
    const { bands } = wallBandPolygons(d);
    const bi = bands.get(wi)!;
    // inner corner: i's left line y=150 meets j's right line x=50 → (50,150)
    near(bi.leftEdge[0], 50, 150);
    // outer corner: i's right line y=-150 meets j's left line x=-50 → (-50,-150)
    near(bi.rightEdge[0], -50, -150);
  });

  it('collinear continuation with different thickness: butt cut + step in outline', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: -2000, y: 0 });
    const v = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 2000, y: 0 });
    const wk = addWallBetween(d, a, v, { thickness: 200 });
    const wi = addWallBetween(d, v, b, { thickness: 100 });
    const { bands, outline } = wallBandPolygons(d);
    near(bands.get(wk)!.leftEdge[1], 0, 100);
    near(bands.get(wi)!.leftEdge[0], 0, 50);
    // Step segments (0,100)-(0,50) and (0,-100)-(0,-50) are exterior.
    const steps = outline.filter(([p, q]) => Math.abs(p.x) < 1e-6 && Math.abs(q.x) < 1e-6);
    expect(steps.length).toBe(2);
  });

  it('T-junction: through wall stays a rectangle, branch ends on its face, no hole', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: -2000, y: 0 });
    const v = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 2000, y: 0 });
    const n = getOrCreateVertex(d, { x: 0, y: 2000 });
    const wk = addWallBetween(d, a, v, { thickness: 200 });
    const wi = addWallBetween(d, v, b, { thickness: 200 });
    const wj = addWallBetween(d, v, n, { thickness: 100 }); // branch, +y
    const { bands } = wallBandPolygons(d);
    const bi = bands.get(wi)!;
    const bk = bands.get(wk)!;
    const bj = bands.get(wj)!;
    // Through wall i: fill area equals a full 2000×200 rectangle.
    expect(polygonArea(bi.polygon)).toBeCloseTo(2000 * 200, 0);
    expect(polygonArea(bk.polygon)).toBeCloseTo(2000 * 200, 0);
    // Its top outline edge starts at the branch face (x = +50), not at 0.
    near(bi.leftEdge[0], 50, 100);
    near(bk.leftEdge[1], -50, 100);
    // Branch: both corners at the through wall's face y = 100 → ends flush.
    near(bj.leftEdge[0], -50, 100);
    near(bj.rightEdge[0], 50, 100);
    expect(polygonArea(bj.polygon)).toBeCloseTo(1900 * 100, 0);
  });

  it('roomInnerPolygon of a rectangular room equals the classic inset polygon', () => {
    const d = emptyDoc();
    const rid = createPolygonRoom(d, [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ], { thickness: 200 });
    const room = d.rooms[rid];
    const { bands } = wallBandPolygons(d);
    const inner = roomInnerPolygon(d, room, bands)!;
    expect(inner.length).toBe(4);
    // Legacy uniform inset (explicit insetMm → offsetPolygon path) must match.
    const classic = roomContainmentPolygon(d, room, 100)!;
    for (let i = 0; i < 4; i++) near(inner[i], classic[i].x, classic[i].y);
    expect(polygonArea(inner)).toBeCloseTo(3800 * 2800, 0);
    // And the default path now uses the bands.
    const viaGeometry = roomContainmentPolygon(d, room)!;
    for (let i = 0; i < 4; i++) near(viaGeometry[i], inner[i].x, inner[i].y);
  });

  it('vertexOverride previews a dragged corner without touching the document', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 2000, y: 0 });
    const w = addWallBetween(d, a, b, { thickness: 200 });
    const { bands } = wallBandPolygons(d, { vertexOverride: { [b]: { x: 3000, y: 0 } } });
    expect(bands.get(w)!.lengthMm).toBe(3000);
    expect(d.vertices[b].x).toBe(2000);
  });

  it('wallPiecePolygon clips to a u-range with square cuts', () => {
    const d = emptyDoc();
    const a = getOrCreateVertex(d, { x: 0, y: 0 });
    const b = getOrCreateVertex(d, { x: 2000, y: 0 });
    const w = addWallBetween(d, a, b, { thickness: 200 });
    const band = wallBandPolygons(d).bands.get(w)!;
    const piece = wallPiecePolygon(band, 500, 900, false, false);
    expect(polygonArea(piece)).toBeCloseTo(400 * 200, 0);
    const startPiece = wallPiecePolygon(band, 0, 500, true, false);
    expect(polygonArea(startPiece)).toBeCloseTo(500 * 200, 0);
  });
});
