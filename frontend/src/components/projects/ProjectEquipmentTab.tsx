'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Camera,
  Plus,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  X,
  Package,
  ArrowRightLeft,
  BadgeCheck,
  Tag,
  ShieldCheck,
  Check,
  Layers,
} from 'lucide-react';

interface ProjectEquipmentTabProps {
  project: any;
  onRefresh?: () => void;
}

export function ProjectEquipmentTab({ project, onRefresh }: ProjectEquipmentTabProps) {
  const { user } = useAuth();
  const [allEquipment, setAllEquipment] = useState<any[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedEqId, setSelectedEqId] = useState('');
  const [requestPurpose, setRequestPurpose] = useState('');
  const [requestRemarks, setRequestRemarks] = useState('');
  const [requestDates, setRequestDates] = useState({
    startDate: project.shootDate ? new Date(project.shootDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: project.shootDate ? new Date(new Date(project.shootDate).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Status Filter State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHECKED_OUT' | 'RETURNED'>('ALL');

  // Inline Review Form for Managers
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [submittingReview, setSubmittingReview] = useState(false);

  const canManage =
    user?.role === 'MEDIA_MANAGER' ||
    user?.role === 'TECHNICAL_MANAGER' ||
    user?.role === 'ADMINISTRATOR' ||
    (user?.role as string) === 'ADMIN';

  useEffect(() => {
    fetchApi('/equipment')
      .then((eqRes) => {
        if (Array.isArray(eqRes)) setAllEquipment(eqRes);
      })
      .catch(() => {});
  }, []);

  const handleCreateEquipmentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEqId) {
      alert('Please select an equipment item to request.');
      return;
    }
    setSubmittingRequest(true);
    try {
      await fetchApi('/equipment/requests', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: selectedEqId,
          projectId: project.id,
          purpose: requestPurpose.trim() || `Equipment requirement for project "${project.name}"`,
          requiredDate: requestDates.startDate,
          expectedReturnDate: requestDates.endDate,
          remarks: requestRemarks.trim() || undefined,
        }),
      });
      alert('Equipment request submitted successfully! Status: Pending Approval by Technical / Media Manager.');
      setShowRequestModal(false);
      setSelectedEqId('');
      setRequestPurpose('');
      setRequestRemarks('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit equipment request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleReviewRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setSubmittingReview(true);
    try {
      await fetchApi(`/equipment/requests/${requestId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNotes }),
      });
      alert(`Equipment request has been ${status === 'APPROVED' ? 'Approved' : 'Rejected'} successfully!`);
      setReviewingId(null);
      setReviewNotes('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to review equipment request.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleIssueEquipment = async (requestId: string) => {
    try {
      await fetchApi(`/equipment/requests/${requestId}/issue`, {
        method: 'POST',
      });
      alert('Equipment successfully issued and checked out to staff!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to issue equipment.');
    }
  };

  const handleDeleteRequest = async (requestId: string, eqName?: string) => {
    if (!confirm(`Are you sure you want to cancel the equipment request for "${eqName || 'this item'}"?`)) return;
    try {
      await fetchApi(`/equipment/requests/${requestId}`, {
        method: 'DELETE',
      });
      alert('Equipment request cancelled successfully!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel equipment request.');
    }
  };

  const handleDeleteReservation = async (reservationId: string, eqName?: string) => {
    if (!confirm(`Are you sure you want to remove the equipment reservation for "${eqName || 'this item'}"?`)) return;
    try {
      await fetchApi(`/equipment/reservations/${reservationId}`, {
        method: 'DELETE',
      });
      alert('Equipment reservation removed successfully!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to remove equipment reservation.');
    }
  };

  // Compile Unified List of Equipment Items (requests + reservations)
  const rawRequests: any[] = Array.isArray(project.equipmentRequests) ? project.equipmentRequests : [];
  const rawReservations: any[] = Array.isArray(project.equipmentReservations) ? project.equipmentReservations : [];

  // Map reservations to request format if they don't already exist in requests
  const unifiedItems: any[] = [...rawRequests];
  rawReservations.forEach((res) => {
    const alreadyExists = unifiedItems.some((req) => req.equipmentId === res.equipmentId);
    if (!alreadyExists) {
      unifiedItems.push({
        id: `res-${res.id}`,
        reservationId: res.id,
        isReservationOnly: true,
        equipmentId: res.equipmentId,
        equipment: res.equipment,
        projectId: res.projectId,
        requestedById: res.reservedById,
        requestedBy: res.reservedBy,
        purpose: 'Direct shoot project reservation',
        requiredDate: res.startDate,
        expectedReturnDate: res.endDate,
        status: res.status === 'RESERVED' ? 'APPROVED' : res.status,
        createdAt: res.createdAt,
      });
    }
  });

  // Calculate Status Counts
  const counts = {
    total: unifiedItems.length,
    pending: unifiedItems.filter((i) => i.status === 'PENDING').length,
    approved: unifiedItems.filter((i) => i.status === 'APPROVED').length,
    rejected: unifiedItems.filter((i) => i.status === 'REJECTED').length,
    checkedOut: unifiedItems.filter((i) => i.status === 'CHECKED_OUT' || i.status === 'IN_USE').length,
    returned: unifiedItems.filter((i) => i.status === 'RETURNED').length,
  };

  // Filter items
  const filteredItems = unifiedItems.filter((item) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'CHECKED_OUT') return item.status === 'CHECKED_OUT' || item.status === 'IN_USE';
    return item.status === statusFilter;
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Header & Request Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Project Equipment Requests &amp; Statuses
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Track requested gear status (Pending, Approved, Rejected, Issued) and allocate cameras, lighting, and audio equipment for this project.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 text-xs shrink-0"
        >
          <Plus className="w-4 h-4" /> Request Equipment
        </button>
      </div>

      {/* KPI Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Gear</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">{counts.total}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'PENDING'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Review
          </div>
          <div className="text-xl font-bold text-amber-600 font-mono mt-0.5">{counts.pending}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <BadgeCheck className="w-3 h-3" /> Approved
          </div>
          <div className="text-xl font-bold text-emerald-600 font-mono mt-0.5">{counts.approved}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('CHECKED_OUT')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'CHECKED_OUT'
              ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" /> Issued / In Use
          </div>
          <div className="text-xl font-bold text-indigo-600 font-mono mt-0.5">{counts.checkedOut}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </div>
          <div className="text-xl font-bold text-rose-600 font-mono mt-0.5">{counts.rejected}</div>
        </button>
      </div>

      {/* Equipment Requests List Container */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-600" />
            <h4 className="font-bold text-slate-900 text-sm">
              Requested Equipment ({filteredItems.length})
            </h4>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['ALL', 'PENDING', 'APPROVED', 'CHECKED_OUT', 'REJECTED'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  statusFilter === filter
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter === 'ALL' ? 'All' : filter.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/60 border border-slate-200 rounded-xl space-y-3">
            <Camera className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-slate-700 font-bold text-xs">
                {statusFilter === 'ALL'
                  ? 'No equipment requested for this shoot project yet.'
                  : `No equipment requests matching "${statusFilter.replace('_', ' ')}" status.`}
              </p>
              <p className="text-[11px] text-slate-400">
                Click &quot;Request Equipment&quot; above to allocate cameras, lighting, or audio gear for production.
              </p>
            </div>
            {statusFilter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg inline-flex items-center gap-1 text-xs"
              >
                Clear Filter
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-xs text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Request Equipment
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item: any) => {
              const eq = item.equipment;
              const isPending = item.status === 'PENDING';
              const isApproved = item.status === 'APPROVED';
              const isRejected = item.status === 'REJECTED';
              const isCheckedOut = item.status === 'CHECKED_OUT' || item.status === 'IN_USE';
              const isReturned = item.status === 'RETURNED';

              return (
                <div
                  key={item.id}
                  className={`bg-slate-50/80 border p-4 rounded-xl space-y-3 shadow-xs transition-all flex flex-col justify-between ${
                    isPending
                      ? 'border-amber-300/80 hover:border-amber-400 bg-amber-50/10'
                      : isApproved
                      ? 'border-emerald-300/80 hover:border-emerald-400 bg-emerald-50/10'
                      : isRejected
                      ? 'border-rose-300/80 hover:border-rose-400 bg-rose-50/10'
                      : isCheckedOut
                      ? 'border-indigo-300/80 hover:border-indigo-400 bg-indigo-50/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Item Header & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <strong className="text-slate-900 font-bold text-sm block leading-tight">
                          {eq?.name || 'Equipment'}
                        </strong>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] text-blue-700 font-bold px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                            {eq?.equipmentId || 'ID'}
                          </span>
                          {eq?.category && (
                            <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 rounded">
                              {eq.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Explicit Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border flex items-center gap-1 font-mono shrink-0 ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                            : isPending
                            ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-2xs'
                            : isRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                            : isCheckedOut
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isPending && <Clock className="w-3 h-3 text-amber-600 animate-pulse" />}
                        {isRejected && <XCircle className="w-3 h-3 text-rose-600" />}
                        {isCheckedOut && <ArrowRightLeft className="w-3 h-3 text-indigo-600" />}
                        {item.status === 'PENDING'
                          ? 'Pending Review'
                          : item.status === 'APPROVED'
                          ? 'Approved'
                          : item.status === 'REJECTED'
                          ? 'Rejected'
                          : item.status === 'CHECKED_OUT'
                          ? 'Issued / Checked Out'
                          : item.status || 'RESERVED'}
                      </span>
                    </div>

                    {/* Rejection Alert Box */}
                    {isRejected && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg space-y-1 text-[11px] text-rose-800">
                        <div className="font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          Request Rejected
                          {item.reviewedBy && (
                            <span className="font-normal text-rose-600">by {item.reviewedBy.name}</span>
                          )}
                        </div>
                        {item.reviewNotes && (
                          <p className="text-rose-700 italic pl-4">
                            &quot;{item.reviewNotes}&quot;
                          </p>
                        )}
                      </div>
                    )}

                    {/* Approved Details Banner */}
                    {isApproved && (
                      <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-[11px] text-emerald-800">
                        <span className="flex items-center gap-1 font-semibold">
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Approved by {item.reviewedBy?.name || 'Media / Technical Manager'}
                        </span>
                        {item.reviewNotes && (
                          <span className="text-emerald-700 italic truncate max-w-[120px]">
                            {item.reviewNotes}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Purpose / Remarks */}
                    {item.purpose && (
                      <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80">
                        <strong className="text-slate-500">Purpose:</strong> {item.purpose}
                      </div>
                    )}

                    {/* Dates & Requester Meta */}
                    <div className="text-[11px] text-slate-500 space-y-1.5 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> Schedule:
                        </span>
                        <span className="font-mono text-slate-800 font-semibold">
                          {new Date(item.requiredDate || item.startDate).toLocaleDateString()} –{' '}
                          {new Date(item.expectedReturnDate || item.endDate).toLocaleDateString()}
                        </span>
                      </div>

                      {(item.requestedBy || item.reservedBy) && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" /> Requested By:
                          </span>
                          <strong className="text-slate-800">
                            {item.requestedBy?.name || item.reservedBy?.name}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manager Direct Review Actions / Staff Cancel */}
                  <div className="pt-2.5 border-t border-slate-200/80 space-y-2">
                    {/* Inline Review Form for Managers on Pending Items */}
                    {isPending && canManage && reviewingId === item.id && (
                      <div className="p-3 bg-white border border-amber-300 rounded-xl space-y-2 animate-in fade-in">
                        <label className="text-[10px] font-bold text-slate-700 uppercase block">
                          Review Decision Notes / Reason:
                        </label>
                        <input
                          type="text"
                          placeholder="Optional notes or rejection reason..."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingId(null);
                              setReviewNotes('');
                            }}
                            className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={submittingReview}
                            onClick={() => handleReviewRequest(item.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                          <button
                            type="button"
                            disabled={submittingReview}
                            onClick={() => handleReviewRequest(item.id, 'APPROVED')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      {/* Left: Issue Action if Approved */}
                      {isApproved && canManage && !item.isReservationOnly && (
                        <button
                          type="button"
                          onClick={() => handleIssueEquipment(item.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Issue Gear
                        </button>
                      )}

                      {/* Center/Right: Manager Quick Review Buttons */}
                      {isPending && canManage && reviewingId !== item.id && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingId(item.id);
                              setReviewNotes('');
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition-colors shadow-2xs flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Review Request
                          </button>
                        </div>
                      )}

                      {/* Remove / Cancel Request Button */}
                      {(isPending || isRejected || user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (item.isReservationOnly) {
                              handleDeleteReservation(item.reservationId, eq?.name);
                            } else {
                              handleDeleteRequest(item.id, eq?.name);
                            }
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 shadow-2xs ml-auto"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Request Equipment Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Request Project Equipment
              </h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEquipmentRequest} className="space-y-3.5">
              <div>
                <label className="text-slate-700 block mb-1 font-bold text-xs">Select Equipment Item *</label>
                <select
                  required
                  value={selectedEqId}
                  onChange={(e) => setSelectedEqId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option value="">Select Equipment...</option>
                  {allEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id} disabled={eq.availability !== 'AVAILABLE'}>
                      {eq.name} ({eq.equipmentId}) — {eq.category} [{eq.availability}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold text-xs">Requirement Purpose / Scene Use</label>
                <input
                  type="text"
                  placeholder="e.g. Primary 4K Cinema Camera for Studio A dialogue scene"
                  value={requestPurpose}
                  onChange={(e) => setRequestPurpose(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-xs">Required Start Date *</label>
                  <input
                    type="date"
                    required
                    value={requestDates.startDate}
                    onChange={(e) => setRequestDates({ ...requestDates, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-xs">Expected Return Date *</label>
                  <input
                    type="date"
                    required
                    value={requestDates.endDate}
                    onChange={(e) => setRequestDates({ ...requestDates, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold text-xs">Special Remarks / Accessories Needed</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Need extra battery pack, 70-200mm lens mount, and wireless transmitter."
                  value={requestRemarks}
                  onChange={(e) => setRequestRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50 shadow-md shadow-blue-600/20 transition-all"
                >
                  {submittingRequest ? 'Submitting...' : 'Submit Equipment Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
