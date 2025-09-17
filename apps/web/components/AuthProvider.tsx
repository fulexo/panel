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
  }, []);

  const checkAuth = async () => {
    try {
      // Since tokens are now in httpOnly cookies, we need to make a request to check auth
      // The server will automatically include the httpOnly cookies
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}/api/auth/me`, {
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
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }

    const data = await response.json();
    
    if (data.requiresTwoFactor) {
      // tempToken'ı güvenli şekilde sakla
      if (data.tempToken) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('temp_2fa_token', data.tempToken);
        }
      }
      throw new Error('2FA_REQUIRED');
    }

    // Tokens are now set as httpOnly cookies by the server
    // We just need to set the user data locally
    setUser(data.user);
    router.push('/dashboard');
  };

  const logout = async () => {
    // Call backend logout to invalidate session
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Ignore logout errors
    }
    
    await AuthUtils.clearTokens();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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
