'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  Boxes,
  Calendar,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Package,
  RotateCcw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  User,
  Users,
} from 'lucide-react';

import { useAuth } from './AuthProvider';

import type { User as AuthUser } from '@/types/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDesktopCollapsed?: boolean;
  onDesktopToggle?: () => void;
}

type UserRole = AuthUser['role'];

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

export default function Sidebar({ isOpen, onClose, isDesktopCollapsed = false, onDesktopToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navigationSections: NavigationSection[] = [
    {
      title: 'Overview',
      items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Sales & Customers',
      items: [
        { href: '/orders', label: 'Orders', icon: ShoppingBag },
        { href: '/returns', label: 'Returns', icon: RotateCcw },
        { href: '/customers', label: 'Customers', icon: Users },
        { href: '/cart', label: 'Cart', icon: ShoppingCart },
      ],
    },
    {
      title: 'Operations',
      items: [
        { href: '/fulfillment', label: 'Fulfillment', icon: ClipboardList, roles: ['ADMIN', 'CUSTOMER'] },
        { href: '/shipping', label: 'Shipping', icon: Truck, roles: ['ADMIN', 'CUSTOMER'] },
        { href: '/inventory', label: 'Inventory', icon: Boxes },
        { href: '/calendar', label: 'Calendar', icon: Calendar },
      ],
    },
    {
      title: 'Catalog',
      items: [
        { href: '/products', label: 'Products', icon: Package },
        { href: '/stores', label: user?.role === 'ADMIN' ? 'Stores' : 'My Stores', icon: Store, roles: ['ADMIN', 'CUSTOMER'] },
      ],
    },
    {
      title: 'Insights & Alerts',
      items: [
        { href: '/reports', label: 'Reports', icon: BarChart3 },
        { href: '/notifications', label: 'Notifications', icon: Bell },
        { href: '/support', label: 'Support', icon: HelpCircle },
      ],
    },
    {
      title: 'Account',
      items: [
        { href: '/profile', label: 'Profile', icon: User },
        { href: '/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];


  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };


  const renderNavSections = () =>
    navigationSections.map((section) => {
      const visibleItems = section.items.filter((item) => {
        if (!item.roles || item.roles.length === 0) {
          return true;
        }

        if (!user?.role) {
          return false;
        }

        return item.roles.includes(user.role);
      });
      if (visibleItems.length === 0) return null;

      return (
        <div key={section.title} className="space-y-1">
          {!isDesktopCollapsed && section.title && (
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {section.title}
            </p>
          )}
          {visibleItems.map((item) => {
            const IconComponent = item.icon;
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
                <IconComponent
                  className={`group-hover:scale-110 transition-transform ${isDesktopCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`}
                />
                {!isDesktopCollapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      );
    });


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
        lg:translate-x-0 lg:fixed lg:z-40
        ${isDesktopCollapsed ? 'lg:w-16' : 'lg:w-80'}
        w-80
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-6 border-b border-border ${isDesktopCollapsed ? 'lg:p-4' : ''}`}>
            <div className="flex items-center justify-between">
              {!isDesktopCollapsed && (
                <Link href="/dashboard" className="font-bold text-2xl text-foreground">
                  Fulexo
                </Link>
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



          {/* Navigation */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className={`space-y-6 ${isDesktopCollapsed ? 'lg:p-2' : 'p-4'}`}>
              {renderNavSections()}
            </div>
          </div>

          {/* Footer */}
          <div className={`border-t border-border ${isDesktopCollapsed ? 'lg:p-2' : 'p-4'}`}>
            <button 
              onClick={logout} 
              className={`w-full btn btn-ghost ${isDesktopCollapsed ? 'lg:justify-center lg:px-2' : 'justify-start'}`}
              title={isDesktopCollapsed ? 'Logout' : undefined}
            >
              <LogOut className={`${isDesktopCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
              {!isDesktopCollapsed && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}