/**
 * Generic toolbar button used across editor chrome. Phase 1 baseline —
 * subsequent phases add tooltip, hotkey hint, and active-state variants.
 */

import { type ReactNode } from 'react';

interface ToolbarButtonProps {
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}

export default function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'inline-flex items-center justify-center gap-1.5 px-2.5 h-9 rounded-xl text-[11px] font-medium transition',
        active
          ? 'bg-brand-red/10 text-brand-red ring-1 ring-brand-red/20'
          : 'text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
