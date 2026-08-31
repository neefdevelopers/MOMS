'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Camera,
  Plus,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  BadgeCheck,
} from 'lucide-react';

export default function MyEquipmentPage() {
  const { user } = useAuth();
  const [myEquipmentData, setMyEquipmentData] = useState<any>({ requests: [], handovers: [], movements: [] });
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Request Equipment Form Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    equipmentId: '',
    projectId: '',
    purpose: '',
    requiredDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    remarks: '',
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const loadData = async () => {
    try {
      const [myRes, reqList, allEq, projList] = await Promise.all([
        fetchApi('/equipment/my').catch(() => null),
        fetchApi('/equipment/requests').catch(() => []),
        fetchApi('/equipment').catch(() => []),
        fetchApi('/projects').catch(() => []),
      ]);

      if (myRes) setMyEquipmentData((prev: any) => ({ ...prev, ...myRes, requests: reqList }));
      else setMyEquipmentData((prev: any) => ({ ...prev, requests: reqList }));

      if (Array.isArray(allEq)) {
        setAvailableEquipment(allEq.filter((eq: any) => !eq.isArchived && (eq.availability === 'AVAILABLE' || eq.availability === 'RESERVED')));
      }

      if (Array.isArray(projList)) {
        // Staff can request equipment for projects they are involved with
        setMyProjects(projList);
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
    if (!requestForm.equipmentId || !requestForm.projectId || !requestForm.purpose) {
      alert('Please fill in all required fields (Equipment, Project, Purpose).');
      return;
    }
    if (new Date(requestForm.expectedReturnDate) < new Date(requestForm.requiredDate)) {
      alert('Expected Return Date cannot be earlier than Required Date.');
      return;
    }

    setSubmittingRequest(true);
    try {
      await fetchApi('/equipment/requests', {
        method: 'POST',
        body: JSON.stringify(requestForm),
      });
      alert('Equipment Request submitted successfully! Status: Pending Approval by Media Manager.');
      setShowRequestModal(false);
      setRequestForm({
        equipmentId: '',
        projectId: '',
        purpose: '',
        requiredDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        remarks: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit equipment request');
    } finally {
      setSubmittingRequest(false);
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
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Staff Personal Workspace
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <Camera className="w-7 h-7 text-emerald-400" />
            My Equipment & Requests Portal
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Submit equipment requests for your assigned projects, track request status, and digitally acknowledge received gear.
          </p>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          Request Equipment
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading your equipment portfolio...</div>
      ) : (
        <div className="space-y-6">

          {/* Section 1: My Equipment Requests */}
          <div className="bg-card p-5 rounded-2xl border border-border space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                My Equipment Requests & Approvals Status
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                {(myEquipmentData.requests || []).length} Request(s)
              </span>
            </div>

            {(!myEquipmentData.requests || myEquipmentData.requests.length === 0) ? (
              <div className="p-6 text-center text-gray-400 bg-gray-900/50 border border-gray-800 rounded-xl space-y-2">
                <FileText className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="font-semibold text-gray-300">No equipment requests submitted yet.</p>
                <p className="text-[11px] text-gray-500">Click "Request Equipment" above to submit a request for your shoot project.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-900 border-b border-border text-gray-400 uppercase tracking-wider font-bold">
                      <th className="p-3">Equipment Required</th>
                      <th className="p-3">Assigned Project</th>
                      <th className="p-3">Required Date</th>
                      <th className="p-3">Expected Return</th>
                      <th className="p-3">Approval Status</th>
                      <th className="p-3">Purpose & Notes</th>
                      <th className="p-3">Actions / Handover</th>
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
                                : r.status === 'REJECTED'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : 'bg-gray-500/20 text-gray-300 border-gray-500/40'
                            }`}
                          >
                            {r.status === 'PENDING' ? 'Pending Approval' : r.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300 max-w-xs">
                          <div>{r.purpose}</div>
                          {r.reviewNotes && (
                            <div className="text-[10px] text-red-400 mt-1 italic">
                              Rejection Reason: {r.reviewNotes}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {r.isAcknowledged ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5" /> Acknowledged
                            </span>
                          ) : r.status === 'CHECKED_OUT' ? (
                            <button
                              onClick={() => handleAcknowledge(r.id)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] rounded transition-all shadow"
                            >
                              Acknowledge Receipt
                            </button>
                          ) : (
                            <span className="text-gray-400 text-[10px]">
                              {r.status === 'PENDING' ? 'Awaiting Media Manager Review' : 'N/A'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: My Issued Equipment & Active Handovers */}
          <div className="bg-card p-5 rounded-2xl border border-border space-y-4 shadow-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              My Issued Equipment & Active Handovers
            </h3>

            {(!myEquipmentData.movements || myEquipmentData.movements.length === 0) ? (
              <div className="text-xs text-gray-400 p-4 text-center">No active or past equipment handovers recorded for your account.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-900 border-b border-border text-gray-400 uppercase tracking-wider font-bold">
                      <th className="p-3">Equipment</th>
                      <th className="p-3">Project / Assignment</th>
                      <th className="p-3">Issued Date</th>
                      <th className="p-3">Expected Return</th>
                      <th className="p-3">Action / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(myEquipmentData.movements || []).map((m: any) => (
                      <tr key={m.id} className="hover:bg-gray-800/40">
                        <td className="p-3">
                          <div className="font-bold text-white">{m.equipment?.name}</div>
                          <div className="font-mono text-[11px] text-cyan-400">{m.equipment?.equipmentId}</div>
                        </td>
                        <td className="p-3 font-bold text-purple-300">{m.project?.name || 'Shoot Project'}</td>
                        <td className="p-3 font-mono text-gray-300">
                          {m.timestamp ? new Date(m.timestamp).toISOString().split('T')[0] : 'N/A'}
                        </td>
                        <td className="p-3 font-mono text-amber-300">
                          {m.expectedReturnDate ? new Date(m.expectedReturnDate).toISOString().split('T')[0] : 'N/A'}
                        </td>
                        <td className="p-3 text-gray-300">
                          <span className="px-2 py-0.5 rounded font-extrabold text-[10px] uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 mr-2">
                            {m.action}
                          </span>
                          {m.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Equipment Request Form Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border p-6 space-y-4 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                Submit Equipment Request
              </h3>
              <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Select Assigned Shoot Project *</label>
                <select
                  required
                  value={requestForm.projectId}
                  onChange={(e) => setRequestForm({ ...requestForm, projectId: e.target.value })}
                  className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">Select Shoot Project...</option>
                  {myProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectId} - {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Select Equipment Item *</label>
                <select
                  required
                  value={requestForm.equipmentId}
                  onChange={(e) => setRequestForm({ ...requestForm, equipmentId: e.target.value })}
                  className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">Select Equipment...</option>
                  {availableEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.equipmentId}) — {eq.category} [{eq.brand} {eq.model}]
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
                    className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Expected Return Date *</label>
                  <input
                    type="date"
                    required
                    value={requestForm.expectedReturnDate}
                    onChange={(e) => setRequestForm({ ...requestForm, expectedReturnDate: e.target.value })}
                    className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Purpose & Requirements *</label>
                <textarea
                  required
                  rows={2}
                  value={requestForm.purpose}
                  onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
                  className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Primary camera body for outdoor shoot B-roll recording"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  value={requestForm.remarks}
                  onChange={(e) => setRequestForm({ ...requestForm, remarks: e.target.value })}
                  className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Additional notes or accessories required"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-bold text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 disabled:opacity-50"
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
