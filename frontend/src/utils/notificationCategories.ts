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
    colorClass: 'text-blue-400',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    iconName: 'Info',
  },
  TASK_ASSIGNMENT: {
    code: 'TASK_ASSIGNMENT',
    label: 'Task Assignment',
    description: 'New task assignments and manager reassignments',
    colorClass: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconName: 'CheckSquare',
  },
  REMINDER: {
    code: 'REMINDER',
    label: 'Reminder',
    description: 'Scheduled follow-ups and operational action reminders',
    colorClass: 'text-indigo-400',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    iconName: 'Clock',
  },
  APPROVAL_REQUEST: {
    code: 'APPROVAL_REQUEST',
    label: 'Approval Request',
    description: 'Pending sign-off reviews routed to Media or Technical Managers',
    colorClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    iconName: 'FileCheck',
  },
  APPROVAL_COMPLETED: {
    code: 'APPROVAL_COMPLETED',
    label: 'Approval Completed',
    description: 'Final sign-off decisions (Approved or Rejected)',
    colorClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconName: 'CheckCircle',
  },
  REVISION_REQUEST: {
    code: 'REVISION_REQUEST',
    label: 'Revision Request',
    description: 'Client or editorial change requests on deliverables or scripts',
    colorClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconName: 'RotateCcw',
  },
  DEADLINE_REMINDER: {
    code: 'DEADLINE_REMINDER',
    label: 'Deadline Reminder',
    description: 'Urgent notice for approaching due dates and timeline milestones',
    colorClass: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30',
    iconName: 'Calendar',
  },
  EQUIPMENT_REQUEST: {
    code: 'EQUIPMENT_REQUEST',
    label: 'Equipment Request',
    description: 'Field gear reservations and checkout requests from production crew',
    colorClass: 'text-teal-400',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    iconName: 'Camera',
  },
  EQUIPMENT_APPROVAL: {
    code: 'EQUIPMENT_APPROVAL',
    label: 'Equipment Approval',
    description: 'Equipment reservation approvals and checkout acknowledgements',
    colorClass: 'text-teal-300',
    badgeClass: 'bg-teal-950 text-teal-200 border-teal-800',
    iconName: 'ShieldCheck',
  },
  EQUIPMENT_RETURN_REMINDER: {
    code: 'EQUIPMENT_RETURN_REMINDER',
    label: 'Equipment Return Reminder',
    description: 'Scheduled gear return inspection and overdue return warnings',
    colorClass: 'text-orange-400',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    iconName: 'CornerDownLeft',
  },
  ATTENDANCE_REMINDER: {
    code: 'ATTENDANCE_REMINDER',
    label: 'Attendance Reminder',
    description: 'Daily check-in cutoff, late arrival notice, or absent logging',
    colorClass: 'text-yellow-400',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    iconName: 'UserCheck',
  },
  ANNOUNCEMENT: {
    code: 'ANNOUNCEMENT',
    label: 'Announcement',
    description: 'Company-wide bulletins, office schedules, and studio alerts',
    colorClass: 'text-purple-300',
    badgeClass: 'bg-purple-950 text-purple-200 border-purple-800',
    iconName: 'Megaphone',
  },
  WARNING: {
    code: 'WARNING',
    label: 'Warning',
    description: 'Capacity overloads, equipment damage, or unresolved blockers',
    colorClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    iconName: 'AlertTriangle',
  },
  SYSTEM_NOTIFICATION: {
    code: 'SYSTEM_NOTIFICATION',
    label: 'System Notification',
    description: 'Platform maintenance, security policies, and configuration updates',
    colorClass: 'text-slate-400',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
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
    badgeClass: 'bg-red-600 text-white font-black border-red-500 shadow-md shadow-red-900/50 animate-pulse',
    cardBorderClass: 'border-red-600/80 hover:border-red-500 shadow-lg shadow-red-950/40 ring-1 ring-red-500/40',
    cardBgClass: 'bg-red-950/30',
    pulseIcon: true,
    glowEffect: true,
    weight: 4,
  },
  HIGH: {
    code: 'HIGH',
    label: 'High',
    badgeClass: 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/40',
    cardBorderClass: 'border-amber-500/50 hover:border-amber-400',
    cardBgClass: 'bg-amber-950/15',
    pulseIcon: false,
    glowEffect: false,
    weight: 3,
  },
  MEDIUM: {
    code: 'MEDIUM',
    label: 'Medium',
    badgeClass: 'bg-blue-500/20 text-blue-300 font-medium border-blue-500/30',
    cardBorderClass: 'border-gray-800 hover:border-blue-500/40',
    cardBgClass: 'bg-gray-900/80',
    pulseIcon: false,
    glowEffect: false,
    weight: 2,
  },
  LOW: {
    code: 'LOW',
    label: 'Low',
    badgeClass: 'bg-gray-800/80 text-gray-400 font-normal border-gray-700/60',
    cardBorderClass: 'border-gray-850 hover:border-gray-700',
    cardBgClass: 'bg-gray-950/50',
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
