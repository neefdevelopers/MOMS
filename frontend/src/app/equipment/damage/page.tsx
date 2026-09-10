'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';

export default function EquipmentDamagePage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [repairStatus, setRepairStatus] = useState('IN_REPAIR');
  const [repairNotes, setRepairNotes] = useState('');

  const loadDamageReports = async () => {
    try {
      const data = await fetchApi('/equipment/damage-reports');
      if (Array.isArray(data)) setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDamageReports();
  }, []);

  const handleUpdateRepair = async (id: string) => {
    try {
      await fetchApi(`/equipment/damage-reports/${id}/repair`, {
        method: 'PATCH',
        body: JSON.stringify({ repairStatus, repairNotes }),
      });
      alert(`Damage report updated to status: ${repairStatus}.`);
      setUpdatingId(null);
      loadDamageReports();
    } catch (err: any) {
      alert(err.message || 'Failed to update repair status');
    }
  };

  return (
    <RoleGuard>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/equipment"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-7 h-7 text-rose-600" />
                Equipment Damage &amp; Repair Management
              </h1>
          </div>

          <button
            onClick={loadDamageReports}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-cyan-600" />
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading damage reports...</div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No damage reports on record.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="p-3.5">Equipment</th>
                    <th className="p-3.5">Reported By</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Severity</th>
                    <th className="p-3.5">Damage Description</th>
                    <th className="p-3.5">Repair Status</th>
                    <th className="p-3.5">Repair Notes</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {reports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-100/40">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{r.equipment?.name}</div>
                        <div className="font-mono text-[11px] text-cyan-600">{r.equipment?.equipmentId}</div>
                      </td>
                      <td className="p-3.5 text-slate-700">{r.reportedBy?.name}</td>
                      <td className="p-3.5 font-mono text-slate-700">
                        {r.date ? new Date(r.date).toISOString().split('T')[0] : 'N/A'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase border ${
                            r.severity === 'CRITICAL' || r.severity === 'HIGH'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {r.severity}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 max-w-xs">{r.description}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase border ${
                            r.repairStatus === 'REPAIRED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : r.repairStatus === 'IN_REPAIR'
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {r.repairStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 max-w-xs">{r.repairNotes || '—'}</td>
                      <td className="p-3.5 text-right">
                        {r.repairStatus !== 'REPAIRED' && (
                          <button
                            onClick={() => {
                              setUpdatingId(r.id);
                              setRepairStatus('REPAIRED');
                              setRepairNotes(r.repairNotes || '');
                            }}
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-600/40 text-blue-700 border border-blue-200 text-[11px] font-bold"
                          >
                            Update Repair
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

        {/* Update Repair Modal */}
        {updatingId && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-extrabold text-slate-900">Update Damage Repair Status</h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Repair Status *</label>
                <select
                  value={repairStatus}
                  onChange={(e) => setRepairStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_REPAIR">IN_REPAIR</option>
                  <option value="REPAIRED">REPAIRED (Restores Availability)</option>
                  <option value="UNREPAIRABLE">UNREPAIRABLE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Repair Notes</label>
                <textarea
                  rows={3}
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  placeholder="e.g. Replaced front element glass and re-calibrated autofocus motor."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdatingId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateRepair(updatingId)}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white"
                >
                  Save Repair Status
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
