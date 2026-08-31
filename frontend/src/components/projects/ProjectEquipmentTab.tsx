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
  ArrowRightLeft,
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
  const [allUsers, setAllUsers] = useState<any[]>([]);
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

  // Direct Allocation Form Modal
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocateEqId, setAllocateEqId] = useState('');
  const [allocateForm, setAllocateForm] = useState({
    employeeId: '',
    purpose: `Shoot execution for ${project.title || project.name || 'Shoot Project'}`,
    startDate: project.shootDate ? new Date(project.shootDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    expectedReturnDate: project.shootDate ? new Date(new Date(project.shootDate).getTime() + 86400000 * 2).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    remarks: '',
    accessoriesIncluded: 'Standard accessories verified',
    condition: 'Good - Operational',
  });
  const [submittingAllocate, setSubmittingAllocate] = useState(false);

  const canManage = user?.role === 'MEDIA_MANAGER' || user?.role === 'TECHNICAL_MANAGER' || user?.role === 'ADMINISTRATOR';

  useEffect(() => {
    Promise.all([
      fetchApi('/equipment').catch(() => []),
      fetchApi('/users').catch(() => []),
    ]).then(([eqRes, userRes]) => {
      if (Array.isArray(eqRes)) setAllEquipment(eqRes);
      if (Array.isArray(userRes)) {
        setAllUsers(userRes);
        if (userRes.length > 0) {
          setAllocateForm((prev) => ({ ...prev, employeeId: userRes[0].id }));
        }
      }
    });
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

  const handleDirectAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocateEqId || !allocateForm.employeeId || !allocateForm.expectedReturnDate) {
      alert('Please select an equipment item, employee recipient, and expected return date.');
      return;
    }
    setSubmittingAllocate(true);
    try {
      await fetchApi(`/equipment/${allocateEqId}/allocate`, {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          ...allocateForm,
        }),
      });
      alert('Equipment directly allocated & issued successfully! Handover record generated.');
      setShowAllocateModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to allocate equipment.');
    } finally {
      setSubmittingAllocate(false);
    }
  };

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
                disabled={checkingAvailability}
                className="px-3.5 py-2 bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                {checkingAvailability ? 'Validating Conflicts...' : 'Check Availability & Conflicts'}
              </button>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAllocateModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow"
                >
                  <ArrowRightLeft className="w-4 h-4" /> Allocate / Issue Equipment
                </button>

                <button
                  onClick={() => setShowReserveModal(true)}
                  className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow"
                >
                  <Calendar className="w-4 h-4" /> Create Reservation
                </button>
              </div>
            )}
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
              <span>Project Equipment Allocations & Reservations ({(project.equipmentReservations || []).length})</span>
              <span className="text-xs text-gray-400 font-normal">Planned & Allocated for Shoot</span>
            </h4>

            {(!project.equipmentReservations || project.equipmentReservations.length === 0) ? (
              <div className="p-6 text-center bg-gray-900/50 border border-gray-800 rounded-xl space-y-3">
                <FileText className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="text-gray-300 font-medium text-xs">No equipment assigned or allocated to this project yet.</p>
                {canManage && (
                  <button
                    onClick={() => setShowAllocateModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg inline-flex items-center gap-1.5 transition-colors shadow text-xs"
                  >
                    <ArrowRightLeft className="w-4 h-4" /> Allocate Equipment
                  </button>
                )}
              </div>
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
                          eq?.availability === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          eq?.availability === 'CHECKED_OUT' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                          {eq?.availability || 'ALLOCATED'}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-400 space-y-1 pt-1 border-t border-gray-800">
                        <div className="flex items-center justify-between">
                          <span>Category:</span> <strong className="text-gray-200">{eq?.category}</strong>
                        </div>
                        {eq?.currentHolder && (
                          <div className="flex items-center justify-between">
                            <span>Holder:</span> <strong className="text-cyan-300">{eq.currentHolder}</strong>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>Schedule:</span> <span className="font-mono text-gray-300">{new Date(res.startDate).toLocaleDateString()} – {new Date(res.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Direct Allocation Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
              Direct Equipment Allocation
            </h3>
            <form onSubmit={handleDirectAllocation} className="space-y-3">
              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Select Equipment Item *</label>
                <select
                  required
                  value={allocateEqId}
                  onChange={(e) => setAllocateEqId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                >
                  <option value="">Select Equipment...</option>
                  {allEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id} disabled={eq.availability !== 'AVAILABLE' && eq.availability !== 'RESERVED'}>
                      {eq.name} ({eq.equipmentId}) — {eq.category} [{eq.availability}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Employee Recipient *</label>
                <select
                  required
                  value={allocateForm.employeeId}
                  onChange={(e) => setAllocateForm({ ...allocateForm, employeeId: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                >
                  <option value="">Select Employee...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Allocation Date *</label>
                  <input
                    type="date"
                    required
                    value={allocateForm.startDate}
                    onChange={(e) => setAllocateForm({ ...allocateForm, startDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Expected Return *</label>
                  <input
                    type="date"
                    required
                    value={allocateForm.expectedReturnDate}
                    onChange={(e) => setAllocateForm({ ...allocateForm, expectedReturnDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Purpose & Remarks</label>
                <input
                  type="text"
                  value={allocateForm.purpose}
                  onChange={(e) => setAllocateForm({ ...allocateForm, purpose: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                  placeholder="e.g. Primary camera body for studio shoot"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded font-semibold hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAllocate}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-500 disabled:opacity-50 shadow"
                >
                  {submittingAllocate ? 'Allocating...' : 'Confirm Allocation & Handover'}
                </button>
              </div>
            </form>
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

    </div>
  );
}
