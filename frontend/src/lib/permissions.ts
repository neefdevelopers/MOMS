export type Role =
  | 'MEDIA_MANAGER'
  | 'TECHNICAL_MANAGER'
  | 'STAFF'
  | 'SOCIAL_MEDIA_MANAGER'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'MARKETING_MANAGER'
  | 'SALES_MANAGER'
  | 'CLIENT_COORDINATOR'
  | 'ADMINISTRATOR'
  | 'ADMIN';

export type PermissionType =
  | 'VIEW'
  | 'CREATE'
  | 'EDIT'
  | 'DELETE'
  | 'APPROVE'
  | 'ASSIGN'
  | 'CONFIGURE'
  | 'EXPORT'
  | 'ARCHIVE'
  | 'RESTORE';

export type ModuleType =
  | 'DASHBOARD'
  | 'PROJECTS'
  | 'SCRIPTS'
  | 'GRAPHIC_REQUIREMENTS'
  | 'TASKS'
  | 'EQUIPMENT'
  | 'CLIENTS'
  | 'BRANDS'
  | 'PRODUCTS'
  | 'STAFF'
  | 'REPORTS'
  | 'CALENDAR'
  | 'COMMUNICATIONS'
  | 'REVISIONS'
  | 'ACTIVITY_LOGS'
  | 'SETTINGS';

export interface PermissionMeta {
  type: PermissionType;
  label: string;
  description: string;
  iconName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const PERMISSION_TYPES_CONFIG: Record<PermissionType, PermissionMeta> = {
  VIEW: {
    type: 'VIEW',
    label: 'View',
    description: 'Read and browse module records, details, and metadata',
    iconName: 'Eye',
    badgeBg: 'bg-blue-950/60',
    badgeText: 'text-blue-400',
    badgeBorder: 'border-blue-800/60',
  },
  CREATE: {
    type: 'CREATE',
    label: 'Create',
    description: 'Initiate and submit new records, briefs, and orders',
    iconName: 'Plus',
    badgeBg: 'bg-emerald-950/60',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-800/60',
  },
  EDIT: {
    type: 'EDIT',
    label: 'Edit',
    description: 'Modify existing records, fields, notes, and workflows',
    iconName: 'Pencil',
    badgeBg: 'bg-amber-950/60',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-800/60',
  },
  DELETE: {
    type: 'DELETE',
    label: 'Delete',
    description: 'Permanently remove unauthorized or obsolete records',
    iconName: 'Trash2',
    badgeBg: 'bg-red-950/60',
    badgeText: 'text-red-400',
    badgeBorder: 'border-red-800/60',
  },
  APPROVE: {
    type: 'APPROVE',
    label: 'Approve',
    description: 'Grant managerial, technical, and client sign-offs',
    iconName: 'CheckCircle2',
    badgeBg: 'bg-purple-950/60',
    badgeText: 'text-purple-400',
    badgeBorder: 'border-purple-800/60',
  },
  ASSIGN: {
    type: 'ASSIGN',
    label: 'Assign',
    description: 'Delegate tasks, allocate equipment, and designate roles',
    iconName: 'UserCheck',
    badgeBg: 'bg-indigo-950/60',
    badgeText: 'text-indigo-400',
    badgeBorder: 'border-indigo-800/60',
  },
  CONFIGURE: {
    type: 'CONFIGURE',
    label: 'Configure',
    description: 'Adjust system parameters, formulas, settings, and equipment categories',
    iconName: 'Sliders',
    badgeBg: 'bg-cyan-950/60',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-800/60',
  },
  EXPORT: {
    type: 'EXPORT',
    label: 'Export',
    description: 'Download reports, data summaries, and logs in CSV, Excel, or PDF',
    iconName: 'Download',
    badgeBg: 'bg-teal-950/60',
    badgeText: 'text-teal-400',
    badgeBorder: 'border-teal-800/60',
  },
  ARCHIVE: {
    type: 'ARCHIVE',
    label: 'Archive',
    description: 'Move inactive records to read-only historical cold storage',
    iconName: 'Archive',
    badgeBg: 'bg-slate-900',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-700',
  },
  RESTORE: {
    type: 'RESTORE',
    label: 'Restore',
    description: 'Recover archived or deleted operational items back to active state',
    iconName: 'RotateCcw',
    badgeBg: 'bg-lime-950/60',
    badgeText: 'text-lime-400',
    badgeBorder: 'border-lime-800/60',
  },
};

export const MODULE_SUPPORTED_PERMISSIONS: Record<ModuleType, PermissionType[]> = {
  DASHBOARD: ['VIEW', 'CONFIGURE', 'EXPORT'],
  PROJECTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
  SCRIPTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
  GRAPHIC_REQUIREMENTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
  TASKS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
  EQUIPMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'CONFIGURE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
  CLIENTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
  BRANDS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
  PRODUCTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
  STAFF: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'CONFIGURE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
  REPORTS: ['VIEW', 'EXPORT', 'CONFIGURE'],
  CALENDAR: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
  COMMUNICATIONS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'ARCHIVE', 'RESTORE'],
  REVISIONS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
  ACTIVITY_LOGS: ['VIEW', 'EXPORT'],
  SETTINGS: ['VIEW', 'EDIT', 'CONFIGURE'],
};

/**
 * Standard MOMS Role-Based Permission Matrix
 */
export const ROLE_PERMISSION_MATRIX: Record<Role, Record<ModuleType, PermissionType[]>> = {
  MEDIA_MANAGER: {
    DASHBOARD: ['VIEW', 'CONFIGURE', 'EXPORT'],
    PROJECTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    SCRIPTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    GRAPHIC_REQUIREMENTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    TASKS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    EQUIPMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'CONFIGURE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    CLIENTS: ['VIEW'],
    BRANDS: ['VIEW'],
    PRODUCTS: ['VIEW'],
    STAFF: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'CONFIGURE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    REPORTS: ['VIEW', 'EXPORT', 'CONFIGURE'],
    CALENDAR: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    COMMUNICATIONS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'ARCHIVE', 'RESTORE'],
    REVISIONS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT'],
    ACTIVITY_LOGS: ['VIEW', 'EXPORT'],
    SETTINGS: ['VIEW', 'EDIT', 'CONFIGURE'],
  },
  TECHNICAL_MANAGER: {
    DASHBOARD: ['VIEW', 'EXPORT'],
    PROJECTS: ['VIEW', 'EDIT', 'EXPORT'],
    SCRIPTS: [],
    GRAPHIC_REQUIREMENTS: ['VIEW', 'EDIT', 'EXPORT'],
    TASKS: ['VIEW', 'EDIT', 'EXPORT'],
    EQUIPMENT: ['VIEW', 'EDIT'],
    CLIENTS: ['VIEW'],
    BRANDS: ['VIEW'],
    PRODUCTS: ['VIEW'],
    STAFF: [],
    REPORTS: ['VIEW', 'EXPORT'],
    CALENDAR: ['VIEW', 'EXPORT'],
    COMMUNICATIONS: ['VIEW', 'CREATE', 'EDIT'],
    REVISIONS: ['VIEW', 'CREATE', 'EDIT', 'APPROVE'],
    ACTIVITY_LOGS: [],
    SETTINGS: [],
  },
  STAFF: {
    DASHBOARD: ['VIEW'],
    PROJECTS: ['VIEW'],
    SCRIPTS: ['VIEW'],
    GRAPHIC_REQUIREMENTS: ['VIEW'],
    TASKS: ['VIEW', 'EDIT'],
    EQUIPMENT: ['VIEW'],
    CLIENTS: [],
    BRANDS: [],
    PRODUCTS: [],
    STAFF: [],
    REPORTS: ['VIEW'],
    CALENDAR: ['VIEW'],
    COMMUNICATIONS: ['VIEW'],
    REVISIONS: ['VIEW', 'EDIT'],
    ACTIVITY_LOGS: [],
    SETTINGS: [],
  },
  HR_MANAGER: {
    DASHBOARD: ['VIEW', 'EXPORT'],
    PROJECTS: ['VIEW'],
    SCRIPTS: ['VIEW'],
    GRAPHIC_REQUIREMENTS: ['VIEW'],
    TASKS: ['VIEW'],
    EQUIPMENT: ['VIEW'],
    CLIENTS: [],
    BRANDS: [],
    PRODUCTS: [],
    STAFF: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN'],
    REPORTS: ['VIEW'],
    CALENDAR: ['VIEW'],
    COMMUNICATIONS: ['VIEW', 'CREATE'],
    REVISIONS: ['VIEW'],
    ACTIVITY_LOGS: [],
    SETTINGS: [],
  },
  FINANCE_MANAGER: {
    DASHBOARD: ['VIEW', 'EXPORT'],
    PROJECTS: ['VIEW'],
    SCRIPTS: ['VIEW'],
    GRAPHIC_REQUIREMENTS: ['VIEW'],
    TASKS: ['VIEW'],
    EQUIPMENT: ['VIEW'],
    CLIENTS: ['VIEW'],
    BRANDS: ['VIEW'],
    PRODUCTS: ['VIEW'],
    STAFF: ['VIEW'],
    REPORTS: ['VIEW', 'EXPORT'],
    CALENDAR: ['VIEW'],
    COMMUNICATIONS: ['VIEW', 'CREATE'],
    REVISIONS: ['VIEW'],
    ACTIVITY_LOGS: [],
    SETTINGS: [],
  },
  SOCIAL_MEDIA_MANAGER: {
    DASHBOARD: ['VIEW'],
    PROJECTS: ['VIEW', 'CREATE', 'EDIT'],
    SCRIPTS: ['VIEW', 'CREATE', 'EDIT'],
    GRAPHIC_REQUIREMENTS: ['VIEW', 'CREATE', 'EDIT'],
    TASKS: ['VIEW', 'EDIT'],
    EQUIPMENT: ['VIEW'],
    CLIENTS: [],
    BRANDS: [],
    PRODUCTS: [],
    STAFF: [],
    REPORTS: [],
    CALENDAR: ['VIEW', 'CREATE', 'EDIT'],
    COMMUNICATIONS: ['VIEW', 'CREATE'],
    REVISIONS: ['VIEW', 'CREATE', 'EDIT'],
    ACTIVITY_LOGS: [],
    SETTINGS: [],
  },
  MARKETING_MANAGER: {
    DASHBOARD: ['VIEW'],
    PROJECTS: ['VIEW', 'APPROVE'],
    SCRIPTS: ['VIEW', 'APPROVE'],
    GRAPHIC_REQUIREMENTS: ['VIEW', 'APPROVE', 'EDIT'],
    TASKS: ['VIEW'],
    EQUIPMENT: [],
    CLIENTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    BRANDS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    PRODUCTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    STAFF: [],
    REPORTS: ['VIEW'],
    CALENDAR: ['VIEW', 'APPROVE'],
    COMMUNICATIONS: ['VIEW', 'CREATE'],
    REVISIONS: ['VIEW', 'APPROVE'],
    ACTIVITY_LOGS: [],
    SETTINGS: [],
  },
  SALES_MANAGER: {
    DASHBOARD: ['VIEW', 'EXPORT'],
    PROJECTS: ['VIEW'],
    SCRIPTS: ['VIEW'],
    GRAPHIC_REQUIREMENTS: ['VIEW'],
    TASKS: ['VIEW'],
    EQUIPMENT: ['VIEW'],
    CLIENTS: ['VIEW', 'CREATE', 'EDIT'],
    BRANDS: ['VIEW'],
    PRODUCTS: ['VIEW'],
    STAFF: ['VIEW'],
    REPORTS: ['VIEW'],
    CALENDAR: ['VIEW'],
    COMMUNICATIONS: ['VIEW', 'CREATE'],
    REVISIONS: ['VIEW'],
    ACTIVITY_LOGS: [],
    SETTINGS: [],
  },
  CLIENT_COORDINATOR: {
    DASHBOARD: ['VIEW'],
    PROJECTS: ['VIEW'],
    SCRIPTS: ['VIEW'],
    GRAPHIC_REQUIREMENTS: ['VIEW'],
    TASKS: ['VIEW'],
    EQUIPMENT: ['VIEW'],
    CLIENTS: ['VIEW'],
    BRANDS: ['VIEW'],
    PRODUCTS: ['VIEW'],
    STAFF: ['VIEW'],
    REPORTS: ['VIEW'],
    CALENDAR: ['VIEW'],
    COMMUNICATIONS: ['VIEW', 'CREATE'],
    REVISIONS: ['VIEW'],
    ACTIVITY_LOGS: [],
    SETTINGS: [],
  },
  ADMINISTRATOR: {
    DASHBOARD: ['VIEW', 'CONFIGURE', 'EXPORT'],
    PROJECTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    SCRIPTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    GRAPHIC_REQUIREMENTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    TASKS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    EQUIPMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'CONFIGURE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    CLIENTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    BRANDS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    PRODUCTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    STAFF: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'CONFIGURE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    REPORTS: ['VIEW', 'EXPORT', 'CONFIGURE'],
    CALENDAR: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    COMMUNICATIONS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'ARCHIVE', 'RESTORE'],
    REVISIONS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    ACTIVITY_LOGS: ['VIEW', 'EXPORT'],
    SETTINGS: ['VIEW', 'EDIT', 'CONFIGURE'],
  },
  ADMIN: {
    DASHBOARD: ['VIEW', 'CONFIGURE', 'EXPORT'],
    PROJECTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    SCRIPTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    GRAPHIC_REQUIREMENTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    TASKS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    EQUIPMENT: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'CONFIGURE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    CLIENTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    BRANDS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    PRODUCTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    STAFF: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'CONFIGURE', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    REPORTS: ['VIEW', 'EXPORT', 'CONFIGURE'],
    CALENDAR: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    COMMUNICATIONS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'ARCHIVE', 'RESTORE'],
    REVISIONS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'ASSIGN', 'EXPORT', 'ARCHIVE', 'RESTORE'],
    ACTIVITY_LOGS: ['VIEW', 'EXPORT'],
    SETTINGS: ['VIEW', 'EDIT', 'CONFIGURE'],
  },
};

export function hasModuleAccess(role: string, module: ModuleType): boolean {
  if (!role) return false;
  if (role === 'ADMIN' || role === 'ADMINISTRATOR') return true;
  const permissions = ROLE_PERMISSION_MATRIX[role as Role]?.[module] || [];
  return permissions.includes('VIEW');
}

export function canPerformAction(role: string, module: ModuleType, action: PermissionType): boolean {
  if (!role) return false;
  if (role === 'ADMIN' || role === 'ADMINISTRATOR') return true;
  const permissions = ROLE_PERMISSION_MATRIX[role as Role]?.[module] || [];
  return permissions.includes(action);
}

export function canAccessRoute(role: string, route: string): boolean {
  if (!role) return false;
  if (role === 'ADMIN' || role === 'ADMINISTRATOR') return true;

  if (route.startsWith('/clients')) return hasModuleAccess(role, 'CLIENTS');
  if (route.startsWith('/brands')) return hasModuleAccess(role, 'BRANDS');
  if (route.startsWith('/products')) return hasModuleAccess(role, 'PRODUCTS');
  if (route.startsWith('/projects')) return hasModuleAccess(role, 'PROJECTS');
  if (route.startsWith('/scripts')) return hasModuleAccess(role, 'SCRIPTS');
  if (route.startsWith('/graphic-reqs')) return hasModuleAccess(role, 'GRAPHIC_REQUIREMENTS');
  if (route.startsWith('/tasks')) return hasModuleAccess(role, 'TASKS');
  if (route.startsWith('/reports')) return hasModuleAccess(role, 'REPORTS');
  if (route.startsWith('/calendar')) return hasModuleAccess(role, 'CALENDAR');
  if (route.startsWith('/equipment/create')) {
    return role === 'MEDIA_MANAGER' || role === 'ADMIN' || role === 'ADMINISTRATOR';
  }
  if (route.startsWith('/equipment/my')) return true;
  if (route.startsWith('/equipment')) {
    return role === 'MEDIA_MANAGER' || role === 'TECHNICAL_MANAGER' || role === 'ADMIN' || role === 'ADMINISTRATOR';
  }
  if (route.startsWith('/attendance')) return role === 'MEDIA_MANAGER' || role === 'STAFF' || role === 'SOCIAL_MEDIA_MANAGER' || role === 'ADMIN' || role === 'ADMINISTRATOR';
  if (route.startsWith('/client-review')) {
    return role === 'MARKETING_MANAGER' || role === 'ADMIN' || role === 'ADMINISTRATOR';
  }
  if (route.startsWith('/approvals')) {
    return role === 'TECHNICAL_MANAGER' || role === 'MEDIA_MANAGER' || role === 'MARKETING_MANAGER' || role === 'ADMIN' || role === 'ADMINISTRATOR';
  }

  return true;
}
