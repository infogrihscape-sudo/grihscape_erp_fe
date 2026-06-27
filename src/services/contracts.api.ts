import { api } from './http';

export const contractApi = {
  getContracts: () => api.get('/contracts'),
  createDraft:  (data: { prospectId?: string }) => api.post('/contracts/draft', data),
  uploadFile:   (formData: FormData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data', 'x-file-type': 'contract' },
    }),
  saveDraftUrl:  (id: string, draftPdfUrl: string) =>
    api.post(`/contracts/${id}/upload`, { draftPdfUrl }),
  saveSignedUrl: (id: string, signedPdfUrl: string) =>
    api.post(`/contracts/${id}/upload`, { signedPdfUrl }),
  approve:      (id: string) => api.post(`/contracts/${id}/approve`),
  sendContract: (id: string, data: { clientEmail: string; clientName: string }) =>
    api.post(`/contracts/${id}/send`, data),
};
