import React from 'react';
import {
  LayoutDashboard, Users, LogOut, ChevronLeft, ChevronRight,
  X, ClipboardList, Database, Sun, Moon, ScrollText, Award,
} from 'lucide-react';
import type { User } from '../context/AuthContext.js';
import { ROLE_ROUTES } from '../config/permissions.js';
import { useTheme } from '../context/ThemeContext.js';

interface SidebarProps {
  user: User;
  activeTab: 'overview' | 'users' | 'prospects' | 'leads' | 'contracts' | 'tenders';
  setActiveTab: (tab: 'overview' | 'users' | 'prospects' | 'leads' | 'contracts' | 'tenders') => void;
  logout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const roleBadge: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-500/15 text-red-400 border border-red-500/25',
  ADMIN:       'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  SALES:       'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  ACCOUNTS:    'bg-blue-500/15 text-blue-400 border border-blue-500/25',
};
const roleBadgeClass = (r: string) => roleBadge[r] ?? 'bg-stone-700/50 text-stone-400 border border-stone-700';
const roleLabel = (r: string) => r.replace(/_/g, ' ');

interface SidebarItem {
  id: 'overview' | 'users' | 'prospects' | 'leads' | 'contracts' | 'tenders';
  route: string;
  icon: React.ReactNode;
  label: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'overview',  route: '/overview',  icon: <LayoutDashboard size={16} />, label: 'Profile Overview' },
  { id: 'users',     route: '/users',     icon: <Users size={16} />,           label: 'User Management' },
  { id: 'prospects', route: '/prospects', icon: <ClipboardList size={16} />,   label: 'Prospects Form' },
  { id: 'leads',     route: '/leads',     icon: <Database size={16} />,        label: 'Leads Management' },
  { id: 'contracts', route: '/contracts', icon: <ScrollText size={16} />,      label: 'Contracts' },
  { id: 'tenders',   route: '/tenders',   icon: <Award size={16} />,           label: 'Tender Management' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  setActiveTab,
  logout,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const navItem = (
    tab: 'overview' | 'users' | 'prospects' | 'leads' | 'contracts' | 'tenders',
    icon: React.ReactNode,
    label: string,
  ) => {
    const active = activeTab === tab;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActiveTab(tab);
      }
    };

    return (
      <li
        onClick={() => setActiveTab(tab)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={[
          'relative flex items-center px-3.5 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-200 select-none group focus:outline-none focus:ring-2 focus:ring-[#b89047]/30',
          isCollapsed ? 'md:justify-center md:px-0 md:h-10 md:w-10 md:mx-auto' : 'gap-2.5',
          active
            ? 'bg-[#b89047]/15 text-[#c9a45c] font-bold border-l-[3px] border-[#b89047] rounded-l-none pl-3'
            : 'text-stone-400 hover:bg-white/5 hover:text-stone-200 focus:bg-white/5',
        ].join(' ')}
      >
        <span className="shrink-0">{icon}</span>
        <span className={`transition-all duration-200 ${isCollapsed ? 'md:hidden' : 'block'}`}>
          {label}
        </span>

        {/* Tooltip shown when sidebar is collapsed */}
        {isCollapsed && (
          <div
            role="tooltip"
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#0d1117] text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100 whitespace-nowrap z-50 border border-[#30363d]"
          >
            {label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-[#0d1117]" />
          </div>
        )}
      </li>
    );
  };

  return (
    <aside className={`
      fixed md:static top-0 bottom-0 left-0 z-50
      flex flex-col h-full bg-[#111217] border-r border-[#1e2030] py-6
      transition-all duration-300 ease-in-out
      ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      ${isCollapsed ? 'w-[240px] md:w-[72px] px-4 md:px-3' : 'w-[240px] px-4'}
    `}>

      {/* ── Header: logo + controls ── */}
      <div className={`flex items-center justify-between pl-2 mb-7 ${isCollapsed ? 'md:flex-col md:gap-3 md:pl-0 md:justify-center' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src="/logo.jpeg"
              alt="Grihscape"
              decoding="async"
              className="w-8 h-8 rounded-lg object-cover border border-[#b89047]/35 shrink-0 shadow-[0_0_0_2px_rgba(184,144,71,0.12)]"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#111217] rounded-full" />
          </div>
          <span className={`text-[17px] font-extrabold text-stone-100 tracking-tight transition-all duration-200 ${isCollapsed ? 'md:hidden' : 'block'}`}>
            Grih<span className="text-[#c9a45c]">scape</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Mobile close */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-stone-400 hover:bg-white/8 hover:text-stone-100 focus:outline-none cursor-pointer transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-stone-400 hover:bg-white/8 hover:text-stone-100 focus:outline-none cursor-pointer transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </div>

      {/* ── Nav items ── */}
      <ul className="flex flex-col gap-0.5 flex-1 list-none">
        {ROLE_ROUTES[user.role]?.map((route) => {
          const item = SIDEBAR_ITEMS.find((i) => i.route === route);
          if (!item) return null;
          return (
            <React.Fragment key={item.id}>
              {navItem(item.id, item.icon, item.label)}
            </React.Fragment>
          );
        })}
      </ul>

      {/* ── Theme toggle ── */}
      <div className={`mt-4 mb-3 ${isCollapsed ? 'md:flex md:justify-center' : ''}`}>
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
          className={[
            'relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[12.5px] font-semibold',
            'bg-white/5 border border-white/8 text-stone-400 hover:text-stone-100 hover:bg-white/10',
            'transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#b89047]/30 group',
            isCollapsed ? 'md:w-10 md:h-10 md:justify-center md:px-0 md:mx-auto' : 'w-full',
          ].join(' ')}
        >
          <span className="shrink-0 transition-transform duration-300 group-hover:rotate-12">
            {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
          </span>
          <span className={`transition-all duration-200 ${isCollapsed ? 'md:hidden' : 'block'}`}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>

          {isCollapsed && (
            <div
              role="tooltip"
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#0d1117] text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 whitespace-nowrap z-50 border border-[#30363d]"
            >
              {isDark ? 'Light Mode' : 'Dark Mode'}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-[#0d1117]" />
            </div>
          )}
        </button>
      </div>

      {/* ── User card ── */}
      <div className={`mb-3 p-3 rounded-xl bg-[#181a23] border border-[#272a38] shadow-sm group/user relative transition-colors ${isCollapsed ? 'md:p-1.5 md:bg-transparent md:border-none md:shadow-none md:mx-auto' : ''}`}>
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b89047] to-[#7c5e2a] flex items-center justify-center text-white font-bold text-[13px] shrink-0 ring-2 ring-[#b89047]/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className={`overflow-hidden transition-all duration-200 ${isCollapsed ? 'md:hidden' : 'block'}`}>
            <p className="text-[12px] font-semibold text-stone-100 truncate leading-tight">{user.name}</p>
            <span className={`inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${roleBadgeClass(user.role)}`}>
              {roleLabel(user.role)}
            </span>
          </div>
        </div>

        {isCollapsed && (
          <div
            role="tooltip"
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#0d1117] text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none opacity-0 transition-opacity duration-150 group-hover/user:opacity-100 whitespace-nowrap z-50 border border-[#30363d]"
          >
            <div className="font-semibold">{user.name}</div>
            <div className="text-[9px] text-stone-400 font-medium uppercase tracking-wide mt-0.5">{roleLabel(user.role)}</div>
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-[#0d1117]" />
          </div>
        )}
      </div>

      {/* ── Sign Out ── */}
      <button
        onClick={logout}
        aria-label="Sign Out"
        className={[
          'relative flex items-center justify-center gap-2 px-3 h-9 rounded-lg text-[12px] font-semibold',
          'text-red-400 bg-red-950/25 border border-red-900/35 hover:bg-red-950/50 hover:border-red-800/50 hover:text-red-300',
          'transition-all duration-150 cursor-pointer group/logout focus:outline-none focus:ring-2 focus:ring-red-500/40',
          isCollapsed ? 'w-10 h-10 p-0 md:mx-auto md:bg-transparent md:border-none md:hover:bg-red-950/30' : 'w-full',
        ].join(' ')}
      >
        <LogOut size={14} className="shrink-0" />
        <span className={`transition-all duration-200 ${isCollapsed ? 'md:hidden' : 'block'}`}>Sign Out</span>

        {isCollapsed && (
          <div
            role="tooltip"
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-red-700 text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none opacity-0 transition-opacity duration-150 group-hover/logout:opacity-100 whitespace-nowrap z-50"
          >
            Sign Out
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-red-700" />
          </div>
        )}
      </button>
    </aside>
  );
};
