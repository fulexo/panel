'use client';

import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';
import ErrorBoundary from './ErrorBoundary';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // If it's the login page, render without protection
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main>
          {children}
        </main>
      </div>
    );
  }

  // For all other pages, require authentication
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <div className="min-h-screen bg-background text-foreground">
        {/* Mobile Header */}
        <div className="lg:hidden bg-card border-b border-border sticky top-0 z-40">
          <div className="mobile-container py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-accent transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <a href="/dashboard" className="font-bold text-xl text-foreground">
              Fulexo
            </a>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block bg-card border-b border-border sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md hover:bg-accent transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <a href="/dashboard" className="font-bold text-xl text-foreground">
                Fulexo
              </a>
            </div>
            
            {/* Search Bar */}
            <form action="/search" className="flex-1 max-w-md mx-8">
              <div className="relative">
                <input 
                  name="q" 
                  placeholder="Search orders, products, customers..." 
                  className="w-full px-4 py-2 pl-10 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground" 
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">{user?.email}</div>
                <div className="text-xs text-muted-foreground">{user?.role?.replace('_', ' ')}</div>
              </div>
              <a 
                href="/profile"
                className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold"
              >
                {user?.email?.charAt(0).toUpperCase()}
              </a>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="transition-all duration-300 ease-in-out lg:ml-80">
          {children}
        </main>
        </div>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}