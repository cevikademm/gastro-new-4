/**
 * EquipmentPropertiesPanel2D — 2B plan görünümünde seçili ürün için sade özellik
 * paneli. 3B `EquipmentPropertiesPanel` ile aynı store'a yazar; 2B kullanıcısının
 * üç boyutlu görünüme geçmeden rengi, üst-üste iznini, yönü ve silmeyi
 * yönetebilmesi için temel kontrolleri sunar.
 *
 * Konum/eğim/montaj gibi 3B'ye özgü ince ayarlar bilinçli olarak burada YOK
 * (onlar 3B panelde). Renk override hem 2B dolgusunu hem 3B fallback tonunu etkiler.
 */

import { useTranslation } from 'react-i18next';
import { Trash2, RotateCw, RotateCcw, RefreshCw, X, Layers as OverlapIcon } from 'lucide-react';
import { useProjectStore } from '../../../store';
import type { Equipment, EquipmentId } from '../../../core/types';
import { deterministicHex } from '../../../lib/equipmentColor';

interface Props {
  equipmentId: string | null;
  onClose: () => void;
}

export default function EquipmentPropertiesPanel2D({ equipmentId, onClose }: Props) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const update = useProjectStore((s) => s.update);
  const removeEquipment = useProjectStore((s) => s.removeEquipment);

  const eq = equipmentId
    ? (project.equipment[equipmentId as EquipmentId] as Equipment | undefined)
    : undefined;
  if (!eq) return null;

  const rotateBy = (deg: number) =>
    update((d) => {
      const e = d.equipment[eq.id];
      if (e) e.rotation += (deg * Math.PI) / 180;
    });

  const handleDelete = () => {
    removeEquipment(eq.id);
    onClose();
  };

  return (
    <aside className="absolute top-3 right-3 z-20 w-60 rounded-2xl border border-slate-200/70 bg-white/95 shadow-lg shadow-slate-900/5 backdrop-blur">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <span className="flex-1 truncate text-[12px] font-semibold text-slate-800" title={eq.name}>
          {eq.name}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          title={t('common.close')}
        >
          <X size={13} />
        </button>
      </header>

      {/* Ölçü (salt-okunur) */}
      <Section title={t('design3d.dimensions')}>
        <div className="grid grid-cols-3 gap-1.5">
          <Stat label="G" value={eq.footprint.width} />
          <Stat label="D" value={eq.footprint.depth} />
          <Stat label="Y" value={eq.heightMm} />
        </div>
      </Section>

      {/* Görünüm — renk + üst üste izni */}
      <Section title={t('design3d.appearance')}>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={eq.color ?? deterministicHex(eq.catalogId || eq.name || eq.id)}
            disabled={!!eq.locked}
            onChange={(e) =>
              update((d) => {
                const item = d.equipment[eq.id];
                if (item) item.color = e.target.value;
              })
            }
            className="h-8 w-11 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5 disabled:opacity-50 transition"
            title={t('design3d.color')}
          />
          <button
            type="button"
            disabled={!!eq.locked || !eq.color}
            onClick={() =>
              update((d) => {
                const item = d.equipment[eq.id];
                if (item) delete item.color;
              })
            }
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw size={12} /> {t('design3d.resetColor')}
          </button>
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={!!eq.allowOverlap}
            disabled={!!eq.locked}
            onChange={(e) =>
              update((d) => {
                const item = d.equipment[eq.id];
                if (item) item.allowOverlap = e.target.checked;
              })
            }
            className="h-4 w-4 rounded accent-[#931315]"
          />
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
            <OverlapIcon size={12} /> {t('design3d.allowOverlap')}
          </span>
        </label>
      </Section>

      {/* Yön */}
      <Section title={t('design3d.rotate')}>
        <div className="grid grid-cols-3 gap-1.5">
          <RotBtn onClick={() => rotateBy(-90)} title="-90°" disabled={!!eq.locked}>
            <RotateCcw size={13} /> 90°
          </RotBtn>
          <RotBtn onClick={() => rotateBy(180)} title="180°" disabled={!!eq.locked}>
            {t('design3d.flip')}
          </RotBtn>
          <RotBtn onClick={() => rotateBy(90)} title="+90°" disabled={!!eq.locked}>
            <RotateCw size={13} /> 90°
          </RotBtn>
        </div>
      </Section>

      {/* Sil */}
      <Section title="">
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-[11px] font-medium text-rose-600 hover:bg-rose-100 transition"
        >
          <Trash2 size={13} /> {t('design3d.delete')}
        </button>
      </Section>
    </aside>
  );
}

// ── Inline atoms ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-3 border-b border-slate-100 last:border-b-0">
      {title && (
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50 px-2 py-1.5">
      <span className="text-[10px] font-semibold text-slate-400">{label}</span>
      <span className="font-mono text-[11px] tabular-nums text-slate-700">
        {Math.round(value)}
        <span className="text-slate-400">mm</span>
      </span>
    </div>
  );
}

function RotBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
    >
      {children}
    </button>
  );
}
