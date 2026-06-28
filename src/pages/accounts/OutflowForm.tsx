import React, { useEffect, useState } from 'react';
import { X, Upload } from 'lucide-react';
import {
  outflowApi, accountsMasterApi,
  type OutflowExpense, type PurposeMaster, type ExpenseCategoryMaster, type SiteNameMaster,
} from '../../services/accounts.api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { api, fileUrl } from '../../services/api.js';
import { makeUniqueFileName } from '../../utils/validators.js';
import { uniqueFileName } from '../../utils/fileUtils.js';
import { SearchableSelect } from '../../components/SearchableSelect.js';

interface Props {
  currentUser: User;
  existing?: OutflowExpense;
  onClose: () => void;
  onSaved: () => void;
}

const SALARY_CATEGORY = 'Salary';
const OFFICE_CATEGORY = 'Office Expense';

const SERVICE_LABELS: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Arch. Consultation',
  INTERIOR_DESIGN:            'Interior Design',
  PMC:                        'PMC',
  TURNKEY_CONSTRUCTION:       'Turnkey',
  INTERIOR_EXECUTION:         'Int. Execution',
  RENOVATION:                 'Renovation',
  END_TO_END_SOLUTION:        'End-to-End',
};

const EMPTY = {
  date: new Date().toISOString().split('T')[0],
  name: '',
  categoryId: '',
  expenseType: '' as '' | 'DIRECT' | 'INDIRECT',
  purposeId: '',
  amount: '',
  modeOfPayment: '' as '' | 'CASH' | 'ONLINE' | 'OTHER',
  projectManagerId: '',
  siteName: '',
  siteId: '',
  description: '',
  supportingDocUrl: '',
  supportingDocName: '',
  // Salary
  employeeName: '',
  salaryMonth: '',
  salaryPayStatus: '' as '' | 'PENDING' | 'PAID',
  // Office
  expenseName: '',
  department: '',
};

export const OutflowForm: React.FC<Props> = ({ existing, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState({ ...EMPTY });
  const [purposes, setPurposes] = useState<PurposeMaster[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryMaster[]>([]);
  const [pms, setPms] = useState<{ id: string; name: string; email: string }[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [siteNames, setSiteNames] = useState<SiteNameMaster[]>([]);
  const [uploading, setUploading] = useState(false);

  const [addingSite, setAddingSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [savingSite, setSavingSite] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inline category creation
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || savingCategory) return;
    setSavingCategory(true);
    try {
      const res = await accountsMasterApi.createCategory(newCategoryName.trim());
      const created = res.data.data;
      setCategories(prev => [...prev, created]);
      set('categoryId', created.id);
      setAddingCategory(false);
      setNewCategoryName('');
      showToast(`"${created.name}" added as category.`, 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to add category.', 'error');
    } finally { setSavingCategory(false); }
  };

  // Inline purpose creation
  const [addingPurpose, setAddingPurpose] = useState(false);
  const [newPurposeName, setNewPurposeName] = useState('');
  const [savingPurpose, setSavingPurpose] = useState(false);

  const handleAddPurpose = async () => {
    if (!newPurposeName.trim() || savingPurpose) return;
    setSavingPurpose(true);
    try {
      const res = await accountsMasterApi.createPurpose({ name: newPurposeName.trim(), module: 'OUTFLOW' });
      const created = res.data.data;
      setPurposes(prev => [...prev, created]);
      set('purposeId', created.id);
      setAddingPurpose(false);
      setNewPurposeName('');
      showToast(`"${created.name}" added as purpose.`, 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to add purpose.', 'error');
    } finally { setSavingPurpose(false); }
  };

  useEffect(() => {
    Promise.all([
      accountsMasterApi.listPurposes('OUTFLOW'),
      accountsMasterApi.listPurposes('BOTH'),
      accountsMasterApi.listCategories(),
      outflowApi.listProjectManagers(),
      accountsMasterApi.listActiveProjects(),
      accountsMasterApi.listSiteNames(),
    ]).then(([p1, p2, cats, pm, projs, sites]) => {
      const ids = new Set(p1.data.data.map(p => p.id));
      setPurposes([...p1.data.data, ...p2.data.data.filter(p => !ids.has(p.id))]);
      setCategories(cats.data.data);
      setPms(pm.data.data);
      setProjects(projs.data.data);
      setSiteNames(sites.data.data);
    }).catch(() => {});

    if (existing) {
      setForm({
        date: existing.date.split('T')[0],
        name: existing.name,
        categoryId: existing.categoryId,
        expenseType: existing.expenseType,
        purposeId: existing.purposeId,
        amount: existing.amount,
        modeOfPayment: existing.modeOfPayment,
        projectManagerId: existing.projectManagerId ?? '',
        siteName: existing.siteName ?? '',
        siteId: existing.siteId ?? '',
        description: existing.description ?? '',
        supportingDocUrl: existing.supportingDocUrl,
        supportingDocName: existing.supportingDocName,
        employeeName: existing.employeeName ?? '',
        salaryMonth: existing.salaryMonth ?? '',
        salaryPayStatus: existing.salaryPayStatus ?? '',
        expenseName: existing.expenseName ?? '',
        department: existing.department ?? '',
      });
    }
  }, [existing]);

  const selectedCategory = categories.find(c => c.id === form.categoryId);
  const isSalary = selectedCategory?.name === SALARY_CATEGORY;
  const isOffice = selectedCategory?.name === OFFICE_CATEGORY;
  const needsPM = Number(form.amount) > 0 && Number(form.amount) <= 10000;

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAddSite = async () => {
    if (!newSiteName.trim() || savingSite) return;
    setSavingSite(true);
    try {
      const res = await accountsMasterApi.createSiteName(newSiteName.trim());
      const created = res.data.data;
      setSiteNames(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      set('siteId', `__site__${created.name}`);
      set('siteName', created.name);
      setAddingSite(false);
      setNewSiteName('');
      showToast(`"${created.name}" added as site.`, 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to add site name.', 'error');
    } finally { setSavingSite(false); }
  };

  const siteOptions = [
    { value: '', label: 'Select site' },
    ...projects.map(p => ({
      value: p.id,
      label: `${p.prospect.client.clientName} — ${SERVICE_LABELS[p.prospect.serviceType] ?? p.prospect.serviceType}`,
    })),
    ...siteNames.map(s => ({ value: `__site__${s.name}`, label: s.name })),
    { value: '__new__', label: '＋ Add new site name…' },
  ];

  const siteSelectValue = form.siteId || '';

  const handleSiteChange = (val: string) => {
    if (val === '__new__') { setAddingSite(true); return; }
    if (val.startsWith('__site__')) {
      const name = val.slice(8);
      setForm(prev => ({ ...prev, siteId: val, siteName: name }));
    } else if (val) {
      const proj = projects.find(p => p.id === val);
      if (proj) {
        setForm(prev => ({
          ...prev,
          siteId: val,
          siteName: `${proj.prospect.client.clientName} (${proj.prospect.serviceType})`,
        }));
      }
    } else {
      setForm(prev => ({ ...prev, siteId: '', siteName: '' }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file, uniqueFileName(file));
    setUploading(true);
    try {
      const res = await api.post<{ url: string; filename: string }>('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data', 'x-file-type': 'design' },
      });
      set('supportingDocUrl', res.data.url);
      set('supportingDocName', makeUniqueFileName(res.data.filename ?? file.name, 'Expense-Proof'));
    } catch { showToast('File upload failed.', 'error'); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supportingDocUrl) { showToast('Supporting document is required.', 'error'); return; }
    if (!form.categoryId) { showToast('Please select a category.', 'error'); return; }
    if (!form.purposeId) { showToast('Please select a purpose.', 'error'); return; }
    if (!form.siteName.trim()) { showToast('Please select a site or add a site name.', 'error'); return; }
    if (!form.modeOfPayment) { showToast('Please select payment mode.', 'error'); return; }
    if (!form.expenseType) { showToast('Please select expense type.', 'error'); return; }
    if (needsPM && !form.projectManagerId) { showToast('Project Manager is required for expenses ≤ ₹10,000.', 'error'); return; }

    const payload: any = {
      date: form.date,
      name: form.name,
      categoryId: form.categoryId,
      expenseType: form.expenseType,
      purposeId: form.purposeId,
      amount: Number(form.amount),
      modeOfPayment: form.modeOfPayment,
      projectManagerId: form.projectManagerId || undefined,
      siteId: form.siteId && !form.siteId.startsWith('__site__') ? form.siteId : undefined,
      siteName: form.siteName || undefined,
      description: form.description || undefined,
      supportingDocUrl: form.supportingDocUrl,
      supportingDocName: form.supportingDocName,
      ...(isSalary ? {
        employeeName: form.employeeName || undefined,
        salaryMonth: form.salaryMonth || undefined,
        salaryPayStatus: form.salaryPayStatus || undefined,
      } : {}),
      ...(isOffice ? {
        expenseName: form.expenseName || undefined,
        department: form.department || undefined,
      } : {}),
    };

    setSubmitting(true);
    try {
      if (existing) {
        await outflowApi.update(existing.id, payload);
        showToast('Expense updated.', 'success');
      } else {
        await outflowApi.create(payload);
        showToast('Expense created.', 'success');
      }
      onSaved();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to save expense.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-2xl">
        <div className="h-[3px] rounded-t-2xl bg-gradient-to-r from-red-500 to-orange-400" />
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
          <h2 className="text-[13px] font-bold text-[var(--text-primary)]">
            {existing ? 'Edit Expense' : 'New Outflow Expense'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-stone-400 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *">
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className={INPUT} />
            </Field>
            <Field label="Paid To *">
              <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Name of person/vendor paid" className={INPUT} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category *">
              {addingCategory ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }
                      if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryName(''); }
                    }}
                    placeholder="New category name…"
                    className={INPUT}
                  />
                  <button type="button" onClick={handleAddCategory} disabled={savingCategory || !newCategoryName.trim()} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] disabled:opacity-60 shrink-0">
                    {savingCategory ? '…' : 'Add'}
                  </button>
                  <button type="button" onClick={() => { setAddingCategory(false); setNewCategoryName(''); }} className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 shrink-0 text-[11px] flex items-center justify-center">
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <select value={form.categoryId} onChange={e => {
                  if (e.target.value === '__new__') { setAddingCategory(true); set('categoryId', ''); }
                  else set('categoryId', e.target.value);
                }} required={!addingCategory} className={INPUT}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="__new__">＋ Add new category…</option>
                </select>
              )}
            </Field>
            <Field label="Expense Type *">
              <select value={form.expenseType} onChange={e => set('expenseType', e.target.value)} required className={INPUT}>
                <option value="">Select type</option>
                <option value="DIRECT">Direct</option>
                <option value="INDIRECT">Indirect</option>
              </select>
            </Field>
          </div>

          {/* Salary-specific */}
          {isSalary && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-blue-500/25 bg-blue-500/5 p-4">
              <Field label="Employee Name">
                <input value={form.employeeName} onChange={e => set('employeeName', e.target.value)} placeholder="Employee name" className={INPUT} />
              </Field>
              <Field label="Salary Month (YYYY-MM)">
                <input value={form.salaryMonth} onChange={e => set('salaryMonth', e.target.value)} placeholder="2025-06" className={INPUT} />
              </Field>
              <Field label="Payment Status">
                <select value={form.salaryPayStatus} onChange={e => set('salaryPayStatus', e.target.value)} className={INPUT}>
                  <option value="">Select</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                </select>
              </Field>
            </div>
          )}

          {/* Office-specific */}
          {isOffice && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-purple-500/25 bg-purple-500/5 p-4">
              <Field label="Expense Description">
                <input value={form.expenseName} onChange={e => set('expenseName', e.target.value)} placeholder="e.g. Stationery" className={INPUT} />
              </Field>
              <Field label="Department">
                <input value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Operations" className={INPUT} />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹) *">
              <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" className={INPUT} />
            </Field>
            <Field label="Mode of Payment *">
              <select value={form.modeOfPayment} onChange={e => set('modeOfPayment', e.target.value)} required className={INPUT}>
                <option value="">Select mode</option>
                <option value="CASH">Cash</option>
                <option value="ONLINE">Online</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
          </div>

          {needsPM && (
            <Field label="Project Manager * (required for amounts ≤ ₹10,000)">
              <select value={form.projectManagerId} onChange={e => set('projectManagerId', e.target.value)} className={INPUT}>
                <option value="">Search & select PM…</option>
                {pms.map(pm => <option key={pm.id} value={pm.id}>{pm.name} — {pm.email}</option>)}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Purpose *">
              {addingPurpose ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newPurposeName}
                    onChange={e => setNewPurposeName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddPurpose(); }
                      if (e.key === 'Escape') { setAddingPurpose(false); setNewPurposeName(''); }
                    }}
                    placeholder="New purpose name…"
                    className={INPUT}
                  />
                  <button type="button" onClick={handleAddPurpose} disabled={savingPurpose || !newPurposeName.trim()} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] disabled:opacity-60 shrink-0">
                    {savingPurpose ? '…' : 'Add'}
                  </button>
                  <button type="button" onClick={() => { setAddingPurpose(false); setNewPurposeName(''); }} className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 shrink-0 text-[11px] flex items-center justify-center">
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <select value={form.purposeId} onChange={e => {
                  if (e.target.value === '__new__') { setAddingPurpose(true); set('purposeId', ''); }
                  else set('purposeId', e.target.value);
                }} required={!addingPurpose} className={INPUT}>
                  <option value="">Select purpose</option>
                  {purposes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="__new__">＋ Add new purpose…</option>
                </select>
              )}
            </Field>
            <Field label="Site Name *">
              {addingSite ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newSiteName}
                    onChange={e => setNewSiteName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddSite(); }
                      if (e.key === 'Escape') { setAddingSite(false); setNewSiteName(''); }
                    }}
                    placeholder="New site name…"
                    className={INPUT}
                  />
                  <button type="button" onClick={handleAddSite} disabled={savingSite || !newSiteName.trim()} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] disabled:opacity-60 shrink-0">
                    {savingSite ? '…' : 'Add'}
                  </button>
                  <button type="button" onClick={() => { setAddingSite(false); setNewSiteName(''); }} className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 shrink-0 text-[11px] flex items-center justify-center"><X size={11} /></button>
                </div>
              ) : (
                <SearchableSelect
                  options={siteOptions}
                  value={siteSelectValue}
                  onChange={handleSiteChange}
                  placeholder="Select site"
                />
              )}
            </Field>
          </div>

          <Field label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Additional notes…" className={`${INPUT} resize-none`} />
          </Field>

          <Field label="Supporting Document *">
            <div className="flex items-center gap-3">
              <label className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg)] border border-dashed border-[var(--border)] text-[11px] text-[var(--text-muted)] cursor-pointer hover:border-[#b89047]/60 transition-colors ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <Upload size={13} />
                {form.supportingDocName || (uploading ? 'Uploading…' : 'Click to upload')}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" />
              </label>
              {form.supportingDocUrl && (
                <a href={form.supportingDocUrl.startsWith('http') ? form.supportingDocUrl : fileUrl(form.supportingDocUrl)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:underline whitespace-nowrap">View</a>
              )}
            </div>
          </Field>

          <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-400 font-medium">
            All outflow expenses require Super Admin approval.
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-[11px] font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex-1 py-2 rounded-xl text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : existing ? 'Update Expense' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const INPUT = 'w-full px-3 py-1.5 text-[11px] rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[#b89047]/60 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}
