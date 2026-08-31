'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import { CalendarCheck, Camera, Film, User, Clock, ArrowLeft } from 'lucide-react';

export default function EquipmentReservationsPage() {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReservations = async () => {
    try {
      const res = await fetchApi('/equipment');
      if (Array.isArray(res)) {
        setEquipmentList(res.filter((e: any) => e.availability === 'RESERVED' || e.availability === 'CHECKED_OUT' || e.availability === 'IN_USE'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  return (
    <RoleGuard>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-xs">
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
                Operations Workspace
              </span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
                <CalendarCheck className="w-7 h-7 text-purple-400" />
                Equipment Reservations & Allocation Schedule
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading reservations schedule...</div>
          ) : equipmentList.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No active equipment reservations or allocations found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-900/80 border-b border-border text-gray-400 uppercase tracking-wider font-bold">
                    <th className="p-3.5">Equipment Code & Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Current Holder / Assignee</th>
                    <th className="p-3.5">Availability Status</th>
                    <th className="p-3.5">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {equipmentList.map((eq) => (
                    <tr key={eq.id} className="hover:bg-gray-800/40">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{eq.name}</div>
                        <div className="font-mono text-[11px] text-cyan-400">{eq.equipmentId}</div>
                      </td>
                      <td className="p-3.5 text-gray-300">{eq.category}</td>
                      <td className="p-3.5 font-bold text-purple-300">{eq.currentHolder || 'Allocated for Shoot'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                          {eq.availability}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-400">{eq.condition || 'Operational'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
