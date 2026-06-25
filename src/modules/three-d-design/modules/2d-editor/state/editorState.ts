/**
 * Local 2D editor state — pan, zoom, active tool, in-progress polygon.
 *
 * Why a separate Zustand store and not part of the global one?
 *  - These values change at pointer-event cadence; coupling them to undo or
 *    to the 3D editor would either pollute history or thrash unrelated views.
 *  - The 3D editor will get its own analogous store in Phase 4 (orbit camera,
 *    selection volume, etc.).
 */

import { create } from 'zustand';
import type { Vec2 } from '../../../core/types';

export type Tool =
  | 'select'
  | 'draw-room'
  | 'draw-wall'
  | 'pan'
  | 'place-door'
  | 'place-window';

export interface Editor2DState {
  // Viewport (Konva-stage scale + offset, NOT mm)
  scale: number;
  offsetX: number;
  offsetY: number;

  // Active tool
  tool: Tool;

  // In-progress polygon (world mm). Empty when not drawing.
  draftPoints: Vec2[];
  /** Live cursor position in world mm — drives the rubber-band line. */
  draftCursor: Vec2 | null;

  // Selection (polygon vertex indices, edge indices, or wall/opening ids)
  selectedRoomId: string | null;
  selectedVertex: number | null;
  selectedEdge: number | null;
  selectedOpeningId: string | null;
  /** Free-form (loose) wall id — partition walls drawn with the W tool. */
  selectedWallId: string | null;

  // Snap state for HUD
  snapHit: { type: 'vertex' | 'grid' | 'edge'; point: Vec2 } | null;

  /** Shared focus point (world mm) — keeps 2D pan ↔ 3D camera target aligned
   *  when switching editors. Null until a view is established. */
  focusWorld: Vec2 | null;

  // Actions
  setTool: (tool: Tool) => void;
  setFocusWorld: (p: Vec2 | null) => void;
  setViewport: (scale: number, offsetX: number, offsetY: number) => void;
  setScale: (scale: number) => void;
  setOffset: (x: number, y: number) => void;

  beginDraft: (start: Vec2) => void;
  pushDraftPoint: (p: Vec2) => void;
  setDraftCursor: (p: Vec2 | null) => void;
  cancelDraft: () => void;

  selectRoom: (id: string | null) => void;
  selectVertex: (i: number | null) => void;
  selectEdge: (i: number | null) => void;
  selectOpening: (id: string | null) => void;
  selectWall: (id: string | null) => void;

  setSnapHit: (s: Editor2DState['snapHit']) => void;
}

export const useEditor2DState = create<Editor2DState>((set) => ({
  scale: 0.05, // 1 mm = 0.05 px (≈ 1 m = 50 px @ default zoom)
  offsetX: 200,
  offsetY: 200,

  tool: 'draw-room',

  draftPoints: [],
  draftCursor: null,

  selectedRoomId: null,
  selectedVertex: null,
  selectedEdge: null,
  selectedOpeningId: null,
  selectedWallId: null,

  snapHit: null,
  focusWorld: null,

  setTool: (tool) => set({ tool, draftPoints: [], draftCursor: null }),
  setFocusWorld: (focusWorld) => set({ focusWorld }),
  setViewport: (scale, offsetX, offsetY) => set({ scale, offsetX, offsetY }),
  setScale: (scale) => set({ scale }),
  setOffset: (offsetX, offsetY) => set({ offsetX, offsetY }),

  beginDraft: (start) => set({ draftPoints: [start], draftCursor: start }),
  pushDraftPoint: (p) => set((s) => ({ draftPoints: [...s.draftPoints, p] })),
  setDraftCursor: (p) => set({ draftCursor: p }),
  cancelDraft: () => set({ draftPoints: [], draftCursor: null }),

  selectRoom: (id) =>
    set({
      selectedRoomId: id,
      selectedVertex: null,
      selectedEdge: null,
      selectedOpeningId: null,
      selectedWallId: null,
    }),
  selectVertex: (i) =>
    set({ selectedVertex: i, selectedEdge: null, selectedOpeningId: null, selectedWallId: null }),
  selectEdge: (i) =>
    set({ selectedEdge: i, selectedVertex: null, selectedOpeningId: null, selectedWallId: null }),
  selectOpening: (id) =>
    set({ selectedOpeningId: id, selectedVertex: null, selectedEdge: null, selectedWallId: null }),
  selectWall: (id) =>
    set({
      selectedWallId: id,
      selectedVertex: null,
      selectedEdge: null,
      selectedOpeningId: null,
    }),

  setSnapHit: (snapHit) => set({ snapHit }),
}));
