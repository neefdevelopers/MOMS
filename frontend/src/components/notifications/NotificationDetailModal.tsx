'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  Bell,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CheckSquare,
  Camera,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Megaphone,
  Info,
  Settings,
  UserCheck,
  CornerDownLeft,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NotificationCategoryCode,
  NotificationPriorityCode,
  getNotificationActionLabel,
  getNotificationNavigationUrl,
} from '@/utils/notificationCategories';

interface NotificationDetailModalProps {
  notification: any | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkRead?: (id: string) => void;
}

export function NotificationDetailModal({
  notification,
  isOpen,
  onClose,
  onMarkRead,
}: NotificationDetailModalProps) {
  if (!isOpen || !notification) return null;

  const catCode = (notification.category || 'INFORMATION') as NotificationCategoryCode;
  const catMeta = NOTIFICATION_CATEGORIES[catCode] || NOTIFICATION_CATEGORIES.INFORMATION;

  const priorityCode = (notification.priority || 'MEDIUM').toUpperCase() as NotificationPriorityCode;
  const prioMeta = NOTIFICATION_PRIORITIES[priorityCode] || NOTIFICATION_PRIORITIES.MEDIUM;

  const isUnread = notification.status === 'UNREAD' || !notification.isRead;
  const actionLabel = getNotificationActionLabel(
    notification.entityType,
    notification.eventType,
    notification.category
  );
  const actionUrl = getNotificationNavigationUrl(
    notification.linkUrl,
    notification.entityType,
    notification.entityId,
    notification.eventType
  );

  const getCategoryIcon = () => {
    switch (catCode) {
      case 'TASK_ASSIGNMENT':
        return <CheckSquare className="w-5 h-5 text-cyan-600" />;
      case 'APPROVAL_REQUEST':
      case 'APPROVAL_COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'REVISION_REQUEST':
        return <RotateCcw className="w-5 h-5 text-amber-600" />;
      case 'DEADLINE_REMINDER':
        return <Calendar className="w-5 h-5 text-rose-600" />;
      case 'EQUIPMENT_REQUEST':
      case 'EQUIPMENT_APPROVAL':
      case 'EQUIPMENT_RETURN_REMINDER':
        return <Camera className="w-5 h-5 text-teal-600" />;
      case 'ATTENDANCE_REMINDER':
        return <UserCheck className="w-5 h-5 text-amber-600" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-5 h-5 text-purple-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'SYSTEM_NOTIFICATION':
        return <Settings className="w-5 h-5 text-slate-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const formattedDate = notification.createdAt
    ? new Date(notification.createdAt).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : 'Unknown Date';

  let parsedMetadata: any = null;
  if (notification.metadata) {
    try {
      parsedMetadata = typeof notification.metadata === 'string'
        ? JSON.parse(notification.metadata)
        : notification.metadata;
    } catch {
      parsedMetadata = null;
    }
  }

  const handleActionClick = () => {
    if (isUnread && onMarkRead) {
      onMarkRead(notification.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] text-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0 mt-0.5">
              {getCategoryIcon()}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catMeta.badgeClass}`}>
                  {catMeta.label}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${prioMeta.badgeClass}`}>
                  {prioMeta.label} Priority
                </span>
                {isUnread ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    Unread
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Read
                  </span>
                )}
              </div>
              <h2 id="notification-modal-title" className="text-base font-bold text-slate-900 leading-snug">
                {notification.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Main Description */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap">
            {notification.message}
          </div>

          {/* Metadata & Originating Record Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Originating Entity
              </span>
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>{notification.entityType || 'SYSTEM'}</span>
                {notification.entityCode && (
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {notification.entityCode}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Timestamp
              </span>
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Additional Context Attributes if available */}
          {parsedMetadata && (
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Event Details
              </span>
              <div className="space-y-1 text-slate-700">
                {parsedMetadata.projectName && (
                  <div><strong className="text-slate-900">Project:</strong> {parsedMetadata.projectName}</div>
                )}
                {parsedMetadata.taskTitle && (
                  <div><strong className="text-slate-900">Task:</strong> {parsedMetadata.taskTitle}</div>
                )}
                {parsedMetadata.scriptName && (
                  <div><strong className="text-slate-900">Script:</strong> {parsedMetadata.scriptName}</div>
                )}
                {parsedMetadata.assigneeName && (
                  <div><strong className="text-slate-900">Assignee:</strong> {parsedMetadata.assigneeName}</div>
                )}
                {parsedMetadata.rejectionReason && (
                  <div className="text-rose-700"><strong className="text-rose-900">Reason:</strong> {parsedMetadata.rejectionReason}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            {isUnread && onMarkRead && (
              <button
                type="button"
                onClick={() => onMarkRead(notification.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 transition-colors"
              >
                Mark as Read
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Close
            </button>

            {actionUrl && actionUrl !== '#' && (
              <Link
                href={actionUrl}
                onClick={handleActionClick}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>{actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
