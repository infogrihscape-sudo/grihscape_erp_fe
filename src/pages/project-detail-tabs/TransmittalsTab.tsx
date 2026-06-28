import React, { useState, useEffect, useCallback } from 'react';
import {
  Send, Download, FileText, FileImage, Eye, Check, Loader2, X,
  ChevronDown, ChevronRight, Paperclip, Mail, Archive, Clock,
  AlertCircle, ExternalLink, PackageOpen, ScrollText, HardHat, Layers,
} from 'lucide-react';
import { projectApi, fileUrl } from '../../services/api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { createPortal } from 'react-dom';
import { ShimmerTable } from '../../components/Shimmer.js';
import { card, btnPrimary, btnSecondary, inputBase, label } from './shared.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocFile {
  id: string;
  fileName: string;
  fileUrl: string;
  date?: string;
  // optional enrichments
  stage?: string;
  type?: string;
  status?: string;
  version?: number;
  fileType?: string;
  drawingName?: string;
  drawingCategory?: string;
  roomName?: string | null;
  uploadedBy?: string;
}

interface ClientDocs {
  proposal: DocFile[];
  contracts: DocFile[];
  site: DocFile[];
  layouts: DocFile[];
  pipeline: DocFile[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FILE_TYPE_BADGE: Record<string, string> = {
  CAD:   'bg-violet-50 text-violet-700 border-violet-200',
  PDF:   'bg-rose-50   text-rose-700   border-rose-200',
  IMAGE: 'bg-sky-50    text-sky-700    border-sky-200',
};

const STATUS_DOT: Record<string, string> = {
  APPROVED:         'bg-emerald-400',
  CLIENT_APPROVED:  'bg-emerald-400',
  SIGNED:           'bg-emerald-400',
  PENDING_REVIEW:   'bg-amber-400',
  DRAFT:            'bg-sky-400',
  REJECTED:         'bg-rose-400',
  REVISION_REQUIRED:'bg-amber-400',
};

function authUrl(u: string) {
  return u.startsWith('http') ? u : fileUrl(u);
}

function rawPath(u: string) {
  if (u.startsWith('/uploads/')) return u;
  try { return new URL(u).pathname; } catch { return u; }
}

function fmt(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function FileTypeIcon({ type }: { type?: string }) {
  if (type === 'IMAGE') return <FileImage size={13} className="text-sky-500 shrink-0" />;
  return <FileText size={13} className="text-[#b89047] shrink-0" />;
}

// ─── Single file row ──────────────────────────────────────────────────────────

function FileRow({
  file, selected, onToggle,
}: { file: DocFile; selected: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border
        ${selected
          ? 'bg-[rgba(184,144,71,0.07)] border-[rgba(184,144,71,0.35)]'
          : 'border-transparent hover:bg-white/3 hover:border-[var(--border)]'}`}
    >
      {/* Checkbox */}
      <div className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 transition-all
        ${selected ? 'bg-[#b89047] border-[#b89047]' : 'border-[var(--border)]'}`}>
        {selected && <Check size={10} className="text-white" />}
      </div>

      {/* Icon */}
      <FileTypeIcon type={file.fileType} />

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate leading-tight">
          {file.drawingName ? `${file.drawingName}${file.roomName ? ` — ${file.roomName}` : ''}` : file.fileName}
        </p>
        <p className="text-[10px] text-[var(--text-muted)] truncate">
          {file.drawingName ? file.fileName : ''}
          {file.date ? (file.drawingName ? '  ·  ' : '') + fmt(file.date) : ''}
          {file.uploadedBy ? `  ·  ${file.uploadedBy}` : ''}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {file.status && (
          <span className="flex items-center gap-1 text-[9.5px] font-bold">
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[file.status] ?? 'bg-stone-400'}`} />
          </span>
        )}
        {file.version && (
          <span className="text-[9.5px] font-semibold text-[var(--text-muted)] bg-[var(--card-bg)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">v{file.version}</span>
        )}
        {file.fileType && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${FILE_TYPE_BADGE[file.fileType] ?? 'bg-stone-50 text-stone-600 border-stone-200'}`}>
            {file.fileType}
          </span>
        )}
        {file.type && (
          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border ${file.type === 'SIGNED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
            {file.type}
          </span>
        )}
      </div>

      {/* View link */}
      <a
        href={authUrl(file.fileUrl)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="p-1.5 rounded-lg hover:bg-white/8 text-[var(--text-muted)] hover:text-[#b89047] transition-colors shrink-0"
        title="Open file"
      >
        <ExternalLink size={12} />
      </a>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  icon, title, color, files, selected, onToggleFile, onToggleAll,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  files: DocFile[];
  selected: Set<string>;
  onToggleFile: (id: string) => void;
  onToggleAll: (ids: string[], allOn: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const ids = files.map(f => f.id);
  const allOn = ids.length > 0 && ids.every(id => selected.has(id));
  const someOn = ids.some(id => selected.has(id));

  if (files.length === 0) return null;

  return (
    <div className={`${card} overflow-hidden`}>
      {/* Section header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border)]">
        {/* Section checkbox */}
        <button
          onClick={() => onToggleAll(ids, allOn)}
          className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer
            ${allOn ? 'bg-[#b89047] border-[#b89047]' : someOn ? 'bg-[rgba(184,144,71,0.3)] border-[#b89047]' : 'border-[var(--border)]'}`}
        >
          {allOn ? <Check size={10} className="text-white" /> : someOn ? <div className="w-1.5 h-1.5 rounded-full bg-[#b89047]" /> : null}
        </button>

        <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-bold text-[var(--text-primary)]">{title}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{files.length} file{files.length !== 1 ? 's' : ''} · {ids.filter(id => selected.has(id)).length} selected</p>
        </div>
        <button onClick={() => setOpen(o => !o)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer bg-transparent border-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {open && (
        <div className="p-2 space-y-0.5">
          {files.map(f => (
            <FileRow
              key={f.id}
              file={f}
              selected={selected.has(f.id)}
              onToggle={() => onToggleFile(f.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Send modal ───────────────────────────────────────────────────────────────

function SendModal({
  projectId, selectedFiles, clientName, onClose, onSent,
}: {
  projectId: string;
  selectedFiles: DocFile[];
  clientName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await projectApi.sendClientDocuments(projectId, {
        fileUrls: selectedFiles.map(f => authUrl(f.fileUrl)),
        fileNames: selectedFiles.map(f => f.fileName),
        message: message.trim() || undefined,
      });
      showToast(`${selectedFiles.length} document${selectedFiles.length > 1 ? 's' : ''} sent to ${clientName}.`, 'success');
      onSent();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to send email.', 'error');
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`${card} w-full max-w-md`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#b89047] to-[#9e7735] flex items-center justify-center">
              <Mail size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[var(--text-primary)]">Send to Client</p>
              <p className="text-[10.5px] text-[var(--text-muted)]">Email to <span className="font-semibold">{clientName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Selected files preview */}
          <div className="rounded-xl bg-[rgba(184,144,71,0.05)] border border-[rgba(184,144,71,0.15)] p-3 space-y-1.5 max-h-40 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} will be sent
            </p>
            {selectedFiles.map(f => (
              <div key={f.id} className="flex items-center gap-2">
                <FileText size={11} className="text-[#b89047] shrink-0" />
                <span className="text-[11px] text-[var(--text-secondary)] truncate">{f.fileName}</span>
              </div>
            ))}
          </div>

          {/* Message */}
          <div>
            <label className={label}>Message to Client <span className="normal-case font-normal text-[var(--text-muted)]">(optional)</span></label>
            <textarea
              className={`${inputBase} resize-none`}
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a personal note for the client…"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className={`${btnSecondary} flex-1`}>Cancel</button>
          <button
            onClick={handleSend}
            disabled={sending}
            className={`${btnPrimary} flex-1 justify-center`}
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {sending ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Transmittal history ──────────────────────────────────────────────────────

function HistoryLog({ logs }: { logs: any[] }) {
  const [open, setOpen] = useState(false);
  if (logs.length === 0) return null;

  return (
    <div className={card}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer bg-transparent border-0 text-left"
      >
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-[var(--text-muted)]" />
          <span className="text-[12px] font-semibold text-[var(--text-secondary)]">Send History ({logs.length})</span>
        </div>
        {open ? <ChevronDown size={14} className="text-[var(--text-muted)]" /> : <ChevronRight size={14} className="text-[var(--text-muted)]" />}
      </button>

      {open && (
        <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
          {logs.map((log: any) => (
            <div key={log.id} className="px-4 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[rgba(184,144,71,0.1)] border border-[rgba(184,144,71,0.2)] flex items-center justify-center shrink-0 mt-0.5">
                <Send size={11} className="text-[#b89047]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11.5px] font-semibold text-[var(--text-primary)]">
                    {Array.isArray(log.fileUrls) ? log.fileUrls.length : 0} file{Array.isArray(log.fileUrls) && log.fileUrls.length !== 1 ? 's' : ''} sent
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">→ {log.sentToName ?? log.sentToEmail}</span>
                </div>
                <div className="text-[10.5px] text-[var(--text-muted)] mt-0.5">
                  by <span className="font-semibold text-[var(--text-secondary)]">{log.sentBy?.name}</span>
                  {' · '}
                  {new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                {log.message && (
                  <p className="text-[11px] text-[var(--text-secondary)] italic mt-1">"{log.message}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main tab ────────────────────────────────────────────────────────────────

export function TransmittalsTab({ project, currentUser }: { project: any; currentUser: User }) {
  const { showToast } = useToast();
  const [docs, setDocs] = useState<ClientDocs | null>(null);
  const [client, setClient] = useState<{ name: string; email: string | null } | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isSuperAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isPM = project.assignment?.projectManager?.id === currentUser.id;
  const canSend = isSuperAdmin || isPM;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, logsRes] = await Promise.allSettled([
        projectApi.getClientDocuments(project.id),
        projectApi.getTransmittals(project.id),
      ]);
      if (docsRes.status === 'fulfilled') {
        setDocs(docsRes.value.data.docs);
        setClient(docsRes.value.data.client);
      }
      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value.data.logs ?? []);
      }
    } catch {
      showToast('Failed to load documents.', 'error');
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const allFiles = docs
    ? [...docs.proposal, ...docs.contracts, ...docs.site, ...docs.layouts, ...docs.pipeline]
    : [];
  const allIds = allFiles.map(f => f.id);
  const allOn = allIds.length > 0 && allIds.every(id => selected.has(id));

  function toggleFile(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll(ids: string[], wasAllOn: boolean) {
    setSelected(prev => {
      const n = new Set(prev);
      if (wasAllOn) ids.forEach(id => n.delete(id));
      else ids.forEach(id => n.add(id));
      return n;
    });
  }

  function toggleGlobalAll() {
    setSelected(allOn ? new Set() : new Set(allIds));
  }

  const selectedFiles = allFiles.filter(f => selected.has(f.id));

  async function handleDownloadZip() {
    if (selectedFiles.length === 0) { showToast('Select at least one file.', 'error'); return; }
    setDownloading(true);
    try {
      const filePaths = selectedFiles.map(f => rawPath(f.fileUrl));
      const res = await projectApi.downloadClientDocumentsZip(project.id, filePaths);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${client?.name ?? 'project'}-documents.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast('Failed to generate ZIP.', 'error');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <div className="p-4"><ShimmerTable rows={4} cols={3} /></div>;

  const totalFiles = allIds.length;

  return (
    <div className="flex flex-col gap-4 pb-28">
      {/* Hero header */}
      <div className="rounded-2xl bg-gradient-to-br from-[rgba(184,144,71,0.08)] via-[rgba(184,144,71,0.03)] to-transparent border border-[rgba(184,144,71,0.18)] p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#b89047] to-[#7c5e2a] flex items-center justify-center shrink-0 shadow-lg shadow-[rgba(184,144,71,0.3)]">
          <PackageOpen size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[var(--text-primary)]">Document Vault</p>
          <p className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
            All documents collected across this project's lifecycle
            {client?.email ? <> · Client: <span className="font-semibold text-[#b89047]">{client.email}</span></> : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[22px] font-black text-[#b89047]">{totalFiles}</p>
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Total Files</p>
        </div>
      </div>

      {/* Global toolbar */}
      {totalFiles > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleGlobalAll}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer
              ${allOn
                ? 'bg-[rgba(184,144,71,0.1)] border-[rgba(184,144,71,0.4)] text-[#b89047]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[#b89047]/40'}`}
          >
            <div className={`w-[14px] h-[14px] rounded border-2 flex items-center justify-center transition-all
              ${allOn ? 'bg-[#b89047] border-[#b89047]' : 'border-current'}`}>
              {allOn && <Check size={8} className="text-white" />}
            </div>
            {allOn ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-[11px] text-[var(--text-muted)] px-1">
            {selected.size} of {totalFiles} selected
          </span>
        </div>
      )}

      {/* No docs at all */}
      {totalFiles === 0 && (
        <div className={`${card} p-12 text-center flex flex-col items-center gap-3`}>
          <div className="w-14 h-14 rounded-2xl bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.12)] flex items-center justify-center">
            <PackageOpen size={24} className="text-[#b89047]/30" />
          </div>
          <p className="text-[13px] font-semibold text-[var(--text-muted)]">No documents collected yet</p>
          <p className="text-[11px] text-[var(--text-muted)] max-w-sm">Documents will appear here as the project progresses through proposal, contract, site verification, layout, and design stages.</p>
        </div>
      )}

      {/* Document sections */}
      <Section
        icon={<ScrollText size={14} className="text-amber-600" />}
        title="Proposal Documents"
        color="bg-amber-50 border border-amber-100"
        files={docs?.proposal ?? []}
        selected={selected}
        onToggleFile={toggleFile}
        onToggleAll={toggleAll}
      />

      <Section
        icon={<Paperclip size={14} className="text-sky-600" />}
        title="Contract Documents"
        color="bg-sky-50 border border-sky-100"
        files={docs?.contracts ?? []}
        selected={selected}
        onToggleFile={toggleFile}
        onToggleAll={toggleAll}
      />

      <Section
        icon={<AlertCircle size={14} className="text-purple-600" />}
        title="Site Verification"
        color="bg-purple-50 border border-purple-100"
        files={docs?.site ?? []}
        selected={selected}
        onToggleFile={toggleFile}
        onToggleAll={toggleAll}
      />

      <Section
        icon={<Layers size={14} className="text-teal-600" />}
        title="Layout & Approvals"
        color="bg-teal-50 border border-teal-100"
        files={docs?.layouts ?? []}
        selected={selected}
        onToggleFile={toggleFile}
        onToggleAll={toggleAll}
      />

      <Section
        icon={<HardHat size={14} className="text-indigo-600" />}
        title="Design Pipeline Drawings"
        color="bg-indigo-50 border border-indigo-100"
        files={docs?.pipeline ?? []}
        selected={selected}
        onToggleFile={toggleFile}
        onToggleAll={toggleAll}
      />

      {/* Transmittal history */}
      <HistoryLog logs={logs} />

      {/* ── Sticky bottom action bar ─────────────────────────────────────── */}
      {canSend && (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-3xl mx-auto px-4 pb-4">
            <div className={`${card} px-4 py-3 flex items-center gap-3 shadow-2xl shadow-black/20`}>
              {/* Selection summary */}
              <div className="flex-1 min-w-0">
                {selected.size === 0 ? (
                  <p className="text-[11.5px] text-[var(--text-muted)]">Select files above to send or download</p>
                ) : (
                  <div>
                    <p className="text-[12px] font-bold text-[var(--text-primary)]">{selected.size} file{selected.size !== 1 ? 's' : ''} selected</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      {selectedFiles.slice(0, 3).map(f => f.fileName).join(', ')}
                      {selectedFiles.length > 3 ? ` +${selectedFiles.length - 3} more` : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <button
                onClick={handleDownloadZip}
                disabled={selected.size === 0 || downloading}
                className={`${btnSecondary} gap-2`}
              >
                {downloading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Archive size={13} />}
                Download ZIP
              </button>

              <button
                onClick={() => {
                  if (selected.size === 0) { showToast('Select at least one file.', 'error'); return; }
                  setShowSendModal(true);
                }}
                disabled={selected.size === 0}
                className={btnPrimary}
              >
                <Mail size={13} /> Send to Client
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendModal && (
        <SendModal
          projectId={project.id}
          selectedFiles={selectedFiles}
          clientName={client?.name ?? 'Client'}
          onClose={() => setShowSendModal(false)}
          onSent={load}
        />
      )}
    </div>
  );
}
