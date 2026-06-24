import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { projectApi, BACKEND_BASE } from '../services/api.js';
import type { User } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useRouter } from '../context/RouterContext.js';
import { CDRFEditor } from '../components/CDRFEditor.js';
import { ShimmerTable } from '../components/Shimmer.js';
import {
  ChevronLeft, ClipboardCheck, CalendarDays, FileText,
  Upload, CheckCircle2, XCircle, Loader2, X, Plus,
  Send, Eye, SquarePen, Building2, AlertTriangle,
  MapPin, HardHat, Users, Clock, Palette, Check, Lock,
  Trash2, MessageSquare, Download, ImageIcon,
} from 'lucide-react';

interface Props { currentUser: User; projectId: string; }

// ─── Style helpers ────────────────────────────────────────────────────────────
const card = 'bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xs';
const inputBase = 'w-full bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-1.5 outline-none transition focus:border-[#b89047] focus:ring-2 focus:ring-[rgba(184,144,71,0.2)] font-[inherit]';
const btnPrimary = 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0';
const btnSecondary = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--card-bg)] border border-[var(--border)] hover:border-[#b89047] hover:text-[#b89047] transition-all duration-200 cursor-pointer disabled:opacity-50';
const btnDanger = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all duration-200 cursor-pointer disabled:opacity-50';
const label = 'block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1';

const SERVICE_LABELS: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Arch. Consultation',
  INTERIOR_DESIGN:            'Interior Design',
  PMC:                        'PMC',
  TURNKEY_CONSTRUCTION:       'Turnkey Construction',
  INTERIOR_EXECUTION:         'Interior Execution',
  RENOVATION:                 'Renovation',
  END_TO_END_SOLUTION:        'End-to-End',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING_ASSIGNMENT: 'text-amber-700 bg-amber-50 border-amber-200',
  ASSIGNED:           'text-blue-700 bg-blue-50 border-blue-200',
  SITE_VERIFICATION:  'text-purple-700 bg-purple-50 border-purple-200',
  CDRF_PENDING:       'text-orange-700 bg-orange-50 border-orange-200',
  DESIGN_REVIEW:      'text-indigo-700 bg-indigo-50 border-indigo-200',
  LAYOUT_APPROVED:    'text-teal-700 bg-teal-50 border-teal-200',
  DESIGN_IN_PROGRESS: 'text-sky-700 bg-sky-50 border-sky-200',
  COMPLETED:          'text-emerald-700 bg-emerald-50 border-emerald-200',
};

type TabId = 'overview' | 'site' | 'cdrf-meetings' | 'cdrf-form' | 'design' | 'pipeline' | 'transmittals';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',      label: 'Overview',          icon: <Building2 size={13} /> },
  { id: 'site',          label: 'Site Verification',  icon: <MapPin size={13} /> },
  { id: 'cdrf-meetings', label: 'Client Meetings',     icon: <CalendarDays size={13} /> },
  { id: 'cdrf-form',     label: 'Client Brief',        icon: <ClipboardCheck size={13} /> },
  { id: 'design',        label: 'Layout & Approval',  icon: <Upload size={13} /> },
  { id: 'pipeline',      label: 'Design Pipeline',    icon: <FileText size={13} /> },
  { id: 'transmittals',  label: 'Transmittals',       icon: <Send size={13} /> },
];

// ─── Tab unlock gate — each tab requires this status or later ─────────────────
const STATUS_ORDER = [
  'PENDING_ASSIGNMENT', 'ASSIGNED', 'SITE_VERIFICATION', 'CDRF_PENDING',
  'DESIGN_REVIEW', 'LAYOUT_APPROVED', 'DESIGN_IN_PROGRESS', 'COMPLETED',
] as const;

const TAB_MIN_STATUS: Record<TabId, string> = {
  overview:        'PENDING_ASSIGNMENT',
  site:            'ASSIGNED',
  'cdrf-meetings': 'ASSIGNED',
  'cdrf-form':     'CDRF_PENDING',
  design:          'DESIGN_REVIEW',
  pipeline:        'LAYOUT_APPROVED',
  transmittals:    'DESIGN_IN_PROGRESS',
};

// ─── Project pipeline stages ──────────────────────────────────────────────────
const PROJECT_PIPELINE = [
  { key: 'PENDING_ASSIGNMENT', label: 'Pending',        icon: <Clock size={11} /> },
  { key: 'ASSIGNED',           label: 'Team Assigned',  icon: <Users size={11} /> },
  { key: 'SITE_VERIFICATION',  label: 'Site Check',     icon: <MapPin size={11} /> },
  { key: 'CDRF_PENDING',       label: 'CDRF',           icon: <ClipboardCheck size={11} /> },
  { key: 'DESIGN_REVIEW',      label: 'Layout Review',  icon: <Palette size={11} /> },
  { key: 'LAYOUT_APPROVED',    label: 'Layout OK',      icon: <CheckCircle2 size={11} /> },
  { key: 'DESIGN_IN_PROGRESS', label: 'Drawings',       icon: <FileText size={11} /> },
  { key: 'COMPLETED',          label: 'Completed',      icon: <CheckCircle2 size={11} /> },
];

function ProjectPipelineStepper({ status }: { status: string }) {
  const activeIdx = PROJECT_PIPELINE.findIndex(s => s.key === status);
  return (
    <div className="bg-stone-50/40 dark:bg-white/[0.02] border border-[var(--border)] rounded-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3">Project Pipeline</p>
      <div className="flex items-center gap-0">
        {PROJECT_PIPELINE.map((step, idx) => {
          const isDone    = idx < activeIdx;
          const isActive  = idx === activeIdx;
          const isUpcoming = idx > activeIdx;
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

// ─── Small modal shell ────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
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

// ─── Shared: client contact header ────────────────────────────────────────────
function ClientContactBanner({ client, prospect }: { client: any; prospect: any }) {
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

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ project, currentUser, onRefresh }: { project: any; currentUser: User; onRefresh: () => void }) {
  const { showToast } = useToast();
  const [showAssignEngineer, setShowAssignEngineer] = useState(false);
  const [engineerId, setEngineerId] = useState('');
  const [siteEngineers, setSiteEngineers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin      = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isPM         = project.assignment?.projectManager?.id === currentUser.id;
  const isCompleted  = project.status === 'COMPLETED';

  useEffect(() => {
    if (showAssignEngineer) {
      projectApi.getAssignableUsers().then(r => {
        setSiteEngineers((r.data.users ?? []).filter((u: any) => u.role.name === 'Site Engineer'));
      }).catch(() => {});
    }
  }, [showAssignEngineer]);

  const handleAssignEngineer = async () => {
    if (!engineerId) return;
    setSubmitting(true);
    try {
      await projectApi.assignSiteEngineer(project.id, engineerId);
      showToast('Site engineer assigned.', 'success');
      setShowAssignEngineer(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed.', 'error');
    } finally { setSubmitting(false); }
  };

  const a = project.assignment;
  const p = project.prospect;
  const c = p?.client;

  const infoRows = [
    { label: 'Client',    value: c?.clientName },
    { label: 'Mobile',    value: c?.mobileNo ? <a href={`tel:${c.mobileNo}`} className="hover:text-[#b89047] transition-colors">{c.mobileNo}</a> : null },
    { label: 'Email',     value: c?.email ? <a href={`mailto:${c.email}`} className="hover:text-[#b89047] transition-colors">{c.email}</a> : null },
    { label: 'Service',   value: p?.serviceType ? p.serviceType.split(',').map((s: string) => SERVICE_LABELS[s.trim()] ?? s.trim()).join(', ') : null },
    { label: 'Location',  value: [c?.locality, c?.city, c?.state].filter(Boolean).join(', ') || null },
    { label: 'Payment',   value: p?.initialPaymentAmount ? <span className="font-bold text-emerald-600">₹{p.initialPaymentAmount} {p.initialPaymentUnit}</span> : null },
    { label: 'Plot Area', value: p?.plotArea ? `${p.plotArea} sq.ft` : null },
    { label: 'Budget',    value: p?.budget ? `₹${p.budget}` : null },
  ].filter(r => r.value);

  return (
    <div className="space-y-3">
      {/* Pipeline stepper */}
      <ProjectPipelineStepper status={project.status} />

      {/* Completed notice */}
      {isCompleted && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={14} />
          Project completed — all stages read-only.
        </div>
      )}

      {/* Client & project info */}
      <div className={`${card} p-4`}>
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3 pb-2 border-b border-[var(--border)]">Client & Project Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-[12.5px]">
          {infoRows.map(r => (
            <div key={r.label} className="flex gap-1.5">
              <span className="text-[var(--text-muted)] font-medium shrink-0 min-w-[62px]">{r.label}:</span>
              <span className="font-semibold text-[var(--text-primary)]">{r.value}</span>
            </div>
          ))}
          <div className="flex gap-1.5">
            <span className="text-[var(--text-muted)] font-medium shrink-0 min-w-[62px]">Status:</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[project.status] ?? 'text-stone-600 bg-stone-50 border-stone-200'}`}>
              {project.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        {p?.notes && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">Prospect Notes</p>
            <p className="text-[12px] text-[var(--text-secondary)]">{p.notes}</p>
          </div>
        )}
      </div>

      {/* Team */}
      <div className={`${card} p-4`}>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border)]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Project Team</p>
          {(isSuperAdmin || isPM) && !isCompleted && !a?.siteEngineer && a && (
            <button onClick={() => setShowAssignEngineer(true)} className={btnSecondary}>
              <Plus size={11} /> Assign Site Engineer
            </button>
          )}
        </div>
        {a ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { role: 'Project Manager',   user: a.projectManager },
              { role: 'Project Architect', user: a.projectArchitect },
              a.juniorArchitect && { role: 'Junior Architect', user: a.juniorArchitect },
              a.siteEngineer    && { role: 'Site Engineer',    user: a.siteEngineer },
            ] as any[]).filter(Boolean).map((t: any) => (
              <div key={t.role} className="flex items-center gap-3 p-2.5 bg-[var(--bg-secondary,rgba(0,0,0,0.02))] rounded-lg border border-[var(--border)]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b89047] to-[#7c5e2a] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                  {t.user.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-[var(--text-primary)] truncate">{t.user.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-amber-600">Team not yet assigned.</p>
        )}
        {a?.notes && <p className="text-[11px] text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border)]">{a.notes}</p>}
      </div>

      {/* Assign site engineer modal */}
      {showAssignEngineer && (
        <Modal title="Assign Site Engineer" onClose={() => setShowAssignEngineer(false)}>
          <div className="p-5 space-y-4">
            <div>
              <label className={label}>Site Engineer <span className="text-rose-500">*</span></label>
              <select value={engineerId} onChange={e => setEngineerId(e.target.value)} className={inputBase}>
                <option value="">— Select —</option>
                {siteEngineers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                {siteEngineers.length === 0 && <option disabled>No site engineers available</option>}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAssignEngineer(false)} className={btnSecondary}>Cancel</button>
              <button onClick={handleAssignEngineer} disabled={!engineerId || submitting} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <HardHat size={12} />} Assign
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Site Verification Tab ────────────────────────────────────────────────────
function SiteTab({ project, currentUser, onRefresh }: { project: any; currentUser: User; onRefresh: () => void }) {
  const { showToast } = useToast();
  const [sv, setSv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isCompleted  = project.status === 'COMPLETED';
  const isAdmin      = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isPM         = project.assignment?.projectManager?.id === currentUser.id;
  const isSiteEngineer = project.assignment?.siteEngineer?.id === currentUser.id;
  const canEdit   = !isCompleted && (isSuperAdmin || isSiteEngineer);
  const canReview = !isCompleted && (isSuperAdmin || isPM);

  const [form, setForm] = useState({
    length: '', width: '', unit: 'FEET', facingDirection: '',
    borewellExists: false, borewellLat: '', borewellLng: '',
    wallExists: false, wallNotes: '',
    manholeExists: false, manholeNotes: '',
    additionalNotes: '',
    roadLevels: [] as { description: string; level: string }[],
    fileUrls: [] as { url: string; name: string }[],
  });

  const fetchSv = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getSiteVerification(project.id);
      const data = res.data.siteVerification;
      setSv(data);
      if (data) {
        setForm({
          length: data.length?.toString() ?? '',
          width: data.width?.toString() ?? '',
          unit: data.unit ?? 'FEET',
          facingDirection: data.facingDirection ?? '',
          borewellExists: !!data.borewellExists,
          borewellLat: data.borewellLat ?? '',
          borewellLng: data.borewellLng ?? '',
          wallExists: !!data.wallExists,
          wallNotes: data.wallNotes ?? '',
          manholeExists: !!data.manholeExists,
          manholeNotes: data.manholeNotes ?? '',
          additionalNotes: data.additionalNotes ?? '',
          roadLevels: data.roadLevels ?? [],
          fileUrls: data.fileUrls ?? [],
        });
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { fetchSv(); }, [fetchSv]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await projectApi.submitSiteVerification(project.id, {
        ...form,
        length: form.length ? parseFloat(form.length) : null,
        width: form.width ? parseFloat(form.width) : null,
      });
      showToast('Site verification saved.', 'success');
      setEditing(false);
      fetchSv();
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to save.', 'error');
    } finally { setSubmitting(false); }
  };

  const handleReview = async () => {
    setSubmitting(true);
    try {
      await projectApi.reviewSiteVerification(project.id);
      showToast('Site verification marked as reviewed.', 'success');
      fetchSv();
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed.', 'error');
    } finally { setSubmitting(false); }
  };

  const addRoadLevel = () => setForm(f => ({ ...f, roadLevels: [...f.roadLevels, { description: '', level: '' }] }));
  const updateRoadLevel = (i: number, key: 'description' | 'level', val: string) =>
    setForm(f => ({ ...f, roadLevels: f.roadLevels.map((r, idx) => idx === i ? { ...r, [key]: val } : r) }));
  const removeRoadLevel = (i: number) =>
    setForm(f => ({ ...f, roadLevels: f.roadLevels.filter((_, idx) => idx !== i) }));

  if (loading) return <div className="p-4"><ShimmerTable rows={5} cols={3} /></div>;

  if (!project.assignment?.siteEngineer && !sv) {
    return (
      <div className="space-y-3">
        <ClientContactBanner client={project.prospect?.client} prospect={project.prospect} />
        <div className={`${card} p-6 text-center`}>
          <HardHat size={28} className="mx-auto text-[var(--text-muted)] opacity-30 mb-2" />
          <p className="text-[12px] text-[var(--text-muted)]">Assign a Site Engineer first to begin site verification.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Client contact strip */}
      <ClientContactBanner client={project.prospect?.client} prospect={project.prospect} />

      <div className="flex items-center justify-between">
        {sv && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${sv.status === 'REVIEWED' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
            {sv.status}
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className={btnSecondary}><SquarePen size={11} /> {sv ? 'Edit' : 'Fill Form'}</button>
          )}
          {canReview && sv && sv.status === 'SUBMITTED' && (
            <button onClick={handleReview} disabled={submitting} className={btnPrimary}>
              {submitting ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Mark Reviewed
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className={`${card} p-4 space-y-4`}>
          {/* Dimensions */}
          <div className="grid grid-cols-3 gap-3">
            <div><label className={label}>Length</label><input type="number" className={inputBase} value={form.length} onChange={e => setForm(f => ({ ...f, length: e.target.value }))} placeholder="e.g. 40" /></div>
            <div><label className={label}>Width</label><input type="number" className={inputBase} value={form.width} onChange={e => setForm(f => ({ ...f, width: e.target.value }))} placeholder="e.g. 60" /></div>
            <div>
              <label className={label}>Unit</label>
              <select className={inputBase} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="FEET">Feet</option>
                <option value="METERS">Meters</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Facing Direction</label>
            <select className={inputBase} value={form.facingDirection} onChange={e => setForm(f => ({ ...f, facingDirection: e.target.value }))}>
              <option value="">— Select —</option>
              {['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Road levels */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={label}>Road Level Info</label>
              <button onClick={addRoadLevel} className={btnSecondary}><Plus size={10} /> Add Row</button>
            </div>
            {form.roadLevels.map((r, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <input className={inputBase} placeholder="Description" value={r.description} onChange={e => updateRoadLevel(i, 'description', e.target.value)} />
                <input className={`${inputBase} w-28`} placeholder="Level (±m)" value={r.level} onChange={e => updateRoadLevel(i, 'level', e.target.value)} />
                <button onClick={() => removeRoadLevel(i)} className="text-rose-500 hover:text-rose-700 cursor-pointer border-0 bg-transparent px-1"><X size={13} /></button>
              </div>
            ))}
            {form.roadLevels.length === 0 && <p className="text-[11px] text-[var(--text-muted)]">No road levels added.</p>}
          </div>

          {/* Borewell */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.borewellExists} onChange={e => setForm(f => ({ ...f, borewellExists: e.target.checked }))} className="accent-amber-600" />
              <span className="text-[12px] font-medium text-[var(--text-primary)]">Borewell exists</span>
            </label>
            {form.borewellExists && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div><label className={label}>Lat</label><input className={inputBase} value={form.borewellLat} onChange={e => setForm(f => ({ ...f, borewellLat: e.target.value }))} placeholder="Latitude" /></div>
                <div><label className={label}>Lng</label><input className={inputBase} value={form.borewellLng} onChange={e => setForm(f => ({ ...f, borewellLng: e.target.value }))} placeholder="Longitude" /></div>
              </div>
            )}
          </div>

          {/* Wall */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.wallExists} onChange={e => setForm(f => ({ ...f, wallExists: e.target.checked }))} className="accent-amber-600" />
              <span className="text-[12px] font-medium text-[var(--text-primary)]">Existing wall present</span>
            </label>
            {form.wallExists && (
              <textarea className={`${inputBase} mt-2 resize-none`} rows={2} value={form.wallNotes} onChange={e => setForm(f => ({ ...f, wallNotes: e.target.value }))} placeholder="Wall notes…" />
            )}
          </div>

          {/* Manhole */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.manholeExists} onChange={e => setForm(f => ({ ...f, manholeExists: e.target.checked }))} className="accent-amber-600" />
              <span className="text-[12px] font-medium text-[var(--text-primary)]">Manhole present</span>
            </label>
            {form.manholeExists && (
              <textarea className={`${inputBase} mt-2 resize-none`} rows={2} value={form.manholeNotes} onChange={e => setForm(f => ({ ...f, manholeNotes: e.target.value }))} placeholder="Manhole notes…" />
            )}
          </div>

          <div>
            <label className={label}>Additional Notes</label>
            <textarea className={`${inputBase} resize-none`} rows={3} value={form.additionalNotes} onChange={e => setForm(f => ({ ...f, additionalNotes: e.target.value }))} placeholder="Any other observations…" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button onClick={() => setEditing(false)} className={btnSecondary}>Cancel</button>
            <button onClick={handleSave} disabled={submitting} className={btnPrimary}>
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Save
            </button>
          </div>
        </div>
      ) : sv ? (
        <div className={`${card} p-4 space-y-4`}>
          {/* Core measurements */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2.5 pb-1.5 border-b border-[var(--border)]">Site Measurements</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-[12.5px]">
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold mb-0.5">Plot Dimensions</p>
                <p className="font-bold text-[var(--text-primary)]">{sv.length} × {sv.width} <span className="text-[11px] font-normal text-[var(--text-muted)]">{sv.unit}</span></p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold mb-0.5">Facing Direction</p>
                <p className="font-bold text-[var(--text-primary)]">{sv.facingDirection || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold mb-0.5">Submitted By</p>
                <p className="font-semibold text-[var(--text-primary)]">{sv.submittedBy?.name ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Site features */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2.5 pb-1.5 border-b border-[var(--border)]">Site Features</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12.5px]">
              <div className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${sv.borewellExists ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'border-[var(--border)]'}`}>
                <span className={`mt-0.5 text-[11px] font-black ${sv.borewellExists ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>{sv.borewellExists ? '✓' : '✗'}</span>
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-primary)]">Borewell</p>
                  {sv.borewellExists && sv.borewellLat && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sv.borewellLat}, {sv.borewellLng}</p>}
                </div>
              </div>
              <div className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${sv.wallExists ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'border-[var(--border)]'}`}>
                <span className={`mt-0.5 text-[11px] font-black ${sv.wallExists ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>{sv.wallExists ? '✓' : '✗'}</span>
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-primary)]">Existing Wall</p>
                  {sv.wallExists && sv.wallNotes && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sv.wallNotes}</p>}
                </div>
              </div>
              <div className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${sv.manholeExists ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'border-[var(--border)]'}`}>
                <span className={`mt-0.5 text-[11px] font-black ${sv.manholeExists ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>{sv.manholeExists ? '✓' : '✗'}</span>
                <div>
                  <p className="text-[11px] font-bold text-[var(--text-primary)]">Manhole</p>
                  {sv.manholeExists && sv.manholeNotes && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sv.manholeNotes}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Road levels */}
          {sv.roadLevels?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2.5 pb-1.5 border-b border-[var(--border)]">Road Level Data</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sv.roadLevels.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--border)]/30 border border-[var(--border)] text-[12px]">
                    <span className="text-[var(--text-secondary)]">{r.description || `Road ${i + 1}`}</span>
                    <span className="font-bold text-[var(--text-primary)]">{r.level}{!r.level?.toString().includes('m') ? 'm' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional notes */}
          {sv.additionalNotes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1.5 pb-1.5 border-b border-[var(--border)]">Additional Notes</p>
              <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">{sv.additionalNotes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className={`${card} p-6 text-center`}>
          <p className="text-[12px] text-[var(--text-muted)]">Site verification form not submitted yet.</p>
          {canEdit && <button onClick={() => setEditing(true)} className={`${btnPrimary} mt-3`}><Plus size={12} /> Fill Form</button>}
        </div>
      )}
    </div>
  );
}

// ─── CDRF Meetings Tab ────────────────────────────────────────────────────────
function CdrfMeetingsTab({ project, currentUser }: { project: any; currentUser: User }) {
  const { showToast } = useToast();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const isPM         = project.assignment?.projectManager?.id === currentUser.id;
  const isAdmin      = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isCompleted  = project.status === 'COMPLETED';
  const canManage    = !isCompleted && (isPM || isSuperAdmin);

  const [meetForm, setMeetForm] = useState({ meetingType: 'OFFLINE', scheduledAt: '', notes: '', meetingLink: '' });
  const [fuForm, setFuForm] = useState({ type: 'GENERAL_NOTE', notes: '', meetingId: '' });
  const [updateForm, setUpdateForm] = useState({ status: '', clientPresent: false, notes: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, fRes] = await Promise.all([
        projectApi.getCdrfMeetings(project.id),
        projectApi.getCdrfFollowUps(project.id),
      ]);
      setMeetings(mRes.data.meetings ?? []);
      setFollowUps(fRes.data.logs ?? []);
    } catch { } finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateMeeting = async () => {
    if (!meetForm.scheduledAt) { showToast('Date/time is required.', 'error'); return; }
    setSubmitting(true);
    try {
      await projectApi.createCdrfMeeting(project.id, meetForm);
      showToast('Meeting created.', 'success');
      setShowCreate(false);
      setMeetForm({ meetingType: 'OFFLINE', scheduledAt: '', notes: '', meetingLink: '' });
      fetchData();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleUpdateMeeting = async (meetingId: string) => {
    setSubmitting(true);
    try {
      await projectApi.updateCdrfMeeting(project.id, meetingId, updateForm);
      showToast('Meeting updated.', 'success');
      setSelectedMeeting(null);
      fetchData();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleLogFollowUp = async () => {
    if (!fuForm.notes.trim()) { showToast('Notes are required.', 'error'); return; }
    setSubmitting(true);
    try {
      await projectApi.logCdrfFollowUp(project.id, fuForm);
      showToast('Follow-up logged.', 'success');
      setShowFollowUp(false);
      setFuForm({ type: 'GENERAL_NOTE', notes: '', meetingId: '' });
      fetchData();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: 'text-blue-700 bg-blue-50 border-blue-200',
    COMPLETED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    MISSED: 'text-rose-700 bg-rose-50 border-rose-200',
    RESCHEDULED: 'text-amber-700 bg-amber-50 border-amber-200',
    CANCELLED: 'text-stone-600 bg-stone-50 border-stone-200',
  };

  if (loading) return <div className="p-4"><ShimmerTable rows={5} cols={3} /></div>;

  const totalMeetings  = meetings.length;
  const completedCount = meetings.filter(m => m.status === 'COMPLETED').length;
  const missedCount    = meetings.filter(m => m.status === 'MISSED' || m.status === 'CANCELLED').length;
  const scheduledCount = meetings.filter(m => m.status === 'SCHEDULED').length;
  const generalLogs    = followUps.filter(f => !f.meetingId);

  const FU_COLORS: Record<string, string> = {
    MISSED:        'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400',
    RESCHEDULED:   'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400',
    DELAYED:       'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400',
    CLIENT_NO_SHOW:'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-400',
    GENERAL_NOTE:  'text-stone-600 bg-stone-50 border-stone-200 dark:bg-stone-800/40 dark:border-stone-700 dark:text-stone-400',
  };

  return (
    <div className="space-y-3">
      {/* Client strip */}
      <ClientContactBanner client={project.prospect?.client} prospect={project.prospect} />

      {/* Stats summary + action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Stat pills */}
        <div className="flex gap-2 flex-1 flex-wrap">
          {[
            { label: 'Total',     count: totalMeetings,  color: 'text-[var(--text-primary)] bg-[var(--card-bg)] border-[var(--border)]' },
            { label: 'Completed', count: completedCount, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400' },
            { label: 'Missed',    count: missedCount,    color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400' },
            { label: 'Upcoming',  count: scheduledCount, color: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${s.color}`}>
              <span className="font-black text-[13px]">{s.count}</span>
              <span className="opacity-70">{s.label}</span>
            </div>
          ))}
        </div>
        {canManage && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowFollowUp(true)} className={btnSecondary}><Plus size={11} /> Log Follow-up</button>
            <button onClick={() => setShowCreate(true)} className={btnPrimary}><CalendarDays size={11} /> Schedule Meeting</button>
          </div>
        )}
      </div>

      {/* Meetings list */}
      {meetings.length === 0 ? (
        <div className={`${card} p-10 text-center flex flex-col items-center gap-3`}>
          <div className="w-12 h-12 rounded-2xl bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.12)] flex items-center justify-center">
            <CalendarDays size={20} className="text-[#b89047]/40" />
          </div>
          <p className="text-[12px] font-medium text-[var(--text-muted)]">No CDRF meetings scheduled yet.</p>
          {canManage && (
            <button onClick={() => setShowCreate(true)} className={btnPrimary}><CalendarDays size={11} /> Schedule First Meeting</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m, idx) => {
            const date = new Date(m.scheduledAt);
            const isPast = date < new Date();
            return (
              <div key={m.id} className={`${card} overflow-hidden`}>
                {/* Card top accent */}
                <div className={`h-1 w-full ${
                  m.status === 'COMPLETED' ? 'bg-emerald-500' :
                  m.status === 'MISSED' || m.status === 'CANCELLED' ? 'bg-rose-400' :
                  m.status === 'RESCHEDULED' ? 'bg-amber-400' :
                  'bg-blue-400'}`}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: main info */}
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[m.status] ?? 'text-stone-600 bg-stone-50 border-stone-200'}`}>
                          {m.status}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          m.meetingType === 'ONLINE'
                            ? 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-400'
                            : 'text-stone-600 bg-stone-50 border-stone-200 dark:bg-stone-800/40 dark:border-stone-700 dark:text-stone-400'
                        }`}>
                          {m.meetingType === 'ONLINE' ? '🔗' : '📍'} {m.meetingType}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">Meeting #{idx + 1}</span>
                      </div>

                      {/* Date/time prominent */}
                      <p className="text-[14px] font-bold text-[var(--text-primary)] mb-0.5">
                        {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-[12px] text-[var(--text-secondary)] mb-2">
                        {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        {isPast && m.status !== 'SCHEDULED' && <span className="ml-2 text-[var(--text-muted)]">· {Math.ceil((Date.now() - date.getTime()) / 86400000)}d ago</span>}
                      </p>

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-[var(--text-muted)]">
                        <span>Scheduled by <span className="font-semibold text-[var(--text-secondary)]">{m.scheduledBy?.name ?? '—'}</span></span>
                        <span className={`font-semibold ${m.clientPresent ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                          Client {m.clientPresent ? '✓ Present' : '✗ Absent'}
                        </span>
                      </div>

                      {/* Notes */}
                      {m.notes && (
                        <p className="mt-2 text-[12px] text-[var(--text-secondary)] bg-[var(--border)]/30 rounded-lg px-3 py-2 border-l-2 border-[#b89047]/40">
                          {m.notes}
                        </p>
                      )}

                      {/* Online link */}
                      {m.meetingLink && (
                        <a href={m.meetingLink} target="_blank" rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium">
                          🔗 Join Meeting Link
                        </a>
                      )}
                    </div>

                    {/* Right: update button */}
                    {canManage && m.status === 'SCHEDULED' && (
                      <button
                        onClick={() => { setSelectedMeeting(m); setUpdateForm({ status: m.status, clientPresent: !!m.clientPresent, notes: m.notes ?? '' }); }}
                        className={btnSecondary + ' shrink-0'}
                      >
                        <SquarePen size={11} /> Update
                      </button>
                    )}
                  </div>

                  {/* Follow-up logs for this meeting */}
                  {m.followUpLogs?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">Follow-up Activity</p>
                      <div className="space-y-2">
                        {m.followUpLogs.map((fl: any) => (
                          <div key={fl.id} className="flex items-start gap-2.5">
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${FU_COLORS[fl.type] ?? FU_COLORS.GENERAL_NOTE}`}>
                              {fl.type.replace(/_/g, ' ')}
                            </span>
                            <p className="flex-1 text-[11.5px] text-[var(--text-secondary)]">{fl.notes}</p>
                            <span className="text-[10px] text-[var(--text-muted)] shrink-0">{fl.loggedBy?.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* General follow-up logs */}
      {generalLogs.length > 0 && (
        <div className={`${card} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3 pb-2 border-b border-[var(--border)]">
            General Follow-up Logs <span className="font-normal text-[var(--text-muted)]">({generalLogs.length})</span>
          </p>
          <div className="space-y-2.5">
            {generalLogs.map(fl => (
              <div key={fl.id} className="flex items-start gap-3">
                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 mt-0.5 ${FU_COLORS[fl.type] ?? FU_COLORS.GENERAL_NOTE}`}>
                  {fl.type.replace(/_/g, ' ')}
                </span>
                <p className="flex-1 text-[12px] text-[var(--text-secondary)]">{fl.notes}</p>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)]">{fl.loggedBy?.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{new Date(fl.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create meeting modal */}
      {showCreate && (
        <Modal title="Schedule CDRF Meeting" onClose={() => setShowCreate(false)}>
          <div className="p-5 space-y-3">
            <div><label className={label}>Type</label>
              <select className={inputBase} value={meetForm.meetingType} onChange={e => setMeetForm(f => ({ ...f, meetingType: e.target.value }))}>
                <option value="OFFLINE">Offline (In-Person)</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div><label className={label}>Date & Time <span className="text-rose-500">*</span></label>
              <input type="datetime-local" className={inputBase} value={meetForm.scheduledAt} onChange={e => setMeetForm(f => ({ ...f, scheduledAt: e.target.value }))} min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} />
            </div>
            {meetForm.meetingType === 'ONLINE' && (
              <div>
                <label className={label}>Meeting Link</label>
                <input className={inputBase} value={meetForm.meetingLink} onChange={e => setMeetForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="Leave blank to auto-generate a Jitsi link" />
                <p className="text-[10.5px] text-stone-400 italic mt-1">A meeting link will be auto-generated and emailed to the client if left blank.</p>
              </div>
            )}
            <div><label className={label}>Notes</label>
              <textarea className={`${inputBase} resize-none`} rows={2} value={meetForm.notes} onChange={e => setMeetForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className={btnSecondary}>Cancel</button>
              <button onClick={handleCreateMeeting} disabled={submitting} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <CalendarDays size={12} />} Schedule
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Update meeting modal */}
      {selectedMeeting && (
        <Modal title="Update Meeting" subtitle={new Date(selectedMeeting.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} onClose={() => setSelectedMeeting(null)}>
          <div className="p-5 space-y-3">
            <div><label className={label}>Status</label>
              <select className={inputBase} value={updateForm.status} onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value }))}>
                {['SCHEDULED', 'COMPLETED', 'MISSED', 'RESCHEDULED', 'CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={updateForm.clientPresent} onChange={e => setUpdateForm(f => ({ ...f, clientPresent: e.target.checked }))} className="accent-amber-600" />
              <span className="text-[12px]">Client was present</span>
            </label>
            <div><label className={label}>Notes</label>
              <textarea className={`${inputBase} resize-none`} rows={2} value={updateForm.notes} onChange={e => setUpdateForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedMeeting(null)} className={btnSecondary}>Cancel</button>
              <button onClick={() => handleUpdateMeeting(selectedMeeting.id)} disabled={submitting} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Log follow-up modal */}
      {showFollowUp && (
        <Modal title="Log Follow-up" onClose={() => setShowFollowUp(false)}>
          <div className="p-5 space-y-3">
            <div><label className={label}>Type</label>
              <select className={inputBase} value={fuForm.type} onChange={e => setFuForm(f => ({ ...f, type: e.target.value }))}>
                {['MISSED', 'RESCHEDULED', 'DELAYED', 'CLIENT_NO_SHOW', 'GENERAL_NOTE'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div><label className={label}>Related Meeting <span className="text-stone-400">(optional)</span></label>
              <select className={inputBase} value={fuForm.meetingId} onChange={e => setFuForm(f => ({ ...f, meetingId: e.target.value }))}>
                <option value="">— None —</option>
                {meetings.map(m => <option key={m.id} value={m.id}>{new Date(m.scheduledAt).toLocaleDateString('en-IN')} ({m.status})</option>)}
              </select>
            </div>
            <div><label className={label}>Notes <span className="text-rose-500">*</span></label>
              <textarea className={`${inputBase} resize-none`} rows={3} value={fuForm.notes} onChange={e => setFuForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFollowUp(false)} className={btnSecondary}>Cancel</button>
              <button onClick={handleLogFollowUp} disabled={submitting} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Log
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CDRF Form Tab ────────────────────────────────────────────────────────────
function CdrfFormTab({ project, currentUser }: { project: any; currentUser: User }) {
  const { showToast } = useToast();
  const [formMeta, setFormMeta] = useState<{ completionPct: number; status: string } | null>(null);
  const [initialModules, setInitialModules] = useState<any[] | null>(null);
  // editorKey forces CDRFEditor re-mount when data first loads from the server
  const [editorKey, setEditorKey] = useState(0);
  // latestModulesRef holds the most-recent editor state for save/submit without causing re-renders
  const latestModulesRef = useRef<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPM         = project.assignment?.projectManager?.id === currentUser.id;
  const isAdmin      = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isArch       = currentUser.role === 'Project Architect' || currentUser.role === 'Junior Architect';
  const canEdit      = isPM || isSuperAdmin || isArch;

  const fetchForm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getCdrfForm(project.id);
      const f = res.data.form;
      if (f) {
        setFormMeta({ completionPct: f.completionPct ?? 0, status: f.status ?? 'DRAFT' });
        if (Array.isArray(f.sections?.modules) && f.sections.modules.length > 0) {
          setInitialModules(f.sections.modules);
          latestModulesRef.current = f.sections.modules;
          setEditorKey(k => k + 1);
        }
      }
    } catch { } finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { fetchForm(); }, [fetchForm]);

  const handleSave = async () => {
    const mods = latestModulesRef.current;
    if (!mods) return;
    setSaving(true);
    try {
      await projectApi.saveCdrfForm(project.id, { modules: mods });
      showToast('CDRF form saved.', 'success');
      // Refresh only the completion % metadata — don't re-mount the editor
      const res = await projectApi.getCdrfForm(project.id);
      const f = res.data.form;
      if (f) setFormMeta({ completionPct: f.completionPct ?? 0, status: f.status ?? 'DRAFT' });
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed to save.', 'error'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    const mods = latestModulesRef.current;
    if (!mods) return;
    setSubmitting(true);
    try {
      await projectApi.submitCdrfForm(project.id, { modules: mods });
      showToast('CDRF form submitted.', 'success');
      fetchForm();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed to submit.', 'error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-4"><ShimmerTable rows={5} cols={3} /></div>;

  const pct = formMeta?.completionPct ?? 0;
  const isSubmitted = formMeta?.status === 'SUBMITTED';

  return (
    <div className="flex flex-col gap-2.5" style={{ height: 'calc(100vh - 250px)', minHeight: 520 }}>
      {/* Status bar */}
      <div className={`${card} px-4 py-2.5 flex items-center gap-3 shrink-0`}>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">CDRF Completion</span>
            <span className="text-[11px] font-bold text-[#b89047]">{pct}%</span>
          </div>
          <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full bg-[#b89047] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${isSubmitted ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
          {isSubmitted ? 'SUBMITTED' : 'DRAFT'}
        </span>
        {isSubmitted && (
          <span className="text-[10px] text-[var(--text-muted)]">Locked after submission.</span>
        )}
      </div>

      {/* Full CDRF Editor — fills remaining height */}
      <div className="flex-1 overflow-hidden rounded-xl">
        <CDRFEditor
          key={editorKey}
          initialModules={initialModules}
          onChange={mods => { latestModulesRef.current = mods; }}
          readOnly={!canEdit || isSubmitted}
        />
      </div>

      {/* Action buttons */}
      {canEdit && !isSubmitted && (
        <div className="flex justify-end gap-2 shrink-0">
          <button onClick={handleSave} disabled={saving} className={btnSecondary}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Save Draft
          </button>
          <button onClick={handleSubmit} disabled={submitting} className={btnPrimary}>
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Submit CDRF
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Design Approval Tab ──────────────────────────────────────────────────────
function DesignTab({ project, currentUser, onRefresh }: { project: any; currentUser: User; onRefresh: () => void }) {
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showSend, setShowSend] = useState<any>(null);
  const [showReview, setShowReview] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [docViewer, setDocViewer] = useState<{ url: string; fileName: string; draft?: any } | null>(null);
  const [feedbackUploading, setFeedbackUploading] = useState(false);

  const isAdmin      = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isPM         = project.assignment?.projectManager?.id === currentUser.id;
  const isArch       = project.assignment?.projectArchitect?.id === currentUser.id ||
                       project.assignment?.juniorArchitect?.id === currentUser.id;
  const isCompleted          = project.status === 'COMPLETED';
  const canUpload            = !isCompleted && (isAdmin || isArch);
  const canReview            = !isCompleted && isAdmin;
  const canSend              = !isCompleted && (isAdmin || isPM);
  const canRecordClientResp  = !isCompleted && (isAdmin || isPM);

  const clientEmail = project.prospect?.client?.email;
  const clientName  = project.prospect?.client?.clientName;

  const [uploadForm, setUploadForm] = useState({ fileUrl: '', fileName: '' });
  const [uploading, setUploading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED' as 'APPROVED' | 'REJECTED', reviewNotes: '' });
  const [sendForm, setSendForm] = useState({ notes: '' });

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getDesigns(project.id);
      setDrafts(res.data.drafts ?? []);
    } catch { } finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await projectApi.uploadFile(fd);
      const url = res.data.url ?? res.data.fileUrl;
      setUploadForm({ fileUrl: url, fileName: file.name });
    } catch (err: any) { showToast('Upload failed.', 'error'); }
    finally { setUploading(false); }
  };

  const handleUploadDesign = async () => {
    if (!uploadForm.fileUrl) { showToast('Please select a file.', 'error'); return; }
    setSubmitting(true);
    try {
      await projectApi.uploadDesign(project.id, uploadForm);
      showToast('Design uploaded.', 'success');
      setShowUpload(false);
      setUploadForm({ fileUrl: '', fileName: '' });
      fetchDrafts();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleReview = async (draftId: string) => {
    if (reviewForm.status === 'REJECTED' && !reviewForm.reviewNotes.trim()) {
      showToast('Comments required when rejecting.', 'error'); return;
    }
    setSubmitting(true);
    try {
      await projectApi.reviewDesign(project.id, draftId, reviewForm);
      showToast(`Design ${reviewForm.status.toLowerCase()}.`, 'success');
      setShowReview(null);
      fetchDrafts();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleSendToClient = async (draftId: string) => {
    setSubmitting(true);
    try {
      await projectApi.sendDesignToClient(project.id, draftId, sendForm);
      showToast('Design sent to client.', 'success');
      setShowSend(null);
      fetchDrafts();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const CLIENT_STATUS_COLORS: Record<string, string> = {
    PENDING_CLIENT:    'text-blue-700 bg-blue-50 border-blue-200',
    REVISION_REQUESTED: 'text-orange-700 bg-orange-50 border-orange-200',
    CLIENT_APPROVED:   'text-teal-700 bg-teal-50 border-teal-200',
  };
  const CLIENT_STATUS_LABELS: Record<string, string> = {
    PENDING_CLIENT:    'Awaiting Client Response',
    REVISION_REQUESTED: 'Client: Revision Requested',
    CLIENT_APPROVED:   'Client Approved',
  };

  const [showClientResponse, setShowClientResponse] = useState<any>(null);
  const [clientResponseForm, setClientResponseForm] = useState<{ response: 'APPROVED' | 'REVISION_REQUIRED'; notes: string; fileUrl?: string; fileName?: string }>({ response: 'APPROVED', notes: '' });

  const handleClientResponse = async (draftId: string) => {
    if (clientResponseForm.response === 'REVISION_REQUIRED' && !clientResponseForm.notes.trim()) {
      showToast('Notes are required when requesting a revision.', 'error'); return;
    }
    setSubmitting(true);
    try {
      await projectApi.recordClientResponse(project.id, draftId, {
        response: clientResponseForm.response,
        notes: clientResponseForm.notes,
        fileUrl: clientResponseForm.fileUrl,
        fileName: clientResponseForm.fileName,
      });
      showToast(clientResponseForm.response === 'APPROVED' ? 'Layout approved by client. Design pipeline initialized.' : 'Revision request recorded.', 'success');
      setShowClientResponse(null);
      fetchDrafts();
      onRefresh();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING_REVIEW: 'text-amber-700 bg-amber-50 border-amber-200',
    APPROVED:       'text-emerald-700 bg-emerald-50 border-emerald-200',
    REJECTED:       'text-rose-700 bg-rose-50 border-rose-200',
  };

  if (loading) return <div className="p-4"><ShimmerTable rows={5} cols={3} /></div>;

  const approvedCount = drafts.filter(d => d.status === 'APPROVED').length;
  const pendingCount  = drafts.filter(d => d.status === 'PENDING_REVIEW').length;
  const rejectedCount      = drafts.filter(d => d.status === 'REJECTED').length;
  const sentCount          = drafts.filter(d => d.designEmailSentAt).length;
  const latestDraft        = drafts[0];
  const revisionRequested  = latestDraft?.clientStatus === 'REVISION_REQUESTED';
  const clientApproved     = latestDraft?.clientStatus === 'CLIENT_APPROVED';
  const awaitingResponse   = latestDraft?.clientStatus === 'PENDING_CLIENT';
  const awaitingAdminReview = latestDraft?.status === 'PENDING_REVIEW';
  const awaitingSend       = latestDraft?.status === 'APPROVED' && !latestDraft?.designEmailSentAt;

  return (
    <div className="space-y-3">
      {/* Client strip + upload button */}
      <div className="flex items-center gap-3 flex-wrap">
        <ClientContactBanner client={project.prospect?.client} prospect={project.prospect} />
        {canUpload && (
          <button onClick={() => setShowUpload(true)} className={btnPrimary + ' shrink-0'}>
            <Upload size={11} /> {revisionRequested ? 'Upload Revised Layout' : 'Upload Layout'}
          </button>
        )}
      </div>

      {/* ── Active status banner ── */}
      {revisionRequested && !isCompleted && (
        <div className="flex items-start gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertTriangle size={15} className="text-orange-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-bold text-orange-800">Client Requested Revision</p>
            <p className="text-[11.5px] text-orange-700 mt-0.5">
              The client has asked for changes on <strong>v{latestDraft.version}</strong>.
              {canUpload ? ' Upload a revised layout file to start the next review cycle.' : ' Waiting for the architect to upload a revised version.'}
            </p>
          </div>
        </div>
      )}
      {awaitingAdminReview && !revisionRequested && !isCompleted && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock size={15} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12.5px] font-bold text-amber-800">Waiting for Admin Review</p>
            <p className="text-[11.5px] text-amber-700 mt-0.5">v{latestDraft.version} has been uploaded. Admin needs to approve or reject it before it can be sent to the client.</p>
          </div>
        </div>
      )}
      {awaitingSend && !isCompleted && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Send size={15} className="text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12.5px] font-bold text-blue-800">Ready to Send to Client</p>
            <p className="text-[11.5px] text-blue-700 mt-0.5">v{latestDraft.version} is approved. PM or Admin can now send it to the client for review.</p>
          </div>
        </div>
      )}
      {awaitingResponse && !isCompleted && (
        <div className="flex items-start gap-3 px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl">
          <Clock size={15} className="text-sky-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-bold text-sky-800">Awaiting Client Response — v{latestDraft.version} sent</p>
            <p className="text-[11.5px] text-sky-700 mt-0.5 mb-2">When the client gives feedback, record their response here:</p>
            {canRecordClientResp && (
              <button
                onClick={() => { setShowClientResponse(latestDraft); setClientResponseForm({ response: 'APPROVED', notes: '' }); }}
                className={btnPrimary}>
                <CheckCircle2 size={12} /> Record Client Response
              </button>
            )}
          </div>
        </div>
      )}
      {clientApproved && (
        <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12.5px] font-bold text-emerald-800">Layout Approved — Design Pipeline Active</p>
            <p className="text-[11.5px] text-emerald-700 mt-0.5">Client approved the layout. Go to the <strong>Design Pipeline</strong> tab to add drawings, assign architects, and track progress.</p>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {drafts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Total Versions',  value: drafts.length,    color: 'text-[var(--text-primary)]',                  bg: 'bg-[var(--card-bg)] border-[var(--border)]' },
            { label: 'Approved',        value: approvedCount,    color: 'text-emerald-700 dark:text-emerald-400',       bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
            { label: 'Pending Review',  value: pendingCount,     color: 'text-amber-700 dark:text-amber-400',           bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
            { label: 'Sent to Client',  value: sentCount,        color: 'text-blue-700 dark:text-blue-400',             bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-xl px-3 py-2.5 flex items-center justify-between`}>
              <p className="text-[10px] text-[var(--text-muted)] font-semibold">{s.label}</p>
              <p className={`text-[22px] font-black leading-none ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Drafts list / empty */}
      {drafts.length === 0 ? (
        <div className={`${card} p-10 text-center flex flex-col items-center gap-3`}>
          <div className="w-12 h-12 rounded-2xl bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.12)] flex items-center justify-center">
            <Upload size={20} className="text-[#b89047]/40" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[var(--text-primary)] mb-0.5">No design layouts yet</p>
            <p className="text-[11.5px] text-[var(--text-muted)]">
              {isCompleted ? 'This project was completed.' : 'The architect will upload layout files here for admin review.'}
            </p>
          </div>
          {canUpload && <button onClick={() => setShowUpload(true)} className={btnPrimary}><Upload size={12} /> Upload First Layout</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Version history label */}
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] px-0.5">
            Version History ({drafts.length} revision{drafts.length !== 1 ? 's' : ''})
          </p>

          {drafts.map((d, idx) => {
            const isLatest = idx === 0;
            return (
              <div key={d.id} className={`${card} overflow-hidden ${isLatest ? 'ring-1 ring-[rgba(184,144,71,0.3)]' : ''}`}>
                {/* Top accent */}
                <div className={`h-1 w-full ${
                  d.status === 'APPROVED'       ? 'bg-emerald-500' :
                  d.status === 'REJECTED'        ? 'bg-rose-400' :
                                                   'bg-amber-400'}`}
                />
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* File icon */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black border ${
                      d.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' :
                      d.status === 'REJECTED' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400' :
                                                'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                    }`}>
                      v{d.version}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[d.status]}`}>
                          {d.status.replace(/_/g, ' ')}
                        </span>
                        {isLatest && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(184,144,71,0.12)] text-[#b89047] border border-[rgba(184,144,71,0.25)]">LATEST</span>}
                      </div>

                      <p className="text-[13.5px] font-bold text-[var(--text-primary)] truncate mb-2">{d.fileName}</p>

                      {/* Timeline of events */}
                      <div className="space-y-1.5">
                        {/* Upload event */}
                        <div className="flex items-center gap-2 text-[11.5px]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#b89047] shrink-0" />
                          <span className="text-[var(--text-muted)]">Uploaded by</span>
                          <span className="font-semibold text-[var(--text-secondary)]">{d.uploadedBy?.name ?? '—'}</span>
                          <span className="text-[var(--text-muted)] ml-auto shrink-0">
                            {new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        {/* Review event */}
                        {d.reviewedBy && (
                          <div className="flex items-center gap-2 text-[11.5px]">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="text-[var(--text-muted)]">{d.status === 'APPROVED' ? 'Approved' : 'Rejected'} by</span>
                            <span className="font-semibold text-[var(--text-secondary)]">{d.reviewedBy.name}</span>
                            {d.reviewNotes && <span className="text-[var(--text-muted)]">— {d.reviewNotes}</span>}
                          </div>
                        )}

                        {/* Sent event */}
                        {d.designEmailSentAt && (
                          <div className="flex items-center gap-2 text-[11.5px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={10} /> Sent to client
                            </span>
                            {clientEmail && <span className="text-[var(--text-muted)] truncate">({clientEmail})</span>}
                            <span className="text-[var(--text-muted)] ml-auto shrink-0">
                              {new Date(d.designEmailSentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        )}

                        {/* Client response status */}
                        {d.clientStatus && (
                          <div className="flex items-center gap-2 text-[11.5px] flex-wrap">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.clientStatus === 'CLIENT_APPROVED' ? 'bg-teal-500' : d.clientStatus === 'REVISION_REQUESTED' ? 'bg-orange-500' : 'bg-blue-400'}`} />
                            <span className={`font-semibold px-1.5 py-0.5 rounded-full text-[10px] border ${CLIENT_STATUS_COLORS[d.clientStatus] ?? ''}`}>
                              {CLIENT_STATUS_LABELS[d.clientStatus] ?? d.clientStatus}
                            </span>
                          </div>
                        )}

                        {/* Client feedback notes + file (from layoutFeedback) */}
                        {d.layoutFeedback?.length > 0 && (() => {
                          const latest = d.layoutFeedback[0];
                          return latest.notes || latest.fileUrl ? (
                            <div className={`mt-1 p-2.5 rounded-lg border text-[11.5px] ${latest.response === 'REVISION_REQUIRED' ? 'bg-orange-50 border-orange-200' : 'bg-teal-50 border-teal-200'}`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <MessageSquare size={10} className={latest.response === 'REVISION_REQUIRED' ? 'text-orange-500' : 'text-teal-500'} />
                                <span className={`font-semibold text-[10px] ${latest.response === 'REVISION_REQUIRED' ? 'text-orange-700' : 'text-teal-700'}`}>
                                  Client Feedback — {latest.createdBy?.name}
                                </span>
                              </div>
                              {latest.notes && <p className="text-stone-700 leading-snug">{latest.notes}</p>}
                              {latest.fileUrl && (
                                <button onClick={() => setDocViewer({ url: `${BACKEND_BASE}${latest.fileUrl}`, fileName: latest.fileName || 'Feedback file' })}
                                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#b89047] hover:underline cursor-pointer border-0 bg-transparent p-0">
                                  <Eye size={9} /> View Attached Feedback
                                </button>
                              )}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => setDocViewer({ url: `${BACKEND_BASE}${d.fileUrl}`, fileName: d.fileName, draft: d })} className={btnSecondary}>
                        <Eye size={11} /> View
                      </button>
                      {canReview && d.status === 'PENDING_REVIEW' && (
                        <button onClick={() => setDocViewer({ url: `${BACKEND_BASE}${d.fileUrl}`, fileName: d.fileName, draft: d })} className={btnPrimary}>
                          <CheckCircle2 size={11} /> Review
                        </button>
                      )}
                      {canSend && d.status === 'APPROVED' && !d.designEmailSentAt && (
                        <button onClick={() => { setShowSend(d); setSendForm({ notes: '' }); }} className={btnPrimary}>
                          <Send size={11} /> Send
                        </button>
                      )}
                      {canRecordClientResp && d.clientStatus === 'PENDING_CLIENT' && (
                        <button onClick={() => { setShowClientResponse(d); setClientResponseForm({ response: 'APPROVED', notes: '' }); }} className={btnPrimary}>
                          <MessageSquare size={11} /> Client Response
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <Modal title="Upload Design Layout" onClose={() => setShowUpload(false)}>
          <div className="p-5 space-y-4">
            <div>
              <label className={label}>Layout File (PDF / Image) <span className="text-rose-500">*</span></label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.dwg" onChange={handleFileSelect} className="w-full text-[12px] text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[rgba(184,144,71,0.1)] file:text-[#b89047] hover:file:bg-[rgba(184,144,71,0.2)] cursor-pointer" />
              {uploading && <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Uploading…</p>}
              {uploadForm.fileName && !uploading && <p className="text-[11px] text-emerald-600 mt-1">✓ {uploadForm.fileName}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowUpload(false)} className={btnSecondary}>Cancel</button>
              <button onClick={handleUploadDesign} disabled={submitting || uploading || !uploadForm.fileUrl} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Review modal */}
      {showReview && (
        <Modal title="Review Design" subtitle={`v${showReview.version} — ${showReview.fileName}`} onClose={() => setShowReview(null)}>
          <div className="p-5 space-y-3">
            <div className="flex gap-3">
              {(['APPROVED', 'REJECTED'] as const).map(s => (
                <button key={s} onClick={() => setReviewForm(f => ({ ...f, status: s }))}
                  className={`flex-1 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer
                    ${reviewForm.status === s
                      ? s === 'APPROVED' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-rose-600 text-white border-rose-600'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border)]'}`}>
                  {s === 'APPROVED' ? '✓ Approve' : '✗ Reject'}
                </button>
              ))}
            </div>
            <div>
              <label className={label}>Comments {reviewForm.status === 'REJECTED' && <span className="text-rose-500">*</span>}</label>
              <textarea className={`${inputBase} resize-none`} rows={3} value={reviewForm.reviewNotes} onChange={e => setReviewForm(f => ({ ...f, reviewNotes: e.target.value }))} placeholder={reviewForm.status === 'REJECTED' ? 'Required: reason for rejection…' : 'Optional notes…'} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReview(null)} className={btnSecondary}>Cancel</button>
              <button onClick={() => handleReview(showReview.id)} disabled={submitting} className={reviewForm.status === 'APPROVED' ? btnPrimary : btnDanger}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : reviewForm.status === 'APPROVED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {reviewForm.status}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Client response modal */}
      {showClientResponse && (
        <Modal title="Record Client Response" subtitle={`v${showClientResponse.version} — ${showClientResponse.fileName}`} onClose={() => setShowClientResponse(null)}>
          <div className="p-5 space-y-3">
            <div className="flex gap-3">
              {(['APPROVED', 'REVISION_REQUIRED'] as const).map(r => (
                <button key={r} onClick={() => setClientResponseForm(f => ({ ...f, response: r }))}
                  className={`flex-1 py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer
                    ${clientResponseForm.response === r
                      ? r === 'APPROVED' ? 'bg-teal-600 text-white border-teal-600' : 'bg-orange-500 text-white border-orange-500'
                      : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border)]'}`}>
                  {r === 'APPROVED' ? '✓ Client Approved' : '↩ Revision Required'}
                </button>
              ))}
            </div>
            <div>
              <label className={label}>Client Feedback / Notes {clientResponseForm.response === 'REVISION_REQUIRED' && <span className="text-rose-500">*</span>}</label>
              <textarea className={`${inputBase} resize-none`} rows={3} value={clientResponseForm.notes} onChange={e => setClientResponseForm(f => ({ ...f, notes: e.target.value }))} placeholder={clientResponseForm.response === 'REVISION_REQUIRED' ? 'Required: what changes did the client request?' : 'Optional approval notes…'} />
            </div>
            <div>
              <label className={label}>Attach Client Feedback File <span className="font-normal text-[var(--text-muted)]">(optional — photo, annotated PDF, etc.)</span></label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFeedbackUploading(true);
                try {
                  const fd = new FormData(); fd.append('file', file);
                  const res = await projectApi.uploadFile(fd);
                  setClientResponseForm(f => ({ ...f, fileUrl: res.data.url ?? res.data.fileUrl, fileName: file.name }));
                } catch { showToast('File upload failed.', 'error'); }
                finally { setFeedbackUploading(false); }
              }} className="w-full text-[12px] text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[rgba(184,144,71,0.1)] file:text-[#b89047] hover:file:bg-[rgba(184,144,71,0.2)] cursor-pointer" />
              {feedbackUploading && <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Uploading…</p>}
              {clientResponseForm.fileName && !feedbackUploading && <p className="text-[11px] text-emerald-600 mt-1">✓ {clientResponseForm.fileName}</p>}
            </div>
            {clientResponseForm.response === 'APPROVED' && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-teal-50 border border-teal-200 rounded-lg text-[11px] text-teal-700">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                <span>Approving will set project status to <strong>Layout Approved</strong> and automatically initialize the Design Pipeline.</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowClientResponse(null)} className={btnSecondary}>Cancel</button>
              <button onClick={() => handleClientResponse(showClientResponse.id)} disabled={submitting || feedbackUploading} className={clientResponseForm.response === 'APPROVED' ? btnPrimary : btnDanger}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : clientResponseForm.response === 'APPROVED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {clientResponseForm.response === 'APPROVED' ? 'Confirm Approval' : 'Record Revision Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Send to client modal */}
      {showSend && (
        <Modal title="Send Draft to Client" subtitle={`v${showSend.version} — ${showSend.fileName}`} onClose={() => setShowSend(null)}>
          <div className="p-5 space-y-3">
            {clientEmail && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.18)] rounded-lg text-[11.5px]">
                <Send size={11} className="text-[#b89047] shrink-0" />
                <span className="text-[var(--text-muted)]">Will be sent to:</span>
                <span className="font-semibold text-[var(--text-primary)]">{clientName}</span>
                <span className="text-[#b89047]">&lt;{clientEmail}&gt;</span>
              </div>
            )}
            <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-700">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>To schedule a client meeting, use the <strong>Client Meetings</strong> tab before or after sending this draft.</span>
            </div>
            <div><label className={label}>Notes / Message</label>
              <textarea className={`${inputBase} resize-none`} rows={3} value={sendForm.notes} onChange={e => setSendForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional message to the client…" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSend(null)} className={btnSecondary}>Cancel</button>
              <button onClick={() => handleSendToClient(showSend.id)} disabled={submitting} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Draft
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Inline Document Viewer */}
      {docViewer && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-stone-950">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-700 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={15} className="text-stone-400 shrink-0" />
              <span className="text-[13px] font-semibold text-stone-200 truncate">{docViewer.fileName}</span>
              {docViewer.draft && (
                <span className="text-[11px] text-stone-400">v{docViewer.draft.version}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={docViewer.url} download className={`${btnSecondary} border-stone-600 text-stone-300 hover:border-stone-400`}>
                <Download size={11} /> Download
              </a>
              <button onClick={() => setDocViewer(null)} className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer border-0 bg-transparent transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body: viewer + optional review panel */}
          <div className="flex flex-1 min-h-0">
            {/* Document preview */}
            <div className="flex-1 min-w-0 bg-stone-900 flex items-center justify-center overflow-hidden">
              {/\.(jpg|jpeg|png|gif|webp)$/i.test(docViewer.fileName) ? (
                <img src={docViewer.url} alt={docViewer.fileName} className="max-w-full max-h-full object-contain" />
              ) : /\.pdf$/i.test(docViewer.fileName) ? (
                <iframe src={docViewer.url} title={docViewer.fileName} className="w-full h-full border-0" />
              ) : (
                <div className="text-center text-stone-400 space-y-3">
                  <FileText size={40} className="mx-auto text-stone-600" />
                  <p className="text-[13px]">Preview not available for this file type</p>
                  <a href={docViewer.url} target="_blank" rel="noreferrer" className="text-[#b89047] hover:underline text-[12px]">Open in new tab</a>
                </div>
              )}
            </div>

            {/* Review action panel — shown when admin can review a PENDING_REVIEW draft */}
            {docViewer.draft && canReview && docViewer.draft.status === 'PENDING_REVIEW' && (
              <div className="w-72 shrink-0 bg-white border-l border-stone-200 flex flex-col overflow-y-auto p-5 space-y-4">
                <p className="text-[13px] font-bold text-stone-900">Review Design</p>
                <div className="flex flex-col gap-2">
                  {(['APPROVED', 'REJECTED'] as const).map(s => (
                    <button key={s} onClick={() => setReviewForm(f => ({ ...f, status: s }))}
                      className={`py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer
                        ${reviewForm.status === s
                          ? s === 'APPROVED' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-rose-600 text-white border-rose-600'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-400'}`}>
                      {s === 'APPROVED' ? '✓ Approve' : '✗ Reject'}
                    </button>
                  ))}
                </div>
                <div>
                  <label className={label}>Comments {reviewForm.status === 'REJECTED' && <span className="text-rose-500">*</span>}</label>
                  <textarea className={`${inputBase} resize-none`} rows={4} value={reviewForm.reviewNotes} onChange={e => setReviewForm(f => ({ ...f, reviewNotes: e.target.value }))} placeholder={reviewForm.status === 'REJECTED' ? 'Required: reason for rejection…' : 'Optional notes…'} />
                </div>
                <button onClick={() => handleReview(docViewer.draft.id).then(() => setDocViewer(null))} disabled={submitting} className={reviewForm.status === 'APPROVED' ? btnPrimary : btnDanger}>
                  {submitting ? <Loader2 size={12} className="animate-spin" /> : reviewForm.status === 'APPROVED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {reviewForm.status}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Design Pipeline Tab ──────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  LAYOUT: 'Layout Planning',
  ARCHITECTURAL: 'Architectural (A)',
  PLUMBING: 'Plumbing / MEP (B2)',
  ELECTRICAL: 'Electrical / RCP (C)',
  STRUCTURAL: 'Structural (D)',
  INTERIOR: 'Interior Works',
};

const DRAWING_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'text-stone-600 bg-stone-50 border-stone-200',
  IN_PROGRESS: 'text-blue-700 bg-blue-50 border-blue-200',
  REVIEW:      'text-amber-700 bg-amber-50 border-amber-200',
  APPROVED:    'text-emerald-700 bg-emerald-50 border-emerald-200',
};

function PipelineTab({ project, currentUser, onRefresh }: { project: any; currentUser: User; onRefresh: () => void }) {
  const { showToast } = useToast();
  const [pipeline, setPipeline] = useState<any>(null);
  const [drawingMaster, setDrawingMaster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showAddDrawing, setShowAddDrawing] = useState(false);
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<Set<string>>(new Set());
  const [deleteSelectedIds, setDeleteSelectedIds] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState<any>(null);
  const [assignForm, setAssignForm] = useState({ assignedArchitectId: '', juniorArchitectId: '', notes: '' });
  const [showFileUpload, setShowFileUpload] = useState<any>(null);
  const [fileForm, setFileForm] = useState({ fileType: 'PDF' as 'CAD' | 'PDF' | 'IMAGE', fileUrl: '', fileName: '' });
  const [uploading, setUploading] = useState(false);
  const [architects, setArchitects] = useState<any[]>([]);
  const [drawingDocViewer, setDrawingDocViewer] = useState<{ url: string; fileName: string } | null>(null);
  // Custom drawing creation
  const [customDrawingName, setCustomDrawingName] = useState('');
  const [customDrawingCategory, setCustomDrawingCategory] = useState('ARCHITECTURAL');
  const [addingCustom, setAddingCustom] = useState(false);

  const isAdmin      = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isPM         = project.assignment?.projectManager?.id === currentUser.id;
  const isArch       = currentUser.role === 'Project Architect' || currentUser.role === 'Junior Architect';
  const canManage    = isSuperAdmin || isPM;

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getDesignPipeline(project.id);
      setPipeline(res.data.pipeline);
    } catch { /* pipeline may not exist yet */ } finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  useEffect(() => {
    if (showAddDrawing) {
      projectApi.getDrawingMaster(project.id).then(r => setDrawingMaster(r.data.drawings ?? [])).catch(() => {});
      projectApi.getAssignableUsers().then(r => {
        setArchitects((r.data.users ?? []).filter((u: any) => ['Project Architect', 'Junior Architect'].includes(u.role.name)));
      }).catch(() => {});
    }
  }, [showAddDrawing, project.id]);

  useEffect(() => {
    if (showAssignModal) {
      projectApi.getAssignableUsers().then(r => {
        setArchitects((r.data.users ?? []).filter((u: any) => ['Project Architect', 'Junior Architect'].includes(u.role.name)));
      }).catch(() => {});
    }
  }, [showAssignModal]);

  const toggleDrawing = (id: string) => {
    setSelectedDrawingIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCategory = (items: any[], existingIds: Set<string>) => {
    const selectable = items.filter(d => !existingIds.has(d.id)).map(d => d.id);
    const allSelected = selectable.every(id => selectedDrawingIds.has(id));
    setSelectedDrawingIds(prev => {
      const next = new Set(prev);
      if (allSelected) selectable.forEach(id => next.delete(id));
      else selectable.forEach(id => next.add(id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (deleteSelectedIds.size === 0) return;
    setSubmitting(true);
    try {
      const res = await projectApi.removeDrawingsBulk(project.id, [...deleteSelectedIds]);
      showToast(res.data.message, 'success');
      setDeleteSelectedIds(new Set());
      fetchPipeline();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed to delete.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleRequestDelete = async (drawingId: string) => {
    try {
      await projectApi.requestDrawingDelete(project.id, drawingId);
      showToast('Deletion request submitted. Awaiting Super Admin approval.', 'success');
      fetchPipeline();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
  };

  const handleApproveDelete = async (drawingId: string) => {
    setSubmitting(true);
    try {
      await projectApi.approveDrawingDelete(project.id, drawingId);
      showToast('Drawing deleted.', 'success');
      fetchPipeline();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleRejectDelete = async (drawingId: string) => {
    try {
      await projectApi.rejectDrawingDelete(project.id, drawingId);
      showToast('Deletion request rejected.', 'success');
      fetchPipeline();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
  };

  const handleAddCustomDrawing = async () => {
    if (!customDrawingName.trim()) return;
    setAddingCustom(true);
    try {
      const res = await projectApi.createDrawingMaster(project.id, { name: customDrawingName.trim(), category: customDrawingCategory });
      showToast(`"${res.data.drawing.name}" added to the master list.`, 'success');
      // Refresh drawing master so the new item appears in the list
      const masterRes = await projectApi.getDrawingMaster(project.id);
      setDrawingMaster(masterRes.data.drawings ?? []);
      setCustomDrawingName('');
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Failed to add custom drawing.';
      showToast(msg, 'error');
      // If it already exists (409), still refresh master to surface it
      if (err.response?.status === 409) {
        const masterRes = await projectApi.getDrawingMaster(project.id);
        setDrawingMaster(masterRes.data.drawings ?? []);
      }
    } finally { setAddingCustom(false); }
  };

  const handleAddDrawings = async () => {
    if (selectedDrawingIds.size === 0) { showToast('Select at least one drawing.', 'error'); return; }
    setSubmitting(true);
    const archId = project.assignment?.projectArchitect?.id ?? null;
    const jrId   = project.assignment?.juniorArchitect?.id ?? null;
    try {
      const res = await projectApi.addDrawingsBulk(project.id, [...selectedDrawingIds], archId, jrId);
      const { drawings, skipped } = res.data;
      let msg = `${drawings.length} drawing${drawings.length !== 1 ? 's' : ''} added.`;
      if (skipped?.length) msg += ` ${skipped.length} skipped (room/wall-based — add those individually).`;
      showToast(msg, 'success');
      setShowAddDrawing(false);
      setSelectedDrawingIds(new Set());
      fetchPipeline();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to add drawings.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (drawingId: string) => {
    setSubmitting(true);
    try {
      await projectApi.removeDrawing(project.id, drawingId);
      showToast('Drawing removed.', 'success');
      fetchPipeline();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleAssign = async () => {
    setSubmitting(true);
    try {
      await projectApi.assignDrawingTeam(project.id, showAssignModal.id, {
        assignedArchitectId: assignForm.assignedArchitectId || null,
        juniorArchitectId: assignForm.juniorArchitectId || null,
        notes: assignForm.notes,
      });
      showToast('Team assigned.', 'success');
      setShowAssignModal(null);
      fetchPipeline();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleStatusChange = async (drawingId: string, status: string) => {
    try {
      await projectApi.updateDrawing(project.id, drawingId, { status });
      showToast('Status updated.', 'success');
      fetchPipeline();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
  };

  const handleApprovePM = async () => {
    setSubmitting(true);
    try {
      await projectApi.approveByPM(project.id);
      showToast('PM approval recorded.', 'success');
      fetchPipeline();
      onRefresh();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleApproveAdmin = async () => {
    setSubmitting(true);
    try {
      await projectApi.approveByAdmin(project.id);
      showToast('Admin approval recorded.', 'success');
      fetchPipeline();
      onRefresh();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await projectApi.uploadFile(fd);
      setFileForm(f => ({ ...f, fileUrl: res.data.url ?? res.data.fileUrl, fileName: file.name }));
    } catch { showToast('Upload failed.', 'error'); }
    finally { setUploading(false); }
  };

  const handleAddFile = async () => {
    if (!fileForm.fileUrl) { showToast('Please select a file.', 'error'); return; }
    setSubmitting(true);
    try {
      await projectApi.addDrawingFile(project.id, showFileUpload.id, fileForm);
      showToast('File added.', 'success');
      setShowFileUpload(null);
      setFileForm({ fileType: 'PDF', fileUrl: '', fileName: '' });
      fetchPipeline();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-4"><ShimmerTable rows={6} cols={3} /></div>;

  if (!pipeline) {
    return (
      <div className="space-y-3">
        <div className={`${card} p-8 text-center flex flex-col items-center gap-3`}>
          <div className="w-12 h-12 rounded-2xl bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.12)] flex items-center justify-center">
            <FileText size={20} className="text-[#b89047]/40" />
          </div>
          <p className="text-[13px] font-bold text-[var(--text-primary)]">Design Pipeline not initialized yet</p>
          <p className="text-[11.5px] text-[var(--text-muted)]">Go to <strong>Layout & Approval</strong>, send the draft to the client, and record their approval. The pipeline will be created automatically.</p>
        </div>
        {/* PM flow guide */}
        <div className={`${card} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3">How the Design Pipeline works</p>
          <div className="space-y-2.5">
            {[
              { step: '1', label: 'Client approves layout', desc: 'In Layout & Approval tab — architect uploads → admin reviews → PM sends to client → client approves.' },
              { step: '2', label: 'PM adds drawings', desc: 'Once pipeline is created, PM clicks "Add Drawing" to select required drawings from the master list (architectural, electrical, structural, etc.).' },
              { step: '3', label: 'Assign architects to drawings', desc: 'For each drawing, click the Team button to assign a Project Architect and/or Junior Architect.' },
              { step: '4', label: 'Architects complete drawings', desc: 'Architects update the drawing status (Not Started → In Progress → Review → Approved) and upload CAD/PDF files.' },
              { step: '5', label: 'PM & Admin approve', desc: 'Once all drawings are done, PM clicks "Approve as PM", then Admin clicks "Approve as Admin". Project is marked Completed.' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[rgba(184,144,71,0.12)] border border-[rgba(184,144,71,0.25)] flex items-center justify-center text-[10px] font-black text-[#b89047] shrink-0 mt-0.5">{s.step}</div>
                <div>
                  <p className="text-[12px] font-bold text-[var(--text-primary)]">{s.label}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Group drawings by category
  const byCategory: Record<string, any[]> = {};
  for (const d of (pipeline.drawings ?? [])) {
    const cat = d.drawingMaster?.category ?? 'OTHER';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(d);
  }

  const bothApproved = pipeline.approvedByPM && pipeline.approvedByAdmin;
  const allDrawingsApproved = (pipeline.drawings ?? []).length > 0 && (pipeline.drawings ?? []).every((d: any) => d.status === 'APPROVED');

  return (
    <div className="space-y-3">
      {/* PM next-step prompt */}
      {!bothApproved && isPM && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <AlertTriangle size={14} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="text-[11.5px] text-blue-800">
            <p className="font-bold mb-0.5">PM — Your next steps</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
              <li>Click <strong>Add Drawing</strong> to pick all required drawings for this project.</li>
              <li>For each drawing, click <strong>Team</strong> to assign an architect.</li>
              <li>Architects will update status and upload files as they work.</li>
              <li>Once all drawings are <strong>Approved</strong>, click <strong>Approve as PM</strong> below.</li>
            </ol>
          </div>
        </div>
      )}
      {allDrawingsApproved && !pipeline.approvedByPM && isPM && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-300 rounded-xl">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <p className="text-[12px] font-bold text-emerald-800">All drawings approved — ready for your PM sign-off below.</p>
        </div>
      )}
      {/* Approval gate card */}
      <div className={`${card} p-4`}>
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3 pb-2 border-b border-[var(--border)]">Approval Gate</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: 'Project Manager', approved: pipeline.approvedByPM, at: pipeline.approvedByPMAt, user: pipeline.approvedByPMUser },
            { label: 'Admin',           approved: pipeline.approvedByAdmin, at: pipeline.approvedByAdminAt, user: pipeline.approvedByAdminUser },
          ].map(g => (
            <div key={g.label} className={`flex items-center gap-3 p-3 rounded-xl border ${g.approved ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'border-[var(--border)]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${g.approved ? 'bg-emerald-500 text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'}`}>
                {g.approved ? <Check size={14} /> : <Clock size={14} />}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[var(--text-primary)]">{g.label}</p>
                {g.approved && g.user && <p className="text-[10.5px] text-emerald-600">{g.user.name}</p>}
                {!g.approved && <p className="text-[10.5px] text-[var(--text-muted)]">Pending</p>}
              </div>
            </div>
          ))}
        </div>
        {bothApproved && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 size={12} /> Both approvals complete — drawing work can begin.
          </div>
        )}
        <div className="flex gap-2 mt-3 flex-wrap">
          {canManage && !pipeline.approvedByPM && (isPM || isSuperAdmin) && (
            <button onClick={handleApprovePM} disabled={submitting} className={btnPrimary}>
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve as PM
            </button>
          )}
          {isSuperAdmin && !pipeline.approvedByAdmin && (
            <button onClick={handleApproveAdmin} disabled={submitting} className={btnPrimary}>
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve as Admin
            </button>
          )}
          {canManage && !bothApproved && (
            <button onClick={() => setShowAddDrawing(true)} className={btnSecondary}><Plus size={11} /> Add Drawing</button>
          )}
          {bothApproved && canManage && (
            <button onClick={() => setShowAddDrawing(true)} className={btnSecondary}><Plus size={11} /> Add Drawing</button>
          )}
        </div>
      </div>

      {/* Bulk delete bar */}
      {deleteSelectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl">
          <span className="text-[12px] font-semibold text-rose-700">{deleteSelectedIds.size} drawing{deleteSelectedIds.size !== 1 ? 's' : ''} selected for deletion</span>
          <div className="flex gap-2">
            <button onClick={() => setDeleteSelectedIds(new Set())} className={btnSecondary}>Cancel</button>
            <button onClick={handleBulkDelete} disabled={submitting} className={btnDanger}>
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Drawings by category */}
      {Object.keys(byCategory).length === 0 ? (
        <div className={`${card} p-8 text-center`}>
          <p className="text-[12px] text-[var(--text-muted)]">No drawings added yet. Use "Add Drawing" to build the drawing list.</p>
        </div>
      ) : (
        Object.entries(byCategory).map(([cat, drawings]) => (
          <div key={cat} className={`${card} overflow-hidden`}>
            <div className="px-4 py-2.5 bg-[var(--border)]/20 border-b border-[var(--border)]">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {CATEGORY_LABELS[cat] ?? cat} <span className="font-normal">({drawings.length})</span>
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {drawings.map((d: any) => (
                <div key={d.id} className={`p-3.5 ${d.pendingDelete ? 'bg-rose-50/40' : ''}`}>
                  {/* Pending delete banner */}
                  {d.pendingDelete && (
                    <div className="flex items-center gap-2 px-3 py-1.5 mb-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px]">
                      <Trash2 size={11} className="text-rose-500 shrink-0" />
                      <span className="text-rose-700 font-semibold">Pending Deletion</span>
                      {d.pendingDeleteRequestedBy && <span className="text-rose-500">— requested by {d.pendingDeleteRequestedBy.name}</span>}
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                          {d.drawingMaster?.name}
                          {d.roomName && <span className="text-[#b89047]"> — {d.roomName}</span>}
                          {d.wallDirection && <span className="text-[var(--text-muted)]"> ({d.wallDirection} Wall)</span>}
                        </p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-bold border ${DRAWING_STATUS_COLORS[d.status] ?? ''}`}>
                          {d.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-[var(--text-muted)]">
                        {d.assignedArchitect && <span>Arch: <span className="text-[var(--text-secondary)] font-semibold">{d.assignedArchitect.name}</span></span>}
                        {d.juniorArchitect && <span>Jr: <span className="text-[var(--text-secondary)] font-semibold">{d.juniorArchitect.name}</span></span>}
                        {!d.assignedArchitect && <span className="text-amber-600">No architect assigned</span>}
                      </div>
                      {d.notes && <p className="text-[11px] text-[var(--text-muted)] mt-1 italic">{d.notes}</p>}

                      {/* Files — thumbnails for images, styled chips for others */}
                      {d.files?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 items-end">
                          {d.files.map((f: any) => {
                            const fileUrl = `${BACKEND_BASE}${f.fileUrl}`;
                            const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.fileName);
                            return isImg ? (
                              <button key={f.id} type="button" onClick={() => setDrawingDocViewer({ url: fileUrl, fileName: f.fileName })}
                                className="group relative w-14 h-14 rounded-lg overflow-hidden border border-[rgba(184,144,71,0.3)] hover:border-[#b89047] transition-colors cursor-pointer bg-transparent p-0 shrink-0">
                                <img src={fileUrl} alt={f.fileName} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye size={12} className="text-white" />
                                </div>
                              </button>
                            ) : (
                              <button key={f.id} type="button" onClick={() => setDrawingDocViewer({ url: fileUrl, fileName: f.fileName })}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold text-[#b89047] bg-[rgba(184,144,71,0.06)] border-[rgba(184,144,71,0.25)] hover:bg-[rgba(184,144,71,0.12)] transition-colors cursor-pointer">
                                {f.fileType === 'IMAGE' ? <ImageIcon size={9} /> : <FileText size={9} />}
                                {f.fileType} — {f.fileName}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0 items-end">
                      {/* Super Admin: approve / reject pending delete */}
                      {isSuperAdmin && d.pendingDelete && (
                        <>
                          <button onClick={() => handleApproveDelete(d.id)} disabled={submitting} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 cursor-pointer transition-colors">
                            <Check size={10} /> Delete
                          </button>
                          <button onClick={() => handleRejectDelete(d.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors">
                            <XCircle size={10} /> Keep
                          </button>
                        </>
                      )}
                      {/* PM / Project Architect: request delete */}
                      {(canManage || isArch) && !d.pendingDelete && !isSuperAdmin && (
                        <button onClick={() => handleRequestDelete(d.id)} title="Request deletion approval"
                          className="p-1.5 rounded-lg text-[10px] text-rose-500 border border-rose-200 bg-rose-50 hover:bg-rose-100 cursor-pointer transition-colors">
                          <Trash2 size={11} />
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => { setShowAssignModal(d); setAssignForm({ assignedArchitectId: d.assignedArchitect?.id ?? '', juniorArchitectId: d.juniorArchitect?.id ?? '', notes: d.notes ?? '' }); }} className={btnSecondary}>
                          <Users size={10} /> Team
                        </button>
                      )}
                      {(canManage || isArch) && bothApproved && d.status !== 'APPROVED' && (
                        <select value={d.status} onChange={e => handleStatusChange(d.id, e.target.value)}
                          className="text-[10.5px] font-semibold bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2 py-1 outline-none focus:border-[#b89047] cursor-pointer text-[var(--text-secondary)]">
                          {(canManage
                            ? ['NOT_STARTED', 'IN_PROGRESS', 'REVIEW', 'APPROVED']
                            : ['IN_PROGRESS', 'REVIEW']
                          ).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                      )}
                      {bothApproved && (canManage || isArch) && (
                        <button onClick={() => { setShowFileUpload(d); setFileForm({ fileType: 'PDF', fileUrl: '', fileName: '' }); }} className={btnSecondary}>
                          <Upload size={10} /> File
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add drawing modal — multi-select */}
      {showAddDrawing && (() => {
        const existingIds = new Set<string>((pipeline.drawings ?? []).map((d: any) => d.drawingMasterId as string));
        const byCategory = drawingMaster.reduce((acc: any, d: any) => {
          const cat = CATEGORY_LABELS[d.category] ?? d.category;
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(d);
          return acc;
        }, {});
        return (
          <Modal title="Add Drawings to Pipeline" subtitle={selectedDrawingIds.size > 0 ? `${selectedDrawingIds.size} selected` : 'Select one or more drawings'} onClose={() => { setShowAddDrawing(false); setSelectedDrawingIds(new Set()); }}>
            <div className="flex flex-col" style={{ maxHeight: '60vh' }}>
              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
                {Object.entries(byCategory).map(([cat, items]: any) => {
                  const selectable = items.filter((d: any) => !existingIds.has(d.id));
                  const allCatSelected = selectable.length > 0 && selectable.every((d: any) => selectedDrawingIds.has(d.id));
                  return (
                    <div key={cat}>
                      {/* Category header + select all */}
                      <button type="button" onClick={() => toggleCategory(items, existingIds)}
                        className="flex items-center gap-2 w-full text-left mb-2 group cursor-pointer">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${allCatSelected ? 'bg-[#b89047] border-[#b89047]' : 'border-[var(--border)] group-hover:border-[#b89047]'}`}>
                          {allCatSelected && <Check size={9} className="text-white" />}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{cat}</span>
                        <span className="text-[9.5px] text-[var(--text-muted)] font-normal">({selectable.length} available)</span>
                      </button>
                      {/* Drawings in category */}
                      <div className="space-y-1 pl-1">
                        {items.map((d: any) => {
                          const alreadyAdded = existingIds.has(d.id);
                          const checked = selectedDrawingIds.has(d.id);
                          return (
                            <button key={d.id} type="button"
                              disabled={alreadyAdded}
                              onClick={() => !alreadyAdded && toggleDrawing(d.id)}
                              className={`flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-lg transition-colors cursor-pointer border-0 bg-transparent
                                ${alreadyAdded ? 'opacity-40 cursor-not-allowed' : checked ? 'bg-[rgba(184,144,71,0.08)]' : 'hover:bg-[var(--hover-bg,rgba(0,0,0,0.03))]'}`}>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-[#b89047] border-[#b89047]' : 'border-[var(--border)]'}`}>
                                {checked && <Check size={9} className="text-white" />}
                              </div>
                              <span className="text-[12px] text-[var(--text-primary)] flex-1">{d.name}</span>
                              {alreadyAdded && <span className="text-[9.5px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">Added</span>}
                              {d.isRoomBased && !alreadyAdded && <span className="text-[9px] text-[var(--text-muted)]">room-based</span>}
                              {d.isWallBased && !alreadyAdded && <span className="text-[9px] text-[var(--text-muted)]">wall-based</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {drawingMaster.length === 0 && (
                  <p className="text-[12px] text-[var(--text-muted)] text-center py-6">Loading drawings…</p>
                )}

                {/* Add custom drawing type */}
                <div className="border-t border-[var(--border)] pt-3 mt-1">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-2">Can't find it? Add a custom drawing type</p>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="text"
                      placeholder="Drawing name…"
                      value={customDrawingName}
                      onChange={e => setCustomDrawingName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && customDrawingName.trim() && handleAddCustomDrawing()}
                      className={`${inputBase} flex-1 min-w-[160px] text-[12px]`}
                    />
                    <select value={customDrawingCategory} onChange={e => setCustomDrawingCategory(e.target.value)}
                      className="text-[12px] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 outline-none focus:border-[#b89047] text-[var(--text-secondary)]">
                      {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <button onClick={handleAddCustomDrawing} disabled={addingCustom || !customDrawingName.trim()} className={btnSecondary}>
                      {addingCustom ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center gap-2 px-4 py-3 border-t border-[var(--border)] shrink-0">
                <span className="text-[11.5px] text-[var(--text-muted)]">
                  {selectedDrawingIds.size === 0 ? 'Select at least 1 drawing' : `${selectedDrawingIds.size} drawing${selectedDrawingIds.size !== 1 ? 's' : ''} selected`}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setShowAddDrawing(false); setSelectedDrawingIds(new Set()); }} className={btnSecondary}>Cancel</button>
                  <button onClick={handleAddDrawings} disabled={submitting || selectedDrawingIds.size === 0} className={btnPrimary}>
                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Add {selectedDrawingIds.size > 0 ? `${selectedDrawingIds.size} ` : ''}Drawing{selectedDrawingIds.size !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Assign team modal */}
      {showAssignModal && (
        <Modal title="Assign Team" subtitle={showAssignModal.drawingMaster?.name} onClose={() => setShowAssignModal(null)}>
          <div className="p-5 space-y-3">
            <div>
              <label className={label}>Project Architect</label>
              <select className={inputBase} value={assignForm.assignedArchitectId} onChange={e => setAssignForm(f => ({ ...f, assignedArchitectId: e.target.value }))}>
                <option value="">— None —</option>
                {architects.filter(u => u.role.name === 'Project Architect').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Junior Architect</label>
              <select className={inputBase} value={assignForm.juniorArchitectId} onChange={e => setAssignForm(f => ({ ...f, juniorArchitectId: e.target.value }))}>
                <option value="">— None —</option>
                {architects.filter(u => u.role.name === 'Junior Architect').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Notes</label>
              <textarea className={`${inputBase} resize-none`} rows={2} value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAssignModal(null)} className={btnSecondary}>Cancel</button>
              <button onClick={handleAssign} disabled={submitting} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />} Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* File upload modal */}
      {showFileUpload && (
        <Modal title="Upload Drawing File" subtitle={showFileUpload.drawingMaster?.name} onClose={() => setShowFileUpload(null)}>
          <div className="p-5 space-y-3">
            <div>
              <label className={label}>File Type</label>
              <select className={inputBase} value={fileForm.fileType} onChange={e => setFileForm(f => ({ ...f, fileType: e.target.value as any }))}>
                <option value="PDF">PDF</option>
                <option value="CAD">CAD (.dwg)</option>
                <option value="IMAGE">Image</option>
              </select>
            </div>
            <div>
              <label className={label}>File <span className="text-rose-500">*</span></label>
              <input type="file" accept=".pdf,.dwg,.jpg,.jpeg,.png" onChange={handleFileUpload} className="w-full text-[12px] text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[rgba(184,144,71,0.1)] file:text-[#b89047] hover:file:bg-[rgba(184,144,71,0.2)] cursor-pointer" />
              {uploading && <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Uploading…</p>}
              {fileForm.fileName && !uploading && <p className="text-[11px] text-emerald-600 mt-1">✓ {fileForm.fileName}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFileUpload(null)} className={btnSecondary}>Cancel</button>
              <button onClick={handleAddFile} disabled={submitting || uploading || !fileForm.fileUrl} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Drawing file inline viewer */}
      {drawingDocViewer && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-stone-950">
          <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-700 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={15} className="text-stone-400 shrink-0" />
              <span className="text-[13px] font-semibold text-stone-200 truncate">{drawingDocViewer.fileName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={drawingDocViewer.url} download className={`${btnSecondary} border-stone-600 text-stone-300 hover:border-stone-400`}>
                <Download size={11} /> Download
              </a>
              <button onClick={() => setDrawingDocViewer(null)} className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer border-0 bg-transparent transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-stone-900 flex items-center justify-center overflow-hidden">
            {/\.(jpg|jpeg|png|gif|webp)$/i.test(drawingDocViewer.fileName) ? (
              <img src={drawingDocViewer.url} alt={drawingDocViewer.fileName} className="max-w-full max-h-full object-contain" />
            ) : /\.pdf$/i.test(drawingDocViewer.fileName) ? (
              <iframe src={drawingDocViewer.url} title={drawingDocViewer.fileName} className="w-full h-full border-0" />
            ) : (
              <div className="text-center text-stone-400 space-y-3">
                <FileText size={40} className="mx-auto text-stone-600" />
                <p className="text-[13px]">Preview not available for this file type</p>
                <a href={drawingDocViewer.url} target="_blank" rel="noreferrer" className="text-[#b89047] hover:underline text-[12px]">Open in new tab</a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Transmittals Tab ─────────────────────────────────────────────────────────
function TransmittalsTab({ project, currentUser }: { project: any; currentUser: User }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState<any[]>([]);
  const [showSend, setShowSend] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendType, setSendType] = useState<'FULL_PROJECT' | 'SINGLE' | 'LAYOUT'>('FULL_PROJECT');
  const [sendDrawingId, setSendDrawingId] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [selectedFileUrls, setSelectedFileUrls] = useState<Set<string>>(new Set());

  const isAdmin      = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isPM         = project.assignment?.projectManager?.id === currentUser.id;
  const canSend      = isSuperAdmin || isPM;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, pipeRes, designRes] = await Promise.allSettled([
        projectApi.getTransmittals(project.id),
        projectApi.getDesignPipeline(project.id),
        projectApi.getDesigns(project.id),
      ]);
      if (logRes.status === 'fulfilled') setLogs(logRes.value.data.logs ?? []);
      if (pipeRes.status === 'fulfilled') setPipeline(pipeRes.value.data.pipeline);
      if (designRes.status === 'fulfilled') setDesigns(designRes.value.data.drafts ?? []);
    } catch { } finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleFile = (url: string) => setSelectedFileUrls(prev => { const n = new Set(prev); n.has(url) ? n.delete(url) : n.add(url); return n; });

  const allDrawingFiles = (pipeline?.drawings ?? []).flatMap((d: any) =>
    (d.files ?? []).map((f: any) => ({ ...f, drawingName: d.drawingMaster?.name, fullUrl: `${BACKEND_BASE}${f.fileUrl}` }))
  );

  const singleDrawing = sendType === 'SINGLE' ? (pipeline?.drawings ?? []).find((d: any) => d.id === sendDrawingId) : null;
  const singleDrawingFiles = (singleDrawing?.files ?? []).map((f: any) => ({ ...f, fullUrl: `${BACKEND_BASE}${f.fileUrl}` }));

  const layoutFiles = designs.filter((d: any) => d.status === 'APPROVED').map((d: any) => ({ id: d.id, fileName: d.fileName, fullUrl: `${BACKEND_BASE}${d.fileUrl}`, version: d.version, fileType: 'PDF' }));

  const openSend = () => {
    setSendType('FULL_PROJECT');
    setSendDrawingId('');
    setSendMessage('');
    const allUrls = new Set<string>(allDrawingFiles.map((f: any) => f.fullUrl as string));
    setSelectedFileUrls(allUrls);
    setShowSend(true);
  };

  const handleSend = async () => {
    const urls = [...selectedFileUrls];
    if (urls.length === 0) { showToast('Select at least one file.', 'error'); return; }
    if (sendType === 'SINGLE' && !sendDrawingId) { showToast('Select a drawing.', 'error'); return; }
    setSubmitting(true);
    try {
      await projectApi.sendTransmittal(project.id, {
        fileType: sendType,
        projectDrawingId: sendDrawingId || undefined,
        message: sendMessage,
        fileUrls: urls,
      });
      showToast('Transmittal sent and logged.', 'success');
      setShowSend(false);
      fetchData();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const TYPE_COLORS: Record<string, string> = {
    SINGLE:       'text-blue-700 bg-blue-50 border-blue-200',
    FULL_PROJECT: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    LAYOUT:       'text-purple-700 bg-purple-50 border-purple-200',
  };

  if (loading) return <div className="p-4"><ShimmerTable rows={4} cols={3} /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Transmittal History <span className="font-normal">({logs.length})</span>
        </p>
        {canSend && (
          <button onClick={openSend} className={btnPrimary}><Send size={11} /> Send to Client</button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className={`${card} p-10 text-center flex flex-col items-center gap-3`}>
          <div className="w-12 h-12 rounded-2xl bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.12)] flex items-center justify-center">
            <Send size={20} className="text-[#b89047]/40" />
          </div>
          <p className="text-[12px] text-[var(--text-muted)]">No transmittals sent yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => {
            const drawingName = log.projectDrawing?.drawingMaster?.name ?? null;
            return (
              <div key={log.id} className={`${card} p-3.5`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-bold border ${TYPE_COLORS[log.fileType] ?? ''}`}>
                        {log.fileType.replace(/_/g, ' ')}
                      </span>
                      {drawingName && <span className="text-[11.5px] font-semibold text-[var(--text-primary)] truncate">{drawingName}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[var(--text-muted)]">
                      <span>Sent by <span className="font-semibold text-[var(--text-secondary)]">{log.sentBy?.name}</span></span>
                      <span>To <span className="font-semibold text-[var(--text-secondary)]">{log.sentToName ?? log.sentToEmail}</span></span>
                      <span>{new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {log.message && <p className="text-[11.5px] text-[var(--text-secondary)] mt-1.5 italic">"{log.message}"</p>}
                    {Array.isArray(log.fileUrls) && log.fileUrls.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {log.fileUrls.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold text-[#b89047] bg-[rgba(184,144,71,0.06)] border-[rgba(184,144,71,0.25)] hover:bg-[rgba(184,144,71,0.12)] transition-colors">
                            <Eye size={9} /> File {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Send transmittal modal */}
      {showSend && (() => {
        const filesToShow =
          sendType === 'FULL_PROJECT' ? allDrawingFiles :
          sendType === 'SINGLE'       ? singleDrawingFiles :
                                        layoutFiles;
        return (
          <Modal title="Send to Client" subtitle={`${selectedFileUrls.size} file${selectedFileUrls.size !== 1 ? 's' : ''} selected`} onClose={() => setShowSend(false)}>
            <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {/* Type selector */}
                <div className="flex gap-2">
                  {([
                    { key: 'FULL_PROJECT', label: 'Full Project' },
                    { key: 'SINGLE',       label: 'Single Drawing' },
                    { key: 'LAYOUT',       label: 'Layout' },
                  ] as const).map(t => (
                    <button key={t.key} type="button" onClick={() => {
                      setSendType(t.key);
                      setSendDrawingId('');
                      if (t.key === 'FULL_PROJECT') setSelectedFileUrls(new Set<string>(allDrawingFiles.map((f: any) => f.fullUrl as string)));
                      else if (t.key === 'LAYOUT') setSelectedFileUrls(new Set<string>(layoutFiles.map((f: any) => f.fullUrl as string)));
                      else setSelectedFileUrls(new Set());
                    }}
                      className={`flex-1 py-2 rounded-lg text-[11.5px] font-bold border transition-all cursor-pointer ${sendType === t.key ? 'bg-[#b89047] border-[#b89047] text-white' : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Single drawing selector */}
                {sendType === 'SINGLE' && (
                  <div>
                    <label className={label}>Select Drawing <span className="text-rose-500">*</span></label>
                    <select className={inputBase} value={sendDrawingId} onChange={e => {
                      const did = e.target.value;
                      setSendDrawingId(did);
                      const drawing = (pipeline?.drawings ?? []).find((d: any) => d.id === did);
                      const urls = (drawing?.files ?? []).map((f: any) => `${BACKEND_BASE}${f.fileUrl}` as string);
                      setSelectedFileUrls(new Set<string>(urls));
                    }}>
                      <option value="">— Choose drawing —</option>
                      {(pipeline?.drawings ?? []).map((d: any) => (
                        <option key={d.id} value={d.id}>{d.drawingMaster?.name}{d.roomName ? ` — ${d.roomName}` : ''} ({d.files?.length ?? 0} files)</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* File list with checkboxes */}
                {filesToShow.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className={label}>Files to Send</label>
                      <button type="button" onClick={() => {
                        const allSelected = filesToShow.every((f: any) => selectedFileUrls.has(f.fullUrl));
                        setSelectedFileUrls(allSelected ? new Set() : new Set(filesToShow.map((f: any) => f.fullUrl)));
                      }} className="text-[10.5px] font-semibold text-[#b89047] hover:underline cursor-pointer">
                        {filesToShow.every((f: any) => selectedFileUrls.has(f.fullUrl)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    {filesToShow.map((f: any) => (
                      <button key={f.fullUrl} type="button" onClick={() => toggleFile(f.fullUrl)}
                        className={`flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-lg border transition-colors cursor-pointer ${selectedFileUrls.has(f.fullUrl) ? 'bg-[rgba(184,144,71,0.07)] border-[rgba(184,144,71,0.3)]' : 'border-[var(--border)] hover:border-[rgba(184,144,71,0.2)]'}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedFileUrls.has(f.fullUrl) ? 'bg-[#b89047] border-[#b89047]' : 'border-[var(--border)]'}`}>
                          {selectedFileUrls.has(f.fullUrl) && <Check size={9} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{f.fileName}</p>
                          {f.drawingName && <p className="text-[10px] text-[var(--text-muted)]">{f.drawingName}</p>}
                          {f.version && <p className="text-[10px] text-[var(--text-muted)]">v{f.version}</p>}
                        </div>
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${f.fileType === 'CAD' ? 'text-purple-700 bg-purple-50 border-purple-200' : f.fileType === 'IMAGE' ? 'text-sky-700 bg-sky-50 border-sky-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>{f.fileType}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-[var(--text-muted)] text-center py-4">
                    {sendType === 'SINGLE' && !sendDrawingId ? 'Select a drawing above to see its files.' :
                     sendType === 'LAYOUT' ? 'No approved layout files found.' :
                     'No files uploaded to the pipeline yet.'}
                  </p>
                )}

                {/* Message */}
                <div>
                  <label className={label}>Message to Client</label>
                  <textarea className={`${inputBase} resize-none`} rows={2} value={sendMessage} onChange={e => setSendMessage(e.target.value)} placeholder="Optional message…" />
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 px-4 py-3 border-t border-[var(--border)] shrink-0">
                <span className="text-[11.5px] text-[var(--text-muted)]">{selectedFileUrls.size} file{selectedFileUrls.size !== 1 ? 's' : ''} selected</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowSend(false)} className={btnSecondary}>Cancel</button>
                  <button onClick={handleSend} disabled={submitting || selectedFileUrls.size === 0} className={btnPrimary}>
                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send & Log
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const ProjectDetail: React.FC<Props> = ({ currentUser, projectId }) => {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getProjectById(projectId);
      setProject(res.data.project);
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to load project.', 'error');
    } finally { setLoading(false); }
  }, [projectId, showToast]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  if (loading) return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <ShimmerTable rows={1} cols={4} />
      <ShimmerTable rows={7} cols={4} />
    </div>
  );

  if (!project) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
      <AlertTriangle size={28} />
      <p className="text-[12px]">Project not found.</p>
      <button onClick={() => navigate('/projects')} className={btnSecondary}><ChevronLeft size={12} /> Back</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-2.5 p-2 overflow-y-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/projects')} className={btnSecondary + ' py-1 px-2.5'}>
          <ChevronLeft size={12} /> Projects
        </button>
        <span className="text-[11px] text-[var(--text-muted)]">/</span>
        <span className="text-[12px] font-semibold text-[var(--text-primary)]">{project.prospect?.client?.clientName}</span>
        <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[project.status] ?? 'text-stone-600 bg-stone-50 border-stone-200'}`}>
          {project.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto shrink-0">
        {(() => {
          const statusIdx = STATUS_ORDER.indexOf(project.status as typeof STATUS_ORDER[number]);
          return TABS.map(t => {
            const minIdx = STATUS_ORDER.indexOf(TAB_MIN_STATUS[t.id] as typeof STATUS_ORDER[number]);
            const isLocked = statusIdx < minIdx;
            return (
              <button key={t.id}
                onClick={() => {
                  if (isLocked) { showToast('Complete previous project stages first.', 'error'); return; }
                  setActiveTab(t.id);
                }}
                title={isLocked ? `Unlocks after: ${TAB_MIN_STATUS[t.id].replace(/_/g, ' ')}` : undefined}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[11.5px] font-semibold whitespace-nowrap border-b-2 transition-all border-0 bg-transparent
                  ${isLocked
                    ? 'border-transparent text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                    : activeTab === t.id
                      ? 'border-[#b89047] text-[#b89047] cursor-pointer'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer'}`}>
                {t.icon}{t.label}
                {isLocked && <Lock size={9} className="ml-0.5 opacity-70" />}
              </button>
            );
          });
        })()}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview'      && <OverviewTab      project={project} currentUser={currentUser} onRefresh={fetchProject} />}
        {activeTab === 'site'          && <SiteTab          project={project} currentUser={currentUser} onRefresh={fetchProject} />}
        {activeTab === 'cdrf-meetings' && <CdrfMeetingsTab  project={project} currentUser={currentUser} />}
        {activeTab === 'cdrf-form'     && <CdrfFormTab      project={project} currentUser={currentUser} />}
        {activeTab === 'design'        && <DesignTab        project={project} currentUser={currentUser} onRefresh={fetchProject} />}
        {activeTab === 'pipeline'      && <PipelineTab      project={project} currentUser={currentUser} onRefresh={fetchProject} />}
        {activeTab === 'transmittals'  && <TransmittalsTab  project={project} currentUser={currentUser} />}
      </div>
    </div>
  );
};
