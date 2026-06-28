export interface User {
  id: string;
  phone: string;
  email: string;
  name: string;
  role: string;
  isBlocked: boolean;
  isOnline?: boolean;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
  lastLoginLatitude?: number | null;
  lastLoginLongitude?: number | null;
}
