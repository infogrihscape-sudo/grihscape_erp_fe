import React, { useState, useEffect, useCallback } from 'react';
import { projectApi } from '../../services/api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { ShimmerTable } from '../../components/Shimmer.js';
import {
  CheckCircle2, Plus, Loader2, HardHat, X, SquarePen,
  Compass, Maximize2, Droplets, Shield, AlertTriangle,
  Layers, FileText, MapPin, Check,
} from 'lucide-react';
import {
  card, inputBase, btnPrimary, btnSecondary, label,
  ClientContactBanner,
} from './shared.js';

// ── Direction compass layout ──────────────────────────────────────────────────
const COMPASS_GRID = [
  ['NW', 'N',  'NE'],
  ['W',  '',   'E' ],
  ['SW', 'S',  'SE'],
] as const;

const DIR_FULL: Record<string, string> = {
  N: 'North', S: 'South', E: 'East', W: 'West',
  NE: 'North-East', NW: 'North-West', SE: 'South-East', SW: 'South-West',
};

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
        <span className="text-[#b89047]">{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{title}</p>
      </div>
      {children}
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label: lbl, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={label}>{lbl}</label>
      {children}
    </div>
  );
}

// ── Feature toggle card ───────────────────────────────────────────────────────
function FeatureCard({
  icon, title, active, onClick, children,
}: {
  icon: React.ReactNode; title: string; active: boolean;
  onClick: () => void; children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${active ? 'border-[#b89047] bg-[rgba(184,144,71,0.05)]' : 'border-[var(--border)] bg-[var(--bg)]'}`}>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer bg-transparent border-0 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`transition-colors ${active ? 'text-[#b89047]' : 'text-[var(--text-muted)]'}`}>{icon}</span>
          <span className="text-[12.5px] font-semibold text-[var(--text-primary)]">{title}</span>
        </div>
        <div className={`w-9 h-5 rounded-full transition-all duration-200 flex items-center relative ${active ? 'bg-[#b89047]' : 'bg-[var(--border)]'}`}>
          <div className={`absolute w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-200 ${active ? 'left-4' : 'left-0.5'}`} />
        </div>
      </button>
      {active && children && (
        <div className="px-4 pb-4 pt-1 border-t border-[rgba(184,144,71,0.2)] space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

// ── View info row ─────────────────────────────────────────────────────────────
function InfoRow({ lbl, value }: { lbl: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9.5px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-0.5">{lbl}</p>
      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function SiteTab({ project, currentUser, onRefresh }: { project: any; currentUser: User; onRefresh: () => void }) {
  const { showToast } = useToast();
  const [sv, setSv]         = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isCompleted    = project.status === 'COMPLETED';
  const isAdmin        = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isSuperAdmin   = isAdmin;
  const isPM           = project.assignment?.projectManager?.id === currentUser.id;
  const isSiteEngineer = project.assignment?.siteEngineer?.id === currentUser.id;
  const canEdit        = !isCompleted && (isAdmin || isSiteEngineer);
  const canReview      = !isCompleted && (isAdmin || isPM);

  const [form, setForm] = useState({
    length: '', width: '', unit: 'FEET', facingDirection: '',
    borewellExists: false, borewellLat: '', borewellLng: '',
    wallExists: false, wallNotes: '',
    manholeExists: false, manholeNotes: '',
    additionalNotes: '',
    roadLevels: [] as { description: string; level: string }[],
    fileUrls: [] as { url: string; name: string }[],
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const fetchSv = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await projectApi.getSiteVerification(project.id);
      const data = res.data.siteVerification;
      setSv(data);
      if (data) {
        setForm({
          length: data.length?.toString() ?? '',
          width:  data.width?.toString()  ?? '',
          unit:   data.unit  ?? 'FEET',
          facingDirection: data.facingDirection ?? '',
          borewellExists: !!data.borewellExists,
          borewellLat: data.borewellLat ?? '',
          borewellLng: data.borewellLng ?? '',
          wallExists:   !!data.wallExists,
          wallNotes:    data.wallNotes   ?? '',
          manholeExists: !!data.manholeExists,
          manholeNotes:  data.manholeNotes ?? '',
          additionalNotes: data.additionalNotes ?? '',
          roadLevels: data.roadLevels ?? [],
          fileUrls:   data.fileUrls   ?? [],
        });
      }
    } catch { } finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { fetchSv(); }, [fetchSv]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await projectApi.submitSiteVerification(project.id, {
        ...form,
        length: form.length ? parseFloat(form.length) : null,
        width:  form.width  ? parseFloat(form.width)  : null,
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

  const addRoadLevel    = () => setForm(f => ({ ...f, roadLevels: [...f.roadLevels, { description: '', level: '' }] }));
  const updateRoadLevel = (i: number, key: 'description' | 'level', val: string) =>
    setForm(f => ({ ...f, roadLevels: f.roadLevels.map((r, idx) => idx === i ? { ...r, [key]: val } : r) }));
  const removeRoadLevel = (i: number) =>
    setForm(f => ({ ...f, roadLevels: f.roadLevels.filter((_, idx) => idx !== i) }));

  // ── Area helper ─────────────────────────────────────────────────────────────
  const area = form.length && form.width
    ? `${(parseFloat(form.length) * parseFloat(form.width)).toLocaleString('en-IN')} sq. ${form.unit === 'FEET' ? 'ft' : 'm'}`
    : null;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return <div className="p-4"><ShimmerTable rows={6} cols={3} /></div>;

  // ── No site engineer assigned ───────────────────────────────────────────────
  if (!project.assignment?.siteEngineer && !sv) {
    return (
      <div className="space-y-3">
        <ClientContactBanner client={project.prospect?.client} prospect={project.prospect} />
        <div className={`${card} p-10 flex flex-col items-center gap-3 text-center`}>
          <div className="w-14 h-14 rounded-2xl bg-[rgba(184,144,71,0.08)] border border-[rgba(184,144,71,0.15)] flex items-center justify-center">
            <HardHat size={26} className="text-[#b89047]/50" />
          </div>
          <p className="text-[13px] font-semibold text-[var(--text-secondary)]">No Site Engineer Assigned</p>
          <p className="text-[11px] text-[var(--text-muted)] max-w-xs">Assign a site engineer to the project to begin the site verification process.</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Client banner */}
      <ClientContactBanner client={project.prospect?.client} prospect={project.prospect} />

      {/* Status + Actions row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {sv && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${sv.status === 'REVIEWED' ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800' : 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800'}`}>
              {sv.status === 'REVIEWED' ? <Check size={10} /> : <MapPin size={10} />}
              {sv.status}
            </span>
          )}
          {sv?.submittedBy && (
            <span className="text-[11px] text-[var(--text-muted)]">by {sv.submittedBy.name}</span>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className={btnSecondary}>
              <SquarePen size={11} /> {sv ? 'Edit' : 'Fill Form'}
            </button>
          )}
          {canReview && sv?.status === 'SUBMITTED' && (
            <button onClick={handleReview} disabled={submitting} className={btnPrimary}>
              {submitting ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
              Mark Reviewed
            </button>
          )}
        </div>
      </div>

      {/* ── EDIT FORM ─────────────────────────────────────────────────────────── */}
      {editing ? (
        <div className={`${card} overflow-hidden`}>
          {/* Form header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-[rgba(184,144,71,0.07)] to-transparent border-b border-[var(--border)] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#b89047] to-[#9e7735] flex items-center justify-center">
              <MapPin size={13} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[var(--text-primary)]">Site Verification Form</p>
              <p className="text-[10px] text-[var(--text-muted)]">Record site measurements and observations</p>
            </div>
          </div>

          <div className="p-5 space-y-6">

            {/* ── 1. DIMENSIONS ───────────────────────────────────────── */}
            <Section icon={<Maximize2 size={13} />} title="Plot Dimensions">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <Field label="Length">
                  <input type="number" step="0.01" className={inputBase} value={form.length}
                    onChange={e => set('length', e.target.value)} placeholder="e.g. 40" />
                </Field>
                <Field label="Width">
                  <input type="number" step="0.01" className={inputBase} value={form.width}
                    onChange={e => set('width', e.target.value)} placeholder="e.g. 60" />
                </Field>
                <Field label="Unit">
                  <select className={inputBase} value={form.unit} onChange={e => set('unit', e.target.value)}>
                    <option value="FEET">Feet</option>
                    <option value="METERS">Meters</option>
                  </select>
                </Field>
              </div>
              {area && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(184,144,71,0.07)] border border-[rgba(184,144,71,0.2)]">
                  <span className="text-[#b89047]"><Maximize2 size={12} /></span>
                  <span className="text-[11px] font-semibold text-[#b89047]">Calculated Area: <strong>{area}</strong></span>
                </div>
              )}
            </Section>

            {/* ── 2. FACING DIRECTION ─────────────────────────────────── */}
            <Section icon={<Compass size={13} />} title="Facing Direction">
              <div className="flex items-start gap-5">
                {/* 3×3 compass grid */}
                <div className="grid grid-cols-3 gap-1.5 w-36 shrink-0">
                  {COMPASS_GRID.flat().map((d, i) => d ? (
                    <button
                      key={d} type="button"
                      onClick={() => set('facingDirection', form.facingDirection === d ? '' : d)}
                      className={`h-10 rounded-lg text-[11px] font-bold transition-all duration-150 border cursor-pointer ${
                        form.facingDirection === d
                          ? 'bg-gradient-to-br from-[#b89047] to-[#9e7735] text-white border-[#b89047] shadow-md scale-105'
                          : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-[#b89047]/50 hover:text-[#b89047]'
                      }`}
                    >
                      {d}
                    </button>
                  ) : (
                    <div key={`empty-${i}`} className="h-10 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#b89047]/30 ring-2 ring-[rgba(184,144,71,0.15)]" />
                    </div>
                  ))}
                </div>
                {/* Direction label */}
                <div className="flex flex-col justify-center gap-1 pt-1">
                  {form.facingDirection ? (
                    <>
                      <p className="text-[22px] font-black text-[#b89047] leading-none">{form.facingDirection}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{DIR_FULL[form.facingDirection]}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] font-semibold text-[var(--text-muted)]">Not selected</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Tap a direction on the compass</p>
                    </>
                  )}
                </div>
              </div>
            </Section>

            {/* ── 3. SITE FEATURES ────────────────────────────────────── */}
            <Section icon={<Shield size={13} />} title="Site Features">
              <div className="space-y-2.5">
                <FeatureCard
                  icon={<Droplets size={16} />}
                  title="Borewell"
                  active={form.borewellExists}
                  onClick={() => set('borewellExists', !form.borewellExists)}
                >
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Field label="Latitude">
                      <input className={inputBase} value={form.borewellLat}
                        onChange={e => set('borewellLat', e.target.value)} placeholder="e.g. 28.6139" />
                    </Field>
                    <Field label="Longitude">
                      <input className={inputBase} value={form.borewellLng}
                        onChange={e => set('borewellLng', e.target.value)} placeholder="e.g. 77.2090" />
                    </Field>
                  </div>
                </FeatureCard>

                <FeatureCard
                  icon={<Shield size={16} />}
                  title="Existing Boundary Wall"
                  active={form.wallExists}
                  onClick={() => set('wallExists', !form.wallExists)}
                >
                  <div className="mt-2">
                    <Field label="Wall Notes">
                      <textarea className={`${inputBase} resize-none`} rows={2}
                        value={form.wallNotes} onChange={e => set('wallNotes', e.target.value)}
                        placeholder="Describe wall condition, material, height…" />
                    </Field>
                  </div>
                </FeatureCard>

                <FeatureCard
                  icon={<AlertTriangle size={16} />}
                  title="Manhole Present"
                  active={form.manholeExists}
                  onClick={() => set('manholeExists', !form.manholeExists)}
                >
                  <div className="mt-2">
                    <Field label="Manhole Notes">
                      <textarea className={`${inputBase} resize-none`} rows={2}
                        value={form.manholeNotes} onChange={e => set('manholeNotes', e.target.value)}
                        placeholder="Location, depth, condition…" />
                    </Field>
                  </div>
                </FeatureCard>
              </div>
            </Section>

            {/* ── 4. ROAD LEVELS ──────────────────────────────────────── */}
            <Section icon={<Layers size={13} />} title="Road Level Data">
              <div className="space-y-2">
                {form.roadLevels.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <div className="grid grid-cols-[1fr_120px_36px] text-[9.5px] font-bold uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg)] px-3 py-2 border-b border-[var(--border)]">
                      <span>Description</span><span>Level (m)</span><span />
                    </div>
                    {form.roadLevels.map((r, i) => (
                      <div key={i} className="grid grid-cols-[1fr_120px_36px] items-center gap-2 px-3 py-2 border-b border-[var(--border)] last:border-0">
                        <input
                          className="text-[12px] bg-transparent border-0 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-full"
                          placeholder={`Road ${i + 1} description`}
                          value={r.description}
                          onChange={e => updateRoadLevel(i, 'description', e.target.value)}
                        />
                        <input
                          className="text-[12px] bg-transparent border-0 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-full font-mono"
                          placeholder="±0.00"
                          value={r.level}
                          onChange={e => updateRoadLevel(i, 'level', e.target.value)}
                        />
                        <button type="button" onClick={() => removeRoadLevel(i)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer border-0 bg-transparent">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={addRoadLevel}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-[var(--border)] text-[11px] font-semibold text-[var(--text-muted)] hover:border-[#b89047]/50 hover:text-[#b89047] transition-colors cursor-pointer bg-transparent">
                  <Plus size={12} /> Add Road Level
                </button>
              </div>
            </Section>

            {/* ── 5. ADDITIONAL NOTES ─────────────────────────────────── */}
            <Section icon={<FileText size={13} />} title="Additional Notes">
              <textarea
                className={`${inputBase} resize-none`}
                rows={3}
                value={form.additionalNotes}
                onChange={e => set('additionalNotes', e.target.value)}
                placeholder="Any other site observations, constraints, or relevant details…"
              />
            </Section>

          </div>

          {/* Form actions */}
          <div className="flex justify-end gap-2 px-5 py-4 bg-[var(--bg)] border-t border-[var(--border)]">
            <button type="button" onClick={() => setEditing(false)} className={btnSecondary}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={submitting} className={btnPrimary}>
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Save Site Data
            </button>
          </div>
        </div>

      ) : sv ? (
        /* ── VIEW MODE ───────────────────────────────────────────────────────── */
        <div className="space-y-3">

          {/* ── Hero: dimensions + direction ─────────────────────────── */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-[#b89047] to-[#f59e0b]" />
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Plot Size</p>
                <p className="text-[20px] font-black text-[var(--text-primary)] leading-none">
                  {sv.length} <span className="text-[14px] text-[var(--text-muted)] font-normal">×</span> {sv.width}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sv.unit?.toLowerCase()}</p>
              </div>
              {sv.length && sv.width && (
                <div>
                  <p className="text-[9.5px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Area</p>
                  <p className="text-[20px] font-black text-[#b89047] leading-none">
                    {(sv.length * sv.width).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">sq. {sv.unit === 'FEET' ? 'ft' : 'm'}</p>
                </div>
              )}
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Facing</p>
                {sv.facingDirection ? (
                  <>
                    <p className="text-[20px] font-black text-[var(--text-primary)] leading-none">{sv.facingDirection}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{DIR_FULL[sv.facingDirection] ?? sv.facingDirection}</p>
                  </>
                ) : <p className="text-[14px] text-[var(--text-muted)]">—</p>}
              </div>
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Submitted By</p>
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">{sv.submittedBy?.name ?? '—'}</p>
                {sv.submittedAt && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {new Date(sv.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Site features ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: <Droplets size={18} />,
                label: 'Borewell',
                exists: sv.borewellExists,
                detail: sv.borewellExists && sv.borewellLat
                  ? `${sv.borewellLat}, ${sv.borewellLng}` : null,
              },
              {
                icon: <Shield size={18} />,
                label: 'Boundary Wall',
                exists: sv.wallExists,
                detail: sv.wallExists ? sv.wallNotes : null,
              },
              {
                icon: <AlertTriangle size={18} />,
                label: 'Manhole',
                exists: sv.manholeExists,
                detail: sv.manholeExists ? sv.manholeNotes : null,
              },
            ].map(f => (
              <div key={f.label} className={`rounded-xl border p-4 flex flex-col gap-2 transition-all ${
                f.exists
                  ? 'border-[#b89047]/40 bg-[rgba(184,144,71,0.05)]'
                  : 'border-[var(--border)] bg-[var(--card-bg)] opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={f.exists ? 'text-[#b89047]' : 'text-[var(--text-muted)]'}>{f.icon}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                    f.exists
                      ? 'bg-[#b89047]/15 text-[#b89047]'
                      : 'bg-[var(--border)]/50 text-[var(--text-muted)]'
                  }`}>
                    {f.exists ? <Check size={8} /> : <X size={8} />}
                    {f.exists ? 'Present' : 'Absent'}
                  </span>
                </div>
                <p className="text-[12.5px] font-bold text-[var(--text-primary)]">{f.label}</p>
                {f.detail && (
                  <p className="text-[10.5px] text-[var(--text-secondary)] leading-snug">{f.detail}</p>
                )}
              </div>
            ))}
          </div>

          {/* ── Road levels ───────────────────────────────────────────── */}
          {sv.roadLevels?.length > 0 && (
            <div className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
                <Layers size={13} className="text-[#b89047]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Road Level Data</p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {sv.roadLevels.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 text-[12.5px]">
                    <span className="text-[var(--text-secondary)]">{r.description || `Road ${i + 1}`}</span>
                    <span className={`font-mono font-bold px-2.5 py-0.5 rounded-md text-[11px] ${
                      r.level?.toString().startsWith('-')
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                    }`}>
                      {r.level}{!r.level?.toString().includes('m') ? 'm' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Additional notes ──────────────────────────────────────── */}
          {sv.additionalNotes && (
            <div className={`${card} p-4 flex gap-3`}>
              <FileText size={14} className="text-[#b89047] shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Additional Notes</p>
                <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">{sv.additionalNotes}</p>
              </div>
            </div>
          )}

        </div>

      ) : (
        /* ── EMPTY STATE ─────────────────────────────────────────────────────── */
        <div className={`${card} p-12 flex flex-col items-center gap-4 text-center`}>
          <div className="w-16 h-16 rounded-2xl bg-[rgba(184,144,71,0.07)] border border-[rgba(184,144,71,0.15)] flex items-center justify-center">
            <MapPin size={28} className="text-[#b89047]/40" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[var(--text-primary)] mb-1">No Site Data Yet</p>
            <p className="text-[11px] text-[var(--text-muted)] max-w-xs">The site verification form hasn't been submitted yet. Fill it in to proceed.</p>
          </div>
          {canEdit && (
            <button onClick={() => setEditing(true)} className={btnPrimary}>
              <Plus size={13} /> Fill Verification Form
            </button>
          )}
        </div>
      )}
    </div>
  );
}
