import { api } from './api';

const base = (projectId: string) => `/projects/${projectId}/construction`;

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const constructionApi = {
  // Tasks
  listTasks: (projectId: string) =>
    api.get(`${base(projectId)}/tasks`),

  createTask: (projectId: string, data: any) =>
    api.post(`${base(projectId)}/tasks`, data),

  bulkImportTasks: (projectId: string, tasks: any[]) =>
    api.post(`${base(projectId)}/tasks/bulk`, { tasks }),

  getTask: (projectId: string, taskId: string) =>
    api.get(`${base(projectId)}/tasks/${taskId}`),

  updateTask: (projectId: string, taskId: string, data: any) =>
    api.put(`${base(projectId)}/tasks/${taskId}`, data),

  updateTaskStatus: (projectId: string, taskId: string, status: string, progressPct?: number) =>
    api.patch(`${base(projectId)}/tasks/${taskId}/status`, { status, progressPct }),

  // Daily Reports
  listProjectReports: (projectId: string) =>
    api.get(`${base(projectId)}/reports`),

  listTaskReports: (projectId: string, taskId: string) =>
    api.get(`${base(projectId)}/tasks/${taskId}/reports`),

  submitReport: (projectId: string, taskId: string, data: any) =>
    api.post(`${base(projectId)}/tasks/${taskId}/reports`, data),

  updateReport: (projectId: string, taskId: string, reportId: string, data: any) =>
    api.patch(`${base(projectId)}/tasks/${taskId}/reports/${reportId}`, data),

  // Site Payment Requests
  listSPRs: (projectId: string, status?: string) =>
    api.get(`${base(projectId)}/payments`, { params: status ? { status } : {} }),

  createSPR: (projectId: string, data: any) =>
    api.post(`${base(projectId)}/payments`, data),

  getSPR: (projectId: string, sprId: string) =>
    api.get(`${base(projectId)}/payments/${sprId}`),

  pmReview: (projectId: string, sprId: string, action: string, remarks?: string) =>
    api.post(`${base(projectId)}/payments/${sprId}/pm-review`, { action, remarks }),

  adminReview: (projectId: string, sprId: string, action: string, remarks?: string) =>
    api.post(`${base(projectId)}/payments/${sprId}/admin-review`, { action, remarks }),
};

export const delayAnalysisApi = {
  get: () => api.get('/projects/delay-analysis'),
};
