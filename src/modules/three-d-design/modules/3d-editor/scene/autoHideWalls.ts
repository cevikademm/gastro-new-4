/**
 * Camera-aware wall hiding ("akıllı duvar gizleme").
 *
 * When the camera is OUTSIDE a room, the walls between the camera and the
 * room interior block the view. This picks, per room, every loop wall whose
 * inward normal points AWAY from the camera (the camera is on the wall's
 * outer side) — those are hidden while the far walls stay, so orbiting around
 * a closed kitchen always shows the inside. Inside the room nothing is hidden.
 *
 * Pure, DOMAIN mm: callers convert the camera position from render space.
 */

import type { ProjectDocument, Room, Vec2, WallId } from '../../../core/types';
import { pointInPolygon, roomPolygon } from '../../../core/geometry';
import { walkRoomLoop } from '../../../core/loops';
import { polygonCentroidOf } from '../../../core/math';

export interface AutoHideOptions {
  /** Below this camera height (mm) nothing is hidden — walking at floor level. */
  minCameraZMm?: number;
  /** Extra outward distance (mm) before a wall counts as "in front". */
  marginMm?: number;
}

export function computeAutoHiddenWalls(
  project: ProjectDocument,
  cameraMm: { x: number; y: number; z: number },
  opts: AutoHideOptions = {},
): Set<WallId> {
  const out = new Set<WallId>();
  const minZ = opts.minCameraZMm ?? 300;
  const margin = opts.marginMm ?? 50;
  if (cameraMm.z < minZ) return out;
  const cam: Vec2 = { x: cameraMm.x, y: cameraMm.y };

  for (const room of Object.values(project.rooms) as Room[]) {
    const poly = roomPolygon(project, room);
    if (poly.length < 3) continue;
    // Camera inside → leave the room intact.
    if (pointInPolygon(cam, poly)) continue;
    const centre = polygonCentroidOf(poly);
    const steps = walkRoomLoop(project, room);
    if (!steps) continue;
    for (const s of steps) {
      const a = project.vertices[s.start];
      const b = project.vertices[s.end];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      // Inward normal: the perpendicular that points toward the room centre.
      let nx = -dy / len;
      let ny = dx / len;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (nx * (centre.x - mx) + ny * (centre.y - my) < 0) {
        nx = -nx;
        ny = -ny;
      }
      // Camera on the OUTER side of this wall's plane → it blocks the view.
      const side = nx * (cam.x - mx) + ny * (cam.y - my);
      if (side < -margin) out.add(s.wallId);
    }
  }
  return out;
}
