'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import { History, ArrowLeft, Camera, User, Film, Clock, ShieldCheck } from 'lucide-react';

export default function EquipmentHistoryPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const res = await fetchApi('/equipment/reports/summary');
      if (res?.recentMovements && Array.isArray(res.recentMovements)) {
        setMovements(res.recentMovements);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

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
                <History className="w-7 h-7 text-purple-600" />
                Permanent Equipment Audit History &amp; Timeline
              </h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading equipment movement history...</div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No historical equipment movements recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Equipment</th>
                    <th className="p-3.5">Action Event</th>
                    <th className="p-3.5">Action Performed By</th>
                    <th className="p-3.5">Associated Project</th>
                    <th className="p-3.5">Audit Notes & Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-100/40">
                      <td className="p-3.5 font-mono text-slate-700">
                        {m.timestamp ? new Date(m.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{m.equipment?.name}</div>
                        <div className="font-mono text-[11px] text-cyan-600">{m.equipment?.equipmentId}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded font-extrabold text-[10px] uppercase bg-purple-50 text-purple-700 border border-purple-200">
                          {m.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700">{m.user?.name || 'System'}</td>
                      <td className="p-3.5 font-bold text-blue-700">{m.project?.name || 'N/A'}</td>
                      <td className="p-3.5 text-slate-500 max-w-sm">{m.notes || '—'}</td>
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
