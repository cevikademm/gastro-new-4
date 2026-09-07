import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { withHistory, type HistoryActions, type HistoryState } from '../history';

interface Doc {
  n: number;
  tag: string;
}
interface Slice {
  doc: Doc;
  ui: number;
  setN: (n: number) => void;
  setUi: (n: number) => void;
}
type Store = Slice & HistoryState<Partial<Slice>> & HistoryActions;

function makeStore() {
  return create<Store>(
    withHistory<Slice>(
      (set) => ({
        doc: { n: 0, tag: 'a' },
        ui: 0,
        setN: (n) => set((s) => ({ doc: { ...s.doc, n } })),
        setUi: (ui) => set({ ui }),
      }),
      ['doc'],
    ),
  );
}

describe('withHistory', () => {
  it('records one entry per tracked mutation and ignores untracked keys', () => {
    const s = makeStore();
    s.getState().setN(1);
    s.getState().setN(2);
    s.getState().setUi(5);
    expect(s.getState().past.length).toBe(2);
    s.getState().undo();
    expect(s.getState().doc.n).toBe(1);
    expect(s.getState().ui).toBe(5);
    s.getState().redo();
    expect(s.getState().doc.n).toBe(2);
  });

  it('transaction() collapses many mutations into one entry (nested merge)', () => {
    const s = makeStore();
    s.getState().transaction(() => {
      s.getState().setN(1);
      s.getState().transaction(() => {
        s.getState().setN(2);
        s.getState().setN(3);
      });
      s.getState().setN(4);
    });
    expect(s.getState().doc.n).toBe(4);
    expect(s.getState().past.length).toBe(1);
    s.getState().undo();
    expect(s.getState().doc.n).toBe(0);
  });

  it('transaction() with no change pushes nothing', () => {
    const s = makeStore();
    s.getState().transaction(() => {
      /* nothing */
    });
    expect(s.getState().past.length).toBe(0);
  });

  it('begin/commitTransient batches a drag into one entry', () => {
    const s = makeStore();
    s.getState().beginTransient();
    for (let i = 1; i <= 50; i++) s.getState().setN(i);
    expect(s.getState().isBatching()).toBe(true);
    expect(s.getState().past.length).toBe(0);
    s.getState().commitTransient();
    expect(s.getState().isBatching()).toBe(false);
    expect(s.getState().past.length).toBe(1);
    s.getState().undo();
    expect(s.getState().doc.n).toBe(0);
  });

  it('cancelTransient restores the pre-batch state without an entry', () => {
    const s = makeStore();
    s.getState().setN(7);
    s.getState().beginTransient();
    s.getState().setN(99);
    s.getState().cancelTransient();
    expect(s.getState().doc.n).toBe(7);
    expect(s.getState().past.length).toBe(1);
  });

  it('undo during an open batch commits it first', () => {
    const s = makeStore();
    s.getState().setN(1);
    s.getState().beginTransient();
    s.getState().setN(2);
    s.getState().setN(3);
    s.getState().undo(); // commits [1→3] then undoes it
    expect(s.getState().isBatching()).toBe(false);
    expect(s.getState().doc.n).toBe(1);
    s.getState().redo();
    expect(s.getState().doc.n).toBe(3);
  });

  it('withoutHistory suppresses entries and clearHistory resets', () => {
    const s = makeStore();
    s.getState().withoutHistory(() => s.getState().setN(5));
    expect(s.getState().past.length).toBe(0);
    s.getState().setN(6);
    s.getState().clearHistory();
    expect(s.getState().canUndo()).toBe(false);
    expect(s.getState().canRedo()).toBe(false);
  });
});
