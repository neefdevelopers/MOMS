'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { FileText, UserPlus, X, MessageSquare, Send, Search, Filter, RotateCcw, SlidersHorizontal, Building2, Users, Layers, Check, Copy, Eye, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { SortSelector } from '@/components/common/TableSortHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { recordRecentAccess } from '@/lib/recent-access';
import { usePagination } from '@/lib/usePagination';
import { sortData, SortField, SortOrder } from '@/utils/sortUtils';
import RevisionsTab from '@/components/revisions/RevisionsTab';
import RequestRevisionModal from '@/components/revisions/RequestRevisionModal';

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

  // Dedicated Storyline Popup States
  const [showDescriptionPopup, setShowDescriptionPopup] = useState(false);
  const [viewingScriptDescription, setViewingScriptDescription] = useState<any | null>(null);
  const [revisionModalScript, setRevisionModalScript] = useState<any | null>(null);

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
  const [showFullDetails, setShowFullDetails] = useState(false);

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
  const [selectedUploadCategory, setSelectedUploadCategory] = useState('SCRIPT_DOCUMENT');

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

  const searchParams = useSearchParams();
  const inspectIdParam = searchParams ? (searchParams.get('inspect') || searchParams.get('id') || searchParams.get('scriptId')) : null;

  useEffect(() => {
    loadReferenceData();
    loadScripts();
  }, []);

  useEffect(() => {
    if (inspectIdParam) {
      const match = scripts.find((s: any) =>
        s.id === inspectIdParam ||
        s.scriptId === inspectIdParam ||
        s.id?.toLowerCase() === inspectIdParam.toLowerCase() ||
        s.scriptId?.toLowerCase() === inspectIdParam.toLowerCase()
      );
      if (match) {
        setSelectedScript(match);
      } else {
        fetchApi(`/scripts/${inspectIdParam}`)
          .then((fetched: any) => {
            const item = fetched?.data || fetched;
            if (item && item.id) setSelectedScript(item);
          })
          .catch(() => null);
      }

      // Smooth scroll to record element on page
      setTimeout(() => {
        const el = document.getElementById(inspectIdParam) || document.getElementById(`script-${inspectIdParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-blue-500', 'shadow-2xl');
          setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500', 'shadow-2xl'), 3500);
        }
      }, 400);
    }
  }, [inspectIdParam, scripts]);



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

  const handleSubmitTechnicalReview = async (scriptId: string) => {
    try {
      setSaving(true);
      const res = await fetchApi(`/scripts/${scriptId}/submit-technical`, { method: 'POST' });
      const updated = await fetchApi(`/scripts/${scriptId}`).catch(() => res);
      setSelectedScript(updated || res);
      alert('✓ Script submitted for Technical Manager Review!');
      await loadScripts();
    } catch (err: any) {
      alert(err.message || 'Failed to submit script for technical review');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewTechnical = async (scriptId: string, action: 'APPROVE' | 'REJECT', comment?: string) => {
    try {
      setSaving(true);
      await fetchApi(`/scripts/${scriptId}/review-technical`, {
        method: 'POST',
        body: JSON.stringify({ action, comment: comment || (action === 'REJECT' ? 'Technical Manager requested revisions' : undefined) }),
      });
      // Always re-fetch the full script with all relations after review action
      const refreshed = await fetchApi(`/scripts/${scriptId}`);
      const latestScript = refreshed?.data || refreshed;
      if (latestScript?.id) {
        setSelectedScript(latestScript);
        setScripts((prev) => prev.map((s) => (s.id === latestScript.id ? latestScript : s)));
      }
      await loadScripts();
    } catch (err: any) {
      alert(err.message || 'Technical review action failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewMedia = async (scriptId: string, action: 'APPROVE' | 'REJECT', comment?: string) => {
    try {
      setSaving(true);
      await fetchApi(`/scripts/${scriptId}/review-media`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      });
      // Always re-fetch the full script with all relations after review action
      const refreshed = await fetchApi(`/scripts/${scriptId}`);
      const latestScript = refreshed?.data || refreshed;
      if (latestScript?.id) {
        setSelectedScript(latestScript);
        setScripts((prev) => prev.map((s) => (s.id === latestScript.id ? latestScript : s)));
      }
      await loadScripts();
    } catch (err: any) {
      alert(err.message || 'Media Manager review action failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveScriptAction = async (scriptId: string, action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT', comment?: string) => {
    try {
      setSaving(true);
      const res = await fetchApi(`/scripts/${scriptId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      });
      const updated = await fetchApi(`/scripts/${scriptId}`).catch(() => res);
      setSelectedScript(updated || res);
      await loadScripts();
    } catch (err: any) {
      alert(err.message || 'Script approval action failed');
    } finally {
      setSaving(false);
    }
  };

  const handleResubmitScriptAction = async (scriptId: string) => {
    try {
      setSaving(true);
      const res = await fetchApi(`/scripts/${scriptId}/resubmit`, {
        method: 'POST',
      });
      const updated = await fetchApi(`/scripts/${scriptId}`).catch(() => res);
      setSelectedScript(updated || res);
      await loadScripts();
    } catch (err: any) {
      alert(err.message || 'Failed to resubmit script');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (selectedScript) {
      setEditDescription(selectedScript.description || '');
      setEditDuration(selectedScript.estimatedDuration || '30s');
      setEditRemarks(selectedScript.remarks || '');
      setEditStatus(selectedScript.status || 'DRAFT');
      setEditPriority(selectedScript.priority || 'MEDIUM');
      setProdComp(!!selectedScript.productionCompleted);
      setTechAppr(!!selectedScript.technicalReviewApproved);
      setMediaAppr(!!selectedScript.mediaManagerReviewApproved);
      setClientConf(!!selectedScript.clientConfirmationRecorded);
    }
  }, [selectedScript?.id, selectedScript?.status, selectedScript?.updatedAt]);

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
  };

  const handleSaveScript = async () => {
    if (!selectedScript) return;
    setSaving(true);
    try {
      const updated = await fetchApi(`/scripts/${selectedScript.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          description: editDescription,
          estimatedDuration: editDuration,
          remarks: editRemarks,
          status: editStatus || selectedScript.status,
          priority: editPriority,
          productionCompleted: prodComp,
          technicalReviewApproved: techAppr,
          mediaManagerReviewApproved: mediaAppr,
          clientConfirmationRecorded: clientConf,
        }),
      });
      setSelectedScript(updated);
      alert('✓ Script details saved successfully!');
      loadScripts();
    } catch (err: any) {
      alert(err.message || 'Failed to update script details');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatusToInProgress = async () => {
    if (!selectedScript) return;
    setSaving(true);
    try {
      const updated = await fetchApi(`/scripts/${selectedScript.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          preTechnicalReviewStatus: 'IN_PROGRESS',
        }),
      });
      setSelectedScript(updated);
      setEditStatus('IN_PROGRESS');
      alert('✓ Script status updated to IN PROGRESS!');
      loadScripts();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
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
    if (filterStatus === 'PENDING_MARKETING_APPROVAL' || filterStatus === 'PENDING' || filterStatus === 'WAITING_FOR_MARKETING_APPROVAL') {
      if (!['PENDING_MARKETING_APPROVAL', 'WAITING_FOR_MARKETING_APPROVAL', 'DRAFT', 'PENDING_APPROVAL', 'CHANGES_REQUESTED'].includes(s.status)) return false;
    } else if (filterStatus === 'WAITING_FOR_TECHNICAL_REVIEW') {
      if (s.status !== 'WAITING_FOR_TECHNICAL_REVIEW') return false;
    } else if (filterStatus === 'WAITING_FOR_MEDIA_REVIEW') {
      if (s.status !== 'WAITING_FOR_MEDIA_REVIEW') return false;
    } else if (filterStatus === 'APPROVED') {
      if (!['APPROVED', 'COMPLETED'].includes(s.status)) return false;
    } else if (filterStatus !== 'ALL' && s.status !== filterStatus) {
      return false;
    }
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

        {(user?.role === 'SOCIAL_MEDIA_MANAGER' || user?.role === 'MEDIA_MANAGER' || user?.role === 'MARKETING_MANAGER' || (user?.role as string) === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
          >
            + Create New Script
          </button>
        )}
      </div>

      {/* Technical Manager Script Review Session */}
      {(user?.role === 'TECHNICAL_MANAGER' || (user?.role as string) === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 font-bold text-lg">
              ⚡
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-200">Technical Manager Script Review Session</h4>
              <p className="text-xs text-blue-300/80">
                Review submitted scripts and revised rounds, inspect storyline &amp; technical specs, and approve or reject for technical compliance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'WAITING_FOR_TECHNICAL_REVIEW' ? 'ALL' : 'WAITING_FOR_TECHNICAL_REVIEW')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
              filterStatus === 'WAITING_FOR_TECHNICAL_REVIEW'
                ? 'bg-blue-600 text-white shadow-blue-600/30'
                : 'bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700'
            }`}
          >
            <span>⚡ Pending Technical Manager Review</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-950 text-blue-300 border border-blue-500/40 font-mono font-bold">
              {scripts.filter((s) => s.status === 'WAITING_FOR_TECHNICAL_REVIEW').length}
            </span>
          </button>
        </div>
      )}

      {/* Media Manager Script Session */}
      {(user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') && (
        <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 font-bold text-lg">
              🎬
            </div>
            <div>
              <h4 className="text-sm font-bold text-cyan-200">Media Manager Script Session</h4>
              <p className="text-xs text-cyan-300/80">
                Review technical-approved scripts, inspect storyline &amp; deliverables, and approve for client confirmation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'WAITING_FOR_MEDIA_REVIEW' ? 'ALL' : 'WAITING_FOR_MEDIA_REVIEW')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
              filterStatus === 'WAITING_FOR_MEDIA_REVIEW'
                ? 'bg-cyan-600 text-white shadow-cyan-600/30'
                : 'bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700'
            }`}
          >
            <span>📋 Pending Media Manager Approval</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
              {scripts.filter((s) => s.status === 'WAITING_FOR_MEDIA_REVIEW').length}
            </span>
          </button>
        </div>
      )}

      {/* Marketing Manager Script Session */}
      {(user?.role === 'MARKETING_MANAGER' || (user?.role as string) === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') && (
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 font-bold text-lg">
              📜
            </div>
            <div>
              <h4 className="text-sm font-bold text-purple-200">Marketing Manager Script Approval Session</h4>
              <p className="text-xs text-purple-300/80">
                Review submitted script storylines, approve production scripts for scheduling, or request revisions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'PENDING_MARKETING_APPROVAL' || filterStatus === 'WAITING_FOR_MARKETING_APPROVAL' ? 'ALL' : 'PENDING_MARKETING_APPROVAL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
              filterStatus === 'PENDING_MARKETING_APPROVAL' || filterStatus === 'WAITING_FOR_MARKETING_APPROVAL'
                ? 'bg-purple-600 text-white shadow-purple-600/30'
                : 'bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700'
            }`}
          >
            <span>📋 Pending Marketing Manager Approval</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-950 text-purple-300 border border-purple-500/40 font-mono font-bold">
              {scripts.filter((s) => ['PENDING_MARKETING_APPROVAL', 'WAITING_FOR_MARKETING_APPROVAL', 'DRAFT', 'PENDING_APPROVAL', 'CHANGES_REQUESTED'].includes(s.status)).length}
            </span>
          </button>
        </div>
      )}

      {/* Quick Approval Status Filtration Bar (All / Technical Review / Media Review / Marketing Approval / Approved) */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <button
          onClick={() => setFilterStatus('ALL')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
            filterStatus === 'ALL'
              ? 'bg-blue-600 text-white shadow-blue-600/30'
              : 'bg-card border border-border text-gray-400 hover:text-white'
          }`}
        >
          <span>All Scripts</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-950 text-blue-300 border border-blue-500/40 font-mono font-bold">
            {scripts.length}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === 'WAITING_FOR_TECHNICAL_REVIEW' ? 'ALL' : 'WAITING_FOR_TECHNICAL_REVIEW')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
            filterStatus === 'WAITING_FOR_TECHNICAL_REVIEW'
              ? 'bg-blue-600 text-white shadow-blue-600/30 font-extrabold'
              : 'bg-card border border-border text-gray-400 hover:text-white'
          }`}
        >
          <span>⚡ Waiting Technical Review</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-950 text-blue-300 border border-blue-500/40 font-mono font-bold">
            {scripts.filter((s) => s.status === 'WAITING_FOR_TECHNICAL_REVIEW').length}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === 'WAITING_FOR_MEDIA_REVIEW' ? 'ALL' : 'WAITING_FOR_MEDIA_REVIEW')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
            filterStatus === 'WAITING_FOR_MEDIA_REVIEW'
              ? 'bg-cyan-600 text-white shadow-cyan-600/30 font-extrabold'
              : 'bg-card border border-border text-gray-400 hover:text-white'
          }`}
        >
          <span>🎬 Waiting Media Review</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
            {scripts.filter((s) => s.status === 'WAITING_FOR_MEDIA_REVIEW').length}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === 'PENDING_MARKETING_APPROVAL' || filterStatus === 'WAITING_FOR_MARKETING_APPROVAL' ? 'ALL' : 'PENDING_MARKETING_APPROVAL')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
            filterStatus === 'PENDING_MARKETING_APPROVAL' || filterStatus === 'PENDING' || filterStatus === 'WAITING_FOR_MARKETING_APPROVAL'
              ? 'bg-purple-600 text-white shadow-purple-600/30 font-extrabold'
              : 'bg-card border border-border text-gray-400 hover:text-white'
          }`}
        >
          <span>📜 Pending Marketing Approval</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-950 text-purple-300 border border-purple-500/40 font-mono font-bold">
            {scripts.filter((s) => ['PENDING_MARKETING_APPROVAL', 'WAITING_FOR_MARKETING_APPROVAL', 'DRAFT', 'PENDING_APPROVAL', 'CHANGES_REQUESTED'].includes(s.status)).length}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === 'APPROVED' ? 'ALL' : 'APPROVED')}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
            filterStatus === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-emerald-600/30 font-extrabold'
              : 'bg-card border border-border text-gray-400 hover:text-white'
          }`}
        >
          <span>✓ Approved Scripts</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
            {scripts.filter((s) => ['APPROVED', 'COMPLETED'].includes(s.status)).length}
          </span>
        </button>
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
                    <option value="IN_PROGRESS">In Progress</option>
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
                id={s.id}
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
                    <div><span className="text-gray-500">Campaign:</span> <strong className="text-indigo-300">{s.campaign?.name || 'N/A (Optional)'}</strong></div>
                    <div><span className="text-gray-500">Est. Duration:</span> <strong className="text-cyan-300">{s.estimatedDuration || 'N/A'}</strong></div>
                    <div><span className="text-gray-500">Created By:</span> <strong className="text-indigo-300">{s.createdBy?.name || (s.createdById ? 'Staff Member' : 'Social Media Manager')}</strong></div>
                    <div><span className="text-gray-500">Category:</span> {s.category || 'Social Media'}</div>
                    <div><span className="text-gray-500">Assigned Staff:</span> <strong className="text-amber-300">{assignedStaffNames.length > 0 ? assignedStaffNames.join(', ') : 'Not Assigned'}</strong></div>
                    <div><span className="text-gray-500">Approval Status:</span> <strong className={`${s.status === 'APPROVED' ? 'text-green-400' : s.status === 'PENDING_MARKETING_APPROVAL' ? 'text-amber-400' : s.status === 'CHANGES_REQUESTED' ? 'text-orange-400' : 'text-blue-400'}`}>{s.status === 'PENDING_MARKETING_APPROVAL' ? 'Pending Marketing Manager Approval' : s.status}</strong></div>
                  </div>

                  {s.objective && (
                    <div className="text-[11px] text-gray-300">
                      <span className="text-gray-500 font-semibold">Objective:</span> {s.objective}
                    </div>
                  )}

                  {s.description && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingScriptDescription(s);
                      }}
                      className="text-[11px] text-purple-300/90 bg-purple-950/40 border border-purple-800/50 p-2.5 rounded-lg cursor-pointer hover:border-purple-500 transition-all group space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Script Storyline &amp; Scenes</span>
                        </span>
                        <span className="group-hover:underline text-purple-300">Read Full Popup ↗</span>
                      </div>
                      <p className="line-clamp-2 text-gray-300 font-sans leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  )}

                  {s.remarks && (
                    <div className="text-[10px] text-amber-300 bg-amber-950/20 border border-amber-800/40 p-2 rounded">
                      <strong className="text-amber-400">Remark:</strong> "{s.remarks}"
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400 gap-2 flex-wrap">
                  <span>Created by: <strong className="text-gray-200">{s.createdBy?.name || 'Writer'}</strong></span>

                  {s.status === 'WAITING_FOR_TECHNICAL_REVIEW' && (user?.role === 'TECHNICAL_MANAGER' || (user?.role as string) === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleReviewTechnical(s.id, 'APPROVE')}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded text-[10px] flex items-center gap-1 shadow-sm transition-colors"
                      >
                        ⚡ Approve Tech Review
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const comment = prompt('Enter rejection reason for technical revision:');
                          if (comment && comment.trim()) {
                            handleReviewTechnical(s.id, 'REJECT', comment.trim());
                          }
                        }}
                        className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-bold rounded text-[10px] flex items-center gap-1"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  ) : s.status === 'WAITING_FOR_MEDIA_REVIEW' && (user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleReviewMedia(s.id, 'APPROVE')}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded text-[10px] flex items-center gap-1 shadow-sm transition-colors"
                      >
                        🎬 Approve Media Review
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const comment = prompt('Enter rejection reason for media review:');
                          if (comment && comment.trim()) {
                            handleReviewMedia(s.id, 'REJECT', comment.trim());
                          }
                        }}
                        className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-bold rounded text-[10px] flex items-center gap-1"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  ) : (s.status === 'PENDING_MARKETING_APPROVAL' || s.status === 'WAITING_FOR_MARKETING_APPROVAL' || s.status === 'CHANGES_REQUESTED' || s.status === 'DRAFT' || s.status === 'PENDING_APPROVAL') && (user?.role === 'MARKETING_MANAGER' || (user?.role as string) === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleApproveScriptAction(s.id, 'APPROVE')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded text-[10px] flex items-center gap-1 shadow-sm transition-colors"
                      >
                        ✓ Accept / Approve Script
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const comment = prompt('Enter revisions requested:');
                          if (comment) handleApproveScriptAction(s.id, 'REQUEST_CHANGES', comment);
                        }}
                        className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold rounded text-[10px] flex items-center gap-1"
                      >
                        🔄 Revision
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-gray-500">Click to View Details →</span>
                  )}
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
      {selectedScript && (() => {
        // Lock editing only during ACTIVE review states (not COMPLETED)
        const isReviewLocked = ['WAITING_FOR_TECHNICAL_REVIEW', 'WAITING_FOR_MEDIA_REVIEW', 'WAITING_FOR_MARKETING_APPROVAL', 'PENDING_MARKETING_APPROVAL'].includes(selectedScript.status);
        const isStaffUser = user?.role === 'STAFF' || user?.role === 'SOCIAL_MEDIA_MANAGER';
        // isEditingLocked: locks storyline textarea, file uploads, remarks fields during active reviews for staff
        const isEditingLocked = isReviewLocked && isStaffUser;
        // isFieldsLocked: locks Duration / Status / Priority for staff only during active reviews
        // COMPLETED scripts are always editable (managers need to adjust details after completion)
        const isFieldsLocked = isReviewLocked && isStaffUser;
        const isAdminUser = user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN';
        const isScriptCreator = Boolean(user?.id && selectedScript?.createdById && user.id === selectedScript.createdById);
        const isAssignedScriptWriter = Boolean(
          selectedScript?.scriptAssignments?.some((a: any) => a.userId === user?.id || a.user?.id === user?.id) ||
          selectedScript?.assignedUserId === user?.id ||
          user?.role === 'STAFF'
        );
        const canRequestScriptRevision = (isAdminUser || isScriptCreator) && !isAssignedScriptWriter;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-border p-6 rounded-2xl max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                    {selectedScript.scriptId}
                  </span>
                  <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                    🔄 Revisions: {selectedScript.revisionCount || 0}
                  </span>
                  {canRequestScriptRevision && (
                    <button
                      type="button"
                      onClick={() => setRevisionModalScript(selectedScript)}
                      className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[10px] flex items-center gap-1 shadow transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Request Revision
                    </button>
                  )}
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
              {/* Commercial & Script Attributes Summary Card (Important Info First + More Details Toggle) */}
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Script ID</span>
                    <strong className="text-blue-400 font-mono text-xs">{selectedScript.scriptId}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Script Name</span>
                    <strong className="text-white font-mono text-xs block truncate">{selectedScript.name}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Shoot Project</span>
                    <strong className="text-gray-200 text-xs block truncate">{selectedScript.project?.name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Status &amp; Priority</span>
                    <div className="flex items-center gap-1 mt-0.5 font-mono">
                      <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded font-bold text-[10px]">
                        {selectedScript.status}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded font-bold text-[10px]">
                        {selectedScript.priority}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-gray-900 text-xs">
                  <span className="text-gray-400 text-[11px]">
                    👤 Assigned Staff: <strong className="text-amber-300">{selectedScript.scriptAssignments?.map((a: any) => a.user?.name).filter(Boolean).join(', ') || 'Not Assigned'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFullDetails(!showFullDetails)}
                    className="px-3 py-1 bg-gray-900 hover:bg-gray-800 text-purple-300 border border-purple-900/60 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all shadow"
                  >
                    <span>{showFullDetails ? 'Show Less Details ▴' : 'More Details ▾'}</span>
                  </button>
                </div>

                {/* Expanded Full Details Grid */}
                {showFullDetails && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-800 text-[11px] animate-in fade-in duration-150">
                    <div><span className="text-gray-500 block text-[10px]">Client:</span> <strong className="text-gray-200">{selectedScript.client?.name || 'N/A'}</strong></div>
                    <div><span className="text-gray-500 block text-[10px]">Brand:</span> <strong className="text-purple-400">[{selectedScript.brand?.shortCode}] {selectedScript.brand?.name}</strong></div>
                    <div><span className="text-gray-500 block text-[10px]">Product:</span> <strong className="text-emerald-400">{selectedScript.product?.name || 'N/A'}</strong></div>
                    <div><span className="text-gray-500 block text-[10px]">Campaign:</span> <strong className="text-indigo-300">{selectedScript.campaign?.name || 'N/A (Optional)'}</strong></div>
                    <div><span className="text-gray-500 block text-[10px]">Language:</span> <strong className="text-purple-300">{selectedScript.language}</strong></div>
                    <div><span className="text-gray-500 block text-[10px]">Category / Purpose:</span> <strong className="text-amber-300">{selectedScript.category}</strong></div>
                    <div><span className="text-gray-500 block text-[10px]">Objective:</span> <strong className="text-cyan-300">{selectedScript.objective || 'N/A'}</strong></div>
                    <div><span className="text-gray-500 block text-[10px]">Est. Duration:</span> <strong className="text-cyan-300">{selectedScript.estimatedDuration || 'N/A'}</strong></div>
                    <div><span className="text-gray-500 block text-[10px]">Created By:</span> <strong className="text-gray-200">{selectedScript.createdBy?.name || 'Writer'}</strong></div>
                    <div><span className="text-gray-500 block text-[10px]">Created At:</span> <strong className="text-gray-300">{new Date(selectedScript.createdAt).toLocaleDateString()}</strong></div>
                    <div><span className="text-gray-500 block text-[10px]">Remarks:</span> <strong className="text-amber-300">{selectedScript.remarks || 'None'}</strong></div>
                    <div><span className="text-gray-500 block text-[10px]">Total Revisions:</span> <strong className="text-amber-300 font-bold">{selectedScript.revisionCount || 0}</strong></div>
                  </div>
                )}
              </div>

              {/* Active Revision Requested Status Banner */}
              {(selectedScript.status === 'REVISION_REQUESTED' || selectedScript.status === 'CLIENT_REVISION_REQUESTED') && (
                <div className="bg-amber-950/70 border border-amber-500 p-4 rounded-xl space-y-2 text-xs shadow-xl animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-extrabold text-xs flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-amber-400 animate-spin" /> Active Workflow Status: REVISION REQUESTED
                    </span>
                    <span className="px-2.5 py-0.5 bg-amber-600/40 text-amber-200 border border-amber-500/60 rounded font-mono font-bold text-[10px]">
                      Revision #{selectedScript.revisionCount || 1}
                    </span>
                  </div>
                  <p className="text-zinc-200 leading-relaxed">
                    Reviewer requested changes for this script. The assigned script writer is making requested revisions before re-submitting.
                  </p>
                  {canRequestScriptRevision && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setRevisionModalScript(selectedScript)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Request Another Revision
                      </button>
                    </div>
                  )}
                </div>
              )}


              {/* Script Workflow Progress Stepper (Task Style) */}
              <div className="p-4 bg-gray-950 border border-purple-900/60 rounded-xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h4 className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                    🚀 Script Workflow Progress
                  </h4>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-purple-950 text-purple-300 border-purple-800">
                    Current Status: {selectedScript.status || 'IN_PRODUCTION'}
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
                    let currentIdx = 0;
                    if (selectedScript.status === 'COMPLETED' || (prodComp && techAppr && mediaAppr && clientConf)) currentIdx = 5;
                    else if (selectedScript.status === 'WAITING_FOR_CLIENT_CONFIRMATION' || clientConf) currentIdx = 4;
                    else if (selectedScript.status === 'WAITING_FOR_MEDIA_REVIEW' || selectedScript.status === 'APPROVED' || mediaAppr) currentIdx = 3;
                    else if (selectedScript.status === 'WAITING_FOR_TECHNICAL_REVIEW' || techAppr) currentIdx = 2;
                    else if (selectedScript.status === 'IN_PROGRESS') currentIdx = 1;
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
              {isEditingLocked && (
                <div className="p-3.5 bg-amber-950/60 border border-amber-600/80 rounded-xl text-amber-200 text-xs font-semibold flex items-center gap-2.5 shadow-md">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold">
                      {selectedScript.status === 'WAITING_FOR_TECHNICAL_REVIEW'
                        ? '🔒 Script Under Technical Review (Read-Only Mode):'
                        : selectedScript.status === 'WAITING_FOR_MEDIA_REVIEW'
                        ? '🔒 Script Under Media Review (Read-Only Mode):'
                        : '🔒 Script Under Marketing Review (Read-Only Mode):'}
                    </span>
                    <p className="text-[11px] text-amber-300/80 font-normal mt-0.5">
                      {selectedScript.status === 'WAITING_FOR_TECHNICAL_REVIEW'
                        ? 'This script has been submitted for Technical Manager approval. Editing is temporarily disabled until the Technical Manager approves or rejects the script.'
                        : selectedScript.status === 'WAITING_FOR_MEDIA_REVIEW'
                        ? 'This script has been approved by the Technical Manager and submitted for Media Manager approval. Editing is disabled until the Media Manager completes the review or returns the script for revision.'
                        : 'This script has been submitted for Marketing Manager Approval. Editing is disabled until the Marketing Manager completes the review or returns the script for revision.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Script Metrics & Workflow Attributes (Read-Only Synchronized Display) */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Estimated Duration</span>
                    <div className="text-xs font-bold text-cyan-300 font-mono">
                      {selectedScript.estimatedDuration || editDuration || '30s'}
                    </div>
                  </div>
                  <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Current Status</span>
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded font-mono font-bold text-[11px]">
                        {(selectedScript.status || editStatus)?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Priority</span>
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                        (selectedScript.priority || editPriority) === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                        (selectedScript.priority || editPriority) === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        (selectedScript.priority || editPriority) === 'LOW' ? 'bg-zinc-900 text-zinc-300 border border-zinc-700' :
                        'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {selectedScript.priority || editPriority || 'MEDIUM'}
                      </span>
                    </div>
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
                        disabled={isEditingLocked}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Enter scene narration, voiceover dialogues, shots..."
                        className="w-full bg-gray-900 border border-purple-900/60 text-white p-3 rounded-xl text-xs font-mono focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
                        <span>Tip: Use [Scene X] headers and VO: for voiceover dialogues</span>
                        <div className="flex items-center gap-3">
                          <span>{editDescription?.length || 0} characters</span>
                          <button
                            type="button"
                            onClick={handleSaveScript}
                            disabled={saving || isEditingLocked}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            💾 {saving ? 'Saving...' : isEditingLocked ? 'Read Only' : 'Save Storyline'}
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
                    value={editRemarks}
                    disabled={isEditingLocked}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    placeholder="Enter operational remarks..."
                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
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

              {/* Linked Script Attachments Section (Select Category First -> Upload File) */}
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-4 pt-3">
                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-400" /> Linked Script Attachments &amp; Production Files
                  </h4>
                  <span className="text-[10px] text-purple-400 font-mono font-bold">
                    ⚡ Select category type first, then choose file to upload
                  </span>
                </div>

                {/* Upload Control Card (Select Category Type -> Upload File Button) */}
                <div className="p-3.5 bg-gray-900 border border-purple-900/60 rounded-xl space-y-2.5 shadow-md">
                  <span className="text-purple-300 font-bold text-xs block">📤 Upload File Under Attachment Category:</span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      value={selectedUploadCategory}
                      disabled={isEditingLocked}
                      onChange={(e) => setSelectedUploadCategory(e.target.value)}
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

                    <label className={`px-4 py-2 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-all ${isEditingLocked ? 'bg-gray-800 text-gray-400 border border-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'}`}>
                      <span>{isEditingLocked ? '🔒 Upload Locked During Review' : uploadingCategory ? 'Uploading File…' : '+ Choose File & Upload'}</span>
                      <input
                        type="file"
                        disabled={isEditingLocked}
                        className="hidden"
                        onChange={(e) => {
                          if (!isEditingLocked && e.target.files?.[0]) {
                            handleFileUpload(e.target.files[0], selectedUploadCategory);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* All 7 Categories Display Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  {/* Category 1: Script Document */}
                  <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-300">📄 1. Script Document</span>
                      <span className="text-[10px] text-gray-400">
                        ({selectedScript.files?.filter((f: any) => f.attachmentCategory === 'SCRIPT_DOCUMENT' || f.fileName.endsWith('.pdf') || f.fileName.endsWith('.docx')).length || 0})
                      </span>
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
                      <span className="text-[10px] text-gray-400">
                        ({selectedScript.files?.filter((f: any) => f.attachmentCategory === 'REFERENCE_IMAGE' || f.fileType?.startsWith('image/')).length || 0})
                      </span>
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
                      <span className="text-[10px] text-gray-400">
                        ({selectedScript.files?.filter((f: any) => f.attachmentCategory === 'REFERENCE_VIDEO' || f.fileType?.startsWith('video/')).length || 0})
                      </span>
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
                      <span className="text-[10px] text-gray-400">
                        ({selectedScript.files?.filter((f: any) => f.attachmentCategory === 'AUDIO_REFERENCE' || f.fileType?.startsWith('audio/')).length || 0})
                      </span>
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
                      <span className="text-[10px] text-gray-400">
                        ({selectedScript.files?.filter((f: any) => f.attachmentCategory === 'BRAND_GUIDELINES').length || 0})
                      </span>
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
                      <span className="text-[10px] text-gray-400">
                        ({selectedScript.files?.filter((f: any) => f.attachmentCategory === 'PRODUCT_INFORMATION').length || 0})
                      </span>
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
                    <span className="text-[10px] text-gray-400">
                      ({selectedScript.files?.filter((f: any) => f.attachmentCategory === 'SUPPORTING_DOCUMENT').length || 0})
                    </span>
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


              {/* ══════════════════════════════════════════════════════
                   TECHNICAL APPROVAL REQUEST SUBMISSION SESSION
                   Allows staff/writer/creator to submit/resubmit script
                   for Technical Review.
                ══════════════════════════════════════════════════════ */}
              <div className="p-4 bg-purple-950/40 border border-purple-800/70 rounded-xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-purple-900/60 pb-2">
                  <h4 className="font-extrabold text-purple-300 text-xs flex items-center gap-2">
                    <Send className="w-4 h-4 text-purple-400" /> 🚀 Technical Approval Request Submission Session
                  </h4>
                  <span className="text-[10px] bg-purple-950 text-purple-200 border border-purple-700 px-2 py-0.5 rounded font-mono font-bold">
                    Current Status: {selectedScript.status}
                  </span>
                </div>

                {selectedScript.status === 'WAITING_FOR_TECHNICAL_REVIEW' ? (
                  <div className="p-3 bg-blue-950/60 border border-blue-700/80 rounded-lg space-y-2 text-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-blue-300">
                        ⏳ Technical Approval Request Submitted (Round #{selectedScript.technicalReviewRound || 1})
                      </span>
                      <span className="text-[10px] bg-blue-900 text-blue-100 px-2 py-0.5 rounded font-mono font-bold">
                        Under Technical Review
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-200/90 font-normal">
                      This script has been submitted and is currently waiting for Technical Manager evaluation.
                    </p>
                  </div>
                ) : (selectedScript.status === 'WAITING_FOR_MEDIA_REVIEW' || selectedScript.status === 'WAITING_FOR_MARKETING_APPROVAL' || selectedScript.status === 'APPROVED' || selectedScript.status === 'COMPLETED') ? (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg space-y-1 text-emerald-200">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-300">
                      ✅ Technical Approval Completed
                    </span>
                    <p className="text-[11px] text-emerald-300/80 font-normal">
                      This script has passed Level 1 Technical Review and is advancing through the subsequent manager approval stages.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      {selectedScript.technicalReviewRound > 0 || selectedScript.rejectionReason || (selectedScript.revisionCount || 0) > 0
                        ? `This script was returned for corrections. Edit the storyline narration and reference files above, then click below to resubmit for Technical Manager Approval (Round #${(selectedScript.technicalReviewRound || 0) + 1}).`
                        : 'Submit this script storyline narration and attached reference files to initiate Level 1: Technical Manager Review & Approval.'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {selectedScript.status !== 'IN_PROGRESS' && (
                        <button
                          type="button"
                          onClick={handleUpdateStatusToInProgress}
                          disabled={saving}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs"
                        >
                          ▶️ Update Status to IN PROGRESS
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSubmitTechnicalReview(selectedScript.id)}
                        disabled={saving}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-lg shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 text-xs"
                      >
                        {selectedScript.technicalReviewRound > 0 || selectedScript.rejectionReason || (selectedScript.revisionCount || 0) > 0
                          ? `🔄 Submit Revised Script for Technical Approval (Round #${(selectedScript.technicalReviewRound || 0) + 1})`
                          : '🚀 Request Technical Approval'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════════════════════════
                   TECHNICAL REVIEW RESULTS LIST (ACCEPTED & REJECTED WITH REASON)
                   Always visible dedicated section for Technical Review decisions.
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
                  const techReviews = (selectedScript.approvals || []).filter(
                    (a: any) => (a.stage === 'TECHNICAL_REVIEW' || a.approvalType === 'TECHNICAL_REVIEW') && (a.status === 'APPROVED' || a.status === 'REJECTED'),
                  );

                  // Sort: latest round first
                  const sorted = [...techReviews].sort((a: any, b: any) => {
                    if ((b.round || 0) !== (a.round || 0)) return (b.round || 0) - (a.round || 0);
                    return new Date(b.reviewedAt || b.createdAt).getTime() - new Date(a.reviewedAt || a.createdAt).getTime();
                  });

                  // If no approval records exist, check for timeline/rejection reason fallbacks
                  const timelineRejections = (selectedScript.timeline || []).filter((t: any) =>
                    t.event === 'TECHNICAL_REVIEW_REJECTED' || t.event === 'TECHNICAL_REVIEW_APPROVED',
                  );

                  if (sorted.length === 0 && timelineRejections.length === 0 && !selectedScript.rejectionReason) {
                    return (
                      <div className="p-6 text-center bg-gray-900/60 border border-gray-800/80 rounded-xl space-y-1.5">
                        <ShieldCheck className="w-8 h-8 text-gray-600 mx-auto" />
                        <p className="text-xs font-semibold text-gray-300">No Technical Review Decisions Recorded Yet</p>
                        <p className="text-[11px] text-gray-500">
                          This script has not completed any Technical Manager review rounds. Submit for Technical Approval above to start Level 1 review.
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
                          const remarksText = rev.remarks || (isApproved ? 'Technical review requirements verified and approved.' : selectedScript.rejectionReason || 'No detailed reason supplied.');

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
                        /* Fallback from Timeline / Rejection Reason */
                        <div className="p-4 rounded-xl border-2 bg-red-950/25 border-red-600/60 space-y-3">
                          <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                            <span className="px-2.5 py-0.5 text-[10px] font-mono font-extrabold rounded border uppercase bg-red-900/70 border-red-600 text-red-200">
                              ❌ REJECTED WITH REASON
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {selectedScript.rejectedAt ? new Date(selectedScript.rejectedAt).toLocaleString() : 'Latest Round'}
                            </span>
                          </div>
                          <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg space-y-1">
                            <span className="text-[10px] uppercase font-bold text-red-300 block">💬 Rejection Reason:</span>
                            <p className="text-white font-medium text-[11px] whitespace-pre-wrap">
                              {selectedScript.rejectionReason || selectedScript.remarks || 'Script rejected during Technical Review. Revisions required.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ══════════════════════════════════════════════════════
                   MANAGEMENT ACTION SESSIONS (LEVEL 1, 2, 3 DECISION CONTROLS)
                ══════════════════════════════════════════════════════ */}
              <div className="space-y-3">
                {/* Step 2: Technical Manager Review Action */}
                {selectedScript.status === 'WAITING_FOR_TECHNICAL_REVIEW' && (
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
                        This script has been submitted for Technical Manager approval. Inspect technical details, storyline narration, and reference files, then approve or reject with mandatory revision feedback.
                      </p>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const note = prompt('Optional: Enter approval reason / notes for technical compliance:');
                            handleReviewTechnical(selectedScript.id, 'APPROVE', note || 'Technical Review Approved');
                          }}
                          disabled={saving}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg shadow-lg transition-all flex items-center gap-2 text-xs"
                        >
                          <Check className="w-4 h-4" /> Accept &amp; Approve Technical Review
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const comment = prompt('Rejection reason is mandatory. Enter rejection reason for script revision:');
                            if (comment && comment.trim()) {
                              handleReviewTechnical(selectedScript.id, 'REJECT', comment.trim());
                            } else if (comment !== null) {
                              alert('Rejection reason is mandatory.');
                            }
                          }}
                          disabled={saving}
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
                {selectedScript.status === 'WAITING_FOR_MEDIA_REVIEW' && (
                  (user?.role === 'MEDIA_MANAGER' || user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') ? (
                    <div className="p-4 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                          🎬 Level 2: Media Manager Review Session
                        </h4>
                        <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-mono font-bold">
                          Status: WAITING_FOR_MEDIA_REVIEW
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={() => handleReviewMedia(selectedScript.id, 'APPROVE')}
                          disabled={saving}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs"
                        >
                          <Check className="w-4 h-4" /> Approve Script
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const comment = prompt('Rejection reason is mandatory. Enter rejection reason:');
                            if (comment && comment.trim()) {
                              handleReviewMedia(selectedScript.id, 'REJECT', comment.trim());
                            } else if (comment !== null) {
                              alert('Rejection reason is mandatory.');
                            }
                          }}
                          disabled={saving}
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
                {(selectedScript.status === 'WAITING_FOR_MARKETING_APPROVAL' || selectedScript.status === 'PENDING_MARKETING_APPROVAL') && (
                  (user?.role === 'MARKETING_MANAGER' || user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') ? (
                    <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
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
                          onClick={() => handleApproveScriptAction(selectedScript.id, 'APPROVE')}
                          disabled={saving}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs"
                        >
                          <Check className="w-4 h-4" /> Approve Script
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const comment = prompt('Rejection reason is mandatory. Enter rejection reason:');
                            if (comment && comment.trim()) {
                              handleApproveScriptAction(selectedScript.id, 'REJECT', comment.trim());
                            } else if (comment !== null) {
                              alert('Rejection reason is mandatory.');
                            }
                          }}
                          disabled={saving}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 text-xs"
                        >
                          <RotateCcw className="w-4 h-4" /> Reject Script
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

              {/* Revision Cycles & Resubmission Controls */}
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-3">
                <RevisionsTab
                  entityType="SCRIPT"
                  entityId={selectedScript.id}
                  entityTitle={selectedScript.name}
                  originalAssigneeId={selectedScript.assignedUserId || selectedScript.createdById}
                  originalAssigneeName={selectedScript.assignedUser?.name || selectedScript.createdBy?.name}
                  userRole={user?.role}
                  userId={user?.id}
                  currentStatus={selectedScript.status}
                  onRefresh={loadScripts}
                />
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
                disabled={saving || isEditingLocked}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : isEditingLocked ? 'Read Only' : 'Save Changes'}
              </button>
            </div>
            </div>
          </div>
        </div>
        );
      })()}

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
                  <option value="IN_PROGRESS">In Progress</option>
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

            {/* 12. Script Description & Storyline - Clickable Popup Trigger */}
            <div className="bg-gray-950/80 border border-purple-900/60 p-4 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-gray-200 font-bold text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Script Description &amp; Storyline *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowDescriptionPopup(true)}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all"
                >
                  <span>📜 Open Description Popup</span>
                </button>
              </div>

              {/* Clickable Preview Card */}
              <div
                onClick={() => setShowDescriptionPopup(true)}
                className="p-3 bg-gray-900/90 border border-gray-800 hover:border-purple-500/60 rounded-xl cursor-pointer transition-all group"
              >
                {newDescription?.trim() ? (
                  <div className="space-y-1">
                    <p className="text-gray-200 text-xs font-sans line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {newDescription}
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-purple-400 font-mono pt-1.5 border-t border-gray-800">
                      <span>{newDescription.split('\n').filter(Boolean).length} lines • {newDescription.length} characters</span>
                      <span className="text-purple-300 group-hover:underline font-semibold flex items-center gap-1">
                        Click to edit in popup ↗
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center text-gray-500 text-xs italic flex flex-col items-center gap-1">
                    <span>Click here to open popup &amp; write full script storyline, scenes, voiceovers &amp; shot list</span>
                    <span className="px-2.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono not-italic mt-1">
                      + Add Storyline &amp; Scenes Popup
                    </span>
                  </div>
                )}
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
      {/* 1. Script Description & Storyline Editor Popup Modal (Creation Flow) */}
      {showDescriptionPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-150">
          <div className="bg-gray-950 border border-purple-900/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  📜 Script Description &amp; Storyline Editor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDescriptionPopup(false)}
                className="w-8 h-8 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors border border-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shrink-0">
              <span className="text-gray-400 text-[11px]">Write scenes, visual instructions, and voiceover dialogues</span>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    const template = `\n\n[Scene ${newDescription.split('[Scene').length} - New Scene]\nVisual: \nVoiceover (VO): `;
                    setNewDescription((prev) => prev + template);
                  }}
                  className="px-2.5 py-1 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 rounded-lg font-semibold transition-colors"
                >
                  + Add Scene Template
                </button>
                <button
                  type="button"
                  onClick={() => setShowStorylinePreview(!showStorylinePreview)}
                  className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  {showStorylinePreview ? 'Edit Text' : 'Formatted Preview'}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {!showStorylinePreview ? (
                <textarea
                  rows={8}
                  autoFocus
                  placeholder={`Enter full scene narration, voiceover dialogues, shots...\n\nExample:\n[Scene 1 - Studio Intro]\nVisual: Smooth pan over hero product\nVoiceover (VO): Experience the next generation of performance...\n\n[Scene 2 - Feature Callout]\nVisual: Macro shot of premium finish`}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full flex-1 bg-gray-900 border border-purple-900/60 text-white p-4 rounded-xl text-xs font-mono focus:outline-none focus:border-purple-400 leading-relaxed shadow-inner break-words [overflow-wrap:anywhere] resize-none"
                />
              ) : (
                <div className="bg-gray-900 border border-purple-800/60 p-4 rounded-xl flex-1 max-h-[55vh] overflow-y-auto custom-scrollbar break-words [overflow-wrap:anywhere]">
                  {newDescription?.trim() ? (
                    <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-sans text-gray-200 text-xs leading-relaxed">
                      {newDescription}
                    </div>
                  ) : (
                    <span className="text-gray-500 italic text-xs">No storyline text entered yet. Switch to Edit Text to add content.</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-800 shrink-0">
              <span className="text-[10px] text-gray-400 font-mono">
                {newDescription ? newDescription.split('\n').filter(Boolean).length : 0} lines • {newDescription.length} characters
              </span>
              <button
                type="button"
                onClick={() => setShowDescriptionPopup(false)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md text-xs transition-all"
              >
                Done &amp; Save Storyline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Script Description Reader Popup Modal (From Cards / Table View) */}
      {viewingScriptDescription && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-150">
          <div className="bg-gray-950 border border-purple-900/80 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    📜 {viewingScriptDescription.name}
                  </h3>
                  <span className="text-[10px] text-purple-300 font-mono">ID: {viewingScriptDescription.scriptId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingScriptDescription(null)}
                className="w-8 h-8 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors border border-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex-1 max-h-[55vh] overflow-y-auto custom-scrollbar break-words [overflow-wrap:anywhere]">
              {viewingScriptDescription.description?.trim() ? (
                <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-sans text-gray-200 text-xs leading-relaxed tracking-wide">
                  {viewingScriptDescription.description}
                </div>
              ) : (
                <p className="text-gray-500 italic text-xs text-center py-4">No storyline text recorded for this script.</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(viewingScriptDescription.description || '');
                  setCopiedStoryline(true);
                  setTimeout(() => setCopiedStoryline(false), 2000);
                }}
                className="px-3 py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedStoryline ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-purple-400" />}
                <span>{copiedStoryline ? 'Copied to Clipboard!' : 'Copy Script Text'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingScriptDescription(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs transition-all"
              >
                Close Popup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Request Revision Form Modal */}
      {revisionModalScript && (
        <RequestRevisionModal
          isOpen={Boolean(revisionModalScript)}
          onClose={() => setRevisionModalScript(null)}
          onSuccess={() => {
            loadScripts();
            if (selectedScript?.id === revisionModalScript.id) {
              setSelectedScript({ ...selectedScript, status: 'REVISION_REQUESTED' });
            }
          }}
          entityType="SCRIPT"
          entityId={revisionModalScript.id}
          entityTitle={revisionModalScript.name}
          originalAssigneeId={revisionModalScript.assignedUserId || revisionModalScript.createdById}
          originalAssigneeName={revisionModalScript.assignedUser?.name || revisionModalScript.createdBy?.name}
          userRole={user?.role}
        />
      )}
    </div>
  );
}
