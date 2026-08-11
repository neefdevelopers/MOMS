'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { BarChart3, TrendingUp, PieChart, Layers, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchApi('/reports/production');
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Operational Reports...</div>;

  const chartData = data?.shootTypeBreakdown?.map((item: any) => ({
    name: `${item.shootType} SHOOT`,
    count: item._count,
  })) || [];

  return (
    <div className="space-y-6 text-xs">
      <div className="bg-card border border-border p-6 rounded-xl">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" /> Operational Reports & Analytics
        </h1>
        <p className="text-xs text-gray-400 mt-1">Live metrics compiled directly from operational database</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recharts chart */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-4">
          <h2 className="font-bold text-white text-sm">Indoor vs Outdoor Production Split</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality & Revisions card */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-4">
          <h2 className="font-bold text-white text-sm">Approval Quality & Revisions Metrics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
              <span className="text-gray-400 font-semibold block">Total Revisions</span>
              <span className="text-2xl font-bold text-amber-400">{data?.totalRevisions || 0}</span>
            </div>
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
              <span className="text-gray-400 font-semibold block">Rejected Approvals</span>
              <span className="text-2xl font-bold text-red-400">{data?.rejectedApprovals || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
