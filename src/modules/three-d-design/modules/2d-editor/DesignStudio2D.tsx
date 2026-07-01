/**
 * DesignStudio2D — professional CAD-like 2D editor (Konva.js).
 *
 * Architecture
 *   Local view-state  →  useEditor2DState    (pan/zoom, draft, tool)
 *   Domain state      →  useProjectStore     (NORMALIZED model)
 *   Rendering         →  pure Layer components in ./render
 *   CAD logic         →  ./cad + core/* helpers
 *
 * Key behaviours unlocked by Phase 3 normalization
 *   - Vertex drag calls `moveVertex(id, pos)`. Every wall referencing that
 *     vertex updates automatically — no "rebuild walls" dance, identity is
 *     preserved (so openings, materials, etc. survive geometry edits).
 *   - Edge split calls `splitWall(wallId, t)`. The room loop is updated by
 *     the builder so closure invariant I-2 stays intact.
 *   - Polygon creation uses `createPolygonRoom(points)` which dedupes
 *     vertices against existing geometry (touching corners merge).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';

import {
  Hand,
  MousePointer2,
  PenTool,
  Pencil,
  Plus,
  Minus,
  Maximize2,
  Trash2,
  Eraser,
  Slash,
  Package,
} from 'lucide-react';

import {
  roomForPoint,
  roomPolygon,
  roomVertexIds,
  snapToGrid,
  useProjectStore,
  type Room,
  type RoomId,
  type Vec2,
  type VertexId,
  type WallId,
} from '../..';
import {
  nearestPointOnEdges,
  nearestVertex,
  polygonToEdges,
  mToMm,
  resizeEdgeLength,
  shouldClosePolygon,
} from './cad/geometry';
import { useEditor2DState } from './state/editorState';

import GridLayer from './render/GridLayer';
import WallLayer from './render/WallLayer';
import DimensionLayer from './render/DimensionLayer';
import DraftLayer from './render/DraftLayer';
import VertexHandlesLayer from './render/VertexHandlesLayer';
import OpeningsLayer from './render/OpeningsLayer';
import LooseWallsLayer from './render/LooseWallsLayer';
import { CompassRose, TitleBlock, ScaleBar } from './render/PlotOverlays';
import PropertiesPanel, { OPENING_DEFAULTS } from './panels/PropertiesPanel';
import EquipmentPropertiesPanel2D from './panels/EquipmentPropertiesPanel2D';
import EquipmentLayer2D from './render/EquipmentLayer2D';
import EquipmentCatalogPanel from '../3d-editor/panels/EquipmentCatalogPanel';
import { parseHeightMm, mapEquipmentCategory } from '../3d-editor/loaders/productMesh';
import { getCatalogEntry } from '../3d-editor/loaders/equipmentCatalog';
import { defaultMountFor, defaultZForMount, containFloorItem, obbCenterFromMinCorner } from '../3d-editor/interaction/placement';
import { resolveEquipmentDrag } from '../3d-editor/interaction/resolveDrag';
import type { EquipmentItem } from '../../../../stores/equipmentStore';

// ── Constants ────────────────────────────────────────────────────────────────
const VERTEX_MERGE_PX = 15;
const WHEEL_ZOOM_FACTOR = 1.08;
const MIN_SCALE = 0.005;
const MAX_SCALE = 2;
const SNAP_GRID_MM = 100;

interface EditableRoom {
  id: string;
  name: string;
  /** Vertex ids in loop order. */
  vertexIds: VertexId[];
  /** Resolved Vec2 points in the same order. */
  points: Vec2[];
  /** Wall ids in loop order — used by edge-split / per-edge length edits. */
  wallIds: WallId[];
}

interface DesignStudio2DProps {
  width: number;
  height: number;
}

export default function DesignStudio2D({ width, height }: DesignStudio2DProps) {
  // ── Store wiring ─────────────────────────────────────────────────────────
  const project = useProjectStore((s) => s.project);
  const moveVertex = useProjectStore((s) => s.moveVertex);
  const createPolygonRoom = useProjectStore((s) => s.createPolygonRoom);
  const splitWallAction = useProjectStore((s) => s.splitWall);
  const removeRoom = useProjectStore((s) => s.removeRoom);
  const removeOpening = useProjectStore((s) => s.removeOpening);
  const newProject = useProjectStore((s) => s.newProject);
  const removeWall = useProjectStore((s) => s.removeWall);
  const addOpening = useProjectStore((s) => s.addOpening);
  const ensureVertex = useProjectStore((s) => s.ensureVertex);
  const addWall = useProjectStore((s) => s.addWall);
  const addEquipment = useProjectStore((s) => s.addEquipment);
  const updateEquipment = useProjectStore((s) => s.updateEquipment);
  const dissolveVertex = useProjectStore((s) => s.dissolveVertex);
  const removeEquipment = useProjectStore((s) => s.removeEquipment);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.canUndo());
  const canRedo = useProjectStore((s) => s.canRedo());

  // Local editor state
  const tool = useEditor2DState((s) => s.tool);
  const setTool = useEditor2DState((s) => s.setTool);
  const scale = useEditor2DState((s) => s.scale);
  const offsetX = useEditor2DState((s) => s.offsetX);
  const offsetY = useEditor2DState((s) => s.offsetY);
  const setScale = useEditor2DState((s) => s.setScale);
  const setOffset = useEditor2DState((s) => s.setOffset);
  const setViewport = useEditor2DState((s) => s.setViewport);

  const draftPoints = useEditor2DState((s) => s.draftPoints);
  const draftCursor = useEditor2DState((s) => s.draftCursor);
  const beginDraft = useEditor2DState((s) => s.beginDraft);
  const pushDraftPoint = useEditor2DState((s) => s.pushDraftPoint);
  const setDraftCursor = useEditor2DState((s) => s.setDraftCursor);
  const cancelDraft = useEditor2DState((s) => s.cancelDraft);

  const selectedRoomId = useEditor2DState((s) => s.selectedRoomId);
  const selectVertex = useEditor2DState((s) => s.selectVertex);
  const selectedVertex = useEditor2DState((s) => s.selectedVertex);
  const selectRoom = useEditor2DState((s) => s.selectRoom);
  const selectEdge = useEditor2DState((s) => s.selectEdge);
  const selectedEdge = useEditor2DState((s) => s.selectedEdge);
  const selectOpening = useEditor2DState((s) => s.selectOpening);
  const selectedOpeningId = useEditor2DState((s) => s.selectedOpeningId);
  const selectedWallId = useEditor2DState((s) => s.selectedWallId);
  const selectWall = useEditor2DState((s) => s.selectWall);

  const stageRef = useRef<Konva.Stage | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // ── Equipment placement (shared store with 3D editor) ────────────────────
  const [armedProduct, setArmedProduct] = useState<EquipmentItem | null>(null);
  // Masaüstünde açık (keşif), mobilde kapalı (tuval görünsün; Paket butonu açar).
  const [catalogOpen, setCatalogOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const equipmentList = useMemo(() => Object.values(project.equipment), [project.equipment]);

  // Silme geri bildirimi — bir şey silinemediğinde kısa süreli ipucu (sessiz no-op yerine).
  const [deleteHint, setDeleteHint] = useState<string | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashHint = useCallback((msg: string) => {
    setDeleteHint(msg);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setDeleteHint(null), 3500);
  }, []);

  // ── 2D ↔ 3D kamera/odak senkronu ─────────────────────────────────────────
  // 2D'ye girerken paylaşılan odağı merkeze al; çıkarken görünüm merkezini
  // sakla → 3D aynı noktaya bakar. (Sadece pan; zoom korunur.)
  const sizeRef = useRef({ w: width, h: height });
  sizeRef.current = { w: width, h: height };
  useEffect(() => {
    const st = useEditor2DState.getState();
    const f = st.focusWorld;
    const { w, h } = sizeRef.current;
    if (f && w > 0 && h > 0) {
      st.setOffset(w / 2 - f.x * st.scale, h / 2 - f.y * st.scale);
    }
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

  // ── Derived: active room as an editable view ─────────────────────────────
  const activeRoom = useMemo<EditableRoom | null>(() => {
    const id = selectedRoomId ?? Object.keys(project.rooms)[0] ?? null;
    if (!id) return null;
    const room = project.rooms[id] as Room | undefined;
    if (!room) return null;
    return {
      id: room.id,
      name: room.name,
      vertexIds: roomVertexIds(project, room) as VertexId[],
      points: roomPolygon(project, room),
      wallIds: [...room.wallLoop] as WallId[],
    };
  }, [project, selectedRoomId]);

  const otherRooms = useMemo<EditableRoom[]>(() => {
    return Object.keys(project.rooms)
      .filter((id) => id !== activeRoom?.id)
      .map((id) => {
        const r = project.rooms[id] as Room;
        return {
          id: r.id,
          name: r.name,
          vertexIds: roomVertexIds(project, r) as VertexId[],
          points: roomPolygon(project, r),
          wallIds: [...r.wallLoop] as WallId[],
        };
      });
  }, [project, activeRoom?.id]);

  // ── Coordinate conversion ────────────────────────────────────────────────
  const stageToWorld = useCallback(
    (sx: number, sy: number): Vec2 => ({
      x: (sx - offsetX) / scale,
      y: (sy - offsetY) / scale,
    }),
    [offsetX, offsetY, scale],
  );

  // ── Snap resolver ────────────────────────────────────────────────────────
  const resolveSnap = useCallback(
    (raw: Vec2): Vec2 => {
      const radiusMm = VERTEX_MERGE_PX / scale;
      // 1) Snap to any vertex in the document (cross-room corners weld).
      const allVertices = Object.values(project.vertices).map((v) => ({ x: v.x, y: v.y }));
      const v = nearestVertex(raw, allVertices, radiusMm);
      if (v) return v;
      // 2) Snap to draft polygon (so close-to-start works).
      if (draftPoints.length > 0) {
        const dv = nearestVertex(raw, draftPoints, radiusMm);
        if (dv) return dv;
      }
      // 3) Grid snap.
      return snapToGrid(raw, SNAP_GRID_MM);
    },
    [draftPoints, project.vertices, scale],
  );

  // ── Polygon completion → builder ─────────────────────────────────────────
  const finishPolygon = useCallback(
    (loop: Vec2[]) => {
      if (loop.length < 3) {
        cancelDraft();
        return;
      }
      const newId = createPolygonRoom(loop, {
        name: `Room ${Object.keys(project.rooms).length + 1}`,
      });
      cancelDraft();
      selectRoom(newId);
      setTool('select');
    },
    [cancelDraft, createPolygonRoom, project.rooms, selectRoom, setTool],
  );

  // ── Pointer handlers ─────────────────────────────────────────────────────
  const onStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const rawWorld = stageToWorld(pos.x, pos.y);
    const world = resolveSnap(rawWorld);

    const native = e.evt as MouseEvent;
    if (
      native.button === 1 ||
      tool === 'pan' ||
      (native.button === 0 && (native.altKey || native.metaKey))
    ) {
      isPanningRef.current = true;
      panStartRef.current = { x: pos.x, y: pos.y, ox: offsetX, oy: offsetY };
      stage.container().style.cursor = 'grabbing';
      return;
    }

    const clickedOnEmpty = e.target === e.target.getStage();

    // Ürün yerleştirme — katalogdan seçili (armed) ürünü tıklanan noktaya bırak.
    // 3D editörle AYNI store'a yazar → 3D'de de anında görünür.
    if (armedProduct && native.button === 0) {
      const l = armedProduct.l;
      const w = armedProduct.w;
      const category = mapEquipmentCategory(armedProduct.cat);
      const mount = defaultMountFor(category);
      const z = defaultZForMount(mount);
      // position = footprint MIN-CORNER (domain convention); tıklama merkezde.
      const minCorner = containFloorItem(
        project,
        { x: rawWorld.x - l / 2, y: rawWorld.y - w / 2 },
        0,
        l,
        w,
      );
      const newId = addEquipment({
        catalogId: armedProduct.id,
        name: armedProduct.name,
        category,
        position: { x: minCorner.x, y: minCorner.y, z },
        rotation: 0,
        mount,
        footprint: { width: l, depth: w },
        heightMm: parseHeightMm(armedProduct.h),
        allowOverlap: getCatalogEntry(armedProduct.id)?.allowOverlap,
      });
      setSelectedEquipmentId(newId);
      if (!native.shiftKey) setArmedProduct(null);
      return;
    }

    if (tool === 'draw-room' && native.button === 0) {
      if (draftPoints.length === 0) {
        beginDraft(world);
        return;
      }
      if (shouldClosePolygon(world, draftPoints, VERTEX_MERGE_PX / scale)) {
        finishPolygon(draftPoints);
        return;
      }
      pushDraftPoint(world);
      return;
    }

    // Free-form wall chain (draw partition walls inside an existing room)
    if (tool === 'draw-wall' && native.button === 0) {
      if (draftPoints.length === 0) {
        // First click: anchor the chain. Vertex auto-creates / merges with
        // any existing vertex within the snap radius.
        beginDraft(world);
        return;
      }
      const last = draftPoints[draftPoints.length - 1];
      // Skip degenerate (zero-length) clicks.
      if (Math.hypot(world.x - last.x, world.y - last.y) < 1) return;
      const va = ensureVertex(last);
      const vb = ensureVertex(world);
      addWall(va, vb);
      pushDraftPoint(world);
      return;
    }

    // Place door / window: nearest wall edge of the active room → addOpening
    if ((tool === 'place-door' || tool === 'place-window') && native.button === 0) {
      if (!activeRoom) return;
      const edges = polygonToEdges(activeRoom.points);
      const hit = nearestPointOnEdges(rawWorld, edges, (VERTEX_MERGE_PX * 4) / scale);
      if (!hit) return;
      const wallId = activeRoom.wallIds[hit.edgeIndex];
      const wallLengthMm = Math.hypot(
        activeRoom.points[(hit.edgeIndex + 1) % activeRoom.points.length].x -
          activeRoom.points[hit.edgeIndex].x,
        activeRoom.points[(hit.edgeIndex + 1) % activeRoom.points.length].y -
          activeRoom.points[hit.edgeIndex].y,
      );
      const isDoor = tool === 'place-door';
      const defs = isDoor ? OPENING_DEFAULTS.door : OPENING_DEFAULTS.window;
      // Center the opening on the click, clamped to wall extents.
      const clickU = hit.t * wallLengthMm;
      const offset = Math.max(
        50,
        Math.min(wallLengthMm - defs.width - 50, clickU - defs.width / 2),
      );
      const openingId = addOpening({
        kind: isDoor ? 'door' : 'window',
        wallId,
        offset,
        width: defs.width,
        height: defs.height,
        sillHeight: defs.sillHeight,
      });
      selectOpening(openingId);
      setTool('select');
      return;
    }

    if (tool === 'select' && native.button === 0) {
      // 1) Mavi oda ÇİZGİSİNE (kenara) tıklandı mı? Köşeye çok yakınsa köşe seçimi
      //    (VertexHandlesLayer) önceliklidir, o yüzden kenar seçmeyi atla.
      let edgePicked = false;
      if (activeRoom && activeRoom.points.length >= 2) {
        const nearV = nearestVertex(rawWorld, activeRoom.points, (VERTEX_MERGE_PX * 1.8) / scale);
        if (!nearV) {
          const edges = polygonToEdges(activeRoom.points);
          const hit = nearestPointOnEdges(rawWorld, edges, (VERTEX_MERGE_PX * 2.5) / scale);
          if (hit) {
            selectVertex(null);
            selectOpening(null);
            selectWall(null);
            setSelectedEquipmentId(null);
            selectEdge(hit.edgeIndex);
            selectRoom(activeRoom.id as RoomId);
            edgePicked = true;
          }
        }
      }
      // 2) Kenar seçilmediyse ve boş tuvale tıklandıysa: oda içindeyse odayı seç,
      //    tamamen boşluğa tıklandıysa tüm seçimi kaldır.
      if (!edgePicked && clickedOnEmpty) {
        selectVertex(null);
        selectEdge(null);
        selectOpening(null);
        selectWall(null);
        setSelectedEquipmentId(null);
        const hitRoom = roomForPoint(project, rawWorld);
        selectRoom(hitRoom ? (hitRoom.id as RoomId) : null);
      }
    }
  };

  const onStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (isPanningRef.current && panStartRef.current) {
      const dx = pos.x - panStartRef.current.x;
      const dy = pos.y - panStartRef.current.y;
      setOffset(panStartRef.current.ox + dx, panStartRef.current.oy + dy);
      return;
    }

    if ((tool === 'draw-room' || tool === 'draw-wall') && draftPoints.length > 0) {
      const raw = stageToWorld(pos.x, pos.y);
      setDraftCursor(resolveSnap(raw));
    }
  };

  const onStageMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'default';
    }
  };

  /** Right-click on an active-room edge → split wall, insert vertex. */
  const onStageContextMenu = (e: KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    if (!activeRoom) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const world = stageToWorld(pos.x, pos.y);
    const edges = polygonToEdges(activeRoom.points);
    const hit = nearestPointOnEdges(world, edges, (VERTEX_MERGE_PX * 2) / scale);
    if (!hit) return;
    splitWallAction(activeRoom.wallIds[hit.edgeIndex], hit.t);
  };

  // ── Wheel zoom (zoom-to-cursor) ─────────────────────────────────────────
  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = direction > 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    if (newScale === scale) return;
    const worldX = (pointer.x - offsetX) / scale;
    const worldY = (pointer.y - offsetY) / scale;
    const newOffsetX = pointer.x - worldX * newScale;
    const newOffsetY = pointer.y - worldY * newScale;
    setViewport(newScale, newOffsetX, newOffsetY);
  };

  // ── Selected loose wall (free-form partition wall) ──────────────────────
  const selectedLooseWall = useMemo(() => {
    if (!selectedWallId) return null;
    const wall = project.walls[selectedWallId as WallId];
    if (!wall) return null;
    // Skip room walls — they're edited via vertex handles on the active room.
    for (const r of Object.values(project.rooms)) {
      if (r.wallLoop.includes(wall.id)) return null;
    }
    const va = project.vertices[wall.a];
    const vb = project.vertices[wall.b];
    if (!va || !vb) return null;
    return {
      wall,
      vertexIds: [wall.a, wall.b] as VertexId[],
      points: [
        { x: va.x, y: va.y },
        { x: vb.x, y: vb.y },
      ] as Vec2[],
    };
  }, [project, selectedWallId]);

  const [wallDragOverride, setWallDragOverride] = useState<Vec2[] | null>(null);
  const onWallEndDragMove = useCallback(
    (i: number, world: Vec2) => {
      if (!selectedLooseWall) return;
      const snapped = resolveSnap(world);
      const next = selectedLooseWall.points.map((p, idx) => (idx === i ? snapped : p));
      setWallDragOverride(next);
    },
    [resolveSnap, selectedLooseWall],
  );
  const onWallEndDragEnd = useCallback(
    (i: number, world: Vec2) => {
      if (!selectedLooseWall) return;
      const snapped = resolveSnap(world);
      setWallDragOverride(null);
      moveVertex(selectedLooseWall.vertexIds[i], snapped);
    },
    [moveVertex, resolveSnap, selectedLooseWall],
  );
  const livePointsWall: Vec2[] | null = selectedLooseWall
    ? wallDragOverride ?? selectedLooseWall.points
    : null;

  // ── Vertex drag — rubber-band + commit on drag end ──────────────────────
  const [dragOverride, setDragOverride] = useState<Vec2[] | null>(null);
  const onVertexDragMove = useCallback(
    (i: number, world: Vec2) => {
      if (!activeRoom) return;
      const snapped = resolveSnap(world);
      const next = activeRoom.points.map((p, idx) => (idx === i ? snapped : p));
      setDragOverride(next);
    },
    [activeRoom, resolveSnap],
  );
  const onVertexDragEnd = useCallback(
    (i: number, world: Vec2) => {
      if (!activeRoom) return;
      const snapped = resolveSnap(world);
      setDragOverride(null);
      // Domain-level move — affects every wall that shares this vertex.
      moveVertex(activeRoom.vertexIds[i], snapped);
    },
    [activeRoom, moveVertex, resolveSnap],
  );
  const livePoints: Vec2[] = dragOverride ?? activeRoom?.points ?? [];

  // ── Wall length editing — moves end vertex along edge direction ─────────
  const [editingEdge, setEditingEdge] = useState<{ index: number; valueM: string } | null>(null);
  const beginEditEdge = (index: number) => {
    if (!activeRoom) return;
    const a = livePoints[index];
    const b = livePoints[(index + 1) % livePoints.length];
    if (!a || !b) return;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    setEditingEdge({ index, valueM: (d / 1000).toFixed(2) });
    selectEdge(index);
  };
  const commitEditEdge = () => {
    if (!editingEdge || !activeRoom) return;
    const meters = Number.parseFloat(editingEdge.valueM.replace(',', '.'));
    if (!Number.isFinite(meters) || meters <= 0) {
      setEditingEdge(null);
      return;
    }
    // Compute new end position by resizing along the current direction…
    const newPoints = resizeEdgeLength(activeRoom.points, editingEdge.index, mToMm(meters));
    const endIndex = (editingEdge.index + 1) % activeRoom.vertexIds.length;
    // …then move just the end vertex (every wall sharing it follows).
    moveVertex(activeRoom.vertexIds[endIndex], newPoints[endIndex]);
    setEditingEdge(null);
  };

  // Length-edit input for the selected loose wall (single edge a→b).
  const [editingWallLen, setEditingWallLen] = useState<string | null>(null);
  const beginEditWallLen = () => {
    if (!selectedLooseWall || !livePointsWall) return;
    const [a, b] = livePointsWall;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    setEditingWallLen((d / 1000).toFixed(2));
  };
  const commitEditWallLen = () => {
    if (editingWallLen == null || !selectedLooseWall) return;
    const meters = Number.parseFloat(editingWallLen.replace(',', '.'));
    if (!Number.isFinite(meters) || meters <= 0) {
      setEditingWallLen(null);
      return;
    }
    const [a, b] = selectedLooseWall.points;
    const dirX = b.x - a.x;
    const dirY = b.y - a.y;
    const len = Math.hypot(dirX, dirY);
    if (len < 1) {
      setEditingWallLen(null);
      return;
    }
    const ratio = mToMm(meters) / len;
    moveVertex(selectedLooseWall.vertexIds[1], {
      x: a.x + dirX * ratio,
      y: a.y + dirY * ratio,
    });
    setEditingWallLen(null);
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Escape') {
        if (draftPoints.length > 0) cancelDraft();
        setEditingEdge(null);
        setEditingWallLen(null);
        if (selectedWallId) selectWall(null);
        if (armedProduct) setArmedProduct(null);
        if (selectedEquipmentId) setSelectedEquipmentId(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedVertex !== null && activeRoom) {
        // Seçili köşeyi sil → komşu iki duvar birleşir (L-şekli/çentik = alan çıkar/ekle).
        const vid = activeRoom.vertexIds[selectedVertex];
        if (vid) {
          const ok = dissolveVertex(vid);
          if (ok) selectVertex(null);
          else flashHint('Bu köşe silinemez (odada en az 3 kenar kalmalı). Tüm odayı silmek için içine tıklayıp Delete\'e basın.');
        }
        e.preventDefault();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdge !== null && activeRoom) {
        // Seçili KENARI (mavi çizgi) sil → uç köşesini çöz; komşu kenarla birleşir.
        const n = activeRoom.vertexIds.length;
        const endVid = activeRoom.vertexIds[(selectedEdge + 1) % n];
        const startVid = activeRoom.vertexIds[selectedEdge];
        let ok = false;
        if (endVid) ok = dissolveVertex(endVid);
        if (!ok && startVid) ok = dissolveVertex(startVid);
        if (ok) selectEdge(null);
        else flashHint('Bu çizgi tek başına silinemez (odada en az 3 kenar kalmalı). Tüm odayı silmek için içine tıklayıp Delete\'e basın.');
        e.preventDefault();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEquipmentId) {
        removeEquipment(selectedEquipmentId);
        setSelectedEquipmentId(null);
        e.preventDefault();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedOpeningId) {
        // Seçili kapı/pencereyi sil.
        removeOpening(selectedOpeningId);
        selectOpening(null);
        e.preventDefault();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWallId) {
        removeWall(selectedWallId as WallId);
        selectWall(null);
        e.preventDefault();
        return;
      }
      // Seçili odayı sil — köşe/duvar/ürün seçili DEĞİLKEN. Yalnız BU oda ve KENDİ
      // duvarları+kapıları gider; içinde kalan başka çizim (loose bölme) KORUNUR.
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedRoomId &&
        selectedVertex === null &&
        !selectedWallId &&
        !selectedEquipmentId
      ) {
        removeRoom(selectedRoomId as RoomId);
        selectRoom(null);
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter' && tool === 'draw-room' && draftPoints.length >= 3) {
        finishPolygon(draftPoints);
        return;
      }
      if (e.key.toLowerCase() === 'r' && selectedEquipmentId) {
        // Seçili ürünü 90° döndür (3D editör ile aynı; Shift = ters yön).
        const eq = project.equipment[selectedEquipmentId];
        if (eq) {
          const delta = ((e.shiftKey ? -90 : 90) * Math.PI) / 180;
          updateEquipment(selectedEquipmentId, { rotation: eq.rotation + delta });
        }
        e.preventDefault();
        return;
      }
      if (e.key.toLowerCase() === 'v') setTool('select');
      if (e.key.toLowerCase() === 'r') setTool('draw-room');
      if (e.key.toLowerCase() === 'w') setTool('draw-wall');
      if (e.key.toLowerCase() === 'h' || e.key === ' ') setTool('pan');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo();
        else undo();
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    cancelDraft,
    draftPoints,
    finishPolygon,
    redo,
    removeWall,
    selectWall,
    selectedWallId,
    setTool,
    tool,
    undo,
    armedProduct,
    selectedEquipmentId,
    removeEquipment,
    project,
    updateEquipment,
    selectedVertex,
    activeRoom,
    selectVertex,
    dissolveVertex,
    selectedRoomId,
    removeRoom,
    selectRoom,
    selectedEdge,
    selectEdge,
    flashHint,
    selectedOpeningId,
    removeOpening,
    selectOpening,
  ]);

  // ── Equipment drag (2D) — 3D ile ORTAK çözücü (snap + çakışma + clamp) ─────
  const dragCenterRef = useRef<{ x: number; y: number } | null>(null);
  const resolveEqDrag = useCallback(
    (id: string, center: { x: number; y: number }) => {
      const eq = project.equipment[id];
      if (!eq) return null;
      const w = eq.footprint.width;
      const d = eq.footprint.depth;
      const res = resolveEquipmentDrag({
        project,
        eq,
        desiredMinCornerMm: { x: center.x - w / 2, y: center.y - d / 2 },
        snapGridMm: 10,
        edgeSnapTolMm: 50,
        collisionEnabled: true,
        prevValidCenter: dragCenterRef.current,
      });
      dragCenterRef.current = res.validCenter;
      return {
        nodeX: res.x + w / 2,
        nodeY: res.y + d / 2,
        rotationDeg: (res.rotation * 180) / Math.PI,
        rotationRad: res.rotation,
        minX: res.x,
        minY: res.y,
      };
    },
    [project],
  );

  // ── Fit to content ───────────────────────────────────────────────────────
  const fitToContent = useCallback(() => {
    const points: Vec2[] = [];
    for (const r of [activeRoom, ...otherRooms]) {
      if (r) points.push(...r.points);
    }
    if (points.length === 0) {
      setViewport(0.05, 200, 200);
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    const padding = 1500;
    minX -= padding; minY -= padding; maxX += padding; maxY += padding;
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const sx = width / w;
    const sy = height / h;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(sx, sy)));
    const newOffsetX = -minX * newScale + (width - w * newScale) / 2;
    const newOffsetY = -minY * newScale + (height - h * newScale) / 2;
    setViewport(newScale, newOffsetX, newOffsetY);
  }, [activeRoom, height, otherRooms, setViewport, width]);

  // ── Render ───────────────────────────────────────────────────────────────
  const cursor =
    tool === 'pan'
      ? 'grab'
      : armedProduct ||
        tool === 'draw-room' ||
        tool === 'draw-wall' ||
        tool === 'place-door' ||
        tool === 'place-window'
      ? 'crosshair'
      : 'default';

  return (
    <div className="relative h-full w-full bg-white overflow-hidden" style={{ cursor }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={offsetX}
        y={offsetY}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        onContextMenu={onStageContextMenu}
        onWheel={onWheel}
      >
        <Layer listening={false}>
          <GridLayer
            width={width}
            height={height}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
          />
        </Layer>

        <Layer>
          {otherRooms.map((r) => (
            <WallLayer key={r.id} points={r.points} scale={scale} />
          ))}
          {/* Free-form partition walls (drawn with the W tool). */}
          <LooseWallsLayer
            project={project}
            scale={scale}
            selectedWallId={selectedWallId}
            onSelect={(id) => {
              selectWall(id);
              setEditingWallLen(null);
            }}
          />
        </Layer>

        <Layer>
          {livePoints.length >= 3 && (
            <>
              <WallLayer points={livePoints} scale={scale} selected />
              {/* Seçili kenar vurgusu (silmeye hazır → kırmızı) */}
              {selectedEdge !== null &&
                livePoints[selectedEdge] &&
                livePoints[(selectedEdge + 1) % livePoints.length] && (
                  <Line
                    points={[
                      livePoints[selectedEdge].x,
                      livePoints[selectedEdge].y,
                      livePoints[(selectedEdge + 1) % livePoints.length].x,
                      livePoints[(selectedEdge + 1) % livePoints.length].y,
                    ]}
                    stroke="#DC2626"
                    strokeWidth={4 / scale}
                    lineCap="round"
                    listening={false}
                  />
                )}
              <DimensionLayer
                points={livePoints}
                scale={scale}
                onEdgeClick={(i) => beginEditEdge(i)}
              />
            </>
          )}
        </Layer>

        <Layer>
          <OpeningsLayer
            project={project}
            scale={scale}
            selectedOpeningId={selectedOpeningId}
            onClick={(id) => selectOpening(id)}
          />
        </Layer>

        {/* Equipment — shared with 3D editor (same project.equipment) */}
        <Layer>
          <EquipmentLayer2D
            equipment={equipmentList}
            scale={scale}
            selectedId={selectedEquipmentId}
            draggable={tool === 'select'}
            onSelect={(id) => {
              setSelectedEquipmentId(id);
              selectVertex(null);
              selectEdge(null);
              selectOpening(null);
              selectWall(null);
            }}
            onDragStart={(id) => {
              const eq = project.equipment[id];
              dragCenterRef.current = eq
                ? obbCenterFromMinCorner(eq.position.x, eq.position.y, eq.rotation, eq.footprint.width, eq.footprint.depth)
                : null;
            }}
            onDragMove={(id, center) => {
              const r = resolveEqDrag(id, center);
              return r ? { x: r.nodeX, y: r.nodeY, rotation: r.rotationDeg } : undefined;
            }}
            onDragEnd={(id, center) => {
              const r = resolveEqDrag(id, center);
              const eq = project.equipment[id];
              if (r && eq) {
                updateEquipment(id, {
                  position: { x: r.minX, y: r.minY, z: eq.position.z },
                  rotation: r.rotationRad,
                });
              }
              dragCenterRef.current = null;
            }}
          />
        </Layer>

        <Layer>
          {activeRoom && livePoints.length > 0 && (
            <VertexHandlesLayer
              points={livePoints}
              scale={scale}
              selectedIndex={selectedVertex}
              onClick={(i) => selectVertex(i)}
              onDragMove={onVertexDragMove}
              onDragEnd={onVertexDragEnd}
            />
          )}
        </Layer>

        <Layer>
          {livePointsWall && (
            <VertexHandlesLayer
              points={livePointsWall}
              scale={scale}
              selectedIndex={null}
              onClick={() => {}}
              onDragMove={onWallEndDragMove}
              onDragEnd={onWallEndDragEnd}
            />
          )}
        </Layer>

        <Layer listening={false}>
          <DraftLayer
            points={draftPoints}
            cursor={draftCursor}
            scale={scale}
            closeRadiusMm={VERTEX_MERGE_PX / scale}
          />
        </Layer>
      </Stage>

      {/* ── Plot decorations — pushed left of the right-side panel ───── */}
      <div className="absolute inset-y-0 right-72 w-0 pointer-events-none">
        <CompassRose />
        <TitleBlock project={project} />
      </div>
      <ScaleBar scale={scale} />

      {/* ── Right-side properties panel ─────────────────────────────── */}
      <PropertiesPanel />

      {/* Seçili ürün için 2B özellik paneli (renk / üst-üste / yön / sil) */}
      {selectedEquipmentId && (
        <EquipmentPropertiesPanel2D
          equipmentId={selectedEquipmentId}
          onClose={() => setSelectedEquipmentId(null)}
        />
      )}

      {/* ── Equipment catalog (shared with 3D) — arm a product, click to drop ── */}
      <EquipmentCatalogPanel
        side="left"
        armedProductId={armedProduct?.id ?? null}
        onArm={(item) => {
          setArmedProduct(item);
          if (item) setSelectedEquipmentId(null);
        }}
        open={catalogOpen}
        onToggleOpen={() => setCatalogOpen((v) => !v)}
      />

      {/* Armed-product hint */}
      {armedProduct && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium bg-brand-red text-white shadow-lg shadow-slate-900/10 pointer-events-none">
          {armedProduct.name} · plana tıkla (Shift = çoklu · Esc = iptal)
        </div>
      )}

      {/* Silme geri bildirimi (sessiz no-op yerine) */}
      {deleteHint && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-sm inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 shadow-lg shadow-slate-900/5 pointer-events-none text-center">
          {deleteHint}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-white/95 backdrop-blur border border-slate-200/70 shadow-lg shadow-slate-900/5">
        <ToolBtn active={tool === 'select'} onClick={() => setTool('select')} title="Select (V)">
          <MousePointer2 size={14} />
        </ToolBtn>
        <ToolBtn active={tool === 'draw-room'} onClick={() => setTool('draw-room')} title="Oda çiz (R)">
          <PenTool size={14} />
        </ToolBtn>
        <ToolBtn active={tool === 'draw-wall'} onClick={() => setTool('draw-wall')} title="Duvar çiz (W) — oda içine ek bölme">
          <Slash size={14} />
        </ToolBtn>
        <ToolBtn active={tool === 'pan'} onClick={() => setTool('pan')} title="Pan (H veya Space)">
          <Hand size={14} />
        </ToolBtn>
        <Sep />
        <ToolBtn
          active={catalogOpen || !!armedProduct}
          onClick={() => setCatalogOpen((v) => !v)}
          title="Ürün ekle — kataloğu aç, ürüne tıkla, plana bırak"
        >
          <Package size={14} />
        </ToolBtn>
        <Sep />
        <ToolBtn onClick={() => setScale(Math.min(MAX_SCALE, scale * WHEEL_ZOOM_FACTOR))} title="Zoom in">
          <Plus size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => setScale(Math.max(MIN_SCALE, scale / WHEEL_ZOOM_FACTOR))} title="Zoom out">
          <Minus size={14} />
        </ToolBtn>
        <ToolBtn onClick={fitToContent} title="Fit to content">
          <Maximize2 size={14} />
        </ToolBtn>
        <Sep />
        <ToolBtn
          danger
          disabled={!activeRoom}
          onClick={() => {
            if (!activeRoom) return;
            removeRoom(activeRoom.id as RoomId);
            selectRoom(null);
          }}
          title="Seçili odayı sil (yalnız bu oda) · Delete"
        >
          <Trash2 size={14} />
        </ToolBtn>
        <ToolBtn
          danger
          onClick={() => {
            // Tüm çizimi temizle (oda + bölme + kapı + ürün). Ctrl+Z geri alır.
            newProject();
            selectRoom(null);
            selectEdge(null);
            selectVertex(null);
            selectWall(null);
            selectOpening(null);
            setSelectedEquipmentId(null);
            setArmedProduct(null);
          }}
          title="Tümünü Temizle — tüm çizimi sil (Ctrl+Z geri alır)"
        >
          <Eraser size={14} />
        </ToolBtn>
      </div>

      {/* Zoom HUD sits above the scale bar so they don't overlap. */}
      <div className="absolute bottom-20 left-3 px-2 py-1 bg-white/90 border border-slate-200 rounded text-[11px] font-mono text-slate-500">
        {(scale * 1000).toFixed(2)} px/m · grid 10cm/1m
        {tool === 'draw-room' && draftPoints.length > 0 && (
          <span className="ml-2 text-blue-600">
            başlangıca tıkla — kapat · Enter — bitir · Esc — iptal
          </span>
        )}
        {tool === 'draw-wall' && (
          <span className="ml-2 text-blue-600">
            tıkla → segment ekle · Esc — biti̇r
          </span>
        )}
      </div>

      <div className="absolute bottom-3 right-3 flex gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="px-2 h-7 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-600 disabled:text-slate-300"
        >
          Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="px-2 h-7 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-600 disabled:text-slate-300"
        >
          Redo
        </button>
      </div>

      {editingEdge && activeRoom && livePoints.length >= 2 && (
        <EdgeLengthInput
          midScreen={(() => {
            const a = livePoints[editingEdge.index];
            const b = livePoints[(editingEdge.index + 1) % livePoints.length];
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return { x: mx * scale + offsetX, y: my * scale + offsetY };
          })()}
          value={editingEdge.valueM}
          onChange={(v) => setEditingEdge({ ...editingEdge, valueM: v })}
          onCommit={commitEditEdge}
          onCancel={() => setEditingEdge(null)}
        />
      )}

      {/* ── Selected loose-wall floating actions ──────────────────────── */}
      {selectedLooseWall && livePointsWall && editingWallLen == null && (
        <SelectedWallActions
          midScreen={(() => {
            const [a, b] = livePointsWall;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return { x: mx * scale + offsetX, y: my * scale + offsetY };
          })()}
          lengthM={(() => {
            const [a, b] = livePointsWall;
            return Math.hypot(b.x - a.x, b.y - a.y) / 1000;
          })()}
          onEditLength={beginEditWallLen}
          onDelete={() => {
            if (!selectedLooseWall) return;
            removeWall(selectedLooseWall.wall.id as WallId);
            selectWall(null);
          }}
        />
      )}

      {selectedLooseWall && livePointsWall && editingWallLen != null && (
        <EdgeLengthInput
          midScreen={(() => {
            const [a, b] = livePointsWall;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return { x: mx * scale + offsetX, y: my * scale + offsetY };
          })()}
          value={editingWallLen}
          onChange={(v) => setEditingWallLen(v)}
          onCommit={commitEditWallLen}
          onCancel={() => setEditingWallLen(null)}
        />
      )}
    </div>
  );
}

// ── Inline UI atoms ─────────────────────────────────────────────────────────
function ToolBtn({
  children,
  active,
  disabled,
  danger,
  title,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center h-9 w-9 rounded-xl transition',
        active
          ? 'bg-brand-red/10 text-brand-red ring-1 ring-brand-red/20'
          : danger
            ? 'text-rose-500 hover:bg-rose-50 disabled:text-slate-300 disabled:hover:bg-transparent'
            : 'text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-slate-200/70 mx-0.5" />;
}

function SelectedWallActions({
  midScreen,
  lengthM,
  onEditLength,
  onDelete,
}: {
  midScreen: { x: number; y: number };
  lengthM: number;
  onEditLength: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{ left: midScreen.x, top: midScreen.y }}
      className="absolute -translate-x-1/2 -translate-y-[140%] flex items-center gap-1 px-1.5 py-1 bg-white border border-blue-500 rounded shadow text-[11px] font-medium text-slate-700"
    >
      <button
        type="button"
        onClick={onEditLength}
        className="inline-flex items-center gap-1 px-1.5 h-6 rounded hover:bg-blue-50 text-blue-700"
        title="Uzunluğu düzenle"
      >
        <Pencil size={11} />
        <span className="tabular-nums">{lengthM.toFixed(2)} m</span>
      </button>
      <div className="w-px h-4 bg-slate-200" />
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center justify-center w-6 h-6 rounded text-rose-500 hover:bg-rose-50"
        title="Sil (Delete)"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

function EdgeLengthInput({
  midScreen,
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  midScreen: { x: number; y: number };
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  return (
    <div
      style={{ left: midScreen.x, top: midScreen.y }}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-1 bg-white border-2 border-blue-500 rounded shadow"
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={onCommit}
        className="w-16 text-xs px-1 py-0.5 outline-none"
      />
      <span className="text-[10px] text-slate-500">m</span>
    </div>
  );
}
