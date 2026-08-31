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
      <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-bounce">
        <CheckSquare className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-white">Revisions Converted to Unified Task Management</h2>
      <p className="text-xs text-gray-400 max-w-md">
        There is no separate Revision Management module. All revision work is automatically managed directly as Revision Tasks inside <strong>My Tasks</strong>.
      </p>
      <div className="text-xs text-blue-400 font-semibold animate-pulse">
        Redirecting to Tasks Directory...
      </div>
    </div>
  );
}
