'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CheckSquare, AlertTriangle, Plus, ArrowRight, RefreshCw, CheckCircle2, Search, SlidersHorizontal, RotateCcw, X, Building2, Tag, User, Calendar, Flame, Clock, ArrowUpDown, ExternalLink, FileText, Eye, Check, ShieldCheck, Copy, MessageSquare, Send, Lock, Sparkles, Film, Link as LinkIcon, Camera, Layers, MapPin, Compass, CloudSun, Users, Image as ImageIcon, Palette } from 'lucide-react';
import { TableSortHeader, SortSelector } from '@/components/common/TableSortHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { usePagination } from '@/lib/usePagination';
import { sortData, SortField, SortOrder } from '@/utils/sortUtils';
import { ReassignmentRecommendationsModal } from '@/components/dashboard/ReassignmentRecommendationsModal';
import RevisionsTab from '@/components/revisions/RevisionsTab';
import RequestRevisionModal from '@/components/revisions/RequestRevisionModal';
import { TimelineView, TimelineEntry } from '@/components/common/TimelineView';
import { RouteGuard } from '@/components/common/RouteGuard';

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

const getTaskTypeInfo = (task: any) => {
  if (!task) return { type: 'OTHER', label: 'Other Task', shortLabel: 'Other', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300', icon: Layers };

  if (isTaskRevision(task) || (task.revisions && task.revisions.length > 0) || (task.revisionCount && task.revisionCount > 0) || task.taskType === 'REVISION' || task.sourceType === 'REVISION') {
    return {
      type: 'REVISION',
      label: 'Revision Task',
      shortLabel: 'Revision',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
      icon: RotateCcw
    };
  }

  // Explicit OTHER or DIRECT_TASK check takes priority over linked parent project
  if (task.taskType === 'OTHER' || task.sourceType === 'DIRECT_TASK' || task.sourceType === 'OTHER') {
    return {
      type: 'OTHER',
      label: 'Other Task',
      shortLabel: 'Other',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: Layers
    };
  }

  

  if (task.graphicRequirement || task.graphicRequirementId || task.sourceType === 'GRAPHIC_REQUIREMENT' || task.sourceType === 'GRAPHIC' || task.taskType === 'GRAPHIC_REQUIREMENT' || task.taskType === 'GRAPHIC') {
    return {
      type: 'GRAPHIC',
      label: 'Graphic Req Task',
      shortLabel: 'Graphic Req',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-300',
      icon: FileText
    };
  }

  if (task.sourceType === 'SHOOT_PROJECT' || task.taskType === 'PROJECT' || ((task.project || task.projectId) && !task.script && !task.scriptId && !task.graphicRequirement && !task.graphicRequirementId && task.sourceType !== 'SCRIPT' && task.sourceType !== 'GRAPHIC_REQUIREMENT' && task.sourceType !== 'DIRECT_TASK' && task.taskType !== 'OTHER')) {
    return {
      type: 'PROJECT',
      label: 'Shoot Project Task',
      shortLabel: 'Shoot Project',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-300',
      icon: Camera
    };
  }

  return {
    type: 'OTHER',
    label: 'Other Task',
    shortLabel: 'Other',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: Layers
  };
};

const TaskWorkflowTimeline = ({ task }: { task: any }) => {
  if (!task) return null;

  const isRevision = isTaskRevision(task);
  const isDirect = task.sourceType === 'DIRECT_TASK';
  const isScriptTask = false;

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
  } else if (isDirect || !task.calendarEventId) {
    stages = directStages;
    currentIdx = stages.findIndex((s) => s.key === task.status);
  } else {
    stages = eventStages;
    currentIdx = stages.findIndex((s) => s.key === task.status);
  }

  const parentTitle =
    task.graphicRequirement?.name ||
    task.project?.name ||
    task.client?.name ||
    'Parent Event';

  return (
    <div className={`border p-3.5 rounded-xl space-y-2.5 ${
      isScriptTask
        ? 'bg-purple-50 border-purple-200 shadow-lg shadow-purple-950/20'
        : isRevision
        ? 'bg-amber-50 border-amber-200 shadow-lg shadow-amber-950/20'
        : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-700 font-bold uppercase tracking-wider flex items-center gap-1.5">
          {isScriptTask ? (
            <>
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              Script Task Workflow Sequence (7 Stages)
            </>
          ) : isRevision ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              Revision Task Workflow Progress
            </>
          ) : isDirect ? (
            'Direct Task Workflow Sequence'
          ) : (
            'Event / Graphic Req Workflow Sequence'
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {parentTitle && (
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
              Linked Parent: <strong className="text-purple-700">{parentTitle}</strong>
            </span>
          )}
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
            isScriptTask ? 'bg-purple-50 text-purple-700 border-purple-200' :
            isRevision ? 'bg-amber-50 text-amber-800 border-amber-200' :
            isDirect ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-amber-50 text-amber-800 border-amber-200'
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
                    : 'bg-slate-50 text-slate-400 border border-slate-200'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-[9px] mt-1 font-semibold leading-tight ${
                  isCurrent ? 'text-purple-700 font-bold' : isPassed ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {stage.label}
                </span>
              </div>

              {i < stages.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-[8px] ${
                  currentIdx >= 0 && i < currentIdx ? 'bg-emerald-500' : 'bg-slate-100'
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

  // Full Graphic Requirement Workspace State (For Staff Direction access & editing)
  const [fullGraphicReq, setFullGraphicReq] = useState<any>(null);
  const [loadingFullGraphicReq, setLoadingFullGraphicReq] = useState(false);
  const [graphicDirectionTab, setGraphicDirectionTab] = useState<'view' | 'edit'>('view');
  const [graphicCopiedDirection, setGraphicCopiedDirection] = useState(false);
  const [graphicEditObjective, setGraphicEditObjective] = useState('');
  const [graphicEditDirection, setGraphicEditDirection] = useState('');
  const [graphicEditRemarks, setGraphicEditRemarks] = useState('');
  const [savingGraphicReq, setSavingGraphicReq] = useState(false);

  useEffect(() => {
    const gId = inspectedTask?.graphicRequirement?.id || inspectedTask?.graphicRequirementId;
    if (gId) {
      setLoadingFullGraphicReq(true);
      fetchApi(`/graphic-reqs/${gId}`)
        .then((res: any) => {
          const item = res?.data || res;
          if (item) {
            setFullGraphicReq(item);
            setGraphicEditObjective(item.objective || '');
            setGraphicEditDirection(item.description || item.calendarEvent?.notes || '');
            setGraphicEditRemarks(item.remarks || '');
          }
        })
        .catch(() => {
          setFullGraphicReq(inspectedTask.graphicRequirement || null);
          setGraphicEditObjective(inspectedTask.graphicRequirement?.objective || '');
          setGraphicEditDirection(inspectedTask.graphicRequirement?.description || inspectedTask.description || '');
          setGraphicEditRemarks(inspectedTask.graphicRequirement?.remarks || inspectedTask.remarks || '');
        })
        .finally(() => setLoadingFullGraphicReq(false));
    } else {
      setFullGraphicReq(null);
      setGraphicEditObjective('');
      setGraphicEditDirection('');
      setGraphicEditRemarks('');
    }
  }, [inspectedTask]);

  const inspectedTaskIsAssigned =
    inspectedTask?.assignedEmployees?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id) ||
    inspectedTask?.assignedToId === user?.id;
  const inspectedTaskUserAssignment = inspectedTask?.assignedEmployees?.find(
    (a: any) => a.userId === user?.id || a.user?.id === user?.id,
  );
  const isPendingAcceptance =
    inspectedTaskIsAssigned &&
    (inspectedTaskUserAssignment
      ? inspectedTaskUserAssignment?.acceptanceStatus !== 'ACCEPTED'
      : inspectedTask?.status !== 'ACCEPTED' &&
        inspectedTask?.status !== 'IN_PROGRESS' &&
        inspectedTask?.status !== 'COMPLETED') &&
    user?.role !== 'ADMINISTRATOR' &&
    (user?.role as string) !== 'ADMIN';

  

  const handleSaveGraphicDirectionInTask = async () => {
    const gId = fullGraphicReq?.id || inspectedTask?.graphicRequirement?.id || inspectedTask?.graphicRequirementId;
    if (!gId) return;
    if (isPendingAcceptance) {
      alert('Task is in read-only mode. Please accept the task assignment first.');
      return;
    }
    setSavingGraphicReq(true);
    try {
      await fetchApi(`/graphic-reqs/${gId}`, {
        method: 'PUT',
        body: JSON.stringify({
          objective: graphicEditObjective,
          description: graphicEditDirection,
          remarks: graphicEditRemarks,
        }),
      });
      const updated = await fetchApi(`/graphic-reqs/${gId}`).catch(() => null);
      if (updated) {
        setFullGraphicReq(updated);
      }
      if (inspectedTask) {
        setInspectedTask((prev: any) => ({
          ...prev,
          graphicRequirement: updated || {
            ...prev?.graphicRequirement,
            objective: graphicEditObjective,
            description: graphicEditDirection,
            remarks: graphicEditRemarks,
          },
        }));
      }
      alert('Graphic Requirement Direction & Guidelines updated successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update Graphic Requirement Direction');
    } finally {
      setSavingGraphicReq(false);
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

    const isUnderReview = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'WAITING_FOR_REVIEW',
      'PENDING_MARKETING_APPROVAL',
      'WAITING_FOR_MARKETING_APPROVAL',
      'PENDING_CLIENT_APPROVAL',
      'PENDING_CLIENT_REVIEW',
      'WAITING_FOR_CLIENT_CONFIRMATION',
    ].includes(task.status);

    if (isUnderReview) {
      alert(`Task is currently under review (${task.status}) and in Read-Only mode. Progress and status updates cannot be modified during review.`);
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
  const [parentEntityType, setParentEntityType] = useState<'PROJECT' | 'GRAPHIC_REQ'>('PROJECT');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedParentProjectId, setSelectedParentProjectId] = useState('');
  const [taskClientId, setTaskClientId] = useState('');
  const [taskBrandId, setTaskBrandId] = useState('');
  const [taskProductId, setTaskProductId] = useState('');
  const [taskCampaign, setTaskCampaign] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [taskEstimatedHours, setTaskEstimatedHours] = useState('2.0');
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);

  // Graphic Requirement specific fields (100% matched with Event Creation)
  const [taskContentType, setTaskContentType] = useState('Poster');
  const [taskPlatform, setTaskPlatform] = useState('Instagram');
  const [taskObjective, setTaskObjective] = useState('');
  const [taskRemarks, setTaskRemarks] = useState('');
  const [taskSelectedDeliverables, setTaskSelectedDeliverables] = useState<string[]>(['Poster', 'Story']);
  const [taskCreativeAssetName, setTaskCreativeAssetName] = useState('');
  const [taskCreativePreviewUrl, setTaskCreativePreviewUrl] = useState('');

  // Shoot Project specific fields (100% matched with Event Creation)
  const [taskShootType, setTaskShootType] = useState('INDOOR');
  const [taskShootDate, setTaskShootDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskLocation, setTaskLocation] = useState('Main Studio Floor');
  const [taskLocationCategory, setTaskLocationCategory] = useState('Studio Bay');
  const [taskCallTime, setTaskCallTime] = useState('09:00 AM');
  const [taskExpectedWrapTime, setTaskExpectedWrapTime] = useState('05:00 PM');
  const [taskInfluencerTalent, setTaskInfluencerTalent] = useState('');
  const [taskExactLocationAddress, setTaskExactLocationAddress] = useState('');
  const [taskLocationAccessDetails, setTaskLocationAccessDetails] = useState('');
  const [taskLocationContact, setTaskLocationContact] = useState('');
  const [taskExpectedWeatherConditions, setTaskExpectedWeatherConditions] = useState('Sunny');
  const [taskBackupLocation, setTaskBackupLocation] = useState('');
  const [taskSpecialOutdoorRequirements, setTaskSpecialOutdoorRequirements] = useState('');
  const [taskEquipmentIds, setTaskEquipmentIds] = useState<string[]>([]);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState('ALL');

  const [projectsList, setProjectsList] = useState<any[]>([]);
  
  const [graphicReqsList, setGraphicReqsList] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [staffUsersList, setStaffUsersList] = useState<any[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [scriptCreationDetails, setScriptCreationDetails] = useState<any | null>(null);
  const [taskScriptDocFile, setTaskScriptDocFile] = useState<File | null>(null);
  const [uploadingTaskScript, setUploadingTaskScript] = useState(false);
  const [inspectedProjectFiles, setInspectedProjectFiles] = useState<any[]>([]);
  const [loadingInspectedFiles, setLoadingInspectedFiles] = useState(false);

  useEffect(() => {
    if (inspectedTask) {
      loadInspectedTaskFiles(inspectedTask);
    } else {
      setInspectedProjectFiles([]);
    }
  }, [inspectedTask?.id]);

  const loadInspectedTaskFiles = async (taskObj: any) => {
    if (!taskObj) return;
    const projectId = taskObj.projectId || taskObj.project?.id || taskObj.graphicRequirement?.projectId;
    if (projectId) {
      try {
        setLoadingInspectedFiles(true);
        const res = await fetchApi(`/files/project/${projectId}`);
        setInspectedProjectFiles(res.allFiles || []);
      } catch {
        setInspectedProjectFiles([]);
      } finally {
        setLoadingInspectedFiles(false);
      }
    } else {
      setInspectedProjectFiles([]);
    }
  };

  const handleUploadScriptDocForTask = async (file: File) => {
    if (!file || !inspectedTask) return;
    const projectId = inspectedTask.projectId || inspectedTask.project?.id || inspectedTask.graphicRequirement?.projectId;
    try {
      setUploadingTaskScript(true);
      const fd = new FormData();
      fd.append('file', file);
      if (projectId) {
        fd.append('projectId', projectId);
      }
      fd.append('taskId', inspectedTask.id);
      fd.append('folderCategory', 'Script Documents');
      fd.append('attachmentCategory', 'SCRIPT_DOCUMENT');
      await fetchApi('/files/upload', {
        method: 'POST',
        body: fd,
      });
      alert('Script document uploaded successfully!');
      if (projectId) {
        const res = await fetchApi(`/files/project/${projectId}`);
        setInspectedProjectFiles(res.allFiles || []);
      }
      loadTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to upload script document.');
    } finally {
      setUploadingTaskScript(false);
    }
  };
  

  const loadReferenceData = async () => {
    try {
      const [resCap, resProj, resGraphic, resUsers, resClients, resBrands, resProducts, resEquip] = await Promise.all([
        fetchApi('/tasks/capacity/overview'),
        fetchApi('/projects'),
        fetchApi('/graphic-reqs'),
        fetchApi('/users'),
        fetchApi('/clients'),
        fetchApi('/brands'),
        fetchApi('/products'),
        fetchApi('/equipment').catch(() => []),
      ]);
      
      setProjectsList(Array.isArray(resProj) ? resProj : []);
      setGraphicReqsList(Array.isArray(resGraphic) ? resGraphic : []);
      setStaffUsersList(Array.isArray(resUsers) ? resUsers : []);
      setClientsList(Array.isArray(resClients) ? resClients : []);
      setBrandsList(Array.isArray(resBrands) ? resBrands : []);
      setProductsList(Array.isArray(resProducts) ? resProducts : []);
      setEquipmentList(Array.isArray(resEquip) ? resEquip : []);
    } catch (err) {
      console.error('Failed to load tasks reference metadata:', err);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      let query = '?';
      if (searchQuery.trim()) query += `search=${encodeURIComponent(searchQuery.trim())}&`;
      if (statusFilter && statusFilter !== 'ALL' && user?.role !== 'STAFF') query += `status=${statusFilter}&`;
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
    if (parentEntityType === 'PROJECT' && (selectedParentId || selectedParentProjectId)) {
      const pId = selectedParentId || selectedParentProjectId;
      const p = projectsList.find((x) => x.id === pId);
      if (p) {
        if (!taskTitle || taskTitle.trim() === '') setTaskTitle(p.name);
        if (!taskDescription || taskDescription.trim() === '') setTaskDescription(p.notes || '');
        if (p.clientId) setTaskClientId(p.clientId);
        if (p.brandId) setTaskBrandId(p.brandId);
        if (p.productId) setTaskProductId(p.productId);
        if (p.priority) setTaskPriority(p.priority);
        if (p.shootType) setTaskShootType(p.shootType);
        if (p.shootLocation) setTaskLocation(p.shootLocation);
        if (p.locationCategory) setTaskLocationCategory(p.locationCategory);
      }
      setSelectedParentProjectId(pId);
      
    } else if (parentEntityType === 'GRAPHIC_REQ' && selectedParentId) {
      const g = graphicReqsList.find((x) => x.id === selectedParentId);
      if (g) {
        if (!taskTitle || taskTitle.trim() === '') setTaskTitle(g.name);
        if (!taskDescription || taskDescription.trim() === '') setTaskDescription(g.description || g.objective || '');
        if (g.objective && !taskObjective) setTaskObjective(g.objective);
        if (g.remarks && !taskRemarks) setTaskRemarks(g.remarks);
        if (g.requirementType && !taskContentType) setTaskContentType(g.requirementType);
        if (g.projectId && !selectedParentProjectId) setSelectedParentProjectId(g.projectId);
        if (g.clientId) setTaskClientId(g.clientId);
        if (g.brandId) setTaskBrandId(g.brandId);
        if (g.productId) setTaskProductId(g.productId);
        if (g.priority) setTaskPriority(g.priority);
      }
    }
  }, [parentEntityType, selectedParentId, selectedParentProjectId, projectsList, graphicReqsList]);

  useEffect(() => {
    if (reassignUserParam) {
      setSelectedOverloadedUserId(reassignUserParam);
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
      const isGraphic = parentEntityType === 'GRAPHIC_REQ';
      const isShoot = parentEntityType === 'PROJECT';

      const payload: any = {
        title: taskTitle,
        description: taskDescription || (isGraphic ? taskObjective : undefined),
        priority: taskPriority,
        dueDate: taskDueDate || new Date(Date.now() + 86400000).toISOString(),
        estimatedHours: parseFloat(taskEstimatedHours) || 2.0,
        parentEntityType: parentEntityType,
        taskType: isShoot ? 'PROJECT' : 'GRAPHIC_REQUIREMENT',
        sourceType: isShoot ? 'SHOOT_PROJECT' : 'GRAPHIC_REQUIREMENT',
        clientId: taskClientId || undefined,
        brandId: taskBrandId || undefined,
        productId: taskProductId || undefined,
        campaignId: taskCampaign || undefined,
        assignedUserIds: assignedStaffIds,
        // Graphic Requirement full fields
        contentType: isGraphic ? taskContentType : undefined,
        platform: isGraphic ? taskPlatform : undefined,
        objective: isGraphic ? taskObjective : undefined,
        caption: isGraphic ? taskObjective : undefined,
        remarks: isGraphic ? taskRemarks : undefined,
        selectedDeliverables: isGraphic ? taskSelectedDeliverables : undefined,
        creativeAssetName: isGraphic || isShoot ? taskCreativeAssetName : undefined,
        creativePreviewUrl: isGraphic || isShoot ? taskCreativePreviewUrl : undefined,
        // Shoot Project full fields
        shootType: isShoot ? taskShootType : undefined,
        shootDate: isShoot ? taskShootDate : undefined,
        location: isShoot ? taskLocation : undefined,
        locationCategory: isShoot ? taskLocationCategory : undefined,
        callTime: isShoot ? taskCallTime : undefined,
        expectedWrapTime: isShoot ? taskExpectedWrapTime : undefined,
        influencerTalent: isShoot ? taskInfluencerTalent : undefined,
        productionNotes: isShoot ? taskDescription : undefined,
        exactLocationAddress: isShoot && taskShootType === 'OUTDOOR' ? taskExactLocationAddress : undefined,
        locationAccessDetails: isShoot && taskShootType === 'OUTDOOR' ? taskLocationAccessDetails : undefined,
        locationContact: isShoot && taskShootType === 'OUTDOOR' ? taskLocationContact : undefined,
        expectedWeatherConditions: isShoot && taskShootType === 'OUTDOOR' ? taskExpectedWeatherConditions : undefined,
        backupLocation: isShoot && taskShootType === 'OUTDOOR' ? taskBackupLocation : undefined,
        specialOutdoorRequirements: isShoot && taskShootType === 'OUTDOOR' ? taskSpecialOutdoorRequirements : undefined,
        equipmentIds: taskEquipmentIds.length > 0 ? taskEquipmentIds : undefined,
      };

      if (parentEntityType === 'PROJECT') {
        payload.projectId = selectedParentId || selectedParentProjectId || undefined;
      } else if (parentEntityType === 'GRAPHIC_REQ') {
        if (selectedParentId) payload.graphicRequirementId = selectedParentId;
        if (selectedParentProjectId) payload.projectId = selectedParentProjectId;
      }

      const createdTask = await fetchApi('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (taskScriptDocFile && createdTask) {
        const uploadFd = new FormData();
        uploadFd.append('file', taskScriptDocFile);
        if (createdTask.projectId || payload.projectId) {
          uploadFd.append('projectId', createdTask.projectId || payload.projectId);
        }
        if (createdTask.id) {
          uploadFd.append('taskId', createdTask.id);
        }
        uploadFd.append('folderCategory', 'Script Documents');
        uploadFd.append('attachmentCategory', 'SCRIPT_DOCUMENT');
        try {
          await fetchApi('/files/upload', {
            method: 'POST',
            body: uploadFd,
          });
        } catch (uploadErr) {
          console.warn('Task script document upload error:', uploadErr);
        }
      }

      setTaskScriptDocFile(null);
      setShowCreateModal(false);
      setTaskTitle('');
      setTaskDescription('');
      setSelectedParentId('');
      setSelectedParentProjectId('');
      
      setTaskClientId('');
      setTaskBrandId('');
      setTaskProductId('');
      setTaskCampaign('');
      setTaskObjective('');
      setTaskRemarks('');
      setTaskCreativeAssetName('');
      setTaskCreativePreviewUrl('');
      setTaskInfluencerTalent('');
      setTaskExactLocationAddress('');
      setTaskLocationAccessDetails('');
      setTaskLocationContact('');
      setTaskBackupLocation('');
      setTaskSpecialOutdoorRequirements('');
      setTaskEquipmentIds([]);
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
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'ASSIGNED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ACCEPTED':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-800 border-yellow-800';
      case 'ON_HOLD':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'WAITING_FOR_REVIEW':
      case 'WAITING_FOR_TECHNICAL_REVIEW':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'WAITING_FOR_MEDIA_REVIEW':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'REVISION_REQUESTED':
      case 'CHANGES_REQUESTED':
      case 'ON_REVISION':
        return 'bg-amber-50 text-amber-800 border-amber-500 font-extrabold shadow-sm animate-pulse';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleAcknowledgeAcceptance = async (taskId: string) => {
    try {
      const res = await fetchApi(`/tasks/${taskId}/accept`, { method: 'POST' });
      alert('Task assignment accepted and acknowledged successfully!');
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
    const taskObj = tasks.find((t) => t.id === taskId) || inspectedTask;
    const isAssigned = taskObj?.assignedEmployees?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const userAssignment = taskObj?.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const isNotAcceptedYet = isAssigned && userAssignment?.acceptanceStatus !== 'ACCEPTED' && user?.role !== 'ADMINISTRATOR' && (user?.role as string) !== 'ADMIN';

    if (isNotAcceptedYet) {
      alert('Task must be accepted before you can start work. Please click "Accept Task" first.');
      return;
    }

    try {
      await fetchApi(`/tasks/${taskId}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      alert('Task status updated to IN PROGRESS!');
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
    const taskObj = tasks.find((t) => t.id === taskId) || inspectedTask;
    const isAssigned = taskObj?.assignedEmployees?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const userAssignment = taskObj?.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const isNotAcceptedYet = isAssigned && userAssignment?.acceptanceStatus !== 'ACCEPTED' && user?.role !== 'ADMINISTRATOR' && (user?.role as string) !== 'ADMIN';

    if (isNotAcceptedYet) {
      alert('Task is in read-only mode. Please accept the task assignment before recording remarks.');
      return;
    }

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
    const isAssigned = uploadTask?.assignedEmployees?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const userAssignment = uploadTask?.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const isNotAcceptedYet = isAssigned && userAssignment?.acceptanceStatus !== 'ACCEPTED' && user?.role !== 'ADMINISTRATOR' && (user?.role as string) !== 'ADMIN';

    if (isNotAcceptedYet) {
      alert('Task is in read-only mode. Please accept the task assignment before uploading deliverables.');
      return;
    }

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
      alert('Deliverable output uploaded successfully! When ready, click "Request Technical Review" to submit for Technical Approval.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to upload deliverable');
    } finally {
      setUploadingDeliverable(false);
    }
  };

  

  const handleRequestTechnicalReview = async (taskId: string) => {
    const taskObj = tasks.find((t) => t.id === taskId) || inspectedTask;
    const isAssigned = taskObj?.assignedEmployees?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const userAssignment = taskObj?.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
    const isNotAcceptedYet = isAssigned && userAssignment?.acceptanceStatus !== 'ACCEPTED' && user?.role !== 'ADMINISTRATOR' && (user?.role as string) !== 'ADMIN';

    if (isNotAcceptedYet) {
      alert('Task is in read-only mode. Please accept the task assignment before requesting technical review.');
      return;
    }

    try {
      await fetchApi(`/tasks/${taskId}/request-technical-review`, {
        method: 'POST',
      });
      alert('Formal request for Technical Review & Approval sent to Technical Managers! Task status updated to WAITING FOR TECHNICAL REVIEW.');
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
      alert(`Technical Review decision (${status}) recorded successfully!`);
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
    <RouteGuard module="TASKS">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" /> Tasks
          </h1>
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

      {/* User-Friendly Project-Style Filter Panel */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 text-xs shadow-md">
        {/* Top Search & Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks by ID, Title, Client, Brand, Product, Project, Script, Staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl pl-9 pr-8 py-2.5 text-slate-900 font-medium focus:outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-900"
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
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
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
                className="px-3 py-2 bg-rose-50 hover:bg-red-900/60 border border-rose-200 text-rose-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Quick Status Filter Tabs */}
        {user?.role === 'STAFF' ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-200">
            <span className="text-slate-500 font-bold text-[10px] uppercase mr-1">Filter Tasks:</span>
            {(() => {
              const allCount = visibleTasks.length;
              const acceptedCount = visibleTasks.filter((t) => {
                const userAssignment = t.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
                return userAssignment?.acceptanceStatus === 'ACCEPTED' || t.status === 'ACCEPTED' || t.status === 'IN_PROGRESS' || t.status === 'COMPLETED';
              }).length;
              const pendingCount = visibleTasks.filter((t) => {
                const userAssignment = t.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
                return userAssignment?.acceptanceStatus !== 'ACCEPTED' && t.status !== 'COMPLETED';
              }).length;

              const staffTabs = [
                { id: 'ALL', label: 'All Tasks', count: allCount, activeClass: 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30' },
                { id: 'ACCEPTED', label: 'Accepted', count: acceptedCount, activeClass: 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/30' },
                { id: 'PENDING', label: 'Pending', count: pendingCount, activeClass: 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/30' },
              ];

              return staffTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    statusFilter === tab.id
                      ? tab.activeClass
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    statusFilter === tab.id ? 'bg-black/20 text-inherit' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ));
            })()}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-200">
            <span className="text-slate-500 font-bold text-[10px] uppercase mr-1">Status:</span>
            {['ALL', 'PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD', 'WAITING_FOR_REVIEW', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}

        {/* Active Filter Chips / Pills */}
        {(selectedClient || selectedBrand || selectedProduct || selectedProject || selectedEmployee || selectedPriority) && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200">
            <span className="text-slate-400 text-[11px] font-semibold">Active Filters:</span>
            {selectedClient && (
              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full flex items-center gap-1 text-[11px]">
                Client: {clientsList.find((c) => c.id === selectedClient)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setSelectedClient('')} />
              </span>
            )}
            {selectedBrand && (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1 text-[11px]">
                Brand: [{brandsList.find((b) => b.id === selectedBrand)?.shortCode}] {brandsList.find((b) => b.id === selectedBrand)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setSelectedBrand('')} />
              </span>
            )}
            {selectedProduct && (
              <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full flex items-center gap-1 text-[11px]">
                Product: {productsList.find((p) => p.id === selectedProduct)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setSelectedProduct('')} />
              </span>
            )}
            {selectedProject && (
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1 text-[11px]">
                Project: {projectsList.find((p) => p.id === selectedProject)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setSelectedProject('')} />
              </span>
            )}
            {selectedEmployee && (
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1 text-[11px]">
                Staff: {staffUsersList.find((u) => u.id === selectedEmployee)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setSelectedEmployee('')} />
              </span>
            )}
            {selectedPriority && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full flex items-center gap-1 text-[11px]">
                Priority: {selectedPriority}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setSelectedPriority('')} />
              </span>
            )}
          </div>
        )}

        {/* Expandable Grouped Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Group 1: Commercial Context */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-purple-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" /> Commercial Context
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedClient}
                    onChange={(e) => {
                      setSelectedClient(e.target.value);
                      setSelectedBrand('');
                      setSelectedProduct('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white font-medium"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white font-medium"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white font-medium"
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
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-blue-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Project &amp; Staff
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
                  >
                    <option value="">All Parent Projects</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.projectId})</option>
                    ))}
                  </select>

                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
                  >
                    <option value="">All Assigned Staff</option>
                    {staffUsersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 3: Priority */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-amber-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600" /> Priority Level
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white font-medium"
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
        <div className="p-12 text-center text-slate-500 font-mono text-xs animate-pulse">
          Loading Tasks Directory...
        </div>
      ) : (
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xs">
          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <thead className="bg-slate-50/60 text-slate-500 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200">
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
              <tbody className="divide-y divide-gray-800/40 text-slate-800">
                {(() => {
                  const filteredAndSorted = sortData(
                    visibleTasks.filter((t) => {
                      if (user?.role === 'STAFF') {
                        const userAssignment = t.assignedEmployees?.find((a: any) => a.userId === user?.id || a.user?.id === user?.id);
                        const isAccepted = userAssignment?.acceptanceStatus === 'ACCEPTED' || t.status === 'ACCEPTED' || t.status === 'IN_PROGRESS' || t.status === 'COMPLETED';
                        const isPending = userAssignment?.acceptanceStatus !== 'ACCEPTED' && t.status !== 'COMPLETED';

                        if (statusFilter === 'ACCEPTED') return isAccepted;
                        if (statusFilter === 'PENDING') return isPending;
                        return true;
                      }
                      return statusFilter === 'ALL' || t.status === statusFilter;
                    }),
                    sortBy,
                    sortOrder
                  );
                  const paginated = paginate(filteredAndSorted);
                  if (paginated.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-slate-400 italic font-mono text-xs">
                          No matching tasks found. Adjust active filters to view records.
                        </td>
                      </tr>
                    );
                  }
                  return paginated.map((task) => (
                    <tr key={task.id} id={task.id} className="hover:bg-slate-50/40 transition-colors border-b border-slate-200 last:border-0">
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
                              <span className="font-mono text-[9px] text-blue-600 font-bold bg-blue-50 border border-blue-200 px-1 py-0.2 rounded shrink-0">
                                {task.taskId}
                              </span>
                              {(() => {
                                const typeInfo = getTaskTypeInfo(task);
                                const TypeIcon = typeInfo.icon;
                                return (
                                  <span className={`font-mono text-[9px] font-bold border px-1.5 py-0.2 rounded-full shrink-0 flex items-center gap-1 shadow-xs ${typeInfo.badgeClass}`}>
                                    <TypeIcon className="w-2.5 h-2.5" />
                                    {typeInfo.shortLabel}
                                  </span>
                                );
                              })()}
                              {isTaskRevision(task) && (
                                <span className="font-mono text-[9px] text-amber-800 font-extrabold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 shadow-md shadow-amber-900/50 animate-pulse">
                                  ON REVISION {task.revisionCount ? `#${task.revisionCount}` : (task.revisions?.length ? `#${task.revisions.length}` : '')}
                                </span>
                              )}
                              <span className="font-semibold text-slate-900 text-xs truncate">{task.title}</span>
                            </div>
                            {task.description && (
                              <p className="text-[10px] text-slate-500 font-normal truncate">
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
                            <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-mono text-[9px] inline-block shrink-0 group-hover:border-purple-500 group-hover:text-slate-900 transition-colors">
                              Script Task {task.project ? `• ${task.project.name}` : ''}
                            </span>
                            <div className="text-slate-800 group-hover:text-purple-700 font-medium text-[11px] truncate transition-colors">{task.script.name}</div>
                          </Link>
                        ) : task.sourceType === 'SCRIPT' ? (
                          <div className="space-y-0.5 min-w-0">
                            <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-mono text-[9px] inline-block shrink-0">
                              Script Task {task.project ? `• ${task.project.name}` : ''}
                            </span>
                            <div className="text-slate-800 font-medium text-[11px] truncate">{task.title}</div>
                          </div>
                        ) : task.graphicRequirement ? (
                          <div className="space-y-0.5 min-w-0">
                            <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-mono text-[9px] inline-block shrink-0">
                              Graphic Req {task.project ? `• ${task.project.name}` : ''}
                            </span>
                            <div className="text-slate-800 font-medium text-[11px] truncate">{task.graphicRequirement.name}</div>
                          </div>
                        ) : task.project ? (
                          <div className="space-y-0.5 min-w-0">
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono text-[9px] inline-block shrink-0">
                              Shoot Project
                            </span>
                            <div className="text-slate-800 font-medium text-[11px] truncate">{task.project.name}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px] font-mono">Standalone Task</span>
                        )}
                      </td>

                      {/* Assigned Staff */}
                      <td className="px-3 py-3 min-w-0">
                        {task.assignedEmployees?.length === 0 ? (
                          <span className="text-slate-400 italic text-[10px] font-mono">Unassigned</span>
                        ) : (
                          <div className="space-y-0.5 min-w-0">
                            {task.assignedEmployees?.map((a: any) => (
                              <div key={a.id} className="flex items-center gap-1 min-w-0">
                                <span className="font-medium text-slate-800 text-[11px] truncate">{a.user?.name}</span>
                                <span
                                  className={`text-[8px] font-mono px-1 rounded border shrink-0 ${
                                    a.acceptanceStatus === 'ACCEPTED'
                                      ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                                      : 'text-amber-600 border-amber-200 bg-amber-50'
                                  }`}
                                >
                                  {a.acceptanceStatus === 'ACCEPTED' ? 'Accepted' : 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Hours */}
                      <td className="px-2 py-3 font-mono text-[11px] font-semibold text-slate-700">
                        {task.estimatedHours}h
                      </td>

                      {/* Progress */}
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-500 font-semibold">
                            <span>{task.completionPercentage || 0}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${Math.min(task.completionPercentage || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 min-w-0">
                        {isTaskRevision(task) && task.status !== 'COMPLETED' ? (
                          <span className="px-2 py-0.5 rounded-full font-mono text-[8px] font-extrabold uppercase tracking-wide border inline-block truncate max-w-full bg-amber-50 text-amber-800 border-amber-500 shadow-sm animate-pulse">
                            ON REVISION {task.revisionCount ? `#${task.revisionCount}` : ''}
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
                                  Accept Task
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
                                    className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-600/30 text-amber-800 border border-amber-200 rounded text-[10px] font-medium transition-colors flex items-center gap-1 shadow"
                                    title="Change Task Status to In Progress"
                                  >
                                    Start In Progress
                                  </button>
                                )}

                                {/* Actions locked when task is under review */}
                                {['WAITING_FOR_TECHNICAL_REVIEW', 'TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'MEDIA_MANAGER_REVIEW', 'WAITING_FOR_REVIEW', 'PENDING_MARKETING_APPROVAL', 'WAITING_FOR_MARKETING_APPROVAL', 'PENDING_CLIENT_APPROVAL', 'PENDING_CLIENT_REVIEW', 'WAITING_FOR_CLIENT_CONFIRMATION', 'COMPLETED'].includes(task.status) ? (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-mono text-[9px] font-bold flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-amber-600" />
                                    {task.status === 'COMPLETED' ? 'Completed' : 'Under Review (Read-Only)'}
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => openUpdateTaskModal(task)}
                                      className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-amber-800 border border-slate-200 hover:border-amber-200 rounded text-[10px] font-medium transition-colors"
                                      title="Update Task Status & Progress"
                                    >
                                      Update
                                    </button>

                                    {/* Upload Deliverables Action */}
                                    {['IN_PROGRESS', 'ON_HOLD'].includes(task.status) && (
                                      <button
                                        onClick={() => setUploadTask(task)}
                                        className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-cyan-700 border border-slate-200 hover:border-cyan-200 rounded text-[10px] font-medium transition-colors"
                                        title="Upload Deliverable Output"
                                      >
                                        Deliverable
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
                                                alert('Script successfully submitted for Technical Review!');
                                                loadData();
                                              })
                                              .catch((err) => alert(err.message || 'Failed to submit script for technical review'));
                                          } else {
                                            handleRequestTechnicalReview(task.id);
                                          }
                                        }}
                                        className="px-1.5 py-0.5 bg-purple-900/40 hover:bg-purple-800/60 text-purple-700 border border-purple-300 rounded text-[10px] font-bold transition-all shadow"
                                        title="Submit for Technical Review & Approval"
                                      >
                                        Tech Review
                                      </button>
                                    )}
                                  </>
                                )}
                              </>
                            );
                          })()}

                          <button
                            onClick={() => setInspectedTask(task)}
                            className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-200 rounded text-[10px] font-medium transition-colors"
                          >
                            Inspect
                          </button>

                          {user?.role === 'MEDIA_MANAGER' && (
                            <button
                              onClick={() => openReassignDrawer(task)}
                              className="px-1.5 py-0.5 bg-purple-50 hover:bg-purple-900/60 text-purple-700 border border-purple-200 rounded text-[10px] font-medium transition-colors"
                              title="Reassign Task"
                            >
                              Reassign
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

      {/* Create Task Modal with Task Type Selector */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl p-6 sm:p-8 space-y-6 text-sm shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                  <CheckSquare className="w-5 h-5 text-blue-600" /> Create Task
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center font-bold text-base transition-colors"
                title="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-6">
              {/* Task Type Segmented Selector */}
              <div>
                <label className="block text-slate-600 font-bold mb-2 text-xs uppercase tracking-wider">
                  Task Type / Workflow Origin *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">

                  <button
                    type="button"
                    onClick={() => {
                      setParentEntityType('PROJECT');
                      setSelectedParentId('');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      parentEntityType === 'PROJECT'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Camera className="w-4 h-4 shrink-0" />
                    <span>Shoot Project</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setParentEntityType('GRAPHIC_REQ');
                      setSelectedParentId('');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      parentEntityType === 'GRAPHIC_REQ'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>Graphic Req</span>
                  </button>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════════════════════ */}
              {/* FORM TYPE 1: GRAPHIC REQUIREMENT CREATION (100% Matching Event Creation)   */}
              {/* ══════════════════════════════════════════════════════════════════════════ */}
              {parentEntityType === 'GRAPHIC_REQ' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Section 1: Core Entity Details */}
                  <div className="space-y-4 bg-slate-50/70 p-5 sm:p-6 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Section 1 • Core Requirement Details *
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Requirement Name / Title *</label>
                        <input
                          type="text"
                          required
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder="e.g. Product Banner Graphic"
                          className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg p-2.5 text-slate-800 font-medium text-sm transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Client *</label>
                        <select
                          required
                          value={taskClientId}
                          onChange={(e) => {
                            setTaskClientId(e.target.value);
                            setTaskBrandId('');
                            setTaskProductId('');
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg p-2.5 text-slate-800 font-semibold text-sm transition-colors"
                        >
                          <option value="">Select Active Client</option>
                          {clientsList.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Brand *</label>
                        <select
                          required
                          value={taskBrandId}
                          onChange={(e) => {
                            setTaskBrandId(e.target.value);
                            setTaskProductId('');
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg p-2.5 text-slate-800 font-semibold text-sm transition-colors"
                        >
                          <option value="">Select Active Brand</option>
                          {brandsList
                            .filter((b) => !taskClientId || b.clientId === taskClientId)
                            .map((b) => (
                              <option key={b.id} value={b.id}>[{b.shortCode}] {b.name}</option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Product (Optional)</label>
                        <select
                          value={taskProductId}
                          onChange={(e) => setTaskProductId(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-lg p-2.5 text-slate-800 text-sm transition-colors"
                        >
                          <option value="">None / General Requirement</option>
                          {productsList
                            .filter((p) => !taskBrandId || p.brandId === taskBrandId)
                            .map((p) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.productCode})</option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Campaign (Optional)</label>
                        <input
                          type="text"
                          value={taskCampaign}
                          onChange={(e) => setTaskCampaign(e.target.value)}
                          placeholder="e.g. Q3 Launch Campaign"
                          className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-lg p-2.5 text-slate-800 text-sm transition-colors"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Parent Shoot Project (Optional)</label>
                        <select
                          value={selectedParentProjectId}
                          onChange={(e) => setSelectedParentProjectId(e.target.value)}
                          className="w-full bg-white border border-purple-200 focus:border-purple-500 rounded-lg p-2.5 text-slate-800 font-medium text-sm transition-colors"
                        >
                          <option value="">-- Independent Graphic Requirement (No Parent Project) --</option>
                          {projectsList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.projectId || 'SP'} • {p.name} ({p.client?.name || 'Client'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Graphic Requirement Details */}
                  <div className="space-y-4 bg-amber-50/60 p-5 sm:p-6 rounded-xl border border-amber-200 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-600" /> Section 2 • Graphic Requirement Details *
                      </span>
                      <span className="font-mono text-xs bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300 text-amber-800 font-bold">
                        ID: GR-AUTO
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-slate-800 font-bold block mb-1.5 text-xs">Requirement Type *</label>
                        <select
                          required
                          value={taskContentType}
                          onChange={(e) => setTaskContentType(e.target.value)}
                          className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-lg p-2.5 text-slate-800 font-bold text-sm"
                        >
                          <option value="Poster">Poster</option>
                          <option value="Carousel">Carousel Post</option>
                          <option value="Story">Story Design</option>
                          <option value="Banner">Web / Social Banner</option>
                          <option value="Thumbnail">Video Thumbnail</option>
                          <option value="Social Media Post">Social Media Post</option>
                          <option value="Motion Graphic">Motion Graphic</option>
                          <option value="Infographic">Infographic</option>
                          <option value="Header">Header / Cover</option>
                          <option value="Custom">Custom Design</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-800 font-bold block mb-1.5 text-xs">Target Platform *</label>
                        <select
                          required
                          value={taskPlatform}
                          onChange={(e) => setTaskPlatform(e.target.value)}
                          className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-lg p-2.5 text-slate-800 font-bold text-sm"
                        >
                          <option value="Instagram">Instagram</option>
                          <option value="Facebook">Facebook</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="YouTube">YouTube</option>
                          <option value="Twitter/X">Twitter / X</option>
                          <option value="Website">Website</option>
                          <option value="Print">Print Media</option>
                          <option value="Multi-Platform">Multi-Platform</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-800 font-bold block mb-1.5 text-xs">Priority *</label>
                        <select
                          required
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-lg p-2.5 text-slate-800 font-semibold text-sm"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Urgent</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-800 font-bold block mb-1.5 text-xs">Target Completion Date *</label>
                        <input
                          type="date"
                          required
                          value={taskDueDate}
                          onChange={(e) => setTaskDueDate(e.target.value)}
                          className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-lg p-2.5 text-slate-800 font-bold text-sm"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-slate-800 font-bold block mb-1.5 text-xs">Objective / Design Brief *</label>
                        <input
                          type="text"
                          required
                          value={taskObjective}
                          onChange={(e) => setTaskObjective(e.target.value)}
                          placeholder="e.g. Promote summer sale discount with vibrant product showcase"
                          className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-lg p-2.5 text-slate-800 font-medium text-sm"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-3">
                        <label className="text-slate-700 font-semibold block mb-1.5 text-xs">Remarks &amp; Special Instructions (Optional)</label>
                        <textarea
                          rows={2}
                          value={taskRemarks}
                          onChange={(e) => setTaskRemarks(e.target.value)}
                          placeholder="Enter any permanent remarks, references, or special instructions..."
                          className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-lg p-2.5 text-slate-800 text-sm"
                        ></textarea>
                      </div>
                    </div>

                    {/* Produced Deliverables Formats Selection */}
                    <div className="p-4 bg-white/80 border border-amber-200/80 rounded-xl space-y-2.5">
                      <label className="text-slate-800 font-bold block text-xs">
                        Produced Deliverables (Click to select/deselect deliverable formats to generate) *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Poster' },
                          { name: 'Story' },
                          { name: 'Carousel' },
                          { name: 'Thumbnail' },
                          { name: 'Banner' },
                          { name: 'Motion Graphic' },
                          { name: 'Social Media Post' },
                          { name: 'Advertisement' },
                          { name: 'Packaging Design' },
                          { name: 'Website Creative' },
                        ].map((del) => {
                          const isSelected = (taskSelectedDeliverables || ['Poster', 'Story']).includes(del.name);
                          return (
                            <button
                              key={del.name}
                              type="button"
                              onClick={() => {
                                const current = taskSelectedDeliverables || ['Poster', 'Story'];
                                const next = isSelected
                                  ? current.filter((d) => d !== del.name)
                                  : [...current, del.name];
                                setTaskSelectedDeliverables(next);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-amber-500 text-gray-950 border-amber-400 font-bold shadow-md scale-[1.02]'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              <span>{del.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Graphic Deliverables Complete */}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════════════════ */}
              {/* FORM TYPE 2: SHOOT PROJECT CREATION (100% Matching Event Creation)        */}
              {/* ══════════════════════════════════════════════════════════════════════════ */}
              {parentEntityType === 'PROJECT' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Section 1: Core Shoot Details */}
                  <div className="space-y-4 bg-slate-50/70 p-5 sm:p-6 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Section 1 • Core Project Details *
                      </span>
                      <span className="font-mono text-xs bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 text-blue-800 font-bold">
                        ID: SP-AUTO
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Parent Shoot Project (Optional Link / Base Project)</label>
                        <select
                          value={selectedParentProjectId}
                          onChange={(e) => setSelectedParentProjectId(e.target.value)}
                          className="w-full bg-white border border-blue-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-medium text-sm transition-colors"
                        >
                          <option value="">-- New Independent Shoot Project (No Parent Project) --</option>
                          {projectsList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.projectId || 'SP'} • {p.name} ({p.client?.name || 'Client'}) - {p.status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Project Name *</label>
                        <input
                          type="text"
                          required
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder="e.g. Summer Collection Outdoor Shoot"
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-medium text-sm transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Client *</label>
                        <select
                          required
                          value={taskClientId}
                          onChange={(e) => {
                            setTaskClientId(e.target.value);
                            setTaskBrandId('');
                            setTaskProductId('');
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-semibold text-sm transition-colors"
                        >
                          <option value="">Select Active Client</option>
                          {clientsList.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Brand *</label>
                        <select
                          required
                          value={taskBrandId}
                          onChange={(e) => {
                            setTaskBrandId(e.target.value);
                            setTaskProductId('');
                          }}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-semibold text-sm transition-colors"
                        >
                          <option value="">Select Active Brand</option>
                          {brandsList
                            .filter((b) => !taskClientId || b.clientId === taskClientId)
                            .map((b) => (
                              <option key={b.id} value={b.id}>[{b.shortCode}] {b.name}</option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Product (Optional)</label>
                        <select
                          value={taskProductId}
                          onChange={(e) => setTaskProductId(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 text-sm transition-colors"
                        >
                          <option value="">None / General Shoot</option>
                          {productsList
                            .filter((p) => !taskBrandId || p.brandId === taskBrandId)
                            .map((p) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.productCode})</option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Campaign (Optional)</label>
                        <input
                          type="text"
                          value={taskCampaign}
                          onChange={(e) => setTaskCampaign(e.target.value)}
                          placeholder="e.g. Q3 Launch Campaign"
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 text-sm transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Project Shoot Base Details */}
                  <div className="space-y-4 bg-slate-50/70 p-5 sm:p-6 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                      Section 2 • Project Shoot Base Details *
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Shoot Type *</label>
                        <select
                          required
                          value={taskShootType}
                          onChange={(e) => setTaskShootType(e.target.value)}
                          className="w-full bg-white border border-blue-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-bold text-sm"
                        >
                          <option value="INDOOR">Indoor Shoot</option>
                          <option value="OUTDOOR">Outdoor Shoot</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Shoot Date *</label>
                        <input
                          type="date"
                          required
                          value={taskShootDate}
                          onChange={(e) => setTaskShootDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-semibold text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Estimated Completion Date *</label>
                        <input
                          type="date"
                          required
                          value={taskDueDate}
                          onChange={(e) => setTaskDueDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-semibold text-sm"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Shoot Location *</label>
                        <input
                          type="text"
                          required
                          value={taskLocation}
                          onChange={(e) => setTaskLocation(e.target.value)}
                          placeholder="e.g. Main Studio Floor or Kozhikode Beach"
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Location Category *</label>
                        <select
                          value={taskLocationCategory}
                          onChange={(e) => setTaskLocationCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-semibold text-sm"
                        >
                          <option value="Studio Bay">Studio Bay</option>
                          <option value="Main Studio Floor">Main Studio Floor</option>
                          <option value="On-Location">On-Location</option>
                          <option value="Client Premises">Client Premises</option>
                          <option value="Outdoor Landmark">Outdoor Landmark</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Reporting Time (Call Time) *</label>
                        <input
                          type="text"
                          required
                          value={taskCallTime}
                          onChange={(e) => setTaskCallTime(e.target.value)}
                          placeholder="09:00 AM"
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Expected Wrap-up Time *</label>
                        <input
                          type="text"
                          required
                          value={taskExpectedWrapTime}
                          onChange={(e) => setTaskExpectedWrapTime(e.target.value)}
                          placeholder="06:00 PM"
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Influencer / Talent *</label>
                        <input
                          type="text"
                          required
                          value={taskInfluencerTalent}
                          onChange={(e) => setTaskInfluencerTalent(e.target.value)}
                          placeholder="e.g. Model Name / Talent Contact"
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Project Priority *</label>
                        <select
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-semibold text-sm"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Urgent</option>
                        </select>
                      </div>

                      <div className="col-span-1 sm:col-span-3">
                        <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Notes / Production Brief (Optional)</label>
                        <textarea
                          rows={2}
                          value={taskDescription}
                          onChange={(e) => setTaskDescription(e.target.value)}
                          placeholder="Enter production brief, shot list notes, client instructions..."
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-slate-800 font-medium text-sm"
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  {/* Section 2b: Outdoor Shoot Details */}
                  {(taskShootType === 'OUTDOOR' || taskShootType === 'Outdoor Shoot') && (
                    <div className="space-y-4 bg-purple-50/70 p-5 sm:p-6 rounded-xl border border-purple-200 text-sm">
                      <span className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-purple-600" /> --- OUTDOOR SHOOT DETAILS ---
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-1 sm:col-span-2">
                          <label className="text-slate-800 font-bold block mb-1.5 text-xs">Exact Location / Address *</label>
                          <input
                            type="text"
                            required
                            value={taskExactLocationAddress}
                            onChange={(e) => setTaskExactLocationAddress(e.target.value)}
                            placeholder="e.g. Kozhikode Beach, Kozhikode, Kerala"
                            className="w-full bg-white border border-purple-200 focus:border-purple-500 rounded-lg p-2.5 text-slate-800 font-medium text-sm"
                          />
                        </div>

                        <div className="col-span-1 sm:col-span-2">
                          <label className="text-slate-800 font-bold block mb-1.5 text-xs">Location Access Details *</label>
                          <textarea
                            rows={2}
                            required
                            value={taskLocationAccessDetails}
                            onChange={(e) => setTaskLocationAccessDetails(e.target.value)}
                            placeholder="e.g. Parking availability, entry point, road access, restricted access notes..."
                            className="w-full bg-white border border-purple-200 focus:border-purple-500 rounded-lg p-2.5 text-slate-800 text-sm"
                          ></textarea>
                        </div>

                        <div>
                          <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Location Contact</label>
                          <input
                            type="text"
                            value={taskLocationContact}
                            onChange={(e) => setTaskLocationContact(e.target.value)}
                            placeholder="Contact Name / Phone / Manager"
                            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Expected Weather Conditions</label>
                          <select
                            value={taskExpectedWeatherConditions}
                            onChange={(e) => setTaskExpectedWeatherConditions(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 font-semibold text-sm"
                          >
                            <option value="Sunny">Sunny</option>
                            <option value="Cloudy">Cloudy</option>
                            <option value="Rain Expected">Rain Expected</option>
                            <option value="Windy">Windy</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Backup Location</label>
                          <input
                            type="text"
                            value={taskBackupLocation}
                            onChange={(e) => setTaskBackupLocation(e.target.value)}
                            placeholder="e.g. Indoor Studio 4"
                            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 text-sm"
                          />
                        </div>

                        <div className="col-span-1 sm:col-span-2">
                          <label className="text-slate-700 block mb-1.5 font-semibold text-xs">Special Outdoor Requirements</label>
                          <textarea
                            rows={2}
                            value={taskSpecialOutdoorRequirements}
                            onChange={(e) => setTaskSpecialOutdoorRequirements(e.target.value)}
                            placeholder="Power, tents, transport, safety gear, drone permissions..."
                            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 text-sm"
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SCRIPT DOCUMENT UPLOAD (OPTIONAL) */}
              <div className="space-y-3 bg-purple-50/50 p-5 rounded-xl border border-purple-200 text-xs">
                <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                  <span className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" /> Script Document (Optional)
                  </span>
                  <span className="text-[10px] text-purple-800 font-mono bg-purple-100 px-2 py-0.5 rounded border border-purple-200 font-bold">
                    PDF / DOC / DOCX / TXT
                  </span>
                </div>
                <div>
                  <label className="text-slate-800 font-bold block mb-1.5 text-xs">
                    Upload Script File (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="taskScriptDocInput"
                      accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={(e) => setTaskScriptDocFile(e.target.files?.[0] || null)}
                      className="text-xs text-slate-700 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
                    />
                    {taskScriptDocFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setTaskScriptDocFile(null);
                          const input = document.getElementById('taskScriptDocInput') as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Attach an optional script document (PDF, Word, Text) for this task. Marketing Managers can review and update scripts as needed.
                  </p>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════════════════════ */}

              <div className="sticky bottom-0 bg-slate-50/95 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-4 sm:p-5 border-t border-slate-200 flex items-center justify-between gap-4 z-20 backdrop-blur-xs">
                <span className="text-xs text-slate-500 font-mono">
                  <span className="text-emerald-600 font-bold">Ready to Create Task</span>
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors text-xs sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creating ? 'Creating Task...' : 'Create Task'}
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4 text-xs shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-600" /> Reassign Task: {selectedTask.taskId}
              </h3>
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setRecommendations(null);
                  setTargetUserIds([]);
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center font-bold text-sm transition-colors"
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Flowchart: Current Employee -> Over Capacity -> Recommended Employees */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Current Employee</span>
                  <strong className="text-slate-900 text-sm">{recommendations?.currentAssigned?.join(', ') || 'Currently Assigned Staff'}</strong>
                </div>
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full text-rose-700 font-bold text-[10px]">
                  Over Capacity
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold py-0.5">
                <span>System Generated Recommendations (No Work Transferred Automatically)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 max-h-72 overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h4 className="font-bold text-amber-600 flex items-center gap-1.5 text-xs">
                  Recommended Alternative Employees
                </h4>
                <span className="text-[9px] text-slate-500 font-mono">Media Manager Decision Required</span>
              </div>

              <div className="space-y-2">
                {!recommendations?.recommendations || recommendations.recommendations.length === 0 ? (
                  <p className="text-slate-400 italic p-2 text-center">Loading employee recommendations...</p>
                ) : (
                  recommendations.recommendations.map((rec: any) => (
                    <label
                      key={rec.userId}
                      className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        targetUserIds.includes(rec.userId)
                          ? 'bg-blue-50 border-blue-500 shadow-md shadow-blue-600/20'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-200'
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
                            <span className="font-bold text-slate-900 text-xs">{rec.name}</span>
                            <span className="text-[10px] text-slate-500">({rec.designation})</span>
                            {rec.isAlreadyOnProject && (
                              <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">
                                On Project
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-700 leading-snug">{rec.reason}</p>
                        </div>
                      </div>

                      <div className="text-right space-y-1 font-mono">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[11px] block">
                          {rec.availablePercentage}% Available
                        </span>
                        <span className="text-[9px] text-slate-400 block">{rec.remainingHours}h / {rec.capacityHours}h free</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Optional Reassignment Reason Input */}
            <div className="space-y-1">
              <label className="block text-slate-700 font-semibold text-[11px]">
                Reassignment Reason (Preserved in Permanent Timeline History)
              </label>
              <input
                type="text"
                placeholder="e.g. Ahmed exceeded daily capacity."
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedTask(null);
                  setRecommendations(null);
                  setTargetUserIds([]);
                  setReassignReason('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors text-xs"
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

      {/* Upload Deliverable Modal */}
      {uploadTask && (
        <div
          onClick={() => setUploadTask(null)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4 text-xs shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Upload Deliverable: {uploadTask.taskId}
              </h3>
              <button
                type="button"
                onClick={() => setUploadTask(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center font-bold text-sm transition-colors"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
              <strong>Active Deliverable Rule:</strong> Uploading a new file will set it as the single active deliverable (Version v{(uploadTask.activeDeliverableVersion || 0) + 1}). All previous versions remain saved in the timeline history.
            </div>

            <form onSubmit={handleUploadDeliverable} className="space-y-3">
              <div>
                <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Deliverable File URL or Cloud Link *</label>
                <input
                  type="url"
                  required
                  placeholder="https://cdn.moms.com/deliverables/video_cut_v2.mp4"
                  value={uploadFileUrl}
                  onChange={(e) => setUploadFileUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Original File Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Video_Editing_Final_Export_v2.mp4"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setUploadTask(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors"
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto"
          >
            {
            (() => {
                const activeGraphicReq = fullGraphicReq || inspectedTask.graphicRequirement;
                const graphicReqId = activeGraphicReq?.reqId || activeGraphicReq?.id || inspectedTask.graphicRequirementId;
                const linkedProject = inspectedTask.project || inspectedTask.graphicRequirement?.project || activeGraphicReq?.project;
                const linkedCalEvent = inspectedTask.project?.calendarEvent || inspectedTask.graphicRequirement?.calendarEvent || activeGraphicReq?.calendarEvent || inspectedTask.calendarEvent;
                const linkedOutdoor = inspectedTask.project?.outdoorDetails || linkedProject?.outdoorDetails;
                const linkedIndoor = inspectedTask.project?.indoorDetails || linkedProject?.indoorDetails;
                const linkedEquipment = inspectedTask.project?.equipmentReservations || linkedProject?.equipmentReservations || [];
                const linkedTeam = inspectedTask.project?.assignedTeam || linkedProject?.assignedTeam || [];
                const clientObj = inspectedTask.client || linkedProject?.client || inspectedTask.graphicRequirement?.client || activeGraphicReq?.client ;
                const brandObj = inspectedTask.brand || linkedProject?.brand || inspectedTask.graphicRequirement?.brand || activeGraphicReq?.brand ;
                const productObj = inspectedTask.product || linkedProject?.product || inspectedTask.graphicRequirement?.product || activeGraphicReq?.product ;
                const createdByObj = inspectedTask.createdBy || inspectedTask.project?.createdBy || linkedCalEvent?.createdBy || inspectedTask.graphicRequirement?.createdBy || activeGraphicReq?.createdBy;
                const shootDateVal = inspectedTask.project?.shootDate || linkedCalEvent?.shootDate;
                const callTimeVal = linkedOutdoor?.callTime || linkedIndoor?.reportingTime || linkedCalEvent?.startTime || inspectedTask.project?.reportingTime;
                const wrapTimeVal = linkedOutdoor?.expectedWrapTime || linkedIndoor?.wrapUpTime || linkedCalEvent?.endTime || inspectedTask.project?.expectedWrapUpTime;
                const formatVal = linkedCalEvent?.contentType || inspectedTask.graphicRequirement?.requirementType || activeGraphicReq?.requirementType || inspectedTask.contentType;
                const platformVal = linkedCalEvent?.platform || inspectedTask.platform;
                const campaignVal = linkedCalEvent?.campaign || linkedProject?.campaign?.name || inspectedTask.campaign;
                const talentVal = linkedProject?.influencerTalent || linkedCalEvent?.influencerTalent;
                const creativeUrlVal = linkedCalEvent?.creativePreviewUrl || inspectedTask.creativePreviewUrl || activeGraphicReq?.creativePreviewUrl || (activeGraphicReq?.files || []).find((f: any) => f.storagePath?.startsWith('http') || f.fileType === 'URL')?.storagePath;
                const creativeAssetNameVal = linkedCalEvent?.creativeAssetName || inspectedTask.creativeAssetName || activeGraphicReq?.creativeAssetName || (activeGraphicReq?.files || []).find((f: any) => f.storagePath?.startsWith('http') || f.fileType === 'URL')?.fileName || 'Primary Creative Visual Asset';
                const notesVal = inspectedTask.project?.notes || linkedCalEvent?.productionNotes || inspectedTask.graphicRequirement?.remarks || activeGraphicReq?.remarks || inspectedTask.remarks;
                const isOutdoor = (inspectedTask.project?.shootType === 'OUTDOOR' || Boolean(linkedOutdoor));
                const isGraphicReqTask = Boolean(
                  inspectedTask?.graphicRequirement ||
                  activeGraphicReq ||
                  inspectedTask?.graphicRequirementId ||
                  inspectedTask?.sourceType === 'GRAPHIC_REQUIREMENT' ||
                  inspectedTask?.sourceType === 'GRAPHIC' ||
                  inspectedTask?.taskType === 'GRAPHIC_REQUIREMENT' ||
                  inspectedTask?.taskType === 'GRAPHIC'
                );

                const parentAssetFiles = (() => {
                  const filesList: any[] = [];
                  const seenIds = new Set<string>();

                  const addFile = (f: any, sourceLabel: string) => {
                    if (!f) return;
                    const fId = f.id || f.storagePath || f.fileName;
                    if (fId && !seenIds.has(fId)) {
                      seenIds.add(fId);
                      filesList.push({
                        ...f,
                        sourceLabel,
                      });
                    }
                  };

                  if (isGraphicReqTask) {
                    (activeGraphicReq?.files || inspectedTask.graphicRequirement?.files || []).forEach((f: any) =>
                      addFile(f, 'Graphic Requirement Asset')
                    );
                  } else {
                    (inspectedTask.project?.files || linkedProject?.files || []).forEach((f: any) =>
                      addFile(f, 'Event Creation Asset')
                    );
                  }

                  return filesList;
                })();

                return (
                  <>
                    {/* Modal Header */}
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-blue-600 font-bold text-xs block">Task ID: {inspectedTask.taskId}</span>
                          {(() => {
                            const typeInfo = getTaskTypeInfo(inspectedTask);
                            const TypeIcon = typeInfo.icon;
                            return (
                              <span className={`px-2.5 py-0.5 rounded-full font-mono font-extrabold text-[10px] border flex items-center gap-1.5 shadow-xs ${typeInfo.badgeClass}`}>
                                <TypeIcon className="w-3 h-3" />
                                {typeInfo.label}
                              </span>
                            );
                          })()}
                          {isGraphicReqTask && graphicReqId && (
                            <span className="font-mono text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <Palette className="w-3 h-3 text-amber-600" />
                              Requirement: {activeGraphicReq?.reqId || (typeof graphicReqId === 'string' && graphicReqId.startsWith('GR-') ? graphicReqId : `GR-${inspectedTask.taskId}`)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mt-0.5">{inspectedTask.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {Boolean(inspectedTask.revisionCount || inspectedTask.revisions?.length) && (
                            <span className="font-mono text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              Revisions: {inspectedTask.revisions?.length || inspectedTask.revisionCount || 0}
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
                      <div className="flex items-center gap-2 flex-wrap">

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
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-xs"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    {/* Under Review Read-Only Banner */}
                    {['WAITING_FOR_TECHNICAL_REVIEW', 'TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'MEDIA_MANAGER_REVIEW', 'WAITING_FOR_REVIEW', 'PENDING_MARKETING_APPROVAL', 'WAITING_FOR_MARKETING_APPROVAL', 'PENDING_CLIENT_APPROVAL', 'PENDING_CLIENT_REVIEW', 'WAITING_FOR_CLIENT_CONFIRMATION'].includes(inspectedTask.status) && (
                      <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-xl space-y-1 text-xs text-amber-950 shadow-xs flex items-start gap-3 animate-in fade-in duration-150">
                        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-extrabold text-amber-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                            Under Review — Read-Only Mode
                          </h4>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            This task is currently undergoing formal review (Status: <strong className="font-mono font-bold text-amber-900">{inspectedTask.status}</strong>). Content modifications, progress updates, and deliverable uploads are locked in read-only mode until the review decision is finalized.
                          </p>
                        </div>
                      </div>
                    )}
                    {isPendingAcceptance && (
                      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border-2 border-purple-300 p-4 rounded-xl space-y-3 text-xs shadow-md animate-in fade-in duration-150">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                              <Sparkles className="w-4 h-4 text-purple-600" />
                            </span>
                            <div>
                              <h4 className="text-purple-950 font-black text-sm">
                                {(inspectedTask.revisions?.length > 0 || (inspectedTask.revisionCount || 0) > 0) ? 'Task Revision Assigned — Acceptance Required' : 'Task Assigned — Acceptance Required'}
                              </h4>
                              <span className="text-[11px] text-purple-700 font-medium">
                                Task Type: <strong>{getTaskTypeInfo(inspectedTask).label}</strong>
                              </span>
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 bg-purple-200 text-purple-900 border border-purple-300 rounded-full font-mono font-extrabold text-[10px]">
                            {(inspectedTask.revisions?.length > 0 || (inspectedTask.revisionCount || 0) > 0) ? `Revision #${inspectedTask.revisionCount || inspectedTask.revisions?.length || 1}` : 'Pending Acceptance'}
                          </span>
                        </div>

                        {inspectedTask.revisions && inspectedTask.revisions.length > 0 && (
                          <div className="p-3 bg-white/80 border border-purple-200 rounded-lg space-y-1 text-slate-800">
                            <div className="flex items-center justify-between text-[10px] text-purple-700 font-mono">
                              <span>Requested by: <strong className="text-purple-950">{inspectedTask.revisions[0].requestedBy?.name || 'Manager'}</strong></span>
                              <span>{new Date(inspectedTask.revisions[0].createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap">
                              <strong className="text-purple-950">Revision Instructions:</strong> {inspectedTask.revisions[0].reason}
                            </p>
                          </div>
                        )}


                        <button
                          type="button"
                          onClick={() => handleAcknowledgeAcceptance(inspectedTask.id)}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-md hover:shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 text-xs"
                        >
                          <Check className="w-4 h-4" /> Accept Task Assignment &amp; Start Work
                        </button>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* SECTION 1: ORIGIN & CREATION ATTRIBUTION */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" /> Bound Parent Entity &amp; Creation Origin
                          </span>
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200 uppercase font-mono">
                            {inspectedTask.sourceType || 'SHOOT_PROJECT'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Originating Parent Entity:</span>
                            <span className="font-bold text-slate-900 text-xs">
                              {inspectedTask.project?.projectId ? `[${inspectedTask.project.projectId}] ` : linkedCalEvent?.eventId ? `[${linkedCalEvent.eventId}] ` : inspectedTask.graphicRequirement?.requirementId ? `[${inspectedTask.graphicRequirement.requirementId}] ` : ''}
                              {inspectedTask.project?.name || inspectedTask.graphicRequirement?.name || linkedCalEvent?.title || inspectedTask.title}
                            </span>
                          </div>
                          {createdByObj && (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Created By:</span>
                              <div className="flex items-center gap-1.5 justify-end">
                                <User className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <strong className="text-slate-800">{createdByObj.name || 'Creator'}</strong>
                                {createdByObj.role && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                                    {createdByObj.role.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SECTION 2: CLIENT, BRAND, PRODUCT & MEDIA SPECS */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-indigo-600" /> Client, Brand &amp; Content Specifications
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Client Name</span>
                            <strong className="text-slate-900 truncate block">{clientObj?.name || 'General Client'}</strong>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Brand</span>
                            <strong className="text-slate-900 truncate block">{brandObj?.name || 'General Brand'}</strong>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Product</span>
                            <p className="font-semibold text-slate-800 truncate">{productObj?.name || 'General Product'}</p>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Campaign</span>
                            <p className="font-semibold text-slate-800 truncate">{campaignVal || 'Standard Campaign'}</p>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Format / Content Type</span>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-bold text-amber-800 bg-amber-50 border border-amber-200 text-[11px]">
                              {formatVal || 'Production Task'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Platform</span>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 text-[11px]">
                              {platformVal || 'Instagram'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Talent / Model</span>
                            <p className="font-semibold text-slate-800 truncate">{talentVal || 'Not Specified'}</p>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Priority Level</span>
                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded font-extrabold uppercase text-[10px] ${
                              inspectedTask.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              inspectedTask.priority === 'HIGH' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                              'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {inspectedTask.priority || 'MEDIUM'} Priority
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 3: SCHEDULE, TIMING & LOGISTICS (INDOOR & OUTDOOR) */}
                      {(shootDateVal || callTimeVal || wrapTimeVal || inspectedTask.dueDate || linkedOutdoor || linkedIndoor || inspectedTask.project?.shootLocation) && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" /> Schedule, Timing &amp; Operational Logistics
                          </span>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Shoot / Event Date</span>
                              <strong className="text-slate-900 block">{shootDateVal ? new Date(shootDateVal).toLocaleDateString() : inspectedTask.dueDate ? new Date(inspectedTask.dueDate).toLocaleDateString() : 'N/A'}</strong>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Call / Reporting Time</span>
                              <strong className="text-blue-700 font-mono block">{callTimeVal || '09:00 AM'}</strong>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Wrap / Completion Time</span>
                              <strong className="text-blue-700 font-mono block">{wrapTimeVal || '05:00 PM'}</strong>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Task Due Date</span>
                              <strong className="text-amber-700 block">{inspectedTask.dueDate ? new Date(inspectedTask.dueDate).toLocaleDateString() : 'N/A'}</strong>
                            </div>
                          </div>

                          {/* Parent Shoot Project Binding Info */}
                          {linkedProject && (
                            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-blue-50/70 border border-blue-200 text-xs flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                                  <Film className="w-4 h-4 text-blue-600" />
                                </span>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Parent Shoot Project</span>
                                  <strong className="text-slate-900 text-xs font-semibold">{linkedProject.name}</strong>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-300">
                                  {linkedProject.projectId}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                  linkedProject.shootType === 'INDOOR'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {linkedProject.shootType} SHOOT
                                </span>
                                <Link
                                  href={`/projects/${linkedProject.id}`}
                                  className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-blue-200 rounded font-bold text-[11px] shadow-2xs transition-colors flex items-center gap-1"
                                >
                                  Open Project <ArrowRight className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          )}

                          {/* Logistics Location Cards */}
                          <div className="space-y-3">
                            {/* Outdoor On-Location Logistics Card */}
                            {(isOutdoor || linkedOutdoor) && (
                              <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 text-xs space-y-3">
                                <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                                  <span className="font-bold text-purple-900 flex items-center gap-1.5 uppercase text-[11px]">
                                    <Compass className="w-4 h-4 text-purple-600" /> Outdoor On-Location Shoot Logistics
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                                    ON-LOCATION
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800">
                                  <div>
                                    <span className="text-[10px] font-bold text-purple-800 uppercase block">Exact Location Address</span>
                                    <p className="font-semibold text-slate-900">{linkedOutdoor?.exactLocationAddress || linkedOutdoor?.locationAddress || inspectedTask.project?.shootLocation || 'Specified in brief'}</p>
                                  </div>

                                  <div>
                                    <span className="text-[10px] font-bold text-purple-800 uppercase block">Location Access &amp; Parking</span>
                                    <p className="text-slate-800">{linkedOutdoor?.locationAccessDetails || 'Standard Access'}</p>
                                  </div>

                                  <div>
                                    <span className="text-[10px] font-bold text-purple-800 uppercase block">Location Contact Person</span>
                                    <p className="text-slate-800">{linkedOutdoor?.locationContact || linkedOutdoor?.locationContactPerson || 'Contact not provided'}</p>
                                  </div>

                                  <div>
                                    <span className="text-[10px] font-bold text-purple-800 uppercase block">Expected Weather Conditions</span>
                                    <p className="font-semibold text-slate-900 flex items-center gap-1">
                                      <CloudSun className="w-3.5 h-3.5 text-amber-600" />
                                      {linkedOutdoor?.expectedWeatherConditions || linkedOutdoor?.weatherStatus || 'Sunny / Clear'}
                                    </p>
                                  </div>

                                  {linkedOutdoor?.backupLocation && (
                                    <div className="col-span-1 sm:col-span-2">
                                      <span className="text-[10px] font-bold text-purple-800 uppercase block">Backup Weather Location</span>
                                      <p className="text-slate-800">{linkedOutdoor.backupLocation}</p>
                                    </div>
                                  )}

                                  {linkedOutdoor?.specialOutdoorRequirements && (
                                    <div className="col-span-1 sm:col-span-2">
                                      <span className="text-[10px] font-bold text-purple-800 uppercase block">Special Outdoor Notes &amp; Safety</span>
                                      <p className="text-slate-800 italic bg-white/70 p-2.5 rounded-lg border border-purple-200">
                                        &quot;{linkedOutdoor.specialOutdoorRequirements}&quot;
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Indoor Studio / Facility Details Card */}
                            {(linkedIndoor || (!isOutdoor && !linkedOutdoor) || (linkedProject?.shootType === 'INDOOR')) && (
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                  <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px]">
                                    <Building2 className="w-4 h-4 text-blue-600" /> Parent / Base Indoor Studio Details
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                                    STUDIO FLOOR
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Studio / Stage Location</span>
                                    <p className="font-semibold text-slate-900">{linkedIndoor?.studioName || inspectedTask.project?.shootLocation || 'Main Studio Floor'}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Studio Address</span>
                                    <p className="text-slate-700">{linkedIndoor?.studioAddress || inspectedTask.project?.locationAddress || 'HQ Studio Facility'}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Studio Call Time</span>
                                    <p className="font-mono text-blue-700 font-semibold">{linkedIndoor?.reportingTime || '09:00 AM'}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Studio Wrap Time</span>
                                    <p className="font-mono text-blue-700 font-semibold">{linkedIndoor?.wrapUpTime || '05:00 PM'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SECTION 4: ASSIGNED CREW / STAFF & RESERVED / REQUIRED EQUIPMENT */}
                      {(() => {
                        const isGraphicReqTask = Boolean(
                          inspectedTask.graphicRequirement ||
                          inspectedTask.graphicRequirementId ||
                          inspectedTask.sourceType === 'GRAPHIC_REQUIREMENT' ||
                          inspectedTask.sourceType === 'GRAPHIC' ||
                          inspectedTask.taskType === 'GRAPHIC_REQUIREMENT' ||
                          inspectedTask.taskType === 'GRAPHIC'
                        );

                        const taskAssignedStaff = (() => {
                          const staffList: Array<{ id: string; name: string; role: string }> = [];
                          const seenIds = new Set<string>();

                          (inspectedTask.assignedEmployees || []).forEach((ae: any) => {
                            const uId = ae.userId || ae.user?.id || ae.id;
                            if (uId && !seenIds.has(uId)) {
                              seenIds.add(uId);
                              staffList.push({
                                id: ae.id || uId,
                                name: ae.user?.name || ae.name || 'Staff Member',
                                role: ae.user?.role?.replace(/_/g, ' ') || ae.role?.replace(/_/g, ' ') || 'Assignee',
                              });
                            }
                          });

                          if (inspectedTask.assignedTo) {
                            const uId = inspectedTask.assignedToId || inspectedTask.assignedTo.id;
                            if (uId && !seenIds.has(uId)) {
                              seenIds.add(uId);
                              staffList.push({
                                id: uId,
                                name: inspectedTask.assignedTo.name || 'Staff Member',
                                role: inspectedTask.assignedTo.role?.replace(/_/g, ' ') || 'Assignee',
                              });
                            }
                          }

                          // Only include project team for Shoot Project tasks; NEVER for Graphic Requirements
                          if (!isGraphicReqTask) {
                            linkedTeam.forEach((tm: any) => {
                              const uId = tm.userId || tm.user?.id || tm.id;
                              if (uId && !seenIds.has(uId)) {
                                seenIds.add(uId);
                                staffList.push({
                                  id: tm.id || uId,
                                  name: tm.user?.name || 'Crew Member',
                                  role: tm.roleInProject || tm.user?.role?.replace(/_/g, ' ') || 'Crew',
                                });
                              }
                            });
                          }

                          return staffList;
                        })();

                        if (!taskAssignedStaff.length && !linkedEquipment.length && !isGraphicReqTask) {
                          return null;
                        }

                        return (
                          <div className="space-y-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-indigo-600" /> {isGraphicReqTask ? 'Assigned Staff & Required Equipment' : 'Assigned Crew & Required Equipment'}
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Assigned Staff / Crew Members */}
                              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-2">
                                <span className="font-bold text-indigo-900 uppercase text-[10px] flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-indigo-600" /> {isGraphicReqTask ? 'Assigned Staff Members' : 'Production Team & Assigned Crew'} ({taskAssignedStaff.length})
                                </span>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                  {taskAssignedStaff.map((staff) => (
                                    <div key={staff.id} className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-indigo-200">
                                      <span className="font-semibold text-slate-900">{staff.name}</span>
                                      <span className="text-[10px] font-mono text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                                        {staff.role}
                                      </span>
                                    </div>
                                  ))}
                                  {taskAssignedStaff.length === 0 && (
                                    <p className="text-slate-400 italic text-[11px] p-2">No assigned staff members.</p>
                                  )}
                                </div>
                              </div>

                              {/* Required Equipment */}
                              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                                <span className="font-bold text-purple-900 uppercase text-[10px] flex items-center gap-1">
                                  <Camera className="w-3.5 h-3.5 text-purple-600" /> Required Equipment ({linkedEquipment.length})
                                </span>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                  {linkedEquipment.map((res: any) => (
                                    <div key={res.id} className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-purple-200">
                                      <span className="font-semibold text-slate-900">{res.equipment?.name || 'Equipment'}</span>
                                      <span className="text-[10px] font-mono text-purple-700 uppercase bg-purple-50 px-2 py-0.5 rounded">
                                        {res.equipment?.category || res.status}
                                      </span>
                                    </div>
                                  ))}
                                  {linkedEquipment.length === 0 && (
                                    <div className="p-2.5 bg-white/80 border border-purple-200/80 rounded-lg text-slate-600 space-y-1">
                                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-700">
                                        <Camera className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>No equipment required / No equipment available</span>
                                      </div>
                                      <p className="text-[10px] text-slate-500">
                                        No equipment is associated with or required for this task.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* SECTION 5: CREATIVE ASSETS & REFERENCE FILES (EVENT CREATION ASSETS) */}
                      {(creativeUrlVal || parentAssetFiles.length > 0) ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Event Creation Assets &amp; Reference Files
                            </span>
                            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                              {(creativeUrlVal ? 1 : 0) + parentAssetFiles.length} File{((creativeUrlVal ? 1 : 0) + parentAssetFiles.length) === 1 ? '' : 's'} Added on Creation
                            </span>
                          </div>

                          {/* Primary Linked Creative Visual Asset added on Event Creation */}
                          {creativeUrlVal && (
                            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3 shadow-xs">
                              <div className="flex items-center justify-between gap-3">
                                <div className="space-y-0.5 overflow-hidden">
                                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                                    Primary Visual Asset / Reference Link:
                                  </span>
                                  <strong className="text-slate-900 text-sm block truncate">
                                    {creativeAssetNameVal}
                                  </strong>
                                  <span className="text-xs font-mono text-indigo-700 truncate block">
                                    {creativeUrlVal}
                                  </span>
                                </div>
                                <a
                                  href={creativeUrlVal.startsWith('http') ? creativeUrlVal : `https://${creativeUrlVal}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm transition-all"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Open Asset Link
                                </a>
                              </div>
                              {creativeUrlVal.match(/\.(jpeg|jpg|gif|png|webp)/i) && (
                                <div className="pt-1 flex justify-center">
                                  <img
                                    src={creativeUrlVal}
                                    alt="Creative Preview"
                                    className="max-h-60 rounded-lg object-contain border border-indigo-200 bg-white shadow-xs"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Files uploaded on Event Creation */}
                          {parentAssetFiles.length > 0 && (
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                                Files Added on Event Creation ({parentAssetFiles.length}):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {parentAssetFiles.map((file: any, idx: number) => {
                                  const fileUrl = file.storagePath?.startsWith('http')
                                    ? file.storagePath
                                    : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${file.storagePath}`;
                                  const isImg = file.fileType?.includes('image') || file.storagePath?.match(/\.(jpeg|jpg|gif|png|webp)/i);

                                  return (
                                    <div
                                      key={file.id || `file-${idx}`}
                                      className="p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 transition-all shadow-xs flex items-center justify-between gap-2.5"
                                    >
                                      <div className="flex items-center gap-2.5 overflow-hidden">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                                          {isImg ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                        </div>
                                        <div className="truncate">
                                          <span className="font-bold text-slate-900 block truncate text-xs">
                                            {file.fileName || 'Event Asset File'}
                                          </span>
                                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold">
                                              {file.sourceLabel || file.attachmentCategory?.replace(/_/g, ' ') || file.fileType || 'ASSET'}
                                            </span>
                                            {file.fileSize > 0 && (
                                              <span>
                                                {file.fileSize > 1048576
                                                  ? `${(file.fileSize / 1048576).toFixed(1)} MB`
                                                  : `${Math.round(file.fileSize / 1024)} KB`}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[11px] border border-indigo-200 flex items-center gap-1 shrink-0 transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>View</span>
                                      </a>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                            <span>No asset files were attached during this event creation.</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">0 Assets</span>
                        </div>
                      )}

                      {/* SECTION 6: GRAPHIC REQUIREMENT DELIVERABLES (IF APPLICABLE) */}
                      {inspectedTask.graphicRequirement?.deliverables && inspectedTask.graphicRequirement.deliverables.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-amber-600" /> Graphic Requirement Deliverables ({inspectedTask.graphicRequirement.deliverables.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {inspectedTask.graphicRequirement.deliverables.map((d: any) => (
                              <div key={d.id} className="p-2.5 bg-slate-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                                <div>
                                  <strong className="text-slate-900 block">{d.name || d.title || 'Deliverable Item'}</strong>
                                  <span className="text-[10px] text-slate-500 font-mono">{d.format || d.type || 'Graphic'}</span>
                                </div>
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold uppercase">
                                  {d.status || 'PLANNED'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* DEDICATED GRAPHIC REQUIREMENT DIRECTION & DESIGN GUIDELINES (FOR GRAPHIC REQ TASKS) */}
                      {isGraphicReqTask && (
                        <div className="p-4 bg-slate-50 border border-amber-200 rounded-2xl space-y-3 shadow-lg">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Palette className="w-4 h-4 text-amber-600" />
                              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                                Graphic Direction &amp; Design Guidelines
                              </h3>
                              {graphicReqId && (
                                <span className="text-[9px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-mono font-bold border border-amber-200">
                                  {activeGraphicReq?.reqId || (typeof graphicReqId === 'string' && graphicReqId.startsWith('GR-') ? graphicReqId : `GR-${inspectedTask.taskId}`)}
                                </span>
                              )}
                              <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200 uppercase tracking-wider">
                                Graphic Req
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">


                              <button
                                type="button"
                                onClick={() => {
                                  const copyContent = [
                                    activeGraphicReq?.objective ? `OBJECTIVE:\n${activeGraphicReq.objective}` : '',
                                    graphicEditDirection || activeGraphicReq?.description || inspectedTask.description ? `DIRECTION & GUIDELINES:\n${graphicEditDirection || activeGraphicReq?.description || inspectedTask.description}` : '',
                                    activeGraphicReq?.remarks ? `REMARKS:\n${activeGraphicReq.remarks}` : '',
                                  ].filter(Boolean).join('\n\n');
                                  navigator.clipboard.writeText(copyContent || 'No direction provided.');
                                  setGraphicCopiedDirection(true);
                                  setTimeout(() => setGraphicCopiedDirection(false), 2000);
                                }}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                              >
                                {graphicCopiedDirection ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-amber-600" />}
                                <span>{graphicCopiedDirection ? 'Copied!' : 'Copy Direction'}</span>
                              </button>

                              <div className="flex bg-slate-100 border border-slate-200 p-0.5 rounded-lg text-[10px] font-semibold">
                                <button
                                  type="button"
                                  onClick={() => setGraphicDirectionTab('view')}
                                  className={`px-2 py-0.5 rounded transition-all ${
                                    graphicDirectionTab === 'view' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  View Direction
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isPendingAcceptance) {
                                      alert('Task is in read-only mode. Please accept the task assignment first.');
                                      return;
                                    }
                                    setGraphicDirectionTab('edit');
                                  }}
                                  className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                                    graphicDirectionTab === 'edit' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {isPendingAcceptance && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                                  <span>Edit Direction</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* TAB CONTENT: FORMATTED VIEW */}
                          {graphicDirectionTab === 'view' && (
                            <div className="space-y-3">
                              {/* Objective */}
                              {(activeGraphicReq?.objective || graphicEditObjective) && (
                                <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl space-y-1">
                                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                                    Creative Objective &amp; Goal
                                  </span>
                                  <p className="text-xs text-slate-900 font-medium leading-relaxed">
                                    {activeGraphicReq?.objective || graphicEditObjective}
                                  </p>
                                </div>
                              )}

                              {/* Direction & Design Guidelines */}
                              <div className="bg-white border border-amber-200/80 p-3.5 rounded-xl space-y-1.5 shadow-xs">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                  Visual Design Direction &amp; Specifications
                                </span>
                                <p className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                                  {graphicEditDirection || activeGraphicReq?.description || inspectedTask.description || 'No design direction or guidelines specified yet.'}
                                </p>
                              </div>

                              {/* Remarks / Production Notes */}
                              {(activeGraphicReq?.remarks || graphicEditRemarks) && (
                                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Special Instructions &amp; Remarks
                                  </span>
                                  <p className="text-xs text-amber-800 font-medium leading-relaxed whitespace-pre-wrap">
                                    {activeGraphicReq?.remarks || graphicEditRemarks}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* TAB CONTENT: EDIT DIRECTION */}
                          {graphicDirectionTab === 'edit' && (
                            <div className="space-y-3">
                              {isPendingAcceptance ? (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>Task is in read-only mode. Accept the task assignment to edit direction.</span>
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                      Creative Objective
                                    </label>
                                    <input
                                      type="text"
                                      value={graphicEditObjective}
                                      onChange={(e) => setGraphicEditObjective(e.target.value)}
                                      placeholder="e.g. Highlight promotional discount & brand elements"
                                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                      Design Direction, Visual Guidelines &amp; Specs
                                    </label>
                                    <textarea
                                      rows={5}
                                      value={graphicEditDirection}
                                      onChange={(e) => setGraphicEditDirection(e.target.value)}
                                      placeholder="Enter detailed design direction, typography rules, color mood, visual elements, and creative guidelines..."
                                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 leading-relaxed"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                      Production Remarks &amp; Notes
                                    </label>
                                    <input
                                      type="text"
                                      value={graphicEditRemarks}
                                      onChange={(e) => setGraphicEditRemarks(e.target.value)}
                                      placeholder="e.g. Follow updated logo safe zone rules"
                                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                                    />
                                  </div>

                                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => setGraphicDirectionTab('view')}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleSaveGraphicDirectionInTask}
                                      disabled={savingGraphicReq}
                                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                      {savingGraphicReq ? 'Saving…' : 'Save Direction'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* SCRIPT DOCUMENTS REVIEW & UPLOAD CARD */}
                      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-purple-700" /> Attached Script Documents
                          </span>
                          <div className="flex items-center gap-2">
                            <label className={`px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-xs ${uploadingTaskScript ? 'opacity-50 pointer-events-none' : ''}`}>
                              <Plus className="w-3.5 h-3.5" />
                              <span>{uploadingTaskScript ? 'Uploading...' : '+ Add New Script'}</span>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadScriptDocForTask(file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        {loadingInspectedFiles ? (
                          <div className="text-slate-500 py-2 text-center text-xs">Loading script files...</div>
                        ) : (() => {
                          const scriptFiles = (inspectedProjectFiles || []).filter(
                            (f: any) =>
                              f.attachmentCategory === 'SCRIPT_DOCUMENT' ||
                              f.folderCategory === 'Script Documents' ||
                              f.storagePath?.includes('Script Documents') ||
                              f.fileName?.toLowerCase().endsWith('.pdf') ||
                              f.fileName?.toLowerCase().endsWith('.doc') ||
                              f.fileName?.toLowerCase().endsWith('.docx')
                          );

                          if (scriptFiles.length === 0) {
                            return (
                              <div className="p-3 bg-white/80 border border-purple-100 rounded-lg text-slate-500 flex items-center justify-between">
                                <span>No script documents attached to this task/project yet.</span>
                                <span className="text-[10px] text-purple-700 font-semibold">Marketing Manager can review or attach scripts at any time</span>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-2">
                              {scriptFiles.map((sf: any) => {
                                const fileUrl = sf.storagePath?.startsWith('http')
                                  ? sf.storagePath
                                  : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/${sf.storagePath?.replace(/^\/?/, '')}`;

                                return (
                                  <div
                                    key={sf.id || sf.fileName}
                                    className="p-3 bg-white border border-purple-200 rounded-lg flex items-center justify-between gap-3 shadow-xs"
                                  >
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                        <FileText className="w-4 h-4" />
                                      </div>
                                      <div className="truncate">
                                        <span className="font-bold text-slate-900 block truncate">{sf.fileName}</span>
                                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                          {sf.fileSize && <span>{(sf.fileSize / 1024).toFixed(1)} KB</span>}
                                          {sf.uploadedBy && <span>• Uploaded by {sf.uploadedBy.name || sf.uploadedBy.role}</span>}
                                          {sf.createdAt && <span>• {new Date(sf.createdAt).toLocaleDateString()}</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
                                      >
                                        <Eye className="w-3.5 h-3.5" /> View Script
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      {/* SECTION 7: TASK DESCRIPTION & PRODUCTION NOTES */}
                      <div className="space-y-3">
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Task Description</span>
                          <p className="text-slate-800 text-xs leading-relaxed font-normal whitespace-pre-wrap">{inspectedTask.description || 'No description provided.'}</p>
                        </div>

                        {notesVal && (
                          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Production Notes &amp; Special Instructions</span>
                            <p className="text-slate-800 text-xs leading-relaxed font-normal whitespace-pre-wrap">{notesVal}</p>
                          </div>
                        )}
                      </div>

                      {/* SECTION 8: METRICS SUMMARY ROW */}
                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Priority</span>
                            <strong className={`text-xs px-2 py-0.5 rounded inline-block mt-0.5 ${
                              inspectedTask.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                              inspectedTask.priority === 'HIGH' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>{inspectedTask.priority}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Due Date</span>
                            <strong className="text-slate-800 text-xs mt-0.5 block">{inspectedTask.dueDate ? new Date(inspectedTask.dueDate).toLocaleDateString() : 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Estimated Hours</span>
                            <strong className="text-emerald-600 text-xs mt-0.5 block">{inspectedTask.estimatedHours || 0}h</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Synchronized Status</span>
                            <strong className="text-purple-700 text-xs mt-0.5 block">{inspectedTask.status?.replace(/_/g, ' ')}</strong>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 9: OPERATIONAL REMARKS & WORK LOGS */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-600" /> Operational Remarks &amp; Work Logs
                          </h4>
                          <span className="text-[10px] text-slate-400 italic">Visible to all assigned staff &amp; managers</span>
                        </div>

                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {(!inspectedTask?.remarksHistory || inspectedTask.remarksHistory.length === 0) ? (
                            <p className="text-slate-400 italic text-[11px] p-2">No remarks yet. Add work notes below.</p>
                          ) : (
                            inspectedTask.remarksHistory.map((r: any, idx: number) => (
                              <div key={r.id || idx} className="p-2 bg-white border border-slate-200 rounded text-[11px]">
                                <div className="flex justify-between text-slate-500 font-mono text-[9px] mb-0.5">
                                  <strong className="text-slate-800">{r.user?.name || r.name || 'Staff'}</strong>
                                  <span>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                                </div>
                                <p className="text-slate-800 leading-relaxed">{r.message}</p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Remark Input */}
                        <div className="flex items-end gap-2 pt-1 border-t border-slate-200">
                          <textarea
                            value={newRemarkText}
                            disabled={isPendingAcceptance}
                            onChange={(e) => setNewRemarkText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddRemark(inspectedTask.id); } }}
                            placeholder={isPendingAcceptance ? "Task is in read-only mode. Accept task assignment to add remarks." : "Add an operational work note or status remark… (Enter to send)"}
                            rows={2}
                            className="flex-1 bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-lg text-[11px] resize-none focus:border-amber-500 focus:outline-none placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddRemark(inspectedTask.id)}
                            disabled={!newRemarkText.trim() || submittingRemark || isPendingAcceptance}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 h-[52px]"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {submittingRemark ? '…' : isPendingAcceptance ? 'Locked' : 'Send'}
                          </button>
                        </div>
                      </div>

                      {/* SECTION 10: COMPREHENSIVE TASK TIMELINE */}
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
                            title="Task Activity Timeline &amp; Updations"
                            order="desc"
                            emptyMessage="No timeline updations recorded yet for this task."
                          />
                        );
                      })()}

                      {/* Technical Review Submission Action */}
                      {!['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'PENDING_MARKETING_APPROVAL', 'APPROVED', 'COMPLETED'].includes(inspectedTask.status) && !isPendingAcceptance && (
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2.5 shadow-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-700 text-xs flex items-center gap-1.5">
                              Submit for Technical Review
                            </span>
                            <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded font-mono font-bold">
                              Status: {inspectedTask.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700">
                            Submit this task for Technical Review &amp; Approval to begin the manager review process.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRequestTechnicalReview(inspectedTask.id)}
                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center gap-2 text-xs"
                          >
                            Submit Task for Technical Review
                          </button>
                        </div>
                      )}

                      {/* Modal Footer Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        {isPendingAcceptance ? (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeAcceptance(inspectedTask.id)}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-md hover:shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 text-xs"
                          >
                            <Check className="w-4 h-4" /> Accept Task Assignment &amp; Start Work
                          </button>
                        ) : <div />}

                        <button
                          onClick={() => setInspectedTask(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-xs"
                        >
                          Close Inspector
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()
            }
          </div>
        </div>
      )}

      {/* Request Revision Form Modal */}
      

      {/* Dedicated Upload Work Deliverable Output Modal */}
      {uploadTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono text-xs font-bold">
                  {uploadTask.taskId}
                </span>
                <h3 className="font-bold text-slate-900 text-base">Upload Work Deliverable Output</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadTask(null);
                  setUploadFileUrl('');
                  setUploadFileName('');
                }}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDeliverable} className="space-y-4 text-xs">
              {/* Task Details Summary */}
              <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Task</span>
                <p className="font-bold text-slate-900 text-sm">{uploadTask.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono pt-1">
                  <span>Current Version: <strong className="text-cyan-700">v{uploadTask.activeDeliverableVersion || 0}</strong></span>
                  <span>•</span>
                  <span>Will Upload as: <strong className="text-emerald-600">v{(uploadTask.activeDeliverableVersion || 0) + 1}</strong></span>
                </div>
              </div>

              {/* Existing Deliverable Preview if available */}
              {uploadTask.activeDeliverableUrl && (
                <div className="p-2.5 bg-slate-50 border border-cyan-200 rounded-lg space-y-1">
                  <span className="text-[10px] text-cyan-600 font-bold uppercase block">Current Active Deliverable:</span>
                  <a
                    href={uploadTask.activeDeliverableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-700 font-mono text-xs hover:underline block truncate font-semibold"
                  >
                    {uploadTask.activeDeliverableFileName || uploadTask.activeDeliverableUrl}
                  </a>
                </div>
              )}

              {/* Deliverable File Name / Label */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block text-xs">Deliverable Output Title / File Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Final_Banner_v1_1080x1350.png or Edited_Reel_Master_v2.mp4"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-medium text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
                />
              </div>

              {/* Deliverable Storage Link / File URL */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block text-xs">Deliverable File URL / Storage Link *</label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://storage.googleapis.com/... or https://drive.google.com/..."
                  value={uploadFileUrl}
                  onChange={(e) => setUploadFileUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400">
                  Provide direct file storage URL, Google Drive link, Frame.io link, or cloud asset link.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setUploadTask(null);
                    setUploadFileUrl('');
                    setUploadFileName('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDeliverable || !uploadFileUrl.trim() || !uploadFileName.trim()}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-extrabold text-xs shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition-all"
                >
                  {uploadingDeliverable ? 'Uploading...' : 'Submit Deliverable Output'}
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
    </RouteGuard>
  );
}
