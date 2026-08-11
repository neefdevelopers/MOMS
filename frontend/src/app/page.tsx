'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import {
  Film,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Camera,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [capacity, setCapacity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashRes, capRes] = await Promise.all([
          fetchApi('/reports/dashboard'),
          fetchApi('/tasks/capacity/overview'),
        ]);
        setData(dashRes || {});
        setCapacity(Array.isArray(capRes) ? capRes : []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setData({});
        setCapacity([]);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        Loading Operational Dashboard...
      </div>
    );
  }

  const role = user?.role || 'STAFF';
  const safeCapacity = Array.isArray(capacity) ? capacity : [];
  const techQueue = data?.techReviewQueue || 0;
  const mediaQueue = data?.mediaReviewQueue || 0;
  const totalReviewQueue = techQueue + mediaQueue;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900 border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Media Operations Control Panel — Role:{' '}
            <span className="text-blue-400 font-semibold">{role.replace('_', ' ')}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
          >
            <Film className="w-4 h-4" /> View Projects
          </Link>
          <Link
            href="/calendar"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs rounded-lg border border-gray-700 transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" /> Media Calendar
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Active Projects</span>
            <Film className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white">{data?.totalProjects || 0}</div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="text-emerald-400 font-medium">{data?.indoorProjects || 0} Indoor</span>
            <span>•</span>
            <span className="text-purple-400 font-medium">{data?.outdoorProjects || 0} Outdoor</span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <span>Technical Review Queue</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-cyan-400">{techQueue}</div>
          <p className="text-xs text-gray-400">Awaiting technical supervisor sign-off</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <span>Media Review Queue</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-purple-400">{mediaQueue}</div>
          <p className="text-xs text-gray-400">Awaiting creative quality check</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider">
            <span>Client Revisions</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400">{data?.revisionQueue || 0}</div>
          <p className="text-xs text-gray-400">Active revision cycles in progress</p>
        </div>
      </div>

      {/* Employee Capacity & Overload Alert Section */}
      <div className="bg-card border border-border p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Employee Workload & Capacity Engine</h2>
          </div>
          <Link href="/tasks" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
            Manage Tasks & Reassign <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {safeCapacity.length === 0 ? (
            <p className="text-xs text-gray-400 col-span-3">No capacity workload metrics available.</p>
          ) : (
            safeCapacity.map((emp) => (
              <div
                key={emp.userId}
                className={`p-4 rounded-xl border transition-colors ${
                  emp.status === 'Overloaded'
                    ? 'bg-red-950/20 border-red-800/40'
                    : 'bg-gray-900/60 border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={emp.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                      alt={emp.name}
                      className="w-8 h-8 rounded-full object-cover border border-gray-700"
                    />
                    <div>
                      <h3 className="text-xs font-bold text-white">{emp.name}</h3>
                      <p className="text-[10px] text-gray-400">{emp.designation}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      emp.status === 'Overloaded'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                        : emp.status === 'Normal'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {emp.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 mt-3">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-gray-400">Assigned: {emp.assignedHours}h / {emp.capacityHours}h</span>
                    <span className={emp.workloadPercentage > 100 ? 'text-red-400 font-bold' : 'text-gray-300'}>
                      {emp.workloadPercentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        emp.workloadPercentage > 100
                          ? 'bg-red-500'
                          : emp.workloadPercentage >= 75
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(emp.workloadPercentage || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {emp.status === 'Overloaded' && (
                  <div className="mt-3 p-2 bg-red-900/30 border border-red-800/40 rounded-lg text-[11px] text-red-300 flex items-center justify-between">
                    <span>Over capacity risk!</span>
                    <Link href="/tasks" className="underline font-bold hover:text-white">
                      Reassign
                    </Link>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Grid section: Activity Stream & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Stream */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Recent Production Timeline History
            </h2>
            <Link href="/activity" className="text-xs text-blue-400 hover:underline">
              View All Log Entries
            </Link>
          </div>

          <div className="space-y-3">
            {(data?.recentActivity || []).map((log: any) => (
              <div key={log.id} className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {log.user?.name ? log.user.name.charAt(0) : 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200">{log.user?.name}</span>
                    <span className="text-[10px] text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">{log.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Operations panel */}
        <div className="bg-card border border-border p-6 rounded-xl space-y-4">
          <h2 className="text-base font-bold text-white">Quick Operations</h2>
          <div className="space-y-2">
            <Link
              href="/calendar"
              className="w-full p-3 bg-gray-900 border border-gray-800 hover:border-blue-500 rounded-lg flex items-center justify-between text-xs font-semibold text-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Schedule New Shoot</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-500" />
            </Link>

            <Link
              href="/approvals"
              className="w-full p-3 bg-gray-900 border border-gray-800 hover:border-purple-500 rounded-lg flex items-center justify-between text-xs font-semibold text-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                <span>Review Approval Queue ({totalReviewQueue})</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-500" />
            </Link>

            <Link
              href="/equipment"
              className="w-full p-3 bg-gray-900 border border-gray-800 hover:border-cyan-500 rounded-lg flex items-center justify-between text-xs font-semibold text-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Reserve Equipment</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
