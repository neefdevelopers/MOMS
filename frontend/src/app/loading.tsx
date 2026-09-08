import React from 'react';

export default function Loading() {
  return (
    <div className="w-full h-full p-6 space-y-6 animate-pulse select-none bg-slate-50">
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-md" />
          <div className="h-4 w-72 bg-slate-200/60 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 bg-slate-200/80 rounded-xl" />
          <div className="h-9 w-32 bg-blue-100 rounded-xl border border-blue-200" />
        </div>
      </div>

      {/* Metrics / Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="w-7 h-7 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-8 w-24 bg-slate-200 rounded-md" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Table / Content Skeleton */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="h-9 w-64 bg-slate-100 rounded-xl" />
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-slate-100 rounded-xl" />
            <div className="h-9 w-20 bg-slate-100 rounded-xl" />
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="h-12 w-full bg-slate-50 rounded-xl flex items-center justify-between px-4 border border-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-slate-200 rounded" />
                <div className="h-4 w-40 bg-slate-200 rounded" />
              </div>
              <div className="h-4 w-24 bg-slate-100 rounded hidden sm:block" />
              <div className="h-6 w-16 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
