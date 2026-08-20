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
    color: 'text-blue-400',
    badgeBg: 'bg-blue-950/50 text-blue-300 border-blue-800/50',
  },
  SCRIPT: {
    label: 'Script',
    icon: FileText,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-950/50 text-purple-300 border-purple-800/50',
  },
  REPORT: {
    label: 'Report',
    icon: BarChart3,
    color: 'text-pink-400',
    badgeBg: 'bg-pink-950/50 text-pink-300 border-pink-800/50',
  },
  EQUIPMENT: {
    label: 'Equipment',
    icon: Camera,
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-950/50 text-cyan-300 border-cyan-800/50',
  },
  TASK: {
    label: 'Task',
    icon: CheckSquare,
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
  },
  GRAPHIC_REQUIREMENT: {
    label: 'Graphic Req',
    icon: Palette,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-950/50 text-amber-300 border-amber-800/50',
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
      className={`bg-card border border-border rounded-xl p-5 shadow-lg space-y-4 text-xs ${className}`}
    >
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/15 border border-blue-500/30 rounded-lg text-blue-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              Recently Accessed Records
            </h3>
            <p className="text-[11px] text-gray-400">
              Quick resume history for your active Projects, Scripts, Reports & Equipment
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px]">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              filterType === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
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
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
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
        <div className="p-8 text-center text-gray-400">Loading recent history...</div>
      ) : recentRecords.length === 0 ? (
        <div className="p-8 text-center bg-gray-950/60 border border-gray-800/80 rounded-xl space-y-2">
          <Clock className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="font-semibold text-gray-300">No recently accessed records found</p>
          <p className="text-[10px] text-gray-500">
            As you navigate through Projects, Scripts, Reports, and Equipment, your history
            will be tracked here for quick resume.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentRecords.map((rec) => {
            const config = ENTITY_ICONS[rec.entityType] || {
              label: rec.entityType,
              icon: Layers,
              color: 'text-gray-400',
              badgeBg: 'bg-gray-800 text-gray-300 border-gray-700',
            };
            const Icon = config.icon;

            return (
              <div
                key={rec.id}
                className="bg-gray-900/60 hover:bg-gray-900 border border-gray-800/80 hover:border-blue-500/40 p-3.5 rounded-xl transition-all group flex flex-col justify-between space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg bg-gray-950 border border-gray-800 shrink-0 ${config.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {rec.code && (
                          <span className="font-mono text-[10px] text-blue-400 font-bold">
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
                  <h4 className="font-bold text-white text-xs truncate leading-snug">
                    {rec.title}
                  </h4>
                </Link>

                <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-gray-500" />
                    {formatRelativeTime(rec.accessedAt)}
                  </span>
                  <Link
                    href={rec.url}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
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
