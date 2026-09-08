'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Home } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-6 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider">
            403 — Access Denied
          </span>
          <h1 className="text-xl font-bold text-slate-900">Restricted Operational Module</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your role (<strong className="text-rose-700 font-mono">{user?.role || 'GUEST'}</strong>) is not authorized to access this page or perform operations on this route.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-mono">
          Security Policy Rule Violation: Module Access Revoked
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs"
          >
            <Home className="w-4 h-4" /> Go to My Authorized Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
