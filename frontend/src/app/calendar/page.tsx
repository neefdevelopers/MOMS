'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Calendar as CalendarIcon, Plus, Filter, Video, Sun, AlertTriangle, Clock, Edit, XCircle, ArrowRight, Search, SlidersHorizontal, RotateCcw, X, Building2, Camera, Flame, Send, ShieldCheck, FileText, User, ChevronLeft, ChevronRight, ArrowUpDown, MapPin, Eye, Zap, CheckCircle2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import ConvertEventToTaskModal from '@/components/tasks/ConvertEventToTaskModal';
import { TimelineView, TimelineEntry } from '@/components/common/TimelineView';

const APPROVED_CALENDAR_STATUSES = [
  'APPROVED',
  'CLIENT_APPROVED',
  'SCHEDULED',
  'PUBLISHED',
  'READY',
  'OPERATIONAL',
  'TASK_ASSIGNED',
  'IN_PRODUCTION',
  'WAITING_FOR_TECHNICAL_REVIEW',
  'TECHNICAL_REVIEW',
  'WAITING_FOR_MEDIA_REVIEW',
  'MEDIA_MANAGER_REVIEW',
  'WAITING_FOR_CLIENT_CONFIRMATION',
  'COMPLETED',
  'CLOSED',
];

const UNAPPROVED_CALENDAR_STATUSES = [
  'PENDING_MARKETING_APPROVAL',
  'PENDING_APPROVAL',
  'PENDING_CLIENT_APPROVAL',
  'PENDING_CLIENT_REVIEW',
  'WAITING_FOR_MARKETING_APPROVAL',
  'DRAFT',
  'CHANGES_REQUESTED',
  'REVISION_REQUESTED',
  'REJECTED',
];

const isSameCalendarDate = (dateVal: any, targetYear: number, targetMonth: number, targetDay: number): boolean => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;

  // 1. Local date match
  if (d.getFullYear() === targetYear && d.getMonth() === targetMonth && d.getDate() === targetDay) {
    return true;
  }
  // 2. UTC date match (handles ISO date-only strings like 2026-09-08 stored at UTC midnight)
  if (d.getUTCFullYear() === targetYear && d.getUTCMonth() === targetMonth && d.getUTCDate() === targetDay) {
    return true;
  }
  // 3. String prefix match (YYYY-MM-DD)
  if (typeof dateVal === 'string') {
    const targetStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
    if (dateVal.startsWith(targetStr)) {
      return true;
    }
  }
  return false;
};

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
  const [convertModalEvent, setConvertModalEvent] = useState<any>(null);

  // View Mode: month, week, day, all
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'all'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Project-Style Filtration Control Panel States
  const [searchQuery, setSearchQuery] = useState('');
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [brandIdFilter, setBrandIdFilter] = useState('');
  const [shootTypeFilter, setShootTypeFilter] = useState('');
  const [eventSourceFilter, setEventSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('OPERATIONAL');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editReason, setEditReason] = useState('');
  const [viewModalEvent, setViewModalEvent] = useState<any>(null);
  const [pendingEditNoticeEvent, setPendingEditNoticeEvent] = useState<any>(null);
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

  const isEventConvertedToTask = (eventItem: any) => {
    if (!eventItem) return false;
    const taskAssignedStatuses = [
      'TASK_ASSIGNED',
      'IN_PRODUCTION',
      'TECHNICAL_REVIEW',
      'WAITING_FOR_TECHNICAL_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'WAITING_FOR_CLIENT_CONFIRMATION',
      'COMPLETED',
      'CLOSED',
    ];
    if (taskAssignedStatuses.includes(eventItem.status)) return true;
    if (eventItem.shootProjects?.[0] && taskAssignedStatuses.includes(eventItem.shootProjects[0].status)) return true;
    if (eventItem.shoot && taskAssignedStatuses.includes(eventItem.shoot.status)) return true;
    if (eventItem.graphicRequirement && taskAssignedStatuses.includes(eventItem.graphicRequirement.status)) return true;
    if (eventItem.tasks && eventItem.tasks.length > 0) return true;
    if (eventItem.shootProjects?.[0]?.tasks && eventItem.shootProjects[0].tasks.length > 0) return true;
    if (eventItem.shoot?.tasks && eventItem.shoot.tasks.length > 0) return true;
    if (eventItem.graphicRequirement?.tasks && eventItem.graphicRequirement.tasks.length > 0) return true;
    return false;
  };

  const canConvertToTask = (eventItem: any) => {
    if (!eventItem) return false;
    const role = user?.role;
    const isMediaOrAdmin = role === 'MEDIA_MANAGER' || (role as string) === 'ADMIN' || (role as string) === 'ADMINISTRATOR';
    if (!isMediaOrAdmin) return false;
    if (isEventConvertedToTask(eventItem)) return false;

    // Check if event is marketing approved or ready
    const approvedStatuses = ['APPROVED', 'READY', 'APPROVED_BY_MARKETING', 'CLIENT_APPROVED'];
    const isApproved =
      approvedStatuses.includes(eventItem.status) ||
      eventItem.approvalStatus === 'APPROVED' ||
      eventItem.isApproved === true ||
      (eventItem.shootProjects?.[0] && approvedStatuses.includes(eventItem.shootProjects[0].status)) ||
      (eventItem.shoot && approvedStatuses.includes(eventItem.shoot.status)) ||
      (eventItem.graphicRequirement && approvedStatuses.includes(eventItem.graphicRequirement.status));

    return Boolean(isApproved);
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

  // Mandatory Schedule Event Form State
  const [formData, setFormData] = useState({
    eventSource: 'GRAPHIC_REQUIREMENT' as 'GRAPHIC_REQUIREMENT' | 'SHOOT',
    graphicRequirementId: '',
    shootId: '',
    projectId: '',
    title: '',
    clientId: '',
    brandId: '',
    productId: '',
    campaign: '',
    assignedStaffId: '',
    contentType: 'Post',
    platform: 'Instagram',
    caption: '',
    creativeAssetName: '',
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
    remarks: '',
    selectedDeliverables: ['Poster', 'Story'] as string[],
    saveAsDraft: false,

    // Outdoor shoot operational fields
    exactLocationAddress: '',
    locationAccessDetails: '',
    locationContact: '',
    permitRequired: 'NO',
    permitStatus: 'Not Applied',
    expectedWeatherConditions: 'Sunny',
    backupLocation: '',
    callTime: '07:00 AM',
    expectedWrapTime: '05:00 PM',
    specialOutdoorRequirements: '',
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [resEvents, resClients, resBrands, resProducts, resUsers, resEq, resGr, resProj] = await Promise.all([
        fetchApi('/calendar?status=ALL', { skipCache: true }).catch((err) => {
          console.error('Failed to fetch /calendar:', err);
          return [];
        }),
        fetchApi('/clients').catch(() => []),
        fetchApi('/brands').catch(() => []),
        fetchApi('/products').catch(() => []),
        fetchApi('/users').catch(() => []),
        fetchApi('/equipment').catch(() => []),
        fetchApi('/graphic-reqs?all=true').catch(() => []),
        fetchApi('/projects').catch(() => []),
      ]);

      const rawGr = Array.isArray(resGr) ? resGr : (resGr?.data || resGr?.requirements || resGr?.items || []);
      const rawProj = Array.isArray(resProj) ? resProj : (resProj?.data || resProj?.projects || resProj?.items || []);

      const rawEvents = Array.isArray(resEvents) ? resEvents : (resEvents?.data || resEvents?.events || resEvents?.items || []);
      setEvents(rawEvents);
      setClients(Array.isArray(resClients) ? resClients : []);
      setBrands(Array.isArray(resBrands) ? resBrands : []);
      setProducts(Array.isArray(resProducts) ? resProducts : []);
      setStaffUsers(Array.isArray(resUsers) ? resUsers : []);
      setEquipmentList(Array.isArray(resEq) ? resEq : []);
      setGraphicRequirements(rawGr);
      setShootProjectsList(rawProj);
    } catch (err) {
      console.error('Error loading calendar reference data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshGraphicReqs = async () => {
    try {
      const res = await fetchApi('/graphic-reqs?all=true');
      const raw = Array.isArray(res) ? res : (res?.data || res?.requirements || res?.items || []);
      setGraphicRequirements(raw);
    } catch (err) {
      console.error('Failed to refresh graphic requirements:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      alert(`This Graphic Requirement already has a Media Calendar Event (ID: ${existingEvent.eventId || existingEvent.id}).`);
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
      alert(`This Shoot already has a Media Calendar Event (ID: ${existingEvent.eventId || existingEvent.id}).`);
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
      alert('Event Type (Graphic Requirement or Project Shoot) is required.');
      return;
    }
    if (!formData.title.trim()) {
      alert('Requirement / Project Name is required.');
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

    if (formData.eventSource === 'GRAPHIC_REQUIREMENT') {
      if (!formData.contentType) {
        alert('Requirement Type is required.');
        return;
      }
      if (!formData.platform) {
        alert('Target Platform is required.');
        return;
      }
      if (!formData.caption.trim()) {
        alert('Objective / Design Brief is required.');
        return;
      }
      if (!formData.clientApprovalDeadline && !formData.shootDate) {
        alert('Target Completion Date is required.');
        return;
      }
    }

    const payload = {
      ...formData,
      assignedStaffId: formData.assignedStaffId || formData.teamUserIds[0] || null,
    };

    try {
      if (editingEvent) {
        const isApproved = APPROVED_CALENDAR_STATUSES.includes(editingEvent.status);

        if (isApproved && user?.role !== 'MARKETING_MANAGER' && (user?.role as string) !== 'ADMIN' && user?.role !== 'ADMINISTRATOR') {
          await fetchApi(`/calendar/${editingEvent.id}/edit-request`, {
            method: 'POST',
            body: JSON.stringify({
              requestedValues: payload,
              reason: editReason || 'Requested changes to approved calendar event',
            }),
          });
          alert('Edit Request Submitted!\n\nYour requested modifications have been sent to the Marketing Manager for approval. The original live event remains unchanged until approved.');
        } else {
          await fetchApi(`/calendar/${editingEvent.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        }
      } else {
        await fetchApi('/calendar', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowAddModal(false);
      setEditingEvent(null);
      setEditReason('');
      resetForm();
      setStatusFilter('ALL');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save calendar event');
    }
  };


  const openEdit = (eventItem: any) => {
    const isApproved = APPROVED_CALENDAR_STATUSES.includes(eventItem.status);
    const hasPendingEditRequest = (
      (eventItem.editRequests && eventItem.editRequests.some((r: any) => r.status === 'PENDING_MARKETING_APPROVAL')) ||
      Boolean(eventItem.editRequestedById)
    );

    if (isApproved && hasPendingEditRequest) {
      setPendingEditNoticeEvent(eventItem);
      return;
    }

    setEditingEvent(eventItem);
    const existingTeam = eventItem.shootProjects?.[0]?.assignedTeam?.map((tm: any) => tm.userId) || [];
    const existingEq = eventItem.shootProjects?.[0]?.equipmentReservations?.map((res: any) => res.equipmentId) || [];
    const staffId = eventItem.assignedStaffId || eventItem.assignedStaff?.id || existingTeam[0] || '';
    const outdoor = eventItem.shootProjects?.[0]?.outdoorDetails || {};

    setFormData({
      eventSource: eventItem.eventSource || (eventItem.graphicRequirementId ? 'GRAPHIC_REQUIREMENT' : 'SHOOT'),
      graphicRequirementId: eventItem.graphicRequirementId || '',
      shootId: eventItem.shootId || '',
      projectId: eventItem.graphicRequirements?.[0]?.projectId || eventItem.shootProjects?.[0]?.id || '',
      title: eventItem.title || '',
      clientId: eventItem.clientId || '',
      brandId: eventItem.brandId || '',
      productId: eventItem.productId || '',
      campaign: eventItem.campaign || '',
      contentType: eventItem.contentType || 'Post',
      platform: eventItem.platform || 'Instagram',
      caption: eventItem.caption || '',
      creativeAssetName: eventItem.creativeAssetName || '',
      creativePreviewUrl: eventItem.creativePreviewUrl || '',
      shootType: eventItem.shootType || 'INDOOR',
      shootDate: eventItem.shootDate ? new Date(eventItem.shootDate).toISOString().split('T')[0] : '',
      clientApprovalDeadline: eventItem.clientApprovalDeadline ? new Date(eventItem.clientApprovalDeadline).toISOString().split('T')[0] : '',
      deadline: eventItem.deadline ? new Date(eventItem.deadline).toISOString().split('T')[0] : (eventItem.shootProjects?.[0]?.estimatedCompletionDate ? new Date(eventItem.shootProjects[0].estimatedCompletionDate).toISOString().split('T')[0] : ''),
      startTime: eventItem.startTime || '09:00 AM',
      endTime: eventItem.endTime || '05:00 PM',
      location: eventItem.location || 'Main Studio Floor',
      locationCategory: eventItem.locationCategory || 'Studio Bay',
      assignedStaffId: staffId,
      teamUserIds: staffId && !existingTeam.includes(staffId) ? [staffId, ...existingTeam] : existingTeam,
      equipmentIds: existingEq,
      influencerTalent: eventItem.influencerTalent || '',
      priority: eventItem.priority || 'MEDIUM',
      productionNotes: eventItem.productionNotes || '',
      remarks: eventItem.remarks || '',
      selectedDeliverables: eventItem.selectedDeliverables || ['Poster', 'Story'],
      saveAsDraft: false,

      // Outdoor shoot operational fields
      exactLocationAddress: outdoor.exactLocationAddress || outdoor.locationAddress || eventItem.location || '',
      locationAccessDetails: outdoor.locationAccessDetails || '',
      locationContact: outdoor.locationContact || outdoor.locationContactPerson || '',
      permitRequired: outdoor.permitRequired || 'NO',
      permitStatus: outdoor.permitStatus || 'Not Applied',
      expectedWeatherConditions: outdoor.expectedWeatherConditions || 'Sunny',
      backupLocation: outdoor.backupLocation || '',
      callTime: outdoor.callTime || '07:00 AM',
      expectedWrapTime: outdoor.expectedWrapTime || '05:00 PM',
      specialOutdoorRequirements: outdoor.specialOutdoorRequirements || '',
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
      projectId: '',
      title: '',
      clientId: defaultClient,
      brandId: defaultBrand,
      productId: '',
      campaign: '',
      contentType: 'Post',
      platform: 'Instagram',
      caption: '',
      creativeAssetName: '',
      creativePreviewUrl: '',
      shootType: 'INDOOR',
      shootDate: new Date().toISOString().split('T')[0],
      clientApprovalDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      location: 'Main Studio Floor',
      locationCategory: 'Studio Bay',
      assignedStaffId: '',
      teamUserIds: [],
      equipmentIds: [],
      influencerTalent: '',
      priority: 'MEDIUM',
      productionNotes: '',
      remarks: '',
      selectedDeliverables: ['Poster', 'Story'],
      saveAsDraft: false,

      // Outdoor shoot operational fields
      exactLocationAddress: '',
      locationAccessDetails: '',
      locationContact: '',
      permitRequired: 'NO',
      permitStatus: 'Not Applied',
      expectedWeatherConditions: 'Sunny',
      backupLocation: '',
      callTime: '07:00 AM',
      expectedWrapTime: '05:00 PM',
      specialOutdoorRequirements: '',
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

  const canCreateEvents = ['MEDIA_MANAGER', 'MARKETING_MANAGER', 'ADMINISTRATOR', 'ADMIN', 'SOCIAL_MEDIA_MANAGER'].includes(user?.role || '');

  // Helper to compute date range for Month, Week, or Day
  const getPeriodRange = (mode: 'month' | 'week' | 'day' | 'all', refDate: Date) => {
    if (mode === 'all') return { start: null, end: null };

    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const date = refDate.getDate();

    if (mode === 'month') {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }

    if (mode === 'week') {
      const dayOfWeek = refDate.getDay();
      const diffToMon = refDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const start = new Date(year, month, diffToMon, 0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    // day mode
    const start = new Date(year, month, date, 0, 0, 0, 0);
    const end = new Date(year, month, date, 23, 59, 59, 999);
    return { start, end };
  };

  const navigatePeriod = (direction: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        newDate.setMonth(prev.getMonth() + direction);
      } else if (viewMode === 'week') {
        newDate.setDate(prev.getDate() + direction * 7);
      } else if (viewMode === 'day') {
        newDate.setDate(prev.getDate() + direction);
      }
      return newDate;
    });
  };

  const getPeriodTitle = () => {
    if (viewMode === 'all') return 'All Scheduled Events';
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const { start, end } = getPeriodRange('week', currentDate);
      if (!start || !end) return '';
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} – ${endStr}`;
    }
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }
    return '';
  };

  const filteredEvents = events
    .filter((evt) => {
      const isApproved = APPROVED_CALENDAR_STATUSES.includes(evt.status) && evt.approvalStatus !== 'PENDING_MARKETING_APPROVAL';
      const isPendingMarketing = evt.status === 'PENDING_MARKETING_APPROVAL' || evt.approvalStatus === 'PENDING_MARKETING_APPROVAL' || evt.status === 'WAITING_FOR_MARKETING_APPROVAL';
      const isPendingClient = evt.status === 'PENDING_CLIENT_APPROVAL' || evt.status === 'PENDING_CLIENT_REVIEW';
      const isRejected = evt.status === 'REJECTED' || evt.approvalStatus === 'REJECTED';
      const isDraft = evt.status === 'DRAFT';
      const isChangesRequested = evt.status === 'CHANGES_REQUESTED' || evt.status === 'REVISION_REQUESTED';
      const isPendingAny = isPendingMarketing || isPendingClient || isRejected || isDraft || isChangesRequested || UNAPPROVED_CALENDAR_STATUSES.includes(evt.status);

      // Status Filter Gating:
      // 1. Default Operational Calendar (Approved Only): Pending / unapproved / rejected events are strictly hidden
      if (!statusFilter || statusFilter === 'OPERATIONAL' || statusFilter === 'APPROVED' || statusFilter === 'CLIENT_APPROVED') {
        if (!isApproved || isPendingAny) {
          return false;
        }
      } else if (statusFilter === 'PENDING_APPROVAL') {
        // 2. Pending Approvals & Review tab / filter: Show all pending approval events (including REJECTED)
        if (!isPendingAny) {
          return false;
        }
      } else if (statusFilter === 'PENDING_MARKETING_APPROVAL') {
        if (!isPendingMarketing) {
          return false;
        }
      } else if (statusFilter === 'PENDING_CLIENT_APPROVAL' || statusFilter === 'PENDING_CLIENT_REVIEW') {
        if (!isPendingClient) {
          return false;
        }
      } else if (statusFilter === 'CHANGES_REQUESTED') {
        if (evt.status !== 'CHANGES_REQUESTED' && evt.status !== 'REVISION_REQUESTED') {
          return false;
        }
      } else if (statusFilter === 'DRAFT') {
        if (evt.status !== 'DRAFT') {
          return false;
        }
      } else if (statusFilter === 'REJECTED') {
        if (evt.status !== 'REJECTED' && evt.status !== 'CANCELLED' && evt.approvalStatus !== 'REJECTED') {
          return false;
        }
      } else if (statusFilter !== 'ALL') {
        if (evt.status !== statusFilter) {
          return false;
        }
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
      if (shootTypeFilter && evt.shootType !== shootTypeFilter) return false;
      if (eventSourceFilter && evt.eventSource !== eventSourceFilter) return false;
      if (priorityFilter && evt.priority !== priorityFilter) return false;
      if (dateFilter) {
        const eventDateVal = evt.shootDate || evt.clientApprovalDeadline || evt.createdAt;
        if (!eventDateVal) return false;
        const [dYear, dMonth, dDay] = dateFilter.split('-').map(Number);
        if (!isSameCalendarDate(eventDateVal, dYear, dMonth - 1, dDay)) {
          return false;
        }
      }

      // View Mode Date Range Filter (Month / Week / Day)
      if (viewMode !== 'all') {
        const eventDateVal = evt.shootDate || evt.clientApprovalDeadline || evt.createdAt;
        if (eventDateVal) {
          const evtDate = new Date(eventDateVal);
          const { start, end } = getPeriodRange(viewMode, currentDate);
          if (start && end) {
            const time = evtDate.getTime();
            if (time < start.getTime() || time > end.getTime()) {
              // Also check if the event matches the current period in UTC or local
              const localYear = evtDate.getFullYear();
              const localMonth = evtDate.getMonth();
              const utcYear = evtDate.getUTCFullYear();
              const utcMonth = evtDate.getUTCMonth();
              const refYear = currentDate.getFullYear();
              const refMonth = currentDate.getMonth();

              if (viewMode === 'month' && ((localYear === refYear && localMonth === refMonth) || (utcYear === refYear && utcMonth === refMonth))) {
                // Keep event in month
              } else {
                return false;
              }
            }
          }
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = a.shootDate || a.clientApprovalDeadline || a.createdAt;
      const dateB = b.shootDate || b.clientApprovalDeadline || b.createdAt;
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      if (timeA !== timeB) {
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return (a.title || '').localeCompare(b.title || '');
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" /> Operational Media Shoot Calendar
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Navigation Controls */}
          {viewMode !== 'all' && (
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
              <button
                onClick={() => navigatePeriod(-1)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                title="Previous Period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigatePeriod(1)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                title="Next Period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded transition-colors ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded transition-colors ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded transition-colors ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 rounded transition-colors ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              All
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Toggle Date Sort Order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
            <span>{sortOrder === 'asc' ? 'Earliest First' : 'Latest First'}</span>
          </button>

          {canCreateEvents && (
            <button
              onClick={() => {
                resetForm();
                refreshGraphicReqs();
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
      <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 text-xs shadow-md">
        {/* Quick View Tab Pills */}
        <div className="flex items-center gap-2 pb-1 border-b border-slate-200 flex-wrap">
          <button
            onClick={() => setStatusFilter('OPERATIONAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'OPERATIONAL' || !statusFilter
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Operational Calendar (Approved)
          </button>

          {canCreateEvents && (
            <button
              onClick={() => setStatusFilter('PENDING_APPROVAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'PENDING_APPROVAL' ||
                statusFilter === 'PENDING_CLIENT_APPROVAL' ||
                statusFilter === 'PENDING_MARKETING_APPROVAL' ||
                statusFilter === 'PENDING_CLIENT_REVIEW' ||
                statusFilter === 'REJECTED'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-50 text-amber-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Pending Approvals
              {events.filter((e) => UNAPPROVED_CALENDAR_STATUSES.includes(e.status) || e.approvalStatus === 'PENDING_MARKETING_APPROVAL' || e.status === 'PENDING_MARKETING_APPROVAL' || e.status === 'PENDING_CLIENT_APPROVAL' || e.status === 'REJECTED' || e.approvalStatus === 'REJECTED').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-mono font-bold ml-1">
                  {events.filter((e) => UNAPPROVED_CALENDAR_STATUSES.includes(e.status) || e.approvalStatus === 'PENDING_MARKETING_APPROVAL' || e.status === 'PENDING_MARKETING_APPROVAL' || e.status === 'PENDING_CLIENT_APPROVAL' || e.status === 'REJECTED' || e.approvalStatus === 'REJECTED').length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200'
            }`}
          >
            All Events
          </button>
        </div>

        {/* Top Search & Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search calendar events by Title, Client, Brand, Product, Talent, Notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl pl-9 pr-8 py-2.5 text-slate-800 font-medium focus:outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-900"
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
                showAdvancedFilters || (clientIdFilter || brandIdFilter || shootTypeFilter || eventSourceFilter || statusFilter || priorityFilter || dateFilter)
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
              <span>Advanced Filters</span>
              {([clientIdFilter, brandIdFilter, shootTypeFilter, eventSourceFilter, statusFilter, priorityFilter, dateFilter].filter(Boolean).length > 0) && (
                <span className="w-4 h-4 rounded-full bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center">
                  {[clientIdFilter, brandIdFilter, shootTypeFilter, eventSourceFilter, statusFilter, priorityFilter, dateFilter].filter(Boolean).length}
                </span>
              )}
            </button>

            {(searchQuery || clientIdFilter || brandIdFilter || shootTypeFilter || eventSourceFilter || statusFilter || priorityFilter || dateFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setClientIdFilter('');
                  setBrandIdFilter('');
                  setShootTypeFilter('');
                  setEventSourceFilter('');
                  setStatusFilter('');
                  setPriorityFilter('');
                  setDateFilter('');
                }}
                className="px-3 py-2 bg-rose-50 hover:bg-red-900/60 border border-rose-200 text-rose-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips / Pills */}
        {(clientIdFilter || brandIdFilter || shootTypeFilter || eventSourceFilter || statusFilter || priorityFilter || dateFilter) && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200">
            <span className="text-slate-400 text-[11px] font-semibold">Active Filters:</span>
            {clientIdFilter && (
              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full flex items-center gap-1 text-[11px]">
                Client: {clients.find((c) => c.id === clientIdFilter)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setClientIdFilter('')} />
              </span>
            )}
            {brandIdFilter && (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1 text-[11px]">
                Brand: [{brands.find((b) => b.id === brandIdFilter)?.shortCode}] {brands.find((b) => b.id === brandIdFilter)?.name}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setBrandIdFilter('')} />
              </span>
            )}
            {shootTypeFilter && (
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1 text-[11px]">
                Location: {shootTypeFilter === 'INDOOR' ? 'Indoor Studio' : 'Outdoor Field'}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setShootTypeFilter('')} />
              </span>
            )}
            {eventSourceFilter && (
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1 text-[11px]">
                Requirement: {eventSourceFilter === 'GRAPHIC_REQUIREMENT' ? 'Graphic Requirement' : 'Shoot Project'}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setEventSourceFilter('')} />
              </span>
            )}
            {statusFilter && (
              <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full flex items-center gap-1 text-[11px]">
                Status: {statusFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setStatusFilter('')} />
              </span>
            )}
            {priorityFilter && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full flex items-center gap-1 text-[11px]">
                Priority: {priorityFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setPriorityFilter('')} />
              </span>
            )}
            {dateFilter && (
              <span className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-full flex items-center gap-1 text-[11px] font-mono">
                Date: {dateFilter}
                <X className="w-3 h-3 cursor-pointer hover:text-slate-900" onClick={() => setDateFilter('')} />
              </span>
            )}
          </div>
        )}

        {/* Expandable Grouped Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Group 1: Commercial Context */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-purple-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" /> Commercial Context
                </div>
                <div className="space-y-2">
                  <select
                    value={clientIdFilter}
                    onChange={(e) => {
                      setClientIdFilter(e.target.value);
                      setBrandIdFilter('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white font-medium text-xs"
                  >
                    <option value="">All Clients</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={brandIdFilter}
                    onChange={(e) => setBrandIdFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white font-medium text-xs"
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

              {/* Group 2: Shoot Location & Requirements Source */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-cyan-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-600" /> Shoot Location &amp; Requirements
                </div>
                <div className="space-y-2">
                  <select
                    value={shootTypeFilter}
                    onChange={(e) => setShootTypeFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white font-medium text-xs"
                  >
                    <option value="">All Shoot Locations (Indoor &amp; Outdoor)</option>
                    <option value="INDOOR">Indoor Studio Shoot</option>
                    <option value="OUTDOOR">Outdoor Field Shoot</option>
                  </select>

                  <select
                    value={eventSourceFilter}
                    onChange={(e) => setEventSourceFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white font-medium text-xs"
                  >
                    <option value="">All Requirements &amp; Sources</option>
                    <option value="GRAPHIC_REQUIREMENT">Graphic Requirements Only</option>
                    <option value="SHOOT">Shoot Projects Only</option>
                  </select>
                </div>
              </div>

              {/* Group 3: Event Status */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-blue-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-blue-600" /> Event Status
                </div>
                <div className="space-y-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white font-medium text-xs"
                  >
                    <option value="">Operational Calendar (Approved Only)</option>
                    <option value="PENDING_APPROVAL">All Pending Approvals</option>
                    <option value="PENDING_MARKETING_APPROVAL">Pending Marketing Approval</option>
                    <option value="PENDING_CLIENT_APPROVAL">Pending Client Sign-off</option>
                    <option value="CHANGES_REQUESTED">Changes Requested by Client</option>
                    <option value="DRAFT">Draft Events</option>
                    <option value="REJECTED">Rejected Events</option>
                    <option value="ALL">All Events (Including Unapproved)</option>
                  </select>
                </div>
              </div>

              {/* Group 4: Priority & Date */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-amber-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600" /> Priority &amp; Shoot Date
                </div>
                <div className="space-y-2">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white font-medium text-xs"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Events Stream / Cards Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 capitalize">
            {getPeriodTitle()}
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-bold">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Sorted by Date ({sortOrder === 'asc' ? 'Earliest first' : 'Latest first'})
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading Calendar Events...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 space-y-2">
          <p>No calendar events scheduled for <strong className="text-slate-900">{getPeriodTitle()}</strong>.</p>
          {viewMode !== 'all' && (
            <button
              onClick={() => setViewMode('all')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              View All Scheduled Events
            </button>
          )}
        </div>
      ) : viewMode === 'month' ? (
        /* INTERACTIVE MONTH CALENDAR GRID VIEW */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl space-y-0">
          {/* Month Header Days of Week */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-500 py-3 font-mono uppercase tracking-wider">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Grid Cells */}
          {(() => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;
            const todayStr = new Date().toISOString().split('T')[0];

            const cells = [];
            for (let i = 0; i < totalCells; i++) {
              const dayNum = i - firstDayIndex + 1;
              const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;

              let cellDateStr = '';
              if (isCurrentMonth) {
                const cellDate = new Date(year, month, dayNum);
                const yyyy = cellDate.getFullYear();
                const mm = String(cellDate.getMonth() + 1).padStart(2, '0');
                const dd = String(cellDate.getDate()).padStart(2, '0');
                cellDateStr = `${yyyy}-${mm}-${dd}`;
              }

              const dayEvents = isCurrentMonth
                ? filteredEvents.filter((evt) =>
                    isSameCalendarDate(evt.shootDate || evt.clientApprovalDeadline || evt.createdAt, year, month, dayNum)
                  )
                : [];

              const isToday = isCurrentMonth && cellDateStr === todayStr;

              cells.push(
                <div
                  key={i}
                  className={`min-h-[125px] p-2 border-r border-b border-slate-200 transition-colors flex flex-col justify-between ${
                    !isCurrentMonth
                      ? 'bg-slate-50/40 text-gray-700 pointer-events-none'
                      : isToday
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                        isToday
                          ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                          : isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-gray-700'
                      }`}
                    >
                      {isCurrentMonth ? dayNum : ''}
                    </span>
                    {isCurrentMonth && dayEvents.length > 0 && (
                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                        {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                      </span>
                    )}
                  </div>

                  {/* Day Events Container */}
                  <div className="space-y-1 overflow-y-auto max-h-[90px] custom-scrollbar flex-1">
                    {dayEvents.map((evt) => {
                      const hasPendingEdit = evt.editRequests && evt.editRequests.some((r: any) => r.status === 'PENDING_MARKETING_APPROVAL');
                      const isRejected = evt.status === 'REJECTED' || evt.approvalStatus === 'REJECTED';
                      const isPending = UNAPPROVED_CALENDAR_STATUSES.includes(evt.status) || evt.approvalStatus === 'PENDING_MARKETING_APPROVAL';
                      return (
                        <div
                          key={evt.id}
                          onClick={() => setViewModalEvent(evt)}
                          className={`p-1.5 rounded text-[10px] font-semibold border cursor-pointer truncate transition-all shadow-xs flex items-center justify-between gap-1 ${
                            hasPendingEdit
                              ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                              : isRejected
                              ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100 font-bold'
                              : isPending
                              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                              : evt.shootType === 'INDOOR'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100'
                          }`}
                          title={`${evt.title} (${evt.client?.name || ''}) - Status: ${evt.status}`}
                        >
                          <span className="truncate flex items-center gap-1 font-sans">
                            {hasPendingEdit && <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title="Waiting for Edit Approval" />}
                            {!hasPendingEdit && isRejected && <span className="inline-block w-2 h-2 rounded-full bg-rose-600" title="Rejected by Marketing Manager" />}
                            {!hasPendingEdit && !isRejected && isPending && <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title="Pending Approval" />}
                            <span className="font-bold font-mono">[{evt.brand?.shortCode || 'EVT'}]</span>
                            {isRejected && <span className="text-rose-700 font-bold">[REJECTED]</span>}
                            <span>{evt.title}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return <div className="grid grid-cols-7 bg-white border-l border-t border-slate-200">{cells}</div>;
          })()}
        </div>
      ) : viewMode === 'week' ? (
        /* INTERACTIVE WEEK CALENDAR GRID VIEW */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl space-y-0">
          <div className="grid grid-cols-7 bg-white border-l border-t border-slate-200">
            {(() => {
              const { start } = getPeriodRange('week', currentDate);
              if (!start) return null;

              const todayStr = new Date().toISOString().split('T')[0];
              const weekDays = [];

              for (let i = 0; i < 7; i++) {
                const dayDate = new Date(start);
                dayDate.setDate(start.getDate() + i);

                const yyyy = dayDate.getFullYear();
                const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
                const dd = String(dayDate.getDate()).padStart(2, '0');
                const dayStr = `${yyyy}-${mm}-${dd}`;

                const dayEvents = filteredEvents.filter((evt) =>
                  isSameCalendarDate(
                    evt.shootDate || evt.clientApprovalDeadline || evt.createdAt,
                    dayDate.getFullYear(),
                    dayDate.getMonth(),
                    dayDate.getDate()
                  )
                );
                const isToday = dayStr === todayStr;

                weekDays.push(
                  <div
                    key={i}
                    className={`min-h-[320px] p-3 border-r border-b border-slate-200 transition-colors flex flex-col justify-between ${
                      isToday ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-slate-50/40'
                    }`}
                  >
                    <div className="border-b border-slate-200 pb-2 mb-2 flex flex-col items-center">
                      <span className="text-[11px] font-mono uppercase text-slate-500 font-bold">
                        {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span
                        className={`text-sm font-bold font-mono px-2 py-0.5 rounded-full mt-0.5 ${
                          isToday ? 'bg-blue-600 text-white font-extrabold' : 'text-slate-800'
                        }`}
                      >
                        {dayDate.getDate()}
                      </span>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[250px] custom-scrollbar flex-1">
                      {dayEvents.map((evt) => {
                        const hasPendingEdit = evt.editRequests && evt.editRequests.some((r: any) => r.status === 'PENDING_MARKETING_APPROVAL');
                        const isRejected = evt.status === 'REJECTED' || evt.approvalStatus === 'REJECTED';
                        const isPending = UNAPPROVED_CALENDAR_STATUSES.includes(evt.status) || evt.approvalStatus === 'PENDING_MARKETING_APPROVAL';
                        return (
                          <div
                            key={evt.id}
                            onClick={() => setViewModalEvent(evt)}
                            className={`p-2 rounded-lg text-xs font-semibold border cursor-pointer space-y-1 transition-all shadow-xs ${
                              hasPendingEdit
                                ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                                : isRejected
                                ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                                : isPending
                                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                : evt.shootType === 'INDOOR'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="font-bold">[{evt.brand?.shortCode || 'EVT'}]</span>
                              {hasPendingEdit ? (
                                <span className="text-amber-700 font-bold" title="Waiting for Edit Approval">PENDING EDIT</span>
                              ) : isRejected ? (
                                <span className="text-rose-700 font-bold px-1.5 py-0.2 bg-rose-100 rounded border border-rose-200" title="Rejected by Marketing Manager">REJECTED</span>
                              ) : isPending ? (
                                <span className="text-amber-700 font-bold" title="Pending Approval">PENDING</span>
                              ) : null}
                            </div>
                            <div className="font-bold text-slate-900 line-clamp-1">{evt.title}</div>
                            <div className="text-[10px] text-slate-700 truncate">{evt.client?.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return weekDays;
            })()}
          </div>
        </div>
      ) : (
        /* LIST / GRID CARDS VIEW (All & Day modes) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((eventItem) => (
            <div
              key={eventItem.id}
              className={`bg-white border p-5 rounded-xl space-y-3 relative transition-all ${
                eventItem.shootType === 'INDOOR' ? 'border-emerald-200' : 'border-purple-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {eventItem.eventSource === 'GRAPHIC_REQUIREMENT' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-amber-600" /> GRAPHIC REQ
                    </span>
                  ) : eventItem.shootType === 'INDOOR' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                      <Video className="w-3 h-3" /> INDOOR
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200 flex items-center gap-1">
                      <Sun className="w-3 h-3" /> OUTDOOR
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                    {new Date(eventItem.shootDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {eventItem.editRequests && eventItem.editRequests.some((r: any) => r.status === 'PENDING_MARKETING_APPROVAL') ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> WAITING FOR EDITING APPROVAL
                    </span>
                  ) : eventItem.status === 'REJECTED' || eventItem.approvalStatus === 'REJECTED' ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 uppercase flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-600" /> REJECTED BY MARKETING MANAGER
                    </span>
                  ) : eventItem.status === 'PENDING_MARKETING_APPROVAL' || eventItem.approvalStatus === 'PENDING_MARKETING_APPROVAL' || eventItem.status === 'WAITING_FOR_MARKETING_APPROVAL' ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> PENDING MARKETING APPROVAL
                    </span>
                  ) : eventItem.status === 'PENDING_CLIENT_APPROVAL' || eventItem.status === 'PENDING_CLIENT_REVIEW' ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-300 uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3 text-orange-600" /> PENDING CLIENT APPROVAL
                    </span>
                  ) : (
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        eventItem.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {eventItem.status}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 
                  onClick={() => setViewModalEvent(eventItem)}
                  className="text-sm font-bold text-slate-900 line-clamp-1 hover:text-blue-600 cursor-pointer transition-colors"
                  title="Click to view full Event Details"
                >
                  {eventItem.title}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {eventItem.client?.name} • <span className="text-blue-600 font-bold">[{eventItem.brand?.shortCode}]</span> {eventItem.brand?.name}
                </p>
              </div>

              {/* Rejection Card Alert Banner */}
              {(eventItem.status === 'REJECTED' || eventItem.approvalStatus === 'REJECTED') && (
                <div 
                  onClick={() => setViewModalEvent(eventItem)}
                  className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 cursor-pointer hover:border-rose-300 transition-all text-xs"
                  title="Click to view rejection details and feedback"
                >
                  <div className="flex items-center gap-1.5 font-bold text-rose-900 text-[11px]">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Rejected by Marketing Manager</span>
                  </div>
                  {(() => {
                    const rejectHist = Array.isArray(eventItem.approvalHistory)
                      ? eventItem.approvalHistory.find((ah: any) => ah.action === 'REJECT' || ah.action === 'OVERRIDE_REJECT' || ah.newStatus === 'REJECTED')
                      : null;
                    return rejectHist?.comment ? (
                      <p className="text-[10px] text-rose-800 italic pl-5 line-clamp-2">Feedback: "{rejectHist.comment}"</p>
                    ) : (
                      <p className="text-[10px] text-rose-700 pl-5">Event was rejected. You can edit and re-submit for review.</p>
                    );
                  })()}
                </div>
              )}

              {/* Waiting for Edit Approval Card Alert Banner */}
              {eventItem.editRequests && eventItem.editRequests.some((r: any) => r.status === 'PENDING_MARKETING_APPROVAL') && (
                <div 
                  onClick={() => setViewModalEvent(eventItem)}
                  className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-amber-900 text-[11px] font-bold cursor-pointer shadow-xs hover:border-amber-400 transition-all animate-pulse"
                  title="Click to view details of pending edit request"
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Waiting for Edit Approval</span>
                  </span>
                  <span className="text-[9px] font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 border border-amber-200">
                    Pending Review
                  </span>
                </div>
              )}

              {/* Sleek Minimalist Creator & Editor Audit Strip */}
              <div 
                onClick={() => setViewModalEvent(eventItem)}
                className="text-[11px] bg-slate-50/50 p-2.5 rounded-lg border border-slate-200 space-y-1 cursor-pointer hover:border-blue-200 transition-colors font-sans"
                title="Click to view full Event Details"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Created by:</span>
                    <strong className="text-slate-800 font-semibold">
                      {eventItem.createdBy?.name || (eventItem.createdByRole ? eventItem.createdByRole.replace(/_/g, ' ') : 'Media Team')}
                    </strong>
                    <span className="text-slate-400 text-[10px]">
                      ({eventItem.createdBy?.role ? eventItem.createdBy.role.replace(/_/g, ' ') : eventItem.createdByRole ? eventItem.createdByRole.replace(/_/g, ' ') : 'Creator'})
                    </span>
                  </span>
                </div>

                {(eventItem.lastModifiedBy || eventItem.lastModifiedAt) && (
                  <div className="flex items-center justify-between text-purple-700/90 pt-1 border-t border-slate-200">
                    <span className="flex items-center gap-1.5 truncate">
                      <Edit className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Edited by:</span>
                      <strong className="text-purple-900 font-semibold">
                        {eventItem.lastModifiedBy?.name || 'Authorized Editor'}
                      </strong>
                      {eventItem.lastModifiedBy?.role && (
                        <span className="text-purple-600/70 text-[10px]">
                          ({eventItem.lastModifiedBy.role.replace(/_/g, ' ')})
                        </span>
                      )}
                    </span>
                    {eventItem.lastModifiedAt && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                        {new Date(eventItem.lastModifiedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Event Source Info */}
              {eventItem.eventSource && (
                <div className="text-[10px] bg-slate-50/80 p-2 rounded-lg border border-slate-200 flex items-center justify-between text-slate-500 font-mono">
                  <span>Source: {eventItem.eventSource.replace('_', ' ')}</span>
                  <span className="text-amber-600 font-bold">
                    {eventItem.graphicRequirement?.requirementId || eventItem.shoot?.projectId || 'Custom'}
                  </span>
                </div>
              )}

              {eventItem.influencerTalent && (
                <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                  Talent/Model: <strong className="text-slate-900">{eventItem.influencerTalent}</strong>
                </div>
              )}

              {/* Outdoor Logistics Info (when present) */}
              {eventItem.shootProjects?.[0]?.outdoorDetails && (
                <div className="text-[10px] bg-purple-50 p-2.5 rounded-lg border border-purple-200 space-y-1 text-purple-900">
                  <div className="font-bold text-purple-700 uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-purple-600" /> Outdoor Shoot Details
                  </div>
                  <div><strong>Address:</strong> {eventItem.shootProjects[0].outdoorDetails.exactLocationAddress || eventItem.shootProjects[0].outdoorDetails.locationAddress}</div>
                  <div><strong>Access:</strong> {eventItem.shootProjects[0].outdoorDetails.locationAccessDetails || 'Standard'}</div>
                  <div className="flex justify-between pt-0.5 border-t border-purple-200 text-[9px]">
                    <span>Permit: {eventItem.shootProjects[0].outdoorDetails.permitRequired === 'YES' ? `YES (${eventItem.shootProjects[0].outdoorDetails.permitStatus || 'Pending'})` : 'NO'}</span>
                    <span className="font-mono">Call: {eventItem.shootProjects[0].outdoorDetails.callTime} • Wrap: {eventItem.shootProjects[0].outdoorDetails.expectedWrapTime}</span>
                  </div>
                </div>
              )}

              {/* Integrated Equipment Reservations (Business Rule 10) */}
              {eventItem.shootProjects?.[0]?.equipmentReservations?.length > 0 && (
                <div className="p-2 bg-purple-50 border border-purple-200 rounded text-[11px] text-purple-700 space-y-1">
                  <div className="font-bold text-purple-600 flex items-center gap-1 text-[10px] uppercase">
                    <Camera className="w-3 h-3 text-purple-600" /> Reserved Equipment
                  </div>
                  {eventItem.shootProjects[0].equipmentReservations.map((res: any) => (
                    <div key={res.id} className="flex justify-between items-center text-[10px] text-slate-700">
                      <span>{res.equipment?.name || 'Equipment'}</span>
                      <span className="text-purple-600 font-mono">({res.status})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
                {eventItem.shootProjects?.length > 0 ? (
                  <Link
                    href={`/projects/${eventItem.shootProjects[0].id}`}
                    className="text-emerald-600 hover:underline font-bold text-[11px] flex items-center gap-1"
                  >
                    View Project <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : eventItem.graphicRequirement?.id ? (
                  <Link
                    href={`/graphic-reqs?reqId=${eventItem.graphicRequirement.id}`}
                    className="text-amber-600 hover:underline font-bold text-[11px] flex items-center gap-1"
                  >
                    View Requirement <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : null}

                {(user?.role === 'MEDIA_MANAGER' || user?.role === 'SOCIAL_MEDIA_MANAGER' || user?.role === 'MARKETING_MANAGER' || user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') && eventItem.status !== 'CANCELLED' && (
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {canConvertToTask(eventItem) && (
                      <button
                        onClick={() => setConvertModalEvent(eventItem)}
                        className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-[10px] flex items-center gap-1 shadow-sm"
                        title="Convert approved event to task with staff assignment"
                      >
                        Convert to Task
                      </button>
                    )}
                    {isEventConvertedToTask(eventItem) && (
                      <span
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded text-[10px] flex items-center gap-1"
                        title="Task already created and assigned"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Task Assigned
                      </span>
                    )}
                    {(eventItem.status === 'REJECTED' || eventItem.approvalStatus === 'REJECTED') && (
                      <>
                        <button
                          onClick={() => openEdit(eventItem)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded text-[10px] flex items-center gap-1 shadow-sm"
                          title="Edit rejected event details and re-submit for Marketing Manager approval"
                        >
                          <Edit className="w-3 h-3" /> Edit &amp; Re-submit
                        </button>
                        <button
                          onClick={() => handleSubmitForApproval(eventItem.id)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[10px] flex items-center gap-1 shadow-sm"
                          title="Directly re-submit event for Marketing Manager approval"
                        >
                          <Send className="w-3 h-3" /> Re-submit
                        </button>
                      </>
                    )}
                    {(eventItem.status === 'DRAFT' || eventItem.status === 'CHANGES_REQUESTED') && (
                      <button
                        onClick={() => handleSubmitForApproval(eventItem.id)}
                        className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded text-[10px] flex items-center gap-1 shadow-sm"
                      >
                        <Send className="w-3 h-3" /> Submit to Client
                      </button>
                    )}
                    <button
                      onClick={() => setViewModalEvent(eventItem)}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-900 border border-blue-200 text-blue-700 rounded font-semibold text-[10px] flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Details
                    </button>
                    {!(eventItem.status === 'REJECTED' || eventItem.approvalStatus === 'REJECTED') && (
                      <button
                        onClick={() => openEdit(eventItem)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[10px] flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>
                )}

                {user?.role === 'MARKETING_MANAGER' && (
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {['PENDING_MARKETING_APPROVAL', 'WAITING_FOR_MARKETING_APPROVAL', 'PENDING_CLIENT_APPROVAL', 'PENDING_CLIENT_REVIEW', 'DRAFT', 'CHANGES_REQUESTED'].includes(eventItem.status) || eventItem.approvalStatus === 'PENDING_MARKETING_APPROVAL' ? (
                      <>
                        <button
                          onClick={() => openClientEdit(eventItem)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-500/30 text-amber-800 border border-amber-200 rounded font-bold text-[10px] flex items-center gap-1 shadow-sm"
                        >
                          <Clock className="w-3 h-3" /> Edit Deadline &amp; Priority
                        </button>
                        <Link
                          href={`/client-review?eventId=${eventItem.id}`}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-600/30 text-purple-700 border border-purple-200 rounded font-bold text-[10px] flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" /> Review Portal
                        </Link>
                      </>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        Approved & Handed Over to Media Operations
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl p-6 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  {editingEvent ? 'Edit Shoot Calendar Event' : 'Schedule New Shoot Event'}
                </h2>
                <p className="text-[11px] text-slate-500">All required production scheduling fields and team/equipment reservations</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEvent(null);
                }}
                className="text-slate-500 hover:text-slate-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Creator Metadata Banner when editing an existing event */}
            {editingEvent && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-blue-800 font-medium">
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Event Created By: <strong className="text-blue-900 font-bold">{editingEvent.createdBy?.name || (editingEvent.createdByRole ? editingEvent.createdByRole.replace(/_/g, ' ') : 'Creator')}</strong></span>
                </div>
                {(editingEvent.createdBy?.role || editingEvent.createdByRole) && (
                  <span className="px-2 py-0.5 bg-blue-100 border border-blue-200 text-blue-800 rounded font-mono text-[10px] font-bold uppercase">
                    {(editingEvent.createdBy?.role || editingEvent.createdByRole).replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            )}

            {/* Rejected Event Re-submission Alert Banner */}
            {editingEvent && (editingEvent.status === 'REJECTED' || editingEvent.approvalStatus === 'REJECTED') && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Editing Rejected Event — Will Re-submit for Marketing Manager Approval</span>
                </div>
                {(() => {
                  const rejectHistory = Array.isArray(editingEvent.approvalHistory)
                    ? editingEvent.approvalHistory.find((ah: any) => ah.action === 'REJECT' || ah.action === 'OVERRIDE_REJECT' || ah.newStatus === 'REJECTED')
                    : null;
                  return rejectHistory?.comment ? (
                    <p className="text-[11px] text-rose-800 bg-white/80 p-2.5 rounded-lg border border-rose-200 italic">
                      <strong>Marketing Manager Feedback:</strong> "{rejectHistory.comment}"
                    </p>
                  ) : null;
                })()}
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Update the fields below to address the review feedback. Saving this event will automatically update details and re-submit it for Marketing Manager approval.
                </p>
              </div>
            )}

            {/* Approved Event Edit Request Alert Banner */}
            {editingEvent && ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'OPERATIONAL', 'TASK_ASSIGNED', 'IN_PRODUCTION'].includes(editingEvent.status) && (user?.role === 'MEDIA_MANAGER' || user?.role === 'SOCIAL_MEDIA_MANAGER' || user?.role === 'MARKETING_MANAGER' || user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Approved Event — Modification Requires Marketing Approval</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  This event is approved. Submitting modifications creates an <strong>Edit Request</strong> for Marketing Manager approval. The live event data will remain unchanged until approved.
                </p>
                <div className="pt-1">
                  <label className="text-amber-900 font-bold block mb-1 text-[11px]">Reason for Edit Request (Optional):</label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="e.g. Production deadline change / client priority escalation..."
                    className="w-full bg-slate-50 border border-amber-300 rounded p-2 text-slate-900 text-xs placeholder-slate-400"
                  />
                </div>
              </div>
            )}

            {/* SECTION 1: EVENT TYPE & BASIC DETAILS */}
            <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                Section 1 • Event Type &amp; Basic Details *
              </span>

              {/* Event Type Selection Radio Cards */}
              <div className="space-y-2">
                <label className="text-slate-800 font-bold text-xs block">
                  EVENT TYPE <span className="text-rose-600">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, eventSource: 'GRAPHIC_REQUIREMENT', shootId: '' }));
                      refreshGraphicReqs();
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1 ${
                      formData.eventSource === 'GRAPHIC_REQUIREMENT'
                        ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500/40 text-amber-800'
                        : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:border-slate-200 hover:text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs flex items-center gap-1.5 text-slate-900">
                        <FileText className="w-4 h-4 text-amber-600" />
                        Graphic Requirement
                      </span>
                      <input
                        type="radio"
                        name="eventSource"
                        checked={formData.eventSource === 'GRAPHIC_REQUIREMENT'}
                        onChange={() => {}}
                        className="accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Create a complete Graphic Requirement brief &amp; schedule for client approval.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormData((prev) => ({ ...prev, eventSource: 'SHOOT', graphicRequirementId: '' }))}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1 ${
                      formData.eventSource === 'SHOOT'
                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500/40 text-blue-700'
                        : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:border-slate-200 hover:text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs flex items-center gap-1.5 text-slate-900">
                        <Video className="w-4 h-4 text-blue-600" />
                        Project Shoot
                      </span>
                      <input
                        type="radio"
                        name="eventSource"
                        checked={formData.eventSource === 'SHOOT'}
                        onChange={() => {}}
                        className="accent-blue-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Create a complete Indoor/Outdoor Project Shoot schedule &amp; logistics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Base Project Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                {formData.eventSource === 'SHOOT' && (
                  <div className="col-span-2 flex items-center justify-between bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                    <span className="text-blue-700 font-bold text-xs">Project ID (Auto-Generated)</span>
                    <span className="font-mono font-black text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                      SHOOT-AUTO
                    </span>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="text-slate-700 block mb-1 font-semibold">
                    {formData.eventSource === 'SHOOT' ? 'Project Name *' : 'Requirement Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={formData.eventSource === 'SHOOT' ? 'e.g. Summer Collection Outdoor Shoot' : 'e.g. Product Banner Graphic'}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Client *</label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-semibold"
                  >
                    <option value="">Select Active Client</option>
                    {activeClients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Brand *</label>
                  <select
                    required
                    value={formData.brandId}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-semibold"
                  >
                    <option value="">Select Active Brand</option>
                    {filteredBrands.map((b) => (
                      <option key={b.id} value={b.id}>[{b.shortCode}] {b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Product (Optional)</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  >
                    <option value="">None / General Shoot</option>
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.productCode})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Campaign (Optional)</label>
                  <input
                    type="text"
                    value={formData.campaign}
                    onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                    placeholder="e.g. Q3 Launch Campaign"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                  />
                </div>

                {formData.eventSource === 'GRAPHIC_REQUIREMENT' && (
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-slate-700 block mb-1 font-semibold">Parent Shoot Project (Optional)</label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full bg-slate-50 border border-purple-200 rounded p-2 text-slate-800 font-medium"
                    >
                      <option value="">-- Independent Graphic Requirement (No Parent Project) --</option>
                      {shootProjectsList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.projectId || 'SP'} • {p.name} ({p.client?.name || 'Client'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: GRAPHIC REQUIREMENT DETAILS */}
            {formData.eventSource === 'GRAPHIC_REQUIREMENT' && (
              <div className="space-y-4 bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" /> Section 2 • Graphic Requirement Details *
                  </span>
                  <span className="font-mono text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-amber-800 font-bold">
                    ID: GR-AUTO
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Requirement Type *</label>
                    <select
                      required
                      value={formData.contentType}
                      onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                      className="w-full bg-slate-50 border border-amber-200 rounded p-2 text-slate-800 font-bold"
                    >
                      <option value="Poster">Poster</option>
                      <option value="Carousel">Carousel Post</option>
                      <option value="Story">Story Design</option>
                      <option value="Banner">Web / Social Banner</option>
                      <option value="Thumbnail">Video Thumbnail</option>
                      <option value="Social Media Post">Social Media Post</option>
                      <option value="Motion Graphic">Motion Graphic</option>
                      <option value="Infographic">Infographic</option>
                      <option value="Header">Header / Cover</option>
                      <option value="Custom">Custom Design</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Target Platform *</label>
                    <select
                      required
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      className="w-full bg-slate-50 border border-amber-200 rounded p-2 text-slate-800 font-bold"
                    >
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Twitter/X">Twitter / X</option>
                      <option value="Website">Website</option>
                      <option value="Print">Print Media</option>
                      <option value="Multi-Platform">Multi-Platform</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Priority *</label>
                    <select
                      required
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-semibold"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Target Completion Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.clientApprovalDeadline}
                      onChange={(e) => setFormData({ ...formData, clientApprovalDeadline: e.target.value, deadline: e.target.value, shootDate: e.target.value })}
                      className="w-full bg-slate-50 border border-amber-200 rounded p-2 text-slate-800 font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-slate-800 font-bold block mb-1">Objective / Design Brief *</label>
                    <input
                      type="text"
                      required
                      value={formData.caption}
                      onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                      placeholder="e.g. Promote summer sale discount with vibrant product showcase"
                      className="w-full bg-slate-50 border border-amber-200 rounded p-2 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-slate-700 font-semibold block mb-1">Remarks &amp; Special Instructions (Optional)</label>
                    <textarea
                      rows={2}
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="Enter any permanent remarks, references, or special instructions..."
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    ></textarea>
                  </div>
                </div>

                {/* Produced Deliverables Formats Selection */}
                <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                  <label className="text-slate-800 font-bold block text-xs">
                    Produced Deliverables (Click to select/deselect deliverable formats to generate) *
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Poster' },
                      { name: 'Story' },
                      { name: 'Carousel' },
                      { name: 'Thumbnail' },
                      { name: 'Banner' },
                      { name: 'Motion Graphic' },
                      { name: 'Social Media Post' },
                      { name: 'Advertisement' },
                      { name: 'Packaging Design' },
                      { name: 'Website Creative' },
                    ].map((del) => {
                      const isSelected = (formData.selectedDeliverables || ['Poster', 'Story']).includes(del.name);
                      return (
                        <button
                          key={del.name}
                          type="button"
                          onClick={() => {
                            const current = formData.selectedDeliverables || ['Poster', 'Story'];
                            const next = isSelected
                              ? current.filter((d) => d !== del.name)
                              : [...current, del.name];
                            setFormData((prev) => ({ ...prev, selectedDeliverables: next }));
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-amber-500 text-gray-950 border-amber-400 font-bold shadow-md scale-[1.02]'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-200'
                          }`}
                        >
                          <span>{del.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-800 text-xs">
                  <span>Initial Status (Awaiting Marketing Manager Approval):</span>
                  <span className="font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                    PENDING_MARKETING_APPROVAL
                  </span>
                </div>
              </div>
            )}

            {/* SECTION 2: SHOOT SPECIFICS & SCHEDULE */}
            {formData.eventSource === 'SHOOT' ? (
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                  Section 2 • Project Shoot Base Details *
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Shoot Type *</label>
                    <select
                      required
                      value={formData.shootType}
                      onChange={(e) => setFormData({ ...formData, shootType: e.target.value })}
                      className="w-full bg-slate-50 border border-blue-200 rounded p-2 text-slate-800 font-bold"
                    >
                      <option value="INDOOR">Indoor Shoot</option>
                      <option value="OUTDOOR">Outdoor Shoot</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Shoot Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.shootDate}
                      onChange={(e) => setFormData({ ...formData, shootDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Estimated Completion Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-semibold"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-slate-700 block mb-1 font-semibold">Shoot Location *</label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Main Studio Floor or Kozhikode Beach"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Location Category *</label>
                    <select
                      value={formData.locationCategory}
                      onChange={(e) => setFormData({ ...formData, locationCategory: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-semibold"
                    >
                      <option value="Studio Bay">Studio Bay</option>
                      <option value="Main Studio Floor">Main Studio Floor</option>
                      <option value="On-Location">On-Location</option>
                      <option value="Client Premises">Client Premises</option>
                      <option value="Outdoor Landmark">Outdoor Landmark</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Reporting Time (Call Time) *</label>
                    <input
                      type="text"
                      required
                      value={formData.callTime || formData.startTime}
                      onChange={(e) => setFormData({ ...formData, callTime: e.target.value, startTime: e.target.value })}
                      placeholder="09:00 AM"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Expected Wrap-up Time *</label>
                    <input
                      type="text"
                      required
                      value={formData.expectedWrapTime || formData.endTime}
                      onChange={(e) => setFormData({ ...formData, expectedWrapTime: e.target.value, endTime: e.target.value })}
                      placeholder="06:00 PM"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-mono"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-slate-700 block mb-1 font-semibold">Influencer / Talent *</label>
                    <input
                      type="text"
                      required
                      value={formData.influencerTalent}
                      onChange={(e) => setFormData({ ...formData, influencerTalent: e.target.value })}
                      placeholder="e.g. Model Name / Talent Contact"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Project Priority *</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-semibold"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Urgent</option>
                    </select>
                  </div>

                  <div className="col-span-1 sm:col-span-3">
                    <label className="text-slate-700 block mb-1 font-semibold">Notes / Production Brief (Optional)</label>
                    <textarea
                      rows={2}
                      value={formData.productionNotes}
                      onChange={(e) => setFormData({ ...formData, productionNotes: e.target.value })}
                      placeholder="Enter production brief, shot list notes, client instructions..."
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-medium"
                    ></textarea>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-800 text-xs">
                  <span>Current Status (Initial Approval State):</span>
                  <span className="font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                    PENDING_MARKETING_APPROVAL
                  </span>
                </div>
              </div>
            ) : null}

            {/* DYNAMIC SECTION: OUTDOOR SHOOT DETAILS */}
            {formData.eventSource === 'SHOOT' && (formData.shootType === 'OUTDOOR' || formData.shootType === 'Outdoor Shoot') && (
              <div className="space-y-4 bg-purple-50 p-4 rounded-xl border border-purple-200 text-xs">
                <span className="text-[11px] font-black text-purple-700 uppercase tracking-wider block flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-600" /> --- OUTDOOR SHOOT DETAILS ---
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-slate-800 font-bold block mb-1">Exact Location / Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.exactLocationAddress}
                      onChange={(e) => setFormData({ ...formData, exactLocationAddress: e.target.value })}
                      placeholder="e.g. Kozhikode Beach, Kozhikode, Kerala"
                      className="w-full bg-slate-50 border border-purple-200 rounded p-2 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-slate-800 font-bold block mb-1">Location Access Details *</label>
                    <textarea
                      rows={2}
                      required
                      value={formData.locationAccessDetails}
                      onChange={(e) => setFormData({ ...formData, locationAccessDetails: e.target.value })}
                      placeholder="e.g. Parking availability, entry point, road access, restricted access notes..."
                      className="w-full bg-slate-50 border border-purple-200 rounded p-2 text-slate-800"
                    ></textarea>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Location Contact</label>
                    <input
                      type="text"
                      value={formData.locationContact}
                      onChange={(e) => setFormData({ ...formData, locationContact: e.target.value })}
                      placeholder="Contact Name / Phone / Manager"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Permit Required *</label>
                    <select
                      required
                      value={formData.permitRequired}
                      onChange={(e) => setFormData({ ...formData, permitRequired: e.target.value })}
                      className="w-full bg-slate-50 border border-purple-200 rounded p-2 text-slate-800 font-bold"
                    >
                      <option value="NO">NO</option>
                      <option value="YES">YES</option>
                    </select>
                  </div>

                  {formData.permitRequired === 'YES' && (
                    <div>
                      <label className="text-amber-800 font-bold block mb-1">Permit Status *</label>
                      <select
                        required
                        value={formData.permitStatus}
                        onChange={(e) => setFormData({ ...formData, permitStatus: e.target.value })}
                        className="w-full bg-slate-50 border border-amber-200 rounded p-2 text-slate-800 font-bold"
                      >
                        <option value="Not Applied">Not Applied</option>
                        <option value="Applied">Applied</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Expected Weather Conditions</label>
                    <select
                      value={formData.expectedWeatherConditions}
                      onChange={(e) => setFormData({ ...formData, expectedWeatherConditions: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-semibold"
                    >
                      <option value="Sunny">Sunny</option>
                      <option value="Cloudy">Cloudy</option>
                      <option value="Rain Expected">Rain Expected</option>
                      <option value="Windy">Windy</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Backup Location</label>
                    <input
                      type="text"
                      value={formData.backupLocation}
                      onChange={(e) => setFormData({ ...formData, backupLocation: e.target.value })}
                      placeholder="e.g. Indoor Studio 4"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Call Time *</label>
                    <input
                      type="text"
                      required
                      value={formData.callTime}
                      onChange={(e) => setFormData({ ...formData, callTime: e.target.value })}
                      placeholder="07:00 AM"
                      className="w-full bg-slate-50 border border-purple-200 rounded p-2 text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-800 font-bold block mb-1">Expected Wrap Time *</label>
                    <input
                      type="text"
                      required
                      value={formData.expectedWrapTime}
                      onChange={(e) => setFormData({ ...formData, expectedWrapTime: e.target.value })}
                      placeholder="05:00 PM"
                      className="w-full bg-slate-50 border border-purple-200 rounded p-2 text-slate-800 font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-slate-700 block mb-1 font-semibold">Special Outdoor Requirements</label>
                    <textarea
                      rows={2}
                      value={formData.specialOutdoorRequirements}
                      onChange={(e) => setFormData({ ...formData, specialOutdoorRequirements: e.target.value })}
                      placeholder="Power, tents, transport, safety gear, drone permissions..."
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
                    ></textarea>
                  </div>
                </div>
              </div>
            )}



            {/* SECTION: CREATIVE ASSETS & REFERENCE FILES (Link & Name Method) */}
            <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-indigo-600" /> Creative Assets &amp; Reference Files (File Name &amp; Link Method)
                </span>
                <span className="text-[10px] text-slate-500 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-indigo-800">
                  Cloud / URL Reference
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-800 font-bold block mb-1">Creative Asset / File Name</label>
                  <input
                    type="text"
                    value={formData.creativeAssetName || ''}
                    onChange={(e) => setFormData({ ...formData, creativeAssetName: e.target.value })}
                    placeholder="e.g. Summer_Sale_Main_Creative_v1 or Campaign_Assets_Drive"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-bold block mb-1">Asset Link / File URL (Cloud / Web Link)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      value={formData.creativePreviewUrl || ''}
                      onChange={(e) => setFormData({ ...formData, creativePreviewUrl: e.target.value })}
                      placeholder="https://drive.google.com/... or https://figma.com/..."
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 font-mono text-xs"
                    />
                    {formData.creativePreviewUrl && (
                      <a
                        href={formData.creativePreviewUrl.startsWith('http') ? formData.creativePreviewUrl : `https://${formData.creativePreviewUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-xs flex items-center gap-1 shrink-0"
                        title="Test and open link in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Test</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Preview Card if URL is provided */}
              {formData.creativePreviewUrl && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <strong className="text-slate-900 block truncate">
                        {formData.creativeAssetName || 'Creative Asset Reference'}
                      </strong>
                      <span className="text-[11px] font-mono text-indigo-700 truncate block">
                        {formData.creativePreviewUrl}
                      </span>
                    </div>
                  </div>
                  <a
                    href={formData.creativePreviewUrl.startsWith('http') ? formData.creativePreviewUrl : `https://${formData.creativePreviewUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Asset
                  </a>
                </div>
              )}
            </div>

            {/* NOTES */}
            <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
              <label className="text-slate-700 block mb-1 font-semibold">Notes (Optional)</label>
              <textarea
                rows={2}
                value={formData.productionNotes}
                onChange={(e) => setFormData({ ...formData, productionNotes: e.target.value })}
                placeholder="Additional information or instructions for the project shoot..."
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEvent(null);
                  setEditReason('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white rounded font-semibold transition-all ${
                  editingEvent && ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'OPERATIONAL', 'TASK_ASSIGNED', 'IN_PRODUCTION'].includes(editingEvent.status) && (user?.role === 'MEDIA_MANAGER' || user?.role === 'SOCIAL_MEDIA_MANAGER' || user?.role === 'MARKETING_MANAGER' || user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN')
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/30 font-bold'
                    : (editingEvent && (editingEvent.status === 'REJECTED' || editingEvent.approvalStatus === 'REJECTED'))
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30 font-extrabold'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30'
                }`}
              >
                {editingEvent
                  ? ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'OPERATIONAL', 'TASK_ASSIGNED', 'IN_PRODUCTION'].includes(editingEvent.status) && (user?.role === 'MEDIA_MANAGER' || user?.role === 'SOCIAL_MEDIA_MANAGER' || user?.role === 'MARKETING_MANAGER' || user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN')
                    ? 'Submit Edit Request'
                    : (editingEvent.status === 'REJECTED' || editingEvent.approvalStatus === 'REJECTED')
                    ? 'Save & Re-submit for Marketing Approval'
                    : 'Save Event'
                  : user?.role === 'SOCIAL_MEDIA_MANAGER' || user?.role === 'MEDIA_MANAGER'
                  ? 'Schedule Event (Requires Marketing Approval)'
                  : 'Schedule Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Marketing Manager Client Edit Modal (Deadline & Priority) */}
      {showClientEditModal && clientEditEvent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveClientSettings} className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-base text-slate-900">Client Review Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowClientEditModal(false);
                  setClientEditEvent(null);
                }}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 line-clamp-1">{clientEditEvent.title}</p>
              <p className="text-slate-500 font-mono text-[10px]">
                Event ID: {clientEditEvent.eventId || clientEditEvent.id} • Client: {clientEditEvent.client?.name}
              </p>
              <div className="text-slate-500 text-[11px] flex items-center gap-1 pt-1 border-t border-slate-200">
                <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Created by: <strong className="text-slate-800">{clientEditEvent.createdBy?.name || (clientEditEvent.createdByRole ? clientEditEvent.createdByRole.replace(/_/g, ' ') : 'Creator')}</strong></span>
                {(clientEditEvent.createdBy?.role || clientEditEvent.createdByRole) && (
                  <span className="text-[9px] font-mono text-slate-500">({(clientEditEvent.createdBy?.role || clientEditEvent.createdByRole).replace(/_/g, ' ')})</span>
                )}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Client Approval Deadline
                </label>
                <input
                  type="date"
                  value={clientDeadline}
                  onChange={(e) => setClientDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-600" /> Client Event Priority
                </label>
                <select
                  value={clientPriority}
                  onChange={(e) => setClientPriority(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="LOW">LOW Priority</option>
                  <option value="MEDIUM">MEDIUM Priority</option>
                  <option value="HIGH">HIGH Priority</option>
                  <option value="CRITICAL">CRITICAL Priority</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold text-[11px]">Audit Reason / Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Accelerated launch timeline requested by client..."
                  value={clientReason}
                  onChange={(e) => setClientReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowClientEditModal(false);
                  setClientEditEvent(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
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

      {/* Task Conversion Modal Popup */}
      <ConvertEventToTaskModal
        isOpen={!!convertModalEvent}
        onClose={() => setConvertModalEvent(null)}
        onSuccess={() => {
          loadData();
        }}
        eventData={
          convertModalEvent
            ? (() => {
                const isScript = Boolean(convertModalEvent.script?.id || convertModalEvent.scriptId || convertModalEvent.eventSource === 'SCRIPT');
                const isGraphicReq = Boolean(convertModalEvent.graphicRequirement?.id || convertModalEvent.graphicRequirementId || convertModalEvent.eventSource === 'GRAPHIC_REQUIREMENT');
                return {
                  title: convertModalEvent.title || '',
                  parentType: (isScript ? 'SCRIPT' : isGraphicReq ? 'GRAPHIC_REQ' : 'PROJECT') as 'PROJECT' | 'GRAPHIC_REQ' | 'SCRIPT',
                  parentId: isScript
                    ? (convertModalEvent.script?.id || convertModalEvent.scriptId || '')
                    : isGraphicReq
                    ? (convertModalEvent.graphicRequirement?.id || convertModalEvent.graphicRequirementId || '')
                    : (convertModalEvent.shootProjects?.[0]?.id || convertModalEvent.shootId || ''),
                  parentCode: isScript
                    ? (convertModalEvent.script?.scriptId || convertModalEvent.eventId || '')
                    : isGraphicReq
                    ? (convertModalEvent.graphicRequirement?.requirementId || convertModalEvent.eventId || '')
                    : (convertModalEvent.shootProjects?.[0]?.projectId || convertModalEvent.eventId || ''),
                  calendarEventId: convertModalEvent.id,
                  clientId: convertModalEvent.clientId,
                  brandId: convertModalEvent.brandId,
                  productId: convertModalEvent.productId,
                  priority: convertModalEvent.priority,
                  dueDate: convertModalEvent.clientApprovalDeadline || convertModalEvent.shootDate,
                  notes: convertModalEvent.productionNotes,
                  createdBy: convertModalEvent.createdBy,
                };
              })()
            : null
        }
      />

      {/* Event Details View Modal */}
      {viewModalEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase font-bold">
                    {viewModalEvent.eventId || `EVT-${viewModalEvent.id.substring(0, 6).toUpperCase()}`}
                  </span>
                  {viewModalEvent.editRequests && viewModalEvent.editRequests.some((r: any) => r.status === 'PENDING_MARKETING_APPROVAL') ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> WAITING FOR EDITING APPROVAL
                    </span>
                  ) : viewModalEvent.status === 'REJECTED' || viewModalEvent.approvalStatus === 'REJECTED' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 uppercase flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" /> REJECTED BY MARKETING MANAGER
                    </span>
                  ) : viewModalEvent.status === 'PENDING_MARKETING_APPROVAL' || viewModalEvent.approvalStatus === 'PENDING_MARKETING_APPROVAL' || viewModalEvent.status === 'WAITING_FOR_MARKETING_APPROVAL' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 uppercase flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> PENDING MARKETING APPROVAL
                    </span>
                  ) : viewModalEvent.status === 'PENDING_CLIENT_APPROVAL' || viewModalEvent.status === 'PENDING_CLIENT_REVIEW' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-300 uppercase flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-orange-600" /> PENDING CLIENT APPROVAL
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      {viewModalEvent.status}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                    {viewModalEvent.priority || 'MEDIUM'} PRIORITY
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{viewModalEvent.title}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Client: <strong className="text-slate-800">{viewModalEvent.client?.name}</strong> • Brand: <strong className="text-blue-600">[{viewModalEvent.brand?.shortCode}] {viewModalEvent.brand?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setViewModalEvent(null)}
                className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rejection Feedback Box with Re-submission Actions */}
            {(viewModalEvent.status === 'REJECTED' || viewModalEvent.approvalStatus === 'REJECTED') && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Event Rejected by Marketing Manager</span>
                </div>
                {(() => {
                  const rejectHistory = Array.isArray(viewModalEvent.approvalHistory)
                    ? viewModalEvent.approvalHistory.find((ah: any) => ah.action === 'REJECT' || ah.action === 'OVERRIDE_REJECT' || ah.newStatus === 'REJECTED')
                    : null;
                  return rejectHistory?.comment ? (
                    <div className="text-xs text-rose-900 pl-6 space-y-1">
                      <p className="font-semibold text-rose-800">Marketing Manager Feedback / Reason:</p>
                      <p className="italic bg-white/80 p-3 rounded-lg border border-rose-200 text-rose-950">"{rejectHistory.comment}"</p>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-700 pl-6">This event was rejected by the Marketing Manager. Please revise the event and re-submit.</p>
                  );
                })()}
                <div className="pt-1 pl-6 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const evt = viewModalEvent;
                      setViewModalEvent(null);
                      openEdit(evt);
                    }}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit &amp; Re-submit for Approval
                  </button>
                  <button
                    onClick={async () => {
                      const id = viewModalEvent.id;
                      setViewModalEvent(null);
                      await handleSubmitForApproval(id);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" /> Direct Re-submit
                  </button>
                </div>
              </div>
            )}

            {/* CREATOR INFORMATION HIGHLIGHT BOX */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block">Created By (Event Owner)</span>
                  <span className="text-sm font-bold text-slate-900 block">
                    {viewModalEvent.createdBy?.name || (viewModalEvent.createdByRole ? viewModalEvent.createdByRole.replace(/_/g, ' ') : 'Media Operations Team')}
                  </span>
                  {viewModalEvent.createdBy?.email && (
                    <span className="text-xs text-slate-600 block">{viewModalEvent.createdBy.email}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white text-blue-800 border border-blue-200 uppercase font-bold block mb-1 shadow-xs">
                  {viewModalEvent.createdBy?.role ? viewModalEvent.createdBy.role.replace(/_/g, ' ') : viewModalEvent.createdByRole ? viewModalEvent.createdByRole.replace(/_/g, ' ') : 'CREATOR'}
                </span>
                {viewModalEvent.createdAt && (
                  <span className="text-[10px] text-slate-600 font-mono">
                    Created: {new Date(viewModalEvent.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* LAST EDITED BY & MODIFIED TIMESTAMP HIGHLIGHT BOX */}
            {(viewModalEvent.lastModifiedBy || viewModalEvent.lastModifiedAt) && (
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between shadow-xs text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                    <Edit className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 block">Last Edited By</span>
                    <span className="text-sm font-bold text-slate-900">
                      {viewModalEvent.lastModifiedBy?.name || 'Authorized Editor'}
                    </span>
                    {viewModalEvent.lastModifiedBy?.role && (
                      <span className="text-[10px] text-purple-800 block font-mono">
                        Role: {viewModalEvent.lastModifiedBy.role.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
                {viewModalEvent.lastModifiedAt && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">Edited On</span>
                    <span className="text-xs text-purple-900 font-bold font-mono block">
                      {new Date(viewModalEvent.lastModifiedAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(viewModalEvent.lastModifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold uppercase text-[10px] tracking-wider text-blue-600 border-b border-slate-200 pb-1">Schedule & Workflow</div>
                <div><span className="text-slate-500">Shoot Date:</span> <strong className="text-slate-900 ml-1">{new Date(viewModalEvent.shootDate).toLocaleDateString()}</strong></div>
                <div><span className="text-slate-500">Approval Deadline:</span> <strong className="text-amber-600 ml-1">{viewModalEvent.clientApprovalDeadline ? new Date(viewModalEvent.clientApprovalDeadline).toLocaleDateString() : 'N/A'}</strong></div>
                <div><span className="text-slate-500">Shoot Type:</span> <strong className="text-slate-900 ml-1">{viewModalEvent.shootType}</strong></div>
                <div><span className="text-slate-500">Platform:</span> <strong className="text-slate-900 ml-1">{viewModalEvent.platform || 'Instagram'}</strong></div>
                <div><span className="text-slate-500">Content Format:</span> <strong className="text-slate-900 ml-1">{viewModalEvent.contentType || 'Post'}</strong></div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold uppercase text-[10px] tracking-wider text-emerald-600 border-b border-slate-200 pb-1">Governance & Responsibilities</div>
                <div>
                  <span className="text-slate-500">Event Creator:</span>{' '}
                  <strong className="text-slate-900 ml-1">
                    {viewModalEvent.createdBy?.name || (viewModalEvent.createdByRole ? viewModalEvent.createdByRole.replace(/_/g, ' ') : 'Media Operations Team')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Responsible Approver:</span>{' '}
                  <strong className="text-slate-900 ml-1">{viewModalEvent.approvalAssignedTo?.name || 'Marketing Manager'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Assigned Staff:</span>{' '}
                  <strong className="text-slate-900 ml-1">{viewModalEvent.assignedStaff?.name || 'Unassigned'}</strong>
                </div>
              </div>
            </div>

            {/* Pending Edit Request Alert Banner in Details Modal */}
            {viewModalEvent.editRequests && viewModalEvent.editRequests.some((r: any) => r.status === 'PENDING_MARKETING_APPROVAL') && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-900">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pending Edit Request Awaiting Marketing Manager Review</span>
                </div>
                {(() => {
                  const pendingReq = viewModalEvent.editRequests.find((r: any) => r.status === 'PENDING_MARKETING_APPROVAL');
                  return (
                    <div className="text-[11px] space-y-1 bg-amber-50 p-2.5 rounded-lg border border-amber-200 font-mono">
                      <div>Requested By: <strong className="text-slate-900">{pendingReq.requestedBy?.name || 'Media Manager'}</strong></div>
                      <div>Submitted On: <span className="text-amber-800">{new Date(pendingReq.createdAt).toLocaleString()}</span></div>
                      {pendingReq.reason && <div>Reason: <span className="italic text-slate-700">"{pendingReq.reason}"</span></div>}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* CREATIVE ASSETS & REFERENCE FILES CARD */}
            {viewModalEvent.creativePreviewUrl && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-indigo-600" /> Attached Creative Asset &amp; Reference File
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">
                    File Reference
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="space-y-0.5 overflow-hidden">
                    <span className="text-slate-900 font-bold text-sm block truncate">
                      {viewModalEvent.creativeAssetName || 'Primary Creative Asset'}
                    </span>
                    <span className="text-indigo-700 font-mono text-xs truncate block">
                      {viewModalEvent.creativePreviewUrl}
                    </span>
                  </div>
                  <a
                    href={viewModalEvent.creativePreviewUrl.startsWith('http') ? viewModalEvent.creativePreviewUrl : `https://${viewModalEvent.creativePreviewUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-sm transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Asset Link
                  </a>
                </div>
              </div>
            )}

            {/* Production Notes */}
            {viewModalEvent.productionNotes && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Production Notes & Requirements</div>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{viewModalEvent.productionNotes}</p>
              </div>
            )}

            {/* PERMANENT EVENT TIMELINE & UPDATIONS HISTORY SECTION */}
            {(() => {
              const timelineEntries: TimelineEntry[] = [];

              // 1. Creation event
              if (viewModalEvent.createdAt || viewModalEvent.shootDate) {
                timelineEntries.push({
                  id: `created-${viewModalEvent.id}`,
                  createdAt: viewModalEvent.createdAt || viewModalEvent.shootDate,
                  action: 'EVENT_CREATED',
                  user: viewModalEvent.createdBy || { name: viewModalEvent.createdByRole ? viewModalEvent.createdByRole.replace(/_/g, ' ') : 'Media Operations' },
                  description: `Media calendar event "${viewModalEvent.title || viewModalEvent.name || viewModalEvent.eventId}" scheduled for ${viewModalEvent.shootDate ? new Date(viewModalEvent.shootDate).toLocaleDateString() : 'shoot'}. Initial Status: ${(viewModalEvent.status || 'DRAFT').replace(/_/g, ' ')}.`,
                });
              }

              // 2. Approval History
              if (Array.isArray(viewModalEvent.approvalHistory)) {
                viewModalEvent.approvalHistory.forEach((ah: any, idx: number) => {
                  timelineEntries.push({
                    id: ah.id || `ah-${idx}`,
                    createdAt: ah.timestamp || ah.createdAt,
                    action: ah.action || 'APPROVAL_UPDATE',
                    user: ah.user || { role: ah.role || 'MARKETING_MANAGER' },
                    description: ah.comment || (ah.newStatus ? `Status transitioned from ${ah.previousStatus || 'NONE'} to ${ah.newStatus}` : 'Approval action recorded'),
                    remarks: ah.comment,
                  });
                });
              }

              // 3. Edit Histories
              if (Array.isArray(viewModalEvent.editHistories)) {
                viewModalEvent.editHistories.forEach((eh: any, idx: number) => {
                  const changesObj = typeof eh.changes === 'string' ? JSON.parse(eh.changes || '{}') : (eh.changes || {});
                  timelineEntries.push({
                    id: eh.id || `eh-${idx}`,
                    createdAt: eh.approvedAt || eh.createdAt,
                    action: 'EDIT_APPROVED_AND_APPLIED',
                    user: eh.approvedBy || { name: 'Marketing Manager' },
                    description: `Edit requested by ${eh.requestedBy?.name || 'Media Manager'} was approved and applied.`,
                    changes: changesObj,
                  });
                });
              }

              // 4. Edit Requests
              if (Array.isArray(viewModalEvent.editRequests)) {
                viewModalEvent.editRequests.forEach((er: any, idx: number) => {
                  if (er.status === 'PENDING_MARKETING_APPROVAL') {
                    timelineEntries.push({
                      id: er.id || `er-${idx}`,
                      createdAt: er.createdAt,
                      action: 'EDIT_REQUEST_SUBMITTED',
                      user: er.requestedBy || { name: 'Media Manager' },
                      description: `Edit request submitted: "${er.reason || 'Proposed updates awaiting review'}"`,
                    });
                  } else if (er.status === 'REJECTED') {
                    timelineEntries.push({
                      id: er.id || `er-${idx}`,
                      createdAt: er.reviewedAt || er.updatedAt || er.createdAt,
                      action: 'EDIT_REJECTED',
                      user: er.reviewedBy || { name: 'Marketing Manager' },
                      description: `Edit request rejected. Reason: "${er.rejectionReason || er.reason || 'Changes not approved'}"`,
                    });
                  }
                });
              }

              // 5. Staff Assignment
              if (viewModalEvent.assignedStaff && viewModalEvent.assignedStaff.name) {
                timelineEntries.push({
                  id: `assigned-${viewModalEvent.id}`,
                  createdAt: viewModalEvent.createdAt || viewModalEvent.shootDate,
                  action: 'STAFF_ASSIGNED',
                  user: viewModalEvent.approvalAssignedTo || viewModalEvent.createdBy || { name: 'Management' },
                  description: `Event assigned to staff member: ${viewModalEvent.assignedStaff.name} (${viewModalEvent.assignedStaff.role ? viewModalEvent.assignedStaff.role.replace(/_/g, ' ') : 'Staff'})`,
                });
              }

              return (
                <TimelineView
                  entries={timelineEntries}
                  title="Event Lifecycle & Timeline History"
                  order="desc"
                  emptyMessage="No event lifecycle history recorded yet."
                />
              );
            })()}

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div>
                {canConvertToTask(viewModalEvent) && (
                  <button
                    onClick={() => { setViewModalEvent(null); setConvertModalEvent(viewModalEvent); }}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" /> Convert to Task
                  </button>
                )}
                {isEventConvertedToTask(viewModalEvent) && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Task Assigned &amp; In Production</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(viewModalEvent.status === 'REJECTED' || viewModalEvent.approvalStatus === 'REJECTED') ? (
                  <>
                    <button
                      onClick={async () => {
                        const id = viewModalEvent.id;
                        setViewModalEvent(null);
                        await handleSubmitForApproval(id);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" /> Re-submit for Approval
                    </button>
                    <button
                      onClick={() => { setViewModalEvent(null); openEdit(viewModalEvent); }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit &amp; Re-submit Event
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setViewModalEvent(null); openEdit(viewModalEvent); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Event
                  </button>
                )}
                <button
                  onClick={() => setViewModalEvent(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Pending Edit Request Warning Modal Popup */}
      {pendingEditNoticeEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-amber-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setPendingEditNoticeEvent(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-lg shadow-amber-500/10">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                  Edit Request Pending
                </span>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  Already Waiting for Approval
                </h3>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
              <p className="leading-relaxed">
                An edit request for <strong className="text-slate-900">"{pendingEditNoticeEvent.title}"</strong> has already been submitted and is currently pending Marketing Manager review.
              </p>
              <p className="text-slate-700">
                Please wait for the Marketing Manager to review the current request before submitting additional changes.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPendingEditNoticeEvent(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-colors shadow-lg shadow-amber-500/20"
              >
                Understood, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
