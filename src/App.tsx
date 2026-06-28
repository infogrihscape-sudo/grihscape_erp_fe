import React, { useEffect, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { RouterProvider, useRouter } from './context/RouterContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
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
const PORTFOLIO_PATHS = new Set(['/', '/about', '/services', '/cost-estimation', '/contact']);
// Paths that require authentication (CRM)
const CRM_PATHS = new Set(['/overview', '/users', '/roles', '/logs', '/prospects', '/leads', '/contracts', '/tenders', '/projects']);

const LoaderScreen: React.FC<{ message: string; logoOnly?: boolean }> = ({ message, logoOnly }) => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-5 bg-[#fbfbf9]">
    {logoOnly ? (
      <>
        <div style={{ animation: 'logo-pulse 1.4s ease-in-out infinite' }}>
          <img
            src="/logo.jpeg"
            alt="Grihscape"
            style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', border: '2px solid #c5a880', display: 'block' }}
          />
        </div>
        <style>{`@keyframes logo-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(0.9)} }`}</style>
      </> ) : (
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(197,168,128,0.18)' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#c5a880', borderRightColor: '#b89047', animation: 'gs-spin 0.75s linear infinite' }} />
        <img src="/logo.jpeg" alt="" style={{ position: 'absolute', inset: 8, width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
        <style>{`@keyframes gs-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )}
    <span className="text-[13px] font-medium text-stone-400 tracking-wide">{message}</span>
  </div>
);

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { path, navigate } = useRouter();

  // Determine what kind of route this is
  const isPortfolioPath = PORTFOLIO_PATHS.has(path);
  const isLoginPath     = path === '/login';
  const isCrmPath       = CRM_PATHS.has(path) || path.startsWith('/prospects/') || path.startsWith('/projects/');

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      // Authenticated users: if on portfolio or login → redirect to first allowed CRM page
      if (isPortfolioPath || isLoginPath) {
        const allowed = (user && ROLE_ROUTES[user.role]) || [];
        navigate(allowed[0] || '/overview');
      }
      // On a CRM path they don't have access to → AppRouter handles the "Access Restricted" UI
    } else {
      // Not authenticated: CRM paths → redirect to portfolio home
      if (isCrmPath) navigate('/');
    }
  }, [isAuthenticated, isLoading, path, navigate, user]);

  if (isLoading) {
    return <LoaderScreen message="Loading Secure Session…" logoOnly />;
  }

  // Authenticated → show the CRM dashboard
  if (isAuthenticated) {
    return (
      <Suspense fallback={<LoaderScreen message="" logoOnly />}>
        <Dashboard />
      </Suspense>
    );
  }

  // Not authenticated → public routes
  if (isLoginPath) {
    return (
      <Suspense fallback={<LoaderScreen message="" logoOnly />}>
        <Login />
      </Suspense>
    );
  }

  // Default: public portfolio site
  return (
    <Suspense fallback={<LoaderScreen message="" logoOnly />}>
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
