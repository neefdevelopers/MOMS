'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RotateCcw,
  Calendar,
  Building2,
  BookmarkCheck,
  Package,
  Layers,
  Share2,
  Copy,
  Check,
  FileText,
  MessageSquare,
  History,
  ShieldCheck,
  Image as ImageIcon,
  Video,
  Send,
  X,
  Filter,
  Search,
  ExternalLink,
  Flame,
  SlidersHorizontal,
} from 'lucide-react';

import { useRouter } from 'next/navigation';

export default function ClientReviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'MARKETING_MANAGER') {
      router.push('/');
    }
  }, [user, router]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_CLIENT_APPROVAL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editable Client Fields State
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [editPriority, setEditPriority] = useState<string>('MEDIUM');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Decision Modal State
  const [reviewModalAction, setReviewModalAction] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT' | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const loadEvents = async () => {
    try {
      const res = await fetchApi('/calendar');
      const eventList = Array.isArray(res) ? res : [];
      setEvents(eventList);

      // Auto select first pending event or existing selection
      if (eventList.length > 0 && !selectedEventId) {
        const pending = eventList.find(
          (e: any) => e.status === 'PENDING_CLIENT_APPROVAL' || e.status === 'PENDING_CLIENT_REVIEW',
        );
        setSelectedEventId(pending ? pending.id : eventList[0].id);
      }
    } catch (err) {
      console.error('Failed to load client review events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (statusFilter === 'PENDING_CLIENT_APPROVAL') {
      if (e.status !== 'PENDING_CLIENT_APPROVAL' && e.status !== 'PENDING_CLIENT_REVIEW') return false;
    } else if (statusFilter === 'APPROVED') {
      if (e.status !== 'APPROVED' && e.status !== 'CLIENT_APPROVED') return false;
    } else if (statusFilter && statusFilter !== 'ALL' && e.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = e.title?.toLowerCase().includes(q);
      const matchId = (e.eventId || e.id).toLowerCase().includes(q);
      const matchBrand = e.brand?.name?.toLowerCase().includes(q);
      const matchCaption = e.caption?.toLowerCase().includes(q);
      return matchTitle || matchId || matchBrand || matchCaption;
    }
    return true;
  });

  const selectedEvent = events.find((e) => e.id === selectedEventId) || filteredEvents[0];

  useEffect(() => {
    if (selectedEvent) {
      const dStr = selectedEvent.clientApprovalDeadline
        ? new Date(selectedEvent.clientApprovalDeadline).toISOString().split('T')[0]
        : '';
      setEditDeadline(dStr);
      setEditPriority(selectedEvent.priority || 'MEDIUM');
      setShowSettingsDrawer(false);
    }
  }, [selectedEvent?.id]);

  const handleCopyCaption = () => {
    if (selectedEvent?.caption) {
      navigator.clipboard.writeText(selectedEvent.caption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    }
  };

  const handleExecuteReview = async () => {
    if (!selectedEvent || !reviewModalAction) return;

    if ((reviewModalAction === 'REQUEST_CHANGES' || reviewModalAction === 'REJECT') && !commentText.trim()) {
      alert(`Please provide a mandatory feedback comment explaining why you are ${reviewModalAction === 'REQUEST_CHANGES' ? 'requesting changes' : 'rejecting this content'}.`);
      return;
    }

    try {
      setSubmittingReview(true);
      await fetchApi(`/calendar/${selectedEvent.id}/client-review`, {
        method: 'POST',
        body: JSON.stringify({
          action: reviewModalAction,
          comment: commentText.trim(),
          deadline: editDeadline,
          priority: editPriority,
        }),
      });

      setReviewModalAction(null);
      setCommentText('');
      await loadEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to submit client decision.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-gray-400">Loading Client Approval Portal...</p>
        </div>
      </div>
    );
  }

  const pendingCount = events.filter(
    (e) => e.status === 'PENDING_CLIENT_APPROVAL' || e.status === 'PENDING_CLIENT_REVIEW',
  ).length;

  return (
    <div className="space-y-5 pb-12 select-none">
      {/* Clean, Simple Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Client Content Review</h1>
            <p className="text-xs text-gray-400">Review proposed calendar events, adjust settings, and grant sign-off.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Pending Review:</span>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-extrabold text-xs border border-amber-500/30">
            {pendingCount} {pendingCount === 1 ? 'Item' : 'Items'}
          </span>
        </div>
      </div>

      {/* Main 2-Column Split Portal View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Event Selection List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Search & Tabs */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search title, ID, brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {[
                { label: 'Pending', value: 'PENDING_CLIENT_APPROVAL' },
                { label: 'Approved', value: 'APPROVED' },
                { label: 'Changes Req.', value: 'CHANGES_REQUESTED' },
                { label: 'Rejected', value: 'REJECTED' },
                { label: 'All', value: 'ALL' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Items */}
          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-card border border-border rounded-xl">
                No calendar items match the selected filter.
              </div>
            ) : (
              filteredEvents.map((item) => {
                const isSelected = selectedEvent?.id === item.id;
                const isOverdue = item.clientApprovalDeadline && new Date(item.clientApprovalDeadline) < new Date();
                const isPending = item.status === 'PENDING_CLIENT_APPROVAL' || item.status === 'PENDING_CLIENT_REVIEW';

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEventId(item.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/40'
                        : 'bg-card border-border hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-800 text-amber-400 border border-gray-700">
                        {item.eventId || 'CAL-EVENT'}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          isPending
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : item.status === 'APPROVED' || item.status === 'CLIENT_APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : item.status === 'CHANGES_REQUESTED'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {isPending ? 'Pending Review' : item.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{item.title}</h4>
                      <p className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>{item.brand?.name}</span>
                        <span>•</span>
                        <span className="font-mono text-gray-300">v{item.version}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-800/60">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        Shoot: {new Date(item.shootDate).toLocaleDateString()}
                      </span>
                      {isOverdue && isPending && (
                        <span className="text-red-400 font-bold flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" /> Overdue
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Workspace (8 cols) */}
        <div className="lg:col-span-8">
          {!selectedEvent ? (
            <div className="p-12 text-center text-gray-400 bg-card border border-border rounded-2xl">
              Select a calendar event to review creative details and grant sign-off.
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-card border border-border space-y-5 shadow-xl">
              {/* Event Title & Metadata Bar */}
              <div className="space-y-3 pb-4 border-b border-border">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {selectedEvent.eventId || 'CAL-EVENT'}
                    </span>
                    <span className="text-xs font-bold text-gray-300 px-2 py-0.5 bg-gray-800 rounded border border-gray-700">
                      Version {selectedEvent.version}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase ${
                        selectedEvent.status === 'PENDING_CLIENT_APPROVAL' || selectedEvent.status === 'PENDING_CLIENT_REVIEW'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : selectedEvent.status === 'APPROVED' || selectedEvent.status === 'CLIENT_APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : selectedEvent.status === 'CHANGES_REQUESTED'
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {selectedEvent.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Top Action Row - Strictly for Marketing Manager (Client Representative) */}
                  {user?.role === 'MARKETING_MANAGER' ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 border ${
                          showSettingsDrawer
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-gray-900 text-gray-300 border-gray-800 hover:text-white'
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Settings
                      </button>

                      <button
                        onClick={() => {
                          setReviewModalAction('REQUEST_CHANGES');
                          setCommentText('');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/40 hover:bg-orange-600/30 font-bold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Request Changes
                      </button>

                      <button
                        onClick={() => {
                          setReviewModalAction('REJECT');
                          setCommentText('');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30 font-bold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>

                      <button
                        onClick={() => {
                          setReviewModalAction('APPROVE');
                          setCommentText('');
                        }}
                        className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve Content
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 px-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs flex items-center gap-2 text-amber-300 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Waiting for client approval from <strong>Marketing Manager</strong>.
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">{selectedEvent.title}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Created by <strong className="text-gray-200">{selectedEvent.createdBy?.name || 'Social Media Manager'}</strong> ({selectedEvent.createdBy?.role || 'Creator'})
                  </p>
                </div>
              </div>

              {/* On-Demand Collapsible Settings Drawer (Opens on click) */}
              {showSettingsDrawer && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Client Approval Deadline &amp; Priority Controls
                    </span>
                    <button onClick={() => setShowSettingsDrawer(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-300 uppercase flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-400" /> Client Approval Deadline
                      </label>
                      <input
                        type="date"
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-300 uppercase flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" /> Client Event Priority
                      </label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="LOW">LOW Priority</option>
                        <option value="MEDIUM">MEDIUM Priority</option>
                        <option value="HIGH">HIGH Priority</option>
                        <option value="CRITICAL">CRITICAL Priority</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Clean Front Metadata Tiles Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Client &amp; Brand</span>
                  <p className="font-bold text-white truncate">{selectedEvent.client?.name}</p>
                  <p className="text-gray-400 truncate">{selectedEvent.brand?.name}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Product &amp; Campaign</span>
                  <p className="font-bold text-white truncate">{selectedEvent.product?.name || 'General Post'}</p>
                  <p className="text-gray-400 truncate">{selectedEvent.campaign || 'N/A'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Format &amp; Platform</span>
                  <p className="font-bold text-amber-400 truncate">{selectedEvent.contentType || 'Post'}</p>
                  <p className="text-gray-400 truncate">{selectedEvent.platform || 'Instagram'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Review Deadline &amp; Priority</span>
                  <p className="font-bold text-white truncate">
                    {editDeadline ? new Date(editDeadline).toLocaleDateString() : 'Not Set'}
                  </p>
                  <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {editPriority} Priority
                  </span>
                </div>
              </div>

              {/* Caption & Copywriting Preview Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Proposed Social Copy / Caption
                  </h3>
                  {selectedEvent.caption && (
                    <button
                      onClick={handleCopyCaption}
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCaption ? 'Copied!' : 'Copy Text'}
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {selectedEvent.caption || <span className="text-gray-500 italic">No copy provided for this event.</span>}
                </div>
              </div>

              {/* Creative Asset Preview Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  Creative Asset Preview
                </h3>

                {selectedEvent.creativePreviewUrl ? (
                  <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
                    {selectedEvent.creativePreviewUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                      <img
                        src={selectedEvent.creativePreviewUrl}
                        alt="Creative Preview"
                        className="max-h-80 rounded-lg object-contain mx-auto border border-gray-800"
                      />
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700">
                        <span className="text-xs font-mono text-gray-300 truncate">{selectedEvent.creativePreviewUrl}</span>
                        <a
                          href={selectedEvent.creativePreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded bg-blue-600 text-white font-bold text-xs flex items-center gap-1"
                        >
                          View File <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-gray-900/60 border border-gray-800 text-center text-gray-500 text-xs">
                    Creative visual file link pending upload by Social Media Manager.
                  </div>
                )}
              </div>

              {/* Production Notes */}
              {selectedEvent.productionNotes && (
                <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1 text-xs">
                  <span className="font-bold text-gray-400">Production &amp; Campaign Notes:</span>
                  <p className="text-gray-300">{selectedEvent.productionNotes}</p>
                </div>
              )}

              {/* Revision History & Client Feedback Log */}
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-purple-400" />
                  Approval &amp; Revision Log History
                </h3>

                {(!selectedEvent.approvalHistory || selectedEvent.approvalHistory.length === 0) ? (
                  <p className="text-xs text-gray-500 italic">No previous revision log for this event.</p>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {selectedEvent.approvalHistory.map((log: any) => (
                      <div key={log.id} className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-200">{log.user?.name || log.role}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 font-mono">
                              v{log.version}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              log.action?.includes('APPROVE')
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : log.action?.includes('REQUEST')
                                ? 'bg-amber-500/20 text-amber-400'
                                : log.action?.includes('SUBMIT')
                                ? 'bg-blue-500/20 text-blue-400'
                                : log.action?.includes('DEADLINE') || log.action?.includes('PRIORITY')
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {log.comment && (
                          <p className="text-xs text-gray-300 italic p-2 rounded bg-gray-950/60 border border-gray-800">
                            "{log.comment}"
                          </p>
                        )}

                        <div className="text-[10px] text-gray-500 text-right">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Focused On-Demand Decision Modal Dialog */}
      {reviewModalAction && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                {reviewModalAction === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {reviewModalAction === 'REQUEST_CHANGES' && <RotateCcw className="w-5 h-5 text-amber-400" />}
                {reviewModalAction === 'REJECT' && <XCircle className="w-5 h-5 text-red-400" />}
                {reviewModalAction === 'APPROVE'
                  ? 'Approve Calendar Event'
                  : reviewModalAction === 'REQUEST_CHANGES'
                  ? 'Request Content Changes'
                  : 'Reject Calendar Event'}
              </h3>

              <button onClick={() => setReviewModalAction(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editable Review Settings inside Decision Modal */}
            <div className="p-3.5 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
              <div className="text-xs text-gray-300 space-y-0.5">
                <p>
                  <strong>Event:</strong> {selectedEvent.title} (v{selectedEvent.version})
                </p>
                <p className="text-[11px] text-gray-400">
                  Client: {selectedEvent.client?.name} • Brand: {selectedEvent.brand?.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                    Approval Deadline
                  </label>
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                    Event Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">
                {reviewModalAction === 'APPROVE'
                  ? 'Approval Note (Optional):'
                  : 'Mandatory Client Feedback / Change Instructions:'}
              </label>
              <textarea
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  reviewModalAction === 'REQUEST_CHANGES'
                    ? 'e.g. Please update caption to include new offer details and replace the hero image.'
                    : reviewModalAction === 'REJECT'
                    ? 'e.g. This campaign angle is no longer aligned with brand positioning.'
                    : 'Optional sign-off approval comment...'
                }
                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReviewModalAction(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                disabled={submittingReview}
                onClick={handleExecuteReview}
                className={`px-5 py-2 rounded-xl font-black text-xs text-slate-950 transition-all ${
                  reviewModalAction === 'APPROVE'
                    ? 'bg-emerald-500 hover:bg-emerald-400'
                    : reviewModalAction === 'REQUEST_CHANGES'
                    ? 'bg-amber-500 hover:bg-amber-400'
                    : 'bg-red-500 hover:bg-red-400 text-white'
                }`}
              >
                {submittingReview ? 'Submitting...' : `Confirm ${reviewModalAction.replace('_', ' ')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
