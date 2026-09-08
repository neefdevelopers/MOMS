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
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    }
    if (act.includes('REVISION') || act.includes('CHANGES_REQUESTED') || act.includes('REJECTED')) {
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
    }
    if (act.includes('APPROVED') || act.includes('ACCEPTED') || act.includes('COMPLETED')) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    }
    if (act.includes('ASSIGNED')) {
      return {
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
      };
    }
    if (act.includes('FILE') || act.includes('DELIVERABLE') || act.includes('UPLOAD')) {
      return {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dot: 'bg-indigo-500',
      };
    }
    if (act.includes('EDIT')) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    if (act.includes('TECHNICAL') || act.includes('REVIEW')) {
      return {
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        dot: 'bg-cyan-500',
      };
    }
    if (act.includes('REMARK')) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    return {
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500',
    };
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>{title}</span>
          </h3>
          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold">
            {sortedEntries.length} Update{sortedEntries.length !== 1 ? 's' : ''} ({order === 'desc' ? 'Latest First' : 'Oldest First'})
          </span>
        </div>
      )}

      {sortedEntries.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-300">
          {emptyMessage}
        </div>
      ) : (
        <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200">
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
                <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full ${style.dot} border-2 border-white shadow-xs group-hover:scale-125 transition-transform`} />

                <div className="bg-slate-50 border border-slate-200 hover:border-slate-300 p-3.5 rounded-lg space-y-2 transition-all">
                  {/* Top Row: Action Badge + Date & Time */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <span className={`font-bold px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${style.bg}`}>
                      {actionText}
                    </span>

                    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700">{dateStr}</span>
                      <span>•</span>
                      <span className="text-blue-600 font-bold">{timeStr}</span>
                    </div>
                  </div>

                  {/* Middle Row: User & Role */}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-900">{userName}</span>
                    {userRole && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 border border-slate-300 rounded uppercase">
                        {userRole}
                      </span>
                    )}
                  </div>

                  {/* Description / Content */}
                  {textContent && (
                    <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200 font-normal whitespace-pre-wrap">
                      {textContent}
                    </p>
                  )}

                  {/* Field-level Diffs / Changes (for Edit Histories) */}
                  {parsedChanges && Object.keys(parsedChanges).length > 0 && typeof parsedChanges === 'object' && (
                    <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[9px] font-mono font-bold text-purple-700 uppercase tracking-wider block">
                        Field-Level Updations:
                      </span>
                      <div className="space-y-1 text-[11px]">
                        {Object.entries(parsedChanges).map(([field, val]: [string, any]) => {
                          if (val && typeof val === 'object' && ('from' in val || 'to' in val)) {
                            return (
                              <div key={field} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-200 text-[10px] font-mono">
                                <span className="text-slate-600 capitalize">{field}:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="line-through text-rose-600 font-medium">{String(val.from ?? 'None')}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className="text-emerald-700 font-bold">{String(val.to ?? 'None')}</span>
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
