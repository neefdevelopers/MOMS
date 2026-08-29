'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/auth-context';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Search,
  Filter,
  Layers,
  FileText,
  Calendar,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import RequestRevisionModal from '@/components/revisions/RequestRevisionModal';

export default function RevisionsPage() {
  const { user } = useAuth();
  const [revisions, setRevisions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY_REVISIONS' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Submit Deliverable Modal State
  const [submittingRevisionId, setSubmittingRevisionId] = useState<string | null>(null);
  const [revisedUrlInput, setRevisedUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedStatus, selectedPriority]);

  const loadData = async () => {
    try {
      setLoading(true);
      let queryParams: string[] = [];
      if (selectedStatus !== 'ALL') queryParams.push(`status=${selectedStatus}`);
      if (selectedPriority !== 'ALL') queryParams.push(`priority=${selectedPriority}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

      const [dataRevisions, dataMetrics] = await Promise.all([
        fetchApi(`/revisions${queryString}`),
        fetchApi('/revisions/metrics'),
      ]);

      setRevisions(Array.isArray(dataRevisions) ? dataRevisions : []);
      setMetrics(dataMetrics || {});
    } catch (e) {
      console.error('Failed to load revisions data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await fetchApi(`/revisions/${id}/accept`, { method: 'PATCH' });
      alert('Revision task accepted!');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to accept revision.');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await fetchApi(`/revisions/${id}/start`, { method: 'PATCH' });
      alert('Revision in progress!');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to start revision.');
    }
  };

  const handleSubmitRevisedDeliverable = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!revisedUrlInput.trim()) {
      alert('Please enter revised deliverable URL or link.');
      return;
    }
    try {
      setSubmitting(true);
      await fetchApi(`/revisions/${id}/submit`, {
        method: 'PATCH',
        body: JSON.stringify({ revisedVersionUrl: revisedUrlInput.trim() }),
      });
      alert('Revised deliverable submitted for review!');
      setSubmittingRevisionId(null);
      setRevisedUrlInput('');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to submit revised deliverable.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewDecision = async (id: string, decision: 'APPROVE' | 'REQUEST_REVISION') => {
    if (!confirm(`Confirm decision: ${decision}?`)) return;
    try {
      await fetchApi(`/revisions/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ decision }),
      });
      alert(`Revision decision recorded: ${decision}`);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to process review decision.');
    }
  };

  const now = new Date();

  // Filtered List
  const displayedRevisions = revisions.filter((rev) => {
    if (activeTab === 'MY_REVISIONS') {
      if (rev.assignedToId !== user?.id && rev.originalAssigneeId !== user?.id) return false;
    }
    if (activeTab === 'OVERDUE') {
      if (!rev.dueDate || new Date(rev.dueDate) >= now || rev.status === 'APPROVED') return false;
    }
    if (activeTab === 'COMPLETED') {
      if (rev.status !== 'APPROVED') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchReason = rev.reason?.toLowerCase().includes(q);
      const matchRequest = rev.detailedRequest?.toLowerCase().includes(q);
      const matchProject = rev.project?.name?.toLowerCase().includes(q);
      const matchAssignee = rev.assignedTo?.name?.toLowerCase().includes(q);
      if (!matchReason && !matchRequest && !matchProject && !matchAssignee) return false;
    }
    return true;
  });

  const isMediaManager = (user?.role as string) === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN' || (user?.role as string) === 'ADMINISTRATOR';

  return (
    <MainLayout>
      <div className="space-y-6 text-xs max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl shadow-lg">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-amber-400" />
              {isMediaManager
                ? 'Organization-Wide Revision Management Hub'
                : user?.role === 'TECHNICAL_MANAGER'
                ? 'Technical Revisions & Review Control'
                : 'My Revision Tasks & Resubmissions'}
            </h1>
            <p className="text-xs text-gray-400 max-w-3xl">
              Track multi-cycle production revisions across Tasks, Projects, Scripts, and Graphic Requirements. Every revision cycle preserves full version history and reviewer instructions.
            </p>
          </div>
        </div>

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-4 rounded-xl space-y-1.5 shadow-md">
            <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block">
              Total Revisions Tracked
            </span>
            <div className="text-2xl font-extrabold text-white font-mono">
              {metrics.totalRevisions || 0}
            </div>
            <span className="text-[10px] text-gray-500 block">Across all production workflows</span>
          </div>

          <div className="bg-card border border-amber-500/40 p-4 rounded-xl space-y-1.5 shadow-md bg-amber-950/10">
            <span className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Active Open Revisions
            </span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono">
              {metrics.openRevisions || 0}
            </div>
            <span className="text-[10px] text-amber-400/70 block">Pending resubmission or review</span>
          </div>

          <div className="bg-card border border-red-500/40 p-4 rounded-xl space-y-1.5 shadow-md bg-red-950/10">
            <span className="text-[11px] text-red-300 font-semibold uppercase tracking-wider block flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Overdue Revisions
            </span>
            <div className="text-2xl font-extrabold text-red-400 font-mono">
              {metrics.overdueRevisions || 0}
            </div>
            <span className="text-[10px] text-red-400/70 block">Past revision deadline</span>
          </div>

          <div className="bg-card border border-emerald-500/40 p-4 rounded-xl space-y-1.5 shadow-md bg-emerald-950/10">
            <span className="text-[11px] text-emerald-300 font-semibold uppercase tracking-wider block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed Revisions
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {metrics.completedRevisions || 0}
            </div>
            <span className="text-[10px] text-emerald-400/70 block">Approved after revision cycle</span>
          </div>
        </div>

        {/* View Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border p-4 rounded-xl shadow-md">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === 'ALL'
                  ? 'bg-amber-600/20 text-amber-300 border-amber-500/50 shadow'
                  : 'bg-zinc-900 text-gray-400 border-zinc-800 hover:text-white'
              }`}
            >
              All Revisions
            </button>

            <button
              onClick={() => setActiveTab('MY_REVISIONS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === 'MY_REVISIONS'
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow'
                  : 'bg-zinc-900 text-gray-400 border-zinc-800 hover:text-white'
              }`}
            >
              My Revision Tasks
            </button>

            <button
              onClick={() => setActiveTab('OVERDUE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === 'OVERDUE'
                  ? 'bg-red-600/20 text-red-300 border-red-500/50 shadow'
                  : 'bg-zinc-900 text-gray-400 border-zinc-800 hover:text-white'
              }`}
            >
              Overdue ({metrics.overdueRevisions || 0})
            </button>

            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === 'COMPLETED'
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow'
                  : 'bg-zinc-900 text-gray-400 border-zinc-800 hover:text-white'
              }`}
            >
              Approved History
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by reason, project, assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-white font-medium focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Revisions Feed */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-gray-400 bg-card border border-border rounded-xl">
              Loading revision tasks...
            </div>
          ) : displayedRevisions.length === 0 ? (
            <div className="p-12 text-center bg-card border border-border rounded-xl text-gray-400 space-y-2">
              <RotateCcw className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-sm font-medium text-zinc-300">No revisions found matching criteria</p>
            </div>
          ) : (
            displayedRevisions.map((rev) => {
              const isAssigned = rev.assignedToId === user?.id;
              const isReviewer = isMediaManager || user?.role === 'TECHNICAL_MANAGER';
              const isOverdue = rev.dueDate && new Date(rev.dueDate) < now && rev.status !== 'APPROVED';

              return (
                <div
                  key={rev.id}
                  className={`bg-card border ${
                    isOverdue ? 'border-red-500/50 bg-red-950/10' : 'border-border'
                  } rounded-xl p-5 space-y-4 shadow-md hover:border-amber-500/40 transition-all`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-amber-600/20 text-amber-300 font-extrabold rounded-lg border border-amber-500/40 text-xs flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" /> Revision #{rev.revisionNumber}
                      </span>
                      <span className="px-2.5 py-0.5 bg-zinc-900 text-zinc-300 font-mono text-[11px] rounded border border-zinc-700">
                        Module: {rev.entityType} ({rev.project?.name || 'Production Item'})
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-0.5 bg-red-600 text-white font-bold rounded text-[10px] uppercase flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> Overdue
                        </span>
                      )}
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
                      {rev.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400 font-semibold block text-[11px] uppercase">
                          Revision Reason:
                        </span>
                        <p className="text-white font-bold text-xs mt-0.5">{rev.reason}</p>
                      </div>

                      <div>
                        <span className="text-gray-400 font-semibold block text-[11px] uppercase">
                          Detailed Change Request:
                        </span>
                        <p className="text-zinc-200 bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-xs mt-1 leading-relaxed whitespace-pre-wrap">
                          {rev.detailedRequest}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80">
                      <div className="flex items-center justify-between text-gray-300">
                        <span className="text-gray-400">Requested By:</span>
                        <strong className="text-white">
                          {rev.requestedBy?.name} ({rev.requestedBy?.role})
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-gray-300">
                        <span className="text-gray-400">Assigned Employee:</span>
                        <strong className="text-purple-300">
                          {rev.assignedTo?.name} ({rev.assignedTo?.role})
                        </strong>
                      </div>

                      <div className="flex items-center justify-between text-gray-300">
                        <span className="text-gray-400">Due Date:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {rev.dueDate ? new Date(rev.dueDate).toLocaleDateString() : 'Immediate'}
                        </span>
                      </div>

                      {/* Versions */}
                      <div className="pt-2 border-t border-zinc-800 flex items-center gap-3">
                        {rev.previousVersionUrl && (
                          <a
                            href={rev.previousVersionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded font-mono text-[11px] flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> v1 (Original)
                          </a>
                        )}
                        {rev.revisedVersionUrl && (
                          <a
                            href={rev.revisedVersionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded font-mono font-bold text-[11px] flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> v{rev.revisionNumber + 1} (Revised)
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Assigned Employee */}
                  {isAssigned && rev.status !== 'APPROVED' && (
                    <div className="bg-zinc-950 p-3 rounded-lg border border-blue-500/30 flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-xs text-blue-300 font-bold">Your Action Required:</span>
                      <div className="flex items-center gap-2">
                        {rev.status === 'REVISION_REQUESTED' && (
                          <button
                            onClick={() => handleAccept(rev.id)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
                          >
                            Accept Revision
                          </button>
                        )}
                        {(rev.status === 'REVISION_REQUESTED' || rev.status === 'ACCEPTED') && (
                          <button
                            onClick={() => handleStart(rev.id)}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs"
                          >
                            Start Revision
                          </button>
                        )}
                        {rev.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => setSubmittingRevisionId(rev.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                          >
                            Submit Revised Deliverable
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inline Submission Form */}
                  {submittingRevisionId === rev.id && (
                    <form
                      onSubmit={(e) => handleSubmitRevisedDeliverable(e, rev.id)}
                      className="bg-zinc-950 p-3 rounded-lg border border-emerald-500/40 space-y-2"
                    >
                      <label className="text-[11px] text-emerald-300 font-semibold block">
                        Enter Revised Deliverable File / Video URL (v{rev.revisionNumber + 1}):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder="https://..."
                          value={revisedUrlInput}
                          onChange={(e) => setRevisedUrlInput(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                        />
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shrink-0"
                        >
                          Submit
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmittingRevisionId(null)}
                          className="px-3 py-1.5 bg-zinc-800 text-gray-300 rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Reviewer Approval Decision */}
                  {isReviewer && rev.status === 'SUBMITTED' && (
                    <div className="bg-zinc-950 p-3 rounded-lg border border-emerald-500/40 flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-xs text-emerald-300 font-bold">Reviewer Action:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReviewDecision(rev.id, 'APPROVE')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve Revision
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}
