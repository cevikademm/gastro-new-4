/**
 * Small floating inputs anchored to canvas positions: edge length (metres)
 * and corner angle (degrees). Enter commits, Escape / blur cancels — a
 * half-typed value is never applied by accident.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface EdgeLengthInputProps {
  screen: { x: number; y: number };
  value: string;
  unitLabel?: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export function EdgeLengthInput({ screen, value, unitLabel = 'm', onChange, onCommit, onCancel }: EdgeLengthInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  return (
    <div
      style={{ left: screen.x, top: screen.y }}
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-xl border border-blue-500/70 bg-white/95 px-2 py-1 shadow-lg shadow-slate-900/10 ring-2 ring-blue-500/15 backdrop-blur"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={value}
        inputMode="decimal"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={onCancel}
        className="w-16 text-xs px-1 py-0.5 outline-none tabular-nums"
      />
      <span className="text-[10px] text-slate-500">{unitLabel}</span>
    </div>
  );
}

interface AngleInputProps {
  screen: { x: number; y: number };
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onSnap90: () => void;
  onCancel: () => void;
}

export function AngleInput({ screen, value, onChange, onCommit, onSnap90, onCancel }: AngleInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  return (
    <div
      style={{ left: screen.x, top: screen.y }}
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-xl border border-blue-500/70 bg-white/95 px-2 py-1 shadow-lg shadow-slate-900/10 ring-2 ring-blue-500/15 backdrop-blur"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={value}
        inputMode="decimal"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={(e) => {
          // Clicking the 90° button must not cancel first.
          if ((e.relatedTarget as HTMLElement | null)?.dataset?.snap90) return;
          onCancel();
        }}
        className="w-14 text-xs px-1 py-0.5 outline-none tabular-nums"
      />
      <span className="text-[10px] text-slate-500">°</span>
      <button
        type="button"
        data-snap90="1"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSnap90}
        className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50"
      >
        {t('design3d.angle.set90')}
      </button>
    </div>
  );
}
