'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import {
  Bell,
  BellOff,
  Search,
  Check,
  CheckCheck,
  Filter,
  RotateCcw,
  CheckSquare,
  CheckCircle2,
  AlertTriangle,
  RotateCcw as RevisionIcon,
  Calendar,
  Camera,
  UserCheck,
  Megaphone,
  Settings,
  Info,
  Clock,
  ExternalLink,
  Layers,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NotificationCategoryCode,
  NotificationPriorityCode,
  formatRelativeTime,
  getNotificationActionLabel,
  getNotificationNavigationUrl,
} from '@/utils/notificationCategories';
import { NotificationDetailModal } from '@/components/notifications/NotificationDetailModal';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Selected Notification for Detail Modal
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      params.append('take', '100');

      const res = await fetchApi(`/notifications?${params.toString()}`);
      setNotifications(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, statusFilter, categoryFilter, priorityFilter]);

  // Listen to global notifications updated event
  useEffect(() => {
    const handleUpdate = () => {
      loadNotifications();
    };
    window.addEventListener('moms:notifications-updated', handleUpdate);
    return () => window.removeEventListener('moms:notifications-updated', handleUpdate);
  }, [statusFilter, categoryFilter, priorityFilter]);

  const handleMarkAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, status: 'READ' } : n))
      );
      if (selectedNotification?.id === id) {
        setSelectedNotification((prev: any) =>
          prev ? { ...prev, isRead: true, status: 'READ' } : null
        );
      }

      await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
      window.dispatchEvent(new CustomEvent('moms:notifications-updated'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, status: 'READ' }))
      );

      await fetchApi('/notifications/read-all', { method: 'PATCH' });
      window.dispatchEvent(new CustomEvent('moms:notifications-updated'));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(
    (n) => n.status === 'UNREAD' || !n.isRead
  ).length;

  const filteredNotifications = notifications.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) ||
      n.message?.toLowerCase().includes(q) ||
      n.entityCode?.toLowerCase().includes(q) ||
      n.entityType?.toLowerCase().includes(q) ||
      n.category?.toLowerCase().includes(q)
    );
  });

  const getCategoryIcon = (catCode: string) => {
    switch (catCode) {
      case 'TASK_ASSIGNMENT':
        return <CheckSquare className="w-4 h-4 text-cyan-600" />;
      case 'APPROVAL_REQUEST':
      case 'APPROVAL_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'REVISION_REQUEST':
        return <RevisionIcon className="w-4 h-4 text-amber-600" />;
      case 'DEADLINE_REMINDER':
        return <Calendar className="w-4 h-4 text-rose-600" />;
      case 'EQUIPMENT_REQUEST':
      case 'EQUIPMENT_APPROVAL':
      case 'EQUIPMENT_RETURN_REMINDER':
        return <Camera className="w-4 h-4 text-teal-600" />;
      case 'ATTENDANCE_REMINDER':
        return <UserCheck className="w-4 h-4 text-amber-600" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-4 h-4 text-purple-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'SYSTEM_NOTIFICATION':
        return <Settings className="w-4 h-4 text-slate-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 text-slate-900">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Real-time activity notifications, assignment alerts, approval updates, and workflow reminders.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{markingAll ? 'Updating...' : 'Mark all as read'}</span>
            </button>
          )}

          <button
            onClick={() => loadNotifications()}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-colors"
            title="Refresh notifications"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search notifications by title, message, ID or entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('UNREAD')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'UNREAD'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setStatusFilter('READ')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'READ'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Read
            </button>
            <button
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ARCHIVED'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Category:
          </span>
          {[
            { key: 'ALL', label: 'All Categories' },
            { key: 'TASK_ASSIGNMENT', label: 'Tasks' },
            { key: 'APPROVAL_REQUEST', label: 'Approvals' },
            { key: 'REVISION_REQUEST', label: 'Revisions' },
            { key: 'DEADLINE_REMINDER', label: 'Deadlines' },
            { key: 'EQUIPMENT_REQUEST', label: 'Equipment' },
            { key: 'ANNOUNCEMENT', label: 'Announcements' },
            { key: 'WARNING', label: 'Warnings' },
            { key: 'SYSTEM_NOTIFICATION', label: 'System' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors border ${
                categoryFilter === cat.key
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs font-medium">Loading notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty State */
          <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <BellOff className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No notifications</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No notifications found matching "${searchQuery}".`
                  : statusFilter === 'UNREAD'
                  ? "You're all caught up! No unread notifications."
                  : 'You have no notifications in this category.'}
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const catCode = (n.category || 'INFORMATION') as NotificationCategoryCode;
            const catMeta = NOTIFICATION_CATEGORIES[catCode] || NOTIFICATION_CATEGORIES.INFORMATION;

            const priorityCode = (n.priority || 'MEDIUM').toUpperCase() as NotificationPriorityCode;
            const prioMeta = NOTIFICATION_PRIORITIES[priorityCode] || NOTIFICATION_PRIORITIES.MEDIUM;

            const isUnread = n.status === 'UNREAD' || !n.isRead;
            const isCritical = priorityCode === 'CRITICAL';
            const actionLabel = getNotificationActionLabel(n.entityType, n.eventType, n.category);
            const actionUrl = getNotificationNavigationUrl(n.linkUrl, n.entityType, n.entityId, n.eventType);
            const relativeTime = formatRelativeTime(n.createdAt);

            return (
              <div
                key={n.id}
                onClick={() => {
                  setSelectedNotification(n);
                  if (isUnread) {
                    handleMarkAsRead(n.id);
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isUnread
                    ? isCritical
                      ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300 shadow-xs'
                      : 'bg-blue-50/40 border-blue-200 hover:border-blue-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Category Icon */}
                  <div
                    className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                      isUnread
                        ? 'bg-white border-blue-200 shadow-xs'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {getCategoryIcon(catCode)}
                  </div>

                  {/* Main Content */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catMeta.badgeClass}`}>
                        {catMeta.label}
                      </span>
                      {priorityCode !== 'LOW' && priorityCode !== 'MEDIUM' && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${prioMeta.badgeClass}`}>
                          {prioMeta.label}
                        </span>
                      )}
                      {n.entityCode && (
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {n.entityCode}
                        </span>
                      )}
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
                      )}
                    </div>

                    <h4
                      className={`text-sm font-bold tracking-tight ${
                        isUnread ? 'text-slate-900 font-extrabold' : 'text-slate-800 font-semibold'
                      }`}
                    >
                      {n.title}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {relativeTime}
                      </span>
                      {n.entityType && (
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {n.entityType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side Actions */}
                <div
                  className="flex items-center gap-2 self-end sm:self-center shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNotification(n);
                      if (isUnread) {
                        handleMarkAsRead(n.id);
                      }
                    }}
                    className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 border border-slate-200 transition-colors text-xs font-semibold flex items-center gap-1.5"
                    title="View details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Details</span>
                  </button>

                  {actionUrl && actionUrl !== '#' && (
                    <Link
                      href={actionUrl}
                      onClick={() => {
                        if (isUnread) {
                          handleMarkAsRead(n.id);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <span>{actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detailed Notification Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        onMarkRead={handleMarkAsRead}
      />
    </div>
  );
}
