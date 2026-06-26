import React, { useState, useEffect, useCallback } from 'react';
import { projectApi } from '../../services/api.js';
import type { User } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { ShimmerTable } from '../../components/Shimmer.js';
import { CalendarDays, Plus, Loader2, CheckCircle2, SquarePen, X, FileText } from 'lucide-react';
import {
  card, inputBase, btnPrimary, btnSecondary, label,
  ClientContactBanner, Modal,
} from './shared.js';

export function CdrfMeetingsTab({ project, currentUser }: { project: any; currentUser: User }) {
  const { showToast } = useToast();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const isPM         = project.assignment?.projectManager?.id === currentUser.id;
  const isAdmin      = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isArch       = currentUser.role === 'Project Architect' && project.assignment?.projectArchitect?.id === currentUser.id;
  const isCompleted  = project.status === 'COMPLETED';
  const canSchedule       = !isCompleted && (isPM || isSuperAdmin);
  const canRequestMeeting = !isCompleted && isArch;
  const canLogFollowUp    = !isCompleted && (isPM || isSuperAdmin || isArch);
  const canManage         = canSchedule;

  const [meetForm, setMeetForm] = useState({ meetingType: 'OFFLINE', scheduledAt: '', notes: '', meetingLink: '' });
  const [fuForm, setFuForm] = useState({ type: 'GENERAL_NOTE', notes: '', meetingId: '' });
  const [updateForm, setUpdateForm] = useState({ status: '', clientPresent: false, notes: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, fRes] = await Promise.all([
        projectApi.getCdrfMeetings(project.id),
        projectApi.getCdrfFollowUps(project.id),
      ]);
      setMeetings(mRes.data.meetings ?? []);
      setFollowUps(fRes.data.logs ?? []);
    } catch { } finally { setLoading(false); }
  }, [project.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateMeeting = async () => {
    if (!meetForm.scheduledAt) { showToast('Date/time is required.', 'error'); return; }
    setSubmitting(true);
    try {
      await projectApi.createCdrfMeeting(project.id, meetForm);
      showToast('Meeting created.', 'success');
      setShowCreate(false);
      setMeetForm({ meetingType: 'OFFLINE', scheduledAt: '', notes: '', meetingLink: '' });
      fetchData();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleUpdateMeeting = async (meetingId: string) => {
    setSubmitting(true);
    try {
      await projectApi.updateCdrfMeeting(project.id, meetingId, updateForm);
      showToast('Meeting updated.', 'success');
      setSelectedMeeting(null);
      fetchData();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleLogFollowUp = async () => {
    if (!fuForm.notes.trim()) { showToast('Notes are required.', 'error'); return; }
    setSubmitting(true);
    try {
      await projectApi.logCdrfFollowUp(project.id, fuForm);
      showToast('Follow-up logged.', 'success');
      setShowFollowUp(false);
      setFuForm({ type: 'GENERAL_NOTE', notes: '', meetingId: '' });
      fetchData();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleApproveMeeting = async (meetingId: string) => {
    setSubmitting(true);
    try {
      await projectApi.approveCdrfMeeting(project.id, meetingId);
      showToast('Meeting approved and scheduled.', 'success');
      fetchData();
    } catch (err: any) { showToast(err.response?.data?.message ?? 'Failed.', 'error'); }
    finally { setSubmitting(false); }
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDING_PM_APPROVAL: 'text-violet-700 bg-violet-50 border-violet-200',
    SCHEDULED:           'text-blue-700 bg-blue-50 border-blue-200',
    COMPLETED:           'text-emerald-700 bg-emerald-50 border-emerald-200',
    MISSED:              'text-rose-700 bg-rose-50 border-rose-200',
    RESCHEDULED:         'text-amber-700 bg-amber-50 border-amber-200',
    CANCELLED:           'text-stone-600 bg-stone-50 border-stone-200',
  };

  if (loading) return <div className="p-4"><ShimmerTable rows={5} cols={3} /></div>;

  const totalMeetings  = meetings.length;
  const completedCount = meetings.filter(m => m.status === 'COMPLETED').length;
  const missedCount    = meetings.filter(m => m.status === 'MISSED' || m.status === 'CANCELLED').length;
  const scheduledCount = meetings.filter(m => m.status === 'SCHEDULED').length;
  const generalLogs    = followUps.filter(f => !f.meetingId);

  const FU_COLORS: Record<string, string> = {
    MISSED:        'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400',
    RESCHEDULED:   'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400',
    DELAYED:       'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400',
    CLIENT_NO_SHOW:'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-400',
    GENERAL_NOTE:  'text-stone-600 bg-stone-50 border-stone-200 dark:bg-stone-800/40 dark:border-stone-700 dark:text-stone-400',
  };

  return (
    <div className="space-y-3">
      {/* Client strip */}
      <ClientContactBanner client={project.prospect?.client} prospect={project.prospect} />

      {/* Stats summary + action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 flex-1 flex-wrap">
          {[
            { label: 'Total',     count: totalMeetings,  color: 'text-[var(--text-primary)] bg-[var(--card-bg)] border-[var(--border)]' },
            { label: 'Completed', count: completedCount, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400' },
            { label: 'Missed',    count: missedCount,    color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400' },
            { label: 'Upcoming',  count: scheduledCount, color: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${s.color}`}>
              <span className="font-black text-[13px]">{s.count}</span>
              <span className="opacity-70">{s.label}</span>
            </div>
          ))}
        </div>
        {(canSchedule || canRequestMeeting || canLogFollowUp) && (
          <div className="flex gap-2 shrink-0">
            {canLogFollowUp && (
              <button onClick={() => setShowFollowUp(true)} className={btnSecondary}><Plus size={11} /> Log Follow-up</button>
            )}
            {canSchedule && (
              <button onClick={() => setShowCreate(true)} className={btnPrimary}><CalendarDays size={11} /> Schedule Meeting</button>
            )}
            {canRequestMeeting && (
              <button onClick={() => setShowCreate(true)} className={btnPrimary}><CalendarDays size={11} /> Request Meeting</button>
            )}
          </div>
        )}
      </div>

      {/* Meetings list */}
      {meetings.length === 0 ? (
        <div className={`${card} p-10 text-center flex flex-col items-center gap-3`}>
          <div className="w-12 h-12 rounded-2xl bg-[rgba(184,144,71,0.06)] border border-[rgba(184,144,71,0.12)] flex items-center justify-center">
            <CalendarDays size={20} className="text-[#b89047]/40" />
          </div>
          <p className="text-[12px] font-medium text-[var(--text-muted)]">No CDRF meetings scheduled yet.</p>
          {(canSchedule || canRequestMeeting) && (
            <button onClick={() => setShowCreate(true)} className={btnPrimary}>
              <CalendarDays size={11} /> {canSchedule ? 'Schedule First Meeting' : 'Request First Meeting'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m, idx) => {
            const date = new Date(m.scheduledAt);
            const isPast = date < new Date();
            return (
              <div key={m.id} className={`${card} overflow-hidden`}>
                <div className={`h-1 w-full ${
                  m.status === 'COMPLETED' ? 'bg-emerald-500' :
                  m.status === 'MISSED' || m.status === 'CANCELLED' ? 'bg-rose-400' :
                  m.status === 'RESCHEDULED' ? 'bg-amber-400' :
                  'bg-blue-400'}`}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[m.status] ?? 'text-stone-600 bg-stone-50 border-stone-200'}`}>
                          {m.status}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          m.meetingType === 'ONLINE'
                            ? 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-400'
                            : 'text-stone-600 bg-stone-50 border-stone-200 dark:bg-stone-800/40 dark:border-stone-700 dark:text-stone-400'
                        }`}>
                          {m.meetingType === 'ONLINE' ? '🔗' : '📍'} {m.meetingType}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">Meeting #{idx + 1}</span>
                      </div>
                      <p className="text-[14px] font-bold text-[var(--text-primary)] mb-0.5">
                        {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-[12px] text-[var(--text-secondary)] mb-2">
                        {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        {isPast && m.status !== 'SCHEDULED' && <span className="ml-2 text-[var(--text-muted)]">· {Math.ceil((Date.now() - date.getTime()) / 86400000)}d ago</span>}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-[var(--text-muted)]">
                        <span>Scheduled by <span className="font-semibold text-[var(--text-secondary)]">{m.scheduledBy?.name ?? '—'}</span></span>
                        <span className={`font-semibold ${m.clientPresent ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                          Client {m.clientPresent ? '✓ Present' : '✗ Absent'}
                        </span>
                      </div>
                      {m.notes && (
                        <p className="mt-2 text-[12px] text-[var(--text-secondary)] bg-[var(--border)]/30 rounded-lg px-3 py-2 border-l-2 border-[#b89047]/40">
                          {m.notes}
                        </p>
                      )}
                      {m.meetingLink && (
                        <a href={m.meetingLink} target="_blank" rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium">
                          🔗 Join Meeting Link
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {canManage && m.status === 'SCHEDULED' && (
                        <button
                          onClick={() => { setSelectedMeeting(m); setUpdateForm({ status: m.status, clientPresent: !!m.clientPresent, notes: m.notes ?? '' }); }}
                          className={btnSecondary}
                        >
                          <SquarePen size={11} /> Update
                        </button>
                      )}
                      {canSchedule && m.status === 'PENDING_PM_APPROVAL' && (
                        <button
                          onClick={() => handleApproveMeeting(m.id)}
                          disabled={submitting}
                          className={btnPrimary}
                        >
                          <CheckCircle2 size={11} /> Approve
                        </button>
                      )}
                    </div>
                  </div>
                  {m.followUpLogs?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">Follow-up Activity</p>
                      <div className="space-y-2">
                        {m.followUpLogs.map((fl: any) => (
                          <div key={fl.id} className="flex items-start gap-2.5">
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${FU_COLORS[fl.type] ?? FU_COLORS.GENERAL_NOTE}`}>
                              {fl.type.replace(/_/g, ' ')}
                            </span>
                            <p className="flex-1 text-[11.5px] text-[var(--text-secondary)]">{fl.notes}</p>
                            <span className="text-[10px] text-[var(--text-muted)] shrink-0">{fl.loggedBy?.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* General follow-up logs */}
      {generalLogs.length > 0 && (
        <div className={`${card} p-4`}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3 pb-2 border-b border-[var(--border)]">
            General Follow-up Logs <span className="font-normal text-[var(--text-muted)]">({generalLogs.length})</span>
          </p>
          <div className="space-y-2.5">
            {generalLogs.map(fl => (
              <div key={fl.id} className="flex items-start gap-3">
                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 mt-0.5 ${FU_COLORS[fl.type] ?? FU_COLORS.GENERAL_NOTE}`}>
                  {fl.type.replace(/_/g, ' ')}
                </span>
                <p className="flex-1 text-[12px] text-[var(--text-secondary)]">{fl.notes}</p>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)]">{fl.loggedBy?.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{new Date(fl.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create meeting modal */}
      {showCreate && (
        <Modal title={canSchedule ? 'Schedule CDRF Meeting' : 'Request CDRF Meeting'} onClose={() => setShowCreate(false)}>
          <div className="p-5 space-y-3">
            {canRequestMeeting && (
              <p className="text-[11.5px] text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                Your request will be sent to the Project Manager for approval before the meeting is confirmed.
              </p>
            )}
            <div><label className={label}>Type</label>
              <select className={inputBase} value={meetForm.meetingType} onChange={e => setMeetForm(f => ({ ...f, meetingType: e.target.value }))}>
                <option value="OFFLINE">Offline (In-Person)</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div><label className={label}>Date & Time <span className="text-rose-500">*</span></label>
              <input type="datetime-local" className={inputBase} value={meetForm.scheduledAt} onChange={e => setMeetForm(f => ({ ...f, scheduledAt: e.target.value }))} min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} />
            </div>
            {meetForm.meetingType === 'ONLINE' && (
              <div>
                <label className={label}>Meeting Link</label>
                <input className={inputBase} value={meetForm.meetingLink} onChange={e => setMeetForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="Leave blank to auto-generate a Jitsi link" />
                <p className="text-[10.5px] text-stone-400 italic mt-1">A meeting link will be auto-generated and emailed to the client if left blank.</p>
              </div>
            )}
            <div><label className={label}>Notes</label>
              <textarea className={`${inputBase} resize-none`} rows={2} value={meetForm.notes} onChange={e => setMeetForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className={btnSecondary}>Cancel</button>
              <button onClick={handleCreateMeeting} disabled={submitting} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <CalendarDays size={12} />}
                {canSchedule ? 'Schedule' : 'Submit Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Update meeting modal */}
      {selectedMeeting && (
        <Modal title="Update Meeting" subtitle={new Date(selectedMeeting.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} onClose={() => setSelectedMeeting(null)}>
          <div className="p-5 space-y-3">
            <div><label className={label}>Status</label>
              <select className={inputBase} value={updateForm.status} onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value }))}>
                {['SCHEDULED', 'COMPLETED', 'MISSED', 'RESCHEDULED', 'CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={updateForm.clientPresent} onChange={e => setUpdateForm(f => ({ ...f, clientPresent: e.target.checked }))} className="accent-amber-600" />
              <span className="text-[12px]">Client was present</span>
            </label>
            <div><label className={label}>Notes</label>
              <textarea className={`${inputBase} resize-none`} rows={2} value={updateForm.notes} onChange={e => setUpdateForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedMeeting(null)} className={btnSecondary}>Cancel</button>
              <button onClick={() => handleUpdateMeeting(selectedMeeting.id)} disabled={submitting} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Log follow-up modal */}
      {showFollowUp && (
        <Modal title="Log Follow-up" onClose={() => setShowFollowUp(false)}>
          <div className="p-5 space-y-3">
            <div><label className={label}>Type</label>
              <select className={inputBase} value={fuForm.type} onChange={e => setFuForm(f => ({ ...f, type: e.target.value }))}>
                {['MISSED', 'RESCHEDULED', 'DELAYED', 'CLIENT_NO_SHOW', 'GENERAL_NOTE'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div><label className={label}>Related Meeting <span className="text-stone-400">(optional)</span></label>
              <select className={inputBase} value={fuForm.meetingId} onChange={e => setFuForm(f => ({ ...f, meetingId: e.target.value }))}>
                <option value="">— None —</option>
                {meetings.map(m => <option key={m.id} value={m.id}>{new Date(m.scheduledAt).toLocaleDateString('en-IN')} ({m.status})</option>)}
              </select>
            </div>
            <div><label className={label}>Notes <span className="text-rose-500">*</span></label>
              <textarea className={`${inputBase} resize-none`} rows={3} value={fuForm.notes} onChange={e => setFuForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFollowUp(false)} className={btnSecondary}>Cancel</button>
              <button onClick={handleLogFollowUp} disabled={submitting} className={btnPrimary}>
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Log
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
