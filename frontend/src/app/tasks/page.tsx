'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { CheckSquare, AlertTriangle, Plus, ArrowRight, RefreshCw, CheckCircle2, Search, SlidersHorizontal, RotateCcw, X, Building2, Tag, User, Calendar, Flame, Clock, ArrowUpDown, ExternalLink } from 'lucide-react';
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

  const stages = isRevision ? revisionStages : isDirect ? directStages : eventStages;
  const currentIdx = stages.findIndex((s) => s.key === task.status);

  const parentTitle =
    task.graphicRequirement?.name ||
    task.script?.name ||
    task.project?.name ||
    task.client?.name ||
    'Parent Event';

  return (
    <div className={`border p-3.5 rounded-xl space-y-2.5 ${
      isRevision
        ? 'bg-amber-950/40 border-amber-800/60 shadow-lg shadow-amber-950/20'
        : 'bg-gray-950 border-gray-800'
    }`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
          {isRevision ? (
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
          {isRevision && (
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-900/60 text-amber-200 border border-amber-700/80 flex items-center gap-1">
              🔗 Linked to Parent: <strong className="text-amber-300">{parentTitle}</strong>
            </span>
          )}
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
            isRevision ? 'bg-amber-950 text-amber-300 border-amber-800' :
            isDirect ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-amber-950 text-amber-300 border-amber-800'
          }`}>
            {isRevision ? 'REVISION_TASK' : task.sourceType || 'DIRECT_TASK'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between overflow-x-auto py-1 px-1 gap-1">
        {stages.map((stage, i) => {
          const isCurrent = task.status === stage.key;
          const isPassed = task.status === 'COMPLETED' ? true : currentIdx >= 0 && i < currentIdx;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center min-w-[64px] text-center">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                  isCurrent
                    ? 'bg-amber-500 text-black font-extrabold ring-2 ring-amber-400 animate-pulse shadow-lg shadow-amber-500/50'
                    : isPassed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-900 text-gray-500 border border-gray-800'
                }`}>
                  {isPassed ? '✓' : i + 1}
                </div>
                <span className={`text-[9px] mt-1 font-semibold leading-tight ${
                  isCurrent ? 'text-amber-400 font-bold' : isPassed ? 'text-emerald-400' : 'text-gray-500'
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
  }, [searchQuery, statusFilter, selectedClient, selectedBrand, selectedProduct, selectedProject, selectedEmployee, selectedPriority]);

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
      await fetchApi(`/tasks/${taskId}/accept`, { method: 'POST' });
      alert('⚡ Task assignment accepted and acknowledged successfully!');
      loadData();
      if (inspectedTask && inspectedTask.id === taskId) {
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
          status: 'WAITING_FOR_TECHNICAL_REVIEW',
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

                      {/* Status */}
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
                          {task.assignedEmployees?.some((a: any) => a.userId === user?.id && a.acceptanceStatus !== 'ACCEPTED') && (
                            <button
                              onClick={() => handleAcknowledgeAcceptance(task.id)}
                              className="px-1.5 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-medium transition-colors"
                              title="Acknowledge Receipt & Accept Task"
                            >
                              ✓ Accept
                            </button>
                          )}

                          {/* Assigned Staff Action: Start Work -> In Progress (Only shown BEFORE deliverable upload & work progress) */}
                          {!['IN_PROGRESS', 'WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_REVIEW', 'COMPLETED', 'CANCELLED'].includes(task.status?.toUpperCase()) &&
                           (task.status === 'ACCEPTED' || task.assignedEmployees?.some((a: any) => a.userId === user?.id && a.acceptanceStatus === 'ACCEPTED')) && (
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

                              {/* Upload Deliverables Action (Available AFTER Task is IN_PROGRESS & Not under review) */}
                              {['IN_PROGRESS', 'ON_HOLD'].includes(task.status) && (
                                <button
                                  onClick={() => setUploadTask(task)}
                                  className="px-1.5 py-0.5 bg-gray-900 hover:bg-gray-800 text-cyan-300 border border-gray-800 hover:border-cyan-500/40 rounded text-[10px] font-medium transition-colors"
                                  title="Upload Deliverable Output"
                                >
                                  📤 Deliverable
                                </button>
                              )}

                              {/* Request Technical Review Action (Available AFTER Deliverable Upload) */}
                              {task.activeDeliverableUrl && ['IN_PROGRESS', 'ON_HOLD'].includes(task.status) && (
                                <button
                                  onClick={() => handleRequestTechnicalReview(task.id)}
                                  className="px-1.5 py-0.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded text-[10px] font-medium transition-colors flex items-center gap-1 shadow"
                                  title="Submit Task for Technical Review & Approval"
                                >
                                  📩 Request Tech Review
                                </button>
                              )}
                            </>
                          )}

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

      {/* Task Inspector Modal (All 15 Mandatory Attributes) */}
      {inspectedTask && (
        <div
          onClick={() => setInspectedTask(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl w-full max-w-xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div>
                <span className="font-mono text-blue-400 font-bold text-xs block">Task ID: {inspectedTask.taskId}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{inspectedTask.title}</h3>
                {/* Revision Controls - Only for tasks attached to a parent entity */}
                {Boolean(inspectedTask.projectId || inspectedTask.scriptId || inspectedTask.graphicRequirementId) && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                      🔄 Revisions: {inspectedTask.revisionCount || 0}
                    </span>
                    {!isTaskRevision(inspectedTask) && (
                      <button
                        type="button"
                        onClick={() => setRevisionModalTask(inspectedTask)}
                        className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[10px] flex items-center gap-1 shadow transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" /> Request Revision
                      </button>
                    )}
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
                    Linked to Parent Event / Item:{' '}
                    <strong className="text-amber-300 font-bold">
                      {inspectedTask.script?.name || inspectedTask.graphicRequirement?.name || inspectedTask.project?.name || inspectedTask.client?.name || 'Parent Event / Production Item'}
                    </strong>
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800 rounded font-mono text-[10px] font-bold">
                  Individual Task Progress: {inspectedTask.completionPercentage || 0}%
                </span>
              </div>
            )}

            <TaskWorkflowTimeline task={inspectedTask} />

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
                  Reviewer requested changes for this task. Assigned staff member is making requested revisions.
                </p>
                {!isTaskRevision(inspectedTask) && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setRevisionModalTask(inspectedTask)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Request Another Revision
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Unified Row-by-Row Layout (Zero Blank Spaces) */}
            <div className="space-y-3">
              {/* Review Lock Banner for Staff */}
              {user?.role === 'STAFF' && inspectedTask.status === 'WAITING_FOR_TECHNICAL_REVIEW' && (
                <div className="bg-amber-950/70 border border-amber-500/40 p-3 rounded-xl flex items-center gap-2 text-amber-300 text-xs font-medium shadow">
                  <span>🔒 Task is currently undergoing Technical Review. Updates, deliverable uploads, and remarks are locked for staff until review is completed.</span>
                </div>
              )}

              {user?.role === 'STAFF' && inspectedTask.status === 'WAITING_FOR_MEDIA_REVIEW' && (
                <div className="bg-emerald-950/70 border border-emerald-500/40 p-3 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-medium shadow">
                  <span>✓ Technical Review Passed &amp; Approved! Task has advanced to Media Manager Review.</span>
                </div>
              )}

              {/* Row 1: Task Description & Technical Review Validations */}
              <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl space-y-3">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Task Description</span>
                  <p className="text-gray-200 mt-1 text-xs leading-relaxed">{inspectedTask.description || 'No description provided.'}</p>
                </div>

                {/* Technical Manager Action Form directly inside Task Inspector Modal */}
                {(user?.role === 'TECHNICAL_MANAGER' || (user?.role as string) === 'ADMINISTRATOR') && inspectedTask.status === 'WAITING_FOR_TECHNICAL_REVIEW' && (
                  <div className="bg-purple-950/40 border border-purple-800/60 p-3.5 rounded-xl space-y-2.5">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wide block">
                      ⚡ Technical Manager Review &amp; Validation Form
                    </span>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-gray-300 font-bold block">
                        Validation Reason / Feedback Notes (Mandatory for Reject, Optional for Accept):
                      </label>
                      <textarea
                        rows={2}
                        value={techReviewRemarks}
                        onChange={(e) => setTechReviewRemarks(e.target.value)}
                        placeholder="Enter technical validation findings, quality check notes, or revision reasons (mandatory for rejection)..."
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        disabled={submittingTechReview || !techReviewRemarks.trim()}
                        onClick={() => handleExecuteTechReview(inspectedTask.id, 'REJECTED')}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow"
                      >
                        ✖ Request Revisions / Reject
                      </button>
                      <button
                        type="button"
                        disabled={submittingTechReview}
                        onClick={() => handleExecuteTechReview(inspectedTask.id, 'APPROVED')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow"
                      >
                        ✓ Accept &amp; Approve Standards
                      </button>
                    </div>
                  </div>
                )}

                {/* Technical Validation Result Section on Task Description Card */}
                {inspectedTask.approvalHistory && inspectedTask.approvalHistory.filter((a: any) => a.status !== 'PENDING').length > 0 && (
                  <div className="pt-2.5 border-t border-gray-800 space-y-2">
                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                      ⚡ Technical Validation Result
                    </span>

                    <div className="space-y-2">
                      {inspectedTask.approvalHistory
                        .filter((appr: any, idx: number, self: any[]) => appr.status !== 'PENDING' && self.findIndex((a) => a.id === appr.id) === idx)
                        .slice(0, 3)
                        .map((appr: any) => (
                        <div key={appr.id} className="p-2.5 bg-gray-950 border border-purple-900/40 rounded-lg space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                              appr.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                            }`}>
                              {appr.status === 'APPROVED' ? '✓ ACCEPTED (APPROVED)' : '✖ REJECTED (REVISIONS REQUESTED)'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {new Date(appr.createdAt).toLocaleDateString()} {new Date(appr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-gray-300 text-xs">
                            <strong className="text-gray-400">Reviewer:</strong> {appr.reviewer?.name || 'Technical Manager'}
                          </div>
                          <div className="text-xs text-amber-200 bg-amber-950/40 border border-amber-900/50 p-2 rounded mt-1 font-sans leading-relaxed">
                            <strong className="text-amber-400 block text-[10px] uppercase font-bold">Validation Reason / Notes:</strong>
                            {appr.remarks || 'Technical standards passed.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Metrics Summary Row (Priority, Due Date, Est Hours, Status & Progress) */}
              <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">Priority</span>
                    <strong className={`text-xs px-2 py-0.5 rounded inline-block mt-0.5 ${
                      inspectedTask.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                      inspectedTask.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
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
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">Current Status</span>
                    <strong className="text-purple-300 text-xs mt-0.5 block">{inspectedTask.status?.replace(/_/g, ' ')}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800/80 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Completion Progress</span>
                    <strong className="text-white font-mono font-bold">{inspectedTask.completionPercentage || 0}%</strong>
                  </div>
                  <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden border border-gray-800">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${inspectedTask.completionPercentage || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Parent Entity Details (Only Render If Present OR Standalone Badge) */}
              {inspectedTask.project || inspectedTask.script || inspectedTask.graphicRequirement ? (
                <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl space-y-1.5">
                  {inspectedTask.project && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Parent Project</span>
                      <div className="text-right">
                        <strong className="text-blue-300 text-xs">{inspectedTask.project.name}</strong>
                        {inspectedTask.project.projectId && (
                          <span className="text-[10px] text-gray-400 font-mono ml-1">({inspectedTask.project.projectId})</span>
                        )}
                      </div>
                    </div>
                  )}
                  {inspectedTask.script && (
                    <div className="flex items-center justify-between bg-purple-950/40 p-2.5 rounded-lg border border-purple-800/60">
                      <div>
                        <span className="text-[10px] text-purple-300 font-bold uppercase block">Parent Script Template</span>
                        <span className="text-xs font-bold text-white font-mono">
                          📄 {inspectedTask.script.name} ({inspectedTask.script.scriptId})
                        </span>
                      </div>
                      <Link
                        href={`/scripts?inspect=${inspectedTask.script.id}`}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md hover:shadow-purple-600/40"
                        title="View & Update Script Template"
                      >
                        <span>Open Script Template</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                  {inspectedTask.graphicRequirement && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Parent Graphic Requirement</span>
                      <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded font-semibold text-[10px]">
                        🎨 {inspectedTask.graphicRequirement.name} ({inspectedTask.graphicRequirement.requirementId})
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Parent Entity</span>
                  <span className="px-2.5 py-0.5 bg-gray-950 text-gray-300 border border-gray-700 rounded font-mono text-[10px] font-bold">
                    ⚡ Standalone Direct Task
                  </span>
                </div>
              )}

              {/* Row 4: Commercial Classification (Client / Brand / Product) - Render Only If Present */}
              {(inspectedTask.client || inspectedTask.brand || inspectedTask.product) && (
                <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl space-y-1.5">
                  {inspectedTask.client && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Client</span>
                      <strong className="text-white text-xs">{inspectedTask.client.name}</strong>
                    </div>
                  )}
                  {inspectedTask.brand && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Brand</span>
                      <strong className="text-purple-300 text-xs">
                        {inspectedTask.brand.shortCode ? `[${inspectedTask.brand.shortCode}] ` : ''}{inspectedTask.brand.name}
                      </strong>
                    </div>
                  )}
                  {inspectedTask.product && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Product</span>
                      <strong className="text-cyan-300 text-xs">{inspectedTask.product.name}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Row 5: Assigned Employees */}
              <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Assigned Employees</span>
                  <div className="flex items-center gap-1.5">
                    {inspectedTask.assignedEmployees?.some((a: any) => a.userId === user?.id && a.acceptanceStatus !== 'ACCEPTED') && (
                      <button
                        type="button"
                        onClick={() => handleAcknowledgeAcceptance(inspectedTask.id)}
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded shadow flex items-center gap-1 transition-colors"
                      >
                        ✓ Accept Assignment
                      </button>
                    )}
                    {!['IN_PROGRESS', 'WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_REVIEW', 'COMPLETED', 'CANCELLED'].includes(inspectedTask.status?.toUpperCase()) &&
                     (inspectedTask.status === 'ACCEPTED' || inspectedTask.assignedEmployees?.some((a: any) => a.userId === user?.id && a.acceptanceStatus === 'ACCEPTED')) && (
                      <button
                        type="button"
                        onClick={() => handleStartInProgress(inspectedTask.id)}
                        className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] rounded shadow flex items-center gap-1 transition-colors"
                      >
                        🚀 Start In Progress
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(inspectedTask.assignedEmployees || []).length === 0 ? (
                    <span className="text-gray-500 italic text-xs">No assigned staff</span>
                  ) : (
                    inspectedTask.assignedEmployees.map((a: any) => (
                      <div key={a.id} className="px-2.5 py-1 bg-gray-950 border border-gray-800 rounded flex items-center gap-1.5 text-xs font-medium">
                        <span className="text-gray-200">👤 {a.user?.name} <span className="text-gray-500 text-[10px]">({a.user?.role?.replace(/_/g, ' ')})</span></span>
                        <span className={`text-[9px] font-mono px-1 rounded border ${
                          a.acceptanceStatus === 'ACCEPTED' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40' : 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                        }`}>
                          {a.acceptanceStatus === 'ACCEPTED' ? '✓ Accepted' : '⏳ Pending'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Row 6: Active Work Deliverable OR Direct Script Task Technical Review */}
              {inspectedTask.script ? (
                <div className="bg-purple-950/40 border border-purple-800/60 p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase">
                        📄 Script Task Submission (No Deliverable File Required)
                      </span>
                      <p className="text-[11px] text-gray-300 mt-0.5">
                        Script tasks do not require output file uploads. When your script storyline &amp; scenes are ready, submit directly for Technical Review.
                      </p>
                    </div>
                  </div>

                  {inspectedTask.status === 'WAITING_FOR_TECHNICAL_REVIEW' ? (
                    <div className="p-3 bg-purple-950/80 border border-purple-700/80 rounded-lg text-xs font-bold text-purple-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400 animate-spin" />
                      <span>🔒 Submitted &amp; Currently Waiting for Technical Review</span>
                    </div>
                  ) : inspectedTask.status === 'COMPLETED' ? (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-lg text-xs font-bold text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>✅ Script Task Completed &amp; Approved</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRequestTechnicalReview(inspectedTask.id)}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-purple-600/40"
                    >
                      <span>📩 Submit Script Direct to Technical Review</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-gray-900 border border-cyan-800/50 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1">
                      📤 Active Work Deliverable (Latest Output)
                    </span>
                    {['IN_PROGRESS', 'ON_HOLD'].includes(inspectedTask.status) || (user?.role !== 'STAFF' && ['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_REVIEW', 'COMPLETED'].includes(inspectedTask.status)) ? (
                      <button
                        type="button"
                        onClick={() => setUploadTask(inspectedTask)}
                        className="px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-[10px] transition-colors"
                      >
                        + Upload Deliverable Output
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-500 font-mono italic">
                        {['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_REVIEW', 'COMPLETED'].includes(inspectedTask.status)
                          ? '🔒 Under Technical Review (Uploads locked)'
                          : '🔒 Move task to "In Progress" to upload deliverables'}
                      </span>
                    )}
                  </div>

                  {inspectedTask.activeDeliverableUrl ? (
                    <div className="p-2.5 bg-gray-950 border border-cyan-900/50 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white flex items-center gap-1.5 truncate">
                          📄 {inspectedTask.activeDeliverableFileName || 'Deliverable File'}
                        </span>
                        <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full text-[10px] font-mono">
                          v{inspectedTask.activeDeliverableVersion || 1} (Active)
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <a
                          href={inspectedTask.activeDeliverableUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline font-semibold"
                        >
                          🔗 View Output File
                        </a>
                        <span className="text-gray-500 font-mono text-[9px]">Replaces older versions</span>
                      </div>

                      {/* Request Technical Review Button inside Active Deliverable card */}
                      {['IN_PROGRESS', 'ON_HOLD'].includes(inspectedTask.status) && (
                        <div className="pt-2 border-t border-cyan-900/40 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRequestTechnicalReview(inspectedTask.id)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow-md transition-colors flex items-center gap-1.5"
                          >
                            <span>📩 Submit to Technical Review</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-[11px] p-1">No deliverable uploaded yet for this task.</p>
                  )}
                </div>
              )}

              {/* Row 7: Permanent Execution Remarks History */}
              <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl space-y-3">
                <span className="text-[10px] text-gray-500 font-bold block uppercase">Permanent Execution Remarks History</span>
                
                {/* Add Remark Form */}
                <div className="space-y-1.5 pt-1">
                  <textarea
                    rows={2}
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    disabled={user?.role === 'STAFF' && ['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_REVIEW', 'COMPLETED'].includes(inspectedTask.status)}
                    placeholder={
                      user?.role === 'STAFF' && ['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_REVIEW', 'COMPLETED'].includes(inspectedTask.status)
                        ? '🔒 Remarks are locked for staff during Technical Review...'
                        : 'Add an execution remark (User, Date, Time recorded automatically)...'
                    }
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleAddRemark(inspectedTask.id)}
                      disabled={submittingRemark || !newRemarkText.trim() || (user?.role === 'STAFF' && ['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_REVIEW', 'COMPLETED'].includes(inspectedTask.status))}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded transition-colors disabled:opacity-50"
                    >
                      {submittingRemark ? 'Posting...' : 'Post Permanent Remark'}
                    </button>
                  </div>
                </div>

                {/* Permanent Remarks Timeline */}
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {(!inspectedTask.remarksHistory || inspectedTask.remarksHistory.length === 0) ? (
                    <p className="text-gray-500 italic text-[11px]">No execution remarks recorded yet.</p>
                  ) : (
                    inspectedTask.remarksHistory.map((rem: any) => (
                      <div key={rem.id} className="p-2 bg-gray-950 border border-gray-800 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-blue-400">👤 {rem.user?.name || 'User'} <span className="text-gray-500 font-normal">({rem.user?.role?.replace(/_/g, ' ')})</span></span>
                          <span className="font-mono text-gray-500">
                            📅 {new Date(rem.createdAt).toLocaleDateString()} ⏰ {new Date(rem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-gray-200 text-[11px] leading-snug">{rem.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Revision History & Workflow Controls - ONLY for Tasks Linked to Parent Entity */}
            {Boolean(inspectedTask.projectId || inspectedTask.scriptId || inspectedTask.graphicRequirementId) && !isTaskRevision(inspectedTask) && (
              <div className="bg-gray-900 border border-amber-800/40 p-3 rounded-lg space-y-3">
                <RevisionsTab
                  entityType="TASK"
                  entityId={inspectedTask.id}
                  entityTitle={inspectedTask.title}
                  originalAssigneeId={inspectedTask.assignedEmployees?.[0]?.userId}
                  originalAssigneeName={inspectedTask.assignedEmployees?.[0]?.user?.name}
                  userRole={user?.role}
                  userId={user?.id}
                  currentStatus={inspectedTask.status}
                  isRevision={isTaskRevision(inspectedTask)}
                  onRefresh={loadData}
                />
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
                        <button
                          onClick={() => {
                            setSelectedWorkDetailsEmp(null);
                            openUpdateTaskModal(t);
                          }}
                          className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold transition-colors"
                        >
                          ✏️ Update Progress
                        </button>
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
