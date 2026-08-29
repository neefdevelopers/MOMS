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
                Technical Manager Audit Log
              </span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
                <History className="w-7 h-7 text-purple-400" />
                Permanent Equipment Audit History & Timeline
              </h1>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading equipment movement history...</div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No historical equipment movements recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-900/80 border-b border-border text-gray-400 uppercase tracking-wider font-bold">
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
                    <tr key={m.id} className="hover:bg-gray-800/40">
                      <td className="p-3.5 font-mono text-gray-300">
                        {m.timestamp ? new Date(m.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{m.equipment?.name}</div>
                        <div className="font-mono text-[11px] text-cyan-400">{m.equipment?.equipmentId}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded font-extrabold text-[10px] uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          {m.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-300">{m.user?.name || 'System'}</td>
                      <td className="p-3.5 font-bold text-blue-300">{m.project?.name || 'N/A'}</td>
                      <td className="p-3.5 text-gray-400 max-w-sm">{m.notes || '—'}</td>
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
