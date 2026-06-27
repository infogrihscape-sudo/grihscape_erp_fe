import { api } from './http';

export const tenderApi = {
  getTenders: (params?: {
    status?: string; search?: string; startDate?: string;
    endDate?: string; department?: string; showDeleted?: boolean;
  }) => api.get('/tenders', { params }),
  getTenderById: (id: string)         => api.get(`/tenders/${id}`),
  createTender:  (data: any)          => api.post('/tenders', data),
  updateTender:  (id: string, data: any) => api.put(`/tenders/${id}`, data),
  deleteTender:  (id: string)         => api.delete(`/tenders/${id}`),
  submitTender:  (id: string)         => api.post(`/tenders/${id}/submit`),
  approveTender: (id: string)         => api.post(`/tenders/${id}/approve`),
  rejectTender:  (id: string)         => api.post(`/tenders/${id}/reject`),
  restoreTender: (id: string)         => api.patch(`/tenders/${id}/restore`),
  uploadFile: (formData: FormData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data', 'x-file-type': 'tender' },
    }),
};
