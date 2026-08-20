'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
  onClick?: () => void;
  isCurrent?: boolean;
}

interface BreadcrumbsContextType {
  customCrumbs: BreadcrumbItem[] | null;
  setBreadcrumbs: (crumbs: BreadcrumbItem[] | null) => void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContextType>({
  customCrumbs: null,
  setBreadcrumbs: () => {},
});

// Friendly labels for top-level path segments
const ROUTE_LABELS: Record<string, string> = {
  calendar: 'Media Calendar',
  projects: 'Projects',
  scripts: 'Scripts',
  'graphic-reqs': 'Graphic Requirements',
  tasks: 'Tasks',
  clients: 'Clients',
  brands: 'Brands',
  products: 'Products',
  staff: 'Staff',
  equipment: 'Equipment',
  approvals: 'Approvals',
  attendance: 'Attendance',
  communication: 'Communication',
  reports: 'Reports',
  activity: 'Activity Center',
  archive: 'Archive',
  settings: 'Settings',
};

export function BreadcrumbsProvider({ children }: { children: React.ReactNode }) {
  const [customCrumbs, setCustomCrumbs] = useState<BreadcrumbItem[] | null>(null);
  const pathname = usePathname();

  // Reset custom crumbs on route change
  useEffect(() => {
    setCustomCrumbs(null);
  }, [pathname]);

  return (
    <BreadcrumbsContext.Provider
      value={{
        customCrumbs,
        setBreadcrumbs: setCustomCrumbs,
      }}
    >
      {children}
    </BreadcrumbsContext.Provider>
  );
}

export function useBreadcrumbs() {
  return useContext(BreadcrumbsContext);
}

export function getAutoBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      href: '/',
    },
  ];

  if (!pathname || pathname === '/') {
    items[0].isCurrent = true;
    return items;
  }

  const segments = pathname.split('/').filter(Boolean);
  let currentPath = '';

  segments.forEach((seg, index) => {
    currentPath += `/${seg}`;
    const isLast = index === segments.length - 1;
    const friendlyLabel = ROUTE_LABELS[seg] || seg.toUpperCase();

    items.push({
      label: friendlyLabel,
      href: isLast ? undefined : currentPath,
      isCurrent: isLast,
    });
  });

  return items;
}
