'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContextType, User } from '@/types/auth';
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
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Auth check successful:', data);
          setUser(data.data || data);
        } else {
          console.log('Auth check failed: Invalid response format');
          setUser(null);
        }
      } else {
        console.log('Auth check failed:', response.status);
        setUser(null);
      }
    } catch (error) {
      console.log('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('Starting login process...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Login error data:', errorData);
        throw new Error(errorData.error || errorData.message || 'Login failed');
      }

      const data = await response.json();
      console.log('Login response data:', data);
      
      if (data.requiresTwoFactor) {
        if (data.tempToken) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('temp_2fa_token', data.tempToken);
          }
        }
        throw new Error('2FA_REQUIRED');
      }

      if (!data.success || !data.data) {
        throw new Error('Invalid response from server');
      }

      console.log('Setting user data:', data.data);
      setUser(data.data);
      
      // Set user cookie for middleware
      if (typeof window !== 'undefined') {
        const cookieValue = JSON.stringify(data.data);
        document.cookie = `user=${cookieValue}; path=/; max-age=86400; SameSite=Strict`;
        console.log('User cookie set:', cookieValue);
      }
      
      console.log('Login successful, navigating to dashboard...');
      
      // Navigate immediately without setTimeout
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
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
    
    // Clear user cookie
    if (typeof window !== 'undefined') {
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      console.log('User cookie cleared');
    }
    
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
