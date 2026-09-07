/**
 * Room loop walking (direction-agnostic). Kept in its own dependency-free
 * module so both `geometry.ts` and `wallBands.ts` can use it without a cycle.
 *
 * A room's `wallLoop` is an ordered list of wall ids that must chain
 * end-to-end and close, but each wall may be stored a→b OR b→a. This is what
 * lets two rooms SHARE one wall record (a partition): a CCW loop traverses a
 * shared wall in opposite directions in each room.
 */

import type { ProjectDocument, Room, VertexId, WallId } from './types';

/**
 * One step of a room loop walk: which wall, whether it is traversed a→b
 * (`forward`) or b→a, and the resolved start/end vertices in walk order.
 */
export interface LoopStep {
  wallId: WallId;
  forward: boolean;
  start: VertexId;
  end: VertexId;
}

function tryWalk(
  project: ProjectDocument,
  wallLoop: ReadonlyArray<WallId>,
  firstForward: boolean,
): LoopStep[] | null {
  const n = wallLoop.length;
  if (n < 3) return null;
  const w0 = project.walls[wallLoop[0]];
  if (!w0) return null;
  const steps: LoopStep[] = [];
  const start = firstForward ? w0.a : w0.b;
  let cur = firstForward ? w0.b : w0.a;
  steps.push({ wallId: w0.id, forward: firstForward, start, end: cur });
  for (let i = 1; i < n; i++) {
    const w = project.walls[wallLoop[i]];
    if (!w) return null;
    if (w.a === cur) {
      steps.push({ wallId: w.id, forward: true, start: w.a, end: w.b });
      cur = w.b;
    } else if (w.b === cur) {
      steps.push({ wallId: w.id, forward: false, start: w.b, end: w.a });
      cur = w.a;
    } else {
      return null;
    }
  }
  return cur === start ? steps : null;
}

/** Walk an ordered wall-id list as a closed chain; null if it does not close. */
export function walkWallLoop(
  project: ProjectDocument,
  wallLoop: ReadonlyArray<WallId>,
): LoopStep[] | null {
  return tryWalk(project, wallLoop, true) ?? tryWalk(project, wallLoop, false);
}

/** Walk a room's loop. Null when invariant I-2 is broken. */
export function walkRoomLoop(project: ProjectDocument, room: Room): LoopStep[] | null {
  return walkWallLoop(project, room.wallLoop);
}
