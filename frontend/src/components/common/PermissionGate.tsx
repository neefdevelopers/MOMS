'use client';

import React from 'react';
import { usePermissions } from '@/lib/usePermissions';
import { ModuleType, PermissionType } from '@/lib/permissions';

export interface PermissionGateProps {
  module: ModuleType;
  permission: PermissionType;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  module,
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can } = usePermissions();

  if (!can(module, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
