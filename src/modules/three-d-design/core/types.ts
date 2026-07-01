/**
 * Core domain model — NORMALIZED.
 *
 * Design rules
 *  - Geometry is in millimeters (cm × 10), z is up.
 *  - Vertex is a first-class entity. Walls reference vertices by ID, NEVER
 *    embed coordinates. Moving a corner is a single mutation that all
 *    referring walls reflect automatically.
 *  - Rooms are explicit closed loops of walls (`closed: true` is a tagged
 *    literal — builders enforce it; readers can rely on it).
 *  - All entity references are by string ID. The document is JSON-serializable
 *    so undo/redo can snapshot it cheaply and persistence is trivial.
 *
 * Invariants (enforced by builders + asserted in dev by core/invariants.ts):
 *  I-1  For every Wall, vertices[wall.a] and vertices[wall.b] exist.
 *  I-2  For every Room with wallLoop = [w1..wn]:
 *         walls[wi].b === walls[w(i+1)].a   for i in [0..n-1]
 *         walls[wn].b === walls[w1].a       (loop closes)
 *  I-3  Every Opening references an existing wall.
 *  I-4  ProjectDocument.order contains every entity id exactly once
 *       (used for stable z-ordering in 2D / iteration in 3D).
 */

// ── Branded id types (compile-time only — runtime they're plain strings) ────
export type EntityId = string;
export type VertexId = string & { readonly __k?: 'vertex' };
export type WallId   = string & { readonly __k?: 'wall' };
export type RoomId   = string & { readonly __k?: 'room' };
export type OpeningId    = string & { readonly __k?: 'opening' };
export type EquipmentId  = string & { readonly __k?: 'equipment' };

// ── Vec primitives ──────────────────────────────────────────────────────────
export interface Vec2 { x: number; y: number; }
export interface Vec3 { x: number; y: number; z: number; }

// ── Vertex ─────────────────────────────────────────────────────────────────
/** A 2D point in world mm. Owned by the project — referenced by walls. */
export interface Vertex {
  id: VertexId;
  type: 'vertex';
  x: number;
  y: number;
}

// ── Wall ────────────────────────────────────────────────────────────────────
export type WallType = 'exterior' | 'interior' | 'partition';

/**
 * A straight wall segment between two vertices.
 *  - `a` and `b` are vertex IDs (NOT coordinates).
 *  - `thickness` and `height` are mm and define the 3D extrusion.
 *  - Direction matters: a→b. Room loops rely on this orientation.
 */
export interface Wall {
  id: WallId;
  type: 'wall';
  wallType: WallType;
  a: VertexId;
  b: VertexId;
  thickness: number;
  height: number;
}

// ── Opening ────────────────────────────────────────────────────────────────
export type OpeningKind = 'door' | 'window' | 'pass-through';

/**
 * Positioned ALONG a wall by `offset` (mm) from the wall's start vertex.
 * Width/height are mm. sillHeight is the bottom of the opening from floor
 * (0 for doors).
 */
export interface Opening {
  id: OpeningId;
  type: 'opening';
  kind: OpeningKind;
  wallId: WallId;
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
}

// ── Room ───────────────────────────────────────────────────────────────────
/**
 * A closed polygonal room defined by an ORDERED loop of wall ids.
 * `closed: true` is a tagged literal — the only way to obtain a Room is
 * through builders that guarantee invariant I-2.
 */
export interface Room {
  id: RoomId;
  type: 'room';
  name: string;
  wallLoop: WallId[];
  closed: true;
  floorHeight: number;
  ceilingHeight: number;
  tags: string[];
}

// ── Equipment ──────────────────────────────────────────────────────────────
export type EquipmentCategory =
  | 'cooking'
  | 'refrigeration'
  | 'preparation'
  | 'washing'
  | 'storage'
  | 'ventilation'
  | 'furniture'
  | 'other';

export interface Equipment {
  id: EquipmentId;
  type: 'equipment';
  catalogId: string;
  name: string;
  category: EquipmentCategory;
  position: Vec3;
  /** Yaw — rotation around world Z (radians). Existing field. */
  rotation: number;
  /**
   * Optional tilt around local X / Y axes (radians). Pivot is the footprint
   * BOTTOM-CENTER so a forward tilt rotates the item like a real object
   * tipping over (instead of swinging around its corner). Default 0.
   */
  tiltX?: number;
  tiltY?: number;
  footprint: { width: number; depth: number };
  heightMm: number;
  roomId?: RoomId;
  /**
   * Kullanıcı tarafından seçilen ayırt edici renk (hex `#rrggbb`). Tanımsızsa 2B
   * görünüm `catalogId`'den deterministik bir ton üretir; tanımlıysa hem 2B
   * dolgusu hem 3B fallback kutu tonu bunu kullanır (GLB'li ürünler dokusunu korur).
   */
  color?: string;
  /**
   * `true` ise bu ürün diğer ürünlerle ÜST ÜSTE / iç içe konabilir (ör. tezgah
   * üstü küçük cihaz). Çakışma çözmesi yalnız ÜRÜN↔ÜRÜN için atlanır; duvar
   * geçişi ve oda-içi tutma HER ZAMAN uygulanır. Katalogdan varsayılan alınır,
   * örnek bazında değiştirilebilir.
   */
  allowOverlap?: boolean;
  /**
   * Where the item is anchored. 'floor' (default / undefined for backward
   * compatibility with older saved docs) sits at z=0 on the ground; 'wall'
   * mounts flush against the nearest wall at `position.z` (mounting height),
   * facing into the room — e.g. davlumbaz / asma dolap.
   */
  mount?: 'floor' | 'wall';
  locked?: boolean;
}

// ── Render (kaydedilmiş 3B görüntü) ─────────────────────────────────────────
/**
 * Sahneden alınan yüksek kaliteli bir render/ekran görüntüsü. Görüntü verisi
 * Supabase Storage'a yüklenir ve burada yalnızca KÜÇÜK metadata (URL) tutulur;
 * dokümanın JSONB kalıcılığını şişirmemek için base64 gömmekten kaçınılır.
 * `renders` dokümanın parçası olduğundan hem Supabase'e kaydedilir hem de
 * `.json` export/import ile birlikte taşınır ("proje dosyasının içinde").
 */
export interface ProjectRender {
  id: string;
  /** Herkese açık Storage URL'i (upload başarısızsa `data:` URL'ine düşer). */
  url: string;
  /** Storage yolu — silme için (upload başarılıysa). */
  path?: string;
  width: number;
  height: number;
  /** ISO oluşturma zamanı. */
  createdAt: string;
  /** İsteğe bağlı kullanıcı notu. */
  label?: string;
  /** Yalnızca Storage upload başarısız olduğunda: küçültülmüş jpeg data URL. */
  fallbackDataUrl?: string;
}

// ── Project document ───────────────────────────────────────────────────────
export type AnyEntity = Vertex | Wall | Opening | Room | Equipment;

export interface ProjectDocument {
  id: EntityId;
  name: string;
  units: 'mm';
  vertices: Record<VertexId, Vertex>;
  walls: Record<WallId, Wall>;
  rooms: Record<RoomId, Room>;
  openings: Record<OpeningId, Opening>;
  equipment: Record<EquipmentId, Equipment>;
  /** Display / iteration order. Contains every entity id once. */
  order: EntityId[];
  /** Sahneden alınan kaydedilmiş renderlar (opsiyonel — eski dokümanlarla uyumlu). */
  renders?: ProjectRender[];
  createdAt: string;
  updatedAt: string;
}

export const EMPTY_PROJECT: ProjectDocument = Object.freeze({
  id: 'project-empty',
  name: 'Untitled Project',
  units: 'mm',
  vertices: {},
  walls: {},
  rooms: {},
  openings: {},
  equipment: {},
  order: [],
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z',
}) as ProjectDocument;
