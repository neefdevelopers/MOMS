export interface SettingFieldDefinition {
  key: string;
  label: string;
  category: SettingsCategoryId;
  description: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
  defaultValue: string;
  placeholder?: string;
  unit?: string;
}

export type SettingsCategoryId =
  | 'general'
  | 'organization'
  | 'production'
  | 'naming'
  | 'attendance'
  | 'reporting'
  | 'notifications'
  | 'equipment'
  | 'storage'
  | 'security';

export interface SettingsCategoryMeta {
  id: SettingsCategoryId;
  title: string;
  description: string;
  iconName: string;
  badge?: string;
}

export const SETTINGS_CATEGORIES: SettingsCategoryMeta[] = [
  {
    id: 'general',
    title: 'General Settings',
    description: 'System identity, timezone, localization, and base application defaults',
    iconName: 'Settings',
  },
  {
    id: 'organization',
    title: 'Organization Settings',
    description: 'Company information, department hierarchy, and operational working schedule',
    iconName: 'Building2',
  },
  {
    id: 'production',
    title: 'Production Settings',
    description: 'Production formulas engine, deliverable weights, capacity thresholds, and workflow rules',
    iconName: 'Film',
    badge: 'Formulas Engine',
  },
  {
    id: 'naming',
    title: 'Naming Standards',
    description: 'Automated naming patterns and prefix conventions for projects, scripts, requirements, and assets',
    iconName: 'Tag',
    badge: 'Prefix Rules',
  },
  {
    id: 'attendance',
    title: 'Attendance Settings',
    description: 'Shift timings, check-in cutoffs, late grace periods, and presence scoring parameters',
    iconName: 'Users',
  },
  {
    id: 'reporting',
    title: 'Reporting Settings',
    description: 'Executive dashboard widget layout, productivity weights, and report export configurations',
    iconName: 'BarChart3',
    badge: 'Widgets Layout',
  },
  {
    id: 'notifications',
    title: 'Notification Settings',
    description: 'System alert banners, deadline lead times, blocker escalation, and messaging rules',
    iconName: 'Bell',
  },
  {
    id: 'equipment',
    title: 'Equipment Settings',
    description: 'Inventory reservation policies, field checkout permissions, and maintenance safeguards',
    iconName: 'Camera',
  },
  {
    id: 'storage',
    title: 'Storage Settings',
    description: 'File upload limits, supported media codecs, raw asset paths, and revision retention',
    iconName: 'HardDrive',
  },
  {
    id: 'security',
    title: 'Security Settings',
    description: 'Role-based access control (RBAC), session timeouts, password rules, and audit logging',
    iconName: 'ShieldCheck',
    badge: 'RBAC Strict',
  },
];

export const SYSTEM_SETTING_FIELDS: SettingFieldDefinition[] = [
  // 1. General Settings
  {
    key: 'SYSTEM_NAME',
    label: 'System Name & Title',
    category: 'general',
    description: 'Display title for the Media Operations Management platform',
    type: 'text',
    defaultValue: 'MOMS Media Operations Management System',
    placeholder: 'e.g. MOMS Media Operations',
  },
  {
    key: 'SYSTEM_TIMEZONE',
    label: 'System Timezone',
    category: 'general',
    description: 'Primary timezone used for shoot scheduling, task deadlines, and logs',
    type: 'select',
    options: [
      { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST UTC+05:30)' },
      { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
      { value: 'America/New_York', label: 'America/New_York (EST UTC-05:00)' },
      { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
      { value: 'Asia/Dubai', label: 'Asia/Dubai (GST UTC+04:00)' },
      { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT UTC+08:00)' },
    ],
    defaultValue: 'Asia/Kolkata',
  },
  {
    key: 'DATE_FORMAT',
    label: 'Date Format Standard',
    category: 'general',
    description: 'Default date display format across timelines and reports',
    type: 'select',
    options: [
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 19/08/2026)' },
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO e.g. 2026-08-19)' },
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US e.g. 08/19/2026)' },
    ],
    defaultValue: 'DD/MM/YYYY',
  },
  {
    key: 'DEFAULT_PAGE_SIZE',
    label: 'Default Records Per Page (Pagination)',
    category: 'general',
    description: 'Configures default number of records displayed per page across data tables and operational grids',
    type: 'select',
    options: [
      { value: '5', label: '5 records per page' },
      { value: '10', label: '10 records per page (Standard)' },
      { value: '20', label: '20 records per page' },
      { value: '50', label: '50 records per page' },
      { value: '100', label: '100 records per page' },
    ],
    defaultValue: '10',
  },
  {
    key: 'DEFAULT_THEME',
    label: 'Default Interface Appearance',
    category: 'general',
    description: 'System color theme optimized for studio editing and operational control',
    type: 'select',
    options: [
      { value: 'DARK_PRO', label: 'Studio Dark Mode (Recommended)' },
      { value: 'HIGH_CONTRAST', label: 'High Contrast Slate' },
    ],
    defaultValue: 'DARK_PRO',
  },
  {
    key: 'MAINTENANCE_MODE',
    label: 'Maintenance Mode',
    category: 'general',
    description: 'Restrict access to administrators during scheduled database or system maintenance',
    type: 'boolean',
    defaultValue: 'false',
  },

  // 2. Organization Settings
  {
    key: 'COMPANY_NAME',
    label: 'Organization Name',
    category: 'organization',
    description: 'Official organization legal entity or production house name',
    type: 'text',
    defaultValue: 'MOMS Media Operations',
    placeholder: 'e.g. MOMS Studios Pvt Ltd',
  },
  {
    key: 'ORGANIZATION_CODE',
    label: 'Organization Identifier Code',
    category: 'organization',
    description: 'Short company identifier used in internal system codes',
    type: 'text',
    defaultValue: 'MOMS-CORP',
    placeholder: 'e.g. MOMS, STUDIO-A',
  },
  {
    key: 'SUPPORT_EMAIL',
    label: 'Operational Support Email',
    category: 'organization',
    description: 'Contact address for technical escalated queries and notifications',
    type: 'text',
    defaultValue: 'ops@moms-media.com',
    placeholder: 'ops@company.com',
  },
  {
    key: 'STANDARD_DAILY_HOURS',
    label: 'Standard Working Hours per Day',
    category: 'organization',
    description: 'Base capacity hours allocated per full-time staff member',
    type: 'number',
    defaultValue: '8.0',
    unit: 'hours/day',
  },
  {
    key: 'WORKING_DAYS',
    label: 'Operational Working Days',
    category: 'organization',
    description: 'Standard working days schedule for production staff',
    type: 'select',
    options: [
      { value: 'MON_SAT', label: 'Monday to Saturday (6 Days)' },
      { value: 'MON_FRI', label: 'Monday to Friday (5 Days)' },
      { value: 'ALL_DAYS', label: 'All 7 Days (24/7 Production)' },
    ],
    defaultValue: 'MON_SAT',
  },

  // 3. Production Settings
  {
    key: 'ALLOW_OVERLOAD_ASSIGNMENT',
    label: 'Allow Overload Task Assignment',
    category: 'production',
    description: 'Allows managers to assign tasks exceeding 8h capacity with an explicit overload warning',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'MAX_CAPACITY_HOURS',
    label: 'Maximum Daily Workload Limit',
    category: 'production',
    description: 'Absolute daily threshold before task assignment is locked',
    type: 'number',
    defaultValue: '12.0',
    unit: 'hours',
  },
  {
    key: 'DEFAULT_TASK_TURNAROUND_HOURS',
    label: 'Default Task Turnaround Window',
    category: 'production',
    description: 'Standard target duration for standard production tasks',
    type: 'number',
    defaultValue: '24',
    unit: 'hours',
  },
  {
    key: 'AUTO_ASSIGNMENT_STRATEGY',
    label: 'Task Auto-Assignment Strategy',
    category: 'production',
    description: 'Algorithm used to suggest or assign employees based on workload',
    type: 'select',
    options: [
      { value: 'LEAST_LOADED', label: 'Least Loaded Staff First (Balanced Capacity)' },
      { value: 'SKILL_MATCH', label: 'Primary Skill Match Highest Priority' },
      { value: 'ROUND_ROBIN', label: 'Department Round Robin' },
    ],
    defaultValue: 'LEAST_LOADED',
  },
  {
    key: 'ENFORCE_REQUIREMENT_DOCS',
    label: 'Enforce Requirement Document Before Production',
    category: 'production',
    description: 'Require approved Graphic/Video requirement specs before tasks start',
    type: 'boolean',
    defaultValue: 'true',
  },

  // 4. Naming Standards
  {
    key: 'PROJECT_NAMING_RULE',
    label: 'Shoot Project Naming Formula Pattern',
    category: 'naming',
    description: 'Rule template for auto-generating project names (BrandCode-Date-ProductCode)',
    type: 'text',
    defaultValue: 'BrandCode-Date-ProductCode',
    placeholder: 'BrandCode-Date-ProductCode',
  },
  {
    key: 'GRAPHIC_REQ_ID_PREFIX',
    label: 'Graphic Requirement ID Prefix',
    category: 'naming',
    description: 'Prefix used when auto-generating Graphic Requirement IDs (e.g. GR-000001)',
    type: 'text',
    defaultValue: 'GR-',
    placeholder: 'GR-, ART-, GFX-',
  },
  {
    key: 'SCRIPT_ID_PREFIX',
    label: 'Script ID Prefix',
    category: 'naming',
    description: 'Prefix used when auto-generating Script IDs (e.g. SC-000001)',
    type: 'text',
    defaultValue: 'SC-',
    placeholder: 'SC-, SCR-',
  },
  {
    key: 'PROJECT_ID_PREFIX',
    label: 'Shoot Project ID Prefix',
    category: 'naming',
    description: 'Prefix used when auto-generating Shoot Project IDs (e.g. SP-000001)',
    type: 'text',
    defaultValue: 'SP-',
    placeholder: 'SP-, PRJ-',
  },
  {
    key: 'EQUIPMENT_CODE_PREFIX',
    label: 'Equipment Inventory Code Prefix',
    category: 'naming',
    description: 'Prefix used when auto-generating Equipment asset codes (e.g. EQ-000001)',
    type: 'text',
    defaultValue: 'EQ-',
    placeholder: 'EQ-, CAM-, GEAR-',
  },
  {
    key: 'TASK_ID_PREFIX',
    label: 'Production Task ID Prefix',
    category: 'naming',
    description: 'Prefix used when auto-generating Task IDs (e.g. TSK-000001)',
    type: 'text',
    defaultValue: 'TSK-',
    placeholder: 'TSK-, TASK-',
  },

  // 5. Attendance Settings
  {
    key: 'ATTENDANCE_CUTOFF_TIME',
    label: 'Daily Check-in Cutoff Time',
    category: 'attendance',
    description: 'Time after which staff arrivals are marked as LATE',
    type: 'text',
    defaultValue: '10:00 AM',
    placeholder: '10:00 AM',
  },
  {
    key: 'LATE_GRACE_MINUTES',
    label: 'Late Arrival Grace Period',
    category: 'attendance',
    description: 'Allowed grace minutes before late penalty is applied',
    type: 'number',
    defaultValue: '15',
    unit: 'minutes',
  },
  {
    key: 'HALFDAY_MIN_HOURS',
    label: 'Half-Day Minimum Working Hours',
    category: 'attendance',
    description: 'Minimum active shift hours required to qualify for Half-Day presence',
    type: 'number',
    defaultValue: '4.0',
    unit: 'hours',
  },
  {
    key: 'FULLDAY_MIN_HOURS',
    label: 'Full-Day Minimum Working Hours',
    category: 'attendance',
    description: 'Minimum active shift hours required to qualify for Full-Day presence',
    type: 'number',
    defaultValue: '7.5',
    unit: 'hours',
  },
  {
    key: 'AUTO_ABSENT_TIME',
    label: 'Auto-Mark Absent Deadline',
    category: 'attendance',
    description: 'Time at which unmarked staff are automatically logged as ABSENT',
    type: 'text',
    defaultValue: '12:00 PM',
    placeholder: '12:00 PM',
  },

  // 6. Reporting Settings
  {
    key: 'DEFAULT_REPORT_PERIOD',
    label: 'Default Report Timeframe',
    category: 'reporting',
    description: 'Initial period selected when opening operational analytics and reports',
    type: 'select',
    options: [
      { value: 'this_month', label: 'This Month' },
      { value: 'this_week', label: 'This Week' },
      { value: 'today', label: 'Today' },
      { value: 'last_month', label: 'Last Month' },
    ],
    defaultValue: 'this_month',
  },
  {
    key: 'PRODUCTIVITY_SCORE_FORMULA_WEIGHTS',
    label: 'Productivity Composite Score Weights',
    category: 'reporting',
    description: 'Weight breakdown for employee score (Attendance, Target Output, Completion Rate)',
    type: 'text',
    defaultValue: 'Attendance: 20% | Target Output: 30% | Task Completion: 50%',
  },
  {
    key: 'PDF_EXPORT_ORIENTATION',
    label: 'Default PDF Export Page Orientation',
    category: 'reporting',
    description: 'Layout orientation used for generating PDF audit downloads',
    type: 'select',
    options: [
      { value: 'landscape', label: 'Landscape (Recommended for wide tables)' },
      { value: 'portrait', label: 'Portrait' },
    ],
    defaultValue: 'landscape',
  },
  {
    key: 'DAILY_DIGEST_TIME',
    label: 'Automated Operations Summary Schedule',
    category: 'reporting',
    description: 'Daily time when executive operations summary is generated',
    type: 'text',
    defaultValue: '18:00',
    placeholder: '18:00',
  },

  // 7. Notification Settings
  {
    key: 'REMINDER_NOTIFICATIONS_ENABLED',
    label: 'Automated Reminders Engine',
    category: 'notifications',
    description: 'Enable automated scheduled reminders for deadlines, overdue tasks, reviews, and equipment',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'REMINDER_FREQUENCY_HOURS',
    label: 'Reminder Execution Frequency',
    category: 'notifications',
    description: 'Configurable interval between automated reminder evaluation cycles',
    type: 'number',
    defaultValue: '4',
    unit: 'hours',
  },
  {
    key: 'DEADLINE_ALERT_HOURS',
    label: 'Upcoming Deadline Advance Notice',
    category: 'notifications',
    description: 'Hours before task deadline to trigger upcoming deadline reminder notifications',
    type: 'number',
    defaultValue: '24',
    unit: 'hours',
  },
  {
    key: 'OVERDUE_TASK_REMINDER_ENABLED',
    label: 'Overdue Task Reminder Notifications',
    category: 'notifications',
    description: 'Send recurring alerts to assigned employees and managers for overdue tasks',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'PENDING_REVIEW_REMINDER_HOURS',
    label: 'Pending Review Reminder Threshold',
    category: 'notifications',
    description: 'Hours before sending reminders for pending Technical and Media Manager reviews',
    type: 'number',
    defaultValue: '12',
    unit: 'hours',
  },
  {
    key: 'PENDING_CLIENT_CONFIRMATION_HOURS',
    label: 'Pending Client Confirmation Reminder',
    category: 'notifications',
    description: 'Hours before alerting managers about scripts awaiting client confirmation',
    type: 'number',
    defaultValue: '24',
    unit: 'hours',
  },
  {
    key: 'EQUIPMENT_RETURN_REMINDER_HOURS',
    label: 'Equipment Return Due Lead Time',
    category: 'notifications',
    description: 'Hours before scheduled return time to alert crew about equipment return due',
    type: 'number',
    defaultValue: '6',
    unit: 'hours',
  },
  {
    key: 'PENDING_EQUIPMENT_APPROVAL_HOURS',
    label: 'Pending Equipment Approval Reminder',
    category: 'notifications',
    description: 'Hours before reminding Media Managers of pending equipment reservation requests',
    type: 'number',
    defaultValue: '8',
    unit: 'hours',
  },
  {
    key: 'HIGH_PRIORITY_BANNER_ENABLED',
    label: 'Show High Priority Alert Banners',
    category: 'notifications',
    description: 'Display prominent alert banners on top of all staff and manager dashboards',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'BLOCKER_ESCALATION_HOURS',
    label: 'Operational Blocker Escalation Window',
    category: 'notifications',
    description: 'Hours before an unresolved blocker is escalated directly to Media Manager',
    type: 'number',
    defaultValue: '4',
    unit: 'hours',
  },
  {
    key: 'NOTIFY_EQUIPMENT_MAINTENANCE',
    label: 'Equipment Maintenance Status Alerts',
    category: 'notifications',
    description: 'Send notifications when equipment is flagged as damaged or retired',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'AUTO_ARCHIVE_NOTIFICATIONS_ENABLED',
    label: 'Automated Notification Archiving Engine',
    category: 'notifications',
    description: 'Automatically archive old notifications based on retention policy. Archived notifications remain permanently searchable.',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'AUTO_ARCHIVE_AFTER_DAYS',
    label: 'Auto-Archive Age Threshold',
    category: 'notifications',
    description: 'Age threshold in days after which old notifications are automatically moved to archive',
    type: 'number',
    defaultValue: '30',
    unit: 'days',
  },
  {
    key: 'AUTO_ARCHIVE_ONLY_READ',
    label: 'Auto-Archive Only Read Notifications',
    category: 'notifications',
    description: 'Restrict automatic archiving to notifications that have already been marked as Read',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'NOTIFY_OVERLOAD_WORKLOAD',
    label: 'Staff Overload Workload Alerts',
    category: 'notifications',
    description: 'Send warning notification when an employee workload exceeds 100%',
    type: 'boolean',
    defaultValue: 'true',
  },

  // 8. Equipment Settings
  {
    key: 'MAX_RESERVATIONS_PER_SHOOT',
    label: 'Maximum Gear Reservations per Shoot',
    category: 'equipment',
    description: 'Maximum items of equipment that can be reserved for a single shoot project',
    type: 'number',
    defaultValue: '10',
    unit: 'items',
  },
  {
    key: 'BLOCK_MAINTENANCE_CHECKOUT',
    label: 'Block Checkout for Maintenance Equipment',
    category: 'equipment',
    description: 'Prevent equipment marked under repair from being assigned or issued',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'RETURN_INSPECTION_WINDOW_HOURS',
    label: 'Equipment Return Quality Inspection Window',
    category: 'equipment',
    description: 'Hours within which returned gear must be inspected for damages',
    type: 'number',
    defaultValue: '2',
    unit: 'hours',
  },
  {
    key: 'AUTO_FLAG_OVERDUE_RETURNS',
    label: 'Auto-Flag Overdue Equipment Returns',
    category: 'equipment',
    description: 'Automatically trigger alerts for equipment not returned by scheduled time',
    type: 'boolean',
    defaultValue: 'true',
  },

  // 9. Storage Settings
  {
    key: 'MAX_UPLOAD_SIZE_MB',
    label: 'Maximum Deliverable Upload Size',
    category: 'storage',
    description: 'Max file upload size allowed for high-resolution media deliverables',
    type: 'number',
    defaultValue: '500',
    unit: 'MB',
  },
  {
    key: 'ALLOWED_VIDEO_FORMATS',
    label: 'Supported Video Deliverable Codecs & Formats',
    category: 'storage',
    description: 'Permitted video file extensions for master uploads',
    type: 'text',
    defaultValue: 'MP4, MOV, ProRes, AVI, MKV',
  },
  {
    key: 'ALLOWED_GRAPHIC_FORMATS',
    label: 'Supported Graphic & Document Formats',
    category: 'storage',
    description: 'Permitted graphic file extensions for artwork and requirement uploads',
    type: 'text',
    defaultValue: 'PSD, AI, PNG, JPG, PDF, SVG, EPS',
  },
  {
    key: 'REVISION_RETENTION_POLICY',
    label: 'Deliverable Revision Retention Policy',
    category: 'storage',
    description: 'Historical archive policy for previous versions of deliverables',
    type: 'select',
    options: [
      { value: 'KEEP_ALL_PERMANENT', label: 'Keep All Historical Versions Permanently (Audit Compliant)' },
      { value: 'KEEP_LATEST_3', label: 'Keep Latest 3 Versions' },
      { value: 'KEEP_FINAL_ONLY', label: 'Keep Final Approved Version Only' },
    ],
    defaultValue: 'KEEP_ALL_PERMANENT',
  },
  {
    key: 'STORAGE_BASE_PATH',
    label: 'Asset Storage Root Directory',
    category: 'storage',
    description: 'File system path for storing uploaded deliverables and metadata',
    type: 'text',
    defaultValue: 'uploads/media_assets',
  },

  // 10. Security Settings
  {
    key: 'SESSION_TIMEOUT_MINUTES',
    label: 'Session Inactivity Timeout',
    category: 'security',
    description: 'Inactivity duration before user session expires and requires re-login',
    type: 'number',
    defaultValue: '120',
    unit: 'minutes',
  },
  {
    key: 'PASSWORD_MIN_LENGTH',
    label: 'Minimum Password Length Requirement',
    category: 'security',
    description: 'Minimum characters required for employee passwords',
    type: 'number',
    defaultValue: '8',
    unit: 'characters',
  },
  {
    key: 'RBAC_ENFORCEMENT',
    label: 'Role-Based Access Control (RBAC) Enforcement',
    category: 'security',
    description: 'Enforces strict role permissions (Media Manager, Technical Manager, Staff)',
    type: 'select',
    options: [
      { value: 'STRICT_RBAC', label: 'Strict RBAC Enforcement (Active)' },
      { value: 'AUDIT_ONLY', label: 'Permissive with Audit Logging' },
    ],
    defaultValue: 'STRICT_RBAC',
  },
  {
    key: 'AUDIT_LOG_RETENTION',
    label: 'Audit Trail Retention Guarantee',
    category: 'security',
    description: 'Activity logs are immutable and permanently preserved for governance',
    type: 'text',
    defaultValue: 'Permanent & Immutable (Non-Destructive)',
  },
];
