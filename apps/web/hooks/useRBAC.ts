'use client';

import { useAuth } from '@/components/AuthProvider';

export type Permission = 
  | 'stores.view'
  | 'stores.manage'
  | 'orders.view'
  | 'orders.manage'
  | 'orders.create'
  | 'orders.approve'
  | 'products.view'
  | 'products.manage'
  | 'customers.view'
  | 'customers.manage'
  | 'inventory.view'
  | 'inventory.manage'
  | 'inventory.approve'
  | 'returns.view'
  | 'returns.manage'
  | 'support.view'
  | 'support.manage'
  | 'shipping.manage'
  | 'fulfillment.manage'
  | 'fulfillment.approve';

export type Role = 'ADMIN' | 'CUSTOMER';

export function useRBAC() {
  const { user } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;

    const role = user.role as Role;

    // Admin has all permissions
    if (role === 'ADMIN') return true;

    // Customer permissions
    if (role === 'CUSTOMER') {
      const customerPermissions: Permission[] = [
        'orders.view',
        'orders.create',
        'products.view',
        'customers.view',
        'inventory.view',
        'inventory.manage', // Can manage but needs approval
        'returns.view',
        'support.view',
        'support.manage', // Can manage their own support tickets
      ];
      return customerPermissions.includes(permission);
    }

    return false;
  };

  const hasRole = (role: Role): boolean => {
    return user?.role === role;
  };

  const canView = (resource: string): boolean => {
    return hasPermission(`${resource}.view` as Permission);
  };

  const canManage = (resource: string): boolean => {
    return hasPermission(`${resource}.manage` as Permission);
  };

  const canApprove = (): boolean => {
    return hasPermission('inventory.approve');
  };

  const isAdmin = (): boolean => {
    return hasRole('ADMIN');
  };

  const isCustomer = (): boolean => {
    return hasRole('CUSTOMER');
  };

  return {
    hasPermission,
    hasRole,
    canView,
    canManage,
    canApprove,
    isAdmin,
    isCustomer,
    user,
  };
}