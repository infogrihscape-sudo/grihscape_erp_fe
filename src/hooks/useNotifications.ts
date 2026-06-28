import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationApi } from '../services/api';
import type { Notification } from '../types/notification.js';

export type { Notification };

const POLL_INTERVAL = 30_000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await notificationApi.list(30);
      setNotifications(res.data.notifications ?? []);
      setUnreadCount(res.data.unreadCount ?? 0);
    } catch { /* silent */ }
  }, []);

  const pollCount = useCallback(async () => {
    try {
      const res = await notificationApi.unreadCount();
      setUnreadCount(res.data.count ?? 0);
    } catch { /* silent */ }
  }, []);

  // Initial full fetch
  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  // Poll unread count every 30 s
  useEffect(() => {
    timerRef.current = setInterval(pollCount, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pollCount]);

  const markRead = useCallback(async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  }, []);

  const refresh = useCallback(() => fetchAll(), [fetchAll]);

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh };
}
