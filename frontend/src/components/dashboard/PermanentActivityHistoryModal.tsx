'use client';

import React, { useEffect, useState } from 'react';
import {
  History,
  X,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  Film,
  CheckSquare,
  Camera,
  UserCheck,
  MessageSquare,
  CheckCircle2,
  FileCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';

interface PermanentActivityHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PermanentActivityHistoryModal({ isOpen, onClose }: PermanentActivityHistoryModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log Item for detail inspection
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedEntity !== 'ALL') queryParams.set('entity', selectedEntity);
      if (search.trim()) queryParams.set('search', search.trim());
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);
      queryParams.set('limit', '150');

      const [activityRes, statsRes] = await Promise.all([
        fetchApi(`/activity?${queryParams.toString()}`),
        fetchApi('/activity/stats').catch(() => null),
      ]);

      if (Array.isArray(activityRes)) {
        setLogs(activityRes);
      } else {
        setLogs([]);
      }
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load permanent activity history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedEntity, startDate, endDate]);

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const exportCsv = () => {
    if (!logs.length) return;
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Entity ID', 'Description'];
    const rows = logs.map((log) => [
      `"${new Date(log.timestamp).toLocaleString()}"`,
      `"${log.user?.name || 'System'}"`,
      `"${log.user?.role || 'SYSTEM'}"`,
      `"${log.action}"`,
      `"${log.entity}"`,
      `"${log.entityId}"`,
      `"${(log.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `operational_activity_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'PROJECT':
        return <Film className="w-3.5 h-3.5 text-blue-400" />;
      case 'TASK':
        return <CheckSquare className="w-3.5 h-3.5 text-amber-400" />;
      case 'EQUIPMENT':
        return <Camera className="w-3.5 h-3.5 text-cyan-400" />;
      case 'ATTENDANCE':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'COMMUNICATION':
        return <MessageSquare className="w-3.5 h-3.5 text-purple-400" />;
      case 'APPROVAL':
        return <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />;
      case 'SCRIPT':
      case 'GRAPHIC_REQ':
        return <FileCheck className="w-3.5 h-3.5 text-yellow-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400 shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Permanent Operational Activity History Center
                </h2>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Permanent Operational Audit Log
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Complete audit history preserved indefinitely across projects, tasks, reviews, gear, attendance, and communications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={!logs.length}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Audit CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-zinc-900/40 border-b border-zinc-800 shrink-0">
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total Audit Logs</span>
              <span className="text-lg font-black text-white">{stats.totalLogs || 0}</span>
            </div>
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-400 uppercase block">24h Operational Events</span>
              <span className="text-lg font-black text-emerald-400">{stats.logs24h || 0}</span>
            </div>
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-[10px] font-bold text-blue-400 uppercase block">Projects Logged</span>
              <span className="text-lg font-black text-blue-300">{stats.entityCounts?.PROJECT || 0}</span>
            </div>
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-[10px] font-bold text-amber-400 uppercase block">Tasks & Reviews Logged</span>
              <span className="text-lg font-black text-amber-300">
                {(stats.entityCounts?.TASK || 0) + (stats.entityCounts?.SCRIPT || 0)}
              </span>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, description, or entity ID..."
              className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-emerald-500"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {/* Entity Select */}
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 outline-none"
            >
              <option value="ALL">All Entity Modules</option>
              <option value="PROJECT">Projects</option>
              <option value="TASK">Tasks</option>
              <option value="SCRIPT">Scripts</option>
              <option value="GRAPHIC_REQ">Graphic Reqs</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="ATTENDANCE">Attendance</option>
              <option value="COMMUNICATION">Communications</option>
              <option value="APPROVAL">Approvals</option>
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-2.5 py-1.5 outline-none"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-2.5 py-1.5 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="p-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono animate-pulse">
              Loading permanent operational activity records...
            </div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto border border-zinc-800/80 rounded-xl">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Operating User</th>
                    <th className="p-3">Entity Module</th>
                    <th className="p-3">Action Type</th>
                    <th className="p-3">Audit Description</th>
                    <th className="p-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="p-3 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                            {log.user?.name ? log.user.name.substring(0, 2) : 'SY'}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{log.user?.name || 'System'}</span>
                            <span className="text-[9px] text-zinc-500 font-mono capitalize">
                              {log.user?.role?.toLowerCase().replace('_', ' ') || 'System'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] font-bold text-zinc-300 uppercase">
                          {getEntityIcon(log.entity)}
                          {log.entity}
                        </span>
                      </td>

                      <td className="p-3 font-mono text-[10px] font-bold text-amber-300 whitespace-nowrap">
                        {log.action}
                      </td>

                      <td className="p-3 max-w-md truncate text-zinc-200">
                        {log.description}
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg transition-all"
                        >
                          Inspect JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center bg-zinc-900/20 border border-zinc-800/60 rounded-2xl space-y-3">
              <History className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Matching Permanent Logs</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No activity log records match your selected module filter or search query.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span className="font-mono text-[11px]">
            Showing {logs.length} permanent audit records
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl border border-zinc-700 transition-colors"
          >
            Close History Center
          </button>
        </div>
      </div>

      {/* Inspection Modal for Log Metadata */}
      {selectedLog && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Permanent Activity Log Inspection
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div><strong className="text-zinc-400">Log ID:</strong> <span className="text-white">{selectedLog.id}</span></div>
              <div><strong className="text-zinc-400">Timestamp:</strong> <span className="text-white">{new Date(selectedLog.timestamp).toISOString()}</span></div>
              <div><strong className="text-zinc-400">Action:</strong> <span className="text-amber-300">{selectedLog.action}</span></div>
              <div><strong className="text-zinc-400">Entity:</strong> <span className="text-blue-300">{selectedLog.entity} ({selectedLog.entityId})</span></div>
              <div><strong className="text-zinc-400">User:</strong> <span className="text-white">{selectedLog.user?.name} ({selectedLog.user?.email})</span></div>
              <div><strong className="text-zinc-400">Description:</strong> <span className="text-zinc-200">{selectedLog.description}</span></div>
            </div>

            {selectedLog.metadata && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 block font-mono">Raw Event Metadata (JSON):</label>
                <pre className="bg-zinc-950 p-3 rounded-xl text-[11px] font-mono text-emerald-300 border border-zinc-800 overflow-x-auto max-h-48">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.metadata), null, 2);
                    } catch {
                      return selectedLog.metadata;
                    }
                  })()}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl"
              >
                Close Audit Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
