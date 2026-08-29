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
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'RESERVED':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'CHECKED_OUT':
      case 'IN_USE':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'UNDER_MAINTENANCE':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'DAMAGED':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'LOST':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'RETIRED':
        return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <RoleGuard>
      <div className="p-6 space-y-6 max-w-[1700px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Technical Manager Operations
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
              <Activity className="w-7 h-7 text-cyan-400" />
              Live Equipment Monitoring Matrix
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Real-time operational tracking of every company asset: Location, Holder, Project, Status, Maintenance & Condition.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadMonitoring}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl border border-gray-700 flex items-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" />
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
        <div className="bg-card p-4 rounded-2xl border border-border space-y-3">
          <div className="flex flex-col lg:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by ID, Name, Serial #, Employee, Project, Brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full lg:w-44 px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
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
              className="w-full lg:w-44 px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
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
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              Overdue Returns Only
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-800 text-xs text-gray-400">
            <span className="font-semibold text-gray-300 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              Quick Filters:
            </span>

            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-2.5 py-1 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-300"
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
              className="px-2.5 py-1 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-300"
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
              className="px-2.5 py-1 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-300"
            >
              <option value="ALL">Filter Maintenance</option>
              <option value="OPERATIONAL">OPERATIONAL</option>
              <option value="NEEDS_SERVICE">NEEDS_SERVICE</option>
              <option value="UNDER_REPAIR">UNDER_REPAIR</option>
              <option value="DECOMMISSIONED">DECOMMISSIONED</option>
            </select>

            <span className="ml-auto font-mono text-[11px] text-gray-400">
              Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> items
            </span>
          </div>
        </div>

        {/* Monitoring Matrix Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading live equipment monitoring data...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No equipment items match your filter criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-900/80 border-b border-border text-gray-400 uppercase tracking-wider font-bold">
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
                      <tr key={item.id} className="hover:bg-gray-800/40 transition-colors">
                        {/* Equipment ID */}
                        <td className="p-3.5 font-mono font-bold text-cyan-300">
                          {item.equipmentId}
                        </td>

                        {/* Name & Model */}
                        <td className="p-3.5">
                          <div className="font-bold text-white text-xs">{item.name}</div>
                          <div className="text-[11px] text-gray-400">
                            {item.brand} {item.model}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-3.5 text-gray-300 font-semibold">{item.category}</td>

                        {/* Serial Number */}
                        <td className="p-3.5 font-mono text-gray-400">{item.serialNumber}</td>

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
                        <td className="p-3.5 text-gray-300 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-500" />
                          {item.storageLocation}
                        </td>

                        {/* Current Employee */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-gray-200">
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            <span>{item.currentEmployee}</span>
                          </div>
                        </td>

                        {/* Assigned Project */}
                        <td className="p-3.5 text-gray-300">
                          {item.assignedProject !== 'N/A' ? (
                            <span className="font-semibold text-purple-300">{item.assignedProject}</span>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </td>

                        {/* Return Date */}
                        <td className="p-3.5">
                          {item.expectedReturnDate ? (
                            <div className={`font-mono text-xs ${isOverdue ? 'text-amber-400 font-bold' : 'text-gray-300'}`}>
                              {new Date(item.expectedReturnDate).toISOString().split('T')[0]}
                              {isOverdue && <span className="block text-[10px] text-red-400 font-bold uppercase">OVERDUE</span>}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Condition */}
                        <td className="p-3.5">
                          <span className="text-gray-300">{item.condition}</span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/equipment/${item.id}`}
                            className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 text-[11px] font-bold transition-all"
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
