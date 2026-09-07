/**
 * LengthEntryHud — CAD-style "type a number while drawing" input.
 *
 * Appears next to the cursor as soon as the user types a digit with a draft
 * open. Enter places the next point at `last + dir · length` (dir = current
 * cursor direction, or the typed angle). Tab toggles length ↔ angle. Esc
 * closes the HUD (the draft stays).
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { EntryState, LengthUnit } from '../state/editorState';

interface Props {
  entry: EntryState;
  unit: LengthUnit;
  /** Screen position (px in the editor host). */
  screen: { x: number; y: number };
  /** Field labels (rect mode uses width/depth). */
  labels?: { length: string; angle: string };
  onChange: (patch: Partial<EntryState>) => void;
  onToggleField: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onUnitChange: (u: LengthUnit) => void;
}

const UNITS: LengthUnit[] = ['mm', 'cm', 'm'];

export default function LengthEntryHud({
  entry,
  unit,
  screen,
  labels,
  onChange,
  onToggleField,
  onCommit,
  onCancel,
  onUnitChange,
}: Props) {
  const { t } = useTranslation();
  const lengthLabel = labels?.length ?? t('design3d.entry.length');
  const angleLabel = labels?.angle ?? t('design3d.entry.angle');
  const angleIsLength = !!labels && labels.angle !== t('design3d.entry.angle');
  const lenRef = useRef<HTMLInputElement | null>(null);
  const angRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = entry.field === 'length' ? lenRef.current : angRef.current;
    el?.focus();
    // Put the caret at the end (the seed digit is already there).
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  }, [entry.field]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onToggleField();
    }
  };

  return (
    <div
      style={{ left: screen.x + 18, top: screen.y + 18 }}
      className="absolute z-30 flex items-center gap-1.5 rounded-xl border border-blue-500 bg-white/95 px-2 py-1.5 shadow-lg shadow-slate-900/10 backdrop-blur"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <label className="flex items-center gap-1">
        <span className="text-[10px] font-semibold uppercase text-slate-400">{lengthLabel}</span>
        <input
          ref={lenRef}
          value={entry.length}
          inputMode="decimal"
          onChange={(e) => onChange({ length: e.target.value.replace(/[^0-9.,]/g, '') })}
          onKeyDown={onKey}
          onFocus={() => entry.field !== 'length' && onChange({ field: 'length' })}
          className={[
            'w-16 rounded-lg border px-1.5 py-0.5 text-[12px] tabular-nums outline-none',
            entry.field === 'length' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200',
          ].join(' ')}
        />
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as LengthUnit)}
          className="h-6 rounded-lg border border-slate-200 bg-white px-1 text-[10px] outline-none"
          tabIndex={-1}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </label>
      <span className="text-slate-300">·</span>
      <label className="flex items-center gap-1">
        <span className="text-[10px] font-semibold uppercase text-slate-400">{angleLabel}</span>
        <input
          ref={angRef}
          value={entry.angle}
          inputMode="decimal"
          onChange={(e) => onChange({ angle: e.target.value.replace(/[^0-9.,-]/g, '') })}
          onKeyDown={onKey}
          onFocus={() => entry.field !== 'angle' && onChange({ field: 'angle' })}
          placeholder="—"
          className={[
            'w-14 rounded-lg border px-1.5 py-0.5 text-[12px] tabular-nums outline-none',
            entry.field === 'angle' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200',
          ].join(' ')}
        />
        <span className="text-[10px] text-slate-500">{angleIsLength ? unit : '°'}</span>
      </label>
      <span className="ml-1 text-[9px] text-slate-400 whitespace-nowrap">{t('design3d.entry.hint')}</span>
    </div>
  );
}
