import { api } from './http';

export const authApi = {
  refresh:   () => api.post('/auth/refresh'),
  getMe:     () => api.get('/users/me'),
  sendOtp:   (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string, latitude?: number, longitude?: number) =>
    api.post('/auth/verify-otp', { phone, otp, latitude, longitude }),
  logout:    (latitude?: number, longitude?: number) =>
    api.post('/auth/logout', { latitude, longitude }),
};
