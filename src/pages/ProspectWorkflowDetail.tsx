import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { prospectApi, contractApi, fileUrl, BACKEND_BASE } from '../services/api.js';
import type { User } from '../context/AuthContext.js';
import { SearchableSelect } from '../components/SearchableSelect.js';
import { PROJECT_PHASES } from '../components/ProspectForm.js';
import { useToast } from '../context/ToastContext.js';
import { useRouter } from '../context/RouterContext.js';
import { ShimmerTable, ShimmerCardGrid } from '../components/Shimmer.js';
import { btnPrimary } from '../components/ui/styles.js';
import {
  ClipboardList, RefreshCw, X, ArrowLeft, Loader2,
  MapPin, Phone, Mail, Check, FileText, DollarSign, ShieldCheck,
  FilePlus, Send, Upload, BadgeCheck, Video, Users
} from 'lucide-react';

interface Props {
  currentUser: User;
  prospectId: string;
}

const serviceLabels: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Architectural Consultation',
  INTERIOR_DESIGN: 'Interior Design',
  PMC: 'PMC',
  TURNKEY_CONSTRUCTION: 'Turnkey Construction',
  INTERIOR_EXECUTION: 'Interior Execution',
  RENOVATION: 'Renovation',
  END_TO_END: 'End-to-End Solution',
};

const workflowStageBadgeClasses: Record<string, string> = {
  LEAD_CAPTURED: 'text-stone-600 font-semibold',
  OFFLINE_MEETING: 'text-indigo-700 font-semibold',
  ONLINE_MEETING: 'text-indigo-700 font-semibold',
  MEETING_SCHEDULED: 'text-violet-700 font-semibold',
  SITE_DETAILS_REQUESTED: 'text-sky-700 font-semibold',
  SITE_DETAILS_UPLOADED: 'text-blue-700 font-semibold',
  PROPOSAL_SENT: 'text-purple-700 font-semibold',
  PROPOSAL_IN_PROGRESS: 'text-amber-700 font-semibold',
  PROPOSAL_ACCEPTED: 'text-emerald-700 font-semibold',
  PROPOSAL_REJECTED: 'text-rose-700 font-semibold',
  PROPOSAL_AGREED: 'text-emerald-700 font-semibold',
  CONTRACT_CREATED: 'text-sky-700 font-semibold',
  CONTRACT_EMAILED: 'text-blue-700 font-semibold',
  SIGNED_CONTRACT_UPLOADED: 'text-violet-700 font-semibold',
  INITIAL_PAYMENT_RECEIVED: 'text-indigo-700 font-semibold',
  ACCOUNTS_VERIFIED: 'text-emerald-700 font-bold',
  FINAL_DISCUSSION: 'text-amber-700 font-semibold',
  WON: 'text-green-700 font-bold',
  LOST: 'text-red-700 font-bold',
  FOLLOW_UP_GENERAL: 'text-stone-700 font-semibold',
  NEGOTIATION_FOLLOW_UP: 'text-amber-700 font-semibold',
  ON_CALL_FOLLOW_UP: 'text-sky-700 font-semibold',
  OFFLINE_FOLLOW_UP: 'text-stone-700 font-semibold',
  ACTIVITY_LOG: 'text-stone-500 font-semibold',
};

const STAGE_RANK: Record<string, number> = {
  LEAD_CAPTURED: 1,
  FOLLOW_UP: 1.1, FOLLOW_UP_GENERAL: 1.1, NEGOTIATION_FOLLOW_UP: 1.1, ON_CALL_FOLLOW_UP: 1.1, OFFLINE_FOLLOW_UP: 1.1, ACTIVITY_LOG: 1.1,
  OFFLINE_MEETING: 2, ONLINE_MEETING: 2, MEETING_SCHEDULED: 2,
  SITE_DETAILS_REQUESTED: 2.5,
  SITE_DETAILS_UPLOADED: 3,
  PROPOSAL_IN_PROGRESS: 3.5,
  PROPOSAL_SENT: 4,
  PROPOSAL_ACCEPTED: 5,
  PROPOSAL_REJECTED: 5,
  PROPOSAL_AGREED: 6,
  CONTRACT_CREATED: 6.2,
  CONTRACT_EMAILED: 6.5,
  SIGNED_CONTRACT_UPLOADED: 6.7,
  INITIAL_PAYMENT_RECEIVED: 6.9,
  ACCOUNTS_VERIFIED: 7.3,
  FINAL_DISCUSSION: 7,
  WON: 8,
  LOST: 0,
};
const stageRank = (s?: string | null) => STAGE_RANK[s ?? ''] ?? 1;

const workflowStageLabel = (stage?: string | null) => {
  if (!stage) return 'Lead Captured';
  const labels: Record<string, string> = {
    LEAD_CAPTURED: 'Lead Captured',
    OFFLINE_MEETING: 'Meeting (Offline)',
    ONLINE_MEETING: 'Meeting (Online)',
    MEETING_SCHEDULED: 'Meeting Scheduled',
    SITE_DETAILS_REQUESTED: 'Site Details Requested',
    SITE_DETAILS_UPLOADED: 'Site Details Uploaded',
    PROPOSAL_SENT: 'Proposal Sent',
    PROPOSAL_AGREED: 'Proposal Agreed',
    PROPOSAL_ACCEPTED: 'Proposal Accepted',
    PROPOSAL_REJECTED: 'Proposal Rejected',
    PROPOSAL_IN_PROGRESS: 'Proposal In Progress',
    FINAL_DISCUSSION: 'Final Discussion',
    FOLLOW_UP: 'Follow-up',
    WON: 'Won',
    LOST: 'Lost',
    FOLLOW_UP_GENERAL: 'General Follow-up',
    NEGOTIATION_FOLLOW_UP: 'Negotiation Follow-up',
    ON_CALL_FOLLOW_UP: 'On Call Follow-up',
    OFFLINE_FOLLOW_UP: 'Offline Follow-up',
  };
  return labels[stage] ?? stage.replace(/_/g, ' ');
};

/* ── Tailwind Shared Classes ── */
const inputBase = 'w-full bg-white border border-[rgba(184,144,71,0.35)] text-stone-900 text-[13px] rounded-lg px-3.5 py-1.5 outline-none transition focus:border-[#b89047] focus:ring-2 focus:ring-[rgba(184,144,71,0.2)] font-[inherit] compact-input';
const labelBase = 'text-[10px] font-bold uppercase tracking-wide text-stone-500';
const btnSecondary = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-stone-750 bg-stone-100 border border-[rgba(184,144,71,0.25)] hover:bg-stone-200 hover:text-stone-900 transition-colors duration-150 cursor-pointer';

export const ProspectWorkflowDetail: React.FC<Props> = ({ currentUser, prospectId }) => {
  const { showToast } = useToast();
  const { navigate } = useRouter();

  const [prospect, setProspect] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Workflow states
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [showLogFollowUpModal, setShowLogFollowUpModal] = useState(false);
  const [showSendProposalModal, setShowSendProposalModal] = useState(false);

  // Log follow-up fields
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [activityType, setActivityType] = useState('meeting');
  const [activitySubtype, setActivitySubtype] = useState('offline');
  const [contractFileUrl, setContractFileUrl] = useState<string | null>(null);

  // Send proposal fields
  const [proposalSubject, setProposalSubject] = useState('');
  const [proposalBody, setProposalBody] = useState('');
  const [proposalFileUrl, setProposalFileUrl] = useState<string | null>(null);
  const [proposalFileName, setProposalFileName] = useState<string | null>(null);
  const [sendingProposal, setSendingProposal] = useState(false);

  // Site details request and upload fields
  const [showRequestSiteDetailsModal, setShowRequestSiteDetailsModal] = useState(false);
  const [showUploadSiteDetailsModal, setShowUploadSiteDetailsModal] = useState(false);
  const [siteRequestSubject, setSiteRequestSubject] = useState('');
  const [siteRequestBody, setSiteRequestBody] = useState('');
  const [sendingSiteRequest, setSendingSiteRequest] = useState(false);
  const [siteGoogleMapsLinkInput, setSiteGoogleMapsLinkInput] = useState('');
  const [uploadingSiteDetails, setUploadingSiteDetails] = useState(false);

  // Meeting invite fields
  const [showMeetingInviteModal, setShowMeetingInviteModal] = useState(false);
  const [meetingType, setMeetingType] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [sendingMeetingInvite, setSendingMeetingInvite] = useState(false);

  // Contract / payment section state
  const [showInitialPaymentModal, setShowInitialPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentUnit, setPaymentUnit] = useState('LAKH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDocUrl, setPaymentDocUrl] = useState<string | null>(null);
  const [paymentDocName, setPaymentDocName] = useState<string | null>(null);
  const [submittingContract, setSubmittingContract] = useState(false);
  // Accounts: revised payment amount for verification
  const [revisedPaymentAmount, setRevisedPaymentAmount] = useState('');
  const [revisedPaymentUnit, setRevisedPaymentUnit] = useState('LAKH');

  // File Uploader Statuses
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const fetchProspectData = async () => {
    setLoading(true);
    setLoadingFollowUps(true);
    setError(null);
    try {
      const [prospectRes, followUpsRes] = await Promise.all([
        prospectApi.getProspectById(prospectId),
        prospectApi.getFollowUps(prospectId),
      ]);
      setProspect(prospectRes.data.prospect);
      setFollowUps(followUpsRes.data.followUps || []);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to load prospect details.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
      setLoadingFollowUps(false);
    }
  };

  const fetchFollowUps = async (id: string) => {
    setLoadingFollowUps(true);
    try {
      const res = await prospectApi.getFollowUps(id);
      setFollowUps(res.data.followUps || []);
    } catch (err: any) {
      console.error('Failed to fetch follow-up logs', err);
      showToast(err.response?.data?.message || 'Failed to fetch activity logs.', 'error');
    } finally {
      setLoadingFollowUps(false);
    }
  };

  useEffect(() => {
    if (prospectId) {
      fetchProspectData();
    }
  }, [prospectId]);

  const handleLogFollowUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!followUpNotes.trim()) {
      showToast('Follow-up notes cannot be empty.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await prospectApi.logFollowUp(prospectId, {
        notes: followUpNotes.trim(),
        contractFileUrl: contractFileUrl || null,
        logOnly: true,  // activity log never advances the pipeline stage
      });

      if (res.data.success) {
        showToast('Activity logged successfully.', 'success');
        setFollowUpNotes('');
        setContractFileUrl(null);
        setShowLogFollowUpModal(false);
        await fetchProspectData();
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to log activity.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestSiteDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!siteRequestSubject.trim() || !siteRequestBody.trim()) {
      showToast('Subject and email body are required.', 'error');
      return;
    }

    setSendingSiteRequest(true);
    try {
      const res = await prospectApi.requestSiteDetails(prospectId, {
        subject: siteRequestSubject.trim(),
        body: siteRequestBody.trim(),
      });

      if (res.data.success) {
        showToast('Site request email sent and logged successfully.', 'success');
        setSiteRequestSubject('');
        setSiteRequestBody('');
        setShowRequestSiteDetailsModal(false);
        fetchFollowUps(prospectId);
        setProspect((prev: any) => ({ ...prev, workflowStage: 'SITE_DETAILS_REQUESTED' }));
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to send site details request.', 'error');
    } finally {
      setSendingSiteRequest(false);
    }
  };

  const handleUploadSiteDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!siteGoogleMapsLinkInput.trim()) {
      showToast('Google Maps link is required.', 'error');
      return;
    }

    setUploadingSiteDetails(true);
    try {
      const res = await prospectApi.uploadSiteDetails(prospectId, {
        siteGoogleMapsLink: siteGoogleMapsLinkInput.trim(),
      });

      if (res.data.success) {
        showToast('Site location saved successfully.', 'success');
        setShowUploadSiteDetailsModal(false);
        fetchFollowUps(prospectId);
        setProspect((prev: any) => ({
          ...prev,
          workflowStage: 'SITE_DETAILS_UPLOADED',
          siteGoogleMapsLink: siteGoogleMapsLinkInput.trim(),
        }));
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save site details.', 'error');
    } finally {
      setUploadingSiteDetails(false);
    }
  };

  const handleSendMeetingInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!meetingDate) {
      showToast('Meeting date and time are required.', 'error');
      return;
    }

    setSendingMeetingInvite(true);
    try {
      const res = await prospectApi.sendMeetingInvite(prospectId, {
        meetingType,
        meetingDate,
        meetingLink: meetingType === 'ONLINE' ? meetingLink || null : null,
        notes: meetingNotes.trim() || null,
      });

      if (res.data.success) {
        const generatedLink = res.data.meetingLink;
        const msg = generatedLink
          ? `Meeting invite sent. Auto-generated link: ${generatedLink}`
          : 'Meeting invite sent and logged successfully.';
        showToast(msg, 'success');
        setMeetingDate('');
        setMeetingNotes('');
        setMeetingLink('');
        setMeetingType('ONLINE');
        setShowMeetingInviteModal(false);
        fetchFollowUps(prospectId);
        setProspect((prev: any) => ({ ...prev, workflowStage: 'MEETING_SCHEDULED' }));
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to send meeting invite.', 'error');
    } finally {
      setSendingMeetingInvite(false);
    }
  };

  const handleSendProposal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!proposalSubject.trim() || !proposalBody.trim()) {
      showToast('Subject and email body are required.', 'error');
      return;
    }
    if (!proposalFileUrl) {
      showToast('Please upload the proposal PDF before sending.', 'error');
      return;
    }

    setSendingProposal(true);
    try {
      const res = await prospectApi.sendProposal(prospectId, {
        subject: proposalSubject.trim(),
        body: proposalBody.trim(),
        attachmentUrl: proposalFileUrl,
        attachmentName: proposalFileName,
      });

      if (res.data.success) {
        showToast('Proposal email sent and logged successfully.', 'success');
        setProposalSubject('');
        setProposalBody('');
        setProposalFileUrl(null);
        setProposalFileName(null);
        setShowSendProposalModal(false);
        fetchFollowUps(prospectId);
        setProspect((prev: any) => ({ ...prev, workflowStage: 'PROPOSAL_SENT' }));
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to send proposal.', 'error');
    } finally {
      setSendingProposal(false);
    }
  };

  const handleUpdateStage = async (newStage: string, notesText?: string) => {
    try {
      const res = await prospectApi.updateWorkflowStage(prospectId, {
        stage: newStage,
        notes: notesText || `Stage transitioned explicitly to: ${newStage.replace(/_/g, ' ')}`,
      });

      if (res.data.success) {
        showToast(`Workflow updated to ${newStage.replace(/_/g, ' ')}.`, 'success');
        fetchFollowUps(prospectId);
        setProspect((prev: any) => ({ ...prev, workflowStage: newStage }));
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to transition stage.', 'error');
    }
  };

  const handleCreateContract = async () => {
    setSubmittingContract(true);
    try {
      const res = await contractApi.createDraft({ prospectId });
      if (res.data.success) {
        showToast('Contract created successfully.', 'success');
        await fetchProspectData();
        await handleUpdateStage('CONTRACT_CREATED', 'Contract record created for this prospect.');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create contract.', 'error');
    } finally {
      setSubmittingContract(false);
    }
  };

  const handleUploadDraftPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const contract = prospect?.contracts?.[0];
    if (!contract) { showToast('Create a contract first.', 'error'); return; }

    const formData = new FormData();
    const ext = file.name.split('.').pop()?.toLowerCase();
    const uniqueName = `draft_${prospectId}_${Date.now()}.${ext}`;
    formData.append('file', file, uniqueName);

    setUploadingFiles(p => ({ ...p, draftPdf: true }));
    try {
      const uploadRes = await contractApi.uploadFile(formData);
      const fileUrl = uploadRes.data.fileUrl;
      await contractApi.saveDraftUrl(contract.id, fileUrl);
      showToast('Draft PDF uploaded.', 'success');
      await fetchProspectData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setUploadingFiles(p => ({ ...p, draftPdf: false }));
      e.target.value = '';
    }
  };

  const handleApproveContract = async () => {
    const contract = prospect?.contracts?.[0];
    if (!contract) return;
    try {
      await contractApi.approve(contract.id);
      showToast('Contract approved.', 'success');
      await fetchProspectData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Approval failed.', 'error');
    }
  };

  const handleSendContractEmail = async () => {
    const contract = prospect?.contracts?.[0];
    if (!contract) return;
    if (!prospect.email) { showToast('Client has no email address. Edit the brief first.', 'error'); return; }
    setSubmittingContract(true);
    try {
      await contractApi.sendContract(contract.id, { clientEmail: prospect.email, clientName: prospect.clientName });
      showToast('Contract email sent.', 'success');
      await fetchProspectData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send contract email.', 'error');
    } finally {
      setSubmittingContract(false);
    }
  };

  const handleUploadSignedContract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const contract = prospect?.contracts?.[0];
    if (!contract) { showToast('No contract found.', 'error'); return; }

    const formData = new FormData();
    const ext = file.name.split('.').pop()?.toLowerCase();
    const uniqueName = `signed_${prospectId}_${Date.now()}.${ext}`;
    formData.append('file', file, uniqueName);

    setUploadingFiles(p => ({ ...p, signedPdf: true }));
    try {
      const uploadRes = await contractApi.uploadFile(formData);
      const fileUrl = uploadRes.data.fileUrl;
      await contractApi.saveSignedUrl(contract.id, fileUrl);
      showToast('Signed contract uploaded.', 'success');
      await fetchProspectData();
      await handleUpdateStage('SIGNED_CONTRACT_UPLOADED', 'Signed contract received from client.');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setUploadingFiles(p => ({ ...p, signedPdf: false }));
      e.target.value = '';
    }
  };

  const handleRecordInitialPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!paymentNotes.trim() && !paymentAmount) {
      showToast('Please enter payment amount or notes.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await prospectApi.recordInitialPayment(prospectId, {
        amount: paymentAmount || undefined,
        unit: paymentUnit,
        notes: paymentNotes.trim() || `Initial payment of ${paymentAmount} ${paymentUnit} received.`,
        attachmentUrl: paymentDocUrl,
        attachmentName: paymentDocName,
      });
      if (res.data.success) {
        showToast('Initial payment recorded.', 'success');
        setPaymentAmount('');
        setPaymentNotes('');
        setPaymentDocUrl(null);
        setPaymentDocName(null);
        setShowInitialPaymentModal(false);
        await fetchProspectData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record payment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyByAccounts = async () => {
    try {
      const revisedAmt = revisedPaymentAmount ? parseFloat(revisedPaymentAmount) : null;
      const res = await prospectApi.verifyByAccounts(prospectId, {
        notes: 'Payment and documentation verified by Accounts.',
        revisedAmount: revisedAmt,
        revisedUnit: revisedPaymentUnit,
      });
      if (res.data.success) {
        showToast('Verified! Project moved to WON.', 'success');
        setRevisedPaymentAmount('');
        await fetchProspectData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Verification failed.', 'error');
    }
  };

  const renderRadioField = (label: string, value: string) => (
    <div className="flex flex-col gap-1.5">
      <label className={labelBase}>{label}</label>
      <div className="flex gap-4">
        {['Yes', 'No'].map((opt) => (
          <label key={opt} className="inline-flex items-center gap-1.5 text-[12.5px] text-stone-800 cursor-not-allowed opacity-80 select-none">
            <input
              type="radio"
              checked={value === opt}
              disabled
              className="accent-[#b89047] w-4 h-4 cursor-not-allowed"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );

  const renderProjectStageField = (label: string, value: string) => {
    const activeIndex = PROJECT_PHASES.findIndex(p => p.label === value);
    const fillPct = activeIndex !== -1 ? Math.round((activeIndex / (PROJECT_PHASES.length - 1)) * 100) : 0;
    const selectedPhase = activeIndex !== -1 ? PROJECT_PHASES[activeIndex] : null;

    return (
      <div className="w-full select-none">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <label className={labelBase}>{label}</label>
          <span className="text-[10px] font-bold text-[#9e7735] bg-[rgba(184,144,71,0.08)] px-1.5 py-0.5 rounded border border-[rgba(184,144,71,0.22)]">
            {fillPct}% complete
          </span>
        </div>
        {selectedPhase ? (
          <div className="flex items-center gap-2 bg-[rgba(184,144,71,0.08)] border border-[rgba(184,144,71,0.25)] rounded-lg px-3 py-1.5 mb-3">
            <span className="w-5 h-5 rounded-full bg-[#b89047] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {selectedPhase.letter}
            </span>
            <span className="text-[12px] font-semibold text-stone-700">{selectedPhase.label}</span>
          </div>
        ) : (
          <p className="text-[11px] text-stone-400 italic mb-3">No project stage recorded</p>
        )}
        <div className="overflow-x-auto p-2">
          <div className="relative min-w-[520px]">
            <div className="flex items-start relative z-10">
              {PROJECT_PHASES.map((phase, idx) => {
                const isSelected = value === phase.label;
                const isPast = activeIndex !== -1 && idx < activeIndex;
                return (
                  <div
                    key={phase.letter}
                    title={phase.label}
                    className="flex-1 flex flex-col items-center gap-0.5 p-0 pb-1"
                  >
                    <span className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8.5px] font-bold leading-none ${
                      isSelected
                        ? 'bg-[#b89047] text-white shadow ring-2 ring-[rgba(184,144,71,0.3)] scale-[1.3]'
                        : isPast
                          ? 'bg-[#b89047] text-white'
                          : 'bg-white border-2 border-stone-300 text-stone-400'
                    }`}>
                      {phase.letter}
                    </span>
                    <span className={`text-[6.5px] leading-tight text-center font-medium ${
                      isSelected ? 'text-[#b89047] font-bold' : isPast ? 'text-[#9e7735]/70' : 'text-stone-400'
                    }`}>
                      {phase.shortName}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="absolute z-0" style={{ top: '9px', left: 'calc(100% / 40)', right: 'calc(100% / 40)', height: '2px' }}>
              <div className="w-full h-full bg-stone-200 rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${fillPct}%`, background: 'linear-gradient(to right, #b89047, #9e7735)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string, fileLimitMb: number, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'zip') {
      setUploadErrors(p => ({ ...p, [fieldKey]: 'Only ZIP and PDF files are allowed.' }));
      return;
    }

    if (file.size > fileLimitMb * 1024 * 1024) {
      setUploadErrors(p => ({ ...p, [fieldKey]: `File size exceeds the ${fileLimitMb}MB limit.` }));
      return;
    }

    setUploadErrors(p => ({ ...p, [fieldKey]: '' }));
    setUploadingFiles(p => ({ ...p, [fieldKey]: true }));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const isNoc = fieldKey === 'turnkeyNocFile';
      const res = await prospectApi.uploadFile(formData, isNoc ? 'noc' : 'ref');

      if (res.data && res.data.fileUrl) {
        setter(res.data.fileUrl);
      }
    } catch (err: any) {
      console.error(err);
      setUploadErrors(p => ({ ...p, [fieldKey]: err.response?.data?.message || 'File upload failed.' }));
    } finally {
      setUploadingFiles(p => ({ ...p, [fieldKey]: false }));
    }
  };

  const renderFileUploadField = (label: string, fieldKey: string, fileUrl: string, setter: (val: string) => void, limitMb: number) => {
    const isUploading = uploadingFiles[fieldKey];
    const errorMsg = uploadErrors[fieldKey];

    return (
      <div className="flex flex-col gap-1.5 sm:col-span-2 bg-stone-50/40 p-3.5 rounded-xl border border-dashed border-stone-200">
        <label className={labelBase}>{label}</label>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="file"
            accept=".zip,.pdf"
            onChange={e => handleFileUpload(e, fieldKey, limitMb, setter)}
            disabled={isUploading || !!fileUrl}
            className="text-[12px] text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11.5px] file:font-semibold file:bg-amber-50 file:text-[#af926a] file:hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50"
          />
          {isUploading && (
            <span className="text-[11.5px] text-[#af926a] font-semibold flex items-center gap-1.5">
              <RefreshCw size={12} className="animate-spin" /> Uploading...
            </span>
          )}
        </div>

        {fileUrl && (
          <div className="mt-1.5 flex items-center gap-2 text-[12px] text-emerald-700 font-semibold bg-emerald-50/60 p-2 rounded-lg border border-emerald-150">
            <Check size={14} />
            <span>File uploaded successfully!</span>
            <a href={`${BACKEND_BASE}${fileUrl}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-amber-600 hover:text-amber-700 underline flex items-center gap-1 font-bold">
              View Document
            </a>
          </div>
        )}

        {errorMsg && <span className="text-[11px] font-semibold text-red-500 mt-1">{errorMsg}</span>}
      </div>
    );
  };

  const renderConditionalFields = () => {
    if (!prospect) return null;
    const servicesList = prospect.serviceType ? prospect.serviceType.split(',') : [];

    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return '—';
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const areaLabel = (value?: number | null, unit?: string | null, customUnit?: string | null) => {
      if (!value) return '—';
      const unitLabels: Record<string, string> = { SQ_FT: 'Sq. Ft', SQ_MTR: 'Sq. Mtr', ACRE: 'Acre', GUNTHA: 'Guntha', OTHER: customUnit || 'Other' };
      return `${value.toLocaleString('en-IN')} ${unitLabels[unit || ''] || unit || ''}`;
    };

    const budgetLabel = (amount?: number | null, unit?: string | null) => {
      if (!amount) return '—';
      return `${amount} ${unit === 'CRORE' ? 'Crore' : 'Lakh'}`;
    };

    const floorLabel = (val?: string | null, custom?: string | null) => {
      const map: Record<string, string> = { GROUND_FLOOR: 'Ground Floor', G_1: 'G + 1', G_2: 'G + 2', G_3: 'G + 3', G_4: 'G + 4', OTHER: custom || 'Other' };
      return val ? (map[val] || val) : '—';
    };

    const timelineLabel = (val?: string | null) => {
      const map: Record<string, string> = {
        '3_6_MONTHS': '3 – 6 Months', '6_8_MONTHS': '6 – 8 Months', '8_12_MONTHS': '8 – 12 Months',
        'UP_TO_18_MONTHS': 'Up To 18 Months', 'UP_TO_24_MONTHS': 'Up To 24 Months', 'MORE_THAN_2_YEARS': 'More Than 2 Years',
      };
      return val ? (map[val] || val) : '—';
    };

    const sourceLabel = (val?: string | null, custom?: string | null) => {
      const map: Record<string, string> = {
        INSTAGRAM: 'Instagram', META_FACEBOOK: 'Meta / Facebook', WHATSAPP: 'WhatsApp',
        JUST_DIAL: 'Just Dial', REFERENCE: 'Reference', WALK_IN: 'Walk-In',
        REPEATED_CLIENT: 'Repeated Client', EMAIL: 'Email', OTHER: custom || 'Other',
      };
      return val ? (map[val] || val) : '—';
    };

    const ReadField = ({ label, value, span2 = false }: { label: string; value: React.ReactNode; span2?: boolean }) => (
      <div className={`flex flex-col gap-1.5 ${span2 ? 'col-span-2' : ''}`}>
        <label className={labelBase}>{label}</label>
        <div className="w-full bg-stone-100/50 border border-[rgba(197,168,128,0.22)] text-stone-750 text-[13px] rounded-lg px-3.5 py-1.5 font-medium compact-input">
          {value || '—'}
        </div>
      </div>
    );

    const BoolField = ({ label, value }: { label: string; value?: boolean | null }) => (
      <div className="flex flex-col gap-1.5">
        <label className={labelBase}>{label}</label>
        <div className="flex gap-3 pt-0.5">
          <span className={`text-[12.5px] font-semibold ${value === true ? 'text-emerald-700' : value === false ? 'text-stone-550' : 'text-stone-400'}`}>
            {value === true ? 'Yes' : value === false ? 'No' : '—'}
          </span>
        </div>
      </div>
    );

    return (
      <div className="flex flex-col gap-6">

        {/* ── Prospect Overview — asked once, shared across all services ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[rgba(184,144,71,0.08)] border border-[rgba(184,144,71,0.3)] p-4 rounded-xl">
          <div className="col-span-2">
            <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-[rgba(184,144,71,0.22)] pb-1">Project Overview</h4>
          </div>
          <ReadField label="Lead Source" value={sourceLabel(prospect.sourceType, prospect.sourceCustom)} />
          <ReadField label="Budget" value={budgetLabel(prospect.budgetAmount, prospect.budgetUnit)} />
          <ReadField label="Expected Completion" value={formatDate(prospect.expectedCompletion)} />
        </div>

        {/* ── Architectural Consultation ── */}
        {servicesList.includes('ARCHITECTURAL_CONSULTATION') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[rgba(184,144,71,0.2)] pt-4 mt-2 bg-stone-50/20 p-4 rounded-xl">
            <div className="col-span-2">
              <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">Architectural Consultation</h4>
            </div>
            <ReadField label="Plot Size" value={areaLabel(prospect.plotAreaValue, prospect.plotAreaUnit, prospect.plotAreaCustomUnit)} />
            <ReadField label="Floors to Build" value={floorLabel(prospect.archFloors, prospect.archFloorsCustom)} />
            {renderRadioField('Needs sanctioned plan?', prospect.archSanctionedNeed || 'No')}
            {renderRadioField('Needs GFC Drawings?', prospect.archGfcDrawingsNeed || 'No')}
            <ReadField label="Construction Start Date" value={formatDate(prospect.archConstructionStart)} />
          </div>
        )}

        {/* ── Interior Design ── */}
        {servicesList.includes('INTERIOR_DESIGN') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[rgba(184,144,71,0.2)] pt-4 mt-2 bg-stone-50/20 p-4 rounded-xl">
            <div className="col-span-2">
              <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">Interior Design</h4>
            </div>
            <ReadField label="Estimated Area to Design" value={areaLabel(prospect.interiorAreaValue, prospect.interiorAreaUnit)} />
            {renderRadioField('Already has design?', prospect.intHasDesign || 'No')}
            {renderRadioField('Has reference images (Pinterest / platform)?', prospect.intHasReferenceImages || 'No')}
          </div>
        )}

        {/* ── PMC ── */}
        {servicesList.includes('PMC') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[rgba(184,144,71,0.2)] pt-4 mt-2 bg-stone-50/20 p-4 rounded-xl">
            <div className="col-span-2">
              <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">PMC</h4>
            </div>
            {renderRadioField('Worked with PMC before?', prospect.pmcWorkedBefore || 'No')}
            <ReadField label="Estimated Area for Management" value={areaLabel(prospect.mgmtAreaValue, prospect.mgmtAreaUnit)} />
            <ReadField label="Hired Architect" value={prospect.pmcArchitectDetails && prospect.pmcArchitectDetails !== 'No' ? prospect.pmcArchitectDetails : 'No'} />
            <BoolField label="Contractor Hired?" value={prospect.contractorHired} />
            {prospect.contractorHired && <ReadField label="Contractor Name" value={prospect.contractorName} />}
            <ReadField label="Construction Timeline" value={timelineLabel(prospect.constructionTimeline)} />
            <ReadField label="BOQ / Budget" value={budgetLabel(prospect.boqAmount, prospect.boqUnit)} />
            {renderRadioField('Has DPR / construction documentation?', prospect.pmcDprDocumentation || 'No')}
            {renderRadioField('Needs shop drawings?', prospect.pmcShopDrawingsNeed || 'No')}
          </div>
        )}

        {/* ── Turnkey Construction ── */}
        {servicesList.includes('TURNKEY_CONSTRUCTION') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[rgba(184,144,71,0.2)] pt-4 mt-2 bg-stone-50/20 p-4 rounded-xl">
            <div className="col-span-2">
              <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">Turnkey Construction</h4>
            </div>
            <ReadField label="Total Area to Construct" value={areaLabel(prospect.turnkeyAreaValue, prospect.turnkeyAreaUnit)} />
            {renderRadioField('Has construction drawings?', prospect.turnkeyHasDrawings || 'No')}
            {renderRadioField('Has existing estimate?', prospect.turnkeyHasEstimate || 'No')}
            {prospect.turnkeyHasEstimate === 'Yes' && (
              <ReadField label="Existing Estimate Amount" value={
                prospect.turnkeyEstimateValue
                  ? budgetLabel(prospect.turnkeyEstimateValue, prospect.turnkeyEstimateUnit)
                  : (prospect.turnkeyEstimateAmount || '—')
              } />
            )}
            <ReadField label="Construction Type" value={prospect.turnkeyHaltedOrNew === 'Yes' ? 'Halted Construction' : 'Completely New Construction'} />
            {prospect.turnkeyHaltedOrNew === 'Yes' && (
              <>
                <ReadField label="Reason for Stopping" value={prospect.turnkeyHaltedReason} span2 />
                <BoolField label="Can provide NOC?" value={prospect.nocAvailable} />
              </>
            )}
          </div>
        )}

        {/* ── Interior Execution ── */}
        {servicesList.includes('INTERIOR_EXECUTION') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[rgba(184,144,71,0.2)] pt-4 mt-2 bg-stone-50/20 p-4 rounded-xl">
            <div className="col-span-2">
              <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">Interior Execution</h4>
            </div>
            <ReadField label="Estimated Area to Execute" value={areaLabel(prospect.execAreaValue, prospect.execAreaUnit)} />
            {renderRadioField('Has prepared design?', prospect.execHasDesign || 'No')}
            {renderRadioField('Has working drawings?', prospect.execHasWorkingDrawings || 'No')}
            {renderRadioField('Selections completed (fixtures, fabrics, flooring)?', prospect.execSelectionsDone || 'No')}
          </div>
        )}

        {/* ── Renovation ── */}
        {servicesList.includes('RENOVATION') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[rgba(184,144,71,0.2)] pt-4 mt-2 bg-stone-50/20 p-4 rounded-xl">
            <div className="col-span-2">
              <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">Renovation</h4>
            </div>
            <ReadField label="Kind of Property" value={prospect.renovationPropertyType} />
            <ReadField label="Estimated Area to Renovate" value={areaLabel(prospect.renovationAreaValue, prospect.renovationAreaUnit)} />
            {renderRadioField('Will reside at property during renovation?', prospect.renovationWillReside || 'No')}
          </div>
        )}

        {/* ── End-to-End Solution ── */}
        {servicesList.includes('END_TO_END') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[rgba(184,144,71,0.2)] pt-4 mt-2 bg-stone-50/20 p-4 rounded-xl">
            <div className="col-span-2">
              <h4 className="text-[12px] font-bold text-[#9e7735] mb-2 uppercase tracking-wide border-b border-stone-100 pb-1">End-to-End Solution</h4>
            </div>
            <ReadField label="Type of Property" value={prospect.etoPropertyType} />
            <ReadField label="Project Start Timeline" value={prospect.etoProjectStart} />
            <ReadField label="Approximate Area" value={areaLabel(prospect.etoAreaValue, prospect.etoAreaUnit)} />
            {renderRadioField('Drawings / Documentation Available?', prospect.etoHasDocumentation || 'No')}
            {prospect.etoSpecialRequirements && (
              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Special Requirements</span>
                <p className="text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap">{prospect.etoSpecialRequirements}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 flex-1">
        <ShimmerCardGrid cards={4} />
        <ShimmerTable rows={6} cols={4} />
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] gap-4 p-4 text-center">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center border border-red-200">
          <ArrowLeft size={20} />
        </div>
        <div>
          <h3 className="text-md font-bold text-[var(--text-primary)]">Prospect Load Error</h3>
          <p className="text-[12px] text-stone-500 mt-1.5 max-w-sm leading-relaxed">{error || 'Prospect brief requirements could not be located in system.'}</p>
        </div>
        <button onClick={() => navigate('/prospects')} className={btnSecondary}>
          <ArrowLeft size={13} /><span>Back to Prospects List</span>
        </button>
      </div>
    );
  }

  const selectedServices = prospect.serviceType ? prospect.serviceType.split(',').filter(Boolean) : [];
  const isSiteDetailsMissing = !prospect.siteGoogleMapsLink;
  const isWon = prospect.workflowStage === 'WON';
  const hasDraftPdf = prospect.contracts && prospect.contracts.some((c: any) => c.draftPdfUrl);

  return (
    <div className="animate-fade-in flex flex-col h-full min-h-0 p-4">
      {/* Header bar */}
      <div className="flex items-start justify-between gap-2 mb-0 shrink-0 border-b border-stone-200 pb-3">
        <div className="flex items-start gap-2 min-w-0">
          <button onClick={() => navigate('/prospects')} className="p-2 rounded-lg hover:bg-stone-100 text-stone-550 border-0 bg-transparent cursor-pointer shrink-0 mt-0.5" title="Back to listing">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight truncate max-w-[200px] sm:max-w-none">{prospect.clientName}</h2>
              <span className={`text-[11px] uppercase tracking-wider font-bold shrink-0 ${workflowStageBadgeClasses[prospect.workflowStage || 'LEAD_CAPTURED'] || 'text-stone-600'}`}>
                {workflowStageLabel(prospect.workflowStage)}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5 hidden sm:block">
              Lead ID: <span className="font-mono text-stone-650">{prospect.id}</span>
            </p>
          </div>
        </div>
        <button onClick={fetchProspectData} className={`${btnSecondary} shrink-0`} title="Refresh">
          <RefreshCw size={14} className={loadingFollowUps ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stage bar — full width, sticky below header */}
      <div className="shrink-0 border-b border-stone-100 px-0 py-3 bg-stone-50/30">
        {renderProjectStageField('Current Stage of Project', prospect.projectStage || '')}
      </div>

      {/* Main content grid */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pb-8">
          {/* Left Column: Client profile — narrow sidebar */}
          <div className="lg:col-span-3 bg-stone-50/40 border border-stone-200/80 p-4 rounded-2xl space-y-3">
            <h4 className="text-[12px] font-bold text-[#9e7735] uppercase tracking-wide border-b border-stone-200/50 pb-1.5 mb-2">
              Client Profile
            </h4>
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Client Name</label>
              <div className="w-full bg-white border border-[rgba(184,144,71,0.22)] text-stone-850 text-[13px] rounded-lg px-3.5 py-1.5 font-semibold">
                {prospect.clientName}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Mobile No.</label>
              <div className="w-full bg-white border border-[rgba(184,144,71,0.22)] text-stone-850 text-[13px] rounded-lg px-3.5 py-1.5 font-semibold flex items-center gap-2">
                <Phone size={12} className="text-stone-400" />
                {prospect.mobileNo}
              </div>
            </div>
            {prospect.email && (
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Email Address</label>
                <div className="w-full bg-white border border-[rgba(184,144,71,0.22)] text-stone-850 text-[13px] rounded-lg px-3.5 py-1.5 font-semibold flex items-center gap-2">
                  <Mail size={12} className="text-stone-400" />
                  {prospect.email}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className={labelBase}>Preferred Communication Mode</label>
              <div className="w-full bg-white border border-[rgba(184,144,71,0.22)] text-stone-850 text-[13px] rounded-lg px-3.5 py-1.5 font-semibold">
                {prospect.preferredCommunication === 'PHONE_CALL' ? 'Phone Call' : prospect.preferredCommunication === 'WHATSAPP' ? 'Whatsapp' : 'Email'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Pincode</label>
                <div className="w-full bg-white border border-[rgba(184,144,71,0.22)] text-stone-850 text-[13px] rounded-lg px-3.5 py-1.5 font-semibold">
                  {prospect.pincode || '—'}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Locality / Area</label>
                <div className="w-full bg-white border border-[rgba(184,144,71,0.22)] text-stone-850 text-[13px] rounded-lg px-3.5 py-1.5 font-semibold truncate" title={prospect.locality}>
                  {prospect.locality}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>District</label>
                <div className="w-full bg-white border border-[rgba(184,144,71,0.22)] text-stone-850 text-[13px] rounded-lg px-3.5 py-1.5 font-semibold">
                  {prospect.district || '—'}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>State</label>
                <div className="w-full bg-white border border-[rgba(184,144,71,0.22)] text-stone-850 text-[13px] rounded-lg px-3.5 py-1.5 font-semibold">
                  {prospect.state || '—'}
                </div>
              </div>
            </div>

            {/* Project site address */}
            {prospect.siteAddress && (
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Project Site Address</label>
                <div className="w-full bg-white border border-[rgba(184,144,71,0.22)] text-stone-850 text-[13px] rounded-lg px-3.5 py-1.5 font-semibold">
                  {prospect.siteAddress}
                </div>
              </div>
            )}

            {/* Site location */}
            {prospect.siteGoogleMapsLink ? (
              <div className="mt-4 p-4 rounded-xl bg-[rgba(184,144,71,0.08)] border border-[rgba(184,144,71,0.25)] space-y-2">
                <h5 className="text-[10.5px] font-bold text-[#9e7735] uppercase tracking-wide">Site Location</h5>
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-amber-600 shrink-0" />
                  <a
                    href={prospect.siteGoogleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-semibold text-[#b89047] hover:text-[#9e7735] underline truncate"
                    title={prospect.siteGoogleMapsLink}
                  >
                    Open in Google Maps ↗
                  </a>
                </div>
                <input
                  type="text"
                  disabled
                  value={prospect.siteGoogleMapsLink}
                  className="w-full text-[10.5px] text-stone-500 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 cursor-not-allowed truncate"
                />
              </div>
            ) : null}
          </div>

          {/* Middle Column: Project Overview + Service Questionnaires — wide */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex flex-wrap items-center gap-1.5 px-0.5 pb-1 border-b border-[rgba(184,144,71,0.2)]">
              <span className={labelBase + ' shrink-0 mr-1'}>Services:</span>
              {selectedServices.map((val: string, sIdx: number) => (
                <span key={val} className="text-[12.5px] font-bold text-[#7e5a20]">
                  {serviceLabels[val] || val}{sIdx < selectedServices.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>

            {renderConditionalFields()}
          </div>

          {/* Right Column: Workflow + Sales Actions + Activity */}
          <div className="lg:col-span-4 space-y-4 flex flex-col">
            {/* Workflow Pipeline Stepper */}
            <div className="bg-stone-50/40 border border-stone-200/80 p-5 rounded-2xl shrink-0">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200/50 mb-4">
                <h4 className="text-[12px] font-bold text-[#9e7735] uppercase tracking-wide">
                  Workflow Pipeline
                </h4>
                <span className={`text-[12.5px] uppercase tracking-wider font-bold ${workflowStageBadgeClasses[prospect.workflowStage || 'LEAD_CAPTURED'] || 'text-stone-600'}`}>
                  {workflowStageLabel(prospect.workflowStage)}
                </span>
              </div>

              {prospect.workflowStage === 'LOST' && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                  <span className="text-[11px] font-bold text-red-700">Lead marked as Lost.</span>
                </div>
              )}

              <div className="space-y-3">
                {([
                  { key: 'LEAD_CAPTURED', label: 'Lead Captured', rank: 1 },
                  { key: 'MEETING', label: 'Meeting / Follow-up', rank: 2 },
                  { key: 'SITE_DETAILS', label: 'Site Details', rank: 3 },
                  { key: 'PROPOSAL_SENT', label: 'Proposal Emailed', rank: 4 },
                  { key: 'PROPOSAL_AGREED', label: 'Client Agreed', rank: 6 },
                  { key: 'CONTRACT_EMAILED', label: 'Contract Sent', rank: 6.5 },
                  { key: 'SIGNED_CONTRACT_UPLOADED', label: 'Contract Signed', rank: 6.7 },
                  { key: 'INITIAL_PAYMENT_RECEIVED', label: 'Payment Received', rank: 6.9 },
                  { key: 'WON', label: 'Project Won', rank: 8 },
                ] as { key: string; label: string; rank: number }[]).map((step, idx, arr) => {
                  const activeRank = stageRank(prospect.workflowStage);
                  const isLost = prospect.workflowStage === 'LOST';
                  const isCompleted = !isLost && activeRank > step.rank;
                  const isActive = !isLost && activeRank >= step.rank && (idx === arr.length - 1 ? activeRank >= step.rank : activeRank < arr[idx + 1].rank);

                  return (
                    <div key={step.key} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors shrink-0 ${
                          isActive
                            ? 'bg-[#b89047] text-white border-[#b89047] ring-4 ring-[rgba(184,144,71,0.2)]'
                            : isCompleted
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-white text-stone-400 border-stone-200'
                        }`}>
                          {isCompleted ? <Check size={10} /> : idx + 1}
                        </div>
                        {idx < arr.length - 1 && (
                          <div className={`w-0.5 h-5 my-0.5 ${isCompleted ? 'bg-emerald-400' : 'bg-stone-200'}`} />
                        )}
                      </div>
                      <div className="pt-0.5">
                        <p className={`text-[11.5px] font-semibold leading-tight ${isActive ? 'text-[#7e5a20] font-bold' : isCompleted ? 'text-stone-700' : 'text-stone-400'}`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sales actions panel */}
            {(currentUser.role === 'Sales & Marketing' || currentUser.role === 'Super Admin') && (
              <div className="bg-stone-50/40 border border-stone-200/80 p-3 sm:p-5 rounded-xl sm:rounded-2xl space-y-3 shrink-0">
                <h4 className="text-[12px] font-bold text-[#9e7735] uppercase tracking-wide border-b border-stone-200/50 pb-1.5 mb-2">
                  Sales Actions
                </h4>
                {isWon && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-1">
                    <span className="text-[11px] font-bold text-emerald-700">Project Won — all actions are locked.</span>
                  </div>
                )}

                {/* ── Core action buttons ── */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setActivityType('meeting'); setActivitySubtype('offline'); setFollowUpNotes(''); setContractFileUrl(null); setShowLogFollowUpModal(true); }}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[10.5px] font-bold text-stone-750 bg-white border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    <ClipboardList size={12} /> Log Meeting / Notes
                  </button>

                  {/* Request Site Details — once only (hidden after SITE_DETAILS_REQUESTED or later) */}
                  {stageRank(prospect.workflowStage) < stageRank('SITE_DETAILS_REQUESTED') && (
                    <button
                      type="button"
                      disabled={isWon}
                      onClick={() => {
                        setSiteRequestSubject(`Request for Site Location Details - Grihscape - ${prospect.clientName}`);
                       setSiteRequestBody(`Hope you are doing well.\n\nTo move forward with preparing a detailed project proposal, we kindly request you to please share the Google Maps location URL of your site.\n\nBest regards,\nGrihscape Design & Construction`);
                        setShowRequestSiteDetailsModal(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[10.5px] font-bold text-stone-750 bg-white border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Mail size={12} /> Request Site Details
                    </button>
                  )}

                  {/* Upload Site Details — shown only while site location missing */}
                  {isSiteDetailsMissing && (
                    <button
                      type="button"
                      disabled={isWon}
                      onClick={() => { setSiteGoogleMapsLinkInput(''); setShowUploadSiteDetailsModal(true); }}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[10.5px] font-bold text-stone-750 bg-white border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Upload size={12} /> Upload Site Details
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isWon}
                    onClick={() => { setMeetingType('ONLINE'); setMeetingDate(''); setMeetingNotes(''); setMeetingLink(''); setShowMeetingInviteModal(true); }}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[10.5px] font-bold text-stone-750 bg-white border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Mail size={12} /> Send Meeting Invite
                  </button>

                  {/* Send / Resend Proposal — disabled after PROPOSAL_AGREED */}
                  {stageRank(prospect.workflowStage) < stageRank('PROPOSAL_AGREED') && (
                    <button
                      type="button"
                      disabled={isWon || isSiteDetailsMissing}
                      onClick={() => {
                        setProposalSubject(`Project Proposal - Grihscape - ${prospect.clientName}`);
                        setProposalBody(`Thank you for sharing your project requirements and site details with us.\n\nWe have prepared a comprehensive proposal for the services you requested.\n\nPlease find the attached PDF for your review.\n\nBest regards,\nGrihscape Design & Construction`);
                        setProposalFileUrl(null);
                        setProposalFileName(null);
                        setShowSendProposalModal(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[10.5px] font-bold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow transition-all cursor-pointer border-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={isSiteDetailsMissing ? 'Save site location first.' : 'Send Proposal Email'}
                    >
                      <Send size={12} /> Send Proposal
                    </button>
                  )}
                </div>

                {/* ── Proposal response buttons ── */}
                {['PROPOSAL_SENT', 'PROPOSAL_IN_PROGRESS', 'PROPOSAL_ACCEPTED'].includes(prospect.workflowStage || '') && (
                  <div className="space-y-1.5 border-t border-stone-200/50 pt-2">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-stone-500">Update Proposal Response</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button type="button" onClick={() => handleUpdateStage('PROPOSAL_ACCEPTED', 'Client accepted the proposal terms.')}
                        className={`py-1.5 rounded-lg text-[9px] font-bold border-0 cursor-pointer text-center transition-colors ${prospect.workflowStage === 'PROPOSAL_ACCEPTED' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400' : 'text-white bg-emerald-600 hover:bg-emerald-700'}`}>
                        Accepted
                      </button>
                      <button type="button" onClick={() => handleUpdateStage('PROPOSAL_REJECTED', 'Client rejected the proposal.')}
                        className="py-1.5 rounded-lg text-[9px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors border-0 cursor-pointer text-center">
                        Rejected
                      </button>
                      <button type="button" onClick={() => handleUpdateStage('PROPOSAL_IN_PROGRESS', 'Proposal status set to In Progress.')}
                        className="py-1.5 rounded-lg text-[9px] font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors border-0 cursor-pointer text-center">
                        In Progress
                      </button>
                    </div>
                    {/* Mark as Agreed — locked once AGREED */}
                    {prospect.workflowStage === 'PROPOSAL_ACCEPTED' && (
                      <button type="button" onClick={() => handleUpdateStage('PROPOSAL_AGREED', 'Client formally agreed to proposal terms.')}
                        className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors cursor-pointer border-0 mt-1">
                        <BadgeCheck size={12} /> Mark as Agreed (Locks Proposal)
                      </button>
                    )}
                  </div>
                )}

                {/* ── Contract section (PROPOSAL_AGREED or later) ── */}
                {stageRank(prospect.workflowStage) >= stageRank('PROPOSAL_AGREED') && !isWon && (() => {
                  const contract = prospect?.contracts?.[0];
                  return (
                    <div className="space-y-2 border-t border-stone-200/50 pt-2">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-stone-500 flex items-center gap-1.5">
                        <FilePlus size={10} /> Contract Management
                      </span>

                      {/* Step 1: Create contract */}
                      {!contract && (
                        <button type="button" disabled={submittingContract} onClick={handleCreateContract}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10.5px] font-bold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px transition-all cursor-pointer border-0 disabled:opacity-50">
                          {submittingContract ? <RefreshCw size={12} className="animate-spin" /> : <FilePlus size={12} />}
                          Create Contract
                        </button>
                      )}

                      {/* Step 2: Upload draft PDF (once) */}
                      {contract && !contract.draftPdfUrl && (
                        <label className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10.5px] font-bold text-stone-750 bg-white border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer">
                          {uploadingFiles['draftPdf'] ? <RefreshCw size={12} className="animate-spin text-amber-600" /> : <Upload size={12} />}
                          Upload Draft PDF
                          <input type="file" accept=".pdf" className="hidden" onChange={handleUploadDraftPdf} />
                        </label>
                      )}

                      {/* Draft PDF uploaded indicator */}
                      {contract?.draftPdfUrl && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-[10.5px] text-emerald-700 font-semibold">
                          <Check size={12} />
                          Draft PDF uploaded
                          <a href={fileUrl(contract.draftPdfUrl!)} target="_blank" rel="noopener noreferrer" className="ml-auto text-amber-600 hover:underline font-bold text-[9.5px]">View</a>
                        </div>
                      )}

                      {/* Upload / Replace Signed Contract — locked once payment is recorded */}
                      {contract && stageRank(prospect.workflowStage) >= stageRank('CONTRACT_EMAILED') && stageRank(prospect.workflowStage) < stageRank('INITIAL_PAYMENT_RECEIVED') && (
                        <label className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10.5px] font-bold text-stone-750 bg-white border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer">
                          {uploadingFiles['signedPdf'] ? <RefreshCw size={12} className="animate-spin text-amber-600" /> : <Upload size={12} />}
                          {contract.signedPdfUrl ? 'Replace Signed Contract' : 'Upload Signed Contract'}
                          <input type="file" accept=".pdf" className="hidden" onChange={handleUploadSignedContract} />
                        </label>
                      )}
                      {contract?.signedPdfUrl && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-[10.5px] text-emerald-700 font-semibold">
                          <Check size={12} />
                          Signed contract on file
                          <a href={fileUrl(contract.signedPdfUrl!)} target="_blank" rel="noopener noreferrer" className="ml-auto text-amber-600 hover:underline font-bold text-[9.5px]">View</a>
                        </div>
                      )}

                      {/* Record Initial Payment */}
                      {stageRank(prospect.workflowStage) >= stageRank('SIGNED_CONTRACT_UPLOADED') && stageRank(prospect.workflowStage) < stageRank('INITIAL_PAYMENT_RECEIVED') && (
                        <button type="button" onClick={() => setShowInitialPaymentModal(true)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10.5px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer border-0">
                          <DollarSign size={12} /> Record Initial Payment
                        </button>
                      )}
                      {stageRank(prospect.workflowStage) >= stageRank('INITIAL_PAYMENT_RECEIVED') && (
                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 text-[10.5px] text-indigo-700 font-semibold">
                          <DollarSign size={12} />
                          Initial payment recorded
                          {prospect.initialPaymentAmount && (
                            <span className="ml-auto font-bold text-indigo-800">
                              {prospect.initialPaymentAmount} {prospect.initialPaymentUnit || 'Lakh'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Mark Lost ── */}
                {!isWon && prospect.workflowStage !== 'LOST' && (
                  <div className="border-t border-stone-200/50 pt-2">
                    <button
                      type="button"
                      onClick={() => { const r = prompt('Enter reason for marking as lost:'); if (r?.trim()) handleUpdateStage('LOST', `Client lost. Reason: ${r}`); }}
                      className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer border-0"
                    >
                      Mark Lost
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Admin / Accounts Actions panel */}
            {(currentUser.role === 'Admin' || currentUser.role === 'Super Admin' || currentUser.role === 'Accounts') && stageRank(prospect.workflowStage) >= stageRank('CONTRACT_CREATED') && !isWon && (() => {
              const contract = prospect?.contracts?.[0];
              return (
                <div className="bg-blue-50/40 border border-blue-200/80 p-3 sm:p-5 rounded-xl sm:rounded-2xl space-y-2.5 shrink-0">
                  <h4 className="text-[12px] font-bold text-blue-800 uppercase tracking-wide border-b border-blue-200/50 pb-1.5 mb-2 flex items-center gap-1.5">
                    <ShieldCheck size={13} /> Admin Actions
                  </h4>

                  {/* Approve contract — Super Admin and Admin */}
                  {(currentUser.role === 'Super Admin' || currentUser.role === 'Admin') && contract && contract.status === 'PENDING' && contract.draftPdfUrl && (
                    <button type="button" onClick={handleApproveContract}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10.5px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer border-0">
                      <BadgeCheck size={12} /> Approve Contract
                    </button>
                  )}
                  {contract && contract.status !== 'PENDING' && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-[10.5px] text-emerald-700 font-semibold">
                      <Check size={12} />
                      Contract {contract.status.toLowerCase()} {contract.approvedBy?.name ? `by ${contract.approvedBy.name}` : ''}
                    </div>
                  )}

                  {/* Send contract email — Super Admin and Admin; once only; locked after payment */}
                  {(currentUser.role === 'Super Admin' || currentUser.role === 'Admin') && contract?.status === 'APPROVED' && stageRank(prospect.workflowStage) < stageRank('CONTRACT_EMAILED') && stageRank(prospect.workflowStage) < stageRank('INITIAL_PAYMENT_RECEIVED') && (
                    <button type="button" disabled={submittingContract || !prospect.email} onClick={handleSendContractEmail}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10.5px] font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors cursor-pointer border-0 disabled:opacity-50"
                      title={!prospect.email ? 'Client has no email.' : 'Send approved contract to client'}>
                      {submittingContract ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                      Send Contract Email
                    </button>
                  )}
                  {stageRank(prospect.workflowStage) >= stageRank('CONTRACT_EMAILED') && (
                    <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1.5 text-[10.5px] text-violet-700 font-semibold">
                      <Check size={12} /> Contract email sent to client
                    </div>
                  )}

                  {/* Verify by accounts → WON — Super Admin, Admin and Accounts */}
                  {(currentUser.role === 'Super Admin' || currentUser.role === 'Admin' || currentUser.role === 'Accounts') && stageRank(prospect.workflowStage) >= stageRank('INITIAL_PAYMENT_RECEIVED') && (
                    <div className="space-y-2 border border-emerald-200 rounded-xl p-3 bg-emerald-50/50">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Payment Verification</p>
                      {prospect.initialPaymentAmount ? (
                        <p className="text-[11px] text-emerald-700 font-semibold">
                          Sales logged: <span className="font-bold">{prospect.initialPaymentAmount} {prospect.initialPaymentUnit || 'Lakh'}</span>
                        </p>
                      ) : (
                        <p className="text-[10.5px] text-stone-400 italic">No amount logged by sales.</p>
                      )}
                      <p className="text-[10px] text-stone-500">Revise actual received amount (optional):</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max="99999999"
                          step="0.01"
                          placeholder={prospect.initialPaymentAmount ? String(prospect.initialPaymentAmount) : 'Amount'}
                          value={revisedPaymentAmount}
                          onChange={e => setRevisedPaymentAmount(e.target.value)}
                          className="flex-1 text-[11px] bg-white border border-[rgba(184,144,71,0.35)] text-stone-900 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#b89047] focus:ring-1 focus:ring-[rgba(184,144,71,0.2)] font-[inherit]"
                        />
                        <select
                          value={revisedPaymentUnit}
                          onChange={e => setRevisedPaymentUnit(e.target.value)}
                          className="w-16 text-[11px] bg-white border border-[rgba(184,144,71,0.35)] text-stone-900 rounded-lg px-1.5 py-1.5 outline-none focus:border-[#b89047] font-[inherit]"
                        >
                          <option value="LAKH">L</option>
                          <option value="CRORE">Cr</option>
                        </select>
                      </div>
                      <button type="button" onClick={handleVerifyByAccounts}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10.5px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors cursor-pointer border-0">
                        <ShieldCheck size={12} /> Verify & Mark Won
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Activities Timeline Log */}
            <div className="flex-1 flex flex-col min-h-0 bg-stone-50/40 border border-stone-200/80 p-5 rounded-2xl">
              <h4 className="text-[12px] font-bold text-[#9e7735] uppercase tracking-wide border-b border-stone-200/50 pb-1.5 mb-3 shrink-0">
                Requirement Activity History Log
              </h4>
              {loadingFollowUps ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 flex-1">
                  <RefreshCw size={14} className="animate-spin text-[#b89047]" />
                  <span className="text-[10px] text-stone-400 font-medium">Loading timeline...</span>
                </div>
              ) : followUps.length === 0 ? (
                <div className="text-center py-6 text-[11px] text-stone-455 italic flex-1 flex items-center justify-center">
                  No client follow-ups or meetings logged yet.
                </div>
              ) : (
                <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1 flex-1 scrollbar-thin">
                  {followUps.map((log: any) => (
                    <div key={log.id} className="relative pl-4 border-l-2 border-[rgba(184,144,71,0.3)] pb-3">
                      <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#9e7735]" />
                      <div className="flex items-center justify-between">
                        <span className={`text-[10.5px] font-bold uppercase tracking-wider ${workflowStageBadgeClasses[log.stage] || 'text-stone-600'}`}>
                          {log.stage.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[9.5px] text-stone-400 font-semibold">
                          {new Date(log.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-stone-700 font-semibold mt-1.5 leading-relaxed whitespace-pre-line">
                        {log.notes}
                      </p>
                      {log.attachmentUrl && (
                        <div className="mt-1.5">
                          <a 
                            href={`${BACKEND_BASE}${log.attachmentUrl}`}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b89047] hover:text-[#9e7735] hover:underline"
                          >
                            <FileText size={11} /> View Attachment ({log.attachmentName || 'Proposal PDF'})
                          </a>
                        </div>
                      )}
                      <div className="text-[9px] text-stone-400 mt-1 font-semibold">
                        Logged by: <span className="text-stone-550 font-bold">{log.loggedBy?.name || 'Sales Representative'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Log Follow-Up Modal ── */}
      {showLogFollowUpModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs" onClick={() => setShowLogFollowUpModal(false)}>
          <div className="animate-scale-in w-full max-w-[480px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-[var(--text-primary)]">
                <ClipboardList size={16} className="text-[#b89047]" /> Log Activity / Meeting
              </h3>
              <button onClick={() => setShowLogFollowUpModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLogFollowUp} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className={labelBase}>Type</label>
                  <SearchableSelect
                    options={[
                      { value: 'meeting', label: 'Meeting' },
                      { value: 'follow up', label: 'Follow Up' },
                    ]}
                    value={activityType}
                    onChange={(val) => {
                      setActivityType(val);
                      setActivitySubtype(val === 'meeting' ? 'offline' : 'In general Follow up');
                    }}
                  />
                </div>

                <div className="flex-1 flex flex-col gap-1.5">
                  <label className={labelBase}>Subtype</label>
                  <SearchableSelect
                    options={
                      activityType === 'meeting'
                        ? [
                            { value: 'offline', label: 'Offline' },
                            { value: 'online', label: 'Online' },
                          ]
                        : [
                            { value: 'In general Follow up', label: 'In general Follow up' },
                            { value: 'Negociation Follow Up', label: 'Negociation Follow Up' },
                            { value: 'On call', label: 'On call' },
                            { value: 'Offline', label: 'Offline' },
                          ]
                    }
                    value={activitySubtype}
                    onChange={setActivitySubtype}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Activity / Discussion Notes *</label>
                <textarea
                  rows={4}
                  required
                  value={followUpNotes}
                  onChange={e => setFollowUpNotes(e.target.value)}
                  placeholder="Enter details of meeting discussion, client inputs, or follow-up feedback..."
                  className={`${inputBase} h-28 resize-none`}
                />
              </div>


              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowLogFollowUpModal(false)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                <button type="submit" disabled={submitting} className={`${btnPrimary} flex-1 justify-center`}>
                  {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  {submitting ? 'Logging…' : 'Log Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Send Proposal Modal ── */}
      {showSendProposalModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs" onClick={() => setShowSendProposalModal(false)}>
          <div className="animate-scale-in w-full max-w-[540px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-[var(--text-primary)]">
                <Mail size={16} className="text-[#b89047]" /> Send Proposal Email
              </h3>
              <button onClick={() => setShowSendProposalModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendProposal} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Recipient Email</label>
                <input
                  type="text"
                  disabled
                  value={prospect.email || 'No email specified (please edit client brief first)'}
                  className="w-full bg-stone-100 text-stone-500 text-[13px] rounded-lg px-3.5 py-1.5 outline-none cursor-not-allowed compact-input border border-stone-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Email Subject *</label>
                <input
                  type="text"
                  required
                  value={proposalSubject}
                  onChange={e => setProposalSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className={inputBase}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Email Message Body *</label>
                <textarea
                  rows={6}
                  required
                  value={proposalBody}
                  onChange={e => setProposalBody(e.target.value)}
                  placeholder="Write your email body message to the client..."
                  className={`${inputBase} h-36 resize-none`}
                />
              </div>

              {renderFileUploadField('Upload Proposal Document (PDF, max 10MB) *', 'proposalFileUrl', proposalFileUrl || '', (url) => {
                setProposalFileUrl(url);
                if (url) {
                  const name = url.split('/').pop() || 'proposal.pdf';
                  setProposalFileName(name);
                } else {
                  setProposalFileName(null);
                }
              }, 10)}

              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowSendProposalModal(false)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                <button type="submit" disabled={sendingProposal || !prospect.email || !proposalFileUrl} className={`${btnPrimary} flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none`}>
                  {sendingProposal ? <RefreshCw size={13} className="animate-spin" /> : <Mail size={13} />}
                  {sendingProposal ? 'Sending…' : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Request Site Details Modal ── */}
      {showRequestSiteDetailsModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs" onClick={() => setShowRequestSiteDetailsModal(false)}>
          <div className="animate-scale-in w-full max-w-[540px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-[var(--text-primary)]">
                <Mail size={16} className="text-[#b89047]" /> Request Site Details (Email)
              </h3>
              <button onClick={() => setShowRequestSiteDetailsModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRequestSiteDetails} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Recipient Email</label>
                <input
                  type="text"
                  disabled
                  value={prospect.email || 'No email specified (please edit client brief first)'}
                  className="w-full bg-stone-100 text-stone-500 text-[13px] rounded-lg px-3.5 py-1.5 outline-none cursor-not-allowed compact-input border border-stone-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Email Subject *</label>
                <input
                  type="text"
                  required
                  value={siteRequestSubject}
                  onChange={e => setSiteRequestSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className={inputBase}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Email Message Body *</label>
                <textarea
                  rows={6}
                  required
                  value={siteRequestBody}
                  onChange={e => setSiteRequestBody(e.target.value)}
                  placeholder="Write your email request message..."
                  className={`${inputBase} h-36 resize-none`}
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowRequestSiteDetailsModal(false)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                <button type="submit" disabled={sendingSiteRequest || !prospect.email} className={`${btnPrimary} flex-1 justify-center`}>
                  {sendingSiteRequest ? <RefreshCw size={13} className="animate-spin" /> : <Mail size={13} />}
                  {sendingSiteRequest ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Upload Site Details Modal ── */}
      {showUploadSiteDetailsModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs" onClick={() => setShowUploadSiteDetailsModal(false)}>
          <div className="animate-scale-in w-full max-w-[480px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-[var(--text-primary)]">
                <MapPin size={16} className="text-[#b89047]" /> Upload Site Details & Coordinates
              </h3>
              <button onClick={() => setShowUploadSiteDetailsModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadSiteDetails} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Google Maps Share Link *</label>
                <input
                  type="url"
                  required
                  value={siteGoogleMapsLinkInput}
                  onChange={e => setSiteGoogleMapsLinkInput(e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className={inputBase}
                />
                <p className="text-[10px] text-stone-400 leading-tight">
                  Open Google Maps → find the site → tap Share → copy the link and paste here.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowUploadSiteDetailsModal(false)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                <button type="submit" disabled={uploadingSiteDetails || !siteGoogleMapsLinkInput.trim()} className={`${btnPrimary} flex-1 justify-center`}>
                  {uploadingSiteDetails ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  {uploadingSiteDetails ? 'Saving…' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Send Meeting Invite Modal ── */}
      {showMeetingInviteModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs" onClick={() => setShowMeetingInviteModal(false)}>
          <div className="animate-scale-in w-full max-w-[500px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-[var(--text-primary)]">
                <Mail size={16} className="text-[#b89047]" /> Send Meeting Invite
              </h3>
              <button onClick={() => setShowMeetingInviteModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendMeetingInvite} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Recipient</label>
                <input type="text" disabled value={prospect.email || 'No email — update client profile first'}
                  className="w-full bg-stone-100 text-stone-500 text-[13px] rounded-lg px-3.5 py-1.5 outline-none cursor-not-allowed border border-stone-200" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Meeting Type *</label>
                <div className="flex gap-2">
                  {(['ONLINE', 'OFFLINE'] as const).map(type => (
                    <button key={type} type="button" onClick={() => setMeetingType(type)}
                      className={`flex-1 py-2.5 rounded-lg border text-[12px] font-bold transition-all cursor-pointer ${meetingType === type ? 'bg-[#b89047] border-[#b89047] text-white shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                      <span className="inline-flex items-center gap-1.5">
                        {type === 'ONLINE' ? <Video size={13} /> : <Users size={13} />}
                        {type === 'ONLINE' ? 'Online (Video Call)' : 'Offline (In-Person)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Meeting Date & Time *</label>
                <input type="datetime-local" required value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  className={inputBase} />
              </div>

              {meetingType === 'ONLINE' && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelBase}>Meeting Link</label>
                  <input type="url" value={meetingLink} onChange={e => setMeetingLink(e.target.value)}
                    placeholder="Leave blank to auto-generate a Jitsi link"
                    className={inputBase} />
                  <p className="text-[10.5px] text-[var(--text-muted)] italic">
                    A meeting link will be auto-generated and sent to the client if left blank.
                  </p>
                  {meetingLink && (
                    <a href={meetingLink} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] font-bold text-[#b89047] hover:underline self-start">
                      Test link ↗
                    </a>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Notes (Optional)</label>
                <textarea rows={3} value={meetingNotes} onChange={e => setMeetingNotes(e.target.value)}
                  placeholder="Agenda, location address, preparation notes..."
                  className={`${inputBase} resize-none`} />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowMeetingInviteModal(false)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                <button type="submit" disabled={sendingMeetingInvite || !prospect.email || !meetingDate} className={`${btnPrimary} flex-1 justify-center`}>
                  {sendingMeetingInvite ? <RefreshCw size={13} className="animate-spin" /> : <Mail size={13} />}
                  {sendingMeetingInvite ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Initial Payment Modal ── */}
      {showInitialPaymentModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs" onClick={() => setShowInitialPaymentModal(false)}>
          <div className="animate-scale-in w-full max-w-[480px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-[var(--text-primary)]">
                <DollarSign size={16} className="text-[#b89047]" /> Record Initial Payment
              </h3>
              <button onClick={() => setShowInitialPaymentModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordInitialPayment} className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className={labelBase}>Amount</label>
                  <input
                    type="number"
                    min="0"
                    max="99999999"
                    step="0.01"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 5"
                    className={inputBase}
                  />
                </div>
                <div className="w-28 flex flex-col gap-1.5">
                  <label className={labelBase}>Unit</label>
                  <select value={paymentUnit} onChange={e => setPaymentUnit(e.target.value)} className={inputBase}>
                    <option value="LAKH">Lakh</option>
                    <option value="CRORE">Crore</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Notes / Description *</label>
                <textarea
                  rows={3}
                  required
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Initial advance payment for Architectural Consultation received via NEFT..."
                  className={`${inputBase} resize-none`}
                />
              </div>

              {/* Supporting doc upload */}
              <div className="flex flex-col gap-1.5 bg-stone-50/40 p-3 rounded-xl border border-dashed border-stone-200">
                <label className={labelBase}>Supporting Document (PDF, max 10MB)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const ext = file.name.split('.').pop()?.toLowerCase();
                    const uniqueName = `payment_${prospectId}_${Date.now()}.${ext}`;
                    const formData = new FormData();
                    formData.append('file', file, uniqueName);
                    setUploadingFiles(p => ({ ...p, paymentDoc: true }));
                    try {
                      const res = await contractApi.uploadFile(formData);
                      setPaymentDocUrl(res.data.fileUrl);
                      setPaymentDocName(uniqueName);
                    } catch {
                      showToast('Document upload failed.', 'error');
                    } finally {
                      setUploadingFiles(p => ({ ...p, paymentDoc: false }));
                      e.target.value = '';
                    }
                  }}
                  disabled={uploadingFiles['paymentDoc'] || !!paymentDocUrl}
                  className="text-[12px] text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11.5px] file:font-semibold file:bg-amber-50 file:text-[#af926a] file:hover:bg-amber-100 cursor-pointer disabled:opacity-50"
                />
                {uploadingFiles['paymentDoc'] && <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1"><RefreshCw size={11} className="animate-spin" /> Uploading…</span>}
                {paymentDocUrl && (
                  <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-150">
                    <Check size={12} /> Document uploaded
                    <a href={fileUrl(paymentDocUrl)} target="_blank" rel="noopener noreferrer" className="ml-auto text-amber-600 hover:underline font-bold">View</a>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowInitialPaymentModal(false)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                <button type="submit" disabled={submitting || !paymentNotes.trim() || !paymentDocUrl} className={`${btnPrimary} flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none`}>
                  {submitting ? <RefreshCw size={13} className="animate-spin" /> : <DollarSign size={13} />}
                  {submitting ? 'Recording…' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
