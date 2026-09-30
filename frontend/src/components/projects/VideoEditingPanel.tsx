'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import {
  Video,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Loader2,
  User,
  X,
  Scissors,
} from 'lucide-react';

/**
 * Per-spec workflow panel rendered inside the project page once the shoot reaches
 * status=COMPLETED. Renders:
 *   - Convert-to-Video-Editing button (Media Manager)
 *   - Summary KPIs (total scripts, editing tasks, completed, media approved, marketing approved)
 *   - Per-script editing task row with assign / review controls
 *
 * The component owns its own state and never duplicates the parent's project state.
 */

interface Props {
  project: any;
  user: any;
  onReload: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'Awaiting Staff',
  ACCEPTED: 'Accepted - Staff editing',
  IN_PROGRESS: 'In progress (Staff)',
  COMPLETED: 'Completed by Staff',
  WAITING_FOR_TECHNICAL_REVIEW: 'In technical review',
  WAITING_FOR_MEDIA_MANAGER_REVIEW: 'Awaiting Media Manager',
  MEDIA_MANAGER_APPROVED: 'Media Manager approved',
  WAITING_FOR_MARKETING_MANAGER_REVIEW: 'Awaiting Marketing Manager',
  MARKETING_MANAGER_APPROVED: 'Marketing Manager approved',
  REVISION_REQUESTED: 'Revision requested',
  ON_HOLD: 'On hold',
  CANCELLED: 'Cancelled',
};

const STATUS_BADGE: Record<string, string> = {
  ASSIGNED: 'bg-slate-100 text-slate-700',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  WAITING_FOR_TECHNICAL_REVIEW: 'bg-amber-100 text-amber-800',
  WAITING_FOR_MEDIA_MANAGER_REVIEW: 'bg-amber-100 text-amber-800',
  MEDIA_MANAGER_APPROVED: 'bg-emerald-100 text-emerald-800',
  WAITING_FOR_MARKETING_MANAGER_REVIEW: 'bg-violet-100 text-violet-800',
  MARKETING_MANAGER_APPROVED: 'bg-emerald-100 text-emerald-800',
  REVISION_REQUESTED: 'bg-rose-100 text-rose-800',
  ON_HOLD: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-rose-100 text-rose-800',
};

export function VideoEditingPanel({ project, user, onReload }: Props) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [actionError, setActionError] = useState<string>('');
  const [staffPickerFor, setStaffPickerFor] = useState<string | null>(null);
  const [staffPickerValue, setStaffPickerValue] = useState<string>('');
  const [reviewingTask, setReviewingTask] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState<string>('');

  const role = user?.role;
  const isMediaManager = role === 'MEDIA_MANAGER' || role === 'ADMIN' || role === 'ADMINISTRATOR';
  const isMarketingManager = role === 'MARKETING_MANAGER' || role === 'ADMIN' || role === 'ADMINISTRATOR';
  const isStaff = role === 'STAFF';

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchApi(`/tasks?projectId=${encodeURIComponent(project.id)}`).catch(() => []);
      const editingTasks = (Array.isArray(list) ? list : []).filter((t: any) => t.taskType === 'VIDEO_EDITING');
      setTasks(editingTasks);
    } catch (e: any) {
      setActionError(e?.message || 'Could not load editing tasks.');
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const u = await fetchApi('/users').catch(() => []);
      setStaffList(Array.isArray(u) ? u.filter((x: any) => x.status === 'ACTIVE' && !x.isArchived) : []);
    } catch {
      setStaffList([]);
    }
  };

  useEffect(() => {
    load();
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const handleConvert = async () => {
    if (!isMediaManager) return;
    setConverting(true);
    setActionError('');
    try {
      const res: any = await fetchApi(`/projects/${project.id}/convert-to-video-editing`, {
        method: 'POST',
      });
      onReload();
      // Re-load editing tasks from the local refresh.
      setTimeout(() => load(), 600);
      alert(
        res?.tasks
          ? `Converted. ${res.createdTaskIds?.length || 0} new task(s), ${res.reusedTaskIds?.length || 0} reused.`
          : 'Conversion completed.',
      );
    } catch (e: any) {
      setActionError(e?.message || 'Could not convert to video editing.');
    } finally {
      setConverting(false);
    }
  };

  const handleAssignStaff = async (taskId: string) => {
    if (!isMediaManager || !staffPickerValue) return;
    setActionError('');
    try {
      await fetchApi(`/tasks/${taskId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignedUserIds: [staffPickerValue] }),
      });
      setStaffPickerFor(null);
      setStaffPickerValue('');
      load();
      onReload();
    } catch (e: any) {
      setActionError(e?.message || 'Could not assign staff.');
    }
  };

  const handleReview = async (taskId: string, stage: 'media' | 'marketing', action: 'APPROVE' | 'REJECT') => {
    if (action === 'REJECT' && !reviewComment.trim()) {
      alert('A reason is required for rejection.');
      return;
    }
    setReviewingTask(taskId);
    setActionError('');
    try {
      await fetchApi(`/projects/${project.id}/video-editing-task/${taskId}/${stage}-review`, {
        method: 'POST',
        body: JSON.stringify({ action, comment: reviewComment }),
      });
      setReviewComment('');
      load();
      onReload();
    } catch (e: any) {
      setActionError(e?.message || 'Could not submit review.');
    } finally {
      setReviewingTask(null);
    }
  };

  // KPIs (per spec section 15).
  const totalTasks = tasks.length;
  const completedByStaff = tasks.filter((t) => t.mediaManagerApproved || t.marketingManagerApproved || t.status === 'COMPLETED').length;
  const mediaApproved = tasks.filter((t) => t.mediaManagerApproved).length;
  const marketingApproved = tasks.filter((t) => t.marketingManagerApproved).length;

  return (
    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
        <h4 className="font-extrabold text-indigo-900 text-xs flex items-center gap-2">
          <Video className="w-4 h-4 text-indigo-600" /> Video Editing Workflow
        </h4>
        <span className="text-[10px] bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
          {totalTasks === 0 ? 'Not Started' : `${marketingApproved}/${totalTasks} approved`}
        </span>
      </div>

      {actionError && (
        <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Editing Tasks" value={totalTasks} />
        <Kpi label="Completed by Staff" value={`${completedByStaff}/${totalTasks}`} />
        <Kpi label="Media Approved" value={`${mediaApproved}/${totalTasks}`} />
        <Kpi label="Marketing Approved" value={`${marketingApproved}/${totalTasks}`} />
      </div>

      {/* Convert action (Media Manager only) — now lives in the project header */}
      {isMediaManager && totalTasks === 0 && (
        <div className="p-3 bg-white border border-indigo-200 rounded-lg">
          <p className="text-[12px] font-bold text-slate-800">Shoot project is COMPLETED.</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Click <strong>Complete Project</strong> in the project header to open the conversion form and create one Video Editing Task per script.
          </p>
        </div>
      )}

      {/* Tasks list */}
      {loading ? (
        <div className="text-[11px] text-slate-500 text-center py-2">Loading editing tasks...</div>
      ) : totalTasks === 0 ? null : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const myAssignment = (t.assignedEmployees || []).find((a: any) => a.userId === user?.id || a?.user?.id === user?.id);
            const isAssignedToMe = !!myAssignment;
            const taskStatus = t.status || 'ASSIGNED';

            return (
              <div key={t.id} className="p-2.5 bg-white border border-indigo-200 rounded-lg space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">{t.taskId}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          STATUS_BADGE[taskStatus] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {STATUS_LABEL[taskStatus] || taskStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-0.5 truncate">{t.title}</p>
                    {t.clipCode && (
                      <p className="text-[10px] text-indigo-700 font-mono mt-0.5">
                        Clip Code: <span className="font-bold">{t.clipCode}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Assigned staff chip */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                  <User className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {t.assignedEmployees && t.assignedEmployees.length > 0
                      ? t.assignedEmployees.map((a: any) => a.user?.name || a.userId).join(', ')
                      : 'No staff assigned'}
                  </span>
                </div>

                {/* Reasons */}
                {(t.mediaRevisionReason || t.marketingRevisionReason) && (
                  <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
                    {taskStatus === 'IN_PROGRESS' && t.marketingRevisionReason
                      ? `Marketing rejected: ${t.marketingRevisionReason}`
                      : taskStatus === 'IN_PROGRESS' && t.mediaRevisionReason
                      ? `Media Manager rejected: ${t.mediaRevisionReason}`
                      : `Last rejection: ${t.marketingRevisionReason || t.mediaRevisionReason}`}
                  </p>
                )}

                {/* Staff row: Accept + Mark completed */}
                {isStaff && isAssignedToMe && (
                  <div className="flex items-center gap-2 pt-1">
                    {myAssignment?.acceptanceStatus !== 'ACCEPTED' && taskStatus === 'ASSIGNED' && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await fetchApi(`/tasks/${t.id}/accept`, { method: 'POST' });
                            load();
                          } catch (e: any) {
                            setActionError(e?.message || 'Could not accept task.');
                          }
                        }}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-bold text-[10px]"
                      >
                        Accept task
                      </button>
                    )}
                    {(taskStatus === 'ACCEPTED' || taskStatus === 'IN_PROGRESS' || taskStatus === 'REVISION_REQUESTED') && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await fetchApi(`/tasks/${t.id}/upload-deliverable`, {
                              method: 'POST',
                              body: JSON.stringify({
                                url: `/uploads/${project.projectId}/video-editing/${t.taskId}.mp4`,
                                fileName: 'edited-cut.mp4',
                              }),
                            });
                            await fetchApi(`/tasks/${t.id}/progress`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: 'COMPLETED', completionPercentage: 100 }),
                            });
                            load();
                            onReload();
                          } catch (e: any) {
                            setActionError(e?.message || 'Could not mark task completed.');
                          }
                        }}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold text-[10px]"
                      >
                        Mark completed
                      </button>
                    )}
                  </div>
                )}

                {/* Media Manager row */}
                {isMediaManager && (
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={staffPickerFor === t.id ? staffPickerValue : ''}
                        onChange={(e) => {
                          setStaffPickerFor(t.id);
                          setStaffPickerValue(e.target.value);
                        }}
                        className="flex-1 bg-white border border-indigo-200 rounded-md px-2 py-1 text-[10px]"
                      >
                        <option value="">-- Assign Staff --</option>
                        {staffList.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.role})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssignStaff(t.id)}
                        disabled={staffPickerFor !== t.id || !staffPickerValue}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md font-bold text-[10px]"
                      >
                        Assign
                      </button>
                    </div>

                    {taskStatus === 'COMPLETED' && (
                      <div className="flex items-start gap-1.5">
                        <textarea
                          placeholder="Optional comment / rejection reason"
                          value={reviewingTask === t.id ? reviewComment : ''}
                          onChange={(e) => {
                            setReviewingTask(t.id);
                            setReviewComment(e.target.value);
                          }}
                          rows={1}
                          className="flex-1 bg-white border border-indigo-200 rounded-md px-2 py-1 text-[10px]"
                        />
                        <button
                          type="button"
                          onClick={() => handleReview(t.id, 'media', 'REJECT')}
                          disabled={reviewingTask === t.id}
                          className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-md font-bold text-[10px]"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReview(t.id, 'media', 'APPROVE')}
                          disabled={reviewingTask === t.id}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold text-[10px]"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Marketing Manager row */}
                {isMarketingManager && taskStatus === 'WAITING_FOR_MARKETING_MANAGER_REVIEW' && (
                  <div className="flex items-start gap-1.5 pt-1">
                    <textarea
                      placeholder="Optional comment / rejection reason"
                      value={reviewingTask === t.id ? reviewComment : ''}
                      onChange={(e) => {
                        setReviewingTask(t.id);
                        setReviewComment(e.target.value);
                      }}
                      rows={1}
                      className="flex-1 bg-white border border-indigo-200 rounded-md px-2 py-1 text-[10px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleReview(t.id, 'marketing', 'REJECT')}
                      disabled={reviewingTask === t.id}
                      className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-md font-bold text-[10px]"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(t.id, 'marketing', 'APPROVE')}
                      disabled={reviewingTask === t.id}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold text-[10px]"
                    >
                      Approve
                    </button>
                  </div>
                )}

                {isMarketingManager && taskStatus !== 'WAITING_FOR_MARKETING_MANAGER_REVIEW' && taskStatus !== 'MARKETING_MANAGER_APPROVED' && (
                  <p className="text-[10px] text-slate-400 italic pt-1">
                    Waiting: task reaches WAITING_FOR_MARKETING_MANAGER_REVIEW first.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-indigo-200 rounded-lg p-2.5 text-center">
      <div className="text-[10px] text-indigo-700 uppercase font-bold">{label}</div>
      <div className="text-base font-extrabold text-indigo-900 font-mono mt-0.5">{value}</div>
    </div>
  );
}