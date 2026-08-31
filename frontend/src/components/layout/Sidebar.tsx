'use client';

import React, { useEffect, useState, useTransition } from 'react';
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
  Settings,
  MessageSquare,
  RotateCcw,
  CheckCircle2,
  UserCheck,
  Tv,
  Shield,
  Loader2,
  PlusCircle,
  Activity,
  Wrench,
  AlertTriangle,
  History,
  FileBarChart,
  CalendarCheck,
} from 'lucide-react';

export type AppRole = 'MEDIA_MANAGER' | 'TECHNICAL_MANAGER' | 'STAFF' | 'SOCIAL_MEDIA_MANAGER' | 'MARKETING_MANAGER';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: AppRole[];
  mediaName?: string;
  staffName?: string;
  techName?: string;
  smmName?: string;
  clientName?: string;
  badge?: string;
}

export interface NavSection {
  title: string;
  roles?: AppRole[];
  items: NavItem[];
}

export const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        name: 'Dashboard',
        staffName: 'My Dashboard',
        techName: 'Technical Dashboard',
        smmName: 'Social Media Dashboard',
        clientName: 'Marketing Manager Portal',
        href: '/',
        icon: LayoutDashboard,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF', 'SOCIAL_MEDIA_MANAGER', 'MARKETING_MANAGER'],
      },
      {
        name: 'Event Approval Session',
        clientName: 'Event Approval Session',
        href: '/client-review',
        icon: CheckCircle2,
        roles: ['MARKETING_MANAGER'],
      },
      {
        name: 'Script Approvals Session',
        clientName: 'Script Approvals Session',
        href: '/scripts?status=PENDING_MARKETING_APPROVAL',
        icon: FileText,
        roles: ['MARKETING_MANAGER'],
      },
      {
        name: 'Media Calendar',
        staffName: 'My Calendar Work',
        techName: 'Technical Calendar',
        smmName: 'Media Calendar',
        clientName: 'Calendar Schedule',
        href: '/calendar',
        icon: Calendar,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF', 'SOCIAL_MEDIA_MANAGER', 'MARKETING_MANAGER'],
      },
    ],
  },
  {
    title: 'Production & Workflows',
    items: [
      {
        name: 'Projects',
        staffName: 'Assigned Projects',
        techName: 'Technical Projects',
        smmName: 'Production Projects',
        clientName: 'Projects Overview',
        href: '/projects',
        icon: Film,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF', 'SOCIAL_MEDIA_MANAGER', 'MARKETING_MANAGER'],
      },
      {
        name: 'Scripts',
        smmName: 'Content Scripts',
        clientName: 'Production Scripts',
        href: '/scripts',
        icon: FileText,
        roles: ['MEDIA_MANAGER', 'SOCIAL_MEDIA_MANAGER', 'MARKETING_MANAGER'],
      },
      {
        name: 'Graphic Requirements',
        staffName: 'Assigned Graphic Reqs',
        techName: 'Technical Graphic Reqs',
        smmName: 'Graphic Requirements',
        clientName: 'Graphic Requirements',
        href: '/graphic-reqs',
        icon: Palette,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF', 'SOCIAL_MEDIA_MANAGER', 'MARKETING_MANAGER'],
      },
      {
        name: 'Tasks',
        staffName: 'My Tasks',
        techName: 'Technical Tasks',
        smmName: 'My Tasks',
        clientName: 'Operational Tasks',
        href: '/tasks',
        icon: CheckSquare,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF', 'SOCIAL_MEDIA_MANAGER', 'MARKETING_MANAGER'],
      },
      {
        name: 'Internal Communication',
        techName: 'Technical Communication',
        staffName: 'My Communication',
        smmName: 'My Communication',
        clientName: 'Client Communication',
        href: '/communication',
        icon: MessageSquare,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF', 'SOCIAL_MEDIA_MANAGER', 'MARKETING_MANAGER'],
      },
      {
        name: 'Technical Review',
        techName: 'Technical Review',
        href: '/approvals',
        icon: CheckCircle2,
        roles: ['TECHNICAL_MANAGER'],
      },
    ],
  },
  {
    title: 'Equipment Management',
    roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'],
    items: [
      {
        name: 'Equipment Dashboard',
        href: '/equipment/dashboard',
        icon: LayoutDashboard,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'],
      },
      {
        name: 'All Equipment',
        href: '/equipment',
        icon: Camera,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'],
      },
      {
        name: 'Add Equipment',
        href: '/equipment/create',
        icon: PlusCircle,
        roles: ['MEDIA_MANAGER'],
      },
      {
        name: 'Equipment Monitoring',
        href: '/equipment/monitoring',
        icon: Activity,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'],
      },
      {
        name: 'Reservations',
        href: '/equipment/reservations',
        icon: CalendarCheck,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'],
      },
      {
        name: 'Maintenance',
        href: '/equipment/maintenance',
        icon: Wrench,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'],
      },
      {
        name: 'Damage',
        href: '/equipment/damage',
        icon: AlertTriangle,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'],
      },
      {
        name: 'Equipment History',
        href: '/equipment/history',
        icon: History,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'],
      },
      {
        name: 'Equipment Reports',
        href: '/equipment/reports',
        icon: FileBarChart,
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
        roles: ['MARKETING_MANAGER', 'MEDIA_MANAGER'],
      },
      {
        name: 'Brands',
        href: '/brands',
        icon: BookmarkCheck,
        roles: ['MARKETING_MANAGER', 'MEDIA_MANAGER'],
      },
      {
        name: 'Products',
        href: '/products',
        icon: Package,
        roles: ['MARKETING_MANAGER', 'MEDIA_MANAGER'],
      },
      {
        name: 'My Equipment',
        href: '/equipment/my',
        icon: Camera,
        roles: ['STAFF', 'SOCIAL_MEDIA_MANAGER'],
      },
      {
        name: 'Attendance',
        staffName: 'My Attendance',
        smmName: 'My Attendance',
        href: '/attendance',
        icon: UserCheck,
        roles: ['MEDIA_MANAGER', 'STAFF', 'SOCIAL_MEDIA_MANAGER'],
      },
    ],
  },
  {
    title: 'Management & Analytics',
    items: [
      {
        name: 'Staff Management',
        href: '/staff',
        icon: Users,
        roles: ['MEDIA_MANAGER'],
      },
      {
        name: 'Reports & Analytics',
        staffName: 'My Reports',
        techName: 'Technical Reports',
        clientName: 'Approval Reports',
        href: '/reports',
        icon: BarChart3,
        roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER', 'STAFF', 'MARKETING_MANAGER'],
      },
      {
        name: 'Settings & Formulas',
        href: '/settings',
        icon: Settings,
        roles: ['MEDIA_MANAGER'],
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [optimisticPath, setOptimisticPath] = useState<string>(pathname);
  const [isPending, startTransition] = useTransition();

  const userRole = (user?.role || 'STAFF') as AppRole;

  useEffect(() => {
    setOptimisticPath(pathname);
  }, [pathname]);

  const activePath = optimisticPath || pathname;

  const handleNavClick = (href: string) => {
    setOptimisticPath(href);
    startTransition(() => {
      // Smooth non-blocking transition
    });
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full shrink-0 z-30 select-none">
      {/* Brand Logo Header */}
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
              : userRole === 'SOCIAL_MEDIA_MANAGER'
              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
              : userRole === 'MARKETING_MANAGER'
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          }`}
        >
          {userRole.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Role-Specific Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin scrollbar-thumb-gray-800">
        {NAVIGATION_SECTIONS.map((section) => {
          if (section.roles && !section.roles.includes(userRole)) return null;

          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(userRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {userRole === 'MARKETING_MANAGER' && section.title === 'Overview'
                  ? 'Client Portal'
                  : userRole === 'MARKETING_MANAGER' && section.title === 'Operations & Assets'
                  ? 'Assigned Client Data'
                  : userRole === 'STAFF' && section.title === 'Overview'
                  ? 'My Workspace'
                  : section.title}
              </div>

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activePath === item.href ||
                  (item.href !== '/' && activePath === item.href) ||
                  (item.href === '/equipment' && activePath === '/equipment');
                const isItemNavigating = isPending && optimisticPath === item.href;

                const displayName =
                  userRole === 'MARKETING_MANAGER' && item.clientName
                    ? item.clientName
                    : userRole === 'MEDIA_MANAGER' && item.mediaName
                    ? item.mediaName
                    : userRole === 'SOCIAL_MEDIA_MANAGER' && item.smmName
                    ? item.smmName
                    : userRole === 'STAFF' && item.staffName
                    ? item.staffName
                    : userRole === 'TECHNICAL_MANAGER' && item.techName
                    ? item.techName
                    : item.name;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onMouseEnter={() => router.prefetch(item.href)}
                    onClick={() => handleNavClick(item.href)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-bold shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isItemNavigating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                      ) : (
                        <Icon
                          className={`w-4 h-4 transition-colors shrink-0 ${
                            isActive
                              ? 'text-blue-400'
                              : 'text-gray-400 group-hover:text-gray-200'
                          }`}
                        />
                      )}
                      <span className="truncate">{displayName}</span>
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

      {/* User Footer */}
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
