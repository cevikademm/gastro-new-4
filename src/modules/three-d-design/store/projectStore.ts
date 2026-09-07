/**
 * Global store for the 3D Design app — refactored to the normalized model.
 *
 * Layout
 *  - `project` (TRACKED by history) — the document being edited.
 *  - `selection`, `view` (NOT tracked) — UI-only state. Undoing them would
 *    surprise users.
 *
 * Mutating policy
 *  - All domain mutations go through `commit()` → `applyOrNull()`, which
 *    produces an immutable next-state via a draft callback. Builders called
 *    inside the callback preserve schema invariants (asserted in dev).
 *  - NO-OP DETECTION: if the recipe changed nothing (e.g. `ensureVertex` found
 *    an existing vertex), the store is NOT written — no history entry, no
 *    `updatedAt` bump, no autosave round-trip.
 *  - Multi-step edits use `transaction()` / `beginTransient()` from the history
 *    middleware so they undo as ONE step.
 */

import { create } from 'zustand';
import {
  EMPTY_PROJECT,
  type AnyEntity,
  type Equipment,
  type EntityId,
  type Opening,
  type ProjectDocument,
  type RoomId,
  type Vec2,
  type VertexId,
  type WallId,
} from '../core/types';
import { newId } from '../core/id';
import {
  addWallBetween,
  createPolygonRoom,
  createRoomFromWalls as createRoomFromWallsBuilder,
  type CreatePolygonRoomOpts,
  type CreateRoomFromWallsOpts,
  getOrCreateVertex,
  moveVertex as moveVertexBuilder,
  pruneOrphanVertex,
  removeFromOrder,
  removeRoom as removeRoomBuilder,
  removeWallSafe,
  splitWall as splitWallBuilder,
  dissolveVertex as dissolveVertexBuilder,
} from '../core/builders';
import { clampOpeningOnWall, clampOpeningsOnWalls, wallsAtVertex } from '../core/openings';
import { normalizeDocument } from '../core/migrate';
import { assertProjectInvariants } from '../core/invariants';
import { withHistory, type HistoryActions, type HistoryState } from './history';

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

export type EditorMode = '2d' | '3d' | 'split';

export interface SelectionState {
  /** Selected entity ids (vertices, walls, rooms, equipment). */
  ids: EntityId[];
  hoverId: EntityId | null;
}

export interface ViewState {
  mode: EditorMode;
  zoom2d: number;
  pan2d: { x: number; y: number };
  snapGrid: number;
  showGrid: boolean;
  /**
   * Render/görünüm için gizlenmiş duvar id'leri. Bir GÖRÜNÜM durumudur (undo'suz,
   * grid toggle gibi): geniş açılı render alırken önü kapayan duvarları geçici
   * olarak görünmez yapmak için. v1'de kalıcı değildir (reload'da sıfırlanır).
   */
  hiddenWallIds: string[];
  /** 3B'de tıklanarak seçilen duvar (undo'suz, panel vurgusu için). */
  selectedWallId: string | null;
  /** 3B: oda tavanlarını göster (kamera tavanın üstündeyken otomatik gizlenir). */
  showCeiling: boolean;
  /** 3B: kameraya bakan oda duvarlarını otomatik gizle (dışarıdan bakarken iç görünsün). */
  autoHideWalls: boolean;
}

export interface ProjectSlice {
  project: ProjectDocument;
  selection: SelectionState;
  view: ViewState;

  // ── Document ─────────────────────────────────────────────────────────
  newProject: (name?: string) => void;
  loadProject: (project: ProjectDocument) => void;
  renameProject: (name: string) => void;

  // ── Generic immutable update — most actions sit on top of this ───────
  /** Apply a draft recipe. Returns true when the document actually changed. */
  update: (recipe: (draft: ProjectDocument) => void) => boolean;

  // ── Vertex actions (the BIG WIN of normalization) ────────────────────
  /**
   * Move a vertex. ALL walls referencing it follow automatically — no
   * "rebuild walls" dance needed. Openings on those walls are re-clamped.
   */
  moveVertex: (id: VertexId, to: Vec2) => void;
  /**
   * Find or create a vertex. Returns the canonical id; useful to walls /
   * room construction that may share corners.
   */
  ensureVertex: (point: Vec2, mergeMm?: number) => VertexId;

  // ── Wall actions ─────────────────────────────────────────────────────
  addWall: (a: VertexId, b: VertexId, opts?: { thickness?: number; height?: number }) => WallId;
  /**
   * Safe delete: rooms using this wall dissolve into loose walls (nothing else
   * is lost). Returns the ids of the rooms that were dissolved.
   */
  removeWall: (id: WallId) => RoomId[];
  removeWalls: (ids: ReadonlyArray<WallId>) => RoomId[];
  splitWall: (id: WallId, t: number) => { newVertexId: VertexId; newWallId: WallId };
  /** Köşeyi çöz → komşu iki duvarı birleştir (splitWall'un tersi). */
  dissolveVertex: (id: VertexId) => boolean;

  // ── Opening actions ──────────────────────────────────────────────────
  /** Add an opening (clamped to its wall). */
  addOpening: (input: Omit<Opening, 'id' | 'type'>) => string;
  /** Patch an opening; result is clamped to the (possibly new) host wall. */
  updateOpening: (id: string, patch: Partial<Omit<Opening, 'id' | 'type'>>) => void;
  removeOpening: (id: string) => void;

  // ── Room actions ─────────────────────────────────────────────────────
  /** Create a closed polygonal room (the canonical room creation API). */
  createPolygonRoom: (points: ReadonlyArray<Vec2>, opts?: CreatePolygonRoomOpts) => RoomId;
  /** Promote existing walls that form one closed loop into a room. Throws if invalid. */
  createRoomFromWalls: (wallIds: ReadonlyArray<WallId>, opts?: CreateRoomFromWallsOpts) => RoomId;
  removeRoom: (id: RoomId, opts?: { keepWalls?: boolean }) => void;

  // ── Equipment actions ────────────────────────────────────────────────
  addEquipment: (input: Omit<Equipment, 'id' | 'type'>) => string;
  removeEquipment: (id: string) => void;
  updateEquipment: (id: string, patch: Partial<Omit<Equipment, 'id' | 'type'>>) => void;

  // ── Selection (NOT tracked) ──────────────────────────────────────────
  select: (ids: EntityId[]) => void;
  toggleSelect: (id: EntityId) => void;
  clearSelection: () => void;
  setHover: (id: EntityId | null) => void;

  // ── View (NOT tracked) ───────────────────────────────────────────────
  setMode: (mode: EditorMode) => void;
  setZoom2d: (zoom: number) => void;
  setPan2d: (pan: { x: number; y: number }) => void;
  setSnapGrid: (mm: number) => void;
  toggleGrid: () => void;

  // ── Duvar görünürlüğü / seçimi (NOT tracked) ─────────────────────────
  setWallHidden: (id: WallId, hidden: boolean) => void;
  toggleWallHidden: (id: WallId) => void;
  showAllWalls: () => void;
  selectWall: (id: WallId | null) => void;
  setShowCeiling: (on: boolean) => void;
  setAutoHideWalls: (on: boolean) => void;
}

export type ProjectStore = ProjectSlice &
  HistoryState<Partial<ProjectSlice>> &
  HistoryActions;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clone(project: ProjectDocument): ProjectDocument {
  return typeof structuredClone === 'function'
    ? structuredClone(project)
    : (JSON.parse(JSON.stringify(project)) as ProjectDocument);
}

function touch(project: ProjectDocument): ProjectDocument {
  project.updatedAt = new Date().toISOString();
  return project;
}

export function makeEmptyProject(name = 'Untitled Project'): ProjectDocument {
  const now = new Date().toISOString();
  return {
    id: newId('prj'),
    name,
    schemaVersion: 2,
    units: 'mm',
    vertices: {},
    walls: {},
    rooms: {},
    openings: {},
    equipment: {},
    order: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Serialized-form cache keyed by document identity. Lets `applyOrNull` detect
 * "recipe changed nothing" with one JSON.stringify of the draft. Documents are
 * kilobytes, so this is far cheaper than a history snapshot + scene rebuild.
 */
const serializedCache = new WeakMap<ProjectDocument, string>();
function serialized(doc: ProjectDocument): string {
  let s = serializedCache.get(doc);
  if (s === undefined) {
    s = JSON.stringify(doc);
    serializedCache.set(doc, s);
  }
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

const TRACKED: ReadonlyArray<keyof ProjectSlice> = ['project'];

export const useProjectStore = create<ProjectStore>(
  withHistory<ProjectSlice>(
    (set, _get) => {
      const get = _get as unknown as () => ProjectStore;

      /**
       * Apply a draft mutation. Returns the next document, or null when the
       * recipe produced an identical document (no write, no history).
       */
      const applyOrNull = (recipe: (d: ProjectDocument) => void): ProjectDocument | null => {
        const current = get().project;
        const before = serialized(current);
        const next = clone(current);
        recipe(next);
        if (JSON.stringify(next) === before) return null;
        touch(next);
        assertProjectInvariants(next);
        return next;
      };

      /** applyOrNull + set. Returns true when the document changed. */
      const commit = (recipe: (d: ProjectDocument) => void): boolean => {
        const next = applyOrNull(recipe);
        if (!next) return false;
        set({ project: next });
        return true;
      };

      /** Replace the whole document without a history entry and reset history. */
      const replaceDocument = (doc: ProjectDocument): void => {
        get().withoutHistory(() => set({ project: doc }));
        get().clearHistory();
      };

      return ({
        project: makeEmptyProject(),
        selection: { ids: [], hoverId: null },
        view: {
          mode: '2d',
          zoom2d: 0.05,
          pan2d: { x: 0, y: 0 },
          snapGrid: 50,
          showGrid: true,
          hiddenWallIds: [],
          selectedWallId: null,
          showCeiling: false,
          autoHideWalls: true,
        },

        // ── Document ────────────────────────────────────────────────
        newProject: (name) => replaceDocument(makeEmptyProject(name)),
        loadProject: (project) => replaceDocument(normalizeDocument(clone(project))),
        renameProject: (name) => {
          commit((d) => { d.name = name; });
        },

        // ── Generic update ──────────────────────────────────────────
        update: (recipe) => commit(recipe),

        // ── Vertex ──────────────────────────────────────────────────
        moveVertex: (id, to) => {
          commit((d) => {
            moveVertexBuilder(d, id, to);
            clampOpeningsOnWalls(d, wallsAtVertex(d, id));
          });
        },
        ensureVertex: (point, mergeMm) => {
          let id: VertexId = '' as VertexId;
          commit((d) => {
            id = getOrCreateVertex(d, point, mergeMm);
          });
          return id;
        },

        // ── Walls ──────────────────────────────────────────────────
        addWall: (a, b, opts) => {
          let id: WallId = '' as WallId;
          commit((d) => {
            id = addWallBetween(d, a, b, opts);
          });
          return id;
        },
        removeWall: (id) => {
          let dissolved: RoomId[] = [];
          commit((d) => {
            dissolved = removeWallSafe(d, id).dissolvedRooms;
          });
          return dissolved;
        },
        removeWalls: (ids) => {
          const dissolved: RoomId[] = [];
          commit((d) => {
            for (const id of ids) dissolved.push(...removeWallSafe(d, id).dissolvedRooms);
          });
          return Array.from(new Set(dissolved));
        },
        splitWall: (id, t) => {
          let result: { newVertexId: VertexId; newWallId: WallId } = {
            newVertexId: '' as VertexId,
            newWallId: '' as WallId,
          };
          commit((d) => {
            result = splitWallBuilder(d, id, t);
          });
          return result;
        },
        dissolveVertex: (id) => {
          let ok = false;
          commit((d) => {
            ok = dissolveVertexBuilder(d, id);
          });
          return ok;
        },

        // ── Openings ───────────────────────────────────────────────
        addOpening: (input) => {
          const id = newId('o');
          commit((d) => {
            const op = { id, type: 'opening', ...input } as Opening;
            d.openings[id] = op;
            d.order.push(id);
            clampOpeningOnWall(d, op);
          });
          return id;
        },
        updateOpening: (id, patch) => {
          commit((d) => {
            const op = d.openings[id];
            if (!op) return;
            Object.assign(op, patch);
            clampOpeningOnWall(d, op);
          });
        },
        removeOpening: (id) => {
          commit((d) => {
            if (!d.openings[id]) return;
            delete d.openings[id];
            removeFromOrder(d, id);
          });
        },

        // ── Rooms ──────────────────────────────────────────────────
        createPolygonRoom: (points, opts) => {
          let id: RoomId = '' as RoomId;
          commit((d) => {
            id = createPolygonRoom(d, points, opts);
          });
          return id;
        },
        createRoomFromWalls: (wallIds, opts) => {
          let id: RoomId = '' as RoomId;
          commit((d) => {
            id = createRoomFromWallsBuilder(d, wallIds, opts);
          });
          return id;
        },
        removeRoom: (id, opts) => {
          commit((d) => {
            removeRoomBuilder(d, id, opts);
          });
        },

        // ── Equipment ──────────────────────────────────────────────
        addEquipment: (input) => {
          const id = newId('eq');
          commit((d) => {
            d.equipment[id] = { id, type: 'equipment', ...input } as Equipment;
            d.order.push(id);
          });
          return id;
        },
        removeEquipment: (id) => {
          commit((d) => {
            if (!d.equipment[id]) return;
            delete d.equipment[id];
            removeFromOrder(d, id);
          });
        },
        updateEquipment: (id, patch) => {
          commit((d) => {
            const eq = d.equipment[id];
            if (eq) Object.assign(eq, patch);
          });
        },

        // ── Selection ──────────────────────────────────────────────
        select: (ids) => {
          get().withoutHistory(() =>
            set((s) => ({ selection: { ...s.selection, ids: [...ids] } })),
          );
        },
        toggleSelect: (id) => {
          get().withoutHistory(() =>
            set((s) => {
              const has = s.selection.ids.includes(id);
              return {
                selection: {
                  ...s.selection,
                  ids: has
                    ? s.selection.ids.filter((x) => x !== id)
                    : [...s.selection.ids, id],
                },
              };
            }),
          );
        },
        clearSelection: () => {
          get().withoutHistory(() =>
            set((s) => ({ selection: { ...s.selection, ids: [] } })),
          );
        },
        setHover: (id) => {
          get().withoutHistory(() =>
            set((s) => ({ selection: { ...s.selection, hoverId: id } })),
          );
        },

        // ── View ───────────────────────────────────────────────────
        setMode: (mode) => {
          get().withoutHistory(() => set((s) => ({ view: { ...s.view, mode } })));
        },
        setZoom2d: (zoom) => {
          get().withoutHistory(() =>
            set((s) => ({
              view: { ...s.view, zoom2d: Math.max(0.001, Math.min(10, zoom)) },
            })),
          );
        },
        setPan2d: (pan) => {
          get().withoutHistory(() =>
            set((s) => ({ view: { ...s.view, pan2d: { ...pan } } })),
          );
        },
        setSnapGrid: (mm) => {
          get().withoutHistory(() =>
            set((s) => ({ view: { ...s.view, snapGrid: Math.max(0, mm) } })),
          );
        },
        toggleGrid: () => {
          get().withoutHistory(() =>
            set((s) => ({ view: { ...s.view, showGrid: !s.view.showGrid } })),
          );
        },

        // ── Duvar görünürlüğü / seçimi (NOT tracked) ────────────────
        setWallHidden: (id, hidden) => {
          get().withoutHistory(() =>
            set((s) => {
              const has = s.view.hiddenWallIds.includes(id);
              if (hidden === has) return {} as Partial<ProjectStore>;
              return {
                view: {
                  ...s.view,
                  hiddenWallIds: hidden
                    ? [...s.view.hiddenWallIds, id]
                    : s.view.hiddenWallIds.filter((x) => x !== id),
                },
              };
            }),
          );
        },
        toggleWallHidden: (id) => {
          get().withoutHistory(() =>
            set((s) => {
              const has = s.view.hiddenWallIds.includes(id);
              return {
                view: {
                  ...s.view,
                  hiddenWallIds: has
                    ? s.view.hiddenWallIds.filter((x) => x !== id)
                    : [...s.view.hiddenWallIds, id],
                },
              };
            }),
          );
        },
        showAllWalls: () => {
          get().withoutHistory(() =>
            set((s) =>
              s.view.hiddenWallIds.length === 0
                ? ({} as Partial<ProjectStore>)
                : { view: { ...s.view, hiddenWallIds: [] } },
            ),
          );
        },
        selectWall: (id) => {
          get().withoutHistory(() =>
            set((s) => ({ view: { ...s.view, selectedWallId: id } })),
          );
        },
        setShowCeiling: (on) => {
          get().withoutHistory(() => set((s) => ({ view: { ...s.view, showCeiling: on } })));
        },
        setAutoHideWalls: (on) => {
          get().withoutHistory(() => set((s) => ({ view: { ...s.view, autoHideWalls: on } })));
        },
      });
    },
    TRACKED,
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const selectProject = (s: ProjectStore) => s.project;
export const selectSelection = (s: ProjectStore) => s.selection;
export const selectView = (s: ProjectStore) => s.view;
export const selectCanUndo = (s: ProjectStore) => s.canUndo();
export const selectCanRedo = (s: ProjectStore) => s.canRedo();

// Silence unused-import warnings for the empty re-export shape.
void EMPTY_PROJECT;
void ((_: AnyEntity) => _);
void pruneOrphanVertex;
