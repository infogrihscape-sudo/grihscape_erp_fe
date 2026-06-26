import React, { useState, useEffect } from 'react';
import { projectApi } from '../../services/api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { CheckCircle2, Plus, Loader2, HardHat, Phone, Mail } from 'lucide-react';
import {
  card, inputBase, btnPrimary, btnSecondary, label,
  STATUS_BADGE, SERVICE_LABELS, ProjectPipelineStepper, Modal,
} from './shared.js';

export function OverviewTab({ project, currentUser, onRefresh }: { project: any; currentUser: User; onRefresh: () => void }) {
  const { showToast } = useToast();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [engineerId, setEngineerId] = useState('');
  const [constructionHeadId, setConstructionHeadId] = useState('');
  const [siteEngineers, setSiteEngineers] = useState<any[]>([]);
  const [constructionHeads, setConstructionHeads] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin     = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isPM        = project.assignment?.projectManager?.id === currentUser.id;
  const isCompleted = project.status === 'COMPLETED';
  const canAssign   = (isAdmin || isPM) && !isCompleted && project.assignment;

  const a = project.assignment;

  useEffect(() => {
    if (showAssignModal) {
      projectApi.getAssignableUsers().then(r => {
        const users = r.data.users ?? [];
        setSiteEngineers(users.filter((u: any) => u.role.name === 'Site Engineer'));
        setConstructionHeads(users.filter((u: any) => u.role.name === 'Construction Head'));
      }).catch(() => {});
      // Pre-fill existing values so re-assignment retains the current person
      setEngineerId(a?.siteEngineer?.id ?? '');
      setConstructionHeadId(a?.constructionHead?.id ?? '');
    }
  }, [showAssignModal, a]);

  const handleAssign = async () => {
    if (!engineerId && !constructionHeadId) {
      showToast('Select at least a Site Engineer or Construction Head.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await projectApi.assignFieldStaff(project.id, {
        siteEngineerId:    engineerId    || undefined,
        constructionHeadId: constructionHeadId || undefined,
      });
      showToast('Field staff assigned successfully.', 'success');
      setShowAssignModal(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to assign.', 'error');
    } finally { setSubmitting(false); }
  };

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

  const teamMembers = [
    { role: 'Project Manager',    user: a?.projectManager },
    { role: 'Project Architect',  user: a?.projectArchitect },
    a?.juniorArchitect   && { role: 'Junior Architect',  user: a.juniorArchitect },
    a?.siteEngineer      && { role: 'Site Engineer',     user: a.siteEngineer },
    a?.constructionHead  && { role: 'Construction Head', user: a.constructionHead },
  ].filter(Boolean) as { role: string; user: any }[];

  return (
    <div className="space-y-3">
      <ProjectPipelineStepper status={project.status} />

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
          {canAssign && (
            <button onClick={() => setShowAssignModal(true)} className={btnSecondary}>
              <Plus size={11} />
              {a?.siteEngineer || a?.constructionHead ? 'Manage Field Staff' : 'Assign Field Staff'}
            </button>
          )}
        </div>
        {a ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teamMembers.map(t => (
              <div key={t.role} className="flex items-start gap-3 p-3 bg-[var(--bg-secondary,rgba(0,0,0,0.02))] rounded-lg border border-[var(--border)]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b89047] to-[#7c5e2a] flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">
                  {t.user.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-[var(--text-primary)] truncate">{t.user.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mb-1.5">{t.role}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {t.user.phone && (
                      <a href={`tel:${t.user.phone}`} className="flex items-center gap-1 text-[10.5px] text-[var(--text-secondary)] hover:text-[#b89047] transition-colors">
                        <Phone size={9} className="shrink-0" />
                        {t.user.phone}
                      </a>
                    )}
                    {t.user.email && (
                      <a href={`mailto:${t.user.email}`} className="flex items-center gap-1 text-[10.5px] text-[var(--text-secondary)] hover:text-[#b89047] transition-colors truncate">
                        <Mail size={9} className="shrink-0" />
                        {t.user.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-amber-600">Team not yet assigned.</p>
        )}
        {a?.notes && <p className="text-[11px] text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border)]">{a.notes}</p>}
      </div>

      {/* Assign field staff modal */}
      {showAssignModal && (
        <Modal title="Assign Field Staff" subtitle="Site Engineer and Construction Head for this project" onClose={() => setShowAssignModal(false)}>
          <div className="p-5 space-y-4">
            <div>
              <label className={label}>
                Site Engineer <span className="text-stone-400">(optional)</span>
              </label>
              <select value={engineerId} onChange={e => setEngineerId(e.target.value)} className={inputBase}>
                <option value="">— None —</option>
                {siteEngineers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                {siteEngineers.length === 0 && <option disabled>No site engineers available</option>}
              </select>
            </div>
            <div>
              <label className={label}>
                Construction Head <span className="text-stone-400">(optional)</span>
              </label>
              <select value={constructionHeadId} onChange={e => setConstructionHeadId(e.target.value)} className={inputBase}>
                <option value="">— None —</option>
                {constructionHeads.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                {constructionHeads.length === 0 && <option disabled>No construction heads available</option>}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAssignModal(false)} className={btnSecondary}>Cancel</button>
              <button
                onClick={handleAssign}
                disabled={(!engineerId && !constructionHeadId) || submitting}
                className={btnPrimary}
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <HardHat size={12} />}
                Assign
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
