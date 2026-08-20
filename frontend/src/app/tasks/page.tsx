'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CheckSquare, AlertTriangle, Plus, ArrowRight, RefreshCw, CheckCircle2, Search, SlidersHorizontal, RotateCcw, X, Building2, Tag, User, Calendar, Flame, Clock, ArrowUpDown } from 'lucide-react';
import { TableSortHeader, SortSelector } from '@/components/common/TableSortHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { usePagination } from '@/lib/usePagination';
import { sortData, SortField, SortOrder } from '@/utils/sortUtils';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [capacity, setCapacity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [newRemarkText, setNewRemarkText] = useState('');
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [reassignReason, setReassignReason] = useState('');

  // Deliverable Upload Modal state
  const [uploadTask, setUploadTask] = useState<any>(null);
  const [uploadFileUrl, setUploadFileUrl] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadingDeliverable, setUploadingDeliverable] = useState(false);

  // Configurable Daily Capacity state
  const [editingCapacityUser, setEditingCapacityUser] = useState<any>(null);
  const [editCapacityHours, setEditCapacityHours] = useState('8.0');
  const [savingCapacity, setSavingCapacity] = useState(false);

  // Create Task Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [parentEntityType, setParentEntityType] = useState<'PROJECT' | 'SCRIPT' | 'GRAPHIC_REQ'>('PROJECT');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskEstimatedHours, setTaskEstimatedHours] = useState('2.0');
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [scriptsList, setScriptsList] = useState<any[]>([]);
  const [graphicReqsList, setGraphicReqsList] = useState<any[]>([]);
  const [staffUsersList, setStaffUsersList] = useState<any[]>([]);
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
    loadTasks();
  }, [searchQuery, statusFilter, selectedClient, selectedBrand, selectedProduct, selectedProject, selectedEmployee, selectedPriority]);

  const loadData = loadTasks;

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentId) {
      alert('Every task must belong to one parent entity (Shoot Project, Script, or Graphic Requirement).');
      return;
    }
    setCreating(true);
    try {
      const payload: any = {
        title: taskTitle,
        description: taskDescription,
        priority: taskPriority,
        dueDate: taskDueDate || new Date(Date.now() + 86400000).toISOString(),
        estimatedHours: parseFloat(taskEstimatedHours) || 2.0,
        parentEntityType,
        assignedUserIds: assignedStaffIds,
      };

      if (parentEntityType === 'PROJECT') payload.projectId = selectedParentId;
      else if (parentEntityType === 'SCRIPT') payload.scriptId = selectedParentId;
      else if (parentEntityType === 'GRAPHIC_REQ') payload.graphicRequirementId = selectedParentId;

      await fetchApi('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowCreateModal(false);
      setTaskTitle('');
      setTaskDescription('');
      setSelectedParentId('');
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
    setTargetUserIds((task.assignedEmployees || []).map((a: any) => a.userId));
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
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge task acceptance');
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
          activeDeliverableUrl: res.task.activeDeliverableUrl,
          activeDeliverableFileName: res.task.activeDeliverableFileName,
          activeDeliverableVersion: res.task.activeDeliverableVersion,
          deliverableHistory: [res.historyEntry, ...(inspectedTask.deliverableHistory || [])],
        });
      }

      setUploadTask(null);
      setUploadFileUrl('');
      setUploadFileName('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to upload deliverable');
    } finally {
      setUploadingDeliverable(false);
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

      {/* Workload Capacity Section */}
      <div className="bg-card border border-border p-5 rounded-xl space-y-4">
        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Automated Continuous Workload &amp; Capacity Engine
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Continuously calculated from Estimated Hours, Active Tasks, Due Dates (Urgency), Employee Capacity, and Task Priority.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-mono font-bold text-[10px]">
            ⚡ Auto-Updated Live
          </span>
        </div>

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
                        onClick={() => {
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
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Tasks Table */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Tasks...</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px] border-b border-border">
              <tr>
                <th className="p-4">
                  <TableSortHeader
                    label="Task ID & Title"
                    field="name"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="p-4">
                  <TableSortHeader
                    label="Parent Entity"
                    field="project"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="p-4">
                  <TableSortHeader
                    label="Assigned Staff"
                    field="employee"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="p-4">Hours</th>
                <th className="p-4">
                  <TableSortHeader
                    label="Deadline"
                    field="deadline"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="p-4">
                  <TableSortHeader
                    label="Status"
                    field="status"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {(() => {
                const filteredAndSorted = sortData(
                  tasks.filter((t) => statusFilter === 'ALL' || t.status === statusFilter),
                  sortBy,
                  sortOrder
                );
                const paginated = paginate(filteredAndSorted);
                return paginated.map((task) => (
                <tr key={task.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <FavoriteButton
                        entityType="TASK"
                        entityId={task.id}
                        title={task.title}
                        code={task.taskId}
                        url="/tasks"
                        metadata={{ status: task.status, priority: task.priority, brand: task.brand?.name }}
                        size="sm"
                      />
                      <div>
                        <span className="font-mono text-blue-400 font-bold block">{task.taskId}</span>
                        <span className="font-bold text-white">{task.title}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-xs">
                    {task.script ? (
                      <div>
                        <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded font-semibold text-[10px] inline-block mb-1">
                          📄 Script
                        </span>
                        <div className="text-white font-medium">{task.script.name}</div>
                      </div>
                    ) : task.graphicRequirement ? (
                      <div>
                        <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded font-semibold text-[10px] inline-block mb-1">
                          🎨 Graphic Req
                        </span>
                        <div className="text-white font-medium">{task.graphicRequirement.name}</div>
                      </div>
                    ) : (
                      <div>
                        <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded font-semibold text-[10px] inline-block mb-1">
                          🎬 Shoot Project
                        </span>
                        <div className="text-white font-medium">{task.project?.name}</div>
                      </div>
                    )}
                    <div className="text-[10px] text-gray-500 mt-0.5">{task.brand?.name}</div>
                  </td>

                  <td className="p-4">
                    {task.assignedEmployees?.length === 0 ? (
                      <span className="text-gray-500 italic text-[11px]">Unassigned</span>
                    ) : (
                      task.assignedEmployees?.map((a: any) => (
                        <div key={a.id} className="my-1">
                          <span className="font-semibold text-gray-200 block text-[11px]">{a.user?.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border inline-block ${
                              a.acceptanceStatus === 'ACCEPTED'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}
                          >
                            {a.acceptanceStatus === 'ACCEPTED' ? '✓ Accepted' : '⏳ Not Yet Accepted'}
                          </span>
                        </div>
                      ))
                    )}
                  </td>

                  <td className="p-4 font-mono font-bold text-gray-300">{task.estimatedHours}h</td>

                  <td className="p-4 w-40">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="25"
                        value={task.completionPercentage}
                        onChange={(e) => handleUpdateProgress(task.id, parseInt(e.target.value))}
                        className="w-full"
                      />
                      <span className="font-bold text-[11px] w-8">{task.completionPercentage}%</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                      className={`px-2 py-1 rounded font-bold text-[10px] border focus:outline-none cursor-pointer transition-colors ${getStatusBadge(
                        task.status,
                      )}`}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="ACCEPTED">Accepted</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="WAITING_FOR_REVIEW">Waiting for Review</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </td>

                  <td className="p-4 flex items-center gap-1.5">
                    {task.assignedEmployees?.some((a: any) => a.userId === user?.id && a.acceptanceStatus !== 'ACCEPTED') && (
                      <button
                        onClick={() => handleAcknowledgeAcceptance(task.id)}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded font-bold text-[11px] flex items-center gap-1 shadow-sm"
                        title="Acknowledge Receipt & Accept Task"
                      >
                        ✓ Accept
                      </button>
                    )}

                    <button
                      onClick={() => setUploadTask(task)}
                      className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded font-semibold text-[11px] flex items-center gap-1"
                      title="Upload Latest Work Deliverable"
                    >
                      📤 Upload Work
                    </button>

                    <button
                      onClick={() => setInspectedTask(task)}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded font-semibold text-[11px] flex items-center gap-1"
                    >
                      👁️ Inspect
                    </button>
                    {user?.role === 'MEDIA_MANAGER' && (
                      <button
                        onClick={() => openReassignDrawer(task)}
                        className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded font-semibold text-[11px] flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Reassign
                      </button>
                    )}
                  </td>
                </tr>
                ));
              })()}
            </tbody>
          </table>

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
            className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4 text-xs shadow-2xl relative"
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
              {/* Parent Entity Type Switcher */}
              <div>
                <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Select Parent Entity Type *</label>
                <div className="grid grid-cols-3 gap-1.5">
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
                <label className="block text-gray-400 font-semibold mb-1 text-[10px]">2. Select Specific Parent *</label>
                {parentEntityType === 'PROJECT' && (
                  <select
                    required
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-medium"
                  >
                    <option value="">-- Choose Shoot Project --</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.projectId})</option>
                    ))}
                  </select>
                )}

                {parentEntityType === 'SCRIPT' && (
                  <select
                    required
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-medium"
                  >
                    <option value="">-- Choose Parent Script --</option>
                    {scriptsList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.scriptId})</option>
                    ))}
                  </select>
                )}

                {parentEntityType === 'GRAPHIC_REQ' && (
                  <select
                    required
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-medium"
                  >
                    <option value="">-- Choose Graphic Requirement --</option>
                    {graphicReqsList.map((g) => (
                      <option key={g.id} value={g.id}>{g.name} ({g.requirementId})</option>
                    ))}
                  </select>
                )}
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-medium"
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
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Assign Employees (One or Multiple)</label>
                <div className="space-y-1 max-h-32 overflow-y-auto bg-gray-950 border border-gray-700 rounded p-2">
                  {staffUsersList.map((u) => {
                    const empStatus = u.employeeProfile?.employmentStatus || u.status || 'ACTIVE';
                    const isActive = empStatus === 'ACTIVE' && u.status === 'ACTIVE' && !u.isArchived;

                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 text-xs p-1 rounded ${
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
                        <span>
                          {u.name} ({u.role}) {!isActive && <span className="text-amber-400 font-bold ml-1 font-mono">({empStatus} - Restricted)</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !selectedParentId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
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
                          type="checkbox"
                          checked={targetUserIds.includes(rec.userId)}
                          onChange={(e) => {
                            if (e.target.checked) setTargetUserIds([...targetUserIds, rec.userId]);
                            else setTargetUserIds(targetUserIds.filter((id) => id !== rec.userId));
                          }}
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
              </div>
              <button
                onClick={() => setInspectedTask(null)}
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-3">
                <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Task Description</span>
                  <p className="text-gray-200 mt-1">{inspectedTask.description || 'No description provided.'}</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg space-y-1.5">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">Parent Project</span>
                    <strong className="text-blue-300 text-xs">{inspectedTask.project?.name || 'N/A'}</strong>
                    <span className="text-[10px] text-gray-400 font-mono ml-2">({inspectedTask.project?.projectId})</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">Parent Script / Graphic Req</span>
                    {inspectedTask.script ? (
                      <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded font-semibold text-[10px] inline-block">
                        📄 Script: {inspectedTask.script.name} ({inspectedTask.script.scriptId})
                      </span>
                    ) : inspectedTask.graphicRequirement ? (
                      <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded font-semibold text-[10px] inline-block">
                        🎨 Graphic Req: {inspectedTask.graphicRequirement.name} ({inspectedTask.graphicRequirement.requirementId})
                      </span>
                    ) : (
                      <span className="text-gray-400 font-mono text-[10px]">Direct Shoot Project Parent</span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg space-y-1">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Client:</span>{' '}
                    <strong className="text-white">{inspectedTask.client?.name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Brand:</span>{' '}
                    <strong className="text-purple-300">[{inspectedTask.brand?.shortCode}] {inspectedTask.brand?.name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Product (Optional):</span>{' '}
                    <strong className="text-cyan-300">{inspectedTask.product?.name ? `${inspectedTask.product.name} (${inspectedTask.product.productCode})` : 'N/A (General)'}</strong>
                  </div>
                </div>

                {/* Active Work Deliverable (Only Latest File Active) */}
                <div className="bg-gray-900 border border-cyan-800/50 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1">
                      📤 Active Work Deliverable (Latest File Only)
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadTask(inspectedTask)}
                      className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-[10px] transition-colors"
                    >
                      + Replace / Upload
                    </button>
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
                      <div className="flex justify-between items-center pt-1 border-t border-gray-800 text-[10px]">
                        <a
                          href={inspectedTask.activeDeliverableUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline font-bold"
                        >
                          🔗 Open / Download Active Deliverable ↗
                        </a>
                        <span className="text-gray-500 font-mono text-[9px]">Replaces older versions</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-[11px] p-1">No deliverable uploaded yet for this task.</p>
                  )}

                  {/* Deliverable Revision Timeline Stream */}
                  {inspectedTask.deliverableHistory?.length > 0 && (
                    <div className="pt-2 border-t border-gray-800 space-y-1.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Deliverable Revision History Timeline</span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {inspectedTask.deliverableHistory.map((h: any) => (
                          <div key={h.id} className="p-2 bg-gray-950 border border-gray-800 rounded flex items-center justify-between text-[10px]">
                            <div>
                              <span className="font-bold text-gray-200">v{h.version} — {h.fileName}</span>
                              <div className="text-[9px] text-gray-500">by {h.user?.name} on {new Date(h.createdAt).toLocaleDateString()}</div>
                            </div>
                            <a
                              href={h.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline text-[10px]"
                            >
                              View History File
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Assigned Employees</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(inspectedTask.assignedEmployees || []).length === 0 ? (
                      <span className="text-gray-500 italic">No assigned staff</span>
                    ) : (
                      inspectedTask.assignedEmployees.map((a: any) => (
                        <span key={a.id} className="px-2 py-1 bg-gray-800 text-blue-300 rounded font-semibold text-[11px]">
                          👤 {a.user?.name} ({a.user?.role})
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">Priority</span>
                    <strong className={`text-xs px-2 py-0.5 rounded ${
                      inspectedTask.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                      inspectedTask.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>{inspectedTask.priority}</strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">Due Date</span>
                    <span className="text-gray-200 text-xs">{new Date(inspectedTask.dueDate).toLocaleDateString()}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">Estimated Hours</span>
                    <strong className="text-emerald-400 text-xs">{inspectedTask.estimatedHours}h</strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block uppercase">Current Status</span>
                    <strong className="text-purple-300 text-xs">{inspectedTask.status}</strong>
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Completion Percentage</span>
                    <strong className="text-white text-xs">{inspectedTask.completionPercentage}%</strong>
                  </div>
                  <div className="w-full bg-gray-950 rounded-full h-2 overflow-hidden border border-gray-800">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${inspectedTask.completionPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg space-y-3">
                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Permanent Execution Remarks History</span>
                  
                  {/* Add Remark Form */}
                  <div className="space-y-1.5 pt-1">
                    <textarea
                      rows={2}
                      placeholder="Add an execution remark (User, Date, Time recorded automatically)..."
                      value={newRemarkText}
                      onChange={(e) => setNewRemarkText(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleAddRemark(inspectedTask.id)}
                        disabled={submittingRemark || !newRemarkText.trim()}
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
                            <span className="font-bold text-blue-400">👤 {rem.user?.name || 'User'} <span className="text-gray-500 font-normal">({rem.user?.role})</span></span>
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

                {/* Permanent Task Activity Timeline (Never Deleted) */}
                <div className="bg-gray-900 border border-purple-800/40 p-3 rounded-lg space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-[10px] text-purple-400 font-bold uppercase flex items-center gap-1.5">
                      📜 Permanent Task Activity Timeline (Immutable Log)
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">Entries Never Deleted</span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(!inspectedTask.timeline || inspectedTask.timeline.length === 0) ? (
                      <p className="text-gray-500 italic text-[11px]">No timeline entries recorded yet.</p>
                    ) : (
                      inspectedTask.timeline.map((item: any) => {
                        let eventBadge = 'bg-gray-800 text-gray-300';
                        let eventIcon = '📌';
                        if (item.event === 'TASK_CREATED') { eventBadge = 'bg-blue-950 text-blue-300 border-blue-800'; eventIcon = '🆕'; }
                        else if (item.event === 'TASK_ASSIGNED') { eventBadge = 'bg-purple-950 text-purple-300 border-purple-800'; eventIcon = '👥'; }
                        else if (item.event === 'EMPLOYEE_ACCEPTED') { eventBadge = 'bg-emerald-950 text-emerald-300 border-emerald-800'; eventIcon = '✍️'; }
                        else if (item.event === 'STATUS_CHANGED') { eventBadge = 'bg-yellow-950 text-yellow-300 border-yellow-800'; eventIcon = '🔄'; }
                        else if (item.event === 'PROGRESS_UPDATED') { eventBadge = 'bg-cyan-950 text-cyan-300 border-cyan-800'; eventIcon = '📊'; }
                        else if (item.event === 'FILE_UPLOADED') { eventBadge = 'bg-teal-950 text-teal-300 border-teal-800'; eventIcon = '📤'; }
                        else if (item.event === 'REMARK_ADDED') { eventBadge = 'bg-indigo-950 text-indigo-300 border-indigo-800'; eventIcon = '💬'; }
                        else if (item.event === 'COMPLETED') { eventBadge = 'bg-emerald-950 text-emerald-300 border-emerald-800'; eventIcon = '🎉'; }

                        return (
                          <div key={item.id} className="p-2.5 bg-gray-950 border border-gray-800 rounded-lg text-xs space-y-1 hover:border-gray-700 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded font-bold text-[9px] border ${eventBadge}`}>
                                {eventIcon} {item.event.replace(/_/g, ' ')}
                              </span>
                              <span className="font-mono text-[9px] text-gray-500">
                                📅 {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-gray-200 text-[11px] font-medium leading-snug">{item.description}</p>
                            {item.user && (
                              <div className="text-[9px] text-gray-500 font-mono pt-0.5">
                                Logged by: <span className="text-gray-300 font-bold">{item.user.name}</span> ({item.user.role})
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
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
        </div>
      )}
    </div>
  );
}
