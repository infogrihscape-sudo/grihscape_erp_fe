import React, { useState, useEffect, useCallback } from 'react';
import { projectApi, fileUrl } from '../../services/api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { ShimmerTable } from '../../components/Shimmer.js';
import { Send, Eye, Check, Loader2 } from 'lucide-react';
import {
  card, inputBase, btnPrimary, btnSecondary, label, Modal,
} from './shared.js';

export function TransmittalsTab({ project, currentUser }: { project: any; currentUser: User }) {
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
    (d.files ?? []).map((f: any) => ({ ...f, drawingName: d.drawingMaster?.name, fullUrl: fileUrl(f.fileUrl) }))
  );

  const singleDrawing = sendType === 'SINGLE' ? (pipeline?.drawings ?? []).find((d: any) => d.id === sendDrawingId) : null;
  const singleDrawingFiles = (singleDrawing?.files ?? []).map((f: any) => ({ ...f, fullUrl: fileUrl(f.fileUrl) }));

  const layoutFiles = designs.filter((d: any) => d.status === 'APPROVED').map((d: any) => ({ id: d.id, fileName: d.fileName, fullUrl: fileUrl(d.fileUrl), version: d.version, fileType: 'PDF' }));

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
                      const urls = (drawing?.files ?? []).map((f: any) => fileUrl(f.fileUrl) as string);
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
