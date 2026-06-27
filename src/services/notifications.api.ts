import { api } from './http';

export const notificationApi = {
  list:        (limit?: number) => api.get('/notifications', { params: limit ? { limit } : {} }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead:    (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};
