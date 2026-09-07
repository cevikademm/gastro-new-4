/**
 * Plot decorations overlaid on the 2D canvas — compass rose, title block,
 * graphic scale bar. These mimic the legacy Manuel Çizim plotting style so
 * the same drawing reads identically across both editors.
 *
 * They live as DOM elements (not Konva nodes) so they stay anchored to the
 * viewport and don't pan/zoom with the drawing — matches CAD plot
 * conventions where these pieces of paper-space chrome are stationary.
 */

import { useTranslation } from 'react-i18next';

import { roomAreaM2, roomPerimeterM, type ProjectDocument } from '../../..';
import { HUD, PANEL } from '../../../components/ui/chrome';

// ── Compass rose (top-right, under the toolbar band) ───────────────────────

export function CompassRose() {
  const { t } = useTranslation();
  return (
    <div className="absolute top-16 right-3 pointer-events-none select-none drop-shadow-[0_4px_10px_rgba(15,23,42,0.12)]">
      <svg width={56} height={56} viewBox="0 0 64 64">
        <circle cx={32} cy={32} r={28} fill="rgba(255,255,255,0.92)" stroke="#cbd5e1" strokeWidth={1} />
        {/* North arrow */}
        <polygon points="32,8 27,32 32,28 37,32" fill="#1e293b" />
        <polygon points="32,56 27,32 32,36 37,32" fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.5} />
        {/* N label */}
        <text
          x={32}
          y={6}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fill="#1e293b"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {t('design3d.plot.north')}
        </text>
      </svg>
    </div>
  );
}

// ── Title block (bottom-right) ─────────────────────────────────────────────

interface TitleBlockProps {
  project: ProjectDocument;
  /** Optional drawing scale (e.g. "1:100"). */
  scale?: string;
}

export function TitleBlock({ project, scale = '1:100' }: TitleBlockProps) {
  const { t } = useTranslation();
  // Sum area + perimeter across all rooms in the document.
  let totalArea = 0;
  let totalPerimeter = 0;
  for (const room of Object.values(project.rooms)) {
    totalArea += roomAreaM2(project, room);
    totalPerimeter += roomPerimeterM(project, room);
  }
  // Ürünlerin (ekipman) toplam kapladığı taban alanı (footprint mm² → m²).
  let productAreaMm2 = 0;
  for (const eq of Object.values(project.equipment)) {
    productAreaMm2 += eq.footprint.width * eq.footprint.depth;
  }
  const productAreaM2 = productAreaMm2 / 1_000_000;

  const rows: Array<[string, string]> = [
    [t('design3d.plot.area'), `${totalArea.toFixed(1)} m²`],
    [t('design3d.plot.perimeter'), `${totalPerimeter.toFixed(1)} m`],
    [t('design3d.plot.productArea'), `${productAreaM2.toFixed(1)} m²`],
  ];

  return (
    <div className="absolute bottom-3 right-3 pointer-events-none select-none">
      <div className={`${PANEL} min-w-[11rem] overflow-hidden text-[11px] text-slate-700`}>
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-3 py-1.5 text-white">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]">2MC Gastro</span>
          <span className="text-[9px] font-medium uppercase tracking-wider text-white/60">{t('design3d.plot.scale', { scale })}</span>
        </div>
        <dl className="divide-y divide-slate-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-3 py-1">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</dt>
              <dd className="font-semibold tabular-nums text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// ── Graphic scale bar (bottom-left) ────────────────────────────────────────
// Picks a "nice" total length (1, 2, 5, 10 m …) that is currently between
// 80 and 240 px wide on screen, so the bar always renders at a useful size.

interface ScaleBarProps {
  /** px per mm — the Konva stage scale. */
  scale: number;
}

export function ScaleBar({ scale }: ScaleBarProps) {
  const { t } = useTranslation();
  // Convert px/mm → px/m
  const pxPerM = scale * 1000;

  // Find a "nice" number of meters that lands the bar in 80..240 px.
  const candidates = [0.5, 1, 2, 3, 5, 10, 20, 50, 100];
  let totalM = candidates[0];
  for (const c of candidates) {
    const w = c * pxPerM;
    if (w >= 80 && w <= 240) {
      totalM = c;
      break;
    }
    if (w < 80) totalM = c; // keep growing while still small
  }

  const totalPx = totalM * pxPerM;
  // 5 segments so the alternating tick pattern reads like a typical CAD bar.
  const segments = 5;
  const segPx = totalPx / segments;

  const ticks = Array.from({ length: segments }, (_, i) => i);

  return (
    <div className="absolute bottom-3 left-3 pointer-events-none select-none">
      <div className={`${HUD} rounded-xl px-3 pb-3.5 pt-2 text-slate-700`}>
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t('design3d.plot.graphicScale')}</div>
        <div className="relative" style={{ width: totalPx, height: 12 }}>
          {/* Bar */}
          <div className="absolute inset-x-0 top-0.5 flex h-2 overflow-hidden rounded-[3px] ring-1 ring-slate-700">
            {ticks.map((i) => (
              <div
                key={i}
                className="flex-1"
                style={{ background: i % 2 === 0 ? '#1e293b' : '#ffffff' }}
              />
            ))}
          </div>
          {/* Tick labels */}
          {ticks.concat([segments]).map((i) => (
            <span
              key={`l-${i}`}
              className="absolute -bottom-3.5 text-[9px] font-medium tabular-nums text-slate-500"
              style={{
                left: i * segPx,
                transform: 'translateX(-50%)',
              }}
            >
              {((totalM / segments) * i).toFixed(((totalM / segments) % 1) === 0 ? 0 : 1)}
            </span>
          ))}
          <span className="absolute -bottom-3.5 -right-4 text-[9px] text-slate-400">m</span>
        </div>
      </div>
    </div>
  );
}
