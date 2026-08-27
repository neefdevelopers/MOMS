'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  Building2,
  ArrowRight,
  MessageSquare,
  Sparkles,
  FileText,
  Eye,
  Check,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export default function ClientDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClientDashboardData() {
      try {
        const [resEvents, resClients] = await Promise.all([
          fetchApi('/calendar'),
          fetchApi('/clients').catch(() => []),
        ]);
        setEvents(Array.isArray(resEvents) ? resEvents : []);
        setClients(Array.isArray(resClients) ? resClients : []);
      } catch (err) {
        console.error('Error loading client dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClientDashboardData();
  }, []);

  const pendingApprovals = events.filter(
    (e) => e.status === 'PENDING_CLIENT_APPROVAL' || e.status === 'PENDING_CLIENT_REVIEW',
  );
  const approvedEvents = events.filter(
    (e) => e.status === 'APPROVED' || e.status === 'CLIENT_APPROVED' || e.status === 'SCHEDULED' || e.status === 'PUBLISHED',
  );
  const changesRequested = events.filter((e) => e.status === 'CHANGES_REQUESTED');
  const rejectedEvents = events.filter((e) => e.status === 'REJECTED');

  const now = new Date();
  const overdueApprovals = pendingApprovals.filter(
    (e) => e.clientApprovalDeadline && new Date(e.clientApprovalDeadline) < now
  );

  const recentApprovalsAndComments = events
    .flatMap((e) =>
      (e.approvalHistory || []).map((h: any) => ({
        ...h,
        eventTitle: e.title,
        eventId: e.id,
        eventDisplayId: e.eventId || e.id,
        clientName: e.client?.name,
        brandName: e.brand?.name,
      }))
    )
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-400">Loading Client Approval Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/60 via-gray-900 to-slate-900 border border-amber-500/20 p-6 md:p-8 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Client Representative Portal
              </span>
              {clients.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                  <Building2 className="w-3 h-3 text-blue-400" />
                  {c.name}
                </span>
              ))}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Media Calendar Approval Portal
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">
              Review media calendar content, provide brand feedback, request copy/creative revisions, and grant client sign-offs.
            </p>
          </div>

          <Link
            href="/client-review"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            Review Pending Content ({pendingApprovals.length})
          </Link>
        </div>
      </div>

      {/* Overdue Warning Alert Banner */}
      {overdueApprovals.length > 0 && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-300">Approval Deadline Overdue</h4>
              <p className="text-xs text-red-200/80">
                {overdueApprovals.length} calendar event(s) have passed their client review deadline. Please review to avoid publishing delays.
              </p>
            </div>
          </div>
          <Link
            href="/client-review"
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shrink-0"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Pending Review</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{pendingApprovals.length}</span>
            <span className="text-xs text-amber-400 font-medium">Requires Sign-off</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Approved Content</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{approvedEvents.length}</span>
            <span className="text-xs text-emerald-400 font-medium">Ready for Publishing</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-orange-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Changes Requested</span>
            <RotateCcw className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{changesRequested.length}</span>
            <span className="text-xs text-orange-400 font-medium">In Revision</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-red-400">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Rejected Content</span>
            <XCircle className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{rejectedEvents.length}</span>
            <span className="text-xs text-red-400 font-medium">Not Approved</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Client Approval Stream (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Content Awaiting Your Approval ({pendingApprovals.length})
            </h3>
            <Link href="/client-review" className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-border text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">All Caught Up!</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                There are currently no media calendar items pending your client review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((event) => {
                const isOverdue = event.clientApprovalDeadline && new Date(event.clientApprovalDeadline) < new Date();
                return (
                  <div
                    key={event.id}
                    className="p-4 rounded-xl bg-card border border-border hover:border-amber-500/40 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                            {event.eventId || 'CAL-EVENT'}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">{event.brand?.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                            v{event.version}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{event.title}</h4>
                      </div>

                      <div className="text-right shrink-0">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            Scheduled: {new Date(event.shootDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {event.caption && (
                      <p className="text-xs text-gray-300 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/60 italic line-clamp-2">
                        "{event.caption}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-gray-800/60">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Submitted by: <strong className="text-gray-200">{event.createdBy?.name || 'Social Media Manager'}</strong></span>
                      </div>

                      <Link
                        href={`/client-review?eventId=${event.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review & Sign Off
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Client Activity & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Nav Links */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Quick Navigation</h4>
            <div className="space-y-2">
              <Link
                href="/client-review"
                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-xs font-medium text-gray-200 border border-gray-700/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  Client Content Review Portal
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/calendar"
                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-xs font-medium text-gray-200 border border-gray-700/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Full Media Calendar View
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/brands"
                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-xs font-medium text-gray-200 border border-gray-700/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Assigned Brands & Products
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>

          {/* Recent Approval History & Feedback Log */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span>Recent Decision Audit Log</span>
              <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
            </h4>

            {recentApprovalsAndComments.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-2">No review actions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentApprovalsAndComments.map((log: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-300 truncate">{log.eventTitle}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          log.action?.includes('APPROVE')
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : log.action?.includes('REQUEST')
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {log.action?.replace('_', ' ')}
                      </span>
                    </div>

                    {log.comment && (
                      <p className="text-[11px] text-gray-400 italic">"{log.comment}"</p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                      <span>By: {log.user?.name || log.role}</span>
                      <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
