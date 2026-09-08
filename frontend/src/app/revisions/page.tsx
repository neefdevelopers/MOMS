'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare } from 'lucide-react';

export default function RevisionsPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/tasks');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center p-6">
      <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 animate-bounce">
        <CheckSquare className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Revisions Converted to Unified Task Management</h2>
      <p className="text-xs text-slate-500 max-w-md">
        There is no separate Revision Management module. All revision work is automatically managed directly as Revision Tasks inside <strong>My Tasks</strong>.
      </p>
      <div className="text-xs text-blue-600 font-semibold animate-pulse">
        Redirecting to Tasks Directory...
      </div>
    </div>
  );
}
