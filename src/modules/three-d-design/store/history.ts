/**
 * History middleware for Zustand — generic undo/redo via state snapshots.
 *
 * Why snapshots over inverse-operations?
 *  - Every editor action gets undo for free; no reverse-action plumbing.
 *  - Works trivially for batched / compound actions.
 *  - The project document is small (kilobytes), so deep clones are cheap
 *    relative to user-input cadence.
 *
 * Trade-off: memory grows linearly with edits. We cap with HISTORY_LIMIT
 * and drop the oldest entries first.
 *
 * Batching (transactions / transient edits)
 *  - `transaction(fn)` runs `fn` and records AT MOST ONE history entry for
 *    everything it did (wall chain click = ensureVertex×2 + addWall = 1 undo).
 *  - `beginTransient()` / `commitTransient()` are the same thing split in
 *    two, for pointer-driven edits (slider drag, opening drag): every frame
 *    still writes to the store so 2D/3D preview live, but the snapshot is
 *    pushed once on release. `cancelTransient()` restores the pre-batch state.
 *  - Batches nest: inner begin/commit pairs merge into the outermost one.
 *  - `undo`/`redo` while a batch is open first commit it, so you can never
 *    undo into a half-applied drag.
 */

import type { StateCreator, StoreApi } from 'zustand';

export const HISTORY_LIMIT = 100;

export interface HistoryState<T> {
  past: T[];
  future: T[];
}

export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  /** Mark the next mutation as "skip history" (e.g. selection changes). */
  withoutHistory: <R>(fn: () => R) => R;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /** Run `fn`; every tracked mutation inside becomes ONE undo entry. Nests. */
  transaction: <R>(fn: () => R) => R;
  /** Open a batch without a callback (pointer down). Pair with commit/cancel. */
  beginTransient: () => void;
  /** Close the batch; push one entry if anything tracked changed. */
  commitTransient: () => void;
  /** Close the batch and restore the tracked keys to the batch start. */
  cancelTransient: () => void;
  isBatching: () => boolean;
}

/**
 * Wraps a slice creator so the named keys participate in undo history.
 * `tracked` is the list of state keys to snapshot — selection, hover, view
 * transforms, etc. should NOT be tracked.
 */
export function withHistory<T extends object>(
  config: StateCreator<T>,
  tracked: ReadonlyArray<keyof T>,
): StateCreator<T & HistoryState<Partial<T>> & HistoryActions> {
  return (set, get, api) => {
    let suppress = false;
    let batchDepth = 0;
    let batchBefore: Partial<T> | null = null;

    const pickTracked = (state: T): Partial<T> => {
      const out: Partial<T> = {};
      for (const key of tracked) out[key] = state[key];
      return out;
    };

    const trackedChanged = (a: Partial<T>, b: Partial<T>): boolean => {
      for (const key of tracked) {
        if (a[key] !== b[key]) return true;
      }
      return false;
    };

    const pushEntry = (before: Partial<T>): void => {
      const state = get() as unknown as HistoryState<Partial<T>>;
      const past = [...state.past, before].slice(-HISTORY_LIMIT);
      (api as StoreApi<HistoryState<Partial<T>>>).setState({
        past,
        future: [],
      } as Partial<HistoryState<Partial<T>>> as any);
    };

    // Wrap set so any mutation that touches a tracked key pushes a snapshot.
    const wrappedSet: typeof set = ((updater: any, replace?: any) => {
      if (suppress || batchDepth > 0) {
        // Inside a batch the state still updates (live preview) — the single
        // snapshot is pushed by commitTransient().
        return (set as any)(updater, replace);
      }
      const before = get();
      const beforeSnapshot = pickTracked(before as unknown as T);
      (set as any)(updater, replace);
      const after = get();
      // Only push history if a tracked key actually changed by reference.
      if (!trackedChanged(beforeSnapshot, pickTracked(after as unknown as T))) return;
      pushEntry(beforeSnapshot);
    }) as any;

    const baseSlice = config(wrappedSet as any, get as any, api as any);

    const beginTransient = (): void => {
      if (batchDepth === 0) batchBefore = pickTracked(get() as unknown as T);
      batchDepth += 1;
    };

    const commitTransient = (): void => {
      if (batchDepth === 0) return;
      batchDepth -= 1;
      if (batchDepth > 0) return;
      const before = batchBefore;
      batchBefore = null;
      if (!before) return;
      if (trackedChanged(before, pickTracked(get() as unknown as T))) pushEntry(before);
    };

    const cancelTransient = (): void => {
      if (batchDepth === 0) return;
      batchDepth = 0;
      const before = batchBefore;
      batchBefore = null;
      if (!before) return;
      suppress = true;
      try {
        (set as any)(before);
      } finally {
        suppress = false;
      }
    };

    /** Close any open batch before undo/redo so history never bisects a drag. */
    const flushBatch = (): void => {
      if (batchDepth === 0) return;
      batchDepth = 1;
      commitTransient();
    };

    const historySlice: HistoryState<Partial<T>> & HistoryActions = {
      past: [],
      future: [],

      undo: () => {
        flushBatch();
        const state = get() as unknown as HistoryState<Partial<T>>;
        if (state.past.length === 0) return;
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, -1);
        const presentSnapshot = pickTracked(get() as unknown as T);
        suppress = true;
        try {
          (set as any)({
            ...previous,
            past: newPast,
            future: [presentSnapshot, ...state.future].slice(0, HISTORY_LIMIT),
          });
        } finally {
          suppress = false;
        }
      },

      redo: () => {
        flushBatch();
        const state = get() as unknown as HistoryState<Partial<T>>;
        if (state.future.length === 0) return;
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        const presentSnapshot = pickTracked(get() as unknown as T);
        suppress = true;
        try {
          (set as any)({
            ...next,
            past: [...state.past, presentSnapshot].slice(-HISTORY_LIMIT),
            future: newFuture,
          });
        } finally {
          suppress = false;
        }
      },

      clearHistory: () => {
        batchDepth = 0;
        batchBefore = null;
        (api as StoreApi<HistoryState<Partial<T>>>).setState({
          past: [],
          future: [],
        } as Partial<HistoryState<Partial<T>>> as any);
      },

      withoutHistory: (fn) => {
        const prev = suppress;
        suppress = true;
        try {
          return fn();
        } finally {
          suppress = prev;
        }
      },

      transaction: (fn) => {
        beginTransient();
        try {
          return fn();
        } finally {
          commitTransient();
        }
      },

      beginTransient,
      commitTransient,
      cancelTransient,
      isBatching: () => batchDepth > 0,

      canUndo: () =>
        (get() as unknown as HistoryState<Partial<T>>).past.length > 0,
      canRedo: () =>
        (get() as unknown as HistoryState<Partial<T>>).future.length > 0,
    };

    return { ...baseSlice, ...historySlice } as T &
      HistoryState<Partial<T>> &
      HistoryActions;
  };
}
