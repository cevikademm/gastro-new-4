/**
 * Global store for the 3D Design app — refactored to the normalized model.
 *
 * Layout
 *  - `project` (TRACKED by history) — the document being edited.
 *  - `selection`, `view` (NOT tracked) — UI-only state. Undoing them would
 *    surprise users.
 *
 * Mutating policy
 *  - All domain mutations go through `update()`, which produces an
 *    immutable next-state via a draft callback. Builders called inside the
 *    callback preserve schema invariants (asserted in dev).
 *  - This means new actions added in later phases automatically participate
 *    in undo/redo without writing inverse operations.
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
  type CreatePolygonRoomOpts,
  getOrCreateVertex,
  moveVertex as moveVertexBuilder,
  pruneOrphanVertex,
  removeRoom as removeRoomBuilder,
  splitWall as splitWallBuilder,
  dissolveVertex as dissolveVertexBuilder,
} from '../core/builders';
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
  update: (recipe: (draft: ProjectDocument) => void) => void;

  // ── Vertex actions (the BIG WIN of normalization) ────────────────────
  /**
   * Move a vertex. ALL walls referencing it follow automatically — no
   * "rebuild walls" dance needed.
   */
  moveVertex: (id: VertexId, to: Vec2) => void;
  /**
   * Find or create a vertex. Returns the canonical id; useful to walls /
   * room construction that may share corners.
   */
  ensureVertex: (point: Vec2, mergeMm?: number) => VertexId;

  // ── Wall actions ─────────────────────────────────────────────────────
  addWall: (a: VertexId, b: VertexId, opts?: { thickness?: number; height?: number }) => WallId;
  removeWall: (id: WallId) => void;
  splitWall: (id: WallId, t: number) => { newVertexId: VertexId; newWallId: WallId };
  /** Köşeyi çöz → komşu iki duvarı birleştir (splitWall'un tersi). */
  dissolveVertex: (id: VertexId) => boolean;

  // ── Opening actions ──────────────────────────────────────────────────
  addOpening: (input: Omit<Opening, 'id' | 'type'>) => string;
  removeOpening: (id: string) => void;

  // ── Room actions ─────────────────────────────────────────────────────
  /** Create a closed polygonal room (the canonical room creation API). */
  createPolygonRoom: (points: ReadonlyArray<Vec2>, opts?: CreatePolygonRoomOpts) => RoomId;
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

function makeEmpty(name = 'Untitled Project'): ProjectDocument {
  const now = new Date().toISOString();
  return {
    id: newId('prj'),
    name,
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

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

const TRACKED: ReadonlyArray<keyof ProjectSlice> = ['project'];

export const useProjectStore = create<ProjectStore>(
  withHistory<ProjectSlice>(
    (set, _get) => {
      const get = _get as unknown as () => ProjectStore;

      /** Apply a draft mutation, then assert invariants in dev. */
      const apply = (recipe: (d: ProjectDocument) => void): ProjectDocument => {
        const next = clone(get().project);
        recipe(next);
        touch(next);
        assertProjectInvariants(next);
        return next;
      };

      return ({
        project: makeEmpty(),
        selection: { ids: [], hoverId: null },
        view: {
          mode: '2d',
          zoom2d: 0.05,
          pan2d: { x: 0, y: 0 },
          snapGrid: 50,
          showGrid: true,
        },

        // ── Document ────────────────────────────────────────────────
        newProject: (name) => set({ project: makeEmpty(name) }),
        loadProject: (project) => set({ project: clone(project) }),
        renameProject: (name) => {
          set({ project: apply((d) => { d.name = name; }) });
        },

        // ── Generic update ──────────────────────────────────────────
        update: (recipe) => set({ project: apply(recipe) }),

        // ── Vertex ──────────────────────────────────────────────────
        moveVertex: (id, to) => {
          set({ project: apply((d) => { moveVertexBuilder(d, id, to); }) });
        },
        ensureVertex: (point, mergeMm) => {
          let id: VertexId = '' as VertexId;
          set({
            project: apply((d) => {
              id = getOrCreateVertex(d, point, mergeMm);
            }),
          });
          return id;
        },

        // ── Walls ──────────────────────────────────────────────────
        addWall: (a, b, opts) => {
          let id: WallId = '' as WallId;
          set({
            project: apply((d) => {
              id = addWallBetween(d, a, b, opts);
            }),
          });
          return id;
        },
        removeWall: (id) => {
          set({
            project: apply((d) => {
              const w = d.walls[id];
              if (!w) return;
              delete d.walls[id];
              // Cascade: openings on this wall.
              for (const o of Object.values(d.openings)) {
                if (o.wallId === id) delete d.openings[o.id];
              }
              // Detach from any rooms referencing it.
              for (const r of Object.values(d.rooms)) {
                const idx = r.wallLoop.indexOf(id);
                if (idx !== -1) r.wallLoop.splice(idx, 1);
              }
              const ord = d.order.indexOf(id);
              if (ord !== -1) d.order.splice(ord, 1);
              // Try pruning newly-orphaned vertices.
              pruneOrphanVertex(d, w.a);
              pruneOrphanVertex(d, w.b);
            }),
          });
        },
        splitWall: (id, t) => {
          let result: { newVertexId: VertexId; newWallId: WallId } = {
            newVertexId: '' as VertexId,
            newWallId: '' as WallId,
          };
          set({
            project: apply((d) => {
              result = splitWallBuilder(d, id, t);
            }),
          });
          return result;
        },
        dissolveVertex: (id) => {
          let ok = false;
          set({
            project: apply((d) => {
              ok = dissolveVertexBuilder(d, id);
            }),
          });
          return ok;
        },

        // ── Openings ───────────────────────────────────────────────
        addOpening: (input) => {
          const id = newId('o');
          set({
            project: apply((d) => {
              d.openings[id] = { id, type: 'opening', ...input } as Opening;
              d.order.push(id);
            }),
          });
          return id;
        },
        removeOpening: (id) => {
          set({
            project: apply((d) => {
              delete d.openings[id];
              const ord = d.order.indexOf(id);
              if (ord !== -1) d.order.splice(ord, 1);
            }),
          });
        },

        // ── Rooms ──────────────────────────────────────────────────
        createPolygonRoom: (points, opts) => {
          let id: RoomId = '' as RoomId;
          set({
            project: apply((d) => {
              id = createPolygonRoom(d, points, opts);
            }),
          });
          return id;
        },
        removeRoom: (id, opts) => {
          set({
            project: apply((d) => {
              removeRoomBuilder(d, id, opts);
            }),
          });
        },

        // ── Equipment ──────────────────────────────────────────────
        addEquipment: (input) => {
          const id = newId('eq');
          set({
            project: apply((d) => {
              d.equipment[id] = { id, type: 'equipment', ...input } as Equipment;
              d.order.push(id);
            }),
          });
          return id;
        },
        removeEquipment: (id) => {
          set({
            project: apply((d) => {
              delete d.equipment[id];
              const ord = d.order.indexOf(id);
              if (ord !== -1) d.order.splice(ord, 1);
            }),
          });
        },
        updateEquipment: (id, patch) => {
          set({
            project: apply((d) => {
              const eq = d.equipment[id];
              if (eq) Object.assign(eq, patch);
            }),
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
