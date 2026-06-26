import React from 'react';

export type StatusModule = 'PROJECT' | 'MEETING' | 'DRAWING' | 'LAYOUT' | 'SPR' | 'INFLOW' | 'OUTFLOW';

const STATUS_COLORS: Record<string, string> = {
  // ── Project pipeline ────────────────────────────────────────────────────────
  PENDING_ASSIGNMENT: 'text-amber-700 bg-amber-50 border-amber-200',
  ASSIGNED:           'text-blue-700 bg-blue-50 border-blue-200',
  SITE_VERIFICATION:  'text-purple-700 bg-purple-50 border-purple-200',
  CDRF_PENDING:       'text-orange-700 bg-orange-50 border-orange-200',
  DESIGN_REVIEW:      'text-indigo-700 bg-indigo-50 border-indigo-200',
  LAYOUT_APPROVED:    'text-teal-700 bg-teal-50 border-teal-200',
  DESIGN_IN_PROGRESS:       'text-sky-700 bg-sky-50 border-sky-200',
  CONSTRUCTION_IN_PROGRESS: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  COMPLETED:                'text-emerald-700 bg-emerald-50 border-emerald-200',

  // ── CDRF Meetings ───────────────────────────────────────────────────────────
  PENDING_PM_APPROVAL: 'text-violet-700 bg-violet-50 border-violet-200',
  SCHEDULED:           'text-blue-700 bg-blue-50 border-blue-200',

  // ── Drawings ────────────────────────────────────────────────────────────────
  NOT_STARTED: 'text-stone-600 bg-stone-50 border-stone-200',
  IN_PROGRESS: 'text-blue-700 bg-blue-50 border-blue-200',
  REVIEW:      'text-amber-700 bg-amber-50 border-amber-200',

  // ── Layout / Design drafts ──────────────────────────────────────────────────
  PENDING_REVIEW:      'text-amber-700 bg-amber-50 border-amber-200',
  PENDING_CLIENT:      'text-blue-700 bg-blue-50 border-blue-200',
  REVISION_REQUESTED:  'text-orange-700 bg-orange-50 border-orange-200',
  CLIENT_APPROVED:     'text-teal-700 bg-teal-50 border-teal-200',

  // ── SPR ─────────────────────────────────────────────────────────────────────
  PENDING_PM:    'text-violet-700 bg-violet-50 border-violet-200',
  PENDING_ADMIN: 'text-blue-700 bg-blue-50 border-blue-200',
  SENT_BACK:     'text-orange-700 bg-orange-50 border-orange-200',

  // ── Shared terminal states ───────────────────────────────────────────────────
  APPROVED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  REJECTED: 'text-rose-700 bg-rose-50 border-rose-200',

  // ── Accounts (Inflow / Outflow) ──────────────────────────────────────────────
  DRAFT:     'text-stone-600 bg-stone-50 border-stone-200',
  SUBMITTED: 'text-amber-700 bg-amber-50 border-amber-200',
  CANCELLED: 'text-rose-700 bg-rose-50 border-rose-200',
  PENDING:   'text-amber-700 bg-amber-50 border-amber-200',
};

const FALLBACK = 'text-stone-600 bg-stone-50 border-stone-200';

interface Props {
  status: string;
  module?: StatusModule;
  className?: string;
}

export function StatusBadge({ status, className = '' }: Props) {
  const colors = STATUS_COLORS[status] ?? FALLBACK;
  const label  = status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors} ${className}`}
    >
      {label}
    </span>
  );
}
