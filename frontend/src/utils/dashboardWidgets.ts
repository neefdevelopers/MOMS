export type WidgetId =
  | 'pending_approvals'
  | 'attendance'
  | 'productivity'
  | 'active_projects'
  | 'upcoming_deadlines'
  | 'calendar'
  | 'equipment_status'
  | 'employee_capacity'
  | 'recent_activities';

export interface DashboardWidgetConfig {
  id: WidgetId;
  title: string;
  category: 'Operational' | 'Resource' | 'Audit' | 'Performance';
  description: string;
  iconName: string;
  enabled: boolean;
  order: number;
  size?: 'normal' | 'full';
  itemLimit?: number;
}

export const DASHBOARD_WIDGETS_SETTING_KEY = 'DASHBOARD_WIDGETS_CONFIG';
export const LOCAL_STORAGE_WIDGETS_KEY = 'moms_dashboard_widgets_config';

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  {
    id: 'active_projects',
    title: 'Active Projects',
    category: 'Operational',
    description: 'Pipeline of active & completed projects with live deliverable progress',
    iconName: 'Film',
    enabled: true,
    order: 1,
    size: 'normal',
    itemLimit: 5,
  },
  {
    id: 'pending_approvals',
    title: 'Pending Approvals',
    category: 'Operational',
    description: 'Sign-off approval queue for scripts, deliverables, and requirements',
    iconName: 'Clock',
    enabled: true,
    order: 2,
    size: 'normal',
    itemLimit: 5,
  },
  {
    id: 'upcoming_deadlines',
    title: 'Upcoming Deadlines & Projects Due',
    category: 'Operational',
    description: 'Upcoming project deliverable dates and task deadlines within 7 days',
    iconName: 'Clock',
    enabled: true,
    order: 3,
    size: 'normal',
    itemLimit: 5,
  },
  {
    id: 'productivity',
    title: 'Productivity',
    category: 'Performance',
    description: 'Daily target vs actual output rate and overall productivity metrics',
    iconName: 'TrendingUp',
    enabled: true,
    order: 3,
    size: 'normal',
  },
  {
    id: 'attendance',
    title: 'Attendance',
    category: 'Resource',
    description: 'Employee daily presence, absenteeism rate, and attendance tracking',
    iconName: 'Users',
    enabled: true,
    order: 4,
    size: 'normal',
  },
  {
    id: 'equipment_status',
    title: 'Equipment Status',
    category: 'Resource',
    description: 'Availability, in-field deployment, reservations, and maintenance items',
    iconName: 'Camera',
    enabled: true,
    order: 5,
    size: 'normal',
  },
  {
    id: 'calendar',
    title: 'Calendar',
    category: 'Operational',
    description: "Today's scheduled indoor studio bookings and outdoor shoot locations",
    iconName: 'Calendar',
    enabled: true,
    order: 6,
    size: 'full',
    itemLimit: 5,
  },
  {
    id: 'employee_capacity',
    title: 'Employee Capacity',
    category: 'Resource',
    description: 'Staff workload distribution, assigned hours, and capacity utilization',
    iconName: 'Sliders',
    enabled: true,
    order: 7,
    size: 'full',
    itemLimit: 6,
  },
  {
    id: 'recent_activities',
    title: 'Recent Activities',
    category: 'Audit',
    description: 'Real-time operational audit trail and system activity timeline feed',
    iconName: 'Radio',
    enabled: true,
    order: 8,
    size: 'full',
    itemLimit: 6,
  },
];

export function parseWidgetConfig(raw: any): DashboardWidgetConfig[] {
  if (!raw) return DEFAULT_DASHBOARD_WIDGETS;

  let parsed: any[] = [];
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return DEFAULT_DASHBOARD_WIDGETS;
    }
  } else if (Array.isArray(raw)) {
    parsed = raw;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return DEFAULT_DASHBOARD_WIDGETS;
  }

  // Merge with defaults to ensure all required widgets exist
  const resultMap = new Map<WidgetId, DashboardWidgetConfig>();
  DEFAULT_DASHBOARD_WIDGETS.forEach((def) => {
    resultMap.set(def.id, { ...def });
  });

  parsed.forEach((item) => {
    if (item && item.id && resultMap.has(item.id)) {
      const existing = resultMap.get(item.id)!;
      resultMap.set(item.id, {
        ...existing,
        enabled: typeof item.enabled === 'boolean' ? item.enabled : existing.enabled,
        order: typeof item.order === 'number' ? item.order : existing.order,
        size: item.size === 'full' || item.size === 'normal' ? item.size : existing.size,
        itemLimit: typeof item.itemLimit === 'number' ? item.itemLimit : existing.itemLimit,
      });
    }
  });

  return Array.from(resultMap.values()).sort((a, b) => a.order - b.order);
}
