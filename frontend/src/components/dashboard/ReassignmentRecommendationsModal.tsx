'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import {
  X,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Clock,
  Award,
} from 'lucide-react';

interface ReassignmentRecommendationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  overloadedUserId: string | null;
  onReassignmentComplete?: () => void;
}

export function ReassignmentRecommendationsModal({
  isOpen,
  onClose,
  overloadedUserId,
  onReassignmentComplete,
}: ReassignmentRecommendationsModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number>(0);
  const [reassigning, setReassigning] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !overloadedUserId) return;
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetchApi(`/tasks/capacity/alternatives/${overloadedUserId}`);
        setData(res);
        setSelectedTaskIndex(0);
      } catch (err) {
        console.error('Failed to load reassignment recommendations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isOpen, overloadedUserId]);

  if (!isOpen || !overloadedUserId) return null;

  const overloadedEmployee = data?.overloadedEmployee;
  const taskAlternatives = data?.taskAlternatives || [];
  const activeTaskAlternative = taskAlternatives[selectedTaskIndex];
  const currentTask = activeTaskAlternative?.task;
  const candidateRecommendations = activeTaskAlternative?.recommendations || [];

  const handleReassign = async (candidateUserId: string, candidateName: string) => {
    if (!currentTask) return;
    const confirmMsg = `Are you sure you want to reassign task "${currentTask.title}" (${currentTask.taskId}) to ${candidateName}?`;
    if (!confirm(confirmMsg)) return;

    setReassigning(candidateUserId);
    try {
      await fetchApi(`/tasks/${currentTask.id}/reassign`, {
        method: 'PUT',
        body: JSON.stringify({
          assignedUserIds: [candidateUserId],
          reason: `Reassigned from overloaded team member (${overloadedEmployee?.name}) via Smart Recommendations`,
        }),
      });

      alert(`Task successfully reassigned to ${candidateName}!`);

      // Refresh data
      const updated = await fetchApi(`/tasks/capacity/alternatives/${overloadedUserId}`);
      setData(updated);
      if (onReassignmentComplete) onReassignmentComplete();
    } catch (err: any) {
      alert(err.message || 'Failed to reassign task');
    } finally {
      setReassigning(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              <h2 className="text-base font-extrabold text-slate-900">
                Smart Workload Reassignment Recommendations
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Assisting Media Manager in identifying qualified alternative team members for overloaded staff
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold">Analyzing skills, capacity, departments, workload &amp; project context...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
            {/* Overloaded Employee Header Summary */}
            {overloadedEmployee && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 border border-red-300 flex items-center justify-center font-bold text-red-700 text-sm">
                    {overloadedEmployee.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{overloadedEmployee.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase font-mono">
                        Overloaded ({overloadedEmployee.workloadPercentage}%)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {overloadedEmployee.designation} • Department: <strong className="text-slate-900">{overloadedEmployee.department}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono border-t sm:border-t-0 border-red-200 pt-2 sm:pt-0">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Assigned Workload:</span>
                    <strong className="text-red-700 text-sm">
                      {overloadedEmployee.assignedHours}h / {overloadedEmployee.capacityHours}h
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Active Tasks:</span>
                    <strong className="text-amber-800 text-sm">{overloadedEmployee.activeTaskCount} Tasks</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Task Selector Tabs (if overloaded employee has active tasks) */}
            {taskAlternatives.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Select Task to Reassign ({taskAlternatives.length} Pending Tasks):
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {taskAlternatives.map((item: any, idx: number) => {
                      const t = item.task;
                      const isActive = idx === selectedTaskIndex;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTaskIndex(idx)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border shrink-0 text-left ${
                            isActive
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span>{t.taskId}</span>
                            <span className={`px-1 rounded text-[9px] ${
                              t.priority === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {t.priority}
                            </span>
                          </div>
                          <div className="truncate max-w-[180px] mt-0.5">{t.title}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Task Details Banner */}
                {currentTask && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-bold">
                          {currentTask.taskId}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{currentTask.title}</h4>
                          {currentTask.description && (
                            <p className="text-xs text-slate-600 mt-0.5">{currentTask.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-mono text-amber-700 font-bold shrink-0">
                        Estimated: {currentTask.estimatedHours} Hours
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <div>Project: <strong className="text-slate-800">{currentTask.projectName || 'N/A'}</strong></div>
                      <div>Priority: <strong className="text-amber-800">{currentTask.priority}</strong></div>
                      <div>Due Date: <strong className="text-slate-800 font-mono">{new Date(currentTask.dueDate).toLocaleDateString()}</strong></div>
                      <div>Status: <strong className="text-blue-700">{currentTask.status}</strong></div>
                    </div>
                  </div>
                )}

                {/* Candidate Recommendations List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" /> Ranked Alternative Candidate Recommendations ({candidateRecommendations.length})
                  </h4>

                  {candidateRecommendations.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
                      No candidate recommendations found.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {candidateRecommendations.map((cand: any, rankIdx: number) => {
                        const isTopMatch = rankIdx === 0;
                        const isRecommended = cand.matchScorePercentage >= 60;
                        return (
                          <div
                            key={cand.userId}
                            className={`p-4 rounded-xl border transition-all ${
                              isTopMatch
                                ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                                : isRecommended
                                ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                                : 'bg-slate-50/40 border-slate-200 opacity-75'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              {/* Left Candidate Info */}
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-xs ${
                                      isTopMatch
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    #{rankIdx + 1}
                                  </span>

                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="font-bold text-slate-900 text-xs">{cand.name}</h5>
                                      <span className="text-[10px] text-slate-500 font-mono">({cand.designation})</span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                          cand.matchScorePercentage >= 80
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : cand.matchScorePercentage >= 60
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {cand.matchScorePercentage}% Match
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                                      <span>Department: <strong className="text-slate-700">{cand.department}</strong></span>
                                      <span>•</span>
                                      <span>Workload: <strong className={cand.isOverloaded ? 'text-rose-700' : 'text-emerald-700'}>{cand.workloadStatus} ({cand.workloadPercentage}%)</strong></span>
                                      <span>•</span>
                                      <span>Available Free: <strong className="text-emerald-700 font-mono">{cand.remainingCapacity}h / {cand.capacityHours}h</strong></span>
                                    </div>
                                  </div>
                                </div>

                                {/* Recommendation Reasons Badges */}
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                  {cand.matchReasons.map((reason: string, rIdx: number) => (
                                    <span
                                      key={rIdx}
                                      className="text-[9px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full"
                                    >
                                      • {reason}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Right Action Button */}
                              <div className="shrink-0 flex items-center justify-end">
                                <button
                                  onClick={() => handleReassign(cand.userId, cand.name)}
                                  disabled={reassigning === cand.userId}
                                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                                    isTopMatch
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                                >
                                  <UserCheck className="w-4 h-4" />
                                  <span>{reassigning === cand.userId ? 'Reassigning...' : `Reassign Task to ${cand.name.split(' ')[0]}`}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <p className="font-semibold text-slate-700">
                  This employee currently has no active pending tasks directly listed.
                </p>
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await fetchApi(`/tasks/capacity/alternatives/${overloadedUserId}`);
                      setData(res);
                      setSelectedTaskIndex(0);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>Fetch &amp; Load Active Deliverable Tasks for Reassignment</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Manual Reassignment Decision Engine • Media Manager Authority Control</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition-colors shadow-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
