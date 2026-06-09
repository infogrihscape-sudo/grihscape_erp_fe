import React, { useEffect, useRef, useState } from 'react';
import { contractApi, prospectApi, BACKEND_BASE } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import type { User } from '../context/AuthContext.js';
import {
  Loader2, Plus, CheckCircle2, Send, Upload, ScrollText,
  RefreshCw, X, FileText, Lock, ExternalLink, AlertTriangle, ShieldCheck,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext.js';
import { ShimmerList } from '../components/Shimmer.js';

interface Props { currentUser: User; }

type ContractStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type UploadMode = 'draft' | 'signed';

interface Contract {
  id: string;
  prospectId: string | null;
  status: ContractStatus;
  draftPdfUrl: string | null;
  signedPdfUrl: string | null;
  createdAt: string;
  prospect: {
    clientName: string;
    email: string | null;
    mobileNo: string;
    serviceType: string;
    locality: string;
    state: string;
    workflowStage: string | null;
    initialPaymentAmount: number | null;
    initialPaymentUnit: string | null;
  } | null;
  createdBy:  { name: string } | null;
  approvedBy: { name: string } | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const statusStyle: Record<ContractStatus, string> = {
  PENDING:  'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50',
  APPROVED: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50',
  REJECTED: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-700/50',
};

const ITEMS_PER_PAGE = 9;

/** Prepend backend host so relative /uploads/... URLs become clickable links. */
const fullUrl = (url: string | null) =>
  url ? (url.startsWith('http') ? url : `${BACKEND_BASE}${url}`) : null;

const card = 'bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-card)]';
const btnPrimary  = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none';
const btnSecondary = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-[var(--text-secondary)] bg-[var(--hover-bg)] border border-[var(--border)] hover:bg-[var(--border)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const inputCls = 'w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-2 outline-none focus:border-[#b89047] focus:ring-2 focus:ring-[rgba(184,144,71,0.2)] font-[inherit]';

// ── component ─────────────────────────────────────────────────────────────────
export const ContractsScreen: React.FC<Props> = ({ currentUser }) => {
  const { showToast } = useToast();
  const { navigate } = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contracts, setContracts]   = useState<Contract[]>([]);
  const [wonProspects, setWonProspects] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  // Upload state
  const [uploadFor,   setUploadFor]   = useState<string | null>(null); // contract id
  const [uploadMode,  setUploadMode]  = useState<UploadMode>('draft');
  const [uploading,   setUploading]   = useState(false);

  // Create draft modal
  const [showDraftModal,      setShowDraftModal]      = useState(false);
  const [selectedProspectId,  setSelectedProspectId]  = useState('');
  const [creatingDraft,       setCreatingDraft]       = useState(false);

  // Send email modal
  const [sendModal,  setSendModal]  = useState<Contract | null>(null);
  const [sendEmail,  setSendEmail]  = useState('');
  const [sending,    setSending]    = useState(false);

  const isAdmin    = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isAccounts = currentUser.role === 'Accounts';

  const [verifying, setVerifying] = useState<string | null>(null); // contract id being verified
  // Per-contract: editable revised payment amount for accounts verification
  const [verifyAmounts, setVerifyAmounts] = useState<Record<string, { amount: string; unit: string }>>({});
  const [currentPage, setCurrentPage] = useState(1);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        contractApi.getContracts(),
        prospectApi.getProspects(),
      ]);
      setContracts(cRes.data.contracts || []);
      setCurrentPage(1);

      const allContracts: Contract[] = cRes.data.contracts || [];
      // Prospect IDs that already have a contract (any status) — one contract per prospect
      const usedProspectIds = new Set(
        allContracts.map((c) => c.prospectId).filter(Boolean),
      );

      // Only WON prospects that haven't been deleted AND don't yet have a contract
      const won = (pRes.data.prospects || []).filter(
        (p: any) =>
          (p.workflowStage === 'WON' ||
           p.workflowStage === 'PROPOSAL_ACCEPTED' ||
           p.workflowStage === 'PROPOSAL_AGREED') &&
          p.status !== 'DELETED' &&
          !p.isDeleted &&
          !usedProspectIds.has(p.id),   // exclude already-contracted prospects
      );
      setWonProspects(won);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load contracts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── create draft ──────────────────────────────────────────────────────────
  const handleCreateDraft = async () => {
    if (!selectedProspectId) {
      showToast('Please select a WON prospect.', 'error');
      return;
    }
    setCreatingDraft(true);
    try {
      await contractApi.createDraft({ prospectId: selectedProspectId });
      showToast('Draft contract created.', 'success');
      setShowDraftModal(false);
      setSelectedProspectId('');
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create draft.', 'error');
    } finally {
      setCreatingDraft(false);
    }
  };

  // ── trigger file input ────────────────────────────────────────────────────
  const triggerUpload = (contractId: string, mode: UploadMode) => {
    setUploadFor(contractId);
    setUploadMode(mode);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // ── handle file selected ──────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadFor) return;

    if (file.type !== 'application/pdf') {
      showToast('Only PDF files are allowed.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('File must be under 10 MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      // Step 1: upload file to server
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await contractApi.uploadFile(form);
      const relativeUrl: string = uploadRes.data.fileUrl; // e.g. /uploads/prospects/file-123.pdf

      if (!relativeUrl) throw new Error('Upload returned no file URL.');

      // Step 2: save the URL on the contract record
      if (uploadMode === 'draft') {
        await contractApi.saveDraftUrl(uploadFor, relativeUrl);
        showToast('Draft PDF uploaded successfully.', 'success');
      } else {
        await contractApi.saveSignedUrl(uploadFor, relativeUrl);
        showToast('Signed contract uploaded successfully.', 'success');
      }
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Upload failed. Check file size (max 10 MB).', 'error');
    } finally {
      setUploading(false);
      setUploadFor(null);
    }
  };

  // ── approve ───────────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    try {
      await contractApi.approve(id);
      showToast('Contract approved. Sales rep can now send it to the client.', 'success');
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Approval failed.', 'error');
    }
  };

  // ── send email ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!sendModal || !sendEmail.trim()) return;
    setSending(true);
    try {
      await contractApi.sendContract(sendModal.id, {
        clientEmail: sendEmail.trim(),
        clientName:  sendModal.prospect?.clientName || 'Client',
      });
      showToast('Contract email sent to client.', 'success');
      setSendModal(null);
      setSendEmail('');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Email send failed.', 'error');
    } finally {
      setSending(false);
    }
  };

  // ── verify payment (Accounts role) ───────────────────────────────────────
  const handleVerifyPayment = async (contractId: string, prospectId: string | null) => {
    if (!prospectId) return;
    setVerifying(contractId);
    try {
      const override = verifyAmounts[contractId];
      const revisedAmount = override?.amount ? parseFloat(override.amount) : undefined;
      const revisedUnit   = override?.unit   || 'LAKH';
      await prospectApi.verifyByAccounts(prospectId, {
        notes: 'Payment and documentation verified by Accounts.',
        revisedAmount: revisedAmount ?? null,
        revisedUnit,
      });
      showToast('Payment verified. Project marked as Won!', 'success');
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Verification failed.', 'error');
    } finally {
      setVerifying(null);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] gap-3">
        <Loader2 size={28} className="animate-spin text-amber-600" />
        <span className="text-[12px] text-[var(--text-muted)] font-medium">Loading contracts…</span>
      </div>
    );
  }

  const indexStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedContracts = contracts.slice(indexStart, indexStart + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(contracts.length / ITEMS_PER_PAGE) || 1;

  return (
    <div className="animate-fade-in flex flex-col h-full min-h-0">

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Actions & Legend bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 mb-4 p-2.5 rounded-xl bg-[var(--hover-bg)] border border-[var(--border-subtle)]">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span><strong>PENDING</strong> — upload draft PDF, awaiting admin approval</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span><strong>APPROVED</strong> — send to client, upload signed PDF once client returns it</span>
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className={btnSecondary} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { setShowDraftModal(true); setSelectedProspectId(''); }} className={btnPrimary}>
            <Plus size={14} /> New Contract
          </button>
        </div>
      </div>

      {/* ── Loading shimmer ── */}
      {loading ? (
        <div className="flex-1 overflow-y-auto min-h-0 p-1">
          <ShimmerList items={6} />
        </div>
      ) : contracts.length === 0 ? (
        <div className={`${card} flex flex-col items-center justify-center py-20 gap-3 flex-1`}>
          <ScrollText size={36} className="text-[var(--text-muted)]" />
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">No contracts yet</p>
          <p className="text-[12px] text-[var(--text-muted)]">Click "New Contract" to create a draft for a WON project.</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-4">
              {paginatedContracts.map((c) => {
              const isApproved  = c.status === 'APPROVED';
              const hasDraftPdf = !!c.draftPdfUrl;
              const draftLink   = fullUrl(c.draftPdfUrl);
              const signedLink  = fullUrl(c.signedPdfUrl);

              return (
                <div key={c.id} className={`${card} flex flex-col gap-3 p-4 hover:shadow-[var(--shadow-hover)] transition-shadow duration-200`}>

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-[var(--text-primary)] leading-tight truncate">
                        {c.prospect?.clientName || <span className="italic text-[var(--text-muted)]">No prospect linked</span>}
                      </p>
                      {c.prospect && (
                        <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 truncate">
                          {c.prospect.serviceType.replace(/_/g, ' ')} · {c.prospect.locality}, {c.prospect.state}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${statusStyle[c.status]}`}>
                      {c.status}
                    </span>
                  </div>

                  {/* Client Info Block */}
                  {c.prospect && (
                    <div className="grid grid-cols-2 gap-2 p-2 bg-[var(--hover-bg)]/40 rounded-lg border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] font-[inherit]">
                      <div>
                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Mobile</span>
                        <span className="font-semibold text-[var(--text-primary)]">{c.prospect.mobileNo}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Email</span>
                        <span className="font-semibold text-[var(--text-primary)] truncate block" title={c.prospect.email || ''}>
                          {c.prospect.email || '—'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  <div className="space-y-1.5 border-t border-[var(--border-subtle)] pt-2">
                    {draftLink ? (
                      <a href={draftLink} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-[11.5px] text-[#b89047] hover:underline">
                        <FileText size={12} className="shrink-0" /> Draft Contract PDF
                        <ExternalLink size={10} className="ml-auto shrink-0 opacity-60" />
                      </a>
                    ) : (
                      <p className="text-[11px] text-[var(--text-muted)] italic flex items-center gap-1">
                        <AlertTriangle size={11} className="shrink-0 text-amber-500" /> No draft PDF uploaded yet
                      </p>
                    )}
                    {signedLink && (
                      <a href={signedLink} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-[11.5px] text-emerald-600 dark:text-emerald-400 hover:underline">
                        <FileText size={12} className="shrink-0" /> Signed Contract PDF
                        <ExternalLink size={10} className="ml-auto shrink-0 opacity-60" />
                      </a>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="text-[10.5px] text-[var(--text-muted)] space-y-0.5">
                    {c.createdBy  && <p>Created by: <span className="font-semibold text-[var(--text-secondary)]">{c.createdBy.name}</span></p>}
                    {c.approvedBy && <p>Approved by: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{c.approvedBy.name}</span></p>}
                    <p className="text-[10px]">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>

                  {/* ── Actions ── */}
                  <div className="border-t border-[var(--border-subtle)] pt-2 space-y-2">

                    {/* Upload Draft PDF — PENDING only */}
                    {!isApproved && (
                      <button
                        onClick={() => triggerUpload(c.id, 'draft')}
                        disabled={(uploading && uploadFor === c.id) || hasDraftPdf}
                        className={`${btnSecondary} w-full justify-center`}
                      >
                        {uploading && uploadFor === c.id && uploadMode === 'draft'
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Upload size={12} />
                        }
                        {hasDraftPdf ? 'Draft PDF Uploaded' : 'Upload Draft PDF'}
                      </button>
                    )}

                    {/* Approve — Admin only, PENDING only */}
                    {isAdmin && !isApproved && (
                      <button
                        onClick={() => handleApprove(c.id)}
                        disabled={!hasDraftPdf}
                        title={!hasDraftPdf ? 'Upload a draft PDF before approving' : ''}
                        className={`${btnPrimary} w-full justify-center`}
                      >
                        <CheckCircle2 size={13} /> Approve Contract
                      </button>
                    )}
                    {isAdmin && !isApproved && !hasDraftPdf && (
                      <p className="text-[10px] text-[var(--text-muted)] text-center">Upload draft PDF to enable approval</p>
                    )}

                    {/* APPROVED actions */}
                    {/* Send email — disabled once signed PDF is received */}
                    {isApproved && !c.signedPdfUrl && (
                      <button
                        onClick={() => { setSendModal(c); setSendEmail(c.prospect?.email || ''); }}
                        className={`${btnPrimary} w-full justify-center`}
                      >
                        <Send size={13} /> Send to Client
                      </button>
                    )}

                    {/* Upload signed PDF — locked after upload */}
                    {isApproved && (
                      <button
                        onClick={() => triggerUpload(c.id, 'signed')}
                        disabled={(uploading && uploadFor === c.id) || !!c.signedPdfUrl}
                        className={`${btnSecondary} w-full justify-center`}
                      >
                        {uploading && uploadFor === c.id && uploadMode === 'signed'
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Upload size={12} />
                        }
                        {c.signedPdfUrl ? 'Signed PDF Uploaded' : 'Upload Signed PDF'}
                      </button>
                    )}

                    {/* Lock indicator for unapproved send */}
                    {!isApproved && (
                      <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-[var(--text-muted)] py-0.5">
                        <Lock size={11} className="shrink-0" />
                        Send email locked until admin approves
                      </div>
                    )}

                    {/* Accounts / Admin: verify payment section */}
                    {(isAccounts || isAdmin) && c.prospect?.workflowStage === 'INITIAL_PAYMENT_RECEIVED' && (
                      <div className="space-y-1.5 border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">Payment Verification</p>
                        {c.prospect.initialPaymentAmount ? (
                          <p className="text-[10.5px] text-emerald-700 dark:text-emerald-400 font-semibold">
                            Logged by sales: <span className="font-bold">{c.prospect.initialPaymentAmount} {c.prospect.initialPaymentUnit || 'Lakh'}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-[var(--text-muted)] italic">No amount logged by sales.</p>
                        )}
                        {/* Editable actual received amount */}
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={c.prospect.initialPaymentAmount ? String(c.prospect.initialPaymentAmount) : 'Actual amt'}
                            value={verifyAmounts[c.id]?.amount ?? ''}
                            onChange={e => setVerifyAmounts(prev => ({ ...prev, [c.id]: { amount: e.target.value, unit: prev[c.id]?.unit || c.prospect?.initialPaymentUnit || 'LAKH' } }))}
                            className="flex-1 text-[11px] bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md px-2 py-1.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 font-[inherit]"
                          />
                          <select
                            value={verifyAmounts[c.id]?.unit || c.prospect.initialPaymentUnit || 'LAKH'}
                            onChange={e => setVerifyAmounts(prev => ({ ...prev, [c.id]: { amount: prev[c.id]?.amount ?? '', unit: e.target.value } }))}
                            className="w-16 text-[11px] bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md px-1 py-1.5 outline-none focus:border-emerald-500 font-[inherit]"
                          >
                            <option value="LAKH">L</option>
                            <option value="CRORE">Cr</option>
                          </select>
                        </div>
                        <p className="text-[9.5px] text-[var(--text-muted)]">Leave blank to confirm sales amount as-is.</p>
                        <button
                          onClick={() => handleVerifyPayment(c.id, c.prospectId)}
                          disabled={verifying === c.id}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10.5px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors cursor-pointer border-0 disabled:opacity-50"
                        >
                          {verifying === c.id ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                          Verify & Mark Won
                        </button>
                      </div>
                    )}
                    {/* Awaiting Verification (visible to Sales / non-Accounts/non-Admins) */}
                    {c.prospect && c.prospect.initialPaymentAmount !== null && c.prospect.workflowStage === 'INITIAL_PAYMENT_RECEIVED' && !isAccounts && !isAdmin && (
                      <div className="space-y-1.5 border border-amber-200 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-950/20 rounded-lg p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-450">Payment Verification</span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-450 font-bold uppercase tracking-wide">Awaiting</span>
                        </div>
                        <p className="text-[11.5px] text-amber-700 dark:text-amber-450 font-bold">
                          Logged Amount: <span className="text-[12.5px]">{c.prospect.initialPaymentAmount} {c.prospect.initialPaymentUnit || 'Lakh'}</span>
                        </p>
                      </div>
                    )}

                    {/* Verified & Won Status */}
                    {c.prospect?.workflowStage === 'WON' && (
                      <div className="space-y-1.5 border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">Payment Verified</span>
                          <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        </div>
                        {c.prospect.initialPaymentAmount ? (
                          <p className="text-[11.5px] text-emerald-700 dark:text-emerald-400 font-bold">
                            Verified Amount: <span className="text-[12.5px]">{c.prospect.initialPaymentAmount} {c.prospect.initialPaymentUnit || 'Lakh'}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-[var(--text-muted)] italic">No amount recorded.</p>
                        )}
                        <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-emerald-700 dark:text-emerald-450 font-bold pt-1.5 border-t border-emerald-100/50 dark:border-emerald-900/20">
                          Project Won
                        </div>
                      </div>
                    )}

                    {/* View full pipeline */}
                    {c.prospectId && (
                      <button
                        onClick={() => navigate(`/prospects/${c.prospectId}`)}
                        className="w-full inline-flex items-center justify-center gap-1 py-1 text-[10px] font-semibold text-[var(--text-muted)] hover:text-[#b89047] transition-colors border-0 bg-transparent cursor-pointer"
                      >
                        View Pipeline →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Pagination Controls */}
          {contracts.length > ITEMS_PER_PAGE && (
            <div className="shrink-0 flex items-center justify-between px-3.5 py-2.5 mt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] bg-[var(--hover-bg)]/30 rounded-xl select-none">
              <span>Showing {indexStart + 1}–{Math.min(indexStart + ITEMS_PER_PAGE, contracts.length)} of {contracts.length}</span>
              <div className="flex items-center gap-1.5">
                <button
                  className="p-1 rounded border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] disabled:opacity-40 cursor-pointer transition-colors"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={12} />
                </button>
                <span className="px-1.5">Page {currentPage} of {totalPages}</span>
                <button
                  className="p-1 rounded border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] disabled:opacity-40 cursor-pointer transition-colors"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Create Draft Modal ── */}
      {showDraftModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowDraftModal(false)}>
          <div className={`${card} w-full sm:max-w-md p-5 animate-scale-in h-screen sm:h-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <ScrollText size={16} className="text-[#b89047]" /> New Contract Draft
              </h3>
              <button onClick={() => setShowDraftModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] cursor-pointer border-0 bg-transparent">
                <X size={15} />
              </button>
            </div>

            {wonProspects.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertTriangle size={28} className="text-amber-500" />
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">No WON prospects</p>
                <p className="text-[12px] text-[var(--text-muted)] max-w-xs">
                  Contracts can only be created for prospects with a <strong>WON</strong> workflow stage. Mark a prospect as Won first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold text-[var(--text-secondary)]">Select WON Prospect *</label>
                  <select
                    value={selectedProspectId}
                    onChange={e => setSelectedProspectId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— Choose a prospect —</option>
                    {wonProspects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.clientName} · {p.mobileNo} · {p.locality}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] bg-[var(--hover-bg)] rounded-lg p-2.5 border border-[var(--border-subtle)]">
                  After creating the draft, you'll be able to upload the contract PDF. Send email will be available once an admin approves.
                </p>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowDraftModal(false)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                  <button
                    onClick={handleCreateDraft}
                    disabled={creatingDraft || !selectedProspectId}
                    className={`${btnPrimary} flex-1 justify-center`}
                  >
                    {creatingDraft ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    {creatingDraft ? 'Creating…' : 'Create Draft'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Send Email Modal ── */}
      {sendModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setSendModal(null)}>
          <div className={`${card} w-full sm:max-w-md p-5 animate-scale-in h-screen sm:h-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Send size={15} className="text-[#b89047]" /> Send Contract to Client
              </h3>
              <button onClick={() => setSendModal(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] cursor-pointer border-0 bg-transparent">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[var(--hover-bg)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)]">
                Sending contract for <strong className="text-[var(--text-primary)]">{sendModal.prospect?.clientName || 'Unknown'}</strong>
                {sendModal.draftPdfUrl && <span className="text-[#b89047]"> (with PDF attached)</span>}
              </div>

              {/* Already-sent warning */}
              {['CONTRACT_EMAILED', 'SIGNED_CONTRACT_UPLOADED', 'INITIAL_PAYMENT_RECEIVED', 'ACCOUNTS_VERIFIED', 'WON'].includes(sendModal.prospect?.workflowStage || '') && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40 text-[11.5px] text-amber-800 dark:text-amber-400">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <span>This contract email was already sent. Sending again will deliver a duplicate to the client — proceed only if the client requested a resend.</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-semibold text-[var(--text-secondary)]">Client Email Address</label>
                {sendEmail ? (
                  <input
                    type="email"
                    value={sendEmail}
                    disabled
                    className={`${inputCls} bg-stone-100 cursor-not-allowed text-stone-600`}
                  />
                ) : (
                  <input
                    type="email"
                    placeholder="client@example.com (no email saved — edit prospect first)"
                    value={sendEmail}
                    onChange={e => setSendEmail(e.target.value)}
                    autoFocus
                    className={inputCls}
                  />
                )}
                {!sendModal?.prospect?.email && (
                  <p className="text-[10px] text-amber-600 font-semibold">No email on record — update the prospect brief to add one.</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setSendModal(null)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                <button
                  onClick={handleSend}
                  disabled={sending || !sendEmail.trim()}
                  className={`${btnPrimary} flex-1 justify-center`}
                >
                  {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {sending ? 'Sending…' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
