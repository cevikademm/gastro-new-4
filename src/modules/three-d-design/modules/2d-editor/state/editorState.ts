/**
 * Local 2D editor state — viewport, active tool, in-progress draft, UNIFIED
 * selection, snap feedback, keyboard-entry HUD, context menu.
 *
 * Why a separate Zustand store and not part of the global one?
 *  - These values change at pointer-event cadence; coupling them to undo or
 *    to the 3D editor would either pollute history or thrash unrelated views.
 *
 * Selection model
 *  - ONE list of `{kind, id}` refs for walls, vertices, openings, rooms and
 *    equipment. `selection[0]` is the primary (drives the properties panel);
 *    Shift-click appends. Every wall — room wall or free partition — is
 *    selectable by id; there is no index-based edge selection any more.
 *  - `activeRoomId` is the room whose dimensions / angle pills are shown. It
 *    is NOT a selection: selecting a room's wall activates that room too.
 */

import { create } from 'zustand';
import type { Vec2 } from '../../../core/types';

export type Tool =
  | 'select'
  | 'draw-room'
  | 'draw-rect'
  | 'draw-wall'
  | 'pan'
  | 'place-door'
  | 'place-window'
  | 'place-pass';

export type SelKind = 'wall' | 'vertex' | 'opening' | 'room' | 'equipment';
export interface SelectionRef {
  kind: SelKind;
  id: string;
}

export type SnapKind =
  | 'vertex'
  | 'draft'
  | 'edge'
  | 'midpoint'
  | 'perpendicular'
  | 'extension'
  | 'ortho'
  | 'grid';
export interface SnapHit {
  kind: SnapKind;
  point: Vec2;
  /** Wall the snap came from (edge / midpoint / perpendicular). */
  wallId?: string;
  /** Parameter along that wall (0..1). */
  t?: number;
  /** Anchor the snap line starts from (ortho / extension). */
  from?: Vec2;
}

export type LengthUnit = 'mm' | 'cm' | 'm';

export interface EntryState {
  field: 'length' | 'angle';
  length: string;
  angle: string;
}

export interface ContextMenuState {
  /** Screen position (px, relative to the editor host). */
  x: number;
  y: number;
  /** World position (mm) of the click. */
  world: Vec2;
  target: SelectionRef | { kind: 'canvas' };
}

export interface Editor2DState {
  // Viewport (Konva-stage scale + offset, NOT mm)
  scale: number;
  offsetX: number;
  offsetY: number;

  // Active tool
  tool: Tool;
  /** Space held → temporary pan (tool + draft preserved). */
  spacePan: boolean;

  // In-progress polygon / chain (world mm). Empty when not drawing.
  draftPoints: Vec2[];
  /** Live (snapped) cursor position in world mm — drives the rubber band. */
  draftCursor: Vec2 | null;
  /** Wall ids created by the CURRENT free-hand chain (for room split detection). */
  draftChainWallIds: string[];

  // Selection
  selection: SelectionRef[];
  activeRoomId: string | null;
  hover: SelectionRef | null;

  // Snap / drawing aids
  snapHit: SnapHit | null;
  snapOn: boolean;
  orthoOn: boolean;
  gridMm: number;
  showGrid: boolean;
  showDims: boolean;
  lengthUnit: LengthUnit;
  /** Defaults applied to NEW walls / rooms (mm). */
  defaultThickness: number;
  defaultHeight: number;

  // Keyboard length/angle entry while drawing
  entry: EntryState | null;

  // Right-click / long-press menu
  contextMenu: ContextMenuState | null;

  /** Shared focus point (world mm) — keeps 2D pan ↔ 3D camera target aligned. */
  focusWorld: Vec2 | null;

  // ── Actions ─────────────────────────────────────────────────────────
  setTool: (tool: Tool) => void;
  setSpacePan: (on: boolean) => void;
  setFocusWorld: (p: Vec2 | null) => void;
  setViewport: (scale: number, offsetX: number, offsetY: number) => void;
  setScale: (scale: number) => void;
  setOffset: (x: number, y: number) => void;

  beginDraft: (start: Vec2) => void;
  pushDraftPoint: (p: Vec2) => void;
  popDraftPoint: () => void;
  setDraftCursor: (p: Vec2 | null) => void;
  pushDraftChainWall: (wallId: string) => void;
  cancelDraft: () => void;

  select: (refs: SelectionRef | SelectionRef[], opts?: { additive?: boolean }) => void;
  toggle: (ref: SelectionRef) => void;
  clearSelection: () => void;
  setActiveRoom: (id: string | null) => void;
  setHover: (ref: SelectionRef | null) => void;

  setSnapHit: (s: SnapHit | null) => void;
  setSnapOn: (on: boolean) => void;
  setOrthoOn: (on: boolean) => void;
  setGridMm: (mm: number) => void;
  setShowGrid: (on: boolean) => void;
  setShowDims: (on: boolean) => void;
  setLengthUnit: (u: LengthUnit) => void;
  setDefaultThickness: (mm: number) => void;
  setDefaultHeight: (mm: number) => void;

  openEntry: (field: 'length' | 'angle', seed?: string) => void;
  updateEntry: (patch: Partial<EntryState>) => void;
  closeEntry: () => void;

  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
}

const sameRef = (a: SelectionRef, b: SelectionRef) => a.kind === b.kind && a.id === b.id;

export const useEditor2DState = create<Editor2DState>((set) => ({
  scale: 0.05, // 1 mm = 0.05 px (≈ 1 m = 50 px @ default zoom)
  offsetX: 200,
  offsetY: 200,

  tool: 'select',
  spacePan: false,

  draftPoints: [],
  draftCursor: null,
  draftChainWallIds: [],

  selection: [],
  activeRoomId: null,
  hover: null,

  snapHit: null,
  snapOn: true,
  orthoOn: false,
  gridMm: 100,
  showGrid: true,
  showDims: true,
  lengthUnit: 'mm',
  defaultThickness: 150,
  defaultHeight: 3000,

  entry: null,
  contextMenu: null,
  focusWorld: null,

  setTool: (tool) =>
    set({ tool, draftPoints: [], draftCursor: null, draftChainWallIds: [], entry: null, snapHit: null }),
  setSpacePan: (spacePan) => set({ spacePan }),
  setFocusWorld: (focusWorld) => set({ focusWorld }),
  setViewport: (scale, offsetX, offsetY) => set({ scale, offsetX, offsetY }),
  setScale: (scale) => set({ scale }),
  setOffset: (offsetX, offsetY) => set({ offsetX, offsetY }),

  beginDraft: (start) => set({ draftPoints: [start], draftCursor: start, draftChainWallIds: [] }),
  pushDraftPoint: (p) => set((s) => ({ draftPoints: [...s.draftPoints, p] })),
  popDraftPoint: () => set((s) => ({ draftPoints: s.draftPoints.slice(0, -1) })),
  setDraftCursor: (p) => set({ draftCursor: p }),
  pushDraftChainWall: (wallId) => set((s) => ({ draftChainWallIds: [...s.draftChainWallIds, wallId] })),
  cancelDraft: () => set({ draftPoints: [], draftCursor: null, draftChainWallIds: [], entry: null }),

  select: (refs, opts) =>
    set((s) => {
      const list = Array.isArray(refs) ? refs : [refs];
      const next = opts?.additive
        ? [...s.selection.filter((r) => !list.some((l) => sameRef(l, r))), ...list]
        : list;
      return { selection: next, contextMenu: null };
    }),
  toggle: (ref) =>
    set((s) => ({
      selection: s.selection.some((r) => sameRef(r, ref))
        ? s.selection.filter((r) => !sameRef(r, ref))
        : [...s.selection, ref],
    })),
  clearSelection: () => set({ selection: [] }),
  setActiveRoom: (activeRoomId) => set({ activeRoomId }),
  setHover: (hover) => set({ hover }),

  setSnapHit: (snapHit) => set({ snapHit }),
  setSnapOn: (snapOn) => set({ snapOn }),
  setOrthoOn: (orthoOn) => set({ orthoOn }),
  setGridMm: (gridMm) => set({ gridMm: Math.max(1, gridMm) }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowDims: (showDims) => set({ showDims }),
  setLengthUnit: (lengthUnit) => set({ lengthUnit }),
  setDefaultThickness: (mm) => set({ defaultThickness: Math.max(10, Math.min(1000, Math.round(mm))) }),
  setDefaultHeight: (mm) => set({ defaultHeight: Math.max(100, Math.min(10000, Math.round(mm))) }),

  openEntry: (field, seed = '') =>
    set((s) => ({
      entry: {
        field,
        length: field === 'length' ? seed : s.entry?.length ?? '',
        angle: field === 'angle' ? seed : s.entry?.angle ?? '',
      },
    })),
  updateEntry: (patch) => set((s) => (s.entry ? { entry: { ...s.entry, ...patch } } : {})),
  closeEntry: () => set({ entry: null }),

  openContextMenu: (contextMenu) => set({ contextMenu }),
  closeContextMenu: () => set({ contextMenu: null }),
}));

// ── Pure selection helpers ──────────────────────────────────────────────────

export const primaryOf = (sel: ReadonlyArray<SelectionRef>): SelectionRef | null => sel[0] ?? null;

export function idsOfKind(sel: ReadonlyArray<SelectionRef>, kind: SelKind): string[] {
  const out: string[] = [];
  for (const r of sel) if (r.kind === kind) out.push(r.id);
  return out;
}

export function isSelected(sel: ReadonlyArray<SelectionRef>, kind: SelKind, id: string): boolean {
  return sel.some((r) => r.kind === kind && r.id === id);
}

/** Convert a length typed by the user (in `unit`) to mm. */
export function entryToMm(value: string, unit: LengthUnit): number | null {
  const n = Number.parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return unit === 'mm' ? n : unit === 'cm' ? n * 10 : n * 1000;
}
