'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { FileText, UserPlus, X, MessageSquare, Send, Search, Filter, RotateCcw, SlidersHorizontal, Building2, Users, Layers, Check, Copy, Eye } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { SortSelector } from '@/components/common/TableSortHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { recordRecentAccess } from '@/lib/recent-access';
import { usePagination } from '@/lib/usePagination';
import { sortData, SortField, SortOrder } from '@/utils/sortUtils';

export default function ScriptsPage() {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Storyline & Description UI States
  const [copiedStoryline, setCopiedStoryline] = useState(false);
  const [showStorylinePreview, setShowStorylinePreview] = useState(false);
  const [storylineTab, setStorylineTab] = useState<'view' | 'edit'>('view');

  // Pagination Hook
  const { currentPage, setCurrentPage, pageSize, setPageSize, paginate } = usePagination();

  // Sorting State
  const [sortBy, setSortBy] = useState<SortField | string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Assignment Panel State
  const [assignUserId, setAssignUserId] = useState('');
  const [assignResponsibility, setAssignResponsibility] = useState('Writer');

  // Multi-Field Search & Filter State (Project Filtration Session Design - 9 Parameters)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [filterClient, setFilterClient] = useState('ALL');
  const [filterProject, setFilterProject] = useState('ALL');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterProduct, setFilterProduct] = useState('ALL');
  const [filterLanguage, setFilterLanguage] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterEmployee, setFilterEmployee] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');

  // Inspector Modal State
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDuration, setEditDuration] = useState('30s');
  const [editRemarks, setEditRemarks] = useState('');
  const [editStatus, setEditStatus] = useState('DRAFT');
  const [editPriority, setEditPriority] = useState('MEDIUM');
  const [saving, setSaving] = useState(false);

  // Mandatory 4 Completion Criteria State
  const [prodComp, setProdComp] = useState(false);
  const [techAppr, setTechAppr] = useState(false);
  const [mediaAppr, setMediaAppr] = useState(false);
  const [clientConf, setClientConf] = useState(false);

  // Remarks State
  const [newRemarkText, setNewRemarkText] = useState('');
  const [addingRemark, setAddingRemark] = useState(false);

  // Deliverables State
  const [newDelivType, setNewDelivType] = useState('Reel');
  const [newDelivTitle, setNewDelivTitle] = useState('');
  const [newDelivDuration, setNewDelivDuration] = useState('');

  // File Upload State
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);

  // Create Script Modal State (All Fields)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [newName, setNewName] = useState('');
  const [newLanguage, setNewLanguage] = useState('Malayalam (KL)');
  const [newCategory, setNewCategory] = useState('Advertisement');
  const [newObjective, setNewObjective] = useState('Generate Sales');
  const [newDescription, setNewDescription] = useState('');
  const [newDuration, setNewDuration] = useState('30s');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newStatus, setNewStatus] = useState('DRAFT');
  const [newRemarks, setNewRemarks] = useState('');

  const loadReferenceData = async () => {
    try {
      const [resProjects, resUsers, resClients] = await Promise.all([
        fetchApi('/projects'),
        fetchApi('/users'),
        fetchApi('/clients'),
      ]);
      const projs = Array.isArray(resProjects) ? resProjects : [];
      setProjectsList(projs);
      setUsersList(Array.isArray(resUsers) ? resUsers : []);
      setClientsList(Array.isArray(resClients) ? resClients : []);
      if (projs.length > 0 && !newProjectId) {
        setNewProjectId(projs[0].id);
      }
    } catch (err) {
      console.error('Failed to load scripts reference metadata:', err);
    }
  };

  const loadScripts = async () => {
    setLoading(true);
    try {
      const resScripts = await fetchApi('/scripts');
      setScripts(Array.isArray(resScripts) ? resScripts : []);
    } catch (err) {
      console.error('Failed to load scripts list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferenceData();
    loadScripts();
  }, []);

  const handleAssignEmployee = async () => {
    if (!selectedScript || !assignUserId) return;
    try {
      await fetchApi(`/scripts/${selectedScript.id}/assignments`, {
        method: 'POST',
        body: JSON.stringify({ userId: assignUserId, responsibility: assignResponsibility }),
      });
      const updated = await fetchApi(`/scripts/${selectedScript.id}`);
      setSelectedScript(updated);
      setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setAssignUserId('');
    } catch (err: any) {
      alert(err.message || 'Failed to assign employee');
    }
  };

  const handleRemoveAssignment = async (userId: string, responsibility: string) => {
    if (!selectedScript) return;
    try {
      await fetchApi(`/scripts/${selectedScript.id}/assignments`, {
        method: 'DELETE',
        body: JSON.stringify({ userId, responsibility }),
      });
      const updated = await fetchApi(`/scripts/${selectedScript.id}`);
      setSelectedScript(updated);
      setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err: any) {
      alert(err.message || 'Failed to remove assignment');
    }
  };

  const handleAddRemark = async () => {
    if (!selectedScript || !newRemarkText.trim()) return;
    setAddingRemark(true);
    try {
      await fetchApi(`/scripts/${selectedScript.id}/remarks`, {
        method: 'POST',
        body: JSON.stringify({ message: newRemarkText.trim() }),
      });
      const updated = await fetchApi(`/scripts/${selectedScript.id}`);
      setSelectedScript(updated);
      setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setNewRemarkText('');
    } catch (err: any) {
      alert(err.message || 'Failed to add remark');
    } finally {
      setAddingRemark(false);
    }
  };

  const handleAddDeliverable = async () => {
    if (!selectedScript || !newDelivType) return;
    try {
      await fetchApi(`/scripts/${selectedScript.id}/deliverables`, {
        method: 'POST',
        body: JSON.stringify({ type: newDelivType, title: newDelivTitle || undefined, duration: newDelivDuration || undefined }),
      });
      const updated = await fetchApi(`/scripts/${selectedScript.id}`);
      setSelectedScript(updated);
      setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setNewDelivTitle('');
      setNewDelivDuration('');
    } catch (err: any) {
      alert(err.message || 'Failed to add deliverable');
    }
  };

  const handleDeleteDeliverable = async (deliverableId: string) => {
    if (!selectedScript) return;
    try {
      await fetchApi(`/scripts/deliverables/${deliverableId}`, { method: 'DELETE' });
      const updated = await fetchApi(`/scripts/${selectedScript.id}`);
      setSelectedScript(updated);
      setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err: any) {
      alert(err.message || 'Failed to remove deliverable');
    }
  };

  const handleFileUpload = async (file: File, category: string) => {
    if (!selectedScript || !file) return;
    setUploadingCategory(category);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', selectedScript.projectId);
      formData.append('scriptId', selectedScript.id);
      formData.append('attachmentCategory', category);

      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'File upload failed');
      }

      const updated = await fetchApi(`/scripts/${selectedScript.id}`);
      setSelectedScript(updated);
      setScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err: any) {
      alert(err.message || 'Failed to upload/replace active version file');
    } finally {
      setUploadingCategory(null);
    }
  };

  useEffect(() => {
    loadScripts();
  }, []);

  const handleCreateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectId) {
      alert('Please select a target shoot project');
      return;
    }
    setSaving(true);
    try {
      await fetchApi('/scripts', {
        method: 'POST',
        body: JSON.stringify({
          projectId: newProjectId,
          name: newName.trim(), // blank auto-generates
          language: newLanguage,
          category: newCategory,
          objective: newObjective,
          description: newDescription,
          estimatedDuration: newDuration,
          priority: newPriority,
          status: newStatus,
          remarks: newRemarks,
        }),
      });
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      setNewRemarks('');
      loadScripts();
    } catch (err: any) {
      alert(err.message || 'Failed to create script');
    } finally {
      setSaving(false);
    }
  };

  const openInspector = (s: any) => {
    setSelectedScript(s);
    recordRecentAccess({
      entityType: 'SCRIPT',
      entityId: s.id,
      title: s.name,
      code: s.scriptId,
      url: `/projects/${s.projectId}?tab=Scripts`,
      metadata: { project: s.project?.name, client: s.client?.name, brand: s.brand?.name, language: s.language, status: s.status },
    });
    setEditDescription(s.description || '');
    setEditDuration(s.estimatedDuration || '30s');
    setEditRemarks(s.remarks || '');
    setEditStatus(s.status || 'DRAFT');
    setEditPriority(s.priority || 'MEDIUM');
    setProdComp(!!s.productionCompleted);
    setTechAppr(!!s.technicalReviewApproved);
    setMediaAppr(!!s.mediaManagerReviewApproved);
    setClientConf(!!s.clientConfirmationRecorded);
  };

  const handleSaveScript = async () => {
    if (!selectedScript) return;
    setSaving(true);
    try {
      await fetchApi(`/scripts/${selectedScript.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          description: editDescription,
          estimatedDuration: editDuration,
          remarks: editRemarks,
          status: editStatus,
          priority: editPriority,
          productionCompleted: prodComp,
          technicalReviewApproved: techAppr,
          mediaManagerReviewApproved: mediaAppr,
          clientConfirmationRecorded: clientConf,
        }),
      });
      setSelectedScript(null);
      loadScripts();
    } catch (err: any) {
      alert(err.message || 'Failed to update script details');
    } finally {
      setSaving(false);
    }
  };

  // Keyboard Shortcuts Save & Cancel Listeners
  useEffect(() => {
    const handleGlobalSave = () => {
      if (selectedScript) {
        handleSaveScript();
      }
    };
    const handleGlobalCancel = () => {
      if (selectedScript) {
        setSelectedScript(null);
      } else if (showCreateModal) {
        setShowCreateModal(false);
      }
    };

    window.addEventListener('moms:save', handleGlobalSave);
    window.addEventListener('moms:cancel', handleGlobalCancel);
    return () => {
      window.removeEventListener('moms:save', handleGlobalSave);
      window.removeEventListener('moms:cancel', handleGlobalCancel);
    };
  }, [selectedScript, showCreateModal, editDescription, editDuration, editRemarks, editStatus, editPriority, prodComp, techAppr, mediaAppr, clientConf]);

  const filteredScripts = scripts.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const idMatch = (s.scriptId || '').toLowerCase().includes(q);
      const productMatch = (s.product?.name || '').toLowerCase().includes(q) || (s.product?.productCode || '').toLowerCase().includes(q);
      const brandMatch = (s.brand?.name || '').toLowerCase().includes(q) || (s.brand?.shortCode || '').toLowerCase().includes(q);
      const languageMatch = (s.language || '').toLowerCase().includes(q);
      const categoryMatch = (s.category || '').toLowerCase().includes(q);
      const projectMatch = (s.project?.name || '').toLowerCase().includes(q) || (s.project?.projectId || '').toLowerCase().includes(q);

      const assignedNames = [
        ...(s.scriptAssignments || []).map((a: any) => a.user?.name),
        ...(s.tasks || []).flatMap((t: any) => (t.assignedEmployees || []).map((e: any) => e.user?.name)),
      ].filter(Boolean);
      const employeeMatch = assignedNames.some((n: string) => n.toLowerCase().includes(q));

      if (!nameMatch && !idMatch && !productMatch && !brandMatch && !languageMatch && !categoryMatch && !projectMatch && !employeeMatch) {
        return false;
      }
    }

    if (filterClient !== 'ALL' && s.clientId !== filterClient) return false;
    if (filterProject !== 'ALL' && s.projectId !== filterProject) return false;
    if (filterBrand !== 'ALL' && s.brandId !== filterBrand) return false;
    if (filterProduct !== 'ALL' && s.productId !== filterProduct) return false;
    if (filterLanguage !== 'ALL' && s.language !== filterLanguage) return false;
    if (filterCategory !== 'ALL' && s.category !== filterCategory) return false;
    if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
    if (filterPriority !== 'ALL' && s.priority !== filterPriority) return false;
    if (filterDate && (!s.createdAt?.startsWith(filterDate) && !s.project?.shootDate?.startsWith(filterDate))) return false;
    if (filterEmployee !== 'ALL') {
      const assignedUserIds = [
        ...(s.scriptAssignments || []).map((a: any) => a.userId),
        ...(s.tasks || []).flatMap((t: any) => (t.assignedEmployees || []).map((e: any) => e.userId)),
      ].filter(Boolean);
      if (!assignedUserIds.includes(filterEmployee)) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 text-xs">
      <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" /> Media Scripts Repository
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Centralized repository for managing production scripts
          </p>
        </div>

        {(user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
          >
            + Create New Script
          </button>
        )}
      </div>

      {/* Project Filtration Session Control Panel */}
      <div className="bg-card border border-border p-5 rounded-xl space-y-4 text-xs shadow-md">
        {/* Top Primary Filter Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Keyword Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Script ID, Name, Client, Brand, Product, Category, Language, Staff, Project..."
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

          {/* Quick Presets & Toggle Drawer Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus(filterStatus === 'CLIENT_REVISION_REQUESTED' ? 'ALL' : 'CLIENT_REVISION_REQUESTED')}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                filterStatus === 'CLIENT_REVISION_REQUESTED'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              🔄 Revision Requested
            </button>

            <button
              onClick={() => setFilterStatus(filterStatus === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                filterStatus === 'COMPLETED'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <Check className="w-3.5 h-3.5" /> Completed
            </button>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                showAdvancedFilters || (filterClient !== 'ALL' || filterProject !== 'ALL' || filterBrand !== 'ALL' || filterProduct !== 'ALL' || filterLanguage !== 'ALL' || filterCategory !== 'ALL' || filterEmployee !== 'ALL' || filterStatus !== 'ALL' || filterPriority !== 'ALL' || !!filterDate)
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>Project Filtration</span>
              {[filterClient, filterProject, filterBrand, filterProduct, filterLanguage, filterCategory, filterEmployee, filterStatus, filterPriority, filterDate ? 'DATE' : 'ALL'].filter((v) => v !== 'ALL').length > 0 && (
                <span className="w-4 h-4 rounded-full bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center">
                  {[filterClient, filterProject, filterBrand, filterProduct, filterLanguage, filterCategory, filterEmployee, filterStatus, filterPriority, filterDate ? 'DATE' : 'ALL'].filter((v) => v !== 'ALL').length}
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

            {(searchQuery || filterClient !== 'ALL' || filterProject !== 'ALL' || filterBrand !== 'ALL' || filterProduct !== 'ALL' || filterLanguage !== 'ALL' || filterCategory !== 'ALL' || filterEmployee !== 'ALL' || filterStatus !== 'ALL' || filterPriority !== 'ALL' || filterDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterClient('ALL');
                  setFilterProject('ALL');
                  setFilterBrand('ALL');
                  setFilterProduct('ALL');
                  setFilterLanguage('ALL');
                  setFilterCategory('ALL');
                  setFilterEmployee('ALL');
                  setFilterStatus('ALL');
                  setFilterPriority('ALL');
                  setFilterDate('');
                }}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips / Pills Bar */}
        {(filterClient !== 'ALL' || filterProject !== 'ALL' || filterBrand !== 'ALL' || filterProduct !== 'ALL' || filterLanguage !== 'ALL' || filterCategory !== 'ALL' || filterEmployee !== 'ALL' || filterStatus !== 'ALL' || filterPriority !== 'ALL' || filterDate) && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-800">
            <span className="text-gray-500 text-[11px] font-semibold">Active Filters:</span>
            {filterClient !== 'ALL' && (
              <span className="px-2.5 py-1 bg-pink-950 text-pink-300 border border-pink-800 rounded-full flex items-center gap-1 text-[11px]">
                Client: {clientsList.find((c) => c.id === filterClient)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterClient('ALL')} />
              </span>
            )}
            {filterBrand !== 'ALL' && (
              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full flex items-center gap-1 text-[11px]">
                Brand: [{Array.from(new Map(scripts.map((s) => [s.brandId, s.brand] as [string, any])).values()).find((b: any) => b?.id === filterBrand)?.shortCode}] {Array.from(new Map(scripts.map((s) => [s.brandId, s.brand] as [string, any])).values()).find((b: any) => b?.id === filterBrand)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterBrand('ALL')} />
              </span>
            )}
            {filterProduct !== 'ALL' && (
              <span className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full flex items-center gap-1 text-[11px]">
                Product: {Array.from(new Map(scripts.filter((s) => s.product).map((s) => [s.productId, s.product] as [string, any])).values()).find((p: any) => p?.id === filterProduct)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterProduct('ALL')} />
              </span>
            )}
            {filterLanguage !== 'ALL' && (
              <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full flex items-center gap-1 text-[11px]">
                Language: {filterLanguage}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterLanguage('ALL')} />
              </span>
            )}
            {filterCategory !== 'ALL' && (
              <span className="px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-full flex items-center gap-1 text-[11px]">
                Category: {filterCategory}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterCategory('ALL')} />
              </span>
            )}
            {filterStatus !== 'ALL' && (
              <span className="px-2.5 py-1 bg-blue-950 text-blue-300 border border-blue-800 rounded-full flex items-center gap-1 text-[11px]">
                Status: {filterStatus}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterStatus('ALL')} />
              </span>
            )}
            {filterPriority !== 'ALL' && (
              <span className="px-2.5 py-1 bg-red-950 text-red-300 border border-red-800 rounded-full flex items-center gap-1 text-[11px]">
                Priority: {filterPriority}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterPriority('ALL')} />
              </span>
            )}
            {filterDate && (
              <span className="px-2.5 py-1 bg-gray-800 text-gray-200 border border-gray-700 rounded-full flex items-center gap-1 text-[11px] font-mono">
                Date: {filterDate}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterDate('')} />
              </span>
            )}
            {filterEmployee !== 'ALL' && (
              <span className="px-2.5 py-1 bg-blue-950 text-blue-200 border border-blue-800 rounded-full flex items-center gap-1 text-[11px]">
                Staff: {usersList.find((u) => u.id === filterEmployee)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setFilterEmployee('ALL')} />
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
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="ALL">All Clients</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="ALL">All Brands</option>
                    {Array.from(new Map(scripts.map((s) => [s.brandId, s.brand] as [string, any])).values())
                      .filter(Boolean)
                      .map((b: any) => (
                        <option key={b.id} value={b.id}>[{b.shortCode}] {b.name}</option>
                      ))}
                  </select>

                  <select
                    value={filterProduct}
                    onChange={(e) => setFilterProduct(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="ALL">All Products</option>
                    {Array.from(new Map(scripts.filter((s) => s.product).map((s) => [s.productId, s.product] as [string, any])).values())
                      .map((prod: any) => (
                        <option key={prod.id} value={prod.id}>{prod.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Group 2: Assigned Staff & Crew */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-blue-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" /> Crew &amp; Personnel
                </div>
                <div className="space-y-2">
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="ALL">All Assigned Staff</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="ALL">All Languages</option>
                    {Array.from(new Set(scripts.map((s) => s.language).filter(Boolean))).map((lang: any) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>

                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="ALL">All Categories / Purpose</option>
                    {Array.from(new Set(scripts.map((s) => s.category).filter(Boolean))).map((cat: any) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 3: Operational Lifecycle & Schedule */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-amber-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-400" /> Status, Priority &amp; Date
                </div>
                <div className="space-y-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="ALL">All Operational Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="READY">Ready</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PRODUCTION">In Production</option>
                    <option value="WAITING_FOR_TECHNICAL_REVIEW">Waiting for Technical Review</option>
                    <option value="WAITING_FOR_MEDIA_REVIEW">Waiting for Media Review</option>
                    <option value="WAITING_FOR_CLIENT_CONFIRMATION">Waiting for Client Confirmation</option>
                    <option value="CLIENT_REVISION_REQUESTED">Client Revision Requested</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CLOSED">Closed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>

                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>

                  <div>
                    <label className="block text-gray-400 font-semibold mb-1 text-[10px]">Filter Date</label>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Counter Summary */}
        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-800">
          <span className="text-gray-400 font-medium">
            Showing <strong className="text-blue-400 font-bold">{filteredScripts.length}</strong> of <strong className="text-white">{scripts.length}</strong> scripts
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Scripts Repository...</div>
      ) : filteredScripts.length === 0 ? (
        <div className="p-12 text-center bg-gray-950 border border-gray-800 rounded-xl space-y-2">
          <p className="text-gray-400 font-semibold text-sm">No scripts match your search criteria</p>
          <p className="text-gray-500 text-xs">Try clearing search filters or searching for a different keyword.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {paginate(sortData(filteredScripts, sortBy, sortOrder)).map((s) => {
            const assignedStaffNames = Array.from(
              new Set(
                (s.tasks || [])
                  .flatMap((t: any) => (t.assignedEmployees || []).map((e: any) => e.user?.name))
                  .filter(Boolean),
              ),
            );

            return (
              <div
                key={s.id}
                onClick={() => openInspector(s)}
                className="bg-card border border-border p-5 rounded-xl space-y-3 flex flex-col justify-between cursor-pointer hover:border-purple-500/50 transition-all shadow-md"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start font-mono text-xs">
                    <div className="flex items-center gap-1.5">
                      <FavoriteButton
                        entityType="SCRIPT"
                        entityId={s.id}
                        title={s.name}
                        code={s.scriptId}
                        url={`/projects/${s.projectId}?tab=Scripts`}
                        metadata={{ project: s.project?.name, client: s.client?.name, brand: s.brand?.name, language: s.language, status: s.status }}
                        size="sm"
                      />
                      <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded font-bold">
                        {s.scriptId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded uppercase">
                        {s.language || 'English'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                        s.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {s.priority}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800/80 rounded">
                        🔄 Revisions: {s.revisionCount || 0}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-white text-base font-mono leading-snug">{s.name}</h3>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300 bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                    <div><span className="text-gray-500">Project:</span> <strong className="text-white">{s.project?.name || s.project?.projectId}</strong></div>
                    <div><span className="text-gray-500">Client:</span> <strong className="text-gray-200">{s.client?.name}</strong></div>
                    <div><span className="text-gray-500">Brand:</span> <strong className="text-purple-400">[{s.brand?.shortCode}] {s.brand?.name}</strong></div>
                    <div><span className="text-gray-500">Product:</span> <strong className="text-emerald-400">{s.product?.name || 'N/A'}</strong></div>
                    <div><span className="text-gray-500">Campaign:</span> {s.campaign?.name || 'N/A (Optional)'}</div>
                    <div><span className="text-gray-500">Category:</span> {s.category || 'Social Media'}</div>
                    <div><span className="text-gray-500">Estimated Duration:</span> <strong className="text-cyan-400">{s.estimatedDuration || '30s'}</strong></div>
                    <div><span className="text-gray-500">Current Status:</span> <strong className="text-blue-400">{s.status}</strong></div>
                  </div>

                  {s.objective && (
                    <div className="text-[11px] text-gray-300">
                      <span className="text-gray-500 font-semibold">Objective:</span> {s.objective}
                    </div>
                  )}

                  {s.description && (
                    <div className="text-[11px] text-gray-400 italic">
                      "{s.description}"
                    </div>
                  )}

                  {s.remarks && (
                    <div className="text-[10px] text-amber-300 bg-amber-950/20 border border-amber-800/40 p-2 rounded">
                      <strong className="text-amber-400">Remark:</strong> "{s.remarks}"
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Assigned Staff: <strong className="text-gray-200">{assignedStaffNames.length > 0 ? assignedStaffNames.join(', ') : 'Unassigned'}</strong></span>
                  <span className="text-[10px] font-mono text-gray-500">Click to View Details →</span>
                </div>
              </div>
            );
          })}
          </div>

          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredScripts.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Script Details Modal */}
      {selectedScript && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-border p-6 rounded-2xl max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                    {selectedScript.scriptId}
                  </span>
                  <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    🔄 Revision Count: {selectedScript.revisionCount || 0}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1 font-mono">{selectedScript.name}</h2>
              <button
                onClick={() => setSelectedScript(null)}
                className="text-gray-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-950 p-4 rounded-xl border border-gray-800 text-[11px]">
                <div><span className="text-gray-500">Script ID:</span> <strong className="text-blue-400 font-mono">{selectedScript.scriptId}</strong></div>
                <div><span className="text-gray-500">Script Name:</span> <strong className="text-white font-mono">{selectedScript.name}</strong></div>
                <div><span className="text-gray-500">Shoot Project:</span> <strong className="text-gray-200">{selectedScript.project?.name}</strong></div>
                <div><span className="text-gray-500">Client:</span> <strong className="text-gray-200">{selectedScript.client?.name}</strong></div>
                <div><span className="text-gray-500">Brand:</span> <strong className="text-purple-400">[{selectedScript.brand?.shortCode}] {selectedScript.brand?.name}</strong></div>
                <div><span className="text-gray-500">Product:</span> <strong className="text-emerald-400">{selectedScript.product?.name || 'N/A'}</strong></div>
                <div><span className="text-gray-500">Campaign:</span> <strong className="text-gray-300">{selectedScript.campaign?.name || 'N/A (Optional)'}</strong></div>
                <div><span className="text-gray-500">Language:</span> <strong className="text-purple-300">{selectedScript.language}</strong></div>
                <div><span className="text-gray-500">Category / Purpose:</span> <strong className="text-amber-300">{selectedScript.category}</strong></div>
                <div><span className="text-gray-500">Objective:</span> <strong className="text-cyan-300">{selectedScript.objective || 'N/A'}</strong></div>
                <div><span className="text-gray-500">Assigned Staff:</span> <strong className="text-gray-200">{selectedScript.tasks?.flatMap((t: any) => (t.assignedEmployees || []).map((e: any) => e.user?.name)).filter(Boolean).join(', ') || 'Unassigned'}</strong></div>
                <div><span className="text-gray-500">Created At:</span> {new Date(selectedScript.createdAt).toLocaleDateString()}</div>
                <div><span className="text-gray-500">Total Revisions:</span> <strong className="text-amber-300 font-bold">{selectedScript.revisionCount || 0} (Maintained for reporting)</strong></div>
              </div>

              {/* 7-Step Script Revision Lifecycle Workflow Guide */}
              <div className="p-3 bg-gray-950 border border-amber-900/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-xs">🔄 Script Revision Workflow (7 Steps)</span>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">Total Revisions Count: {selectedScript.revisionCount || 0}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                  <div className={`p-1.5 rounded border ${selectedScript.status?.includes('REVISION') ? 'bg-amber-950 text-amber-300 border-amber-700 font-bold' : 'bg-gray-900 text-gray-400 border-gray-800'}`}>
                    1. Revision Requested
                  </div>
                  <div className={`p-1.5 rounded border ${selectedScript.status === 'IN_PRODUCTION' ? 'bg-blue-950 text-blue-300 border-blue-700 font-bold' : 'bg-gray-900 text-gray-400 border-gray-800'}`}>
                    2. Assigned Employee Updates Work
                  </div>
                  <div className="p-1.5 rounded border bg-gray-900 text-gray-400 border-gray-800">
                    3. Latest File Uploaded
                  </div>
                  <div className={`p-1.5 rounded border ${selectedScript.status === 'WAITING_FOR_TECHNICAL_REVIEW' ? 'bg-purple-950 text-purple-300 border-purple-700 font-bold' : 'bg-gray-900 text-gray-400 border-gray-800'}`}>
                    4. Technical Review
                  </div>
                  <div className={`p-1.5 rounded border ${selectedScript.status === 'WAITING_FOR_MEDIA_REVIEW' ? 'bg-indigo-950 text-indigo-300 border-indigo-700 font-bold' : 'bg-gray-900 text-gray-400 border-gray-800'}`}>
                    5. Media Manager Review
                  </div>
                  <div className={`p-1.5 rounded border ${selectedScript.status === 'WAITING_FOR_CLIENT_CONFIRMATION' ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold' : 'bg-gray-900 text-gray-400 border-gray-800'}`}>
                    6. Client Confirmation
                  </div>
                  <div className={`p-1.5 rounded border ${selectedScript.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border-emerald-700 font-bold' : 'bg-gray-900 text-gray-400 border-gray-800'}`}>
                    7. Script Completed
                  </div>
                </div>
              </div>

              {/* Mandatory 4 Completion Prerequisites Panel */}
              <div className="p-3 bg-gray-950 border border-emerald-900/50 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h4 className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                    ✅ Script Completion Prerequisites (4 Mandatory Criteria)
                  </h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    prodComp && techAppr && mediaAppr && clientConf
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}>
                    {[prodComp, techAppr, mediaAppr, clientConf].filter(Boolean).length} / 4 Approved
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${prodComp ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-gray-900 border-gray-800 text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={prodComp}
                      onChange={(e) => setProdComp(e.target.checked)}
                      className="rounded accent-emerald-500 w-4 h-4"
                    />
                    <span className="font-medium">1. Production is Complete</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${techAppr ? 'bg-purple-950/60 border-purple-800 text-purple-200' : 'bg-gray-900 border-gray-800 text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={techAppr}
                      onChange={(e) => setTechAppr(e.target.checked)}
                      className="rounded accent-purple-500 w-4 h-4"
                    />
                    <span className="font-medium">2. Technical Review Approved</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${mediaAppr ? 'bg-indigo-950/60 border-indigo-800 text-indigo-200' : 'bg-gray-900 border-gray-800 text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={mediaAppr}
                      onChange={(e) => setMediaAppr(e.target.checked)}
                      className="rounded accent-indigo-500 w-4 h-4"
                    />
                    <span className="font-medium">3. Media Manager Review Approved</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${clientConf ? 'bg-cyan-950/60 border-cyan-800 text-cyan-200' : 'bg-gray-900 border-gray-800 text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={clientConf}
                      onChange={(e) => setClientConf(e.target.checked)}
                      className="rounded accent-cyan-500 w-4 h-4"
                    />
                    <span className="font-medium">4. Client Confirmation Recorded</span>
                  </label>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Estimated Duration</label>
                    <input
                      type="text"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Current Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="READY">Ready</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="IN_PRODUCTION">In Production</option>
                      <option value="WAITING_FOR_TECHNICAL_REVIEW">Waiting for Technical Review</option>
                      <option value="WAITING_FOR_MEDIA_REVIEW">Waiting for Media Review</option>
                      <option value="WAITING_FOR_CLIENT_CONFIRMATION">Waiting for Client Confirmation</option>
                      <option value="CLIENT_REVISION_REQUESTED">Client Revision Requested</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CLOSED">Closed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>

                {/* User-Friendly Dedicated Full Script Storyline & Narration Session */}
                <div className="p-4 bg-gray-950 border border-purple-900/60 rounded-2xl space-y-3 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                        📜 Full Script Storyline &amp; Scene Narration
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(editDescription || selectedScript.description || '');
                          setCopiedStoryline(true);
                          setTimeout(() => setCopiedStoryline(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800 text-purple-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        {copiedStoryline ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-purple-400" />}
                        <span>{copiedStoryline ? 'Copied to Clipboard!' : 'Copy Script Text'}</span>
                      </button>

                      <div className="flex bg-gray-900 border border-gray-800 p-0.5 rounded-lg text-[10px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setStorylineTab('view')}
                          className={`px-2 py-0.5 rounded transition-colors ${storylineTab === 'view' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                          👁️ Formatted View
                        </button>
                        <button
                          type="button"
                          onClick={() => setStorylineTab('edit')}
                          className={`px-2 py-0.5 rounded transition-colors ${storylineTab === 'edit' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                          ✏️ Edit Storyline
                        </button>
                      </div>
                    </div>
                  </div>

                  {storylineTab === 'view' ? (
                    <div className="bg-gray-900/90 border border-gray-800/80 rounded-xl p-4 max-h-64 overflow-y-auto custom-scrollbar">
                      {editDescription?.trim() ? (
                        <div className="whitespace-pre-wrap font-sans text-gray-200 text-xs leading-relaxed tracking-wide">
                          {editDescription}
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
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Enter scene narration, voiceover dialogues, shots..."
                        className="w-full bg-gray-900 border border-purple-900/60 text-white p-3 rounded-xl text-xs font-mono focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-[10px] text-gray-400 flex items-center justify-between font-mono">
                        <span>Tip: Use [Scene X] headers and VO: for voiceover dialogues</span>
                        <span>{editDescription?.length || 0} characters</span>
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Remarks</label>
                  <input
                    type="text"
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    placeholder="Enter operational remarks..."
                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                  />
                </div>
              </div>

              {/* Assign Employees Panel */}
              <div className="p-4 bg-gray-950 border border-blue-900/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h4 className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-blue-400" /> Assigned Employees
                  </h4>
                  <span className="text-[10px] text-gray-500">One employee may hold multiple responsibilities</span>
                </div>

                {/* Current Assignments */}
                <div className="space-y-1.5">
                  {(selectedScript.scriptAssignments || []).length === 0 ? (
                    <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg">
                      <span className="px-2.5 py-1 bg-amber-950/80 text-amber-300 border border-amber-800/80 rounded-md font-bold text-xs">
                        Not Assigned
                      </span>
                    </div>
                  ) : (
                    (selectedScript.scriptAssignments || []).map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center text-[10px] font-bold text-white">
                            {a.user?.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-gray-200 font-semibold text-[11px]">{a.user?.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-800/50 font-semibold">
                            {a.responsibility}
                          </span>
                        </div>
                        {user?.role === 'MEDIA_MANAGER' && (
                          <button
                            onClick={() => handleRemoveAssignment(a.userId, a.responsibility)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Assign New Employee (Media Manager only) */}
                {user?.role === 'MEDIA_MANAGER' && (
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
                    <select
                      value={assignUserId}
                      onChange={(e) => setAssignUserId(e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-700 text-white px-2.5 py-2 rounded-lg text-[11px] focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Employee...</option>
                      {(usersList || []).map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                    <select
                      value={assignResponsibility}
                      onChange={(e) => setAssignResponsibility(e.target.value)}
                      className="bg-gray-900 border border-gray-700 text-white px-2.5 py-2 rounded-lg text-[11px] focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Writer">Writer</option>
                      <option value="Shooter">Shooter</option>
                      <option value="Video Editor">Video Editor</option>
                      <option value="Motion Designer">Motion Designer</option>
                      <option value="Graphic Designer">Graphic Designer</option>
                      <option value="Reviewer">Reviewer</option>
                    </select>
                    <button
                      onClick={handleAssignEmployee}
                      disabled={!assignUserId}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-[11px] disabled:opacity-40 flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Assign
                    </button>
                  </div>
                )}
              </div>

              {/* Operational Timeline Section */}
              <div className="p-4 bg-gray-950 border border-emerald-900/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h4 className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                    <span className="text-emerald-400">⏱</span> Operational Timeline
                  </h4>
                  <span className="text-[10px] text-gray-500 italic">Entries are permanent and never deleted</span>
                </div>

                {(selectedScript.timeline || []).length === 0 ? (
                  <p className="text-gray-500 italic text-[11px]">No timeline events yet</p>
                ) : (
                  <div className="relative pl-5 space-y-3">
                    {/* Vertical connector line */}
                    <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-700" />

                    {(selectedScript.timeline || []).map((t: any, idx: number) => {
                      const eventColors: Record<string, string> = {
                        SCRIPT_CREATED: 'bg-blue-500',
                        ASSIGNED: 'bg-purple-500',
                        PRODUCTION_STARTED: 'bg-emerald-500',
                        PRODUCTION_UPDATED: 'bg-cyan-500',
                        TECHNICAL_REVIEW: 'bg-amber-500',
                        MEDIA_REVIEW: 'bg-orange-500',
                        CLIENT_CONFIRMATION: 'bg-indigo-500',
                        REVISION_REQUESTED: 'bg-red-500',
                        COMPLETED: 'bg-green-500',
                        CLOSED: 'bg-gray-500',
                      };
                      const eventLabels: Record<string, string> = {
                        SCRIPT_CREATED: 'Script Created',
                        ASSIGNED: 'Assigned',
                        PRODUCTION_STARTED: 'Production Started',
                        PRODUCTION_UPDATED: 'Production Updated',
                        TECHNICAL_REVIEW: 'Technical Review',
                        MEDIA_REVIEW: 'Media Review',
                        CLIENT_CONFIRMATION: 'Client Confirmation',
                        REVISION_REQUESTED: 'Revision Requested',
                        COMPLETED: 'Completed',
                        CLOSED: 'Closed',
                      };
                      const dotColor = eventColors[t.event] || 'bg-gray-500';
                      const label = eventLabels[t.event] || t.event;
                      return (
                        <div key={t.id} className="flex items-start gap-3">
                          <div className={`w-3.5 h-3.5 rounded-full ${dotColor} shrink-0 mt-0.5 border-2 border-gray-900 z-10`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-white text-[11px]">{label}</span>
                              <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                                {new Date(t.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {t.description && (
                              <p className="text-gray-400 text-[10px] mt-0.5">{t.description}</p>
                            )}
                            {t.triggeredBy && (
                              <p className="text-[10px] text-gray-500 mt-0.5">By: {t.triggeredBy.name}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Permanent Remarks Section */}
              <div className="p-4 bg-gray-950 border border-amber-900/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h4 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-amber-400" /> Remarks History
                  </h4>
                  <span className="text-[10px] text-gray-500 italic">Permanent — assigned employees &amp; managers</span>
                </div>

                {/* Remark Feed */}
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {(selectedScript.scriptRemarks || []).length === 0 ? (
                    <p className="text-gray-500 italic text-[11px]">No remarks yet. Be the first to add one.</p>
                  ) : (
                    (selectedScript.scriptRemarks || []).map((r: any) => {
                      const date = new Date(r.createdAt);
                      return (
                        <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-amber-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                {r.user?.name?.[0]?.toUpperCase()}
                              </div>
                              <span className="text-amber-200 font-semibold text-[11px]">{r.user?.name}</span>
                              <span className="text-gray-500 text-[10px]">·</span>
                              <span className="text-gray-500 text-[10px] font-mono">
                                {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-300 text-[11px] leading-relaxed pl-[26px]">{r.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add New Remark */}
                <div className="flex items-end gap-2 pt-1 border-t border-gray-800">
                  <textarea
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddRemark(); } }}
                    placeholder="Add a remark… (Enter to submit, Shift+Enter for new line)"
                    rows={2}
                    className="flex-1 bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg text-[11px] resize-none focus:border-amber-500 focus:outline-none placeholder-gray-600"
                  />
                  <button
                    onClick={handleAddRemark}
                    disabled={!newRemarkText.trim() || addingRemark}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-[11px] disabled:opacity-40 flex items-center gap-1 h-[52px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {addingRemark ? '…' : 'Send'}
                  </button>
                </div>
              </div>

              {/* Deliverables Section */}
              <div className="p-4 bg-gray-950 border border-violet-900/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h4 className="font-bold text-violet-300 text-xs flex items-center gap-1.5">
                    🎬 Deliverables
                  </h4>
                  <span className="text-[10px] text-gray-500">{(selectedScript.deliverables || []).length} planned</span>
                </div>

                {/* Deliverable List */}
                <div className="space-y-2">
                  {(selectedScript.deliverables || []).length === 0 ? (
                    <p className="text-gray-500 italic text-[11px]">No deliverables added yet</p>
                  ) : (
                    (selectedScript.deliverables || []).map((d: any) => {
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
                            <button onClick={() => handleDeleteDeliverable(d.id)} className="text-red-400 hover:text-red-300 shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Deliverable (Media Manager only) */}
                {user?.role === 'MEDIA_MANAGER' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-800">
                    <select
                      value={newDelivType}
                      onChange={(e) => setNewDelivType(e.target.value)}
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
                      value={newDelivTitle}
                      onChange={(e) => setNewDelivTitle(e.target.value)}
                      placeholder="Optional title"
                      className="flex-1 min-w-[100px] bg-gray-900 border border-gray-700 text-white px-2.5 py-2 rounded-lg text-[11px] focus:border-violet-500 focus:outline-none placeholder-gray-600"
                    />
                    <input
                      type="text"
                      value={newDelivDuration}
                      onChange={(e) => setNewDelivDuration(e.target.value)}
                      placeholder="Duration (e.g. 30s)"
                      className="w-28 bg-gray-900 border border-gray-700 text-white px-2.5 py-2 rounded-lg text-[11px] focus:border-violet-500 focus:outline-none placeholder-gray-600"
                    />
                    <button
                      onClick={handleAddDeliverable}
                      className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg text-[11px] flex items-center gap-1"
                    >
                      + Add
                    </button>
                  </div>
                )}
              </div>

              {/* Linked Script Attachments Section (7 Categories & Active Version Replacement) */}
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-3 pt-3">
                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-400" /> Linked Script Attachments &amp; Production Files
                  </h4>
                  <span className="text-[10px] text-amber-400/90 font-mono">
                    ⚡ Only latest active version stored • Timeline preserves revision history
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  {/* Category 1: Script Document */}
                  <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-300">📄 1. Script Document</span>
                      <label className="text-[10px] bg-blue-900/40 border border-blue-700/50 text-blue-300 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-800/50 transition-colors">
                        {uploadingCategory === 'SCRIPT_DOCUMENT' ? 'Replacing…' : 'Replace File'}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'SCRIPT_DOCUMENT');
                          }}
                        />
                      </label>
                    </div>
                    {selectedScript.files?.filter((f: any) => f.attachmentCategory === 'SCRIPT_DOCUMENT' || f.fileName.endsWith('.pdf') || f.fileName.endsWith('.docx')).length > 0 ? (
                      selectedScript.files?.filter((f: any) => f.attachmentCategory === 'SCRIPT_DOCUMENT' || f.fileName.endsWith('.pdf') || f.fileName.endsWith('.docx')).map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between gap-1 bg-gray-950 p-1.5 rounded border border-gray-800">
                          <span className="text-gray-200 font-mono text-[10px] truncate">{f.fileName}</span>
                          <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded font-bold border border-emerald-800 shrink-0">ACTIVE</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">No script document attached</span>
                    )}
                  </div>

                  {/* Category 2: Reference Images */}
                  <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-purple-300">🖼️ 2. Reference Images</span>
                      <label className="text-[10px] bg-purple-900/40 border border-purple-700/50 text-purple-300 px-2 py-0.5 rounded cursor-pointer hover:bg-purple-800/50 transition-colors">
                        {uploadingCategory === 'REFERENCE_IMAGE' ? 'Replacing…' : 'Replace File'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'REFERENCE_IMAGE');
                          }}
                        />
                      </label>
                    </div>
                    {selectedScript.files?.filter((f: any) => f.attachmentCategory === 'REFERENCE_IMAGE' || f.fileType?.startsWith('image/')).length > 0 ? (
                      selectedScript.files?.filter((f: any) => f.attachmentCategory === 'REFERENCE_IMAGE' || f.fileType?.startsWith('image/')).map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between gap-1 bg-gray-950 p-1.5 rounded border border-gray-800">
                          <span className="text-gray-200 font-mono text-[10px] truncate">{f.fileName}</span>
                          <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded font-bold border border-emerald-800 shrink-0">ACTIVE</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">No reference images attached</span>
                    )}
                  </div>

                  {/* Category 3: Reference Videos */}
                  <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-300">🎬 3. Reference Videos</span>
                      <label className="text-[10px] bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 px-2 py-0.5 rounded cursor-pointer hover:bg-emerald-800/50 transition-colors">
                        {uploadingCategory === 'REFERENCE_VIDEO' ? 'Replacing…' : 'Replace File'}
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'REFERENCE_VIDEO');
                          }}
                        />
                      </label>
                    </div>
                    {selectedScript.files?.filter((f: any) => f.attachmentCategory === 'REFERENCE_VIDEO' || f.fileType?.startsWith('video/')).length > 0 ? (
                      selectedScript.files?.filter((f: any) => f.attachmentCategory === 'REFERENCE_VIDEO' || f.fileType?.startsWith('video/')).map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between gap-1 bg-gray-950 p-1.5 rounded border border-gray-800">
                          <span className="text-gray-200 font-mono text-[10px] truncate">{f.fileName}</span>
                          <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded font-bold border border-emerald-800 shrink-0">ACTIVE</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">No reference videos attached</span>
                    )}
                  </div>

                  {/* Category 4: Audio References */}
                  <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-cyan-300">🎵 4. Audio References</span>
                      <label className="text-[10px] bg-cyan-900/40 border border-cyan-700/50 text-cyan-300 px-2 py-0.5 rounded cursor-pointer hover:bg-cyan-800/50 transition-colors">
                        {uploadingCategory === 'AUDIO_REFERENCE' ? 'Replacing…' : 'Replace File'}
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'AUDIO_REFERENCE');
                          }}
                        />
                      </label>
                    </div>
                    {selectedScript.files?.filter((f: any) => f.attachmentCategory === 'AUDIO_REFERENCE' || f.fileType?.startsWith('audio/')).length > 0 ? (
                      selectedScript.files?.filter((f: any) => f.attachmentCategory === 'AUDIO_REFERENCE' || f.fileType?.startsWith('audio/')).map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between gap-1 bg-gray-950 p-1.5 rounded border border-gray-800">
                          <span className="text-gray-200 font-mono text-[10px] truncate">{f.fileName}</span>
                          <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded font-bold border border-emerald-800 shrink-0">ACTIVE</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">No audio references attached</span>
                    )}
                  </div>

                  {/* Category 5: Brand Guidelines */}
                  <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-300">🎨 5. Brand Guidelines</span>
                      <label className="text-[10px] bg-amber-900/40 border border-amber-700/50 text-amber-300 px-2 py-0.5 rounded cursor-pointer hover:bg-amber-800/50 transition-colors">
                        {uploadingCategory === 'BRAND_GUIDELINES' ? 'Replacing…' : 'Replace File'}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'BRAND_GUIDELINES');
                          }}
                        />
                      </label>
                    </div>
                    {selectedScript.files?.filter((f: any) => f.attachmentCategory === 'BRAND_GUIDELINES').length > 0 ? (
                      selectedScript.files?.filter((f: any) => f.attachmentCategory === 'BRAND_GUIDELINES').map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between gap-1 bg-gray-950 p-1.5 rounded border border-gray-800">
                          <span className="text-gray-200 font-mono text-[10px] truncate">{f.fileName}</span>
                          <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded font-bold border border-emerald-800 shrink-0">ACTIVE</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">No brand guidelines attached</span>
                    )}
                  </div>

                  {/* Category 6: Product Information */}
                  <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-300">📦 6. Product Information</span>
                      <label className="text-[10px] bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 px-2 py-0.5 rounded cursor-pointer hover:bg-indigo-800/50 transition-colors">
                        {uploadingCategory === 'PRODUCT_INFORMATION' ? 'Replacing…' : 'Replace File'}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'PRODUCT_INFORMATION');
                          }}
                        />
                      </label>
                    </div>
                    {selectedScript.files?.filter((f: any) => f.attachmentCategory === 'PRODUCT_INFORMATION').length > 0 ? (
                      selectedScript.files?.filter((f: any) => f.attachmentCategory === 'PRODUCT_INFORMATION').map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between gap-1 bg-gray-950 p-1.5 rounded border border-gray-800">
                          <span className="text-gray-200 font-mono text-[10px] truncate">{f.fileName}</span>
                          <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded font-bold border border-emerald-800 shrink-0">ACTIVE</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">No product info attached</span>
                    )}
                  </div>
                </div>

                {/* Category 7: Supporting Documents */}
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-300">📁 7. Supporting Documents</span>
                    <label className="text-[10px] bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-700 transition-colors">
                      {uploadingCategory === 'SUPPORTING_DOCUMENT' ? 'Replacing…' : 'Replace File'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'SUPPORTING_DOCUMENT');
                        }}
                      />
                    </label>
                  </div>
                  {selectedScript.files?.filter((f: any) => f.attachmentCategory === 'SUPPORTING_DOCUMENT').length > 0 ? (
                    selectedScript.files?.filter((f: any) => f.attachmentCategory === 'SUPPORTING_DOCUMENT').map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between gap-1 bg-gray-950 p-1.5 rounded border border-gray-800">
                        <span className="text-gray-200 font-mono text-[10px] truncate">{f.fileName}</span>
                        <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded font-bold border border-emerald-800 shrink-0">ACTIVE</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-500 italic text-[10px]">No supporting documents attached</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedScript(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveScript}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md shadow-blue-600/30"
              >
                {saving ? 'Saving Changes...' : 'Save Script Details'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Script Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateScript}
            className="bg-gray-900 border border-border p-6 rounded-2xl max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> Create New Production Script
                </h2>
                <p className="text-[11px] text-gray-400">Define script parameters and operational requirements</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 3. Shoot Project */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Target Shoot Project *</label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                  required
                >
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.projectId}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Script Name / Code */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Script Name / Custom Code</label>
                <input
                  type="text"
                  placeholder="Leave blank for BrandCode-Date-ProductCode-Seq"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                />
              </div>

              {/* 8. Language */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Target Language *</label>
                <select
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                >
                  <option value="Malayalam (KL)">Malayalam (KL)</option>
                  <option value="English (EN)">English (EN)</option>
                  <option value="Hindi (HI)">Hindi (HI)</option>
                  <option value="Tamil (TN)">Tamil (TN)</option>
                  <option value="Kannada (KA)">Kannada (KA)</option>
                  <option value="Telugu (TE)">Telugu (TE)</option>
                  <option value="Arabic (AR)">Arabic (AR)</option>
                </select>
              </div>

              {/* 9. Script Category / Purpose */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Script Purpose / Category *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                >
                  <option value="Advertisement">Advertisement</option>
                  <option value="Awareness">Awareness</option>
                  <option value="Educational">Educational</option>
                  <option value="Promotional">Promotional</option>
                  <option value="Testimonial">Testimonial</option>
                  <option value="Product Demo">Product Demo</option>
                  <option value="Festival Campaign">Festival Campaign</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Branding">Branding</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* 10. Script Objective */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Strategic Objective *</label>
                <select
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                >
                  <option value="Generate Sales">Generate Sales</option>
                  <option value="Increase Awareness">Increase Awareness</option>
                  <option value="Launch Product">Launch Product</option>
                  <option value="Customer Education">Customer Education</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Retargeting">Retargeting</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* 11. Estimated Duration */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Estimated Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 30s, 60s"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                />
              </div>

              {/* 14. Priority */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              {/* 15. Initial Status */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Initial Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="READY">Ready</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PRODUCTION">In Production</option>
                  <option value="WAITING_FOR_TECHNICAL_REVIEW">Waiting for Technical Review</option>
                  <option value="WAITING_FOR_MEDIA_REVIEW">Waiting for Media Review</option>
                  <option value="WAITING_FOR_CLIENT_CONFIRMATION">Waiting for Client Confirmation</option>
                  <option value="CLIENT_REVISION_REQUESTED">Client Revision Requested</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CLOSED">Closed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {/* 12. Script Description & Storyline Session */}
            <div className="bg-gray-950/80 border border-purple-900/60 p-4 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2">
                <label className="text-gray-200 font-bold text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Script Description &amp; Full Storyline (Scenes, Narration &amp; VO)</span>
                </label>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const template = `\n\n[Scene ${newDescription.split('[Scene').length} - New Scene]\nVisual: \nVoiceover (VO): `;
                      setNewDescription((prev) => prev + template);
                    }}
                    className="px-2 py-0.5 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 rounded font-semibold transition-colors"
                  >
                    + Add Scene Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStorylinePreview(!showStorylinePreview)}
                    className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3 h-3 text-purple-400" />
                    {showStorylinePreview ? 'Edit Input' : 'Live Preview'}
                  </button>
                </div>
              </div>

              {!showStorylinePreview ? (
                <textarea
                  rows={5}
                  placeholder={`Enter full scene narration, voiceover dialogues, shots...\n\nExample:\n[Scene 1 - Studio Intro]\nVisual: Smooth pan over hero product\nVoiceover (VO): Experience the next generation of performance...\n\n[Scene 2 - Feature Callout]\nVisual: Macro shot of premium finish`}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl text-xs font-mono focus:outline-none focus:border-purple-500"
                />
              ) : (
                <div className="bg-gray-900 border border-purple-800/60 p-3 rounded-xl max-h-52 overflow-y-auto custom-scrollbar">
                  {newDescription?.trim() ? (
                    <div className="whitespace-pre-wrap font-sans text-gray-200 text-xs leading-relaxed">
                      {newDescription}
                    </div>
                  ) : (
                    <span className="text-gray-500 italic text-xs">No storyline content written yet. Switch to Edit Input to add text.</span>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                <span>Format: Scene headers, Visual cues, Narration &amp; Dialogues</span>
                <span>{newDescription ? newDescription.split('\n').filter(Boolean).length : 0} lines • {newDescription.length} characters</span>
              </div>
            </div>

            {/* 16. Remarks */}
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Remarks</label>
              <input
                type="text"
                placeholder="Operational notes, props needed, location hints..."
                value={newRemarks}
                onChange={(e) => setNewRemarks(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-md shadow-purple-600/30"
              >
                {saving ? 'Creating Script...' : 'Create Script'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
