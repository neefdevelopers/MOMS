'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Camera, Plus, CheckCircle2, Clock, ShieldCheck, ArrowRightLeft } from 'lucide-react';

export default function MyEquipmentPage() {
  const { user } = useAuth();
  const [myEquipmentData, setMyEquipmentData] = useState<any>({ requests: [], handovers: [], movements: [] });
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Request Form Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    equipmentId: '',
    projectId: '',
    purpose: 'Production shoot assignment',
    requiredDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [myRes, checkRes, projRes] = await Promise.all([
        fetchApi('/equipment/my'),
        fetchApi('/equipment/check-availability', {
          method: 'POST',
          body: JSON.stringify({ equipmentIds: [], startDate: new Date(), endDate: new Date(Date.now() + 86400000 * 3) }),
        }).catch(() => null),
        fetchApi('/projects').catch(() => []),
      ]);

      if (myRes) setMyEquipmentData(myRes);
      if (projRes && Array.isArray(projRes)) {
        // Only allow equipment request for approved projects
        setProjects(projRes.filter((p: any) => ['APPROVED', 'CLIENT_APPROVED', 'READY_FOR_PRODUCTION', 'IN_PROGRESS'].includes(p.status)));
      }

      // Also fetch master list for dropdown choice
      const allEq = await fetchApi('/equipment').catch(() => []);
      if (Array.isArray(allEq)) {
        setAvailableEquipment(allEq.filter((eq: any) => !eq.isArchived));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.equipmentId || !requestForm.projectId) {
      alert('Please select an equipment item and an approved shoot project.');
      return;
    }
    setSubmitting(true);
    try {
      await fetchApi('/equipment/requests', {
        method: 'POST',
        body: JSON.stringify(requestForm),
      });
      alert('Equipment request submitted! Awaiting Media Manager approval.');
      setShowRequestModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit equipment request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (requestId: string) => {
    try {
      await fetchApi(`/equipment/requests/${requestId}/acknowledge`, { method: 'POST' });
      alert('Equipment receipt digitally acknowledged.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge receipt');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Personal Equipment Workspace
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <Camera className="w-7 h-7 text-emerald-400" />
            My Equipment & Handover Portal
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Request equipment for approved projects, track your active handovers, and digitally acknowledge received gear.
          </p>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Request Equipment
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading your equipment portfolio...</div>
      ) : (
        <div className="space-y-6">
          {/* Active Equipment Requests Section */}
          <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              My Equipment Requests & Approvals
            </h3>

            {myEquipmentData.requests?.length === 0 ? (
              <div className="text-xs text-gray-400">No active or past equipment requests.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-900 border-b border-border text-gray-400 uppercase tracking-wider font-bold">
                      <th className="p-3">Equipment</th>
                      <th className="p-3">Approved Project</th>
                      <th className="p-3">Required Date</th>
                      <th className="p-3">Expected Return</th>
                      <th className="p-3">Approval Status</th>
                      <th className="p-3">Receipt Acknowledgement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {myEquipmentData.requests.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-800/40">
                        <td className="p-3">
                          <div className="font-bold text-white">{r.equipment?.name}</div>
                          <div className="font-mono text-[11px] text-cyan-400">{r.equipment?.equipmentId}</div>
                        </td>
                        <td className="p-3 font-bold text-purple-300">{r.project?.name}</td>
                        <td className="p-3 font-mono text-gray-300">
                          {r.requiredDate ? new Date(r.requiredDate).toISOString().split('T')[0] : 'N/A'}
                        </td>
                        <td className="p-3 font-mono text-gray-300">
                          {r.expectedReturnDate ? new Date(r.expectedReturnDate).toISOString().split('T')[0] : 'N/A'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase border ${
                              r.status === 'APPROVED' || r.status === 'CHECKED_OUT'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : r.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-red-500/20 text-red-300 border-red-500/40'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {r.isAcknowledged ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5" /> Acknowledged
                            </span>
                          ) : r.status === 'CHECKED_OUT' ? (
                            <button
                              onClick={() => handleAcknowledge(r.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded transition-all"
                            >
                              Acknowledge Receipt
                            </button>
                          ) : (
                            <span className="text-gray-400">Pending Issue</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Personal Handover Authorizations */}
          <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Issued Handover Authorizations
            </h3>

            {myEquipmentData.handovers?.length === 0 ? (
              <div className="text-xs text-gray-400">No handover authorizations generated for your account.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-900 border-b border-border text-gray-400 uppercase tracking-wider font-bold">
                      <th className="p-3">Auth Code</th>
                      <th className="p-3">Equipment</th>
                      <th className="p-3">Issued By</th>
                      <th className="p-3">Issued Date</th>
                      <th className="p-3">Accessories Included</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {myEquipmentData.handovers.map((h: any) => (
                      <tr key={h.id} className="hover:bg-gray-800/40">
                        <td className="p-3 font-mono font-bold text-cyan-400">{h.authorizationId}</td>
                        <td className="p-3 font-bold text-white">{h.equipment?.name}</td>
                        <td className="p-3 text-gray-300">{h.issuedBy?.name}</td>
                        <td className="p-3 font-mono text-gray-300">
                          {h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : 'N/A'}
                        </td>
                        <td className="p-3 text-gray-400">{h.accessoriesIncluded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              Submit Equipment Request
            </h3>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Approved Shoot Project *</label>
                <select
                  required
                  value={requestForm.projectId}
                  onChange={(e) => setRequestForm({ ...requestForm, projectId: e.target.value })}
                  className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white"
                >
                  <option value="">Select Approved Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectId} - {p.name} ({p.status})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Equipment allocation is only available for approved projects.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Select Equipment Item *</label>
                <select
                  required
                  value={requestForm.equipmentId}
                  onChange={(e) => setRequestForm({ ...requestForm, equipmentId: e.target.value })}
                  className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white"
                >
                  <option value="">Select Equipment</option>
                  {availableEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.equipmentId} - {eq.name} ({eq.availability})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Required Date *</label>
                  <input
                    type="date"
                    required
                    value={requestForm.requiredDate}
                    onChange={(e) => setRequestForm({ ...requestForm, requiredDate: e.target.value })}
                    className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Expected Return Date *</label>
                  <input
                    type="date"
                    required
                    value={requestForm.expectedReturnDate}
                    onChange={(e) => setRequestForm({ ...requestForm, expectedReturnDate: e.target.value })}
                    className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Purpose & Requirements</label>
                <textarea
                  rows={2}
                  value={requestForm.purpose}
                  onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
                  className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white"
                  placeholder="e.g. Primary camera body for indoor studio shoot"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-bold text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-xs font-bold text-white"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
