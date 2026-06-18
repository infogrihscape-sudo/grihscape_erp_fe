import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { inflowApi, type InflowChallan } from '../../services/accounts.api.js';
import type { User } from '../../context/AuthContext.js';
import { useRouter } from '../../context/RouterContext.js';
import { canWrite } from '../../config/permissions.js';
import { InflowForm } from './InflowForm.js';

interface Props { currentUser: User; }

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-stone-700/40 text-stone-400',
  SUBMITTED: 'bg-amber-500/15 text-amber-400',
  APPROVED:  'bg-emerald-500/15 text-emerald-400',
  REJECTED:  'bg-red-500/15 text-red-400',
};

const MODE_LABELS: Record<string, string> = { CASH: 'Cash', ONLINE: 'Online', OTHER: 'Other' };

export const InflowList: React.FC<Props> = ({ currentUser }) => {
  const { navigate } = useRouter();
  const [challans, setChallans] = useState<InflowChallan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inflowApi.list({ search, status, page, pageSize: 20 });
      setChallans(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch { /* toast handled globally */ }
    finally { setLoading(false); }
  }, [search, status, page]);

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
            placeholder="Search challan, client…"
            className="w-full pl-9 pr-3 py-2 text-[11px] rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[#b89047]/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-stone-500 shrink-0" />
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="text-[11px] py-2 px-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {canAct && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all"
          >
            <Plus size={13} />
            New Challan
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[11px] text-[var(--text-muted)]">Loading…</div>
        ) : challans.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[11px] text-[var(--text-muted)]">No challans found.</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-left">
                {['Sr#', 'Challan No', 'Date', 'Client', 'Site', 'Amount', 'Tax', 'Final', 'Mode', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {challans.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--border)] hover:bg-white/3 transition-colors"
                >
                  <td className="px-4 py-3 text-[var(--text-muted)]">{c.srNo}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-[var(--text-primary)]">{c.challanNo}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{new Date(c.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-[var(--text-primary)] font-medium">{c.clientName}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{c.siteName ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {c.isTaxApplicable ? `${c.taxPercent}% ${c.taxType}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-400">₹{Number(c.finalAmount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{MODE_LABELS[c.modeOfPayment]}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/accounts/inflow/${c.id}`)}
                      className="p-1.5 rounded-lg hover:bg-white/8 text-stone-400 hover:text-stone-200 transition-colors"
                      aria-label="View"
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
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded-lg hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-medium">Page {page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <InflowForm
          currentUser={currentUser}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
};
