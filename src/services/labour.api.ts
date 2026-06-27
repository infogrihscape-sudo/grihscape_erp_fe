import { api } from './http';

export const labourApi = {
  getProjects:  () => api.get('/labour/projects'),
  getOverview:  () => api.get('/labour/overview'),
  lookupByPhone: (phone: string) => api.get('/labour/lookup', { params: { phone } }),

  getLabourers: (projectId: string, includeInactive?: boolean) =>
    api.get(`/labour/${projectId}/labourers`, { params: includeInactive ? { includeInactive: 'true' } : {} }),
  addLabourer:    (projectId: string, data: any) => api.post(`/labour/${projectId}/labourers`, data),
  updateLabourer: (projectId: string, id: string, data: any) =>
    api.put(`/labour/${projectId}/labourers/${id}`, data),
  toggleLabourer: (projectId: string, id: string) =>
    api.patch(`/labour/${projectId}/labourers/${id}/toggle`),

  getAttendance: (projectId: string, params: { date?: string; startDate?: string; endDate?: string }) =>
    api.get(`/labour/${projectId}/attendance`, { params }),
  bulkSaveAttendance: (projectId: string, data: { date: string; records: any[] }) =>
    api.post(`/labour/${projectId}/attendance/bulk`, data),

  getDailyReport:   (projectId: string, date: string) =>
    api.get(`/labour/${projectId}/reports/daily`, { params: { date } }),
  getWeeklyReport:  (projectId: string, weekStart: string) =>
    api.get(`/labour/${projectId}/reports/weekly`, { params: { weekStart } }),
  getMonthlyReport: (projectId: string, year: number, month: number) =>
    api.get(`/labour/${projectId}/reports/monthly`, { params: { year, month } }),

  calculateWagePayout: (projectId: string, startDate: string, endDate: string) =>
    api.get(`/labour/${projectId}/payout-calc`, { params: { startDate, endDate } }),
  markPaidOut: (projectId: string, attendanceIds: string[], sprId: string) =>
    api.post(`/labour/${projectId}/payout-calc/mark-paid`, { attendanceIds, sprId }),
};
