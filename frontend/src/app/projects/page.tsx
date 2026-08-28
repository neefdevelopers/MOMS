'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import {
  Film,
  Plus,
  MapPin,
  Calendar,
  CloudRain,
  Truck,
  ShieldAlert,
  ArrowRight,
  Users,
  Check,
  Camera,
  X,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Search,
  Building2,
  Clock,
  User,
} from 'lucide-react';
import { SortSelector } from '@/components/common/TableSortHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { usePagination } from '@/lib/usePagination';
import { sortData, SortField, SortOrder } from '@/utils/sortUtils';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination Hook
  const { currentPage, setCurrentPage, pageSize, setPageSize, paginate } = usePagination();

  // Sorting State
  const [sortBy, setSortBy] = useState<SortField | string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filters (11 Parameters)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMediaManager, setSelectedMediaManager] = useState('');
  const [selectedTechManager, setSelectedTechManager] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [shootType, setShootType] = useState<'INDOOR' | 'OUTDOOR'>('INDOOR');
  const [projectName, setProjectName] = useState('');
  const [customProjectId, setCustomProjectId] = useState('');
  const [clientId, setClientId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [productId, setProductId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [calendarEventId, setCalendarEventId] = useState('');
  const [shootDate, setShootDate] = useState(new Date().toISOString().split('T')[0]);
  const [locationCategory, setLocationCategory] = useState('Studio Bay');
  const [locationAddressInput, setLocationAddressInput] = useState('');
  const [locationContactPerson, setLocationContactPerson] = useState('');
  const [reportingTime, setReportingTime] = useState('09:00 AM');
  const [expectedWrapUpTime, setExpectedWrapUpTime] = useState('06:00 PM');
  const [influencerTalent, setInfluencerTalent] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('PLANNED');
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedTeamUserIds, setSelectedTeamUserIds] = useState<string[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);

  // Indoor specific form fields
  const [studioName, setStudioName] = useState('Studio 4 - Product Bay');
  const [studioAddress, setStudioAddress] = useState('Media Ops HQ Floor 2');

  // Outdoor specific form fields
  const [outdoorLocation, setOutdoorLocation] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('PENDING');
  const [weatherStatus, setWeatherStatus] = useState('RISK_RAIN');
  const [transportationReq, setTransportationReq] = useState(true);
  const [driver, setDriver] = useState('');
  const [logisticsCoordinator, setLogisticsCoordinator] = useState('');
  const [travelNotes, setTravelNotes] = useState('');
  const [droneRequirement, setDroneRequirement] = useState(false);

  const loadReferenceData = async () => {
    try {
      const [resClients, resBrands, resProducts, resUsers, resEqp] = await Promise.all([
        fetchApi('/clients'),
        fetchApi('/brands'),
        fetchApi('/products'),
        fetchApi('/users'),
        fetchApi('/equipment'),
      ]);
      setClients(Array.isArray(resClients) ? resClients : []);
      setBrands(Array.isArray(resBrands) ? resBrands : []);
      setProducts(Array.isArray(resProducts) ? resProducts : []);
      setUsersList(Array.isArray(resUsers) ? resUsers : []);
      setEquipmentList(Array.isArray(resEqp) ? resEqp : []);
    } catch (err) {
      console.error('Failed to load reference metadata:', err);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      let query = '?';
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (selectedClient) query += `clientId=${selectedClient}&`;
      if (selectedBrand) query += `brandId=${selectedBrand}&`;
      if (selectedProduct) query += `productId=${selectedProduct}&`;
      if (selectedType) query += `shootType=${selectedType}&`;
      if (selectedStatus) query += `status=${selectedStatus}&`;
      if (selectedPriority) query += `priority=${selectedPriority}&`;
      if (selectedDate) query += `date=${selectedDate}&`;
      if (selectedMediaManager) query += `mediaManagerId=${selectedMediaManager}&`;
      if (selectedTechManager) query += `technicalManagerId=${selectedTechManager}&`;
      if (selectedEmployee) query += `assignedUserId=${selectedEmployee}&`;
      if (selectedLocation) query += `location=${encodeURIComponent(selectedLocation)}&`;

      const resProjects = await fetchApi(`/projects${query}`);
      setProjects(Array.isArray(resProjects) ? resProjects : []);
    } catch (err) {
      console.error('Failed to load project list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadProjects();
  }, [
    search,
    selectedClient,
    selectedBrand,
    selectedProduct,
    selectedType,
    selectedStatus,
    selectedPriority,
    selectedDate,
    selectedMediaManager,
    selectedTechManager,
    selectedEmployee,
    selectedLocation,
  ]);

  const activeClients = (clients || []).filter((c) => c?.status === 'ACTIVE');
  const activeBrands = (brands || []).filter(
    (b) => b?.status === 'ACTIVE' && (!clientId || b.clientId === clientId)
  );
  const activeProducts = (products || []).filter(
    (p) => (!brandId || p.brandId === brandId)
  );

  const openCreateModal = () => {
    const defaultClient = activeClients[0];
    const defaultClientId = defaultClient?.id || '';
    const defaultBrands = (brands || []).filter(
      (b) => b?.status === 'ACTIVE' && (!defaultClientId || b.clientId === defaultClientId)
    );

    setProjectName('');
    setCustomProjectId('');
    setClientId(defaultClientId);
    setBrandId(defaultBrands[0]?.id || '');
    setProductId('');
    setCampaignId('');
    setCalendarEventId('');
    setShootDate(new Date().toISOString().split('T')[0]);
    setLocationCategory('Studio Bay');
    setLocationAddressInput('');
    setLocationContactPerson('');
    setReportingTime('09:00 AM');
    setExpectedWrapUpTime('06:00 PM');
    setInfluencerTalent('');
    setPriority('MEDIUM');
    setStatus('PLANNED');
    setEstimatedCompletionDate('');
    setRemarks('');
    setStudioName('Studio 4 - Product Bay');
    setOutdoorLocation('');
    setTransportationReq(true);
    setDriver('');
    setLogisticsCoordinator('');
    setTravelNotes('');
    setSelectedTeamUserIds([]);
    setSelectedEquipmentIds([]);
    setShowModal(true);
  };

  const handleClientChange = (selectedCId: string) => {
    setClientId(selectedCId);
    const linkedBrands = (brands || []).filter(
      (b) => b?.status === 'ACTIVE' && b.clientId === selectedCId
    );
    setBrandId(linkedBrands[0]?.id || '');
    setProductId('');
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert('An Active Client is required to create a shoot project.');
      return;
    }
    if (!brandId) {
      alert('An Active Brand is required to create a shoot project.');
      return;
    }

    try {
      const payload: any = {
        name: projectName.trim() || undefined,
        projectId: customProjectId.trim() || undefined,
        shootType,
        clientId,
        brandId,
        productId: productId || undefined,
        campaignId: campaignId.trim() || undefined,
        calendarEventId: calendarEventId.trim() || undefined,
        shootDate,
        shootLocation: shootType === 'INDOOR' ? studioName : outdoorLocation,
        locationCategory: locationCategory || undefined,
        locationAddress: locationAddressInput || undefined,
        locationContactPerson: locationContactPerson || undefined,
        reportingTime,
        expectedWrapUpTime,
        influencerTalent: influencerTalent || undefined,
        priority,
        status,
        estimatedCompletionDate: estimatedCompletionDate || undefined,
        remarks: remarks.trim() || undefined,
        teamUserIds: selectedTeamUserIds,
        equipmentIds: selectedEquipmentIds,
      };

      if (shootType === 'INDOOR') {
        payload.indoorDetails = {
          studioName,
          studioAddress: studioAddress || studioName,
        };
      } else {
        payload.outdoorDetails = {
          outdoorLocation,
          locationAddress: locationAddress || outdoorLocation,
          permissionStatus,
          weatherStatus,
          transportationReq,
          driver: driver?.trim() || undefined,
          logisticsCoordinator: logisticsCoordinator?.trim() || undefined,
          travelNotes: travelNotes?.trim() || undefined,
          droneRequirement,
        };
      }

      await fetchApi('/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowModal(false);
      loadProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to create shoot project');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-400" /> Media Shoot Projects Directory
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Create and track Indoor Studio shoots vs Outdoor Field shoots. Projects can only be created for Active Clients and Brands.
          </p>
        </div>

        <Link
          href="/calendar"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/30 w-max"
        >
          <Calendar className="w-4 h-4" /> Schedule via Media Calendar
        </Link>
      </div>

      {/* User-Friendly 11-Parameter Filter Control Panel */}
      <div className="bg-card border border-border p-5 rounded-xl space-y-4 text-xs shadow-md">
        {/* Quick View Tab Pills */}
        <div className="flex items-center gap-2 pb-1 border-b border-gray-800 flex-wrap">
          <button
            onClick={() => {
              setSelectedStatus('');
              setSelectedEmployee('');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !selectedStatus && !selectedEmployee
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            All Project Shoots
          </button>

          <button
            onClick={() => {
              setSelectedStatus('PENDING_APPROVAL');
              setSelectedEmployee('');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedStatus === 'PENDING_APPROVAL'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-gray-900 text-amber-400 hover:text-white border border-gray-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Pending Approval
          </button>

          {user?.id && (
            <button
              onClick={() => {
                setSelectedStatus('');
                setSelectedEmployee(user.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedEmployee === user.id
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-gray-900 text-purple-400 hover:text-white border border-gray-800'
              }`}
            >
              <User className="w-3.5 h-3.5" /> My Project Shoots
            </button>
          )}
        </div>

        {/* Top Primary Filter Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Keyword Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, Name, Client, Brand, Product, Campaign, Staff, Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-white font-medium focus:outline-none transition-all placeholder:text-gray-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Presets & Toggle Drawer Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedType(selectedType === 'INDOOR' ? '' : 'INDOOR')}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                selectedType === 'INDOOR'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Indoor Studio
            </button>

            <button
              onClick={() => setSelectedType(selectedType === 'OUTDOOR' ? '' : 'OUTDOOR')}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                selectedType === 'OUTDOOR'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Outdoor Field
            </button>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                showAdvancedFilters || (selectedClient || selectedBrand || selectedProduct || selectedStatus || selectedPriority || selectedDate || selectedMediaManager || selectedTechManager || selectedEmployee || selectedLocation)
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>Advanced Filters</span>
              {([selectedClient, selectedBrand, selectedProduct, selectedStatus, selectedPriority, selectedDate, selectedMediaManager, selectedTechManager, selectedEmployee, selectedLocation].filter(Boolean).length > 0) && (
                <span className="w-4 h-4 rounded-full bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center">
                  {[selectedClient, selectedBrand, selectedProduct, selectedStatus, selectedPriority, selectedDate, selectedMediaManager, selectedTechManager, selectedEmployee, selectedLocation].filter(Boolean).length}
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

            {(search || selectedClient || selectedBrand || selectedProduct || selectedType || selectedStatus || selectedPriority || selectedDate || selectedMediaManager || selectedTechManager || selectedEmployee || selectedLocation) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedClient('');
                  setSelectedBrand('');
                  setSelectedProduct('');
                  setSelectedType('');
                  setSelectedStatus('');
                  setSelectedPriority('');
                  setSelectedDate('');
                  setSelectedMediaManager('');
                  setSelectedTechManager('');
                  setSelectedEmployee('');
                  setSelectedLocation('');
                }}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips / Pills Bar */}
        {(selectedClient || selectedBrand || selectedProduct || selectedType || selectedStatus || selectedPriority || selectedDate || selectedMediaManager || selectedTechManager || selectedEmployee || selectedLocation) && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-800">
            <span className="text-gray-500 text-[11px] font-semibold">Active Filters:</span>
            {selectedStatus && (
              <span className="px-2.5 py-1 bg-blue-950 text-blue-300 border border-blue-800 rounded-full flex items-center gap-1 text-[11px]">
                Status: {selectedStatus}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedStatus('')} />
              </span>
            )}
            {selectedClient && (
              <span className="px-2.5 py-1 bg-purple-950 text-purple-300 border border-purple-800 rounded-full flex items-center gap-1 text-[11px]">
                Client: {clients.find((c) => c.id === selectedClient)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedClient('')} />
              </span>
            )}
            {selectedBrand && (
              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full flex items-center gap-1 text-[11px]">
                Brand: [{brands.find((b) => b.id === selectedBrand)?.shortCode}] {brands.find((b) => b.id === selectedBrand)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedBrand('')} />
              </span>
            )}
            {selectedProduct && (
              <span className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full flex items-center gap-1 text-[11px]">
                Product: {products.find((p) => p.id === selectedProduct)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedProduct('')} />
              </span>
            )}
            {selectedPriority && (
              <span className="px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-full flex items-center gap-1 text-[11px]">
                Priority: {selectedPriority}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedPriority('')} />
              </span>
            )}
            {selectedDate && (
              <span className="px-2.5 py-1 bg-gray-800 text-gray-200 border border-gray-700 rounded-full flex items-center gap-1 text-[11px] font-mono">
                Date: {selectedDate}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedDate('')} />
              </span>
            )}
            {selectedLocation && (
              <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full flex items-center gap-1 text-[11px]">
                Location: {selectedLocation}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSelectedLocation('')} />
              </span>
            )}
          </div>
        )}

        {/* Expandable Grouped Advanced Filters Panel */}
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
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="">All Clients</option>
                    {(clients || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status})
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="">All Brands</option>
                    {(brands || []).map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.shortCode}] {b.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="">All Products</option>
                    {(products || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 2: Key Managers & Personnel */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-blue-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" /> Crew & Management
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedMediaManager}
                    onChange={(e) => setSelectedMediaManager(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">All Media Managers</option>
                    {(usersList || [])
                      .filter((u) => u.role === 'MEDIA_MANAGER')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          Media Mgr: {u.name}
                        </option>
                      ))}
                  </select>

                  <select
                    value={selectedTechManager}
                    onChange={(e) => setSelectedTechManager(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">All Tech Managers</option>
                    {(usersList || [])
                      .filter((u) => u.role === 'TECHNICAL_MANAGER')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          Tech Mgr: {u.name}
                        </option>
                      ))}
                  </select>

                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">All Assigned Staff</option>
                    {(usersList || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 3: Operations & Status */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-amber-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-400" /> Status & Operations
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="">All Operational Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PLANNED">Planned</option>
                    <option value="READY_FOR_PRODUCTION">Ready for Production</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="WAITING_FOR_TECHNICAL_REVIEW">Waiting for Tech Review</option>
                    <option value="WAITING_FOR_MEDIA_REVIEW">Waiting for Media Review</option>
                    <option value="WAITING_FOR_CLIENT_CONFIRMATION">Waiting for Client Confirmation</option>
                    <option value="CLIENT_REVISION_REQUESTED">Client Revision Requested</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CLOSED">Closed</option>
                    <option value="ARCHIVED">Archived</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>

                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="">All Priorities</option>
                    <option value="LOW">Priority: LOW</option>
                    <option value="MEDIUM">Priority: MEDIUM</option>
                    <option value="HIGH">Priority: HIGH</option>
                    <option value="CRITICAL">Priority: CRITICAL</option>
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                    />
                    <input
                      type="text"
                      placeholder="Location..."
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-500 text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Projects...</div>
      ) : projects.length === 0 ? (
        <div className="p-8 text-center bg-card border border-border rounded-xl text-gray-400">
          No shoot projects found matching criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginate(sortData(projects, sortBy, sortOrder)).map((proj) => (
            <div
              key={proj.id}
              className={`bg-card border p-5 rounded-xl space-y-4 relative flex flex-col justify-between transition-all hover:border-gray-700 ${
                proj.shootType === 'INDOOR' ? 'border-blue-900/40' : 'border-emerald-900/40'
              }`}
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-400 block">{proj.projectId}</span>
                    <h3 className="text-base font-bold text-white leading-snug">{proj.name}</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <FavoriteButton
                      entityType="PROJECT"
                      entityId={proj.id}
                      title={proj.name}
                      code={proj.projectId}
                      url={`/projects/${proj.id}`}
                      metadata={{ client: proj.client?.name, brand: proj.brand?.name, status: proj.status }}
                      size="sm"
                    />
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        proj.status === 'COMPLETED' || proj.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : proj.status === 'PLANNED' || proj.status === 'PENDING_CLIENT_APPROVAL' || proj.status === 'PENDING_MARKETING_APPROVAL' || proj.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {proj.status === 'PLANNED' || proj.status === 'PENDING_CLIENT_APPROVAL' || proj.status === 'PENDING_MARKETING_APPROVAL' || proj.status === 'PENDING'
                        ? 'PENDING MARKETING MANAGER APPROVAL'
                        : proj.status ? proj.status.replace(/_/g, ' ') : 'PENDING MARKETING MANAGER APPROVAL'}
                    </span>
                  </div>
                </div>

                {/* Parent Client & Brand */}
                <div className="text-xs text-gray-400 flex items-center justify-between border-y border-border py-2">
                  <div>Client: <strong className="text-gray-200">{proj.client?.name}</strong></div>
                  <div>Brand: <strong className="text-blue-400">[{proj.brand?.shortCode}] {proj.brand?.name}</strong></div>
                </div>

                {/* Location & Shoot Date */}
                <div className="space-y-1 text-xs text-gray-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{proj.shootLocation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{new Date(proj.shootDate).toLocaleDateString()}</span>
                    {proj.influencerTalent && <span>• Talent: {proj.influencerTalent}</span>}
                  </div>
                </div>

                {/* Warnings Section for Outdoor Shoots */}
                {proj.shootType === 'OUTDOOR' && proj.outdoorDetails && (
                  <div className="space-y-1.5 pt-1">
                    {proj.outdoorDetails.permissionStatus === 'PENDING' && (
                      <div className="p-2 bg-amber-950/30 border border-amber-800/40 rounded text-[11px] text-amber-300 flex items-center gap-1.5 font-medium">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Warning: Permit Application Pending</span>
                      </div>
                    )}

                    {proj.outdoorDetails.weatherStatus === 'RISK_RAIN' && (
                      <div className="p-2 bg-purple-950/30 border border-purple-800/40 rounded text-[11px] text-purple-300 flex items-center gap-1.5 font-medium">
                        <CloudRain className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Warning: Rain / Weather Risk Alert</span>
                      </div>
                    )}

                    {proj.outdoorDetails.transportationReq && !proj.outdoorDetails.driver && (
                      <div className="p-2 bg-red-950/30 border border-red-800/40 rounded text-[11px] text-red-300 flex items-center gap-1.5 font-medium">
                        <Truck className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>Warning: Transportation Driver Not Assigned</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Assigned Team */}
                {proj.assignedTeam && proj.assignedTeam.length > 0 && (
                  <div className="text-xs pt-1 border-t border-border/50">
                    <div className="text-[11px] font-medium text-gray-400 flex items-center gap-1 mb-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" /> Assigned Team:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {proj.assignedTeam.map((member: any) => (
                        <span
                          key={member.id || member.userId}
                          className="bg-blue-950/40 text-blue-300 border border-blue-800/40 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          {member.user?.name || 'Staff Member'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reserved Equipment */}
                <div className="text-xs pt-1 border-t border-border/50">
                  <div className="text-[11px] font-medium text-gray-400 flex items-center gap-1 mb-1.5">
                    <Camera className="w-3.5 h-3.5 text-purple-400" /> Reserved Equipment:
                  </div>
                  {proj.equipmentReservations && proj.equipmentReservations.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {proj.equipmentReservations.map((res: any) => (
                        <span
                          key={res.id}
                          className="bg-purple-950/40 text-purple-300 border border-purple-800/40 text-[10px] px-2 py-0.5 rounded-full font-medium"
                        >
                          {res.equipment?.name || 'Equipment'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500 italic text-[11px]">No gear reserved yet</span>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="text-[11px] text-gray-400">
                  Revision Count: <strong className="text-amber-400">{proj.revisionCount || 0}</strong>
                </div>

                <Link
                  href={`/projects/${proj.id}`}
                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
          </div>

          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={projects.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Sticky Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-blue-400" /> Create New Shoot Project
                </h2>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 hidden sm:inline-block">
                  Active Clients & Brands Only
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleCreateProject} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                {/* Project ID & Project Name */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Project ID</label>
                    <input
                      type="text"
                      placeholder="Auto (SP-XXXXXX)"
                      value={customProjectId}
                      onChange={(e) => setCustomProjectId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-blue-400 font-mono font-semibold px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Leave empty to auto-generate</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-gray-300 font-semibold mb-1">Project Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Summer Campaign Shoot (Auto-generated if empty)"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Optional custom name override</p>
                  </div>
                </div>

                {/* Shoot Type Toggle */}
                <div className="space-y-1">
                  <label className="block text-gray-300 font-semibold mb-1">Shoot Type (Mandatory Selection)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setShootType('INDOOR')}
                      className={`p-3 rounded-lg border text-center font-bold transition-all ${
                        shootType === 'INDOOR'
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-lg'
                          : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      INDOOR SHOOT
                    </button>

                    <button
                      type="button"
                      onClick={() => setShootType('OUTDOOR')}
                      className={`p-3 rounded-lg border text-center font-bold transition-all ${
                        shootType === 'OUTDOOR'
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-lg'
                          : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      OUTDOOR SHOOT
                    </button>
                  </div>
                </div>

                {/* Client, Brand, Product, Campaign, Calendar Event */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Active Client *</label>
                    <select
                      required
                      value={clientId}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Active Client</option>
                      {activeClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.companyName})
                        </option>
                      ))}
                    </select>
                    {activeClients.length === 0 && (
                      <p className="text-[10px] text-amber-400 mt-1">No active clients found!</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Active Brand *</label>
                    <select
                      required
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Active Brand</option>
                      {activeBrands.map((b) => (
                        <option key={b.id} value={b.id}>
                          [{b.shortCode}] {b.name}
                        </option>
                      ))}
                    </select>
                    {clientId && activeBrands.length === 0 && (
                      <p className="text-[10px] text-amber-400 mt-1">No active brands found!</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Product (Optional)</label>
                    <select
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">None / General Shoot</option>
                      {activeProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.productCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Campaign (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Festive Launch 2026"
                      value={campaignId}
                      onChange={(e) => setCampaignId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Calendar Event / Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. EVT-2026-0811"
                      value={calendarEventId}
                      onChange={(e) => setCalendarEventId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Dates, Schedule & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Shoot Date *</label>
                    <input
                      type="date"
                      required
                      value={shootDate}
                      onChange={(e) => setShootDate(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Reporting Time</label>
                    <input
                      type="text"
                      placeholder="09:00 AM"
                      value={reportingTime}
                      onChange={(e) => setReportingTime(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Wrap-up Time</label>
                    <input
                      type="text"
                      placeholder="06:00 PM"
                      value={expectedWrapUpTime}
                      onChange={(e) => setExpectedWrapUpTime(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Estimated Completion</label>
                    <input
                      type="date"
                      value={estimatedCompletionDate}
                      onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Priority, Status & Talent */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Project Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Current Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PLANNED">Planned</option>
                      <option value="READY_FOR_PRODUCTION">Ready for Production</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="WAITING_FOR_TECHNICAL_REVIEW">Waiting for Technical Review</option>
                      <option value="WAITING_FOR_MEDIA_REVIEW">Waiting for Media Review</option>
                      <option value="WAITING_FOR_CLIENT_CONFIRMATION">Waiting for Client Confirmation</option>
                      <option value="CLIENT_REVISION_REQUESTED">Client Revision Requested</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CLOSED">Closed</option>
                      <option value="ARCHIVED">Archived</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Influencer / Talent</label>
                    <input
                      type="text"
                      placeholder="e.g. Devika Sharma"
                      value={influencerTalent}
                      onChange={(e) => setInfluencerTalent(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Location Operational Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Location Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Studio Bay / Outdoor Park"
                      value={locationCategory}
                      onChange={(e) => setLocationCategory(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Location Address</label>
                    <input
                      type="text"
                      placeholder="Full Street / Venue Address"
                      value={locationAddress}
                      onChange={(e) => setLocationAddressInput(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Location Contact Person</label>
                    <input
                      type="text"
                      placeholder="Manager Name & Phone"
                      value={locationContactPerson}
                      onChange={(e) => setLocationContactPerson(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Initial Project Remark (Permanent History) */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Project Remark / Notes</span>
                    <span className="text-[10px] text-blue-400 font-normal">Logged as permanent immutable history</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add initial operational remarks, special instructions, or client notes..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Team / Crew Member Assignment Section */}
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 font-semibold flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-400" /> Crew Assignment
                    </label>
                    <span className="text-[11px] text-amber-400 font-bold">
                      Not Assigned
                    </span>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg text-[11px] text-gray-400">
                    Shoot Project will be created as <strong className="text-amber-300">Not Assigned</strong>. Crew and staff assignment is specified when scheduling the Media Calendar Event.
                  </div>
                </div>

                {/* Equipment / Gear Reservation Section */}
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 font-semibold flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-purple-400" /> Reserve Equipment & Production Gear
                    </label>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {selectedEquipmentIds.length} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                    {equipmentList.length === 0 ? (
                      <div className="text-gray-500 text-[11px] col-span-2 text-center py-2">No equipment items found.</div>
                    ) : (
                      equipmentList.map((eq) => {
                        const isSelected = selectedEquipmentIds.includes(eq.id);
                        return (
                          <button
                            key={eq.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedEquipmentIds(selectedEquipmentIds.filter((id) => id !== eq.id));
                              } else {
                                setSelectedEquipmentIds([...selectedEquipmentIds, eq.id]);
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg text-left transition-all border ${
                              isSelected
                                ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                                : 'bg-card border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                            }`}
                          >
                            <div className="truncate">
                              <div className="font-semibold text-xs text-white leading-none truncate">{eq.name}</div>
                              <div className="text-[10px] text-gray-400 truncate font-mono">[{eq.category}] {eq.brand} {eq.model}</div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Dynamic Form Sections based on Shoot Type */}
                {shootType === 'INDOOR' ? (
                  <div className="p-4 bg-blue-950/20 border border-blue-800/40 rounded-lg space-y-3">
                    <h4 className="font-bold text-blue-300">Indoor Studio Operational Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-300 font-semibold mb-1">Studio Name *</label>
                        <input
                          type="text"
                          required
                          value={studioName}
                          onChange={(e) => setStudioName(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 font-semibold mb-1">Studio Address</label>
                        <input
                          type="text"
                          value={studioAddress}
                          onChange={(e) => setStudioAddress(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-lg space-y-3">
                    <h4 className="font-bold text-emerald-300">Outdoor Shoot Operational Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-300 font-semibold mb-1">Outdoor Location *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Juhu Beach Promenade"
                          value={outdoorLocation}
                          onChange={(e) => setOutdoorLocation(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 font-semibold mb-1">Permission Status</label>
                        <select
                          value={permissionStatus}
                          onChange={(e) => setPermissionStatus(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                        >
                          <option value="PENDING">PENDING (Triggers Warning)</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="NOT_REQUIRED">NOT REQUIRED</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-300 font-semibold mb-1">Weather Status</label>
                        <select
                          value={weatherStatus}
                          onChange={(e) => setWeatherStatus(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                        >
                          <option value="FAVORABLE">FAVORABLE</option>
                          <option value="RISK_RAIN">RISK RAIN (Triggers Warning)</option>
                          <option value="EXTREME_HEAT">EXTREME HEAT</option>
                        </select>
                      </div>
                    </div>

                    {/* Transportation & Logistics Section */}
                    <div className="space-y-2 border-t border-emerald-800/40 pt-3 mt-2">
                      <h5 className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-emerald-400" /> Transportation & Logistics Setup
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-300 font-semibold mb-1">Transportation Requirement</label>
                          <select
                            value={transportationReq ? 'REQUIRED' : 'NONE'}
                            onChange={(e) => setTransportationReq(e.target.value === 'REQUIRED')}
                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
                          >
                            <option value="REQUIRED">REQUIRED (Van / Vehicle Needed)</option>
                            <option value="NONE">NOT REQUIRED (Self Travel)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-300 font-semibold mb-1">Assigned Driver Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Ramesh Kumar (or empty for warning)"
                            value={driver}
                            onChange={(e) => setDriver(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-300 font-semibold mb-1">Logistics Coordinator</label>
                          <input
                            type="text"
                            placeholder="e.g. Anand Sharma"
                            value={logisticsCoordinator}
                            onChange={(e) => setLogisticsCoordinator(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-300 font-semibold mb-1">Travel / Route Notes</label>
                          <input
                            type="text"
                            placeholder="e.g. Departure from HQ at 06:00 AM"
                            value={travelNotes}
                            onChange={(e) => setTravelNotes(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Sticky Footer */}
              <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0 bg-card">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Shoot Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
