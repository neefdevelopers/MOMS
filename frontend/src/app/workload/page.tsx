'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  X,
  Clock,
  Flame,
  CheckCircle2,
  Building2,
  Tag,
  CheckSquare,
  Users,
  TrendingUp,
  Activity,
  ArrowUpDown,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ReassignmentRecommendationsModal } from '@/components/dashboard/ReassignmentRecommendationsModal';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function WorkloadCapacityPage() {
  const { user } = useAuth();
  const [capacity, setCapacity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERLOADED' | 'NORMAL' | 'OPTIMAL'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'WORKLOAD_DESC' | 'WORKLOAD_ASC' | 'NAME_ASC' | 'REMAINING_ASC'>('WORKLOAD_DESC');

  // Configurable Daily Capacity State
  const [editingCapacityUser, setEditingCapacityUser] = useState<any>(null);
  const [editCapacityHours, setEditCapacityHours] = useState('8.0');
  const [savingCapacity, setSavingCapacity] = useState(false);

  // Dedicated Work Details Modal State
  const [selectedWorkDetailsEmp, setSelectedWorkDetailsEmp] = useState<any>(null);
  const [empAssignedWorkTasks, setEmpAssignedWorkTasks] = useState<any[]>([]);
  const [loadingEmpWorkDetails, setLoadingEmpWorkDetails] = useState(false);

  // Smart Reassignment Modal State
  const [selectedOverloadedUserId, setSelectedOverloadedUserId] = useState<string | null>(null);

  const fetchCapacityOverview = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchApi('/tasks/capacity/overview');
      setCapacity(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load workload and capacity data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCapacityOverview();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCapacityOverview();
  };

  const handleSaveCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCapacityUser) return;
    const hours = parseFloat(editCapacityHours);
    if (isNaN(hours) || hours <= 0) {
      alert('Please enter a valid capacity in hours (greater than 0)');
      return;
    }
    setSavingCapacity(true);
    try {
      const updatedCapacity = await fetchApi(`/tasks/capacity/${editingCapacityUser.userId}`, {
        method: 'PUT',
        body: JSON.stringify({ dailyCapacityHours: hours }),
      });
      setCapacity(Array.isArray(updatedCapacity) ? updatedCapacity : []);
      setEditingCapacityUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update daily capacity');
    } finally {
      setSavingCapacity(false);
    }
  };

  const openWorkDetailsModal = async (emp: any) => {
    setSelectedWorkDetailsEmp(emp);
    setLoadingEmpWorkDetails(true);
    try {
      const data = await fetchApi(`/tasks/assigned-work/${emp.userId}`);
      setEmpAssignedWorkTasks(data?.tasks || []);
    } catch {
      setEmpAssignedWorkTasks([]);
    } finally {
      setLoadingEmpWorkDetails(false);
    }
  };

  // Departments List
  const departments = useMemo(() => {
    const set = new Set<string>();
    capacity.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set);
  }, [capacity]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalStaff = capacity.length;
    const overloadedStaff = capacity.filter((e) => e.isOverloaded || e.status === 'Overloaded' || e.assignedHours > e.capacityHours).length;
    const normalStaff = capacity.filter((e) => e.status === 'Normal' && !e.isOverloaded && e.assignedHours <= e.capacityHours).length;
    const optimalStaff = capacity.filter((e) => (e.status === 'Optimal' || e.status === 'Available' || e.status === 'Underutilized') && !e.isOverloaded).length;
    const totalCapacityHours = capacity.reduce((acc, e) => acc + (Number(e.capacityHours) || 0), 0);
    const totalAssignedHours = capacity.reduce((acc, e) => acc + (Number(e.assignedHours) || 0), 0);
    const avgUtilization = totalCapacityHours > 0 ? Math.round((totalAssignedHours / totalCapacityHours) * 100) : 0;

    return {
      totalStaff,
      overloadedStaff,
      normalStaff,
      optimalStaff,
      totalCapacityHours,
      totalAssignedHours,
      avgUtilization,
    };
  }, [capacity]);

  // Filtered & Sorted Staff List
  const filteredStaff = useMemo(() => {
    return capacity
      .filter((emp) => {
        const isOverloaded = emp.isOverloaded || emp.status === 'Overloaded' || emp.assignedHours > emp.capacityHours;
        const isNormal = emp.status === 'Normal' && !isOverloaded;
        const isOptimal = (emp.status === 'Optimal' || emp.status === 'Available' || emp.status === 'Underutilized') && !isOverloaded;

        if (statusFilter === 'OVERLOADED' && !isOverloaded) return false;
        if (statusFilter === 'NORMAL' && !isNormal) return false;
        if (statusFilter === 'OPTIMAL' && !isOptimal) return false;

        if (departmentFilter !== 'ALL' && emp.department !== departmentFilter) return false;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const nameMatch = emp.name?.toLowerCase().includes(query);
          const desigMatch = emp.designation?.toLowerCase().includes(query);
          const deptMatch = emp.department?.toLowerCase().includes(query);
          if (!nameMatch && !desigMatch && !deptMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'WORKLOAD_DESC') {
          const aRatio = a.capacityHours > 0 ? a.assignedHours / a.capacityHours : 0;
          const bRatio = b.capacityHours > 0 ? b.assignedHours / b.capacityHours : 0;
          return bRatio - aRatio;
        }
        if (sortBy === 'WORKLOAD_ASC') {
          const aRatio = a.capacityHours > 0 ? a.assignedHours / a.capacityHours : 0;
          const bRatio = b.capacityHours > 0 ? b.assignedHours / b.capacityHours : 0;
          return aRatio - bRatio;
        }
        if (sortBy === 'NAME_ASC') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'REMAINING_ASC') {
          const aRem = a.remainingCapacity !== undefined ? a.remainingCapacity : (a.capacityHours - a.assignedHours);
          const bRem = b.remainingCapacity !== undefined ? b.remainingCapacity : (b.capacityHours - b.assignedHours);
          return aRem - bRem;
        }
        return 0;
      });
  }, [capacity, statusFilter, departmentFilter, searchQuery, sortBy]);

  const canConfigureCapacity = user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN' || user?.role === 'ADMINISTRATOR';

  return (
    <RouteGuard module="STAFF">
      <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 shadow-xs">
                <Activity className="w-6 h-6" />
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Workload &amp; Capacity Session
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {stats.overloadedStaff > 0 && (
              <span className="px-3.5 py-2 bg-red-600 text-white font-mono font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm animate-pulse">
                Alert: {stats.overloadedStaff} Overloaded Staff
              </span>
            )}
            <span className="px-3.5 py-2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-xl font-mono font-bold text-xs">
              {capacity.length} Staff Monitored Live
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchCapacityOverview} className="underline font-bold hover:text-rose-900 cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* 4 Overview Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Monitored Staff */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Monitored Staff</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">{stats.totalStaff}</span>
              <span className="text-xs text-slate-500 font-medium">Employees</span>
            </div>
          </div>

          {/* Overloaded Staff */}
          <div
            className={`border rounded-2xl p-5 shadow-sm space-y-2 transition-all ${
              stats.overloadedStaff > 0
                ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-400/20'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Overloaded Staff</span>
              <span
                className={`p-2 rounded-xl ${
                  stats.overloadedStaff > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-black font-mono ${
                  stats.overloadedStaff > 0 ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                {stats.overloadedStaff}
              </span>
              <span className="text-xs text-slate-500 font-medium">Require Rebalancing</span>
            </div>
          </div>

          {/* Average Utilization */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Avg Team Utilization</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">{stats.avgUtilization}%</span>
              <span className="text-xs text-slate-500 font-medium font-mono">
                ({stats.totalAssignedHours}h / {stats.totalCapacityHours}h)
              </span>
            </div>
          </div>

          {/* Optimal / Available Staff */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Optimal / Available</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 font-mono">{stats.optimalStaff}</span>
              <span className="text-xs text-slate-500 font-medium">Ready for Work</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, designation, or department…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl pl-10 pr-9 py-2.5 text-slate-900 font-medium focus:outline-none transition-all placeholder:text-slate-400 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Department Filter */}
            {departments.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:border-blue-500 focus:bg-white text-xs cursor-pointer"
              >
                <option value="ALL">All Departments ({capacity.length})</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <ArrowUpDown className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-800 font-medium focus:outline-none text-xs cursor-pointer"
              >
                <option value="WORKLOAD_DESC">Workload (Highest First)</option>
                <option value="WORKLOAD_ASC">Workload (Lowest First)</option>
                <option value="NAME_ASC">Staff Name (A-Z)</option>
                <option value="REMAINING_ASC">Remaining Capacity (Lowest First)</option>
              </select>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2.5 flex-wrap border-t border-slate-100 pt-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Status:</span>
            {[
              { key: 'ALL', label: `All Staff (${capacity.length})` },
              { key: 'OVERLOADED', label: `Overloaded (${stats.overloadedStaff})` },
              { key: 'NORMAL', label: `Normal (${stats.normalStaff})` },
              { key: 'OPTIMAL', label: `Optimal / Available (${stats.optimalStaff})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key as any)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Staff Capacity Grid */}
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-mono text-sm animate-pulse bg-white border border-slate-200 rounded-2xl">
            Loading Workload &amp; Capacity metrics…
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-800 text-base">No staff members match the selected criteria.</p>
            <p className="text-slate-500 text-xs">Try resetting the search or status filter.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setDepartmentFilter('ALL');
              }}
              className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors mt-2 cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredStaff.map((emp) => {
              const isOverloaded = emp.isOverloaded || emp.assignedHours > emp.capacityHours || emp.status === 'Overloaded';
              const workloadPct = emp.capacityHours > 0 ? Math.round((emp.assignedHours / emp.capacityHours) * 100) : 0;
              const overLimitHours = (emp.assignedHours - emp.capacityHours).toFixed(1);
              const availableHours = (emp.capacityHours - emp.assignedHours).toFixed(1);

              return (
                <div
                  key={emp.userId}
                  className={`p-5 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 ${
                    isOverloaded
                      ? 'bg-rose-50/20 border-rose-300 ring-2 ring-rose-400/30'
                      : emp.status === 'Normal'
                      ? 'bg-white border-amber-200/80 hover:border-amber-300'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Employee Profile Header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={emp.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                          alt={emp.name}
                          className="w-11 h-11 rounded-xl border border-slate-200 object-cover shrink-0 shadow-xs"
                        />
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-base leading-tight truncate">
                            {emp.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            {emp.designation || emp.role?.replace(/_/g, ' ') || 'Staff Member'}
                            {emp.department ? ` • ${emp.department}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {canConfigureCapacity && (
                          <button
                            onClick={() => {
                              setEditingCapacityUser(emp);
                              setEditCapacityHours(emp.capacityHours?.toString() || '8.0');
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                            title="Configure Daily Working Capacity Limit"
                          >
                            Settings
                          </button>
                        )}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase border font-mono ${
                            isOverloaded
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : emp.status === 'Normal'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isOverloaded ? 'Over Limit' : emp.status || 'Optimal'}
                        </span>
                      </div>
                    </div>

                    {/* Capacity Balance Section */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" /> Workload Assigned
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900 font-mono">
                            {emp.assignedHours}h
                          </span>
                          <span className="text-xs text-slate-500 font-medium font-mono"> / {emp.capacityHours}h</span>
                          <span
                            className={`ml-1.5 text-xs font-bold font-mono ${
                              isOverloaded ? 'text-rose-600' : workloadPct > 80 ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            ({workloadPct}%)
                          </span>
                        </div>
                      </div>

                      {/* Smooth Progress Bar */}
                      <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOverloaded
                              ? 'bg-rose-600'
                              : workloadPct > 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(workloadPct, 100)}%` }}
                        />
                      </div>

                      {/* Remaining Capacity Highlight */}
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-slate-600 font-medium text-[11px]">Remaining Capacity:</span>
                        <span
                          className={`font-bold font-mono text-[11px] px-2 py-0.5 rounded-md border ${
                            emp.assignedHours > emp.capacityHours
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {emp.assignedHours > emp.capacityHours
                            ? `${overLimitHours}h Over Limit`
                            : `+${availableHours}h Available`}
                        </span>
                      </div>
                    </div>

                    {/* 4 Operational Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* 1. Projects */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Projects</div>
                          <div className="text-xs font-black text-slate-900 truncate">
                            {emp.currentProjectsCount || emp.currentProjects?.length || 0} Active
                          </div>
                        </div>
                      </div>

                      {/* 2. Tasks */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                          <Tag className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Tasks</div>
                          <div className="text-xs font-black text-slate-900 truncate">
                            {emp.taskCount !== undefined ? emp.taskCount : emp.activeTaskCount || 0} Assigned
                          </div>
                        </div>
                      </div>

                      {/* 3. Daily Limit */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700 shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Daily Limit</div>
                          <div className="text-xs font-black text-slate-900 truncate">
                            {emp.capacityHours}h / Day
                          </div>
                        </div>
                      </div>

                      {/* 4. Output Progress */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                          <CheckSquare className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Output</div>
                          <div className="text-xs font-black text-slate-900 truncate">
                            {emp.actualOutputToday || 0}/{emp.dailyTarget || 5} <span className="text-[10px] text-emerald-600 font-bold">({emp.outputProgressPercentage || 0}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => openWorkDetailsModal(emp)}
                      className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Search className="w-3.5 h-3.5 text-blue-600" /> View Work Details
                    </button>
                    {isOverloaded && canConfigureCapacity && (
                      <button
                        onClick={() => setSelectedOverloadedUserId(emp.userId)}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-rose-600" /> Reassign
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Configure Employee Daily Capacity Modal */}
        {editingCapacityUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div
              className="fixed inset-0"
              onClick={() => setEditingCapacityUser(null)}
            />
            <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative z-10 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Configure Daily Working Capacity
                </h3>
                <button
                  onClick={() => setEditingCapacityUser(null)}
                  className="text-slate-400 hover:text-slate-900 text-lg font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveCapacity} className="space-y-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Employee</span>
                  <p className="font-bold text-slate-900 text-sm">{editingCapacityUser.name}</p>
                  <p className="text-xs text-slate-500">{editingCapacityUser.designation} • {editingCapacityUser.department || 'Production'}</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                    Daily Working Capacity (Hours / Day) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    required
                    value={editCapacityHours}
                    onChange={(e) => setEditCapacityHours(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-sm focus:outline-none focus:border-blue-500 focus:bg-white font-bold"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Standard full-time workload baseline is typically 8.0 hours per day.
                  </span>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingCapacityUser(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCapacity}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {savingCapacity ? 'Saving…' : 'Save Daily Capacity'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Employee Work Details Modal */}
        {selectedWorkDetailsEmp && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div
              className="fixed inset-0"
              onClick={() => setSelectedWorkDetailsEmp(null)}
            />
            <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-3xl space-y-5 shadow-2xl relative z-10 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedWorkDetailsEmp.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                    alt={selectedWorkDetailsEmp.name}
                    className="w-12 h-12 rounded-2xl border border-slate-200 object-cover shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base">{selectedWorkDetailsEmp.name}</h3>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase border font-mono ${
                          selectedWorkDetailsEmp.status === 'Overloaded' || selectedWorkDetailsEmp.isOverloaded
                            ? 'bg-red-600 text-white border-red-400'
                            : selectedWorkDetailsEmp.status === 'Normal'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {selectedWorkDetailsEmp.status || 'NORMAL'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {selectedWorkDetailsEmp.designation} • {selectedWorkDetailsEmp.department || 'Production Team'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedWorkDetailsEmp(null)}
                  className="text-slate-400 hover:text-slate-900 text-lg font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* 4 Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[10px] block font-mono uppercase font-bold">1. Daily Capacity</span>
                  <strong className="text-cyan-700 font-mono text-sm font-black">{selectedWorkDetailsEmp.capacityHours} Hours</strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block font-mono uppercase font-bold">2. Assigned Workload</span>
                  <strong
                    className={`font-mono text-sm font-black ${
                      selectedWorkDetailsEmp.assignedHours > selectedWorkDetailsEmp.capacityHours ? 'text-rose-600' : 'text-amber-800'
                    }`}
                  >
                    {selectedWorkDetailsEmp.assignedHours} Hours
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block font-mono uppercase font-bold">3. Remaining Capacity</span>
                  <strong
                    className={`font-mono text-sm font-black ${
                      (selectedWorkDetailsEmp.remainingCapacity || 0) <= 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {selectedWorkDetailsEmp.remainingCapacity !== undefined ? selectedWorkDetailsEmp.remainingCapacity : selectedWorkDetailsEmp.remainingHours || 0} Hours
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block font-mono uppercase font-bold">4. Workload Utilized</span>
                  <strong
                    className={`font-mono text-sm font-black ${
                      selectedWorkDetailsEmp.workloadPercentage > 100 ? 'text-rose-600' : 'text-blue-700'
                    }`}
                  >
                    {selectedWorkDetailsEmp.workloadPercentage || 0}%
                  </strong>
                </div>
              </div>

              {/* Assigned Work Items List */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>Assigned Active Work Deliverables ({empAssignedWorkTasks.length} Tasks)</span>
                  {loadingEmpWorkDetails && <span className="text-xs text-blue-600 animate-pulse font-mono">Loading work items…</span>}
                </h4>

                {loadingEmpWorkDetails ? (
                  <div className="p-8 text-center text-slate-400 font-mono text-xs">Loading employee tasks…</div>
                ) : empAssignedWorkTasks.length === 0 ? (
                  <p className="text-slate-400 italic text-xs p-5 text-center bg-slate-50 rounded-xl border border-slate-200">
                    No active pending tasks currently assigned to this employee.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {empAssignedWorkTasks.map((t) => (
                      <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs space-y-2 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-blue-600 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                {t.taskId}
                              </span>
                              <h5 className="font-bold text-slate-900 text-xs">{t.title}</h5>
                            </div>
                            {t.description && (
                              <p className="text-[11px] text-slate-600 line-clamp-2">{t.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border ${
                                t.priority === 'CRITICAL'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : t.priority === 'HIGH'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {t.priority}
                            </span>
                            <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase border bg-slate-100 text-slate-700 border-slate-200">
                              {t.status?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-200">
                          <div>Project: <strong className="text-slate-800">{t.project?.name || t.script?.name || t.graphicRequirement?.name || 'N/A'}</strong></div>
                          <div>Est Hours: <strong className="text-cyan-700">{t.estimatedHours}h</strong></div>
                          <div>Progress: <strong className="text-blue-700">{t.completionPercentage || 0}%</strong></div>
                          <div>Due Date: <strong className="text-amber-800">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <Link
                  href="/tasks"
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                >
                  Go to Tasks Session <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setSelectedWorkDetailsEmp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Close Work Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Smart Reassignment Recommendations Modal */}
        {selectedOverloadedUserId && (
          <ReassignmentRecommendationsModal
            isOpen={Boolean(selectedOverloadedUserId)}
            overloadedUserId={selectedOverloadedUserId}
            onClose={() => setSelectedOverloadedUserId(null)}
            onReassignmentComplete={() => {
              setSelectedOverloadedUserId(null);
              fetchCapacityOverview();
            }}
          />
        )}
      </div>
    </RouteGuard>
  );
}
