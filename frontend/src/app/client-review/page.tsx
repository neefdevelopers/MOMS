'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RotateCcw,
  Calendar,
  Building2,
  BookmarkCheck,
  Package,
  Layers,
  Share2,
  Copy,
  Check,
  FileText,
  MessageSquare,
  History,
  ShieldCheck,
  Image as ImageIcon,
  Video,
  Send,
  X,
  Filter,
  Search,
  ExternalLink,
  Flame,
  SlidersHorizontal,
  ArrowRight,
  Eye,
  User,
  AlertTriangle,
  MapPin,
  Camera,
  Users,
  CloudSun,
  Phone,
  Shield,
  Edit,
  Link as LinkIcon,
  Compass,
  Sparkles,
  CheckSquare,
  Tag,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  ProjectScript,
  parseProjectScripts,
  extractEventScripts,
  serializeProjectScripts,
  formatScriptsAsSummaryText,
} from '@/lib/project-scripts';

import { useBrand } from '@/lib/brand-context';

export default function ClientReviewPage() {
  const { user } = useAuth();
  const { activeBrandId, activeBrand, setActiveBrandId } = useBrand();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [editRequests, setEditRequests] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEditRequest, setSelectedEditRequest] = useState<any | null>(null);
  const [editRequestModalTab, setEditRequestModalTab] = useState<'CHANGES_ONLY' | 'FULL_DETAILS' | 'DIFF_TABLE'>('CHANGES_ONLY');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'MARKETING_MANAGER') {
      router.push('/');
    }
  }, [user, router]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_CLIENT_APPROVAL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editable Client Fields State
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [editPriority, setEditPriority] = useState<string>('MEDIUM');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Script Document Management State for Marketing Manager
  const [uploadingScriptDoc, setUploadingScriptDoc] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [scriptSuccessMsg, setScriptSuccessMsg] = useState<string | null>(null);
  const [eventFiles, setEventFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Video Editing Approvals State for Marketing Manager
  const [videoTasks, setVideoTasks] = useState<any[]>([]);
  const [selectedVideoTask, setSelectedVideoTask] = useState<any | null>(null);
  const [videoReviewModalAction, setVideoReviewModalAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [videoReviewRemarks, setVideoReviewRemarks] = useState<string>('');
  const [submittingVideoReview, setSubmittingVideoReview] = useState(false);

  // Decision Modal State
  const [reviewModalAction, setReviewModalAction] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT' | null>(null);
  const [editRequestModalAction, setEditRequestModalAction] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT' | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [editRequestComment, setEditRequestComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadClientData = async () => {
    try {
      const [resEvents, resReqs, resQueue, resTasks] = await Promise.all([
        fetchApi('/calendar?status=ALL').catch(() => []),
        fetchApi('/calendar/edit-requests/all?status=PENDING_MARKETING_APPROVAL').catch(() => []),
        fetchApi('/approvals/queue').catch(() => ({ marketingReviewQueue: [] })),
        fetchApi('/tasks').catch(() => []),
      ]);
      const rawEvents = Array.isArray(resEvents) ? resEvents : (resEvents?.data || resEvents?.events || resEvents?.items || []);
      const rawReqs = Array.isArray(resReqs) ? resReqs : (resReqs?.data || resReqs?.items || []);
      const rawQueueTasks = resQueue?.marketingReviewQueue || [];
      const allTaskList = Array.isArray(resTasks) ? resTasks : (resTasks?.data || []);
      const additionalTasks = allTaskList.filter((t: any) => {
        const taskBrand = t.brandId || t.brand?.id || t.project?.brandId || t.graphicRequirement?.brandId;
        const hasBrand = Boolean(taskBrand && typeof taskBrand === 'string' && taskBrand.trim() !== '' && taskBrand.trim().toLowerCase() !== 'null');
        return (
          hasBrand &&
          t.taskType === 'VIDEO_EDITING' &&
          (t.status === 'WAITING_FOR_MARKETING_APPROVAL' ||
           t.status === 'WAITING_FOR_MARKETING_MANAGER_REVIEW' ||
           t.status === 'PENDING_MARKETING_APPROVAL' ||
           (t.mediaManagerApproved && !t.marketingManagerApproved && t.status !== 'CANCELLED'))
        );
      });

      // Merge unique tasks by id
      const taskMap = new Map<string, any>();
      for (const t of rawQueueTasks) {
        taskMap.set(t.id, t);
      }
      for (const t of additionalTasks) {
        if (!taskMap.has(t.id)) {
          taskMap.set(t.id, {
            ...t,
            name: t.title || t.name,
            projectId: t.projectId || t.taskId,
          });
        }
      }
      const combinedVideoTasks = Array.from(taskMap.values());

      setEvents(rawEvents);
      setEditRequests(rawReqs);
      setVideoTasks(combinedVideoTasks);
    } catch (err) {
      console.error('Failed to load client review data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'VIDEO_EDITING' || tab === 'video') {
        setStatusFilter('VIDEO_EDITING');
      }
    }
  }, []);

  const handleMarketingReviewTask = async (taskId: string, status: 'APPROVED' | 'REJECTED', remarks?: string) => {
    try {
      setSubmittingVideoReview(true);
      await fetchApi('/approvals/marketing-review', {
        method: 'POST',
        body: JSON.stringify({ projectId: taskId, status, remarks: remarks || '' }),
      });
      alert(status === 'APPROVED' ? 'Video Editing Task Approved! Task marked as completed 100%.' : 'Revision requested successfully.');
      setSelectedVideoTask(null);
      setVideoReviewModalAction(null);
      setVideoReviewRemarks('');
      loadClientData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit marketing review');
    } finally {
      setSubmittingVideoReview(false);
    }
  };

  const filteredEvents = React.useMemo(() => {
    return events.filter((e) => {
      if (activeBrandId && e.brandId !== activeBrandId) return false;
      if (statusFilter === 'PENDING_CLIENT_APPROVAL') {
        if (
          e.status !== 'PENDING_CLIENT_APPROVAL' &&
          e.status !== 'PENDING_CLIENT_REVIEW' &&
          e.status !== 'PENDING_MARKETING_APPROVAL' &&
          e.status !== 'WAITING_FOR_MEDIA_REVIEW'
        )
          return false;
      } else if (statusFilter === 'APPROVED') {
        if (e.status !== 'APPROVED' && e.status !== 'CLIENT_APPROVED') return false;
      } else if (statusFilter && statusFilter !== 'ALL' && e.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = e.title?.toLowerCase().includes(q);
        const matchId = (e.eventId || e.id).toLowerCase().includes(q);
        const matchBrand = e.brand?.name?.toLowerCase().includes(q);
        const matchCaption = e.caption?.toLowerCase().includes(q);
        return matchTitle || matchId || matchBrand || matchCaption;
      }
      return true;
    });
  }, [events, activeBrandId, statusFilter, searchQuery]);

  const selectedEvent = React.useMemo(() => {
    return selectedEventId ? events.find((e) => e.id === selectedEventId) || null : null;
  }, [selectedEventId, events]);

  const refreshEventFiles = async (eventObj: any = selectedEvent) => {
    if (!eventObj) {
      setEventFiles([]);
      return;
    }
    const grId =
      eventObj.graphicRequirementId ||
      eventObj.graphicRequirement?.id ||
      eventObj.graphicReqs?.[0]?.id;

    const projectId =
      eventObj.shootId ||
      eventObj.shoot?.id ||
      eventObj.shootProjects?.[0]?.id ||
      eventObj.graphicRequirement?.projectId ||
      eventObj.shootProjects?.[0]?.projectId;

    const queryKey = grId || projectId || eventObj.id;
    if (queryKey) {
      try {
        setLoadingFiles(true);
        const res = await fetchApi(`/files/project/${queryKey}`);
        let all = res.allFiles || [];
        if (grId || eventObj.eventSource === 'GRAPHIC_REQUIREMENT') {
          if (grId) {
            all = all.filter((f: any) => f.graphicRequirementId === grId);
          } else {
            all = [];
          }
        } else if (eventObj.eventSource === 'SHOOT' || eventObj.shootId || eventObj.shoot) {
          all = all.filter((f: any) => !f.graphicRequirementId);
        }
        setEventFiles(all);
      } catch {
        setEventFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    } else {
      setEventFiles([]);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      const dStr = selectedEvent.clientApprovalDeadline
        ? new Date(selectedEvent.clientApprovalDeadline).toISOString().split('T')[0]
        : '';
      setEditDeadline(dStr);
      setEditPriority(selectedEvent.priority || 'MEDIUM');
      setShowSettingsDrawer(false);
      setScriptSuccessMsg(null);

      // Load attached project/event files (for script document review)
      refreshEventFiles(selectedEvent);
    }
  }, [selectedEvent?.id]);

  const handleUploadScriptFiles = async (files: FileList | File[] | File) => {
    if (!files || !selectedEvent) return;
    const fileArray = files instanceof FileList ? Array.from(files) : Array.isArray(files) ? files : [files];
    if (fileArray.length === 0) return;

    const projectId =
      selectedEvent.shootId ||
      selectedEvent.shoot?.id ||
      selectedEvent.shootProjects?.[0]?.id ||
      selectedEvent.graphicRequirement?.projectId ||
      selectedEvent.shootProjects?.[0]?.projectId;

    try {
      setUploadingScriptDoc(true);
      for (const file of fileArray) {
        const fd = new FormData();
        fd.append('file', file);
        if (projectId) {
          fd.append('projectId', projectId);
        } else {
          fd.append('calendarEventId', selectedEvent.id);
        }
        fd.append('folderCategory', 'Script Documents');
        fd.append('attachmentCategory', 'SCRIPT_DOCUMENT');

        await fetchApi('/files/upload', {
          method: 'POST',
          body: fd,
        });
      }

      await refreshEventFiles(selectedEvent);
      setScriptSuccessMsg(
        fileArray.length === 1
          ? '✅ Script document uploaded successfully!'
          : `✅ ${fileArray.length} script documents uploaded successfully!`
      );
      setTimeout(() => setScriptSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to upload script document.');
    } finally {
      setUploadingScriptDoc(false);
    }
  };

  const handleDeleteScriptFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete script file "${fileName}"?`)) return;
    try {
      setDeletingFileId(fileId);
      await fetchApi(`/files/${fileId}`, {
        method: 'DELETE',
      });
      await refreshEventFiles(selectedEvent);
      setScriptSuccessMsg(`✅ Deleted "${fileName}" successfully.`);
      setTimeout(() => setScriptSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete script file.');
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleConfirmReviewAction = async () => {
    if (!selectedEvent || !reviewModalAction) return;

    if (
      (reviewModalAction === 'REQUEST_CHANGES' || reviewModalAction === 'REJECT') &&
      !commentText.trim()
    ) {
      alert(
        `A mandatory feedback comment is required when you ${
          reviewModalAction === 'REQUEST_CHANGES' ? 'request changes' : 'reject content'
        }.`,
      );
      return;
    }

    try {
      setSubmittingReview(true);
      const payload: any = {
        action: reviewModalAction,
        comment: commentText.trim(),
      };

      const curDeadline = selectedEvent.clientApprovalDeadline
        ? new Date(selectedEvent.clientApprovalDeadline).toISOString().split('T')[0]
        : '';
      if (editDeadline && editDeadline !== curDeadline) {
        payload.deadline = editDeadline;
      }
      if (editPriority && editPriority !== (selectedEvent.priority || 'MEDIUM')) {
        payload.priority = editPriority;
      }

      await fetchApi(
        `/calendar/${selectedEvent.id}/client-review`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        60000,
      );

      const updatedStatus =
        reviewModalAction === 'APPROVE'
          ? 'APPROVED'
          : reviewModalAction === 'REQUEST_CHANGES'
          ? 'CHANGES_REQUESTED'
          : 'REJECTED';

      setEvents((prev) =>
        prev.map((evt) =>
          evt.id === selectedEvent.id
            ? { ...evt, status: updatedStatus, approvalStatus: updatedStatus }
            : evt
        )
      );

      setReviewModalAction(null);
      setCommentText('');
      setSelectedEventId(null); // Close pop-up on successful decision
      await loadClientData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit client decision.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const pendingEventsCount = React.useMemo(() => {
    return events.filter(
      (e) =>
        (!activeBrandId || e.brandId === activeBrandId) &&
        (e.status === 'PENDING_CLIENT_APPROVAL' ||
          e.status === 'PENDING_CLIENT_REVIEW' ||
          e.status === 'PENDING_MARKETING_APPROVAL' ||
          e.status === 'WAITING_FOR_MEDIA_REVIEW'),
    ).length;
  }, [events, activeBrandId]);

  const scopedEditRequests = React.useMemo(() => {
    return editRequests.filter(
      (r) => !activeBrandId || r.brandId === activeBrandId || r.calendarEvent?.brandId === activeBrandId,
    );
  }, [editRequests, activeBrandId]);

  const scopedVideoTasks = React.useMemo(() => {
    return videoTasks.filter(
      (t) =>
        !activeBrandId ||
        t.brandId === activeBrandId ||
        t.project?.brandId === activeBrandId ||
        t.graphicRequirement?.brandId === activeBrandId,
    );
  }, [videoTasks, activeBrandId]);

  const pendingCount = pendingEventsCount + scopedEditRequests.length + scopedVideoTasks.length;

  const filteredVideoTasks = React.useMemo(() => {
    return scopedVideoTasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (t.name || t.title || '').toLowerCase().includes(q);
        const matchId = (t.taskId || t.id || '').toLowerCase().includes(q);
        const matchClient = (t.client?.name || '').toLowerCase().includes(q);
        const matchBrand = (t.brand?.name || '').toLowerCase().includes(q);
        const matchClip = (t.clipCode || t.projectScript?.clipCode || '').toLowerCase().includes(q);
        return matchTitle || matchId || matchClient || matchBrand || matchClip;
      }
      return true;
    });
  }, [scopedVideoTasks, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading Client Approval Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Active Brand Context Banner */}
      {activeBrand && (
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
              . Review approvals are filtered to this brand.
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

      {/* Clean Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Event Approval Session</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Pending Decisions:</span>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 font-extrabold text-xs border border-amber-200">
            {pendingCount} {pendingCount === 1 ? 'Item' : 'Items'}
          </span>
        </div>
      </div>

      {/* Filter & Search Toolbar across Full Width */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search title, ID, brand, clip code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {[
            { label: `Pending Calendar Review (${pendingEventsCount})`, value: 'PENDING_CLIENT_APPROVAL' },
            { label: `Video Editing Approvals (${scopedVideoTasks.length})`, value: 'VIDEO_EDITING' },
            { label: `Pending Edit Requests (${scopedEditRequests.length})`, value: 'EDIT_REQUESTS' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Changes Req.', value: 'CHANGES_REQUESTED' },
            { label: 'Rejected', value: 'REJECTED' },
            { label: 'All Items', value: 'ALL' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                statusFilter === tab.value
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.label}
              {tab.value === 'VIDEO_EDITING' && scopedVideoTasks.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${statusFilter === 'VIDEO_EDITING' ? 'bg-slate-950 text-white' : 'bg-purple-600 text-white'}`}>
                  {scopedVideoTasks.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grid View for Video Editing Approvals */}
      {statusFilter === 'VIDEO_EDITING' ? (
        filteredVideoTasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl space-y-2">
            <Video className="w-8 h-8 mx-auto text-purple-400" />
            <p className="font-bold text-slate-800 text-sm">No video editing deliverables awaiting Marketing Manager approval.</p>
            <p className="text-xs text-slate-400">When the Media Manager approves a video editing task, it will automatically route here for your sign-off.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVideoTasks.map((task: any) => {
              const videoUrl = task.activeDeliverableUrl || task.tasks?.[0]?.activeDeliverableUrl;
              const isVideo = videoUrl && (videoUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i) || videoUrl.includes('video'));
              const script = task.projectScript || task.tasks?.[0]?.projectScript;
              const clipCode = task.clipCode || task.tasks?.[0]?.clipCode || script?.clipCode;
              const editorName = task.assignedEmployees?.[0]?.user?.name || task.tasks?.[0]?.assignedEmployees?.[0]?.user?.name || 'Assigned Editor';

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedVideoTask(task)}
                  className="group p-5 rounded-2xl bg-white border border-purple-200 hover:border-purple-400 hover:shadow-xl transition-all cursor-pointer space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        {task.taskId || task.id}
                      </span>
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600" /> Awaiting Marketing Approval
                      </span>
                    </div>

                    {/* Task Title & Client Info */}
                    <div>
                      <h3 className="text-base font-black text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-2">
                        {task.name || task.title}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span>Client: <strong className="text-slate-800">{task.client?.name || 'Client'}</strong></span>
                        {task.brand?.name && (
                          <>
                            <span>•</span>
                            <span>Brand: <strong className="text-slate-800">{task.brand.name}</strong></span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Approval Pipeline Status Banner */}
                    <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 p-2.5 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Tech &amp; Media Approved
                        </span>
                        <span className="text-purple-700 font-mono text-[10px]">
                          Editor: {editorName}
                        </span>
                      </div>
                      <p className="text-[10px] text-purple-800 leading-tight">
                        Media Manager has approved this cut. Requires your final Marketing Quality Sign-off.
                      </p>
                    </div>

                    {/* Deliverable Preview */}
                    {videoUrl ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950/5">
                        {isVideo ? (
                          <video
                            src={videoUrl}
                            controls
                            className="w-full max-h-44 rounded-lg bg-black object-contain"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="p-3 bg-slate-50 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <Video className="w-4 h-4 text-purple-600 shrink-0" />
                              <span className="font-semibold text-slate-800 truncate">
                                {task.activeDeliverableFileName || 'Deliverable Asset'}
                              </span>
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                v{task.activeDeliverableVersion || 1}
                              </span>
                            </div>
                            <a
                              href={videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold shrink-0 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> View
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic text-center">
                        No deliverable file URL attached.
                      </div>
                    )}

                    {/* Script & Clip Code Section */}
                    {(clipCode || script) && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-900 text-[11px] flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-amber-600" /> Attached Script &amp; Code
                          </span>
                          {clipCode && (
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 border border-amber-300 rounded font-mono font-bold text-[10px]">
                              {clipCode}
                            </span>
                          )}
                        </div>
                        {script?.title && (
                          <p className="font-semibold text-slate-800 text-xs truncate">
                            {script.title}
                          </p>
                        )}
                        {(script?.body || script?.description) && (
                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                            {script.body || script.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Direct Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVideoTask(task);
                        setVideoReviewModalAction('REJECT');
                      }}
                      className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject / Revision
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarketingReviewTask(task.id, 'APPROVED');
                      }}
                      disabled={submittingVideoReview}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Quality
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : statusFilter === 'EDIT_REQUESTS' ? (
        scopedEditRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
            No pending edit requests awaiting Marketing Manager review.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scopedEditRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => setSelectedEditRequest(req)}
                className="group p-5 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 hover:shadow-xl transition-all cursor-pointer space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase font-bold">
                      {req.calendarEvent?.eventId || `EVT-${req.calendarEventId.substring(0, 6).toUpperCase()}`}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase font-mono">
                      EDIT REQUEST
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-amber-600 transition-colors">
                    {req.calendarEvent?.title || 'Calendar Event'}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <div>Brand: <strong className="text-slate-700">{req.calendarEvent?.brand?.name || 'N/A'}</strong></div>
                    <div>•</div>
                    <div>Requested By: <strong className="text-slate-800">{req.requestedBy?.name || 'Media Manager'}</strong> ({req.requestedBy?.role})</div>
                  </div>

                  {req.reason && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 italic">
                      "{req.reason}"
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEditRequest(req);
                  }}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Eye className="w-4 h-4" /> Review Edit Request &amp; Compare Diff
                </button>
              </div>
            ))}
          </div>
        )
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
          No calendar items match the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((item) => {
            const isOverdue = item.clientApprovalDeadline && new Date(item.clientApprovalDeadline) < new Date();
            const isPending = item.status === 'PENDING_CLIENT_APPROVAL' || item.status === 'PENDING_CLIENT_REVIEW';

            return (
              <div
                key={item.id}
                onClick={() => setSelectedEventId(item.id)}
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-200 hover:shadow-xl transition-all cursor-pointer space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-50 text-amber-600 border border-slate-200">
                      {item.eventId || 'CAL-EVENT'}
                    </span>

                    {item.editRequests && item.editRequests.some((r: any) => r.status === 'PENDING_MARKETING_APPROVAL') ? (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> WAITING FOR EDITING APPROVAL
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                          isPending
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : item.status === 'APPROVED' || item.status === 'CLIENT_APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'CHANGES_REQUESTED'
                            ? 'bg-orange-50 text-orange-800 border border-orange-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isPending ? 'Pending Review' : item.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span>{item.brand?.name || 'Brand'}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-700">v{item.version}</span>
                      <span>•</span>
                      <span className="text-slate-700 font-medium truncate flex items-center gap-1">
                        <User className="w-3 h-3 text-amber-600 shrink-0" />
                        {item.createdBy?.name || (item.createdByRole ? item.createdByRole.replace(/_/g, ' ') : 'Creator')}
                      </span>
                    </p>
                  </div>

                  {/* Waiting for Edit Approval Alert Banner Strip */}
                  {item.editRequests && item.editRequests.some((r: any) => r.status === 'PENDING_MARKETING_APPROVAL') && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-amber-900 text-xs font-bold shadow-xs animate-pulse">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Waiting for Edit Approval</span>
                      </span>
                      <span className="text-[9px] font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 border border-amber-200">
                        Pending MM Review
                      </span>
                    </div>
                  )}


                </div>

                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Platform</span>
                      <span className="text-slate-800 font-semibold">{item.platform || 'Instagram'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Shoot Date</span>
                      <span className="text-slate-800 font-semibold">
                        {item.shootDate ? new Date(item.shootDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {isOverdue && isPending ? (
                      <span className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Overdue
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        Deadline: {item.clientApprovalDeadline ? new Date(item.clientApprovalDeadline).toLocaleDateString() : 'Set on review'}
                      </span>
                    )}

                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <Eye className="w-3.5 h-3.5" /> Review Event <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pop-Up Modal Dialog when Event Card is Clicked */}
      {selectedEvent && !reviewModalAction && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedEventId(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="space-y-3 pb-4 border-b border-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-600 border border-amber-200">
                    {selectedEvent.eventId || 'CAL-EVENT'}
                  </span>
                  <span className="text-xs font-bold text-slate-700 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                    Version {selectedEvent.version}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase ${
                      selectedEvent.status === 'PENDING_CLIENT_APPROVAL' || selectedEvent.status === 'PENDING_CLIENT_REVIEW'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : selectedEvent.status === 'APPROVED' || selectedEvent.status === 'CLIENT_APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedEvent.status === 'CHANGES_REQUESTED'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {selectedEvent.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedEventId(null)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedEvent.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Created by <strong className="text-slate-800">{selectedEvent.createdBy?.name || (selectedEvent.createdByRole ? selectedEvent.createdByRole.replace(/_/g, ' ') : 'Creator')}</strong> (
                    {selectedEvent.createdBy?.role ? selectedEvent.createdBy.role.replace(/_/g, ' ') : selectedEvent.createdByRole ? selectedEvent.createdByRole.replace(/_/g, ' ') : 'Creator'})
                  </p>
                </div>

                {/* Top Action Row - Strictly for Marketing Manager (Client Representative) */}
                {user?.role === 'MARKETING_MANAGER' ? (
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 border ${
                        showSettingsDrawer
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:text-slate-900'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Settings
                    </button>

                    <button
                      onClick={() => {
                        setReviewModalAction('REJECT');
                        setCommentText('');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-red-600/30 font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>

                    <button
                      onClick={() => {
                        setReviewModalAction('APPROVE');
                        setCommentText('');
                      }}
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve Content
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 px-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center gap-2 text-amber-800 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Waiting for client approval from <strong>Marketing Manager</strong>.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* On-Demand Collapsible Settings Drawer */}
            {showSettingsDrawer && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Client Approval Deadline &amp; Priority Controls
                  </span>
                  <button onClick={() => setShowSettingsDrawer(false)} className="text-slate-500 hover:text-slate-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-600" /> Client Approval Deadline
                    </label>
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-600" /> Client Event Priority
                    </label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                    >
                      <option value="LOW">LOW Priority</option>
                      <option value="MEDIUM">MEDIUM Priority</option>
                      <option value="HIGH">HIGH Priority</option>
                      <option value="CRITICAL">CRITICAL Priority</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Event Source & Type Header Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-slate-50 border border-amber-200 text-xs flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider block">
                  Event Source &amp; Type:
                </span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  {selectedEvent.eventSource === 'GRAPHIC_REQUIREMENT' || selectedEvent.graphicRequirementId ? (
                    <>
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>Graphic Requirement</span>
                      {(selectedEvent.graphicRequirement?.requirementId || selectedEvent.eventId) && (
                        <span className="font-mono text-amber-800 font-bold bg-amber-100/60 px-1.5 py-0.5 rounded border border-amber-200">
                          {selectedEvent.graphicRequirement?.requirementId || selectedEvent.eventId}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 text-blue-600" />
                      <span>Shoot Project ({selectedEvent.shootType || 'INDOOR'})</span>
                      {(selectedEvent.shoot?.projectId || selectedEvent.shootProjects?.[0]?.projectId || selectedEvent.eventId) && (
                        <span className="font-mono text-blue-700 font-bold bg-blue-100/60 px-1.5 py-0.5 rounded border border-blue-200">
                          {selectedEvent.shoot?.projectId || selectedEvent.shootProjects?.[0]?.projectId || selectedEvent.eventId}
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {selectedEvent.shootProjects?.[0]?.id && (
                  <a
                    href={`/projects/${selectedEvent.shootProjects[0].id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] border border-blue-200 flex items-center gap-1"
                  >
                    <span>View Shoot Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* SECTION 1: CLIENT, BRAND & CONTENT SPECIFICATIONS */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" /> Section 1: Client, Brand &amp; Content Specifications
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Client Name</span>
                  <p className="font-bold text-slate-800 truncate">{selectedEvent.client?.name || 'N/A'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{selectedEvent.client?.clientCode || ''}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Brand</span>
                  <p className="font-bold text-slate-800 truncate">{selectedEvent.brand?.name || 'N/A'}</p>
                  {selectedEvent.brand?.shortCode && (
                    <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                      [{selectedEvent.brand.shortCode}]
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Product</span>
                  <p className="font-bold text-slate-800 truncate">{selectedEvent.product?.name || 'General Product / Brand Post'}</p>
                  {selectedEvent.product?.sku && (
                    <p className="text-[10px] text-slate-500 font-mono">SKU: {selectedEvent.product.sku}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Campaign</span>
                  <p className="font-bold text-slate-800 truncate">{selectedEvent.campaign || 'N/A'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Format / Type</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-bold text-amber-700 bg-amber-50 border border-amber-200 text-[11px]">
                    {selectedEvent.contentType || 'Post'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Platform</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 text-[11px]">
                    {selectedEvent.platform || 'Instagram'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Talent / Model</span>
                  <p className="font-bold text-slate-800 truncate">
                    {selectedEvent.influencerTalent || selectedEvent.shootProjects?.[0]?.influencerTalent || 'Not Specified'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Priority Level</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded font-extrabold uppercase text-[10px] ${
                    selectedEvent.priority === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : selectedEvent.priority === 'HIGH'
                      ? 'bg-orange-50 text-orange-800 border border-orange-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {selectedEvent.priority || 'MEDIUM'} Priority
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: SCRIPT DOCUMENTS & ATTACHMENTS (REVIEW, DELETE & UPLOAD NEW) */}
            {selectedEvent.eventSource !== 'GRAPHIC_REQUIREMENT' &&
             !selectedEvent.graphicRequirementId &&
             !selectedEvent.graphicRequirement &&
             !selectedEvent.graphicReqs?.length && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-700" /> Section 2: Script Documents &amp; Materials
                  </span>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="clientReviewScriptFileInput"
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingScriptDoc ? 'Uploading...' : '+ Upload Script Document(s)'}</span>
                    </label>
                    <input
                      id="clientReviewScriptFileInput"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      className="hidden"
                      disabled={uploadingScriptDoc}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleUploadScriptFiles(e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                {scriptSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{scriptSuccessMsg}</span>
                  </div>
                )}

                {/* Script Documents List */}
                {(() => {
                  const scriptDocFiles = (eventFiles || []).filter(
                    (f: any) =>
                      f.attachmentCategory === 'SCRIPT_DOCUMENT' ||
                      f.folderCategory === 'Script Documents'
                  );

                  if (loadingFiles) {
                    return (
                      <div className="p-6 bg-slate-50/80 border border-slate-200 rounded-2xl text-center">
                        <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-medium">Loading attached script documents...</p>
                      </div>
                    );
                  }

                  if (scriptDocFiles.length === 0) {
                    return (
                      <div className="p-6 bg-purple-50/40 border-2 border-dashed border-purple-200 rounded-2xl text-center space-y-2">
                        <FileText className="w-8 h-8 text-purple-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-800">No Script Documents Attached Yet</p>
                        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                          Click <strong>"+ Upload Script Document(s)"</strong> above or drag script files (PDF, Word Doc, TXT) here to attach scripts for this event.
                        </p>
                        <label
                          htmlFor="clientReviewScriptFileInput"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-purple-300 hover:bg-purple-50 text-purple-700 font-bold text-xs rounded-xl cursor-pointer shadow-xs transition-colors mt-2"
                        >
                          <Plus className="w-3.5 h-3.5" /> Select Script Files
                        </label>
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 bg-gradient-to-br from-purple-50/50 to-slate-50 border border-purple-200/90 rounded-2xl space-y-3 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
                        <span className="text-xs font-bold text-slate-800">
                          Attached Scripts ({scriptDocFiles.length} file{scriptDocFiles.length > 1 ? 's' : ''})
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Review, open, or replace documents
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {scriptDocFiles.map((sf: any) => {
                          const ext = sf.fileName?.split('.').pop()?.toUpperCase() || 'FILE';
                          const isDeleting = deletingFileId === sf.id;

                          return (
                            <div
                              key={sf.id}
                              className="flex items-center justify-between p-3 bg-white border border-purple-200/80 rounded-xl hover:border-purple-300 shadow-xs hover:shadow-sm transition-all gap-2"
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                                <span className="px-2 py-1 bg-purple-100 text-purple-900 font-mono text-[10px] font-extrabold rounded-md shrink-0">
                                  {ext}
                                </span>
                                <div className="overflow-hidden min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate" title={sf.fileName}>
                                    {sf.fileName}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono flex-wrap mt-0.5">
                                    {sf.fileSize ? <span>{(sf.fileSize / 1024).toFixed(1)} KB</span> : null}
                                    {sf.uploadedBy && (
                                      <span className="font-semibold text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded border border-purple-200">
                                        Uploaded by {sf.uploadedBy.name || 'User'} ({sf.uploadedBy.role?.replace(/_/g, ' ') || 'Staff'})
                                      </span>
                                    )}
                                    {sf.createdAt && (
                                      <span className="text-slate-400">
                                        • {new Date(sf.createdAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={sf.storagePath?.startsWith('http') ? sf.storagePath : `/api/files/download/${sf.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                                  title="Open / Preview script file"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteScriptFile(sf.id, sf.fileName)}
                                  disabled={isDeleting}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs transition-colors disabled:opacity-50"
                                  title="Delete this script document"
                                >
                                  {isDeleting ? (
                                    <RotateCcw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SECTION 2: SCHEDULE, TIMING & MILESTONES */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Section 2: Schedule, Timing &amp; Milestones
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Shoot / Event Date</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {selectedEvent.shootDate ? new Date(selectedEvent.shootDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Call / Reporting Time</span>
                  <p className="font-bold text-blue-700 font-mono">
                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.callTime ||
                      selectedEvent.shootProjects?.[0]?.indoorDetails?.reportingTime ||
                      selectedEvent.startTime ||
                      '09:00 AM'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Wrap / Completion Time</span>
                  <p className="font-bold text-blue-700 font-mono">
                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.expectedWrapTime ||
                      selectedEvent.shootProjects?.[0]?.indoorDetails?.wrapUpTime ||
                      selectedEvent.endTime ||
                      '05:00 PM'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Client Approval Deadline</span>
                  <p className="font-bold text-amber-700">
                    {selectedEvent.clientApprovalDeadline
                      ? new Date(selectedEvent.clientApprovalDeadline).toLocaleDateString()
                      : 'Set on Review'}
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 3: LOCATION & LOGISTICS (INDOOR & OUTDOOR) */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-600" /> Section 3: Location &amp; Operational Logistics
              </span>

              {selectedEvent.shootType === 'OUTDOOR' || selectedEvent.shootProjects?.[0]?.outdoorDetails ? (
                /* OUTDOOR LOGISTICS CARD */
                <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <span className="font-bold text-purple-900 flex items-center gap-1.5 uppercase text-[11px]">
                      <Compass className="w-4 h-4 text-purple-600" /> Outdoor On-Location Logistics
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                      ON-LOCATION
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-purple-800 uppercase block">Exact Location Address</span>
                      <p className="font-semibold text-slate-900">
                        {selectedEvent.shootProjects?.[0]?.outdoorDetails?.exactLocationAddress ||
                          selectedEvent.shootProjects?.[0]?.outdoorDetails?.locationAddress ||
                          selectedEvent.location ||
                          'Location address specified in brief'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-purple-800 uppercase block">Location Access &amp; Parking</span>
                      <p className="text-slate-800">
                        {selectedEvent.shootProjects?.[0]?.outdoorDetails?.locationAccessDetails || 'Standard Access'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-purple-800 uppercase block">Location Contact Person</span>
                      <p className="text-slate-800">
                        {selectedEvent.shootProjects?.[0]?.outdoorDetails?.locationContact ||
                          selectedEvent.shootProjects?.[0]?.outdoorDetails?.locationContactPerson ||
                          'Contact not provided'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-purple-800 uppercase block">Expected Weather Conditions</span>
                      <p className="font-semibold text-slate-900 flex items-center gap-1">
                        <CloudSun className="w-3.5 h-3.5 text-amber-600" />
                        {selectedEvent.shootProjects?.[0]?.outdoorDetails?.expectedWeatherConditions ||
                          selectedEvent.shootProjects?.[0]?.outdoorDetails?.weatherStatus ||
                          'Sunny / Clear'}
                      </p>
                    </div>

                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.backupLocation && (
                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-[10px] font-bold text-purple-800 uppercase block">Backup Weather Location</span>
                        <p className="text-slate-800">
                          {selectedEvent.shootProjects[0].outdoorDetails.backupLocation}
                        </p>
                      </div>
                    )}

                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.specialOutdoorRequirements && (
                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-[10px] font-bold text-purple-800 uppercase block">Special Outdoor Notes &amp; Safety</span>
                        <p className="text-slate-800 italic bg-white/70 p-2.5 rounded-lg border border-purple-200">
                          "{selectedEvent.shootProjects[0].outdoorDetails.specialOutdoorRequirements}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* INDOOR LOGISTICS CARD */
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px]">
                      <Building2 className="w-4 h-4 text-blue-600" /> Indoor Studio Details
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      STUDIO FLOOR
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Studio / Stage Location</span>
                      <p className="font-semibold text-slate-900">
                        {selectedEvent.shootProjects?.[0]?.indoorDetails?.studioName ||
                          selectedEvent.location ||
                          'Main Studio Floor'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Studio Address</span>
                      <p className="text-slate-700">
                        {selectedEvent.shootProjects?.[0]?.indoorDetails?.studioAddress ||
                          selectedEvent.location ||
                          'HQ Studio Facility'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: ASSIGNED CREW & RESERVED EQUIPMENT */}
            {(selectedEvent.assignedStaff ||
              selectedEvent.shootProjects?.[0]?.assignedTeam?.length > 0 ||
              selectedEvent.shootProjects?.[0]?.equipmentReservations?.length > 0) && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" /> Section 4: Assigned Crew &amp; Reserved Equipment
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Crew Members */}
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-2">
                    <span className="font-bold text-indigo-900 uppercase text-[10px] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-600" /> Production Team &amp; Assigned Crew
                    </span>
                    <div className="space-y-1.5">
                      {selectedEvent.assignedStaff && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-indigo-200">
                          <span className="font-semibold text-slate-900">{selectedEvent.assignedStaff.name}</span>
                          <span className="text-[10px] font-mono text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                            {selectedEvent.assignedStaff.role?.replace(/_/g, ' ') || 'Lead Staff'}
                          </span>
                        </div>
                      )}
                      {selectedEvent.shootProjects?.[0]?.assignedTeam?.map((tm: any) => (
                        <div key={tm.id} className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-indigo-200">
                          <span className="font-semibold text-slate-900">{tm.user?.name || 'Crew Member'}</span>
                          <span className="text-[10px] font-mono text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                            {tm.roleInProject || tm.user?.role?.replace(/_/g, ' ') || 'Crew'}
                          </span>
                        </div>
                      ))}
                      {!selectedEvent.assignedStaff && (!selectedEvent.shootProjects?.[0]?.assignedTeam || selectedEvent.shootProjects[0].assignedTeam.length === 0) && (
                        <p className="text-slate-400 italic text-[11px]">No crew members explicitly assigned.</p>
                      )}
                    </div>
                  </div>

                  {/* Reserved Equipment */}
                  <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                    <span className="font-bold text-purple-900 uppercase text-[10px] flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-purple-600" /> Reserved Production Equipment
                    </span>
                    <div className="space-y-1.5">
                      {selectedEvent.shootProjects?.[0]?.equipmentReservations?.map((res: any) => (
                        <div key={res.id} className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-purple-200">
                          <span className="font-semibold text-slate-900">{res.equipment?.name || 'Equipment'}</span>
                          <span className="text-[10px] font-mono text-purple-700 uppercase bg-purple-50 px-2 py-0.5 rounded">
                            {res.equipment?.category || res.status}
                          </span>
                        </div>
                      ))}
                      {(!selectedEvent.shootProjects?.[0]?.equipmentReservations || selectedEvent.shootProjects[0].equipmentReservations.length === 0) && (
                        <p className="text-slate-400 italic text-[11px]">No equipment reserved for this event.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: ATTACHED REFERENCE DOCUMENTS & CREATIVE ASSETS */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Section 5: Attached Reference Documents &amp; Creative Assets
              </span>

              {(() => {
                const currentGrId = selectedEvent.graphicRequirementId || selectedEvent.graphicRequirement?.id || selectedEvent.graphicReqs?.[0]?.id;
                const isGraphicSource = selectedEvent.eventSource === 'GRAPHIC_REQUIREMENT' || Boolean(currentGrId);

                const referenceFiles = (eventFiles || []).filter(
                  (f: any) => {
                    if (isGraphicSource) {
                      return f.graphicRequirementId && f.graphicRequirementId === currentGrId;
                    }
                    return (
                      !f.graphicRequirementId &&
                      (f.attachmentCategory === 'REFERENCE_FILE' ||
                       f.folderCategory === 'Reference Documents' ||
                       f.folderCategory === 'Creative Assets' ||
                       f.folderCategory === 'Attachments' ||
                       (f.attachmentCategory !== 'SCRIPT_DOCUMENT' && f.folderCategory !== 'Script Documents' && !f.storagePath?.includes('Script Documents')))
                    );
                  }
                );
                const hasLegacyUrl = !!selectedEvent.creativePreviewUrl;

                if (loadingFiles) {
                  return (
                    <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-center">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-1.5" />
                      <p className="text-xs text-slate-500 font-medium">Loading attached reference documents...</p>
                    </div>
                  );
                }

                if (referenceFiles.length === 0 && !hasLegacyUrl) {
                  return (
                    <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200 text-center text-slate-400 text-xs">
                      No attached reference documents or creative assets for this event.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {referenceFiles.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {referenceFiles.map((rf: any) => {
                          const ext = rf.fileName?.split('.').pop()?.toUpperCase() || 'FILE';
                          const isDeleting = deletingFileId === rf.id;
                          const fileUrl = rf.storagePath?.startsWith('http')
                            ? rf.storagePath
                            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/${rf.storagePath?.replace(/^\/?/, '')}`;

                          return (
                            <div
                              key={rf.id || rf.fileName}
                              className="flex items-center justify-between p-3 bg-white border border-indigo-200/80 rounded-xl hover:border-indigo-300 shadow-xs hover:shadow-sm transition-all gap-2"
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-900 font-mono text-[10px] font-extrabold rounded-md shrink-0">
                                  {ext}
                                </span>
                                <div className="overflow-hidden min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate" title={rf.fileName}>
                                    {rf.fileName}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono flex-wrap mt-0.5">
                                    {rf.fileSize ? <span>{(rf.fileSize / 1024).toFixed(1)} KB</span> : null}
                                    {rf.uploadedBy && (
                                      <span className="font-semibold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded border border-indigo-200">
                                        Uploaded by {rf.uploadedBy.name || 'User'}
                                      </span>
                                    )}
                                    {rf.createdAt && (
                                      <span className="text-slate-400">
                                        • {new Date(rf.createdAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                                  title="Open / Preview reference document"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteScriptFile(rf.id, rf.fileName)}
                                  disabled={isDeleting}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs transition-colors disabled:opacity-50"
                                  title="Delete this reference document"
                                >
                                  {isDeleting ? (
                                    <RotateCcw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {hasLegacyUrl && (
                      <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5 overflow-hidden">
                            <strong className="text-slate-900 text-sm block truncate">
                              {selectedEvent.creativeAssetName || 'Primary Creative Visual Asset'}
                            </strong>
                            <span className="text-xs font-mono text-indigo-700 truncate block">
                              {selectedEvent.creativePreviewUrl}
                            </span>
                          </div>
                          <a
                            href={selectedEvent.creativePreviewUrl.startsWith('http') ? selectedEvent.creativePreviewUrl : `https://${selectedEvent.creativePreviewUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open Asset Link
                          </a>
                        </div>

                        {selectedEvent.creativePreviewUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) && (
                          <img
                            src={selectedEvent.creativePreviewUrl}
                            alt="Creative Preview"
                            className="max-h-80 rounded-lg object-contain mx-auto border border-indigo-200 bg-white"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* SECTION 6: PRODUCTION NOTES & INSTRUCTIONS */}
            {selectedEvent.productionNotes && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-600" /> Section 6: Production Notes &amp; Special Instructions
                </span>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.productionNotes}
                </div>
              </div>
            )}

            {/* Revision History & Client Feedback Log */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-600" />
                Approval &amp; Revision Log History
              </h3>

              {!selectedEvent.approvalHistory || selectedEvent.approvalHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No previous revision log for this event.</p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedEvent.approvalHistory.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{log.user?.name || log.role}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                            v{log.version}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            log.action?.includes('APPROVE')
                              ? 'bg-emerald-50 text-emerald-600'
                              : log.action?.includes('REQUEST')
                              ? 'bg-amber-50 text-amber-600'
                              : log.action?.includes('SUBMIT')
                              ? 'bg-blue-50 text-blue-600'
                              : log.action?.includes('DEADLINE') || log.action?.includes('PRIORITY')
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {log.action?.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {log.comment && (
                        <p className="text-xs text-slate-700 italic p-2 rounded bg-slate-50/60 border border-slate-200">
                          "{log.comment}"
                        </p>
                      )}

                      <div className="text-[10px] text-slate-400 text-right">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decision Confirmation Modal Dialog */}
      {reviewModalAction && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                {reviewModalAction === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {reviewModalAction === 'REQUEST_CHANGES' && <RotateCcw className="w-5 h-5 text-amber-600" />}
                {reviewModalAction === 'REJECT' && <XCircle className="w-5 h-5 text-rose-600" />}
                {reviewModalAction === 'APPROVE'
                  ? 'Approve & Accept Calendar Event'
                  : reviewModalAction === 'REQUEST_CHANGES'
                  ? 'Request Content Changes'
                  : 'Reject Calendar Event'}
              </h3>

              <button onClick={() => setReviewModalAction(null)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Complete Event Details Summary Card (Before Accepting) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                    {selectedEvent.eventId || `EVT-${selectedEvent.id.substring(0, 6).toUpperCase()}`}
                  </span>
                  <span className="font-bold text-slate-900 text-sm ml-2">{selectedEvent.title}</span>
                  <span className="text-slate-500 font-mono text-[10px] ml-1.5">(v{selectedEvent.version})</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px] uppercase font-mono">
                  {selectedEvent.eventSource || 'SHOOT'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Client &amp; Brand</span>
                  <strong className="text-slate-900">{selectedEvent.client?.name}</strong>
                  <span className="text-slate-500 block text-[11px]">{selectedEvent.brand?.name}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Product &amp; Campaign</span>
                  <strong className="text-slate-900">{selectedEvent.product?.name || 'General Product'}</strong>
                  <span className="text-slate-500 block text-[11px]">{selectedEvent.campaign || 'Standard'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Format &amp; Platform</span>
                  <span className="text-amber-700 font-bold">{selectedEvent.contentType || 'Post'}</span>
                  <span className="text-slate-500 block text-[11px]">{selectedEvent.platform || 'Instagram'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Shoot / Event Date</span>
                  <strong className="text-slate-900">{selectedEvent.shootDate ? new Date(selectedEvent.shootDate).toLocaleDateString() : 'N/A'}</strong>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Call &amp; Wrap Times</span>
                  <span className="font-mono text-blue-700 font-bold">
                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.callTime || selectedEvent.shootProjects?.[0]?.indoorDetails?.reportingTime || selectedEvent.startTime || '09:00 AM'} - {selectedEvent.shootProjects?.[0]?.outdoorDetails?.expectedWrapTime || selectedEvent.shootProjects?.[0]?.indoorDetails?.wrapUpTime || selectedEvent.endTime || '05:00 PM'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Shoot Location</span>
                  <span className="text-slate-900 font-medium truncate block">
                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.exactLocationAddress || selectedEvent.shootProjects?.[0]?.indoorDetails?.studioName || selectedEvent.location || 'Studio HQ'}
                  </span>
                </div>
              </div>



              {/* Outdoor Logistics Summary (if outdoor shoot) */}
              {selectedEvent.shootProjects?.[0]?.outdoorDetails && (
                <div className="p-2.5 rounded-lg bg-purple-50/80 border border-purple-200 text-[11px] space-y-1 text-purple-950">
                  <div className="font-bold text-purple-900 uppercase text-[10px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-purple-600" /> Outdoor Logistics Summary
                  </div>
                  <div><strong>Address:</strong> {selectedEvent.shootProjects[0].outdoorDetails.exactLocationAddress || selectedEvent.shootProjects[0].outdoorDetails.locationAddress}</div>
                  <div><strong>Access &amp; Contact:</strong> {selectedEvent.shootProjects[0].outdoorDetails.locationAccessDetails || 'Standard'} • {selectedEvent.shootProjects[0].outdoorDetails.locationContact || 'No contact specified'}</div>
                  <div><strong>Weather:</strong> {selectedEvent.shootProjects[0].outdoorDetails.expectedWeatherConditions || 'Sunny / Clear'}</div>
                </div>
              )}

              {/* Reserved Equipment & Assigned Staff Summary */}
              {(selectedEvent.assignedStaff || selectedEvent.shootProjects?.[0]?.equipmentReservations?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[11px]">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Lead Assigned Staff:</span>
                    <strong className="text-slate-800">{selectedEvent.assignedStaff?.name || selectedEvent.createdBy?.name || 'Assigned Crew'}</strong>
                  </div>
                  {selectedEvent.shootProjects?.[0]?.equipmentReservations?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Reserved Equipment:</span>
                      <span className="text-purple-700 font-bold">{selectedEvent.shootProjects[0].equipmentReservations.map((r: any) => r.equipment?.name || 'Item').join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Creative Asset Link */}
              {selectedEvent.creativePreviewUrl && (
                <div className="flex items-center justify-between p-2 bg-indigo-50/80 rounded-lg border border-indigo-200">
                  <span className="text-[11px] font-mono text-indigo-900 truncate max-w-sm">
                    {selectedEvent.creativeAssetName || selectedEvent.creativePreviewUrl}
                  </span>
                  <a
                    href={selectedEvent.creativePreviewUrl.startsWith('http') ? selectedEvent.creativePreviewUrl : `https://${selectedEvent.creativePreviewUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold text-[10px] flex items-center gap-1 shrink-0"
                  >
                    Open Asset <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Editable Review Settings inside Decision Modal */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Final Approval Deadline &amp; Priority Overrides
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Approval Deadline
                  </label>
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Event Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {reviewModalAction === 'APPROVE'
                  ? 'Sign-Off Approval Note (Optional):'
                  : 'Mandatory Client Feedback / Change Instructions:'}
              </label>
              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  reviewModalAction === 'REQUEST_CHANGES'
                    ? 'e.g. Please update caption to include new offer details and replace the hero image.'
                    : reviewModalAction === 'REJECT'
                    ? 'e.g. This campaign angle is no longer aligned with brand positioning.'
                    : 'Optional sign-off approval comment...'
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setReviewModalAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                disabled={submittingReview}
                onClick={handleConfirmReviewAction}
                className={`px-5 py-2 rounded-xl font-black text-xs text-slate-950 transition-all ${
                  reviewModalAction === 'APPROVE'
                    ? 'bg-emerald-500 hover:bg-emerald-400'
                    : reviewModalAction === 'REQUEST_CHANGES'
                    ? 'bg-amber-500 hover:bg-amber-400'
                    : 'bg-red-500 hover:bg-red-400 text-white'
                }`}
              >
                {submittingReview ? 'Submitting...' : `Confirm ${reviewModalAction.replace('_', ' ')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Edit Request Review Modal (Separate Edited Changes & Full Event Details) */}
      {selectedEditRequest && (() => {
        const fullEvent =
          events.find((e) => e.id === selectedEditRequest.calendarEventId) ||
          selectedEditRequest.calendarEvent ||
          {};

        const originalObj =
          typeof selectedEditRequest.originalValues === 'string'
            ? JSON.parse(selectedEditRequest.originalValues || '{}')
            : (selectedEditRequest.originalValues || {});
        const requestedObj =
          typeof selectedEditRequest.requestedValues === 'string'
            ? JSON.parse(selectedEditRequest.requestedValues || '{}')
            : (selectedEditRequest.requestedValues || {});

        const allKeys = Array.from(new Set([...Object.keys(originalObj), ...Object.keys(requestedObj)]));
        const changedKeys = allKeys.filter(
          (k) => JSON.stringify(originalObj[k]) !== JSON.stringify(requestedObj[k])
        );

        const getFriendlyLabel = (key: string): string => {
          const map: Record<string, string> = {
            title: 'Event / Shoot Title',
            caption: 'Objective / Caption Brief',
            description: 'Description',
            productionNotes: 'Production Notes',
            shootDate: 'Shoot / Event Date',
            clientApprovalDeadline: 'Client Approval Deadline',
            deadline: 'Target Completion Deadline',
            startTime: 'Call / Start Time',
            endTime: 'Wrap / End Time',
            location: 'Studio / Location Name',
            locationCategory: 'Location Category',
            exactLocationAddress: 'Location Address',
            shootType: 'Shoot Type (Indoor / Outdoor)',
            priority: 'Priority Level',
            platform: 'Target Platform',
            contentType: 'Content / Requirement Type',
            assignedStaffId: 'Assigned Lead Staff',
            teamUserIds: 'Assigned Production Crew',
            equipmentIds: 'Reserved Production Equipment',
            influencerTalent: 'Influencer / Talent',
            selectedDeliverables: 'Selected Deliverables',
            creativePreviewUrl: 'Creative Asset URL / Link',
            creativeAssetName: 'Creative Asset Name',
          };
          return map[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
        };

        const formatVal = (key: string, val: any) => {
          if (val === null || val === undefined || val === '') {
            return <span className="text-slate-400 italic font-sans text-xs">None / Not Set</span>;
          }
          if (typeof val === 'boolean') {
            return val ? 'Yes' : 'No';
          }
          if (Array.isArray(val)) {
            return val.length > 0 ? val.join(', ') : <span className="text-slate-400 italic">None</span>;
          }
          if (typeof val === 'object') {
            return JSON.stringify(val);
          }
          if (
            typeof val === 'string' &&
            (key.toLowerCase().includes('date') || key.toLowerCase().includes('deadline')) &&
            /^\d{4}-\d{2}-\d{2}/.test(val)
          ) {
            return new Date(val).toLocaleDateString();
          }
          return String(val);
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase font-bold">
                      EDIT REQUEST • {fullEvent.eventId || `EVT-${selectedEditRequest.calendarEventId.substring(0, 6).toUpperCase()}`}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                      {selectedEditRequest.status}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {changedKeys.length} {changedKeys.length === 1 ? 'Field Modified' : 'Fields Modified'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {fullEvent.title || selectedEditRequest.calendarEvent?.title || 'Calendar Event'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Requested By: <strong className="text-slate-800">{selectedEditRequest.requestedBy?.name || 'Media Manager'}</strong> ({selectedEditRequest.requestedBy?.role || 'Media Manager'}) • Date: <span className="text-amber-800 font-semibold">{new Date(selectedEditRequest.createdAt).toLocaleString()}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEditRequest(null)}
                  className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Close edit request review"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Justification Reason Card */}
              {selectedEditRequest.reason && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Request Reason &amp; Operational Justification:
                  </span>
                  <p className="text-amber-950 font-medium italic">"{selectedEditRequest.reason}"</p>
                </div>
              )}

              {/* View Switcher Tabs (Edited Details vs Full Event Details vs Side-by-Side Diff) */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setEditRequestModalTab('CHANGES_ONLY')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    editRequestModalTab === 'CHANGES_ONLY'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Edited Details Only</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white text-slate-900 font-extrabold ml-0.5">
                    {changedKeys.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditRequestModalTab('FULL_DETAILS')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    editRequestModalTab === 'FULL_DETAILS'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Full Event Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditRequestModalTab('DIFF_TABLE')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    editRequestModalTab === 'DIFF_TABLE'
                      ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Side-by-Side Diff Table</span>
                </button>
              </div>

              {/* ── TAB 1: EDITED CHANGES ONLY ── */}
              {editRequestModalTab === 'CHANGES_ONLY' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" /> Modified Attributes ({changedKeys.length})
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Showing only the specific fields requested for modification
                    </span>
                  </div>

                  {changedKeys.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="font-bold text-slate-800 text-sm">No Specific Field Modifications Detected</p>
                      <p className="text-slate-500 text-xs">
                        This request is submitted with justification notes for review without altering raw schema attributes.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {changedKeys.map((key) => {
                        const origVal = originalObj[key];
                        const reqVal = requestedObj[key];
                        const fieldLabel = getFriendlyLabel(key);

                        return (
                          <div
                            key={key}
                            className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 transition-all space-y-2.5 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                {fieldLabel}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold uppercase">
                                Modified Field
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {/* Before / Live Value */}
                              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Current Live Value (Before)
                                </span>
                                <div className="text-xs text-slate-700 font-semibold break-words">
                                  {formatVal(key, origVal)}
                                </div>
                              </div>

                              {/* After / Requested Value */}
                              <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-lg space-y-1">
                                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-700" /> Requested New Value (Proposed)
                                </span>
                                <div className="text-xs text-emerald-950 font-bold break-words">
                                  {formatVal(key, reqVal)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: FULL EVENT DETAILS (COMPLETE BREAKDOWN) ── */}
              {editRequestModalTab === 'FULL_DETAILS' && (
                <div className="space-y-4 text-xs">
                  {/* General Specifications */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" /> 1. General Event &amp; Client Overview
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-bold">
                        {fullEvent.eventSource || 'SHOOT'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Client Name</span>
                        <p className="font-bold text-slate-900">{fullEvent.client?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Brand</span>
                        <p className="font-bold text-slate-900">{fullEvent.brand?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Product</span>
                        <p className="font-bold text-slate-900">{fullEvent.product?.name || 'General Product'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Requirement / Content Type</span>
                        <p className="font-bold text-slate-900">{fullEvent.contentType || 'Post'}</p>
                        {changedKeys.includes('contentType') && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-300">
                            → {requestedObj.contentType}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Platform</span>
                        <p className="font-bold text-slate-900">{fullEvent.platform || 'Instagram'}</p>
                        {changedKeys.includes('platform') && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-300">
                            → {requestedObj.platform}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Priority Level</span>
                        <span className="font-bold font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                          {fullEvent.priority || 'MEDIUM'}
                        </span>
                        {changedKeys.includes('priority') && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-300 ml-1">
                            → {requestedObj.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Schedule & Operational Timing */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" /> 2. Schedule, Timing &amp; Deadlines
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Shoot / Event Date</span>
                        <p className="font-bold text-slate-900">
                          {fullEvent.shootDate ? new Date(fullEvent.shootDate).toLocaleDateString() : 'N/A'}
                        </p>
                        {changedKeys.includes('shootDate') && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-300">
                            → {new Date(requestedObj.shootDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Call Time</span>
                        <p className="font-bold text-blue-700 font-mono">{fullEvent.startTime || '09:00 AM'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Wrap Time</span>
                        <p className="font-bold text-blue-700 font-mono">{fullEvent.endTime || '05:00 PM'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Client Approval Deadline</span>
                        <p className="font-bold text-amber-700">
                          {fullEvent.clientApprovalDeadline ? new Date(fullEvent.clientApprovalDeadline).toLocaleDateString() : 'N/A'}
                        </p>
                        {changedKeys.includes('clientApprovalDeadline') && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-300">
                            → {new Date(requestedObj.clientApprovalDeadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Location & Studio Logistics */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-600" /> 3. Location &amp; Physical Logistics
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 font-bold">
                        {fullEvent.shootType || 'INDOOR'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Studio / Location Name</span>
                        <p className="font-bold text-slate-900">{fullEvent.location || 'Main Studio Floor'}</p>
                        {changedKeys.includes('location') && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-300">
                            → {requestedObj.location}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Location Category</span>
                        <p className="font-bold text-slate-700">{fullEvent.locationCategory || 'Studio Bay'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Objective & Production Copy */}
                  {(fullEvent.caption || fullEvent.productionNotes || fullEvent.description || requestedObj.caption || requestedObj.productionNotes) && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                      <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-cyan-600" /> 4. Objective, Caption &amp; Production Notes
                      </span>
                      {fullEvent.caption && (
                        <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Objective / Caption Brief</span>
                          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{fullEvent.caption}</p>
                        </div>
                      )}
                      {fullEvent.productionNotes && (
                        <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Production Notes</span>
                          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{fullEvent.productionNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: SIDE-BY-SIDE DIFF TABLE ── */}
              {editRequestModalTab === 'DIFF_TABLE' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Side-by-Side Field Diff Comparison</span>
                    <span className="text-[10px] text-amber-700 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      * Highlighted amber rows indicate modified fields
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                          <th className="p-3 w-1/4">FIELD</th>
                          <th className="p-3 w-3/8 text-slate-700">ORIGINAL VALUE (LIVE)</th>
                          <th className="p-3 w-3/8 text-emerald-700">REQUESTED VALUE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono">
                        {allKeys.map((key) => {
                          const origVal = originalObj[key];
                          const reqVal = requestedObj[key];
                          const isDifferent = JSON.stringify(origVal) !== JSON.stringify(reqVal);

                          return (
                            <tr key={key} className={isDifferent ? 'bg-amber-50/80 font-bold' : 'bg-white opacity-75'}>
                              <td className="p-3 text-slate-800 capitalize font-sans">{getFriendlyLabel(key)}</td>
                              <td className="p-3 text-slate-600 truncate max-w-xs">{formatVal(key, origVal)}</td>
                              <td className="p-3">
                                {isDifferent ? (
                                  <span className="text-emerald-900 font-extrabold bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300 block truncate max-w-xs">
                                    {formatVal(key, reqVal)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">{formatVal(key, reqVal)}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Decision Note / Comment Input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700">
                  Marketing Manager Decision Note / Rejection Reason / Change Instructions:
                </label>
                <textarea
                  rows={2}
                  value={editRequestComment}
                  onChange={(e) => setEditRequestComment(e.target.value)}
                  placeholder="Enter review notes, feedback instructions, or approval comments..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <button
                  onClick={() => setSelectedEditRequest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (!editRequestComment.trim()) {
                        alert('Rejection reason is required.');
                        return;
                      }
                      try {
                        await fetchApi(`/calendar/edit-requests/${selectedEditRequest.id}/reject`, {
                          method: 'POST',
                          body: JSON.stringify({ reason: editRequestComment }),
                        });
                        alert('Edit Request Rejected. Original event remains unchanged.');
                        setSelectedEditRequest(null);
                        setEditRequestComment('');
                        loadClientData();
                      } catch (err: any) {
                        alert(err.message || 'Failed to reject edit request');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20 cursor-pointer"
                  >
                    Reject Changes
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        await fetchApi(`/calendar/edit-requests/${selectedEditRequest.id}/approve`, {
                          method: 'POST',
                          body: JSON.stringify({ reviewComment: editRequestComment }),
                        });
                        alert('Edit Request Approved!\n\nOriginal Media Calendar Event has been updated in-place (same ID preserved), audit log & timeline recorded.');
                        setSelectedEditRequest(null);
                        setEditRequestComment('');
                        loadClientData();
                      } catch (err: any) {
                        alert(err.message || 'Failed to approve edit request');
                      }
                    }}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    Approve Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Video Editing Task Review & Full Details Modal */}
      {selectedVideoTask && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={() => {
            setSelectedVideoTask(null);
            setVideoReviewModalAction(null);
            setVideoReviewRemarks('');
          }}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
                  {selectedVideoTask.taskId || selectedVideoTask.id}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase font-mono">
                  VIDEO EDITING DELIVERABLE
                </span>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded bg-purple-100 text-purple-900">
                  Awaiting Marketing Approval
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedVideoTask(null);
                  setVideoReviewModalAction(null);
                }}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task Info */}
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900">
                {selectedVideoTask.name || selectedVideoTask.title}
              </h2>
              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                <div>Client: <strong className="text-slate-800">{selectedVideoTask.client?.name || 'N/A'}</strong></div>
                {selectedVideoTask.brand?.name && (
                  <div>Brand: <strong className="text-slate-800">{selectedVideoTask.brand.name}</strong></div>
                )}
                <div>Priority: <strong className="text-slate-800">{selectedVideoTask.priority || 'MEDIUM'}</strong></div>
                <div>Due Date: <strong className="text-slate-800">{selectedVideoTask.dueDate ? new Date(selectedVideoTask.dueDate).toLocaleDateString() : 'N/A'}</strong></div>
                <div>Editor: <strong className="text-slate-800">{selectedVideoTask.assignedEmployees?.[0]?.user?.name || selectedVideoTask.tasks?.[0]?.assignedEmployees?.[0]?.user?.name || 'Staff Editor'}</strong></div>
              </div>
            </div>

            {/* Approval Progress Banner */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-purple-50 to-amber-50 border border-purple-200 rounded-xl space-y-1.5 text-xs text-slate-800">
              <div className="font-extrabold text-purple-950 uppercase text-[11px] tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" /> Multi-Stage Quality Review Status
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2 bg-white rounded-lg border border-emerald-200 flex items-center gap-1.5 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>1. Technical Review: Approved</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-emerald-200 flex items-center gap-1.5 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>2. Media Review: Approved</span>
                </div>
                <div className="p-2 bg-amber-100 rounded-lg border border-amber-300 flex items-center gap-1.5 text-amber-900 font-extrabold animate-pulse">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>3. Marketing Quality: Action Needed</span>
                </div>
              </div>
            </div>

            {/* Deliverable Video Asset Player */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-purple-600" /> Deliverable Output Asset (v{selectedVideoTask.activeDeliverableVersion || 1})
                </span>
                {selectedVideoTask.activeDeliverableUrl && (
                  <a
                    href={selectedVideoTask.activeDeliverableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                  </a>
                )}
              </div>

              {selectedVideoTask.activeDeliverableUrl ? (
                <div className="bg-black rounded-xl overflow-hidden border border-slate-200">
                  <video
                    src={selectedVideoTask.activeDeliverableUrl}
                    controls
                    className="w-full max-h-[380px] object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
                  No deliverable file URL attached.
                </div>
              )}
            </div>

            {/* Corresponding Script & Clip Breakdown */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" /> Corresponding Video Script &amp; Shot Codes
                </span>
                {(selectedVideoTask.clipCode || selectedVideoTask.projectScript?.clipCode) && (
                  <span className="px-2.5 py-1 bg-amber-200 text-amber-900 border border-amber-300 rounded-lg font-mono font-extrabold text-xs">
                    Code: {selectedVideoTask.clipCode || selectedVideoTask.projectScript?.clipCode}
                  </span>
                )}
              </div>

              {selectedVideoTask.projectScript?.title && (
                <h4 className="font-bold text-slate-900 text-sm">
                  {selectedVideoTask.projectScript.title}
                </h4>
              )}

              {(selectedVideoTask.projectScript?.body || selectedVideoTask.projectScript?.description || selectedVideoTask.description) && (
                <div className="p-3 bg-white border border-amber-200 rounded-lg text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedVideoTask.projectScript?.body || selectedVideoTask.projectScript?.description || selectedVideoTask.description}
                </div>
              )}

              {/* Clip Breakdown if Available */}
              {selectedVideoTask.clips && selectedVideoTask.clips.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-600 block">Shot &amp; Clip Breakdown:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedVideoTask.clips.map((clip: any, idx: number) => (
                      <div key={clip.id || idx} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-purple-700">Clip #{clip.order || idx + 1} ({clip.clipCode || `SHOT-${idx + 1}`})</span>
                          <span className="text-slate-500">{clip.duration ? `${clip.duration}s` : ''}</span>
                        </div>
                        {clip.description && <p className="text-slate-700 text-[11px]">{clip.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Decision Notes Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Marketing Quality Decision Notes / Feedback / Revision Instructions:
              </label>
              <textarea
                rows={2}
                value={videoReviewRemarks}
                onChange={(e) => setVideoReviewRemarks(e.target.value)}
                placeholder="Add optional quality notes or required revision details for the video editor..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white"
              />
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedVideoTask(null);
                  setVideoReviewModalAction(null);
                  setVideoReviewRemarks('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                Close Inspector
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarketingReviewTask(selectedVideoTask.id, 'REJECTED', videoReviewRemarks)}
                  disabled={submittingVideoReview}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Reject &amp; Request Revision
                </button>
                <button
                  type="button"
                  onClick={() => handleMarketingReviewTask(selectedVideoTask.id, 'APPROVED', videoReviewRemarks)}
                  disabled={submittingVideoReview}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Approve Marketing Quality (100%)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
