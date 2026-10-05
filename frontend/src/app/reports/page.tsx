'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { fetchApi, resolveFileUrl } from '@/lib/api';
import { exportToCSV, ExportColumn } from '@/utils/exportUtils';
import {
  FileBarChart,
  Download,
  Calendar,
  Camera,
  Palette,
  Users,
  Film,
  BookmarkCheck,
  RotateCcw,
  Search,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  ArrowRightLeft,
  X,
  RefreshCw,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import {
  getAllowedReportTabs,
  ReportTab,
} from '@/lib/report-permissions';
import { useBrand } from '@/lib/brand-context';

type DatePreset = 'this_month' | 'today' | 'this_week' | 'custom';

const formatTaskTypeLabel = (type?: string) => {
  if (!type) return 'Others';
  if (type === 'OTHERS' || type === 'OTHER') return 'Others';
  if (type === 'SHOOT' || type === 'PROJECT') return 'Shoot';
  if (type === 'GRAPHIC' || type === 'GRAPHIC_REQUIREMENT') return 'Graphic';
  if (type === 'VIDEO_EDITING') return 'Video Editing';
  return type.replace(/_/g, ' ');
};

export default function ReportsPage() {
  const { user } = useAuth();
  const { activeBrandId, activeBrand, setActiveBrandId } = useBrand();
  const userRole = (user?.role || '') as string;
  const isMarketingManager = userRole === 'MARKETING_MANAGER';
  const isMediaManager = userRole === 'MEDIA_MANAGER' || userRole === 'ADMINISTRATOR' || userRole === 'ADMIN';

  const allowedTabs = useMemo(() => getAllowedReportTabs(userRole), [userRole]);
  const [activeTab, setActiveTab] = useState<ReportTab>('brand_reports');

  // Sync activeTab when allowedTabs changes or user logs in
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [allowedTabs, activeTab]);

  // ─── Filter States ──────────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedClient, setSelectedClient] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Report-specific filters
  const [selectedTaskType, setSelectedTaskType] = useState('ALL');
  const [selectedAssignedBy, setSelectedAssignedBy] = useState('');
  const [selectedAssignedTo, setSelectedAssignedTo] = useState('');
  const [selectedShootType, setSelectedShootType] = useState('ALL');
  const [shootLocation, setShootLocation] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRentalStatus, setSelectedRentalStatus] = useState('ALL');
  const [rentalCustomer, setRentalCustomer] = useState('');
  const [groupByBrand, setGroupByBrand] = useState(false);

  // Staff Drill-down modal
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<any | null>(null);

  // Master Dropdown Options
  const [clients, setClients] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [equipmentCategories, setEquipmentCategories] = useState<string[]>([]);

  // Report Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>({ summary: {}, rows: [] });

  // ─── Load Dropdown Metadata ────────────────────────────────────────────────
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [clientsRes, brandsRes, projectsRes, staffRes, eqRes] = await Promise.all([
          fetchApi('/clients').catch(() => []),
          fetchApi('/brands').catch(() => []),
          fetchApi('/projects').catch(() => []),
          fetchApi('/staff').catch(() => []),
          fetchApi('/equipment').catch(() => []),
        ]);

        setClients(Array.isArray(clientsRes) ? clientsRes : []);
        setBrands(Array.isArray(brandsRes) ? brandsRes : []);
        setProjects(Array.isArray(projectsRes) ? projectsRes : []);
        setUsersList(Array.isArray(staffRes) ? staffRes : []);

        if (Array.isArray(eqRes)) {
          const cats = Array.from(new Set(eqRes.map((e: any) => e.category).filter(Boolean))) as string[];
          setEquipmentCategories(cats);
        }
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // Filter brands based on selected client
  const filteredBrands = useMemo(() => {
    if (!selectedClient) return brands;
    return brands.filter((b) => b.clientId === selectedClient);
  }, [brands, selectedClient]);

  // Filter projects based on selected client/brand
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedClient && p.clientId !== selectedClient) return false;
      if (selectedBrand && p.brandId !== selectedBrand) return false;
      return true;
    });
  }, [projects, selectedClient, selectedBrand]);

  // ─── Fetch Active Report Data ──────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    if (!allowedTabs.includes(activeTab)) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Date filtering
      if (datePreset !== 'custom') {
        params.append('period', datePreset);
      } else {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }

      if (selectedClient) params.append('clientId', selectedClient);
      const effectiveBrand = selectedBrand || (activeBrandId && activeBrandId !== 'ALL' ? activeBrandId : '');
      if (effectiveBrand) params.append('brandId', effectiveBrand);
      if (selectedProject) params.append('projectId', selectedProject);
      if (selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      let endpoint = '';
      switch (activeTab) {
        case 'brand_reports':
          endpoint = '/reports/brand-reports';
          break;
        case 'task_assignments':
          endpoint = '/reports/task-assignments';
          if (selectedTaskType && selectedTaskType !== 'ALL') params.append('taskType', selectedTaskType);
          if (selectedAssignedBy) params.append('assignedBy', selectedAssignedBy);
          if (selectedAssignedTo) params.append('assignedTo', selectedAssignedTo);
          break;
        case 'shoot_reports':
          endpoint = '/reports/shoot-reports';
          if (selectedShootType && selectedShootType !== 'ALL') params.append('shootType', selectedShootType);
          if (shootLocation.trim()) params.append('location', shootLocation.trim());
          break;
        case 'graphic_reports':
          endpoint = '/reports/graphic-reports';
          if (selectedStaffId) params.append('assignedStaffId', selectedStaffId);
          break;
        case 'staff_work':
          endpoint = '/reports/staff-work-reports';
          if (selectedStaffId) params.append('staffId', selectedStaffId);
          if (selectedTaskType && selectedTaskType !== 'ALL') params.append('taskType', selectedTaskType);
          break;
        case 'equipment_rental':
          endpoint = '/reports/equipment-rental-reports';
          if (selectedCategory && selectedCategory !== 'ALL') params.append('category', selectedCategory);
          if (selectedRentalStatus && selectedRentalStatus !== 'ALL') params.append('rentalStatus', selectedRentalStatus);
          if (rentalCustomer.trim()) params.append('customer', rentalCustomer.trim());
          break;
        default:
          endpoint = '/reports/brand-reports';
      }

      const queryString = params.toString();
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;
      const res = await fetchApi(url);
      setReportData(res || { summary: {}, rows: [] });
    } catch (err: any) {
      console.error('Failed to load report data:', err);
      setError(err?.message || 'Failed to fetch report data. Please verify your permissions.');
      setReportData({ summary: {}, rows: [] });
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    allowedTabs,
    datePreset,
    startDate,
    endDate,
    selectedClient,
    selectedBrand,
    activeBrandId,
    selectedProject,
    selectedStatus,
    searchQuery,
    selectedTaskType,
    selectedAssignedBy,
    selectedAssignedTo,
    selectedShootType,
    shootLocation,
    selectedStaffId,
    selectedCategory,
    selectedRentalStatus,
    rentalCustomer,
  ]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Reset filters helper
  const handleResetFilters = () => {
    setDatePreset('this_month');
    setStartDate('');
    setEndDate('');
    setSelectedClient('');
    setSelectedBrand('');
    setSelectedProject('');
    setSelectedStatus('ALL');
    setSearchQuery('');
    setSelectedTaskType('ALL');
    setSelectedAssignedBy('');
    setSelectedAssignedTo('');
    setSelectedShootType('ALL');
    setShootLocation('');
    setSelectedStaffId('');
    setSelectedCategory('ALL');
    setSelectedRentalStatus('ALL');
    setRentalCustomer('');
  };

  // ─── CSV Export Functionality ──────────────────────────────────────────────
  const handleExportCSV = () => {
    let exportRows: any[] = [];
    let columns: ExportColumn[] = [];
    const filename = `MOMS_${activeTab}_Report_${new Date().toISOString().split('T')[0]}`;

    switch (activeTab) {
      case 'brand_reports':
        exportRows = reportData.rows || [];
        columns = [
          { header: 'Brand', key: 'brandName' },
          { header: 'Client', key: 'clientName' },
          { header: 'Project Code', key: 'projectCode' },
          { header: 'Project Name', key: 'projectName' },
          { header: 'Task Code', key: 'taskCode' },
          { header: 'Task Name', key: 'taskName' },
          { header: 'Task Type', key: 'taskType' },
          { header: 'Assigned To', key: 'assignedTo' },
          { header: 'Assigned By', key: 'assignedBy' },
          { header: 'Status', key: 'status' },
          { header: 'Due Date', key: 'dueDate' },
        ];
        break;

      case 'task_assignments':
        exportRows = reportData.rows || [];
        columns = [
          { header: 'Task ID', key: 'taskCode' },
          { header: 'Task Name', key: 'taskName' },
          { header: 'Client', key: 'clientName' },
          { header: 'Brand', key: 'brandName' },
          { header: 'Project', key: 'projectName' },
          { header: 'Task Type', key: 'taskType' },
          { header: 'Assigned By', key: 'assignedBy' },
          { header: 'Assigned To', key: 'assignedTo' },
          { header: 'Assigned Date', key: 'assignedDate' },
          { header: 'Due Date', key: 'dueDate' },
          { header: 'Status', key: 'status' },
        ];
        break;

      case 'shoot_reports':
        exportRows = reportData.rows || [];
        columns = [
          { header: 'Shoot Project ID', key: 'projectCode' },
          { header: 'Project Name', key: 'name' },
          { header: 'Brand', key: 'brandName' },
          { header: 'Client', key: 'clientName' },
          { header: 'Shoot Type', key: 'shootType' },
          { header: 'Shoot Date', key: 'shootDate' },
          { header: 'Location', key: 'location' },
          { header: 'Status', key: 'status' },
          { header: 'Assigned Team', key: 'assignedTeam' },
        ];
        break;

      case 'graphic_reports':
        exportRows = reportData.rows || [];
        columns = [
          { header: 'Graphic ID', key: 'graphicCode' },
          { header: 'Graphic Name', key: 'name' },
          { header: 'Brand', key: 'brandName' },
          { header: 'Client', key: 'clientName' },
          { header: 'Project', key: 'projectName' },
          { header: 'Assigned To', key: 'assignedTo' },
          { header: 'Created Date', key: 'createdAt' },
          { header: 'Deadline', key: 'deadline' },
          { header: 'Status', key: 'status' },
        ];
        break;

      case 'staff_work':
        exportRows = reportData.staffSummaries || [];
        columns = [
          { header: 'Staff Name', key: 'staffName' },
          { header: 'Email', key: 'email' },
          { header: 'Role', key: 'role' },
          { header: 'Assigned Tasks', key: 'assigned' },
          { header: 'Completed', key: 'completed' },
          { header: 'In Progress', key: 'inProgress' },
          { header: 'Pending', key: 'pending' },
          { header: 'Overdue', key: 'overdue' },
          { header: 'Outputs Produced', key: 'totalOutputs' },
        ];
        break;

      case 'equipment_rental':
        exportRows = reportData.rows || [];
        columns = [
          { header: 'Asset Code', key: 'assetCode' },
          { header: 'Equipment Name', key: 'equipmentName' },
          { header: 'Category', key: 'category' },
          { header: 'Brand', key: 'brandName' },
          { header: 'Rental Customer', key: 'rentalCustomer' },
          { header: 'Rental Start Date', key: 'rentalStartDate' },
          { header: 'Expected Return', key: 'rentalExpectedReturnDate' },
          { header: 'Actual Return', key: 'actualReturnDate' },
          { header: 'Condition', key: 'returnCondition' },
          { header: 'Damage Notes', key: 'damageNotes' },
          { header: 'Rented By', key: 'rentedBy' },
          { header: 'Returned By', key: 'returnedBy' },
          { header: 'Status', key: 'status' },
        ];
        break;
    }

    if (exportRows.length === 0) {
      alert('No data to export for the selected filters.');
      return;
    }

    exportToCSV({
      data: exportRows,
      columns,
      filename,
      metadata: [
        `Report: ${activeTab.toUpperCase()}`,
        `Generated By: ${user?.name || 'User'} (${userRole})`,
        `Date Range: ${datePreset}`,
      ],
    });
  };

  // ─── Format Helpers ────────────────────────────────────────────────────────
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('COMPLETED') || s.includes('APPROVED') || s === 'AVAILABLE' || s === 'CLOSED') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('PROGRESS') || s === 'RENTED_OUT' || s === 'INDOOR') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (s.includes('REVISION') || s.includes('HOLD') || s === 'OUTDOOR') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (s.includes('DAMAGED') || s.includes('MAINTENANCE') || s.includes('REJECTED') || s.includes('OVERDUE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Guard: If role not allowed, render clean unauthorized message
  if (!isMarketingManager && !isMediaManager) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-6">
            The Reports module is strictly reserved for Marketing Managers and Media Managers.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
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
              . Reports and metrics are filtered to this brand.
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

      {/* ─── Page Header & Report Switcher ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <FileBarChart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reports</h1>
            </div>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {allowedTabs.includes('brand_reports') && (
            <button
              onClick={() => setActiveTab('brand_reports')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'brand_reports'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              Brand Reports
            </button>
          )}

          {allowedTabs.includes('task_assignments') && (
            <button
              onClick={() => setActiveTab('task_assignments')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'task_assignments'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Task Assignment
            </button>
          )}

          {allowedTabs.includes('shoot_reports') && (
            <button
              onClick={() => setActiveTab('shoot_reports')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'shoot_reports'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              Shoot Reports
            </button>
          )}

          {allowedTabs.includes('graphic_reports') && (
            <button
              onClick={() => setActiveTab('graphic_reports')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'graphic_reports'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-4 h-4" />
              Graphic Reports
            </button>
          )}

          {allowedTabs.includes('staff_work') && (
            <button
              onClick={() => setActiveTab('staff_work')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'staff_work'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Staff Work
            </button>
          )}

          {allowedTabs.includes('equipment_rental') && (
            <button
              onClick={() => setActiveTab('equipment_rental')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'equipment_rental'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Film className="w-4 h-4" />
              Equipment Rental
            </button>
          )}
        </div>
      </div>

      {/* ─── Common Simple Filter Bar ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        {/* Date presets + Quick Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date:
            </span>
            {(['this_month', 'today', 'this_week', 'custom'] as DatePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  datePreset === preset
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset === 'this_month' && 'This Month'}
                {preset === 'today' && 'Today'}
                {preset === 'this_week' && 'This Week'}
                {preset === 'custom' && 'Custom Range'}
              </button>
            ))}

            {datePreset === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Export button */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchReport}
              disabled={loading}
              title="Refresh Report Data"
              className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium transition flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          {/* Client Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Client</label>
            <select
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value);
                setSelectedBrand('');
                setSelectedProject('');
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Brand</label>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setSelectedProject('');
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Brands</option>
              {filteredBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Projects</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectId ? `[${p.projectId}] ` : ''}
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING">Pending / Planned</option>
              {activeTab === 'graphic_reports' && <option value="CLIENT_REVISION_REQUESTED">Revision</option>}
            </select>
          </div>

          {/* Report-Specific Slot 1 */}
          {activeTab === 'task_assignments' && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Task Type</label>
                <select
                  value={selectedTaskType}
                  onChange={(e) => setSelectedTaskType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Task Types</option>
                  <option value="SHOOT">Shoot</option>
                  <option value="GRAPHIC">Graphic</option>
                  <option value="VIDEO_EDITING">Video Editing</option>
                  <option value="OTHERS">Others</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Assigned To</label>
                <select
                  value={selectedAssignedTo}
                  onChange={(e) => setSelectedAssignedTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Assignees</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {activeTab === 'shoot_reports' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Shoot Type</label>
              <select
                value={selectedShootType}
                onChange={(e) => setSelectedShootType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="INDOOR">Indoor</option>
                <option value="OUTDOOR">Outdoor</option>
              </select>
            </div>
          )}

          {activeTab === 'staff_work' && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Staff Member</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Staff</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Task Type</label>
                <select
                  value={selectedTaskType}
                  onChange={(e) => setSelectedTaskType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Task Types</option>
                  <option value="SHOOT">Shoot</option>
                  <option value="GRAPHIC">Graphic</option>
                  <option value="VIDEO_EDITING">Video Editing</option>
                  <option value="OTHERS">Others</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'equipment_rental' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Rental Status</label>
              <select
                value={selectedRentalStatus}
                onChange={(e) => setSelectedRentalStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Rentals</option>
                <option value="RENTED_OUT">Rented Out</option>
                <option value="RETURNED">Returned</option>
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="flex items-end gap-1">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
            </div>
            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Compact Summary Indicators Row ─────────────────────────────────── */}
      {reportData.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {activeTab === 'brand_reports' && (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Tasks</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{reportData.summary.totalTasks || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Completed</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{reportData.summary.completed || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">In Progress</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{reportData.summary.inProgress || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending</p>
                <p className="text-xl font-bold text-slate-700 mt-1">{reportData.summary.pending || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Overdue</p>
                <p className="text-xl font-bold text-rose-700 mt-1">{reportData.summary.overdue || 0}</p>
              </div>
            </>
          )}

          {activeTab === 'task_assignments' && (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Tasks</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{reportData.summary.totalTasks || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Completed</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{reportData.summary.completed || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">In Progress</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{reportData.summary.inProgress || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending</p>
                <p className="text-xl font-bold text-slate-700 mt-1">{reportData.summary.pending || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Overdue</p>
                <p className="text-xl font-bold text-rose-700 mt-1">{reportData.summary.overdue || 0}</p>
              </div>
            </>
          )}

          {activeTab === 'shoot_reports' && (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Shoots</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{reportData.summary.totalShoots || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Indoor Shoots</p>
                <p className="text-xl font-bold text-indigo-700 mt-1">{reportData.summary.indoor || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Outdoor Shoots</p>
                <p className="text-xl font-bold text-amber-700 mt-1">{reportData.summary.outdoor || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Completed</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{reportData.summary.completed || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">In Progress</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{reportData.summary.inProgress || 0}</p>
              </div>
            </>
          )}

          {activeTab === 'graphic_reports' && (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Graphics</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{reportData.summary.totalGraphics || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Completed</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{reportData.summary.completed || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">In Progress</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{reportData.summary.inProgress || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending</p>
                <p className="text-xl font-bold text-slate-700 mt-1">{reportData.summary.pending || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Revisions</p>
                <p className="text-xl font-bold text-amber-700 mt-1">{reportData.summary.revision || 0}</p>
              </div>
            </>
          )}

          {activeTab === 'staff_work' && (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Staff Count</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{reportData.staffSummaries?.length || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Total Tasks</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {reportData.staffSummaries?.reduce((acc: number, s: any) => acc + (s.assigned || 0), 0) || 0}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Completed</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {reportData.staffSummaries?.reduce((acc: number, s: any) => acc + (s.completed || 0), 0) || 0}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">In Progress</p>
                <p className="text-xl font-bold text-blue-700 mt-1">
                  {reportData.staffSummaries?.reduce((acc: number, s: any) => acc + (s.inProgress || 0), 0) || 0}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Overdue</p>
                <p className="text-xl font-bold text-rose-700 mt-1">
                  {reportData.staffSummaries?.reduce((acc: number, s: any) => acc + (s.overdue || 0), 0) || 0}
                </p>
              </div>
              <div className="bg-white border border-purple-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Outputs Produced</p>
                <p className="text-xl font-bold text-purple-700 mt-1">
                  {reportData.staffSummaries?.reduce((acc: number, s: any) => acc + (s.totalOutputs || 0), 0) || 0}
                </p>
              </div>
            </>
          )}

          {activeTab === 'equipment_rental' && (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Rented Out</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{reportData.summary.totalRentedOut || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Returned</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{reportData.summary.returned || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Currently Outside</p>
                <p className="text-xl font-bold text-amber-700 mt-1">{reportData.summary.currentlyOutside || 0}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Detailed Report Table ────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Table Title and Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              {activeTab === 'brand_reports' && 'Brand Work & Production Activity'}
              {activeTab === 'task_assignments' && 'Task Assignment Report (Assigned By vs Assigned To)'}
              {activeTab === 'shoot_reports' && 'Shoot Project Report (Indoor vs Outdoor)'}
              {activeTab === 'graphic_reports' && 'Graphic Production Activity'}
              {activeTab === 'staff_work' && 'Staff Work Allocation & Status'}
              {activeTab === 'equipment_rental' && 'Equipment Rental & Return Activity'}
            </h2>
            <span className="text-xs text-slate-500">
              ({activeTab === 'staff_work' ? (reportData.staffSummaries?.length || 0) : (reportData.rows?.length || 0)} records)
            </span>
          </div>

          {activeTab === 'equipment_rental' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setGroupByBrand(false)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                  !groupByBrand ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Flat Table
              </button>
              <button
                onClick={() => setGroupByBrand(true)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                  groupByBrand ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Group by Brand
              </button>
            </div>
          )}
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-medium">Loading report records...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center text-rose-600 bg-rose-50/50">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* Table Content */}
        {!loading && !error && (
          <div className="overflow-x-auto">
            {/* 1. BRAND REPORT TABLE */}
            {activeTab === 'brand_reports' && (
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Task</th>
                    <th className="py-3 px-4">Task Type</th>
                    <th className="py-3 px-4">Assigned To</th>
                    <th className="py-3 px-4">Assigned By</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData.rows || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No data found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900">{row.brandName}</td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/projects`}
                            className="text-blue-600 hover:underline font-medium flex items-center gap-1"
                          >
                            {row.projectName}
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          <Link href="/tasks" className="hover:text-blue-600 flex items-center gap-1">
                            {row.taskName}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{formatTaskTypeLabel(row.taskType)}</td>
                        <td className="py-3 px-4 text-slate-700">{row.assignedTo}</td>
                        <td className="py-3 px-4 text-slate-600">{row.assignedBy}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(
                              row.status
                            )}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {formatDate(row.dueDate)}
                          {row.isOverdue && (
                            <span className="ml-1.5 text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              Overdue
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 2. TASK ASSIGNMENT REPORT TABLE */}
            {activeTab === 'task_assignments' && (
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Task ID</th>
                    <th className="py-3 px-4">Task Name</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Task Type</th>
                    <th className="py-3 px-4 text-indigo-700 bg-indigo-50/50">Assigned By</th>
                    <th className="py-3 px-4 text-blue-700 bg-blue-50/50">Assigned To</th>
                    <th className="py-3 px-4">Assigned Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData.rows || []).length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-500">
                        No data found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono text-slate-600 font-semibold">{row.taskCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <Link href="/tasks" className="hover:text-blue-600">
                            {row.taskName}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{row.clientName}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{row.brandName}</td>
                        <td className="py-3 px-4 text-slate-700">
                          <Link href={`/projects`} className="hover:text-blue-600">
                            {row.projectName}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{formatTaskTypeLabel(row.taskType)}</td>
                        <td className="py-3 px-4 font-semibold text-indigo-800 bg-indigo-50/30">
                          {row.assignedBy}
                        </td>
                        <td className="py-3 px-4 font-semibold text-blue-800 bg-blue-50/30">
                          {row.assignedTo}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(row.assignedDate)}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {formatDate(row.dueDate)}
                          {row.isOverdue && (
                            <span className="ml-1 text-[10px] text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                              !
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(
                              row.status
                            )}`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 3. SHOOT REPORT TABLE */}
            {activeTab === 'shoot_reports' && (
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Shoot Project</th>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Shoot Type</th>
                    <th className="py-3 px-4">Shoot Date</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData.rows || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No data found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <Link
                            href={`/projects`}
                            className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                          >
                            {row.name}
                            <span className="text-[10px] text-slate-400 font-mono">({row.projectCode})</span>
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{row.brandName}</td>
                        <td className="py-3 px-4 text-slate-600">{row.clientName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                              row.shootType === 'INDOOR'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {row.shootType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{formatDate(row.shootDate)}</td>
                        <td className="py-3 px-4 text-slate-600">{row.location}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(
                              row.status
                            )}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{row.assignedTeam}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 4. GRAPHIC REPORT TABLE */}
            {activeTab === 'graphic_reports' && (
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Graphic ID</th>
                    <th className="py-3 px-4">Graphic Name</th>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Assigned To</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4">Deadline</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData.rows || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No data found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                          <Link href="/graphic-reqs" className="text-blue-600 hover:underline">
                            {row.graphicCode}
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{row.name}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{row.brandName}</td>
                        <td className="py-3 px-4 text-slate-600">{row.clientName}</td>
                        <td className="py-3 px-4 text-slate-700">
                          {row.projectId ? (
                            <Link href={`/projects`} className="hover:text-blue-600">
                              {row.projectName}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{row.assignedTo}</td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(row.createdAt)}</td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(row.deadline)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(
                              row.status
                            )}`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 5. STAFF WORK REPORT TABLE */}
            {activeTab === 'staff_work' && (
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Tasks</th>
                    <th className="py-3 px-4 text-emerald-700">Completed</th>
                    <th className="py-3 px-4 text-blue-700">In Progress</th>
                    <th className="py-3 px-4 text-slate-700">Pending</th>
                    <th className="py-3 px-4 text-rose-700">Overdue</th>
                    <th className="py-3 px-4 text-purple-700">Outputs</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData.staffSummaries || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No data found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    reportData.staffSummaries.map((staff: any) => (
                      <tr
                        key={staff.staffId}
                        onClick={() => {
                          const staffTasks = (reportData.detailedTasks || []).filter(
                            (t: any) => t.staffId === staff.staffId
                          );
                          setSelectedStaffDetail({ ...staff, tasks: staffTasks });
                        }}
                        className="hover:bg-blue-50/40 cursor-pointer transition"
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-700">
                            {staff.staffName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p>{staff.staffName}</p>
                            <p className="text-[10px] text-slate-400 font-normal">{staff.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{staff.role}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{staff.assigned}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-700">{staff.completed}</td>
                        <td className="py-3 px-4 font-semibold text-blue-700">{staff.inProgress}</td>
                        <td className="py-3 px-4 font-semibold text-slate-600">{staff.pending}</td>
                        <td className="py-3 px-4 font-semibold text-rose-700">{staff.overdue}</td>
                        <td className="py-3 px-4 font-bold text-purple-700">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            {staff.totalOutputs || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1 ml-auto">
                            View Work <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 6. EQUIPMENT RENTAL REPORT TABLE */}
            {activeTab === 'equipment_rental' && (
              <>
                {groupByBrand ? (
                  // Grouped by Brand View
                  <div className="divide-y divide-slate-200">
                    {(reportData.brandGroups || []).length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No data found for the selected filters.
                      </div>
                    ) : (
                      reportData.brandGroups.map((group: any) => (
                        <div key={group.brandName} className="p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{group.brandName}</h3>
                              <p className="text-[11px] text-slate-500">Rental Activity Group</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-medium">
                              <span>
                                Rented Out: <strong className="text-blue-700">{group.rentedOut}</strong>
                              </span>
                              <span>
                                Returned: <strong className="text-emerald-700">{group.returned}</strong>
                              </span>
                              <span>
                                Currently Outside: <strong className="text-amber-700">{group.outside}</strong>
                              </span>
                            </div>
                          </div>

                          <table className="w-full text-left text-xs text-slate-700">
                            <thead className="text-[11px] text-slate-500 border-b border-slate-100">
                              <tr>
                                <th className="py-2 px-3">Equipment</th>
                                <th className="py-2 px-3">Category</th>
                                <th className="py-2 px-3">Customer</th>
                                <th className="py-2 px-3">Start</th>
                                <th className="py-2 px-3">Expected Return</th>
                                <th className="py-2 px-3">Actual Return</th>
                                <th className="py-2 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {group.items.map((row: any) => (
                                <tr key={row.id} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                                    <Link href={`/equipment`} className="text-blue-600 hover:underline">
                                      {row.equipmentName}
                                    </Link>
                                    <span className="text-[10px] text-slate-400 ml-1">({row.assetCode})</span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">{row.category}</td>
                                  <td className="py-2.5 px-3 font-medium text-slate-800">{row.rentalCustomer}</td>
                                  <td className="py-2.5 px-3 text-slate-600">{formatDate(row.rentalStartDate)}</td>
                                  <td className="py-2.5 px-3 text-slate-600">{formatDate(row.rentalExpectedReturnDate)}</td>
                                  <td className="py-2.5 px-3 text-slate-600">{formatDate(row.actualReturnDate)}</td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(
                                        row.status
                                      )}`}
                                    >
                                      {row.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  // Flat Table View
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Equipment</th>
                        <th className="py-3 px-4">Brand</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Start</th>
                        <th className="py-3 px-4">Expected Return</th>
                        <th className="py-3 px-4">Actual Return</th>
                        <th className="py-3 px-4">Condition</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(reportData.rows || []).length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500">
                            No data found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        reportData.rows.map((row: any) => (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              <Link href="/equipment" className="text-blue-600 hover:underline">
                                {row.equipmentName}
                              </Link>
                              <div className="text-[10px] text-slate-400 font-mono">{row.assetCode}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{row.brandName}</td>
                            <td className="py-3 px-4 text-slate-600">{row.category}</td>
                            <td className="py-3 px-4 font-medium text-slate-900">{row.rentalCustomer}</td>
                            <td className="py-3 px-4 text-slate-600">{formatDate(row.rentalStartDate)}</td>
                            <td className="py-3 px-4 text-slate-600">{formatDate(row.rentalExpectedReturnDate)}</td>
                            <td className="py-3 px-4 text-slate-600">{formatDate(row.actualReturnDate)}</td>
                            <td className="py-3 px-4 text-slate-600">
                              <span>{row.returnCondition}</span>
                              {row.damageNotes && (
                                <div className="text-[10px] text-rose-600 font-medium">{row.damageNotes}</div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(
                                  row.status
                                )}`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── Staff Work Drill-Down Modal ─────────────────────────────────────── */}
      {selectedStaffDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                  {selectedStaffDetail.staffName?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedStaffDetail.staffName}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedStaffDetail.role} • {selectedStaffDetail.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Staff Work Summary Cards */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-500">Assigned</p>
                <p className="text-lg font-bold text-slate-900">{selectedStaffDetail.assigned || 0}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-emerald-600">Completed</p>
                <p className="text-lg font-bold text-emerald-700">{selectedStaffDetail.completed || 0}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-blue-600">In Progress</p>
                <p className="text-lg font-bold text-blue-700">{selectedStaffDetail.inProgress || 0}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-500">Pending</p>
                <p className="text-lg font-bold text-slate-700">{selectedStaffDetail.pending || 0}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-rose-600">Overdue</p>
                <p className="text-lg font-bold text-rose-700">{selectedStaffDetail.overdue || 0}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-200">
                <p className="text-[10px] uppercase font-bold text-purple-600">Outputs</p>
                <p className="text-lg font-bold text-purple-700">{selectedStaffDetail.totalOutputs || 0}</p>
              </div>
            </div>

            {/* Detailed Tasks List */}
            <div className="p-4 flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Assigned Tasks Breakdown
              </h4>
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Task</th>
                    <th className="py-2.5 px-3">Brand</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Assigned Date</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-purple-700">Output Asset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!selectedStaffDetail.tasks || selectedStaffDetail.tasks.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500">
                        No individual tasks found for this staff member under current filters.
                      </td>
                    </tr>
                  ) : (
                    selectedStaffDetail.tasks.map((task: any) => (
                      <tr key={task.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <Link href="/tasks" className="text-blue-600 hover:underline">
                            {task.taskName}
                          </Link>
                          <div className="text-[10px] text-slate-400">{task.taskCode}</div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{task.brandName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{task.projectName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatTaskTypeLabel(task.taskType)}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatDate(task.assignedDate)}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {formatDate(task.dueDate)}
                          {task.isOverdue && (
                            <span className="ml-1 text-[10px] text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                              Overdue
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(
                              task.status
                            )}`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {task.primaryOutputUrl ? (
                            <div className="flex flex-col gap-1 items-start">
                              <a
                                href={resolveFileUrl(task.primaryOutputUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-900 rounded-md font-semibold text-[11px] border border-purple-200 transition shadow-xs"
                                title={task.primaryOutputFileName || 'View output'}
                              >
                                <Eye className="w-3.5 h-3.5 text-purple-600" />
                                <span>View Output</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </a>
                              {task.outputCount > 1 && (
                                <span className="text-[10px] text-slate-500 font-medium ml-0.5">
                                  +{task.outputCount - 1} more file{task.outputCount > 2 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No output</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedStaffDetail(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
