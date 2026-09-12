import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShootType, ProjectStatus, Priority, PermissionStatus, WeatherStatus, StudioBookingStatus, EquipmentAvailability, TaskStatus, Role } from '../../common/enums';
import { canUserViewEvent, canUserViewProject } from '../../common/utils/event-auth';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    clientId?: string;
    brandId?: string;
    productId?: string;
    shootType?: string;
    status?: string;
    priority?: string;
    date?: string;
    mediaManagerId?: string;
    technicalManagerId?: string;
    assignedUserId?: string;
    location?: string;
    archived?: boolean;
    userId?: string;
    role?: string;
    createdBy?: string;
  }) {
    const where: any = {};
    const andConditions: any[] = [];

    if (params.clientId) where.clientId = params.clientId;
    if (params.brandId) where.brandId = params.brandId;
    if (params.productId) where.productId = params.productId;
    if (params.shootType) {
      if (params.shootType === 'INDOOR') {
        where.shootType = 'INDOOR';
      } else if (params.shootType === 'OUTDOOR') {
        where.shootType = 'OUTDOOR';
      } else if (params.shootType === 'SHOOT') {
        where.shootType = { in: ['INDOOR', 'OUTDOOR'] };
      } else if (params.shootType === 'GRAPHIC_REQ' || params.shootType === 'GRAPHIC_REQUIREMENT') {
        andConditions.push({
          OR: [
            { graphicRequirements: { some: {} } },
            { calendarEvent: { eventSource: 'GRAPHIC_REQUIREMENT' } },
          ],
        });
      }
    }
    if (params.priority) where.priority = params.priority;

    if (params.createdBy) {
      andConditions.push({
        OR: [
          { createdById: params.createdBy },
          { calendarEvent: { createdById: params.createdBy } },
        ],
      });
    }

    if (params.archived) {
      where.status = ProjectStatus.ARCHIVED;
    } else if (params.status === 'PENDING_APPROVAL' || params.status === 'PENDING') {
      andConditions.push({
        OR: [
          { status: 'PENDING_CLIENT_APPROVAL' },
          { status: 'PLANNED' },
          { calendarEvent: { status: { in: ['PENDING_CLIENT_APPROVAL', 'PENDING_CLIENT_REVIEW'] } } },
        ],
      });
    } else if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    } else {
      where.status = { not: ProjectStatus.ARCHIVED };
    }

    if (params.date) {
      const targetDate = new Date(params.date);
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(new Date(params.date).setHours(0, 0, 0, 0));
        const endOfDay = new Date(new Date(params.date).setHours(23, 59, 59, 999));
        where.shootDate = { gte: startOfDay, lte: endOfDay };
      }
    }

    if (params.mediaManagerId) {
      where.createdById = params.mediaManagerId;
    }

    if (params.technicalManagerId) {
      where.assignedTeam = {
        some: { user: { id: params.technicalManagerId } },
      };
    }

    if (params.assignedUserId) {
      andConditions.push({
        OR: [
          { assignedTeam: { some: { userId: params.assignedUserId } } },
          { tasks: { some: { assignedEmployees: { some: { userId: params.assignedUserId } } } } },
        ],
      });
    }

    if (params.location?.trim()) {
      where.shootLocation = { contains: params.location.trim() };
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      andConditions.push({
        OR: [
          { name: { contains: q } },
          { projectId: { contains: q } },
          { shootLocation: { contains: q } },
          { locationAddress: { contains: q } },
          { influencerTalent: { contains: q } },
          { shootType: { contains: q } },
          { client: { name: { contains: q } } },
          { brand: { name: { contains: q } } },
          { brand: { shortCode: { contains: q } } },
          { product: { name: { contains: q } } },
          { campaign: { name: { contains: q } } },
          { assignedTeam: { some: { user: { name: { contains: q } } } } },
        ],
      });
    }

    // Role filtering for STAFF: only projects they are assigned to, have tasks for, or created
    if (params.role === 'STAFF' && params.userId) {
      andConditions.push({
        OR: [
          { createdById: params.userId },
          { assignedTeam: { some: { userId: params.userId } } },
          { tasks: { some: { assignedEmployees: { some: { userId: params.userId, acceptanceStatus: 'ACCEPTED' } } } } },
          { scripts: { some: { scriptAssignments: { some: { userId: params.userId } } } } },
          { scripts: { some: { tasks: { some: { assignedEmployees: { some: { userId: params.userId, acceptanceStatus: 'ACCEPTED' } } } } } } },
          { graphicRequirements: { some: { tasks: { some: { assignedEmployees: { some: { userId: params.userId, acceptanceStatus: 'ACCEPTED' } } } } } } },
        ],
      });
    }

    // CRITICAL BUSINESS RULE:
    // Content creation and approval roles (SOCIAL_MEDIA_MANAGER, MEDIA_MANAGER, MARKETING_MANAGER, ADMIN) can view pending projects in their sessions.
    // Execution roles (TECHNICAL_MANAGER, STAFF, etc.) can ONLY view projects once approved by Marketing Manager (or if created by themselves or assigned).
    const APPROVED_CALENDAR_STATUSES = ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'OPERATIONAL', 'TASK_ASSIGNED', 'IN_PRODUCTION'];
    const CREATOR_AND_APPROVER_ROLES = ['SOCIAL_MEDIA_MANAGER', 'MEDIA_MANAGER', 'MARKETING_MANAGER', 'ADMIN', 'ADMINISTRATOR'];

    if (params.role && !CREATOR_AND_APPROVER_ROLES.includes(params.role) && params.userId) {
      const eventVisibilityFilter = {
        OR: [
          { calendarEventId: null },
          { calendarEvent: { status: { in: APPROVED_CALENDAR_STATUSES } } },
          { calendarEvent: { createdById: params.userId } },
          { createdById: params.userId },
          { assignedTeam: { some: { userId: params.userId } } },
          { tasks: { some: { assignedEmployees: { some: { userId: params.userId, acceptanceStatus: 'ACCEPTED' } } } } },
          { graphicRequirements: { some: { tasks: { some: { assignedEmployees: { some: { userId: params.userId, acceptanceStatus: 'ACCEPTED' } } } } } } },
        ],
      };

      andConditions.push(eventVisibilityFilter);
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const rawProjects = await this.prisma.shootProject.findMany({
      where,
      include: {
        client: true,
        brand: true,
        product: true,
        campaign: true,
        calendarEvent: true,
        indoorDetails: true,
        outdoorDetails: true,
        assignedTeam: { include: { user: true } },
        tasks: { include: { assignedEmployees: { include: { user: true } } } },
        scripts: { include: { scriptAssignments: true } },
        graphicRequirements: { include: { tasks: { include: { assignedEmployees: true } } } },
        _count: {
          select: {
            tasks: true,
            scripts: true,
            graphicRequirements: true,
            files: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (params.userId && params.role) {
      return rawProjects.filter((p) =>
        canUserViewProject({ id: params.userId!, role: params.role! }, p),
      );
    }
    return rawProjects;
  }

  async findOne(id: string, currentUser?: any) {
    const includeConfig = {
      client: true,
      brand: true,
      product: true,
      campaign: true,
      calendarEvent: true,
      createdBy: true,
      indoorDetails: true,
      outdoorDetails: true,
      assignedTeam: { include: { user: { include: { employeeProfile: { include: { department: true } } } } } },
      scripts: {
        include: {
          tasks: { include: { assignedEmployees: { include: { user: true } } } },
          files: true,
          scriptAssignments: { include: { user: true } },
          createdBy: { select: { id: true, name: true, role: true, email: true } },
        },
        orderBy: { createdAt: 'desc' as const },
      },
      graphicRequirements: {
        include: {
          tasks: { include: { assignedEmployees: { include: { user: true } } } },
          files: true,
          deliverables: true,
        },
        orderBy: { createdAt: 'desc' as const },
      },
      tasks: { include: { assignedEmployees: { include: { user: true } } } },
      approvals: { include: { reviewer: true }, orderBy: { reviewedAt: 'desc' as const } },
      clientConfirmations: { orderBy: { createdAt: 'desc' as const } },
      revisions: { orderBy: { createdAt: 'desc' as const } },
      equipmentReservations: { include: { equipment: true } },
      equipmentRequests: {
        include: {
          equipment: true,
          requestedBy: { select: { id: true, name: true, email: true, role: true } },
          reviewedBy: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' as const },
      },
      equipmentMovements: { include: { equipment: true, user: true }, orderBy: { timestamp: 'desc' as const } },
      files: { include: { uploadedBy: true }, orderBy: { createdAt: 'desc' as const } },
      communications: { include: { sender: true }, orderBy: { createdAt: 'desc' as const } },
    };

    let project = await this.prisma.shootProject.findUnique({
      where: { id },
      include: includeConfig,
    }).catch(() => null);

    if (!project) {
      project = await this.prisma.shootProject.findFirst({
        where: {
          OR: [
            { projectId: id },
            { id: id },
          ],
        },
        include: includeConfig,
      });
    }

    if (!project) throw new NotFoundException('Project not found');

    // Also fetch any scripts, graphic requirements, and tasks linked via project code, task relation, or calendar event
    const taskScriptIds = (project.tasks || [])
      .map((t: any) => t.scriptId)
      .filter((sid: string) => Boolean(sid));

    const [extraScripts, extraGraphicReqs, extraTasks] = await Promise.all([
      this.prisma.script.findMany({
        where: {
          OR: [
            { projectId: project.id },
            { projectId: project.projectId },
            ...(taskScriptIds.length > 0 ? [{ id: { in: taskScriptIds } }] : []),
            ...(project.id ? [{ tasks: { some: { projectId: project.id } } }] : []),
            ...(project.projectId ? [{ tasks: { some: { projectId: project.projectId } } }] : []),
            ...(project.id ? [{ files: { some: { projectId: project.id } } }] : []),
          ],
        },
        include: {
          tasks: { include: { assignedEmployees: { include: { user: true } } } },
          files: true,
          scriptAssignments: { include: { user: true } },
          createdBy: { select: { id: true, name: true, role: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      this.prisma.graphicRequirement.findMany({
        where: {
          OR: [
            { projectId: project.id },
            { projectId: project.projectId },
            ...(project.calendarEventId ? [{ calendarEventId: project.calendarEventId }] : []),
          ],
        },
        include: {
          tasks: { include: { assignedEmployees: { include: { user: true } } } },
          files: true,
          deliverables: true,
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      this.prisma.task.findMany({
        where: {
          OR: [
            { projectId: project.id },
            { projectId: project.projectId },
            ...(project.calendarEventId
              ? [
                  { project: { calendarEventId: project.calendarEventId } },
                  { graphicRequirement: { calendarEventId: project.calendarEventId } },
                ]
              : []),
          ],
        },
        include: {
          assignedEmployees: { include: { user: { include: { employeeProfile: true } } } },
          revisions: { include: { requestedBy: true, assignedTo: true } },
          client: true,
          brand: true,
          product: true,
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    ]);

    const scriptMap = new Map<string, any>();
    (project.scripts || []).forEach((s: any) => scriptMap.set(s.id, s));
    extraScripts.forEach((s: any) => scriptMap.set(s.id, s));
    project.scripts = Array.from(scriptMap.values());

    const grMap = new Map<string, any>();
    (project.graphicRequirements || []).forEach((g: any) => grMap.set(g.id, g));
    extraGraphicReqs.forEach((g: any) => grMap.set(g.id, g));
    project.graphicRequirements = Array.from(grMap.values());

    const taskMap = new Map<string, any>();
    (project.tasks || []).forEach((t: any) => taskMap.set(t.id, t));
    extraTasks.forEach((t: any) => taskMap.set(t.id, t));
    // Also include tasks nested in scripts and graphic requirements
    project.scripts.forEach((s: any) => {
      (s.tasks || []).forEach((t: any) => {
        if (!taskMap.has(t.id)) taskMap.set(t.id, { ...t, script: s });
      });
    });
    project.graphicRequirements.forEach((g: any) => {
      (g.tasks || []).forEach((t: any) => {
        if (!taskMap.has(t.id)) taskMap.set(t.id, { ...t, graphicRequirement: g });
      });
    });
    project.tasks = Array.from(taskMap.values());

    if (currentUser && currentUser.id && currentUser.role) {
      if (!canUserViewProject(currentUser, project)) {
        throw new ForbiddenException(
          'Access Denied: Project shoot waiting for Marketing Approval is hidden from Technical Manager.',
        );
      }
    }

    // Rule: Staff members shall not view projects unrelated to their assignments, and sibling items are filtered
    if (currentUser?.role === 'STAFF') {
      const isCreator = project.createdById === currentUser.id;
      const isTeamMember = project.assignedTeam?.some((t) => t.userId === currentUser.id);
      const isTaskAssignee = project.tasks?.some((task) =>
        task.assignedEmployees?.some((e) => e.userId === currentUser.id),
      );
      const isScriptAssignee = project.scripts?.some(
        (script) =>
          (script as any).assignedEmployeeId === currentUser.id ||
          (script as any).writerId === currentUser.id ||
          (script as any).scriptAssignments?.some((sa: any) => sa.userId === currentUser.id) ||
          (script as any).tasks?.some((t: any) => t.assignedEmployees?.some((e: any) => e.userId === currentUser.id)),
      );
      const isReqAssignee = project.graphicRequirements?.some(
        (req: any) =>
          req.tasks?.some((t: any) => t.assignedEmployees?.some((e: any) => e.userId === currentUser.id)),
      );

      if (!isCreator && !isTeamMember && !isTaskAssignee && !isScriptAssignee && !isReqAssignee) {
        throw new ForbiddenException(
          'Staff members shall not view projects unrelated to their assignments.',
        );
      }

      // Filter child tasks: only show tasks assigned to this Staff member if not on project team / creator
      if (!isCreator && !isTeamMember && Array.isArray(project.tasks)) {
        project.tasks = project.tasks.filter(
          (t: any) =>
            t.assignedEmployees?.some((e: any) => e.userId === currentUser.id),
        );
      }

      // Filter child graphic requirements: only show requirements assigned to this Staff member if not on project team / creator
      if (!isCreator && !isTeamMember && Array.isArray(project.graphicRequirements)) {
        project.graphicRequirements = project.graphicRequirements.filter(
          (gr: any) =>
            gr.tasks?.some((t: any) => t.assignedEmployees?.some((e: any) => e.userId === currentUser.id)),
        );
      }

      // Authorized crew/task assignees can view all shoot project scripts. Standalone script assignees only see their scripts:
      if (!isCreator && !isTeamMember && !isTaskAssignee && Array.isArray(project.scripts)) {
        project.scripts = project.scripts.filter(
          (sc: any) =>
            sc.authorId === currentUser.id ||
            sc.createdById === currentUser.id ||
            sc.writerId === currentUser.id ||
            sc.assignedToId === currentUser.id ||
            sc.scriptAssignments?.some((sa: any) => sa.userId === currentUser.id) ||
            sc.tasks?.some((t: any) => t.assignedEmployees?.some((e: any) => e.userId === currentUser.id)),
        );
      }
    }

    const activityLogs = await this.prisma.activityLog.findMany({
      where: {
        OR: [
          { entity: 'ShootProject', entityId: id },
          { metadata: { contains: id } },
        ],
      },
      include: { user: true },
      orderBy: { timestamp: 'desc' },
    });

    const allTasksCompleted =
      project.tasks.length > 0
        ? project.tasks.every((t: any) => t.status === 'COMPLETED' || t.completionPercentage === 100)
        : true;
    const techReviewApproved = project.approvals.some(
      (a: any) => a.approvalType === 'TECHNICAL_REVIEW' && a.status === 'APPROVED',
    );
    const mediaReviewApproved = project.approvals.some(
      (a: any) => a.approvalType === 'MEDIA_REVIEW' && a.status === 'APPROVED',
    );
    const clientConfirmationRecorded =
      project.clientConfirmations.length > 0 ||
      project.approvals.some((a: any) => a.approvalType === 'CLIENT_CONFIRMATION' && a.status === 'APPROVED');

    const isReadyForCompletion =
      allTasksCompleted && techReviewApproved && mediaReviewApproved && clientConfirmationRecorded;

    const scriptsTotal = project.scripts.length;
    const scriptsCompleted = project.scripts.filter(
      (s: any) => s.status === 'APPROVED' || s.status === 'COMPLETED' || s.status === 'READY_FOR_PRODUCTION',
    ).length;

    const graphicsTotal = project.graphicRequirements.length;
    const graphicsCompleted = project.graphicRequirements.filter(
      (g: any) => g.status === 'APPROVED' || g.status === 'COMPLETED' || g.status === 'READY_FOR_PRODUCTION',
    ).length;

    const tasksTotal = project.tasks.length;
    const tasksCompleted = project.tasks.filter(
      (t: any) => t.status === 'COMPLETED' || t.completionPercentage === 100,
    ).length;

    const deliverablesTotal = project.files.length;
    const deliverablesCompleted = project.files.filter((f: any) => f.activeVersion).length;

    const completionChecklist = {
      allTasksCompleted,
      techReviewApproved,
      mediaReviewApproved,
      clientConfirmationRecorded,
      isReadyForCompletion,
      pendingCount:
        (!allTasksCompleted ? 1 : 0) +
        (!techReviewApproved ? 1 : 0) +
        (!mediaReviewApproved ? 1 : 0) +
        (!clientConfirmationRecorded ? 1 : 0),
    };

    const completionStatistics = {
      scripts: { completed: scriptsCompleted, total: scriptsTotal, text: `${scriptsCompleted} / ${scriptsTotal} Completed` },
      graphics: { completed: graphicsCompleted, total: graphicsTotal, text: `${graphicsCompleted} / ${graphicsTotal} Completed` },
      tasks: { completed: tasksCompleted, total: tasksTotal, text: `${tasksCompleted} / ${tasksTotal} Completed` },
      deliverables: { completed: deliverablesCompleted, total: deliverablesTotal, text: `${deliverablesCompleted} / ${deliverablesTotal} Completed` },
    };

    return { ...project, activityLogs, completionChecklist, completionStatistics };
  }

  async create(data: any, userId: string) {
    // 1. Validate active client & brand
    const client = await this.prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client || client.status !== 'ACTIVE') {
      throw new BadRequestException('Active client is required to create a shoot project');
    }
    const brand = await this.prisma.brand.findUnique({ where: { id: data.brandId } });
    if (!brand || brand.status !== 'ACTIVE') {
      throw new BadRequestException('Active brand is required to create a shoot project');
    }

    // 2. Generate Next Project ID (SP-00000X if not manually specified) with sequence collision resolution
    let finalProjectId = data.projectId?.trim();
    if (!finalProjectId) {
      const count = await this.prisma.shootProject.count();
      const nextSeq = (count + 1).toString().padStart(6, '0');
      finalProjectId = `SP-${nextSeq}`;
    }

    // Check manual entry vs auto-gen collision
    const existingProject = await this.prisma.shootProject.findUnique({
      where: { projectId: finalProjectId },
    });
    if (existingProject) {
      if (data.projectId?.trim()) {
        throw new ConflictException(`Project ID '${finalProjectId}' is already taken. Manual duplicates are not permitted.`);
      } else {
        let seq = 1;
        while (await this.prisma.shootProject.findUnique({ where: { projectId: `${finalProjectId}_${seq}` } })) {
          seq++;
        }
        finalProjectId = `${finalProjectId}_${seq}`;
      }
    }

    // 3. Automated Naming Rule based on Configured Conventions
    const dateFormatted = new Date(data.shootDate).toISOString().slice(2, 10).replace(/-/g, '');
    const influencerTag = data.influencerTalent ? data.influencerTalent.split(' ')[0].toUpperCase() : 'SHOOT';
    let baseName = data.name?.trim() || `${brand.shortCode}-${dateFormatted}-${influencerTag}`;

    // Auto-append sequence suffix if generated/provided project name collides
    let finalName = baseName;
    let nameSeq = 1;
    while (await this.prisma.shootProject.findFirst({ where: { name: finalName } })) {
      finalName = `${baseName} (${nameSeq})`;
      nameSeq++;
    }

    const projectData: any = {
      projectId: finalProjectId,
      name: finalName,
      clientId: data.clientId,
      brandId: data.brandId,
      productId: data.productId || null,
      campaignId: data.campaignId || null,
      calendarEventId: data.calendarEventId || null,
      shootType: data.shootType,
      shootDate: new Date(data.shootDate),
      shootLocation: data.shootLocation || (data.shootType === ShootType.INDOOR ? 'Studio Bay' : 'Outdoor Site'),
      locationCategory: data.locationCategory,
      locationAddress: data.locationAddress,
      locationContactPerson: data.locationContactPerson,
      reportingTime: data.reportingTime || '09:00 AM',
      expectedWrapUpTime: data.expectedWrapUpTime || '06:00 PM',
      influencerTalent: data.influencerTalent,
      priority: data.priority || Priority.MEDIUM,
      status: data.status || ProjectStatus.PLANNED,
      estimatedCompletionDate: data.estimatedCompletionDate ? new Date(data.estimatedCompletionDate) : null,
      notes: data.remarks?.trim() || data.notes?.trim() || null,
      createdById: userId,
    };

    // 4. Handle Indoor vs Outdoor Details
    if (data.shootType === ShootType.INDOOR) {
      if (!data.indoorDetails?.studioName) {
        throw new BadRequestException('Indoor Shoot requires Studio / Location Name');
      }
      projectData.indoorDetails = {
        create: {
          studioName: data.indoorDetails.studioName,
          studioAddress: data.indoorDetails.studioAddress || projectData.shootLocation || data.indoorDetails.studioName || 'Studio Bay Address',
          studioBookingStatus: data.indoorDetails.studioBookingStatus || StudioBookingStatus.CONFIRMED,
          studioBookingRef: data.indoorDetails.studioBookingRef || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
          lightingRequirements: data.indoorDetails.lightingRequirements || 'Standard 3-Point Studio Softboxes',
          reportingTime: data.indoorDetails.reportingTime || projectData.reportingTime || '09:00 AM',
          wrapUpTime: data.indoorDetails.wrapUpTime || projectData.expectedWrapUpTime || '06:00 PM',
        },
      };
    } else {
      if (!data.outdoorDetails?.outdoorLocation) {
        throw new BadRequestException('Outdoor Shoot requires Outdoor Location Name');
      }
      projectData.outdoorDetails = {
        create: {
          outdoorLocation: data.outdoorDetails.outdoorLocation,
          locationAddress: data.outdoorDetails.locationAddress || data.outdoorDetails.outdoorLocation,
          permissionStatus: data.outdoorDetails.permissionStatus || PermissionStatus.APPROVED,
          weatherStatus: data.outdoorDetails.weatherStatus || WeatherStatus.FAVORABLE,
          transportationReq: data.outdoorDetails.transportationReq ?? true,
          driver: data.outdoorDetails.driver || null,
          logisticsCoordinator: data.outdoorDetails.logisticsCoordinator || null,
          travelNotes: data.outdoorDetails.travelNotes || null,
          outdoorEquipmentReqs: data.outdoorDetails.outdoorEquipmentReqs,
          droneRequirement: data.outdoorDetails.droneRequirement ?? false,
          outdoorChecklist: data.outdoorDetails.outdoorChecklist || 'Permits, Weather check, Battery charge',
        },
      };
    }

    const project = await this.prisma.shootProject.create({
      data: projectData,
      include: { client: true, brand: true, indoorDetails: true, outdoorDetails: true },
    });

    // 5. Assign Team Members if provided
    if (data.teamUserIds && Array.isArray(data.teamUserIds)) {
      for (const tUserId of data.teamUserIds) {
        await this.prisma.projectAssignment.create({
          data: { projectId: project.id, userId: tUserId },
        });

        // Operational Event Notification referencing originating PROJECT entity
        await this.prisma.notification.create({
          data: {
            userId: tUserId,
            title: 'Assigned to Shoot Project',
            message: `You were assigned to project ${project.projectId}: ${project.name}`,
            type: 'INFO',
            linkUrl: `/projects?projectId=${project.id}`,
            eventType: 'PROJECT_TEAM_ASSIGNED',
            entityType: 'PROJECT',
            entityId: project.id,
            entityCode: project.projectId,
            projectId: project.id,
          },
        });
      }
    }

    // 6. Reserve / Assign Equipment if provided
    if (data.equipmentIds && Array.isArray(data.equipmentIds) && data.equipmentIds.length > 0) {

      for (const eqId of data.equipmentIds) {
        const res = await this.prisma.equipmentReservation.create({
          data: {
            projectId: project.id,
            equipmentId: eqId,
            startDate: new Date(data.shootDate),
            endDate: new Date(data.shootDate),
            status: 'RESERVED',
          },
        });
        const eq = await this.prisma.equipment.update({
          where: { id: eqId },
          data: { availability: EquipmentAvailability.RESERVED },
        });

        // Operational Event Notification referencing originating EQUIPMENT entity
        if (userId) {
          await this.prisma.notification.create({
            data: {
              userId,
              title: 'Equipment Reserved for Shoot',
              message: `Equipment ${eq.equipmentId || eq.name} reserved for project ${project.projectId}`,
              type: 'INFO',
              linkUrl: `/equipment`,
              eventType: 'EQUIPMENT_RESERVED',
              entityType: 'EQUIPMENT',
              entityId: eq.id,
              entityCode: eq.equipmentId,
              equipmentId: eq.id,
              projectId: project.id,
            },
          });
        }
      }
    }

    // 7. Log Initial Remark in Communication Thread for Permanent History
    const initialRemark = data.remarks?.trim() || data.notes?.trim();
    if (initialRemark) {
      await this.prisma.communication.create({
        data: {
          entityType: 'PROJECT',
          entityId: project.id,
          projectId: project.id,
          senderId: userId,
          type: 'INITIAL_REMARK',
          content: initialRemark,
        },
      });
    }

    // 8. Record Permanent Activity Timeline Entries
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'PROJECT_CREATED',
        entity: 'ShootProject',
        entityId: project.id,
        description: `Project ${project.projectId} (${project.name}) created`,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'SHOOT_TYPE_SELECTED',
        entity: 'ShootProject',
        entityId: project.id,
        description: `Shoot Type set to ${project.shootType}`,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'LOCATION_CONFIRMED',
        entity: 'ShootProject',
        entityId: project.id,
        description: `Location confirmed: ${project.shootLocation}`,
      },
    });

    if (data.shootType === ShootType.INDOOR && project.indoorDetails) {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'INDOOR_STUDIO_RESERVED',
          entity: 'ShootProject',
          entityId: project.id,
          description: `Indoor Studio reserved: ${project.indoorDetails.studioName} (Ref: ${project.indoorDetails.studioBookingRef})`,
        },
      });
    }

    if (data.shootType === ShootType.OUTDOOR && project.outdoorDetails) {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'OUTDOOR_PERMISSION_APPROVED',
          entity: 'ShootProject',
          entityId: project.id,
          description: `Outdoor location permission status: ${project.outdoorDetails.permissionStatus}`,
        },
      });

      if (project.outdoorDetails.driver) {
        await this.prisma.activityLog.create({
          data: {
            userId,
            action: 'TRANSPORTATION_ASSIGNED',
            entity: 'ShootProject',
            entityId: project.id,
            description: `Transportation driver assigned: ${project.outdoorDetails.driver}`,
          },
        });
      }
    }

    if (data.teamUserIds && data.teamUserIds.length > 0) {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'TEAM_ASSIGNED',
          entity: 'ShootProject',
          entityId: project.id,
          description: `Assigned ${data.teamUserIds.length} team members to project`,
        },
      });
    }

    return project;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.findOne(id);

    const isProjectUnderReview = [
      'WAITING_FOR_TECHNICAL_REVIEW',
      'TECHNICAL_REVIEW',
      'WAITING_FOR_MEDIA_REVIEW',
      'MEDIA_MANAGER_REVIEW',
      'WAITING_FOR_CLIENT_CONFIRMATION',
      'PENDING_MARKETING_APPROVAL',
      'WAITING_FOR_MARKETING_APPROVAL',
      'PENDING_CLIENT_APPROVAL',
      'PENDING_CLIENT_REVIEW',
    ].includes(existing.status);

    const isContentEdit =
      data.name !== undefined ||
      data.description !== undefined ||
      data.shootDate !== undefined ||
      data.teamUserIds !== undefined ||
      data.equipmentIds !== undefined ||
      data.indoorDetails !== undefined ||
      data.outdoorDetails !== undefined;

    if (isProjectUnderReview && isContentEdit && !data.bypassReviewLock) {
      throw new ForbiddenException(
        'Shoot Project is currently under review and in read-only mode. Content updates and modifications are locked during review.',
      );
    }

    const updateData: any = { ...data };

    if (data.teamUserIds && Array.isArray(data.teamUserIds)) {
      await this.prisma.projectAssignment.deleteMany({ where: { projectId: id } });
      for (const tUserId of data.teamUserIds) {
        await this.prisma.projectAssignment.create({
          data: { projectId: id, userId: tUserId },
        });
      }
      delete updateData.teamUserIds;

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'TEAM_ASSIGNED',
          entity: 'ShootProject',
          entityId: id,
          description: `Updated project team assignments (${data.teamUserIds.length} members)`,
        },
      });
    }

    if (data.equipmentIds && Array.isArray(data.equipmentIds)) {

      const existingReservations = await this.prisma.equipmentReservation.findMany({
        where: { projectId: id },
      });
      const existingEqIds = existingReservations.map((r) => r.equipmentId);

      await this.prisma.equipmentReservation.deleteMany({ where: { projectId: id } });

      for (const oldEqId of existingEqIds) {
        if (!data.equipmentIds.includes(oldEqId)) {
          await this.prisma.equipment.update({
            where: { id: oldEqId },
            data: { availability: EquipmentAvailability.AVAILABLE },
          });
        }
      }

      for (const eqId of data.equipmentIds) {
        await this.prisma.equipmentReservation.create({
          data: {
            projectId: id,
            equipmentId: eqId,
            startDate: existing.shootDate,
            endDate: existing.shootDate,
            status: 'RESERVED',
          },
        });
        await this.prisma.equipment.update({
          where: { id: eqId },
          data: { availability: EquipmentAvailability.RESERVED },
        });
      }
      delete updateData.equipmentIds;

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'EQUIPMENT_RESERVED',
          entity: 'ShootProject',
          entityId: id,
          description: `Updated project equipment reservations (${data.equipmentIds.length} items)`,
        },
      });
    }

    // Update nested indoor or outdoor details if passed
    if (existing.shootType === ShootType.INDOOR && data.indoorDetails) {
      await this.prisma.indoorShootDetails.update({
        where: { projectId: id },
        data: data.indoorDetails,
      });
      delete updateData.indoorDetails;
    } else if (existing.shootType === ShootType.OUTDOOR && data.outdoorDetails) {
      await this.prisma.outdoorShootDetails.update({
        where: { projectId: id },
        data: data.outdoorDetails,
      });

      if (data.outdoorDetails.driver) {
        await this.prisma.activityLog.create({
          data: {
            userId,
            action: 'TRANSPORTATION_ASSIGNED',
            entity: 'ShootProject',
            entityId: id,
            description: `Assigned transportation driver: ${data.outdoorDetails.driver}`,
          },
        });
      }
      delete updateData.outdoorDetails;
    }

    if (data.status === 'COMPLETED' && !data.forceComplete) {
      const checklist = existing.completionChecklist;
      if (checklist && !checklist.isReadyForCompletion) {
        const pendingItems: string[] = [];
        if (!checklist.allTasksCompleted) pendingItems.push('All production tasks completed');
        if (!checklist.techReviewApproved) pendingItems.push('Technical approval completed');
        if (!checklist.mediaReviewApproved) pendingItems.push('Media Manager approval completed');
        if (!checklist.clientConfirmationRecorded) pendingItems.push('Client confirmation recorded');

        throw new BadRequestException(
          `Cannot mark project as COMPLETED until all 4 criteria are met: ${pendingItems.join(', ')}`,
        );
      }
    }

    if ((data.status === 'CLOSED' || data.status === 'CANCELLED') && !data.closureReason?.trim() && !existing.closureReason) {
      throw new BadRequestException(
        'A mandatory closure reason is required to manually close a project (e.g. Client cancelled remaining deliverables, Scope reduced, Duplicate project, Production discontinued, or Other).',
      );
    }

    if (data.closureReason?.trim()) {
      const formattedReason = data.closureReason.trim();
      updateData.closureReason = formattedReason;

      await this.prisma.communication.create({
        data: {
          entityType: 'PROJECT',
          entityId: id,
          projectId: id,
          senderId: userId,
          type: 'PROJECT_CLOSURE',
          content: `Project Closure Reason Logged: "${formattedReason}"`,
        },
      });

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'PROJECT_CLOSED',
          entity: 'ShootProject',
          entityId: id,
          description: `Mandatory project closure reason logged: "${formattedReason}"`,
        },
      });
    }

    if (data.status) {
      if (data.status === 'CLOSED' || data.status === 'CANCELLED') {
        updateData.lifecycle = 'CLOSED';
      } else if (data.status === 'ARCHIVED') {
        updateData.lifecycle = 'ARCHIVED';
      } else {
        updateData.lifecycle = 'ACTIVE';
      }
    }

    const updated = await this.prisma.shootProject.update({
      where: { id },
      data: updateData,
    });

    if (data.status && data.status !== existing.status) {
      let statusAction = 'STATUS_UPDATED';
      if (data.status === 'IN_PROGRESS') statusAction = 'PRODUCTION_STARTED';
      if (data.status === 'COMPLETED') statusAction = 'PRODUCTION_COMPLETED';
      if (data.status === 'CLOSED' || data.status === 'CANCELLED') statusAction = 'PROJECT_CLOSED';

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: statusAction,
          entity: 'ShootProject',
          entityId: id,
          description: `Status changed from ${existing.status} to ${data.status}`,
        },
      });

      if (data.status === 'WAITING_FOR_MEDIA_REVIEW') {
        const mediaManagers = await this.prisma.user.findMany({
          where: { role: { in: ['MEDIA_MANAGER', 'ADMINISTRATOR', 'ADMIN'] }, status: 'ACTIVE' },
          select: { id: true },
        });
        if (mediaManagers.length > 0) {
          await this.prisma.notification.createMany({
            data: mediaManagers.map((mm) => ({
              userId: mm.id,
              title: 'Project Waiting for Media Manager Approval 🎬',
              message: `Shoot Project "${existing.projectId}: ${existing.name}" is waiting for Media Manager Review.`,
              type: 'ALERT',
              category: 'APPROVAL',
              priority: 'HIGH',
              linkUrl: `/projects/${id}`,
              eventType: 'MEDIA_REVIEW_REQUESTED',
              entityType: 'PROJECT',
              entityId: id,
              entityCode: existing.projectId,
              projectId: id,
            })),
          }).catch(() => null);
        }
      }
    }

    return updated;
  }

  async archive(id: string, userId: string) {
    const project = await this.findOne(id);
    const updated = await this.prisma.shootProject.update({
      where: { id },
      data: { status: ProjectStatus.ARCHIVED },
    });

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'PROJECT_CLOSED',
        entity: 'ShootProject',
        entityId: id,
        description: `Archived and closed project ${project.projectId} (${project.name})`,
      },
    });

    return updated;
  }

  async submitTechnicalReview(projectId: string, user: { id: string; name?: string; role: string }) {
    const project = await this.findOne(projectId, user);
    if (!project) throw new NotFoundException('Project not found');

    if (project.status === 'WAITING_FOR_TECHNICAL_REVIEW') {
      return project;
    }

    const previousStatus = project.status;
    const currentRound = (project.revisionCount || 0) + 1;
    const versionStr = `v${currentRound}`;

    const updated = await this.prisma.shootProject.update({
      where: { id: projectId },
      data: {
        status: 'WAITING_FOR_TECHNICAL_REVIEW',
      },
    });

    await this.prisma.approval.create({
      data: {
        projectId: project.id,
        entityType: 'PROJECT',
        entityId: project.id,
        approvalType: 'TECHNICAL_REVIEW',
        stage: 'TECHNICAL_REVIEW',
        round: currentRound,
        version: versionStr,
        targetRole: 'TECHNICAL_MANAGER',
        requestedById: user.id,
        status: 'PENDING',
        returnedStatus: previousStatus,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'TECHNICAL_REVIEW_REQUESTED',
        entity: 'ShootProject',
        entityId: projectId,
        description: `Technical Review Requested – Round ${currentRound} by ${user.name || user.role} (Previous Status: ${previousStatus})`,
      },
    });

    const techManagers = await this.prisma.user.findMany({
      where: { role: { in: ['TECHNICAL_MANAGER', 'ADMINISTRATOR', 'ADMIN'] } },
    });

    if (techManagers.length > 0) {
      await this.prisma.notification.createMany({
        data: techManagers.map((tm) => ({
          userId: tm.id,
          title: `Project Technical Review Requested – Round ${currentRound}`,
          message: `Shoot Project "${project.projectId}: ${project.name}" was submitted for Technical Review (Round ${currentRound}).`,
          type: 'INFO',
          linkUrl: `/projects/${project.id}`,
          eventType: 'TECHNICAL_REVIEW_REQUESTED',
          entityType: 'PROJECT',
          entityId: project.id,
          entityCode: project.projectId,
        })),
      }).catch(() => null);
    }

    return this.findOne(projectId, user);
  }

  async reviewTechnical(
    projectId: string,
    user: { id: string; name?: string; role: string },
    body: { action: 'APPROVE' | 'REJECT'; comment?: string },
  ) {
    if (user.role !== 'TECHNICAL_MANAGER' && user.role !== 'ADMINISTRATOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only Technical Manager can review and decide on technical approvals.');
    }

    const { action, comment } = body;
    const project = await this.findOne(projectId, user);
    if (!project) throw new NotFoundException('Project not found');

    if (project.status !== 'WAITING_FOR_TECHNICAL_REVIEW') {
      throw new BadRequestException('Project is not currently waiting for Technical Review.');
    }

    const currentRound = (project.revisionCount || 0) + 1;

    if (action === 'APPROVE') {
      const updated = await this.prisma.shootProject.update({
        where: { id: projectId },
        data: {
          status: 'WAITING_FOR_MEDIA_REVIEW',
        },
      });

      const activeApproval = await this.prisma.approval.findFirst({
        where: { projectId, stage: 'TECHNICAL_REVIEW', status: 'PENDING' },
      });

      if (activeApproval) {
        await this.prisma.approval.update({
          where: { id: activeApproval.id },
          data: {
            status: 'APPROVED',
            reviewerId: user.id,
            remarks: comment || 'Technical Review Approved',
            reviewedAt: new Date(),
          },
        });
      } else {
        await this.prisma.approval.create({
          data: {
            projectId: project.id,
            entityType: 'PROJECT',
            entityId: project.id,
            approvalType: 'TECHNICAL_REVIEW',
            stage: 'TECHNICAL_REVIEW',
            round: currentRound,
            version: `v${currentRound}`,
            targetRole: 'TECHNICAL_MANAGER',
            requestedById: project.createdById,
            reviewerId: user.id,
            status: 'APPROVED',
            remarks: comment || 'Technical Review Approved',
            reviewedAt: new Date(),
          },
        });
      }

      await this.prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'TECHNICAL_REVIEW_APPROVED',
          entity: 'ShootProject',
          entityId: projectId,
          description: `Technical Review Approved by Technical Manager ${user.name || ''}`,
        },
      });

      const mediaManagers = await this.prisma.user.findMany({
        where: { role: { in: ['MEDIA_MANAGER', 'ADMINISTRATOR', 'ADMIN'] }, status: 'ACTIVE' },
        select: { id: true },
      });

      if (mediaManagers.length > 0) {
        await this.prisma.notification.createMany({
          data: mediaManagers.map((mm) => ({
            userId: mm.id,
            title: 'Project Waiting for Media Manager Approval 🎬',
            message: `Shoot Project "${project.projectId}: ${project.name}" was approved by Technical Manager and is waiting for Media Manager Review.`,
            type: 'ALERT',
            category: 'APPROVAL',
            priority: 'HIGH',
            linkUrl: `/projects/${project.id}`,
            eventType: 'MEDIA_REVIEW_REQUESTED',
            entityType: 'PROJECT',
            entityId: project.id,
            entityCode: project.projectId,
            projectId: project.id,
          })),
        }).catch(() => null);
      }

      return this.findOne(projectId, user);
    } else {
      if (!comment || !comment.trim()) {
        throw new BadRequestException('Rejection reason is mandatory for rejecting Technical Review.');
      }

      const returnStatus = 'IN_PROGRESS';
      const updated = await this.prisma.shootProject.update({
        where: { id: projectId },
        data: {
          status: returnStatus,
          revisionCount: { increment: 1 },
          notes: `Technical Review Revision: ${comment.trim()}`,
        },
      });

      const activeApproval = await this.prisma.approval.findFirst({
        where: { projectId, stage: 'TECHNICAL_REVIEW', status: 'PENDING' },
      });

      if (activeApproval) {
        await this.prisma.approval.update({
          where: { id: activeApproval.id },
          data: {
            status: 'REJECTED',
            reviewerId: user.id,
            remarks: comment.trim(),
            reviewedAt: new Date(),
            returnedStatus: returnStatus,
          },
        });
      } else {
        await this.prisma.approval.create({
          data: {
            projectId: project.id,
            entityType: 'PROJECT',
            entityId: project.id,
            approvalType: 'TECHNICAL_REVIEW',
            stage: 'TECHNICAL_REVIEW',
            round: currentRound,
            version: `v${currentRound}`,
            targetRole: 'TECHNICAL_MANAGER',
            requestedById: project.createdById,
            reviewerId: user.id,
            status: 'REJECTED',
            remarks: comment.trim(),
            returnedStatus: returnStatus,
            reviewedAt: new Date(),
          },
        });
      }

      await this.prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'TECHNICAL_REVIEW_REJECTED',
          entity: 'ShootProject',
          entityId: projectId,
          description: `Technical Review REJECTED by Technical Manager ${user.name || ''}: ${comment.trim()}. Returned to ${returnStatus}`,
        },
      });

      if (project.createdById) {
        await this.prisma.notification.create({
          data: {
            userId: project.createdById,
            title: 'Project Technical Review Rejected',
            message: `Shoot Project "${project.projectId}: ${project.name}" Technical Review was rejected by Technical Manager: ${comment.trim()}. Returned to ${returnStatus}.`,
            type: 'WARNING',
            linkUrl: `/projects/${project.id}`,
            eventType: 'TECHNICAL_REVIEW_REJECTED',
            entityType: 'PROJECT',
            entityId: project.id,
            entityCode: project.projectId,
          },
        }).catch(() => null);
      }

      return this.findOne(projectId, user);
    }
  }

  async reviewMedia(
    projectId: string,
    user: { id: string; name?: string; role: string },
    body: { action: 'APPROVE' | 'REJECT'; comment?: string },
  ) {
    const { action, comment } = body;
    const project = await this.findOne(projectId, user);
    if (!project) throw new NotFoundException('Project not found');

    if (project.status !== 'WAITING_FOR_MEDIA_REVIEW') {
      throw new BadRequestException('Project is not currently waiting for Media Manager Review.');
    }

    const currentRound = (project.revisionCount || 0) + 1;

    if (action === 'APPROVE') {
      const updated = await this.prisma.shootProject.update({
        where: { id: projectId },
        data: {
          status: 'WAITING_FOR_MARKETING_APPROVAL',
        },
      });

      await this.prisma.approval.create({
        data: {
          projectId: project.id,
          entityType: 'PROJECT',
          entityId: project.id,
          approvalType: 'MEDIA_MANAGER_REVIEW',
          stage: 'MEDIA_REVIEW',
          round: currentRound,
          version: `v${currentRound}`,
          targetRole: 'MEDIA_MANAGER',
          requestedById: project.createdById,
          reviewerId: user.id,
          status: 'APPROVED',
          remarks: comment || 'Media Manager Review Approved',
          reviewedAt: new Date(),
        },
      });

      await this.prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'MEDIA_REVIEW_APPROVED',
          entity: 'ShootProject',
          entityId: projectId,
          description: `Media Manager Review Approved by Media Manager ${user.name || ''}`,
        },
      });

      const marketingManagers = await this.prisma.user.findMany({
        where: { role: { in: ['MARKETING_MANAGER', 'ADMINISTRATOR', 'ADMIN'] } },
      });

      if (marketingManagers.length > 0) {
        await this.prisma.notification.createMany({
          data: marketingManagers.map((mm) => ({
            userId: mm.id,
            title: 'Project Pending Marketing Manager Approval',
            message: `Shoot Project "${project.projectId}: ${project.name}" was approved by Media Manager and is waiting for Marketing Manager Approval.`,
            type: 'INFO',
            linkUrl: `/projects/${project.id}`,
            eventType: 'MARKETING_APPROVAL_REQUESTED',
            entityType: 'PROJECT',
            entityId: project.id,
            entityCode: project.projectId,
          })),
        }).catch(() => null);
      }

      return this.findOne(projectId, user);
    } else {
      if (!comment || !comment.trim()) {
        throw new BadRequestException('Rejection reason is mandatory for returning project.');
      }

      const returnStatus = 'IN_PROGRESS';
      const updated = await this.prisma.shootProject.update({
        where: { id: projectId },
        data: {
          status: returnStatus,
          revisionCount: { increment: 1 },
          notes: `Media Manager Revision: ${comment.trim()}`,
        },
      });

      await this.prisma.approval.create({
        data: {
          projectId: project.id,
          entityType: 'PROJECT',
          entityId: project.id,
          approvalType: 'MEDIA_MANAGER_REVIEW',
          stage: 'MEDIA_REVIEW',
          round: currentRound,
          version: `v${currentRound}`,
          targetRole: 'MEDIA_MANAGER',
          requestedById: project.createdById,
          reviewerId: user.id,
          status: 'REJECTED',
          remarks: comment.trim(),
          returnedStatus: returnStatus,
          reviewedAt: new Date(),
        },
      });

      await this.prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'MEDIA_REVIEW_REJECTED',
          entity: 'ShootProject',
          entityId: projectId,
          description: `Media Manager Review REJECTED by ${user.name || ''}: ${comment.trim()}. Returned to ${returnStatus}`,
        },
      });

      return this.findOne(projectId, user);
    }
  }

  async reviewMarketing(
    projectId: string,
    user: { id: string; name?: string; role: string },
    body: { action: 'APPROVE' | 'REJECT'; comment?: string },
  ) {
    const { action, comment } = body;
    const project = await this.findOne(projectId, user);
    if (!project) throw new NotFoundException('Project not found');

    if (project.status !== 'WAITING_FOR_MARKETING_APPROVAL' && project.status !== 'PENDING_APPROVAL' && project.status !== 'PENDING_CLIENT_APPROVAL') {
      throw new BadRequestException('Project is not currently waiting for Marketing Approval.');
    }

    const currentRound = (project.revisionCount || 0) + 1;

    if (action === 'APPROVE') {
      const updated = await this.prisma.shootProject.update({
        where: { id: projectId },
        data: {
          status: 'WAITING_FOR_CLIENT_CONFIRMATION',
        },
      });

      await this.prisma.approval.create({
        data: {
          projectId: project.id,
          entityType: 'PROJECT',
          entityId: project.id,
          approvalType: 'MARKETING_MANAGER_APPROVAL',
          stage: 'MARKETING_APPROVAL',
          round: currentRound,
          version: `v${currentRound}`,
          targetRole: 'MARKETING_MANAGER',
          requestedById: project.createdById,
          reviewerId: user.id,
          status: 'APPROVED',
          remarks: comment || 'Marketing Manager Approval Granted',
          reviewedAt: new Date(),
        },
      });

      await this.prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'MARKETING_APPROVAL_GRANTED',
          entity: 'ShootProject',
          entityId: projectId,
          description: `Marketing Manager Approval Granted by ${user.name || ''}`,
        },
      });

      return this.findOne(projectId, user);
    } else {
      if (!comment || !comment.trim()) {
        throw new BadRequestException('Rejection reason is mandatory for rejecting marketing approval.');
      }

      const returnStatus = 'IN_PROGRESS';
      const updated = await this.prisma.shootProject.update({
        where: { id: projectId },
        data: {
          status: returnStatus,
          revisionCount: { increment: 1 },
          notes: `Marketing Manager Revision: ${comment.trim()}`,
        },
      });

      await this.prisma.approval.create({
        data: {
          projectId: project.id,
          entityType: 'PROJECT',
          entityId: project.id,
          approvalType: 'MARKETING_MANAGER_APPROVAL',
          stage: 'MARKETING_APPROVAL',
          round: currentRound,
          version: `v${currentRound}`,
          targetRole: 'MARKETING_MANAGER',
          requestedById: project.createdById,
          reviewerId: user.id,
          status: 'REJECTED',
          remarks: comment.trim(),
          returnedStatus: returnStatus,
          reviewedAt: new Date(),
        },
      });

      return this.findOne(projectId, user);
    }
  }

  async confirmClient(
    projectId: string,
    user: { id: string; name?: string; role: string },
    body: { action: 'CONFIRM' | 'REQUEST_CHANGES'; comment?: string },
  ) {
    const { action, comment } = body;
    const project = await this.findOne(projectId, user);
    if (!project) throw new NotFoundException('Project not found');

    const currentRound = (project.revisionCount || 0) + 1;

    if (action === 'CONFIRM') {
      const updated = await this.prisma.shootProject.update({
        where: { id: projectId },
        data: {
          status: 'COMPLETED',
          progressPercentage: 100,
        },
      });

      await this.prisma.clientConfirmation.create({
        data: {
          projectId: project.id,
          decision: 'APPROVED',
          communicationMethod: 'DIRECT_SYSTEM_CONFIRMATION',
          remarks: comment || 'Client confirmed and approved all shoot deliverables.',
          recordedBy: user.name || user.role || 'Client Representative',
          decisionDate: new Date(),
        },
      });

      await this.prisma.approval.create({
        data: {
          projectId: project.id,
          entityType: 'PROJECT',
          entityId: project.id,
          approvalType: 'CLIENT_SIGN_OFF',
          stage: 'CLIENT_CONFIRMATION',
          round: currentRound,
          version: `v${currentRound}`,
          targetRole: 'CLIENT',
          requestedById: project.createdById,
          reviewerId: user.id,
          status: 'APPROVED',
          remarks: comment || 'Client Final Sign-off Confirmed',
          reviewedAt: new Date(),
        },
      });

      await this.prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'CLIENT_CONFIRMATION_RECORDED',
          entity: 'ShootProject',
          entityId: projectId,
          description: `Client Final Sign-off Confirmed by ${user.name || ''}`,
        },
      });

      return this.findOne(projectId, user);
    } else {
      if (!comment || !comment.trim()) {
        throw new BadRequestException('Changes requested notes are mandatory.');
      }

      const returnStatus = 'CLIENT_REVISION_REQUESTED';
      const updated = await this.prisma.shootProject.update({
        where: { id: projectId },
        data: {
          status: returnStatus,
          revisionCount: { increment: 1 },
          notes: `Client Revision Requested: ${comment.trim()}`,
        },
      });

      await this.prisma.approval.create({
        data: {
          projectId: project.id,
          entityType: 'PROJECT',
          entityId: project.id,
          approvalType: 'CLIENT_SIGN_OFF',
          stage: 'CLIENT_CONFIRMATION',
          round: currentRound,
          version: `v${currentRound}`,
          targetRole: 'CLIENT',
          requestedById: project.createdById,
          reviewerId: user.id,
          status: 'REJECTED',
          remarks: comment.trim(),
          returnedStatus: returnStatus,
          reviewedAt: new Date(),
        },
      });

      await this.prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'CLIENT_REVISION_REQUESTED',
          entity: 'ShootProject',
          entityId: projectId,
          description: `Client requested revisions: ${comment.trim()}`,
        },
      });

      return this.findOne(projectId, user);
    }
  }
}
