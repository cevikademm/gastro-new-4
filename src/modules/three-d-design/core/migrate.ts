/**
 * Document normalization / migration.
 *
 * `normalizeDocument` is called on EVERY load (Supabase, localStorage, JSON
 * import). It never throws: broken references are dropped, missing fields get
 * defaults, `order` is rebuilt so invariant I-4 holds, and rooms whose loop no
 * longer chains (I-2) are dissolved into loose walls instead of crashing the
 * editor. The result is tagged with `CURRENT_SCHEMA_VERSION`.
 *
 * Schema history
 *   v1 (implicit) — room loops direction-dependent (walls[i].b === walls[i+1].a),
 *                   openings without hinge/swing/doorType.
 *   v2            — direction-agnostic loops (shared partition walls allowed),
 *                   opening hinge/swing/doorType, schemaVersion field.
 */

import type {
  Equipment,
  Opening,
  ProjectDocument,
  Room,
  Vertex,
  Wall,
} from './types';
import { DEFAULT_WALL_HEIGHT_MM, DEFAULT_WALL_THICKNESS_MM } from './builders';
import { walkRoomLoop } from './loops';

export const CURRENT_SCHEMA_VERSION = 2;

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

const rec = <T>(v: unknown): Record<string, T> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, T>) : {};

/**
 * Normalize IN PLACE (callers pass a fresh clone) and return the same object.
 * Idempotent: running it twice yields the same document.
 */
export function normalizeDocument(input: ProjectDocument): ProjectDocument {
  const doc = input as ProjectDocument & Record<string, unknown>;
  const now = new Date().toISOString();

  doc.id = typeof doc.id === 'string' && doc.id ? doc.id : `prj_${Date.now().toString(36)}`;
  doc.name = typeof doc.name === 'string' ? doc.name : 'Untitled Project';
  doc.units = 'mm';
  doc.createdAt = typeof doc.createdAt === 'string' ? doc.createdAt : now;
  doc.updatedAt = typeof doc.updatedAt === 'string' ? doc.updatedAt : now;

  doc.vertices = rec<Vertex>(doc.vertices);
  doc.walls = rec<Wall>(doc.walls);
  doc.rooms = rec<Room>(doc.rooms);
  doc.openings = rec<Opening>(doc.openings);
  doc.equipment = rec<Equipment>(doc.equipment);
  if (!Array.isArray(doc.order)) doc.order = [];
  if (doc.renders !== undefined && !Array.isArray(doc.renders)) delete doc.renders;

  // Vertices — numeric coordinates only.
  for (const [id, v] of Object.entries(doc.vertices)) {
    if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y)) {
      delete doc.vertices[id];
      continue;
    }
    v.id = id as Vertex['id'];
    v.type = 'vertex';
  }

  // Walls — both vertices must exist; fill defaults.
  for (const [id, w] of Object.entries(doc.walls)) {
    if (!w || !doc.vertices[w.a] || !doc.vertices[w.b] || w.a === w.b) {
      delete doc.walls[id];
      continue;
    }
    w.id = id as Wall['id'];
    w.type = 'wall';
    w.wallType = w.wallType === 'exterior' || w.wallType === 'partition' ? w.wallType : 'interior';
    w.thickness = Math.max(10, num(w.thickness, DEFAULT_WALL_THICKNESS_MM));
    w.height = Math.max(100, num(w.height, DEFAULT_WALL_HEIGHT_MM));
  }

  // Openings — host wall must exist; numeric fields.
  for (const [id, op] of Object.entries(doc.openings)) {
    if (!op || !doc.walls[op.wallId]) {
      delete doc.openings[id];
      continue;
    }
    op.id = id as Opening['id'];
    op.type = 'opening';
    if (op.kind !== 'door' && op.kind !== 'window' && op.kind !== 'pass-through') op.kind = 'door';
    op.offset = Math.max(0, num(op.offset, 0));
    op.width = Math.max(100, num(op.width, 900));
    op.height = Math.max(100, num(op.height, 2100));
    op.sillHeight = Math.max(0, num(op.sillHeight, 0));
    if (op.hinge !== undefined && op.hinge !== 'start' && op.hinge !== 'end') delete op.hinge;
    if (op.swing !== undefined && op.swing !== 'left' && op.swing !== 'right') delete op.swing;
    if (
      op.doorType !== undefined &&
      op.doorType !== 'single' &&
      op.doorType !== 'double' &&
      op.doorType !== 'sliding'
    ) {
      delete op.doorType;
    }
  }

  // Rooms — loop must chain and close; otherwise dissolve (walls stay).
  for (const [id, r] of Object.entries(doc.rooms)) {
    if (!r || !Array.isArray(r.wallLoop)) {
      delete doc.rooms[id];
      continue;
    }
    r.id = id as Room['id'];
    r.type = 'room';
    r.wallLoop = r.wallLoop.filter((wid, i, arr) => doc.walls[wid] && arr.indexOf(wid) === i);
    r.closed = true;
    r.name = typeof r.name === 'string' && r.name ? r.name : `Room`;
    r.floorHeight = num(r.floorHeight, 0);
    r.ceilingHeight = num(r.ceilingHeight, DEFAULT_WALL_HEIGHT_MM);
    if (!Array.isArray(r.tags)) r.tags = [];
    if (r.wallLoop.length < 3 || !walkRoomLoop(doc, r)) delete doc.rooms[id];
  }

  // Equipment — geometry fields numeric.
  for (const [id, e] of Object.entries(doc.equipment)) {
    if (!e || typeof e !== 'object') {
      delete doc.equipment[id];
      continue;
    }
    e.id = id as Equipment['id'];
    e.type = 'equipment';
    e.catalogId = typeof e.catalogId === 'string' ? e.catalogId : id;
    e.name = typeof e.name === 'string' ? e.name : e.catalogId;
    const p = (e.position ?? {}) as Partial<Equipment['position']>;
    e.position = { x: num(p.x, 0), y: num(p.y, 0), z: num(p.z, 0) };
    const f = (e.footprint ?? {}) as Partial<Equipment['footprint']>;
    e.footprint = { width: Math.max(10, num(f.width, 600)), depth: Math.max(10, num(f.depth, 600)) };
    e.heightMm = Math.max(10, num(e.heightMm, 900));
    e.rotation = num(e.rotation, 0);
    if (e.tiltX !== undefined) e.tiltX = num(e.tiltX, 0);
    if (e.tiltY !== undefined) e.tiltY = num(e.tiltY, 0);
    if (e.mount !== undefined && e.mount !== 'floor' && e.mount !== 'wall') delete e.mount;
    if (e.roomId !== undefined && !doc.rooms[e.roomId]) delete e.roomId;
  }

  // Order — every entity exactly once, existing relative order preserved.
  const all = new Set<string>([
    ...Object.keys(doc.vertices),
    ...Object.keys(doc.walls),
    ...Object.keys(doc.rooms),
    ...Object.keys(doc.openings),
    ...Object.keys(doc.equipment),
  ]);
  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of doc.order) {
    if (typeof id !== 'string' || !all.has(id) || seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  for (const id of all) {
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  doc.order = order;

  doc.schemaVersion = CURRENT_SCHEMA_VERSION;
  return doc as ProjectDocument;
}
