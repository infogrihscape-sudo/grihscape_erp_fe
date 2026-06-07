import React, { useEffect, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { RouterProvider, useRouter } from './context/RouterContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { Loader2 } from 'lucide-react';
import { ROLE_ROUTES } from './config/permissions.js';

const Login = React.lazy(() =>
  import('./pages/Login.js').then((m) => ({ default: m.Login }))
);
const Dashboard = React.lazy(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard }))
);

const LoaderScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#fbfbf9]">
    <Loader2
      size={36}
      className="animate-spin text-amber-600"
    />
    <span className="text-sm font-medium text-stone-500">
      {message}
    </span>
  </div>
);

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { path, navigate } = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      if (path !== '/login') navigate('/login');
    } else {
      if (path === '/login' || path === '/') {
        const allowed = user ? ROLE_ROUTES[user.role] : [];
        navigate(allowed[0] || '/overview');
      }
    }
  }, [isAuthenticated, isLoading, path, navigate, user]);

  if (isLoading) {
    return <LoaderScreen message="Loading Secure Session…" />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoaderScreen message="Initializing Security Check…" />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoaderScreen message="Preparing Operations Terminal…" />}>
      <Dashboard />
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
          </ToastProvider>
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

