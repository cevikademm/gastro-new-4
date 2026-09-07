/**
 * Generic toolbar button used across editor chrome. Phase 1 baseline —
 * subsequent phases add tooltip, hotkey hint, and active-state variants.
 */

import { type ReactNode } from 'react';
import { headerBtnClass } from './chrome';

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
      aria-label={title}
      className={headerBtnClass(!!active)}
    >
      {children}
    </button>
  );
}
