'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Calendar,
  Film,
  FileText,
  Palette,
  CheckSquare,
  Building2,
  BookmarkCheck,
  Package,
  Users,
  Camera,
  BarChart3,
  Activity,
  Settings,
  CheckCircle2,
  UserCheck,
  MessageSquare,
  Archive,
  Tv,
  Shield,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: ('MEDIA_MANAGER' | 'TECHNICAL_MANAGER' | 'STAFF')[];
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        name: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Media Calendar',
        href: '/calendar',
        icon: Calendar,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
    ],
  },
  {
    title: 'Production',
    items: [
      {
        name: 'Projects',
        href: '/projects',
        icon: Film,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Scripts',
        href: '/scripts',
        icon: FileText,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Graphic Requirements',
        href: '/graphic-reqs',
        icon: Palette,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Tasks',
        href: '/tasks',
        icon: CheckSquare,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Approvals',
        href: '/approvals',
        icon: CheckCircle2,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'],
      },
    ],
  },
  {
    title: 'Operations & Assets',
    items: [
      {
        name: 'Clients',
        href: '/clients',
        icon: Building2,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Brands',
        href: '/brands',
        icon: BookmarkCheck,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Products',
        href: '/products',
        icon: Package,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Equipment',
        href: '/equipment',
        icon: Camera,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
    ],
  },
  {
    title: 'Workforce & Logs',
    items: [
      {
        name: 'Staff & Roster',
        href: '/staff',
        icon: Users,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Attendance',
        href: '/attendance',
        icon: UserCheck,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Communication',
        href: '/communication',
        icon: MessageSquare,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Reports & Analytics',
        href: '/reports',
        icon: BarChart3,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'],
      },
      {
        name: 'Activity Center',
        href: '/activity',
        icon: Activity,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF'],
      },
      {
        name: 'Settings & Formulas',
        href: '/settings',
        icon: Settings,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'],
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [optimisticPath, setOptimisticPath] = useState<string>(pathname);

  const userRole = (user?.role || 'STAFF') as 'MEDIA_MANAGER' | 'TECHNICAL_MANAGER' | 'STAFF';

  // Sync optimistic path when route changes
  useEffect(() => {
    setOptimisticPath(pathname);
  }, [pathname]);

  // Pre-fetch all sidebar navigation routes in the background on mount
  useEffect(() => {
    NAVIGATION_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        if (!item.roles || item.roles.includes(userRole)) {
          router.prefetch(item.href);
        }
      });
    });
  }, [router, userRole]);

  const activePath = optimisticPath || pathname;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full shrink-0 z-30 select-none">
      {/* Brand Logo */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/30">
          <Tv className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-base text-white leading-tight tracking-wider flex items-center gap-1.5">
            MOMS
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded font-normal">
              PRO
            </span>
          </h1>
          <p className="text-[11px] text-gray-400 font-medium truncate">Media Operations Suite</p>
        </div>
      </div>

      {/* Role Badge Indicator */}
      <div className="px-4 py-2.5 bg-gray-900/60 border-b border-border flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <Shield className="w-3 h-3 text-gray-400" />
          Access Level
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase border tracking-wider ${
            userRole === 'MEDIA_MANAGER'
              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
              : userRole === 'TECHNICAL_MANAGER'
              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          }`}
        >
          {userRole.replace('_', ' ')}
        </span>
      </div>

      {/* Primary Navigation Sections */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin scrollbar-thumb-gray-800">
        {NAVIGATION_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(userRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {section.title}
              </div>

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activePath === item.href ||
                  (item.href !== '/' && activePath.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={() => setOptimisticPath(item.href)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-bold shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 transition-colors shrink-0 ${
                          isActive
                            ? 'text-blue-400'
                            : 'text-gray-400 group-hover:text-gray-200'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Info footer */}
      {user && (
        <div className="p-3 border-t border-border bg-gray-900/60 flex items-center gap-3">
          <div className="relative">
            <img
              src={
                user.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
              }
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-gray-700"
            />
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute bottom-0 right-0 border border-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{user.email || user.role}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
