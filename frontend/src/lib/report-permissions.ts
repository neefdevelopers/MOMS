export type ReportTab =
  | 'brand_reports'
  | 'task_assignments'
  | 'shoot_reports'
  | 'graphic_reports'
  | 'staff_work'
  | 'equipment_rental';

export const MARKETING_MANAGER_TABS: ReportTab[] = [
  'brand_reports',
  'task_assignments',
];

export const MEDIA_MANAGER_TABS: ReportTab[] = [
  'brand_reports',
  'shoot_reports',
  'graphic_reports',
  'staff_work',
  'equipment_rental',
];

export function getAllowedReportTabs(role?: string): ReportTab[] {
  if (!role) return [];
  if (role === 'MARKETING_MANAGER') {
    return MARKETING_MANAGER_TABS;
  }
  if (role === 'MEDIA_MANAGER' || role === 'ADMINISTRATOR' || role === 'ADMIN') {
    return MEDIA_MANAGER_TABS;
  }
  return [];
}

export function isReportTabAllowed(tab: string, role?: string): boolean {
  const allowed = getAllowedReportTabs(role);
  return allowed.includes(tab as ReportTab);
}

