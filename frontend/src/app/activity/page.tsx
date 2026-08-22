'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import {
  Activity,
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  User,
  Film,
  Tag,
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
  RotateCcw,
  Lock,
  Layers,
  Sparkles,
  Mail,
  MessageSquare,
  Radio,
  Smartphone,
  Share2,
  Hash,
  Send,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { RouteGuard } from '@/components/common/RouteGuard';

export default function ActivityPage() {
  return (
    <RouteGuard module="ACTIVITY_LOGS">
      <ActivityContent />
    </RouteGuard>
  );
}

function ActivityContent() {
  const [history, setHistory] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Multi-Channel Delivery State
  const [showChannelsModal, setShowChannelsModal] = useState(false);
  const [channelsOverview, setChannelsOverview] = useState<any>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  // Available metadata lists for dropdowns
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  // Search & Filter Dimensions
  const [searchTitle, setSearchTitle] = useState('');
  const [searchType, setSearchType] = useState('ALL');
  const [searchProject, setSearchProject] = useState('ALL');
  const [searchEmployee, setSearchEmployee] = useState('ALL');
  const [searchModule, setSearchModule] = useState('ALL');
  const [searchDate, setSearchDate] = useState('');

  // Additional Audit Attributes
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const loadMetadata = async () => {
    try {
      const [projRes, capRes] = await Promise.all([
        fetchApi('/projects').catch(() => []),
        fetchApi('/tasks/capacity/overview').catch(() => []),
      ]);
      setProjectsList(Array.isArray(projRes) ? projRes : projRes?.projects || []);
      setEmployeesList(Array.isArray(capRes) ? capRes : []);
    } catch (err) {
      console.error('Failed to load activity center metadata:', err);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTitle.trim()) params.append('title', searchTitle.trim());
      if (searchType !== 'ALL') params.append('category', searchType);
      if (searchProject !== 'ALL') params.append('projectId', searchProject);
      if (searchEmployee !== 'ALL') params.append('employeeId', searchEmployee);
      if (searchModule !== 'ALL') params.append('entityType', searchModule);
      if (searchDate) params.append('date', searchDate);
      if (selectedPriority !== 'ALL') params.append('priority', selectedPriority);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);

      const res = await fetchApi(`/notifications/activity-history?${params.toString()}`);
      if (res && res.history) {
        setHistory(res.history);
        setTotalCount(res.total);
      } else if (Array.isArray(res)) {
        setHistory(res);
        setTotalCount(res.length);
      }
    } catch (err) {
      console.error('Failed to load activity history:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const res = await fetchApi('/notifications/channels');
      setChannelsOverview(res);
    } catch (err) {
      console.error('Failed to load notification channels:', err);
    }
  };

  const handleTestChannel = async (channel: string) => {
    try {
      setTestingChannel(channel);
      setTestResult(null);
      const res = await fetchApi('/notifications/channels/test', {
        method: 'POST',
        body: JSON.stringify({ channel }),
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        channel,
        success: false,
        status: 'FAILED',
        error: err.message || 'Channel test failed',
      });
    } finally {
      setTestingChannel(null);
    }
  };

  useEffect(() => {
    loadMetadata();
    loadChannels();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTitle, searchType, searchProject, searchEmployee, searchModule, searchDate, selectedPriority, selectedStatus]);

  const handleResetFilters = () => {
    setSearchTitle('');
    setSearchType('ALL');
    setSearchProject('ALL');
    setSearchEmployee('ALL');
    setSearchModule('ALL');
    setSearchDate('');
    setSelectedPriority('ALL');
    setSelectedStatus('ALL');
  };

  const hasActiveFilters =
    searchTitle.trim() !== '' ||
    searchType !== 'ALL' ||
    searchProject !== 'ALL' ||
    searchEmployee !== 'ALL' ||
    searchModule !== 'ALL' ||
    searchDate !== '' ||
    selectedPriority !== 'ALL' ||
    selectedStatus !== 'ALL';

  return (
    <div className="space-y-6 text-xs">
      {/* Header Banner */}
      <div className="bg-card border border-border p-6 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Permanent Activity & Notification History</h1>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono">
              <Lock className="w-3 h-3" /> IMMUTABLE AUDIT RETENTION
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Every notification becomes part of the permanent activity history. Search across Title, Notification Type, Related Project, Employee, and Date.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <button
            onClick={() => {
              loadChannels();
              setShowChannelsModal(true);
            }}
            className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <Zap className="w-4 h-4 text-purple-400" />
            <span>Delivery Channels Hub (6 Channels)</span>
          </button>

          <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-800 px-3.5 py-2 rounded-lg text-gray-300 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Total Audit Records: <strong className="text-white">{totalCount}</strong></span>
          </div>
        </div>
      </div>

      {/* 5-Dimensional Search & Filtering Command Center */}
      <div className="bg-card border border-border p-5 rounded-xl space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 font-bold text-white text-xs uppercase tracking-wider">
            <Filter className="w-4 h-4 text-blue-400" /> Search Activity History
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Dimension 1: Notification Title */}
          <div className="space-y-1">
            <label className="text-[11px] text-gray-300 font-semibold flex items-center gap-1">
              <Search className="w-3 h-3 text-blue-400" /> Title
            </label>
            <input
              type="text"
              placeholder="Search title..."
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 placeholder-gray-500"
            />
          </div>

          {/* Dimension 2: Notification Type / Category */}
          <div className="space-y-1">
            <label className="text-[11px] text-gray-300 font-semibold flex items-center gap-1">
              <Tag className="w-3 h-3 text-purple-400" /> Type
            </label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="INFORMATION">Information</option>
              <option value="TASK_ASSIGNMENT">Task Assignment</option>
              <option value="REMINDER">Reminder</option>
              <option value="APPROVAL_REQUEST">Approval Request</option>
              <option value="APPROVAL_COMPLETED">Approval Completed</option>
              <option value="REVISION_REQUEST">Revision Request</option>
              <option value="DEADLINE_REMINDER">Deadline Reminder</option>
              <option value="EQUIPMENT_REQUEST">Equipment Request</option>
              <option value="EQUIPMENT_APPROVAL">Equipment Approval</option>
              <option value="EQUIPMENT_RETURN_REMINDER">Equipment Return Due</option>
              <option value="ATTENDANCE_REMINDER">Attendance Reminder</option>
              <option value="ANNOUNCEMENT">Announcement</option>
              <option value="WARNING">Warning</option>
              <option value="SYSTEM_NOTIFICATION">System Notification</option>
            </select>
          </div>

          {/* Dimension 3: Related Module */}
          <div className="space-y-1">
            <label className="text-[11px] text-gray-300 font-semibold flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" /> Related Module
            </label>
            <select
              value={searchModule}
              onChange={(e) => setSearchModule(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Modules</option>
              <option value="PROJECT">Projects</option>
              <option value="TASK">Tasks</option>
              <option value="SCRIPT">Scripts</option>
              <option value="GRAPHIC_REQUIREMENT">Graphic Reqs</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="ATTENDANCE">Attendance</option>
              <option value="CALENDAR_EVENT">Media Calendar</option>
              <option value="APPROVAL">Approvals</option>
              <option value="COMMUNICATION">Communication</option>
              <option value="SYSTEM">System Alerts</option>
            </select>
          </div>

          {/* Dimension 4: Related Project */}
          <div className="space-y-1">
            <label className="text-[11px] text-gray-300 font-semibold flex items-center gap-1">
              <Film className="w-3 h-3 text-emerald-400" /> Project
            </label>
            <select
              value={searchProject}
              onChange={(e) => setSearchProject(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Projects</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectId || p.name} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dimension 5: Employee */}
          <div className="space-y-1">
            <label className="text-[11px] text-gray-300 font-semibold flex items-center gap-1">
              <User className="w-3 h-3 text-cyan-400" /> Employee
            </label>
            <select
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Employees</option>
              {employeesList.map((emp) => (
                <option key={emp.userId} value={emp.userId}>
                  {emp.userName} ({emp.department || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {/* Dimension 6: Date */}
          <div className="space-y-1">
            <label className="text-[11px] text-gray-300 font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" /> Date
            </label>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/60 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Priority:</span>
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                  selectedPriority === p
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Status:</span>
            {(['ALL', 'UNREAD', 'READ', 'ARCHIVED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                  selectedStatus === s
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                    : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit History Records Table */}
      {loading ? (
        <div className="p-8 text-center text-gray-400 bg-card border border-border rounded-xl">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Searching Permanent Activity Records...
        </div>
      ) : history.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-card border border-border rounded-xl space-y-2">
          <Activity className="w-8 h-8 mx-auto text-gray-600" />
          <p className="font-semibold text-gray-300">No activity history records match your search criteria.</p>
          <p className="text-[11px] text-gray-500">Try adjusting the title, type, project, employee, or date filter.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/80 border-b border-border text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="p-3.5">Notification Title & Type</th>
                  <th className="p-3.5">Related Project / Entity</th>
                  <th className="p-3.5">Employee (Recipient)</th>
                  <th className="p-3.5">Creation Time</th>
                  <th className="p-3.5">Delivery Time</th>
                  <th className="p-3.5">Read Time & Reader</th>
                  <th className="p-3.5 text-right">Priority / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {history.map((item) => {
                  const pUpper = (item.priority || 'MEDIUM').toUpperCase();
                  const isCrit = pUpper === 'CRITICAL';
                  const isHigh = pUpper === 'HIGH';

                  return (
                    <tr key={item.id} className="hover:bg-gray-900/40 transition-colors">
                      {/* Notification Title & Type */}
                      <td className="p-3.5 max-w-xs">
                        <div className="font-bold text-gray-200 text-xs flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {item.linkUrl && (
                            <Link href={item.linkUrl} className="text-blue-400 hover:text-blue-300">
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{item.message}</p>
                        <span className="inline-block text-[9px] font-mono text-purple-300 bg-purple-950/40 border border-purple-800/60 px-1.5 py-0.2 rounded mt-1">
                          {item.category?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Related Project / Entity */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-gray-200 text-[11px]">
                          {item.relatedEntity?.code || 'SYSTEM'}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {item.relatedEntity?.type?.replace(/_/g, ' ')}
                        </div>
                      </td>

                      {/* Employee (Recipient) */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-gray-200 text-[11px] flex items-center gap-1">
                          <User className="w-3 h-3 text-cyan-400" />
                          <span>{item.recipient?.name}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono pl-4">{item.recipient?.role?.replace(/_/g, ' ')}</div>
                      </td>

                      {/* Creation Time */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[10px] text-gray-300">
                        {item.creationTime ? new Date(item.creationTime).toLocaleString() : '—'}
                      </td>

                      {/* Delivery Time */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[10px] text-emerald-400">
                        {item.deliveryTime ? new Date(item.deliveryTime).toLocaleString() : '—'}
                      </td>

                      {/* Read Time & Reader */}
                      <td className="p-3.5 whitespace-nowrap">
                        {item.readTime ? (
                          <div>
                            <div className="text-blue-400 font-mono text-[10px] flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {new Date(item.readTime).toLocaleString()}
                            </div>
                            <div className="text-[9px] text-gray-400 font-mono">
                              By: {item.readBy?.name || item.recipient?.name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono italic">Unread</span>
                        )}
                      </td>

                      {/* Priority / Status */}
                      <td className="p-3.5 whitespace-nowrap text-right space-y-1">
                        <div>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-black border font-mono uppercase ${
                              isCrit
                                ? 'bg-red-600 text-white border-red-500'
                                : isHigh
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}
                          >
                            {pUpper}
                          </span>
                        </div>
                        <div>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                              item.status === 'UNREAD'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                : item.status === 'ARCHIVED'
                                ? 'bg-gray-800 text-gray-400 border border-gray-700'
                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi-Channel Delivery Management Hub Modal */}
      {showChannelsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-gray-900/60">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                <div>
                  <h2 className="text-base font-bold text-white">Multi-Channel Notification Delivery Framework</h2>
                  <p className="text-[11px] text-gray-400">
                    Comprehensive multi-channel dispatcher supporting In-App, Email, Web Push, Mobile Native Push, WhatsApp, Microsoft Teams, and Slack.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChannelsModal(false);
                  setTestResult(null);
                }}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Test Result Toast */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-red-950/40 border-red-500/50 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold">Test Dispatch: {testResult.channel}</span>
                      <p className="text-[11px] opacity-80">
                        {testResult.success
                          ? `Successfully delivered via ${testResult.debugInfo?.provider || 'Gateway'}. Message ID: ${testResult.providerMessageId}`
                          : `Delivery failed: ${testResult.error}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTestResult(null)}
                    className="text-gray-400 hover:text-white text-[11px] font-bold"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Supported Delivery Channels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. EMAIL */}
                <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-xs">Email Delivery</h3>
                        <span className="text-[10px] text-gray-400 font-mono">SMTP / SES / SendGrid</span>
                      </div>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold font-mono">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Transactional HTML emails with action buttons, daily operations digests, and critical blocker alerts.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                    <span className="text-[10px] text-gray-500 font-mono">Audience: All Staff & External</span>
                    <button
                      disabled={testingChannel === 'EMAIL'}
                      onClick={() => handleTestChannel('EMAIL')}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      {testingChannel === 'EMAIL' ? 'Testing...' : 'Test Send'}
                    </button>
                  </div>
                </div>

                {/* 2. PUSH NOTIFICATIONS */}
                <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-xs">Push Notifications</h3>
                        <span className="text-[10px] text-gray-400 font-mono">Web Push (VAPID / FCM)</span>
                      </div>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold font-mono">
                      READY
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Real-time browser notifications delivering updates when browser is minimized or tab is in background.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                    <span className="text-[10px] text-gray-500 font-mono">Audience: Active Web Clients</span>
                    <button
                      disabled={testingChannel === 'PUSH_NOTIFICATIONS'}
                      onClick={() => handleTestChannel('PUSH_NOTIFICATIONS')}
                      className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      {testingChannel === 'PUSH_NOTIFICATIONS' ? 'Testing...' : 'Test Send'}
                    </button>
                  </div>
                </div>

                {/* 3. MOBILE APPLICATION */}
                <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-xs">Mobile Application</h3>
                        <span className="text-[10px] text-gray-400 font-mono">iOS APNs & Android FCM</span>
                      </div>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold font-mono">
                      READY
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Native mobile app push alerts with deep-link navigation directly into specific tasks, scripts, or equipment.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                    <span className="text-[10px] text-gray-500 font-mono">Audience: Field Crew & Mobile Staff</span>
                    <button
                      disabled={testingChannel === 'MOBILE_APPLICATION'}
                      onClick={() => handleTestChannel('MOBILE_APPLICATION')}
                      className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      {testingChannel === 'MOBILE_APPLICATION' ? 'Testing...' : 'Test Send'}
                    </button>
                  </div>
                </div>

                {/* 4. WHATSAPP */}
                <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-xs">WhatsApp Business API</h3>
                        <span className="text-[10px] text-gray-400 font-mono">Meta Cloud API / Twilio</span>
                      </div>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold font-mono">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Direct instant messaging dispatch for shoot crew schedules, location updates, and emergency alerts.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                    <span className="text-[10px] text-gray-500 font-mono">Audience: Shoot Crew & On-Location</span>
                    <button
                      disabled={testingChannel === 'WHATSAPP'}
                      onClick={() => handleTestChannel('WHATSAPP')}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      {testingChannel === 'WHATSAPP' ? 'Testing...' : 'Test Send'}
                    </button>
                  </div>
                </div>

                {/* 5. MICROSOFT TEAMS */}
                <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-xs">Microsoft Teams</h3>
                        <span className="text-[10px] text-gray-400 font-mono">Adaptive Cards & Bot API</span>
                      </div>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold font-mono">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Interactive Adaptive Cards with embedded approve/reject buttons and direct links to pending reviews.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                    <span className="text-[10px] text-gray-500 font-mono">Audience: Department Teams & PMs</span>
                    <button
                      disabled={testingChannel === 'MICROSOFT_TEAMS'}
                      onClick={() => handleTestChannel('MICROSOFT_TEAMS')}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      {testingChannel === 'MICROSOFT_TEAMS' ? 'Testing...' : 'Test Send'}
                    </button>
                  </div>
                </div>

                {/* 6. SLACK */}
                <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg">
                        <Hash className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-xs">Slack Channels & DMs</h3>
                        <span className="text-[10px] text-gray-400 font-mono">Block Kit & Webhooks</span>
                      </div>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold font-mono">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Rich Block Kit messages posted to dedicated channels (#studio-ops, #renders, #blockers) and direct DMs.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                    <span className="text-[10px] text-gray-500 font-mono">Audience: Post-Production & Editors</span>
                    <button
                      disabled={testingChannel === 'SLACK'}
                      onClick={() => handleTestChannel('SLACK')}
                      className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      {testingChannel === 'SLACK' ? 'Testing...' : 'Test Send'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-gray-900/60 text-xs">
              <span className="text-[11px] text-gray-400">
                All 6 channels integrate seamlessly with MOMS automated priority dispatch router.
              </span>
              <button
                onClick={() => {
                  setShowChannelsModal(false);
                  setTestResult(null);
                }}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
