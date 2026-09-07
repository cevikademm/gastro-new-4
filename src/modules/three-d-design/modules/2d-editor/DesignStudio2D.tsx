/**
 * DesignStudio2D — professional CAD-like 2D editor (Konva.js).
 *
 * Composition only: geometry derivation + layer wiring + DOM chrome. The
 * behaviour lives in hooks:
 *   useStageViewport      pan / zoom / pinch / fit / coordinate helpers
 *   useSnap               vertex · midpoint · perpendicular · edge · extension · ortho · grid
 *   useDrawTool           room / rectangle / wall chain, keyboard entry, auto-rooms
 *   useOpeningInteraction place + slide + resize doors/windows on ANY wall
 *   useEquipmentInteraction armed placement, drag, duplicate, nudge, rotate
 *   useVertexEditing      corner drag, wall length, corner angle
 *   useSelectionCommands  picks, delete, confirm dialogs, split, room-from-walls
 *   useKeyboardShortcuts  every key
 *
 * Selection is UNIFIED (`editorState.selection`): every wall (room or free),
 * vertex, opening, room and item is selectable by id; the right-hand
 * ContextPropertiesPanel follows the primary selection.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Stage, Layer } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';

import {
  defaultOpeningAt,
  nearestWallHit,
  pointInPolygon,
  projectBounds,
  roomContaining,
  roomPolygon,
  roomVertexIds,
  roomWallIdsInOrder,
  useProjectStore,
  wallBandPolygons,
  type OpeningKind,
  type Room,
  type Vec2,
  type VertexId,
  type WallId,
} from '../..';
import { obbCorners, obbFor } from '../3d-editor/interaction/collision';
import { idsOfKind, primaryOf, useEditor2DState, type SelectionRef } from './state/editorState';
import { useStageViewport } from './hooks/useStageViewport';
import { useSnap } from './hooks/useSnap';
import { useDrawTool } from './hooks/useDrawTool';
import { useOpeningInteraction } from './hooks/useOpeningInteraction';
import { useEquipmentInteraction } from './hooks/useEquipmentInteraction';
import { useVertexEditing } from './hooks/useVertexEditing';
import { useSelectionCommands } from './hooks/useSelectionCommands';
import { useKeyboardShortcuts, type KeyboardHandlers } from './hooks/useKeyboardShortcuts';

import GridLayer from './render/GridLayer';
import RoomLayer from './render/RoomLayer';
import WallBandsLayer from './render/WallBandsLayer';
import DimensionLayer, { type DimensionEdge } from './render/DimensionLayer';
import AngleLayer from './render/AngleLayer';
import DraftLayer from './render/DraftLayer';
import VertexHandlesLayer, { type VertexHandle } from './render/VertexHandlesLayer';
import OpeningsLayer, { OpeningHandlesLayer } from './render/OpeningsLayer';
import EquipmentLayer2D from './render/EquipmentLayer2D';
import SnapIndicatorLayer from './render/SnapIndicatorLayer';
import { CompassRose, TitleBlock, ScaleBar } from './render/PlotOverlays';
import Toolbar2D from './components/Toolbar2D';
import ContextMenu from './components/ContextMenu';
import LengthEntryHud from './components/LengthEntryHud';
import { AngleInput, EdgeLengthInput } from './components/FloatingInputs';
import { buildContextMenuItems } from './components/contextMenuItems';
import ContextPropertiesPanel, { type PanelActions } from '../shared/panels/ContextPropertiesPanel';
import EquipmentCatalogPanel from '../3d-editor/panels/EquipmentCatalogPanel';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { HUD } from '../../components/ui/chrome';

interface DesignStudio2DProps {
  width: number;
  height: number;
}

interface ActiveRoomView {
  id: string;
  name: string;
  vertexIds: string[];
  points: Vec2[];
  wallIds: WallId[];
}

const LONG_PRESS_MS = 500;

// Dev-only handle for end-to-end drivers / debugging (never shipped in prod builds).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __design2d?: unknown }).__design2d = { editor: useEditor2DState, project: useProjectStore };
}

export default function DesignStudio2D({ width, height }: DesignStudio2DProps) {
  const { t } = useTranslation();

  // ── Store wiring ─────────────────────────────────────────────────────────
  const project = useProjectStore((s) => s.project);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.canUndo());
  const canRedo = useProjectStore((s) => s.canRedo());
  const updateProject = useProjectStore((s) => s.update);
  const addOpening = useProjectStore((s) => s.addOpening);
  const updateOpening = useProjectStore((s) => s.updateOpening);

  const tool = useEditor2DState((s) => s.tool);
  const setTool = useEditor2DState((s) => s.setTool);
  const spacePan = useEditor2DState((s) => s.spacePan);
  const setSpacePan = useEditor2DState((s) => s.setSpacePan);
  const selection = useEditor2DState((s) => s.selection);
  const select = useEditor2DState((s) => s.select);
  const clearSelection = useEditor2DState((s) => s.clearSelection);
  const activeRoomId = useEditor2DState((s) => s.activeRoomId);
  const setActiveRoom = useEditor2DState((s) => s.setActiveRoom);
  const hover = useEditor2DState((s) => s.hover);
  const snapHit = useEditor2DState((s) => s.snapHit);
  const setSnapHit = useEditor2DState((s) => s.setSnapHit);
  const snapOn = useEditor2DState((s) => s.snapOn);
  const setSnapOn = useEditor2DState((s) => s.setSnapOn);
  const orthoOn = useEditor2DState((s) => s.orthoOn);
  const setOrthoOn = useEditor2DState((s) => s.setOrthoOn);
  const gridMm = useEditor2DState((s) => s.gridMm);
  const setGridMm = useEditor2DState((s) => s.setGridMm);
  const showGrid = useEditor2DState((s) => s.showGrid);
  const setShowGrid = useEditor2DState((s) => s.setShowGrid);
  const showDims = useEditor2DState((s) => s.showDims);
  const setShowDims = useEditor2DState((s) => s.setShowDims);
  const lengthUnit = useEditor2DState((s) => s.lengthUnit);
  const setLengthUnit = useEditor2DState((s) => s.setLengthUnit);
  const defaultThickness = useEditor2DState((s) => s.defaultThickness);
  const setDefaultThickness = useEditor2DState((s) => s.setDefaultThickness);
  const defaultHeight = useEditor2DState((s) => s.defaultHeight);
  const setDefaultHeight = useEditor2DState((s) => s.setDefaultHeight);
  const draftPoints = useEditor2DState((s) => s.draftPoints);
  const draftCursor = useEditor2DState((s) => s.draftCursor);
  const entry = useEditor2DState((s) => s.entry);
  const updateEntry = useEditor2DState((s) => s.updateEntry);
  const closeEntry = useEditor2DState((s) => s.closeEntry);
  const contextMenu = useEditor2DState((s) => s.contextMenu);
  const openContextMenu = useEditor2DState((s) => s.openContextMenu);
  const closeContextMenu = useEditor2DState((s) => s.closeContextMenu);

  const stageRef = useRef<Konva.Stage | null>(null);
  const [touch, setTouch] = useState(false);
  // Katalog geniş ekranda açık başlar; bölünmüş görünümde 2B yarı dar olduğu
  // için kapalı başlar (3B tarafındaki katalog zaten aynı listeyi sunar).
  const [catalogOpen, setCatalogOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches &&
      useProjectStore.getState().view.mode !== 'split',
  );
  const [hoverWallId, setHoverWallId] = useState<string | null>(null);

  // Hint toast (deletion feedback, room created, …)
  const [hint, setHint] = useState<string | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashHint = useCallback((msg: string) => {
    setHint(msg);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(null), 3500);
  }, []);

  // ── Hooks ────────────────────────────────────────────────────────────────
  const viewport = useStageViewport({ width, height, stageRef });
  const { scale, offsetX, offsetY, stageToWorld, worldToScreen } = viewport;

  const activeRoomBase = useMemo<ActiveRoomView | null>(() => {
    const room = activeRoomId ? (project.rooms[activeRoomId] as Room | undefined) : undefined;
    if (!room) return null;
    return {
      id: room.id,
      name: room.name,
      vertexIds: roomVertexIds(project, room),
      points: roomPolygon(project, room),
      wallIds: roomWallIdsInOrder(project, room),
    };
  }, [project, activeRoomId]);

  // If the active room vanished (deleted / dissolved) drop it.
  useEffect(() => {
    if (activeRoomId && !project.rooms[activeRoomId]) setActiveRoom(null);
  }, [project.rooms, activeRoomId, setActiveRoom]);
  // Purge selection refs that no longer exist.
  useEffect(() => {
    const alive = selection.filter((r) =>
      r.kind === 'wall' ? !!project.walls[r.id]
        : r.kind === 'vertex' ? !!project.vertices[r.id]
          : r.kind === 'opening' ? !!project.openings[r.id]
            : r.kind === 'room' ? !!project.rooms[r.id]
              : !!project.equipment[r.id],
    );
    if (alive.length !== selection.length) select(alive);
  }, [project, selection, select]);

  const snap = useSnap({ project, scale, gridMm, snapOn, orthoOn, draftPoints });
  const vertexEditing = useVertexEditing({ project, snap: snap.resolve, activeRoom: activeRoomBase });
  const vertexOverride = vertexEditing.dragPreview ?? undefined;

  const bands = useMemo(
    () => wallBandPolygons(project, { vertexOverride }),
    [project.walls, project.vertices, vertexOverride], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const activeRoom = useMemo<ActiveRoomView | null>(() => {
    if (!activeRoomBase) return null;
    if (!vertexOverride) return activeRoomBase;
    return {
      ...activeRoomBase,
      points: activeRoomBase.vertexIds.map((vid, i) => vertexOverride[vid] ?? activeRoomBase.points[i]),
    };
  }, [activeRoomBase, vertexOverride]);

  const draw = useDrawTool({ project, scale, snap: snap.resolve, flashHint });
  const openings = useOpeningInteraction({ project, scale, stageToWorld });
  const equipment = useEquipmentInteraction({ project });
  const commands = useSelectionCommands({ project, equipment, flashHint });

  // ── Selection-derived sets ───────────────────────────────────────────────
  const primary = primaryOf(selection);
  const selectedWallIds = useMemo(() => new Set(idsOfKind(selection, 'wall')), [selection]);
  const selectedVertexIds = useMemo(() => new Set(idsOfKind(selection, 'vertex')), [selection]);
  const selectedOpeningIds = useMemo(() => new Set(idsOfKind(selection, 'opening')), [selection]);
  const selectedEquipmentIds = useMemo(() => new Set(idsOfKind(selection, 'equipment')), [selection]);
  const selectedRoomIds = useMemo(() => new Set(idsOfKind(selection, 'room')), [selection]);
  const activeWallIds = useMemo(() => new Set<string>(activeRoom ? activeRoom.wallIds : []), [activeRoom]);
  const equipmentList = useMemo(() => Object.values(project.equipment), [project.equipment]);

  const vertexPos = useCallback(
    (vid: string): Vec2 | null => {
      const o = vertexOverride?.[vid];
      if (o) return o;
      const v = project.vertices[vid];
      return v ? { x: v.x, y: v.y } : null;
    },
    [project.vertices, vertexOverride],
  );

  /** Corner handles: active room corners ∪ endpoints of selected walls ∪ selected corners. */
  const handles = useMemo<VertexHandle[]>(() => {
    const map = new Map<string, Vec2>();
    const add = (vid: string) => {
      if (map.has(vid)) return;
      const p = vertexPos(vid);
      if (p) map.set(vid, p);
    };
    if (activeRoom) activeRoom.vertexIds.forEach(add);
    for (const wid of selectedWallIds) {
      const w = project.walls[wid];
      if (w) {
        add(w.a);
        add(w.b);
      }
    }
    for (const vid of selectedVertexIds) add(vid);
    return Array.from(map, ([id, point]) => ({ id, point }));
  }, [activeRoom, selectedWallIds, selectedVertexIds, project.walls, vertexPos]);

  /** Dimension edges: active room loop + selected walls outside it. */
  const dimEdges = useMemo<DimensionEdge[]>(() => {
    if (!showDims) return [];
    const out: DimensionEdge[] = [];
    const seen = new Set<string>();
    if (activeRoom) {
      const n = activeRoom.points.length;
      for (let i = 0; i < n; i++) {
        out.push({ wallId: activeRoom.wallIds[i], a: activeRoom.points[i], b: activeRoom.points[(i + 1) % n] });
        seen.add(activeRoom.wallIds[i]);
      }
    }
    for (const wid of selectedWallIds) {
      if (seen.has(wid)) continue;
      const band = bands.bands.get(wid as WallId);
      if (band) out.push({ wallId: wid, a: band.a, b: band.b });
    }
    return out;
  }, [showDims, activeRoom, selectedWallIds, bands]);

  const selectedVertexIndex = useMemo(() => {
    if (!activeRoom) return null;
    for (const vid of selectedVertexIds) {
      const i = activeRoom.vertexIds.indexOf(vid);
      if (i !== -1) return i;
    }
    return null;
  }, [activeRoom, selectedVertexIds]);

  // ── Panel actions ────────────────────────────────────────────────────────
  const addOpeningOnWall = useCallback(
    (wallId: string, kind: OpeningKind, t01 = 0.5) => {
      const proj = useProjectStore.getState().project;
      if (!proj.walls[wallId]) return;
      const id = addOpening(defaultOpeningAt(proj, kind, wallId as WallId, t01));
      commands.pick({ kind: 'opening', id }, false);
    },
    [addOpening, commands],
  );

  const panelActions = useMemo<PanelActions>(
    () => ({
      deleteRefs: commands.deleteRefs,
      requestDeleteRoom: commands.requestDeleteRoom,
      splitWallAtMiddle: commands.splitWallAtMiddle,
      addOpeningOnWall,
      setWallLength: vertexEditing.setWallLength,
      duplicateEquipment: equipment.duplicate,
      flashHint,
    }),
    [commands, addOpeningOnWall, vertexEditing.setWallLength, equipment.duplicate, flashHint],
  );

  const editorSettings = useMemo(
    () => ({
      defaultThickness, setDefaultThickness, defaultHeight, setDefaultHeight,
      gridMm, setGridMm, snapOn, setSnapOn, orthoOn, setOrthoOn,
      showGrid, setShowGrid, showDims, setShowDims, lengthUnit, setLengthUnit,
    }),
    [defaultThickness, setDefaultThickness, defaultHeight, setDefaultHeight, gridMm, setGridMm, snapOn, setSnapOn, orthoOn, setOrthoOn, showGrid, setShowGrid, showDims, setShowDims, lengthUnit, setLengthUnit],
  );

  // ── Hit test for the context menu ────────────────────────────────────────
  const hitTest = useCallback(
    (world: Vec2): SelectionRef | { kind: 'canvas' } => {
      const r = 12 / scale;
      for (const h of handles) {
        if (Math.hypot(h.point.x - world.x, h.point.y - world.y) <= r) return { kind: 'vertex', id: h.id };
      }
      for (const eq of equipmentList) {
        const corners = obbCorners(obbFor(eq.position, eq.rotation, eq.footprint.width, eq.footprint.depth));
        if (pointInPolygon(world, corners)) return { kind: 'equipment', id: eq.id };
      }
      const hit = nearestWallHit(project, world, Math.max(r, 200));
      if (hit) {
        const wall = project.walls[hit.wallId];
        if (wall && hit.distance <= wall.thickness / 2 + r) {
          const u = hit.t * hit.lengthMm;
          for (const op of Object.values(project.openings)) {
            if (op.wallId === hit.wallId && u >= op.offset && u <= op.offset + op.width) return { kind: 'opening', id: op.id };
          }
          return { kind: 'wall', id: hit.wallId };
        }
      }
      const room = roomContaining(project, world);
      if (room) return { kind: 'room', id: room.id };
      return { kind: 'canvas' };
    },
    [scale, handles, equipmentList, project],
  );

  const openMenuAt = useCallback(
    (pos: { x: number; y: number }, world: Vec2) => {
      const target = hitTest(world);
      if (target.kind !== 'canvas') {
        const already = selection.some((s) => s.kind === target.kind && s.id === target.id);
        if (!already) commands.pick(target, false);
      }
      openContextMenu({ x: pos.x, y: pos.y, world, target });
    },
    [hitTest, selection, commands, openContextMenu],
  );

  // ── Long press (touch) → context menu ────────────────────────────────────
  const longPressRef = useRef<{ timer: ReturnType<typeof setTimeout>; pos: { x: number; y: number } } | null>(null);
  const cancelLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    }
  }, []);

  // ── Stage handlers ───────────────────────────────────────────────────────
  const pointerInfo = (e: KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return { pos, world: stageToWorld(pos.x, pos.y) };
  };

  const isPlacing = tool === 'place-door' || tool === 'place-window' || tool === 'place-pass';

  const onStagePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    const native = e.evt;
    if (native.pointerType === 'touch' && !touch) setTouch(true);
    if (viewport.isPinching()) return;
    const info = pointerInfo(e);
    if (!info) return;
    const { pos, world } = info;
    closeContextMenu();

    if (native.button === 1 || tool === 'pan' || spacePan || (native.button === 0 && (native.altKey || native.metaKey))) {
      viewport.startPan(pos);
      return;
    }
    if (native.button !== 0) return;
    if (native.pointerType === 'touch') {
      cancelLongPress();
      longPressRef.current = {
        pos,
        timer: setTimeout(() => {
          longPressRef.current = null;
          openMenuAt(pos, world);
        }, LONG_PRESS_MS),
      };
    }
    const clickedOnEmpty = e.target === e.target.getStage();
    if (equipment.placeAt(world, native.shiftKey)) return;
    if (draw.isDrawing) {
      const anchor = draftPoints.length ? draftPoints[draftPoints.length - 1] : null;
      const r = snap.resolve(world, { anchor, shift: native.shiftKey });
      draw.onCanvasClick(r.point, r.hit);
      return;
    }
    if (isPlacing) {
      openings.placeAt(world, native.shiftKey);
      return;
    }
    if (tool === 'select' && clickedOnEmpty) commands.pickAt(world, native.shiftKey);
  };

  const onStagePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    const info = pointerInfo(e);
    if (!info) return;
    if (viewport.isPinching()) return;
    if (viewport.movePan(info.pos)) return;
    const lp = longPressRef.current;
    if (lp && Math.hypot(info.pos.x - lp.pos.x, info.pos.y - lp.pos.y) > 8) cancelLongPress();
    if (openings.onStageMove(info.world)) return;
    if (draw.isDrawing) {
      draw.onCanvasMove(info.world, e.evt.shiftKey);
      return;
    }
    if (isPlacing) {
      setHoverWallId(openings.hoverWallFor(info.world));
      return;
    }
    if (snapHit) setSnapHit(null);
  };

  const onStagePointerUp = () => {
    viewport.endPan();
    openings.onStageUp();
    cancelLongPress();
  };

  const onStageContextMenu = (e: KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    const info = pointerInfo(e);
    if (!info) return;
    openMenuAt(info.pos, info.world);
  };

  // ── Fit ──────────────────────────────────────────────────────────────────
  // Keep the drawing clear of the side panels (right properties panel, left catalog).
  const fitToContent = useCallback(
    () => viewport.fitTo(projectBounds(project), 1500, { right: 300, left: catalogOpen ? 360 : 48, top: 70, bottom: 40 }),
    [viewport, project, catalogOpen],
  );

  // ── Keyboard ─────────────────────────────────────────────────────────────
  const keyHandlers = useMemo<KeyboardHandlers>(
    () => ({
      isTyping: () => !!useEditor2DState.getState().entry,
      setTool,
      setSpacePan,
      setOrthoOn: (fn) => setOrthoOn(fn(useEditor2DState.getState().orthoOn)),
      escape: () => {
        const e = useEditor2DState.getState();
        if (e.contextMenu) return e.closeContextMenu();
        if (e.entry) return e.closeEntry();
        if (equipment.armedProduct) return equipment.setArmedProduct(null);
        if (e.draftPoints.length > 0) return draw.cancel();
        if (vertexEditing.editingEdge) return vertexEditing.setEditingEdge(null);
        if (vertexEditing.editingAngle) return vertexEditing.setEditingAngle(null);
        if (e.tool !== 'select') return setTool('select');
        clearSelection();
      },
      enter: () => draw.finishOnEnter(),
      backspace: () => {
        const e = useEditor2DState.getState();
        if (e.tool === 'draw-room' && e.draftPoints.length > 1) {
          draw.undoLastPoint();
          return true;
        }
        return false;
      },
      deleteSelection: commands.deleteSelection,
      undo,
      redo,
      duplicate: () => equipment.duplicate(idsOfKind(useEditor2DState.getState().selection, 'equipment')),
      selectAllEquipment: () =>
        select(Object.keys(useProjectStore.getState().project.equipment).map((id) => ({ kind: 'equipment' as const, id }))),
      nudge: (dx, dy) => equipment.nudge(idsOfKind(useEditor2DState.getState().selection, 'equipment'), dx, dy),
      rotate: (deg) => equipment.rotate(idsOfKind(useEditor2DState.getState().selection, 'equipment'), (deg * Math.PI) / 180),
      digit: draw.onDigit,
    }),
    [setTool, setSpacePan, setOrthoOn, equipment, draw, vertexEditing, clearSelection, commands.deleteSelection, undo, redo, select],
  );
  useKeyboardShortcuts(keyHandlers);

  // ── Context menu items ───────────────────────────────────────────────────
  const menu = useMemo(() => {
    if (!contextMenu) return null;
    return buildContextMenuItems({
      t,
      project,
      target: contextMenu.target,
      world: contextMenu.world,
      selection,
      scale,
      deleteRefs: commands.deleteRefs,
      requestDeleteRoom: commands.requestDeleteRoom,
      splitWallAt: commands.splitWallAt,
      addOpeningOnWall,
      setWallThickness: (wallId, mm) =>
        updateProject((d) => {
          const w = d.walls[wallId];
          if (w) w.thickness = mm;
        }),
      applyThicknessToRoom: (wallId) =>
        updateProject((d) => {
          const w = d.walls[wallId];
          if (!w) return;
          for (const r of Object.values(d.rooms)) {
            if (!r.wallLoop.includes(wallId)) continue;
            for (const wid of r.wallLoop) {
              const o = d.walls[wid];
              if (o) o.thickness = w.thickness;
            }
          }
        }),
      beginEditEdge: vertexEditing.beginEditEdge,
      dissolveVertex: (vid) => commands.deleteRefs([{ kind: 'vertex', id: vid }]),
      beginEditAngle: vertexEditing.beginEditAngle,
      flipHinge: (id) => {
        const op = project.openings[id];
        if (op) updateOpening(id, { hinge: (op.hinge ?? 'start') === 'start' ? 'end' : 'start' });
      },
      flipSwing: (id) => {
        const op = project.openings[id];
        if (op) updateOpening(id, { swing: (op.swing ?? 'left') === 'left' ? 'right' : 'left' });
      },
      duplicateEquipment: equipment.duplicate,
      rotateEquipment: (ids, deg) => equipment.rotate(ids, (deg * Math.PI) / 180),
      toggleLockEquipment: equipment.toggleLock,
      renameRoom: (roomId) => {
        commands.pick({ kind: 'room', id: roomId }, false);
        setActiveRoom(roomId);
      },
      createRoomFromSelectedWalls: commands.createRoomFromSelectedWalls,
      fitToContent,
      selectRoomWalls: (roomId) => {
        const room = project.rooms[roomId];
        if (!room) return;
        select(room.wallLoop.map((id) => ({ kind: 'wall' as const, id })));
        setActiveRoom(roomId);
      },
    });
  }, [contextMenu, t, project, selection, scale, commands, addOpeningOnWall, updateProject, vertexEditing, updateOpening, equipment, setActiveRoom, fitToContent, select]);

  // ── Render helpers ───────────────────────────────────────────────────────
  const cursor =
    tool === 'pan' || spacePan
      ? 'grab'
      : equipment.armedProduct || draw.isDrawing || isPlacing
        ? 'crosshair'
        : 'default';

  const editingEdgeScreen = useMemo(() => {
    if (!vertexEditing.editingEdge) return null;
    const band = bands.bands.get(vertexEditing.editingEdge.wallId as WallId);
    if (!band) return null;
    return worldToScreen({ x: (band.a.x + band.b.x) / 2, y: (band.a.y + band.b.y) / 2 });
  }, [vertexEditing.editingEdge, bands, worldToScreen]);

  const editingAngleScreen = useMemo(() => {
    if (!vertexEditing.editingAngle) return null;
    const p = vertexPos(vertexEditing.editingAngle.vertexId);
    return p ? worldToScreen(p) : null;
  }, [vertexEditing.editingAngle, vertexPos, worldToScreen]);

  const entryScreen = useMemo(() => {
    const anchor = draftCursor ?? (draftPoints.length ? draftPoints[draftPoints.length - 1] : null);
    return anchor ? worldToScreen(anchor) : { x: width / 2, y: height / 2 };
  }, [draftCursor, draftPoints, worldToScreen, width, height]);

  const drawMode = tool === 'draw-rect' ? 'rect' : tool === 'draw-wall' ? 'wall' : 'room';
  const hasSelection = selection.length > 0;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f3f4f2]" style={{ cursor, touchAction: 'none' }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={offsetX}
        y={offsetY}
        scaleX={scale}
        scaleY={scale}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
        onContextMenu={onStageContextMenu}
        onWheel={viewport.onWheel}
        onTouchMove={viewport.onTouchMove}
        onTouchEnd={viewport.onTouchEnd}
      >
        <Layer listening={false}>
          {showGrid && <GridLayer width={width} height={height} scale={scale} offsetX={offsetX} offsetY={offsetY} />}
        </Layer>

        {/* Rooms (floor wash + name/area) under walls + dimensions + angle pills */}
        <Layer>
          <RoomLayer
            part="fill"
            project={project}
            bands={bands.bands}
            scale={scale}
            activeRoomId={activeRoomId}
            selectedRoomIds={selectedRoomIds}
          />
          <WallBandsLayer
            bands={bands}
            scale={scale}
            selectedWallIds={selectedWallIds}
            activeWallIds={activeWallIds}
            hoverWallId={isPlacing ? hoverWallId : hover?.kind === 'wall' ? hover.id : null}
            hitPx={touch ? 22 : 14}
            onSelect={
              tool === 'select' && !equipment.armedProduct
                ? (wallId, evt) => commands.pick({ kind: 'wall', id: wallId }, !!evt.evt.shiftKey)
                : undefined
            }
          />
          {/* Room name / area pills sit on top of the walls (a partition may cross the centre). */}
          <RoomLayer
            part="label"
            project={project}
            bands={bands.bands}
            scale={scale}
            activeRoomId={activeRoomId}
            selectedRoomIds={selectedRoomIds}
          />
          <DimensionLayer
            edges={dimEdges}
            scale={scale}
            onEdgeClick={tool === 'select' ? (wallId) => vertexEditing.beginEditEdge(wallId) : undefined}
          />
          {activeRoom && activeRoom.points.length >= 3 && showDims && (
            <AngleLayer
              points={activeRoom.points}
              scale={scale}
              selectedIndex={selectedVertexIndex}
              onCornerClick={tool === 'select' ? (i) => vertexEditing.beginEditAngle(activeRoom.vertexIds[i]) : undefined}
            />
          )}
        </Layer>

        {/* Openings (symbols + selected-opening handles) */}
        <Layer>
          <OpeningsLayer
            project={project}
            scale={scale}
            selectedIds={selectedOpeningIds}
            hoverId={hover?.kind === 'opening' ? hover.id : null}
            previewOffset={openings.previewOffset}
            previewWidth={openings.previewWidth}
            onPointerDown={openings.onOpeningPointerDown}
            touch={touch}
          />
          {tool === 'select' && (
            <OpeningHandlesLayer
              project={project}
              scale={scale}
              selectedIds={selectedOpeningIds}
              previewOffset={openings.previewOffset}
              previewWidth={openings.previewWidth}
              onHandleDown={openings.onHandleDown}
              liveLabelFor={openings.liveId}
              touch={touch}
            />
          )}
        </Layer>

        {/* Equipment — shared with 3D editor (same project.equipment) */}
        <Layer>
          <EquipmentLayer2D
            equipment={equipmentList}
            scale={scale}
            selectedIds={selectedEquipmentIds}
            hoverId={hover?.kind === 'equipment' ? hover.id : null}
            draggable={tool === 'select' && !equipment.armedProduct}
            onSelect={(id, evt) => commands.pick({ kind: 'equipment', id }, !!evt.evt.shiftKey)}
            onDragStart={equipment.onDragStart}
            onDragMove={equipment.onDragMove}
            onDragEnd={equipment.onDragEnd}
          />
        </Layer>

        {/* Corner handles + draft + snap glyph */}
        <Layer>
          {tool === 'select' && handles.length > 0 && (
            <VertexHandlesLayer
              handles={handles}
              scale={scale}
              selectedIds={selectedVertexIds}
              touch={touch}
              onSelect={(id, evt) => commands.pick({ kind: 'vertex', id }, !!evt.evt.shiftKey)}
              onDragMove={(id, world) => vertexEditing.onDragMove(id, world)}
              onDragEnd={vertexEditing.onDragEnd}
            />
          )}
          <DraftLayer
            points={draftPoints}
            cursor={draftCursor}
            scale={scale}
            closeRadiusMm={draw.closeRadiusMm}
            mode={drawMode}
            thicknessMm={defaultThickness}
          />
          <SnapIndicatorLayer hit={snapHit} scale={scale} />
        </Layer>
      </Stage>

      {/* ── Plot decorations — pushed left of the floating right-side panel ── */}
      <div className="pointer-events-none absolute inset-y-0 right-3 w-0 sm:right-[19.5rem]">
        <CompassRose />
        {/* Dar tuvalde (bölünmüş görünüm) antet sol-alt HUD'larla çakışır → gizle. */}
        {width >= 900 && <TitleBlock project={project} />}
      </div>
      {/* Sol-alt referanslar katalog açıkken onun altında kalırdı → gizle. */}
      {!catalogOpen && <ScaleBar scale={scale} />}

      {/* ── Right-side context properties panel ────────────────────────── */}
      <ContextPropertiesPanel
        primary={primary}
        selectionCount={selection.length}
        actions={panelActions}
        editorSettings={editorSettings}
        onClose={clearSelection}
      />

      {/* ── Equipment catalog (shared with 3D) — arm a product, click to drop ── */}
      <EquipmentCatalogPanel
        side="left"
        armedProductId={equipment.armedProduct?.id ?? null}
        onArm={(item) => {
          equipment.setArmedProduct(item);
          if (item) clearSelection();
        }}
        open={catalogOpen}
        onToggleOpen={() => setCatalogOpen((v) => !v)}
      />

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <Toolbar2D
        tool={tool}
        setTool={setTool}
        catalogOpen={catalogOpen}
        toggleCatalog={() => setCatalogOpen((v) => !v)}
        armed={!!equipment.armedProduct}
        zoomIn={viewport.zoomIn}
        zoomOut={viewport.zoomOut}
        fit={fitToContent}
        snapOn={snapOn}
        toggleSnap={() => setSnapOn(!snapOn)}
        orthoOn={orthoOn}
        toggleOrtho={() => setOrthoOn(!orthoOn)}
        showGrid={showGrid}
        toggleGrid={() => setShowGrid(!showGrid)}
        showDims={showDims}
        toggleDims={() => setShowDims(!showDims)}
        gridMm={gridMm}
        setGridMm={setGridMm}
        hasSelection={hasSelection}
        deleteSelection={commands.deleteSelection}
        clearAll={commands.requestClearAll}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Armed-product hint */}
      {equipment.armedProduct && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-brand-red px-3.5 py-1.5 text-[11px] font-medium text-white shadow-lg shadow-brand-red/25">
          {equipment.armedProduct.name} · {t('design3d.armed.hint2d')}
        </div>
      )}

      {/* Drawing hints */}
      {!equipment.armedProduct && (draw.isDrawing || isPlacing) && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-20 inline-flex max-w-[80%] -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900/90 px-3.5 py-1.5 text-[11px] font-medium text-white shadow-lg backdrop-blur">
          {tool === 'draw-room'
            ? draftPoints.length === 0 ? t('design3d.hint.drawRoomStart') : t('design3d.hint.drawRoom')
            : tool === 'draw-rect'
              ? draftPoints.length === 0 ? t('design3d.hint.drawRectStart') : t('design3d.hint.drawRect')
              : tool === 'draw-wall'
                ? draftPoints.length === 0 ? t('design3d.hint.drawWallStart') : t('design3d.hint.drawWall')
                : t('design3d.openings.placeHint')}
        </div>
      )}

      {/* Toast */}
      {hint && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 inline-flex max-w-sm -translate-x-1/2 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-medium text-amber-700 shadow-lg shadow-slate-900/5">
          {hint}
        </div>
      )}

      {/* Zoom HUD */}
      <div className={`pointer-events-none absolute bottom-[4.75rem] left-3 px-3 py-1 tabular-nums ${HUD} ${catalogOpen ? 'hidden' : ''}`}>
        {t('design3d.hud.gridScale2d', { px: (scale * 1000).toFixed(2) })}
        {orthoOn && <span className="ml-2 font-semibold text-amber-600">ORTHO</span>}
        {!snapOn && <span className="ml-2 text-slate-400">SNAP OFF</span>}
      </div>

      {/* Floating inputs */}
      {vertexEditing.editingEdge && editingEdgeScreen && (
        <EdgeLengthInput
          screen={editingEdgeScreen}
          value={vertexEditing.editingEdge.value}
          onChange={(v) => vertexEditing.setEditingEdge({ ...vertexEditing.editingEdge!, value: v })}
          onCommit={vertexEditing.commitEditEdge}
          onCancel={() => vertexEditing.setEditingEdge(null)}
        />
      )}
      {vertexEditing.editingAngle && editingAngleScreen && (
        <AngleInput
          screen={editingAngleScreen}
          value={vertexEditing.editingAngle.value}
          onChange={(v) => vertexEditing.setEditingAngle({ ...vertexEditing.editingAngle!, value: v })}
          onCommit={() => vertexEditing.commitEditAngle()}
          onSnap90={() => vertexEditing.commitEditAngle(90)}
          onCancel={() => vertexEditing.setEditingAngle(null)}
        />
      )}
      {entry && draw.canType && (
        <LengthEntryHud
          entry={entry}
          unit={lengthUnit}
          screen={entryScreen}
          labels={draw.entryLabels}
          onChange={updateEntry}
          onToggleField={() => updateEntry({ field: entry.field === 'length' ? 'angle' : 'length' })}
          onCommit={draw.commitEntry}
          onCancel={closeEntry}
          onUnitChange={setLengthUnit}
        />
      )}

      {/* Context menu */}
      {contextMenu && menu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          hostWidth={width}
          hostHeight={height}
          title={menu.title}
          items={menu.items}
          onClose={closeContextMenu}
        />
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={!!commands.confirm}
        title={commands.confirm?.title ?? ''}
        description={commands.confirm?.description}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={commands.runConfirm}
        onCancel={commands.cancelConfirm}
      />
    </div>
  );
}

void ((_: VertexId) => _);
