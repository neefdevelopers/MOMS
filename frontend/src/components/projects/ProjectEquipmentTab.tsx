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
      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-600" />
            Shoot Project Equipment & Asset Requirements
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            Specify if physical shoot production equipment is required for this project lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Requires Equipment?</span>
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setRequiresEquipment(true)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                requiresEquipment ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              YES — Physical Shoot
            </button>
            <button
              onClick={() => setRequiresEquipment(false)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                !requiresEquipment ? 'bg-white text-slate-800 border border-slate-200 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              NO — Editing / Graphics Only
            </button>
          </div>
        </div>
      </div>

      {!requiresEquipment ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 space-y-2 shadow-xs">
          <BadgeCheck className="w-8 h-8 text-emerald-600 mx-auto" />
          <h4 className="font-bold text-slate-900 text-sm">No Physical Equipment Checkout Required</h4>
          <p className="max-w-md mx-auto text-xs text-slate-500">
            This production activity is configured as a non-physical task (Editing, Motion Graphics, Writing). Physical equipment checkout is bypassed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCheckProjectAvailability}
                disabled={checkingAvailability}
                className="px-3.5 py-2 bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                {checkingAvailability ? 'Validating Conflicts...' : 'Check Availability & Conflicts'}
              </button>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAllocateModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <ArrowRightLeft className="w-4 h-4" /> Allocate / Issue Equipment
                </button>

                <button
                  onClick={() => setShowReserveModal(true)}
                  className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Calendar className="w-4 h-4" /> Create Reservation
                </button>
              </div>
            )}
          </div>

          {/* Availability Check Result Banner */}
          {availabilityResult && (
            <div className={`p-4 rounded-2xl border space-y-2 shadow-xs ${
              availabilityResult.isAvailable ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center justify-between font-bold text-sm">
                <span className="flex items-center gap-2">
                  {availabilityResult.isAvailable ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
                  {availabilityResult.isAvailable ? 'All Reserved Equipment Available' : `${availabilityResult.conflictCount} Equipment Conflict(s) Detected`}
                </span>
                <button onClick={() => setAvailabilityResult(null)} className="text-slate-400 hover:text-slate-700 font-bold text-xs">Close</button>
              </div>

              {availabilityResult.conflicts?.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-rose-200 text-xs">
                  {availabilityResult.conflicts.map((c: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-rose-200 shadow-xs">
                      <strong className="text-slate-900">{c.equipmentName || c.equipmentId}:</strong>
                      <span className="text-rose-700">{c.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Current Reservations Section */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>Project Equipment Allocations & Reservations ({(project.equipmentReservations || []).length})</span>
              <span className="text-xs text-slate-500 font-normal">Planned & Allocated for Shoot</span>
            </h4>

            {(!project.equipmentReservations || project.equipmentReservations.length === 0) ? (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-slate-700 font-medium text-xs">No equipment assigned or allocated to this project yet.</p>
                {canManage && (
                  <button
                    onClick={() => setShowAllocateModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-xs text-xs"
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
                    <div key={res.id} className="bg-slate-50/70 border border-slate-200 p-3.5 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="text-slate-900 font-bold text-sm block">{eq?.name || 'Equipment'}</strong>
                          <span className="font-mono text-[10px] text-cyan-700 font-bold px-1.5 py-0.5 bg-cyan-50 border border-cyan-200 rounded">
                            {eq?.equipmentId}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                          eq?.availability === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          eq?.availability === 'CHECKED_OUT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {eq?.availability || 'ALLOCATED'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span>Category:</span> <strong className="text-slate-800">{eq?.category}</strong>
                        </div>
                        {eq?.currentHolder && (
                          <div className="flex items-center justify-between">
                            <span>Holder:</span> <strong className="text-cyan-700">{eq.currentHolder}</strong>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>Schedule:</span> <span className="font-mono text-slate-700">{new Date(res.startDate).toLocaleDateString()} – {new Date(res.endDate).toLocaleDateString()}</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
              Direct Equipment Allocation
            </h3>
            <form onSubmit={handleDirectAllocation} className="space-y-3">
              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Select Equipment Item *</label>
                <select
                  required
                  value={allocateEqId}
                  onChange={(e) => setAllocateEqId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
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
                <label className="text-slate-700 block mb-1 font-semibold">Employee Recipient *</label>
                <select
                  required
                  value={allocateForm.employeeId}
                  onChange={(e) => setAllocateForm({ ...allocateForm, employeeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
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
                  <label className="text-slate-700 block mb-1 font-semibold">Allocation Date *</label>
                  <input
                    type="date"
                    required
                    value={allocateForm.startDate}
                    onChange={(e) => setAllocateForm({ ...allocateForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Expected Return *</label>
                  <input
                    type="date"
                    required
                    value={allocateForm.expectedReturnDate}
                    onChange={(e) => setAllocateForm({ ...allocateForm, expectedReturnDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Purpose & Remarks</label>
                <input
                  type="text"
                  value={allocateForm.purpose}
                  onChange={(e) => setAllocateForm({ ...allocateForm, purpose: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
                  placeholder="e.g. Primary camera body for studio shoot"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAllocate}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Create Equipment Reservation</h3>
            <form onSubmit={handleCreateReservation} className="space-y-3">
              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Select Equipment *</label>
                <select
                  required
                  value={selectedEqId}
                  onChange={(e) => setSelectedEqId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
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
                  <label className="text-slate-700 block mb-1 font-semibold">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={reserveDates.startDate}
                    onChange={(e) => setReserveDates({ ...reserveDates, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">End Date *</label>
                  <input
                    type="date"
                    required
                    value={reserveDates.endDate}
                    onChange={(e) => setReserveDates({ ...reserveDates, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReserveModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReserve}
                  className="px-4 py-1.5 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 disabled:opacity-50 shadow-xs"
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
