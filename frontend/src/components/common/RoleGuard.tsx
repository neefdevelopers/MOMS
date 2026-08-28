'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { canAccessRoute } from '@/lib/permissions';
import UnauthorizedPage from '@/app/unauthorized/page';

interface RoleGuardProps {
  children: React.ReactNode;
  routeOverride?: string;
}

export function RoleGuard({ children, routeOverride }: RoleGuardProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const targetPath = routeOverride || pathname;
  const isAllowed = canAccessRoute(user?.role || '', targetPath);

  if (!isAllowed) {
    return <UnauthorizedPage />;
  }

  return <>{children}</>;
}
