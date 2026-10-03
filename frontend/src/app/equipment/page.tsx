'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/common/RoleGuard';
import {
  Search,
  Plus,
  SlidersHorizontal,
  X,
  ChevronRight,
  MoreVertical,
  Film,
  Building2,
  AlertTriangle,
  Wrench,
  Sparkles,
  ArrowRightLeft,
  RotateCcw,
} from 'lucide-react';
import { usePagination } from '@/lib/usePagination';
import { PaginationControls } from '@/components/common/PaginationControls';

export default function AllEquipmentPage() {
  const { user } = useAuth();
  const userRole = user?.role as string | undefined;
  const isManager = userRole === 'MEDIA_MANAGER' || userRole === 'TECHNICAL_MANAGER' || userRole === 'ADMINISTRATOR' || userRole === 'ADMIN';

  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [conditionFilter, setConditionFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Pagination
  const { currentPage, setCurrentPage, pageSize, setPageSize, paginate } = usePagination(15);

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/equipment');
      if (Array.isArray(data)) {
        setEquipmentList(data);
      }
    } catch (err) {
      console.error('Failed to load equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, []);

  // Filter options
  const categories = useMemo(() => {
    return Array.from(new Set(equipmentList.map((e) => e.category).filter(Boolean))).sort();
  }, [equipmentList]);

  const locations = useMemo(() => {
    return Array.from(new Set(equipmentList.map((e) => e.storageLocation).filter(Boolean))).sort();
  }, [equipmentList]);

  // Filtered items
  const filteredList = useMemo(() => {
    return equipmentList.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesId = item.equipmentId?.toLowerCase().includes(q);
        const matchesSerial = item.serialNumber?.toLowerCase().includes(q);
        const matchesBrand = item.brand?.toLowerCase().includes(q);
        const matchesModel = item.model?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesSerial && !matchesBrand && !matchesModel) {
          return false;
        }
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ASSIGNED') {
          if (item.availability !== 'ASSIGNED_TO_PROJECT' && item.availability !== 'CHECKED_OUT' && item.availability !== 'IN_USE') {
            return false;
          }
        } else if (statusFilter === 'MAINTENANCE') {
          if (item.availability !== 'UNDER_MAINTENANCE' && item.maintenanceStatus !== 'UNDER_MAINTENANCE') {
            return false;
          }
        } else if (item.availability !== statusFilter) {
          return false;
        }
      }

      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (conditionFilter !== 'ALL' && item.condition !== conditionFilter) return false;
      if (locationFilter !== 'ALL' && item.storageLocation !== locationFilter) return false;

      return true;
    });
  }, [equipmentList, searchQuery, statusFilter, categoryFilter, conditionFilter, locationFilter]);

  const paginatedList = useMemo(() => paginate(filteredList), [filteredList, paginate]);

  const hasActiveFilters = searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || conditionFilter !== 'ALL' || locationFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setConditionFilter('ALL');
    setLocationFilter('ALL');
    setCurrentPage(1);
  };

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
      case 'RETIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
            Retired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const getCurrentUse = (item: any) => {
    if (item.availability === 'ASSIGNED_TO_PROJECT' || item.availability === 'CHECKED_OUT' || item.availability === 'IN_USE') {
      if (item.assignedProject) {
        return `${item.assignedProject.projectId || 'Project'}: ${item.assignedProject.name}`;
      }
      return item.currentHolder ? `Assigned to ${item.currentHolder}` : 'Assigned to Shoot';
    }
    if (item.availability === 'RENTED_OUT') {
      return item.rentalCustomer ? `Rented to ${item.rentalCustomer}` : 'Outside Rental';
    }
    if (item.availability === 'UNDER_MAINTENANCE') {
      return 'In Maintenance';
    }
    if (item.availability === 'DAMAGED') {
      return 'Quarantined (Damaged)';
    }
    return '—';
  };

  return (
    <RoleGuard>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Equipment</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track and manage all equipment</p>
          </div>
          {isManager && (
            <Link
              href="/equipment/create"
              className="inline-flex items-center justify-center px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Equipment
            </Link>
          )}
        </div>

        {/* Search & Compact Filters */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search equipment by name, ID, brand, model, serial number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="RENTED_OUT">Rented</option>
                <option value="DAMAGED">Damaged</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="LOST">Lost</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={conditionFilter}
                onChange={(e) => {
                  setConditionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ALL">All Conditions</option>
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
                <option value="DAMAGED">Damaged</option>
              </select>

              <button
                type="button"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  showMoreFilters || locationFilter !== 'ALL'
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                More filters
              </button>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center px-2.5 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Secondary Filter Row */}
          {showMoreFilters && (
            <div className="flex items-center gap-3 pt-2">
              <div className="w-full sm:w-64">
                <select
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">All Storage Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Master Table / Responsive Cards */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-medium text-xs">
                  <th className="px-5 py-3 font-semibold">Equipment ID</th>
                  <th className="px-4 py-3 font-semibold">Equipment</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Current Use</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                      Loading equipment catalog...
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <p className="text-sm font-medium text-gray-800">No equipment found</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {hasActiveFilters ? 'Try changing your search or filters.' : 'Add your first equipment item to start tracking your inventory.'}
                      </p>
                      {hasActiveFilters ? (
                        <button
                          onClick={resetFilters}
                          className="mt-3 inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        isManager && (
                          <Link
                            href="/equipment/create"
                            className="mt-3 inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Equipment
                          </Link>
                        )
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs font-semibold text-gray-700">
                        {item.equipmentId}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/equipment/${item.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {item.name}
                        </Link>
                        <div className="text-xs text-gray-400">
                          {item.brand} {item.model}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">{item.category}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{getStatusBadge(item.availability)}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">{item.storageLocation || 'Studio'}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 truncate max-w-xs">{getCurrentUse(item)}</td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/equipment/${item.id}`}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
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

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading equipment catalog...</div>
            ) : filteredList.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-gray-800">No equipment found</p>
                <p className="text-xs text-gray-500 mt-1">Try changing your search or filters.</p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="mt-3 inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              paginatedList.map((item) => (
                <div key={item.id} className="p-4 space-y-2 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                        {item.equipmentId}
                      </span>
                      <h3 className="font-medium text-gray-900 text-sm mt-1">{item.name}</h3>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                    <div>{getStatusBadge(item.availability)}</div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
                    <span>{item.storageLocation || 'Studio'}</span>
                    <Link
                      href={`/equipment/${item.id}`}
                      className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center"
                    >
                      View Details <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {filteredList.length > 0 && (
          <div className="pt-2">
            <PaginationControls
              currentPage={currentPage}
              totalItems={filteredList.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
