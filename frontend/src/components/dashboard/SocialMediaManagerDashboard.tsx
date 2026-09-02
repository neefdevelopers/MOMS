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
  const pendingClient = events.filter((e) => e.status === 'PENDING_CLIENT_APPROVAL' || e.status === 'PENDING_CLIENT_REVIEW');
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
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950 to-slate-900 border border-blue-500/20 p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Social Media Manager Workspace
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Media Calendar & Client Approval Hub
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">
              Create calendar events, manage drafts, submit content for client sign-off, address revision feedback, and track approved posts.
            </p>
          </div>

          <Link
            href="/calendar"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Calendar Event
          </Link>
        </div>
      </div>

      {/* Action Required Alert (Changes Requested by Client) */}
      {changesRequested.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">Client Feedback Pending Revision ({changesRequested.length})</h4>
              <p className="text-xs text-amber-200/80">
                The Marketing Manager has requested revisions on {changesRequested.length} calendar event(s). Please review feedback and resubmit.
              </p>
            </div>
          </div>
          <Link
            href="/calendar?status=CHANGES_REQUESTED"
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0"
          >
            View Revisions
          </Link>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Drafts</span>
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{drafts.length}</span>
            <span className="text-xs text-gray-400">In Preparation</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Pending Review</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{pendingClient.length}</span>
            <span className="text-xs text-amber-400 font-medium">Awaiting Client</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-orange-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Changes Requested</span>
            <RotateCcw className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{changesRequested.length}</span>
            <span className="text-xs text-orange-400 font-medium">Action Required</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Client Approved</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{clientApproved.length}</span>
            <span className="text-xs text-emerald-400 font-medium">Ready to Schedule</span>
          </div>
        </div>

        <Link href="/equipment" className="p-4 rounded-xl bg-card border border-border hover:border-cyan-500/50 space-y-2 transition-all group">
          <div className="flex items-center justify-between text-cyan-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">My Equipment</span>
            <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-300">My Assets</span>
            <span className="text-xs text-cyan-400 font-medium flex items-center gap-0.5">
              Assigned Gear <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/attendance" className="p-4 rounded-xl bg-card border border-border hover:border-emerald-500/50 space-y-2 transition-all group">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">My Attendance</span>
            <UserCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-300">My Log</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-0.5">
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
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-400" />
              Client Revision Requests ({changesRequested.length})
            </h3>
          </div>

          {changesRequested.length === 0 ? (
            <div className="p-6 rounded-xl bg-card border border-border text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs text-gray-400">No events currently require client revisions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {changesRequested.map((event) => {
                const lastHistory = event.approvalHistory?.[0];
                return (
                  <div key={event.id} className="p-4 rounded-xl bg-card border border-amber-500/30 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                            {event.eventId || 'CAL-EVENT'}
                          </span>
                          <span className="text-xs text-gray-400">{event.client?.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-300 font-mono">v{event.version}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{event.title}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
                          <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Created by: <strong className="text-gray-200">{event.createdBy?.name || 'Social Media Manager'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {lastHistory?.comment && (
                      <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                        <span className="font-bold text-amber-400 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Client Feedback:
                        </span>
                        <p className="italic">"{lastHistory.comment}"</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                      <Link
                        href={`/calendar?editId=${event.id}`}
                        className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Edit Content & Creative
                      </Link>
                      <button
                        onClick={() => handleSubmitForApproval(event.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
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
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Draft Events Ready to Submit ({drafts.length})
            </h3>
          </div>

          {drafts.length === 0 ? (
            <div className="p-6 rounded-xl bg-card border border-border text-center space-y-2">
              <FileText className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-xs text-gray-400">No draft events found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((event) => (
                <div key={event.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-bold">
                          {event.eventId || 'CAL-EVENT'}
                        </span>
                        <span className="text-xs text-gray-400">{event.client?.name}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{event.title}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
                        <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Created by: <strong className="text-gray-200">{event.createdBy?.name || 'Social Media Manager'}</strong></span>
                      </div>
                    </div>

                    <span className="text-[11px] text-gray-400">
                      {new Date(event.shootDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                    <Link
                      href={`/calendar?editId=${event.id}`}
                      className="text-xs font-medium text-gray-400 hover:text-white"
                    >
                      Edit Draft
                    </Link>

                    <button
                      onClick={() => handleSubmitForApproval(event.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
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
