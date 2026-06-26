import React, { useState, useEffect, useCallback, useRef } from 'react';
import { projectApi } from '../../services/api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { CDRFEditor } from '../../components/CDRFEditor.js';
import { ShimmerTable } from '../../components/Shimmer.js';
import { Loader2, FileText, Send } from 'lucide-react';
import { card, btnPrimary, btnSecondary } from './shared.js';

export function CdrfFormTab({ project, currentUser }: { project: any; currentUser: User }) {
  const { showToast } = useToast();
  const [formMeta, setFormMeta] = useState<{ completionPct: number; status: string } | null>(null);
  const [initialModules, setInitialModules] = useState<any[] | null>(null);
  const [editorKey, setEditorKey] = useState(0);
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

      {/* Full CDRF Editor */}
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
