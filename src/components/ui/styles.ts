// Canonical page-level style tokens shared across standalone pages.
// For compact project-detail tab components use project-detail-tabs/shared.tsx instead.

export const inputBase =
  'w-full bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-1.5 outline-none transition focus:border-[#b89047] focus:ring-2 focus:ring-[rgba(184,144,71,0.2)] font-[inherit]';

export const btnPrimary =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none';

export const btnSecondary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--card-bg)] border border-[var(--border)] hover:border-[#b89047] hover:text-[#b89047] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const btnDanger =
  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const label =
  'block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1';
