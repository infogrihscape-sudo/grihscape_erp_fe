import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { projectApi, fileUrl } from '../../services/api.js';
import { makeUniqueFileName } from '../../utils/validators.js';
import { uniqueFileName } from '../../utils/fileUtils.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { ShimmerTable } from '../../components/Shimmer.js';
import { FileUploadZone } from '../../components/ui/FileUploadZone.js';
import {
  Upload, Eye, CheckCircle2, XCircle, Loader2,
  AlertTriangle, Clock, Send, MessageSquare, Download, X, FileText, Check, RefreshCw
} from 'lucide-react';
import {
  card, inputBase, btnPrimary, btnSecondary, btnDanger, label,
  ClientContactBanner, Modal,
} from './shared.js';

export function DesignTab({ project, currentUser, onRefresh }: { project: any; currentUser: User; onRefresh: () => void }) {
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
    PENDING_CLIENT:    'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40',
    REVISION_REQUESTED: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/30',
    CLIENT_APPROVED:   'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/30',
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

      {/* Active status banners */}
      {revisionRequested && !isCompleted && (
        <div className="flex items-start gap-3 px-4 py-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-xl">
          <AlertTriangle size={15} className="text-orange-500 dark:text-orange-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-bold text-orange-800 dark:text-orange-300">Client Requested Revision</p>
            <p className="text-[11.5px] text-orange-700 dark:text-orange-400 mt-0.5">
              The client has asked for changes on <strong>v{latestDraft.version}</strong>.
              {canUpload ? ' Upload a revised layout file to start the next review cycle.' : ' Waiting for the architect to upload a revised version.'}
            </p>
          </div>
        </div>
      )}
      {awaitingAdminReview && !revisionRequested && !isCompleted && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl">
          <Clock size={15} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12.5px] font-bold text-amber-800 dark:text-amber-300">Waiting for Admin Review</p>
            <p className="text-[11.5px] text-amber-700 dark:text-amber-400 mt-0.5">v{latestDraft.version} has been uploaded. Admin needs to approve or reject it before it can be sent to the client.</p>
          </div>
        </div>
      )}
      {awaitingSend && !isCompleted && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-xl">
          <Send size={15} className="text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12.5px] font-bold text-blue-800 dark:text-blue-300">Ready to Send to Client</p>
            <p className="text-[11.5px] text-blue-700 dark:text-blue-400 mt-0.5">v{latestDraft.version} is approved. PM or Admin can now send it to the client for review.</p>
          </div>
        </div>
      )}
      {awaitingResponse && !isCompleted && (
        <div className="flex items-start gap-3 px-4 py-3 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/30 rounded-xl">
          <Clock size={15} className="text-sky-500 dark:text-sky-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-bold text-sky-800 dark:text-sky-300">Awaiting Client Response — v{latestDraft.version} sent</p>
            <p className="text-[11.5px] text-sky-700 dark:text-sky-400 mt-0.5 mb-2">When the client gives feedback, record their response here:</p>
            {canRecordClientResp && (
              <button
                onClick={() => { setShowClientResponse(latestDraft); setClientResponseForm({ response: 'APPROVED', notes: '' }); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-sky-600 hover:bg-sky-700 hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0">
                <CheckCircle2 size={12} /> Record Client Response
              </button>
            )}
          </div>
        </div>
      )}
      {clientApproved && (
        <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl">
          <CheckCircle2 size={15} className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12.5px] font-bold text-emerald-800 dark:text-emerald-300">Layout Approved — Design Pipeline Active</p>
            <p className="text-[11.5px] text-emerald-700 dark:text-emerald-400 mt-0.5">Client approved the layout. Go to the <strong>Design Pipeline</strong> tab to add drawings, assign architects, and track progress.</p>
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
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] px-0.5">
            Version History ({drafts.length} revision{drafts.length !== 1 ? 's' : ''})
          </p>
          {drafts.map((d, idx) => {
            const isLatest = idx === 0;
            return (
              <div key={d.id} className={`${card} overflow-hidden ${isLatest ? 'ring-1 ring-[rgba(184,144,71,0.3)]' : ''}`}>
                <div className={`h-1 w-full ${
                  d.status === 'APPROVED'       ? 'bg-emerald-500' :
                  d.status === 'REJECTED'        ? 'bg-rose-400' :
                                                   'bg-amber-400'}`}
                />
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black border ${
                      d.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' :
                      d.status === 'REJECTED' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400' :
                                                'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                    }`}>
                      v{d.version}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[d.status]}`}>
                          {d.status.replace(/_/g, ' ')}
                        </span>
                        {isLatest && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(184,144,71,0.12)] text-[#b89047] border border-[rgba(184,144,71,0.25)]">LATEST</span>}
                      </div>
                      <p className="text-[13.5px] font-bold text-[var(--text-primary)] truncate mb-2">{d.fileName}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[11.5px]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#b89047] shrink-0" />
                          <span className="text-[var(--text-muted)]">Uploaded by</span>
                          <span className="font-semibold text-[var(--text-secondary)]">{d.uploadedBy?.name ?? '—'}</span>
                          <span className="text-[var(--text-muted)] ml-auto shrink-0">
                            {new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        {d.reviewedBy && (
                          <div className="flex items-center gap-2 text-[11.5px]">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="text-[var(--text-muted)]">{d.status === 'APPROVED' ? 'Approved' : 'Rejected'} by</span>
                            <span className="font-semibold text-[var(--text-secondary)]">{d.reviewedBy.name}</span>
                            {d.reviewNotes && <span className="text-[var(--text-muted)]">— {d.reviewNotes}</span>}
                          </div>
                        )}
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
                        {d.clientStatus && (
                          <div className="flex items-center gap-2 text-[11.5px] flex-wrap">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.clientStatus === 'CLIENT_APPROVED' ? 'bg-teal-500' : d.clientStatus === 'REVISION_REQUESTED' ? 'bg-orange-500' : 'bg-blue-400'}`} />
                            <span className={`font-semibold px-1.5 py-0.5 rounded-full text-[10px] border ${CLIENT_STATUS_COLORS[d.clientStatus] ?? ''}`}>
                              {CLIENT_STATUS_LABELS[d.clientStatus] ?? d.clientStatus}
                            </span>
                          </div>
                        )}
                        {d.layoutFeedback?.length > 0 && (() => {
                          const latest = d.layoutFeedback[0];
                          return latest.notes || latest.fileUrl ? (
                            <div className={`mt-2 p-3 rounded-lg border text-[11.5px] backdrop-blur-xs ${
                              latest.response === 'REVISION_REQUIRED'
                                ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30'
                                : 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30'
                            }`}>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <MessageSquare size={10} className={latest.response === 'REVISION_REQUIRED' ? 'text-amber-500' : 'text-emerald-500'} />
                                <span className={`font-bold text-[9px] uppercase tracking-wider ${
                                  latest.response === 'REVISION_REQUIRED' ? 'text-amber-800 dark:text-amber-400' : 'text-emerald-800 dark:text-emerald-400'
                                }`}>
                                  Client Feedback — {latest.createdBy?.name}
                                </span>
                              </div>
                              {latest.notes && (
                                <p className={`leading-relaxed text-[11.5px] ${
                                  latest.response === 'REVISION_REQUIRED' ? 'text-amber-900 dark:text-amber-200' : 'text-emerald-900 dark:text-emerald-200'
                                }`}>
                                  {latest.notes}
                                </p>
                              )}
                              {latest.fileUrl && (
                                <button onClick={() => setDocViewer({ url: fileUrl(latest.fileUrl), fileName: latest.fileName || 'Feedback file' })}
                                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#b89047] hover:underline cursor-pointer border-0 bg-transparent p-0">
                                  <Eye size={9} /> View Attached Feedback
                                </button>
                              )}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => setDocViewer({ url: fileUrl(d.fileUrl), fileName: d.fileName, draft: d })} className={btnSecondary}>
                        <Eye size={11} /> View
                      </button>
                      {canReview && d.status === 'PENDING_REVIEW' && (
                        <button onClick={() => setDocViewer({ url: fileUrl(d.fileUrl), fileName: d.fileName, draft: d })} className={btnPrimary}>
                          <CheckCircle2 size={11} /> Review
                        </button>
                      )}
                      {canSend && d.status === 'APPROVED' && !d.designEmailSentAt && (
                        <button onClick={() => { setShowSend(d); setSendForm({ notes: '' }); }} className={btnPrimary}>
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
        <Modal title="Upload Design Layout" onClose={() => { setShowUpload(false); setUploadForm({ fileUrl: '', fileName: '' }); }}>
          <div className="p-5 space-y-4">
            <div>
              <label className={label}>Layout File (PDF / Image) <span className="text-rose-500">*</span></label>
              <FileUploadZone
                uploadFn={fd => projectApi.uploadFile(fd)}
                accept=".pdf,.jpg,.jpeg,.png,.dwg"
                maxSizeMb={30}
                label="Click or drag a layout file here"
                value={uploadForm.fileUrl ? { url: uploadForm.fileUrl, fileName: uploadForm.fileName } : null}
                onSuccess={(url, rawName) => {
                  const nextVersion = (drafts.length + 1);
                  const unique = makeUniqueFileName(rawName, `Layout_v${nextVersion}`);
                  setUploadForm({ fileUrl: url, fileName: unique });
                }}
                onError={msg => showToast(msg, 'error')}
                onClear={() => setUploadForm({ fileUrl: '', fileName: '' })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowUpload(false); setUploadForm({ fileUrl: '', fileName: '' }); }} className={btnSecondary}>Cancel</button>
              <button onClick={handleUploadDesign} disabled={submitting || !uploadForm.fileUrl} className={btnPrimary}>
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
                  <span className="flex items-center justify-center gap-1.5">
                    {s === 'APPROVED' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {s === 'APPROVED' ? 'Approve' : 'Reject'}
                  </span>
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
                  <span className="flex items-center justify-center gap-1.5">
                    {r === 'APPROVED' ? <CheckCircle2 size={13} /> : <RefreshCw size={13} />}
                    {r === 'APPROVED' ? 'Client Approved' : 'Revision Required'}
                  </span>
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
                  const fd = new FormData(); fd.append('file', file, uniqueFileName(file));
                  const res = await projectApi.uploadFile(fd);
                  setClientResponseForm(f => ({ ...f, fileUrl: res.data.url ?? res.data.fileUrl, fileName: file.name }));
                } catch { showToast('File upload failed.', 'error'); }
                finally { setFeedbackUploading(false); }
              }} className="w-full text-[12px] text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[rgba(184,144,71,0.1)] file:text-[#b89047] hover:file:bg-[rgba(184,144,71,0.2)] cursor-pointer" />
              {feedbackUploading && <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Uploading…</p>}
              {clientResponseForm.fileName && !feedbackUploading && (
                <p className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1">
                  <Check size={12} className="shrink-0" /> {clientResponseForm.fileName}
                </p>
              )}
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
          <div className="flex flex-1 min-h-0">
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
            {docViewer.draft && canReview && docViewer.draft.status === 'PENDING_REVIEW' && (
              <div className="w-72 shrink-0 bg-white border-l border-stone-200 flex flex-col overflow-y-auto p-5 space-y-4">
                <p className="text-[13px] font-bold text-[var(--text-primary)]">Review Design</p>
                <div className="flex flex-col gap-2">
                  {(['APPROVED', 'REJECTED'] as const).map(s => (
                    <button key={s} onClick={() => setReviewForm(f => ({ ...f, status: s }))}
                      className={`py-2.5 rounded-lg text-[12px] font-bold border transition-all cursor-pointer
                        ${reviewForm.status === s
                          ? s === 'APPROVED' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-rose-600 text-white border-rose-600'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-400'}`}>
                      <span className="flex items-center justify-center gap-1.5">
                        {s === 'APPROVED' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {s === 'APPROVED' ? 'Approve' : 'Reject'}
                      </span>
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
