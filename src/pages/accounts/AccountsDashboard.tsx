import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock, TrendingUp } from 'lucide-react';
import { accountsDashboardApi } from '../../services/accounts.api.js';
import type { User } from '../../context/AuthContext.js';
import { useRouter } from '../../context/RouterContext.js';

interface Props { currentUser: User; }

interface Stats {
  inflow: {
    totalInflow: { _sum: { finalAmount: string | null } };
    pendingApprovals: number;
    thisMonthInflow: { _sum: { finalAmount: string | null } };
  };
  outflow: {
    totalOutflow: { _sum: { amount: string | null } };
    pendingApprovals: number;
    thisMonthOutflow: { _sum: { amount: string | null } };
  };
}

function StatCard({ label, value, icon, color, sub }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
        <span className={`p-2 rounded-lg ${color}`}>{icon}</span>
      </div>
      <div>
        <p className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function fmt(val: string | null | undefined) {
  if (!val) return '₹0';
  const n = parseFloat(val);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export const AccountsDashboard: React.FC<Props> = () => {
  const { navigate } = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountsDashboardApi.stats()
      .then(r => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[13px] text-[var(--text-muted)]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Inflow"
          value={fmt(stats?.inflow.totalInflow._sum.finalAmount)}
          icon={<ArrowDownLeft size={15} className="text-emerald-500" />}
          color="bg-emerald-500/10"
        />
        <StatCard
          label="This Month Inflow"
          value={fmt(stats?.inflow.thisMonthInflow._sum.finalAmount)}
          icon={<TrendingUp size={15} className="text-emerald-400" />}
          color="bg-emerald-500/10"
          sub="Current month"
        />
        <StatCard
          label="Total Outflow"
          value={fmt(stats?.outflow.totalOutflow._sum.amount)}
          icon={<ArrowUpRight size={15} className="text-red-400" />}
          color="bg-red-500/10"
        />
        <StatCard
          label="This Month Outflow"
          value={fmt(stats?.outflow.thisMonthOutflow._sum.amount)}
          icon={<TrendingUp size={15} className="text-red-400" />}
          color="bg-red-500/10"
          sub="Current month"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => navigate('/accounts/inflow?status=SUBMITTED')}
          className="cursor-pointer rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 flex items-center gap-4 hover:border-amber-500/50 transition-colors"
        >
          <span className="p-3 rounded-xl bg-amber-500/15">
            <Clock size={18} className="text-amber-500" />
          </span>
          <div>
            <p className="text-[22px] font-bold text-amber-500">{stats?.inflow.pendingApprovals ?? 0}</p>
            <p className="text-[12px] text-[var(--text-muted)] font-medium">Inflow Pending Approval</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/accounts/outflow?status=SUBMITTED')}
          className="cursor-pointer rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 flex items-center gap-4 hover:border-amber-500/50 transition-colors"
        >
          <span className="p-3 rounded-xl bg-amber-500/15">
            <Clock size={18} className="text-amber-500" />
          </span>
          <div>
            <p className="text-[22px] font-bold text-amber-500">{stats?.outflow.pendingApprovals ?? 0}</p>
            <p className="text-[12px] text-[var(--text-muted)] font-medium">Outflow Pending Approval</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/accounts/inflow')}
          className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-emerald-400 border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
        >
          View All Inflow
        </button>
        <button
          onClick={() => navigate('/accounts/outflow')}
          className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-red-400 border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 transition-colors"
        >
          View All Outflow
        </button>
      </div>
    </div>
  );
};
