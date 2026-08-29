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
        <div className="p-12 text-center text-gray-400">Loading equipment details...</div>
      </RoleGuard>
    );
  }

  if (!item) {
    return (
      <RoleGuard>
        <div className="p-12 text-center text-red-400">Equipment item not found.</div>
      </RoleGuard>
    );
  }

  const activeReservation = item.reservations?.find((r: any) => r.status === 'RESERVED');
  const activeMovement = item.movements?.[0];

  return (
    <RoleGuard>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/equipment"
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {item.equipmentId}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {item.category}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
                <Camera className="w-7 h-7 text-cyan-400" />
                {item.name}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Brand: <strong className="text-gray-200">{item.brand}</strong> | Model: <strong className="text-gray-200">{item.model}</strong> | Serial #: <span className="font-mono text-cyan-300">{item.serialNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase border ${
                item.availability === 'AVAILABLE'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : item.availability === 'RESERVED'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : item.availability === 'CHECKED_OUT' || item.availability === 'IN_USE'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-red-500/20 text-red-300 border-red-500/40'
              }`}
            >
              Status: {item.availability}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400 font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('assignment')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'assignment'
                ? 'border-purple-500 text-purple-400 font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Assignment & Usage
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'maintenance'
                ? 'border-cyan-500 text-cyan-400 font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Maintenance ({maintenanceRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('damage')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'damage'
                ? 'border-red-500 text-red-400 font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Damage Reports ({damageReports.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'timeline'
                ? 'border-indigo-500 text-indigo-400 font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            History & Timeline ({timeline.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Asset Master Details</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 font-bold block">Permanent Equipment ID</span>
                  <span className="font-mono text-cyan-300 font-bold">{item.equipmentId}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">Company Ownership</span>
                  <span className="text-emerald-400 font-bold">COMPANY (Always Permanent)</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">Physical Condition</span>
                  <span className="text-gray-200">{item.condition}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">Storage Location</span>
                  <span className="text-gray-200">{item.storageLocation || 'Studio Storage Bay'}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">Purchase Date</span>
                  <span className="text-gray-300 font-mono">
                    {item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">Purchase Cost</span>
                  <span className="text-gray-300 font-mono">
                    {item.purchaseCost ? `$${item.purchaseCost.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              </div>

              {item.internalNotes && (
                <div className="pt-2 border-t border-gray-800">
                  <span className="text-xs font-bold text-gray-400 block mb-1">Internal Notes</span>
                  <p className="text-xs text-gray-300 leading-relaxed bg-gray-900/60 p-3 rounded-xl border border-gray-800">
                    {item.internalNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Current Operational Status</h3>
              <div className="p-4 bg-gray-900/70 rounded-xl border border-gray-800 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Status:</span>
                  <span className="font-bold text-white uppercase">{item.availability}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Holder / Employee:</span>
                  <span className="font-bold text-blue-300">{item.currentHolder || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Assigned Project:</span>
                  <span className="font-bold text-purple-300">
                    {activeReservation?.project?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Maintenance Status:</span>
                  <span className="font-bold text-cyan-300">{item.maintenanceStatus}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assignment' && (
          <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Reservations & Assignments</h3>
            {item.reservations?.length === 0 ? (
              <div className="text-xs text-gray-400">No active reservations for this equipment.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-900 border-b border-border text-gray-400 font-bold uppercase">
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
                        <td className="p-3 font-bold text-purple-300">{r.project?.name}</td>
                        <td className="p-3 text-gray-300">{r.reservedBy?.name}</td>
                        <td className="p-3 font-mono text-gray-300">{new Date(r.startDate).toISOString().split('T')[0]}</td>
                        <td className="p-3 font-mono text-gray-300">{new Date(r.endDate).toISOString().split('T')[0]}</td>
                        <td className="p-3 font-bold text-emerald-400">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Maintenance Records</h3>
            {maintenanceRecords.length === 0 ? (
              <div className="text-xs text-gray-400">No maintenance records logged for this equipment.</div>
            ) : (
              <div className="space-y-3 text-xs">
                {maintenanceRecords.map((m) => (
                  <div key={m.id} className="p-4 bg-gray-900/60 rounded-xl border border-gray-800 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">{m.maintenanceType} - {m.maintenanceId}</div>
                      <div className="text-gray-400">Technician: {m.performedBy}</div>
                      <div className="text-gray-400">{m.notes}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 uppercase">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'damage' && (
          <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Damage Reports</h3>
            {damageReports.length === 0 ? (
              <div className="text-xs text-gray-400">No damage reports on record for this equipment.</div>
            ) : (
              <div className="space-y-3 text-xs">
                {damageReports.map((d) => (
                  <div key={d.id} className="p-4 bg-gray-900/60 rounded-xl border border-gray-800 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-red-400">Severity: {d.severity}</div>
                      <div className="text-gray-300">{d.description}</div>
                      <div className="text-gray-400">Reported by: {d.reportedBy?.name}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30 uppercase">
                      {d.repairStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Permanent Movement Audit Log</h3>
            {timeline.length === 0 ? (
              <div className="text-xs text-gray-400">No movement events logged for this item.</div>
            ) : (
              <div className="space-y-3 text-xs">
                {timeline.map((t) => (
                  <div key={t.id} className="p-3 bg-gray-900/60 rounded-xl border border-gray-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-purple-300 uppercase mr-2">{t.action}</span>
                      <span className="text-gray-300">{t.notes}</span>
                    </div>
                    <span className="font-mono text-gray-400 text-[11px]">{new Date(t.timestamp).toLocaleString()}</span>
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
