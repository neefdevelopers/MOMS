import React from 'react';
import { Clock, User, MessageSquare, CheckCircle2, AlertCircle, FileText, Activity } from 'lucide-react';

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
  metadata?: string | Record<string, any>;
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
  title = 'Timeline History',
  order = 'asc',
  emptyMessage = 'No timeline history recorded yet.',
  className = '',
}: TimelineViewProps) {
  // Enforce explicit chronological ordering
  const sortedEntries = [...(entries || [])].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return order === 'asc' ? timeA - timeB : timeB - timeA;
  });

  return (
    <div className={`bg-card border border-border rounded-xl p-5 space-y-4 shadow-md ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>{title}</span>
          </h3>
          <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-bold">
            {sortedEntries.length} Event{sortedEntries.length !== 1 ? 's' : ''} ({order === 'asc' ? 'Chronological Order' : 'Reverse Order'})
          </span>
        </div>
      )}

      {sortedEntries.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-xs italic bg-gray-900/40 rounded-lg border border-dashed border-gray-800">
          {emptyMessage}
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-800">
          {sortedEntries.map((entry) => {
            const dateObj = new Date(entry.createdAt);
            const dateStr = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Invalid Date';
            const timeStr = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            const userName = entry.user?.name || 'System / Employee';
            const userRole = entry.user?.role ? entry.user.role.replace(/_/g, ' ') : '';
            const actionText = entry.action ? entry.action.replace(/_/g, ' ') : 'ACTION';

            return (
              <div key={entry.id} className="relative group">
                {/* Chronological Timeline Node Marker */}
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-card shadow-sm group-hover:scale-125 transition-transform" />

                <div className="bg-gray-900/90 border border-gray-800 hover:border-gray-700 p-3.5 rounded-lg space-y-2 transition-all">
                  {/* Top Row: Action Badge + Date & Time */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <span className="font-bold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider">
                      {actionText}
                    </span>

                    <div className="flex items-center gap-2 font-mono text-[10px] text-gray-400">
                      <span className="font-semibold text-gray-300">{dateStr}</span>
                      <span>•</span>
                      <span className="text-blue-400 font-bold">{timeStr}</span>
                    </div>
                  </div>

                  {/* Middle Row: User & Role */}
                  <div className="flex items-center gap-2 text-xs">
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-bold text-white">{userName}</span>
                    {userRole && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-gray-800 text-gray-300 border border-gray-700 rounded uppercase">
                        {userRole}
                      </span>
                    )}
                  </div>

                  {/* Bottom Row: Remarks & Notes */}
                  {entry.remarks && (
                    <div className="pt-2 border-t border-gray-800/80 text-xs text-gray-300 flex items-start gap-2 bg-gray-950/40 p-2 rounded">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                      <p className="leading-relaxed whitespace-pre-wrap">{entry.remarks}</p>
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
