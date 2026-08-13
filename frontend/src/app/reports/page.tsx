'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import {
  BarChart3, TrendingUp, PieChart, Layers, ShieldCheck, Users, Building2, RotateCcw,
  Palette, Tag, Zap, Package,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BRAND_COLORS = ['#a78bfa', '#34d399', '#60a5fa', '#fbbf24', '#f87171', '#38bdf8', '#fb923c'];

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [scriptAnalytics, setScriptAnalytics] = useState<any>(null);
  const [graphicAnalytics, setGraphicAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scripts' | 'graphics'>('scripts');

  useEffect(() => {
    async function load() {
      try {
        const [resProd, resScript, resGraphic] = await Promise.all([
          fetchApi('/reports/production'),
          fetchApi('/reports/script-analytics'),
          fetchApi('/reports/graphic-analytics'),
        ]);
        setData(resProd);
        setScriptAnalytics(resScript);
        setGraphicAnalytics(resGraphic);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Operational Reports...</div>;

  const gr = graphicAnalytics;
  const typeChartData = (gr?.typeReports || []).map((t: any, i: number) => ({
    name: t.type,
    total: t.totalReqs,
    completed: t.completedCount,
    fill: BRAND_COLORS[i % BRAND_COLORS.length],
  }));

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="bg-card border border-border p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" /> Operational Analytics Reports
          </h1>
          <p className="text-xs text-gray-400 mt-1">Comprehensive performance analytics — Scripts &amp; Graphic Requirements</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Graphic Reqs</div>
            <div className="text-lg font-mono font-bold text-amber-400">{gr?.summary?.total || 0}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Completed</div>
            <div className="text-lg font-mono font-bold text-emerald-400">{gr?.summary?.completed || 0}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold">In Progress</div>
            <div className="text-lg font-mono font-bold text-yellow-400">{gr?.summary?.inProgress || 0}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Revisions</div>
            <div className="text-lg font-mono font-bold text-red-400">{gr?.summary?.totalRevisions || 0}</div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('scripts')}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'scripts' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Script Analytics
        </button>
        <button
          onClick={() => setActiveTab('graphics')}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'graphics' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
        >
          <Palette className="w-3.5 h-3.5" /> Graphic Req Analytics
        </button>
      </div>

      {/* SCRIPT ANALYTICS TAB */}
      {activeTab === 'scripts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> 1. Employee Productivity Reports</h2>
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
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-400" /> 2. Brand Performance Reports</h2>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-400" /> 3. Product Performance Reports</h2>
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
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> 4. Language-wise Reports</h2>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {(scriptAnalytics?.languageWiseReports || []).map((l: any) => (
                  <div key={l.language} className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
                    <span className="font-bold text-emerald-300 block">{l.language}</span>
                    <div className="text-gray-400 text-[10px]">Total: <strong className="text-white">{l.totalScripts}</strong> | Done: <strong className="text-emerald-400">{l.completedScripts}</strong></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><PieChart className="w-4 h-4 text-amber-400" /> 5. Category-wise Reports</h2>
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
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-400" /> 6. Production Capacity Reports</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">In Pipeline</span><strong className="text-lg text-blue-400 font-mono">{scriptAnalytics?.productionCapacity?.totalPipelineScripts || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">In Production</span><strong className="text-lg text-yellow-400 font-mono">{scriptAnalytics?.productionCapacity?.inProductionCount || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Ready</span><strong className="text-lg text-purple-400 font-mono">{scriptAnalytics?.productionCapacity?.readyCount || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Deliverables</span><strong className="text-lg text-cyan-400 font-mono">{scriptAnalytics?.productionCapacity?.totalDeliverablesPlanned || 0}</strong></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><RotateCcw className="w-4 h-4 text-red-400" /> 7. Revision Reports</h2>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Total Revisions</span><strong className="text-lg text-amber-300 font-mono">{scriptAnalytics?.revisionReports?.totalRevisions || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Avg / Script</span><strong className="text-lg text-blue-400 font-mono">{scriptAnalytics?.revisionReports?.avgRevisionsPerScript || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Pending Revisions</span><strong className="text-lg text-red-400 font-mono">{scriptAnalytics?.revisionReports?.pendingRevisionRequestCount || 0}</strong></div>
              </div>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> 8. Approval Reports</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Tech Approved</span><strong className="text-purple-300 font-mono">{scriptAnalytics?.approvalReports?.technicalApprovedCount || 0}</strong></div>
                <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Media Approved</span><strong className="text-indigo-300 font-mono">{scriptAnalytics?.approvalReports?.mediaApprovedCount || 0}</strong></div>
                <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Client Confirmed</span><strong className="text-cyan-300 font-mono">{scriptAnalytics?.approvalReports?.clientConfirmedCount || 0}</strong></div>
                <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Fully Approved</span><strong className="text-emerald-400 font-mono">{scriptAnalytics?.approvalReports?.fullyApprovedCount || 0}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRAPHIC REQUIREMENTS ANALYTICS TAB */}
      {activeTab === 'graphics' && (
        <div className="space-y-6">
          {/* 1. Employee Productivity */}
          <div className="bg-card border border-amber-900/30 p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> 1. Employee Productivity Reports
              <span className="ml-1 text-[10px] text-amber-400 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded-full font-semibold">Graphic Reqs</span>
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(gr?.employeeProductivity || []).length === 0 ? (
                <p className="text-gray-500 italic">No employee assignments in graphic requirements yet.</p>
              ) : (
                (gr?.employeeProductivity || []).map((emp: any) => (
                  <div key={emp.userId} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                    <div>
                      <strong className="text-white text-xs block">{emp.name}</strong>
                      <span className="text-[10px] text-gray-400">{emp.role}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <div><span className="text-gray-500">Reqs:</span> <strong className="text-blue-300">{emp.assignedCount}</strong></div>
                      <div><span className="text-gray-500">In Prog:</span> <strong className="text-yellow-300">{emp.inProgressCount}</strong></div>
                      <div><span className="text-gray-500">Done:</span> <strong className="text-emerald-400">{emp.completedCount}</strong></div>
                      <div><span className="text-gray-500">Rev:</span> <strong className="text-amber-300">{emp.revisionCount}</strong></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2 & 3: Brand + Product */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-400" /> 2. Brand Reports</h2>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(gr?.brandReports || []).length === 0 ? (
                  <p className="text-gray-500 italic">No brand graphic data available.</p>
                ) : (
                  (gr?.brandReports || []).map((b: any) => (
                    <div key={b.brandId} className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-purple-300 text-xs">[{b.shortCode}] {b.name}</strong>
                        <span className="text-[10px] text-gray-400 font-mono">{b.totalReqs} reqs</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: b.totalReqs > 0 ? `${(b.completedCount / b.totalReqs) * 100}%` : '0%' }} />
                      </div>
                      <div className="flex justify-between text-[10px] mt-1 text-gray-500">
                        <span>Done: <strong className="text-emerald-400">{b.completedCount}</strong></span>
                        <span>In Prog: <strong className="text-yellow-400">{b.inProgressCount}</strong></span>
                        <span>Rev: <strong className="text-amber-300">{b.totalRevisions}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><Package className="w-4 h-4 text-cyan-400" /> 3. Product Reports</h2>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(gr?.productReports || []).length === 0 ? (
                  <p className="text-gray-500 italic">No product graphic data available.</p>
                ) : (
                  (gr?.productReports || []).map((p: any) => (
                    <div key={p.productId} className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-cyan-300 text-xs">{p.name}</strong>
                        <span className="text-[10px] text-gray-400 font-mono">{p.totalReqs} reqs</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: p.totalReqs > 0 ? `${(p.completedCount / p.totalReqs) * 100}%` : '0%' }} />
                      </div>
                      <div className="flex justify-between text-[10px] mt-1 text-gray-500">
                        <span>Done: <strong className="text-emerald-400">{p.completedCount}</strong></span>
                        <span>Rev: <strong className="text-amber-300">{p.totalRevisions}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 4. Requirement Type Reports */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2"><Tag className="w-4 h-4 text-amber-400" /> 4. Requirement Type Reports</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(gr?.typeReports || []).map((t: any, i: number) => (
                  <div key={t.type} className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg">
                    <span className="font-semibold block text-[11px]" style={{ color: BRAND_COLORS[i % BRAND_COLORS.length] }}>{t.type}</span>
                    <div className="text-2xl font-bold text-white font-mono">{t.totalReqs}</div>
                    <div className="text-[9px] text-gray-400">Done: {t.completedCount} | Rev: {t.totalRevisions}</div>
                  </div>
                ))}
              </div>
              {typeChartData.length > 0 && (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeChartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '11px' }} labelStyle={{ color: '#e5e7eb' }} itemStyle={{ color: '#d1d5db' }} />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {typeChartData.map((entry: any, index: number) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* 5. Capacity Reports */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> 5. Capacity Reports</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-center text-[11px]">
              {[
                { label: 'Total', value: gr?.capacityReports?.totalRequirements || 0, color: 'text-white' },
                { label: 'Draft', value: gr?.capacityReports?.draftCount || 0, color: 'text-gray-400' },
                { label: 'Ready', value: gr?.capacityReports?.readyCount || 0, color: 'text-blue-400' },
                { label: 'Assigned', value: gr?.capacityReports?.assignedCount || 0, color: 'text-purple-400' },
                { label: 'In Progress', value: gr?.capacityReports?.inProgressCount || 0, color: 'text-yellow-400' },
                { label: 'Tech Review', value: gr?.capacityReports?.waitingTechnicalReview || 0, color: 'text-amber-400' },
                { label: 'Media Review', value: gr?.capacityReports?.waitingMediaReview || 0, color: 'text-cyan-400' },
                { label: 'Client Review', value: gr?.capacityReports?.waitingClientConfirmation || 0, color: 'text-indigo-400' },
                { label: 'Revision Req.', value: gr?.capacityReports?.revisionRequested || 0, color: 'text-orange-400' },
                { label: 'Completed', value: gr?.capacityReports?.completedCount || 0, color: 'text-emerald-400' },
              ].map((stat) => (
                <div key={stat.label} className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg">
                  <span className="text-gray-400 text-[10px] block">{stat.label}</span>
                  <strong className={`text-lg font-mono ${stat.color}`}>{stat.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* 6 & 7: Revision + Approval */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><RotateCcw className="w-4 h-4 text-red-400" /> 6. Revision Reports</h2>
              <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Total Revisions</span><strong className="text-2xl text-amber-300 font-mono">{gr?.revisionReports?.totalRevisions || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Avg / Req</span><strong className="text-2xl text-blue-400 font-mono">{gr?.revisionReports?.avgRevisionsPerReq || '0'}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Pending</span><strong className="text-2xl text-red-400 font-mono">{gr?.revisionReports?.pendingRevisions || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg text-left px-3">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Distribution</div>
                  <div className="text-[10px]">0 rev: <strong className="text-emerald-400">{gr?.revisionReports?.distribution?.zeroRevisions || 0}</strong></div>
                  <div className="text-[10px]">1-2 rev: <strong className="text-amber-400">{gr?.revisionReports?.distribution?.oneToTwoRevisions || 0}</strong></div>
                  <div className="text-[10px]">3+ rev: <strong className="text-red-400">{gr?.revisionReports?.distribution?.threePlusRevisions || 0}</strong></div>
                </div>
              </div>
              {(gr?.revisionReports?.topRevised || []).length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Top Revised Requirements</div>
                  {(gr?.revisionReports?.topRevised || []).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg">
                      <div>
                        <span className="font-mono text-amber-400 text-[10px]">{r.id}</span>
                        <span className="text-white text-[11px] ml-2">{r.name}</span>
                      </div>
                      <span className="text-red-400 font-mono font-bold">{r.revisions}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> 7. Approval Reports</h2>
              <div className="space-y-2">
                {[
                  { label: 'Production Completed', value: gr?.approvalReports?.productionCompleted || 0, color: 'bg-blue-500' },
                  { label: 'Technical Approved', value: gr?.approvalReports?.technicalApproved || 0, color: 'bg-purple-500' },
                  { label: 'Media Manager Approved', value: gr?.approvalReports?.mediaManagerApproved || 0, color: 'bg-cyan-500' },
                  { label: 'Client Confirmed', value: gr?.approvalReports?.clientConfirmed || 0, color: 'bg-indigo-500' },
                  { label: 'Fully Approved', value: gr?.approvalReports?.fullyApproved || 0, color: 'bg-emerald-500' },
                ].map((stat) => {
                  const total = gr?.summary?.total || 1;
                  return (
                    <div key={stat.label} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-300">{stat.label}</span>
                        <span className="font-mono text-white">{stat.value} / {total}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div className={`${stat.color} h-1.5 rounded-full transition-all`} style={{ width: total > 0 ? `${Math.min(100, (stat.value / total) * 100)}%` : '0%' }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-gray-800 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="p-2 bg-amber-950/60 border border-amber-800/40 rounded-lg"><span className="text-gray-400 block">Waiting Tech</span><strong className="text-amber-300 font-mono">{gr?.approvalReports?.waitingTechnicalReview || 0}</strong></div>
                  <div className="p-2 bg-cyan-950/60 border border-cyan-800/40 rounded-lg"><span className="text-gray-400 block">Waiting Media</span><strong className="text-cyan-300 font-mono">{gr?.approvalReports?.waitingMediaReview || 0}</strong></div>
                  <div className="p-2 bg-indigo-950/60 border border-indigo-800/40 rounded-lg"><span className="text-gray-400 block">Waiting Client</span><strong className="text-indigo-300 font-mono">{gr?.approvalReports?.waitingClientConfirmation || 0}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
