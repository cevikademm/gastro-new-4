/**
 * Wall operations shared by the 2D and 3D editors (store-level, one undo each).
 */

import type { VertexId, WallId } from '../../core/types';
import { walkRoomLoop } from '../../core/loops';
import { useProjectStore } from '../../store';

/** Start/end of a wall in the direction `preferRoomId` walks it (else a→b). */
export function wallEndsFor(wallId: string, preferRoomId: string | null): { start: VertexId; end: VertexId } | null {
  const proj = useProjectStore.getState().project;
  const w = proj.walls[wallId];
  if (!w) return null;
  const room = preferRoomId ? proj.rooms[preferRoomId] : null;
  if (room && room.wallLoop.includes(wallId)) {
    const step = walkRoomLoop(proj, room)?.find((s) => s.wallId === wallId);
    if (step) return { start: step.start, end: step.end };
  }
  return { start: w.a, end: w.b };
}

/** Set a wall's length by moving its END vertex along the wall direction. */
export function setWallLengthMm(wallId: string, lengthMm: number, preferRoomId: string | null = null): void {
  const ends = wallEndsFor(wallId, preferRoomId);
  if (!ends) return;
  const proj = useProjectStore.getState().project;
  const a = proj.vertices[ends.start];
  const b = proj.vertices[ends.end];
  if (!a || !b) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1 || lengthMm <= 0) return;
  const k = lengthMm / len;
  useProjectStore.getState().moveVertex(ends.end, { x: a.x + dx * k, y: a.y + dy * k });
}

/** Apply a surface preset to a wall, or to every wall of the rooms it belongs to. */
export function setWallMaterial(wallId: string, material: string | undefined, wholeRoom = false): void {
  useProjectStore.getState().update((d) => {
    const w = d.walls[wallId];
    if (!w) return;
    const targets = new Set<WallId>([wallId as WallId]);
    if (wholeRoom) {
      for (const r of Object.values(d.rooms)) {
        if (r.wallLoop.includes(wallId)) for (const id of r.wallLoop) targets.add(id);
      }
    }
    for (const id of targets) {
      const t = d.walls[id];
      if (!t) continue;
      if (material) t.material = material;
      else delete t.material;
    }
  });
}
