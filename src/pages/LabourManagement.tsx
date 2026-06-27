import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users2, Plus, Search, X, Edit2, Power, PowerOff,
  CheckCircle, Clock, CalendarDays, ChevronLeft, ChevronRight,
  AlertCircle, Save, RefreshCw, Loader2, BarChart3,
  TrendingUp, UserCheck, UserX, Building2, Wallet, Calculator,
  FileText, AlertTriangle, Phone, PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { labourApi, projectApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Constants ──────────────────────────────────────────────────────────────

const TRADE_TYPES = [
  { value: 'MASON',       label: 'Mason' },
  { value: 'CARPENTER',   label: 'Carpenter' },
  { value: 'PLUMBER',     label: 'Plumber' },
  { value: 'ELECTRICIAN', label: 'Electrician' },
  { value: 'PAINTER',     label: 'Painter' },
  { value: 'HELPER',      label: 'Helper' },
  { value: 'SUPERVISOR',  label: 'Supervisor' },
  { value: 'WELDER',      label: 'Welder' },
  { value: 'STEEL_FIXER', label: 'Steel Fixer' },
  { value: 'TILE_LAYER',  label: 'Tile Layer' },
  { value: 'OTHER',       label: 'Other' },
];

const ATTENDANCE_STATUSES = [
  { value: 'PRESENT',  label: 'Present',  color: '#10b981' },
  { value: 'ABSENT',   label: 'Absent',   color: '#ef4444' },
  { value: 'HALF_DAY', label: 'Half Day', color: '#f59e0b' },
  { value: 'ON_LEAVE', label: 'On Leave', color: '#6366f1' },
];

const STATUS_COLORS: Record<string, string> = {
  PRESENT:  'text-emerald-400 bg-emerald-400/10',
  ABSENT:   'text-red-400 bg-red-400/10',
  HALF_DAY: 'text-amber-400 bg-amber-400/10',
  ON_LEAVE: 'text-indigo-400 bg-indigo-400/10',
};
const STATUS_DOT: Record<string, string> = {
  PRESENT: 'bg-emerald-400', ABSENT: 'bg-red-400', HALF_DAY: 'bg-amber-400', ON_LEAVE: 'bg-indigo-400',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function nowTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function fmtLabel(tradeType: string, tradeCustom?: string | null) {
  return tradeType === 'OTHER' ? (tradeCustom || 'Other') : (TRADE_TYPES.find(t => t.value === tradeType)?.label ?? tradeType);
}
function getMonday(d: Date): string {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setUTCDate(m.getUTCDate() + diff);
  return m.toISOString().split('T')[0];
}
function addDays(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().split('T')[0];
}
function calcHours(cin?: string, cout?: string): string {
  if (!cin || !cout) return '—';
  const [ih, im] = cin.split(':').map(Number);
  const [oh, om] = cout.split(':').map(Number);
  const totalMin = (oh * 60 + om) - (ih * 60 + im);
  if (totalMin <= 0) return '⚠ invalid';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
function dayName(dateStr: string) {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
}
function monthName(m: number) {
  return new Date(2024, m - 1, 1).toLocaleString('en-IN', { month: 'long' });
}

// ─── Shared Components ────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
      <div className="rounded-lg p-2.5" style={{ backgroundColor: color + '20' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
        <div className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Labour Drawer ────────────────────────────────────────────────────────────

function LabourDrawer({ open, onClose, projectId, editData, onSaved }: {
  open: boolean; onClose: () => void; projectId: string;
  editData?: any | null; onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', tradeType: 'MASON', tradeCustom: '', contractorName: '', dailyWageRate: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name || '', phone: editData.phone || '',
        tradeType: editData.tradeType || 'MASON', tradeCustom: editData.tradeCustom || '',
        contractorName: editData.contractorName || '',
        dailyWageRate: editData.dailyWageRate ? String(editData.dailyWageRate) : '',
      });
    } else {
      setForm({ name: '', phone: '', tradeType: 'MASON', tradeCustom: '', contractorName: '', dailyWageRate: '' });
    }
    setErrors({});
    setLookupResult(null);
  }, [editData, open]);

  const PHONE_RE    = /^[6-9]\d{9}$/;
  const NAME_RE     = /^[A-Za-z\s.'-]{2,100}$/;
  const WAGE_MAX    = 10000;

  const setField = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const handlePhoneChange = (v: string) => {
    // Strip non-digits while typing
    const digits = v.replace(/\D/g, '').slice(0, 10);
    setField('phone', digits);
  };

  const handlePhoneLookup = async () => {
    if (!PHONE_RE.test(form.phone)) {
      setErrors(e => ({ ...e, phone: 'Enter a valid 10-digit Indian mobile number' }));
      return;
    }
    try {
      const res = await labourApi.lookupByPhone(form.phone);
      if (res.data.results?.length) setLookupResult(res.data.results[0]);
      else setLookupResult(null);
    } catch {}
  };

  const applyLookup = (r: any) => {
    setForm(f => ({ ...f, name: r.name, tradeType: r.tradeType, tradeCustom: r.tradeCustom || '', contractorName: r.contractorName || '', dailyWageRate: r.dailyWageRate ? String(r.dailyWageRate) : '' }));
    setErrors({});
    setLookupResult(null);
  };

  const validate = () => {
    const e: Record<string, string> = {};

    if (form.phone && !PHONE_RE.test(form.phone))
      e.phone = 'Must be a 10-digit Indian mobile number starting with 6–9';

    const name = form.name.trim();
    if (!name)
      e.name = 'Full name is required';
    else if (name.length < 2)
      e.name = 'Name must be at least 2 characters';
    else if (name.length > 100)
      e.name = 'Name must be under 100 characters';
    else if (!NAME_RE.test(name))
      e.name = 'Name can only contain letters, spaces, hyphens, or apostrophes';

    if (form.tradeType === 'OTHER') {
      const tc = form.tradeCustom.trim();
      if (!tc) e.tradeCustom = 'Please specify the trade type';
      else if (tc.length < 2) e.tradeCustom = 'Must be at least 2 characters';
      else if (tc.length > 50) e.tradeCustom = 'Must be under 50 characters';
    }

    const cName = form.contractorName.trim();
    if (cName && cName.length < 2) e.contractorName = 'Must be at least 2 characters';
    if (cName && cName.length > 100) e.contractorName = 'Must be under 100 characters';

    if (form.dailyWageRate) {
      const w = Number(form.dailyWageRate);
      if (isNaN(w) || w < 0)   e.dailyWageRate = 'Enter a valid positive amount';
      else if (w === 0)         e.dailyWageRate = 'Wage must be greater than ₹0';
      else if (w > WAGE_MAX)    e.dailyWageRate = `Maximum daily wage is ₹${WAGE_MAX.toLocaleString('en-IN')}`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        tradeType: form.tradeType,
        tradeCustom: form.tradeType === 'OTHER' ? form.tradeCustom.trim() : null,
        contractorName: form.contractorName.trim() || null,
        dailyWageRate: form.dailyWageRate ? Number(form.dailyWageRate) : null,
      };
      if (editData) {
        await labourApi.updateLabourer(projectId, editData.id, payload);
      } else {
        await labourApi.addLabourer(projectId, payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setErrors({ _global: err?.response?.data?.message || 'Failed to save labourer.' });
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[420px] bg-[var(--sidebar-bg)] border-l border-[var(--border-color)] flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{editData ? 'Edit Labourer' : 'Add Labourer'}</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Fill in the labourer details below</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] cursor-pointer border-0 bg-transparent"><X size={16} /></button>
        </div>

        <div className="p-6 flex flex-col gap-4 flex-1">
          {errors._global && <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2"><AlertCircle size={13} />{errors._global}</div>}

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Phone <span className="text-stone-400 font-normal normal-case">(optional — enables cross-site lookup)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)] font-semibold select-none">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`w-full pl-9 pr-3 py-2 bg-[var(--input-bg)] border text-[var(--text-primary)] text-[13px] rounded-lg outline-none transition focus:ring-2 focus:ring-amber-100/50 ${errors.phone ? 'border-rose-400' : form.phone.length === 10 && PHONE_RE.test(form.phone) ? 'border-emerald-500/50' : 'border-[rgba(197,168,128,0.35)] focus:border-[#c5a880]'}`}
                />
              </div>
              <button
                onClick={handlePhoneLookup}
                disabled={form.phone.length !== 10}
                className="px-3 py-2 rounded-lg bg-[var(--hover-bg)] text-[var(--text-muted)] text-xs font-medium border border-[var(--border-color)] hover:text-[var(--text-primary)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Search size={13} />
              </button>
            </div>
            {errors.phone
              ? <p className="text-[11px] text-rose-400 flex items-center gap-1"><AlertCircle size={10} />{errors.phone}</p>
              : form.phone.length > 0 && form.phone.length < 10
              ? <p className="text-[10px] text-[var(--text-muted)]">{10 - form.phone.length} more digits needed</p>
              : form.phone.length === 10 && PHONE_RE.test(form.phone)
              ? <p className="text-[10px] text-emerald-400">✓ Valid mobile number</p>
              : null
            }
            {lookupResult && (
              <div className="mt-1 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-amber-300">{lookupResult.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{fmtLabel(lookupResult.tradeType, lookupResult.tradeCustom)}</div>
                </div>
                <button onClick={() => applyLookup(lookupResult)} className="text-[10px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-1 rounded cursor-pointer border-0">Use this</button>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Full Name <span className="text-rose-500">*</span></label>
            <input
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              maxLength={100}
              className={`w-full bg-[var(--input-bg)] border text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-2 outline-none transition focus:ring-2 focus:ring-amber-100/50 ${errors.name ? 'border-rose-400' : 'border-[rgba(197,168,128,0.35)] focus:border-[#c5a880]'}`}
            />
            {errors.name
              ? <p className="text-[11px] text-rose-400 flex items-center gap-1"><AlertCircle size={10} />{errors.name}</p>
              : <p className="text-[10px] text-[var(--text-muted)]">Letters and spaces only · {form.name.length}/100</p>
            }
          </div>

          {/* Trade Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Trade Type <span className="text-rose-500">*</span></label>
            <select
              value={form.tradeType}
              onChange={e => setField('tradeType', e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[rgba(197,168,128,0.35)] text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-2 outline-none focus:border-[#c5a880] focus:ring-2 focus:ring-amber-100/50 transition"
            >
              {TRADE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {form.tradeType === 'OTHER' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Specify Trade <span className="text-rose-500">*</span></label>
              <input
                value={form.tradeCustom}
                onChange={e => setField('tradeCustom', e.target.value)}
                placeholder="e.g. Waterproofing Specialist"
                maxLength={50}
                className={`w-full bg-[var(--input-bg)] border text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-2 outline-none transition focus:ring-2 focus:ring-amber-100/50 ${errors.tradeCustom ? 'border-rose-400' : 'border-[rgba(197,168,128,0.35)] focus:border-[#c5a880]'}`}
              />
              {errors.tradeCustom && <p className="text-[11px] text-rose-400 flex items-center gap-1"><AlertCircle size={10} />{errors.tradeCustom}</p>}
            </div>
          )}

          {/* Contractor */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Contractor Name <span className="text-stone-400 font-normal normal-case">(optional)</span></label>
            <input
              value={form.contractorName}
              onChange={e => setField('contractorName', e.target.value)}
              placeholder="e.g. Sharma Construction"
              maxLength={100}
              className={`w-full bg-[var(--input-bg)] border text-[var(--text-primary)] text-[13px] rounded-lg px-3.5 py-2 outline-none transition focus:ring-2 focus:ring-amber-100/50 ${errors.contractorName ? 'border-rose-400' : 'border-[rgba(197,168,128,0.35)] focus:border-[#c5a880]'}`}
            />
            {errors.contractorName && <p className="text-[11px] text-rose-400 flex items-center gap-1"><AlertCircle size={10} />{errors.contractorName}</p>}
          </div>

          {/* Daily Wage */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Daily Wage Rate (₹) <span className="text-stone-400 font-normal normal-case">(optional)</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--text-muted)] font-bold">₹</span>
              <input
                type="number"
                min={1}
                max={10000}
                step={50}
                value={form.dailyWageRate}
                onChange={e => setField('dailyWageRate', e.target.value)}
                placeholder="650"
                className={`w-full pl-7 pr-3 py-2 bg-[var(--input-bg)] border text-[var(--text-primary)] text-[13px] rounded-lg outline-none transition focus:ring-2 focus:ring-amber-100/50 ${errors.dailyWageRate ? 'border-rose-400' : 'border-[rgba(197,168,128,0.35)] focus:border-[#c5a880]'}`}
              />
            </div>
            {errors.dailyWageRate
              ? <p className="text-[11px] text-rose-400 flex items-center gap-1"><AlertCircle size={10} />{errors.dailyWageRate}</p>
              : <p className="text-[10px] text-[var(--text-muted)]">₹1 – ₹10,000 · used for wage payout calculation</p>
            }
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-color)] flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-[var(--text-muted)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition cursor-pointer bg-transparent">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#8f6d2e] hover:-translate-y-px hover:shadow-md transition-all cursor-pointer border-0 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : <><Save size={14} />{editData ? 'Update' : 'Add Labourer'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Labour Register ────────────────────────────────────────────────────

function LabourRegisterTab({ projectId, role, siteName }: { projectId: string; role: string; siteName: string }) {
  const [labourers, setLabourers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editData, setEditData] = useState<any | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const canWrite = ['Super Admin', 'Admin', 'Site Engineer'].includes(role);
  const isAdmin  = ['Super Admin', 'Admin'].includes(role);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await labourApi.getLabourers(projectId, includeInactive);
      setLabourers(res.data.labourers || []);
    } catch {} finally { setLoading(false); }
  }, [projectId, includeInactive]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      await labourApi.toggleLabourer(projectId, id);
      await load();
    } catch {} finally { setToggling(null); }
  };

  const filtered = labourers.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    fmtLabel(l.tradeType, l.tradeCustom).toLowerCase().includes(search.toLowerCase()) ||
    (l.contractorName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Site assignment banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 text-[12px] text-[var(--text-secondary)]">
        <Building2 size={13} className="text-amber-400 shrink-0" />
        <span>Registering labourers for site: <span className="font-bold text-amber-400">{siteName}</span></span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, trade, contractor…" className="w-full pl-8 pr-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[12px] rounded-lg outline-none focus:border-[#c5a880] focus:ring-1 focus:ring-amber-200/30 transition" />
        </div>
        {isAdmin && (
          <label className="flex items-center gap-2 text-[12px] text-[var(--text-muted)] cursor-pointer select-none">
            <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} className="accent-amber-500 w-3.5 h-3.5" />
            Show Inactive
          </label>
        )}
        {canWrite && (
          <button onClick={() => { setEditData(null); setDrawerOpen(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#8f6d2e] hover:-translate-y-px hover:shadow-md transition-all cursor-pointer border-0">
            <Plus size={14} /> Add Labourer
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Sr.</th><th>Name</th><th>Trade</th><th>Contractor</th>
              <th>Wage/Day</th><th>Status</th><th>Total Records</th>
              {canWrite && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canWrite ? 8 : 7} className="py-10 text-center"><Loader2 className="animate-spin mx-auto" size={20} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={canWrite ? 8 : 7} className="py-10 text-center text-[var(--text-muted)] text-[13px]">{search ? 'No labourers match your search.' : 'No labourers registered for this site yet.'}</td></tr>
            ) : filtered.map((l, i) => (
              <tr key={l.id} className={!l.isActive ? 'opacity-50' : ''}>
                <td>{i + 1}</td>
                <td>
                  <div className="font-semibold text-[var(--text-primary)]">{l.name}</div>
                  {l.phone && <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><Phone size={9} />{l.phone}</div>}
                </td>
                <td><span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400">{fmtLabel(l.tradeType, l.tradeCustom)}</span></td>
                <td>{l.contractorName || <span className="text-[var(--text-muted)]">—</span>}</td>
                <td>{l.dailyWageRate ? `₹${Number(l.dailyWageRate).toLocaleString('en-IN')}` : <span className="text-[var(--text-muted)]">—</span>}</td>
                <td>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${l.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${l.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {l.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{l._count?.attendances ?? 0}</td>
                {canWrite && (
                  <td>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setEditData(l); setDrawerOpen(true); }} className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-amber-400 transition cursor-pointer border-0 bg-transparent"><Edit2 size={13} /></button>
                      {isAdmin && (
                        <button onClick={() => handleToggle(l.id)} disabled={toggling === l.id} className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-red-400 transition cursor-pointer border-0 bg-transparent disabled:opacity-50">
                          {toggling === l.id ? <Loader2 size={13} className="animate-spin" /> : l.isActive ? <PowerOff size={13} /> : <Power size={13} />}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LabourDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} projectId={projectId} editData={editData} onSaved={load} />
    </div>
  );
}

// ─── Tab: Attendance Entry ───────────────────────────────────────────────────

interface AttRow {
  labourId: string; name: string; trade: string;
  status: string; checkIn: string; checkOut: string;
  hoursDisplay: string; overtime: string; absentReason: string; remarks: string;
}

function AttendanceTab({ projectId, role }: { projectId: string; role: string }) {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<AttRow[]>([]);
  const [labourers, setLabourers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const canWrite = ['Super Admin', 'Admin', 'Site Engineer'].includes(role);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const [labRes, attRes] = await Promise.all([
        labourApi.getLabourers(projectId),
        labourApi.getAttendance(projectId, { date }),
      ]);
      const labs: any[] = labRes.data.labourers || [];
      const atts: any[] = attRes.data.records || [];
      setLabourers(labs);

      const attMap = new Map(atts.map((a: any) => [a.labourId, a]));
      setRows(labs.map(l => {
        const a = attMap.get(l.id);
        const checkIn  = a?.checkInTime  ? new Date(a.checkInTime).toISOString().slice(11, 16)  : '';
        const checkOut = a?.checkOutTime ? new Date(a.checkOutTime).toISOString().slice(11, 16) : '';
        return {
          labourId: l.id, name: l.name, trade: fmtLabel(l.tradeType, l.tradeCustom),
          status: a?.status || '',
          checkIn, checkOut,
          hoursDisplay: calcHours(checkIn, checkOut),
          overtime: a?.overtimeHours ? String(a.overtimeHours) : '',
          absentReason: a?.absentReason || '',
          remarks: a?.remarks || '',
        };
      }));
    } catch (e: any) { setError('Failed to load attendance data.'); }
    finally { setLoading(false); }
  }, [projectId, date]);

  useEffect(() => { load(); }, [load]);

  const updateRow = (idx: number, field: keyof AttRow, val: string) => {
    setRows(prev => {
      const next = [...prev];
      const row = { ...next[idx], [field]: val };
      if (field === 'checkIn' || field === 'checkOut') {
        row.hoursDisplay = calcHours(field === 'checkIn' ? val : row.checkIn, field === 'checkOut' ? val : row.checkOut);
      }
      // clear time if not PRESENT/HALF_DAY
      if (field === 'status' && !['PRESENT', 'HALF_DAY'].includes(val)) {
        row.checkIn = ''; row.checkOut = ''; row.hoursDisplay = '—'; row.overtime = '';
      }
      // clear absent reason if not ABSENT/ON_LEAVE
      if (field === 'status' && !['ABSENT', 'ON_LEAVE'].includes(val)) {
        row.absentReason = '';
      }
      next[idx] = row;
      return next;
    });
  };

  const markAll = (status: string) => {
    setRows(prev => prev.map(r => ({
      ...r, status,
      checkIn: ['PRESENT', 'HALF_DAY'].includes(status) ? r.checkIn : '',
      checkOut: ['PRESENT', 'HALF_DAY'].includes(status) ? r.checkOut : '',
      hoursDisplay: ['PRESENT', 'HALF_DAY'].includes(status) ? r.hoursDisplay : '—',
    })));
  };

  const handleSave = async () => {
    const toSave = rows.filter(r => r.status !== '');
    if (toSave.length === 0) { setError('Please mark at least one labourer\'s attendance.'); return; }

    const validationError = toSave.find(r => ['ABSENT', 'ON_LEAVE'].includes(r.status) && !r.absentReason.trim());
    if (validationError) { setError(`Please provide an absent reason for: ${validationError.name}`); return; }

    const timeError = toSave.find(r => r.checkIn && r.checkOut && r.checkOut <= r.checkIn);
    if (timeError) { setError(`Check-out must be after check-in for: ${timeError.name}`); return; }

    setSaving(true); setError('');
    try {
      await labourApi.bulkSaveAttendance(projectId, {
        date,
        records: toSave.map(r => ({
          labourId: r.labourId, status: r.status,
          checkInTime:   r.checkIn   || null,
          checkOutTime:  r.checkOut  || null,
          overtimeHours: r.overtime  ? Number(r.overtime) : null,
          absentReason:  r.absentReason || null,
          remarks:       r.remarks || null,
        })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to save attendance.'); }
    finally { setSaving(false); }
  };

  const today = todayStr();
  const isFuture = date > today;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(d => addDays(d, -1))} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--hover-bg)] text-[var(--text-muted)] cursor-pointer bg-transparent"><ChevronLeft size={14} /></button>
          <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-1.5 outline-none focus:border-[#c5a880] cursor-pointer" />
          <button onClick={() => setDate(d => { const n = addDays(d, 1); return n <= today ? n : d; })} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--hover-bg)] text-[var(--text-muted)] cursor-pointer bg-transparent"><ChevronRight size={14} /></button>
          <button onClick={() => setDate(today)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer transition">Today</button>
        </div>
        {canWrite && !isFuture && rows.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => markAll('PRESENT')} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer transition">Mark All Present</button>
            <button onClick={() => markAll('ABSENT')} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 cursor-pointer transition">Mark All Absent</button>
          </div>
        )}
      </div>

      {isFuture && <div className="flex items-center gap-2 text-amber-400 text-[13px] bg-amber-400/10 rounded-xl px-4 py-3 border border-amber-400/20"><AlertTriangle size={14} />Cannot record attendance for future dates.</div>}
      {error && <div className="flex items-center gap-2 text-red-400 text-[13px] bg-red-400/10 rounded-xl px-4 py-3 border border-red-400/20"><AlertCircle size={14} />{error}</div>}
      {saved && <div className="flex items-center gap-2 text-emerald-400 text-[13px] bg-emerald-400/10 rounded-xl px-4 py-3 border border-emerald-400/20"><CheckCircle size={14} />Attendance saved successfully!</div>}

      {/* Attendance grid */}
      <div className="table-container">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Sr.</th><th>Name</th><th>Trade</th><th>Status</th>
              {canWrite && !isFuture ? (
                <><th>Check In</th><th>Check Out</th><th>Hours</th><th>OT Hrs</th><th>Absent Reason</th><th>Remarks</th></>
              ) : (
                <><th>Check In</th><th>Check Out</th><th>Hours</th><th>Remarks</th></>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="py-10 text-center"><Loader2 className="animate-spin mx-auto" size={20} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="py-8 text-center text-[var(--text-muted)] text-[13px]">No active labourers found for this site. Add labourers in the Labour Register tab.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.labourId}>
                <td>{i + 1}</td>
                <td className="font-semibold text-[var(--text-primary)]">{r.name}</td>
                <td><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400">{r.trade}</span></td>
                <td>
                  {canWrite && !isFuture ? (
                    <select value={r.status} onChange={e => updateRow(i, 'status', e.target.value)} className={`text-[11px] font-semibold rounded-lg px-2 py-1 border outline-none cursor-pointer ${r.status ? STATUS_COLORS[r.status] + ' border-transparent' : 'bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                      <option value="">— Not Marked —</option>
                      {ATTENDANCE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  ) : r.status ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[r.status]}`}><span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[r.status]}`} />{ATTENDANCE_STATUSES.find(s => s.value === r.status)?.label}</span>
                  ) : <span className="text-[var(--text-muted)]">—</span>}
                </td>
                {canWrite && !isFuture ? (
                  <>
                    {/* Check In */}
                    <td>
                      {['PRESENT', 'HALF_DAY'].includes(r.status) ? (
                        <div className="flex flex-col items-start gap-1 min-w-[110px]">
                          {!r.checkIn ? (
                            <button
                              onClick={() => updateRow(i, 'checkIn', nowTimeStr())}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer transition whitespace-nowrap"
                            >
                              <Clock size={10} /> Check In
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="time"
                                value={r.checkIn}
                                onChange={e => updateRow(i, 'checkIn', e.target.value)}
                                className="bg-[var(--input-bg)] border border-emerald-500/40 text-emerald-300 text-[11px] font-mono rounded px-2 py-1 outline-none focus:border-emerald-400 w-[90px]"
                              />
                              <button
                                onClick={() => updateRow(i, 'checkIn', nowTimeStr())}
                                title="Stamp current time"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer transition font-bold"
                              >Now</button>
                            </div>
                          )}
                        </div>
                      ) : <span className="text-[var(--text-muted)] text-[11px]">—</span>}
                    </td>

                    {/* Check Out */}
                    <td>
                      {['PRESENT', 'HALF_DAY'].includes(r.status) ? (
                        <div className="flex flex-col items-start gap-1 min-w-[110px]">
                          {!r.checkOut ? (
                            <button
                              onClick={() => updateRow(i, 'checkOut', nowTimeStr())}
                              disabled={!r.checkIn}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 cursor-pointer transition disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              <Clock size={10} /> Check Out
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="time"
                                value={r.checkOut}
                                onChange={e => updateRow(i, 'checkOut', e.target.value)}
                                className="bg-[var(--input-bg)] border border-rose-500/40 text-rose-300 text-[11px] font-mono rounded px-2 py-1 outline-none focus:border-rose-400 w-[90px]"
                              />
                              <button
                                onClick={() => updateRow(i, 'checkOut', nowTimeStr())}
                                title="Stamp current time"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer transition font-bold"
                              >Now</button>
                            </div>
                          )}
                        </div>
                      ) : <span className="text-[var(--text-muted)] text-[11px]">—</span>}
                    </td>

                    {/* Hours worked */}
                    <td>
                      <span className={`font-mono text-[11px] font-bold ${
                        r.hoursDisplay === '—' ? 'text-[var(--text-muted)]'
                        : r.hoursDisplay.startsWith('⚠') ? 'text-rose-400'
                        : 'text-amber-400'
                      }`}>{r.hoursDisplay}</span>
                    </td>

                    <td><input type="number" min={0} max={12} step={0.5} value={r.overtime} disabled={!['PRESENT','HALF_DAY'].includes(r.status)} onChange={e => updateRow(i, 'overtime', e.target.value)} className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[11px] rounded px-2 py-1 outline-none focus:border-[#c5a880] disabled:opacity-30 w-16" /></td>
                    <td>
                      {['ABSENT','ON_LEAVE'].includes(r.status) ? (
                        <input value={r.absentReason} onChange={e => updateRow(i, 'absentReason', e.target.value)} placeholder="Reason *" className={`bg-[var(--input-bg)] border text-[var(--text-primary)] text-[11px] rounded px-2 py-1 outline-none focus:border-[#c5a880] w-36 ${!r.absentReason.trim() ? 'border-rose-400/50' : 'border-[var(--border-color)]'}`} />
                      ) : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td><input value={r.remarks} onChange={e => updateRow(i, 'remarks', e.target.value)} placeholder="Optional" className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[11px] rounded px-2 py-1 outline-none focus:border-[#c5a880] w-32" /></td>
                  </>
                ) : (
                  <>
                    <td className="font-mono text-[11px] text-emerald-300">{r.checkIn || <span className="text-[var(--text-muted)]">—</span>}</td>
                    <td className="font-mono text-[11px] text-rose-300">{r.checkOut || <span className="text-[var(--text-muted)]">—</span>}</td>
                    <td className="font-mono text-[11px] font-bold text-amber-400">{r.hoursDisplay}</td>
                    <td>{r.remarks || <span className="text-[var(--text-muted)]">—</span>}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canWrite && !isFuture && rows.length > 0 && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#8f6d2e] hover:-translate-y-px hover:shadow-lg transition-all cursor-pointer border-0 disabled:opacity-60">
            {saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : <><Save size={14} />Save Attendance</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Reports ─────────────────────────────────────────────────────────────

function ReportsTab({ projectId, role }: { projectId: string; role: string }) {
  const [subTab, setSubTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [date, setDate] = useState(todayStr());
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canMonthly = !['Site Engineer'].includes(role);
  const today = todayStr();

  const loadReport = useCallback(async () => {
    if (!projectId) return;
    setLoading(true); setError(''); setReport(null);
    try {
      let res;
      if (subTab === 'daily')   res = await labourApi.getDailyReport(projectId, date);
      else if (subTab === 'weekly') res = await labourApi.getWeeklyReport(projectId, weekStart);
      else if (subTab === 'monthly') res = await labourApi.getMonthlyReport(projectId, year, month);
      setReport(res?.data?.report || res?.data);
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to load report.'); }
    finally { setLoading(false); }
  }, [projectId, subTab, date, weekStart, year, month]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const SUB_TABS = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    ...(canMonthly ? [{ id: 'monthly', label: 'Monthly' }] : []),
  ] as const;

  return (
    <div className="space-y-4">
      {/* Sub-tab pills */}
      <div className="flex items-center gap-1 bg-[var(--input-bg)] rounded-xl p-1 w-fit border border-[var(--border-color)]">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)} className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer border-0 ${subTab === t.id ? 'bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Date controls */}
      <div className="flex items-center gap-3">
        {subTab === 'daily' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setDate(d => addDays(d, -1))} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--hover-bg)] text-[var(--text-muted)] cursor-pointer bg-transparent"><ChevronLeft size={14} /></button>
            <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-1.5 outline-none focus:border-[#c5a880]" />
            <button onClick={() => setDate(d => { const n = addDays(d, 1); return n <= today ? n : d; })} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--hover-bg)] text-[var(--text-muted)] cursor-pointer bg-transparent"><ChevronRight size={14} /></button>
          </div>
        )}
        {subTab === 'weekly' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--hover-bg)] text-[var(--text-muted)] cursor-pointer bg-transparent"><ChevronLeft size={14} /></button>
            <div className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-1.5">
              Week of {fmtDate(weekStart)} — {fmtDate(addDays(weekStart, 6))}
            </div>
            <button onClick={() => { const n = addDays(weekStart, 7); if (n <= today) setWeekStart(n); }} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--hover-bg)] text-[var(--text-muted)] cursor-pointer bg-transparent"><ChevronRight size={14} /></button>
          </div>
        )}
        {subTab === 'monthly' && canMonthly && (
          <div className="flex items-center gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-1.5 outline-none focus:border-[#c5a880]">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-1.5 outline-none focus:border-[#c5a880]">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
        <button onClick={loadReport} className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--hover-bg)] text-[var(--text-muted)] cursor-pointer bg-transparent"><RefreshCw size={14} /></button>
      </div>

      {error && <div className="flex items-center gap-2 text-red-400 text-[13px] bg-red-400/10 rounded-xl px-4 py-3"><AlertCircle size={14} />{error}</div>}

      {loading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-400" size={24} /></div>}

      {/* ── Daily Report ── */}
      {!loading && report && subTab === 'daily' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard label="Total Labourers" value={report.summary.total}    icon={<Users2 size={16} />}     color="#b89047" />
            <SummaryCard label="Present"         value={report.summary.present}  icon={<UserCheck size={16} />}  color="#10b981" />
            <SummaryCard label="Absent"          value={report.summary.absent}   icon={<UserX size={16} />}      color="#ef4444" />
            <SummaryCard label="Half Day"        value={report.summary.halfDay}  icon={<Clock size={16} />}      color="#f59e0b" />
            <SummaryCard label="On Leave"        value={report.summary.onLeave}  icon={<CalendarDays size={16} />} color="#6366f1" />
            <SummaryCard label="Total Hours"     value={`${report.summary.totalHours}h`} icon={<BarChart3 size={16} />} color="#06b6d4" />
          </div>
          <div className="table-container">
            <table className="erp-table">
              <thead><tr><th>Sr.</th><th>Name</th><th>Trade</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>OT Hrs</th><th>Absent Reason</th><th>Remarks</th></tr></thead>
              <tbody>
                {report.rows.length === 0 ? (
                  <tr><td colSpan={10} className="py-8 text-center text-[var(--text-muted)]">No labourers found.</td></tr>
                ) : report.rows.map((r: any, i: number) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td className="font-semibold text-[var(--text-primary)]">{r.name}</td>
                    <td><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400">{fmtLabel(r.tradeType, r.tradeCustom)}</span></td>
                    <td>
                      {r.status ? <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[r.status]}`}><span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[r.status]}`} />{ATTENDANCE_STATUSES.find(s => s.value === r.status)?.label}</span> : <span className="text-[var(--text-muted)] text-[11px]">Not Marked</span>}
                    </td>
                    <td className="font-mono text-[11px]">{r.checkIn || '—'}</td>
                    <td className="font-mono text-[11px]">{r.checkOut || '—'}</td>
                    <td className="font-mono text-[11px] text-amber-400">{r.hoursWorked != null ? r.hoursWorked + ' h' : '—'}</td>
                    <td className="font-mono text-[11px]">{r.overtimeHours ? r.overtimeHours + ' h' : '—'}</td>
                    <td>{r.absentReason || <span className="text-[var(--text-muted)]">—</span>}</td>
                    <td>{r.remarks || <span className="text-[var(--text-muted)]">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Weekly Report ── */}
      {!loading && report && subTab === 'weekly' && (
        <div className="space-y-4">
          <div className="table-container overflow-x-auto">
            <table className="erp-table" style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>Sr.</th><th>Name</th><th>Trade</th>
                  {(report.days || []).map((d: string) => <th key={d}><div className="text-[10px] text-[var(--text-muted)]">{dayName(d)}</div><div>{d.slice(8)}</div></th>)}
                  <th>Work Days</th><th>Total Hrs</th>
                </tr>
              </thead>
              <tbody>
                {(report.rows || []).length === 0 ? (
                  <tr><td colSpan={13} className="py-8 text-center text-[var(--text-muted)]">No data for this week.</td></tr>
                ) : (report.rows || []).map((r: any, i: number) => (
                  <tr key={r.labourId}>
                    <td>{i + 1}</td>
                    <td className="font-semibold text-[var(--text-primary)]">{r.name}</td>
                    <td><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400">{fmtLabel(r.tradeType, r.tradeCustom)}</span></td>
                    {(r.days || []).map((d: any) => (
                      <td key={d.date}>
                        {d.status ? (
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold ${STATUS_COLORS[d.status]}`} title={ATTENDANCE_STATUSES.find(s => s.value === d.status)?.label}>
                            {d.status === 'PRESENT' ? 'P' : d.status === 'ABSENT' ? 'A' : d.status === 'HALF_DAY' ? 'H' : 'L'}
                          </span>
                        ) : <span className="text-[var(--text-muted)] text-[10px]">—</span>}
                      </td>
                    ))}
                    <td className="font-semibold text-amber-400">{r.totalWorkDays}</td>
                    <td className="font-mono text-[11px]">{r.totalHours > 0 ? r.totalHours + 'h' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
            {[{s:'PRESENT',l:'P = Present'},{s:'ABSENT',l:'A = Absent'},{s:'HALF_DAY',l:'H = Half Day'},{s:'ON_LEAVE',l:'L = On Leave'}].map(({s,l}) => (
              <span key={s} className="flex items-center gap-1">
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${STATUS_COLORS[s]}`}>{s==='PRESENT'?'P':s==='ABSENT'?'A':s==='HALF_DAY'?'H':'L'}</span>{l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Monthly Report ── */}
      {!loading && report && subTab === 'monthly' && canMonthly && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Total Labourers" value={report.rows?.length ?? 0} icon={<Users2 size={16} />} color="#b89047" />
            <SummaryCard label="Total Work Days" value={report.rows?.reduce((s: number, r: any) => s + r.totalWorkDays, 0)?.toFixed(0) ?? '0'} icon={<BarChart3 size={16} />} color="#10b981" />
            <SummaryCard label="Total Hours" value={(report.rows?.reduce((s: number, r: any) => s + r.totalHours, 0) ?? 0) + 'h'} icon={<Clock size={16} />} color="#6366f1" />
            <SummaryCard label="Est. Wage Payout" value={`₹${(report.totalEstimatedWage ?? 0).toLocaleString('en-IN')}`} icon={<Wallet size={16} />} color="#f59e0b" />
          </div>
          <div className="table-container overflow-x-auto">
            <table className="erp-table" style={{ minWidth: '1200px' }}>
              <thead>
                <tr>
                  <th>Sr.</th><th>Name</th><th>Trade</th>
                  {(report.days || []).map((d: string) => <th key={d} className="text-[10px] !px-1">{d.slice(8)}</th>)}
                  <th>Present</th><th>Absent</th><th>Half Day</th><th>Work Days</th><th>Est. Wage</th>
                </tr>
              </thead>
              <tbody>
                {(report.rows || []).map((r: any, i: number) => (
                  <tr key={r.labourId}>
                    <td>{i + 1}</td>
                    <td className="font-semibold text-[var(--text-primary)] whitespace-nowrap">{r.name}</td>
                    <td><span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-400 whitespace-nowrap">{fmtLabel(r.tradeType, r.tradeCustom)}</span></td>
                    {(r.days || []).map((d: any) => (
                      <td key={d.date} className="!px-1">
                        {d.status ? (
                          <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-bold ${STATUS_COLORS[d.status]}`}>
                            {d.status === 'PRESENT' ? 'P' : d.status === 'ABSENT' ? 'A' : d.status === 'HALF_DAY' ? 'H' : 'L'}
                          </span>
                        ) : <span className="text-[var(--text-muted)] text-[9px]">·</span>}
                      </td>
                    ))}
                    <td className="text-emerald-400 font-semibold">{r.presentDays}</td>
                    <td className="text-red-400 font-semibold">{r.absentDays}</td>
                    <td className="text-amber-400 font-semibold">{r.halfDays}</td>
                    <td className="font-bold text-[var(--text-primary)]">{r.totalWorkDays}</td>
                    <td className="font-semibold text-amber-400">{r.estimatedWage != null ? `₹${r.estimatedWage.toLocaleString('en-IN')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
            {[{s:'PRESENT',l:'P = Present'},{s:'ABSENT',l:'A = Absent'},{s:'HALF_DAY',l:'H = Half Day'},{s:'ON_LEAVE',l:'L = On Leave'}].map(({s,l}) => (
              <span key={s} className="flex items-center gap-1">
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold ${STATUS_COLORS[s]}`}>{s==='PRESENT'?'P':s==='ABSENT'?'A':s==='HALF_DAY'?'H':'L'}</span>{l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Wage Payout ────────────────────────────────────────────────────────

function WagePayoutTab({ projectId }: { projectId: string }) {
  const [periodType, setPeriodType] = useState<'10_DAY' | 'MONTHLY'>('10_DAY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]   = useState('');
  const [result, setResult]  = useState<any>(null);
  const [loading, setLoading]= useState(false);
  const [error, setError]    = useState('');

  useEffect(() => {
    const now = new Date();
    if (periodType === '10_DAY') {
      const d = now.getUTCDate();
      const base = d <= 10 ? 1 : d <= 20 ? 11 : 21;
      const end  = d <= 10 ? 10 : d <= 20 ? 20 : new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
      const ms = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2,'0')}`;
      setStartDate(`${ms}-${String(base).padStart(2,'0')}`);
      setEndDate(`${ms}-${String(end).padStart(2,'0')}`);
    } else {
      const ms = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2,'0')}`;
      const lastDay = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
      setStartDate(`${ms}-01`);
      setEndDate(`${ms}-${String(lastDay).padStart(2,'0')}`);
    }
    setResult(null);
  }, [periodType]);

  const calculate = async () => {
    if (!startDate || !endDate || !projectId) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await labourApi.calculateWagePayout(projectId, startDate, endDate);
      setResult(res.data.payout);
    } catch (e: any) { setError(e?.response?.data?.message || 'Calculation failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 text-amber-400 text-[13px] font-semibold mb-1"><Wallet size={14} />Wage Payout Calculator</div>
        <p className="text-[11px] text-[var(--text-muted)]">Calculate wages for labourers based on attendance. Only unpaid records are included. After reviewing, submit a Site Payment Request (SPR) from the Project's construction payments section.</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-[var(--input-bg)] rounded-xl p-1 border border-[var(--border-color)]">
          {(['10_DAY', 'MONTHLY'] as const).map(t => (
            <button key={t} onClick={() => setPeriodType(t)} className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer border-0 ${periodType === t ? 'bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white' : 'text-[var(--text-muted)] bg-transparent hover:text-[var(--text-primary)]'}`}>
              {t === '10_DAY' ? 'Every 10 Days' : 'Monthly'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-1.5 outline-none focus:border-[#c5a880]" />
          <span className="text-[var(--text-muted)] text-[12px]">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[13px] rounded-lg px-3 py-1.5 outline-none focus:border-[#c5a880]" />
        </div>
        <button onClick={calculate} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#8f6d2e] hover:-translate-y-px hover:shadow-md transition-all cursor-pointer border-0 disabled:opacity-60">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Calculator size={13} />} Calculate
        </button>
      </div>

      {error && <div className="flex items-center gap-2 text-red-400 text-[13px] bg-red-400/10 rounded-xl px-4 py-3"><AlertCircle size={14} />{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">Period: {fmtDate(result.startDate)} — {fmtDate(result.endDate)}</div>
            <div className="text-[15px] font-bold text-amber-400">Total: ₹{result.grandTotal.toLocaleString('en-IN')}</div>
          </div>

          {result.rows?.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)] text-[13px]">No unpaid attendance records found for this period. All wages may already be paid out, or labourers have no daily wage rate set.</div>
          ) : (
            <div className="table-container">
              <table className="erp-table">
                <thead><tr><th>Sr.</th><th>Name</th><th>Trade</th><th>Contractor</th><th>Wage/Day</th><th>Present</th><th>Half Days</th><th>Work Days</th><th>Payout Amount</th></tr></thead>
                <tbody>
                  {result.rows.map((r: any, i: number) => (
                    <tr key={r.labourId}>
                      <td>{i + 1}</td>
                      <td className="font-semibold text-[var(--text-primary)]">{r.name}</td>
                      <td><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400">{fmtLabel(r.tradeType)}</span></td>
                      <td>{r.contractorName || <span className="text-[var(--text-muted)]">—</span>}</td>
                      <td>₹{Number(r.dailyWageRate).toLocaleString('en-IN')}</td>
                      <td className="text-emerald-400 font-semibold">{r.presentDays}</td>
                      <td className="text-amber-400 font-semibold">{r.halfDays}</td>
                      <td className="font-bold">{r.totalWorkDays}</td>
                      <td className="font-bold text-amber-400">₹{r.totalAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr className="bg-amber-500/5">
                    <td colSpan={7} className="font-bold text-right text-[var(--text-muted)]">Grand Total</td>
                    <td className="font-bold">{result.rows.reduce((s: number, r: any) => s + r.totalWorkDays, 0)}</td>
                    <td className="font-bold text-amber-400 text-[14px]">₹{result.grandTotal.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {result.rows?.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <FileText size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-[12px] font-semibold text-blue-300 mb-1">Next Step: Create a Site Payment Request</div>
                <div className="text-[11px] text-[var(--text-muted)]">To process this wage payout, go to the Project → Construction → Payments tab and create a new SPR with expense type <strong className="text-[var(--text-primary)]">LABOR</strong> for amount <strong className="text-amber-400">₹{result.grandTotal.toLocaleString('en-IN')}</strong>. Once the SPR is approved and linked, come back here to mark these records as paid.</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Overview (Admin/SA only) ───────────────────────────────────────────

function OverviewTab() {
  const [overview, setOverview] = useState<any[]>([]);
  const [loading, setLoading]  = useState(false);
  const [search, setSearch]    = useState('');

  useEffect(() => {
    setLoading(true);
    labourApi.getOverview()
      .then(res => setOverview(res.data.overview || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = overview.filter(o =>
    (o.siteName || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.clientName || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalLabourers = overview.reduce((s, o) => s + o.totalLabourers, 0);
  const totalPresent   = overview.reduce((s, o) => s + o.todayPresent, 0);
  const totalAbsent    = overview.reduce((s, o) => s + o.todayAbsent, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard label="Total Sites"     value={overview.length} icon={<Building2 size={16} />} color="#b89047" />
        <SummaryCard label="Total Labourers" value={totalLabourers}  icon={<Users2 size={16} />}    color="#6366f1" />
        <SummaryCard label="Today Present"   value={totalPresent}    icon={<UserCheck size={16} />} color="#10b981" />
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search site or client…" className="w-full pl-8 pr-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[12px] rounded-lg outline-none focus:border-[#c5a880]" />
      </div>

      <div className="table-container">
        <table className="erp-table">
          <thead><tr><th>Sr.</th><th>Site / Client</th><th>Project Status</th><th>Total Labourers</th><th>Today Present</th><th>Today Absent</th><th>Half Day</th><th>On Leave</th><th>Attendance %</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-10 text-center"><Loader2 className="animate-spin mx-auto" size={20} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-10 text-center text-[var(--text-muted)]">No sites found.</td></tr>
            ) : filtered.map((o, i) => (
              <tr key={o.projectId}>
                <td>{i + 1}</td>
                <td>
                  <div className="font-semibold text-[var(--text-primary)]">{o.siteName}</div>
                  {o.siteName !== o.clientName && <div className="text-[10px] text-[var(--text-muted)]">{o.clientName}</div>}
                </td>
                <td><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--hover-bg)] text-[var(--text-muted)]">{o.projectStatus?.replace(/_/g, ' ')}</span></td>
                <td className="font-semibold">{o.totalLabourers}</td>
                <td className="text-emerald-400 font-semibold">{o.todayPresent}</td>
                <td className="text-red-400 font-semibold">{o.todayAbsent}</td>
                <td className="text-amber-400 font-semibold">{o.todayHalfDay}</td>
                <td className="text-indigo-400 font-semibold">{o.todayOnLeave}</td>
                <td>
                  {o.attendancePct != null ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[var(--border-color)] rounded-full h-1.5 min-w-[60px]">
                        <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${o.attendancePct}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-400">{o.attendancePct}%</span>
                    </div>
                  ) : <span className="text-[var(--text-muted)]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Charts colours ──────────────────────────────────────────────────────────

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1'];

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a1c2b', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 11 },
  labelStyle: { color: '#a1a1aa' },
  itemStyle: { color: '#e2e8f0' },
};

// ─── Tab: Charts ─────────────────────────────────────────────────────────────

function ChartsTab({ projectId }: { projectId: string }) {
  const [period, setPeriod] = useState<'7' | '14' | '30'>('7');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true); setError(''); setData(null);
    try {
      const days = parseInt(period);
      const today = new Date();
      const startDate = new Date(today);
      startDate.setUTCDate(today.getUTCDate() - (days - 1));

      const startStr = startDate.toISOString().split('T')[0];
      const endStr   = today.toISOString().split('T')[0];

      const [labRes, attRes] = await Promise.all([
        labourApi.getLabourers(projectId, true),
        labourApi.getAttendance(projectId, { startDate: startStr, endDate: endStr }),
      ]);

      const labourers: any[] = labRes.data.labourers || [];
      const records: any[]   = attRes.data.records   || [];

      // --- Trend: daily present/absent counts over the period ---
      const trend: any[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setUTCDate(startDate.getUTCDate() + i);
        const ds = d.toISOString().split('T')[0];
        const dayRecs = records.filter((r: any) => r.attendanceDate?.startsWith(ds));
        trend.push({
          date: ds.slice(5),
          Present:  dayRecs.filter((r: any) => r.status === 'PRESENT').length,
          Absent:   dayRecs.filter((r: any) => r.status === 'ABSENT').length,
          'Half Day': dayRecs.filter((r: any) => r.status === 'HALF_DAY').length,
          'On Leave': dayRecs.filter((r: any) => r.status === 'ON_LEAVE').length,
        });
      }

      // --- Today pie: overall status breakdown ---
      const todayStr = today.toISOString().split('T')[0];
      const todayRecs = records.filter((r: any) => r.attendanceDate?.startsWith(todayStr));
      const pie = [
        { name: 'Present',  value: todayRecs.filter((r: any) => r.status === 'PRESENT').length },
        { name: 'Absent',   value: todayRecs.filter((r: any) => r.status === 'ABSENT').length },
        { name: 'Half Day', value: todayRecs.filter((r: any) => r.status === 'HALF_DAY').length },
        { name: 'On Leave', value: todayRecs.filter((r: any) => r.status === 'ON_LEAVE').length },
      ].filter(p => p.value > 0);

      // --- Trade-wise bar: active labourers per trade ---
      const tradeMap: Record<string, number> = {};
      labourers.filter((l: any) => l.isActive).forEach((l: any) => {
        const label = l.tradeType === 'OTHER' ? (l.tradeCustom || 'Other') : l.tradeType.replace('_', ' ');
        tradeMap[label] = (tradeMap[label] || 0) + 1;
      });
      const tradeBar = Object.entries(tradeMap)
        .map(([trade, count]) => ({ trade, count }))
        .sort((a, b) => b.count - a.count);

      // --- Per-labourer attendance rate over the period ---
      const labourRate = labourers.slice(0, 12).map((l: any) => {
        const recs = records.filter((r: any) => r.labourId === l.id && r.status === 'PRESENT');
        const pct  = days > 0 ? Math.round((recs.length / days) * 100) : 0;
        return { name: l.name.split(' ')[0], pct };
      }).sort((a, b) => b.pct - a.pct);

      setData({ trend, pie, tradeBar, labourRate, total: labourers.length, active: labourers.filter((l: any) => l.isActive).length });
    } catch (e: any) { setError('Failed to load chart data.'); }
    finally { setLoading(false); }
  }, [projectId, period]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-[13px] font-bold text-[var(--text-primary)]">Site Labour Analytics</h2>
        <div className="flex items-center gap-1 bg-[var(--input-bg)] rounded-xl p-1 border border-[var(--border-color)]">
          {(['7', '14', '30'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border-0 ${period === p ? 'bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white' : 'text-[var(--text-muted)] bg-transparent hover:text-[var(--text-primary)]'}`}>
              {p}D
            </button>
          ))}
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-400 text-[13px] bg-red-400/10 rounded-xl px-4 py-3"><AlertCircle size={14} />{error}</div>}
      {loading && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-400" size={28} /></div>}

      {data && !loading && (
        <div className="space-y-6">
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Total Registered" value={data.total}  icon={<Users2 size={16} />}     color="#b89047" />
            <SummaryCard label="Active"            value={data.active} icon={<UserCheck size={16} />}  color="#10b981" />
            <SummaryCard label="Inactive"          value={data.total - data.active} icon={<UserX size={16} />} color="#ef4444" />
            <SummaryCard label="Trades Covered"    value={data.tradeBar.length}     icon={<BarChart3 size={16} />} color="#6366f1" />
          </div>

          {/* Row 1: Attendance trend + Today pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5">
              <h3 className="text-[12px] font-bold text-[var(--text-primary)] mb-4">Daily Attendance Trend — Last {period} Days</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.trend} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#71717a' }} allowDecimals={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Present"  fill="#10b981" radius={[3,3,0,0]} />
                  <Bar dataKey="Absent"   fill="#ef4444" radius={[3,3,0,0]} />
                  <Bar dataKey="Half Day" fill="#f59e0b" radius={[3,3,0,0]} />
                  <Bar dataKey="On Leave" fill="#6366f1" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5">
              <h3 className="text-[12px] font-bold text-[var(--text-primary)] mb-4">Today's Status Breakdown</h3>
              {data.pie.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] text-[var(--text-muted)] text-[12px]">No attendance marked today</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={data.pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                        {data.pie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center mt-2">
                    {data.pie.map((p: any, i: number) => (
                      <div key={p.name} className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {p.name}: <span className="font-bold text-[var(--text-primary)]">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Trade distribution + Labourer attendance rate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5">
              <h3 className="text-[12px] font-bold text-[var(--text-primary)] mb-4">Labourers by Trade Type</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.tradeBar} layout="vertical" barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#71717a' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="trade" tick={{ fontSize: 9, fill: '#71717a' }} width={70} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="Labourers" fill="#b89047" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5">
              <h3 className="text-[12px] font-bold text-[var(--text-primary)] mb-1">Labourer Attendance Rate — Last {period} Days</h3>
              <p className="text-[10px] text-[var(--text-muted)] mb-4">(Top 12 labourers, % days present)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.labourRate} layout="vertical" barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: '#71717a' }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#71717a' }} width={55} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => `${v}%`} />
                  <Bar dataKey="pct" name="Attendance %" radius={[0,3,3,0]}>
                    {data.labourRate.map((_: any, i: number) => (
                      <Cell key={i} fill={_ .pct >= 80 ? '#10b981' : _.pct >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LabourManagement() {
  const { user } = useAuth();
  const role = user?.role || '';

  const [projects, setProjects]       = useState<any[]>([]);
  const [selectedProject, setSelected]= useState('');
  const [loadingProjects, setLoadProj]= useState(true);
  const [activeTab, setActiveTab]     = useState<'register' | 'attendance' | 'reports' | 'payout' | 'charts' | 'overview'>('register');

  const isAdmin   = ['Super Admin', 'Admin'].includes(role);
  const canWrite  = ['Super Admin', 'Admin', 'Site Engineer'].includes(role);
  const showPayout = canWrite;

  // PM sees only reports (monthly)
  const tabs = useMemo(() => {
    const all = [
      { id: 'register',   label: 'Labour Register', icon: <Users2 size={14} />,          hidden: role === 'Project Manager' },
      { id: 'attendance', label: 'Attendance',       icon: <UserCheck size={14} />,       hidden: role === 'Project Manager' },
      { id: 'reports',    label: 'Reports',          icon: <BarChart3 size={14} />,       hidden: false },
      { id: 'charts',     label: 'Charts',           icon: <PieChartIcon size={14} />,   hidden: role === 'Project Manager' },
      { id: 'payout',     label: 'Wage Payout',      icon: <Wallet size={14} />,          hidden: !showPayout },
      { id: 'overview',   label: 'Overview',         icon: <TrendingUp size={14} />,      hidden: !isAdmin },
    ] as const;
    return all.filter(t => !t.hidden);
  }, [role, isAdmin, showPayout]);

  useEffect(() => {
    labourApi.getProjects()
      .then(res => {
        const p = res.data.projects || [];
        setProjects(p);
        if (p.length > 0 && activeTab !== 'overview') setSelected(p[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadProj(false));
  }, []);

  // ensure active tab is valid
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id as any);
    }
  }, [tabs, activeTab]);

  const projectLabel = (p: any): string => {
    const client = p.prospect?.client?.clientName?.trim() || '';
    const site   = p.prospect?.siteAddress?.trim() || '';
    if (client && site && site.toLowerCase() !== client.toLowerCase())
      return `${client} — ${site}`;
    return client || site || p.id.slice(0, 8);
  };

  // If two projects share the same base label, suffix with formatted status to disambiguate
  const labelCount = projects.reduce<Record<string, number>>((acc, p) => {
    const l = projectLabel(p);
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {});

  const projectDisplayLabel = (p: any): string => {
    const base = projectLabel(p);
    if ((labelCount[base] || 0) > 1) {
      const status = (p.status || '').replace(/_/g, ' ');
      return `${base}  [${status}]`;
    }
    return base;
  };

  const selectedProjectObj = projects.find(p => p.id === selectedProject);
  const siteName = selectedProjectObj ? projectLabel(selectedProjectObj) : '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(234,88,12,0.12)' }}>
            <Users2 size={16} style={{ color: '#ea580c' }} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-[var(--text-primary)]">Labour Management</h1>
            <p className="text-[11px] text-[var(--text-muted)]">Attendance, daily reports, and wage payout for site labourers</p>
          </div>
        </div>

        {/* Project selector (hidden for overview tab) */}
        {activeTab !== 'overview' && (
          <div className="flex items-center gap-2">
            <Building2 size={13} className="text-[var(--text-muted)]" />
            {loadingProjects ? (
              <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />
            ) : projects.length === 0 ? (
              <span className="text-[12px] text-[var(--text-muted)]">No sites assigned</span>
            ) : (
              <select value={selectedProject} onChange={e => setSelected(e.target.value)} className="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] text-[12px] rounded-lg px-3 py-1.5 outline-none focus:border-[#c5a880] max-w-[320px] cursor-pointer">
                {projects.map(p => <option key={p.id} value={p.id}>{projectDisplayLabel(p)}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b border-[var(--border-color)] flex-shrink-0 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-all cursor-pointer bg-transparent whitespace-nowrap ${activeTab === t.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab !== 'overview' && !selectedProject && !loadingProjects && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Building2 size={32} className="text-[var(--text-muted)] opacity-40" />
            <p className="text-[13px] text-[var(--text-muted)]">No project selected or no projects are assigned to you.</p>
          </div>
        )}

        {activeTab === 'register'   && selectedProject && <LabourRegisterTab projectId={selectedProject} role={role} siteName={siteName} />}
        {activeTab === 'attendance' && selectedProject && <AttendanceTab      projectId={selectedProject} role={role} />}
        {activeTab === 'reports'    && selectedProject && <ReportsTab         projectId={selectedProject} role={role} />}
        {activeTab === 'charts'     && selectedProject && <ChartsTab          projectId={selectedProject} />}
        {activeTab === 'payout'     && selectedProject && showPayout && <WagePayoutTab projectId={selectedProject} />}
        {activeTab === 'overview'   && isAdmin && <OverviewTab />}
      </div>
    </div>
  );
}
