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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Technical Manager Workspace
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
              <Camera className="w-7 h-7 text-cyan-400" />
              Equipment Operations Dashboard
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Real-time monitoring of master inventory, reservations, maintenance, damage, and operational downtime.
            </p>
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
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs rounded-xl border border-gray-700 flex items-center gap-2 transition-all"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              Equipment Monitoring
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading Equipment Dashboard...</div>
        ) : (
          <>
            {/* Primary Inventory Status Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Link href="/equipment" className="bg-card p-4 rounded-xl border border-border hover:border-blue-500/50 transition-all group">
                <div className="flex items-center justify-between text-gray-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Inventory</span>
                  <Camera className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-extrabold text-white">{stats?.total || 0}</div>
                <p className="text-[11px] text-gray-400 mt-1">Master company assets</p>
              </Link>

              <Link href="/equipment?availability=AVAILABLE" className="bg-card p-4 rounded-xl border border-border hover:border-emerald-500/50 transition-all group">
                <div className="flex items-center justify-between text-emerald-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Available</span>
                  <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-400">{stats?.available || 0}</div>
                <p className="text-[11px] text-gray-400 mt-1">Ready for allocation</p>
              </Link>

              <Link href="/equipment/reservations" className="bg-card p-4 rounded-xl border border-border hover:border-purple-500/50 transition-all group">
                <div className="flex items-center justify-between text-purple-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Reserved</span>
                  <Clock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-extrabold text-purple-400">{stats?.reserved || 0}</div>
                <p className="text-[11px] text-gray-400 mt-1">Booked for approved shoots</p>
              </Link>

              <Link href="/equipment/monitoring?status=CHECKED_OUT" className="bg-card p-4 rounded-xl border border-border hover:border-amber-500/50 transition-all group">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Checked Out / In Use</span>
                  <ArrowRightLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-extrabold text-amber-400">{stats?.checkedOut || 0}</div>
                <p className="text-[11px] text-gray-400 mt-1">Issued to crew in field</p>
              </Link>

              <Link href="/equipment/maintenance" className="bg-card p-4 rounded-xl border border-border hover:border-cyan-500/50 transition-all group">
                <div className="flex items-center justify-between text-cyan-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Under Maintenance</span>
                  <Wrench className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-extrabold text-cyan-400">{stats?.underMaintenance || 0}</div>
                <p className="text-[11px] text-gray-400 mt-1">Servicing / repair bay</p>
              </Link>
            </div>

            {/* Secondary Risk & Condition Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link href="/equipment/damage" className="bg-card p-4 rounded-xl border border-red-500/30 hover:border-red-500/60 transition-all group">
                <div className="flex items-center justify-between text-red-400 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Damaged Equipment</span>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-red-400">{stats?.damaged || 0}</div>
                <p className="text-[11px] text-gray-400 mt-1">Unserviceable until repair</p>
              </Link>

              <Link href="/equipment/monitoring?status=LOST" className="bg-card p-4 rounded-xl border border-border hover:border-rose-500/50 transition-all group">
                <div className="flex items-center justify-between text-rose-400 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Lost Assets</span>
                  <PackageX className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-rose-400">{stats?.lost || 0}</div>
                <p className="text-[11px] text-gray-400 mt-1">Reported missing</p>
              </Link>

              <Link href="/equipment/monitoring?overdue=true" className="bg-card p-4 rounded-xl border border-amber-500/30 hover:border-amber-500/60 transition-all group">
                <div className="flex items-center justify-between text-amber-400 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Overdue Returns</span>
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-amber-400">{stats?.overdueReturns || 0}</div>
                <p className="text-[11px] text-gray-400 mt-1">Exceeded expected return</p>
              </Link>

              <Link href="/equipment?includeArchived=true" className="bg-card p-4 rounded-xl border border-border hover:border-gray-500/50 transition-all group">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider">Retired / Archived</span>
                  <Archive className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-gray-300">
                  {reports?.summary?.totalCount ? (reports.summary.totalCount - stats.total) : 0}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Decommissioned history</p>
              </Link>
            </div>

            {/* Operational Monitoring Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Utilization & Metrics */}
              <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Operational Utilization & Health
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800">
                    <span className="text-xs text-gray-400 font-medium">Equipment Utilization Rate</span>
                    <div className="text-2xl font-extrabold text-cyan-400 mt-1">
                      {reports?.summary?.utilizationRate || 0}%
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full transition-all"
                        style={{ width: `${reports?.summary?.utilizationRate || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800">
                    <span className="text-xs text-gray-400 font-medium">Available Capacity Rate</span>
                    <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                      {reports?.summary?.availabilityRate || 0}%
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${reports?.summary?.availabilityRate || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>Recently Returned Equipment (Last 7 Days)</span>
                    <span className="font-bold text-white">{stats?.recentlyReturned || 0} items</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Upcoming Approved Shoot Reservations</span>
                    <span className="font-bold text-white">{stats?.upcomingReservations || 0} items</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Navigation */}
              <div className="bg-card p-5 rounded-2xl border border-border space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  Technical Manager Quick Access
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/equipment"
                    className="p-3 bg-gray-900/70 hover:bg-gray-800 rounded-xl border border-gray-800 hover:border-blue-500/40 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <Camera className="w-4 h-4 text-blue-400 shrink-0" />
                    All Master Inventory
                  </Link>

                  <Link
                    href="/equipment/create"
                    className="p-3 bg-gray-900/70 hover:bg-gray-800 rounded-xl border border-gray-800 hover:border-emerald-500/40 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    Create New Equipment
                  </Link>

                  <Link
                    href="/equipment/monitoring"
                    className="p-3 bg-gray-900/70 hover:bg-gray-800 rounded-xl border border-gray-800 hover:border-cyan-500/40 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                    Live Equipment Monitoring
                  </Link>

                  <Link
                    href="/equipment/maintenance"
                    className="p-3 bg-gray-900/70 hover:bg-gray-800 rounded-xl border border-gray-800 hover:border-amber-500/40 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                    Maintenance Records
                  </Link>

                  <Link
                    href="/equipment/damage"
                    className="p-3 bg-gray-900/70 hover:bg-gray-800 rounded-xl border border-gray-800 hover:border-red-500/40 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    Damage & Repair Logs
                  </Link>

                  <Link
                    href="/equipment/history"
                    className="p-3 bg-gray-900/70 hover:bg-gray-800 rounded-xl border border-gray-800 hover:border-purple-500/40 text-xs font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <RotateCcw className="w-4 h-4 text-purple-400 shrink-0" />
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
