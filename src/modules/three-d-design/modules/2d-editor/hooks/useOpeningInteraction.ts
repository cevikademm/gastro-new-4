/**
 * useOpeningInteraction — place doors / windows / pass-throughs on ANY wall,
 * slide them along the wall, resize with the end handles.
 *
 * Drag is manual (not Konva node drag): the opening symbol draws in absolute
 * world coordinates, so we project the pointer onto the host wall axis and
 * keep a preview offset/width in local state; ONE store write on release.
 */

import { useCallback, useRef, useState } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Opening, OpeningKind, ProjectDocument, Vec2, WallId } from '../../../core/types';
import { dot2, normalize2, sub2 } from '../../../core/math';
import { clampOpeningOnWall, defaultOpeningAt, nearestWallHit } from '../../../core/openings';
import { useProjectStore } from '../../../store';
import { useEditor2DState, type Tool } from '../state/editorState';

interface DragState {
  id: string;
  mode: 'slide' | 'width';
  end?: 'start' | 'end';
  wallId: string;
  /** Pointer u minus opening offset at grab time (slide). */
  grabU: number;
  startOffset: number;
  startWidth: number;
  moved: boolean;
}

interface Args {
  project: ProjectDocument;
  scale: number;
  stageToWorld: (sx: number, sy: number) => Vec2;
}

const PLACE_RADIUS_PX = 40;

export function useOpeningInteraction({ project, scale, stageToWorld }: Args) {
  const dragRef = useRef<DragState | null>(null);
  const [previewOffset, setPreviewOffset] = useState<Record<string, number> | undefined>(undefined);
  const [previewWidth, setPreviewWidth] = useState<Record<string, number> | undefined>(undefined);
  const [liveId, setLiveId] = useState<string | null>(null);

  const st = () => useProjectStore.getState();
  const ed = () => useEditor2DState.getState();

  /** Along-wall coordinate (mm from wall.a) of a world point. */
  const uOnWall = useCallback((wallId: string, p: Vec2): number | null => {
    const proj = st().project;
    const w = proj.walls[wallId];
    if (!w) return null;
    const a = proj.vertices[w.a];
    const b = proj.vertices[w.b];
    if (!a || !b) return null;
    const dir = normalize2(sub2(b, a));
    return dot2(sub2(p, a), dir);
  }, []);

  const pointerWorld = (evt: KonvaEventObject<PointerEvent>): Vec2 | null => {
    const stage = evt.target.getStage();
    const pos = stage?.getPointerPosition();
    return pos ? stageToWorld(pos.x, pos.y) : null;
  };

  /** Clamped preview of an opening with a patched offset/width. */
  const clampedPreview = useCallback((id: string, patch: Partial<Opening>): Opening | null => {
    const proj = st().project;
    const op = proj.openings[id];
    if (!op) return null;
    const tmp: Opening = { ...op, ...patch };
    // clampOpeningOnWall pushes away from siblings including the ORIGINAL
    // position of this same opening? No — it skips `op.id`, so fine.
    clampOpeningOnWall(proj, tmp);
    return tmp;
  }, []);

  // ── Pointer down on an opening body ──────────────────────────────────────
  const onOpeningPointerDown = useCallback(
    (id: string, evt: KonvaEventObject<PointerEvent>) => {
      const e = ed();
      const op = st().project.openings[id];
      if (!op) return;
      const additive = evt.evt.shiftKey;
      e.select({ kind: 'opening', id }, { additive });
      // Activate the room owning this wall (dimensions follow).
      for (const r of Object.values(st().project.rooms)) {
        if (r.wallLoop.includes(op.wallId)) {
          e.setActiveRoom(r.id);
          break;
        }
      }
      if (e.tool !== 'select' || evt.evt.button !== 0) return;
      const world = pointerWorld(evt);
      if (!world) return;
      const u = uOnWall(op.wallId, world);
      if (u === null) return;
      dragRef.current = {
        id,
        mode: 'slide',
        wallId: op.wallId,
        grabU: u - op.offset,
        startOffset: op.offset,
        startWidth: op.width,
        moved: false,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uOnWall, stageToWorld],
  );

  const onHandleDown = useCallback(
    (id: string, end: 'start' | 'end', evt: KonvaEventObject<PointerEvent>) => {
      const op = st().project.openings[id];
      if (!op || evt.evt.button !== 0) return;
      dragRef.current = {
        id,
        mode: 'width',
        end,
        wallId: op.wallId,
        grabU: 0,
        startOffset: op.offset,
        startWidth: op.width,
        moved: false,
      };
      setLiveId(id);
    },
    [],
  );

  // ── Stage-level move / up (called by the editor) ─────────────────────────
  const onStageMove = useCallback(
    (world: Vec2): boolean => {
      const d = dragRef.current;
      if (!d) return false;
      const u = uOnWall(d.wallId, world);
      if (u === null) return true;
      d.moved = true;
      if (d.mode === 'slide') {
        const p = clampedPreview(d.id, { offset: u - d.grabU });
        if (p) setPreviewOffset({ [d.id]: p.offset });
        setLiveId(d.id);
      } else if (d.end === 'end') {
        const p = clampedPreview(d.id, { width: u - d.startOffset });
        if (p) setPreviewWidth({ [d.id]: p.width });
      } else {
        const right = d.startOffset + d.startWidth;
        const newOffset = Math.min(u, right - 100);
        const p = clampedPreview(d.id, { offset: newOffset, width: right - newOffset });
        if (p) {
          setPreviewOffset({ [d.id]: p.offset });
          setPreviewWidth({ [d.id]: p.width });
        }
      }
      return true;
    },
    [clampedPreview, uOnWall],
  );

  const onStageUp = useCallback((): boolean => {
    const d = dragRef.current;
    if (!d) return false;
    dragRef.current = null;
    if (d.moved) {
      const patch: Partial<Opening> = {};
      const po = previewOffset?.[d.id];
      const pw = previewWidth?.[d.id];
      if (po !== undefined) patch.offset = po;
      if (pw !== undefined) patch.width = pw;
      if (Object.keys(patch).length > 0) st().updateOpening(d.id, patch);
    }
    setPreviewOffset(undefined);
    setPreviewWidth(undefined);
    setLiveId(null);
    return true;
  }, [previewOffset, previewWidth]);

  const isDragging = useCallback(() => dragRef.current !== null, []);

  // ── Placement (place-door / place-window / place-pass) ───────────────────
  const kindForTool = (tool: Tool): OpeningKind | null =>
    tool === 'place-door' ? 'door' : tool === 'place-window' ? 'window' : tool === 'place-pass' ? 'pass-through' : null;

  const placeAt = useCallback(
    (rawWorld: Vec2, keepTool: boolean): boolean => {
      const e = ed();
      const kind = kindForTool(e.tool);
      if (!kind) return false;
      const proj = st().project;
      const hit = nearestWallHit(proj, rawWorld, PLACE_RADIUS_PX / scale);
      if (!hit) return true; // tool consumed the click, nothing placed
      const id = st().addOpening(defaultOpeningAt(proj, kind, hit.wallId as WallId, hit.t));
      e.select({ kind: 'opening', id });
      for (const r of Object.values(proj.rooms)) {
        if (r.wallLoop.includes(hit.wallId)) {
          e.setActiveRoom(r.id);
          break;
        }
      }
      if (!keepTool) e.setTool('select');
      return true;
    },
    [scale],
  );

  /** Hover feedback for the placement tools: which wall would receive it. */
  const hoverWallFor = useCallback(
    (rawWorld: Vec2): string | null => nearestWallHit(project, rawWorld, PLACE_RADIUS_PX / scale)?.wallId ?? null,
    [project, scale],
  );

  return {
    previewOffset,
    previewWidth,
    liveId,
    onOpeningPointerDown,
    onHandleDown,
    onStageMove,
    onStageUp,
    isDragging,
    placeAt,
    hoverWallFor,
  };
}

export type OpeningInteraction = ReturnType<typeof useOpeningInteraction>;
