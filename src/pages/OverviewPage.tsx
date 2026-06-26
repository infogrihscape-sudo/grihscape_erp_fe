import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { userApi, prospectApi, leadApi, projectApi } from '../services/api.js';
import { accountsDashboardApi } from '../services/accounts.api.js';
import type { User } from '../context/AuthContext.js';
import {
  User as UserIcon, Mail, Phone, FileText, Database, Users,
  Activity, CheckCircle2, Cpu, RefreshCw, Landmark, TrendingUp,
  BarChart3, MapPin, PlusCircle, Target, ClipboardList, Award, Home,
  HardHat, Clock, Building2, Palette, ArrowRight,
  ArrowDownLeft, ArrowUpRight, CreditCard,
} from 'lucide-react';
import { ShimmerCardGrid, ShimmerTable } from '../components/Shimmer.js';

const roleLabel = (r: string) => r;

// Budget Conversion Helpers
const getBudgetInLakhs = (amount?: number | null, unit?: string | null): number => {
  if (!amount) return 0;
  if (unit === 'CRORE') return amount * 100;
  return amount; // LAKH or standard
};

const formatBudget = (valueInLakhs: number): string => {
  if (valueInLakhs >= 100) {
    const crores = valueInLakhs / 100;
    return `₹${crores.toFixed(2).replace(/\.00$/, '')} Cr`;
  }
  return `₹${valueInLakhs.toFixed(0)} L`;
};

const fmtAcc = (n: number): string => {
  const v = isNaN(n) || !isFinite(n) ? 0 : n;
  return v >= 1e7 ? `₹${(v / 1e7).toFixed(2)} Cr`
    : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)} L`
    : `₹${v.toLocaleString('en-IN')}`;
};

const serviceLabels: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Architectural Consultation',
  INTERIOR_DESIGN: 'Interior Design',
  PMC: 'PMC',
  TURNKEY_CONSTRUCTION: 'Turnkey Construction',
  INTERIOR_EXECUTION: 'Interior Execution',
  RENOVATION: 'Renovation',
  END_TO_END: 'End-to-End Solution',
};

// ─── Project-role dashboard (PM / Arch / Site Engineer) ──────────────────────
const PROJECT_STAGE_CONFIG = [
  { key: 'PENDING_ASSIGNMENT', label: 'Pending Assignment', short: 'Pending',  gradient: 'from-amber-400 to-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/30',    text: 'text-amber-600 dark:text-amber-400',   pill: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { key: 'ASSIGNED',           label: 'Team Assigned',      short: 'Assigned', gradient: 'from-blue-400 to-blue-500',     bg: 'bg-blue-50 dark:bg-blue-950/30',      text: 'text-blue-600 dark:text-blue-400',     pill: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { key: 'SITE_VERIFICATION',  label: 'Site Verification',  short: 'On-Site',  gradient: 'from-purple-400 to-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30',  text: 'text-purple-600 dark:text-purple-400', pill: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { key: 'CDRF_PENDING',       label: 'CDRF Pending',       short: 'CDRF',     gradient: 'from-orange-400 to-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30',  text: 'text-orange-600 dark:text-orange-400', pill: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  { key: 'DESIGN_REVIEW',            label: 'Design Review',    short: 'Design',       gradient: 'from-indigo-400 to-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-950/30',  text: 'text-indigo-600 dark:text-indigo-400',  pill: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { key: 'CONSTRUCTION_IN_PROGRESS', label: 'Construction',     short: 'Construction', gradient: 'from-yellow-400 to-yellow-500',  bg: 'bg-yellow-50 dark:bg-yellow-950/30',  text: 'text-yellow-600 dark:text-yellow-400',  pill: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' },
  { key: 'COMPLETED',                label: 'Completed',         short: 'Done',         gradient: 'from-emerald-400 to-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', pill: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
];

const SERVICE_SH: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Arch. Consult.',
  INTERIOR_DESIGN:            'Interior Design',
  PMC:                        'PMC',
  TURNKEY_CONSTRUCTION:       'Turnkey',
  INTERIOR_EXECUTION:         'Int. Execution',
  RENOVATION:                 'Renovation',
  END_TO_END_SOLUTION:        'End-to-End',
};

function getStageCount(key: string, kpis: any): number {
  const assignedOnly = Math.max(0, kpis.active - kpis.siteCheck - kpis.cdrf - kpis.design);
  switch (key) {
    case 'PENDING_ASSIGNMENT': return kpis.pending;
    case 'ASSIGNED':           return assignedOnly;
    case 'SITE_VERIFICATION':  return kpis.siteCheck;
    case 'CDRF_PENDING':       return kpis.cdrf;
    case 'DESIGN_REVIEW':            return kpis.design;
    case 'CONSTRUCTION_IN_PROGRESS': return kpis.construction;
    case 'COMPLETED':                return kpis.done;
    default: return 0;
  }
}

function ProjectRoleDashboard({ user, projects, kpis, navigate }: {
  user: User;
  projects: any[];
  kpis: { total: number; pending: number; active: number; siteCheck: number; cdrf: number; design: number; done: number };
  navigate: (path: string) => void;
}) {
  const roleCtx = {
    'Project Manager':   { sub: 'Your project portfolio', stages: ['PENDING_ASSIGNMENT','ASSIGNED','SITE_VERIFICATION','CDRF_PENDING','DESIGN_REVIEW','COMPLETED'] },
    'Project Architect': { sub: 'Your architecture assignments', stages: ['ASSIGNED','CDRF_PENDING','DESIGN_REVIEW','COMPLETED'] },
    'Junior Architect':  { sub: 'Your design assignments', stages: ['ASSIGNED','DESIGN_REVIEW','COMPLETED'] },
    'Site Engineer':     { sub: 'Your site verification work', stages: ['ASSIGNED','SITE_VERIFICATION','COMPLETED'] },
  }[user.role] ?? { sub: 'Project overview', stages: ['ASSIGNED','COMPLETED'] };

  const visibleStages = PROJECT_STAGE_CONFIG.filter(s => roleCtx.stages.includes(s.key));

  // Show all projects sorted: active first, then completed
  const sortedProjects = [...projects].sort((a, b) => {
    const order = ['SITE_VERIFICATION','CDRF_PENDING','DESIGN_REVIEW','ASSIGNED','PENDING_ASSIGNMENT','COMPLETED'];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  return (
    <div className="flex flex-col gap-4">

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#111217] to-[#1a1208] border border-[rgba(184,144,71,0.2)] p-5 flex items-center gap-4">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #b89047 0%, transparent 60%)' }} />
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#b89047] to-[#7c5e2a] flex items-center justify-center text-white font-black text-[18px] shadow-lg ring-2 ring-[rgba(184,144,71,0.3)] shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[15px] font-bold text-white">Welcome, {user.name.split(' ')[0]}</h2>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#c9a45c] bg-[rgba(184,144,71,0.15)] border border-[rgba(184,144,71,0.25)] px-2 py-0.5 rounded-full">
              {user.role}
            </span>
          </div>
          <p className="text-[11px] text-[rgba(255,255,255,0.45)] mt-0.5">{roleCtx.sub}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[28px] font-black text-[#c9a45c] leading-none">{kpis.total}</p>
          <p className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5">total projects</p>
        </div>
      </div>

      {/* ── Stage KPI cards ── */}
      <div className={`grid gap-3 ${visibleStages.length <= 3 ? 'grid-cols-3' : visibleStages.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'}`}>
        {visibleStages.map(s => {
          const count = getStageCount(s.key, kpis);
          const isUrgent = count > 0 && (s.key === 'SITE_VERIFICATION' || s.key === 'DESIGN_REVIEW' || s.key === 'CDRF_PENDING');
          return (
            <button
              key={s.key}
              onClick={() => navigate('/projects')}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 relative overflow-hidden text-left cursor-pointer group hover:shadow-md transition-all duration-200"
              style={{ borderColor: count > 0 ? undefined : undefined }}
            >
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${s.gradient} transition-opacity ${count > 0 ? 'opacity-100' : 'opacity-30'}`} />
              <div className={`text-[26px] font-black leading-none mb-1 transition-colors ${count > 0 ? s.text : 'text-[var(--text-muted)]'}`}>
                {count}
              </div>
              <div className="text-[9.5px] font-bold uppercase tracking-wide text-[var(--text-muted)] leading-tight">{s.short}</div>
              {isUrgent && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#b89047] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Projects list + sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Projects table */}
        <div className="lg:col-span-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-[12.5px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Building2 size={13} className="text-[#b89047]" />
              My Projects
            </h3>
            <button
              onClick={() => navigate('/projects')}
              className="text-[10px] text-[#b89047] font-semibold hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-0.5"
            >
              View All <ArrowRight size={10} />
            </button>
          </div>

          {sortedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--text-muted)]">
              <div className="p-3 rounded-2xl bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.12)]">
                <HardHat size={24} className="text-[#b89047]/40" />
              </div>
              <p className="text-[12px] font-medium">No projects assigned yet</p>
              <p className="text-[10px] text-center max-w-[200px]">Projects will appear here once the admin assigns you to one</p>
            </div>
          ) : (
            <div>
              {sortedProjects.slice(0, 8).map((p: any) => {
                const stage = PROJECT_STAGE_CONFIG.find(s => s.key === p.status);
                const isCompleted = p.status === 'COMPLETED';
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 cursor-pointer transition-colors group hover:bg-[rgba(184,144,71,0.04)] ${isCompleted ? 'opacity-60' : ''}`}
                  >
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${stage?.bg ?? 'bg-stone-100'}`} style={{ boxShadow: `0 0 0 2px var(--border)` }} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate group-hover:text-[#b89047] transition-colors">
                        {p.prospect?.client?.clientName ?? '—'}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                        {SERVICE_SH[p.prospect?.serviceType] ?? (p.prospect?.serviceType ?? '—')}
                        {p.prospect?.client?.locality ? <span> · {p.prospect.client.locality}</span> : null}
                        {p.prospect?.client?.state ? <span>, {p.prospect.client.state}</span> : null}
                      </p>
                    </div>

                    {/* Team */}
                    {p.assignment?.projectManager && (
                      <div className="hidden sm:block text-right shrink-0">
                        <p className="text-[10px] font-medium text-[var(--text-secondary)]">{p.assignment.projectManager.name}</p>
                        <p className="text-[9px] text-[var(--text-muted)]">PM</p>
                      </div>
                    )}

                    {/* Status badge */}
                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${stage?.pill ?? 'bg-stone-50 text-stone-500 border-stone-200'}`}>
                      {stage?.short ?? p.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 flex flex-col gap-3">

          {/* Stage breakdown */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)]">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3 pb-2 border-b border-[var(--border)]">
              Stage Breakdown
            </h3>
            <div className="space-y-3">
              {visibleStages.map(s => {
                const cnt = getStageCount(s.key, kpis);
                const pct = kpis.total > 0 ? (cnt / kpis.total) * 100 : 0;
                return (
                  <div key={s.key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[10.5px] font-semibold ${cnt > 0 ? s.text : 'text-[var(--text-muted)]'}`}>{s.label}</span>
                      <span className="text-[11px] font-bold text-[var(--text-primary)]">{cnt}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${s.gradient} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick info card */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)]">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3 pb-2 border-b border-[var(--border)]">
              At a Glance
            </h3>
            <div className="space-y-2.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">In Progress</span>
                <span className="font-bold text-[var(--text-primary)]">{kpis.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Completed</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{kpis.done}</span>
              </div>
              {kpis.total > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Completion Rate</span>
                  <span className="font-bold text-[#b89047]">{Math.round((kpis.done / kpis.total) * 100)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate('/projects')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[12px] font-bold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-lg transition-all duration-200 cursor-pointer border-0"
          >
            <HardHat size={14} />
            Open Projects Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Accounts-role dashboard ──────────────────────────────────────────────────
function AccountsRoleDashboard({ user, stats, navigate }: {
  user: User;
  stats: { inflow: any; outflow: any } | null;
  navigate: (path: string) => void;
}) {
  const inf = stats?.inflow;
  const out = stats?.outflow;
  const totalPending = (inf?.pendingApprovals ?? 0) + (out?.pendingApprovals ?? 0);

  const cards = [
    { label: 'Total Inflow',        value: fmtAcc(Number(inf?.totalInflow      ?? 0)), sub: 'Approved challans',                               grad: 'from-emerald-400 to-emerald-500', text: 'text-emerald-400' },
    { label: 'This Month Inflow',   value: fmtAcc(Number(inf?.thisMonthInflow  ?? 0)), sub: new Date().toLocaleString('en-IN', { month: 'long' }), grad: 'from-teal-400 to-teal-500',    text: 'text-teal-400'    },
    { label: 'Total Outflow',       value: fmtAcc(Number(out?.totalOutflow     ?? 0)), sub: 'Approved expenses',                                grad: 'from-red-400 to-red-500',         text: 'text-red-400'     },
    { label: 'This Month Outflow',  value: fmtAcc(Number(out?.thisMonthOutflow ?? 0)), sub: new Date().toLocaleString('en-IN', { month: 'long' }), grad: 'from-orange-400 to-orange-500', text: 'text-orange-400'  },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#111217] to-[#0f1a16] border border-[rgba(16,185,129,0.2)] p-5 flex items-center gap-4">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #10b981 0%, transparent 60%)' }} />
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-[18px] shadow-lg ring-2 ring-emerald-500/30 shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[15px] font-bold text-white">Welcome, {user.name.split(' ')[0]}</h2>
            <span className="text-[9px] font-bold uppercase tracking-widest text-blue-300 bg-blue-500/15 border border-blue-500/25 px-2 py-0.5 rounded-full">Accounts</span>
          </div>
          <p className="text-[11px] text-[rgba(255,255,255,0.45)] mt-0.5">Financial management — inflow &amp; outflow</p>
        </div>
        {totalPending > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[28px] font-black text-amber-400 leading-none">{totalPending}</p>
            <p className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5">pending approvals</p>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 relative overflow-hidden shadow-[var(--shadow-card)]">
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${c.grad}`} />
            <p className="text-[9.5px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2 pt-1">{c.label}</p>
            <p className={`text-[22px] font-black leading-none ${c.text}`}>{c.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {totalPending > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <Clock size={13} className="shrink-0" />
          <span><strong>{totalPending}</strong> payment{totalPending > 1 ? 's' : ''} awaiting Super Admin approval</span>
        </div>
      )}

      {/* Quick navigation */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/accounts/inflow')}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[12px] font-bold border border-emerald-500/25 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
        >
          <ArrowDownLeft size={14} /> View Inflow Challans
        </button>
        <button
          onClick={() => navigate('/accounts/outflow')}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[12px] font-bold border border-red-500/25 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <ArrowUpRight size={14} /> View Outflow Expenses
        </button>
      </div>
    </div>
  );
}

interface OverviewPageProps {
  user: User;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ user }) => {
  const { navigate } = useRouter();

  // Active Tab within Dashboard Overview: 'insights' | 'security'
  const [activeSubTab, setActiveSubTab] = useState<'insights' | 'security'>('insights');

  // Filter timeframe state
  const [timeframe, setTimeframe] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Sales View Toggle: Personal vs Team
  const [isPersonalView, setIsPersonalView] = useState(true);

  // API Ingested Data lists
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [allProspects, setAllProspects] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [projectStatusCounts, setProjectStatusCounts] = useState<Record<string, number>>({});

  const [accountsStats, setAccountsStats] = useState<{ inflow: any; outflow: any } | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [latency, setLatency] = useState(12);

  const isProjectRole  = ['Project Manager', 'Project Architect', 'Junior Architect', 'Site Engineer'].includes(user.role);
  const isAccountsRole = user.role === 'Accounts';

  const fetchDashboardData = async () => {
    if (!user) return;
    setDataLoading(true);
    const startTime = Date.now();
    try {
      const isAdmin = user.role === 'Super Admin' || user.role === 'Admin';
      const isSuperAdmin = user.role === 'Super Admin';
      const hasProjectAccess  = isAdmin || isProjectRole;
      const hasAccountsAccess = isAdmin || isAccountsRole;

      const promises: Promise<any>[] = [
        leadApi.getLeads().catch(() => ({ data: { leads: [] } })),
        prospectApi.getProspects().catch(() => ({ data: { prospects: [] } })),
      ];

      if (isAdmin) {
        promises.push(userApi.getUsers().catch(() => ({ data: { users: [] } })));
        promises.push(userApi.getRoles().catch(() => ({ data: { roles: [] } })));
      }
      if (isAdmin) {
        promises.push(userApi.getLogs().catch(() => ({ data: { logs: [] } })));
      }
      if (hasProjectAccess) {
        promises.push(projectApi.getProjects({ limit: 50 }).catch(() => ({ data: { projects: [], statusCounts: {} } })));
      }
      if (hasAccountsAccess) {
        promises.push(accountsDashboardApi.stats().catch(() => ({ data: { data: null } })));
      }

      const results = await Promise.all(promises);

      setAllLeads(results[0]?.data?.leads || []);
      setAllProspects(results[1]?.data?.prospects || []);

      let index = 2;
      if (isAdmin) {
        setAllUsers(results[index]?.data?.users || []);
        setAllRoles(results[index + 1]?.data?.roles || []);
        index += 2;
      }
      if (isAdmin) {
        setAllLogs(results[index]?.data?.logs || []);
        index++;
      }
      if (hasProjectAccess) {
        setAllProjects(results[index]?.data?.projects || []);
        setProjectStatusCounts(results[index]?.data?.statusCounts || {});
        index++;
      }
      if (hasAccountsAccess) {
        setAccountsStats(results[index]?.data?.data ?? null);
      }

      setLatency(Math.max(5, Date.now() - startTime));
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Check if dates fall within timeframe selection
  const filterByTimeframe = (dateStr?: string | Date | null) => {
    if (!dateStr) return false;
    if (timeframe === 'all') return true;

    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (timeframe === 'today') {
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    }
    if (timeframe === '7days') return diffDays <= 7;
    if (timeframe === '30days') return diffDays <= 30;
    if (timeframe === 'custom') {
      if (!customStart && !customEnd) return true;
      const start = customStart ? new Date(customStart) : null;
      const end = customEnd ? new Date(customEnd + 'T23:59:59') : null;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    }
    return true;
  };

  // Memoized time-filtered dataset
  const timeFilteredLeads = useMemo(() => {
    return allLeads.filter(l => filterByTimeframe(l.createdAt));
  }, [allLeads, timeframe, customStart, customEnd]);

  const timeFilteredProspects = useMemo(() => {
    return allProspects.filter(p => filterByTimeframe(p.createdAt));
  }, [allProspects, timeframe, customStart, customEnd]);

  // Role based filtering (Sales reps can toggle their own telemetry)
  const displayLeads = useMemo(() => {
    if (user?.role === 'Sales & Marketing' && isPersonalView) {
      return timeFilteredLeads.filter(l => l.createdById === user?.id);
    }
    return timeFilteredLeads;
  }, [timeFilteredLeads, user, isPersonalView]);

  const displayProspects = useMemo(() => {
    if (user?.role === 'Sales & Marketing' && isPersonalView) {
      return timeFilteredProspects.filter(p => p.createdBy === user?.id);
    }
    return timeFilteredProspects;
  }, [timeFilteredProspects, user, isPersonalView]);

  // Core KPI Calculations
  const kpis = useMemo(() => {
    const totalLeads = displayLeads.length;
    const totalProspects = displayProspects.length;
    
    // Active prospects (not archived/deleted)
    const activeProspects = displayProspects.filter(p => p.status !== 'DELETED' && !p.isDeleted);
    
    // Total Pipeline Value (Active prospects sum)
    const pipelineValue = activeProspects.reduce((sum, p) => sum + getBudgetInLakhs(p.budgetAmount, p.budgetUnit), 0);
    
    // Won Pipeline (WON / Proposal Accepted / Proposal Agreed stages)
    const wonProspects = activeProspects.filter(p => 
      p.workflowStage === 'WON' || 
      p.workflowStage === 'PROPOSAL_ACCEPTED' || 
      p.workflowStage === 'PROPOSAL_AGREED'
    );
    const wonCount = wonProspects.length;
    const wonRevenue = wonProspects.reduce((sum, p) => sum + getBudgetInLakhs(p.budgetAmount, p.budgetUnit), 0);
    
    // Average deal size
    const averageDeal = activeProspects.length > 0 ? pipelineValue / activeProspects.length : 0;
    
    // Lead conversion rate: how many leads in this filtered list match phone with ANY captured prospect
    const allProspectPhones = new Set(
      allProspects
        .filter(p => p.status !== 'DELETED' && !p.isDeleted)
        .map(p => (p.mobileNo ?? '').replace(/[^0-9]/g, '').slice(-10))
    );
    
    const convertedLeadsCount = displayLeads.filter(l => {
      const cleanPhone = (l.phoneNumber ?? '').replace(/[^0-9]/g, '').slice(-10);
      return allProspectPhones.has(cleanPhone);
    }).length;
    
    const leadConversionRate = totalLeads > 0 ? (convertedLeadsCount / totalLeads) * 100 : 0;

    return {
      totalLeads,
      totalProspects,
      pipelineValue,
      wonCount,
      wonRevenue,
      averageDeal,
      leadConversionRate
    };
  }, [displayLeads, displayProspects, allProspects]);

  // Sales Funnel Calculations
  const funnelStages = useMemo(() => {
    const counts = {
      LEAD_CAPTURED: 0,
      OFFLINE_MEETING: 0,
      SITE_ASSESSMENT: 0,
      PROPOSAL_PHASE: 0,
      WON: 0,
      LOST: 0
    };
    
    displayProspects.forEach(p => {
      if (p.status === 'DELETED' || p.isDeleted) return;
      const stage = p.workflowStage || 'LEAD_CAPTURED';
      if (stage === 'LEAD_CAPTURED') {
        counts.LEAD_CAPTURED++;
      } else if (stage === 'OFFLINE_MEETING' || stage === 'FINAL_DISCUSSION') {
        counts.OFFLINE_MEETING++;
      } else if (stage === 'SITE_DETAILS_REQUESTED' || stage === 'SITE_DETAILS_UPLOADED') {
        counts.SITE_ASSESSMENT++;
      } else if (stage === 'PROPOSAL_SENT' || stage === 'PROPOSAL_IN_PROGRESS' || stage === 'PROPOSAL_ACCEPTED' || stage === 'PROPOSAL_AGREED') {
        if (stage === 'PROPOSAL_ACCEPTED' || stage === 'PROPOSAL_AGREED') {
          counts.WON++;
        } else {
          counts.PROPOSAL_PHASE++;
        }
      } else if (stage === 'WON') {
        counts.WON++;
      } else if (stage === 'LOST' || stage === 'PROPOSAL_REJECTED') {
        counts.LOST++;
      }
    });

    return [
      { id: 'captured', name: 'Lead Captured', count: counts.LEAD_CAPTURED, color: 'bg-stone-500' },
      { id: 'meeting', name: 'Meeting Scheduled', count: counts.OFFLINE_MEETING, color: 'bg-indigo-500' },
      { id: 'site', name: 'Site Assessment', count: counts.SITE_ASSESSMENT, color: 'bg-sky-500' },
      { id: 'proposal', name: 'Proposal Sent', count: counts.PROPOSAL_PHASE, color: 'bg-amber-500' },
      { id: 'won', name: 'Closed Won', count: counts.WON, color: 'bg-emerald-500' },
      { id: 'lost', name: 'Closed Lost', count: counts.LOST, color: 'bg-rose-500' }
    ];
  }, [displayProspects]);

  // Service contribution calculation
  const serviceBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; value: number }> = {
      ARCHITECTURAL_CONSULTATION: { count: 0, value: 0 },
      INTERIOR_DESIGN: { count: 0, value: 0 },
      PMC: { count: 0, value: 0 },
      TURNKEY_CONSTRUCTION: { count: 0, value: 0 },
      INTERIOR_EXECUTION: { count: 0, value: 0 },
      RENOVATION: { count: 0, value: 0 },
      END_TO_END: { count: 0, value: 0 },
    };

    displayProspects.forEach(p => {
      if (p.status === 'DELETED' || p.isDeleted) return;
      const services = (p.serviceType ?? '').split(',').filter(Boolean);
      const budgetVal = getBudgetInLakhs(p.budgetAmount, p.budgetUnit);
      const share = services.length > 0 ? budgetVal / services.length : 0;
      
      services.forEach((s: string) => {
        const key = s === 'END_TO_END_SOLUTION' ? 'END_TO_END' : s;
        if (breakdown[key]) {
          breakdown[key].count++;
          breakdown[key].value += share;
        }
      });
    });

    return Object.entries(breakdown)
      .map(([key, item]) => ({
        key,
        name: serviceLabels[key] || key.replace(/_/g, ' '),
        count: item.count,
        value: item.value
      }))
      .sort((a, b) => b.value - a.value);
  }, [displayProspects]);

  // Sales rep leaderboard
  const repsLeaderboard = useMemo(() => {
    if (user?.role !== 'Super Admin' && user?.role !== 'Admin') return [];
    
    const salesUsers = allUsers.filter(u => u.role === 'Sales & Marketing');
    return salesUsers.map(rep => {
      const repProspects = allProspects.filter(p => p.createdBy === rep.id && p.status !== 'DELETED' && !p.isDeleted);
      const repLeads = allLeads.filter(l => l.createdById === rep.id);
      
      const repPipeline = repProspects.reduce((sum, p) => sum + getBudgetInLakhs(p.budgetAmount, p.budgetUnit), 0);
      const repWon = repProspects.filter(p => 
        p.workflowStage === 'WON' || 
        p.workflowStage === 'PROPOSAL_ACCEPTED' || 
        p.workflowStage === 'PROPOSAL_AGREED'
      ).length;
      
      const repConversion = repProspects.length > 0 ? (repWon / repProspects.length) * 100 : 0;
      
      return {
        id: rep.id,
        name: rep.name,
        email: rep.email,
        isOnline: rep.isOnline,
        prospectsCount: repProspects.length,
        leadsCount: repLeads.length,
        pipelineValue: repPipeline,
        conversionRate: repConversion
      };
    }).sort((a, b) => b.pipelineValue - a.pipelineValue);
  }, [allUsers, allProspects, allLeads, user]);

  // Platform Ingestion Quality
  const platformAnalytics = useMemo(() => {
    const stats: Record<string, { leads: number; converted: number }> = {};
    const prospectPhones = new Set(
      allProspects
        .filter(p => p.status !== 'DELETED' && !p.isDeleted)
        .map(p => (p.mobileNo ?? '').replace(/[^0-9]/g, '').slice(-10))
    );

    displayLeads.forEach(l => {
      const platform = l.platform || 'Other';
      if (!stats[platform]) {
        stats[platform] = { leads: 0, converted: 0 };
      }
      stats[platform].leads++;
      const cleanPhone = (l.phoneNumber ?? '').replace(/[^0-9]/g, '').slice(-10);
      if (prospectPhones.has(cleanPhone)) {
        stats[platform].converted++;
      }
    });

    return Object.entries(stats)
      .map(([platform, item]) => ({
        platform,
        leads: item.leads,
        converted: item.converted,
        conversionRate: item.leads > 0 ? (item.converted / item.leads) * 100 : 0
      }))
      .sort((a, b) => b.leads - a.leads);
  }, [displayLeads, allProspects]);

  // Unconverted Leads Queue (Actionable leads list)
  const unconvertedLeads = useMemo(() => {
    const prospectPhones = new Set(
      allProspects
        .filter(p => p.status !== 'DELETED' && !p.isDeleted)
        .map(p => (p.mobileNo ?? '').replace(/[^0-9]/g, '').slice(-10))
    );

    const targetLeads = user?.role === 'Sales & Marketing' && isPersonalView
      ? allLeads.filter(l => l.createdById === user?.id)
      : allLeads;

    return targetLeads.filter(l => {
      const cleanPhone = (l.phoneNumber ?? '').replace(/[^0-9]/g, '').slice(-10);
      return !prospectPhones.has(cleanPhone);
    }).slice(0, 5);
  }, [allLeads, allProspects, user, isPersonalView]);

  // Top geographical states
  const statesRanked = useMemo(() => {
    const countMap: Record<string, number> = {};
    displayProspects.forEach(p => {
      if (p.status === 'DELETED' || p.isDeleted) return;
      const state = p.state || 'Unknown';
      countMap[state] = (countMap[state] || 0) + 1;
    });
    return Object.entries(countMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [displayProspects]);

  // Project-role KPIs
  const projectKpis = useMemo(() => {
    const total  = Object.values(projectStatusCounts).reduce((a, b) => a + b, 0);
    const active = (projectStatusCounts['ASSIGNED'] ?? 0)
                 + (projectStatusCounts['SITE_VERIFICATION'] ?? 0)
                 + (projectStatusCounts['CDRF_PENDING'] ?? 0)
                 + (projectStatusCounts['DESIGN_REVIEW'] ?? 0)
                 + (projectStatusCounts['LAYOUT_APPROVED'] ?? 0)
                 + (projectStatusCounts['DESIGN_IN_PROGRESS'] ?? 0)
                 + (projectStatusCounts['CONSTRUCTION_IN_PROGRESS'] ?? 0);
    return {
      total,
      pending:      projectStatusCounts['PENDING_ASSIGNMENT'] ?? 0,
      active,
      siteCheck:    projectStatusCounts['SITE_VERIFICATION'] ?? 0,
      cdrf:         projectStatusCounts['CDRF_PENDING'] ?? 0,
      design:       projectStatusCounts['DESIGN_REVIEW'] ?? 0,
      construction: projectStatusCounts['CONSTRUCTION_IN_PROGRESS'] ?? 0,
      done:         projectStatusCounts['COMPLETED'] ?? 0,
    };
  }, [projectStatusCounts]);

  const handleConvertAction = (phone: string) => {
    const cleanPhone = phone.replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(-10);
    localStorage.setItem('leads-search', cleanPhone);
    navigate('/leads');
  };

  const showAdminTab = user.role === 'Super Admin' || user.role === 'Admin';
  const isAdmin      = user.role === 'Super Admin' || user.role === 'Admin';

  if (isProjectRole) {
    return (
      <div className="animate-fade-in w-full h-full flex flex-col gap-4 min-h-0 overflow-y-auto p-4">
        {dataLoading ? (
          <div className="flex-1 flex flex-col gap-4 py-1">
            <ShimmerCardGrid cards={6} />
            <ShimmerTable rows={8} cols={4} />
          </div>
        ) : (
          <ProjectRoleDashboard
            user={user}
            projects={allProjects}
            kpis={projectKpis}
            navigate={navigate}
          />
        )}
      </div>
    );
  }

  if (isAccountsRole) {
    return (
      <div className="animate-fade-in w-full h-full flex flex-col gap-4 min-h-0 overflow-y-auto p-4">
        {dataLoading ? (
          <div className="flex-1 flex flex-col gap-4 py-1">
            <ShimmerCardGrid cards={4} />
          </div>
        ) : (
          <AccountsRoleDashboard user={user} stats={accountsStats} navigate={navigate} />
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full h-full flex flex-col gap-4 min-h-0 overflow-y-auto p-4">
      {/* Controls Bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 border-b border-[var(--border)] pb-3">
        {/* Timeframe Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-0.5 shadow-[var(--shadow-card)]">
            {[
              { key: 'all',    label: 'All Time' },
              { key: 'today',  label: 'Today' },
              { key: '7days',  label: '7 Days' },
              { key: '30days', label: '30 Days' },
              { key: 'custom', label: 'Custom' },
            ].map(tf => (
              <button
                key={tf.key}
                onClick={() => setTimeframe(tf.key as any)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 border-0 cursor-pointer ${
                  timeframe === tf.key
                    ? 'bg-[#b89047] text-white shadow-sm'
                    : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          {timeframe === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="px-2 py-1 text-[11px] rounded-md border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] outline-none focus:border-[#b89047] focus:ring-2 focus:ring-[rgba(184,144,71,0.2)] cursor-pointer transition-all"
              />
              <span className="text-[11px] text-[var(--text-muted)] font-medium">to</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-2 py-1 text-[11px] rounded-md border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] outline-none focus:border-[#b89047] focus:ring-2 focus:ring-[rgba(184,144,71,0.2)] cursor-pointer transition-all"
              />
            </div>
          )}
        </div>

        {/* Personal vs Team Toggle */}
        {user.role === 'Sales & Marketing' && (
          <button
            onClick={() => setIsPersonalView(!isPersonalView)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] rounded-lg text-[11.5px] font-semibold bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] shadow-[var(--shadow-card)] transition-colors cursor-pointer"
          >
            <Users size={12} className="text-[#b89047]" />
            <span>{isPersonalView ? 'My Pipeline' : 'Team Pipeline'}</span>
          </button>
        )}

        {/* Refresh */}
        <button
          onClick={fetchDashboardData}
          className="p-1.5 border border-[var(--border)] bg-[var(--card-bg)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] shadow-[var(--shadow-card)] transition-colors cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw size={14} className={dataLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Sub tabs: Insights vs Security */}
      {(user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Sales & Marketing') && (
        <div className="flex border-b border-[var(--border)] shrink-0">
          <button
            onClick={() => setActiveSubTab('insights')}
            className={`px-4 py-2 text-[12.5px] font-bold border-0 border-b-2 bg-transparent cursor-pointer transition-all duration-150 ${
              activeSubTab === 'insights'
                ? 'border-[#b89047] text-[#b89047]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Performance Insights
          </button>
          <button
            onClick={() => setActiveSubTab('security')}
            className={`px-4 py-2 text-[12.5px] font-bold border-0 border-b-2 bg-transparent cursor-pointer transition-all duration-150 ${
              activeSubTab === 'security'
                ? 'border-[#b89047] text-[#b89047]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            System & Credentials
          </button>
        </div>
      )}

      {/* Loader skeleton */}
      {dataLoading ? (
        <div className="flex-1 flex flex-col gap-4 py-1">
          <ShimmerCardGrid cards={8} />
          <ShimmerTable rows={6} cols={4} />
        </div>
      ) : activeSubTab === 'insights' && (user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Sales & Marketing') ? (
        /* INSIGHTS SUB TAB */
        <div className="flex flex-col gap-5">
          {/* KPI CARDS GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Card 1: Total Leads */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] relative overflow-hidden group hover:border-blue-400/40 dark:hover:border-blue-500/30 transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-400 to-indigo-500 rounded-t-xl" />
              <div className="flex items-center justify-between mb-3 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Total Leads</span>
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Database size={14} />
                </div>
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">{kpis.totalLeads}</div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Inbound marketing queue
              </p>
            </div>

            {/* Card 2: Prospect Briefs */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] relative overflow-hidden group hover:border-amber-400/40 dark:hover:border-amber-500/30 transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 to-orange-500 rounded-t-xl" />
              <div className="flex items-center justify-between mb-3 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Prospect Briefs</span>
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <ClipboardList size={14} />
                </div>
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">{kpis.totalProspects}</div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                Validated client briefs
              </p>
            </div>

            {/* Card 3: Conversion Rate */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] relative overflow-hidden group hover:border-emerald-400/40 dark:hover:border-emerald-500/30 transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-xl" />
              <div className="flex items-center justify-between mb-3 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Conversion Rate</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <TrendingUp size={14} />
                </div>
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">{kpis.leadConversionRate.toFixed(1)}%</div>
              <div className="w-full bg-[var(--hover-bg)] h-1.5 rounded-full mt-2">
                <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, kpis.leadConversionRate)}%` }} />
              </div>
            </div>

            {/* Card 4: Pipeline Value */}
            <div className="bg-[var(--card-bg)] border border-[#b89047]/25 dark:border-[#b89047]/20 rounded-xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] relative overflow-hidden group hover:border-[#b89047]/60 transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#b89047] to-[#f59e0b] rounded-t-xl" />
              <div className="flex items-center justify-between mb-3 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Pipeline Value</span>
                <div className="p-1.5 rounded-lg bg-[#b89047]/10 dark:bg-[#b89047]/15 text-[#b89047] group-hover:scale-110 transition-transform">
                  <Landmark size={14} />
                </div>
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-[#b89047]">{formatBudget(kpis.pipelineValue)}</div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1.5 flex items-center justify-between">
                <span>Avg: {formatBudget(kpis.averageDeal)}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Won: {kpis.wonCount}</span>
              </p>
            </div>

          </div>

          {/* PROJECT KPIs (Admin sees full pipeline) */}
          {isAdmin && kpis.totalProspects > 0 && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-3">
                <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <HardHat size={14} className="text-[#b89047]" />
                  Project Pipeline
                </h3>
                <button onClick={() => navigate('/projects')} className="text-[10px] text-[#b89047] font-semibold hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-1">
                  Manage <ArrowRight size={10} />
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PROJECT_STAGE_CONFIG.map(s => {
                  const cnt = allProjects.filter((p: any) => p.status === s.key).length;
                  return (
                    <button key={s.key} onClick={() => navigate('/projects')} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[rgba(184,144,71,0.06)] transition-colors cursor-pointer border-0 bg-transparent">
                      <span className={`text-[20px] font-black ${cnt > 0 ? s.text : 'text-[var(--text-muted)]'}`}>{cnt}</span>
                      <span className="text-[8.5px] font-semibold text-[var(--text-muted)] uppercase tracking-wide text-center leading-tight">{s.short}</span>
                    </button>
                  );
                })}
              </div>
              {projectKpis.pending > 0 && (
                <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <Clock size={12} className="shrink-0" />
                  <span><strong>{projectKpis.pending}</strong> project{projectKpis.pending > 1 ? 's' : ''} pending team assignment</span>
                </div>
              )}
            </div>
          )}

          {/* ACCOUNTS SUMMARY (Admin / Super Admin) */}
          {accountsStats && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-3">
                <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <CreditCard size={14} className="text-emerald-500" />
                  Accounts Summary
                </h3>
                <button onClick={() => navigate('/accounts/inflow')} className="text-[10px] text-[#b89047] font-semibold hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-1">
                  View <ArrowRight size={10} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Inflow',       value: fmtAcc(Number(accountsStats.inflow?.totalInflow      ?? 0)), text: 'text-emerald-400', grad: 'from-emerald-400 to-emerald-500' },
                  { label: 'This Month Inflow',  value: fmtAcc(Number(accountsStats.inflow?.thisMonthInflow  ?? 0)), text: 'text-teal-400',    grad: 'from-teal-400 to-teal-500'    },
                  { label: 'Total Outflow',      value: fmtAcc(Number(accountsStats.outflow?.totalOutflow    ?? 0)), text: 'text-red-400',     grad: 'from-red-400 to-red-500'      },
                  { label: 'This Month Outflow', value: fmtAcc(Number(accountsStats.outflow?.thisMonthOutflow ?? 0)), text: 'text-orange-400',  grad: 'from-orange-400 to-orange-500' },
                ].map(c => (
                  <div key={c.label} className="rounded-xl bg-[var(--bg)] border border-[var(--border)] p-3 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.grad}`} />
                    <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1 pt-0.5">{c.label}</p>
                    <p className={`text-[18px] font-black leading-none ${c.text}`}>{c.value}</p>
                  </div>
                ))}
              </div>
              {((accountsStats.inflow?.pendingApprovals ?? 0) + (accountsStats.outflow?.pendingApprovals ?? 0)) > 0 && (
                <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <Clock size={12} className="shrink-0" />
                  <span>
                    <strong>{(accountsStats.inflow?.pendingApprovals ?? 0) + (accountsStats.outflow?.pendingApprovals ?? 0)}</strong> payment{((accountsStats.inflow?.pendingApprovals ?? 0) + (accountsStats.outflow?.pendingApprovals ?? 0)) > 1 ? 's' : ''} awaiting your approval
                  </span>
                </div>
              )}
            </div>
          )}

          {/* FUNNEL & SERVICE TYPE BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Funnel chart (col-span-2) */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)] lg:col-span-2">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-4">
                <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <BarChart3 size={15} className="text-[#b89047]" />
                  Client Conversion Funnel
                </h3>
                <span className="text-[10px] text-[var(--text-muted)] font-medium bg-[var(--hover-bg)] px-2 py-0.5 rounded-md">Stage progression</span>
              </div>

              <div className="space-y-2.5">
                {funnelStages.map((stage, idx) => {
                  const maxCount = Math.max(...funnelStages.map(s => s.count)) || 1;
                  const widthPct = Math.max(6, (stage.count / maxCount) * 100);
                  const conversionFromPrev = idx > 0 && funnelStages[idx - 1].count > 0
                    ? ((stage.count / funnelStages[idx - 1].count) * 100).toFixed(0) + '%'
                    : null;

                  return (
                    <div key={stage.id} className="relative">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)] mb-1 px-0.5">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${stage.color}`} />
                          {stage.name}
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {stage.count} {stage.count === 1 ? 'prospect' : 'prospects'}
                          {conversionFromPrev && (
                            <span className="text-[9px] text-[var(--text-muted)] font-normal ml-1.5">
                              ({conversionFromPrev} step)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-[var(--hover-bg)] h-6 rounded-lg overflow-hidden border border-[var(--border-subtle)] flex items-center relative">
                        <div
                          className={`h-full opacity-20 dark:opacity-15 absolute left-0 top-0 transition-all duration-500 ${stage.color}`}
                          style={{ width: `${widthPct}%` }}
                        />
                        <div
                          className={`h-[3px] absolute left-0 bottom-0 transition-all duration-500 rounded-r-full ${stage.color}`}
                          style={{ width: `${widthPct}%` }}
                        />
                        <span className="text-[10px] font-bold text-[var(--text-muted)] pl-3 z-10">
                          {((stage.count / (kpis.totalProspects || 1)) * 100).toFixed(0)}% of total
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Service Type distribution */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-4">
                <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Home size={15} className="text-[#b89047]" />
                  Pipeline by Service
                </h3>
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Value share</span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
                {serviceBreakdown.map(svc => {
                  const totalValue = kpis.pipelineValue || 1;
                  const pct = (svc.value / totalValue) * 100;
                  return (
                    <div key={svc.key} className="text-[11.5px]">
                      <div className="flex justify-between font-medium text-[var(--text-secondary)] mb-1">
                        <span className="truncate max-w-[160px]" title={svc.name}>{svc.name}</span>
                        <span className="font-bold text-[var(--text-primary)] shrink-0 ml-2">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-[var(--hover-bg)] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#b89047] to-[#f59e0b] h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[9.5px] text-[var(--text-muted)] mt-0.5">{formatBudget(svc.value)} &middot; {svc.count} projects</div>
                    </div>
                  );
                })}
                {serviceBreakdown.length === 0 && (
                  <div className="text-center py-10 text-[var(--text-muted)] italic text-[11px]">No services requested yet.</div>
                )}
              </div>
            </div>

          </div>

          {/* BOTTOM TELEMETRY GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Platform performance */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-3">
                <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Activity size={15} className="text-[#b89047]" />
                  Acquisition Platforms
                </h3>
                <span className="text-[10px] text-[var(--text-muted)] font-medium">Conv. rate</span>
              </div>

              <div className="divide-y divide-[var(--border-subtle)] max-h-[260px] overflow-y-auto pr-1">
                {platformAnalytics.map(plat => (
                  <div key={plat.platform} className="py-2.5 flex items-center justify-between text-[12px]">
                    <div>
                      <span className="font-semibold text-[var(--text-primary)]">{plat.platform}</span>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{plat.leads} ingested &middot; {plat.converted} converted</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      plat.conversionRate >= 50
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
                        : plat.conversionRate >= 20
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
                          : 'bg-[var(--hover-bg)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                    }`}>
                      {plat.conversionRate.toFixed(0)}%
                    </span>
                  </div>
                ))}
                {platformAnalytics.length === 0 && (
                  <div className="text-center py-8 text-[var(--text-muted)] italic text-[11px]">No leads registered yet.</div>
                )}
              </div>
            </div>

            {/* Geography + CTA */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-3">
                  <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <MapPin size={15} className="text-[#b89047]" />
                    Territorial Reach
                  </h3>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Top states</span>
                </div>

                <div className="space-y-1.5">
                  {statesRanked.map((state, idx) => (
                    <div key={state.name} className="flex items-center justify-between text-[12px] font-semibold text-[var(--text-secondary)] py-1.5 border-b border-[var(--border-subtle)]">
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] w-4 text-right">{idx + 1}</span>
                        {state.name}
                      </span>
                      <span className="bg-[var(--hover-bg)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full text-[10px] font-bold border border-[var(--border-subtle)]">{state.count}</span>
                    </div>
                  ))}
                  {statesRanked.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)] italic text-[11px]">No geographic data.</div>
                  )}
                </div>
              </div>

              {user.role === 'Sales & Marketing' && (
                <div className="pt-3 border-t border-[var(--border-subtle)] mt-3">
                  <button
                    onClick={() => {
                      navigate('/prospects');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-prospect-form')), 150);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0"
                  >
                    <PlusCircle size={13} /> Capture Client Requirement
                  </button>
                </div>
              )}
            </div>

            {/* Actionable leads (Sales) or Recent Briefs (Admin) */}
            {user.role === 'Sales & Marketing' ? (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-3">
                    <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Target size={15} className="text-red-500 dark:text-red-400" />
                      Unconverted Leads
                    </h3>
                    <span className="text-[9.5px] bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md font-bold border border-red-100 dark:border-red-900/50">Hot queue</span>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)]">
                    {unconvertedLeads.map(l => (
                      <div key={l.id} className="py-2.5 flex items-center justify-between text-[11.5px]">
                        <div>
                          <span className="font-semibold text-[var(--text-primary)]">{l.fullName}</span>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{l.phoneNumber} &middot; {l.platform}</p>
                        </div>
                        <button
                          onClick={() => handleConvertAction(l.phoneNumber)}
                          className="px-2.5 py-1 bg-[var(--hover-bg)] hover:bg-[#b89047] hover:text-white border border-[var(--border)] hover:border-[#b89047] rounded-md text-[10px] font-bold text-[var(--text-secondary)] transition-all duration-150 cursor-pointer"
                        >
                          Convert
                        </button>
                      </div>
                    ))}
                    {unconvertedLeads.length === 0 && (
                      <div className="text-center py-10 text-[var(--text-muted)] italic text-[11px]">All leads converted!</div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/leads')}
                  className="mt-3 w-full py-1.5 text-center border border-[var(--border)] hover:border-[#b89047]/50 hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10.5px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  View Inbound Leads Queue
                </button>
              </div>
            ) : (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-3">
                    <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <ClipboardList size={15} className="text-[#b89047]" />
                      Recent Briefs
                    </h3>
                    <button onClick={() => navigate('/prospects')} className="text-[10px] text-[#b89047] font-semibold hover:underline bg-transparent border-0 cursor-pointer">View All</button>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)]">
                    {allProspects.slice(0, 4).map(p => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/prospects/${p.id}`)}
                        className="py-2.5 flex items-center justify-between hover:bg-[var(--hover-bg)] px-1 -mx-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="font-semibold text-[var(--text-primary)] text-[12px] block">{p.clientName}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{p.locality} &middot; {p.mobileNo}</span>
                        </div>
                        <span className="text-[10.5px] font-bold text-[#b89047] shrink-0 ml-2">
                          {formatBudget(getBudgetInLakhs(p.budgetAmount, p.budgetUnit))}
                        </span>
                      </div>
                    ))}
                    {allProspects.length === 0 && (
                      <div className="text-center py-10 text-[var(--text-muted)] italic text-[11px]">No prospect briefs captured.</div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/prospects')}
                  className="mt-3 w-full py-1.5 text-center border border-[var(--border)] hover:border-[#b89047]/50 hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10.5px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Open Prospects Directory
                </button>
              </div>
            )}

          </div>

          {/* LEADERBOARD (ADMIN / SUPER ADMIN) */}
          {repsLeaderboard.length > 0 && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-4">
                <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Award size={16} className="text-[#b89047]" />
                  Sales Rep Performance Leaderboard
                </h3>
                <span className="text-[10px] text-[#b89047] bg-[#b89047]/8 dark:bg-[#b89047]/15 px-2.5 py-0.5 rounded-full font-bold border border-[#b89047]/20">
                  Pipeline valuation
                </span>
              </div>

              <div className="table-container">
                <table className="erp-table min-w-[700px]">
                  <thead>
                    <tr >
                      <th >Sales Representative</th>
                      <th >Status</th>
                      <th >Leads</th>
                      <th >Prospects</th>
                      <th >Won%</th>
                      <th >Pipeline Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repsLeaderboard.map((rep, idx) => (
                      <tr key={rep.id} >
                        <td className="font-semibold text-[var(--text-primary)]">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                              idx === 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300/50' :
                              idx === 1 ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300/50' :
                              'bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--border)]'
                            }`}>
                              {idx + 1}
                            </span>
                            <div>
                              <span className="block">{rep.name}</span>
                              <p className="text-[10px] text-[var(--text-muted)] font-normal">{rep.email}</p>
                            </div>
                          </div>
                        </td>
                        <td >
                          {rep.isOnline ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                              Online
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] text-[11px]">Offline</span>
                          )}
                        </td>
                        <td >{rep.leadsCount}</td>
                        <td >{rep.prospectsCount}</td>
                        <td >
                          <span className="font-bold text-[var(--text-primary)]">{rep.conversionRate.toFixed(0)}%</span>
                        </td>
                        <td className="font-bold text-[#b89047]">
                          {formatBudget(rep.pipelineValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* SECURITY / CREDENTIALS TAB */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Workspace Profile */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] p-4 flex flex-col justify-between transition-shadow duration-200">
            <div>
              <h3 className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border-subtle)]">
                <UserIcon size={14} className="text-[#b89047]" />
                Workspace Profile
              </h3>

              <div className="flex items-center gap-3 my-3 p-2.5 rounded-lg bg-[var(--hover-bg)] border border-[rgba(184,144,71,0.15)]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#b89047] to-[#7c5e2a] flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 ring-2 ring-[#b89047]/20">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-[13px] font-bold text-[var(--text-primary)] truncate">{user.name}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#b89047]">
                    {roleLabel(user.role)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Mail size={14} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Email</p>
                    <p className="text-[11.5px] font-semibold text-[var(--text-primary)] truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Phone size={14} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Phone</p>
                    <p className="text-[11.5px] font-semibold text-[var(--text-primary)]">{user.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]">
              Account Status: <span className="text-[#b89047] font-bold">Authenticated</span>
            </div>
          </div>

          {/* Access Privileges */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] p-4 flex flex-col justify-between transition-shadow duration-200">
            <div>
              <h3 className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border-subtle)]">
                <FileText size={14} className="text-[#b89047]" />
                Access Privileges
              </h3>

              <p className="text-[11px] text-[var(--text-secondary)] my-2.5 leading-relaxed">
                Your role carries the following platform privileges:
              </p>

              <div className="space-y-2.5">
                {[
                  'Read operational modules and details',
                  ...(showAdminTab ? ['Register and edit organization members', 'Manage member access states (Block/Unblock)'] : []),
                  ...(showAdminTab ? ['Audit comprehensive platform event logs'] : []),
                ].map(priv => (
                  <div key={priv} className="flex items-start gap-2">
                    <div className="p-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                      <CheckCircle2 size={11} />
                    </div>
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] leading-normal">{priv}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2.5 border-t border-[var(--border-subtle)] flex justify-between items-center text-[10px] text-[var(--text-muted)]">
              <span>Schema: RBAC-v1</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Compliant</span>
            </div>
          </div>

          {/* Telemetry & Health */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] p-4 flex flex-col justify-between transition-shadow duration-200">
            <div>
              <h3 className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border-subtle)]">
                <Cpu size={14} className="text-[#b89047]" />
                Telemetry & Health
              </h3>

              <div className="space-y-2.5 my-3 text-[11px]">
                {[
                  { label: 'Module', value: 'Auth Control Hub' },
                  { label: 'Version', value: '1.0.0 (Release)' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">{row.label}:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Connection:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    Stable
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[var(--text-muted)]">Server Latency:</span>
                  <span className="font-bold text-[var(--text-primary)]">{latency}ms</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--hover-bg)] rounded-lg p-2 border border-[rgba(197,168,128,0.15)] text-[10px] text-[var(--text-muted)]">
              Redis Cache active on port 6379 &middot; Uptime diagnostics stable.
            </div>
          </div>

          {/* Audit Logs (Super Admin + Admin) */}
          {(user.role === 'Super Admin' || user.role === 'Admin') && allLogs.length > 0 && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-card)] p-4 md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2 mb-3">
                <Database size={15} className="text-[#b89047]" />
                <h4 className="text-[13px] font-bold text-[var(--text-primary)]">Recent Platform System Audits</h4>
              </div>

              <div className="overflow-y-auto max-h-[200px] divide-y divide-[var(--border-subtle)] text-[11px]">
                {allLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between hover:bg-[var(--hover-bg)] px-1 -mx-1 rounded transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-bold text-[var(--text-primary)] uppercase tracking-wide bg-[var(--hover-bg)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                        {log.action.split(':')[0]}
                      </span>
                      <span className="text-[var(--text-secondary)] ml-2">{log.action.split('ID=')[1] || log.action}</span>
                    </div>
                    <div className="text-right text-[var(--text-muted)]">
                      <span>User: {log.user?.name || log.userId}</span>
                      <p className="text-[9.5px]">
                        {new Date(log.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
