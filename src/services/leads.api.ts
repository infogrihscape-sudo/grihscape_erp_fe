import { api } from './http';

export const leadApi = {
  getLeads:         (search?: string) => api.get('/leads', { params: { search } }),
  createLead:       (data: any) => api.post('/leads', data),
  bulkUploadLeads:  (leads: any[]) => api.post('/leads/bulk', { leads }),
  validateLeads:    (phones: string[]) => api.post('/leads/validate', { phones }),
  updateLeadResponse: (id: string, leadResponse: string | null) =>
    api.patch(`/leads/${id}/response`, { leadResponse }),
};
