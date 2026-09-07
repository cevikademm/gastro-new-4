/**
 * useVertexEditing — drag corners (with snap), retype a wall's length, retype
 * a corner's angle. Drags preview through `dragPreview` (vertex id → point)
 * and commit ONE `moveVertex` on release; every wall sharing the vertex
 * follows automatically.
 */

import { useCallback, useState } from 'react';
import type { ProjectDocument, Vec2, VertexId, WallId } from '../../../core/types';
import { walkRoomLoop } from '../../../core/loops';
import { wallsAtVertex } from '../../../core/openings';
import { useProjectStore } from '../../../store';
import { cornerAngleDeg, setCornerAngle } from '../cad/geometry';
import { useEditor2DState } from '../state/editorState';
import { setWallLengthMm } from '../../shared/wallOps';
import type { SnapResolver } from './useSnap';

interface Args {
  project: ProjectDocument;
  snap: SnapResolver;
  /** Active room polygon + vertex ids in loop order (for angle editing). */
  activeRoom: { id: string; points: Vec2[]; vertexIds: string[] } | null;
}

export function useVertexEditing({ project, snap, activeRoom }: Args) {
  const [dragPreview, setDragPreview] = useState<Record<string, Vec2> | null>(null);
  const [editingEdge, setEditingEdge] = useState<{ wallId: string; value: string } | null>(null);
  const [editingAngle, setEditingAngle] = useState<{ vertexId: string; value: string } | null>(null);
  const st = () => useProjectStore.getState();
  const ed = () => useEditor2DState.getState();

  const excludeFor = useCallback(
    (vertexId: string): Set<string> => {
      // The dragged vertex and its neighbours' shared walls must not snap to themselves.
      const set = new Set<string>([vertexId]);
      for (const wid of wallsAtVertex(project, vertexId)) {
        const w = project.walls[wid];
        if (!w) continue;
        // Only exclude the vertex itself; neighbours stay snappable (dragging
        // onto a neighbour merges nothing but gives a useful alignment).
        void w;
      }
      return set;
    },
    [project],
  );

  const onDragMove = useCallback(
    (vertexId: string, world: Vec2, shift = false) => {
      const r = snap(world, { excludeVertexIds: excludeFor(vertexId), shift, noEdges: false });
      setDragPreview({ [vertexId]: r.point });
      ed().setSnapHit(r.hit);
    },
    [snap, excludeFor],
  );

  const onDragEnd = useCallback(
    (vertexId: string, world: Vec2) => {
      const r = snap(world, { excludeVertexIds: excludeFor(vertexId) });
      setDragPreview(null);
      ed().setSnapHit(null);
      st().moveVertex(vertexId as VertexId, r.point);
    },
    [snap, excludeFor],
  );

  // ── Wall length ──────────────────────────────────────────────────────────
  /** Start/end of a wall in the direction the ACTIVE room walks it (else a→b). */
  const wallEnds = useCallback(
    (wallId: string): { start: VertexId; end: VertexId } | null => {
      const proj = st().project;
      const w = proj.walls[wallId];
      if (!w) return null;
      const roomId = ed().activeRoomId;
      const room = roomId ? proj.rooms[roomId] : null;
      if (room && room.wallLoop.includes(wallId)) {
        const step = walkRoomLoop(proj, room)?.find((s) => s.wallId === wallId);
        if (step) return { start: step.start, end: step.end };
      }
      return { start: w.a, end: w.b };
    },
    [],
  );

  const beginEditEdge = useCallback(
    (wallId: string) => {
      const ends = wallEnds(wallId);
      if (!ends) return;
      const proj = st().project;
      const a = proj.vertices[ends.start];
      const b = proj.vertices[ends.end];
      if (!a || !b) return;
      setEditingAngle(null);
      setEditingEdge({ wallId, value: (Math.hypot(b.x - a.x, b.y - a.y) / 1000).toFixed(2) });
      ed().select({ kind: 'wall', id: wallId });
    },
    [wallEnds],
  );

  const commitEditEdge = useCallback(() => {
    if (!editingEdge) return;
    const meters = Number.parseFloat(editingEdge.value.replace(',', '.'));
    setEditingEdge(null);
    if (!Number.isFinite(meters) || meters <= 0) return;
    setWallLength(editingEdge.wallId, meters * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingEdge]);

  /** Set a wall's length by moving its END vertex along the wall direction. */
  const setWallLength = useCallback((wallId: string, lengthMm: number) => {
    setWallLengthMm(wallId, lengthMm, ed().activeRoomId);
  }, []);

  // ── Corner angle ─────────────────────────────────────────────────────────
  const beginEditAngle = useCallback(
    (vertexId: string) => {
      if (!activeRoom) return;
      const idx = activeRoom.vertexIds.indexOf(vertexId);
      if (idx === -1) return;
      setEditingEdge(null);
      setEditingAngle({ vertexId, value: String(Math.round(cornerAngleDeg(activeRoom.points, idx))) });
      ed().select({ kind: 'vertex', id: vertexId });
    },
    [activeRoom],
  );

  const commitEditAngle = useCallback(
    (override?: number) => {
      if (!editingAngle || !activeRoom) return;
      const deg = override ?? Number.parseFloat(editingAngle.value.replace(',', '.'));
      setEditingAngle(null);
      if (!Number.isFinite(deg)) return;
      const idx = activeRoom.vertexIds.indexOf(editingAngle.vertexId);
      if (idx === -1) return;
      const next = setCornerAngle(activeRoom.points, idx, deg);
      const nextIdx = (idx + 1) % activeRoom.vertexIds.length;
      st().moveVertex(activeRoom.vertexIds[nextIdx] as VertexId, next[nextIdx]);
    },
    [editingAngle, activeRoom],
  );

  return {
    dragPreview,
    onDragMove,
    onDragEnd,
    editingEdge,
    setEditingEdge,
    beginEditEdge,
    commitEditEdge,
    setWallLength,
    editingAngle,
    setEditingAngle,
    beginEditAngle,
    commitEditAngle,
  };
}

export type VertexEditing = ReturnType<typeof useVertexEditing>;
void ((_: WallId) => _);
