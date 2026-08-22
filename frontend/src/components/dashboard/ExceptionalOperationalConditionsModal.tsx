'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  X,
  UserCheck,
  HardDrive,
  Calendar,
  Layers,
  Activity,
  Server,
  FileText,
  Clock,
  Send,
  Sliders,
  Check,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { usePermissions } from '@/lib/usePermissions';

interface ExceptionalOperationalConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemAlertsData: any;
  onRefresh: () => void;
  onOpenReassignmentModal?: () => void;
}

type FilterCategory =
  | 'ALL'
  | 'STAFF_CAPACITY'
  | 'EQUIPMENT_CONFLICT'
  | 'CALENDAR_CONFLICT'
  | 'STORAGE_WARNING'
  | 'BACKUP_FAILURE'
  | 'CONNECTIVITY_ISSUE';

export default function ExceptionalOperationalConditionsModal({
  isOpen,
  onClose,
  systemAlertsData,
  onRefresh,
  onOpenReassignmentModal,
}: ExceptionalOperationalConditionsModalProps) {
  const { role } = usePermissions();
  const isMediaManager = role === 'MEDIA_MANAGER';

  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [showResolved, setShowResolved] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedAlertForResolve, setSelectedAlertForResolve] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const [selectedAlertForAck, setSelectedAlertForAck] = useState<any>(null);
  const [ackNotes, setAckNotes] = useState('');
  const [submittingAck, setSubmittingAck] = useState(false);

  const [testingTrigger, setTestingTrigger] = useState(false);

  if (!isOpen) return null;

  const alertsList: any[] = Array.isArray(systemAlertsData?.alerts) ? systemAlertsData.alerts : [];

  // Filter alerts by role, category, severity, and resolution state
  const filteredAlerts = alertsList.filter((item) => {
    if (!isMediaManager && (item.type === 'EMPLOYEE_OVER_CAPACITY' || item.category === 'STAFF_CAPACITY')) {
      return false;
    }
    if (!showResolved && item.resolved) return false;
    if (showResolved && !item.resolved) return false;

    if (activeCategory !== 'ALL' && item.category !== activeCategory) return false;
    if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;

    return true;
  });

  const handleScanNow = async () => {
    try {
      setScanning(true);
      await fetchApi('/notifications/system-alerts/scan', { method: 'POST' });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to execute diagnostic scan');
    } finally {
      setScanning(false);
    }
  };

  const handleAcknowledgeAlert = async () => {
    if (!selectedAlertForAck) return;
    try {
      setSubmittingAck(true);
      await fetchApi('/notifications/system-alerts/acknowledge', {
        method: 'POST',
        body: JSON.stringify({
          alertId: selectedAlertForAck.id,
          notes: ackNotes.trim() || 'Acknowledged by Media Manager',
        }),
      });
      setSelectedAlertForAck(null);
      setAckNotes('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge operational alert');
    } finally {
      setSubmittingAck(false);
    }
  };

  const handleResolveAlert = async () => {
    if (!selectedAlertForResolve) return;
    try {
      setSubmittingResolution(true);
      await fetchApi('/notifications/system-alerts/resolve', {
        method: 'POST',
        body: JSON.stringify({
          alertId: selectedAlertForResolve.id,
          actionNotes: resolutionNotes.trim() || 'Resolved by administrative intervention',
        }),
      });
      setSelectedAlertForResolve(null);
      setResolutionNotes('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve operational alert');
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleTestDiagnostic = async (type: string, trigger: boolean) => {
    try {
      setTestingTrigger(true);
      await fetchApi('/notifications/system-alerts/test-trigger', {
        method: 'POST',
        body: JSON.stringify({ type, trigger }),
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle diagnostic test trigger');
    } finally {
      setTestingTrigger(false);
    }
  };

  const activeCount = alertsList.filter((a) => !a.resolved).length;
  const criticalCount = alertsList.filter((a) => !a.resolved && a.severity === 'CRITICAL').length;
  const highCount = alertsList.filter((a) => !a.resolved && a.severity === 'HIGH').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-5 bg-gradient-to-r from-red-950/60 via-zinc-900 to-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/20 border border-red-500/40 rounded-xl text-red-400 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Exceptional Operational Conditions Command Center
                </h2>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white shadow-sm">
                  Media Manager Administrative Scope
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time diagnostic monitoring for exceptional conditions requiring administrative attention
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScanNow}
              disabled={scanning}
              className="text-xs font-bold px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-400 flex items-center gap-2 transition-all shadow-lg disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scanning Operational Subsystems...' : 'Run Diagnostic Scan'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Diagnostic Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-zinc-900/50 border-b border-zinc-800 shrink-0">
          <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Total Active Alerts
              </span>
              <span className="text-xl font-black text-white">{activeCount}</span>
            </div>
            <Activity className="w-5 h-5 text-amber-400" />
          </div>

          <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                Critical Conditions
              </span>
              <span className="text-xl font-black text-red-400">{criticalCount}</span>
            </div>
            <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
          </div>

          <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                High Priority Alerts
              </span>
              <span className="text-xl font-black text-amber-300">{highCount}</span>
            </div>
            <Info className="w-5 h-5 text-amber-400" />
          </div>

          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Operational Status
              </span>
              <span className="text-xs font-bold text-emerald-300">
                {activeCount === 0 ? 'ALL SYSTEMS NOMINAL' : `${activeCount} REQUIRES ATTENTION`}
              </span>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {(
              [
                { id: 'ALL', label: 'All Conditions' },
                { id: 'STAFF_CAPACITY', label: 'Staff Capacity' },
                { id: 'EQUIPMENT_CONFLICT', label: 'Gear Conflicts' },
                { id: 'CALENDAR_CONFLICT', label: 'Studio Conflicts' },
                { id: 'STORAGE_WARNING', label: 'Storage Quota' },
                { id: 'BACKUP_FAILURE', label: 'Backup Pipeline' },
                { id: 'CONNECTIVITY_ISSUE', label: 'Server Gateway' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as FilterCategory)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  activeCategory === tab.id
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 font-medium outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Priority</option>
            </select>

            {/* View Toggle */}
            <button
              onClick={() => setShowResolved(!showResolved)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                showResolved
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {showResolved ? 'Viewing Resolved Log' : 'View Resolved Log'}
            </button>
          </div>
        </div>

        {/* Diagnostic Test Simulation Bar */}
        <div className="px-4 py-2 bg-zinc-900/30 border-b border-zinc-800/80 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-zinc-400 font-mono font-medium flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" /> Administrative Diagnostic Simulation Controls:
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={testingTrigger}
              onClick={() => handleTestDiagnostic('BACKUP_FAILURE', true)}
              className="text-[10px] font-bold px-2 py-1 rounded bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60 transition-colors"
            >
              Simulate Backup Failure
            </button>
            <button
              disabled={testingTrigger}
              onClick={() => handleTestDiagnostic('SERVER_CONNECTIVITY', true)}
              className="text-[10px] font-bold px-2 py-1 rounded bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 transition-colors"
            >
              Simulate High Latency
            </button>
            <button
              disabled={testingTrigger}
              onClick={async () => {
                await handleTestDiagnostic('BACKUP_FAILURE', false);
                await handleTestDiagnostic('SERVER_CONNECTIVITY', false);
              }}
              className="text-[10px] font-bold px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              Reset Diagnostics
            </button>
          </div>
        </div>

        {/* Alerts Content Feed */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alertItem) => {
              const isCrit = alertItem.severity === 'CRITICAL';
              const isAck = alertItem.acknowledged;
              const isRes = alertItem.resolved;

              return (
                <div
                  key={alertItem.id}
                  className={`p-4.5 rounded-2xl border space-y-3.5 transition-all ${
                    isRes
                      ? 'bg-zinc-900/40 border-zinc-800 text-zinc-400 opacity-80'
                      : isCrit
                      ? 'bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-900 border-red-600/80 shadow-xl shadow-red-950/30 ring-1 ring-red-500/40'
                      : 'bg-gradient-to-r from-amber-950/30 via-zinc-900 to-zinc-900 border-amber-500/60 shadow-lg'
                  }`}
                >
                  {/* Top Bar badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${
                          isCrit
                            ? 'bg-red-600 text-white border-red-500 animate-pulse'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {isCrit ? '🚨 CRITICAL ALERT' : '⚡ HIGH ALERT'}
                      </span>

                      <span className="text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded uppercase">
                        {alertItem.category?.replace(/_/g, ' ')}
                      </span>

                      {alertItem.entityCode && (
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          {alertItem.entityCode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      {isRes ? (
                        <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Resolved by{' '}
                          {alertItem.resolutionInfo?.resolvedBy || 'Media Manager'}
                        </span>
                      ) : isAck ? (
                        <span className="bg-blue-950/80 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-blue-400" /> Acknowledged by{' '}
                          {alertItem.acknowledgedInfo?.acknowledgedBy || 'Media Manager'}
                        </span>
                      ) : (
                        <span className="bg-red-900/40 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold uppercase animate-pulse">
                          Requires Action
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-white text-sm leading-snug">{alertItem.title}</h3>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{alertItem.description}</p>
                  </div>

                  {/* Diagnostic Metrics Display */}
                  {alertItem.metrics && (
                    <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs space-y-1 font-mono text-zinc-300">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-zinc-400" /> Diagnostic Breakdown Details:
                      </div>

                      {alertItem.category === 'STAFF_CAPACITY' && (
                        <div className="flex items-center justify-between">
                          <span>Overload Target: <strong>{alertItem.metrics.employeeName}</strong></span>
                          <span className="text-amber-400 font-bold">
                            {alertItem.metrics.activeTaskCount} Active Tasks (Capacity Limit: {alertItem.metrics.threshold})
                          </span>
                        </div>
                      )}

                      {alertItem.category === 'EQUIPMENT_CONFLICT' && (
                        <div className="space-y-1">
                          <div>Conflicting Gear: <strong className="text-white">{alertItem.metrics.equipmentName}</strong> ({alertItem.metrics.equipmentCode})</div>
                          <div className="text-[11px] text-red-300">
                            Projects involved: {alertItem.metrics.conflictingProjects?.map((p: any) => p.name).join(' ⚡ ')}
                          </div>
                        </div>
                      )}

                      {alertItem.category === 'CALENDAR_CONFLICT' && (
                        <div className="flex items-center justify-between">
                          <span>Studio Location: <strong className="text-white">{alertItem.metrics.location}</strong></span>
                          <span className="text-amber-300 font-bold">Date: {alertItem.metrics.shootDate}</span>
                        </div>
                      )}

                      {alertItem.category === 'STORAGE_WARNING' && (
                        <div className="flex items-center justify-between">
                          <span>Media Repository Space:</span>
                          <span className="text-amber-300 font-bold">
                            {alertItem.metrics.totalGB} GB / {alertItem.metrics.quotaGB} GB ({alertItem.metrics.usagePercentage}% Used)
                          </span>
                        </div>
                      )}

                      {alertItem.category === 'BACKUP_FAILURE' && (
                        <div className="flex items-center justify-between">
                          <span>Backup Verification Status:</span>
                          <span className="text-red-400 font-bold">{alertItem.metrics.status}</span>
                        </div>
                      )}

                      {alertItem.category === 'CONNECTIVITY_ISSUE' && (
                        <div className="flex items-center justify-between">
                          <span>API Gateway Latency:</span>
                          <span className="text-red-400 font-bold">
                            {alertItem.metrics.latencyMs} ms (Threshold: {alertItem.metrics.thresholdMs} ms)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolution Notes Log (if resolved) */}
                  {isRes && alertItem.resolutionInfo && (
                    <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Administrative Resolution Action:</strong>
                        <span>{alertItem.resolutionInfo.actionNotes}</span>
                      </div>
                    </div>
                  )}

                  {/* Admin Action Buttons */}
                  {!isRes && (
                    <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Acknowledge Button */}
                        {!isAck && (
                          <button
                            onClick={() => setSelectedAlertForAck(alertItem)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-all flex items-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Acknowledge Alert
                          </button>
                        )}

                        {/* Mark Resolved Button */}
                        <button
                          onClick={() => setSelectedAlertForResolve(alertItem)}
                          className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 transition-all flex items-center gap-1.5 shadow-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Mark Condition Resolved
                        </button>
                      </div>

                      {/* Direct Navigation Action */}
                      <div className="flex items-center gap-2">
                        {alertItem.category === 'STAFF_CAPACITY' && onOpenReassignmentModal && (
                          <button
                            onClick={onOpenReassignmentModal}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1.5"
                          >
                            <Layers className="w-3.5 h-3.5" /> Rebalance Staff Workload
                          </button>
                        )}

                        {alertItem.actionUrl && (
                          <Link
                            href={alertItem.actionUrl}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-all flex items-center gap-1.5"
                          >
                            <span>{alertItem.actionLabel || 'Inspect Module'}</span>
                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 px-4 text-center bg-zinc-900/30 border border-zinc-800/80 rounded-2xl space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
              <h3 className="text-base font-bold text-white">No Active Exceptional Operational Conditions</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                All media production subsystems, capacity thresholds, gear scheduling, studio bookings, storage quotas, and server gateways are operational and nominal.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span className="font-mono text-[11px]">
            Last Diagnostic Scan: {systemAlertsData?.evaluatedAt ? new Date(systemAlertsData.evaluatedAt).toLocaleString() : 'Just Now'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl border border-zinc-700 transition-colors"
          >
            Close Command Center
          </button>
        </div>
      </div>

      {/* Acknowledge Notes Modal */}
      {selectedAlertForAck && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-400" /> Acknowledge Operational Alert
              </h3>
              <button onClick={() => setSelectedAlertForAck(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">{selectedAlertForAck.title}</p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">Acknowledgment Note / Remark</label>
              <textarea
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
                placeholder="Optional notes on administrative review..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs rounded-xl p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedAlertForAck(null)}
                className="px-3.5 py-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAcknowledgeAlert}
                disabled={submittingAck}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingAck ? 'Saving...' : 'Confirm Acknowledgment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Condition Modal */}
      {selectedAlertForResolve && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Mark Operational Condition Resolved
              </h3>
              <button onClick={() => setSelectedAlertForResolve(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">{selectedAlertForResolve.title}</p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">
                Administrative Action Taken / Resolution Details <span className="text-red-400">*</span>
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe administrative action taken to clear this condition (e.g. reallocated shoot date, cleared disk cache, rebalanced staff)..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs rounded-xl p-3 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedAlertForResolve(null)}
                className="px-3.5 py-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveAlert}
                disabled={submittingResolution || !resolutionNotes.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 disabled:opacity-50 shadow-lg"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {submittingResolution ? 'Resolving...' : 'Confirm Condition Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
