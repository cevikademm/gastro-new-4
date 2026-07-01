/**
 * WallListPanel — sağ üstte açılan "Duvarlar" paneli.
 *
 * NEDEN: Render için duvarları görünmez yapmak + duvar yüksekliğini ayarlamak.
 * Tam gizlenen bir duvar 3B'de tıklanıp geri getirilemez, bu yüzden her duvarı
 * listeleyen bu panel gizlemenin KANONİK yeridir (3B tıklama onu tamamlar).
 *
 * Görünürlük bir GÖRÜNÜM durumudur (undo'suz); yükseklik ise gerçek bir tasarım
 * özelliğidir (undo'lu, kalıcı) → `update()` ile yazılır.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrickWall, Eye, EyeOff, X } from 'lucide-react';
import { useProjectStore } from '../../../store';
import type { Vertex, Wall, WallId } from '../../../core/types';

const MIN_H = 1000;
const MAX_H = 6000;

interface WallListPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function WallListPanel({ open, onClose }: WallListPanelProps) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const hiddenWallIds = useProjectStore((s) => s.view.hiddenWallIds);
  const selectedWallId = useProjectStore((s) => s.view.selectedWallId);
  const toggleWallHidden = useProjectStore((s) => s.toggleWallHidden);
  const showAllWalls = useProjectStore((s) => s.showAllWalls);
  const selectWall = useProjectStore((s) => s.selectWall);
  const update = useProjectStore((s) => s.update);

  const walls = Object.values(project.walls);
  const hiddenCount = hiddenWallIds.length;

  if (!open) return null;

  const setHeight = (id: WallId, mm: number) => {
    const clamped = Math.max(MIN_H, Math.min(MAX_H, Math.round(mm)));
    update((d) => {
      const w = d.walls[id];
      if (w) w.height = clamped;
    });
  };

  return (
    <aside className="absolute top-3 right-3 w-72 rounded-2xl border border-slate-200/70 bg-white/95 backdrop-blur shadow-lg shadow-slate-900/5 text-[11px] flex flex-col max-h-[calc(100vh-7rem)] z-30">
      <header className="px-4 h-11 flex items-center gap-2 border-b border-slate-100 shrink-0">
        <BrickWall size={13} className="text-brand-red shrink-0" />
        <span className="text-[12px] font-semibold text-slate-800 flex-1">{t('design3d.walls.title')}</span>
        {hiddenCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
            {t('design3d.walls.hiddenCount', { n: hiddenCount })}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          title={t('common.close')}
        >
          <X size={13} />
        </button>
      </header>

      {hiddenCount > 0 && (
        <div className="px-4 py-2 border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={showAllWalls}
            className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
          >
            <Eye size={12} /> {t('design3d.walls.showAll')}
          </button>
        </div>
      )}

      <div className="overflow-y-auto py-1">
        {walls.length === 0 && (
          <p className="px-4 py-6 text-center text-[11px] text-slate-400 leading-snug">
            {t('design3d.walls.empty')}
          </p>
        )}
        {walls.map((wall, i) => (
          <WallRow
            key={wall.id}
            index={i + 1}
            wall={wall}
            va={project.vertices[wall.a]}
            vb={project.vertices[wall.b]}
            hidden={hiddenWallIds.includes(wall.id)}
            selected={selectedWallId === wall.id}
            onToggleHide={() => toggleWallHidden(wall.id)}
            onSelect={() => selectWall(selectedWallId === wall.id ? null : wall.id)}
            onHeight={(mm) => setHeight(wall.id, mm)}
          />
        ))}
      </div>

      <p className="px-4 py-2.5 text-[10px] text-slate-400 leading-snug border-t border-slate-100 shrink-0">
        {t('design3d.walls.footerHelp')}
      </p>
    </aside>
  );
}

function WallRow({
  index,
  wall,
  va,
  vb,
  hidden,
  selected,
  onToggleHide,
  onSelect,
  onHeight,
}: {
  index: number;
  wall: Wall;
  va?: Vertex;
  vb?: Vertex;
  hidden: boolean;
  selected: boolean;
  onToggleHide: () => void;
  onSelect: () => void;
  onHeight: (mm: number) => void;
}) {
  const { t } = useTranslation();
  const [hInput, setHInput] = useState(String(Math.round(wall.height)));
  useEffect(() => {
    setHInput(String(Math.round(wall.height)));
  }, [wall.height]);

  // Duvar seçilince satır görünür olsun.
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selected && rowEl) rowEl.scrollIntoView({ block: 'nearest' });
  }, [selected, rowEl]);

  const lenM =
    va && vb ? Math.hypot(vb.x - va.x, vb.y - va.y) / 1000 : 0;

  const commit = () => {
    const n = Number.parseFloat(hInput);
    if (Number.isFinite(n)) onHeight(n);
  };

  return (
    <div
      ref={setRowEl}
      className={[
        'px-3 py-2 border-b border-slate-50 last:border-b-0 transition',
        selected ? 'bg-brand-red/5' : 'hover:bg-slate-50',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleHide}
          className={[
            'p-1.5 rounded-lg transition shrink-0',
            hidden
              ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
          ].join(' ')}
          title={hidden ? t('design3d.walls.show') : t('design3d.walls.hide')}
        >
          {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 min-w-0 text-left"
          title={t('design3d.walls.selectToggle')}
        >
          <span
            className={[
              'text-[11px] font-medium truncate block',
              hidden ? 'text-slate-400 line-through' : 'text-slate-700',
            ].join(' ')}
          >
            {t('design3d.walls.wallN', { index })}
            {lenM > 0 && (
              <span className="text-slate-400 font-normal"> · {lenM.toFixed(2)} m</span>
            )}
          </span>
        </button>
        <div className="relative shrink-0">
          <input
            type="number"
            value={hInput}
            min={MIN_H}
            max={MAX_H}
            step={50}
            onChange={(e) => setHInput(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
            }}
            className="w-16 h-8 px-2 pr-6 text-[11px] tabular-nums rounded-lg border border-slate-200 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 transition"
            title={t('design3d.walls.heightMm')}
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
            mm
          </span>
        </div>
      </div>

      {selected && (
        <input
          type="range"
          min={MIN_H}
          max={MAX_H}
          step={50}
          value={Math.max(MIN_H, Math.min(MAX_H, Math.round(wall.height)))}
          onChange={(e) => onHeight(Number(e.target.value))}
          className="mt-2 w-full accent-[#931315]"
          title={t('design3d.walls.height')}
        />
      )}
    </div>
  );
}
