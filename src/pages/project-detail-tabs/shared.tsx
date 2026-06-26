import React from 'react';
import { createPortal } from 'react-dom';
import {
  Building2, MapPin, CalendarDays, ClipboardCheck, Upload, FileText, Send,
  Clock, Users, Palette, CheckCircle2, Check, X, HardHat,
} from 'lucide-react';

// ─── Style helpers ────────────────────────────────────────────────────────────
export const card = 'bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xs';
export const inputBase = 'w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-[13px] rounded-lg px-3.5 py-1.5 outline-none transition focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500/80 font-[inherit]';
export const btnPrimary = 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0';
export const btnSecondary = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--card-bg)] border border-[var(--border)] hover:border-[#b89047] hover:text-[#b89047] transition-all duration-200 cursor-pointer disabled:opacity-50';
export const btnDanger = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all duration-200 cursor-pointer disabled:opacity-50';
export const label = 'block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1';

export const SERVICE_LABELS: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Arch. Consultation',
  INTERIOR_DESIGN:            'Interior Design',
  PMC:                        'PMC',
  TURNKEY_CONSTRUCTION:       'Turnkey Construction',
  INTERIOR_EXECUTION:         'Interior Execution',
  RENOVATION:                 'Renovation',
  END_TO_END_SOLUTION:        'End-to-End',
};

export const STATUS_BADGE: Record<string, string> = {
  PENDING_ASSIGNMENT:       'text-amber-700 bg-amber-50 border-amber-200',
  ASSIGNED:                 'text-blue-700 bg-blue-50 border-blue-200',
  SITE_VERIFICATION:        'text-purple-700 bg-purple-50 border-purple-200',
  CDRF_PENDING:             'text-orange-700 bg-orange-50 border-orange-200',
  DESIGN_REVIEW:            'text-indigo-700 bg-indigo-50 border-indigo-200',
  LAYOUT_APPROVED:          'text-teal-700 bg-teal-50 border-teal-200',
  DESIGN_IN_PROGRESS:       'text-sky-700 bg-sky-50 border-sky-200',
  CONSTRUCTION_IN_PROGRESS: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  COMPLETED:                'text-emerald-700 bg-emerald-50 border-emerald-200',
};

export type TabId = 'overview' | 'site' | 'cdrf-meetings' | 'cdrf-form' | 'design' | 'pipeline' | 'transmittals' | 'construction' | 'issued-drawings';

export const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',         label: 'Overview',          icon: <Building2 size={13} /> },
  { id: 'site',             label: 'Site Verification',  icon: <MapPin size={13} /> },
  { id: 'cdrf-meetings',    label: 'Client Meetings',    icon: <CalendarDays size={13} /> },
  { id: 'cdrf-form',        label: 'Client Brief',       icon: <ClipboardCheck size={13} /> },
  { id: 'design',           label: 'Layout & Approval', icon: <Upload size={13} /> },
  { id: 'pipeline',         label: 'Design Pipeline',   icon: <FileText size={13} /> },
  { id: 'transmittals',     label: 'Transmittals',      icon: <Send size={13} /> },
  { id: 'construction',     label: 'Construction',       icon: <HardHat size={13} /> },
  { id: 'issued-drawings',  label: 'Issued Drawings',   icon: <FileText size={13} /> },
];

export const STATUS_ORDER = [
  'PENDING_ASSIGNMENT', 'ASSIGNED', 'SITE_VERIFICATION', 'CDRF_PENDING',
  'DESIGN_REVIEW', 'LAYOUT_APPROVED', 'DESIGN_IN_PROGRESS', 'CONSTRUCTION_IN_PROGRESS', 'COMPLETED',
] as const;

export const TAB_MIN_STATUS: Record<TabId, string> = {
  overview:           'PENDING_ASSIGNMENT',
  site:               'ASSIGNED',
  'cdrf-meetings':    'ASSIGNED',
  'cdrf-form':        'CDRF_PENDING',
  design:             'DESIGN_REVIEW',
  pipeline:           'LAYOUT_APPROVED',
  transmittals:       'DESIGN_IN_PROGRESS',
  construction:       'DESIGN_IN_PROGRESS',      // accessible from Drawing phase onwards (planning)
  'issued-drawings':  'DESIGN_IN_PROGRESS',
};

// Which roles can see each tab (hidden entirely if role not listed)
export const TAB_VISIBLE_ROLES: Record<TabId, string[]> = {
  overview:          ['Super Admin', 'Admin', 'Project Manager', 'Project Architect', 'Junior Architect', 'Site Engineer'],
  site:              ['Super Admin', 'Admin', 'Project Manager', 'Site Engineer'],
  'cdrf-meetings':   ['Super Admin', 'Admin', 'Project Manager', 'Project Architect', 'Junior Architect'],
  'cdrf-form':       ['Super Admin', 'Admin', 'Project Manager', 'Project Architect', 'Junior Architect'],
  design:            ['Super Admin', 'Admin', 'Project Manager', 'Project Architect', 'Junior Architect'],
  pipeline:          ['Super Admin', 'Admin', 'Project Manager', 'Project Architect', 'Junior Architect'],
  transmittals:      ['Super Admin', 'Admin', 'Project Manager', 'Project Architect', 'Junior Architect'],
  construction:      ['Super Admin', 'Admin', 'Project Manager', 'Site Engineer', 'Construction Head'],
  'issued-drawings': ['Site Engineer'],
};

export const PROJECT_PIPELINE = [
  { key: 'PENDING_ASSIGNMENT',       label: 'Pending',        icon: <Clock size={11} /> },
  { key: 'ASSIGNED',                 label: 'Team Assigned',  icon: <Users size={11} /> },
  { key: 'SITE_VERIFICATION',        label: 'Site Check',     icon: <MapPin size={11} /> },
  { key: 'CDRF_PENDING',             label: 'CDRF',           icon: <ClipboardCheck size={11} /> },
  { key: 'DESIGN_REVIEW',            label: 'Layout Review',  icon: <Palette size={11} /> },
  { key: 'LAYOUT_APPROVED',          label: 'Layout OK',      icon: <CheckCircle2 size={11} /> },
  { key: 'DESIGN_IN_PROGRESS',       label: 'Drawings',       icon: <FileText size={11} /> },
  { key: 'CONSTRUCTION_IN_PROGRESS', label: 'Construction',   icon: <HardHat size={11} /> },
  { key: 'COMPLETED',                label: 'Completed',      icon: <CheckCircle2 size={11} /> },
];

export function ProjectPipelineStepper({ status }: { status: string }) {
  const activeIdx = PROJECT_PIPELINE.findIndex(s => s.key === status);
  return (
    <div className="bg-stone-50/40 dark:bg-white/[0.02] border border-[var(--border)] rounded-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3">Project Pipeline</p>
      <div className="flex items-center gap-0">
        {PROJECT_PIPELINE.map((step, idx) => {
          const isDone    = idx < activeIdx;
          const isActive  = idx === activeIdx;
          const isLast    = idx === PROJECT_PIPELINE.length - 1;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className={[
                  'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                  isDone   ? 'bg-emerald-500 text-white' :
                  isActive ? 'bg-[#b89047] text-white ring-4 ring-[rgba(184,144,71,0.2)]' :
                             'bg-[var(--card-bg)] border-2 border-[var(--border)] text-[var(--text-muted)]',
                ].join(' ')}>
                  {isDone ? <Check size={11} /> : step.icon}
                </div>
                <span className={[
                  'text-[8.5px] font-semibold text-center leading-tight max-w-[52px]',
                  isDone   ? 'text-emerald-600' :
                  isActive ? 'text-[#9e7735] font-bold' :
                             'text-[var(--text-muted)]',
                ].join(' ')}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all ${isDone ? 'bg-emerald-400' : 'bg-[var(--border)]'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`${card} w-full max-w-lg max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] shrink-0">
          <div>
            <p className="text-[13.5px] font-bold text-[var(--text-primary)]">{title}</p>
            {subtitle && <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer border-0 bg-transparent p-1"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function ClientContactBanner({ client, prospect }: { client: any; prospect: any }) {
  if (!client) return null;
  return (
    <div className="bg-gradient-to-r from-[rgba(184,144,71,0.06)] to-transparent border border-[rgba(184,144,71,0.18)] rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1.5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#b89047] to-[#7c5e2a] flex items-center justify-center text-white font-bold text-[11px] shrink-0">
          {client.clientName?.charAt(0) ?? 'C'}
        </div>
        <span className="text-[13px] font-bold text-[var(--text-primary)]">{client.clientName}</span>
      </div>
      {client.mobileNo && (
        <div className="flex items-center gap-1 text-[11.5px] text-[var(--text-secondary)]">
          <span className="text-[var(--text-muted)] font-semibold">Ph:</span>
          <a href={`tel:${client.mobileNo}`} className="hover:text-[#b89047] transition-colors">{client.mobileNo}</a>
        </div>
      )}
      {client.email && (
        <div className="flex items-center gap-1 text-[11.5px] text-[var(--text-secondary)]">
          <span className="text-[var(--text-muted)] font-semibold">Email:</span>
          <a href={`mailto:${client.email}`} className="hover:text-[#b89047] transition-colors">{client.email}</a>
        </div>
      )}
      {(client.locality || client.state) && (
        <div className="flex items-center gap-1 text-[11.5px] text-[var(--text-secondary)]">
          <span className="text-[var(--text-muted)] font-semibold">Location:</span>
          <span>{[client.locality, client.city, client.state].filter(Boolean).join(', ')}</span>
        </div>
      )}
      {prospect?.serviceType && (
        <div className="flex items-center gap-1 text-[11.5px]">
          <span className="text-[var(--text-muted)] font-semibold">Service:</span>
          <span className="text-[#b89047] font-semibold">{prospect.serviceType.split(',').map((s: string) => SERVICE_LABELS[s.trim()] ?? s.trim()).join(', ')}</span>
        </div>
      )}
    </div>
  );
}
