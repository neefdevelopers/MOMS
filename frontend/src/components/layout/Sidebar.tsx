'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Calendar,
  Users2,
  BookmarkCheck,
  Package,
  Film,
  FileText,
  Palette,
  CheckSquare,
  CheckCircle2,
  Camera,
  UserCheck,
  Users,
  MessageSquare,
  BarChart3,
  Activity,
  Archive,
  Settings,
  Tv,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles?: ('MEDIA_MANAGER' | 'TECHNICAL_MANAGER' | 'STAFF')[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Media Calendar', href: '/calendar', icon: Calendar },
  { name: 'Clients', href: '/clients', icon: Users2, roles: ['MEDIA_MANAGER'] },
  { name: 'Brands', href: '/brands', icon: BookmarkCheck, roles: ['MEDIA_MANAGER'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['MEDIA_MANAGER'] },
  { name: 'Projects', href: '/projects', icon: Film },
  { name: 'Scripts', href: '/scripts', icon: FileText },
  { name: 'Graphic Requirements', href: '/graphic-reqs', icon: Palette },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Approvals', href: '/approvals', icon: CheckCircle2, roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'] },
  { name: 'Equipment', href: '/equipment', icon: Camera, roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'] },
  { name: 'Attendance', href: '/attendance', icon: UserCheck, roles: ['MEDIA_MANAGER', 'TECHNICAL_MANAGER'] },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Communication', href: '/communication', icon: MessageSquare },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['MEDIA_MANAGER'] },
  { name: 'Activity Center', href: '/activity', icon: Activity, roles: ['MEDIA_MANAGER'] },
  { name: 'Archive', href: '/archive', icon: Archive },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['MEDIA_MANAGER'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const userRole = user?.role || 'STAFF';

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole),
  );

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full shrink-0 z-30">
      {/* Brand Logo */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
          <Tv className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight tracking-wide">MOMS</h1>
          <p className="text-xs text-gray-400 font-medium">Media Operations V1</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-4 py-3 bg-gray-900/50 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Role</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
            userRole === 'MEDIA_MANAGER'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : userRole === 'TECHNICAL_MANAGER'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {userRole.replace('_', ' ')}
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info footer */}
      {user && (
        <div className="p-4 border-t border-border bg-gray-900/40 flex items-center gap-3">
          <img
            src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={user.name}
            className="w-9 h-9 rounded-full object-cover border border-gray-700"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <span className="text-[10px] font-semibold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/60 font-mono">
              {user.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
