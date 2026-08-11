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
  FileText,
  Palette,
  CheckSquare,
  ShieldAlert,
  CloudRain,
  Building,
  Users,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [capacity, setCapacity] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashRes, capRes, tasksRes] = await Promise.all([
          fetchApi('/reports/dashboard'),
          fetchApi('/tasks/capacity/overview'),
          fetchApi('/tasks'),
        ]);
        setData(dashRes || {});
        setCapacity(Array.isArray(capRes) ? capRes : []);
        setMyTasks(Array.isArray(tasksRes) ? tasksRes : []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setData({});
        setCapacity([]);
        setMyTasks([]);
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
        Loading Operational Project Dashboard...
      </div>
    );
  }

  const role = user?.role || 'STAFF';
  const safeCapacity = Array.isArray(capacity) ? capacity : [];

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

      {/* Row 1: Key Operational Indicators (5 Core Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
        {/* 1. Current Progress */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
            <span>Current Progress</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{data?.currentProgress || 0}%</div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data?.currentProgress || 0}%` }}></div>
          </div>
          <p className="text-[10px] text-gray-400">Avg active completion rate</p>
        </div>

        {/* 2. Pending Tasks */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
            <span>Pending Tasks</span>
            <CheckSquare className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{data?.pendingTasks || 0}</div>
          <p className="text-[10px] text-gray-400">Tasks in active pipeline</p>
        </div>

        {/* 3. Pending Scripts */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
            <span>Pending Scripts</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{data?.pendingScripts || 0}</div>
          <p className="text-[10px] text-gray-400">Scripts awaiting sign-off</p>
        </div>

        {/* 4. Pending Requirements */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
            <span>Pending Reqs</span>
            <Palette className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400">{data?.pendingRequirements || 0}</div>
          <p className="text-[10px] text-gray-400">Graphics & design deliverables</p>
        </div>

        {/* 5. Pending Reviews */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
            <span>Pending Reviews</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{data?.pendingReviews || 0}</div>
          <p className="text-[10px] text-gray-400">Tech & Media review queue</p>
        </div>
      </div>

      {/* Row 2: Weather, Outdoor Permits & Studio Booking Status Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Outdoor Shoots Awaiting Permission */}
        <div className="bg-card border border-amber-900/40 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-amber-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Outdoor Permits Pending
            </span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold font-mono">
              {data?.outdoorAwaitingPermission || 0} Shoots
            </span>
          </div>
          <p className="text-gray-400 text-[11px]">Outdoor shoot locations awaiting official permit / clearance confirmation.</p>
        </div>

        {/* Outdoor Shoots Affected by Weather */}
        <div className="bg-card border border-cyan-900/40 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-cyan-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-cyan-400" /> Weather Impact Risk
            </span>
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-bold font-mono">
              {data?.outdoorAffectedByWeather || 0} Affected
            </span>
          </div>
          <p className="text-gray-400 text-[11px]">Outdoor locations under rain, heatwave, or poor lighting advisories.</p>
        </div>

        {/* Studio Booking Status (Indoor) */}
        <div className="bg-card border border-blue-900/40 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-blue-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-400" /> Indoor Studio Bookings
            </span>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-bold font-mono">
              {data?.studioBookingStatus?.confirmed || 0} Confirmed
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-800">
            <span>Pending: <strong className="text-amber-400">{data?.studioBookingStatus?.pending || 0}</strong></span>
            <span>Cancelled: <strong className="text-rose-400">{data?.studioBookingStatus?.cancelled || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Row 3: Equipment Status & Today's Shoots Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment Status Panel */}
        <div className="bg-card border border-border p-6 rounded-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" /> Equipment Availability Status
            </h2>
            <Link href="/equipment" className="text-[11px] text-blue-400 hover:underline">
              Inventory & Reservations
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <div className="text-gray-400 text-[10px] uppercase font-semibold">Available</div>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{data?.equipmentStatus?.available || 0}</div>
            </div>
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <div className="text-gray-400 text-[10px] uppercase font-semibold">Reserved</div>
              <div className="text-xl font-bold text-purple-400 font-mono mt-1">{data?.equipmentStatus?.reserved || 0}</div>
            </div>
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <div className="text-gray-400 text-[10px] uppercase font-semibold">Issued In Field</div>
              <div className="text-xl font-bold text-blue-400 font-mono mt-1">{data?.equipmentStatus?.issued || 0}</div>
            </div>
            <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg">
              <div className="text-gray-400 text-[10px] uppercase font-semibold">Maintenance</div>
              <div className="text-xl font-bold text-amber-400 font-mono mt-1">{data?.equipmentStatus?.maintenance || 0}</div>
            </div>
          </div>
        </div>

        {/* Today's Indoor & Outdoor Shoots Panels */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" /> Today's Scheduled Production Shoots
            </h2>
            <Link href="/calendar" className="text-[11px] text-blue-400 hover:underline">
              View Calendar
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Today's Indoor Shoots */}
            <div className="p-4 bg-blue-950/20 border border-blue-800/40 rounded-xl space-y-2">
              <div className="flex justify-between font-bold text-blue-300">
                <span>Today's Indoor Shoots</span>
                <span className="font-mono bg-blue-900/50 px-2 py-0.5 rounded">{data?.todayIndoorShootsCount || 0}</span>
              </div>
              {data?.todayIndoorShoots?.length > 0 ? (
                data.todayIndoorShoots.map((proj: any) => (
                  <div key={proj.id} className="p-2 bg-gray-900/80 rounded border border-gray-800">
                    <div className="font-bold text-white">{proj.name}</div>
                    <div className="text-[10px] text-gray-400">Studio: {proj.indoorDetails?.studioName || proj.shootLocation}</div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic text-[11px]">No indoor shoots scheduled for today.</p>
              )}
            </div>

            {/* Today's Outdoor Shoots */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-2">
              <div className="flex justify-between font-bold text-emerald-300">
                <span>Today's Outdoor Shoots</span>
                <span className="font-mono bg-emerald-900/50 px-2 py-0.5 rounded">{data?.todayOutdoorShootsCount || 0}</span>
              </div>
              {data?.todayOutdoorShoots?.length > 0 ? (
                data.todayOutdoorShoots.map((proj: any) => (
                  <div key={proj.id} className="p-2 bg-gray-900/80 rounded border border-gray-800">
                    <div className="font-bold text-white">{proj.name}</div>
                    <div className="text-[10px] text-gray-400">Site: {proj.outdoorDetails?.outdoorLocation || proj.shootLocation}</div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic text-[11px]">No outdoor shoots scheduled for today.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Employee Dashboard Section (All 7 Required Metrics) */}
      <div className="bg-card border border-border p-6 rounded-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              👤 Personal Employee Workload Dashboard &amp; Task Stream
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Live personal metrics for {user?.name}: Pending Tasks, Today's Tasks, Overdue, High Priority, Upcoming Deadlines, Current Workload &amp; Remarks.
            </p>
          </div>
          <Link href="/tasks" className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold self-start sm:self-auto">
            My Full Task Inspector <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 7 Core Personal Employee Dashboard Metrics */}
        {(() => {
          const nowTime = Date.now();
          const todayStr = new Date().toISOString().split('T')[0];

          // Filter tasks assigned to current logged-in employee (or all for manager view)
          const myAssignedTasks = myTasks.filter((t) =>
            t.assignedEmployees?.some((a: any) => a.userId === user?.id) || role === 'MEDIA_MANAGER' || role === 'TECHNICAL_MANAGER'
          );

          // 1. Pending Tasks
          const pendingTasks = myAssignedTasks.filter((t) => (t.status === 'PENDING' || t.status === 'ASSIGNED') && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

          // 2. Today's Tasks
          const todaysTasks = myAssignedTasks.filter((t) => {
            if (!t.dueDate) return false;
            const dStr = new Date(t.dueDate).toISOString().split('T')[0];
            return dStr === todayStr && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
          });

          // 3. Overdue Tasks
          const overdueTasks = myAssignedTasks.filter((t) => {
            if (!t.dueDate) return false;
            const dTime = new Date(t.dueDate).getTime();
            return dTime < nowTime && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
          });

          // 4. High Priority Tasks
          const highPriorityTasks = myAssignedTasks.filter(
            (t) => (t.priority === 'CRITICAL' || t.priority === 'HIGH') && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
          );

          // 5. Upcoming Deadlines (Sorted by due date)
          const upcomingDeadlines = [...myAssignedTasks]
            .filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

          // 6. Current Workload (Personal capacity status)
          const myCapInfo = safeCapacity.find((c) => c.userId === user?.id) || {
            name: user?.name,
            capacityHours: 8.0,
            assignedHours: 0,
            weightedWorkloadHours: 0,
            workloadPercentage: 0,
            status: 'Available',
          };

          // 7. Recent Remarks Stream
          const recentRemarks: any[] = [];
          myAssignedTasks.forEach((t) => {
            if (Array.isArray(t.remarksHistory)) {
              t.remarksHistory.forEach((r: any) => {
                recentRemarks.push({
                  ...r,
                  taskId: t.taskId,
                  taskTitle: t.title,
                });
              });
            }
          });
          recentRemarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          return (
            <div className="space-y-5">
              {/* Row 1: Key Employee Metric Counters */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                {/* 1. Pending Tasks */}
                <div className="p-3.5 bg-blue-950/20 border border-blue-800/40 rounded-xl space-y-1">
                  <span className="text-[10px] text-blue-300 font-bold uppercase block">1. Pending Tasks</span>
                  <div className="text-xl font-bold text-blue-400 font-mono">{pendingTasks.length}</div>
                  <span className="text-[9px] text-gray-400 block">Awaiting execution</span>
                </div>

                {/* 2. Today's Tasks */}
                <div className="p-3.5 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-1">
                  <span className="text-[10px] text-purple-300 font-bold uppercase block">2. Today's Tasks</span>
                  <div className="text-xl font-bold text-purple-400 font-mono">{todaysTasks.length}</div>
                  <span className="text-[9px] text-gray-400 block">Due today</span>
                </div>

                {/* 3. Overdue Tasks */}
                <div className="p-3.5 bg-red-950/30 border border-red-800/60 rounded-xl space-y-1">
                  <span className="text-[10px] text-red-300 font-bold uppercase block">3. Overdue Tasks</span>
                  <div className="text-xl font-bold text-red-400 font-mono">{overdueTasks.length}</div>
                  <span className="text-[9px] text-red-300 block font-semibold">Action required</span>
                </div>

                {/* 4. High Priority Tasks */}
                <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-1">
                  <span className="text-[10px] text-amber-300 font-bold uppercase block">4. High Priority</span>
                  <div className="text-xl font-bold text-amber-400 font-mono">{highPriorityTasks.length}</div>
                  <span className="text-[9px] text-gray-400 block">Critical / High priority</span>
                </div>

                {/* 6. Current Workload */}
                <div className="col-span-2 p-3.5 bg-cyan-950/20 border border-cyan-800/40 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-cyan-300 font-bold uppercase">6. Current Workload</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      myCapInfo.status === 'Overloaded' ? 'bg-red-500/20 text-red-400 border-red-800' : 'bg-emerald-500/20 text-emerald-400 border-emerald-800'
                    }`}>
                      {myCapInfo.status} ({myCapInfo.workloadPercentage}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="text-white">Assigned: {myCapInfo.assignedHours}h / {myCapInfo.capacityHours}h</span>
                    <span className="text-cyan-400">Weighted: {myCapInfo.weightedWorkloadHours || myCapInfo.assignedHours}h</span>
                  </div>
                  <div className="w-full bg-gray-950 rounded-full h-1.5 overflow-hidden border border-gray-800">
                    <div
                      className={`h-1.5 rounded-full ${myCapInfo.status === 'Overloaded' ? 'bg-red-500' : 'bg-cyan-500'}`}
                      style={{ width: `${Math.min(myCapInfo.workloadPercentage || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Upcoming Deadlines Stream & Recent Remarks Stream */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                {/* 5. Upcoming Deadlines Stream */}
                <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <h3 className="font-bold text-white flex items-center gap-1.5 text-xs">
                      📅 5. Upcoming Deadlines Stream ({upcomingDeadlines.length})
                    </h3>
                    <span className="text-[9px] text-gray-400 font-mono">Sorted by Due Date</span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {upcomingDeadlines.length === 0 ? (
                      <p className="text-gray-500 italic text-[11px]">No active tasks with upcoming deadlines.</p>
                    ) : (
                      upcomingDeadlines.slice(0, 6).map((t) => {
                        const dTime = new Date(t.dueDate).getTime();
                        const isOverdue = dTime < nowTime;
                        const isToday = new Date(t.dueDate).toISOString().split('T')[0] === todayStr;

                        return (
                          <div key={t.id} className="p-2.5 bg-gray-950 border border-gray-800 rounded-lg flex items-center justify-between hover:border-gray-700 transition-colors">
                            <div className="space-y-0.5 truncate pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-blue-400 text-[10px]">{t.taskId}</span>
                                <span className="font-bold text-white text-xs truncate">{t.title}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 flex items-center gap-2">
                                <span>Priority: <strong className="text-amber-300">{t.priority}</strong></span>
                                <span>Status: <strong className="text-purple-300">{t.status}</strong></span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className={`px-2 py-0.5 rounded font-bold text-[9px] border block ${
                                isOverdue ? 'bg-red-950 text-red-400 border-red-800' :
                                isToday ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-gray-800 text-gray-300 border-gray-700'
                              }`}>
                                {isOverdue ? '⚠️ Overdue' : isToday ? '⏰ Due Today' : new Date(t.dueDate).toLocaleDateString()}
                              </span>
                              <span className="text-[9px] font-mono text-gray-500 block pt-0.5">{t.estimatedHours}h est.</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 7. Recent Remarks Stream */}
                <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <h3 className="font-bold text-white flex items-center gap-1.5 text-xs">
                      💬 7. Recent Execution Remarks Feed ({recentRemarks.length})
                    </h3>
                    <span className="text-[9px] text-gray-400 font-mono">User, Date &amp; Time Logged</span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {recentRemarks.length === 0 ? (
                      <p className="text-gray-500 italic text-[11px]">No recent execution remarks logged on assigned tasks.</p>
                    ) : (
                      recentRemarks.slice(0, 6).map((rem) => (
                        <div key={rem.id} className="p-2.5 bg-gray-950 border border-gray-800 rounded-lg space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-blue-400">👤 {rem.user?.name || 'User'} <span className="text-gray-500 font-normal">({rem.user?.role})</span></span>
                            <span className="font-mono text-gray-500">
                              📅 {new Date(rem.createdAt).toLocaleDateString()} ⏰ {new Date(rem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-[10px] text-purple-300 font-bold font-mono">[{rem.taskId}] {rem.taskTitle}</div>
                          <p className="text-gray-200 text-[11px] leading-snug">{rem.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Row 4: Assigned Employee Workload & Capacity Engine */}
      <div className="bg-card border border-border p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Assigned Employees Workload & Capacity ({data?.assignedEmployeesCount || safeCapacity.length} Active Staff)</h2>
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
              </div>
            ))
          )}
        </div>
      </div>

      {/* Row 5: Timeline & Recent Operational Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Operational Timeline & Activity Feed
            </h2>
            <Link href="/activity" className="text-xs text-blue-400 hover:underline">
              View All Logs
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

        {/* Quick Operations shortcuts */}
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
                <span>Review Approval Queue ({data?.pendingReviews || 0})</span>
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
