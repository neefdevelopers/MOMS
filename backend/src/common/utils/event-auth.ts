export const APPROVED_CALENDAR_STATUSES = [
  'APPROVED',
  'CLIENT_APPROVED',
  'SCHEDULED',
  'PUBLISHED',
  'READY',
  'OPERATIONAL',
  'TASK_ASSIGNED',
  'IN_PRODUCTION',
  'WAITING_FOR_TECHNICAL_REVIEW',
  'TECHNICAL_REVIEW',
];

export const UNAPPROVED_CALENDAR_STATUSES = [
  'PENDING_MARKETING_APPROVAL',
  'PENDING_APPROVAL',
  'PENDING_CLIENT_APPROVAL',
  'PENDING_CLIENT_REVIEW',
  'DRAFT',
  'CHANGES_REQUESTED',
  'REVISION_REQUESTED',
  'WAITING_FOR_MEDIA_REVIEW',
];

/**
 * Centralized Role-Based Event Ownership & Visibility Authorization
 */
export function canUserViewEvent(
  user: { id: string; role: string } | undefined | null,
  event: any,
): boolean {
  if (!user || !event) return false;

  // 1. ADMIN / ADMINISTRATOR HAS FULL OVERDRAFT ACCESS
  if (user.role === 'ADMIN' || user.role === 'ADMINISTRATOR') {
    return true;
  }

  // 2. CREATOR CHECK (PRIMARY RULE — FIRST PRIORITY)
  const isCreator =
    Boolean(event.createdById && event.createdById === user.id) ||
    Boolean(event.createdBy && (event.createdBy.id === user.id || event.createdBy.userId === user.id));

  if (isCreator) {
    return true;
  }

  // 3. DIRECT ASSIGNMENT CHECK — ASSIGNED USERS ALWAYS HAVE ACCESS REGARDLESS OF APPROVAL STATUS
  const isAssigned =
    Boolean(event.assignedStaffId && event.assignedStaffId === user.id) ||
    Boolean(event.approvalAssignedToId && event.approvalAssignedToId === user.id) ||
    Boolean(event.graphicRequirement && (event.graphicRequirement.assignedToId === user.id || event.graphicRequirement.createdById === user.id)) ||
    Boolean(event.shoot && (event.shoot.directorId === user.id || event.shoot.leadPhotographerId === user.id || event.shoot.leadVideographerId === user.id || event.shoot.createdById === user.id)) ||
    (Array.isArray(event.assignedTeam) &&
      event.assignedTeam.some((t: any) => t.userId === user.id || t.user?.id === user.id)) ||
    (Array.isArray(event.tasks) &&
      event.tasks.some(
        (t: any) =>
          t.assignedToId === user.id ||
          (Array.isArray(t.assignedEmployees) &&
            t.assignedEmployees.some((e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id)),
      ));

  if (isAssigned) {
    return true;
  }

  // 4. WORKFLOW & APPROVAL STATUS CHECK
  const isApproved = APPROVED_CALENDAR_STATUSES.includes(event.status);

  // RULE A: IF APPROVED BY MARKETING MANAGER (Passed Marketing Gate)
  if (isApproved) {
    if (
      user.role === 'MEDIA_MANAGER' ||
      user.role === 'SOCIAL_MEDIA_MANAGER' ||
      user.role === 'MARKETING_MANAGER' ||
      user.role === 'TECHNICAL_MANAGER'
    ) {
      return true;
    }
    if (user.role === 'STAFF') {
      return false; // Unassigned staff cannot view
    }
    return true;
  }

  // RULE B: IF UNAPPROVED (Waiting for Marketing Approval / Draft / Revision Requested)
  if (user.role === 'MARKETING_MANAGER' || user.role === 'MEDIA_MANAGER' || user.role === 'SOCIAL_MEDIA_MANAGER') {
    return true;
  }

  return false;
}

/**
 * Centralized Authorization for Graphic Requirements
 */
export function canUserViewRequirement(
  user: { id: string; role: string } | undefined | null,
  requirement: any,
): boolean {
  if (!user || !requirement) return false;

  // 1. ADMIN
  if (user.role === 'ADMIN' || user.role === 'ADMINISTRATOR') return true;

  // 2. CREATOR CHECK
  const isCreator =
    Boolean(requirement.createdById && requirement.createdById === user.id) ||
    Boolean(requirement.createdBy && (requirement.createdBy.id === user.id || requirement.createdBy.userId === user.id));

  if (isCreator) return true;

  // 3. DIRECT ASSIGNMENT CHECK — ASSIGNED USERS ALWAYS HAVE ACCESS REGARDLESS OF APPROVAL STATUS
  const isTaskAssigned =
    Array.isArray(requirement.tasks) &&
    requirement.tasks.some(
      (t: any) =>
        t.assignedToId === user.id ||
        (Array.isArray(t.assignedEmployees) &&
          t.assignedEmployees.some(
            (e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id,
          )),
    );

  const isProjectAssigned =
    requirement.project &&
    ((Array.isArray(requirement.project.assignedTeam) &&
      requirement.project.assignedTeam.some((t: any) => t.userId === user.id || t.user?.id === user.id)) ||
      requirement.project.createdById === user.id);

  if (isTaskAssigned || isProjectAssigned) {
    return true;
  }

  // 4. ROLE APPROVAL GATES FOR UNASSIGNED REQUIREMENTS
  if (user.role === 'STAFF') {
    return false; // Unassigned staff cannot view
  }

  const UNAPPROVED_REQ_STATUSES = [
    'PENDING_MARKETING_APPROVAL',
    'PENDING_APPROVAL',
    'PENDING_CLIENT_APPROVAL',
    'DRAFT',
    'CHANGES_REQUESTED',
    'REVISION_REQUESTED',
    'WAITING_FOR_MEDIA_REVIEW',
  ];

  const isReqUnapproved = UNAPPROVED_REQ_STATUSES.includes(requirement.status);

  if (user.role === 'MARKETING_MANAGER' || user.role === 'MEDIA_MANAGER' || user.role === 'SOCIAL_MEDIA_MANAGER') {
    return true;
  }

  if (user.role === 'TECHNICAL_MANAGER' && isReqUnapproved) {
    return false;
  }

  if (isReqUnapproved) {
    return false;
  }

  return true;
}

/**
 * Centralized Authorization for Shoot Projects
 */
export function canUserViewProject(
  user: { id: string; role: string } | undefined | null,
  project: any,
): boolean {
  if (!user || !project) return false;

  // 1. ADMIN
  if (user.role === 'ADMIN' || user.role === 'ADMINISTRATOR') return true;

  // 2. CREATOR CHECK
  const isCreator =
    Boolean(project.createdById && project.createdById === user.id) ||
    Boolean(project.createdBy && (project.createdBy.id === user.id || project.createdBy.userId === user.id)) ||
    Boolean(project.calendarEvent && (project.calendarEvent.createdById === user.id || project.calendarEvent.createdBy?.id === user.id));

  if (isCreator) return true;

  // Linked Calendar Event Gate check
  if (project.calendarEvent) {
    if (!canUserViewEvent(user, project.calendarEvent)) {
      return false;
    }
  }

  // Check Project own status
  const UNAPPROVED_PROJECT_STATUSES = [
    'PENDING_MARKETING_APPROVAL',
    'PENDING_APPROVAL',
    'PENDING_CLIENT_APPROVAL',
    'DRAFT',
    'CHANGES_REQUESTED',
    'REVISION_REQUESTED',
    'PLANNED',
  ];

  const isProjectUnapproved = UNAPPROVED_PROJECT_STATUSES.includes(project.status);

  if (user.role === 'MARKETING_MANAGER') return true;

  if (user.role === 'TECHNICAL_MANAGER' && isProjectUnapproved) {
    return false;
  }

  if (isProjectUnapproved) {
    return false;
  }

  // 3. STAFF ROLE SPECIFIC ASSIGNMENT RULE:
  // Staff MUST be assigned to the project team, its tasks, or its graphic requirements to view it
  if (user.role === 'STAFF') {
    const isTeamMember =
      Array.isArray(project.assignedTeam) &&
      project.assignedTeam.some((t: any) => t.userId === user.id || t.user?.id === user.id);
    if (isTeamMember) return true;

    const isTaskAssigned =
      Array.isArray(project.tasks) &&
      project.tasks.some(
        (t: any) =>
          t.assignedToId === user.id ||
          (Array.isArray(t.assignedEmployees) &&
            t.assignedEmployees.some(
              (e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id,
            )),
      );
    if (isTaskAssigned) return true;

    const isGraphicReqAssigned =
      Array.isArray(project.graphicRequirements) &&
      project.graphicRequirements.some(
        (g: any) =>
          g.createdById === user.id ||
          (Array.isArray(g.tasks) &&
            g.tasks.some(
              (t: any) =>
                Array.isArray(t.assignedEmployees) &&
                t.assignedEmployees.some(
                  (e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id,
                ),
            )),
      );
    if (isGraphicReqAssigned) return true;

    return false;
  }

  return true;
}

/**
 * Centralized Authorization for Tasks
 */
export function canUserViewTask(
  user: { id: string; role: string } | undefined | null,
  task: any,
): boolean {
  if (!user || !task) return false;

  if (user.role === 'ADMIN' || user.role === 'ADMINISTRATOR') return true;

  const isCreator = Boolean(task.createdById && task.createdById === user.id);
  if (isCreator) return true;

  if (
    user.role === 'MEDIA_MANAGER' ||
    user.role === 'TECHNICAL_MANAGER' ||
    user.role === 'MARKETING_MANAGER' ||
    user.role === 'SOCIAL_MEDIA_MANAGER'
  ) {
    return true;
  }

  if (user.role === 'STAFF') {
    const isAssigned =
      task.assignedToId === user.id ||
      (Array.isArray(task.assignedEmployees) &&
        task.assignedEmployees.some(
          (e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id,
        ));
    return isAssigned;
  }

  return true;
}

/**
 * Centralized Authorization for Scripts
 */
export function canUserViewScript(
  user: { id: string; role: string } | undefined | null,
  script: any,
): boolean {
  if (!user || !script) return false;

  if (user.role === 'ADMIN' || user.role === 'ADMINISTRATOR') return true;

  const isCreator =
    Boolean(script.authorId && script.authorId === user.id) ||
    Boolean(script.createdById && script.createdById === user.id) ||
    Boolean(script.writerId && script.writerId === user.id);
  if (isCreator) return true;

  if (
    user.role === 'MEDIA_MANAGER' ||
    user.role === 'TECHNICAL_MANAGER' ||
    user.role === 'MARKETING_MANAGER' ||
    user.role === 'SOCIAL_MEDIA_MANAGER'
  ) {
    return true;
  }

  if (user.role === 'STAFF') {
    const isAssigned =
      script.assignedToId === user.id ||
      script.writerId === user.id ||
      (Array.isArray(script.scriptAssignments) &&
        script.scriptAssignments.some((sa: any) => sa.userId === user.id || sa.user?.id === user.id)) ||
      (Array.isArray(script.tasks) &&
        script.tasks.some(
          (t: any) =>
            Array.isArray(t.assignedEmployees) &&
            t.assignedEmployees.some((e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id),
        )) ||
      (script.project &&
        Array.isArray(script.project.assignedTeam) &&
        script.project.assignedTeam.some((t: any) => t.userId === user.id || t.user?.id === user.id));
    return isAssigned;
  }

  return true;
}
