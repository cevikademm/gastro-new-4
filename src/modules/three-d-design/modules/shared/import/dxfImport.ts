/**
 * DXF import — parses an AutoCAD DXF file into the internal normalized
 * model. Walls become individual two-vertex `Wall` records (not a closed
 * room) because DXF generally has no concept of "rooms". A separate pass in
 * the editor can group connected walls into rooms once topology is clear.
 *
 * Library
 *   `dxf-parser` is a battle-tested, dependency-free DXF reader. We use its
 *   ENTITIES section: LINE, LWPOLYLINE, POLYLINE.
 *
 * Coordinate system
 *   DXF is in drawing units (often mm or inches depending on $INSUNITS).
 *   We treat the input as MM by default; callers can override with
 *   `unitScale` (e.g., 25.4 for inches → mm) before dispatching to the
 *   builders.
 */

import DxfParser from 'dxf-parser';
import {
  addWallBetween,
  getOrCreateVertex,
  type ProjectDocument,
  type Vec2,
  type WallId,
} from '../../../core';

export interface DxfImportOptions {
  /** Multiply DXF units by this factor to get mm. Default 1 (DXF in mm). */
  unitScale?: number;
  /** Vertex merge tolerance (mm) — touching corners weld. Default 5 mm. */
  mergeMm?: number;
  /** Wall thickness applied to all imported walls. Default 100 mm. */
  thicknessMm?: number;
  /** Wall height applied to all imported walls. Default 3000 mm. */
  heightMm?: number;
  /** Optional layer-name allowlist (case-insensitive). If empty, all layers. */
  layers?: string[];
  /** Skip segments shorter than this (mm) — kills hatching noise. Default 100. */
  minSegmentMm?: number;
  /** If true, translate the imported geometry so its bounds.min lands at (0,0). */
  normalizeOrigin?: boolean;
  /** Extra translation applied AFTER unitScale + rotation (mm). Default 0. */
  translateX?: number;
  translateY?: number;
  /** Rotation in degrees (CCW) applied around bounds center. Default 0. */
  rotateDeg?: number;
  /** Mirror along X axis (flip Y). DWG/DXF Y often points up; some flows want it down. */
  mirrorX?: boolean;
  /** Mirror along Y axis (flip X). */
  mirrorY?: boolean;
}

export interface DxfImportResult {
  wallIds: WallId[];
  /** Bounds of the imported geometry, mm. Useful for camera framing. */
  bounds: { min: Vec2; max: Vec2 } | null;
  /** Layers found in the DXF — caller can show a layer picker. */
  layersFound: string[];
  /** Number of segments skipped because shorter than minSegmentMm. */
  skippedShort: number;
}

/** Layer name patterns that very likely contain wall geometry. */
const WALL_LAYER_PATTERNS = [
  /\bwall(s)?\b/i,
  /\bduvar(lar)?\b/i,
  /\bmur(s)?\b/i,
  /\bwand\b/i,
  /\bwaende\b/i,
  /\bwände\b/i,
  /\bcloison/i,
  /\bmuro(s)?\b/i,
  /\bparete\b/i,
  /^a-wall/i,
  /^a_wall/i,
  /^awall/i,
  /^archi.*wall/i,
];

/** Returns layer names from `all` that look like wall layers. */
export function detectWallLayers(all: string[]): string[] {
  return all.filter((name) => WALL_LAYER_PATTERNS.some((re) => re.test(name)));
}

interface DxfPoint { x: number; y: number; z?: number; }
interface DxfEntityLine { type: 'LINE'; layer?: string; vertices: DxfPoint[]; }
interface DxfEntityLwPolyline { type: 'LWPOLYLINE' | 'POLYLINE'; layer?: string; vertices: DxfPoint[]; shape?: boolean; }
type AnyDxfEntity = DxfEntityLine | DxfEntityLwPolyline | { type: string; layer?: string; vertices?: DxfPoint[]; shape?: boolean };

/**
 * Parse a DXF text into the project draft. Returns the imported wall ids
 * and bounds. Mutates `draft` in place.
 */
export function importDxfIntoDraft(
  draft: ProjectDocument,
  dxfText: string,
  opts: DxfImportOptions = {},
): DxfImportResult {
  const unitScale = opts.unitScale ?? 1;
  const mergeMm = opts.mergeMm ?? 5;
  const thicknessMm = opts.thicknessMm ?? 100;
  const heightMm = opts.heightMm ?? 3000;
  const layerAllow = (opts.layers ?? []).map((s) => s.toLowerCase());
  const minSegmentMm = Math.max(1, opts.minSegmentMm ?? 100);
  const normalizeOrigin = opts.normalizeOrigin ?? true;
  const extraTx = opts.translateX ?? 0;
  const extraTy = opts.translateY ?? 0;
  const rotateRad = ((opts.rotateDeg ?? 0) * Math.PI) / 180;
  const mirrorX = opts.mirrorX ?? false;
  const mirrorY = opts.mirrorY ?? false;

  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfText) as { entities?: AnyDxfEntity[] } | null;
  if (!dxf || !Array.isArray(dxf.entities)) {
    return { wallIds: [], bounds: null, layersFound: [], skippedShort: 0 };
  }

  // ── Pass 1: collect raw entities (with layer filter applied) and compute raw bounds ──
  type Edge = [DxfPoint, DxfPoint];
  const edges: Edge[] = [];
  const layersFound = new Set<string>();
  let rawMinX = Infinity, rawMinY = Infinity, rawMaxX = -Infinity, rawMaxY = -Infinity;
  let rawTouched = false;
  const accRaw = (p: DxfPoint) => {
    rawMinX = Math.min(rawMinX, p.x); rawMinY = Math.min(rawMinY, p.y);
    rawMaxX = Math.max(rawMaxX, p.x); rawMaxY = Math.max(rawMaxY, p.y);
    rawTouched = true;
  };
  for (const ent of dxf.entities) {
    const layer = (ent.layer ?? '').toLowerCase();
    if (ent.layer) layersFound.add(ent.layer);
    if (layerAllow.length > 0 && !layerAllow.includes(layer)) continue;
    switch (ent.type) {
      case 'LINE': {
        const v = ent.vertices ?? [];
        if (v.length >= 2) { edges.push([v[0], v[1]]); accRaw(v[0]); accRaw(v[1]); }
        break;
      }
      case 'LWPOLYLINE':
      case 'POLYLINE': {
        const v = ent.vertices ?? [];
        for (let i = 0; i < v.length - 1; i++) { edges.push([v[i], v[i + 1]]); accRaw(v[i]); accRaw(v[i + 1]); }
        if (ent.shape && v.length >= 3) { edges.push([v[v.length - 1], v[0]]); }
        break;
      }
      default:
        break;
    }
  }

  // ── Compute the transform around the raw bounds center ──
  const rawCx = rawTouched ? (rawMinX + rawMaxX) / 2 : 0;
  const rawCy = rawTouched ? (rawMinY + rawMaxY) / 2 : 0;
  const cos = Math.cos(rotateRad);
  const sin = Math.sin(rotateRad);
  const transform = (p: DxfPoint): Vec2 => {
    // 1) center → 2) rotate → 3) mirror → 4) un-center → 5) unitScale
    let dx = p.x - rawCx;
    let dy = p.y - rawCy;
    if (mirrorY) dx = -dx;
    if (mirrorX) dy = -dy;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return {
      x: (rx + rawCx) * unitScale,
      y: (ry + rawCy) * unitScale,
    };
  };

  // First-pass transformed bounds for origin normalization
  let tMinX = Infinity, tMinY = Infinity, tMaxX = -Infinity, tMaxY = -Infinity;
  for (const [a, b] of edges) {
    for (const p of [transform(a), transform(b)]) {
      tMinX = Math.min(tMinX, p.x); tMinY = Math.min(tMinY, p.y);
      tMaxX = Math.max(tMaxX, p.x); tMaxY = Math.max(tMaxY, p.y);
    }
  }
  const originDx = normalizeOrigin && isFinite(tMinX) ? -tMinX : 0;
  const originDy = normalizeOrigin && isFinite(tMinY) ? -tMinY : 0;

  const wallIds: WallId[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let touched = false;
  let skippedShort = 0;

  const addEdge = (a: DxfPoint, b: DxfPoint) => {
    const ta = transform(a);
    const tb = transform(b);
    const pa: Vec2 = { x: ta.x + originDx + extraTx, y: ta.y + originDy + extraTy };
    const pb: Vec2 = { x: tb.x + originDx + extraTx, y: tb.y + originDy + extraTy };
    const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    if (len < minSegmentMm) {
      skippedShort++;
      return;
    }
    const va = getOrCreateVertex(draft, pa, mergeMm);
    const vb = getOrCreateVertex(draft, pb, mergeMm);
    if (va === vb) return;
    const wid = addWallBetween(draft, va, vb, {
      wallType: 'interior',
      thickness: thicknessMm,
      height: heightMm,
    });
    wallIds.push(wid);
    touched = true;
    for (const p of [pa, pb]) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  };

  // ── Pass 2: apply transform to each edge, push into draft ──
  for (const ent of dxf.entities) {
    const layer = (ent.layer ?? '').toLowerCase();
    if (layerAllow.length > 0 && !layerAllow.includes(layer)) continue;

    switch (ent.type) {
      case 'LINE': {
        const v = ent.vertices ?? [];
        if (v.length >= 2) addEdge(v[0], v[1]);
        break;
      }
      case 'LWPOLYLINE':
      case 'POLYLINE': {
        const v = ent.vertices ?? [];
        for (let i = 0; i < v.length - 1; i++) addEdge(v[i], v[i + 1]);
        if (ent.shape && v.length >= 3) {
          addEdge(v[v.length - 1], v[0]);
        }
        break;
      }
      // Other entity types (CIRCLE, ARC, INSERT/blocks, TEXT) are ignored
      // for now — Phase 8.5 can add ARC tessellation if needed.
      default:
        break;
    }
  }

  return {
    wallIds,
    bounds: touched ? { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } } : null,
    layersFound: Array.from(layersFound).sort(),
    skippedShort,
  };
}

/**
 * Analyze a DXF without mutating any draft. Returns layer stats so the caller
 * can present a layer picker before the actual import.
 */
export function analyzeDxf(dxfText: string, opts: { unitScale?: number } = {}): {
  layers: Array<{ name: string; entityCount: number; segmentCount: number }>;
  totalEntities: number;
  bounds: { min: Vec2; max: Vec2 } | null;
} {
  const unitScale = opts.unitScale ?? 1;
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfText) as { entities?: AnyDxfEntity[] } | null;
  if (!dxf || !Array.isArray(dxf.entities)) {
    return { layers: [], totalEntities: 0, bounds: null };
  }
  const stats = new Map<string, { entityCount: number; segmentCount: number }>();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let touched = false;
  const accStat = (layer: string, segs: number) => {
    const key = layer || '0';
    const s = stats.get(key) ?? { entityCount: 0, segmentCount: 0 };
    s.entityCount += 1;
    s.segmentCount += segs;
    stats.set(key, s);
  };
  const accBounds = (p: DxfPoint) => {
    const x = p.x * unitScale;
    const y = p.y * unitScale;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    touched = true;
  };
  for (const ent of dxf.entities) {
    const layer = ent.layer ?? '0';
    switch (ent.type) {
      case 'LINE': {
        const v = ent.vertices ?? [];
        if (v.length >= 2) {
          accStat(layer, 1);
          accBounds(v[0]); accBounds(v[1]);
        }
        break;
      }
      case 'LWPOLYLINE':
      case 'POLYLINE': {
        const v = ent.vertices ?? [];
        if (v.length >= 2) {
          const segs = v.length - 1 + (ent.shape ? 1 : 0);
          accStat(layer, segs);
          for (const p of v) accBounds(p);
        }
        break;
      }
      default:
        break;
    }
  }
  const layers = Array.from(stats.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.segmentCount - a.segmentCount);
  const totalEntities = layers.reduce((a, l) => a + l.entityCount, 0);
  return {
    layers,
    totalEntities,
    bounds: touched ? { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } } : null,
  };
}

/** Convenience wrapper that runs through useProjectStore.update(). */
export function importDxfFile(
  storeUpdate: (recipe: (d: ProjectDocument) => void) => void,
  dxfText: string,
  opts: DxfImportOptions = {},
): DxfImportResult {
  let result: DxfImportResult = { wallIds: [], bounds: null, layersFound: [] };
  storeUpdate((draft) => {
    result = importDxfIntoDraft(draft, dxfText, opts);
  });
  return result;
}
