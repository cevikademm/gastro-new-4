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

    const pickTracked = (state: T): Partial<T> => {
      const out: Partial<T> = {};
      for (const key of tracked) out[key] = state[key];
      return out;
    };

    // Wrap set so any mutation that touches a tracked key pushes a snapshot.
    const wrappedSet: typeof set = ((updater: any, replace?: any) => {
      if (suppress) {
        return (set as any)(updater, replace);
      }
      const before = get();
      const beforeSnapshot = pickTracked(before as unknown as T);
      (set as any)(updater, replace);
      const after = get();
      // Only push history if a tracked key actually changed by reference.
      let changed = false;
      for (const key of tracked) {
        if ((before as any)[key] !== (after as any)[key]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;

      const past = ([...(before as any).past, beforeSnapshot] as Partial<T>[])
        .slice(-HISTORY_LIMIT);
      (api as StoreApi<HistoryState<Partial<T>>>).setState({
        past,
        future: [],
      } as Partial<HistoryState<Partial<T>>> as any);
    }) as any;

    const baseSlice = config(wrappedSet as any, get as any, api as any);

    const historySlice: HistoryState<Partial<T>> & HistoryActions = {
      past: [],
      future: [],

      undo: () => {
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
        (api as StoreApi<HistoryState<Partial<T>>>).setState({
          past: [],
          future: [],
        } as Partial<HistoryState<Partial<T>>> as any);
      },

      withoutHistory: (fn) => {
        suppress = true;
        try {
          return fn();
        } finally {
          suppress = false;
        }
      },

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
