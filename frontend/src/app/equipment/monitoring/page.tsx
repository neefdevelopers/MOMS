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

  return (
    <RoleGuard>
      <div className="p-6 space-y-6 max-w-[1700px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-7 h-7 text-cyan-600" />
              Live Equipment Monitoring Matrix
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadMonitoring}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4 text-cyan-600" />
              Refresh Data
            </button>
            <Link
              href="/equipment/create"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
            >
              + Add Equipment
            </Link>
          </div>
        </div>

        {/* Filters Workspace */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex flex-col lg:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by ID, Name, Serial #, Employee, Project, Brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full lg:w-44 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
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
              className="w-full lg:w-44 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
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
              className={`w-full lg:w-auto px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                showOverdueOnly
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              Overdue Returns Only
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600" />
              Quick Filters:
            </span>

            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
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
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
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
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="ALL">Filter Maintenance</option>
              <option value="OPERATIONAL">OPERATIONAL</option>
              <option value="NEEDS_SERVICE">NEEDS_SERVICE</option>
              <option value="UNDER_REPAIR">UNDER_REPAIR</option>
              <option value="DECOMMISSIONED">DECOMMISSIONED</option>
            </select>

            <span className="ml-auto font-mono text-[11px] text-slate-500">
              Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> items
            </span>
          </div>
        </div>

        {/* Monitoring Matrix Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading live equipment monitoring data...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No equipment items match your filter criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="p-3.5">Equipment ID</th>
                    <th className="p-3.5">Name & Model</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Serial #</th>
                    <th className="p-3.5">Current Status</th>
                    <th className="p-3.5">Storage Location</th>
                    <th className="p-3.5">Current Employee</th>
                    <th className="p-3.5">Assigned Project</th>
                    <th className="p-3.5">Return Date</th>
                    <th className="p-3.5">Condition</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {filteredItems.map((item) => {
                    const isOverdue =
                      (item.currentStatus === 'CHECKED_OUT' || item.currentStatus === 'IN_USE') &&
                      item.expectedReturnDate &&
                      new Date(item.expectedReturnDate) < new Date();

                    return (
                      <tr key={item.id} className="hover:bg-slate-100/40 transition-colors">
                        {/* Equipment ID */}
                        <td className="p-3.5 font-mono font-bold text-cyan-700">
                          {item.equipmentId}
                        </td>

                        {/* Name & Model */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 text-xs">{item.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {item.brand} {item.model}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-3.5 text-slate-700 font-semibold">{item.category}</td>

                        {/* Serial Number */}
                        <td className="p-3.5 font-mono text-slate-500">{item.serialNumber}</td>

                        {/* Current Status */}
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${getStatusBadge(
                              item.currentStatus
                            )}`}
                          >
                            {item.currentStatus}
                          </span>
                        </td>

                        {/* Storage Location */}
                        <td className="p-3.5 text-slate-700 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {item.storageLocation}
                        </td>

                        {/* Current Employee */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <span>{item.currentEmployee}</span>
                          </div>
                        </td>

                        {/* Assigned Project */}
                        <td className="p-3.5 text-slate-700">
                          {item.assignedProject !== 'N/A' ? (
                            <span className="font-semibold text-purple-700">{item.assignedProject}</span>
                          ) : (
                            <span className="text-slate-500">Unassigned</span>
                          )}
                        </td>

                        {/* Return Date */}
                        <td className="p-3.5">
                          {item.expectedReturnDate ? (
                            <div className={`font-mono text-xs ${isOverdue ? 'text-amber-600 font-bold' : 'text-slate-700'}`}>
                              {new Date(item.expectedReturnDate).toISOString().split('T')[0]}
                              {isOverdue && <span className="block text-[10px] text-rose-600 font-bold uppercase">OVERDUE</span>}
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Condition */}
                        <td className="p-3.5">
                          <span className="text-slate-700">{item.condition}</span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/equipment/${item.id}`}
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-600/40 text-blue-600 border border-blue-200 text-[11px] font-bold transition-all"
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
