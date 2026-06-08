import React, { useEffect, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { RouterProvider, useRouter } from './context/RouterContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { Loader2 } from 'lucide-react';
import { ROLE_ROUTES } from './config/permissions.js';
import { LoadingOverlay } from './components/LoadingOverlay.js';

// Public portfolio site (no auth required, no backend calls)
const PortfolioApp = React.lazy(() =>
  import('./pages/PortfolioApp.js').then(m => ({ default: m.PortfolioApp }))
);
const Login = React.lazy(() =>
  import('./pages/Login.js').then(m => ({ default: m.Login }))
);
const Dashboard = React.lazy(() =>
  import('./pages/Dashboard.js').then(m => ({ default: m.Dashboard }))
);

// Paths that belong to the public portfolio (no auth required)
const PORTFOLIO_PATHS = new Set(['/', '/about', '/services', '/projects', '/cost-estimation', '/contact']);
// Paths that require authentication (CRM)
const CRM_PATHS = new Set(['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts', '/tenders']);

const LoaderScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#fbfbf9]">
    <Loader2 size={36} className="animate-spin text-amber-600" />
    <span className="text-sm font-medium text-stone-500">{message}</span>
  </div>
);

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { path, navigate } = useRouter();

  // Determine what kind of route this is
  const isPortfolioPath = PORTFOLIO_PATHS.has(path);
  const isLoginPath     = path === '/login';
  const isCrmPath       = CRM_PATHS.has(path) || path.startsWith('/prospects/');

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      // Authenticated users: if on portfolio or login → redirect to first allowed CRM page
      if (isPortfolioPath || isLoginPath) {
        const allowed = user ? ROLE_ROUTES[user.role] : [];
        navigate(allowed[0] || '/overview');
      }
      // On a CRM path they don't have access to → AppRouter handles the "Access Restricted" UI
    } else {
      // Not authenticated: CRM paths → redirect to portfolio home
      if (isCrmPath) navigate('/');
    }
  }, [isAuthenticated, isLoading, path, navigate, user]);

  if (isLoading) {
    return <LoaderScreen message="Loading Secure Session…" />;
  }

  // Authenticated → show the CRM dashboard
  if (isAuthenticated) {
    return (
      <Suspense fallback={<LoaderScreen message="Preparing Operations Terminal…" />}>
        <Dashboard />
      </Suspense>
    );
  }

  // Not authenticated → public routes
  if (isLoginPath) {
    return (
      <Suspense fallback={<LoaderScreen message="Initializing Security Check…" />}>
        <Login />
      </Suspense>
    );
  }

  // Default: public portfolio site
  return (
    <Suspense fallback={<LoaderScreen message="Loading Grihscape…" />}>
      <PortfolioApp />
    </Suspense>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <ToastProvider>
            <MainApp />
            <LoadingOverlay />
          </ToastProvider>
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
