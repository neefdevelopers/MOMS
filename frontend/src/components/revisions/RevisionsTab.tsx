'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  ExternalLink,
  ShieldCheck,
  Send,
  Plus,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import RequestRevisionModal from './RequestRevisionModal';

interface RevisionsTabProps {
  entityType: string; // PROJECT, TASK, SCRIPT, GRAPHIC_REQ
  entityId: string;
  entityTitle: string;
  originalAssigneeId?: string;
  originalAssigneeName?: string;
  userRole?: string;
  userId?: string;
  currentStatus?: string;
  previousVersionUrl?: string;
  onRefresh?: () => void;
  isRevision?: boolean;
  readOnly?: boolean;
}

export default function RevisionsTab({
  entityType,
  entityId,
  entityTitle,
  originalAssigneeId,
  originalAssigneeName,
  userRole,
  userId,
  currentStatus,
  previousVersionUrl,
  onRefresh,
  isRevision = false,
  readOnly = false,
}: RevisionsTabProps) {
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Submit Deliverable State
  const [activeSubmittingRevisionId, setActiveSubmittingRevisionId] = useState<string | null>(null);
  const [revisedFileUrl, setRevisedFileUrl] = useState('');
  const [revisedFileName, setRevisedFileName] = useState('');
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

  useEffect(() => {
    if (entityId && entityType) {
      loadRevisions();
    }
  }, [entityId, entityType]);

  const loadRevisions = async () => {
    try {
      setLoading(true);
      const data = await fetchApi(`/revisions/entity/${entityType}/${entityId}`);
      setRevisions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load entity revisions history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (revisionId: string) => {
    try {
      await fetchApi(`/revisions/${revisionId}/accept`, { method: 'PATCH' });
      alert('Revision task accepted!');
      loadRevisions();
    } catch (e: any) {
      alert(e.message || 'Failed to accept revision.');
    }
  };

  const handleStart = async (revisionId: string) => {
    try {
      await fetchApi(`/revisions/${revisionId}/start`, { method: 'PATCH' });
      alert('Revision status updated to IN PROGRESS.');
      loadRevisions();
    } catch (e: any) {
      alert(e.message || 'Failed to start revision.');
    }
  };

  const handleSubmitRevisedDeliverable = async (e: React.FormEvent, revisionId: string) => {
    e.preventDefault();
    if (!revisedFileUrl.trim() || !revisedFileName.trim()) return;

    try {
      setSubmittingDeliverable(true);
      await fetchApi(`/revisions/${revisionId}/submit`, {
        method: 'PATCH',
        body: JSON.stringify({
          revisedDeliverableUrl: revisedFileUrl.trim(),
          revisedFileName: revisedFileName.trim(),
        }),
      });
      alert('Revised deliverable submitted successfully for review!');
      setRevisedFileUrl('');
      setRevisedFileName('');
      setActiveSubmittingRevisionId(null);
      loadRevisions();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to submit revised deliverable.');
    } finally {
      setSubmittingDeliverable(false);
    }
  };

  const handleReviewDecision = async (revisionId: string, decision: 'APPROVE' | 'REQUEST_REVISION') => {
    if (decision === 'REQUEST_REVISION') {
      setIsRequestModalOpen(true);
      return;
    }

    if (!confirm('Approve this revised deliverable?')) return;

    try {
      await fetchApi(`/revisions/${revisionId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ decision: 'APPROVE' }),
      });
      alert('Revision approved!');
      loadRevisions();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to approve revision.');
    }
  };

  const isRevisionItem = isRevision || (entityType === 'TASK' && (currentStatus === 'REVISION_REQUESTED' || currentStatus === 'CLIENT_REVISION_REQUESTED'));
  const canRequestRevision = !readOnly && (userRole === 'MEDIA_MANAGER' || userRole === 'TECHNICAL_MANAGER' || userRole === 'ADMIN' || userRole === 'ADMINISTRATOR');

  const isUndergoingRevision =
    currentStatus === 'REVISION_REQUESTED' ||
    currentStatus === 'CLIENT_REVISION_REQUESTED' ||
    revisions.some((r) => r.status === 'REVISION_REQUESTED' || r.status === 'IN_PROGRESS' || r.status === 'SUBMITTED');

  const activeRevision =
    revisions.find((r) => r.status === 'REVISION_REQUESTED' || r.status === 'IN_PROGRESS' || r.status === 'SUBMITTED') ||
    (revisions.length > 0 ? revisions[0] : null);

  if (isRevisionItem && revisions.length === 0 && !loading && !isUndergoingRevision) {
    return null;
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Prominent Active Revision Session Banner when Undergoing Revision */}
      {isUndergoingRevision && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 via-rose-50/40 to-amber-50 border-2 border-amber-300 rounded-2xl text-xs space-y-3.5 shadow-md animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                <RotateCcw className="w-5 h-5 animate-spin" />
              </span>
              <div>
                <h4 className="text-amber-950 font-extrabold text-sm flex items-center gap-2">
                  Active Revision Session — Currently Undergoing Revision
                </h4>
                <p className="text-amber-800 text-xs">
                  {entityType === 'PROJECT' ? 'This project' : `This ${entityType.toLowerCase().replace(/_/g, ' ')}`} is actively undergoing revision changes requested during review.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-amber-100 text-amber-950 border border-amber-300 rounded-lg font-mono font-extrabold text-xs">
                Revision #{activeRevision?.revisionNumber || revisions.length || 1}
              </span>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-bold text-xs uppercase tracking-wider">
                {activeRevision?.status?.replace(/_/g, ' ') || currentStatus?.replace(/_/g, ' ') || 'UNDERGOING REVISION'}
              </span>
            </div>
          </div>

          {activeRevision ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white/90 p-3.5 rounded-xl border border-amber-200 text-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Requested By</span>
                <span className="font-semibold text-slate-900">{activeRevision.requestedBy?.name || 'Reviewer'} ({activeRevision.requestedBy?.role?.replace(/_/g, ' ') || 'Reviewer'})</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Staff</span>
                <span className="font-semibold text-purple-700">{activeRevision.assignedTo?.name || originalAssigneeName || 'Assigned Staff'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Review Stage</span>
                <span className="font-mono font-semibold text-blue-700">{activeRevision.reviewStage?.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Due Date</span>
                <span className="font-semibold text-amber-900">{activeRevision.dueDate ? new Date(activeRevision.dueDate).toLocaleDateString() : 'Immediate'}</span>
              </div>
              {activeRevision.reason && (
                <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t border-amber-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Revision Reason</span>
                  <p className="font-bold text-slate-900 mt-0.5">{activeRevision.reason}</p>
                </div>
              )}
              {activeRevision.detailedRequest && (
                <div className="sm:col-span-2 lg:col-span-4 pt-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Detailed Change Request</span>
                  <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-0.5 whitespace-pre-wrap leading-relaxed">
                    {activeRevision.detailedRequest}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/80 p-3 rounded-xl border border-amber-200 text-slate-700">
              <p className="font-semibold text-amber-950">Status: {currentStatus?.replace(/_/g, ' ')}</p>
              <p className="text-xs text-slate-600 mt-0.5">Assigned team member: <strong>{originalAssigneeName || 'Production Staff'}</strong></p>
            </div>
          )}
        </div>
      )}

      {/* Revisions Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-600" /> Revision Cycles & History ({revisions.length})
          </h3>
          <p className="text-xs text-slate-500">
            Complete traceable history of revision requests, assigned employees, change requests, and revised deliverables.
          </p>
        </div>

        {canRequestRevision && (
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors text-xs shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Request Revision
          </button>
        )}
      </div>

      {/* Revision List */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">
          Loading revision history...
        </div>
      ) : revisions.length === 0 ? (
        isUndergoingRevision ? (
          <div className="p-8 text-center text-slate-700 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3 shadow-xs">
            <RotateCcw className="w-8 h-8 text-amber-600 mx-auto animate-spin" />
            <p className="text-sm font-bold text-amber-950">Currently Undergoing Revision</p>
            <p className="text-xs text-amber-800 max-w-md mx-auto">
              This item is flagged as <strong>{currentStatus?.replace(/_/g, ' ')}</strong>.
              Revision workflow is active and production team is revising deliverables.
            </p>
            {canRequestRevision && (
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Log / Request Revision Instructions
              </button>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-xs">
            <RotateCcw className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No revisions requested for this item</p>
            <p className="text-xs text-slate-400">
              Original production version is active. If changes are required, click &quot;Request Revision&quot;.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {revisions.map((rev) => {
            const isAssignedToUser = rev.assignedToId === userId;
            const isReviewer = userRole === 'TECHNICAL_MANAGER' || userRole === 'MEDIA_MANAGER' || userRole === 'MARKETING_MANAGER' || userRole === 'ADMIN' || userRole === 'ADMINISTRATOR' || rev.requestedById === userId;

            return (
              <div
                key={rev.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs hover:border-amber-300 transition-all"
              >
                {/* Top Badge Line */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-amber-50 text-amber-800 font-extrabold rounded-lg border border-amber-200 text-xs flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Revision #{rev.revisionNumber}
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-blue-700 font-mono text-[11px] rounded border border-slate-200">
                      Stage: {rev.reviewStage?.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded font-bold text-[10px] uppercase border ${
                        rev.priority === 'CRITICAL' || rev.priority === 'HIGH'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {rev.priority} Priority
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      rev.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : rev.status === 'SUBMITTED'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : rev.status === 'IN_PROGRESS'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}
                  >
                    Status: {rev.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Revision Reason & Instructions */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wider">
                        Revision Reason:
                      </span>
                      <p className="text-slate-900 font-bold text-xs mt-0.5">{rev.reason}</p>
                    </div>

                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wider">
                        Detailed Change Request:
                      </span>
                      <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs mt-1 leading-relaxed whitespace-pre-wrap">
                        {rev.detailedRequest}
                      </p>
                    </div>

                    {rev.specificArea && (
                      <div className="text-xs text-amber-800 font-mono bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <strong>Specific Area:</strong> {rev.specificArea}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Metadata & Personnel */}
                  <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <User className="w-3.5 h-3.5 text-blue-600" /> Requested By:
                        </span>
                        <strong className="text-slate-900">
                          {rev.requestedBy?.name || 'Reviewer'} ({rev.requestedBy?.role})
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <User className="w-3.5 h-3.5 text-purple-600" /> Assigned Employee:
                        </span>
                        <strong className="text-purple-700">
                          {rev.assignedTo?.name || 'Staff User'} ({rev.assignedTo?.role})
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Requested Date:
                        </span>
                        <span className="font-mono text-slate-700">
                          {new Date(rev.createdAt).toLocaleDateString()} {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Due Date:
                        </span>
                        <span className="font-mono text-amber-800 font-bold">
                          {rev.dueDate ? new Date(rev.dueDate).toLocaleDateString() : 'Immediate'}
                        </span>
                      </div>
                    </div>

                    {/* Versions Compare */}
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                        Deliverable Versions:
                      </span>
                      <div className="flex items-center gap-3 flex-wrap text-xs">
                        {rev.previousVersionUrl && (
                          <a
                            href={rev.previousVersionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl flex items-center gap-1 font-mono transition-colors shadow-xs"
                          >
                            <ExternalLink className="w-3 h-3 text-slate-400" /> Version v1 (Previous)
                          </a>
                        )}

                        {rev.revisedVersionUrl ? (
                          <a
                            href={rev.revisedVersionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-1 font-bold font-mono transition-colors shadow-xs"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-600" /> Version v{rev.revisionNumber + 1} (Revised)
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Revised version v{rev.revisionNumber + 1} pending submission
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow Actions for Assigned Employee */}
                {!readOnly && isAssignedToUser && rev.status !== 'APPROVED' && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-blue-200 space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-700 font-bold flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-blue-600" /> Your Assigned Revision Actions:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Step: Accept &rarr; Start &rarr; Submit Revised Deliverable
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {rev.status === 'REVISION_REQUESTED' && (
                        <button
                          onClick={() => handleAccept(rev.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                        >
                          Accept Revision Task
                        </button>
                      )}

                      {rev.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleStart(rev.id)}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                        >
                          Start Working on Revision (In Progress)
                        </button>
                      )}

                      {rev.status === 'IN_PROGRESS' && activeSubmittingRevisionId !== rev.id && (
                        <button
                          onClick={() => setActiveSubmittingRevisionId(rev.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                        >
                          Submit Revised Deliverable (v{rev.revisionNumber + 1})
                        </button>
                      )}
                    </div>

                    {/* Inline Submit Deliverable Form */}
                    {activeSubmittingRevisionId === rev.id && (
                      <form
                        onSubmit={(e) => handleSubmitRevisedDeliverable(e, rev.id)}
                        className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2 mt-2 shadow-xs"
                      >
                        <label className="text-[11px] text-emerald-700 font-semibold block">
                          Enter Revised Deliverable File / Video Link (v{rev.revisionNumber + 1}):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            placeholder="e.g. https://storage.../design-v2.png or video link"
                            value={revisedFileUrl}
                            onChange={(e) => setRevisedFileUrl(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500 font-mono"
                          />
                          <button
                            type="submit"
                            disabled={submittingDeliverable}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shrink-0 transition-colors shadow-xs"
                          >
                            {submittingDeliverable ? 'Submitting...' : 'Upload & Send for Review'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveSubmittingRevisionId(null)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Workflow Actions for Reviewer */}
                {!readOnly && isReviewer && rev.status === 'SUBMITTED' && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-emerald-200 space-y-3">
                    <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Reviewer Decision for Revised Deliverable:
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleReviewDecision(rev.id, 'APPROVE')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve Revision
                      </button>
                      <button
                        onClick={() => handleReviewDecision(rev.id, 'REQUEST_REVISION')}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <RotateCcw className="w-4 h-4" /> Request Another Revision
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Request Revision Modal */}
      <RequestRevisionModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => {
          loadRevisions();
          if (onRefresh) onRefresh();
        }}
        entityType={entityType}
        entityId={entityId}
        entityTitle={entityTitle}
        originalAssigneeId={originalAssigneeId}
        originalAssigneeName={originalAssigneeName}
        previousVersionUrl={previousVersionUrl}
        userRole={userRole}
      />
    </div>
  );
}
