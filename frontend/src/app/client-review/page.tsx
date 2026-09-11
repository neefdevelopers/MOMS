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
  ArrowRight,
  Eye,
  User,
  AlertTriangle,
  MapPin,
  Camera,
  Users,
  CloudSun,
  Phone,
  Shield,
  Edit,
  Link as LinkIcon,
  Compass,
  Sparkles,
  CheckSquare,
  Tag,
} from 'lucide-react';

import { useRouter } from 'next/navigation';

export default function ClientReviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [editRequests, setEditRequests] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEditRequest, setSelectedEditRequest] = useState<any | null>(null);
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
  const [editRequestModalAction, setEditRequestModalAction] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT' | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [editRequestComment, setEditRequestComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const loadClientData = async () => {
    try {
      const [resEvents, resReqs] = await Promise.all([
        fetchApi('/calendar?status=ALL').catch(() => []),
        fetchApi('/calendar/edit-requests/all?status=PENDING_MARKETING_APPROVAL').catch(() => []),
      ]);
      const rawEvents = Array.isArray(resEvents) ? resEvents : (resEvents?.data || resEvents?.events || resEvents?.items || []);
      const rawReqs = Array.isArray(resReqs) ? resReqs : (resReqs?.data || resReqs?.items || []);
      setEvents(rawEvents);
      setEditRequests(rawReqs);
    } catch (err) {
      console.error('Failed to load client review data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientData();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (statusFilter === 'PENDING_CLIENT_APPROVAL') {
      if (
        e.status !== 'PENDING_CLIENT_APPROVAL' &&
        e.status !== 'PENDING_CLIENT_REVIEW' &&
        e.status !== 'PENDING_MARKETING_APPROVAL' &&
        e.status !== 'WAITING_FOR_MEDIA_REVIEW'
      )
        return false;
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

  const selectedEvent = selectedEventId ? events.find((e) => e.id === selectedEventId) || null : null;

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

  const handleConfirmReviewAction = async () => {
    if (!selectedEvent || !reviewModalAction) return;

    if (
      (reviewModalAction === 'REQUEST_CHANGES' || reviewModalAction === 'REJECT') &&
      !commentText.trim()
    ) {
      alert(
        `A mandatory feedback comment is required when you ${
          reviewModalAction === 'REQUEST_CHANGES' ? 'request changes' : 'reject content'
        }.`,
      );
      return;
    }

    try {
      setSubmittingReview(true);
      const payload: any = {
        action: reviewModalAction,
        comment: commentText.trim(),
      };

      const curDeadline = selectedEvent.clientApprovalDeadline
        ? new Date(selectedEvent.clientApprovalDeadline).toISOString().split('T')[0]
        : '';
      if (editDeadline && editDeadline !== curDeadline) {
        payload.deadline = editDeadline;
      }
      if (editPriority && editPriority !== (selectedEvent.priority || 'MEDIUM')) {
        payload.priority = editPriority;
      }

      await fetchApi(`/calendar/${selectedEvent.id}/client-review`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setReviewModalAction(null);
      setCommentText('');
      setSelectedEventId(null); // Close pop-up on successful decision
      await loadClientData();
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
          <p className="text-xs font-medium text-slate-500">Loading Client Approval Portal...</p>
        </div>
      </div>
    );
  }

  const pendingCount = events.filter(
    (e) =>
      e.status === 'PENDING_CLIENT_APPROVAL' ||
      e.status === 'PENDING_CLIENT_REVIEW' ||
      e.status === 'PENDING_MARKETING_APPROVAL' ||
      e.status === 'WAITING_FOR_MEDIA_REVIEW',
  ).length;

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Clean Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Event Approval Session</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Pending Review:</span>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 font-extrabold text-xs border border-amber-200">
            {pendingCount} {pendingCount === 1 ? 'Item' : 'Items'}
          </span>
        </div>
      </div>

      {/* Filter & Search Toolbar across Full Width */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search title, ID, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {[
            { label: 'Pending Review', value: 'PENDING_CLIENT_APPROVAL' },
            { label: `Pending Edit Requests (${editRequests.length})`, value: 'EDIT_REQUESTS' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Changes Req.', value: 'CHANGES_REQUESTED' },
            { label: 'Rejected', value: 'REJECTED' },
            { label: 'All Items', value: 'ALL' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === tab.value
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>



      {/* Full Width Grid View of Event Request Cards */}
      {statusFilter === 'EDIT_REQUESTS' ? (
        editRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
            No pending edit requests awaiting Marketing Manager review.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {editRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => setSelectedEditRequest(req)}
                className="group p-5 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 hover:shadow-xl transition-all cursor-pointer space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase font-bold">
                      {req.calendarEvent?.eventId || `EVT-${req.calendarEventId.substring(0, 6).toUpperCase()}`}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase font-mono">
                      EDIT REQUEST
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-amber-600 transition-colors">
                    {req.calendarEvent?.title || 'Calendar Event'}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <div>Brand: <strong className="text-slate-700">{req.calendarEvent?.brand?.name || 'N/A'}</strong></div>
                    <div>•</div>
                    <div>Requested By: <strong className="text-slate-800">{req.requestedBy?.name || 'Media Manager'}</strong> ({req.requestedBy?.role})</div>
                  </div>

                  {req.reason && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 italic">
                      "{req.reason}"
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEditRequest(req);
                  }}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Eye className="w-4 h-4" /> Review Edit Request &amp; Compare Diff
                </button>
              </div>
            ))}
          </div>
        )
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
          No calendar items match the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((item) => {
            const isOverdue = item.clientApprovalDeadline && new Date(item.clientApprovalDeadline) < new Date();
            const isPending = item.status === 'PENDING_CLIENT_APPROVAL' || item.status === 'PENDING_CLIENT_REVIEW';

            return (
              <div
                key={item.id}
                onClick={() => setSelectedEventId(item.id)}
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-200 hover:shadow-xl transition-all cursor-pointer space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-50 text-amber-600 border border-slate-200">
                      {item.eventId || 'CAL-EVENT'}
                    </span>

                    {item.editRequests && item.editRequests.some((r: any) => r.status === 'PENDING_MARKETING_APPROVAL') ? (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> WAITING FOR EDITING APPROVAL
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                          isPending
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : item.status === 'APPROVED' || item.status === 'CLIENT_APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'CHANGES_REQUESTED'
                            ? 'bg-orange-50 text-orange-800 border border-orange-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isPending ? 'Pending Review' : item.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <span>{item.brand?.name || 'Brand'}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-700">v{item.version}</span>
                      <span>•</span>
                      <span className="text-slate-700 font-medium truncate flex items-center gap-1">
                        <User className="w-3 h-3 text-amber-600 shrink-0" />
                        {item.createdBy?.name || (item.createdByRole ? item.createdByRole.replace(/_/g, ' ') : 'Creator')}
                      </span>
                    </p>
                  </div>

                  {/* Waiting for Edit Approval Alert Banner Strip */}
                  {item.editRequests && item.editRequests.some((r: any) => r.status === 'PENDING_MARKETING_APPROVAL') && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-amber-900 text-xs font-bold shadow-xs animate-pulse">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Waiting for Edit Approval</span>
                      </span>
                      <span className="text-[9px] font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 border border-amber-200">
                        Pending MM Review
                      </span>
                    </div>
                  )}

                  {item.caption && (
                    <p className="text-xs text-slate-500 line-clamp-2 italic bg-slate-50/60 p-2.5 rounded-xl border border-slate-200">
                      "{item.caption}"
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Platform</span>
                      <span className="text-slate-800 font-semibold">{item.platform || 'Instagram'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Shoot Date</span>
                      <span className="text-slate-800 font-semibold">
                        {item.shootDate ? new Date(item.shootDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {isOverdue && isPending ? (
                      <span className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Overdue
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        Deadline: {item.clientApprovalDeadline ? new Date(item.clientApprovalDeadline).toLocaleDateString() : 'Set on review'}
                      </span>
                    )}

                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <Eye className="w-3.5 h-3.5" /> Review Event <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pop-Up Modal Dialog when Event Card is Clicked */}
      {selectedEvent && !reviewModalAction && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedEventId(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="space-y-3 pb-4 border-b border-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-600 border border-amber-200">
                    {selectedEvent.eventId || 'CAL-EVENT'}
                  </span>
                  <span className="text-xs font-bold text-slate-700 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                    Version {selectedEvent.version}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase ${
                      selectedEvent.status === 'PENDING_CLIENT_APPROVAL' || selectedEvent.status === 'PENDING_CLIENT_REVIEW'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : selectedEvent.status === 'APPROVED' || selectedEvent.status === 'CLIENT_APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedEvent.status === 'CHANGES_REQUESTED'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {selectedEvent.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedEventId(null)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedEvent.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Created by <strong className="text-slate-800">{selectedEvent.createdBy?.name || (selectedEvent.createdByRole ? selectedEvent.createdByRole.replace(/_/g, ' ') : 'Creator')}</strong> (
                    {selectedEvent.createdBy?.role ? selectedEvent.createdBy.role.replace(/_/g, ' ') : selectedEvent.createdByRole ? selectedEvent.createdByRole.replace(/_/g, ' ') : 'Creator'})
                  </p>
                </div>

                {/* Top Action Row - Strictly for Marketing Manager (Client Representative) */}
                {user?.role === 'MARKETING_MANAGER' ? (
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 border ${
                        showSettingsDrawer
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:text-slate-900'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Settings
                    </button>

                    <button
                      onClick={() => {
                        setReviewModalAction('REJECT');
                        setCommentText('');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-red-600/30 font-bold text-xs transition-colors flex items-center gap-1.5"
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
                  <div className="p-2.5 px-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center gap-2 text-amber-800 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Waiting for client approval from <strong>Marketing Manager</strong>.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* On-Demand Collapsible Settings Drawer */}
            {showSettingsDrawer && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Client Approval Deadline &amp; Priority Controls
                  </span>
                  <button onClick={() => setShowSettingsDrawer(false)} className="text-slate-500 hover:text-slate-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-600" /> Client Approval Deadline
                    </label>
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-600" /> Client Event Priority
                    </label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
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

            {/* Event Source & Type Header Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-slate-50 border border-amber-200 text-xs flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider block">
                  Event Source &amp; Type:
                </span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  {selectedEvent.eventSource === 'GRAPHIC_REQUIREMENT' || selectedEvent.graphicRequirementId ? (
                    <>
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>Graphic Requirement</span>
                      {(selectedEvent.graphicRequirement?.requirementId || selectedEvent.eventId) && (
                        <span className="font-mono text-amber-800 font-bold bg-amber-100/60 px-1.5 py-0.5 rounded border border-amber-200">
                          {selectedEvent.graphicRequirement?.requirementId || selectedEvent.eventId}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 text-blue-600" />
                      <span>Shoot Project ({selectedEvent.shootType || 'INDOOR'})</span>
                      {(selectedEvent.shoot?.projectId || selectedEvent.shootProjects?.[0]?.projectId || selectedEvent.eventId) && (
                        <span className="font-mono text-blue-700 font-bold bg-blue-100/60 px-1.5 py-0.5 rounded border border-blue-200">
                          {selectedEvent.shoot?.projectId || selectedEvent.shootProjects?.[0]?.projectId || selectedEvent.eventId}
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {selectedEvent.shootProjects?.[0]?.id && (
                  <a
                    href={`/projects/${selectedEvent.shootProjects[0].id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] border border-blue-200 flex items-center gap-1"
                  >
                    <span>View Shoot Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* SECTION 1: CLIENT, BRAND & CONTENT SPECIFICATIONS */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" /> Section 1: Client, Brand &amp; Content Specifications
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Client Name</span>
                  <p className="font-bold text-slate-800 truncate">{selectedEvent.client?.name || 'N/A'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{selectedEvent.client?.clientCode || ''}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Brand</span>
                  <p className="font-bold text-slate-800 truncate">{selectedEvent.brand?.name || 'N/A'}</p>
                  {selectedEvent.brand?.shortCode && (
                    <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                      [{selectedEvent.brand.shortCode}]
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Product</span>
                  <p className="font-bold text-slate-800 truncate">{selectedEvent.product?.name || 'General Product / Brand Post'}</p>
                  {selectedEvent.product?.sku && (
                    <p className="text-[10px] text-slate-500 font-mono">SKU: {selectedEvent.product.sku}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Campaign</span>
                  <p className="font-bold text-slate-800 truncate">{selectedEvent.campaign || 'N/A'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Format / Type</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-bold text-amber-700 bg-amber-50 border border-amber-200 text-[11px]">
                    {selectedEvent.contentType || 'Post'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Platform</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 text-[11px]">
                    {selectedEvent.platform || 'Instagram'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Talent / Model</span>
                  <p className="font-bold text-slate-800 truncate">
                    {selectedEvent.influencerTalent || selectedEvent.shootProjects?.[0]?.influencerTalent || 'Not Specified'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Priority Level</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded font-extrabold uppercase text-[10px] ${
                    selectedEvent.priority === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : selectedEvent.priority === 'HIGH'
                      ? 'bg-orange-50 text-orange-800 border border-orange-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {selectedEvent.priority || 'MEDIUM'} Priority
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: SCHEDULE, TIMING & MILESTONES */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Section 2: Schedule, Timing &amp; Milestones
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Shoot / Event Date</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {selectedEvent.shootDate ? new Date(selectedEvent.shootDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Call / Reporting Time</span>
                  <p className="font-bold text-blue-700 font-mono">
                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.callTime ||
                      selectedEvent.shootProjects?.[0]?.indoorDetails?.reportingTime ||
                      selectedEvent.startTime ||
                      '09:00 AM'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Wrap / Completion Time</span>
                  <p className="font-bold text-blue-700 font-mono">
                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.expectedWrapTime ||
                      selectedEvent.shootProjects?.[0]?.indoorDetails?.wrapUpTime ||
                      selectedEvent.endTime ||
                      '05:00 PM'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Client Approval Deadline</span>
                  <p className="font-bold text-amber-700">
                    {selectedEvent.clientApprovalDeadline
                      ? new Date(selectedEvent.clientApprovalDeadline).toLocaleDateString()
                      : 'Set on Review'}
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 3: LOCATION & LOGISTICS (INDOOR & OUTDOOR) */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-600" /> Section 3: Location &amp; Operational Logistics
              </span>

              {selectedEvent.shootType === 'OUTDOOR' || selectedEvent.shootProjects?.[0]?.outdoorDetails ? (
                /* OUTDOOR LOGISTICS CARD */
                <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <span className="font-bold text-purple-900 flex items-center gap-1.5 uppercase text-[11px]">
                      <Compass className="w-4 h-4 text-purple-600" /> Outdoor On-Location Logistics
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                      ON-LOCATION
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-purple-800 uppercase block">Exact Location Address</span>
                      <p className="font-semibold text-slate-900">
                        {selectedEvent.shootProjects?.[0]?.outdoorDetails?.exactLocationAddress ||
                          selectedEvent.shootProjects?.[0]?.outdoorDetails?.locationAddress ||
                          selectedEvent.location ||
                          'Location address specified in brief'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-purple-800 uppercase block">Location Access &amp; Parking</span>
                      <p className="text-slate-800">
                        {selectedEvent.shootProjects?.[0]?.outdoorDetails?.locationAccessDetails || 'Standard Access'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-purple-800 uppercase block">Location Contact Person</span>
                      <p className="text-slate-800">
                        {selectedEvent.shootProjects?.[0]?.outdoorDetails?.locationContact ||
                          selectedEvent.shootProjects?.[0]?.outdoorDetails?.locationContactPerson ||
                          'Contact not provided'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-purple-800 uppercase block">Expected Weather Conditions</span>
                      <p className="font-semibold text-slate-900 flex items-center gap-1">
                        <CloudSun className="w-3.5 h-3.5 text-amber-600" />
                        {selectedEvent.shootProjects?.[0]?.outdoorDetails?.expectedWeatherConditions ||
                          selectedEvent.shootProjects?.[0]?.outdoorDetails?.weatherStatus ||
                          'Sunny / Clear'}
                      </p>
                    </div>

                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.backupLocation && (
                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-[10px] font-bold text-purple-800 uppercase block">Backup Weather Location</span>
                        <p className="text-slate-800">
                          {selectedEvent.shootProjects[0].outdoorDetails.backupLocation}
                        </p>
                      </div>
                    )}

                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.specialOutdoorRequirements && (
                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-[10px] font-bold text-purple-800 uppercase block">Special Outdoor Notes &amp; Safety</span>
                        <p className="text-slate-800 italic bg-white/70 p-2.5 rounded-lg border border-purple-200">
                          "{selectedEvent.shootProjects[0].outdoorDetails.specialOutdoorRequirements}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* INDOOR LOGISTICS CARD */
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[11px]">
                      <Building2 className="w-4 h-4 text-blue-600" /> Indoor Studio Details
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      STUDIO FLOOR
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Studio / Stage Location</span>
                      <p className="font-semibold text-slate-900">
                        {selectedEvent.shootProjects?.[0]?.indoorDetails?.studioName ||
                          selectedEvent.location ||
                          'Main Studio Floor'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Studio Address</span>
                      <p className="text-slate-700">
                        {selectedEvent.shootProjects?.[0]?.indoorDetails?.studioAddress ||
                          selectedEvent.location ||
                          'HQ Studio Facility'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: ASSIGNED CREW & RESERVED EQUIPMENT */}
            {(selectedEvent.assignedStaff ||
              selectedEvent.shootProjects?.[0]?.assignedTeam?.length > 0 ||
              selectedEvent.shootProjects?.[0]?.equipmentReservations?.length > 0) && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" /> Section 4: Assigned Crew &amp; Reserved Equipment
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Crew Members */}
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-2">
                    <span className="font-bold text-indigo-900 uppercase text-[10px] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-600" /> Production Team &amp; Assigned Crew
                    </span>
                    <div className="space-y-1.5">
                      {selectedEvent.assignedStaff && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-indigo-200">
                          <span className="font-semibold text-slate-900">{selectedEvent.assignedStaff.name}</span>
                          <span className="text-[10px] font-mono text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                            {selectedEvent.assignedStaff.role?.replace(/_/g, ' ') || 'Lead Staff'}
                          </span>
                        </div>
                      )}
                      {selectedEvent.shootProjects?.[0]?.assignedTeam?.map((tm: any) => (
                        <div key={tm.id} className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-indigo-200">
                          <span className="font-semibold text-slate-900">{tm.user?.name || 'Crew Member'}</span>
                          <span className="text-[10px] font-mono text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                            {tm.roleInProject || tm.user?.role?.replace(/_/g, ' ') || 'Crew'}
                          </span>
                        </div>
                      ))}
                      {!selectedEvent.assignedStaff && (!selectedEvent.shootProjects?.[0]?.assignedTeam || selectedEvent.shootProjects[0].assignedTeam.length === 0) && (
                        <p className="text-slate-400 italic text-[11px]">No crew members explicitly assigned.</p>
                      )}
                    </div>
                  </div>

                  {/* Reserved Equipment */}
                  <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                    <span className="font-bold text-purple-900 uppercase text-[10px] flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-purple-600" /> Reserved Production Equipment
                    </span>
                    <div className="space-y-1.5">
                      {selectedEvent.shootProjects?.[0]?.equipmentReservations?.map((res: any) => (
                        <div key={res.id} className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-purple-200">
                          <span className="font-semibold text-slate-900">{res.equipment?.name || 'Equipment'}</span>
                          <span className="text-[10px] font-mono text-purple-700 uppercase bg-purple-50 px-2 py-0.5 rounded">
                            {res.equipment?.category || res.status}
                          </span>
                        </div>
                      ))}
                      {(!selectedEvent.shootProjects?.[0]?.equipmentReservations || selectedEvent.shootProjects[0].equipmentReservations.length === 0) && (
                        <p className="text-slate-400 italic text-[11px]">No equipment reserved for this event.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: CREATIVE ASSETS & REFERENCE FILES */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Section 5: Creative Asset &amp; Reference Files
              </span>

              {selectedEvent.creativePreviewUrl ? (
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5 overflow-hidden">
                      <strong className="text-slate-900 text-sm block truncate">
                        {selectedEvent.creativeAssetName || 'Primary Creative Visual Asset'}
                      </strong>
                      <span className="text-xs font-mono text-indigo-700 truncate block">
                        {selectedEvent.creativePreviewUrl}
                      </span>
                    </div>
                    <a
                      href={selectedEvent.creativePreviewUrl.startsWith('http') ? selectedEvent.creativePreviewUrl : `https://${selectedEvent.creativePreviewUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open Asset Link
                    </a>
                  </div>

                  {selectedEvent.creativePreviewUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) && (
                    <img
                      src={selectedEvent.creativePreviewUrl}
                      alt="Creative Preview"
                      className="max-h-80 rounded-lg object-contain mx-auto border border-indigo-200 bg-white"
                    />
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200 text-center text-slate-400 text-xs">
                  No external cloud asset link provided.
                </div>
              )}
            </div>

            {/* SECTION 6: PRODUCTION NOTES & INSTRUCTIONS */}
            {selectedEvent.productionNotes && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-600" /> Section 6: Production Notes &amp; Special Instructions
                </span>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.productionNotes}
                </div>
              </div>
            )}

            {/* Revision History & Client Feedback Log */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-600" />
                Approval &amp; Revision Log History
              </h3>

              {!selectedEvent.approvalHistory || selectedEvent.approvalHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No previous revision log for this event.</p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedEvent.approvalHistory.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{log.user?.name || log.role}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                            v{log.version}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            log.action?.includes('APPROVE')
                              ? 'bg-emerald-50 text-emerald-600'
                              : log.action?.includes('REQUEST')
                              ? 'bg-amber-50 text-amber-600'
                              : log.action?.includes('SUBMIT')
                              ? 'bg-blue-50 text-blue-600'
                              : log.action?.includes('DEADLINE') || log.action?.includes('PRIORITY')
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {log.action?.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {log.comment && (
                        <p className="text-xs text-slate-700 italic p-2 rounded bg-slate-50/60 border border-slate-200">
                          "{log.comment}"
                        </p>
                      )}

                      <div className="text-[10px] text-slate-400 text-right">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decision Confirmation Modal Dialog */}
      {reviewModalAction && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                {reviewModalAction === 'APPROVE' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {reviewModalAction === 'REQUEST_CHANGES' && <RotateCcw className="w-5 h-5 text-amber-600" />}
                {reviewModalAction === 'REJECT' && <XCircle className="w-5 h-5 text-rose-600" />}
                {reviewModalAction === 'APPROVE'
                  ? 'Approve & Accept Calendar Event'
                  : reviewModalAction === 'REQUEST_CHANGES'
                  ? 'Request Content Changes'
                  : 'Reject Calendar Event'}
              </h3>

              <button onClick={() => setReviewModalAction(null)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Complete Event Details Summary Card (Before Accepting) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                    {selectedEvent.eventId || `EVT-${selectedEvent.id.substring(0, 6).toUpperCase()}`}
                  </span>
                  <span className="font-bold text-slate-900 text-sm ml-2">{selectedEvent.title}</span>
                  <span className="text-slate-500 font-mono text-[10px] ml-1.5">(v{selectedEvent.version})</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px] uppercase font-mono">
                  {selectedEvent.eventSource || 'SHOOT'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Client &amp; Brand</span>
                  <strong className="text-slate-900">{selectedEvent.client?.name}</strong>
                  <span className="text-slate-500 block text-[11px]">{selectedEvent.brand?.name}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Product &amp; Campaign</span>
                  <strong className="text-slate-900">{selectedEvent.product?.name || 'General Product'}</strong>
                  <span className="text-slate-500 block text-[11px]">{selectedEvent.campaign || 'Standard'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Format &amp; Platform</span>
                  <span className="text-amber-700 font-bold">{selectedEvent.contentType || 'Post'}</span>
                  <span className="text-slate-500 block text-[11px]">{selectedEvent.platform || 'Instagram'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Shoot / Event Date</span>
                  <strong className="text-slate-900">{selectedEvent.shootDate ? new Date(selectedEvent.shootDate).toLocaleDateString() : 'N/A'}</strong>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Call &amp; Wrap Times</span>
                  <span className="font-mono text-blue-700 font-bold">
                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.callTime || selectedEvent.shootProjects?.[0]?.indoorDetails?.reportingTime || selectedEvent.startTime || '09:00 AM'} - {selectedEvent.shootProjects?.[0]?.outdoorDetails?.expectedWrapTime || selectedEvent.shootProjects?.[0]?.indoorDetails?.wrapUpTime || selectedEvent.endTime || '05:00 PM'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Shoot Location</span>
                  <span className="text-slate-900 font-medium truncate block">
                    {selectedEvent.shootProjects?.[0]?.outdoorDetails?.exactLocationAddress || selectedEvent.shootProjects?.[0]?.indoorDetails?.studioName || selectedEvent.location || 'Studio HQ'}
                  </span>
                </div>
              </div>

              {/* Outdoor Logistics Summary (if outdoor shoot) */}
              {selectedEvent.shootProjects?.[0]?.outdoorDetails && (
                <div className="p-2.5 rounded-lg bg-purple-50/80 border border-purple-200 text-[11px] space-y-1 text-purple-950">
                  <div className="font-bold text-purple-900 uppercase text-[10px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-purple-600" /> Outdoor Logistics Summary
                  </div>
                  <div><strong>Address:</strong> {selectedEvent.shootProjects[0].outdoorDetails.exactLocationAddress || selectedEvent.shootProjects[0].outdoorDetails.locationAddress}</div>
                  <div><strong>Access &amp; Contact:</strong> {selectedEvent.shootProjects[0].outdoorDetails.locationAccessDetails || 'Standard'} • {selectedEvent.shootProjects[0].outdoorDetails.locationContact || 'No contact specified'}</div>
                  <div><strong>Weather:</strong> {selectedEvent.shootProjects[0].outdoorDetails.expectedWeatherConditions || 'Sunny / Clear'}</div>
                </div>
              )}

              {/* Reserved Equipment & Assigned Staff Summary */}
              {(selectedEvent.assignedStaff || selectedEvent.shootProjects?.[0]?.equipmentReservations?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[11px]">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Lead Assigned Staff:</span>
                    <strong className="text-slate-800">{selectedEvent.assignedStaff?.name || selectedEvent.createdBy?.name || 'Assigned Crew'}</strong>
                  </div>
                  {selectedEvent.shootProjects?.[0]?.equipmentReservations?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Reserved Equipment:</span>
                      <span className="text-purple-700 font-bold">{selectedEvent.shootProjects[0].equipmentReservations.map((r: any) => r.equipment?.name || 'Item').join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Creative Asset Link */}
              {selectedEvent.creativePreviewUrl && (
                <div className="flex items-center justify-between p-2 bg-indigo-50/80 rounded-lg border border-indigo-200">
                  <span className="text-[11px] font-mono text-indigo-900 truncate max-w-sm">
                    {selectedEvent.creativeAssetName || selectedEvent.creativePreviewUrl}
                  </span>
                  <a
                    href={selectedEvent.creativePreviewUrl.startsWith('http') ? selectedEvent.creativePreviewUrl : `https://${selectedEvent.creativePreviewUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold text-[10px] flex items-center gap-1 shrink-0"
                  >
                    Open Asset <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Editable Review Settings inside Decision Modal */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Final Approval Deadline &amp; Priority Overrides
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Approval Deadline
                  </label>
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Event Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
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
              <label className="text-xs font-bold text-slate-700">
                {reviewModalAction === 'APPROVE'
                  ? 'Sign-Off Approval Note (Optional):'
                  : 'Mandatory Client Feedback / Change Instructions:'}
              </label>
              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  reviewModalAction === 'REQUEST_CHANGES'
                    ? 'e.g. Please update caption to include new offer details and replace the hero image.'
                    : reviewModalAction === 'REJECT'
                    ? 'e.g. This campaign angle is no longer aligned with brand positioning.'
                    : 'Optional sign-off approval comment...'
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setReviewModalAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                disabled={submittingReview}
                onClick={handleConfirmReviewAction}
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

      {/* Side-by-Side Field Comparison Modal for Edit Requests */}
      {selectedEditRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase font-bold">
                    EDIT REQUEST • {selectedEditRequest.calendarEvent?.eventId || `EVT-${selectedEditRequest.calendarEventId.substring(0, 6).toUpperCase()}`}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                    {selectedEditRequest.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{selectedEditRequest.calendarEvent?.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requested By: <strong className="text-slate-800">{selectedEditRequest.requestedBy?.name || 'Media Manager'}</strong> ({selectedEditRequest.requestedBy?.role}) • Date: <span className="text-amber-800">{new Date(selectedEditRequest.createdAt).toLocaleString()}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedEditRequest(null)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedEditRequest.reason && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Request Reason / Justification:</span>
                <p className="text-amber-900 font-medium italic">"{selectedEditRequest.reason}"</p>
              </div>
            )}

            {/* Side-by-Side Field Comparison Table */}
            {(() => {
              const originalObj = typeof selectedEditRequest.originalValues === 'string' ? JSON.parse(selectedEditRequest.originalValues || '{}') : (selectedEditRequest.originalValues || {});
              const requestedObj = typeof selectedEditRequest.requestedValues === 'string' ? JSON.parse(selectedEditRequest.requestedValues || '{}') : (selectedEditRequest.requestedValues || {});
              const allKeys = Array.from(new Set([...Object.keys(originalObj), ...Object.keys(requestedObj)]));

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Side-by-Side Field Diff Comparison</span>
                    <span className="text-[10px] text-amber-600 font-mono">* Highlighted rows indicate requested modifications</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                          <th className="p-3 w-1/4">FIELD</th>
                          <th className="p-3 w-3/8 text-slate-700">ORIGINAL VALUE (LIVE)</th>
                          <th className="p-3 w-3/8 text-emerald-600">REQUESTED VALUE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60 font-mono">
                        {allKeys.map((key) => {
                          const origVal = originalObj[key];
                          const reqVal = requestedObj[key];
                          const isDifferent = JSON.stringify(origVal) !== JSON.stringify(reqVal);

                          return (
                            <tr key={key} className={isDifferent ? 'bg-amber-50' : 'bg-slate-50/40 opacity-70'}>
                              <td className="p-3 font-bold text-slate-700 capitalize font-sans">{key.replace(/([A-Z])/g, ' $1')}</td>
                              <td className="p-3 text-slate-500 truncate max-w-xs">{origVal !== undefined && origVal !== null ? String(origVal) : <span className="text-gray-600 italic">None</span>}</td>
                              <td className="p-3">
                                {isDifferent ? (
                                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 block truncate max-w-xs">
                                    {reqVal !== undefined && reqVal !== null ? String(reqVal) : <span className="text-gray-600 italic">None</span>}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">{reqVal !== undefined && reqVal !== null ? String(reqVal) : <span className="text-gray-600 italic">Unchanged</span>}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Decision Note / Comment Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Marketing Manager Decision Note / Rejection Reason / Change Instructions:
              </label>
              <textarea
                rows={2}
                value={editRequestComment}
                onChange={(e) => setEditRequestComment(e.target.value)}
                placeholder="Enter review notes, feedback instructions, or approval comments..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <button
                onClick={() => setSelectedEditRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!editRequestComment.trim()) {
                      alert('Rejection reason is required.');
                      return;
                    }
                    try {
                      await fetchApi(`/calendar/edit-requests/${selectedEditRequest.id}/reject`, {
                        method: 'POST',
                        body: JSON.stringify({ reason: editRequestComment }),
                      });
                      alert('Edit Request Rejected. Original event remains unchanged.');
                      setSelectedEditRequest(null);
                      setEditRequestComment('');
                      loadClientData();
                    } catch (err: any) {
                      alert(err.message || 'Failed to reject edit request');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20"
                >
                  Reject Changes
                </button>

                <button
                  onClick={async () => {
                    try {
                      await fetchApi(`/calendar/edit-requests/${selectedEditRequest.id}/approve`, {
                        method: 'POST',
                        body: JSON.stringify({ reviewComment: editRequestComment }),
                      });
                      alert('Edit Request Approved!\n\nOriginal Media Calendar Event has been updated in-place (same ID preserved), audit log & timeline recorded.');
                      setSelectedEditRequest(null);
                      setEditRequestComment('');
                      loadClientData();
                    } catch (err: any) {
                      alert(err.message || 'Failed to approve edit request');
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20"
                >
                  Approve Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
