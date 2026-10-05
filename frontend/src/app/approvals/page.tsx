'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { fetchApi, resolveFileUrl } from '@/lib/api';
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
  Eye,
  Plus,
  Copy,
} from 'lucide-react';
import { useBrand } from '@/lib/brand-context';
import { RoleGuard } from '@/components/common/RoleGuard';
import { extractEventScripts, ProjectScript } from '@/lib/project-scripts';
import { ScriptDocumentViewerModal } from '@/components/common/ScriptDocumentViewerModal';

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

const MEDIA_CHECKLIST_ITEMS = [
  'Brand Guidelines & Tone Consistency',
  'Story Flow, Hook & Narrative Pacing',
  'Visual Polish & Graphic Overlays',
  'Audio Balance, Dialogue & BG Music',
  'Platform Aspect Ratio & Safe Zones',
];

const MEDIA_PRESET_FEEDBACK_CHIPS = [
  'Brand Guidelines Adhered',
  'Pacing & Story Flow Approved',
  'Trim Clip Duration',
  'Adjust Intro/Hook Timing',
  'Refine Background Music Level',
  'Fix Brand Logo/Asset Placement',
  'Revise Aspect Ratio/Formatting',
];

interface ConfirmModalState {
  isOpen: boolean;
  item: any;
  status: 'APPROVED' | 'REJECTED';
  remarks: string;
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const isTechnicalManager = user?.role === 'TECHNICAL_MANAGER';
  const isMediaManager = user?.role === 'MEDIA_MANAGER';
  const isMarketingManager = (user?.role as string) === 'MARKETING_MANAGER' || (user?.role as string) === 'ADMINISTRATOR';
  const isAdmin = (user?.role as string) === 'ADMINISTRATOR';

  const { activeBrandId, activeBrand, setActiveBrandId } = useBrand();
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'TECH' | 'MEDIA' | 'MARKETING' | 'CLIENT'>('TECH');

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
  const [activeApprovalScriptIdx, setActiveApprovalScriptIdx] = useState(0);

  // In-app Script Document Preview Modal state
  const [previewScriptDoc, setPreviewScriptDoc] = useState<any | null>(null);

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
    } else if (user?.role === 'MARKETING_MANAGER') {
      setActiveTab('MARKETING');
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

  const handleMediaReview = async (projectId: string, status: 'APPROVED' | 'REJECTED', explicitRemarks?: string) => {
    try {
      setSubmittingId(projectId);
      const reviewRemarks = explicitRemarks !== undefined ? explicitRemarks : (itemRemarksMap[projectId] || remarks || undefined);
      await fetchApi('/approvals/media-review', {
        method: 'POST',
        body: JSON.stringify({ projectId, status, remarks: reviewRemarks }),
      });
      setItemRemarksMap((prev) => ({ ...prev, [projectId]: '' }));
      setRemarks('');
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Media review action failed');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleMarketingReview = async (projectId: string, status: 'APPROVED' | 'REJECTED', explicitRemarks?: string) => {
    try {
      setSubmittingId(projectId);
      const reviewRemarks = explicitRemarks !== undefined ? explicitRemarks : (itemRemarksMap[projectId] || remarks || undefined);
      await fetchApi('/approvals/marketing-review', {
        method: 'POST',
        body: JSON.stringify({ projectId, status, remarks: reviewRemarks }),
      });
      setItemRemarksMap((prev) => ({ ...prev, [projectId]: '' }));
      setRemarks('');
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Marketing review action failed');
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

  const getDeliverableItems = (proj: any) => {
    if (!proj) return [];
    const tasks = proj.tasks || [];
    const files = proj.files || [];
    const deliverables = proj.deliverables || [];
    const deliverableItems: any[] = [];
    const seenUrls = new Set<string>();

    // 1. Deliverables associated directly with Requirement / Script
    deliverables.forEach((d: any) => {
      const rawUrl = d.fileUrl || d.url || d.storagePath;
      if (rawUrl && !seenUrls.has(rawUrl)) {
        seenUrls.add(rawUrl);
        const resolvedUrl = resolveFileUrl(rawUrl);

        deliverableItems.push({
          id: d.id,
          fileName: d.fileName || d.name || `${d.type || 'Deliverable'} Output`,
          fileUrl: resolvedUrl,
          version: d.version || 1,
          taskTitle: d.type || 'Produced Deliverable',
          uploadedBy: d.createdBy?.name || d.assignedStaff?.name || 'Staff Designer',
          isActive: true,
        });
      }
    });

    // 2. Active Task Deliverables & Deliverable History
    tasks.forEach((t: any) => {
      if (t.activeDeliverableUrl && !seenUrls.has(t.activeDeliverableUrl)) {
        seenUrls.add(t.activeDeliverableUrl);
        deliverableItems.push({
          id: `${t.id}-active`,
          fileName: t.activeDeliverableFileName || `${t.title} Active Output`,
          fileUrl: resolveFileUrl(t.activeDeliverableUrl),
          version: t.activeDeliverableVersion || 1,
          taskTitle: t.title,
          uploadedBy: t.assignedEmployees?.map((a: any) => a.user?.name).filter(Boolean).join(', ') || 'Staff Member',
          isActive: true,
        });
      }

      if (t.deliverableHistory && Array.isArray(t.deliverableHistory)) {
        t.deliverableHistory.forEach((h: any) => {
          if (h.fileUrl && !seenUrls.has(h.fileUrl)) {
            seenUrls.add(h.fileUrl);
            deliverableItems.push({
              id: h.id,
              fileName: h.fileName || `Deliverable v${h.version}`,
              fileUrl: resolveFileUrl(h.fileUrl),
              version: h.version,
              taskTitle: t.title,
              uploadedBy: h.user?.name || 'Staff Member',
              isActive: false,
            });
          }
        });
      }
    });

    // 3. Design Asset Files & Attached Files
    files.forEach((f: any) => {
      const rawUrl = f.fileUrl || f.url || f.storagePath;
      if (rawUrl && !seenUrls.has(rawUrl)) {
        seenUrls.add(rawUrl);
        const resolvedUrl = resolveFileUrl(rawUrl);

        deliverableItems.push({
          id: f.id,
          fileName: f.fileName || f.name || 'Design File Asset',
          fileUrl: resolvedUrl,
          version: f.version || 1,
          taskTitle: f.attachmentCategory?.replace(/_/g, ' ') || 'Attached Asset',
          uploadedBy: f.uploadedBy?.name || 'Team Member',
          isActive: Boolean(f.activeVersion),
        });
      }
    });

    // 4. Primary Creative Visual Asset Link
    const creativeUrl = proj.creativePreviewUrl || proj.calendarEvent?.creativePreviewUrl;
    if (creativeUrl && !seenUrls.has(creativeUrl)) {
      seenUrls.add(creativeUrl);
      deliverableItems.push({
        id: `creative-preview-${proj.id}`,
        fileName: proj.creativeAssetName || proj.calendarEvent?.creativeAssetName || `${proj.name || 'Creative'} Visual Asset`,
        fileUrl: creativeUrl.startsWith('http') ? creativeUrl : `https://${creativeUrl}`,
        version: 1,
        taskTitle: 'Primary Creative Visual Asset',
        uploadedBy: proj.calendarEvent?.createdBy?.name || 'Media Manager',
        isActive: true,
      });
    }

    return deliverableItems;
  };

  const getScriptDocumentItems = (item: any) => {
    if (!item) return [];
    const files = item.files || item.project?.files || [];
    const scriptItems: any[] = [];
    const seenUrls = new Set<string>();

    files.forEach((f: any) => {
      const isScript =
        f.attachmentCategory === 'SCRIPT_DOCUMENT' ||
        f.folderCategory === 'Script Documents' ||
        f.storagePath?.includes('Script Documents') ||
        f.fileName?.toLowerCase().endsWith('.pdf') ||
        f.fileName?.toLowerCase().endsWith('.doc') ||
        f.fileName?.toLowerCase().endsWith('.docx') ||
        f.fileName?.toLowerCase().endsWith('.txt');

      const rawUrl = f.storagePath || f.fileUrl;
      if (isScript && rawUrl && !seenUrls.has(rawUrl)) {
        seenUrls.add(rawUrl);
        scriptItems.push({
          id: f.id,
          fileName: f.fileName || 'Script Document',
          fileUrl: resolveFileUrl(rawUrl),
          uploadedBy: f.uploadedBy?.name || f.uploadedBy?.role || 'Staff Member',
          fileSize: f.fileSize,
          createdAt: f.createdAt,
        });
      }
    });

    return scriptItems;
  };

  const handleUploadScriptForApprovalItem = async (file: File, item: any) => {
    if (!file || !item) return;
    const projectId = item.projectId || item.id || item.project?.id;
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (projectId) {
        fd.append('projectId', projectId);
      }
      if (item.taskId || item.sourceType === 'TASK') {
        fd.append('taskId', item.id);
      } else if (item.requirementId || item.sourceType === 'GRAPHIC_REQUIREMENT') {
        fd.append('graphicRequirementId', item.id);
      }
      fd.append('folderCategory', 'Script Documents');
      fd.append('attachmentCategory', 'SCRIPT_DOCUMENT');
      await fetchApi('/files/upload', {
        method: 'POST',
        body: fd,
      });
      alert('Script document uploaded successfully!');
      loadQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to upload script document.');
    }
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

  const rawTechQueue: any[] = useMemo(() => queue?.technicalReviewQueue || [], [queue]);

  const effectiveMarketingQueue = useMemo(() => {
    const list = queue?.marketingReviewQueue || [];
    if (!activeBrandId) return list;
    return list.filter(
      (item: any) =>
        item.brandId === activeBrandId ||
        item.project?.brandId === activeBrandId ||
        item.graphicRequirement?.brandId === activeBrandId ||
        item.brand?.id === activeBrandId,
    );
  }, [queue?.marketingReviewQueue, activeBrandId]);

  const effectiveClientConfirmationQueue = useMemo(() => {
    const list = queue?.clientConfirmationQueue || [];
    if (!activeBrandId) return list;
    return list.filter(
      (item: any) =>
        item.brandId === activeBrandId ||
        item.project?.brandId === activeBrandId ||
        item.graphicRequirement?.brandId === activeBrandId ||
        item.brand?.id === activeBrandId,
    );
  }, [queue?.clientConfirmationQueue, activeBrandId]);

  const filteredTechQueue = useMemo(() => {
    return rawTechQueue.filter((item) => {
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
  }, [rawTechQueue, typeFilter, searchQuery]);

  const totalDeliverablesCount = useMemo(() => {
    return rawTechQueue.reduce((acc, item) => acc + getDeliverableItems(item).length, 0);
  }, [rawTechQueue]);

  const tasksCount = useMemo(() => rawTechQueue.filter((i) => getItemType(i) === 'TASK').length, [rawTechQueue]);
  const scriptsCount = useMemo(() => rawTechQueue.filter((i) => getItemType(i) === 'SCRIPT').length, [rawTechQueue]);
  const graphicCount = useMemo(() => rawTechQueue.filter((i) => getItemType(i) === 'GRAPHIC_REQ').length, [rawTechQueue]);
  const projectsCount = useMemo(() => rawTechQueue.filter((i) => getItemType(i) === 'PROJECT').length, [rawTechQueue]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin" />
        <p className="text-slate-500 font-mono text-xs">Loading Technical Review Hub...</p>
      </div>
    );
  }

  return (
    <RoleGuard>
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header banner */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-cyan-600" />
                </span>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-wide">
                  {isTechnicalManager
                    ? 'Technical Review & Quality Sign-Off'
                    : isMediaManager
                    ? 'Media Manager Review Session'
                    : isMarketingManager
                    ? 'Event Approval Session'
                    : '3-Stage Production Approval Engine'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="bg-cyan-50 border border-cyan-200 px-3.5 py-2 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] font-mono text-cyan-700 block uppercase font-bold">Pending Review</span>
                <strong className="text-lg font-mono font-extrabold text-cyan-900">
                  {isTechnicalManager
                    ? rawTechQueue.length
                    : isMediaManager
                    ? queue?.mediaReviewQueue?.length || 0
                    : isMarketingManager
                    ? effectiveMarketingQueue.length
                    : rawTechQueue.length}
                </strong>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] font-mono text-indigo-700 block uppercase font-bold">Deliverables</span>
                <strong className="text-lg font-mono font-extrabold text-indigo-900">{totalDeliverablesCount}</strong>
              </div>

              <button
                onClick={loadQueue}
                disabled={refreshing}
                className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
                title="Refresh Review Queue"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Brand Context Banner (Marketing Manager Only) */}
        {user?.role === 'MARKETING_MANAGER' && activeBrand && (
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 shadow-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full ring-2 ring-blue-400 animate-pulse"
                style={{ backgroundColor: activeBrand.primaryColor || '#3B82F6' }}
              />
              <span>
                Active Brand Filter: <strong>{activeBrand.name}</strong>{' '}
                <span className="font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px]">
                  [{activeBrand.shortCode}]
                </span>
                . Approvals and deliverables are filtered to this brand.
              </span>
            </div>
            <button
              onClick={() => setActiveBrandId(null)}
              className="text-[11px] text-blue-700 hover:text-blue-900 font-bold hover:underline"
            >
              Reset to All Brands
            </button>
          </div>
        )}

        {/* Multi-queue tabs (hidden for Technical Manager & Media Manager since they are dedicated to single queues) */}
        {!isTechnicalManager && !isMediaManager && (
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
            {isAdmin && (
              <button
                onClick={() => setActiveTab('TECH')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  activeTab === 'TECH'
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-lg shadow-cyan-500/10'
                    : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                <Clock className="w-4 h-4 text-cyan-600" />
                <span>1. Technical Review</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-mono border border-cyan-200 font-bold">
                  {rawTechQueue.length}
                </span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setActiveTab('MEDIA')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  activeTab === 'MEDIA'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-lg shadow-purple-500/10'
                    : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span>2. Media Review</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-mono border border-purple-200 font-bold">
                  {queue?.mediaReviewQueue?.length || 0}
                </span>
              </button>
            )}

            {isMarketingManager && (
              <button
                onClick={() => setActiveTab('MARKETING')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  activeTab === 'MARKETING'
                    ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-lg shadow-amber-500/10'
                    : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{isAdmin ? '3. Marketing Approval' : 'Marketing Approval'}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono border border-amber-300 font-bold">
                  {effectiveMarketingQueue.length}
                </span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('CLIENT')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === 'CLIENT'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-lg shadow-emerald-500/10'
                  : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>{isAdmin ? '4. Client Confirmation' : 'Client Confirmation'}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-mono border border-emerald-200 font-bold">
                {effectiveClientConfirmationQueue.length}
              </span>
            </button>
          </div>
        )}

        {/* Technical Review Queue Tab */}
        {((activeTab === 'TECH' && !isMediaManager) || isTechnicalManager) && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <button
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    typeFilter === 'ALL'
                      ? 'bg-cyan-500 text-black shadow-md font-extrabold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
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
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
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
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
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
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
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
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
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
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search item, code, deliverable..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-9 pr-8 py-2 rounded-xl text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Content List */}
            {filteredTechQueue.length === 0 ? (
              <div className="bg-white border border-slate-200 p-12 rounded-2xl text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 mx-auto shadow-xl">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">All Technical Reviews Cleared!</h3>
                <p className="text-slate-500 text-xs max-w-md mx-auto">
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
                      ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                      : itemType === 'SCRIPT'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : itemType === 'GRAPHIC_REQ'
                      ? 'bg-pink-50 text-pink-700 border-pink-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200';

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
                      className="bg-white border border-slate-200 hover:border-cyan-200 rounded-2xl p-5 space-y-4 shadow-xl transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Top identifiers & Details Button */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border flex items-center gap-1 uppercase ${typeBadgeStyle}`}>
                              {typeIcon}
                              <span>{itemType.replace(/_/g, ' ')}</span>
                            </span>

                            <span className="font-mono text-cyan-600 font-extrabold text-xs bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                              {item.projectId || item.taskId || item.scriptId || item.requirementId || item.id}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Open Quick Details Modal Button */}
                            <button
                              type="button"
                              onClick={() => setDetailModalItem(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-cyan-50 text-cyan-700 border border-slate-200 hover:border-cyan-300 text-[11px] font-bold flex items-center gap-1 transition-colors shadow-sm"
                              title="View full item details modal"
                            >
                              <Info className="w-3.5 h-3.5 text-cyan-600" />
                              <span>View Details</span>
                            </button>

                            {/* Direct Session Page Link */}
                            <Link
                              href={detailsUrl}
                              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title={`Go to ${sessionLabel}`}
                            >
                              <span>{sessionLabel}</span>
                              <ArrowUpRight className="w-3 h-3 text-slate-500" />
                            </Link>
                          </div>
                        </div>

                        {/* Title & metadata */}
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-snug">
                            {item.name || item.title || 'Production Item'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                            {item.client?.name && (
                              <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                <Building2 className="w-3 h-3 text-slate-500" />
                                <strong className="text-slate-800">{item.client.name}</strong>
                              </span>
                            )}
                            {item.brand?.name && (
                              <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                <Tag className="w-3 h-3 text-slate-500" />
                                <strong className="text-slate-700">{item.brand.name}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Deliverables section */}
                      <div className="bg-slate-50 border border-cyan-200 p-3.5 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-cyan-600 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-cyan-600" />
                            <span>Deliverable Files to Verify ({deliverables.length})</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono italic">
                            Click link to inspect asset
                          </span>
                        </div>

                        {deliverables.length === 0 ? (
                          <p className="text-slate-400 italic text-xs p-2 text-center bg-slate-50/40 rounded-lg border border-dashed border-slate-200">
                            No deliverable output files attached yet.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {deliverables.map((d: any) => (
                              <div
                                key={d.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                  d.isActive
                                    ? 'bg-cyan-50/90 border-cyan-300 text-slate-900 shadow-xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="space-y-0.5 max-w-[65%] truncate">
                                  <div className="font-bold flex items-center gap-1.5 text-xs truncate">
                                    <span className="truncate">{d.fileName}</span>
                                    {d.isActive && (
                                      <span className="px-1.5 py-0.2 bg-cyan-100 text-cyan-800 border border-cyan-200 rounded text-[9px] font-mono shrink-0 font-bold">
                                        v{d.version} Active
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    By <strong className="text-slate-700">{d.uploadedBy}</strong> • {d.taskTitle}
                                  </div>
                                </div>

                                {d.fileUrl ? (
                                  <a
                                    href={d.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-lg text-[11px] transition-all flex items-center gap-1 shrink-0 shadow-md shadow-cyan-600/30"
                                  >
                                    <span>Review Asset</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic px-2 py-1">No URL</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Technical Checklist */}
                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <span className="text-[10px] text-cyan-600 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-600" />
                            <span>Technical Validation Checklist</span>
                          </span>
                          <span className="text-[9px] font-mono text-emerald-600 font-bold">
                            All 7 Criteria Passed
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700">
                          {TECHNICAL_CHECKLIST_ITEMS.map((checkItem, idx) => (
                            <label
                              key={idx}
                              className="flex items-center gap-2 cursor-pointer hover:text-slate-900 bg-slate-50/60 px-2 py-1 rounded-lg border border-slate-200"
                            >
                              <input
                                type="checkbox"
                                defaultChecked
                                className="w-3.5 h-3.5 accent-cyan-500 rounded bg-slate-50 border-slate-200 cursor-pointer"
                              />
                              <span className="truncate">{checkItem}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Review Actions & Quick Presets */}
                      <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
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
                                className="text-[10px] font-mono px-2 py-0.5 bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 border border-slate-200 hover:border-cyan-300 rounded-full transition-colors"
                              >
                                + {chip}
                              </button>
                            ))}
                          </div>
                        </div>

                        <input
                          type="text"
                          value={itemRemarks}
                          placeholder="Technical review remarks or revision reason..."
                          onChange={(e) => setItemRemarksMap((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-cyan-500 focus:bg-white placeholder-slate-400"
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
                            className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-xl flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
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
        {activeTab === 'MEDIA' && !isTechnicalManager && (() => {
          const mediaList = queue?.mediaReviewQueue || [];
          
          return (
            <div className="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-5 shadow-xs">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="font-extrabold text-purple-950 text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                    <span>2. Media Manager Review Queue</span>
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Review and sign off on creative quality, brand identity, pacing, and overall deliverable readiness.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-purple-900 font-mono bg-purple-50 px-3 py-1 rounded-full border border-purple-200 text-xs shadow-2xs">
                    {mediaList.length} Pending Item{mediaList.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {mediaList.length === 0 ? (
                <div className="py-14 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">No items pending Media Manager Review.</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Items will appear here in real-time once they pass Level 1 Technical Quality validation.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {mediaList.map((proj: any) => {
                    const deliverables = getDeliverableItems(proj);
                    const detailsUrl = getItemDetailsUrl(proj);
                    const sessionLabel = getItemSessionName(proj);
                    const itemType = getItemType(proj);

                    // Extract script and clip code if available
                    const scriptName =
                      proj.projectScript?.name ||
                      proj.script?.name ||
                      proj.name ||
                      'Shooting Script';

                    const clipCode =
                      proj.clipCode ||
                      proj.projectScript?.clipCode ||
                      proj.script?.clipCode ||
                      null;

                    const priority = proj.priority || proj.project?.priority || 'MEDIUM';
                    const assignedStaff =
                      proj.assignedEmployees?.[0]?.user?.name ||
                      proj.assignedEmployees?.[0]?.name ||
                      proj.assignedTeam?.[0]?.user?.name ||
                      proj.assignedTeam?.[0]?.name ||
                      'Production Staff';

                    const currentItemRemarks = itemRemarksMap[proj.id] || '';
                    const isItemSubmitting = submittingId === proj.id;

                    return (
                      <div
                        key={proj.id}
                        className="bg-white border border-slate-200/90 hover:border-purple-300 rounded-2xl p-5 shadow-xs hover:shadow-xl transition-all space-y-4 relative overflow-hidden flex flex-col justify-between"
                      >
                        {/* Top Accent Strip */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600" />

                        <div className="space-y-3.5">
                          {/* Top Row: IDs, Badges, Quick Inspect Actions */}
                          <div className="flex items-start justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-black bg-purple-50 text-purple-900 px-2.5 py-1 rounded-md border border-purple-200">
                                {proj.projectId || proj.taskId || proj.requirementId || proj.id}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                                {itemType === 'TASK' ? (
                                  <Film className="w-3 h-3 text-purple-600" />
                                ) : itemType === 'GRAPHIC_REQ' ? (
                                  <Palette className="w-3 h-3 text-pink-600" />
                                ) : (
                                  <Layers className="w-3 h-3 text-blue-600" />
                                )}
                                <span>{proj.taskType === 'VIDEO_EDITING' ? 'Video Editing' : itemType.replace(/_/g, ' ')}</span>
                              </span>
                              <span className={"px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase " + (
                                priority === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                priority === 'HIGH' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                'bg-blue-50 text-blue-700 border border-blue-200'
                              )}>
                                {priority}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setDetailModalItem(proj)}
                                className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs flex items-center gap-1 font-bold transition-colors cursor-pointer shadow-2xs"
                                title="Inspect Details & Script"
                              >
                                <Info className="w-3.5 h-3.5 text-purple-700" />
                                <span className="hidden sm:inline text-[11px]">Inspect</span>
                              </button>
                              <Link
                                href={detailsUrl}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs flex items-center gap-1 font-bold transition-colors"
                                title="Open Full Session"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5 text-slate-600" />
                              </Link>
                            </div>
                          </div>

                          {/* Title & Client / Brand */}
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                              {proj.name || proj.title || 'Production Item'}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                              {proj.client?.name && (
                                <span className="flex items-center gap-1 font-medium text-slate-700">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{proj.client.name}</span>
                                </span>
                              )}
                              {proj.brand?.name && (
                                <span className="flex items-center gap-1 font-semibold text-purple-900 bg-purple-50/60 px-2 py-0.5 rounded border border-purple-200/60 text-[11px]">
                                  <Tag className="w-3 h-3 text-purple-500" />
                                  <span>{proj.brand.name}</span>
                                </span>
                              )}
                              <span className="flex items-center gap-1 font-medium text-slate-600 ml-auto text-[11px]">
                                <UserIcon className="w-3 h-3 text-slate-400" />
                                <span>{assignedStaff}</span>
                              </span>
                            </div>
                          </div>

                          {/* Script & Clip Code Badge (Video Editing & Project Highlights) */}
                          {(proj.projectScript || clipCode || proj.script) && (
                            <div className="p-2.5 bg-purple-50/70 border border-purple-200/80 rounded-xl flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <FileText className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                <span className="text-slate-500 font-medium">Script:</span>
                                <strong className="text-slate-900 font-bold truncate">{scriptName}</strong>
                              </div>
                              {clipCode && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono text-[11px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-md shadow-2xs">
                                    {clipCode}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(clipCode);
                                      alert(`Copied clip code "${clipCode}" to clipboard!`);
                                    }}
                                    className="p-1 text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded transition-colors"
                                    title="Copy Clip Code"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Deliverables Section */}
                          <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                <Film className="w-3.5 h-3.5 text-purple-600" />
                                <span>Output Deliverables ({deliverables.length})</span>
                              </span>
                              <span className="text-[10px] text-purple-700 font-mono font-semibold">
                                Ready for QC
                              </span>
                            </div>

                            {deliverables.length === 0 ? (
                              <p className="text-slate-400 italic text-xs py-1.5 text-center bg-white rounded-lg border border-dashed border-slate-200">
                                Video Editor output submitted for creative review.
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {deliverables.map((d: any) => (
                                  <div
                                    key={d.id}
                                    className="p-2 bg-white rounded-lg border border-purple-100/90 flex items-center justify-between text-xs shadow-2xs hover:border-purple-300 transition-colors"
                                  >
                                    <div className="truncate max-w-[65%]">
                                      <span className="font-bold text-slate-900 block truncate text-xs">{d.fileName}</span>
                                      <span className="text-[10px] text-slate-500 block">By {d.uploadedBy}</span>
                                    </div>
                                    <a
                                      href={d.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md text-[11px] flex items-center gap-1 transition-colors shadow-2xs shrink-0"
                                    >
                                      <span>Review Asset</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Media Creative Validation Checklist */}
                          <div className="bg-purple-50/40 border border-purple-100 p-3 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between border-b border-purple-200/50 pb-1">
                              <span className="text-[10px] text-purple-900 font-extrabold uppercase tracking-wider flex items-center gap-1">
                                <CheckCheck className="w-3.5 h-3.5 text-purple-700" />
                                <span>Media Creative Checklist</span>
                              </span>
                              <span className="text-[9px] font-mono text-purple-700 font-bold">5 Quality Points</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-slate-700">
                              {MEDIA_CHECKLIST_ITEMS.map((checkItem, cIdx) => (
                                <label key={cIdx} className="flex items-center gap-1.5 bg-white/80 px-2 py-0.5 rounded border border-purple-100 cursor-pointer">
                                  <input type="checkbox" defaultChecked className="w-3 h-3 accent-purple-600 rounded cursor-pointer" />
                                  <span className="truncate">{checkItem}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Actions & Feedback Presets */}
                        <div className="space-y-2.5 pt-2 border-t border-slate-100">
                          {/* Quick Feedback Presets */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                              Feedback Presets:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {MEDIA_PRESET_FEEDBACK_CHIPS.map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => {
                                    setItemRemarksMap((prev) => {
                                      const current = prev[proj.id] || '';
                                      const next = current ? `${current}; ${chip}` : chip;
                                      return { ...prev, [proj.id]: next };
                                    });
                                  }}
                                  className="text-[9px] font-mono px-2 py-0.5 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-900 border border-slate-200 hover:border-purple-300 rounded-full transition-colors cursor-pointer"
                                >
                                  + {chip}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Remarks Text Input */}
                          <input
                            type="text"
                            value={currentItemRemarks}
                            placeholder="Enter Media creative remarks or revision notes..."
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemRemarksMap((prev) => ({ ...prev, [proj.id]: val }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-purple-500 focus:bg-white placeholder-slate-400 transition-all shadow-2xs"
                          />

                          {/* Decision Buttons */}
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              disabled={isItemSubmitting}
                              onClick={() => handleMediaReview(proj.id, 'APPROVED', currentItemRemarks)}
                              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                              <span>Approve Media Quality</span>
                            </button>

                            <button
                              type="button"
                              disabled={isItemSubmitting}
                              onClick={() => {
                                let rem = currentItemRemarks;
                                if (!rem.trim()) {
                                  const entered = prompt('Please enter a rejection reason or revision instruction:');
                                  if (!entered || !entered.trim()) return;
                                  rem = entered.trim();
                                  setItemRemarksMap((prev) => ({ ...prev, [proj.id]: rem }));
                                }
                                handleMediaReview(proj.id, 'REJECTED', rem);
                              }}
                              className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject &amp; Request Revision</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Marketing Review Queue Tab (restricted to Marketing Manager & Admin) */}
        {activeTab === 'MARKETING' && isMarketingManager && (() => {
          const effectiveMarketingQueue = (queue?.marketingReviewQueue || []).filter(
            (item: any) =>
              !activeBrandId ||
              item.brandId === activeBrandId ||
              item.project?.brandId === activeBrandId ||
              item.graphicRequirement?.brandId === activeBrandId ||
              item.brand?.id === activeBrandId,
          );

          return (
            <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="font-bold text-amber-700 text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" /> 3. Marketing Approval Queue
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Marketing Manager confirms strategic messaging, client guidelines, and final approval for video editing tasks & deliverables.
                  </p>
                </div>
                <span className="font-bold text-amber-800 font-mono bg-amber-50 px-3 py-1 rounded-full border border-amber-300 text-xs">
                  {effectiveMarketingQueue.length} Pending Items
                </span>
              </div>

              {effectiveMarketingQueue.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="font-semibold text-sm text-slate-700">No items pending marketing manager approval.</p>
                  <p className="text-xs text-slate-500">Video editing tasks and deliverables will appear here after passing Media Review approval.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {effectiveMarketingQueue.map((item: any) => {
                  const deliverables = getDeliverableItems(item);
                  const detailsUrl = getItemDetailsUrl(item);
                  const sessionLabel = getItemSessionName(item);

                  return (
                    <div key={item.id} className="p-5 bg-gradient-to-br from-amber-50/40 via-white to-white border-2 border-amber-200/80 rounded-xl space-y-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-amber-700 font-bold text-xs">{item.taskId || item.projectId || item.id}</span>
                            <span className="px-2 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold text-[9px] uppercase">
                              Waiting Marketing Sign-off
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm mt-0.5">{item.name || item.title}</h3>
                          <p className="text-slate-500 text-xs">{item.client?.name || 'Client'} • {item.brand?.name || 'Brand'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailModalItem(item)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs flex items-center gap-1"
                            title="View Details"
                          >
                            <Info className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                          <Link
                            href={detailsUrl}
                            className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold font-mono flex items-center gap-1"
                          >
                            <span>{sessionLabel}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {/* Script & Clip details if video editing */}
                      {(item.projectScript || item.clipCode) && (
                        <div className="p-2.5 bg-white border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            <span>{item.projectScript?.name || 'Shooting Script'}</span>
                          </div>
                          {item.clipCode && (
                            <span className="font-mono text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded">
                              Clip: {item.clipCode}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Deliverables / Media links */}
                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {deliverables.length === 0 ? (
                          <div className="text-[11px] text-slate-500 italic">No output files directly uploaded. Video Editor output submitted for marketing review.</div>
                        ) : (
                          deliverables.map((d: any) => (
                            <div key={d.id} className="flex items-center justify-between text-xs">
                              <span className="text-slate-700 truncate max-w-[70%]">{d.fileName}</span>
                              <a
                                href={d.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-700 hover:text-amber-800 text-[11px] font-bold flex items-center gap-1"
                              >
                                Open
                              </a>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Marketing Decision Actions */}
                      <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-lg">
                        <input
                          type="text"
                          placeholder="Marketing Review Remarks / Sign-off Notes..."
                          onChange={(e) => setRemarks(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded text-xs focus:border-amber-500 focus:outline-none"
                        />
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleMarketingReview(item.id, 'APPROVED')}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 text-xs shadow-md transition-all"
                          >
                            <Check className="w-4 h-4" /> Approve Marketing Quality
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMarketingReview(item.id, 'REJECTED')}
                            className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold rounded-lg flex items-center justify-center gap-1.5 text-xs transition-all"
                          >
                            <X className="w-4 h-4" /> Reject & Request Revision
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ); })()}

        {/* Client Confirmation Queue Tab (restricted to Marketing Manager & Admin, hidden from Media Manager) */}
        {activeTab === 'CLIENT' && !isTechnicalManager && !isMediaManager && (
          <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="font-bold text-emerald-600 text-base flex items-center gap-2">
                  <PhoneCall className="w-5 h-5" /> 4. Client Confirmation Queue
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Record client decision manually (WhatsApp, Email, Call, Meeting). Revision requested restarts production.
                </p>
              </div>
              <span className="font-bold text-emerald-700 font-mono bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 text-xs">
                {effectiveClientConfirmationQueue.length} Pending Items
              </span>
            </div>

            {effectiveClientConfirmationQueue.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <PhoneCall className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="font-semibold text-sm">No items pending client confirmation.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {effectiveClientConfirmationQueue.map((proj: any) => {
                  const detailsUrl = getItemDetailsUrl(proj);
                  const sessionLabel = getItemSessionName(proj);

                  return (
                    <div key={proj.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 shadow-lg">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-emerald-600 font-bold text-xs">{proj.projectId || proj.id}</span>
                          <h3 className="font-bold text-slate-900 text-sm">{proj.name || proj.title}</h3>
                          <p className="text-slate-500 text-xs">{proj.client?.name} • {proj.brand?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailModalItem(proj)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs flex items-center gap-1"
                            title="View Details"
                          >
                            <Info className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                          <Link
                            href={detailsUrl}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-900 text-emerald-700 border border-emerald-200 text-[10px] font-bold font-mono flex items-center gap-1"
                          >
                            <span>{sessionLabel}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={clientDecision}
                            onChange={(e) => setClientDecision(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded text-xs"
                          >
                            <option value="APPROVED">Approved by Client</option>
                            <option value="REVISION_REQUESTED">Revision Requested</option>
                            <option value="REJECTED">Rejected by Client</option>
                          </select>

                          <select
                            value={commMethod}
                            onChange={(e) => setCommMethod(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded text-xs"
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
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded text-xs"
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div
              className={`bg-slate-50 border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 ${
                confirmModal.status === 'APPROVED'
                  ? 'border-emerald-200 shadow-emerald-500/10'
                  : 'border-rose-200 shadow-rose-500/10'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-2xl flex items-center justify-center ${
                      confirmModal.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    {confirmModal.status === 'APPROVED' ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <AlertTriangle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                      {confirmModal.status === 'APPROVED'
                        ? 'Confirm Technical Quality Approval'
                        : 'Confirm Deliverable Rejection & Revision'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {confirmModal.status === 'APPROVED'
                        ? 'This item will be marked technically compliant and move forward in the workflow.'
                        : 'This deliverable will be returned to the production staff with your revision feedback.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setConfirmModal(null)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Item Overview Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-cyan-600 font-bold">
                    {confirmModal.item.projectId ||
                      confirmModal.item.taskId ||
                      confirmModal.item.scriptId ||
                      confirmModal.item.requirementId ||
                      confirmModal.item.id}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-700 rounded font-mono text-[10px]">
                    {getItemType(confirmModal.item).replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {confirmModal.item.name || confirmModal.item.title || 'Production Item'}
                </div>
                {(confirmModal.item.client?.name || confirmModal.item.brand?.name) && (
                  <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>{confirmModal.item.client?.name || 'Client'}</span>
                    {confirmModal.item.brand?.name && (
                      <>
                        <span>•</span>
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{confirmModal.item.brand.name}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Remarks / Feedback in Modal */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {confirmModal.status === 'APPROVED'
                        ? 'Sign-off QC Notes (Optional):'
                        : 'Rejection Reason / Revision Instructions (Required):'}
                    </span>
                  </span>
                  {confirmModal.status === 'REJECTED' && (
                    <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">
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
                        className="text-[10px] font-mono px-2 py-0.5 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-800 border border-slate-200 hover:border-rose-200 rounded-full transition-colors"
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
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-cyan-500 focus:bg-white placeholder-slate-400 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  disabled={submittingId !== null}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-slate-50 border border-cyan-300 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200">
                    <Info className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-cyan-600 bg-slate-50 px-2.5 py-0.5 rounded border border-slate-200">
                        {detailModalItem.projectId ||
                          detailModalItem.taskId ||
                          detailModalItem.scriptId ||
                          detailModalItem.requirementId ||
                          detailModalItem.id}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-mono font-bold uppercase">
                        {getItemType(detailModalItem).replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">
                      {detailModalItem.name || detailModalItem.title || 'Item Details'}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setDetailModalItem(null)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* VIDEO_EDITING_APPROVAL_MODAL_VIEW */}
              {detailModalItem.taskType === 'VIDEO_EDITING' ? (() => {
                const rawNotes = detailModalItem.project?.notes;
                let parsedScript: any = null;
                if (rawNotes) {
                  try {
                    const parsed = extractEventScripts({ notes: rawNotes }, 'Script');
                    parsedScript = parsed.find(
                      (s: any) =>
                        s.id === detailModalItem.scriptId ||
                        s.id === detailModalItem.projectScriptId ||
                        s.title === detailModalItem.projectScript?.name ||
                        s.title === detailModalItem.title?.replace(/^Video Editing\s*-\s*/, '') ||
                        s.title === detailModalItem.name?.replace(/^Video Editing\s*-\s*/, '')
                    );
                  } catch {
                    // ignore parse error
                  }
                }

                const scriptName =
                  detailModalItem.projectScript?.name ||
                  parsedScript?.title ||
                  detailModalItem.script?.name ||
                  detailModalItem.title?.replace(/^Video Editing\s*-\s*/, '') ||
                  detailModalItem.name ||
                  'Shooting Script';

                const clipCode =
                  detailModalItem.clipCode ||
                  detailModalItem.projectScript?.clipCode ||
                  parsedScript?.clipCodes?.map((c: any) => (typeof c === 'string' ? c : c.code)).join(', ') ||
                  'N/A';

                const scriptText =
                  detailModalItem.projectScript?.description ||
                  parsedScript?.scriptText ||
                  parsedScript?.text ||
                  detailModalItem.script?.description ||
                  detailModalItem.script?.content ||
                  '';

                const scriptHook = parsedScript?.hook || null;
                const scriptDuration = parsedScript?.duration || null;
                const sceneNumber = parsedScript?.sceneNumber || null;
                const targetPlatform = parsedScript?.targetPlatform || null;

                const allScriptDocs = (detailModalItem.project?.files || detailModalItem.files || []).filter(
                  (f: any) =>
                    (f.attachmentCategory === 'SCRIPT_DOCUMENT' ||
                     f.folderCategory === 'Script Documents' ||
                     f.fileType === 'SCRIPT' ||
                     f.category === 'SCRIPT' ||
                     f.storagePath?.includes('Script Documents') ||
                     f.fileName?.match(/\.(pdf|docx?|txt|rtf)$/i)) &&
                    f.attachmentCategory !== 'REFERENCE_FILE'
                );

                const specificScriptFiles = allScriptDocs.filter((f: any) => {
                  const normScriptName = (scriptName || '').toLowerCase().trim();
                  const normFileName = (f.fileName || f.name || f.title || '').toLowerCase().trim();
                  if (detailModalItem.scriptId && (f.id === detailModalItem.scriptId || f.scriptId === detailModalItem.scriptId)) return true;
                  if (detailModalItem.projectScriptId && (f.id === detailModalItem.projectScriptId || f.scriptId === detailModalItem.projectScriptId)) return true;
                  if (normFileName && normScriptName && (normFileName === normScriptName || normFileName.includes(normScriptName) || normScriptName.includes(normFileName))) return true;
                  return false;
                });

                const scriptFiles = specificScriptFiles.length > 0 ? specificScriptFiles : (allScriptDocs.length === 1 ? allScriptDocs : []);

                return (
                  <div className="space-y-4">
                    {/* Video Editing Metadata Attributes */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Project Priority</span>
                        <span className={"inline-block mt-0.5 px-2 py-0.5 rounded font-extrabold uppercase text-[10px] " + (
                          detailModalItem.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          detailModalItem.priority === 'HIGH' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        )}>
                          {detailModalItem.priority || 'MEDIUM'} Priority
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Due Date</span>
                        <strong className="text-amber-800 block mt-0.5">
                          {detailModalItem.dueDate ? new Date(detailModalItem.dueDate).toLocaleDateString() : 'N/A'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Video Editor</span>
                        <strong className="text-slate-800 block mt-0.5 truncate">
                          {detailModalItem.assignedEmployees?.[0]?.user?.name || detailModalItem.assignedEmployees?.[0]?.name || 'Video Editor'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Review Status</span>
                        <span className="font-mono text-cyan-800 font-bold bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 text-[11px] inline-block mt-0.5">
                          {detailModalItem.status || 'WAITING_FOR_TECHNICAL_REVIEW'}
                        </span>
                      </div>
                    </div>

                    {/* 1. SEPARATE CLIP CODE SECTION */}
                    <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                          <Film className="w-4 h-4 text-purple-700" /> Assigned Clip Code
                        </span>
                        <span className="text-[10px] text-purple-700 font-medium">Footage Identifier</span>
                      </div>
                      <div className="p-3 bg-white border border-purple-200 rounded-lg flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Clip Code:</span>
                          <span className="font-mono text-purple-900 font-extrabold bg-purple-100 px-2.5 py-1 rounded-md text-xs border border-purple-300 tracking-wider">
                            {clipCode}
                          </span>
                        </div>
                        {clipCode && clipCode !== 'N/A' && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(clipCode);
                              alert(`Copied clip code "${clipCode}" to clipboard!`);
                            }}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Copy Clip Code"
                          >
                            <Copy className="w-3.5 h-3.5 text-purple-700" />
                            <span>Copy</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. SEPARATE ATTACHED SCRIPT SECTION */}
                    <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-700" /> Attached Script
                        </span>
                        <span className="font-bold text-xs text-blue-900 bg-white border border-blue-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                          {scriptName}
                        </span>
                      </div>

                      {/* Script Metadata Badges if available */}
                      {(scriptHook || scriptDuration || sceneNumber || targetPlatform) && (
                        <div className="flex flex-wrap gap-2 text-[10px]">
                          {sceneNumber && (
                            <span className="px-2 py-0.5 bg-white border border-blue-200 rounded text-slate-700 font-semibold">
                              Scene: <strong className="text-blue-900 font-bold">{sceneNumber}</strong>
                            </span>
                          )}
                          {scriptDuration && (
                            <span className="px-2 py-0.5 bg-white border border-blue-200 rounded text-slate-700 font-semibold">
                              Est. Duration: <strong className="text-blue-900 font-bold">{scriptDuration}</strong>
                            </span>
                          )}
                          {targetPlatform && (
                            <span className="px-2 py-0.5 bg-white border border-blue-200 rounded text-slate-700 font-semibold">
                              Platform: <strong className="text-blue-900 font-bold">{targetPlatform}</strong>
                            </span>
                          )}
                          {scriptHook && (
                            <div className="w-full mt-1 p-2 bg-white/80 border border-blue-100 rounded text-[11px] text-blue-950">
                              <span className="font-bold text-blue-800 mr-1">Hook:</span>
                              <span className="italic">"{scriptHook}"</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Script Body / Content */}
                      {scriptText ? (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">Script Content</span>
                          <div className="p-3 bg-white border border-blue-200 rounded-lg text-slate-900 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto shadow-2xs">
                            {scriptText}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-white/60 border border-blue-100 rounded-lg text-slate-500 italic text-center text-xs">
                          No text content found for this script.
                        </div>
                      )}

                      {/* Attached Script Files / Documents */}
                      {scriptFiles.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">Attached Script Documents ({scriptFiles.length})</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {scriptFiles.map((file: any, fIdx: number) => {
                              const fileUrl = file.storagePath?.startsWith('http')
                                ? file.storagePath
                                : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/' + (file.storagePath ? file.storagePath.replace(/^\/?/, '') : '');
                              return (
                                <div
                                  key={file.id || fIdx}
                                  className="p-2.5 bg-white border border-blue-200 rounded-lg flex items-center justify-between gap-2 shadow-2xs"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                    <span className="font-medium text-slate-900 truncate text-xs">{file.fileName || file.name || `Script Document ${fIdx + 1}`}</span>
                                  </div>
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                                  >
                                    <Eye className="w-3 h-3" /> View
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Task Description */}
                    {detailModalItem.description && detailModalItem.description !== scriptText && (
                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5 text-xs">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Task Description</span>
                        <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">{detailModalItem.description}</p>
                      </div>
                    )}

                    {/* Stage-Aware Review Decision Action Controls */}
                    {(() => {
                      const isMediaStage =
                        detailModalItem.status === 'WAITING_FOR_MEDIA_REVIEW' ||
                        detailModalItem.status === 'MEDIA_MANAGER_REVIEW' ||
                        activeTab === 'MEDIA' ||
                        isMediaManager;

                      const isMarketingStage =
                        detailModalItem.status === 'WAITING_FOR_MARKETING_APPROVAL' ||
                        detailModalItem.status === 'WAITING_FOR_MARKETING_MANAGER_REVIEW' ||
                        detailModalItem.status === 'PENDING_MARKETING_APPROVAL' ||
                        activeTab === 'MARKETING' ||
                        (isMarketingManager && activeTab !== 'TECH' && activeTab !== 'MEDIA');

                      return (
                        <div className={`p-4 rounded-xl space-y-3 border ${
                          isMediaStage
                            ? 'bg-purple-50/80 border-purple-200'
                            : isMarketingStage
                            ? 'bg-amber-50/80 border-amber-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] uppercase font-extrabold tracking-wider flex items-center gap-1.5 ${
                              isMediaStage
                                ? 'text-purple-950'
                                : isMarketingStage
                                ? 'text-amber-950'
                                : 'text-slate-900'
                            }`}>
                              {isMediaStage ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-purple-700" />
                                  Media Manager Review Decision
                                </>
                              ) : isMarketingStage ? (
                                <>
                                  <Sparkles className="w-4 h-4 text-amber-700" />
                                  Marketing Manager Review Decision
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                                  Technical Review Decision
                                </>
                              )}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isMediaStage
                                ? 'bg-purple-100 text-purple-800'
                                : isMarketingStage
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-cyan-100 text-cyan-800'
                            }`}>
                              {detailModalItem.status || (isMediaStage ? 'WAITING_FOR_MEDIA_REVIEW' : isMarketingStage ? 'WAITING_FOR_MARKETING_APPROVAL' : 'WAITING_FOR_TECHNICAL_REVIEW')}
                            </span>
                          </div>

                          <input
                            type="text"
                            value={itemRemarksMap[detailModalItem.id] || remarks || ''}
                            placeholder={
                              isMediaStage
                                ? 'Media creative quality remarks / feedback notes...'
                                : isMarketingStage
                                ? 'Marketing approval remarks / sign-off notes...'
                                : 'Technical review remarks (optional for approval, required for rejection)...'
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemRemarksMap((prev) => ({ ...prev, [detailModalItem.id]: val }));
                              setRemarks(val);
                            }}
                            className="w-full bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-purple-500 shadow-2xs"
                          />

                          <div className="flex items-center gap-3">
                            {isMediaStage ? (
                              <>
                                <button
                                  type="button"
                                  disabled={submittingId === detailModalItem.id}
                                  onClick={async () => {
                                    const currentRemarks = itemRemarksMap[detailModalItem.id] || remarks || '';
                                    setDetailModalItem(null);
                                    await handleMediaReview(detailModalItem.id, 'APPROVED', currentRemarks);
                                  }}
                                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="w-4 h-4" /> Approve Media Review
                                </button>
                                <button
                                  type="button"
                                  disabled={submittingId === detailModalItem.id}
                                  onClick={async () => {
                                    let currentRemarks = itemRemarksMap[detailModalItem.id] || remarks || '';
                                    if (!currentRemarks.trim()) {
                                      const entered = prompt('Please enter a rejection reason or revision instruction:');
                                      if (!entered || !entered.trim()) return;
                                      currentRemarks = entered.trim();
                                      setRemarks(currentRemarks);
                                    }
                                    setDetailModalItem(null);
                                    await handleMediaReview(detailModalItem.id, 'REJECTED', currentRemarks);
                                  }}
                                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" /> Reject & Request Revision
                                </button>
                              </>
                            ) : isMarketingStage ? (
                              <>
                                <button
                                  type="button"
                                  disabled={submittingId === detailModalItem.id}
                                  onClick={async () => {
                                    const currentRemarks = itemRemarksMap[detailModalItem.id] || remarks || '';
                                    setDetailModalItem(null);
                                    await handleMarketingReview(detailModalItem.id, 'APPROVED', currentRemarks);
                                  }}
                                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="w-4 h-4" /> Approve Marketing Review
                                </button>
                                <button
                                  type="button"
                                  disabled={submittingId === detailModalItem.id}
                                  onClick={async () => {
                                    let currentRemarks = itemRemarksMap[detailModalItem.id] || remarks || '';
                                    if (!currentRemarks.trim()) {
                                      const entered = prompt('Please enter a rejection reason or revision instruction:');
                                      if (!entered || !entered.trim()) return;
                                      currentRemarks = entered.trim();
                                      setRemarks(currentRemarks);
                                    }
                                    setDetailModalItem(null);
                                    await handleMarketingReview(detailModalItem.id, 'REJECTED', currentRemarks);
                                  }}
                                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" /> Reject & Request Revision
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={submittingId === detailModalItem.id}
                                  onClick={() => {
                                    setDetailModalItem(null);
                                    openTechConfirmation(detailModalItem, 'APPROVED');
                                  }}
                                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                  <ShieldCheck className="w-4 h-4" /> Approve Technical Review
                                </button>
                                <button
                                  type="button"
                                  disabled={submittingId === detailModalItem.id}
                                  onClick={() => {
                                    setDetailModalItem(null);
                                    openTechConfirmation(detailModalItem, 'REJECTED');
                                  }}
                                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" /> Reject & Request Revision
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })() : (
                <>
              {/* Client & Metadata Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block font-bold">Client & Brand</span>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{detailModalItem.client?.name || 'No client specified'}</span>
                  </div>
                  {detailModalItem.brand?.name && (
                    <div className="text-slate-500 text-[11px] flex items-center gap-1.5 pt-0.5">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span>{detailModalItem.brand.name}</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block font-bold">Status & Stage</span>
                  <div className="font-bold text-cyan-600 flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                    <span>{detailModalItem.status || 'WAITING_FOR_TECHNICAL_REVIEW'}</span>
                  </div>
                  {detailModalItem.createdAt && (
                    <div className="text-slate-500 text-[11px] flex items-center gap-1.5 pt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Created: {new Date(detailModalItem.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Script / Screenplay Copy (Multi-script aware) */}
              {(() => {
                const isGraphicReq =
                  detailModalItem.type === 'GRAPHIC_REQUIREMENT' ||
                  detailModalItem.itemType === 'GRAPHIC_REQUIREMENT' ||
                  detailModalItem.eventSource === 'GRAPHIC_REQUIREMENT' ||
                  !!detailModalItem.graphicRequirementId ||
                  !!detailModalItem.graphicRequirement;
                if (isGraphicReq) return null;

                const scripts: ProjectScript[] = extractEventScripts(
                  detailModalItem,
                  detailModalItem.title || detailModalItem.name
                );
                if (scripts.length === 0) return null;
                const activeScript = scripts[activeApprovalScriptIdx] || scripts[0];

                return (
                  <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-900 font-mono uppercase font-bold flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-700" />
                        Script &amp; Screenplay Storyline ({scripts.length} script{scripts.length > 1 ? 's' : ''})
                      </span>
                      <Link
                        href={getItemDetailsUrl(detailModalItem)}
                        className="text-[10px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 underline"
                      >
                        Edit Script in Project ↗
                      </Link>
                    </div>

                    {/* Script Tabs if multiple scripts */}
                    {scripts.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin border-b border-amber-200/60 pb-2">
                        {scripts.map((s, idx) => (
                          <button
                            key={s.id || idx}
                            type="button"
                            onClick={() => setActiveApprovalScriptIdx(idx)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1 border ${
                              activeApprovalScriptIdx === idx
                                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                                : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/70'
                            }`}
                          >
                            <span className="font-mono text-[9px] opacity-75">#{idx + 1}</span>
                            <span>{s.title}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Active Hook Callout */}
                    {activeScript.hook && (
                      <div className="p-2 bg-amber-100/80 rounded-lg border border-amber-200 text-xs italic text-amber-950">
                        <strong className="not-italic font-bold">🎣 Hook:</strong> "{activeScript.hook}"
                      </div>
                    )}

                    <div className="bg-white/90 p-3 rounded-lg border border-amber-200/70 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {activeScript.scriptText || detailModalItem.notes || detailModalItem.calendarEvent?.caption}
                    </div>

                    {activeScript.notes && (
                      <p className="text-[11px] text-slate-600 italic">
                        📝 Notes: {activeScript.notes}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Description / Storyline / Brief / Production Notes */}
              {(detailModalItem.description || detailModalItem.storyline || detailModalItem.brief || detailModalItem.productionNotes) && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] text-cyan-600 font-mono uppercase block font-bold">
                    Description &amp; Production Notes
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {detailModalItem.description || detailModalItem.storyline || detailModalItem.brief || detailModalItem.productionNotes}
                  </p>
                </div>
              )}

              {/* Team Members / Assignees */}
              {(detailModalItem.assignedEmployees || detailModalItem.assignedTeam) && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] text-cyan-600 font-mono uppercase block font-bold">
                    Assigned Production Staff
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(detailModalItem.assignedEmployees || detailModalItem.assignedTeam)?.map((member: any, idx: number) => {
                      const staff = member.user || member;
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-cyan-600" />
                          <span className="font-bold text-slate-900">{staff.name || 'Team Member'}</span>
                          {staff.role && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                              {staff.role}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Script Documents Review Card */}
              {detailModalItem.type !== 'GRAPHIC_REQUIREMENT' &&
               detailModalItem.itemType !== 'GRAPHIC_REQUIREMENT' &&
               detailModalItem.eventSource !== 'GRAPHIC_REQUIREMENT' &&
               !detailModalItem.graphicRequirementId &&
               !detailModalItem.graphicRequirement && (
                <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <span className="text-[10px] text-purple-900 font-mono uppercase block font-bold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-700" />
                      Attached Script Documents (PDF/DOC/DOCX/TXT)
                    </span>
                  <div className="flex items-center gap-2">
                    <label className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-xs">
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Upload Script</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadScriptForApprovalItem(file, detailModalItem);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>

                {(() => {
                  const scriptFiles = getScriptDocumentItems(detailModalItem);
                  if (scriptFiles.length === 0) {
                    return (
                      <div className="p-3 bg-white/80 border border-purple-100 rounded-lg text-slate-500 flex items-center justify-between text-xs">
                        <span>No script documents attached to this item.</span>
                        <span className="text-[10px] text-purple-700 font-semibold">Managers can upload or update scripts at any time</span>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {scriptFiles.map((sf: any) => (
                        <div
                          key={sf.id || sf.fileName}
                          className="p-2.5 rounded-xl border border-purple-200 bg-white flex items-center justify-between text-xs shadow-xs"
                        >
                          <div className="truncate max-w-[70%]">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span className="truncate">{sf.fileName}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              {sf.fileSize && <span>{(sf.fileSize / 1024).toFixed(1)} KB</span>}
                              <span>• By <strong className="text-slate-700">{sf.uploadedBy}</strong></span>
                              {sf.createdAt && <span>• {new Date(sf.createdAt).toLocaleDateString()}</span>}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPreviewScriptDoc(sf)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Script</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              )}

              {/* Deliverable Assets List */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-cyan-600 font-mono uppercase block font-bold">
                    Deliverable Files & Versions
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {getDeliverableItems(detailModalItem).length} Files Attached
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {getDeliverableItems(detailModalItem).map((d: any) => (
                    <div
                      key={d.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div className="truncate max-w-[70%]">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="truncate">{d.fileName}</span>
                          {d.isActive && (
                            <span className="px-1.5 py-0.2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded text-[9px] font-mono shrink-0">
                              v{d.version} Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          By <strong className="text-slate-700">{d.uploadedBy}</strong>
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

              </>
              )}

              {/* Modal Navigation Footer */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
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

        {/* In-app Script Document Viewer Modal */}
        <ScriptDocumentViewerModal
          doc={previewScriptDoc}
          onClose={() => setPreviewScriptDoc(null)}
        />
      </div>
    </RoleGuard>
  );
}
