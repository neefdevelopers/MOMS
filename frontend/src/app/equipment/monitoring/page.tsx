'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import {
  Activity,
  Search,
  Filter,
  Camera,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  PackageX,
  Archive,
  ArrowRightLeft,
  RefreshCw,
  Building2,
  User,
  SlidersHorizontal,
} from 'lucide-react';

export default function EquipmentMonitoringPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [maintenanceFilter, setMaintenanceFilter] = useState('ALL');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  const loadMonitoring = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/equipment/monitoring');
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoring();
  }, []);

  // Filter Logic
  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  const brands = Array.from(new Set(items.map((i) => i.brand).filter(Boolean)));
  const locations = Array.from(new Set(items.map((i) => i.storageLocation).filter(Boolean)));

  const filteredItems = items.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const match =
        item.name.toLowerCase().includes(q) ||
        item.equipmentId.toLowerCase().includes(q) ||
        item.serialNumber.toLowerCase().includes(q) ||
        item.currentEmployee.toLowerCase().includes(q) ||
        item.assignedProject.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (statusFilter !== 'ALL' && item.currentStatus !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (brandFilter !== 'ALL' && item.brand !== brandFilter) return false;
    if (locationFilter !== 'ALL' && item.storageLocation !== locationFilter) return false;
    if (maintenanceFilter !== 'ALL' && item.maintenanceStatus !== maintenanceFilter) return false;

    if (showOverdueOnly) {
      if (!item.expectedReturnDate) return false;
      const isOverdue =
        (item.currentStatus === 'CHECKED_OUT' || item.currentStatus === 'IN_USE') &&
        new Date(item.expectedReturnDate) < new Date();
      if (!isOverdue) return false;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RESERVED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CHECKED_OUT':
      case 'IN_USE':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'UNDER_MAINTENANCE':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'DAMAGED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'LOST':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'RETIRED':
        return 'bg-gray-500/15 text-slate-500 border-gray-500/30';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  // Density State
  const [rowDensity, setRowDensity] = useState<'spacious' | 'comfortable' | 'compact'>('spacious');

  return (
    <RoleGuard>
      <div className="p-6 md:p-8 space-y-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-cyan-50 border border-cyan-200 rounded-2xl">
                <Activity className="w-7 h-7 text-cyan-600" />
              </span>
              Live Equipment Monitoring Matrix
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadMonitoring}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-2 transition-all shadow-sm"
            >
              <RefreshCw className="w-4 h-4 text-cyan-600" />
              Refresh Data
            </button>
            <Link
              href="/equipment/create"
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              + Add Equipment
            </Link>
          </div>
        </div>

        {/* Filters Workspace */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search by ID, Name, Serial #, Employee, Project, Brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full lg:w-48 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-semibold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="RESERVED">RESERVED</option>
              <option value="CHECKED_OUT">CHECKED OUT</option>
              <option value="IN_USE">IN USE</option>
              <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
              <option value="DAMAGED">DAMAGED</option>
              <option value="LOST">LOST</option>
              <option value="RETIRED">RETIRED</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full lg:w-48 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-semibold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Overdue Toggle */}
            <button
              onClick={() => setShowOverdueOnly(!showOverdueOnly)}
              className={`w-full lg:w-auto px-4 py-2.5 rounded-xl border text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                showOverdueOnly
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-600" />
              Overdue Returns Only
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600" />
                Quick Filters:
              </span>

              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
              >
                <option value="ALL">Filter Brand</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
              >
                <option value="ALL">Filter Storage Location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              <select
                value={maintenanceFilter}
                onChange={(e) => setMaintenanceFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
              >
                <option value="ALL">Filter Maintenance</option>
                <option value="OPERATIONAL">OPERATIONAL</option>
                <option value="NEEDS_SERVICE">NEEDS_SERVICE</option>
                <option value="UNDER_REPAIR">UNDER_REPAIR</option>
                <option value="DECOMMISSIONED">DECOMMISSIONED</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              {/* Row Density Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 px-2">Spacing:</span>
                <button
                  type="button"
                  onClick={() => setRowDensity('spacious')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                    rowDensity === 'spacious'
                      ? 'bg-white text-cyan-700 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Spacious
                </button>
                <button
                  type="button"
                  onClick={() => setRowDensity('comfortable')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                    rowDensity === 'comfortable'
                      ? 'bg-white text-cyan-700 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Comfortable
                </button>
                <button
                  type="button"
                  onClick={() => setRowDensity('compact')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                    rowDensity === 'compact'
                      ? 'bg-white text-cyan-700 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Compact
                </button>
              </div>

              <span className="font-mono text-xs text-slate-500">
                Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> items
              </span>
            </div>
          </div>
        </div>

        {/* Monitoring Matrix Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 text-center text-slate-500 text-sm font-medium">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-cyan-600" />
              Loading live equipment monitoring matrix data...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-sm">
              <PackageX className="w-8 h-8 mx-auto mb-3 text-slate-400" />
              No equipment items match your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1450px]">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
                    <th className="px-6 py-4">Equipment ID</th>
                    <th className="px-6 py-4">Name & Model</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Serial #</th>
                    <th className="px-5 py-4">Current Status</th>
                    <th className="px-5 py-4">Storage Location</th>
                    <th className="px-5 py-4">Current Employee</th>
                    <th className="px-5 py-4">Assigned Project</th>
                    <th className="px-5 py-4">Return Schedule</th>
                    <th className="px-5 py-4">Condition</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const isOverdue =
                      (item.currentStatus === 'CHECKED_OUT' || item.currentStatus === 'IN_USE') &&
                      item.expectedReturnDate &&
                      new Date(item.expectedReturnDate) < new Date();

                    const cellPadding =
                      rowDensity === 'spacious'
                        ? 'px-5 py-5'
                        : rowDensity === 'comfortable'
                        ? 'px-5 py-3.5'
                        : 'px-4 py-2.5';

                    const sidePadding =
                      rowDensity === 'spacious'
                        ? 'px-6 py-5'
                        : rowDensity === 'comfortable'
                        ? 'px-6 py-3.5'
                        : 'px-5 py-2.5';

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-cyan-50/30 transition-colors group"
                      >
                        {/* Equipment ID */}
                        <td className={`${sidePadding} align-middle`}>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200 font-mono font-bold text-xs text-cyan-800 group-hover:border-cyan-300">
                            {item.equipmentId}
                          </span>
                        </td>

                        {/* Name & Model */}
                        <td className={`${sidePadding} align-middle max-w-[260px]`}>
                          <div className="font-bold text-slate-900 text-sm leading-snug">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {item.brand} {item.model}
                          </div>
                        </td>

                        {/* Category */}
                        <td className={`${cellPadding} align-middle`}>
                          <span className="text-xs font-semibold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-md">
                            {item.category}
                          </span>
                        </td>

                        {/* Serial Number */}
                        <td className={`${cellPadding} align-middle font-mono text-xs text-slate-600`}>
                          {item.serialNumber || '—'}
                        </td>

                        {/* Current Status */}
                        <td className={`${cellPadding} align-middle`}>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase border tracking-wide ${getStatusBadge(
                              item.currentStatus
                            )}`}
                          >
                            {item.currentStatus?.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Storage Location */}
                        <td className={`${cellPadding} align-middle text-slate-700`}>
                          <div className="flex items-center gap-2 text-xs">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-medium">{item.storageLocation || '—'}</span>
                          </div>
                        </td>

                        {/* Current Employee */}
                        <td className={`${cellPadding} align-middle`}>
                          <div className="flex items-center gap-2 text-xs text-slate-800">
                            <User className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="font-semibold">{item.currentEmployee || 'Unassigned'}</span>
                          </div>
                        </td>

                        {/* Assigned Project */}
                        <td className={`${cellPadding} align-middle`}>
                          {item.assignedProject && item.assignedProject !== 'N/A' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-800">
                              {item.assignedProject}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Unassigned</span>
                          )}
                        </td>

                        {/* Return Date */}
                        <td className={`${cellPadding} align-middle`}>
                          {item.expectedReturnDate ? (
                            <div className="space-y-1">
                              <div className={`font-mono text-xs ${isOverdue ? 'text-rose-700 font-bold' : 'text-slate-700 font-medium'}`}>
                                {new Date(item.expectedReturnDate).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                              {isOverdue && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-extrabold uppercase">
                                  <AlertTriangle className="w-3 h-3" />
                                  Overdue
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        {/* Condition */}
                        <td className={`${cellPadding} align-middle`}>
                          <span className="inline-flex items-center text-xs font-semibold text-slate-700">
                            {item.condition || 'Good'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className={`${sidePadding} align-middle text-right`}>
                          <Link
                            href={`/equipment/${item.id}`}
                            className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-sm"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
