import React from 'react';
import {
  Clock,
  User,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  RotateCcw,
  Upload,
  ShieldCheck,
  Edit,
  ArrowRight,
} from 'lucide-react';

export interface TimelineEntry {
  id: string;
  createdAt: string | Date;
  action: string;
  user?: {
    id?: string;
    name?: string;
    role?: string;
    avatarUrl?: string;
  };
  remarks?: string;
  description?: string;
  metadata?: string | Record<string, any>;
  changes?: Record<string, { from?: any; to?: any }>;
}

interface TimelineViewProps {
  entries: TimelineEntry[];
  title?: string;
  order?: 'asc' | 'desc';
  emptyMessage?: string;
  className?: string;
}

export function TimelineView({
  entries,
  title = 'Timeline & Updations History',
  order = 'desc',
  emptyMessage = 'No timeline history recorded yet.',
  className = '',
}: TimelineViewProps) {
  // Enforce explicit chronological ordering
  const sortedEntries = [...(entries || [])].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return order === 'asc' ? timeA - timeB : timeB - timeA;
  });

  const getActionBadgeStyle = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('CREATED')) {
      return {
        bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        dot: 'bg-emerald-500',
      };
    }
    if (act.includes('REVISION') || act.includes('CHANGES_REQUESTED') || act.includes('REJECTED')) {
      return {
        bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        dot: 'bg-rose-500',
      };
    }
    if (act.includes('APPROVED') || act.includes('ACCEPTED') || act.includes('COMPLETED')) {
      return {
        bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dot: 'bg-emerald-400',
      };
    }
    if (act.includes('ASSIGNED')) {
      return {
        bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        dot: 'bg-purple-500',
      };
    }
    if (act.includes('FILE') || act.includes('DELIVERABLE') || act.includes('UPLOAD')) {
      return {
        bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        dot: 'bg-indigo-400',
      };
    }
    if (act.includes('EDIT')) {
      return {
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dot: 'bg-amber-400',
      };
    }
    if (act.includes('TECHNICAL') || act.includes('REVIEW')) {
      return {
        bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        dot: 'bg-cyan-400',
      };
    }
    if (act.includes('REMARK')) {
      return {
        bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-500',
      };
    }
    return {
      bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      dot: 'bg-blue-400',
    };
  };

  return (
    <div className={`bg-card border border-border rounded-xl p-5 space-y-4 shadow-md ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>{title}</span>
          </h3>
          <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold">
            {sortedEntries.length} Update{sortedEntries.length !== 1 ? 's' : ''} ({order === 'desc' ? 'Latest First' : 'Oldest First'})
          </span>
        </div>
      )}

      {sortedEntries.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-xs italic bg-gray-900/40 rounded-lg border border-dashed border-gray-800">
          {emptyMessage}
        </div>
      ) : (
        <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-gray-800">
          {sortedEntries.map((entry, idx) => {
            const dateObj = new Date(entry.createdAt);
            const dateStr = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Invalid Date';
            const timeStr = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            const userName = entry.user?.name || 'System / Management';
            const userRole = entry.user?.role ? entry.user.role.replace(/_/g, ' ') : '';
            const actionText = entry.action ? entry.action.replace(/_/g, ' ') : 'ACTIVITY UPDATE';
            const style = getActionBadgeStyle(entry.action);
            const textContent = entry.description || entry.remarks;

            let parsedChanges: Record<string, { from?: any; to?: any }> | null = null;
            if (entry.changes) {
              parsedChanges = entry.changes;
            } else if (entry.metadata) {
              if (typeof entry.metadata === 'string') {
                try {
                  parsedChanges = JSON.parse(entry.metadata);
                } catch {
                  // ignore
                }
              } else if (typeof entry.metadata === 'object') {
                parsedChanges = entry.metadata;
              }
            }

            return (
              <div key={entry.id || idx} className="relative group">
                {/* Chronological Timeline Node Marker */}
                <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full ${style.dot} border-2 border-card shadow-sm group-hover:scale-125 transition-transform`} />

                <div className="bg-gray-900/90 border border-gray-800 hover:border-gray-700 p-3.5 rounded-lg space-y-2 transition-all">
                  {/* Top Row: Action Badge + Date & Time */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <span className={`font-bold px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${style.bg}`}>
                      {actionText}
                    </span>

                    <div className="flex items-center gap-2 font-mono text-[10px] text-gray-400">
                      <span className="font-semibold text-gray-300">{dateStr}</span>
                      <span>•</span>
                      <span className="text-blue-400 font-bold">{timeStr}</span>
                    </div>
                  </div>

                  {/* Middle Row: User & Role */}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-bold text-white">{userName}</span>
                    {userRole && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-gray-800 text-gray-300 border border-gray-700 rounded uppercase">
                        {userRole}
                      </span>
                    )}
                  </div>

                  {/* Description / Content */}
                  {textContent && (
                    <p className="text-xs text-gray-200 leading-relaxed bg-gray-950/60 p-2.5 rounded-lg border border-gray-800/80 font-normal whitespace-pre-wrap">
                      {textContent}
                    </p>
                  )}

                  {/* Field-level Diffs / Changes (for Edit Histories) */}
                  {parsedChanges && Object.keys(parsedChanges).length > 0 && typeof parsedChanges === 'object' && (
                    <div className="space-y-1 bg-gray-950/80 p-2 rounded-lg border border-gray-800">
                      <span className="text-[9px] font-mono font-bold text-purple-300 uppercase tracking-wider block">
                        Field-Level Updations:
                      </span>
                      <div className="space-y-1 text-[11px]">
                        {Object.entries(parsedChanges).map(([field, val]: [string, any]) => {
                          if (val && typeof val === 'object' && ('from' in val || 'to' in val)) {
                            return (
                              <div key={field} className="flex items-center justify-between bg-gray-900 px-2 py-1 rounded border border-gray-800 text-[10px] font-mono">
                                <span className="text-gray-400 capitalize">{field}:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="line-through text-red-400 font-medium">{String(val.from ?? 'None')}</span>
                                  <ArrowRight className="w-3 h-3 text-gray-500" />
                                  <span className="text-emerald-400 font-bold">{String(val.to ?? 'None')}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
