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
  const canRequestRevision = !isRevisionItem && (userRole === 'MEDIA_MANAGER' || userRole === 'TECHNICAL_MANAGER' || userRole === 'ADMIN' || userRole === 'ADMINISTRATOR');

  if (isRevisionItem && revisions.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Revisions Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-xl shadow-md">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-400" /> Revision Cycles &amp; History ({revisions.length})
          </h3>
          <p className="text-xs text-gray-400">
            Complete traceable history of revision requests, assigned employees, change requests, and revised deliverables.
          </p>
        </div>

        {canRequestRevision && (
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors text-xs shrink-0 shadow-md"
          >
            <Plus className="w-4 h-4" /> Request Revision
          </button>
        )}
      </div>

      {/* Revision List */}
      {loading ? (
        <div className="p-8 text-center text-gray-400 bg-card border border-border rounded-xl">
          Loading revision history...
        </div>
      ) : revisions.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-card border border-border rounded-xl space-y-2">
          <RotateCcw className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="text-sm font-medium text-zinc-300">No revisions requested for this item</p>
          <p className="text-xs text-gray-500">
            Original production version is active. If changes are required, click &quot;Request Revision&quot;.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {revisions.map((rev) => {
            const isAssignedToUser = rev.assignedToId === userId;
            const isReviewer = userRole === 'TECHNICAL_MANAGER' || userRole === 'MEDIA_MANAGER' || userRole === 'MARKETING_MANAGER' || userRole === 'ADMIN' || userRole === 'ADMINISTRATOR' || rev.requestedById === userId;

            return (
              <div
                key={rev.id}
                className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-md hover:border-amber-500/30 transition-all"
              >
                {/* Top Badge Line */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-amber-600/20 text-amber-300 font-extrabold rounded-lg border border-amber-500/40 text-xs flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Revision #{rev.revisionNumber}
                    </span>
                    <span className="px-2.5 py-0.5 bg-zinc-900 text-blue-300 font-mono text-[11px] rounded border border-zinc-700">
                      Stage: {rev.reviewStage?.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded font-bold text-[10px] uppercase border ${
                        rev.priority === 'CRITICAL' || rev.priority === 'HIGH'
                          ? 'bg-red-950/60 text-red-300 border-red-800'
                          : 'bg-zinc-900 text-gray-300 border-zinc-700'
                      }`}
                    >
                      {rev.priority} Priority
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      rev.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : rev.status === 'SUBMITTED'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : rev.status === 'IN_PROGRESS'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-purple-950 text-purple-300 border border-purple-800'
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
                      <span className="text-gray-400 font-semibold block text-[11px] uppercase tracking-wider">
                        Revision Reason:
                      </span>
                      <p className="text-white font-bold text-xs mt-0.5">{rev.reason}</p>
                    </div>

                    <div>
                      <span className="text-gray-400 font-semibold block text-[11px] uppercase tracking-wider">
                        Detailed Change Request:
                      </span>
                      <p className="text-zinc-200 bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-xs mt-1 leading-relaxed whitespace-pre-wrap">
                        {rev.detailedRequest}
                      </p>
                    </div>

                    {rev.specificArea && (
                      <div className="text-xs text-amber-300 font-mono bg-amber-950/30 p-2 rounded border border-amber-900/40">
                        <strong>Specific Area:</strong> {rev.specificArea}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Metadata & Personnel */}
                  <div className="space-y-3 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-gray-300">
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <User className="w-3.5 h-3.5 text-blue-400" /> Requested By:
                        </span>
                        <strong className="text-white">
                          {rev.requestedBy?.name || 'Reviewer'} ({rev.requestedBy?.role})
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-gray-300">
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <User className="w-3.5 h-3.5 text-purple-400" /> Assigned Employee:
                        </span>
                        <strong className="text-purple-300">
                          {rev.assignedTo?.name || 'Staff User'} ({rev.assignedTo?.role})
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-gray-300">
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Requested Date:
                        </span>
                        <span className="font-mono text-zinc-300">
                          {new Date(rev.createdAt).toLocaleDateString()} {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-gray-300">
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <Clock className="w-3.5 h-3.5 text-amber-400" /> Due Date:
                        </span>
                        <span className="font-mono text-amber-300 font-bold">
                          {rev.dueDate ? new Date(rev.dueDate).toLocaleDateString() : 'Immediate'}
                        </span>
                      </div>
                    </div>

                    {/* Versions Compare */}
                    <div className="pt-3 border-t border-zinc-800 space-y-2">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                        Deliverable Versions:
                      </span>
                      <div className="flex items-center gap-3 flex-wrap text-xs">
                        {rev.previousVersionUrl && (
                          <a
                            href={rev.previousVersionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg flex items-center gap-1 font-mono transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-gray-400" /> Version v1 (Previous)
                          </a>
                        )}

                        {rev.revisedVersionUrl ? (
                          <a
                            href={rev.revisedVersionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 rounded-lg flex items-center gap-1 font-bold font-mono transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-400" /> Version v{rev.revisionNumber + 1} (Revised)
                          </a>
                        ) : (
                          <span className="text-gray-500 italic text-[11px]">
                            Revised version v{rev.revisionNumber + 1} pending submission
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow Actions for Assigned Employee */}
                {isAssignedToUser && rev.status !== 'APPROVED' && (
                  <div className="bg-zinc-950 p-4 rounded-xl border border-blue-500/30 space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-300 font-bold flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-blue-400" /> Your Assigned Revision Actions:
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Step: Accept → Start → Submit Revised Deliverable
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {rev.status === 'REVISION_REQUESTED' && (
                        <button
                          onClick={() => handleAccept(rev.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          Accept Revision Task
                        </button>
                      )}

                      {(rev.status === 'REVISION_REQUESTED' || rev.status === 'ACCEPTED') && (
                        <button
                          onClick={() => handleStart(rev.id)}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          Start Working on Revision (In Progress)
                        </button>
                      )}

                      {rev.status === 'IN_PROGRESS' && activeSubmittingRevisionId !== rev.id && (
                        <button
                          onClick={() => setActiveSubmittingRevisionId(rev.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow-md"
                        >
                          Submit Revised Deliverable (v{rev.revisionNumber + 1})
                        </button>
                      )}
                    </div>

                    {/* Inline Submit Deliverable Form */}
                    {activeSubmittingRevisionId === rev.id && (
                      <form
                        onSubmit={(e) => handleSubmitRevisedDeliverable(e, rev.id)}
                        className="bg-zinc-900 p-3 rounded-lg border border-emerald-500/40 space-y-2 mt-2"
                      >
                        <label className="text-[11px] text-emerald-300 font-semibold block">
                          Enter Revised Deliverable File / Video Link (v{rev.revisionNumber + 1}):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            placeholder="e.g. https://storage.../design-v2.png or video link"
                            value={revisedFileUrl}
                            onChange={(e) => setRevisedFileUrl(e.target.value)}
                            className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                          />
                          <button
                            type="submit"
                            disabled={submittingDeliverable}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shrink-0 transition-colors"
                          >
                            {submittingDeliverable ? 'Submitting...' : 'Upload & Send for Review'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveSubmittingRevisionId(null)}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Workflow Actions for Reviewer */}
                {isReviewer && rev.status === 'SUBMITTED' && (
                  <div className="bg-zinc-950 p-4 rounded-xl border border-emerald-500/40 space-y-3">
                    <span className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Reviewer Decision for Revised Deliverable:
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleReviewDecision(rev.id, 'APPROVE')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/30"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve Revision
                      </button>
                      <button
                        onClick={() => handleReviewDecision(rev.id, 'REQUEST_REVISION')}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-600/30"
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
