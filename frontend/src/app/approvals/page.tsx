'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Check,
  X,
  RefreshCw,
  PhoneCall,
  Search,
  FileText,
  Palette,
  Film,
  CheckSquare,
  ExternalLink,
  Layers,
  Building2,
  Tag,
  CheckCheck,
  AlertTriangle,
  MessageSquare,
  Info,
  Calendar,
  User as UserIcon,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { RoleGuard } from '@/components/common/RoleGuard';

const TECHNICAL_CHECKLIST_ITEMS = [
  'File Integrity & Codec Parsing',
  'Resolution & Aspect Ratio Compliance',
  'Export Settings & Bitrate Target',
  'Audio Quality & Loudness Levels',
  'Video Quality & Frame Rate Consistency',
  'Naming Standards & Asset Taxonomy',
  'Technical Broadcast & Platform Compliance',
];

const PRESET_FEEDBACK_CHIPS = [
  'Resolution Mismatch',
  'Audio Loudness Non-compliant',
  'Codec / Bitrate Target Error',
  'Frame Drop / Stutter Observed',
  'Incorrect Naming Standard',
  'Aspect Ratio Crop Issue',
];

interface ConfirmModalState {
  isOpen: boolean;
  item: any;
  status: 'APPROVED' | 'REJECTED';
  remarks: string;
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'TECH' | 'MEDIA' | 'CLIENT'>('TECH');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TASK' | 'SCRIPT' | 'GRAPHIC_REQ' | 'PROJECT'>('ALL');

  const [remarks, setRemarks] = useState('');
  const [itemRemarksMap, setItemRemarksMap] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [clientDecision, setClientDecision] = useState('APPROVED');
  const [commMethod, setCommMethod] = useState('WhatsApp');

  // Confirmation popup modal state
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  // Detailed view inspection modal state
  const [detailModalItem, setDetailModalItem] = useState<any | null>(null);

  const loadQueue = async () => {
    try {
      setRefreshing(true);
      const data = await fetchApi('/approvals/queue');
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQueue();
    if (user?.role === 'TECHNICAL_MANAGER') {
      setActiveTab('TECH');
    } else if (user?.role === 'MEDIA_MANAGER') {
      setActiveTab('MEDIA');
    }
  }, [user]);

  const openTechConfirmation = (item: any, status: 'APPROVED' | 'REJECTED') => {
    const currentRemarks = itemRemarksMap[item.id] || remarks || '';
    setConfirmModal({
      isOpen: true,
      item,
      status,
      remarks: currentRemarks,
    });
  };

  const handleExecuteTechReview = async () => {
    if (!confirmModal || !confirmModal.item) return;
    const { item, status, remarks: modalRemarks } = confirmModal;

    if (status === 'REJECTED' && !modalRemarks.trim()) {
      alert('Please enter a rejection reason or revision instruction before rejecting deliverables.');
      return;
    }

    try {
      setSubmittingId(item.id);
      await fetchApi('/approvals/tech-review', {
        method: 'POST',
        body: JSON.stringify({
          projectId: item.id,
          status,
          remarks: modalRemarks.trim() || undefined,
        }),
      });
      setItemRemarksMap((prev) => ({ ...prev, [item.id]: '' }));
      setRemarks('');
      setConfirmModal(null);
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Technical review action failed');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleMediaReview = async (projectId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setSubmittingId(projectId);
      await fetchApi('/approvals/media-review', {
        method: 'POST',
        body: JSON.stringify({ projectId, status, remarks: remarks || undefined }),
      });
      setRemarks('');
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Media review action failed');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRecordClientConfirmation = async (projectId: string) => {
    try {
      setSubmittingId(projectId);
      await fetchApi('/approvals/client-confirmation', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          decision: clientDecision,
          communicationMethod: commMethod,
          remarks: remarks || undefined,
        }),
      });
      setRemarks('');
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to record client decision');
    } finally {
      setSubmittingId(null);
    }
  };

  const isTechnicalManager = user?.role === 'TECHNICAL_MANAGER';

  const getDeliverableItems = (proj: any) => {
    const tasks = proj.tasks || [];
    const files = proj.files || [];
    const deliverableItems: any[] = [];

    tasks.forEach((t: any) => {
      if (t.activeDeliverableUrl) {
        deliverableItems.push({
          id: `${t.id}-active`,
          fileName: t.activeDeliverableFileName || 'Active Work Deliverable Output',
          fileUrl: t.activeDeliverableUrl,
          version: t.activeDeliverableVersion || 1,
          taskTitle: t.title,
          uploadedBy: t.assignedEmployees?.map((a: any) => a.user?.name).filter(Boolean).join(', ') || 'Staff Member',
          isActive: true,
        });
      }

      if (t.deliverableHistory && Array.isArray(t.deliverableHistory)) {
        t.deliverableHistory.forEach((h: any) => {
          if (h.fileUrl !== t.activeDeliverableUrl) {
            deliverableItems.push({
              id: h.id,
              fileName: h.fileName || `Deliverable v${h.version}`,
              fileUrl: h.fileUrl,
              version: h.version,
              taskTitle: t.title,
              uploadedBy: h.user?.name || 'Staff Member',
              isActive: false,
            });
          }
        });
      }
    });

    files.forEach((f: any) => {
      deliverableItems.push({
        id: f.id,
        fileName: f.fileName || f.name || 'Project Output File',
        fileUrl: f.fileUrl || f.url,
        version: f.version || 1,
        taskTitle: 'Project Asset',
        uploadedBy: 'Team Member',
        isActive: false,
      });
    });

    return deliverableItems;
  };

  const getItemType = (item: any): 'TASK' | 'SCRIPT' | 'GRAPHIC_REQ' | 'PROJECT' => {
    if (item.isStandaloneTask || item.taskId || item.itemType === 'TASK' || (item.projectId && String(item.projectId).startsWith('TSK-'))) return 'TASK';
    if (item.isScript || item.scriptId || item.itemType === 'SCRIPT' || (item.projectId && String(item.projectId).startsWith('SCR-'))) return 'SCRIPT';
    if (item.isGraphicRequirement || item.graphicRequirementId || item.itemType === 'GRAPHIC_REQ' || (item.projectId && String(item.projectId).startsWith('GR-'))) return 'GRAPHIC_REQ';
    if (item.itemType) return item.itemType;
    return 'PROJECT';
  };

  const getItemDetailsUrl = (item: any) => {
    const type = getItemType(item);
    const code = item.projectId || item.taskId || item.scriptId || item.requirementId || item.name || item.id;
    if (type === 'TASK') {
      if (item.shootProjectId || (item.project && item.project.id && !item.isStandaloneTask)) {
        return `/projects/${item.shootProjectId || item.project.id}`;
      }
      return `/tasks?search=${encodeURIComponent(code)}`;
    }
    if (type === 'SCRIPT') {
      if (item.shootProjectId || (item.shootProject && item.shootProject.id)) {
        return `/projects/${item.shootProjectId || item.shootProject.id}`;
      }
      return `/scripts?search=${encodeURIComponent(code)}`;
    }
    if (type === 'GRAPHIC_REQ') {
      if (item.shootProjectId || (item.shootProject && item.shootProject.id)) {
        return `/projects/${item.shootProjectId || item.shootProject.id}`;
      }
      return `/graphic-reqs?search=${encodeURIComponent(code)}`;
    }
    return `/projects/${item.id}`;
  };

  const getItemSessionName = (item: any) => {
    const type = getItemType(item);
    if (type === 'PROJECT') return 'Project Session';
    if (type === 'TASK') return 'Task Session';
    if (type === 'SCRIPT') return 'Script Session';
    if (type === 'GRAPHIC_REQ') return 'Graphic Requirements Session';
    return 'Details Session';
  };

  const rawTechQueue: any[] = queue?.technicalReviewQueue || [];
  const filteredTechQueue = rawTechQueue.filter((item) => {
    const itemType = getItemType(item);
    if (typeFilter !== 'ALL' && itemType !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = (item.projectId || item.taskId || item.scriptId || item.requirementId || item.id || '').toLowerCase().includes(q);
      const nameMatch = (item.name || item.title || '').toLowerCase().includes(q);
      const clientMatch = (item.client?.name || item.brand?.name || '').toLowerCase().includes(q);
      const deliverables = getDeliverableItems(item);
      const fileMatch = deliverables.some((d) => d.fileName.toLowerCase().includes(q) || d.taskTitle.toLowerCase().includes(q));
      return codeMatch || nameMatch || clientMatch || fileMatch;
    }

    return true;
  });

  const totalDeliverablesCount = rawTechQueue.reduce((acc, item) => acc + getDeliverableItems(item).length, 0);
  const tasksCount = rawTechQueue.filter((i) => getItemType(i) === 'TASK').length;
  const scriptsCount = rawTechQueue.filter((i) => getItemType(i) === 'SCRIPT').length;
  const graphicCount = rawTechQueue.filter((i) => getItemType(i) === 'GRAPHIC_REQ').length;
  const projectsCount = rawTechQueue.filter((i) => getItemType(i) === 'PROJECT').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-gray-400 font-mono text-xs">Loading Technical Review Hub...</p>
      </div>
    );
  }

  return (
    <RoleGuard>
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-cyan-950/80 via-gray-900 to-gray-950 border border-cyan-800/40 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-md">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </span>
                <h1 className="text-xl font-extrabold text-white tracking-wide">
                  {isTechnicalManager ? 'Technical Review & Quality Sign-Off' : '3-Stage Production Approval Engine'}
                </h1>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed max-w-2xl pl-1">
                {isTechnicalManager
                  ? 'Verify deliverable integrity, resolution, frame rate, audio quality, and naming standards before advancing to client/media review.'
                  : 'Technical Review → Media Manager Review → Manual Client Confirmation Recording'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="bg-cyan-950/60 border border-cyan-700/60 px-3.5 py-2 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] font-mono text-cyan-400 block uppercase font-bold">Pending Review</span>
                <strong className="text-lg font-mono font-extrabold text-white">{rawTechQueue.length}</strong>
              </div>

              <div className="bg-indigo-950/60 border border-indigo-700/60 px-3.5 py-2 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] font-mono text-indigo-400 block uppercase font-bold">Deliverables</span>
                <strong className="text-lg font-mono font-extrabold text-white">{totalDeliverablesCount}</strong>
              </div>

              <button
                onClick={loadQueue}
                disabled={refreshing}
                className="px-3.5 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
                title="Refresh Review Queue"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Multi-queue tabs (only visible to non-Technical Managers, e.g. Admins / Media Managers) */}
        {!isTechnicalManager && (
          <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('TECH')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'TECH'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                  : 'bg-card hover:bg-gray-800 text-gray-400 border border-border'
              }`}
            >
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>1. Technical Review Queue</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-mono border border-cyan-800 font-bold">
                {rawTechQueue.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('MEDIA')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'MEDIA'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-lg shadow-purple-500/10'
                  : 'bg-card hover:bg-gray-800 text-gray-400 border border-border'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>2. Media Review Queue</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 text-[10px] font-mono border border-purple-800 font-bold">
                {queue?.mediaReviewQueue?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('CLIENT')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'CLIENT'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-card hover:bg-gray-800 text-gray-400 border border-border'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>3. Client Confirmation Queue</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-800 font-bold">
                {queue?.clientConfirmationQueue?.length || 0}
              </span>
            </button>
          </div>
        )}

        {/* Technical Review Queue Tab */}
        {(activeTab === 'TECH' || isTechnicalManager) && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-card border border-border p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <button
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    typeFilter === 'ALL'
                      ? 'bg-cyan-500 text-black shadow-md font-extrabold'
                      : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800'
                  }`}
                >
                  <span>All Items</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30 font-bold">
                    {rawTechQueue.length}
                  </span>
                </button>

                <button
                  onClick={() => setTypeFilter('TASK')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    typeFilter === 'TASK'
                      ? 'bg-cyan-500 text-black shadow-md font-extrabold'
                      : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Tasks</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30 font-bold">
                    {tasksCount}
                  </span>
                </button>

                <button
                  onClick={() => setTypeFilter('SCRIPT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    typeFilter === 'SCRIPT'
                      ? 'bg-purple-500 text-white shadow-md font-extrabold'
                      : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Scripts</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30 font-bold">
                    {scriptsCount}
                  </span>
                </button>

                <button
                  onClick={() => setTypeFilter('GRAPHIC_REQ')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    typeFilter === 'GRAPHIC_REQ'
                      ? 'bg-pink-600 text-white shadow-md font-extrabold'
                      : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Graphic Reqs</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30 font-bold">
                    {graphicCount}
                  </span>
                </button>

                <button
                  onClick={() => setTypeFilter('PROJECT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    typeFilter === 'PROJECT'
                      ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                      : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Projects</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30 font-bold">
                    {projectsCount}
                  </span>
                </button>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search item, code, deliverable..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 text-white pl-9 pr-8 py-2 rounded-xl text-xs focus:outline-none focus:border-cyan-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Content List */}
            {filteredTechQueue.length === 0 ? (
              <div className="bg-card border border-border p-12 rounded-2xl text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-xl">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-white text-base">All Technical Reviews Cleared! 🎉</h3>
                <p className="text-gray-400 text-xs max-w-md mx-auto">
                  {searchQuery || typeFilter !== 'ALL'
                    ? 'No items matched your current search or filter criteria. Try clearing filters.'
                    : 'No pending items currently require technical review. Deliverables submitted by production staff will automatically appear here.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredTechQueue.map((item: any) => {
                  const itemType = getItemType(item);
                  const deliverables = getDeliverableItems(item);
                  const isItemSubmitting = submittingId === item.id;
                  const itemRemarks = itemRemarksMap[item.id] || '';
                  const detailsUrl = getItemDetailsUrl(item);
                  const sessionLabel = getItemSessionName(item);

                  const typeBadgeStyle =
                    itemType === 'TASK'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                      : itemType === 'SCRIPT'
                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                      : itemType === 'GRAPHIC_REQ'
                      ? 'bg-pink-950 text-pink-300 border-pink-800'
                      : 'bg-indigo-950 text-indigo-300 border-indigo-800';

                  const typeIcon =
                    itemType === 'TASK' ? (
                      <CheckSquare className="w-3 h-3" />
                    ) : itemType === 'SCRIPT' ? (
                      <FileText className="w-3 h-3" />
                    ) : itemType === 'GRAPHIC_REQ' ? (
                      <Palette className="w-3 h-3" />
                    ) : (
                      <Film className="w-3 h-3" />
                    );

                  return (
                    <div
                      key={item.id}
                      className="bg-card border border-border hover:border-cyan-500/40 rounded-2xl p-5 space-y-4 shadow-xl transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Top identifiers & Details Button */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border flex items-center gap-1 uppercase ${typeBadgeStyle}`}>
                              {typeIcon}
                              <span>{itemType.replace(/_/g, ' ')}</span>
                            </span>

                            <span className="font-mono text-cyan-400 font-extrabold text-xs bg-gray-900 border border-gray-800 px-2.5 py-0.5 rounded-lg">
                              {item.projectId || item.taskId || item.scriptId || item.requirementId || item.id}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Open Quick Details Modal Button */}
                            <button
                              type="button"
                              onClick={() => setDetailModalItem(item)}
                              className="px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-cyan-950/80 text-cyan-300 border border-gray-800 hover:border-cyan-700/60 text-[11px] font-bold flex items-center gap-1 transition-colors shadow-sm"
                              title="View full item details modal"
                            >
                              <Info className="w-3.5 h-3.5 text-cyan-400" />
                              <span>View Details</span>
                            </button>

                            {/* Direct Session Page Link */}
                            <Link
                              href={detailsUrl}
                              className="px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title={`Go to ${sessionLabel}`}
                            >
                              <span>{sessionLabel}</span>
                              <ArrowUpRight className="w-3 h-3 text-gray-400" />
                            </Link>
                          </div>
                        </div>

                        {/* Title & metadata */}
                        <div>
                          <h3 className="font-bold text-white text-base leading-snug">
                            {item.name || item.title || 'Production Item'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                            {item.client?.name && (
                              <span className="flex items-center gap-1 bg-gray-900 px-2 py-0.5 rounded border border-gray-800 text-[11px]">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                <strong className="text-gray-200">{item.client.name}</strong>
                              </span>
                            )}
                            {item.brand?.name && (
                              <span className="flex items-center gap-1 bg-gray-900 px-2 py-0.5 rounded border border-gray-800 text-[11px]">
                                <Tag className="w-3 h-3 text-gray-400" />
                                <strong className="text-gray-300">{item.brand.name}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Deliverables section */}
                      <div className="bg-gray-950 border border-cyan-900/40 p-3.5 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Deliverable Files to Verify ({deliverables.length})</span>
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono italic">
                            Click link to inspect asset
                          </span>
                        </div>

                        {deliverables.length === 0 ? (
                          <p className="text-gray-500 italic text-xs p-2 text-center bg-gray-900/40 rounded-lg border border-dashed border-gray-800">
                            No deliverable output files attached yet.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {deliverables.map((d: any) => (
                              <div
                                key={d.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                  d.isActive
                                    ? 'bg-cyan-950/40 border-cyan-700/60 text-white'
                                    : 'bg-gray-900 border-gray-800 text-gray-300'
                                }`}
                              >
                                <div className="space-y-0.5 max-w-[65%] truncate">
                                  <div className="font-bold flex items-center gap-1.5 text-xs truncate">
                                    <span className="truncate">📄 {d.fileName}</span>
                                    {d.isActive && (
                                      <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded text-[9px] font-mono shrink-0">
                                        v{d.version} Active
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-gray-400 truncate">
                                    By <strong className="text-gray-300">{d.uploadedBy}</strong> • Task: {d.taskTitle}
                                  </div>
                                </div>

                                <a
                                  href={d.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-lg text-[11px] transition-all flex items-center gap-1 shrink-0 shadow-md shadow-cyan-600/30"
                                >
                                  <span>Review Asset</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Technical Checklist */}
                      <div className="bg-gray-950 border border-gray-800 p-3.5 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-gray-800/80 pb-1.5">
                          <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Technical Validation Checklist</span>
                          </span>
                          <span className="text-[9px] font-mono text-emerald-400 font-bold">
                            All 7 Criteria Passed
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-gray-300">
                          {TECHNICAL_CHECKLIST_ITEMS.map((checkItem, idx) => (
                            <label
                              key={idx}
                              className="flex items-center gap-2 cursor-pointer hover:text-white bg-gray-900/60 px-2 py-1 rounded-lg border border-gray-800/60"
                            >
                              <input
                                type="checkbox"
                                defaultChecked
                                className="w-3.5 h-3.5 accent-cyan-500 rounded bg-gray-900 border-gray-700 cursor-pointer"
                              />
                              <span className="truncate">{checkItem}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Review Actions & Quick Presets */}
                      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-xl">
                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                            Quick Feedback Presets:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {PRESET_FEEDBACK_CHIPS.map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => {
                                  setItemRemarksMap((prev) => {
                                    const current = prev[item.id] || '';
                                    const next = current ? `${current}; ${chip}` : chip;
                                    return { ...prev, [item.id]: next };
                                  });
                                }}
                                className="text-[10px] font-mono px-2 py-0.5 bg-gray-900 hover:bg-cyan-950/80 text-gray-300 hover:text-cyan-200 border border-gray-800 hover:border-cyan-700/60 rounded-full transition-colors"
                              >
                                + {chip}
                              </button>
                            ))}
                          </div>
                        </div>

                        <input
                          type="text"
                          value={itemRemarks}
                          placeholder="Technical review remarks or rejection revision reason..."
                          onChange={(e) => setItemRemarksMap((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-cyan-500 placeholder-gray-500"
                        />

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => openTechConfirmation(item, 'APPROVED')}
                            disabled={isItemSubmitting}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 text-xs transition-all disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve Technical Quality</span>
                          </button>

                          <button
                            onClick={() => openTechConfirmation(item, 'REJECTED')}
                            disabled={isItemSubmitting}
                            className="flex-1 py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700 font-extrabold rounded-xl flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject & Request Revision</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Media Review Queue Tab (non-tech managers) */}
        {activeTab === 'MEDIA' && !isTechnicalManager && (
          <div className="bg-card border border-border p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-bold text-purple-400 text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 2. Media Review Queue
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Media Manager verifies branding, creative execution, campaign objective & completeness.
                </p>
              </div>
              <span className="font-bold text-purple-300 font-mono bg-purple-950 px-3 py-1 rounded-full border border-purple-800 text-xs">
                {queue?.mediaReviewQueue?.length || 0} Pending Items
              </span>
            </div>

            {queue?.mediaReviewQueue?.length === 0 ? (
              <div className="py-12 text-center text-gray-500 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="font-semibold text-sm">No items pending media manager approval.</p>
                <p className="text-xs text-gray-600">Items will appear here after passing technical review sign-off.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {queue?.mediaReviewQueue?.map((proj: any) => {
                  const deliverables = getDeliverableItems(proj);
                  const detailsUrl = getItemDetailsUrl(proj);
                  const sessionLabel = getItemSessionName(proj);

                  return (
                    <div key={proj.id} className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-lg">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-purple-400 font-bold text-xs">{proj.projectId || proj.id}</span>
                          <h3 className="font-bold text-white text-sm">{proj.name || proj.title}</h3>
                          <p className="text-gray-400 text-xs">{proj.client?.name} • {proj.brand?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailModalItem(proj)}
                            className="p-1.5 rounded-lg bg-gray-950 hover:bg-gray-800 text-gray-300 border border-gray-800 text-xs flex items-center gap-1"
                            title="View Details"
                          >
                            <Info className="w-3.5 h-3.5 text-purple-400" />
                          </button>
                          <Link
                            href={detailsUrl}
                            className="px-2 py-1 rounded bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 text-[10px] font-bold font-mono flex items-center gap-1"
                          >
                            <span>{sessionLabel}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-1.5 bg-gray-950 p-3 rounded-lg border border-gray-800">
                        {deliverables.map((d: any) => (
                          <div key={d.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-300 truncate max-w-[70%]">📄 {d.fileName}</span>
                            <a
                              href={d.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 text-[11px] font-bold flex items-center gap-1"
                            >
                              Open ↗
                            </a>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-lg">
                        <input
                          type="text"
                          placeholder="Media Creative Quality Remarks..."
                          onChange={(e) => setRemarks(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 text-gray-200 px-3 py-2 rounded text-xs"
                        />
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleMediaReview(proj.id, 'APPROVED')}
                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded flex items-center justify-center gap-1.5 text-xs shadow-md shadow-purple-600/30"
                          >
                            <Check className="w-4 h-4" /> Approve Media Quality
                          </button>

                          <button
                            onClick={() => handleMediaReview(proj.id, 'REJECTED')}
                            className="flex-1 py-2 bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/30 font-bold rounded flex items-center justify-center gap-1.5 text-xs"
                          >
                            <X className="w-4 h-4" /> Reject (Return to Production)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Client Confirmation Queue Tab (non-tech managers) */}
        {activeTab === 'CLIENT' && !isTechnicalManager && (
          <div className="bg-card border border-border p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-bold text-emerald-400 text-base flex items-center gap-2">
                  <PhoneCall className="w-5 h-5" /> 3. Client Confirmation Queue
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Record client decision manually (WhatsApp, Email, Call, Meeting). Revision requested restarts production.
                </p>
              </div>
              <span className="font-bold text-emerald-300 font-mono bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800 text-xs">
                {queue?.clientConfirmationQueue?.length || 0} Pending Items
              </span>
            </div>

            {queue?.clientConfirmationQueue?.length === 0 ? (
              <div className="py-12 text-center text-gray-500 space-y-2">
                <PhoneCall className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="font-semibold text-sm">No items pending client confirmation.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {queue?.clientConfirmationQueue?.map((proj: any) => {
                  const detailsUrl = getItemDetailsUrl(proj);
                  const sessionLabel = getItemSessionName(proj);

                  return (
                    <div key={proj.id} className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-lg">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-emerald-400 font-bold text-xs">{proj.projectId || proj.id}</span>
                          <h3 className="font-bold text-white text-sm">{proj.name || proj.title}</h3>
                          <p className="text-gray-400 text-xs">{proj.client?.name} • {proj.brand?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailModalItem(proj)}
                            className="p-1.5 rounded-lg bg-gray-950 hover:bg-gray-800 text-gray-300 border border-gray-800 text-xs flex items-center gap-1"
                            title="View Details"
                          >
                            <Info className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                          <Link
                            href={detailsUrl}
                            className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[10px] font-bold font-mono flex items-center gap-1"
                          >
                            <span>{sessionLabel}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={clientDecision}
                            onChange={(e) => setClientDecision(e.target.value)}
                            className="bg-gray-900 border border-gray-800 text-white p-2 rounded text-xs"
                          >
                            <option value="APPROVED">Approved by Client</option>
                            <option value="REVISION_REQUESTED">Revision Requested</option>
                            <option value="REJECTED">Rejected by Client</option>
                          </select>

                          <select
                            value={commMethod}
                            onChange={(e) => setCommMethod(e.target.value)}
                            className="bg-gray-900 border border-gray-800 text-white p-2 rounded text-xs"
                          >
                            <option value="WhatsApp">WhatsApp Message</option>
                            <option value="Email">Email Communication</option>
                            <option value="Phone Call">Phone Call / Voice</option>
                            <option value="Meeting">Client Review Meeting</option>
                          </select>
                        </div>

                        <input
                          type="text"
                          placeholder="Client Feedback Remarks..."
                          onChange={(e) => setRemarks(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 text-gray-200 px-3 py-2 rounded text-xs"
                        />

                        <button
                          onClick={() => handleRecordClientConfirmation(proj.id)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-1.5 text-xs shadow-md shadow-emerald-600/30"
                        >
                          <Check className="w-4 h-4" /> Save Client Confirmation
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal Popup for Technical Review */}
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div
              className={`bg-gray-900 border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 ${
                confirmModal.status === 'APPROVED'
                  ? 'border-emerald-500/50 shadow-emerald-500/10'
                  : 'border-rose-500/50 shadow-rose-500/10'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-2xl flex items-center justify-center ${
                      confirmModal.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {confirmModal.status === 'APPROVED' ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <AlertTriangle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-lg leading-tight">
                      {confirmModal.status === 'APPROVED'
                        ? 'Confirm Technical Quality Approval'
                        : 'Confirm Deliverable Rejection & Revision'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {confirmModal.status === 'APPROVED'
                        ? 'This item will be marked technically compliant and move forward in the workflow.'
                        : 'This deliverable will be returned to the production staff with your revision feedback.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setConfirmModal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Item Overview Summary */}
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-cyan-400 font-bold">
                    {confirmModal.item.projectId ||
                      confirmModal.item.taskId ||
                      confirmModal.item.scriptId ||
                      confirmModal.item.requirementId ||
                      confirmModal.item.id}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-gray-300 rounded font-mono text-[10px]">
                    {getItemType(confirmModal.item).replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="font-bold text-white text-sm">
                  {confirmModal.item.name || confirmModal.item.title || 'Production Item'}
                </div>
                {(confirmModal.item.client?.name || confirmModal.item.brand?.name) && (
                  <div className="text-gray-400 text-[11px] flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-gray-500" />
                    <span>{confirmModal.item.client?.name || 'Client'}</span>
                    {confirmModal.item.brand?.name && (
                      <>
                        <span>•</span>
                        <Tag className="w-3 h-3 text-gray-500" />
                        <span>{confirmModal.item.brand.name}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Remarks / Feedback in Modal */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {confirmModal.status === 'APPROVED'
                        ? 'Sign-off QC Notes (Optional):'
                        : 'Rejection Reason / Revision Instructions (Required):'}
                    </span>
                  </span>
                  {confirmModal.status === 'REJECTED' && (
                    <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                      * Required
                    </span>
                  )}
                </label>

                {confirmModal.status === 'REJECTED' && (
                  <div className="flex flex-wrap gap-1 pb-1">
                    {PRESET_FEEDBACK_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setConfirmModal((prev) => {
                            if (!prev) return null;
                            const current = prev.remarks || '';
                            const next = current ? `${current}; ${chip}` : chip;
                            return { ...prev, remarks: next };
                          });
                        }}
                        className="text-[10px] font-mono px-2 py-0.5 bg-gray-950 hover:bg-rose-950/80 text-gray-300 hover:text-rose-200 border border-gray-800 hover:border-rose-800 rounded-full transition-colors"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  rows={3}
                  value={confirmModal.remarks}
                  onChange={(e) =>
                    setConfirmModal((prev) => (prev ? { ...prev, remarks: e.target.value } : null))
                  }
                  placeholder={
                    confirmModal.status === 'APPROVED'
                      ? 'Add any final QC confirmation notes...'
                      : 'Detail the technical reason for rejection (resolution, audio, frame drops, etc.)...'
                  }
                  className="w-full bg-gray-950 border border-gray-700 text-gray-200 px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500 placeholder-gray-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  disabled={submittingId !== null}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteTechReview}
                  disabled={
                    submittingId !== null ||
                    (confirmModal.status === 'REJECTED' && !confirmModal.remarks.trim())
                  }
                  className={`flex-1 py-2.5 font-extrabold text-white rounded-xl flex items-center justify-center gap-2 text-xs shadow-xl transition-all disabled:opacity-50 ${
                    confirmModal.status === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  {submittingId === confirmModal.item.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : confirmModal.status === 'APPROVED' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Approval</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      <span>Confirm Rejection</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Inspection Modal / Full Session Details */}
        {detailModalItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-gray-900 border border-cyan-700/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                    <Info className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-cyan-400 bg-gray-950 px-2.5 py-0.5 rounded border border-gray-800">
                        {detailModalItem.projectId ||
                          detailModalItem.taskId ||
                          detailModalItem.scriptId ||
                          detailModalItem.requirementId ||
                          detailModalItem.id}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold uppercase">
                        {getItemType(detailModalItem).replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white mt-1">
                      {detailModalItem.name || detailModalItem.title || 'Item Details'}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setDetailModalItem(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Client & Metadata Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-950 border border-gray-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-500 font-mono uppercase block font-bold">Client & Brand</span>
                  <div className="font-bold text-gray-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>{detailModalItem.client?.name || 'No client specified'}</span>
                  </div>
                  {detailModalItem.brand?.name && (
                    <div className="text-gray-400 text-[11px] flex items-center gap-1.5 pt-0.5">
                      <Tag className="w-3 h-3 text-gray-500" />
                      <span>{detailModalItem.brand.name}</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-950 border border-gray-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-500 font-mono uppercase block font-bold">Status & Stage</span>
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{detailModalItem.status || 'WAITING_FOR_TECHNICAL_REVIEW'}</span>
                  </div>
                  {detailModalItem.createdAt && (
                    <div className="text-gray-400 text-[11px] flex items-center gap-1.5 pt-0.5">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <span>Created: {new Date(detailModalItem.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description / Storyline / Brief */}
              {(detailModalItem.description || detailModalItem.storyline || detailModalItem.brief) && (
                <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] text-cyan-400 font-mono uppercase block font-bold">
                    Description & Specifications
                  </span>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {detailModalItem.description || detailModalItem.storyline || detailModalItem.brief}
                  </p>
                </div>
              )}

              {/* Team Members / Assignees */}
              {(detailModalItem.assignedEmployees || detailModalItem.assignedTeam) && (
                <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] text-cyan-400 font-mono uppercase block font-bold">
                    Assigned Production Staff
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(detailModalItem.assignedEmployees || detailModalItem.assignedTeam)?.map((member: any, idx: number) => {
                      const staff = member.user || member;
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-lg text-xs"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-bold text-white">{staff.name || 'Team Member'}</span>
                          {staff.role && (
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-950 px-1.5 py-0.2 rounded border border-gray-800">
                              {staff.role}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Deliverable Assets List */}
              <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-cyan-400 font-mono uppercase block font-bold">
                    Deliverable Files & Versions
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {getDeliverableItems(detailModalItem).length} Files Attached
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {getDeliverableItems(detailModalItem).map((d: any) => (
                    <div
                      key={d.id}
                      className="p-2.5 rounded-xl border border-gray-800 bg-gray-900 flex items-center justify-between text-xs"
                    >
                      <div className="truncate max-w-[70%]">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="truncate">📄 {d.fileName}</span>
                          {d.isActive && (
                            <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded text-[9px] font-mono shrink-0">
                              v{d.version} Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          By <strong className="text-gray-300">{d.uploadedBy}</strong>
                        </div>
                      </div>

                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-lg text-[11px] transition-all flex items-center gap-1 shrink-0"
                      >
                        <span>Open File</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Navigation Footer */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-xs transition-colors"
                >
                  Close Inspection
                </button>

                <Link
                  href={getItemDetailsUrl(detailModalItem)}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all"
                >
                  <span>Open Full {getItemSessionName(detailModalItem)}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
