import React from 'react';

export default function Loading() {
  return (
    <div className="w-full h-full p-6 space-y-6 animate-pulse select-none">
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800/80">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-800/70 rounded-md" />
          <div className="h-4 w-72 bg-gray-800/40 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 bg-gray-800/60 rounded-lg" />
          <div className="h-9 w-32 bg-blue-600/30 rounded-lg border border-blue-500/20" />
        </div>
      </div>

      {/* Metrics / Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-card/60 border border-border/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-gray-800/60 rounded" />
              <div className="w-7 h-7 bg-gray-800/80 rounded-lg" />
            </div>
            <div className="h-8 w-24 bg-gray-800/80 rounded-md" />
            <div className="h-3 w-32 bg-gray-800/40 rounded" />
          </div>
        ))}
      </div>

      {/* Main Table / Content Skeleton */}
      <div className="rounded-xl bg-card/60 border border-border/50 p-4 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800/60">
          <div className="h-9 w-64 bg-gray-800/60 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-gray-800/50 rounded-lg" />
            <div className="h-9 w-20 bg-gray-800/50 rounded-lg" />
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="h-12 w-full bg-gray-800/30 rounded-lg flex items-center justify-between px-4 border border-gray-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-gray-800/80 rounded" />
                <div className="h-4 w-40 bg-gray-800/60 rounded" />
              </div>
              <div className="h-4 w-24 bg-gray-800/40 rounded hidden sm:block" />
              <div className="h-6 w-16 bg-gray-800/50 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
