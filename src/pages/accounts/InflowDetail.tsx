import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Send, Edit2, FileText, ExternalLink } from 'lucide-react';
import { inflowApi, type InflowChallan } from '../../services/accounts.api.js';
import type { User } from '../../context/AuthContext.js';
import { useRouter } from '../../context/RouterContext.js';
import { useToast } from '../../context/ToastContext.js';
import { canWrite } from '../../config/permissions.js';
import { fileUrl } from '../../services/api.js';
import { InflowForm } from './InflowForm.js';
import { printInflowBill } from '../../utils/printBill.js';

interface Props { currentUser: User; challanId: string; }

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-stone-700/40 text-stone-400',
  SUBMITTED: 'bg-amber-500/15 text-amber-400',
  APPROVED:  'bg-emerald-500/15 text-emerald-400',
  REJECTED:  'bg-red-500/15 text-red-400',
};

export const InflowDetail: React.FC<Props> = ({ currentUser, challanId }) => {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [challan, setChallan] = useState<InflowChallan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    try {
      const res = await inflowApi.getById(challanId);
      setChallan(res.data.data);
    } catch { showToast('Challan not found.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [challanId]);

  const act = async (fn: () => Promise<any>, msg: string) => {
    setActing(true);
    try { await fn(); showToast(msg, 'success'); load(); }
    catch (e: any) { showToast(e?.response?.data?.message ?? 'Action failed.', 'error'); }
    finally { setActing(false); }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-[11px] text-[var(--text-muted)]">Loading…</div>;
  if (!challan) return null;

  const isSuperAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isOwner = challan.createdById === (currentUser as any).userId;
  const canEdit = canWrite(currentUser.role) && (challan.status === 'DRAFT' || challan.status === 'REJECTED');
  const canSubmit = canWrite(currentUser.role) && (challan.status === 'DRAFT' || challan.status === 'REJECTED') && (isOwner || isSuperAdmin);
  const canApprove = isSuperAdmin && challan.status === 'SUBMITTED';

  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/accounts/inflow')} className="p-2 rounded-lg hover:bg-white/8 text-stone-400 transition-colors">
          <ArrowLeft size={15} />
        </button>
        <h2 className="text-[13px] font-bold text-[var(--text-primary)] flex-1">{challan.challanNo}</h2>
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${STATUS_COLORS[challan.status]}`}>
          {challan.status}
        </span>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 grid grid-cols-2 gap-4 text-[11px]">
        <Row label="Date" value={new Date(challan.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
        <Row label="Client" value={challan.clientName} />
        <Row label="Site" value={challan.siteName ?? '—'} />
        <Row label="Purpose" value={challan.purpose?.name} />
        <Row label="Mode of Payment" value={challan.modeOfPayment} />
        <Row label="Payment Status" value={challan.paymentStatus} />
        <Row label="Amount" value={`₹${Number(challan.amount).toLocaleString('en-IN')}`} />
        <Row label="Tax" value={challan.isTaxApplicable ? `${challan.taxPercent}% (${challan.taxType}) = ₹${Number(challan.taxAmount).toLocaleString('en-IN')}` : '—'} />
        <Row label="Final Amount" value={<span className="font-bold text-emerald-400">₹{Number(challan.finalAmount).toLocaleString('en-IN')}</span>} />
        {challan.description && <Row label="Description" value={challan.description} span />}
        <Row label="Created By" value={challan.createdBy?.name} />
        {challan.approvedBy && <Row label="Approved By" value={challan.approvedBy.name} />}
        {challan.rejectionReason && <Row label="Rejection Reason" value={<span className="text-red-400">{challan.rejectionReason}</span>} span />}

        {challan.supportingDocUrl && (
          <div className="col-span-2">
            <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wide mb-1">Supporting Document</p>
            <a
              href={challan.supportingDocUrl.startsWith('http') ? challan.supportingDocUrl : fileUrl(challan.supportingDocUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 hover:underline font-medium"
            >
              <ExternalLink size={12} />
              {challan.supportingDocName ?? 'View Document'}
            </a>
          </div>
        )}
      </div>

      {/* Rejection info */}
      {challan.status === 'REJECTED' && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-[11px] text-red-400">
          This challan was rejected. Edit and re-submit to seek approval again.
        </div>
      )}

      {/* Online info */}
      {challan.modeOfPayment === 'ONLINE' && challan.status === 'SUBMITTED' && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-[11px] text-amber-400">
          Awaiting Super Admin approval for online payment.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {canEdit && (
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors"
          >
            <Edit2 size={13} /> Edit
          </button>
        )}

        {canSubmit && (
          <button
            disabled={acting}
            onClick={() => act(() => inflowApi.submit(challan.id), 'Challan submitted.')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:shadow-md transition-all disabled:opacity-60"
          >
            <Send size={13} /> Submit for Processing
          </button>
        )}

        {canApprove && (
          <>
            <button
              disabled={acting}
              onClick={() => act(() => inflowApi.approve(challan.id), 'Challan approved.')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-60"
            >
              <CheckCircle size={13} /> Approve
            </button>
            <button
              disabled={acting}
              onClick={() => setShowRejectBox(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-60"
            >
              <XCircle size={13} /> Reject
            </button>
          </>
        )}

        <button
          onClick={() => printInflowBill(challan)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors ml-auto"
        >
          <FileText size={13} /> Print / PDF
        </button>
      </div>

      {/* Reject modal */}
      {showRejectBox && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-red-400">Rejection Reason *</p>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Explain why this challan is being rejected…"
            className="w-full px-3 py-2 text-[11px] rounded-lg bg-[var(--bg)] border border-red-500/30 text-[var(--text-primary)] focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowRejectBox(false)} className="flex-1 py-2 rounded-lg border border-[var(--border)] text-[11px] text-[var(--text-secondary)] hover:bg-white/5">Cancel</button>
            <button
              disabled={!rejectReason.trim() || acting}
              onClick={() => act(() => inflowApi.reject(challan.id, rejectReason), 'Challan rejected.').then(() => setShowRejectBox(false))}
              className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-60"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}

      {showEdit && (
        <InflowForm
          currentUser={currentUser}
          existing={challan}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
        />
      )}
    </div>
  );
};

function Row({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wide mb-0.5">{label}</p>
      <p className="text-[var(--text-primary)] font-medium">{value}</p>
    </div>
  );
}
