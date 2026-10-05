'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import {
  Search,
  RefreshCw,
  Calendar,
  User,
  History,
  Film,
  Building2,
  AlertTriangle,
  Wrench,
  Sparkles,
  ArrowRightLeft,
  X,
} from 'lucide-react';

export default function EquipmentHistoryPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedEqId, setSelectedEqId] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyRes, eqRes] = await Promise.all([
        fetchApi('/equipment/history'),
        fetchApi('/equipment'),
      ]);
      if (Array.isArray(historyRes)) setMovements(historyRes);
      if (Array.isArray(eqRes)) setEquipmentList(eqRes);
    } catch (err) {
      console.error('Failed to load equipment history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (selectedEqId !== 'ALL' && m.equipmentId !== selectedEqId) return false;

      if (actionFilter !== 'ALL') {
        if (actionFilter === 'ASSIGN' && !m.action.includes('ASSIGN') && !m.action.includes('CHECKOUT')) return false;
        if (actionFilter === 'RETURN' && !m.action.includes('RETURN')) return false;
        if (actionFilter === 'RENT' && !m.action.includes('RENT')) return false;
        if (actionFilter === 'DAMAGE' && !m.action.includes('DAMAGE')) return false;
        if (actionFilter === 'MAINTENANCE' && !m.action.includes('MAINTENANCE')) return false;
        if (actionFilter === 'READY' && !m.action.includes('READY')) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesEq = m.equipment?.name?.toLowerCase().includes(q) || m.equipment?.equipmentId?.toLowerCase().includes(q);
        const matchesUser = m.user?.name?.toLowerCase().includes(q) || m.employee?.name?.toLowerCase().includes(q);
        const matchesProject = m.project?.name?.toLowerCase().includes(q) || m.project?.projectId?.toLowerCase().includes(q);
        const matchesNotes = m.notes?.toLowerCase().includes(q);
        if (!matchesEq && !matchesUser && !matchesProject && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [movements, selectedEqId, actionFilter, search]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ASSIGN_SHOOT':
      case 'ASSIGNED_TO_PROJECT':
      case 'ASSIGNED':
      case 'CHECKOUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
            Assigned to Shoot
          </span>
        );
      case 'RETURN_SHOOT':
      case 'RETURNED':
      case 'RETURN_RENTAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            Returned
          </span>
        );
      case 'RENT_OUT':
      case 'RENTED_OUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
            Rented Out
          </span>
        );
      case 'DAMAGE_REPORTED':
      case 'DAMAGED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
            Damage Reported
          </span>
        );
      case 'MAINTENANCE':
      case 'SENT_TO_MAINTENANCE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
            Maintenance
          </span>
        );
      case 'READY':
      case 'MARKED_READY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            Marked Available
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
            {action}
          </span>
        );
    }
  };

  const selectedItemObj = selectedEqId !== 'ALL' ? equipmentList.find((e) => e.id === selectedEqId) : null;

  return (
    <RoleGuard>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Equipment History</h1>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search history by equipment, user, project, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedEqId}
              onChange={(e) => setSelectedEqId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-w-xs"
            >
              <option value="ALL">All Equipment Items</option>
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.equipmentId} — {eq.name}
                </option>
              ))}
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Event Types</option>
              <option value="ASSIGN">Assignments</option>
              <option value="RETURN">Returns</option>
              <option value="RENT">Rentals</option>
              <option value="DAMAGE">Damage</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="READY">Mark Available</option>
            </select>
          </div>
        </div>

        {/* Simple Vertical Timeline Container */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
          {selectedItemObj && (
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {selectedItemObj.equipmentId}
                </span>
                <span className="ml-2 text-sm font-semibold text-gray-900">{selectedItemObj.name}</span>
              </div>
              <Link
                href={`/equipment/${selectedItemObj.id}`}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                View Equipment →
              </Link>
            </div>
          )}

          {loading ? (
            <p className="text-center text-xs text-gray-500 py-8">Loading history timeline...</p>
          ) : filteredMovements.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-8">No events found matching criteria.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {filteredMovements.map((event) => (
                <div key={event.id} className="relative text-xs space-y-1">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[1.65rem] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />

                  {/* Header Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                    <span className="text-gray-400">•</span>
                    {getActionBadge(event.action)}
                    {!selectedItemObj && event.equipment && (
                      <Link
                        href={`/equipment/${event.equipment.id || event.equipmentId}`}
                        className="font-medium text-gray-700 hover:text-blue-600"
                      >
                        ({event.equipment.equipmentId} — {event.equipment.name})
                      </Link>
                    )}
                  </div>

                  {/* Details */}
                  <div className="text-gray-600">
                    {event.user?.name ? `By ${event.user.name}` : ''}
                    {event.project?.name ? ` • Project: ${event.project.name}` : ''}
                    {event.condition ? ` • Condition: ${event.condition}` : ''}
                  </div>

                  {event.notes && (
                    <p className="text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100 text-xs mt-1">
                      {event.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
