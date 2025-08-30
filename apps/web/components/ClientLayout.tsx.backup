'use client';

import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  
  // Login sayfasında navbar gösterme
  const isLoginPage = pathname === '/login';
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {user && !isLoginPage && (
        <div className="w-full bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
            <a href="/dashboard" className="font-semibold text-white">Fulexo</a>
            <form action="/search" className="flex-1 flex items-center gap-2">
              <input name="q" placeholder="Search orders, products, customers..." className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
            </form>
            <a href="/calendar" className="text-gray-300 hover:text-white">Calendar</a>
            <a href="/billing" className="text-gray-300 hover:text-white">Billing</a>
            <a href="/inbound" className="text-gray-300 hover:text-white">Inbound</a>
            <a href="/customers" className="text-gray-300 hover:text-white">Customers</a>
            <a href="/returns" className="text-gray-300 hover:text-white">Returns</a>
            <a href="/support" className="text-gray-300 hover:text-white">Support</a>
            <a href="/tenants" className="text-gray-300 hover:text-white">Tenants</a>
            <button 
              onClick={logout}
              className="text-gray-300 hover:text-white ml-4 px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
