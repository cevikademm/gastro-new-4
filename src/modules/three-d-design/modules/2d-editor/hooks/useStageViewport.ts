/**
 * useStageViewport — pan / zoom / pinch for the Konva stage.
 *
 *  - Wheel zooms to the cursor; +/- buttons zoom to the centre.
 *  - Pan: middle button, Alt/Meta + left, the pan tool, or Space held.
 *  - Touch: two-finger pinch zooms about the finger centre and pans by the
 *    centre delta (handled in the Stage's touch handlers, pointer handlers
 *    bail while `isPinching()`).
 *  - `fitTo(bounds)` frames a world rectangle with padding.
 *  - Shared focus with the 3D editor (`focusWorld`) on mount / unmount.
 */

import { useCallback, useEffect, useRef } from 'react';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Vec2 } from '../../../core/types';
import { useEditor2DState } from '../state/editorState';

export const WHEEL_ZOOM_FACTOR = 1.08;
export const MIN_SCALE = 0.005;
export const MAX_SCALE = 2;

// A second finger must still hit-test while the first drags a node (pinch).
Konva.hitOnDragEnabled = true;

interface Args {
  width: number;
  height: number;
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function useStageViewport({ width, height, stageRef }: Args) {
  const scale = useEditor2DState((s) => s.scale);
  const offsetX = useEditor2DState((s) => s.offsetX);
  const offsetY = useEditor2DState((s) => s.offsetY);
  const setViewport = useEditor2DState((s) => s.setViewport);
  const setOffset = useEditor2DState((s) => s.setOffset);

  const sizeRef = useRef({ w: width, h: height });
  sizeRef.current = { w: width, h: height };

  // ── 2D ↔ 3D focus sync ─────────────────────────────────────────────────
  useEffect(() => {
    const st = useEditor2DState.getState();
    const f = st.focusWorld;
    const { w, h } = sizeRef.current;
    if (f && w > 0 && h > 0) st.setOffset(w / 2 - f.x * st.scale, h / 2 - f.y * st.scale);
    return () => {
      const s = useEditor2DState.getState();
      const { w: cw, h: ch } = sizeRef.current;
      if (cw <= 0 || ch <= 0 || !s.scale) return;
      const cx = (cw / 2 - s.offsetX) / s.scale;
      const cy = (ch / 2 - s.offsetY) / s.scale;
      if (Number.isFinite(cx) && Number.isFinite(cy)) s.setFocusWorld({ x: cx, y: cy });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageToWorld = useCallback(
    (sx: number, sy: number): Vec2 => ({ x: (sx - offsetX) / scale, y: (sy - offsetY) / scale }),
    [offsetX, offsetY, scale],
  );
  const worldToScreen = useCallback(
    (p: Vec2): Vec2 => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY }),
    [offsetX, offsetY, scale],
  );

  /** Zoom by `factor` keeping the screen point `at` fixed. */
  const zoomAt = useCallback(
    (factor: number, at: { x: number; y: number }) => {
      const s = useEditor2DState.getState();
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s.scale * factor));
      if (newScale === s.scale) return;
      const wx = (at.x - s.offsetX) / s.scale;
      const wy = (at.y - s.offsetY) / s.scale;
      setViewport(newScale, at.x - wx * newScale, at.y - wy * newScale);
    },
    [setViewport],
  );

  const onWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;
      zoomAt(e.evt.deltaY > 0 ? 1 / WHEEL_ZOOM_FACTOR : WHEEL_ZOOM_FACTOR, pointer);
    },
    [stageRef, zoomAt],
  );

  const zoomIn = useCallback(() => zoomAt(WHEEL_ZOOM_FACTOR, { x: sizeRef.current.w / 2, y: sizeRef.current.h / 2 }), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt(1 / WHEEL_ZOOM_FACTOR, { x: sizeRef.current.w / 2, y: sizeRef.current.h / 2 }), [zoomAt]);

  // ── Pan ────────────────────────────────────────────────────────────────
  const panRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const startPan = useCallback((pos: { x: number; y: number }) => {
    const s = useEditor2DState.getState();
    panRef.current = { x: pos.x, y: pos.y, ox: s.offsetX, oy: s.offsetY };
    const stage = stageRef.current;
    if (stage) stage.container().style.cursor = 'grabbing';
  }, [stageRef]);
  const movePan = useCallback(
    (pos: { x: number; y: number }): boolean => {
      const p = panRef.current;
      if (!p) return false;
      setOffset(p.ox + (pos.x - p.x), p.oy + (pos.y - p.y));
      return true;
    },
    [setOffset],
  );
  const endPan = useCallback((): boolean => {
    if (!panRef.current) return false;
    panRef.current = null;
    const stage = stageRef.current;
    if (stage) stage.container().style.cursor = 'default';
    return true;
  }, [stageRef]);
  const isPanning = useCallback(() => panRef.current !== null, []);

  // ── Pinch (two-finger) ─────────────────────────────────────────────────
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const onTouchMove = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length < 2) return;
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.container().getBoundingClientRect();
      const t1 = touches[0];
      const t2 = touches[1];
      const p1 = { x: t1.clientX - rect.left, y: t1.clientY - rect.top };
      const p2 = { x: t2.clientX - rect.left, y: t2.clientY - rect.top };
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const prev = pinchRef.current;
      if (!prev) {
        pinchRef.current = { dist, cx, cy };
        // A pinch cancels any node drag / pan that the first finger started.
        panRef.current = null;
        stage.stopDrag();
        return;
      }
      const s = useEditor2DState.getState();
      const factor = prev.dist > 0 ? dist / prev.dist : 1;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s.scale * factor));
      // Zoom about the previous centre, then pan by the centre delta.
      const wx = (prev.cx - s.offsetX) / s.scale;
      const wy = (prev.cy - s.offsetY) / s.scale;
      const ox = prev.cx - wx * newScale + (cx - prev.cx);
      const oy = prev.cy - wy * newScale + (cy - prev.cy);
      setViewport(newScale, ox, oy);
      pinchRef.current = { dist, cx, cy };
    },
    [setViewport, stageRef],
  );
  const onTouchEnd = useCallback((e: KonvaEventObject<TouchEvent>) => {
    if (e.evt.touches.length < 2) pinchRef.current = null;
  }, []);
  const isPinching = useCallback(() => pinchRef.current !== null, []);

  // ── Fit ────────────────────────────────────────────────────────────────
  const fitTo = useCallback(
    (
      bounds: { min: Vec2; max: Vec2 } | null,
      paddingMm = 1500,
      /** Screen px covered by overlays (side panels) that must stay clear. */
      insets: { left?: number; right?: number; top?: number; bottom?: number } = {},
    ) => {
      const { w: fullW, h: fullH } = sizeRef.current;
      const il = insets.left ?? 0;
      const ir = insets.right ?? 0;
      const it = insets.top ?? 0;
      const ib = insets.bottom ?? 0;
      const w = Math.max(50, fullW - il - ir);
      const h = Math.max(50, fullH - it - ib);
      if (!bounds) {
        setViewport(0.05, 200 + il, 200 + it);
        return;
      }
      const minX = bounds.min.x - paddingMm;
      const minY = bounds.min.y - paddingMm;
      const maxX = bounds.max.x + paddingMm;
      const maxY = bounds.max.y + paddingMm;
      const bw = Math.max(1, maxX - minX);
      const bh = Math.max(1, maxY - minY);
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(w / bw, h / bh)));
      setViewport(
        newScale,
        il + -minX * newScale + (w - bw * newScale) / 2,
        it + -minY * newScale + (h - bh * newScale) / 2,
      );
    },
    [setViewport],
  );

  return {
    scale,
    offsetX,
    offsetY,
    stageToWorld,
    worldToScreen,
    onWheel,
    zoomIn,
    zoomOut,
    zoomAt,
    startPan,
    movePan,
    endPan,
    isPanning,
    onTouchMove,
    onTouchEnd,
    isPinching,
    fitTo,
  };
}

export type StageViewport = ReturnType<typeof useStageViewport>;
