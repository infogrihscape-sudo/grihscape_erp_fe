import axios from 'axios';
import NProgress from 'nprogress';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

// ── NProgress configuration ──────────────────────────────────────────────────
NProgress.configure({
  showSpinner: false,   // hide the spinner; keep only the bar
  speed: 400,
  minimum: 0.08,
  trickleSpeed: 200,
});

// Track pending requests so the bar stays visible until ALL are done
let pendingRequests = 0;   // all requests — drives NProgress bar
let pendingMutations = 0;  // POST/PUT/PATCH/DELETE only — drives overlay

const dispatchLoadingEvent = (active: boolean) => {
  window.dispatchEvent(new CustomEvent('api-loading', { detail: { active } }));
};

const startProgress = (isMutation: boolean) => {
  if (pendingRequests === 0) NProgress.start();
  pendingRequests++;
  if (isMutation) {
    if (pendingMutations === 0) dispatchLoadingEvent(true);
    pendingMutations++;
  }
};

const stopProgress = (isMutation: boolean) => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  if (pendingRequests === 0) NProgress.done();
  if (isMutation) {
    pendingMutations = Math.max(0, pendingMutations - 1);
    if (pendingMutations === 0) dispatchLoadingEvent(false);
  }
};

// ── Axios instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken: string | null = null;
let refreshSubscribers: ((token: string) => void)[] = [];
let isRefreshing = false;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => {
  return accessToken;
};

const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);

// ── Request interceptor — attach token + start progress bar ──────────────────
api.interceptors.request.use(
  (config) => {
    const isMutation = MUTATION_METHODS.has((config.method ?? '').toLowerCase());
    (config as any)._isMutation = isMutation;
    startProgress(isMutation);
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: unknown) => {
    const isMutation = MUTATION_METHODS.has(((error as any)?.config?.method ?? '').toLowerCase());
    stopProgress(isMutation);
    return Promise.reject(error);
  }
);

// ── Subscribe to token refreshing ────────────────────────────────────────────
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

// ── Response interceptor — stop progress bar + handle 401 ────────────────────
api.interceptors.response.use(
  (response: any) => {
    stopProgress((response.config as any)._isMutation ?? false);
    return response;
  },
  async (error: any) => {
    const originalRequest = error.config;
    const isMutation: boolean = originalRequest?._isMutation ?? false;

    // Avoid infinite loop on /auth/refresh or /auth/verify-otp
    if (
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/verify-otp')
    ) {
      console.warn(
        `[API] ❌ ${originalRequest.url} returned ${error.response?.status}`,
        '| data:', error.response?.data,
        '| network error:', error.message,
      );
      stopProgress(isMutation);
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.warn(`[API] 401 on ${originalRequest.url} — queuing refresh`);

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshUrl = `${API_BASE_URL}/auth/refresh`;
      console.log(`[API] Calling refresh endpoint: ${refreshUrl}`);
      console.log(`[API] withCredentials: true  |  cookies visible to JS: "${document.cookie || '(none)'}"`);

      try {
        const refreshResponse = await axios.post(
          refreshUrl,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.accessToken;
        console.log('[API] ✅ Token refresh succeeded — new access token obtained');
        setAccessToken(newAccessToken);
        isRefreshing = false;
        onRefreshed(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        stopProgress(isMutation);
        return api(originalRequest);
      } catch (refreshError: any) {
        console.error(
          '[API] ❌ Token refresh FAILED',
          '| status:', refreshError?.response?.status,
          '| data:', refreshError?.response?.data,
          '| message:', refreshError?.message,
        );
        isRefreshing = false;
        setAccessToken(null);
        stopProgress(isMutation);
        // Clear active session in window if refresh token expired
        window.dispatchEvent(new Event('auth-session-expired'));
        return Promise.reject(refreshError);
      }
    }

    stopProgress(isMutation);
    return Promise.reject(error);
  }
);

// ── Auth APIs ───────────────────────────────────────────────────────────────
export const authApi = {
  refresh: () => api.post('/auth/refresh'),
  getMe: () => api.get('/users/me'),
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string, latitude?: number, longitude?: number) => api.post('/auth/verify-otp', { phone, otp, latitude, longitude }),
  logout: (latitude?: number, longitude?: number) => api.post('/auth/logout', { latitude, longitude }),
};

// ── User / Admin / Role APIs ────────────────────────────────────────────────
export const userApi = {
  getUsers: () => api.get('/users'),
  getRoles: () => api.get('/users/roles'),
  getLogs: () => api.get('/users/logs'),
  createUser: (data: { name: string; email: string; phone: string; roleId: string }) => api.post('/users', data),
  updateUser: (id: string, data: { name: string; email: string; phone: string; roleId: string }) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  createRole: (data: { name: string; description: string }) => api.post('/users/roles', data),
  updateRole: (roleId: string, data: { name: string; description: string }) => api.put(`/users/roles/${roleId}`, data),
  toggleBlock: (userId: string, action: 'block' | 'unblock') => api.post(`/users/${userId}/${action}`),
};

export const prospectApi = {
  getProspects: (search?: string) => api.get('/prospects', { params: { search } }),
  getProspectById: (id: string) => api.get(`/prospects/${id}`),
  createProspect: (data: any) => api.post('/prospects', data),
  updateProspect: (id: string, data: any) => api.put(`/prospects/${id}`, data),
  deleteProspect: (id: string) => api.delete(`/prospects/${id}`),
  uploadFile: (formData: FormData, fileType: 'noc' | 'ref') =>
    api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-file-type': fileType,
      },
    }),
  getServiceBudgets: () => api.get('/service-budgets'),
  updateServiceBudget: (serviceKey: string, budgetRanges: string[]) =>
    api.put('/service-budgets', { serviceKey, budgetRanges }),
  getFollowUps: (id: string) => api.get(`/prospects/${id}/followups`),
  logFollowUp: (id: string, data: { stage?: string; notes: string; attachmentUrl?: string | null; attachmentName?: string | null; contractFileUrl?: string | null; logOnly?: boolean }) =>
    api.post(`/prospects/${id}/followups`, data),
  requestSiteDetails: (id: string, data: { subject: string; body: string }) =>
    api.post(`/prospects/${id}/request-site-details`, data),
  uploadSiteDetails: (id: string, data: { siteGoogleMapsLink: string }) =>
    api.post(`/prospects/${id}/site-details`, data),
  sendMeetingInvite: (id: string, data: { meetingType: 'ONLINE' | 'OFFLINE'; meetingDate: string; meetingLink?: string | null; notes?: string | null }) =>
    api.post(`/prospects/${id}/meeting-invite`, data),
  sendProposal: (id: string, data: { subject: string; body: string; attachmentUrl?: string | null; attachmentName?: string | null }) =>
    api.post(`/prospects/${id}/send-proposal`, data),
  updateWorkflowStage: (id: string, data: { stage: string; notes?: string }) =>
    api.put(`/prospects/${id}/workflow-stage`, data),
  recordInitialPayment: (id: string, data: { amount?: string; unit?: string; notes: string; attachmentUrl?: string | null; attachmentName?: string | null }) =>
    api.post(`/prospects/${id}/initial-payment`, data),
  verifyByAccounts: (id: string, data?: { notes?: string; revisedAmount?: number | null; revisedUnit?: string }) =>
    api.post(`/prospects/${id}/accounts-verify`, data || {}),

  // Edit-request workflow
  requestEdit: (id: string, reason?: string) =>
    api.post(`/prospects/${id}/edit-request`, { reason }),
  getEditRequest: (id: string) =>
    api.get(`/prospects/${id}/edit-request`),
  getAllEditRequests: (status?: string) =>
    api.get('/prospects/edit-requests/all', { params: status ? { status } : {} }),
  resolveEditRequest: (requestId: string, action: 'approve' | 'reject', adminNotes?: string) =>
    api.patch(`/prospects/edit-requests/${requestId}/resolve`, { action, adminNotes }),
};

export const leadApi = {
  getLeads: (search?: string) => api.get('/leads', { params: { search } }),
  createLead: (data: any) => api.post('/leads', data),
  bulkUploadLeads: (leads: any[]) => api.post('/leads/bulk', { leads }),
  validateLeads: (phones: string[]) => api.post('/leads/validate', { phones }),
  updateLeadResponse: (id: string, leadResponse: string | null) =>
    api.patch(`/leads/${id}/response`, { leadResponse }),
};

// Client master-data APIs
export const clientApi = {
  // Look up a master client by phone — returns client + their existing services
  lookupByPhone: (phone: string) => api.get('/clients/lookup', { params: { phone } }),
  // Get all service engagements for a client
  getProspects: (clientId: string) => api.get(`/clients/${clientId}/prospects`),
  // Add a new service engagement to an existing client
  addService: (clientId: string, data: any) => api.post(`/clients/${clientId}/add-service`, data),
};

// Backend base URL (without /api) for building static file links.
// Falls back to deriving from VITE_API_URL so /uploads/ always resolves to the EC2 server.
export const BACKEND_BASE: string =
  import.meta.env.VITE_BACKEND_BASE ||
  (import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '') : '');

export const contractApi = {
  getContracts: () => api.get('/contracts'),
  createDraft: (data: { prospectId?: string }) =>
    api.post('/contracts/draft', data),
  // Upload a PDF to the server — override default Content-Type to multipart/form-data
  uploadFile: (formData: FormData) =>
    api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-file-type': 'contract',
      },
    }),
  // Attach draft PDF URL to a contract record
  saveDraftUrl: (id: string, draftPdfUrl: string) =>
    api.post(`/contracts/${id}/upload`, { draftPdfUrl }),
  // Attach signed PDF URL to a contract record (after client signs)
  saveSignedUrl: (id: string, signedPdfUrl: string) =>
    api.post(`/contracts/${id}/upload`, { signedPdfUrl }),
  approve: (id: string) => api.post(`/contracts/${id}/approve`),
  sendContract: (id: string, data: { clientEmail: string; clientName: string }) =>
    api.post(`/contracts/${id}/send`, data),
};

export const projectApi = {
  // Core
  getProjects: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/projects', { params }),
  getProjectById: (id: string) => api.get(`/projects/${id}`),
  getProjectByProspectId: (prospectId: string) => api.get(`/projects/by-prospect/${prospectId}`),
  getAssignableUsers: () => api.get('/projects/assignable-users'),
  assignTeam: (id: string, data: {
    projectManagerId: string;
    projectArchitectId: string;
    juniorArchitectId?: string | null;
    notes?: string;
  }) => api.post(`/projects/${id}/assign`, data),

  // Site verification
  assignSiteEngineer: (projectId: string, siteEngineerId: string) =>
    api.post(`/projects/${projectId}/site-verification/assign-engineer`, { siteEngineerId }),
  getSiteVerification: (projectId: string) =>
    api.get(`/projects/${projectId}/site-verification`),
  submitSiteVerification: (projectId: string, data: any) =>
    api.post(`/projects/${projectId}/site-verification`, data),
  reviewSiteVerification: (projectId: string) =>
    api.post(`/projects/${projectId}/site-verification/review`),

  // CDRF meetings
  getCdrfMeetings: (projectId: string) =>
    api.get(`/projects/${projectId}/cdrf-meetings`),
  createCdrfMeeting: (projectId: string, data: { meetingType: string; scheduledAt: string; notes?: string; meetingLink?: string }) =>
    api.post(`/projects/${projectId}/cdrf-meetings`, data),
  updateCdrfMeeting: (projectId: string, meetingId: string, data: any) =>
    api.put(`/projects/${projectId}/cdrf-meetings/${meetingId}`, data),

  // CDRF follow-up logs
  getCdrfFollowUps: (projectId: string) =>
    api.get(`/projects/${projectId}/cdrf-followups`),
  logCdrfFollowUp: (projectId: string, data: { type: string; notes: string; meetingId?: string }) =>
    api.post(`/projects/${projectId}/cdrf-followups`, data),

  // CDRF form
  getCdrfForm: (projectId: string) =>
    api.get(`/projects/${projectId}/cdrf`),
  saveCdrfForm: (projectId: string, sections: Record<string, any>) =>
    api.put(`/projects/${projectId}/cdrf`, { sections }),
  submitCdrfForm: (projectId: string, sections?: Record<string, any>) =>
    api.post(`/projects/${projectId}/cdrf/submit`, { sections }),

  // Designs
  getDesigns: (projectId: string) =>
    api.get(`/projects/${projectId}/designs`),
  uploadDesign: (projectId: string, data: { fileUrl: string; fileName: string }) =>
    api.post(`/projects/${projectId}/designs`, data),
  reviewDesign: (projectId: string, draftId: string, data: { status: 'APPROVED' | 'REJECTED'; reviewNotes?: string }) =>
    api.post(`/projects/${projectId}/designs/${draftId}/review`, data),
  sendDesignToClient: (projectId: string, draftId: string, data: { notes?: string; clientMeetingDate?: string; clientMeetingNotes?: string }) =>
    api.post(`/projects/${projectId}/designs/${draftId}/send-to-client`, data),

  // File upload (reuse existing upload endpoint)
  uploadFile: (formData: FormData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data', 'x-file-type': 'design' },
    }),

  // Layout client response
  recordClientResponse: (projectId: string, draftId: string, data: { response: 'APPROVED' | 'REVISION_REQUIRED'; notes?: string; fileUrl?: string; fileName?: string }) =>
    api.post(`/projects/${projectId}/designs/${draftId}/client-response`, data),
  getLayoutFeedback: (projectId: string, draftId: string) =>
    api.get(`/projects/${projectId}/designs/${draftId}/feedback`),

  // Design Pipeline
  getDesignPipeline: (projectId: string) =>
    api.get(`/projects/${projectId}/pipeline`),
  getDrawingMaster: (projectId: string) =>
    api.get(`/projects/${projectId}/pipeline/drawing-master`),
  createDrawingMaster: (projectId: string, data: { name: string; category: string }) =>
    api.post(`/projects/${projectId}/pipeline/drawing-master`, data),
  addDrawing: (projectId: string, data: { drawingMasterId: string; roomName?: string; wallDirection?: string; assignedArchitectId?: string | null; juniorArchitectId?: string | null }) =>
    api.post(`/projects/${projectId}/pipeline/drawings`, data),
  addDrawingsBulk: (projectId: string, drawingMasterIds: string[], assignedArchitectId?: string | null, juniorArchitectId?: string | null) =>
    api.post(`/projects/${projectId}/pipeline/drawings/bulk`, { drawingMasterIds, assignedArchitectId, juniorArchitectId }),
  removeDrawingsBulk: (projectId: string, drawingIds: string[]) =>
    api.post(`/projects/${projectId}/pipeline/drawings/bulk-delete`, { drawingIds }),
  removeDrawing: (projectId: string, drawingId: string) =>
    api.delete(`/projects/${projectId}/pipeline/drawings/${drawingId}`),
  requestDrawingDelete: (projectId: string, drawingId: string) =>
    api.post(`/projects/${projectId}/pipeline/drawings/${drawingId}/request-delete`),
  approveDrawingDelete: (projectId: string, drawingId: string) =>
    api.post(`/projects/${projectId}/pipeline/drawings/${drawingId}/approve-delete`),
  rejectDrawingDelete: (projectId: string, drawingId: string) =>
    api.post(`/projects/${projectId}/pipeline/drawings/${drawingId}/reject-delete`),
  assignDrawingTeam: (projectId: string, drawingId: string, data: { assignedArchitectId?: string | null; juniorArchitectId?: string | null; notes?: string }) =>
    api.put(`/projects/${projectId}/pipeline/drawings/${drawingId}/team`, data),
  updateDrawing: (projectId: string, drawingId: string, data: { status?: string; notes?: string }) =>
    api.put(`/projects/${projectId}/pipeline/drawings/${drawingId}`, data),
  approveByPM: (projectId: string) =>
    api.post(`/projects/${projectId}/pipeline/approve-pm`),
  approveByAdmin: (projectId: string) =>
    api.post(`/projects/${projectId}/pipeline/approve-admin`),

  // Drawing files
  listDrawingFiles: (projectId: string, drawingId: string) =>
    api.get(`/projects/${projectId}/pipeline/drawings/${drawingId}/files`),
  addDrawingFile: (projectId: string, drawingId: string, data: { fileType: 'CAD' | 'PDF' | 'IMAGE'; fileUrl: string; fileName: string }) =>
    api.post(`/projects/${projectId}/pipeline/drawings/${drawingId}/files`, data),

  // Transmittal logs
  getTransmittals: (projectId: string) =>
    api.get(`/projects/${projectId}/transmittals`),
  sendTransmittal: (projectId: string, data: { fileType: 'SINGLE' | 'FULL_PROJECT' | 'LAYOUT'; projectDrawingId?: string; message?: string; fileUrls: string[] }) =>
    api.post(`/projects/${projectId}/transmittals`, data),
};

export const tenderApi = {
  getTenders: (params?: { status?: string; search?: string; startDate?: string; endDate?: string; department?: string; showDeleted?: boolean }) => 
    api.get('/tenders', { params }),
  getTenderById: (id: string) => api.get(`/tenders/${id}`),
  createTender: (data: any) => api.post('/tenders', data),
  updateTender: (id: string, data: any) => api.put(`/tenders/${id}`, data),
  deleteTender: (id: string) => api.delete(`/tenders/${id}`),
  submitTender: (id: string) => api.post(`/tenders/${id}/submit`),
  approveTender: (id: string) => api.post(`/tenders/${id}/approve`),
  rejectTender: (id: string) => api.post(`/tenders/${id}/reject`),
  restoreTender: (id: string) => api.patch(`/tenders/${id}/restore`),
  uploadFile: (formData: FormData) =>
    api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-file-type': 'tender',
      },
    }),
};

export const notificationApi = {
  list: (limit?: number) => api.get('/notifications', { params: limit ? { limit } : {} }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};
