'use client';

import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDesktopCollapsed?: boolean;
  onDesktopToggle?: () => void;
}

export default function Sidebar({ isOpen, onClose, isDesktopCollapsed = false, onDesktopToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(['main']);

  const navigationItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/orders', label: 'Orders', icon: '📦' },
    { href: '/shipments', label: 'Shipments', icon: '🚚' },
    { href: '/products', label: 'Products', icon: '📱' },
  ];

  const adminItems = [
    { href: '/users', label: 'Users', icon: '👤', roles: ['ADMIN'] },
    { href: '/customers', label: 'Customers', icon: '👥', roles: ['ADMIN'] },
    { href: '/inbound', label: 'Inbound', icon: '📥' },
    { href: '/billing', label: 'Billing', icon: '💳' },
    { href: '/tenants', label: 'Tenants', icon: '🏢', roles: ['ADMIN'] },
    { href: '/stores', label: 'Stores', icon: '🏪', roles: ['ADMIN'] },
    { href: '/settings', label: 'Settings', icon: '⚙️', roles: ['ADMIN'] },
  ];

  const userItems = [
    { href: '/returns', label: 'Returns', icon: '↩️' },
    { href: '/support', label: 'Support', icon: '🆘' },
  ];

  const additionalItems = [
    { href: '/calendar', label: 'Calendar', icon: '📅' },
    { href: '/search', label: 'Search', icon: '🔍' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'badge-error';
      case 'CUSTOMER': return 'badge-primary';
      default: return 'badge-default';
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const renderNavItems = (items: Record<string, unknown>[], _section: string) => {
    return items.map((item) => {
      if (item.roles && !item.roles.includes(user?.role)) return null;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
            isActive(item.href)
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-muted-foreground hover:text-foreground'
          } ${isDesktopCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
          onClick={() => onClose()}
          title={isDesktopCollapsed ? item.label : undefined}
        >
          <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
          {!isDesktopCollapsed && <span className="font-medium">{item.label}</span>}
        </Link>
      );
    });
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-card border-r border-border z-50 transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        ${isDesktopCollapsed ? 'lg:w-16' : 'lg:w-80'}
        w-80
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-6 border-b border-border ${isDesktopCollapsed ? 'lg:p-2' : ''}`}>
            <div className="flex items-center justify-between">
              {!isDesktopCollapsed && (
                <Link href="/dashboard" className="font-bold text-2xl text-foreground">
                  Fulexo
                </Link>
              )}
              {isDesktopCollapsed && (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">F</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                {onDesktopToggle && (
                  <button
                    onClick={onDesktopToggle}
                    className="hidden lg:block p-2 rounded-md hover:bg-accent transition-colors"
                    title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isDesktopCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="lg:hidden p-2 rounded-md hover:bg-accent transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-primary truncate">{user?.email}</div>
                <div className={`badge ${getRoleColor(user?.role || '')} mt-1`}>
                  {user?.role?.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          {!isDesktopCollapsed && (
            <div className="p-4 border-b border-border">
              <form action="/search">
                <div className="relative">
                  <input 
                    name="q" 
                    placeholder="Search..."
                    aria-label="Search" 
                    className="w-full px-4 py-2 pl-10 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground" 
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </form>
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 space-y-6">
              {/* Main Navigation */}
              <div>
                <button
                  onClick={() => toggleSection('main')}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Main</span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${expandedSections.includes('main') ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections.includes('main') && (
                  <div className="mt-2 space-y-1">
                    {renderNavItems(navigationItems, 'main')}
                  </div>
                )}
              </div>

              {/* Admin Navigation */}
              <div>
                <button
                  onClick={() => toggleSection('admin')}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Administration</span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${expandedSections.includes('admin') ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections.includes('admin') && (
                  <div className="mt-2 space-y-1">
                    {renderNavItems(adminItems, 'admin')}
                  </div>
                )}
              </div>

              {/* User Navigation */}
              <div>
                <button
                  onClick={() => toggleSection('user')}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>User Tools</span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${expandedSections.includes('user') ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections.includes('user') && (
                  <div className="mt-2 space-y-1">
                    {renderNavItems(userItems, 'user')}
                  </div>
                )}
              </div>

              {/* Additional Navigation */}
              <div>
                <button
                  onClick={() => toggleSection('additional')}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Tools</span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${expandedSections.includes('additional') ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections.includes('additional') && (
                  <div className="mt-2 space-y-1">
                    {renderNavItems(additionalItems, 'additional')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <button 
              onClick={logout} 
              className="w-full btn btn-ghost justify-start"
            >
              <span className="text-lg">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}