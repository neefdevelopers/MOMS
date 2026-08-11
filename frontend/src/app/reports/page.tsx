'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { BarChart3, TrendingUp, PieChart, Layers, ShieldCheck, Users, Building2, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [scriptAnalytics, setScriptAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [resProd, resScript] = await Promise.all([
          fetchApi('/reports/production'),
          fetchApi('/reports/script-analytics'),
        ]);
        setData(resProd);
        setScriptAnalytics(resScript);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Operational &amp; Script Analytics Reports...</div>;

  const chartData = data?.shootTypeBreakdown?.map((item: any) => ({
    name: `${item.shootType} SHOOT`,
    count: item._count,
  })) || [];

  return (
    <div className="space-y-6 text-xs">
      <div className="bg-card border border-border p-6 rounded-xl">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" /> Operational &amp; Script Analytics Reports
        </h1>
        <p className="text-xs text-gray-400 mt-1">Comprehensive performance analytics compiled directly from active scripts &amp; projects</p>
      </div>

      {/* 8 Script Contribution Report Sections */}
      <div className="space-y-6">
        {/* Section 1 & 2: Employee Productivity & Brand Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Employee Productivity Report */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> 1. Employee Productivity Reports
            </h2>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(scriptAnalytics?.employeeProductivity || []).length === 0 ? (
                <p className="text-gray-500 italic">No employee assignments recorded yet.</p>
              ) : (
                (scriptAnalytics?.employeeProductivity || []).map((emp: any) => (
                  <div key={emp.userId} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                    <div>
                      <strong className="text-white text-xs block">{emp.name}</strong>
                      <span className="text-[10px] text-gray-400">{emp.role}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <div><span className="text-gray-500">Assigned:</span> <strong className="text-blue-300">{emp.assignedCount}</strong></div>
                      <div><span className="text-gray-500">Completed:</span> <strong className="text-emerald-400">{emp.completedCount}</strong></div>
                      <div><span className="text-gray-500">Revisions:</span> <strong className="text-amber-300">{emp.revisionCount}</strong></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. Brand Performance Report */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" /> 2. Brand Performance Reports
            </h2>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(scriptAnalytics?.brandPerformance || []).length === 0 ? (
                <p className="text-gray-500 italic">No brand script data available.</p>
              ) : (
                (scriptAnalytics?.brandPerformance || []).map((b: any) => (
                  <div key={b.brandId} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                    <div>
                      <strong className="text-purple-300 text-xs block">[{b.shortCode}] {b.name}</strong>
                      <span className="text-[10px] text-gray-400">{b.deliverableCount} Deliverables Planned</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <div><span className="text-gray-500">Scripts:</span> <strong className="text-white">{b.scriptCount}</strong></div>
                      <div><span className="text-gray-500">Completed:</span> <strong className="text-emerald-400">{b.completedCount}</strong></div>
                      <div><span className="text-gray-500">Revisions:</span> <strong className="text-amber-300">{b.totalRevisions}</strong></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 3 & 4: Product Performance & Language-wise Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3. Product Performance Report */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> 3. Product Performance Reports
            </h2>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(scriptAnalytics?.productPerformance || []).length === 0 ? (
                <p className="text-gray-500 italic">No product script data available.</p>
              ) : (
                (scriptAnalytics?.productPerformance || []).map((p: any) => (
                  <div key={p.productId} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                    <div>
                      <strong className="text-cyan-300 text-xs block">{p.name}</strong>
                      <span className="text-[10px] text-gray-400">Code: {p.productCode}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <div><span className="text-gray-500">Scripts:</span> <strong className="text-white">{p.scriptCount}</strong></div>
                      <div><span className="text-gray-500">Completed:</span> <strong className="text-emerald-400">{p.completedCount}</strong></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. Language-wise Reports */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> 4. Language-wise Reports
            </h2>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {(scriptAnalytics?.languageWiseReports || []).map((l: any) => (
                <div key={l.language} className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
                  <span className="font-bold text-emerald-300 block">{l.language}</span>
                  <div className="text-gray-400 text-[10px]">
                    Total: <strong className="text-white">{l.totalScripts}</strong> | Done: <strong className="text-emerald-400">{l.completedScripts}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5 & 6: Category-wise & Production Capacity Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 5. Category-wise Reports */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-400" /> 5. Category-wise Reports
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(scriptAnalytics?.categoryWiseReports || []).map((c: any) => (
                <div key={c.category} className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
                  <span className="font-semibold text-amber-300 block text-[11px]">{c.category}</span>
                  <div className="text-xl font-bold text-white font-mono">{c.totalScripts}</div>
                  <div className="text-[9px] text-gray-400">Completed: {c.completedScripts} | Revisions: {c.totalRevisions}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Production Capacity Reports */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" /> 6. Production Capacity Reports
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
              <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg">
                <span className="text-gray-400 text-[10px] block">In Pipeline</span>
                <strong className="text-lg text-blue-400 font-mono">{scriptAnalytics?.productionCapacity?.totalPipelineScripts || 0}</strong>
              </div>
              <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg">
                <span className="text-gray-400 text-[10px] block">In Production</span>
                <strong className="text-lg text-yellow-400 font-mono">{scriptAnalytics?.productionCapacity?.inProductionCount || 0}</strong>
              </div>
              <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg">
                <span className="text-gray-400 text-[10px] block">Ready</span>
                <strong className="text-lg text-purple-400 font-mono">{scriptAnalytics?.productionCapacity?.readyCount || 0}</strong>
              </div>
              <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg">
                <span className="text-gray-400 text-[10px] block">Deliverables</span>
                <strong className="text-lg text-cyan-400 font-mono">{scriptAnalytics?.productionCapacity?.totalDeliverablesPlanned || 0}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Section 7 & 8: Revision Reports & Approval Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 7. Revision Reports */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-red-400" /> 7. Revision Reports
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg">
                <span className="text-gray-400 text-[10px] block">Total Revisions</span>
                <strong className="text-lg text-amber-300 font-mono">{scriptAnalytics?.revisionReports?.totalRevisions || 0}</strong>
              </div>
              <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg">
                <span className="text-gray-400 text-[10px] block">Avg / Script</span>
                <strong className="text-lg text-blue-400 font-mono">{scriptAnalytics?.revisionReports?.avgRevisionsPerScript || 0}</strong>
              </div>
              <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg">
                <span className="text-gray-400 text-[10px] block">Pending Revisions</span>
                <strong className="text-lg text-red-400 font-mono">{scriptAnalytics?.revisionReports?.pendingRevisionRequestCount || 0}</strong>
              </div>
            </div>
          </div>

          {/* 8. Approval Reports */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 8. Approval Reports
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
              <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg">
                <span className="text-gray-400 text-[10px] block">Tech Approved</span>
                <strong className="text-purple-300 font-mono">{scriptAnalytics?.approvalReports?.technicalApprovedCount || 0}</strong>
              </div>
              <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg">
                <span className="text-gray-400 text-[10px] block">Media Approved</span>
                <strong className="text-indigo-300 font-mono">{scriptAnalytics?.approvalReports?.mediaApprovedCount || 0}</strong>
              </div>
              <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg">
                <span className="text-gray-400 text-[10px] block">Client Confirmed</span>
                <strong className="text-cyan-300 font-mono">{scriptAnalytics?.approvalReports?.clientConfirmedCount || 0}</strong>
              </div>
              <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg">
                <span className="text-gray-400 text-[10px] block">Fully Approved</span>
                <strong className="text-emerald-400 font-mono">{scriptAnalytics?.approvalReports?.fullyApprovedCount || 0}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
