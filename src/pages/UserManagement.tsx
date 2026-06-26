import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { userApi } from '../services/api.js';
import type { User } from '../context/AuthContext.js';
import { useRouter } from '../context/RouterContext.js';
import { SearchableSelect } from '../components/SearchableSelect.js';
import { useToast } from '../context/ToastContext.js';
import { canWrite } from '../config/permissions.js';
import { btnPrimary } from '../components/ui/styles.js';
import {
  UserPlus, Ban, Unlock, RefreshCw,
  Search, ShieldCheck, Mail, Phone, Calendar,
  Settings, Plus, Edit2, ChevronLeft, ChevronRight, X, MapPin,
  FileText, Trash2
} from 'lucide-react';

interface DbRole { id: string; name: string; description: string | null; createdAt: string; updatedAt?: string; }
interface AuditLog {
  id: string; userId: string; action: string;
  ipAddress: string | null; userAgent: string | null; createdAt: string;
  latitude?: number | null; longitude?: number | null;
  user: { name: string; email: string; role: string; };
}
interface UserManagementProps { currentUser: User; }

const ITEMS_PER_PAGE = 10;

const roleBadgeClass = (_r: string) => 'text-stone-900 font-semibold';
const roleLabel = (r: string) => r;

/* ── shared Tailwind snippets ── */
const inputBase = 'w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-[13px] rounded-lg px-3.5 py-1.5 outline-none transition focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500/80 font-[inherit] compact-input';
const inputInvalid = 'border-red-300 focus:border-red-400 focus:ring-red-100';
const labelBase = 'text-xs text-slate-400 dark:text-slate-500 leading-normal font-bold uppercase tracking-wide';
const btnSecondary = 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-stone-600 dark:text-stone-300 bg-stone-150/70 dark:bg-stone-800/50 border border-[rgba(184,144,71,0.28)] hover:bg-stone-200 hover:text-stone-850 transition-colors duration-150 cursor-pointer';
const btnDanger  = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-600 dark:hover:bg-rose-600 hover:text-white hover:-translate-y-px transition-all duration-150 cursor-pointer shadow-xs';
const btnSuccess = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white hover:-translate-y-px transition-all duration-150 cursor-pointer shadow-xs';
const btnEdit    = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 hover:bg-sky-600 dark:hover:bg-sky-600 hover:text-white hover:-translate-y-px transition-all duration-150 cursor-pointer shadow-xs';
const btnWarn    = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 hover:bg-amber-600 dark:hover:bg-amber-600 hover:text-white hover:-translate-y-px transition-all duration-150 cursor-pointer shadow-xs';
const card = 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl shadow-xs';

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<DbRole[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [rolesPage, setRolesPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [filterUserRole, setFilterUserRole] = useState('ALL');
  const [filterUserStatus, setFilterUserStatus] = useState('ALL');
  const [filterLogAction, setFilterLogAction] = useState('ALL');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('');
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; phone?: string; roleId?: string; }>({});
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [editingRoleCreatedAt, setEditingRoleCreatedAt] = useState<string | null>(null);
  const [editingRoleUpdatedAt, setEditingRoleUpdatedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mapData, setMapData] = useState<{ lat: number; lng: number; name: string } | null>(null);
  // Edit user modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRoleId, setEditUserRoleId] = useState('');
  const [editFormErrors, setEditFormErrors] = useState<{ name?: string; email?: string; phone?: string; roleId?: string }>({});
  // Delete confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { path, navigate } = useRouter();
  const activeSubTab = path === '/roles' ? 'roles' : path === '/logs' ? 'logs' : 'users';

  const userCanWrite = canWrite(currentUser.role);

  const availableRoles = useMemo(() =>
    currentUser.role === 'Admin'
      ? roles.filter(r => r.name !== 'Super Admin')
      : roles,
  [roles, currentUser.role]);

  const fetchData = async (forceLoadRoles = false) => {
    setLoading(true); setError(null);
    const shouldFetchRoles = roles.length === 0 || forceLoadRoles;
    const shouldFetchLogs  = ['Super Admin', 'Admin'].includes(currentUser.role);
    try {
      const calls: Promise<any>[] = [userApi.getUsers()];
      if (shouldFetchRoles) calls.push(userApi.getRoles());
      if (shouldFetchLogs)  calls.push(userApi.getLogs());

      const results = await Promise.all(calls);
      setUsers(results[0].data.users);
      let idx = 1;
      if (shouldFetchRoles) setRoles(results[idx++].data.roles);
      if (shouldFetchLogs)  setLogs(results[idx].data.logs);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to load system details.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally { setLoading(false); }
  };

  const handleExportCSV = () => {
    if (activeSubTab === 'users') {
      const userHeaders = [
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'isBlocked', label: 'Status' },
        { key: 'isOnline', label: 'Online Status' },
        { key: 'lastLoginAt', label: 'Last Login Timestamp' },
        { key: 'createdAt', label: 'Created At' }
      ];
      const csvRows = [];
      csvRows.push(userHeaders.map(h => `"${h.label.replace(/"/g, '""')}"`).join(','));
      for (const u of filteredUsers) {
        const values = [
          `"${u.name.replace(/"/g, '""')}"`,
          `"${u.phone.replace(/"/g, '""')}"`,
          `"${u.email.replace(/"/g, '""')}"`,
          `"${(u.role || '').replace(/"/g, '""')}"`,
          `"${u.isBlocked ? 'Blocked' : 'Active'}"`,
          `"${u.isOnline ? 'Online' : 'Offline'}"`,
          `"${u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}"`,
          `"${(u as any).createdAt ? new Date((u as any).createdAt).toLocaleString() : '—'}"`
        ];
        csvRows.push(values.join(','));
      }
      downloadCSV(csvRows.join('\n'), `Users_Report_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (activeSubTab === 'logs') {
      const logHeaders = [
        { key: 'createdAt', label: 'Timestamp' },
        { key: 'userName', label: 'Operator Name' },
        { key: 'userEmail', label: 'Operator Email' },
        { key: 'userRole', label: 'Operator Role' },
        { key: 'action', label: 'Action Details' },
        { key: 'ipAddress', label: 'IP Address' },
        { key: 'userAgent', label: 'User Agent' }
      ];
      const csvRows = [];
      csvRows.push(logHeaders.map(h => `"${h.label.replace(/"/g, '""')}"`).join(','));
      for (const l of filteredLogs) {
        const values = [
          `"${new Date(l.createdAt).toLocaleString()}"`,
          `"${(l.user?.name || '').replace(/"/g, '""')}"`,
          `"${(l.user?.email || '').replace(/"/g, '""')}"`,
          `"${(l.user?.role || '').replace(/"/g, '""')}"`,
          `"${l.action.replace(/"/g, '""')}"`,
          `"${(l.ipAddress || '').replace(/"/g, '""')}"`,
          `"${(l.userAgent || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(values.join(','));
      }
      downloadCSV(csvRows.join('\n'), `Audit_Logs_Report_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const csvContent = '\uFEFF' + content;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report exported successfully.', 'success');
  };

  useEffect(() => { fetchData(); }, [currentUser.role]);

  useEffect(() => {
    setSearchTerm('');
  }, [activeSubTab]);

  const closeUserModal = () => {
    setShowUserModal(false);
    setNewUserName(''); setNewUserEmail(''); setNewUserPhone(''); setNewUserRoleId('');
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: typeof formErrors = {};
    const n = newUserName.trim(), e = newUserEmail.trim(), p = newUserPhone.trim();
    if (!n) errors.name = 'Full name is required.';
    else if (n.length > 20) errors.name = 'Full name cannot exceed 20 characters.';
    if (!e) errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errors.email = 'Please enter a valid email address.';
    if (!p) errors.phone = 'Phone number is required.';
    else if (!/^[6-9]\d{9}$/.test(p)) errors.phone = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.';
    if (!newUserRoleId) errors.roleId = 'Please select an access role.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setTimeout(() => {
        const firstError = document.querySelector('.border-red-300, .border-red-400');
        if (firstError) (firstError as HTMLElement).focus();
      }, 50);
      return;
    }
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      const res = await userApi.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        phone: newUserPhone.trim(),
        roleId: newUserRoleId,
      });
      const sMsg = res.data.message || 'User created successfully!';
      setSuccess(sMsg);
      showToast(sMsg, 'success');
      closeUserModal(); fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to create user.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally { setSubmitting(false); }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      if (editingRoleId) {
        const res = await userApi.updateRole(editingRoleId, { name: newRoleName, description: newRoleDesc });
        const sMsg = res.data.message || 'Role updated successfully.';
        setSuccess(sMsg);
        showToast(sMsg, 'success');
      } else {
        const res = await userApi.createRole({ name: newRoleName, description: newRoleDesc });
        const sMsg = res.data.message || 'Role created successfully.';
        setSuccess(sMsg);
        showToast(sMsg, 'success');
      }
      setShowRoleModal(false); setEditingRoleId(null); setNewRoleName(''); setNewRoleDesc(''); setEditingRoleCreatedAt(null); setEditingRoleUpdatedAt(null);
      fetchData(true);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to save role.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally { setSubmitting(false); }
  };

  const handleOpenEditRole = (role: DbRole) => {
    setEditingRoleId(role.id);
    setNewRoleName(role.name);
    setNewRoleDesc(role.description || '');
    setEditingRoleCreatedAt(role.createdAt);
    setEditingRoleUpdatedAt(role.updatedAt || null);
    setShowRoleModal(true);
  };

  const handleToggleBlock = async (user: User) => {
    setError(null); setSuccess(null);
    const action = user.isBlocked ? 'unblock' : 'block';
    try {
      await userApi.toggleBlock(user.id, action as 'block' | 'unblock');
      const sMsg = `User ${user.name} has been ${action}ed successfully.`;
      setSuccess(sMsg);
      showToast(sMsg, 'success');
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || `Failed to ${action} user.`;
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setEditUserName(''); setEditUserEmail(''); setEditUserPhone(''); setEditUserRoleId('');
    setEditFormErrors({});
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserEmail(u.email);
    setEditUserPhone(u.phone);
    const roleObj = roles.find(r => r.name === u.role);
    setEditUserRoleId(roleObj?.id || '');
    setEditFormErrors({});
    setShowEditModal(true);
  };

  const validateEditForm = () => {
    const errors: typeof editFormErrors = {};
    const n = editUserName.trim(), e = editUserEmail.trim(), p = editUserPhone.trim();
    if (!n) errors.name = 'Full name is required.';
    else if (n.length > 20) errors.name = 'Full name cannot exceed 20 characters.';
    if (!e) errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errors.email = 'Please enter a valid email address.';
    if (!p) errors.phone = 'Phone number is required.';
    else if (!/^[6-9]\d{9}$/.test(p)) errors.phone = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.';
    if (!editUserRoleId) errors.roleId = 'Please select an access role.';
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !validateEditForm()) return;
    setSubmitting(true); setError(null);
    try {
      const res = await userApi.updateUser(editingUser.id, {
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        phone: editUserPhone.trim(),
        roleId: editUserRoleId,
      });
      const msg = res.data.message || 'User updated successfully.';
      setSuccess(msg); showToast(msg, 'success');
      closeEditModal(); fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to update user.';
      setError(errMsg); showToast(errMsg, 'error');
    } finally { setSubmitting(false); }
  };

  const handleDeleteUser = async (userId: string) => {
    setError(null);
    try {
      await userApi.deleteUser(userId);
      const msg = 'User deleted successfully.';
      setSuccess(msg); showToast(msg, 'success');
      setShowDeleteConfirm(null); fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to delete user.';
      setError(errMsg); showToast(errMsg, 'error');
      setShowDeleteConfirm(null);
    }
  };

  const getSessionLabel = (u: User) => {
    if (!u.lastLoginAt) return <span className="text-[11px] italic text-stone-400">Not yet logged in</span>;
    
    const locationLink = (
      <button 
        onClick={() => u.lastLoginLatitude && u.lastLoginLongitude && setMapData({ lat: u.lastLoginLatitude, lng: u.lastLoginLongitude, name: u.name })}
        disabled={!u.lastLoginLatitude || !u.lastLoginLongitude}
        className={`inline-flex items-center justify-center gap-1 text-[11px] font-semibold border-0 bg-transparent p-0 m-0 ${
          u.lastLoginLatitude && u.lastLoginLongitude 
            ? 'text-[#b89047] hover:text-[#9e7735] cursor-pointer' 
            : 'text-stone-300 cursor-not-allowed opacity-60'
        }`}
        title={u.lastLoginLatitude && u.lastLoginLongitude ? "View Login Location" : "No location data available"}
      >
        <MapPin size={10} /> Location
      </button>
    );

    if (u.isOnline) return (
      <div className="flex flex-col items-center justify-center gap-1">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Online
        </span>
        {locationLink}
      </div>
    );
    const logoutTime = u.lastLogoutAt ? new Date(u.lastLogoutAt) : null;
    const loginTime = new Date(u.lastLoginAt);
    const ref = logoutTime && logoutTime > loginTime ? logoutTime : loginTime;
    return (
      <div className="flex flex-col items-center justify-center gap-1">
        <span className="text-[11px] text-stone-500 dark:text-stone-400 text-center">Logged out {ref.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · {ref.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
        {locationLink}
      </div>
    );
  };

  // 1. Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchTerm.trim() ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm);

      const matchesRole = filterUserRole === 'ALL' || u.role === filterUserRole;

      const matchesStatus = filterUserStatus === 'ALL' ||
        (filterUserStatus === 'ACTIVE' && !u.isBlocked) ||
        (filterUserStatus === 'BLOCKED' && u.isBlocked);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterUserRole, filterUserStatus]);

  useEffect(() => {
    setUsersPage(1);
  }, [searchTerm, filterUserRole, filterUserStatus]);

  const userIndexStart = (usersPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(userIndexStart, userIndexStart + ITEMS_PER_PAGE);
  }, [filteredUsers, userIndexStart]);

  const totalUsersPages = useMemo(() => {
    return Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  }, [filteredUsers]);

  const handleNextUsers = () => {
    if (usersPage < totalUsersPages) setUsersPage(p => p + 1);
  };
  const handlePrevUsers = () => {
    if (usersPage > 1) setUsersPage(p => p - 1);
  };

  const usersCurrentPage = usersPage;

  // 2. Roles
  const filteredRoles = useMemo(() => {
    return roles.filter(r =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [roles, searchTerm]);

  useEffect(() => {
    setRolesPage(1);
  }, [searchTerm]);

  const roleIndexStart = (rolesPage - 1) * ITEMS_PER_PAGE;
  const paginatedRoles = useMemo(() => {
    return filteredRoles.slice(roleIndexStart, roleIndexStart + ITEMS_PER_PAGE);
  }, [filteredRoles, roleIndexStart]);

  const totalRolesPages = useMemo(() => {
    return Math.ceil(filteredRoles.length / ITEMS_PER_PAGE) || 1;
  }, [filteredRoles]);

  const handleNextRoles = () => {
    if (rolesPage < totalRolesPages) setRolesPage(p => p + 1);
  };
  const handlePrevRoles = () => {
    if (rolesPage > 1) setRolesPage(p => p - 1);
  };

  const rolesCurrentPage = rolesPage;

  // 3. Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchesSearch = !searchTerm.trim() ||
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.ipAddress && l.ipAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.userAgent && l.userAgent.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAction = filterLogAction === 'ALL' || l.action === filterLogAction;

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, filterLogAction]);

  useEffect(() => {
    setLogsPage(1);
  }, [searchTerm, filterLogAction]);

  const uniqueLogActions = useMemo(() => {
    const actions = logs.map(l => l.action);
    return ['ALL', ...Array.from(new Set(actions))];
  }, [logs]);

  const logIndexStart = (logsPage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice(logIndexStart, logIndexStart + ITEMS_PER_PAGE);
  }, [filteredLogs, logIndexStart]);

  const totalLogsPages = useMemo(() => {
    return Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1;
  }, [filteredLogs]);

  const handleNextLogs = () => {
    if (logsPage < totalLogsPages) setLogsPage(p => p + 1);
  };
  const handlePrevLogs = () => {
    if (logsPage > 1) setLogsPage(p => p - 1);
  };

  const logsCurrentPage = logsPage;

  const tabBtn = (tab: 'users' | 'roles' | 'logs', label: string) => (
    <button
      onClick={() => navigate(tab === 'users' ? '/users' : tab === 'roles' ? '/roles' : '/logs')}
      className={[
        'px-3 py-2 text-[13px] bg-transparent border-0 cursor-pointer transition-all duration-150 whitespace-nowrap',
        activeSubTab === tab
          ? 'text-stone-900 font-semibold border-b-2 border-[#b89047]'
          : 'text-stone-400 font-medium border-b-2 border-transparent hover:text-stone-600',
      ].join(' ')}
    >
      {label}
    </button>
  );

  const PaginationRow = ({ currentPage, totalPages, onNext, onPrev, start, end, count }: {
    currentPage: number; totalPages: number; onNext: () => void; onPrev: () => void;
    start: number; end: number; count: number;
  }) => (
    <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[rgba(184,144,71,0.18)] text-[11px] text-stone-500 bg-stone-50/50">
      <span>Showing {start}–{end} of {count}</span>
      <div className="flex items-center gap-1.5">
        <button className="p-1 rounded border border-[rgba(184,144,71,0.25)] bg-white hover:bg-[rgba(184,144,71,0.08)] hover:border-[#b89047] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          onClick={onPrev} disabled={currentPage === 1}>
          <ChevronLeft size={12} />
        </button>
        <span className="px-1.5">Page {currentPage} of {totalPages}</span>
        <button className="p-1 rounded border border-[rgba(184,144,71,0.25)] bg-white hover:bg-[rgba(184,144,71,0.08)] hover:border-[#b89047] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          onClick={onNext} disabled={currentPage === totalPages}>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in h-full flex flex-col p-4 overflow-hidden">
      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4 shrink-0">
        {['users', 'logs'].includes(activeSubTab) && (
          <button onClick={handleExportCSV} className={btnSecondary} title="Export CSV" disabled={activeSubTab === 'users' ? filteredUsers.length === 0 : filteredLogs.length === 0}>
            <FileText size={14} /><span>Export Report</span>
          </button>
        )}
        <button onClick={() => fetchData(true)} className={btnSecondary} title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        {userCanWrite && (
          activeSubTab === 'roles' ? (
            <button onClick={() => { setEditingRoleId(null); setNewRoleName(''); setNewRoleDesc(''); setEditingRoleCreatedAt(null); setEditingRoleUpdatedAt(null); setShowRoleModal(true); }} className={btnPrimary}>
              <Plus size={14} /><span>Add Role</span>
            </button>
          ) : (
            <button onClick={() => setShowUserModal(true)} className={btnPrimary}>
              <UserPlus size={14} /><span>Add User</span>
            </button>
          )
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[rgba(184,144,71,0.22)] mb-4 overflow-x-auto scrollbar-none">
        {tabBtn('users', `Users (${users.length})`)}
        {tabBtn('roles', `Roles (${roles.length})`)}
        {['Super Admin', 'Admin'].includes(currentUser.role) && tabBtn('logs', 'Audit Trail')}
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px]">
          <ShieldCheck size={14} className="shrink-0 mt-0.5" />{success}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[12px]">
          <Ban size={14} className="shrink-0 mt-0.5" />{error}
        </div>
      )}

      {/* Loading state */}
      <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
        activeSubTab === 'users' ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search skeleton */}
            <div className={`${card} flex items-center px-3.5 py-3.5 mb-4`}>
              <div className="w-3.5 h-3.5 bg-stone-100 rounded shimmer shrink-0 mr-2.5" />
              <div className="h-3.5 w-64 bg-stone-100 rounded shimmer" />
            </div>
            {/* Table skeleton */}
            <div className={`${card} flex-1 overflow-hidden`}>
              <div className="table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      {['S.No.', 'Full Name', 'Email', 'Phone Number', 'Role', 'Status', 'Session', 'Actions'].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td>
                          <div className="w-6 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-24 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-32 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-20 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-16 h-5 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-20 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-36 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="inline-block w-16 h-8 bg-stone-100 rounded-lg shimmer mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeSubTab === 'roles' ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search skeleton */}
            <div className={`${card} flex items-center px-3.5 py-3.5 mb-4`}>
              <div className="w-3.5 h-3.5 bg-stone-100 rounded shimmer shrink-0 mr-2.5" />
              <div className="h-3.5 w-64 bg-stone-100 rounded shimmer" />
            </div>
            {/* Table skeleton */}
            <div className={`${card} flex-1 overflow-hidden`}>
              <div className="table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      {['S.No.', 'Role Code', 'Description', 'Actions'].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td>
                          <div className="w-6 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-16 h-5 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-48 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="inline-block w-14 h-8 bg-stone-100 rounded-lg shimmer mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search skeleton */}
            <div className={`${card} flex items-center px-3.5 py-3.5 mb-4`}>
              <div className="w-3.5 h-3.5 bg-stone-100 rounded shimmer shrink-0 mr-2.5" />
              <div className="h-3.5 w-64 bg-stone-100 rounded shimmer" />
            </div>
            {/* Table skeleton */}
            <div className={`${card} flex-1 overflow-hidden`}>
              <div className="table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      {['S.No.', 'Timestamp', 'Operator', 'Action', 'Metadata'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td>
                          <div className="w-6 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-32 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-24 h-4 bg-stone-100 rounded shimmer mb-1 mx-auto" />
                          <div className="w-32 h-3.5 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-40 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                        <td>
                          <div className="w-36 h-4 bg-stone-100 rounded shimmer mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      ) : activeSubTab === 'users' ? (
        <div className="flex flex-col flex-grow min-h-0">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4 bg-stone-50/30 p-2.5 rounded-xl border border-[rgba(184,144,71,0.15)]">
            <div className={`${card} flex items-center gap-2.5 px-3.5 py-1.5 compact-search-container flex-grow min-w-[200px]`}>
              <Search size={14} className="text-stone-400 shrink-0" />
              <input
                type="text" placeholder="Search by name, email or phone…"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-[12px] text-stone-800 placeholder:text-stone-400"
              />
            </div>
            
            <div className="w-48 shrink-0 flex-grow sm:flex-grow-0">
              <SearchableSelect
                options={[
                  { value: 'ALL', label: 'All Roles' },
                  ...roles.map(r => ({ value: r.name, label: roleLabel(r.name) })),
                ]}
                value={filterUserRole}
                onChange={setFilterUserRole}
              />
            </div>
            <div className="w-48 shrink-0 flex-grow sm:flex-grow-0">
              <SearchableSelect
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active Only' },
                  { value: 'BLOCKED', label: 'Blocked Only' },
                ]}
                value={filterUserStatus}
                onChange={setFilterUserStatus}
              />
            </div>
          </div>

          {/* Users table */}
          <div className={`${card} flex-grow flex flex-col min-h-0 overflow-hidden`}>
            <div className="table-container in-card flex-1 overflow-auto">
              <table className="erp-table min-w-[750px]">
                <colgroup>
                  <col style={{ width: '44px' }} />
                  <col style={{ minWidth: '130px' }} />
                  <col style={{ minWidth: '180px' }} />
                  <col style={{ minWidth: '110px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '140px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10">#</th>
                    <th className="sticky top-0 z-10">Full Name</th>
                    <th className="sticky top-0 z-10">Email</th>
                    <th className="sticky top-0 z-10">Phone Number</th>
                    <th className="sticky top-0 z-10">Role</th>
                    <th className="sticky top-0 z-10">Status</th>
                    <th className="sticky top-0 z-10">Session</th>
                    <th className="sticky top-0 z-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-[12px] text-stone-400 italic">No users found.</td></tr>
                  ) : paginatedUsers.map((u, index) => (
                    <tr key={u.id}>
                      <td className="text-stone-400">
                        {userIndexStart + index + 1}
                      </td>
                      <td className="font-semibold text-[var(--text-primary)]">
                        {u.name}
                      </td>
                      <td>
                        {u.email}
                      </td>
                      <td>
                        {u.phone}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`text-[11.5px] font-bold ${roleBadgeClass(u.role)}`}>{roleLabel(u.role)}</span>
                      </td>
                      <td className="whitespace-nowrap">
                        {u.isBlocked
                          ? <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-rose-500"><Ban size={11} />Blocked</span>
                          : <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-600"><ShieldCheck size={11} />Active</span>}
                      </td>
                      <td className="whitespace-nowrap">{getSessionLabel(u)}</td>
                      <td className="whitespace-nowrap">
                        {u.id === currentUser.id
                          ? <span className="text-[11px] italic text-stone-400 font-medium">You</span>
                          : (currentUser.role === 'Admin' && u.role === 'Super Admin')
                            ? <span className="text-[11px] italic text-stone-400 font-medium">Protected</span>
                            : <div className="inline-flex items-center gap-1">
                                <button onClick={() => handleOpenEditUser(u)} className={btnEdit} title="Edit user">
                                  <Edit2 size={10} />Edit
                                </button>
                                <button onClick={() => handleToggleBlock(u)} className={u.isBlocked ? btnSuccess : btnWarn} title={u.isBlocked ? 'Unblock user' : 'Block user'}>
                                  {u.isBlocked ? <><Unlock size={10} />Unblock</> : <><Ban size={10} />Block</>}
                                </button>
                                <button onClick={() => setShowDeleteConfirm(u.id)} className={btnDanger} title="Delete user">
                                  <Trash2 size={10} />Delete
                                </button>
                              </div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length > 0 && (
              <PaginationRow currentPage={usersCurrentPage} totalPages={totalUsersPages} onNext={handleNextUsers} onPrev={handlePrevUsers}
                start={userIndexStart + 1} end={Math.min(userIndexStart + ITEMS_PER_PAGE, filteredUsers.length)} count={filteredUsers.length} />
            )}
          </div>
        </div>
      ) : activeSubTab === 'roles' ? (
        <div className="flex flex-col flex-grow min-h-0">
          {/* Search */}
          <div className="flex flex-wrap items-center gap-3 mb-4 bg-stone-50/30 p-2.5 rounded-xl border border-[rgba(184,144,71,0.15)]">
            <div className={`${card} flex items-center gap-2.5 px-3.5 py-1.5 compact-search-container flex-grow`}>
              <Search size={14} className="text-stone-400 shrink-0" />
              <input
                type="text" placeholder="Search by role code or description…"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-[12px] text-stone-800 placeholder:text-stone-400"
              />
            </div>
          </div>
          <div className={`${card} flex-grow flex flex-col min-h-0 overflow-hidden animate-fade-in`}>
            <div className="table-container in-card flex-1 overflow-auto">
              <table className="erp-table min-w-[480px]">
                <colgroup>
                  <col style={{ width: '44px' }} />
                  <col style={{ width: '170px' }} />
                  <col />
                  <col style={{ width: '100px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10">#</th>
                    <th className="sticky top-0 z-10">Role Code</th>
                    <th className="sticky top-0 z-10">Description</th>
                    <th className="sticky top-0 z-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRoles.map((role, index) => (
                    <tr key={role.id}>
                      <td className="text-stone-400">
                        {roleIndexStart + index + 1}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`text-[12px] font-bold ${roleBadgeClass(role.name)}`}>{role.name}</span>
                      </td>
                      <td>
                        {role.description || <span className="italic text-stone-400">No description configured.</span>}
                      </td>
                      <td className="whitespace-nowrap">
                        {['Super Admin', 'Admin'].includes(role.name)
                          ? <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 font-medium"><Settings size={10} />System</span>
                          : !userCanWrite
                            ? <span className="text-[11px] italic text-stone-400 font-medium">View Only</span>
                            : <button onClick={() => handleOpenEditRole(role)} className={btnSecondary} style={{padding:'5px 10px', fontSize:'11px'}}>
                                <Edit2 size={10} />Edit
                              </button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {roles.length > 0 && (
              <PaginationRow currentPage={rolesCurrentPage} totalPages={totalRolesPages} onNext={handleNextRoles} onPrev={handlePrevRoles}
                start={roleIndexStart + 1} end={Math.min(roleIndexStart + ITEMS_PER_PAGE, roles.length)} count={roles.length} />
            )}
          </div>
        </div>
      ) : (
        /* Audit Logs */
        <div className="flex flex-col flex-grow min-h-0">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4 bg-stone-50/30 p-2.5 rounded-xl border border-[rgba(184,144,71,0.15)]">
            <div className={`${card} flex items-center gap-2.5 px-3.5 py-1.5 compact-search-container flex-grow min-w-[200px]`}>
              <Search size={14} className="text-stone-400 shrink-0" />
              <input
                type="text" placeholder="Search by operator, action, IP, agent or role…"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-[12px] text-stone-800 placeholder:text-stone-400"
              />
            </div>
            
            <div className="w-48 shrink-0 flex-grow sm:flex-grow-0">
              <SearchableSelect
                options={uniqueLogActions.map(act => ({ value: act, label: act === 'ALL' ? 'All Actions' : act }))}
                value={filterLogAction}
                onChange={setFilterLogAction}
              />
            </div>
          </div>
          <div className={`${card} flex-grow flex flex-col min-h-0 overflow-hidden animate-fade-in`}>
            <div className="table-container in-card flex-1 overflow-auto">
              <table className="erp-table min-w-[600px]">
                <colgroup>
                  <col style={{ width: '44px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '150px' }} />
                  <col />
                  <col style={{ width: '180px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10">#</th>
                    <th className="sticky top-0 z-10">Timestamp</th>
                    <th className="sticky top-0 z-10">Operator</th>
                    <th className="sticky top-0 z-10">Action</th>
                    <th className="sticky top-0 z-10">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.length === 0
                    ? <tr><td colSpan={5} className="text-center py-8 text-[12px] text-stone-400 italic">No audit logs recorded yet.</td></tr>
                    : paginatedLogs.map((log, index) => (
                      <tr key={log.id} className="hover:bg-[rgba(184,144,71,0.05)] transition-colors">
                        <td className="text-stone-400">
                          {logIndexStart + index + 1}
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-stone-600">
                            <Calendar size={11} className="text-stone-400 shrink-0" />
                            <span>
                              {new Date(log.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        </td>
                        <td>
                          <p className="text-[12.5px] font-semibold text-stone-850 leading-tight">{log.user.name}</p>
                          <span className={`text-[10px] font-bold ${roleBadgeClass(log.user.role)}`}>{roleLabel(log.user.role)}</span>
                        </td>
                        <td>
                          <span className="text-[#7e5a20] text-[11.5px] font-mono font-bold break-all">{log.action}</span>
                        </td>
                        <td className="text-[11px] text-stone-500">
                          <p className="font-medium">IP: {log.ipAddress || 'Unknown'}</p>
                          <p className="max-w-[160px] truncate text-[10.5px] mx-auto" title={log.userAgent || ''}>UA: {log.userAgent || 'Unknown'}</p>
                          {(log.action === 'USER_LOGIN_SUCCESS' || log.action === 'USER_LOGOUT') ? (
                            <button 
                              onClick={() => log.latitude && log.longitude && setMapData({ lat: log.latitude, lng: log.longitude, name: log.user.name })}
                              disabled={!log.latitude || !log.longitude}
                              className={`inline-flex items-center justify-center gap-1 text-[10px] font-semibold border-0 bg-transparent p-0 m-0 mt-0.5 ${
                                log.latitude && log.longitude 
                                  ? 'text-[#b89047] hover:text-[#9e7735] cursor-pointer' 
                                  : 'text-stone-300 cursor-not-allowed opacity-60'
                              }`}
                              title={log.latitude && log.longitude ? "View Log Location" : "No location data available"}
                            >
                              <MapPin size={9} /> View Location
                            </button>
                          ) : log.latitude && log.longitude ? (
                            <button 
                              onClick={() => setMapData({ lat: log.latitude!, lng: log.longitude!, name: log.user.name })}
                              className="inline-flex items-center justify-center gap-1 text-[10px] text-[#b89047] hover:text-[#9e7735] font-semibold cursor-pointer border-0 bg-transparent p-0 m-0 mt-0.5"
                              title="View Log Location"
                            >
                              <MapPin size={9} /> View Location
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {logs.length > 0 && (
              <PaginationRow currentPage={logsCurrentPage} totalPages={totalLogsPages} onNext={handleNextLogs} onPrev={handlePrevLogs}
                start={logIndexStart + 1} end={Math.min(logIndexStart + ITEMS_PER_PAGE, logs.length)} count={logs.length} />
            )}
          </div>
        </div>
      )}
      </div>

      {/* ── Edit User Modal ── */}
      {showEditModal && editingUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={closeEditModal}>
          <div className="animate-scale-in w-full max-w-[440px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6 max-h-[calc(100vh-40px)] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="flex items-center gap-2 text-[16px] font-bold text-stone-900">
                <Edit2 size={18} className="text-[#b89047]" />Edit Member
              </h3>
              <button onClick={closeEditModal} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className={labelBase}>Full Name</label>
                  <span className={`text-[10px] ${editUserName.length >= 20 ? 'text-red-500' : 'text-stone-400'}`}>{editUserName.length}/20</span>
                </div>
                <input type="text" maxLength={20} placeholder="John Doe" value={editUserName}
                  onChange={e => { setEditUserName(e.target.value); if (e.target.value.trim()) setEditFormErrors(p => ({...p, name: undefined})); }}
                  className={`${inputBase} ${editFormErrors.name ? inputInvalid : ''}`} />
                {editFormErrors.name && <span className="text-[11px] font-semibold text-red-500">{editFormErrors.name}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Email Address</label>
                <input type="email" placeholder="john@company.com" value={editUserEmail}
                  onChange={e => { setEditUserEmail(e.target.value); if (e.target.value.trim()) setEditFormErrors(p => ({...p, email: undefined})); }}
                  className={`${inputBase} ${editFormErrors.email ? inputInvalid : ''}`} />
                {editFormErrors.email && <span className="text-[11px] font-semibold text-red-500">{editFormErrors.email}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Phone Number</label>
                <input type="text" maxLength={10} placeholder="1234567890" value={editUserPhone}
                  onChange={e => { const d = e.target.value.replace(/\D/g,'').slice(0,10); setEditUserPhone(d); if (d) setEditFormErrors(p => ({...p, phone: undefined})); }}
                  className={`${inputBase} ${editFormErrors.phone ? inputInvalid : ''}`} />
                {editFormErrors.phone && <span className="text-[11px] font-semibold text-red-500">{editFormErrors.phone}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Access Role</label>
                <SearchableSelect
                  options={[
                    { value: '', label: '— Select a role —' },
                    ...availableRoles.map(r => ({ value: r.id, label: roleLabel(r.name) })),
                  ]}
                  value={editUserRoleId}
                  onChange={(val) => { setEditUserRoleId(val); if (val) setEditFormErrors(p => ({ ...p, roleId: undefined })); }}
                  error={editFormErrors.roleId}
                />
                {editFormErrors.roleId && <span className="text-[11px] font-semibold text-red-500">{editFormErrors.roleId}</span>}
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeEditModal} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                <button type="submit" disabled={submitting} className={`${btnPrimary} flex-1 justify-center`}>
                  {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Edit2 size={13} />}
                  {submitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)}>
          <div className="animate-scale-in w-full max-w-[380px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6 max-h-[calc(100vh-40px)] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-[16px] font-bold text-stone-900">
                <Trash2 size={18} className="text-rose-500" />Delete Member
              </h3>
              <button onClick={() => setShowDeleteConfirm(null)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>
            <p className="text-[13px] text-stone-600 mb-2">
              Are you sure you want to delete <span className="font-semibold text-stone-900">{users.find(u => u.id === showDeleteConfirm)?.name}</span>?
            </p>
            <p className="text-[12px] text-stone-400 mb-5">This soft-deletes the user — their data is preserved but they can no longer log in.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowDeleteConfirm(null)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
              <button type="button" onClick={() => handleDeleteUser(showDeleteConfirm)} className="inline-flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white bg-rose-500 hover:bg-rose-600 hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer border-0">
                <Trash2 size={13} />Delete Member
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Add User Modal ── */}
      {showUserModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={closeUserModal}>
          <div className="animate-scale-in w-full max-w-[440px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6 max-h-[calc(100vh-40px)] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="flex items-center gap-2 text-[16px] font-bold text-stone-900">
                <UserPlus size={18} className="text-[#b89047]" />Create Member
              </h3>
              <button onClick={closeUserModal} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} noValidate className="flex flex-col gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className={labelBase}>Full Name</label>
                  <span className={`text-[10px] ${newUserName.length >= 20 ? 'text-red-500' : 'text-stone-400'}`}>{newUserName.length}/20</span>
                </div>
                <input type="text" maxLength={20} placeholder="John Doe" value={newUserName}
                  onChange={e => { setNewUserName(e.target.value); if (e.target.value.trim()) setFormErrors(p => ({...p, name: undefined})); }}
                  className={`${inputBase} ${formErrors.name ? inputInvalid : ''}`} />
                {formErrors.name && <span className="text-[11px] font-semibold text-red-500">{formErrors.name}</span>}
              </div>
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Email Address</label>
                <input type="email" placeholder="john@company.com" value={newUserEmail}
                  onChange={e => { setNewUserEmail(e.target.value); if (e.target.value.trim()) setFormErrors(p => ({...p, email: undefined})); }}
                  className={`${inputBase} ${formErrors.email ? inputInvalid : ''}`} />
                {formErrors.email && <span className="text-[11px] font-semibold text-red-500">{formErrors.email}</span>}
              </div>
              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Phone Number</label>
                <input type="text" maxLength={10} placeholder="1234567890" value={newUserPhone}
                  onChange={e => { const d = e.target.value.replace(/\D/g,'').slice(0,10); setNewUserPhone(d); if (d) setFormErrors(p => ({...p, phone: undefined})); }}
                  className={`${inputBase} ${formErrors.phone ? inputInvalid : ''}`} />
                {formErrors.phone && <span className="text-[11px] font-semibold text-red-500">{formErrors.phone}</span>}
              </div>
              {/* Role */}
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Access Role</label>
                <SearchableSelect
                  options={[
                    { value: '', label: '— Select a role —' },
                    ...availableRoles.map(r => ({ value: r.id, label: roleLabel(r.name) })),
                  ]}
                  value={newUserRoleId}
                  onChange={(val) => {
                    setNewUserRoleId(val);
                    if (val) setFormErrors(p => ({ ...p, roleId: undefined }));
                  }}
                  error={formErrors.roleId}
                />
                {formErrors.roleId && <span className="text-[11px] font-semibold text-red-500">{formErrors.roleId}</span>}
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeUserModal} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                <button type="submit" disabled={submitting} className={`${btnPrimary} flex-1 justify-center`}>
                  {submitting ? <RefreshCw size={13} className="animate-spin" /> : <UserPlus size={13} />}
                  {submitting ? 'Creating…' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Role Modal ── */}
      {showRoleModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowRoleModal(false)}>
          <div className="animate-scale-in w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6 max-h-[calc(100vh-40px)] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold text-stone-900">{editingRoleId ? 'Edit Role' : 'Create Role'}</h3>
              <button onClick={() => setShowRoleModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRoleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Role Name</label>
                <input
                  type="text"
                  placeholder="e.g. PROJECT_LEAD"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className={`${inputBase} ${editingRoleId ? 'bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed font-medium' : ''}`}
                  required
                  disabled={!!editingRoleId}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelBase}>Description</label>
                <textarea placeholder="Brief description of this role…" value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)} rows={3}
                  className={`${inputBase} resize-none`} />
              </div>
              {editingRoleId && (
                <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 flex flex-col gap-2">
                  {editingRoleCreatedAt && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-400 font-semibold uppercase tracking-wider">Created At</span>
                      <span className="text-stone-700 dark:text-stone-300 font-medium">
                        {new Date(editingRoleCreatedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(editingRoleCreatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  )}
                  {editingRoleUpdatedAt && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-400 font-semibold uppercase tracking-wider">Updated At</span>
                      <span className="text-stone-700 dark:text-stone-300 font-medium">
                        {new Date(editingRoleUpdatedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(editingRoleUpdatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowRoleModal(false)} className={`${btnSecondary} flex-1 justify-center`}>Cancel</button>
                <button type="submit" disabled={submitting || !newRoleName.trim()} className={`${btnPrimary} flex-1 justify-center`}>
                  {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Edit2 size={13} />}
                  {submitting ? 'Saving…' : editingRoleId ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* ── Map Modal ── */}
      {mapData && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setMapData(null)}>
          <div className="animate-scale-in w-full max-w-[600px] bg-white rounded-2xl shadow-xl border border-[rgba(184,144,71,0.3)] p-6 max-h-[calc(100vh-40px)] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-[16px] font-bold text-stone-900">
                <MapPin size={18} className="text-[#b89047]" /> Location for {mapData.name}
              </h3>
              <button onClick={() => setMapData(null)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer border-0 bg-transparent">
                <X size={16} />
              </button>
            </div>
            <div className="w-full h-[400px] rounded-xl overflow-hidden border border-[rgba(184,144,71,0.2)]">
              <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                scrolling="no" 
                src={`https://maps.google.com/maps?q=${mapData.lat},${mapData.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                title={`Google Maps location for ${mapData.name}`}
              ></iframe>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
