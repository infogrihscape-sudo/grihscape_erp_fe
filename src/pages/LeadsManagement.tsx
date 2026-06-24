import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../context/ToastContext.js';
import { leadApi, prospectApi } from '../services/api.js';
import type { User } from '../context/AuthContext.js';
import { SearchableSelect } from '../components/SearchableSelect.js';
import { ProspectForm } from '../components/ProspectForm.js';
import type { ProspectFormData } from '../components/ProspectForm.js';
import { useRouter } from '../context/RouterContext.js';
import * as XLSX from 'xlsx';
import {
  Search, Plus, Upload, Download, Trash2, Phone,
  FileText, CheckCircle2, ChevronLeft, ChevronRight, X, AlertTriangle,
  AlertCircle, RefreshCw, Database, PlusCircle, Filter, Check,
  ClipboardList,
} from 'lucide-react';
import { ShimmerTable } from '../components/Shimmer.js';

const LEAD_RESPONSE_OPTIONS = [
  { value: 'NOT_ANSWERED',   label: 'Not Answered' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'INVALID_NUMBER', label: 'Invalid Number' },
  { value: 'VENDOR',         label: 'Vendor' },
  { value: 'JOB_CANDIDATE',  label: 'Job Candidate' },
  { value: 'CONTRACTOR',     label: 'Contractor' },
];

const leadResponseLabel: Record<string, string> = Object.fromEntries(
  LEAD_RESPONSE_OPTIONS.map(o => [o.value, o.label])
);

const leadResponseColor: Record<string, string> = {
  NOT_ANSWERED:   'text-amber-600',
  NOT_INTERESTED: 'text-rose-600',
  INVALID_NUMBER: 'text-red-700',
  VENDOR:         'text-violet-600',
  JOB_CANDIDATE:  'text-sky-600',
  CONTRACTOR:     'text-teal-600',
};

interface Lead {
  id: string;
  adsetName?: string | null;
  adName?: string | null;
  campaignName?: string | null;
  platform?: string | null;
  services: string[];
  fullName: string;
  phoneNumber: string;
  city?: string | null;
  source: 'manual' | 'bulk';
  leadResponse?: string | null;
  isDuplicate30Days?: boolean;
  createdAt: string;
}

interface UploadedLead {
  srNo: string | number;
  fullName: string;
  phoneNumber: string;
  city?: string;
  campaignName: string;
  adsetName: string;
  adName: string;
  platform: string;
  services: string[];
  errors: string[];
  isDbDuplicate: boolean;
  isLocalDuplicate: boolean;
}

interface Props {
  currentUser: User;
}

const ITEMS_PER_PAGE = 10;

const serviceLabels: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Architectural Consultation',
  INTERIOR_DESIGN: 'Interior Design',
  PMC: 'PMC',
  TURNKEY_CONSTRUCTION: 'Turnkey Construction',
  INTERIOR_EXECUTION: 'Interior Execution',
  RENOVATION: 'Renovation',
  END_TO_END: 'End-to-End Solution',
};

const PLATFORM_SOURCE_OPTIONS = [
  { value: 'INSTAGRAM',       label: 'Instagram' },
  { value: 'META_FACEBOOK',   label: 'Meta / Facebook' },
  { value: 'WHATSAPP',        label: 'WhatsApp' },
  { value: 'JUST_DIAL',       label: 'Just Dial' },
  { value: 'REFERENCE',       label: 'Reference' },
  { value: 'WALK_IN',         label: 'Walk-In' },
  { value: 'REPEATED_CLIENT', label: 'Repeated Client' },
  { value: 'EMAIL',           label: 'Email' },
  { value: 'OTHER',           label: 'Other' },
];
const platformLabel: Record<string, string> = Object.fromEntries(
  PLATFORM_SOURCE_OPTIONS.map(o => [o.value, o.label])
);

const matchServiceKey = (rawService: string): string | null => {
  const clean = rawService.trim().toUpperCase().replace(/[\s\-]/g, '_');
  
  if (serviceLabels[clean]) return clean;
  
  const validKeys = Object.keys(serviceLabels);
  for (const key of validKeys) {
    if (clean.includes(key) || key.includes(clean)) {
      return key;
    }
  }
  
  const cleanWords = clean.split('_').filter(w => w !== 'SERVICES' && w !== 'SERVICE');
  if (cleanWords.length > 0) {
    const joinedClean = cleanWords.join('_');
    for (const key of validKeys) {
      const keyWords = key.split('_').filter(w => w !== 'SERVICES' && w !== 'SERVICE');
      const joinedKey = keyWords.join('_');
      if (joinedClean.includes(joinedKey) || joinedKey.includes(joinedClean)) {
        return key;
      }
    }
  }
  
  return null;
};

const normalizeAndValidatePhone = (phone: string): { isValid: boolean; normalized: string } => {
  let clean = phone.trim().replace(/\D/g, '');
  
  if (clean.length === 12 && clean.startsWith('91')) {
    clean = clean.slice(2);
  } else if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.slice(1);
  }
  
  const isValid = clean.length === 10 && /^[6-9]/.test(clean);
  return { isValid, normalized: isValid ? `+91${clean}` : phone };
};

/* â"€â"€ Shared tailwind classes â"€â"€ */
const inputBase = 'w-full bg-[var(--input-bg)] border border-[rgba(184,144,71,0.38)] text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-1.5 outline-none transition focus:border-[#b89047] focus:ring-2 focus:ring-amber-100/50 font-[inherit] compact-input';
const labelBase = 'text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]';
const btnPrimary = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0';
const btnSecondary = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--hover-bg)] border border-[rgba(184,144,71,0.28)] hover:opacity-80 hover:text-[var(--text-primary)] transition-colors duration-150 cursor-pointer';
const card = 'bg-[var(--card-bg)] border border-[rgba(184,144,71,0.24)] rounded-xl shadow-xs';

export const LeadsManagement: React.FC<Props> = ({ currentUser }) => {
  const { showToast } = useToast();
  const { navigate } = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nav Tabs: 'directory' | 'bulk'
  const [activeTab, setActiveTab] = useState<'directory' | 'bulk'>('directory');

  // Leads list
  const [leads, setLeads] = useState<Lead[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('leads-search') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterPlatform, setFilterPlatform] = useState('ALL');
  const [filterService, setFilterService] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterDate, setFilterDate] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (filterDate !== 'CUSTOM') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  }, [filterDate]);

  // Side Drawer for Single Manual Ingestion
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [adsetName, setAdsetName] = useState('');
  const [adName, setAdName] = useState('');
  const [platform, setPlatform] = useState('META_FACEBOOK');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Real-time duplicate detection for manual form
  const [manualFormDuplicateWarning, setManualFormDuplicateWarning] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  useEffect(() => {
    const check = normalizeAndValidatePhone(phoneNumber);
    if (!check.isValid) {
      setManualFormDuplicateWarning(false);
      return;
    }
    const timeout = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const res = await leadApi.validateLeads([check.normalized]);
        setManualFormDuplicateWarning((res.data?.duplicates || []).length > 0);
      } catch {
        setManualFormDuplicateWarning(false);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [phoneNumber]);

  // Real-time validation & helper states
  const isFormValid = useMemo(() => {
    const isNameValid = fullName.trim().length >= 2;
    const isPhoneValid = normalizeAndValidatePhone(phoneNumber).isValid;
    const isServicesValid = selectedServices.length > 0;
    const isCampaignValid = campaignName.trim().length > 0;
    const isAdsetValid = adsetName.trim().length > 0;
    const isAdNameValid = adName.trim().length > 0;
    return isNameValid && isPhoneValid && isServicesValid && isCampaignValid && isAdsetValid && isAdNameValid;
  }, [fullName, phoneNumber, selectedServices, campaignName, adsetName, adName]);

  const phoneHint = useMemo(() => {
    if (!phoneNumber) return '';
    const check = normalizeAndValidatePhone(phoneNumber);
    if (!check.isValid) return 'Phone number must be exactly 10 digits.';
    return '';
  }, [phoneNumber]);

  const nameHint = useMemo(() => {
    if (!fullName) return '';
    if (fullName.trim().length < 2) return 'Must be at least 2 characters';
    return '';
  }, [fullName]);

  const hasActiveFilters = searchTerm !== '' || filterPlatform !== 'ALL' || filterService !== 'ALL' || filterSource !== 'ALL' || filterDate !== 'ALL';

  // â"€â"€ Lead â†’ Prospect conversion â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [convertSubmitting, setConvertSubmitting] = useState(false);

  const platformToSourceType = (platform?: string | null): string => {
    if (platform && platformLabel[platform]) return platform;
    const legacyMap: Record<string, string> = {
      Instagram: 'INSTAGRAM', Meta: 'META_FACEBOOK', Referral: 'REFERENCE',
      Google: 'OTHER', LinkedIn: 'OTHER', YouTube: 'OTHER', Organic: 'OTHER', Other: 'OTHER',
    };
    return legacyMap[platform || ''] || 'OTHER';
  };

  const leadToProspectInitialData = (lead: Lead) => ({
    clientName: lead.fullName,
    mobileNo: lead.phoneNumber.replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(-10),
    locality: lead.city || '',
    serviceType: lead.services.join(','),
    preferredCommunication: 'PHONE_CALL',
    sourceType: platformToSourceType(lead.platform),
    sourceCustom: null,
    status: 'ACTIVE',
  });

  const handleConvertSubmit = async (data: ProspectFormData) => {
    setConvertSubmitting(true);
    try {
      await prospectApi.createProspect(data);
      showToast('Client brief captured and linked successfully.', 'success');
      setConvertingLead(null);
      fetchLeads(); // refresh so the services badge and action button update immediately
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create prospect brief.';
      showToast(msg, 'error');
      throw err;
    } finally {
      setConvertSubmitting(false);
    }
  };

  // Lead response update
  const [updatingResponseId, setUpdatingResponseId] = useState<string | null>(null);

  const handleUpdateLeadResponse = async (leadId: string, response: string | null) => {
    setUpdatingResponseId(leadId);
    try {
      await leadApi.updateLeadResponse(leadId, response);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, leadResponse: response } : l));
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update lead response.', 'error');
    } finally {
      setUpdatingResponseId(null);
    }
  };

  // Bulk Ingestion states
  const [isDragging, setIsDragging] = useState(false);
  const [previewLeads, setPreviewLeads] = useState<UploadedLead[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await leadApi.getLeads();
      setLeads(res.data.leads || []);
      const prosRes = await prospectApi.getProspects();
      setProspects(prosRes.data.prospects || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load leads.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    const savedSearch = localStorage.getItem('leads-search');
    if (savedSearch) {
      localStorage.removeItem('leads-search');
    }
  }, []);

  // Form input field reference for autofocus
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isDrawerOpen && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 150);
    }
  }, [isDrawerOpen]);

  const handleOpenDrawer = () => {
    resetForm();
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const resetForm = () => {
    setFullName('');
    setPhoneNumber('');
    setCity('');
    setCampaignName('');
    setAdsetName('');
    setAdName('');
    setPlatform('Meta');
    setSelectedServices([]);
    setFormErrors({});
  };

  const handleServiceToggle = (serviceKey: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceKey)
        ? prev.filter((s) => s !== serviceKey)
        : [...prev, serviceKey]
    );
    if (formErrors.services) {
      setFormErrors((prev) => ({ ...prev, services: '' }));
    }
  };

  const validateManualForm = () => {
    const errors: Record<string, string> = {};
    
    if (!fullName.trim()) {
      errors.fullName = 'Full Name is required';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Full Name must be at least 2 characters';
    }

    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Phone Number is required';
    } else {
      const check = normalizeAndValidatePhone(phoneNumber);
      if (!check.isValid) {
        errors.phoneNumber = 'Phone number must be exactly 10 digits.';
      }
    }

    if (selectedServices.length === 0) {
      errors.services = 'Select at least one service';
    }

    if (!campaignName.trim()) errors.campaignName = 'Campaign Name is required';
    if (!adsetName.trim()) errors.adsetName = 'Adset Name is required';
    if (!adName.trim()) errors.adName = 'Ad Name is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateManualForm()) return;

    setSubmitting(true);
    try {
      const normalizedPhone = normalizeAndValidatePhone(phoneNumber).normalized;
      
      const payload = {
        fullName: fullName.trim(),
        phoneNumber: normalizedPhone,
        city: city.trim() || null,
        campaignName: campaignName.trim() || null,
        adsetName: adsetName.trim() || null,
        adName: adName.trim() || null,
        platform,
        services: selectedServices,
      };

      await leadApi.createLead(payload);
      showToast('Lead captured successfully.', 'success');
      setIsDrawerOpen(false);
      resetForm();
      fetchLeads();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to capture lead.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // â"€â"€ Bulk Upload Logic â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const downloadTemplate = () => {
    const headers = ['sr.no', 'adset_name', 'ad_name', 'campaign_name', 'platform', 'services', 'full_name', 'phone_number', 'city'];
    const sampleRow = ['1', 'Adset Summer Special', 'Static Image Ad', 'Interior Renovations 2026', 'Meta', 'INTERIOR_DESIGN_SERVICES,RENOVATION', 'Gopal Sharma', '9876543210', 'Gurgaon'];
    const csvContent = '\uFEFF' + [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'leads_bulk_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sample template downloaded.', 'success');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndParseFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndParseFile(file);
    }
  };

  const validateAndParseFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls' && extension !== 'csv') {
      showToast('Unsupported file type. Please upload an Excel (.xlsx/.xls) or CSV (.csv) file.', 'error');
      return;
    }
    setSelectedFileName(file.name);
    parseFile(file);
  };

  const parseFile = (file: File) => {
    setIsValidating(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<any>(worksheet);
        
        if (rawJson.length === 0) {
          showToast('The uploaded sheet does not contain any data rows.', 'error');
          setPreviewLeads([]);
          setIsValidating(false);
          return;
        }

        await processUploadedData(rawJson);
      } catch (err) {
        console.error(err);
        showToast('Failed to parse spreadsheet file.', 'error');
        setPreviewLeads([]);
      } finally {
        setIsValidating(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processUploadedData = async (rawData: any[]) => {
    // 1. Map columns (casing-insensitive)
    const mapped: UploadedLead[] = rawData.map((row, idx) => {
      const keys = Object.keys(row);
      const findVal = (names: string[]) => {
        const matchingKey = keys.find(k => names.includes(k.toLowerCase().trim()));
        return matchingKey ? String(row[matchingKey]).trim() : '';
      };

      const srNo = findVal(['sr.no', 'sr_no', 'sr. no', 'sr no', 'sno', 'sn']) || (idx + 1);
      const fullName = findVal(['full_name', 'fullname', 'full name', 'name']);
      const phoneNumber = findVal(['phone_number', 'phonenumber', 'phone number', 'phone', 'mobile_no', 'mobile']);
      const city = findVal(['city', 'town', 'location']);
      const campaignName = findVal(['campaign_name', 'campaignname', 'campaign name', 'campaign']);
      const adsetName = findVal(['adset_name', 'adsetname', 'adset name', 'adset']);
      const adName = findVal(['ad_name', 'adname', 'ad name', 'ad']);
      const platformRaw = findVal(['platform']);
      const servicesRaw = findVal(['services', 'service', 'service_type', 'servicetype']);

      const services = servicesRaw
        ? servicesRaw.split(/[\,\;]/).map(s => {
            const raw = s.trim().toUpperCase();
            return matchServiceKey(raw) || raw;
          }).filter(Boolean)
        : [];

      return {
        srNo,
        fullName,
        phoneNumber,
        city,
        campaignName,
        adsetName,
        adName,
        platform: platformRaw,
        services,
        errors: [],
        isDbDuplicate: false,
        isLocalDuplicate: false,
      };
    });

    // 2. Identify local duplicates within the file itself
    const seenPhones = new Map<string, number>();
    mapped.forEach((item) => {
      if (!item.phoneNumber) return;
      const cleanPhone = normalizeAndValidatePhone(item.phoneNumber).normalized;
      seenPhones.set(cleanPhone, (seenPhones.get(cleanPhone) || 0) + 1);
    });

    // 3. Query backend to find database duplicates
    const allPhones = mapped.map(item => item.phoneNumber).filter(Boolean);
    let dbDupes = new Set<string>();
    if (allPhones.length > 0) {
      try {
        const valRes = await leadApi.validateLeads(allPhones);
        if (valRes.data && valRes.data.duplicates) {
          dbDupes = new Set<string>(valRes.data.duplicates);
        }
      } catch (err) {
        console.error('Failed to validate database duplicates', err);
      }
    }

    // 4. Perform complete validation on every row
    const validated = mapped.map((item) => {
      const errors: string[] = [];
      const cleanPhoneObj = normalizeAndValidatePhone(item.phoneNumber);

      // Validate name
      if (!item.fullName) {
        errors.push('Full Name is required');
      }

      // Validate phone
      if (!item.phoneNumber) {
        errors.push('Phone number is required');
      } else if (!cleanPhoneObj.isValid) {
        errors.push('Phone number must be exactly 10 digits.');
      } else {
        // Check local duplicate
        if ((seenPhones.get(cleanPhoneObj.normalized) || 0) > 1) {
          item.isLocalDuplicate = true;
        }
        // Check db duplicate
        if (dbDupes.has(item.phoneNumber)) {
          item.isDbDuplicate = true;
        }
      }

      // Validate services
      if (item.services.length === 0) {
        errors.push('At least one service is required');
      } else {
        const invalidServices = item.services.filter(s => !serviceLabels[s]);
        if (invalidServices.length > 0) {
          errors.push(`Invalid services: ${invalidServices.join(', ')}. Allowed: ${Object.keys(serviceLabels).join(', ')}`);
        }
      }

      // Map platform string from CSV to enum key
      let matchedPlatform = item.platform;
      if (item.platform) {
        const pLower = item.platform.toLowerCase().replace(/[\s\-]/g, '_');
        const bulkMap: Record<string, string> = {
          instagram: 'INSTAGRAM', meta: 'META_FACEBOOK', meta_facebook: 'META_FACEBOOK',
          facebook: 'META_FACEBOOK', whatsapp: 'WHATSAPP', just_dial: 'JUST_DIAL',
          justdial: 'JUST_DIAL', reference: 'REFERENCE', referral: 'REFERENCE',
          walk_in: 'WALK_IN', walkin: 'WALK_IN', repeated_client: 'REPEATED_CLIENT',
          repeated: 'REPEATED_CLIENT', email: 'EMAIL', other: 'OTHER',
          google: 'OTHER', linkedin: 'OTHER', youtube: 'OTHER', organic: 'OTHER',
        };
        matchedPlatform = bulkMap[pLower] || 'OTHER';
      } else {
        matchedPlatform = 'OTHER';
      }

      return {
        ...item,
        platform: matchedPlatform,
        errors,
      };
    });

    setPreviewLeads(validated);
  };

  const bulkStats = useMemo(() => {
    const total = previewLeads.length;
    const invalid = previewLeads.filter(l => l.errors.length > 0).length;
    const valid = total - invalid;
    return { total, valid, invalid };
  }, [previewLeads]);

  const handleDownloadErrorReport = () => {
    const invalidLeads = previewLeads.filter(l => l.errors.length > 0);
    if (invalidLeads.length === 0) {
      showToast('No invalid rows exist to report.', 'error');
      return;
    }

    const headers = ['sr.no', 'full_name', 'phone_number', 'city', 'platform', 'services', 'campaign_name', 'adset_name', 'ad_name', 'error_details'];
    const rows = invalidLeads.map(l => [
      l.srNo,
      `"${l.fullName.replace(/"/g, '""')}"`,
      l.phoneNumber,
      l.city || '',
      l.platform,
      `"${l.services.join(', ')}"`,
      `"${l.campaignName.replace(/"/g, '""')}"`,
      `"${l.adsetName.replace(/"/g, '""')}"`,
      `"${l.adName.replace(/"/g, '""')}"`,
      `"${l.errors.join(' | ').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_error_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Error report downloaded successfully.', 'success');
  };

  const handleClearIngestion = () => {
    setPreviewLeads([]);
    setSelectedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitBulkLeads = async () => {
    const validLeads = previewLeads.filter(l => l.errors.length === 0);
    if (validLeads.length === 0) {
      showToast('There are no valid leads to submit.', 'error');
      return;
    }

    setBulkUploading(true);
    try {
      const payload = validLeads.map((l) => ({
        fullName: l.fullName,
        phoneNumber: normalizeAndValidatePhone(l.phoneNumber).normalized,
        city: l.city || null,
        campaignName: l.campaignName || null,
        adsetName: l.adsetName || null,
        adName: l.adName || null,
        platform: l.platform,
        services: l.services,
      }));

      const res = await leadApi.bulkUploadLeads(payload);
      showToast(res.data.message || 'Leads uploaded successfully.', 'success');
      
      // Filter out successfully uploaded ones, keep only invalid rows in the preview
      const remainingInvalid = previewLeads.filter(l => l.errors.length > 0);
      setPreviewLeads(remainingInvalid);
      if (remainingInvalid.length === 0) {
        setSelectedFileName(null);
        setActiveTab('directory');
      }
      fetchLeads();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to bulk import leads.';
      showToast(msg, 'error');
    } finally {
      setBulkUploading(false);
    }
  };

  // â"€â"€ Filter & Pagination Directory â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const prospectMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of prospects) {
      const phone = p.mobileNo.replace(/[^0-9]/g, '').slice(-10);
      if (phone) {
        map[phone] = p;
      }
    }
    return map;
  }, [prospects]);

  const uniquePlatforms = useMemo(() => {
    const list = leads.map(l => l.platform).filter((p): p is string => !!p);
    return ['ALL', ...Array.from(new Set(list))];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        !searchTerm.trim() ||
        l.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.phoneNumber.includes(searchTerm) ||
        (l.campaignName && l.campaignName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.adsetName && l.adsetName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.adName && l.adName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.platform && l.platform.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPlatform = filterPlatform === 'ALL' || l.platform === filterPlatform;

      const matchesService =
        filterService === 'ALL' ||
        (l.services && l.services.includes(filterService));

      const matchesSource = filterSource === 'ALL' || l.source === filterSource;

      let matchesDate = true;
      if (filterDate !== 'ALL') {
        const leadDate = new Date(l.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filterDate === 'TODAY') {
          matchesDate = leadDate >= today;
        } else if (filterDate === 'YESTERDAY') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          matchesDate = leadDate >= yesterday && leadDate < today;
        } else if (filterDate === 'LAST_7_DAYS') {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          matchesDate = leadDate >= sevenDaysAgo;
        } else if (filterDate === 'LAST_30_DAYS') {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          matchesDate = leadDate >= thirtyDaysAgo;
        } else if (filterDate === 'CUSTOM') {
          const start = customStartDate ? new Date(customStartDate) : null;
          if (start) start.setHours(0, 0, 0, 0);
          
          const end = customEndDate ? new Date(customEndDate) : null;
          if (end) end.setHours(23, 59, 59, 999);

          if (start && end) {
            matchesDate = leadDate >= start && leadDate <= end;
          } else if (start) {
            matchesDate = leadDate >= start;
          } else if (end) {
            matchesDate = leadDate <= end;
          }
        }
      }

      return matchesSearch && matchesPlatform && matchesService && matchesSource && matchesDate;
    });
  }, [leads, searchTerm, filterPlatform, filterService, filterSource, filterDate, customStartDate, customEndDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPlatform, filterService, filterSource, filterDate, customStartDate, customEndDate]);

  const indexStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = useMemo(() => {
    return filteredLeads.slice(indexStart, indexStart + ITEMS_PER_PAGE);
  }, [filteredLeads, indexStart]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredLeads.length / ITEMS_PER_PAGE) || 1;
  }, [filteredLeads]);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  return (
    <>
    <div className="animate-fade-in w-full h-full flex flex-col gap-4 min-h-0 overflow-hidden relative">
      
      {/* Actions Bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(197,168,128,0.15)] pb-3">
        <span className="text-[11.5px] text-[var(--text-muted)] font-medium">
          Operator: <strong className="text-[var(--text-primary)]">{currentUser.name}</strong>
        </span>

        <div className="flex items-center gap-2">
          {currentUser.role === 'Sales & Marketing' && (
            <button
              onClick={handleOpenDrawer}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#8f6d2e] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0"
            >
              <Plus className="w-4 h-4" /> Add Lead
            </button>
          )}

          {/* <button
            onClick={() => {
              setActiveTab('bulk');
              handleClearIngestion();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--hover-bg)] border border-[rgba(184,144,71,0.25)] hover:opacity-80 hover:text-[var(--text-primary)] transition-colors duration-150 cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Upload Excel
          </button> */}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] shrink-0">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'directory'
              ? 'border-[#b89047] text-[#7e5a20] bg-[#b89047]/5'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]/50'
          }`}
        >
          Active Leads Directory ({leads.length})
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'bulk'
              ? 'border-[#b89047] text-[#7e5a20] bg-[#b89047]/5'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]/50'
          }`}
        >
          Bulk Ingestion Hub
        </button>
      </div>

      {/* â"€â"€ Active Leads Directory Tab â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {activeTab === 'directory' && (
        <div className="flex-grow flex flex-col min-h-0">
          {/* Filtration / Search */}
          <div className="flex flex-wrap items-end gap-3 mb-4 shrink-0 bg-[var(--hover-bg)]/30 p-2.5 rounded-xl border border-[rgba(197,168,128,0.15)] animate-fade-in">
            <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Search Query</span>
              <div className={`${card} flex items-center gap-2.5 px-3.5 py-1.5 compact-search-container`}>
                <Search size={14} className="text-stone-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search leads by name, phone, platform, campaign..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Platform</span>
              <SearchableSelect
                options={[
                  { value: 'ALL', label: 'All Platforms' },
                  ...uniquePlatforms.map((p) => ({ value: p, label: platformLabel[p] || p.replace(/_/g, ' ') }))
                ]}
                value={filterPlatform}
                onChange={setFilterPlatform}
              />
            </div>
            
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Service</span>
              <SearchableSelect
                options={[
                  { value: 'ALL', label: 'All Services' },
                  ...Object.entries(serviceLabels).map(([key, val]) => ({ value: key, label: val }))
                ]}
                value={filterService}
                onChange={setFilterService}
              />
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Feed Type</span>
              <SearchableSelect
                options={[
                  { value: 'ALL', label: 'All Feed Types' },
                  { value: 'manual', label: 'Manual' },
                  { value: 'bulk', label: 'Bulk Upload' }
                ]}
                value={filterSource}
                onChange={setFilterSource}
              />
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Timeframe</span>
              <SearchableSelect
                options={[
                  { value: 'ALL', label: 'All Time' },
                  { value: 'TODAY', label: 'Today' },
                  { value: 'YESTERDAY', label: 'Yesterday' },
                  { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
                  { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
                  { value: 'CUSTOM', label: 'Custom Range' }
                ]}
                value={filterDate}
                onChange={setFilterDate}
              />
            </div>

            {filterDate === 'CUSTOM' && (
              <>
                <div className="flex flex-col gap-1 flex-1 min-w-[140px] animate-fade-in">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Start Date</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[rgba(184,144,71,0.35)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-1.5 outline-none transition focus:border-[#b89047] focus:ring-2 focus:ring-amber-100/50 font-[inherit] compact-input"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[140px] animate-fade-in">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wide">End Date</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[rgba(184,144,71,0.35)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-1.5 outline-none transition focus:border-[#b89047] focus:ring-2 focus:ring-amber-100/50 font-[inherit] compact-input"
                  />
                </div>
              </>
            )}

            {hasActiveFilters && (
              <div className="flex-1 min-w-[120px] sm:flex-initial">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterPlatform('ALL');
                    setFilterService('ALL');
                    setFilterSource('ALL');
                    setFilterDate('ALL');
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[11px] font-bold text-rose-500 bg-[var(--hover-bg)] border border-rose-500/30 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <X size={12} /> Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Directory Table Card */}
          <div className={`${card} flex-1 overflow-y-auto overflow-x-auto scrollbar-thin flex flex-col justify-between`}>
            <div className="overflow-x-auto min-w-full flex-1">
              {loading ? (
                <div className="p-4">
                  <ShimmerTable rows={8} cols={5} />
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="w-16 h-16 bg-[var(--hover-bg)] border border-[rgba(197,168,128,0.2)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)] mb-3 shadow-inner">
                    <Database size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">No Leads Found</h3>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                    {searchTerm || filterPlatform !== 'ALL' || filterService !== 'ALL' || filterSource !== 'ALL' || filterDate !== 'ALL'
                      ? 'No leads match the active filters. Try adjusting your search or filter criteria.'
                      : 'Start capturing leads by manual form submission or Excel bulk upload.'}
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left min-w-[700px]">
                  <thead>
                    <tr className="bg-[var(--table-head)]/80 sticky top-0 z-10 backdrop-blur-xs">
                      {['S.No.', 'Full Name', 'Phone Number', 'City', 'Platform', 'Services Requested', 'Campaign Name', 'Adset Name', 'Ad Name', 'Feed Type', 'Lead Response', 'Date Added', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[rgba(197,168,128,0.18)] bg-[var(--table-head)] text-center whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[12.5px] text-[var(--text-secondary)]">
                    {paginatedLeads.map((lead, index) => {
                      const cleanPhone = lead.phoneNumber.replace(/[^0-9]/g, '').slice(-10);
                      const matchedProspect = prospectMap[cleanPhone];
                      const servicesDisplay: string[] = lead.services;

                      return (
                      <tr key={lead.id} className={`transition-colors ${lead.isDuplicate30Days ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-[var(--hover-bg)]/40'}`}>
                        <td className="px-4 py-3.5 border-b border-[rgba(197,168,128,0.12)] text-[12px] font-medium text-[var(--text-muted)] text-center">{indexStart + index + 1}</td>
                        <td className="px-4 py-3.5 border-b border-[rgba(197,168,128,0.12)] text-[12.5px] font-semibold text-[var(--text-primary)] text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-0.5">
                            <span>{lead.fullName}</span>
                            {lead.isDuplicate30Days && (
                              <span className="text-[9.5px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <AlertCircle size={8} /> Duplicate (30d)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12.5px] text-[var(--text-secondary)] font-medium text-center whitespace-nowrap">
                          {lead.phoneNumber}
                        </td>
                        <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12.5px] text-[var(--text-secondary)] font-medium text-center whitespace-nowrap">
                          {lead.city || <span className="italic opacity-40">-</span>}
                        </td>
                        <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center whitespace-nowrap">
                          <span className={`text-[12.5px] font-semibold ${
                            lead.platform === 'META_FACEBOOK' || lead.platform === 'Meta' ? 'text-blue-700' :
                            lead.platform === 'INSTAGRAM' || lead.platform === 'Instagram' ? 'text-pink-600' :
                            lead.platform === 'WHATSAPP' ? 'text-green-600' :
                            lead.platform === 'EMAIL' ? 'text-sky-600' :
                            lead.platform === 'JUST_DIAL' ? 'text-orange-600' :
                            lead.platform === 'REFERENCE' ? 'text-emerald-600' :
                            lead.platform === 'WALK_IN' ? 'text-violet-600' :
                            lead.platform === 'REPEATED_CLIENT' ? 'text-rose-600' :
                            'text-stone-500'
                          }`}>
                            {platformLabel[lead.platform || ''] || lead.platform || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center">
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {servicesDisplay.map((s, sIdx) => (
                              <span key={s} className="text-amber-800 text-[12px] font-semibold">
                                {serviceLabels[s] || s}{sIdx < servicesDisplay.length - 1 ? ',' : ''}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center max-w-xs truncate text-[12.5px] text-[var(--text-secondary)]" title={lead.campaignName || ''}>
                          {lead.campaignName || <span className="italic opacity-40">-</span>}
                        </td>
                        <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center max-w-xs truncate text-[12.5px] text-[var(--text-secondary)]" title={lead.adsetName || ''}>
                          {lead.adsetName || <span className="italic opacity-40">-</span>}
                        </td>
                        <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center max-w-xs truncate text-[12.5px] text-[var(--text-secondary)]" title={lead.adName || ''}>
                          {lead.adName || <span className="italic opacity-40">-</span>}
                        </td>
                        <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            lead.source === 'manual'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {lead.source === 'manual' ? 'Manual' : 'Bulk Upload'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center">
                          <select
                            value={lead.leadResponse || ''}
                            onChange={(e) => handleUpdateLeadResponse(lead.id, e.target.value || null)}
                            disabled={updatingResponseId === lead.id}
                            className={`text-[11.5px] font-semibold rounded-lg border px-2 py-1 outline-none cursor-pointer transition-all bg-[var(--input-bg)] border-[rgba(184,144,71,0.3)] focus:border-[#b89047] ${
                              lead.leadResponse ? leadResponseColor[lead.leadResponse] || 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] italic'
                            } ${updatingResponseId === lead.id ? 'opacity-50' : ''}`}
                          >
                            <option value="">— Set Response —</option>
                            {LEAD_RESPONSE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center text-[var(--text-muted)] text-[11.5px] whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center">
                          {matchedProspect ? (
                            <button
                              onClick={() => navigate(`/prospects/${matchedProspect.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold text-amber-700 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/15 hover:text-amber-600 transition-all cursor-pointer"
                              title="View prospect requirement brief log"
                            >
                              <FileText size={11} /> Req Log
                            </button>
                          ) : currentUser.role === 'Sales & Marketing' ? (
                            <button
                              onClick={() => setConvertingLead(lead)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer"
                              title="Convert lead to prospect brief"
                            >
                              <ClipboardList size={11} /> Fill Form
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--text-muted)] bg-[var(--hover-bg)] border border-[var(--border)] px-2.5 py-1 rounded-md italic">
                              Not Filled Yet
                            </span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Directory Pagination */}
            {!loading && filteredLeads.length > 0 && (
              <div className="p-3 bg-[var(--hover-bg)]/70 border-t border-[var(--border)] flex items-center justify-between shrink-0 select-none">
                <span className="text-[11.5px] text-[var(--text-muted)]">
                  Showing <strong className="text-[var(--text-primary)]">{indexStart + 1}</strong> to{' '}
                  <strong className="text-[var(--text-primary)]">
                    {Math.min(indexStart + ITEMS_PER_PAGE, filteredLeads.length)}
                  </strong>{' '}
                  of <strong className="text-[var(--text-primary)]">{filteredLeads.length}</strong> leads
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                    className="p-1 px-2.5 rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] disabled:opacity-40 disabled:hover:bg-transparent text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={12} /> Previous
                  </button>
                  <span className="text-[11.5px] text-[var(--text-muted)] font-bold px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="p-1 px-2.5 rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] disabled:opacity-40 disabled:hover:bg-transparent text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* â"€â"€ Bulk Ingestion Hub Tab â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {activeTab === 'bulk' && (
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          
          {/* Top upload bar & counters */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 shrink-0">
            {/* Drag & Drop Card */}
            <div className="lg:col-span-3 bg-[var(--card-bg)] border border-[rgba(184,144,71,0.22)] rounded-xl p-4 shadow-xs">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-[#b89047] bg-[#b89047]/5'
                    : 'border-[rgba(184,144,71,0.3)] bg-[var(--hover-bg)]/50 hover:bg-[var(--hover-bg)] hover:border-[#b89047]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                
                <Upload className="text-[#b89047] w-8 h-8 mb-2 animate-bounce-subtle" />
                
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {selectedFileName ? `Selected: ${selectedFileName}` : 'Drag & Drop your spreadsheet here, or click to browse'}
                </span>
                <span className="text-[11px] text-stone-400 mt-1">Supports Microsoft Excel (.xlsx/.xls) and CSV (.csv) files.</span>
              </div>

              {/* Template Download & Clear */}
              <div className="flex justify-between items-center mt-3 text-[11.5px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadTemplate();
                  }}
                  className="text-[#7e5a20] hover:text-[#634515] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download size={13} /> Download Sample Ingestion Template (.csv)
                </button>

                {previewLeads.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearIngestion();
                    }}
                    className="text-stone-400 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 size={13} /> Clear Uploaded File
                  </button>
                )}
              </div>
            </div>

            {/* Counters Box */}
            <div className="bg-[var(--card-bg)] border border-[rgba(184,144,71,0.22)] rounded-xl p-4 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 border-b border-[var(--border)] pb-1.5">
                  Ingestion Stats
                </h3>
                
                <div className="space-y-2.5 text-[12.5px] font-semibold">
                  <div className="flex justify-between items-center text-[var(--text-primary)]">
                    <span>Total Rows Loaded:</span>
                    <span className="bg-[var(--hover-bg)] border border-[var(--border)] px-2 py-0.5 rounded text-[11.5px]">{bulkStats.total}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-emerald-700">
                    <span>Valid Records:</span>
                    <span className="bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded text-[11.5px]">{bulkStats.valid}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-rose-700">
                    <span>Invalid / Errors:</span>
                    <span className="bg-rose-50 border border-rose-150 px-2 py-0.5 rounded text-[11.5px]">{bulkStats.invalid}</span>
                  </div>
                </div>
              </div>

              {previewLeads.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex gap-2 shrink-0">
                  {bulkStats.invalid > 0 && (
                    <button
                      onClick={handleDownloadErrorReport}
                      className="flex-1 bg-[var(--hover-bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:opacity-80 rounded-lg py-2 px-2 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <AlertTriangle size={12} className="text-amber-600" /> Error Report
                    </button>
                  )}
                  
                  <button
                    onClick={handleSubmitBulkLeads}
                    disabled={bulkStats.valid === 0 || bulkUploading}
                    className="flex-1 bg-gradient-to-br from-[#b89047] to-[#9e7735] text-white hover:opacity-95 disabled:opacity-40 disabled:pointer-events-none rounded-lg py-2 px-2 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border-0 shadow-sm"
                  >
                    {bulkUploading ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    Import ({bulkStats.valid})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ingestion Preview Grid */}
          <div className="flex-1 bg-[var(--card-bg)] border border-[rgba(184,144,71,0.22)] rounded-xl shadow-xs overflow-hidden flex flex-col min-h-0">
            <div className="p-3 border-b border-[var(--border)] bg-[var(--hover-bg)]/50 flex justify-between items-center shrink-0">
              <span className="text-[12px] font-bold text-[var(--text-secondary)]">
                Sheet Rows Preview Table
              </span>
              
              {previewLeads.length > 0 && (
                <div className="flex items-center gap-4 text-[11px] font-bold text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300 inline-block" /> Valid Row</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-50 border border-rose-200 inline-block" /> Invalid Row</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-50 border border-orange-200 inline-block" /> Duplicate Phone</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              {isValidating ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="animate-spin text-amber-600 w-8 h-8" />
                  <span className="text-[12px] text-stone-500 font-medium">Validating Spreadsheet Rows...</span>
                </div>
              ) : previewLeads.length === 0 ? (
                <div className="py-24 text-center text-stone-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-stone-300" />
                  <p className="text-xs italic">Upload a spreadsheet file to preview, validate, and inspect your leads list.</p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left min-w-[700px]">
                  <thead>
                    <tr className="bg-[var(--table-head)]/80 sticky top-0 z-10 backdrop-blur-xs">
                      {['S.No.', 'Full Name', 'Phone Number', 'City', 'Platform Source', 'Services', 'Campaign', 'Errors / Warnings'].map((h) => (
                        <th key={h} className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[rgba(184,144,71,0.18)] bg-[var(--table-head)] text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[12px] text-[var(--text-secondary)]">
                    {previewLeads.map((item, idx) => {
                      const hasErrors = item.errors.length > 0;
                      const isDupe = item.isDbDuplicate || item.isLocalDuplicate;
                      
                      let bgClass = 'bg-emerald-50/20';
                      let borderClass = '';
                      
                      if (hasErrors) {
                        bgClass = 'bg-rose-50/40 hover:bg-rose-50/60';
                        borderClass = 'border-rose-100';
                      } else if (isDupe) {
                        bgClass = 'bg-orange-50/30 hover:bg-orange-50/50';
                        borderClass = 'border-orange-100';
                      }

                      return (
                        <tr key={idx} className={`${bgClass} ${borderClass} transition-colors`}>
                          <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12px] font-medium text-stone-500 text-center border-r border-stone-100/50">{item.srNo}</td>
                          <td className={`px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12.5px] font-bold text-center ${!item.fullName ? 'text-rose-600 bg-rose-50/60' : 'text-[var(--text-primary)]'}`}>
                            {item.fullName || <span className="italic font-normal text-rose-500">Missing Name</span>}
                          </td>
                          <td className={`px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-[12px] text-center font-semibold ${
                            !item.phoneNumber ? 'text-rose-600 bg-rose-50/60' : 
                            normalizeAndValidatePhone(item.phoneNumber).isValid === false ? 'text-rose-600 bg-rose-50/60' :
                            isDupe ? 'text-orange-700' : ''
                          }`}>
                            {item.phoneNumber || <span className="italic font-normal text-rose-500">Missing Phone</span>}
                          </td>
                          <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center text-[var(--text-secondary)] font-medium">
                            {item.city || <span className="italic text-[var(--text-muted)]">—</span>}
                          </td>
                          <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center">
                            <span className="text-[12px] font-semibold text-[var(--text-secondary)]">
                              {platformLabel[item.platform] || item.platform || <span className="italic text-[var(--text-muted)]">—</span>}
                            </span>
                          </td>
                          <td className={`px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center ${item.services.length === 0 ? 'bg-rose-50/60' : ''}`}>
                            <div className="flex flex-wrap gap-1 justify-center">
                              {item.services.map((s, sIdx) => {
                                const isValidS = !!serviceLabels[s];
                                return (
                                  <span key={s} className={`text-[11.5px] font-semibold ${
                                    isValidS ? 'text-amber-800' : 'text-rose-700 font-bold'
                                  }`}>
                                    {serviceLabels[s] || `Invalid: ${s}`}{sIdx < item.services.length - 1 ? ',' : ''}
                                  </span>
                                );
                              })}
                              {item.services.length === 0 && <span className="italic text-rose-500">None selected</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center text-[var(--text-muted)] max-w-xs truncate">{item.campaignName || <span className="italic opacity-40">-</span>}</td>
                          <td className="px-4 py-3.5 border-b border-[rgba(184,144,71,0.12)] text-center border-l border-[var(--border)]/50">
                            {hasErrors ? (
                              <div className="space-y-0.5 flex flex-col items-center">
                                {item.errors.map((err, eIdx) => (
                                  <span key={eIdx} className="flex items-center justify-center gap-1 text-[11px] font-medium text-rose-600">
                                    <AlertCircle size={10} className="shrink-0" />
                                    {err}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-700">
                                <Check size={11} className="shrink-0" /> Ready to Import
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* â"€â"€ Slide Drawer Form (Manual Ingestion) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <div
        className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          onClick={handleCloseDrawer}
          className={`absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity duration-350 ${
            isDrawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Drawer Panel */}
        <div
          className={`relative w-full max-w-md h-full bg-[var(--card-bg)] shadow-2xl flex flex-col justify-between border-l border-[rgba(197,168,128,0.25)] transition-transform duration-300 ease-out ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-4 border-b border-[rgba(197,168,128,0.2)] bg-[var(--card-bg)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <PlusCircle className="text-[#c5a880] w-5 h-5" />
              <div>
                <h3 className="text-[14px] font-extrabold text-[var(--text-primary)] tracking-tight">Capture New Lead</h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Input lead details and save to directory.</p>
              </div>
            </div>

            <button
              onClick={handleCloseDrawer}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--hover-bg)] focus:outline-none transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer Body (Form) */}
          <form onSubmit={handleManualSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                ref={nameInputRef}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (formErrors.fullName) setFormErrors(prev => ({ ...prev, fullName: '' }));
                }}
                placeholder="Enter client's full name"
                className={`w-full bg-[var(--input-bg)] border text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-2 outline-none transition focus:ring-2 focus:ring-amber-100/50 ${
                  formErrors.fullName
                    ? 'border-rose-300 focus:border-rose-500'
                    : 'border-[rgba(197,168,128,0.35)] focus:border-[#c5a880]'
                }`}
              />
              {formErrors.fullName && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium mt-0.5 animate-fade-in">
                  <AlertCircle size={10} /> {formErrors.fullName}
                </p>
              )}
              {!formErrors.fullName && nameHint && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium mt-0.5 animate-fade-in">
                  <AlertTriangle size={10} /> {nameHint}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={10}
                value={phoneNumber}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhoneNumber(cleaned);
                  if (formErrors.phoneNumber) setFormErrors(prev => ({ ...prev, phoneNumber: '' }));
                }}
                placeholder="e.g. 9876543210"
                className={`w-full bg-white border text-stone-955 text-[13px] rounded-lg px-3.5 py-2 outline-none transition focus:ring-2 focus:ring-amber-100/50 ${
                  formErrors.phoneNumber
                    ? 'border-rose-300 focus:border-rose-500'
                    : 'border-[rgba(197,168,128,0.35)] focus:border-[#c5a880]'
                }`}
              />
              {formErrors.phoneNumber && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium mt-0.5 animate-fade-in">
                  <AlertCircle size={10} /> {formErrors.phoneNumber}
                </p>
              )}
              {!formErrors.phoneNumber && phoneHint && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium mt-0.5 animate-fade-in">
                  <AlertTriangle size={10} /> {phoneHint}
                </p>
              )}
              {!formErrors.phoneNumber && !phoneHint && manualFormDuplicateWarning && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium mt-0.5 animate-fade-in">
                  <AlertCircle size={10} /> Duplicate: This phone was already captured as a lead in the last 30 days.
                </p>
              )}
              {!formErrors.phoneNumber && !phoneHint && checkingDuplicate && (
                <p className="text-[11px] text-stone-400 flex items-center gap-1 font-medium mt-0.5 animate-fade-in">
                  <RefreshCw size={10} className="animate-spin" /> Checking for duplicates...
                </p>
              )}
            </div>

            {/* City */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Gurgaon"
                className="w-full bg-[var(--input-bg)] border border-[rgba(197,168,128,0.35)] text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-2 outline-none transition focus:border-[#c5a880] focus:ring-2 focus:ring-amber-100/50"
              />
            </div>

            {/* Services (Multi-select) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Services Requested <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2 p-2 rounded-lg bg-[var(--input-bg)] border border-[rgba(197,168,128,0.2)] max-h-48 overflow-y-auto">
                {Object.entries(serviceLabels).map(([key, label]) => {
                  const isChecked = selectedServices.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12.5px] cursor-pointer transition-all duration-150 ${
                        isChecked
                          ? 'bg-[#c5a880]/10 text-[#7a613d] font-bold border border-[#c5a880]/30'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleServiceToggle(key)}
                        className="accent-[#c5a880] w-4 h-4 cursor-pointer"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
              {formErrors.services && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium mt-0.5">
                  <AlertCircle size={10} /> {formErrors.services}
                </p>
              )}
            </div>

            {/* Platform Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Platform Source
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[rgba(197,168,128,0.35)] text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-2 outline-none transition focus:border-[#c5a880] focus:ring-2 focus:ring-amber-100/50 cursor-pointer"
              >
                {PLATFORM_SOURCE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <hr className="border-[var(--border)] my-2" />

            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Campaign & Ads Context
            </div>

            {/* Campaign Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Campaign Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => { setCampaignName(e.target.value); if (formErrors.campaignName) setFormErrors(prev => ({ ...prev, campaignName: '' })); }}
                placeholder="e.g. Interior Renovations 2026"
                className={`w-full bg-[var(--input-bg)] border text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-2 outline-none transition focus:ring-2 focus:ring-amber-100/50 ${formErrors.campaignName ? 'border-rose-300 focus:border-rose-500' : 'border-[rgba(197,168,128,0.35)] focus:border-[#c5a880]'}`}
              />
              {formErrors.campaignName && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium mt-0.5"><AlertCircle size={10} /> {formErrors.campaignName}</p>
              )}
            </div>

            {/* Adset Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Adset Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={adsetName}
                onChange={(e) => { setAdsetName(e.target.value); if (formErrors.adsetName) setFormErrors(prev => ({ ...prev, adsetName: '' })); }}
                placeholder="e.g. Summer Audience"
                className={`w-full bg-[var(--input-bg)] border text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-2 outline-none transition focus:ring-2 focus:ring-amber-100/50 ${formErrors.adsetName ? 'border-rose-300 focus:border-rose-500' : 'border-[rgba(197,168,128,0.35)] focus:border-[#c5a880]'}`}
              />
              {formErrors.adsetName && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium mt-0.5"><AlertCircle size={10} /> {formErrors.adsetName}</p>
              )}
            </div>

            {/* Ad Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Ad Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={adName}
                onChange={(e) => { setAdName(e.target.value); if (formErrors.adName) setFormErrors(prev => ({ ...prev, adName: '' })); }}
                placeholder="e.g. Static Image - Living Room"
                className={`w-full bg-[var(--input-bg)] border text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-2 outline-none transition focus:ring-2 focus:ring-amber-100/50 ${formErrors.adName ? 'border-rose-300 focus:border-rose-500' : 'border-[rgba(197,168,128,0.35)] focus:border-[#c5a880]'}`}
              />
              {formErrors.adName && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium mt-0.5"><AlertCircle size={10} /> {formErrors.adName}</p>
              )}
            </div>
          </form>

          {/* Drawer Footer */}
          <div className="p-4 bg-[var(--card-bg)] border-t border-[rgba(197,168,128,0.2)] flex gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold text-[var(--text-secondary)] bg-[var(--hover-bg)] hover:opacity-80 hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={!isFormValid || submitting}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold text-white transition-all border-0 shadow-sm flex items-center justify-center gap-1.5 ${
                !isFormValid || submitting
                  ? 'bg-stone-400 cursor-not-allowed pointer-events-none opacity-70'
                  : 'bg-gradient-to-br from-[#b89047] to-[#8f6d2e] hover:brightness-110 cursor-pointer'
              }`}
            >
              {submitting ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <CheckCircle2 size={12} />
              )}
              Save Lead
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* â"€â"€ Convert Lead â†’ Prospect Modal â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      {convertingLead && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-stone-900/40 backdrop-blur-sm"
          onClick={() => !convertSubmitting && setConvertingLead(null)}
        >
          <div
            className="animate-scale-in w-full max-w-5xl lg:max-w-6xl bg-white sm:rounded-2xl shadow-2xl border-0 sm:border border-[rgba(197,168,128,0.3)] flex flex-col h-screen sm:h-auto sm:max-h-[calc(100vh-40px)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 sm:p-5 border-b border-stone-100 shrink-0 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <ClipboardList size={17} className="text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-[14px] sm:text-[15px] font-bold text-stone-900">Capture Client Brief</h3>
                  <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                    Converting: <span className="font-bold text-stone-700">{convertingLead.fullName}</span>
                    <span className="hidden sm:inline">{' · '}{convertingLead.phoneNumber}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => !convertSubmitting && setConvertingLead(null)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form â€" pre-filled from lead data */}
            <ProspectForm
              key={convertingLead.id}
              mode="create"
              initialData={leadToProspectInitialData(convertingLead)}
              onSubmit={handleConvertSubmit}
              onCancel={() => !convertSubmitting && setConvertingLead(null)}
              isSubmitting={convertSubmitting}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
