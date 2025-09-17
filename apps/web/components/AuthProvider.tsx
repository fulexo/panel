'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContextType, User, LoginResponse } from '@/types/auth';
import { ApiResponse } from '@/types/api';
import { AuthUtils } from '@/lib/auth-utils';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []); // Empty dependency array is correct here

  const checkAuth = async () => {
    try {
      // Use the frontend API route which will forward to backend
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData: ApiResponse<User> = await response.json();
        setUser(userData.data);
      } else {
        // If auth fails, clear any local data and redirect to login
        await AuthUtils.clearTokens();
        setUser(null);
      }
    } catch (error) {
      // Log error to monitoring service instead of console
      if (typeof window !== 'undefined') {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'auth_check_failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            url: window.location.href,
          }),
        }).catch(() => {}); // Silent fail for error logging
      }
      await AuthUtils.clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      if (data.requiresTwoFactor) {
        // tempToken'ı güvenli şekilde sakla - localStorage kullan (2FA sayfası localStorage'dan okuyor)
        if (data.tempToken) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('temp_2fa_token', data.tempToken);
          }
        }
        throw new Error('2FA_REQUIRED');
      }

      // Tokens are now set as httpOnly cookies by the server
      // We just need to set the user data locally
      setUser(data.data);
      router.push('/dashboard');
    } catch (error) {
      // Log error to monitoring service
      if (typeof window !== 'undefined') {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'login_error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            url: window.location.href,
          }),
        }).catch(() => {}); // Silent fail for error logging
      }
      throw error;
    }
  };

  const logout = async () => {
    // Call backend logout to invalidate session
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Log logout errors for debugging but don't show to user
      if (typeof window !== 'undefined') {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'logout_error',
            message: error instanceof Error ? error.message : 'Unknown logout error',
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {}); // Silent fail for error logging
      }
    }
    
    await AuthUtils.clearTokens();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
