import React from 'react';
import { Loader2, RefreshCw, UploadCloud, FileBarChart, Search } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'page' | 'report' | 'upload' | 'search' | 'refresh' | 'inline';
  className?: string;
}

export function LoadingSpinner({
  label,
  size = 'md',
  variant = 'page',
  className = '',
}: LoadingSpinnerProps) {
  const iconSizeClass =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';

  let defaultLabel = 'Loading data...';
  let IconComponent = Loader2;

  switch (variant) {
    case 'report':
      defaultLabel = 'Compiling report & analytics data...';
      IconComponent = FileBarChart;
      break;
    case 'upload':
      defaultLabel = 'Uploading deliverable media files...';
      IconComponent = UploadCloud;
      break;
    case 'search':
      defaultLabel = 'Searching repository database...';
      IconComponent = Search;
      break;
    case 'refresh':
      defaultLabel = 'Refreshing operational data...';
      IconComponent = RefreshCw;
      break;
    case 'page':
      defaultLabel = 'Loading operational view...';
      IconComponent = Loader2;
      break;
    case 'inline':
      defaultLabel = '';
      IconComponent = Loader2;
      break;
  }

  const displayLabel = label !== undefined ? label : defaultLabel;

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-2 text-xs font-semibold text-blue-600 ${className}`}>
        <Loader2 className={`${iconSizeClass} animate-spin text-blue-600 shrink-0`} />
        {displayLabel && <span>{displayLabel}</span>}
      </span>
    );
  }

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3 shadow-sm my-4 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
        <IconComponent className={`${iconSizeClass} animate-spin text-blue-600`} />
      </div>

      {displayLabel && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-900 tracking-wide">{displayLabel}</p>
          <p className="text-[11px] text-slate-500 font-mono">Please wait while the operation completes</p>
        </div>
      )}
    </div>
  );
}

/** Full-Screen / Modal Backdrop Loading Overlay for long operations */
export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">Operation In Progress</h3>
          <p className="text-xs text-slate-600">{message || 'Processing operational payload...'}</p>
        </div>
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 animate-pulse rounded-full w-3/4" />
        </div>
      </div>
    </div>
  );
}
