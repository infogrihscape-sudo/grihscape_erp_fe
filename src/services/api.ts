import axios from 'axios';
import NProgress from 'nprogress';

const API_BASE_URL = 'http://localhost:5000/api';

// ── NProgress configuration ──────────────────────────────────────────────────
NProgress.configure({
  showSpinner: false,   // hide the spinner; keep only the bar
  speed: 400,
  minimum: 0.08,
  trickleSpeed: 200,
});

// Track pending requests so the bar stays visible until ALL are done
let pendingRequests = 0;

const dispatchLoadingEvent = (active: boolean) => {
  window.dispatchEvent(new CustomEvent('api-loading', { detail: { active } }));
};

const startProgress = () => {
  if (pendingRequests === 0) dispatchLoadingEvent(true);
  pendingRequests++;
  NProgress.start();
};

const stopProgress = () => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  if (pendingRequests === 0) {
    NProgress.done();
    dispatchLoadingEvent(false);
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

// ── Request interceptor — attach token + start progress bar ──────────────────
api.interceptors.request.use(
  (config) => {
    startProgress();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: unknown) => {
    stopProgress();
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
    stopProgress();
    return response;
  },
  async (error: any) => {
    const originalRequest = error.config;

    // Avoid infinite loop on /auth/refresh or /auth/verify-otp
    if (
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/verify-otp')
    ) {
      stopProgress();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
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

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.accessToken;
        setAccessToken(newAccessToken);
        isRefreshing = false;
        onRefreshed(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        stopProgress();
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        setAccessToken(null);
        stopProgress();
        // Clear active session in window if refresh token expired
        window.dispatchEvent(new Event('auth-session-expired'));
        return Promise.reject(refreshError);
      }
    }

    stopProgress();
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
};

export const leadApi = {
  getLeads: (search?: string) => api.get('/leads', { params: { search } }),
  createLead: (data: any) => api.post('/leads', data),
  bulkUploadLeads: (leads: any[]) => api.post('/leads/bulk', { leads }),
  validateLeads: (phones: string[]) => api.post('/leads/validate', { phones }),
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

// Backend base URL (without /api) for building static file links
export const BACKEND_BASE = 'http://localhost:5000';

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

