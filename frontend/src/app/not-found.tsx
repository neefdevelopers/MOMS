'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
      <h2 className="text-xl font-bold text-white">404 - Page Not Found</h2>
      <p className="text-xs text-gray-400">The requested resource could not be found.</p>
      <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-xs">
        Return to Home
      </Link>
    </div>
  );
}
