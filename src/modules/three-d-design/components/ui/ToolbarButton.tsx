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
        'inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-primary text-white'
          : 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
