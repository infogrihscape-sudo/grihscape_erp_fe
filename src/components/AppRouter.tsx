import React, { useEffect, Suspense } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { ROLE_ROUTES } from '../config/permissions.js';
import {
  PAGE_INFO, ROUTE_TO_TAB,
  getProspectDetailId, getTenderDetailId, getProjectDetailId,
  getInflowDetailId, getOutflowDetailId,
} from '../config/routeConfig.js';
import type { User } from '../context/AuthContext.js';
import { ShieldAlert, Loader2, ChevronRight } from 'lucide-react';
import { NotificationBell } from './NotificationBell.js';

const UserManagement = React.lazy(() =>
  import('../pages/UserManagement.js').then((m) => ({ default: m.UserManagement }))
);
const ProspectRequirementsSales = React.lazy(() =>
  import('../pages/ProspectRequirementsSales.js').then((m) => ({ default: m.ProspectRequirementsSales }))
);
const ProspectRequirementsAdmin = React.lazy(() =>
  import('../pages/ProspectRequirementsAdmin.js').then((m) => ({ default: m.ProspectRequirementsAdmin }))
);
const ProspectWorkflowDetail = React.lazy(() =>
  import('../pages/ProspectWorkflowDetail.js').then((m) => ({ default: m.ProspectWorkflowDetail }))
);
const LeadsManagement = React.lazy(() =>
  import('../pages/LeadsManagement.js').then((m) => ({ default: m.LeadsManagement }))
);
const ContractsScreen = React.lazy(() =>
  import('../pages/ContractsScreen.js').then((m) => ({ default: m.ContractsScreen }))
);
const TendersManagement = React.lazy(() =>
  import('../pages/TendersManagement.js').then((m) => ({ default: m.TendersManagement }))
);
const ProjectsDashboard = React.lazy(() =>
  import('../pages/ProjectsDashboard.js').then((m) => ({ default: m.ProjectsDashboard }))
);
const ProjectDetail = React.lazy(() =>
  import('../pages/ProjectDetail.js').then((m) => ({ default: m.ProjectDetail }))
);
const OverviewPage = React.lazy(() =>
  import('../pages/OverviewPage.js').then((m) => ({ default: m.OverviewPage }))
);
const InflowList = React.lazy(() =>
  import('../pages/accounts/InflowList.js').then((m) => ({ default: m.InflowList }))
);
const InflowDetail = React.lazy(() =>
  import('../pages/accounts/InflowDetail.js').then((m) => ({ default: m.InflowDetail }))
);
const OutflowList = React.lazy(() =>
  import('../pages/accounts/OutflowList.js').then((m) => ({ default: m.OutflowList }))
);
const OutflowDetail = React.lazy(() =>
  import('../pages/accounts/OutflowDetail.js').then((m) => ({ default: m.OutflowDetail }))
);
const AccountsMasters = React.lazy(() =>
  import('../pages/accounts/AccountsMasters.js').then((m) => ({ default: m.AccountsMasters }))
);
const DelayAnalysisPage = React.lazy(() =>
  import('../pages/construction/DelayAnalysisPage.js').then((m) => ({ default: m.DelayAnalysisPage }))
);

interface AppRouterProps {
  user: User;
}

const VALID_PATHS = [
  '/overview', '/users', '/roles', '/logs', '/prospects', '/leads',
  '/contracts', '/tenders', '/projects', '/delay-analysis',
  '/accounts/inflow', '/accounts/outflow', '/accounts/masters',
];

// Accounts sub-routes covered by the __accounts_payments__ group key in ROLE_ROUTES
const ACCOUNTS_PAYMENT_ROUTES = new Set(['/accounts/inflow', '/accounts/outflow']);

const roleLabel = (r: string) => r;

const PageLoader: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center flex-1 gap-3">
    <Loader2 className="animate-spin text-amber-600" size={28} />
    <span className="text-[12px] text-stone-500 font-medium">{text}</span>
  </div>
);

export const AppRouter: React.FC<AppRouterProps> = ({ user }) => {
  const { path, navigate } = useRouter();

  const prospectId      = getProspectDetailId(path);
  const tenderId        = getTenderDetailId(path);
  const projectDetailId = getProjectDetailId(path);
  const inflowId        = getInflowDetailId(path);
  const outflowId       = getOutflowDetailId(path);

  const isUsers          = path === '/users' || path === '/roles' || path === '/logs';
  const isProspects      = path === '/prospects';
  const isLeads          = path === '/leads';
  const isContracts      = path === '/contracts';
  const isTenders        = path === '/tenders';
  const isProjects       = path === '/projects';
  const isInflowList     = path === '/accounts/inflow';
  const isOutflowList    = path === '/accounts/outflow';
  const isAccMasters     = path === '/accounts/masters';
  const isDelayAnalysis  = path === '/delay-analysis';

  const userRoutes = ROLE_ROUTES[user.role] ?? [];

  const isAuthorized =
    userRoutes.includes(path) ||
    // Group children — covered by the __accounts_payments__ key
    (ACCOUNTS_PAYMENT_ROUTES.has(path) && userRoutes.includes('__accounts_payments__')) ||
    (!!prospectId && userRoutes.includes('/prospects')) ||
    ((isTenders || !!tenderId) && userRoutes.includes('/tenders')) ||
    (!!projectDetailId && userRoutes.includes('/projects')) ||
    (!!inflowId && (userRoutes.includes('/accounts/inflow') || userRoutes.includes('__accounts_payments__'))) ||
    (!!outflowId && (userRoutes.includes('/accounts/outflow') || userRoutes.includes('__accounts_payments__')));

  useEffect(() => {
    const isKnown =
      VALID_PATHS.includes(path) ||
      getProspectDetailId(path) ||
      getTenderDetailId(path) ||
      getProjectDetailId(path) ||
      getInflowDetailId(path) ||
      getOutflowDetailId(path);

    if (!isKnown) {
      const allowed = userRoutes.filter(r => !r.startsWith('__'));
      navigate(allowed[0] || '/overview');
    }
  }, [path, navigate, userRoutes]);

  const pageKey = prospectId
    ? 'detail'
    : tenderId
    ? 'tenders'
    : projectDetailId
    ? 'projectDetail'
    : inflowId
    ? 'inflow'
    : outflowId
    ? 'outflow'
    : (ROUTE_TO_TAB[path] ?? 'overview');
  const info = PAGE_INFO[pageKey];

  return (
    <>
      {/* Desktop Page Header */}
      {info && (
        <div className="hidden md:flex items-center justify-between px-5 py-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl shrink-0"
              style={{ backgroundColor: info.iconBg, color: info.iconColor }}
            >
              {info.icon}
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">
                {info.title}
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                {info.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <span className="font-semibold">Grihscape</span>
              <ChevronRight size={11} className="shrink-0" />
              <span className="text-[var(--text-secondary)] font-bold">{info.title}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        {!isAuthorized ? (
          <div className="animate-fade-in w-full max-w-lg mx-auto h-full flex flex-col items-center justify-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 shadow-sm">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Access Restricted</h2>
              <p className="text-[13px] text-[var(--text-secondary)] mt-2 max-w-sm leading-relaxed">
                Your account role{' '}
                <span className="font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-900/50 uppercase text-[11px]">
                  {roleLabel(user.role)}
                </span>{' '}
                does not have authorization to view this administrative console.
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
          <Suspense fallback={<PageLoader text="Preparing Workflow Console…" />}>
            <ProspectWorkflowDetail currentUser={user} prospectId={prospectId} />
          </Suspense>
        ) : isProspects ? (
          <Suspense fallback={<PageLoader text="Preparing Prospects Terminal…" />}>
            {user.role === 'Sales & Marketing' ? (
              <ProspectRequirementsSales currentUser={user} />
            ) : (
              <ProspectRequirementsAdmin currentUser={user} />
            )}
          </Suspense>
        ) : isLeads ? (
          <Suspense fallback={<PageLoader text="Preparing Leads Terminal…" />}>
            <LeadsManagement currentUser={user} />
          </Suspense>
        ) : isContracts ? (
          <Suspense fallback={<PageLoader text="Loading Contracts…" />}>
            <ContractsScreen currentUser={user} />
          </Suspense>
        ) : (isTenders || !!tenderId) ? (
          <Suspense fallback={<PageLoader text="Loading Tenders Module…" />}>
            <TendersManagement currentUser={user} tenderId={tenderId} />
          </Suspense>
        ) : projectDetailId ? (
          <Suspense fallback={<PageLoader text="Loading Project…" />}>
            <ProjectDetail currentUser={user} projectId={projectDetailId} />
          </Suspense>
        ) : isProjects ? (
          <Suspense fallback={<PageLoader text="Loading Projects…" />}>
            <ProjectsDashboard currentUser={user} />
          </Suspense>
        ) : isUsers ? (
          <Suspense fallback={<PageLoader text="Loading Security Console…" />}>
            <UserManagement currentUser={user} />
          </Suspense>
        ) : inflowId ? (
          <Suspense fallback={<PageLoader text="Loading Challan…" />}>
            <InflowDetail currentUser={user} challanId={inflowId} />
          </Suspense>
        ) : isInflowList ? (
          <Suspense fallback={<PageLoader text="Loading Inflow…" />}>
            <InflowList currentUser={user} />
          </Suspense>
        ) : outflowId ? (
          <Suspense fallback={<PageLoader text="Loading Expense…" />}>
            <OutflowDetail currentUser={user} expenseId={outflowId} />
          </Suspense>
        ) : isOutflowList ? (
          <Suspense fallback={<PageLoader text="Loading Outflow…" />}>
            <OutflowList currentUser={user} />
          </Suspense>
        ) : isAccMasters ? (
          <Suspense fallback={<PageLoader text="Loading Masters…" />}>
            <AccountsMasters currentUser={user} />
          </Suspense>
        ) : isDelayAnalysis ? (
          <Suspense fallback={<PageLoader text="Loading Delay Analysis…" />}>
            <DelayAnalysisPage user={user} />
          </Suspense>
        ) : (
          <Suspense fallback={<PageLoader text="Loading Operations Console…" />}>
            <OverviewPage user={user} />
          </Suspense>
        )}
      </main>
    </>
  );
};
