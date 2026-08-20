'use client';

import { useMemo } from 'react';
import { useAuth } from './auth-context';
import {
  Role,
  ModuleType,
  PermissionType,
  ROLE_PERMISSION_MATRIX,
  MODULE_SUPPORTED_PERMISSIONS,
} from './permissions';

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role as Role) || 'STAFF';

  const userRolePermissions = useMemo(() => {
    return ROLE_PERMISSION_MATRIX[role] || ROLE_PERMISSION_MATRIX['STAFF'];
  }, [role]);

  const can = (module: ModuleType, permission: PermissionType): boolean => {
    // Check if module implements this permission
    const supported = MODULE_SUPPORTED_PERMISSIONS[module] || [];
    if (!supported.includes(permission)) {
      return false;
    }

    const permissions = userRolePermissions[module] || [];
    return permissions.includes(permission);
  };

  const canAny = (module: ModuleType, permissions: PermissionType[]): boolean => {
    return permissions.some((p) => can(module, p));
  };

  const canAll = (module: ModuleType, permissions: PermissionType[]): boolean => {
    return permissions.every((p) => can(module, p));
  };

  const getModulePermissions = (module: ModuleType): PermissionType[] => {
    return userRolePermissions[module] || [];
  };

  const isModuleSupported = (module: ModuleType, permission: PermissionType): boolean => {
    return (MODULE_SUPPORTED_PERMISSIONS[module] || []).includes(permission);
  };

  return {
    role,
    userRolePermissions,
    can,
    canAny,
    canAll,
    getModulePermissions,
    isModuleSupported,
  };
}
