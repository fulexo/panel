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

    // Customer permissions (includes store management)
    if (role === 'CUSTOMER') {
      const customerPermissions: Permission[] = [
        // Store management permissions
        'stores.view',
        'stores.manage', // Can manage their own stores
        // Order management permissions
        'orders.view',
        'orders.create',
        'orders.manage', // Can manage their own store orders
        'orders.approve', // Can approve orders for their store
        // Product management permissions
        'products.view',
        'products.manage', // Can manage their own store products
        // Customer management permissions
        'customers.view',
        'customers.manage', // Can manage their own store customers
        // Inventory management permissions
        'inventory.view',
        'inventory.manage', // Can manage their own store inventory
        'inventory.approve', // Can approve inventory changes for their store
        // Returns management permissions
        'returns.view',
        'returns.manage', // Can manage their own store returns
        // Support management permissions
        'support.view',
        'support.manage', // Can manage their own support tickets
        // Shipping management permissions
        'shipping.manage', // Can manage their own store shipping
        // Fulfillment management permissions
        'fulfillment.manage', // Can manage their own store fulfillment
        'fulfillment.approve', // Can approve fulfillment for their store
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

  // Store access control
  const canAccessStore = (storeId: string): boolean => {
    if (!user) return false;
    
    // Admin can access all stores
    if (isAdmin()) return true;
    
    // Customer can only access their own stores
    if (isCustomer()) {
      return user.stores?.some((store: any) => store.id === storeId) || false;
    }
    
    return false;
  };

  // Check if user can manage a specific store
  const canManageStore = (storeId: string): boolean => {
    return canAccessStore(storeId) && hasPermission('stores.manage');
  };

  // Check if user can view all stores (admin only)
  const canViewAllStores = (): boolean => {
    return isAdmin();
  };

  // Check if user can manage all stores (admin only)
  const canManageAllStores = (): boolean => {
    return isAdmin();
  };

  return {
    hasPermission,
    hasRole,
    canView,
    canManage,
    canApprove,
    isAdmin,
    isCustomer,
    canAccessStore,
    canManageStore,
    canViewAllStores,
    canManageAllStores,
    user,
  };
}