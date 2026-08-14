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
  Megaphone,
  Bell,
  Send,
  X,
  Plus,
  Radio,
  Paperclip,
  Download,
  File,
  Image as ImageIcon,
  Video,
  Music,
  MessageSquare,
  AtSign,
  Eye,
  CornerDownRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [myDashboard, setMyDashboard] = useState<any>(null);
  const [capacity, setCapacity] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'SYSTEM'>('PERSONAL');

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [pubSubject, setPubSubject] = useState('');
  const [pubContent, setPubContent] = useState('');
  const [pubPriority, setPubPriority] = useState<'HIGH_PRIORITY' | 'NORMAL_PRIORITY'>('NORMAL_PRIORITY');
  const [submittingAnn, setSubmittingAnn] = useState(false);

  // Operational Communication Command State
  const [unreadComms, setUnreadComms] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [assignedBlockers, setAssignedBlockers] = useState<any[]>([]);
  const [mentions, setMentions] = useState<any[]>([]);
  const [recentDiscussions, setRecentDiscussions] = useState<any[]>([]);

  const loadAnnouncements = async () => {
    try {
      const annRes = await fetchApi('/communications/announcements');
      setAnnouncements(Array.isArray(annRes) ? annRes : []);
    } catch (err) {
      console.error('Failed to load company announcements:', err);
    }
  };

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashRes, myDashRes, capRes, tasksRes, annRes] = await Promise.all([
          fetchApi('/reports/dashboard').catch(() => ({})),
          fetchApi('/reports/my-dashboard').catch(() => null),
          fetchApi('/tasks/capacity/overview').catch(() => []),
          fetchApi('/tasks').catch(() => []),
          fetchApi('/communications/announcements').catch(() => []),
        ]);
        setData(dashRes || {});
        setMyDashboard(myDashRes);
        setCapacity(Array.isArray(capRes) ? capRes : []);
        setMyTasks(Array.isArray(tasksRes) ? tasksRes : []);
        setAnnouncements(Array.isArray(annRes) ? annRes : []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();

    // Load operational communication dashboard widgets
    async function loadCommWidgets() {
      try {
        const [unreadRes, approvalsRes, blockersRes, allCommsRes] = await Promise.all([
          fetchApi('/communications?status=SENT&isRemark=false'),
          fetchApi('/approvals?status=PENDING'),
          fetchApi('/communications?blockerStatus=OPEN'),
          fetchApi('/communications?isRemark=false'),
        ]);

        const allComms: any[] = Array.isArray(allCommsRes) ? allCommsRes : [];

        setUnreadComms(Array.isArray(unreadRes) ? unreadRes.slice(0, 5) : []);
        setPendingApprovals(Array.isArray(approvalsRes) ? approvalsRes.slice(0, 5) : []);
        setAssignedBlockers(Array.isArray(blockersRes) ? blockersRes.filter((c: any) => c.blockerStatus === 'OPEN').slice(0, 5) : []);

        // Extract mentions from comm content
        const mentionComms = allComms.filter((c: any) => c.type === 'MENTION' || (c.content && c.content.includes('@')));
        setMentions(mentionComms.slice(0, 5));

        // Recent discussions = comms with replies
        const withReplies = [...allComms]
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6);
        setRecentDiscussions(withReplies);
      } catch (err) {
        console.error('Failed to load comm widgets:', err);
      }
    }
    loadCommWidgets();
  }, []);

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubContent.trim() || submittingAnn) return;

    try {
      setSubmittingAnn(true);
      await fetchApi('/communications', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'SYSTEM',
          entityId: 'COMPANY',
          type: 'ANNOUNCEMENT',
          isAnnouncement: true,
          priority: pubPriority,
          subject: pubSubject.trim() || (pubPriority === 'HIGH_PRIORITY' ? '🚨 Company Announcement (High Priority)' : 'Company Announcement'),
          recipients: 'All Company Employees',
          content: pubContent.trim(),
        }),
      });
      setPubSubject('');
      setPubContent('');
      setShowAnnouncementModal(false);
      await loadAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to publish announcement');
    } finally {
      setSubmittingAnn(false);
    }
  };

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
          {(role === 'MEDIA_MANAGER' || (role as string) === 'ADMIN') && (
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
            >
              <Megaphone className="w-4 h-4" /> Publish Announcement
            </button>
          )}
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

      {/* Dashboard View Switcher */}
      <div className="flex items-center justify-between bg-card border border-border p-2 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('PERSONAL')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-2 ${
              activeTab === 'PERSONAL'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <Users className="w-4 h-4 text-blue-300" /> My Personalized Assignment Dashboard
          </button>
          <button
            onClick={() => setActiveTab('SYSTEM')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-2 ${
              activeTab === 'SYSTEM'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-300" /> System Operations Overview
          </button>
        </div>

        <div className="text-[11px] text-gray-400 font-mono hidden md:block">
          Strictly scoped to your assignments ({user?.name})
        </div>
      </div>

      {/* Company-Wide Announcements Banner Section */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-purple-400" /> Company-Wide Announcements ({announcements.length})
            </h3>
            <Link href="/communication" className="text-[11px] text-purple-400 hover:text-purple-300 font-medium">
              View Repository Feed →
            </Link>
          </div>

          <div className="space-y-3">
            {announcements.map((ann) => {
              const isHigh = ann.priority === 'HIGH_PRIORITY';
              const dt = new Date(ann.createdAt);
              const dateStr = dt.toLocaleDateString();
              const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={ann.id}
                  className={`relative overflow-hidden rounded-xl border p-4.5 space-y-2.5 transition-all ${
                    isHigh
                      ? 'bg-gradient-to-r from-red-950/80 via-amber-950/60 to-red-950/80 border-red-500/80 shadow-xl shadow-red-950/40 ring-1 ring-red-500/30'
                      : 'bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-900 border-purple-800/60'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isHigh ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded font-bold bg-red-600 text-white border border-red-400 flex items-center gap-1.5 font-mono uppercase animate-pulse shadow-md">
                          <AlertTriangle className="w-3.5 h-3.5" /> HIGH PRIORITY ANNOUNCEMENT
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 font-mono uppercase">
                          <Megaphone className="w-3.5 h-3.5 text-purple-400" /> NORMAL PRIORITY ANNOUNCEMENT
                        </span>
                      )}
                      <h4 className="font-bold text-white text-sm">{ann.subject}</h4>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400">
                      <span>Published by: <strong className="text-white">{ann.sender?.name || 'Media Manager'}</strong> ({ann.sender?.role || 'MEDIA_MANAGER'})</span>
                      <span>•</span>
                      <span>{dateStr} {timeStr}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <p className="text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap pl-0.5">
                    {ann.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Publish Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-400" /> Publish Company-Wide Announcement
              </h3>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 font-semibold uppercase">Announcement Priority:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPubPriority('HIGH_PRIORITY')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                      pubPriority === 'HIGH_PRIORITY'
                        ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                        : 'bg-zinc-900 text-gray-400 border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> High Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => setPubPriority('NORMAL_PRIORITY')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                      pubPriority === 'NORMAL_PRIORITY'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                        : 'bg-zinc-900 text-gray-400 border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <Megaphone className="w-3.5 h-3.5" /> Normal Priority
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 font-semibold">Announcement Title / Subject:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Maintenance, Office Holiday, Q3 All-Hands..."
                  value={pubSubject}
                  onChange={(e) => setPubSubject(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-500 placeholder-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 font-semibold">Announcement Content Body:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type company-wide announcement details for all employees..."
                  value={pubContent}
                  onChange={(e) => setPubContent(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-500 placeholder-zinc-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!pubContent.trim() || submittingAnn}
                  className={`px-4 py-2 ${
                    pubPriority === 'HIGH_PRIORITY' ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500'
                  } disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingAnn ? 'Publishing...' : 'Publish to All Dashboards'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== PERSONALIZED ASSIGNMENT DASHBOARD (10 MANDATORY WIDGETS) ===== */}
      {activeTab === 'PERSONAL' && (
        <div className="space-y-6">
          {/* Workload Metric Header */}
          {myDashboard?.currentWorkload && (
            <div className="bg-gray-900 border border-blue-900/40 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
              <div className="space-y-1">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" /> Current Workload & Daily Capacity Engine
                </div>
                <div className="text-xl font-extrabold text-white">
                  {myDashboard.currentWorkload.workloadPercentage}% Workload Allocated
                </div>
                <p className="text-xs text-gray-400">
                  Daily Working Capacity: <strong className="text-gray-200">{myDashboard.currentWorkload.dailyCapacityHours} Hours/day</strong> | Remaining Capacity: <strong className="text-emerald-400">{myDashboard.currentWorkload.remainingCapacityHours} Hours</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${
                  myDashboard.currentWorkload.workloadStatus === 'Overloaded'
                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : myDashboard.currentWorkload.workloadStatus === 'Available'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                }`}>
                  {myDashboard.currentWorkload.workloadStatus} Status
                </span>
                <Link href="/tasks" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors">
                  Manage My Tasks →
                </Link>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Today's Tasks */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1.5 text-emerald-400"><CheckSquare className="w-4 h-4" /> 1. Today's Tasks</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {myDashboard?.todaysTasks?.length || 0}
                </span>
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myDashboard?.todaysTasks?.length > 0 ? (
                  myDashboard.todaysTasks.map((t: any) => (
                    <div key={t.id} className="p-2.5 bg-gray-900 rounded-lg border border-gray-800 space-y-1">
                      <div className="font-bold text-white text-xs">{t.title}</div>
                      <div className="text-[10px] text-gray-400 flex items-center justify-between font-mono">
                        <span>Code: {t.taskId}</span>
                        <span className="text-amber-400 font-bold">{t.priority}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-xs italic">No tasks scheduled for today</div>
                )}
              </div>
            </div>

            {/* 2. Pending Tasks */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1.5 text-amber-400"><Clock className="w-4 h-4" /> 2. Pending Tasks</span>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {myDashboard?.pendingTasks?.length || 0}
                </span>
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myDashboard?.pendingTasks?.length > 0 ? (
                  myDashboard.pendingTasks.map((t: any) => (
                    <div key={t.id} className="p-2.5 bg-gray-900 rounded-lg border border-gray-800 space-y-1">
                      <div className="font-bold text-white text-xs">{t.title}</div>
                      <div className="text-[10px] text-gray-400 flex items-center justify-between">
                        <span className="text-purple-300 font-mono">{t.status}</span>
                        <span className="text-gray-500">{new Date(t.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-xs italic">No active pending tasks</div>
                )}
              </div>
            </div>

            {/* 3. Upcoming Deadlines */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1.5 text-red-400"><AlertTriangle className="w-4 h-4" /> 3. Upcoming Deadlines</span>
                <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {myDashboard?.upcomingDeadlines?.length || 0}
                </span>
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myDashboard?.upcomingDeadlines?.length > 0 ? (
                  myDashboard.upcomingDeadlines.map((d: any) => (
                    <div key={d.id} className="p-2.5 bg-gray-900 rounded-lg border border-gray-800 space-y-1">
                      <div className="font-bold text-white text-xs flex items-center justify-between">
                        <span>{d.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-mono">{d.type}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center justify-between font-mono">
                        <span>Due: {new Date(d.dueDate).toLocaleDateString()}</span>
                        <span className="text-red-400 font-bold">{d.priority}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-xs italic">No upcoming deadlines (7 days)</div>
                )}
              </div>
            </div>

            {/* 4. Current Projects */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1.5 text-blue-400"><Film className="w-4 h-4" /> 4. Current Projects</span>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {myDashboard?.currentProjects?.length || 0}
                </span>
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myDashboard?.currentProjects?.length > 0 ? (
                  myDashboard.currentProjects.map((p: any) => (
                    <Link key={p.id} href={`/projects/${p.id}`} className="block p-2.5 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-800 transition-colors">
                      <div className="font-bold text-white text-xs">{p.name}</div>
                      <div className="text-[10px] text-gray-400 flex items-center justify-between font-mono mt-1">
                        <span>ID: {p.projectId}</span>
                        <span className="text-blue-400 font-bold">{p.status}</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-xs italic">No current project assignments</div>
                )}
              </div>
            </div>

            {/* 5. Assigned Scripts */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1.5 text-purple-400"><FileText className="w-4 h-4" /> 5. Assigned Scripts</span>
                <span className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {myDashboard?.assignedScripts?.length || 0}
                </span>
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myDashboard?.assignedScripts?.length > 0 ? (
                  myDashboard.assignedScripts.map((s: any) => (
                    <Link key={s.id} href="/scripts" className="block p-2.5 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-800 transition-colors">
                      <div className="font-bold text-white text-xs">{s.name}</div>
                      <div className="text-[10px] text-gray-400 flex items-center justify-between font-mono mt-1">
                        <span>ID: {s.scriptId}</span>
                        <span className="text-purple-300 font-semibold">{s.status}</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-xs italic">No script assignments</div>
                )}
              </div>
            </div>

            {/* 6. Assigned Graphic Requirements */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1.5 text-pink-400"><Palette className="w-4 h-4" /> 6. Graphic Requirements</span>
                <span className="bg-pink-500/20 text-pink-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {myDashboard?.assignedGraphicRequirements?.length || 0}
                </span>
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myDashboard?.assignedGraphicRequirements?.length > 0 ? (
                  myDashboard.assignedGraphicRequirements.map((g: any) => (
                    <Link key={g.id} href="/graphic-reqs" className="block p-2.5 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-800 transition-colors">
                      <div className="font-bold text-white text-xs">{g.name}</div>
                      <div className="text-[10px] text-gray-400 flex items-center justify-between font-mono mt-1">
                        <span>Type: {g.requirementType}</span>
                        <span className="text-pink-300 font-semibold">{g.status}</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-xs italic">No graphic requirement assignments</div>
                )}
              </div>
            </div>

            {/* 7. Recent Communications */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1.5 text-cyan-400"><MessageSquare className="w-4 h-4" /> 7. Recent Communications</span>
                <span className="bg-cyan-500/20 text-cyan-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {myDashboard?.recentCommunications?.length || 0}
                </span>
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myDashboard?.recentCommunications?.length > 0 ? (
                  myDashboard.recentCommunications.map((c: any) => (
                    <div key={c.id} className="p-2.5 bg-gray-900 rounded-lg border border-gray-800 space-y-1">
                      <div className="font-bold text-white text-xs flex items-center justify-between">
                        <span>{c.sender?.name || 'System'}</span>
                        <span className="text-[9px] text-gray-500">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-gray-300 truncate">{c.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-xs italic">No recent messages</div>
                )}
              </div>
            </div>

            {/* 8. Notifications */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1.5 text-yellow-400"><Bell className="w-4 h-4" /> 8. Notifications</span>
                <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {myDashboard?.notifications?.length || 0}
                </span>
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {myDashboard?.notifications?.length > 0 ? (
                  myDashboard.notifications.map((n: any) => (
                    <div key={n.id} className="p-2.5 bg-gray-900 rounded-lg border border-gray-800 space-y-1">
                      <div className="font-bold text-white text-xs">{n.title}</div>
                      <div className="text-[11px] text-gray-400">{n.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-xs italic">No unread notifications</div>
                )}
              </div>
            </div>

            {/* 9. Personal Calendar */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md lg:col-span-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1.5 text-indigo-400"><Calendar className="w-4 h-4" /> 9. Personal Calendar & Shoot Schedules</span>
                <Link href="/calendar" className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold">
                  Open Full Calendar →
                </Link>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {myDashboard?.personalCalendar?.length > 0 ? (
                  myDashboard.personalCalendar.map((ev: any) => (
                    <div key={ev.id} className="p-3 bg-gray-900 rounded-lg border border-gray-800 space-y-1">
                      <div className="font-bold text-white text-xs">{ev.title}</div>
                      <div className="text-[10px] text-indigo-300 font-mono font-semibold">
                        {new Date(ev.startDate).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-gray-400">{ev.description || ev.eventType}</div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full p-4 text-center text-gray-500 text-xs italic">No personal calendar events scheduled</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Operational Communication Command Center (System View) ===== */}
      {(activeTab === 'SYSTEM' || !myDashboard) && (
        <div className="space-y-6">
          <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" /> Operational Communication Command Center
            </h2>
            <Link href="/communication" className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold">View Full Hub →</Link>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* 1. Unread Communications */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" /> Unread Communications
              </span>
              {unreadComms.length > 0 && (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                  {unreadComms.length} Unread
                </span>
              )}
            </div>
            {unreadComms.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic">All communications read. ✓</p>
            ) : (
              <div className="space-y-1.5">
                {unreadComms.map((c) => (
                  <Link href="/communication" key={c.id} className="flex items-start gap-2 p-1.5 bg-zinc-950/60 rounded border border-zinc-800/60 hover:border-blue-500/40 transition-colors">
                    <MessageSquare className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">{c.subject || 'Operational Note'}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{c.sender?.name} • {c.entityType}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 2. Pending Approval Requests */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Pending Approvals
              </span>
              {pendingApprovals.length > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  {pendingApprovals.length} Pending
                </span>
              )}
            </div>
            {pendingApprovals.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic">No pending approvals. ✓</p>
            ) : (
              <div className="space-y-1.5">
                {pendingApprovals.map((a) => (
                  <Link href="/approvals" key={a.id} className="flex items-start gap-2 p-1.5 bg-zinc-950/60 rounded border border-zinc-800/60 hover:border-emerald-500/40 transition-colors">
                    <CheckSquare className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">{a.remarks?.substring(0, 50) || 'Approval Request'}</p>
                      <p className="text-[10px] text-zinc-400 truncate">Target: {a.targetRole?.replace('_', ' ')} • {a.approvalType?.replace('_', ' ')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 3. Assigned Blockers */}
          <div className="bg-zinc-900/80 border border-red-900/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Assigned Blockers
              </span>
              {assignedBlockers.length > 0 && (
                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  {assignedBlockers.length} Open
                </span>
              )}
            </div>
            {assignedBlockers.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic">No open blockers assigned. ✓</p>
            ) : (
              <div className="space-y-1.5">
                {assignedBlockers.map((b) => (
                  <Link href="/communication" key={b.id} className="flex items-start gap-2 p-1.5 bg-red-950/30 rounded border border-red-800/40 hover:border-red-500/60 transition-colors">
                    <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">{b.subject || 'Operational Blocker'}</p>
                      <p className="text-[10px] text-red-300 truncate">{b.blockerReason?.replace(/_/g, ' ')} • By {b.sender?.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 4. Mentions */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-cyan-400" /> Mentions
              </span>
              {mentions.length > 0 && (
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                  {mentions.length} Tags
                </span>
              )}
            </div>
            {mentions.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic">No active @mentions.</p>
            ) : (
              <div className="space-y-1.5">
                {mentions.map((m) => (
                  <Link href="/communication" key={m.id} className="flex items-start gap-2 p-1.5 bg-zinc-950/60 rounded border border-zinc-800/60 hover:border-cyan-500/40 transition-colors">
                    <AtSign className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">{m.subject || 'Mention Note'}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{m.content?.substring(0, 60)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 5. Announcements (already shown above, compact summary here) */}
          <div className="bg-zinc-900/80 border border-purple-900/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-purple-400" /> Company Announcements
              </span>
              {announcements.length > 0 && (
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                  {announcements.length} Active
                </span>
              )}
            </div>
            {announcements.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic">No active company announcements.</p>
            ) : (
              <div className="space-y-1.5">
                {announcements.slice(0, 4).map((a) => {
                  const isHigh = a.priority === 'HIGH_PRIORITY';
                  return (
                    <div key={a.id} className={`flex items-start gap-2 p-1.5 rounded border transition-colors ${
                      isHigh ? 'bg-red-950/40 border-red-800/50' : 'bg-zinc-950/60 border-zinc-800/60'
                    }`}>
                      {isHigh ? <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" /> : <Megaphone className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <p className={`text-[11px] font-semibold truncate ${isHigh ? 'text-red-200' : 'text-white'}`}>{a.subject}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{a.sender?.name} • {isHigh ? '🚨 HIGH PRIORITY' : 'Normal'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. Recent Discussions */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <CornerDownRight className="w-3.5 h-3.5 text-amber-400" /> Recent Discussions
              </span>
              <Link href="/communication" className="text-[10px] text-blue-400 hover:text-blue-300 font-medium">View All →</Link>
            </div>
            {recentDiscussions.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic">No recent discussion threads.</p>
            ) : (
              <div className="space-y-1.5">
                {recentDiscussions.map((d) => (
                  <Link href="/communication" key={d.id} className="flex items-start gap-2 p-1.5 bg-zinc-950/60 rounded border border-zinc-800/60 hover:border-amber-500/40 transition-colors">
                    <MessageSquare className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">{d.subject || 'Operational Note'}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{d.sender?.name} • {d.entityType?.replace('_', ' ')} • {new Date(d.createdAt).toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ===== EXECUTIVE DASHBOARD OVERALL OPERATIONAL SUMMARY (10 MANDATORY WIDGETS) ===== */}
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-950/60 via-purple-950/40 to-gray-900 border border-blue-900/40 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-400" /> Executive Operations Dashboard
            </h2>
            <p className="text-xs text-gray-400">
              Real-time operational summary across projects, production targets, attendance, capacity, equipment, and audit history.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold font-mono">
              ⚡ Live Operational Metrics
            </span>
          </div>
        </div>

        {/* 10 Operational Metric Display Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 text-xs">
          {/* 1. Total Active Projects */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <span>Active Projects</span>
              <Film className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-white">{data?.totalActiveProjects || 0}</div>
            <p className="text-[10px] text-blue-400 font-medium">In production pipeline</p>
          </div>

          {/* 2. Total Completed Projects */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <span>Completed Projects</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">{data?.totalCompletedProjects || 0}</div>
            <p className="text-[10px] text-emerald-400 font-medium">Fully delivered</p>
          </div>

          {/* 3. Pending Approvals */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <span>Pending Approvals</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-purple-400">{data?.pendingApprovals || 0}</div>
            <p className="text-[10px] text-purple-400 font-medium">Scripts & reqs sign-off</p>
          </div>

          {/* 4. Pending Client Confirmations */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <span>Client Confirmations</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400">{data?.pendingClientConfirmations || 0}</div>
            <p className="text-[10px] text-amber-400 font-medium">Awaiting feedback</p>
          </div>

          {/* 5. Today's Production */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <span>Today's Production</span>
              <CheckSquare className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">
              {data?.todaysProduction?.actualOutput || 0} / {data?.todaysProduction?.targetOutput || 0}
            </div>
            <p className="text-[10px] text-cyan-400 font-medium">{data?.todaysProduction?.achievementPercentage || 0}% target rate</p>
          </div>

          {/* 6. Employee Attendance */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <span>Attendance</span>
              <Users className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-2xl font-extrabold text-pink-400 font-mono">
              {data?.employeeAttendance?.attendancePercentage || 0}%
            </div>
            <p className="text-[10px] text-pink-400 font-medium">
              {data?.employeeAttendance?.presentCount || 0} Present, {data?.employeeAttendance?.absentCount || 0} Absent
            </p>
          </div>

          {/* 7. Overall Productivity */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <span>Overall Productivity</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {data?.overallProductivity || 0}%
            </div>
            <p className="text-[10px] text-emerald-400 font-medium">Daily output efficiency</p>
          </div>

          {/* 8. Equipment Availability */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <span>Equipment</span>
              <Camera className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">
              {data?.equipmentAvailability?.available || 0} / {data?.equipmentAvailability?.total || 0}
            </div>
            <p className="text-[10px] text-cyan-400 font-medium">{data?.equipmentAvailability?.availabilityPercentage || 0}% available</p>
          </div>

          {/* 9. Capacity Utilization */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <span>Capacity Util.</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-indigo-400 font-mono">
              {data?.capacityUtilization?.utilizationPercentage || 0}%
            </div>
            <p className="text-[10px] text-indigo-400 font-medium">{data?.capacityUtilization?.assignedHours || 0}h assigned</p>
          </div>

          {/* 10. Recent Activity Summary */}
          <div className="bg-card border border-border p-4 rounded-xl space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <span>Recent Activity</span>
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div className="text-2xl font-extrabold text-rose-400 font-mono">
              {data?.recentActivity?.length || 0} Events
            </div>
            <p className="text-[10px] text-rose-400 font-medium">Audit feed active</p>
          </div>
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
      )}
    </div>
  );
}
