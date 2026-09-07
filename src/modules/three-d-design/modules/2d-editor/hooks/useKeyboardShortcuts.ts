/**
 * useKeyboardShortcuts — one window keydown/keyup listener for the 2D editor.
 *
 *   V select · R room · T rectangle · W wall · D door · P window · G pass-through
 *   H pan · Space (hold) pan · Esc cancel/deselect · Enter finish room
 *   Delete/Backspace delete (Backspace drops the last draft point while drawing)
 *   Ctrl+Z/Y undo/redo · Ctrl+D duplicate · Ctrl+A select all equipment
 *   Arrows nudge equipment (10 mm, Shift 100 mm) · Q/E rotate ∓90°
 *   F8 ortho · digits → length entry while drawing
 *
 * Tool letters only fire without Ctrl/Meta/Alt so browser shortcuts survive.
 */

import { useEffect } from 'react';
import type { Tool } from '../state/editorState';

export interface KeyboardHandlers {
  isTyping: () => boolean;
  setTool: (t: Tool) => void;
  setSpacePan: (on: boolean) => void;
  setOrthoOn: (fn: (v: boolean) => boolean) => void;
  escape: () => void;
  enter: () => void;
  backspace: () => boolean;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
  duplicate: () => void;
  selectAllEquipment: () => void;
  nudge: (dx: number, dy: number) => void;
  rotate: (deltaDeg: number) => void;
  digit: (ch: string) => boolean;
}

export function useKeyboardShortcuts(h: KeyboardHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      ) {
        return;
      }
      if (h.isTyping()) return;
      const mod = e.ctrlKey || e.metaKey;
      const plain = !mod && !e.altKey;
      const k = e.key;
      const lk = k.toLowerCase();

      if (k === 'Escape') {
        h.escape();
        return;
      }
      if (k === 'Enter') {
        h.enter();
        return;
      }
      if (k === 'Delete' || k === 'Backspace') {
        if (k === 'Backspace' && h.backspace()) {
          e.preventDefault();
          return;
        }
        h.deleteSelection();
        e.preventDefault();
        return;
      }
      if (mod && lk === 'z') {
        if (e.shiftKey) h.redo();
        else h.undo();
        e.preventDefault();
        return;
      }
      if (mod && lk === 'y') {
        h.redo();
        e.preventDefault();
        return;
      }
      if (mod && lk === 'd') {
        h.duplicate();
        e.preventDefault();
        return;
      }
      if (mod && lk === 'a') {
        h.selectAllEquipment();
        e.preventDefault();
        return;
      }
      if (k === 'F8') {
        h.setOrthoOn((v) => !v);
        e.preventDefault();
        return;
      }
      if (plain && /^[0-9.,]$/.test(k)) {
        if (h.digit(k)) e.preventDefault();
        return;
      }
      if (plain && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown')) {
        const step = e.shiftKey ? 100 : 10;
        const dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0;
        const dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0;
        h.nudge(dx, dy);
        e.preventDefault();
        return;
      }
      if (!plain) return;
      switch (lk) {
        case 'v': h.setTool('select'); break;
        case 'r': h.setTool('draw-room'); break;
        case 't': h.setTool('draw-rect'); break;
        case 'w': h.setTool('draw-wall'); break;
        case 'd': h.setTool('place-door'); break;
        case 'p': h.setTool('place-window'); break;
        case 'g': h.setTool('place-pass'); break;
        case 'h': h.setTool('pan'); break;
        case 'q': h.rotate(-90); break;
        case 'e': h.rotate(90); break;
        case ' ':
          if (!e.repeat) h.setSpacePan(true);
          e.preventDefault();
          break;
        default:
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') h.setSpacePan(false);
    };
    const onBlur = () => h.setSpacePan(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [h]);
}
