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
  CheckCircle,
  FileText,
  X,
  Package,
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
  const [requestDates, setRequestDates] = useState({
    startDate: project.shootDate ? new Date(project.shootDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: project.shootDate ? new Date(new Date(project.shootDate).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

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
      await fetchApi(`/equipment/${selectedEqId}/reserve`, {
        method: 'POST',
        body: JSON.stringify({
          projectId: project.id,
          startDate: requestDates.startDate,
          endDate: requestDates.endDate,
        }),
      });
      alert('Equipment request submitted successfully!');
      setShowRequestModal(false);
      setSelectedEqId('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit equipment request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const reservations = project.equipmentReservations || [];

  return (
    <div className="space-y-6 text-xs">
      {/* Header & Request Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Project Equipment Requests
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Request and reserve production cameras, lenses, lighting, and audio equipment for this shoot.
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

      {/* Equipment Requests List */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-600" />
            Requested Equipment ({reservations.length})
          </h4>
          <span className="text-xs text-slate-500 font-mono">
            {reservations.length === 1 ? '1 Item Reserved' : `${reservations.length} Items Reserved`}
          </span>
        </div>

        {reservations.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/60 border border-slate-200 rounded-xl space-y-3">
            <Camera className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-slate-700 font-bold text-xs">No equipment requested for this shoot project yet.</p>
              <p className="text-[11px] text-slate-400">Click "Request Equipment" above to allocate cameras, lighting, or audio gear.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-xs text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Request Equipment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {reservations.map((res: any) => {
              const eq = res.equipment;
              return (
                <div key={res.id} className="bg-slate-50/70 border border-slate-200 p-4 rounded-xl space-y-3 shadow-xs hover:border-blue-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <strong className="text-slate-900 font-bold text-sm block leading-tight">
                        {eq?.name || 'Equipment'}
                      </strong>
                      <span className="font-mono text-[10px] text-blue-700 font-bold px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                        {eq?.equipmentId || 'ID'}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border font-mono ${
                      eq?.availability === 'AVAILABLE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : eq?.availability === 'CHECKED_OUT'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {eq?.availability || 'RESERVED'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1.5 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span>Category:</span>
                      <strong className="text-slate-800">{eq?.category || 'General'}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Schedule:</span>
                      <span className="font-mono text-slate-700 font-semibold">
                        {new Date(res.startDate).toLocaleDateString()} – {new Date(res.endDate).toLocaleDateString()}
                      </span>
                    </div>

                    {res.reservedBy && (
                      <div className="flex items-center justify-between">
                        <span>Requested By:</span>
                        <strong className="text-slate-700">{res.reservedBy.name}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Equipment Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in duration-150">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="">Select Equipment...</option>
                  {allEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id} disabled={eq.availability !== 'AVAILABLE'}>
                      {eq.name} ({eq.equipmentId}) — {eq.category} [{eq.availability}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-xs">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={requestDates.startDate}
                    onChange={(e) => setRequestDates({ ...requestDates, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-xs">End Date *</label>
                  <input
                    type="date"
                    required
                    value={requestDates.endDate}
                    onChange={(e) => setRequestDates({ ...requestDates, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
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
