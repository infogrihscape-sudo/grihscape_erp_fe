import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Sidebar } from '../components/Sidebar.js';
import { useRouter } from '../context/RouterContext.js';
import { userApi, prospectApi, leadApi } from '../services/api.js';
import { ROLE_ROUTES } from '../config/permissions.js';
import {
  User as UserIcon, Mail, Phone, Shield, FileText, Settings, Menu,
  Database, Users, Activity, CheckCircle2, Cpu, ShieldAlert,
  Briefcase, Home, Palette, Hammer, ArrowRight, ClipboardList, PlusCircle,
  Loader2, RefreshCw, Landmark, TrendingUp, BarChart3, MapPin, ExternalLink, Lock, Check,
  ChevronRight, Sparkles, Award, Target, MessageSquare
} from 'lucide-react';

const UserManagement = React.lazy(() =>
  import('./UserManagement.js').then((m) => ({ default: m.UserManagement }))
);
const ProspectRequirementsSales = React.lazy(() =>
  import('./ProspectRequirementsSales.js').then((m) => ({ default: m.ProspectRequirementsSales }))
);
const ProspectRequirementsAdmin = React.lazy(() =>
  import('./ProspectRequirementsAdmin.js').then((m) => ({ default: m.ProspectRequirementsAdmin }))
);
const ProspectWorkflowDetail = React.lazy(() =>
  import('./ProspectWorkflowDetail.js').then((m) => ({ default: m.ProspectWorkflowDetail }))
);
const LeadsManagement = React.lazy(() =>
  import('./LeadsManagement.js').then((m) => ({ default: m.LeadsManagement }))
);
const ContractsScreen = React.lazy(() =>
  import('./ContractsScreen.js').then((m) => ({ default: m.ContractsScreen }))
);

const roleBadge: Record<string, string> = {
  SUPER_ADMIN:       'text-stone-900 font-semibold',
  ADMIN:             'text-stone-900 font-semibold',
  SALES:             'text-stone-900 font-semibold',
  PROJECT_MANAGER:   'text-stone-900 font-semibold',
  PROJECT_ARCHITECT: 'text-stone-900 font-semibold',
};
const roleBadgeClass = (r: string) => roleBadge[r] ?? 'text-stone-900 font-semibold';
const roleLabel = (r: string) => r.replace(/_/g, ' ');

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

const serviceLabels: Record<string, string> = {
  ARCHITECTURAL_CONSULTATION: 'Architectural Consultation',
  INTERIOR_DESIGN: 'Interior Design',
  PMC: 'PMC',
  TURNKEY_CONSTRUCTION: 'Turnkey Construction',
  INTERIOR_EXECUTION: 'Interior Execution',
  RENOVATION: 'Renovation',
  END_TO_END: 'End-to-End Solution',
};

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { path, navigate } = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Active Tab within Dashboard Overview: 'insights' | 'security'
  const [activeSubTab, setActiveSubTab] = useState<'insights' | 'security'>('insights');

  // Filter timeframe state: 'all' | 'today' | '7days' | '30days'
  const [timeframe, setTimeframe] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Sales View Toggle: Personal vs Team
  const [isPersonalView, setIsPersonalView] = useState(true);

  // API Ingested Data lists
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [allProspects, setAllProspects] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  
  const [dataLoading, setDataLoading] = useState(true);
  const [latency, setLatency] = useState(12);

  const fetchDashboardData = async () => {
    if (!user) return;
    setDataLoading(true);
    const startTime = Date.now();
    try {
      const promises: Promise<any>[] = [
        leadApi.getLeads().catch(() => ({ data: { leads: [] } })),
        prospectApi.getProspects().catch(() => ({ data: { prospects: [] } }))
      ];
      
      const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
      const isSuperAdmin = user.role === 'SUPER_ADMIN';
      
      if (isAdmin) {
        promises.push(userApi.getUsers().catch(() => ({ data: { users: [] } })));
        promises.push(userApi.getRoles().catch(() => ({ data: { roles: [] } })));
      }
      if (isSuperAdmin) {
        promises.push(userApi.getLogs().catch(() => ({ data: { logs: [] } })));
      }
      
      const results = await Promise.all(promises);
      
      setAllLeads(results[0]?.data?.leads || []);
      setAllProspects(results[1]?.data?.prospects || []);
      
      let index = 2;
      if (isAdmin) {
        setAllUsers(results[index]?.data?.users || []);
        setAllRoles(results[index+1]?.data?.roles || []);
        index += 2;
      }
      if (isSuperAdmin) {
        setAllLogs(results[index]?.data?.logs || []);
      }
      
      // Calculate realistic API response latency
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
    return true;
  };

  // Memoized time-filtered dataset
  const timeFilteredLeads = useMemo(() => {
    return allLeads.filter(l => filterByTimeframe(l.createdAt));
  }, [allLeads, timeframe]);

  const timeFilteredProspects = useMemo(() => {
    return allProspects.filter(p => filterByTimeframe(p.createdAt));
  }, [allProspects, timeframe]);

  // Role based filtering (Sales reps can toggle their own telemetry)
  const displayLeads = useMemo(() => {
    if (user?.role === 'SALES' && isPersonalView) {
      return timeFilteredLeads.filter(l => l.createdById === user?.id);
    }
    return timeFilteredLeads;
  }, [timeFilteredLeads, user, isPersonalView]);

  const displayProspects = useMemo(() => {
    if (user?.role === 'SALES' && isPersonalView) {
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
        // Filter accepted proposals into won if appropriate, otherwise keep in proposal
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
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') return [];
    
    const salesUsers = allUsers.filter(u => u.role === 'SALES');
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

  // Platform Ingestion Quality (Leads count and Conversion rates per platforms)
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

    const targetLeads = user?.role === 'SALES' && isPersonalView
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

  const getProspectDetailId = (p: string) => {
    const parts = p.split('/');
    if (parts.length === 3 && parts[1] === 'prospects' && parts[2]) {
      return parts[2];
    }
    return null;
  };

  useEffect(() => {
    const validPaths = ['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts'];
    const isDetailPath = !!getProspectDetailId(path);
    if (!validPaths.includes(path) && !isDetailPath) {
      const allowed = user ? ROLE_ROUTES[user.role] : [];
      navigate(allowed[0] || '/overview');
    }
  }, [path, navigate, user]);

  if (!user) return null;

  const showAdminTab = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
  const isUsers     = path === '/users' || path === '/roles' || path === '/logs';
  const isProspects = path === '/prospects';
  const isLeads     = path === '/leads';
  const isContracts = path === '/contracts';
  const prospectId  = getProspectDetailId(path);

  const isAuthorized =
    (ROLE_ROUTES[user.role]?.includes(path) ?? false) ||
    (!!prospectId && (ROLE_ROUTES[user.role]?.includes('/prospects') ?? false));

  // Handle lead conversion redirection
  const handleConvertAction = (phone: string) => {
    const cleanPhone = phone.replace(/^\+91/, '').replace(/[^0-9]/g, '').slice(-10);
    localStorage.setItem('leads-search', cleanPhone);
    navigate('/leads');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--page-bg)]">
      {/* Backdrop overlay (mobile only) */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        user={user}
        activeTab={
          (path === '/prospects' || !!prospectId) ? 'prospects'
          : isLeads     ? 'leads'
          : isUsers     ? 'users'
          : isContracts ? 'contracts'
          : 'overview'
        }
        setActiveTab={(tab) => {
          const routes: Record<string, string> = {
            prospects: '/prospects',
            leads:     '/leads',
            users:     '/users',
            contracts: '/contracts',
            overview:  '/overview',
          };
          navigate(routes[tab] || '/overview');
          setIsMobileSidebarOpen(false);
        }}
        logout={logout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Navbar */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 transition-colors">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/logo.jpeg"
                alt="Grihscape"
                fetchPriority="high"
                decoding="async"
                className="w-7 h-7 rounded-lg object-cover border border-[rgba(197,168,128,0.3)]"
              />
              <span className="text-[16px] font-extrabold text-[var(--text-primary)] tracking-tight">
                Grih<span className="text-[#b89047]">scape</span>
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b89047] to-[#7c5e2a] flex items-center justify-center text-white font-bold text-[13px] ring-2 ring-[#b89047]/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Desktop Page Header — shown on md+ only */}
        {(() => {
          const pageKey = prospectId ? 'detail' : isContracts ? 'contracts' : isLeads ? 'leads' : isUsers ? 'users' : isProspects ? 'prospects' : 'overview';
          const PAGE_INFO: Record<string, { icon: React.ReactNode; title: string; subtitle: string; iconBg: string; iconColor: string }> = {
            overview:  { icon: <Sparkles size={15} />,     title: 'Operations Console',     subtitle: 'Performance insights, analytics & telemetry',               iconBg: 'rgba(184,144,71,0.12)',  iconColor: '#b89047' },
            users:     { icon: <Users size={15} />,         title: 'User Management',         subtitle: 'Team members, roles, and platform access control',          iconBg: 'rgba(139,92,246,0.12)', iconColor: '#8b5cf6' },
            prospects: { icon: <ClipboardList size={15} />, title: 'Prospects Directory',     subtitle: 'Client requirement briefs and workflow stages',             iconBg: 'rgba(184,144,71,0.12)',  iconColor: '#b89047' },
            leads:     { icon: <Database size={15} />,      title: 'Leads Management',        subtitle: 'Inbound lead tracking and conversion pipeline',             iconBg: 'rgba(59,130,246,0.12)',  iconColor: '#3b82f6' },
            contracts: { icon: <FileText size={15} />,      title: 'Contracts',               subtitle: 'Draft, sign, approve, and send contracts to clients',       iconBg: 'rgba(168,85,247,0.12)',  iconColor: '#a855f7' },
            detail:    { icon: <FileText size={15} />,      title: 'Prospect Workflow',       subtitle: 'Detailed client project workflow and stage management',     iconBg: 'rgba(16,185,129,0.12)',  iconColor: '#10b981' },
          };
          const info = PAGE_INFO[pageKey];
          return (
            <div className="hidden md:flex items-center justify-between px-5 py-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl shrink-0"
                  style={{ backgroundColor: info.iconBg, color: info.iconColor }}
                >
                  {info.icon}
                </div>
                <div>
                  <h1 className="text-[14.5px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">
                    {info.title}
                  </h1>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-tight">
                    {info.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <span className="font-semibold">Grihscape</span>
                <ChevronRight size={11} className="shrink-0" />
                <span className="text-[var(--text-secondary)] font-bold">{info.title}</span>
              </div>
            </div>
          );
        })()}

        {/* Main */}
        <main className="flex-1 overflow-hidden p-3 md:p-5 flex flex-col min-h-0">
          {!isAuthorized ? (
            <div className="animate-fade-in w-full max-w-lg mx-auto h-full flex flex-col items-center justify-center text-center gap-5">
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 shadow-sm">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Access Restricted</h2>
                <p className="text-[13px] text-[var(--text-secondary)] mt-2 max-w-sm leading-relaxed">
                  Your account role <span className="font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-900/50 uppercase text-[11px]">{roleLabel(user.role)}</span> does not have authorization to view this administrative console.
                </p>
              </div>
              <button
                onClick={() => navigate('/overview')}
                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0"
              >
                Return to Dashboard Overview
              </button>
            </div>
          ) : prospectId ? (
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Loader2 className="animate-spin text-amber-600" size={28} />
                <span className="text-[12px] text-stone-500 font-medium">Preparing Workflow Console…</span>
              </div>
            }>
              <ProspectWorkflowDetail currentUser={user} prospectId={prospectId} />
            </Suspense>
          ) : isProspects ? (
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Loader2 className="animate-spin text-amber-600" size={28} />
                <span className="text-[12px] text-stone-500 font-medium">Preparing Prospects Terminal…</span>
              </div>
            }>
              {user.role === 'SALES' ? (
                <ProspectRequirementsSales currentUser={user} />
              ) : (
                <ProspectRequirementsAdmin currentUser={user} />
              )}
            </Suspense>
          ) : isLeads ? (
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Loader2 className="animate-spin text-amber-600" size={28} />
                <span className="text-[12px] text-stone-500 font-medium">Preparing Leads Terminal…</span>
              </div>
            }>
              <LeadsManagement currentUser={user} />
            </Suspense>
          ) : isContracts ? (
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Loader2 className="animate-spin text-amber-600" size={28} />
                <span className="text-[12px] text-[var(--text-muted)] font-medium">Loading Contracts…</span>
              </div>
            }>
              <ContractsScreen currentUser={user} />
            </Suspense>
          ) : !isUsers ? (
            /* REDEVELOPED DYNAMIC INSIGHTS DASHBOARD */
            <div className="animate-fade-in w-full h-full flex flex-col gap-4 min-h-0 overflow-y-auto">

              {/* Controls Bar */}
              <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 border-b border-[var(--border)] pb-3">
                {/* Timeframe Filter */}
                <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-0.5 shadow-[var(--shadow-card)]">
                  {[
                    { key: 'all', label: 'All Time' },
                    { key: 'today', label: 'Today' },
                    { key: '7days', label: '7 Days' },
                    { key: '30days', label: '30 Days' }
                  ].map(tf => (
                    <button
                      key={tf.key}
                      onClick={() => setTimeframe(tf.key as any)}
                      className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                        timeframe === tf.key
                          ? 'bg-[#b89047] text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                {/* Personal vs Team Toggle */}
                {user.role === 'SALES' && (
                  <button
                    onClick={() => setIsPersonalView(!isPersonalView)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] rounded-lg text-[11.5px] font-semibold bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] shadow-[var(--shadow-card)] transition-colors"
                  >
                    <Users size={12} className="text-[#b89047]" />
                    <span>{isPersonalView ? 'My Pipeline' : 'Team Pipeline'}</span>
                  </button>
                )}

                {/* Refresh */}
                <button
                  onClick={fetchDashboardData}
                  className="p-1.5 border border-[var(--border)] bg-[var(--card-bg)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] shadow-[var(--shadow-card)] transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw size={14} className={dataLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Sub tabs: Insights vs Security */}
              {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'SALES') && (
                <div className="flex border-b border-[var(--border)] shrink-0">
                  <button
                    onClick={() => setActiveSubTab('insights')}
                    className={`px-4 py-2 text-[12.5px] font-bold border-b-2 transition-all duration-150 ${
                      activeSubTab === 'insights'
                        ? 'border-[#b89047] text-[#b89047]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Performance Insights
                  </button>
                  <button
                    onClick={() => setActiveSubTab('security')}
                    className={`px-4 py-2 text-[12.5px] font-bold border-b-2 transition-all duration-150 ${
                      activeSubTab === 'security'
                        ? 'border-[#b89047] text-[#b89047]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    System & Credentials
                  </button>
                </div>
              )}

              {/* Loader overlay */}
              {dataLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="animate-spin text-amber-600" size={32} />
                  <span className="text-[12px] text-[var(--text-muted)] font-medium">Aggregating telemetry…</span>
                </div>
              ) : activeSubTab === 'insights' && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'SALES') ? (
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
                              <div className="text-[9.5px] text-[var(--text-muted)] mt-0.5">{formatBudget(svc.value)} · {svc.count} projects</div>
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
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{plat.leads} ingested · {plat.converted} converted</p>
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

                      {user.role === 'SALES' && (
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
                    {user.role === 'SALES' ? (
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
                                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{l.phoneNumber} · {l.platform}</p>
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
                              <div className="text-center py-10 text-[var(--text-muted)] italic text-[11px]">All leads converted! 🎉</div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => navigate('/leads')}
                          className="mt-3 w-full py-1.5 text-center border border-[var(--border)] hover:border-[#b89047]/50 hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10.5px] font-bold rounded-lg transition-colors"
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
                            <button onClick={() => navigate('/prospects')} className="text-[10px] text-[#b89047] font-semibold hover:underline">View All</button>
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
                                  <span className="text-[10px] text-[var(--text-muted)]">{p.locality} · {p.mobileNo}</span>
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
                          className="mt-3 w-full py-1.5 text-center border border-[var(--border)] hover:border-[#b89047]/50 hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10.5px] font-bold rounded-lg transition-colors"
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

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[12px] border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-[var(--table-head)] text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px]">
                              <th className="px-4 py-2.5 border-b border-[var(--border)]">Sales Representative</th>
                              <th className="px-4 py-2.5 border-b border-[var(--border)] text-center">Status</th>
                              <th className="px-4 py-2.5 border-b border-[var(--border)] text-center">Leads</th>
                              <th className="px-4 py-2.5 border-b border-[var(--border)] text-center">Prospects</th>
                              <th className="px-4 py-2.5 border-b border-[var(--border)] text-center">Won%</th>
                              <th className="px-4 py-2.5 border-b border-[var(--border)] text-right">Pipeline Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {repsLeaderboard.map((rep, idx) => (
                              <tr key={rep.id} className="hover:bg-[var(--hover-bg)] transition-colors duration-100">
                                <td className="px-4 py-3 border-b border-[var(--border-subtle)] font-semibold text-[var(--text-primary)]">
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
                                <td className="px-4 py-3 border-b border-[var(--border-subtle)] text-center">
                                  {rep.isOnline ? (
                                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                      Online
                                    </span>
                                  ) : (
                                    <span className="text-[var(--text-muted)] text-[11px]">Offline</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 border-b border-[var(--border-subtle)] text-center font-semibold text-[var(--text-secondary)]">{rep.leadsCount}</td>
                                <td className="px-4 py-3 border-b border-[var(--border-subtle)] text-center font-semibold text-[var(--text-secondary)]">{rep.prospectsCount}</td>
                                <td className="px-4 py-3 border-b border-[var(--border-subtle)] text-center">
                                  <span className="font-bold text-[var(--text-primary)]">{rep.conversionRate.toFixed(0)}%</span>
                                </td>
                                <td className="px-4 py-3 border-b border-[var(--border-subtle)] text-right font-bold text-[#b89047]">
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
                          ...(user.role === 'SUPER_ADMIN' ? ['Audit comprehensive platform event logs'] : []),
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
                      Redis Cache active on port 6379 · Uptime diagnostics stable.
                    </div>
                  </div>

                  {/* Audit Logs (Super Admin) */}
                  {user.role === 'SUPER_ADMIN' && allLogs.length > 0 && (
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
                              <p className="text-[9.5px]">{new Date(log.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          ) : (
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Loader2 className="animate-spin text-amber-600" size={28} />
                <span className="text-[12px] text-stone-500 font-medium">Loading Security Console…</span>
              </div>
            }>
              <UserManagement currentUser={user} />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
};
