'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import { CalendarCheck, Camera, Film, User, Clock, ArrowLeft } from 'lucide-react';

export default function EquipmentReservationsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReservations = async () => {
    try {
      const res = await fetchApi('/equipment/requests');
      if (Array.isArray(res)) {
        setRequests(res.filter((r: any) => r.status === 'APPROVED' || r.status === 'PENDING' || r.status === 'RESERVED'));
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
                <CalendarCheck className="w-7 h-7 text-purple-400" />
                Equipment Reservations & Approvals Schedule
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading reservations schedule...</div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No active equipment reservations found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-900/80 border-b border-border text-gray-400 uppercase tracking-wider font-bold">
                    <th className="p-3.5">Equipment Code & Name</th>
                    <th className="p-3.5">Assigned Shoot Project</th>
                    <th className="p-3.5">Requested By</th>
                    <th className="p-3.5">Required Date</th>
                    <th className="p-3.5">Expected Return</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Purpose / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-800/40">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{r.equipment?.name}</div>
                        <div className="font-mono text-[11px] text-cyan-400">{r.equipment?.equipmentId}</div>
                      </td>
                      <td className="p-3.5 font-bold text-purple-300">{r.project?.name || 'N/A'}</td>
                      <td className="p-3.5 text-gray-300">{r.requestedBy?.name}</td>
                      <td className="p-3.5 font-mono text-gray-300">
                        {r.requiredDate ? new Date(r.requiredDate).toISOString().split('T')[0] : 'N/A'}
                      </td>
                      <td className="p-3.5 font-mono text-gray-300">
                        {r.expectedReturnDate ? new Date(r.expectedReturnDate).toISOString().split('T')[0] : 'N/A'}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-400">{r.purpose || r.remarks || 'Shoot allocation'}</td>
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
