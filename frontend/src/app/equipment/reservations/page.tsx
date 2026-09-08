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
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/equipment"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <CalendarCheck className="w-7 h-7 text-purple-600" />
                Equipment Reservations &amp; Allocation Schedule
              </h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading reservations schedule...</div>
          ) : equipmentList.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No active equipment reservations or allocations found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="p-3.5">Equipment Code & Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Current Holder / Assignee</th>
                    <th className="p-3.5">Availability Status</th>
                    <th className="p-3.5">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {equipmentList.map((eq) => (
                    <tr key={eq.id} className="hover:bg-slate-100/40">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{eq.name}</div>
                        <div className="font-mono text-[11px] text-cyan-600">{eq.equipmentId}</div>
                      </td>
                      <td className="p-3.5 text-slate-700">{eq.category}</td>
                      <td className="p-3.5 font-bold text-purple-700">{eq.currentHolder || 'Allocated for Shoot'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                          {eq.availability}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500">{eq.condition || 'Operational'}</td>
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
