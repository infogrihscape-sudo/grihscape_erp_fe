import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { outflowApi, accountsMasterApi, type OutflowExpense, type ExpenseCategoryMaster, type SiteNameMaster } from '../../services/accounts.api.js';
import type { User } from '../../context/AuthContext.js';
import { useRouter } from '../../context/RouterContext.js';
import { useToast } from '../../context/ToastContext.js';
import { canWrite } from '../../config/permissions.js';
import { OutflowForm } from './OutflowForm.js';

interface Props { currentUser: User; }

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-stone-700/40 text-stone-400',
  SUBMITTED: 'bg-amber-500/15 text-amber-400',
  APPROVED:  'bg-emerald-500/15 text-emerald-400',
  REJECTED:  'bg-red-500/15 text-red-400',
};

const SERVICE_LABELS: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Arch. Consultation',
  INTERIOR_DESIGN:            'Interior Design',
  PMC:                        'PMC',
  TURNKEY_CONSTRUCTION:       'Turnkey',
  INTERIOR_EXECUTION:         'Int. Execution',
  RENOVATION:                 'Renovation',
  END_TO_END_SOLUTION:        'End-to-End',
};

export const OutflowList: React.FC<Props> = ({ currentUser }) => {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<OutflowExpense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<ExpenseCategoryMaster[]>([]);
  const [siteFilter, setSiteFilter] = useState('');
  const [siteNames, setSiteNames] = useState<SiteNameMaster[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    accountsMasterApi.listCategories().then(r => setCategories(r.data.data)).catch(() => {});
    accountsMasterApi.listActiveProjects().then(r => setProjects(r.data.data)).catch(() => {});
    accountsMasterApi.listSiteNames().then(r => setSiteNames(r.data.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const isCustomSite = siteFilter.startsWith('__site__');
      const res = await outflowApi.list({
        search, status, categoryId,
        siteId: !isCustomSite && siteFilter ? siteFilter : undefined,
        siteName: isCustomSite ? siteFilter.slice(8) : undefined,
        startDate, endDate, page, pageSize: 20,
      });
      setExpenses(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to load expenses.', 'error');
    }
    finally { setLoading(false); }
  }, [search, status, categoryId, siteFilter, startDate, endDate, page]);

  useEffect(() => { load(); }, [load]);

  const canAct = canWrite(currentUser.role);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search expenses…"
            className="w-full pl-9 pr-3 py-2 text-[11px] rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[#b89047]/60"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-stone-500 shrink-0" />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="text-[11px] py-2 px-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none cursor-pointer">
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }} className="text-[11px] py-2 px-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none cursor-pointer">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={siteFilter} onChange={e => { setSiteFilter(e.target.value); setPage(1); }} className="text-[11px] py-2 px-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none cursor-pointer">
            <option value="">All Sites</option>
            {projects.map(p => {
              const label = `${p.prospect.client.clientName} - ${p.prospect.serviceType.split(',').map((s: string) => SERVICE_LABELS[s.trim()] ?? s.trim()).join(', ')}`;
              return <option key={p.id} value={p.id}>{label}</option>;
            })}
            {siteNames.length > 0 && <option disabled>──────────</option>}
            {siteNames.map(s => (
              <option key={s.id} value={`__site__${s.name}`}>{s.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2 py-1 flex-wrap">
            <span className="px-1 text-[10px] uppercase font-bold text-stone-500">Date:</span>
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="bg-transparent border-0 outline-none text-[var(--text-primary)] focus:ring-0 text-[10px] w-[100px] p-0" />
            <span className="text-stone-500">to</span>
            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="bg-transparent border-0 outline-none text-[var(--text-primary)] focus:ring-0 text-[10px] w-[100px] p-0" />
          </div>
        </div>

        {canAct && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all shrink-0"
          >
            <Plus size={13} /> New Expense
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[11px] text-[var(--text-muted)]">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[11px] text-[var(--text-muted)]">No expenses found.</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-left">
                {['Date', 'Paid To', 'Category', 'Type', 'Amount', 'Mode', 'PM', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="border-b border-[var(--border)] hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{e.name}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{e.category?.name}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{e.expenseType}</td>
                  <td className="px-4 py-3 font-semibold text-red-400">₹{Number(e.amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{e.modeOfPayment}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{e.projectManager?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${STATUS_COLORS[e.status]}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/accounts/outflow/${e.id}`)}
                      className="p-1.5 rounded-lg hover:bg-white/8 text-stone-400 hover:text-stone-200 transition-colors"
                    >
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>{total} total records</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white/8 disabled:opacity-40 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="font-medium">Page {page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white/8 disabled:opacity-40 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <OutflowForm
          currentUser={currentUser}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
};
