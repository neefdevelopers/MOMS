'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft,
  Edit2,
  Film,
  Building2,
  AlertTriangle,
  Wrench,
  Sparkles,
  ArrowRightLeft,
  Calendar,
  User,
  MapPin,
  MoreVertical,
  CheckCircle2,
  X,
  History,
} from 'lucide-react';

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();
  const userRole = user?.role as string | undefined;
  const isManager = userRole === 'ADMIN' || userRole === 'ADMINISTRATOR' || userRole === 'MEDIA_MANAGER' || userRole === 'TECHNICAL_MANAGER';

  const [item, setItem] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [shootProjects, setShootProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Forms
  const [assignForm, setAssignForm] = useState({
    shootProjectId: '',
    assignmentNotes: '',
    expectedReturnDate: '',
  });

  const [returnForm, setReturnForm] = useState({
    condition: 'GOOD',
    returnNotes: '',
    damageDescription: '',
    maintenanceNotes: '',
  });

  const [rentForm, setRentForm] = useState({
    customerName: '',
    contactInfo: '',
    startDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    rentalFee: '',
    rentalNotes: '',
  });

  const [damageForm, setDamageForm] = useState({
    damageType: 'PHYSICAL',
    description: '',
    severity: 'MEDIUM',
    notes: '',
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    problem: '',
    expectedCompletionDate: '',
    notes: '',
  });

  const [readyForm, setReadyForm] = useState({
    inspectionNotes: 'Equipment tested, verified functional and restored to deployment status.',
    condition: 'EXCELLENT',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    brand: '',
    model: '',
    serialNumber: '',
    storageLocation: '',
    condition: 'GOOD',
    internalNotes: '',
  });

  const loadDetails = async () => {
    setLoading(true);
    try {
      const [eqData, timelineData, projectsData] = await Promise.all([
        fetchApi(`/equipment/${id}`),
        fetchApi(`/equipment/${id}/timeline`).catch(() => []),
        fetchApi('/shoot-projects').catch(() => []),
      ]);

      if (eqData) {
        setItem(eqData);
        setEditForm({
          name: eqData.name || '',
          category: eqData.category || '',
          brand: eqData.brand || '',
          model: eqData.model || '',
          serialNumber: eqData.serialNumber || '',
          storageLocation: eqData.storageLocation || '',
          condition: eqData.condition || 'GOOD',
          internalNotes: eqData.internalNotes || '',
        });
      }
      if (Array.isArray(timelineData)) setTimeline(timelineData);
      if (Array.isArray(projectsData)) setShootProjects(projectsData);
    } catch (err) {
      console.error('Failed to load equipment details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadDetails();
  }, [id]);

  const openActionModal = (type: string) => {
    setActionError(null);
    if (type === 'ASSIGN_SHOOT') {
      setAssignForm({
        shootProjectId: '',
        assignmentNotes: '',
        expectedReturnDate: '',
      });
    } else if (type === 'RENT_OUT') {
      setRentForm({
        customerName: '',
        contactInfo: '',
        startDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: '',
        rentalFee: '',
        rentalNotes: '',
      });
    } else if (type === 'RETURN') {
      setReturnForm({
        condition: 'GOOD',
        returnNotes: '',
        damageDescription: '',
        maintenanceNotes: '',
      });
    } else if (type === 'DAMAGE') {
      setDamageForm({
        damageType: 'PHYSICAL',
        description: '',
        severity: 'MEDIUM',
        notes: '',
      });
    } else if (type === 'MAINTENANCE') {
      setMaintenanceForm({
        problem: item?.condition === 'DAMAGED' ? 'Repair reported damage' : '',
        expectedCompletionDate: '',
        notes: '',
      });
    } else if (type === 'READY') {
      setReadyForm({
        inspectionNotes: 'Equipment tested, verified functional and restored to deployment status.',
        condition: 'GOOD',
      });
    }
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setActionError(null);
  };

  // Action submit handlers
  const handleAssignShoot = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await fetchApi(`/equipment/${id}/assign-shoot`, {
        method: 'POST',
        body: JSON.stringify(assignForm),
      });
      closeModal();
      loadDetails();
    } catch (err: any) {
      setActionError(err.message || 'Failed to assign equipment to Shoot Project.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnShoot = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await fetchApi(`/equipment/${id}/return-shoot`, {
        method: 'POST',
        body: JSON.stringify(returnForm),
      });
      closeModal();
      loadDetails();
    } catch (err: any) {
      setActionError(err.message || 'Failed to return equipment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRentOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await fetchApi(`/equipment/${id}/rent-out`, {
        method: 'POST',
        body: JSON.stringify({
          ...rentForm,
          rentalFee: rentForm.rentalFee ? parseFloat(rentForm.rentalFee) : undefined,
        }),
      });
      closeModal();
      loadDetails();
    } catch (err: any) {
      setActionError(err.message || 'Failed to rent out equipment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnRental = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await fetchApi(`/equipment/${id}/return-rental`, {
        method: 'POST',
        body: JSON.stringify(returnForm),
      });
      closeModal();
      loadDetails();
    } catch (err: any) {
      setActionError(err.message || 'Failed to return rental.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await fetchApi(`/equipment/${id}/report-damage`, {
        method: 'POST',
        body: JSON.stringify(damageForm),
      });
      closeModal();
      loadDetails();
    } catch (err: any) {
      setActionError(err.message || 'Failed to report damage.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await fetchApi(`/equipment/${id}/send-maintenance`, {
        method: 'POST',
        body: JSON.stringify(maintenanceForm),
      });
      closeModal();
      loadDetails();
    } catch (err: any) {
      setActionError(err.message || 'Failed to send to maintenance.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReady = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await fetchApi(`/equipment/${id}/mark-ready`, {
        method: 'POST',
        body: JSON.stringify(readyForm),
      });
      closeModal();
      loadDetails();
    } catch (err: any) {
      setActionError(err.message || 'Failed to mark ready.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await fetchApi(`/equipment/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      closeModal();
      loadDetails();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update equipment details.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <RoleGuard>
        <div className="p-12 text-center text-sm text-gray-500">
          Loading equipment details...
        </div>
      </RoleGuard>
    );
  }

  if (!item) {
    return (
      <RoleGuard>
        <div className="p-12 text-center">
          <p className="text-base font-semibold text-gray-800">Equipment item not found</p>
          <Link href="/equipment" className="mt-2 text-sm text-blue-600 hover:underline inline-block">
            ← Return to Equipment List
          </Link>
        </div>
      </RoleGuard>
    );
  }

  const isAvailable = item.availability === 'AVAILABLE';
  const isAssigned = item.availability === 'ASSIGNED_TO_PROJECT' || item.availability === 'CHECKED_OUT' || item.availability === 'IN_USE';
  const isRented = item.availability === 'RENTED_OUT';
  const isDamaged = item.availability === 'DAMAGED';
  const isMaintenance = item.availability === 'UNDER_MAINTENANCE' || item.maintenanceStatus === 'UNDER_MAINTENANCE';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            Available
          </span>
        );
      case 'ASSIGNED_TO_PROJECT':
      case 'CHECKED_OUT':
      case 'IN_USE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
            Assigned
          </span>
        );
      case 'RENTED_OUT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
            Rented
          </span>
        );
      case 'DAMAGED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
            Damaged
          </span>
        );
      case 'UNDER_MAINTENANCE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
            Maintenance
          </span>
        );
      case 'LOST':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            Lost
          </span>
        );
      case 'RETIRED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
            Retired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <RoleGuard>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/equipment"
          className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to All Equipment
        </Link>

        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{item.name}</h1>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                {item.equipmentId}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              {getStatusBadge(item.availability)}
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-600">{item.category}</span>
            </div>
          </div>

          {isManager && (
            <button
              onClick={() => openActionModal('EDIT')}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
              Edit
            </button>
          )}
        </div>

        {/* Primary State-Aware Actions Bar */}
        {isManager && (
          <div className="flex flex-wrap items-center gap-2.5 pb-2">
            {isAvailable && (
              <>
                <button
                  onClick={() => openActionModal('ASSIGN_SHOOT')}
                  className="px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-xs inline-flex items-center"
                >
                  <Film className="w-3.5 h-3.5 mr-1.5" />
                  Assign to Shoot
                </button>
                <button
                  onClick={() => openActionModal('RENT_OUT')}
                  className="px-3.5 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors inline-flex items-center"
                >
                  <Building2 className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                  Rent Out
                </button>
                <button
                  onClick={() => openActionModal('DAMAGE')}
                  className="px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  Report Damage
                </button>
              </>
            )}

            {isAssigned && (
              <>
                <button
                  onClick={() => openActionModal('RETURN')}
                  className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors shadow-xs inline-flex items-center"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                  Return Equipment
                </button>
                <button
                  onClick={() => openActionModal('DAMAGE')}
                  className="px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  Report Damage
                </button>
              </>
            )}

            {isRented && (
              <>
                <button
                  onClick={() => openActionModal('RETURN_RENTAL')}
                  className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors shadow-xs inline-flex items-center"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                  Record Return
                </button>
                <button
                  onClick={() => openActionModal('DAMAGE')}
                  className="px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  Report Damage
                </button>
              </>
            )}

            {isDamaged && (
              <button
                onClick={() => openActionModal('MAINTENANCE')}
                className="px-3.5 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors shadow-xs inline-flex items-center"
              >
                <Wrench className="w-3.5 h-3.5 mr-1.5" />
                Send to Maintenance
              </button>
            )}

            {isMaintenance && (
              <button
                onClick={() => openActionModal('READY')}
                className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors shadow-xs inline-flex items-center"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Mark Ready (Available)
              </button>
            )}
          </div>
        )}

        {/* Details 3-Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Section 1: Current Status */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
              Current Status
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-gray-900">{item.availability}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Location</span>
                <span className="font-medium text-gray-900">{item.storageLocation || 'Studio'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Condition</span>
                <span className="font-medium text-gray-900">{item.condition}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Holder</span>
                <span className="font-medium text-gray-900">{item.assignedUser?.name || item.currentHolder || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Equipment Details */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
              Equipment Details
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Brand</span>
                <span className="font-medium text-gray-900">{item.brand || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Model</span>
                <span className="font-medium text-gray-900">{item.model || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Serial No.</span>
                <span className="font-mono text-gray-900">{item.serialNumber || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Category</span>
                <span className="font-medium text-gray-900">{item.category}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Current Assignment */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
              Current Assignment
            </h2>
            {isAssigned && item.assignedProject ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Shoot Project</span>
                  <span className="font-medium text-blue-600">
                    {item.assignedProject.projectId}: {item.assignedProject.name}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Assigned To</span>
                  <span className="font-medium text-gray-900">
                    {item.assignedUser?.name || item.currentHolder || 'Project Team'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Expected Return</span>
                  <span className="font-medium text-gray-900">
                    {item.expectedReturnDate ? new Date(item.expectedReturnDate).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            ) : isRented ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium text-purple-700">{item.rentalCustomer || 'Outside Client'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Contact</span>
                  <span className="font-medium text-gray-900">{item.rentalContact || '—'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Expected Return</span>
                  <span className="font-medium text-gray-900">
                    {item.rentalExpectedReturnDate ? new Date(item.rentalExpectedReturnDate).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-3">No current assignment. Item is available in studio storage.</p>
            )}
          </div>
        </div>

        {/* Simple Vertical Timeline History */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center">
              <History className="w-4 h-4 mr-2 text-gray-500" />
              Equipment History
            </h2>
            <span className="text-xs text-gray-400">{timeline.length} events</span>
          </div>

          {timeline.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No history recorded for this equipment item.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {timeline.map((event) => (
                <div key={event.id} className="relative text-xs space-y-1">
                  {/* Dot */}
                  <div className="absolute -left-[1.65rem] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />

                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{event.action}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">
                      {new Date(event.timestamp).toLocaleDateString()} {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-gray-600">
                    {event.user?.name ? `By ${event.user.name}` : ''}
                    {event.project?.name ? ` (Project: ${event.project.name})` : ''}
                  </div>

                  {event.notes && (
                    <p className="text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 text-xs">
                      {event.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= MODALS ================= */}

        {/* 1. Edit Asset Modal */}
        {activeModal === 'EDIT' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-lg border border-gray-200">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Edit Equipment</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionError && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="mt-3 space-y-3 text-xs">
                <div>
                  <label className="block text-gray-600 mb-1">Equipment Name *</label>
                  <input
                    required
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 mb-1">Brand</label>
                    <input
                      type="text"
                      value={editForm.brand}
                      onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Model</label>
                    <input
                      type="text"
                      value={editForm.model}
                      onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 mb-1">Serial Number</label>
                    <input
                      type="text"
                      value={editForm.serialNumber}
                      onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Storage Location</label>
                    <input
                      type="text"
                      value={editForm.storageLocation}
                      onChange={(e) => setEditForm({ ...editForm, storageLocation: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Assign to Shoot Modal */}
        {activeModal === 'ASSIGN_SHOOT' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-lg border border-gray-200">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Assign to Shoot Project</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionError && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleAssignShoot} className="mt-3 space-y-3 text-xs">
                <div>
                  <label className="block text-gray-600 mb-1">Shoot Project *</label>
                  <select
                    required
                    value={assignForm.shootProjectId}
                    onChange={(e) => setAssignForm({ ...assignForm, shootProjectId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                  >
                    <option value="">Select Project</option>
                    {shootProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectId} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Expected Return Date</label>
                  <input
                    type="date"
                    value={assignForm.expectedReturnDate}
                    onChange={(e) => setAssignForm({ ...assignForm, expectedReturnDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Assignment Notes</label>
                  <textarea
                    rows={2}
                    value={assignForm.assignmentNotes}
                    onChange={(e) => setAssignForm({ ...assignForm, assignmentNotes: e.target.value })}
                    placeholder="Specific kit notes, crew details..."
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Rent Out Modal */}
        {activeModal === 'RENT_OUT' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-lg border border-gray-200">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Rent Out Equipment</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionError && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleRentOut} className="mt-3 space-y-3 text-xs">
                <div>
                  <label className="block text-gray-600 mb-1">Customer / Organization *</label>
                  <input
                    required
                    type="text"
                    placeholder="Client or organization name"
                    value={rentForm.customerName}
                    onChange={(e) => setRentForm({ ...rentForm, customerName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 mb-1">Contact Info</label>
                    <input
                      type="text"
                      placeholder="Phone or email"
                      value={rentForm.contactInfo}
                      onChange={(e) => setRentForm({ ...rentForm, contactInfo: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">Expected Return *</label>
                    <input
                      required
                      type="date"
                      value={rentForm.expectedReturnDate}
                      onChange={(e) => setRentForm({ ...rentForm, expectedReturnDate: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Rental Notes</label>
                  <textarea
                    rows={2}
                    value={rentForm.rentalNotes}
                    onChange={(e) => setRentForm({ ...rentForm, rentalNotes: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Confirm Rental'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Return from Shoot / Rental Modal */}
        {(activeModal === 'RETURN' || activeModal === 'RETURN_RENTAL') && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-lg border border-gray-200">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Record Return</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionError && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={activeModal === 'RETURN' ? handleReturnShoot : handleReturnRental} className="mt-3 space-y-3 text-xs">
                <div>
                  <label className="block text-gray-600 mb-1">Inspected Condition *</label>
                  <select
                    value={returnForm.condition}
                    onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                  >
                    <option value="GOOD">Good / Operable (Restores to Available)</option>
                    <option value="DAMAGED">Damaged (Routes to Damaged)</option>
                    <option value="NEEDS_MAINTENANCE">Needs Maintenance (Routes to Maintenance)</option>
                  </select>
                </div>

                {returnForm.condition === 'DAMAGED' && (
                  <div>
                    <label className="block text-rose-600 mb-1">Damage Description *</label>
                    <textarea
                      required
                      rows={2}
                      value={returnForm.damageDescription}
                      onChange={(e) => setReturnForm({ ...returnForm, damageDescription: e.target.value })}
                      placeholder="Describe the damage..."
                      className="w-full px-3 py-1.5 border border-rose-300 rounded-lg text-xs"
                    />
                  </div>
                )}

                {returnForm.condition === 'NEEDS_MAINTENANCE' && (
                  <div>
                    <label className="block text-amber-600 mb-1">Maintenance Notes *</label>
                    <textarea
                      required
                      rows={2}
                      value={returnForm.maintenanceNotes}
                      onChange={(e) => setReturnForm({ ...returnForm, maintenanceNotes: e.target.value })}
                      placeholder="Maintenance required..."
                      className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-gray-600 mb-1">Return Notes</label>
                  <textarea
                    rows={2}
                    value={returnForm.returnNotes}
                    onChange={(e) => setReturnForm({ ...returnForm, returnNotes: e.target.value })}
                    placeholder="Accessories checked, returned to bay..."
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Recording...' : 'Confirm Return'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. Report Damage Modal */}
        {activeModal === 'DAMAGE' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-lg border border-gray-200">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Report Damage</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionError && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleReportDamage} className="mt-3 space-y-3 text-xs">
                <div>
                  <label className="block text-gray-600 mb-1">Damage Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={damageForm.description}
                    onChange={(e) => setDamageForm({ ...damageForm, description: e.target.value })}
                    placeholder="Describe problem details, symptoms, drop incident..."
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Recording...' : 'Report Damage'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. Send to Maintenance Modal */}
        {activeModal === 'MAINTENANCE' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-lg border border-gray-200">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Send to Maintenance</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionError && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleSendMaintenance} className="mt-3 space-y-3 text-xs">
                <div>
                  <label className="block text-gray-600 mb-1">Problem / Repair Scope *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Lens zoom calibration, sensor clean, cracked mount"
                    value={maintenanceForm.problem}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, problem: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Expected Completion Date</label>
                  <input
                    type="date"
                    value={maintenanceForm.expectedCompletionDate}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, expectedCompletionDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Updating...' : 'Send to Maintenance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 7. Mark Ready Modal */}
        {activeModal === 'READY' && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-lg border border-gray-200">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Mark Ready</h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionError && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleMarkReady} className="mt-3 space-y-3 text-xs">
                <p className="text-gray-600">
                  Confirming inspection will resolve open maintenance records and restore this equipment to <strong>Available</strong> status.
                </p>

                <div>
                  <label className="block text-gray-600 mb-1">Final Condition *</label>
                  <select
                    value={readyForm.condition}
                    onChange={(e) => setReadyForm({ ...readyForm, condition: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Marking Ready...' : 'Confirm Ready'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
