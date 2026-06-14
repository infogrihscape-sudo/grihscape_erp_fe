import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import { useRouter } from '../context/RouterContext';

const TYPE_COLORS: Record<string, string> = {
  LEAD_GENERATED:             'bg-emerald-500',
  FOLLOW_UP_LOGGED:           'bg-blue-500',
  PROPOSAL_SENT:              'bg-violet-500',
  MEETING_SCHEDULED:          'bg-amber-500',
  PAYMENT_RECORDED:           'bg-teal-500',
  PROJECT_ASSIGNED:           'bg-indigo-500',
  SITE_ENGINEER_ASSIGNED:     'bg-cyan-500',
  SITE_VERIFICATION_SUBMITTED:'bg-sky-500',
  SITE_VERIFICATION_REVIEWED: 'bg-sky-700',
  CDRF_MEETING_SCHEDULED:     'bg-orange-500',
  CDRF_SUBMITTED:             'bg-orange-700',
  LAYOUT_UPLOADED:            'bg-purple-500',
  LAYOUT_REVIEWED_APPROVED:   'bg-green-500',
  LAYOUT_REVIEWED_REJECTED:   'bg-red-500',
  LAYOUT_SENT_TO_CLIENT:      'bg-purple-700',
  CLIENT_LAYOUT_APPROVED:     'bg-green-600',
  CLIENT_REVISION_REQUESTED:  'bg-rose-500',
  DRAWING_ASSIGNED:           'bg-blue-600',
  DRAWING_REVIEW_READY:       'bg-yellow-500',
  PIPELINE_APPROVED_PM:       'bg-lime-500',
  PIPELINE_APPROVED_ADMIN:    'bg-lime-700',
  TRANSMITTAL_SENT:           'bg-teal-600',
  CONTRACT_CREATED:           'bg-slate-400',
  CONTRACT_APPROVED:          'bg-slate-600',
  TENDER_CREATED:             'bg-fuchsia-500',
  TENDER_APPROVED:            'bg-fuchsia-700',
  TENDER_REJECTED:            'bg-red-700',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface NotificationBellProps {
  isCollapsed?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ isCollapsed = false }) => {
  const { notifications, unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  const updatePos = () => {
    if (!bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    setPanelPos({ top: rect.bottom + 8, left: Math.max(8, rect.left - 280 + rect.width) });
  };

  const toggle = () => {
    if (!open) {
      updatePos();
      refresh();
    }
    setOpen(o => !o);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        bellRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleNotifClick = async (n: Notification) => {
    if (!n.isRead) await markRead(n.id);
    if (n.entityRoute) navigate(n.entityRoute);
    setOpen(false);
  };

  const dotColor = TYPE_COLORS[notifications[0]?.type] ?? 'bg-[#c9a45c]';

  return (
    <>
      <button
        ref={bellRef}
        onClick={toggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className={[
          'relative flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer',
          'text-stone-400 hover:text-stone-100 hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-[#b89047]/30',
          isCollapsed ? 'w-10 h-10 md:mx-auto' : 'w-10 h-10',
        ].join(' ')}
      >
        <Bell size={16} />

        {/* Red blinking dot */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}

      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ top: panelPos.top, left: panelPos.left, width: 320 }}
          className="fixed z-[99998] rounded-xl border border-[#2a2d3e] bg-[#14151f] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2030]">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-[#c9a45c]" />
              <span className="text-[13px] font-bold text-stone-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] text-[#c9a45c] hover:text-[#e8c77a] transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-[#c9a45c]/10"
                >
                  <CheckCheck size={11} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-white/8 transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-stone-500">
                <Bell size={24} className="mb-3 opacity-30" />
                <p className="text-[12px]">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={[
                    'flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[#1a1c28] last:border-0',
                    n.isRead
                      ? 'hover:bg-white/3'
                      : 'bg-[#1a1c2c] hover:bg-[#1e2035]',
                  ].join(' ')}
                >
                  {/* Color dot */}
                  <div className="shrink-0 mt-0.5">
                    <span className={`inline-block w-2 h-2 rounded-full mt-1.5 ${TYPE_COLORS[n.type] ?? dotColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[12px] leading-tight ${n.isRead ? 'text-stone-400 font-medium' : 'text-stone-100 font-semibold'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {n.createdBy && (
                        <span className="text-[10px] text-[#c9a45c]/70">{n.createdBy.name}</span>
                      )}
                      <span className="text-[10px] text-stone-600">{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#1e2030] text-center">
              <span className="text-[11px] text-stone-600">Showing last {notifications.length} notifications</span>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
