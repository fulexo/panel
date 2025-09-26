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
    console.log('ProtectedRoute - user:', user, 'loading:', loading);
    if (!loading && !user) {
      console.log('ProtectedRoute - No user, redirecting to login');
      // Add a small delay to prevent immediate redirect during login
      setTimeout(() => {
        if (!user) {
          router.push('/login');
        }
      }, 200);
    } else if (!loading && user) {
      console.log('ProtectedRoute - User authenticated, allowing access');
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