'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Home } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-red-900/50 rounded-2xl p-8 text-center space-y-6 shadow-2xl shadow-red-950/20">
        <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-red-950 text-red-300 border border-red-800 text-[10px] font-mono font-extrabold rounded-full uppercase tracking-wider">
            403 — Access Denied
          </span>
          <h1 className="text-xl font-black text-white">Restricted Operational Module</h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            Your role (<strong className="text-red-300 font-mono">{user?.role || 'GUEST'}</strong>) is not authorized to access this page or perform operations on this route.
          </p>
        </div>

        <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-[11px] text-gray-400 font-mono">
          Security Policy Rule Violation: Module Access Revoked
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30"
          >
            <Home className="w-4 h-4" /> Go to My Authorized Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
