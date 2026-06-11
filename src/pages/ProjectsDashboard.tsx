import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { projectApi } from '../services/api.js';
import type { User } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useRouter } from '../context/RouterContext.js';
import { ShimmerTable } from '../components/Shimmer.js';
import {
  HardHat, Search, RefreshCw, UserCheck, X, ChevronLeft, ChevronRight,
  Users, Loader2, AlertCircle, CheckCircle2, Clock, Building2,
  MapPin, ClipboardCheck, Palette, ArrowRight, Phone,
} from 'lucide-react';

interface Props { currentUser: User; }

interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: { name: string };
}

interface ProjectAssignment {
  id: string;
  assignedAt: string;
  notes: string | null;
  projectManager: { id: string; name: string; email: string };
  projectArchitect: { id: string; name: string; email: string };
  juniorArchitect: { id: string; name: string; email: string } | null;
  assignedBy: { id: string; name: string };
  siteEngineer: { id: string; name: string; email: string } | null;
}

interface Project {
  id: string;
  status: string;
  createdAt: string;
  prospect: {
    id: string;
    serviceType: string;
    workflowStage: string;
    initialPaymentAmount: number | null;
    initialPaymentUnit: string | null;
    client: {
      id: string;
      clientName: string;
      mobileNo: string;
      email: string | null;
      locality: string;
      state: string | null;
    };
  };
  assignment: ProjectAssignment | null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const card = 'bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xs';
const inputBase =
  'w-full bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-1.5 outline-none transition focus:border-[#b89047] focus:ring-2 focus:ring-[rgba(184,144,71,0.2)] font-[inherit]';
const btnPrimary =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0';
const btnSecondary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--card-bg)] border border-[var(--border)] hover:border-[#b89047] hover:text-[#b89047] transition-all duration-200 cursor-pointer disabled:opacity-50';

// ─── Pipeline stages ──────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'PENDING_ASSIGNMENT', label: 'Pending Assignment', short: 'Pending',    icon: <Clock size={14} />,        color: 'text-amber-600',    bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-300 dark:border-amber-700',   ring: 'ring-amber-300' },
  { key: 'ASSIGNED',           label: 'Team Assigned',      short: 'Assigned',   icon: <Users size={14} />,        color: 'text-blue-600',     bg: 'bg-blue-50 dark:bg-blue-950/30',     border: 'border-blue-300 dark:border-blue-700',     ring: 'ring-blue-300' },
  { key: 'SITE_VERIFICATION',  label: 'Site Verification',  short: 'Site',       icon: <MapPin size={14} />,       color: 'text-purple-600',   bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-700', ring: 'ring-purple-300' },
  { key: 'CDRF_PENDING',       label: 'CDRF Pending',       short: 'CDRF',       icon: <ClipboardCheck size={14} />, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-700', ring: 'ring-orange-300' },
  { key: 'DESIGN_REVIEW',      label: 'Design Review',      short: 'Design',     icon: <Palette size={14} />,      color: 'text-indigo-600',   bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-300 dark:border-indigo-700', ring: 'ring-indigo-300' },
  { key: 'COMPLETED',          label: 'Completed',           short: 'Done',       icon: <CheckCircle2 size={14} />, color: 'text-emerald-600',  bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-700', ring: 'ring-emerald-300' },
];

const SERVICE_LABELS: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Arch. Consultation',
  INTERIOR_DESIGN:            'Interior Design',
  PMC:                        'PMC',
  TURNKEY_CONSTRUCTION:       'Turnkey',
  INTERIOR_EXECUTION:         'Int. Execution',
  RENOVATION:                 'Renovation',
  END_TO_END_SOLUTION:        'End-to-End',
};

const ITEMS_PER_PAGE = 15;

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = PIPELINE_STAGES.find(p => p.key === status);
  if (!s) return <span className="text-[10px] text-stone-400">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.color} ${s.bg} ${s.border}`}>
      {s.icon && <span className="scale-75">{s.icon}</span>}
      {s.short}
    </span>
  );
}

// ─── Assignment Modal ─────────────────────────────────────────────────────────
interface AssignModalProps {
  project: Project;
  assignableUsers: AssignableUser[];
  onClose: () => void;
  onAssigned: () => void;
}

function AssignModal({ project, assignableUsers, onClose, onAssigned }: AssignModalProps) {
  const { showToast } = useToast();
  const [pmId, setPmId] = useState(project.assignment?.projectManager.id ?? '');
  const [archId, setArchId] = useState(project.assignment?.projectArchitect.id ?? '');
  const [juniorId, setJuniorId] = useState(project.assignment?.juniorArchitect?.id ?? '');
  const [notes, setNotes] = useState(project.assignment?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);

  const byRole = (roleName: string) => assignableUsers.filter(u => u.role.name === roleName);
  const pms        = byRole('Project Manager');
  const architects = byRole('Project Architect');
  const juniors    = byRole('Junior Architect');

  const handleSubmit = async () => {
    if (!pmId || !archId) {
      showToast('Project Manager and Project Architect are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await projectApi.assignTeam(project.id, {
        projectManagerId: pmId,
        projectArchitectId: archId,
        juniorArchitectId: juniorId || null,
        notes: notes.trim() || undefined,
      });
      showToast('Team assigned successfully.', 'success');
      onAssigned();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to assign team.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`${card} w-full max-w-lg`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(184,144,71,0.12)] text-[#b89047]">
              <UserCheck size={16} />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[var(--text-primary)]">Assign Project Team</p>
              <p className="text-[11px] text-[var(--text-muted)]">{project.prospect.client.clientName} · {SERVICE_LABELS[project.prospect.serviceType] ?? project.prospect.serviceType}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer border-0 bg-transparent p-1">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {[
            { label: 'Project Manager', key: 'pm', required: true, value: pmId, setter: setPmId, options: pms },
            { label: 'Project Architect', key: 'arch', required: true, value: archId, setter: setArchId, options: architects },
            { label: 'Junior Architect', key: 'jr', required: false, value: juniorId, setter: setJuniorId, options: juniors },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                {f.label} {f.required ? <span className="text-rose-500">*</span> : <span className="text-stone-400">(optional)</span>}
              </label>
              <select value={f.value} onChange={e => f.setter(e.target.value)} className={inputBase}>
                <option value="">{f.required ? `— Select ${f.label} —` : '— None —'}</option>
                {f.options.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                {f.options.length === 0 && <option disabled>No {f.label}s available</option>}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
              Assignment Notes <span className="text-stone-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special instructions or context…"
              className={`${inputBase} resize-none`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 px-5 py-3 border-t border-[var(--border)]">
          <button onClick={onClose} className={btnSecondary} disabled={submitting}>Cancel</button>
          <button onClick={handleSubmit} className={btnPrimary} disabled={submitting || !pmId || !archId}>
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
            {project.assignment ? 'Re-assign Team' : 'Assign Team'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Pipeline bar ─────────────────────────────────────────────────────────────
function PipelineBar({ statusCounts, filterStatus, onFilter }: {
  statusCounts: Record<string, number>;
  filterStatus: string;
  onFilter: (s: string) => void;
}) {
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Project Pipeline</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{total} project{total !== 1 ? 's' : ''} across all stages</p>
        </div>
        {filterStatus && (
          <button onClick={() => onFilter('')} className="text-[10px] text-[#b89047] hover:underline font-semibold cursor-pointer border-0 bg-transparent">
            Clear filter
          </button>
        )}
      </div>

      {/* Progress track */}
      {total > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden mb-4 gap-px">
          {PIPELINE_STAGES.map(s => {
            const count = statusCounts[s.key] ?? 0;
            if (count === 0) return null;
            const pct = (count / total) * 100;
            const colorMap: Record<string, string> = {
              PENDING_ASSIGNMENT: 'bg-amber-400',
              ASSIGNED:           'bg-blue-400',
              SITE_VERIFICATION:  'bg-purple-400',
              CDRF_PENDING:       'bg-orange-400',
              DESIGN_REVIEW:      'bg-indigo-400',
              COMPLETED:          'bg-emerald-400',
            };
            return <div key={s.key} className={`${colorMap[s.key]} transition-all`} style={{ width: `${pct}%` }} />;
          })}
        </div>
      )}

      {/* Stage cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {PIPELINE_STAGES.map((s, idx) => {
          const count = statusCounts[s.key] ?? 0;
          const isActive = filterStatus === s.key;
          const isLast = idx === PIPELINE_STAGES.length - 1;
          return (
            <button
              key={s.key}
              onClick={() => onFilter(isActive ? '' : s.key)}
              className={[
                'relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all cursor-pointer text-center',
                isActive
                  ? `${s.bg} ${s.border} ring-2 ${s.ring} ring-offset-1`
                  : 'bg-[var(--card-bg)] border-[var(--border)] hover:border-[#b89047]/40 hover:bg-[rgba(184,144,71,0.04)]',
              ].join(' ')}
            >
              {/* Connector arrow for non-last */}
              {!isLast && (
                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 z-10 text-stone-300 dark:text-stone-600 hidden md:block">
                  <ArrowRight size={10} />
                </div>
              )}
              <div className={`p-1.5 rounded-lg ${s.bg} ${s.color}`}>
                {s.icon}
              </div>
              <span className={`text-[18px] font-black leading-none ${count > 0 ? s.color : 'text-[var(--text-muted)]'}`}>
                {count}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)] leading-tight">
                {s.short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Project row card ─────────────────────────────────────────────────────────
function ProjectRow({ project, isAdmin, onAssign, onClick }: {
  project: Project;
  isAdmin: boolean;
  onAssign: () => void;
  onClick: () => void;
}) {
  const a = project.assignment;
  const c = project.prospect.client;
  const stage = PIPELINE_STAGES.find(s => s.key === project.status);

  return (
    <div
      onClick={onClick}
      className="group flex items-start gap-3 px-4 py-3.5 border-b border-[var(--border)] hover:bg-[rgba(184,144,71,0.04)] transition-colors cursor-pointer last:border-0"
    >
      {/* Stage indicator dot */}
      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${stage?.bg ?? ''} border-2 ${stage?.border ?? 'border-stone-300'}`} />

      {/* Client info */}
      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-1">
        {/* Name + service */}
        <div className="md:col-span-1">
          <p className="text-[13px] font-bold text-[var(--text-primary)] truncate group-hover:text-[#b89047] transition-colors">
            {c.clientName}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
            {SERVICE_LABELS[project.prospect.serviceType] ?? project.prospect.serviceType}
            {project.prospect.initialPaymentAmount ? (
              <span className="ml-1.5 text-emerald-600 font-semibold">
                ₹{project.prospect.initialPaymentAmount} {project.prospect.initialPaymentUnit}
              </span>
            ) : null}
          </p>
        </div>

        {/* Contact */}
        <div className="md:col-span-1 hidden md:flex flex-col justify-center gap-0.5">
          <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
            <Phone size={9} className="text-[var(--text-muted)]" /> {c.mobileNo}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <MapPin size={9} /> {c.locality}{c.state ? `, ${c.state}` : ''}
          </p>
        </div>

        {/* Team */}
        <div className="md:col-span-1 hidden md:flex flex-col justify-center">
          {a ? (
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1">
                <Users size={9} className="text-[#b89047]" />
                {a.projectManager.name}
                <span className="text-[9px] text-[var(--text-muted)] font-normal">(PM)</span>
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                {a.projectArchitect.name}
                <span className="text-[9px] ml-1">(Arch)</span>
                {a.siteEngineer && (
                  <span className="ml-1">· {a.siteEngineer.name} <span className="text-[9px]">(SE)</span></span>
                )}
              </p>
            </div>
          ) : (
            <span className="text-[10px] text-amber-600 font-semibold">⚠ Not assigned</span>
          )}
        </div>

        {/* Status + action */}
        <div className="md:col-span-1 flex items-center justify-between md:justify-end gap-2">
          <StatusBadge status={project.status} />
          {isAdmin && (
            <button
              onClick={e => { e.stopPropagation(); onAssign(); }}
              className="hidden group-hover:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] border-0 cursor-pointer transition-all hover:shadow-sm"
            >
              <UserCheck size={9} />
              {a ? 'Re-assign' : 'Assign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export const ProjectsDashboard: React.FC<Props> = ({ currentUser }) => {
  const { showToast } = useToast();
  const { navigate } = useRouter();
  const isAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isPM    = currentUser.role === 'Project Manager';

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [assignTarget, setAssignTarget] = useState<Project | null>(null);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getProjects({
        status: filterStatus || undefined,
        search: search.trim() || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setProjects(res.data.projects ?? []);
      setTotal(res.data.pagination?.total ?? 0);
      setStatusCounts(res.data.statusCounts ?? {});
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to load projects.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search, page, showToast]);

  const fetchAssignableUsers = useCallback(async () => {
    if (!isAdmin && !isPM) return;
    try {
      const res = await projectApi.getAssignableUsers();
      setAssignableUsers(res.data.users ?? []);
    } catch { /* non-critical */ }
  }, [isAdmin, isPM]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchAssignableUsers(); }, [fetchAssignableUsers]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchProjects(); };

  const totalAll      = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const pendingCount  = statusCounts['PENDING_ASSIGNMENT'] ?? 0;
  const activeCount   = (statusCounts['ASSIGNED'] ?? 0) + (statusCounts['SITE_VERIFICATION'] ?? 0) + (statusCounts['CDRF_PENDING'] ?? 0) + (statusCounts['DESIGN_REVIEW'] ?? 0);
  const completedCount = statusCounts['COMPLETED'] ?? 0;

  const handlePipelineFilter = (s: string) => {
    setFilterStatus(s);
    setPage(1);
  };

  return (
    <div className="flex flex-col h-full gap-3 p-3 overflow-y-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[rgba(184,144,71,0.12)] text-[#b89047]">
              <HardHat size={16} />
            </div>
            <h1 className="text-[15px] font-bold text-[var(--text-primary)]">Projects</h1>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 ml-9">Post-sales project lifecycle — assignment, site verification, design & delivery</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          {
            label: 'Total Projects', value: totalAll,
            icon: <HardHat size={15} />,
            accent: 'from-[#b89047] to-[#9e7735]',
            sub: `${activeCount} active`,
          },
          {
            label: 'Pending Assignment', value: pendingCount,
            icon: <Clock size={15} />,
            accent: 'from-amber-500 to-amber-600',
            sub: pendingCount > 0 ? 'Needs attention' : 'All assigned',
            urgent: pendingCount > 0,
          },
          {
            label: 'Active Projects', value: activeCount,
            icon: <Building2 size={15} />,
            accent: 'from-blue-500 to-blue-600',
            sub: `${statusCounts['SITE_VERIFICATION'] ?? 0} on-site`,
          },
          {
            label: 'Completed', value: completedCount,
            icon: <CheckCircle2 size={15} />,
            accent: 'from-emerald-500 to-emerald-600',
            sub: totalAll > 0 ? `${Math.round((completedCount / totalAll) * 100)}% rate` : '—',
          },
        ].map(s => (
          <div key={s.label} className={`${card} p-4 relative overflow-hidden`}>
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.accent}`} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{s.label}</p>
                <p className="text-[28px] font-black text-[var(--text-primary)] leading-tight mt-0.5">{s.value}</p>
                <p className={`text-[10px] mt-1 font-medium ${s.urgent ? 'text-amber-600' : 'text-[var(--text-muted)]'}`}>
                  {s.urgent ? '⚠ ' : ''}{s.sub}
                </p>
              </div>
              <div className={`p-2 rounded-xl bg-gradient-to-br ${s.accent} text-white shadow-sm`}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Urgent notice ── */}
      {(isAdmin || isPM) && pendingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <AlertCircle size={15} className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-[12px] font-bold text-amber-800 dark:text-amber-300">
              {pendingCount} project{pendingCount > 1 ? 's' : ''} awaiting team assignment
            </p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
              Click <strong>Pending</strong> in the pipeline below to filter and assign teams.
            </p>
          </div>
          <button
            onClick={() => handlePipelineFilter('PENDING_ASSIGNMENT')}
            className="shrink-0 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition cursor-pointer bg-transparent"
          >
            View Pending
          </button>
        </div>
      )}

      {/* ── Pipeline bar ── */}
      <PipelineBar
        statusCounts={statusCounts}
        filterStatus={filterStatus}
        onFilter={handlePipelineFilter}
      />

      {/* ── Filters ── */}
      <div className={`${card} px-4 py-3`}>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by client name or location…"
              className={`${inputBase} pl-8`}
            />
          </div>
          <button type="submit" className={btnSecondary}>
            <Search size={12} /> Search
          </button>
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterStatus(''); setPage(1); }}
            className={btnSecondary}
          >
            <RefreshCw size={12} /> Reset
          </button>
        </form>
        {filterStatus && (
          <p className="text-[10px] text-[var(--text-muted)] mt-2">
            Showing: <span className="text-[#b89047] font-semibold">{PIPELINE_STAGES.find(s => s.key === filterStatus)?.label}</span>
          </p>
        )}
      </div>

      {/* ── Project list ── */}
      <div className={`${card} flex flex-col`}>
        {/* List header */}
        <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--card-bg)] rounded-t-xl">
          {['Client / Service', 'Contact & Location', 'Team', 'Status'].map(h => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{h}</p>
          ))}
        </div>

        <div>
          {loading ? (
            <div className="p-4"><ShimmerTable rows={8} cols={4} /></div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 gap-4 text-[var(--text-muted)]">
              <div className="p-4 rounded-2xl bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.12)]">
                <HardHat size={32} className="text-[#b89047]/40" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
                  {filterStatus || search ? 'No projects match your filter' : 'No projects yet'}
                </p>
                <p className="text-[11px] mt-1">
                  {filterStatus || search
                    ? 'Try clearing filters to see all projects'
                    : 'Projects will appear here once a prospect is marked as Won'}
                </p>
              </div>
              {(filterStatus || search) && (
                <button
                  onClick={() => { setSearch(''); setFilterStatus(''); setPage(1); }}
                  className={btnSecondary}
                >
                  <RefreshCw size={12} /> Clear Filters
                </button>
              )}
            </div>
          ) : (
            projects.map(p => (
              <ProjectRow
                key={p.id}
                project={p}
                isAdmin={isAdmin}
                onAssign={() => setAssignTarget(p)}
                onClick={() => navigate(`/projects/${p.id}`)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)] shrink-0">
            <span>{total} total · page {page} of {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={btnSecondary + ' py-1 px-2'}>
                <ChevronLeft size={12} />
              </button>
              <span className="px-2 font-semibold text-[var(--text-primary)]">{page}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={btnSecondary + ' py-1 px-2'}>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {assignTarget && (
        <AssignModal
          project={assignTarget}
          assignableUsers={assignableUsers}
          onClose={() => setAssignTarget(null)}
          onAssigned={fetchProjects}
        />
      )}
    </div>
  );
};
