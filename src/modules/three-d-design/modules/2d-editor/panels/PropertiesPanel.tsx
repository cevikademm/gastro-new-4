/**
 * PropertiesPanel — right-side panel of the 2D editor.
 *
 * Sections
 *   1. "Ekle" — buttons to enter place-door / place-window mode. The actual
 *      placement happens by clicking on a wall in the canvas; the panel just
 *      arms the tool.
 *   2. "Seçili" — when an opening is selected, edit width / height / offset
 *      / sill height. Changes commit immediately via project store.
 *   3. "Liste" — every door + window in the project; click to select & focus.
 *
 * Why a panel and not a context menu?
 *   The opening's position-along-wall is a continuous parameter — far easier
 *   to tweak with a number input than by dragging. The panel also surfaces
 *   the room/wall a door belongs to, which a popover can't.
 */

import { useMemo } from 'react';
import { DoorOpen, Square, Trash2, RectangleHorizontal } from 'lucide-react';

import {
  calculateWallLength,
  useProjectStore,
  type Opening,
  type OpeningKind,
  type WallId,
} from '../../..';
import { useEditor2DState, type Tool } from '../state/editorState';

// Defaults — typical commercial-kitchen sizes (mm).
const DEFAULTS = {
  door: { width: 900, height: 2100, sillHeight: 0 },
  window: { width: 1200, height: 1200, sillHeight: 1000 },
} as const;

export default function PropertiesPanel() {
  const project = useProjectStore((s) => s.project);
  const update = useProjectStore((s) => s.update);
  const removeOpening = useProjectStore((s) => s.removeOpening);

  const tool = useEditor2DState((s) => s.tool);
  const setTool = useEditor2DState((s) => s.setTool);
  const selectedOpeningId = useEditor2DState((s) => s.selectedOpeningId);
  const selectOpening = useEditor2DState((s) => s.selectOpening);

  const openings = useMemo(() => Object.values(project.openings), [project.openings]);
  const selected = selectedOpeningId ? project.openings[selectedOpeningId] : undefined;

  const updateOpening = (patch: Partial<Opening>) => {
    if (!selected) return;
    update((d) => {
      const op = d.openings[selected.id];
      if (!op) return;
      Object.assign(op, patch);
      // Clamp offset + width to the host wall length.
      const wall = d.walls[op.wallId];
      if (wall) {
        const a = d.vertices[wall.a];
        const b = d.vertices[wall.b];
        if (a && b) {
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          op.width = Math.max(100, Math.min(op.width, len - 50));
          op.offset = Math.max(0, Math.min(op.offset, len - op.width));
        }
      }
    });
  };

  return (
    <aside className="absolute top-0 right-0 h-full w-[60vw] max-w-[15rem] sm:w-72 sm:max-w-none bg-white/95 backdrop-blur border-l border-slate-200/70 shadow-lg shadow-slate-900/5 overflow-y-auto pointer-events-auto flex flex-col">
      <header className="px-4 h-10 flex items-center border-b border-slate-100">
        <h2 className="text-[12px] font-semibold text-slate-800 truncate">Özellikler</h2>
      </header>

      {/* ── Section 1: Add door / window ─────────────────────────────── */}
      <Section title="Ekle">
        <div className="grid grid-cols-2 gap-2">
          <PlaceBtn
            active={tool === 'place-door'}
            onClick={() => setTool(tool === 'place-door' ? 'select' : 'place-door')}
          >
            <DoorOpen size={14} /> Kapı
          </PlaceBtn>
          <PlaceBtn
            active={tool === 'place-window'}
            onClick={() => setTool(tool === 'place-window' ? 'select' : 'place-window')}
          >
            <RectangleHorizontal size={14} /> Pencere
          </PlaceBtn>
        </div>
        {(tool === 'place-door' || tool === 'place-window') && (
          <div className="mt-2 px-2.5 py-1.5 bg-brand-red/5 border border-brand-red/20 rounded-xl text-[11px] text-brand-red">
            Bir duvara tıklayarak yerleştirin. Esc — iptal.
          </div>
        )}
      </Section>

      {/* ── Section 2: Selected opening editor ───────────────────────── */}
      <Section title="Seçili Açıklık">
        {!selected ? (
          <p className="text-[11px] text-slate-400">
            Düzenlemek için bir kapı veya pencere seçin.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                {selected.kind === 'door' ? <DoorOpen size={14} /> : <RectangleHorizontal size={14} />}
                <span className="text-[12px] font-semibold text-slate-800 capitalize">
                  {selected.kind === 'door'
                    ? 'Kapı'
                    : selected.kind === 'window'
                    ? 'Pencere'
                    : 'Geçiş'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  removeOpening(selected.id);
                  selectOpening(null);
                }}
                title="Sil"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <KindSelect
              value={selected.kind}
              onChange={(k) => updateOpening({ kind: k })}
            />

            <NumberField
              label="Genişlik (cm)"
              value={selected.width / 10}
              step={5}
              min={10}
              onChange={(cm) => updateOpening({ width: cm * 10 })}
            />
            <NumberField
              label="Yükseklik (cm)"
              value={selected.height / 10}
              step={5}
              min={10}
              onChange={(cm) => updateOpening({ height: cm * 10 })}
            />
            <NumberField
              label="Konum (cm, duvar başından)"
              value={selected.offset / 10}
              step={5}
              min={0}
              onChange={(cm) => updateOpening({ offset: cm * 10 })}
            />
            {selected.kind !== 'door' && (
              <NumberField
                label="Eşik yüksekliği (cm)"
                value={selected.sillHeight / 10}
                step={5}
                min={0}
                onChange={(cm) => updateOpening({ sillHeight: cm * 10 })}
              />
            )}

            <div className="text-[10px] text-slate-400 tabular-nums pt-2 border-t border-slate-100">
              Duvar uzunluğu: {(calculateWallLength(project, selected.wallId as WallId) / 1000).toFixed(2)} m
            </div>
          </div>
        )}
      </Section>

      {/* ── Section 3: All openings list ─────────────────────────────── */}
      <Section title={`Tüm Açıklıklar (${openings.length})`}>
        {openings.length === 0 ? (
          <p className="text-[11px] text-slate-400">Henüz kapı veya pencere yok.</p>
        ) : (
          <ul className="space-y-1">
            {openings.map((op) => {
              const isSel = op.id === selectedOpeningId;
              return (
                <li key={op.id}>
                  <button
                    type="button"
                    onClick={() => selectOpening(op.id)}
                    className={[
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-[11px] transition',
                      isSel
                        ? 'bg-brand-red/10 text-brand-red border border-brand-red/20'
                        : 'text-slate-700 border border-transparent hover:bg-slate-50 hover:border-slate-200/70',
                    ].join(' ')}
                  >
                    {op.kind === 'door' ? <DoorOpen size={12} /> : <RectangleHorizontal size={12} />}
                    <span className="flex-1 truncate">
                      {op.kind === 'door' ? 'Kapı' : op.kind === 'window' ? 'Pencere' : 'Geçiş'}
                    </span>
                    <span className="text-slate-400 tabular-nums">{(op.width / 10).toFixed(0)}×{(op.height / 10).toFixed(0)} cm</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </aside>
  );
}

// ── Tiny UI atoms ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-3 border-b border-slate-100 last:border-b-0">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function PlaceBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] transition',
        active
          ? 'font-semibold bg-brand-red text-white shadow-sm hover:brightness-110'
          : 'font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function KindSelect({
  value,
  onChange,
}: {
  value: OpeningKind;
  onChange: (k: OpeningKind) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium text-slate-500">Tip</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as OpeningKind)}
        className="mt-1 w-full h-8 rounded-lg border border-slate-200 px-2 text-[11px] bg-white outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 transition"
      >
        <option value="door">Kapı</option>
        <option value="window">Pencere</option>
        <option value="pass-through">Geçiş</option>
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium text-slate-500">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        step={step}
        min={min}
        onChange={(e) => {
          const n = Number.parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="mt-1 w-full h-8 rounded-lg border border-slate-200 px-2 text-[11px] tabular-nums outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:bg-slate-50 disabled:text-slate-400 transition"
      />
    </label>
  );
}

// Defaults exported so DesignStudio2D can reuse them when arming placement.
export { DEFAULTS as OPENING_DEFAULTS };
