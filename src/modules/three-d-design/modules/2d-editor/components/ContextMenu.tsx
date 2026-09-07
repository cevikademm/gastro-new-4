/**
 * ContextMenu — DOM right-click / long-press menu for the 2D canvas.
 * Positioned in the editor host, clamped to its bounds, closed on outside
 * click / Escape / scroll.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PANEL } from '../../../components/ui/chrome';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  /** Visual separator ABOVE this item. */
  separator?: boolean;
  onClick: () => void;
}

interface Props {
  x: number;
  y: number;
  hostWidth: number;
  hostHeight: number;
  title?: string;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, hostWidth, hostHeight, title, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x, y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setPos({
      x: Math.max(4, Math.min(x, hostWidth - w - 4)),
      y: Math.max(4, Math.min(y, hostHeight - h - 4)),
    });
  }, [x, y, hostWidth, hostHeight, items.length]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onClose, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ left: pos.x, top: pos.y }}
      className={`absolute z-40 min-w-[200px] py-1 ${PANEL}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {title && (
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 truncate">
          {title}
        </div>
      )}
      {items.map((it) => (
        <div key={it.id}>
          {it.separator && <div className="my-1 h-px bg-slate-100" />}
          <button
            type="button"
            disabled={it.disabled}
            onClick={() => {
              if (it.disabled) return;
              it.onClick();
              onClose();
            }}
            className={[
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition',
              it.disabled
                ? 'text-slate-300 cursor-not-allowed'
                : it.danger
                  ? 'text-rose-600 hover:bg-rose-50'
                  : 'text-slate-700 hover:bg-slate-100',
            ].join(' ')}
          >
            {it.icon && <span className="w-4 shrink-0 text-slate-400">{it.icon}</span>}
            <span className="flex-1 truncate">{it.label}</span>
            {it.shortcut && <span className="text-[10px] text-slate-400">{it.shortcut}</span>}
          </button>
        </div>
      ))}
    </div>
  );
}
