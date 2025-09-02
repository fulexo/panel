'use client';

import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {user && !isLoginPage && (
        <>
          {/* Top Header */}
          <div className="w-full bg-gray-800 border-b border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
              <a href="/dashboard" className="font-semibold text-white text-xl">Fulexo</a>
              <form action="/search" className="flex-1 flex items-center gap-2">
                <input 
                  name="q" 
                  placeholder="Search orders, products, customers..." 
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded" 
                />
              </form>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-300">{user.email}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  user.role === 'FULEXO_ADMIN' ? 'bg-red-600' :
                  user.role === 'FULEXO_STAFF' ? 'bg-orange-600' :
                  user.role === 'CUSTOMER_ADMIN' ? 'bg-blue-600' :
                  'bg-gray-600'
                }`}>
                  {user.role}
                </span>
                <button 
                  onClick={logout} 
                  className="text-gray-300 hover:text-white px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-8">
                <a 
                  href="/dashboard" 
                  className={`py-3 px-1 border-b-2 ${
                    pathname === '/dashboard' 
                      ? 'text-white border-blue-500' 
                      : 'text-gray-300 hover:text-white border-transparent'
                  }`}
                >
                  Dashboard
                </a>
                <a 
                  href="/orders" 
                  className={`py-3 px-1 border-b-2 ${
                    pathname.startsWith('/orders') 
                      ? 'text-white border-blue-500' 
                      : 'text-gray-300 hover:text-white border-transparent'
                  }`}
                >
                  Orders
                </a>
                <a 
                  href="/shipments" 
                  className={`py-3 px-1 border-b-2 ${
                    pathname.startsWith('/shipments') 
                      ? 'text-white border-blue-500' 
                      : 'text-gray-300 hover:text-white border-transparent'
                  }`}
                >
                  Shipments
                </a>
                <a 
                  href="/products" 
                  className={`py-3 px-1 border-b-2 ${
                    pathname.startsWith('/products') 
                      ? 'text-white border-blue-500' 
                      : 'text-gray-300 hover:text-white border-transparent'
                  }`}
                >
                  Products
                </a>
                <a 
                  href="/customers" 
                  className={`py-3 px-1 border-b-2 ${
                    pathname.startsWith('/customers') 
                      ? 'text-white border-blue-500' 
                      : 'text-gray-300 hover:text-white border-transparent'
                  }`}
                >
                  Customers
                </a>

                {/* Users - Admin/Staff/Customer Admin only */}
                {['FULEXO_ADMIN', 'FULEXO_STAFF', 'CUSTOMER_ADMIN'].includes(user.role) && (
                  <a 
                    href="/users" 
                    className={`py-3 px-1 border-b-2 ${
                      pathname.startsWith('/users') 
                        ? 'text-white border-blue-500' 
                        : 'text-gray-300 hover:text-white border-transparent'
                    }`}
                  >
                    Users
                  </a>
                )}

                {/* Advanced Features */}
                <a 
                  href="/inbound" 
                  className={`py-3 px-1 border-b-2 ${
                    pathname.startsWith('/inbound') 
                      ? 'text-white border-blue-500' 
                      : 'text-gray-300 hover:text-white border-transparent'
                  }`}
                >
                  Inbound
                </a>
                <a 
                  href="/returns" 
                  className={`py-3 px-1 border-b-2 ${
                    pathname.startsWith('/returns') 
                      ? 'text-white border-blue-500' 
                      : 'text-gray-300 hover:text-white border-transparent'
                  }`}
                >
                  Returns
                </a>
                <a 
                  href="/billing" 
                  className={`py-3 px-1 border-b-2 ${
                    pathname.startsWith('/billing') 
                      ? 'text-white border-blue-500' 
                      : 'text-gray-300 hover:text-white border-transparent'
                  }`}
                >
                  Billing
                </a>

                {/* Admin Only Features */}
                {['FULEXO_ADMIN', 'FULEXO_STAFF'].includes(user.role) && (
                  <>
                    <a 
                      href="/tenants" 
                      className={`py-3 px-1 border-b-2 ${
                        pathname.startsWith('/tenants') 
                          ? 'text-white border-blue-500' 
                          : 'text-gray-300 hover:text-white border-transparent'
                      }`}
                    >
                      Tenants
                    </a>
                    <a 
                      href="/stores" 
                      className={`py-3 px-1 border-b-2 ${
                        pathname.startsWith('/stores') 
                          ? 'text-white border-blue-500' 
                          : 'text-gray-300 hover:text-white border-transparent'
                      }`}
                    >
                      Stores
                    </a>
                    <a 
                      href="/settings" 
                      className={`py-3 px-1 border-b-2 ${
                        pathname.startsWith('/settings') 
                          ? 'text-white border-blue-500' 
                          : 'text-gray-300 hover:text-white border-transparent'
                      }`}
                    >
                      Settings
                    </a>
                  </>
                )}

                {/* Support - Always visible */}
                <a 
                  href="/support" 
                  className={`py-3 px-1 border-b-2 ${
                    pathname.startsWith('/support') 
                      ? 'text-white border-blue-500' 
                      : 'text-gray-300 hover:text-white border-transparent'
                  }`}
                >
                  Support
                </a>
              </div>
            </div>
          </nav>
        </>
      )}
      {children}
    </>
  );
}
