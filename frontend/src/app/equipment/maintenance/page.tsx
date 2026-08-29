'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Wrench, ArrowLeft, Plus, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function EquipmentMaintenancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    equipmentId: '',
    maintenanceType: 'ROUTINE_SERVICE',
    performedBy: '',
    cost: '',
    notes: '',
    scheduledDate: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [recs, eq] = await Promise.all([
        fetchApi('/equipment/maintenance-records'),
        fetchApi('/equipment'),
      ]);
      if (Array.isArray(recs)) setRecords(recs);
      if (Array.isArray(eq)) setEquipmentList(eq);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipmentId || !form.performedBy) {
      alert('Please select an equipment item and technician/vendor.');
      return;
    }
    setSubmitting(true);
    try {
      await fetchApi('/equipment/maintenance-records', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      alert('Maintenance record successfully created and equipment status set to UNDER_MAINTENANCE.');
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create maintenance record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearMaintenance = async (recordId: string) => {
    if (!confirm('Are you sure you want to clear maintenance and restore equipment availability to OPERATIONAL?')) return;
    try {
      await fetchApi(`/equipment/maintenance-records/${recordId}/clear`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Cleared by Technical Manager' }),
      });
      alert('Maintenance cleared. Equipment restored to AVAILABLE.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to clear maintenance');
    }
  };

  return (
    <RoleGuard>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/equipment"
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Technical Manager Operations
              </span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
                <Wrench className="w-7 h-7 text-cyan-400" />
                Equipment Maintenance Administration
              </h1>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Schedule Maintenance
          </button>
        </div>

        {/* Maintenance Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading maintenance records...</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No active or historical maintenance records.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-900/80 border-b border-border text-gray-400 uppercase tracking-wider font-bold">
                    <th className="p-3.5">Maintenance Code</th>
                    <th className="p-3.5">Equipment</th>
                    <th className="p-3.5">Scheduled Date</th>
                    <th className="p-3.5">Maintenance Type</th>
                    <th className="p-3.5">Performed By</th>
                    <th className="p-3.5">Cost ($)</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Notes</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-800/40">
                      <td className="p-3.5 font-mono font-bold text-cyan-400">{r.maintenanceId}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{r.equipment?.name}</div>
                        <div className="font-mono text-[11px] text-gray-400">{r.equipment?.equipmentId}</div>
                      </td>
                      <td className="p-3.5 font-mono text-gray-300">
                        {r.scheduledDate ? new Date(r.scheduledDate).toISOString().split('T')[0] : 'N/A'}
                      </td>
                      <td className="p-3.5 font-bold text-gray-200">{r.maintenanceType}</td>
                      <td className="p-3.5 text-gray-300">{r.performedBy}</td>
                      <td className="p-3.5 font-mono text-gray-300">{r.cost ? `$${r.cost.toFixed(2)}` : '—'}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase border ${
                            r.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-400">{r.notes || '—'}</td>
                      <td className="p-3.5 text-right">
                        {r.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleClearMaintenance(r.id)}
                            className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                          >
                            Clear & Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Schedule Maintenance Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-lg rounded-2xl border border-border p-6 space-y-4 shadow-2xl">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-cyan-400" />
                Schedule Maintenance
              </h2>

              <form onSubmit={handleCreateMaintenance} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Equipment *</label>
                  <select
                    required
                    value={form.equipmentId}
                    onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
                    className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white"
                  >
                    <option value="">Select Equipment Item</option>
                    {equipmentList.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.equipmentId} - {eq.name} ({eq.availability})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Maintenance Type</label>
                    <select
                      value={form.maintenanceType}
                      onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}
                      className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white"
                    >
                      <option value="ROUTINE_SERVICE">ROUTINE_SERVICE</option>
                      <option value="REPAIR">REPAIR</option>
                      <option value="INSPECTION">INSPECTION</option>
                      <option value="CLEANING">CLEANING</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Technician / Vendor *</label>
                    <input
                      type="text"
                      required
                      value={form.performedBy}
                      onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
                      className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white"
                      placeholder="e.g. Sony Service Center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Scheduled Date</label>
                    <input
                      type="date"
                      value={form.scheduledDate}
                      onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                      className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Estimated Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: e.target.value })}
                      className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white"
                      placeholder="150.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white"
                    placeholder="e.g. Sensor cleaning & firmware update"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-bold text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white"
                  >
                    {submitting ? 'Scheduling...' : 'Confirm Maintenance'}
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
