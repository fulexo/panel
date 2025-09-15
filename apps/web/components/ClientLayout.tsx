'use client';

import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/orders', label: 'Orders', icon: '📦' },
    { href: '/shipments', label: 'Shipments', icon: '🚚' },
    { href: '/products', label: 'Products', icon: '📱' },
    { href: '/customers', label: 'Customers', icon: '👥' },
  ];

  const adminItems = [
    { href: '/users', label: 'Users', icon: '👤', roles: ['FULEXO_ADMIN', 'FULEXO_STAFF', 'CUSTOMER_ADMIN'] },
    { href: '/inbound', label: 'Inbound', icon: '📥' },
    { href: '/returns', label: 'Returns', icon: '↩️' },
    { href: '/billing', label: 'Billing', icon: '💳' },
    { href: '/tenants', label: 'Tenants', icon: '🏢', roles: ['FULEXO_ADMIN', 'FULEXO_STAFF'] },
    { href: '/stores', label: 'Stores', icon: '🏪', roles: ['FULEXO_ADMIN', 'FULEXO_STAFF'] },
    { href: '/settings', label: 'Settings', icon: '⚙️', roles: ['FULEXO_ADMIN', 'FULEXO_STAFF'] },
    { href: '/support', label: 'Support', icon: '🆘' },
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'FULEXO_ADMIN': return 'bg-red-600';
      case 'FULEXO_STAFF': return 'bg-orange-600';
      case 'CUSTOMER_ADMIN': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {user && !isLoginPage && (
        <>
          {/* Mobile Header */}
          <div className="lg:hidden bg-card border-b border-border">
            <div className="mobile-container py-3 flex items-center justify-between">
              <a href="/dashboard" className="font-bold text-xl text-foreground">
                Fulexo
              </a>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md hover:bg-accent transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block bg-card border-b border-border">
            <div className="max-w-7xl mx-auto mobile-container py-3">
              <div className="flex items-center gap-4">
                <a href="/dashboard" className="font-bold text-xl text-foreground">
                  Fulexo
                </a>
                
                {/* Search Bar */}
                <form action="/search" className="flex-1 max-w-md">
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
                    <div className="text-sm font-medium text-foreground">{user.email}</div>
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)} text-white`}>
                      {user.role.replace('_', ' ')}
                    </div>
                  </div>
                  <button 
                    onClick={logout} 
                    className="px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors btn-animate"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-card border-b border-border animate-slide-down">
              <div className="mobile-container py-4 space-y-2">
                {/* User Info */}
                <div className="flex items-center justify-between p-3 bg-accent rounded-lg mb-4">
                  <div>
                    <div className="font-medium text-foreground">{user.email}</div>
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)} text-white mt-1`}>
                      {user.role.replace('_', ' ')}
                    </div>
                  </div>
                  <button 
                    onClick={logout} 
                    className="px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors btn-animate"
                  >
                    Logout
                  </button>
                </div>

                {/* Search */}
                <form action="/search" className="mb-4">
                  <input 
                    name="q" 
                    placeholder="Search..." 
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground" 
                  />
                </form>

                {/* Navigation Links */}
                <div className="space-y-1">
                  {navigationItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </a>
                  ))}
                  
                  {adminItems.map((item) => {
                    if (item.roles && !item.roles.includes(user.role)) return null;
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive(item.href)
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden lg:block bg-card border-b border-border">
            <div className="max-w-7xl mx-auto mobile-container">
              <div className="flex space-x-1 overflow-x-auto custom-scrollbar">
                {navigationItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
                      isActive(item.href)
                        ? 'text-primary border-primary'
                        : 'text-muted-foreground hover:text-foreground border-transparent hover:border-muted-foreground'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </a>
                ))}
                
                {adminItems.map((item) => {
                  if (item.roles && !item.roles.includes(user.role)) return null;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
                        isActive(item.href)
                          ? 'text-primary border-primary'
                          : 'text-muted-foreground hover:text-foreground border-transparent hover:border-muted-foreground'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>
        </>
      )}
      
      {/* Main Content */}
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  );
}
