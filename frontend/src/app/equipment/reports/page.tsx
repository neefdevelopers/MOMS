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
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/equipment"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <FileBarChart className="w-7 h-7 text-cyan-600" />
                Equipment Inventory &amp; Utilization Reports
              </h1>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Generating equipment reports...</div>
        ) : (
          <div className="space-y-6">
            {/* Metrics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase">Total Asset Fleet</span>
                <div className="text-3xl font-extrabold text-slate-900 mt-1">{reports?.summary?.totalCount || 0}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase">Available Rate</span>
                <div className="text-3xl font-extrabold text-emerald-600 mt-1">{reports?.summary?.availabilityRate || 0}%</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase">Field Utilization</span>
                <div className="text-3xl font-extrabold text-cyan-600 mt-1">{reports?.summary?.utilizationRate || 0}%</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase">Under Service</span>
                <div className="text-3xl font-extrabold text-amber-600 mt-1">{reports?.summary?.maintenanceCount || 0}</div>
              </div>
            </div>

            {/* Active Field Checkouts Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Field Checkouts & Expected Returns</h3>
              {reports?.activeCheckouts?.length === 0 ? (
                <div className="text-xs text-slate-500">No active equipment checkouts currently in field.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                        <th className="p-3">Equipment</th>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Project</th>
                        <th className="p-3">Expected Return Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {reports?.activeCheckouts?.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-100/40">
                          <td className="p-3 font-bold text-slate-900">{c.equipment?.name}</td>
                          <td className="p-3 text-slate-700">{c.requestedBy?.name}</td>
                          <td className="p-3 font-bold text-purple-700">{c.project?.name}</td>
                          <td className="p-3 font-mono text-cyan-700">
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
