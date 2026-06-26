import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Search, RefreshCw, X, Paperclip, ExternalLink, HardHat, FileText, Send, 
  ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertTriangle, AlertCircle, Loader2, Info
} from 'lucide-react';
import { outflowApi, accountsMasterApi, type ExpenseCategoryMaster, type PurposeMaster } from '../../services/accounts.api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { api } from '../../services/api.js';

interface Props { currentUser: User; }

interface SitePaymentRequest {
  id: string;
  srNo: number;
  sprNo: string;
  projectId: string;
  expenseType: string;
  description: string;
  amount: string;
  vendorName: string | null;
  documents: string | null;
  status: 'PENDING_PM' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED' | 'SENT_BACK';
  requestedById: string;
  requestedBy: { id: string; name: string };
  pmReviewedById: string | null;
  pmReviewedBy: { id: string; name: string } | null;
  pmReviewedAt: string | null;
  pmRemarks: string | null;
  adminReviewedById: string | null;
  adminReviewedBy: { id: string; name: string } | null;
  adminReviewedAt: string | null;
  adminRemarks: string | null;
  outflowExpenseId: string | null;
  createdAt: string;
  project: {
    id: string;
    prospect: {
      client: {
        clientName: string;
      };
    };
  };
}

const btnSecondary = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-slate-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

export const ConstructionPayments: React.FC<Props> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<SitePaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');

  // Categories and Purposes for Processing
  const [categories, setCategories] = useState<ExpenseCategoryMaster[]>([]);
  const [purposes, setPurposes] = useState<PurposeMaster[]>([]);

  // Modals state
  const [processingSPR, setProcessingSPR] = useState<SitePaymentRequest | null>(null);
  const [rejectingSPR, setRejectingSPR] = useState<SitePaymentRequest | null>(null);
  const [expandedSPRId, setExpandedSPRId] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({
    amount: '',
    categoryId: '',
    purposeId: '',
    modeOfPayment: 'ONLINE' as 'ONLINE' | 'CASH' | 'OTHER',
    description: '',
  });
  const [docs, setDocs] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loadMasters = useCallback(async () => {
    try {
      const [catsRes, purpsRes] = await Promise.all([
        accountsMasterApi.listCategories(),
        accountsMasterApi.listPurposes('OUTFLOW'),
      ]);
      setCategories(catsRes.data.data);
      setPurposes(purpsRes.data.data);
    } catch (e) {
      console.error('Failed to load accounts masters.', e);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await outflowApi.listConstructionPayments();
      setRequests(res.data.data);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to load site payment requests.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadMasters();
    loadRequests();
  }, [loadMasters, loadRequests]);

  // Set default values when opening the process modal
  useEffect(() => {
    if (processingSPR) {
      // Find default category (e.g. matching "Site Expenses") or first
      const defaultCat = categories.find(c => c.name.toLowerCase() === 'site expenses') || categories[0];
      // Find default purpose (e.g. matching "Site Payment Request") or first
      const defaultPurp = purposes.find(p => p.name.toLowerCase() === 'site payment request') || purposes[0];

      setForm({
        amount: String(processingSPR.amount),
        categoryId: defaultCat?.id || '',
        purposeId: defaultPurp?.id || '',
        modeOfPayment: 'ONLINE',
        description: `Processed payment request ${processingSPR.sprNo} for ${processingSPR.project.prospect.client.clientName}. Submitter notes: ${processingSPR.description}`,
      });
      setDocs([]);
    }
  }, [processingSPR, categories, purposes]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data', 'x-file-type': 'outflow' },
      });
      setDocs(prev => [...prev, { url: res.data.url, name: file.name }]);
      showToast('Document uploaded successfully.', 'success');
    } catch (e) {
      showToast('Failed to upload voucher.', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleProcessSubmit = async () => {
    if (!processingSPR) return;
    if (!form.amount || Number(form.amount) <= 0) {
      showToast('Please enter a valid payout amount.', 'error');
      return;
    }
    if (!form.categoryId) {
      showToast('Please select an outflow category.', 'error');
      return;
    }
    if (!form.purposeId) {
      showToast('Please select a payment purpose.', 'error');
      return;
    }

    setSaving(true);
    try {
      await outflowApi.processConstructionPayment(processingSPR.id, {
        amount: Number(form.amount),
        categoryId: form.categoryId,
        purposeId: form.purposeId,
        modeOfPayment: form.modeOfPayment,
        description: form.description,
      });
      showToast(`Outflow registered successfully in SUBMITTED status.`, 'success');
      setProcessingSPR(null);
      loadRequests();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to process request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingSPR) return;
    if (!rejectRemarks.trim()) {
      showToast('Please enter remarks for sending back the request.', 'error');
      return;
    }

    setSaving(true);
    try {
      await outflowApi.rejectConstructionPayment(rejectingSPR.id, { remarks: rejectRemarks.trim() });
      showToast('Payment request sent back to construction team.', 'success');
      setRejectingSPR(null);
      setRejectRemarks('');
      loadRequests();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to reject request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filter and partition requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      // 1. Search term match
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchNo = r.sprNo.toLowerCase().includes(term);
        const matchClient = r.project?.prospect?.client?.clientName?.toLowerCase().includes(term);
        const matchSubmitter = r.requestedBy?.name?.toLowerCase().includes(term);
        if (!matchNo && !matchClient && !matchSubmitter) return false;
      }

      // 2. Tab filtering
      if (activeTab === 'pending') {
        return r.status === 'APPROVED' && r.outflowExpenseId === null;
      } else {
        return r.outflowExpenseId !== null || r.status !== 'APPROVED';
      }
    });
  }, [requests, search, activeTab]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
      {/* Tabs bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--border)] pb-1">
        <div className="flex gap-1 bg-stone-100 dark:bg-slate-900 rounded-lg p-1 w-fit">
          <button
            onClick={() => { setActiveTab('pending'); setExpandedSPRId(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer
              ${activeTab === 'pending' ? 'bg-white dark:bg-slate-800 shadow text-stone-800 dark:text-stone-100' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <ArrowDownLeft size={14} /> Pending Processing ({requests.filter(r => r.status === 'APPROVED' && r.outflowExpenseId === null).length})
          </button>
          <button
            onClick={() => { setActiveTab('processed'); setExpandedSPRId(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer
              ${activeTab === 'processed' ? 'bg-white dark:bg-slate-800 shadow text-stone-800 dark:text-stone-100' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <ArrowUpRight size={14} /> Processed History
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadRequests} className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="relative w-full max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by SPR No, Site, or Submitter..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder-stone-400 focus:outline-none focus:border-[#b89047]/60"
        />
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-stone-400" /></div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 text-stone-400 text-xs italic bg-[var(--card-bg)] border border-[var(--border)] rounded-xl">
          No payment requests match the current filters.
        </div>
      ) : (
        <div className="table-container flex-1 overflow-auto">
          <table className="erp-table">
            <thead>
              <tr >
                <th >SPR No</th>
                <th >Site / Project</th>
                <th >Type</th>
                <th >Approved Amt</th>
                <th >Requested By</th>
                <th >Approver Info</th>
                <th >Status / Details</th>
                <th >Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/65">
              {filteredRequests.map(r => {
                const isExpanded = expandedSPRId === r.id;
                const formattedDate = new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                
                // Documents parsing
                let docsList: { url: string; name: string }[] = [];
                try { docsList = r.documents ? JSON.parse(r.documents) : []; } catch {}

                let statusBadge = (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide
                    ${r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                      : r.status === 'REJECTED' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
                      : 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400'}`}
                  >
                    {r.status === 'APPROVED' && r.outflowExpenseId ? 'Processed' : r.status}
                  </span>
                );

                return (
                  <React.Fragment key={r.id}>
                    <tr 
                      onClick={() => setExpandedSPRId(isExpanded ? null : r.id)}
                      className="cursor-pointer"
                    >
                      <td className="mono-cell">{r.sprNo}</td>
                      <td className="font-semibold text-[var(--text-primary)]">{r.project.prospect.client.clientName}</td>
                      <td >{r.expenseType}</td>
                      <td className="font-bold text-stone-700 dark:text-stone-300">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                      <td >
                        <div>@{r.requestedBy.name}</div>
                        <div className="text-[10px] text-stone-400">{formattedDate}</div>
                      </td>
                      <td >
                        {r.adminReviewedBy ? (
                          <div>Admin: {r.adminReviewedBy.name}</div>
                        ) : r.pmReviewedBy ? (
                          <div>PM: {r.pmReviewedBy.name}</div>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td >{statusBadge}</td>
                      <td  onClick={e => e.stopPropagation()}>
                        {activeTab === 'pending' ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setRejectingSPR(r)}
                              className="px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 transition-all text-[10px] font-bold cursor-pointer"
                            >
                              Send Back
                            </button>
                            <button
                              onClick={() => setProcessingSPR(r)}
                              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white hover:brightness-110 text-[10px] font-bold cursor-pointer shadow-sm"
                            >
                              Process
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setExpandedSPRId(isExpanded ? null : r.id)}
                            className="px-2.5 py-1.5 rounded bg-stone-50 dark:bg-slate-800 text-[var(--text-secondary)] hover:bg-stone-100 dark:hover:bg-slate-700 transition-all font-semibold cursor-pointer text-[10px]"
                          >
                            {isExpanded ? 'Hide' : 'Details'}
                          </button>
                        )}
                      </td>
                    </tr>
                    
                    {/* Collapsible Details Row */}
                    {isExpanded && (
                      <tr className="bg-stone-50/50 dark:bg-slate-900/30">
                        <td colSpan={8} className="px-6 py-4.5 border-b border-[var(--border)]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-3.5">
                              <div>
                                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-1">Purpose / Description</p>
                                <p className="text-stone-700 dark:text-stone-300 bg-white dark:bg-slate-900 border border-[var(--border)] rounded-lg p-3 leading-relaxed whitespace-pre-wrap">{r.description}</p>
                              </div>
                              {docsList.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-1.5">Supporting Documents</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {docsList.map((d, idx) => (
                                      <a 
                                        key={idx} 
                                        href={d.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[10px] bg-white dark:bg-slate-900 border border-[var(--border)] rounded px-2 py-1 text-[#b89047] hover:bg-stone-50/60 transition-all"
                                      >
                                        <Paperclip size={10} /> {d.name}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="space-y-3">
                              {/* Audit logs / Reviews */}
                              <div className="bg-white dark:bg-slate-900 border border-[var(--border)] rounded-lg p-3.5 space-y-2">
                                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-1.5">Review Summary</p>
                                {r.pmReviewedBy && (
                                  <div className="text-[11.5px] border-b border-[var(--border)]/40 pb-2">
                                    <p className="text-stone-700 dark:text-stone-300 font-semibold">Project Manager Review</p>
                                    <p className="text-stone-500 mt-0.5">Approved by: <span className="font-medium">@{r.pmReviewedBy.name}</span> on {new Date(r.pmReviewedAt!).toLocaleDateString('en-IN')}</p>
                                    {r.pmRemarks && <p className="text-stone-600 italic bg-stone-50 dark:bg-slate-950/20 p-2 rounded border border-[var(--border)]/40 mt-1">"{r.pmRemarks}"</p>}
                                  </div>
                                )}
                                {r.adminReviewedBy && (
                                  <div className="text-[11.5px] pt-1">
                                    <p className="text-stone-700 dark:text-stone-300 font-semibold">Super Admin Review</p>
                                    <p className="text-stone-500 mt-0.5">Approved by: <span className="font-medium">@{r.adminReviewedBy.name}</span> on {new Date(r.adminReviewedAt!).toLocaleDateString('en-IN')}</p>
                                    {r.adminRemarks && <p className="text-stone-600 italic bg-stone-50 dark:bg-slate-950/20 p-2 rounded border border-[var(--border)]/40 mt-1">"{r.adminRemarks}"</p>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Process Site Request */}
      {processingSPR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col border border-stone-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-stone-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-[14px] text-stone-800 dark:text-stone-100">Process Site Payment Request</h3>
                <p className="text-[10.5px] text-stone-400 dark:text-stone-500 mt-0.5">Approved under {processingSPR.sprNo} (Site: {processingSPR.project.prospect.client.clientName})</p>
              </div>
              <button onClick={() => setProcessingSPR(null)} className="p-1 rounded hover:bg-stone-100"><X size={16} /></button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin text-xs">
              <div className="bg-stone-50/50 dark:bg-slate-950/20 border border-[var(--border)] rounded-xl p-3.5 space-y-1">
                <p className="font-bold text-stone-700 dark:text-stone-300">Construction Approval Notes:</p>
                <p className="text-stone-600 dark:text-stone-400 mt-0.5">Amount requested: <strong>₹{Number(processingSPR.amount).toLocaleString('en-IN')}</strong></p>
                <p className="text-stone-500 mt-1 italic">"{processingSPR.description}"</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-stone-600 dark:text-stone-400 font-semibold">Payout Amount (₹) *</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#b89047]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-stone-600 dark:text-stone-400 font-semibold">Payment Mode *</label>
                  <select
                    value={form.modeOfPayment}
                    onChange={e => setForm(prev => ({ ...prev, modeOfPayment: e.target.value as any }))}
                    className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#b89047] cursor-pointer"
                  >
                    <option value="ONLINE">Online/Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Cheque / Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-stone-600 dark:text-stone-400 font-semibold">Outflow Expense Category *</label>
                  <select
                    value={form.categoryId}
                    onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#b89047] cursor-pointer"
                  >
                    <option value="">— Select Category —</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-stone-600 dark:text-stone-400 font-semibold">Expense Purpose *</label>
                  <select
                    value={form.purposeId}
                    onChange={e => setForm(prev => ({ ...prev, purposeId: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#b89047] cursor-pointer"
                  >
                    <option value="">— Select Purpose —</option>
                    {purposes.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-stone-600 dark:text-stone-400 font-semibold">Transaction Remarks / Voucher Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#b89047] resize-none"
                />
              </div>

              {/* Supporting document uploading */}
              <div className="space-y-2">
                <label className="text-stone-600 dark:text-stone-400 font-semibold">Attach Voucher / Payment Slip (Optional)</label>
                {docs.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-stone-50 dark:bg-slate-950/20 border border-[var(--border)] rounded-lg px-3 py-1.5">
                    <Paperclip size={11} className="text-stone-400 shrink-0" />
                    <span className="flex-1 truncate text-stone-700 dark:text-stone-300 font-medium">{d.name}</span>
                    <button onClick={() => setDocs(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-650 shrink-0 cursor-pointer">
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-stone-500 border border-dashed border-stone-300 dark:border-slate-800 rounded-lg px-3 py-2 hover:border-[#b89047] hover:text-[#b89047] cursor-pointer"
                >
                  {uploading ? <Loader2 size={12} className="animate-spin text-[#b89047]" /> : <Paperclip size={12} />}
                  <span>{uploading ? 'Uploading slip…' : 'Attach payment voucher/slip'}</span>
                </button>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
              </div>

              <div className="bg-blue-500/5 border border-blue-400/20 rounded-xl p-3 flex items-start gap-2.5 text-blue-600 dark:text-blue-400">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p className="text-[10.5px] leading-relaxed">
                  Submitting will create an outflow transaction request in the Accounts Outflow panel in **SUBMITTED** status, awaiting the standard Super Admin approval thread.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 px-6 py-4.5 border-t border-stone-100 dark:border-slate-800 bg-stone-50/30 dark:bg-slate-950/5">
              <button
                onClick={() => setProcessingSPR(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessSubmit}
                disabled={saving || uploading}
                className="px-4.5 py-2 rounded-lg text-xs font-bold bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                Process Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Send Back / Reject */}
      {rejectingSPR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-stone-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100">Send Back Request — {rejectingSPR.sprNo}</h3>
              <button onClick={() => setRejectingSPR(null)} className="p-1 rounded hover:bg-stone-100"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">Rejection / Send-Back Reason *</label>
                <textarea
                  value={rejectRemarks}
                  onChange={e => setRejectRemarks(e.target.value)}
                  rows={3}
                  className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#b89047] resize-none"
                  placeholder="Explain why this request is being returned to the site team (e.g., incomplete receipts, incorrect amount)..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-stone-100 dark:border-slate-800 bg-stone-50/20">
              <button
                onClick={() => setRejectingSPR(null)}
                className="px-4 py-2 rounded-lg text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {saving && <Loader2 size={13} className="animate-spin mr-1" />}
                Reject & Send Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
