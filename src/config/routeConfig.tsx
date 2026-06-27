import React from 'react';
import {
  LayoutDashboard, Users, ClipboardList, Database, ScrollText,
  Sparkles, FileText, Award, HardHat, ArrowDownLeft, ArrowUpRight, Settings,
  TrendingDown, HardHat as LabourIcon, Users2,
} from 'lucide-react';

export type AppTab = 'overview' | 'users' | 'prospects' | 'leads' | 'contracts' | 'tenders' | 'projects'
  | 'inflow' | 'outflow' | 'constructionPayments' | 'accountsMasters' | 'delayAnalysis' | 'labour';

export interface SidebarItem {
  id: AppTab;
  route: string;
  icon: React.ReactNode;
  label: string;
}

// Navigation items rendered by Sidebar, filtered by ROLE_ROUTES from permissions.ts
export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'overview',  route: '/overview',  icon: <LayoutDashboard size={16} />, label: 'Profile Overview' },
  { id: 'users',     route: '/users',     icon: <Users size={16} />,           label: 'User Management' },
  { id: 'leads',     route: '/leads',     icon: <Database size={16} />,        label: 'Leads Management' },
  { id: 'prospects', route: '/prospects', icon: <ClipboardList size={16} />,   label: 'Prospects Form' },
  { id: 'contracts', route: '/contracts', icon: <ScrollText size={16} />,      label: 'Contracts' },
  { id: 'tenders',   route: '/tenders',   icon: <Award size={16} />,           label: 'Tender Management' },
  { id: 'projects',  route: '/projects',  icon: <HardHat size={16} />,         label: 'Projects' },
  { id: 'labour',    route: '/labour',    icon: <Users2 size={16} />,          label: 'Labour Management' },
];

// Tab id → canonical route path for navigation
export const TAB_TO_ROUTE: Record<AppTab, string> = {
  overview:        '/overview',
  users:           '/users',
  prospects:       '/prospects',
  leads:           '/leads',
  contracts:       '/contracts',
  tenders:         '/tenders',
  projects:        '/projects',
  labour:          '/labour',
  inflow:               '/accounts/inflow',
  outflow:              '/accounts/outflow',
  constructionPayments: '/accounts/construction-payments',
  accountsMasters:      '/accounts/masters',
  delayAnalysis:        '/delay-analysis',
};

// Route path → active sidebar tab (/roles and /logs are under the users tab)
export const ROUTE_TO_TAB: Record<string, AppTab> = {
  '/overview':         'overview',
  '/users':            'users',
  '/roles':            'users',
  '/logs':             'users',
  '/prospects':        'prospects',
  '/leads':            'leads',
  '/contracts':        'contracts',
  '/tenders':          'tenders',
  '/projects':         'projects',
  '/labour':           'labour',
  '/accounts/inflow':               'inflow',
  '/accounts/outflow':              'outflow',
  '/accounts/construction-payments': 'constructionPayments',
  '/accounts/masters':              'accountsMasters',
  '/delay-analysis':                'delayAnalysis',
};

export interface PageInfo {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  iconBg: string;
  iconColor: string;
}

// Desktop page header metadata per page key
export const PAGE_INFO: Record<string, PageInfo> = {
  overview:         { icon: <Sparkles size={15} />,       title: 'Operations Console',     subtitle: 'Performance insights, analytics & telemetry',                            iconBg: 'rgba(184,144,71,0.12)',  iconColor: '#b89047' },
  users:            { icon: <Users size={15} />,           title: 'User Management',        subtitle: 'Team members, roles, and platform access control',                      iconBg: 'rgba(139,92,246,0.12)',  iconColor: '#8b5cf6' },
  prospects:        { icon: <ClipboardList size={15} />,   title: 'Prospects Directory',    subtitle: 'Client requirement briefs and workflow stages',                         iconBg: 'rgba(184,144,71,0.12)',  iconColor: '#b89047' },
  leads:            { icon: <Database size={15} />,        title: 'Leads Management',       subtitle: 'Inbound lead tracking and conversion pipeline',                         iconBg: 'rgba(59,130,246,0.12)',  iconColor: '#3b82f6' },
  contracts:        { icon: <FileText size={15} />,        title: 'Contracts',              subtitle: 'Draft, sign, approve, and send contracts to clients',                   iconBg: 'rgba(168,85,247,0.12)',  iconColor: '#a855f7' },
  tenders:          { icon: <Award size={15} />,           title: 'Tender Management',      subtitle: 'Create, review, approve, and track government or corporate tenders',    iconBg: 'rgba(184,144,71,0.12)', iconColor: '#b89047' },
  detail:           { icon: <FileText size={15} />,        title: 'Prospect Workflow',      subtitle: 'Detailed client project workflow and stage management',                  iconBg: 'rgba(16,185,129,0.12)',  iconColor: '#10b981' },
  projects:         { icon: <HardHat size={15} />,         title: 'Projects',               subtitle: 'Post-sales project lifecycle — assignment, site verification, design & delivery', iconBg: 'rgba(234,88,12,0.12)', iconColor: '#ea580c' },
  projectDetail:    { icon: <HardHat size={15} />,         title: 'Project Detail',         subtitle: 'Site verification, CDRF, design review & delivery',                    iconBg: 'rgba(234,88,12,0.12)', iconColor: '#ea580c' },
  inflow:               { icon: <ArrowDownLeft size={15} />,   title: 'Inflow — Payments Received', subtitle: 'Challans, tax handling, and approval workflow',                    iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10b981' },
  outflow:              { icon: <ArrowUpRight size={15} />,    title: 'Outflow — Expenses',     subtitle: 'Advances, contractor, purchase, salary & office expenses',              iconBg: 'rgba(239,68,68,0.12)',  iconColor: '#ef4444' },
  constructionPayments: { icon: <HardHat size={15} />,         title: 'Construction Payments',  subtitle: 'Review, update & process payment requests from sites',                  iconBg: 'rgba(234,88,12,0.12)', iconColor: '#ea580c' },
  accountsMasters:      { icon: <Settings size={15} />,        title: 'Accounts Masters',       subtitle: 'Purpose and expense category master data',                             iconBg: 'rgba(139,92,246,0.12)', iconColor: '#8b5cf6' },
  delayAnalysis:        { icon: <TrendingDown size={15} />,    title: 'Delay Analysis',         subtitle: 'Auto-generated delay breakdown across all assigned projects',          iconBg: 'rgba(239,68,68,0.12)',  iconColor: '#ef4444' },
  labour:               { icon: <Users2 size={15} />,          title: 'Labour Management',      subtitle: 'Attendance, daily reports, and wage payout for site labourers',        iconBg: 'rgba(234,88,12,0.12)', iconColor: '#ea580c' },
};

// Extracts project id from /projects/:id path; returns null otherwise
export function getProjectDetailId(path: string): string | null {
  const parts = path.split('/');
  if (parts.length === 3 && parts[1] === 'projects' && parts[2]) {
    return parts[2];
  }
  return null;
}

// Extracts prospect id from /prospects/:id path; returns null otherwise
export function getProspectDetailId(path: string): string | null {
  const parts = path.split('/');
  if (parts.length === 3 && parts[1] === 'prospects' && parts[2]) {
    return parts[2];
  }
  return null;
}

// Extracts tender id from /tenders/:id or /tenders/:id/edit path; returns null otherwise
export function getTenderDetailId(path: string): string | null {
  const parts = path.split('/');
  if (parts.length === 3 && parts[1] === 'tenders' && parts[2]) {
    return parts[2];
  }
  if (parts.length === 4 && parts[1] === 'tenders' && parts[2] && parts[3] === 'edit') {
    return parts[2];
  }
  return null;
}

// Returns the inflow challan id from /accounts/inflow/:id; null otherwise
export function getInflowDetailId(path: string): string | null {
  const parts = path.split('/');
  if (parts.length === 4 && parts[1] === 'accounts' && parts[2] === 'inflow' && parts[3]) {
    return parts[3];
  }
  return null;
}

// Returns the outflow expense id from /accounts/outflow/:id; null otherwise
export function getOutflowDetailId(path: string): string | null {
  const parts = path.split('/');
  if (parts.length === 4 && parts[1] === 'accounts' && parts[2] === 'outflow' && parts[3]) {
    return parts[3];
  }
  return null;
}

