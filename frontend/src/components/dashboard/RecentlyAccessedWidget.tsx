'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  History,
  Film,
  FileText,
  BarChart3,
  Camera,
  CheckSquare,
  Palette,
  ExternalLink,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useRecentAccess, RecentEntityType } from '@/lib/recent-access';
import { FavoriteButton } from '../common/FavoriteButton';

const ENTITY_ICONS: Record<
  RecentEntityType,
  { label: string; icon: React.ElementType; color: string; badgeBg: string }
> = {
  PROJECT: {
    label: 'Project',
    icon: Film,
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  SCRIPT: {
    label: 'Script',
    icon: FileText,
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  REPORT: {
    label: 'Report',
    icon: BarChart3,
    color: 'text-pink-600',
    badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  EQUIPMENT: {
    label: 'Equipment',
    icon: Camera,
    color: 'text-cyan-600',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  TASK: {
    label: 'Task',
    icon: CheckSquare,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  GRAPHIC_REQUIREMENT: {
    label: 'Graphic Req',
    icon: Palette,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecentlyAccessedWidget({ className = '' }: { className?: string }) {
  const [filterType, setFilterType] = useState<'ALL' | RecentEntityType>('ALL');
  const { recentRecords, loading } = useRecentAccess(12, filterType);

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 text-xs ${className}`}
    >
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              Recently Accessed Records
            </h3>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px]">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              filterType === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          {(['PROJECT', 'SCRIPT', 'REPORT', 'EQUIPMENT'] as RecentEntityType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                  filterType === type
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {ENTITY_ICONS[type].label}s
              </button>
            )
          )}
        </div>
      </div>

      {/* Records Grid / List */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 font-mono">Loading recent history...</div>
      ) : recentRecords.length === 0 ? (
        <div className="py-3.5 px-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-xs">No recently accessed records found</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentRecords.map((rec) => {
            const config = ENTITY_ICONS[rec.entityType] || {
              label: rec.entityType,
              icon: Layers,
              color: 'text-slate-600',
              badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
            };
            const Icon = config.icon;

            return (
              <div
                key={rec.id}
                className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 hover:border-blue-300 p-3.5 rounded-xl transition-all group flex flex-col justify-between space-y-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg bg-white border border-slate-200 shrink-0 ${config.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {rec.code && (
                          <span className="font-mono text-[10px] text-blue-700 font-bold">
                            {rec.code}
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${config.badgeBg}`}
                        >
                          {config.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Favorite Star Button (for supported types) */}
                  {['PROJECT', 'SCRIPT', 'GRAPHIC_REQUIREMENT', 'TASK', 'REPORT'].includes(
                    rec.entityType
                  ) && (
                    <FavoriteButton
                      entityType={rec.entityType as any}
                      entityId={rec.entityId}
                      title={rec.title}
                      code={rec.code || undefined}
                      url={rec.url}
                      size="sm"
                    />
                  )}
                </div>

                <Link href={rec.url} className="block group-hover:underline">
                  <h4 className="font-bold text-slate-900 text-xs truncate leading-snug">
                    {rec.title}
                  </h4>
                </Link>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatRelativeTime(rec.accessedAt)}
                  </span>
                  <Link
                    href={rec.url}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                  >
                    Open <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
