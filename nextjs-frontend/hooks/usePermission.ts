'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

/**
 * Role hierarchy for FlexCloud
 */
const ROLE_HIERARCHY: Record<string, number> = {
  lga_admin: 100,
  chairman: 100,
  treasurer: 80,
  hod: 60,
  consultant_admin: 50,
  auditor_finance: 40,
  consultant: 30,
  collector: 20,
  business_user: 10,
};

/**
 * Permission definitions by role
 */
const PERMISSIONS: Record<string, string[]> = {
  lga_admin: ['*'], // Full access
  chairman: ['*'], // Full access
  
  treasurer: [
    'view-dashboard', 'view-analytics', 'view-reports', 'export-data',
    'manage-businesses', 'create-business', 'update-business', 'delete-business',
    'manage-invoices', 'create-invoice', 'update-invoice', 'delete-invoice', 'bulk-invoice',
    'manage-tickets', 'create-ticket-batch', 'assign-tickets',
    'manage-closings', 'approve-closing', 'reject-closing',
    'manage-revenue-items', 'manage-revenue-points', 'manage-tariffs',
    'manage-wards', 'manage-departments',
    'manage-consultants', 'manage-collectors', 'assign-collectors',
    'manage-defaulters', 'send-reminders',
    'manage-settings', 'manage-payment-settings', 'manage-sms-settings', 'manage-email-settings',
    'manage-users',
  ],
  
  hod: [
    'view-dashboard', 'view-reports',
    'view-businesses', 'create-business', 'update-business',
    'view-invoices', 'create-invoice', 'update-invoice',
    'view-tickets', 'view-closings',
    'view-consultants', 'view-collectors',
    'view-defaulters',
  ],
  
  consultant_admin: [
    'view-dashboard', 'view-analytics',
    'manage-businesses', 'create-business', 'update-business',
    'manage-invoices', 'create-invoice', 'bulk-invoice',
    'manage-tickets', 'create-ticket-batch', 'assign-tickets',
    'manage-closings', 'approve-closing', 'reject-closing',
    'manage-revenue-points',
    'manage-consultants', 'manage-collectors', 'assign-collectors',
    'manage-defaulters', 'send-reminders',
  ],
  
  auditor_finance: [
    'view-dashboard', 'view-analytics', 'view-reports', 'export-data',
    'view-businesses', 'view-invoices', 'view-tickets', 'view-closings',
    'view-consultants', 'view-collectors', 'view-defaulters',
    'view-audit-logs',
  ],
  
  consultant: [
    'view-dashboard',
    'view-businesses',
    'view-invoices', 'create-invoice',
    'sell-ticket',
    'create-closing', 'submit-closing',
    'use-offline-sync',
    'access-consultant-portal',
  ],
  
  collector: [
    'view-dashboard',
    'view-businesses', 'create-business',
    'view-invoices', 'create-invoice', 'record-payment',
    'sell-ticket',
    'create-closing', 'submit-closing',
    'use-offline-sync',
    'send-reminders',
  ],
  
  business_user: [
    'view-dashboard',
    'view-own-invoices', 'view-own-payments',
    'access-business-portal',
  ],
};

/**
 * Navigation items configuration
 */
export const NAV_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': ['view-dashboard'],
  '/analytics': ['view-analytics'],
  '/reports': ['view-reports'],
  '/businesses': ['view-businesses', 'manage-businesses'],
  '/invoices': ['view-invoices', 'manage-invoices'],
  '/invoices/bulk': ['bulk-invoice'],
  '/tickets': ['view-tickets', 'manage-tickets'],
  '/closings': ['view-closings', 'manage-closings', 'create-closing'],
  '/defaulters': ['view-defaulters', 'manage-defaulters'],
  '/consultants': ['view-consultants', 'manage-consultants'],
  '/collectors': ['view-collectors', 'manage-collectors'],
  '/revenue-items': ['manage-revenue-items'],
  '/revenue-points': ['manage-revenue-points', 'view-revenue-points'],
  '/wards': ['manage-wards'],
  '/departments': ['manage-departments'],
  '/admin/users': ['manage-users'],
  '/admin/roles': ['manage-roles'],
  '/admin/audit-logs': ['view-audit-logs'],
  '/settings': ['manage-settings'],
  '/settings/email': ['manage-email-settings'],
  '/settings/sms': ['manage-sms-settings'],
  '/settings/payment': ['manage-payment-settings'],
  '/offline-sync': ['use-offline-sync'],
  '/business-portal': ['access-business-portal'],
  '/consultant-portal': ['access-consultant-portal'],
};

/**
 * Custom hook for permission checking
 */
export function usePermission() {
  const { user } = useAuth();

  const userRole = user?.role || 'guest';
  const userPermissions = PERMISSIONS[userRole] || [];

  const permissions = useMemo(() => {
    /**
     * Check if user has a specific permission
     */
    const can = (permission: string): boolean => {
      if (!user) return false;
      
      // Super roles have all permissions
      if (userPermissions.includes('*')) return true;
      
      return userPermissions.includes(permission);
    };

    /**
     * Check if user has any of the given permissions
     */
    const canAny = (permissions: string[]): boolean => {
      return permissions.some(p => can(p));
    };

    /**
     * Check if user has all of the given permissions
     */
    const canAll = (permissions: string[]): boolean => {
      return permissions.every(p => can(p));
    };

    /**
     * Check if user can access a specific route
     */
    const canAccessRoute = (route: string): boolean => {
      const requiredPermissions = NAV_PERMISSIONS[route];
      if (!requiredPermissions) return true; // No permissions defined = public
      return canAny(requiredPermissions);
    };

    /**
     * Check if user has higher or equal role level
     */
    const hasRoleLevel = (minLevel: number): boolean => {
      const userLevel = ROLE_HIERARCHY[userRole] || 0;
      return userLevel >= minLevel;
    };

    /**
     * Check if user is a super role
     */
    const isSuperRole = (): boolean => {
      return ['lga_admin', 'chairman'].includes(userRole);
    };

    /**
     * Check if user is admin level (can manage users/settings)
     */
    const isAdmin = (): boolean => {
      return ['lga_admin', 'chairman', 'treasurer'].includes(userRole);
    };

    /**
     * Check if user is field staff
     */
    const isFieldStaff = (): boolean => {
      return ['consultant', 'collector'].includes(userRole);
    };

    /**
     * Check if user is portal user (business or consultant)
     */
    const isPortalUser = (): boolean => {
      return ['business_user', 'consultant'].includes(userRole);
    };

    /**
     * Get filtered navigation items based on permissions
     */
    const getFilteredNav = (navItems: Array<{ href: string; [key: string]: any }>) => {
      return navItems.filter(item => canAccessRoute(item.href));
    };

    return {
      can,
      canAny,
      canAll,
      canAccessRoute,
      hasRoleLevel,
      isSuperRole,
      isAdmin,
      isFieldStaff,
      isPortalUser,
      getFilteredNav,
      userRole,
      userPermissions,
    };
  }, [user, userRole, userPermissions]);

  return permissions;
}

/**
 * Permission Gate Component
 */
export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { can, canAny, canAll } = usePermission();

  let hasAccess = false;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Role Gate Component
 */
export function RoleGate({
  roles,
  fallback = null,
  children,
}: {
  roles: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { userRole } = usePermission();

  if (!roles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default usePermission;
