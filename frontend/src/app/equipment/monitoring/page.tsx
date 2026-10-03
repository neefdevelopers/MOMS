'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import { useAuth } from '@/lib/auth-context';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Building2,
  Film,
  Calendar,
  ChevronRight,
  RefreshCw,
  X,
} from 'lucide-react';

export default function EquipmentMonitoringPage() {
  const { user } = useAuth();
  const userRole = user?.role as string | undefined;
  const isManager = userRole === 'ADMIN' || userRole === 'ADMINISTRATOR' || userRole === 'MEDIA_MANAGER' || userRole === 'TECHNICAL_MANAGER';

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadMonitoring = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/equipment/monitoring');
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoring();
  }, []);

  // Summary counts
  const counts = useMemo(() => {
    return {
      available: items.filter((i) => i.currentStatus === 'AVAILABLE').length,
      assigned: items.filter((i) => i.currentStatus === 'ASSIGNED_TO_PROJECT' || i.currentStatus === 'CHECKED_OUT' || i.currentStatus === 'IN_USE').length,
      rented: items.filter((i) => i.currentStatus === 'RENTED_OUT').length,
      maintenance: items.filter((i) => i.currentStatus === 'UNDER_MAINTENANCE' || i.maintenanceStatus === 'UNDER_MAINTENANCE').length,
      damaged: items.filter((i) => i.currentStatus === 'DAMAGED').length,
    };
  }, [items]);

  // Items needing attention: Damaged, In Maintenance, Lost, Overdue, or Due within 48h
  const attentionItems = useMemo(() => {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 3600 * 1000);

    return items
      .filter((item) => {
        if (item.currentStatus === 'DAMAGED') return true;
        if (item.currentStatus === 'UNDER_MAINTENANCE') return true;
        if (item.currentStatus === 'LOST') return true;

        if (item.expectedReturnDate) {
          const retDate = new Date(item.expectedReturnDate);
          if (retDate < now) return true; // Overdue
          if (retDate <= in48h && (item.currentStatus === 'ASSIGNED_TO_PROJECT' || item.currentStatus === 'RENTED_OUT')) return true;
        }

        return false;
      })
      .map((item) => {
        let reason = 'Active issue';
        if (item.currentStatus === 'DAMAGED') {
          reason = item.condition === 'DAMAGED' ? 'Damage reported — needs repair' : 'Quarantined for inspection';
        } else if (item.currentStatus === 'UNDER_MAINTENANCE') {
          reason = 'Repair/service in progress';
        } else if (item.currentStatus === 'LOST') {
          reason = 'Reported lost / missing';
        } else if (item.expectedReturnDate) {
          const retDate = new Date(item.expectedReturnDate);
          if (retDate < now) {
            reason = `Overdue since ${retDate.toLocaleDateString()}`;
          } else {
            reason = `Return due on ${retDate.toLocaleDateString()}`;
          }
        }

        return {
          ...item,
          attentionReason: reason,
        };
      });
  }, [items]);

  // Filtered active list
  const filteredActiveItems = useMemo(() => {
    return items.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesId = item.equipmentId?.toLowerCase().includes(q);
        const matchesHolder = item.currentHolder?.toLowerCase().includes(q);
        const matchesProject = item.assignedProject?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesHolder && !matchesProject) {
          return false;
        }
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ASSIGNED') {
          if (item.currentStatus !== 'ASSIGNED_TO_PROJECT' && item.currentStatus !== 'CHECKED_OUT' && item.currentStatus !== 'IN_USE') {
            return false;
          }
        } else if (item.currentStatus !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [items, search, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            Available
          </span>
        );
      case 'ASSIGNED_TO_PROJECT':
      case 'CHECKED_OUT':
      case 'IN_USE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
            Assigned
          </span>
        );
      case 'RENTED_OUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
            Rented
          </span>
        );
      case 'DAMAGED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
            Damaged
          </span>
        );
      case 'UNDER_MAINTENANCE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
            Maintenance
          </span>
        );
      case 'LOST':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            Lost
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <RoleGuard>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Equipment Monitoring</h1>
            <p className="text-sm text-gray-500 mt-0.5">Current operational status</p>
          </div>
          <button
            onClick={loadMonitoring}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Status Summary Blocks (Small, clean, simple) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="text-xs text-gray-500">Available</div>
            <div className="text-xl font-semibold text-emerald-700 mt-0.5">{counts.available}</div>
          </div>
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="text-xs text-gray-500">Assigned</div>
            <div className="text-xl font-semibold text-blue-700 mt-0.5">{counts.assigned}</div>
          </div>
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="text-xs text-gray-500">Rented</div>
            <div className="text-xl font-semibold text-purple-700 mt-0.5">{counts.rented}</div>
          </div>
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="text-xs text-gray-500">Maintenance</div>
            <div className="text-xl font-semibold text-amber-700 mt-0.5">{counts.maintenance}</div>
          </div>
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <div className="text-xs text-gray-500">Damaged</div>
            <div className="text-xl font-semibold text-rose-700 mt-0.5">{counts.damaged}</div>
          </div>
        </div>

        {/* Section: Needs Attention */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" />
              Needs Attention
            </h2>
            <span className="text-xs text-gray-400 font-medium">{attentionItems.length} items</span>
          </div>

          {attentionItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
              All equipment is operational with no overdue items or active issues.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-medium">
                    <th className="px-5 py-2.5">Equipment</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Reason / Issue</th>
                    <th className="px-5 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attentionItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3">
                        <Link href={`/equipment/${item.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {item.name}
                        </Link>
                        <div className="font-mono text-gray-400 text-[11px]">{item.equipmentId}</div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(item.currentStatus)}</td>
                      <td className="px-4 py-3 text-gray-600 font-medium">{item.attentionReason}</td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/equipment/${item.id}`}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section: All Equipment Status */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs space-y-3 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">All Equipment</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="RENTED_OUT">Rented</option>
                <option value="UNDER_MAINTENANCE">Maintenance</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-medium">
                  <th className="px-4 py-2.5">ID & Name</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Responsible / Holder</th>
                  <th className="px-4 py-2.5">Expected Return</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Loading equipment...
                    </td>
                  </tr>
                ) : filteredActiveItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No equipment matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredActiveItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5">
                        <Link href={`/equipment/${item.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {item.name}
                        </Link>
                        <div className="font-mono text-gray-400 text-[11px]">{item.equipmentId}</div>
                      </td>
                      <td className="px-4 py-2.5">{getStatusBadge(item.currentStatus)}</td>
                      <td className="px-4 py-2.5 text-gray-600">{item.storageLocation || 'Studio'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{item.currentHolder || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {item.expectedReturnDate ? new Date(item.expectedReturnDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/equipment/${item.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
