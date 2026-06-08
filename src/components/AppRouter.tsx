import React, { useEffect, Suspense } from 'react';
import { useRouter } from '../context/RouterContext.js';
import { ROLE_ROUTES } from '../config/permissions.js';
import { PAGE_INFO, ROUTE_TO_TAB, getProspectDetailId, getTenderDetailId } from '../config/routeConfig.js';
import type { User } from '../context/AuthContext.js';
import { ShieldAlert, Loader2, ChevronRight } from 'lucide-react';

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
const OverviewPage = React.lazy(() =>
  import('../pages/OverviewPage.js').then((m) => ({ default: m.OverviewPage }))
);

interface AppRouterProps {
  user: User;
}

const VALID_PATHS = ['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts', '/tenders'];
const roleLabel = (r: string) => r.replace(/_/g, ' ');

const PageLoader: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center flex-1 gap-3">
    <Loader2 className="animate-spin text-amber-600" size={28} />
    <span className="text-[12px] text-stone-500 font-medium">{text}</span>
  </div>
);

export const AppRouter: React.FC<AppRouterProps> = ({ user }) => {
  const { path, navigate } = useRouter();

  const prospectId  = getProspectDetailId(path);
  const tenderId    = getTenderDetailId(path);
  const isUsers     = path === '/users' || path === '/roles' || path === '/logs';
  const isProspects = path === '/prospects';
  const isLeads     = path === '/leads';
  const isContracts = path === '/contracts';
  const isTenders   = path === '/tenders';

  const isAuthorized =
    (ROLE_ROUTES[user.role]?.includes(path) ?? false) ||
    (!!prospectId && (ROLE_ROUTES[user.role]?.includes('/prospects') ?? false)) ||
    ((isTenders || !!tenderId) && (ROLE_ROUTES[user.role]?.includes('/tenders') ?? false));

  useEffect(() => {
    if (!VALID_PATHS.includes(path) && !getProspectDetailId(path) && !getTenderDetailId(path)) {
      const allowed = ROLE_ROUTES[user.role] ?? [];
      navigate(allowed[0] || '/contracts');
    }
  }, [path, navigate, user]);

  const pageKey = prospectId ? 'detail' : tenderId ? 'tenders' : (ROUTE_TO_TAB[path] ?? 'overview');
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
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-1 flex flex-col min-h-0">
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
            {user.role === 'SALES' ? (
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
        ) : isUsers ? (
          <Suspense fallback={<PageLoader text="Loading Security Console…" />}>
            <UserManagement currentUser={user} />
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
