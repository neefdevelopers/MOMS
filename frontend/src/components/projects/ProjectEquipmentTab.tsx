'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Camera,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Calendar,
  Clock,
  User,
  CheckCircle,
  FileText,
  RotateCcw,
  BadgeCheck,
  PackageX,
  Wrench,
  Lock,
} from 'lucide-react';

interface ProjectEquipmentTabProps {
  project: any;
  onRefresh?: () => void;
}

export function ProjectEquipmentTab({ project, onRefresh }: ProjectEquipmentTabProps) {
  const { user } = useAuth();
  const [requiresEquipment, setRequiresEquipment] = useState<boolean>(
    project.requiresEquipment !== undefined ? Boolean(project.requiresEquipment) : true
  );
  const [allEquipment, setAllEquipment] = useState<any[]>([]);
  const [availabilityResult, setAvailabilityResult] = useState<any | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Reservation Form Modal
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedEqId, setSelectedEqId] = useState('');
  const [reserveDates, setReserveDates] = useState({
    startDate: project.shootDate ? new Date(project.shootDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: project.shootDate ? new Date(new Date(project.shootDate).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });
  const [submittingReserve, setSubmittingReserve] = useState(false);

  // Request Form Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestEqId, setRequestEqId] = useState('');
  const [requestForm, setRequestForm] = useState({
    purpose: `Physical shoot for ${project.title || project.name || 'Shoot Project'}`,
    requiredDate: project.shootDate ? new Date(project.shootDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    expectedReturnDate: project.shootDate ? new Date(new Date(project.shootDate).getTime() + 86400000 * 2).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    remarks: '',
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const canManage = user?.role === 'MEDIA_MANAGER';

  useEffect(() => {
    fetchApi('/equipment')
      .then((res) => {
        if (Array.isArray(res)) setAllEquipment(res);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleCheckProjectAvailability = async () => {
    const assignedEqIds = (project.equipmentReservations || []).map((r: any) => r.equipmentId);
    if (assignedEqIds.length === 0) {
      alert('No equipment items currently assigned to this project to check.');
      return;
    }
    setCheckingAvailability(true);
    try {
      const res = await fetchApi('/equipment/check-availability', {
        method: 'POST',
        body: JSON.stringify({
          equipmentIds: assignedEqIds,
          startDate: reserveDates.startDate,
          endDate: reserveDates.endDate,
          projectId: project.id,
        }),
      });
      setAvailabilityResult(res);
    } catch (err: any) {
      alert(err.message || 'Failed to check equipment availability.');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEqId) {
      alert('Please select an equipment item.');
      return;
    }
    setSubmittingReserve(true);
    try {
      await fetchApi(`/equipment/${selectedEqId}/reserve`, {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          startDate: reserveDates.startDate,
          endDate: reserveDates.endDate,
        }),
      });
      alert('Equipment reservation created successfully!');
      setShowReserveModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create reservation.');
    } finally {
      setSubmittingReserve(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEqId) {
      alert('Please select an equipment item.');
      return;
    }
    setSubmittingRequest(true);
    try {
      await fetchApi('/equipment/requests', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: requestEqId,
          projectId: project.id,
          ...requestForm,
        }),
      });
      alert('Equipment request submitted successfully!');
      setShowRequestModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const isApproved = project?.status === 'APPROVED' || project?.status === 'IN_PROGRESS' || project?.status === 'COMPLETED';

  return (
    <div className="space-y-6 text-xs">

      {/* Requirement Toggle Banner */}
      <div className="bg-card border border-border p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            Shoot Project Equipment & Asset Requirements
          </h3>
          <p className="text-gray-400 text-xs mt-1">
            Specify if physical shoot production equipment is required for this project lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-300">Requires Equipment?</span>
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setRequiresEquipment(true)}
              className={`px-3 py-1.5 rounded font-bold transition-colors ${
                requiresEquipment ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              YES — Physical Shoot
            </button>
            <button
              onClick={() => setRequiresEquipment(false)}
              className={`px-3 py-1.5 rounded font-bold transition-colors ${
                !requiresEquipment ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'text-gray-400 hover:text-white'
              }`}
            >
              NO — Editing / Graphics Only
            </button>
          </div>
        </div>
      </div>

      {/* Approval Gate Lock Banner */}
      {!isApproved && (
        <div className="bg-amber-950/40 border border-amber-800/60 p-5 rounded-xl flex items-start gap-3 text-amber-200 shadow-lg">
          <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-300 text-sm">Equipment Allocation Locked</h4>
            <p className="text-xs text-amber-200/80">
              Equipment allocation will be available after project approval by the Media Manager.
            </p>
            <div className="pt-1 text-[11px] text-amber-400 font-mono">
              Current Project Status: <strong className="uppercase bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/50 text-amber-100">{project?.status || 'PLANNED'}</strong>
            </div>
          </div>
        </div>
      )}

      {!requiresEquipment ? (
        <div className="p-8 text-center bg-card border border-border rounded-xl text-gray-400 space-y-2">
          <BadgeCheck className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="font-bold text-white text-sm">No Physical Equipment Checkout Required</h4>
          <p className="max-w-md mx-auto text-xs text-gray-500">
            This production activity is configured as a non-physical task (Editing, Motion Graphics, Writing). Physical equipment checkout is bypassed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-card border border-border p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCheckProjectAvailability}
                disabled={checkingAvailability || !isApproved}
                className="px-3.5 py-2 bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                {checkingAvailability ? 'Validating Conflicts...' : 'Check Availability & Conflicts'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRequestModal(true)}
                disabled={!isApproved}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" /> Submit Equipment Request
              </button>

              {canManage && (
                <button
                  onClick={() => setShowReserveModal(true)}
                  disabled={!isApproved}
                  className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-4 h-4" /> Create Reservation
                </button>
              )}
            </div>
          </div>

          {/* Availability Check Result Banner */}
          {availabilityResult && (
            <div className={`p-4 rounded-xl border space-y-2 ${
              availabilityResult.isAvailable ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-red-950/30 border-red-800 text-red-300'
            }`}>
              <div className="flex items-center justify-between font-bold text-sm">
                <span className="flex items-center gap-2">
                  {availabilityResult.isAvailable ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                  {availabilityResult.isAvailable ? 'All Reserved Equipment Available' : `${availabilityResult.conflictCount} Equipment Conflict(s) Detected`}
                </span>
                <button onClick={() => setAvailabilityResult(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              {availabilityResult.conflicts?.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-red-900/60 text-xs">
                  {availabilityResult.conflicts.map((c: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-red-950/60 p-2 rounded border border-red-900">
                      <strong>{c.equipmentName || c.equipmentId}:</strong>
                      <span>{c.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Current Reservations Section */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center justify-between">
              <span>Project Equipment Reservations ({(project.equipmentReservations || []).length})</span>
              <span className="text-xs text-gray-400 font-normal">Planned for Shoot</span>
            </h4>

            {(!project.equipmentReservations || project.equipmentReservations.length === 0) ? (
              <p className="text-gray-400 italic text-center py-4">No equipment reserved for this project yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {project.equipmentReservations.map((res: any) => {
                  const eq = res.equipment;
                  return (
                    <div key={res.id} className="bg-gray-900/80 border border-gray-800 p-3.5 rounded-xl space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="text-white font-bold text-sm block">{eq?.name || 'Equipment'}</strong>
                          <span className="font-mono text-[10px] text-cyan-400 font-bold px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded">
                            {eq?.equipmentId}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                          eq?.availability === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                          {eq?.availability || 'RESERVED'}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-400 space-y-1 pt-1 border-t border-gray-800">
                        <div className="flex items-center justify-between">
                          <span>Category:</span> <strong className="text-gray-200">{eq?.category}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Reserved Dates:</span> <span className="font-mono text-gray-300">{new Date(res.startDate).toLocaleDateString()} – {new Date(res.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Equipment Requests & Handover History */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-4">
            <h4 className="font-bold text-white text-sm">Equipment Requests & Checkout Status</h4>
            {(!project.equipmentRequests || project.equipmentRequests.length === 0) ? (
              <p className="text-gray-400 italic text-center py-4">No equipment requests submitted for this project.</p>
            ) : (
              <div className="space-y-2">
                {project.equipmentRequests.map((req: any) => (
                  <div key={req.id} className="bg-gray-900 border border-gray-800 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-bold">{req.equipment?.name || 'Equipment'}</strong>
                        <span className="font-mono text-[10px] text-cyan-400 font-bold px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded">
                          {req.equipment?.equipmentId}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Purpose: <span className="text-gray-200">{req.purpose}</span> | Return Due: <span className="font-mono text-amber-300">{new Date(req.expectedReturnDate).toLocaleDateString()}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded border font-mono uppercase ${
                        req.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                        req.status === 'CHECKED_OUT' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                        req.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                        'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reserve Equipment Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Create Equipment Reservation</h3>
            <form onSubmit={handleCreateReservation} className="space-y-3">
              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Select Equipment *</label>
                <select
                  required
                  value={selectedEqId}
                  onChange={(e) => setSelectedEqId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                >
                  <option value="">Select Equipment Item...</option>
                  {allEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id} disabled={eq.availability !== 'AVAILABLE'}>
                      {eq.name} ({eq.equipmentId}) — {eq.category} [{eq.availability === 'AVAILABLE' ? 'AVAILABLE' : `${eq.availability} - UNAVAILABLE`}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={reserveDates.startDate}
                    onChange={(e) => setReserveDates({ ...reserveDates, startDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">End Date *</label>
                  <input
                    type="date"
                    required
                    value={reserveDates.endDate}
                    onChange={(e) => setReserveDates({ ...reserveDates, endDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReserveModal(false)}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded font-semibold hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReserve}
                  className="px-4 py-1.5 bg-cyan-600 text-white rounded font-bold hover:bg-cyan-500 disabled:opacity-50"
                >
                  {submittingReserve ? 'Reserving...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Equipment Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Submit Equipment Request</h3>
            <form onSubmit={handleCreateRequest} className="space-y-3">
              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Select Equipment *</label>
                <select
                  required
                  value={requestEqId}
                  onChange={(e) => setRequestEqId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                >
                  <option value="">Select Equipment Item...</option>
                  {allEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id} disabled={eq.availability !== 'AVAILABLE'}>
                      {eq.name} ({eq.equipmentId}) — {eq.category} [{eq.availability === 'AVAILABLE' ? 'AVAILABLE' : `${eq.availability} - UNAVAILABLE`}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Purpose *</label>
                <input
                  type="text"
                  required
                  value={requestForm.purpose}
                  onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Required Date *</label>
                  <input
                    type="date"
                    required
                    value={requestForm.requiredDate}
                    onChange={(e) => setRequestForm({ ...requestForm, requiredDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Expected Return *</label>
                  <input
                    type="date"
                    required
                    value={requestForm.expectedReturnDate}
                    onChange={(e) => setRequestForm({ ...requestForm, expectedReturnDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded font-semibold hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 disabled:opacity-50"
                >
                  {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
