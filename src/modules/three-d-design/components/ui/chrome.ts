/**
 * Editor chrome tokens — ONE place for the floating panel / toolbar / HUD look
 * shared by the 2D and 3D editors, so every overlay reads as the same family.
 *
 * Panels are frosted white cards with a soft, wide shadow; toolbars are the
 * same card with tighter padding; HUD pills are lighter and non-interactive.
 *
 * NOTE: `backdrop-blur` makes the panel a containing block for `position:
 * fixed` descendants — dialogs opened from inside a panel must portal to
 * document.body (see LibraryTab / ImportModelDialog).
 */

/** Floating card (catalog, properties, wall list, gallery header …). */
export const PANEL =
  'rounded-2xl border border-slate-200/70 bg-white/90 backdrop-blur-xl ' +
  'shadow-[0_18px_50px_-20px_rgba(15,23,42,0.35),0_1px_2px_rgba(15,23,42,0.06)]';

/** Horizontal / vertical tool strip. */
export const TOOLBAR = `${PANEL} p-1`;

/** Read-only status pill (counts, zoom, control hints). */
export const HUD =
  'rounded-full border border-slate-200/70 bg-white/85 backdrop-blur-md ' +
  'shadow-[0_6px_20px_-12px_rgba(15,23,42,0.35)] text-[11px] text-slate-500';

/** Thin vertical separator inside a toolbar. */
export const SEP_H = 'mx-0.5 h-5 w-px shrink-0 bg-slate-200/80';
/** Thin horizontal separator inside a vertical rail. */
export const SEP_V = 'my-0.5 h-px w-5 shrink-0 self-center bg-slate-200/80';

export type ToolBtnKind = 'tool' | 'toggle' | 'danger' | 'plain';

/**
 * Icon button used in every editor toolbar.
 *   tool   — exclusive mode (select / draw / place): active = solid dark pill
 *   toggle — on/off aid (snap / grid / shadows …): active = soft red tint
 *   danger — destructive action (delete / clear)
 */
export function toolBtnClass(opts: { active?: boolean; kind?: ToolBtnKind; size?: 'sm' | 'md' } = {}): string {
  const { active = false, kind = 'plain', size = 'md' } = opts;
  const base =
    'inline-flex shrink-0 items-center justify-center rounded-xl transition-colors duration-150 ' +
    'disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent';
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  let look: string;
  if (kind === 'danger') {
    look = 'text-rose-500 hover:bg-rose-50 hover:text-rose-600';
  } else if (active && kind === 'tool') {
    look = 'bg-slate-900 text-white shadow-md shadow-slate-900/25';
  } else if (active) {
    look = 'bg-brand-red/10 text-brand-red ring-1 ring-inset ring-brand-red/20';
  } else {
    look = 'text-slate-500 hover:bg-slate-900/5 hover:text-slate-800';
  }
  return [base, dims, look].join(' ');
}

/** Small labelled button in the page header (Save · CAD …). */
export function headerBtnClass(active = false): string {
  return [
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium transition-colors',
    active
      ? 'bg-brand-red/10 text-brand-red'
      : 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 disabled:text-slate-300 disabled:hover:bg-transparent',
  ].join(' ');
}
