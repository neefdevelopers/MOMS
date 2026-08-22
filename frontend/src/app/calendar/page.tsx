'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Calendar as CalendarIcon, Plus, Filter, Video, Sun, AlertTriangle, Clock, Edit, XCircle, ArrowRight, Search, SlidersHorizontal, RotateCcw, X, Building2, Camera, Flame } from 'lucide-react';
import Link from 'next/link';

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: month, week, day
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Project-Style Filtration Control Panel States
  const [searchQuery, setSearchQuery] = useState('');
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [brandIdFilter, setBrandIdFilter] = useState('');
  const [shootTypeFilter, setShootTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  // 13 Mandatory Schedule Event Form State
  const [formData, setFormData] = useState({
    title: '',
    clientId: '',
    brandId: '',
    productId: '',
    shootType: 'INDOOR',
    shootDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    location: 'Main Studio Floor',
    locationCategory: 'Studio Bay',
    teamUserIds: [] as string[],
    equipmentIds: [] as string[],
    influencerTalent: '',
    priority: 'MEDIUM',
    productionNotes: '',
  });

  const loadData = async () => {
    try {
      let url = '/calendar';
      const params = new URLSearchParams();
      if (clientIdFilter) params.append('clientId', clientIdFilter);
      if (brandIdFilter) params.append('brandId', brandIdFilter);
      if (shootTypeFilter) params.append('shootType', shootTypeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const [resEvents, resClients, resBrands, resProducts, resUsers, resEq] = await Promise.all([
        fetchApi(url),
        fetchApi('/clients').catch(() => []),
        fetchApi('/brands').catch(() => []),
        fetchApi('/products').catch(() => []),
        fetchApi('/users').catch(() => []),
        fetchApi('/equipment').catch(() => []),
      ]);

      setEvents(Array.isArray(resEvents) ? resEvents : []);
      setClients(Array.isArray(resClients) ? resClients : []);
      setBrands(Array.isArray(resBrands) ? resBrands : []);
      setProducts(Array.isArray(resProducts) ? resProducts : []);
      setStaffUsers(Array.isArray(resUsers) ? resUsers : []);
      setEquipmentList(Array.isArray(resEq) ? resEq : []);
    } catch (err) {
      console.error('Error loading calendar reference data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientIdFilter, brandIdFilter, shootTypeFilter, statusFilter]);

  // Cascading Selection Handlers (Client -> Brand -> Product)
  const handleClientChange = (cId: string) => {
    setFormData((prev) => ({
      ...prev,
      clientId: cId,
      brandId: '',
      productId: '',
    }));
  };

  const handleBrandChange = (bId: string) => {
    setFormData((prev) => ({
      ...prev,
      brandId: bId,
      productId: '',
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Event / Project Name is required.');
      return;
    }
    if (!formData.clientId) {
      alert('A valid active Client is required.');
      return;
    }
    if (!formData.brandId) {
      alert('A valid active Brand is required.');
      return;
    }
    if (!formData.shootDate) {
      alert('Shoot Date is required.');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      alert('Start Time and End Time are required.');
      return;
    }

    try {
      if (editingEvent) {
        await fetchApi(`/calendar/${editingEvent.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/calendar', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowAddModal(false);
      setEditingEvent(null);
      resetForm();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save calendar event');
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled shoot event?')) return;
    try {
      await fetchApi(`/calendar/${eventId}/cancel`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel event');
    }
  };

  const handleGenerateGraphicReq = async (eventId: string) => {
    try {
      await fetchApi(`/calendar/${eventId}/generate-graphic-req`, { method: 'POST' });
      alert('✨ Graphic Requirement auto-generated successfully from Media Calendar Event!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate Graphic Requirement');
    }
  };

  const openEdit = (eventItem: any) => {
    setEditingEvent(eventItem);
    const existingTeam = eventItem.shootProjects?.[0]?.assignedTeam?.map((tm: any) => tm.userId) || [];
    const existingEq = eventItem.shootProjects?.[0]?.equipmentReservations?.map((res: any) => res.equipmentId) || [];

    setFormData({
      title: eventItem.title || '',
      clientId: eventItem.clientId || '',
      brandId: eventItem.brandId || '',
      productId: eventItem.productId || '',
      shootType: eventItem.shootType || 'INDOOR',
      shootDate: eventItem.shootDate ? new Date(eventItem.shootDate).toISOString().split('T')[0] : '',
      deadline: eventItem.deadline ? new Date(eventItem.deadline).toISOString().split('T')[0] : (eventItem.shootProjects?.[0]?.estimatedCompletionDate ? new Date(eventItem.shootProjects[0].estimatedCompletionDate).toISOString().split('T')[0] : ''),
      startTime: eventItem.startTime || '09:00 AM',
      endTime: eventItem.endTime || '05:00 PM',
      location: eventItem.location || 'Main Studio Floor',
      locationCategory: eventItem.locationCategory || 'Studio Bay',
      teamUserIds: existingTeam,
      equipmentIds: existingEq,
      influencerTalent: eventItem.influencerTalent || '',
      priority: eventItem.priority || 'MEDIUM',
      productionNotes: eventItem.productionNotes || '',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    const defaultClient = clients.find((c) => c.status === 'ACTIVE')?.id || '';
    const defaultBrand = brands.find((b) => b.status === 'ACTIVE' && (!defaultClient || b.clientId === defaultClient))?.id || '';

    setFormData({
      title: '',
      clientId: defaultClient,
      brandId: defaultBrand,
      productId: '',
      shootType: 'INDOOR',
      shootDate: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      location: 'Main Studio Floor',
      locationCategory: 'Studio Bay',
      teamUserIds: [],
      equipmentIds: [],
      influencerTalent: '',
      priority: 'MEDIUM',
      productionNotes: '',
    });
  };

  const activeClients = clients.filter((c) => c.status === 'ACTIVE');
  const filteredBrands = brands.filter((b) => b.status === 'ACTIVE' && (!formData.clientId || b.clientId === formData.clientId));
  const filteredProducts = products.filter((p) => p.status === 'ACTIVE' && (!formData.brandId || p.brandId === formData.brandId));

  // Available equipment: exclude RETIRED, DAMAGED, LOST, UNDER_MAINTENANCE
  const availableEquipment = equipmentList.filter(
    (eq) => !eq.isArchived && !['UNDER_MAINTENANCE', 'DAMAGED', 'LOST', 'RETIRED'].includes(eq.availability)
  );

  const filteredEvents = events.filter((evt) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (evt.title || '').toLowerCase().includes(q);
      const clientMatch = (evt.client?.name || '').toLowerCase().includes(q);
      const brandMatch = (evt.brand?.name || '').toLowerCase().includes(q) || (evt.brand?.shortCode || '').toLowerCase().includes(q);
      const productMatch = (evt.product?.name || '').toLowerCase().includes(q);
      const talentMatch = (evt.influencerTalent || '').toLowerCase().includes(q);
      const notesMatch = (evt.productionNotes || '').toLowerCase().includes(q);
      if (!titleMatch && !clientMatch && !brandMatch && !productMatch && !talentMatch && !notesMatch) return false;
    }
    if (priorityFilter && evt.priority !== priorityFilter) return false;
    if (dateFilter && (!evt.shootDate || !evt.shootDate.startsWith(dateFilter))) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-400" /> Operational Media Shoot Calendar
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Centralized calendar for planning Indoor Studio shoots vs Outdoor Field shoots across active client accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-900 border border-gray-800 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded transition-colors ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded transition-colors ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded transition-colors ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Day
            </button>
          </div>

          {user?.role === 'MEDIA_MANAGER' && (
            <button
              onClick={() => {
                resetForm();
                setEditingEvent(null);
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/30 w-max"
            >
              <Plus className="w-4 h-4" /> Schedule Event
            </button>
          )}
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
              placeholder="Search calendar events by Title, Client, Brand, Product, Talent, Notes..."
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

          {/* Controls: Quick Presets, Advanced Toggle & Reset */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShootTypeFilter(shootTypeFilter === 'INDOOR' ? '' : 'INDOOR')}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                shootTypeFilter === 'INDOOR'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Indoor Studio
            </button>

            <button
              onClick={() => setShootTypeFilter(shootTypeFilter === 'OUTDOOR' ? '' : 'OUTDOOR')}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                shootTypeFilter === 'OUTDOOR'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Outdoor Field
            </button>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                showAdvancedFilters || (clientIdFilter || brandIdFilter || statusFilter || priorityFilter || dateFilter)
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>Advanced Filters</span>
              {([clientIdFilter, brandIdFilter, statusFilter, priorityFilter, dateFilter].filter(Boolean).length > 0) && (
                <span className="w-4 h-4 rounded-full bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center">
                  {[clientIdFilter, brandIdFilter, statusFilter, priorityFilter, dateFilter].filter(Boolean).length}
                </span>
              )}
            </button>

            {(searchQuery || clientIdFilter || brandIdFilter || shootTypeFilter || statusFilter || priorityFilter || dateFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setClientIdFilter('');
                  setBrandIdFilter('');
                  setShootTypeFilter('');
                  setStatusFilter('');
                  setPriorityFilter('');
                  setDateFilter('');
                }}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips / Pills */}
        {(clientIdFilter || brandIdFilter || shootTypeFilter || statusFilter || priorityFilter || dateFilter) && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-800">
            <span className="text-gray-500 text-[11px] font-semibold">Active Filters:</span>
            {clientIdFilter && (
              <span className="px-2.5 py-1 bg-purple-950 text-purple-300 border border-purple-800 rounded-full flex items-center gap-1 text-[11px]">
                Client: {clients.find((c) => c.id === clientIdFilter)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setClientIdFilter('')} />
              </span>
            )}
            {brandIdFilter && (
              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full flex items-center gap-1 text-[11px]">
                Brand: [{brands.find((b) => b.id === brandIdFilter)?.shortCode}] {brands.find((b) => b.id === brandIdFilter)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setBrandIdFilter('')} />
              </span>
            )}
            {shootTypeFilter && (
              <span className="px-2.5 py-1 bg-blue-950 text-blue-300 border border-blue-800 rounded-full flex items-center gap-1 text-[11px]">
                Type: {shootTypeFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setShootTypeFilter('')} />
              </span>
            )}
            {statusFilter && (
              <span className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full flex items-center gap-1 text-[11px]">
                Status: {statusFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setStatusFilter('')} />
              </span>
            )}
            {priorityFilter && (
              <span className="px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-full flex items-center gap-1 text-[11px]">
                Priority: {priorityFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setPriorityFilter('')} />
              </span>
            )}
            {dateFilter && (
              <span className="px-2.5 py-1 bg-gray-800 text-gray-200 border border-gray-700 rounded-full flex items-center gap-1 text-[11px] font-mono">
                Date: {dateFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setDateFilter('')} />
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
                    value={clientIdFilter}
                    onChange={(e) => {
                      setClientIdFilter(e.target.value);
                      setBrandIdFilter('');
                    }}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="">All Clients</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={brandIdFilter}
                    onChange={(e) => setBrandIdFilter(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="">All Brands</option>
                    {brands
                      .filter((b) => !clientIdFilter || b.clientId === clientIdFilter)
                      .map((b) => (
                        <option key={b.id} value={b.id}>[{b.shortCode}] {b.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Group 2: Status & Type */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-blue-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-blue-400" /> Event Status &amp; Shoot Type
                </div>
                <div className="space-y-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">All Event Statuses</option>
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>

                  <select
                    value={shootTypeFilter}
                    onChange={(e) => setShootTypeFilter(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">All Shoot Types</option>
                    <option value="INDOOR">INDOOR Studio</option>
                    <option value="OUTDOOR">OUTDOOR Location</option>
                  </select>
                </div>
              </div>

              {/* Group 3: Priority & Date */}
              <div className="bg-gray-900/70 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                <div className="font-bold text-amber-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Priority &amp; Shoot Date
                </div>
                <div className="space-y-2">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="">All Priorities</option>
                    <option value="LOW">LOW Priority</option>
                    <option value="MEDIUM">MEDIUM Priority</option>
                    <option value="HIGH">HIGH Priority</option>
                    <option value="CRITICAL">CRITICAL Priority</option>
                  </select>

                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Events Stream / Cards */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Calendar Events...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-8 text-center bg-card border border-border rounded-xl text-gray-400">
          No calendar events scheduled for the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((eventItem) => (
            <div
              key={eventItem.id}
              className={`bg-card border p-5 rounded-xl space-y-3 relative transition-all ${
                eventItem.shootType === 'INDOOR' ? 'border-emerald-500/30' : 'border-purple-500/30'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {eventItem.shootType === 'INDOOR' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Video className="w-3 h-3" /> INDOOR
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                      <Sun className="w-3 h-3" /> OUTDOOR
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">
                    {new Date(eventItem.shootDate).toLocaleDateString()}
                  </span>
                </div>

                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                    eventItem.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {eventItem.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white line-clamp-1">{eventItem.title}</h3>
                <p className="text-[11px] text-gray-400">
                  {eventItem.client?.name} • <span className="text-blue-400 font-bold">[{eventItem.brand?.shortCode}]</span> {eventItem.brand?.name}
                </p>
              </div>

              {eventItem.influencerTalent && (
                <div className="text-[11px] text-gray-300 bg-gray-900 p-2 rounded border border-gray-800">
                  Talent/Model: <strong className="text-white">{eventItem.influencerTalent}</strong>
                </div>
              )}

              {/* Integrated Equipment Reservations (Business Rule 10) */}
              {eventItem.shootProjects?.[0]?.equipmentReservations?.length > 0 && (
                <div className="p-2 bg-purple-950/30 border border-purple-800/40 rounded text-[11px] text-purple-300 space-y-1">
                  <div className="font-bold text-purple-400 flex items-center gap-1 text-[10px] uppercase">
                    <Camera className="w-3 h-3 text-purple-400" /> Reserved Equipment
                  </div>
                  {eventItem.shootProjects[0].equipmentReservations.map((res: any) => (
                    <div key={res.id} className="flex justify-between items-center text-[10px] text-gray-300">
                      <span>📷 {res.equipment?.name || 'Equipment'}</span>
                      <span className="text-purple-400 font-mono">({res.status})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                {eventItem.shootProjects?.length > 0 ? (
                  <Link
                    href={`/projects/${eventItem.shootProjects[0].id}`}
                    className="text-emerald-400 hover:underline font-bold text-[11px] flex items-center gap-1"
                  >
                    View Project <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  user?.role === 'MEDIA_MANAGER' && (
                    <Link
                      href={`/projects?createFromEvent=${eventItem.id}`}
                      className="text-blue-400 hover:underline font-bold text-[11px] flex items-center gap-1"
                    >
                      Convert to Project <ArrowRight className="w-3 h-3" />
                    </Link>
                  )
                )}

                {user?.role === 'MEDIA_MANAGER' && eventItem.status !== 'CANCELLED' && (
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleGenerateGraphicReq(eventItem.id)}
                      className="px-2 py-0.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 rounded font-semibold text-[10px] flex items-center gap-1"
                      title="Auto-generate Graphic Requirement from Media Calendar"
                    >
                      🎨 + Graphic Req
                    </button>
                    <button
                      onClick={() => openEdit(eventItem)}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-semibold text-[10px] flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleCancelEvent(eventItem.id)}
                      className="px-2 py-0.5 bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/50 rounded font-semibold text-[10px] flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSave} className="bg-card border border-border rounded-xl w-full max-w-2xl p-6 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-400" />
                  {editingEvent ? 'Edit Shoot Calendar Event' : 'Schedule New Shoot Event'}
                </h2>
                <p className="text-[11px] text-gray-400">All required production scheduling fields and team/equipment reservations</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEvent(null);
                }}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECTION 1: EVENT DETAILS */}
            <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                Section 1 • Event & Client Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-gray-300 block mb-1 font-semibold">Event / Project Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Ojas Launch Reel Shoot"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Client (Cascading) *</label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="">Select Active Client</option>
                    {activeClients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Brand (Filtered) *</label>
                  <select
                    required
                    value={formData.brandId}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="">Select Active Brand</option>
                    {filteredBrands.map((b) => (
                      <option key={b.id} value={b.id}>[{b.shortCode}] {b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-gray-300 block mb-1 font-semibold">Product (Optional)</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  >
                    <option value="">None / General Shoot</option>
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.productCode})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: SCHEDULE & TIMINGS */}
            <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Section 2 • Schedule & Timings
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Shoot Type *</label>
                  <select
                    value={formData.shootType}
                    onChange={(e) => setFormData({ ...formData, shootType: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="INDOOR">INDOOR Studio</option>
                    <option value="OUTDOOR">OUTDOOR Location</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Shoot Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.shootDate}
                    onChange={(e) => setFormData({ ...formData, shootDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Deadline Date</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Start Time *</label>
                  <input
                    type="text"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    placeholder="09:00 AM"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">End Time *</label>
                  <input
                    type="text"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    placeholder="05:00 PM"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: LOCATION DETAILS */}
            <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Section 3 • Location Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Shoot Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Studio Floor 4, Media Ops HQ"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Location Category *</label>
                  <select
                    value={formData.locationCategory}
                    onChange={(e) => setFormData({ ...formData, locationCategory: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="Studio Bay">Studio Bay</option>
                    <option value="Outdoor Field">Outdoor Field</option>
                    <option value="Client Site">Client Site</option>
                    <option value="Third-Party Location">Third-Party Location</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 4: TEAM & EQUIPMENT */}
            <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                Section 4 • Assigned Team & Required Equipment
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Assigned Team (Select Staff) *</label>
                  <select
                    multiple
                    size={4}
                    value={formData.teamUserIds}
                    onChange={(e) => {
                      const opts = Array.from(e.target.selectedOptions, (option) => option.value);
                      setFormData({ ...formData, teamUserIds: opts });
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-[11px] scrollbar-thin"
                  >
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.employeeProfile?.designation || u.role})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-500 mt-1 block">Hold Ctrl / Cmd to select multiple employees</span>
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Required Equipment (Available Only)</label>
                  <select
                    multiple
                    size={4}
                    value={formData.equipmentIds}
                    onChange={(e) => {
                      const opts = Array.from(e.target.selectedOptions, (option) => option.value);
                      setFormData({ ...formData, equipmentIds: opts });
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-[11px] scrollbar-thin"
                  >
                    {availableEquipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        📷 {eq.name} ({eq.category})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-500 mt-1 block">Hold Ctrl / Cmd to select multiple equipment items</span>
                </div>
              </div>
            </div>

            {/* SECTION 5: ADDITIONAL INFORMATION */}
            <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Section 5 • Additional Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Influencer / Talent</label>
                  <input
                    type="text"
                    value={formData.influencerTalent}
                    onChange={(e) => setFormData({ ...formData, influencerTalent: e.target.value })}
                    placeholder="e.g. Devika (Model)"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block mb-1 font-semibold">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1 font-semibold">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={formData.productionNotes}
                  onChange={(e) => setFormData({ ...formData, productionNotes: e.target.value })}
                  placeholder="Additional scheduling notes, shot list links..."
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEvent(null);
                }}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/30"
              >
                {editingEvent ? 'Save Event' : 'Schedule Event'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
