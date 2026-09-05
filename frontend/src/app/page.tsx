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
  Sliders,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Search,
} from 'lucide-react';
import ConfigureWidgetsModal from '@/components/dashboard/ConfigureWidgetsModal';
import { ReassignmentRecommendationsModal } from '@/components/dashboard/ReassignmentRecommendationsModal';
import ExceptionalOperationalConditionsModal from '@/components/dashboard/ExceptionalOperationalConditionsModal';
import RecentOperationalActivityWidget from '@/components/dashboard/RecentOperationalActivityWidget';
import PermanentActivityHistoryModal from '@/components/dashboard/PermanentActivityHistoryModal';
import { RecentlyAccessedWidget } from '@/components/dashboard/RecentlyAccessedWidget';
import MyFavoritesWidget from '@/components/dashboard/MyFavoritesWidget';
import StaffPersonalizedDashboard from '@/components/dashboard/StaffPersonalizedDashboard';
import TechnicalManagerDashboard from '@/components/dashboard/TechnicalManagerDashboard';
import ClientDashboard from '@/components/dashboard/ClientDashboard';
import SocialMediaManagerDashboard from '@/components/dashboard/SocialMediaManagerDashboard';
import {
  DashboardWidgetConfig,
  DEFAULT_DASHBOARD_WIDGETS,
  DASHBOARD_WIDGETS_SETTING_KEY,
  LOCAL_STORAGE_WIDGETS_KEY,
  parseWidgetConfig,
} from '@/utils/dashboardWidgets';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  getNotificationActionLabel,
  getNotificationNavigationUrl,
} from '@/utils/notificationCategories';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [myDashboard, setMyDashboard] = useState<any>(null);
  const [capacity, setCapacity] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipmentStats, setEquipmentStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'SYSTEM' | 'TECHNICAL'>('PERSONAL');

  useEffect(() => {
    if (user?.role === 'TECHNICAL_MANAGER') {
      setActiveTab('TECHNICAL');
    }
  }, [user?.role]);

  // Dashboard Widgets Configuration State
  const [widgetsConfig, setWidgetsConfig] = useState<DashboardWidgetConfig[]>(DEFAULT_DASHBOARD_WIDGETS);
  const [showWidgetConfigModal, setShowWidgetConfigModal] = useState(false);
  const [selectedOverloadedUserId, setSelectedOverloadedUserId] = useState<string | null>(null);
  const [activeOperationalTab, setActiveOperationalTab] = useState<'TODAY' | 'SHOOTS' | 'DEADLINES' | 'RISKS' | 'PROJECTS'>('TODAY');

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubDescription, setPubDescription] = useState('');
  const [pubPriority, setPubPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [pubPublishDate, setPubPublishDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pubExpiryDate, setPubExpiryDate] = useState('');
  const [submittingAnn, setSubmittingAnn] = useState(false);

  // Operational Communication Command State
  const [unreadComms, setUnreadComms] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [assignedBlockers, setAssignedBlockers] = useState<any[]>([]);
  const [mentions, setMentions] = useState<any[]>([]);
  const [recentDiscussions, setRecentDiscussions] = useState<any[]>([]);

  const [notifSummaries, setNotifSummaries] = useState<any>(null);
  const [systemAlerts, setSystemAlerts] = useState<any>(null);
  const [scanningAlerts, setScanningAlerts] = useState(false);
  const [showOperationalConditionsModal, setShowOperationalConditionsModal] = useState(false);
  const [showPermanentActivityHistoryModal, setShowPermanentActivityHistoryModal] = useState(false);

  const loadAnnouncements = async () => {
    try {
      const annRes = await fetchApi('/communications/announcements');
      setAnnouncements(Array.isArray(annRes) ? annRes : []);
    } catch (err) {
      console.error('Failed to load company announcements:', err);
    }
  };

  const loadSystemAlerts = async () => {
    try {
      const alertsRes = await fetchApi('/notifications/system-alerts');
      setSystemAlerts(alertsRes);
    } catch (err) {
      console.error('Failed to load system alerts:', err);
    }
  };

  const handleScanSystemAlerts = async () => {
    try {
      setScanningAlerts(true);
      const res = await fetchApi('/notifications/system-alerts/scan', { method: 'POST' });
      setSystemAlerts(res);
    } catch (err: any) {
      alert(err.message || 'Failed to scan operational conditions');
    } finally {
      setScanningAlerts(false);
    }
  };

  useEffect(() => {
    const role = (user?.role || 'STAFF') as string;
    if (
      role === 'MARKETING_MANAGER' ||
      role === 'SOCIAL_MEDIA_MANAGER' ||
      role === 'STAFF'
    ) {
      setLoading(false);
      return;
    }

    async function loadDashboard() {
      try {
        const [dashRes, myDashRes, capRes, tasksRes, annRes, settingsRes, summariesRes, alertsRes, eqRes] = await Promise.all([
          fetchApi('/reports/dashboard').catch(() => ({})),
          fetchApi('/reports/my-dashboard').catch(() => null),
          fetchApi('/tasks/capacity/overview').catch(() => []),
          fetchApi('/tasks').catch(() => []),
          fetchApi('/communications/announcements').catch(() => []),
          fetchApi('/settings').catch(() => null),
          fetchApi('/notifications/summaries').catch(() => null),
          fetchApi('/notifications/system-alerts').catch(() => null),
          fetchApi('/equipment/dashboard').catch(() => null),
        ]);
        setData(dashRes || {});
        setMyDashboard(myDashRes);
        setCapacity(Array.isArray(capRes) ? capRes : []);
        setMyTasks(Array.isArray(tasksRes) ? tasksRes : []);
        setAnnouncements(Array.isArray(annRes) ? annRes : []);
        setNotifSummaries(summariesRes);
        setSystemAlerts(alertsRes);
        setEquipmentStats(eqRes);

        // Load configured dashboard widgets from DB / localStorage
        const dbSetting = settingsRes?.settings?.find((s: any) => s.key === DASHBOARD_WIDGETS_SETTING_KEY);
        const localSaved = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_WIDGETS_KEY) : null;
        if (dbSetting?.value) {
          setWidgetsConfig(parseWidgetConfig(dbSetting.value));
        } else if (localSaved) {
          setWidgetsConfig(parseWidgetConfig(localSaved));
        }
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
  }, [user?.role]);

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubTitle.trim() || !pubDescription.trim() || submittingAnn) return;

    try {
      setSubmittingAnn(true);
      await fetchApi('/communications/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: pubTitle.trim(),
          description: pubDescription.trim(),
          priority: pubPriority,
          publishDate: pubPublishDate || new Date().toISOString(),
          expiryDate: pubExpiryDate ? new Date(pubExpiryDate).toISOString() : null,
        }),
      });
      setPubTitle('');
      setPubDescription('');
      setPubExpiryDate('');
      setShowAnnouncementModal(false);
      await loadAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to publish organization announcement');
    } finally {
      setSubmittingAnn(false);
    }
  };

  const handleSaveWidgetsConfig = async (newWidgets: DashboardWidgetConfig[]) => {
    setWidgetsConfig(newWidgets);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_WIDGETS_KEY, JSON.stringify(newWidgets));
    }
    if (role === 'MEDIA_MANAGER' || (role as string) === 'ADMIN') {
      try {
        await fetchApi('/settings/system', {
          method: 'PUT',
          body: JSON.stringify({
            key: DASHBOARD_WIDGETS_SETTING_KEY,
            value: JSON.stringify(newWidgets),
          }),
        });
      } catch (err) {
        console.error('Failed to sync widget config to DB:', err);
      }
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

  const role = (user?.role || 'STAFF') as string;
  const safeCapacity = Array.isArray(capacity) ? capacity : [];

  if (role === 'MARKETING_MANAGER') {
    return <ClientDashboard />;
  }

  if (role === 'SOCIAL_MEDIA_MANAGER') {
    return <SocialMediaManagerDashboard />;
  }

  if (role === 'TECHNICAL_MANAGER') {
    return <TechnicalManagerDashboard user={user} />;
  }

  if (role === 'STAFF') {
    return <StaffPersonalizedDashboard user={user} />;
  }

  return (
    <div className="space-y-6">
      {/* Media Manager Quick Actions Bar */}
      {(role === 'MEDIA_MANAGER' || (role as string) === 'ADMIN') && (
        <div className="bg-card border border-border p-4 rounded-xl space-y-2 shadow-md">
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-blue-400">
              <Sparkles className="w-4 h-4 text-blue-400" /> Media Manager Quick Operational Actions
            </span>
            <span className="text-[10px] text-gray-500 font-mono">1-Click Direct Workflows</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <Link
              href="/calendar"
              className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/40 rounded-lg text-center transition-all group"
            >
              <Calendar className="w-4 h-4 text-blue-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold text-gray-200 block truncate">Create Event</span>
            </Link>

            <Link
              href="/projects"
              className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/40 rounded-lg text-center transition-all group"
            >
              <Film className="w-4 h-4 text-emerald-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold text-gray-200 block truncate">Create Project</span>
            </Link>

            <Link
              href="/tasks"
              className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/40 rounded-lg text-center transition-all group"
            >
              <CheckSquare className="w-4 h-4 text-amber-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold text-gray-200 block truncate">Assign Task</span>
            </Link>

            <Link
              href="/staff"
              className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/40 rounded-lg text-center transition-all group"
            >
              <Users className="w-4 h-4 text-purple-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold text-gray-200 block truncate">Add Employee</span>
            </Link>

            <Link
              href="/clients"
              className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/40 rounded-lg text-center transition-all group"
            >
              <Building className="w-4 h-4 text-cyan-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold text-gray-200 block truncate">Add Client</span>
            </Link>

            <Link
              href="/reports"
              className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/40 rounded-lg text-center transition-all group"
            >
              <TrendingUp className="w-4 h-4 text-pink-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold text-gray-200 block truncate">Generate Report</span>
            </Link>

            <Link
              href="/attendance"
              className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/40 rounded-lg text-center transition-all group"
            >
              <Clock className="w-4 h-4 text-indigo-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold text-gray-200 block truncate">Attendance</span>
            </Link>
          </div>
        </div>
      )}

      {/* Technical Manager Quick Actions Bar */}
      {(role as string) === 'TECHNICAL_MANAGER' && (
        <div className="bg-card border border-cyan-900/40 p-4 rounded-xl space-y-2 shadow-md">
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Camera className="w-4 h-4 text-cyan-400" /> Technical Manager Operations & Maintenance Workflows
            </span>
            <span className="text-[10px] text-gray-500 font-mono">1-Click Technical Actions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/approvals"
              className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-cyan-500/40 rounded-lg transition-all group flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Review Deliverable</span>
                <span className="text-[10px] text-gray-400 block truncate">Technical review & sign-off</span>
              </div>
            </Link>

            <Link
              href="/equipment"
              className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-cyan-500/40 rounded-lg transition-all group flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Update Equipment Status</span>
                <span className="text-[10px] text-gray-400 block truncate">Issue, return & status audit</span>
              </div>
            </Link>

            <Link
              href="/equipment"
              className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-cyan-500/40 rounded-lg transition-all group flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <ShieldAlert className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Record Maintenance</span>
                <span className="text-[10px] text-gray-400 block truncate">Log damage & repair status</span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Staff Quick Actions Bar */}
      {role === 'STAFF' && (
        <div className="bg-card border border-emerald-900/40 p-4 rounded-xl space-y-2 shadow-md">
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckSquare className="w-4 h-4 text-emerald-400" /> Staff Personalized Execution Workflows
            </span>
            <span className="text-[10px] text-gray-500 font-mono">1-Click Staff Actions</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/tasks"
              className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/40 rounded-lg transition-all group flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Update Task</span>
                <span className="text-[10px] text-gray-400 block truncate">Update task status</span>
              </div>
            </Link>

            <Link
              href="/tasks"
              className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/40 rounded-lg transition-all group flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Paperclip className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Upload Deliverable</span>
                <span className="text-[10px] text-gray-400 block truncate">Submit media files</span>
              </div>
            </Link>

            <Link
              href="/tasks"
              className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/40 rounded-lg transition-all group flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Add Remark</span>
                <span className="text-[10px] text-gray-400 block truncate">Post progress note</span>
              </div>
            </Link>

            <Link
              href="/communication"
              className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-red-500/40 rounded-lg transition-all group flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Report Blocker</span>
                <span className="text-[10px] text-red-300 block truncate">Escalate blocker issue</span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Dashboard View Switcher */}
      <div className="flex items-center justify-between bg-card border border-border p-2 rounded-xl">
        <div className="flex items-center gap-2">
          {role === 'STAFF' ? (
            <div className="px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Personalized Assignment Dashboard</span>
            </div>
          ) : (role as string) === 'TECHNICAL_MANAGER' ? (
            <>
              <button
                onClick={() => setActiveTab('TECHNICAL')}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-2 ${
                  activeTab === 'TECHNICAL'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                <Camera className="w-4 h-4 text-cyan-300" /> Technical Operations & Equipment Dashboard
              </button>
              <button
                onClick={() => setActiveTab('PERSONAL')}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-2 ${
                  activeTab === 'PERSONAL'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                <Users className="w-4 h-4 text-cyan-300" /> My Technical Tasks & Assignments
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="text-[11px] text-gray-400 font-mono hidden md:block">
          {role === 'STAFF'
            ? `Staff Scope: Strictly scoped to your assignments (${user?.name})`
            : `Active Profile: ${user?.name}`}
        </div>
      </div>

      {/* Exceptional Operational Conditions (Requires Administrative Attention) */}
      {(role === 'MEDIA_MANAGER' || (role as string) === 'TECHNICAL_MANAGER' || (role as string) === 'ADMIN') && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" /> Exceptional Operational Conditions (
                {systemAlerts?.totalActiveAlerts || 0}) — Requires Administrative Attention
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOperationalConditionsModal(true)}
                className="text-[11px] text-white bg-red-600 hover:bg-red-500 border border-red-400 px-3 py-1 rounded-lg flex items-center gap-1.5 font-bold transition-all shadow-md"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Operational Command Center
              </button>
              <button
                onClick={handleScanSystemAlerts}
                disabled={scanningAlerts}
                className="text-[11px] text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold transition-all disabled:opacity-50"
              >
                <RotateCcw className={`w-3 h-3 ${scanningAlerts ? 'animate-spin' : ''}`} />
                {scanningAlerts ? 'Diagnosing Operations...' : 'Diagnostic Scan'}
              </button>
            </div>
          </div>

          {systemAlerts?.alerts?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemAlerts.alerts.map((alertItem: any) => {
                const isCrit = alertItem.severity === 'CRITICAL';
                const isResolved = alertItem.resolved;
                const isAck = alertItem.acknowledged;

                return (
                  <div
                    key={alertItem.id}
                    className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                      isResolved
                        ? 'bg-zinc-900/40 border-zinc-800 opacity-65'
                        : isCrit
                        ? 'bg-gradient-to-br from-red-950/50 via-zinc-900 to-zinc-950 border-red-600/80 shadow-lg shadow-red-950/40 ring-1 ring-red-500/40'
                        : 'bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950 border-amber-500/60 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-black border ${
                            isCrit
                              ? 'bg-red-600 text-white border-red-500 animate-pulse'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {isCrit ? '🚨 CRITICAL ALERT' : '⚡ HIGH ALERT'}
                        </span>
                        {alertItem.entityCode && (
                          <span className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded">
                            {alertItem.entityCode}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono bg-red-900/40 text-red-300 border border-red-800 px-1.5 py-0.5 rounded font-bold uppercase">
                        {isResolved ? 'Resolved' : isAck ? 'Acknowledged' : 'Admin Action Required'}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-xs leading-snug">{alertItem.title}</h4>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{alertItem.description}</p>

                    {/* Quick Metrics preview */}
                    {alertItem.metrics && (
                      <div className="p-2 bg-zinc-950 border border-zinc-800/80 rounded-lg text-[10px] font-mono text-zinc-400">
                        {alertItem.category === 'STAFF_CAPACITY' && (
                          <span>Active Tasks: <strong className="text-amber-300">{alertItem.metrics.activeTaskCount}</strong> (Limit: 5)</span>
                        )}
                        {alertItem.category === 'EQUIPMENT_CONFLICT' && (
                          <span>Gear: <strong className="text-red-300">{alertItem.metrics.equipmentName}</strong></span>
                        )}
                        {alertItem.category === 'CALENDAR_CONFLICT' && (
                          <span>Location: <strong className="text-amber-300">{alertItem.metrics.location}</strong></span>
                        )}
                        {alertItem.category === 'STORAGE_WARNING' && (
                          <span>Space: <strong className="text-amber-300">{alertItem.metrics.totalGB} GB / {alertItem.metrics.quotaGB} GB</strong> ({alertItem.metrics.usagePercentage}%)</span>
                        )}
                        {alertItem.category === 'BACKUP_FAILURE' && (
                          <span className="text-red-400 font-bold">Status: {alertItem.metrics.status}</span>
                        )}
                        {alertItem.category === 'CONNECTIVITY_ISSUE' && (
                          <span className="text-red-400 font-bold">Latency: {alertItem.metrics.latencyMs} ms</span>
                        )}
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
                      <button
                        onClick={() => setShowOperationalConditionsModal(true)}
                        className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1"
                      >
                        <ShieldAlert className="w-3 h-3 text-red-400" /> Admin Command Center →
                      </button>

                      {alertItem.actionUrl && (
                        <Link
                          href={alertItem.actionUrl}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-red-300 hover:text-white bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 px-2 py-0.5 rounded transition-all group"
                        >
                          <span>{alertItem.actionLabel || 'Resolve Condition'}</span>
                          <ExternalLink className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  All operational subsystems healthy. No active exceptional conditions (capacity, gear conflicts, studio conflicts, storage, backups, or connectivity) detected.
                </span>
              </div>
              <button
                onClick={() => setShowOperationalConditionsModal(true)}
                className="text-[11px] font-bold text-emerald-300 hover:text-white bg-emerald-900/40 border border-emerald-700/60 px-2.5 py-1 rounded-lg whitespace-nowrap ml-2"
              >
                Inspect Command Center
              </button>
            </div>
          )}
        </div>
      )}

      {/* Company-Wide Announcements Banner Section (Visible on Every Employee Dashboard) */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-purple-400" /> Organization Announcements ({announcements.length})
            </h3>
            <Link href="/communication" className="text-[11px] text-purple-400 hover:text-purple-300 font-medium">
              View Repository Feed →
            </Link>
          </div>

          <div className="space-y-3">
            {announcements.map((ann) => {
              const priorityUpper = (ann.priority || 'MEDIUM').toUpperCase();
              const isCritical = priorityUpper === 'CRITICAL' || priorityUpper === 'HIGH_PRIORITY';
              const isHigh = priorityUpper === 'HIGH';
              const isLow = priorityUpper === 'LOW';

              const pubDate = new Date(ann.publishDate || ann.createdAt);
              const pubDateStr = pubDate.toLocaleDateString();
              const pubTimeStr = pubDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              const expDate = ann.expiryDate ? new Date(ann.expiryDate) : null;
              const expDateStr = expDate ? expDate.toLocaleDateString() : null;

              return (
                <div
                  key={ann.id}
                  className={`relative overflow-hidden rounded-xl border p-4.5 space-y-2.5 transition-all ${
                    isCritical
                      ? 'bg-gradient-to-r from-red-950/80 via-amber-950/60 to-red-950/80 border-red-500/80 shadow-xl shadow-red-950/40 ring-1 ring-red-500/30'
                      : isHigh
                      ? 'bg-gradient-to-r from-amber-950/60 via-zinc-900 to-zinc-900 border-amber-500/60'
                      : isLow
                      ? 'bg-zinc-950/80 border-zinc-800'
                      : 'bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-900 border-purple-800/60'
                  }`}
                >
                  {/* Top Bar: Priority, Title, Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isCritical ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded font-bold bg-red-600 text-white border border-red-400 flex items-center gap-1.5 font-mono uppercase animate-pulse shadow-md">
                          <AlertTriangle className="w-3.5 h-3.5" /> CRITICAL ANNOUNCEMENT
                        </span>
                      ) : isHigh ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-mono uppercase">
                          <AlertTriangle className="w-3.5 h-3.5" /> HIGH PRIORITY
                        </span>
                      ) : isLow ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded font-normal bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1 font-mono uppercase">
                          LOW PRIORITY
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 font-mono uppercase">
                          <Megaphone className="w-3.5 h-3.5 text-purple-400" /> ANNOUNCEMENT
                        </span>
                      )}
                      <h4 className="font-bold text-white text-sm">{ann.subject}</h4>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 flex-wrap">
                      <span>Published by: <strong className="text-white">{ann.sender?.name || 'Media Manager'}</strong> ({ann.sender?.role?.replace('_', ' ') || 'Media Manager'})</span>
                      <span>•</span>
                      <span>Published: {pubDateStr} {pubTimeStr}</span>
                      {expDateStr && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold">Expires: {expDateStr}</span>
                        </>
                      )}
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

      {/* My Starred Favorites Widget (User-Specific: Projects, Scripts, Graphic Reqs, Tasks, Reports) */}
      <MyFavoritesWidget />

      {/* Recently Accessed Records Widget (Projects, Scripts, Reports & Equipment) */}
      <RecentlyAccessedWidget />

      {/* Recent Operational Activity Stream (Visible on Main Dashboard) */}
      <RecentOperationalActivityWidget
        onOpenHistoryModal={() => setShowPermanentActivityHistoryModal(true)}
      />

      {/* Publish Announcement Modal (Media Manager Only) */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-400" /> Publish Organization-Wide Announcement
              </h3>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="space-y-4">
              {/* Priority Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-300 font-semibold uppercase tracking-wider">Announcement Priority:</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => {
                    const active = pubPriority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPubPriority(p)}
                        className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all border text-center ${
                          active && p === 'CRITICAL'
                            ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                            : active && p === 'HIGH'
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                            : active && p === 'MEDIUM'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                            : active && p === 'LOW'
                            ? 'bg-zinc-700 text-white border-zinc-500'
                            : 'bg-zinc-900 text-gray-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        {p === 'CRITICAL' ? '🚨 Critical' : p === 'HIGH' ? '⚡ High' : p === 'MEDIUM' ? '🔷 Medium' : '⚪ Low'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 font-semibold">Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Studio Maintenance, Office Holiday, Q3 Production Briefing..."
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-500 placeholder-zinc-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-300 font-semibold">Description:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide comprehensive details for all company employees..."
                  value={pubDescription}
                  onChange={(e) => setPubDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-500 placeholder-zinc-500"
                />
              </div>

              {/* Publish Date & Expiry Date (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-300 font-semibold">Publish Date:</label>
                  <input
                    type="date"
                    required
                    value={pubPublishDate}
                    onChange={(e) => setPubPublishDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-300 font-semibold flex items-center justify-between">
                    <span>Expiry Date:</span>
                    <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={pubExpiryDate}
                    onChange={(e) => setPubExpiryDate(e.target.value)}
                    min={pubPublishDate}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Actions */}
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
                  disabled={!pubTitle.trim() || !pubDescription.trim() || submittingAnn}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-purple-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingAnn ? 'Publishing...' : 'Publish to All Dashboards'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== TECHNICAL MANAGER OPERATIONS & MAINTENANCE DASHBOARD ===== */}
      {activeTab === 'TECHNICAL' && (
        <div className="space-y-6">
          {/* Equipment & Technical Asset Health Overview */}
          <div className="bg-card border border-cyan-900/40 p-5 rounded-xl space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-5 h-5 text-cyan-400" /> Equipment Fleet & Operational Asset Health
                </h3>
                <p className="text-xs text-gray-400">Real-time status of cameras, audio, lighting, bays, and technical inventory</p>
              </div>
              <Link
                href="/equipment"
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shadow-md"
              >
                <span>Manage Equipment Fleet</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Technical Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 bg-gray-900/90 border border-gray-800 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Equipment</div>
                <div className="text-2xl font-black font-mono text-white">{equipmentStats?.total || 0}</div>
                <div className="text-[10px] text-gray-500 font-medium">Registered items</div>
              </div>

              <div className="p-3.5 bg-gray-900/90 border border-emerald-900/40 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Available Gear</div>
                <div className="text-2xl font-black font-mono text-emerald-300">{equipmentStats?.available || 0}</div>
                <div className="text-[10px] text-emerald-400/80 font-medium">Ready for issue</div>
              </div>

              <div className="p-3.5 bg-gray-900/90 border border-blue-900/40 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Checked Out / In Use</div>
                <div className="text-2xl font-black font-mono text-blue-300">{equipmentStats?.checkedOut || 0}</div>
                <div className="text-[10px] text-blue-400/80 font-medium">Issued on shoots</div>
              </div>

              <div className="p-3.5 bg-gray-900/90 border border-amber-900/40 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Under Maintenance</div>
                <div className="text-2xl font-black font-mono text-amber-300">{equipmentStats?.underMaintenance || 0}</div>
                <div className="text-[10px] text-amber-400/80 font-medium">In service / repair</div>
              </div>

              <div className="p-3.5 bg-gray-900/90 border border-red-900/40 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Damaged / Flagged</div>
                <div className="text-2xl font-black font-mono text-red-400">{equipmentStats?.damaged || 0}</div>
                <div className="text-[10px] text-red-400/80 font-medium">Needs technical fix</div>
              </div>

              <div className="p-3.5 bg-gray-900/90 border border-purple-900/40 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Recently Returned</div>
                <div className="text-2xl font-black font-mono text-purple-300">{equipmentStats?.recentlyReturned || 0}</div>
                <div className="text-[10px] text-purple-400/80 font-medium">Last 7 days</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Technical Review Sign-Offs */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Pending Technical Deliverable Sign-Offs ({pendingApprovals.length})
                </h3>
                <Link href="/approvals" className="text-xs text-cyan-400 hover:text-cyan-300 font-bold">
                  View All Approvals →
                </Link>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.map((app: any) => (
                    <div key={app.id} className="p-3 bg-gray-900 rounded-lg border border-gray-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{app.title || app.entityName || 'Deliverable Sign-Off'}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                          {app.type || 'TECHNICAL_REVIEW'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{app.description || app.notes || 'Awaiting technical manager review and sign-off.'}</p>
                      <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-mono">Submitted: {new Date(app.createdAt).toLocaleDateString()}</span>
                        <Link
                          href="/approvals"
                          className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] rounded transition-colors"
                        >
                          Process Review
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500 text-xs italic">
                    No pending technical deliverable reviews in your queue
                  </div>
                )}
              </div>
            </div>

            {/* Active Technical Blockers & Issues */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" /> Active Technical Blockers & Issues ({assignedBlockers.length})
                </h3>
                <Link href="/communication" className="text-xs text-red-400 hover:text-red-300 font-bold">
                  View Blockers Feed →
                </Link>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {assignedBlockers.length > 0 ? (
                  assignedBlockers.map((b: any) => (
                    <div key={b.id} className="p-3 bg-gray-900 rounded-lg border border-red-900/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{b.title || 'Technical Blocker'}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-bold">
                          {b.blockerPriority || 'HIGH'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 line-clamp-2">{b.content}</p>
                      <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-mono">Logged by: {b.sender?.name || 'Staff'}</span>
                        <Link
                          href="/communication"
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] rounded transition-colors"
                        >
                          Resolve Blocker
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500 text-xs italic">
                    No active technical blockers reported
                  </div>
                )}
              </div>
            </div>
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

            {/* 8. Notifications & Operational Summaries */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-md lg:col-span-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-1.5 text-yellow-400"><Bell className="w-4 h-4" /> 8. Notifications & Operational Summaries</span>
                <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {notifSummaries?.totalUnread ?? (myDashboard?.notifications?.length || 0)} Unread
                </span>
              </h3>

              {/* 7 Notification Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 pb-1">
                <div className="p-2 bg-cyan-950/30 border border-cyan-800/40 rounded-lg text-center">
                  <div className="text-[10px] text-cyan-300 font-bold">New Tasks</div>
                  <div className="text-sm font-black text-white">{notifSummaries?.newTasks?.count || 0}</div>
                </div>
                <div className="p-2 bg-purple-950/30 border border-purple-800/40 rounded-lg text-center">
                  <div className="text-[10px] text-purple-300 font-bold">Reviews</div>
                  <div className="text-sm font-black text-white">{notifSummaries?.pendingReviews?.count || 0}</div>
                </div>
                <div className={`p-2 rounded-lg text-center border ${
                  (notifSummaries?.overdueWork?.count || 0) > 0
                    ? 'bg-red-950/50 border-red-600/80 animate-pulse'
                    : 'bg-red-950/20 border-red-900/40'
                }`}>
                  <div className="text-[10px] text-red-300 font-bold">Overdue</div>
                  <div className="text-sm font-black text-red-100">{notifSummaries?.overdueWork?.count || 0}</div>
                </div>
                <div className="p-2 bg-amber-950/30 border border-amber-800/40 rounded-lg text-center">
                  <div className="text-[10px] text-amber-300 font-bold">Deadlines</div>
                  <div className="text-sm font-black text-white">{notifSummaries?.upcomingDeadlines?.count || 0}</div>
                </div>
                <div className="p-2 bg-teal-950/30 border border-teal-800/40 rounded-lg text-center">
                  <div className="text-[10px] text-teal-300 font-bold">Equipment</div>
                  <div className="text-sm font-black text-white">{notifSummaries?.equipmentAlerts?.count || 0}</div>
                </div>
                <div className="p-2 bg-blue-950/30 border border-blue-800/40 rounded-lg text-center">
                  <div className="text-[10px] text-blue-300 font-bold">Messages</div>
                  <div className="text-sm font-black text-white">{notifSummaries?.unreadCommunications?.count || 0}</div>
                </div>
                <div className="p-2 bg-purple-950/30 border border-purple-800/40 rounded-lg text-center">
                  <div className="text-[10px] text-purple-300 font-bold">Announce</div>
                  <div className="text-sm font-black text-white">{notifSummaries?.newAnnouncements?.count || 0}</div>
                </div>
              </div>

              {/* Live Notifications Feed with Priority Prominence & Audit Info */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {myDashboard?.notifications?.length > 0 ? (
                  myDashboard.notifications.map((n: any) => {
                    const catCode = (n.category || 'INFORMATION') as keyof typeof NOTIFICATION_CATEGORIES;
                    const catMeta = NOTIFICATION_CATEGORIES[catCode] || NOTIFICATION_CATEGORIES.INFORMATION;

                    const priorityCode = (n.priority || 'MEDIUM').toUpperCase() as keyof typeof NOTIFICATION_PRIORITIES;
                    const prioMeta = NOTIFICATION_PRIORITIES[priorityCode] || NOTIFICATION_PRIORITIES.MEDIUM;
                    const isCritical = priorityCode === 'CRITICAL';
                    const isHigh = priorityCode === 'HIGH';

                    return (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border space-y-1.5 block transition-all ${
                          isCritical
                            ? 'bg-red-950/30 border-red-600/70 hover:border-red-500 shadow-md shadow-red-950/30 ring-1 ring-red-500/30'
                            : isHigh
                            ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400 text-gray-200'
                            : 'bg-gray-900 hover:bg-gray-850 border-gray-800 hover:border-yellow-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <Link
                            href={getNotificationNavigationUrl(n.linkUrl, n.entityType, n.entityId)}
                            className="font-bold text-white text-xs truncate flex items-center gap-1.5 hover:underline flex-1 min-w-[140px]"
                          >
                            {isCritical && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />}
                            <span className={isCritical ? 'text-red-200 font-black' : isHigh ? 'text-amber-200 font-bold' : ''}>
                              {n.title}
                            </span>
                          </Link>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Priority Badge */}
                            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${prioMeta.badgeClass}`}>
                              {isCritical && '🚨 '}{isHigh && '⚡ '}{prioMeta.label}
                            </span>
                            {/* Category Badge */}
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${catMeta.badgeClass}`}>
                              {catMeta.label}
                            </span>
                            {n.entityCode && (
                              <span className="text-[9px] font-mono font-bold bg-gray-800 text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded">
                                {n.entityCode}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`text-[11px] line-clamp-2 ${isCritical ? 'text-red-100 font-medium' : isHigh ? 'text-amber-100/90' : 'text-gray-400'}`}>
                          {n.message}
                        </div>
                        
                        {/* Direct Operational Shortcut Button */}
                        <div className="pt-0.5">
                          <Link
                            href={getNotificationNavigationUrl(n.linkUrl, n.entityType, n.entityId)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded transition-colors group"
                          >
                            <span>{getNotificationActionLabel(n.entityType, n.eventType, n.category)}</span>
                            <ExternalLink className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-gray-500 pt-1 border-t border-gray-800/60">
                          <span>Delivered: {new Date(n.deliveredAt || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="capitalize">{n.eventType ? n.eventType.toLowerCase().replace(/_/g, ' ') : 'Operational Event'}</span>
                        </div>
                      </div>
                    );
                  })
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
      {/* ===== EXECUTIVE DASHBOARD WITH CONFIGURABLE WIDGETS ===== */}
      <div className="space-y-6">
        {/* Operations Dashboard Header & Config Bar */}
        <div className="bg-gradient-to-r from-blue-950/60 via-purple-950/40 to-gray-900 border border-blue-900/40 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-400" /> Executive Operations Dashboard
            </h2>
            <p className="text-xs text-gray-400">
              Real-time operational overview across approvals, attendance, productivity, projects, calendar, equipment, capacity, and activities.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold font-mono">
              ⚡ {widgetsConfig.filter((w) => w.enabled).length} of {widgetsConfig.length} Widgets Active
            </span>
            {(role === 'MEDIA_MANAGER' || (role as string) === 'ADMIN') && (
              <button
                onClick={() => setShowWidgetConfigModal(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" /> Customize Layout
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Configurable Widgets Grid */}
        {widgetsConfig.filter((w) => w.enabled).length === 0 ? (
          <div className="bg-card border border-dashed border-gray-700 p-8 rounded-xl text-center space-y-3">
            <Sliders className="w-8 h-8 text-gray-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">All Dashboard Widgets Are Hidden</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              You have disabled all widgets in your dashboard configuration. Click below to enable and customize your preferred widgets.
            </p>
            <button
              onClick={() => setShowWidgetConfigModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Sliders className="w-4 h-4" /> Open Widget Configurator
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {widgetsConfig
              .filter((w) => w.enabled)
              .sort((a, b) => a.order - b.order)
              .map((widget) => {
                const isFull = widget.size === 'full';

                switch (widget.id) {
                  // 1. ACTIVE PROJECTS WIDGET
                  case 'active_projects':
                    return (
                      <div
                        key={widget.id}
                        className={`bg-card border border-border p-5 rounded-xl space-y-4 shadow-md ${
                          isFull ? 'lg:col-span-2' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-2">
                            <Film className="w-4 h-4 text-blue-400" />
                            <h3 className="font-bold text-white text-sm">Active Projects</h3>
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                              {data?.totalActiveProjects || 0} In Pipeline
                            </span>
                          </div>
                          <Link
                            href="/projects"
                            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                          >
                            All Projects <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-gray-900/80 border border-gray-800 p-3 rounded-lg">
                            <span className="text-[10px] text-blue-300 font-bold uppercase block">Total Active Projects</span>
                            <div className="text-2xl font-extrabold text-blue-400 font-mono mt-1">
                              {data?.totalActiveProjects || 0}
                            </div>
                            <p className="text-[10px] text-blue-400/80 mt-0.5">Active pipeline</p>
                          </div>

                          <div className="bg-gray-900/80 border border-gray-800 p-3 rounded-lg">
                            <span className="text-[10px] text-emerald-300 font-bold uppercase block">Projects In Progress</span>
                            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                              {data?.inProgressProjects || 0}
                            </div>
                            <p className="text-[10px] text-emerald-400/80 mt-0.5">Currently shooting/editing</p>
                          </div>

                          <div className="bg-gray-900/80 border border-gray-800 p-3 rounded-lg">
                            <span className="text-[10px] text-purple-300 font-bold uppercase block">Upcoming Projects</span>
                            <div className="text-2xl font-extrabold text-purple-400 font-mono mt-1">
                              {data?.upcomingProjects || 0}
                            </div>
                            <p className="text-[10px] text-purple-400/80 mt-0.5">Planned / Scheduled</p>
                          </div>

                          <div className={`p-3 rounded-lg border ${
                            (data?.overdueProjectsCount || 0) + (data?.overdueTasksCount || 0) > 0
                              ? 'bg-red-950/40 border-red-600/80 shadow-md shadow-red-950/40 ring-1 ring-red-500/40 animate-pulse'
                              : 'bg-gray-900/80 border-gray-800'
                          }`}>
                            <span className="text-[10px] text-red-300 font-bold uppercase block">Overdue Projects/Tasks</span>
                            <div className="text-2xl font-extrabold text-red-400 font-mono mt-1">
                              {(data?.overdueProjectsCount || 0) + (data?.overdueTasksCount || 0)}
                            </div>
                            <p className="text-[10px] text-red-300/80 mt-0.5">Requires immediate action</p>
                          </div>
                        </div>
                      </div>
                    );

                  // 2. PENDING APPROVALS WIDGET
                  case 'pending_approvals':
                    return (
                      <div
                        key={widget.id}
                        className={`bg-card border border-border p-5 rounded-xl space-y-4 shadow-md ${
                          isFull ? 'lg:col-span-2' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400" />
                            <h3 className="font-bold text-white text-sm">Pending Approvals</h3>
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                              {data?.pendingApprovals || pendingApprovals.length || 0} Pending
                            </span>
                          </div>
                          <Link
                            href="/approvals"
                            className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                          >
                            Approval Queue <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-gray-900/80 border border-gray-800 p-3 rounded-lg">
                            <span className="text-[10px] text-purple-300 font-bold uppercase block">Review Queue</span>
                            <div className="text-2xl font-extrabold text-purple-400 font-mono mt-1">
                              {data?.pendingApprovals || 0}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">Scripts & reqs sign-off</p>
                          </div>
                          <div className="bg-gray-900/80 border border-gray-800 p-3 rounded-lg">
                            <span className="text-[10px] text-amber-300 font-bold uppercase block">Client Confirmations</span>
                            <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
                              {data?.pendingClientConfirmations || 0}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">Awaiting feedback</p>
                          </div>
                        </div>

                        {pendingApprovals.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                              Top Review Requests
                            </span>
                            {pendingApprovals.slice(0, widget.itemLimit || 3).map((a: any) => (
                              <Link
                                href="/approvals"
                                key={a.id}
                                className="flex items-center justify-between p-2 bg-gray-900/90 rounded-lg border border-gray-800 hover:border-purple-500/40 transition-colors"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="text-[11px] font-semibold text-white truncate">
                                    {a.remarks?.substring(0, 45) || 'Pending Approval Request'}
                                  </p>
                                  <p className="text-[10px] text-gray-400 truncate">
                                    Target: {a.targetRole?.replace('_', ' ')} • {a.approvalType?.replace('_', ' ')}
                                  </p>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold shrink-0">
                                  Review →
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );

                  // UPCOMING DEADLINES WIDGET
                  case 'upcoming_deadlines':
                    return (
                      <div
                        key={widget.id}
                        className={`bg-card border border-border p-5 rounded-xl space-y-4 shadow-md ${
                          isFull ? 'lg:col-span-2' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <h3 className="font-bold text-white text-sm">Upcoming Deadlines &amp; Projects Due</h3>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                              {data?.upcomingDeadlines?.length || 0} Due Soon
                            </span>
                          </div>
                          <Link
                            href="/projects"
                            className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                          >
                            Projects Directory <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="space-y-2">
                          {!data?.upcomingDeadlines || data.upcomingDeadlines.length === 0 ? (
                            <p className="text-gray-500 italic text-[11px] p-3 text-center bg-gray-950 rounded-lg border border-gray-800">
                              No project or task deadlines due within the next 7 days. ✓
                            </p>
                          ) : (
                            data.upcomingDeadlines.slice(0, widget.itemLimit || 5).map((item: any) => (
                              <Link
                                key={item.id}
                                href="/projects"
                                className="flex items-center justify-between p-2.5 bg-gray-900/90 rounded-lg border border-gray-800 hover:border-amber-500/40 transition-colors"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                                      {item.code || item.type}
                                    </span>
                                    <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                                  </div>
                                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                    {item.clientName ? `Client: ${item.clientName} • ` : ''}Status: {item.status || 'Active'}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] font-mono font-bold text-amber-400 block">
                                    {new Date(item.dueDate).toLocaleDateString()}
                                  </span>
                                  <span className="text-[9px] text-gray-500 block">Target Due</span>
                                </div>
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                    );

                  // 3. PRODUCTIVITY WIDGET
                  case 'productivity':
                    return (
                      <div
                        key={widget.id}
                        className={`bg-card border border-border p-5 rounded-xl space-y-4 shadow-md ${
                          isFull ? 'lg:col-span-2' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <h3 className="font-bold text-white text-sm">Productivity</h3>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                              {data?.overallProductivity || 0}% Score
                            </span>
                          </div>
                          <Link
                            href="/reports"
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                          >
                            Reports Engine <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-gray-900/80 border border-gray-800 p-3 rounded-lg">
                            <span className="text-[10px] text-emerald-300 font-bold uppercase block">Overall Efficiency</span>
                            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                              {data?.overallProductivity || 0}%
                            </div>
                            <p className="text-[10px] text-emerald-400/80 mt-0.5">Production score</p>
                          </div>
                          <div className="bg-gray-900/80 border border-gray-800 p-3 rounded-lg">
                            <span className="text-[10px] text-cyan-300 font-bold uppercase block">Today's Output</span>
                            <div className="text-xl font-extrabold text-cyan-400 font-mono mt-1">
                              {data?.todaysProduction?.actualOutput || 0} / {data?.todaysProduction?.targetOutput || 0}
                            </div>
                            <p className="text-[10px] text-cyan-400/80 mt-0.5">
                              {data?.todaysProduction?.achievementPercentage || 0}% Target Rate
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5 bg-gray-950 p-2.5 rounded-lg border border-gray-800">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-400">Daily Target Achievement</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {data?.todaysProduction?.achievementPercentage || 0}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(data?.todaysProduction?.achievementPercentage || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );

                  // 4. ATTENDANCE WIDGET
                  case 'attendance':
                    return (
                      <div
                        key={widget.id}
                        className={`bg-card border border-border p-5 rounded-xl space-y-4 shadow-md ${
                          isFull ? 'lg:col-span-2' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-pink-400" />
                            <h3 className="font-bold text-white text-sm">Attendance</h3>
                            <span className="text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full font-bold">
                              {data?.employeeAttendance?.attendancePercentage || 0}% Present
                            </span>
                          </div>
                          <Link
                            href="/attendance"
                            className="text-[11px] text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1"
                          >
                            Attendance Logs <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-gray-900/80 border border-gray-800 p-2.5 rounded-lg">
                            <span className="text-[10px] text-emerald-300 font-bold uppercase block">Present</span>
                            <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
                              {data?.employeeAttendance?.presentCount || 0}
                            </div>
                          </div>
                          <div className="bg-gray-900/80 border border-gray-800 p-2.5 rounded-lg">
                            <span className="text-[10px] text-red-300 font-bold uppercase block">Absent</span>
                            <div className="text-xl font-extrabold text-red-400 font-mono mt-1">
                              {data?.employeeAttendance?.absentCount || 0}
                            </div>
                          </div>
                          <div className="bg-gray-900/80 border border-gray-800 p-2.5 rounded-lg">
                            <span className="text-[10px] text-pink-300 font-bold uppercase block">Rate</span>
                            <div className="text-xl font-extrabold text-pink-400 font-mono mt-1">
                              {data?.employeeAttendance?.attendancePercentage || 0}%
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">Total Tracked Staff:</span>
                          <span className="font-mono font-bold text-white">
                            {(data?.employeeAttendance?.presentCount || 0) + (data?.employeeAttendance?.absentCount || 0)} Employees
                          </span>
                        </div>
                      </div>
                    );

                  // 5. EQUIPMENT STATUS WIDGET
                  case 'equipment_status':
                    return (
                      <div
                        key={widget.id}
                        className={`bg-card border border-border p-5 rounded-xl space-y-4 shadow-md ${
                          isFull ? 'lg:col-span-2' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-cyan-400" />
                            <h3 className="font-bold text-white text-sm">Equipment Status</h3>
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                              {data?.equipmentAvailability?.availabilityPercentage || 0}% Available
                            </span>
                          </div>
                          <Link
                            href="/equipment"
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                          >
                            Inventory <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                          <div className="p-2.5 bg-gray-900/80 border border-gray-800 rounded-lg">
                            <div className="text-gray-400 text-[10px] uppercase font-semibold">Available</div>
                            <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                              {data?.equipmentStatus?.available || 0}
                            </div>
                          </div>
                          <div className="p-2.5 bg-gray-900/80 border border-gray-800 rounded-lg">
                            <div className="text-gray-400 text-[10px] uppercase font-semibold">Reserved</div>
                            <div className="text-lg font-bold text-purple-400 font-mono mt-1">
                              {data?.equipmentStatus?.reserved || 0}
                            </div>
                          </div>
                          <div className="p-2.5 bg-gray-900/80 border border-gray-800 rounded-lg">
                            <div className="text-gray-400 text-[10px] uppercase font-semibold">In Field</div>
                            <div className="text-lg font-bold text-blue-400 font-mono mt-1">
                              {data?.equipmentStatus?.issued || 0}
                            </div>
                          </div>
                          <div className="p-2.5 bg-gray-900/80 border border-gray-800 rounded-lg">
                            <div className="text-gray-400 text-[10px] uppercase font-semibold">Maintenance</div>
                            <div className="text-lg font-bold text-amber-400 font-mono mt-1">
                              {data?.equipmentStatus?.maintenance || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                  // 6. CALENDAR & SHOOTS WIDGET
                  // 6. UPCOMING OPERATIONAL EVENTS COMMAND WIDGET
                  case 'calendar':
                    return (
                      <div
                        key={widget.id}
                        className={`bg-card border border-border p-5 rounded-xl space-y-4 shadow-md ${
                          isFull ? 'lg:col-span-2' : ''
                        }`}
                      >
                        {/* Widget Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-400" />
                            <h3 className="font-bold text-white text-sm">Upcoming Operational Events</h3>
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                              {(data?.todayIndoorShootsCount || 0) + (data?.todayOutdoorShootsCount || 0)} Today • {data?.upcomingProjects || 0} Upcoming
                            </span>
                          </div>
                          <Link
                            href="/calendar"
                            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 self-start sm:self-auto"
                          >
                            Full Operational Calendar <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        {/* 5 Operational Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border">
                          <button
                            onClick={() => setActiveOperationalTab('TODAY')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                              activeOperationalTab === 'TODAY'
                                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            <span>1. Today's Events ({(data?.todayIndoorShootsCount || 0) + (data?.todayOutdoorShootsCount || 0)})</span>
                          </button>

                          <button
                            onClick={() => setActiveOperationalTab('SHOOTS')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                              activeOperationalTab === 'SHOOTS'
                                ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                            }`}
                          >
                            <Camera className="w-3.5 h-3.5 text-purple-400" />
                            <span>2. Upcoming Shoots ({data?.upcomingProjects || 0})</span>
                          </button>

                          <button
                            onClick={() => setActiveOperationalTab('DEADLINES')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                              activeOperationalTab === 'DEADLINES'
                                ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>3. Upcoming Deadlines ({data?.upcomingDeadlines?.length || 0})</span>
                          </button>

                          <button
                            onClick={() => setActiveOperationalTab('RISKS')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                              activeOperationalTab === 'RISKS'
                                ? 'bg-red-600 text-white border-red-500 shadow-md'
                                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            <span>4. Calendar Conflicts &amp; Risks ({(data?.outdoorAwaitingPermission || 0) + (data?.outdoorAffectedByWeather || 0)})</span>
                          </button>

                          <button
                            onClick={() => setActiveOperationalTab('PROJECTS')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                              activeOperationalTab === 'PROJECTS'
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                            }`}
                          >
                            <Film className="w-3.5 h-3.5 text-emerald-400" />
                            <span>5. Related Projects ({data?.totalActiveProjects || 0})</span>
                          </button>
                        </div>

                        {/* Tab Content Display */}
                        <div className="pt-2 space-y-4">
                          {/* TAB 1: TODAY'S EVENTS */}
                          {activeOperationalTab === 'TODAY' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
                              {/* Indoor Shoots */}
                              <div className="p-4 bg-blue-950/20 border border-blue-800/40 rounded-xl space-y-2.5">
                                <div className="flex justify-between items-center font-bold text-blue-300 text-xs">
                                  <span className="flex items-center gap-1.5">
                                    <Building className="w-3.5 h-3.5" /> Today's Indoor Studio Shoots
                                  </span>
                                  <span className="font-mono bg-blue-900/50 px-2 py-0.5 rounded text-[10px]">
                                    {data?.todayIndoorShootsCount || 0}
                                  </span>
                                </div>
                                {data?.todayIndoorShoots?.length > 0 ? (
                                  <div className="space-y-2">
                                    {data.todayIndoorShoots.slice(0, widget.itemLimit || 4).map((proj: any) => (
                                      <div key={proj.id} className="p-2.5 bg-gray-900/90 rounded-lg border border-gray-800 space-y-1">
                                        <div className="flex items-center justify-between">
                                          <Link href="/projects" className="font-bold text-white text-xs hover:text-blue-400 truncate">
                                            {proj.name}
                                          </Link>
                                          <span className="px-1.5 py-0.2 bg-blue-950 text-blue-300 border border-blue-800 font-mono text-[9px] rounded">
                                            {proj.projectId}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono flex items-center justify-between pt-0.5">
                                          <span>Studio: {proj.indoorDetails?.studioName || proj.shootLocation || 'Main Studio'}</span>
                                          {proj.brand?.name && <span className="text-gray-500">{proj.brand.name}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 italic text-[11px]">No indoor shoots scheduled for today.</p>
                                )}
                              </div>

                              {/* Outdoor Shoots */}
                              <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-2.5">
                                <div className="flex justify-between items-center font-bold text-emerald-300 text-xs">
                                  <span className="flex items-center gap-1.5">
                                    <Camera className="w-3.5 h-3.5 text-emerald-400" /> Today's Outdoor Field Shoots
                                  </span>
                                  <span className="font-mono bg-emerald-900/50 px-2 py-0.5 rounded text-[10px]">
                                    {data?.todayOutdoorShootsCount || 0}
                                  </span>
                                </div>
                                {data?.todayOutdoorShoots?.length > 0 ? (
                                  <div className="space-y-2">
                                    {data.todayOutdoorShoots.slice(0, widget.itemLimit || 4).map((proj: any) => (
                                      <div key={proj.id} className="p-2.5 bg-gray-900/90 rounded-lg border border-gray-800 space-y-1">
                                        <div className="flex items-center justify-between">
                                          <Link href="/projects" className="font-bold text-white text-xs hover:text-emerald-400 truncate">
                                            {proj.name}
                                          </Link>
                                          <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[9px] rounded">
                                            {proj.projectId}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono flex items-center justify-between pt-0.5">
                                          <span>Site: {proj.outdoorDetails?.outdoorLocation || proj.shootLocation || 'Field Location'}</span>
                                          {proj.brand?.name && <span className="text-gray-500">{proj.brand.name}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 italic text-[11px]">No outdoor shoots scheduled for today.</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* TAB 2: UPCOMING SHOOTS */}
                          {activeOperationalTab === 'SHOOTS' && (
                            <div className="space-y-3 animate-in fade-in duration-150">
                              <div className="flex justify-between items-center text-xs text-gray-400 font-mono border-b border-gray-800/80 pb-2">
                                <span className="font-bold text-purple-300">Upcoming Production Shoots Pipeline</span>
                                <span>Showing scheduled shoots</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                {((data?.activeProjectsList || data?.todayIndoorShoots || []) as any[]).length === 0 ? (
                                  <p className="text-gray-500 italic text-xs col-span-full p-4 text-center">No upcoming shoots scheduled in calendar.</p>
                                ) : (
                                  ((data?.activeProjectsList || data?.todayIndoorShoots || []) as any[]).slice(0, widget.itemLimit || 6).map((proj: any) => (
                                    <div key={proj.id} className="p-3.5 bg-gray-900/90 border border-purple-900/40 hover:border-purple-500/50 rounded-xl space-y-2 transition-colors">
                                      <div className="flex items-center justify-between">
                                        <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 font-mono text-[9px] rounded font-bold">
                                          {proj.shootType || 'INDOOR'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-mono">
                                          {proj.shootDate ? new Date(proj.shootDate).toLocaleDateString() : 'Upcoming'}
                                        </span>
                                      </div>
                                      <h4 className="font-bold text-white text-xs truncate">{proj.name}</h4>
                                      <div className="text-[10px] text-gray-400 font-mono space-y-0.5 pt-1 border-t border-gray-800">
                                        <div>Location: <strong className="text-gray-200">{proj.shootLocation || 'Studio Location'}</strong></div>
                                        <div>Client/Brand: <strong className="text-purple-300">{proj.client?.name || proj.brand?.name || 'General Brand'}</strong></div>
                                      </div>
                                      <div className="pt-1 flex justify-end">
                                        <Link href="/projects" className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1">
                                          View Project Details →
                                        </Link>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* TAB 3: UPCOMING DEADLINES */}
                          {activeOperationalTab === 'DEADLINES' && (
                            <div className="space-y-3 animate-in fade-in duration-150">
                              <div className="flex justify-between items-center text-xs text-gray-400 font-mono border-b border-gray-800/80 pb-2">
                                <span className="font-bold text-amber-300">Deliverable Due Dates &amp; Task Target Deadlines</span>
                                <span>Next 7 Days</span>
                              </div>
                              <div className="space-y-2 text-xs">
                                {!data?.upcomingDeadlines || data.upcomingDeadlines.length === 0 ? (
                                  <p className="text-gray-500 italic text-xs p-4 text-center">No upcoming deadlines due in the next 7 days.</p>
                                ) : (
                                  data.upcomingDeadlines.slice(0, widget.itemLimit || 5).map((item: any) => (
                                    <div key={item.id} className="p-3 bg-gray-900/90 border border-gray-800 hover:border-amber-500/40 rounded-xl flex items-center justify-between gap-3 transition-colors">
                                      <div className="space-y-0.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-[9px] text-amber-400 font-bold bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded">
                                            {item.code || 'DEADLINE'}
                                          </span>
                                          <h5 className="font-bold text-white text-xs truncate">{item.title}</h5>
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono">
                                          Client: <strong className="text-gray-300">{item.clientName || 'General Client'}</strong> • Status: <strong className="text-amber-300">{item.status}</strong>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded font-mono text-[10px] font-bold block">
                                          📅 {new Date(item.dueDate).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* TAB 4: CALENDAR CONFLICTS & RISKS */}
                          {activeOperationalTab === 'RISKS' && (
                            <div className="space-y-3 animate-in fade-in duration-150">
                              <div className="flex justify-between items-center text-xs text-gray-400 font-mono border-b border-gray-800/80 pb-2">
                                <span className="font-bold text-red-400">Operational Scheduling Conflicts &amp; Advisory Risks</span>
                                <span>Conflict Prevention Engine</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="p-3 bg-red-950/20 border border-red-800/50 rounded-xl space-y-1.5">
                                  <span className="text-[11px] text-red-300 font-bold flex items-center gap-1.5">
                                    <ShieldAlert className="w-4 h-4 text-red-400" /> Outdoor Permit Approvals Pending
                                  </span>
                                  <div className="flex items-center justify-between font-mono pt-1">
                                    <span className="text-gray-400">Pending Site Clearances:</span>
                                    <strong className="text-red-400 text-sm font-bold">{data?.outdoorAwaitingPermission || 0} Locations</strong>
                                  </div>
                                  <p className="text-[10px] text-gray-400">Shoots cannot proceed until outdoor permits are approved by authorities.</p>
                                </div>

                                <div className="p-3 bg-cyan-950/20 border border-cyan-800/50 rounded-xl space-y-1.5">
                                  <span className="text-[11px] text-cyan-300 font-bold flex items-center gap-1.5">
                                    <CloudRain className="w-4 h-4 text-cyan-400" /> Outdoor Weather Risk Advisories
                                  </span>
                                  <div className="flex items-center justify-between font-mono pt-1">
                                    <span className="text-gray-400">Advisory Sites:</span>
                                    <strong className="text-cyan-400 text-sm font-bold">{data?.outdoorAffectedByWeather || 0} Sites</strong>
                                  </div>
                                  <p className="text-[10px] text-gray-400">Risk of rain or extreme heat flagged for scheduled outdoor locations.</p>
                                </div>

                                <div className="p-3 bg-amber-950/20 border border-amber-800/50 rounded-xl space-y-1.5">
                                  <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1.5">
                                    <Camera className="w-4 h-4 text-amber-400" /> Equipment Availability &amp; Repairs
                                  </span>
                                  <div className="flex items-center justify-between font-mono pt-1">
                                    <span className="text-gray-400">Under Repair / Maintenance:</span>
                                    <strong className="text-amber-300 text-sm font-bold">
                                      {(equipmentStats?.underMaintenance || 0) + (equipmentStats?.damaged || 0)} Assets
                                    </strong>
                                  </div>
                                  <p className="text-[10px] text-gray-400">Asset double-booking prevention and repair dispatch active.</p>
                                </div>

                                <div className="p-3 bg-purple-950/20 border border-purple-800/50 rounded-xl space-y-1.5">
                                  <span className="text-[11px] text-purple-300 font-bold flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-purple-400" /> Staff Workload Over-Allocations
                                  </span>
                                  <div className="flex items-center justify-between font-mono pt-1">
                                    <span className="text-gray-400">Overloaded Team Members:</span>
                                    <strong className="text-purple-300 text-sm font-bold">
                                      {safeCapacity.filter((e) => e.status === 'Overloaded' || e.isOverloaded).length} Staff
                                    </strong>
                                  </div>
                                  <p className="text-[10px] text-gray-400">Use Smart Recommendations to reassign tasks to available staff.</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* TAB 5: RELATED PROJECTS & PIPELINE */}
                          {activeOperationalTab === 'PROJECTS' && (
                            <div className="space-y-3 animate-in fade-in duration-150">
                              <div className="flex justify-between items-center text-xs text-gray-400 font-mono border-b border-gray-800/80 pb-2">
                                <span className="font-bold text-emerald-300">Operational Shoot Projects &amp; Related Entity Links</span>
                                <Link href="/projects" className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1">
                                  Go to Projects Directory →
                                </Link>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {((data?.activeProjectsList || data?.todayIndoorShoots || []) as any[]).length === 0 ? (
                                  <p className="text-gray-500 italic text-xs col-span-full p-4 text-center">No related operational projects found.</p>
                                ) : (
                                  ((data?.activeProjectsList || data?.todayIndoorShoots || []) as any[]).slice(0, widget.itemLimit || 6).map((proj: any) => (
                                    <div key={proj.id} className="p-3 bg-gray-900/90 border border-gray-800 hover:border-emerald-500/40 rounded-xl space-y-2 transition-colors">
                                      <div className="flex items-center justify-between">
                                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[9px] font-bold rounded">
                                          {proj.projectId || 'PRJ-001'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-blue-950 text-blue-300 border border-blue-800 uppercase">
                                          {proj.status?.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      <h4 className="font-bold text-white text-xs truncate">{proj.name}</h4>
                                      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                                        {proj.client?.name && (
                                          <span className="bg-gray-950 px-2 py-0.5 rounded text-gray-300 border border-gray-800">
                                            🏢 {proj.client.name}
                                          </span>
                                        )}
                                        {proj.brand?.name && (
                                          <span className="bg-gray-950 px-2 py-0.5 rounded text-purple-300 border border-gray-800">
                                            🏷️ {proj.brand.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );

                  // 7. EMPLOYEE CAPACITY WIDGET
                  case 'employee_capacity':
                    return (
                      <div
                        key={widget.id}
                        className={`bg-card border border-border p-5 rounded-xl space-y-4 shadow-md ${
                          isFull ? 'lg:col-span-2' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-purple-400" />
                            <h3 className="font-bold text-white text-sm">Employee Capacity & Workload</h3>
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                              {safeCapacity.length} Active Staff ({data?.capacityUtilization?.utilizationPercentage || 0}% Utilized)
                            </span>
                          </div>
                          <Link
                            href="/tasks"
                            className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                          >
                            Reassign & Manage <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          {safeCapacity.length === 0 ? (
                            <p className="text-xs text-gray-400 col-span-full">No capacity workload metrics available.</p>
                          ) : (
                            safeCapacity.slice(0, widget.itemLimit || 6).map((emp) => (
                              <div
                                key={emp.userId}
                                className={`p-3.5 rounded-xl border transition-colors ${
                                  emp.status === 'Overloaded'
                                    ? 'bg-red-950/20 border-red-800/40'
                                    : 'bg-gray-900/60 border-gray-800'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={emp.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                                      alt={emp.name}
                                      className="w-7 h-7 rounded-full object-cover border border-gray-700"
                                    />
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-bold text-white truncate">{emp.name}</h4>
                                      <p className="text-[9px] text-gray-400 truncate">{emp.designation}</p>
                                    </div>
                                  </div>

                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                      emp.status === 'Overloaded'
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}
                                  >
                                    {emp.status}
                                  </span>
                                </div>

                                <div className="space-y-1 mt-2">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-gray-400">
                                      {emp.assignedHours}h / {emp.capacityHours}h
                                    </span>
                                    <span
                                      className={emp.workloadPercentage > 100 ? 'text-red-400 font-bold' : 'text-gray-300'}
                                    >
                                      {emp.workloadPercentage}%
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        emp.workloadPercentage > 100 ? 'bg-red-500' : 'bg-blue-500'
                                      }`}
                                      style={{ width: `${Math.min(emp.workloadPercentage || 0, 100)}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-2.5">
                                    <Link
                                      href={`/tasks?employeeId=${emp.userId}`}
                                      className="flex-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                                    >
                                      <Search className="w-3 h-3 text-blue-400" />
                                      <span>View Work Details</span>
                                    </Link>

                                    {(emp.status === 'Overloaded' || emp.workloadPercentage > 100) && (role === 'MEDIA_MANAGER' || (role as string) === 'ADMIN') && (
                                      <button
                                        onClick={() => setSelectedOverloadedUserId(emp.userId)}
                                        className="flex-1 px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                                      >
                                        <Sparkles className="w-3 h-3 text-amber-400" />
                                        <span>Reassign</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );

                  // 8. RECENT ACTIVITIES WIDGET
                  case 'recent_activities':
                    return (
                      <div
                        key={widget.id}
                        className={`bg-card border border-border p-5 rounded-xl space-y-4 shadow-md ${
                          isFull ? 'lg:col-span-2' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-2">
                            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                            <h3 className="font-bold text-white text-sm">Recent Activities & Audit Trail</h3>
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                              {data?.recentActivity?.length || 0} Events
                            </span>
                          </div>
                          <Link
                            href="/activity"
                            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                          >
                            Full Audit Log <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="space-y-2">
                          {!data?.recentActivity || data.recentActivity.length === 0 ? (
                            <p className="text-gray-500 italic text-[11px] p-3 text-center">
                              No recent activity logs recorded.
                            </p>
                          ) : (
                            data.recentActivity.slice(0, widget.itemLimit || 6).map((log: any) => (
                              <div
                                key={log.id}
                                className="p-2.5 bg-gray-900/60 border border-gray-800 rounded-lg flex items-start gap-3"
                              >
                                <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                                  {log.user?.name ? log.user.name.charAt(0) : 'S'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-200">{log.user?.name}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">{log.description}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );

                  default:
                    return null;
                }
              })}
          </div>
        )}

        {/* Quick Operations shortcuts */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h3 className="text-sm font-bold text-white">Quick Operations Shortcuts</h3>
            <span className="text-[10px] text-gray-500">Fast access to key media workflows</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/calendar"
              className="p-3 bg-gray-900 border border-gray-800 hover:border-blue-500 rounded-lg flex items-center justify-between text-xs font-semibold text-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Schedule Shoot</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-500" />
            </Link>

            <Link
              href="/approvals"
              className="p-3 bg-gray-900 border border-gray-800 hover:border-purple-500 rounded-lg flex items-center justify-between text-xs font-semibold text-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                <span>Approval Queue ({data?.pendingApprovals || 0})</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-500" />
            </Link>

            <Link
              href="/equipment"
              className="p-3 bg-gray-900 border border-gray-800 hover:border-cyan-500 rounded-lg flex items-center justify-between text-xs font-semibold text-gray-200 transition-colors"
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

      {/* Configure Dashboard Widgets Modal */}
      <ConfigureWidgetsModal
        isOpen={showWidgetConfigModal}
        onClose={() => setShowWidgetConfigModal(false)}
        widgets={widgetsConfig}
        onSave={handleSaveWidgetsConfig}
        isMediaManager={role === 'MEDIA_MANAGER' || (role as string) === 'ADMIN'}
      />

      {/* Smart Reassignment Recommendations Modal for Overloaded Employees */}
      <ReassignmentRecommendationsModal
        isOpen={Boolean(selectedOverloadedUserId)}
        onClose={() => setSelectedOverloadedUserId(null)}
        overloadedUserId={selectedOverloadedUserId}
        onReassignmentComplete={() => {
          // reload capacity
          fetchApi('/tasks/capacity/overview').then((res) => setCapacity(Array.isArray(res) ? res : []));
          fetchApi('/reports/dashboard').then((res) => setData(res || {}));
        }}
      />

      {/* Exceptional Operational Conditions Command Center Modal (Media Manager) */}
      <ExceptionalOperationalConditionsModal
        isOpen={showOperationalConditionsModal}
        onClose={() => setShowOperationalConditionsModal(false)}
        systemAlertsData={systemAlerts}
        onRefresh={handleScanSystemAlerts}
        onOpenReassignmentModal={() => {
          setShowOperationalConditionsModal(false);
          // Pick first active user or open generic
          const firstOverload = systemAlerts?.alerts?.find((a: any) => a.category === 'STAFF_CAPACITY');
          if (firstOverload?.metrics?.employeeId) {
            setSelectedOverloadedUserId(firstOverload.metrics.employeeId);
          }
        }}
      />

      {/* Permanent Operational Activity History Center Modal */}
      <PermanentActivityHistoryModal
        isOpen={showPermanentActivityHistoryModal}
        onClose={() => setShowPermanentActivityHistoryModal(false)}
      />
    </div>
  );
}

