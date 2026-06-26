import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Send, Edit2, ExternalLink, FileText } from 'lucide-react';
import { outflowApi, type OutflowExpense } from '../../services/accounts.api.js';
import type { User } from '../../context/AuthContext.js';
import { useRouter } from '../../context/RouterContext.js';
import { useToast } from '../../context/ToastContext.js';
import { canWrite } from '../../config/permissions.js';
import { OutflowForm } from './OutflowForm.js';
import { fileUrl } from '../../services/api.js';
import { printOutflowBill } from '../../utils/printBill.js';

interface Props { currentUser: User; expenseId: string; }

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-stone-700/40 text-stone-400',
  SUBMITTED: 'bg-amber-500/15 text-amber-400',
  APPROVED:  'bg-emerald-500/15 text-emerald-400',
  REJECTED:  'bg-red-500/15 text-red-400',
};

export const OutflowDetail: React.FC<Props> = ({ currentUser, expenseId }) => {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [expense, setExpense] = useState<OutflowExpense | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    try {
      const res = await outflowApi.getById(expenseId);
      setExpense(res.data.data);
    } catch { showToast('Expense not found.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [expenseId]);

  const act = async (fn: () => Promise<any>, msg: string) => {
    setActing(true);
    try { await fn(); showToast(msg, 'success'); load(); }
    catch (e: any) { showToast(e?.response?.data?.message ?? 'Action failed.', 'error'); }
    finally { setActing(false); }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-[11px] text-[var(--text-muted)]">Loading…</div>;
  if (!expense) return null;

  const isSuperAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isOwner = expense.createdById === (currentUser as any).userId;
  const canEdit = canWrite(currentUser.role) && (expense.status === 'DRAFT' || expense.status === 'REJECTED');
  const canSubmit = canWrite(currentUser.role) && (expense.status === 'DRAFT' || expense.status === 'REJECTED') && (isOwner || isSuperAdmin);
  const canApprove = isSuperAdmin && expense.status === 'SUBMITTED';

  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/accounts/outflow')} className="p-2 rounded-lg hover:bg-white/8 text-stone-400 transition-colors">
          <ArrowLeft size={15} />
        </button>
        <h2 className="text-[13px] font-bold text-[var(--text-primary)] flex-1">{expense.name}</h2>
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${STATUS_COLORS[expense.status]}`}>
          {expense.status}
        </span>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 grid grid-cols-2 gap-4 text-[11px]">
        <Row label="Date" value={new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
        <Row label="Category" value={expense.category?.name} />
        <Row label="Type" value={expense.expenseType} />
        <Row label="Purpose" value={expense.purpose?.name} />
        <Row label="Amount" value={<span className="font-bold text-red-400">₹{Number(expense.amount).toLocaleString('en-IN')}</span>} />
        <Row label="Mode of Payment" value={expense.modeOfPayment} />
        {expense.projectManager && <Row label="Project Manager" value={expense.projectManager.name} />}
        {expense.siteName && <Row label="Site" value={expense.siteName} />}
        {expense.employeeName && <Row label="Employee" value={expense.employeeName} />}
        {expense.salaryMonth && <Row label="Salary Month" value={expense.salaryMonth} />}
        {expense.salaryPayStatus && <Row label="Salary Status" value={expense.salaryPayStatus} />}
        {expense.expenseName && <Row label="Expense Item" value={expense.expenseName} />}
        {expense.department && <Row label="Department" value={expense.department} />}
        {expense.description && <Row label="Description" value={expense.description} span />}
        <Row label="Created By" value={expense.createdBy?.name} />
        {expense.approvedBy && <Row label="Approved By" value={expense.approvedBy.name} />}
        {expense.rejectionReason && <Row label="Rejection Reason" value={<span className="text-red-400">{expense.rejectionReason}</span>} span />}

        {/* Supporting Doc */}
        <div className="col-span-2">
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wide mb-1">Supporting Document</p>
          <a
            href={expense.supportingDocUrl.startsWith('http') ? expense.supportingDocUrl : fileUrl(expense.supportingDocUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 hover:underline font-medium"
          >
            <ExternalLink size={12} />
            {expense.supportingDocName}
          </a>
        </div>
      </div>

      {expense.status === 'REJECTED' && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-[11px] text-red-400">
          This expense was rejected. Edit and re-submit to seek approval again.
        </div>
      )}

      {expense.status === 'SUBMITTED' && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-[11px] text-amber-400">
          Awaiting Super Admin approval.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {canEdit && (
          <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors">
            <Edit2 size={13} /> Edit
          </button>
        )}
        {canSubmit && (
          <button
            disabled={acting}
            onClick={() => act(() => outflowApi.submit(expense.id), 'Expense submitted for approval.')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:shadow-md transition-all disabled:opacity-60"
          >
            <Send size={13} /> Submit for Approval
          </button>
        )}
        {canApprove && (
          <>
            <button
              disabled={acting}
              onClick={() => act(() => outflowApi.approve(expense.id), 'Expense approved.')}
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
          onClick={() => printOutflowBill(expense)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors ml-auto"
        >
          <FileText size={13} /> Print / PDF
        </button>
      </div>

      {showRejectBox && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-red-400">Rejection Reason *</p>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Explain why this expense is being rejected…"
            className="w-full px-3 py-2 text-[11px] rounded-lg bg-[var(--bg)] border border-red-500/30 text-[var(--text-primary)] focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowRejectBox(false)} className="flex-1 py-2 rounded-lg border border-[var(--border)] text-[11px] text-[var(--text-secondary)] hover:bg-white/5">Cancel</button>
            <button
              disabled={!rejectReason.trim() || acting}
              onClick={() => act(() => outflowApi.reject(expense.id, rejectReason), 'Expense rejected.').then(() => setShowRejectBox(false))}
              className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-60"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}

      {showEdit && (
        <OutflowForm
          currentUser={currentUser}
          existing={expense}
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
