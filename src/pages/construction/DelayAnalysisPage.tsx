import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw, Loader2, AlertCircle, TrendingDown, TrendingUp,
  Shield, CheckCircle2, Activity, ChevronLeft, ChevronRight, ChevronDown,
  AlertTriangle, BarChart2, Search, Filter, X, Zap, Award, Target,
  Layers, User, CalendarDays,
} from 'lucide-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { delayAnalysisApi, constructionApi } from '../../services/construction.api';
import { useToast } from '../../context/ToastContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DelayedTask {
  id: string; taskId: string; title: string; category: string;
  status: string; priority: string; plannedEnd: string;
  progressPct: number; daysLate: number;
  isOnCriticalPath?: boolean; float?: number;
  assignedEngineer?: { id: string; name: string };
}

interface ProjectAnalysis {
  id: string; status: string; clientName: string; serviceType: string;
  projectManager?: { id: string; name: string };
  totalTasks: number; statusCounts: Record<string, number>;
  delayedTasks: DelayedTask[];
  totalDelayedCount: number; maxDelayDays: number;
  projectDelayDays: number; criticalPathTaskCount: number;
}

interface Task {
  id: string; taskId: string; title: string; category: string;
  priority: string; status: string; progressPct: number;
  plannedStart: string; plannedEnd: string;
  actualStart?: string | null; actualEnd?: string | null;
  description?: string | null; parentId?: string | null;
  assignedEngineer?: { id: string; name: string } | null;
  subTasks?: { id: string; taskId: string; title: string; status: string; progressPct: number }[];
  dependsOn?: { id: string; taskId: string; title: string } | null;
  _count?: { dailyReports: number };
}

// ── Color System ───────────────────────────────────────────────────────────────
//  Consistent palette used across all charts and badges

const C = {
  early:    '#22c55e',   // green-500  — tasks done ahead of schedule
  onTime:   '#818cf8',   // indigo-400 — tasks done on or near planned date
  late:     '#f43f5e',   // rose-500   — tasks done/running past planned date
  inProg:   '#38bdf8',   // sky-400    — currently active tasks
  notStart: '#64748b',   // slate-500  — not yet begun
  onHold:   '#fb923c',   // orange-400 — paused tasks
  gold:     '#b89047',   // brand gold
  critical: '#dc2626',   // red-600    — critical path tasks
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED:   C.early,
  IN_PROGRESS: C.inProg,
  DELAYED:     C.late,
  ON_HOLD:     C.onHold,
  NOT_STARTED: C.notStart,
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Completed', IN_PROGRESS: 'In Progress',
  DELAYED: 'Delayed', ON_HOLD: 'On Hold', NOT_STARTED: 'Not Started',
};

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#6366f1', LOW: '#94a3b8',
};

const CAT_PALETTE = [
  C.gold, '#6366f1', '#22c55e', '#f43f5e', '#fb923c',
  '#38bdf8', '#a78bfa', '#ec4899', '#34d399', '#64748b',
];

type RangeKey = '7D' | '30D' | '90D' | 'ALL';

// ── Date / format helpers ──────────────────────────────────────────────────────

const ms = (d: string | null | undefined) => d ? new Date(d).getTime() : 0;

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function fmtFull(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pct(n: number, total: number) { return total === 0 ? 0 : Math.round(n / total * 100); }

// ── Task analysis helpers ──────────────────────────────────────────────────────

/**
 * Classify a completed task based on how early or late it was delivered.
 * EARLY   = actualEnd < plannedEnd (ahead of schedule)
 * ON_TIME = actualEnd within 1 calendar day of plannedEnd
 * LATE    = actualEnd > plannedEnd + 1 day
 * PENDING = not yet completed
 */
function classifyCompletion(t: Task): 'EARLY' | 'ON_TIME' | 'LATE' | 'PENDING' {
  if (t.status !== 'COMPLETED' || !t.actualEnd) return 'PENDING';
  const diff = (ms(t.plannedEnd) - ms(t.actualEnd)) / 86400000;
  if (diff > 0)   return 'EARLY';
  if (diff >= -1) return 'ON_TIME';
  return 'LATE';
}

/** Days saved vs planned end for EARLY tasks */
function daysSaved(t: Task): number {
  if (classifyCompletion(t) !== 'EARLY' || !t.actualEnd) return 0;
  return Math.floor((ms(t.plannedEnd) - ms(t.actualEnd)) / 86400000);
}

/** Days past planned end — works for both completed-late and still-running-late tasks */
function taskDaysLate(t: Task): number {
  if (t.status === 'COMPLETED' && t.actualEnd)
    return Math.max(0, Math.floor((ms(t.actualEnd) - ms(t.plannedEnd)) / 86400000));
  return Math.max(0, Math.floor((Date.now() - ms(t.plannedEnd)) / 86400000));
}

/**
 * Schedule Performance Index (SPI) — earned value concept applied to task counts.
 * SPI = tasks actually completed / tasks that should be complete by today per plan.
 * SPI > 1 → ahead of schedule. SPI < 1 → behind schedule. SPI = 1 → on track.
 */
function computeSPI(tasks: Task[]): number {
  const today = Date.now();
  const done    = tasks.filter(t => t.status === 'COMPLETED').length;
  const planned = tasks.filter(t => ms(t.plannedEnd) <= today).length;
  if (planned === 0) return 1;
  return Math.round(done / planned * 100) / 100;
}

// ── Chart data builders ────────────────────────────────────────────────────────

/**
 * Build daily (or weekly for ranges > 45 days) stacked bars showing how many
 * tasks were completed each day — split by Early / On Time / Late.
 */
function buildActivityChart(tasks: Task[], startMs: number, endMs: number) {
  const spanDays = (endMs - startMs) / 86400000;
  const weekly   = spanDays > 45;
  const entries  = new Map<string, { date: string; Early: number; 'On Time': number; Late: number }>();

  // seed every bucket so we always have a continuous axis
  const cur = new Date(startMs); cur.setHours(0,0,0,0);
  if (weekly) cur.setDate(cur.getDate() - cur.getDay()); // align to Sunday
  while (cur.getTime() <= endMs) {
    const key = cur.toISOString().slice(0,10);
    const label = cur.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    entries.set(key, { date: label, Early: 0, 'On Time': 0, Late: 0 });
    cur.setDate(cur.getDate() + (weekly ? 7 : 1));
  }

  for (const t of tasks) {
    if (!t.actualEnd) continue;
    const d = new Date(t.actualEnd);
    if (d.getTime() < startMs || d.getTime() > endMs) continue;
    const pivot = new Date(d);
    if (weekly) pivot.setDate(d.getDate() - d.getDay());
    pivot.setHours(0, 0, 0, 0); // normalize to local midnight — matches how seeded bucket keys are computed
    const key = pivot.toISOString().slice(0,10);
    const e = entries.get(key); if (!e) continue;
    const cls = classifyCompletion(t);
    if (cls === 'EARLY')   e.Early++;
    if (cls === 'ON_TIME') e['On Time']++;
    if (cls === 'LATE')    e.Late++;
  }
  return [...entries.values()];
}

/** Planned % vs Actual % completion over weekly intervals (full project timeline) */
function buildBurnup(tasks: Task[]) {
  if (!tasks.length) return [];
  const start = Math.min(...tasks.map(t => ms(t.plannedStart)));
  const end   = Math.max(...tasks.map(t => ms(t.plannedEnd)));
  const today = Date.now();
  const total = tasks.length;
  const week  = 7 * 86400000;
  const pts   = [];
  for (let d = start; d <= Math.min(end, today) + week; d += week) {
    if (d > today + week) break;
    const ds    = new Date(d).toISOString().slice(0,10);
    const label = new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const planned = pct(tasks.filter(t => t.plannedEnd.slice(0,10) <= ds).length, total);
    let actualSum = 0;
    for (const t of tasks) {
      if (t.status === 'COMPLETED' && t.actualEnd && t.actualEnd.slice(0,10) <= ds) actualSum += 100;
      else if (t.actualStart && t.actualStart.slice(0,10) <= ds) actualSum += t.progressPct;
    }
    const actual = Math.min(100, Math.round(actualSum / total));
    pts.push({ date: label, 'Planned %': planned, 'Actual %': actual });
  }
  return pts;
}

/** Weekly task completion velocity within the selected date range */
function buildVelocity(tasks: Task[], startMs: number, endMs: number) {
  const weekMap = new Map<string, { week: string; Tasks: number }>();
  const cur = new Date(startMs); cur.setHours(0,0,0,0);
  cur.setDate(cur.getDate() - cur.getDay());
  while (cur.getTime() <= endMs) {
    const key = cur.toISOString().slice(0,10);
    weekMap.set(key, { week: cur.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), Tasks: 0 });
    cur.setDate(cur.getDate() + 7);
  }
  for (const t of tasks) {
    if (t.status !== 'COMPLETED' || !t.actualEnd) continue;
    const d = new Date(t.actualEnd);
    if (d.getTime() < startMs || d.getTime() > endMs) continue;
    const ws = new Date(d); ws.setDate(d.getDate() - d.getDay()); ws.setHours(0,0,0,0);
    const key = ws.toISOString().slice(0,10);
    const e = weekMap.get(key); if (e) e.Tasks++;
  }
  return [...weekMap.values()];
}

/** Completion classification breakdown for the donut */
function buildClassification(tasks: Task[]) {
  let early = 0, onTime = 0, late = 0, inProg = 0, notStart = 0, onHold = 0;
  for (const t of tasks) {
    const cls = classifyCompletion(t);
    if (cls === 'EARLY')   early++;
    else if (cls === 'ON_TIME') onTime++;
    else if (cls === 'LATE')    late++;
    else if (t.status === 'IN_PROGRESS') inProg++;
    else if (t.status === 'ON_HOLD')     onHold++;
    else                                 notStart++;
  }
  return [
    { name: 'Early Delivery', value: early,   fill: C.early,    note: 'Completed before planned end date' },
    { name: 'On Time',        value: onTime,  fill: C.onTime,   note: 'Completed within 1 day of planned end' },
    { name: 'Delivered Late', value: late,    fill: C.late,     note: 'Completed after planned end date' },
    { name: 'In Progress',    value: inProg,  fill: C.inProg,   note: 'Currently active' },
    { name: 'On Hold',        value: onHold,  fill: C.onHold,   note: 'Paused awaiting input' },
    { name: 'Not Started',    value: notStart,fill: C.notStart, note: 'Not yet begun per plan' },
  ].filter(d => d.value > 0);
}

/** Risk bucket distribution for incomplete tasks */
function buildRiskBuckets(tasks: Task[]) {
  const now    = Date.now();
  const counts = { 'On Schedule': 0, 'Due ≤ 14d': 0, 'Overdue': 0, 'Delayed': 0 };
  for (const t of tasks.filter(x => x.status !== 'COMPLETED')) {
    const d = (ms(t.plannedEnd) - now) / 86400000;
    if (t.status === 'DELAYED')  counts['Delayed']++;
    else if (d <= 0)             counts['Overdue']++;
    else if (d <= 14)            counts['Due ≤ 14d']++;
    else                         counts['On Schedule']++;
  }
  return Object.entries(counts).map(([name, value], i) => ({
    name, value, fill: ['#22c55e', '#f59e0b', '#f97316', '#f43f5e'][i],
  }));
}

/** Per-engineer stats: completions, early %, on-time %, days saved/late */
function buildEngineerPerf(tasks: Task[]) {
  const map: Record<string, {
    id: string; name: string; total: number;
    completed: number; early: number; onTime: number; late: number;
    inProgress: number; delayed: number;
    savedDays: number; lateDays: number;
  }> = {};
  for (const t of tasks) {
    if (!t.assignedEngineer) continue;
    const { id, name } = t.assignedEngineer;
    if (!map[id]) map[id] = { id, name, total: 0, completed: 0, early: 0, onTime: 0, late: 0, inProgress: 0, delayed: 0, savedDays: 0, lateDays: 0 };
    const m = map[id]; m.total++;
    if (t.status === 'COMPLETED') {
      m.completed++;
      const cls = classifyCompletion(t);
      if (cls === 'EARLY')   { m.early++;  m.savedDays += daysSaved(t); }
      if (cls === 'ON_TIME') m.onTime++;
      if (cls === 'LATE')    { m.late++;   m.lateDays  += taskDaysLate(t); }
    } else if (t.status === 'IN_PROGRESS') m.inProgress++;
    else if (t.status === 'DELAYED') { m.delayed++; m.lateDays += taskDaysLate(t); }
  }
  return Object.values(map).sort((a,b) => b.total - a.total).map(m => ({
    ...m,
    deliveryScore: m.completed > 0 ? pct(m.early + m.onTime, m.completed) : null,
    earlyPct:      m.completed > 0 ? pct(m.early, m.completed) : null,
  }));
}

/** Per-category stats */
function buildCategoryPerf(tasks: Task[]) {
  const map: Record<string, { total: number; completed: number; delayed: number; inProg: number; earlyCount: number }> = {};
  for (const t of tasks) {
    if (!map[t.category]) map[t.category] = { total: 0, completed: 0, delayed: 0, inProg: 0, earlyCount: 0 };
    const m = map[t.category]; m.total++;
    if (t.status === 'COMPLETED') { m.completed++; if (classifyCompletion(t) === 'EARLY') m.earlyCount++; }
    else if (t.status === 'DELAYED')     m.delayed++;
    else if (t.status === 'IN_PROGRESS') m.inProg++;
  }
  return Object.entries(map)
    .sort((a,b) => b[1].total - a[1].total)
    .map(([name, v]) => ({ name, ...v, completionPct: pct(v.completed, v.total) }));
}

/** Health score 0–100 based on completion, critical path delay, delayed tasks */
function healthScore(p: ProjectAnalysis) {
  if (p.totalTasks === 0) return 100;
  let s = pct(p.statusCounts['COMPLETED'] ?? 0, p.totalTasks);
  s -= Math.min(50, p.projectDelayDays * 8);
  s -= p.delayedTasks.filter(t => t.isOnCriticalPath).length * 12;
  s -= p.delayedTasks.filter(t => !t.isOnCriticalPath).length * 3;
  return Math.max(0, Math.min(100, Math.round(s)));
}

function healthLabel(score: number) {
  if (score >= 75) return { label: 'On Track',  color: '#10b981', bg: 'rgba(16,185,129,0.08)' };
  if (score >= 45) return { label: 'At Risk',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' };
  return                  { label: 'Critical',  color: '#f43f5e', bg: 'rgba(244,63,94,0.08)' };
}

function estimatedEnd(tasks: Task[]): { label: string; daysDelay: number } {
  if (!tasks.length) return { label: '—', daysDelay: 0 };
  const start    = Math.min(...tasks.map(t => ms(t.plannedStart)));
  const planEnd  = Math.max(...tasks.map(t => ms(t.plannedEnd)));
  const today    = Date.now();
  const elapsed  = today - start;
  const avgPct   = tasks.reduce((s, t) => s + t.progressPct, 0) / tasks.length;
  if (avgPct <= 0) return { label: fmtFull(new Date(planEnd).toISOString()), daysDelay: 0 };
  const est      = start + (elapsed / avgPct) * 100;
  const delay    = Math.max(0, Math.round((est - planEnd) / 86400000));
  return { label: fmtFull(new Date(est).toISOString()), daysDelay: delay };
}

/** Actionable insights derived from task data */
function computeInsights(tasks: Task[], spi: number) {
  const out: { type: 'success' | 'warning' | 'danger' | 'info'; icon: React.ReactNode; text: string }[] = [];
  const completed  = tasks.filter(t => t.status === 'COMPLETED');
  const earlyTasks = completed.filter(t => classifyCompletion(t) === 'EARLY');
  const totalSaved = earlyTasks.reduce((s, t) => s + daysSaved(t), 0);
  const dueIn7     = tasks.filter(t => t.status !== 'COMPLETED' && ms(t.plannedEnd) >= Date.now() && ms(t.plannedEnd) - Date.now() <= 7 * 86400000);
  const overdue    = tasks.filter(t => t.status !== 'COMPLETED' && ms(t.plannedEnd) < Date.now());

  if (earlyTasks.length > 0)
    out.push({ type: 'success', icon: <Award size={13} />, text: `${earlyTasks.length} task${earlyTasks.length > 1 ? 's' : ''} delivered ahead of schedule, saving a combined ${totalSaved} planned working days.` });

  if (spi >= 1.1)
    out.push({ type: 'success', icon: <TrendingUp size={13} />, text: `SPI ${spi.toFixed(2)} — team is executing ~${Math.round((spi-1)*100)}% faster than the baseline plan.` });
  else if (spi < 0.7)
    out.push({ type: 'danger',  icon: <TrendingDown size={13} />, text: `SPI ${spi.toFixed(2)} — project is significantly behind. Only ${Math.round(spi*100)}% of planned work has been completed.` });
  else if (spi < 0.9)
    out.push({ type: 'warning', icon: <AlertTriangle size={13} />, text: `SPI ${spi.toFixed(2)} — running slightly behind schedule. ${Math.round((1-spi)*100)}% gap between planned and actual progress.` });

  if (dueIn7.length > 0)
    out.push({ type: 'warning', icon: <CalendarDays size={13} />, text: `${dueIn7.length} task${dueIn7.length > 1 ? 's' : ''} due in the next 7 days — monitor closely to prevent new delays.` });

  if (overdue.length === 0 && completed.length > 0)
    out.push({ type: 'success', icon: <Shield size={13} />, text: 'No overdue tasks — all active work is progressing within planned timelines.' });

  return out.slice(0, 4);
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl px-3 py-2.5 text-xs space-y-1.5 min-w-[140px]">
      {label && <p className="font-bold text-[var(--text-primary)] text-[11px] border-b border-[var(--border)] pb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill ?? p.color ?? p.stroke }} />
            <span className="text-[var(--text-secondary)]">{p.name}</span>
          </div>
          <span className="font-bold text-[var(--text-primary)]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Card({ title, sub, accent, children }: { title: string; sub?: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-2.5 border-b border-[var(--border)]">
        <p className="text-[12px] font-bold" style={accent ? { color: accent } : { color: 'var(--text-primary)' }}>{title}</p>
        {sub && <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{sub}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function HealthRing({ score }: { score: number }) {
  const { color } = healthLabel(score);
  const r = 26; const c2 = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width={64} height={64} viewBox="0 0 64 64" className="drop-shadow-[0_0_8px_rgba(var(--border),0.05)]">
        <defs>
          <linearGradient id={`grad-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={`${color}d9`} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={32} cy={32} r={r} fill="none" stroke="var(--border)" strokeWidth={4.5} className="opacity-35" />
        {/* Progress */}
        <circle cx={32} cy={32} r={r} fill="none" stroke={`url(#grad-${score})`} strokeWidth={5}
          strokeDasharray={`${(score/100)*c2} ${c2}`} strokeLinecap="round"
          transform="rotate(-90 32 32)" className="transition-all duration-500 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center leading-none">
        <span className="text-[13px] font-black tracking-tight" style={{ color }}>{score}</span>
        <span className="text-[7.5px] uppercase tracking-wider text-[var(--text-muted)] font-extrabold scale-90 -mt-0.5">HEALTH</span>
      </div>
    </div>
  );
}

function DateRangePicker({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  const opts: RangeKey[] = ['7D', '30D', '90D', 'ALL'];
  return (
    <div className="flex items-center gap-1 bg-[var(--border)]/50 rounded-xl p-1">
      {opts.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            value === o ? 'bg-[var(--bg)] shadow text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}>
          {o === 'ALL' ? 'All Time' : `Last ${o}`}
        </button>
      ))}
    </div>
  );
}

// ── GanttBar (LLD) ────────────────────────────────────────────────────────────

function GanttBar({ task, projectStart, totalDays }: { task: Task; projectStart: number; totalDays: number }) {
  if (totalDays <= 0) return null;
  const left  = Math.max(0, Math.min(88, (ms(task.plannedStart) - projectStart) / 86400000 / totalDays * 88));
  const width = Math.max(3, Math.min(88 - left, (ms(task.plannedEnd) - ms(task.plannedStart)) / 86400000 / totalDays * 88));
  const done  = (task.progressPct / 100) * width;
  const color = STATUS_COLOR[task.status] ?? C.notStart;
  return (
    <div className="relative h-4 rounded overflow-hidden bg-[var(--border)]">
      <div className="absolute top-0 h-full rounded opacity-15" style={{ left: `${left}%`, width: `${width}%`, background: color }} />
      <div className="absolute top-0 h-full rounded" style={{ left: `${left}%`, width: `${done}%`, background: color }} />
      {task.status === 'COMPLETED' && task.actualEnd && ms(task.actualEnd) < ms(task.plannedEnd) && (
        <div className="absolute top-0 h-full rounded opacity-40"
          style={{ left: `${left + done}%`, width: `${width - done}%`, background: C.early }} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HLD VIEW
// ══════════════════════════════════════════════════════════════════════════════

function HLDView({ project: p, tasks }: { project: ProjectAnalysis; tasks: Task[] }) {
  const [range, setRange] = useState<RangeKey>('30D');

  const now     = Date.now();
  const rangeMs = range === '7D' ? 7 * 86400000 : range === '30D' ? 30 * 86400000 : range === '90D' ? 90 * 86400000 : Infinity;
  const startMs = range === 'ALL'
    ? (tasks.length ? Math.min(...tasks.map(t => ms(t.plannedStart))) : now - 365 * 86400000)
    : now - rangeMs;

  const spi         = useMemo(() => computeSPI(tasks), [tasks]);
  const activity    = useMemo(() => buildActivityChart(tasks, startMs, now), [tasks, startMs, now]);
  const burnup      = useMemo(() => buildBurnup(tasks), [tasks]);
  const velocity    = useMemo(() => buildVelocity(tasks, startMs, now), [tasks, startMs, now]);
  const classDist   = useMemo(() => buildClassification(tasks), [tasks]);
  const riskBuckets = useMemo(() => buildRiskBuckets(tasks), [tasks]);
  const engineers   = useMemo(() => buildEngineerPerf(tasks), [tasks]);
  const categories  = useMemo(() => buildCategoryPerf(tasks), [tasks]);
  const insights    = useMemo(() => computeInsights(tasks, spi), [tasks, spi]);
  const { label: estEndLabel, daysDelay: estDelay } = useMemo(() => estimatedEnd(tasks), [tasks]);

  const completed      = p.statusCounts['COMPLETED'] ?? 0;
  const completionPct  = pct(completed, p.totalTasks);
  const earlyTasks     = tasks.filter(t => classifyCompletion(t) === 'EARLY');
  const totalSavedDays = earlyTasks.reduce((s, t) => s + daysSaved(t), 0);

  // activity data for range summary
  const rangeCompleted = tasks.filter(t => t.actualEnd && ms(t.actualEnd) >= startMs && ms(t.actualEnd) <= now);
  const rangeEarly     = rangeCompleted.filter(t => classifyCompletion(t) === 'EARLY');

  const donutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.06) return null;
    const R   = Math.PI / 180;
    const r   = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x   = cx + r * Math.cos(-midAngle * R);
    const y   = cy + r * Math.sin(-midAngle * R);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${Math.round(percent * 100)}%`}</text>;
  };

  return (
    <div className="space-y-4">

      {/* ── Insight Panel ──────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {insights.map((ins, i) => {
            const colors = {
              success: 'bg-emerald-500/8 border-emerald-500/20 text-emerald-700',
              warning: 'bg-amber-500/8 border-amber-500/20 text-amber-700',
              danger:  'bg-rose-500/8 border-rose-500/20 text-rose-700',
              info:    'bg-sky-500/8 border-sky-500/20 text-sky-700',
            }[ins.type];
            return (
              <div key={i} className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border ${colors}`}>
                <span className="mt-0.5 shrink-0">{ins.icon}</span>
                <p className="text-[11.5px] font-medium leading-relaxed">{ins.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Completion',      icon: <CheckCircle2 size={15}/>, color: '#10b981', value: `${completionPct}%`,    sub: `${completed}/${p.totalTasks} tasks done` },
          { label: 'Critical Delay',  icon: <AlertCircle size={15}/>,  color: p.projectDelayDays > 0 ? '#f43f5e' : '#10b981',
                                       value: p.projectDelayDays > 0 ? `+${p.projectDelayDays}d` : 'None',
                                       sub: 'critical path slippage' },
          { label: 'SPI',             icon: <Target size={15}/>,       color: spi >= 1 ? '#22c55e' : spi >= 0.85 ? '#f59e0b' : '#f43f5e',
                                       value: spi.toFixed(2),
                                       sub: spi >= 1 ? 'ahead of plan' : spi >= 0.85 ? 'slightly behind' : 'behind plan' },
          { label: 'Early Deliveries',icon: <Award size={15}/>,        color: earlyTasks.length > 0 ? '#22c55e' : '#64748b',
                                       value: earlyTasks.length,
                                       sub: earlyTasks.length > 0 ? `~${totalSavedDays}d total saved` : 'none yet' },
          { label: 'Task Delays',     icon: <AlertTriangle size={15}/>,color: p.totalDelayedCount > 0 ? '#f43f5e' : '#10b981',
                                       value: p.totalDelayedCount,
                                       sub: `${p.delayedTasks.filter(t=>t.isOnCriticalPath).length} on critical path` },
          { label: 'Est. Finish',     icon: <CalendarDays size={15}/>, color: estDelay > 0 ? '#f43f5e' : C.gold,
                                       value: estEndLabel,
                                       sub: estDelay > 0 ? `~${estDelay}d behind plan` : 'on/before planned end' },
        ].map(k => (
          <div key={k.label} className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${k.color}18`, color: k.color }}>{k.icon}</div>
            <div className="min-w-0">
              <p className="text-[9.5px] text-[var(--text-muted)] font-medium uppercase tracking-wide leading-none mb-0.5">{k.label}</p>
              <p className="text-[15px] font-black leading-tight truncate" style={{ color: k.color }}>{k.value}</p>
              <p className="text-[9.5px] text-[var(--text-muted)] leading-none mt-0.5">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Date Range Picker + Daily Activity Chart ───────────────────────── */}
      <Card
        title="Daily Completion Activity"
        sub="How many tasks were finished each day — split by delivery type. Green = before deadline (early), purple = on time, red = past deadline."
        accent={C.gold}
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-4 text-[10.5px] text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text-secondary)]">
              {rangeCompleted.length} tasks completed in this period
            </span>
            {rangeEarly.length > 0 && (
              <span style={{ color: C.early }} className="font-semibold">
                {rangeEarly.length} early · saved {rangeEarly.reduce((s,t)=>s+daysSaved(t),0)}d
              </span>
            )}
          </div>
          <DateRangePicker value={range} onChange={setRange} />
        </div>
        {activity.every(d => d.Early + d['On Time'] + d.Late === 0) ? (
          <div className="flex items-center justify-center h-36 text-[var(--text-muted)] text-sm">
            No task completions recorded in this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activity} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 9.5, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                interval={activity.length > 20 ? Math.floor(activity.length / 10) : 0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <RTooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="Early"   stackId="a" fill={C.early}  radius={[0,0,0,0]} maxBarSize={20} />
              <Bar dataKey="On Time" stackId="a" fill={C.onTime} radius={[0,0,0,0]} maxBarSize={20} />
              <Bar dataKey="Late"    stackId="a" fill={C.late}   radius={[4,4,0,0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Burn-up + Classification Donut ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <Card
            title="Planned vs Actual Progress (Burn-up)"
            sub="Gold dashed line = what the plan says should be complete. Blue solid line = actual work achieved. A gap between them means the project is behind plan."
          >
            {burnup.length < 2 ? (
              <div className="flex items-center justify-center h-36 text-[var(--text-muted)] text-sm">Project has not progressed yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={burnup} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gPlan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.gold}   stopOpacity={0.18} />
                      <stop offset="95%" stopColor={C.gold}   stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.inProg} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.inProg} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9.5, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                  <RTooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="Planned %" stroke={C.gold}   strokeWidth={1.5} strokeDasharray="6 3" fill="url(#gPlan)"   dot={false} />
                  <Area type="monotone" dataKey="Actual %"  stroke={C.inProg} strokeWidth={2.5} fill="url(#gActual)" dot={{ r: 3, fill: C.inProg }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card
            title="Task Completion Classification"
            sub="Breaks down all tasks by how they were (or are being) delivered. Early delivery shows team efficiency; late delivery indicates planning or execution issues."
          >
            {classDist.length === 0 ? (
              <div className="flex items-center justify-center h-36 text-[var(--text-muted)] text-sm">No task data.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={classDist} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                      dataKey="value" labelLine={false} label={donutLabel} startAngle={90} endAngle={-270}>
                      {classDist.map((e,i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <RTooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {classDist.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: d.fill }} />
                        <span className="text-[10.5px] text-[var(--text-secondary)]">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[var(--text-primary)]">{d.value}</span>
                        <span className="text-[9.5px] text-[var(--text-muted)] w-20 leading-tight">{d.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* ── Velocity + Risk Distribution ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Weekly Completion Velocity"
          sub="Number of tasks completed per calendar week within the selected period. Rising trend = good momentum. Flat/falling = team may be blocked."
        >
          {velocity.every(v => v.Tasks === 0) ? (
            <div className="flex items-center justify-center h-36 text-[var(--text-muted)] text-sm">No completions yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={velocity} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVelocity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.onTime} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.onTime} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 9.5, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <RTooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="Tasks" stroke={C.onTime} strokeWidth={2.5} fill="url(#gVelocity)" dot={{ r: 4, fill: C.onTime }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card
          title="Incomplete Task Risk Distribution"
          sub="Of all tasks not yet completed: how many are safely within schedule, due soon (≤14 days), overdue (past end date), or formally delayed. 'On Schedule' is good; the rest need attention."
          accent="#f43f5e"
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={riskBuckets} layout="vertical" margin={{ top: 4, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <RTooltip content={<ChartTip />} />
              {riskBuckets.map((b,i) => (
                <Bar key={i} dataKey="value" fill={b.fill} radius={[0,6,6,0]} maxBarSize={22}>
                  {riskBuckets.map((_,j) => <Cell key={j} fill={riskBuckets[j].fill} />)}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Engineer Performance Table ──────────────────────────────────────── */}
      {engineers.length > 0 && (
        <Card
          title="Site Engineer Performance"
          sub="Delivery score = % of completed tasks that were on time or early. Days saved shows efficiency of early deliveries; avg late days shows impact of overdue tasks."
          accent={C.gold}
        >
          <div className="table-container">
            <table className="erp-table">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Engineer','Assigned','Done','Early','On Time','Late','Delivery Score','Avg Saved','Avg Late'].map(h => (
                    <th key={h} className="whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {engineers.map(e => {
                  const scoreColor = e.deliveryScore == null ? '#64748b' : e.deliveryScore >= 80 ? C.early : e.deliveryScore >= 60 ? C.onTime : C.late;
                  return (
                    <tr key={e.id} className="hover:bg-[var(--border)]/30 transition-colors">
                      <td className="font-semibold text-[var(--text-primary)]">{e.name}</td>
                      <td >{e.total}</td>
                      <td >
                        <span className="font-semibold" style={{ color: C.early }}>{e.completed}</span>
                      </td>
                      <td >
                        {e.early > 0
                          ? <span className="font-bold" style={{ color: C.early }}>{e.early}</span>
                          : <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                      <td >
                        {e.onTime > 0
                          ? <span className="font-bold" style={{ color: C.onTime }}>{e.onTime}</span>
                          : <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                      <td >
                        {e.late > 0
                          ? <span className="font-bold" style={{ color: C.late }}>{e.late}</span>
                          : <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                      <td className="py-3 pr-4">
                        {e.deliveryScore != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${e.deliveryScore}%`, background: scoreColor }} />
                            </div>
                            <span className="font-bold" style={{ color: scoreColor }}>{e.deliveryScore}%</span>
                          </div>
                        ) : <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                      <td >
                        {e.early > 0
                          ? <span style={{ color: C.early }} className="font-semibold">+{e.savedDays}d</span>
                          : <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                      <td className="py-3 text-center">
                        {e.late + e.delayed > 0
                          ? <span style={{ color: C.late }} className="font-semibold">+{e.lateDays}d</span>
                          : <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Category Performance Grid ───────────────────────────────────────── */}
      {categories.length > 0 && (
        <Card
          title="Category-wise Health"
          sub="Progress across each construction phase or work type. The green bar shows completion %. Early tags indicate tasks delivered ahead of schedule within that category."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat, i) => {
              const badgeColor = cat.delayed > 0 ? '#f43f5e' : cat.completionPct >= 80 ? '#22c55e' : '#f59e0b';
              return (
                <div key={cat.name} className="border border-[var(--border)] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ background: CAT_PALETTE[i % CAT_PALETTE.length] }} />
                      <p className="text-[11.5px] font-bold text-[var(--text-primary)] leading-tight">{cat.name}</p>
                    </div>
                    <span className="text-[10px] font-bold shrink-0" style={{ color: badgeColor }}>{cat.completionPct}%</span>
                  </div>

                  {/* Stacked mini bar */}
                  <div className="flex h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${pct(cat.completed, cat.total)}%`, background: C.early }} />
                    <div style={{ width: `${pct(cat.inProg,    cat.total)}%`, background: C.inProg }} />
                    <div style={{ width: `${pct(cat.delayed,   cat.total)}%`, background: C.late }} />
                    <div style={{ flex: 1, background: 'var(--border)' }} />
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[9.5px]">
                    {[
                      { label: 'Total',   value: cat.total,     color: 'var(--text-muted)' },
                      { label: 'Done',    value: cat.completed, color: C.early },
                      { label: 'Delayed', value: cat.delayed,   color: cat.delayed > 0 ? C.late : 'var(--text-muted)' },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <p className="font-black" style={{ color: m.color }}>{m.value}</p>
                        <p className="text-[var(--text-muted)]">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {cat.earlyCount > 0 && (
                    <div className="flex items-center gap-1 text-[9.5px]" style={{ color: C.early }}>
                      <Zap size={10} />
                      <span className="font-semibold">{cat.earlyCount} task{cat.earlyCount > 1 ? 's' : ''} delivered early</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Critical Path Alerts ───────────────────────────────────────────── */}
      {p.delayedTasks.some(t => t.isOnCriticalPath) && (
        <Card
          title="Critical Path Alerts — Immediate Action Required"
          sub="These tasks sit on the longest dependency chain. Any further delay here directly pushes the project's final completion date. Float = 0."
          accent="#dc2626"
        >
          <div className="table-container">
            <table className="erp-table">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Task','Category','Priority','Due Date','Engineer','Progress','Days Late'].map(h => (
                    <th key={h} className="text-left pb-2.5 pr-4 font-bold text-[var(--text-muted)] uppercase tracking-wide text-[9.5px] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {p.delayedTasks.filter(t => t.isOnCriticalPath).map(t => (
                  <tr key={t.id} className="hover:bg-rose-500/4 transition-colors">
                    <td className="py-2.5 pr-4">
                      <span className="font-mono text-[9.5px] text-[var(--text-muted)] block">{t.taskId}</span>
                      <span className="font-medium text-[var(--text-primary)]">{t.title}</span>
                    </td>
                    <td className="py-2.5 pr-4"><span className="bg-[var(--border)] px-1.5 py-0.5 rounded text-[10px] text-[var(--text-secondary)]">{t.category}</span></td>
                    <td className="py-2.5 pr-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        style={{ background: `${PRIORITY_COLOR[t.priority]}18`, color: PRIORITY_COLOR[t.priority] }}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-[var(--text-muted)] whitespace-nowrap">{fmtFull(t.plannedEnd)}</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{t.assignedEngineer?.name ?? '—'}</td>
                    <td className="py-2.5 pr-4 min-w-[90px]">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${t.progressPct}%`, background: C.late }} />
                        </div>
                        <span className="text-[var(--text-muted)]">{t.progressPct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5"><span className="text-[16px] font-black text-rose-500">+{t.daysLate}d</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Buffered-delay info */}
      {p.delayedTasks.filter(t => !t.isOnCriticalPath).length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/6 border border-amber-500/20 rounded-2xl">
          <Shield size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-[var(--text-primary)]">
            <span className="font-bold text-amber-600">{p.delayedTasks.filter(t => !t.isOnCriticalPath).length} delayed task{p.delayedTasks.filter(t => !t.isOnCriticalPath).length > 1 ? 's' : ''} are within float buffer — </span>
            they are running late but have enough schedule slack that the project milestone is not yet affected. Check the LLD tab to view and act on them before the buffer erodes.
          </p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LLD VIEW — Detailed task table
// ══════════════════════════════════════════════════════════════════════════════

function LLDView({ tasks }: { tasks: Task[] }) {
  const [search, setSearch]   = useState('');
  const [fStatus, setFS]      = useState('');
  const [fPriority, setFP]    = useState('');
  const [fCat, setFC]         = useState('');
  const [fDelivery, setFD]    = useState(''); // EARLY | LATE | ON_TIME
  const [expanded, setExp]    = useState<Set<string>>(new Set());
  const [sortBy, setSortBy]   = useState<'plannedStart'|'daysLate'|'progressPct'|'savedDays'>('plannedStart');
  const [sortDir, setDir]     = useState<'asc'|'desc'>('asc');

  const cats = useMemo(() => [...new Set(tasks.map(t => t.category))].sort(), [tasks]);

  const pStart = useMemo(() => tasks.length ? Math.min(...tasks.map(t => ms(t.plannedStart))) : Date.now(), [tasks]);
  const pEnd   = useMemo(() => tasks.length ? Math.max(...tasks.map(t => ms(t.plannedEnd)))   : Date.now(), [tasks]);
  const totalDays = (pEnd - pStart) / 86400000;

  const enriched = useMemo(() => tasks.map(t => ({
    ...t,
    _late:    taskDaysLate(t),
    _cls:     classifyCompletion(t),
    _saved:   daysSaved(t),
  })), [tasks]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (search)    list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.taskId.toLowerCase().includes(search.toLowerCase()));
    if (fStatus)   list = list.filter(t => t.status === fStatus);
    if (fPriority) list = list.filter(t => t.priority === fPriority);
    if (fCat)      list = list.filter(t => t.category === fCat);
    if (fDelivery) list = list.filter(t => t._cls === fDelivery);
    list = [...list].sort((a, b) => {
      let v = 0;
      if (sortBy === 'plannedStart') v = ms(a.plannedStart) - ms(b.plannedStart);
      if (sortBy === 'daysLate')     v = a._late   - b._late;
      if (sortBy === 'progressPct')  v = a.progressPct - b.progressPct;
      if (sortBy === 'savedDays')    v = a._saved  - b._saved;
      return sortDir === 'asc' ? v : -v;
    });
    return list;
  }, [enriched, search, fStatus, fPriority, fCat, fDelivery, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setDir('asc'); }
  };
  const toggleExp = (id: string) => setExp(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const S = ({ col }: { col: typeof sortBy }) => (
    sortBy === col ? <span style={{ color: C.gold }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                   : <span className="text-[var(--text-muted)] opacity-40">↕</span>
  );

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: `${tasks.length} Total`, color: 'var(--text-muted)' },
          { label: `${tasks.filter(t=>classifyCompletion(t)==='EARLY').length} Early`, color: C.early },
          { label: `${tasks.filter(t=>classifyCompletion(t)==='ON_TIME').length} On Time`, color: C.onTime },
          { label: `${tasks.filter(t=>classifyCompletion(t)==='LATE').length} Late Completed`, color: C.late },
          { label: `${tasks.filter(t=>t.status==='DELAYED').length} Delayed (Running)`, color: '#f97316' },
        ].map(b => (
          <span key={b.label} className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full border border-[var(--border)]"
            style={{ color: b.color }}>{b.label}</span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2">
          <Search size={13} className="text-[var(--text-muted)] shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none" />
          {search && <button onClick={() => setSearch('')}><X size={12} className="text-[var(--text-muted)]" /></button>}
        </div>
        {[
          { v: fStatus,   s: setFS, opts: Object.keys(STATUS_COLOR), label: 'Status',   map: STATUS_LABEL },
          { v: fPriority, s: setFP, opts: ['CRITICAL','HIGH','MEDIUM','LOW'], label: 'Priority', map: {} },
          { v: fCat,      s: setFC, opts: cats, label: 'Category', map: {} },
          { v: fDelivery, s: setFD, opts: ['EARLY','ON_TIME','LATE','PENDING'], label: 'Delivery',
            map: { EARLY: 'Early', ON_TIME: 'On Time', LATE: 'Late Completed', PENDING: 'Not Completed' } },
        ].map(f => (
          <div key={f.label} className="relative">
            <select value={f.v} onChange={e => (f.s as any)(e.target.value)}
              className="appearance-none bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 pr-7 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[#b89047] cursor-pointer">
              <option value="">All {f.label}s</option>
              {f.opts.map(o => <option key={o} value={o}>{(f.map as any)[o] ?? o.replace(/_/g,' ')}</option>)}
            </select>
            <Filter size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          </div>
        ))}
        <span className="text-[11px] text-[var(--text-muted)] ml-auto">{filtered.length} of {tasks.length}</span>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="table-container">
          <table className="erp-table">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 w-5" />
                <th className="text-left px-4 py-3 font-bold text-[9.5px] uppercase tracking-wide text-[var(--text-muted)] whitespace-nowrap">Task</th>
                <th className="text-left px-4 py-3 font-bold text-[9.5px] uppercase tracking-wide text-[var(--text-muted)] whitespace-nowrap">Category / Status</th>
                <th className="text-left px-4 py-3 font-bold text-[9.5px] uppercase tracking-wide text-[var(--text-muted)] whitespace-nowrap cursor-pointer hover:text-[#b89047]"
                  onClick={() => toggleSort('plannedStart')}>Timeline <S col="plannedStart" /></th>
                <th className="text-left px-4 py-3 font-bold text-[9.5px] uppercase tracking-wide text-[var(--text-muted)] whitespace-nowrap">Engineer</th>
                <th className="text-left px-4 py-3 font-bold text-[9.5px] uppercase tracking-wide text-[var(--text-muted)] whitespace-nowrap cursor-pointer hover:text-[#b89047]"
                  onClick={() => toggleSort('progressPct')}>Progress <S col="progressPct" /></th>
                <th className="text-left px-4 py-3 font-bold text-[9.5px] uppercase tracking-wide text-[var(--text-muted)] whitespace-nowrap">Delivery</th>
                <th className="text-right px-4 py-3 font-bold text-[9.5px] uppercase tracking-wide text-[var(--text-muted)] whitespace-nowrap cursor-pointer hover:text-[#b89047]"
                  onClick={() => toggleSort('daysLate')}>Delay <S col="daysLate" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[var(--text-muted)] text-sm">No tasks match filters.</td></tr>
              ) : (
                filtered.map(t => {
                  const isOpen = expanded.has(t.id);
                  const sc     = STATUS_COLOR[t.status] ?? C.notStart;
                  const hasKids = (t.subTasks ?? []).length > 0;
                  return (
                    <React.Fragment key={t.id}>
                      <tr onClick={() => toggleExp(t.id)}
                        className={`hover:bg-[var(--border)]/40 cursor-pointer transition-colors
                          ${t._cls === 'EARLY'   ? 'bg-emerald-500/3' : ''}
                          ${t.status === 'DELAYED' ? 'bg-rose-500/3'    : ''}`}>
                        <td className="pl-4 py-3 w-5">
                          {isOpen ? <ChevronDown size={13} className="text-[var(--text-muted)]" /> : <ChevronRight size={13} className="text-[var(--text-muted)]" />}
                        </td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <div className="flex items-center gap-1.5">
                            {hasKids && <Layers size={10} className="text-[#b89047] shrink-0" />}
                            <div>
                              <span className="font-mono text-[9.5px] text-[var(--text-muted)] block">{t.taskId}</span>
                              <span className="font-medium text-[var(--text-primary)] line-clamp-1">{t.title}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-[var(--border)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded text-[10px] block mb-1 w-fit">{t.category}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${sc}18`, color: sc }}>{STATUS_LABEL[t.status] ?? t.status}</span>
                        </td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <div className="space-y-1">
                            <div className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{fmt(t.plannedStart)} → {fmt(t.plannedEnd)}</div>
                            <GanttBar task={t} projectStart={pStart} totalDays={totalDays} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{t.assignedEngineer?.name ?? <span className="text-[var(--text-muted)]">—</span>}</td>
                        <td className="px-4 py-3 min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${t.progressPct}%`, background: sc }} />
                            </div>
                            <span className="text-[10.5px] font-semibold text-[var(--text-secondary)] w-7 text-right">{t.progressPct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {t._cls === 'EARLY' && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${C.early}18`, color: C.early }}>Early</span>
                              <span className="text-[9.5px] font-semibold" style={{ color: C.early }}>+{t._saved}d</span>
                            </div>
                          )}
                          {t._cls === 'ON_TIME' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${C.onTime}18`, color: C.onTime }}>On Time</span>}
                          {t._cls === 'LATE'    && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${C.late}18`,  color: C.late }}>Late</span>}
                          {t._cls === 'PENDING' && t.status !== 'DELAYED' && <span className="text-[10px] text-[var(--text-muted)]">Active</span>}
                          {t.status === 'DELAYED' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500">Delayed</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {t._late > 0
                            ? <span className="text-[13px] font-black text-rose-500">+{t._late}d</span>
                            : t._cls === 'EARLY'
                              ? <span className="text-[13px] font-black" style={{ color: C.early }}>−{t._saved}d</span>
                              : <span className="text-[11px] text-emerald-500 font-medium">✓</span>}
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isOpen && (
                        <tr className="bg-[var(--border)]/20">
                          <td colSpan={8} className="px-8 py-3 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[10.5px]">
                              {[
                                { label: 'Priority',      value: t.priority,  color: PRIORITY_COLOR[t.priority] },
                                { label: 'Planned Start', value: fmtFull(t.plannedStart) },
                                { label: 'Planned End',   value: fmtFull(t.plannedEnd)   },
                                { label: 'Actual Start',  value: t.actualStart ? fmtFull(t.actualStart) : 'Not started' },
                                { label: 'Actual End',    value: t.actualEnd  ? fmtFull(t.actualEnd) : t.status === 'COMPLETED' ? '—' : 'In progress' },
                              ].map(d => (
                                <div key={d.label}>
                                  <p className="text-[9.5px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">{d.label}</p>
                                  <p className="font-semibold" style={(d as any).color ? { color: (d as any).color } : { color: 'var(--text-primary)' }}>{d.value}</p>
                                </div>
                              ))}
                            </div>
                            {t._cls === 'EARLY' && (
                              <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: C.early }}>
                                <Award size={13} />
                                Delivered {t._saved} day{t._saved > 1 ? 's' : ''} ahead of the planned deadline — excellent execution.
                              </div>
                            )}
                            {t.description && (
                              <p className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 italic">{t.description}</p>
                            )}
                            {t.dependsOn && (
                              <p className="text-[10.5px] text-[var(--text-muted)]">
                                Depends on: <span className="font-mono text-[var(--text-secondary)]">{t.dependsOn.taskId}</span> — {t.dependsOn.title}
                              </p>
                            )}
                            {hasKids && (
                              <div>
                                <p className="text-[9.5px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Subtasks</p>
                                {(t.subTasks ?? []).map(s => (
                                  <div key={s.id} className="flex items-center gap-3 text-[10.5px] py-0.5">
                                    <span className="font-mono text-[var(--text-muted)]">{s.taskId}</span>
                                    <span className="text-[var(--text-primary)]">{s.title}</span>
                                    <span className="ml-auto font-semibold" style={{ color: STATUS_COLOR[s.status] }}>{STATUS_LABEL[s.status]}</span>
                                    <span className="text-[var(--text-muted)] w-7 text-right">{s.progressPct}%</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO CARD
// ══════════════════════════════════════════════════════════════════════════════

function ProjectPortfolioCard({ p, onClick }: { p: ProjectAnalysis; onClick: () => void }) {
  const score  = healthScore(p);
  const health = healthLabel(score);
  const comp   = pct(p.statusCounts['COMPLETED'] ?? 0, p.totalTasks);

  const bars = Object.entries(p.statusCounts)
    .filter(([,v]) => v > 0)
    .map(([k,v]) => ({ k, v, p: pct(v, p.totalTasks), c: STATUS_COLOR[k] ?? C.notStart }));

  return (
    <button type="button" onClick={onClick}
      className="group w-full text-left bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5
        hover:border-[#b89047]/50 hover:shadow-xl hover:shadow-[#b89047]/5 hover:-translate-y-1
        transition-all duration-300 ease-out space-y-4 relative overflow-hidden">
      
      {/* Glow highlight on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b89047]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-[14px] font-black text-[var(--text-primary)] tracking-tight group-hover:text-[#b89047] transition-colors">{p.clientName}</span>
            <span className="text-[9px] px-2 py-0.5 rounded-md border border-[var(--border)] bg-stone-50/50 dark:bg-slate-900/30 text-[var(--text-muted)] font-bold uppercase tracking-wider">{p.serviceType.replace(/_/g,' ')}</span>
          </div>
          {p.projectManager && (
            <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--text-muted)]">
              <User size={11} className="text-[#b89047]/80 shrink-0" />
              <span>PM: <span className="text-[var(--text-secondary)] font-semibold">{p.projectManager.name}</span></span>
            </div>
          )}
        </div>
        <HealthRing score={score} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider scale-95" style={{ background: health.bg, color: health.color }}>
          {health.label === 'On Track' ? <CheckCircle2 size={10} /> : health.label === 'At Risk' ? <AlertTriangle size={10} /> : <AlertCircle size={10} />}
          {health.label}
        </span>
        {p.projectDelayDays > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.8 rounded-full">
            <AlertCircle size={11} className="animate-pulse" />
            {p.projectDelayDays}d critical path delay
          </span>
        )}
        {p.projectDelayDays === 0 && p.totalDelayedCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.8 rounded-full">
            <AlertTriangle size={11} />
            {p.totalDelayedCount} task{p.totalDelayedCount > 1 ? 's' : ''} buffered delay
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 bg-[var(--border)]/20 rounded-xl p-2.5 border border-[var(--border)]/30 backdrop-blur-xs">
        {[
          { l: 'Total Tasks', v: p.totalTasks,        a: false },
          { l: 'Complete',    v: `${comp}%`,           a: false },
          { l: 'Delayed',     v: p.totalDelayedCount, a: p.totalDelayedCount > 0 },
        ].map(m => (
          <div key={m.l} className="text-center">
            <p className={`text-[16px] font-black tracking-tight ${m.a ? 'text-rose-500' : 'text-[var(--text-primary)]'}`}>{m.v}</p>
            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider scale-95 mt-0.5">{m.l}</p>
          </div>
        ))}
      </div>

      {p.totalTasks > 0 && (
        <div className="space-y-2">
          <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5 bg-[var(--border)]/40 p-[2px]">
            {bars.map(s => (
              <div key={s.k} className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${s.p}%`, background: s.c }} title={`${STATUS_LABEL[s.k]}: ${s.v}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {bars.map(s => (
              <div key={s.k} className="flex items-center gap-1 bg-[var(--border)]/15 border border-[var(--border)]/30 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.c }} />
                <span className="text-[8.5px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">{STATUS_LABEL[s.k]}: {s.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-[#b89047] group-hover:translate-x-0.5 transition-transform duration-200">
        View Detailed Analysis
        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-200" />
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export function DelayAnalysisPage({ user: _user }: { user: any }) {
  const { showToast } = useToast();

  const [analysis,     setAnalysis]     = useState<ProjectAnalysis[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [generatedAt,  setGeneratedAt]  = useState<string | null>(null);

  const [selectedProject, setSelected] = useState<ProjectAnalysis | null>(null);
  const [drillTab,         setDrillTab] = useState<'hld' | 'lld'>('hld');
  const [drillTasks,       setDrillTasks] = useState<Task[]>([]);
  const [drillLoading,     setDrillLoading] = useState(false);

  const loadPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const res = await delayAnalysisApi.get();
      setAnalysis(res.data.analysis);
      setGeneratedAt(res.data.generatedAt);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to load analysis.', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const openProject = useCallback(async (p: ProjectAnalysis) => {
    setSelected(p);
    setDrillTab('hld');
    setDrillLoading(true);
    try {
      const res = await constructionApi.listTasks(p.id);
      setDrillTasks(res.data.tasks ?? []);
    } catch {
      showToast('Failed to load project tasks.', 'error');
    } finally { setDrillLoading(false); }
  }, []);

  // ── Portfolio view ─────────────────────────────────────────────────────────

  if (!selectedProject) {
    const total    = analysis.length;
    const crit     = analysis.filter(p => p.projectDelayDays > 0).length;
    const atRisk   = analysis.filter(p => p.projectDelayDays === 0 && p.totalDelayedCount > 0).length;
    const onTrack  = analysis.filter(p => p.totalDelayedCount === 0).length;

    return (
      <div className="flex flex-col h-full relative bg-[var(--bg)]">
        {/* Glow decorators */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#b89047]/4 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-rose-500/3 rounded-full blur-3xl pointer-events-none" />

        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg)]/95 backdrop-blur-md z-10 relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[15px] font-black text-[var(--text-primary)] flex items-center gap-2">
                <BarChart2 size={16} className="text-[#b89047]" /> Construction Intelligence
              </h1>
              {generatedAt && !loading && (
                <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">
                  Critical-path aware analysis · {new Date(generatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <button onClick={loadPortfolio} disabled={loading}
              className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)] disabled:opacity-50 cursor-pointer transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {!loading && analysis.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
              {[
                { label: 'Total Projects',   value: total,   color: C.gold,    icon: <Layers size={16} />,     bgGlow: 'rgba(184,144,71,0.06)' },
                { label: 'Critical Slippage', value: crit,    color: C.late,    icon: <AlertCircle size={16} className={crit > 0 ? 'animate-pulse' : ''} />,   bgGlow: 'rgba(244,63,94,0.06)' },
                { label: 'At Risk Phases',   value: atRisk,  color: C.onHold,  icon: <AlertTriangle size={16} />, bgGlow: 'rgba(251,146,60,0.06)' },
                { label: 'On Track Projects',value: onTrack, color: C.early,   icon: <CheckCircle2 size={16} />,  bgGlow: 'rgba(34,197,94,0.06)' },
              ].map(s => (
                <div key={s.label}
                  className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ boxShadow: `inset 0 0 12px ${s.bgGlow}, 0 2px 4px rgba(0,0,0,0.02)` }}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">{s.label}</p>
                    <p className="text-[22px] font-black tracking-tight" style={{ color: s.color }}>{s.value}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border)] bg-[var(--bg)] shadow-inner" style={{ color: s.color }}>
                    {s.icon}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto relative z-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Loader2 size={28} className="animate-spin text-[#b89047]" />
              <p className="text-sm text-[var(--text-muted)] font-semibold">Computing critical path analysis…</p>
            </div>
          ) : analysis.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">No projects found.</div>
          ) : (
            <div className="p-4 md:p-5 space-y-4">
              {crit > 0 && (
                <div className="flex items-start gap-3 px-4 py-3.5 bg-rose-500/8 dark:bg-rose-950/20 border border-rose-500/25 rounded-2xl">
                  <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                  <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                    <strong className="text-rose-600 dark:text-rose-400 font-extrabold mr-1">
                      {crit} project{crit > 1 ? 's' : ''} experiencing critical path slippage.
                    </strong>
                    Select a project below to inspect the full delay breakdown, schedule burn-up charts, and site engineer delivery performance.
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {analysis
                  .slice()
                  .sort((a,b) => b.projectDelayDays - a.projectDelayDays || b.totalDelayedCount - a.totalDelayedCount)
                  .map(p => <ProjectPortfolioCard key={p.id} p={p} onClick={() => openProject(p)} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Drill-down view ────────────────────────────────────────────────────────

  const score  = healthScore(selectedProject);
  const health = healthLabel(score);

  return (
    <div className="flex flex-col h-full relative bg-[var(--bg)]">
      {/* Glow decorators */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#b89047]/4 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-rose-500/3 rounded-full blur-3xl pointer-events-none" />

      <div className="px-5 pt-4 pb-3 border-b border-[var(--border)] shrink-0 bg-[var(--bg)]/90 backdrop-blur-md z-10 relative space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => { setSelected(null); setDrillTasks([]); }}
            className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[#b89047] transition-all bg-[var(--border)]/30 hover:bg-[var(--border)]/60 px-3 py-1 rounded-lg cursor-pointer">
            <ChevronLeft size={13} /> Back
          </button>
          <span className="text-[var(--border)]">/</span>
          <span className="text-[14px] font-black text-[var(--text-primary)] tracking-tight">{selectedProject.clientName}</span>
          <span className="text-[9px] border border-[var(--border)] bg-stone-50/50 dark:bg-slate-900/30 text-[var(--text-muted)] px-2 py-0.5 rounded font-bold uppercase tracking-wider">{selectedProject.serviceType.replace(/_/g,' ')}</span>
          <span className="text-[10px] font-bold px-2.5 py-0.8 rounded-full" style={{ background: health.bg, color: health.color }}>{health.label}</span>
          {selectedProject.projectDelayDays > 0 && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
              <AlertCircle size={11} className="animate-pulse" />
              +{selectedProject.projectDelayDays}d delay
            </span>
          )}
          <button onClick={loadPortfolio} disabled={loading}
            className="ml-auto p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)] disabled:opacity-50 cursor-pointer">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex gap-1 bg-[var(--border)]/40 border border-[var(--border)]/20 rounded-xl p-1 w-fit backdrop-blur-xs">
          {([
            { id: 'hld', label: 'Overview & Charts', icon: <Activity size={13} /> },
            { id: 'lld', label: 'Detailed Task Timeline', icon: <Layers size={13} /> },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setDrillTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer
                ${drillTab === t.id ? 'bg-[var(--bg)] shadow text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5 relative z-10">
        {drillLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 size={24} className="animate-spin text-[#b89047]" />
            <p className="text-sm text-[var(--text-muted)]">Loading project data…</p>
          </div>
        ) : drillTab === 'hld' ? (
          <HLDView project={selectedProject} tasks={drillTasks} />
        ) : (
          <LLDView tasks={drillTasks} />
        )}
      </div>
    </div>
  );
}
