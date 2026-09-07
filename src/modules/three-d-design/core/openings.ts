/**
 * Openings (kapı / pencere / geçiş) — pure helpers on the normalized model.
 *
 *  - OPENING_DEFAULTS       typical commercial-kitchen sizes per kind
 *  - clampOpeningOnWall     keep an opening inside its host wall, clear of
 *                           the corner joins and of neighbouring openings
 *  - openingSpan            resolved world geometry (endpoints, hinge, swing)
 *  - nearestWallHit         nearest point on ANY wall (room or loose) — the
 *                           placement tools use this so a door can go on a
 *                           free-standing partition too
 *  - defaultOpeningAt       ready-to-add opening centred on a wall hit
 *
 * All distances mm. Direction conventions: `dir` = unit a→b, `normal` = left
 * normal (`perp2(dir)`). Swing 'left' opens toward `normal`.
 */

import type {
  DoorType,
  Opening,
  OpeningHinge,
  OpeningKind,
  OpeningSwing,
  ProjectDocument,
  Vec2,
  Wall,
  WallId,
} from './types';
import { closestPointOnSegment, distance2, dot2, normalize2, perp2, sub2 } from './math';

// ── Defaults ────────────────────────────────────────────────────────────────

export interface OpeningSizeDefaults {
  width: number;
  height: number;
  sillHeight: number;
}

export const OPENING_DEFAULTS: Record<OpeningKind, OpeningSizeDefaults> = {
  door: { width: 900, height: 2100, sillHeight: 0 },
  window: { width: 1200, height: 1200, sillHeight: 1000 },
  'pass-through': { width: 1200, height: 600, sillHeight: 900 },
};

export const OPENING_MIN_WIDTH_MM = 100;
export const OPENING_MIN_HEIGHT_MM = 100;
/** Clear distance kept between an opening and the wall's corner join. */
export const OPENING_END_MARGIN_MM = 50;
/** Minimum gap between two openings on the same wall. */
export const OPENING_GAP_MM = 50;

export const effectiveHinge = (op: Pick<Opening, 'hinge'>): OpeningHinge => op.hinge ?? 'start';
export const effectiveSwing = (op: Pick<Opening, 'swing'>): OpeningSwing => op.swing ?? 'left';
export const effectiveDoorType = (op: Pick<Opening, 'doorType'>): DoorType => op.doorType ?? 'single';

// ── Wall helpers ────────────────────────────────────────────────────────────

export function wallLengthOf(doc: ProjectDocument, wall: Wall): number {
  const a = doc.vertices[wall.a];
  const b = doc.vertices[wall.b];
  if (!a || !b) return 0;
  return distance2(a, b);
}

/**
 * Margin to keep at each end of `wall` so an opening never cuts into the
 * mitre of a neighbouring (possibly thicker) wall: 50 mm + the largest
 * half-thickness among the OTHER walls meeting at that vertex.
 */
export function wallEndMargins(doc: ProjectDocument, wall: Wall): { a: number; b: number } {
  let maxA = 0;
  let maxB = 0;
  for (const w of Object.values(doc.walls)) {
    if (w.id === wall.id) continue;
    const half = w.thickness / 2;
    if (w.a === wall.a || w.b === wall.a) maxA = Math.max(maxA, half);
    if (w.a === wall.b || w.b === wall.b) maxB = Math.max(maxB, half);
  }
  return { a: OPENING_END_MARGIN_MM + maxA, b: OPENING_END_MARGIN_MM + maxB };
}

// ── Clamp ───────────────────────────────────────────────────────────────────

/**
 * Mutates `op` so it sits fully inside its wall, clear of the end margins,
 * within the wall height, and (best effort) not overlapping other openings
 * on the same wall. Safe to call after ANY geometry change (vertex move,
 * split, thickness change of a neighbour).
 */
export function clampOpeningOnWall(doc: ProjectDocument, op: Opening): void {
  const wall = doc.walls[op.wallId];
  if (!wall) return;
  const len = wallLengthOf(doc, wall);
  if (len <= 0) return;
  const { a: mA, b: mB } = wallEndMargins(doc, wall);

  // Doors always sit on the floor.
  if (op.kind === 'door') op.sillHeight = 0;
  op.sillHeight = Math.max(0, op.sillHeight || 0);
  op.height = Math.max(OPENING_MIN_HEIGHT_MM, op.height || OPENING_MIN_HEIGHT_MM);
  // Keep a 1 mm lip under the wall top so the 3D hole never touches the edge.
  const maxTop = Math.max(OPENING_MIN_HEIGHT_MM, wall.height - 1);
  if (op.sillHeight + op.height > maxTop) {
    op.sillHeight = Math.max(0, Math.min(op.sillHeight, maxTop - OPENING_MIN_HEIGHT_MM));
    op.height = Math.max(OPENING_MIN_HEIGHT_MM, maxTop - op.sillHeight);
  }

  const usable = len - mA - mB;
  if (usable < OPENING_MIN_WIDTH_MM) {
    // Wall too short for any opening — pin to the middle with the min width.
    op.width = Math.max(OPENING_MIN_WIDTH_MM, Math.min(op.width, len - 2));
    op.offset = Math.max(1, (len - op.width) / 2);
    return;
  }
  op.width = Math.max(OPENING_MIN_WIDTH_MM, Math.min(op.width || OPENING_MIN_WIDTH_MM, usable));
  const minOff = mA;
  const maxOff = len - mB - op.width;
  op.offset = Math.max(minOff, Math.min(op.offset || 0, maxOff));

  // Best-effort push-apart from siblings on the same wall.
  const siblings = Object.values(doc.openings)
    .filter((o) => o.id !== op.id && o.wallId === op.wallId)
    .sort((x, y) => x.offset - y.offset);
  if (siblings.length === 0) return;
  const overlaps = (offset: number) =>
    siblings.some((s) => offset < s.offset + s.width + OPENING_GAP_MM && offset + op.width + OPENING_GAP_MM > s.offset);
  if (!overlaps(op.offset)) return;
  // Try the nearest free slot to the right, then to the left.
  for (const s of siblings) {
    const right = s.offset + s.width + OPENING_GAP_MM;
    if (right >= op.offset && right <= maxOff && !overlaps(right)) {
      op.offset = right;
      return;
    }
  }
  for (let i = siblings.length - 1; i >= 0; i--) {
    const s = siblings[i];
    const left = s.offset - OPENING_GAP_MM - op.width;
    if (left <= op.offset && left >= minOff && !overlaps(left)) {
      op.offset = left;
      return;
    }
  }
  // No free slot — leave as is (user can resize); never throw.
}

/** Clamp every opening hosted on any of `wallIds`. */
export function clampOpeningsOnWalls(doc: ProjectDocument, wallIds: Iterable<WallId>): void {
  const set = new Set<string>(wallIds);
  for (const op of Object.values(doc.openings)) {
    if (set.has(op.wallId)) clampOpeningOnWall(doc, op);
  }
}

/** Ids of every wall touching `vertexId`. */
export function wallsAtVertex(doc: ProjectDocument, vertexId: string): WallId[] {
  const out: WallId[] = [];
  for (const w of Object.values(doc.walls)) {
    if (w.a === vertexId || w.b === vertexId) out.push(w.id);
  }
  return out;
}

// ── Resolved geometry ───────────────────────────────────────────────────────

export interface OpeningSpan {
  wallId: WallId;
  /** Opening start/end on the wall centre line (world mm), in a→b order. */
  a: Vec2;
  b: Vec2;
  /** Unit direction of the wall a→b. */
  dir: Vec2;
  /** Left normal (perp2(dir)). */
  normal: Vec2;
  /** Hinge jamb + far jamb (world mm). */
  hingePt: Vec2;
  farPt: Vec2;
  /** Unit direction the leaf opens toward (normal or −normal). */
  swingDir: Vec2;
  widthMm: number;
  thicknessMm: number;
  wallLengthMm: number;
}

export function openingSpan(doc: ProjectDocument, op: Opening): OpeningSpan | null {
  const wall = doc.walls[op.wallId];
  if (!wall) return null;
  const va = doc.vertices[wall.a];
  const vb = doc.vertices[wall.b];
  if (!va || !vb) return null;
  const start: Vec2 = { x: va.x, y: va.y };
  const end: Vec2 = { x: vb.x, y: vb.y };
  const dir = normalize2(sub2(end, start));
  const normal = perp2(dir);
  const a: Vec2 = { x: start.x + dir.x * op.offset, y: start.y + dir.y * op.offset };
  const b: Vec2 = {
    x: start.x + dir.x * (op.offset + op.width),
    y: start.y + dir.y * (op.offset + op.width),
  };
  const hingeStart = effectiveHinge(op) === 'start';
  const swingLeft = effectiveSwing(op) === 'left';
  return {
    wallId: wall.id,
    a,
    b,
    dir,
    normal,
    hingePt: hingeStart ? a : b,
    farPt: hingeStart ? b : a,
    swingDir: swingLeft ? normal : { x: -normal.x, y: -normal.y },
    widthMm: op.width,
    thicknessMm: wall.thickness,
    wallLengthMm: distance2(start, end),
  };
}

// ── Picking ─────────────────────────────────────────────────────────────────

export interface WallHit {
  wallId: WallId;
  /** Parameter along a→b (0..1). */
  t: number;
  /** Closest point on the centre line (world mm). */
  point: Vec2;
  distance: number;
  lengthMm: number;
}

/** Nearest point on ANY wall centre line within `radiusMm`. */
export function nearestWallHit(doc: ProjectDocument, point: Vec2, radiusMm: number): WallHit | null {
  let best: WallHit | null = null;
  for (const w of Object.values(doc.walls)) {
    const va = doc.vertices[w.a];
    const vb = doc.vertices[w.b];
    if (!va || !vb) continue;
    const a: Vec2 = { x: va.x, y: va.y };
    const b: Vec2 = { x: vb.x, y: vb.y };
    const len = distance2(a, b);
    if (len < 1) continue;
    const c = closestPointOnSegment(point, a, b);
    const d = distance2(point, c);
    if (d > radiusMm) continue;
    if (!best || d < best.distance) {
      const t = dot2(sub2(c, a), sub2(b, a)) / (len * len);
      best = { wallId: w.id, t: Math.max(0, Math.min(1, t)), point: c, distance: d, lengthMm: len };
    }
  }
  return best;
}

/**
 * Build an opening of `kind` centred on parameter `t` of `wallId`, already
 * clamped to the wall. Returns the field set `addOpening` expects.
 */
export function defaultOpeningAt(
  doc: ProjectDocument,
  kind: OpeningKind,
  wallId: WallId,
  t: number,
  size?: Partial<OpeningSizeDefaults>,
): Omit<Opening, 'id' | 'type'> {
  const wall = doc.walls[wallId];
  const defs = { ...OPENING_DEFAULTS[kind], ...size };
  const len = wall ? wallLengthOf(doc, wall) : 0;
  const draft: Opening = {
    id: '__tmp' as Opening['id'],
    type: 'opening',
    kind,
    wallId,
    offset: Math.max(0, t * len - defs.width / 2),
    width: defs.width,
    height: defs.height,
    sillHeight: defs.sillHeight,
  };
  clampOpeningOnWall(doc, draft);
  const { id: _id, type: _type, ...rest } = draft;
  void _id;
  void _type;
  return rest;
}
