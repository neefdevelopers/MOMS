'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Calendar as CalendarIcon, Plus, Filter, Video, Sun, AlertTriangle, Clock, Edit, XCircle, ArrowRight, Search, SlidersHorizontal, RotateCcw, X, Building2, Camera, Flame, Send, ShieldCheck, FileText } from 'lucide-react';
import Link from 'next/link';

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [graphicRequirements, setGraphicRequirements] = useState<any[]>([]);
  const [shootProjectsList, setShootProjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: month, week, day
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Project-Style Filtration Control Panel States
  const [searchQuery, setSearchQuery] = useState('');
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [brandIdFilter, setBrandIdFilter] = useState('');
  const [shootTypeFilter, setShootTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('OPERATIONAL');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [staffModalSearch, setStaffModalSearch] = useState('');
  const [equipmentModalSearch, setEquipmentModalSearch] = useState('');

  const toggleTeamUser = (userId: string) => {
    setFormData((prev) => {
      const exists = prev.teamUserIds.includes(userId);
      return {
        ...prev,
        teamUserIds: exists
          ? prev.teamUserIds.filter((id) => id !== userId)
          : [...prev.teamUserIds, userId],
      };
    });
  };

  const toggleEquipment = (eqId: string) => {
    setFormData((prev) => {
      const exists = prev.equipmentIds.includes(eqId);
      return {
        ...prev,
        equipmentIds: exists
          ? prev.equipmentIds.filter((id) => id !== eqId)
          : [...prev.equipmentIds, eqId],
      };
    });
  };

  // 13 Mandatory Schedule Event Form State
  const [formData, setFormData] = useState({
    eventSource: 'GRAPHIC_REQUIREMENT' as 'GRAPHIC_REQUIREMENT' | 'SHOOT',
    graphicRequirementId: '',
    shootId: '',
    title: '',
    clientId: '',
    brandId: '',
    productId: '',
    campaign: '',
    contentType: 'Post',
    platform: 'Instagram',
    caption: '',
    creativePreviewUrl: '',
    shootType: 'INDOOR',
    shootDate: new Date().toISOString().split('T')[0],
    clientApprovalDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    saveAsDraft: false,
  });

  // Marketing Manager Client Edit Modal State
  const [showClientEditModal, setShowClientEditModal] = useState(false);
  const [clientEditEvent, setClientEditEvent] = useState<any | null>(null);
  const [clientDeadline, setClientDeadline] = useState('');
  const [clientPriority, setClientPriority] = useState('MEDIUM');
  const [clientReason, setClientReason] = useState('');
  const [savingClientSettings, setSavingClientSettings] = useState(false);

  const openClientEdit = (evt: any) => {
    setClientEditEvent(evt);
    const dStr = evt.clientApprovalDeadline
      ? new Date(evt.clientApprovalDeadline).toISOString().split('T')[0]
      : '';
    setClientDeadline(dStr);
    setClientPriority(evt.priority || 'MEDIUM');
    setClientReason('');
    setShowClientEditModal(true);
  };

  const handleSaveClientSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEditEvent) return;
    try {
      setSavingClientSettings(true);
      if (clientDeadline) {
        await fetchApi(`/calendar/${clientEditEvent.id}/deadline`, {
          method: 'PUT',
          body: JSON.stringify({ deadline: clientDeadline, reason: clientReason }),
        });
      }
      if (clientPriority) {
        await fetchApi(`/calendar/${clientEditEvent.id}/priority`, {
          method: 'PUT',
          body: JSON.stringify({ priority: clientPriority, reason: clientReason }),
        });
      }
      setShowClientEditModal(false);
      setClientEditEvent(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update event settings.');
    } finally {
      setSavingClientSettings(false);
    }
  };

  const handleSubmitForApproval = async (eventId: string) => {
    try {
      await fetchApi(`/calendar/${eventId}/submit`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit event for client review');
    }
  };

  const loadData = async (overrideStatus?: string) => {
    try {
      let url = '/calendar';
      const params = new URLSearchParams();
      if (clientIdFilter) params.append('clientId', clientIdFilter);
      if (brandIdFilter) params.append('brandId', brandIdFilter);
      if (shootTypeFilter) params.append('shootType', shootTypeFilter);
      
      const activeStatus = overrideStatus !== undefined ? overrideStatus : statusFilter;
      if (activeStatus && activeStatus !== 'ALL') params.append('status', activeStatus);
      if (params.toString()) url += `?${params.toString()}`;

      const [resEvents, resClients, resBrands, resProducts, resUsers, resEq, resGr, resProj] = await Promise.all([
        fetchApi(url),
        fetchApi('/clients').catch(() => []),
        fetchApi('/brands').catch(() => []),
        fetchApi('/products').catch(() => []),
        fetchApi('/users').catch(() => []),
        fetchApi('/equipment').catch(() => []),
        fetchApi('/graphic-reqs').catch(() => []),
        fetchApi('/projects').catch(() => []),
      ]);

      setEvents(Array.isArray(resEvents) ? resEvents : []);
      setClients(Array.isArray(resClients) ? resClients : []);
      setBrands(Array.isArray(resBrands) ? resBrands : []);
      setProducts(Array.isArray(resProducts) ? resProducts : []);
      setStaffUsers(Array.isArray(resUsers) ? resUsers : []);
      setEquipmentList(Array.isArray(resEq) ? resEq : []);
      setGraphicRequirements(Array.isArray(resGr) ? resGr : []);
      setShootProjectsList(Array.isArray(resProj) ? resProj : []);
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

  const handleGraphicReqSelect = (reqId: string) => {
    if (!reqId) {
      setFormData((prev) => ({ ...prev, graphicRequirementId: '' }));
      return;
    }
    const selectedGr = graphicRequirements.find((gr) => gr.id === reqId);
    if (!selectedGr) return;

    // Duplicate Check
    const existingEvent = events.find(
      (e) => e.graphicRequirementId === reqId && e.status !== 'CANCELLED' && e.status !== 'REJECTED',
    );
    if (existingEvent) {
      alert(`⚠️ This Graphic Requirement already has a Media Calendar Event (ID: ${existingEvent.eventId || existingEvent.id}).`);
    }

    const deadlineStr = selectedGr.estimatedCompletion
      ? new Date(selectedGr.estimatedCompletion).toISOString().split('T')[0]
      : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setFormData((prev) => ({
      ...prev,
      eventSource: 'GRAPHIC_REQUIREMENT',
      graphicRequirementId: reqId,
      clientId: selectedGr.clientId || prev.clientId,
      brandId: selectedGr.brandId || prev.brandId,
      productId: selectedGr.productId || '',
      title: selectedGr.name || prev.title,
      description: selectedGr.description || '',
      contentType: selectedGr.requirementType || 'Banner',
      platform: prev.platform || 'Instagram',
      clientApprovalDeadline: deadlineStr,
      deadline: deadlineStr,
      priority: selectedGr.priority || 'MEDIUM',
      productionNotes: selectedGr.remarks || selectedGr.objective || '',
    }));
  };

  const handleShootSelect = (sId: string) => {
    if (!sId) {
      setFormData((prev) => ({ ...prev, shootId: '' }));
      return;
    }
    const selectedShoot = shootProjectsList.find((sp) => sp.id === sId);
    if (!selectedShoot) return;

    // Duplicate Check
    const existingEvent = events.find(
      (e) => e.shootId === sId && e.status !== 'CANCELLED' && e.status !== 'REJECTED',
    );
    if (existingEvent) {
      alert(`⚠️ This Shoot already has a Media Calendar Event (ID: ${existingEvent.eventId || existingEvent.id}).`);
    }

    const shootDateStr = selectedShoot.shootDate
      ? new Date(selectedShoot.shootDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const deadlineStr = selectedShoot.estimatedCompletionDate
      ? new Date(selectedShoot.estimatedCompletionDate).toISOString().split('T')[0]
      : shootDateStr;

    setFormData((prev) => ({
      ...prev,
      eventSource: 'SHOOT',
      shootId: sId,
      clientId: selectedShoot.clientId || prev.clientId,
      brandId: selectedShoot.brandId || prev.brandId,
      productId: selectedShoot.productId || '',
      title: selectedShoot.name || prev.title,
      shootDate: shootDateStr,
      shootType: selectedShoot.shootType || 'INDOOR',
      location: selectedShoot.shootLocation || prev.location,
      locationCategory: selectedShoot.locationCategory || prev.locationCategory,
      clientApprovalDeadline: deadlineStr,
      deadline: deadlineStr,
      priority: selectedShoot.priority || 'MEDIUM',
      productionNotes: selectedShoot.notes || '',
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.eventSource) {
      alert('Event Source (GRAPHIC_REQUIREMENT or SHOOT) is required.');
      return;
    }
    if (formData.eventSource === 'GRAPHIC_REQUIREMENT' && !formData.graphicRequirementId) {
      alert('Please select an existing Graphic Requirement.');
      return;
    }
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
      setStatusFilter('ALL');
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
      eventSource: eventItem.eventSource || (eventItem.graphicRequirementId ? 'GRAPHIC_REQUIREMENT' : 'SHOOT'),
      graphicRequirementId: eventItem.graphicRequirementId || '',
      shootId: eventItem.shootId || '',
      title: eventItem.title || '',
      clientId: eventItem.clientId || '',
      brandId: eventItem.brandId || '',
      productId: eventItem.productId || '',
      campaign: eventItem.campaign || '',
      contentType: eventItem.contentType || 'Post',
      platform: eventItem.platform || 'Instagram',
      caption: eventItem.caption || '',
      creativePreviewUrl: eventItem.creativePreviewUrl || '',
      shootType: eventItem.shootType || 'INDOOR',
      shootDate: eventItem.shootDate ? new Date(eventItem.shootDate).toISOString().split('T')[0] : '',
      clientApprovalDeadline: eventItem.clientApprovalDeadline ? new Date(eventItem.clientApprovalDeadline).toISOString().split('T')[0] : '',
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
      saveAsDraft: false,
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    const defaultClient = clients.find((c) => c.status === 'ACTIVE')?.id || '';
    const defaultBrand = brands.find((b) => b.status === 'ACTIVE' && (!defaultClient || b.clientId === defaultClient))?.id || '';

    setFormData({
      eventSource: 'GRAPHIC_REQUIREMENT',
      graphicRequirementId: '',
      shootId: '',
      title: '',
      clientId: defaultClient,
      brandId: defaultBrand,
      productId: '',
      campaign: '',
      contentType: 'Post',
      platform: 'Instagram',
      caption: '',
      creativePreviewUrl: '',
      shootType: 'INDOOR',
      shootDate: new Date().toISOString().split('T')[0],
      clientApprovalDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
      saveAsDraft: false,
    });
  };

  const activeClients = clients.filter((c) => c.status === 'ACTIVE');
  const filteredBrands = brands.filter((b) => b.status === 'ACTIVE' && (!formData.clientId || b.clientId === formData.clientId));
  const filteredProducts = products.filter((p) => p.status === 'ACTIVE' && (!formData.brandId || p.brandId === formData.brandId));

  // Available equipment: exclude RETIRED, DAMAGED, LOST, UNDER_MAINTENANCE
  const availableEquipment = equipmentList.filter(
    (eq) => !eq.isArchived && !['UNDER_MAINTENANCE', 'DAMAGED', 'LOST', 'RETIRED'].includes(eq.availability)
  );

  const filteredStaffForModal = staffUsers.filter((u) => {
    if (!staffModalSearch.trim()) return true;
    const q = staffModalSearch.toLowerCase().trim();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.employeeProfile?.designation || '').toLowerCase().includes(q)
    );
  });

  const filteredEquipmentForModal = availableEquipment.filter((eq) => {
    if (!equipmentModalSearch.trim()) return true;
    const q = equipmentModalSearch.toLowerCase().trim();
    return (
      (eq.name || '').toLowerCase().includes(q) ||
      (eq.category || '').toLowerCase().includes(q)
    );
  });

  const canCreateEvents = ['MEDIA_MANAGER', 'SOCIAL_MEDIA_MANAGER', 'ADMINISTRATOR', 'ADMIN'].includes(user?.role || '');

  const filteredEvents = events.filter((evt) => {
    const isApproved = ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED'].includes(evt.status);
    const isMyCreatedEvent = Boolean(
      user?.id && (evt.createdById === user.id || evt.createdBy?.id === user.id)
    );

    // Business Rule: Unapproved/pending events on Media Calendar grid are ONLY shown if created by the logged in user or Marketing Manager
    if (!isApproved && !isMyCreatedEvent && user?.role !== 'MARKETING_MANAGER') {
      return false;
    }

    if (statusFilter === 'OPERATIONAL' || !statusFilter) {
      if (!isApproved) {
        return false;
      }
    } else if (statusFilter === 'PENDING_CLIENT_APPROVAL' || statusFilter === 'PENDING_CLIENT_REVIEW') {
      // "My Pending Creations" tab strictly shows pending events created by THIS logged-in user
      if ((evt.status !== 'PENDING_CLIENT_APPROVAL' && evt.status !== 'PENDING_CLIENT_REVIEW') || (!isMyCreatedEvent && user?.role !== 'MARKETING_MANAGER')) {
        return false;
      }
    } else if (statusFilter !== 'ALL' && evt.status !== statusFilter) {
      return false;
    }

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

          {(user?.role === 'MEDIA_MANAGER' || user?.role === 'SOCIAL_MEDIA_MANAGER' || user?.role === 'MARKETING_MANAGER') && (
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
        {/* Quick View Tab Pills */}
        <div className="flex items-center gap-2 pb-1 border-b border-gray-800 flex-wrap">
          <button
            onClick={() => setStatusFilter('OPERATIONAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'OPERATIONAL' || !statusFilter
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            Operational Calendar (Approved)
          </button>

          {canCreateEvents && (
            <button
              onClick={() => setStatusFilter('PENDING_CLIENT_APPROVAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'PENDING_CLIENT_APPROVAL' || statusFilter === 'PENDING_CLIENT_REVIEW'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-gray-900 text-amber-400 hover:text-white border border-gray-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> My Pending Creations
            </button>
          )}

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            All Events
          </button>
        </div>

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
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium text-xs"
                  >
                    <option value="">Operational Calendar (Approved Only)</option>
                    <option value="PENDING_CLIENT_APPROVAL">Pending Client Sign-off</option>
                    <option value="CHANGES_REQUESTED">Changes Requested by Client</option>
                    <option value="DRAFT">Draft Events</option>
                    <option value="REJECTED">Rejected Events</option>
                    <option value="ALL">All Events (Including Unapproved)</option>
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

                {(user?.role === 'MEDIA_MANAGER' || user?.role === 'SOCIAL_MEDIA_MANAGER') && eventItem.status !== 'CANCELLED' && (
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {(eventItem.status === 'DRAFT' || eventItem.status === 'CHANGES_REQUESTED') && (
                      <button
                        onClick={() => handleSubmitForApproval(eventItem.id)}
                        className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded text-[10px] flex items-center gap-1 shadow-sm"
                      >
                        <Send className="w-3 h-3" /> Submit to Client
                      </button>
                    )}
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
                    {user?.role === 'MEDIA_MANAGER' && (
                      <button
                        onClick={() => handleCancelEvent(eventItem.id)}
                        className="px-2 py-0.5 bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/50 rounded font-semibold text-[10px] flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" /> Cancel
                      </button>
                    )}
                  </div>
                )}

                {user?.role === 'MARKETING_MANAGER' && (
                  <div className="flex gap-1.5 flex-wrap items-center">
                    <button
                      onClick={() => openClientEdit(eventItem)}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-bold text-[10px] flex items-center gap-1 shadow-sm"
                    >
                      <Clock className="w-3 h-3" /> Edit Deadline &amp; Priority
                    </button>
                    <Link
                      href="/client-review"
                      className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded font-bold text-[10px] flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3 h-3" /> Review Portal
                    </Link>
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

            {/* SECTION 1: EVENT SOURCE / EVENT TYPE (REQUIRED) */}
            <div className="space-y-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Section 1 • Event Source &amp; Basic Details *
              </span>

              {/* Event Source Selection Radio Cards */}
              <div className="space-y-2">
                <label className="text-gray-200 font-bold text-xs block">
                  EVENT SOURCE / EVENT TYPE <span className="text-red-400">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormData((prev) => ({ ...prev, eventSource: 'GRAPHIC_REQUIREMENT', shootId: '' }))}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1 ${
                      formData.eventSource === 'GRAPHIC_REQUIREMENT'
                        ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/40 text-amber-300'
                        : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs flex items-center gap-1.5 text-white">
                        <FileText className="w-4 h-4 text-amber-400" />
                        1. GRAPHIC REQUIREMENT
                      </span>
                      <input
                        type="radio"
                        name="eventSource"
                        checked={formData.eventSource === 'GRAPHIC_REQUIREMENT'}
                        onChange={() => {}}
                        className="accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      Create event from an existing Graphic Requirement. Auto-populates client, brand, priority &amp; deadline.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormData((prev) => ({ ...prev, eventSource: 'SHOOT', graphicRequirementId: '' }))}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1 ${
                      formData.eventSource === 'SHOOT'
                        ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/40 text-amber-300'
                        : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs flex items-center gap-1.5 text-white">
                        <Video className="w-4 h-4 text-blue-400" />
                        2. SHOOT
                      </span>
                      <input
                        type="radio"
                        name="eventSource"
                        checked={formData.eventSource === 'SHOOT'}
                        onChange={() => {}}
                        className="accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      Create event from a Shoot. Link existing shoot or enter new shoot schedule details.
                    </p>
                  </div>
                </div>

                {/* Conditional Field: Select Graphic Requirement */}
                {formData.eventSource === 'GRAPHIC_REQUIREMENT' && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-amber-300 font-bold text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-400" /> Select Existing Graphic Requirement <span className="text-red-400">*</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        ({graphicRequirements.length} available)
                      </span>
                    </label>
                    <select
                      required
                      value={formData.graphicRequirementId}
                      onChange={(e) => handleGraphicReqSelect(e.target.value)}
                      className="w-full bg-gray-900 border border-amber-500/60 rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400 shadow-inner"
                    >
                      <option value="">-- Select Existing Graphic Requirement --</option>
                      {graphicRequirements.map((gr) => (
                        <option key={gr.id} value={gr.id}>
                          [{gr.requirementId || 'GR-REQ'}] {gr.name} — {gr.client?.name || 'Client'} ({gr.brand?.name || 'Brand'})
                        </option>
                      ))}
                    </select>

                    {graphicRequirements.length === 0 && (
                      <p className="text-[11px] text-amber-400/90 italic pt-1 flex items-center gap-1">
                        ⚠️ No Graphic Requirements currently exist in the database.
                      </p>
                    )}

                    {formData.graphicRequirementId && (
                      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-[11px] text-amber-300 flex items-center justify-between shadow-sm">
                        <span className="font-semibold">✨ Client, Brand, Title &amp; Deadline auto-populated from requirement</span>
                        <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 font-extrabold">
                          AUTO-LINKED
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Conditional Field: Select Shoot */}
                {formData.eventSource === 'SHOOT' && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-blue-300 font-bold text-xs flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" /> Select Existing Shoot (Optional Link)
                    </label>
                    <select
                      value={formData.shootId}
                      onChange={(e) => handleShootSelect(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- None / Custom Shoot Schedule --</option>
                      {shootProjectsList.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          [{sp.projectId || 'SP-PROJECT'}] {sp.name} ({sp.client?.name || 'Client'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-800/80">
                <div className="col-span-2">
                  <label className="text-gray-300 block mb-1 font-semibold">Event / Project Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Summer Campaign Banner or Product Shoot"
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
            <div className="space-y-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Section 4 • Assigned Team &amp; Required Equipment
                </span>
                <span className="text-[10px] text-gray-400">Click items to select/unselect instantly</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Custom Staff Multi-Select Control */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-200 font-bold text-xs flex items-center gap-1.5">
                      <span>Assigned Team (Select Staff)</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] border border-purple-500/30">
                        {formData.teamUserIds.length} Selected
                      </span>
                    </label>
                    {formData.teamUserIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, teamUserIds: [] })}
                        className="text-[10px] text-purple-400 hover:underline font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Selected Staff Chips */}
                  <div className="min-h-[38px] p-2 rounded-xl bg-gray-950/80 border border-gray-800 flex flex-wrap gap-1.5 items-center">
                    {formData.teamUserIds.length === 0 ? (
                      <span className="text-[11px] text-gray-500 italic px-1">
                        No team members selected. Click staff below to assign.
                      </span>
                    ) : (
                      formData.teamUserIds.map((uId) => {
                        const userObj = staffUsers.find((u) => u.id === uId);
                        if (!userObj) return null;
                        return (
                          <span
                            key={uId}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/60 text-purple-200 text-[11px] font-medium border border-purple-500/40"
                          >
                            <span>{userObj.name}</span>
                            <span className="text-[9px] text-purple-300 font-mono opacity-80">
                              ({userObj.employeeProfile?.designation || userObj.role})
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleTeamUser(uId)}
                              className="hover:text-white p-0.5 text-purple-400 rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Staff Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search staff by name or role..."
                      value={staffModalSearch}
                      onChange={(e) => setStaffModalSearch(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Clickable Staff Cards List */}
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1 bg-gray-900/90 border border-gray-800 rounded-xl p-1.5 scrollbar-thin">
                    {filteredStaffForModal.length === 0 ? (
                      <div className="p-3 text-center text-gray-500 text-[11px]">No staff found matching search.</div>
                    ) : (
                      filteredStaffForModal.map((u) => {
                        const isChecked = formData.teamUserIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => toggleTeamUser(u.id)}
                            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isChecked
                                ? 'bg-purple-950/40 border-purple-500/60 ring-1 ring-purple-500/30'
                                : 'bg-gray-900/40 border-gray-800/80 hover:bg-gray-800/60 hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-3.5 h-3.5 accent-purple-500 rounded border-gray-700 bg-gray-800 cursor-pointer shrink-0"
                              />
                              <div className="truncate">
                                <span className="text-xs font-semibold text-white block truncate">{u.name}</span>
                                <span className="text-[10px] text-gray-400 block truncate">
                                  {u.employeeProfile?.designation || u.role}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                isChecked
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : 'bg-gray-800 text-gray-400'
                              }`}
                            >
                              {u.role}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Custom Equipment Multi-Select Control */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-200 font-bold text-xs flex items-center gap-1.5">
                      <span>Required Equipment (Available Gear)</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] border border-blue-500/30">
                        {formData.equipmentIds.length} Reserved
                      </span>
                    </label>
                    {formData.equipmentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, equipmentIds: [] })}
                        className="text-[10px] text-blue-400 hover:underline font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Selected Equipment Chips */}
                  <div className="min-h-[38px] p-2 rounded-xl bg-gray-950/80 border border-gray-800 flex flex-wrap gap-1.5 items-center">
                    {formData.equipmentIds.length === 0 ? (
                      <span className="text-[11px] text-gray-500 italic px-1">
                        No equipment reserved. Click gear below to select.
                      </span>
                    ) : (
                      formData.equipmentIds.map((eqId) => {
                        const eqObj = availableEquipment.find((eq) => eq.id === eqId);
                        if (!eqObj) return null;
                        return (
                          <span
                            key={eqId}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/60 text-blue-200 text-[11px] font-medium border border-blue-500/40"
                          >
                            <span>📷 {eqObj.name}</span>
                            <span className="text-[9px] text-blue-300 font-mono opacity-80">({eqObj.category})</span>
                            <button
                              type="button"
                              onClick={() => toggleEquipment(eqId)}
                              className="hover:text-white p-0.5 text-blue-400 rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Equipment Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search gear by name or category..."
                      value={equipmentModalSearch}
                      onChange={(e) => setEquipmentModalSearch(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Clickable Equipment Cards List */}
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1 bg-gray-900/90 border border-gray-800 rounded-xl p-1.5 scrollbar-thin">
                    {filteredEquipmentForModal.length === 0 ? (
                      <div className="p-3 text-center text-gray-500 text-[11px]">No available equipment matches search.</div>
                    ) : (
                      filteredEquipmentForModal.map((eq) => {
                        const isChecked = formData.equipmentIds.includes(eq.id);
                        return (
                          <div
                            key={eq.id}
                            onClick={() => toggleEquipment(eq.id)}
                            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isChecked
                                ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/30'
                                : 'bg-gray-900/40 border-gray-800/80 hover:bg-gray-800/60 hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-3.5 h-3.5 accent-blue-500 rounded border-gray-700 bg-gray-800 cursor-pointer shrink-0"
                              />
                              <div className="truncate">
                                <span className="text-xs font-semibold text-white flex items-center gap-1 truncate">
                                  <span>📷</span> {eq.name}
                                </span>
                                <span className="text-[10px] text-gray-400 block truncate">{eq.category}</span>
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                isChecked
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : 'bg-gray-800 text-gray-400'
                              }`}
                            >
                              {eq.category}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
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

      {/* Marketing Manager Client Edit Modal (Deadline & Priority) */}
      {showClientEditModal && clientEditEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveClientSettings} className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base text-white">Client Review Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowClientEditModal(false);
                  setClientEditEvent(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-300 space-y-1">
              <p className="font-bold text-white line-clamp-1">{clientEditEvent.title}</p>
              <p className="text-gray-400 font-mono text-[10px]">
                Event ID: {clientEditEvent.eventId || clientEditEvent.id} • Client: {clientEditEvent.client?.name}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-gray-300 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Client Approval Deadline
                </label>
                <input
                  type="date"
                  value={clientDeadline}
                  onChange={(e) => setClientDeadline(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Client Event Priority
                </label>
                <select
                  value={clientPriority}
                  onChange={(e) => setClientPriority(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="LOW">LOW Priority</option>
                  <option value="MEDIUM">MEDIUM Priority</option>
                  <option value="HIGH">HIGH Priority</option>
                  <option value="CRITICAL">CRITICAL Priority</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-semibold text-[11px]">Audit Reason / Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Accelerated launch timeline requested by client..."
                  value={clientReason}
                  onChange={(e) => setClientReason(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white placeholder-gray-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowClientEditModal(false);
                  setClientEditEvent(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingClientSettings}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all"
              >
                {savingClientSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
