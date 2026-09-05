'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { CheckSquare, AlertTriangle, Plus, ArrowRight, RefreshCw, CheckCircle2, Search, SlidersHorizontal, RotateCcw, X, Building2, Tag, User, Calendar, Flame, Clock, ArrowUpDown, ExternalLink, FileText, Eye, Check, ShieldCheck, Copy, MessageSquare, Send, Lock } from 'lucide-react';
import { TableSortHeader, SortSelector } from '@/components/common/TableSortHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { usePagination } from '@/lib/usePagination';
import { sortData, SortField, SortOrder } from '@/utils/sortUtils';
import { ReassignmentRecommendationsModal } from '@/components/dashboard/ReassignmentRecommendationsModal';
import RevisionsTab from '@/components/revisions/RevisionsTab';
import RequestRevisionModal from '@/components/revisions/RequestRevisionModal';
import { TimelineView, TimelineEntry } from '@/components/common/TimelineView';

const isTaskRevision = (t: any) =>
  Boolean(
    t?.taskType === 'REVISION' ||
    t?.sourceType === 'REVISION' ||
    t?.revisionId ||
    t?.status === 'REVISION_REQUESTED' ||
    t?.status === 'CHANGES_REQUESTED' ||
    (Array.isArray(t?.revisions) && t.revisions.length > 0 && t.status !== 'COMPLETED' && t.status !== 'CLOSED') ||
    (t?.revisionCount && t.revisionCount > 0 && t.status !== 'COMPLETED' && t.status !== 'CLOSED') ||
    t?.title?.toLowerCase().includes('revision')
  );

const TaskWorkflowTimeline = ({ task }: { task: any }) => {
  if (!task) return null;

  const isRevision = isTaskRevision(task);
  const isDirect = task.sourceType === 'DIRECT_TASK';
  const isScriptTask = Boolean(task.script || task.scriptId);

  const scriptStages = [
    { key: 'CREATED', label: '1. Created' },
    { key: 'PRODUCTION_COMPLETED', label: '2. Updated as Completed' },
    { key: 'WAITING_FOR_TECHNICAL_REVIEW', label: '3. Request for Tech Review' },
    { key: 'TECHNICAL_REVIEW_APPROVED', label: '4. Tech Review Accepted' },
    { key: 'WAITING_FOR_MARKETING_APPROVAL', label: '5. Waiting MM Approval' },
    { key: 'APPROVED', label: '6. Approved' },
    { key: 'COMPLETED', label: '7. Completed' },
  ];

  const revisionStages = [
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'WAITING_FOR_TECHNICAL_REVIEW', label: 'Technical Review' },
    { key: 'WAITING_FOR_MEDIA_REVIEW', label: 'Media Review' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const eventStages = [
    { key: 'PENDING_MARKETING_APPROVAL', label: 'Marketing Approval' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'WAITING_FOR_TECHNICAL_REVIEW', label: 'Technical Review' },
    { key: 'WAITING_FOR_MEDIA_REVIEW', label: 'Media Review' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const directStages = [
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'WAITING_FOR_TECHNICAL_REVIEW', label: 'Technical Review' },
    { key: 'WAITING_FOR_MEDIA_REVIEW', label: 'Media Review' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  let stages = directStages;
  let currentIdx = -1;

  if (isScriptTask) {
    stages = scriptStages;
    if (task.status === 'COMPLETED') currentIdx = 6;
    else if (task.status === 'APPROVED') currentIdx = 5;
    else if (task.status === 'WAITING_FOR_MARKETING_APPROVAL' || task.status === 'WAITING_FOR_MEDIA_REVIEW') currentIdx = 4;
    else if (task.technicalReviewApproved || task.status === 'TECHNICAL_REVIEW_APPROVED') currentIdx = 3;
    else if (task.status === 'WAITING_FOR_TECHNICAL_REVIEW') currentIdx = 2;
    else if (task.status === 'WAITING_FOR_REVIEW' || task.productionCompleted || task.status === 'IN_PROGRESS' || task.status === 'ACCEPTED') currentIdx = 1;
    else currentIdx = 0;
  } else if (isRevision) {
    stages = revisionStages;
    currentIdx = stages.findIndex((s) => s.key === task.status);
  } else if (isDirect) {
    stages = directStages;
    currentIdx = stages.findIndex((s) => s.key === task.status);
  } else {
    stages = eventStages;
    currentIdx = stages.findIndex((s) => s.key === task.status);
  }

  const parentTitle =
    task.script?.name ||
    task.graphicRequirement?.name ||
    task.project?.name ||
    task.client?.name ||
    'Parent Event';

  return (
    <div className={`border p-3.5 rounded-xl space-y-2.5 ${
      isScriptTask
        ? 'bg-purple-950/40 border-purple-800/60 shadow-lg shadow-purple-950/20'
        : isRevision
        ? 'bg-amber-950/40 border-amber-800/60 shadow-lg shadow-amber-950/20'
        : 'bg-gray-950 border-gray-800'
    }`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
          {isScriptTask ? (
            <>
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              📜 Script Task Workflow Sequence (7 Stages)
            </>
          ) : isRevision ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              🔄 Revision Task Workflow Progress
            </>
          ) : isDirect ? (
            '⚡ Direct Task Workflow Sequence'
          ) : (
            '🎬 Event / Graphic Req Workflow Sequence'
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {parentTitle && (
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-900/60 text-purple-200 border border-purple-700/80 flex items-center gap-1">
              🔗 Linked Parent: <strong className="text-purple-300">{parentTitle}</strong>
            </span>
          )}
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
            isScriptTask ? 'bg-purple-950 text-purple-300 border-purple-800' :
            isRevision ? 'bg-amber-950 text-amber-300 border-amber-800' :
            isDirect ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-amber-950 text-amber-300 border-amber-800'
          }`}>
            {isScriptTask ? 'SCRIPT_TASK' : isRevision ? 'REVISION_TASK' : task.sourceType || 'DIRECT_TASK'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between overflow-x-auto py-1 px-1 gap-1">
        {stages.map((stage, i) => {
          const isCurrent = currentIdx === i;
          const isPassed = currentIdx >= 0 && i < currentIdx;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center min-w-[70px] text-center">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                  isCurrent
                    ? 'bg-purple-500 text-white font-extrabold ring-2 ring-purple-400 animate-pulse shadow-lg shadow-purple-500/50'
                    : isPassed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-900 text-gray-500 border border-gray-800'
                }`}>
                  {isPassed ? '✓' : i + 1}
                </div>
                <span className={`text-[9px] mt-1 font-semibold leading-tight ${
                  isCurrent ? 'text-purple-300 font-bold' : isPassed ? 'text-emerald-400' : 'text-gray-500'
                }`}>
                  {stage.label}
                </span>
              </div>

              {i < stages.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-[8px] ${
                  currentIdx >= 0 && i < currentIdx ? 'bg-emerald-500' : 'bg-gray-800'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default function TasksPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const reassignUserParam = searchParams.get('reassignUser');
  const employeeIdParam = searchParams.get('employeeId');
  const taskIdParam = searchParams.get('taskId') || searchParams.get('inspect') || searchParams.get('id');
  const createForTypeParam = searchParams.get('createForType');
  const createForIdParam = searchParams.get('createForId');
  const createForTitleParam = searchParams.get('title');

  useEffect(() => {
    if (createForTypeParam && createForIdParam) {
      const pType = (createForTypeParam === 'GRAPHIC_REQ' || createForTypeParam === 'GRAPHIC_REQUIREMENT') ? 'GRAPHIC_REQ' : 'PROJECT';
      setParentEntityType(pType);
      setSelectedParentId(createForIdParam);
      if (createForTitleParam) {
        setTaskTitle(`[Task] ${createForTitleParam}`);
      }
      setShowCreateModal(true);
    }
  }, [createForTypeParam, createForIdParam, createForTitleParam]);

  const [tasks, setTasks] = useState<any[]>([]);
  const [capacity, setCapacity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOverloadedUserId, setSelectedOverloadedUserId] = useState<string | null>(null);

  // Pagination Hook (Uses system default page size from settings)
  const { currentPage, setCurrentPage, pageSize, setPageSize, paginate } = usePagination();

  // Sorting State
  const [sortBy, setSortBy] = useState<SortField | string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField | string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Filtration States (Project-Style Filtration Control Panel)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showCapacityEngine, setShowCapacityEngine] = useState(false);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);

  // Task Inspector Modal state (All 15 Mandatory Attributes)
  const [inspectedTask, setInspectedTask] = useState<any>(null);
  const [revisionModalTask, setRevisionModalTask] = useState<any | null>(null);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [reassignReason, setReassignReason] = useState('');

  // 7 Official Script Attachment Categories
  const SCRIPT_ATTACHMENT_CATEGORIES = [
    { key: 'SCRIPT_DOCUMENT', label: 'Script Document' },
    { key: 'REFERENCE_IMAGES', label: 'Reference Images' },
    { key: 'REFERENCE_VIDEOS', label: 'Reference Videos' },
    { key: 'AUDIO_REFERENCES', label: 'Audio References' },
    { key: 'BRAND_GUIDELINES', label: 'Brand Guidelines' },
    { key: 'PRODUCT_INFORMATION', label: 'Product Information' },
    { key: 'SUPPORTING_DOCUMENTS', label: 'Supporting Documents' },
  ];
  const [selectedScriptAttachmentCategory, setSelectedScriptAttachmentCategory] = useState('SCRIPT_DOCUMENT');
  const [scriptAttachments, setScriptAttachments] = useState<any[]>([]);
  const [uploadingScriptAttachment, setUploadingScriptAttachment] = useState(false);
  const [showFullScriptDetailsInTask, setShowFullScriptDetailsInTask] = useState(false);

  useEffect(() => {
    if (inspectedTask?.script?.projectId || inspectedTask?.projectId) {
      const targetProjId = inspectedTask.script?.projectId || inspectedTask.projectId;
      fetchApi(`/files/project/${targetProjId}`)
        .then((res: any) => {
          if (res && Array.isArray(res.allFiles)) {
            const targetScriptId = inspectedTask.script?.id || inspectedTask.scriptId;
            if (targetScriptId) {
              setScriptAttachments(res.allFiles.filter((f: any) => f.scriptId === targetScriptId));
            } else {
              setScriptAttachments(res.allFiles);
            }
          }
        })
        .catch(() => setScriptAttachments([]));
    } else {
      setScriptAttachments([]);
    }
  }, [inspectedTask]);

  // Full Script Workspace State (Mirroring Script Inspect UI exactly)
  const [fullScript, setFullScript] = useState<any>(null);
  const [revisionModalScript, setRevisionModalScript] = useState<any | null>(null);
  const [loadingFullScript, setLoadingFullScript] = useState(false);
  const [scriptEditDescription, setScriptEditDescription] = useState('');
  const [scriptEditDuration, setScriptEditDuration] = useState('30s');
  const [scriptEditRemarks, setScriptEditRemarks] = useState('');
  const [scriptEditStatus, setScriptEditStatus] = useState('DRAFT');
  const [scriptEditPriority, setScriptEditPriority] = useState('MEDIUM');
  const [savingScript, setSavingScript] = useState(false);
  const [scriptStorylineTab, setScriptStorylineTab] = useState<'view' | 'edit'>('view');
  const [scriptCopiedStoryline, setScriptCopiedStoryline] = useState(false);
  const [showScriptDescriptionPopup, setShowScriptDescriptionPopup] = useState(false);

  // Prerequisites
  const [scriptProdComp, setScriptProdComp] = useState(false);
  const [scriptTechAppr, setScriptTechAppr] = useState(false);
  const [scriptMediaAppr, setScriptMediaAppr] = useState(false);
  const [scriptClientConf, setScriptClientConf] = useState(false);

  // Remarks
  const [scriptNewRemarkText, setScriptNewRemarkText] = useState('');
  const [scriptAddingRemark, setScriptAddingRemark] = useState(false);

  // Deliverables
  const [scriptNewDelivType, setScriptNewDelivType] = useState('Reel');
  const [scriptNewDelivTitle, setScriptNewDelivTitle] = useState('');
  const [scriptNewDelivDuration, setScriptNewDelivDuration] = useState('');

  // Attachment Link State (replaces file upload)
  const [scriptNewLinkName, setScriptNewLinkName] = useState('');
  const [scriptNewLinkUrl, setScriptNewLinkUrl] = useState('');
  const [scriptAddingLink, setScriptAddingLink] = useState(false);

  useEffect(() => {
    if (inspectedTask?.script?.id || inspectedTask?.scriptId) {
      const sId = inspectedTask.script?.id || inspectedTask.scriptId;
      setLoadingFullScript(true);
      fetchApi(`/scripts/${sId}`)
        .then((res: any) => {
          const item = res?.data || res;
          if (item) {
            setFullScript(item);
            setScriptEditDescription(item.description || '');
            setScriptEditDuration(item.estimatedDuration || '30s');
            setScriptEditRemarks(item.remarks || '');
            setScriptEditStatus(item.status || 'DRAFT');
            setScriptEditPriority(item.priority || 'MEDIUM');
            setScriptProdComp(item.status === 'COMPLETED' || item.status === 'APPROVED');
            setScriptTechAppr(item.status === 'WAITING_FOR_MEDIA_REVIEW' || item.status === 'APPROVED' || item.status === 'COMPLETED');
            setScriptMediaAppr(item.status === 'APPROVED' || item.status === 'COMPLETED');
            setScriptClientConf(item.status === 'COMPLETED');
          }
        })
        .catch(() => setFullScript(inspectedTask.script || null))
        .finally(() => setLoadingFullScript(false));
    } else {
      setFullScript(null);
    }
  }, [inspectedTask]);

  const handleSaveScriptDetailsInTask = async () => {
    if (!fullScript) return;
    setSavingScript(true);
    try {
      let finalStatus = scriptEditStatus;
      if (scriptProdComp && scriptTechAppr && scriptMediaAppr && scriptClientConf) {
        finalStatus = 'COMPLETED';
      }
      await fetchApi(`/scripts/${fullScript.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          description: scriptEditDescription,
          estimatedDuration: scriptEditDuration,
          remarks: scriptEditRemarks,
          status: finalStatus,
          priority: scriptEditPriority,
        }),
      });
      const updated = await fetchApi(`/scripts/${fullScript.id}`);
      setFullScript(updated);
      alert('✓ Script details updated successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update script');
    } finally {
      setSavingScript(false);
    }
  };

  const handleAddScriptRemarkInTask = async () => {
    if (!fullScript || !scriptNewRemarkText.trim()) return;
    setScriptAddingRemark(true);
    try {
      await fetchApi(`/scripts/${fullScript.id}/remarks`, {
        method: 'POST',
        body: JSON.stringify({ message: scriptNewRemarkText.trim() }),
      });
      const updated = await fetchApi(`/scripts/${fullScript.id}`);
      setFullScript(updated);
      setScriptNewRemarkText('');
    } catch (err: any) {
      alert(err.message || 'Failed to add remark');
    } finally {
      setScriptAddingRemark(false);
    }
  };

  const handleAddScriptAttachmentLink = async () => {
    if (!fullScript || !scriptNewLinkName.trim() || !scriptNewLinkUrl.trim()) return;
    setScriptAddingLink(true);
    try {
      const updated = await fetchApi(`/scripts/${fullScript.id}/attachment-links`, {
        method: 'POST',
        body: JSON.stringify({
          name: scriptNewLinkName.trim(),
          url: scriptNewLinkUrl.trim(),
          attachmentCategory: selectedScriptAttachmentCategory,
        }),
      });
      setFullScript(updated);
      setScriptNewLinkName('');
      setScriptNewLinkUrl('');
    } catch (err: any) {
      alert(err.message || 'Failed to add attachment link');
    } finally {
      setScriptAddingLink(false);
    }
  };

  const handleDeleteScriptAttachmentLink = async (linkId: string) => {
    if (!fullScript) return;
    try {
      const updated = await fetchApi(`/scripts/attachment-links/${linkId}`, { method: 'DELETE' });
      setFullScript(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to remove attachment link');
    }
  };

  const handleAddScriptDeliverableInTask = async () => {
    if (!fullScript || !scriptNewDelivType) return;
    try {
      await fetchApi(`/scripts/${fullScript.id}/deliverables`, {
        method: 'POST',
        body: JSON.stringify({
          type: scriptNewDelivType,
          title: scriptNewDelivTitle || undefined,
          duration: scriptNewDelivDuration || undefined,
        }),
      });
      const updated = await fetchApi(`/scripts/${fullScript.id}`);
      setFullScript(updated);
      setScriptNewDelivTitle('');
      setScriptNewDelivDuration('');
    } catch (err: any) {
      alert(err.message || 'Failed to add deliverable');
    }
  };

  const handleDeleteScriptDeliverableInTask = async (deliverableId: string) => {
    if (!fullScript) return;
    try {
      await fetchApi(`/scripts/deliverables/${deliverableId}`, { method: 'DELETE' });
      const updated = await fetchApi(`/scripts/${fullScript.id}`);
      setFullScript(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to remove deliverable');
    }
  };

  const handleSubmitTechnicalReviewInTask = async () => {
    const targetScriptId = fullScript?.id || activeScript?.id || inspectedTask?.scriptId || inspectedTask?.script?.id;

    if (targetScriptId) {
      setSavingScript(true);
      try {
        await fetchApi(`/scripts/${targetScriptId}/submit-technical`, { method: 'POST' });
        const updated = await fetchApi(`/scripts/${targetScriptId}`).catch(() => null);
        if (updated) {
          setFullScript(updated);
        }
        if (inspectedTask) {
          setInspectedTask((prev: any) => ({
            ...prev,
            status: 'WAITING_FOR_TECHNICAL_REVIEW',
            script: updated || prev?.script,
          }));
        }
        alert('⚡ Script successfully submitted for Technical Review!');
        loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to submit script for technical review');
      } finally {
        setSavingScript(false);
      }
    } else if (inspectedTask?.id) {
      handleRequestTechnicalReview(inspectedTask.id);
    }
  };

  const handleUpdateScriptStatusToInProgressInTask = async () => {
    const targetScriptId = fullScript?.id || activeScript?.id || inspectedTask?.scriptId;
    if (!targetScriptId) {
      alert('No script found to update status');
      return;
    }

    setSavingScript(true);
    try {
      await fetchApi(`/scripts/${targetScriptId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          preTechnicalReviewStatus: 'IN_PROGRESS',
        }),
      });
      const updated = await fetchApi(`/scripts/${targetScriptId}`).catch(() => null);
      if (updated) {
        setFullScript(updated);
      }
      setScriptEditStatus('IN_PROGRESS');
      alert('✓ Script status updated to IN PROGRESS!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update script status');
    } finally {
      setSavingScript(false);
    }
  };

  const handleReviewTechnicalInTask = async (action: 'APPROVE' | 'REJECT', comment?: string) => {
    if (!fullScript) return;
    setSavingScript(true);
    try {
      await fetchApi(`/scripts/${fullScript.id}/review-technical`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      });
      const updated = await fetchApi(`/scripts/${fullScript.id}`);
      setFullScript(updated);
      alert(`✓ Technical Review action (${action}) completed!`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Technical review action failed');
    } finally {
      setSavingScript(false);
    }
  };

  const handleReviewMediaInTask = async (action: 'APPROVE' | 'REJECT', comment?: string) => {
    if (!fullScript) return;
    setSavingScript(true);
    try {
      await fetchApi(`/scripts/${fullScript.id}/review-media`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      });
      const updated = await fetchApi(`/scripts/${fullScript.id}`);
      setFullScript(updated);
      alert(`✓ Media Manager Review action (${action}) completed!`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Media Manager review action failed');
    } finally {
      setSavingScript(false);
    }
  };

  const handleApproveScriptInTask = async (action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT', comment?: string) => {
    if (!fullScript) return;
    setSavingScript(true);
    try {
      await fetchApi(`/scripts/${fullScript.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      });
      const updated = await fetchApi(`/scripts/${fullScript.id}`);
      setFullScript(updated);
      alert(`✓ Script approval action (${action}) completed successfully!`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to perform approval action');
    } finally {
      setSavingScript(false);
    }
  };

  const handleResubmitScriptInTask = async () => {
    if (!fullScript) return;
    setSavingScript(true);
    try {
      await fetchApi(`/scripts/${fullScript.id}/resubmit`, { method: 'POST' });
      const updated = await fetchApi(`/scripts/${fullScript.id}`);
      setFullScript(updated);
      alert('✓ Script resubmitted for Marketing Manager approval!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to resubmit script');
    } finally {
      setSavingScript(false);
    }
  };

  // Technical Review State
  const [techReviewRemarks, setTechReviewRemarks] = useState('');
  const [submittingTechReview, setSubmittingTechReview] = useState(false);

  // Deliverable Upload Modal state
  const [uploadTask, setUploadTask] = useState<any>(null);
  const [uploadFileUrl, setUploadFileUrl] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadingDeliverable, setUploadingDeliverable] = useState(false);

  // Configurable Daily Capacity state
  const [editingCapacityUser, setEditingCapacityUser] = useState<any>(null);
  const [editCapacityHours, setEditCapacityHours] = useState('8.0');
  const [savingCapacity, setSavingCapacity] = useState(false);

  // Dedicated Update Task Modal State
  const [updatingTask, setUpdatingTask] = useState<any>(null);
  const [editStatus, setEditStatus] = useState('IN_PROGRESS');
  const [editProgress, setEditProgress] = useState(0);
  const [editRemark, setEditRemark] = useState('');
  const [savingTaskUpdate, setSavingTaskUpdate] = useState(false);
  // Dedicated Work Details Modal State for Workload & Capacity Engine
  const [selectedWorkDetailsEmp, setSelectedWorkDetailsEmp] = useState<any>(null);
  const [empAssignedWorkTasks, setEmpAssignedWorkTasks] = useState<any[]>([]);
  const [loadingEmpWorkDetails, setLoadingEmpWorkDetails] = useState(false);

  const openWorkDetailsModal = async (emp: any) => {
    setSelectedWorkDetailsEmp(emp);
    setLoadingEmpWorkDetails(true);
    try {
      const res = await fetchApi(`/tasks?employeeId=${emp.userId}`);
      setEmpAssignedWorkTasks(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load employee assigned work tasks:', err);
      setEmpAssignedWorkTasks([]);
    } finally {
      setLoadingEmpWorkDetails(false);
    }
  };

  const openUpdateTaskModal = (task: any) => {
    const isAssigned = task.assignedEmployees?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const userAssignment = task.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const isNotAcceptedYet = isAssigned && userAssignment?.acceptanceStatus !== 'ACCEPTED' && user?.role !== 'ADMINISTRATOR' && (user?.role as string) !== 'ADMIN';

    if (isNotAcceptedYet) {
      alert('Task must be accepted before you can perform this action. Please click "Accept Task" first.');
      return;
    }

    setUpdatingTask(task);
    setEditStatus(task.status || 'IN_PROGRESS');
    setEditProgress(task.completionPercentage || 0);
    setEditRemark('');
  };

  const handleSaveTaskUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingTask) return;
    setSavingTaskUpdate(true);
    try {
      let finalProgress = editProgress;
      if (editStatus === 'COMPLETED') finalProgress = 100;
      if (editStatus === 'PENDING') finalProgress = 0;

      await fetchApi(`/tasks/${updatingTask.id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: editStatus,
          completionPercentage: finalProgress,
          remark: editRemark.trim() || undefined,
        }),
      });

      if (editRemark.trim()) {
        await fetchApi(`/tasks/${updatingTask.id}/remarks`, {
          method: 'POST',
          body: JSON.stringify({ text: editRemark.trim() }),
        }).catch(() => null);
      }

      setUpdatingTask(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    } finally {
      setSavingTaskUpdate(false);
    }
  };

  // Create Task Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [parentEntityType, setParentEntityType] = useState<'NONE' | 'PROJECT' | 'SCRIPT' | 'GRAPHIC_REQ'>('NONE');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [taskClientId, setTaskClientId] = useState('');
  const [taskBrandId, setTaskBrandId] = useState('');
  const [taskProductId, setTaskProductId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [taskEstimatedHours, setTaskEstimatedHours] = useState('2.0');
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [scriptsList, setScriptsList] = useState<any[]>([]);
  const [graphicReqsList, setGraphicReqsList] = useState<any[]>([]);
  const [staffUsersList, setStaffUsersList] = useState<any[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const loadReferenceData = async () => {
    try {
      const [resCap, resProj, resScripts, resGraphic, resUsers, resClients, resBrands, resProducts] = await Promise.all([
        fetchApi('/tasks/capacity/overview'),
        fetchApi('/projects'),
        fetchApi('/scripts'),
        fetchApi('/graphic-reqs'),
        fetchApi('/users'),
        fetchApi('/clients'),
        fetchApi('/brands'),
        fetchApi('/products'),
      ]);
      setCapacity(Array.isArray(resCap) ? resCap : []);
      setProjectsList(Array.isArray(resProj) ? resProj : []);
      setScriptsList(Array.isArray(resScripts) ? resScripts : []);
      setGraphicReqsList(Array.isArray(resGraphic) ? resGraphic : []);
      setStaffUsersList(Array.isArray(resUsers) ? resUsers : []);
      setClientsList(Array.isArray(resClients) ? resClients : []);
      setBrandsList(Array.isArray(resBrands) ? resBrands : []);
      setProductsList(Array.isArray(resProducts) ? resProducts : []);
    } catch (err) {
      console.error('Failed to load tasks reference metadata:', err);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      let query = '?';
      if (searchQuery.trim()) query += `search=${encodeURIComponent(searchQuery.trim())}&`;
      if (statusFilter && statusFilter !== 'ALL') query += `status=${statusFilter}&`;
      if (selectedClient) query += `clientId=${selectedClient}&`;
      if (selectedBrand) query += `brandId=${selectedBrand}&`;
      if (selectedProduct) query += `productId=${selectedProduct}&`;
      if (selectedProject) query += `projectId=${selectedProject}&`;
      if (selectedEmployee) query += `employeeId=${selectedEmployee}&`;

      const resTasks = await fetchApi(`/tasks${query}`);
      setTasks(Array.isArray(resTasks) ? resTasks : []);
    } catch (err) {
      console.error('Failed to load tasks list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (reassignUserParam) {
      setSelectedOverloadedUserId(reassignUserParam);
      setShowCapacityEngine(true);
    } else if (employeeIdParam) {
      setSelectedEmployee(employeeIdParam);
    }
  }, [reassignUserParam, employeeIdParam]);

  useEffect(() => {
    if (taskIdParam) {
      const match = tasks.find((t: any) =>
        t.id === taskIdParam ||
        t.taskId === taskIdParam ||
        t.id?.toLowerCase() === taskIdParam.toLowerCase() ||
        t.taskId?.toLowerCase() === taskIdParam.toLowerCase()
      );
      if (match) {
        setInspectedTask(match);
      } else if (tasks.length > 0) {
        fetchApi(`/tasks/${taskIdParam}`)
          .then((fetched: any) => {
            const item = fetched?.data || fetched;
            if (item && item.id) setInspectedTask(item);
          })
          .catch(() => null);
      }

      // Smooth scroll to record element on page
      setTimeout(() => {
        const el = document.getElementById(taskIdParam) || document.getElementById(`task-${taskIdParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-blue-500', 'shadow-2xl');
          setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500', 'shadow-2xl'), 3500);
        }
      }, 400);
    }
  }, [taskIdParam, tasks]);

  useEffect(() => {
    loadTasks();
  }, [user, searchQuery, statusFilter, selectedClient, selectedBrand, selectedProduct, selectedProject, selectedEmployee, selectedPriority]);

  const loadData = loadTasks;

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: any = {
        title: taskTitle,
        description: taskDescription,
        priority: taskPriority,
        dueDate: taskDueDate || new Date(Date.now() + 86400000).toISOString(),
        estimatedHours: parseFloat(taskEstimatedHours) || 2.0,
        parentEntityType: parentEntityType === 'NONE' ? undefined : parentEntityType,
        clientId: taskClientId || undefined,
        brandId: taskBrandId || undefined,
        productId: taskProductId || undefined,
        assignedUserIds: assignedStaffIds,
      };

      if (parentEntityType === 'PROJECT' && selectedParentId) payload.projectId = selectedParentId;
      else if (parentEntityType === 'SCRIPT' && selectedParentId) payload.scriptId = selectedParentId;
      else if (parentEntityType === 'GRAPHIC_REQ' && selectedParentId) payload.graphicRequirementId = selectedParentId;

      await fetchApi('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowCreateModal(false);
      setTaskTitle('');
      setTaskDescription('');
      setSelectedParentId('');
      setTaskClientId('');
      setTaskBrandId('');
      setTaskProductId('');
      setTaskDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
      setAssignedStaffIds([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const openReassignDrawer = async (task: any) => {
    setSelectedTask(task);
    setTargetUserIds([]); // Clean selection so candidate selection replaces previous employee
    try {
      const rec = await fetchApi(`/tasks/${task.id}/reassign-recommendations`);
      setRecommendations(rec);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteReassign = async () => {
    if (targetUserIds.length === 0 || !selectedTask) return;
    try {
      await fetchApi(`/tasks/${selectedTask.id}/reassign`, {
        method: 'PUT',
        body: JSON.stringify({
          assignedUserIds: targetUserIds,
          reason: reassignReason.trim() || undefined,
        }),
      });
      setSelectedTask(null);
      setRecommendations(null);
      setTargetUserIds([]);
      setReassignReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reassign task');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-900 text-gray-300 border-gray-700';
      case 'ASSIGNED':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'ACCEPTED':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-950 text-yellow-300 border-yellow-800';
      case 'ON_HOLD':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'WAITING_FOR_REVIEW':
      case 'WAITING_FOR_TECHNICAL_REVIEW':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'WAITING_FOR_MEDIA_REVIEW':
        return 'bg-indigo-950 text-indigo-300 border-indigo-800';
      case 'REVISION_REQUESTED':
      case 'CHANGES_REQUESTED':
      case 'ON_REVISION':
        return 'bg-amber-950/90 text-amber-300 border-amber-500 font-extrabold shadow-sm animate-pulse';
      case 'COMPLETED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'CANCELLED':
        return 'bg-red-950 text-red-300 border-red-800';
      default:
        return 'bg-gray-900 text-gray-300 border-gray-700';
    }
  };

  const handleAcknowledgeAcceptance = async (taskId: string) => {
    try {
      const res = await fetchApi(`/tasks/${taskId}/accept`, { method: 'POST' });
      alert('⚡ Task assignment accepted and acknowledged successfully!');
      loadData();
      if (res && res.id === taskId) {
        setInspectedTask(res);
      } else if (inspectedTask && inspectedTask.id === taskId) {
        setInspectedTask((prev: any) => ({
          ...prev,
          status: 'ACCEPTED',
          assignedEmployees: prev?.assignedEmployees?.map((a: any) =>
            a.userId === user?.id ? { ...a, acceptanceStatus: 'ACCEPTED', acceptedAt: new Date().toISOString() } : a
          ),
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge task acceptance');
    }
  };

  const handleStartInProgress = async (taskId: string) => {
    try {
      await fetchApi(`/tasks/${taskId}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      alert('🚀 Task status updated to IN PROGRESS!');
      loadData();
      if (inspectedTask && inspectedTask.id === taskId) {
        setInspectedTask((prev: any) => ({
          ...prev,
          status: 'IN_PROGRESS',
          assignedEmployees: prev?.assignedEmployees?.map((a: any) =>
            a.userId === user?.id ? { ...a, acceptanceStatus: 'ACCEPTED', acceptedAt: new Date().toISOString() } : a
          ),
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update task status to In Progress');
    }
  };

  const handleAddRemark = async (taskId: string) => {
    if (!newRemarkText.trim()) return;
    setSubmittingRemark(true);
    try {
      const added = await fetchApi(`/tasks/${taskId}/remarks`, {
        method: 'POST',
        body: JSON.stringify({ message: newRemarkText.trim() }),
      });
      setNewRemarkText('');
      if (inspectedTask && inspectedTask.id === taskId) {
        setInspectedTask({
          ...inspectedTask,
          remarks: added.message,
          remarksHistory: [added, ...(inspectedTask.remarksHistory || [])],
        });
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record remark');
    } finally {
      setSubmittingRemark(false);
    }
  };

  const handleUploadDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTask || !uploadFileUrl.trim()) return;
    setUploadingDeliverable(true);
    try {
      const res = await fetchApi(`/tasks/${uploadTask.id}/upload-deliverable`, {
        method: 'POST',
        body: JSON.stringify({
          fileUrl: uploadFileUrl.trim(),
          fileName: uploadFileName.trim() || undefined,
        }),
      });

      if (inspectedTask && inspectedTask.id === uploadTask.id) {
        setInspectedTask({
          ...inspectedTask,
          status: res.task.status || inspectedTask.status,
          activeDeliverableUrl: res.task.activeDeliverableUrl,
          activeDeliverableFileName: res.task.activeDeliverableFileName,
          activeDeliverableVersion: res.task.activeDeliverableVersion,
          deliverableHistory: [res.historyEntry, ...(inspectedTask.deliverableHistory || [])],
        });
      }

      setUploadTask(null);
      setUploadFileUrl('');
      setUploadFileName('');
      alert('📤 Deliverable output uploaded successfully! When ready, click "Request Technical Review" to submit for Technical Approval.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to upload deliverable');
    } finally {
      setUploadingDeliverable(false);
    }
  };

  const handleUploadScriptAttachment = async (file: File, category: string) => {
    if ((!inspectedTask?.script && !inspectedTask?.scriptId) || !file) return;
    setUploadingScriptAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', inspectedTask.script?.projectId || inspectedTask.projectId);
      formData.append('scriptId', inspectedTask.script?.id || inspectedTask.scriptId);
      formData.append('attachmentCategory', category);

      const token = localStorage.getItem('moms_token') || localStorage.getItem('token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Attachment upload failed');
      }

      alert(`✓ File uploaded successfully under category "${category.replace(/_/g, ' ')}"!`);
      const targetProjId = inspectedTask.script?.projectId || inspectedTask.projectId;
      const resFiles = await fetchApi(`/files/project/${targetProjId}`);
      if (resFiles && Array.isArray(resFiles.allFiles)) {
        const targetScriptId = inspectedTask.script?.id || inspectedTask.scriptId;
        setScriptAttachments(resFiles.allFiles.filter((f: any) => f.scriptId === targetScriptId));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload script attachment');
    } finally {
      setUploadingScriptAttachment(false);
    }
  };

  const handleRequestTechnicalReview = async (taskId: string) => {
    try {
      await fetchApi(`/tasks/${taskId}/request-technical-review`, {
        method: 'POST',
      });
      alert('⚡ Formal request for Technical Review & Approval sent to Technical Managers! Task status updated to WAITING FOR TECHNICAL REVIEW.');
      loadData();
      if (inspectedTask && inspectedTask.id === taskId) {
        setInspectedTask((prev: any) => ({
          ...prev,
          status: 'WAITING_FOR_TECHNICAL_REVIEW',
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to request Technical Review');
    }
  };

  const handleExecuteTechReview = async (taskId: string, status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !techReviewRemarks.trim()) {
      alert('Please enter a rejection reason / revision feedback before rejecting deliverables.');
      return;
    }
    setSubmittingTechReview(true);
    try {
      await fetchApi('/approvals/tech-review', {
        method: 'POST',
        body: JSON.stringify({
          projectId: taskId,
          status,
          remarks: techReviewRemarks.trim() || undefined,
        }),
      });
      alert(`⚡ Technical Review decision (${status}) recorded successfully!`);
      setTechReviewRemarks('');
      loadData();
      if (inspectedTask && inspectedTask.id === taskId) {
        const updated = await fetchApi(`/tasks/${taskId}`);
        setInspectedTask(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit technical review');
    } finally {
      setSubmittingTechReview(false);
    }
  };

  const handleSaveCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCapacityUser) return;
    const hours = parseFloat(editCapacityHours);
    if (isNaN(hours) || hours <= 0) {
      alert('Please enter a valid capacity in hours (greater than 0)');
      return;
    }
    setSavingCapacity(true);
    try {
      const updatedCapacity = await fetchApi(`/tasks/capacity/${editingCapacityUser.userId}`, {
        method: 'PUT',
        body: JSON.stringify({ dailyCapacityHours: hours }),
      });
      setCapacity(updatedCapacity);
      setEditingCapacityUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update daily capacity');
    } finally {
      setSavingCapacity(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const completionPercentage = newStatus === 'COMPLETED' ? 100 : newStatus === 'PENDING' ? 0 : undefined;
      await fetchApi(`/tasks/${taskId}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          completionPercentage,
        }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleUpdateProgress = async (taskId: string, newPercentage: number) => {
    try {
      await fetchApi(`/tasks/${taskId}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          completionPercentage: newPercentage,
          status: newPercentage === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update progress');
    }
  };

  const inspectedTaskIsAssigned = inspectedTask?.assignedEmployees?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id);
  const inspectedTaskUserAssignment = inspectedTask?.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
  const isPendingAcceptance = inspectedTaskIsAssigned && inspectedTaskUserAssignment?.acceptanceStatus !== 'ACCEPTED' && user?.role !== 'ADMINISTRATOR' && (user?.role as string) !== 'ADMIN';

  const isAdminUser = user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN';
  const inspectedTaskCreatedEvent = inspectedTask?.timeline?.find((t: any) => t.event === 'TASK_CREATED' || t.event === 'CREATED');
  const inspectedTaskCreatorId = inspectedTaskCreatedEvent?.userId || inspectedTask?.script?.createdById || inspectedTask?.createdById;
  const isInspectedTaskCreator = Boolean(user?.id && inspectedTaskCreatorId && user.id === inspectedTaskCreatorId);
  const isAssignedWorker = Boolean(
    inspectedTask?.assignedEmployees?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id) ||
    user?.role === 'STAFF'
  );
  // STRICT RULE: The assigned person can NEVER request or assign a revision on their own task!
  // ONLY the task creator (who is not the assigned worker) or an Administrator can assign/request a revision!
  const canAssignRevision = (isAdminUser || isInspectedTaskCreator) && !isAssignedWorker;

  const isInspectedTaskScript = Boolean(
    inspectedTask?.script ||
    inspectedTask?.scriptId ||
    inspectedTask?.sourceType === 'SCRIPT_TASK' ||
    inspectedTask?.taskType === 'SCRIPT' ||
    inspectedTask?.sourceType === 'SCRIPT'
  );

  const activeScript = isInspectedTaskScript
    ? fullScript || inspectedTask?.script || {
        id: inspectedTask.scriptId || inspectedTask.id,
        scriptId: inspectedTask.scriptId || `SCR-${inspectedTask.taskId}`,
        name: inspectedTask.script?.name || inspectedTask.title,
        description: inspectedTask.script?.description || '',
        status: inspectedTask.script?.status || inspectedTask.status || 'DRAFT',
        priority: inspectedTask.script?.priority || inspectedTask.priority || 'MEDIUM',
        createdAt: inspectedTask.createdAt || new Date().toISOString(),
        project: inspectedTask.project,
        client: inspectedTask.client,
        brand: inspectedTask.brand,
        product: inspectedTask.product,
        revisionCount: inspectedTask.script?.revisionCount || inspectedTask.revisionCount || 0,
        scriptAssignments: inspectedTask.script?.scriptAssignments || inspectedTask.assignedEmployees || [],
        scriptRemarks: inspectedTask.script?.scriptRemarks || inspectedTask.remarksHistory || [],
        deliverables: inspectedTask.script?.deliverables || [],
        timeline: inspectedTask.script?.timeline || inspectedTask.taskTimeline || [],
        files: inspectedTask.script?.files || scriptAttachments || [],
        language: inspectedTask.script?.language || 'English',
        category: inspectedTask.script?.category || 'Social Media',
        estimatedDuration: inspectedTask.script?.estimatedDuration || '30s',
        remarks: inspectedTask.script?.remarks || '',
      }
    : null;

  const visibleTasks = React.useMemo(() => {
    const filtered = tasks.filter((t) => {
      if (user?.role === 'TECHNICAL_MANAGER') {
        const TECH_MANAGER_ALLOWED_TASK_STATUSES = [
          'WAITING_FOR_TECHNICAL_REVIEW',
          'TECHNICAL_REVIEW',
          'WAITING_FOR_REVIEW',
          'WAITING_FOR_MEDIA_REVIEW',
          'MEDIA_REVIEW',
          'MEDIA_MANAGER_REVIEW',
          'WAITING_FOR_CLIENT_CONFIRMATION',
          'CLIENT_CONFIRMATION',
          'CLIENT_REVISION_REQUESTED',
          'COMPLETED',
          'CLOSED',
          'APPROVED',
          'SCHEDULED',
          'PUBLISHED',
        ];
        return (
          TECH_MANAGER_ALLOWED_TASK_STATUSES.includes(t.status) ||
          Boolean(t.technicalReviewApproved)
        );
      }
      return true;
    });

    // Deduplicate any duplicate task rows for the same parent script / graphic requirement
    const seenEntities = new Set<string>();
    const deduplicated: any[] = [];

    for (const t of filtered) {
      const entityKey = t.scriptId
        ? `SCRIPT_${t.scriptId}`
        : t.graphicRequirementId
        ? `GRAPHIC_${t.graphicRequirementId}`
        : null;

      if (!entityKey) {
        deduplicated.push(t);
        continue;
      }

      if (!seenEntities.has(entityKey)) {
        seenEntities.add(entityKey);
        deduplicated.push(t);
      }
    }

    return deduplicated;
  }, [tasks, user?.role]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-400" /> Operational Task &amp; Workload Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Every task belongs to a parent Shoot Project, Script, or Graphic Requirement. Tasks cannot exist independently.
          </p>
        </div>

        {user?.role === 'MEDIA_MANAGER' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/30 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Create New Task
          </button>
        )}
      </div>

      {/* Workload Capacity Section (Toggleable on click button) */}
      {(user?.role === 'MEDIA_MANAGER' || user?.role === 'TECHNICAL_MANAGER' || (user?.role as string) === 'ADMIN') && (
        <div className="bg-card border border-border rounded-xl shadow-md overflow-hidden">
          <div
            onClick={() => setShowCapacityEngine(!showCapacityEngine)}
            className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-gray-800/40 transition-colors"
          >
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Automated Continuous Workload &amp; Capacity Engine
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Continuously calculated from Estimated Hours, Active Tasks, Due Dates (Urgency), Employee Capacity, and Task Priority.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {capacity.some((e) => e.isOverloaded || e.status === 'Overloaded') && (
              <span className="px-2.5 py-1 bg-red-600 text-white font-mono font-bold text-[10px] rounded flex items-center gap-1 animate-pulse">
                🚨 {capacity.filter((e) => e.isOverloaded || e.status === 'Overloaded').length} Overloaded Staff
              </span>
            )}
            <span className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-mono font-bold text-[10px]">
              ⚡ Auto-Updated Live ({capacity.length} Staff Monitored)
            </span>
            <button
              type="button"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-md shadow-blue-600/30"
            >
              <span>{showCapacityEngine ? 'Hide Engine Inspector ▲' : 'Open Engine Inspector ▼'}</span>
            </button>
          </div>
        </div>

        {showCapacityEngine && (
          <div className="p-5 border-t border-gray-800 space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              {capacity.map((emp) => {
                const isOverloaded = emp.isOverloaded || emp.assignedHours > emp.capacityHours || emp.status === 'Overloaded';

                return (
                  <div
                    key={emp.userId}
                    className={`p-4 rounded-xl border space-y-3 relative transition-all shadow-md ${
                      isOverloaded
                        ? 'bg-gradient-to-br from-red-950/90 via-zinc-900 to-red-950/70 border-red-500 ring-2 ring-red-500/50 shadow-xl shadow-red-950/60 animate-pulse'
                        : emp.status === 'Normal'
                        ? 'bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-900 border-amber-800/60'
                        : 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-900 border-zinc-800'
                    }`}
                  >
                    {/* Overloaded Alert Header Banner */}
                    {isOverloaded && (
                      <div className="bg-red-600 text-white font-mono text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded flex items-center justify-between border border-red-400 shadow-sm tracking-wider">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-white animate-bounce" /> EXCEEDS CAPACITY
                        </span>
                        <span>OVERLOADED</span>
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-400" /> {emp.name}
                        </h3>
                        <span className="text-[10px] text-gray-400">{emp.designation}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {user?.role === 'MEDIA_MANAGER' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCapacityUser(emp);
                              setEditCapacityHours(emp.capacityHours.toString());
                            }}
                            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                            title="Configure Daily Working Capacity"
                          >
                            ⚙️
                          </button>
                        )}
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase border font-mono ${
                            isOverloaded
                              ? 'bg-red-600 text-white border-red-400'
                              : emp.status === 'Normal'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-800'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-800'
                          }`}
                        >
                          {isOverloaded ? 'OVERLOADED' : emp.status}
                        </span>
                      </div>
                    </div>

                    {/* 6 Mandatory Monitoring Metrics */}
                    <div className="text-[11px] space-y-1.5 font-mono border-t border-gray-800/80 pt-2.5">
                      {/* 1. Daily Capacity */}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" /> 1. Daily Capacity:
                        </span>
                        <strong className="text-cyan-300 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                          {emp.capacityHours} Hours
                        </strong>
                      </div>

                      {/* 2. Assigned Hours */}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-400" /> 2. Assigned Hours:
                        </span>
                        <strong className={`font-bold px-1.5 py-0.5 rounded border ${
                          emp.assignedHours > emp.capacityHours
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : 'bg-zinc-800 text-white border-zinc-700'
                        }`}>
                          {emp.assignedHours} Hours
                        </strong>
                      </div>

                      {/* 3. Remaining Capacity */}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 3. Remaining Capacity:
                        </span>
                        <strong className={`font-bold px-1.5 py-0.5 rounded border ${
                          (emp.remainingCapacity || emp.remainingHours || 0) <= 0
                            ? 'bg-red-950 text-red-400 border-red-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}>
                          {emp.remainingCapacity !== undefined ? emp.remainingCapacity : emp.remainingHours || 0} Hours
                        </strong>
                      </div>

                      {/* 4. Current Projects */}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-purple-400" /> 4. Current Projects:
                        </span>
                        <span className="text-purple-300 font-bold text-[10px]" title={emp.currentProjects?.join(', ') || 'No active projects'}>
                          {emp.currentProjectsCount || emp.currentProjects?.length || 0} Active
                        </span>
                      </div>

                      {/* 5. Task Count */}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-blue-400" /> 5. Task Count:
                        </span>
                        <span className="text-blue-300 font-bold">
                          {emp.taskCount !== undefined ? emp.taskCount : emp.activeTaskCount || 0} Tasks
                        </span>
                      </div>

                      {/* 6. Output Progress */}
                      <div className="flex justify-between items-center pt-1 border-t border-gray-800/40">
                        <span className="text-gray-400 flex items-center gap-1">
                          <CheckSquare className="w-3 h-3 text-emerald-400" /> 6. Output Progress:
                        </span>
                        <span className="text-emerald-400 font-bold">
                          {emp.actualOutputToday || 0} / {emp.dailyTarget || 5} ({emp.outputProgressPercentage || 0}%)
                        </span>
                      </div>

                      {/* On-Click View Assigned Work Details & Smart Reassign Actions */}
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openWorkDetailsModal(emp);
                          }}
                          className="flex-1 px-2 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-sm cursor-pointer"
                        >
                          <Search className="w-3.5 h-3.5 text-blue-400" /> Work Details
                        </button>
                        {isOverloaded && (user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOverloadedUserId(emp.userId);
                            }}
                            className="flex-1 px-2 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-sm cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Reassign
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* User-Friendly Project-Style Filter Panel */}
      <div className="bg-card border border-border p-5 rounded-xl space-y-4 text-xs shadow-md">
        {/* Top Search & Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks by ID, Title, Client, Brand, Product, Project, Script, Staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-xl pl-9 pr-8 py-2.5 text-white font-medium focus:outline-none transition-all placeholder:text-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Advanced Toggle & Reset */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                showAdvancedFilters || (selectedClient || selectedBrand || selectedProduct || selectedProject || selectedEmployee || selectedPriority)
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>Advanced Filters</span>
              {([selectedClient, selectedBrand, selectedProduct, selectedProject, selectedEmployee, selectedPriority].filter(Boolean).length > 0) && (
                <span className="w-4 h-4 rounded-full bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center">
                  {[selectedClient, selectedBrand, selectedProduct, selectedProject, selectedEmployee, selectedPriority].filter(Boolean).length}
                </span>
              )}
            </button>

            <SortSelector
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(f, o) => {
                setSortBy(f);
                setSortOrder(o);
              }}
            />

            {(searchQuery || statusFilter !== 'ALL' || selectedClient || selectedBrand || selectedProduct || selectedProject || selectedEmployee || selectedPriority) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setSelectedClient('');
                  setSelectedBrand('');
                  setSelectedProduct('');
                  setSelectedProject('');
                  setSelectedEmployee('');
                  setSelectedPriority('');
                }}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Quick Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-gray-800">
          <span className="text-gray-400 font-bold text-[10px] uppercase mr-1">Status:</span>
          {['ALL', 'PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD', 'WAITING_FOR_REVIEW', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              {st === 'ALL' ? 'All Statuses' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Active Filter Chips / Pills */}
        {(selectedClient || selectedBrand || selectedProduct || selectedProject || selectedEmployee || selectedPriority) && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-800">
            <span className="text-gray-500 text-[11px] font-semibold">Active Filters:</span>
            {selectedClient && (
              <span className="px-2.5 py-1 bg-purple-950 text-purple-300 border border-purple-800 rounded-full flex items-center gap-1 text-[11px]">
                Client: {clientsList.find((c) => c.id === selectedClient)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedClient('')} />
              </span>
            )}
            {selectedBrand && (
              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full flex items-center gap-1 text-[11px]">
                Brand: [{brandsList.find((b) => b.id === selectedBrand)?.shortCode}] {brandsList.find((b) => b.id === selectedBrand)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedBrand('')} />
              </span>
            )}
            {selectedProduct && (
              <span className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full flex items-center gap-1 text-[11px]">
                Product: {productsList.find((p) => p.id === selectedProduct)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedProduct('')} />
              </span>
            )}
            {selectedProject && (
              <span className="px-2.5 py-1 bg-blue-950 text-blue-300 border border-blue-800 rounded-full flex items-center gap-1 text-[11px]">
                Project: {projectsList.find((p) => p.id === selectedProject)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedProject('')} />
              </span>
            )}
            {selectedEmployee && (
              <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full flex items-center gap-1 text-[11px]">
                Staff: {staffUsersList.find((u) => u.id === selectedEmployee)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedEmployee('')} />
              </span>
            )}
            {selectedPriority && (
              <span className="px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-full flex items-center gap-1 text-[11px]">
                Priority: {selectedPriority}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedPriority('')} />
              </span>
            )}
          </div>
        )}

        {/* Expandable Grouped Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-gray-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Group 1: Commercial Context */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-purple-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" /> Commercial Context
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedClient}
                    onChange={(e) => {
                      setSelectedClient(e.target.value);
                      setSelectedBrand('');
                      setSelectedProduct('');
                    }}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="">All Clients</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value);
                      setSelectedProduct('');
                    }}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="">All Brands</option>
                    {brandsList
                      .filter((b) => !selectedClient || b.clientId === selectedClient)
                      .map((b) => (
                        <option key={b.id} value={b.id}>[{b.shortCode}] {b.name}</option>
                      ))}
                  </select>

                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="">All Products</option>
                    {productsList
                      .filter((p) => !selectedBrand || p.brandId === selectedBrand)
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Group 2: Project & Staff */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-blue-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" /> Project &amp; Staff
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">All Parent Projects</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.projectId})</option>
                    ))}
                  </select>

                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">All Assigned Staff</option>
                    {staffUsersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 3: Priority */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-amber-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Priority Level
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="">All Priorities</option>
                    <option value="LOW">LOW Priority</option>
                    <option value="MEDIUM">MEDIUM Priority</option>
                    <option value="HIGH">HIGH Priority</option>
                    <option value="CRITICAL">CRITICAL Priority</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tasks Table - Minimalist Theme (Without Horizontal Overflow) */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 font-mono text-xs animate-pulse">
          ⚡ Loading Tasks Directory...
        </div>
      ) : (
        <div className="bg-gray-950/80 border border-gray-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <thead className="bg-gray-900/60 text-gray-400 uppercase text-[10px] font-mono tracking-wider border-b border-gray-800/60">
                <tr>
                  <th className="px-3 py-3 font-semibold w-[26%]">
                    <TableSortHeader
                      label="Task ID &amp; Deliverable"
                      field="name"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold w-[16%]">
                    <TableSortHeader
                      label="Parent Entity"
                      field="project"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold w-[14%]">
                    <TableSortHeader
                      label="Assigned Staff"
                      field="employee"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-2 py-3 font-semibold font-mono w-[6%]">Hours</th>
                  <th className="px-3 py-3 font-semibold w-[12%]">
                    <TableSortHeader
                      label="Progress"
                      field="deadline"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold w-[11%]">
                    <TableSortHeader
                      label="Status"
                      field="status"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold text-right w-[15%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 text-gray-200">
                {(() => {
                  const filteredAndSorted = sortData(
                    visibleTasks.filter((t) => statusFilter === 'ALL' || t.status === statusFilter),
                    sortBy,
                    sortOrder
                  );
                  const paginated = paginate(filteredAndSorted);
                  if (paginated.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-gray-500 italic font-mono text-xs">
                          No matching tasks found. Adjust active filters to view records.
                        </td>
                      </tr>
                    );
                  }
                  return paginated.map((task) => (
                    <tr key={task.id} id={task.id} className="hover:bg-gray-900/40 transition-colors border-b border-gray-800/40 last:border-0">
                      {/* Task ID & Title */}
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <FavoriteButton
                            entityType="TASK"
                            entityId={task.id}
                            title={task.title}
                            code={task.taskId}
                            url="/tasks"
                            metadata={{ status: task.status, priority: task.priority, brand: task.brand?.name }}
                            size="sm"
                          />
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <span className="font-mono text-[9px] text-blue-400 font-bold bg-blue-950/40 border border-blue-900/40 px-1 py-0.2 rounded shrink-0">
                                {task.taskId}
                              </span>
                              {isTaskRevision(task) && (
                                <span className="font-mono text-[9px] text-amber-300 font-extrabold bg-amber-950/90 border border-amber-500/80 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-md shadow-amber-900/50 animate-pulse">
                                  🔄 ON REVISION {task.revisionCount ? `#${task.revisionCount}` : (task.revisions?.length ? `#${task.revisions.length}` : '')}
                                </span>
                              )}
                              <span className="font-semibold text-gray-100 text-xs truncate">{task.title}</span>
                            </div>
                            {task.description && (
                              <p className="text-[10px] text-gray-400 font-normal truncate">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Parent Entity */}
                      <td className="px-3 py-3 text-xs min-w-0">
                        {task.script ? (
                          <Link
                            href={`/scripts?inspect=${task.script.id}`}
                            className="space-y-0.5 min-w-0 block group"
                            title="Click to View & Update Script Template"
                          >
                            <span className="px-1.5 py-0.2 bg-purple-950/80 text-purple-300 border border-purple-800/80 rounded-full font-mono text-[9px] inline-block shrink-0 group-hover:border-purple-500 group-hover:text-white transition-colors">
                              📄 Script Template ↗
                            </span>
                            <div className="text-gray-200 group-hover:text-purple-300 font-medium text-[11px] truncate transition-colors">{task.script.name}</div>
                          </Link>
                        ) : task.graphicRequirement ? (
                          <div className="space-y-0.5 min-w-0">
                            <span className="px-1.5 py-0.2 bg-amber-950/60 text-amber-300 border border-amber-800/50 rounded-full font-mono text-[9px] inline-block shrink-0">
                              🎨 Graphic Req
                            </span>
                            <div className="text-gray-200 font-medium text-[11px] truncate">{task.graphicRequirement.name}</div>
                          </div>
                        ) : task.project ? (
                          <div className="space-y-0.5 min-w-0">
                            <span className="px-1.5 py-0.2 bg-blue-950/60 text-blue-300 border border-blue-800/50 rounded-full font-mono text-[9px] inline-block shrink-0">
                              🎬 Shoot Project
                            </span>
                            <div className="text-gray-200 font-medium text-[11px] truncate">{task.project.name}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic text-[10px] font-mono">Standalone Task</span>
                        )}
                      </td>

                      {/* Assigned Staff */}
                      <td className="px-3 py-3 min-w-0">
                        {task.assignedEmployees?.length === 0 ? (
                          <span className="text-gray-500 italic text-[10px] font-mono">Unassigned</span>
                        ) : (
                          <div className="space-y-0.5 min-w-0">
                            {task.assignedEmployees?.map((a: any) => (
                              <div key={a.id} className="flex items-center gap-1 min-w-0">
                                <span className="font-medium text-gray-200 text-[11px] truncate">{a.user?.name}</span>
                                <span
                                  className={`text-[8px] font-mono px-1 rounded border shrink-0 ${
                                    a.acceptanceStatus === 'ACCEPTED'
                                      ? 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30'
                                      : 'text-amber-400 border-amber-800/50 bg-amber-950/30'
                                  }`}
                                >
                                  {a.acceptanceStatus === 'ACCEPTED' ? '✓' : '⏳'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Hours */}
                      <td className="px-2 py-3 font-mono text-[11px] font-semibold text-gray-300">
                        {task.estimatedHours}h
                      </td>

                      {/* Progress */}
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-gray-400 font-semibold">
                            <span>{task.completionPercentage || 0}%</span>
                          </div>
                          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${Math.min(task.completionPercentage || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 min-w-0">
                        {isTaskRevision(task) && task.status !== 'COMPLETED' ? (
                          <span className="px-2 py-0.5 rounded-full font-mono text-[8px] font-extrabold uppercase tracking-wide border inline-block truncate max-w-full bg-amber-950/90 text-amber-300 border-amber-500 shadow-sm animate-pulse">
                            🔄 ON REVISION {task.revisionCount ? `#${task.revisionCount}` : ''}
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase tracking-wide border inline-block truncate max-w-full ${getStatusBadge(
                            task.status
                          )}`}>
                            {task.status?.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {(() => {
                            const isAssigned = task.assignedEmployees?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id);
                            const userAssignment = task.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
                            const isNotAcceptedYet = isAssigned && userAssignment?.acceptanceStatus !== 'ACCEPTED' && user?.role !== 'ADMINISTRATOR' && (user?.role as string) !== 'ADMIN';

                            if (isNotAcceptedYet) {
                              return (
                                <button
                                  onClick={() => handleAcknowledgeAcceptance(task.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] transition-all shadow flex items-center gap-1 animate-pulse"
                                  title="Accept Task Assignment to Unlock Work Controls"
                                >
                                  ✓ Accept Task
                                </button>
                              );
                            }

                            return (
                              <>
                                {/* Assigned Staff Action: Start Work -> In Progress */}
                                {!['IN_PROGRESS', 'WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_REVIEW', 'COMPLETED', 'CANCELLED'].includes(task.status?.toUpperCase()) &&
                                 (task.status === 'ACCEPTED' || isAssigned) && (
                                  <button
                                    onClick={() => handleStartInProgress(task.id)}
                                    className="px-1.5 py-0.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded text-[10px] font-medium transition-colors flex items-center gap-1 shadow"
                                    title="Change Task Status to In Progress"
                                  >
                                    🚀 Start In Progress
                                  </button>
                                )}

                                {/* Actions locked for staff when under review */}
                                {user?.role === 'STAFF' && ['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_REVIEW', 'COMPLETED'].includes(task.status) ? (
                                  <span className="px-2 py-0.5 bg-amber-950/60 text-amber-300 border border-amber-800 rounded font-mono text-[9px] font-bold">
                                    🔒 Under Review
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => openUpdateTaskModal(task)}
                                      className="px-1.5 py-0.5 bg-gray-900 hover:bg-gray-800 text-amber-300 border border-gray-800 hover:border-amber-500/40 rounded text-[10px] font-medium transition-colors"
                                      title="Update Task Status & Progress"
                                    >
                                      ✏️ Update
                                    </button>

                                    {/* Upload Deliverables Action */}
                                    {['IN_PROGRESS', 'ON_HOLD'].includes(task.status) && (
                                      <button
                                        onClick={() => setUploadTask(task)}
                                        className="px-1.5 py-0.5 bg-gray-900 hover:bg-gray-800 text-cyan-300 border border-gray-800 hover:border-cyan-500/40 rounded text-[10px] font-medium transition-colors"
                                        title="Upload Deliverable Output"
                                      >
                                        📤 Deliverable
                                      </button>
                                    )}

                                    {/* Request Technical Review Action */}
                                    {!['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'PENDING_MARKETING_APPROVAL', 'APPROVED', 'COMPLETED'].includes(task.status) && (
                                      <button
                                        onClick={() => {
                                          if (task.scriptId || task.script?.id) {
                                            const targetScriptId = task.scriptId || task.script?.id;
                                            fetchApi(`/scripts/${targetScriptId}/submit-technical`, { method: 'POST' })
                                              .then(() => {
                                                alert('⚡ Script successfully submitted for Technical Review!');
                                                loadData();
                                              })
                                              .catch((err) => alert(err.message || 'Failed to submit script for technical review'));
                                          } else {
                                            handleRequestTechnicalReview(task.id);
                                          }
                                        }}
                                        className="px-1.5 py-0.5 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-700/50 rounded text-[10px] font-bold transition-all shadow"
                                        title="Submit for Technical Review & Approval"
                                      >
                                        ⚡ Tech Review
                                      </button>
                                    )}
                                  </>
                                )}
                              </>
                            );
                          })()}

                          <button
                            onClick={() => setInspectedTask(task)}
                            className="px-1.5 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 hover:border-gray-700 rounded text-[10px] font-medium transition-colors"
                          >
                            👁️ Inspect
                          </button>

                          {user?.role === 'MEDIA_MANAGER' && (
                            <button
                              onClick={() => openReassignDrawer(task)}
                              className="px-1.5 py-0.5 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-800/40 rounded text-[10px] font-medium transition-colors"
                              title="Reassign Task"
                            >
                              🔄 Reassign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={visibleTasks.filter((t) => statusFilter === 'ALL' || t.status === statusFilter).length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Create Task Modal with Mandatory Parent Entity Selector */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl w-full max-w-lg p-6 space-y-4 text-xs shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-400" /> Create Task (Parent Entity Required)
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-400 text-[11px]">
              Tasks cannot exist independently. You must select a parent Shoot Project, Script, or Graphic Requirement.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-3">
              {/* Parent Entity Type Switcher (Optional) */}
              <div>
                <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Select Parent Entity Type (Optional)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setParentEntityType('NONE'); setSelectedParentId(''); }}
                    className={`py-1.5 rounded text-[11px] font-bold border transition-colors ${
                      parentEntityType === 'NONE' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'
                    }`}
                  >
                    ⚡ Standalone (None)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setParentEntityType('PROJECT'); setSelectedParentId(''); }}
                    className={`py-1.5 rounded text-[11px] font-bold border transition-colors ${
                      parentEntityType === 'PROJECT' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'
                    }`}
                  >
                    🎬 Project
                  </button>
                  <button
                    type="button"
                    onClick={() => { setParentEntityType('SCRIPT'); setSelectedParentId(''); }}
                    className={`py-1.5 rounded text-[11px] font-bold border transition-colors ${
                      parentEntityType === 'SCRIPT' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'
                    }`}
                  >
                    📄 Script
                  </button>
                  <button
                    type="button"
                    onClick={() => { setParentEntityType('GRAPHIC_REQ'); setSelectedParentId(''); }}
                    className={`py-1.5 rounded text-[11px] font-bold border transition-colors ${
                      parentEntityType === 'GRAPHIC_REQ' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'
                    }`}
                  >
                    🎨 Graphic Req
                  </button>
                </div>
              </div>

              {/* Parent Entity Select Dropdown */}
              <div>
                <label className="block text-gray-400 font-semibold mb-1 text-[10px]">2. Select Specific Parent (Optional)</label>
                {parentEntityType === 'PROJECT' && (
                  <select
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-medium"
                  >
                    <option value="">-- Standalone Task (No Parent Project) --</option>
                    {projectsList
                      .filter((p) => ['APPROVED', 'TASK_ASSIGNED', 'IN_PRODUCTION', 'TECHNICAL_REVIEW', 'MEDIA_MANAGER_REVIEW', 'CLIENT_CONFIRMATION', 'COMPLETED'].includes(p.status))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.projectId}) - APPROVED</option>
                      ))}
                  </select>
                )}

                {parentEntityType === 'SCRIPT' && (
                  <select
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-medium"
                  >
                    <option value="">-- Standalone Task (No Parent Script) --</option>
                    {scriptsList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.scriptId})</option>
                    ))}
                  </select>
                )}

                {parentEntityType === 'GRAPHIC_REQ' && (
                  <select
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-medium"
                  >
                    <option value="">-- Standalone Task (No Parent Graphic Req) --</option>
                    {graphicReqsList
                      .filter((g) => ['READY', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(g.status))
                      .map((g) => (
                        <option key={g.id} value={g.id}>{g.name} ({g.requirementId}) - READY</option>
                      ))}
                  </select>
                )}
              </div>

              {/* Commercial Classification (Client / Brand / Product) - All Optional */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Client (Optional)</label>
                  <select
                    value={taskClientId}
                    onChange={(e) => {
                      setTaskClientId(e.target.value);
                      setTaskBrandId('');
                      setTaskProductId('');
                    }}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-medium text-xs"
                  >
                    <option value="">-- None (Optional) --</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Brand (Optional)</label>
                  <select
                    value={taskBrandId}
                    onChange={(e) => {
                      setTaskBrandId(e.target.value);
                      setTaskProductId('');
                    }}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-medium text-xs"
                  >
                    <option value="">-- None (Optional) --</option>
                    {brandsList
                      .filter((b) => !taskClientId || b.clientId === taskClientId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>[{b.shortCode}] {b.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Product (Optional)</label>
                  <select
                    value={taskProductId}
                    onChange={(e) => setTaskProductId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-medium text-xs"
                  >
                    <option value="">-- None (Optional) --</option>
                    {productsList
                      .filter((p) => !taskBrandId || p.brandId === taskBrandId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Color Grading & Video Editing"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Description</label>
                <textarea
                  rows={2}
                  placeholder="Task instructions..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-medium text-xs"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={taskEstimatedHours}
                    onChange={(e) => setTaskEstimatedHours(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-gray-400 font-semibold text-[10px]">Assign Employees (One or Multiple)</label>
                  {assignedStaffIds.length > 0 && (
                    <span className="text-[10px] text-blue-400 font-bold font-mono">
                      {assignedStaffIds.length} Selected
                    </span>
                  )}
                </div>

                {/* Real-time Employee Search Input Box */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search employee by name, role, or designation..."
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-medium"
                  />
                  {staffSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStaffSearchQuery('')}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-36 overflow-y-auto bg-gray-950 border border-gray-700 rounded p-2">
                  {staffUsersList
                    .filter((u) => ['STAFF', 'TECHNICAL_MANAGER', 'SOCIAL_MEDIA_MANAGER', 'MEDIA_MANAGER'].includes(u.role))
                    .filter((u) => {
                      if (!staffSearchQuery.trim()) return true;
                      const q = staffSearchQuery.toLowerCase().trim();
                      const nameMatch = (u.name || '').toLowerCase().includes(q);
                      const roleMatch = (u.role || '').toLowerCase().includes(q);
                      const desigMatch = (u.employeeProfile?.designation || '').toLowerCase().includes(q);
                      return nameMatch || roleMatch || desigMatch;
                    })
                    .map((u) => {
                      const empStatus = u.employeeProfile?.employmentStatus || u.status || 'ACTIVE';
                      const isActive = empStatus === 'ACTIVE' && u.status === 'ACTIVE' && !u.isArchived;

                      return (
                        <label
                          key={u.id}
                          className={`flex items-center gap-2 text-xs p-1 rounded transition-colors ${
                            isActive ? 'text-white cursor-pointer hover:bg-gray-900' : 'text-gray-500 bg-gray-950/60 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!isActive}
                            checked={assignedStaffIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) setAssignedStaffIds([...assignedStaffIds, u.id]);
                              else setAssignedStaffIds(assignedStaffIds.filter((id) => id !== u.id));
                            }}
                            className="w-3.5 h-3.5 accent-blue-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="flex-1 truncate">
                            <strong>{u.name}</strong> <span className="text-gray-400 text-[10px]">({u.role?.replace(/_/g, ' ')})</span>
                            {u.employeeProfile?.designation && <span className="text-gray-500 text-[10px] ml-1">• {u.employeeProfile.designation}</span>}
                            {!isActive && <span className="text-amber-400 font-bold ml-1 font-mono">({empStatus} - Restricted)</span>}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-950/95 -mx-6 -mb-6 p-4 border-t border-gray-800 flex items-center justify-between gap-3 z-20 backdrop-blur-md">
                <span className="text-[11px] text-gray-400 font-mono">
                  <span className="text-emerald-400 font-bold">✓ Ready to Create</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-semibold transition-colors text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {creating ? 'Creating...' : '✓ Create Task'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassignment Recommendations Modal */}
      {selectedTask && (
        <div
          onClick={() => {
            setSelectedTask(null);
            setRecommendations(null);
            setTargetUserIds([]);
          }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4 text-xs shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-400" /> Reassign Task: {selectedTask.taskId}
              </h3>
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setRecommendations(null);
                  setTargetUserIds([]);
                }}
                className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Flowchart: Current Employee -> Over Capacity -> Recommended Employees */}
            <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-red-950/40 border border-red-800/60 rounded-lg text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Current Employee</span>
                  <strong className="text-white text-sm">👤 {recommendations?.currentAssigned?.join(', ') || 'Currently Assigned Staff'}</strong>
                </div>
                <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-800 px-2.5 py-1 rounded-full text-red-300 font-bold text-[10px]">
                  ⚠️ Over Capacity
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-bold py-0.5">
                <span>↓ System Generated Recommendations (No Work Transferred Automatically) ↓</span>
              </div>
            </div>

            <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-2 max-h-72 overflow-y-auto">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                  🤖 Recommended Alternative Employees
                </h4>
                <span className="text-[9px] text-gray-400 font-mono">Media Manager Decision Required</span>
              </div>

              <div className="space-y-2">
                {!recommendations?.recommendations || recommendations.recommendations.length === 0 ? (
                  <p className="text-gray-500 italic p-2 text-center">Loading employee recommendations...</p>
                ) : (
                  recommendations.recommendations.map((rec: any) => (
                    <label
                      key={rec.userId}
                      className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        targetUserIds.includes(rec.userId)
                          ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-600/20'
                          : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="reassignTargetCandidate"
                          checked={targetUserIds.includes(rec.userId)}
                          onChange={() => setTargetUserIds([rec.userId])}
                          className="w-4 h-4 mt-0.5 accent-blue-500 cursor-pointer"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{rec.name}</span>
                            <span className="text-[10px] text-gray-400">({rec.designation})</span>
                            {rec.isAlreadyOnProject && (
                              <span className="px-1.5 py-0.2 bg-purple-950 text-purple-300 border border-purple-800 rounded text-[9px] font-bold">
                                🎬 On Project
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-300 leading-snug">{rec.reason}</p>
                        </div>
                      </div>

                      <div className="text-right space-y-1 font-mono">
                        <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-bold text-[11px] block">
                          {rec.availablePercentage}% Available
                        </span>
                        <span className="text-[9px] text-gray-500 block">{rec.remainingHours}h / {rec.capacityHours}h free</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Optional Reassignment Reason Input */}
            <div className="space-y-1">
              <label className="block text-gray-300 font-semibold text-[11px]">
                Reassignment Reason (Preserved in Permanent Timeline History)
              </label>
              <input
                type="text"
                placeholder="e.g. Ahmed exceeded daily capacity."
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setSelectedTask(null);
                  setRecommendations(null);
                  setTargetUserIds([]);
                  setReassignReason('');
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-semibold transition-colors text-xs"
              >
                Cancel / Close
              </button>
              <button
                type="button"
                onClick={handleExecuteReassign}
                disabled={targetUserIds.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors text-xs shadow-md shadow-blue-600/30"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Employee Daily Capacity Modal */}
      {editingCapacityUser && (
        <div
          onClick={() => setEditingCapacityUser(null)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl w-full max-w-sm p-6 space-y-4 text-xs shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ⚙️ Configure Daily Capacity: {editingCapacityUser.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCapacityUser(null)}
                className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-lg space-y-1">
              <div className="text-gray-300 font-semibold">Configurable Daily Work Capacity</div>
              <div className="text-[11px] text-gray-400">
                Updating daily capacity recalculates capacity status (Overloaded/Normal/Available) and remaining available hours automatically.
              </div>
            </div>

            <form onSubmit={handleSaveCapacity} className="space-y-4">
              <div>
                <label className="block text-gray-300 font-semibold mb-1 text-[11px]">
                  Daily Capacity Hours *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    required
                    value={editCapacityHours}
                    onChange={(e) => setEditCapacityHours(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="font-bold text-gray-400 text-xs">Hours / Day</span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingCapacityUser(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCapacity || !editCapacityHours}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md shadow-blue-600/30 disabled:opacity-50 transition-colors"
                >
                  {savingCapacity ? 'Saving...' : 'Save & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Deliverable Modal */}
      {uploadTask && (
        <div
          onClick={() => setUploadTask(null)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4 text-xs shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                📤 Upload Deliverable: {uploadTask.taskId}
              </h3>
              <button
                type="button"
                onClick={() => setUploadTask(null)}
                className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-amber-300 text-[11px] leading-relaxed">
              ⚠️ <strong>Active Deliverable Rule:</strong> Uploading a new file will set it as the single active deliverable (Version v{(uploadTask.activeDeliverableVersion || 0) + 1}). All previous versions remain saved in the timeline history.
            </div>

            <form onSubmit={handleUploadDeliverable} className="space-y-3">
              <div>
                <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Deliverable File URL or Cloud Link *</label>
                <input
                  type="url"
                  required
                  placeholder="https://cdn.moms.com/deliverables/video_cut_v2.mp4"
                  value={uploadFileUrl}
                  onChange={(e) => setUploadFileUrl(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Original File Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Video_Editing_Final_Export_v2.mp4"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setUploadTask(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDeliverable || !uploadFileUrl.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs shadow-md shadow-cyan-600/30 disabled:opacity-50 transition-colors"
                >
                  {uploadingDeliverable ? 'Uploading...' : 'Upload & Replace Active File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {inspectedTask && (
        <div
          onClick={() => setInspectedTask(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl w-full max-w-3xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto"
          >
            {isInspectedTaskScript ? (
              /* EXACT SCRIPT INSPECT UI (Matching scripts/page.tsx) */
              (() => {
                const currentScriptStatus = activeScript?.status || fullScript?.status || inspectedTask?.script?.status || inspectedTask?.status;
                const isScriptReviewLocked = ['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_MARKETING_APPROVAL', 'PENDING_MARKETING_APPROVAL', 'COMPLETED'].includes(currentScriptStatus);
                const isStaffUser = user?.role === 'STAFF' || user?.role === 'SOCIAL_MEDIA_MANAGER';
                const isScriptEditingLocked = (isScriptReviewLocked && isStaffUser) || isPendingAcceptance;
                return (
                  <>
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {inspectedTask.taskId && (
                      <span className="font-mono text-[10px] text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                        Task: {inspectedTask.taskId}
                      </span>
                    )}
                    {(activeScript?.scriptId || inspectedTask.scriptId) && (
                      <span className="font-mono text-[10px] text-purple-400 font-bold bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                        Script: {activeScript?.scriptId || inspectedTask.scriptId}
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                      🔄 Revisions: {inspectedTask?.revisions?.length || activeScript?.revisionCount || inspectedTask.revisionCount || 0}
                    </span>
                    {canAssignRevision && (
                      <button
                        type="button"
                        onClick={() => setRevisionModalScript(fullScript || inspectedTask?.script || activeScript || inspectedTask)}
                        className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[10px] flex items-center gap-1 shadow transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" /> Request Revision
                      </button>
                    )}
                    {user?.role === 'TECHNICAL_MANAGER' && (
                      <Link
                        href="/approvals"
                        className="px-2.5 py-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold rounded text-[10px] flex items-center gap-1 shadow-md shadow-cyan-500/20 transition-all border border-cyan-400/40"
                        title="Open Technical Manager Approval Session"
                      >
                        <ShieldCheck className="w-3 h-3 text-cyan-200" />
                        <span>Go to Technical Manager Approval Session</span>
                        <ArrowRight className="w-3 h-3 text-cyan-200" />
                      </Link>
                    )}
                  </div>
                  <div className="text-right">
                    <h2 className="text-base font-bold text-white font-mono">{inspectedTask.title || activeScript?.name}</h2>
                    {activeScript?.name && inspectedTask.title && inspectedTask.title !== activeScript.name && (
                      <p className="text-[11px] text-purple-300 font-mono">Script: {activeScript.name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setInspectedTask(null)}
                    className="text-gray-400 hover:text-white font-bold text-lg ml-2"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Task / Revision Acceptance Banner */}
                  {isPendingAcceptance && (
                    <div className="bg-gradient-to-r from-purple-950/90 to-indigo-950/90 border-2 border-purple-500/80 p-4 rounded-xl space-y-3 text-xs shadow-xl animate-pulse">
                      <div className="flex items-center justify-between">
                        <span className="text-purple-200 font-extrabold text-sm flex items-center gap-2">
                          {(inspectedTask.revisions?.length > 0 || (inspectedTask.revisionCount || 0) > 0) ? '🔄 Task Revision Assigned — Acceptance Required' : '⚠️ Task Assigned — Acceptance Required'}
                        </span>
                        <span className="px-2.5 py-0.5 bg-purple-900 text-purple-200 border border-purple-500 rounded font-mono font-bold text-[10px]">
                          {(inspectedTask.revisions?.length > 0 || (inspectedTask.revisionCount || 0) > 0) ? `Revision #${inspectedTask.revisionCount || inspectedTask.revisions?.length || 1}` : 'Pending Acceptance'}
                        </span>
                      </div>
                      
                      {inspectedTask.revisions && inspectedTask.revisions.length > 0 && (
                        <div className="p-3 bg-purple-950/70 border border-purple-800/90 rounded-lg space-y-1 text-purple-100">
                          <div className="flex items-center justify-between text-[10px] text-purple-300 font-mono">
                            <span>Requested by: <strong className="text-white">{inspectedTask.revisions[0].requestedBy?.name || 'Manager'}</strong></span>
                            <span>{new Date(inspectedTask.revisions[0].createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-white font-medium whitespace-pre-wrap">
                            <strong>Revision Instructions:</strong> {inspectedTask.revisions[0].reason}
                          </p>
                        </div>
                      )}

                      <p className="text-purple-200 text-[11px] leading-relaxed">
                        You have been assigned to this script task. Please click <strong>Accept Task Assignment</strong> to unlock storyline editing, file uploads, and review submission.
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => handleAcknowledgeAcceptance(inspectedTask.id)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 text-xs"
                      >
                        <Check className="w-4 h-4" /> Accept Task Assignment &amp; Start Work
                      </button>
                    </div>
                  )}
                  {/* Dedicated Task Description Section */}
                  <div className="bg-gray-950 border border-blue-800/70 p-4 rounded-xl space-y-2.5 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-blue-900/50 pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <h3 className="font-bold text-blue-200 text-xs uppercase tracking-wider">
                          📋 Task Description
                        </h3>
                        {inspectedTask.taskId && (
                          <span className="font-mono text-[10px] text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                            {inspectedTask.taskId}
                          </span>
                        )}
                        <span className="text-[9px] text-blue-500 bg-blue-950/60 px-1.5 py-0.5 rounded font-bold border border-blue-900/60 uppercase tracking-wider">Task</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400">
                        {inspectedTask.dueDate && (
                          <span>Due: <strong className="text-gray-200">{new Date(inspectedTask.dueDate).toLocaleDateString()}</strong></span>
                        )}
                        {inspectedTask.estimatedHours && (
                          <span>Est: <strong className="text-emerald-400">{inspectedTask.estimatedHours}h</strong></span>
                        )}
                      </div>
                    </div>
                    <div>
                      {inspectedTask.title && inspectedTask.title !== activeScript?.name && (
                        <div className="text-xs font-bold text-blue-300 mb-1.5 font-mono">
                          Task: {inspectedTask.title}
                        </div>
                      )}
                      <div className="bg-blue-950/20 border border-blue-900/40 rounded-lg p-3 text-xs text-gray-200 leading-relaxed font-normal whitespace-pre-wrap">
                        {inspectedTask.description?.trim() || 'No specific task description provided.'}
                      </div>
                    </div>
                  </div>
                  {/* Commercial & Script Attributes Summary Card */}
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                      <div>
                        <span className="text-gray-500 text-[10px] uppercase font-bold block">Script ID</span>
                        <strong className="text-blue-400 font-mono text-xs">{activeScript?.scriptId || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] uppercase font-bold block">Script Name</span>
                        <strong className="text-white font-mono text-xs block truncate">{activeScript?.name || inspectedTask.title}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] uppercase font-bold block">Shoot Project</span>
                        <strong className="text-gray-200 text-xs block truncate">{activeScript?.project?.name || inspectedTask.project?.name || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] uppercase font-bold block">Status &amp; Priority</span>
                        <div className="flex items-center gap-1 mt-0.5 font-mono">
                          <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded font-bold text-[10px]">
                            {activeScript?.status || inspectedTask.status}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded font-bold text-[10px]">
                            {activeScript?.priority || inspectedTask.priority}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-gray-900 text-xs">
                      <span className="text-gray-400 text-[11px]">
                        👤 Assigned Staff: <strong className="text-amber-300">
                          {activeScript?.scriptAssignments?.map((a: any) => a.user?.name || a.name).filter(Boolean).join(', ') ||
                            inspectedTask?.assignedEmployees?.map((a: any) => a.user?.name || a.name).filter(Boolean).join(', ') || 'Not Assigned'}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowFullScriptDetailsInTask(!showFullScriptDetailsInTask)}
                        className="px-3 py-1 bg-gray-900 hover:bg-gray-800 text-purple-300 border border-purple-900/60 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all shadow"
                      >
                        <span>{showFullScriptDetailsInTask ? 'Show Less Details ▴' : 'More Details ▾'}</span>
                      </button>
                    </div>

                    {/* Expanded Full Details Grid */}
                    {showFullScriptDetailsInTask && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-800 text-[11px] animate-in fade-in duration-150">
                        <div><span className="text-gray-500 block text-[10px]">Client:</span> <strong className="text-gray-200">{activeScript?.client?.name || inspectedTask.client?.name || 'N/A'}</strong></div>
                        <div><span className="text-gray-500 block text-[10px]">Brand:</span> <strong className="text-purple-400">[{activeScript?.brand?.shortCode || 'BR'}] {activeScript?.brand?.name || 'Brand'}</strong></div>
                        <div><span className="text-gray-500 block text-[10px]">Product:</span> <strong className="text-emerald-400">{activeScript?.product?.name || 'N/A'}</strong></div>
                        <div><span className="text-gray-500 block text-[10px]">Campaign:</span> <strong className="text-indigo-300">{activeScript?.campaign?.name || 'N/A (Optional)'}</strong></div>
                        <div><span className="text-gray-500 block text-[10px]">Language:</span> <strong className="text-purple-300">{activeScript?.language || 'English'}</strong></div>
                        <div><span className="text-gray-500 block text-[10px]">Category / Purpose:</span> <strong className="text-amber-300">{activeScript?.category || 'Social Media'}</strong></div>
                        <div><span className="text-gray-500 block text-[10px]">Objective:</span> <strong className="text-cyan-300">{activeScript?.objective || 'N/A'}</strong></div>
                        <div><span className="text-gray-500 block text-[10px]">Est. Duration:</span> <strong className="text-cyan-300">{scriptEditDuration || activeScript?.estimatedDuration || '30s'}</strong></div>
                        <div><span className="text-gray-500 block text-[10px]">Created By:</span> <strong className="text-gray-200">{activeScript?.createdBy?.name || 'Writer'}</strong></div>
                        <div><span className="text-gray-500 block text-[10px]">Created At:</span> <strong className="text-gray-300">{activeScript?.createdAt ? new Date(activeScript.createdAt).toLocaleDateString() : 'N/A'}</strong></div>
                        <div><span className="text-gray-500 block text-[10px]">Remarks:</span> <strong className="text-amber-300">{scriptEditRemarks || activeScript?.remarks || 'None'}</strong></div>
                        <div><span className="text-gray-500 block text-[10px]">Total Revisions:</span> <strong className="text-amber-300 font-bold">{activeScript?.revisionCount || inspectedTask.revisionCount || 0}</strong></div>
                      </div>
                    )}
                  </div>

                  {/* Active Revision Requested Status Banner */}
                  {(activeScript?.status === 'REVISION_REQUESTED' || activeScript?.status === 'CLIENT_REVISION_REQUESTED' || inspectedTask.status === 'REVISION_REQUESTED' || inspectedTask.status === 'CLIENT_REVISION_REQUESTED') && (
                    <div className="bg-amber-950/70 border border-amber-500 p-4 rounded-xl space-y-2 text-xs shadow-xl animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-300 font-extrabold text-xs flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-amber-400 animate-spin" /> Active Workflow Status: REVISION REQUESTED
                        </span>
                        <span className="px-2.5 py-0.5 bg-amber-600/40 text-amber-200 border border-amber-500/60 rounded font-mono font-bold text-[10px]">
                          Revision #{activeScript?.revisionCount || inspectedTask.revisionCount || 1}
                        </span>
                      </div>
                      <p className="text-zinc-200 leading-relaxed">
                        Reviewer requested changes for this script. The assigned script writer is making requested revisions before re-submitting.
                      </p>
                      {canAssignRevision && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setRevisionModalScript(fullScript || inspectedTask?.script || activeScript || inspectedTask)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Request Another Revision
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Script Workflow Progress Stepper (Matching Script Inspect UI) */}
                  <div className="p-4 bg-gray-950 border border-purple-900/60 rounded-xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <h4 className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                        🚀 Script Workflow Progress
                      </h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-purple-950 text-purple-300 border-purple-800">
                        Current Status: {activeScript?.status || inspectedTask.status || 'IN_PRODUCTION'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between overflow-x-auto py-2 px-1 gap-1">
                      {[
                        { key: 'IN_PRODUCTION', label: '1. Production' },
                        { key: 'IN_PROGRESS', label: '2. In Progress' },
                        { key: 'WAITING_FOR_TECHNICAL_REVIEW', label: '3. Technical Review' },
                        { key: 'WAITING_FOR_MEDIA_REVIEW', label: '4. Media Review' },
                        { key: 'WAITING_FOR_CLIENT_CONFIRMATION', label: '5. Client Confirmation' },
                        { key: 'COMPLETED', label: '6. Completed' },
                      ].map((stage, i) => {
                        const sStatus = activeScript?.status || inspectedTask.status;
                        let currentIdx = 0;
                        if (sStatus === 'COMPLETED' || (scriptProdComp && scriptTechAppr && scriptMediaAppr && scriptClientConf)) currentIdx = 5;
                        else if (sStatus === 'WAITING_FOR_CLIENT_CONFIRMATION' || scriptClientConf) currentIdx = 4;
                        else if (sStatus === 'WAITING_FOR_MEDIA_REVIEW' || sStatus === 'APPROVED' || scriptMediaAppr) currentIdx = 3;
                        else if (sStatus === 'WAITING_FOR_TECHNICAL_REVIEW' || scriptTechAppr) currentIdx = 2;
                        else if (sStatus === 'IN_PROGRESS') currentIdx = 1;
                        else currentIdx = 0;

                        const isCurrent = currentIdx === i;
                        const isPassed = currentIdx >= 0 && i < currentIdx;

                        return (
                          <React.Fragment key={stage.key}>
                            <div className="flex flex-col items-center min-w-[85px] text-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                isCurrent
                                  ? 'bg-purple-500 text-white font-extrabold ring-2 ring-purple-400 animate-pulse shadow-lg shadow-purple-500/50'
                                  : isPassed
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-900 text-gray-500 border border-gray-800'
                              }`}>
                                {isPassed ? '✓' : i + 1}
                              </div>
                              <span className={`text-[10px] mt-1 font-semibold leading-tight ${
                                isCurrent ? 'text-purple-300 font-bold' : isPassed ? 'text-emerald-400' : 'text-gray-500'
                              }`}>
                                {stage.label}
                              </span>
                            </div>

                            {i < 5 && (
                              <div className={`h-0.5 flex-1 min-w-[12px] ${
                                currentIdx >= 0 && i < currentIdx ? 'bg-emerald-500' : 'bg-gray-800'
                              }`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Read-Only Notice for Scripts Under Review */}
                  {isScriptEditingLocked && (
                    <div className="p-3.5 bg-amber-950/60 border border-amber-600/80 rounded-xl text-amber-200 text-xs font-semibold flex items-center gap-2.5 shadow-md">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-bold">🔒 Script Under Review (Read-Only Mode):</span>
                        <p className="text-[11px] text-amber-300/80 font-normal mt-0.5">
                          This script has been submitted for technical/media/marketing review ({currentScriptStatus}). Editing is disabled for assigned staff members until review is finalized or returned for revision.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Script & Task Metrics (Read-Only Synchronized Display) */}
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 space-y-1">
                        <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Estimated Duration</span>
                        <div className="text-xs font-bold text-cyan-300 font-mono">
                          {activeScript?.estimatedDuration || scriptEditDuration || '30s'}
                        </div>
                      </div>
                      <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 space-y-1">
                        <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Current Status</span>
                        <div>
                          <span className="inline-block px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded font-mono font-bold text-[11px]">
                            {(activeScript?.status || scriptEditStatus || inspectedTask.status)?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 space-y-1">
                        <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Priority</span>
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                            (activeScript?.priority || scriptEditPriority || inspectedTask.priority) === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                            (activeScript?.priority || scriptEditPriority || inspectedTask.priority) === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            (activeScript?.priority || scriptEditPriority || inspectedTask.priority) === 'LOW' ? 'bg-zinc-900 text-zinc-300 border border-zinc-700' :
                            'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}>
                            {activeScript?.priority || scriptEditPriority || inspectedTask.priority || 'MEDIUM'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Full Script Storyline & Narration Session */}
                    <div className="p-4 bg-gray-950 border border-purple-900/60 rounded-2xl space-y-3 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400" />
                          <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                            📜 Script Storyline &amp; Scene Narration
                          </h3>
                          <span className="text-[9px] text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded font-bold border border-purple-900/60 uppercase tracking-wider">Script</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(scriptEditDescription || activeScript?.description || '');
                              setScriptCopiedStoryline(true);
                              setTimeout(() => setScriptCopiedStoryline(false), 2000);
                            }}
                            className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800 text-purple-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            {scriptCopiedStoryline ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-purple-400" />}
                            <span>{scriptCopiedStoryline ? 'Copied to Clipboard!' : 'Copy Script Text'}</span>
                          </button>

                          <div className="flex bg-gray-900 border border-gray-800 p-0.5 rounded-lg text-[10px] font-semibold">
                            <button
                              type="button"
                              onClick={() => setScriptStorylineTab('view')}
                              className={`px-2 py-0.5 rounded transition-colors ${scriptStorylineTab === 'view' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                            >
                              👁️ Formatted View
                            </button>
                            <button
                              type="button"
                              onClick={() => setScriptStorylineTab('edit')}
                              className={`px-2 py-0.5 rounded transition-colors ${scriptStorylineTab === 'edit' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                            >
                              ✏️ Edit Script Storyline
                            </button>
                          </div>
                        </div>
                      </div>

                      {scriptStorylineTab === 'view' ? (
                        <div className="bg-gray-900/90 border border-gray-800/80 rounded-xl p-4 max-h-64 overflow-y-auto custom-scrollbar">
                          {scriptEditDescription?.trim() ? (
                            <div className="whitespace-pre-wrap font-sans text-gray-200 text-xs leading-relaxed tracking-wide">
                              {scriptEditDescription}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic text-[11px] text-center py-4">
                              No storyline or scene narration entered for this script yet. Switch to Edit tab to add details.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            rows={6}
                            value={scriptEditDescription}
                            disabled={isScriptEditingLocked}
                            onChange={(e) => setScriptEditDescription(e.target.value)}
                            placeholder="Enter scene narration, voiceover dialogues, shots..."
                            className="w-full bg-gray-900 border border-purple-900/60 text-white p-3 rounded-xl text-xs font-mono focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
                            <span>Tip: Use [Scene X] headers and VO: for voiceover dialogues</span>
                            <div className="flex items-center gap-3">
                              <span>{scriptEditDescription?.length || 0} characters</span>
                              <button
                                type="button"
                                onClick={handleSaveScriptDetailsInTask}
                                disabled={savingScript || isScriptEditingLocked}
                                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                💾 {savingScript ? 'Saving...' : isScriptEditingLocked ? 'Read Only' : 'Save Storyline'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Remarks</label>
                      <input
                        type="text"
                        value={scriptEditRemarks}
                        disabled={isScriptEditingLocked}
                        onChange={(e) => setScriptEditRemarks(e.target.value)}
                        placeholder="Enter operational remarks..."
                        className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Operational Timeline Section */}
                  {(() => {
                    const rawEvents = activeScript?.timeline || activeScript?.taskTimeline || inspectedTask?.timeline || inspectedTask?.taskTimeline || [];
                    const timelineEntries: TimelineEntry[] = rawEvents.map((t: any, idx: number) => ({
                      id: t.id || `st-${idx}`,
                      createdAt: t.createdAt,
                      action: t.event || t.action || 'WORKFLOW_EVENT',
                      user: t.user || t.triggeredBy,
                      description: t.description || t.remarks || t.message,
                      remarks: t.remarks,
                    }));
                    return (
                      <TimelineView
                        entries={timelineEntries}
                        title="Operational Timeline & Audit Trail"
                        order="desc"
                        emptyMessage="No operational timeline events recorded yet."
                      />
                    );
                  })()}

                  {/* Permanent Remarks Section */}
                  <div className="p-4 bg-gray-950 border border-amber-900/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <h4 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-amber-400" /> Remarks History
                      </h4>
                      <span className="text-[10px] text-gray-500 italic">Permanent — assigned employees &amp; managers</span>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {(() => {
                        const remarksList = activeScript?.scriptRemarks || activeScript?.remarksHistory || inspectedTask?.remarksHistory || [];
                        if (remarksList.length === 0) {
                          return <p className="text-gray-500 italic text-[11px]">No remarks yet. Be the first to add one.</p>;
                        }
                        return remarksList.map((r: any, idx: number) => {
                          const date = r.createdAt ? new Date(r.createdAt) : new Date();
                          const userName = r.user?.name || r.name || 'Staff';
                          return (
                            <div key={r.id || idx} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-amber-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                    {userName[0]?.toUpperCase()}
                                  </div>
                                  <span className="text-amber-200 font-semibold text-[11px]">{userName}</span>
                                  <span className="text-gray-500 text-[10px]">·</span>
                                  <span className="text-gray-500 text-[10px] font-mono">
                                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-gray-300 text-[11px] leading-relaxed pl-[26px]">{r.message}</p>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Add New Remark */}
                    <div className="flex items-end gap-2 pt-1 border-t border-gray-800">
                      <textarea
                        value={scriptNewRemarkText}
                        onChange={(e) => setScriptNewRemarkText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddScriptRemarkInTask(); } }}
                        placeholder="Add a remark… (Enter to submit, Shift+Enter for new line)"
                        rows={2}
                        className="flex-1 bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg text-[11px] resize-none focus:border-amber-500 focus:outline-none placeholder-gray-600"
                      />
                      <button
                        onClick={handleAddScriptRemarkInTask}
                        disabled={!scriptNewRemarkText.trim() || scriptAddingRemark}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-[11px] disabled:opacity-40 flex items-center gap-1 h-[52px]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {scriptAddingRemark ? '…' : 'Send'}
                      </button>
                    </div>
                  </div>

                  {/* Deliverables Section */}
                  <div className="p-4 bg-gray-950 border border-violet-900/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <h4 className="font-bold text-violet-300 text-xs flex items-center gap-1.5">
                        🎬 Deliverables
                      </h4>
                      <span className="text-[10px] text-gray-500">{(activeScript?.deliverables || []).length} planned</span>
                    </div>

                    <div className="space-y-2">
                      {(activeScript?.deliverables || []).length === 0 ? (
                        <p className="text-gray-500 italic text-[11px]">No deliverables added yet</p>
                      ) : (
                        (activeScript?.deliverables || []).map((d: any) => {
                          const typeColors: Record<string, string> = {
                            'Reel': 'bg-pink-900/50 text-pink-300 border-pink-800/50',
                            'Advertisement Video': 'bg-blue-900/50 text-blue-300 border-blue-800/50',
                            'Long-form Video': 'bg-indigo-900/50 text-indigo-300 border-indigo-800/50',
                            'Short-form Video': 'bg-cyan-900/50 text-cyan-300 border-cyan-800/50',
                            'Story': 'bg-amber-900/50 text-amber-300 border-amber-800/50',
                            'Teaser': 'bg-red-900/50 text-red-300 border-red-800/50',
                          };
                          const badgeCls = typeColors[d.type] || 'bg-gray-800 text-gray-300 border-gray-700';
                          const statusCls = d.status === 'Done' ? 'text-green-400' : d.status === 'In Progress' ? 'text-yellow-400' : 'text-gray-500';
                          return (
                            <div key={d.id} className="flex items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeCls}`}>{d.type}</span>
                                {d.title && <span className="text-gray-300 text-[11px] font-medium">{d.title}</span>}
                                {d.duration && <span className="text-gray-500 text-[10px] font-mono">⏱ {d.duration}</span>}
                                <span className={`text-[10px] font-semibold ${statusCls}`}>● {d.status}</span>
                              </div>
                              {user?.role === 'MEDIA_MANAGER' && (
                                <button onClick={() => handleDeleteScriptDeliverableInTask(d.id)} className="text-red-400 hover:text-red-300 shrink-0">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {user?.role === 'MEDIA_MANAGER' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-800">
                        <select
                          value={scriptNewDelivType}
                          onChange={(e) => setScriptNewDelivType(e.target.value)}
                          className="bg-gray-900 border border-gray-700 text-white px-2.5 py-2 rounded-lg text-[11px] focus:border-violet-500 focus:outline-none"
                        >
                          <option>Reel</option>
                          <option>Advertisement Video</option>
                          <option>Long-form Video</option>
                          <option>Short-form Video</option>
                          <option>Story</option>
                          <option>Teaser</option>
                          <option>Custom</option>
                        </select>
                        <input
                          type="text"
                          value={scriptNewDelivTitle}
                          onChange={(e) => setScriptNewDelivTitle(e.target.value)}
                          placeholder="Optional title"
                          className="flex-1 min-w-[100px] bg-gray-900 border border-gray-700 text-white px-2.5 py-2 rounded-lg text-[11px] focus:border-violet-500 focus:outline-none placeholder-gray-600"
                        />
                        <input
                          type="text"
                          value={scriptNewDelivDuration}
                          onChange={(e) => setScriptNewDelivDuration(e.target.value)}
                          placeholder="Duration (e.g. 30s)"
                          className="w-28 bg-gray-900 border border-gray-700 text-white px-2.5 py-2 rounded-lg text-[11px] focus:border-violet-500 focus:outline-none placeholder-gray-600"
                        />
                        <button
                          onClick={handleAddScriptDeliverableInTask}
                          className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg text-[11px] flex items-center gap-1"
                        >
                          + Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Linked Script Attachments & Production Files Section (Link-based) */}
                  <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-4 pt-3">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-400" /> Linked Script Attachments &amp; Production Files
                      </h4>
                      <span className="text-[10px] text-purple-400 font-mono font-bold">
                        🔗 Add links by name under each category
                      </span>
                    </div>

                    {/* Add Link Control Card */}
                    <div className="p-3.5 bg-gray-900 border border-purple-900/60 rounded-xl space-y-2.5 shadow-md">
                      <span className="text-purple-300 font-bold text-xs block">🔗 Add Deliverable Output Link:</span>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <select
                          value={selectedScriptAttachmentCategory}
                          disabled={isScriptEditingLocked}
                          onChange={(e) => setSelectedScriptAttachmentCategory(e.target.value)}
                          className="bg-gray-950 border border-purple-800 text-white px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-purple-500 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="SCRIPT_DOCUMENT">📄 1. Script Document</option>
                          <option value="REFERENCE_IMAGE">🖼️ 2. Reference Images</option>
                          <option value="REFERENCE_VIDEO">🎬 3. Reference Videos</option>
                          <option value="AUDIO_REFERENCE">🎵 4. Audio References</option>
                          <option value="BRAND_GUIDELINES">🎨 5. Brand Guidelines</option>
                          <option value="PRODUCT_INFORMATION">📦 6. Product Information</option>
                          <option value="SUPPORTING_DOCUMENT">📁 7. Supporting Documents</option>
                        </select>
                        <input
                          type="text"
                          value={scriptNewLinkName}
                          disabled={isScriptEditingLocked}
                          onChange={(e) => setScriptNewLinkName(e.target.value)}
                          placeholder="Link name (e.g. Final Script v3)"
                          className="flex-1 min-w-[150px] bg-gray-950 border border-gray-700 text-white px-3 py-2 rounded-lg text-xs focus:border-purple-500 focus:outline-none placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <input
                          type="url"
                          value={scriptNewLinkUrl}
                          disabled={isScriptEditingLocked}
                          onChange={(e) => setScriptNewLinkUrl(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          className="flex-1 min-w-[180px] bg-gray-950 border border-gray-700 text-white px-3 py-2 rounded-lg text-xs focus:border-purple-500 focus:outline-none placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                          disabled={isScriptEditingLocked || scriptAddingLink || !scriptNewLinkName.trim() || !scriptNewLinkUrl.trim()}
                          onClick={handleAddScriptAttachmentLink}
                          className="px-4 py-2 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-all bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {scriptAddingLink ? 'Adding…' : isScriptEditingLocked ? '🔒 Locked' : '+ Add Link'}
                        </button>
                      </div>
                    </div>

                    {/* All 7 Categories Link Display */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                      {[
                        { key: 'SCRIPT_DOCUMENT', label: '📄 1. Script Document', color: 'text-blue-300' },
                        { key: 'REFERENCE_IMAGE', label: '🖼️ 2. Reference Images', color: 'text-purple-300' },
                        { key: 'REFERENCE_VIDEO', label: '🎬 3. Reference Videos', color: 'text-emerald-300' },
                        { key: 'AUDIO_REFERENCE', label: '🎵 4. Audio References', color: 'text-cyan-300' },
                        { key: 'BRAND_GUIDELINES', label: '🎨 5. Brand Guidelines', color: 'text-amber-300' },
                        { key: 'PRODUCT_INFORMATION', label: '📦 6. Product Information', color: 'text-indigo-300' },
                        { key: 'SUPPORTING_DOCUMENT', label: '📁 7. Supporting Documents', color: 'text-gray-300' },
                      ].map((cat) => {
                        const activeScriptData = fullScript || activeScript;
                        const catLinks = (activeScriptData?.attachmentLinks || []).filter(
                          (l: any) => l.attachmentCategory === cat.key
                        );
                        return (
                          <div key={cat.key} className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className={`font-bold ${cat.color}`}>{cat.label}</span>
                              <span className="text-[10px] text-gray-400">({catLinks.length})</span>
                            </div>
                            {catLinks.length > 0 ? (
                              catLinks.map((l: any) => (
                                <div key={l.id} className="flex items-center justify-between gap-1 bg-gray-950 p-1.5 rounded border border-gray-800 group">
                                  <a
                                    href={l.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-300 hover:text-purple-100 font-mono text-[10px] truncate underline underline-offset-2 flex-1"
                                    title={l.url}
                                  >
                                    🔗 {l.name}
                                  </a>
                                  {!isScriptEditingLocked && (
                                    <button
                                      onClick={() => handleDeleteScriptAttachmentLink(l.id)}
                                      className="text-red-500 hover:text-red-300 text-[10px] font-bold ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                      title="Remove link"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-500 italic text-[10px]">No links added</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>


                  {/* Technical Review Rejected — Revision Required Status Card */}
                  {(activeScript?.status === 'REVISION_REQUESTED' || (Boolean(activeScript?.rejectionReason) && !activeScript?.technicalReviewApproved && ['IN_PRODUCTION', 'IN_PROGRESS', 'ASSIGNED', 'DRAFT', 'READY'].includes(activeScript?.status))) && (
                    <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-xl space-y-2.5 text-red-200 shadow-xl">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs flex items-center gap-2 text-red-300">
                          ❌ Technical Review Rejected — Revision Required
                        </span>
                        <span className="text-[10px] bg-red-900 text-red-100 border border-red-700 px-2 py-0.5 rounded font-mono font-bold">
                          Status: {activeScript?.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-red-200 font-semibold">
                        The Technical Manager has rejected this script. Please review the rejection remarks, make the required changes, and resubmit the script for Technical Manager approval.
                      </p>
                      <div className="p-3 bg-red-900/40 border border-red-800/60 rounded-lg text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-red-300 block">💬 Technical Manager Rejection Remarks:</span>
                        <p className="text-white font-medium whitespace-pre-wrap">
                          {activeScript?.rejectionReason || activeScript?.remarks || 'No specific rejection reason supplied. Please update storyline or attachments and resubmit.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ══════════════════════════════════════════════════════
                       TECHNICAL APPROVAL REQUEST SUBMISSION SESSION (IN TASK INSPECTOR)
                    ══════════════════════════════════════════════════════ */}
                  <div className="p-4 bg-purple-950/40 border border-purple-800/70 rounded-xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-purple-900/60 pb-2">
                      <h4 className="font-extrabold text-purple-300 text-xs flex items-center gap-2">
                        <Send className="w-4 h-4 text-purple-400" /> 🚀 Technical Approval Request Submission Session
                      </h4>
                      <span className="text-[10px] bg-purple-950 text-purple-200 border border-purple-700 px-2 py-0.5 rounded font-mono font-bold">
                        Script Status: {activeScript?.status}
                      </span>
                    </div>

                    {activeScript?.status === 'WAITING_FOR_TECHNICAL_REVIEW' ? (
                      <div className="p-3 bg-blue-950/60 border border-blue-700/80 rounded-lg space-y-2 text-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs flex items-center gap-1.5 text-blue-300">
                            ⏳ Technical Approval Request Submitted (Round #{activeScript?.technicalReviewRound || 1})
                          </span>
                          <span className="text-[10px] bg-blue-900 text-blue-100 px-2 py-0.5 rounded font-mono font-bold">
                            Under Technical Review
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-200/90 font-normal">
                          This script task has been submitted and is currently waiting for Technical Manager review.
                        </p>
                      </div>
                    ) : (activeScript?.status === 'WAITING_FOR_MEDIA_REVIEW' || activeScript?.status === 'WAITING_FOR_MARKETING_APPROVAL' || activeScript?.status === 'APPROVED' || activeScript?.status === 'COMPLETED') ? (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg space-y-1 text-emerald-200">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-300">
                          ✅ Technical Approval Completed
                        </span>
                        <p className="text-[11px] text-emerald-300/80 font-normal">
                          This script task has passed Level 1 Technical Review and is advancing through the subsequent manager approval stages.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-[11px] text-gray-300 leading-relaxed">
                          {activeScript?.technicalReviewRound > 0 || activeScript?.rejectionReason || ['REVISION_REQUESTED', 'CHANGES_REQUESTED'].includes(activeScript?.status)
                            ? `Revisions were requested. Edit the script storyline or attachments above, then click below to resubmit for Technical Manager Approval (Round #${(activeScript?.technicalReviewRound || 0) + 1}).`
                            : 'Once storyline narration and reference files are complete, submit this script task to initiate Level 1: Technical Manager Review & Approval.'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          {activeScript?.status !== 'IN_PROGRESS' && (
                            <button
                              type="button"
                              onClick={handleUpdateScriptStatusToInProgressInTask}
                              disabled={savingScript}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs"
                            >
                              ▶️ Update Status to IN PROGRESS
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleSubmitTechnicalReviewInTask}
                            disabled={savingScript}
                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-lg shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 text-xs"
                          >
                            {activeScript?.technicalReviewRound > 0 || activeScript?.rejectionReason || ['REVISION_REQUESTED', 'CHANGES_REQUESTED'].includes(activeScript?.status)
                              ? `🔄 Submit Revised Script for Technical Approval (Round #${(activeScript?.technicalReviewRound || 0) + 1})`
                              : '🚀 Submit Script for Technical Review'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ══════════════════════════════════════════════════════
                       TECHNICAL REVIEW RESULTS LIST (IN TASK INSPECTOR)
                    ══════════════════════════════════════════════════════ */}
                  <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                      <h4 className="font-extrabold text-xs text-gray-200 uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-400" /> 📋 Technical Review Results &amp; Decision History
                      </h4>
                      <span className="text-[10px] text-blue-400 font-mono font-bold">
                        Level 1 Technical Compliance Log
                      </span>
                    </div>

                    {(() => {
                      const techReviews = (fullScript?.approvals || activeScript?.approvals || []).filter(
                        (a: any) => (a.stage === 'TECHNICAL_REVIEW' || a.approvalType === 'TECHNICAL_REVIEW') && (a.status === 'APPROVED' || a.status === 'REJECTED'),
                      );

                      const sorted = [...techReviews].sort((a: any, b: any) => {
                        if ((b.round || 0) !== (a.round || 0)) return (b.round || 0) - (a.round || 0);
                        return new Date(b.reviewedAt || b.createdAt).getTime() - new Date(a.reviewedAt || a.createdAt).getTime();
                      });

                      if (sorted.length === 0 && !activeScript?.rejectionReason) {
                        return (
                          <div className="p-6 text-center bg-gray-900/60 border border-gray-800/80 rounded-xl space-y-1.5">
                            <ShieldCheck className="w-8 h-8 text-gray-600 mx-auto" />
                            <p className="text-xs font-semibold text-gray-300">No Technical Review Decisions Recorded Yet</p>
                            <p className="text-[11px] text-gray-500">
                              This script task has not completed any Technical Manager review rounds. Submit for Technical Approval above to begin Level 1 review.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {sorted.length > 0 ? (
                            sorted.map((rev: any, idx: number) => {
                              const isApproved = rev.status === 'APPROVED';
                              const roundNum = rev.round || sorted.length - idx;
                              const reviewerName = rev.reviewer?.name || rev.requestedBy?.name || 'Technical Manager';
                              const reviewerRole = (rev.reviewer?.role || 'TECHNICAL_MANAGER').replace(/_/g, ' ');
                              const dateStr = rev.reviewedAt
                                ? new Date(rev.reviewedAt).toLocaleString()
                                : rev.createdAt
                                ? new Date(rev.createdAt).toLocaleString()
                                : '—';
                              const remarksText = rev.remarks || (isApproved ? 'Technical review requirements verified and approved.' : activeScript?.rejectionReason || 'No detailed reason supplied.');

                              return (
                                <div
                                  key={rev.id || idx}
                                  className={`p-4 rounded-xl border-2 space-y-3 shadow-md transition-all ${
                                    isApproved
                                      ? 'bg-emerald-950/25 border-emerald-600/60'
                                      : 'bg-red-950/25 border-red-600/60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2.5 py-0.5 text-[10px] font-mono font-extrabold rounded border uppercase ${
                                        isApproved
                                          ? 'bg-emerald-900/70 border-emerald-600 text-emerald-200'
                                          : 'bg-red-900/70 border-red-600 text-red-200'
                                      }`}>
                                        {isApproved ? '✅ ACCEPTED WITH REASON' : '❌ REJECTED WITH REASON'}
                                      </span>
                                      <span className="font-bold text-xs text-white font-mono">
                                        Technical Review — Round #{roundNum}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-mono">{dateStr}</span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                                    <div>
                                      <span className="text-gray-500 text-[10px] uppercase font-bold block">Reviewer</span>
                                      <strong className="text-white">{reviewerName}</strong>
                                      <span className="text-[10px] text-gray-400 block font-mono">({reviewerRole})</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 text-[10px] uppercase font-bold block">Decision Outcome</span>
                                      <strong className={isApproved ? 'text-emerald-400 font-extrabold' : 'text-red-400 font-extrabold'}>
                                        {isApproved ? 'ACCEPTED / APPROVED' : 'REJECTED — REVISION REQUIRED'}
                                      </strong>
                                    </div>
                                    {!isApproved && rev.returnedStatus && (
                                      <div>
                                        <span className="text-gray-500 text-[10px] uppercase font-bold block">Returned To Status</span>
                                        <span className="text-amber-300 font-mono font-bold text-[10px] bg-amber-950 border border-amber-800 px-2 py-0.5 rounded inline-block">
                                          {rev.returnedStatus}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className={`p-3 rounded-lg border text-xs space-y-1 ${
                                    isApproved
                                      ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-200'
                                      : 'bg-red-900/30 border-red-700/50 text-red-200'
                                  }`}>
                                    <span className="text-[10px] uppercase font-bold block flex items-center gap-1 tracking-wider">
                                      {isApproved ? '💬 Approval Reason / Notes:' : '💬 Rejection Reason / Revision Instructions:'}
                                    </span>
                                    <p className="text-white font-medium text-[11px] whitespace-pre-wrap leading-relaxed">
                                      {remarksText}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 rounded-xl border-2 bg-red-950/25 border-red-600/60 space-y-3">
                              <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                                <span className="px-2.5 py-0.5 text-[10px] font-mono font-extrabold rounded border uppercase bg-red-900/70 border-red-600 text-red-200">
                                  ❌ REJECTED WITH REASON
                                </span>
                              </div>
                              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg space-y-1">
                                <span className="text-[10px] uppercase font-bold text-red-300 block">💬 Rejection Reason:</span>
                                <p className="text-white font-medium text-[11px] whitespace-pre-wrap">
                                  {activeScript?.rejectionReason || activeScript?.remarks || 'Script task rejected during Technical Review. Revisions required.'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Sequential Multi-Level Approval Chain Controls */}
                  <div className="space-y-3">
                    {/* Step 2: Technical Manager Review Action */}
                    {activeScript?.status === 'WAITING_FOR_TECHNICAL_REVIEW' && (
                      (user?.role === 'TECHNICAL_MANAGER' || user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') ? (
                        <div className="p-4 bg-blue-950/50 border-2 border-blue-600/80 rounded-xl space-y-3 shadow-2xl animate-in fade-in duration-200">
                          <div className="flex items-center justify-between border-b border-blue-800/60 pb-2">
                            <h4 className="font-extrabold text-blue-300 text-xs flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-blue-400" /> Level 1: Technical Manager Review Decision Controls
                            </h4>
                            <span className="text-[10px] bg-blue-900 text-blue-200 border border-blue-700 px-2.5 py-0.5 rounded font-mono font-bold">
                              Status: WAITING_FOR_TECHNICAL_REVIEW
                            </span>
                          </div>
                          <p className="text-[11px] text-blue-200/90 leading-relaxed font-normal">
                            This script task has been submitted for Technical Manager approval. Inspect storyline narration and attached reference deliverables, then approve or reject with revision remarks.
                          </p>
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const note = prompt('Optional: Enter approval reason / notes for technical compliance:');
                                handleReviewTechnicalInTask('APPROVE', note || 'Technical Review Approved');
                              }}
                              disabled={savingScript}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg shadow-lg transition-all flex items-center gap-2 text-xs"
                            >
                              <Check className="w-4 h-4" /> Accept &amp; Approve Technical Review
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const comment = prompt('Rejection reason is mandatory. Enter rejection reason for script revision:');
                                if (comment && comment.trim()) {
                                  handleReviewTechnicalInTask('REJECT', comment.trim());
                                } else if (comment !== null) {
                                  alert('Rejection reason is mandatory.');
                                }
                              }}
                              disabled={savingScript}
                              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-lg shadow-lg transition-all flex items-center gap-2 text-xs"
                            >
                              <RotateCcw className="w-4 h-4" /> Reject Technical Review
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-blue-950/30 border border-blue-800/60 rounded-xl flex items-center justify-between shadow-md">
                          <span className="text-blue-300 font-semibold text-xs flex items-center gap-2">
                            ⏳ Waiting for Technical Review
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Technical Manager Authority Required</span>
                        </div>
                      )
                    )}

                    {/* Step 3: Media Manager Review Action */}
                    {activeScript?.status === 'WAITING_FOR_MEDIA_REVIEW' && (
                      (user?.role === 'MEDIA_MANAGER' || user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') ? (
                        <div className="p-4 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-3 shadow-lg">
                          <div className="flex items-center justify-between border-b border-indigo-800/60 pb-2">
                            <h4 className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                              🎬 Level 2: Media Manager Review Session
                            </h4>
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-mono font-bold">
                              Status: WAITING_FOR_MEDIA_REVIEW
                            </span>
                          </div>
                          <p className="text-[11px] text-indigo-200/90 leading-relaxed font-normal">
                            Technical review approved. Review creative storyline &amp; deliverables for Media Manager sign-off.
                          </p>
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <button
                              type="button"
                              onClick={() => handleReviewMediaInTask('APPROVE')}
                              disabled={savingScript}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs"
                            >
                              <Check className="w-4 h-4" /> Approve Script
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const comment = prompt('Rejection reason is mandatory. Enter rejection reason:');
                                if (comment && comment.trim()) {
                                  handleReviewMediaInTask('REJECT', comment.trim());
                                } else if (comment !== null) {
                                  alert('Rejection reason is mandatory.');
                                }
                              }}
                              disabled={savingScript}
                              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs"
                            >
                              <RotateCcw className="w-4 h-4" /> Reject Script
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-indigo-950/20 border border-indigo-800/40 rounded-xl flex items-center justify-between">
                          <span className="text-indigo-300 font-semibold text-xs flex items-center gap-2">
                            ⏳ Technical Review Approved — Waiting for Media Review
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Media Manager Review</span>
                        </div>
                      )
                    )}

                    {/* Step 4: Marketing Manager Review Action */}
                    {(activeScript?.status === 'WAITING_FOR_MARKETING_APPROVAL' || activeScript?.status === 'PENDING_MARKETING_APPROVAL') && (
                      (user?.role === 'MARKETING_MANAGER' || user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') ? (
                        <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-3 shadow-lg">
                          <div className="flex items-center justify-between border-b border-amber-800/60 pb-2">
                            <h4 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                              🏆 Level 3: Marketing Manager Approval Session
                            </h4>
                            <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-mono font-bold">
                              Status: Waiting for Marketing Manager Approval
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <button
                              type="button"
                              onClick={() => handleApproveScriptInTask('APPROVE')}
                              disabled={savingScript}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs"
                            >
                              <Check className="w-4 h-4" /> Approve Script
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const comment = prompt('Enter revisions requested:');
                                if (comment && comment.trim()) {
                                  handleApproveScriptInTask('REQUEST_CHANGES', comment.trim());
                                }
                              }}
                              disabled={savingScript}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs"
                            >
                              <RotateCcw className="w-4 h-4" /> Request Revisions
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl flex items-center justify-between">
                          <span className="text-amber-300 font-semibold text-xs flex items-center gap-2">
                            ⏳ Media Manager Approved — Waiting for Marketing Manager Approval
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">Marketing Approval</span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                    <button type="button" onClick={() => setInspectedTask(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg">Close</button>
                    <button type="button" onClick={handleSaveScriptDetailsInTask} disabled={savingScript || isScriptEditingLocked} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed">{savingScript ? 'Saving...' : isScriptEditingLocked ? 'Read Only' : 'Save Changes'}</button>
                  </div>
                </div>
              </>
            );
          })()
        ) : (
              /* STANDARD DIRECT / GENERAL TASK INSPECTOR UI */
              <>
                <div className="flex justify-between items-start border-b border-border pb-3">
                  <div>
                    <span className="font-mono text-blue-400 font-bold text-xs block">Task ID: {inspectedTask.taskId}</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{inspectedTask.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {Boolean(inspectedTask.revisionCount || inspectedTask.revisions?.length) && (
                        <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                          🔄 Revisions: {inspectedTask.revisions?.length || inspectedTask.revisionCount || 0}
                        </span>
                      )}
                      {canAssignRevision && (
                        <button
                          type="button"
                          onClick={() => setRevisionModalTask(inspectedTask)}
                          className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[10px] flex items-center gap-1 shadow transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Request Revision
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.role === 'TECHNICAL_MANAGER' && (
                      <Link
                        href="/approvals"
                        className="px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all border border-cyan-400/40"
                        title="Open Technical Manager Approval Session"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-200" />
                        <span>Go to Technical Manager Approval Session</span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-200" />
                      </Link>
                    )}
                    <button
                      onClick={() => setInspectedTask(null)}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-bold text-xs"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                {/* Linked Parent Event Banner for Separate Revision Task */}
                {isTaskRevision(inspectedTask) && (
                  <div className="bg-amber-950/80 border-2 border-amber-500/80 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs shadow-lg animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-amber-600/40 text-amber-200 border border-amber-500 rounded-full font-mono font-extrabold text-[10px] flex items-center gap-1 animate-pulse">
                        🔄 ON REVISION {inspectedTask.revisionCount ? `#${inspectedTask.revisionCount}` : (inspectedTask.revisions?.length ? `#${inspectedTask.revisions.length}` : '')}
                      </span>
                      <span className="text-zinc-200 text-xs font-semibold">
                        Parent Entity:{' '}
                        <strong className="text-amber-300 font-bold">
                          {inspectedTask.script?.name || inspectedTask.graphicRequirement?.name || inspectedTask.project?.name || inspectedTask.client?.name || 'Production Item'}
                        </strong>
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-amber-900/60 text-amber-300 border border-amber-700/80 rounded font-mono text-[10px] font-bold">
                      Work In-Place (No Duplication)
                    </span>
                  </div>
                )}

                {/* Pending Task Acceptance Banner */}
                {isPendingAcceptance && (
                  <div className="bg-gradient-to-r from-purple-950/90 to-indigo-950/90 border-2 border-purple-500/80 p-4 rounded-xl space-y-3 text-xs shadow-xl animate-pulse">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-200 font-extrabold text-sm flex items-center gap-2">
                        {(inspectedTask.revisions?.length > 0 || (inspectedTask.revisionCount || 0) > 0) ? '🔄 Task Revision Assigned — Acceptance Required' : '⚠️ Task Assigned — Acceptance Required'}
                      </span>
                      <span className="px-2.5 py-0.5 bg-purple-900 text-purple-200 border border-purple-500 rounded font-mono font-bold text-[10px]">
                        {(inspectedTask.revisions?.length > 0 || (inspectedTask.revisionCount || 0) > 0) ? `Revision #${inspectedTask.revisionCount || inspectedTask.revisions?.length || 1}` : 'Pending Acceptance'}
                      </span>
                    </div>
                    
                    {inspectedTask.revisions && inspectedTask.revisions.length > 0 && (
                      <div className="p-3 bg-purple-950/70 border border-purple-800/90 rounded-lg space-y-1 text-purple-100">
                        <div className="flex items-center justify-between text-[10px] text-purple-300 font-mono">
                          <span>Requested by: <strong className="text-white">{inspectedTask.revisions[0].requestedBy?.name || 'Manager'}</strong></span>
                          <span>{new Date(inspectedTask.revisions[0].createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-white font-medium whitespace-pre-wrap">
                          <strong>Revision Instructions:</strong> {inspectedTask.revisions[0].reason}
                        </p>
                      </div>
                    )}

                    <p className="text-purple-200 text-[11px] leading-relaxed">
                      You are assigned to this task. Please click <strong>Accept Task Assignment</strong> below to unlock work progress updates, deliverable uploads, and review actions.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAcknowledgeAcceptance(inspectedTask.id)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 text-xs"
                    >
                      <Check className="w-4 h-4" /> Accept Task Assignment Now
                    </button>
                  </div>
                )}

                {/* Revision History & Previous Cycles */}
                {inspectedTask.revisions && inspectedTask.revisions.length > 0 && (
                  <div className="p-4 bg-gray-950 border border-amber-900/60 rounded-xl space-y-3 shadow-md">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <h4 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Revision History &amp; Cycles ({inspectedTask.revisions.length})
                      </h4>
                      <span className="text-[10px] font-mono text-gray-400">Total Cycles Recorded</span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {inspectedTask.revisions.map((rev: any) => (
                        <div key={rev.id} className="p-3 bg-gray-900/90 border border-gray-800 rounded-lg space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-300 font-mono text-[11px]">
                              Revision #{rev.revisionNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                              rev.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                              rev.status === 'IN_PROGRESS' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                              'bg-amber-950 text-amber-300 border-amber-800'
                            }`}>
                              {rev.status}
                            </span>
                          </div>

                          <p className="text-gray-200 text-xs leading-relaxed font-medium">
                            {rev.reason}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-400 border-t border-gray-800/60 pt-1.5 font-mono">
                            <span>Requested by: <strong className="text-gray-300">{rev.requestedBy?.name || 'Manager'}</strong></span>
                            {rev.assignedTo && <span>Assigned to: <strong className="text-purple-300">{rev.assignedTo?.name}</strong></span>}
                            <span>{new Date(rev.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Task Description */}
                  <div className="bg-gray-900 border border-gray-800 p-3.5 rounded-xl space-y-2">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Task Description</span>
                    <p className="text-gray-200 text-xs leading-relaxed font-normal">{inspectedTask.description || 'No description provided.'}</p>
                  </div>

                  {/* Metrics Summary Row */}
                  <div className="bg-gray-900 border border-gray-800 p-3.5 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">Priority</span>
                        <strong className={`text-xs px-2 py-0.5 rounded inline-block mt-0.5 ${
                          inspectedTask.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-800' :
                          inspectedTask.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-800' : 'bg-blue-500/20 text-blue-300 border border-blue-800'
                        }`}>{inspectedTask.priority}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">Due Date</span>
                        <strong className="text-gray-200 text-xs mt-0.5 block">{inspectedTask.dueDate ? new Date(inspectedTask.dueDate).toLocaleDateString() : 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">Estimated Hours</span>
                        <strong className="text-emerald-400 text-xs mt-0.5 block">{inspectedTask.estimatedHours || 0}h</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">Synchronized Status</span>
                        <strong className="text-purple-300 text-xs mt-0.5 block">{inspectedTask.status?.replace(/_/g, ' ')}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Remarks & Logs */}
                  <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2.5">
                    <h4 className="font-bold text-gray-300 text-xs uppercase tracking-wider">💬 Operational Remarks &amp; Work Logs</h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {(inspectedTask?.remarksHistory || []).map((r: any, idx: number) => (
                        <div key={r.id || idx} className="p-2 bg-gray-900 border border-gray-800 rounded text-[11px]">
                          <div className="flex justify-between text-gray-400 font-mono text-[9px] mb-0.5">
                            <span>{r.user?.name || r.name || 'Staff'}</span>
                            <span>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                          </div>
                          <p className="text-gray-200">{r.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comprehensive Task Timeline & Updations History */}
                  {(() => {
                    const rawEvents = inspectedTask?.timeline || inspectedTask?.taskTimeline || [];
                    const timelineEntries: TimelineEntry[] = rawEvents.map((t: any, idx: number) => ({
                      id: t.id || `tt-${idx}`,
                      createdAt: t.createdAt,
                      action: t.event || t.action || 'TASK_UPDATED',
                      user: t.user || t.triggeredBy,
                      description: t.description || t.remarks || t.message,
                      remarks: t.remarks,
                    }));

                    return (
                      <TimelineView
                        entries={timelineEntries}
                        title="Task Activity Timeline & Updations"
                        order="desc"
                        emptyMessage="No timeline updations recorded yet for this task."
                      />
                    );
                  })()}

                  {/* Technical Review Submission Action */}
                  {!['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'PENDING_MARKETING_APPROVAL', 'APPROVED', 'COMPLETED'].includes(inspectedTask.status) && !isPendingAcceptance && (
                    <div className="p-4 bg-purple-950/40 border border-purple-800/60 rounded-xl space-y-2.5 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                          🚀 Submit for Technical Review
                        </span>
                        <span className="text-[10px] bg-purple-950 text-purple-200 border border-purple-700 px-2 py-0.5 rounded font-mono font-bold">
                          Status: {inspectedTask.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300">
                        Submit this task for Technical Review &amp; Approval to begin the manager review process.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRequestTechnicalReview(inspectedTask.id)}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center gap-2 text-xs"
                      >
                        ⚡ Submit Task for Technical Review
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end pt-3 border-t border-border">
                    <button
                      onClick={() => setInspectedTask(null)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold"
                    >
                      Close Inspector
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Request Revision Form Modal */}
      {revisionModalScript && (
        <RequestRevisionModal
          isOpen={Boolean(revisionModalScript)}
          onClose={() => setRevisionModalScript(null)}
          onSuccess={() => {
            loadData();
            if (fullScript?.id === revisionModalScript.id) {
              fetchApi(`/scripts/${fullScript.id}`).then(setFullScript).catch(() => null);
            }
          }}
          entityType="SCRIPT"
          entityId={revisionModalScript.id || revisionModalScript.scriptId}
          entityTitle={revisionModalScript.name || revisionModalScript.title || 'Script'}
          originalAssigneeId={revisionModalScript.assignedUserId || revisionModalScript.createdById}
          originalAssigneeName={revisionModalScript.assignedUser?.name || revisionModalScript.createdBy?.name}
        />
      )}

      {/* Dedicated Task Progress & Status Update Modal */}
      {updatingTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono text-xs font-bold">
                  {updatingTask.taskId}
                </span>
                <h3 className="font-bold text-white text-base">Update Task Status &amp; Progress</h3>
              </div>
              <button
                onClick={() => setUpdatingTask(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTaskUpdate} className="space-y-4 text-xs">
              {/* Task Title preview */}
              <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-800 space-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Task Title</span>
                <p className="font-bold text-white text-sm">{updatingTask.title}</p>
                {updatingTask.description && (
                  <p className="text-gray-400 text-xs mt-0.5">{updatingTask.description}</p>
                )}
              </div>

              {/* Status Select */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-200 block text-xs">New Task Status:</label>
                  {user?.role === 'STAFF' && (
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      Staff Manual Control: In Progress / On Hold
                    </span>
                  )}
                </div>

                <select
                  value={editStatus}
                  onChange={(e) => {
                    const newSt = e.target.value;
                    setEditStatus(newSt);
                    if (newSt === 'COMPLETED') setEditProgress(100);
                  }}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
                >
                  {!['IN_PROGRESS', 'WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_REVIEW', 'COMPLETED', 'CANCELLED'].includes(updatingTask?.status?.toUpperCase()) && (
                    <option value="IN_PROGRESS">In Progress</option>
                  )}
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  {user?.role !== 'STAFF' && <option value="CANCELLED">Cancelled</option>}
                </select>

                {user?.role === 'STAFF' && (
                  <p className="text-[10px] text-gray-400 leading-relaxed bg-gray-900/60 p-2 rounded border border-gray-800">
                    💡 <strong>Automated Transitions:</strong> Other statuses (Accepted, Waiting for Review, Completed, Cancelled) update automatically based on actions (accepting task, uploading deliverable, manager review).
                  </p>
                )}
              </div>

              {/* Progress Percentage */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-gray-200 block text-xs">Completion Progress:</label>
                  <span className="font-mono font-bold text-amber-400 text-sm">{editProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editProgress}
                  onChange={(e) => setEditProgress(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>0% (Not Started)</span>
                  <span>50% (Halfway)</span>
                  <span>100% (Completed)</span>
                </div>
              </div>

              {/* Status Update Note / Remark */}
              <div className="space-y-1.5">
                <label className="font-bold text-gray-200 block text-xs">Status Remark / Log Note (Optional):</label>
                <textarea
                  rows={2}
                  placeholder="Explain status change, work progress, or blocking issues for audit trail..."
                  value={editRemark}
                  onChange={(e) => setEditRemark(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setUpdatingTask(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTaskUpdate}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-amber-600/30"
                >
                  {savingTaskUpdate ? 'Saving Update...' : '✓ Save Task Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Employee Workload Details Inspector Modal */}
      {selectedWorkDetailsEmp && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-3xl space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedWorkDetailsEmp.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                  alt={selectedWorkDetailsEmp.name}
                  className="w-10 h-10 rounded-full border border-gray-700 object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">{selectedWorkDetailsEmp.name}</h3>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase border font-mono ${
                        selectedWorkDetailsEmp.status === 'Overloaded' || selectedWorkDetailsEmp.isOverloaded
                          ? 'bg-red-600 text-white border-red-400'
                          : selectedWorkDetailsEmp.status === 'Normal'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-800'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-800'
                      }`}
                    >
                      {selectedWorkDetailsEmp.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {selectedWorkDetailsEmp.designation} • {selectedWorkDetailsEmp.department || 'Production Team'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedWorkDetailsEmp(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 6 Mandatory Capacity Metrics Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-900/60 p-4 rounded-xl border border-gray-800">
              <div>
                <span className="text-gray-400 text-[10px] block font-mono">1. Daily Capacity</span>
                <strong className="text-cyan-300 font-mono text-sm font-bold">{selectedWorkDetailsEmp.capacityHours} Hours</strong>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] block font-mono">2. Assigned Workload</span>
                <strong className={`font-mono text-sm font-bold ${
                  selectedWorkDetailsEmp.assignedHours > selectedWorkDetailsEmp.capacityHours ? 'text-red-400' : 'text-amber-300'
                }`}>
                  {selectedWorkDetailsEmp.assignedHours} Hours
                </strong>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] block font-mono">3. Remaining Capacity</span>
                <strong className={`font-mono text-sm font-bold ${
                  (selectedWorkDetailsEmp.remainingCapacity || 0) <= 0 ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {selectedWorkDetailsEmp.remainingCapacity !== undefined ? selectedWorkDetailsEmp.remainingCapacity : selectedWorkDetailsEmp.remainingHours || 0} Hours
                </strong>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] block font-mono">4. Workload Utilized</span>
                <strong className={`font-mono text-sm font-bold ${
                  selectedWorkDetailsEmp.workloadPercentage > 100 ? 'text-red-400' : 'text-blue-300'
                }`}>
                  {selectedWorkDetailsEmp.workloadPercentage || 0}%
                </strong>
              </div>
            </div>

            {/* Continuous Calculation Formula Explainer */}
            <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl space-y-1 text-xs">
              <span className="font-mono text-blue-300 font-bold text-[11px] flex items-center gap-1.5">
                ⚡ Continuous Automated Calculation Formula:
              </span>
              <p className="text-[11px] text-gray-300">
                Workload = Σ (Estimated Task Hours × Priority Multiplier × Urgency Multiplier)
              </p>
              <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 font-mono pt-1">
                <span className="bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">Priority: CRITICAL=1.4x | HIGH=1.2x | MEDIUM=1.0x | LOW=0.8x</span>
                <span className="bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">Urgency: Overdue/Due Today=1.5x | Due &lt;=3d=1.25x</span>
              </div>
            </div>

            {/* Assigned Work Items List */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center justify-between">
                <span>📋 Assigned Active Work Deliverables ({empAssignedWorkTasks.length} Tasks)</span>
                {loadingEmpWorkDetails && <span className="text-xs text-blue-400 animate-pulse font-mono">Loading work items...</span>}
              </h4>

              {loadingEmpWorkDetails ? (
                <div className="p-8 text-center text-gray-500 font-mono text-xs">Loading employee tasks...</div>
              ) : empAssignedWorkTasks.length === 0 ? (
                <p className="text-gray-500 italic text-xs p-4 text-center bg-gray-900/40 rounded-lg border border-gray-800">
                  No active pending tasks currently assigned to this employee.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {empAssignedWorkTasks.map((t) => (
                    <div key={t.id} className="p-3.5 bg-gray-900/80 border border-gray-800 hover:border-gray-700 rounded-xl text-xs space-y-2 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-blue-400 font-bold bg-blue-950/40 border border-blue-900/40 px-1.5 py-0.5 rounded">
                              {t.taskId}
                            </span>
                            <h5 className="font-bold text-white text-xs">{t.title}</h5>
                          </div>
                          {t.description && (
                            <p className="text-[11px] text-gray-300">{t.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border ${
                            t.priority === 'CRITICAL' ? 'bg-red-950 text-red-300 border-red-800' :
                            t.priority === 'HIGH' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                            'bg-blue-950 text-blue-300 border-blue-800'
                          }`}>
                            {t.priority}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase border ${getStatusBadge(t.status)}`}>
                            {t.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-400 font-mono pt-2 border-t border-gray-800/60">
                        <div>Project: <strong className="text-gray-200">{t.project?.name || t.script?.name || t.graphicRequirement?.name || 'N/A'}</strong></div>
                        <div>Est Hours: <strong className="text-cyan-300">{t.estimatedHours}h</strong></div>
                        <div>Progress: <strong className="text-blue-300">{t.completionPercentage || 0}%</strong></div>
                        <div>Due Date: <strong className="text-amber-300">{new Date(t.dueDate).toLocaleDateString()}</strong></div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        {(() => {
                          const isAssigned = t.assignedEmployees?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id);
                          const userAssignment = t.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
                          const isNotAcceptedYet = isAssigned && userAssignment?.acceptanceStatus !== 'ACCEPTED' && user?.role !== 'ADMINISTRATOR' && (user?.role as string) !== 'ADMIN';

                          if (isNotAcceptedYet) {
                            return (
                              <button
                                onClick={() => {
                                  setSelectedWorkDetailsEmp(null);
                                  handleAcknowledgeAcceptance(t.id);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] transition-all shadow flex items-center gap-1 animate-pulse"
                              >
                                ✓ Accept Task
                              </button>
                            );
                          }

                          return (
                            <button
                              onClick={() => {
                                setSelectedWorkDetailsEmp(null);
                                openUpdateTaskModal(t);
                              }}
                              className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold transition-colors"
                            >
                              ✏️ Update Progress
                            </button>
                          );
                        })()}
                        {user?.role === 'MEDIA_MANAGER' && (
                          <button
                            onClick={() => {
                              setSelectedWorkDetailsEmp(null);
                              openReassignDrawer(t);
                            }}
                            className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold transition-colors"
                          >
                            🔄 Reassign Task
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setSelectedWorkDetailsEmp(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold text-xs"
              >
                Close Work Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Upload Work Deliverable Output Modal */}
      {uploadTask && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-xs font-bold">
                  {uploadTask.taskId}
                </span>
                <h3 className="font-bold text-white text-base">Upload Work Deliverable Output</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadTask(null);
                  setUploadFileUrl('');
                  setUploadFileName('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDeliverable} className="space-y-4 text-xs">
              {/* Task Details Summary */}
              <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-800 space-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Target Task</span>
                <p className="font-bold text-white text-sm">{uploadTask.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono pt-1">
                  <span>Current Version: <strong className="text-cyan-300">v{uploadTask.activeDeliverableVersion || 0}</strong></span>
                  <span>•</span>
                  <span>Will Upload as: <strong className="text-emerald-400">v{(uploadTask.activeDeliverableVersion || 0) + 1}</strong></span>
                </div>
              </div>

              {/* Existing Deliverable Preview if available */}
              {uploadTask.activeDeliverableUrl && (
                <div className="p-2.5 bg-gray-950 border border-cyan-900/40 rounded-lg space-y-1">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase block">Current Active Deliverable:</span>
                  <a
                    href={uploadTask.activeDeliverableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 font-mono text-xs hover:underline block truncate font-semibold"
                  >
                    🔗 {uploadTask.activeDeliverableFileName || uploadTask.activeDeliverableUrl}
                  </a>
                </div>
              )}

              {/* Deliverable File Name / Label */}
              <div className="space-y-1.5">
                <label className="font-bold text-gray-200 block text-xs">Deliverable Output Title / File Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Final_Banner_v1_1080x1350.png or Edited_Reel_Master_v2.mp4"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white font-medium text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Deliverable Storage Link / File URL */}
              <div className="space-y-1.5">
                <label className="font-bold text-gray-200 block text-xs">Deliverable File URL / Storage Link *</label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://storage.googleapis.com/... or https://drive.google.com/..."
                  value={uploadFileUrl}
                  onChange={(e) => setUploadFileUrl(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-gray-500">
                  Provide direct file storage URL, Google Drive link, Frame.io link, or cloud asset link.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setUploadTask(null);
                    setUploadFileUrl('');
                    setUploadFileName('');
                  }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDeliverable || !uploadFileUrl.trim() || !uploadFileName.trim()}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-extrabold text-xs shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition-all"
                >
                  {uploadingDeliverable ? 'Uploading...' : '📤 Submit Deliverable Output'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Reassignment Recommendations Modal */}
      <ReassignmentRecommendationsModal
        isOpen={Boolean(selectedOverloadedUserId)}
        onClose={() => setSelectedOverloadedUserId(null)}
        overloadedUserId={selectedOverloadedUserId}
        onReassignmentComplete={() => {
          loadData();
        }}
      />
      {/* Request Revision Form Modal */}
      {revisionModalTask && (
        <RequestRevisionModal
          isOpen={Boolean(revisionModalTask)}
          onClose={() => setRevisionModalTask(null)}
          onSuccess={() => {
            loadData();
            if (inspectedTask?.id === revisionModalTask.id) {
              setInspectedTask({ ...inspectedTask, status: 'REVISION_REQUESTED' });
            }
          }}
          entityType="TASK"
          entityId={revisionModalTask.id}
          entityTitle={revisionModalTask.title}
          originalAssigneeId={revisionModalTask.assignedEmployees?.[0]?.userId}
          originalAssigneeName={revisionModalTask.assignedEmployees?.[0]?.user?.name}
          userRole={user?.role}
          isRevision={isTaskRevision(revisionModalTask)}
        />
      )}
    </div>
  );
}
