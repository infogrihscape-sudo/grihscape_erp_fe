import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Sidebar } from '../components/Sidebar.js';
import { Menu } from 'lucide-react';
import { AppRouter } from '../components/AppRouter.js';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (!user) return null;

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
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer transition-colors border-0"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/logo.jpeg"
                alt="Grihscape"
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

        <AppRouter user={user} />
      </div>
    </div>
  );
};
