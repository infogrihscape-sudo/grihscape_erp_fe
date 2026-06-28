// Canonical style tokens — single source of truth for all pages.
// Compact tab variants (px-3/py-1.5) live in project-detail-tabs/shared.tsx.

export const inputBase =
  'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-[13px] rounded-lg px-3.5 py-1.5 outline-none transition focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500/80 font-[inherit]';

export const btnPrimary =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px active:scale-[0.97] hover:shadow-md transition-all duration-200 cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none disabled:active:scale-100';

export const btnSecondary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--card-bg)] border border-[var(--border)] hover:border-[#b89047] hover:text-[#b89047] active:scale-[0.97] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

export const btnDanger =
  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 active:scale-[0.97] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

export const label =
  'block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1';

// ── Typography scale — use these instead of arbitrary text-[Npx] ──
export const typo = {
  pageTitle:    'text-[13px] font-bold tracking-tight text-[var(--text-primary)]',
  cardTitle:    'text-[12.5px] font-bold text-[var(--text-primary)]',
  modalTitle:   'text-[13.5px] font-bold text-[var(--text-primary)]',
  body:         'text-[13px] text-[var(--text-secondary)]',
  bodySm:       'text-[11.5px] text-[var(--text-secondary)]',
  muted:        'text-[11px] text-[var(--text-muted)]',
  emptyHeading: 'text-[15px] font-bold text-[var(--text-primary)]',
  emptyBody:    'text-[12.5px] text-[var(--text-secondary)]',
} as const;
