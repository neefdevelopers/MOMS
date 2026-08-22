'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CheckCircle2, AlertCircle, Clock, Check, X, RefreshCw, PhoneCall, MessageCircle, Mail } from 'lucide-react';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [clientDecision, setClientDecision] = useState('APPROVED');
  const [commMethod, setCommMethod] = useState('WhatsApp');

  const loadQueue = async () => {
    try {
      const data = await fetchApi('/approvals/queue');
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleTechReview = async (projectId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await fetchApi('/approvals/tech-review', {
        method: 'POST',
        body: JSON.stringify({ projectId, status, remarks: remarks || undefined }),
      });
      setRemarks('');
      loadQueue();
    } catch (err: any) {
      alert(err.message || 'Technical review action failed');
    }
  };

  const handleMediaReview = async (projectId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await fetchApi('/approvals/media-review', {
        method: 'POST',
        body: JSON.stringify({ projectId, status, remarks: remarks || undefined }),
      });
      setRemarks('');
      loadQueue();
    } catch (err: any) {
      alert(err.message || 'Media review action failed');
    }
  };

  const handleRecordClientConfirmation = async (projectId: string) => {
    try {
      await fetchApi('/approvals/client-confirmation', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          decision: clientDecision,
          communicationMethod: commMethod,
          remarks: remarks || undefined,
        }),
      });
      setSelectedProjectId('');
      setRemarks('');
      loadQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to record client decision');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Approval Workflows...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-purple-400" /> 3-Stage Production Approval Engine
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Technical Review $\rightarrow$ Media Manager Review $\rightarrow$ Manual Client Confirmation Recording
          </p>
        </div>
      </div>

      {/* 3 Queues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
        {/* Stage 1: Technical Review */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> 1. Technical Review Queue
            </h2>
            <span className="font-bold text-gray-400 font-mono">({queue?.technicalReviewQueue?.length || 0})</span>
          </div>

          <p className="text-gray-400 text-[11px]">
            Technical Manager verifies resolution, frame rate, audio, export settings & naming standards.
          </p>

          {queue?.technicalReviewQueue?.length === 0 ? (
            <p className="text-gray-500 italic">No projects pending technical review.</p>
          ) : (
            <div className="space-y-3">
              {queue?.technicalReviewQueue?.map((proj: any) => (
                <div key={proj.id} className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
                  <div>
                    <span className="font-mono text-cyan-400 font-bold block">{proj.projectId}</span>
                    <h3 className="font-bold text-white text-xs">{proj.name}</h3>
                    <p className="text-gray-400 text-[10px]">{proj.client?.name} • {proj.brand?.name}</p>
                  </div>

                  {(user?.role === 'TECHNICAL_MANAGER' || (user?.role as string) === 'ADMIN') && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Technical Remarks (e.g. 4K Bitrate check OK)..."
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 text-gray-200 px-2.5 py-1.5 rounded"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleTechReview(proj.id, 'APPROVED')}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve Tech
                        </button>

                        <button
                          onClick={() => handleTechReview(proj.id, 'REJECTED')}
                          className="flex-1 py-1.5 bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/30 font-bold rounded flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stage 2: Media Manager Review */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-purple-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> 2. Media Review Queue
            </h2>
            <span className="font-bold text-gray-400 font-mono">({queue?.mediaReviewQueue?.length || 0})</span>
          </div>

          <p className="text-gray-400 text-[11px]">
            Media Manager verifies branding, creative execution, campaign objective & completeness.
          </p>

          {queue?.mediaReviewQueue?.length === 0 ? (
            <p className="text-gray-500 italic">No projects pending media manager approval.</p>
          ) : (
            <div className="space-y-3">
              {queue?.mediaReviewQueue?.map((proj: any) => (
                <div key={proj.id} className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
                  <div>
                    <span className="font-mono text-purple-400 font-bold block">{proj.projectId}</span>
                    <h3 className="font-bold text-white text-xs">{proj.name}</h3>
                    <p className="text-gray-400 text-[10px]">{proj.client?.name} • {proj.brand?.name}</p>
                  </div>

                  {(user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Media Creative Quality Remarks..."
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 text-gray-200 px-2.5 py-1.5 rounded"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleMediaReview(proj.id, 'APPROVED')}
                          className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve Media
                        </button>

                        <button
                          onClick={() => handleMediaReview(proj.id, 'REJECTED')}
                          className="flex-1 py-1.5 bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/30 font-bold rounded flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stage 3: Client Confirmation */}
        <div className="bg-card border border-border p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
              <PhoneCall className="w-4 h-4" /> 3. Client Confirmation Queue
            </h2>
            <span className="font-bold text-gray-400 font-mono">({queue?.clientConfirmationQueue?.length || 0})</span>
          </div>

          <p className="text-gray-400 text-[11px]">
            Record client decision manually (WhatsApp, Email, Call, Meeting). Revision requested restarts production.
          </p>

          {queue?.clientConfirmationQueue?.length === 0 ? (
            <p className="text-gray-500 italic">No projects pending client confirmation.</p>
          ) : (
            <div className="space-y-3">
              {queue?.clientConfirmationQueue?.map((proj: any) => (
                <div key={proj.id} className="p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
                  <div>
                    <span className="font-mono text-emerald-400 font-bold block">{proj.projectId}</span>
                    <h3 className="font-bold text-white text-xs">{proj.name}</h3>
                    <p className="text-gray-400 text-[10px]">{proj.client?.name}</p>
                  </div>

                  {(user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') && (
                    <div className="space-y-2 pt-1 border-t border-gray-800">
                      <div>
                        <label className="block text-gray-400 font-semibold mb-1">Communication Method</label>
                        <select
                          value={commMethod}
                          onChange={(e) => setCommMethod(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 text-gray-200 px-2 py-1 rounded"
                        >
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Email">Email</option>
                          <option value="Phone Call">Phone Call</option>
                          <option value="Meeting">Meeting</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-400 font-semibold mb-1">Client Decision &amp; Closure</label>
                        <select
                          value={clientDecision}
                          onChange={(e) => setClientDecision(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 text-gray-200 px-2 py-1 rounded font-bold"
                        >
                          <option value="APPROVED">APPROVED (Approve Project Closure)</option>
                          <option value="REVISION_REQUESTED">REVISION REQUESTED (Restart Prod)</option>
                          <option value="REJECTED">REJECTED (Cancel Project)</option>
                        </select>
                      </div>

                      <input
                        type="text"
                        placeholder="Client Feedback Remarks..."
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 text-gray-200 px-2.5 py-1.5 rounded"
                      />

                      <button
                        onClick={() => handleRecordClientConfirmation(proj.id)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded"
                      >
                        Record Client Confirmation &amp; Project Closure
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
