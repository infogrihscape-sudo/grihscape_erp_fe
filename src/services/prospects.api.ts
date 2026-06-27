import { api } from './http';

export const prospectApi = {
  getProspects:    (search?: string) => api.get('/prospects', { params: { search } }),
  getProspectById: (id: string) => api.get(`/prospects/${id}`),
  createProspect:  (data: any) => api.post('/prospects', data),
  updateProspect:  (id: string, data: any) => api.put(`/prospects/${id}`, data),
  deleteProspect:  (id: string) => api.delete(`/prospects/${id}`),
  uploadFile: (formData: FormData, fileType: 'noc' | 'ref') =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data', 'x-file-type': fileType },
    }),
  getServiceBudgets:    () => api.get('/service-budgets'),
  updateServiceBudget:  (serviceKey: string, budgetRanges: string[]) =>
    api.put('/service-budgets', { serviceKey, budgetRanges }),
  getFollowUps: (id: string) => api.get(`/prospects/${id}/followups`),
  logFollowUp:  (id: string, data: {
    stage?: string; notes: string;
    attachmentUrl?: string | null; attachmentName?: string | null;
    contractFileUrl?: string | null; logOnly?: boolean;
  }) => api.post(`/prospects/${id}/followups`, data),
  requestSiteDetails: (id: string, data: { subject: string; body: string }) =>
    api.post(`/prospects/${id}/request-site-details`, data),
  uploadSiteDetails: (id: string, data: { siteGoogleMapsLink: string }) =>
    api.post(`/prospects/${id}/site-details`, data),
  sendMeetingInvite: (id: string, data: {
    meetingType: 'ONLINE' | 'OFFLINE'; meetingDate: string;
    meetingLink?: string | null; notes?: string | null;
  }) => api.post(`/prospects/${id}/meeting-invite`, data),
  sendProposal: (id: string, data: {
    subject: string; body: string;
    attachmentUrl?: string | null; attachmentName?: string | null;
  }) => api.post(`/prospects/${id}/send-proposal`, data),
  updateWorkflowStage: (id: string, data: { stage: string; notes?: string }) =>
    api.put(`/prospects/${id}/workflow-stage`, data),
  recordInitialPayment: (id: string, data: {
    amount?: string; unit?: string; notes: string;
    attachmentUrl?: string | null; attachmentName?: string | null;
  }) => api.post(`/prospects/${id}/initial-payment`, data),
  verifyByAccounts: (id: string, data?: { notes?: string; revisedAmount?: number | null; revisedUnit?: string }) =>
    api.post(`/prospects/${id}/accounts-verify`, data || {}),
  requestEdit:       (id: string, reason?: string) =>
    api.post(`/prospects/${id}/edit-request`, { reason }),
  getEditRequest:    (id: string) => api.get(`/prospects/${id}/edit-request`),
  getAllEditRequests: (status?: string) =>
    api.get('/prospects/edit-requests/all', { params: status ? { status } : {} }),
  resolveEditRequest: (requestId: string, action: 'approve' | 'reject', adminNotes?: string) =>
    api.patch(`/prospects/edit-requests/${requestId}/resolve`, { action, adminNotes }),
};

export const clientApi = {
  lookupByPhone: (phone: string) => api.get('/clients/lookup', { params: { phone } }),
  getProspects:  (clientId: string) => api.get(`/clients/${clientId}/prospects`),
  addService:    (clientId: string, data: any) => api.post(`/clients/${clientId}/add-service`, data),
};
