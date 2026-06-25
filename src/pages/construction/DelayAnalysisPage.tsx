import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, ChevronDown, ChevronRight, RefreshCw, Loader2,
} from 'lucide-react';
import { delayAnalysisApi } from '../../services/construction.api';
import { useToast } from '../../context/ToastContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DelayedTask {
  id: string;
  taskId: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  plannedEnd: string;
  progressPct: number;
  daysLate: number;
  assignedEngineer?: { id: string; name: string };
}

interface ProjectAnalysis {
  id: string;
  status: string;
  clientName: string;
  serviceType: string;
  projectManager?: { id: string; name: string };
  totalTasks: number;
  statusCounts: Record<string, number>;
  delayedTasks: DelayedTask[];
  totalDelayedCount: number;
  maxDelayDays: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date?: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW:      'bg-slate-100 text-slate-600',
  MEDIUM:   'bg-blue-100 text-blue-700',
  HIGH:     'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const STATUS_BAR_COLOR: Record<string, string> = {
  COMPLETED:   'bg-emerald-500',
  IN_PROGRESS: 'bg-blue-500',
  DELAYED:     'bg-red-500',
  NOT_STARTED: 'bg-stone-300',
  ON_HOLD:     'bg-amber-400',
};

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className={`bg-white border rounded-xl px-4 py-3 ${alert && Number(value) > 0 ? 'border-red-200 bg-red-50/30' : 'border-stone-200'}`}>
      <div className={`text-xl font-bold ${alert && Number(value) > 0 ? 'text-red-600' : 'text-stone-700'}`}>{value}</div>
      <div className="text-[11px] text-stone-500 mt-0.5">{label}</div>
    </div>
  );
}

// ── Per-project card ──────────────────────────────────────────────────────────

function ProjectDelayCard({ project: p, expanded, onToggle }: {
  project: ProjectAnalysis;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDelays = p.totalDelayedCount > 0;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all ${hasDelays ? 'border-red-200' : 'border-stone-200'}`}>
      <button className="w-full text-left px-4 py-3 flex items-center gap-3" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {hasDelays && <AlertCircle size={12} className="text-red-500 shrink-0" />}
            <span className="text-sm font-semibold text-stone-800 truncate">{p.clientName}</span>
            <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">
              {p.serviceType.replace(/_/g, ' ')}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium
              ${p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
              {p.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-[11px] text-stone-400">
            {p.projectManager && <span>PM: {p.projectManager.name}</span>}
            <span>{p.totalTasks} task{p.totalTasks !== 1 ? 's' : ''}</span>
            {hasDelays ? (
              <span className="text-red-500 font-medium">
                {p.totalDelayedCount} delayed · max {p.maxDelayDays}d late
              </span>
            ) : (
              <span className="text-emerald-600">On schedule</span>
            )}
          </div>
        </div>

        {/* Mini task-status bar chart */}
        <div className="hidden sm:flex items-end gap-1 h-8 shrink-0">
          {(['COMPLETED', 'IN_PROGRESS', 'DELAYED', 'NOT_STARTED', 'ON_HOLD'] as const).map(s => {
            const count = p.statusCounts[s] ?? 0;
            if (!count) return null;
            return (
              <div key={s} className="flex flex-col items-center gap-0.5" title={`${s}: ${count}`}>
                <div
                  className={`w-2 rounded-sm ${STATUS_BAR_COLOR[s]}`}
                  style={{ height: `${Math.max(4, Math.min(28, count * 6))}px` }}
                />
                <span className="text-[8px] text-stone-400">{count}</span>
              </div>
            );
          })}
        </div>

        {expanded
          ? <ChevronDown size={14} className="text-stone-400 shrink-0" />
          : <ChevronRight size={14} className="text-stone-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-stone-100 bg-stone-50 px-4 py-3">
          {p.delayedTasks.length === 0 ? (
            <p className="text-xs text-emerald-600 py-2">All tasks are on schedule — no delays detected.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-2">
                Delayed Tasks ({p.delayedTasks.length})
              </p>
              {p.delayedTasks.map(t => (
                <div key={t.id} className="bg-white border border-red-100 rounded-lg px-3 py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-stone-400">{t.taskId}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLOR[t.priority] ?? ''}`}>
                        {t.priority}
                      </span>
                      <span className="text-xs font-medium text-stone-700 truncate">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-400">
                      <span className="bg-stone-100 px-1 py-0.5 rounded">{t.category}</span>
                      <span>Due: {fmt(t.plannedEnd)}</span>
                      {t.assignedEngineer && <span>@{t.assignedEngineer.name}</span>}
                      <span>{t.progressPct}% done</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right min-w-[40px]">
                    <div className="text-sm font-bold text-red-600">{t.daysLate}d</div>
                    <div className="text-[9px] text-stone-400">late</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DelayAnalysisPage({ user }: { user: any }) {
  const { showToast } = useToast();
  const [analysis, setAnalysis]     = useState<ProjectAnalysis[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await delayAnalysisApi.get();
      setAnalysis(res.data.analysis);
      setGeneratedAt(res.data.generatedAt);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to load delay analysis.', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalProjects      = analysis.length;
  const projectsWithDelays = analysis.filter(p => p.totalDelayedCount > 0).length;
  const totalDelayedTasks  = analysis.reduce((s, p) => s + p.totalDelayedCount, 0);
  const worstDelay         = analysis.reduce((m, p) => Math.max(m, p.maxDelayDays), 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-stone-800">Delay Analysis</h2>
          {generatedAt && (
            <p className="text-[11px] text-stone-400 mt-0.5">
              Auto-generated · as of{' '}
              {new Date(generatedAt).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Total Projects"  value={totalProjects} />
          <SummaryCard label="With Delays"     value={projectsWithDelays} alert />
          <SummaryCard label="Delayed Tasks"   value={totalDelayedTasks}  alert />
          <SummaryCard label="Worst Delay"     value={`${worstDelay}d`}   alert={worstDelay > 7} />
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-stone-400" />
        </div>
      ) : analysis.length === 0 ? (
        <div className="text-center py-16 text-stone-400 text-sm">No projects found.</div>
      ) : (
        <div className="space-y-2">
          {analysis.map(p => (
            <ProjectDelayCard
              key={p.id}
              project={p}
              expanded={expanded.has(p.id)}
              onToggle={() => toggle(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
