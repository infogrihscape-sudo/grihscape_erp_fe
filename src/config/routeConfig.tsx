import React from 'react';
import {
  LayoutDashboard, Users, ClipboardList, Database, ScrollText,
  Sparkles, FileText, Award,
} from 'lucide-react';

export type AppTab = 'overview' | 'users' | 'prospects' | 'leads' | 'contracts' | 'tenders';

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
  { id: 'prospects', route: '/prospects', icon: <ClipboardList size={16} />,   label: 'Prospects Form' },
  { id: 'leads',     route: '/leads',     icon: <Database size={16} />,        label: 'Leads Management' },
  { id: 'contracts', route: '/contracts', icon: <ScrollText size={16} />,      label: 'Contracts' },
  { id: 'tenders',   route: '/tenders',   icon: <Award size={16} />,           label: 'Tender Management' },
];

// Tab id → canonical route path for navigation
export const TAB_TO_ROUTE: Record<AppTab, string> = {
  overview:  '/overview',
  users:     '/users',
  prospects: '/prospects',
  leads:     '/leads',
  contracts: '/contracts',
  tenders:   '/tenders',
};

// Route path → active sidebar tab (/roles and /logs are under the users tab)
export const ROUTE_TO_TAB: Record<string, AppTab> = {
  '/overview':  'overview',
  '/users':     'users',
  '/roles':     'users',
  '/logs':      'users',
  '/prospects': 'prospects',
  '/leads':     'leads',
  '/contracts': 'contracts',
  '/tenders':   'tenders',
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
  overview:  { icon: <Sparkles size={15} />,     title: 'Operations Console',   subtitle: 'Performance insights, analytics & telemetry',             iconBg: 'rgba(184,144,71,0.12)',  iconColor: '#b89047' },
  users:     { icon: <Users size={15} />,         title: 'User Management',      subtitle: 'Team members, roles, and platform access control',        iconBg: 'rgba(139,92,246,0.12)',  iconColor: '#8b5cf6' },
  prospects: { icon: <ClipboardList size={15} />, title: 'Prospects Directory',  subtitle: 'Client requirement briefs and workflow stages',           iconBg: 'rgba(184,144,71,0.12)',  iconColor: '#b89047' },
  leads:     { icon: <Database size={15} />,      title: 'Leads Management',     subtitle: 'Inbound lead tracking and conversion pipeline',           iconBg: 'rgba(59,130,246,0.12)',  iconColor: '#3b82f6' },
  contracts: { icon: <FileText size={15} />,      title: 'Contracts',            subtitle: 'Draft, sign, approve, and send contracts to clients',     iconBg: 'rgba(168,85,247,0.12)',  iconColor: '#a855f7' },
  tenders:   { icon: <Award size={15} />,         title: 'Tender Management',    subtitle: 'Create, review, approve, and track government or corporate tenders', iconBg: 'rgba(184,144,71,0.12)', iconColor: '#b89047' },
  detail:    { icon: <FileText size={15} />,      title: 'Prospect Workflow',    subtitle: 'Detailed client project workflow and stage management',   iconBg: 'rgba(16,185,129,0.12)',  iconColor: '#10b981' },
};

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

