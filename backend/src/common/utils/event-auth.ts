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
  'WAITING_FOR_MEDIA_REVIEW',
  'MEDIA_MANAGER_REVIEW',
  'WAITING_FOR_CLIENT_CONFIRMATION',
  'COMPLETED',
  'CLOSED',
];

export const UNAPPROVED_CALENDAR_STATUSES = [
  'PENDING_MARKETING_APPROVAL',
  'PENDING_APPROVAL',
  'PENDING_CLIENT_APPROVAL',
  'PENDING_CLIENT_REVIEW',
  'DRAFT',
  'CHANGES_REQUESTED',
  'REVISION_REQUESTED',
  'REJECTED',
];

/**
 * Centralized Role-Based Event Ownership & Visibility Authorization
 */
export function canUserViewEvent(
  user: { id: string; role: string } | undefined | null,
  event: any,
): boolean {
  if (!user || !event) return false;

  // 1. ADMIN / ADMINISTRATOR HAS FULL ACCESS
  if (user.role === 'ADMIN' || user.role === 'ADMINISTRATOR') {
    return true;
  }

  // 2. CREATOR CHECK (Creators can always view/manage their created event)
  const isCreator =
    Boolean(event.createdById && event.createdById === user.id) ||
    Boolean(event.createdBy && (event.createdBy.id === user.id || event.createdBy.userId === user.id));

  if (isCreator) {
    return true;
  }

  // 3. DIRECT ASSIGNMENT CHECK
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

  // 4. MANAGERS (Marketing Manager, Media Manager, Social Media Manager)
  if (
    user.role === 'MARKETING_MANAGER' ||
    user.role === 'MEDIA_MANAGER' ||
    user.role === 'SOCIAL_MEDIA_MANAGER'
  ) {
    return true;
  }

  // 5. TECHNICAL_MANAGER: Show if event is waiting for technical review or after technical manager approval
  if (user.role === 'TECHNICAL_MANAGER') {
    const TECH_MANAGER_ALLOWED_EVENT_STATUSES = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'WAITING_FOR_CLIENT_CONFIRMATION',
      'APPROVED',
      'CLIENT_APPROVED',
      'SCHEDULED',
      'PUBLISHED',
      'COMPLETED',
      'CLOSED',
    ];
    return (
      TECH_MANAGER_ALLOWED_EVENT_STATUSES.includes(event.status) ||
      Boolean(event.technicalReviewApproved)
    );
  }

  // 6. CLIENT ACCESS (Client representatives can view approved or submitted review events)
  if (user.role === 'CLIENT' || (user.role as string) === 'CLIENT_USER') {
    const isClientMatch = event.clientId === user.id || (user as any).clientId === event.clientId;
    const clientVisibleStatuses = ['PENDING_CLIENT_APPROVAL', 'PENDING_CLIENT_REVIEW', 'APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'COMPLETED'];
    return Boolean(isClientMatch && clientVisibleStatuses.includes(event.status));
  }

  // 7. APPROVED EVENTS (Operational workflow)
  const isApproved = APPROVED_CALENDAR_STATUSES.includes(event.status);
  return isApproved;
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

  // 2. STAFF: Allow viewing Graphic Requirements assigned to this staff user (both before acceptance to inspect details/assets, and after acceptance)
  if (user.role === 'STAFF' || (user.role as string) === 'STAFF') {
    const isAssigned =
      (Array.isArray(requirement.tasks) &&
        requirement.tasks.some(
          (t: any) =>
            (Array.isArray(t.assignedEmployees) &&
              t.assignedEmployees.some(
                (e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id,
              )) ||
            t.assignedToId === user.id,
        )) ||
      requirement.assignedToId === user.id ||
      (requirement.deliverables &&
        Array.isArray(requirement.deliverables) &&
        requirement.deliverables.some((d: any) => d.assignedStaffId === user.id)) ||
      requirement.createdById === user.id ||
      (requirement.project?.assignedTeam &&
        requirement.project.assignedTeam.some((tm: any) => tm.userId === user.id || tm.user?.id === user.id));
    return Boolean(isAssigned);
  }

  // 3. TECHNICAL_MANAGER: Strictly show graphic requirements that have reached
  // the stage of waiting for technical manager approval or after that.
  if (user.role === 'TECHNICAL_MANAGER') {
    const TECH_MANAGER_ALLOWED_STATUSES = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'WAITING_FOR_CLIENT_CONFIRMATION',
      'CLIENT_CONFIRMATION',
      'CLIENT_REVISION_REQUESTED',
      'COMPLETED',
      'CLOSED',
    ];
    return (
      TECH_MANAGER_ALLOWED_STATUSES.includes(requirement.status) ||
      Boolean(requirement.technicalReviewApproved) ||
      Boolean(requirement.project && TECH_MANAGER_ALLOWED_STATUSES.includes(requirement.project.status)) ||
      Boolean(
        Array.isArray(requirement.tasks) &&
          requirement.tasks.some(
            (t: any) => TECH_MANAGER_ALLOWED_STATUSES.includes(t.status) || t.technicalReviewApproved,
          ),
      ) ||
      Boolean(
        Array.isArray(requirement.approvals) &&
          requirement.approvals.some((a: any) => a.approvalType === 'TECHNICAL_REVIEW'),
      )
    );
  }

  // 3. CREATOR CHECK
  const isCreator =
    Boolean(requirement.createdById && requirement.createdById === user.id) ||
    Boolean(requirement.createdBy && (requirement.createdBy.id === user.id || requirement.createdBy.userId === user.id)) ||
    Boolean(requirement.calendarEvent && (requirement.calendarEvent.createdById === user.id || requirement.calendarEvent.createdBy?.id === user.id)) ||
    Boolean(
      Array.isArray(requirement.sourceForCalendarEvents) &&
        requirement.sourceForCalendarEvents.some(
          (s: any) => s.createdById === user.id || s.createdBy?.id === user.id,
        ),
    );

  if (isCreator) return true;

  // 4. DIRECT ASSIGNMENT CHECK — ASSIGNED USERS ALWAYS HAVE ACCESS REGARDLESS OF APPROVAL STATUS
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
      requirement.project.createdById === user.id ||
      (Array.isArray(requirement.project.tasks) &&
        requirement.project.tasks.some(
          (t: any) =>
            t.assignedToId === user.id ||
            (Array.isArray(t.assignedEmployees) &&
              t.assignedEmployees.some(
                (e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id,
              )),
        )));

  const isDeliverableAssigned =
    Array.isArray(requirement.deliverables) &&
    requirement.deliverables.some(
      (d: any) =>
        d.assignedStaffId === user.id ||
        d.assignedStaff?.id === user.id ||
        d.createdById === user.id ||
        d.createdBy?.id === user.id,
    );

  const isCalendarAssigned =
    Boolean(
      requirement.calendarEvent &&
        (requirement.calendarEvent.assignedStaffId === user.id ||
          (Array.isArray(requirement.calendarEvent.tasks) &&
            requirement.calendarEvent.tasks.some(
              (t: any) =>
                t.assignedToId === user.id ||
                (Array.isArray(t.assignedEmployees) &&
                  t.assignedEmployees.some(
                    (e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id,
                  )),
            ))),
    ) ||
    Boolean(
      Array.isArray(requirement.sourceForCalendarEvents) &&
        requirement.sourceForCalendarEvents.some(
          (s: any) => s.assignedStaffId === user.id,
        ),
    );

  if (isTaskAssigned || isProjectAssigned || isDeliverableAssigned || isCalendarAssigned) {
    return true;
  }

  // 5. ROLE APPROVAL GATES FOR UNASSIGNED REQUIREMENTS
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

  // 3. TASK ACCEPTANCE & ASSIGNMENT CHECK
  // For STAFF users, if they are assigned to any tasks on this project, at least one task assignment MUST be accepted
  if (user.role === 'STAFF') {
    const userTasks = (Array.isArray(project.tasks) ? project.tasks : []).filter((t: any) =>
      t.assignedToId === user.id ||
      (Array.isArray(t.assignedEmployees) && t.assignedEmployees.some((e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id))
    );

    if (userTasks.length > 0) {
      const hasAcceptedTask = userTasks.some((t: any) =>
        Array.isArray(t.assignedEmployees) &&
        t.assignedEmployees.some(
          (e: any) => (e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id) && e.acceptanceStatus === 'ACCEPTED',
        )
      );
      if (!hasAcceptedTask) {
        return false; // Gated: Task assignment pending acceptance!
      }
      return true;
    }
  }

  const isTeamMember =
    Array.isArray(project.assignedTeam) &&
    project.assignedTeam.some((t: any) => t.userId === user.id || t.user?.id === user.id);
  if (isTeamMember) return true;

  const isTaskAssigned =
    Array.isArray(project.tasks) &&
    project.tasks.some(
      (t: any) =>
        (user.role !== 'STAFF' && t.assignedToId === user.id) ||
        (Array.isArray(t.assignedEmployees) &&
          t.assignedEmployees.some(
            (e: any) =>
              (e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id) &&
              (user.role !== 'STAFF' || e.acceptanceStatus === 'ACCEPTED'),
          )),
    );
  if (isTaskAssigned) return true;

  const isScriptAssigned =
    Array.isArray(project.scripts) &&
    project.scripts.some(
      (s: any) =>
        s.authorId === user.id ||
        s.createdById === user.id ||
        s.writerId === user.id ||
        (user.role !== 'STAFF' && s.assignedToId === user.id) ||
        (Array.isArray(s.scriptAssignments) &&
          s.scriptAssignments.some((sa: any) => sa.userId === user.id || sa.user?.id === user.id)) ||
        (Array.isArray(s.tasks) &&
          s.tasks.some(
            (t: any) =>
              Array.isArray(t.assignedEmployees) &&
              t.assignedEmployees.some(
                (e: any) =>
                  (e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id) &&
                  (user.role !== 'STAFF' || e.acceptanceStatus === 'ACCEPTED'),
              ),
          )),
    );
  if (isScriptAssigned) return true;

  const isGraphicReqAssigned =
    Array.isArray(project.graphicRequirements) &&
    project.graphicRequirements.some(
      (g: any) =>
        g.createdById === user.id ||
        (user.role !== 'STAFF' && g.assignedToId === user.id) ||
        (Array.isArray(g.tasks) &&
          g.tasks.some(
            (t: any) =>
              (user.role !== 'STAFF' && t.assignedToId === user.id) ||
              (Array.isArray(t.assignedEmployees) &&
                t.assignedEmployees.some(
                  (e: any) =>
                    (e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id) &&
                    (user.role !== 'STAFF' || e.acceptanceStatus === 'ACCEPTED'),
                )),
          )),
    );
  if (isGraphicReqAssigned) return true;

  // 4. MANAGERS (Marketing Manager, Media Manager, Social Media Manager)
  if (
    user.role === 'MARKETING_MANAGER' ||
    user.role === 'MEDIA_MANAGER' ||
    user.role === 'SOCIAL_MEDIA_MANAGER'
  ) {
    return true;
  }

  // 5. TECHNICAL_MANAGER: Strictly show projects that have reached the stage of
  // waiting for technical manager approval or after that (or have pending technical review approvals)
  if (user.role === 'TECHNICAL_MANAGER') {
    const TECH_MANAGER_ALLOWED_PROJECT_STATUSES = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'POST_PRODUCTION',
      'WAITING_FOR_CLIENT_CONFIRMATION',
      'COMPLETED',
      'CLOSED',
      'DELIVERED',
    ];
    const hasPendingTechApproval = Array.isArray(project.approvals) && project.approvals.some(
      (a: any) => a.approvalType === 'TECHNICAL_REVIEW' || a.targetRole === 'TECHNICAL_MANAGER'
    );
    const hasPendingTaskReview = Array.isArray(project.tasks) && project.tasks.some(
      (t: any) => t.status === 'WAITING_FOR_TECHNICAL_REVIEW' || t.status === 'IN_REVISION' || t.status === 'COMPLETED'
    );
    return (
      TECH_MANAGER_ALLOWED_PROJECT_STATUSES.includes(project.status) ||
      Boolean(project.technicalReviewApproved) ||
      Boolean(hasPendingTechApproval) ||
      Boolean(hasPendingTaskReview)
    );
  }

  // 6. Linked Calendar Event Gate check for other roles
  if (project.calendarEvent) {
    if (!canUserViewEvent(user, project.calendarEvent)) {
      return false;
    }
  }

  // 7. Unassigned Staff cannot view unassigned projects
  if (user.role === 'STAFF') {
    return false;
  }

  // Check Project own status
  const UNAPPROVED_PROJECT_STATUSES = [
    'PENDING_MARKETING_APPROVAL',
    'PENDING_APPROVAL',
    'PENDING_CLIENT_APPROVAL',
    'DRAFT',
    'CHANGES_REQUESTED',
    'REVISION_REQUESTED',
  ];

  const isProjectUnapproved = UNAPPROVED_PROJECT_STATUSES.includes(project.status);

  if (isProjectUnapproved) {
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

  const isAssigned =
    task.assignedToId === user.id ||
    (Array.isArray(task.assignedEmployees) &&
      task.assignedEmployees.some(
        (e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id,
      ));

  // 2. TECHNICAL_MANAGER: Strictly show tasks that have reached the stage of
  // waiting for technical manager approval or after that.
  if (user.role === 'TECHNICAL_MANAGER') {
    const TECH_MANAGER_ALLOWED_TASK_STATUSES = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW',
      'WAITING_FOR_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'MEDIA_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'WAITING_FOR_CLIENT_CONFIRMATION',
      'CLIENT_CONFIRMATION',
      'CLIENT_REVISION_REQUESTED',
      'COMPLETED',
      'CLOSED',
      'APPROVED',
      'SCHEDULED',
      'PUBLISHED',
    ];
    return (
      TECH_MANAGER_ALLOWED_TASK_STATUSES.includes(task.status) ||
      Boolean(task.technicalReviewApproved)
    );
  }

  const isCreator = Boolean(task.createdById && task.createdById === user.id);
  if (isCreator) return true;

  if (
    user.role === 'MEDIA_MANAGER' ||
    user.role === 'MARKETING_MANAGER'
  ) {
    return true;
  }

  if (user.role === 'STAFF' || user.role === 'SOCIAL_MEDIA_MANAGER') {
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

  // 2. TECHNICAL_MANAGER: Strictly show scripts that have reached the stage of
  // waiting for technical manager approval or after that
  if (user.role === 'TECHNICAL_MANAGER') {
    const TECH_MANAGER_ALLOWED_SCRIPT_STATUSES = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW_PENDING',
      'SUBMITTED_FOR_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'WAITING_FOR_MARKETING_APPROVAL',
      'PENDING_MARKETING_APPROVAL',
      'WAITING_FOR_CLIENT_CONFIRMATION',
      'PENDING_CLIENT_APPROVAL',
      'CLIENT_REVIEW',
      'APPROVED',
      'COMPLETED',
      'CLOSED',
    ];
    return (
      TECH_MANAGER_ALLOWED_SCRIPT_STATUSES.includes(script.status) ||
      Boolean(script.technicalReviewApproved) ||
      ['TECHNICAL_REVIEW_APPROVED', 'MEDIA_REVIEW_APPROVED', 'MARKETING_APPROVED', 'CLIENT_APPROVED', 'COMPLETED'].includes(script.approvalStatus)
    );
  }

  const isCreator =
    Boolean(script.authorId && script.authorId === user.id) ||
    Boolean(script.createdById && script.createdById === user.id) ||
    Boolean(script.writerId && script.writerId === user.id);
  if (isCreator) return true;

  if (
    user.role === 'MEDIA_MANAGER' ||
    user.role === 'MARKETING_MANAGER'
  ) {
    return true;
  }

  if (user.role === 'STAFF' || user.role === 'SOCIAL_MEDIA_MANAGER') {
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
        ((Array.isArray(script.project.assignedTeam) &&
          script.project.assignedTeam.some((t: any) => t.userId === user.id || t.user?.id === user.id)) ||
          script.project.createdById === user.id ||
          (Array.isArray(script.project.tasks) &&
            script.project.tasks.some(
              (t: any) =>
                Array.isArray(t.assignedEmployees) &&
                t.assignedEmployees.some((e: any) => e.userId === user.id || e.employeeId === user.id || e.user?.id === user.id),
            ))));
    return Boolean(isAssigned);
  }

  return true;
}
