'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import { useAuth } from '@/lib/auth-context';
import {
  Wrench,
  AlertTriangle,
  Sparkles,
  Plus,
  RefreshCw,
  X,
  CheckCircle2,
} from 'lucide-react';

export default function EquipmentMaintenancePage() {
  const { user } = useAuth();
  const userRole = user?.role as string | undefined;
  const isManager = userRole === 'ADMIN' || userRole === 'ADMINISTRATOR' || userRole === 'MEDIA_MANAGER' || userRole === 'TECHNICAL_MANAGER';

  const [activeTab, setActiveTab] = useState<'DAMAGE' | 'MAINTENANCE'>('DAMAGE');
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [damageReports, setDamageReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Forms
  const [damageForm, setDamageForm] = useState({
    equipmentId: '',
    damageType: 'PHYSICAL',
    description: '',
    severity: 'MEDIUM',
    notes: '',
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    equipmentId: '',
    problem: '',
    expectedCompletionDate: '',
    notes: '',
  });

  const [readyForm, setReadyForm] = useState({
    inspectionNotes: 'Equipment tested, verified functional and restored to deployment status.',
    condition: 'EXCELLENT',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [eqRes, maintRes, damageRes] = await Promise.all([
        fetchApi('/equipment'),
        fetchApi('/equipment/maintenance-records').catch(() => []),
        fetchApi('/equipment/damage-reports').catch(() => []),
      ]);
      if (Array.isArray(eqRes)) setEquipmentList(eqRes);
      if (Array.isArray(maintRes)) setMaintenanceRecords(maintRes);
      if (Array.isArray(damageRes)) setDamageReports(damageRes);
    } catch (err) {
      console.error('Failed to load maintenance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openActionModal = (type: string, item?: any) => {
    setSelectedEquipment(item || null);
    setActionError(null);
    if (type === 'REPORT_DAMAGE') {
      setDamageForm({
        equipmentId: item?.id || '',
        damageType: 'PHYSICAL',
        description: '',
        severity: 'MEDIUM',
        notes: '',
      });
    } else if (type === 'SEND_MAINTENANCE') {
      setMaintenanceForm({
        equipmentId: item?.id || '',
        problem: item?.condition === 'DAMAGED' ? 'Repair reported damage' : '',
        expectedCompletionDate: '',
        notes: '',
      });
    } else if (type === 'MARK_READY') {
      setReadyForm({
        inspectionNotes: 'Equipment tested, verified functional and restored to deployment status.',
        condition: 'EXCELLENT',
      });
    }
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedEquipment(null);
    setActionError(null);
  };

  const handleReportDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedEquipment?.id || damageForm.equipmentId;
    if (!targetId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await fetchApi(`/equipment/${targetId}/report-damage`, {
        method: 'POST',
        body: JSON.stringify(damageForm),
      });
      closeModal();
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to report damage.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedEquipment?.id || maintenanceForm.equipmentId;
    if (!targetId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await fetchApi(`/equipment/${targetId}/send-maintenance`, {
        method: 'POST',
        body: JSON.stringify(maintenanceForm),
      });
      closeModal();
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to send equipment to maintenance.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReady = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await fetchApi(`/equipment/${selectedEquipment.id}/mark-ready`, {
        method: 'POST',
        body: JSON.stringify(readyForm),
      });
      closeModal();
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to mark equipment ready.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <RoleGuard>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Damage & Maintenance</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track equipment damage, repairs, and service verification</p>
          </div>
          {isManager && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openActionModal('REPORT_DAMAGE')}
                className="inline-flex items-center px-3 py-2 border border-rose-300 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Report Damage
              </button>
              <button
                onClick={() => openActionModal('SEND_MAINTENANCE')}
                className="inline-flex items-center px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Wrench className="w-3.5 h-3.5 mr-1" />
                Send to Maintenance
              </button>
            </div>
          )}
        </div>

        {/* 2 Simple Tabs: Damage | Maintenance */}
        <div className="flex border-b border-gray-200 gap-6">
          <button
            onClick={() => setActiveTab('DAMAGE')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'DAMAGE'
                ? 'border-rose-600 text-rose-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Damage
            <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-800 font-semibold">
              {damageReports.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('MAINTENANCE')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'MAINTENANCE'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Maintenance
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 font-semibold">
              {maintenanceRecords.length}
            </span>
          </button>
        </div>

        {/* TAB 1: DAMAGE */}
        {activeTab === 'DAMAGE' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-medium">
                    <th className="px-5 py-3">Equipment</th>
                    <th className="px-4 py-3">Damage Description</th>
                    <th className="px-4 py-3">Reported Date</th>
                    <th className="px-4 py-3">Reported By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                        Loading damage reports...
                      </td>
                    </tr>
                  ) : damageReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                        No active damage reports.
                      </td>
                    </tr>
                  ) : (
                    damageReports.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3">
                          <Link href={`/equipment/${d.equipment?.id || d.equipmentId}`} className="font-medium text-gray-900 hover:text-blue-600">
                            {d.equipment?.name || 'Equipment'}
                          </Link>
                          <div className="font-mono text-gray-400 text-[11px]">{d.equipment?.equipmentId}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-sm truncate">
                          {d.description || d.notes || 'Damage reported'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(d.createdAt || d.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {d.reportedBy?.name || 'Staff'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
                            {d.repairStatus || 'DAMAGED'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {isManager && d.repairStatus !== 'REPAIRED' && (
                              <button
                                onClick={() => openActionModal('SEND_MAINTENANCE', d.equipment)}
                                className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors"
                              >
                                Send to Maintenance
                              </button>
                            )}
                            <Link
                              href={`/equipment/${d.equipment?.id || d.equipmentId}`}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: MAINTENANCE */}
        {activeTab === 'MAINTENANCE' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-medium">
                    <th className="px-5 py-3">Equipment</th>
                    <th className="px-4 py-3">Issue / Problem</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3">Expected Completion</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                        Loading maintenance records...
                      </td>
                    </tr>
                  ) : maintenanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                        No active maintenance records.
                      </td>
                    </tr>
                  ) : (
                    maintenanceRecords.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3">
                          <Link href={`/equipment/${m.equipment?.id || m.equipmentId}`} className="font-medium text-gray-900 hover:text-blue-600">
                            {m.equipment?.name || 'Equipment'}
                          </Link>
                          <div className="font-mono text-gray-400 text-[11px]">{m.equipment?.equipmentId}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-sm truncate">
                          {m.notes || m.maintenanceType || 'Service / Repair'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {m.completedDate ? new Date(m.completedDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${
                              m.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                : 'bg-amber-50 text-amber-700 border-amber-200/60'
                            }`}
                          >
                            {m.status || 'IN_PROGRESS'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {isManager && m.status !== 'COMPLETED' && (
                              <button
                                onClick={() => openActionModal('MARK_READY', m.equipment)}
                                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                              >
                                Mark Ready
                              </button>
                            )}
                            <Link
                              href={`/equipment/${m.equipment?.id || m.equipmentId}`}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= MODALS ================= */}

        {/* 1. Report Damage Modal */}
        {activeModal === 'REPORT_DAMAGE' && (
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
                {!selectedEquipment && (
                  <div>
                    <label className="block text-gray-600 mb-1">Select Equipment *</label>
                    <select
                      required
                      value={damageForm.equipmentId}
                      onChange={(e) => setDamageForm({ ...damageForm, equipmentId: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                    >
                      <option value="">Select Equipment</option>
                      {equipmentList.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.equipmentId} - {eq.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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

        {/* 2. Send to Maintenance Modal */}
        {activeModal === 'SEND_MAINTENANCE' && (
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
                {!selectedEquipment && (
                  <div>
                    <label className="block text-gray-600 mb-1">Select Equipment *</label>
                    <select
                      required
                      value={maintenanceForm.equipmentId}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, equipmentId: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                    >
                      <option value="">Select Equipment</option>
                      {equipmentList.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.equipmentId} - {eq.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Updating...' : 'Send to Maintenance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Mark Ready Modal */}
        {activeModal === 'MARK_READY' && selectedEquipment && (
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
