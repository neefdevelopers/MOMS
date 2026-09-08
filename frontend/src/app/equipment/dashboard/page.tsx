'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import {
  Camera,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  PackageX,
  Archive,
  ArrowRightLeft,
  Activity,
  PlusCircle,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

export default function EquipmentDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any>(null);

  const loadData = async () => {
    try {
      const [statsRes, reportsRes] = await Promise.all([
        fetchApi('/equipment/dashboard'),
        fetchApi('/equipment/reports/summary').catch(() => null),
      ]);
      setStats(statsRes);
      if (reportsRes) setReports(reportsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <RoleGuard>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Camera className="w-7 h-7 text-cyan-600" />
              Equipment Operations Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/equipment/create"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              + Add Equipment
            </Link>
            <Link
              href="/equipment/monitoring"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-2 transition-all"
            >
              <Activity className="w-4 h-4 text-cyan-600" />
              Equipment Monitoring
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading Equipment Dashboard...</div>
        ) : (
          <>
            {/* Primary Inventory Status Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Link href="/equipment" className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-200 transition-all group">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Inventory</span>
                  <Camera className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900">{stats?.total || 0}</div>
                <p className="text-[11px] text-slate-500 mt-1">Master company assets</p>
              </Link>

              <Link href="/equipment?availability=AVAILABLE" className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all group">
                <div className="flex items-center justify-between text-emerald-600 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Available</span>
                  <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-600">{stats?.available || 0}</div>
                <p className="text-[11px] text-slate-500 mt-1">Ready for allocation</p>
              </Link>

              <Link href="/equipment/reservations" className="bg-white p-4 rounded-xl border border-slate-200 hover:border-purple-200 transition-all group">
                <div className="flex items-center justify-between text-purple-600 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Reserved</span>
                  <Clock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-extrabold text-purple-600">{stats?.reserved || 0}</div>
                <p className="text-[11px] text-slate-500 mt-1">Booked for approved shoots</p>
              </Link>

              <Link href="/equipment/monitoring?status=CHECKED_OUT" className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-200 transition-all group">
                <div className="flex items-center justify-between text-amber-600 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Checked Out / In Use</span>
                  <ArrowRightLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-extrabold text-amber-600">{stats?.checkedOut || 0}</div>
                <p className="text-[11px] text-slate-500 mt-1">Issued to crew in field</p>
              </Link>

              <Link href="/equipment/maintenance" className="bg-white p-4 rounded-xl border border-slate-200 hover:border-cyan-200 transition-all group">
                <div className="flex items-center justify-between text-cyan-600 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Under Maintenance</span>
                  <Wrench className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-extrabold text-cyan-600">{stats?.underMaintenance || 0}</div>
                <p className="text-[11px] text-slate-500 mt-1">Servicing / repair bay</p>
              </Link>
            </div>

            {/* Secondary Risk & Condition Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link href="/equipment/damage" className="bg-white p-4 rounded-xl border border-rose-200 hover:border-rose-200 transition-all group">
                <div className="flex items-center justify-between text-rose-600 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Damaged Equipment</span>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-rose-600">{stats?.damaged || 0}</div>
                <p className="text-[11px] text-slate-500 mt-1">Unserviceable until repair</p>
              </Link>

              <Link href="/equipment/monitoring?status=LOST" className="bg-white p-4 rounded-xl border border-slate-200 hover:border-rose-200 transition-all group">
                <div className="flex items-center justify-between text-rose-600 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Lost Assets</span>
                  <PackageX className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-rose-600">{stats?.lost || 0}</div>
                <p className="text-[11px] text-slate-500 mt-1">Reported missing</p>
              </Link>

              <Link href="/equipment/monitoring?overdue=true" className="bg-white p-4 rounded-xl border border-amber-200 hover:border-amber-200 transition-all group">
                <div className="flex items-center justify-between text-amber-600 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Overdue Returns</span>
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-amber-600">{stats?.overdueReturns || 0}</div>
                <p className="text-[11px] text-slate-500 mt-1">Exceeded expected return</p>
              </Link>

              <Link href="/equipment?includeArchived=true" className="bg-white p-4 rounded-xl border border-slate-200 hover:border-gray-500/50 transition-all group">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Retired / Archived</span>
                  <Archive className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-slate-700">
                  {reports?.summary?.totalCount ? (reports.summary.totalCount - stats.total) : 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Decommissioned history</p>
              </Link>
            </div>

            {/* Operational Monitoring Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Utilization & Metrics */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-600" />
                  Operational Utilization & Health
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Equipment Utilization Rate</span>
                    <div className="text-2xl font-extrabold text-cyan-600 mt-1">
                      {reports?.summary?.utilizationRate || 0}%
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full transition-all"
                        style={{ width: `${reports?.summary?.utilizationRate || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Available Capacity Rate</span>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                      {reports?.summary?.availabilityRate || 0}%
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${reports?.summary?.availabilityRate || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Recently Returned Equipment (Last 7 Days)</span>
                    <span className="font-bold text-slate-900">{stats?.recentlyReturned || 0} items</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Upcoming Approved Shoot Reservations</span>
                    <span className="font-bold text-slate-900">{stats?.upcomingReservations || 0} items</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Navigation */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Technical Manager Quick Access
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/equipment"
                    className="p-3 bg-slate-50/70 hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-blue-200 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <Camera className="w-4 h-4 text-blue-600 shrink-0" />
                    All Master Inventory
                  </Link>

                  <Link
                    href="/equipment/create"
                    className="p-3 bg-slate-50/70 hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-emerald-200 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    Create New Equipment
                  </Link>

                  <Link
                    href="/equipment/monitoring"
                    className="p-3 bg-slate-50/70 hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-cyan-200 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <Activity className="w-4 h-4 text-cyan-600 shrink-0" />
                    Live Equipment Monitoring
                  </Link>

                  <Link
                    href="/equipment/maintenance"
                    className="p-3 bg-slate-50/70 hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-amber-200 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                    Maintenance Records
                  </Link>

                  <Link
                    href="/equipment/damage"
                    className="p-3 bg-slate-50/70 hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-rose-200 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    Damage & Repair Logs
                  </Link>

                  <Link
                    href="/equipment/history"
                    className="p-3 bg-slate-50/70 hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-purple-200 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <RotateCcw className="w-4 h-4 text-purple-600 shrink-0" />
                    Permanent Movement Log
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
