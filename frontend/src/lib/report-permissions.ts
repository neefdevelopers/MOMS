export type ReportTab =
  | 'timelines'
  | 'revisions'
  | 'capacity'
  | 'approvals'
  | 'equipment'
  | 'attendance'
  | 'projects'
  | 'departments'
  | 'products'
  | 'clients'
  | 'brands'
  | 'employee'
  | 'scripts'
  | 'graphics'
  | 'my_tasks'
  | 'my_projects'
  | 'my_deliverables'
  | 'my_equipment'
  | 'my_attendance';

export const MEDIA_MANAGER_TABS: ReportTab[] = [
  'timelines',
  'revisions',
  'capacity',
  'approvals',
  'equipment',
  'attendance',
  'projects',
  'departments',
  'products',
  'clients',
  'brands',
  'employee',
  'scripts',
  'graphics',
];

export const TECHNICAL_MANAGER_TABS: ReportTab[] = [
  'approvals',
  'equipment',
  'revisions',
  'capacity',
  'timelines',
];

export const STAFF_TABS: ReportTab[] = [
  'my_tasks',
  'my_projects',
  'my_deliverables',
  'my_equipment',
  'my_attendance',
];

export function getAllowedReportTabs(role?: string): ReportTab[] {
  if (!role) return STAFF_TABS;
  if (role === 'MEDIA_MANAGER' || role === 'ADMINISTRATOR' || role === 'ADMIN') {
    return MEDIA_MANAGER_TABS;
  }
  if (role === 'TECHNICAL_MANAGER') {
    return TECHNICAL_MANAGER_TABS;
  }
  return STAFF_TABS;
}

export function isReportTabAllowed(tab: string, role?: string): boolean {
  const allowed = getAllowedReportTabs(role);
  return allowed.includes(tab as ReportTab);
}
