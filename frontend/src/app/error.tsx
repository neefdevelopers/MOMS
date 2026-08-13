'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router Boundary Error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-2xl text-red-400">
        <AlertCircle className="w-10 h-10" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">Something went wrong</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-md">
          {error?.message || 'An unexpected error occurred while loading this page.'}
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-lg transition-colors"
      >
        <RotateCcw className="w-4 h-4" /> Try Again
      </button>
    </div>
  );
}
