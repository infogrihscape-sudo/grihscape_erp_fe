import React, { createContext, useState, useEffect, useContext } from 'react';
import { authApi, setAccessToken } from '../services/api.js';

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

  // Attempt silent refresh on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await authApi.refresh();
        const token = response.data.accessToken;
        setAccessToken(token);

        // Fetch user info
        const meResponse = await authApi.getMe();
        setUser(meResponse.data.user);
        setIsAuthenticated(true);
      } catch (error) {
        // Silent catch: User is not logged in / no refresh token exists
        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen to session expiration events from API interceptor
    const handleSessionExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
      setAccessToken(null);
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth-session-expired', handleSessionExpired);
    };
  }, []);

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
      
      return { success: true, message: 'Logged in successfully.' };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to verify OTP.');
    }
  };

  const logout = async () => {
    const getPosition = (): Promise<GeolocationPosition | null> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
        } else {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { timeout: 5000, maximumAge: 60000 }
          );
        }
      });
    };

    try {
      const position = await getPosition();
      await authApi.logout(position?.coords.latitude, position?.coords.longitude);
    } catch (error) {
      console.error('Logout request failed', error);
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
