'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Palette, Plus, Search, Layers, Calendar, Building2, Tag, CheckSquare, FileText, AlertCircle, ShieldAlert, SlidersHorizontal, RotateCcw, X, Flame, User } from 'lucide-react';
import { SortSelector } from '@/components/common/TableSortHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { usePagination } from '@/lib/usePagination';
import { sortData, SortField, SortOrder } from '@/utils/sortUtils';

const DEFAULT_REQUIREMENT_TYPES = [
  'Poster',
  'Carousel',
  'Thumbnail',
  'Story',
  'Banner',
  'Social Media Post',
  'Advertisement',
  'Packaging Design',
  'Website Creative',
  'Motion Graphic',
  'Other',
];

const GRAPHIC_REQUIREMENT_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'READY', label: 'Ready' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_FOR_TECHNICAL_REVIEW', label: 'Waiting for Technical Review' },
  { value: 'WAITING_FOR_MEDIA_REVIEW', label: 'Waiting for Media Review' },
  { value: 'WAITING_FOR_CLIENT_CONFIRMATION', label: 'Waiting for Client Confirmation' },
  { value: 'CLIENT_REVISION_REQUESTED', label: 'Client Revision Requested' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const GRAPHIC_FILE_CATEGORIES = [
  { key: 'REQUIREMENT_DOCUMENT', label: 'Requirement Document', icon: '📄', desc: 'Briefs & specifications' },
  { key: 'BRAND_GUIDELINES', label: 'Brand Guidelines', icon: '📘', desc: 'Brand manuals & logo usage' },
  { key: 'REFERENCES', label: 'References', icon: '🎨', desc: 'Design inspiration & benchmarking' },
  { key: 'MOOD_BOARD', label: 'Mood Board', icon: '🖼️', desc: 'Visual concepts & collages' },
  { key: 'PRODUCT_IMAGES', label: 'Product Images', icon: '📦', desc: 'High-res packshots & transparent PNGs' },
  { key: 'LOGOS', label: 'Logos', icon: '🏷️', desc: 'Vector SVG/PNG logo assets' },
  { key: 'COLOR_PALETTE', label: 'Color Palette', icon: '🎨', desc: 'Hex codes & color swatches' },
  { key: 'SUPPORTING_FILES', label: 'Supporting Files', icon: '📎', desc: 'Fonts, PSD/AI templates, misc' },
];

const EMPLOYEE_RESPONSIBILITIES = [
  'Graphic Designer',
  'Motion Designer',
  'Illustrator',
  'Thumbnail Designer',
  'Brand Specialist',
  '2D / 3D Artist',
];

const AVAILABLE_DELIVERABLE_FORMATS = [
  { name: 'Poster', icon: '🖼️', ext: 'PNG/PDF' },
  { name: 'Story', icon: '📱', ext: '1080x1920' },
  { name: 'Carousel', icon: '🎠', ext: 'Multi-slide' },
  { name: 'Thumbnail', icon: '🎬', ext: '1280x720' },
  { name: 'Banner', icon: '🚩', ext: 'Landscape/Web' },
  { name: 'Motion Graphic', icon: '🎥', ext: 'MP4/GIF' },
  { name: 'Social Media Post', icon: '📲', ext: '1:1 Square' },
  { name: 'Advertisement', icon: '📣', ext: 'Ad creative' },
  { name: 'Packaging Design', icon: '📦', ext: 'Print ready' },
  { name: 'Website Creative', icon: '🌐', ext: 'Web asset' },
];

const WORKFLOW_PIPELINE = [
  { step: 1, key: 'READY', label: 'Requirement Created', desc: 'Brief created & parent bound' },
  { step: 2, key: 'ASSIGNED', label: 'Task Assigned', desc: 'Designers & roles assigned' },
  { step: 3, key: 'IN_PROGRESS', label: 'Production', desc: 'Active visual design phase' },
  { step: 4, key: 'WAITING_FOR_TECHNICAL_REVIEW', label: 'Technical Review', desc: 'Specs & resolution QC' },
  { step: 5, key: 'WAITING_FOR_MEDIA_REVIEW', label: 'Media Manager Review', desc: 'Media Manager approval' },
  { step: 6, key: 'WAITING_FOR_CLIENT_CONFIRMATION', label: 'Client Confirmation', desc: 'Client review & sign-off' },
  { step: 7, key: 'COMPLETED', label: 'Completed', desc: 'Approved & exported' },
];

const getWorkflowStepIndex = (status: string) => {
  switch (status) {
    case 'DRAFT':
    case 'READY':
      return 1;
    case 'ASSIGNED':
      return 2;
    case 'IN_PROGRESS':
      return 3;
    case 'WAITING_FOR_TECHNICAL_REVIEW':
      return 4;
    case 'WAITING_FOR_MEDIA_REVIEW':
      return 5;
    case 'WAITING_FOR_CLIENT_CONFIRMATION':
    case 'CLIENT_REVISION_REQUESTED':
      return 6;
    case 'COMPLETED':
    case 'CLOSED':
      return 7;
    default:
      return 1;
  }
};

export default function GraphicReqsPage() {
  const { user } = useAuth();
  const [reqs, setReqs] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeResponsibilities, setEmployeeResponsibilities] = useState<Record<string, string[]>>({});
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(['Poster', 'Story']);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);

  // Dynamic Requirement Types (11 Standard Types + Custom Media Manager Additions)
  const [availableTypes, setAvailableTypes] = useState<string[]>(DEFAULT_REQUIREMENT_TYPES);
  const [showAddCustomType, setShowAddCustomType] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');

  // Pagination Hook
  const { currentPage, setCurrentPage, pageSize, setPageSize, paginate } = usePagination();

  // Sorting State
  const [sortBy, setSortBy] = useState<SortField | string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filtration States (Project-Style Filtration)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Inspector & Create Modal States
  const [inspectedReq, setInspectedReq] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create Form State (All 14 Graphic Requirement Attributes)
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqType, setReqType] = useState('Poster');
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [reqStatus, setReqStatus] = useState('DRAFT');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [remarks, setRemarks] = useState('');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);

  const loadReferenceData = async () => {
    try {
      const [dataProjects, dataClients, dataBrands, dataProducts, dataUsers] = await Promise.all([
        fetchApi('/projects').catch(() => []),
        fetchApi('/clients').catch(() => []),
        fetchApi('/brands').catch(() => []),
        fetchApi('/products').catch(() => []),
        fetchApi('/users').catch(() => []),
      ]);
      setProjectsList(Array.isArray(dataProjects) ? dataProjects : []);
      setClientsList(Array.isArray(dataClients) ? dataClients : []);
      setBrandsList(Array.isArray(dataBrands) ? dataBrands : []);
      setProductsList(Array.isArray(dataProducts) ? dataProducts : []);
      setUsersList(Array.isArray(dataUsers) ? dataUsers : []);
    } catch (err) {
      console.error('Failed to load graphic requirements reference metadata:', err);
    }
  };

  const loadGraphicReqs = async () => {
    setLoading(true);
    try {
      const dataReqs = await fetchApi('/graphic-reqs').catch(() => []);
      const loadedReqs = Array.isArray(dataReqs) ? dataReqs : [];
      setReqs(loadedReqs);

      // Merge standard requirement types with any custom types from database records
      const existingTypes = loadedReqs.map((r: any) => r.requirementType).filter(Boolean);
      const mergedTypes = Array.from(new Set([...DEFAULT_REQUIREMENT_TYPES, ...existingTypes]));
      setAvailableTypes(mergedTypes);
    } catch (err) {
      console.error('Failed to load graphic requirements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferenceData();
    loadGraphicReqs();
  }, []);

  const loadData = loadGraphicReqs;

  const handleAddCustomType = () => {
    const trimmed = customTypeName.trim();
    if (!trimmed) return;
    if (!availableTypes.includes(trimmed)) {
      setAvailableTypes([...availableTypes, trimmed]);
    }
    setReqType(trimmed);
    setCustomTypeName('');
    setShowAddCustomType(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedProjectObj = projectsList.find((p) => p.id === selectedProjectId);

  const handleCreateGraphicReq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Every Graphic Requirement must belong to a parent Shoot Project. A Graphic Requirement cannot exist independently.');
      return;
    }

    setCreating(true);
    try {
      await fetchApi('/graphic-reqs', {
        method: 'POST',
        body: JSON.stringify({
          projectId: selectedProjectId,
          name: reqName,
          requirementType: reqType,
          objective,
          description,
          priority,
          status: reqStatus,
          productId: selectedProductId || undefined,
          campaignId: selectedCampaignId || undefined,
          estimatedCompletion: estimatedCompletion || undefined,
          remarks,
          assignedUserIds,
          employeeAssignments: assignedUserIds.map((id) => ({
            userId: id,
            responsibilities: employeeResponsibilities[id] || ['Graphic Designer'],
          })),
        }),
      });

      setShowCreateModal(false);
      setSelectedProjectId('');
      setSelectedProductId('');
      setSelectedCampaignId('');
      setReqName('');
      setReqType('Poster');
      setObjective('');
      setDescription('');
      setPriority('MEDIUM');
      setReqStatus('DRAFT');
      setEstimatedCompletion('');
      setRemarks('');
      setAssignedUserIds([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create Graphic Requirement');
    } finally {
      setCreating(false);
    }
  };

  const [remarkInput, setRemarkInput] = useState('');
  const [addingRemark, setAddingRemark] = useState(false);

  const handleAddRemark = async () => {
    if (!remarkInput.trim() || !inspectedReq) return;

    setAddingRemark(true);
    try {
      await fetchApi(`/graphic-reqs/${inspectedReq.id}/remarks`, {
        method: 'POST',
        body: JSON.stringify({ message: remarkInput.trim() }),
      });
      setRemarkInput('');
      const updatedReq = await fetchApi(`/graphic-reqs/${inspectedReq.id}`);
      setInspectedReq(updatedReq);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to post permanent remark');
    } finally {
      setAddingRemark(false);
    }
  };

  const handleToggleCompletionMilestone = async (field: 'technicalReviewApproved' | 'mediaManagerApproved' | 'clientConfirmed', value: boolean) => {
    if (!inspectedReq) return;
    try {
      const updated = await fetchApi(`/graphic-reqs/${inspectedReq.id}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: value }),
      });
      setInspectedReq(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update sign-off milestone');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await fetchApi(`/graphic-reqs/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
      if (inspectedReq && inspectedReq.id === id) {
        setInspectedReq({ ...inspectedReq, status: newStatus });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update requirement status');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, categoryKey: string) => {
    const file = e.target.files?.[0];
    if (!file || !inspectedReq) return;

    setUploadingCategory(categoryKey);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', inspectedReq.projectId);
      formData.append('graphicRequirementId', inspectedReq.id);
      formData.append('folderCategory', 'Graphic Requirements');
      formData.append('attachmentCategory', categoryKey);

      const token = localStorage.getItem('moms_token');
      const res = await fetch('http://localhost:4000/api/v1/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'File upload failed');
      }

      const updatedReq = await fetchApi(`/graphic-reqs/${inspectedReq.id}`);
      setInspectedReq(updatedReq);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to upload attachment file');
    } finally {
      setUploadingCategory(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-900 text-gray-400 border-gray-700';
      case 'READY':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'ASSIGNED':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-950 text-yellow-300 border-yellow-800';
      case 'WAITING_FOR_TECHNICAL_REVIEW':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'WAITING_FOR_MEDIA_REVIEW':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'WAITING_FOR_CLIENT_CONFIRMATION':
        return 'bg-indigo-950 text-indigo-300 border-indigo-800';
      case 'CLIENT_REVISION_REQUESTED':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'COMPLETED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'CLOSED':
        return 'bg-gray-900 text-gray-400 border-gray-800';
      case 'CANCELLED':
        return 'bg-red-950 text-red-400 border-red-800';
      default:
        return 'bg-gray-900 text-gray-300 border-gray-700';
    }
  };

  const filteredReqs = reqs.filter((g) => {
    const assignedUserNames = (g.tasks || []).flatMap((t: any) =>
      (t.assignedEmployees || []).map((e: any) => e.user?.name || '')
    );
    const assignedUserIds = (g.tasks || []).flatMap((t: any) =>
      (t.assignedEmployees || []).map((e: any) => e.userId || e.user?.id || '')
    );

    const matchesSearch =
      !searchQuery.trim() ||
      g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.requirementId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.brand?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.requirementType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignedUserNames.some((name: string) => name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    const matchesClient = !selectedClient || g.clientId === selectedClient || g.client?.id === selectedClient;
    const matchesBrand = !selectedBrand || g.brandId === selectedBrand || g.brand?.id === selectedBrand;
    const matchesProduct = !selectedProduct || g.productId === selectedProduct || g.product?.id === selectedProduct;
    const matchesProject = !selectedProject || g.projectId === selectedProject || g.project?.id === selectedProject;
    const matchesType = !selectedType || g.requirementType === selectedType;
    const matchesPriority = !selectedPriority || g.priority === selectedPriority;
    const matchesEmployee = !selectedEmployee || assignedUserIds.includes(selectedEmployee);

    const matchesDate = (() => {
      if (!dateFrom && !dateTo) return true;
      const createdAt = g.createdAt ? new Date(g.createdAt) : null;
      const estCompletion = g.estimatedCompletion ? new Date(g.estimatedCompletion) : null;
      const dateToCheck = createdAt;
      if (!dateToCheck) return true;
      if (dateFrom && dateToCheck < new Date(dateFrom)) return false;
      if (dateTo && dateToCheck > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    })();

    return matchesSearch && matchesStatus && matchesClient && matchesBrand && matchesProduct && matchesProject && matchesType && matchesPriority && matchesEmployee && matchesDate;
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-card to-gray-900 border border-border p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-lg">
              <Palette className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">Graphic Requirements</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Every Graphic Requirement belongs to: <strong>Client</strong> • <strong>Brand</strong> • <strong>Project</strong> • <strong>Calendar Event</strong>
              </p>
            </div>
          </div>
        </div>

        {(user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-md shadow-amber-600/30 transition-colors text-xs"
          >
            <Plus className="w-4 h-4" /> Create Graphic Requirement
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-gray-400 uppercase font-bold">Total Graphic Reqs</span>
          <div className="text-2xl font-bold text-white font-mono">{reqs.length}</div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-yellow-400 uppercase font-bold">In Progress</span>
          <div className="text-2xl font-bold text-yellow-400 font-mono">
            {reqs.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'DRAFT').length}
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-cyan-400 uppercase font-bold">Ready / Approved</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {reqs.filter((r) => r.status === 'READY' || r.status === 'APPROVED').length}
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-purple-400 uppercase font-bold">Automated Tasks Generated</span>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {reqs.reduce((acc, r) => acc + (r.tasks?.length || 0), 0)}
          </div>
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
              placeholder="Search graphic requirements by Name, ID, Client, Brand, Product, Type, Employee, Status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-xl pl-9 pr-8 py-2.5 text-white font-medium focus:outline-none transition-all placeholder:text-gray-500"
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
                showAdvancedFilters || (selectedClient || selectedBrand || selectedProduct || selectedProject || selectedEmployee || selectedType || selectedPriority || dateFrom || dateTo || statusFilter !== 'ALL')
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>Advanced Filters</span>
              {([selectedClient, selectedBrand, selectedProduct, selectedProject, selectedEmployee, selectedType, selectedPriority, dateFrom, dateTo, statusFilter !== 'ALL' ? statusFilter : ''].filter(Boolean).length > 0) && (
                <span className="w-4 h-4 rounded-full bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center">
                  {[selectedClient, selectedBrand, selectedProduct, selectedProject, selectedEmployee, selectedType, selectedPriority, dateFrom, dateTo, statusFilter !== 'ALL' ? statusFilter : ''].filter(Boolean).length}
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

            {(searchQuery || statusFilter !== 'ALL' || selectedClient || selectedBrand || selectedProduct || selectedProject || selectedEmployee || selectedType || selectedPriority || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setSelectedClient('');
                  setSelectedBrand('');
                  setSelectedProduct('');
                  setSelectedProject('');
                  setSelectedEmployee('');
                  setSelectedType('');
                  setSelectedPriority('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips / Pills */}
        {(selectedClient || selectedBrand || selectedProduct || selectedProject || selectedEmployee || selectedType || selectedPriority || dateFrom || dateTo || statusFilter !== 'ALL') && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-800">
            <span className="text-gray-500 text-[11px] font-semibold">Active Filters:</span>
            {statusFilter !== 'ALL' && (
              <span className="px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-full flex items-center gap-1 text-[11px]">
                Status: {statusFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setStatusFilter('ALL')} />
              </span>
            )}
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
                Employee: {usersList.find((u) => u.id === selectedEmployee)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedEmployee('')} />
              </span>
            )}
            {selectedType && (
              <span className="px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-full flex items-center gap-1 text-[11px]">
                Type: {selectedType}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedType('')} />
              </span>
            )}
            {selectedPriority && (
              <span className="px-2.5 py-1 bg-red-950 text-red-300 border border-red-800 rounded-full flex items-center gap-1 text-[11px]">
                Priority: {selectedPriority}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedPriority('')} />
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="px-2.5 py-1 bg-teal-950 text-teal-300 border border-teal-800 rounded-full flex items-center gap-1 text-[11px]">
                Date: {dateFrom || '...'} → {dateTo || '...'}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => { setDateFrom(''); setDateTo(''); }} />
              </span>
            )}
          </div>
        )}

        {/* Expandable Grouped Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-gray-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Group 1: Commercial & Product Context */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-purple-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" /> Commercial &amp; Product Context
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedClient}
                    onChange={(e) => {
                      setSelectedClient(e.target.value);
                      setSelectedBrand('');
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
                    onChange={(e) => setSelectedBrand(e.target.value)}
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
                    {productsList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 2: Project & Staff Assignment */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-blue-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" /> Project &amp; Staff Assignment
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
                    <option value="">All Assigned Employees</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>👤 {u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 3: Status, Type & Priority */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-amber-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" /> Status, Type &amp; Priority
                </div>
                <div className="space-y-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="ALL">All Requirement Statuses</option>
                    {GRAPHIC_REQUIREMENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>

                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="">All Asset Types</option>
                    {availableTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

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

            {/* Group 4: Date Range */}
            <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
              <div className="font-bold text-teal-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" /> Date Range (Created)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500 font-medium text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom || undefined}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500 font-medium text-xs"
                  />
                </div>
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-teal-400 border border-teal-800/50 bg-teal-950/40 hover:bg-teal-900/40 transition-colors flex items-center justify-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear Date Range
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 font-semibold">Loading Graphic Requirements...</div>
      ) : filteredReqs.length === 0 ? (
        <div className="p-12 bg-card border border-border rounded-xl text-center space-y-2">
          <Palette className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="text-gray-400 font-medium">No graphic requirements found matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginate(sortData(filteredReqs, sortBy, sortOrder)).map((g) => (
            <div key={g.id} className="bg-card border border-border p-5 rounded-xl space-y-4 shadow-md hover:border-amber-500/40 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <FavoriteButton
                      entityType="GRAPHIC_REQUIREMENT"
                      entityId={g.id}
                      title={g.name}
                      code={g.requirementId}
                      url={`/projects/${g.projectId}?tab=Graphic+Requirements`}
                      metadata={{ project: g.project?.name, client: g.client?.name, brand: g.brand?.name, type: g.requirementType, status: g.status }}
                      size="sm"
                    />
                    <span className="font-mono font-bold text-amber-400 text-xs">{g.requirementId}</span>
                    <span className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-gray-300 rounded font-semibold text-[10px]">
                      {g.requirementType}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm mt-1">{g.name}</h3>
                </div>

                <span className={`px-2.5 py-1 rounded font-bold text-[10px] border ${getStatusBadge(g.status)}`}>
                  {g.status}
                </span>
              </div>

              {g.objective && (
                <p className="text-gray-300 text-xs bg-gray-950 p-2.5 rounded-lg border border-gray-800/60 leading-relaxed">
                  🎯 {g.objective}
                </p>
              )}

              {/* Explicit Parent Bindings & Key Attributes Display */}
              <div className="bg-gray-950 border border-gray-800 p-3 rounded-lg space-y-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-800 pb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-amber-400" /> Parent Bindings &amp; Attributes</span>
                  <span className="text-amber-300 font-mono">{g.priority} Priority</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-500 font-bold block uppercase text-[9px]">Parent Project</span>
                    <span className="text-blue-300 font-bold flex items-center gap-1 truncate">
                      🎬 {g.project?.name || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 font-bold block uppercase text-[9px]">Calendar Event</span>
                    <span className="text-purple-300 font-bold flex items-center gap-1 truncate">
                      📅 {g.calendarEvent?.title || g.project?.calendarEvent?.title || 'Main Shoot Event'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 font-bold block uppercase text-[9px]">Client</span>
                    <span className="text-white font-bold flex items-center gap-1 truncate">
                      🏢 {g.client?.name || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 font-bold block uppercase text-[9px]">Brand</span>
                    <span className="text-amber-300 font-bold flex items-center gap-1 truncate">
                      🏷️ [{g.brand?.shortCode}] {g.brand?.name}
                    </span>
                  </div>

                  {g.product && (
                    <div>
                      <span className="text-gray-500 font-bold block uppercase text-[9px]">Product</span>
                      <span className="text-cyan-300 font-medium truncate block">📦 {g.product.name}</span>
                    </div>
                  )}

                  {g.campaign && (
                    <div>
                      <span className="text-gray-500 font-bold block uppercase text-[9px]">Campaign</span>
                      <span className="text-purple-300 font-medium truncate block">📣 {g.campaign.name}</span>
                    </div>
                  )}

                  {g.estimatedCompletion && (
                    <div className="col-span-2">
                      <span className="text-gray-500 font-bold block uppercase text-[9px]">Estimated Completion</span>
                      <span className="text-gray-200 font-mono text-[10px]">📅 {new Date(g.estimatedCompletion).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-[11px] text-gray-400 font-mono">
                  {g.tasks?.length || 0} Task(s) Associated
                </span>

                <button
                  onClick={() => setInspectedReq(g)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors"
                >
                  👁️ Inspect Details
                </button>
              </div>
            </div>
          ))}
          </div>

          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredReqs.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Create Graphic Requirement Modal */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl w-full max-w-3xl p-6 sm:p-8 space-y-6 text-xs shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                  <Palette className="w-5 h-5 text-amber-400" /> Create Graphic Requirement
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Specify asset guidelines, mandatory parent project bindings, and designer staff assignments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGraphicReq} className="space-y-6">
              {/* Section 1: Parent Project Binding */}
              <div className="bg-gray-950/70 border border-gray-800/90 p-4 sm:p-5 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                  <span className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" /> 1. Parent Shoot Project Binding
                  </span>
                  <span className="text-[10px] text-gray-400 italic">Mandatory 4-Level Binding</span>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1.5 text-xs">Choose Parent Shoot Project *</label>
                  <select
                    required
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white font-medium text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  >
                    <option value="">-- Select Parent Shoot Project --</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.projectId})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProjectObj && (
                  <div className="p-3.5 bg-gray-900/90 border border-amber-500/20 rounded-xl space-y-2 text-xs">
                    <div className="text-gray-400 font-bold uppercase text-[10px] tracking-wider border-b border-gray-800 pb-1 flex items-center gap-1">
                      <span>Auto-Inherited Bindings</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">Client</span>
                        <strong className="text-white font-semibold flex items-center gap-1">🏢 {selectedProjectObj.client?.name || 'Client'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">Brand</span>
                        <strong className="text-amber-300 font-semibold flex items-center gap-1">🏷️ [{selectedProjectObj.brand?.shortCode}] {selectedProjectObj.brand?.name}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">Calendar Event</span>
                        <strong className="text-purple-300 font-semibold flex items-center gap-1">📅 {selectedProjectObj.calendarEvent?.title || 'Main Shoot Event'}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Asset Identity & Specification */}
              <div className="bg-gray-950/70 border border-gray-800/90 p-4 sm:p-5 rounded-xl space-y-4">
                <div className="font-bold text-amber-400 text-xs uppercase tracking-wider border-b border-gray-800/80 pb-2 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" /> 2. Asset Specification &amp; Identity
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1.5 text-[10px] uppercase">Requirement ID</label>
                    <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-amber-400 font-mono font-bold text-xs flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800/60 rounded text-[10px]">Auto</span>
                      GR-SEQUENCE
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1.5 text-xs">Initial Status *</label>
                    <select
                      value={reqStatus}
                      onChange={(e) => setReqStatus(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white font-medium text-xs focus:outline-none focus:border-amber-500"
                    >
                      {GRAPHIC_REQUIREMENT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1.5 text-xs">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white font-medium text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1.5 text-xs">Graphic Requirement Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DW Ojas Launch Reel Thumbnail & Social Feed Banner"
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Requirement Type */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-gray-300 font-semibold text-xs">Requirement Type *</label>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomType(!showAddCustomType)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline"
                      >
                        {showAddCustomType ? 'Cancel' : '+ Custom Type'}
                      </button>
                    </div>

                    {showAddCustomType ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="e.g. 3D Render..."
                          value={customTypeName}
                          onChange={(e) => setCustomTypeName(e.target.value)}
                          className="w-full bg-gray-900 border border-amber-500 rounded-lg p-2 text-white text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomType}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-lg text-xs whitespace-nowrap"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <select
                        value={reqType}
                        onChange={(e) => setReqType(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white font-medium text-xs focus:outline-none focus:border-amber-500"
                      >
                        {availableTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1.5 text-xs">Product (Optional)</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white font-medium text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Choose Product --</option>
                      {productsList.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1.5 text-xs">Campaign (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Festival Mega Sale 2026"
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Produced Deliverables Selection */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1.5 text-xs">
                    Produced Deliverables (One Requirement may produce multiple deliverables) *
                  </label>
                  <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl space-y-2">
                    <span className="text-[10px] text-gray-400 font-medium block">
                      Select all deliverable formats to be generated from this requirement:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_DELIVERABLE_FORMATS.map((del) => {
                        const isDelSelected = selectedDeliverables.includes(del.name);
                        return (
                          <button
                            key={del.name}
                            type="button"
                            onClick={() => {
                              if (isDelSelected) {
                                if (selectedDeliverables.length > 1) {
                                  setSelectedDeliverables(selectedDeliverables.filter((d) => d !== del.name));
                                }
                              } else {
                                setSelectedDeliverables([...selectedDeliverables, del.name]);
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                              isDelSelected
                                ? 'bg-amber-500 text-gray-950 border-amber-400 font-bold shadow-md scale-[1.02]'
                                : 'bg-gray-950 text-gray-400 border-gray-800 hover:border-gray-700'
                            }`}
                          >
                            <span>{del.icon}</span>
                            <span>{del.name}</span>
                            <span className="text-[9px] opacity-75 font-mono">({del.ext})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Staff Assignment & Target Timeline */}
              <div className="bg-gray-950/70 border border-gray-800/90 p-4 sm:p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                  <span className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" /> 3. Staff Assignment &amp; Completion Target
                  </span>
                  <span className="text-[10px] text-gray-400">Designers &amp; Editors</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-gray-300 font-semibold mb-1.5 text-xs">Assign Employees (Designers / Editors)</label>
                    <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl space-y-3 max-h-56 overflow-y-auto custom-scrollbar">
                      {usersList.length === 0 ? (
                        <span className="text-gray-500 text-xs italic">No staff users available.</span>
                      ) : (
                        <div className="space-y-2.5">
                          {usersList.map((u) => {
                            const isSelected = assignedUserIds.includes(u.id);
                            const userResps = employeeResponsibilities[u.id] || ['Graphic Designer'];

                            return (
                              <div
                                key={u.id}
                                className={`p-2.5 rounded-xl border transition-all ${
                                  isSelected
                                    ? 'bg-purple-950/60 border-purple-700/80 text-purple-200'
                                    : 'bg-gray-950/80 border-gray-800 text-gray-400 hover:border-gray-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold select-none">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setAssignedUserIds([...assignedUserIds, u.id]);
                                          if (!employeeResponsibilities[u.id]) {
                                            setEmployeeResponsibilities({
                                              ...employeeResponsibilities,
                                              [u.id]: ['Graphic Designer'],
                                            });
                                          }
                                        } else {
                                          setAssignedUserIds(assignedUserIds.filter((id) => id !== u.id));
                                        }
                                      }}
                                      className="rounded border-gray-700 bg-gray-950 text-purple-600 focus:ring-0 w-4 h-4"
                                    />
                                    <span className="text-white">{u.name}</span>
                                    <span className="text-[10px] text-gray-400 font-mono">({u.role})</span>
                                  </label>

                                  {isSelected && (
                                    <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                                      {userResps.length} Responsibility(ies)
                                    </span>
                                  )}
                                </div>

                                {isSelected && (
                                  <div className="mt-2.5 pt-2 border-t border-purple-900/40 pl-6 space-y-1">
                                    <span className="text-[10px] text-gray-400 font-medium block mb-1">
                                      Assign Responsibilities (One employee may perform multiple):
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {EMPLOYEE_RESPONSIBILITIES.map((resp) => {
                                        const isRespActive = userResps.includes(resp);
                                        return (
                                          <button
                                            key={resp}
                                            type="button"
                                            onClick={() => {
                                              const updated = isRespActive
                                                ? userResps.filter((r) => r !== resp)
                                                : [...userResps, resp];
                                              setEmployeeResponsibilities({
                                                ...employeeResponsibilities,
                                                [u.id]: updated.length > 0 ? updated : ['Graphic Designer'],
                                              });
                                            }}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                              isRespActive
                                                ? 'bg-amber-500 text-gray-950 border-amber-400 shadow-sm'
                                                : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
                                            }`}
                                          >
                                            {isRespActive ? '✓ ' : '+ '}
                                            {resp}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1.5 text-xs">Estimated Completion Target</label>
                    <input
                      type="date"
                      value={estimatedCompletion}
                      onChange={(e) => setEstimatedCompletion(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white font-medium text-xs focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                      Target completion date for Key Visual and Final Export preparation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4: Design Mandate & Notes */}
              <div className="bg-gray-950/70 border border-gray-800/90 p-4 sm:p-5 rounded-xl space-y-4">
                <div className="font-bold text-amber-400 text-xs uppercase tracking-wider border-b border-gray-800/80 pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" /> 4. Objective, Guidelines &amp; Remarks
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1.5 text-xs">Objective</label>
                  <input
                    type="text"
                    placeholder="e.g. Promote 10% discount code with clean green aesthetic"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1.5 text-xs">Description &amp; Design Guidelines</label>
                  <textarea
                    rows={3}
                    placeholder="Specific dimensions, brand color hex codes, text copy, or background composition guidelines..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1.5 text-xs">Remarks</label>
                  <input
                    type="text"
                    placeholder="Additional production notes or designer feedback instructions..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating Requirement...' : '✨ Create Graphic Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Graphic Requirement Inspector Modal (All 14 Mandatory Attributes) */}
      {inspectedReq && (
        <div
          onClick={() => setInspectedReq(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl w-full max-w-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-400 font-bold text-xs">{inspectedReq.requirementId}</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${getStatusBadge(inspectedReq.status)}`}>
                    {inspectedReq.status}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-900 border border-gray-700 text-gray-300 rounded font-semibold text-[10px]">
                    {inspectedReq.requirementType}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{inspectedReq.name}</h3>
              </div>
              <button
                onClick={() => setInspectedReq(null)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* Production Workflow Pipeline Stepper (7 Video Production Stages) */}
            <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  ⚡ Graphic Production Workflow Pipeline (Identical to Video Production)
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  Step {getWorkflowStepIndex(inspectedReq.status)} of 7
                </span>
              </div>

              {/* Stepper Progress Bar */}
              <div className="grid grid-cols-7 gap-1 pt-1">
                {WORKFLOW_PIPELINE.map((wp) => {
                  const currentStep = getWorkflowStepIndex(inspectedReq.status);
                  const isCurrent = wp.step === currentStep;
                  const isPassed = wp.step < currentStep;

                  return (
                    <div key={wp.step} className="flex flex-col items-center text-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                          isCurrent
                            ? 'bg-amber-500 text-gray-950 border-amber-300 ring-2 ring-amber-500/40 shadow-lg scale-110'
                            : isPassed
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : 'bg-gray-900 text-gray-500 border-gray-800'
                        }`}
                      >
                        {isPassed ? '✓' : wp.step}
                      </div>
                      <span
                        className={`text-[9px] font-bold mt-1.5 line-clamp-1 ${
                          isCurrent ? 'text-amber-300' : isPassed ? 'text-emerald-400' : 'text-gray-500'
                        }`}
                      >
                        {wp.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Workflow State Advance Actions */}
              <div className="p-3 bg-gray-900/90 border border-gray-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Current Active Phase</span>
                  <strong className="text-amber-300 font-bold">
                    {WORKFLOW_PIPELINE.find((wp) => wp.step === getWorkflowStepIndex(inspectedReq.status))?.label}
                  </strong>
                  <span className="text-gray-500 text-[10px] block mt-0.5">
                    {WORKFLOW_PIPELINE.find((wp) => wp.step === getWorkflowStepIndex(inspectedReq.status))?.desc}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {getWorkflowStepIndex(inspectedReq.status) === 1 && (
                    <button
                      onClick={() => handleUpdateStatus(inspectedReq.id, 'ASSIGNED')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs shadow"
                    >
                      👉 Task Assigned ➔
                    </button>
                  )}
                  {getWorkflowStepIndex(inspectedReq.status) === 2 && (
                    <button
                      onClick={() => handleUpdateStatus(inspectedReq.id, 'IN_PROGRESS')}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg text-xs shadow"
                    >
                      ▶️ Start Production ➔
                    </button>
                  )}
                  {getWorkflowStepIndex(inspectedReq.status) === 3 && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(inspectedReq.id, 'WAITING_FOR_TECHNICAL_REVIEW')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow"
                      >
                        🔍 Technical Review ➔
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(inspectedReq.id, 'WAITING_FOR_MEDIA_REVIEW')}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs shadow"
                      >
                        👔 Media Manager Review ➔
                      </button>
                    </>
                  )}
                  {getWorkflowStepIndex(inspectedReq.status) === 4 && (
                    <button
                      onClick={() => handleUpdateStatus(inspectedReq.id, 'WAITING_FOR_MEDIA_REVIEW')}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs shadow"
                    >
                      ✅ Pass Tech QC ➔ Media Review ➔
                    </button>
                  )}
                  {getWorkflowStepIndex(inspectedReq.status) === 5 && (
                    <button
                      onClick={() => handleUpdateStatus(inspectedReq.id, 'WAITING_FOR_CLIENT_CONFIRMATION')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow"
                    >
                      📤 Send to Client Confirmation ➔
                    </button>
                  )}
                  {getWorkflowStepIndex(inspectedReq.status) === 6 && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(inspectedReq.id, 'COMPLETED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow"
                      >
                        🎉 Client Approved (Complete)
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(inspectedReq.id, 'CLIENT_REVISION_REQUESTED')}
                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs shadow"
                      >
                        ⚠️ Revision Requested
                      </button>
                    </>
                  )}
                  {inspectedReq.status === 'CLIENT_REVISION_REQUESTED' && (
                    <button
                      onClick={() => handleUpdateStatus(inspectedReq.id, 'IN_PROGRESS')}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg text-xs shadow"
                    >
                      🔄 Resume Production Revision
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Structured Attributes Inspector Grid */}
            <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-3">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block border-b border-gray-800 pb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Graphic Requirement Specifications
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
                {/* Requirement ID */}
                <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Requirement ID</span>
                  <span className="text-amber-400 font-mono font-bold text-xs">{inspectedReq.requirementId}</span>
                </div>

                {/* Requirement Name */}
                <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Requirement Name</span>
                  <span className="text-white font-bold">{inspectedReq.name}</span>
                </div>

                {/* Client */}
                <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Client</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    🏢 {inspectedReq.client?.name || 'N/A'}
                  </span>
                </div>

                {/* Brand */}
                <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Brand</span>
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    🏷️ [{inspectedReq.brand?.shortCode}] {inspectedReq.brand?.name}
                  </span>
                </div>

                {/* Product */}
                <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Product</span>
                  <span className="text-cyan-300 font-medium">
                    {inspectedReq.product?.name ? `📦 ${inspectedReq.product.name}` : 'N/A'}
                  </span>
                </div>

                {/* Campaign */}
                <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Campaign</span>
                  <span className="text-purple-300 font-medium">
                    {inspectedReq.campaign?.name ? `📣 ${inspectedReq.campaign.name}` : 'N/A'}
                  </span>
                </div>

                {/* Requirement Type */}
                <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Requirement Type</span>
                  <span className="text-white font-bold">{inspectedReq.requirementType}</span>
                </div>

                {/* Priority */}
                <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Priority</span>
                  <span className="text-amber-300 font-bold">{inspectedReq.priority} Priority</span>
                </div>

                {/* Estimated Completion */}
                <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Estimated Completion</span>
                  <span className="text-gray-200 font-mono font-medium">
                    📅 {inspectedReq.estimatedCompletion ? new Date(inspectedReq.estimatedCompletion).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                {/* Revision Count & Workflow Controls */}
                <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Revision History</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="px-2 py-0.5 bg-orange-950 text-orange-400 border border-orange-800 rounded font-mono font-bold text-xs">
                      🔄 Revision #{inspectedReq.revisionCount || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(inspectedReq.id, 'REVISION_REQUESTED')}
                      className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded font-bold text-[10px] transition-colors"
                    >
                      + Request Revision
                    </button>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase mb-1">Status</span>
                  <select
                    value={inspectedReq.status}
                    onChange={(e) => handleUpdateStatus(inspectedReq.id, e.target.value)}
                    className={`w-full font-bold text-xs p-1.5 rounded border focus:outline-none ${getStatusBadge(inspectedReq.status)}`}
                  >
                    {GRAPHIC_REQUIREMENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value} className="bg-gray-950 text-white font-normal">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Employees */}
                <div className="col-span-1 md:col-span-2 bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase mb-1">Assigned Employees</span>
                  {(() => {
                    const assignedNames = Array.from(new Set(
                      (inspectedReq.tasks || []).flatMap((t: any) =>
                        (t.assignedEmployees || []).map((e: any) => e.user?.name)
                      ).filter(Boolean)
                    ));
                    return assignedNames.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {assignedNames.map((name: any) => (
                          <span key={name} className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded font-semibold text-[10px] flex items-center gap-1">
                            <User className="w-3 h-3" /> {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic text-[11px]">No staff assigned to sub-tasks.</span>
                    );
                  })()}
                </div>

                {/* Objective */}
                <div className="col-span-1 md:col-span-2 bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Objective</span>
                  <p className="text-gray-200 mt-0.5">{inspectedReq.objective || 'No objective specified.'}</p>
                </div>

                {/* Description */}
                <div className="col-span-1 md:col-span-2 bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Description &amp; Guidelines</span>
                  <p className="text-gray-300 mt-0.5">{inspectedReq.description || 'No description provided.'}</p>
                </div>

                {/* Remarks */}
                <div className="col-span-1 md:col-span-2 bg-gray-900/80 p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-gray-500 font-bold block text-[10px] uppercase">Remarks</span>
                  <p className="text-amber-200 mt-0.5">{inspectedReq.remarks || 'No remarks.'}</p>
                </div>
              </div>
            </div>

            {/* 4 Mandatory Completion Criteria Matrix */}
            <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  ✅ 4 Completion Sign-off Criteria Matrix
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {inspectedReq.status === 'COMPLETED' ? '🎉 REQUIREMENT COMPLETED' : '⏳ Workflow In-Progress'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {/* 1. Production Complete */}
                <div className={`p-3 rounded-xl border space-y-1 ${inspectedReq.files?.length > 0 ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' : 'bg-gray-900 border-gray-800 text-gray-400'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">1. Production Complete</span>
                    <span>{inspectedReq.files?.length > 0 ? '✅' : '⏳'}</span>
                  </div>
                  <span className="text-[10px] block opacity-80">
                    {inspectedReq.files?.length > 0 ? 'Export File Ready' : 'Pending Export Upload'}
                  </span>
                </div>

                {/* 2. Technical Review Approved */}
                <label className={`p-3 rounded-xl border space-y-1 cursor-pointer transition-colors ${inspectedReq.technicalReviewApproved ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">2. Technical Review</span>
                    <input
                      type="checkbox"
                      checked={Boolean(inspectedReq.technicalReviewApproved)}
                      onChange={(e) => handleToggleCompletionMilestone('technicalReviewApproved', e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                  </div>
                  <span className="text-[10px] block opacity-80">
                    {inspectedReq.technicalReviewApproved ? 'Approved by Specs QC' : 'Pending Technical Review'}
                  </span>
                </label>

                {/* 3. Media Manager Approved */}
                <label className={`p-3 rounded-xl border space-y-1 cursor-pointer transition-colors ${inspectedReq.mediaManagerApproved ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">3. Media Manager</span>
                    <input
                      type="checkbox"
                      checked={Boolean(inspectedReq.mediaManagerApproved)}
                      onChange={(e) => handleToggleCompletionMilestone('mediaManagerApproved', e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                  </div>
                  <span className="text-[10px] block opacity-80">
                    {inspectedReq.mediaManagerApproved ? 'Manager Sign-off Done' : 'Pending Manager Review'}
                  </span>
                </label>

                {/* 4. Client Confirmation Recorded */}
                <label className={`p-3 rounded-xl border space-y-1 cursor-pointer transition-colors ${inspectedReq.clientConfirmed ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">4. Client Confirmation</span>
                    <input
                      type="checkbox"
                      checked={Boolean(inspectedReq.clientConfirmed)}
                      onChange={(e) => handleToggleCompletionMilestone('clientConfirmed', e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                  </div>
                  <span className="text-[10px] block opacity-80">
                    {inspectedReq.clientConfirmed ? 'Client Confirmation Recorded' : 'Pending Client Confirmation'}
                  </span>
                </label>
              </div>
            </div>

            {/* Produced Deliverables Vault (Outputs Manifest) */}
            <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  📦 Produced Deliverable Outputs (One Requirement ➔ Multiple Deliverables)
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  Multi-Format Output Stream
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {AVAILABLE_DELIVERABLE_FORMATS.map((del) => {
                  const matchingFile = (inspectedReq.files || []).find(
                    (f: any) => f.fileName?.toLowerCase().includes(del.name.toLowerCase()) || f.attachmentCategory === del.name
                  );

                  return (
                    <div
                      key={del.name}
                      className="p-3 bg-gray-900/90 border border-gray-800 rounded-xl space-y-2 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                            {del.icon} {del.name}
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono">({del.ext})</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block mt-1">
                          {matchingFile ? '✅ Export Ready' : '⏳ Pending Export'}
                        </span>
                      </div>

                      {matchingFile ? (
                        <a
                          href={matchingFile.fileUrl || `http://localhost:4000${matchingFile.storagePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded font-bold text-[10px] text-center transition-colors block"
                        >
                          View Deliverable ↗
                        </a>
                      ) : (
                        <label className="cursor-pointer px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-amber-300 border border-amber-800/50 rounded font-semibold text-[10px] text-center block transition-colors">
                          + Upload Export
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, del.name)}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Design Assets & File Attachment Vault (8 Mandatory Categories) */}
            <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  📁 Design Assets &amp; File Attachments (8 Categories)
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {inspectedReq.files?.length || 0} File(s) Uploaded
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                {GRAPHIC_FILE_CATEGORIES.map((cat) => {
                  const catFiles = (inspectedReq.files || []).filter(
                    (f: any) => f.attachmentCategory === cat.key || f.fileCategory === cat.key
                  );

                  return (
                    <div key={cat.key} className="bg-gray-900/80 p-3 rounded-lg border border-gray-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white flex items-center gap-1 text-xs">
                            {cat.icon} {cat.label}
                          </span>
                          <span className="text-[9px] text-gray-500 block">{cat.desc}</span>
                        </div>

                        <label className="cursor-pointer px-2 py-1 bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-cyan-800/50 rounded font-semibold text-[10px] flex items-center gap-1 transition-colors">
                          {uploadingCategory === cat.key ? (
                            'Uploading...'
                          ) : (
                            <>+ Attach File</>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, cat.key)}
                            disabled={uploadingCategory === cat.key}
                          />
                        </label>
                      </div>

                      {catFiles.length === 0 ? (
                        <div className="text-[10px] text-gray-500 italic p-1 bg-gray-950/60 rounded border border-gray-800/40">
                          No {cat.label.toLowerCase()} attached yet.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {catFiles.map((f: any) => (
                            <div key={f.id} className="p-1.5 bg-gray-950 border border-gray-800 rounded flex items-center justify-between text-[10px]">
                              <span className="text-gray-200 font-medium truncate max-w-[170px]">
                                📄 {f.fileName}
                              </span>
                              <a
                                href={f.fileUrl || `http://localhost:4000${f.storagePath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:underline font-bold"
                              >
                                View ↗
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generated Tasks */}
            <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg space-y-2">
              <span className="text-[10px] text-purple-400 font-bold uppercase block">
                Automated Associated Tasks ({inspectedReq.tasks?.length || 0})
              </span>

              {(!inspectedReq.tasks || inspectedReq.tasks.length === 0) ? (
                <p className="text-gray-500 italic text-[11px]">No tasks associated.</p>
              ) : (
                <div className="space-y-1.5">
                  {inspectedReq.tasks.map((t: any) => (
                    <div key={t.id} className="p-2 bg-gray-950 border border-gray-800 rounded flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono text-blue-400 font-bold">{t.taskId}:</span>{' '}
                        <span className="text-white font-medium">{t.title}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-900 border border-gray-700 text-gray-300 rounded font-bold text-[10px]">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity & Revision History Timeline */}
            <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  🕒 Activity &amp; Revision History Timeline (Full Audit Trail)
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  Preserved Log Entries
                </span>
              </div>

              <div className="p-3 bg-gray-900/90 border border-gray-800 rounded-xl space-y-2 text-xs">
                <div className="p-2 bg-amber-950/30 border border-amber-800/40 rounded-lg text-amber-300 text-[10px] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Active Deliverable Rule:</strong> Only the latest production file remains active per category. All replaced versions, timestamps, and uploaders are permanently archived in this timeline.
                  </span>
                </div>

                {(() => {
                  const reqTimeline = inspectedReq.timeline || [];
                  const taskTimeline = (inspectedReq.tasks || []).flatMap((t: any) => t.timeline || []);
                  const allTimelineLogs = [...reqTimeline, ...taskTimeline].sort(
                    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  );

                  if (allTimelineLogs.length === 0) {
                    return (
                      <p className="text-gray-500 italic text-[11px] p-2">
                        Requirement initialized. No revision actions recorded yet.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pt-1">
                      {allTimelineLogs.map((log: any) => (
                        <div
                          key={log.id}
                          className="p-2.5 bg-gray-950 border border-gray-800 rounded-lg flex items-start justify-between gap-3 text-[11px]"
                        >
                          <div className="space-y-0.5">
                            <span className="px-1.5 py-0.5 bg-gray-900 text-amber-400 font-mono font-bold text-[9px] border border-gray-800 rounded">
                              {log.event || 'REVISION_EVENT'}
                            </span>
                            <p className="text-gray-200 font-medium leading-snug mt-1">{log.description}</p>
                          </div>

                          <span className="text-gray-500 font-mono text-[9px] whitespace-nowrap shrink-0">
                            📅 {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Permanent Remarks History & Interactive Input (User • Date • Time • Message) */}
            <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  💬 Permanent Remarks History (User • Date • Time • Message)
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {inspectedReq.remarksHistory?.length || 0} Permanent Remark(s)
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Remarks Feed */}
                {(!inspectedReq.remarksHistory || inspectedReq.remarksHistory.length === 0) ? (
                  <p className="text-gray-500 italic text-[11px] p-2 bg-gray-900/60 rounded-lg border border-gray-800">
                    No remarks recorded yet for this requirement. Add a permanent remark below.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {inspectedReq.remarksHistory.map((rem: any) => {
                      const remDate = new Date(rem.createdAt);
                      const formattedDate = remDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const formattedTime = remDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                      return (
                        <div key={rem.id} className="p-3 bg-gray-900 border border-gray-800 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-2">
                              <strong className="text-white flex items-center gap-1">
                                👤 {rem.user?.name || 'User'}
                              </strong>
                              <span className="px-1.5 py-0.2 bg-purple-950 text-purple-300 border border-purple-800 rounded text-[9px] font-semibold">
                                {rem.user?.role || 'STAFF'}
                              </span>
                            </div>

                            <div className="text-gray-400 font-mono flex items-center gap-2">
                              <span>📅 {formattedDate}</span>
                              <span>⏰ {formattedTime}</span>
                            </div>
                          </div>

                          <p className="text-gray-200 leading-relaxed text-xs pl-2 border-l-2 border-purple-500">
                            {rem.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Remark Form */}
                <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl space-y-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                    Add Permanent Remark
                  </span>
                  <textarea
                    rows={2}
                    placeholder="Type remark message (Visible to staff & managers, stored permanently)..."
                    value={remarkInput}
                    onChange={(e) => setRemarkInput(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-gray-500 italic">
                      🔒 Permanent history: Remarks cannot be edited or deleted.
                    </span>
                    <button
                      type="button"
                      onClick={handleAddRemark}
                      disabled={addingRemark || !remarkInput.trim()}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-colors disabled:opacity-50"
                    >
                      {addingRemark ? 'Posting...' : '💬 Post Permanent Remark'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => setInspectedReq(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg text-xs"
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
