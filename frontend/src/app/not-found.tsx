'use client';

import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl text-amber-400 shadow-xl">
        <FileQuestion className="w-10 h-10" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">404 - Page Not Found</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">
          The requested page or resource could not be found.
        </p>
      </div>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-lg transition-colors"
      >
        <Home className="w-4 h-4" /> Return to Dashboard
      </Link>
    </div>
  );
}
