'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import {
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Send,
  Eye,
  Building2,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Flame,
  MessageSquare,
  Camera,
  UserCheck,
  User,
} from 'lucide-react';

export default function SocialMediaManagerDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const resEvents = await fetchApi('/calendar');
      const rawEvents = Array.isArray(resEvents) ? resEvents : (resEvents?.data || resEvents?.events || resEvents?.items || []);
      setEvents(rawEvents);
    } catch (err) {
      console.error('Error loading SMM dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const drafts = events.filter((e) => e.status === 'DRAFT');
  const pendingClient = events.filter(
    (e) =>
      e.status === 'PENDING_CLIENT_APPROVAL' ||
      e.status === 'PENDING_CLIENT_REVIEW' ||
      e.status === 'PENDING_MARKETING_APPROVAL' ||
      e.status === 'WAITING_FOR_MARKETING_APPROVAL',
  );
  const changesRequested = events.filter((e) => e.status === 'CHANGES_REQUESTED');
  const clientApproved = events.filter((e) => e.status === 'APPROVED' || e.status === 'CLIENT_APPROVED' || e.status === 'SCHEDULED' || e.status === 'PUBLISHED');

  const handleSubmitForApproval = async (eventId: string) => {
    try {
      await fetchApi(`/calendar/${eventId}/submit`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit event for client review.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-400">Loading Social Media Operations Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">


      {/* Action Required Alert (Changes Requested by Client) */}
      {changesRequested.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 animate-spin-slow text-amber-700" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Client Feedback Pending Revision ({changesRequested.length})</h4>
              <p className="text-xs text-amber-800">
                The Marketing Manager has requested revisions on {changesRequested.length} calendar event(s). Please review feedback and resubmit.
              </p>
            </div>
          </div>
          <Link
            href="/calendar?status=CHANGES_REQUESTED"
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0 shadow-xs"
          >
            View Revisions
          </Link>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Drafts</span>
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{drafts.length}</span>
            <span className="text-xs text-slate-500">In Preparation</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{pendingClient.length}</span>
            <span className="text-xs text-amber-700 font-medium">Awaiting Client</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-orange-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Changes Requested</span>
            <RotateCcw className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{changesRequested.length}</span>
            <span className="text-xs text-orange-700 font-medium">Action Required</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Client Approved</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{clientApproved.length}</span>
            <span className="text-xs text-emerald-700 font-medium">Ready to Schedule</span>
          </div>
        </div>

        <Link href="/equipment" className="p-4 rounded-xl bg-white border border-slate-200 hover:border-cyan-500/50 space-y-2 transition-all group shadow-xs">
          <div className="flex items-center justify-between text-cyan-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">My Equipment</span>
            <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-700">My Assets</span>
            <span className="text-xs text-cyan-700 font-medium flex items-center gap-0.5">
              Assigned Gear <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/attendance" className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500/50 space-y-2 transition-all group shadow-xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">My Attendance</span>
            <UserCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">My Log</span>
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-0.5">
              Log &amp; Register <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Revision Requests Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-600" />
              Client Revision Requests ({changesRequested.length})
            </h3>
          </div>

          {changesRequested.length === 0 ? (
            <div className="p-6 rounded-xl bg-white border border-slate-200 text-center space-y-2 shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-xs text-slate-500">No events currently require client revisions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {changesRequested.map((event) => {
                const lastHistory = event.approvalHistory?.[0];
                return (
                  <div key={event.id} className="p-4 rounded-xl bg-white border border-amber-200 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                            {event.eventId || 'CAL-EVENT'}
                          </span>
                          <span className="text-xs text-slate-500">{event.client?.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">v{event.version}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{event.title}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                          <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Created by: <strong className="text-slate-800">{event.createdBy?.name || 'Social Media Manager'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {lastHistory?.comment && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                        <span className="font-bold text-amber-800 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Client Feedback:
                        </span>
                        <p className="italic">"{lastHistory.comment}"</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <Link
                        href={`/calendar?editId=${event.id}`}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Edit Content & Creative
                      </Link>
                      <button
                        onClick={() => handleSubmitForApproval(event.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
                      >
                        <Send className="w-3 h-3" /> Resubmit to Client
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Draft Events Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Draft Events Ready to Submit ({drafts.length})
            </h3>
          </div>

          {drafts.length === 0 ? (
            <div className="p-6 rounded-xl bg-white border border-slate-200 text-center space-y-2 shadow-xs">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">No draft events found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((event) => (
                <div key={event.id} className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          {event.eventId || 'CAL-EVENT'}
                        </span>
                        <span className="text-xs text-slate-500">{event.client?.name}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{event.title}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                        <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Created by: <strong className="text-slate-800">{event.createdBy?.name || 'Social Media Manager'}</strong></span>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-500">
                      {new Date(event.shootDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Link
                      href={`/calendar?editId=${event.id}`}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      Edit Draft
                    </Link>

                    <button
                      onClick={() => handleSubmitForApproval(event.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors shadow-xs"
                    >
                      <Send className="w-3 h-3" /> Submit for Client Approval
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
