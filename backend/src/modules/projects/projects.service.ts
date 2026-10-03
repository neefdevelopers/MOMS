import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException, InternalServerErrorException } from '@nestjs/common';
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
    // Opt-in to bypass per-user visibility filtering. Used by the dropdowns in the
    // calendar and task creation forms where every project is a valid selection, not
    // just projects the viewer is assigned to.
    all?: boolean;
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
          { graphicRequirements: { some: { tasks: { some: { assignedEmployees: { some: { userId: params.userId, acceptanceStatus: 'ACCEPTED' } } } } } } },
        ],
      });
    }

    // CRITICAL BUSINESS RULE:
    // Content creation and approval roles (SOCIAL_MEDIA_MANAGER, MEDIA_MANAGER, MARKETING_MANAGER, ADMIN) can view pending projects in their sessions.
    // Execution roles (TECHNICAL_MANAGER, STAFF, etc.) can ONLY view projects once approved by Marketing Manager (or if created by themselves or assigned).
    const APPROVED_CALENDAR_STATUSES = ['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED', 'READY', 'OPERATIONAL', 'TASK_ASSIGNED', 'IN_PRODUCTION'];
    const CREATOR_AND_APPROVER_ROLES = ['SOCIAL_MEDIA_MANAGER', 'MEDIA_MANAGER', 'MARKETING_MANAGER', 'ADMIN', 'ADMINISTRATOR', 'TECHNICAL_MANAGER'];

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
        graphicRequirements: { include: { tasks: { include: { assignedEmployees: true } } } },
        equipmentReservations: { include: { equipment: true } },
        equipmentRequests: { include: { equipment: true, requestedBy: true } },
        files: { include: { uploadedBy: true } },
        _count: {
          select: {
            tasks: true,
            graphicRequirements: true,
            files: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (params.userId && params.role && !params.all) {
      return rawProjects.filter((p) =>
        canUserViewProject({ id: params.userId!, role: params.role! }, p),
      );
    }
    return rawProjects;
  }

  async findOne(id: string, currentUser?: any) {
    // Trimmed include tree: only relations the Project Details page (and the
    // equipment-assignments review modal, which reuses this endpoint) actually
    // render. Revisions, communications, activityLogs and equipmentMovements are
    // fetched by their own endpoints/tab components, so they are deliberately
    // NOT loaded here. Auth (canUserViewProject/canUserViewEvent) branches on
    // calendarEvent, assignedTeam, tasks.assignedEmployees and approvals, so
    // those keep the exact fields the gate reads.
    const includeConfig = {
      client: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true, shortCode: true } },
      product: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      calendarEvent: true,
      createdBy: { select: { id: true } },
      indoorDetails: true,
      outdoorDetails: true,
      assignedTeam: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              employeeProfile: {
                select: {
                  designation: true,
                  department: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
      graphicRequirements: {
        select: {
          id: true,
          requirementId: true,
          name: true,
          projectId: true,
          calendarEventId: true,
          requirementType: true,
          objective: true,
          description: true,
          priority: true,
          status: true,
          revisionCount: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
          tasks: {
            select: {
              id: true,
              assignedEmployees: { select: { userId: true, acceptanceStatus: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 200,
      },
      tasks: {
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          dueDate: true,
          status: true,
          completionPercentage: true,
          sourceType: true,
          taskType: true,
          scriptId: true,
          graphicRequirementId: true,
          createdAt: true,
          updatedAt: true,
          assignedEmployees: {
            select: {
              userId: true,
              acceptanceStatus: true,
              assignedAt: true,
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 200,
      },
      approvals: {
        select: { id: true, approvalType: true, targetRole: true, status: true },
        orderBy: { reviewedAt: 'desc' as const },
        take: 200,
      },
      clientConfirmations: { select: { id: true }, orderBy: { createdAt: 'desc' as const }, take: 100 },
      revisions: { select: { id: true }, orderBy: { createdAt: 'desc' as const }, take: 1 },
      equipmentReservations: {
        include: {
          equipment: true,
          reservedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 200,
      },
      equipmentRequests: {
        include: {
          equipment: true,
          requestedBy: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 200,
      },
      files: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          fileType: true,
          storagePath: true,
          activeVersion: true,
          attachmentCategory: true,
          clipCodes: true,
          graphicRequirementId: true,
          projectId: true,
          createdAt: true,
          uploadedBy: { select: { id: true, name: true } },
          scriptEditorAssignments: {
            select: {
              id: true,
              userId: true,
              taskId: true,
              editingStatus: true,
              videoEditingFinished: true,
              user: { select: { id: true, name: true } },
            },
            orderBy: { assignedAt: 'desc' as const },
          },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 500,
      },
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

    // Also fetch any graphic requirements and tasks linked via project code, task relation, or calendar event.
    // Both queries only need the same fields the main include returns (id, status, assignedEmployees, etc.)
    // so they reuse the same select shape — no extra full-row includes.
    const [extraGraphicReqs, extraTasks] = await Promise.all([
      this.prisma.graphicRequirement.findMany({
        where: {
          OR: [
            { projectId: project.id },
            { projectId: project.projectId },
            ...(project.calendarEventId ? [{ calendarEventId: project.calendarEventId }] : []),
          ],
        },
        select: {
          id: true,
          requirementId: true,
          name: true,
          projectId: true,
          calendarEventId: true,
          requirementType: true,
          objective: true,
          description: true,
          priority: true,
          status: true,
          revisionCount: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
          tasks: {
            select: {
              id: true,
              assignedEmployees: { select: { userId: true, acceptanceStatus: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
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
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          dueDate: true,
          status: true,
          completionPercentage: true,
          sourceType: true,
          taskType: true,
          scriptId: true,
          graphicRequirementId: true,
          createdAt: true,
          updatedAt: true,
          assignedEmployees: {
            select: {
              userId: true,
              acceptanceStatus: true,
              assignedAt: true,
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }).catch(() => []),
    ]);

    const grMap = new Map<string, any>();
    (project.graphicRequirements || []).forEach((g: any) => grMap.set(g.id, g));
    extraGraphicReqs.forEach((g: any) => grMap.set(g.id, g));
    project.graphicRequirements = Array.from(grMap.values());

    const taskMap = new Map<string, any>();
    (project.tasks || []).forEach((t: any) => taskMap.set(t.id, t));
    extraTasks.forEach((t: any) => taskMap.set(t.id, t));
    // Also include tasks nested in graphic requirements
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
      const isReqAssignee = project.graphicRequirements?.some(
        (req: any) =>
          req.tasks?.some((t: any) => t.assignedEmployees?.some((e: any) => e.userId === currentUser.id)),
      );

      if (!isCreator && !isTeamMember && !isTaskAssignee && !isReqAssignee) {
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
    }

    const activityLogs = await this.prisma.activityLog.findMany({
      where: { entity: 'ShootProject', entityId: project.id },
      include: { user: true },
      orderBy: { timestamp: 'desc' },
      take: 100,
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
      graphics: { completed: graphicsCompleted, total: graphicsTotal, text: `${graphicsCompleted} / ${graphicsTotal} Completed` },
      tasks: { completed: tasksCompleted, total: tasksTotal, text: `${tasksCompleted} / ${tasksTotal} Completed` },
      deliverables: { completed: deliverablesCompleted, total: deliverablesTotal, text: `${deliverablesCompleted} / ${deliverablesTotal} Completed` },
    };

    // Refresh the per-document editing state from the linked task before returning, so the
    // page always reflects the current acceptance / review status rather than a stale mirror.
    // `acceptedTaskIds` is computed in-memory from the already-fetched project.files[*].scriptEditorAssignments
    // (which now include editingStatus + taskId), avoiding a redundant shootProject findUnique.
    await this.syncScriptEditingStatus(project.id, currentUser);
    const liveAssignments = (project.files || []).flatMap((f: any) => f.scriptEditorAssignments || []);
    const acceptedTaskIds = new Set(
      liveAssignments
        .filter((a: any) => a.editingStatus && a.editingStatus !== 'ASSIGNED')
        .map((a: any) => a.taskId)
        .filter(Boolean),
    );

    return {
      ...project,
      files: (project.files || []).map((f: any) => ({
        ...f,
        scriptEditorAssignments: (f.scriptEditorAssignments || []).map((a: any) => ({
          ...a,
          // True once the linked task has been accepted, which is what unlocks finishing.
          taskAccepted: acceptedTaskIds.has(a.taskId),
        })),
      })),
      activityLogs,
      completionChecklist,
      completionStatistics,
    };
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

    const safeDate = (v: any, def: Date | null = null): Date | null => {
      if (!v) return def;
      const d = new Date(v);
      return isNaN(d.getTime()) ? def : d;
    };

    // 3. Automated Naming Rule based on Configured Conventions
    const shootDateObj = safeDate(data.shootDate, new Date())!;
    const dateFormatted = shootDateObj.toISOString().slice(2, 10).replace(/-/g, '');
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
      shootDate: shootDateObj,
      shootLocation: data.shootLocation || (data.shootType === ShootType.INDOOR ? 'Studio Bay' : 'Outdoor Site'),
      locationCategory: data.locationCategory,
      locationAddress: data.locationAddress,
      locationContactPerson: data.locationContactPerson,
      reportingTime: data.reportingTime || '09:00 AM',
      expectedWrapUpTime: data.expectedWrapUpTime || '06:00 PM',
      influencerTalent: data.influencerTalent,
      priority: data.priority || Priority.MEDIUM,
      status: data.status || ProjectStatus.PLANNED,
      estimatedCompletionDate: safeDate(data.estimatedCompletionDate, null),
      notes: data.notes?.trim() || (data.scripts ? (typeof data.scripts === 'string' ? data.scripts : JSON.stringify(data.scripts, null, 2)) : undefined) || data.remarks?.trim() || null,
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
      const cleanUserIds = data.teamUserIds.filter((id: any) => typeof id === 'string' && id.trim());
      if (cleanUserIds.length > 0) {
        const validUsers = await this.prisma.user.findMany({
          where: { id: { in: cleanUserIds } },
          select: { id: true, name: true },
        });

        for (const tUser of validUsers) {
          await this.prisma.projectAssignment.create({
            data: { projectId: project.id, userId: tUser.id },
          }).catch(() => null);

          // Operational Event Notification referencing originating PROJECT entity
          await this.prisma.notification.create({
            data: {
              userId: tUser.id,
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
          }).catch(() => null);
        }
      }
    }

    // 6. Reserve / Assign Equipment if provided
    if (data.equipmentIds && Array.isArray(data.equipmentIds) && data.equipmentIds.length > 0) {
      const cleanEqIds = data.equipmentIds.filter((id: any) => typeof id === 'string' && id.trim());
      if (cleanEqIds.length > 0) {
        const validEquipment = await this.prisma.equipment.findMany({
          where: { id: { in: cleanEqIds } },
        });

        for (const eq of validEquipment) {
          await this.prisma.equipmentReservation.create({
            data: {
              projectId: project.id,
              equipmentId: eq.id,
              startDate: new Date(data.shootDate),
              endDate: new Date(data.shootDate),
              status: 'RESERVED',
            },
          }).catch(() => null);

          await this.prisma.equipment.update({
            where: { id: eq.id },
            data: { availability: EquipmentAvailability.RESERVED },
          }).catch(() => null);

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
            }).catch(() => null);
          }
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

  /**
   * Safety net: clip codes now live on FileMetadata rows, not in the project script
   * blob. Any legacy codes still living in notes are preserved here so a generic project
   * update can change script copy without silently discarding historical codes.
   */
  private preservePersistedClipCodes(persistedNotes: any, incomingNotes: string): string {
    const readScripts = (raw: any): any[] | null => {
      if (typeof raw !== 'string') return null;
      const trimmed = raw.trim();
      if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.scripts)) return parsed.scripts;
        return null;
      } catch {
        return null;
      }
    };

    const persisted = readScripts(persistedNotes);
    const incoming = readScripts(incomingNotes);
    // Not a structured script blob on either side - nothing to reconcile.
    if (!persisted || !incoming) return incomingNotes;

    const merged = incoming.map((s: any) => {
      const prior = persisted.find((p: any) => p && p.id === s?.id);
      return {
        ...s,
        clipCodes: prior && Array.isArray(prior.clipCodes) ? prior.clipCodes : [],
      };
    });

    return JSON.stringify(merged, null, 2);
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
      data.shootDate !== undefined ||
      data.teamUserIds !== undefined ||
      data.equipmentIds !== undefined ||
      data.indoorDetails !== undefined ||
      data.outdoorDetails !== undefined;

    if (isProjectUnderReview && isContentEdit && !data.bypassReviewLock) {
      throw new ForbiddenException(
        'Shoot Project is currently under review and in read-only mode. Operational schedule updates are locked during review.',
      );
    }

    const updateData: any = { ...data };

    // `bypassReviewLock` is a request-only control flag, not a ShootProject column.
    // Forwarding it to Prisma throws a PrismaClientValidationError (HTTP 500), so strip
    // it here. It is already consumed by the review-lock check above.
    delete updateData.bypassReviewLock;

    // Guard against any other control-only or unknown field reaching Prisma: an
    // unrecognised key otherwise fails the whole update with a 500.
    const shootProjectColumns = new Set(Object.keys(this.prisma.shootProject.fields));
    for (const key of Object.keys(updateData)) {
      if (!shootProjectColumns.has(key)) {
        delete updateData[key];
      }
    }

    // A generic update may rewrite the script blob, but never the clip codes inside it.
    if (typeof updateData.notes === 'string') {
      updateData.notes = this.preservePersistedClipCodes(existing.notes, updateData.notes);
    }

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

    if (updateData.notes !== undefined || updateData.name !== undefined) {
      const calId = existing.calendarEventId || (existing.sourceForCalendarEvents && existing.sourceForCalendarEvents[0]?.id);
      if (calId) {
        await this.prisma.mediaCalendarEvent
          .update({
            where: { id: calId },
            data: {
              caption: updateData.notes || undefined,
              title: updateData.name || undefined,
            },
          })
          .catch(() => null);
      }
    }

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
    body: { action: 'APPROVE' | 'REJECT'; comment?: string; notes?: string; script?: string; caption?: string },
  ) {
    const { action, comment } = body;
    const project = await this.findOne(projectId, user);
    if (!project) throw new NotFoundException('Project not found');

    if (project.status !== 'WAITING_FOR_MARKETING_APPROVAL' && project.status !== 'PENDING_APPROVAL' && project.status !== 'PENDING_CLIENT_APPROVAL') {
      throw new BadRequestException('Project is not currently waiting for Marketing Approval.');
    }

    const currentRound = (project.revisionCount || 0) + 1;
    const scriptNotes = body.notes || body.script || body.caption;

    if (action === 'APPROVE') {
      const updated = await this.prisma.shootProject.update({
        where: { id: projectId },
        data: {
          status: 'WAITING_FOR_CLIENT_CONFIRMATION',
          ...(scriptNotes ? { notes: scriptNotes } : {}),
        },
      });

      if (scriptNotes && (project.calendarEventId || project.sourceForCalendarEvents?.[0]?.id)) {
        const cId = project.calendarEventId || project.sourceForCalendarEvents?.[0]?.id;
        if (cId) {
          await this.prisma.mediaCalendarEvent
            .update({
              where: { id: cId },
              data: { caption: scriptNotes },
            })
            .catch(() => null);
        }
      }

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

  /**
   * Resolves a client-supplied project reference (ShootProject.id, its projectId code, or a
   * MediaCalendarEvent id) to the ShootProject row, mirroring the lookup order used by findOne.
   *
   * The relations canUserViewProject branches on are loaded here on purpose. Calling that helper
   * with a bare row leaves calendarEvent, tasks, assignedTeam, approvals and graphicRequirements
   * undefined, which silently skips the calendar-event ACL gate and the per-relation staff checks.
   */
  private async resolveShootProject(id: string) {
    const authInclude = {
      calendarEvent: true,
      createdBy: { select: { id: true } },
      assignedTeam: { select: { userId: true, user: { select: { id: true } } } },
      tasks: {
        select: {
          id: true,
          status: true,
          assignedEmployees: { select: { userId: true, user: { select: { id: true } } } },
        },
      },
      graphicRequirements: { select: { id: true, createdById: true } },
      approvals: { select: { id: true, status: true, approvalType: true, targetRole: true } },
    };
    const project = await this.prisma.shootProject.findUnique({ where: { id }, include: authInclude });
    if (project) return project;
    return this.prisma.shootProject.findFirst({ where: { OR: [{ projectId: id }, { id }] }, include: authInclude });
  }

  /**
   * Single source of truth for "does this person count as a video editor".
   *
   * Designation and Skill.name are free text, so matching is a case-insensitive substring over
   * "edit"/"post-production". The picker and the assign endpoint both call this, so posting an
   * id the picker would not offer cannot smuggle in a non-editor.
   */
  private isVideoEditorCandidate(designation?: string | null, skills: string[] = []): boolean {
    // Anchored so a free-text designation like "Credit Executive" does not match on the
    // substring "edit" inside "credit".
    const pattern = /\b(edit(?:or|ors|ing)?|post[\s-]?production)\b/i;
    return [designation || '', ...skills].some((v) => pattern.test(v));
  }

  /**
   * Candidate video editors for a shoot project: active users whose designation or skills
   * identify them as an editor. An empty picker simply means no one in the agency is flagged
   * as an editor yet.
   */
  async getScriptEditorCandidates(projectId: string, user: any) {
    const project = await this.resolveShootProject(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (!canUserViewProject(user, project)) {
      throw new ForbiddenException('You do not have access to this project.');
    }

    const users = await this.prisma.user.findMany({
      where: {
        isArchived: false,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
        employeeProfile: {
          select: {
            designation: true,
            skills: { select: { skill: { select: { name: true, category: true } } } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const candidates = users
      .map((u) => {
        const designation = u.employeeProfile?.designation || '';
        const skills = (u.employeeProfile?.skills || []).map((s) => s.skill.name);
        if (!this.isVideoEditorCandidate(designation, skills)) return null;
        return {
          id: u.id,
          name: u.name,
          role: u.role,
          avatarUrl: u.avatarUrl,
          designation,
          skills,
        };
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);

    return { projectId: project.id, candidates };
  }

  /**
   * Assigns (or clears) the video editor for one uploaded script document on a shoot project.
   * Media Manager only, enforced here as well as by @Roles on the controller, because a
   * manager is not necessarily in the project team and must not depend on that to act.
   */
  async setScriptVideoEditor(
    projectId: string,
    fileId: string,
    editorId: string | null | undefined,
    user: any,
  ) {
    const isMediaManager = user?.role === Role.MEDIA_MANAGER || user?.role === 'ADMIN' || user?.role === Role.ADMINISTRATOR;
    if (!isMediaManager) {
      throw new ForbiddenException('Only a Media Manager can assign a video editor to a script.');
    }

    const project = await this.resolveShootProject(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const fileKey = (fileId || '').trim();
    if (!fileKey) throw new BadRequestException('A script document id is required.');
    // Defense in depth: the role check above already admits only managers, but keep the project
    // visibility check so this endpoint cannot become a wider hole if the guard is ever relaxed.
    if (!canUserViewProject(user, project)) {
      throw new ForbiddenException('You do not have access to this project.');
    }

    // The document must belong to this project. Without this, a manager could attach an
    // assignment to a file id from a different project and read its editor back in findOne.
    const file = await this.prisma.fileMetadata.findFirst({
      where: { id: fileKey, projectId: project.id },
      select: { id: true, fileName: true },
    });
    if (!file) throw new NotFoundException('Script document not found on this project.');

    // Unassign: clearing is a normal operation and must work even if the document has since
    // been renamed, so the row is matched on the stored fileId.
    if (!editorId) {
      const existing = await this.prisma.scriptEditorAssignment.findUnique({
        where: { projectId_fileId: { projectId: project.id, fileId: fileKey } },
      });
      if (!existing) throw new NotFoundException('No video editor is assigned to that script document.');

      await this.prisma.scriptEditorAssignment.delete({ where: { id: existing.id } });
      await this.prisma.activityLog.create({
        data: {
          userId: user?.id || user?.sub || null,
          action: 'UNASSIGN_SCRIPT_VIDEO_EDITOR',
          entity: 'FileMetadata',
          entityId: file.id,
          description: `Removed the video editor from script document '${file.fileName}'`,
        },
      });
      return this.findOne(project.id, user);
    }

    const editor = await this.prisma.user.findUnique({
      where: { id: editorId },
      select: {
        id: true,
        name: true,
        role: true,
        isArchived: true,
        status: true,
        employeeProfile: { select: { designation: true, skills: { select: { skill: { select: { name: true } } } } } },
      },
    });
    if (!editor) throw new NotFoundException('Selected video editor not found.');
    if (editor.isArchived || editor.status !== 'ACTIVE') {
      throw new BadRequestException('That user is not active and cannot be assigned.');
    }

    // The picker is filtered to editors, but the endpoint is reachable directly, so re-check
    // eligibility with the same predicate the picker uses rather than trusting the client.
    const skills = (editor.employeeProfile?.skills || []).map((s) => s.skill.name);
    if (!this.isVideoEditorCandidate(editor.employeeProfile?.designation, skills)) {
      throw new BadRequestException(
        'That user is not flagged as a video editor. Set their designation to "Video Editor" or add a video editing skill first.',
      );
    }

    const saved = await this.prisma.scriptEditorAssignment.upsert({
      where: { projectId_fileId: { projectId: project.id, fileId: fileKey } },
      create: {
        projectId: project.id,
        fileId: fileKey,
        userId: editor.id,
        assignedById: user?.id || user?.sub || null,
      },
      update: {
        userId: editor.id,
        assignedById: user?.id || user?.sub || null,
        assignedAt: new Date(),
        // A new editor starts the workflow over: the previous editor's task and its
        // progress no longer describe who is doing the work.
        editingStatus: 'ASSIGNED',
        editingFinishedAt: null,
        videoEditingFinished: false,
      },
    });

    // Add the editor to the project team so canUserViewProject lets them open the project page
    // and the task inspector: STAFF are refused project access unless they are on assignedTeam
    // or hold an assignment on one of its tasks, graphic requirements, or the calendar event.
    // This must not fail silently - without team membership the editor can accept the task but
    // cannot load the project's files, so "+ Add New Script" would never work for them.
    try {
      await this.prisma.projectAssignment.upsert({
        where: { projectId_userId: { projectId: project.id, userId: editor.id } },
        create: {
          projectId: project.id,
          userId: editor.id,
          roleInProject: 'VIDEO_EDITOR',
          assignedAt: new Date(),
        },
        update: { roleInProject: 'VIDEO_EDITOR' },
      });
    } catch (teamErr) {
      console.error('Could not add video editor to the project team:', teamErr);
      throw new InternalServerErrorException(
        'The editor was assigned, but could not be added to the project team, so they would not be able to open the project. Please add them to the team and try again.',
      );
    }

    // Create (or reuse) the video-editing task so the editor sees it in their Tasks list.
    // They accept it there, then request technical review to finish - reusing the existing
    // task acceptance and review chain rather than inventing a parallel one.
    const editingTask = await this.ensureVideoEditingTask(project, file, editor, user);

    await this.prisma.scriptEditorAssignment.update({
      where: { id: saved.id },
      data: { taskId: editingTask?.id || null },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user?.id || user?.sub || null,
        action: 'ASSIGN_SCRIPT_VIDEO_EDITOR',
        entity: 'FileMetadata',
        entityId: file.id,
        description: `Assigned ${editor.name} as video editor for script document '${file.fileName}'`,
      },
    });

    await this.prisma.notification
      .create({
        data: {
          userId: editor.id,
          title: 'New Video Editing Assignment',
          message: `You have been assigned to edit the video for script document '${file.fileName}' on project ${project.projectId}. Accept the task to start.`,
          type: 'ALERT',
          category: 'ASSIGNMENT',
          priority: 'HIGH',
          linkUrl: `/tasks`,
          eventType: 'VIDEO_EDITING_ASSIGNED',
          entityType: 'ShootProject',
          entityId: project.id,
          entityCode: project.projectId,
          projectId: project.id,
        },
      })
      .catch(() => null);

    return {
      ...saved,
      taskId: editingTask?.id || null,
      user: { id: editor.id, name: editor.name, role: editor.role, avatarUrl: null },
    };
  }

  /**
   * Find-or-create the Task that carries one script document's video editing work.
   *
   * Reassigning an editor to a document that already has a task re-points that task at the
   * new editor and resets it, rather than creating a second task for the same document.
   * The task is a normal Task with taskType VIDEO_EDITING, so the existing acceptance,
   * technical review and media review endpoints apply unchanged.
   */
  private async ensureVideoEditingTask(
    project: { id: string; projectId: string; name?: string | null },
    file: { id: string; fileName: string },
    editor: { id: string; name: string },
    assignedBy: any,
  ) {
    const existing = await this.prisma.scriptEditorAssignment.findFirst({
      where: { projectId: project.id, fileId: file.id, taskId: { not: null } },
      select: { taskId: true },
    });
    if (existing?.taskId) {
      const prior = await this.prisma.task.findFirst({
        where: { OR: [{ id: existing.taskId }, { taskId: existing.taskId }] },
        select: { id: true },
      });
      if (prior) {
        await this.prisma.taskAssignment.deleteMany({
          where: { OR: [{ taskId: prior.id }, { taskId: (existing.taskId as any) }] },
        });
        await this.prisma.taskAssignment
          .create({
            data: { taskId: prior.id, userId: editor.id, acceptanceStatus: 'NOT_YET_ACCEPTED' },
          })
          .catch(() => null);
        await this.prisma.task
          .update({
            where: { id: prior.id },
            data: {
              status: TaskStatus.ASSIGNED,
              completionPercentage: 0,
              technicalReviewApproved: false,
              mediaManagerApproved: false,
              activeDeliverableUrl: null,
              activeDeliverableFileName: null,
            },
          })
          .catch(() => null);
        return prior;
      }
    }

    // Generate the next business task code the same way task creation does.
    const count = await this.prisma.task.count();
    let autoTaskId = `TSK-${(count + 1).toString().padStart(6, '0')}`;
    let clash = await this.prisma.task.findUnique({ where: { taskId: autoTaskId }, select: { id: true } });
    let bump = count + 1;
    while (clash) {
      bump += 1;
      autoTaskId = `TSK-${bump.toString().padStart(6, '0')}`;
      clash = await this.prisma.task.findUnique({ where: { taskId: autoTaskId }, select: { id: true } });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const created = await this.prisma.task.create({
      data: {
        taskId: autoTaskId,
        title: `Video Editing - ${file.fileName}`,
        description: `Video editing task for script document '${file.fileName}' on shoot project ${project.projectId} (${project.name || 'Shoot Project'}). Step 1: Accept this task. Step 2: upload the finished cut using the "Deliverable" button on the task row. Step 3: press "Tech Review" to send the edit for Technical Manager approval.`,
        projectId: project.id,
        priority: Priority.MEDIUM,
        dueDate,
        estimatedHours: 2.0,
        status: TaskStatus.ASSIGNED,
        sourceType: 'SHOOT_PROJECT',
        taskType: 'VIDEO_EDITING',
        completionPercentage: 0,
      },
    });

    await this.prisma.taskAssignment
      .create({
        data: { taskId: created.id, userId: editor.id, acceptanceStatus: 'NOT_YET_ACCEPTED' },
      })
      .catch(() => null);

    await this.prisma.taskTimeline
      .create({
        data: {
          taskId: created.id,
          userId: assignedBy?.id || assignedBy?.sub || null,
          event: 'TASK_ASSIGNED',
          description: `Video editing assigned to ${editor.name} by ${assignedBy?.name || 'a Media Manager'} for script document '${file.fileName}'.`,
        },
      })
      .catch(() => null);

    return created;
  }

  /**
   * The assigned video editor marks editing as finished for one assigned script document.
   *
   * Rather than inventing a parallel completion path, this drives the existing review chain:
   * the task is moved to WAITING_FOR_TECHNICAL_REVIEW and a Technical Review Approval is
   * raised, exactly as requestTechnicalReview does. From there the Technical Manager and
   * Media Manager approve it in the normal way. The assignment row is flagged as finished so
   * the project page can show that state immediately.
   */
  async finishScriptVideoEditing(projectId: string, fileId: string, user: any) {
    const project = await this.resolveShootProject(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const fileKey = (fileId || '').trim();
    if (!fileKey) throw new BadRequestException('A script document id is required.');

    const assignment = await this.prisma.scriptEditorAssignment.findFirst({
      where: { projectId: project.id, fileId: fileKey, userId: user?.id || user?.sub },
      include: { file: { select: { id: true, fileName: true } } },
    });
    if (!assignment) {
      throw new ForbiddenException('Only the assigned video editor can mark this script as edited.');
    }
    if (assignment.videoEditingFinished) {
      throw new BadRequestException('Video editing is already marked as finished for this script.');
    }
    if (!assignment.taskId) {
      throw new BadRequestException('No video editing task exists for this script. Ask the Media Manager to reassign it.');
    }

    const task = await this.prisma.task.findFirst({
      where: { OR: [{ id: assignment.taskId }, { taskId: assignment.taskId }] },
      select: { id: true, taskId: true, title: true, status: true, assignedEmployees: true },
    });
    if (!task) throw new NotFoundException('Video editing task not found.');

    const accepted = (task.assignedEmployees || []).some(
      (a: any) => a.userId === (user?.id || user?.sub) && a.acceptanceStatus === 'ACCEPTED',
    );

    // A manager or admin may finish on the editor's behalf; the editor themselves must have
    // accepted the task first, so nobody can mark work finished without taking it on.
    const isManager = user?.role === Role.MEDIA_MANAGER || user?.role === 'ADMIN' || user?.role === Role.ADMINISTRATOR;
    const isAssignedEditor = assignment.userId === (user?.id || user?.sub);
    if (!isManager) {
      if (!isAssignedEditor) {
        throw new ForbiddenException('Only the assigned video editor can mark this script as edited.');
      }
      if (!accepted) {
        throw new ForbiddenException('Accept the video editing task before marking it as finished.');
      }
    }

    // A finished edit needs a deliverable to review, matching the existing rule that a
    // technical review cannot be requested without an uploaded output.
    const full = await this.prisma.task.findUnique({ where: { id: task.id }, select: { activeDeliverableUrl: true } });
    if (!full?.activeDeliverableUrl) {
      throw new BadRequestException('Upload the finished video as a deliverable before marking editing as finished.');
    }

    await this.prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.WAITING_FOR_TECHNICAL_REVIEW, completionPercentage: 50 },
    });

    await this.prisma.approval
      .create({
        data: {
          entityType: 'TASK',
          entityId: task.id,
          approvalType: 'TECHNICAL_REVIEW',
          targetRole: 'TECHNICAL_MANAGER',
          requestedById: user?.id || user?.sub || null,
          projectId: project.id,
          status: 'PENDING',
          remarks: `Video editing finished for script document '${assignment.file.fileName}' by ${user?.name}. Ready for technical review.`,
        },
      })
      .catch(() => null);

    const technicalManagers = await this.prisma.user.findMany({
      where: { role: Role.TECHNICAL_MANAGER, status: 'ACTIVE' },
      select: { id: true },
    });
    for (const tm of technicalManagers) {
      await this.prisma.notification
        .create({
          data: {
            userId: tm.id,
            title: 'Video Edit Ready for Technical Review',
            message: `${user?.name} finished video editing for '${assignment.file.fileName}' (Task ${task.taskId}). Technical approval required.`,
            type: 'ALERT',
            category: 'APPROVAL',
            priority: 'HIGH',
            linkUrl: '/approvals',
            eventType: 'VIDEO_EDITING_FINISHED',
            entityType: 'TASK',
            entityId: task.id,
            entityCode: task.taskId,
            taskId: task.id,
            projectId: project.id,
          },
        })
        .catch(() => null);
    }

    await this.prisma.scriptEditorAssignment.update({
      where: { id: assignment.id },
      data: { videoEditingFinished: true, editingStatus: 'FINISHED', editingFinishedAt: new Date() },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user?.id || user?.sub || null,
        action: 'VIDEO_EDITING_FINISHED',
        entity: 'FileMetadata',
        entityId: assignment.file.id,
        description: `${user?.name} finished video editing for '${assignment.file.fileName}'; sent for technical review.`,
      },
    });

    return this.findOne(project.id, user);
  }

  /**
   * Mirrors the editing workflow state from the linked task onto the assignment row, so the
   * project page shows ACCEPTED / IN_REVIEW / COMPLETED without a second source of truth.
   */
  async syncScriptEditingStatus(projectId: string, currentUser?: any) {
    const project = await this.resolveShootProject(projectId);
    if (!project) return;
    if (currentUser && !canUserViewProject(currentUser, project)) return;

    const assignments = await this.prisma.scriptEditorAssignment.findMany({
      where: { projectId: project.id, taskId: { not: null } },
      select: { id: true, taskId: true, editingStatus: true, videoEditingFinished: true },
    });
    if (!assignments.length) return;

    const tasks = await this.prisma.task.findMany({
      where: { id: { in: assignments.map((a) => a.taskId as string).filter(Boolean) } },
      select: { id: true, status: true },
    });
    const statusById = new Map(tasks.map((t) => [t.id, t.status]));

    for (const a of assignments) {
      const status = statusById.get(a.taskId as string);
      if (!status) continue;
      const next =
        status === TaskStatus.COMPLETED
          ? 'COMPLETED'
          : status === TaskStatus.WAITING_FOR_TECHNICAL_REVIEW || status === TaskStatus.WAITING_FOR_MEDIA_REVIEW
          ? 'IN_REVIEW'
          : status === TaskStatus.IN_PROGRESS
          ? 'ACCEPTED'
          : 'ASSIGNED';
      if (next === a.editingStatus) continue;
      await this.prisma.scriptEditorAssignment
        .update({ where: { id: a.id }, data: { editingStatus: next } })
        .catch(() => null);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────────
  // Convert-to-Video-Editing workflow
  //
  // After a shoot project reaches the mark COMPLETED, the Media Manager clicks
  // "Convert to Video Editing". This:
  //   1. Reads the JSON array of scripts from ShootProject.notes.
  //   2. Creates exactly one Task per script, keyed on (projectId, scriptId).
  //   3. Notifies the Media Manager of which tasks were created.
  //
  // The flow then continues: Media Manager assigns each task to a Staff member
  // (via the standard TaskAssignment mechanism), staff completes the task and
  // it moves through Media Manager Review -> Marketing Manager Review ->
  // MARKETING_MANAGER_APPROVED. The project becomes COMPLETED only after every
  // editing task on it is MARKETING_MANAGER_APPROVED.
  //
  // Idempotent: the (projectId, scriptId) unique constraint prevents duplicates
  // when Convert is clicked twice.
  // ────────────────────────────────────────────────────────────────────────────────

  /**
   * Returns every Script Document (FileMetadata row with attachmentCategory='SCRIPT_DOCUMENT')
   * attached to a project. This is the SAME source the Scripts tab renders, so the
   * Convert-to-Video Editing Task panel and Script Session always show identical records.
   *
   * Each returned script carries:
   *   - id: the FileMetadata primary key (used as Task.scriptId)
   *   - title: the uploaded file name
   *   - clipCodes: parsed from FileMetadata.clipCodes (JSON array of { code, description, addedBy, addedAt })
   *   - storagePath: the file's storage path (used by the View button)
   *   - createdAt / uploadedBy: audit fields
   */
  async getScriptDocuments(projectId: string, user: any) {
    const project = await this.resolveShootProject(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (!canUserViewProject(user, project)) {
      throw new ForbiddenException('You do not have access to this project.');
    }
    const scripts = await this.getProjectScriptDocuments(project.id);
    return {
      projectId: project.id,
      projectCode: project.projectId,
      projectName: project.name,
      videoEditingConverted: project.videoEditingConverted,
      totalScripts: scripts.length,
      scripts,
    };
  }

  async getVideoEditingTaskScripts(projectId: string, user: any) {
    const project = await this.resolveShootProject(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (!canUserViewProject(user, project)) {
      throw new ForbiddenException('You do not have access to this project.');
    }
    const scripts = await this.getProjectScriptDocuments(project.id);
    return {
      projectId: project.id,
      projectCode: project.projectId,
      projectName: project.name,
      videoEditingConverted: project.videoEditingConverted,
      totalScripts: scripts.length,
      scripts,
    };
  }

  /**
   * Fetches and normalizes the Script Documents for a project. Shared by
   * getVideoEditingTaskScripts and convertToVideoEditing so both paths read the
   * exact same records.
   */
  private async getProjectScriptDocuments(projectId: string) {
    // 1. Check first-class ProjectScript table
    const projectScripts = await this.prisma.projectScript.findMany({
      where: { projectId },
      include: {
        clips: { orderBy: { order: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { order: 'asc' },
    });

    if (projectScripts.length > 0) {
      return projectScripts.map((ps) => ({
        id: ps.id,
        title: ps.name,
        fileName: ps.name,
        name: ps.name,
        storagePath: null,
        attachmentCategory: 'SCRIPT_DOCUMENT',
        clipCode: ps.clipCode,
        clipCodes: ps.clipCode ? [{ code: ps.clipCode, description: ps.description || '' }] : [],
        clips: ps.clips || [],
        description: ps.description,
        order: ps.order,
        status: ps.status,
        createdAt: ps.createdAt,
        uploadedBy: ps.createdBy,
      }));
    }

    // 2. Check FileMetadata table
    const files = await this.prisma.fileMetadata.findMany({
      where: {
        projectId,
        attachmentCategory: 'SCRIPT_DOCUMENT',
      },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (files.length > 0) {
      return files.map((f) => ({
        id: f.id,
        title: f.fileName,
        fileName: f.fileName,
        name: f.fileName,
        storagePath: f.storagePath,
        attachmentCategory: f.attachmentCategory,
        clipCode: this.parseFileClipCodes(f.clipCodes).map((c: any) => c.code).join(', ') || null,
        clipCodes: this.parseFileClipCodes(f.clipCodes),
        clips: [],
        createdAt: f.createdAt,
        uploadedBy: f.uploadedBy,
      }));
    }

    // 3. Fallback: check ShootProject.notes JSON array
    const project = await this.prisma.shootProject.findUnique({ where: { id: projectId }, select: { notes: true } });
    if (project?.notes && typeof project.notes === 'string') {
      const trimmed = project.notes.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.scripts) ? parsed.scripts : []);
          if (list.length > 0) {
            return list.map((s: any, idx: number) => {
              const code = Array.isArray(s.clipCodes) && s.clipCodes.length > 0
                ? s.clipCodes.map((c: any) => (typeof c === 'string' ? c : c.code)).join(', ')
                : (s.clipCode || null);
              return {
                id: s.id || `script-${idx + 1}`,
                title: s.title || `Script #${idx + 1}`,
                fileName: s.title || `Script #${idx + 1}`,
                name: s.title || `Script #${idx + 1}`,
                storagePath: null,
                attachmentCategory: 'SCRIPT_DOCUMENT',
                clipCode: code,
                clipCodes: Array.isArray(s.clipCodes)
                  ? s.clipCodes.map((c: any) => (typeof c === 'string' ? { code: c } : c))
                  : (code ? [{ code }] : []),
                clips: [],
                description: s.scriptText || s.notes || s.description || null,
                createdAt: s.createdAt || new Date(),
              };
            });
          }
        } catch {
          // not valid json
        }
      }
    }

    return [];
  }

  /**
   * Parses the FileMetadata.clipCodes JSON column into a normalized array.
   * Tolerates malformed JSON and non-array values by returning [].
   */
  private parseFileClipCodes(raw: any): Array<{ code: string; description?: string; addedBy?: string; addedAt?: string }> {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .filter((c: any) => c && typeof c.code === 'string' && c.code.trim())
        .map((c: any) => ({
          code: c.code.trim(),
          description: c.description || '',
          addedBy: c.addedBy || undefined,
          addedAt: c.addedAt || undefined,
        }));
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((c: any) => c && typeof c.code === 'string' && c.code.trim())
            .map((c: any) => ({
              code: c.code.trim(),
              description: c.description || '',
              addedBy: c.addedBy || undefined,
              addedAt: c.addedAt || undefined,
            }));
        }
      } catch {
        // not valid json
      }
    }
    return [];
  }

  /**
   * Media Manager converts a completed shoot project into the Video Editing phase.
   * Idempotent on (projectId, scriptId) so a second click never duplicates.
   *
   * Supports both converting a single selected script (body.scriptId) or batch converting (body.scripts).
   * Verifies that each script belongs to this project (rejects cross-project scripts).
   * Stores the exact Script ID, ProjectScript relation, Script Clip Code, Project Priority, and Due Date.
   */
  async convertToVideoEditing(
    projectId: string,
    user: any,
    body?: {
      scriptId?: string;
      staffId?: string;
      dueDate?: string;
      scripts?: Array<{ scriptId: string; clipCode?: string; staffId: string; dueDate?: string }>;
    },
  ) {
    const isMediaManager =
      user?.role === Role.MEDIA_MANAGER || user?.role === 'ADMIN' || user?.role === Role.ADMINISTRATOR;
    if (!isMediaManager) {
      throw new ForbiddenException('Only a Media Manager can convert a Shoot Project to Video Editing.');
    }

    const project = await this.resolveShootProject(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const convertibleStatuses = [
      ProjectStatus.PLANNED,
      ProjectStatus.READY_FOR_PRODUCTION,
      ProjectStatus.IN_PROGRESS,
      'IN_PRODUCTION',
      ProjectStatus.WAITING_FOR_TECHNICAL_REVIEW,
      ProjectStatus.WAITING_FOR_MEDIA_REVIEW,
      ProjectStatus.WAITING_FOR_CLIENT_CONFIRMATION,
      ProjectStatus.CLIENT_REVISION_REQUESTED,
      ProjectStatus.COMPLETED,
      'APPROVED',
    ];
    if (!convertibleStatuses.includes(project.status as ProjectStatus)) {
      throw new BadRequestException(
        `Project cannot be converted from its current status: ${project.status}.`,
      );
    }

    let projectScripts = await this.getProjectScriptDocuments(project.id);
    if (projectScripts.length === 0) {
      const defaultPs = await this.prisma.projectScript.create({
        data: {
          projectId: project.id,
          name: `${project.name || 'Shoot Project'} - Main Cut`,
          clipCode: project.projectId,
          description: `Main video editing cut for project ${project.projectId}`,
          createdById: user?.id || user?.sub || null,
        },
      });
      projectScripts = [{
        id: defaultPs.id,
        title: defaultPs.name,
        fileName: defaultPs.name,
        name: defaultPs.name,
        storagePath: null,
        attachmentCategory: 'SCRIPT_DOCUMENT',
        clipCode: defaultPs.clipCode,
        clipCodes: defaultPs.clipCode ? [{ code: defaultPs.clipCode }] : [],
        clips: [],
        createdAt: defaultPs.createdAt,
        uploadedBy: null,
      }];
    }

    // Determine target scripts to convert
    let targetScripts = projectScripts;
    let submitted = body?.scripts || (body?.scriptId && body?.staffId ? [{ scriptId: body.scriptId, clipCode: '', staffId: body.staffId, dueDate: body.dueDate }] : []);
    
    // If a global staffId was passed or single staff was selected for the project
    if (submitted.length === 0 && body?.staffId) {
      submitted = targetScripts.map((s) => ({ scriptId: s.id, clipCode: s.clipCode || '', staffId: body.staffId!, dueDate: body?.dueDate }));
    }

    if (body?.scriptId) {
      const match = projectScripts.find((s) => s.id === body.scriptId);
      if (match) {
        targetScripts = [match];
      }
    }

    const errors: string[] = [];
    for (let i = 0; i < targetScripts.length; i++) {
      const script = targetScripts[i];
      let match = submitted.find((s) => s.scriptId === script.id);
      if (!match && submitted.length === 1 && targetScripts.length === 1) {
        match = submitted[0];
      }
      if (!match || !match.staffId || !match.staffId.trim()) {
        errors.push(`Script "${script.title || script.name}" requires a Video Editor assignment.`);
      }
    }
    if (errors.length > 0) {
      throw new BadRequestException(
        `Please assign a Video Editor to all Scripts before completing the Project Shoot.\n${errors.join('\n')}`
      );
    }

    // Validate active staff members
    const staffIds = [...new Set(submitted.map((s) => s.staffId).filter(Boolean))];
    const validStaff = await this.prisma.user.findMany({
      where: { id: { in: staffIds }, isArchived: false, status: 'ACTIVE' },
      select: { id: true, name: true },
    });
    if (validStaff.length !== staffIds.length) {
      throw new BadRequestException('One or more selected staff members are not active.');
    }

    const existingTasks = await this.prisma.task.findMany({
      where: { taskId: { startsWith: 'TSK-' } },
      select: { taskId: true },
    });
    const usedTaskIds = new Set<string>(existingTasks.map((t) => t.taskId));
    let nextSeq = existingTasks.length + 1;
    const created: Array<{ task: any; script: any }> = [];
    const reused: Array<{ task: any; script: any }> = [];

    await this.prisma.$transaction(
      async (tx) => {
        for (const script of targetScripts) {
          // Ensure first-class ProjectScript record exists
          let ps = await tx.projectScript.findFirst({
            where: {
              OR: [
                { id: script.id },
                { projectId: project.id, name: script.title || script.name || 'Script' },
              ],
            },
          });
          if (!ps) {
            ps = await tx.projectScript.create({
              data: {
                projectId: project.id,
                name: script.title || script.name || 'Script',
                clipCode: script.clipCode || (script.clipCodes?.[0]?.code) || null,
                description: script.description || null,
                createdById: user?.id || user?.sub || null,
              },
            });
          }

          const existing = await tx.task.findFirst({
            where: {
              projectId: project.id,
              taskType: 'VIDEO_EDITING',
              OR: [
                { scriptId: script.id },
                { scriptId: ps.id },
                { projectScriptId: ps.id },
              ],
            },
            select: { id: true, taskId: true, title: true },
          });
          if (existing) {
            reused.push({ task: existing, script });
            continue;
          }

          let match = submitted.find((s) => s.scriptId === script.id || s.scriptId === ps.id);
          if (!match && submitted.length === 1 && targetScripts.length === 1) {
            match = submitted[0];
          }
          const clipCode = match?.clipCode || script.clipCode || ps.clipCode || (script.clipCodes && script.clipCodes.length > 0 ? script.clipCodes.map((c: any) => c.code).join(', ') : null);
          const staffId = match?.staffId;

          let candidate = `TSK-${String(nextSeq).padStart(6, '0')}`;
          while (usedTaskIds.has(candidate)) {
            nextSeq += 1;
            candidate = `TSK-${String(nextSeq).padStart(6, '0')}`;
          }
          usedTaskIds.add(candidate);
          nextSeq += 1;

          let taskDueDate = new Date();
          if (match?.dueDate) {
            taskDueDate = new Date(match.dueDate);
          } else if (body?.dueDate) {
            taskDueDate = new Date(body.dueDate);
          } else {
            taskDueDate.setDate(taskDueDate.getDate() + 5);
          }

          const task = await tx.task.create({
            data: {
              taskId: candidate,
              title: `Video Editing - ${script.title || script.name || 'Script'}`,
              description:
                `Video Editing Task for script "${script.title || script.name || 'Script'}" on project ${project.projectId} (${project.name || 'Shoot Project'}). ` +
                (clipCode ? `Clip Code: ${clipCode}. ` : '') +
                `This is a dedicated Video Editing Task (not a Project Shoot Task). ` +
                `Step 1: Accept this task. ` +
                `Step 2: Complete the video editing work for this script. ` +
                `Step 3: Click "Submit for Technical Review" to send the edit for Technical Manager approval.`,
              projectId: project.id,
              clientId: project.clientId,
              brandId: project.brandId,
              productId: project.productId,
              priority: (project.priority as any) || Priority.MEDIUM,
              dueDate: taskDueDate,
              estimatedHours: 3.0,
              status: TaskStatus.ASSIGNED,
              sourceType: 'SHOOT_PROJECT',
              taskType: 'VIDEO_EDITING',
              completionPercentage: 0,
              scriptId: ps.id,
              projectScriptId: ps.id,
              clipCode,
            },
          });

          if (staffId) {
            await tx.taskAssignment.create({
              data: { taskId: task.id, userId: staffId, acceptanceStatus: 'NOT_YET_ACCEPTED' },
            }).catch(() => null);
          }

          await tx.taskTimeline.create({
            data: {
              taskId: task.id,
              userId: user?.id || user?.sub || null,
              event: 'TASK_CREATED',
              description: `Video editing task auto-created for script "${script.title || script.name || 'Script'}" with priority ${project.priority || 'MEDIUM'} and due date ${taskDueDate.toLocaleDateString()}.`,
            },
          }).catch(() => null);

          await tx.activityLog.create({
            data: {
              userId: user?.id || user?.sub || null,
              action: 'CONVERT_TO_VIDEO_EDITING',
              entity: 'Task',
              entityId: task.id,
              description: `Auto-created video editing task ${task.taskId} for script "${script.title || script.name || 'Script'}" on project ${project.projectId}.`,
            },
          }).catch(() => null);

          created.push({ task, script });
        }

        // Transition project to CONVERTED_TO_VIDEO_EDITING
        await tx.shootProject.update({
          where: { id: project.id },
          data: {
            videoEditingConverted: true,
            videoEditingConvertedAt: new Date(),
            videoEditingConvertedBy: user?.id || user?.sub || null,
            status: ProjectStatus.CONVERTED_TO_VIDEO_EDITING,
            progressPercentage: 50,
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 30000,
      },
    );

    if (user?.id || user?.sub) {
      await this.prisma.notification.create({
        data: {
          userId: user.id || user.sub,
          title: 'Project Converted to Video Editing',
          message:
            `Project ${project.projectId} status is now CONVERTED TO VIDEO EDITING. ${created.length} video editing task(s) were created ` +
            `(${reused.length} already existed). The project will automatically complete once all video editing tasks receive final Marketing Manager approval.`,
          type: 'SUCCESS',
          category: 'PROJECT',
          priority: 'HIGH',
          linkUrl: `/projects/${project.id}`,
          eventType: 'PROJECT_CONVERTED_TO_VIDEO_EDITING',
          entityType: 'ShootProject',
          entityId: project.id,
          entityCode: project.projectId,
          projectId: project.id,
        },
      }).catch(() => null);
    }

    return {
      projectId: project.id,
      projectCode: project.projectId,
      totalScripts: targetScripts.length,
      createdTaskIds: created.map((c) => c.task.taskId),
      reusedTaskIds: reused.map((c) => c.task.taskId),
      tasks: [
        ...created.map((c) => ({
          taskId: c.task.taskId,
          scriptId: c.script.id,
          title: c.task.title,
          created: true,
          script: {
            id: c.script.id,
            title: c.script.title,
            clipCodes: c.script.clipCodes || [],
          },
        })),
        ...reused.map((c) => ({
          taskId: c.task.taskId,
          scriptId: c.script.id,
          title: c.task.title,
          created: false,
          script: {
            id: c.script.id,
            title: c.script.title,
            clipCodes: c.script.clipCodes || [],
          },
        })),
      ],
    };
  }

  /**
   * Media Manager approves or rejects a completed Video Editing Task.
   * APPROVE -> WAITING_FOR_MARKETING_MANAGER_REVIEW.
   * REJECT  -> IN_PROGRESS (back to Staff for revision).
   */
  async reviewVideoEditingMedia(
    projectId: string,
    taskId: string,
    body: { action: 'APPROVE' | 'REJECT'; comment?: string },
    user: any,
  ) {
    const isMediaManager =
      user?.role === Role.MEDIA_MANAGER || user?.role === 'ADMIN' || user?.role === Role.ADMINISTRATOR;
    if (!isMediaManager) {
      throw new ForbiddenException('Only a Media Manager can approve or reject a Video Editing Task.');
    }

    const project = await this.resolveShootProject(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const task = await this.prisma.task.findFirst({
      where: {
        projectId: project.id,
        taskType: 'VIDEO_EDITING',
        OR: [{ id: taskId }, { taskId }],
      },
      select: { id: true, taskId: true, title: true, status: true, scriptId: true },
    });
    if (!task) throw new NotFoundException('Video editing task not found.');

    if (body?.action === 'APPROVE') {
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'WAITING_FOR_MARKETING_APPROVAL',
          mediaManagerApproved: true,
          completionPercentage: 75,
          mediaRevisionReason: null,
        },
      });

      await this.prisma.approval.create({
        data: {
          projectId: project.id,
          entityType: 'TASK',
          entityId: task.id,
          approvalType: 'MEDIA_MANAGER_REVIEW',
          stage: 'MEDIA_MANAGER_REVIEW',
          round: 1,
          version: 'v1',
          targetRole: 'MARKETING_MANAGER',
          requestedById: user.id || user.sub || null,
          reviewerId: user.id || user.sub || null,
          status: 'APPROVED',
          remarks: body?.comment || 'Media Manager Review Approved',
          reviewedAt: new Date(),
        },
      }).catch(() => null);

      await this.prisma.activityLog.create({
        data: {
          userId: user.id || user.sub || null,
          action: 'VIDEO_EDITING_MEDIA_APPROVED',
          entity: 'Task',
          entityId: task.id,
          description: `Media Manager approved editing task ${task.taskId} on project ${project.projectId}.`,
        },
      }).catch(() => null);

      const marketingManagers = await this.prisma.user.findMany({
        where: { role: { in: ['MARKETING_MANAGER'] }, status: 'ACTIVE', isArchived: false },
        select: { id: true },
      });
      for (const mm of marketingManagers) {
        await this.prisma.notification.create({
          data: {
            userId: mm.id,
            title: 'Video Editing Ready for Marketing Review',
            message: `${task.taskId} (${task.title}) on project ${project.projectId} was approved by Media Manager and is waiting for Marketing review.`,
            type: 'ALERT',
            category: 'APPROVAL',
            priority: 'HIGH',
            linkUrl: `/tasks`,
            eventType: 'VIDEO_EDITING_MARKETING_REVIEW',
            entityType: 'TASK',
            entityId: task.id,
            entityCode: task.taskId,
            taskId: task.id,
            projectId: project.id,
          },
        }).catch(() => null);
      }

      return this.findOne(project.id, user);
    }

    if (body?.action === 'REJECT') {
      const reason = (body?.comment || '').trim();
      if (!reason) throw new BadRequestException('Rejection reason is required.');
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.IN_PROGRESS,
          mediaManagerApproved: false,
          mediaRevisionReason: reason,
          completionPercentage: 50,
        },
      });

      await this.prisma.approval.create({
        data: {
          projectId: project.id,
          entityType: 'TASK',
          entityId: task.id,
          approvalType: 'MEDIA_MANAGER_REVIEW',
          stage: 'MEDIA_MANAGER_REVIEW',
          round: 1,
          version: 'v1',
          targetRole: 'STAFF',
          requestedById: user.id || user.sub || null,
          reviewerId: user.id || user.sub || null,
          status: 'REJECTED',
          remarks: reason,
          returnedStatus: TaskStatus.IN_PROGRESS,
          reviewedAt: new Date(),
        },
      }).catch(() => null);

      await this.prisma.activityLog.create({
        data: {
          userId: user.id || user.sub || null,
          action: 'VIDEO_EDITING_MEDIA_REJECTED',
          entity: 'Task',
          entityId: task.id,
          description: `Media Manager REJECTED editing task ${task.taskId}: ${reason}. Returned to IN_PROGRESS for revision.`,
        },
      }).catch(() => null);

      const assignments = await this.prisma.taskAssignment.findMany({
        where: { taskId: task.id },
        select: { userId: true },
      });
      for (const a of assignments) {
        await this.prisma.notification.create({
          data: {
            userId: a.userId,
            title: 'Video Editing Needs Revision',
            message: `Your editing task ${task.taskId} was sent back by the Media Manager. Reason: ${reason}. Make the changes and mark the task completed again.`,
            type: 'ALERT',
            category: 'APPROVAL',
            priority: 'HIGH',
            linkUrl: `/tasks`,
            eventType: 'VIDEO_EDITING_REVISION_REQUESTED',
            entityType: 'TASK',
            entityId: task.id,
            entityCode: task.taskId,
            taskId: task.id,
            projectId: project.id,
          },
        }).catch(() => null);
      }

      return this.findOne(project.id, user);
    }

    throw new BadRequestException('action must be APPROVE or REJECT');
  }

  /**
   * Marketing Manager approves or rejects a Media-Manager-approved Video Editing Task.
   * APPROVE -> MARKETING_MANAGER_APPROVED, then trigger project completion check.
   * REJECT  -> IN_PROGRESS (full chain restarts with Staff).
   */
  async reviewVideoEditingMarketing(
    projectId: string,
    taskId: string,
    body: { action: 'APPROVE' | 'REJECT'; comment?: string },
    user: any,
  ) {
    const isMarketingManager =
      user?.role === Role.MARKETING_MANAGER || user?.role === 'ADMIN' || user?.role === Role.ADMINISTRATOR;
    if (!isMarketingManager) {
      throw new ForbiddenException('Only a Marketing Manager can approve or reject a Video Editing Task.');
    }

    const project = await this.resolveShootProject(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const task = await this.prisma.task.findFirst({
      where: {
        projectId: project.id,
        taskType: 'VIDEO_EDITING',
        OR: [{ id: taskId }, { taskId }],
      },
      select: { id: true, taskId: true, title: true, status: true, scriptId: true },
    });
    if (!task) throw new NotFoundException('Video editing task not found.');

    if (body?.action === 'APPROVE') {
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.COMPLETED,
          completionPercentage: 100,
          marketingManagerApproved: true,
          marketingRevisionReason: null,
        },
      });

      await this.prisma.approval.create({
        data: {
          projectId: project.id,
          entityType: 'TASK',
          entityId: task.id,
          approvalType: 'MARKETING_MANAGER_REVIEW',
          stage: 'MARKETING_MANAGER_REVIEW',
          round: 1,
          version: 'v1',
          targetRole: 'MARKETING_MANAGER',
          requestedById: user.id || user.sub || null,
          reviewerId: user.id || user.sub || null,
          status: 'APPROVED',
          remarks: body?.comment || 'Marketing Manager Review Approved',
          reviewedAt: new Date(),
        },
      }).catch(() => null);

      await this.prisma.activityLog.create({
        data: {
          userId: user.id || user.sub || null,
          action: 'VIDEO_EDITING_MARKETING_APPROVED',
          entity: 'Task',
          entityId: task.id,
          description: `Marketing Manager approved editing task ${task.taskId} on project ${project.projectId}.`,
        },
      }).catch(() => null);

      // Central completion rule (spec section 13).
      await this.checkProjectVideoEditingCompletion(project.id);

      return this.findOne(project.id, user);
    }

    if (body?.action === 'REJECT') {
      const reason = (body?.comment || '').trim();
      if (!reason) throw new BadRequestException('Rejection reason is required.');
      // Reject returns to IN_PROGRESS and clears both approvals so the full chain restarts.
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.IN_PROGRESS,
          marketingManagerApproved: false,
          mediaManagerApproved: false,
          marketingRevisionReason: reason,
          completionPercentage: 50,
        },
      });

      await this.prisma.approval.create({
        data: {
          projectId: project.id,
          entityType: 'TASK',
          entityId: task.id,
          approvalType: 'MARKETING_MANAGER_REVIEW',
          stage: 'MARKETING_MANAGER_REVIEW',
          round: 1,
          version: 'v1',
          targetRole: 'STAFF',
          requestedById: user.id || user.sub || null,
          reviewerId: user.id || user.sub || null,
          status: 'REJECTED',
          remarks: reason,
          returnedStatus: TaskStatus.IN_PROGRESS,
          reviewedAt: new Date(),
        },
      }).catch(() => null);

      await this.prisma.activityLog.create({
        data: {
          userId: user.id || user.sub || null,
          action: 'VIDEO_EDITING_MARKETING_REJECTED',
          entity: 'Task',
          entityId: task.id,
          description: `Marketing Manager REJECTED editing task ${task.taskId}: ${reason}. Full review chain restarts.`,
        },
      }).catch(() => null);

      const assignments = await this.prisma.taskAssignment.findMany({
        where: { taskId: task.id },
        select: { userId: true },
      });
      for (const a of assignments) {
        await this.prisma.notification.create({
          data: {
            userId: a.userId,
            title: 'Video Editing Needs Revision (Marketing)',
            message: `Your editing task ${task.taskId} was rejected by Marketing. Reason: ${reason}. Edit, mark complete, and the review chain will run again.`,
            type: 'ALERT',
            category: 'APPROVAL',
            priority: 'HIGH',
            linkUrl: `/tasks`,
            eventType: 'VIDEO_EDITING_REVISION_REQUESTED',
            entityType: 'TASK',
            entityId: task.id,
            entityCode: task.taskId,
            taskId: task.id,
            projectId: project.id,
          },
        }).catch(() => null);
      }

      return this.findOne(project.id, user);
    }

    throw new BadRequestException('action must be APPROVE or REJECT');
  }

  /**
   * Central project completion rule (spec section 13):
   *   If every VIDEO_EDITING task on this project has marketingManagerApproved=true and
   *   the project has at least one such task, set the project to COMPLETED.
   *   Otherwise leave the project status alone.
   *
   * Called after every Marketing Manager approval. This is the only place the
   * editing path moves the project to COMPLETED.
   */
  private async checkProjectVideoEditingCompletion(projectId: string) {
    const editingTasks = await this.prisma.task.findMany({
      where: { projectId, taskType: 'VIDEO_EDITING' },
      select: { id: true, status: true, marketingManagerApproved: true },
    });
    if (editingTasks.length === 0) return;
    const allApproved = editingTasks.every(
      (t) => t.marketingManagerApproved === true && (t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === TaskStatus.MARKETING_MANAGER_APPROVED),
    );
    if (!allApproved) return;

    await this.prisma.shootProject.update({
      where: { id: projectId },
      data: { status: ProjectStatus.COMPLETED, progressPercentage: 100 },
    });

    const proj = await this.prisma.shootProject.findUnique({
      where: { id: projectId },
      select: { id: true, projectId: true, name: true, createdById: true },
    });
    const taskIds = editingTasks.map((t) => t.id);
    const assignments = await this.prisma.taskAssignment.findMany({
      where: { taskId: { in: taskIds } },
      select: { userId: true },
    });
    const managerIds = (
      await this.prisma.user.findMany({
        where: { role: { in: ['MEDIA_MANAGER', 'MARKETING_MANAGER', 'ADMIN', 'ADMINISTRATOR'] }, status: 'ACTIVE', isArchived: false },
        select: { id: true },
      })
    ).map((u) => u.id);
    const recipients = new Set<string>([...assignments.map((a) => a.userId), ...managerIds]);
    if (proj?.createdById) recipients.add(proj.createdById);

    for (const userId of recipients) {
      await this.prisma.notification.create({
        data: {
          userId,
          title: 'Project Completed',
          message: `Project ${proj?.projectId} (${proj?.name}) is now COMPLETED. All video editing tasks have been approved.`,
          type: 'SUCCESS',
          category: 'PROJECT',
          priority: 'HIGH',
          linkUrl: `/projects/${projectId}`,
          eventType: 'PROJECT_COMPLETED',
          entityType: 'ShootProject',
          entityId: projectId,
          entityCode: proj?.projectId,
          projectId,
        },
      }).catch(() => null);
    }

    await this.prisma.activityLog.create({
      data: {
        userId: proj?.createdById ||
          (await this.prisma.user.findFirst({ where: { role: 'ADMIN', isArchived: false, status: 'ACTIVE' }, select: { id: true } }))?.id ||
          (await this.prisma.user.findFirst({ where: { role: 'ADMINISTRATOR' }, select: { id: true } }))?.id,
        action: 'PROJECT_AUTO_COMPLETED',
        entity: 'ShootProject',
        entityId: projectId,
        description: `Project auto-completed: all ${editingTasks.length} video editing task(s) reached MARKETING_MANAGER_APPROVED.`,
      },
    }).catch(() => null);
  }

  /**
   * Video Editor submits a VIDEO_EDITING task directly for Technical Review.
   * No Media Manager or Marketing Manager approval is required.
   * The task must be in ACCEPTED, IN_PROGRESS, or REVISION_REQUESTED status.
   * Moves the task to WAITING_FOR_TECHNICAL_REVIEW.
   */
  async submitVideoEditingForTechnicalReview(
    projectId: string,
    taskId: string,
    body: { deliverableUrl?: string; deliverableFileName?: string; comment?: string },
    user: any,
  ) {
    const project = await this.resolveShootProject(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const task = await this.prisma.task.findFirst({
      where: {
        projectId: project.id,
        taskType: 'VIDEO_EDITING',
        OR: [{ id: taskId }, { taskId }],
      },
      include: {
        assignedEmployees: { select: { userId: true } },
      },
    });
    if (!task) throw new NotFoundException('Video editing task not found.');

    // Only assigned staff or admin can submit
    const isAdmin = user?.role === 'ADMIN' || user?.role === Role.ADMINISTRATOR;
    const isAssigned = (task as any).assignedEmployees?.some((a: any) => a.userId === user?.id);
    if (!isAdmin && !isAssigned) {
      throw new ForbiddenException('Only the assigned Video Editor can submit this task for Technical Review.');
    }

    const allowedStatuses = ['ACCEPTED', 'IN_PROGRESS', 'REVISION_REQUESTED'];
    if (!allowedStatuses.includes(task.status)) {
      throw new BadRequestException(
        `Task cannot be submitted from status: ${task.status}. Must be ACCEPTED, IN_PROGRESS, or REVISION_REQUESTED.`,
      );
    }

    // If a deliverable URL is provided, record it
    if (body?.deliverableUrl) {
      const newVersion = (task.activeDeliverableVersion || 0) + 1;
      await this.prisma.taskDeliverableHistory.create({
        data: {
          taskId: task.id,
          userId: user.id,
          fileUrl: body.deliverableUrl.trim(),
          fileName: body.deliverableFileName || `edited-cut-v${newVersion}`,
          version: newVersion,
        },
      }).catch(() => null);

      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          activeDeliverableUrl: body.deliverableUrl.trim(),
          activeDeliverableFileName: body.deliverableFileName || `edited-cut-v${newVersion}`,
          activeDeliverableVersion: newVersion,
        },
      });
    }

    // Move to Technical Review
    const updatedTask = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'WAITING_FOR_TECHNICAL_REVIEW',
        completionPercentage: 50,
        technicalReviewApproved: false,
        mediaManagerApproved: false,
        marketingManagerApproved: false,
      },
    });

    // Create approval record for Technical Manager
    await this.prisma.approval.create({
      data: {
        projectId: project.id,
        entityType: 'TASK',
        entityId: task.id,
        approvalType: 'TECHNICAL_REVIEW',
        targetRole: 'TECHNICAL_MANAGER',
        requestedById: user.id,
        status: 'PENDING',
        remarks: body?.comment || `Video editing task ${task.taskId} submitted for Technical Review by ${user.name}.`,
      },
    }).catch(() => null);

    // Notify Technical Managers
    const technicalManagers = await this.prisma.user.findMany({
      where: { role: 'TECHNICAL_MANAGER', status: 'ACTIVE' },
      select: { id: true },
    });
    for (const tm of technicalManagers) {
      await this.prisma.notification.create({
        data: {
          userId: tm.id,
          title: 'Video Editing Task Submitted for Technical Review',
          message: `Video editing task ${task.taskId} (${task.title}) on project ${project.projectId} was submitted for Technical Review.`,
          type: 'ALERT',
          category: 'APPROVAL',
          priority: 'HIGH',
          linkUrl: `/approvals`,
          eventType: 'TECHNICAL_REVIEW_REQUESTED',
          entityType: 'TASK',
          entityId: task.id,
          entityCode: task.taskId,
          taskId: task.id,
          projectId: project.id,
        },
      }).catch(() => null);
    }

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'VIDEO_EDITING_SUBMITTED_FOR_TECH_REVIEW',
        entity: 'Task',
        entityId: task.id,
        description: `Video editing task ${task.taskId} submitted for Technical Review by ${user.name}.`,
      },
    }).catch(() => null);

    return this.findOne(project.id, user);
  }
}
