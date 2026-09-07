/**
 * Toolbar2D — editor chrome for the 2D canvas, in two pieces:
 *
 *   • Tool rail (left edge, vertical): select · draw room / rect / wall · pan
 *     | door · window · pass-through | product catalog. Exclusive modes, so
 *     the active one is a solid dark pill.
 *   • Top bar (centred over the free canvas area between the rail and the
 *     properties panel): zoom · drawing aids · grid size · delete / clear ·
 *     undo / redo. Wraps to a second row when the canvas is narrow (split view).
 *
 * Splitting the strip this way keeps the top bar short enough that it never
 * runs under the right-hand properties panel.
 */

import { useTranslation } from 'react-i18next';
import {
  MousePointer2,
  PenTool,
  Square,
  Slash,
  Hand,
  DoorOpen,
  RectangleHorizontal,
  ArrowLeftRight,
  Package,
  Plus,
  Minus,
  Maximize2,
  Grid3x3,
  Magnet,
  Ruler,
  Trash2,
  Eraser,
  Undo2,
  Redo2,
  Compass,
} from 'lucide-react';
import type { Tool } from '../state/editorState';
import { SEP_H, SEP_V, TOOLBAR, toolBtnClass, type ToolBtnKind } from '../../../components/ui/chrome';

interface Props {
  tool: Tool;
  setTool: (t: Tool) => void;
  catalogOpen: boolean;
  toggleCatalog: () => void;
  armed: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  snapOn: boolean;
  toggleSnap: () => void;
  orthoOn: boolean;
  toggleOrtho: () => void;
  showGrid: boolean;
  toggleGrid: () => void;
  showDims: boolean;
  toggleDims: () => void;
  gridMm: number;
  setGridMm: (mm: number) => void;
  hasSelection: boolean;
  deleteSelection: () => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const GRID_STEPS = [10, 50, 100, 250, 500];

export default function Toolbar2D(p: Props) {
  const { t } = useTranslation();
  const tools: Array<{ id: Tool; icon: React.ReactNode; title: string }> = [
    { id: 'select', icon: <MousePointer2 size={15} />, title: t('design3d.tool.select') },
    { id: 'draw-room', icon: <PenTool size={15} />, title: t('design3d.tool.drawRoom') },
    { id: 'draw-rect', icon: <Square size={15} />, title: t('design3d.tool.drawRect') },
    { id: 'draw-wall', icon: <Slash size={15} />, title: t('design3d.tool.drawWall') },
    { id: 'pan', icon: <Hand size={15} />, title: t('design3d.tool.pan') },
  ];
  const openings: Array<{ id: Tool; icon: React.ReactNode; title: string }> = [
    { id: 'place-door', icon: <DoorOpen size={15} />, title: t('design3d.tool.placeDoor') },
    { id: 'place-window', icon: <RectangleHorizontal size={15} />, title: t('design3d.tool.placeWindow') },
    { id: 'place-pass', icon: <ArrowLeftRight size={15} />, title: t('design3d.tool.placePass') },
  ];

  return (
    <>
      {/* ── Tool rail (left) ─────────────────────────────────────────── */}
      <div className={`absolute left-3 top-3 z-20 flex flex-col items-center gap-0.5 ${TOOLBAR}`}>
        {tools.map((tl) => (
          <ToolBtn key={tl.id} kind="tool" active={p.tool === tl.id} onClick={() => p.setTool(tl.id)} title={tl.title}>
            {tl.icon}
          </ToolBtn>
        ))}
        <div className={SEP_V} />
        {openings.map((tl) => (
          <ToolBtn
            key={tl.id}
            kind="tool"
            active={p.tool === tl.id}
            onClick={() => p.setTool(p.tool === tl.id ? 'select' : tl.id)}
            title={tl.title}
          >
            {tl.icon}
          </ToolBtn>
        ))}
        <div className={SEP_V} />
        <ToolBtn kind="toggle" active={p.catalogOpen || p.armed} onClick={p.toggleCatalog} title={t('design3d.tool.addProduct')}>
          <Package size={15} />
        </ToolBtn>
      </div>

      {/* ── Top bar (centred over the free canvas area) ─────────────── */}
      <div className="pointer-events-none absolute left-16 right-3 top-3 z-20 flex justify-center sm:right-[19.5rem]">
        <div className={`pointer-events-auto inline-flex max-w-full flex-wrap items-center justify-center gap-0.5 ${TOOLBAR}`}>
          <ToolBtn onClick={p.zoomIn} title={t('design3d.tool.zoomIn')}><Plus size={14} /></ToolBtn>
          <ToolBtn onClick={p.zoomOut} title={t('design3d.tool.zoomOut')}><Minus size={14} /></ToolBtn>
          <ToolBtn onClick={p.fit} title={t('design3d.tool.fitToContent')}><Maximize2 size={14} /></ToolBtn>
          <div className={SEP_H} />
          <ToolBtn kind="toggle" active={p.snapOn} onClick={p.toggleSnap} title={t('design3d.tool.snap')}><Magnet size={14} /></ToolBtn>
          <ToolBtn kind="toggle" active={p.orthoOn} onClick={p.toggleOrtho} title={t('design3d.tool.ortho')}><Compass size={14} /></ToolBtn>
          <ToolBtn kind="toggle" active={p.showGrid} onClick={p.toggleGrid} title={t('design3d.tool.grid')}><Grid3x3 size={14} /></ToolBtn>
          <ToolBtn kind="toggle" active={p.showDims} onClick={p.toggleDims} title={t('design3d.tool.dims')}><Ruler size={14} /></ToolBtn>
          <select
            value={p.gridMm}
            onChange={(e) => p.setGridMm(Number(e.target.value))}
            title={t('design3d.tool.gridSize')}
            aria-label={t('design3d.tool.gridSize')}
            className="mx-0.5 h-8 rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
          >
            {GRID_STEPS.map((g) => (
              <option key={g} value={g}>{g >= 1000 ? `${g / 1000} m` : `${g} mm`}</option>
            ))}
          </select>
          <div className={SEP_H} />
          <ToolBtn kind="danger" disabled={!p.hasSelection} onClick={p.deleteSelection} title={t('design3d.tool.deleteSelection')}>
            <Trash2 size={14} />
          </ToolBtn>
          <ToolBtn kind="danger" onClick={p.clearAll} title={t('design3d.tool.clearAll')}>
            <Eraser size={14} />
          </ToolBtn>
          <div className={SEP_H} />
          <ToolBtn disabled={!p.canUndo} onClick={p.undo} title={t('design3d.undo')}><Undo2 size={14} /></ToolBtn>
          <ToolBtn disabled={!p.canRedo} onClick={p.redo} title={t('design3d.redo')}><Redo2 size={14} /></ToolBtn>
        </div>
      </div>
    </>
  );
}

function ToolBtn({
  children,
  active,
  disabled,
  kind = 'plain',
  title,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  kind?: ToolBtnKind;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={toolBtnClass({ active, kind })}
    >
      {children}
    </button>
  );
}
