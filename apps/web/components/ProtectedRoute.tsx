'use client';

import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.log('ProtectedRoute check');
    }
    if (!loading && !user) {
      // Add a small delay to prevent immediate redirect during login
      setTimeout(() => {
        if (!user) {
          router.push('/login');
        }
      }, 200);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-lg text-foreground">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}