'use client';

import { ReactNode } from 'react';
import { useRBAC, Permission } from '@/hooks/useRBAC';

interface ProtectedComponentProps {
  children: ReactNode;
  permission?: Permission;
  role?: 'ADMIN' | 'CUSTOMER';
  fallback?: ReactNode;
  requireAll?: boolean;
}

export default function ProtectedComponent({
  children,
  permission,
  role,
  fallback = null,
  requireAll = false,
}: ProtectedComponentProps) {
  const { hasPermission, hasRole } = useRBAC();

  // If no restrictions, show children
  if (!permission && !role) {
    return <>{children}</>;
  }

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  }

  if (role) {
    const roleAccess = hasRole(role);
    if (requireAll) {
      hasAccess = hasAccess && roleAccess;
    } else {
      hasAccess = hasAccess || roleAccess;
    }
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}