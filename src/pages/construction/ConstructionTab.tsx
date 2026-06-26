import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HardHat, ListTodo, ClipboardCheck, Banknote,
  Plus, ChevronDown, ChevronRight, AlertCircle, AlertTriangle,
  CheckCircle2, Clock, Pause, TrendingDown,
  FileText, Send, X, Loader2, RefreshCw,
  Pencil, Paperclip, ExternalLink, Upload,
} from 'lucide-react';
import { constructionApi } from '../../services/construction.api';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Task {
  id: string; taskId: string; title: string; category: string;
  priority: string; status: string; progressPct: number;
  plannedStart: string; plannedEnd: string; actualStart?: string; actualEnd?: string;
  description?: string;
  assignedEngineer?: { id: string; name: string };
  createdBy: { id: string; name: string };
  dependsOn?: { id: string; taskId: string; title: string };
  _count?: { dailyReports: number };
}

interface Report {
  id: string; taskId: string; projectId: string; reportDate: string;
  progressPct: number; workDone: string; issues?: string; photos?: string;
  isDelayed: boolean; delayReason?: string;
  task?: { id: string; taskId: string; title: string; category: string };
  submittedBy: { id: string; name: string };
}

interface SPR {
  id: string; sprNo: string; projectId: string;
  expenseType: string; description: string; amount: string;
  vendorName?: string; documents?: string; status: string;
  requestedBy: { id: string; name: string };
  pmReviewedBy?: { id: string; name: string }; pmReviewedAt?: string; pmRemarks?: string;
  adminReviewedBy?: { id: string; name: string }; adminReviewedAt?: string; adminRemarks?: string;
  outflowExpenseId?: string;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  NOT_STARTED: { label: 'Not Started', color: 'text-slate-500', icon: <Clock size={13} /> },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-600', icon: <TrendingDown size={13} /> },
  COMPLETED:   { label: 'Completed',   color: 'text-emerald-600', icon: <CheckCircle2 size={13} /> },
  DELAYED:     { label: 'Delayed',     color: 'text-red-600', icon: <AlertCircle size={13} /> },
  ON_HOLD:     { label: 'On Hold',     color: 'text-amber-600', icon: <Pause size={13} /> },
};

const SPR_STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING_PM:    { label: 'Pending PM',    color: 'text-amber-600 bg-amber-50' },
  PENDING_ADMIN: { label: 'Pending Admin', color: 'text-blue-600 bg-blue-50' },
  APPROVED:      { label: 'Approved',      color: 'text-emerald-600 bg-emerald-50' },
  REJECTED:      { label: 'Rejected',      color: 'text-red-600 bg-red-50' },
  SENT_BACK:     { label: 'Sent Back',     color: 'text-orange-600 bg-orange-50' },
};

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  MATERIAL: 'Material', LABOR: 'Labor', VENDOR: 'Vendor',
  EQUIPMENT: 'Equipment', OTHER: 'Other',
};

const TASK_CATEGORIES = ['Foundation', 'Slab', 'Brickwork', 'Plastering', 'Flooring',
  'Electrical', 'Plumbing', 'Waterproofing', 'Painting', 'Roofing', 'Other'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date?: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(amount: string | number) {
  const n = Number(amount);
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  role: string;
  userId?: string;
  assignableUsers?: { id: string; name: string; role: { name: string } }[];
}

type SubTab = 'tasks' | 'reports' | 'payments';

export default function ConstructionTab({ projectId, role, userId, assignableUsers = [] }: Props) {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<SubTab>('tasks');

  const isPM = role === 'Super Admin' || role === 'Project Manager';
  const isSE = role === 'Site Engineer' || role === 'Construction Head';
  const isAdmin = role === 'Super Admin';
  const canCreateTask = isPM;
  const canSubmitReport = isSE || isPM;
  const canCreateSPR = isSE || isPM;
  const canPMReview = isPM;
  const canAdminReview = isAdmin;

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1 w-fit">
        {([
          { id: 'tasks',    label: 'Task Plan',      icon: <ListTodo size={14} /> },
          { id: 'reports',  label: 'Daily Reports',  icon: <ClipboardCheck size={14} /> },
          { id: 'payments', label: 'Payment Requests', icon: <Banknote size={14} /> },
        ] as { id: SubTab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${subTab === t.id ? 'bg-white shadow text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {subTab === 'tasks' && (
        <TasksPanel
          projectId={projectId}
          canCreate={canCreateTask}
          canUpdateStatus={isSE || isPM}
          assignableUsers={assignableUsers}
          showToast={showToast}
        />
      )}
      {subTab === 'reports' && (
        <ReportsPanel
          projectId={projectId}
          canSubmit={canSubmitReport}
          userId={userId}
          showToast={showToast}
        />
      )}
      {subTab === 'payments' && (
        <PaymentsPanel
          projectId={projectId}
          canCreate={canCreateSPR}
          canPMReview={canPMReview}
          canAdminReview={canAdminReview}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ── Tasks Panel ───────────────────────────────────────────────────────────────

function TasksPanel({ projectId, canCreate, canUpdateStatus, assignableUsers, showToast }: any) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<Task | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await constructionApi.listTasks(projectId);
      setTasks(res.data.tasks);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to load tasks.', 'error');
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const engineers = assignableUsers.filter((u: any) =>
    ['Site Engineer', 'Construction Head'].includes(u.role?.name)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-500">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        <div className="flex gap-2">
          <button onClick={load} className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600">
            <RefreshCw size={13} />
          </button>
          {canCreate && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white hover:brightness-110"
            >
              <Plus size={13} /> Add Task
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-stone-400" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">No tasks yet. {canCreate && 'Add the first task.'}</div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              expanded={expandedTask === task.id}
              onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              canUpdateStatus={canUpdateStatus}
              onStatusClick={() => setStatusModal(task)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <TaskForm
          projectId={projectId}
          tasks={tasks}
          engineers={engineers}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
          showToast={showToast}
        />
      )}
      {statusModal && (
        <StatusUpdateModal
          projectId={projectId}
          task={statusModal}
          onClose={() => setStatusModal(null)}
          onSaved={() => { setStatusModal(null); load(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function TaskCard({ task, expanded, onToggle, canUpdateStatus, onStatusClick }: any) {
  const meta = STATUS_META[task.status] ?? STATUS_META.NOT_STARTED;
  const now = new Date();
  const overdue = task.status !== 'COMPLETED' && new Date(task.plannedEnd) < now;
  const daysLate = overdue
    ? Math.floor((now.getTime() - new Date(task.plannedEnd).getTime()) / 86_400_000)
    : 0;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${overdue ? 'border-red-200' : 'border-stone-200'}`}>
      <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-stone-400">{task.taskId}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_BADGE[task.priority] ?? ''}`}>
              {task.priority}
            </span>
            <span className="text-xs font-medium text-stone-700 truncate">{task.title}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-500">
            <span className="bg-stone-100 px-1.5 py-0.5 rounded">{task.category}</span>
            <span>{fmt(task.plannedStart)} → {fmt(task.plannedEnd)}</span>
            {task.assignedEngineer && <span>@{task.assignedEngineer.name}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Auto delay badge */}
          {daysLate > 0 && (
            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200">
              +{daysLate}d late
            </span>
          )}
          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' : task.status === 'DELAYED' ? 'bg-red-500' : 'bg-[#b89047]'}`}
                style={{ width: `${task.progressPct}%` }}
              />
            </div>
            <span className="text-[10px] text-stone-500">{task.progressPct}%</span>
          </div>

          <div className={`flex items-center gap-1 text-[11px] font-medium ${meta.color}`}>
            {meta.icon}{meta.label}
          </div>

          {canUpdateStatus && task.status !== 'COMPLETED' && (
            <button
              onClick={e => { e.stopPropagation(); onStatusClick(); }}
              className="text-[10px] px-2 py-1 border border-stone-200 rounded hover:bg-stone-50 text-stone-600"
            >
              Update
            </button>
          )}
          {expanded ? <ChevronDown size={14} className="text-stone-400" /> : <ChevronRight size={14} className="text-stone-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-100 px-4 py-3 bg-stone-50 text-xs text-stone-600 space-y-1">
          {task.description && <p>{task.description}</p>}
          {task.dependsOn && <p className="text-stone-400">Depends on: {task.dependsOn.taskId} — {task.dependsOn.title}</p>}
          <div className="flex gap-4 text-[11px] text-stone-400">
            <span>Daily reports: {task._count?.dailyReports ?? 0}</span>
            {task.actualStart && <span>Started: {fmt(task.actualStart)}</span>}
            {task.actualEnd && <span>Completed: {fmt(task.actualEnd)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskForm({ projectId, tasks, engineers, onClose, onSaved, showToast }: any) {
  const [form, setForm] = useState({
    title: '', category: TASK_CATEGORIES[0], description: '',
    priority: 'MEDIUM', plannedStart: '', plannedEnd: '',
    assignedEngineerId: '', dependsOnId: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim() || !form.plannedStart || !form.plannedEnd) {
      showToast('Title, planned start, and planned end are required.', 'error'); return;
    }
    try {
      setSaving(true);
      await constructionApi.createTask(projectId, {
        ...form,
        assignedEngineerId: form.assignedEngineerId || null,
        dependsOnId: form.dependsOnId || null,
        description: form.description || null,
      });
      showToast('Task created.', 'success');
      onSaved();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to create task.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">New Construction Task</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Task Title *">
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047]"
              placeholder="e.g. Excavation & Foundation Work" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category *">
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047]">
                {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047]">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Planned Start *">
              <input type="date" value={form.plannedStart} onChange={e => set('plannedStart', e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047]" />
            </Field>
            <Field label="Planned End *">
              <input type="date" value={form.plannedEnd} onChange={e => set('plannedEnd', e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047]" />
            </Field>
          </div>
          <Field label="Assigned Engineer">
            <select value={form.assignedEngineerId} onChange={e => set('assignedEngineerId', e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047]">
              <option value="">— Not assigned —</option>
              {engineers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Depends On (optional)">
            <select value={form.dependsOnId} onChange={e => set('dependsOnId', e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047]">
              <option value="">— No dependency —</option>
              {tasks.map((t: Task) => (
                <option key={t.id} value={t.id}>{t.taskId} — {t.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047] resize-none"
              placeholder="Additional notes..." />
          </Field>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-stone-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 size={13} className="animate-spin" />} Save Task
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusUpdateModal({ projectId, task, onClose, onSaved, showToast }: any) {
  const [status, setStatus] = useState(task.status);
  const [progressPct, setProgressPct] = useState(String(task.progressPct));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      await constructionApi.updateTaskStatus(projectId, task.id, status, Number(progressPct));
      showToast('Task status updated.', 'success');
      onSaved();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to update status.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Update Task Status</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-stone-600">{task.taskId} — {task.title}</p>
          <Field label="Status">
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047]">
              {['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ON_HOLD'].map(s => (
                <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
              ))}
            </select>
          </Field>
          <Field label={`Progress (${progressPct}%)`}>
            <input type="range" min="0" max="100" value={progressPct}
              onChange={e => setProgressPct(e.target.value)}
              className="w-full accent-[#b89047]" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-stone-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 size={13} className="animate-spin" />} Update
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reports Panel — Level 1: Task list with drill-down ────────────────────────

function ReportsPanel({ projectId, canSubmit, userId, showToast }: any) {
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedTask, setSelected] = useState<Task | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await constructionApi.listTasks(projectId);
      setTasks(res.data.tasks);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to load tasks.', 'error');
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // ── Level 2: task-level day-wise reports ──────────────────────────────────
  if (selectedTask) {
    return (
      <TaskReportsView
        projectId={projectId}
        task={selectedTask}
        canSubmit={canSubmit && selectedTask.status !== 'COMPLETED'}
        userId={userId}
        showToast={showToast}
        onBack={() => setSelected(null)}
        onTaskUpdated={load}
      />
    );
  }

  // ── Level 1: task selection list ──────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-stone-500 font-medium">Select a task to view day-wise reports</span>
        <button onClick={load} className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600">
          <RefreshCw size={13} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-stone-400" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">No tasks yet. Add tasks first.</div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const meta    = STATUS_META[task.status] ?? STATUS_META.NOT_STARTED;
            const count   = task._count?.dailyReports ?? 0;
            const overdue = task.status !== 'COMPLETED' && new Date(task.plannedEnd) < new Date();
            return (
              <button
                key={task.id}
                onClick={() => setSelected(task)}
                className={`w-full text-left bg-white border rounded-xl px-4 py-3 hover:shadow-sm hover:border-[#b89047]/40 transition-all group
                  ${overdue ? 'border-red-200' : 'border-stone-200'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-stone-400">{task.taskId}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_BADGE[task.priority] ?? ''}`}>
                        {task.priority}
                      </span>
                      <span className="text-xs font-semibold text-stone-800 truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' : task.status === 'DELAYED' ? 'bg-red-500' : 'bg-[#b89047]'}`}
                            style={{ width: `${task.progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-stone-400">{task.progressPct}%</span>
                      </div>
                      <div className={`flex items-center gap-1 text-[11px] font-medium ${meta.color}`}>
                        {meta.icon}{meta.label}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center">
                      <div className="text-lg font-bold text-stone-700 leading-none">{count}</div>
                      <div className="text-[9px] text-stone-400 mt-0.5">report{count !== 1 ? 's' : ''}</div>
                    </div>
                    <ChevronRight size={15} className="text-stone-300 group-hover:text-[#b89047] transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Level 2: Day-wise reports for a single task ───────────────────────────────

function TaskReportsView({ projectId, task, canSubmit, userId, showToast, onBack, onTaskUpdated }: any) {
  const [reports, setReports]       = useState<Report[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editReport, setEditReport] = useState<Report | null>(null);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await constructionApi.listTaskReports(projectId, task.id);
      const sorted = [...(res.data.reports ?? [])].sort(
        (a: Report, b: Report) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
      );
      setReports(sorted);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to load reports.', 'error');
    } finally { setLoading(false); }
  }, [projectId, task.id]);

  useEffect(() => { load(); }, [load]);

  const meta = STATUS_META[task.status] ?? STATUS_META.NOT_STARTED;

  return (
    <div className="space-y-3">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <button
          onClick={onBack}
          className="flex items-center gap-1 hover:text-[#b89047] font-medium transition-colors"
        >
          <ChevronRight size={12} className="rotate-180" /> Daily Reports
        </button>
        <span>/</span>
        <span className="text-stone-700 font-medium truncate">{task.taskId} — {task.title}</span>
      </div>

      {/* Task summary bar */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_BADGE[task.priority] ?? ''}`}>
              {task.priority}
            </span>
            <span className="text-[10px] bg-white border border-stone-200 px-1.5 py-0.5 rounded text-stone-600">
              {task.category}
            </span>
            <div className={`flex items-center gap-1 text-xs font-medium ${meta.color}`}>
              {meta.icon}{meta.label}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-28 h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' : task.status === 'DELAYED' ? 'bg-red-500' : 'bg-[#b89047]'}`}
                style={{ width: `${task.progressPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-stone-700">{task.progressPct}%</span>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[11px] text-stone-400">
          <span>Plan: {fmt(task.plannedStart)} → {fmt(task.plannedEnd)}</span>
          {task.assignedEngineer && <span>Engineer: {task.assignedEngineer.name}</span>}
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-stone-500">
          {reports.length} report{reports.length !== 1 ? 's' : ''} · newest first
        </span>
        <div className="flex gap-2">
          <button onClick={load} className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600">
            <RefreshCw size={13} />
          </button>
          {canSubmit && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white hover:brightness-110"
            >
              <Plus size={13} /> Submit Report
            </button>
          )}
        </div>
      </div>

      {/* Reports list — day-wise */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-stone-400" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-10 text-stone-400 text-sm">
          No reports yet for this task.{canSubmit ? ' Submit the first one above.' : ''}
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r, idx) => {
            const isOpen    = expanded === r.id;
            const prevPct   = reports[idx + 1]?.progressPct;
            const pctDelta  = prevPct !== undefined ? r.progressPct - prevPct : null;
            return (
              <div
                key={r.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${r.isDelayed ? 'border-red-200' : 'border-stone-200'}`}
              >
                {/* Summary row — always visible, clickable */}
                <button
                  className="w-full text-left px-4 py-3 flex items-center gap-3"
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                >
                  {/* Date column */}
                  <div className="shrink-0 text-center w-12">
                    <div className="text-base font-bold text-stone-800 leading-none">
                      {new Date(r.reportDate).getDate()}
                    </div>
                    <div className="text-[9px] text-stone-400 uppercase tracking-wide">
                      {new Date(r.reportDate).toLocaleString('en-IN', { month: 'short' })}
                    </div>
                    <div className="text-[9px] text-stone-300">
                      {new Date(r.reportDate).getFullYear()}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-10 bg-stone-100 shrink-0" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.isDelayed && (
                        <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                          Delayed
                        </span>
                      )}
                      <p className="text-xs text-stone-700 line-clamp-1">{r.workDone}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-400">
                      <span>by {r.submittedBy.name}</span>
                      {r.issues && (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                          <AlertTriangle size={10} className="shrink-0" /> Issues noted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-stone-700">{r.progressPct}%</div>
                    {pctDelta !== null && (
                      <div className={`text-[10px] font-medium ${pctDelta > 0 ? 'text-emerald-600' : pctDelta < 0 ? 'text-red-500' : 'text-stone-300'}`}>
                        {pctDelta > 0 ? `+${pctDelta}` : pctDelta}%
                      </div>
                    )}
                  </div>

                  <ChevronDown size={14} className={`text-stone-300 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-stone-100 px-4 py-3 bg-stone-50 space-y-3">
                    {/* Work done — full text */}
                    <div>
                      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Work Done</p>
                      <p className="text-xs text-stone-700 leading-relaxed">{r.workDone}</p>
                    </div>

                    {/* Issues */}
                    {r.issues && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-1">Issues</p>
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                          {r.issues}
                        </p>
                      </div>
                    )}

                    {/* Delay reason */}
                    {r.isDelayed && r.delayReason && (
                      <div>
                        <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-1">Delay Reason</p>
                        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          {r.delayReason}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-100">
                      <span>Submitted by <span className="font-medium text-stone-600">{r.submittedBy.name}</span></span>
                      <div className="flex items-center gap-2">
                        <span>{fmt(r.reportDate)}</span>
                        {userId && r.submittedBy.id === userId && (
                          <button
                            onClick={() => setEditReport(r)}
                            className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-[#b89047] transition-colors"
                          >
                            <Pencil size={10} /> Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ReportForm
          projectId={projectId}
          task={task}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); onTaskUpdated?.(); }}
          showToast={showToast}
        />
      )}
      {editReport && (
        <ReportEditModal
          projectId={projectId}
          task={task}
          report={editReport}
          onClose={() => setEditReport(null)}
          onSaved={() => { setEditReport(null); load(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ── Report Edit Modal ─────────────────────────────────────────────────────────

function ReportEditModal({ projectId, task, report, onClose, onSaved, showToast }: any) {
  const [form, setForm] = useState({
    workDone:   report.workDone,
    issues:     report.issues ?? '',
    progressPct: String(report.progressPct),
    isDelayed:  report.isDelayed,
    delayReason: report.delayReason ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.workDone.trim()) { showToast('Work done is required.', 'error'); return; }
    try {
      setSaving(true);
      await constructionApi.updateReport(projectId, task.id, report.id, {
        workDone:    form.workDone,
        issues:      form.issues || null,
        progressPct: Number(form.progressPct),
        isDelayed:   form.isDelayed,
        delayReason: form.delayReason || null,
      });
      showToast('Report updated.', 'success');
      onSaved();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to update report.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <h3 className="font-semibold text-stone-800">Edit Report</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">{task.taskId} — {fmt(report.reportDate)}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label={`Progress — ${form.progressPct}%`}>
            <input type="range" min="0" max="100" value={form.progressPct}
              onChange={e => set('progressPct', e.target.value)}
              className="w-full accent-[#b89047]" />
          </Field>
          <Field label="Work Done *">
            <textarea value={form.workDone} onChange={e => set('workDone', e.target.value)}
              rows={4} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047] resize-none"
              placeholder="Describe what was done..." />
          </Field>
          <Field label="Remarks / Issues (optional)">
            <textarea value={form.issues} onChange={e => set('issues', e.target.value)}
              rows={2} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047] resize-none"
              placeholder="Any blockers, observations, site remarks..." />
          </Field>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="editDelayed" checked={form.isDelayed}
              onChange={e => set('isDelayed', e.target.checked)} className="accent-[#b89047]" />
            <label htmlFor="editDelayed" className="text-sm text-stone-700">Mark as delayed</label>
          </div>
          {form.isDelayed && (
            <Field label="Delay Reason">
              <input value={form.delayReason} onChange={e => set('delayReason', e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047]"
                placeholder="Reason for delay..." />
            </Field>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-stone-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 size={13} className="animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report Submit Form (task pre-selected) ────────────────────────────────────

function ReportForm({ projectId, task, onClose, onSaved, showToast }: any) {
  const [form, setForm] = useState({
    reportDate: new Date().toISOString().slice(0, 10),
    progressPct: String(task?.progressPct ?? 0),
    workDone: '', issues: '', isDelayed: false, delayReason: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.workDone.trim()) {
      showToast('Work done description is required.', 'error'); return;
    }
    try {
      setSaving(true);
      await constructionApi.submitReport(projectId, task.id, {
        reportDate: form.reportDate,
        progressPct: Number(form.progressPct),
        workDone: form.workDone,
        issues: form.issues || null,
        isDelayed: form.isDelayed,
        delayReason: form.delayReason || null,
      });
      showToast('Daily report submitted.', 'success');
      onSaved();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to submit report.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <h3 className="font-semibold text-stone-800">Submit Daily Report</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">{task.taskId} — {task.title}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Report Date *">
            <input type="date" value={form.reportDate} onChange={e => set('reportDate', e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047]" />
          </Field>
          <Field label={`Progress — ${form.progressPct}%`}>
            <div className="space-y-1.5">
              <input type="range" min="0" max="100" value={form.progressPct}
                onChange={e => set('progressPct', e.target.value)}
                className="w-full accent-[#b89047]" />
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </Field>
          <Field label="Work Done Today *">
            <textarea value={form.workDone} onChange={e => set('workDone', e.target.value)}
              rows={4} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047] resize-none"
              placeholder="Describe in detail what was done today..." />
          </Field>
          <Field label="Issues / Blockers (optional)">
            <textarea value={form.issues} onChange={e => set('issues', e.target.value)}
              rows={2} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047] resize-none"
              placeholder="Any blockers, material shortages, quality issues..." />
          </Field>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isDelayed" checked={form.isDelayed}
              onChange={e => set('isDelayed', e.target.checked)} className="accent-[#b89047]" />
            <label htmlFor="isDelayed" className="text-sm text-stone-700">Mark this task as delayed</label>
          </div>
          {form.isDelayed && (
            <Field label="Delay Reason *">
              <input value={form.delayReason} onChange={e => set('delayReason', e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047]"
                placeholder="e.g. Material not delivered, Labour shortage..." />
            </Field>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-stone-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 size={13} className="animate-spin" />} Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Payments Panel ────────────────────────────────────────────────────────────

function PaymentsPanel({ projectId, canCreate, canPMReview, canAdminReview, showToast }: any) {
  const [sprs, setSprs] = useState<SPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ spr: SPR; level: 'pm' | 'admin' } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await constructionApi.listSPRs(projectId);
      setSprs(res.data.sprs);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to load payment requests.', 'error');
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-500">{sprs.length} request{sprs.length !== 1 ? 's' : ''}</span>
        <div className="flex gap-2">
          <button onClick={load} className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600">
            <RefreshCw size={13} />
          </button>
          {canCreate && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white hover:brightness-110"
            >
              <Plus size={13} /> New Request
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-stone-400" /></div>
      ) : sprs.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">No payment requests yet.</div>
      ) : (
        <div className="space-y-2">
          {sprs.map(spr => (
            <SPRCard
              key={spr.id}
              spr={spr}
              canPMReview={canPMReview && spr.status === 'PENDING_PM'}
              canAdminReview={canAdminReview && spr.status === 'PENDING_ADMIN'}
              onPMReview={() => setReviewModal({ spr, level: 'pm' })}
              onAdminReview={() => setReviewModal({ spr, level: 'admin' })}
            />
          ))}
        </div>
      )}

      {showForm && (
        <SPRForm
          projectId={projectId}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
          showToast={showToast}
        />
      )}
      {reviewModal && (
        <SPRReviewModal
          projectId={projectId}
          spr={reviewModal.spr}
          level={reviewModal.level}
          onClose={() => setReviewModal(null)}
          onSaved={() => { setReviewModal(null); load(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function SPRCard({ spr, canPMReview, canAdminReview, onPMReview, onAdminReview }: any) {
  const meta = SPR_STATUS_META[spr.status] ?? { label: spr.status, color: 'text-stone-500 bg-stone-50' };
  let parsedDocs: { url: string; name: string }[] = [];
  try { parsedDocs = spr.documents ? JSON.parse(spr.documents) : []; } catch {}

  return (
    <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-stone-400">{spr.sprNo}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
          <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
            {EXPENSE_TYPE_LABELS[spr.expenseType] ?? spr.expenseType}
          </span>
        </div>
        <span className="text-sm font-semibold text-stone-800">{fmtCurrency(spr.amount)}</span>
      </div>
      <p className="text-xs text-stone-600 line-clamp-2">{spr.description}</p>
      {spr.vendorName && <p className="text-[11px] text-stone-400">Vendor: {spr.vendorName}</p>}

      {/* Supporting documents */}
      {parsedDocs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {parsedDocs.map((d, i) => (
            <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] bg-stone-50 border border-stone-200 rounded px-2 py-1 text-[#b89047] hover:bg-stone-100 transition-colors">
              <Paperclip size={9} />{d.name}
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px] text-stone-400">by {spr.requestedBy.name} · {fmt(spr.createdAt)}</span>
        <div className="flex items-center gap-2">
          {spr.outflowExpenseId && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Outflow created</span>
          )}
          {canPMReview && (
            <button onClick={onPMReview}
              className="text-[11px] px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-medium">
              PM Review
            </button>
          )}
          {canAdminReview && (
            <button onClick={onAdminReview}
              className="text-[11px] px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium">
              Admin Review
            </button>
          )}
        </div>
      </div>
      {spr.pmRemarks && (
        <p className="text-[11px] text-stone-500 bg-stone-50 px-2 py-1 rounded">PM: {spr.pmRemarks}</p>
      )}
      {spr.adminRemarks && (
        <p className="text-[11px] text-blue-600 bg-blue-50 px-2 py-1 rounded">Admin: {spr.adminRemarks}</p>
      )}
    </div>
  );
}

function SPRForm({ projectId, onClose, onSaved, showToast }: any) {
  const [form, setForm] = useState({
    expenseType: 'MATERIAL', description: '', amount: '', vendorName: '',
  });
  const [docs, setDocs]         = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data', 'x-file-type': 'spr' },
      });
      setDocs(prev => [...prev, { url: res.data.url, name: file.name }]);
    } catch {
      showToast('Failed to upload document.', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeDoc = (idx: number) => setDocs(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!form.description.trim() || !form.amount) {
      showToast('Description and amount are required.', 'error'); return;
    }
    try {
      setSaving(true);
      await constructionApi.createSPR(projectId, {
        ...form,
        amount: Number(form.amount),
        vendorName: form.vendorName || null,
        documents: docs.length > 0 ? docs : undefined,
      });
      showToast('Payment request submitted.', 'success');
      onSaved();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to submit request.', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] flex flex-col border border-stone-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-stone-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-[14px] text-stone-800 dark:text-stone-100">Submit Site Payment Request</h3>
            <p className="text-[10.5px] text-stone-400 dark:text-stone-500 mt-0.5">Request funds for site operations, direct purchases, or vendor payouts</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4.5 flex-1 scrollbar-thin">
          {/* Section 1: Financial Details */}
          <div className="bg-stone-50/50 dark:bg-slate-950/20 border border-stone-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">Financial Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Expense Type *">
                <select 
                  value={form.expenseType} 
                  onChange={e => set('expenseType', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#b89047] text-[var(--text-secondary)] font-medium cursor-pointer"
                >
                  {Object.entries(EXPENSE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Amount (₹) *">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-stone-400 font-semibold">₹</span>
                  <input 
                    type="number" 
                    min="0" 
                    value={form.amount} 
                    onChange={e => set('amount', e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs focus:outline-none focus:border-[#b89047] text-[var(--text-secondary)] font-semibold"
                    placeholder="0.00" 
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* Section 2: Vendor & Description */}
          <div className="border border-stone-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">Vendor & Purpose</h4>
            <div className="space-y-3.5">
              <Field label="Vendor / Payee Name (Optional)">
                <input 
                  value={form.vendorName} 
                  onChange={e => set('vendorName', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#b89047] text-[var(--text-secondary)]"
                  placeholder="e.g. Ravi Cement Agency, Local Labor Supervisor" 
                />
              </Field>
              <Field label="Description & Justification *">
                <textarea 
                  value={form.description} 
                  onChange={e => set('description', e.target.value)}
                  rows={3} 
                  className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#b89047] text-[var(--text-secondary)] resize-none"
                  placeholder="Please justify this request — specify items, quantities, or labor wages details..." 
                />
              </Field>
            </div>
          </div>

          {/* Section 3: Attachments */}
          <div className="border border-stone-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">Supporting Documents</h4>
            <div className="space-y-3">
              {docs.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {docs.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-stone-50 dark:bg-slate-955/20 border border-stone-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-2xs">
                      <Paperclip size={11} className="text-stone-400 shrink-0" />
                      <span className="flex-1 truncate text-stone-700 dark:text-stone-300 font-medium">{d.name}</span>
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-[#b89047] hover:underline shrink-0">
                        <ExternalLink size={11} />
                      </a>
                      <button type="button" onClick={() => removeDoc(i)} className="text-red-400 hover:text-red-650 shrink-0 cursor-pointer">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 border border-dashed border-stone-300 dark:border-slate-800 rounded-lg px-3 py-2.5 hover:border-[#b89047] hover:text-[#b89047] transition-all disabled:opacity-50 cursor-pointer hover:bg-stone-50/50 dark:hover:bg-slate-950/10"
              >
                {uploading ? <Loader2 size={12} className="animate-spin text-[#b89047]" /> : <Upload size={12} />}
                <span>{uploading ? 'Uploading receipt…' : 'Upload Receipt / Invoice / Bill'}</span>
              </button>
              <input 
                ref={fileRef} 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" 
              />
            </div>
          </div>

          {/* Guidelines info block */}
          <div className="bg-amber-500/5 border border-[#b89047]/20 rounded-xl p-3.5 space-y-1 text-[11px] text-[var(--text-secondary)]">
            <span className="font-bold text-stone-700 dark:text-stone-300 block mb-0.5">Approval Guide:</span>
            <ul className="list-disc pl-4.5 space-y-1">
              <li>Site Payment Requests (SPRs) ≤ ₹10,000 require **Project Manager** approval.</li>
              <li>Requests &gt; ₹10,000 escalate to **Super Admin** for final authorization.</li>
              <li>Approved requests are processed by Accounts, generating outflow expenses that follow the standard Admin approval thread.</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 px-6 py-4.5 border-t border-stone-100 dark:border-slate-800 bg-stone-50/30 dark:bg-slate-950/5">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={save} 
            disabled={saving || uploading}
            className="px-4.5 py-2 rounded-lg text-xs font-bold bg-gradient-to-br from-[#b89047] to-[#8f6d2e] text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            <Send size={12} /> Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

function SPRReviewModal({ projectId, spr, level, onClose, onSaved, showToast }: any) {
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | 'SEND_BACK'>('APPROVE');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      if (level === 'pm') {
        await constructionApi.pmReview(projectId, spr.id, action, remarks || undefined);
      } else {
        await constructionApi.adminReview(projectId, spr.id, action as 'APPROVE' | 'REJECT', remarks || undefined);
      }
      showToast(`Payment request ${action.toLowerCase()}d.`, 'success');
      onSaved();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Review failed.', 'error');
    } finally { setSaving(false); }
  };

  const isAdmin = level === 'admin';
  const actions = isAdmin
    ? [{ v: 'APPROVE', label: 'Approve' }, { v: 'REJECT', label: 'Reject' }]
    : [{ v: 'APPROVE', label: 'Approve' }, { v: 'REJECT', label: 'Reject' }, { v: 'SEND_BACK', label: 'Send Back' }];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">{isAdmin ? 'Admin' : 'PM'} Review — {spr.sprNo}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-stone-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-stone-500">Amount</span>
              <span className="font-semibold">{fmtCurrency(spr.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Type</span>
              <span>{EXPENSE_TYPE_LABELS[spr.expenseType]}</span>
            </div>
            <p className="text-stone-600 text-xs pt-1">{spr.description}</p>
            {(() => {
              let docs: { url: string; name: string }[] = [];
              try { docs = spr.documents ? JSON.parse(spr.documents) : []; } catch {}
              return docs.length > 0 ? (
                <div className="pt-2 border-t border-stone-200">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Supporting Docs</p>
                  <div className="flex flex-wrap gap-1.5">
                    {docs.map((d: any, i: number) => (
                      <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] bg-white border border-stone-200 rounded px-2 py-1 text-[#b89047] hover:bg-stone-50">
                        <Paperclip size={9} />{d.name}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
          <Field label="Action">
            <div className="flex gap-2">
              {actions.map(a => (
                <button key={a.v} onClick={() => setAction(a.v as any)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all
                    ${action === a.v
                      ? a.v === 'APPROVE' ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                        : a.v === 'REJECT' ? 'bg-red-50 border-red-400 text-red-700'
                        : 'bg-orange-50 border-orange-400 text-orange-700'
                      : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Remarks (optional)">
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
              rows={2} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#b89047] resize-none"
              placeholder="Add remarks..." />
          </Field>
          {action === 'APPROVE' && !isAdmin && Number(spr.amount) <= 10000 && (
            <p className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              ₹{Number(spr.amount).toFixed(0)} ≤ ₹10,000 — will auto-approve and create outflow.
            </p>
          )}
          {action === 'APPROVE' && !isAdmin && Number(spr.amount) > 10000 && (
            <p className="text-[11px] text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Amount exceeds ₹10,000 — will go to Super Admin for final approval.
            </p>
          )}
          {action === 'APPROVE' && isAdmin && (
            <p className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              Approving will auto-create an outflow expense in Accounts.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-stone-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100">Cancel</button>
          <button onClick={save} disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center gap-1.5
              ${action === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700'
                : action === 'REJECT' ? 'bg-red-600 hover:bg-red-700'
                : 'bg-orange-500 hover:bg-orange-600'}`}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            {action === 'APPROVE' ? 'Approve' : action === 'REJECT' ? 'Reject' : 'Send Back'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-stone-600">{label}</label>
      {children}
    </div>
  );
}
