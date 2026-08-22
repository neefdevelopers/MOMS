'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { usePermissions } from '@/lib/usePermissions';
import { ModuleType, PermissionType } from '@/lib/permissions';

interface RouteGuardProps {
  module: ModuleType;
  permission?: PermissionType;
  children: React.ReactNode;
}

export function RouteGuard({ module, permission = 'VIEW', children }: RouteGuardProps) {
  const { can, role } = usePermissions();

  const isAuthorized = can(module, permission);

  if (!isAuthorized) {
    return (
      <div className="py-16 px-4 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-rose-950/80 border-2 border-rose-800 rounded-3xl text-rose-400 shadow-2xl animate-bounce">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-1.5 max-w-md">
          <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
            403 • Access Restricted
          </span>
          <h2 className="text-lg font-extrabold text-white tracking-wide">
            Module Access Restricted for {role.replace('_', ' ')}
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Your account is configured for personalized operational execution. You do not have permission to access the <strong className="text-zinc-200 uppercase">{module.replace('_', ' ')}</strong> module.
          </p>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg"
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-400" />
            <span>Return to My Personal Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
