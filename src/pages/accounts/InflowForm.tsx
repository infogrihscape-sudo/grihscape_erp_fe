import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { inflowApi, accountsMasterApi, type InflowChallan, type PurposeMaster, type SiteNameMaster } from '../../services/accounts.api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { SearchableSelect } from '../../components/SearchableSelect.js';

interface Props {
  currentUser: User;
  existing?: InflowChallan;
  onClose: () => void;
  onSaved: () => void;
}

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
  clientName: '',
  siteName: '',
  projectId: '',
  clientId: '',
  amount: '',
  isTaxApplicable: false,
  taxType: '' as '' | 'GST' | 'CUSTOM',
  taxPercent: '',
  description: '',
  purposeId: '',
  modeOfPayment: '' as '' | 'CASH' | 'ONLINE' | 'OTHER',
  paymentStatus: 'PENDING' as 'PENDING' | 'PARTIAL' | 'RECEIVED',
};

export const InflowForm: React.FC<Props> = ({ existing, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState({ ...EMPTY });
  const [purposes, setPurposes] = useState<PurposeMaster[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [siteNames, setSiteNames] = useState<SiteNameMaster[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [addingSite, setAddingSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [savingSite, setSavingSite] = useState(false);

  // Inline purpose creation
  const [addingPurpose, setAddingPurpose] = useState(false);
  const [newPurposeName, setNewPurposeName] = useState('');
  const [savingPurpose, setSavingPurpose] = useState(false);

  const handleAddPurpose = async () => {
    if (!newPurposeName.trim() || savingPurpose) return;
    setSavingPurpose(true);
    try {
      const res = await accountsMasterApi.createPurpose({ name: newPurposeName.trim(), module: 'INFLOW' });
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
    accountsMasterApi.listPurposes('INFLOW').then(r => setPurposes(r.data.data)).catch(() => {});
    accountsMasterApi.listPurposes('BOTH').then(r => setPurposes(prev => {
      const ids = new Set(prev.map(p => p.id));
      return [...prev, ...r.data.data.filter(p => !ids.has(p.id))];
    })).catch(() => {});

    accountsMasterApi.listActiveProjects().then(r => setProjects(r.data.data)).catch(() => {});
    accountsMasterApi.listSiteNames().then(r => setSiteNames(r.data.data)).catch(() => {});

    if (existing) {
      setForm({
        date: existing.date.split('T')[0],
        clientName: existing.clientName,
        siteName: existing.siteName ?? '',
        projectId: existing.projectId ?? '',
        clientId: existing.clientId ?? '',
        amount: existing.amount,
        isTaxApplicable: existing.isTaxApplicable,
        taxType: existing.taxType ?? '',
        taxPercent: existing.taxPercent?.toString() ?? '',
        description: existing.description ?? '',
        purposeId: existing.purposeId,
        modeOfPayment: existing.modeOfPayment,
        paymentStatus: existing.paymentStatus,
      });
    }
  }, [existing]);

  const taxAmount = form.isTaxApplicable && form.taxPercent && form.amount
    ? ((Number(form.amount) || 0) * Number(form.taxPercent)) / 100
    : 0;
  const finalAmount = (Number(form.amount) || 0) + taxAmount;

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAddSite = async () => {
    if (!newSiteName.trim() || savingSite) return;
    setSavingSite(true);
    try {
      const res = await accountsMasterApi.createSiteName(newSiteName.trim());
      const created = res.data.data;
      setSiteNames(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      set('siteName', created.name);
      set('projectId', '');
      set('clientId', '');
      setAddingSite(false);
      setNewSiteName('');
      showToast(`"${created.name}" added as site.`, 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to add site name.', 'error');
    } finally { setSavingSite(false); }
  };

  const siteOptions = [
    { value: '', label: 'Select site (optional)' },
    ...projects.map(p => ({
      value: p.id,
      label: `${p.prospect.client.clientName} — ${SERVICE_LABELS[p.prospect.serviceType] ?? p.prospect.serviceType}`,
    })),
    ...siteNames.map(s => ({ value: `__site__${s.name}`, label: s.name })),
    { value: '__new__', label: '＋ Add new site name…' },
  ];

  const siteSelectValue = form.projectId
    ? form.projectId
    : form.siteName
      ? `__site__${form.siteName}`
      : '';

  const handleSiteChange = (val: string) => {
    if (val === '__new__') { setAddingSite(true); return; }
    if (val.startsWith('__site__')) {
      const name = val.slice(8);
      setForm(prev => ({ ...prev, projectId: '', clientId: '', siteName: name }));
    } else if (val) {
      const proj = projects.find(p => p.id === val);
      if (proj) {
        setForm(prev => ({
          ...prev,
          projectId: val,
          siteName: `${proj.prospect.client.clientName} (${proj.prospect.serviceType})`,
          clientName: proj.prospect.client.clientName,
          clientId: proj.prospect.clientId,
        }));
      }
    } else {
      setForm(prev => ({ ...prev, projectId: '', siteName: '', clientId: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.purposeId) { showToast('Please select a purpose.', 'error'); return; }
    if (!form.modeOfPayment) { showToast('Please select payment mode.', 'error'); return; }

    const payload: any = {
      date: form.date,
      clientName: form.clientName,
      siteName: form.siteName || undefined,
      projectId: form.projectId || undefined,
      clientId: form.clientId || undefined,
      amount: Number(form.amount),
      isTaxApplicable: form.isTaxApplicable,
      taxType: form.isTaxApplicable ? form.taxType || undefined : undefined,
      taxPercent: form.isTaxApplicable && form.taxPercent ? Number(form.taxPercent) : undefined,
      description: form.description || undefined,
      purposeId: form.purposeId,
      modeOfPayment: form.modeOfPayment,
      paymentStatus: form.paymentStatus,
    };

    setSubmitting(true);
    try {
      if (existing) {
        await inflowApi.update(existing.id, payload);
        showToast('Challan updated.', 'success');
      } else {
        await inflowApi.create(payload);
        showToast('Challan created.', 'success');
      }
      onSaved();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to save challan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-2xl">
        <div className="h-[3px] rounded-t-2xl bg-gradient-to-r from-[#b89047] to-[#f59e0b]" />
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
          <h2 className="text-[13px] font-bold text-[var(--text-primary)]">
            {existing ? 'Edit Challan' : 'New Inflow Challan'}
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
            <Field label="Client Name *">
              <input value={form.clientName} onChange={e => set('clientName', e.target.value)} required placeholder="Client name" className={INPUT} />
            </Field>
          </div>

          <Field label="Site Name">
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
                <button type="button" onClick={() => { setAddingSite(false); setNewSiteName(''); }} className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 shrink-0 text-[11px]">✕</button>
              </div>
            ) : (
              <SearchableSelect
                options={siteOptions}
                value={siteSelectValue}
                onChange={handleSiteChange}
                placeholder="Select site (optional)"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹) *">
              <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" className={INPUT} />
            </Field>
            <Field label="Payment Status">
              <select value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)} className={INPUT}>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial</option>
                <option value="RECEIVED">Received</option>
              </select>
            </Field>
          </div>

          {/* Tax */}
          <div className="rounded-xl border border-[var(--border)] p-4 flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isTaxApplicable}
                onChange={e => set('isTaxApplicable', e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-amber-500"
              />
              <span className="text-[11px] font-semibold text-[var(--text-primary)]">Tax Applicable</span>
            </label>
            {form.isTaxApplicable && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tax Type">
                  <select value={form.taxType} onChange={e => set('taxType', e.target.value)} className={INPUT}>
                    <option value="">Select type</option>
                    <option value="GST">GST</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </Field>
                <Field label="Tax %">
                  <input type="number" min="0" max="100" step="0.01" value={form.taxPercent} onChange={e => set('taxPercent', e.target.value)} placeholder="0" className={INPUT} />
                </Field>
              </div>
            )}
            {form.amount && (
              <div className="grid grid-cols-2 gap-3 bg-[var(--bg)] rounded-lg p-3">
                <div>
                  <p className="text-[9px] text-[var(--text-muted)] uppercase font-semibold tracking-wide">Tax Amount</p>
                  <p className="text-[12px] font-bold text-amber-400 mt-0.5">₹{taxAmount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[var(--text-muted)] uppercase font-semibold tracking-wide">Final Amount</p>
                  <p className="text-[12px] font-bold text-emerald-400 mt-0.5">₹{finalAmount.toLocaleString('en-IN')}</p>
                </div>
              </div>
            )}
          </div>

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
                  <button type="button" onClick={() => { setAddingPurpose(false); setNewPurposeName(''); }} className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 shrink-0 text-[11px]">
                    ✕
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
            <Field label="Mode of Payment *">
              <select value={form.modeOfPayment} onChange={e => set('modeOfPayment', e.target.value)} required className={INPUT}>
                <option value="">Select mode</option>
                <option value="CASH">Cash</option>
                <option value="ONLINE">Online</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
          </div>

          {form.modeOfPayment === 'ONLINE' && (
            <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-400 font-medium">
              Online payments require Super Admin approval before they are finalized.
            </div>
          )}

          <Field label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Additional notes…" className={`${INPUT} resize-none`} />
          </Field>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-[11px] font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 rounded-xl text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : existing ? 'Update Challan' : 'Create Challan'}
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
