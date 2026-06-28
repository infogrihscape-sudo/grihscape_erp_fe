import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { projectApi, fileUrl } from '../../services/api.js';
import { makeUniqueFileName } from '../../utils/validators.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { ShimmerTable, ShimmerRemarksList } from '../../components/Shimmer.js';
import { FileUploadZone } from '../../components/ui/FileUploadZone.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import {
  AlertTriangle, CheckCircle2, Check, Clock, Plus, Users, Loader2,
  Upload, X, XCircle, Trash2, Eye, Download, FileText, ImageIcon, Send, MessageSquare,
} from 'lucide-react';
import {
  card, inputBase, btnPrimary, btnSecondary, btnDanger, label, Modal,
} from './shared.js';

const CATEGORY_LABELS: Record<string, string> = {
  LAYOUT: 'Layout Planning',
  ARCHITECTURAL: 'Architectural (A)',
  PLUMBING: 'Plumbing / MEP (B2)',
  ELECTRICAL: 'Electrical / RCP (C)',
  STRUCTURAL: 'Structural (D)',
  INTERIOR: 'Interior Works',
};

export function PipelineTab({ project, currentUser, onRefresh }: { project: any; currentUser: User; onRefresh: () => void }) {
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [architects, setArchitects] = useState<any[]>([]);
  const [drawingDocViewer, setDrawingDocViewer] = useState<{ url: string; fileName: string } | null>(null);
  const [dmRequests, setDmRequests] = useState<any[]>([]);
  const [requestForm, setRequestForm] = useState({ name: '', category: 'ARCHITECTURAL', reason: '' });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [rejectForm, setRejectForm] = useState<{ id: string; reason: string } | null>(null);

  const [statusChangeRequest, setStatusChangeRequest] = useState<{ drawingId: string; status: string; currentStatus: string; drawingName: string; notes: string; } | null>(null);
  const [statusChangeComment, setStatusChangeComment] = useState('');

  const [sendToSEModal, setSendToSEModal] = useState<any>(null);
  const [sendToSEMessage, setSendToSEMessage] = useState('');
  const [sendingToSE, setSendingToSE] = useState(false);

  const [remarksModal, setRemarksModal] = useState<any>(null); // drawing object
  const [remarkLogs, setRemarkLogs] = useState<any[]>([]);
  const [remarkText, setRemarkText] = useState('');
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [submittingRemark, setSubmittingRemark] = useState(false);

  const isAdmin        = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isSuperAdmin   = isAdmin; // Admin has same pipeline authority as Super Admin
  const isRealSuperAdmin = currentUser.role === 'Super Admin';
  const isPM           = project.assignment?.projectManager?.id === currentUser.id;
  const isArch         = currentUser.role === 'Project Architect' || currentUser.role === 'Junior Architect';
  const isCompleted    = project.status === 'COMPLETED';
  const isAssignedArch = (currentUser.role === 'Project Architect' && project.assignment?.projectArchitect?.id === currentUser.id) ||
                         (currentUser.role === 'Junior Architect'   && project.assignment?.juniorArchitect?.id  === currentUser.id);
  const canManage      = isAdmin || isPM;
  const canSendToSE    = isAdmin || isPM || currentUser.role === 'Project Architect';
  const canSeeRemarks  = isAdmin || isPM || isArch;
  const hasAnyApproval = pipeline?.approvedByPM || pipeline?.approvedByAdmin;
  const canAddDrawings = !isCompleted && (
    isRealSuperAdmin || (!hasAnyApproval && (canManage || isAssignedArch))
  );

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.allSettled([
        projectApi.getDesignPipeline(project.id),
        projectApi.listDrawingMasterRequests(project.id),
      ]);
      if (pRes.status === 'fulfilled') setPipeline(pRes.value.data.pipeline);
      if (rRes.status === 'fulfilled') setDmRequests(rRes.value.data.requests ?? []);
    } finally { setLoading(false); }
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

  const handleSubmitDrawingRequest = async () => {
    if (!requestForm.name.trim()) { showToast('Drawing name is required.', 'error'); return; }
    setSubmittingRequest(true);
    try {
      await projectApi.createDrawingMasterRequest(project.id, requestForm);
      showToast('Request submitted. Super Admin will review it shortly.', 'success');
      setRequestForm({ name: '', category: 'ARCHITECTURAL', reason: '' });
      fetchPipeline();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed to submit request.', 'error'); }
    finally { setSubmittingRequest(false); }
  };

  const handleApproveDrawingRequest = async (requestId: string) => {
    try {
      await projectApi.approveDrawingMasterRequest(project.id, requestId);
      showToast('Drawing type approved and added to master list.', 'success');
      fetchPipeline();
      projectApi.getDrawingMaster(project.id).then(r => setDrawingMaster(r.data.drawings ?? [])).catch(() => {});
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
  };

  const handleRejectDrawingRequest = async () => {
    if (!rejectForm) return;
    try {
      await projectApi.rejectDrawingMasterRequest(project.id, rejectForm.id, rejectForm.reason);
      showToast('Request rejected.', 'success');
      setRejectForm(null);
      fetchPipeline();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
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

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

    const selectedArch = architects.find(u => u.id === assignForm.assignedArchitectId)?.name ?? 'None';
    const selectedJr = architects.find(u => u.id === assignForm.juniorArchitectId)?.name ?? 'None';
    const userDisplay = `${currentUser.name} (${currentUser.role})`;

    let logEntry = `[${timestamp}] ${userDisplay}: Assigned Team (Arch: ${selectedArch}, Jr: ${selectedJr}).`;
    if (assignForm.notes.trim()) {
      logEntry += ` Notes: "${assignForm.notes.trim()}"`;
    }

    const existingNotes = showAssignModal.notes ?? '';
    const newNotes = existingNotes ? `${logEntry}\n${existingNotes}` : logEntry;

    try {
      await projectApi.assignDrawingTeam(project.id, showAssignModal.id, {
        assignedArchitectId: assignForm.assignedArchitectId || null,
        juniorArchitectId: assignForm.juniorArchitectId || null,
        notes: newNotes,
      });
      showToast('Team assigned.', 'success');
      setShowAssignModal(null);
      fetchPipeline();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleStatusChangeWithLog = async () => {
    if (!statusChangeRequest) return;
    const { drawingId, status, currentStatus, notes } = statusChangeRequest;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

    const userDisplay = `${currentUser.name} (${currentUser.role})`;
    const commentStr = statusChangeComment.trim() ? ` (Comment: "${statusChangeComment.trim()}")` : '';
    const logEntry = `[${timestamp}] ${userDisplay}: Changed status from ${currentStatus} to ${status}.${commentStr}`;

    const newNotes = notes.trim() ? `${logEntry}\n${notes.trim()}` : logEntry;

    setSubmitting(true);
    try {
      await projectApi.updateDrawing(project.id, drawingId, { status, notes: newNotes });
      showToast('Status updated.', 'success');
      setStatusChangeRequest(null);
      fetchPipeline();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderNotesAndLogs = (notes: string | null) => {
    if (!notes) return null;
    const lines = notes.split('\n').filter(Boolean);
    return (
      <div className="mt-2.5 pt-2.5 border-t border-[var(--border)]/45">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Activity & Change Log</p>
        <div className="space-y-2 pl-2.5 border-l-2 border-[var(--border)]/60">
          {lines.map((line, idx) => {
            const matchLog = line.match(/^\[([^\]]+)\]\s+([^:]+):\s+(.*)$/);
            if (matchLog) {
              const [, timestamp, user, action] = matchLog;
              return (
                <div key={idx} className="text-[11px] leading-relaxed text-[var(--text-primary)]">
                  <span className="text-[var(--text-muted)] font-mono text-[9.5px] mr-2 bg-[var(--border)]/30 px-1.5 py-0.5 rounded">{timestamp}</span>
                  <span className="font-bold text-[var(--text-secondary)] mr-1.5">{user}</span>
                  <span>{action}</span>
                </div>
              );
            }
            return (
              <p key={idx} className="text-[11px] text-[var(--text-muted)] italic leading-relaxed">
                {line}
              </p>
            );
          })}
        </div>
      </div>
    );
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

  const handleAddFile = async () => {
    if (!fileForm.fileUrl) { showToast('Please select a file.', 'error'); return; }
    setSubmitting(true);
    setUploadError(null);
    try {
      await projectApi.addDrawingFile(project.id, showFileUpload.id, fileForm);
      showToast('File added.', 'success');
      setShowFileUpload(null);
      setFileForm({ fileType: 'PDF', fileUrl: '', fileName: '' });
      fetchPipeline();
    } catch (err: any) {
      setUploadError(err.response?.data?.error?.message ?? err.response?.data?.message ?? 'Failed to add file.');
    }
    finally { setSubmitting(false); }
  };

  const openRemarksModal = async (drawing: any) => {
    setRemarksModal(drawing);
    setRemarkLogs([]);
    setRemarkText('');
    setLoadingRemarks(true);
    try {
      const res = await projectApi.getDrawingSeRemarks(project.id, drawing.id);
      setRemarkLogs(res.data.logs ?? []);
    } catch {
      showToast('Failed to load remarks.', 'error');
    } finally {
      setLoadingRemarks(false);
    }
  };

  const handleAddRemark = async () => {
    if (!remarkText.trim() || !remarksModal) return;
    setSubmittingRemark(true);
    try {
      // Use the first transmittal log for this drawing to attach the remark
      if (remarkLogs.length === 0) {
        showToast('No issued drawing log found to attach the remark to.', 'error');
        return;
      }
      const logId = remarkLogs[remarkLogs.length - 1].id; // most recent issue
      await projectApi.addDrawingRemark(project.id, logId, remarkText.trim());
      setRemarkText('');
      // Refresh remarks
      const res = await projectApi.getDrawingSeRemarks(project.id, remarksModal.id);
      setRemarkLogs(res.data.logs ?? []);
      showToast('Remark posted.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to post remark.', 'error');
    } finally {
      setSubmittingRemark(false);
    }
  };

  const handleSendToSE = async () => {
    if (!sendToSEModal) return;
    const fileUrls = sendToSEModal.files.map((f: any) => fileUrl(f.fileUrl));
    setSendingToSE(true);
    try {
      await projectApi.sendDrawingToSiteEngineer(project.id, {
        projectDrawingId: sendToSEModal.id,
        fileUrls,
        message: sendToSEMessage.trim() || undefined,
      });
      showToast('Drawing sent to site engineer.', 'success');
      setSendToSEModal(null);
      setSendToSEMessage('');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to send drawing.', 'error');
    } finally {
      setSendingToSE(false);
    }
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
            <button onClick={handleApprovePM} disabled={submitting || (pipeline.drawings ?? []).length === 0} className={btnPrimary}>
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve as PM
            </button>
          )}
          {isSuperAdmin && !pipeline.approvedByAdmin && (
            <button onClick={handleApproveAdmin} disabled={submitting || (pipeline.drawings ?? []).length === 0} className={btnPrimary}>
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve as Admin
            </button>
          )}
          {canAddDrawings && !bothApproved && (
            <button onClick={() => setShowAddDrawing(true)} className={btnSecondary}><Plus size={11} /> Add Drawing</button>
          )}
          {bothApproved && canAddDrawings && (
            <button onClick={() => setShowAddDrawing(true)} className={btnSecondary}><Plus size={11} /> Add Drawing</button>
          )}
        </div>
      </div>

      {/* Drawing type requests */}
      {dmRequests.length > 0 && (
        <div className={`${card} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3 pb-2 border-b border-[var(--border)]">
            Drawing Type Requests <span className="font-normal">({dmRequests.filter(r => r.status === 'PENDING').length} pending)</span>
          </p>
          <div className="space-y-2.5">
            {dmRequests.map(r => (
              <div key={r.id} className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[12px] font-semibold text-[var(--text-primary)]">{r.name}</span>
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border text-stone-500 bg-stone-50 border-stone-200">{r.category}</span>
                    <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border ${
                      r.status === 'APPROVED' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                      r.status === 'REJECTED' ? 'text-rose-700 bg-rose-50 border-rose-200' :
                      'text-violet-700 bg-violet-50 border-violet-200'}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">by {r.requestedBy?.name}{r.reason && ` · "${r.reason}"`}</p>
                  {r.status === 'REJECTED' && r.rejectionReason && (
                    <p className="text-[11px] text-rose-600 mt-0.5">Reason: {r.rejectionReason}</p>
                  )}
                </div>
                {isSuperAdmin && r.status === 'PENDING' && (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => handleApproveDrawingRequest(r.id)} className={btnPrimary}><CheckCircle2 size={10} /> Approve</button>
                    <button onClick={() => setRejectForm({ id: r.id, reason: '' })} className={btnDanger}><X size={10} /> Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectForm && (
        <Modal title="Reject Drawing Type Request" onClose={() => setRejectForm(null)}>
          <div className="p-5 space-y-3">
            <div>
              <label className={label}>Reason <span className="text-stone-400">(optional)</span></label>
              <textarea className={`${inputBase} resize-none`} rows={3} value={rejectForm.reason}
                onChange={e => setRejectForm(f => f ? { ...f, reason: e.target.value } : null)}
                placeholder="Explain why this type isn't needed…" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectForm(null)} className={btnSecondary}>Cancel</button>
              <button onClick={handleRejectDrawingRequest} className={btnDanger}><X size={11} /> Reject</button>
            </div>
          </div>
        </Modal>
      )}

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
          <div key={cat} className="space-y-2">
            <div className="px-1 py-1.5 border-b border-[var(--border)]/60 flex items-center justify-between mt-4 mb-2">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--border)]/40 text-[var(--text-secondary)]">
                {drawings.length}
              </span>
            </div>
            <div className="space-y-3">
              {drawings.map((d: any) => (
                <div key={d.id} className={`${card} p-4 transition-all duration-200 hover:shadow-md ${d.pendingDelete ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-300/50' : 'hover:border-[#b89047]/40'}`}>
                  {d.pendingDelete && (
                    <div className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-[11px]">
                      <Trash2 size={11} className="text-rose-500 shrink-0" />
                      <span className="text-rose-700 dark:text-rose-400 font-semibold">Pending Deletion</span>
                      {d.pendingDeleteRequestedBy && <span className="text-rose-500">— requested by {d.pendingDeleteRequestedBy.name}</span>}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Left Column: Drawing Name and Files */}
                    <div className="md:col-span-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13.5px] font-bold text-[var(--text-primary)] leading-tight">
                          {d.drawingMaster?.name}
                          {d.roomName && <span className="text-[#b89047]"> — {d.roomName}</span>}
                          {d.wallDirection && <span className="text-[var(--text-muted)]"> ({d.wallDirection} Wall)</span>}
                        </p>
                        <StatusBadge status={d.status} className="shrink-0" />
                      </div>
                      
                      {d.files?.length > 0 && (
                        <div className="pt-1">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Attached Files</p>
                          <div className="flex flex-wrap gap-1.5 items-end">
                            {d.files.map((f: any) => {
                              const attachUrl = fileUrl(f.fileUrl);
                              const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.fileName);
                              return isImg ? (
                                <button key={f.id} type="button" onClick={() => setDrawingDocViewer({ url: attachUrl, fileName: f.fileName })}
                                  className="group relative w-12 h-12 rounded-lg overflow-hidden border border-[rgba(184,144,71,0.3)] hover:border-[#b89047] transition-colors cursor-pointer bg-transparent p-0 shrink-0">
                                  <img src={attachUrl} alt={f.fileName} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye size={10} className="text-white" />
                                  </div>
                                </button>
                              ) : (
                                <button key={f.id} type="button" onClick={() => setDrawingDocViewer({ url: attachUrl, fileName: f.fileName })}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold text-[#b89047] bg-[rgba(184,144,71,0.04)] border-[rgba(184,144,71,0.18)] hover:bg-[rgba(184,144,71,0.08)] transition-colors cursor-pointer max-w-[150px]">
                                  {f.fileType === 'IMAGE' ? <ImageIcon size={8} /> : <FileText size={8} />}
                                  <span className="truncate">{f.fileName}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Middle Column: Assigned Team */}
                    <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-[var(--border)]/40 pt-3 md:pt-0 md:pl-4 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Assigned Team</p>
                      <div className="space-y-1.5">
                        {d.assignedArchitect ? (
                          <div className="text-[11.5px] text-[var(--text-secondary)] flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">Arch: <strong className="text-[var(--text-primary)] font-semibold">{d.assignedArchitect.name}</strong></span>
                          </div>
                        ) : (
                          <div className="text-[11.5px] text-amber-600 flex items-center gap-1.5 italic">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>No Architect</span>
                          </div>
                        )}
                        {d.juniorArchitect && (
                          <div className="text-[11.5px] text-[var(--text-secondary)] flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate">Junior: <strong className="text-[var(--text-primary)] font-semibold">{d.juniorArchitect.name}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Activity Log Column */}
                    <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-[var(--border)]/40 pt-3 md:pt-0 md:pl-4 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Activity Log</p>
                      {d.notes ? (
                        <div className="max-h-[80px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                          {d.notes.split('\n').filter(Boolean).map((line: string, idx: number) => {
                            const matchLog = line.match(/^\[([^\]]+)\]\s+([^:]+):\s+(.*)$/);
                            if (matchLog) {
                              const [, timestamp, user, action] = matchLog;
                              const shortTime = timestamp.replace(/^\d{4}-/, ''); // remove year
                              return (
                                <div key={idx} className="text-[10.5px] leading-snug">
                                  <span className="text-[var(--text-muted)] font-mono text-[9px] block">{shortTime}</span>
                                  <span className="text-[var(--text-primary)] font-medium">{action}</span>
                                </div>
                              );
                            }
                            return (
                              <p key={idx} className="text-[10.5px] text-[var(--text-muted)] italic leading-snug">
                                {line}
                              </p>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10.5px] text-[var(--text-muted)] italic">No activities logged yet.</p>
                      )}
                    </div>
                    
                    {/* Actions Column */}
                    <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-[var(--border)]/40 pt-3 md:pt-0 md:pl-4 flex flex-row md:flex-col gap-1.5 items-center md:items-stretch justify-end md:justify-start w-full md:w-auto">
                      {(canManage || isArch) && bothApproved && d.status !== 'APPROVED' && (
                        <select value={d.status} onChange={e => {
                          setStatusChangeRequest({
                            drawingId: d.id,
                            status: e.target.value,
                            currentStatus: d.status,
                            drawingName: d.drawingMaster?.name + (d.roomName ? ` — ${d.roomName}` : ''),
                            notes: d.notes ?? '',
                          });
                          setStatusChangeComment('');
                        }}
                          className="w-full text-[11px] font-semibold bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 outline-none focus:border-[#b89047] cursor-pointer text-[var(--text-secondary)]">
                          {(canManage
                            ? ['NOT_STARTED', 'IN_PROGRESS', 'REVIEW', 'APPROVED']
                            : ['IN_PROGRESS', 'REVIEW']
                          ).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                      )}
                      
                      <div className="flex items-center gap-1.5 w-full justify-end md:justify-stretch">
                        {bothApproved && (canManage || isArch) && (
                          <button onClick={() => { setShowFileUpload(d); setFileForm({ fileType: 'PDF', fileUrl: '', fileName: '' }); }} className={`${btnSecondary} flex-1 justify-center py-1 text-[11px]`}>
                            <Upload size={10} /> File
                          </button>
                        )}

                        {canManage && (
                          <button onClick={() => { setShowAssignModal(d); setAssignForm({ assignedArchitectId: d.assignedArchitect?.id ?? '', juniorArchitectId: d.juniorArchitect?.id ?? '', notes: '' }); }} className={`${btnSecondary} flex-1 justify-center py-1 text-[11px]`}>
                            <Users size={10} /> Team
                          </button>
                        )}
                      </div>

                      {canSendToSE && d.files?.length > 0 && (
                        <button
                          onClick={() => { setSendToSEModal(d); setSendToSEMessage(''); }}
                          className="inline-flex items-center justify-center gap-1 w-full px-2 py-1.5 rounded-lg text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 cursor-pointer transition-colors"
                          title="Send this drawing to the assigned site engineer"
                        >
                          <Send size={10} /> Send to SE
                        </button>
                      )}

                      {canSeeRemarks && (
                        <button
                          onClick={() => openRemarksModal(d)}
                          className="inline-flex items-center justify-center gap-1 w-full px-2 py-1.5 rounded-lg text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 cursor-pointer transition-colors"
                          title="View and add remarks on this drawing"
                        >
                          <MessageSquare size={10} /> Remarks
                        </button>
                      )}
                      
                      <div className="flex items-center gap-1.5 w-full justify-end md:justify-stretch mt-auto">
                        {isSuperAdmin && d.pendingDelete && (
                          <div className="flex gap-1 w-full">
                            <button onClick={() => handleApproveDelete(d.id)} disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 cursor-pointer transition-colors">
                              <Check size={10} /> Delete
                            </button>
                            <button onClick={() => handleRejectDelete(d.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors">
                              <XCircle size={10} /> Keep
                            </button>
                          </div>
                        )}
                        
                        {isRealSuperAdmin && !d.pendingDelete && (
                          <button onClick={() => {
                            if (window.confirm(`Are you sure you want to directly delete "${d.drawingMaster?.name}"?`)) {
                              handleRemove(d.id);
                            }
                          }} title="Delete drawing directly"
                            className="p-1.5 w-full rounded-lg text-rose-500 border border-rose-200 bg-rose-50 hover:bg-rose-100 cursor-pointer transition-colors flex items-center justify-center gap-1 text-[11px] font-semibold">
                            <Trash2 size={10} /> Delete
                          </button>
                        )}
                        
                        {!isRealSuperAdmin && (canManage || isArch) && !d.pendingDelete && (
                          <button onClick={() => handleRequestDelete(d.id)} title="Request deletion approval"
                            className="p-1.5 w-full rounded-lg text-rose-500 border border-rose-200 bg-rose-50 hover:bg-rose-100 cursor-pointer transition-colors flex items-center justify-center gap-1 text-[11px] font-semibold">
                            <Trash2 size={10} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add drawing modal */}
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
                      <button type="button" onClick={() => toggleCategory(items, existingIds)}
                        className="flex items-center gap-2 w-full text-left mb-2 group cursor-pointer">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${allCatSelected ? 'bg-[#b89047] border-[#b89047]' : 'border-[var(--border)] group-hover:border-[#b89047]'}`}>
                          {allCatSelected && <Check size={9} className="text-white" />}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{cat}</span>
                        <span className="text-[9.5px] text-[var(--text-muted)] font-normal">({selectable.length} available)</span>
                      </button>
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
                {/* Request a new drawing type */}
                {canAddDrawings && (
                  <div className="border-t border-[var(--border)] pt-3 mt-1">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">Can't find it? Request a new drawing type</p>
                    <p className="text-[10.5px] text-violet-600 mb-2">Your request will be reviewed and approved by Super Admin before appearing in the list.</p>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Drawing name…"
                        value={requestForm.name}
                        onChange={e => setRequestForm(f => ({ ...f, name: e.target.value }))}
                        className={`${inputBase} flex-1 min-w-[160px] text-[12px]`}
                      />
                      <select value={requestForm.category} onChange={e => setRequestForm(f => ({ ...f, category: e.target.value }))}
                        className="text-[12px] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 outline-none focus:border-[#b89047] text-[var(--text-secondary)]">
                        {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <button onClick={handleSubmitDrawingRequest} disabled={submittingRequest || !requestForm.name.trim()} className={btnSecondary}>
                        {submittingRequest ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Request
                      </button>
                    </div>
                  </div>
                )}
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
        <Modal title="Upload Drawing File" subtitle={showFileUpload.drawingMaster?.name} onClose={() => { setShowFileUpload(null); setUploadError(null); setFileForm({ fileType: 'PDF', fileUrl: '', fileName: '' }); }}>
          <div className="p-5 space-y-3">
            {uploadError && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200">
                <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-rose-700 font-medium">{uploadError}</p>
              </div>
            )}
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
              <FileUploadZone
                uploadFn={fd => projectApi.uploadFile(fd)}
                accept=".pdf,.dwg,.jpg,.jpeg,.png"
                maxSizeMb={50}
                label="Click or drag a drawing file here"
                value={fileForm.fileUrl ? { url: fileForm.fileUrl, fileName: fileForm.fileName } : null}
                onSuccess={(url, rawName) => {
                  const parts = [
                    showFileUpload.drawingMaster?.name,
                    showFileUpload.roomName ?? null,
                    (showFileUpload as any).wallDirection ?? null,
                  ].filter(Boolean).join('_');
                  const unique = makeUniqueFileName(rawName, parts || 'Drawing');
                  setFileForm(f => ({ ...f, fileUrl: url, fileName: unique }));
                  setUploadError(null);
                }}
                onError={msg => setUploadError(msg)}
                onClear={() => setFileForm(f => ({ ...f, fileUrl: '', fileName: '' }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowFileUpload(null); setUploadError(null); setFileForm({ fileType: 'PDF', fileUrl: '', fileName: '' }); }} className={btnSecondary}>Cancel</button>
              <button onClick={handleAddFile} disabled={submitting || !fileForm.fileUrl} className={btnPrimary}>
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

      {/* Remarks modal — visible to PM / Admin / Arch / Junior Arch */}
      {remarksModal && (
        <Modal
          title="Drawing Remarks"
          subtitle={`${remarksModal.drawingMaster?.name}${remarksModal.roomName ? ` — ${remarksModal.roomName}` : ''}`}
          onClose={() => { setRemarksModal(null); setRemarkLogs([]); setRemarkText(''); }}
        >
          <div className="p-5 space-y-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {loadingRemarks ? (
              <ShimmerRemarksList items={3} />
            ) : remarkLogs.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare size={28} className="mx-auto text-[var(--text-muted)] opacity-30 mb-2" />
                <p className="text-[12px] text-[var(--text-muted)]">No remarks yet for this drawing.</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">This drawing must be sent to the site engineer first.</p>
              </div>
            ) : (
              remarkLogs.map((log: any) => (
                <div key={log.id} className="space-y-3">
                  {/* Issuance header */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-100">
                    <Send size={10} className="text-sky-600 shrink-0" />
                    <span className="text-[10.5px] text-sky-700">
                      Issued by <strong>{log.sentBy?.name}</strong> on{' '}
                      {new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {log.message && <> · <em className="font-normal">{log.message}</em></>}
                    </span>
                  </div>

                  {/* Remarks thread */}
                  {log.remarks?.length > 0 ? (
                    <div className="pl-3 border-l-2 border-[rgba(184,144,71,0.25)] space-y-2">
                      {log.remarks.map((r: any) => (
                        <div key={r.id}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-bold text-[var(--text-primary)]">{r.author?.name}</span>
                            <span className="text-[9px] font-semibold text-[var(--text-muted)] bg-[var(--border)] px-1.5 py-0.5 rounded-full">{r.author?.role?.name}</span>
                            <span className="text-[9.5px] text-[var(--text-muted)]">
                              · {new Date(r.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed bg-[rgba(184,144,71,0.04)] border border-[rgba(184,144,71,0.1)] rounded-lg px-3 py-2">
                            {r.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10.5px] text-[var(--text-muted)] italic pl-3">No remarks on this issuance yet.</p>
                  )}
                </div>
              ))
            )}

            {/* Add remark form */}
            {remarkLogs.length > 0 && (
              <div className="pt-3 border-t border-[var(--border)] space-y-2">
                <label className={label}>Add Your Remark</label>
                <textarea
                  className={`${inputBase} resize-none`}
                  rows={3}
                  value={remarkText}
                  onChange={e => setRemarkText(e.target.value)}
                  placeholder="Type your remark, response, or clarification for the site engineer…"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setRemarksModal(null); setRemarkLogs([]); setRemarkText(''); }} className={btnSecondary}>Close</button>
                  <button onClick={handleAddRemark} disabled={submittingRemark || !remarkText.trim()} className={btnPrimary}>
                    {submittingRemark ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                    {submittingRemark ? 'Posting…' : 'Post Remark'}
                  </button>
                </div>
              </div>
            )}

            {remarkLogs.length === 0 && !loadingRemarks && (
              <div className="flex justify-end">
                <button onClick={() => { setRemarksModal(null); }} className={btnSecondary}>Close</button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Send drawing to site engineer modal */}
      {sendToSEModal && (
        <Modal
          title="Send Drawing to Site Engineer"
          subtitle={`${sendToSEModal.drawingMaster?.name}${sendToSEModal.roomName ? ` — ${sendToSEModal.roomName}` : ''}`}
          onClose={() => { setSendToSEModal(null); setSendToSEMessage(''); }}
        >
          <div className="p-5 space-y-4">
            {project.assignment?.siteEngineer ? (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200">
                <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0">
                  <Send size={12} className="text-sky-600" />
                </div>
                <div>
                  <p className="text-[11.5px] font-bold text-sky-800">{project.assignment.siteEngineer.name}</p>
                  <p className="text-[10px] text-sky-600">{project.assignment.siteEngineer.email ?? 'No email on record'}</p>
                </div>
              </div>
            ) : (
              <div className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11.5px] font-semibold text-amber-700">
                No site engineer assigned to this project yet.
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Files to send ({sendToSEModal.files.length})</p>
              <div className="space-y-1">
                {sendToSEModal.files.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[rgba(184,144,71,0.04)] border border-[rgba(184,144,71,0.12)]">
                    <FileText size={11} className="text-[#b89047] shrink-0" />
                    <span className="text-[11px] text-[var(--text-secondary)] truncate">{f.fileName}</span>
                    <span className="text-[9px] font-bold text-[var(--text-muted)] bg-[var(--border)] px-1.5 py-0.5 rounded-full shrink-0">{f.fileType}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className={label}>Instructions for Site Engineer <span className="normal-case font-normal text-[var(--text-muted)]">(optional)</span></label>
              <textarea
                className={`${inputBase} resize-none`}
                rows={3}
                value={sendToSEMessage}
                onChange={e => setSendToSEMessage(e.target.value)}
                placeholder="Any site-specific notes or instructions…"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setSendToSEModal(null); setSendToSEMessage(''); }} className={btnSecondary}>Cancel</button>
              <button
                onClick={handleSendToSE}
                disabled={sendingToSE || !project.assignment?.siteEngineer?.email}
                className={btnPrimary}
              >
                {sendingToSE ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                {sendingToSE ? 'Sending…' : 'Send Drawing'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status change comment modal */}
      {statusChangeRequest && (
        <Modal title="Update Drawing Status" subtitle={statusChangeRequest.drawingName} onClose={() => setStatusChangeRequest(null)}>
          <div className="p-5 space-y-4">
            <div className="p-3 bg-[var(--border)]/20 rounded-lg flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-muted)] font-semibold">Change Status:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700">{statusChangeRequest.currentStatus.replace(/_/g, ' ')}</span>
                <span className="text-stone-400">→</span>
                <span className="font-bold text-[#b89047] bg-[#b89047]/10 px-2 py-0.5 rounded border border-[#b89047]/20">{statusChangeRequest.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
            <div>
              <label className={label}>Log Comment / Progress Note</label>
              <textarea className={`${inputBase} resize-none`} rows={3} value={statusChangeComment}
                onChange={e => setStatusChangeComment(e.target.value)}
                placeholder="Optional: Describe why the status is changing or add progress comments…" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setStatusChangeRequest(null)} className={btnSecondary}>Cancel</button>
              <button onClick={handleStatusChangeWithLog} disabled={submitting} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Update Status
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
