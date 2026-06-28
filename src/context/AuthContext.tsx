import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { authApi, setAccessToken } from '../services/api.js';
import { GEO_CONFIG, getDistanceMeters } from '../config/geo.js';
import type { User } from '../types/user.js';

export type { User };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sendOtp: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, otp: string, latitude?: number, longitude?: number) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const geoWatchIdRef = useRef<number | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Attempt silent refresh on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await authApi.refresh();
        const token = response.data.accessToken;
        setAccessToken(token);

        const meResponse = await authApi.getMe();
        setUser(meResponse.data.user);
        setIsAuthenticated(true);
        startGeoWatch(logout, meResponse.data.user?.role);
      } catch {
        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen to session expiration events from API interceptor — Super Admin is immune
    const handleSessionExpired = () => {
      if (userRef.current?.role === 'Super Admin') return;
      setUser(null);
      setIsAuthenticated(false);
      setAccessToken(null);
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth-session-expired', handleSessionExpired);
    };
  }, []);

  // ── Geo-fence watch ──────────────────────────────────────────────────────────
  const stopGeoWatch = () => {
    if (geoWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
      geoWatchIdRef.current = null;
    }
  };

  const startGeoWatch = (doLogout: () => Promise<void>, userRole?: string) => {
    if (!GEO_CONFIG.enabled) return;
    if (userRole === 'Super Admin') return;
    if (!navigator.geolocation) return;

    stopGeoWatch();
    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const dist = getDistanceMeters(latitude, longitude, GEO_CONFIG.officeLat, GEO_CONFIG.officeLng);
        if (dist > GEO_CONFIG.radiusMeters) {
          doLogout();
        }
      },
      () => { /* position errors are non-fatal */ },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
  };

  const sendOtp = async (phone: string) => {
    try {
      const response = await authApi.sendOtp(phone);
      return { success: true, message: response.data.message };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send OTP.');
    }
  };

  const verifyOtp = async (phone: string, otp: string, latitude?: number, longitude?: number) => {
    try {
      const response = await authApi.verifyOtp(phone, otp, latitude, longitude);
      const { accessToken: token, user: userData } = response.data;

      setAccessToken(token);
      setUser(userData);
      setIsAuthenticated(true);
      startGeoWatch(logout, userData?.role);

      return { success: true, message: 'Logged in successfully.' };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to verify OTP.');
    }
  };

  const logout = async () => {
    stopGeoWatch();

    const getPosition = (): Promise<GeolocationPosition | null> =>
      new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          () => resolve(null),
          { timeout: 5000, maximumAge: 60000 },
        );
      });

    try {
      const position = await getPosition();
      await authApi.logout(position?.coords.latitude, position?.coords.longitude);
    } catch {
      // swallow — logout must always clear local state
    } finally {
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        sendOtp,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
