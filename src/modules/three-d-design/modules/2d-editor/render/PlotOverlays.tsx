/**
 * Plot decorations overlaid on the 2D canvas — compass rose, title block,
 * graphic scale bar. These mimic the legacy Manuel Çizim plotting style so
 * the same drawing reads identically across both editors.
 *
 * They live as DOM elements (not Konva nodes) so they stay anchored to the
 * viewport and don't pan/zoom with the drawing — matches CAD plot
 * conventions where these pieces of paper-space chrome are stationary.
 */

import { roomAreaM2, roomPerimeterM, type ProjectDocument } from '../../..';

// ── Compass rose (top-right) ───────────────────────────────────────────────

export function CompassRose() {
  return (
    <div className="absolute top-3 right-3 pointer-events-none select-none">
      <svg width={64} height={64} viewBox="0 0 64 64">
        <circle cx={32} cy={32} r={28} fill="white" stroke="#0f172a" strokeWidth={1} opacity={0.95} />
        {/* North arrow */}
        <polygon points="32,8 27,32 32,28 37,32" fill="#0f172a" />
        <polygon points="32,56 27,32 32,36 37,32" fill="#cbd5e1" stroke="#0f172a" strokeWidth={0.5} />
        {/* N label */}
        <text
          x={32}
          y={6}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fill="#0f172a"
          fontFamily="Inter, system-ui, sans-serif"
        >
          K
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
  // Sum area + perimeter across all rooms in the document.
  let totalArea = 0;
  let totalPerimeter = 0;
  for (const room of Object.values(project.rooms)) {
    totalArea += roomAreaM2(project, room);
    totalPerimeter += roomPerimeterM(project, room);
  }

  return (
    <div className="absolute bottom-3 right-3 pointer-events-none select-none">
      <table className="bg-white/95 backdrop-blur border border-slate-800 text-[11px] font-mono text-slate-800 shadow">
        <tbody>
          <tr className="border-b border-slate-800">
            <td className="px-3 py-1 text-center font-bold uppercase tracking-wider" colSpan={2}>
              2MC GASTRO
            </td>
          </tr>
          <tr className="border-b border-slate-300">
            <td className="px-3 py-1 border-r border-slate-300 text-slate-500">ALAN</td>
            <td className="px-3 py-1 font-semibold tabular-nums">{totalArea.toFixed(1)} m²</td>
          </tr>
          <tr>
            <td className="px-3 py-1 border-r border-slate-300 text-slate-500">ÇEVRE</td>
            <td className="px-3 py-1 font-semibold tabular-nums">{totalPerimeter.toFixed(1)} m</td>
          </tr>
          <tr>
            <td className="px-3 py-0.5 border-t border-slate-300 text-[9px] text-slate-400 uppercase" colSpan={2}>
              Ölçek {scale}
            </td>
          </tr>
        </tbody>
      </table>
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
      <div className="bg-white/90 backdrop-blur border border-slate-300 px-3 py-2 text-[10px] font-mono text-slate-700">
        <div className="font-bold mb-1 tracking-wider">GRAFİK ÖLÇEK 1:100</div>
        <div className="relative" style={{ width: totalPx, height: 14 }}>
          {/* Bar */}
          <div className="absolute inset-x-0 top-1 h-2 flex border border-slate-800">
            {ticks.map((i) => (
              <div
                key={i}
                className="flex-1"
                style={{ background: i % 2 === 0 ? '#0f172a' : '#ffffff' }}
              />
            ))}
          </div>
          {/* Tick labels */}
          {ticks.concat([segments]).map((i) => (
            <span
              key={`l-${i}`}
              className="absolute -bottom-3 text-[9px] tabular-nums"
              style={{
                left: i * segPx,
                transform: 'translateX(-50%)',
              }}
            >
              {((totalM / segments) * i).toFixed(((totalM / segments) % 1) === 0 ? 0 : 1)}
            </span>
          ))}
          <span className="absolute -bottom-3 -right-3 text-[9px] text-slate-500">m</span>
        </div>
      </div>
    </div>
  );
}
