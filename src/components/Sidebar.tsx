import React, { useState } from 'react';
import {
  LayoutDashboard, Users, LogOut, ChevronLeft, ChevronRight,
  X, ClipboardList, Database, Sun, Moon, ScrollText, Award, HardHat,
  CreditCard, ArrowDownLeft, ArrowUpRight, Settings, ChevronDown, ChevronUp,
  TrendingDown,
} from 'lucide-react';
import type { User } from '../context/AuthContext.js';
import { ROLE_ROUTES } from '../config/permissions.js';
import { useTheme } from '../context/ThemeContext.js';
import { useRouter } from '../context/RouterContext.js';

interface SidebarProps {
  user: User;
  logout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const roleBadge: Record<string, string> = {
  'Super Admin':       'bg-red-500/15 text-red-400 border border-red-500/25',
  'Admin':             'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  'Sales & Marketing': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  'Accounts':          'bg-blue-500/15 text-blue-400 border border-blue-500/25',
};
const roleBadgeClass = (r: string) => roleBadge[r] ?? 'bg-stone-700/50 text-stone-400 border border-stone-700';
const roleLabel = (r: string) => r;

interface SidebarChildItem {
  route: string;
  icon: React.ReactNode;
  label: string;
}

interface SidebarItem {
  route: string;
  icon: React.ReactNode;
  label: string;
  matches?: string[];
  // If subItems is set, this renders as an expandable group
  subItems?: SidebarChildItem[];
}

// Routes that are sub-items of groups — sidebar skips them in the main loop
const GROUP_CHILD_ROUTES = new Set(['/accounts/inflow', '/accounts/outflow', '/accounts/construction-payments']);

const SIDEBAR_ITEMS: SidebarItem[] = [
  { route: '/overview',          icon: <LayoutDashboard size={16} />, label: 'Profile Overview' },
  { route: '/users',             icon: <Users size={16} />,           label: 'User Management',  matches: ['/users', '/roles', '/logs'] },
  { route: '/prospects',         icon: <ClipboardList size={16} />,   label: 'Prospects Form' },
  { route: '/leads',             icon: <Database size={16} />,        label: 'Leads Management' },
  { route: '/contracts',         icon: <ScrollText size={16} />,      label: 'Contracts' },
  { route: '/tenders',           icon: <Award size={16} />,           label: 'Tender Management' },
  { route: '/projects',          icon: <HardHat size={16} />,         label: 'Projects' },
  { route: '/delay-analysis',    icon: <TrendingDown size={16} />,    label: 'Delay Analysis' },
  {
    route: '__accounts_payments__',
    icon: <CreditCard size={16} />,
    label: 'Payments',
    subItems: [
      { route: '/accounts/inflow',  icon: <ArrowDownLeft size={14} />,  label: 'Inflow' },
      { route: '/accounts/outflow', icon: <ArrowUpRight size={14} />,   label: 'Outflow' },
      { route: '/accounts/construction-payments', icon: <HardHat size={14} />, label: 'Construction Payments' },
    ],
  },
  { route: '/accounts/masters',  icon: <Settings size={16} />,        label: 'Masters' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  logout,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { path, navigate } = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['__accounts_payments__']));

  const isPathActive = (route: string, matches?: string[]) => {
    const candidates = matches ?? [route];
    return candidates.some(r => path === r || (r !== '/overview' && path.startsWith(r + '/')));
  };

  const isGroupActive = (item: SidebarItem) =>
    item.subItems?.some(c => path === c.route || path.startsWith(c.route + '/')) ?? false;

  const toggleGroup = (route: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(route) ? next.delete(route) : next.add(route);
      return next;
    });
  };

  const go = (route: string) => {
    navigate(route);
    setIsMobileOpen(false);
  };

  const navItem = (item: SidebarItem) => {
    // Expandable group
    if (item.subItems) {
      const active = isGroupActive(item);
      const expanded = expandedGroups.has(item.route);

      return (
        <li key={item.route}>
          <div
            onClick={() => {
              if (isCollapsed) {
                setIsCollapsed(false);
              } else {
                toggleGroup(item.route);
              }
            }}
            className={[
              'relative flex items-center px-3.5 py-2.5 rounded-lg text-[12px] font-medium cursor-pointer transition-all duration-200 select-none group focus:outline-none',
              isCollapsed ? 'md:justify-center md:px-0 md:h-10 md:w-10 md:mx-auto' : 'gap-2.5',
              active
                ? 'bg-[#b89047]/15 text-[#c9a45c] font-bold'
                : 'text-stone-400 hover:bg-white/5 hover:text-stone-200',
            ].join(' ')}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className={`flex-1 transition-all duration-200 ${isCollapsed ? 'md:hidden' : 'block'}`}>
              {item.label}
            </span>
            {!isCollapsed && (
              <span className="shrink-0 text-stone-500">
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
            )}

            {isCollapsed && (
              <div
                role="tooltip"
                className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#0d1117] text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 whitespace-nowrap z-50 border border-[#30363d]"
              >
                {item.label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-[#0d1117]" />
              </div>
            )}
          </div>

          {expanded && !isCollapsed && (
            <ul className="mt-0.5 ml-4 flex flex-col gap-0.5 border-l border-[#2a2d3a] pl-2.5">
              {item.subItems.map(child => {
                const childActive = path === child.route || path.startsWith(child.route + '/');
                return (
                  <li
                    key={child.route}
                    onClick={() => go(child.route)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(child.route); } }}
                    tabIndex={0}
                    role="button"
                    aria-label={child.label}
                    aria-current={childActive ? 'page' : undefined}
                    className={[
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all duration-200 select-none focus:outline-none',
                      childActive
                        ? 'bg-[#b89047]/15 text-[#c9a45c] font-bold'
                        : 'text-stone-400 hover:bg-white/5 hover:text-stone-200',
                    ].join(' ')}
                  >
                    <span className="shrink-0">{child.icon}</span>
                    <span>{child.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    }

    // Regular link
    const active = isPathActive(item.route, item.matches);
    return (
      <li
        key={item.route}
        onClick={() => go(item.route)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(item.route); } }}
        tabIndex={0}
        role="button"
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={[
          'relative flex items-center px-3.5 py-2.5 rounded-lg text-[12px] font-medium cursor-pointer transition-all duration-200 select-none group focus:outline-none focus:ring-2 focus:ring-[#b89047]/30',
          isCollapsed ? 'md:justify-center md:px-0 md:h-10 md:w-10 md:mx-auto' : 'gap-2.5',
          active
            ? 'bg-[#b89047]/15 text-[#c9a45c] font-bold border-l-[3px] border-[#b89047] rounded-l-none pl-3'
            : 'text-stone-400 hover:bg-white/5 hover:text-stone-200 focus:bg-white/5',
        ].join(' ')}
      >
        <span className="shrink-0">{item.icon}</span>
        <span className={`transition-all duration-200 ${isCollapsed ? 'md:hidden' : 'block'}`}>
          {item.label}
        </span>

        {isCollapsed && (
          <div
            role="tooltip"
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#0d1117] text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100 whitespace-nowrap z-50 border border-[#30363d]"
          >
            {item.label}
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
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-stone-400 hover:bg-white/8 hover:text-stone-100 focus:outline-none cursor-pointer transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
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
      <ul className="flex flex-col gap-0.5 flex-1 list-none overflow-y-auto">
        {ROLE_ROUTES[user.role]?.map((route) => {
          // Skip routes that are rendered inside a group
          if (GROUP_CHILD_ROUTES.has(route)) return null;
          const item = SIDEBAR_ITEMS.find((i) => i.route === route);
          if (!item) return null;
          return (
            <React.Fragment key={item.route}>
              {navItem(item)}
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
