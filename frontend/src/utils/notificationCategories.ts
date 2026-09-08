export type NotificationCategoryCode =
  | 'INFORMATION'
  | 'TASK_ASSIGNMENT'
  | 'REMINDER'
  | 'APPROVAL_REQUEST'
  | 'APPROVAL_COMPLETED'
  | 'REVISION_REQUEST'
  | 'DEADLINE_REMINDER'
  | 'EQUIPMENT_REQUEST'
  | 'EQUIPMENT_APPROVAL'
  | 'EQUIPMENT_RETURN_REMINDER'
  | 'ATTENDANCE_REMINDER'
  | 'ANNOUNCEMENT'
  | 'WARNING'
  | 'SYSTEM_NOTIFICATION';

export interface NotificationCategoryMeta {
  code: NotificationCategoryCode;
  label: string;
  description: string;
  colorClass: string;
  badgeClass: string;
  iconName: string;
}

export const NOTIFICATION_CATEGORIES: Record<NotificationCategoryCode, NotificationCategoryMeta> = {
  INFORMATION: {
    code: 'INFORMATION',
    label: 'Information',
    description: 'General operational updates, notes, and activity status logs',
    colorClass: 'text-blue-700',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    iconName: 'Info',
  },
  TASK_ASSIGNMENT: {
    code: 'TASK_ASSIGNMENT',
    label: 'Task Assignment',
    description: 'New task assignments and manager reassignments',
    colorClass: 'text-cyan-700',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    iconName: 'CheckSquare',
  },
  REMINDER: {
    code: 'REMINDER',
    label: 'Reminder',
    description: 'Scheduled follow-ups and operational action reminders',
    colorClass: 'text-indigo-700',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    iconName: 'Clock',
  },
  APPROVAL_REQUEST: {
    code: 'APPROVAL_REQUEST',
    label: 'Approval Request',
    description: 'Pending sign-off reviews routed to Media or Technical Managers',
    colorClass: 'text-purple-700',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    iconName: 'FileCheck',
  },
  APPROVAL_COMPLETED: {
    code: 'APPROVAL_COMPLETED',
    label: 'Approval Completed',
    description: 'Final sign-off decisions (Approved or Rejected)',
    colorClass: 'text-emerald-700',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconName: 'CheckCircle',
  },
  REVISION_REQUEST: {
    code: 'REVISION_REQUEST',
    label: 'Revision Request',
    description: 'Client or editorial change requests on deliverables or scripts',
    colorClass: 'text-amber-700',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconName: 'RotateCcw',
  },
  DEADLINE_REMINDER: {
    code: 'DEADLINE_REMINDER',
    label: 'Deadline Reminder',
    description: 'Urgent notice for approaching due dates and timeline milestones',
    colorClass: 'text-rose-700',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    iconName: 'Calendar',
  },
  EQUIPMENT_REQUEST: {
    code: 'EQUIPMENT_REQUEST',
    label: 'Equipment Request',
    description: 'Field gear reservations and checkout requests from production crew',
    colorClass: 'text-teal-700',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    iconName: 'Camera',
  },
  EQUIPMENT_APPROVAL: {
    code: 'EQUIPMENT_APPROVAL',
    label: 'Equipment Approval',
    description: 'Equipment reservation approvals and checkout acknowledgements',
    colorClass: 'text-teal-700',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    iconName: 'ShieldCheck',
  },
  EQUIPMENT_RETURN_REMINDER: {
    code: 'EQUIPMENT_RETURN_REMINDER',
    label: 'Equipment Return Reminder',
    description: 'Scheduled gear return inspection and overdue return warnings',
    colorClass: 'text-orange-700',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    iconName: 'CornerDownLeft',
  },
  ATTENDANCE_REMINDER: {
    code: 'ATTENDANCE_REMINDER',
    label: 'Attendance Reminder',
    description: 'Daily check-in cutoff, late arrival notice, or absent logging',
    colorClass: 'text-amber-700',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconName: 'UserCheck',
  },
  ANNOUNCEMENT: {
    code: 'ANNOUNCEMENT',
    label: 'Announcement',
    description: 'Company-wide bulletins, office schedules, and studio alerts',
    colorClass: 'text-purple-700',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    iconName: 'Megaphone',
  },
  WARNING: {
    code: 'WARNING',
    label: 'Warning',
    description: 'Capacity overloads, equipment damage, or unresolved blockers',
    colorClass: 'text-rose-700',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    iconName: 'AlertTriangle',
  },
  SYSTEM_NOTIFICATION: {
    code: 'SYSTEM_NOTIFICATION',
    label: 'System Notification',
    description: 'Platform maintenance, security policies, and configuration updates',
    colorClass: 'text-slate-700',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconName: 'Settings',
  },
};

export const NOTIFICATION_CATEGORY_LIST = Object.values(NOTIFICATION_CATEGORIES);

export type NotificationPriorityCode = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NotificationPriorityMeta {
  code: NotificationPriorityCode;
  label: string;
  badgeClass: string;
  cardBorderClass: string;
  cardBgClass: string;
  pulseIcon: boolean;
  glowEffect: boolean;
  weight: number;
}

export const NOTIFICATION_PRIORITIES: Record<NotificationPriorityCode, NotificationPriorityMeta> = {
  CRITICAL: {
    code: 'CRITICAL',
    label: 'Critical',
    badgeClass: 'bg-rose-50 text-rose-800 font-extrabold border-rose-300 shadow-xs animate-pulse',
    cardBorderClass: 'border-rose-300 hover:border-rose-400 shadow-sm',
    cardBgClass: 'bg-rose-50/50',
    pulseIcon: true,
    glowEffect: true,
    weight: 4,
  },
  HIGH: {
    code: 'HIGH',
    label: 'High',
    badgeClass: 'bg-amber-50 text-amber-800 font-bold border-amber-300 shadow-xs',
    cardBorderClass: 'border-amber-200 hover:border-amber-300',
    cardBgClass: 'bg-amber-50/40',
    pulseIcon: false,
    glowEffect: false,
    weight: 3,
  },
  MEDIUM: {
    code: 'MEDIUM',
    label: 'Medium',
    badgeClass: 'bg-blue-50 text-blue-800 font-medium border-blue-200 shadow-xs',
    cardBorderClass: 'border-slate-200 hover:border-blue-300',
    cardBgClass: 'bg-white',
    pulseIcon: false,
    glowEffect: false,
    weight: 2,
  },
  LOW: {
    code: 'LOW',
    label: 'Low',
    badgeClass: 'bg-slate-50 text-slate-700 font-normal border-slate-200',
    cardBorderClass: 'border-slate-200 hover:border-slate-300',
    cardBgClass: 'bg-white',
    pulseIcon: false,
    glowEffect: false,
    weight: 1,
  },
};

export const NOTIFICATION_PRIORITY_LIST = Object.values(NOTIFICATION_PRIORITIES);

/**
 * Direct Shortcut Navigation Action Label Generator
 * Maps originating entity & event types to precise user-facing action buttons:
 * - Open Project
 * - Open Task
 * - Open Script
 * - Open Equipment Request
 * - Open Approval
 * - Open Graphic Requirement
 * - Open Message / Announcement
 */
export function getNotificationActionLabel(
  entityType?: string,
  eventType?: string,
  category?: string
): string {
  if (eventType === 'ALERT_EMPLOYEE_OVER_CAPACITY' || category === 'STAFF_CAPACITY') {
    return 'Rebalance Workload';
  }

  switch (entityType?.toUpperCase()) {
    case 'PROJECT':
      return 'Open Project';
    case 'TASK':
      return 'Open Task';
    case 'SCRIPT':
      return 'Open Script';
    case 'GRAPHIC_REQUIREMENT':
      return 'Open Graphic Requirement';
    case 'EQUIPMENT':
      if (category === 'EQUIPMENT_REQUEST' || eventType?.includes('REQUEST')) {
        return 'Open Equipment Request';
      }
      return 'Open Equipment';
    case 'APPROVAL':
      return 'Open Approval';
    case 'COMMUNICATION':
      if (eventType?.includes('ANNOUNCEMENT') || category === 'ANNOUNCEMENT') {
        return 'Open Announcement';
      }
      if (eventType?.includes('BLOCKER')) {
        return 'Open Blocker';
      }
      return 'Open Communication';
    case 'CALENDAR_EVENT':
      return 'Open Calendar Event';
    case 'ATTENDANCE':
      return 'Open Attendance';
    default:
      return 'Open Record';
  }
}

/**
 * Direct Navigation Shortcut URL Resolver
 */
export function getNotificationNavigationUrl(
  linkUrl?: string | null,
  entityType?: string,
  entityId?: string,
  eventType?: string
): string {
  if (eventType === 'ALERT_EMPLOYEE_OVER_CAPACITY' && entityId) {
    return `/tasks?reassignUser=${encodeURIComponent(entityId)}`;
  }
  if (linkUrl && linkUrl !== '#' && linkUrl.trim()) {
    return linkUrl;
  }
  switch (entityType?.toUpperCase()) {
    case 'PROJECT':
      return entityId ? `/projects?projectId=${encodeURIComponent(entityId)}` : '/projects';
    case 'TASK':
      return entityId ? `/tasks?taskId=${encodeURIComponent(entityId)}` : '/tasks';
    case 'SCRIPT':
      return entityId ? `/scripts?scriptId=${encodeURIComponent(entityId)}` : '/scripts';
    case 'GRAPHIC_REQUIREMENT':
      return entityId ? `/graphic-reqs?id=${encodeURIComponent(entityId)}` : '/graphic-reqs';
    case 'EQUIPMENT':
      return entityId ? `/equipment?equipmentId=${encodeURIComponent(entityId)}` : '/equipment';
    case 'APPROVAL':
      return entityId ? `/approvals?approvalId=${encodeURIComponent(entityId)}` : '/approvals';
    case 'COMMUNICATION':
      return entityId ? `/communication?id=${encodeURIComponent(entityId)}` : '/communication';
    case 'CALENDAR_EVENT':
      return entityId ? `/calendar?eventId=${encodeURIComponent(entityId)}` : '/calendar';
    case 'ATTENDANCE':
      return entityId ? `/tasks?reassignUser=${encodeURIComponent(entityId)}` : '/tasks';
    default:
      return '/dashboard';
  }
}

/**
 * Format relative time (e.g. "Just now", "5m ago", "2h ago", "Yesterday", "3d ago")
 */
export function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Recently';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
