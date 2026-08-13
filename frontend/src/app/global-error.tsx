'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-gray-950 text-white min-h-screen flex items-center justify-center p-6 text-xs font-sans">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <h2 className="text-xl font-bold text-red-400">Application Error</h2>
          <p className="text-gray-400 text-xs">
            {error?.message || 'A critical global application error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md transition-colors"
          >
            Reset Application
          </button>
        </div>
      </body>
    </html>
  );
}
