/**
 * Small form atoms shared by the context properties panel sections.
 * All numeric fields are mm unless a `suffix` says otherwise; they keep a
 * local text mirror so typing never fights live store updates, and commit on
 * Enter / blur.
 */

import { useEffect, useState, type ReactNode } from 'react';

export function Section({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="px-4 py-3 border-b border-slate-100 last:border-b-0">
      {(title || right) && (
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="mb-2 flex flex-col gap-1 last:mb-0" title={hint}>
      <span className="text-[11px] text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </label>
  );
}

export function Grid2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-2">{children}</div>;
}

interface NumFieldProps {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  decimals?: number;
  className?: string;
}

export function NumField({ value, onCommit, min, max, step = 10, suffix = 'mm', disabled, decimals = 0, className }: NumFieldProps) {
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(decimals) : '');
  const [text, setText] = useState(fmt(value));
  useEffect(() => {
    setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const commit = () => {
    const n = Number.parseFloat(text.replace(',', '.'));
    if (!Number.isFinite(n)) {
      setText(fmt(value));
      return;
    }
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    if (v !== value) onCommit(v);
    else setText(fmt(value));
  };
  return (
    <div className={['relative flex-1 min-w-0', className ?? ''].join(' ')}>
      <input
        type="number"
        value={text}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setText(fmt(value));
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="h-8 w-full rounded-lg border border-slate-200 px-2 pr-8 text-[11px] tabular-nums outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:bg-slate-50 disabled:text-slate-400 transition"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">{suffix}</span>
      )}
    </div>
  );
}

export function TextField({ value, onCommit, placeholder, disabled }: { value: string; onCommit: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    const v = text.trim();
    if (v && v !== value) onCommit(v);
    else setText(value);
  };
  return (
    <input
      type="text"
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          setText(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="h-8 w-full rounded-lg border border-slate-200 px-2 text-[12px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:bg-slate-50 transition"
    />
  );
}

export function SelectField<T extends string>({ value, options, onChange, disabled }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:bg-slate-50 transition"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({ value, options, onChange, disabled }: { value: T; options: Array<{ value: T; label: ReactNode; title?: string }>; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="grid w-full gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={[
            'inline-flex h-8 items-center justify-center gap-1 rounded-xl text-[11px] transition disabled:opacity-50',
            o.value === value
              ? 'bg-brand-red text-white font-semibold shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Btn({ children, onClick, disabled, title, danger, primary, full }: { children: ReactNode; onClick?: () => void; disabled?: boolean; title?: string; danger?: boolean; primary?: boolean; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[11px] font-medium transition disabled:opacity-50',
        full ? 'w-full' : '',
        danger
          ? 'border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
          : primary
            ? 'bg-brand-red text-white shadow-sm hover:brightness-110'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function Chips({ values, current, onPick, format }: { values: number[]; current: number; onPick: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          className={[
            'rounded-full border px-2 py-0.5 text-[10px] tabular-nums transition',
            Math.round(current) === v ? 'border-brand-red bg-brand-red/10 text-brand-red font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
          ].join(' ')}
        >
          {format ? format(v) : v}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50 px-2 py-1.5">
      <span className="text-[10px] font-semibold text-slate-400">{label}</span>
      <span className="font-mono text-[11px] tabular-nums text-slate-700">{value}</span>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-[#931315]"
      />
      <span className="text-[11px] text-slate-600">{label}</span>
    </label>
  );
}

export function Help({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[10px] leading-snug text-slate-400">{children}</p>;
}

/** Row of colour swatches for surface presets. */
export function SwatchPicker({
  presets,
  value,
  onPick,
  labelFor,
}: {
  presets: ReadonlyArray<{ id: string; swatch: string }>;
  value: string;
  onPick: (id: string) => void;
  labelFor: (id: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          title={labelFor(p.id)}
          aria-label={labelFor(p.id)}
          onClick={() => onPick(p.id)}
          className={[
            'h-7 w-7 rounded-lg border-2 transition',
            p.id === value ? 'border-brand-red ring-2 ring-brand-red/20 scale-105' : 'border-slate-200 hover:border-slate-400',
          ].join(' ')}
          style={{ background: p.swatch }}
        />
      ))}
    </div>
  );
}
