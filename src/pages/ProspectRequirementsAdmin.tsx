import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { prospectApi } from '../services/api.js';
import type { User } from '../context/AuthContext.js';
import { SearchableSelect } from '../components/SearchableSelect.js';
import { ProspectForm, SERVICE_LABELS, COMMUNICATION_MODES, btnPrimary, btnSecondary } from '../components/ProspectForm.js';
import type { ProspectFormData } from '../components/ProspectForm.js';
import { useToast } from '../context/ToastContext.js';
import { useRouter } from '../context/RouterContext.js';
import {
  ClipboardList, Search, RefreshCw, ChevronLeft, ChevronRight, X,
  Edit2, Eye, Phone, Mail, Check, XCircle, ShieldCheck, Ban, FileText,
} from 'lucide-react';

interface Props { currentUser: User; }

const ITEMS_PER_PAGE = 10;
const DEFAULT_BUDGET_OPTIONS = ['0 - 5L', '5 - 10L', '10 - 15L', '15 - 20L', '20 - 30L', '30 - 40L', '40 - 50L', 'Above'];

const card = 'bg-white border border-[rgba(184,144,71,0.22)] rounded-xl shadow-xs';
const inputBase = 'w-full bg-white border border-[rgba(184,144,71,0.35)] text-stone-900 text-[13px] rounded-lg px-3.5 py-1.5 outline-none transition focus:border-[#b89047] focus:ring-2 focus:ring-[rgba(184,144,71,0.2)] font-[inherit] compact-input';
const labelBase = 'text-[10px] font-bold uppercase tracking-wide text-stone-500';

const workflowStageBadgeClasses: Record<string, string> = {
  LEAD_CAPTURED: 'text-stone-600 font-semibold',
  OFFLINE_MEETING: 'text-indigo-700 font-semibold',
  ONLINE_MEETING: 'text-indigo-700 font-semibold',
  SITE_DETAILS_REQUESTED: 'text-sky-700 font-semibold',
  SITE_DETAILS_UPLOADED: 'text-blue-700 font-semibold',
  PROPOSAL_SENT: 'text-purple-700 font-semibold',
  PROPOSAL_IN_PROGRESS: 'text-amber-700 font-semibold',
  PROPOSAL_ACCEPTED: 'text-emerald-700 font-semibold',
  PROPOSAL_REJECTED: 'text-rose-700 font-semibold',
  PROPOSAL_AGREED: 'text-emerald-700 font-semibold',
  FINAL_DISCUSSION: 'text-amber-705 font-semibold',
  WON: 'text-green-700 font-bold',
  LOST: 'text-red-700 font-bold',
  FOLLOW_UP_GENERAL: 'text-stone-700 font-semibold',
  NEGOTIATION_FOLLOW_UP: 'text-amber-700 font-semibold',
  ON_CALL_FOLLOW_UP: 'text-sky-700 font-semibold',
  OFFLINE_FOLLOW_UP: 'text-stone-700 font-semibold',
};

const statusBadgeClasses: Record<string, string> = {
  ACTIVE: 'text-emerald-700 font-semibold',
  PENDING_DELETE: 'text-orange-700 font-semibold',
  DELETED: 'text-stone-500 font-semibold',
};

export const ProspectRequirementsAdmin: React.FC<Props> = ({ currentUser: _currentUser }) => {
  const { showToast } = useToast();
  const { navigate } = useRouter();

  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterService, setFilterService] = useState('ALL');
  const [filterComm, setFilterComm] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterState, setFilterState] = useState('ALL');
  const [filterDistrict, setFilterDistrict] = useState('ALL');

  // Edit modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serviceBudgets, setServiceBudgets] = useState<Record<string, string[]>>({});

  // Budget config modal
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedBudgetService, setSelectedBudgetService] = useState('ARCHITECTURAL_CONSULTATION');
  const [tempBudgetInput, setTempBudgetInput] = useState('');

  const fetchProspects = async () => {
    setLoading(true); setError(null);
    try {
      const res = await prospectApi.getProspects();
      setProspects(res.data.prospects || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load prospects.';
      setError(msg); showToast(msg, 'error');
    } finally { setLoading(false); }
  };

  const fetchBudgets = async () => {
    try {
      const res = await prospectApi.getServiceBudgets();
      if (res.data?.budgets) setServiceBudgets(res.data.budgets);
    } catch { /* non-critical */ }
  };

  useEffect(() => { fetchProspects(); fetchBudgets(); }, []);

  const handleApproveStatus = async (id: string, newStatus: string) => {
    setError(null); setSuccess(null);
    try {
      await prospectApi.updateProspect(id, { status: newStatus });
      const msg = `Status updated to ${newStatus}.`;
      setSuccess(msg); showToast(msg, 'success');
      fetchProspects();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update status.';
      setError(msg); showToast(msg, 'error');
    }
  };

  const handleSubmit = async (data: ProspectFormData) => {
    if (!editTarget) return;
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      const res = await prospectApi.updateProspect(editTarget.id, data);
      const msg = res.data.message || 'Brief updated successfully.';
      setSuccess(msg); showToast(msg, 'success');
      setShowFormModal(false); setEditTarget(null);
      fetchProspects();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update brief.';
      setError(msg); showToast(msg, 'error');
      throw err;
    } finally { setSubmitting(false); }
  };

  const handleSaveBudgets = async () => {
    setError(null);
    const ranges = tempBudgetInput.split(',').map(r => r.trim()).filter(Boolean);
    if (ranges.length === 0) { showToast('Enter at least one budget range.', 'error'); return; }
    try {
      const res = await prospectApi.updateServiceBudget(selectedBudgetService, ranges);
      if (res.data.success) {
        showToast('Budget ranges updated.', 'success');
        fetchBudgets();
        setShowBudgetModal(false);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update budgets.';
      setError(msg); showToast(msg, 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      { key: 'clientName', label: 'Client Name' }, { key: 'mobileNo', label: 'Mobile Number' },
      { key: 'preferredCommunication', label: 'Preferred Comm Mode' }, { key: 'email', label: 'Email' },
      { key: 'state', label: 'State' }, { key: 'district', label: 'District' },
      { key: 'locality', label: 'Locality/Area' }, { key: 'pincode', label: 'Pincode' },
      { key: 'serviceType', label: 'Service Type' }, { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created At' },
    ];
    const rows = [headers.map(h => `"${h.label}"`).join(',')];
    for (const p of filteredProspects) {
      rows.push(headers.map(h => `"${String(p[h.key] ?? '').replace(/"/g, '""')}"`).join(','));
    }
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Prospects_Admin_${new Date().toISOString().split('T')[0]}.csv`;
    a.style.visibility = 'hidden';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('Exported successfully.', 'success');
  };

  const uniqueStates = useMemo(() => ['ALL', ...Array.from(new Set(prospects.map(p => p.state).filter(Boolean)))], [prospects]);
  const uniqueDistricts = useMemo(() => ['ALL', ...Array.from(new Set(prospects.map(p => p.district).filter(Boolean)))], [prospects]);

  const filteredProspects = useMemo(() => prospects.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || [p.clientName, p.mobileNo, p.locality, p.email, p.pincode, p.district, p.state, p.serviceType].some((v: any) => v?.toLowerCase().includes(s));
    const matchService = filterService === 'ALL' || p.serviceType?.split(',').includes(filterService);
    const matchComm = filterComm === 'ALL' || p.preferredCommunication === filterComm;
    const matchStatus = filterStatus === 'ALL' || (p.status || 'ACTIVE') === filterStatus;
    const matchState = filterState === 'ALL' || p.state === filterState;
    const matchDistrict = filterDistrict === 'ALL' || p.district === filterDistrict;
    return matchSearch && matchService && matchComm && matchStatus && matchState && matchDistrict;
  }), [prospects, searchTerm, filterService, filterComm, filterStatus, filterState, filterDistrict]);

  useEffect(() => setCurrentPage(1), [searchTerm, filterService, filterComm, filterStatus, filterState, filterDistrict]);

  const indexStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProspects = useMemo(() => filteredProspects.slice(indexStart, indexStart + ITEMS_PER_PAGE), [filteredProspects, indexStart]);
  const totalPages = useMemo(() => Math.ceil(filteredProspects.length / ITEMS_PER_PAGE) || 1, [filteredProspects]);

  // Admin-only slot: budget management link shown inside the services header
  const budgetSlot = (
    <button type="button"
      onClick={() => {
        const svc = editTarget?.serviceType?.split(',')[0] || 'ARCHITECTURAL_CONSULTATION';
        setSelectedBudgetService(svc);
        setTempBudgetInput((serviceBudgets[svc] || DEFAULT_BUDGET_OPTIONS).join(', '));
        setShowBudgetModal(true);
      }}
      className="text-[10px] font-bold text-[#b89047] hover:text-[#9e7735] underline border-0 bg-transparent cursor-pointer">
      Manage Service Budgets
    </button>
  );

  return (
    <div className="animate-fade-in flex flex-col h-full min-h-0">
      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4 shrink-0">
        <button onClick={handleExportCSV} className={btnSecondary} disabled={filteredProspects.length === 0}>
          <FileText size={14} /><span>Export Report</span>
        </button>
        <button onClick={fetchProspects} className={btnSecondary}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {success && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] shrink-0">
          <ShieldCheck size={14} className="shrink-0 mt-0.5" />{success}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[12px] shrink-0">
          <Ban size={14} className="shrink-0 mt-0.5" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div className={`${card} flex items-center px-3.5 py-3.5 mb-4 shrink-0`}><div className="h-4 w-64 bg-stone-100 rounded shimmer" /></div>
          <div className={`${card} flex-1 overflow-hidden flex flex-col`}><div className="py-20 text-center text-stone-400">Loading prospects...</div></div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-wrap items-end gap-3 mb-4 shrink-0 bg-stone-50/30 p-2.5 rounded-xl border border-[rgba(184,144,71,0.15)] animate-fade-in">
            <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
              <span className="text-[9px] font-bold text-stone-450 uppercase tracking-wide">Search Query</span>
              <div className={`${card} flex items-center gap-2.5 px-3.5 py-1.5 compact-search-container bg-white`}>
                <Search size={14} className="text-stone-400 shrink-0" />
                <input type="text" placeholder="Search by client name, contact, locality or service type…"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-[12px] text-stone-800 placeholder:text-stone-400" />
              </div>
            </div>

            {[
              { label: 'Service Type', val: filterService, set: setFilterService, opts: [{ value: 'ALL', label: 'All Services' }, ...Object.entries(SERVICE_LABELS).map(([v, l]) => ({ value: v, label: l }))] },
              { label: 'Comm. Mode', val: filterComm, set: setFilterComm, opts: [{ value: 'ALL', label: 'All Modes' }, ...COMMUNICATION_MODES] },
              { label: 'Status', val: filterStatus, set: setFilterStatus, opts: [{ value: 'ALL', label: 'All Statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'PENDING_DELETE', label: 'Pending Delete' }, { value: 'DELETED', label: 'Deleted (Archived)' }] },
              { label: 'State', val: filterState, set: setFilterState, opts: uniqueStates.map(s => ({ value: s, label: s === 'ALL' ? 'All States' : s })) },
              { label: 'District', val: filterDistrict, set: setFilterDistrict, opts: uniqueDistricts.map(d => ({ value: d, label: d === 'ALL' ? 'All Districts' : d })) },
            ].map(({ label, val, set, opts }) => (
              <div key={label} className="flex flex-col gap-1 flex-1 min-w-[130px]">
                <span className="text-[9px] font-bold text-stone-450 uppercase tracking-wide">{label}</span>
                <SearchableSelect options={opts} value={val} onChange={set} />
              </div>
            ))}
          </div>

          <div className={`${card} flex-1 overflow-y-auto overflow-x-auto scrollbar-thin flex flex-col justify-between`}>
            <div className="overflow-x-auto min-w-full">
              <table className="w-full border-collapse text-left min-w-[850px]">
                <thead>
                  <tr className="bg-stone-50/80 sticky top-0 z-10 backdrop-blur-xs">
                    {['S.No.', 'Client Name', 'Mobile Number', 'Email', 'Preferred Comm.', 'State', 'District', 'Locality / Area', 'Pincode', 'Services Requested', 'Workflow', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-stone-500 border-b border-[rgba(184,144,71,0.18)] bg-stone-50 text-center whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedProspects.length === 0 ? (
                    <tr><td colSpan={13} className="text-center py-10 text-[12px] text-stone-400 italic">No prospects found.</td></tr>
                  ) : paginatedProspects.map((p, i) => (
                    <tr key={p.id} className="hover:bg-stone-50/40 transition-colors">
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12px] font-medium text-stone-500 text-center">{indexStart + i + 1}</td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12.5px] font-semibold text-stone-900 text-center whitespace-nowrap">{p.clientName}</td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12px] text-stone-600 font-medium text-center whitespace-nowrap">{p.mobileNo}</td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12px] text-stone-600 font-medium text-center whitespace-nowrap">{p.email || '—'}</td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12px] font-medium text-stone-700 text-center whitespace-nowrap">
                        {p.preferredCommunication === 'PHONE_CALL' ? 'Phone Call' : p.preferredCommunication === 'WHATSAPP' ? 'Whatsapp' : 'Email'}
                      </td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12px] text-stone-700 font-medium text-center whitespace-nowrap">{p.state || '—'}</td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12px] text-stone-700 font-medium text-center whitespace-nowrap">{p.district || '—'}</td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12px] text-stone-700 font-medium text-center truncate max-w-[150px]" title={p.locality}>{p.locality}</td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12px] text-stone-700 font-medium text-center whitespace-nowrap">{p.pincode || '—'}</td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center">
                        <div className="flex flex-wrap gap-1.5 justify-center max-w-[200px] mx-auto">
                          {(p.serviceType || '').split(',').filter(Boolean).map((s: string, sIdx: number, arr: string[]) => (
                            <span key={s} className="text-[#7e5a20] text-[12px] font-semibold">
                              {SERVICE_LABELS[s] || s}{sIdx < arr.length - 1 ? ',' : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center">
                        <span className={`text-[12px] font-semibold uppercase tracking-wide ${workflowStageBadgeClasses[p.workflowStage || 'LEAD_CAPTURED'] || 'text-stone-600'}`}>
                          {(p.workflowStage || 'LEAD_CAPTURED').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center">
                        {p.status && p.status !== 'ACTIVE' ? (
                          <span className={`text-[11.5px] font-bold uppercase tracking-wide ${statusBadgeClasses[p.status] || 'text-stone-500'}`}>
                            {p.status === 'PENDING_DELETE' ? 'Pending Delete' : p.status}
                          </span>
                        ) : <span className="text-[12px] text-stone-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center">
                        <div className="inline-flex gap-1 justify-center">
                          {p.status === 'PENDING_DELETE' && (
                            <>
                              <button onClick={() => handleApproveStatus(p.id, 'DELETED')} className={`${btnSecondary} text-rose-600 border-rose-100 hover:bg-rose-50`} style={{ padding: '5px 8px' }} title="Approve deletion">
                                <Check size={11} />
                              </button>
                              <button onClick={() => handleApproveStatus(p.id, 'ACTIVE')} className={`${btnSecondary} text-emerald-600 border-emerald-100 hover:bg-emerald-50`} style={{ padding: '5px 8px' }} title="Reject deletion">
                                <XCircle size={11} />
                              </button>
                            </>
                          )}
                          {p.status === 'DELETED' && (
                            <button onClick={() => handleApproveStatus(p.id, 'ACTIVE')} className={`${btnSecondary} text-emerald-600 border-emerald-100 hover:bg-emerald-50`} style={{ padding: '5px 8px' }} title="Restore">
                              <RefreshCw size={11} />
                            </button>
                          )}
                          <button onClick={() => navigate(`/prospects/${p.id}`)} className={btnSecondary} style={{ padding: '5px 8px' }} title="View pipeline">
                            <Eye size={11} />
                          </button>
                          {p.status !== 'PENDING_DELETE' && p.status !== 'DELETED' && (
                            <button onClick={() => { setEditTarget(p); setShowFormModal(true); }} className={btnSecondary} style={{ padding: '5px 8px' }} title="Edit brief">
                              <Edit2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredProspects.length > 0 && (
              <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[rgba(184,144,71,0.18)] text-[11px] text-stone-500 bg-stone-50/50 select-none">
                <span>Showing {indexStart + 1}–{Math.min(indexStart + ITEMS_PER_PAGE, filteredProspects.length)} of {filteredProspects.length}</span>
                <div className="flex items-center gap-1.5">
                  <button className="p-1 rounded border border-[rgba(184,144,71,0.25)] bg-white hover:bg-[rgba(184,144,71,0.08)] disabled:opacity-40 cursor-pointer transition-colors"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft size={12} />
                  </button>
                  <span className="px-1.5">Page {currentPage} of {totalPages}</span>
                  <button className="p-1 rounded border border-[rgba(184,144,71,0.25)] bg-white hover:bg-[rgba(184,144,71,0.08)] disabled:opacity-40 cursor-pointer transition-colors"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Brief Modal */}
      {showFormModal && editTarget && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => { setShowFormModal(false); setEditTarget(null); }}>
          <div className="animate-scale-in w-full max-w-5xl lg:max-w-6xl bg-white sm:rounded-2xl shadow-2xl border-0 sm:border border-[rgba(184,144,71,0.3)] flex flex-col h-screen sm:h-auto sm:max-h-[calc(100vh-40px)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 sm:p-5 border-b border-stone-100 shrink-0">
              <h3 className="flex items-center gap-2 text-[14px] sm:text-[16px] font-bold text-stone-900">
                <ClipboardList size={17} className="text-[#b89047] shrink-0" /> Modify Client Brief
              </h3>
              <button onClick={() => { setShowFormModal(false); setEditTarget(null); }} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>
            <ProspectForm
              key={editTarget.id}
              mode="edit"
              initialData={editTarget}
              serviceBudgets={serviceBudgets}
              onSubmit={handleSubmit}
              onCancel={() => { setShowFormModal(false); setEditTarget(null); }}
              isSubmitting={submitting}
              adminHeaderSlot={budgetSlot}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Budget Config Modal */}
      {showBudgetModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowBudgetModal(false)}>
          <div className="animate-scale-in w-full max-w-[480px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
              <h3 className="text-[14px] font-bold text-stone-900">Manage Service Budgets</h3>
              <button onClick={() => setShowBudgetModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 cursor-pointer border-0 bg-transparent">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Service</label>
                <SearchableSelect
                  options={Object.entries(SERVICE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                  value={selectedBudgetService}
                  onChange={svc => { setSelectedBudgetService(svc); setTempBudgetInput((serviceBudgets[svc] || DEFAULT_BUDGET_OPTIONS).join(', ')); }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Budget Ranges (comma-separated)</label>
                <textarea
                  rows={3} placeholder="e.g. 0 - 5L, 5 - 10L, Above 50L"
                  value={tempBudgetInput} onChange={e => setTempBudgetInput(e.target.value)}
                  className={`${inputBase} resize-none`}
                />
                <p className="text-[10px] text-stone-400">Each value becomes a dropdown option in the form.</p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button onClick={() => setShowBudgetModal(false)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                <button onClick={handleSaveBudgets} className={`${btnPrimary} flex-1 justify-center`}>Save Ranges</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
