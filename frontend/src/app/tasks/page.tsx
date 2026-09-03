'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { CheckSquare, AlertTriangle, Plus, ArrowRight, RefreshCw, CheckCircle2, Search, SlidersHorizontal, RotateCcw, X, Building2, Tag, User, Calendar, Flame, Clock, ArrowUpDown, ExternalLink, FileText, Eye, Check, ShieldCheck } from 'lucide-react';
import { TableSortHeader, SortSelector } from '@/components/common/TableSortHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { usePagination } from '@/lib/usePagination';
import { sortData, SortField, SortOrder } from '@/utils/sortUtils';
import { ReassignmentRecommendationsModal } from '@/components/dashboard/ReassignmentRecommendationsModal';
import RevisionsTab from '@/components/revisions/RevisionsTab';
import RequestRevisionModal from '@/components/revisions/RequestRevisionModal';

const isTaskRevision = (t: any) =>
  Boolean(
    t?.taskType === 'REVISION' ||
    t?.sourceType === 'REVISION' ||
    t?.revisionId ||
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
    else if (task.completionPercentage === 100 || task.status === 'WAITING_FOR_REVIEW' || task.productionCompleted || task.status === 'IN_PROGRESS') currentIdx = 1;
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

  // Uploading Category
  const [scriptUploadingCategory, setScriptUploadingCategory] = useState<string | null>(null);

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
        method: 'PATCH',
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

  const handleFileUploadInTaskScript = async (file: File, category: string) => {
    if (!fullScript || !file) return;
    setScriptUploadingCategory(category);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', fullScript.projectId);
      formData.append('scriptId', fullScript.id);
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

      const updated = await fetchApi(`/scripts/${fullScript.id}`);
      setFullScript(updated);
      alert(`✓ File uploaded successfully under category "${category.replace(/_/g, ' ')}"!`);
    } catch (err: any) {
      alert(err.message || 'Failed to upload file');
    } finally {
      setScriptUploadingCategory(null);
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
    if (!fullScript) return;

    const isAssigned = inspectedTask?.assignedEmployees?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const userAssignment = inspectedTask?.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const isNotAcceptedYet = isAssigned && userAssignment?.acceptanceStatus !== 'ACCEPTED' && user?.role !== 'ADMINISTRATOR' && (user?.role as string) !== 'ADMIN';

    const targetScriptId = fullScript?.id || activeScript?.id || inspectedTask?.scriptId;
    if (!targetScriptId) {
      alert('No script found to submit for technical review');
      return;
    }

    setSavingScript(true);
    try {
      await fetchApi(`/scripts/${targetScriptId}/submit-technical`, { method: 'POST' });
      const updated = await fetchApi(`/scripts/${targetScriptId}`).catch(() => null);
      if (updated) setFullScript(updated);
      alert('✓ Script submitted for Technical Review!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit script for technical review');
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
        return 'bg-purple-950 text-purple-300 border-purple-800';
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
  const isTaskStatusAccepted = inspectedTask?.status === 'ACCEPTED' || inspectedTask?.status === 'IN_PROGRESS' || inspectedTask?.status === 'WAITING_FOR_TECHNICAL_REVIEW' || inspectedTask?.status === 'WAITING_FOR_MEDIA_REVIEW' || inspectedTask?.status === 'APPROVED' || inspectedTask?.status === 'COMPLETED';
  const isPendingAcceptance = inspectedTaskIsAssigned && !isTaskStatusAccepted && inspectedTaskUserAssignment?.acceptanceStatus !== 'ACCEPTED' && user?.role !== 'ADMINISTRATOR' && (user?.role as string) !== 'ADMIN';

  const activeScript = fullScript || inspectedTask?.script || (inspectedTask ? {
    id: inspectedTask.scriptId || inspectedTask.id,
    scriptId: inspectedTask.scriptId || `SCR-${inspectedTask.taskId}`,
    name: inspectedTask.title,
    description: inspectedTask.description || '',
    status: inspectedTask.status || 'ACCEPTED',
    priority: inspectedTask.priority || 'MEDIUM',
    createdAt: inspectedTask.createdAt || new Date().toISOString(),
    project: inspectedTask.project,
    client: inspectedTask.client,
    brand: inspectedTask.brand,
    product: inspectedTask.product,
    revisionCount: inspectedTask.revisionCount || 0,
    scriptAssignments: inspectedTask.assignedEmployees || [],
    remarksHistory: inspectedTask.remarksHistory || [],
    language: 'English',
    category: 'Social Media',
  } : null);

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
                    tasks.filter((t) => statusFilter === 'ALL' || t.status === statusFilter),
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
                              {(task.taskType === 'REVISION' || task.sourceType === 'REVISION' || task.revisionId || task.title?.toLowerCase().includes('revision')) && (
                                <span className="font-mono text-[9px] text-amber-300 font-extrabold bg-amber-950/80 border border-amber-700/80 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1 shadow-sm shadow-amber-900/50">
                                  🔄 REVISION
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
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase tracking-wide border inline-block truncate max-w-full ${getStatusBadge(
                          task.status
                        )}`}>
                          {task.status?.replace(/_/g, ' ')}
                        </span>
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
                                    {task.activeDeliverableUrl && ['IN_PROGRESS', 'ON_HOLD'].includes(task.status) && (
                                      <button
                                        onClick={() => handleRequestTechnicalReview(task.id)}
                                        className="px-1.5 py-0.5 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-700/50 rounded text-[10px] font-bold transition-all shadow"
                                        title="Request Technical Review & Approval"
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
            totalItems={tasks.filter((t) => statusFilter === 'ALL' || t.status === statusFilter).length}
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

      {/* Task Inspector Modal */}
      {inspectedTask && (
        <div
          onClick={() => setInspectedTask(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl w-full max-w-3xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto"
          >
              <div className="flex justify-between items-start border-b border-border pb-3">
                <div>
                  <span className="font-mono text-blue-400 font-bold text-xs block">Task ID: {inspectedTask.taskId}</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{inspectedTask.title}</h3>
                  {Boolean(inspectedTask.projectId || inspectedTask.scriptId || inspectedTask.graphicRequirementId) && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                        🔄 Revisions: {inspectedTask.revisionCount || 0}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setInspectedTask(null)}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-bold text-xs"
                >
                  ✕ Close
                </button>
              </div>

              {/* Linked Parent Event Banner for Separate Revision Task */}
              {isTaskRevision(inspectedTask) && (
                <div className="bg-amber-950/60 border border-amber-500/60 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs shadow-md animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-amber-600/30 text-amber-200 border border-amber-500/60 rounded font-mono font-bold text-[10px] flex items-center gap-1">
                      🔄 Separate Revision Task
                    </span>
                    <span className="text-zinc-200 text-xs">
                      Linked to Parent Item:{' '}
                      <strong className="text-amber-300 font-bold">
                        {inspectedTask.script?.name || inspectedTask.graphicRequirement?.name || inspectedTask.project?.name || inspectedTask.client?.name || 'Parent Production Item'}
                      </strong>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800 rounded font-mono text-[10px] font-bold">
                    Individual Task Progress: {inspectedTask.completionPercentage || 0}%
                  </span>
                </div>
              )}

              {/* Pending Task Acceptance Banner */}
              {isPendingAcceptance && (
                <div className="bg-purple-950/80 border border-purple-600 p-4 rounded-xl space-y-2.5 text-xs shadow-xl animate-pulse">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200 font-extrabold text-xs flex items-center gap-2">
                      ⚠️ Task Assigned — Acceptance Required
                    </span>
                    <span className="px-2.5 py-0.5 bg-purple-900 text-purple-200 border border-purple-500 rounded font-mono font-bold text-[10px]">
                      Pending Acceptance
                    </span>
                  </div>
                  <p className="text-purple-100 text-[11px] leading-relaxed">
                    You are assigned to this task. Please click <strong>Accept Task Assignment</strong> below to unlock work progress updates, deliverable uploads, and review actions.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAcknowledgeAcceptance(inspectedTask.id)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center gap-2 text-xs"
                  >
                    <Check className="w-4 h-4" /> Accept Task Assignment Now
                  </button>
                </div>
              )}

            {/* Active Revision Requested Status Banner */}
            {(inspectedTask.status === 'REVISION_REQUESTED' || inspectedTask.status === 'CLIENT_REVISION_REQUESTED') && (
              <div className="bg-amber-950/70 border border-amber-500 p-4 rounded-xl space-y-2 text-xs shadow-xl animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-extrabold text-xs flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-400 animate-spin" /> Active Workflow Status: REVISION REQUESTED
                  </span>
                  <span className="px-2.5 py-0.5 bg-amber-600/40 text-amber-200 border border-amber-500/60 rounded font-mono font-bold text-[10px]">
                    Revision #{inspectedTask.revisionCount || 1}
                  </span>
                </div>
                <p className="text-zinc-200 leading-relaxed">
                  Reviewer requested changes. Assigned staff member is making requested revisions.
                </p>
              </div>
            )}

            {/* Render Work Workspace & Script Details ONLY AFTER Task Acceptance */}
            {!isPendingAcceptance ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-800">
                  <span className="font-mono text-purple-300 font-bold text-xs">Script Context</span>
                  <Link
                    href={`/scripts?inspect=${fullScript?.id || inspectedTask.script?.id || inspectedTask.scriptId}`}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all shrink-0"
                  >
                    <span>Open Script Workspace Page →</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Complete Script Inspect Workspace */}
                {activeScript ? (
                  <div className="space-y-4">
                    {/* Commercial & Script Attributes Summary Card (Important Info First + More Details Toggle) */}
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Script ID</span>
                          <strong className="text-blue-400 font-mono text-xs">{activeScript.scriptId}</strong>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Script Name</span>
                          <strong className="text-white font-mono text-xs block truncate">{activeScript.name}</strong>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Shoot Project</span>
                          <strong className="text-gray-200 text-xs block truncate">{activeScript.project?.name || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Status &amp; Priority</span>
                          <div className="flex items-center gap-1 mt-0.5 font-mono">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono border ${
                              activeScript.status === 'REVISION_REQUESTED' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                              activeScript.status === 'WAITING_FOR_TECHNICAL_REVIEW' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                              activeScript.status === 'WAITING_FOR_MEDIA_REVIEW' ? 'bg-indigo-950 text-indigo-300 border-indigo-800' :
                              activeScript.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                              'bg-gray-900 text-gray-300 border-gray-800'
                            }`}>
                              {activeScript.status}
                            </span>
                            <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded font-bold text-[10px]">
                              {activeScript.priority}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2.5 border-t border-gray-900 text-xs">
                        <span className="text-gray-400 text-[11px]">
                          👤 Assigned Staff: <strong className="text-amber-300">{activeScript.scriptAssignments?.map((a: any) => a.user?.name || a.name).filter(Boolean).join(', ') || 'Assigned Staff'}</strong>
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
                          <div><span className="text-gray-500 block text-[10px]">Client:</span> <strong className="text-gray-200">{activeScript.client?.name || 'N/A'}</strong></div>
                          <div><span className="text-gray-500 block text-[10px]">Brand:</span> <strong className="text-purple-400">[{activeScript.brand?.shortCode || 'BR'}] {activeScript.brand?.name || 'Brand'}</strong></div>
                          <div><span className="text-gray-500 block text-[10px]">Product:</span> <strong className="text-emerald-400">{activeScript.product?.name || 'N/A'}</strong></div>
                          <div><span className="text-gray-500 block text-[10px]">Campaign:</span> <strong className="text-indigo-300">{activeScript.campaign?.name || 'N/A (Optional)'}</strong></div>
                          <div><span className="text-gray-500 block text-[10px]">Language:</span> <strong className="text-purple-300">{activeScript.language || 'English'}</strong></div>
                          <div><span className="text-gray-500 block text-[10px]">Category / Purpose:</span> <strong className="text-amber-300">{activeScript.category || 'Social Media'}</strong></div>
                          <div><span className="text-gray-500 block text-[10px]">Objective:</span> <strong className="text-cyan-300">{activeScript.objective || 'N/A'}</strong></div>
                          <div><span className="text-gray-500 block text-[10px]">Est. Duration:</span> <strong className="text-cyan-300">{activeScript.estimatedDuration || '30s'}</strong></div>
                          <div><span className="text-gray-500 block text-[10px]">Created By:</span> <strong className="text-gray-200">{activeScript.createdBy?.name || 'Writer'}</strong></div>
                          <div><span className="text-gray-500 block text-[10px]">Created At:</span> <strong className="text-gray-300">{new Date(activeScript.createdAt).toLocaleDateString()}</strong></div>
                          <div><span className="text-gray-500 block text-[10px]">Remarks:</span> <strong className="text-amber-300">{activeScript.remarks || 'None'}</strong></div>
                          <div><span className="text-gray-500 block text-[10px]">Total Revisions:</span> <strong className="text-amber-300 font-bold">{activeScript.revisionCount || 0}</strong></div>
                        </div>
                      )}
                    </div>


                    {/* Script Workflow Progress Stepper (Task Style) */}
                    <div className="p-4 bg-gray-950 border border-purple-900/60 rounded-xl space-y-3 shadow-lg">
                      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                        <h4 className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                          🚀 Script Workflow Progress
                        </h4>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-purple-950 text-purple-300 border-purple-800">
                          Current Status: {activeScript.status || 'IN_PRODUCTION'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between overflow-x-auto py-2 px-1 gap-1">
                        {[
                          { key: 'IN_PRODUCTION', label: '1. Production' },
                          { key: 'WAITING_FOR_TECHNICAL_REVIEW', label: '2. Technical Review' },
                          { key: 'WAITING_FOR_MEDIA_REVIEW', label: '3. Media Review' },
                          { key: 'WAITING_FOR_CLIENT_CONFIRMATION', label: '4. Client Confirmation' },
                          { key: 'COMPLETED', label: '5. Completed' },
                        ].map((stage, i) => {
                          let currentIdx = 0;
                          if (activeScript.status === 'COMPLETED' || (scriptProdComp && scriptTechAppr && scriptMediaAppr && scriptClientConf)) currentIdx = 4;
                          else if (activeScript.status === 'WAITING_FOR_CLIENT_CONFIRMATION' || scriptClientConf) currentIdx = 3;
                          else if (activeScript.status === 'WAITING_FOR_MEDIA_REVIEW' || activeScript.status === 'APPROVED' || scriptMediaAppr) currentIdx = 2;
                          else if (activeScript.status === 'WAITING_FOR_TECHNICAL_REVIEW' || scriptTechAppr) currentIdx = 1;
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
                              {i < 4 && (
                                <div className={`h-0.5 flex-1 min-w-[12px] ${
                                  currentIdx >= 0 && i < currentIdx ? 'bg-emerald-500' : 'bg-gray-800'
                                }`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Storyline, Attachments, Review Workflow, Remarks (Unlocked ONLY AFTER Task Acceptance) */}
                    {isPendingAcceptance ? (
                      <div className="p-6 bg-purple-950/40 border border-purple-800/60 rounded-xl text-center space-y-3 shadow-lg">
                        <span className="text-purple-300 font-extrabold text-sm block">
                          🔒 Work Workspace Locked — Task Acceptance Required
                        </span>
                        <p className="text-gray-300 text-xs max-w-lg mx-auto leading-relaxed">
                          Review the task creation details above. Click <strong>Accept Task Assignment Now</strong> to unlock deliverable upload fields, storyline editing, and review submission controls.
                        </p>
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeAcceptance(inspectedTask.id)}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg shadow-lg transition-all flex items-center gap-2 text-xs animate-bounce"
                          >
                            <Check className="w-4 h-4" /> Accept Task Assignment Now
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Storyline Editor Card */}
                        <div className="p-4 bg-gray-950 border border-purple-900/60 rounded-2xl space-y-3 shadow-lg">
                          <div className="flex justify-between items-center border-b border-gray-800 pb-2.5">
                            <h3 className="font-bold text-white text-xs uppercase tracking-wider">📜 Full Script Storyline &amp; Scene Narration</h3>
                            <div className="flex bg-gray-900 border border-gray-800 p-0.5 rounded-lg text-[10px] font-semibold">
                              <button type="button" onClick={() => setScriptStorylineTab('view')} className={`px-2 py-0.5 rounded ${scriptStorylineTab === 'view' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400'}`}>👁️ Formatted View</button>
                              <button type="button" onClick={() => setScriptStorylineTab('edit')} className={`px-2 py-0.5 rounded ${scriptStorylineTab === 'edit' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400'}`}>✏️ Edit Storyline</button>
                            </div>
                          </div>
                          {scriptStorylineTab === 'view' ? (
                            <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 max-h-64 overflow-y-auto">
                              {scriptEditDescription?.trim() ? (
                                <div className="whitespace-pre-wrap font-sans text-gray-200 text-xs leading-relaxed">{scriptEditDescription}</div>
                              ) : (
                                <p className="text-gray-500 italic text-[11px] text-center py-4">No storyline entered yet. Switch to Edit tab to add details.</p>
                              )}
                            </div>
                          ) : (
                            <textarea rows={6} value={scriptEditDescription} onChange={(e) => setScriptEditDescription(e.target.value)} placeholder="Enter scene narration, voiceover dialogues, shot list..." className="w-full bg-gray-900 border border-purple-900/60 text-white p-3 rounded-xl text-xs font-mono focus:outline-none focus:border-purple-500" />
                          )}
                        </div>

                        {/* Linked Script Attachments Section */}
                        <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-4 pt-3">
                          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                            <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-purple-400" /> Linked Script Attachments &amp; Production Files
                            </h4>
                            <span className="text-[10px] text-purple-400 font-mono font-bold">
                              ⚡ Select category type first, then choose file to upload
                            </span>
                          </div>

                          <div className="p-3.5 bg-gray-900 border border-purple-900/60 rounded-xl space-y-2.5 shadow-md">
                            <span className="text-purple-300 font-bold text-xs block">📤 Upload File Under Attachment Category:</span>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <select
                                value={selectedScriptAttachmentCategory}
                                onChange={(e) => setSelectedScriptAttachmentCategory(e.target.value)}
                                className="bg-gray-950 border border-purple-800 text-white px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-purple-500 shadow-inner"
                              >
                                <option value="SCRIPT_DOCUMENT">📄 1. Script Document</option>
                                <option value="REFERENCE_IMAGES">🖼️ 2. Reference Images</option>
                                <option value="REFERENCE_VIDEOS">🎬 3. Reference Videos</option>
                                <option value="AUDIO_REFERENCES">🎵 4. Audio References</option>
                                <option value="BRAND_GUIDELINES">🎨 5. Brand Guidelines</option>
                                <option value="PRODUCT_INFORMATION">📦 6. Product Information</option>
                                <option value="SUPPORTING_DOCUMENTS">📁 7. Supporting Documents</option>
                              </select>

                              <label className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 shadow transition-all">
                                <span>{scriptUploadingCategory ? 'Uploading File…' : '+ Choose File & Upload'}</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleFileUploadInTaskScript(e.target.files[0], selectedScriptAttachmentCategory);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                            {[
                              { key: 'SCRIPT_DOCUMENT', label: '📄 1. Script Documents' },
                              { key: 'REFERENCE_IMAGES', label: '🖼️ 2. Reference Images' },
                              { key: 'REFERENCE_VIDEOS', label: '🎬 3. Reference Videos' },
                              { key: 'AUDIO_REFERENCES', label: '🎵 4. Audio References' },
                              { key: 'BRAND_GUIDELINES', label: '🎨 5. Brand Guidelines' },
                              { key: 'PRODUCT_INFORMATION', label: '📦 6. Product Information' },
                              { key: 'SUPPORTING_DOCUMENTS', label: '📁 7. Supporting Documents' },
                            ].map((cat) => {
                              const catFiles = scriptAttachments.filter((f: any) => f.attachmentCategory === cat.key);
                              return (
                                <div key={cat.key} className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-purple-300">{cat.label}</span>
                                    <span className="text-[10px] text-gray-400">({catFiles.length} files)</span>
                                  </div>
                                  {catFiles.length > 0 ? (
                                    catFiles.map((f: any) => (
                                      <div key={f.id} className="flex items-center justify-between gap-1 bg-gray-950 p-1.5 rounded border border-gray-800">
                                        <span className="text-gray-200 font-mono text-[10px] truncate">{f.fileName}</span>
                                        <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded font-bold border border-emerald-800 shrink-0">ACTIVE</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-gray-500 italic text-[10px]">No files uploaded under "{cat.label.slice(5)}" yet</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Current Active Stage Status Card */}
                        {activeScript?.status === 'REVISION_REQUESTED' && (
                          <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-xl space-y-2.5 text-red-200 shadow-xl">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs flex items-center gap-2 text-red-300">
                                ❌ Technical Review REJECTED (Revisions Required)
                              </span>
                              <span className="text-[10px] bg-red-900 text-red-100 border border-red-700 px-2 py-0.5 rounded font-mono font-bold">
                                REVISION_REQUESTED
                              </span>
                            </div>
                            <div className="p-3 bg-red-900/40 border border-red-800/60 rounded-lg text-xs space-y-1">
                              <span className="text-[10px] uppercase font-bold text-red-300 block">💬 Technical Manager Rejection Reason:</span>
                              <p className="text-white font-medium whitespace-pre-wrap">
                                {activeScript.remarks || 'No specific rejection reason supplied. Please check operational remarks below and update storyline or attachments.'}
                              </p>
                            </div>
                            <p className="text-[11px] text-gray-300">
                              Update script details or attachments above, then click <strong>🔄 Resubmit Revised Script for Technical Review</strong> below to request Technical Manager review again.
                            </p>
                          </div>
                        )}

                        {/* Workflow Actions */}
                        <div className="space-y-3">
                          {!activeScript.technicalReviewApproved && !['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'PENDING_MARKETING_APPROVAL', 'APPROVED', 'COMPLETED'].includes(activeScript.status) && (
                            <div className="p-4 bg-purple-950/40 border border-purple-800/60 rounded-xl space-y-2.5 shadow-lg">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                                  {['REVISION_REQUESTED', 'CHANGES_REQUESTED'].includes(activeScript.status)
                                    ? '🚀 Assigned Staff Action: Resubmit Revised Script for Technical Review'
                                    : '🚀 Assigned Staff Action: Submit for Technical Review'}
                                </span>
                                <span className="text-[10px] bg-purple-950 text-purple-200 border border-purple-700 px-2 py-0.5 rounded font-mono font-bold">
                                  Status: {activeScript.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-300">
                                {['REVISION_REQUESTED', 'CHANGES_REQUESTED'].includes(activeScript.status)
                                  ? 'Revisions were requested by Technical Manager. Edit the script storyline or attachments above, then click below to resubmit for Technical Manager Review again.'
                                  : 'Once storyline narration and reference files are complete, submit this script to start the sequential approval chain (Technical Review → Media Manager Review → Marketing Manager Approval).'}
                              </p>
                              <button
                                type="button"
                                onClick={handleSubmitTechnicalReviewInTask}
                                disabled={savingScript}
                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center gap-2 text-xs"
                              >
                                {['REVISION_REQUESTED', 'CHANGES_REQUESTED'].includes(activeScript.status)
                                  ? '🔄 Resubmit Revised Script for Technical Review'
                                  : '🚀 Submit Script for Technical Review'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Permanent Operational Timeline & Decision Trail Card */}
                        {(() => {
                          const timelineList = activeScript.timeline || inspectedTask?.taskTimeline || [];
                          if (timelineList.length === 0) return null;

                          return (
                            <div className="p-4 bg-gray-950 border border-purple-900/60 rounded-xl space-y-3 shadow-md">
                              <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
                                📜 Permanent Operational Timeline &amp; Decision Trail ({timelineList.length} Event{timelineList.length > 1 ? 's' : ''})
                              </h4>
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {timelineList.map((ev: any, idx: number) => {
                                  const isAppr = ev.event?.includes('APPROVED') || ev.description?.includes('APPROVED');
                                  const isRej = ev.event?.includes('REJECTED') || ev.description?.includes('REJECTED');
                                  const isTech = ev.event?.includes('TECHNICAL');
                                  const isMedia = ev.event?.includes('MEDIA');
                                  const reviewerName = ev.triggeredBy?.name || ev.user?.name || 'Manager';
                                  const dateStr = ev.createdAt ? new Date(ev.createdAt).toLocaleString() : '';

                                  return (
                                    <div
                                      key={ev.id || idx}
                                      className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                                        isAppr
                                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                                          : isRej
                                          ? 'bg-red-950/20 border-red-800/40 text-red-300'
                                          : 'bg-gray-900 border-gray-800 text-gray-300'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border uppercase ${
                                            isAppr ? 'bg-emerald-900/60 border-emerald-700 text-emerald-200' :
                                            isRej ? 'bg-red-900/60 border-red-700 text-red-200' :
                                            'bg-purple-950 border-purple-800 text-purple-200'
                                          }`}>
                                            {isAppr ? '✅ APPROVED' : isRej ? '❌ REJECTED' : '⚡ TIMELINE'}
                                          </span>
                                          <span className="font-bold text-[11px] text-gray-200">
                                            {isTech ? 'Technical Review Action' : isMedia ? 'Media Review Action' : ev.event || 'Workflow Event'}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-mono">{dateStr}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-[11px] text-gray-300">
                                        <span>Triggered By: <strong className="text-white font-semibold">{reviewerName}</strong></span>
                                      </div>
                                      {ev.description && (
                                        <p className="text-[11px] text-gray-300 font-mono bg-gray-950 p-2 rounded border border-gray-800/60">
                                          {ev.description}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Operational Remarks Section */}
                        <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2.5">
                          <h4 className="font-bold text-gray-300 text-xs uppercase tracking-wider">💬 Operational Remarks &amp; Work Logs</h4>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {(activeScript.remarksHistory || inspectedTask?.remarksHistory || []).map((r: any) => (
                              <div key={r.id || Math.random()} className="p-2 bg-gray-900 border border-gray-800 rounded text-[11px]">
                                <div className="flex justify-between text-gray-400 font-mono text-[9px] mb-0.5">
                                  <span>{r.user?.name || r.name || 'Staff'}</span>
                                  <span>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                                </div>
                                <p className="text-gray-200">{r.message}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
                            <input type="text" value={scriptNewRemarkText} onChange={(e) => setScriptNewRemarkText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddScriptRemarkInTask(); }} placeholder="Add operational remark..." className="flex-1 bg-gray-900 border border-gray-700 text-white px-3 py-1.5 rounded-lg text-xs" />
                            <button type="button" onClick={handleAddScriptRemarkInTask} disabled={!scriptNewRemarkText.trim() || scriptAddingRemark} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg">Send</button>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                          <button type="button" onClick={() => setInspectedTask(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg">Close</button>
                          <button type="button" onClick={handleSaveScriptDetailsInTask} disabled={savingScript} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow">{savingScript ? 'Saving...' : 'Save Script Workspace'}</button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 italic">Loading Script workspace...</div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Row 1: Task Description */}
                <div className="bg-gray-900 border border-gray-800 p-3.5 rounded-xl space-y-2">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Task Description</span>
                  <p className="text-gray-200 text-xs leading-relaxed font-normal">{inspectedTask.description || 'No description provided.'}</p>
                </div>

                {/* Row 2: Metrics Summary Row */}
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
                      <strong className="text-gray-200 text-xs mt-0.5 block">{new Date(inspectedTask.dueDate).toLocaleDateString()}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block uppercase">Estimated Hours</span>
                      <strong className="text-emerald-400 text-xs mt-0.5 block">{inspectedTask.estimatedHours}h</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block uppercase">Synchronized Status</span>
                      <strong className="text-purple-300 text-xs mt-0.5 block">{inspectedTask.status?.replace(/_/g, ' ')}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-border">
                  <button
                    onClick={() => setInspectedTask(null)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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
