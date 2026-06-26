import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { prospectApi, leadApi } from '../services/api.js';
import type { User } from '../context/AuthContext.js';
import { SearchableSelect } from '../components/SearchableSelect.js';
import { ProspectForm, SERVICE_LABELS, COMMUNICATION_MODES, btnPrimary, btnSecondary } from '../components/ProspectForm.js';
import type { ProspectFormData } from '../components/ProspectForm.js';
import { useToast } from '../context/ToastContext.js';
import { useRouter } from '../context/RouterContext.js';
import {
  ClipboardList, Search, RefreshCw, ChevronLeft, ChevronRight, X,
  Plus, Trash2, Eye, Phone, Mail, Check, FileText, UserPlus, Loader2,
  Edit2, AlertTriangle,
} from 'lucide-react';
import { clientApi } from '../services/api.js';
import { ShimmerTable } from '../components/Shimmer.js';

interface Props { currentUser: User; }

const ITEMS_PER_PAGE = 10;

const card = 'bg-white border border-[rgba(184,144,71,0.22)] rounded-xl shadow-xs';

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

export const ProspectRequirementsSales: React.FC<Props> = (_props) => {
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
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serviceBudgets, setServiceBudgets] = useState<Record<string, string[]>>({});
  const [formKey, setFormKey] = useState(0);

  // Edit prospect directly (no approval required)
  const [editingProspect, setEditingProspect] = useState<any | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const handleEditProspectSubmit = async (data: ProspectFormData) => {
    if (!editingProspect) return;
    setEditSubmitting(true);
    try {
      await prospectApi.updateProspect(editingProspect.id, data);
      showToast('Prospect updated successfully.', 'success');
      setEditingProspect(null);
      fetchProspects();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update prospect.', 'error');
      throw err;
    } finally {
      setEditSubmitting(false);
    }
  };

  // Add New Service for Existing Client
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [prefillData, setPrefillData] = useState<Partial<ProspectFormData> | null>(null);

  const fetchProspects = async () => {
    setLoading(true); setError(null);
    try {
      const res = await prospectApi.getProspects();
      setProspects(res.data.prospects || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load prospect requirements.';
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

  // Allow dashboard to open this form via custom event
  useEffect(() => {
    const open = () => { setFormKey(k => k + 1); setShowFormModal(true); };
    window.addEventListener('open-new-prospect-form', open);
    return () => window.removeEventListener('open-new-prospect-form', open);
  }, []);

  const syncToLeads = async (data: ProspectFormData) => {
    try {
      const phone = '+91' + data.mobileNo.replace(/[^0-9]/g, '').slice(-10);
      const validateRes = await leadApi.validateLeads([phone]);
      const duplicates: string[] = validateRes.data?.duplicates || [];
      if (!duplicates.includes(phone)) {
        const sourceMap: Record<string, string> = {
          INSTAGRAM: 'Instagram', META_FACEBOOK: 'Meta', REFERENCE: 'Referral',
        };
        await leadApi.createLead({
          fullName: data.clientName,
          phoneNumber: phone,
          city: data.locality || null,
          services: data.serviceType.split(',').filter((s: string) => !!s),
          platform: sourceMap[data.sourceType || ''] || 'Other',
          source: 'manual',
        });
      }
    } catch { /* non-critical — lead sync failure never blocks prospect */ }
  };

  const handleSubmit = async (data: ProspectFormData) => {
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      const res = await prospectApi.createProspect(data);
      const msg = res.data.message || 'Brief captured successfully.';
      setSuccess(msg); showToast(msg, 'success');
      setShowFormModal(false);
      fetchProspects();
      syncToLeads(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save prospect brief.';
      setError(msg); showToast(msg, 'error');
      throw err; // let ProspectForm keep submitting=false guard
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    setError(null); setSuccess(null);
    try {
      const res = await prospectApi.deleteProspect(showDeleteModal);
      const msg = res.data.message || 'Deletion requested.';
      setSuccess(msg); showToast(msg, 'success');
      setShowDeleteModal(null); fetchProspects();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete.';
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
    a.href = url; a.download = `Prospects_${new Date().toISOString().split('T')[0]}.csv`;
    a.style.visibility = 'hidden';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('Exported successfully.', 'success');
  };

  const handleClientLookup = async () => {
    if (!lookupPhone.trim()) return;
    setLookupLoading(true); setLookupError(null); setLookupResult(null);
    try {
      const digits = lookupPhone.replace(/\D/g, '').slice(-10);
      const res = await clientApi.lookupByPhone(digits);
      const client = res.data?.client;
      if (!client) {
        setLookupError('No client found with this phone number. Use "Capture Brief" to register a new client.');
      } else {
        setLookupResult(client);
      }
    } catch {
      setLookupError('Lookup failed. Please try again.');
    } finally { setLookupLoading(false); }
  };

  const handleOpenServiceForm = () => {
    if (!lookupResult) return;
    // Pre-fill the standard form with existing client master data
    setPrefillData({
      clientName: lookupResult.clientName,
      mobileNo: lookupResult.mobileNo,
      email: lookupResult.email || null,
      preferredCommunication: lookupResult.preferredCommunication || 'PHONE_CALL',
      locality: lookupResult.locality,
      pincode: lookupResult.pincode || null,
      district: lookupResult.district || null,
      state: lookupResult.state || null,
      sourceType: lookupResult.sourceType || null,
      sourceCustom: lookupResult.sourceCustom || null,
      serviceType: '',
      status: 'ACTIVE',
    });
    setShowAddServiceModal(false);
    setFormKey(k => k + 1);
    setShowFormModal(true);
  };

  const uniqueStates = useMemo(() => ['ALL', ...Array.from(new Set(prospects.map(p => p.state).filter(Boolean)))], [prospects]);
  const uniqueDistricts = useMemo(() => ['ALL', ...Array.from(new Set(prospects.map(p => p.district).filter(Boolean)))], [prospects]);

  const filteredProspects = useMemo(() => prospects.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || [p.clientName, p.mobileNo, p.locality, p.email, p.pincode, p.district, p.state, p.serviceType].some(v => v?.toLowerCase().includes(s));
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

  return (
    <div className="animate-fade-in flex flex-col h-full min-h-0 p-4">
      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4 shrink-0">
        <button onClick={handleExportCSV} className={btnSecondary} disabled={filteredProspects.length === 0}>
          <FileText size={14} /><span>Export Report</span>
        </button>
        <button onClick={fetchProspects} className={btnSecondary}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        <button onClick={() => { setLookupPhone(''); setLookupResult(null); setLookupError(null); setShowAddServiceModal(true); }} className={btnSecondary}>
          <UserPlus size={14} /><span>Add New Service</span>
        </button>
        <button onClick={() => { setPrefillData(null); setFormKey(k => k + 1); setShowFormModal(true); }} className={btnPrimary}>
          <Plus size={14} /><span>Capture Brief</span>
        </button>
      </div>

      {success && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] shrink-0">
          <Check size={14} className="shrink-0 mt-0.5" />{success}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[12px] shrink-0">
          <X size={14} className="shrink-0 mt-0.5" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          <div className={`${card} flex items-center px-3.5 py-3 shrink-0`}><div className="h-4 w-56 shimmer rounded-full" /></div>
          <div className={`${card} flex-1 overflow-hidden p-3`}><ShimmerTable rows={8} cols={6} /></div>
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
              { label: 'Status', val: filterStatus, set: setFilterStatus, opts: [{ value: 'ALL', label: 'All Statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'PENDING_DELETE', label: 'Pending Delete' }, { value: 'DELETED', label: 'Deleted' }] },
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
            <div className="table-container min-w-full">
              <table className="erp-table min-w-[850px]">
                <thead>
                  <tr className="sticky top-0 z-10 backdrop-blur-xs">
                    {['S.No.', 'Client Name', 'Mobile Number', 'Email', 'Preferred Comm.', 'State', 'District', 'Locality / Area', 'Pincode', 'Services Requested', 'Workflow', 'Status', 'Actions'].map(h => (
                      <th key={h} className="whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedProspects.length === 0 ? (
                    <tr><td colSpan={13} className="text-center py-10 text-[12px] text-stone-400 italic">No prospects found.</td></tr>
                  ) : paginatedProspects.map((p, i) => (
                    <tr key={p.id}>
                      <td>{indexStart + i + 1}</td>
                      <td className="font-semibold text-[var(--text-primary)] whitespace-nowrap">{p.clientName}</td>
                      <td className="whitespace-nowrap">{p.mobileNo}</td>
                      <td className="whitespace-nowrap">{p.email || '—'}</td>
                      <td className="whitespace-nowrap">
                        {p.preferredCommunication === 'PHONE_CALL' ? 'Phone Call' : p.preferredCommunication === 'WHATSAPP' ? 'Whatsapp' : 'Email'}
                      </td>
                      <td className="whitespace-nowrap">{p.state || '—'}</td>
                      <td className="whitespace-nowrap">{p.district || '—'}</td>
                      <td className="truncate max-w-[150px]" title={p.locality}>{p.locality}</td>
                      <td className="whitespace-nowrap">{p.pincode || '—'}</td>
                      <td >
                        <div className="flex flex-wrap gap-1.5 justify-center max-w-[200px] mx-auto">
                          {(p.serviceType || '').split(',').filter(Boolean).map((s: string, sIdx: number, arr: string[]) => (
                            <span key={s} className="text-[#7e5a20] text-[12px] font-semibold">
                              {SERVICE_LABELS[s] || s}{sIdx < arr.length - 1 ? ',' : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td >
                        <span className={`text-[12px] font-semibold uppercase tracking-wide ${workflowStageBadgeClasses[p.workflowStage || 'LEAD_CAPTURED'] || 'text-stone-600'}`}>
                          {(p.workflowStage || 'LEAD_CAPTURED').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td >
                        {p.status && p.status !== 'ACTIVE' ? (
                          <span className={`text-[11.5px] font-bold uppercase tracking-wide ${statusBadgeClasses[p.status] || 'text-stone-500'}`}>
                            {p.status === 'PENDING_DELETE' ? 'Pending Delete' : p.status}
                          </span>
                        ) : <span className="text-[12px] text-stone-400">—</span>}
                      </td>
                      <td >
                        <div className="inline-flex gap-1 justify-center flex-wrap">
                          <button onClick={() => navigate(`/prospects/${p.id}`)} className={btnSecondary} style={{ padding: '5px 8px' }} title="View pipeline">
                            <Eye size={11} />
                          </button>
                          {p.status !== 'PENDING_DELETE' && p.status !== 'DELETED' && (
                            <button
                              onClick={() => setEditingProspect(p)}
                              className={`${btnSecondary} text-amber-700 border-amber-200 hover:bg-amber-50`}
                              style={{ padding: '5px 8px' }}
                              title="Edit brief"
                            >
                              <Edit2 size={11} />
                            </button>
                          )}
                          {p.status !== 'PENDING_DELETE' && p.status !== 'DELETED' && (
                            <button onClick={() => setShowDeleteModal(p.id)} className={`${btnSecondary} text-rose-600 border-rose-100 hover:bg-rose-50`} style={{ padding: '5px 8px' }} title="Request deletion">
                              <Trash2 size={11} />
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

      {/* Capture Brief Modal */}
      {showFormModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowFormModal(false)}>
          <div className="animate-scale-in w-full max-w-5xl lg:max-w-6xl bg-white sm:rounded-2xl shadow-2xl border-0 sm:border border-[rgba(184,144,71,0.3)] flex flex-col overflow-hidden h-[100dvh] sm:h-auto sm:max-h-[calc(100svh-40px)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 sm:p-5 border-b border-stone-100 shrink-0">
              <h3 className="flex items-center gap-2 text-[14px] sm:text-[16px] font-bold text-stone-900">
                <ClipboardList size={17} className="text-[#b89047] shrink-0" /> Capture Client Brief
              </h3>
              <button onClick={() => setShowFormModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>
            <ProspectForm
              key={formKey}
              mode="create"
              serviceBudgets={serviceBudgets}
              onSubmit={handleSubmit}
              onCancel={() => { setShowFormModal(false); setPrefillData(null); }}
              isSubmitting={submitting}
              initialData={prefillData || undefined}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Delete Request Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowDeleteModal(null)}>
          <div className="animate-scale-in w-full max-w-[380px] bg-white rounded-2xl shadow-xl border border-red-150 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold text-stone-900 mb-2">Delete Client Brief</h3>
            <p className="text-[12.5px] text-stone-500 leading-normal mb-4">
              This brief will be marked as "Pending Delete" until an Admin approves it.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setShowDeleteModal(null)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-all border-0 cursor-pointer">
                Request Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Add New Service — Client Lookup Modal */}
      {showAddServiceModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowAddServiceModal(false)}>
          <div className="animate-scale-in w-full max-w-md bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-stone-900">
                <UserPlus size={16} className="text-[#b89047]" /> Add New Service
              </h3>
              <button onClick={() => setShowAddServiceModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 cursor-pointer border-0 bg-transparent"><X size={15} /></button>
            </div>
            <p className="text-[12px] text-stone-500 mb-4 leading-relaxed">
              Enter the client's registered mobile number to look them up. A new service engagement will be added without duplicating their contact information.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="10-digit mobile number"
                value={lookupPhone}
                onChange={e => { setLookupPhone(e.target.value); setLookupResult(null); setLookupError(null); }}
                onKeyDown={e => e.key === 'Enter' && handleClientLookup()}
                className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-[13px] outline-none focus:border-[#b89047] focus:ring-1 focus:ring-[#b89047]/30"
                maxLength={15}
              />
              <button onClick={handleClientLookup} disabled={lookupLoading || !lookupPhone.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#b89047] hover:bg-[#9e7735] disabled:opacity-50 cursor-pointer border-0 transition-colors">
                {lookupLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} Lookup
              </button>
            </div>

            {lookupError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px] mb-3">
                <X size={13} className="shrink-0 mt-0.5" />{lookupError}
              </div>
            )}

            {lookupResult && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span className="text-[13px] font-bold text-stone-900">{lookupResult.clientName}</span>
                </div>
                <div className="text-[11.5px] text-stone-600 space-y-0.5">
                  <p><span className="font-medium">Phone:</span> {lookupResult.mobileNo}</p>
                  {lookupResult.email && <p><span className="font-medium">Email:</span> {lookupResult.email}</p>}
                  {lookupResult.locality && <p><span className="font-medium">Locality:</span> {lookupResult.locality}{lookupResult.state ? `, ${lookupResult.state}` : ''}</p>}
                  {lookupResult.prospects?.length > 0 && (
                    <p className="mt-1.5 pt-1.5 border-t border-emerald-200">
                      <span className="font-medium">Existing services:</span>{' '}
                      {lookupResult.prospects.map((pr: any) => pr.serviceType?.split(',')[0]).join(', ')}
                    </p>
                  )}
                </div>
                <button onClick={handleOpenServiceForm} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#b89047] hover:bg-[#9e7735] cursor-pointer border-0 transition-colors">
                  <Plus size={13} /> Add New Service for This Client
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Edit Brief Modal */}
      {editingProspect && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setEditingProspect(null)}>
          <div className="animate-scale-in w-full max-w-5xl lg:max-w-6xl bg-white sm:rounded-2xl shadow-2xl border-0 sm:border border-[rgba(184,144,71,0.3)] flex flex-col overflow-hidden h-[100dvh] sm:h-auto sm:max-h-[calc(100svh-40px)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 sm:p-5 border-b border-stone-100 shrink-0">
              <h3 className="flex items-center gap-2 text-[14px] sm:text-[16px] font-bold text-stone-900">
                <Edit2 size={17} className="text-amber-600 shrink-0" /> Edit Client Brief
              </h3>
              <button onClick={() => setEditingProspect(null)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>
            <ProspectForm
              key={`edit-${editingProspect.id}`}
              mode="edit"
              serviceBudgets={serviceBudgets}
              onSubmit={handleEditProspectSubmit}
              onCancel={() => setEditingProspect(null)}
              isSubmitting={editSubmitting}
              initialData={editingProspect as unknown as ProspectFormData}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
