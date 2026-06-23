import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { projectApi } from '../services/api.js';
import type { User } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useRouter } from '../context/RouterContext.js';
import { ShimmerTable } from '../components/Shimmer.js';
import {
  HardHat, Search, RefreshCw, UserCheck, X, ChevronLeft, ChevronRight,
  Users, Loader2, AlertCircle, CheckCircle2, Clock, Building2,
  MapPin, ClipboardCheck, Palette, ArrowRight, Phone, PlusCircle, Layers,
} from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect.js';

interface Props { currentUser: User; }

interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: { name: string };
}

interface ProjectAssignment {
  id: string;
  assignedAt: string;
  notes: string | null;
  projectManager: { id: string; name: string; email: string };
  projectArchitect: { id: string; name: string; email: string };
  juniorArchitect: { id: string; name: string; email: string } | null;
  assignedBy: { id: string; name: string };
  siteEngineer: { id: string; name: string; email: string } | null;
}

interface Project {
  id: string;
  status: string;
  createdAt: string;
  prospect: {
    id: string;
    serviceType: string;
    workflowStage: string;
    initialPaymentAmount: number | null;
    initialPaymentUnit: string | null;
    client: {
      id: string;
      clientName: string;
      mobileNo: string;
      email: string | null;
      locality: string;
      state: string | null;
    };
  };
  assignment: ProjectAssignment | null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const card = 'bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xs';
const inputBase =
  'w-full bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-1.5 outline-none transition focus:border-[#b89047] focus:ring-2 focus:ring-[rgba(184,144,71,0.2)] font-[inherit]';
const btnPrimary =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0';
const btnSecondary =
  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--card-bg)] border border-[var(--border)] hover:border-[#b89047] hover:text-[#b89047] transition-all duration-200 cursor-pointer disabled:opacity-50';

// ─── Pipeline stages ──────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'PENDING_ASSIGNMENT', label: 'Pending Assignment', short: 'Pending',    icon: <Clock size={14} />,        color: 'text-amber-600',    bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-300 dark:border-amber-700',   ring: 'ring-amber-300' },
  { key: 'ASSIGNED',           label: 'Team Assigned',      short: 'Assigned',   icon: <Users size={14} />,        color: 'text-blue-600',     bg: 'bg-blue-50 dark:bg-blue-950/30',     border: 'border-blue-300 dark:border-blue-700',     ring: 'ring-blue-300' },
  { key: 'SITE_VERIFICATION',  label: 'Site Verification',  short: 'Site',       icon: <MapPin size={14} />,       color: 'text-purple-600',   bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-700', ring: 'ring-purple-300' },
  { key: 'CDRF_PENDING',       label: 'CDRF Pending',       short: 'CDRF',       icon: <ClipboardCheck size={14} />, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-700', ring: 'ring-orange-300' },
  { key: 'DESIGN_REVIEW',      label: 'Design Review',      short: 'Layout',     icon: <Palette size={14} />,      color: 'text-indigo-600',   bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-300 dark:border-indigo-700', ring: 'ring-indigo-300' },
  { key: 'LAYOUT_APPROVED',    label: 'Layout Approved',    short: 'Approved',   icon: <CheckCircle2 size={14} />, color: 'text-cyan-600',     bg: 'bg-cyan-50 dark:bg-cyan-950/30',     border: 'border-cyan-300 dark:border-cyan-700',     ring: 'ring-cyan-300' },
  { key: 'DESIGN_IN_PROGRESS', label: 'Design In Progress', short: 'Drawing',    icon: <Layers size={14} />,       color: 'text-violet-600',   bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-300 dark:border-violet-700', ring: 'ring-violet-300' },
  { key: 'COMPLETED',          label: 'Completed',           short: 'Done',       icon: <CheckCircle2 size={14} />, color: 'text-emerald-600',  bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-700', ring: 'ring-emerald-300' },
];

const SERVICE_LABELS: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Arch. Consultation',
  INTERIOR_DESIGN:            'Interior Design',
  PMC:                        'PMC',
  TURNKEY_CONSTRUCTION:       'Turnkey',
  INTERIOR_EXECUTION:         'Int. Execution',
  RENOVATION:                 'Renovation',
  END_TO_END_SOLUTION:        'End-to-End',
};

const ITEMS_PER_PAGE = 15;

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = PIPELINE_STAGES.find(p => p.key === status);
  if (!s) return <span className="text-[10px] text-stone-400">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.color} ${s.bg} ${s.border}`}>
      {s.icon && <span className="scale-75">{s.icon}</span>}
      {s.short}
    </span>
  );
}

// ─── Assignment Modal ─────────────────────────────────────────────────────────
interface AssignModalProps {
  project: Project;
  assignableUsers: AssignableUser[];
  onClose: () => void;
  onAssigned: () => void;
}

function AssignModal({ project, assignableUsers, onClose, onAssigned }: AssignModalProps) {
  const { showToast } = useToast();
  const [pmId, setPmId] = useState(project.assignment?.projectManager.id ?? '');
  const [archId, setArchId] = useState(project.assignment?.projectArchitect.id ?? '');
  const [juniorId, setJuniorId] = useState(project.assignment?.juniorArchitect?.id ?? '');
  const [notes, setNotes] = useState(project.assignment?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);

  const byRole = (roleName: string) => assignableUsers.filter(u => u.role.name === roleName);
  const pms        = byRole('Project Manager');
  const architects = byRole('Project Architect');
  const juniors    = byRole('Junior Architect');

  const handleSubmit = async () => {
    if (!pmId || !archId) {
      showToast('Project Manager and Project Architect are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await projectApi.assignTeam(project.id, {
        projectManagerId: pmId,
        projectArchitectId: archId,
        juniorArchitectId: juniorId || null,
        notes: notes.trim() || undefined,
      });
      showToast('Team assigned successfully.', 'success');
      onAssigned();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to assign team.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`${card} w-full max-w-lg`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(184,144,71,0.12)] text-[#b89047]">
              <UserCheck size={16} />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[var(--text-primary)]">Assign Project Team</p>
              <p className="text-[11px] text-[var(--text-muted)]">{project.prospect.client.clientName} · {SERVICE_LABELS[project.prospect.serviceType] ?? project.prospect.serviceType}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer border-0 bg-transparent p-1">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {[
            { label: 'Project Manager', key: 'pm', required: true, value: pmId, setter: setPmId, options: pms },
            { label: 'Project Architect', key: 'arch', required: true, value: archId, setter: setArchId, options: architects },
            { label: 'Junior Architect', key: 'jr', required: false, value: juniorId, setter: setJuniorId, options: juniors },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                {f.label} {f.required ? <span className="text-rose-500">*</span> : <span className="text-stone-400">(optional)</span>}
              </label>
              <select value={f.value} onChange={e => f.setter(e.target.value)} className={inputBase}>
                <option value="">{f.required ? `— Select ${f.label} —` : '— None —'}</option>
                {f.options.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                {f.options.length === 0 && <option disabled>No {f.label}s available</option>}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
              Assignment Notes <span className="text-stone-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special instructions or context…"
              className={`${inputBase} resize-none`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 px-5 py-3 border-t border-[var(--border)]">
          <button onClick={onClose} className={btnSecondary} disabled={submitting}>Cancel</button>
          <button onClick={handleSubmit} className={btnPrimary} disabled={submitting || !pmId || !archId}>
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
            {project.assignment ? 'Re-assign Team' : 'Assign Team'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Onboard Existing Project Modal ──────────────────────────────────────────
const SERVICE_TYPES = [
  { value: 'ARCHITECTURAL_CONSULTATION', label: 'Architectural Consultation' },
  { value: 'INTERIOR_DESIGN',            label: 'Interior Design' },
  { value: 'PMC',                        label: 'PMC' },
  { value: 'TURNKEY_CONSTRUCTION',       label: 'Turnkey Construction' },
  { value: 'INTERIOR_EXECUTION',         label: 'Interior Execution' },
  { value: 'RENOVATION',                 label: 'Renovation' },
  { value: 'END_TO_END_SOLUTION',        label: 'End-to-End Solution' },
];

interface OnboardModalProps {
  assignableUsers: AssignableUser[];
  onClose: () => void;
  onCreated: () => void;
}

function OnboardExistingModal({ assignableUsers, onClose, onCreated }: OnboardModalProps) {
  const { showToast } = useToast();
  const { navigate } = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [clientName, setClientName]           = useState('');
  const [mobileNo, setMobileNo]               = useState('');
  const [email, setEmail]                     = useState('');
  const [locality, setLocality]               = useState('');
  const [pincode, setPincode]                 = useState('');
  const [district, setDistrict]               = useState('');
  const [state, setState]                     = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [pmId, setPmId]                       = useState('');
  const [archId, setArchId]                   = useState('');
  const [juniorId, setJuniorId]               = useState('');
  const [notes, setNotes]                     = useState('');

  const [localitiesList, setLocalitiesList]           = useState<string[]>([]);
  const [localitySelectOther, setLocalitySelectOther] = useState(false);
  const [manualLocality, setManualLocality]           = useState('');
  const [fetchingPincode, setFetchingPincode]         = useState(false);

  const byRole = (roleName: string) => assignableUsers.filter(u => u.role.name === roleName);
  const pms        = byRole('Project Manager');
  const architects = byRole('Project Architect');
  const juniors    = byRole('Junior Architect');

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(pin);
    if (pin.length !== 6) {
      setState(''); setDistrict(''); setLocalitiesList([]); setLocalitySelectOther(false);
      return;
    }
    setFetchingPincode(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      const r = data[0];
      if (r?.Status === 'Success' && Array.isArray(r.PostOffice)) {
        setState(r.PostOffice[0].State);
        setDistrict(r.PostOffice[0].District);
        const offices = r.PostOffice.map((po: any) => po.Name);
        setLocalitiesList(offices);
        if (offices.length > 0) { setLocality(offices[0]); }
        setLocalitySelectOther(false);
      } else {
        setLocalitiesList([]); setLocality(''); setDistrict(''); setState('');
      }
    } catch {
      // ignore fetch errors
    } finally {
      setFetchingPincode(false);
    }
  };

  const handleLocalitySelectChange = (val: string) => {
    if (val === 'OTHER') {
      setLocalitySelectOther(true);
      setLocality(manualLocality);
    } else {
      setLocalitySelectOther(false);
      setLocality(val);
    }
  };

  const handleServiceToggle = (key: string) => {
    let arr: string[];
    if (key === 'END_TO_END_SOLUTION') {
      arr = selectedServices.includes('END_TO_END_SOLUTION') ? [] : ['END_TO_END_SOLUTION'];
    } else {
      arr = selectedServices.filter(s => s !== 'END_TO_END_SOLUTION');
      arr = arr.includes(key) ? arr.filter(s => s !== key) : [...arr, key];
    }
    setSelectedServices(arr);
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) { showToast('Client name is required.', 'error'); return; }
    if (!/^\d{10}$/.test(mobileNo.trim())) { showToast('Valid 10-digit mobile number is required.', 'error'); return; }
    if (!locality.trim()) { showToast('Locality is required.', 'error'); return; }
    if (selectedServices.length === 0) { showToast('Please select at least one service.', 'error'); return; }
    if (!pmId || !archId) { showToast('Project Manager and Project Architect are required.', 'error'); return; }

    setSubmitting(true);
    try {
      const res = await projectApi.onboardExisting({
        clientName: clientName.trim(),
        mobileNo: mobileNo.trim(),
        email: email.trim() || undefined,
        locality: locality.trim(),
        pincode: pincode.trim() || undefined,
        district: district.trim() || undefined,
        state: state.trim() || undefined,
        serviceType: selectedServices.join(','),
        projectManagerId: pmId,
        projectArchitectId: archId,
        juniorArchitectId: juniorId || null,
        notes: notes.trim() || undefined,
      });
      showToast('Existing project onboarded successfully.', 'success');
      onCreated();
      onClose();
      navigate(`/projects/${res.data.projectId}`);
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to onboard project.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && !!clientName && !!mobileNo && !!locality && selectedServices.length > 0 && !!pmId && !!archId;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`${card} w-full max-w-2xl max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(184,144,71,0.12)] text-[#b89047]">
              <PlusCircle size={16} />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[var(--text-primary)]">Onboard Existing Project</p>
              <p className="text-[11px] text-[var(--text-muted)]">Skips prospect flow — lands directly on Design Pipeline</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer border-0 bg-transparent p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-5">

          {/* Client info */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3">Client Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                  Client Name <span className="text-rose-500">*</span>
                </label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full name" className={inputBase} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input value={mobileNo} onChange={e => setMobileNo(e.target.value)} placeholder="10-digit number" maxLength={10} className={inputBase} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" type="email" className={inputBase} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Pincode</label>
                  {fetchingPincode && <span className="text-[10px] text-[#b89047] font-semibold animate-pulse">Fetching...</span>}
                </div>
                <input value={pincode} onChange={handlePincodeChange} placeholder="e.g. 560001" maxLength={6} className={inputBase} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">State</label>
                <input value={state} readOnly placeholder="Auto-filled from pincode" className="w-full bg-stone-100/50 border border-[rgba(184,144,71,0.22)] text-stone-600 text-[13px] rounded-lg px-3.5 py-1.5 outline-none cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">District</label>
                <input value={district} readOnly placeholder="Auto-filled from pincode" className="w-full bg-stone-100/50 border border-[rgba(184,144,71,0.22)] text-stone-600 text-[13px] rounded-lg px-3.5 py-1.5 outline-none cursor-not-allowed" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                  Locality <span className="text-rose-500">*</span>
                </label>
                {localitiesList.length > 0 ? (
                  <SearchableSelect
                    options={[
                      { value: '', label: '— Select Area —' },
                      ...localitiesList.map(l => ({ value: l, label: l })),
                      { value: 'OTHER', label: 'Other (Type Manually)' },
                    ]}
                    value={localitySelectOther ? 'OTHER' : locality}
                    onChange={handleLocalitySelectChange}
                  />
                ) : (
                  <input value={locality} onChange={e => setLocality(e.target.value)} placeholder="Area / locality" className={inputBase} />
                )}
              </div>
              {localitySelectOther && (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                    Type Locality Manually <span className="text-rose-500">*</span>
                  </label>
                  <input value={manualLocality} onChange={e => { setManualLocality(e.target.value); setLocality(e.target.value); }} placeholder="Type locality..." className={inputBase} />
                </div>
              )}
            </div>
          </div>

          {/* Service selection */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3">
              Service Type <span className="text-rose-500">*</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SERVICE_TYPES.filter(s => s.value !== 'END_TO_END_SOLUTION').map(s => {
                const isSelected = selectedServices.includes(s.value);
                const isDisabled = selectedServices.includes('END_TO_END_SOLUTION');
                return (
                  <button key={s.value} type="button"
                    onClick={() => !isDisabled && handleServiceToggle(s.value)}
                    disabled={isDisabled}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
                      isDisabled
                        ? 'border-stone-100 bg-stone-50 opacity-40 cursor-not-allowed'
                        : isSelected
                          ? 'border-[#b89047] bg-[rgba(184,144,71,0.08)] ring-1 ring-[#b89047] cursor-pointer'
                          : 'border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] cursor-pointer'
                    }`}>
                    <input type="checkbox" checked={isSelected} readOnly disabled={isDisabled} className="accent-[#b89047] w-3.5 h-3.5 cursor-pointer" />
                    <span className={`text-[12px] font-semibold ${isSelected && !isDisabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{s.label}</span>
                  </button>
                );
              })}
              <div className="col-span-1 sm:col-span-2 flex items-center gap-3 my-0.5">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">or choose a complete solution</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
              {(() => {
                const isSelected = selectedServices.includes('END_TO_END_SOLUTION');
                return (
                  <button type="button" onClick={() => handleServiceToggle('END_TO_END_SOLUTION')}
                    className={`col-span-1 sm:col-span-2 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#b89047] bg-[rgba(184,144,71,0.08)] ring-1 ring-[#b89047]'
                        : 'border-dashed border-[rgba(184,144,71,0.4)] bg-[rgba(184,144,71,0.02)] hover:bg-[rgba(184,144,71,0.06)]'
                    }`}>
                    <input type="checkbox" checked={isSelected} readOnly className="accent-[#b89047] w-3.5 h-3.5 shrink-0 cursor-pointer" />
                    <div>
                      <span className={`text-[12px] font-semibold block ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>End-to-End Solution</span>
                      <span className="text-[10px] text-[var(--text-muted)] leading-tight">Complete project support — selecting this disables individual services.</span>
                    </div>
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Team */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3">Team Assignment</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Project Manager', required: true, value: pmId, setter: setPmId, options: pms },
                { label: 'Project Architect', required: true, value: archId, setter: setArchId, options: architects },
                { label: 'Junior Architect', required: false, value: juniorId, setter: setJuniorId, options: juniors },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                    {f.label} {f.required ? <span className="text-rose-500">*</span> : <span className="text-stone-400">(optional)</span>}
                  </label>
                  <select value={f.value} onChange={e => f.setter(e.target.value)} className={inputBase}>
                    <option value="">{f.required ? `— Select —` : '— None —'}</option>
                    {f.options.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    {f.options.length === 0 && <option disabled>None available</option>}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1">Notes <span className="text-stone-400">(optional)</span></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any context about this existing project…" className={`${inputBase} resize-none`} />
            </div>
          </div>

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800">
            <Layers size={13} className="text-cyan-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-cyan-700 dark:text-cyan-300">
              Project will be created at <strong>Layout Approved</strong> stage. Design Pipeline will be ready immediately — you can add drawings right away.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-5 py-3 border-t border-[var(--border)] shrink-0">
          <button onClick={onClose} className={btnSecondary} disabled={submitting}>Cancel</button>
          <button onClick={handleSubmit} className={btnPrimary} disabled={!canSubmit}>
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <PlusCircle size={13} />}
            Onboard Project
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Pipeline bar ─────────────────────────────────────────────────────────────
function PipelineBar({ statusCounts, filterStatus, onFilter }: {
  statusCounts: Record<string, number>;
  filterStatus: string;
  onFilter: (s: string) => void;
}) {
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Project Pipeline</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{total} project{total !== 1 ? 's' : ''} across all stages</p>
        </div>
        {filterStatus && (
          <button onClick={() => onFilter('')} className="text-[10px] text-[#b89047] hover:underline font-semibold cursor-pointer border-0 bg-transparent">
            Clear filter
          </button>
        )}
      </div>

      {/* Progress track */}
      {total > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden mb-4 gap-px">
          {PIPELINE_STAGES.map(s => {
            const count = statusCounts[s.key] ?? 0;
            if (count === 0) return null;
            const pct = (count / total) * 100;
            const colorMap: Record<string, string> = {
              PENDING_ASSIGNMENT: 'bg-amber-400',
              ASSIGNED:           'bg-blue-400',
              SITE_VERIFICATION:  'bg-purple-400',
              CDRF_PENDING:       'bg-orange-400',
              DESIGN_REVIEW:      'bg-indigo-400',
              LAYOUT_APPROVED:    'bg-cyan-400',
              DESIGN_IN_PROGRESS: 'bg-violet-400',
              COMPLETED:          'bg-emerald-400',
            };
            return <div key={s.key} className={`${colorMap[s.key]} transition-all`} style={{ width: `${pct}%` }} />;
          })}
        </div>
      )}

      {/* Stage cards */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
        {PIPELINE_STAGES.map((s, idx) => {
          const count = statusCounts[s.key] ?? 0;
          const isActive = filterStatus === s.key;
          const isLast = idx === PIPELINE_STAGES.length - 1;
          return (
            <button
              key={s.key}
              onClick={() => onFilter(isActive ? '' : s.key)}
              className={[
                'relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all cursor-pointer text-center',
                isActive
                  ? `${s.bg} ${s.border} ring-2 ${s.ring} ring-offset-1`
                  : 'bg-[var(--card-bg)] border-[var(--border)] hover:border-[#b89047]/40 hover:bg-[rgba(184,144,71,0.04)]',
              ].join(' ')}
            >
              {/* Connector arrow for non-last */}
              {!isLast && (
                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 z-10 text-stone-300 dark:text-stone-600 hidden md:block">
                  <ArrowRight size={10} />
                </div>
              )}
              <div className={`p-1.5 rounded-lg ${s.bg} ${s.color}`}>
                {s.icon}
              </div>
              <span className={`text-[18px] font-black leading-none ${count > 0 ? s.color : 'text-[var(--text-muted)]'}`}>
                {count}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)] leading-tight">
                {s.short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Project row card ─────────────────────────────────────────────────────────
function ProjectRow({ project, isAdmin, onAssign, onClick }: {
  project: Project;
  isAdmin: boolean;
  onAssign: () => void;
  onClick: () => void;
}) {
  const a = project.assignment;
  const c = project.prospect.client;
  const stage = PIPELINE_STAGES.find(s => s.key === project.status);

  return (
    <div
      onClick={onClick}
      className="group flex items-start gap-3 px-4 py-3.5 border-b border-[var(--border)] hover:bg-[rgba(184,144,71,0.04)] transition-colors cursor-pointer last:border-0"
    >
      {/* Stage indicator dot */}
      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${stage?.bg ?? ''} border-2 ${stage?.border ?? 'border-stone-300'}`} />

      {/* Client info */}
      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-1">
        {/* Name + service */}
        <div className="md:col-span-1">
          <p className="text-[13px] font-bold text-[var(--text-primary)] truncate group-hover:text-[#b89047] transition-colors">
            {c.clientName}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
            {SERVICE_LABELS[project.prospect.serviceType] ?? project.prospect.serviceType}
            {project.prospect.initialPaymentAmount ? (
              <span className="ml-1.5 text-emerald-600 font-semibold">
                ₹{project.prospect.initialPaymentAmount} {project.prospect.initialPaymentUnit}
              </span>
            ) : null}
          </p>
        </div>

        {/* Contact */}
        <div className="md:col-span-1 hidden md:flex flex-col justify-center gap-0.5">
          <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
            <Phone size={9} className="text-[var(--text-muted)]" /> {c.mobileNo}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <MapPin size={9} /> {c.locality}{c.state ? `, ${c.state}` : ''}
          </p>
        </div>

        {/* Team */}
        <div className="md:col-span-1 hidden md:flex flex-col justify-center">
          {a ? (
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1">
                <Users size={9} className="text-[#b89047]" />
                {a.projectManager.name}
                <span className="text-[9px] text-[var(--text-muted)] font-normal">(PM)</span>
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                {a.projectArchitect.name}
                <span className="text-[9px] ml-1">(Arch)</span>
                {a.siteEngineer && (
                  <span className="ml-1">· {a.siteEngineer.name} <span className="text-[9px]">(SE)</span></span>
                )}
              </p>
            </div>
          ) : (
            <span className="text-[10px] text-amber-600 font-semibold">⚠ Not assigned</span>
          )}
        </div>

        {/* Status + action */}
        <div className="md:col-span-1 flex items-center justify-between md:justify-end gap-2">
          <StatusBadge status={project.status} />
          {isAdmin && (
            <button
              onClick={e => { e.stopPropagation(); onAssign(); }}
              className="hidden group-hover:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] border-0 cursor-pointer transition-all hover:shadow-sm"
            >
              <UserCheck size={9} />
              {a ? 'Re-assign' : 'Assign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export const ProjectsDashboard: React.FC<Props> = ({ currentUser }) => {
  const { showToast } = useToast();
  const { navigate } = useRouter();
  const isAdmin      = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isPM         = currentUser.role === 'Project Manager';

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [assignTarget, setAssignTarget] = useState<Project | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getProjects({
        status: filterStatus || undefined,
        search: search.trim() || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setProjects(res.data.projects ?? []);
      setTotal(res.data.pagination?.total ?? 0);
      setStatusCounts(res.data.statusCounts ?? {});
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to load projects.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search, page, showToast]);

  const fetchAssignableUsers = useCallback(async () => {
    if (!isAdmin && !isPM) return;
    try {
      const res = await projectApi.getAssignableUsers();
      setAssignableUsers(res.data.users ?? []);
    } catch { /* non-critical */ }
  }, [isAdmin, isPM]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchAssignableUsers(); }, [fetchAssignableUsers]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchProjects(); };

  const totalAll      = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const pendingCount  = statusCounts['PENDING_ASSIGNMENT'] ?? 0;
  const activeCount   = (statusCounts['ASSIGNED'] ?? 0) + (statusCounts['SITE_VERIFICATION'] ?? 0) + (statusCounts['CDRF_PENDING'] ?? 0) + (statusCounts['DESIGN_REVIEW'] ?? 0) + (statusCounts['LAYOUT_APPROVED'] ?? 0) + (statusCounts['DESIGN_IN_PROGRESS'] ?? 0);
  const completedCount = statusCounts['COMPLETED'] ?? 0;

  const handlePipelineFilter = (s: string) => {
    setFilterStatus(s);
    setPage(1);
  };

  return (
    <div className="flex flex-col h-full gap-3 p-3 overflow-y-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[rgba(184,144,71,0.12)] text-[#b89047]">
              <HardHat size={16} />
            </div>
            <h1 className="text-[15px] font-bold text-[var(--text-primary)]">Projects</h1>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 ml-9">Post-sales project lifecycle — assignment, site verification, design & delivery</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowOnboard(true)} className={btnPrimary}>
            <PlusCircle size={13} />
            Add Existing Project
          </button>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          {
            label: 'Total Projects', value: totalAll,
            icon: <HardHat size={15} />,
            accent: 'from-[#b89047] to-[#9e7735]',
            sub: `${activeCount} active`,
          },
          {
            label: 'Pending Assignment', value: pendingCount,
            icon: <Clock size={15} />,
            accent: 'from-amber-500 to-amber-600',
            sub: pendingCount > 0 ? 'Needs attention' : 'All assigned',
            urgent: pendingCount > 0,
          },
          {
            label: 'Active Projects', value: activeCount,
            icon: <Building2 size={15} />,
            accent: 'from-blue-500 to-blue-600',
            sub: `${statusCounts['SITE_VERIFICATION'] ?? 0} on-site`,
          },
          {
            label: 'Completed', value: completedCount,
            icon: <CheckCircle2 size={15} />,
            accent: 'from-emerald-500 to-emerald-600',
            sub: totalAll > 0 ? `${Math.round((completedCount / totalAll) * 100)}% rate` : '—',
          },
        ].map(s => (
          <div key={s.label} className={`${card} p-4 relative overflow-hidden`}>
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.accent}`} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{s.label}</p>
                <p className="text-[28px] font-black text-[var(--text-primary)] leading-tight mt-0.5">{s.value}</p>
                <p className={`text-[10px] mt-1 font-medium ${s.urgent ? 'text-amber-600' : 'text-[var(--text-muted)]'}`}>
                  {s.urgent ? '⚠ ' : ''}{s.sub}
                </p>
              </div>
              <div className={`p-2 rounded-xl bg-gradient-to-br ${s.accent} text-white shadow-sm`}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Urgent notice ── */}
      {(isAdmin || isPM) && pendingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <AlertCircle size={15} className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-[12px] font-bold text-amber-800 dark:text-amber-300">
              {pendingCount} project{pendingCount > 1 ? 's' : ''} awaiting team assignment
            </p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
              Click <strong>Pending</strong> in the pipeline below to filter and assign teams.
            </p>
          </div>
          <button
            onClick={() => handlePipelineFilter('PENDING_ASSIGNMENT')}
            className="shrink-0 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition cursor-pointer bg-transparent"
          >
            View Pending
          </button>
        </div>
      )}

      {/* ── Pipeline bar ── */}
      <PipelineBar
        statusCounts={statusCounts}
        filterStatus={filterStatus}
        onFilter={handlePipelineFilter}
      />

      {/* ── Filters ── */}
      <div className={`${card} px-4 py-3`}>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by client name or location…"
              className={`${inputBase} pl-8`}
            />
          </div>
          <button type="submit" className={btnSecondary}>
            <Search size={12} /> Search
          </button>
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterStatus(''); setPage(1); }}
            className={btnSecondary}
          >
            <RefreshCw size={12} /> Reset
          </button>
        </form>
        {filterStatus && (
          <p className="text-[10px] text-[var(--text-muted)] mt-2">
            Showing: <span className="text-[#b89047] font-semibold">{PIPELINE_STAGES.find(s => s.key === filterStatus)?.label}</span>
          </p>
        )}
      </div>

      {/* ── Project list ── */}
      <div className={`${card} flex flex-col`}>
        {/* List header */}
        <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--card-bg)] rounded-t-xl">
          {['Client / Service', 'Contact & Location', 'Team', 'Status'].map(h => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{h}</p>
          ))}
        </div>

        <div>
          {loading ? (
            <div className="p-4"><ShimmerTable rows={8} cols={4} /></div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 gap-4 text-[var(--text-muted)]">
              <div className="p-4 rounded-2xl bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.12)]">
                <HardHat size={32} className="text-[#b89047]/40" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
                  {filterStatus || search ? 'No projects match your filter' : 'No projects yet'}
                </p>
                <p className="text-[11px] mt-1">
                  {filterStatus || search
                    ? 'Try clearing filters to see all projects'
                    : 'Projects will appear here once a prospect is marked as Won'}
                </p>
              </div>
              {(filterStatus || search) && (
                <button
                  onClick={() => { setSearch(''); setFilterStatus(''); setPage(1); }}
                  className={btnSecondary}
                >
                  <RefreshCw size={12} /> Clear Filters
                </button>
              )}
            </div>
          ) : (
            projects.map(p => (
              <ProjectRow
                key={p.id}
                project={p}
                isAdmin={isSuperAdmin}
                onAssign={() => setAssignTarget(p)}
                onClick={() => navigate(`/projects/${p.id}`)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)] shrink-0">
            <span>{total} total · page {page} of {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={btnSecondary + ' py-1 px-2'}>
                <ChevronLeft size={12} />
              </button>
              <span className="px-2 font-semibold text-[var(--text-primary)]">{page}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={btnSecondary + ' py-1 px-2'}>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {assignTarget && (
        <AssignModal
          project={assignTarget}
          assignableUsers={assignableUsers}
          onClose={() => setAssignTarget(null)}
          onAssigned={fetchProjects}
        />
      )}

      {/* Onboard Existing Project Modal */}
      {showOnboard && (
        <OnboardExistingModal
          assignableUsers={assignableUsers}
          onClose={() => setShowOnboard(false)}
          onCreated={fetchProjects}
        />
      )}
    </div>
  );
};
