import { api } from './http';

export const projectApi = {
  getProjects: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/projects', { params }),
  getProjectById:        (id: string) => api.get(`/projects/${id}`),
  getProjectByProspectId: (prospectId: string) => api.get(`/projects/by-prospect/${prospectId}`),
  getAssignableUsers:    () => api.get('/projects/assignable-users'),
  assignTeam: (id: string, data: {
    projectManagerId: string; projectArchitectId: string;
    juniorArchitectId?: string | null; notes?: string;
  }) => api.post(`/projects/${id}/assign`, data),
  onboardExisting: (data: {
    clientName: string; mobileNo: string; email?: string; locality: string;
    pincode?: string; district?: string; state?: string; serviceType: string;
    projectManagerId: string; projectArchitectId: string;
    juniorArchitectId?: string | null; notes?: string;
  }) => api.post('/projects/onboard-existing', data),

  // Site verification
  assignFieldStaff: (projectId: string, data: { siteEngineerId?: string; constructionHeadId?: string }) =>
    api.post(`/projects/${projectId}/site-verification/assign-engineer`, data),
  getSiteVerification:    (projectId: string) => api.get(`/projects/${projectId}/site-verification`),
  submitSiteVerification: (projectId: string, data: any) =>
    api.post(`/projects/${projectId}/site-verification`, data),
  reviewSiteVerification: (projectId: string) =>
    api.post(`/projects/${projectId}/site-verification/review`),

  // CDRF meetings
  getCdrfMeetings:    (projectId: string) => api.get(`/projects/${projectId}/cdrf-meetings`),
  createCdrfMeeting:  (projectId: string, data: { meetingType: string; scheduledAt: string; notes?: string; meetingLink?: string }) =>
    api.post(`/projects/${projectId}/cdrf-meetings`, data),
  updateCdrfMeeting:  (projectId: string, meetingId: string, data: any) =>
    api.put(`/projects/${projectId}/cdrf-meetings/${meetingId}`, data),
  approveCdrfMeeting: (projectId: string, meetingId: string) =>
    api.post(`/projects/${projectId}/cdrf-meetings/${meetingId}/approve`),

  // CDRF follow-up logs
  getCdrfFollowUps: (projectId: string) => api.get(`/projects/${projectId}/cdrf-followups`),
  logCdrfFollowUp:  (projectId: string, data: { type: string; notes: string; meetingId?: string }) =>
    api.post(`/projects/${projectId}/cdrf-followups`, data),

  // CDRF form
  getCdrfForm:    (projectId: string) => api.get(`/projects/${projectId}/cdrf`),
  saveCdrfForm:   (projectId: string, sections: Record<string, any>) =>
    api.put(`/projects/${projectId}/cdrf`, { sections }),
  submitCdrfForm: (projectId: string, sections?: Record<string, any>) =>
    api.post(`/projects/${projectId}/cdrf/submit`, { sections }),

  // Designs
  getDesigns:    (projectId: string) => api.get(`/projects/${projectId}/designs`),
  uploadDesign:  (projectId: string, data: { fileUrl: string; fileName: string }) =>
    api.post(`/projects/${projectId}/designs`, data),
  reviewDesign:  (projectId: string, draftId: string, data: { status: 'APPROVED' | 'REJECTED'; reviewNotes?: string }) =>
    api.post(`/projects/${projectId}/designs/${draftId}/review`, data),
  sendDesignToClient: (projectId: string, draftId: string, data: { notes?: string; clientMeetingDate?: string; clientMeetingNotes?: string }) =>
    api.post(`/projects/${projectId}/designs/${draftId}/send-to-client`, data),
  uploadFile: (formData: FormData) =>
    api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data', 'x-file-type': 'design' } }),
  recordClientResponse: (projectId: string, draftId: string, data: { response: 'APPROVED' | 'REVISION_REQUIRED'; notes?: string; fileUrl?: string; fileName?: string }) =>
    api.post(`/projects/${projectId}/designs/${draftId}/client-response`, data),
  getLayoutFeedback: (projectId: string, draftId: string) =>
    api.get(`/projects/${projectId}/designs/${draftId}/feedback`),

  // Design Pipeline
  getDesignPipeline:    (projectId: string) => api.get(`/projects/${projectId}/pipeline`),
  getDrawingMaster:     (projectId: string) => api.get(`/projects/${projectId}/pipeline/drawing-master`),
  createDrawingMaster:  (projectId: string, data: { name: string; category: string }) =>
    api.post(`/projects/${projectId}/pipeline/drawing-master`, data),
  createDrawingMasterRequest: (projectId: string, data: { name: string; category: string; reason?: string }) =>
    api.post(`/projects/${projectId}/pipeline/drawing-master-requests`, data),
  listDrawingMasterRequests:  (projectId: string) =>
    api.get(`/projects/${projectId}/pipeline/drawing-master-requests`),
  approveDrawingMasterRequest: (projectId: string, requestId: string) =>
    api.post(`/projects/${projectId}/pipeline/drawing-master-requests/${requestId}/approve`),
  rejectDrawingMasterRequest:  (projectId: string, requestId: string, rejectionReason?: string) =>
    api.post(`/projects/${projectId}/pipeline/drawing-master-requests/${requestId}/reject`, { rejectionReason }),
  addDrawing: (projectId: string, data: { drawingMasterId: string; roomName?: string; wallDirection?: string; assignedArchitectId?: string | null; juniorArchitectId?: string | null }) =>
    api.post(`/projects/${projectId}/pipeline/drawings`, data),
  addDrawingsBulk: (projectId: string, drawingMasterIds: string[], assignedArchitectId?: string | null, juniorArchitectId?: string | null) =>
    api.post(`/projects/${projectId}/pipeline/drawings/bulk`, { drawingMasterIds, assignedArchitectId, juniorArchitectId }),
  removeDrawingsBulk:   (projectId: string, drawingIds: string[]) =>
    api.post(`/projects/${projectId}/pipeline/drawings/bulk-delete`, { drawingIds }),
  removeDrawing:        (projectId: string, drawingId: string) =>
    api.delete(`/projects/${projectId}/pipeline/drawings/${drawingId}`),
  requestDrawingDelete: (projectId: string, drawingId: string) =>
    api.post(`/projects/${projectId}/pipeline/drawings/${drawingId}/request-delete`),
  approveDrawingDelete: (projectId: string, drawingId: string) =>
    api.post(`/projects/${projectId}/pipeline/drawings/${drawingId}/approve-delete`),
  rejectDrawingDelete:  (projectId: string, drawingId: string) =>
    api.post(`/projects/${projectId}/pipeline/drawings/${drawingId}/reject-delete`),
  assignDrawingTeam: (projectId: string, drawingId: string, data: { assignedArchitectId?: string | null; juniorArchitectId?: string | null; notes?: string }) =>
    api.put(`/projects/${projectId}/pipeline/drawings/${drawingId}/team`, data),
  updateDrawing: (projectId: string, drawingId: string, data: { status?: string; notes?: string }) =>
    api.put(`/projects/${projectId}/pipeline/drawings/${drawingId}`, data),
  approveByPM:    (projectId: string) => api.post(`/projects/${projectId}/pipeline/approve-pm`),
  approveByAdmin: (projectId: string) => api.post(`/projects/${projectId}/pipeline/approve-admin`),

  // Drawing files
  listDrawingFiles: (projectId: string, drawingId: string) =>
    api.get(`/projects/${projectId}/pipeline/drawings/${drawingId}/files`),
  addDrawingFile: (projectId: string, drawingId: string, data: { fileType: 'CAD' | 'PDF' | 'IMAGE'; fileUrl: string; fileName: string }) =>
    api.post(`/projects/${projectId}/pipeline/drawings/${drawingId}/files`, data),

  // Transmittals
  getTransmittals:  (projectId: string) => api.get(`/projects/${projectId}/transmittals`),
  sendTransmittal:  (projectId: string, data: { fileType: 'SINGLE' | 'FULL_PROJECT' | 'LAYOUT'; projectDrawingId?: string; message?: string; fileUrls: string[] }) =>
    api.post(`/projects/${projectId}/transmittals`, data),
  sendDrawingToSiteEngineer: (projectId: string, data: { projectDrawingId: string; fileUrls: string[]; message?: string }) =>
    api.post(`/projects/${projectId}/transmittals/site-engineer`, data),
  getIssuedDrawings:  (projectId: string) => api.get(`/projects/${projectId}/se/issued-drawings`),
  addDrawingRemark:   (projectId: string, logId: string, message: string) =>
    api.post(`/projects/${projectId}/se/issued-drawings/${logId}/remarks`, { message }),
  getAllSERemarks:     (projectId: string) => api.get(`/projects/${projectId}/se/all-remarks`),
  getDrawingSeRemarks: (projectId: string, drawingId: string) =>
    api.get(`/projects/${projectId}/pipeline/drawings/${drawingId}/se-remarks`),

  // Client Documents
  getClientDocuments:       (projectId: string) => api.get(`/projects/${projectId}/client-documents`),
  sendClientDocuments:      (projectId: string, data: { fileUrls: string[]; fileNames: string[]; message?: string }) =>
    api.post(`/projects/${projectId}/client-documents/send`, data),
  downloadClientDocumentsZip: (projectId: string, filePaths: string[]) =>
    api.post(`/projects/${projectId}/client-documents/zip`, { filePaths }, { responseType: 'blob' }),
};
