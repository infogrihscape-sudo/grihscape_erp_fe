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
  MapPin, HardHat, Users, Clock, Palette, Check,
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
  COMPLETED:          'text-emerald-700 bg-emerald-50 border-emerald-200',
};

type TabId = 'overview' | 'site' | 'cdrf-meetings' | 'cdrf-form' | 'design';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',      label: 'Overview',        icon: <Building2 size={13} /> },
  { id: 'site',          label: 'Site Verification', icon: <MapPin size={13} /> },
  { id: 'cdrf-meetings', label: 'CDRF Meetings',   icon: <CalendarDays size={13} /> },
  { id: 'cdrf-form',     label: 'CDRF Form',        icon: <ClipboardCheck size={13} /> },
  { id: 'design',        label: 'Design & Approval', icon: <Upload size={13} /> },
];

// ─── Project pipeline stages ──────────────────────────────────────────────────
const PROJECT_PIPELINE = [
  { key: 'PENDING_ASSIGNMENT', label: 'Pending',       icon: <Clock size={11} /> },
  { key: 'ASSIGNED',           label: 'Team Assigned', icon: <Users size={11} /> },
  { key: 'SITE_VERIFICATION',  label: 'Site Check',    icon: <MapPin size={11} /> },
  { key: 'CDRF_PENDING',       label: 'CDRF',          icon: <ClipboardCheck size={11} /> },
  { key: 'DESIGN_REVIEW',      label: 'Design',        icon: <Palette size={11} /> },
  { key: 'COMPLETED',          label: 'Completed',     icon: <CheckCircle2 size={11} /> },
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
          <span className="text-[#b89047] font-semibold">{SERVICE_LABELS[prospect.serviceType] ?? prospect.serviceType}</span>
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

  const isAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isPM = project.assignment?.projectManager?.id === currentUser.id;
  const isCompleted = project.status === 'COMPLETED';

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
    { label: 'Service',   value: SERVICE_LABELS[p?.serviceType] ?? p?.serviceType },
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
          {(isAdmin || isPM) && !isCompleted && !a?.siteEngineer && a && (
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

  const isCompleted = project.status === 'COMPLETED';
  const isAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isPM = project.assignment?.projectManager?.id === currentUser.id;
  const isSiteEngineer = project.assignment?.siteEngineer?.id === currentUser.id;
  const canEdit = !isCompleted && (isAdmin || isSiteEngineer);
  const canReview = !isCompleted && (isAdmin || isPM);

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

  const isPM = project.assignment?.projectManager?.id === currentUser.id;
  const isAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isCompleted = project.status === 'COMPLETED';
  const canManage = !isCompleted && (isPM || isAdmin);

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
              <input type="datetime-local" className={inputBase} value={meetForm.scheduledAt} onChange={e => setMeetForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            </div>
            {meetForm.meetingType === 'ONLINE' && (
              <div><label className={label}>Meeting Link</label>
                <input className={inputBase} value={meetForm.meetingLink} onChange={e => setMeetForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="https://…" />
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

  const isPM    = project.assignment?.projectManager?.id === currentUser.id;
  const isAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isArch  = currentUser.role === 'Project Architect' || currentUser.role === 'Junior Architect';
  const canEdit = isPM || isAdmin || isArch;

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
function DesignTab({ project, currentUser }: { project: any; currentUser: User }) {
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showSend, setShowSend] = useState<any>(null);
  const [showReview, setShowReview] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isPM = project.assignment?.projectManager?.id === currentUser.id;
  const isArch = project.assignment?.projectArchitect?.id === currentUser.id ||
                 project.assignment?.juniorArchitect?.id === currentUser.id;
  const isCompleted = project.status === 'COMPLETED';
  const canUpload = !isCompleted && (isAdmin || isArch);
  const canReview = !isCompleted && isAdmin;
  const canSend = !isCompleted && (isAdmin || isPM);

  const clientEmail = project.prospect?.client?.email;
  const clientName  = project.prospect?.client?.clientName;

  const [uploadForm, setUploadForm] = useState({ fileUrl: '', fileName: '' });
  const [uploading, setUploading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED' as 'APPROVED' | 'REJECTED', reviewNotes: '' });
  const [sendForm, setSendForm] = useState({ notes: '', clientMeetingDate: '', clientMeetingNotes: '' });

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

  const STATUS_COLORS: Record<string, string> = {
    PENDING_REVIEW: 'text-amber-700 bg-amber-50 border-amber-200',
    APPROVED:       'text-emerald-700 bg-emerald-50 border-emerald-200',
    REJECTED:       'text-rose-700 bg-rose-50 border-rose-200',
  };

  if (loading) return <div className="p-4"><ShimmerTable rows={5} cols={3} /></div>;

  const approvedCount = drafts.filter(d => d.status === 'APPROVED').length;
  const pendingCount  = drafts.filter(d => d.status === 'PENDING_REVIEW').length;
  const rejectedCount = drafts.filter(d => d.status === 'REJECTED').length;
  const sentCount     = drafts.filter(d => d.designEmailSentAt).length;

  return (
    <div className="space-y-3">
      {/* Client strip + upload button */}
      <div className="flex items-center gap-3 flex-wrap">
        <ClientContactBanner client={project.prospect?.client} prospect={project.prospect} />
        {canUpload && (
          <button onClick={() => setShowUpload(true)} className={btnPrimary + ' shrink-0'}>
            <Upload size={11} /> Upload Layout
          </button>
        )}
      </div>

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
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <a href={`${BACKEND_BASE}${d.fileUrl}`} target="_blank" rel="noreferrer" className={btnSecondary}>
                        <Eye size={11} /> View
                      </a>
                      {canReview && d.status === 'PENDING_REVIEW' && (
                        <button onClick={() => { setShowReview(d); setReviewForm({ status: 'APPROVED', reviewNotes: '' }); }} className={btnPrimary}>
                          <CheckCircle2 size={11} /> Review
                        </button>
                      )}
                      {canSend && d.status === 'APPROVED' && !d.designEmailSentAt && (
                        <button onClick={() => { setShowSend(d); setSendForm({ notes: '', clientMeetingDate: '', clientMeetingNotes: '' }); }} className={btnPrimary}>
                          <Send size={11} /> Send
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

      {/* Send to client modal */}
      {showSend && (
        <Modal title="Send Design to Client" subtitle={`v${showSend.version} — ${showSend.fileName}`} onClose={() => setShowSend(null)}>
          <div className="p-5 space-y-3">
            {clientEmail && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.18)] rounded-lg text-[11.5px]">
                <Send size={11} className="text-[#b89047] shrink-0" />
                <span className="text-[var(--text-muted)]">Will be sent to:</span>
                <span className="font-semibold text-[var(--text-primary)]">{clientName}</span>
                <span className="text-[#b89047]">&lt;{clientEmail}&gt;</span>
              </div>
            )}
            <div><label className={label}>Notes / Message</label>
              <textarea className={`${inputBase} resize-none`} rows={3} value={sendForm.notes} onChange={e => setSendForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional message to the client…" />
            </div>
            <div><label className={label}>Client Meeting Date <span className="text-stone-400">(optional)</span></label>
              <input type="datetime-local" className={inputBase} value={sendForm.clientMeetingDate} onChange={e => setSendForm(f => ({ ...f, clientMeetingDate: e.target.value }))} />
            </div>
            {sendForm.clientMeetingDate && (
              <div><label className={label}>Meeting Notes</label>
                <textarea className={`${inputBase} resize-none`} rows={2} value={sendForm.clientMeetingNotes} onChange={e => setSendForm(f => ({ ...f, clientMeetingNotes: e.target.value }))} />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSend(null)} className={btnSecondary}>Cancel</button>
              <button onClick={() => handleSendToClient(showSend.id)} disabled={submitting} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send to Client
              </button>
            </div>
          </div>
        </Modal>
      )}
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
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[11.5px] font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer border-0 bg-transparent
              ${activeTab === t.id
                ? 'border-[#b89047] text-[#b89047]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview'      && <OverviewTab      project={project} currentUser={currentUser} onRefresh={fetchProject} />}
        {activeTab === 'site'          && <SiteTab          project={project} currentUser={currentUser} onRefresh={fetchProject} />}
        {activeTab === 'cdrf-meetings' && <CdrfMeetingsTab  project={project} currentUser={currentUser} />}
        {activeTab === 'cdrf-form'     && <CdrfFormTab      project={project} currentUser={currentUser} />}
        {activeTab === 'design'        && <DesignTab        project={project} currentUser={currentUser} />}
      </div>
    </div>
  );
};
