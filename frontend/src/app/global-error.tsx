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
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex items-center justify-center p-6 text-xs font-sans">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-xl">
          <h2 className="text-xl font-bold text-rose-600">Application Error</h2>
          <p className="text-slate-500 text-xs">
            {error?.message || 'A critical global application error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Reset Application
          </button>
        </div>
      </body>
    </html>
  );
}
