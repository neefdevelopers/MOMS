'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  CheckSquare,
  Clock,
  Film,
  FileText,
  Palette,
  FileCheck,
  Calendar,
  Bell,
  MessageSquare,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import MyFavoritesWidget from './MyFavoritesWidget';
import { RecentlyAccessedWidget } from './RecentlyAccessedWidget';

interface StaffPersonalizedDashboardProps {
  user: any;
}

export default function StaffPersonalizedDashboard({ user }: StaffPersonalizedDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [taskUpdatingId, setTaskUpdatingId] = useState<string | null>(null);

  const loadPersonalizedDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/reports/my-dashboard');
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load staff personalized dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonalizedDashboard();
  }, []);

  const handleAcceptTask = async (taskId: string) => {
    try {
      setTaskUpdatingId(taskId);
      await fetchApi(`/tasks/${taskId}/accept`, { method: 'POST' });
      loadPersonalizedDashboard();
    } catch (err) {
      console.error('Failed to accept task:', err);
    } finally {
      setTaskUpdatingId(null);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      setTaskUpdatingId(taskId);
      await fetchApi(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadPersonalizedDashboard();
    } catch (err) {
      console.error('Failed to update task status:', err);
    } finally {
      setTaskUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-zinc-400 font-mono">
          Loading your personalized employee dashboard...
        </p>
      </div>
    );
  }

  const profile = data?.user || {
    name: user?.name || 'Staff Member',
    designation: 'Media Staff',
    dailyCapacityHours: 8.0,
  };

  const todaysTasks = data?.todaysTasks || [];
  const pendingTasks = data?.pendingTasks || [];
  const upcomingDeadlines = data?.upcomingDeadlines || [];
  const assignedProjects = data?.currentProjects || [];
  const assignedScripts = data?.assignedScripts || [];
  const assignedGraphicReqs = data?.assignedGraphicRequirements || [];
  const recentRemarks = data?.recentCommunications || [];
  const notifications = data?.notifications || [];
  const personalCalendar = data?.personalCalendar || [];
  const workload = data?.currentWorkload || {
    dailyCapacityHours: 8.0,
    rawWorkloadHours: 0,
    weightedWorkloadHours: 0,
    workloadPercentage: 0,
    workloadStatus: 'Normal',
    remainingCapacityHours: 8.0,
  };

  const isOverloaded = workload.workloadStatus === 'Overloaded';
  const isAvailable = workload.workloadStatus === 'Available';

  return (
    <div className="space-y-6">
      {/* Employee Header & Workload Card */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 border border-emerald-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-black text-base shrink-0 uppercase">
            {profile.name ? profile.name.substring(0, 2) : 'ST'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-wide">
                Welcome back, {profile.name}
              </h1>
              <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Staff Dashboard
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Workload Status Pill */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 ${
              isOverloaded
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : isAvailable
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <Sliders className="w-5 h-5 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider">Current Workload:</span>
                <span className="text-xs font-black font-mono uppercase">{workload.workloadStatus}</span>
              </div>
              <span className="text-[10px] opacity-80 block font-mono">
                {workload.rawWorkloadHours}h / {workload.dailyCapacityHours}h daily capacity ({workload.workloadPercentage}%)
              </span>
            </div>
          </div>

          <button
            onClick={loadPersonalizedDashboard}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-xs"
            title="Refresh My Dashboard"
          >
            <RotateCcw className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </div>

      {/* KPI Metric Counter Bar (6 Personal Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Today's Tasks</span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">{todaysTasks.length}</div>
          <span className="text-[10px] text-emerald-700 font-semibold block">Due Today</span>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Upcoming Deadlines</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700 font-mono">{upcomingDeadlines.length}</div>
          <span className="text-[10px] text-rose-700 font-semibold block">Due Next 7 Days</span>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Assigned Projects</span>
            <Film className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-700 font-mono">{assignedProjects.length}</div>
          <span className="text-[10px] text-blue-700 font-semibold block">Active Production</span>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Assigned Graphic Reqs</span>
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-700 font-mono">{assignedGraphicReqs.length}</div>
          <span className="text-[10px] text-purple-700 font-semibold block">Content Requirements</span>
        </div>

        <Link href="/equipment" className="p-3.5 bg-white border border-slate-200 hover:border-cyan-500/50 rounded-2xl space-y-1 shadow-xs transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">My Equipment</span>
            <Sparkles className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-cyan-700 font-mono">{data?.assignedEquipmentCount || 0}</div>
          <span className="text-[10px] text-cyan-700 font-semibold block flex items-center gap-1">
            Assigned Assets <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </Link>

        <Link href="/attendance" className="p-3.5 bg-white border border-slate-200 hover:border-emerald-500/50 rounded-2xl space-y-1 shadow-xs transition-all group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">My Attendance</span>
            <UserCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-sm font-black text-emerald-700 font-mono truncate">{data?.todayAttendanceStatus || 'Recorded'}</div>
          <span className="text-[10px] text-emerald-700 font-semibold block flex items-center gap-1">
            Log &amp; History <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </Link>
      </div>

      {/* Grid: 1. Today's Tasks & 2. Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Today's Tasks */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4.5 h-4.5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                Today's Tasks ({todaysTasks.length})
              </h3>
            </div>
            <Link href="/tasks" className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold">
              Full Task Board
            </Link>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {todaysTasks.length > 0 ? (
              todaysTasks.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-emerald-700 font-bold">{t.taskId}</span>
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      {t.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{t.title}</h4>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px] text-slate-500">
                    <span>Project: <strong className="text-slate-800">{t.project?.name || 'Assigned Task'}</strong></span>

                    <div className="flex items-center gap-1.5">
                      {t.assignedEmployees?.some((a: any) => a.userId === user?.id && a.acceptanceStatus !== 'ACCEPTED') ? (
                        <button
                          onClick={() => handleAcceptTask(t.id)}
                          disabled={taskUpdatingId === t.id}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-extrabold flex items-center gap-1 shadow-xs"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" /> Accept Task
                        </button>
                      ) : (t.status === 'ACCEPTED' || t.assignedEmployees?.some((a: any) => a.userId === user?.id && a.acceptanceStatus === 'ACCEPTED')) && t.status !== 'IN_PROGRESS' && t.status !== 'COMPLETED' ? (
                        <button
                          onClick={async () => {
                            try {
                              setTaskUpdatingId(t.id);
                              await fetchApi(`/tasks/${t.id}/start-production`, { method: 'POST' });
                              loadPersonalizedDashboard();
                            } catch (err: any) {
                              alert(err.message || 'Failed to start production');
                            } finally {
                              setTaskUpdatingId(null);
                            }
                          }}
                          disabled={taskUpdatingId === t.id}
                          className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] flex items-center gap-1 shadow-xs"
                        >
                          Start Production
                        </button>
                      ) : t.status === 'IN_PROGRESS' ? (
                        <Link
                          href={`/tasks?taskId=${t.id}`}
                          className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-[9px] flex items-center gap-1 shadow-xs"
                        >
                          Upload Deliverable
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="text-xs font-bold text-slate-800">No Tasks Due Today</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  You are all caught up on today's target deadlines!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Upcoming Deadlines */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                Upcoming Deadlines ({upcomingDeadlines.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Target Next 7 Days</span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((dl: any) => (
                <div
                  key={dl.id}
                  className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-rose-700 font-bold">{dl.code}</span>
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{dl.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Type: <span className="text-slate-700 font-mono">{dl.type}</span> • Target: <span className="text-rose-700 font-mono font-bold">{new Date(dl.dueDate).toLocaleDateString()}</span>
                    </p>
                  </div>

                  <Link
                    href={dl.type === 'GRAPHIC_REQ' ? '/graphic-reqs' : '/tasks'}
                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-xs"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="py-10 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">No Upcoming Deadlines</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  No upcoming deadlines scheduled within the next 7 days.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: 3. Assigned Projects & 4. Pending Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Assigned Projects */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Film className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                Assigned Production Projects ({assignedProjects.length})
              </h3>
            </div>
            <Link href="/projects" className="text-[11px] text-blue-700 hover:text-blue-800 font-bold">
              View All
            </Link>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {assignedProjects.length > 0 ? (
              assignedProjects.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-blue-700 font-bold">{p.projectId}</span>
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{p.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Client: <span className="text-slate-800">{p.client?.name || 'Internal'}</span> • Status: <span className="text-blue-700 font-mono">{p.status}</span>
                    </p>
                  </div>

                  <Link
                    href={`/projects/${p.id}`}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg shadow-xs"
                  >
                    Open Project
                  </Link>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                You are not currently assigned to any active production projects.
              </div>
            )}
          </div>
        </div>

        {/* 4. Assigned Graphic Requirements */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4.5 h-4.5 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                Assigned Graphic Requirements ({assignedGraphicReqs.length})
              </h3>
            </div>
            <Link href="/graphic-reqs" className="text-[11px] text-purple-700 hover:text-purple-800 font-bold">
              View All
            </Link>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {assignedGraphicReqs.length > 0 ? (
              assignedGraphicReqs.map((g: any) => (
                <div
                  key={g.id}
                  className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-amber-700 font-bold">{g.requirementId || g.id}</span>
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{g.name || g.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Status: <span className="text-amber-700 font-mono">{g.status}</span>
                    </p>
                  </div>

                  <Link
                    href={`/graphic-reqs?inspect=${g.id}`}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg shadow-xs"
                  >
                    Open Req
                  </Link>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                You are not currently assigned to any active graphic requirements.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: 6. Personal Calendar & 7. Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6. Personal Calendar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-cyan-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                Personal Calendar & Shoot Schedule ({personalCalendar.length})
              </h3>
            </div>
            <Link href="/calendar" className="text-[11px] text-cyan-700 hover:text-cyan-800 font-bold">
              Open Calendar
            </Link>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {personalCalendar.length > 0 ? (
              personalCalendar.map((ev: any) => (
                <div
                  key={ev.id}
                  className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">{ev.title}</span>
                    <span className="text-[9px] text-cyan-700 font-mono font-bold">
                      {new Date(ev.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">{ev.description || 'Assigned shoot event'}</p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No personal shoot events or studio bookings scheduled.
              </div>
            )}
          </div>
        </div>

        {/* 7. Personal Notifications */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4.5 h-4.5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                My Notifications ({notifications.length})
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">{n.title}</span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{n.message}</p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No new personal notifications.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 8. Recent Remarks & Communication Feed */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4.5 h-4.5 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wide">
              Recent Remarks & Task Communication Feed
            </h3>
          </div>
          <Link href="/communication" className="text-[11px] text-purple-700 hover:text-purple-800 font-bold">
            Open Chat
          </Link>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {recentRemarks.length > 0 ? (
            recentRemarks.map((comm: any) => (
              <div
                key={comm.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{comm.subject || 'Task Remark'}</span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {new Date(comm.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2">{comm.content}</p>
                <div className="text-[9px] text-slate-400 font-mono pt-0.5">
                  By: {comm.sender?.name || 'Team Member'}
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No recent task remarks or communication updates on your assigned work.
            </div>
          )}
        </div>
      </div>

      {/* User-Specific Favorites & Recently Accessed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MyFavoritesWidget />
        <RecentlyAccessedWidget />
      </div>
    </div>
  );
}
