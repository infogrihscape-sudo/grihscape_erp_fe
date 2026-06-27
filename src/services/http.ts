import axios from 'axios';
import NProgress from 'nprogress';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.08, trickleSpeed: 200 });

let pendingRequests = 0;
let pendingMutations = 0;

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

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;
let refreshSubscribers: ((token: string) => void)[] = [];
let isRefreshing = false;

export const setAccessToken = (token: string | null) => { accessToken = token; };
export const getAccessToken = () => accessToken;

const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);

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

const subscribeTokenRefresh = (cb: (token: string) => void) => { refreshSubscribers.push(cb); };
const onRefreshed = (token: string) => { refreshSubscribers.map(cb => cb(token)); refreshSubscribers = []; };

api.interceptors.response.use(
  (response: any) => {
    stopProgress((response.config as any)._isMutation ?? false);
    return response;
  },
  async (error: any) => {
    const originalRequest = error.config;
    const isMutation: boolean = originalRequest?._isMutation ?? false;

    if (
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/verify-otp')
    ) {
      console.warn(`[API] ❌ ${originalRequest.url} returned ${error.response?.status}`);
      stopProgress(isMutation);
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
        stopProgress(isMutation);
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        setAccessToken(null);
        stopProgress(isMutation);
        window.dispatchEvent(new Event('auth-session-expired'));
        return Promise.reject(refreshError);
      }
    }

    stopProgress(isMutation);
    return Promise.reject(error);
  }
);

export const BACKEND_BASE: string =
  import.meta.env.VITE_BACKEND_BASE ||
  (import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '') : '');

export const fileUrl = (path: string): string => {
  const sep = path.includes('?') ? '&' : '?';
  return accessToken
    ? `${BACKEND_BASE}${path}${sep}token=${accessToken}`
    : `${BACKEND_BASE}${path}`;
};
