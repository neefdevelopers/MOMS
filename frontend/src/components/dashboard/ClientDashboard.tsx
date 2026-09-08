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

  const loadClientDashboardData = async () => {
    try {
      const [resEvents, resClients] = await Promise.all([
        fetchApi('/calendar').catch(() => []),
        fetchApi('/clients').catch(() => []),
      ]);
      const rawEvents = Array.isArray(resEvents) ? resEvents : (resEvents?.data || resEvents?.events || resEvents?.items || []);
      setEvents(rawEvents);
      setClients(Array.isArray(resClients) ? resClients : []);
    } catch (err) {
      console.error('Error loading client dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 via-white to-amber-50/50 border border-amber-200 p-6 md:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Media Calendar Approval Portal
            </h1>
          </div>

          <Link
            href="/client-review"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-sm transition-all shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            Review Pending Content ({pendingApprovals.length})
          </Link>
        </div>
      </div>

      {/* Overdue Warning Alert Banner */}
      {overdueApprovals.length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-800">Approval Deadline Overdue</h4>
              <p className="text-xs text-red-700">
                {overdueApprovals.length} calendar event(s) have passed their client review deadline. Please review to avoid publishing delays.
              </p>
            </div>
          </div>
          <Link
            href="/client-review"
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 shadow-xs"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{pendingApprovals.length}</span>
            <span className="text-xs text-amber-700 font-medium">Requires Sign-off</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved Content</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{approvedEvents.length}</span>
            <span className="text-xs text-emerald-700 font-medium">Ready for Publishing</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-orange-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Changes Requested</span>
            <RotateCcw className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{changesRequested.length}</span>
            <span className="text-xs text-orange-700 font-medium">In Revision</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rejected Content</span>
            <XCircle className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{rejectedEvents.length}</span>
            <span className="text-xs text-rose-700 font-medium">Not Approved</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Approval Session Stream (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Event Approval Session ({pendingApprovals.length} Pending Sign-Off)
            </h3>
            <Link href="/client-review" className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-8 rounded-xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">All Caught Up!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition-all space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                            {event.eventId || 'CAL-EVENT'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">{event.brand?.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">
                            v{event.version}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                      </div>

                      <div className="text-right shrink-0">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Scheduled: {new Date(event.shootDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {event.caption && (
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic line-clamp-2">
                        "{event.caption}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Submitted by: <strong className="text-slate-800">{event.createdBy?.name || 'Social Media Manager'}</strong></span>
                      </div>

                      <Link
                        href={`/client-review?eventId=${event.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors shadow-xs"
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
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Navigation</h4>
            <div className="space-y-2">
              <Link
                href="/client-review"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-800 border border-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  Event Approval Session
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/calendar"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-800 border border-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Full Media Calendar View
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/brands"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-800 border border-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Assigned Brands & Products
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Recent Approval History & Feedback Log */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Recent Decision Audit Log</span>
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            </h4>

            {recentApprovalsAndComments.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No review actions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentApprovalsAndComments.map((log: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate">{log.eventTitle}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          log.action?.includes('APPROVE')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.action?.includes('REQUEST')
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {log.action?.replace('_', ' ')}
                      </span>
                    </div>

                    {log.comment && (
                      <p className="text-[11px] text-slate-600 italic">"{log.comment}"</p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
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
