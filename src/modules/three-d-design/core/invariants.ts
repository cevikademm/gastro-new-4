/**
 * Schema invariant assertions. Called by builders + the store's `update()` in
 * dev mode to catch broken state early. In production these are no-ops
 * (tree-shaken via the NODE_ENV guard) — invariants are documentation that
 * also tests itself, not runtime safety.
 *
 * Invariants checked
 *   I-1  Every wall.a / wall.b vertex exists.
 *   I-2  Every room.wallLoop is a closed loop with consistent direction.
 *   I-3  Every opening.wallId resolves.
 *   I-4  ProjectDocument.order contains each entity id exactly once.
 */

import type { ProjectDocument } from './types';

export class InvariantViolation extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`[invariant ${code}] ${message}`);
    this.code = code;
  }
}

const isDev =
  typeof process === 'undefined' ||
  process.env.NODE_ENV !== 'production';

/**
 * Throws InvariantViolation on the first broken invariant. No-op in prod.
 * Use sparingly: call after mutations that could have torn the schema, not
 * inside hot rendering paths.
 */
export function assertProjectInvariants(project: ProjectDocument): void {
  if (!isDev) return;

  // I-1: walls reference existing vertices
  for (const wall of Object.values(project.walls)) {
    if (!project.vertices[wall.a]) {
      throw new InvariantViolation(
        'I-1',
        `wall ${wall.id} references missing start vertex ${wall.a}`,
      );
    }
    if (!project.vertices[wall.b]) {
      throw new InvariantViolation(
        'I-1',
        `wall ${wall.id} references missing end vertex ${wall.b}`,
      );
    }
  }

  // I-2: rooms form closed loops
  for (const room of Object.values(project.rooms)) {
    const n = room.wallLoop.length;
    if (n < 3) {
      throw new InvariantViolation(
        'I-2',
        `room ${room.id} wallLoop has only ${n} walls (need ≥ 3)`,
      );
    }
    for (let i = 0; i < n; i++) {
      const cur = project.walls[room.wallLoop[i]];
      const nxt = project.walls[room.wallLoop[(i + 1) % n]];
      if (!cur || !nxt) {
        throw new InvariantViolation(
          'I-2',
          `room ${room.id} wallLoop references missing wall`,
        );
      }
      if (cur.b !== nxt.a) {
        throw new InvariantViolation(
          'I-2',
          `room ${room.id} wallLoop discontinuity at index ${i}: ` +
            `${cur.id}.b=${cur.b} !== ${nxt.id}.a=${nxt.a}`,
        );
      }
    }
  }

  // I-3: openings reference existing walls
  for (const op of Object.values(project.openings)) {
    if (!project.walls[op.wallId]) {
      throw new InvariantViolation(
        'I-3',
        `opening ${op.id} references missing wall ${op.wallId}`,
      );
    }
  }

  // I-4: order contains each id exactly once
  const seen = new Set<string>();
  for (const id of project.order) {
    if (seen.has(id)) {
      throw new InvariantViolation(
        'I-4',
        `order contains duplicate id ${id}`,
      );
    }
    seen.add(id);
  }
}

/** Like assert, but returns boolean rather than throwing. Used by tests. */
export function isProjectValid(project: ProjectDocument): boolean {
  try {
    assertProjectInvariants(project);
    return true;
  } catch {
    return false;
  }
}
