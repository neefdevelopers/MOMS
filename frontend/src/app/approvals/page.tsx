'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CheckCircle2, AlertCircle, Clock, Check, X, RefreshCw, PhoneCall, MessageCircle, Mail } from 'lucide-react';
import { RoleGuard } from '@/components/common/RoleGuard';

const TECHNICAL_CHECKLIST_ITEMS = [
  'File Integrity & Codec Parsing',
  'Resolution & Aspect Ratio Compliance',
  'Export Settings & Bitrate Target',
  'Audio Quality & Loudness Levels',
  'Video Quality & Frame Rate Consistency',
  'Naming Standards & Asset Taxonomy',
  'Technical Broadcast & Platform Compliance',
];

const renderDeliverablesForReview = (proj: any) => {
  const tasks = proj.tasks || [];
  const files = proj.files || [];

  const deliverableItems: any[] = [];

  tasks.forEach((t: any) => {
    if (t.activeDeliverableUrl) {
      deliverableItems.push({
        id: `${t.id}-active`,
        fileName: t.activeDeliverableFileName || 'Active Work Deliverable Output',
        fileUrl: t.activeDeliverableUrl,
        version: t.activeDeliverableVersion || 1,
        taskTitle: t.title,
        uploadedBy: t.assignedEmployees?.map((a: any) => a.user?.name).filter(Boolean).join(', ') || 'Staff Member',
        isActive: true,
      });
    }

    if (t.deliverableHistory && Array.isArray(t.deliverableHistory)) {
      t.deliverableHistory.forEach((h: any) => {
        if (h.fileUrl !== t.activeDeliverableUrl) {
          deliverableItems.push({
            id: h.id,
            fileName: h.fileName || `Deliverable v${h.version}`,
            fileUrl: h.fileUrl,
            version: h.version,
            taskTitle: t.title,
            uploadedBy: h.user?.name || 'Staff Member',
            isActive: false,
          });
        }
      });
    }
  });

  files.forEach((f: any) => {
    deliverableItems.push({
      id: f.id,
      fileName: f.fileName || f.name || 'Project Output File',
      fileUrl: f.fileUrl || f.url,
      version: f.version || 1,
      taskTitle: 'Project Asset',
      uploadedBy: 'Team Member',
      isActive: false,
    });
  });

  return (
    <div className="bg-gray-950 border border-cyan-900/40 p-3 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
          📤 Uploaded Deliverables to Review ({deliverableItems.length})
        </span>
      </div>

      {deliverableItems.length === 0 ? (
        <p className="text-gray-500 italic text-[10px] p-1">No deliverable output files uploaded yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {deliverableItems.map((item) => (
            <div
              key={item.id}
              className={`p-2 rounded border flex items-center justify-between text-[10px] ${
                item.isActive
                  ? 'bg-cyan-950/40 border-cyan-700/60 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-300'
              }`}
            >
              <div className="space-y-0.5 max-w-[70%] truncate">
                <div className="font-bold flex items-center gap-1.5 text-xs truncate">
                  <span>📄 {item.fileName}</span>
                  {item.isActive && (
                    <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded text-[9px] font-mono">
                      v{item.version} (Active Output)
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-gray-400">
                  Task: {item.taskTitle} • Uploaded by {item.uploadedBy}
                </div>
              </div>

              <a
                href={item.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-[10px] transition-colors flex items-center gap-1 shrink-0 shadow-md shadow-cyan-600/30"
              >
                🔗 Review / Download ↗
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TECH' | 'MEDIA' | 'CLIENT'>('TECH');

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
    if (user?.role === 'MEDIA_MANAGER') {
      setActiveTab('MEDIA');
    } else if (user?.role === 'TECHNICAL_MANAGER') {
      setActiveTab('TECH');
    }
  }, [user]);

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
    <RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-400" /> 3-Stage Production Approval Engine
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Technical Review → Media Manager Review → Manual Client Confirmation Recording
            </p>
          </div>
        </div>

        {/* Session Selection Buttons */}
        <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('TECH')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'TECH'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                : 'bg-card hover:bg-gray-800 text-gray-400 border border-border'
            }`}
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>1. Technical Review Queue</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-mono border border-cyan-800 font-bold">
              {queue?.technicalReviewQueue?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('MEDIA')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'MEDIA'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-lg shadow-purple-500/10'
                : 'bg-card hover:bg-gray-800 text-gray-400 border border-border'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            <span>2. Media Review Queue</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 text-[10px] font-mono border border-purple-800 font-bold">
              {queue?.mediaReviewQueue?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CLIENT')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'CLIENT'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                : 'bg-card hover:bg-gray-800 text-gray-400 border border-border'
            }`}
          >
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            <span>3. Client Confirmation Queue</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-800 font-bold">
              {queue?.clientConfirmationQueue?.length || 0}
            </span>
          </button>
        </div>

        {/* Selected Session Container */}
        {activeTab === 'TECH' && (
          <div className="bg-card border border-border p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-bold text-cyan-400 text-base flex items-center gap-2">
                  <Clock className="w-5 h-5" /> 1. Technical Review Queue
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Technical Manager verifies resolution, frame rate, audio quality, export settings & naming standards.
                </p>
              </div>
              <span className="font-bold text-cyan-300 font-mono bg-cyan-950 px-3 py-1 rounded-full border border-cyan-800 text-xs">
                {queue?.technicalReviewQueue?.length || 0} Pending Items
              </span>
            </div>

            {queue?.technicalReviewQueue?.length === 0 ? (
              <div className="py-12 text-center text-gray-500 space-y-2">
                <Clock className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="font-semibold text-sm">No items pending technical review.</p>
                <p className="text-xs text-gray-600">Items will appear here when deliverables are uploaded by production staff.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {queue?.technicalReviewQueue?.map((proj: any) => (
                  <div key={proj.id} className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-cyan-400 font-bold text-xs">{proj.projectId}</span>
                        <h3 className="font-bold text-white text-sm">{proj.name}</h3>
                        <p className="text-gray-400 text-xs">{proj.client?.name} • {proj.brand?.name}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold font-mono">
                        {proj.status}
                      </span>
                    </div>

                    {renderDeliverablesForReview(proj)}

                    {(user?.role === 'TECHNICAL_MANAGER' || user?.role === 'ADMINISTRATOR' || (user?.role as string) === 'ADMIN') && (
                      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-lg">
                        <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider block">
                          ⚙️ Technical Manager Validation Checklist
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-gray-300">
                          {TECHNICAL_CHECKLIST_ITEMS.map((item, idx) => (
                            <label key={idx} className="flex items-center gap-2 cursor-pointer hover:text-white">
                              <input
                                type="checkbox"
                                defaultChecked
                                className="w-4 h-4 accent-cyan-500 rounded bg-gray-900 border-gray-700 cursor-pointer"
                              />
                              <span>{item}</span>
                            </label>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Technical Remarks (e.g. Resolution 4K OK, Bitrate 50Mbps verified)..."
                          onChange={(e) => setRemarks(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 text-gray-200 px-3 py-2 rounded text-xs"
                        />
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleTechReview(proj.id, 'APPROVED')}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 text-xs"
                          >
                            <Check className="w-4 h-4" /> Approve & Advance to Media Review
                          </button>

                          <button
                            onClick={() => handleTechReview(proj.id, 'REJECTED')}
                            className="flex-1 py-2 bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/30 font-bold rounded flex items-center justify-center gap-1.5 text-xs transition-colors"
                          >
                            <X className="w-4 h-4" /> Reject (Return to Production)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'MEDIA' && (
          <div className="bg-card border border-border p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-bold text-purple-400 text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> 2. Media Review Queue
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Media Manager verifies branding, creative execution, campaign objective & completeness.
                </p>
              </div>
              <span className="font-bold text-purple-300 font-mono bg-purple-950 px-3 py-1 rounded-full border border-purple-800 text-xs">
                {queue?.mediaReviewQueue?.length || 0} Pending Items
              </span>
            </div>

            {queue?.mediaReviewQueue?.length === 0 ? (
              <div className="py-12 text-center text-gray-500 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="font-semibold text-sm">No items pending media manager approval.</p>
                <p className="text-xs text-gray-600">Items will appear here after passing technical review sign-off.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {queue?.mediaReviewQueue?.map((proj: any) => (
                  <div key={proj.id} className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-purple-400 font-bold text-xs">{proj.projectId}</span>
                        <h3 className="font-bold text-white text-sm">{proj.name}</h3>
                        <p className="text-gray-400 text-xs">{proj.client?.name} • {proj.brand?.name}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold font-mono">
                        {proj.status}
                      </span>
                    </div>

                    {renderDeliverablesForReview(proj)}

                    {(user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') && (
                      <div className="space-y-3 bg-gray-950 border border-gray-800 p-4 rounded-lg">
                        <input
                          type="text"
                          placeholder="Media Creative Quality Remarks..."
                          onChange={(e) => setRemarks(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 text-gray-200 px-3 py-2 rounded text-xs"
                        />
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleMediaReview(proj.id, 'APPROVED')}
                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded flex items-center justify-center gap-1.5 text-xs shadow-md shadow-purple-600/30"
                          >
                            <Check className="w-4 h-4" /> Approve Media Quality
                          </button>

                          <button
                            onClick={() => handleMediaReview(proj.id, 'REJECTED')}
                            className="flex-1 py-2 bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/30 font-bold rounded flex items-center justify-center gap-1.5 text-xs"
                          >
                            <X className="w-4 h-4" /> Reject (Return to Production)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'CLIENT' && (
          <div className="bg-card border border-border p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-bold text-emerald-400 text-base flex items-center gap-2">
                  <PhoneCall className="w-5 h-5" /> 3. Client Confirmation Queue
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  Record client decision manually (WhatsApp, Email, Call, Meeting). Revision requested restarts production.
                </p>
              </div>
              <span className="font-bold text-emerald-300 font-mono bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800 text-xs">
                {queue?.clientConfirmationQueue?.length || 0} Pending Items
              </span>
            </div>

            {queue?.clientConfirmationQueue?.length === 0 ? (
              <div className="py-12 text-center text-gray-500 space-y-2">
                <PhoneCall className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="font-semibold text-sm">No items pending client confirmation.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {queue?.clientConfirmationQueue?.map((proj: any) => (
                  <div key={proj.id} className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4 shadow-lg">
                    <div>
                      <span className="font-mono text-emerald-400 font-bold text-xs">{proj.projectId}</span>
                      <h3 className="font-bold text-white text-sm">{proj.name}</h3>
                      <p className="text-gray-400 text-xs">{proj.client?.name}</p>
                    </div>

                    {(user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN') && (
                      <div className="space-y-3 pt-3 border-t border-gray-800">
                        <div>
                          <label className="block text-gray-400 font-semibold mb-1 text-xs">Communication Method</label>
                          <select
                            value={commMethod}
                            onChange={(e) => setCommMethod(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 text-gray-200 px-3 py-2 rounded text-xs"
                          >
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Email">Email</option>
                            <option value="Phone Call">Phone Call</option>
                            <option value="Meeting">Meeting</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-400 font-semibold mb-1 text-xs">Client Decision &amp; Closure</label>
                          <select
                            value={clientDecision}
                            onChange={(e) => setClientDecision(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 text-gray-200 px-3 py-2 rounded text-xs font-bold"
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
                          className="w-full bg-gray-950 border border-gray-800 text-gray-200 px-3 py-2 rounded text-xs"
                        />

                        <button
                          onClick={() => handleRecordClientConfirmation(proj.id)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs shadow-md shadow-emerald-600/30"
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
        )}
      </div>
    </RoleGuard>
  );
}
