'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Film,
  CheckSquare,
  FileCheck,
  Camera,
  UserCheck,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Search,
  History,
  Layers,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';

interface RecentOperationalActivityWidgetProps {
  onOpenHistoryModal?: () => void;
}

type ActivityCategory = 'ALL' | 'PROJECTS' | 'TASKS' | 'REVIEWS' | 'EQUIPMENT' | 'ATTENDANCE' | 'COMMUNICATION' | 'APPROVALS';

export default function RecentOperationalActivityWidget({ onOpenHistoryModal }: RecentOperationalActivityWidgetProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadActivities = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedCategory !== 'ALL') queryParams.set('category', selectedCategory);
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());
      queryParams.set('limit', '35');

      const res = await fetchApi(`/activity/feed?${queryParams.toString()}`);
      if (res && Array.isArray(res.activities)) {
        setActivities(res.activities);
      } else {
        setActivities([]);
      }
    } catch (err) {
      console.error('Failed to load recent operational activity feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadActivities();
  };

  const getCategoryConfig = (category: string, action?: string) => {
    const actUpper = (action || '').toUpperCase();

    if (category === 'PROJECTS' || actUpper.includes('PROJECT')) {
      return {
        icon: <Film className="w-3.5 h-3.5 text-blue-400" />,
        badgeBg: 'bg-blue-950/60 text-blue-300 border-blue-800/80',
        label: 'Project Event',
      };
    }
    if (category === 'TASKS' || actUpper.includes('TASK')) {
      return {
        icon: <CheckSquare className="w-3.5 h-3.5 text-amber-400" />,
        badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
        label: 'Task Update',
      };
    }
    if (category === 'EQUIPMENT' || actUpper.includes('EQUIPMENT')) {
      return {
        icon: <Camera className="w-3.5 h-3.5 text-cyan-400" />,
        badgeBg: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80',
        label: 'Equipment Movement',
      };
    }
    if (category === 'ATTENDANCE' || actUpper.includes('ATTENDANCE')) {
      return {
        icon: <UserCheck className="w-3.5 h-3.5 text-emerald-400" />,
        badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
        label: 'Attendance Record',
      };
    }
    if (category === 'COMMUNICATION' || actUpper.includes('COMMUNICATION')) {
      return {
        icon: <MessageSquare className="w-3.5 h-3.5 text-purple-400" />,
        badgeBg: 'bg-purple-950/60 text-purple-300 border-purple-800/80',
        label: 'Communication Note',
      };
    }
    if (category === 'APPROVALS' || actUpper.includes('APPROVAL')) {
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />,
        badgeBg: 'bg-rose-950/60 text-rose-300 border-rose-800/80',
        label: 'Approval Review',
      };
    }

    return {
      icon: <FileCheck className="w-3.5 h-3.5 text-zinc-400" />,
      badgeBg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
      label: 'Operational Audit',
    };
  };

  const formatTimeAgo = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay < 7) return `${diffDay}d ago`;

      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-4.5 space-y-4 shadow-xl">
      {/* Widget Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400 shrink-0">
            <Activity className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Recent Operational Activity
              <span className="text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-full">
                {activities.length} Entries
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Permanent operational activity timeline stream across projects, tasks, reviews, gear, and approvals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenHistoryModal && (
            <button
              onClick={onOpenHistoryModal}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 flex items-center gap-1.5 transition-all"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Permanent Activity History</span>
            </button>
          )}

          <button
            onClick={loadActivities}
            disabled={loading}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all disabled:opacity-50"
            title="Refresh Feed"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {(
            [
              { id: 'ALL', label: 'All Activity' },
              { id: 'PROJECTS', label: 'Projects' },
              { id: 'TASKS', label: 'Tasks' },
              { id: 'REVIEWS', label: 'Reviews' },
              { id: 'EQUIPMENT', label: 'Equipment' },
              { id: 'ATTENDANCE', label: 'Attendance' },
              { id: 'COMMUNICATION', label: 'Communications' },
              { id: 'APPROVALS', label: 'Approvals' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as ActivityCategory)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap transition-all ${
                selectedCategory === tab.id
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative min-w-[160px]">
          <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operational logs..."
            className="w-full bg-zinc-900/90 border border-zinc-800 text-zinc-200 text-[11px] rounded-lg pl-7 pr-2.5 py-1 outline-none focus:border-emerald-500/80 transition-colors"
          />
        </form>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-500 font-mono animate-pulse">
            Fetching recent operational activity history...
          </div>
        ) : activities.length > 0 ? (
          activities.map((item) => {
            const config = getCategoryConfig(item.category, item.action);
            const timeAgo = formatTimeAgo(item.timestamp);

            return (
              <div
                key={item.id}
                className="p-3 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 rounded-xl transition-all flex items-start justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* User Avatar / Initials */}
                  <div className="relative shrink-0 mt-0.5">
                    {item.user?.avatarUrl ? (
                      <img
                        src={item.user.avatarUrl}
                        alt={item.user.name}
                        className="w-7 h-7 rounded-full object-cover border border-zinc-700"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 uppercase">
                        {item.user?.name ? item.user.name.substring(0, 2) : 'OP'}
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white truncate max-w-[140px]">
                        {item.user?.name || 'Media Staff'}
                      </span>

                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 uppercase ${config.badgeBg}`}>
                        {config.icon}
                        {config.label}
                      </span>

                      <span className="text-[10px] text-zinc-500 font-mono ml-auto shrink-0">
                        {timeAgo}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-snug break-words">
                      {item.description}
                    </p>

                    {/* Metadata Snapshot Pills if available */}
                    {item.metadata && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] font-mono text-zinc-400">
                        {item.metadata.status && (
                          <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-amber-300">
                            Status: {item.metadata.status}
                          </span>
                        )}
                        {item.metadata.subject && (
                          <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-purple-300 truncate max-w-[180px]">
                            {item.metadata.subject}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Action Link */}
                {item.targetUrl && (
                  <Link
                    href={item.targetUrl}
                    className="p-1.5 text-zinc-500 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors shrink-0 self-center"
                    title="View referenced operational item"
                  >
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center bg-zinc-900/30 border border-zinc-800/60 rounded-xl space-y-2">
            <Activity className="w-8 h-8 text-zinc-600 mx-auto" />
            <h4 className="text-xs font-bold text-zinc-400">No Operational Activity Found</h4>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
              No recent operational events match the selected category filter or search query.
            </p>
          </div>
        )}
      </div>

      {/* Footer link to full history */}
      {onOpenHistoryModal && (
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <span className="text-[11px] font-mono">Permanent audit history preserved indefinitely</span>
          <button
            onClick={onOpenHistoryModal}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono"
          >
            <span>Inspect Full Activity Audit Feed</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
