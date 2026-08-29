'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import { FileBarChart, ArrowLeft, TrendingUp, CheckCircle2, Camera, Wrench, AlertTriangle } from 'lucide-react';

export default function EquipmentReportsPage() {
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      const data = await fetchApi('/equipment/reports/summary');
      if (data) setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
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
                Technical Manager Workspace
              </span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
                <FileBarChart className="w-7 h-7 text-cyan-400" />
                Equipment Inventory & Utilization Reports
              </h1>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Generating equipment reports...</div>
        ) : (
          <div className="space-y-6">
            {/* Metrics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-card p-5 rounded-2xl border border-border">
                <span className="text-xs text-gray-400 font-bold uppercase">Total Asset Fleet</span>
                <div className="text-3xl font-extrabold text-white mt-1">{reports?.summary?.totalCount || 0}</div>
              </div>
              <div className="bg-card p-5 rounded-2xl border border-border">
                <span className="text-xs text-gray-400 font-bold uppercase">Available Rate</span>
                <div className="text-3xl font-extrabold text-emerald-400 mt-1">{reports?.summary?.availabilityRate || 0}%</div>
              </div>
              <div className="bg-card p-5 rounded-2xl border border-border">
                <span className="text-xs text-gray-400 font-bold uppercase">Field Utilization</span>
                <div className="text-3xl font-extrabold text-cyan-400 mt-1">{reports?.summary?.utilizationRate || 0}%</div>
              </div>
              <div className="bg-card p-5 rounded-2xl border border-border">
                <span className="text-xs text-gray-400 font-bold uppercase">Under Service</span>
                <div className="text-3xl font-extrabold text-amber-400 mt-1">{reports?.summary?.maintenanceCount || 0}</div>
              </div>
            </div>

            {/* Active Field Checkouts Table */}
            <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Field Checkouts & Expected Returns</h3>
              {reports?.activeCheckouts?.length === 0 ? (
                <div className="text-xs text-gray-400">No active equipment checkouts currently in field.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-900 border-b border-border text-gray-400 uppercase tracking-wider font-bold">
                        <th className="p-3">Equipment</th>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Project</th>
                        <th className="p-3">Expected Return Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {reports?.activeCheckouts?.map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-800/40">
                          <td className="p-3 font-bold text-white">{c.equipment?.name}</td>
                          <td className="p-3 text-gray-300">{c.requestedBy?.name}</td>
                          <td className="p-3 font-bold text-purple-300">{c.project?.name}</td>
                          <td className="p-3 font-mono text-cyan-300">
                            {c.expectedReturnDate ? new Date(c.expectedReturnDate).toISOString().split('T')[0] : 'N/A'}
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
      </div>
    </RoleGuard>
  );
}
