'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wrench,
  FileCheck,
  FileText,
  Palette,
  Film,
  Clock,
  CheckSquare,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Activity,
  Bell,
  Camera,
  ChevronRight,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
  MessageSquare,
  X,
  Send,
  UserCheck,
  Eye,
  Undo2,
  CornerUpLeft,
  FileSpreadsheet,
  Download,
  Share2,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import MyFavoritesWidget from './MyFavoritesWidget';
import { RecentlyAccessedWidget } from './RecentlyAccessedWidget';

interface TechnicalManagerDashboardProps {
  user: any;
}

export default function TechnicalManagerDashboard({ user }: TechnicalManagerDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewTab, setReviewTab] = useState<'ALL' | 'SCRIPTS' | 'GRAPHICS' | 'DELIVERABLES' | 'ASSIGNED'>('ALL');

  // Active Technical Review Modal state
  const [activeReviewItem, setActiveReviewItem] = useState<{
    id: string;
    type: 'SCRIPT' | 'GRAPHIC' | 'APPROVAL';
    code: string;
    title: string;
    description?: string;
    status: string;
    projectId?: string;
    projectName?: string;
    submittedBy?: string;
    createdAt?: string;
    fileUrl?: string;
    rawData?: any;
  } | null>(null);

  // Technical remark composer
  const [technicalRemark, setTechnicalRemark] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadTechnicalDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/reports/technical-dashboard');
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load technical manager dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTechnicalDashboard();
  }, []);

  // Action 5: Add Technical Remarks
  const handleAddTechnicalRemark = async () => {
    if (!activeReviewItem || !technicalRemark.trim()) return;
    try {
      setActionLoading('remark');
      await fetchApi('/communications', {
        method: 'POST',
        body: JSON.stringify({
          entityType: activeReviewItem.type === 'SCRIPT' ? 'SCRIPT' : activeReviewItem.type === 'GRAPHIC' ? 'GRAPHIC_REQUIREMENT' : 'APPROVAL',
          entityId: activeReviewItem.id,
          subject: `Technical Remark: ${activeReviewItem.code || activeReviewItem.title}`,
          content: `[TECHNICAL REMARK by ${user?.name || 'Technical Manager'}]: ${technicalRemark.trim()}`,
          type: 'NOTE',
          isRemark: true,
        }),
      });
      setActionSuccessMessage('Technical remark logged to permanent history');
      setTechnicalRemark('');
      setTimeout(() => setActionSuccessMessage(null), 3000);
      loadTechnicalDashboard();
    } catch (err) {
      console.error('Failed to add technical remark:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Action 6: Approve Technical Review
  const handleApproveTechnicalReview = async () => {
    if (!activeReviewItem) return;
    try {
      setActionLoading('approve');
      if (activeReviewItem.type === 'GRAPHIC') {
        await fetchApi(`/graphic-reqs/${activeReviewItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'WAITING_FOR_MEDIA_REVIEW' }),
        });
      } else if (activeReviewItem.type === 'SCRIPT') {
        await fetchApi(`/scripts/${activeReviewItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'WAITING_FOR_MEDIA_REVIEW', approvalStatus: 'TECHNICAL_REVIEW_APPROVED' }),
        });
      } else if (activeReviewItem.type === 'APPROVAL') {
        await fetchApi(`/approvals/${activeReviewItem.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'APPROVED', comments: 'Approved by Technical Manager' }),
        });
      }
      setActionSuccessMessage('Technical Review Approved! Item advanced to Media Manager Review stage.');
      setTimeout(() => {
        setActionSuccessMessage(null);
        setActiveReviewItem(null);
        loadTechnicalDashboard();
      }, 1500);
    } catch (err) {
      console.error('Failed to approve technical review:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Action 7: Reject / Request Changes
  const handleRejectRequestChanges = async () => {
    if (!activeReviewItem) return;
    const notes = technicalRemark.trim() || 'Technical revisions required. Please review technical feedback notes.';
    try {
      setActionLoading('reject');
      if (activeReviewItem.type === 'GRAPHIC') {
        await fetchApi(`/graphic-reqs/${activeReviewItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'REVISION_REQUIRED', remark: notes }),
        });
      } else if (activeReviewItem.type === 'SCRIPT') {
        await fetchApi(`/scripts/${activeReviewItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'REVISION_REQUIRED', remarks: notes }),
        });
      } else if (activeReviewItem.type === 'APPROVAL') {
        await fetchApi(`/approvals/${activeReviewItem.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'REJECTED', comments: notes }),
        });
      }
      setActionSuccessMessage('Revision requested. Item marked as Revision Required.');
      setTimeout(() => {
        setActionSuccessMessage(null);
        setActiveReviewItem(null);
        loadTechnicalDashboard();
      }, 1500);
    } catch (err) {
      console.error('Failed to request changes:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Action 8: Send Work Back into Production
  const handleSendBackToProduction = async () => {
    if (!activeReviewItem) return;
    const notes = technicalRemark.trim() || 'Work sent back to production for required technical corrections.';
    try {
      setActionLoading('send_back');
      if (activeReviewItem.type === 'GRAPHIC') {
        await fetchApi(`/graphic-reqs/${activeReviewItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'IN_PROGRESS', remark: notes }),
        });
      } else if (activeReviewItem.type === 'SCRIPT') {
        await fetchApi(`/scripts/${activeReviewItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'IN_PROGRESS', remarks: notes }),
        });
      } else if (activeReviewItem.type === 'APPROVAL') {
        await fetchApi(`/approvals/${activeReviewItem.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'REJECTED', comments: notes }),
        });
      }
      setActionSuccessMessage('Work sent back into production! Reassigned to production staff with technical corrections required.');
      setTimeout(() => {
        setActionSuccessMessage(null);
        setActiveReviewItem(null);
        loadTechnicalDashboard();
      }, 1500);
    } catch (err) {
      console.error('Failed to send work back to production:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-zinc-400 font-mono">
          Loading Technical Operations Command & Review Center...
        </p>
      </div>
    );
  }

  const metrics = data?.metricsSummary || {
    totalWaitingForTechnicalReviewCount: 0,
    pendingReviewsCount: 0,
    scriptsAwaitingCount: 0,
    graphicsAwaitingCount: 0,
    projectsAttentionCount: 0,
    upcomingDeadlinesCount: 0,
    activeTechnicalTasksCount: 0,
    equipmentMaintenanceCount: 0,
  };

  const pendingApprovals = data?.pendingTechnicalReviews || [];
  const scriptsAwaiting = data?.scriptsAwaitingTechnicalReview || [];
  const graphicsAwaiting = data?.graphicRequirementsAwaitingTechnicalReview || [];
  const projectsAttention = data?.projectsRequiringTechnicalAttention || [];
  const upcomingDeadlines = data?.upcomingTechnicalDeadlines || [];
  const technicalTasks = data?.technicalTasks || [];
  const rawNotifications = data?.relevantNotifications || [];
  const notifications = rawNotifications.filter(
    (n: any) =>
      !['ALERT_EMPLOYEE_OVER_CAPACITY', 'STAFF_CAPACITY'].includes(n.eventType) &&
      n.entityType !== 'ATTENDANCE' &&
      !n.title?.includes('Employee Over Capacity') &&
      !n.message?.includes('Administrative workload rebalancing')
  );
  const activityLog = data?.recentTechnicalActivity || [];

  const totalWaitingCount =
    metrics.totalWaitingForTechnicalReviewCount ||
    pendingApprovals.length + scriptsAwaiting.length + graphicsAwaiting.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-2xl text-emerald-400 shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                Technical Operations Command & Review Center
              </h1>
              <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                Technical Manager Workspace
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Work waiting for technical review, script & graphic sign-offs, production readiness, and technical deadlines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTechnicalDashboard}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Refresh Review Hub</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Counter Bar (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl space-y-1 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Waiting Tech Review</span>
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{totalWaitingCount}</div>
          <span className="text-[10px] text-emerald-300 font-bold block">Requires Action</span>
        </div>

        <div className="p-3.5 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Scripts Awaiting</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-300 font-mono">{metrics.scriptsAwaitingCount}</div>
          <span className="text-[10px] text-purple-400 font-semibold block">Script Tech Review</span>
        </div>

        <div className="p-3.5 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Graphics Awaiting</span>
            <Palette className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-300 font-mono">{metrics.graphicsAwaitingCount}</div>
          <span className="text-[10px] text-amber-400 font-semibold block">Stage 2: Tech Review</span>
        </div>

        <div className="p-3.5 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Projects Attention</span>
            <Film className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-black text-blue-300 font-mono">{metrics.projectsAttentionCount}</div>
          <span className="text-[10px] text-blue-400 font-semibold block">Technical Readiness</span>
        </div>

        <div className="p-3.5 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tech Deadlines</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-300 font-mono">{metrics.upcomingDeadlinesCount}</div>
          <span className="text-[10px] text-rose-400 font-semibold block">Due Next 7 Days</span>
        </div>

        <div className="p-3.5 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Technical Tasks</span>
            <CheckSquare className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-300 font-mono">{metrics.activeTechnicalTasksCount}</div>
          <span className="text-[10px] text-cyan-400 font-semibold block">In Production</span>
        </div>
      </div>

      {/* Primary Section: WAITING FOR TECHNICAL REVIEW COMMAND HUB */}
      <div className="bg-zinc-950 border-2 border-emerald-800/80 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800 shrink-0">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wide uppercase">
                  ⚡ Waiting for Technical Review Command Hub
                </h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                  {totalWaitingCount} Items Awaiting Your Review
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Identify and sign off on Scripts, Graphic Requirements (5-Stage Workflow), Production Deliverables, and Assigned Review Requests
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-[11px] overflow-x-auto">
            <button
              onClick={() => setReviewTab('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                reviewTab === 'ALL'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Items ({totalWaitingCount})
            </button>
            <button
              onClick={() => setReviewTab('SCRIPTS')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                reviewTab === 'SCRIPTS'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Scripts ({scriptsAwaiting.length})
            </button>
            <button
              onClick={() => setReviewTab('GRAPHICS')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                reviewTab === 'GRAPHICS'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Graphic Reqs ({graphicsAwaiting.length})
            </button>
            <button
              onClick={() => setReviewTab('DELIVERABLES')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                reviewTab === 'DELIVERABLES'
                  ? 'bg-blue-950 text-blue-300 border border-blue-800 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign-Offs ({pendingApprovals.length})
            </button>
          </div>
        </div>

        {/* Review Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Graphic Requirements Awaiting Technical Review (5-stage Workflow Visualizer) */}
          {(reviewTab === 'ALL' || reviewTab === 'GRAPHICS') &&
            graphicsAwaiting.map((gr: any) => (
              <div
                key={gr.id}
                className="bg-zinc-900/80 hover:bg-zinc-900 border border-amber-900/60 p-4 rounded-2xl space-y-3 transition-all flex flex-col justify-between shadow-lg group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 uppercase flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 text-amber-400" />
                      Graphic Req • Stage 2 Review
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">
                      {gr.requirementId || 'GRAPHIC'}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-xs leading-snug group-hover:text-amber-300 transition-colors">
                    {gr.name}
                  </h4>

                  <p className="text-[11px] text-zinc-400">
                    Project: <span className="text-zinc-200 font-medium">{gr.project?.name || 'Standalone'}</span>
                  </p>

                  {/* 5-Stage Graphic Requirement Workflow Progress Bar */}
                  <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-mono">
                      <span className="text-zinc-400 uppercase font-bold">Defined Workflow Stage:</span>
                      <span className="text-amber-400 font-bold">Stage 2: Technical Review</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1 pt-0.5">
                      <div className="h-1.5 rounded-full bg-emerald-500" title="Stage 1: Production Complete ✓" />
                      <div className="h-1.5 rounded-full bg-amber-400 animate-pulse" title="Stage 2: Technical Review (⚡ ACTIVE)" />
                      <div className="h-1.5 rounded-full bg-zinc-800" title="Stage 3: Media Manager Review" />
                      <div className="h-1.5 rounded-full bg-zinc-800" title="Stage 4: Client Confirmation" />
                      <div className="h-1.5 rounded-full bg-zinc-800" title="Stage 5: Completed" />
                    </div>

                    <div className="text-[9px] text-zinc-500 font-mono text-center pt-0.5">
                      Production ✓ → <strong className="text-amber-300">Technical Review ⚡</strong> → Media Mgr → Client → Done
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2.5 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-1.5">
                  <button
                    onClick={() =>
                      setActiveReviewItem({
                        id: gr.id,
                        type: 'GRAPHIC',
                        code: gr.requirementId || 'GRAPHIC',
                        title: gr.name,
                        description: gr.description,
                        status: gr.status,
                        projectId: gr.projectId,
                        projectName: gr.project?.name,
                        rawData: gr,
                      })
                    }
                    className="w-full text-xs font-bold py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/80 flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span>Perform Technical Review</span>
                  </button>
                </div>
              </div>
            ))}

          {/* 2. Scripts Awaiting Technical Review */}
          {(reviewTab === 'ALL' || reviewTab === 'SCRIPTS') &&
            scriptsAwaiting.map((sc: any) => (
              <div
                key={sc.id}
                className="bg-zinc-900/80 hover:bg-zinc-900 border border-purple-900/60 p-4 rounded-2xl space-y-3 transition-all flex flex-col justify-between shadow-lg group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 uppercase flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      Script Technical Review
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 font-bold">
                      {sc.scriptId || 'SCRIPT'}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-xs leading-snug group-hover:text-purple-300 transition-colors">
                    {sc.name}
                  </h4>

                  <p className="text-[11px] text-zinc-400">
                    Project: <span className="text-zinc-200 font-medium">{sc.project?.name || 'Independent'}</span>
                  </p>

                  <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800 text-[10px] text-zinc-400">
                    Awaiting technical validation of shooting script format, scene breakdown & technical requirements.
                  </div>
                </div>

                <div className="pt-2.5 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-1.5">
                  <button
                    onClick={() =>
                      setActiveReviewItem({
                        id: sc.id,
                        type: 'SCRIPT',
                        code: sc.scriptId || 'SCRIPT',
                        title: sc.name,
                        description: sc.description,
                        status: sc.status,
                        projectId: sc.projectId,
                        projectName: sc.project?.name,
                        rawData: sc,
                      })
                    }
                    className="w-full text-xs font-bold py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80 flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <Wrench className="w-3.5 h-3.5 text-purple-400" />
                    <span>Perform Technical Review</span>
                  </button>
                </div>
              </div>
            ))}

          {/* 3. Pending Technical Sign-offs & Deliverable Approvals */}
          {(reviewTab === 'ALL' || reviewTab === 'DELIVERABLES' || reviewTab === 'ASSIGNED') &&
            pendingApprovals.map((app: any) => (
              <div
                key={app.id}
                className="bg-zinc-900/80 hover:bg-zinc-900 border border-blue-900/60 p-4 rounded-2xl space-y-3 transition-all flex flex-col justify-between shadow-lg group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 uppercase">
                      Technical Sign-Off Request
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-xs leading-snug group-hover:text-blue-300 transition-colors">
                    {app.title || app.project?.name || 'Deliverable Sign-Off'}
                  </h4>

                  <p className="text-[11px] text-zinc-400 line-clamp-2">
                    {app.description || 'Pending Technical Manager quality sign-off.'}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-1.5">
                  <button
                    onClick={() =>
                      setActiveReviewItem({
                        id: app.id,
                        type: 'APPROVAL',
                        code: 'APPROVAL',
                        title: app.title || 'Technical Sign-off',
                        description: app.description,
                        status: app.status,
                        projectId: app.projectId,
                        projectName: app.project?.name,
                        submittedBy: app.requestedBy?.name,
                        createdAt: app.createdAt,
                        rawData: app,
                      })
                    }
                    className="w-full text-xs font-bold py-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/80 flex items-center justify-center gap-1.5 shadow-md transition-all"
                  >
                    <Wrench className="w-3.5 h-3.5 text-blue-400" />
                    <span>Perform Technical Review</span>
                  </button>
                </div>
              </div>
            ))}

          {totalWaitingCount === 0 && (
            <div className="col-span-full py-12 text-center bg-zinc-900/20 border border-zinc-800/80 rounded-2xl space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">All Technical Reviews Complete</h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No scripts, graphic requirements, production deliverables, or review requests are currently awaiting technical review.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User-Specific Favorites & Recently Accessed Grid */}
      <div className="grid grid-cols-1 gap-6">
        <MyFavoritesWidget />
        <RecentlyAccessedWidget />
      </div>

      {/* Secondary Grid: Projects Requiring Attention & Upcoming Technical Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects Requiring Technical Involvement (Read-Only Technical Visibility) */}
        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Film className="w-4.5 h-4.5 text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  Projects Requiring Technical Involvement ({projectsAttention.length})
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono">Read-Only Technical Status, Progress & Task Audit</p>
              </div>
            </div>
            <Link href="/projects" className="text-[11px] text-blue-400 hover:text-blue-300 font-bold">
              View Projects List →
            </Link>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {projectsAttention.length > 0 ? (
              projectsAttention.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-all space-y-2 shadow-sm"
                >
                  {/* Top Line: Project Code, Name & Status Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-blue-400 font-bold px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800">
                        {p.projectId}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate max-w-[180px]">{p.name}</h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Project Status */}
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 uppercase">
                        {p.status}
                      </span>

                      {/* Technical Review Status */}
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                          p.hasPendingTechApproval || p.technicalReviewStatus === 'WAITING_FOR_TECHNICAL_REVIEW'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800 animate-pulse'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {p.hasPendingTechApproval ? '⚡ Tech Review Pending' : 'Tech Readiness OK'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar & Assigned Technical Work Summary */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-400">Technical Progress:</span>
                      <span className="text-blue-400 font-bold">{p.progressPercentage || 35}% Complete</span>
                    </div>

                    <div className="w-full bg-zinc-950 rounded-full h-1.5 border border-zinc-800 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, p.progressPercentage || 35))}%` }}
                      />
                    </div>

                    {/* Assigned Technical Work Pills */}
                    {p.assignedTechnicalWork && p.assignedTechnicalWork.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[9px] text-zinc-500 font-mono">Assigned Tech Work:</span>
                        {p.assignedTechnicalWork.map((taskTitle: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 text-cyan-300 border border-zinc-800 truncate max-w-[140px]"
                          >
                            {taskTitle}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer: Upcoming Target Deadline & Read-Only Action */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="font-mono">
                      Target Date: <strong className="text-zinc-300">{p.shootDate ? new Date(p.shootDate).toLocaleDateString() : 'Scheduled'}</strong>
                    </span>

                    <Link
                      href={`/projects/${p.id}`}
                      className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
                    >
                      <span>Inspect Project Technical Status</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500">
                No active projects require technical involvement.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Technical Deadlines */}
        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-rose-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Upcoming Technical Deadlines ({upcomingDeadlines.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Due within 7 Days</span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((dl: any) => (
                <div
                  key={dl.id}
                  className="p-3 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-rose-400 font-bold">{dl.code}</span>
                      <span className="text-xs font-bold text-white truncate max-w-[200px]">{dl.title}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Target Date: <span className="text-rose-300 font-mono font-bold">{new Date(dl.dueDate).toLocaleDateString()}</span>
                    </p>
                  </div>

                  <Link
                    href={`/projects/${dl.id}`}
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-800/60 px-2.5 py-1 rounded-lg"
                  >
                    Inspect Deadline
                  </Link>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500">
                No upcoming technical deadlines due within 7 days.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Technical Tasks & Relevant Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technical Tasks */}
        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4.5 h-4.5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Technical Production Tasks ({technicalTasks.length})
              </h3>
            </div>
            <Link href="/tasks" className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold">
              Task Board →
            </Link>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {technicalTasks.length > 0 ? (
              technicalTasks.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-cyan-400 font-bold">{t.taskId}</span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800">
                      {t.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{t.title}</h4>
                  <p className="text-[10px] text-zinc-400">
                    Project: <span className="text-zinc-200">{t.project?.name || 'System Task'}</span>
                  </p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500">
                No active production tasks assigned.
              </div>
            )}
          </div>
        </div>

        {/* Relevant Notifications */}
        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4.5 h-4.5 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Relevant Notifications ({notifications.length})
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  className="p-3 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{n.title}</span>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{n.message}</p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500">
                No new technical notifications.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Technical Activity Stream */}
      <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Recent Technical Activity History
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">Technical Operations Stream</span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {activityLog.length > 0 ? (
            activityLog.map((log: any) => (
              <div
                key={log.id}
                className="p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs text-zinc-300"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-white uppercase shrink-0">
                    {log.user?.name ? log.user.name.substring(0, 2) : 'TC'}
                  </div>
                  <span className="font-bold text-white text-xs shrink-0">{log.user?.name || 'Tech Staff'}</span>
                  <span className="text-zinc-400 truncate">{log.description}</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 shrink-0 ml-2">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-zinc-500">
              No recent technical activity logged.
            </div>
          )}
        </div>
      </div>

      {/* FULL TECHNICAL REVIEW & ASSET INSPECTOR MODAL (All 8 Actions) */}
      {activeReviewItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border-2 border-emerald-700/80 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-xl shrink-0">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {activeReviewItem.code}
                    </span>
                    <h3 className="text-base font-bold text-white tracking-wide truncate max-w-md">
                      {activeReviewItem.title}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Technical Review Control Panel • Project: <span className="text-zinc-200 font-semibold">{activeReviewItem.projectName || 'Internal'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveReviewItem(null)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification message feedback */}
            {actionSuccessMessage && (
              <div className="p-3 bg-emerald-950 border-b border-emerald-800 text-emerald-300 text-xs font-bold flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{actionSuccessMessage}</span>
                </div>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* 5-Stage Graphic Requirement Workflow Visualizer */}
              {activeReviewItem.type === 'GRAPHIC' && (
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-bold uppercase">Graphic Requirement Defined Workflow:</span>
                    <span className="text-amber-400 font-bold">Stage 2: Technical Review</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 pt-1 text-[10px] text-center font-mono font-bold">
                    <div className="p-2 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800">
                      1. Production ✓
                    </div>
                    <div className="p-2 rounded-lg bg-amber-950 text-amber-300 border border-amber-700 animate-pulse">
                      2. Technical Review ⚡
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950 text-zinc-500 border border-zinc-800">
                      3. Media Mgr Review
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950 text-zinc-500 border border-zinc-800">
                      4. Client Confirm
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950 text-zinc-500 border border-zinc-800">
                      5. Completed
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION 4: Inspect Submitted Work Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" /> Action 4: Inspect Submitted Work & Specifications
                </h4>

                <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2 text-xs">
                  <div>
                    <strong className="text-zinc-400 font-mono">Description / Specifications:</strong>
                    <p className="text-zinc-200 mt-1 leading-relaxed whitespace-pre-wrap">
                      {activeReviewItem.description || 'No detailed specifications submitted. Review submitted assets below.'}
                    </p>
                  </div>

                  {activeReviewItem.submittedBy && (
                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Submitted by: <strong className="text-white">{activeReviewItem.submittedBy}</strong></span>
                      {activeReviewItem.createdAt && (
                        <span>Date: <strong className="text-zinc-300 font-mono">{new Date(activeReviewItem.createdAt).toLocaleString()}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION 5: Add Technical Remarks Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" /> Action 5: Add Technical Remarks & Revisions Feedback
                </h4>

                <div className="space-y-2">
                  <textarea
                    value={technicalRemark}
                    onChange={(e) => setTechnicalRemark(e.target.value)}
                    placeholder="Type technical feedback notes, format specifications, resolution notes, or required corrections..."
                    rows={3}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs rounded-xl p-3 outline-none focus:border-emerald-500"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddTechnicalRemark}
                      disabled={!technicalRemark.trim() || actionLoading === 'remark'}
                      className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 font-bold text-xs rounded-xl border border-zinc-700 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Log Technical Remark</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 8-ACTION CONTROL PANEL GRID */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" /> Technical Authority Review Action Panel
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Action 1: Open Project */}
                  <Link
                    href={activeReviewItem.projectId ? `/projects/${activeReviewItem.projectId}` : '/projects'}
                    target="_blank"
                    className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-blue-400">
                      <Film className="w-4 h-4" />
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">1. Open Project</span>
                      <span className="text-[10px] text-zinc-400 block">Inspect parent shoot project</span>
                    </div>
                  </Link>

                  {/* Action 2: Open Script */}
                  <Link
                    href={activeReviewItem.type === 'SCRIPT' ? `/scripts?scriptId=${activeReviewItem.id}` : '/scripts'}
                    target="_blank"
                    className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-purple-400">
                      <FileText className="w-4 h-4" />
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">2. Open Script</span>
                      <span className="text-[10px] text-zinc-400 block">Inspect script editor & scene text</span>
                    </div>
                  </Link>

                  {/* Action 3: Open Graphic Requirement */}
                  <Link
                    href={activeReviewItem.type === 'GRAPHIC' ? `/graphic-reqs?reqId=${activeReviewItem.id}` : '/graphic-reqs'}
                    target="_blank"
                    className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-amber-400">
                      <Palette className="w-4 h-4" />
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">3. Open Graphic Req</span>
                      <span className="text-[10px] text-zinc-400 block">Inspect design specs & assets</span>
                    </div>
                  </Link>

                  {/* Action 4: Inspect Submitted Work */}
                  <button
                    onClick={() => {
                      if (activeReviewItem.fileUrl) {
                        window.open(activeReviewItem.fileUrl, '_blank');
                      } else {
                        alert('Submitted asset files loaded above.');
                      }
                    }}
                    className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-emerald-400">
                      <Eye className="w-4 h-4" />
                      <Download className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">4. Inspect Asset</span>
                      <span className="text-[10px] text-zinc-400 block">Download / preview file</span>
                    </div>
                  </button>
                </div>

                {/* Primary Decision Action Buttons (Actions 6, 7, 8) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {/* Action 6: Approve Technical Review */}
                  <button
                    onClick={handleApproveTechnicalReview}
                    disabled={actionLoading === 'approve'}
                    className="p-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 rounded-xl text-left transition-all flex flex-col justify-between shadow-md"
                  >
                    <div className="flex items-center justify-between text-emerald-300">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-[10px] font-mono font-bold uppercase bg-emerald-900 px-1.5 py-0.5 rounded">Action 6</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-xs font-bold text-white block">6. Approve Technical Review</span>
                      <span className="text-[10px] text-emerald-300 block">Advance to Media Manager Review stage</span>
                    </div>
                  </button>

                  {/* Action 7: Reject / Request Changes */}
                  <button
                    onClick={handleRejectRequestChanges}
                    disabled={actionLoading === 'reject'}
                    className="p-3 bg-amber-950 hover:bg-amber-900 border border-amber-700 rounded-xl text-left transition-all flex flex-col justify-between shadow-md"
                  >
                    <div className="flex items-center justify-between text-amber-300">
                      <MessageSquare className="w-5 h-5" />
                      <span className="text-[10px] font-mono font-bold uppercase bg-amber-900 px-1.5 py-0.5 rounded">Action 7</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-xs font-bold text-white block">7. Reject / Request Changes</span>
                      <span className="text-[10px] text-amber-300 block">Mark as Revision Required</span>
                    </div>
                  </button>

                  {/* Action 8: Send Work Back into Production */}
                  <button
                    onClick={handleSendBackToProduction}
                    disabled={actionLoading === 'send_back'}
                    className="p-3 bg-rose-950 hover:bg-rose-900 border border-rose-700 rounded-xl text-left transition-all flex flex-col justify-between shadow-md"
                  >
                    <div className="flex items-center justify-between text-rose-300">
                      <CornerUpLeft className="w-5 h-5" />
                      <span className="text-[10px] font-mono font-bold uppercase bg-rose-900 px-1.5 py-0.5 rounded">Action 8</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-xs font-bold text-white block">8. Send Back to Production</span>
                      <span className="text-[10px] text-rose-300 block">Reset status to In Production (`IN_PROGRESS`)</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <span className="font-mono text-[11px]">
                Final Technical Authority • Creative/Media Manager Final Sign-Off Required Subsequently
              </span>
              <button
                onClick={() => setActiveReviewItem(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl border border-zinc-700 transition-colors"
              >
                Close Control Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
