'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import {
  Camera,
  ArrowLeft,
  Wrench,
  AlertTriangle,
  History,
  CheckCircle2,
  Clock,
  User,
  Film,
  Building2,
  Tag,
  ShieldCheck,
  RotateCcw,
  Archive,
} from 'lucide-react';

export default function EquipmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [item, setItem] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [damageReports, setDamageReports] = useState<any[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignment' | 'maintenance' | 'damage' | 'timeline'>('overview');

  const loadDetails = async () => {
    try {
      const [eqData, timelineData, dmgData, mntData] = await Promise.all([
        fetchApi(`/equipment/${id}`),
        fetchApi(`/equipment/${id}/timeline`).catch(() => []),
        fetchApi(`/equipment/damage-reports?equipmentId=${id}`).catch(() => []),
        fetchApi(`/equipment/maintenance-records?equipmentId=${id}`).catch(() => []),
      ]);

      if (eqData) setItem(eqData);
      if (Array.isArray(timelineData)) setTimeline(timelineData);
      if (Array.isArray(dmgData)) setDamageReports(dmgData);
      if (Array.isArray(mntData)) setMaintenanceRecords(mntData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadDetails();
  }, [id]);

  if (loading) {
    return (
      <RoleGuard>
        <div className="p-12 text-center text-slate-500">Loading equipment details...</div>
      </RoleGuard>
    );
  }

  if (!item) {
    return (
      <RoleGuard>
        <div className="p-12 text-center text-rose-600">Equipment item not found.</div>
      </RoleGuard>
    );
  }

  const activeReservation = item.reservations?.find((r: any) => r.status === 'RESERVED');
  const activeMovement = item.movements?.[0];

  return (
    <RoleGuard>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/equipment"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                  {item.equipmentId}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                  {item.category}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                <Camera className="w-7 h-7 text-cyan-600" />
                {item.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Brand: <strong className="text-slate-800">{item.brand}</strong> | Model: <strong className="text-slate-800">{item.model}</strong> | Serial #: <span className="font-mono text-cyan-700">{item.serialNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase border ${
                item.availability === 'AVAILABLE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : item.availability === 'RESERVED'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : item.availability === 'CHECKED_OUT' || item.availability === 'IN_USE'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              Status: {item.availability}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('assignment')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'assignment'
                ? 'border-purple-500 text-purple-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Assignment & Usage
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'maintenance'
                ? 'border-cyan-500 text-cyan-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Maintenance ({maintenanceRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('damage')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'damage'
                ? 'border-red-500 text-rose-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Damage Reports ({damageReports.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'timeline'
                ? 'border-indigo-500 text-indigo-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            History & Timeline ({timeline.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Asset Master Details</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block">Permanent Equipment ID</span>
                  <span className="font-mono text-cyan-700 font-bold">{item.equipmentId}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Company Ownership</span>
                  <span className="text-emerald-600 font-bold">COMPANY (Always Permanent)</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Physical Condition</span>
                  <span className="text-slate-800">{item.condition}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Storage Location</span>
                  <span className="text-slate-800">{item.storageLocation || 'Studio Storage Bay'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Purchase Date</span>
                  <span className="text-slate-700 font-mono">
                    {item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Purchase Cost</span>
                  <span className="text-slate-700 font-mono">
                    {item.purchaseCost ? `$${item.purchaseCost.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              </div>

              {item.internalNotes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block mb-1">Internal Notes</span>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-200">
                    {item.internalNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Current Operational Status</h3>
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-bold text-slate-900 uppercase">{item.availability}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Holder / Employee:</span>
                  <span className="font-bold text-blue-700">{item.currentHolder || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Project:</span>
                  <span className="font-bold text-purple-700">
                    {activeReservation?.project?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Maintenance Status:</span>
                  <span className="font-bold text-cyan-700">{item.maintenanceStatus}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assignment' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Reservations & Assignments</h3>
            {item.reservations?.length === 0 ? (
              <div className="text-xs text-slate-500">No active reservations for this equipment.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <th className="p-3">Project</th>
                      <th className="p-3">Reserved By</th>
                      <th className="p-3">Start Date</th>
                      <th className="p-3">End Date</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {item.reservations.map((r: any) => (
                      <tr key={r.id}>
                        <td className="p-3 font-bold text-purple-700">{r.project?.name}</td>
                        <td className="p-3 text-slate-700">{r.reservedBy?.name}</td>
                        <td className="p-3 font-mono text-slate-700">{new Date(r.startDate).toISOString().split('T')[0]}</td>
                        <td className="p-3 font-mono text-slate-700">{new Date(r.endDate).toISOString().split('T')[0]}</td>
                        <td className="p-3 font-bold text-emerald-600">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Maintenance Records</h3>
            {maintenanceRecords.length === 0 ? (
              <div className="text-xs text-slate-500">No maintenance records logged for this equipment.</div>
            ) : (
              <div className="space-y-3 text-xs">
                {maintenanceRecords.map((m) => (
                  <div key={m.id} className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{m.maintenanceType} - {m.maintenanceId}</div>
                      <div className="text-slate-500">Technician: {m.performedBy}</div>
                      <div className="text-slate-500">{m.notes}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-cyan-50 text-cyan-700 font-bold border border-cyan-200 uppercase">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'damage' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Damage Reports</h3>
            {damageReports.length === 0 ? (
              <div className="text-xs text-slate-500">No damage reports on record for this equipment.</div>
            ) : (
              <div className="space-y-3 text-xs">
                {damageReports.map((d) => (
                  <div key={d.id} className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-rose-600">Severity: {d.severity}</div>
                      <div className="text-slate-700">{d.description}</div>
                      <div className="text-slate-500">Reported by: {d.reportedBy?.name}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200 uppercase">
                      {d.repairStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Permanent Movement Audit Log</h3>
            {timeline.length === 0 ? (
              <div className="text-xs text-slate-500">No movement events logged for this item.</div>
            ) : (
              <div className="space-y-3 text-xs">
                {timeline.map((t) => (
                  <div key={t.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-purple-700 uppercase mr-2">{t.action}</span>
                      <span className="text-slate-700">{t.notes}</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[11px]">{new Date(t.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
