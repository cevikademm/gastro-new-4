/**
 * useDrawTool — room polygon, rectangle room and free-hand wall chain drawing.
 *
 *  - draw-room : click points, click the start (or Enter) to close → Room.
 *  - draw-rect : two clicks (opposite corners) → Room.
 *  - draw-wall : every click adds a wall from the previous point. Clicking on
 *                an existing wall's edge SPLITS it so the chain connects.
 *                When the chain closes a loop the loop becomes a Room; when it
 *                bridges two points of one room's loop that room is split in two
 *                (the partition is shared by both).
 *  - Keyboard entry: with a draft open, typing digits opens the HUD; Enter
 *                places the next point at `last + dir · length` (dir from the
 *                cursor or the typed angle). Tab toggles length ↔ angle.
 *
 * Every click that mutates the document runs in ONE history transaction.
 */

import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectDocument, Vec2, WallId } from '../../../core/types';
import { normalize2, sub2 } from '../../../core/math';
import { cycleIsExistingRoom, findCycleThroughWall, roomsSplitByChain } from '../../../core/graph';
import { useProjectStore } from '../../../store';
import { entryToMm, useEditor2DState, type SnapHit } from '../state/editorState';
import type { SnapResolver } from './useSnap';

export const VERTEX_MERGE_PX = 15;

interface EdgeHit {
  wallId: string;
  t: number;
}

interface Args {
  project: ProjectDocument;
  scale: number;
  snap: SnapResolver;
  flashHint: (msg: string) => void;
}

const isEdgeHit = (hit: SnapHit | null): hit is SnapHit & { wallId: string; t: number } =>
  !!hit && !!hit.wallId && typeof hit.t === 'number' &&
  (hit.kind === 'edge' || hit.kind === 'midpoint' || hit.kind === 'perpendicular') &&
  hit.t > 0.01 && hit.t < 0.99;

export function useDrawTool({ project, scale, snap, flashHint }: Args) {
  const { t } = useTranslation();
  const tool = useEditor2DState((s) => s.tool);
  const draftPoints = useEditor2DState((s) => s.draftPoints);
  const draftCursor = useEditor2DState((s) => s.draftCursor);
  const entry = useEditor2DState((s) => s.entry);
  const lengthUnit = useEditor2DState((s) => s.lengthUnit);

  /** Per-chain bookkeeping (not reactive). */
  const chainRef = useRef<{ lastVertexId: string | null; firstHit: SnapHit | null; roomEdgeHits: EdgeHit[] }>({
    lastVertexId: null,
    firstHit: null,
    roomEdgeHits: [],
  });

  const closeRadiusMm = VERTEX_MERGE_PX / scale;

  // ── Helpers (read the LIVE store, never a stale closure) ─────────────────
  const st = () => useProjectStore.getState();
  const ed = () => useEditor2DState.getState();

  /** Vertex for a clicked point: split a hit wall, else find/create a vertex. */
  const vertexFor = useCallback((point: Vec2, hit: SnapHit | null): string => {
    if (isEdgeHit(hit) && st().project.walls[hit.wallId]) {
      return st().splitWall(hit.wallId as WallId, hit.t).newVertexId;
    }
    return st().ensureVertex(point);
  }, []);

  /** After a chain wall is added: close a loop into a room / split a room. */
  const promote = useCallback(
    (wallId: WallId): boolean => {
      const s = st();
      const proj = s.project;
      const cyc = findCycleThroughWall(proj, wallId);
      if (cyc && !cycleIsExistingRoom(proj, cyc)) {
        let ok = false;
        s.transaction(() => {
          try {
            const rid = s.createRoomFromWalls(cyc);
            ed().setActiveRoom(rid);
            ed().select({ kind: 'room', id: rid });
            ok = true;
          } catch {
            s.cancelTransient();
          }
        });
        if (ok) {
          flashHint(t('design3d.hint.roomCreated'));
          return true;
        }
      }
      const chain = [...ed().draftChainWallIds, wallId] as WallId[];
      const split = roomsSplitByChain(proj, chain);
      if (split) {
        const oldName = proj.rooms[split.roomId]?.name ?? 'Room';
        let ok = false;
        s.transaction(() => {
          try {
            s.removeRoom(split.roomId, { keepWalls: true });
            const r1 = s.createRoomFromWalls([...split.arcA, ...chain], { name: oldName });
            s.createRoomFromWalls([...split.arcB, ...chain], { name: `${oldName} 2` });
            ed().setActiveRoom(r1);
            ed().select({ kind: 'room', id: r1 });
            ok = true;
          } catch {
            s.cancelTransient();
          }
        });
        if (ok) {
          flashHint(t('design3d.hint.roomSplit'));
          return true;
        }
      }
      return false;
    },
    [flashHint, t],
  );

  // ── Room polygon ─────────────────────────────────────────────────────────
  const finishRoom = useCallback(
    (points: Vec2[]) => {
      if (points.length < 3) {
        ed().cancelDraft();
        return;
      }
      const s = st();
      const e = ed();
      const hits = [...chainRef.current.roomEdgeHits].sort((p, q) => q.t - p.t);
      s.transaction(() => {
        const rid = s.createPolygonRoom(points, {
          name: t('design3d.room.defaultName', { n: Object.keys(s.project.rooms).length + 1 }),
          thickness: e.defaultThickness,
          height: e.defaultHeight,
        });
        // Connect corners that were placed on existing walls.
        for (const h of hits) {
          if (!s.project.walls[h.wallId]) continue;
          try {
            s.splitWall(h.wallId as WallId, h.t);
          } catch {
            /* geometry moved — ignore */
          }
        }
        e.setActiveRoom(rid);
        e.select({ kind: 'room', id: rid });
      });
      chainRef.current = { lastVertexId: null, firstHit: null, roomEdgeHits: [] };
      e.cancelDraft();
      e.setTool('select');
    },
    [t],
  );

  const finishRect = useCallback(
    (a: Vec2, b: Vec2) => {
      if (Math.abs(b.x - a.x) < 100 || Math.abs(b.y - a.y) < 100) {
        ed().cancelDraft();
        return;
      }
      finishRoom([a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }]);
    },
    [finishRoom],
  );

  // ── Wall chain ───────────────────────────────────────────────────────────
  const placeChainPoint = useCallback(
    (point: Vec2, hit: SnapHit | null) => {
      const e = ed();
      const pts = e.draftPoints;
      if (pts.length === 0) {
        chainRef.current = { lastVertexId: null, firstHit: hit, roomEdgeHits: [] };
        e.beginDraft(point);
        return;
      }
      const last = pts[pts.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) < 1) return;
      const s = st();
      let promoted = false;
      let newWallId: WallId | null = null;
      s.transaction(() => {
        const va = chainRef.current.lastVertexId ?? vertexFor(last, chainRef.current.firstHit);
        const vb = vertexFor(point, hit);
        if (va === vb) return;
        newWallId = s.addWall(va, vb, { thickness: e.defaultThickness, height: e.defaultHeight });
        chainRef.current.lastVertexId = vb;
      });
      if (!newWallId) return;
      promoted = promote(newWallId);
      if (promoted) {
        chainRef.current = { lastVertexId: null, firstHit: null, roomEdgeHits: [] };
        ed().cancelDraft();
      } else {
        ed().pushDraftChainWall(newWallId);
        ed().pushDraftPoint(point);
      }
    },
    [promote, vertexFor],
  );

  // ── Public: pointer handlers ─────────────────────────────────────────────
  /** Left click on the canvas with a draw tool. `point` is already snapped. */
  const onCanvasClick = useCallback(
    (point: Vec2, hit: SnapHit | null) => {
      const e = ed();
      if (tool === 'draw-room') {
        if (e.draftPoints.length === 0) {
          chainRef.current = { lastVertexId: null, firstHit: null, roomEdgeHits: [] };
          e.beginDraft(point);
          if (isEdgeHit(hit)) chainRef.current.roomEdgeHits.push({ wallId: hit.wallId, t: hit.t });
          return;
        }
        const first = e.draftPoints[0];
        if (e.draftPoints.length >= 3 && Math.hypot(point.x - first.x, point.y - first.y) <= closeRadiusMm) {
          finishRoom(e.draftPoints);
          return;
        }
        e.pushDraftPoint(point);
        if (isEdgeHit(hit)) chainRef.current.roomEdgeHits.push({ wallId: hit.wallId, t: hit.t });
        return;
      }
      if (tool === 'draw-rect') {
        if (e.draftPoints.length === 0) {
          e.beginDraft(point);
          return;
        }
        finishRect(e.draftPoints[0], point);
        return;
      }
      if (tool === 'draw-wall') {
        placeChainPoint(point, hit);
      }
    },
    [tool, closeRadiusMm, finishRoom, finishRect, placeChainPoint],
  );

  /** Pointer move with a draft open — snapped cursor + snap glyph. */
  const onCanvasMove = useCallback(
    (raw: Vec2, shift: boolean) => {
      const e = ed();
      if (e.draftPoints.length === 0) {
        // No anchor yet: still show the snap glyph so the first click is precise.
        const r = snap(raw, { shift });
        e.setSnapHit(r.hit);
        return;
      }
      const anchor = e.draftPoints[e.draftPoints.length - 1];
      const r = snap(raw, { anchor, shift });
      e.setDraftCursor(r.point);
      e.setSnapHit(r.hit);
    },
    [snap],
  );

  /** Enter while drawing a room. */
  const finishOnEnter = useCallback(() => {
    const e = ed();
    if (tool === 'draw-room' && e.draftPoints.length >= 3) finishRoom(e.draftPoints);
    else if (tool === 'draw-wall') {
      chainRef.current = { lastVertexId: null, firstHit: null, roomEdgeHits: [] };
      e.cancelDraft();
    }
  }, [tool, finishRoom]);

  const cancel = useCallback(() => {
    chainRef.current = { lastVertexId: null, firstHit: null, roomEdgeHits: [] };
    ed().cancelDraft();
    ed().setSnapHit(null);
  }, []);

  /** Backspace while drawing a room: drop the last point. */
  const undoLastPoint = useCallback(() => {
    const e = ed();
    if (tool === 'draw-room' && e.draftPoints.length > 1) {
      e.popDraftPoint();
      chainRef.current.roomEdgeHits.pop();
    }
  }, [tool]);

  // ── Keyboard entry ───────────────────────────────────────────────────────
  const isDrawing = tool === 'draw-room' || tool === 'draw-rect' || tool === 'draw-wall';
  const canType = isDrawing && draftPoints.length > 0;

  const commitEntry = useCallback(() => {
    const e = ed();
    const en = e.entry;
    const pts = e.draftPoints;
    if (!en || pts.length === 0) {
      e.closeEntry();
      return;
    }
    const last = pts[pts.length - 1];
    if (tool === 'draw-rect') {
      const w = entryToMm(en.length, e.lengthUnit);
      const d = entryToMm(en.angle, e.lengthUnit);
      if (!w || !d) {
        e.closeEntry();
        return;
      }
      const cur = e.draftCursor ?? { x: last.x + 1, y: last.y + 1 };
      const sx = cur.x >= last.x ? 1 : -1;
      const sy = cur.y >= last.y ? 1 : -1;
      e.closeEntry();
      finishRect(last, { x: last.x + sx * w, y: last.y + sy * d });
      return;
    }
    const lenMm = entryToMm(en.length, e.lengthUnit);
    if (!lenMm) {
      e.closeEntry();
      return;
    }
    let dir: Vec2;
    const ang = Number.parseFloat(en.angle.replace(',', '.'));
    if (en.angle.trim() !== '' && Number.isFinite(ang)) {
      const rad = (-ang * Math.PI) / 180; // CAD CCW → screen (Y-down)
      dir = { x: Math.cos(rad), y: Math.sin(rad) };
    } else {
      const cur = e.draftCursor;
      dir = cur ? normalize2(sub2(cur, last)) : { x: 1, y: 0 };
      if (dir.x === 0 && dir.y === 0) dir = { x: 1, y: 0 };
    }
    const target = { x: last.x + dir.x * lenMm, y: last.y + dir.y * lenMm };
    // Only vertex snaps are honoured for typed points (keeps the length exact otherwise).
    const r = snap(target, { noEdges: true });
    const point = r.hit && r.hit.kind === 'vertex' ? r.point : target;
    const hit = r.hit && r.hit.kind === 'vertex' ? r.hit : null;
    e.closeEntry();
    e.setDraftCursor(point);
    onCanvasClick(point, hit);
  }, [tool, snap, onCanvasClick, finishRect]);

  /** A digit typed with a draft open → open the HUD seeded with it. */
  const onDigit = useCallback(
    (ch: string) => {
      if (!canType) return false;
      const e = ed();
      if (!e.entry) e.openEntry('length', ch);
      return true;
    },
    [canType],
  );

  return {
    tool,
    draftPoints,
    draftCursor,
    entry,
    lengthUnit,
    isDrawing,
    canType,
    closeRadiusMm,
    onCanvasClick,
    onCanvasMove,
    finishOnEnter,
    cancel,
    undoLastPoint,
    commitEntry,
    onDigit,
    /** For the HUD labels. */
    entryLabels: tool === 'draw-rect'
      ? { length: t('design3d.entry.width'), angle: t('design3d.entry.depth') }
      : { length: t('design3d.entry.length'), angle: t('design3d.entry.angle') },
  };
}

export type DrawTool = ReturnType<typeof useDrawTool>;
void ((_: ProjectDocument) => _);
