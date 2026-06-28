import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Send, Loader2, MessageSquare, ChevronDown, ChevronRight,
  ExternalLink, Clock, PackageOpen, HardHat,
} from 'lucide-react';
import { projectApi, fileUrl } from '../../services/api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { card, btnPrimary, btnSecondary, inputBase, label } from './shared.js';
import { ShimmerTable } from '../../components/Shimmer.js';

function fmt(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function authUrl(u: string) {
  return u.startsWith('http') ? u : fileUrl(u);
}

// ─── Remarks thread ───────────────────────────────────────────────────────────

function RemarksThread({
  remarks,
  currentUser,
  onAdd,
}: {
  remarks: any[];
  currentUser: User;
  onAdd: (msg: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]/60">
      {/* Thread toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 mb-2 cursor-pointer bg-transparent border-0 p-0"
      >
        <MessageSquare size={12} className="text-[#b89047]" />
        <span className="text-[11px] font-bold text-[var(--text-secondary)]">
          Remarks & Feedback ({remarks.length})
        </span>
        {open
          ? <ChevronDown size={11} className="text-[var(--text-muted)]" />
          : <ChevronRight size={11} className="text-[var(--text-muted)]" />}
      </button>

      {open && (
        <div className="space-y-2 pl-3 border-l-2 border-[rgba(184,144,71,0.25)]">
          {remarks.length === 0 && (
            <p className="text-[10.5px] text-[var(--text-muted)] italic">No remarks yet. Be the first to add one.</p>
          )}
          {remarks.map((r: any) => (
            <div key={r.id} className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--text-primary)]">{r.author?.name ?? 'Unknown'}</span>
                {r.author?.role?.name && (
                  <span className="text-[9px] font-semibold text-[var(--text-muted)] bg-[var(--border)] px-1.5 py-0.5 rounded-full">{r.author.role.name}</span>
                )}
                <span className="text-[9.5px] text-[var(--text-muted)]">· {fmt(r.createdAt)}</span>
              </div>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed bg-[rgba(184,144,71,0.04)] border border-[rgba(184,144,71,0.1)] rounded-lg px-3 py-2">
                {r.message}
              </p>
            </div>
          ))}

          {/* Add remark input */}
          <div className="pt-1 space-y-1.5">
            <textarea
              className={`${inputBase} resize-none text-[11.5px]`}
              rows={2}
              placeholder="Add a remark, question, or site note…"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={submitting || !text.trim()}
                className={`${btnPrimary} py-1.5 text-[11px]`}
              >
                {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                {submitting ? 'Posting…' : 'Post Remark'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single issued drawing card ───────────────────────────────────────────────

function IssuedDrawingCard({
  log,
  currentUser,
  onRemarkAdded,
}: {
  log: any;
  currentUser: User;
  onRemarkAdded: () => void;
}) {
  const { showToast } = useToast();
  const drawing = log.projectDrawing;
  const fileUrls: string[] = Array.isArray(log.fileUrls) ? log.fileUrls : [];

  const drawingLabel = drawing
    ? `${drawing.drawingMaster?.name}${drawing.roomName ? ` — ${drawing.roomName}` : ''}${drawing.wallDirection ? ` (${drawing.wallDirection} Wall)` : ''}`
    : 'Drawing Package';

  const handleAddRemark = async (message: string) => {
    try {
      await projectApi.addDrawingRemark(log.projectId, log.id, message);
      showToast('Remark posted.', 'success');
      onRemarkAdded();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to post remark.', 'error');
      throw err;
    }
  };

  return (
    <div className={`${card} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#b89047] to-[#9e7735] flex items-center justify-center shrink-0 shadow-sm shadow-[rgba(184,144,71,0.3)]">
            <FileText size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">{drawingLabel}</p>
            <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">
              Issued by <span className="font-semibold text-[var(--text-secondary)]">{log.sentBy?.name}</span>
              {' · '}
              <Clock size={9} className="inline-block" /> {fmt(log.createdAt)}
            </p>
          </div>
        </div>
        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 shrink-0">
          {fileUrls.length} file{fileUrls.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Instructions */}
      {log.message && (
        <div className="px-3 py-2 rounded-lg bg-[rgba(184,144,71,0.05)] border border-[rgba(184,144,71,0.15)]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">Instructions</p>
          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{log.message}</p>
        </div>
      )}

      {/* Files */}
      <div className="space-y-1">
        <p className="text-[9.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Drawing Files</p>
        <div className="flex flex-wrap gap-1.5">
          {fileUrls.map((url: string, i: number) => (
            <a
              key={i}
              href={authUrl(url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.2)] text-[11px] font-semibold text-[#b89047] hover:bg-[rgba(184,144,71,0.12)] transition-colors"
            >
              <ExternalLink size={10} /> File {i + 1}
            </a>
          ))}
        </div>
      </div>

      {/* Remarks */}
      <RemarksThread
        remarks={log.remarks ?? []}
        currentUser={currentUser}
        onAdd={handleAddRemark}
      />
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function IssuedDrawingsTab({ project, currentUser }: { project: any; currentUser: User }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getIssuedDrawings(project.id);
      setLogs(res.data.logs ?? []);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to load issued drawings.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-4"><ShimmerTable rows={4} cols={3} /></div>;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 pb-12">
      {/* Hero header */}
      <div className="rounded-2xl bg-gradient-to-br from-[rgba(184,144,71,0.08)] via-[rgba(184,144,71,0.03)] to-transparent border border-[rgba(184,144,71,0.18)] p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#b89047] to-[#7c5e2a] flex items-center justify-center shrink-0 shadow-lg shadow-[rgba(184,144,71,0.3)]">
          <HardHat size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[var(--text-primary)]">Issued Drawings</p>
          <p className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
            Drawings sent to you by the design team. Review, download, and add your site remarks below.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[22px] font-black text-[#b89047]">{logs.length}</p>
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Received</p>
        </div>
      </div>

      {/* Empty state */}
      {logs.length === 0 && (
        <div className={`${card} p-12 text-center flex flex-col items-center gap-3`}>
          <div className="w-14 h-14 rounded-2xl bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.12)] flex items-center justify-center">
            <PackageOpen size={24} className="text-[#b89047]/30" />
          </div>
          <p className="text-[13px] font-semibold text-[var(--text-muted)]">No drawings issued yet</p>
          <p className="text-[11px] text-[var(--text-muted)] max-w-sm">
            The project manager or architect will issue drawings to you here once they are ready. Check back after the design pipeline is approved.
          </p>
        </div>
      )}

      {/* Drawing cards */}
      {logs.map((log: any) => (
        <IssuedDrawingCard
          key={log.id}
          log={log}
          currentUser={currentUser}
          onRemarkAdded={load}
        />
      ))}
    </div>
  );
}
