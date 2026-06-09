import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { useToast } from '../context/ToastContext.js';
import { tenderApi, BACKEND_BASE } from '../services/api.js';
import {
  Plus, Edit, Trash2, Search, Filter, RefreshCw, Eye, FileText, Upload,
  Download, Check, X, RotateCcw, AlertCircle, Calendar, Landmark, MapPin, Tag,
  Hash, ClipboardList, Info, FileSpreadsheet, ArrowLeft
} from 'lucide-react';
import { ShimmerTable } from '../components/Shimmer.js';

interface TendersManagementProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  tenderId: string | null;
}

export const TendersManagement: React.FC<TendersManagementProps> = ({ currentUser, tenderId }) => {
  const { navigate } = useRouter();
  const { showToast } = useToast();

  // Mode state: 'list' | 'create' | 'edit' | 'detail'
  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');

  // Data states
  const [tenders, setTenders] = useState<any[]>([]);
  const [selectedTender, setSelectedTender] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentQuery, setDepartmentQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    bidNumber: '',
    bidDate: '',
    ministryStateName: '',
    departmentName: '',
    organisationName: '',
    itemCategory: '',
    typeOfBid: '',
    estimatedBidValue: '',
    beneficiary: '',
    addressWithState: '',
    quantity: '',
    emdAmount: '',
    ranking: '',
    tenderDocuments: [] as Array<{ name: string; url: string }>,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Super Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin';

  // ── Fetch Tenders ──────────────────────────────────────────────────────────
  const fetchTenders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        department: departmentQuery || undefined,
        showDeleted: showDeleted || undefined,
      };
      const res = await tenderApi.getTenders(params);
      if (res.data?.success) {
        setTenders(res.data.tenders || []);
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to fetch tenders.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, startDate, endDate, departmentQuery, showDeleted, showToast]);

  // ── Load Tender Detail ──────────────────────────────────────────────────────
  const fetchTenderDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await tenderApi.getTenderById(id);
      if (res.data?.success) {
        const tender = res.data.tender;
        setSelectedTender(tender);
        
        // Prepare Form Data if editing
        setFormData({
          bidNumber: tender.bidNumber || '',
          bidDate: tender.bidDate ? tender.bidDate.split('T')[0] : '',
          ministryStateName: tender.ministryStateName || '',
          departmentName: tender.departmentName || '',
          organisationName: tender.organisationName || '',
          itemCategory: tender.itemCategory || '',
          typeOfBid: tender.typeOfBid || '',
          estimatedBidValue: tender.estimatedBidValue !== null ? String(tender.estimatedBidValue) : '',
          beneficiary: tender.beneficiary || '',
          addressWithState: tender.addressWithState || '',
          quantity: tender.quantity !== null ? String(tender.quantity) : '',
          emdAmount: tender.emdAmount !== null ? String(tender.emdAmount) : '',
          ranking: tender.ranking !== null ? String(tender.ranking) : '',
          tenderDocuments: tender.tenderDocuments || [],
        });
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to fetch tender details.', 'error');
      navigate('/tenders');
    } finally {
      setLoading(false);
    }
  }, [showToast, navigate]);

  // Determine current mode from props/URL path
  useEffect(() => {
    if (tenderId) {
      if (tenderId === 'new') {
        setMode('create');
        setFormData({
          bidNumber: '',
          bidDate: '',
          ministryStateName: '',
          departmentName: '',
          organisationName: '',
          itemCategory: '',
          typeOfBid: '',
          estimatedBidValue: '',
          beneficiary: '',
          addressWithState: '',
          quantity: '',
          emdAmount: '',
          ranking: '',
          tenderDocuments: [],
        });
        setFormErrors({});
      } else {
        // Fetch details
        fetchTenderDetail(tenderId);
        // Determine whether we want edit mode or detail mode based on path or edit click
        const isEditPath = window.location.pathname.endsWith('/edit');
        setMode(isEditPath ? 'edit' : 'detail');
      }
    } else {
      setMode('list');
      fetchTenders();
    }
  }, [tenderId, fetchTenders, fetchTenderDetail]);

  // ── File Upload Handler ─────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject non-PDFs
    if (file.type !== 'application/pdf') {
      showToast('Only PDF files are allowed.', 'error');
      return;
    }

    // Reject > 10MB
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showToast('File size exceeds 10MB limit.', 'error');
      return;
    }

    setUploadingFile(true);
    setUploadProgress(20);
    const fd = new FormData();
    fd.append('file', file);

    try {
      setUploadProgress(50);
      const res = await tenderApi.uploadFile(fd);
      setUploadProgress(90);
      if (res.data?.success) {
        const newDoc = { name: res.data.filename || file.name, url: res.data.fileUrl };
        setFormData((prev) => ({
          ...prev,
          tenderDocuments: [...prev.tenderDocuments, newDoc]
        }));
        showToast('Document uploaded successfully.', 'success');
        setFormErrors((prev) => ({ ...prev, tenderDocuments: '' }));
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'File upload failed.', 'error');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tenderDocuments: prev.tenderDocuments.filter((_, i) => i !== index),
    }));
  };

  // ── Form Validation ─────────────────────────────────────────────────────────
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.bidNumber.trim()) errors.bidNumber = 'Bid number is required.';
    if (!formData.bidDate) errors.bidDate = 'Bid date is required.';
    if (!formData.ministryStateName.trim()) errors.ministryStateName = 'Ministry/State name is required.';
    if (!formData.departmentName.trim()) errors.departmentName = 'Department name is required.';
    if (!formData.organisationName.trim()) errors.organisationName = 'Organisation name is required.';
    if (!formData.itemCategory.trim()) errors.itemCategory = 'Item category is required.';
    if (!formData.typeOfBid.trim()) errors.typeOfBid = 'Type of bid is required.';
    
    const bidVal = parseFloat(formData.estimatedBidValue);
    if (isNaN(bidVal) || bidVal <= 0) {
      errors.estimatedBidValue = 'Estimated bid value must be greater than 0.';
    }
    
    if (!formData.beneficiary.trim()) errors.beneficiary = 'Beneficiary is required.';
    if (!formData.addressWithState.trim()) errors.addressWithState = 'Address with state is required.';
    
    const qty = parseInt(formData.quantity);
    if (isNaN(qty) || qty < 0) {
      errors.quantity = 'Quantity must be greater than or equal to 0.';
    }
    
    const emd = parseFloat(formData.emdAmount);
    if (isNaN(emd) || emd < 0) {
      errors.emdAmount = 'EMD amount must be greater than or equal to 0.';
    }

    if (formData.ranking) {
      const r = parseInt(formData.ranking);
      if (isNaN(r) || r <= 0) {
        errors.ranking = 'Ranking must be a positive integer.';
      }
    }

    if (formData.tenderDocuments.length === 0) {
      errors.tenderDocuments = 'At least one tender document is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Handle Submit Form ──────────────────────────────────────────────────────
  const handleSaveTender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please correct the validation errors.', 'error');
      return;
    }

    setIsSubmittingForm(true);
    try {
      const payload = {
        ...formData,
        estimatedBidValue: parseFloat(formData.estimatedBidValue),
        quantity: parseInt(formData.quantity),
        emdAmount: parseFloat(formData.emdAmount),
        ranking: formData.ranking ? parseInt(formData.ranking) : null,
      };

      if (mode === 'create') {
        const res = await tenderApi.createTender(payload);
        if (res.data?.success) {
           showToast('Tender created and submitted for approval successfully.', 'success');
           navigate('/tenders');
        }
      } else {
        const res = await tenderApi.updateTender(selectedTender.id, payload);
        if (res.data?.success) {
          showToast('Tender updated successfully.', 'success');
          navigate(`/tenders/${selectedTender.id}`);
        }
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to save tender.', 'error');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleSubmitForApproval = async (id: string) => {
    try {
      const res = await tenderApi.submitTender(id);
      if (res.data?.success) {
        showToast('Tender submitted for approval successfully.', 'success');
        if (selectedTender) {
          fetchTenderDetail(id);
        } else {
          fetchTenders();
        }
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to submit tender.', 'error');
    }
  };

  const handleApproveTender = async (id: string) => {
    if (!window.confirm('Are you sure you want to APPROVE this tender? This will lock it from further modifications.')) return;
    try {
      const res = await tenderApi.approveTender(id);
      if (res.data?.success) {
        showToast('Tender approved successfully.', 'success');
        if (selectedTender) {
          fetchTenderDetail(id);
        } else {
          fetchTenders();
        }
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to approve tender.', 'error');
    }
  };

  const handleRejectTender = async (id: string) => {
    if (!window.confirm('Are you sure you want to REJECT this tender? This will send it back to the Sales user as editable.')) return;
    try {
      const res = await tenderApi.rejectTender(id);
      if (res.data?.success) {
        showToast('Tender rejected successfully.', 'success');
        if (selectedTender) {
          fetchTenderDetail(id);
        } else {
          fetchTenders();
        }
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to reject tender.', 'error');
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tender? (It can be restored by an administrator).')) return;
    try {
      const res = await tenderApi.deleteTender(id);
      if (res.data?.success) {
        showToast('Tender deleted successfully.', 'success');
        navigate('/tenders');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to delete tender.', 'error');
    }
  };

  const handleRestoreTender = async (id: string) => {
    try {
      const res = await tenderApi.restoreTender(id);
      if (res.data?.success) {
        showToast('Tender restored successfully.', 'success');
        fetchTenders();
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to restore tender.', 'error');
    }
  };

  // ── Status Badges ───────────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Approved</span>;
      case 'UNDER_APPROVAL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Under Approval</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">Rejected</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-stone-500/10 text-stone-500 border border-stone-500/20">{status}</span>;
    }
  };

  // Render Form helper class bases
  const labelBase = 'text-[11.5px] font-semibold text-stone-600 leading-snug';
  const inputBase = 'w-full bg-white border border-[rgba(184,144,71,0.35)] text-stone-900 text-[13px] rounded-lg px-3 py-2.5 outline-none transition focus:border-[#b89047] focus:ring-2 focus:ring-[rgba(184,144,71,0.2)] font-[inherit]';

  // ── RENDER CREATE / EDIT FORM ──────────────────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="animate-fade-in w-full h-full flex flex-col min-h-0 overflow-y-auto px-5 py-4 gap-4">
        {/* Header toolbar */}
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(mode === 'create' ? '/tenders' : `/tenders/${selectedTender.id}`)}
              className="p-1.5 border border-[var(--border)] bg-[var(--card-bg)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] shadow-[var(--shadow-card)] transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-[14.5px] font-bold text-[var(--text-primary)]">
              {mode === 'create' ? 'Create Tender Brief' : `Edit Tender: ${formData.bidNumber}`}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSaveTender} className="flex-1 max-w-5xl mx-auto w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-card)] p-5 md:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Bid number */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Bid Number *</label>
              <input
                type="text"
                value={formData.bidNumber}
                onChange={(e) => setFormData({ ...formData, bidNumber: e.target.value })}
                placeholder="GEM/2026/B/12345"
                className={`${inputBase} ${formErrors.bidNumber ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.bidNumber && <span className="text-[11px] text-red-500 font-medium">{formErrors.bidNumber}</span>}
            </div>

            {/* Bid date */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Bid Dated *</label>
              <input
                type="date"
                value={formData.bidDate}
                onChange={(e) => setFormData({ ...formData, bidDate: e.target.value })}
                className={`${inputBase} ${formErrors.bidDate ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.bidDate && <span className="text-[11px] text-red-500 font-medium">{formErrors.bidDate}</span>}
            </div>

            {/* Ministry State Name */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Ministry / State Name *</label>
              <input
                type="text"
                value={formData.ministryStateName}
                onChange={(e) => setFormData({ ...formData, ministryStateName: e.target.value })}
                placeholder="Ministry of Defence"
                className={`${inputBase} ${formErrors.ministryStateName ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.ministryStateName && <span className="text-[11px] text-red-500 font-medium">{formErrors.ministryStateName}</span>}
            </div>

            {/* Department Name */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Department Name *</label>
              <input
                type="text"
                value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                placeholder="Department of Military Affairs"
                className={`${inputBase} ${formErrors.departmentName ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.departmentName && <span className="text-[11px] text-red-500 font-medium">{formErrors.departmentName}</span>}
            </div>

            {/* Organisation Name */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Organisation Name *</label>
              <input
                type="text"
                value={formData.organisationName}
                onChange={(e) => setFormData({ ...formData, organisationName: e.target.value })}
                placeholder="Indian Army"
                className={`${inputBase} ${formErrors.organisationName ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.organisationName && <span className="text-[11px] text-red-500 font-medium">{formErrors.organisationName}</span>}
            </div>

            {/* Item Category */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Item Category *</label>
              <input
                type="text"
                value={formData.itemCategory}
                onChange={(e) => setFormData({ ...formData, itemCategory: e.target.value })}
                placeholder="Construction Works"
                className={`${inputBase} ${formErrors.itemCategory ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.itemCategory && <span className="text-[11px] text-red-500 font-medium">{formErrors.itemCategory}</span>}
            </div>

            {/* Type of Bid */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Type of Bid *</label>
              <input
                type="text"
                value={formData.typeOfBid}
                onChange={(e) => setFormData({ ...formData, typeOfBid: e.target.value })}
                placeholder="Two-Packet Bid"
                className={`${inputBase} ${formErrors.typeOfBid ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.typeOfBid && <span className="text-[11px] text-red-500 font-medium">{formErrors.typeOfBid}</span>}
            </div>

            {/* Estimated Bid Value */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Estimated Bid Value (in INR) *</label>
              <input
                type="number"
                step="any"
                value={formData.estimatedBidValue}
                onChange={(e) => setFormData({ ...formData, estimatedBidValue: e.target.value })}
                placeholder="5000000"
                className={`${inputBase} ${formErrors.estimatedBidValue ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.estimatedBidValue && <span className="text-[11px] text-red-500 font-medium">{formErrors.estimatedBidValue}</span>}
            </div>

            {/* Beneficiary */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Beneficiary *</label>
              <input
                type="text"
                value={formData.beneficiary}
                onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                placeholder="Commanding Officer"
                className={`${inputBase} ${formErrors.beneficiary ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.beneficiary && <span className="text-[11px] text-red-500 font-medium">{formErrors.beneficiary}</span>}
            </div>

            {/* Address with State */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Address with State *</label>
              <input
                type="text"
                value={formData.addressWithState}
                onChange={(e) => setFormData({ ...formData, addressWithState: e.target.value })}
                placeholder="Delhi Cantonment, Delhi - 110010"
                className={`${inputBase} ${formErrors.addressWithState ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.addressWithState && <span className="text-[11px] text-red-500 font-medium">{formErrors.addressWithState}</span>}
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Quantity *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="1"
                className={`${inputBase} ${formErrors.quantity ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.quantity && <span className="text-[11px] text-red-500 font-medium">{formErrors.quantity}</span>}
            </div>

            {/* EMD Amount */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>EMD Amount (in INR) *</label>
              <input
                type="number"
                step="any"
                value={formData.emdAmount}
                onChange={(e) => setFormData({ ...formData, emdAmount: e.target.value })}
                placeholder="100000"
                className={`${inputBase} ${formErrors.emdAmount ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.emdAmount && <span className="text-[11px] text-red-500 font-medium">{formErrors.emdAmount}</span>}
            </div>

            {/* Ranking */}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Ranking (Optional)</label>
              <input
                type="number"
                value={formData.ranking}
                onChange={(e) => setFormData({ ...formData, ranking: e.target.value })}
                placeholder="1"
                className={`${inputBase} ${formErrors.ranking ? 'border-red-400 focus:ring-red-100' : ''}`}
              />
              {formErrors.ranking && <span className="text-[11px] text-red-500 font-medium">{formErrors.ranking}</span>}
            </div>

            {/* PDF File Upload Container */}
            <div className="flex flex-col gap-2.5 md:col-span-2">
              <label className={labelBase}>Tender Documents (PDF only, Max 10MB each) *</label>
              
              {/* Document list */}
              {formData.tenderDocuments.length > 0 && (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-1">
                  {formData.tenderDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-stone-50 dark:bg-stone-900/40 border border-[var(--border-subtle)] rounded-xl">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText size={16} className="text-[#b89047] shrink-0" />
                        <span className="text-[12.5px] text-[var(--text-primary)] font-medium truncate">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`${BACKEND_BASE}${doc.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-stone-500 hover:text-[#b89047] hover:bg-[#b89047]/10 rounded-lg transition-colors"
                          title="View Document"
                        >
                          <Download size={14} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(idx)}
                          className="p-1.5 text-stone-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Remove Document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Trigger Area */}
              <div className="flex items-center gap-4 border border-dashed border-[rgba(184,144,71,0.4)] rounded-xl p-4 bg-stone-50/20 dark:bg-stone-900/10">
                <div className="p-3 bg-[#b89047]/10 rounded-xl text-[#b89047]">
                  <Upload size={28} />
                </div>
                
                <div className="flex-1">
                  <div>
                    <p className="text-[12.5px] font-semibold text-stone-700">Upload Tender Specification PDF</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Attach drawings, manuals, or official tender guidelines (PDFs only).</p>
                  </div>
                </div>

                <div>
                  <label className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0 select-none">
                    <Plus size={13} />
                    <span>Add PDF</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingFile}
                    />
                  </label>
                </div>
              </div>

              {uploadingFile && (
                <div className="w-full bg-stone-100 rounded-full h-1.5 mt-1">
                  <div className="bg-[#b89047] h-full rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              {formErrors.tenderDocuments && <span className="text-[11px] text-red-500 font-medium">{formErrors.tenderDocuments}</span>}
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => navigate(mode === 'create' ? '/tenders' : `/tenders/${selectedTender.id}`)}
              className="flex-1 justify-center px-4 py-2.5 rounded-lg text-[12px] font-semibold text-stone-750 bg-stone-100 border border-[rgba(184,144,71,0.25)] hover:bg-stone-200 hover:text-stone-900 transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmittingForm || uploadingFile}
              className="flex-1 justify-center inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0 disabled:opacity-50"
            >
              {isSubmittingForm ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
              <span>{isSubmittingForm ? 'Saving...' : (mode === 'create' ? 'Create Tender' : 'Save Changes')}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── RENDER DETAIL PAGE ─────────────────────────────────────────────────────
  if (mode === 'detail' && selectedTender) {
    const isUnderApproval = selectedTender.status === 'UNDER_APPROVAL';
    const isRejected = selectedTender.status === 'REJECTED';
    
    const isOwner = selectedTender.createdBy === currentUser.id;
    const canEdit = isRejected || isAdmin;
    const canDelete = isRejected || isAdmin;

    return (
      <div className="animate-fade-in w-full h-full flex flex-col min-h-0 overflow-y-auto px-5 py-4 gap-4">
        {/* Header Toolbar */}
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/tenders')}
              className="p-1.5 border border-[var(--border)] bg-[var(--card-bg)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] shadow-[var(--shadow-card)] transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-[14.5px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                Tender: {selectedTender.bidNumber}
                {getStatusBadge(selectedTender.status)}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Created on {new Date(selectedTender.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Approval controls for Admin */}
            {isUnderApproval && isAdmin && (
              <>
                <button
                  onClick={() => handleApproveTender(selectedTender.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all border-0 cursor-pointer shadow-sm"
                >
                  <Check size={11} /> Approve
                </button>
                <button
                  onClick={() => handleRejectTender(selectedTender.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all border-0 cursor-pointer shadow-sm"
                >
                  <X size={11} /> Reject
                </button>
              </>
            )}

            {/* Edit */}
            {canEdit && (isOwner || isAdmin) && (
              <button
                onClick={() => navigate(`/tenders/${selectedTender.id}/edit`)}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-[var(--border)] rounded-lg text-[11px] font-semibold bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] shadow-sm transition-colors cursor-pointer"
              >
                <Edit size={11} /> Edit
              </button>
            )}

            {/* Delete */}
            {canDelete && (isOwner || isAdmin) && (
              <button
                onClick={() => handleSoftDelete(selectedTender.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer"
              >
                <Trash2 size={11} /> Delete
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Metadata view cards */}
          <div className="md:col-span-2 space-y-4">
            {/* Tender Profile */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-card)] space-y-4">
              <h3 className="text-[13px] font-bold text-[#b89047] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-2 mb-3">Tender Specifications</h3>
              
              <div className="grid grid-cols-2 gap-4 text-[12.5px]">
                <div>
                  <p className="text-stone-400 font-semibold text-[10.5px] uppercase">Ministry / State Name</p>
                  <p className="text-[var(--text-primary)] font-medium mt-0.5">{selectedTender.ministryStateName}</p>
                </div>
                <div>
                  <p className="text-stone-400 font-semibold text-[10.5px] uppercase">Department Name</p>
                  <p className="text-[var(--text-primary)] font-medium mt-0.5">{selectedTender.departmentName}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-stone-400 font-semibold text-[10.5px] uppercase">Organisation Name</p>
                  <p className="text-[var(--text-primary)] font-medium mt-0.5">{selectedTender.organisationName}</p>
                </div>
                <div>
                  <p className="text-stone-400 font-semibold text-[10.5px] uppercase">Item Category</p>
                  <p className="text-[var(--text-primary)] font-medium mt-0.5">{selectedTender.itemCategory}</p>
                </div>
                <div>
                  <p className="text-stone-400 font-semibold text-[10.5px] uppercase">Type of Bid</p>
                  <p className="text-[var(--text-primary)] font-medium mt-0.5">{selectedTender.typeOfBid}</p>
                </div>
                <div>
                  <p className="text-stone-400 font-semibold text-[10.5px] uppercase">Quantity</p>
                  <p className="text-[var(--text-primary)] font-medium mt-0.5">{selectedTender.quantity.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-stone-400 font-semibold text-[10.5px] uppercase">EMD Amount</p>
                  <p className="text-[var(--text-primary)] font-medium mt-0.5">₹ {selectedTender.emdAmount.toLocaleString('en-IN')}</p>
                </div>
                {selectedTender.ranking && (
                  <div>
                    <p className="text-stone-400 font-semibold text-[10.5px] uppercase">Ranking</p>
                    <p className="text-[var(--text-primary)] font-medium mt-0.5">L-{selectedTender.ranking}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery details */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-card)] space-y-4">
              <h3 className="text-[13px] font-bold text-[#b89047] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-2 mb-3">Beneficiary & Delivery Address</h3>
              
              <div className="space-y-3 text-[12.5px]">
                <div className="flex gap-2">
                  <Landmark size={15} className="text-[#b89047] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-stone-400 font-semibold text-[10.5px] uppercase">Beneficiary</p>
                    <p className="text-[var(--text-primary)] font-medium mt-0.5">{selectedTender.beneficiary}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <MapPin size={15} className="text-[#b89047] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-stone-400 font-semibold text-[10.5px] uppercase">Address with State</p>
                    <p className="text-[var(--text-primary)] font-medium mt-0.5">{selectedTender.addressWithState}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar: files and workflow info */}
          <div className="space-y-4">
            {/* Telemetry card */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-card)] space-y-4">
              <h3 className="text-[13px] font-bold text-[#b89047] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-2 mb-2">Financials</h3>
              <div className="text-center py-2">
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Estimated Bid Value</p>
                <p className="text-2xl font-extrabold text-[#b89047] tracking-tight mt-1">
                  ₹ {selectedTender.estimatedBidValue.toLocaleString('en-IN')}
                </p>
              </div>
              
              <div className="border-t border-stone-100 pt-3 flex justify-between text-[11px] text-[var(--text-muted)]">
                <span>Bid Date:</span>
                <span className="font-bold text-[var(--text-primary)]">{new Date(selectedTender.bidDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-card)] space-y-3">
              <h3 className="text-[13px] font-bold text-[#b89047] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-2 mb-1">Tender Documents</h3>
              {selectedTender.tenderDocuments && selectedTender.tenderDocuments.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedTender.tenderDocuments.map((doc: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1.5 p-2.5 bg-[var(--hover-bg)] border border-[var(--border-subtle)] rounded-lg">
                      <div className="flex items-center gap-2 text-[12px] min-w-0">
                        <FileText size={15} className="text-[#b89047] shrink-0" />
                        <span className="text-[var(--text-secondary)] font-medium truncate flex-1" title={doc.name}>{doc.name}</span>
                      </div>
                      <a
                        href={`${BACKEND_BASE}${doc.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:opacity-95 transition-all text-center select-none cursor-pointer border-0"
                      >
                        <Download size={11} /> View / Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-stone-200 rounded-xl text-stone-400 text-center gap-1">
                  <Info size={18} />
                  <span className="text-[11px] font-medium">No documents attached</span>
                </div>
              )}
            </div>

            {/* Ownership */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--shadow-card)] text-[11.5px] text-[var(--text-muted)] space-y-2.5">
              <div className="flex justify-between">
                <span>Created By:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedTender.createdByUser?.name || 'Unknown'}</span>
              </div>
              {selectedTender.approvedByUser && (
                <div className="flex justify-between border-t border-stone-100 pt-2.5">
                  <span>Approved By:</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedTender.approvedByUser.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER LIST VIEW ───────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in w-full h-full flex flex-col min-h-0 overflow-hidden px-5 py-4 gap-4">
      {/* Controls / Filter Bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 shadow-sm">
          <Search size={14} className="text-stone-400 shrink-0" />
          <input
            type="text"
            placeholder="Search bid number, ministry, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-0 outline-none text-[12px] text-[var(--text-primary)] py-0.5 font-[inherit]"
          />
        </div>

        {/* Filters Panel toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Department search */}
          <input
            type="text"
            placeholder="Filter Department"
            value={departmentQuery}
            onChange={(e) => setDepartmentQuery(e.target.value)}
            className="bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] text-[11.5px] rounded-lg px-3 py-1.5 shadow-sm outline-none focus:border-[#b89047] w-40"
          />

          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] text-[11.5px] rounded-lg px-3 py-1.5 shadow-sm outline-none focus:border-[#b89047]"
          >
            <option value="">All Statuses</option>
            <option value="UNDER_APPROVAL">Under Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Date range filters */}
          <div className="flex items-center gap-1 text-[11.5px] text-[var(--text-muted)] border border-[var(--border)] rounded-lg p-0.5 bg-[var(--card-bg)] shadow-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-0 outline-none p-1 text-[var(--text-primary)]"
              title="Start Date"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-0 outline-none p-1 text-[var(--text-primary)]"
              title="End Date"
            />
          </div>

          {/* Show Soft Deleted toggle (Admin only) */}
          {isAdmin && (
            <label className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-secondary)] font-semibold border border-[var(--border)] bg-[var(--card-bg)] rounded-lg px-3 py-1.5 cursor-pointer shadow-sm select-none">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="accent-[#b89047] w-3.5 h-3.5"
              />
              <span>Show Deleted</span>
            </label>
          )}

          {/* Refresh */}
          <button
            onClick={fetchTenders}
            className="p-2 border border-[var(--border)] bg-[var(--card-bg)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] shadow-sm transition-colors cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Create Button */}
          <button
            onClick={() => navigate('/tenders/new')}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[11.5px] font-bold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:opacity-95 transition-all border-0 shadow-sm cursor-pointer"
          >
            <Plus size={14} /> Create Tender
          </button>
        </div>
      </div>

      {/* Main Table grid */}
      <div className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
        {loading ? (
          <div className="p-4">
            <ShimmerTable rows={8} cols={6} />
          </div>
        ) : tenders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-[var(--hover-bg)] flex items-center justify-center text-stone-400">
              <ClipboardList size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No Tenders Found</h3>
              <p className="text-[11.5px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                There are no tenders matching the current filter set. Verify your criteria or create a new tender.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-stone-50/20 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] select-none">
                  <th className="px-4 py-3">Bid Number</th>
                  <th className="px-4 py-3">Bid Date</th>
                  <th className="px-4 py-3">Ministry / Department</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Value (INR)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[12.5px] text-[var(--text-secondary)]">
                {tenders.map((tender) => (
                  <tr key={tender.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                    <td className="px-4 py-3.5 font-bold text-[var(--text-primary)]">
                      {tender.bidNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      {new Date(tender.bidDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate">
                      <p className="font-semibold text-[var(--text-primary)] truncate">{tender.ministryStateName}</p>
                      <span className="text-[10px] text-[var(--text-muted)] block truncate">{tender.departmentName}</span>
                    </td>
                    <td className="px-4 py-3.5 truncate max-w-[150px]">
                      {tender.itemCategory}
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-[#b89047]">
                      ₹ {tender.estimatedBidValue.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {getStatusBadge(tender.status)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/tenders/${tender.id}`)}
                          className="p-1 border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] rounded-md text-[var(--text-secondary)] transition shadow-xs cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={12} />
                        </button>
                        
                        {/* Edit button */}
                        {(tender.status === 'REJECTED' || isAdmin) && (tender.createdBy === currentUser.id || isAdmin) && !tender.isDeleted && (
                          <button
                            onClick={() => navigate(`/tenders/${tender.id}/edit`)}
                            className="p-1 border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] rounded-md text-[#b89047] transition shadow-xs cursor-pointer"
                            title="Edit"
                          >
                            <Edit size={12} />
                          </button>
                        )}

                        {/* Admin approval shortcut */}
                        {tender.status === 'UNDER_APPROVAL' && isAdmin && !tender.isDeleted && (
                          <button
                            onClick={() => handleApproveTender(tender.id)}
                            className="p-1 border border-[var(--border)] bg-[var(--card-bg)] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md text-emerald-500 transition shadow-xs cursor-pointer"
                            title="Approve"
                          >
                            <Check size={12} />
                          </button>
                        )}

                        {/* Restore button */}
                        {tender.isDeleted && isAdmin && (
                          <button
                            onClick={() => handleRestoreTender(tender.id)}
                            className="p-1 border border-[var(--border)] bg-[var(--card-bg)] hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-md text-[#b89047] transition shadow-xs cursor-pointer"
                            title="Restore"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}

                        {/* Delete button */}
                        {!tender.isDeleted && (tender.createdBy === currentUser.id || isAdmin) && (tender.status === 'REJECTED' || isAdmin) && (
                          <button
                            onClick={() => handleSoftDelete(tender.id)}
                            className="p-1 border border-[var(--border)] bg-[var(--card-bg)] hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md text-rose-500 transition shadow-xs cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
