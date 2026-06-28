export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  entityId?: string;
  entityType?: string;
  entityRoute?: string;
  isRead: boolean;
  createdAt: string;
  createdBy?: { id: string; name: string };
}
