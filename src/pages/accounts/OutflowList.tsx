import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { outflowApi, accountsMasterApi, type OutflowExpense, type ExpenseCategoryMaster } from '../../services/accounts.api.js';
import type { User } from '../../context/AuthContext.js';
import { useRouter } from '../../context/RouterContext.js';
import { canWrite } from '../../config/permissions.js';
import { OutflowForm } from './OutflowForm.js';

interface Props { currentUser: User; }

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-stone-700/40 text-stone-400',
  SUBMITTED: 'bg-amber-500/15 text-amber-400',
  APPROVED:  'bg-emerald-500/15 text-emerald-400',
  REJECTED:  'bg-red-500/15 text-red-400',
};

export const OutflowList: React.FC<Props> = ({ currentUser }) => {
  const { navigate } = useRouter();
  const [expenses, setExpenses] = useState<OutflowExpense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<ExpenseCategoryMaster[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    accountsMasterApi.listCategories().then(r => setCategories(r.data.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await outflowApi.list({ search, status, categoryId, page, pageSize: 20 });
      setExpenses(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch { }
    finally { setLoading(false); }
  }, [search, status, categoryId, page]);

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

        <div className="flex items-center gap-2">
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
        </div>

        {canAct && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all"
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
                {['Date', 'Name', 'Category', 'Type', 'Amount', 'Mode', 'PM', 'Status', ''].map(h => (
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
