'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Camera,
  Plus,
  Wrench,
  ShieldCheck,
  ArrowRightLeft,
  Search,
  SlidersHorizontal,
  RotateCcw,
  X,
  Tag,
  Building2,
  Archive,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  PackageX,
  BadgeCheck,
  CalendarDays,
  Receipt,
} from 'lucide-react';
import { SortSelector } from '@/components/common/TableSortHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { recordRecentAccess } from '@/lib/recent-access';
import { usePagination } from '@/lib/usePagination';
import { sortData, SortField, SortOrder } from '@/utils/sortUtils';

export default function EquipmentPage() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [archivedEquipment, setArchivedEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Pagination Hook
  const { currentPage, setCurrentPage, pageSize, setPageSize, paginate } = usePagination();

  // Sorting State
  const [sortBy, setSortBy] = useState<SortField | string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [maintenanceFilter, setMaintenanceFilter] = useState('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Add Equipment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', category: '', brand: '', model: '', serialNumber: '',
    condition: 'Good', notes: '', purchaseDate: '', purchasePrice: '', purchaseRef: '',
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Retire Modal
  const [retireTargetId, setRetireTargetId] = useState<string | null>(null);
  const [retirementReason, setRetirementReason] = useState('');
  const [submittingRetire, setSubmittingRetire] = useState(false);

  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [reserveTargetEqp, setReserveTargetEqp] = useState<any | null>(null);
  const [reserveForm, setReserveForm] = useState({
    projectId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    expectedCheckoutDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
  });
  const [submittingReserve, setSubmittingReserve] = useState(false);

  const [equipmentRequests, setEquipmentRequests] = useState<any[]>([]);
  const [requestTargetEqp, setRequestTargetEqp] = useState<any | null>(null);
  const [requestForm, setRequestForm] = useState({
    projectId: '',
    purpose: '',
    requiredDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    remarks: '',
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [showRequestsTab, setShowRequestsTab] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [acknowledgeTargetReq, setAcknowledgeTargetReq] = useState<any | null>(null);

  const [inspectionTargetEqp, setInspectionTargetEqp] = useState<any | null>(null);
  const [inspectionForm, setInspectionForm] = useState({
    returnedByName: '',
    condition: 'Good - Operational',
    hasPhysicalDamage: false,
    physicalDamageNotes: '',
    hasMissingAccessories: false,
    missingAccessoriesNotes: '',
    functionalCondition: 'FULLY_FUNCTIONAL',
    cleaningStatus: 'CLEAN',
    remarks: '',
  });
  const [submittingInspection, setSubmittingInspection] = useState(false);

  const [damageReports, setDamageReports] = useState<any[]>([]);
  const [damageReportTargetEqp, setDamageReportTargetEqp] = useState<any | null>(null);
  const [damageForm, setDamageForm] = useState({ description: '', severity: 'HIGH', repairNotes: '' });
  const [submittingDamageReport, setSubmittingDamageReport] = useState(false);
  const [showDamageSection, setShowDamageSection] = useState(false);
  const [updatingRepairId, setUpdatingRepairId] = useState<string | null>(null);
  const [repairStatusForm, setRepairStatusForm] = useState({ repairStatus: 'IN_REPAIR', repairNotes: '' });

  const canManage = user?.role === 'MEDIA_MANAGER' || user?.role === 'TECHNICAL_MANAGER';

  const loadEquipment = async () => {
    try {
      const [active, archived, stats, projList, reqList, dmgList] = await Promise.all([
        fetchApi('/equipment'),
        fetchApi('/equipment/archived'),
        fetchApi('/equipment/dashboard').catch(() => null),
        fetchApi('/projects').catch(() => []),
        fetchApi('/equipment/requests').catch(() => []),
        fetchApi('/equipment/damage-reports').catch(() => []),
      ]);
      setEquipment(Array.isArray(active) ? active : []);
      setArchivedEquipment(Array.isArray(archived) ? archived : []);
      if (stats) setDashboardStats(stats);
      if (Array.isArray(projList)) setProjects(projList);
      if (Array.isArray(reqList)) setEquipmentRequests(reqList);
      if (Array.isArray(dmgList)) setDamageReports(dmgList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEquipment(); }, []);

  const handleUpdateMaintenance = async (id: string, maintenanceStatus: string) => {
    try {
      await fetchApi(`/equipment/${id}/maintenance`, {
        method: 'PATCH',
        body: JSON.stringify({ maintenanceStatus }),
      });
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to update maintenance');
    }
  };

  const handleUpdateStatus = async (id: string, availability: string) => {
    try {
      await fetchApi(`/equipment/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ availability }),
      });
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleReturnEquipment = async (id: string) => {
    try {
      await fetchApi(`/equipment/${id}/movement`, {
        method: 'POST',
        body: JSON.stringify({ action: 'RETURNED', notes: 'Returned to studio bay' }),
      });
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to log equipment return');
    }
  };

  const handleReserveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reserveTargetEqp || !reserveForm.projectId || !reserveForm.startDate || !reserveForm.endDate) {
      alert('Please select a project, start date, and end date.');
      return;
    }
    setSubmittingReserve(true);
    try {
      await fetchApi(`/equipment/${reserveTargetEqp.id}/reserve`, {
        method: 'POST',
        body: JSON.stringify(reserveForm),
      });
      alert(`Equipment "${reserveTargetEqp.name}" successfully reserved!`);
      setReserveTargetEqp(null);
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to reserve equipment');
    } finally {
      setSubmittingReserve(false);
    }
  };

  const handleSubmitEquipmentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTargetEqp || !requestForm.projectId || !requestForm.purpose || !requestForm.requiredDate || !requestForm.expectedReturnDate) {
      alert('Please fill in all required fields (Project, Purpose, Required Date, Expected Return Date).');
      return;
    }
    setSubmittingRequest(true);
    try {
      await fetchApi('/equipment/requests', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: requestTargetEqp.id,
          ...requestForm,
        }),
      });
      alert(`Equipment Request for "${requestTargetEqp.name}" submitted successfully!`);
      setRequestTargetEqp(null);
      setRequestForm({
        projectId: '',
        purpose: '',
        requiredDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        remarks: '',
      });
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to submit equipment request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleReviewRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await fetchApi(`/equipment/requests/${requestId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNotes }),
      });
      setReviewingId(null);
      setReviewNotes('');
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to review equipment request');
    }
  };

  const handleIssueEquipment = async (requestId: string) => {
    try {
      const res = await fetchApi(`/equipment/requests/${requestId}/issue`, {
        method: 'POST',
      });
      alert(`Equipment successfully issued! Issue record created for employee: ${res.issueRecord?.employee?.name || 'Employee'}`);
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to issue equipment');
    }
  };

  const handleAcknowledgeReceipt = async (requestId: string) => {
    try {
      const res = await fetchApi(`/equipment/requests/${requestId}/acknowledge`, {
        method: 'POST',
      });
      alert(`Receipt acknowledged! Digital acknowledgement recorded for ${res.acknowledgement?.employeeName} on ${res.acknowledgement?.date} at ${res.acknowledgement?.time}. (Replaces physical signature)`);
      setAcknowledgeTargetReq(null);
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge equipment receipt');
    }
  };

  const handleReturnInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionTargetEqp || !inspectionForm.condition) {
      alert('Please complete the inspection checklist.');
      return;
    }
    setSubmittingInspection(true);
    try {
      const res = await fetchApi(`/equipment/${inspectionTargetEqp.id}/return-inspection`, {
        method: 'POST',
        body: JSON.stringify({
          returnedByName: inspectionForm.returnedByName || inspectionTargetEqp.currentHolder || 'Employee',
          condition: inspectionForm.condition,
          hasPhysicalDamage: inspectionForm.hasPhysicalDamage,
          physicalDamageNotes: inspectionForm.physicalDamageNotes,
          hasMissingAccessories: inspectionForm.hasMissingAccessories,
          missingAccessoriesNotes: inspectionForm.missingAccessoriesNotes,
          functionalCondition: inspectionForm.functionalCondition,
          cleaningStatus: inspectionForm.cleaningStatus,
          remarks: inspectionForm.remarks,
        }),
      });
      alert(`Return inspection recorded in history! Equipment "${inspectionTargetEqp.name}" inspected and recorded as ${res.returnRecord?.newAvailability || 'AVAILABLE'}.`);
      setInspectionTargetEqp(null);
      setInspectionForm({
        returnedByName: '',
        condition: 'Good - Operational',
        hasPhysicalDamage: false,
        physicalDamageNotes: '',
        hasMissingAccessories: false,
        missingAccessoriesNotes: '',
        functionalCondition: 'FULLY_FUNCTIONAL',
        cleaningStatus: 'CLEAN',
        remarks: '',
      });
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to complete return inspection');
    } finally {
      setSubmittingInspection(false);
    }
  };

  const handleCreateDamageReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!damageReportTargetEqp || !damageForm.description || !damageForm.severity) {
      alert('Description and Severity are required.');
      return;
    }
    setSubmittingDamageReport(true);
    try {
      await fetchApi('/equipment/damage-reports', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: damageReportTargetEqp.id,
          description: damageForm.description,
          severity: damageForm.severity,
          repairNotes: damageForm.repairNotes,
        }),
      });
      alert(`Damage Report created for "${damageReportTargetEqp.name}". Availability set to DAMAGED. Equipment cannot be assigned until repaired.`);
      setDamageReportTargetEqp(null);
      setDamageForm({ description: '', severity: 'HIGH', repairNotes: '' });
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to create damage report');
    } finally {
      setSubmittingDamageReport(false);
    }
  };

  const handleUpdateRepairStatus = async (reportId: string) => {
    try {
      await fetchApi(`/equipment/damage-reports/${reportId}/repair`, {
        method: 'PATCH',
        body: JSON.stringify({ ...repairStatusForm }),
      });
      alert('Repair status updated successfully!');
      setUpdatingRepairId(null);
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to update repair status');
    }
  };

  // Business Rule 1 & 2: Create with company ownership + inventory record
  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.category || !addForm.brand || !addForm.model) {
      alert('Name, Category, Brand and Model are required.');
      return;
    }
    try {
      setSubmittingAdd(true);
      await fetchApi('/equipment', {
        method: 'POST',
        body: JSON.stringify({ ...addForm }),
      });
      setShowAddModal(false);
      setAddForm({ name: '', category: '', brand: '', model: '', serialNumber: '', condition: 'Good', notes: '', purchaseDate: '', purchasePrice: '', purchaseRef: '' });
      await loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to add equipment');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Business Rule 4: Retire (archive) equipment
  const handleRetire = async () => {
    if (!retireTargetId || !retirementReason.trim()) {
      alert('A retirement reason is required.');
      return;
    }
    try {
      setSubmittingRetire(true);
      await fetchApi(`/equipment/${retireTargetId}/retire`, {
        method: 'POST',
        body: JSON.stringify({ retirementReason }),
      });
      setRetireTargetId(null);
      setRetirementReason('');
      await loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to retire equipment');
    } finally {
      setSubmittingRetire(false);
    }
  };

  const categoriesList = Array.from(new Set(equipment.map((e) => e.category).filter(Boolean)));

  const filteredEquipment = equipment.filter((eqp) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !eqp.name?.toLowerCase().includes(q) &&
        !eqp.equipmentId?.toLowerCase().includes(q) &&
        !eqp.brand?.toLowerCase().includes(q) &&
        !eqp.model?.toLowerCase().includes(q) &&
        !eqp.serialNumber?.toLowerCase().includes(q) &&
        !eqp.currentHolder?.toLowerCase().includes(q) &&
        !eqp.category?.toLowerCase().includes(q)
      ) return false;
    }
    if (categoryFilter !== 'ALL' && eqp.category !== categoryFilter) return false;
    if (availabilityFilter !== 'ALL' && eqp.availability !== availabilityFilter) return false;
    if (maintenanceFilter !== 'ALL' && eqp.maintenanceStatus !== maintenanceFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 text-xs">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            {user?.role === 'STAFF' ? 'My Assigned Equipment & Assets' : 'Equipment & Asset Management'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {user?.role === 'STAFF'
              ? 'View and manage equipment assigned to you for active projects and shoot operations.'
              : 'Permanent inventory — all assets are company-owned. Retired equipment is archived, never deleted.'}
          </p>
        </div>

        {/* Business Rule 1: Company ownership badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-bold text-blue-300">Company Assets</span>
          </div>
          {(user?.role === 'TECHNICAL_MANAGER' || user?.role === 'ADMINISTRATOR') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-cyan-600/30"
            >
              <Plus className="w-4 h-4" /> Add Equipment
            </button>
          )}
        </div>
      </div>

      {/* Equipment Dashboard Summary KPI Cards (Visible to Managers) */}
      {user?.role !== 'STAFF' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-card border border-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-gray-400 uppercase font-bold">Total Equipment</span>
          <div className="text-2xl font-bold text-white font-mono">
            {dashboardStats?.total ?? equipment.length}
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-emerald-400 uppercase font-bold">Available</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {dashboardStats?.available ?? equipment.filter((e) => e.availability === 'AVAILABLE').length}
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-purple-400 uppercase font-bold">Reserved</span>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {dashboardStats?.reserved ?? equipment.filter((e) => e.availability === 'RESERVED').length}
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-blue-400 uppercase font-bold">Checked Out</span>
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {dashboardStats?.checkedOut ?? equipment.filter((e) => e.availability === 'CHECKED_OUT' || e.availability === 'IN_USE' || e.availability === 'ISSUED').length}
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-amber-400 uppercase font-bold">Under Maintenance</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {dashboardStats?.underMaintenance ?? equipment.filter((e) => e.availability === 'UNDER_MAINTENANCE' || e.maintenanceStatus !== 'OPERATIONAL').length}
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-orange-400 uppercase font-bold">Damaged</span>
          <div className="text-2xl font-bold text-orange-400 font-mono">
            {dashboardStats?.damaged ?? equipment.filter((e) => e.availability === 'DAMAGED').length}
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-cyan-400 uppercase font-bold">Recently Returned</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {dashboardStats?.recentlyReturned ?? 0}
          </div>
        </div>
      </div>
      )}

      {/* Filter Panel */}
      <div className="bg-card border border-border p-5 rounded-xl space-y-4 text-xs shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Name, Asset ID, Brand, Model, Serial No, Holder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-xl pl-9 pr-8 py-2.5 text-white font-medium focus:outline-none transition-all placeholder:text-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setAvailabilityFilter(availabilityFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                availabilityFilter === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Available Only
            </button>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                showAdvancedFilters ? 'bg-purple-600/20 text-purple-300 border-purple-500/50' : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" /> Advanced Filters
            </button>

            <SortSelector
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(f, o) => {
                setSortBy(f);
                setSortOrder(o);
              }}
            />

            {(searchQuery || categoryFilter !== 'ALL' || availabilityFilter !== 'ALL' || maintenanceFilter !== 'ALL') && (
              <button
                onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); setAvailabilityFilter('ALL'); setMaintenanceFilter('ALL'); }}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-gray-800">
          <span className="text-gray-400 font-bold text-[10px] uppercase mr-1">Category:</span>
          {['ALL', ...categoriesList].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap ${
                categoryFilter === cat ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        {showAdvancedFilters && (
          <div className="pt-3 border-t border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2">
              <div className="font-bold text-cyan-300 text-[11px] uppercase flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Category</div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none text-xs">
                <option value="ALL">All Categories</option>
                {categoriesList.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2">
              <div className="font-bold text-blue-300 text-[11px] uppercase flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Availability</div>
              <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none text-xs">
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="RESERVED">Reserved</option>
                <option value="CHECKED_OUT">Checked Out</option>
                <option value="IN_USE">In Use</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="DAMAGED">Damaged</option>
                <option value="LOST">Lost</option>
                <option value="RETIRED">Retired</option>
              </select>
            </div>
            <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2">
              <div className="font-bold text-amber-300 text-[11px] uppercase flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Maintenance</div>
              <select value={maintenanceFilter} onChange={(e) => setMaintenanceFilter(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none text-xs">
                <option value="ALL">All</option>
                <option value="OPERATIONAL">OPERATIONAL</option>
                <option value="NEEDS_SERVICE">NEEDS SERVICE</option>
                <option value="UNDER_REPAIR">UNDER REPAIR</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Active Equipment Grid */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Equipment Inventory...</div>
      ) : filteredEquipment.length === 0 ? (
        <div className="p-8 text-center bg-card border border-border rounded-xl text-gray-400">
          No active equipment found matching your filters.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginate(sortData(filteredEquipment, sortBy, sortOrder)).map((eqp) => (
            <div
              key={eqp.id}
              onClick={() => {
                recordRecentAccess({
                  entityType: 'EQUIPMENT',
                  entityId: eqp.id,
                  title: eqp.name,
                  code: eqp.equipmentId,
                  url: '/equipment',
                  metadata: { category: eqp.category, availability: eqp.availability },
                });
              }}
              className="bg-card border border-border p-5 rounded-xl space-y-3 shadow-md hover:border-cyan-500/40 transition-all cursor-pointer"
            >

              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded">
                  {eqp.equipmentId}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  eqp.availability === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  eqp.availability === 'RESERVED' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                  eqp.availability === 'CHECKED_OUT' || eqp.availability === 'ISSUED' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  eqp.availability === 'IN_USE' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                  eqp.availability === 'UNDER_MAINTENANCE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  eqp.availability === 'DAMAGED' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                  eqp.availability === 'LOST' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                  'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                }`}>
                  {eqp.availability?.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{eqp.name}</h3>
                <p className="text-xs text-gray-400">{eqp.brand} {eqp.model} • SN: {eqp.serialNumber}</p>
              </div>

              {/* Business Rule 1: Company ownership tag */}
              <div className="flex items-center gap-1 text-[10px] text-blue-400">
                <Building2 className="w-3 h-3" />
                <span className="font-semibold">Owned by: {eqp.ownedBy || 'COMPANY'}</span>
              </div>

              {/* Business Rule 2: Inventory record fields */}
              {(eqp.purchaseDate || eqp.purchasePrice || eqp.purchaseRef) && (
                <div className="p-2 bg-zinc-900/60 border border-zinc-800 rounded space-y-0.5">
                  {eqp.purchaseDate && (
                    <p className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <CalendarDays className="w-3 h-3" /> Acquired: {new Date(eqp.purchaseDate).toLocaleDateString()}
                    </p>
                  )}
                  {eqp.purchasePrice && (
                    <p className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <Receipt className="w-3 h-3" /> Value: PKR {Number(eqp.purchasePrice).toLocaleString()}
                    </p>
                  )}
                  {eqp.purchaseRef && (
                    <p className="text-[10px] text-zinc-400">Ref: {eqp.purchaseRef}</p>
                  )}
                </div>
              )}

              {eqp.currentHolder && (
                <div className="p-2 bg-gray-900 border border-gray-800 rounded text-xs text-gray-300 flex items-center justify-between">
                  <span>Holder: <strong className="text-white">{eqp.currentHolder}</strong></span>
                  <button onClick={() => handleReturnEquipment(eqp.id)} className="text-[10px] px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">
                    Return
                  </button>
                </div>
              )}

              {canManage && (
                <div className="pt-2 border-t border-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status:</span>
                    <select
                      value={eqp.availability}
                      onChange={(e) => handleUpdateStatus(eqp.id, e.target.value)}
                      className="bg-gray-900 border border-gray-700 text-gray-200 px-2 py-1 rounded text-[11px]"
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="RESERVED">RESERVED</option>
                      <option value="CHECKED_OUT">CHECKED OUT</option>
                      <option value="IN_USE">IN USE</option>
                      <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
                      <option value="DAMAGED">DAMAGED</option>
                      <option value="LOST">LOST</option>
                      <option value="RETIRED">RETIRED</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Maintenance:</span>
                    <select
                      value={eqp.maintenanceStatus}
                      onChange={(e) => handleUpdateMaintenance(eqp.id, e.target.value)}
                      className="bg-gray-900 border border-gray-700 text-gray-200 px-2 py-1 rounded text-[11px]"
                    >
                      <option value="OPERATIONAL">OPERATIONAL</option>
                      <option value="NEEDS_SERVICE">NEEDS SERVICE</option>
                      <option value="UNDER_REPAIR">UNDER REPAIR</option>
                    </select>
                  </div>

                  {user?.role === 'MEDIA_MANAGER' && eqp.availability === 'AVAILABLE' && (
                    <button
                      onClick={() => {
                        setReserveTargetEqp(eqp);
                        setReserveForm({
                          projectId: projects[0]?.id || '',
                          startDate: new Date().toISOString().split('T')[0],
                          endDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
                          expectedCheckoutDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
                        });
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 rounded-lg text-[11px] font-semibold transition-colors"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-purple-400" /> Reserve for Project
                    </button>
                  )}

                  {/* Report Damage Action */}
                  <button
                    onClick={() => {
                      setDamageReportTargetEqp(eqp);
                      setDamageForm({ description: '', severity: 'HIGH', repairNotes: '' });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> File Damage Report
                  </button>

                  {/* Business Rule 4: Retire action replaces delete — Media Manager authority */}
                  {(user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') && (
                    <button
                      onClick={() => setRetireTargetId(eqp.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-700/50 text-zinc-400 hover:text-red-300 rounded-lg text-[11px] font-semibold transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" /> Retire &amp; Archive
                    </button>
                  )}
                </div>
              )}
              {/* For Staff (Employees): Submit Equipment Request instead of direct checkout */}
              {user?.role === 'STAFF' && eqp.availability === 'AVAILABLE' && (
                <div className="pt-2 border-t border-gray-800">
                  <button
                    onClick={() => {
                      setRequestTargetEqp(eqp);
                      setRequestForm({
                        projectId: projects[0]?.id || '',
                        purpose: '',
                        requiredDate: new Date().toISOString().split('T')[0],
                        expectedReturnDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
                        remarks: '',
                      });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition-colors shadow-md shadow-blue-600/30"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Submit Equipment Request
                  </button>
                </div>
              )}

              {/* Return Inspection Button for Checked Out equipment */}
              {(eqp.availability === 'CHECKED_OUT' || eqp.availability === 'IN_USE' || eqp.availability === 'ISSUED') && (
                <div className="pt-2 border-t border-gray-800">
                  <button
                    onClick={() => {
                      setInspectionTargetEqp(eqp);
                      setInspectionForm({
                        returnedByName: eqp.currentHolder || '',
                        condition: eqp.condition || 'Good - Operational',
                        hasPhysicalDamage: false,
                        physicalDamageNotes: '',
                        hasMissingAccessories: false,
                        missingAccessoriesNotes: '',
                        functionalCondition: 'FULLY_FUNCTIONAL',
                        cleaningStatus: 'CLEAN',
                        remarks: '',
                      });
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-colors shadow-md shadow-emerald-600/30"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Inspect &amp; Return Equipment
                  </button>
                </div>
              )}

              {/* Damaged equipment warning banner (Assignment restriction) */}
              {eqp.availability === 'DAMAGED' && (
                <div className="pt-2 border-t border-red-900/50">
                  <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-[11px] text-red-300 space-y-1">
                    <div className="font-bold text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Damaged Equipment
                    </div>
                    <p className="text-[10px] text-red-300/80 leading-relaxed">
                      Shall not be assigned until repaired. Update Repair Status in Damage Reports queue to re-enable assignment.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>

          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredEquipment.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Equipment Requests Queue Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-md">
        <button
          onClick={() => setShowRequestsTab(!showRequestsTab)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-white text-sm">
              {canManage ? 'Equipment Requests Queue (Manager Approval)' : 'My Equipment Requests'}
            </span>
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-[10px] font-bold">
              {equipmentRequests.length} total ({equipmentRequests.filter((r) => r.status === 'PENDING').length} pending)
            </span>
          </div>
          {showRequestsTab ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showRequestsTab && (
          <div className="px-5 pb-5 border-t border-border space-y-4 pt-4">
            {equipmentRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-6 italic">No equipment requests found.</p>
            ) : (
              <div className="space-y-3">
                {equipmentRequests.map((req) => (
                  <div key={req.id} className="p-4 bg-gray-900/80 border border-gray-800 rounded-xl space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-800 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{req.equipment?.name}</span>
                          <span className="text-xs text-cyan-400 font-mono">({req.equipment?.equipmentId})</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Project: <strong className="text-gray-200">{req.project?.name}</strong> • Requested By: <strong className="text-blue-300">{req.requestedBy?.name}</strong> ({req.requestedBy?.role})
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border self-start md:self-auto ${
                        req.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        req.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        req.status === 'CHECKED_OUT' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-300 pt-1">
                      <div><strong className="text-gray-500">Purpose:</strong> {req.purpose}</div>
                      <div><strong className="text-gray-500">Required Date:</strong> {new Date(req.requiredDate).toLocaleDateString()}</div>
                      <div><strong className="text-gray-500">Expected Return:</strong> {new Date(req.expectedReturnDate).toLocaleDateString()}</div>
                    </div>

                    {req.remarks && (
                      <p className="text-xs text-gray-400 bg-gray-950 p-2 rounded border border-gray-800">
                        <strong>Remarks:</strong> {req.remarks}
                      </p>
                    )}

                    {user?.role === 'MEDIA_MANAGER' && req.status === 'PENDING' && (
                      <div className="pt-2 border-t border-gray-800 space-y-2">
                        {reviewingId === req.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Review notes / approval remarks..."
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => setReviewingId(null)} className="px-3 py-1 bg-gray-800 text-gray-300 text-xs rounded font-semibold">Cancel</button>
                              <button onClick={() => handleReviewRequest(req.id, 'REJECTED')} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded font-bold">Reject</button>
                              <button onClick={() => handleReviewRequest(req.id, 'APPROVED')} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-bold">Approve Request</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <button onClick={() => setReviewingId(req.id)} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors">
                              Review &amp; Approve Request
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Media Manager Issue Action after Approval */}
                    {user?.role === 'MEDIA_MANAGER' && req.status === 'APPROVED' && (
                      <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <BadgeCheck className="w-3.5 h-3.5" /> Approved by {req.reviewedBy?.name || 'Media Manager'}
                        </span>
                        <button
                          onClick={() => handleIssueEquipment(req.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Issue Equipment to Employee
                        </button>
                      </div>
                    )}

                    {/* Official Issue Record details when CHECKED_OUT */}
                    {req.status === 'CHECKED_OUT' && (
                      <div className="space-y-2 pt-2 border-t border-gray-800">
                        <div className="text-[11px] bg-blue-950/30 p-2.5 rounded-lg border border-blue-800/40 space-y-1">
                          <div className="flex items-center justify-between text-blue-300 font-bold">
                            <span className="flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5 text-blue-400" /> Equipment Issue Record</span>
                            <span className="text-gray-400 font-mono text-[10px]">{new Date(req.updatedAt).toLocaleDateString()} {new Date(req.updatedAt).toLocaleTimeString()}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-300">
                            <div><strong className="text-gray-400">Issued To:</strong> {req.requestedBy?.name}</div>
                            <div><strong className="text-gray-400">Project:</strong> {req.project?.name}</div>
                            <div><strong className="text-gray-400">Approved By:</strong> {req.reviewedBy?.name || 'Media Manager'}</div>
                            <div><strong className="text-gray-400">Expected Return:</strong> {new Date(req.expectedReturnDate).toLocaleDateString()}</div>
                          </div>
                        </div>

                        {/* Digital Receipt Acknowledgement Section */}
                        {req.isAcknowledged ? (
                          <div className="text-[11px] bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-800/40 space-y-1">
                            <div className="flex items-center justify-between text-emerald-300 font-bold">
                              <span className="flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5 text-emerald-400" /> Digital Receipt Acknowledged (Replaces Physical Signature)</span>
                              <span className="text-emerald-400 font-mono text-[10px]">{req.acknowledgedAt ? `${new Date(req.acknowledgedAt).toLocaleDateString()} ${new Date(req.acknowledgedAt).toLocaleTimeString()}` : ''}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-gray-300 pt-0.5">
                              <div><strong className="text-gray-400">Employee Name:</strong> {req.acknowledgedByName}</div>
                              <div><strong className="text-gray-400">Date:</strong> {req.acknowledgedAt ? new Date(req.acknowledgedAt).toLocaleDateString() : ''}</div>
                              <div><strong className="text-gray-400">Time:</strong> {req.acknowledgedAt ? new Date(req.acknowledgedAt).toLocaleTimeString() : ''}</div>
                            </div>
                            <p className="text-[10px] text-emerald-400/80 italic pt-1 border-t border-emerald-900/40">
                              "{req.acknowledgementStatement}"
                            </p>
                          </div>
                        ) : (
                          <div className="bg-amber-950/20 border border-amber-800/40 p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-amber-300 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Pending Receipt Acknowledgement
                              </p>
                              <p className="text-[10px] text-gray-400">Employee must acknowledge receipt before leaving the office (replaces physical signature).</p>
                            </div>
                            {(user?.id === req.requestedById || user?.role === 'STAFF') && (
                              <button
                                onClick={() => setAcknowledgeTargetReq(req)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors shrink-0 shadow-md shadow-amber-600/30"
                              >
                                Acknowledge Receipt
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Damage Reports & Repair Tracking Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-md">
        <button
          onClick={() => setShowDamageSection(!showDamageSection)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="font-bold text-white text-sm">
              Equipment Damage Reports &amp; Repair Tracking
            </span>
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {damageReports.filter((r) => r.repairStatus !== 'REPAIRED').length} Active Unrepaired
            </span>
          </div>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showDamageSection ? 'rotate-90' : ''}`} />
        </button>

        {showDamageSection && (
          <div className="p-5 border-t border-border space-y-4">
            <p className="text-xs text-gray-400">
              * Note: Damaged equipment receives a formal Damage Report including Equipment, Reported By, Date, Description, Severity, and Repair Status. Damaged equipment cannot be assigned until repaired.
            </p>

            {damageReports.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs italic bg-zinc-950/50 rounded-xl border border-zinc-800">
                No equipment damage reports recorded.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {damageReports.map((report) => (
                  <div key={report.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 shadow-md">
                    <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-2">
                      <div>
                        <h4 className="font-bold text-white text-xs">{report.equipment?.name}</h4>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          Asset ID: {report.equipment?.equipmentId} • Serial: {report.equipment?.serialNumber || 'N/A'}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          report.severity === 'CRITICAL'
                            ? 'bg-red-600 text-white shadow-sm shadow-red-600/50'
                            : report.severity === 'HIGH'
                            ? 'bg-orange-500 text-white'
                            : report.severity === 'MEDIUM'
                            ? 'bg-amber-500 text-black'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        Severity: {report.severity}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <p className="text-zinc-300 font-medium">
                        <strong className="text-zinc-400">Description:</strong> {report.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1">
                        <div>Reported By: <strong className="text-zinc-200">{report.reportedBy?.name || 'Manager'}</strong></div>
                        <div>Date: <strong className="text-zinc-200 font-mono">{new Date(report.date).toLocaleDateString()}</strong></div>
                      </div>
                      {report.repairNotes && (
                        <p className="text-[11px] text-zinc-400 italic bg-zinc-900 p-2 rounded border border-zinc-800">
                          Repair Notes: {report.repairNotes}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold">Repair Status:</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            report.repairStatus === 'REPAIRED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : report.repairStatus === 'IN_REPAIR'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                              : 'bg-red-500/20 text-red-400 border border-red-500/40'
                          }`}
                        >
                          {report.repairStatus}
                        </span>
                      </div>

                      {canManage && report.repairStatus !== 'REPAIRED' && (
                        <button
                          onClick={() => {
                            setUpdatingRepairId(report.id);
                            setRepairStatusForm({ repairStatus: 'REPAIRED', repairNotes: '' });
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm shadow-emerald-600/30"
                        >
                          Update Repair Status
                        </button>
                      )}
                    </div>

                    {/* Inline Repair Update Form */}
                    {updatingRepairId === report.id && (
                      <div className="pt-3 border-t border-zinc-800 space-y-2 bg-zinc-900 p-3 rounded-lg">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase block">New Repair Status</label>
                        <select
                          value={repairStatusForm.repairStatus}
                          onChange={(e) => setRepairStatusForm({ ...repairStatusForm, repairStatus: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-white text-xs"
                        >
                          <option value="IN_REPAIR">IN_REPAIR — Currently under repair</option>
                          <option value="REPAIRED">REPAIRED — Fixed &amp; ready for assignment</option>
                          <option value="UNREPAIRABLE">UNREPAIRABLE — Beyond repair</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Optional repair resolution notes..."
                          value={repairStatusForm.repairNotes}
                          onChange={(e) => setRepairStatusForm({ ...repairStatusForm, repairNotes: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-white text-xs"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button onClick={() => setUpdatingRepairId(null)} className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-[10px]">Cancel</button>
                          <button onClick={() => handleUpdateRepairStatus(report.id)} className="px-3 py-1 bg-emerald-600 text-white font-bold rounded text-[10px]">Save Status</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Business Rule 4: Archived / Retired Inventory Section */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <PackageX className="w-4 h-4 text-zinc-400" />
            <span className="font-bold text-zinc-300 text-sm">Archived / Retired Inventory</span>
            <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-[10px] text-zinc-400 font-bold">
              {archivedEquipment.length} records
            </span>
            <span className="text-[10px] text-zinc-500">— permanent history, never deleted</span>
          </div>
          {showArchived ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </button>

        {showArchived && (
          <div className="px-5 pb-5 border-t border-zinc-800">
            {archivedEquipment.length === 0 ? (
              <p className="text-zinc-500 text-center py-6 italic">No retired equipment on record.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {archivedEquipment.map((eqp) => (
                  <div key={eqp.id} className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl space-y-2 opacity-80">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-zinc-500 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded">
                        {eqp.equipmentId}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-400 border border-zinc-700 uppercase">
                        ARCHIVED
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-300">{eqp.name}</h3>
                      <p className="text-[11px] text-zinc-500">{eqp.brand} {eqp.model} • SN: {eqp.serialNumber}</p>
                    </div>
                    {eqp.retirementReason && (
                      <p className="text-[11px] text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> {eqp.retirementReason}
                      </p>
                    )}
                    {eqp.archivedAt && (
                      <p className="text-[10px] text-zinc-500">Retired: {new Date(eqp.archivedAt).toLocaleDateString()}</p>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                      <Building2 className="w-3 h-3" /> Owned by: {eqp.ownedBy || 'COMPANY'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> Register Company Equipment
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddEquipment} className="p-5 space-y-4">

              {/* Business Rule 1: Company ownership — always visible, not editable */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-[11px] text-blue-300 font-semibold">
                  All equipment registered here is permanent company property (ownedBy: COMPANY). Personal assets cannot be added to this system.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Equipment Name *</label>
                  <input required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500" placeholder="e.g. Sony FX3 Cinema Camera" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Category *</label>
                  <input required value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500" placeholder="e.g. Camera, Lens, Lighting, Drone" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Brand *</label>
                  <input required value={addForm.brand} onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500" placeholder="e.g. Sony" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Model *</label>
                  <input required value={addForm.model} onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500" placeholder="e.g. FX3" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Serial Number</label>
                  <input value={addForm.serialNumber} onChange={(e) => setAddForm({ ...addForm, serialNumber: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500" placeholder="Auto-generated if blank" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Condition</label>
                  <select value={addForm.condition} onChange={(e) => setAddForm({ ...addForm, condition: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500">
                    <option>Good</option><option>Fair</option><option>Excellent</option><option>Needs Repair</option>
                  </select>
                </div>
              </div>

              {/* Business Rule 2: Permanent inventory record fields */}
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-[11px] text-zinc-400 font-bold uppercase mb-3 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-zinc-500" /> Inventory Record (Acquisition Details)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Purchase Date</label>
                    <input type="date" value={addForm.purchaseDate} onChange={(e) => setAddForm({ ...addForm, purchaseDate: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Purchase Price (PKR)</label>
                    <input type="number" value={addForm.purchasePrice} onChange={(e) => setAddForm({ ...addForm, purchasePrice: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500" placeholder="e.g. 450000" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">PO / Invoice Ref</label>
                    <input value={addForm.purchaseRef} onChange={(e) => setAddForm({ ...addForm, purchaseRef: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500" placeholder="e.g. PO-2024-0042" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Notes</label>
                <textarea value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} rows={2}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 resize-none" placeholder="Optional notes..." />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-700 transition-colors">Cancel</button>
                <button type="submit" disabled={submittingAdd} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                  {submittingAdd ? 'Registering...' : 'Register Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Retire Modal — Business Rule 4 */}
      {retireTargetId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-red-900/50 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-red-400" /> Retire &amp; Archive Equipment
              </h2>
              <button onClick={() => { setRetireTargetId(null); setRetirementReason(''); }} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300">
                  This equipment will be permanently archived. Its inventory record and movement history will be retained as part of the permanent audit trail. This action cannot be undone.
                </p>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Retirement Reason *</label>
                <textarea
                  value={retirementReason}
                  onChange={(e) => setRetirementReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. End of service life, irreparable damage, replaced by newer model..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setRetireTargetId(null); setRetirementReason(''); }} className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-700">Cancel</button>
                <button onClick={handleRetire} disabled={submittingRetire || !retirementReason.trim()} className="px-5 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                  {submittingRetire ? 'Archiving...' : 'Confirm Retirement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reserve Equipment Modal */}
      {reserveTargetEqp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-purple-500/40 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-purple-400" /> Reserve Equipment
              </h2>
              <button onClick={() => setReserveTargetEqp(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleReserveEquipment} className="p-5 space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-1">
                <p className="text-xs font-bold text-purple-300">{reserveTargetEqp.name}</p>
                <p className="text-[10px] text-zinc-400">{reserveTargetEqp.brand} {reserveTargetEqp.model} • SN: {reserveTargetEqp.serialNumber}</p>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Project *</label>
                <select
                  required
                  value={reserveForm.projectId}
                  onChange={(e) => setReserveForm({ ...reserveForm, projectId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Shoot Project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.projectId})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Reserved Date (Start) *</label>
                  <input
                    type="date"
                    required
                    value={reserveForm.startDate}
                    onChange={(e) => setReserveForm({ ...reserveForm, startDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Reserved Date (End) *</label>
                  <input
                    type="date"
                    required
                    value={reserveForm.endDate}
                    onChange={(e) => setReserveForm({ ...reserveForm, endDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Expected Checkout Date *</label>
                <input
                  type="date"
                  required
                  value={reserveForm.expectedCheckoutDate}
                  onChange={(e) => setReserveForm({ ...reserveForm, expectedCheckoutDate: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="text-[11px] text-zinc-400 bg-zinc-950 p-2.5 rounded border border-zinc-800 flex items-center justify-between">
                <span>Reserved By:</span>
                <strong className="text-white font-semibold">{user?.name || 'Media Manager'}</strong>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setReserveTargetEqp(null)} className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-700">Cancel</button>
                <button type="submit" disabled={submittingReserve} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                  {submittingReserve ? 'Reserving...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Equipment Request Modal (For Employees / Staff) */}
      {requestTargetEqp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-blue-500/40 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-400" /> Submit Equipment Request
              </h2>
              <button onClick={() => setRequestTargetEqp(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitEquipmentRequest} className="p-5 space-y-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-1">
                <p className="text-xs font-bold text-blue-300">{requestTargetEqp.name}</p>
                <p className="text-[10px] text-zinc-400">{requestTargetEqp.brand} {requestTargetEqp.model} • SN: {requestTargetEqp.serialNumber}</p>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Project *</label>
                <select
                  required
                  value={requestForm.projectId}
                  onChange={(e) => setRequestForm({ ...requestForm, projectId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select Shoot Project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.projectId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Purpose *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outdoor Shoot B-Roll Recording, Product Photography..."
                  value={requestForm.purpose}
                  onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Required Date *</label>
                  <input
                    type="date"
                    required
                    value={requestForm.requiredDate}
                    onChange={(e) => setRequestForm({ ...requestForm, requiredDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Expected Return Date *</label>
                  <input
                    type="date"
                    required
                    value={requestForm.expectedReturnDate}
                    onChange={(e) => setRequestForm({ ...requestForm, expectedReturnDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Optional additional details or notes..."
                  value={requestForm.remarks}
                  onChange={(e) => setRequestForm({ ...requestForm, remarks: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="text-[11px] text-zinc-400 bg-zinc-950 p-2.5 rounded border border-zinc-800 flex items-center justify-between">
                <span>Requested By:</span>
                <strong className="text-white font-semibold">{user?.name || 'Employee'}</strong>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setRequestTargetEqp(null)} className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-700">Cancel</button>
                <button type="submit" disabled={submittingRequest} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                  {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Receipt Acknowledgement Modal */}
      {acknowledgeTargetReq && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-amber-400" /> Acknowledge Equipment Receipt
              </h2>
              <button onClick={() => setAcknowledgeTargetReq(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1">
                <p className="text-xs font-bold text-amber-300">{acknowledgeTargetReq.equipment?.name}</p>
                <p className="text-[10px] text-zinc-400">
                  Project: <strong className="text-zinc-200">{acknowledgeTargetReq.project?.name}</strong> • Expected Return: {new Date(acknowledgeTargetReq.expectedReturnDate).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                  I, <strong className="text-white">{user?.name || acknowledgeTargetReq.requestedBy?.name}</strong>, hereby acknowledge that I have received the specified equipment in good working order before leaving the office.
                </p>
                <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-mono">
                  <div>Date: <strong className="text-white">{new Date().toLocaleDateString()}</strong></div>
                  <div>Time: <strong className="text-white">{new Date().toLocaleTimeString()}</strong></div>
                </div>
                <p className="text-[10px] text-amber-400/90 italic pt-1">
                  * Note: Submitting this digital acknowledgement legally replaces a physical signature for equipment handover.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAcknowledgeTargetReq(null)} className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-700">Cancel</button>
                <button
                  type="button"
                  onClick={() => handleAcknowledgeReceipt(acknowledgeTargetReq.id)}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-amber-600/30"
                >
                  Confirm Digital Acknowledgement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inspect & Return Equipment Modal */}
      {inspectionTargetEqp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-400" /> Equipment Return Inspection
              </h2>
              <button onClick={() => setInspectionTargetEqp(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleReturnInspection} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-1">
                <p className="text-xs font-bold text-emerald-300">{inspectionTargetEqp.name}</p>
                <p className="text-[10px] text-zinc-400">
                  Asset ID: <strong className="text-zinc-200">{inspectionTargetEqp.equipmentId}</strong> • Current Holder: <strong className="text-zinc-200">{inspectionTargetEqp.currentHolder || 'Employee'}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-zinc-300 bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono">
                <div>Return Date: <strong className="text-white block">{new Date().toLocaleDateString()}</strong></div>
                <div>Return Time: <strong className="text-white block">{new Date().toLocaleTimeString()}</strong></div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Returned By *</label>
                <input
                  type="text"
                  required
                  placeholder="Employee name returning equipment..."
                  value={inspectionForm.returnedByName}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, returnedByName: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 4-Point Mandatory Inspection Checklist */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Mandatory Inspection Checklist (Recorded in History)</p>

                {/* 1. Physical Damage Inspection */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> 1. Physical Damage Inspection *
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={inspectionForm.hasPhysicalDamage}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, hasPhysicalDamage: e.target.checked })}
                        className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                      />
                      <span className={inspectionForm.hasPhysicalDamage ? 'text-amber-400 font-bold' : 'text-zinc-400'}>Damage Observed</span>
                    </label>
                  </div>
                  {inspectionForm.hasPhysicalDamage && (
                    <input
                      type="text"
                      placeholder="Describe physical damage observed (cracks, dents, scratches)..."
                      value={inspectionForm.physicalDamageNotes}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, physicalDamageNotes: e.target.value })}
                      className="w-full bg-zinc-900 border border-amber-500/50 rounded-lg px-3 py-1.5 text-white text-xs"
                    />
                  )}
                </div>

                {/* 2. Missing Accessories Inspection */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-400" /> 2. Missing Accessories Inspection *
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={inspectionForm.hasMissingAccessories}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, hasMissingAccessories: e.target.checked })}
                        className="rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                      />
                      <span className={inspectionForm.hasMissingAccessories ? 'text-blue-400 font-bold' : 'text-zinc-400'}>Accessories Missing</span>
                    </label>
                  </div>
                  {inspectionForm.hasMissingAccessories && (
                    <input
                      type="text"
                      placeholder="List missing cables, caps, batteries, memory cards, chargers..."
                      value={inspectionForm.missingAccessoriesNotes}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, missingAccessoriesNotes: e.target.value })}
                      className="w-full bg-zinc-900 border border-blue-500/50 rounded-lg px-3 py-1.5 text-white text-xs"
                    />
                  )}
                </div>

                {/* 3. Functional Condition Inspection */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-cyan-400" /> 3. Functional Condition *
                  </span>
                  <select
                    value={inspectionForm.functionalCondition}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, functionalCondition: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="FULLY_FUNCTIONAL">Fully Functional — All features tested &amp; working</option>
                    <option value="PARTIALLY_FUNCTIONAL">Partially Functional — Minor issue / glitch</option>
                    <option value="NON_FUNCTIONAL">Non-Functional — Malfunctioning / Defective</option>
                  </select>
                </div>

                {/* 4. Cleaning Status Inspection */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 4. Cleaning Status *
                  </span>
                  <select
                    value={inspectionForm.cleaningStatus}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, cleaningStatus: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CLEAN">Clean &amp; Sanitized — Ready for next issue</option>
                    <option value="NEEDS_CLEANING">Needs Standard Cleaning / Dusting</option>
                    <option value="REQUIRES_DEEP_CLEAN">Requires Deep Cleaning / Lens Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Inspected Overall Condition *</label>
                <select
                  required
                  value={inspectionForm.condition}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, condition: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="Good - Operational">Good - Operational</option>
                  <option value="Fair - Normal Wear">Fair - Normal Wear</option>
                  <option value="Needs Service / Maintenance">Needs Service / Maintenance</option>
                  <option value="Damaged - Requires Repair">Damaged - Requires Repair</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Inspection Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Detailed inspection observations, remarks, lens cleanliness, battery levels..."
                  value={inspectionForm.remarks}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, remarks: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setInspectionTargetEqp(null)} className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-700">Cancel</button>
                <button
                  type="submit"
                  disabled={submittingInspection}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  {submittingInspection ? 'Completing Inspection...' : 'Confirm Return & Save Inspection History'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Damage Report Modal */}
      {damageReportTargetEqp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-red-500/40 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" /> Create Equipment Damage Report
              </h2>
              <button onClick={() => setDamageReportTargetEqp(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateDamageReport} className="p-5 space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg space-y-1">
                <p className="text-xs font-bold text-red-300">{damageReportTargetEqp.name}</p>
                <p className="text-[10px] text-zinc-400">
                  Asset ID: <strong className="text-zinc-200">{damageReportTargetEqp.equipmentId}</strong> • Serial: <strong className="text-zinc-200">{damageReportTargetEqp.serialNumber || 'N/A'}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-zinc-300 bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono">
                <div>Report Date: <strong className="text-white block">{new Date().toLocaleDateString()}</strong></div>
                <div>Reported By: <strong className="text-white block">{user?.name || 'Manager'}</strong></div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Damage Severity *</label>
                <select
                  required
                  value={damageForm.severity}
                  onChange={(e) => setDamageForm({ ...damageForm, severity: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500"
                >
                  <option value="CRITICAL">CRITICAL — Severe damage / Non-functional</option>
                  <option value="HIGH">HIGH — Major component damaged</option>
                  <option value="MEDIUM">MEDIUM — Moderate wear / Minor fracture</option>
                  <option value="LOW">LOW — Minor superficial damage</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Damage Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed description of equipment damage observed..."
                  value={damageForm.description}
                  onChange={(e) => setDamageForm({ ...damageForm, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold uppercase mb-1 block">Initial Repair / Service Notes</label>
                <input
                  type="text"
                  placeholder="Optional repair steps or technician recommendation..."
                  value={damageForm.repairNotes}
                  onChange={(e) => setDamageForm({ ...damageForm, repairNotes: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-[10px] text-red-300 italic">
                * Note: Submitting this Damage Report will set equipment status to DAMAGED. Damaged equipment cannot be assigned until repaired.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDamageReportTargetEqp(null)} className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-700">Cancel</button>
                <button
                  type="submit"
                  disabled={submittingDamageReport}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-red-600/30 disabled:opacity-50"
                >
                  {submittingDamageReport ? 'Filing Report...' : 'File Damage Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
